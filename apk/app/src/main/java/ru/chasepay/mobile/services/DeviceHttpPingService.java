package ru.quattrex.mobile.services;

import android.content.Context;
import android.content.SharedPreferences;
import android.os.Handler;
import android.os.Looper;
import android.util.Log;

import org.json.JSONObject;

import java.io.IOException;
import java.util.concurrent.TimeUnit;

import okhttp3.MediaType;
import okhttp3.OkHttpClient;
import okhttp3.Request;
import okhttp3.RequestBody;
import okhttp3.Response;
import ru.quattrex.mobile.utils.DeviceUtils;

public class DeviceHttpPingService {
    private static final String TAG = "DeviceHttpPingService";
    private static final String PREFS_NAME = "QuattrexPrefs";
    private static final String KEY_DEVICE_TOKEN = "device_token";
    
    // Ping every 5 seconds via HTTP
    private static final long PING_INTERVAL = TimeUnit.SECONDS.toMillis(5);
    
    private Context context;
    private OkHttpClient client;
    private Handler handler;
    private Runnable pingRunnable;
    private SharedPreferences prefs;
    private boolean isRunning = false;
    
    private static DeviceHttpPingService instance;
    
    public static synchronized DeviceHttpPingService getInstance(Context context) {
        if (instance == null) {
            instance = new DeviceHttpPingService(context.getApplicationContext());
        }
        return instance;
    }
    
    private DeviceHttpPingService(Context context) {
        this.context = context;
        this.prefs = context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE);
        this.handler = new Handler(Looper.getMainLooper());
        
        this.client = new OkHttpClient.Builder()
                .connectTimeout(10, TimeUnit.SECONDS)
                .readTimeout(10, TimeUnit.SECONDS)
                .writeTimeout(10, TimeUnit.SECONDS)
                .build();
    }
    
    public void startPingService() {
        if (isRunning) {
            Log.d(TAG, "HTTP ping service already running");
            return;
        }
        
        String deviceToken = prefs.getString(KEY_DEVICE_TOKEN, null);
        if (deviceToken == null) {
            Log.w(TAG, "Cannot start HTTP ping service - no device token");
            return;
        }
        
        Log.d(TAG, "Starting HTTP ping service");
        isRunning = true;
        
        startPingLoop();
    }
    
    public void stopPingService() {
        Log.d(TAG, "Stopping HTTP ping service");
        isRunning = false;
        
        if (handler != null && pingRunnable != null) {
            handler.removeCallbacks(pingRunnable);
        }
    }
    
    private void startPingLoop() {
        pingRunnable = new Runnable() {
            @Override
            public void run() {
                if (isRunning) {
                    sendHttpPing();
                    handler.postDelayed(this, PING_INTERVAL);
                }
            }
        };
        
        // Start pinging immediately
        handler.post(pingRunnable);
    }
    
    private void sendHttpPing() {
        try {
            String deviceToken = prefs.getString(KEY_DEVICE_TOKEN, null);
            if (deviceToken == null) {
                return;
            }
            
            String baseUrl = ru.quattrex.mobile.BuildConfig.BASE_URL;
            String pingUrl = baseUrl.replace("/api", "") + "/api/device/health-check";
            
            JSONObject pingData = new JSONObject();
            pingData.put("batteryLevel", getBatteryLevel());
            pingData.put("networkSpeed", getNetworkSpeed());
            
            RequestBody body = RequestBody.create(
                MediaType.parse("application/json"),
                pingData.toString()
            );
            
            Request request = new Request.Builder()
                    .url(pingUrl)
                    .post(body)
                    .addHeader("x-device-token", deviceToken)
                    .addHeader("Content-Type", "application/json")
                    .build();
            
            try (Response response = client.newCall(request).execute()) {
                if (response.isSuccessful()) {
                    Log.d(TAG, "HTTP ping sent successfully");
                } else {
                    Log.e(TAG, "HTTP ping failed: " + response.code());
                }
            }
            
        } catch (Exception e) {
            Log.e(TAG, "Error sending HTTP ping", e);
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
    
    public boolean isRunning() {
        return isRunning;
    }
}