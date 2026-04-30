#!/bin/bash
cd "$(dirname "$0")"

# ── Check setup was done ─────────────────────────────────
if [ ! -f ".setup_done" ]; then
  echo "⚠️  Please run SETUP.command first!"
  read -p "Press Enter to exit..."
  exit 1
fi

echo ""
echo "╔══════════════════════════════════════╗"
echo "║          Starting VRMS App            ║"
echo "╚══════════════════════════════════════╝"
echo ""

# ── Start backend ────────────────────────────────────────
osascript -e 'tell application "Terminal"
  do script "cd \"'"$(pwd)"'\"; node server/index.js"
end tell'

# ── Start frontend ───────────────────────────────────────
sleep 2
osascript -e 'tell application "Terminal"
  do script "cd \"'"$(pwd)"'/client\"; npm start"
end tell'

echo "⏳ Opening browser in 10 seconds..."
sleep 10
open http://localhost:3000

echo ""
echo "🚀 VRMS is running at http://localhost:3000"
echo "   You can close this window."
echo ""
read -p "Press Enter to exit..."
