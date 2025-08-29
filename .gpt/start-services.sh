#!/bin/bash
# Start all services in background

echo "🚀 Starting Chase services..."

# Start backend
echo "Starting backend..."
cd /home/user/projects/quattrex/backend
nohup bun dev > /tmp/backend.log 2>&1 &
BACKEND_PID=$!
echo $BACKEND_PID > /tmp/backend.pid
echo "✓ Backend started (PID: $BACKEND_PID)"

# Wait for backend to be ready
echo "Waiting for backend to be ready..."
for i in {1..30}; do
    if curl -s http://localhost:3000/api/health > /dev/null; then
        echo "✓ Backend is ready"
        break
    fi
    sleep 1
done

# Start frontend
echo "Starting frontend..."
cd /home/user/projects/quattrex/frontend
nohup npm run dev > /tmp/frontend.log 2>&1 &
FRONTEND_PID=$!
echo $FRONTEND_PID > /tmp/frontend.pid
echo "✓ Frontend started (PID: $FRONTEND_PID)"

# Wait for frontend to be ready
echo "Waiting for frontend to be ready..."
for i in {1..30}; do
    if curl -s http://localhost:3001 > /dev/null 2>&1; then
        echo "✓ Frontend is ready"
        break
    fi
    sleep 1
done

echo ""
echo "✅ All services started successfully!"
echo "   Backend: http://localhost:3000"
echo "   Frontend: http://localhost:3001"