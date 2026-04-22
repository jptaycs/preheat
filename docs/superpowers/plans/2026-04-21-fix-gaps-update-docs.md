# Fix Gaps & Update Docs — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fix type mismatches, broken API calls, unimplemented notification preferences, extract config constants, and update the session log.

**Architecture:** Five independent fixes touching shared types, web-admin API client, API backend (new migration + endpoint + config extraction), mobile profile screen, and the sessions.md doc. Each task is self-contained.

**Tech Stack:** TypeScript, Fastify, PostgreSQL, React Native (Expo), React (Vite)

---

## File Map

| Action | File                                               | Responsibility                                |
| ------ | -------------------------------------------------- | --------------------------------------------- |
| Modify | `packages/shared/src/types/index.ts`               | Add `mechanic` role, fix status enum          |
| Modify | `packages/shared/src/constants/index.ts`           | Update constants to match actual API values   |
| Modify | `apps/web-admin/src/lib/api.ts:217-221`            | Fix cancel endpoint method                    |
| Create | `services/api/src/config/queue.ts`                 | Single source of truth for queue constants    |
| Modify | `services/api/src/routes/preheat-requests.ts:9-13` | Import from config instead of local constants |
| Modify | `services/api/src/jobs/autoCancel.ts`              | Import interval from config                   |
| Modify | `services/api/src/jobs/confirmReminder.ts`         | Import interval from config                   |
| Modify | `services/api/src/db/migrate.ts`                   | Add notification_prefs JSONB column           |
| Modify | `services/api/src/routes/auth.ts:157-177`          | Include notification_prefs in GET /auth/me    |
| Create | `services/api/src/routes/preferences.ts`           | PATCH /users/me/preferences endpoint          |
| Modify | `services/api/src/index.ts`                        | Register preferences route                    |
| Modify | `apps/mobile/src/lib/api.ts`                       | Add preferencesApi methods                    |
| Modify | `apps/mobile/app/(app)/profile.tsx:50-54`          | Load/save prefs from API                      |
| Modify | `sessions.md:9-29`                                 | Update session status table                   |

---

### Task 1: Fix shared types — add mechanic role and align status enum

**Files:**

- Modify: `packages/shared/src/types/index.ts:3,25`
- Modify: `packages/shared/src/constants/index.ts`

The shared types are missing the `mechanic` role and use `done`/`canceled` while the DB uses `completed`/`cancelled`.

- [ ] **Step 1: Fix UserRole to include mechanic**

In `packages/shared/src/types/index.ts`, change line 3 from:

```typescript
export type UserRole = 'pilot' | 'dispatcher' | 'admin'
```

to:

```typescript
export type UserRole = 'pilot' | 'mechanic' | 'dispatcher' | 'admin'
```

- [ ] **Step 2: Fix PreheatRequestStatus to match DB**

In the same file, change line 25 from:

```typescript
export type PreheatRequestStatus = 'waiting' | 'confirmed' | 'active' | 'done' | 'canceled'
```

to:

```typescript
export type PreheatRequestStatus = 'waiting' | 'confirmed' | 'active' | 'completed' | 'cancelled'
```

- [ ] **Step 3: Update PreheatSession interface to match API response**

In the same file, replace the `PreheatSession` interface (lines 50-60) with one that matches what the API actually returns:

```typescript
export interface PreheatSession {
  id: string
  requestId: string
  mechanicId?: string
  currentTempCelsius: number | null
  startedAt: string
  completedAt: string | null
  readings: Array<{
    id: string
    tempCelsius: number
    recordedAt: string
  }>
}
```

- [ ] **Step 4: Update NotificationType to use consistent spelling**

In the same file, change `preheat_done` to `preheat_completed` and `slot_canceled` to `slot_cancelled` in the `NotificationType` union:

```typescript
export type NotificationType =
  | 'confirmation_required'
  | 'schedule_assigned'
  | 'preheat_started'
  | 'preheat_completed'
  | 'queue_changed'
  | 'slot_cancelled'
```

- [ ] **Step 5: Update shared constants to match actual API values**

In `packages/shared/src/constants/index.ts`, update to match the real values used in the API:

