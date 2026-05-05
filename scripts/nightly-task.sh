#!/usr/bin/env bash
# Nightly Preheat dev session — runs at 3 AM, works until session limit.
# Picks up the next incomplete session from sessions.md and implements it.

set -euo pipefail

REPO="/home/user/preheat"
BRANCH="claude/nifty-allen-kGh8y"
LOG_DIR="$REPO/scripts/logs"
LOG_FILE="$LOG_DIR/nightly-$(date +%Y%m%d-%H%M%S).log"

mkdir -p "$LOG_DIR"

cd "$REPO"

# Ensure we are on the correct development branch
git fetch origin "$BRANCH" 2>/dev/null || true
git checkout "$BRANCH" 2>/dev/null || git checkout -b "$BRANCH" --track "origin/$BRANCH" 2>/dev/null || git checkout -b "$BRANCH"

PROMPT=$(cat <<'PROMPT'
You are working on the Preheat project — a mobile scheduling app for aircraft pilots to manage preheat queues at small airports.

Repository: /home/user/preheat
Development branch: claude/nifty-allen-kGh8y

Instructions:
1. Read sessions.md to find the FIRST session marked ⬜ Incomplete.
2. Read project-docs.md for full context (data model, design system, user flows).
3. Implement all tasks listed under that session. Follow the Definition of Done strictly.
4. After completing each task, commit progress with a clear message and push to origin claude/nifty-allen-kGh8y.
5. Update sessions.md: change the session status from ⬜ Incomplete to ✅ Completed and update the date.
6. If the session is fully complete, move on to the next ⬜ Incomplete session and repeat.
7. Keep working until you reach the session time limit — do not stop early.
8. Never push to main or any branch other than claude/nifty-allen-kGh8y.
PROMPT
)

exec /opt/node22/bin/claude \
  --print \
  --output-format text \
  --max-turns 200 \
  --allowedTools "Bash,Read,Edit,Write,Agent,TodoWrite" \
  "$PROMPT" 2>&1 | tee "$LOG_FILE"
