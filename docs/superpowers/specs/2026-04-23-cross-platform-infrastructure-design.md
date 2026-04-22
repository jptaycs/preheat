# Cross-Platform Infrastructure Design

**Date:** 2026-04-23
**Status:** Approved
**Approach:** Expo Universal (Approach A)

## Overview

Extend the existing Expo + React Native mobile app to also run as a web application for pilots, while keeping the Vite-based web-admin separate. Deploy everything on AWS. Use EAS Build with Android Studio Emulator for native development (no Expo Go).

## Goals

- Single codebase (Expo Router) serves Android, iOS, and Web for the pilot-facing app
- Web-admin (Vite + React) continues to grow independently for dispatchers/admins
- Android Studio Emulator as the primary native testing device (no Expo Go)
- iOS testing deferred to later (requires Mac + Xcode)
- AWS deployment: cost-effective for prototype, scalable for production
- Architecture supports web-admin growth without prescribing specific features

## Monorepo Structure

```
preheat/
├── apps/
│   ├── mobile/              ← universal app (Android + iOS + Web for pilots)
│   └── web-admin/           ← Vite SPA (dispatchers/admins)
├── packages/
│   ├── shared/              ← TypeScript types & constants (existing)
│   └── ui/                  ← shared React Native + Web UI components (new)
├── services/
│   └── api/                 ← Fastify + PostgreSQL (existing)
├── infrastructure/          ← AWS CDK (TypeScript) (new)
└── turbo.json               ← updated task pipeline
```

### Key changes

- `apps/mobile` gains web export via Expo Router — same screens render in-browser
- `packages/ui` — shared UI components (buttons, cards, inputs) built with React Native, compatible with web via React Native Web
- `infrastructure/` — AWS CDK configs in TypeScript

## Platform Adapters

Platform-specific APIs are handled with file extensions that Metro and Webpack resolve automatically:

```
apps/mobile/src/lib/
├── storage.native.ts   ← expo-secure-store (Android/iOS)
├── storage.web.ts      ← localStorage (browser)
```

| Feature            | Native (.native.ts)       | Web (.web.ts)                           |
| ------------------ | ------------------------- | --------------------------------------- |
| Token storage      | expo-secure-store         | localStorage + httpOnly cookies in prod |
| Push notifications | expo-notifications        | Web Push API (navigator.serviceWorker)  |
| Biometrics         | expo-local-authentication | Skip (WebAuthn later)                   |
| Haptics            | expo-haptics              | No-op                                   |

All screens, hooks, API client, theme, and navigation remain fully shared. Expo Router and React Native Web handle rendering differences.

## State Management

**TanStack Query** for server state + **React Context** for client state.

### Server state (TanStack Query)

Replaces manual `fetch` + `useEffect` + `useState` patterns in screens:

```typescript
const { data: queue, isLoading } = useQuery({
  queryKey: ['queue', date],
  queryFn: () => api.get('/queue', { date }),
})

const cancelRequest = useMutation({
  mutationFn: (id) => api.delete(`/preheat-requests/${id}`),
  onSuccess: () => queryClient.invalidateQueries(['queue']),
})
```

Benefits: automatic caching, background refetch, optimistic updates, loading/error states.

### Client state (React Context)

Auth context stays as-is. Additional client-only state (UI preferences) uses context.

No Zustand needed at this stage. Can be added later if client state grows, without reworking existing code.

### WebSocket integration

When a `queue.updated` or `session.updated` event arrives via WebSocket, invalidate the relevant TanStack Query cache. Screens auto-refresh without manual wiring.

## Development & Testing Setup

### Native development (no Expo Go)

- **EAS Build** with `development` profile creates a custom dev client APK
- Install on **Android Studio Emulator** (AVD)
- Run `npx expo start --dev-client` — emulator connects to dev server with hot reload
- iOS Simulator support deferred (requires Mac + Xcode)

### Web development

- `npx expo start --web` — pilot app in browser
- `pnpm dev` in web-admin — Vite dev server as-is

### Testing strategy

| Layer                | Tool                                  | Coverage                                    |
| -------------------- | ------------------------------------- | ------------------------------------------- |
| API                  | Vitest (existing)                     | Route handlers, business logic, DB queries  |
| Shared UI components | Vitest + React Testing Library        | `packages/ui` renders correctly             |
| Mobile screens       | Vitest + React Native Testing Library | Screen logic, user interactions             |
| Web pilot app        | Same tests via RN Web in jsdom        | Platform adapter tests with `.web.ts` mocks |
| E2E (later)          | Maestro (mobile) / Playwright (web)   | Full user flows approaching production      |

