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
                realtime/useRealtimeSocket.ts — the one WebSocket, shared by two features
src/features/   <name>/{api,components,hooks,store}/ — self-contained feature modules
src/pages/      one component per route, registered in src/app/router.tsx
src/shared/     components/ui, layout, hooks, store, utils, i18n
worker/         Cloudflare Worker: SSR OG-tag injection + /sitemap.xml
tests/          setup.ts, msw-server.ts, mocks/handlers.ts (infra only; specs are co-located)
e2e/            Playwright specs + fixtures.ts
```

Four TypeScript project references build together (`tsconfig.json`): `app` (src, excludes tests), `node`, `test` (relaxes `noUnusedLocals`), `worker`. A change that typechecks in tests may still fail `tsc -b` under the stricter app config.

`tsconfig.test.json` extends `tsconfig.app.json`, and two lines in it are load-bearing. It **resets `exclude`**, because the inherited one lists every spec pattern and would otherwise cancel its own `include`, leaving the project silently checking zero files. And it sets its **own `tsBuildInfoFile`**, or the two projects overwrite each other's build state.

**No path aliases.** `tsconfig.app.json` defines no `paths`, so all imports are relative (`../../../core/api/client`). `vite-tsconfig-paths` is only wired into the Vitest config.

### API client (`src/core/api/client.ts`)

Everything network goes through `api.get/post/patch/delete`. Base URL switches on `import.meta.env.PROD`: production `https://api.developernetwork.net/api/v1`, dev `http://localhost:8080/api/v1` — a local backend on :8080 is expected during development.

- `apiClient` **unwraps `ApiResponse<T>.data`** before returning. Every mock — MSW handler, Playwright `route.fulfill` — must therefore wrap its payload in `{ data: ... }`.
- `api.getPage` is the exception, and the only one: it returns the whole `{ data, meta }` document. Cursor-paginated listings keep their cursor in `meta.nextCursor`, which the unwrap would throw away — so a mock for one of those must carry `meta` as well, or the client reads a missing cursor as "there is always another page". Use it **only** where the endpoint is cursor-paginated; everything paged by `page`/`limit` stays on `api.get`. `nextCursor` is opaque: echo it back verbatim, never parse or construct one.
- `{ isPublic: true }` — for content readable with or without a session. On 401, retries once without the Authorization header so the request still resolves anonymously, then refreshes in the background.
- `{ isAnonymous: true }` — for endpoints called to _obtain_ a session (all of `auth-api.ts` bar `sendVerification`, `verifyEmail`, `logout`). No token is sent, and a 401 is the endpoint's answer about the credentials, so it is thrown to the caller with no replay and no refresh. Never flag a credential endpoint `isPublic`: the replay doubles it against the STRICT 3-per-15-minutes rate limit on `/auth/login`, and the background refresh then reports the session as expired.
- Authenticated 401 → single in-flight refresh; concurrent requests queue in `failedQueue` and replay after the new token lands. Refresh failure clears `access_token` and fires the session-expired handler registered in `AppInit.tsx` (clears auth store, reopens the auth modal at the `identifier` step).
- `{ contentType: false }` for `FormData` — never set `Content-Type` manually.
- 15 s `AbortController` timeout → `NetworkError`. 204 → `{}`.
- A body that will not parse — empty, HTML from a proxy, anything outside the API's problem+json — is thrown as a synthesised RFC 7807 document carrying the real HTTP status, never as a bare `SyntaxError`. A `SyntaxError` has no `status` and no `title`, so `getErrorMessage` can only say "An unexpected error occurred." and the status never reaches the caller.
- Surface errors to users via `getErrorMessage(err)` from `src/shared/utils/error-handler.ts`. The API answers in English only, so a `detail` shown verbatim reaches a Turkish reader in English. `getErrorMessage` replaces only the sentences the API writes when it has nothing specific to say (the generic 5xx details, a 5xx with no detail, and documents the client synthesised). Everything else keeps the server's words — translating by status would turn a 401 from `/auth/login` into "your session ended" when it means "wrong password", and would bury a `CustomError` that carries a real message at a 5xx status.

### Media moderation

Uploads are scanned. Four endpoints can now refuse one — `POST /media`, `POST /articles/cover`, `PATCH /profiles/me/avatar`, `PATCH /profiles/me/banner` — and post/comment creation can refuse the URLs afterwards. `src/shared/utils/media-errors.ts` owns all of it.

