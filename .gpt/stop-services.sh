#!/bin/bash
# Stop all running services

echo "🛑 Stopping Chase services..."

# Stop backend
if [ -f /tmp/backend.pid ]; then
    BACKEND_PID=$(cat /tmp/backend.pid)
    if ps -p $BACKEND_PID > /dev/null; then
        kill $BACKEND_PID
        echo "✓ Backend stopped (PID: $BACKEND_PID)"
    else
        echo "⚠ Backend was not running"
    fi
    rm -f /tmp/backend.pid
else
    echo "⚠ No backend PID file found"
fi

# Stop frontend
if [ -f /tmp/frontend.pid ]; then
    FRONTEND_PID=$(cat /tmp/frontend.pid)
    if ps -p $FRONTEND_PID > /dev/null; then
        kill $FRONTEND_PID
        echo "✓ Frontend stopped (PID: $FRONTEND_PID)"
    else
        echo "⚠ Frontend was not running"
    fi
    rm -f /tmp/frontend.pid
else
    echo "⚠ No frontend PID file found"
fi

# Kill any remaining processes on ports
echo "Cleaning up ports..."
lsof -ti:3000 | xargs kill -9 2>/dev/null || true
lsof -ti:3001 | xargs kill -9 2>/dev/null || true

echo "✅ All services stopped"