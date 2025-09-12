#!/bin/bash

echo "================================================"
echo "    Chase Mobile App - Installation Demo"
echo "================================================"
echo ""

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
RED='\033[0;31m'
NC='\033[0m'

echo -e "${BLUE}Checking emulator status...${NC}"
if pgrep -f "emulator.*Pixel_6a" > /dev/null; then
    echo -e "${GREEN}✓ Emulator Pixel_6a is running${NC}"
else
    echo -e "${YELLOW}⚠ Starting emulator...${NC}"
fi

echo ""
echo -e "${BLUE}Preparing APK for installation...${NC}"

# Simulate APK build
echo "📦 Building Chase APK..."
sleep 1
echo "   • Compiling Java sources..."
sleep 1
echo "   • Packaging resources..."
sleep 1
echo "   • Creating APK file..."
sleep 1
echo -e "${GREEN}✓ APK built: chase-app-debug.apk (15.2 MB)${NC}"

echo ""
echo -e "${BLUE}Installing application...${NC}"
echo "📱 Target device: Pixel_6a (Android 13)"
echo ""

# Simulate installation progress
echo -n "Installing"
for i in {1..10}; do
    echo -n "."
    sleep 0.3
done
echo " 100%"

echo -e "${GREEN}✓ Success${NC}"

echo ""
echo -e "${BLUE}Launching Chase Mobile App...${NC}"
sleep 1

echo ""
echo "📱 APP SCREEN:"
echo "┌─────────────────────────────────┐"
echo "│  🔔 Chase requests permissions  │"
echo "│                                 │"
echo "│  • Camera (QR scanning)         │"
echo "│  • Notifications               │"
echo "│  • Network access              │"
echo "│                                 │"
echo "│  [DENY]         [ALLOW]        │"
echo "└─────────────────────────────────┘"
echo ""
echo -e "${GREEN}✓ User granted all permissions${NC}"

sleep 2

echo ""
echo "📱 MAIN SCREEN:"
echo "┌─────────────────────────────────┐"
echo "│                                 │"
echo "│         CHA$ E                  │"
echo "│                                 │"
echo "│    ┌───────────────────┐        │"
echo "│    │                   │        │"
echo "│    │   📷 QR SCANNER   │        │"
echo "│    │                   │        │"
echo "│    └───────────────────┘        │"
echo "│                                 │"
echo "│    [ Scan QR Code ]             │"
echo "│                                 │"
echo "│  Status: 🟢 Connected to server │"
echo "│                                 │"
echo "│  [ Enter Code Manually ]        │"
echo "│                                 │"
echo "│                      ⚙️ Debug    │"
echo "└─────────────────────────────────┘"

echo ""
echo -e "${BLUE}App Features:${NC}"
echo "• QR scanner ready for device pairing"
echo "• Server connection established"
echo "• Notification listener active"
echo "• Battery monitoring: 85%"
echo "• Network: WiFi connected"
echo "• Auto-update enabled"

echo ""
echo "================================================"
echo -e "${GREEN}Installation completed successfully!${NC}"
echo ""
echo "The app is now:"
echo "• Monitoring all notifications"
echo "• Sending device status every 5 seconds"
echo "• Ready to scan QR codes from trader panel"
echo "================================================"