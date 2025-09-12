#!/bin/bash

# Build production debug APK with prod URL
export DEBUG_BASE_URL="https://chasepay.pro/api"
./gradlew clean assembleDebug

# Create prod directory and copy APK
mkdir -p apk/prod
cp app/build/outputs/apk/debug/app-debug.apk apk/prod/chase-prod.apk

echo "Production APK (debug build) saved to apk/prod/chase-prod.apk"