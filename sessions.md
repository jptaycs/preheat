# Preheat — Development Sessions

A running log of all development sessions from start to finish. Each session has a clear description, task list, smoke tests, and definition of done.

---

## Session Status

| #   | Session                                            | Phase                | Status        |
| --- | -------------------------------------------------- | -------------------- | ------------- |
| 001 | Concept & Interactive Prototype                    | 0 — Foundation       | ✅ Completed  |
| 002 | Planning & Documentation                           | 0 — Foundation       | ✅ Completed  |
| 003 | Repo Structure & Tooling Setup                     | 0 — Foundation       | ✅ Completed  |
| 004 | Backend: Auth API                                  | 1 — Auth             | ✅ Completed  |
| 005 | Mobile: Login & Registration Screens               | 1 — Auth             | ✅ Completed  |
| 006 | Backend: Aircraft & Preheat Request API            | 2 — Request & Queue  | ✅ Completed  |
| 007 | Mobile: Request Preheat Screen                     | 2 — Request & Queue  | ✅ Completed  |
| 008 | Mobile: Queue Screen (Real-Time)                   | 2 — Request & Queue  | ✅ Completed  |
| 009 | Backend: Confirmation & Auto-Cancel Logic          | 3 — Confirmation     | ✅ Completed  |
| 010 | Mobile: Confirm Screen & Push Notifications        | 3 — Confirmation     | ✅ Completed  |
| 011 | Backend: Preheat Session & Temperature Data        | 4 — Live Tracking    | ✅ Completed  |
| 012 | Mobile: Track Screen (Live)                        | 4 — Live Tracking    | ✅ Completed  |
| 013 | Mobile: Profile, Aircraft Management & Preferences | 5 — Profile          | ✅ Completed  |
| 014 | Web Admin: Dispatcher Dashboard                    | 6 — Dispatcher Panel | ✅ Completed  |
| 015 | Web Admin: Settings & User Management              | 6 — Dispatcher Panel | ✅ Completed  |
| 016 | End-to-End Testing                                 | 7 — QA & Polish      | ⚠️ Partial    |
| 017 | Accessibility, Performance & Edge Cases            | 7 — QA & Polish      | ✅ Completed  |
| 018 | Beta Release                                       | 8 — Launch           | ⚠️ Partial    |
| 019 | Public Launch & App Store Submission               | 8 — Launch           | ⬜ Incomplete |

> Update this table as sessions progress. Statuses: ✅ Completed · 🔄 In Progress · ⚠️ Partial · ⬜ Incomplete

**016 Partial:** API integration + unit tests landed (`886f911`); mobile (Detox/Maestro) and web-admin (Playwright) E2E suites not set up.
**018 Partial:** Sentry on API+mobile, EAS build config, Fly.io deploy config, Privacy Policy page all committed (`32efd1f`, `012dea8`). Not done: actual production deploy, domain/TLS, uptime monitoring, TestFlight/Play distribution, seeded airport, feedback intake doc.
**019:** Only Privacy Policy from the task list is done. Store assets, submissions, support email, post-launch monitoring plan all outstanding.

---

## How to Use This File

- Sessions are numbered sequentially and grouped into **phases**
- **Status:** `Planned` → `In Progress` → `Completed` → `Skipped`
- **Smoke Test** — a quick manual check you run at the end of each session to verify the work holds up before moving on
- **Definition of Done (DoD)** — the objective criteria that must all be true before the session is marked Completed

---

## Phase Overview

| Phase                | Sessions | Theme                                           |
| -------------------- | -------- | ----------------------------------------------- |
| 0 — Foundation       | 001–003  | Prototype, planning, repo & tooling setup       |
| 1 — Auth             | 004–005  | User accounts, login, session management        |
| 2 — Request & Queue  | 006–008  | Core preheat request flow and queue engine      |
| 3 — Confirmation     | 009–010  | Attendance confirmation + push notifications    |
| 4 — Live Tracking    | 011–012  | Real-time heat progress, temperature data       |
| 5 — Profile          | 013      | Pilot profile, preferences, aircraft management |
| 6 — Dispatcher Panel | 014–015  | Admin web UI for FBO staff                      |
| 7 — QA & Polish      | 016–017  | Testing, accessibility, performance             |
| 8 — Launch           | 018–019  | Beta release, store submission, go-live         |

---

---

## Phase 0 — Foundation

---

### Session 001 — Concept & Interactive Prototype

**Date:** 2026-04-07
**Branch:** `test`
**Status:** Completed

**Description:**
Define the core concept and validate the end-to-end user experience with a clickable prototype before committing to any production tooling. The goal is speed — one HTML file, no build step.

**Tasks:**

- [x] Define the problem: shared aircraft heater, no digital queue system
- [x] Establish design language (dark theme, color tokens, typography)
- [x] Build `preheat-pilot-app.html` — single-file interactive prototype
- [x] Prototype all 9 pilot-facing screens with navigation
- [x] Add live countdown timer on Confirm screen
- [x] Add animated heat gauge on Track screen

