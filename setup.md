# Preheat — Setup Guide

This document covers how to run the project locally at each stage of development.

---

## Current State (Prototype Phase)

The project currently consists of a single interactive HTML prototype. No build tools, package managers, or servers are required.

### Prerequisites

- Any modern web browser (Chrome, Firefox, Safari, Edge)

### Run the Prototype

```bash
# Option 1: Open directly in browser
open preheat-pilot-app.html

# Option 2: Serve locally (avoids any browser file:// restrictions)
npx serve .
# then open http://localhost:3000
```

The prototype is fully self-contained — all CSS and JavaScript are inline. No internet connection is needed after the file is loaded.

---

## Planned Production Stack

> This section will be updated as the stack is finalized. The choices below are under evaluation.

### Frontend

| Option              | Notes                                                 |
| ------------------- | ----------------------------------------------------- |
| React Native + Expo | Best for iOS/Android native app distribution          |
| React (PWA)         | Fastest path if web-first; installable on mobile      |
| Flutter             | Consider if cross-platform UI consistency is critical |

**Leaning toward:** React Native (Expo) for mobile-first distribution, with a React web admin panel for dispatchers.

### Backend

| Layer              | Technology (Proposed)                            |
| ------------------ | ------------------------------------------------ |
| API                | Node.js (Express or Fastify) or Go               |
| Real-time updates  | WebSocket (Socket.io or native WS)               |
| Database           | PostgreSQL (queue state, flight records)         |
| Auth               | JWT + refresh tokens; OAuth2 for federated login |
| Push Notifications | Expo Push / APNs / FCM                           |
| Hosting            | Railway / Render / AWS ECS                       |

### Dev Tools

```bash
# Frontend (React Native / Expo)
npm install -g expo-cli
npx create-expo-app preheat-mobile

# Backend
npm init
npm install express ws pg dotenv
```

---

## Environment Variables (Planned)

```env
# .env (backend)
DATABASE_URL=postgresql://user:pass@localhost:5432/preheat
JWT_SECRET=change_me_in_production
PUSH_NOTIFICATION_KEY=your_expo_push_key
PORT=4000

# .env (frontend)
EXPO_PUBLIC_API_URL=http://localhost:4000
```

---

## Repository Structure (Target)

```
preheat/
├── preheat-pilot-app.html      # Interactive prototype (current)
├── sessions.md                 # Dev session log
├── setup.md                    # This file
├── project-documentation.md   # Full project docs
│
├── apps/
│   ├── mobile/                 # React Native / Expo pilot app
│   └── web-admin/              # React dispatcher dashboard
│
├── services/
│   ├── api/                    # REST API (Node/Go)
│   ├── scheduler/              # Queue scheduling logic
│   └── notifier/               # Push notification service
│
├── packages/
│   └── shared/                 # Shared types, constants, utils
│
└── infra/                      # Docker, CI/CD configs
```

---

## Running Tests (Planned)

```bash
# Unit + integration tests
npm test

# End-to-end (Detox for mobile / Playwright for web)
npm run test:e2e
```

---

## Deployment (Planned)

CI/CD via GitHub Actions. On merge to `main`:

1. Run tests
2. Build Expo app (EAS Build) and submit to stores
3. Deploy backend to Railway/Render

---
