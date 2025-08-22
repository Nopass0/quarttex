# Device API Documentation

## Overview

The Chase Device API allows mobile applications to connect and interact with the Chase trading platform. Devices authenticate using unique tokens and can perform health checks, receive notifications, and manage bank details.

## Authentication

All device endpoints (except health check) require trader authentication using the `x-trader-token` header. The health check endpoint uses device-specific authentication with the `x-device-token` header.

## Base URL

```
http://localhost:3000/api
```

## Endpoints

### 1. Health Check

Send device status updates to the server. This endpoint should be called regularly to maintain an active connection.

**Endpoint:** `POST /trader/devices/health-check`

**Headers:**
```
x-device-token: [device_token]
```

**Request Body:**
```json
{
  "batteryLevel": 85,              // Optional: Battery percentage (0-100)
  "networkSpeed": 150,              // Optional: Network speed in Mbps
  "userAgent": "Mozilla/5.0...",    // Optional: Device user agent string
  "ip": "192.168.1.100",           // Optional: Device IP address
  "location": "Moscow, Russia",     // Optional: Device location
  "version": "1.0.0",              // Optional: App version
  "ping": 45,                      // Optional: Network ping in ms
  "connectionType": "wifi"         // Optional: "wifi", "4g", "3g", etc.
}
```

**Response:**
```json
{
  "success": true,
  "deviceId": "device_id_here",
  "timestamp": "2025-07-04T16:30:00.000Z"
}
```

**Error Responses:**
- `400` - Device token required
- `404` - Invalid device token

**Usage Notes:**
- Call this endpoint every 30-60 seconds to maintain online status
- Devices are automatically marked offline after 3000 seconds (50 minutes) without a health check
- All fields in the request body are optional

### 2. Create Device (Trader Only)

Create a new device entry for connection.

**Endpoint:** `POST /trader/devices`

**Headers:**
```
x-trader-token: [trader_token]
```

**Request Body:**
```json
{
  "name": "Samsung Galaxy S23"
}
```

**Response:**
```json
{
  "id": "device_id_here",
  "name": "Samsung Galaxy S23",
  "token": "64_character_hex_token_here",
  "createdAt": "2025-07-04T16:00:00.000Z"
}
```

### 3. Get All Devices (Trader Only)

Retrieve all devices associated with the trader.

**Endpoint:** `GET /trader/devices`

**Headers:**
```
x-trader-token: [trader_token]
```

**Response:**
```json
[
  {
    "id": "device_id",
    "name": "Device Name",
    "token": "device_token",
    "isOnline": true,
    "energy": 85,
    "ethernetSpeed": 150,
    "lastSeen": "2025-07-04T16:00:00.000Z",
    "createdAt": "2025-07-04T12:00:00.000Z",
    "browser": null,
    "os": null,
    "ip": null,
    "location": null,
    "isTrusted": false,
    "notifications": 5,
    "linkedBankDetails": 2
  }
]
```

### 4. Get Device Details (Trader Only)

Get detailed information about a specific device.

**Endpoint:** `GET /trader/devices/:id`

**Headers:**
```
x-trader-token: [trader_token]
```

**Response:**
```json
{
  "id": "device_id",
  "name": "Device Name",
  "token": "device_token",
  "isOnline": false,
  "energy": 85,
  "ethernetSpeed": 150,
  "lastSeen": "2025-07-04T16:00:00.000Z",
  "createdAt": "2025-07-04T12:00:00.000Z",
  "browser": null,
  "os": null,
  "ip": null,
  "location": null,
  "isTrusted": false,
  "notifications": 5,
  "linkedBankDetails": [
    {
      "id": "bank_detail_id",
      "cardNumber": "1234567890123456",
      "bankType": "SBERBANK",
      "recipientName": "Ivan Ivanov",
      "status": "ACTIVE"
    }
  ],
  "recentNotifications": [
    {
      "id": "notification_id",
      "type": "HEALTH_CHECK",
      "title": "Health Check",
      "message": "Device health check received",
      "createdAt": "2025-07-04T16:00:00.000Z"
    }
  ]
}
```

## Integration Guide

### 1. Device Registration Flow

1. Trader creates a device in the web interface
2. System generates a unique device token
3. Token is displayed as QR code and text
4. Mobile app scans QR code or manually enters token
5. App stores token securely for future requests

### 2. QR Code Format

