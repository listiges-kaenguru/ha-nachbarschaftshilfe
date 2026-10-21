#!/usr/bin/env bash
# Browsertest (Einrichtung, Entsperren, Auslösen mit gemocktem Webhook). Braucht Node, Playwright und Chromium (Pfad in $PW)
set -uo pipefail
cd "$(dirname "$0")/.."
PORT="${TEST_PORT:-8091}"
python3 -m http.server "$PORT" --bind 127.0.0.1 >/dev/null 2>&1 & SRV=$!
trap 'kill $SRV 2>/dev/null' EXIT
for _ in $(seq 1 50); do curl -s -o /dev/null "http://localhost:$PORT/" && break; sleep 0.2; done
APP_URL="http://localhost:$PORT/" node tests/browser.mjs
