#!/bin/bash
# Restart all services

echo "🔄 Restarting Chase services..."
echo ""

# Stop services
/home/user/projects/quattrex/.gpt/stop-services.sh

echo ""
sleep 2

# Start services
/home/user/projects/quattrex/.gpt/start-services.sh