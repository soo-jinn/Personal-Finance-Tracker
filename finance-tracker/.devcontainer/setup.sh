#!/usr/bin/env bash
set -e

echo "🔧 Setting up environment..."

# Create virtual environment if it doesn't exist
if [ ! -d ".venv" ]; then
  python -m venv .venv
fi

# Use venv Python to install backend dependencies
. .venv/bin/activate
python -m pip install --upgrade pip

if [ -f "backend/requirements.txt" ]; then
  pip install -r backend/requirements.txt
else
  echo "⚠️  requirements.txt not found at backend/"
fi

# Install frontend dependencies
if [ -d "frontend" ]; then
  cd frontend
  npm install
  cd ..
else
  echo "⚠️  frontend folder not found"
fi

echo "✅ Environment setup complete!"
