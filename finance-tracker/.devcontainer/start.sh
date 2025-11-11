#!/usr/bin/env bash
set -e

echo "🚀 Starting Flask backend and Vite frontend..."

# Activate venv
. .venv/bin/activate

# Start Flask backend
python finance-tracker/backend/app.py &

# Start frontend (Vite)
cd finance-tracker/frontend
npm run dev &
cd ../..

echo "✅ Both servers started!"