**Branch on `title`, never on status.** Two of the errors share 415, and 422 (`MediaRejectedError`) against 503 (`ModerationUnavailableError`) is the difference between "this file is not allowed" and "try again in a moment". `withModerationRetry` absorbs one 503 before the caller sees it — one retry, not a loop.

**`clearsSelection` defaults to keeping the files** and names the four verdicts that discard them. The other way round would take someone's picked files away over a 500 from the create call, or a dropped connection. A verdict clears _all_ of them: `/media` takes four files, processes them in order, and returns no URLs at all once one is rejected — not even for the ones that uploaded — without saying which it was.

**One upload belongs to one piece of content.** Re-sending the same `mediaUrls` or `coverImageKey` gets `MediaNotOwnedError` (400). Safe to retry after a 5xx (nothing was written); not safe after a success. `useArticleEditor` memoises the cover key and drops that memo on this error — without it, a save that timed out _after_ the server wrote locks the editor permanently.

**The six messages are ours, keyed by `title`** — a deliberate exception to `getErrorMessage`'s rule of showing a 4xx `detail` verbatim, and the only one. The lookup sits above the generic-5xx branch so the 503 is not answered with "the server could not complete the request".

`isSensitive` and `mediaPending` are **content-level, not per-media**, on `Post`, `Comment` and `QuotedPost` (`ArticleSummary` gets `isSensitive` only — a cover is always an image, so it never waits). Wrap media in `SensitiveMedia`, which takes the flag rather than assuming it; `QuotedPostCard` must pass the quoted post's own, or quoting becomes the way round the filter. `mediaPending` means `mediaUrls` is `[]` — indistinguishable from a post with no media, which is why `PendingMedia` exists. **Do not try to show "media was removed"**: after a rejection the payload is identical to a post that never had any, and reconstructing the difference from session memory shows two readers different things. That is a product decision, not an oversight.

`usePendingMedia` polls **the one post**, never the feed — the list is cached 60 s server-side. It stops when `mediaPending` clears, after five minutes, and while the tab is hidden.

### Mentions

`@handle` in a post, comment or article body names an account (`docs/mentions.md` in the API repo). The API resolves them **at write time** and stores the relation by id, so a rename never breaks a historical mention — and the response carries the account's **current** handle.

`mentions: [{ id, username }]` sits alongside `tags` on `Post`, `Comment` and `ArticleSummary`, and is **always present** (`[]` when the body names nobody). It is deliberately absent from `QuotedPost` and from a direct message, because the API does not resolve mentions for either; a handle in those renders as plain text and that is correct, not a gap.

**The handle grammar lives once, in `src/shared/utils/mentions.ts`, and mirrors the API's `extract-mentions.ts`.** The API returns the body unchanged and says separately which handles are real, so pairing the two is the client's job — and drift is silent, showing up as a link that never appears. Its tests are the doc's own examples (`ada@example.com`, `docs/@v2`, `@@here`, `@ada.` versus `@ada.b`). The one deliberate difference: the API uses a lookbehind and the client consumes the preceding character instead, because Safari had no lookbehind before 16.4 and Vite does not transpile regex syntax — an unsupported pattern is a blank page, not a missing feature. The two were checked for equivalence over the doc's cases and a randomised sweep.

**A handle only links when it matches an entry in `mentions`, case-insensitively.** A typo, a deleted account and one renamed since the body was written are all unmatchable and all stay plain text. That is the only version that never sends a reader to a stranger's profile — do not "fix" it by pairing leftovers.

The **ten-handle cap** is mirrored in the composers so the API's `400 MentionLimitExceededError` stays unreachable, the same way the message composer mirrors its character cap. For articles it is folded into `checkDraft`, because autosave is gated on the same `canSave` and would otherwise retry a doomed request every two seconds.

`MENTION` is the first notification type that reads `articleSlug` — being named in an article body has nowhere else to go.

**The suggestion list sits on the caret's line**, measured by `shared/utils/caret-position.ts` — a textarea exposes no caret geometry, so it mirrors the field's computed typography into a hidden element and reads where the text ends. Anchoring it to the container instead put it below the whole composer: 65px and a toolbar under the post box, eighteen rows under the article editor. The `relative` wrapper in every composer therefore holds **the field alone**. `placeList` is the arithmetic half — kept separate because jsdom reports every element as 0×0, so it is unit-tested while the mirror is verified in `e2e/mentions.spec.ts`.

**Writing.** `useMentionAutocomplete` reads the handle at the caret and suggests through `useProfileSearch` — there is no mention-search endpoint and the API doc says to use profile search. Its `readActiveHandle` applies the same "not glued to a preceding word" rule as the renderer, so the list never offers accounts for something that could not become a link. Selection is bound to `onMouseDown` in `MentionSuggestions`: a textarea blurs before a click lands, and the composers close the list on blur.

