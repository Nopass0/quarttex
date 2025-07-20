package com.chase.mobile.services;

import android.app.Notification;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.app.Service;
import android.content.Intent;
import android.content.SharedPreferences;
import android.os.Build;
import android.os.Handler;
import android.os.IBinder;
import android.os.Looper;
import android.util.Log;

import androidx.core.app.NotificationCompat;

import com.chase.mobile.MainActivity;
import com.chase.mobile.R;
import com.chase.mobile.api.ApiClient;
import com.chase.mobile.api.DeviceApi;
import com.chase.mobile.models.DeviceInfoRequest;
import com.chase.mobile.utils.DeviceUtils;
import com.chase.mobile.utils.UpdateChecker;

import java.util.concurrent.TimeUnit;

import retrofit2.Call;
import retrofit2.Callback;
import retrofit2.Response;

public class DeviceMonitorService extends Service {
    private static final String TAG = "DeviceMonitor";
    private static final String CHANNEL_ID = "chase_monitor";
    private static final int NOTIFICATION_ID = 1;
    private static final long UPDATE_INTERVAL = TimeUnit.SECONDS.toMillis(5);
    private static final long UPDATE_CHECK_INTERVAL = TimeUnit.MINUTES.toMillis(30);
    
    private DeviceApi deviceApi;
    private SharedPreferences prefs;
    private Handler handler;
    private Runnable updateRunnable;
    private Runnable updateCheckRunnable;
    
    @Override
    public void onCreate() {
        super.onCreate();
        deviceApi = ApiClient.getInstance().create(DeviceApi.class);
        prefs = getSharedPreferences("ChasePrefs", MODE_PRIVATE);
        handler = new Handler(Looper.getMainLooper());
        
        createNotificationChannel();
        startForeground(NOTIFICATION_ID, createNotification());
        
        startDeviceUpdates();
        startUpdateChecks();
    }
    
    private void createNotificationChannel() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            NotificationChannel channel = new NotificationChannel(
                CHANNEL_ID,
                "Chase Monitor Service",
                NotificationManager.IMPORTANCE_LOW
            );
            channel.setDescription("Monitors device status");
            
            NotificationManager manager = getSystemService(NotificationManager.class);
            if (manager != null) {
                manager.createNotificationChannel(channel);
            }
        }
    }
    
    private Notification createNotification() {
        Intent notificationIntent = new Intent(this, MainActivity.class);
        PendingIntent pendingIntent = PendingIntent.getActivity(this, 0, 
            notificationIntent, PendingIntent.FLAG_IMMUTABLE);
        
        return new NotificationCompat.Builder(this, CHANNEL_ID)
            .setContentTitle("Chase Device Monitor")
            .setContentText("Monitoring device status...")
            .setSmallIcon(R.drawable.ic_notification)
            .setContentIntent(pendingIntent)
            .setOngoing(true)
            .build();
    }
    
    private void startDeviceUpdates() {
        updateRunnable = new Runnable() {
            @Override
            public void run() {
                sendDeviceUpdate();
                handler.postDelayed(this, UPDATE_INTERVAL);
            }
        };
        handler.post(updateRunnable);
    }
    
    private void startUpdateChecks() {
        updateCheckRunnable = new Runnable() {
            @Override
            public void run() {
                checkForUpdates();
                handler.postDelayed(this, UPDATE_CHECK_INTERVAL);
            }
        };
        handler.postDelayed(updateCheckRunnable, UPDATE_CHECK_INTERVAL);
    }
    
    private void sendDeviceUpdate() {
        String deviceToken = prefs.getString("device_token", null);
        if (deviceToken == null) {
            Log.w(TAG, "No device token, skipping update");
            return;
        }
        
        DeviceInfoRequest request = new DeviceInfoRequest();
        request.batteryLevel = DeviceUtils.getBatteryLevel(this);
        request.isCharging = DeviceUtils.isCharging(this);
        request.networkInfo = DeviceUtils.getNetworkInfo(this);
        request.networkSpeed = DeviceUtils.getNetworkSpeed(this);
        request.timestamp = System.currentTimeMillis();
        request.deviceModel = DeviceUtils.getDeviceModel();
        request.androidVersion = DeviceUtils.getAndroidVersion();
        request.appVersion = DeviceUtils.getAppVersion(this);
        
        deviceApi.updateInfo("Bearer " + deviceToken, request).enqueue(new Callback<Void>() {
            @Override
            public void onResponse(Call<Void> call, Response<Void> response) {
                if (response.isSuccessful()) {
                    Log.d(TAG, "Device info updated successfully");
                } else {
                    Log.e(TAG, "Failed to update device info: " + response.code());
                }
            }
            
            @Override
            public void onFailure(Call<Void> call, Throwable t) {
                Log.e(TAG, "Error updating device info", t);
            }
        });
    }
    
    private void checkForUpdates() {
        UpdateChecker.checkForUpdate(this);
    }
    
    @Override
    public int onStartCommand(Intent intent, int flags, int startId) {
        return START_STICKY;
    }
    
    @Override
    public void onDestroy() {
        super.onDestroy();
        if (handler != null) {
            if (updateRunnable != null) {
                handler.removeCallbacks(updateRunnable);
            }
            if (updateCheckRunnable != null) {
                handler.removeCallbacks(updateCheckRunnable);
            }
        }
    }
    
    @Override
    public IBinder onBind(Intent intent) {
        return null;
    }
}