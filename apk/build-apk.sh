#!/bin/bash

# Script to build APK using Docker

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Default values
BUILD_TYPE="debug"
BASE_URL="http://10.0.2.2:3000"

# Parse arguments
while [[ $# -gt 0 ]]; do
    case $1 in
        --release)
            BUILD_TYPE="release"
            shift
            ;;
        --base-url)
            BASE_URL="$2"
            shift 2
            ;;
        *)
            echo -e "${RED}Unknown option: $1${NC}"
            echo "Usage: $0 [--release] [--base-url URL]"
            exit 1
            ;;
    esac
done

echo -e "${YELLOW}Building Chase APK...${NC}"
echo "Build type: $BUILD_TYPE"
echo "Base URL: $BASE_URL"

# Build Docker image
echo -e "${YELLOW}Building Docker image...${NC}"
docker build -t chase-apk-builder \
  --build-arg BUILD_TYPE=$BUILD_TYPE \
  --build-arg BASE_URL=$BASE_URL \
  .

# Create output directory
mkdir -p ../build/apk

# Run container and extract APK
echo -e "${YELLOW}Extracting APK...${NC}"
docker run --rm -v $(pwd)/../build/apk:/output chase-apk-builder sh -c "cp /output/chase-app.apk /output/chase-app-${BUILD_TYPE}.apk"

echo -e "${GREEN}✓ APK built successfully!${NC}"
echo -e "Location: build/apk/chase-app-${BUILD_TYPE}.apk"

# If in debug mode, show instructions for testing
if [ "$BUILD_TYPE" = "debug" ]; then
    echo -e "\n${YELLOW}To install on emulator:${NC}"
    echo "adb install -r ../build/apk/chase-app-debug.apk"
fi