An article body is markdown, so its mentions are linked by a remark plugin (`article/utils/remark-mentions.ts`) rather than a pass over rendered output — after rendering, a handle in a code span looks exactly like one in a sentence, and the tree already knows the difference. Code, existing links and images are left alone. `MarkdownBody` routes an internal `/profile/...` href through `Link`; only an author's own link keeps `target="_blank"` and `nofollow`. The **editor preview passes no `mentions`**, because the draft has not been written and the API has resolved nothing yet — linking every handle there would promise links the published article may not have.

### Direct messaging

One-to-one threads, in `src/features/messages/`. Everything is authenticated — there is no public read path, so nothing here is `isPublic`.

A conversation is identified by the **pair**, not by who opened it, so `POST /conversations` is idempotent: "open", not "create". It starts `ACCEPTED` if the recipient follows the initiator and `PENDING` otherwise, and `DECLINED` is terminal — reopening a declined pair returns it unchanged with `canSend: false`.

**Render from `isRequest` and `canSend`, never from `status`.** The server resolves both per reader, and they answer different questions: the _initiator_ of a `PENDING` thread may write to it and has nothing to accept, so `status === "PENDING"` alone tells you neither. Re-deriving the lifecycle from a follow check gets the request flow backwards, because the follow that matters is the recipient's and the profile page can only see its own side.

**Listings are cursor-paginated** — see `api.getPage` above. A conversation list reorders whenever a message arrives, which is why there are no page numbers and no total.

**The unread badge counts `ACCEPTED` only.** `/conversations/unread-count` excludes requests by design, so an unanswered request cannot raise it — that is what stops an open inbox being usable as a broadcast channel. The request-tab badge has no endpoint and is the length of the `?status=PENDING` listing, capped at the page size and hidden behind "9+".

**The socket is shared.** `useRealtimeSocket` (`src/core/realtime/`) carries notifications _and_ the five message events; the API asks clients not to open a second connection. It dispatches into stores and decides nothing itself. `conversation:request` is deliberately distinct from `message:new`.

**A realtime payload is not a `Message`.** It carries a truncated `preview` and no `content`, so it can update a list row and cannot become a bubble. `message.store` bumps `threadRevision` / `conversationsRevision` / `requestsRevision` instead, and the hook that owns the request re-reads — which is what leaves every reducer a pure function testable through `getState()`.

`focusedConversationId` means the reader is looking at the thread **now**, cleared when the tab is hidden as well as on unmount. A message arriving into a focused thread is read on arrival and must not raise the badge; the same message behind a hidden tab has been read by nobody and must. `markConversationRead` zeroes the row but leaves the global count alone — a thread reached from a profile was never in a loaded page, so there is nothing to subtract and the caller re-reads the server.

**Message media is a separate channel.** `POST /messages/media` (4 files, 5 MB each) — a file uploaded there cannot be attached to a post and one from `POST /media` cannot be attached to a message; crossing them is `MediaNotOwnedError`. `MediaLimitExceededError` and `NoMediaProvidedError` are in `MEDIA_ERROR_TITLES` but **not** in `VERDICT_TITLES`: they are answers about the request, not verdicts on the files, and taking four picked files away to say "you picked five" loses four that were never in question.

**`mediaRejected` on a message renders "media removed", and this is a deliberate exception** to the rule stated above for posts. That rule exists because a post whose media was refused is byte-for-byte a post that never had any, so the difference could only come from session memory and would show two readers different things. A message carries the fact in a field: nothing is reconstructed, and both sides read what the server sent. Do not "correct" `MessageBubble` to match `PostCard`.

The read watermark is shown under the **newest** outgoing message only. It is one fact per conversation, so repeating it under every bubble states it six times down a screen and reads as six separate events.

`isDeleted` is a tombstone that **keeps its place** — the other participant may have replied to it. Read state is per conversation, not per message: `otherLastReadAt` is one watermark, and a sent message is "seen" when its `createdAt` precedes it.

**Writes are limited to five a minute.** Low enough that an ordinary exchange reaches it, which is why `TooManyRequestsError` is the second — and last — title `getErrorMessage` answers in its own words rather than showing the server English.

Not supported by the API, and so not by the client: group threads, block lists (declining is the mechanism), editing, typing indicators.

