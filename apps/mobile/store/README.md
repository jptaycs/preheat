# Store submission kit

Working files for App Store and Google Play submissions. Not built or shipped — referenced manually when submitting.

| File                                 | Purpose                                                                                                                                                      |
| ------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| [`LISTING.md`](./LISTING.md)         | App name, descriptions, keywords, categories, privacy / data-safety answers, content-rating answers. Copy-paste source for App Store Connect + Play Console. |
| [`SCREENSHOTS.md`](./SCREENSHOTS.md) | Required device sizes, screen-by-screen capture plan, headline overlay notes.                                                                                |
| [`ASSETS.md`](./ASSETS.md)           | Icon / splash / feature graphic specs and brand direction.                                                                                                   |

## Status

| Item                                                            | Status                                                |
| --------------------------------------------------------------- | ----------------------------------------------------- |
| Display name set to AeroFluxPro (`app.json`)                    | ✅                                                    |
| Listing copy draft                                              | ✅ (review & sign-off needed)                         |
| Screenshot capture plan                                         | ✅                                                    |
| Brand assets spec                                               | ✅ (logo direction needs sign-off)                    |
| Real icon / splash / adaptive-icon                              | ⬜ (placeholders still in `assets/`)                  |
| Screenshot seed script                                          | ✅ (`pnpm --filter @preheat/api db:seed:screenshots`) |
| Screenshots captured                                            | ⬜                                                    |
| Apple Developer account                                         | ⬜ (not purchased)                                    |
| Google Play Developer account                                   | ⬜ (not purchased)                                    |
| EAS `submit` config (Team ID, ASC App ID, Play service account) | ⬜                                                    |
| `aerofluxpro.app/privacy` + `/support` URLs live                | ⬜                                                    |
| Support email inbox                                             | ⬜                                                    |

## Next moves (no account purchases needed)

1. Review and sign off `LISTING.md` copy — feel free to rewrite voice/tone
2. Pick logo direction from `ASSETS.md`
3. Produce the four asset files and replace placeholders in `apps/mobile/assets/`
4. Decide on a real domain for the privacy / support URLs (or use a Notion/Vercel-hosted page in the interim)

## When you're ready to submit

1. Purchase Apple Developer ($99/yr) and Google Play Developer ($25 one-time)
2. Fill `eas.json` `submit.production.ios` with Team ID + ASC App ID
3. Generate Google Play service account JSON, save as `apps/mobile/google-play-key.json` (gitignore it)
4. Run `eas build -p all --profile production`, then `eas submit -p ios` and `eas submit -p android`
