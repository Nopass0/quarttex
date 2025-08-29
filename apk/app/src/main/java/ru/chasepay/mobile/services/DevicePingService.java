package ru.quattrex.mobile.services;

import android.content.Context;
import android.content.SharedPreferences;
import android.os.BatteryManager;
import android.os.Handler;
import android.os.Looper;
import android.util.Log;

import org.json.JSONObject;

import java.util.concurrent.TimeUnit;

import okhttp3.OkHttpClient;
import okhttp3.Request;
import okhttp3.Response;
import okhttp3.WebSocket;
import okhttp3.WebSocketListener;
import ru.quattrex.mobile.utils.DeviceUtils;

public class DevicePingService extends WebSocketListener {
    private static final String TAG = "DevicePingService";
    private static final String PREFS_NAME = "QuattrexPrefs";
    private static final String KEY_DEVICE_TOKEN = "device_token";
    
    // Change to every 1 second
    private static final long PING_INTERVAL = TimeUnit.SECONDS.toMillis(1);
    
    private Context context;
    private WebSocket webSocket;
    private OkHttpClient client;
    private Handler handler;
    private Runnable pingRunnable;
    private SharedPreferences prefs;
    private boolean isRunning = false;
    private long lastPingTime = 0;
    
    private static DevicePingService instance;
    
    public static synchronized DevicePingService getInstance(Context context) {
        if (instance == null) {
            instance = new DevicePingService(context.getApplicationContext());
        }
        return instance;
    }
    
    private DevicePingService(Context context) {
        this.context = context;
        this.prefs = context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE);
        this.handler = new Handler(Looper.getMainLooper());
        
