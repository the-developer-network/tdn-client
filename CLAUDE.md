# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
pnpm dev                 # Vite dev server on :5173
pnpm build               # tsc -b (all 4 project refs) + vite build
pnpm lint                # ESLint flat config
pnpm format              # Prettier write over src/**/*.{ts,tsx}
pnpm exec tsc -b         # typecheck only (what CI runs)

pnpm test                # Vitest single run
pnpm test:watch          # Vitest watch
pnpm test:coverage       # v8 coverage; thresholds lines 70 / branches 70
pnpm test:e2e            # Playwright (auto-starts `pnpm dev` via webServer)
pnpm test:e2e:ui         # Playwright UI mode

pnpm preview             # build + wrangler dev (local Worker emulation)
pnpm deploy              # build + wrangler deploy
```

Single test / single spec:

```bash
pnpm test src/features/feed/hooks/usePostActions.test.ts
pnpm test -t "optimistic like"
pnpm exec playwright test e2e/feed.spec.ts --grep "News tab"
```

`pnpm` only — never npm or yarn. Node `>25` (`.nvmrc` pins 26). Husky + lint-staged run `eslint --fix` and `prettier --write` on `src/**/*.{ts,tsx}` at commit time.

## Architecture

Feature-first React 19 SPA served by a Cloudflare Worker.

```
src/app/        main.tsx (bootstrap) → AppInit.tsx → router.tsx; index.css
src/core/       api/client.ts, auth/auth.store.ts — the two cross-cutting singletons
src/features/   <name>/{api,components,hooks,store}/ — self-contained feature modules
src/pages/      one component per route, registered in src/app/router.tsx
src/shared/     components/ui, layout, hooks, store, utils, i18n
worker/         Cloudflare Worker: SSR OG-tag injection + /sitemap.xml
tests/          setup.ts, msw-server.ts, mocks/handlers.ts (infra only; specs are co-located)
e2e/            Playwright specs + fixtures.ts
```

Four TypeScript project references build together (`tsconfig.json`): `app` (src, excludes tests), `node`, `test` (relaxes `noUnusedLocals`), `worker`. A change that typechecks in tests may still fail `tsc -b` under the stricter app config.

**No path aliases.** `tsconfig.app.json` defines no `paths`, so all imports are relative (`../../../core/api/client`). `vite-tsconfig-paths` is only wired into the Vitest config.

### API client (`src/core/api/client.ts`)

Everything network goes through `api.get/post/patch/delete`. Base URL switches on `import.meta.env.PROD`: production `https://api.developernetwork.net/api/v1`, dev `http://localhost:8080/api/v1` — a local backend on :8080 is expected during development.

- `apiClient` **unwraps `ApiResponse<T>.data`** before returning. Every mock — MSW handler, Playwright `route.fulfill` — must therefore wrap its payload in `{ data: ... }`.
- `{ isPublic: true }` — on 401, retries once without the Authorization header so the request still resolves anonymously, then refreshes in the background.
- Authenticated 401 → single in-flight refresh; concurrent requests queue in `failedQueue` and replay after the new token lands. Refresh failure clears `access_token` and fires the session-expired handler registered in `AppInit.tsx` (clears auth store, reopens the auth modal at the `identifier` step).
- `{ contentType: false }` for `FormData` — never set `Content-Type` manually.
- 15 s `AbortController` timeout → `NetworkError`. 204 → `{}`.
- Surface errors to users via `getErrorMessage(err)` from `src/shared/utils/error-handler.ts`.

Feature API modules (`*.api.ts`) are plain object literals of typed thunks that build query strings and call `api` — see `src/features/feed/api/feed.api.ts` for the canonical shape.

### State

Zustand 5 only — no Context API, Redux, React Query, or SWR. Local ephemeral state uses `useState`.

- `useAuthStore` (`src/core/auth/auth.store.ts`) — `persist` under key `tdn-auth-storage`, `partialize`d to `{ user, isAuthenticated }`. The JWT itself lives in `localStorage.access_token`, written by `setAuth`/refresh and read directly by the API client on every request.
- `useAuthModalStore` — step machine: `identifier → login | register → verify-email`, plus `forgot-password → reset-password` and `account-recovery`. `openModal()` resets `step` to `"initial"`, so `setStep(...)` must come _before_ `openModal()` (the codebase does this in `usePostActions`).
- `useNotificationStore`, `useToastStore` (4 s auto-dismiss), `useLanguageStore` (persisted as `tdn-language`).

`useNotificationSocket` (mounted in `AppInit`) holds a WebSocket to `/realtime/ws`, authenticating with a post-open `{ event: "auth", token }` frame and reconnecting with exponential backoff (max 5 retries, paused while `navigator.onLine` is false).

### i18n

`useI18n()` returns `t(key, vars?)` reading from `src/shared/i18n/translations.ts` — a single file with `en` and `tr` objects keyed by dotted strings (`nav.home`, `feed.community`). `TranslationKey` is derived from the `en` object, so adding a key to `en` makes `tr` fail to typecheck until it is translated too. Missing values fall back to `en`, then to the raw key. `{{var}}` placeholders are interpolated. Initial locale is sniffed from `navigator.language`.

