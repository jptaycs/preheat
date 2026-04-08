# Preheat — Project Documentation

**Version:** 0.1.0 (Prototype)
**Last Updated:** 2026-04-07

---

## 1. Overview

**Preheat** is a mobile scheduling app for aircraft pilots at small airports and flight schools. It solves a real operational problem: on cold days, multiple pilots need their aircraft preheated before departure, but only one heater unit is available. Today this is managed via phone calls, whiteboards, or informal agreements — all error-prone.

Preheat replaces that with a digital queue system. Pilots submit a request from their phone, get a slot assigned automatically, receive a confirmation prompt 30 minutes before departure, and can track their preheat live.

---

## 2. Problem Statement

### Context

In cold climates (Canada, northern US, Scandinavia, etc.), aircraft engines and avionics must be preheated before starting. A shared electric or propane preheat unit is typically available at FBOs and flight schools. Demand peaks in the early morning when multiple pilots have scheduled flights.

### Current Pain Points

- Pilots don't know their position in the queue without calling the front desk
- Pilots who show up late waste time already allocated to them, blocking everyone behind
- No-shows are common — preheat units sit idle while other pilots wait
- Dispatchers/FBO staff spend significant time on phone coordination

### How Preheat Solves This

- Pilots self-register for a queue slot via the app
- System assigns a preheat start time based on queue position and departure time
- A mandatory attendance confirmation (30-min window) catches no-shows before they waste a slot
- Canceled slots immediately advance the next pilot's position
- Live tracking lets pilots know exactly when their aircraft will be ready

---

## 3. Users & Roles

### Pilot (Primary User)

The aircraft owner or renter who needs their plane preheated.

**Core tasks:**

- Submit a preheat request (tail number, departure time, date)
- View their queue position
- Confirm attendance when prompted
- Track live preheat progress
- Receive alerts and schedule changes

### Dispatcher / FBO Staff (Admin User)

The ground crew member or front desk coordinator who manages the preheat equipment.

**Core tasks:**

- View the full daily queue
- Start/stop preheat for specific aircraft
- Override queue order when needed
- Cancel or reassign slots
- Monitor heater unit availability

> **Note:** The Dispatcher view is not yet prototyped. It is planned as a web-based admin panel.

---

## 4. Core Concepts

### Queue

An ordered list of preheat requests for a given day. Each entry represents one aircraft and one pilot.