        this.client = new OkHttpClient.Builder()
                .connectTimeout(10, TimeUnit.SECONDS)
                .readTimeout(0, TimeUnit.MILLISECONDS) // Keep connection open
                .writeTimeout(10, TimeUnit.SECONDS)
                .build();
    }
    
    public void startPingService() {
        if (isRunning) {
            Log.d(TAG, "Ping service already running");
            return;
        }
        
        String deviceToken = prefs.getString(KEY_DEVICE_TOKEN, null);
        if (deviceToken == null) {
            Log.w(TAG, "Cannot start ping service - no device token");
            return;
        }
        
        Log.d(TAG, "Starting ping service");
        isRunning = true;
        
        connectWebSocket();
        startPingLoop();
    }
    
    public void stopPingService() {
        Log.d(TAG, "Stopping ping service");
        isRunning = false;
        
        if (handler != null && pingRunnable != null) {
            handler.removeCallbacks(pingRunnable);
        }
        
        if (webSocket != null) {
            webSocket.close(1000, "Service stopped");
            webSocket = null;
        }
    }
    
    private void connectWebSocket() {
        try {
            String baseUrl = ru.quattrex.mobile.BuildConfig.BASE_URL;
            // Remove /api suffix if present and add /device-ping
            String wsBaseUrl = baseUrl.replace("/api", "").replace("https://", "wss://").replace("http://", "ws://");
            String wsUrl = wsBaseUrl + "/device-ping";
            
            Log.d(TAG, "Connecting to WebSocket: " + wsUrl);
            
            Request request = new Request.Builder()
                    .url(wsUrl)
                    .build();
            
            webSocket = client.newWebSocket(request, this);
            
        } catch (Exception e) {
            Log.e(TAG, "Error connecting WebSocket", e);
            scheduleReconnect();
        }
    }
    
    private void startPingLoop() {
        pingRunnable = new Runnable() {
            @Override
            public void run() {
                if (isRunning && webSocket != null) {
                    // Check if we haven't sent a ping in a while (network might be suspended)
                    long currentTime = System.currentTimeMillis();
                    if (lastPingTime > 0 && currentTime - lastPingTime > 10000) {
                        Log.w(TAG, "Ping delayed by " + (currentTime - lastPingTime) + "ms, reconnecting...");
                        reconnectWebSocket();
                    } else {
                        sendPing();
                    }
                    handler.postDelayed(this, PING_INTERVAL);
                }
            }
        };
        
        // Start pinging immediately
        handler.post(pingRunnable);
    }
    
    private void sendPing() {
        try {
            String deviceToken = prefs.getString(KEY_DEVICE_TOKEN, null);
            if (deviceToken == null || webSocket == null) {
                return;
            }
            
            JSONObject pingData = new JSONObject();
            pingData.put("type", "ping");
            pingData.put("deviceToken", deviceToken);
            pingData.put("batteryLevel", getBatteryLevel());
            pingData.put("networkSpeed", getNetworkSpeed());
            pingData.put("timestamp", System.currentTimeMillis());
            
            lastPingTime = System.currentTimeMillis();
            boolean sent = webSocket.send(pingData.toString());
            if (!sent) {
                Log.w(TAG, "Failed to send ping - WebSocket not ready");
                reconnectWebSocket();
            } else {
                Log.d(TAG, "Ping sent successfully at " + lastPingTime);
            }
            
        } catch (Exception e) {
            Log.e(TAG, "Error sending ping", e);
            reconnectWebSocket();
        }
    }
    
    private int getBatteryLevel() {
        try {
            return DeviceUtils.getBatteryLevel(context);
        } catch (Exception e) {
            Log.e(TAG, "Error getting battery level", e);
            return 0;
        }
    }
    
    private int getNetworkSpeed() {
        try {
            return DeviceUtils.getNetworkSpeed(context);
        } catch (Exception e) {
            Log.e(TAG, "Error getting network speed", e);
            return 0;
        }
    }
    
    @Override
    public void onOpen(WebSocket webSocket, Response response) {
        Log.d(TAG, "WebSocket connected");
        // Notify universal service about successful connection
        UniversalConnectionService.getInstance(context).notifySuccessfulConnection();
    }
    
    @Override
    public void onMessage(WebSocket webSocket, String text) {
        try {
            JSONObject response = new JSONObject(text);
            String type = response.getString("type");
            
            if ("pong".equals(type)) {
                // Server responded to our ping
                Log.d(TAG, "Received pong from server");
                // Notify universal service about successful ping
                UniversalConnectionService.getInstance(context).notifySuccessfulConnection();
            } else if ("error".equals(type)) {
                String message = response.optString("message", "Unknown error");
                Log.e(TAG, "Server error: " + message);
                scheduleReconnect();
            }
        } catch (Exception e) {
            Log.e(TAG, "Error processing WebSocket message", e);
        }
    }
    
    @Override
    public void onClosing(WebSocket webSocket, int code, String reason) {
        Log.d(TAG, "WebSocket closing: " + code + " " + reason);
    }
    
    @Override
    public void onClosed(WebSocket webSocket, int code, String reason) {
        Log.d(TAG, "WebSocket closed: " + code + " " + reason);
        if (isRunning) {
            scheduleReconnect();
        }
    }
    
    @Override
    public void onFailure(WebSocket webSocket, Throwable t, Response response) {
        Log.e(TAG, "WebSocket failure: " + t.getMessage());
        if (isRunning) {
            // Check if we still have a device token to reconnect
            String deviceToken = prefs.getString(KEY_DEVICE_TOKEN, null);
            if (deviceToken != null) {
                Log.d(TAG, "Device token exists, will attempt reconnection");
                scheduleReconnect();
            } else {
                Log.e(TAG, "No device token, cannot reconnect");
            }
        }
    }
    
    private void reconnectWebSocket() {
        if (webSocket != null) {
            webSocket.close(1000, "Reconnecting");
            webSocket = null;
        }
        scheduleReconnect();
    }
    
    private void scheduleReconnect() {
        if (isRunning) {
            // Check if we have a device token before reconnecting
            String deviceToken = prefs.getString(KEY_DEVICE_TOKEN, null);
            if (deviceToken == null) {
                Log.e(TAG, "Cannot reconnect - no device token");
                return;
            }
            
            Log.d(TAG, "Scheduling WebSocket reconnect in 2 seconds");
            handler.postDelayed(() -> {
                if (isRunning) {
                    connectWebSocket();
                }
            }, 2000); // Reduced to 2 seconds for faster reconnection
        }
    }
    
    public boolean isRunning() {
        return isRunning;
    }
}