This is distinct from `useTranslation` (`src/shared/hooks/useTranslation.ts`), which is the _post_ translation feature — `franc-min` language detection plus a server round-trip.

### Component conventions

- Always render explicit **loading**, **error** (with retry), and **empty** states — never silently render nothing.
- Mutations are **optimistic**: snapshot previous state, apply, roll back in `catch`. Like/bookmark also toast the error; follow rolls back silently.
- Guard mutations with `if (!isAuthenticated) { setStep(...); openModal(); return; }`.
- Pages compose `PageShell` (`Sidebar` + `main` + optional `rightRail` + `AuthModal` + `BottomNav`).
- Reuse `Button` / `Modal` from `src/shared/components/ui/`.
- No barrel `index.ts` files — import from the source file.
- Props typed inline as `interface XxxProps` at the top of the file.

### Styling

Tailwind CSS 4 utilities only — no CSS Modules, styled-components, or inline style objects. Dark theme throughout: `bg-black`, white text, `white/10` borders, `zinc-*` surfaces, accents in `blue-*` / `pink-*` / `red-*`. Icons from `lucide-react` exclusively. Layout widths: outer `max-w-[1250px]`, feed column `max-w-[600px]`, right rail `w-[320px]`. Sidebar is `hidden sm:block`; `BottomNav` covers mobile.

### Worker

`worker/index.ts` intercepts every non-asset request, fetches `index.html` from `ASSETS`, strips existing OG/Twitter/description meta and injects route-specific tags — hitting the live API for `/post/:id` and `/profile/:username`. It also serves a generated `/sitemap.xml`. Crawler-visible metadata is produced here, not by `react-helmet-async` (which handles the in-app SEO component).

## Testing

Vitest + @testing-library/react + MSW v2 + jsdom; Playwright for E2E. Specs are co-located (`Foo.test.tsx` next to `Foo.tsx`); only shared infra lives in `tests/`. Handlers reset automatically after each test (`tests/setup.ts`); override per-test with `server.use()`.

Non-obvious requirements:

- **Any test whose module graph reaches `useAuthStore` or `apiClient` needs a `vi.hoisted` Map-backed `localStorage` stub.** jsdom 29's `Storage.clear()` is broken, and Zustand `persist` captures storage at module-evaluation time — the stub must exist before imports run.
- `franc-min` is ESM; `vi.mock("franc-min", () => ({ franc: vi.fn() }))` when language detection isn't the subject. Otherwise `"franc-min"`, `"trigram-utils"`, `"n-gram"` need `deps.inline` in `vitest.config.ts`.
- Assert Zustand mutations against `useXxxStore.getState()`, not hook return values, for state that lives in a store (notifications especially).
- Reset stores in `beforeEach` (`useAuthStore.setState(useAuthStore.getInitialState())`); leaked state between tests is the most common failure.
- Hooks that auto-fetch in `useEffect` → `waitFor`, not `await act`. Fire-and-forget calls (e.g. `changeCategory`) likewise.
- Fake timers required for `toast.store` (4 s) and `auth-modal.store` (300 ms close delay).
- Component tests using router hooks must wrap in `MemoryRouter`.

E2E injects auth into `localStorage` via `page.addInitScript` (see `e2e/fixtures.ts`) and intercepts `**/api/v1/**` — no real backend needed.

`docs/QA.md` documents the full per-file test matrix and expected scenarios; keep it in sync when adding tests.

## Conventions

| Kind            | Pattern       | Example               |
| --------------- | ------------- | --------------------- |
| Component file  | PascalCase    | `PostCard.tsx`        |
| Hook file       | `use` prefix  | `useComments.ts`      |
| API module      | `.api.ts`     | `feed.api.ts`         |
| Type file       | `.types.ts`   | `comment.types.ts`    |
| Zustand store   | `.store.ts`   | `auth-modal.store.ts` |
| Event handler   | `handleXxx`   | `handleLike`          |
| Props interface | `XxxProps`    | `PostCardProps`       |
| Request body    | `XxxBody`     | `RegisterBody`        |
| Response type   | `XxxResponse` | `LoginResponse`       |

- TypeScript strict, `noUnusedLocals`/`noUnusedParameters`, `erasableSyntaxOnly`, `verbatimModuleSyntax` (use `import type`). No `any` — narrow from `unknown`.
- `interface` for object shapes; union literals instead of `enum` (`type PostType = "COMMUNITY" | "TECH_NEWS" | ...`).
- Prettier: 4 spaces, double quotes, semicolons, trailing commas, 80 cols.
- Conventional Commits (`feat(feed): ...`). Branch from `main` as `feature/`, `fix/`, or `chore/`.
- CI on PRs to `main`: lint + `tsc -b`, then unit tests, then Playwright (gated on lint passing).