Feature API modules (`*.api.ts`) are plain object literals of typed thunks that build query strings and call `api` — see `src/features/feed/api/feed.api.ts` for the canonical shape.

### State

Zustand 5 only — no Context API, Redux, React Query, or SWR. Local ephemeral state uses `useState`.

- `useAuthStore` (`src/core/auth/auth.store.ts`) — `persist` under key `tdn-auth-storage`, `partialize`d to `{ user, isAuthenticated }`. The JWT itself lives in `localStorage.access_token`, written by `setAuth`/refresh and read directly by the API client on every request.
- `useAuthModalStore` — step machine: `identifier → login | register → verify-email`, plus `forgot-password → reset-password` and `account-recovery`. `openModal(step?)` **sets** `step`, defaulting to `"initial"`, so calling `setStep(...)` beforehand has no effect — pass the step as the argument instead. Guards want the default: `LoginView` only renders a password field and reads `identifier` from the store, so it cannot be opened cold; `"initial"` renders `IdentifierView`, which collects the identifier and routes on to login or register.
- `useNotificationStore`, `useMessageStore`, `useToastStore` (4 s auto-dismiss), `useLanguageStore` (persisted as `tdn-language`).
- `useThemeStore` — persisted as `tdn-theme`, holding `"dark" | "light" | "system"`. It defaults to **dark**, not `"system"`: the app shipped dark-only, so following the OS would have repainted it white for every account whose laptop is set light, which none of them asked for. `useTheme()` (mounted once in `AppInit`) resolves it and stamps `data-theme` on `<html>`, and listens to `prefers-color-scheme` only while the choice is `"system"`. **`index.html` carries an inline script that stamps the same attribute before the bundle loads** — `persist` cannot read `localStorage` until React has mounted, so without it a light-theme reader gets a black flash on every cold load. Its four lines duplicate `resolveTheme` on purpose, and `e2e/theme.spec.ts` blocks every module to prove they still agree.
- `useOnboardingStore` — persisted as `tdn-onboarding`, holding `completedUserIds` (a list, not a boolean, so a shared browser does not let a second account skip the flow) and the fields picked at sign-up.

Every route except `/onboarding` sits under a pathless layout route rendering `OnboardingGate` (`src/app/OnboardingGate.tsx`), which sends an account following fewer than `MIN_FOLLOWS` (5) people to `/onboarding` to pick its fields and follow the rest. Three rules are load-bearing: it stands down while the auth modal is open (redirecting mid `verify-email` would unmount the modal with the page); it passes rather than redirects when the profile request fails, warning to the console so a dead endpoint does not silently disable the flow; and finishing once settles it for good, because a `< 5` check would otherwise drag the account back the moment it unfollowed someone. **`e2e/fixtures.ts` seeds `tdn-onboarding`**; without it every authenticated spec would land on `/onboarding`.

`useRealtimeSocket` (`src/core/realtime/`, mounted in `AppInit`) holds the one WebSocket to `/realtime/ws`, authenticating with a post-open `{ event: "auth", token }` frame and reconnecting with exponential backoff (max 5 retries, paused while `navigator.onLine` is false). It lives in `core/` rather than in a feature because it feeds both notifications and direct messages.

### i18n

`useI18n()` returns `t(key, vars?)` reading from `src/shared/i18n/translations.ts` — a single file with `en` and `tr` objects keyed by dotted strings (`nav.home`, `feed.community`). `TranslationKey` is derived from the `en` object, so adding a key to `en` makes `tr` fail to typecheck until it is translated too. Missing values fall back to `en`, then to the raw key. `{{var}}` placeholders are interpolated. Initial locale is sniffed from `navigator.language`.

This is distinct from `useTranslation` (`src/shared/hooks/useTranslation.ts`), which is the _post_ translation feature — `franc-min` language detection plus a server round-trip.

### Component conventions

- Always render explicit **loading**, **error** (with retry), and **empty** states — never silently render nothing.
- Mutations are **optimistic**: snapshot previous state, apply, roll back in `catch`. Like/bookmark also toast the error; follow rolls back silently.
- Guard mutations with `if (!isAuthenticated) { openModal(); return; }`.
- Pages compose `PageShell` (`Sidebar` + `main` + optional `rightRail` + `AuthModal` + `BottomNav`).
- Reuse `Button` / `Modal` from `src/shared/components/ui/`.
- No barrel `index.ts` files — import from the source file.
- Props typed inline as `interface XxxProps` at the top of the file.

### Styling

