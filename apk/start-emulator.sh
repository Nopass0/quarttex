#!/bin/bash

# Script to start Android emulator for Chase app testing

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Check if ANDROID_HOME is set
if [ -z "$ANDROID_HOME" ]; then
    echo -e "${RED}Error: ANDROID_HOME is not set${NC}"
    echo "Please set ANDROID_HOME to your Android SDK path"
    echo "Example: export ANDROID_HOME=~/Android/Sdk"
    exit 1
fi

# Check if emulator is installed
if ! command -v emulator &> /dev/null; then
    if [ -f "$ANDROID_HOME/emulator/emulator" ]; then
        PATH="$ANDROID_HOME/emulator:$PATH"
    else
        echo -e "${RED}Error: Android emulator not found${NC}"
        echo "Please install Android SDK with emulator"
        exit 1
    fi
fi

# Check if adb is available
if ! command -v adb &> /dev/null; then
    if [ -f "$ANDROID_HOME/platform-tools/adb" ]; then
        PATH="$ANDROID_HOME/platform-tools:$PATH"
    else
        echo -e "${RED}Error: adb not found${NC}"
        echo "Please install Android SDK platform-tools"
        exit 1
    fi
fi

# List available emulators
echo -e "${BLUE}Available emulators:${NC}"
emulator -list-avds

# Get list of AVDs
AVDS=$(emulator -list-avds)

if [ -z "$AVDS" ]; then
    echo -e "${YELLOW}No emulators found!${NC}"
    echo ""
    echo "To create an emulator:"
    echo "1. Open Android Studio"
    echo "2. Go to Tools > AVD Manager"
    echo "3. Create a new Virtual Device"
    echo ""
    echo "Or use command line:"
    echo "  avdmanager create avd -n Chase_Test_Device -k \"system-images;android-30;google_apis;x86_64\""
    exit 1
fi

# Use first AVD if only one exists, otherwise ask user to choose
AVD_COUNT=$(echo "$AVDS" | wc -l)

if [ "$AVD_COUNT" -eq 1 ]; then
    SELECTED_AVD="$AVDS"
else
    echo -e "${YELLOW}Select an emulator to start:${NC}"
    select AVD in $AVDS; do
        if [ -n "$AVD" ]; then
            SELECTED_AVD="$AVD"
            break
        fi
    done
fi

echo -e "${GREEN}Starting emulator: $SELECTED_AVD${NC}"

# Start emulator in background
emulator -avd "$SELECTED_AVD" -netdelay none -netspeed full &
EMULATOR_PID=$!

# Wait for emulator to boot
echo -e "${YELLOW}Waiting for emulator to boot...${NC}"
adb wait-for-device

# Wait for boot animation to finish
while [ "$(adb shell getprop sys.boot_completed 2>/dev/null)" != "1" ]; do
    sleep 2
    echo -n "."
done

echo ""
echo -e "${GREEN}✓ Emulator is ready!${NC}"

# Show device info
echo -e "${BLUE}Device info:${NC}"
adb shell getprop ro.product.model
adb shell getprop ro.build.version.release

# Install APK if it exists
APK_PATH="../build/apk/chase-app-debug.apk"
if [ -f "$APK_PATH" ]; then
    echo -e "${YELLOW}Installing Chase app...${NC}"
    adb install -r "$APK_PATH"
    echo -e "${GREEN}✓ App installed!${NC}"
    
    # Launch the app
    echo -e "${YELLOW}Launching Chase app...${NC}"
    adb shell am start -n com.chase.mobile/.MainActivity
else
    echo -e "${YELLOW}No APK found at $APK_PATH${NC}"
    echo "Build the app first with: cd apk && ./build-apk.sh"
fi

echo ""
echo -e "${GREEN}Emulator is running!${NC}"
echo ""
echo "Useful commands:"
echo "  adb devices                    - List connected devices"
echo "  adb logcat                     - View device logs"
echo "  adb install app.apk           - Install an APK"
echo "  adb uninstall com.chase.mobile - Uninstall the app"
echo ""
echo "Press Ctrl+C to stop the emulator"

# Keep script running
wait $EMULATOR_PID