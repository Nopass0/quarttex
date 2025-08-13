#!/bin/bash

# Build production debug APK with prod URL
export DEBUG_BASE_URL="https://quattrex.pro/api"
./gradlew clean assembleDebug

# Create prod directory and copy APK
mkdir -p apk/prod
cp app/build/outputs/apk/debug/app-debug.apk apk/prod/quattrex-prod.apk

echo "Production APK (debug build) saved to apk/prod/quattrex-prod.apk"