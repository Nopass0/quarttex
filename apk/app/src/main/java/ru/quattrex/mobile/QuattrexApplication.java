package ru.quattrex.mobile;

import android.app.Application;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.content.Intent;
import android.os.Build;
import android.util.Log;

import ru.quattrex.mobile.services.DeviceMonitorService;

public class QuattrexApplication extends Application {
    private static final String TAG = "QuattrexApplication";
    public static final String CHANNEL_ID = "quattrex_service_channel";
    
    @Override
    public void onCreate() {
        super.onCreate();
        try {
            Log.d(TAG, "Application onCreate started");
            
            // Set up crash handler
            Thread.setDefaultUncaughtExceptionHandler(new Thread.UncaughtExceptionHandler() {
                @Override
                public void uncaughtException(Thread thread, Throwable throwable) {
                    Log.e(TAG, "Uncaught exception: ", throwable);
                    // Let the default handler handle it
                    System.exit(1);
                }
            });
            
            // Create notification channel
            createNotificationChannelSafely();
            
            Log.d(TAG, "Application onCreate completed successfully");
        } catch (Exception e) {
            Log.e(TAG, "Error in onCreate: " + e.getMessage(), e);
            // Don't crash the app on Application onCreate
        }
    }
    
    private void createNotificationChannelSafely() {
        try {
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                NotificationChannel serviceChannel = new NotificationChannel(
                    CHANNEL_ID,
                    "Quattrex Service Channel",
                    NotificationManager.IMPORTANCE_DEFAULT
                );
                serviceChannel.setDescription("Quattrex device monitoring service");
                serviceChannel.setShowBadge(false);
                serviceChannel.setSound(null, null);
                
                NotificationManager manager = getSystemService(NotificationManager.class);
                if (manager != null) {
                    manager.createNotificationChannel(serviceChannel);
                    Log.d(TAG, "Notification channel created");
                } else {
                    Log.w(TAG, "NotificationManager is null");
                }
            }
        } catch (Exception e) {
            Log.e(TAG, "Error creating notification channel", e);
        }
    }
}