The QR code contains a JSON object:
```json
{
  "token": "device_token_here",
  "deviceId": "device_id_here",
  "timestamp": 1720108800000
}
```

### 3. Maintaining Connection

```javascript
// Example health check implementation
async function sendHealthCheck() {
  const deviceInfo = {
    batteryLevel: getBatteryLevel(),
    networkSpeed: getNetworkSpeed(),
    userAgent: navigator.userAgent,
    version: "1.0.0",
    connectionType: getConnectionType()
  };

  try {
    const response = await fetch('http://localhost:3000/api/trader/devices/health-check', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-device-token': savedDeviceToken
      },
      body: JSON.stringify(deviceInfo)
    });

    if (!response.ok) {
      throw new Error('Health check failed');
    }

    const data = await response.json();
    console.log('Health check successful:', data);
  } catch (error) {
    console.error('Health check error:', error);
  }
}

// Send health check every 45 seconds
setInterval(sendHealthCheck, 45000);
```

### 4. Error Handling

All error responses follow this format:
```json
{
  "error": "Error message here"
}
```

Common HTTP status codes:
- `200` - Success
- `400` - Bad request (missing required fields)
- `401` - Unauthorized (invalid token)
- `404` - Resource not found
- `500` - Server error

### 5. Device States

- **Online**: Device sent health check within last 3000 seconds
- **Offline**: No health check received for over 3000 seconds
- **Working**: Device is actively processing transactions
- **Not Working**: Device is connected but not processing

## Best Practices

1. **Token Security**: Store device tokens securely using platform-specific secure storage
2. **Health Checks**: Send health checks every 30-60 seconds for optimal reliability
3. **Battery Optimization**: Reduce health check frequency when battery is low
4. **Network Handling**: Implement retry logic for failed requests
5. **Error Recovery**: Automatically reconnect after network failures

## CORS Configuration

The API is configured to accept requests from any origin for device endpoints. The following headers are included in responses:

```
Access-Control-Allow-Origin: *
Access-Control-Allow-Methods: GET, POST, PUT, DELETE, PATCH, OPTIONS
Access-Control-Allow-Headers: Content-Type, x-device-token, x-trader-token
```

## Example Mobile Integration

### Android (Kotlin)
```kotlin
class DeviceService(private val context: Context) {
    private val deviceToken = getStoredDeviceToken()
    private val client = OkHttpClient()
    
    fun sendHealthCheck() {
        val batteryLevel = getBatteryLevel()
        val networkInfo = getNetworkInfo()
        
        val json = JSONObject().apply {
            put("batteryLevel", batteryLevel)
            put("networkSpeed", networkInfo.speed)
            put("connectionType", networkInfo.type)
            put("version", BuildConfig.VERSION_NAME)
        }
        
        val request = Request.Builder()
            .url("http://your-server.com/api/trader/devices/health-check")
            .header("x-device-token", deviceToken)
            .post(json.toString().toRequestBody("application/json".toMediaType()))
            .build()
            
        client.newCall(request).execute()
    }
}
```

### iOS (Swift)
```swift
class DeviceService {
    private let deviceToken = UserDefaults.standard.string(forKey: "deviceToken")
    
    func sendHealthCheck() {
        guard let token = deviceToken else { return }
        
        let url = URL(string: "http://your-server.com/api/trader/devices/health-check")!
        var request = URLRequest(url: url)
        request.httpMethod = "POST"
        request.setValue(token, forHTTPHeaderField: "x-device-token")
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")
        
        let healthData: [String: Any] = [
            "batteryLevel": UIDevice.current.batteryLevel * 100,
            "version": Bundle.main.infoDictionary?["CFBundleShortVersionString"] as? String ?? "1.0"
        ]
        
        request.httpBody = try? JSONSerialization.data(withJSONObject: healthData)
        
        URLSession.shared.dataTask(with: request).resume()
    }
}
```

## Testing

You can test the API using curl:

```bash
# Create device (requires trader token)
curl -X POST http://localhost:3000/api/trader/devices \
  -H "x-trader-token: YOUR_TRADER_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"name": "Test Device"}'

# Send health check
curl -X POST http://localhost:3000/api/trader/devices/health-check \
  -H "x-device-token: YOUR_DEVICE_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"batteryLevel": 85, "networkSpeed": 100}'
```

## Support

For technical support or questions about the API, please contact the development team or open an issue in the project repository.