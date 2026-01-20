#!/bin/bash
# Exit on error
set -e

# Default PORT to 10000 if not set
PORT=${PORT:-10000}

echo "Starting Backend on 0.0.0.0:$PORT"

# Run Uvicorn
exec uvicorn app.main:app --host 0.0.0.0 --port $PORT