```typescript
/** Minutes of preheat duration (avg of 10-25 min OAT range) */
export const PREHEAT_DURATION_MINUTES = 20

/** Minutes of spacing between consecutive engine start times */
export const SLOT_SPACING_MINUTES = 15

/** Minutes before engine start that confirmation window opens */
export const CONFIRM_OPENS_MINUTES = 40

/** Minutes before engine start that confirmation deadline closes */
export const CONFIRM_DEADLINE_MINUTES = 30

/** UTC hour at which booking opens for the next day */
export const BOOKING_OPENS_HOUR_UTC = 19

/** Default target preheat temperature in Celsius */
export const DEFAULT_TARGET_TEMP_CELSIUS = 5

/** Max queue length per day (default) */
export const DEFAULT_MAX_QUEUE_LENGTH = 20

/** Background job polling interval in milliseconds */
export const JOB_INTERVAL_MS = 60_000
```

- [ ] **Step 6: Verify typecheck passes**

Run: `cd /Users/jptaycs/Documents/GitHub/preheat && pnpm typecheck`

Expected: No type errors related to shared types. There may be errors in consumers that referenced the old `done`/`canceled` values — note them for the next step.

- [ ] **Step 7: Fix any consumer references to old status values**

Search the codebase for string literals `'done'` and `'canceled'` (with single `l`) in TypeScript files under `apps/` and `services/`. Replace:

- `'done'` → `'completed'` (only where it refers to PreheatRequestStatus)
- `'canceled'` → `'cancelled'` (only where it refers to PreheatRequestStatus)

Do NOT change the DB migration or API route files — they already use the correct `'completed'`/`'cancelled'` values.

- [ ] **Step 8: Commit**

```bash
git add packages/shared/src/types/index.ts packages/shared/src/constants/index.ts
git commit -m "fix(shared): add mechanic role, align status enum and constants with API"
```

---

### Task 2: Fix web-admin cancel endpoint

**Files:**

- Modify: `apps/web-admin/src/lib/api.ts:217-221`

The web-admin calls `POST /preheat-requests/{id}/cancel` but the API only has `DELETE /preheat-requests/{id}`.

- [ ] **Step 1: Fix the cancel method**

In `apps/web-admin/src/lib/api.ts`, change the `preheatRequestsApi.cancel` method (lines 217-221) from:

```typescript
export const preheatRequestsApi = {
  cancel(requestId: string): Promise<void> {
    return request(`/preheat-requests/${requestId}/cancel`, { method: 'POST' })
  },
}
```

to:

```typescript
export const preheatRequestsApi = {
  cancel(requestId: string): Promise<void> {
    return request(`/preheat-requests/${requestId}`, { method: 'DELETE' })
  },
}
```

- [ ] **Step 2: Verify typecheck**

Run: `cd /Users/jptaycs/Documents/GitHub/preheat/apps/web-admin && npx tsc --noEmit`

Expected: PASS (no type errors)

- [ ] **Step 3: Commit**

```bash
git add apps/web-admin/src/lib/api.ts
git commit -m "fix(web-admin): use DELETE method for cancel endpoint"
```

---

### Task 3: Extract queue config into shared config file

**Files:**

- Create: `services/api/src/config/queue.ts`
- Modify: `services/api/src/routes/preheat-requests.ts:1-14`
- Modify: `services/api/src/jobs/autoCancel.ts:21`
- Modify: `services/api/src/jobs/confirmReminder.ts:9`
- Modify: `apps/web-admin/src/pages/Settings.tsx`

- [ ] **Step 1: Create the config file**

Create `services/api/src/config/queue.ts`:

```typescript
/**
 * Queue configuration — single source of truth for all preheat scheduling constants.
 *
 * To change a value, edit it here. All routes and jobs import from this file.
 */

/** Average preheat duration in minutes (range: 10-25 depending on OAT) */
export const PREHEAT_DURATION_MIN = 20

/** Minimum gap in minutes between consecutive engine start times (Rule #2) */
export const SLOT_SPACING_MIN = 15

/** Confirmation window opens this many minutes before engine start (Rule #3) */
export const CONFIRM_OPENS_MIN = 40

/** Confirmation deadline: must confirm before this many minutes before engine start (Rule #3) */
export const CONFIRM_DEADLINE_MIN = 30

/** UTC hour at which booking opens for the next day (Rule #1) */
export const BOOKING_OPENS_HOUR = 19

/** Background job polling interval in milliseconds */
export const JOB_INTERVAL_MS = 60_000
```

