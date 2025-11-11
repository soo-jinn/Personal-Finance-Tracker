#!/usr/bin/env bash
set -e

echo "🚀 Starting Flask backend and Vite frontend..."

# Activate venv
. .venv/bin/activate

# Start Flask backend on 0.0.0.0
# Prefer running flask directly if app is configured, otherwise ensure backend/app.py uses app.run(host='0.0.0.0')
(cd backend && FLASK_APP=app.py flask run --host=0.0.0.0 --port=5000) &
FLASK_PID=$!

# Start frontend (Vite) on 0.0.0.0
cd frontend
# forward the extra argument to npm script if your package.json uses "vite" directly
npm run dev -- --host 0.0.0.0 &
VITE_PID=$!
cd ..

echo "✅ Both servers started (PIDs: $FLASK_PID, $VITE_PID)"

# Forward SIGINT/SIGTERM to children and wait
trap 'echo "Shutting down..."; kill $FLASK_PID $VITE_PID 2>/dev/null || true; wait' SIGINT SIGTERM
wait
