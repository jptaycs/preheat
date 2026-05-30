# Screenshots — capture plan

Both stores require screenshots at specific resolutions. Capture once at the highest resolution per platform and downscale; both stores accept downscaled versions of the largest required size.

## Required sizes

### App Store (iOS)

Apple requires screenshots for at least one device class. As of 2026, the minimum set is:

| Device class                  | Resolution                 | Min count  | Notes                                 |
| ----------------------------- | -------------------------- | ---------- | ------------------------------------- |
| iPhone 6.9" (15/16 Pro Max)   | 1290 × 2796                | 3 (max 10) | **Capture here, downscale to others** |
| iPhone 6.5" (legacy required) | 1242 × 2688 or 1284 × 2778 | 3 (max 10) | Required if 6.9" not provided         |

iPad is not required (app has `supportsTablet: false`).

### Google Play

| Type              | Resolution                                                | Min count | Notes                     |
| ----------------- | --------------------------------------------------------- | --------- | ------------------------- |
| Phone screenshots | 1080 × 1920 (16:9 portrait) or up to 3840 px on long edge | 2 (max 8) | Required                  |
| Feature graphic   | 1024 × 500 PNG/JPG                                        | 1         | Required, no transparency |
| App icon          | 512 × 512 PNG, 32-bit, with alpha                         | 1         | Required                  |

## Screens to capture (8 total — covers both stores' minimums with one set)

Order in the listing matches the order below — first three are the most important since previews crop to those.

1. **Dashboard with active alert** — primary value prop is "your next preheat at a glance". Show: pilot name, alert banner ("Confirm in 12 min"), today's request card, quick actions.
2. **Queue (Real-time)** — show 5+ entries, "You" highlight on one. Headline overlay: "See your position. Live."
3. **Confirm with countdown ring** — countdown showing ~07:42. Headline overlay: "Confirm or lose your slot."
4. **Track (live temperature gauge)** — gauge at ~72%, current/target/ambient temps visible. Headline overlay: "Watch your engine warm up."
5. **Request Preheat form** — tail number selected, date/time picked, suggested time chips visible. Headline overlay: "Book in 10 seconds."
6. **Profile + aircraft list** — two aircraft registered, notification toggles visible. Headline overlay: "All your tail numbers, one tap."
7. **Push notification preview (iOS lock screen mockup)** — "Your preheat is ready · N4721B". Optional but strong for trust.
8. **Mechanic panel preview (web screenshot in phone frame, or a hand-off shot)** — "Built for FBOs too." Optional.

## How to capture

### Seed the API first

From repo root:

```
pnpm --filter @preheat/api db:migrate
pnpm --filter @preheat/api db:seed:screenshots
```

This populates 6 pilots + 1 mechanic + a 6-entry queue anchored to NOW so every timer is fresh. Re-run any time to reset.

Logins (password `screenshots123` for all):

- `pilot-3@aerofluxpro.local` — the "you" pilot for Dashboard / Queue / Confirm / Request / Profile shots (queue position 3, inside confirmation window)
- `pilot-2@aerofluxpro.local` — has the active heating session for the Track shot (~72% gauge)
- `mechanic@aerofluxpro.local` — web mechanic panel shot

### iOS

1. Build a TestFlight production build (`eas build -p ios --profile production`).
2. Install on iPhone 15/16 Pro Max (or iPhone 6.9" simulator).
3. Run the seed (above), point the build at the local API.
4. For each screen, take screenshot with hardware buttons.
5. Strip status bar / replace with clean 9:41 mockup using a tool like Picsew or Screenshot Framer (optional but improves quality).

### Android

1. Build a preview APK (`eas build -p android --profile preview`).
2. Install on a 1080×1920+ device or emulator (Pixel 7 Pro works).
3. Same seeded scenario.
4. Capture via `adb shell screencap -p /sdcard/screen.png && adb pull /sdcard/screen.png`.

### Headline overlays

Per-screen captions are optional but boost conversion. Use Figma template (TODO: create `store/screenshot-template.fig`) with:

- Bottom 30%: app screenshot
- Top 70%: dark background `#0C0E14`, headline in SF Pro Display Bold 96px, sub-line 56px in 60% white.
- Same template applies to both iOS and Android — only the device frame changes.

## Output

Save final assets to:

```
store/screenshots/ios/01-dashboard.png       (1290 × 2796)
store/screenshots/ios/02-queue.png
...
store/screenshots/android/01-dashboard.png   (1080 × 1920+ or 1284 × 2778 downscaled)
...
store/feature-graphic.png                    (1024 × 500, Android only)
```

## Outstanding

- [x] ~~Build the screenshot seeding script~~ → `services/api/src/db/seed-screenshots.ts` (`pnpm --filter @preheat/api db:seed:screenshots`)
- [ ] Decide whether to ship clean status bars (9:41 / full battery) — most polished apps do
- [ ] Create the headline-overlay Figma template
- [ ] Decide on the feature graphic concept (e.g., cold-morning ramp photo + app screen overlay, or pure-graphic queue illustration)
