#!/usr/bin/env bash
# Single-emulator test rig: boots one Android AVD, seeds the screenshot scenario,
# installs the dev APK. Pair with the web admin (pnpm --filter web-admin dev) in a
# browser for the mechanic side.
#
# Prereqs (one-time):
#   - At least one AVD created in Android Studio
#   - Postgres running (`brew services start postgresql@16`)
#   - API + Metro running in another terminal (`pnpm dev`)
#
# Usage:
#   scripts/test-android.sh                # interactive: lists AVDs, asks which
#   scripts/test-android.sh Pixel_9        # non-interactive
#   scripts/test-android.sh --no-seed Pixel_9

set -euo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
SEED=1

if [[ "${1:-}" == "--no-seed" ]]; then
  SEED=0
  shift
fi

# --- sanity checks -----------------------------------------------------------
command -v adb >/dev/null      || { echo "❌ adb not in PATH — install Android platform-tools or run Android Studio once." >&2; exit 1; }
command -v emulator >/dev/null || { echo "❌ emulator not in PATH — add \$ANDROID_HOME/emulator to PATH." >&2; exit 1; }

# --- pick AVD ----------------------------------------------------------------
AVDS=()
while IFS= read -r line; do
  [[ -n "$line" ]] && AVDS+=("$line")
done < <(emulator -list-avds)

if [[ ${#AVDS[@]} -lt 1 ]]; then
  echo "❌ No AVDs found. Open Android Studio → Device Manager → Create Device." >&2
  exit 1
fi

if [[ $# -ge 1 ]]; then
  AVD="$1"
else
  echo "Available AVDs:"
  for i in "${!AVDS[@]}"; do printf "  [%d] %s\n" "$i" "${AVDS[$i]}"; done
  read -rp "Emulator # [0]: " idx; idx="${idx:-0}"
  AVD="${AVDS[$idx]}"
fi

echo "📱 Emulator: $AVD"

# --- find the running serial for this AVD (boot is your job — launch from Android Studio) ---
serial_of() {
  local target="$1"
  for serial in $(adb devices | awk '/emulator-/ {print $1}'); do
    local name
    name="$(adb -s "$serial" emu avd name 2>/dev/null | head -1 | tr -d '\r' || true)"
    [[ "$name" == "$target" ]] && { echo "$serial"; return 0; }
  done
  return 1
}

SERIAL="$(serial_of "$AVD" || true)"
if [[ -z "${SERIAL:-}" ]]; then
  echo "❌ $AVD is not running. Open Android Studio → Device Manager → ▶ Play on $AVD, then re-run this script." >&2
  exit 1
fi

# --- confirm boot completed --------------------------------------------------
booted="$(adb -s "$SERIAL" shell getprop sys.boot_completed 2>/dev/null | tr -d '\r' || true)"
if [[ "$booted" != "1" ]]; then
  echo "⏳ $AVD is still booting — waiting up to 90s..."
  deadline=$(( $(date +%s) + 90 ))
  while :; do
    booted="$(adb -s "$SERIAL" shell getprop sys.boot_completed 2>/dev/null | tr -d '\r' || true)"
    [[ "$booted" == "1" ]] && break
    (( $(date +%s) > deadline )) && { echo "❌ Timed out waiting for boot." >&2; exit 1; }
    sleep 3
  done
fi
echo "✅ $AVD booted ($SERIAL)"

# --- seed screenshot data ----------------------------------------------------
if [[ $SEED -eq 1 ]]; then
  echo "🌱 Seeding screenshot data..."
  (cd "$REPO_ROOT" && pnpm --filter @preheat/api db:seed:screenshots) || \
    echo "⚠️  Seed failed — is Postgres running and the API .env present?"
else
  echo "⏭️  Skipping seed (--no-seed)"
fi

# --- install dev APK ---------------------------------------------------------
echo "📦 Installing dev build to $AVD ($SERIAL)..."
(cd "$REPO_ROOT/apps/mobile" && ANDROID_SERIAL="$SERIAL" pnpm exec expo run:android --no-bundler)

cat <<EOF

═══════════════════════════════════════════════════════════════
✅ Mobile pilot rig ready on $AVD ($SERIAL)

  Pilot side  → emulator    tap "DEV SHORTCUTS → Pilot"
  Mechanic    → web browser → http://localhost:5173

  Make sure these are running (in other terminals):
    pnpm --filter mobile dev          # Metro bundler
    pnpm --filter @preheat/api dev    # API + WebSocket
    pnpm --filter web-admin dev       # Mechanic web panel

  Re-seed any time:
    pnpm --filter @preheat/api db:seed:screenshots
═══════════════════════════════════════════════════════════════
EOF
