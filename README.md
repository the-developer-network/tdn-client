# TDN Client

TDN Client is the frontend single-page application (SPA) for a social developer network. Built with React 19 and TypeScript 5.9, it uses Vite 8 for development and Cloudflare Workers (via `wrangler`) for deployment.

Short: this repository contains the client application providing feed, post details, comments, bookmarks, and OAuth login flow.

**Technologies:**

- **React:** 19
- **TypeScript:** 5.9 (strict)
- **Vite:** 8
- **Cloudflare Workers:** `wrangler`
- **Tailwind CSS:** 4
- **Zustand:** 5 (state management)
- **React Router:** 7
- **pnpm:** package manager

**Project status:** Private (see `package.json` -> `private: true`).

## Quick Start

- Install dependencies:

```bash
pnpm install
```

- Run development server:

```bash
pnpm run dev
```

- Build & preview locally with Wrangler:

```bash
pnpm run preview
```

- Deploy to Cloudflare Workers:

```bash
pnpm run deploy
```

## Useful scripts

- `dev`: start Vite dev server (`pnpm run dev`)
- `build`: TypeScript build + Vite build (`pnpm run build`)
- `preview`: build then `wrangler dev` for local Worker preview
- `deploy`: build then `wrangler deploy`
- `lint`: run ESLint
- `format`: run Prettier

## API & Authentication

- API base URL: `https://api.developernetwork.net/api/v1` (defined in `src/core/api/client.ts`).
- `src/core/api/client.ts` implements automatic token refresh, request queueing during refresh, and session-expiration handling.

## Architecture / Folder Overview

- `src/app/`: entry point, router, and global CSS
- `src/core/`: API client, auth store, and cross-cutting utilities
- `src/features/`: feature modules (auth, feed, comment, profile, trends)
- `src/pages/`: route-level pages (FeedPage, PostDetailPage, BookmarksPage, etc.)
- `src/shared/`: reusable UI components and utilities

## Notable files

- `src/app/main.tsx`: application bootstrap and session-expired handler registration
- `src/app/router.tsx`: application routes (`/`, `/explore`, `/post/:id`, `/bookmarks`, `/comments/:id`, `/oauth-success`)
- `src/core/api/client.ts`: main API client with token refresh and error handling

## Development Conventions

- Use `pnpm` as the package manager.
- Code style: Prettier + ESLint with husky + lint-staged for pre-commit checks.
- Use Zustand for global state; follow hooks and component patterns in the codebase.
- Tailwind CSS utility classes only; avoid adding global CSS unless necessary.

## Deployment

- The project is configured to run on Cloudflare Workers. See `wrangler.jsonc` for configuration.

## Contributing

- Follow the repository's pre-commit checks (husky + lint-staged). Run `pnpm run lint` and `pnpm run format` before opening a pull request.
- Contribution workflow: create a topic branch for your changes, then open a pull request. By contributing you agree that your contributions will be licensed under the project's license unless otherwise agreed in writing.

## License

- This project is distributed under the Custom Source-Available License. See the `LICENSE` file for the full text.
