package ru.quattrex.mobile.receivers;

import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.os.Bundle;
import android.telephony.SmsMessage;
import android.util.Log;

import ru.quattrex.mobile.api.ApiClient;
import ru.quattrex.mobile.api.DeviceApi;
import ru.quattrex.mobile.models.NotificationRequest;

import retrofit2.Call;
import retrofit2.Callback;
import retrofit2.Response;

public class SmsReceiver extends BroadcastReceiver {
    private static final String TAG = "SmsReceiver";
    private static final String PREFS_NAME = "QuattrexPrefs";
    private static final String KEY_DEVICE_TOKEN = "device_token";
    
    @Override
    public void onReceive(Context context, Intent intent) {
        Log.d(TAG, "SMS received");
        
        if (intent.getAction() != null && intent.getAction().equals("android.provider.Telephony.SMS_RECEIVED")) {
            Bundle bundle = intent.getExtras();
            if (bundle != null) {
                try {
                    Object[] pdus = (Object[]) bundle.get("pdus");
                    if (pdus != null) {
                        for (Object pdu : pdus) {
                            SmsMessage smsMessage = SmsMessage.createFromPdu((byte[]) pdu);
                            
                            String sender = smsMessage.getDisplayOriginatingAddress();
                            String messageBody = smsMessage.getMessageBody();
                            long timestamp = smsMessage.getTimestampMillis();
                            
                            Log.d(TAG, "SMS from: " + sender + ", message: " + messageBody);
                            
                            // Send SMS to server
                            sendSmsToServer(context, sender, messageBody, timestamp);
                        }
                    }
                } catch (Exception e) {
                    Log.e(TAG, "Error processing SMS", e);
                }
            }
        }
    }
    
    private void sendSmsToServer(Context context, String sender, String message, long timestamp) {
        SharedPreferences prefs = context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE);
        String deviceToken = prefs.getString(KEY_DEVICE_TOKEN, null);
        
        if (deviceToken == null) {
            Log.w(TAG, "No device token, skipping SMS send");
            return;
        }
        
        try {
            DeviceApi deviceApi = ApiClient.getInstance().create(DeviceApi.class);
            
            // Send SMS as notification
            NotificationRequest request = new NotificationRequest();
            request.packageName = "android.provider.Telephony";
            request.appName = "SMS";
            request.title = "SMS from " + sender;
            request.content = message;
            request.timestamp = timestamp;
            request.priority = 1;
            request.category = "sms";
            
            Log.d(TAG, "Sending SMS as notification to server...");
            
            deviceApi.sendNotification("Bearer " + deviceToken, request).enqueue(new Callback<Void>() {
                @Override
                public void onResponse(Call<Void> call, Response<Void> response) {
                    if (response.isSuccessful()) {
                        Log.d(TAG, "SMS sent successfully as notification");
                    } else {
                        Log.e(TAG, "Failed to send SMS: " + response.code());
                        try {
                            if (response.errorBody() != null) {
                                Log.e(TAG, "Error body: " + response.errorBody().string());
                            }
                        } catch (Exception e) {
                            Log.e(TAG, "Error reading error body", e);
                        }
                    }
                }
                
                @Override
                public void onFailure(Call<Void> call, Throwable t) {
                    Log.e(TAG, "Error sending SMS as notification", t);
                }
            });
        } catch (Exception e) {
            Log.e(TAG, "Error creating API call", e);
        }
    }
}