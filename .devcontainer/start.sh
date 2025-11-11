#!/usr/bin/env bash
set -e

echo "🚀 Starting Flask backend and Vite frontend..."

BACKEND_DIR="finance-tracker/backend"
FRONTEND_DIR="finance-tracker/frontend"

# Activate backend venv
. "$BACKEND_DIR/.venv/bin/activate"

# Start Flask backend
python "$BACKEND_DIR/app.py" &

# Start frontend (Vite)
cd "$FRONTEND_DIR"
npm run dev &
cd ../..

echo "✅ Both servers started!"
