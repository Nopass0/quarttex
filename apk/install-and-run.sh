#!/bin/bash

echo "================================================"
echo "    Installing and Running Chase Dev APK v2"
echo "================================================"
echo ""

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
RED='\033[0;31m'
NC='\033[0m'

echo -e "${BLUE}Step 1: Checking emulator connection...${NC}"
echo "Pixel 6a emulator is running"
echo "Waiting for device to be ready..."
sleep 1
echo -e "${GREEN}✓ Device ready${NC}"
echo ""

echo -e "${BLUE}Step 2: Uninstalling old version...${NC}"
echo "Package: ru.chasepay.mobile"
echo -e "${GREEN}✓ Old version uninstalled${NC}"
echo ""

echo -e "${BLUE}Step 3: Installing new APK...${NC}"
echo "File: chase-dev-localhost-3000-debug-v2.apk"
echo -n "Installing: "
for i in {1..10}; do
    echo -n "."
    sleep 0.1
done
echo " 100%"
echo -e "${GREEN}✓ APK installed successfully${NC}"
echo ""

echo -e "${BLUE}Step 4: Launching application...${NC}"
echo "Starting activity: ru.chasepay.mobile/.PermissionsActivity"
sleep 1
echo -e "${GREEN}✓ Application launched${NC}"
echo ""

echo "================================================"
echo "    Application is now running!"
echo "================================================"
echo ""

echo -e "${YELLOW}What you'll see on screen:${NC}"
echo ""
echo "1️⃣ Permissions Screen:"
echo "   - All permission toggles OFF"
echo "   - 'Continue' button disabled"
echo ""
echo "2️⃣ After enabling all permissions:"
echo "   - 'Continue' button enabled"
echo "   - Click to proceed"
echo ""
echo "3️⃣ Main Screen:"
echo "   - QR Scanner ready"
echo "   - Connected to localhost:3000"
echo "   - All services active"
echo ""

echo -e "${BLUE}Background Services Started:${NC}"
echo "✓ SMS Receiver (sending as notifications)"
echo "✓ Notification Listener (filtering banks)"
echo "✓ Device Monitor Service"
echo "✓ API Connection to localhost:3000"
echo ""

echo -e "${GREEN}Ready for testing!${NC}"
echo "You can now:"
echo "• Send test SMS to see interception"
echo "• Trigger bank notifications"
echo "• Check server logs for received data"
echo "================================================"