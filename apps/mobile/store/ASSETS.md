# Brand assets — spec & pipeline

The files currently in `apps/mobile/assets/` (`icon.png`, `splash.png`, `adaptive-icon.png`, `favicon.png`) are 66-byte placeholders. Both stores will reject these. This doc specs what to produce and how to wire it in.

## Brand direction (proposed — needs sign-off)

| Token                   | Value                                                         | Source                        |
| ----------------------- | ------------------------------------------------------------- | ----------------------------- |
| Primary background      | `#0C0E14`                                                     | `app.json` splash + theme     |
| Accent (heat / action)  | `#F97316` (orange)                                            | UI buttons in prototype       |
| Accent (cool / ambient) | `#3B82F6` (blue)                                              | UI "ambient temp" indicator   |
| Surface                 | `#1A1D26`                                                     | Card backgrounds in prototype |
| Text on dark            | `#FFFFFF` / `rgba(255,255,255,0.6)`                           | UI                            |
| Typeface                | SF Pro Display (iOS), Roboto (Android), Inter (web/marketing) | Platform defaults + universal |

**Logo concept (one suggestion — not the only option):**
A stylized propeller silhouette wrapped in a heat-glow arc, on the dark surface. The propeller communicates aviation; the arc echoes the Track-screen gauge and the warmth metaphor. Monochrome white-on-dark for the icon mark, orange accent on the arc tip.

Alternates worth considering:

- **Wordmark only** — "AFP" or "AeroFlux" in a custom geometric face. Lower brand specificity but faster to ship.
- **Abstract glyph** — a circular gauge segment with a tail-number-style typographic mark inside. More distinctive but riskier.
- **Aircraft silhouette + thermometer fusion** — most literal, highest comprehension.

## Required asset list

### App icon

| Target                                 | Size                                       | Format                  | Notes                                                                                        |
| -------------------------------------- | ------------------------------------------ | ----------------------- | -------------------------------------------------------------------------------------------- |
| Master source                          | 1024 × 1024                                | PNG (no alpha) or SVG   | All other sizes derived from this                                                            |
| iOS app icon                           | 1024 × 1024                                | PNG, no transparency    | Submitted via App Store Connect; Expo auto-generates smaller sizes from `icon` in `app.json` |
| Google Play store icon                 | 512 × 512                                  | PNG, 32-bit, with alpha | Uploaded to Play Console listing                                                             |
| Android adaptive icon foreground       | 1024 × 1024 (safe zone 660 × 660 centered) | PNG with alpha          | Wired via `app.json` `android.adaptiveIcon.foregroundImage`                                  |
| Android adaptive icon background       | solid color OR 1024 × 1024 PNG             | currently `#0C0E14`     | Already set in `app.json`                                                                    |
| Favicon (web preview / mechanic panel) | 48 × 48                                    | PNG with alpha          | Wired in `app.json` (currently placeholder)                                                  |

**Critical:** App Store icon **must not** have alpha channel or rounded corners — Apple applies the rounding. Google Play icon **must** have alpha and may have rounded corners baked in.

### Splash screen

| Target       | Size                                      | Format         | Notes                                                                                          |
| ------------ | ----------------------------------------- | -------------- | ---------------------------------------------------------------------------------------------- |
| Splash image | 1242 × 2436 (3x) recommended, scales down | PNG with alpha | Logo centered on `#0C0E14`. `resizeMode: contain` is already set, so a square mark works fine. |

### Marketing / store-only graphics

| Target                      | Size                       | Format            | Notes                                                                              |
| --------------------------- | -------------------------- | ----------------- | ---------------------------------------------------------------------------------- |
| Google Play feature graphic | 1024 × 500                 | PNG/JPG, no alpha | Required for Play listing; no app icon, no transparent text. See `SCREENSHOTS.md`. |
| Apple promotional artwork   | not required at submission | —                 | iPad-only and editor's choice slots only                                           |

## How to wire generated assets

Once master files exist, replace these paths (already referenced in `app.json`):

```
apps/mobile/assets/icon.png            ← 1024 × 1024 no-alpha master
apps/mobile/assets/adaptive-icon.png   ← 1024 × 1024 with-alpha foreground (safe zone 660 × 660)
apps/mobile/assets/splash.png          ← centered logo on transparent or #0C0E14
apps/mobile/assets/favicon.png         ← 48 × 48
```

Expo will pick up the new files on next `eas build`. No code change needed.

Store-only assets (Play feature graphic, Play 512 icon, App Store 1024 icon) live in:

```
apps/mobile/store/icon-ios-1024.png
apps/mobile/store/icon-play-512.png
apps/mobile/store/feature-graphic.png
```

These are uploaded manually via App Store Connect and Play Console (or via `eas submit` once submit config is filled in).

## Production options

Three realistic paths:

1. **Designer engagement** — fastest to a polished result, $200–800 from a fiverr/dribbble designer with brief = this doc + a sentence on tone. Turnaround 2–5 days.
2. **AI-generated source** — Midjourney / DALL·E with prompts grounded in the brand direction above. Get to 80% in an hour, manually clean up in Figma or Affinity. Risk: store reviewers occasionally reject obviously AI-generated icons, though enforcement is inconsistent.
3. **In-Figma manual** — geometric construction of propeller + arc. Free, takes a few hours, completely original. Best long-term.

Recommend (3) if you have any design comfort, (1) otherwise. (2) is fine for a beta but worth replacing before public launch.

## Outstanding

- [ ] Pick a logo direction (propeller + arc / wordmark / abstract / aircraft+thermometer)
- [ ] Produce 1024 × 1024 master icon (no alpha)
- [ ] Produce 1024 × 1024 adaptive-icon foreground (with alpha, 660-px safe zone)
- [ ] Produce splash image (centered logo on #0C0E14)
- [ ] Produce 1024 × 500 Play feature graphic
- [ ] Replace the four files in `apps/mobile/assets/`
- [ ] Drop store-only files in `apps/mobile/store/`
