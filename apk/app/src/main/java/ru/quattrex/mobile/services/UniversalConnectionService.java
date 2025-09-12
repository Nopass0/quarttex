package ru.quattrex.mobile.services;

import android.content.Context;
import android.content.SharedPreferences;
import android.os.Handler;
import android.os.Looper;
import android.util.Log;

import org.json.JSONObject;

import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.TimeUnit;

import okhttp3.MediaType;
import okhttp3.OkHttpClient;
import okhttp3.Request;
import okhttp3.RequestBody;
import okhttp3.Response;
import ru.quattrex.mobile.utils.DeviceUtils;

public class UniversalConnectionService {
    private static final String TAG = "UniversalConnection";
    private static final String PREFS_NAME = "QuattrexPrefs";
    private static final String KEY_DEVICE_TOKEN = "device_token";
    
    // Connection modes
    private enum ConnectionMode {
        WEBSOCKET,
        LONG_POLLING,
        HTTP_PING
    }
    
    private Context context;
    private SharedPreferences prefs;
    private Handler handler;
    private ExecutorService executor;
    private OkHttpClient httpClient;
    
    private DevicePingService webSocketService;
    private ConnectionMode currentMode = ConnectionMode.WEBSOCKET;
    private boolean isRunning = false;
    private int failureCount = 0;
    private long lastSuccessfulPing = 0;
    
    private static UniversalConnectionService instance;
    
    public static synchronized UniversalConnectionService getInstance(Context context) {
        if (instance == null) {
            instance = new UniversalConnectionService(context.getApplicationContext());
        }
        return instance;
    }
    
    private UniversalConnectionService(Context context) {
        this.context = context;
        this.prefs = context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE);
        this.handler = new Handler(Looper.getMainLooper());
        this.executor = Executors.newSingleThreadExecutor();
        
        this.httpClient = new OkHttpClient.Builder()
                .connectTimeout(15, TimeUnit.SECONDS)
                .readTimeout(30, TimeUnit.SECONDS) // Long timeout for long-polling
                .writeTimeout(15, TimeUnit.SECONDS)
                .build();
        
