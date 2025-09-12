#!/bin/bash

# Build development APK
export DEBUG_BASE_URL="http://10.0.2.2:3000"
./gradlew clean assembleDebug

# Create dev directory and copy APK
mkdir -p apk/dev
cp app/build/outputs/apk/debug/app-debug.apk apk/dev/chase-dev.apk

echo "Development APK built and saved to apk/dev/chase-dev.apk"