Tailwind CSS 4 utilities only — no CSS Modules, styled-components, or inline style objects. The one hand-written rule lives in `src/app/index.css`: below the `sm` breakpoint every `input`/`textarea`/`select` is forced to `font-size: 16px !important`, because iOS Safari zooms the page in when it focuses a field rendering smaller text and never zooms back out. It is `!important` because a Tailwind utility on the element outranks a plain element selector, and global because the per-field version was already missed once. **Do not size a field below 16px on mobile to work around it** — `e2e/mobile-zoom.spec.ts` fails. **Never write a raw neutral colour utility.** `text-white`, `bg-black`, `bg-zinc-900` and the rest name a pixel, not a role, so they cannot follow a theme — one of them anywhere is a spot that stays dark on a light page. The roles are defined as tokens in `src/app/index.css` and swap wholesale on `:root[data-theme="light"]`: `ground` (the page), `ink` (the foreground, and the primary button's fill), `ink-hover`, `surface-1..3` (a ramp of raised panels — inputs and cards, then the secondary button and skeletons, then its hover), plus `scrim` and `on-fill`. Opacity steps come free: `border-ink/10` is a faint light line on black and a faint dark one on white. Accents stay `blue-*` / `pink-*` / `red-*`, but the 300–500 shades are **redefined** under light so they stay legible on white — the ramp keeps its shape, so a `-300` hover still sits a step past its `-400`. `scrim` and `on-fill` are the two things that do **not** swap: a wash over a user's photo, and the white on a red delete button or a blue badge, contrast against something the theme did not change. For an asset that carries its own colours there is a `light:` variant (`light:invert` on the logo, which is a white glyph baked onto an opaque black square). Icons from `lucide-react` exclusively. Layout widths: feed column `max-w-[600px]`, right rail `w-[320px]`, and an outer container that is **the sum of the columns in it** rather than a round number above them — 992 through the `lg` band, 1195 (feed) or 1315 (reading) from `xl`, and 672/875/995 without a rail. Every column is fixed from `lg` up, so anything extra cannot be absorbed by `flex-1` (the column is capped) and lands as dead space at the right end with the layout packed left. A flat 1250 did that across the whole `lg` band: a 1200px tablet showed 208px of nothing beside the trends rail, growing to 273 just before `xl`. The breakpoint ladder lives in `PageShell` and nowhere else: below `md` there is no sidebar and `BottomNav` covers the screen; `md` and `lg` get a 72px icon rail (`Sidebar` hides its labels below `xl`) with the column filling what is left below `lg` and capped at 600 from `lg`, where the right rail joins it; `xl` widens the sidebar to 275px and lets the reading column take its 720px. `PageShell` owns two more things the pages must not repeat. **The container width follows the right rail**: it holds 275 + 600 + 320 with one and 875 without, because it is centred as a block — keeping the wide container on a railless page leaves the column sitting to the left of a 375px void, which reads as a broken page rather than an uncluttered one. And **`fill` hands the viewport to the page** (`h-[100dvh]`, `overflow-hidden`, with `pb-16` kept _inside_ that height) for a screen that pins a header and a composer and scrolls only what is between them. A page doing this itself does not work: `main` is `min-h-screen pb-16`, so a child with its own `h-[100dvh]` and its own bottom padding makes the document 64px taller than the screen. `100dvh` not `100vh` — on a phone `vh` is the large viewport and stays taller than the screen while the URL bar shows. `e2e/responsive.spec.ts` measures both.

**Move the sidebar and `BottomNav` together** — they used to change over at `sm`, which gave a 640px screen a 220px sidebar and a 420px feed. `e2e/responsive.spec.ts` asserts one or the other at each width, and that no page scrolls sideways.

### Worker

`worker/index.ts` intercepts every non-asset request, fetches `index.html` from `ASSETS`, strips existing OG/Twitter/description meta and injects route-specific tags — hitting the live API for `/post/:id` and `/profile/:username`. It also serves a generated `/sitemap.xml`. Crawler-visible metadata is produced here, not by `react-helmet-async` (which handles the in-app SEO component).

## Testing

Vitest + @testing-library/react + MSW v2 + jsdom; Playwright for E2E. Specs are co-located (`Foo.test.tsx` next to `Foo.tsx`); only shared infra lives in `tests/`. Handlers reset automatically after each test (`tests/setup.ts`); override per-test with `server.use()`. **MSW runs with `onUnhandledRequest: "error"`** — an unhandled request is a bug, not a fallback to the real network. The `"warn"` default had `worker/index.test.ts` calling the live production API on every run, which passed while the API was warm and timed out at 5 s when it was cold.

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