- Queue positions are numbered (#1, #2, #3…)
- Status transitions: `Waiting → Active (Heating) → Done`
- Cancellations auto-advance subsequent positions

### Preheat Slot

A time window assigned by the system for a specific aircraft's preheat. Calculated based on:

- The pilot's requested departure time
- Current queue load (how many aircraft are ahead)
- Estimated preheat duration (varies by aircraft type and ambient temperature)

### Confirmation Window

When a preheat slot is 30 minutes from starting (or departure is 30 minutes away), the pilot receives an alert and must confirm they are on their way. If they do not confirm within the window, their slot is canceled and released.

### Heat Progress

Once preheat begins, progress is tracked as a percentage (0–100%). Temperature metrics:

- **Ambient:** Current outside air temperature
- **Current:** Aircraft engine/cabin current temperature
- **Target:** Minimum temperature required for safe startup (typically +5°C for most GA aircraft)

---

## 5. User Flows

### 5.1 Submit Preheat Request

```
Pilot opens app
  → Dashboard shows "Request Preheat" quick action
  → Taps Request
    → Fills in: Aircraft Tail Number, Departure Date, Desired Flight Time, Notes (optional)
    → System suggests optimal preheat start times (chip selector)
    → Pilot submits
      → Confirmation card shown with assigned time and queue position
      → Pilot placed in queue
```

### 5.2 Confirmation Flow

```
30 minutes before departure:
  → Push notification sent: "Confirm Your Attendance — N4721B"
  → Pilot opens app → routed to Confirm screen
    → Sees countdown timer (30-minute window)
    → Sees flight summary (preheat time, departure time, queue position)

  Option A: Pilot confirms
    → "I'm Arriving — Confirm" tapped
    → Routed to Track screen
    → Preheat proceeds

  Option B: Pilot cancels
    → "Cancel My Preheat Request" tapped
    → Slot released
    → Next aircraft in queue advanced
    → All affected pilots notified of position change

  Option C: No response
    → Confirmation window expires
    → System auto-cancels slot
    → Queue advances automatically
```

### 5.3 Live Tracking

```
After confirmation:
  → Track screen shows heat gauge (animated percentage)
  → Temperature readout: Current / Target / Ambient
  → ETA for preheat completion
  → Timeline: Request Submitted → Confirmed → Heating Started → Complete → Departure
```

---

## 6. Screen Inventory

| Screen          | ID            | Description                                                  |
| --------------- | ------------- | ------------------------------------------------------------ |
| Splash          | `s-splash`    | App launch, branding, "Get Started" CTA                      |
| Login           | `s-login`     | Email + password login, biometric option                     |
| Dashboard       | `s-dashboard` | Home with active flight card, quick actions, recent activity |
| Request Preheat | `s-request`   | Multi-field form + suggested time chips                      |
| Queue           | `s-queue`     | Full daily queue with status indicators and filters          |
| Confirm         | `s-confirm`   | Attendance confirmation with countdown ring                  |
| Track           | `s-track`     | Live preheat gauge, temperature, ETA, timeline               |
| Notifications   | `s-notifs`    | Urgent + chronological notification feed                     |
| Profile         | `s-profile`   | Account info, notification preferences, settings             |

---

## 7. Data Model (Draft)

### User

```
id          UUID
name        String
email       String
role        Enum (pilot | dispatcher | admin)
license_no  String
aircraft    Aircraft[]  (owned/rented)
created_at  DateTime
```

### Aircraft

```
id          UUID
tail_number String (e.g. "N4721B")
type        String (e.g. "Cessna 172")
owner_id    UUID → User
```

### PreheatRequest

```
id              UUID
pilot_id        UUID → User
aircraft_id     UUID → Aircraft
date            Date
requested_time  Time
assigned_time   Time
queue_position  Int
status          Enum (waiting | confirmed | active | done | canceled)
notes           String?
delay_minutes   Int  (0 if on time)
created_at      DateTime
updated_at      DateTime
```

### PreheatSession

```
id              UUID
request_id      UUID → PreheatRequest
started_at      DateTime
completed_at    DateTime?
ambient_temp    Float  (°C)
start_temp      Float  (°C)
target_temp     Float  (°C)
current_temp    Float  (°C)  — updated via hardware/sensor
progress_pct    Int    (0–100)
```

### Notification

```
id          UUID
user_id     UUID → User
type        Enum (confirmation_required | schedule_assigned | preheat_started | preheat_done | queue_changed | canceled)
message     String
read        Boolean
created_at  DateTime
```

---

## 8. Design System

### Color Palette

| Token      | Hex       | Usage                                  |
| ---------- | --------- | -------------------------------------- |
| `--bg`     | `#0C0E14` | App background                         |
| `--s1`     | `#141720` | Surface 1 (cards, nav)                 |
| `--s2`     | `#1C2030` | Surface 2 (inputs, secondary cards)    |
| `--blue`   | `#3B8EF0` | Primary action, current user highlight |
| `--orange` | `#F5891E` | Active/heating state, warnings         |
| `--green`  | `#2ED47A` | Success, completed state               |
| `--red`    | `#F05252` | Danger, urgent, cancel                 |
| `--yellow` | `#F5C842` | Caution, delay indicator               |
| `--text`   | `#EEF0F6` | Primary text                           |
| `--t2`     | `#8B93A8` | Secondary text                         |
| `--t3`     | `#555E78` | Tertiary / label text                  |

### Typography

- Font: Inter, Segoe UI, system-ui (sans-serif fallback chain)
- Weight range: 500 (medium) → 900 (black) used for hierarchy

### Components

- **Pill** — inline status badge (colored dot + uppercase label)
- **Badge** — small inline badge (no dot)
- **Alert** — full-width contextual message block (info / warning / error / success)
- **Card** — surface container with border and radius
- **Queue Item (qi)** — specialized card for queue entries
- **Stat Box (sbox)** — compact metric display
- **Chip** — filter tab / time suggestion selector
- **Toggle** — settings on/off toggle
- **Countdown Ring** — SVG circle timer for confirmation screen
- **Heat Gauge** — SVG arc gauge for temperature progress
- **Timeline** — vertical step tracker

---

## 9. MVP Scope

### In Scope (v1.0)

- [x] Pilot authentication (email/password)
- [x] Submit preheat request
- [x] View queue position
- [x] Receive and action confirmation prompt
- [x] Live preheat tracking
- [x] Push notifications (schedule, confirmation, progress)
- [x] Pilot profile and notification preferences

### Out of Scope (v1.0, planned for v1.x)

- [ ] Dispatcher / Admin web panel
- [ ] Hardware integration (temperature sensor API)
- [ ] Multi-heater unit support (airports with 2+ units)
- [ ] Recurring/scheduled requests (recurring early morning flights)
- [ ] In-app payment for preheat service fee
- [ ] Weather-based preheat duration estimation
- [ ] Fleet management for flight schools

---

## 10. Open Questions

| #   | Question                                                                   | Owner                  | Status |
| --- | -------------------------------------------------------------------------- | ---------------------- | ------ |
| 1   | Is "preheat" engine-only, cabin-only, or both?                             | Product                | Open   |
| 2   | Who operates the heater — pilot self-service or FBO staff?                 | Product                | Open   |
| 3   | What is the queue priority algorithm? FIFO vs. departure-time-based?       | Engineering            | Open   |
| 4   | Does preheat duration vary by aircraft type? If so, how is this estimated? | Product / Aviation SME | Open   |
| 5   | Do we need a hardware API to read temperature sensor data?                 | Engineering            | Open   |
| 6   | What regulations (if any) govern preheat documentation requirements?       | Legal / Aviation SME   | Open   |
| 7   | Single airport first or multi-location from day one?                       | Product                | Open   |
| 8   | Should pilots be able to see other pilots' names in the queue?             | Privacy / Product      | Open   |

---

## 11. References

- Prototype: `preheat-pilot-app.html`
- Session log: `sessions.md`
- Setup guide: `setup.md`
