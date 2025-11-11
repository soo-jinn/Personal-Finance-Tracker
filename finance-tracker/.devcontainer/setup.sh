#!/usr/bin/env bash
set -e

echo "🔧 Setting up environment..."

BACKEND_DIR="finance-tracker/backend"

# Create virtual environment inside backend folder
if [ ! -d "$BACKEND_DIR/.venv" ]; then
  python -m venv "$BACKEND_DIR/.venv"
fi

# Activate venv and install backend dependencies
. "$BACKEND_DIR/.venv/bin/activate"
python -m pip install --upgrade pip

if [ -f "$BACKEND_DIR/requirements.txt" ]; then
  pip install -r "$BACKEND_DIR/requirements.txt"
else
  echo "⚠️  requirements.txt not found at $BACKEND_DIR/"
fi

# Install frontend dependencies
FRONTEND_DIR="finance-tracker/frontend"
if [ -d "$FRONTEND_DIR" ]; then
  cd "$FRONTEND_DIR"
  npm install
  cd ../..
else
  echo "⚠️  frontend folder not found"
fi

echo "✅ Environment setup complete!"
