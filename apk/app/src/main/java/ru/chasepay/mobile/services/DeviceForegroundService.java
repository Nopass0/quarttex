package ru.quattrex.mobile.services;

import android.app.Notification;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.app.Service;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.os.Build;
import android.os.Handler;
import android.os.IBinder;
import android.os.PowerManager;
import android.util.Log;

import androidx.core.app.NotificationCompat;

import ru.quattrex.mobile.MainActivity;
import ru.quattrex.mobile.R;

public class DeviceForegroundService extends Service {
    private static final String TAG = "DeviceForegroundService";
    private static final String CHANNEL_ID = "DeviceServiceChannel";
    private static final int NOTIFICATION_ID = 1;
    private static final String PREFS_NAME = "QuattrexPrefs";
    private static final String KEY_DEVICE_TOKEN = "device_token";
    
    private PowerManager.WakeLock wakeLock;
    private UniversalConnectionService connectionService;
    private SharedPreferences prefs;
    private Handler handler;
    private Runnable wakeLockRenewer;
    
    @Override
    public void onCreate() {
        super.onCreate();
        Log.d(TAG, "Service created");
        
        prefs = getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE);
        handler = new Handler();
        
        // Initialize universal connection service
        connectionService = UniversalConnectionService.getInstance(this);
        
        // Acquire wake lock to keep CPU running
        PowerManager powerManager = (PowerManager) getSystemService(POWER_SERVICE);
        wakeLock = powerManager.newWakeLock(
            PowerManager.PARTIAL_WAKE_LOCK | PowerManager.ACQUIRE_CAUSES_WAKEUP,
            "QuattrexPay::DeviceServiceWakelock"
        );
        wakeLock.acquire(10*60*1000L); // Hold for 10 minutes, will renew
        
        // Schedule wake lock renewal every 9 minutes
        wakeLockRenewer = new Runnable() {
            @Override
            public void run() {
                if (wakeLock != null) {
                    Log.d(TAG, "Renewing wake lock");
                    try {
                        if (wakeLock.isHeld()) {
                            wakeLock.release();
                        }
                        wakeLock.acquire(10*60*1000L);
                    } catch (Exception e) {
                        Log.e(TAG, "Error renewing wake lock", e);
                    }
                }
                handler.postDelayed(this, 9*60*1000L); // Renew every 9 minutes
            }
        };
        handler.postDelayed(wakeLockRenewer, 9*60*1000L);
        
        createNotificationChannel();
        startForeground(NOTIFICATION_ID, createNotification());
    }
    
    @Override
    public int onStartCommand(Intent intent, int flags, int startId) {
        Log.d(TAG, "Service started");
        
        // Check if we have a device token
        String deviceToken = prefs.getString(KEY_DEVICE_TOKEN, null);
        if (deviceToken != null) {
            // Start universal connection service
            Log.d(TAG, "Starting connection service with existing token: " + deviceToken);
            connectionService.start();
        } else {
            Log.w(TAG, "No device token found");
        }
        
        // Return START_STICKY to ensure service restarts if killed
        return START_STICKY;
    }
    
    @Override
    public void onDestroy() {
        super.onDestroy();
        Log.d(TAG, "Service destroyed");
        
        // Cancel wake lock renewer
        if (handler != null && wakeLockRenewer != null) {
            handler.removeCallbacks(wakeLockRenewer);
        }
        
        // Stop connection service
        if (connectionService != null) {
            connectionService.stop();
        }
        
        // Release wake lock
        if (wakeLock != null && wakeLock.isHeld()) {
            wakeLock.release();
        }
        
        // Restart service if device token exists
        String deviceToken = prefs.getString(KEY_DEVICE_TOKEN, null);
        if (deviceToken != null) {
            Log.d(TAG, "Device token exists, scheduling service restart");
            handler.postDelayed(() -> {
                startService(this);
            }, 5000); // Restart after 5 seconds
        }
    }
    
    @Override
    public IBinder onBind(Intent intent) {
        return null;
    }
    
    private void createNotificationChannel() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            NotificationChannel serviceChannel = new NotificationChannel(
                CHANNEL_ID,
                "Device Service Channel",
                NotificationManager.IMPORTANCE_LOW
            );
            serviceChannel.setDescription("Keeps device connected to QuattrexPay");
            
            NotificationManager manager = getSystemService(NotificationManager.class);
            manager.createNotificationChannel(serviceChannel);
        }
    }
    
    private Notification createNotification() {
        Intent notificationIntent = new Intent(this, MainActivity.class);
        PendingIntent pendingIntent = PendingIntent.getActivity(
            this,
            0,
            notificationIntent,
            PendingIntent.FLAG_IMMUTABLE
        );
        
        return new NotificationCompat.Builder(this, CHANNEL_ID)
            .setContentTitle("QuattrexPay")
            .setContentText("Устройство подключено")
            .setSmallIcon(R.drawable.ic_notification)
            .setContentIntent(pendingIntent)
            .setOngoing(true)
            .setPriority(NotificationCompat.PRIORITY_HIGH) // Changed to HIGH priority
            .setCategory(NotificationCompat.CATEGORY_SERVICE)
            .setVisibility(NotificationCompat.VISIBILITY_PUBLIC)
            .build();
    }
    
    // Static method to start the service
    public static void startService(Context context) {
        Intent serviceIntent = new Intent(context, DeviceForegroundService.class);
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            context.startForegroundService(serviceIntent);
        } else {
            context.startService(serviceIntent);
        }
    }
    
    // Static method to stop the service
    public static void stopService(Context context) {
        Intent serviceIntent = new Intent(context, DeviceForegroundService.class);
        context.stopService(serviceIntent);
    }
}