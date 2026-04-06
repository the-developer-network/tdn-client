# Contributing to TDN

Thank you for your interest in contributing to **TDN — The Developer Network**!

## Prerequisites

| Tool    | Version              |
| ------- | -------------------- |
| Node.js | `v22` (see `.nvmrc`) |
| pnpm    | `v10+`               |
| Git     | any recent version   |

```bash
# Install pnpm if you don't have it
npm install -g pnpm

# Use the correct Node version (with nvm)
nvm use
```

## Local Setup

```bash
# 1. Clone the repo
git clone https://github.com/<org>/tdn-client.git
cd tdn-client

# 2. Install dependencies
pnpm install

# 3. Start the dev server
pnpm dev
```

The app will be available at `http://localhost:5173`.

## Scripts

| Command        | Description                               |
| -------------- | ----------------------------------------- |
| `pnpm dev`     | Vite dev server (hot reload)              |
| `pnpm build`   | Type-check + production build             |
| `pnpm lint`    | ESLint check                              |
| `pnpm format`  | Prettier write                            |
| `pnpm preview` | Build + local Cloudflare Worker emulation |

## Project Structure

```
src/
  app/        # Router, global CSS, entry point
  core/       # API client, auth store
  features/   # Feature modules (feed, comments, notifications, …)
  pages/      # Route-level components
  shared/     # Reusable UI components, layout, utilities
functions/    # Cloudflare Pages Functions (edge OG injection, sitemap)
public/       # Static assets (robots.txt, favicon)
```

## Branch & PR Conventions

- Branch from `main`: `feature/<name>`, `fix/<name>`, `chore/<name>`
- Keep PRs focused — one feature or fix per PR
- All checks (lint + typecheck) must pass before merge
- Follow existing naming conventions (see `copilot-instructions.md`)

## Commit Style

Use [Conventional Commits](https://www.conventionalcommits.org/):

```
feat(feed): add infinite scroll
fix(auth): handle token expiry on refresh
chore(deps): update vite to v8
```

## Code Style

- **TypeScript strict mode** — no `any`
- **Tailwind CSS only** — no inline styles, no CSS Modules
- **Zustand** for global state — no Context API
- No barrel `index.ts` files
- Event handlers named `handleXxx`

ESLint and Prettier run automatically on commit via husky + lint-staged.
