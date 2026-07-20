# AGENTS.md

Guidance for AI coding agents working in this repository.

## What this is

**Preheat** (branded **AeroFluxPro** in the UI) is a queue-scheduling system for aircraft engine preheating at small airports: pilots request a preheat slot from a mobile app, mechanics/dispatchers run the queue from a web panel. Product spec lives in `project-docs.md`; local-setup details and troubleshooting in `setup.md`.

pnpm + Turborepo monorepo (Node >= 20, pnpm >= 9) with four workspaces:

| Workspace         | What                                         | Stack                                 |
| ----------------- | -------------------------------------------- | ------------------------------------- |
| `services/api`    | REST + WebSocket API                         | Fastify 4, raw SQL via `pg`, zod, JWT |
| `apps/web-admin`  | Mechanic/dispatcher panel                    | Vite + React                          |
| `apps/mobile`     | Pilot app                                    | Expo / React Native                   |
| `packages/shared` | Shared types & constants (`@preheat/shared`) | tsc → `dist/`                         |

`@preheat/shared` is consumed from its **built** `dist/` — run `pnpm build` (or its `dev` watch) after changing it, or dependent typechecks/imports see stale types. Turbo's `typecheck`/`test` pipelines depend on `^build` and handle this when run from the root.

## Commands

```bash
pnpm install                 # install everything
pnpm dev                     # all workspaces in parallel (turbo)
pnpm typecheck | lint | test # repo-wide via turbo / eslint

# Per-workspace (run inside the workspace dir, or use pnpm --filter)
cd services/api && pnpm dev          # API at http://localhost:4000 (tsx watch)
cd apps/web-admin && pnpm dev        # Vite at http://localhost:5173
cd apps/mobile && pnpm android       # build + install on Android emulator

# Tests
cd services/api && pnpm test                                  # vitest run
cd services/api && pnpm vitest run src/__tests__/health.test.ts   # single file
cd apps/mobile && pnpm test                                   # jest

# Database (from services/api)
pnpm db:migrate              # apply schema
pnpm db:seed                 # seed dev accounts + sample data
```

Husky + lint-staged run `eslint --fix` and `prettier` on staged files at commit.

`scripts/test-android.sh` is the end-to-end rig: boots an AVD, seeds the screenshot scenario, installs the dev APK (API + Metro must already be running).

## Local environment

- API needs `services/api/.env` (copy from `.env.example`). Postgres 16 on `localhost:5432` with db `preheat_dev`, user/password `preheat`/`preheat` — creation steps in `setup.md`.
- Seeded dev accounts: `dev-pilot@preheat.local`/`devpilot123`, `dev-mechanic@preheat.local`/`devmechanic123`, `dev-admin@preheat.local`/`devadmin123`. Both frontends have **Dev Shortcuts** buttons on the login screen that sign in as these users instantly.
- Mobile `.env` must use `EXPO_PUBLIC_API_URL=http://10.0.2.2:4000` (not `localhost`) so the Android emulator can reach the host. Web-admin uses `VITE_API_URL`.

## API architecture (`services/api`)

- `src/index.ts` boots Sentry + the server; `src/app.ts` (`buildApp()`) is where everything is registered — security plugins (helmet, CORS, rate-limit), routes, WebSocket, and background jobs. Tests build the app via `buildApp()` without listening.
- **Routes** live in `src/routes/*` and are registered with prefixes in `app.ts` (`/auth`, `/aircraft`, `/preheat-requests`, `/queue`, `/preheat-sessions`, `/admin`, plus `/weather`, `/preferences`). Request bodies are validated with zod.
- **Database**: no ORM. `src/db/client.ts` exports a `pg` Pool as `db` plus a `withTransaction()` helper. The whole schema is one idempotent SQL script in `src/db/migrate.ts` (`CREATE TABLE IF NOT EXISTS` + guarded `ALTER`s) — schema changes are made by editing that file and re-running `pnpm db:migrate`; there are no numbered migration files.
- **Auth**: `@fastify/jwt` with short-lived access tokens + hashed refresh tokens in the `refresh_tokens` table. Roles: `pilot`, `mechanic`, `dispatcher`, `admin`.
- **Background jobs** (`src/jobs/`): `autoCancel` (cancels unconfirmed requests), `confirmReminder` (push the 30-min confirmation prompt), `timerExpiry` (ends finished heating sessions). Each runs on a 60s interval started in `app.ts`.
- **Live updates**: a WebSocket endpoint at `/ws`; connected sockets are kept in an `app.wsClients` Set that route handlers broadcast to. `apps/web-admin/src/lib/ws.ts` is the client side.
- **Domain flow**: a `preheat_request` moves `Waiting → Confirmed → Active (heating) → Done`; missed confirmation windows auto-cancel and advance the queue.

## Frontends

- `apps/web-admin`: pages in `src/pages/` (Login, Queue, Dashboard, Track, Users, Settings, Privacy), auth state in `src/context/AuthContext.tsx`, API client in `src/lib/api.ts`.
- `apps/mobile`: Expo app; screens/components under `src/components/` (SwiftUI-style component system in `src/components/ui/`), API client in `src/lib/api.ts`, theme in `src/theme.ts`.

## Deployment

API deploys via `services/api/Dockerfile` + `fly.toml` (Fly.io) and root `render.yaml` (Render). Mobile builds go through EAS.
