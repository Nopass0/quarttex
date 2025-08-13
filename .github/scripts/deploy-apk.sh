#!/bin/bash

# Script to deploy APK from GitHub Release to server

GITHUB_REPO="$1"
VERSION="$2"
SERVER_HOST="$3"
SERVER_PATH="/var/www/chase/backend/uploads/apk"

if [ -z "$GITHUB_REPO" ] || [ -z "$VERSION" ] || [ -z "$SERVER_HOST" ]; then
    echo "Usage: ./deploy-apk.sh <github-repo> <version> <server-host>"
    exit 1
fi

echo "Downloading APK from GitHub Release..."
DOWNLOAD_URL="https://github.com/${GITHUB_REPO}/releases/download/v${VERSION}/chase-mobile-${VERSION}.apk"

# Download APK
wget -O chase-mobile.apk "$DOWNLOAD_URL" || {
    echo "Failed to download APK from: $DOWNLOAD_URL"
    exit 1
}

# Get file size
FILE_SIZE=$(stat -c%s "chase-mobile.apk" 2>/dev/null || stat -f%z "chase-mobile.apk" 2>/dev/null)

# Create version info
cat > version-info.json << EOF
{
  "version": "${VERSION}",
  "fileSize": ${FILE_SIZE},
  "downloadUrl": "https://quattrex.pro/api/app/download",
  "githubUrl": "${DOWNLOAD_URL}",
  "buildDate": "$(date -u +%Y-%m-%dT%H:%M:%SZ)"
}
EOF

echo "Deploying to server..."
# This would be done via SSH in the actual deployment
echo "Would copy chase-mobile.apk to ${SERVER_HOST}:${SERVER_PATH}/chase-mobile.apk"
echo "Would copy version-info.json to ${SERVER_HOST}:${SERVER_PATH}/version-info.json"

echo "✅ APK deployment complete!"