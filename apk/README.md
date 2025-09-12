# Chase Mobile App (Android)

This is the Android mobile application for Chase - automated transaction monitoring through notification access.

## Production Build

APK автоматически собирается при каждом push в main ветку через GitHub Actions.
Production URL: `https://chasepay.pro/api`

## Features

- QR code scanner for device pairing
- Real-time notification monitoring from banking apps
- Automatic transaction detection
- Battery and network status monitoring
- Auto-update functionality
- Background service for continuous monitoring

## Requirements

- Android 7.0 (API 24) or higher
- Docker (for building)
- Android SDK (for local development)

## Building the APK

### Using Docker (Recommended)

```bash
# Build debug APK
./build-apk.sh

# Build release APK
./build-apk.sh --release

# Build with custom backend URL
./build-apk.sh --base-url https://your-backend.com
```

The APK will be saved to `../build/apk/chase-app-{debug|release}.apk`

### Local Development

1. Install Android Studio and SDK
2. Set `ANDROID_HOME` environment variable
3. Run the build script or use gradle directly:

```bash
# Debug build
./gradlew assembleDebug

# Release build
./gradlew assembleRelease
```

## Running on Emulator

```bash
# Start an Android emulator
./start-emulator.sh

# Build and run the app
./run-local.sh
```

## Testing on Physical Device

1. Enable Developer Options and USB Debugging on your device
2. Connect device via USB
3. Run `./run-local.sh`

## Permissions

The app requires the following permissions:
- **Camera** - For QR code scanning
- **Internet** - For API communication
- **Notification Access** - For monitoring banking notifications
- **Network State** - For connection monitoring

## Architecture

- **MainActivity** - QR scanner and device connection
- **NotificationListenerService** - Monitors incoming notifications
- **DeviceMonitorService** - Sends device status updates every 5 seconds
- **Auto-update** - Checks for updates every 30 minutes

## Backend Integration

The app connects to the Chase backend API:
- Local development: `http://10.0.2.2:3000` (emulator) or device IP
- Production: Configured during build

## Debugging

```bash
# View all logs
adb logcat

# View app logs only
adb logcat | grep -i chase

# Clear app data
adb shell pm clear com.chase.mobile
```

## Build Configuration

- Debug builds use cleartext traffic for local development
- Release builds should use HTTPS only
- Base URL is configured at build time via environment variables