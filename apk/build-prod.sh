#!/bin/bash

# Build production APK
export PROD_BASE_URL="https://chasepay.pro/api"
./gradlew clean assembleRelease

# Create prod directory and copy APK
mkdir -p apk/prod
cp app/build/outputs/apk/release/app-release-unsigned.apk apk/prod/chase-prod.apk

echo "Production APK built and saved to apk/prod/chase-prod.apk"