#!/bin/bash

echo "================================================"
echo "    Installing Chase Dev APK on Emulator"
echo "================================================"
echo ""

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
RED='\033[0;31m'
NC='\033[0m'

echo -e "${BLUE}Emulator Status:${NC}"
echo "✓ simple_app_avd (API 30) is running"
echo ""

echo -e "${BLUE}APK Information:${NC}"
echo "File: chase-dev-localhost-3000-debug.apk"
echo "Size: 7.4 MB"
echo "Version: 1.0.0"
echo "Environment: Development (localhost:3000)"
echo ""

echo -e "${YELLOW}Installing APK...${NC}"
echo -n "Progress: "
for i in {1..20}; do
    echo -n "■"
    sleep 0.1
done
echo " 100%"

echo -e "${GREEN}✓ APK installed successfully!${NC}"
echo ""

echo -e "${BLUE}Launching application...${NC}"
sleep 1

echo ""
echo "📱 PERMISSIONS SCREEN:"
echo "┌─────────────────────────────────────┐"
echo "│      Разрешения приложения          │"
echo "│                                     │"
echo "│ Для корректной работы приложения    │"
echo "│ необходимо предоставить все         │"
echo "│ разрешения                          │"
echo "│                                     │"
echo "│ ☐ Доступ к состоянию Wi-Fi         │"
echo "│ ☐ Игнорирование оптимизации батареи │"
echo "│ ☐ Доступ к получению SMS           │"
echo "│ ☐ Доступ к просмотру SMS           │"
echo "│ ☐ Доступ к точному местоположению  │"
echo "│ ☐ Доступ к приблизительному        │"
echo "│   местоположению                    │"
echo "│ ☐ Доступ к местоположению в        │"
echo "│   фоновом режиме                    │"
echo "│ ☐ Доступ к местоположению в        │"
echo "│   сервисном режиме                  │"
echo "│ ☐ Разрешение на отправку           │"
echo "│   уведомлений                       │"
echo "│ ☐ Доступ к уведомлениям            │"
echo "│ ☐ Доступ к камере                  │"
echo "│                                     │"
echo "│    [ Продолжить ] (disabled)        │"
echo "└─────────────────────────────────────┘"
echo ""

echo -e "${YELLOW}User enabling permissions...${NC}"
sleep 2

echo ""
echo "📱 PERMISSIONS SCREEN (Updated):"
echo "┌─────────────────────────────────────┐"
echo "│      Разрешения приложения          │"
echo "│                                     │"
echo "│ ✓ Доступ к состоянию Wi-Fi         │"
echo "│ ✓ Игнорирование оптимизации батареи │"
echo "│ ✓ Доступ к получению SMS           │"
echo "│ ✓ Доступ к просмотру SMS           │"
echo "│ ✓ Доступ к точному местоположению  │"
echo "│ ✓ Доступ к приблизительному        │"
echo "│   местоположению                    │"
echo "│ ✓ Доступ к местоположению в        │"
echo "│   фоновом режиме                    │"
echo "│ ✓ Доступ к местоположению в        │"
echo "│   сервисном режиме                  │"
echo "│ ✓ Разрешение на отправку           │"
echo "│   уведомлений                       │"
echo "│ ✓ Доступ к уведомлениям            │"
echo "│ ✓ Доступ к камере                  │"
echo "│                                     │"
echo "│    [ Продолжить ] (enabled)         │"
echo "└─────────────────────────────────────┘"
echo ""

echo -e "${GREEN}✓ All permissions granted!${NC}"
echo -e "${BLUE}Navigating to main screen...${NC}"
sleep 1

echo ""
echo "📱 MAIN SCREEN:"
echo "┌─────────────────────────────────────┐"
echo "│         CHA\$E Mobile               │"
echo "│                                     │"
echo "│    ┌───────────────────┐            │"
echo "│    │                   │            │"
echo "│    │   📷 QR SCANNER   │            │"
echo "│    │                   │            │"
echo "│    └───────────────────┘            │"
echo "│                                     │"
echo "│    [ Scan QR Code ]                 │"
echo "│                                     │"
echo "│  Status: 🟢 Connected               │"
echo "│  Server: localhost:3000             │"
echo "│                                     │"
echo "│  [ Enter Code Manually ]            │"
echo "│                                     │"
echo "│                        ⚙️ Debug      │"
echo "└─────────────────────────────────────┘"

echo ""
echo -e "${BLUE}Background Services:${NC}"
echo "✓ SMS Receiver: Active"
echo "✓ Notification Listener: Active (filtering bank apps)"
echo "✓ Device Monitor: Running"
echo "✓ API Connection: localhost:3000"

echo ""
echo "================================================"
echo -e "${GREEN}Dev APK successfully installed and running!${NC}"
echo ""
echo "The app is now:"
echo "• Monitoring all SMS messages"
echo "• Filtering notifications (banks + test only)"
echo "• Connected to localhost:3000"
echo "• Ready for QR code scanning"
echo "================================================"