### CI pipeline (extend existing GitHub Actions)

1. Typecheck, lint, format (existing)
2. Unit/integration tests across all packages
3. EAS Build triggered on PR merges (optional, can stay local initially)

## AWS Infrastructure

```
                    +------------------+
                    |   CloudFront     |
                    |   (CDN)          |
                    +----+--------+----+
                         |        |
              +----------+-+  +---+----------+
              | S3 Bucket  |  | S3 Bucket    |
              | Pilot Web  |  | Web Admin    |
              +------------+  +--------------+
                         |
                    +----+-------------+
                    |  App Runner      |
                    |  (Fastify API)   |
                    +----+-------------+
                         |
                    +----+-------------+
                    |  RDS PostgreSQL   |
                    |  (db.t4g.micro)  |
                    +------------------+
```

| Service         | Purpose                                                 | Est. cost                    |
| --------------- | ------------------------------------------------------- | ---------------------------- |
| S3 + CloudFront | Static hosting for pilot web + web-admin                | ~$1-3/mo                     |
| App Runner      | Fastify API container, auto-scales, supports WebSockets | ~$5-15/mo                    |
| RDS PostgreSQL  | db.t4g.micro, managed backups                           | Free tier 12mo, then ~$15/mo |
| ACM             | SSL certificates                                        | Free                         |
| Route 53        | DNS routing (preheat.app)                               | ~$0.50/mo                    |

### Why App Runner

- Simpler than ECS Fargate (no task definitions, clusters, load balancers)
- Supports WebSockets (unlike basic Lambda)
- Auto-scales at low traffic
- Container-based: Fastify app runs as-is with a Dockerfile

### Deployment flow

- `git push` to main -> GitHub Actions -> pushes container to ECR -> App Runner auto-deploys
- Web apps: GitHub Actions builds static bundles -> syncs to S3 -> invalidates CloudFront cache

### Infrastructure as Code

AWS CDK in TypeScript (`infrastructure/` directory) — same language as the rest of the stack.

## Migration Path

### Phase 1 — Foundation (no breaking changes)

- Add `packages/ui` with shared components extracted from existing screens
- Set up TanStack Query, migrate screens one at a time from manual fetch
- Add platform adapter files (`.native.ts` / `.web.ts`) for storage, notifications

### Phase 2 — Dev builds

- Configure EAS Build with development profile
- Set up Android Studio Emulator workflow
- Remove dependency on Expo Go

### Phase 3 — Web export

- Enable Expo Router web export for the pilot app
- Test all screens in browser, fix RN Web incompatibilities
- Ensure responsive layout on desktop/tablet/mobile browser

### Phase 4 — AWS deployment

- Set up AWS CDK in `infrastructure/`
- Deploy API to App Runner, DB to RDS
- Deploy pilot web + web-admin to S3/CloudFront
- Configure domain, SSL, CI/CD pipeline

### Phase 5 — Polish & grow

- Add E2E tests (Maestro mobile, Playwright web)
- Expand web-admin features as needed
- iOS testing setup when ready (Xcode + EAS)

Each phase is independently shippable.

## Tech Stack Summary

| Layer              | Technology                                             |
| ------------------ | ------------------------------------------------------ |
| Mobile + Pilot Web | React Native 0.81 + Expo 54 + Expo Router (web export) |
| Web Admin          | React 18 + Vite 5 + React Router v6                    |
| Shared Types       | TypeScript (`@preheat/shared`)                         |
| Shared UI          | React Native components (`@preheat/ui`)                |
| Server State       | TanStack Query (React Query)                           |
| Client State       | React Context                                          |
| Backend            | Fastify 4 + Node.js                                    |
| Database           | PostgreSQL 16 (AWS RDS)                                |
| Native Testing     | EAS Build dev client + Android Studio Emulator         |
| Web Testing        | Browser (Expo web export / Vite dev server)            |
| Unit Tests         | Vitest + React Testing Library / RNTL                  |
| E2E Tests          | Maestro (mobile) + Playwright (web)                    |
| Hosting (Web)      | AWS S3 + CloudFront                                    |
| Hosting (API)      | AWS App Runner                                         |
| IaC                | AWS CDK (TypeScript)                                   |
| CI/CD              | GitHub Actions                                         |
| Monorepo           | pnpm workspaces + Turborepo                            |