- [ ] **Step 2: Update preheat-requests.ts to import from config**

In `services/api/src/routes/preheat-requests.ts`, replace lines 7-13:

```typescript
// ── Constants ────────────────────────────────────────────────────────────────

const PREHEAT_DURATION_MIN = 20 // avg of 10–25 min OAT range
const SLOT_SPACING_MIN = 15 // min gap between consecutive engine start times (rule #2)
const CONFIRM_OPENS_MIN = 40 // confirmation window opens this many min before engine start
const CONFIRM_DEADLINE_MIN = 30 // confirmation window closes (must confirm BEFORE this point)
const BOOKING_OPENS_HOUR = 19 // local hour at which booking opens for the next day (rule #1)
```

with:

```typescript
import {
  PREHEAT_DURATION_MIN,
  SLOT_SPACING_MIN,
  CONFIRM_OPENS_MIN,
  CONFIRM_DEADLINE_MIN,
  BOOKING_OPENS_HOUR,
} from '../config/queue.js'
```

- [ ] **Step 3: Update autoCancel.ts to import interval from config**

In `services/api/src/jobs/autoCancel.ts`, add import at top:

```typescript
import { JOB_INTERVAL_MS } from '../config/queue.js'
```

Then change line 21 from:

```typescript
const INTERVAL_MS = 60_000 // run every minute
```

to:

```typescript
const INTERVAL_MS = JOB_INTERVAL_MS
```

- [ ] **Step 4: Update confirmReminder.ts to import interval from config**

In `services/api/src/jobs/confirmReminder.ts`, add import at top:

```typescript
import { JOB_INTERVAL_MS } from '../config/queue.js'
```

Then change line 9 from:

```typescript
const INTERVAL_MS = 60_000
```

to:

```typescript
const INTERVAL_MS = JOB_INTERVAL_MS
```

- [ ] **Step 5: Update web-admin Settings.tsx to import from config**

In `apps/web-admin/src/pages/Settings.tsx`, update the notice text (lines 75-81) to reference the config file location:

Replace:

```typescript
        <p style={s.noticeText}>
          Settings management (editable slot duration, operating hours, max queue length) will be
          available in a future session. These values are currently configured in the API source
          code.
        </p>
```

with:

```typescript
        <p style={s.noticeText}>
          These values are configured in <code>services/api/src/config/queue.ts</code>. Editable
          settings via this UI will be available in a future update.
        </p>
```

- [ ] **Step 6: Verify typecheck**

Run: `cd /Users/jptaycs/Documents/GitHub/preheat && pnpm typecheck`

Expected: PASS

- [ ] **Step 7: Commit**

```bash
git add services/api/src/config/queue.ts services/api/src/routes/preheat-requests.ts services/api/src/jobs/autoCancel.ts services/api/src/jobs/confirmReminder.ts apps/web-admin/src/pages/Settings.tsx
git commit -m "refactor(api): extract queue constants into config/queue.ts"
```

---

### Task 4: Add notification preferences persistence

**Files:**

- Modify: `services/api/src/db/migrate.ts`
- Modify: `services/api/src/routes/auth.ts:157-177`
- Create: `services/api/src/routes/preferences.ts`
- Modify: `services/api/src/index.ts` (register the route)
- Modify: `apps/mobile/src/lib/api.ts`
- Modify: `apps/mobile/app/(app)/profile.tsx`

This task adds a `notification_prefs` JSONB column to the `users` table, a `PATCH /users/me/preferences` endpoint, and wires the mobile profile screen to load/save prefs.

- [ ] **Step 1: Add migration for notification_prefs column**

In `services/api/src/db/migrate.ts`, add the following SQL at the end of the `sql` template literal (before the closing backtick):

