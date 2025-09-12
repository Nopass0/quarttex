#!/bin/bash

echo "Installing Chase Dev APK..."

# Kill any existing adb server
echo "Restarting ADB..."
adb kill-server 2>/dev/null
sleep 2

# Start ADB server
adb start-server

# Wait for device
echo "Waiting for device..."
adb wait-for-device

# Check device
echo "Connected devices:"
adb devices

# Install APK
echo "Installing APK..."
adb install -r ./apk-builds-2025-07-28/chase-dev-localhost-3000-debug.apk

# Launch the app
echo "Launching app..."
adb shell am start -n ru.chasepay.mobile/.PermissionsActivity

echo "Done!"