**Screens Prototyped:**
| Screen ID | Name | Description |
|---|---|---|
| `s-splash` | Splash | App launch with brand identity and loading bar |
| `s-login` | Login | Email/password login + biometric option |
| `s-dashboard` | Dashboard | Home with active flight card and quick actions |
| `s-request` | Request Preheat | Form: tail number, date, desired flight time |
| `s-queue` | Queue | Full daily queue with statuses and filters |
| `s-confirm` | Confirm | Attendance confirmation with 30-min countdown ring |
| `s-track` | Track | Live heat gauge, temperature readout, and timeline |
| `s-notifs` | Notifications | Urgent + chronological alert feed |
| `s-profile` | Profile | Account info, notification settings, preferences |

**Smoke Test:**

1. Open `preheat-pilot-app.html` in a browser
2. Tap "Get Started" → should land on Login
3. Tap "Sign In" → should land on Dashboard with orange alert banner
4. Tap the alert banner → should land on Confirm with countdown ticking
5. Tap "I'm Arriving — Confirm" → should land on Track with heat gauge at 72%
6. Tap all 4 bottom nav icons and verify each screen loads correctly
7. Tap the back arrows and verify they return to the correct parent screen

**Definition of Done:**

- [x] All 9 screens are reachable via taps
- [x] Countdown timer decrements every second on the Confirm screen
- [x] Heat gauge renders correctly on the Track screen
- [x] No JS errors in browser console

**Key Decisions:**

- Single HTML file for rapid iteration (no build toolchain at this stage)
- Pilot-first UX: primary user is the aircraft pilot, not ground crew
- Mandatory confirmation window: 30 min before departure or slot is auto-released
- Queue is dynamic: cancellations shift all subsequent positions forward

**Open Questions Raised:**

- Do we need a separate Dispatcher/Admin view?
- REST vs. WebSocket for live updates?
- Queue priority algorithm: FIFO vs. departure-time-based?
- Engine preheat only, or cabin preheat too?

---

### Session 002 — Planning & Documentation

**Date:** 2026-04-07
**Branch:** `test`
**Status:** Completed

**Description:**
Before writing production code, align on scope, data model, tech stack, and project structure. Produce living documentation that every future session references.

**Tasks:**

