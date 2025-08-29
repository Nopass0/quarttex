#!/bin/bash

# Script to download latest APK from GitHub releases

GITHUB_REPO="Nopass0/chase"
UPLOAD_DIR="/app/uploads/apk"

# Create directory if not exists
mkdir -p $UPLOAD_DIR

# Get latest release info
echo "Fetching latest release info..."
LATEST_RELEASE=$(curl -s https://api.github.com/repos/$GITHUB_REPO/releases/latest)

# Extract download URL for APK
APK_URL=$(echo $LATEST_RELEASE | grep -o '"browser_download_url": "[^"]*\.apk"' | cut -d'"' -f4)
VERSION=$(echo $LATEST_RELEASE | grep -o '"tag_name": "[^"]*"' | cut -d'"' -f4 | sed 's/v//')

if [ -z "$APK_URL" ]; then
    echo "No APK found in latest release"
    exit 1
fi

echo "Downloading APK version $VERSION..."
wget -O $UPLOAD_DIR/chase-mobile.apk "$APK_URL"

# Create version info
cat > $UPLOAD_DIR/version-info.json << EOF
{
  "version": "$VERSION",
  "downloadUrl": "/api/app/download",
  "githubUrl": "$APK_URL",
  "updatedAt": "$(date -u +%Y-%m-%dT%H:%M:%SZ)"
}
EOF

echo "✅ APK updated to version $VERSION"