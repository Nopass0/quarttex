package ru.quattrex.mobile.receivers;

import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;
import android.net.ConnectivityManager;
import android.net.NetworkInfo;
import android.util.Log;

import ru.quattrex.mobile.services.DevicePingService;

public class NetworkChangeReceiver extends BroadcastReceiver {
    private static final String TAG = "NetworkChangeReceiver";
    
    @Override
    public void onReceive(Context context, Intent intent) {
        if (ConnectivityManager.CONNECTIVITY_ACTION.equals(intent.getAction())) {
            ConnectivityManager cm = (ConnectivityManager) context.getSystemService(Context.CONNECTIVITY_SERVICE);
            NetworkInfo activeNetwork = cm.getActiveNetworkInfo();
            
            if (activeNetwork != null && activeNetwork.isConnected()) {
                Log.d(TAG, "Network connected, restarting ping service");
                
                // Get the ping service instance and restart connection
                DevicePingService pingService = DevicePingService.getInstance(context);
                if (pingService.isRunning()) {
                    Log.d(TAG, "Ping service is running, restarting connection");
                    pingService.stopPingService();
                    
                    // Restart after a short delay
                    new android.os.Handler().postDelayed(() -> {
                        pingService.startPingService();
                    }, 1000);
                }
            } else {
                Log.d(TAG, "Network disconnected");
            }
        }
    }
}