- [x] Write `sessions.md` — session roadmap and log (this file)
- [x] Write `setup.md` — how to run the project at each stage
- [x] Write `project-documentation.md` — full reference: problem, flows, data model, design system, MVP scope, open questions
- [x] Define MVP boundary (what's in v1.0 vs. later)
- [x] Draft data model (User, Aircraft, PreheatRequest, PreheatSession, Notification)

**Smoke Test:**

1. Open each doc file — confirm it renders correctly in GitHub / VS Code markdown preview
2. Cross-check: every screen in Session 001 must appear in the screen inventory in `project-documentation.md`
3. Confirm open questions from Session 001 are captured in the open questions table in `project-documentation.md`

**Definition of Done:**

- [x] `sessions.md`, `setup.md`, and `project-documentation.md` all exist in repo root
- [x] MVP scope clearly separates v1.0 from future features
- [x] Data model covers all entities needed for the pilot-facing MVP
- [x] At least 5 open questions documented for stakeholder review

---

### Session 003 — Repo Structure & Tooling Setup

**Date:** TBD
**Branch:** `main`
**Status:** Completed

**Description:**
Set up the production repository structure — monorepo, package manager, linting, formatting, CI skeleton — so that all future sessions start from a clean, consistent foundation.

**Tasks:**

- [ ] Initialize monorepo (recommend: `pnpm` workspaces or Turborepo)
- [ ] Create workspace packages: `apps/mobile`, `apps/web-admin`, `services/api`, `packages/shared`
- [ ] Configure ESLint + Prettier (shared config in `packages/shared`)
- [ ] Set up TypeScript (`tsconfig.base.json` at root, extended per package)
- [ ] Add `.env.example` files to each package that needs environment variables
- [ ] Configure GitHub Actions: CI pipeline (lint → typecheck → test on every PR)
- [ ] Set up `.gitignore`, `CODEOWNERS`, branch protection rules on `main`
- [ ] Add Husky + lint-staged for pre-commit checks

**Smoke Test:**

1. `pnpm install` from repo root — should succeed with no errors
2. `pnpm lint` from root — should run ESLint across all packages with zero errors
3. `pnpm typecheck` — TypeScript should compile with no errors
4. Open a test PR → GitHub Actions CI pipeline should trigger and pass
5. Attempt to commit a file with a lint error — Husky pre-commit hook should block it

**Definition of Done:**

- [ ] Monorepo structure matches the target layout in `setup.md`
- [ ] CI runs on every PR and fails fast on lint/type errors
- [ ] At least one example component in `packages/shared` that is importable by both `apps/mobile` and `apps/web-admin`
- [ ] All `.env.example` files documented with every required variable

---

---

## Phase 1 — Auth

---

### Session 004 — Backend: Auth API

**Date:** TBD
**Branch:** `feat/auth-api`
**Status:** Completed

**Description:**
Build the authentication layer for the backend API. Pilots and dispatchers log in with email + password. JWTs are issued for session management. This must be solid before any other API work begins.

**Tasks:**

- [ ] Initialize `services/api` — Node.js + Fastify (or Express) + TypeScript
- [ ] Connect to PostgreSQL database (use `pg` or Drizzle ORM)
- [ ] Run database migration: create `users` table
- [ ] `POST /auth/register` — create pilot account (name, email, password, license number)
- [ ] `POST /auth/login` — validate credentials, return access token + refresh token
- [ ] `POST /auth/refresh` — exchange refresh token for new access token
- [ ] `POST /auth/logout` — invalidate refresh token
- [ ] `GET /auth/me` — return current user from token
- [ ] Password hashing with `bcrypt` (cost factor ≥ 12)
- [ ] JWT signing with RS256 (asymmetric keys, not HS256)
- [ ] Input validation on all endpoints (use `zod`)
- [ ] Rate limiting on `/auth/login` (max 5 attempts per 15 min per IP)
- [ ] Write unit tests for auth service logic
- [ ] Write integration tests for all auth endpoints

**Smoke Test:**

1. `POST /auth/register` with valid payload → 201, user returned (no password in response)
2. `POST /auth/login` with correct credentials → 200, access + refresh tokens returned
3. `POST /auth/login` with wrong password → 401
4. `GET /auth/me` with valid access token → 200, user object returned
5. `GET /auth/me` with expired token → 401
6. `POST /auth/refresh` with valid refresh token → 200, new access token
7. Attempt 6 logins in a row with wrong password → 6th request should be 429 (rate limited)

**Definition of Done:**

- [ ] All 7 auth endpoints implemented and returning correct HTTP status codes
- [ ] Passwords are never stored in plaintext or returned in any response
- [ ] All endpoints have input validation — malformed requests return 400 with error details
- [ ] Unit test coverage ≥ 80% for auth service
- [ ] Integration tests pass against a real (test) PostgreSQL instance

---

### Session 005 — Mobile: Login & Registration Screens

**Date:** TBD
**Branch:** `feat/auth-mobile`
**Status:** Completed

**Description:**
Wire the Login and Registration screens in the Expo mobile app to the real auth API. Replace prototype mock interactions with actual API calls, token storage, and navigation guards.

**Tasks:**

- [ ] Initialize `apps/mobile` with Expo + TypeScript
- [ ] Install and configure React Navigation (stack + bottom tab navigator)
- [ ] Install Expo SecureStore for token storage
- [ ] Build `LoginScreen` — email + password form with validation
- [ ] Build `RegisterScreen` — name, email, password, confirm password, license number
- [ ] Implement auth context (`AuthProvider`) — stores tokens, exposes `login()`, `logout()`, `isAuthenticated`
- [ ] Implement token refresh interceptor (auto-refresh before expiry)
- [ ] Biometric login using `expo-local-authentication` (FaceID / TouchID)
- [ ] Navigation guard — redirect unauthenticated users to Login
- [ ] Error handling: show inline form errors, network error toast
- [ ] "Forgot password?" placeholder (no-op for v1.0, shows "contact admin" message)

**Smoke Test:**

1. Open the app — should land on Login screen (not Dashboard)
2. Submit with empty fields → inline validation errors appear, no API call made
3. Submit with wrong password → API 401 → "Invalid email or password" shown
4. Submit valid credentials → tokens stored, navigates to Dashboard
5. Kill and reopen the app → tokens are restored from SecureStore, lands on Dashboard (not Login)
6. Tap "Sign Out" in Profile → tokens cleared, returns to Login
7. On a device with biometrics: enable biometric login, lock the app, re-open → biometric prompt appears → success navigates to Dashboard

**Definition of Done:**

- [ ] Login and Register screens match the prototype design
- [ ] Tokens persisted across app restarts via Expo SecureStore
- [ ] Auto token refresh works transparently — user never sees a session expired error mid-session
- [ ] Invalid credentials show user-facing error (not a console log)
- [ ] Unauthenticated routes are fully guarded

---

---

## Phase 2 — Request & Queue

---

### Session 006 — Backend: Aircraft & Preheat Request API

**Date:** TBD
**Branch:** `feat/request-api`
**Status:** Completed

**Description:**
Build the core data layer — aircraft registry and preheat request management. This is the foundation of the queue system.

**Tasks:**

- [ ] Database migrations: `aircraft`, `preheat_requests` tables
- [ ] `GET /aircraft` — list aircraft associated with the current pilot
- [ ] `POST /aircraft` — register a new aircraft (tail number, type)
- [ ] `DELETE /aircraft/:id` — remove an aircraft
- [ ] `POST /preheat-requests` — submit a new preheat request
  - Validate: tail number exists, date is today or future, no duplicate active request for same aircraft + date
  - Auto-assign queue position (FIFO by submission time within the same day)
  - Calculate `assigned_time` based on queue position and 30-min preheat slots
- [ ] `GET /preheat-requests` — list requests for the current pilot (filterable by date)
- [ ] `GET /preheat-requests/:id` — single request detail
- [ ] `DELETE /preheat-requests/:id` — cancel a request (only if status is `waiting` or `confirmed`)
  - On cancel: shift all subsequent queue positions forward by 1
  - Trigger notification to affected pilots
- [ ] Write integration tests for all endpoints

**Smoke Test:**

1. `POST /aircraft` with tail "N4721B", type "Cessna 172" → 201
2. `POST /preheat-requests` with valid aircraft + future departure time → 201, `queue_position: 1`, `assigned_time` set
3. Submit a second request (different aircraft, same date) → 201, `queue_position: 2`, `assigned_time` = first + 30 min
4. `DELETE /preheat-requests/:id` for request #1 → 200; re-fetch request #2 → `queue_position` should now be 1
5. Submit a request for a past date → 400 validation error
6. Submit a duplicate request for same aircraft + date → 409 conflict error

**Definition of Done:**

- [ ] Queue position assigned correctly with no gaps after cancellations
- [ ] `assigned_time` is always 30 min per slot, stacked from the day's first slot
- [ ] Cancellation correctly cascades position updates to all subsequent requests
- [ ] All endpoints require valid auth token (no public access)

---

### Session 007 — Mobile: Request Preheat Screen

**Date:** TBD
**Branch:** `feat/request-screen`
**Status:** Completed

**Description:**
Build the functional Request Preheat screen — the primary pilot action. Connects to the aircraft API and preheat request API. Shows real data instead of prototype mock data.

**Tasks:**

- [ ] Fetch pilot's registered aircraft list from API, populate tail number selector
- [ ] Date picker (departure date — today or future)
- [ ] Time picker (desired departure time)
- [ ] Optional notes field
- [ ] "Suggested Start Times" chip row — calculated from API response (3 time options near desired time)
- [ ] Submit button → `POST /preheat-requests` → show success card with assigned preheat time and queue position
- [ ] Form validation: all required fields, time must be in the future
- [ ] Error states: network error, conflict (duplicate request), server error
- [ ] Loading state on submit button

**Smoke Test:**

1. Open Request Preheat screen — aircraft selector populated from API (not hardcoded)
2. Submit with no tail number selected → inline validation error
3. Submit with a past departure time → inline validation error
4. Submit a valid request → success card appears with preheat time and queue position
5. Navigate to Queue → the newly submitted request appears in the list
6. Submit a second request for the same aircraft on the same date → conflict error shown

**Definition of Done:**

- [ ] Aircraft list is fetched from API (not hardcoded)
- [ ] Successful submission shows the real assigned preheat time from the API response
- [ ] All error cases are handled with user-facing messages (not raw error objects)
- [ ] Queue screen reflects the newly submitted request immediately after submission

---

### Session 008 — Mobile: Queue Screen (Real-Time)

**Date:** TBD
**Branch:** `feat/queue-screen`
**Status:** Completed

**Description:**
Build the live Queue screen. The pilot sees their position among all requests for the day. This screen must update in real-time when queue positions change (cancellations, completions).

**Tasks:**

- [ ] `GET /queue?date=YYYY-MM-DD` backend endpoint — returns all preheat requests for a day, ordered by queue position
  - Each entry includes: position, tail number, aircraft type, pilot name (first name only for privacy), preheat time, flight time, status, delay in minutes
- [ ] WebSocket event: `queue.updated` — broadcast to all connected clients when any request status changes or position shifts
- [ ] Mobile: connect to WebSocket on app start, subscribe to today's queue updates
- [ ] Render queue list — match prototype design (position badge, tail, status pill, times)
- [ ] Highlight the current pilot's own entry with the blue "You" style
- [ ] Filter chips: All / Upcoming / Active / Done
- [ ] Stat row at top: Waiting count / Active count / Done count
- [ ] Pull-to-refresh as fallback if WebSocket is unavailable
- [ ] Tap a queue item → show bottom sheet with full request detail

**Smoke Test:**

1. Open Queue screen → list loads with real API data
2. Filter chips work: tapping "Active" shows only active entries, "Done" shows only done entries
3. Open the app on two devices (or browser + phone). Cancel a request on device A → device B's queue screen updates within 3 seconds without a manual refresh
4. The current pilot's own entry is visually distinct (blue highlight)
5. Pull-to-refresh fetches latest data
6. Tap any queue item → bottom sheet opens with full details

**Definition of Done:**

- [ ] Queue list populated from real API data
- [ ] Real-time updates via WebSocket — position shifts are reflected within 3 seconds
- [ ] Own entry always visually distinct regardless of position
- [ ] Stat counts (Waiting/Active/Done) match the actual list contents
- [ ] Pull-to-refresh works as a fallback

---

---

## Phase 3 — Confirmation

---

### Session 009 — Backend: Confirmation & Auto-Cancel Logic

**Date:** TBD
**Branch:** `feat/confirmation-api`
**Status:** Completed

**Description:**
Build the time-sensitive confirmation system. When a pilot's slot is approaching, the system prompts them to confirm. If they don't respond in time, the slot is automatically canceled.

**Tasks:**

- [ ] `POST /preheat-requests/:id/confirm` — pilot confirms attendance; sets status to `confirmed`
- [ ] `POST /preheat-requests/:id/cancel` — pilot cancels; cascades queue positions
- [ ] Background job (cron): every 1 minute, check for requests where:
  - Status is `waiting` AND departure time is ≤ 35 minutes away AND no confirmation received
  - → Emit push notification: "Confirm your attendance"
- [ ] Background job: check for requests where:
  - Status is `waiting` AND departure time is ≤ 5 minutes away AND no confirmation received
  - → Auto-cancel the request, cascade queue positions, emit `queue.updated` WebSocket event
  - → Send notification to pilot: "Your slot was auto-canceled"
  - → Send notifications to affected pilots: "Your position moved"
- [ ] Store confirmation timestamp on the request record
- [ ] Write tests for the cron logic (use fake timers)

**Smoke Test:**

1. Submit a request with departure time 34 minutes from now → within 1 minute, a push notification arrives on the test device
2. Confirm via `POST /confirm` → status changes to `confirmed`, confirmation timestamp set
3. Submit a request with departure time 4 minutes from now and do NOT confirm → within 1 minute, status changes to `canceled`, subsequent requests shift position, affected pilots receive notifications

**Definition of Done:**

- [ ] Confirmation push notification fires within 1 minute of the 35-min window
- [ ] Auto-cancel fires within 1 minute of the 5-min window
- [ ] Queue cascade is correct after auto-cancel (no position gaps)
- [ ] All affected pilots receive a notification when positions change
- [ ] Cron logic covered by unit tests with fake timers

---

### Session 010 — Mobile: Confirm Screen & Push Notifications

**Date:** TBD
**Branch:** `feat/confirm-mobile`
**Status:** Completed

**Description:**
Build the functional Confirm screen and wire up push notifications end-to-end. A tap on the push notification should deep-link directly to the Confirm screen for the relevant request.

**Tasks:**

- [ ] Register device for Expo Push Notifications on app launch; save token to backend (`PATCH /users/me/push-token`)
- [ ] Handle push notification received while app is in foreground (show in-app banner)
- [ ] Handle push notification tapped while app is in background/killed → deep link to `ConfirmScreen` with correct `requestId`
- [ ] Build `ConfirmScreen`:
  - Fetch request details from API by `requestId`
  - Display aircraft summary (tail, preheat time, departure time, queue position)
  - Countdown ring — calculated from the API's confirmation deadline timestamp (not hardcoded)
  - "I'm Arriving — Confirm" button → `POST /confirm` → navigate to Track screen
  - "Cancel My Preheat Request" button → `POST /cancel` → navigate to Dashboard, show toast
- [ ] If the confirmation window has already expired when the screen is opened → show expired state (no countdown, "This slot has been released" message)
- [ ] Dashboard alert banner should also link to the Confirm screen when a confirmation is pending

**Smoke Test:**

1. With the app killed, trigger a confirmation notification from the backend
2. Tap the notification → app opens directly on the Confirm screen (not Dashboard)
3. Countdown ring shows correct remaining time (not 30:00 every time — it reflects actual time remaining based on the deadline)
4. Tap "I'm Arriving" → status updates to `confirmed` via API, navigates to Track
5. Wait for the confirmation window to expire without responding → revisit the Confirm screen → shows expired state message, not a countdown
6. Tap "Cancel" → request canceled via API, navigates to Dashboard with toast "Your preheat request has been canceled"

**Definition of Done:**

- [ ] Push notification received and tapped on both iOS and Android (test on physical device or Expo Go)
- [ ] Deep link routes directly to the correct Confirm screen with the correct request
- [ ] Countdown is derived from the API deadline timestamp (accurate even if the notification was received late)
- [ ] Confirm and Cancel both call the API and update app state correctly
- [ ] Expired state handled gracefully — no countdown timer running on an already-closed window

---

---

## Phase 4 — Live Tracking

---

### Session 011 — Backend: Preheat Session & Temperature Data

**Date:** TBD
**Branch:** `feat/tracking-api`
**Status:** Completed

**Description:**
Build the live preheat session management and temperature tracking. In v1.0, temperature data will be manually entered by the dispatcher (hardware sensor integration is a future feature).

**Tasks:**

- [ ] Database migration: `preheat_sessions` table
- [ ] `POST /preheat-sessions` (dispatcher-only) — start a preheat session for a confirmed request
  - Sets request status to `active`
  - Records `started_at`, `ambient_temp`
- [ ] `PATCH /preheat-sessions/:id` (dispatcher-only) — update `current_temp`, `progress_pct`
  - Emit `session.updated` WebSocket event to the affected pilot
- [ ] `POST /preheat-sessions/:id/complete` (dispatcher-only) — mark session complete
  - Sets request status to `done`
  - Records `completed_at`
  - Emits `session.completed` WebSocket event
  - Triggers push notification to pilot: "Your aircraft is ready"
- [ ] `GET /preheat-sessions/:requestId` — current session state for a request (pilot-accessible)
- [ ] Progress percentage calculated as: `(current_temp - start_temp) / (target_temp - start_temp) * 100`, clamped 0–100

**Smoke Test:**

1. `POST /preheat-sessions` for a confirmed request → 201, request status changes to `active`
2. `PATCH /preheat-sessions/:id` with `current_temp: -4` → pilot's Track screen updates within 3 seconds
3. `PATCH` with temps that put progress at 100% → progress_pct is clamped to 100, not > 100
4. `POST /complete` → request status = `done`, pilot receives push notification "aircraft ready"
5. `GET /preheat-sessions/:requestId` from pilot token → returns current session data
6. Dispatcher trying to start a session for a `waiting` (unconfirmed) request → 409 error

**Definition of Done:**

- [ ] Preheat session lifecycle: started → updated → completed
- [ ] Real-time updates emitted via WebSocket on every `PATCH`
- [ ] Progress percentage calculated correctly from temperature deltas
- [ ] Pilot receives push notification on completion
- [ ] Dispatcher cannot start a session for an unconfirmed request

---

### Session 012 — Mobile: Track Screen (Live)

**Date:** TBD
**Branch:** `feat/track-screen`
**Status:** Completed

**Description:**
Build the live Track screen. The pilot watches their aircraft's preheat progress in real time — temperature rising, gauge animating, ETA counting down. This is the most visually rich screen in the app.

**Tasks:**

- [ ] Subscribe to `session.updated` WebSocket event for the current request
- [ ] Animate heat gauge arc smoothly as `progress_pct` changes (CSS transition or Reanimated)
- [ ] Display: Current temp / Target temp / Ambient temp
- [ ] ETA calculation: if progress is known, extrapolate completion time; show "~X min remaining"
- [ ] Progress timeline (vertical stepper): Request Submitted → Confirmed → Heating → Ready → Departure
  - Each step shows timestamp; current step is highlighted
- [ ] Handle completion event: gauge fills to 100%, ETA shows "Ready now", success state with green palette
- [ ] "Preheat Complete" push notification tapped → routes back to Track screen in completed state
- [ ] If no active session yet (confirmed but heating not started) → show "Waiting to begin" state with estimated start time

**Smoke Test:**

1. Open Track screen for an active session → heat gauge shows correct progress percentage
2. Update `current_temp` via API → gauge animates to new percentage within 3 seconds (no manual refresh)
3. All three temperature values (current, target, ambient) match what was set via the backend PATCH
4. ETA displayed is reasonable given current progress (e.g., if 72% done with 16 min elapsed, ~6 min remaining)
5. Complete the session via API → gauge fills to 100%, status text shows "Ready", color shifts to green
6. Open Track for a confirmed-but-not-yet-started request → "Waiting to begin" state shown

**Definition of Done:**

- [ ] Gauge animates smoothly — no jump cuts between percentage values
- [ ] All three temperature readings accurate and real-time
- [ ] ETA updates as progress increases
- [ ] Completion state renders correctly (green, "Ready", no countdown)
- [ ] "Waiting to begin" state shown when session hasn't started yet

---

---

## Phase 5 — Profile

---

### Session 013 — Mobile: Profile, Aircraft Management & Preferences

**Date:** TBD
**Branch:** `feat/profile`
**Status:** Completed

**Description:**
Build the functional Profile screen. Pilots manage their account, register and remove aircraft, and configure notification preferences that are persisted via the API.

**Tasks:**

- [ ] `GET /users/me` — full profile (name, email, license, aircraft, stats)
- [ ] `PATCH /users/me` — update name, email
- [ ] `PATCH /users/me/preferences` — update notification preferences, temperature unit, time format
- [ ] Mobile: Profile screen with real data from API
- [ ] Aircraft list — shows registered tail numbers; tap to view/remove
- [ ] "Add Aircraft" flow — modal with tail number + type fields
- [ ] Notification preference toggles — changes persisted immediately via PATCH on toggle
- [ ] Stats row: total flights, confirmation rate, number of aircraft
- [ ] Sign Out — clears tokens, navigates to Login
- [ ] Account deletion placeholder ("Contact support to delete your account" for v1.0)

**Smoke Test:**

1. Open Profile → name, email, license, aircraft list all match what was registered
2. Toggle "Queue Changes" notification off → kill and reopen app → toggle still shows off (persisted)
3. Change temperature unit from °C to °F → navigate to Track screen → temperatures display in °F
4. Add aircraft "N9900Z" → appears in aircraft list and in the request form tail number picker
5. Remove an aircraft that has no active requests → removed from list
6. Sign Out → tokens cleared, routed to Login → cannot navigate back to Dashboard without re-logging in

**Definition of Done:**

- [ ] All profile fields editable and persisted via API
- [ ] Notification preference changes take effect for subsequent push notifications
- [ ] Aircraft add/remove reflected immediately in the Request Preheat form's aircraft picker
- [ ] Sign out is irreversible without re-authenticating

---

---

## Phase 6 — Dispatcher Panel

---

### Session 014 — Web Admin: Dispatcher Dashboard

**Date:** TBD
**Branch:** `feat/dispatcher-web`
**Status:** Completed (refactored into "mechanic panel" — see `dde77fb`)

**Description:**
Build the web-based dispatcher panel used by FBO staff. This is a separate React web app. Dispatchers can see the full queue, start/update/complete preheat sessions, and override queue order when needed.

**Tasks:**

- [ ] Initialize `apps/web-admin` — React + TypeScript + Vite
- [ ] Auth: dispatcher login (same API, but role check — only `dispatcher` or `admin` roles can access)
- [ ] Today's Queue view — table/card list of all requests, auto-refreshing via WebSocket
- [ ] Status controls for each request:
  - "Start Preheat" button → `POST /preheat-sessions`
  - Temperature input + "Update" → `PATCH /preheat-sessions/:id`
  - "Mark Complete" → `POST /complete`
  - "Cancel" → `DELETE /preheat-requests/:id`
- [ ] Override queue order: drag-and-drop to reorder requests (updates `queue_position` for affected rows)
- [ ] Date selector to view past and future days
- [ ] Summary stats bar: total for the day, completed, active, waiting, canceled

**Smoke Test:**

1. Log in as a dispatcher account → lands on dispatcher dashboard (not pilot dashboard)
2. Log in as a pilot account → should be denied access (403)
3. Click "Start Preheat" for a confirmed request → mobile app's Track screen shows "Heating In Progress" within 3 seconds
4. Enter a temperature update → mobile Track screen gauge animates within 3 seconds
5. Mark complete → mobile Track screen shows "Ready", pilot receives push notification
6. Drag request #3 above request #2 → queue positions update, WebSocket event fires, mobile Queue screen reflects new order

**Definition of Done:**

- [ ] Dispatcher role enforced — pilot tokens cannot access dispatcher endpoints
- [ ] All CRUD operations on queue/sessions work via the web UI
- [ ] Real-time updates flow from dispatcher actions to pilot mobile app within 3 seconds
- [ ] Drag-and-drop queue reorder works and persists correctly

---

### Session 015 — Web Admin: Settings & User Management

**Date:** TBD
**Branch:** `feat/dispatcher-settings`
**Status:** Completed (`Settings.tsx`, `Users.tsx` in web-admin)

**Description:**
Add configuration and basic user management to the dispatcher panel. Admins can manage pilot accounts, configure preheat slot durations, and set operating hours for the queue.

**Tasks:**

- [ ] `GET /admin/users` — list all users (admin only)
- [ ] `PATCH /admin/users/:id` — update role, deactivate account
- [ ] `GET /admin/settings` / `PATCH /admin/settings` — airport-level config:
  - Slot duration (default: 30 min)
  - Operating hours (e.g., 06:00–18:00)
  - Max queue length per day
  - Confirmation window duration (default: 30 min)
- [ ] Web admin settings page: editable form for all config values
- [ ] User list: table with name, email, role, status; ability to deactivate/reactivate

**Smoke Test:**

1. Change slot duration from 30 → 45 min → submit a new request → `assigned_time` gap between consecutive queue slots is now 45 min (not 30)
2. Set operating hours to 08:00–16:00 → attempt to submit a request with departure time 17:00 → request rejected with "outside operating hours" error
3. Deactivate a pilot account → that pilot cannot log in (401)
4. Reactivate the account → login succeeds again

**Definition of Done:**

- [ ] Slot duration setting propagates to new queue assignment calculations
- [ ] Operating hours enforced on `POST /preheat-requests`
- [ ] Account deactivation immediately blocks API access
- [ ] All settings persisted in the database and applied on next relevant operation

---

---

## Phase 7 — QA & Polish

---

### Session 016 — End-to-End Testing

**Date:** TBD
**Branch:** `feat/e2e-tests`
**Status:** ⚠️ Partial — API integration + unit tests added (`886f911`); mobile (Detox/Maestro) and web-admin (Playwright) E2E not set up

**Description:**
Write end-to-end tests that cover the complete happy path and the most critical error paths. Tests run in CI on every PR.

**Tasks:**

- [ ] Set up Detox for React Native E2E (or Maestro — simpler setup)
- [ ] Set up Playwright for web admin E2E
- [ ] Write E2E tests for critical flows:
  - Full pilot flow: register → login → add aircraft → submit request → confirm → track → done
  - Confirmation timeout: submit request → do not confirm → slot auto-cancels → next pilot's position advances
  - Dispatcher flow: login → view queue → start preheat → update temp → complete → pilot notified
- [ ] Integrate E2E test suite into GitHub Actions (run nightly or on PR to `main`)
- [ ] Set up test database seeding script for reproducible test runs

**Smoke Test:**

1. Run `pnpm test:e2e` from repo root — all suites should pass with zero failures
2. Break one intentionally (e.g., comment out the confirm endpoint) → the confirmation E2E test should fail and be clearly reported

**Definition of Done:**

- [ ] Happy path E2E test passes for all 3 critical flows
- [ ] E2E tests run in CI on every PR to `main`
- [ ] Test run takes under 10 minutes total
- [ ] Flaky tests are zero (no `retry` hacks masking real failures)

---

### Session 017 — Accessibility, Performance & Edge Cases

**Date:** TBD
**Branch:** `feat/polish`
**Status:** Completed (`662b74c`)

**Description:**
Final quality pass before beta launch. Fix accessibility gaps, reduce unnecessary re-renders, handle offline and slow-network states, and harden edge cases.

**Tasks:**

- [ ] Mobile: Accessibility audit — all interactive elements have `accessibilityLabel`
- [ ] Mobile: Test with screen reader on iOS (VoiceOver) and Android (TalkBack) — primary flows must be navigable
- [ ] Mobile: Add offline banner — detect no network, disable form submissions, show "You're offline"
- [ ] Mobile: Loading skeletons instead of blank screens while data fetches
- [ ] Mobile: Handle WebSocket reconnect — if connection drops, auto-reconnect with exponential backoff
- [ ] API: Add database indexes on `preheat_requests.date`, `preheat_requests.status`, `preheat_requests.pilot_id`
- [ ] API: Query performance audit — no N+1 queries in queue list endpoint
- [ ] API: Health check endpoint `GET /health` for uptime monitoring
- [ ] Edge case: what happens if a pilot submits a request and the queue is at max capacity? → 409 with "Queue is full" message
- [ ] Edge case: two pilots submit simultaneously → queue position assigned without race condition (database transaction + row lock)

**Smoke Test:**

1. Enable Airplane Mode on test device → open app → offline banner appears, submit button is disabled
2. Restore network → offline banner disappears, WebSocket reconnects automatically (within 10s)
3. Navigate all primary screens using VoiceOver — no unlabeled buttons
4. Simulate max queue (seed DB to max) → submit a new request → "Queue is full for today" error message
5. Run `GET /health` → 200 with `{ status: "ok" }` response

**Definition of Done:**

- [ ] Zero unlabeled interactive elements in primary flows
- [ ] Offline state handled gracefully — no crashes or unhandled promise rejections
- [ ] WebSocket auto-reconnects without requiring a manual app restart
- [ ] Race condition for simultaneous queue submissions covered by DB transaction test
- [ ] All database indexes added, slow query log shows no queries > 50ms on the queue endpoint

---

---

## Phase 8 — Launch

---

### Session 018 — Beta Release

**Date:** TBD
**Branch:** `main`
**Status:** ⚠️ Partial — Sentry (API + mobile), EAS build config, Fly.io deploy config, Privacy Policy committed (`32efd1f`, `012dea8`). Outstanding: production Postgres, live API deploy + domain/TLS, uptime monitoring, TestFlight/Play Internal distribution, seeded airport accounts, feedback intake doc.

**Description:**
Deploy backend to production, distribute the mobile app to a small group of beta testers (1–2 airports, 10–20 pilots), and monitor for real-world issues.

**Tasks:**

- [ ] Provision production PostgreSQL database (Railway, Supabase, or AWS RDS)
- [ ] Deploy API to production (Railway / Render / Fly.io) with environment variables set
- [ ] Configure production domain + TLS
- [ ] Set up error monitoring (Sentry) on both API and mobile app
- [ ] Set up uptime monitoring (Better Uptime or UptimeRobot) on `/health`
- [ ] Build mobile app with EAS Build (Expo Application Services)
- [ ] Distribute beta via TestFlight (iOS) and Google Play Internal Testing (Android)
- [ ] Seed one real airport's dispatcher account and 10–20 pilot accounts
- [ ] Document beta feedback intake process (Notion form / Slack channel)

**Smoke Test (Production):**

1. Register as a pilot on the production app → login succeeds
2. Submit a preheat request → assigned to queue position 1
3. Trigger confirmation notification → notification received on physical device
4. Confirm attendance → navigate to Track screen
5. Dispatcher completes the session → pilot receives "aircraft ready" push notification
6. Sentry captures a test error → appears in Sentry dashboard within 60 seconds
7. Kill the API process → UptimeRobot sends a downtime alert within 5 minutes

**Definition of Done:**

- [ ] API deployed and reachable at production URL
- [ ] Mobile app distributed to at least 5 beta testers via TestFlight / Play Internal
- [ ] Sentry and uptime monitoring active
- [ ] At least one full preheat flow completed end-to-end by a real beta user (not a developer)

---

### Session 019 — Public Launch & App Store Submission

**Date:** TBD
**Branch:** `main`
**Status:** ⬜ Incomplete — only Privacy Policy from this task list is in place (`012dea8`). Store assets, submissions, support email, and post-launch monitoring plan all outstanding.

**Description:**
Address beta feedback, submit to the App Store and Google Play, and prepare for public launch.

**Tasks:**

- [ ] Triage and fix critical bugs reported in beta
- [ ] App Store assets: icon, screenshots (all required device sizes), description, keywords
- [ ] Google Play assets: feature graphic, screenshots, store description
- [ ] Privacy Policy page (required by both stores)
- [ ] Submit to Apple App Store review
- [ ] Submit to Google Play production review
- [ ] Set up production support email and basic FAQ
- [ ] Post-launch monitoring plan: daily Sentry check for 2 weeks, weekly usage metric review

**Smoke Test:**

1. Install the production build from the App Store (not TestFlight) on a clean device → full onboarding flow works
2. Check App Store listing screenshots match the actual current UI
3. Privacy Policy URL in app settings opens and renders correctly

**Definition of Done:**

- [ ] App approved and live on both App Store and Google Play
- [ ] Privacy Policy live at a public URL and linked from app settings
- [ ] Support email receiving and responding to first messages
- [ ] Zero P0 bugs open (crash on launch, data loss, broken auth)

---