        this.webSocketService = DevicePingService.getInstance(context);
    }
    
    public void start() {
        if (isRunning) {
            Log.d(TAG, "Service already running");
            return;
        }
        
        String deviceToken = prefs.getString(KEY_DEVICE_TOKEN, null);
        if (deviceToken == null) {
            Log.w(TAG, "Cannot start - no device token");
            return;
        }
        
        Log.d(TAG, "Starting universal connection service");
        isRunning = true;
        failureCount = 0;
        
        // Start with WebSocket
        startConnection(ConnectionMode.WEBSOCKET);
        
        // Start monitoring
        startConnectionMonitor();
    }
    
    public void stop() {
        Log.d(TAG, "Stopping universal connection service");
        isRunning = false;
        
        webSocketService.stopPingService();
        
        if (executor != null && !executor.isShutdown()) {
            executor.shutdownNow();
        }
    }
    
    private void startConnection(ConnectionMode mode) {
        currentMode = mode;
        Log.d(TAG, "Starting connection in mode: " + mode);
        
        switch (mode) {
            case WEBSOCKET:
                webSocketService.stopPingService();
                webSocketService.startPingService();
                break;
                
            case LONG_POLLING:
                startLongPolling();
                break;
                
            case HTTP_PING:
                startHttpPing();
                break;
        }
    }
    
    private void startConnectionMonitor() {
        handler.postDelayed(new Runnable() {
            @Override
            public void run() {
                if (!isRunning) return;
                
                long timeSinceLastPing = System.currentTimeMillis() - lastSuccessfulPing;
                
                // If no successful ping in 10 seconds, switch mode
                if (timeSinceLastPing > 10000 && lastSuccessfulPing > 0) {
                    Log.w(TAG, "No successful ping for " + timeSinceLastPing + "ms, switching mode");
                    failureCount++;
                    switchConnectionMode();
                }
                
                // Continue monitoring
                handler.postDelayed(this, 5000);
            }
        }, 5000);
    }
    
    private void switchConnectionMode() {
        switch (currentMode) {
            case WEBSOCKET:
                if (failureCount < 3) {
                    // Try WebSocket again
                    startConnection(ConnectionMode.WEBSOCKET);
                } else {
                    // Switch to long-polling
                    startConnection(ConnectionMode.LONG_POLLING);
                }
                break;
                
            case LONG_POLLING:
                // Switch to HTTP ping
                startConnection(ConnectionMode.HTTP_PING);
                break;
                
            case HTTP_PING:
                // Reset and try WebSocket again
                failureCount = 0;
                startConnection(ConnectionMode.WEBSOCKET);
                break;
        }
    }
    
    private void startLongPolling() {
        executor.execute(() -> {
            while (isRunning && currentMode == ConnectionMode.LONG_POLLING) {
                try {
                    String deviceToken = prefs.getString(KEY_DEVICE_TOKEN, null);
                    if (deviceToken == null) break;
                    
                    String baseUrl = ru.quattrex.mobile.BuildConfig.BASE_URL;
                    String pollUrl = baseUrl.replace("/api", "") + "/api/device/long-poll";
                    
                    JSONObject data = new JSONObject();
                    data.put("batteryLevel", DeviceUtils.getBatteryLevel(context));
                    data.put("networkSpeed", DeviceUtils.getNetworkSpeed(context));
                    data.put("timestamp", System.currentTimeMillis());
                    
                    RequestBody body = RequestBody.create(
                        MediaType.parse("application/json"),
                        data.toString()
                    );
                    
                    Request request = new Request.Builder()
                            .url(pollUrl)
                            .post(body)
                            .addHeader("x-device-token", deviceToken)
                            .build();
                    
                    try (Response response = httpClient.newCall(request).execute()) {
                        if (response.isSuccessful()) {
                            lastSuccessfulPing = System.currentTimeMillis();
                            failureCount = 0;
                            
                            String responseBody = response.body().string();
                            JSONObject result = new JSONObject(responseBody);
                            
                            Log.d(TAG, "Long-poll response: " + result.getString("status"));
                            
                            // Handle any commands from server
                            if (result.has("command")) {
                                handleServerCommand(result.getString("command"), result.optJSONObject("data"));
                            }
                        } else {
                            Log.e(TAG, "Long-poll failed: " + response.code());
                            failureCount++;
                        }
                    }
                    
                } catch (Exception e) {
                    Log.e(TAG, "Long-poll error", e);
                    failureCount++;
                    
                    // Wait before retry
                    try {
                        Thread.sleep(2000);
                    } catch (InterruptedException ie) {
                        break;
                    }
                }
            }
        });
    }
    
    private void startHttpPing() {
        handler.post(new Runnable() {
            @Override
            public void run() {
                if (!isRunning || currentMode != ConnectionMode.HTTP_PING) return;
                
                sendHttpPing();
                
                // Schedule next ping
                handler.postDelayed(this, 3000);
            }
        });
    }
    
    private void sendHttpPing() {
        executor.execute(() -> {
            try {
                String deviceToken = prefs.getString(KEY_DEVICE_TOKEN, null);
                if (deviceToken == null) return;
                
                String baseUrl = ru.quattrex.mobile.BuildConfig.BASE_URL;
                String pingUrl = baseUrl.replace("/api", "") + "/api/device/health-check";
                
                JSONObject data = new JSONObject();
                data.put("batteryLevel", DeviceUtils.getBatteryLevel(context));
                data.put("networkSpeed", DeviceUtils.getNetworkSpeed(context));
                
                RequestBody body = RequestBody.create(
                    MediaType.parse("application/json"),
                    data.toString()
                );
                
                Request request = new Request.Builder()
                        .url(pingUrl)
                        .post(body)
                        .addHeader("x-device-token", deviceToken)
                        .build();
                
                try (Response response = httpClient.newCall(request).execute()) {
                    if (response.isSuccessful()) {
                        lastSuccessfulPing = System.currentTimeMillis();
                        failureCount = 0;
                        Log.d(TAG, "HTTP ping successful");
                    } else {
                        Log.e(TAG, "HTTP ping failed: " + response.code());
                        failureCount++;
                    }
                }
                
            } catch (Exception e) {
                Log.e(TAG, "HTTP ping error", e);
                failureCount++;
            }
        });
    }
    
    private void handleServerCommand(String command, JSONObject data) {
        Log.d(TAG, "Received server command: " + command);
        // Handle commands from server (future implementation)
    }
    
    public void notifySuccessfulConnection() {
        lastSuccessfulPing = System.currentTimeMillis();
        failureCount = 0;
    }
    
    public boolean isRunning() {
        return isRunning;
    }
    
    public String getCurrentMode() {
        return currentMode.name();
    }
}