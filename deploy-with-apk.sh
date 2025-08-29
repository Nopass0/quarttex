#!/bin/bash

# Deploy Chase with APK build

echo "================================================"
echo "    Deploying Chase with APK Build"
echo "================================================"

# Get server URL from environment or use default
SERVER_URL=${SERVER_URL:-https://quattrex.example.com}
echo "Server URL: $SERVER_URL"

# Build APK first
echo ""
echo "Building Android APK..."
echo "================================================"

cd apk || exit 1

# Update BASE_URL in build.gradle
echo "Updating BASE_URL to: $SERVER_URL"
sed -i.bak "s|buildConfigField \"String\", \"BASE_URL\", '\".*\"'|buildConfigField \"String\", \"BASE_URL\", '\"$SERVER_URL\"'|g" app/build.gradle

# Get current version
CURRENT_VERSION_CODE=$(grep "versionCode" app/build.gradle | head -1 | awk '{print $2}')
NEW_VERSION_CODE=$((CURRENT_VERSION_CODE + 1))
VERSION_NAME="1.0.$NEW_VERSION_CODE"

# Update version
sed -i.bak "s/versionCode $CURRENT_VERSION_CODE/versionCode $NEW_VERSION_CODE/g" app/build.gradle
sed -i.bak "s/versionName \".*\"/versionName \"$VERSION_NAME\"/g" app/build.gradle

echo "Building version $VERSION_NAME..."

# Build APK
./gradlew clean assembleRelease

# Check if build was successful
if [ -f app/build/outputs/apk/release/app-release-unsigned.apk ]; then
    echo "✅ APK built successfully!"
    
    # Copy APK to backend uploads directory
    mkdir -p ../backend/uploads/apk
    cp app/build/outputs/apk/release/app-release-unsigned.apk ../backend/uploads/apk/quattrex-mobile.apk
    
    # Get file size
    FILE_SIZE=$(stat -c%s "app/build/outputs/apk/release/app-release-unsigned.apk" 2>/dev/null || stat -f%z "app/build/outputs/apk/release/app-release-unsigned.apk" 2>/dev/null)
    
    # Create version info file
    cat > ../backend/uploads/apk/version-info.json << EOF
{
  "version": "$VERSION_NAME",
  "versionCode": $NEW_VERSION_CODE,
  "fileSize": $FILE_SIZE,
  "buildDate": "$(date -u +%Y-%m-%dT%H:%M:%SZ)",
  "serverUrl": "$SERVER_URL"
}
EOF

else
    echo "❌ APK build failed!"
    # Restore original build.gradle
    mv app/build.gradle.bak app/build.gradle
    exit 1
fi

# Restore original build.gradle
mv app/build.gradle.bak app/build.gradle

cd ..

echo ""
echo "Deploying application..."
echo "================================================"

# Run normal deployment
docker-compose up -d --build

echo ""
echo "✅ Deployment complete!"
echo "   APK Version: $VERSION_NAME"
echo "   APK Location: /uploads/apk/quattrex-mobile.apk"
echo "   Server URL: $SERVER_URL"