#!/bin/bash
cd "$(dirname "$0")"

echo ""
echo "╔══════════════════════════════════════╗"
echo "║         VRMS - First Time Setup       ║"
echo "╚══════════════════════════════════════╝"
echo ""

# ── Check Node.js ──────────────────────────────────────
if ! command -v node &> /dev/null; then
  echo "❌ Node.js is not installed."
  echo "   Please install it from https://nodejs.org then run this script again."
  read -p "Press Enter to exit..."
  exit 1
fi
echo "✅ Node.js found: $(node -v)"

# ── Check MySQL ─────────────────────────────────────────
MYSQL_PATH=""
for p in /usr/local/mysql/bin/mysql /usr/local/bin/mysql /opt/homebrew/bin/mysql /Applications/MAMP/Library/bin/mysql80/bin/mysql; do
  if [ -f "$p" ]; then MYSQL_PATH="$p"; break; fi
done
if [ -z "$MYSQL_PATH" ]; then
  echo "❌ MySQL is not installed."
  echo "   Please install MySQL or MAMP then run this script again."
  read -p "Press Enter to exit..."
  exit 1
fi
echo "✅ MySQL found: $MYSQL_PATH"

# ── MySQL credentials ───────────────────────────────────
echo ""
echo "Enter your MySQL credentials:"
read -p "   MySQL username (default: root): " DB_USER
DB_USER=${DB_USER:-root}
read -s -p "   MySQL password (press Enter if none): " DB_PASS
echo ""

# ── Test connection ─────────────────────────────────────
"$MYSQL_PATH" -u "$DB_USER" -p"$DB_PASS" -e ";" 2>/dev/null
if [ $? -ne 0 ]; then
  echo "❌ Could not connect to MySQL. Check your username/password."
  read -p "Press Enter to exit..."
  exit 1
fi
echo "✅ MySQL connected"

# ── Create database & import data ───────────────────────
echo ""
echo "⏳ Setting up database..."
"$MYSQL_PATH" -u "$DB_USER" -p"$DB_PASS" -e "CREATE DATABASE IF NOT EXISTS vrms;" 2>/dev/null

DUMP_PATH=""
for p in /usr/local/mysql/bin/mysqldump /usr/local/bin/mysqldump /opt/homebrew/bin/mysqldump /Applications/MAMP/Library/bin/mysql80/bin/mysqldump /usr/local/mysql-8.0.44-macos15-arm64/bin/mysqldump; do
  if [ -f "$p" ]; then DUMP_PATH="$p"; break; fi
done

"$MYSQL_PATH" -u "$DB_USER" -p"$DB_PASS" vrms < vrms_database.sql 2>/dev/null
echo "✅ Database imported"

# ── Create .env ─────────────────────────────────────────
cat > server/.env << EOF
DB_HOST=localhost
DB_USER=$DB_USER
DB_PASSWORD=$DB_PASS
DB_NAME=vrms
PORT=8000
JWT_SECRET=vrms_secret_key_2026
JWT_EXPIRES_IN=7d
CLIENT_URL=http://localhost:3000
EMAIL_USER=vrmscars@gmail.com
EOF
echo "✅ Config file created"

# ── Install dependencies ─────────────────────────────────
echo ""
echo "⏳ Installing server packages (this may take a minute)..."
cd server && npm install --silent 2>/dev/null
echo "✅ Server packages installed"

echo "⏳ Installing client packages (this may take 2-3 minutes)..."
cd ../client && npm install --silent 2>/dev/null
echo "✅ Client packages installed"

cd ..

# ── Mark setup as done ───────────────────────────────────
touch .setup_done

echo ""
echo "╔══════════════════════════════════════╗"
echo "║      ✅ Setup Complete!               ║"
echo "╚══════════════════════════════════════╝"
echo ""
echo "Starting the app now..."
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
