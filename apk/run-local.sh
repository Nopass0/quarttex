#!/bin/bash

# Script to build and run Chase app on local emulator/device

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Get local IP address for the backend
LOCAL_IP=$(hostname -I | awk '{print $1}')
if [ -z "$LOCAL_IP" ]; then
    LOCAL_IP="localhost"
fi

BASE_URL="http://${LOCAL_IP}:3000"

echo -e "${BLUE}Chase Mobile App - Local Development${NC}"
echo "Backend URL: $BASE_URL"
echo ""

# Check if device is connected
echo -e "${YELLOW}Checking for connected devices...${NC}"
DEVICES=$(adb devices | grep -v "List" | grep "device" || true)

if [ -z "$DEVICES" ]; then
    echo -e "${RED}No devices found!${NC}"
    echo ""
    echo "Options:"
    echo "1. Connect a physical device with USB debugging enabled"
    echo "2. Start an emulator with: ./start-emulator.sh"
    exit 1
fi

echo -e "${GREEN}✓ Device found${NC}"
adb devices

# Build the APK
echo ""
echo -e "${YELLOW}Building APK...${NC}"
./build-apk.sh --base-url "$BASE_URL"

# Install the APK
echo ""
echo -e "${YELLOW}Installing APK...${NC}"
adb install -r ../build/apk/chase-app-debug.apk

# Grant permissions
echo ""
echo -e "${YELLOW}Granting permissions...${NC}"
adb shell pm grant com.chase.mobile android.permission.CAMERA || true
adb shell pm grant com.chase.mobile android.permission.POST_NOTIFICATIONS || true
adb shell pm grant com.chase.mobile android.permission.ACCESS_NETWORK_STATE || true
adb shell pm grant com.chase.mobile android.permission.ACCESS_WIFI_STATE || true

# Launch the app
echo ""
echo -e "${YELLOW}Launching app...${NC}"
adb shell am start -n com.chase.mobile/.MainActivity

echo ""
echo -e "${GREEN}✓ App launched successfully!${NC}"
echo ""
echo "Next steps:"
echo "1. Grant notification access when prompted"
echo "2. Scan QR code from trader device page"
echo "3. Monitor logs with: adb logcat | grep -i chase"
echo ""
echo "Backend is expected at: $BASE_URL"
echo "Make sure the backend is running: npm run dev"