```sql

  -- Notification preferences (JSONB with defaults)
  ALTER TABLE users ADD COLUMN IF NOT EXISTS notification_prefs JSONB NOT NULL DEFAULT '{"scheduleAlerts":true,"confirmReminder":true,"preheatProgress":true,"queueChanges":false}';
```

- [ ] **Step 2: Update GET /auth/me to include notification_prefs**

In `services/api/src/routes/auth.ts`, update the `/me` endpoint query (around line 167) from:

```typescript
      `SELECT id, name, email, role, license_number AS "licenseNumber", created_at AS "createdAt"
       FROM users WHERE id = $1`,
```

to:

```typescript
      `SELECT id, name, email, role, license_number AS "licenseNumber", notification_prefs AS "notificationPrefs", created_at AS "createdAt"
       FROM users WHERE id = $1`,
```

Also update the query's type parameter to include the new field:

```typescript
    const result = await db.query<{
      id: string
      name: string
      email: string
      role: string
      licenseNumber: string | null
      notificationPrefs: {
        scheduleAlerts: boolean
        confirmReminder: boolean
        preheatProgress: boolean
        queueChanges: boolean
      }
      createdAt: string
    }>(
```

- [ ] **Step 3: Create PATCH /users/me/preferences endpoint**

Create `services/api/src/routes/preferences.ts`:

```typescript
import type { FastifyInstance } from 'fastify'
import { z } from 'zod'
import { db } from '../db/client.js'
import { authenticate } from '../middleware/authenticate.js'

const prefsSchema = z.object({
  scheduleAlerts: z.boolean().optional(),
  confirmReminder: z.boolean().optional(),
  preheatProgress: z.boolean().optional(),
  queueChanges: z.boolean().optional(),
})

// eslint-disable-next-line @typescript-eslint/require-await
export async function preferencesRoutes(app: FastifyInstance) {
  app.addHook('preHandler', authenticate)

  app.patch('/', async (req, reply) => {
    const parsed = prefsSchema.safeParse(req.body)
    if (!parsed.success) {
      return reply.status(400).send({
        statusCode: 400,
        error: 'Bad Request',
        message: parsed.error.errors[0]?.message ?? 'Invalid input',
      })
    }

    // Merge incoming prefs with existing prefs
    const result = await db.query<{ notification_prefs: Record<string, boolean> }>(
      `UPDATE users
       SET notification_prefs = notification_prefs || $1::jsonb,
           updated_at = NOW()
       WHERE id = $2
       RETURNING notification_prefs`,
      [JSON.stringify(parsed.data), req.userId],
    )

    if (result.rows.length === 0) {
      return reply.status(404).send({
        statusCode: 404,
        error: 'Not Found',
        message: 'User not found',
      })
    }

    return reply.send({ notificationPrefs: result.rows[0].notification_prefs })
  })
}
```

- [ ] **Step 4: Register the preferences route in index.ts**

Read `services/api/src/index.ts` to find where routes are registered. Add:

```typescript
import { preferencesRoutes } from './routes/preferences.js'
```

And register it alongside the other routes:

```typescript
app.register(preferencesRoutes, { prefix: '/users/me/preferences' })
```

- [ ] **Step 5: Add preferencesApi to mobile API client**

In `apps/mobile/src/lib/api.ts`, add after the `sessionsApi` object (around line 274):

```typescript
// ── Preferences endpoints ─────────────────────────────────────────────────────

export interface NotificationPrefs {
  scheduleAlerts: boolean
  confirmReminder: boolean
  preheatProgress: boolean
  queueChanges: boolean
}

export const preferencesApi = {
  update(prefs: Partial<NotificationPrefs>) {
    return request<{ notificationPrefs: NotificationPrefs }>('/users/me/preferences', {
      method: 'PATCH',
      body: prefs,
    })
  },
}
```

Also update the `authApi.me()` return type to include `notificationPrefs`:

```typescript
  me() {
    return request<{
      id: string
      name: string
      email: string
      role: string
      licenseNumber: string | null
      notificationPrefs: NotificationPrefs
    }>('/auth/me')
  },
```

- [ ] **Step 6: Wire mobile profile screen to load and save prefs**

In `apps/mobile/app/(app)/profile.tsx`:

1. Add `preferencesApi` to the import from `../../src/lib/api`:

