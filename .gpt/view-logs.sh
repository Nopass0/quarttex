#!/bin/bash
# View service logs

if [ $# -lt 1 ]; then
    echo "Usage: $0 <service>"
    echo "Services: backend, frontend, all"
    echo "Example: $0 backend"
    exit 1
fi

SERVICE=$1

case $SERVICE in
    backend)
        echo "📋 Backend logs (last 50 lines):"
        echo "================================"
        tail -n 50 /tmp/backend.log
        ;;
    frontend)
        echo "📋 Frontend logs (last 50 lines):"
        echo "================================="
        tail -n 50 /tmp/frontend.log
        ;;
    all)
        echo "📋 Backend logs (last 25 lines):"
        echo "================================"
        tail -n 25 /tmp/backend.log
        echo ""
        echo "📋 Frontend logs (last 25 lines):"
        echo "================================="
        tail -n 25 /tmp/frontend.log
        ;;
    *)
        echo "Unknown service: $SERVICE"
        echo "Available: backend, frontend, all"
        exit 1
        ;;
esac