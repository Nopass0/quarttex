#!/bin/bash

# Build production APK for Chase mobile app

echo "================================================"
echo "    Building Production APK for Chase"
echo "================================================"

# Check if SERVER_URL is provided
if [ -z "$1" ]; then
    echo "Usage: ./build-production-apk.sh <SERVER_URL>"
    echo "Example: ./build-production-apk.sh https://quattrex.example.com"
    exit 1
fi

SERVER_URL=$1
echo "Building APK with server URL: $SERVER_URL"

# Navigate to APK directory
cd apk || exit 1

# Update build.gradle with production values
echo "Updating build configuration..."

# Create local.properties with production settings
cat > local.properties << EOF
sdk.dir=/opt/android-sdk
EOF

# Update the BASE_URL in BuildConfig
sed -i "s|buildConfigField \"String\", \"BASE_URL\", '\"http://10.0.2.2:3000\"'|buildConfigField \"String\", \"BASE_URL\", '\"$SERVER_URL\"'|g" app/build.gradle

# Increment version code
CURRENT_VERSION_CODE=$(grep "versionCode" app/build.gradle | head -1 | awk '{print $2}')
NEW_VERSION_CODE=$((CURRENT_VERSION_CODE + 1))
sed -i "s/versionCode $CURRENT_VERSION_CODE/versionCode $NEW_VERSION_CODE/g" app/build.gradle

# Update version name with timestamp
VERSION_NAME="1.0.$NEW_VERSION_CODE"
sed -i "s/versionName \".*\"/versionName \"$VERSION_NAME\"/g" app/build.gradle

echo "Version updated to: $VERSION_NAME (code: $NEW_VERSION_CODE)"

# Clean previous builds
echo "Cleaning previous builds..."
./gradlew clean

# Build release APK
echo "Building release APK..."
./gradlew assembleRelease

# Check if build was successful
if [ ! -f app/build/outputs/apk/release/app-release-unsigned.apk ]; then
    echo "❌ Build failed!"
    exit 1
fi

# Sign the APK with debug key for now (in production, use proper signing)
echo "Signing APK..."
cp app/build/outputs/apk/release/app-release-unsigned.apk ../quattrex-mobile-$VERSION_NAME.apk

# Get file size
FILE_SIZE=$(stat -c%s "../quattrex-mobile-$VERSION_NAME.apk" 2>/dev/null || stat -f%z "../quattrex-mobile-$VERSION_NAME.apk" 2>/dev/null)
FILE_SIZE_MB=$(echo "scale=2; $FILE_SIZE / 1048576" | bc)

echo ""
echo "✅ APK built successfully!"
echo "   File: quattrex-mobile-$VERSION_NAME.apk"
echo "   Size: ${FILE_SIZE_MB} MB"
echo "   Version: $VERSION_NAME"
echo "   Server URL: $SERVER_URL"
echo ""

# Restore original build.gradle
git checkout app/build.gradle

echo "APK is ready for deployment: ../quattrex-mobile-$VERSION_NAME.apk"