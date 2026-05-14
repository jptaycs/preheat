# Preheat — Local Development Setup

## Prerequisites

- Node.js >= 20
- pnpm >= 9 (`npm install -g pnpm`)
- PostgreSQL 16 (`brew install postgresql@16`)
- Android Studio with an emulator configured (e.g. Pixel 9)
- Android NDK 27.1.12297006 (install via Android Studio → SDK Manager → SDK Tools → NDK Side by side)

---

## 1. Install dependencies

```bash
pnpm install
```

---

## 2. API server

### Create environment file

```bash
cp services/api/.env.example services/api/.env
```

### Start PostgreSQL

```bash
brew services start postgresql@16
```

### Create the database and user

```bash
/opt/homebrew/opt/postgresql@16/bin/createdb preheat_dev
/opt/homebrew/opt/postgresql@16/bin/psql postgres -c "CREATE USER preheat WITH PASSWORD 'preheat';"
/opt/homebrew/opt/postgresql@16/bin/psql postgres -c "GRANT ALL PRIVILEGES ON DATABASE preheat_dev TO preheat;"
```

> Skip `createdb` if the database already exists.

### Run migrations and seed

```bash
cd services/api
pnpm db:migrate
pnpm db:seed
```

This creates two dev accounts:

- `dev-pilot@preheat.local` / `devpilot123`
- `dev-mechanic@preheat.local` / `devmechanic123`

### Start the API

```bash
pnpm dev
# API runs at http://localhost:4000
```

---

## 3. Mobile app (Android emulator)

### Create environment file

```bash
cp apps/mobile/.env.example apps/mobile/.env
```

The `.env` must use `10.0.2.2` instead of `localhost` so the Android emulator can reach the host machine:

```
EXPO_PUBLIC_API_URL=http://10.0.2.2:4000
EXPO_PUBLIC_USE_MOCK=false
```

### Run on Android emulator

Make sure the API server is running first, then in a separate terminal:

```bash
cd apps/mobile
pnpm android
```

This builds the APK, installs it on the emulator, and starts Metro bundler.

### Dev login shortcuts

On the login screen, tap **Pilot** or **Mechanic** under "DEV SHORTCUTS" to log in instantly without entering credentials.

---

## Running everything at once

```bash
pnpm dev
```

Starts all services in parallel via Turborepo.

---

## Troubleshooting

### NDK error: `source.properties file not found`

The NDK installation is corrupt. Reinstall it:

```bash
rm -rf ~/Library/Android/sdk/ndk/27.1.12297006
~/Library/Android/sdk/cmdline-tools/latest/bin/sdkmanager "ndk;27.1.12297006"
```

### App crashes immediately on Android (`ClassNotFoundException`)

The `AndroidManifest.xml` must reference fully qualified class names, not the shorthand `.MainApplication`. Verify:

```xml
android:name="com.preheat.app.MainApplication"
android:name="com.preheat.app.MainActivity"
```

### "Failed to load data" in the app

Ensure `apps/mobile/.env` has `EXPO_PUBLIC_API_URL=http://10.0.2.2:4000`, not `localhost`. Android emulators cannot reach the host via `localhost`.

### `DATABASE_URL environment variable is required`

The `services/api/.env` file is missing. Run:

```bash
cp services/api/.env.example services/api/.env
```
