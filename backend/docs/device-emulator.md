# Device Emulator Service

The Device Emulator Service allows you to test the notification system by simulating virtual devices that send test notifications.

## How It Works

1. The emulator connects virtual devices to the Device API
2. Each device periodically sends ping updates and notifications
3. Notifications are based on bank templates and can include both valid and spam messages

## Setup Instructions

### 1. Enable the Service

First, ensure the service is enabled in your environment:

```bash
# In your .env file
DES_ENABLED=true
```

### 2. Create an Emulated Device

Devices must exist in the database with the `emulated: true` flag before the emulator can use them.

```bash
# Create a device for a trader
npm run device:create <trader-id> [bank-type]

# Example:
npm run device:create cl123456789 SBERBANK
```

This will output a device token that you'll use in the next step.

### 3. Add Device to Emulator

1. Go to Admin Panel → Services → Device Emulator Service
2. Click "Add Device"
3. Paste the device token as "Device Code"
4. Select the bank type (must match the bank in trader's requisites)
5. Click "Add"

### 4. Monitor Device Status

- **Connected (Green)**: Device is active and sending notifications
- **Connecting (Yellow)**: Device is trying to connect (can take up to 60 seconds)
- **Disconnected (Red)**: Device failed to connect (check logs)

## Troubleshooting

### Device Won't Connect

1. **Check Service Status**: Ensure the service shows as "Running" in the admin panel
2. **Verify Device Exists**: The device token must correspond to an existing device with `emulated: true`
3. **Check Bank Details**: The trader must have active bank details for the selected bank type
4. **Review Logs**: Check the service logs in the admin panel for connection errors

### Common Errors

- **"Invalid device code"**: Device with this token doesn't exist
- **"No bank details available"**: Trader has no bank details for the selected bank type
- **"AUTH_ERROR"**: Device token is invalid or device was deleted

## Configuration Options

### Global Settings

- `defaultPingSec`: How often devices send status updates (default: 60)
- `defaultNotifyChance`: Probability of sending a notification (0-1, default: 0.4)
- `defaultSpamChance`: Probability of sending spam instead of valid notification (0-1, default: 0.05)
- `defaultDelayChance`: Probability of delayed response to simulate network issues (0-1, default: 0.1)
- `reconnectOnAuthError`: Automatically reconnect on authentication errors (default: true)

### Per-Device Settings

Each device can override global settings:

```json
{
  "deviceCode": "abc123",
  "bankType": "SBERBANK",
  "model": "Pixel 7 Pro",
  "androidVersion": "13",
  "initialBattery": 85,
  "pingSec": 30,
  "notifyChance": 0.8,
  "spamChance": 0.1,
  "delayChance": 0.2
}
```

## API Integration

The emulator uses the same Device API endpoints as real devices:

- `POST /api/device/connect` - Initial device connection
- `POST /api/device/info/update` - Battery and network status updates
- `POST /api/device/notification` - Send notifications

Devices authenticate using Bearer tokens obtained during connection.