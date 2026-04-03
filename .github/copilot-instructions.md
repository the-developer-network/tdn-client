# TDN Client — Copilot Instructions

## Overview

Social developer network SPA. React 19 + TypeScript 5.9, deployed as a Cloudflare Worker.
API base: `https://api.developernetwork.net/api/v1`

## Tech Stack

- **React 19** with React Compiler (Babel preset via `babel-plugin-react-compiler`)
- **React Router 7** — `createBrowserRouter`, pages in `src/pages/`
- **Zustand 5** — global state; `persist` middleware for auth
- **Tailwind CSS 4** — utility-only, dark theme
- **Vite 8** + **Cloudflare Workers** (`wrangler`) for deployment
- **TypeScript 5.9** — strict mode enabled (`noUnusedLocals`, `noUnusedParameters`)
- **pnpm** — package manager (do not use npm or yarn)

## Architecture

Feature-first structure:

```
src/
  app/          # Entry point (main.tsx), router, global CSS
  core/         # Cross-feature: API client, auth store
  features/     # Feature modules: api/, components/, hooks/, store/
  pages/        # Route-level components (one per route)
  shared/       # Reusable UI components, layout, utilities
```

- New features → `src/features/{name}/{api,components,hooks,store}/`
- Cross-feature utilities → `src/shared/`
- Auth state + API client → `src/core/`
- Routes defined in `src/app/router.tsx` only

## ESLint & Formatting (Strictly Enforced)

Flat config (`eslint.config.js`). Runs automatically on commit via husky + lint-staged (`src/**/*.{ts,tsx}`).

- **`typescript-eslint` recommended** — no `any`, no unused variables/parameters
- **`eslint-plugin-react-hooks`** — exhaustive deps required on all hooks
- **`eslint-plugin-react-refresh`** — only components may be exported from component files
- **`eslint-config-prettier`** — Prettier handles all formatting (no ESLint formatting rules)

Run manually:

```bash
pnpm lint      # ESLint check
pnpm format    # Prettier write
```

## TypeScript Conventions

- Prefer `interface` for object shapes and component props
- Use union literals instead of `enum`: `type PostType = "COMMUNITY" | "TECH_NEWS" | "SYSTEM_UPDATE" | "JOB_POSTING"`
- Type files co-located with API modules: `*.types.ts`
- No `any` — use `unknown` with type narrowing where the type is truly unknown
- Generic API calls: `api.get<ApiResponse<Post>>("/posts")`

## Naming Conventions

| Kind             | Pattern            | Example                      |
| ---------------- | ------------------ | ---------------------------- |
| Component file   | PascalCase         | `PostCard.tsx`               |
| Custom hook file | `use` prefix       | `useComments.ts`             |
| API module       | `.api.ts` suffix   | `feed.api.ts`                |
| Type file        | `.types.ts` suffix | `comment.types.ts`           |
| Zustand store    | `.store.ts` suffix | `auth-modal.store.ts`        |
| Event handler    | `handleXxx`        | `handleLike`, `handleSubmit` |
| Props interface  | `XxxProps`         | `PostCardProps`              |
| Body type        | `XxxBody`          | `RegisterBody`               |
| Response type    | `XxxResponse`      | `LoginResponse`              |

## API Client

Import `api` from `src/core/api/client.ts`:

```ts
import { api } from "@/core/api/client";

api.get<ApiResponse<T>>("/endpoint");
api.post<ApiResponse<T>>("/endpoint", body);
api.delete<ApiResponse<T>>("/endpoint");
```

- Pass `{ isPublic: true }` as options to skip the Authorization header (unauthenticated endpoints)
- Pass `{ contentType: false }` for `FormData` uploads (do NOT set `Content-Type` manually)
- **401 responses** auto-trigger token refresh with a queue pattern — no manual handling needed
- Parse user-facing errors with `getErrorMessage(err)` from `src/shared/utils/error-handler.ts`
- Global types: `ApiResponse<T>`, `ApiErrorResponse` from `src/core/api/api-types.ts`

## State Management

- **Zustand only** — no Context API, no Redux, no React Query, no SWR
- Local ephemeral state: `useState` / `useReducer`
- **Auth store** (`src/core/auth/auth.store.ts`): `useAuthStore()` exposes `user`, `token`, `isAuthenticated`, `setAuth()`, `updateUser()`, `logout()`
- **Auth modal store** (`src/features/auth/store/auth-modal.store.ts`): `useAuthModalStore()` controls the step-based login modal

## Component Patterns

- Always handle **loading**, **error**, and **empty** states explicitly — never render nothing silently
- Use **optimistic updates** for mutations (like, bookmark) — store previous state and rollback on API error
- **Auth check before mutations**: if `!isAuthenticated`, call `openModal()` from auth modal store, then return
- Reuse `Button` and `Modal` from `src/shared/components/ui/`
- All pages use `Sidebar` from `src/shared/layout/Sidebar.tsx`
- No barrel `index.ts` files — import directly from source files
- Props are typed inline at the top of each file: `interface XxxProps { ... }`

## Styling

- **Tailwind CSS 4 only** — no CSS Modules, no styled-components, no inline style objects
- Dark theme throughout: `bg-black`, white text, `zinc-800` / `zinc-900` surfaces
- Color palette: `white`, `white/XX` opacity variants, `zinc-*`, `blue-*`, `pink-*`, `red-*`
- Icons: `lucide-react` exclusively
- Sidebar hidden on mobile: `hidden sm:block`
- Standard container widths: outer `max-w-[1250px]`, feed column `max-w-[600px]`

## Authentication Flow

Step-based modal: `identifier → login | register → verify-email → dashboard`

Special flows: `forgot-password → reset-password`, `account-recovery` (pending deletion).
OAuth: Google and GitHub redirect to `/oauth-success` where JWT is decoded and auth store is populated.

## Routing

Routes defined in `src/app/router.tsx` using `createBrowserRouter`:

| Path             | Component          |
| ---------------- | ------------------ |
| `/`              | `FeedPage`         |
| `/post/:id`      | `PostDetailPage`   |
| `/bookmarks`     | `BookmarksPage`    |
| `/oauth-success` | `OAuthSuccessPage` |
| `*`              | Redirect to `/`    |

Add new routes in `router.tsx`. Use `useNavigate` and `useParams` from `react-router-dom`.

## Build & Deploy

```bash
pnpm dev       # Vite dev server
pnpm build     # tsc -b && vite build
pnpm lint      # ESLint
pnpm format    # Prettier
pnpm preview   # Local Cloudflare Worker emulation (wrangler dev)
pnpm deploy    # Build + deploy to Cloudflare production
```

## Scope Boundaries

- No test framework — do not add tests unless explicitly requested
- No global CSS additions — Tailwind utility classes only
- No barrel `index.ts` files
- No new third-party state management libraries
