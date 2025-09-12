#!/bin/bash

# Build production debug APK with chasepay.pro/api endpoint
echo "Building production debug APK..."

# Clean and build prodDebug variant
./gradlew clean assembleProdDebug

# Check if build was successful
if [ $? -eq 0 ]; then
    # Create output directory
    mkdir -p apk/prod
    
    # Copy the APK
    cp app/build/outputs/apk/prodDebug/app-prodDebug.apk apk/prod/chase-prod-debug.apk
    
    echo "✓ Production debug APK built successfully!"
    echo "✓ APK saved to: apk/prod/chase-prod-debug.apk"
    echo "✓ Endpoint: https://chasepay.pro/api"
    echo "✓ Added support for more bank apps tracking"
else
    echo "✗ Build failed!"
    exit 1
fi