```typescript
import { aircraftApi, preferencesApi, ApiError } from '../../src/lib/api'
import type { AircraftItem, NotificationPrefs } from '../../src/lib/api'
```

2. Replace the four local notification state variables (lines 50-54):

```typescript
// Notification toggles (local UI state)
const [scheduleAlerts, setScheduleAlerts] = useState(true)
const [confirmReminder, setConfirmReminder] = useState(true)
const [preheatProgress, setPreheatProgress] = useState(true)
const [queueChanges, setQueueChanges] = useState(false)
```

with:

```typescript
// Notification preferences (loaded from API)
const [notifPrefs, setNotifPrefs] = useState<NotificationPrefs>({
  scheduleAlerts: true,
  confirmReminder: true,
  preheatProgress: true,
  queueChanges: false,
})
```

3. In the `useFocusEffect` callback, after `fetchAircraft()`, also load prefs from the user object. Update the `useFocusEffect` block to:

```typescript
useFocusEffect(
  useCallback(() => {
    setLoadingAircraft(true)
    void fetchAircraft()
    // Load notification prefs from user context if available
    if (user?.notificationPrefs) {
      setNotifPrefs(user.notificationPrefs)
    }
  }, [fetchAircraft, user?.notificationPrefs]),
)
```

Note: This requires the `user` object from AuthContext to include `notificationPrefs`. If the AuthContext `User` type doesn't include it, add it there too.

4. Add a helper function to update a single pref:

```typescript
async function handleTogglePref(key: keyof NotificationPrefs, value: boolean) {
  const updated = { ...notifPrefs, [key]: value }
  setNotifPrefs(updated)
  try {
    await preferencesApi.update({ [key]: value })
  } catch {
    // Revert on failure
    setNotifPrefs(notifPrefs)
  }
}
```

5. Update all four `<Switch>` components in the notifications section. Replace each `value`/`onValueChange` pair:

For Schedule Alerts:

```typescript
value={notifPrefs.scheduleAlerts}
onValueChange={(v) => void handleTogglePref('scheduleAlerts', v)}
```

For Confirmation Reminder:

```typescript
value={notifPrefs.confirmReminder}
onValueChange={(v) => void handleTogglePref('confirmReminder', v)}
```

For Preheat Progress:

```typescript
value={notifPrefs.preheatProgress}
onValueChange={(v) => void handleTogglePref('preheatProgress', v)}
```

For Queue Changes:

```typescript
value={notifPrefs.queueChanges}
onValueChange={(v) => void handleTogglePref('queueChanges', v)}
```

- [ ] **Step 7: Update AuthContext user type if needed**

Check `apps/mobile/src/context/AuthContext.tsx` for the User type. If it doesn't include `notificationPrefs`, add it to the user type/interface so it's available in `user?.notificationPrefs`.

- [ ] **Step 8: Verify typecheck**

Run: `cd /Users/jptaycs/Documents/GitHub/preheat && pnpm typecheck`

Expected: PASS

- [ ] **Step 9: Commit**

```bash
git add services/api/src/db/migrate.ts services/api/src/routes/auth.ts services/api/src/routes/preferences.ts services/api/src/index.ts apps/mobile/src/lib/api.ts apps/mobile/app/\(app\)/profile.tsx apps/mobile/src/context/AuthContext.tsx
git commit -m "feat: persist notification preferences via API"
```

---

### Task 5: Update sessions.md status table

**Files:**

- Modify: `sessions.md:9-29`

- [ ] **Step 1: Update the session status table**

In `sessions.md`, replace the status table (lines 9-29) with:

```markdown
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
| 016 | End-to-End Testing                                 | 7 — QA & Polish      | ⬜ Incomplete |
| 017 | Accessibility, Performance & Edge Cases            | 7 — QA & Polish      | ⬜ Incomplete |
| 018 | Beta Release                                       | 8 — Launch           | ⬜ Incomplete |
| 019 | Public Launch & App Store Submission               | 8 — Launch           | ⬜ Incomplete |
```

- [ ] **Step 2: Commit**

```bash
git add sessions.md
git commit -m "docs: update sessions.md — mark sessions 003-015 as completed"
```

---
