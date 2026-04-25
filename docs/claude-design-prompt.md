# AeroFluxPro — Claude Design Prompt

Copy and paste the prompt below into Claude Design to generate the UI redesign.

---

## Prompt

Design a complete UI for **AeroFluxPro**, an aviation preheat scheduling app used by pilots at small airports and FBOs. The app lets pilots reserve shared aircraft engine preheaters, confirm attendance, and track live heating sessions. Mechanics use it to manage heating jobs. Dispatchers/admins oversee everything from a separate web dashboard (not in scope here).

The pilot + mechanic app is **universal**: it runs as a native mobile app (Android/iOS) and as a web app in the browser from the same codebase (Expo Router + React Native Web). Design for mobile-first, but the layout must also adapt for web (tablet/desktop browser). Dispatchers/admins use a separate Vite web app — out of scope.

### Brand & Visual Direction

- **App name:** AeroFluxPro
- **Vibe:** Premium aviation utility — clean, confident, professional. Think dark cockpit instruments meets modern fintech. Not playful, not corporate — purposeful.
- **Color palette:** Dark theme (charcoal background ~#0C0E14). Primary accent: aviation blue (#3B8EF0). Secondary accent: warm orange (#F5891E) for active/in-progress states. Success green (#2ED47A), danger red (#F05252), warning yellow (#F5C842).
- **Typography:** Modern sans-serif (SF Pro or Inter). Clear hierarchy — large bold headings, medium weight body, light secondary text.
- **Status colors are critical:** Blue = your items / primary actions. Orange = active / in-progress. Green = completed. Red = cancelled / errors. Yellow = pending / warning.
- **Border radius:** Generous (16px cards, 10px pills, full-round avatars and buttons).
- **No emojis as icons.** Use proper SF Symbols / Lucide-style icons.

### User Roles

1. **Pilot** (primary user) — requests preheats, views queue, confirms attendance, tracks sessions, manages aircraft
2. **Mechanic** — views queue, starts/tracks heating sessions, logs temperature readings
3. **Dispatcher/Admin** — web only (out of scope)

### Screens to Design (9 screens)

#### 1. Login Screen

- Email + password fields
- Role toggle: Pilot / Mechanic (segmented control)
- "Sign In" primary button
- "Create Account" link below
- App logo + name at top
- Clean, centered layout with subtle background texture or gradient

#### 2. Register Screen

- Name, email, password, confirm password fields
- Role selector (Pilot / Mechanic)
- License number field (optional, for pilots)
- "Create Account" primary button
- "Already have an account? Sign In" link

#### 3. Dashboard (Home)

- Greeting: "Good morning, [Name]" with contextual icon (sun/moon)
- **If active session exists:** Prominent card showing current preheat status (aircraft tail number, temperature progress bar, time remaining)
- **If confirmation needed:** Urgent alert banner — "Confirm your slot" with countdown timer
- **Quick action buttons:** Request Preheat, View Queue, Track Status (3-column grid)
- **Queue summary:** Small stat cards — Waiting (count), Active (count), Completed (count)
- **Recent activity feed:** Last 3-4 events (request created, slot confirmed, preheat completed)

#### 4. Request Preheat Screen

- Aircraft selector dropdown (shows tail number + type, e.g., "N12345 — Cessna 172")
- Date picker (today, tomorrow, +2 days)
- Engine start time picker (hour:minute with 15-min increments)
- Optional notes text field
- "Submit Request" primary button
- Info callout: "Requests open at 7:00 PM local time for the next day. Your slot will be spaced 15 min after the previous request."

#### 5. Queue Screen

- **Filter chips at top:** All | Upcoming | Active | Completed
- **Date selector:** Today / Tomorrow / Day After (horizontal pill tabs)
- **Queue list:** Each card shows:
  - Queue position number (bold, left side)
  - Tail number + aircraft type
  - Engine start time
  - Status pill (Waiting / Confirmed / Active / Completed / Cancelled)
  - If it's the user's request: highlighted border in blue
  - If in confirmation window: inline "Confirm" button on the card
- **Queue stats bar at bottom:** Total in queue, your position, estimated wait

#### 6. Confirmation Screen

- **Large countdown ring** (circular progress) showing time remaining in the 40→30 min confirmation window
- Urgency indication: green (>5 min), orange (2-5 min), red (<2 min)
- Aircraft details: tail number, engine start time, queue position
- **"Confirm Attendance" large button** (prominent, full-width)
- Warning text: "If you don't confirm within the window, your slot will be automatically cancelled and released to the next pilot."
- If multiple pending confirmations: scrollable list of confirmation cards

#### 7. Track Screen (Live Session)

- **Large circular heat gauge** at center — shows current temperature with animated ring
- Current temp (large number) + target temp (5C)
- Temperature trend: rising/stable indicator
- **Session timeline:** Vertical timeline showing milestones:
  - Request created
  - Slot confirmed
  - Heating started (with time)
  - Temperature readings (plotted points)
  - Target reached / Completed
- **Temperature history:** Mini line chart or reading list (time + temp)
- **For mechanics:** "Add Reading" button + temperature input field, "Complete Session" button

#### 8. Alerts / Notifications Screen

- **Categorized sections:** Urgent (red accent), Today, Earlier
- Each alert card shows:
  - Icon by type (bell for reminders, check for completions, x for cancellations, flame for session started)
  - Title + description
  - Relative timestamp ("5 min ago", "2 hours ago")
  - Read/unread indicator (dot)
- "Mark All as Read" button at top
- Alert types: confirmation reminder, slot cancelled, session started, session completed, queue position changed

#### 9. Profile Screen

- **User avatar** (initials-based, circular) with role badge (Pilot/Mechanic pill)
- Name, email display
- **Stats row:** Aircraft count, Total flights/sessions
- **My Aircraft section:**
  - List of aircraft cards (tail number + type)
  - "Add Aircraft" button
  - Swipe-to-delete or edit icon on each
- **Notification Preferences section:**
  - Toggle switches for: Schedule Alerts, Confirmation Reminder, Preheat Progress, Queue Changes
  - Each with label + description subtitle
- **Sign Out button** at bottom (danger style)

### Navigation

**Mobile (bottom tab bar):**

- 4 tabs: Home, Queue, Alerts, Profile
- Use line icons (not filled) for inactive, filled for active
- Active tab has a small indicator dot below the icon
- Badge count on Alerts tab when unread notifications exist

**Web (sidebar or top nav):**

- Same 4 items, presented as a left sidebar on desktop or a top navigation bar on tablet/narrow browser
- Keep the same icon + label style; no bottom bar on web

### Interaction Notes

- Cards should feel tappable with subtle shadow elevation
- Status transitions should feel smooth (waiting → confirmed → active → completed)
- Confirmation countdown should feel urgent — the ring animates in real-time
- Temperature gauge should feel alive — subtle pulse animation when heating is active
- The queue should clearly distinguish "my requests" from others

### Business Rules to Reflect in UI

- Booking opens at 7:00 PM local time for the next day
- Queue spacing: 15 min between consecutive slots
- Confirmation window: pilot must confirm between 40-30 min before engine start time
- No confirmation = auto-cancel (show this clearly in the UI)
- Preheat takes 10-25 min depending on outside air temperature
- Target engine temperature: 5C

### What I Need

Generate all 9 screens as a cohesive universal app design. This is for client approval before we proceed with frontend implementation, so make it polished and production-ready looking. Show both Pilot and Mechanic views where they differ (especially the Track screen). Use realistic sample data (tail numbers like N12345, N67890; temperatures like -15C → 5C; times like 06:30 AM, 07:15 AM).

For each screen, show:

1. **Mobile layout** (375px — primary view)
2. **Web/desktop layout** (1280px — adapted layout with sidebar nav, wider content area)

The design system (colors, typography, components) must be consistent across both breakpoints.
