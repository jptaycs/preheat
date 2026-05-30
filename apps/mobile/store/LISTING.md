# Store Listing — AeroFluxPro

Draft copy for App Store and Google Play submissions. Cross-check character limits before paste.

## Identity

| Field                         | Value                      |
| ----------------------------- | -------------------------- |
| Display name                  | AeroFluxPro                |
| Bundle ID (iOS)               | `com.preheat.app`          |
| Package (Android)             | `com.preheat.app`          |
| Version                       | 1.0.0                      |
| Primary category              | Travel (alt: Productivity) |
| Secondary category (iOS only) | Utilities                  |
| Age rating                    | 4+ / Everyone              |
| Pricing                       | Free                       |
| In-app purchases              | None                       |
| Ads                           | None                       |

## App Store (iOS)

**Name** (30 char max — 11 used)

```
AeroFluxPro
```

**Subtitle** (30 char max)

```
Aircraft preheat, on schedule
```

**Promotional text** (170 char max — can change without resubmission)

```
Skip the phone-call queue. Reserve your preheat slot, confirm attendance, and watch your aircraft warm up — all from your phone.
```

**Keywords** (100 char max, comma-separated, no spaces after commas)

```
preheat,aviation,pilot,aircraft,FBO,flight,scheduling,queue,airport,GA,Cessna,Piper
```

**Description** (4000 char max)

```
AeroFluxPro coordinates aircraft preheat scheduling for general aviation pilots and the FBOs that serve them. Stop chasing whiteboards, phone calls, and group chats — book a slot, confirm when you arrive, and track your engine temperature in real time.

WHY AEROFLUXPRO
At small airports, a single shared heater serves a dozen pilots on cold mornings. The result: no-shows, wasted slots, frustrated dispatchers, and pilots arriving to find their preheat never happened. AeroFluxPro turns informal coordination into a digital queue with mandatory confirmation, so the slot is always there when you need it — and it gets released to the next pilot if you don't.

KEY FEATURES
• Reserve a preheat slot from your phone — booking opens at 19:00 local the evening before, with automatic 15-min spacing between requests
• Confirm attendance in the 30-to-40-minute window before your slot — no confirmation, no preheat, no line-jumping
• Live temperature tracking — watch your engine warm up in real time
• Push notifications for slot opening, confirmation window, completion, and queue changes
• Multiple aircraft per pilot — register all your tail numbers once
• Works on iOS and Android
• Designed for the way pilots actually operate: dark mode, glanceable, one-thumb friendly

FOR DISPATCHERS / FBOs
A web-based mechanic panel runs the queue from the dispatcher side — start sessions, log temperatures, complete preheats, and reorder when needed. Ask your FBO if they're using AeroFluxPro.

PRIVACY
We collect only what's needed to run the queue: your name, email, license number, and the tail numbers you register. See our Privacy Policy in Settings.

QUESTIONS OR FEEDBACK
Email: support@aerofluxpro.app
```

**What's New in This Version** (4000 char max)

```
Initial release. Welcome to AeroFluxPro 1.0:
• Reserve, confirm, and track preheat slots
• Live engine temperature gauge
• Push notifications for every step of the flow
• Multi-aircraft support
• Dark UI built for cold mornings on the ramp

Found a bug or have a feature request? support@aerofluxpro.app
```

**Support URL** (required)

```
https://aerofluxpro.app/support
```

**Marketing URL** (optional)

```
https://aerofluxpro.app
```

**Privacy Policy URL** (required)

```
https://aerofluxpro.app/privacy
```

_(Currently shipping in-app at apps/mobile/app/privacy. Needs to be hosted at a public URL before submission.)_

## Google Play

**Title** (30 char max)

```
AeroFluxPro
```

**Short description** (80 char max)

```
Reserve, confirm, and track aircraft preheat slots at your airport.
```

**Full description** (4000 char max)

```
AeroFluxPro coordinates aircraft preheat scheduling for general aviation pilots and the FBOs that serve them. Stop chasing whiteboards, phone calls, and group chats — book a slot, confirm when you arrive, and track your engine temperature in real time.

WHY AEROFLUXPRO
At small airports, a single shared heater serves a dozen pilots on cold mornings. The result: no-shows, wasted slots, frustrated dispatchers, and pilots arriving to find their preheat never happened. AeroFluxPro turns informal coordination into a digital queue with mandatory confirmation, so the slot is always there when you need it — and it gets released to the next pilot if you don't.

KEY FEATURES
★ Reserve a preheat slot from your phone — booking opens at 19:00 local the evening before, 15-min spacing
★ Confirm attendance in the 30-to-40-min window before your slot — no confirmation, no preheat
★ Live engine temperature tracking
★ Push notifications for slot opening, confirmation window, completion, and queue changes
★ Multiple aircraft per pilot
★ Dark UI designed for the ramp

FOR DISPATCHERS / FBOs
A web-based mechanic panel runs the queue from the dispatcher side — start sessions, log temperatures, complete preheats, and reorder when needed. Ask your FBO if they're using AeroFluxPro.

PRIVACY
We collect only what's needed to run the queue: name, email, license number, and registered tail numbers. Full Privacy Policy in Settings.

Email: support@aerofluxpro.app
```

## Data Safety / App Privacy

Both stores require declaring what user data the app collects and shares. Defensible answers based on current code:

| Data type             | Collected? | Linked to user? | Optional?          | Purpose                                            |
| --------------------- | ---------- | --------------- | ------------------ | -------------------------------------------------- |
| Name                  | Yes        | Yes             | No                 | Account, queue display (first name only to others) |
| Email                 | Yes        | Yes             | No                 | Account, auth                                      |
| License number        | Yes        | Yes             | No                 | Pilot verification                                 |
| Aircraft tail numbers | Yes        | Yes             | No                 | Queue display                                      |
| Push token            | Yes        | Yes             | Yes (notif toggle) | Push notifications                                 |
| Crash data (Sentry)   | Yes        | No (anonymized) | No                 | Diagnostics                                        |
| Location              | No         | —               | —                  | —                                                  |
| Payment info          | No         | —               | —                  | —                                                  |
| Photos / camera       | No         | —               | —                  | —                                                  |
| Contacts              | No         | —               | —                  | —                                                  |
| Microphone            | No         | —               | —                  | —                                                  |

**Data sharing with third parties:** Sentry (crash diagnostics only, no personal data).
**Encryption in transit:** Yes (HTTPS).
**Data deletion:** Account deletion handled via support email in v1.0 (planned in-app for future release).

## Content Rating

Both stores' content questionnaires — answer "No" to all of:

- Violence
- Sexual content
- Profanity
- Drug / alcohol / tobacco references
- Gambling
- Horror / fear
- Unrestricted web access
- User-generated content visible to other users (queue notes are visible to dispatchers only — flag this if asked)
- Location sharing (we do not share device location; airport context is set per-account)
- Real-money transactions

Expected outcome: 4+ (App Store), Everyone (Google Play).

## Outstanding before submission

- [ ] Replace placeholder icon / splash / adaptive icon with real artwork (see `ASSETS.md`)
- [ ] Capture screenshots on real devices (see `SCREENSHOTS.md`)
- [ ] Stand up `aerofluxpro.app/privacy` and `/support` (or pick a real domain — placeholder above)
- [ ] Apple Developer account + Team ID + ASC App ID
- [ ] Google Play Developer account + service account JSON for upload automation
- [ ] Create a real support email inbox
- [ ] Build production binary with EAS and submit
