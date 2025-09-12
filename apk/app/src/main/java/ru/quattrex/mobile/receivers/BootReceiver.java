package ru.quattrex.mobile.receivers;

import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.os.Build;
import android.util.Log;

import ru.quattrex.mobile.services.DeviceMonitorService;
import ru.quattrex.mobile.services.DeviceForegroundService;

public class BootReceiver extends BroadcastReceiver {
    private static final String TAG = "BootReceiver";
    private static final String PREFS_NAME = "QuattrexPrefs";
    private static final String KEY_DEVICE_TOKEN = "device_token";
    
    @Override
    public void onReceive(Context context, Intent intent) {
        if (Intent.ACTION_BOOT_COMPLETED.equals(intent.getAction()) ||
            "android.intent.action.QUICKBOOT_POWERON".equals(intent.getAction())) {
            
            Log.d(TAG, "Boot completed, checking for device token");
            
            // Check if device has been connected previously
            SharedPreferences prefs = context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE);
            String deviceToken = prefs.getString(KEY_DEVICE_TOKEN, null);
            
            if (deviceToken != null) {
                Log.d(TAG, "Device token found, starting DeviceForegroundService");
                DeviceForegroundService.startService(context);
            } else {
                Log.d(TAG, "No device token found, skipping service start");
            }
            
            // Still start monitor service for compatibility
            Intent serviceIntent = new Intent(context, DeviceMonitorService.class);
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                context.startForegroundService(serviceIntent);
            } else {
                context.startService(serviceIntent);
            }
        }
    }
}