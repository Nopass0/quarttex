#!/bin/bash

# Script to build APK locally without Docker (requires Android SDK)

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

echo -e "${YELLOW}Building Chase APK locally...${NC}"
echo "Build type: $BUILD_TYPE"
echo "Base URL: $BASE_URL"

# Check if Android SDK is installed
if [ -z "$ANDROID_HOME" ]; then
    echo -e "${RED}Error: ANDROID_HOME is not set${NC}"
    echo "Please install Android SDK or use Docker build: ./build-apk.sh"
    exit 1
fi

# Export base URL for build
export DEBUG_BASE_URL="$BASE_URL"
export PROD_BASE_URL="$BASE_URL"

# Create output directory
mkdir -p ../build/apk

# Clean previous builds
echo -e "${YELLOW}Cleaning previous builds...${NC}"
./gradlew clean

# Build APK
echo -e "${YELLOW}Building APK...${NC}"
if [ "$BUILD_TYPE" = "debug" ]; then
    ./gradlew assembleDebug
    cp app/build/outputs/apk/debug/app-debug.apk ../build/apk/chase-app-debug.apk
else
    ./gradlew assembleRelease
    cp app/build/outputs/apk/release/app-release-unsigned.apk ../build/apk/chase-app-release.apk
fi

echo -e "${GREEN}✓ APK built successfully!${NC}"
echo -e "Location: build/apk/chase-app-${BUILD_TYPE}.apk"