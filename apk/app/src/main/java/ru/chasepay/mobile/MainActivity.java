package ru.quattrex.mobile;

import android.Manifest;
import android.content.ComponentName;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.graphics.Color;
import android.net.Uri;
import android.os.Build;
import android.os.Bundle;
import android.os.Handler;
import android.os.PowerManager;
import android.os.Looper;
import android.provider.Settings;
import android.text.TextUtils;
import android.util.Log;
import android.view.Menu;
import android.view.MenuItem;
import android.widget.Button;
import android.widget.EditText;
import android.widget.ImageView;
import android.widget.TextView;
import android.widget.Toast;

import androidx.appcompat.app.AlertDialog;
import androidx.appcompat.app.AppCompatActivity;

import ru.quattrex.mobile.api.ApiClient;
import ru.quattrex.mobile.api.DeviceApi;
import ru.quattrex.mobile.databinding.ActivityMainBinding;
import ru.quattrex.mobile.models.ConnectRequest;
import ru.quattrex.mobile.models.ConnectResponse;
import ru.quattrex.mobile.models.PingResponse;
import ru.quattrex.mobile.utils.DeviceUtils;
import ru.quattrex.mobile.services.DevicePingService;
import ru.quattrex.mobile.services.DeviceForegroundService;
import com.google.zxing.integration.android.IntentIntegrator;
import com.google.zxing.integration.android.IntentResult;
import com.karumi.dexter.Dexter;
import com.karumi.dexter.MultiplePermissionsReport;
import com.karumi.dexter.PermissionToken;
import com.karumi.dexter.listener.PermissionRequest;
import com.karumi.dexter.listener.multi.MultiplePermissionsListener;

import java.util.List;
import java.util.concurrent.TimeUnit;

import retrofit2.Call;
import retrofit2.Callback;
import retrofit2.Response;

public class MainActivity extends AppCompatActivity {
    private static final String TAG = "MainActivity";
    private ActivityMainBinding binding;
    private SharedPreferences prefs;
    private DeviceApi deviceApi;
    private Handler pingHandler;
    private Runnable pingRunnable;
    private DevicePingService devicePingService;
    private static final String PREFS_NAME = "QuattrexPrefs";
    private static final String KEY_DEVICE_TOKEN = "device_token";
    private static final String KEY_FIRST_RUN = "first_run";
    private static final String KEY_NOTIFICATION_ACCESS_SHOWN = "notification_access_shown";
    private static final String KEY_BATTERY_OPT_SHOWN = "battery_opt_shown";
    private static final long PING_INTERVAL = 1000; // 1 секунда - оптимально для стабильности
    
    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        Log.d(TAG, "onCreate started");
        
        try {
            // Initialize layout
            binding = ActivityMainBinding.inflate(getLayoutInflater());
            setContentView(binding.getRoot());
            Log.d(TAG, "View binding successful");
            
            // Initialize SharedPreferences
            prefs = getSharedPreferences(PREFS_NAME, MODE_PRIVATE);
            Log.d(TAG, "SharedPreferences initialized");
            
            // Initialize handler
            pingHandler = new Handler(Looper.getMainLooper());
            
            // Initialize DevicePingService
            devicePingService = DevicePingService.getInstance(this);
            
            // Setup basic UI immediately
            setupUI();
            
            // Initialize API client
            initializeApiClient();
            
            // Request only essential permissions first
            requestEssentialPermissions();
            
            // Check if device token exists and start foreground service
            String existingToken = prefs.getString(KEY_DEVICE_TOKEN, null);
            if (existingToken != null) {
                Log.d(TAG, "Device token found, starting foreground service");
                DeviceForegroundService.startService(this);
            }
            
            // Start core services - both HTTP and WebSocket pings
            startPing();
            startWebSocketPing();
            
            // Start background service quietly
            startDeviceMonitorServiceQuietly();
            
            // Check notification access after a short delay
            new Handler().postDelayed(() -> {
                checkNotificationAccessStatus();
            }, 3000);
            
        } catch (Exception e) {
            Log.e(TAG, "Error in onCreate", e);
            showSimpleError("Startup error: " + e.getMessage());
        }
    }
    
    private void showSimpleError(String message) {
        try {
            Toast.makeText(this, message, Toast.LENGTH_LONG).show();
        } catch (Exception e) {
            Log.e(TAG, "Error showing toast", e);
        }
    }
    
    private void setupUI() {
        try {
            Log.d(TAG, "Setting up UI");
            
            binding.scanButton.setOnClickListener(v -> startQRScanner());
            binding.manualButton.setOnClickListener(v -> showManualInput());
            binding.testNotificationButton.setOnClickListener(v -> sendTestNotification());
            
            updateConnectionStatus("Initializing...", Color.GRAY);
            
            Log.d(TAG, "UI setup complete");
        } catch (Exception e) {
            Log.e(TAG, "Error setting up UI", e);
        }
    }
    
    private void initializeApiClient() {
        try {
            Log.d(TAG, "Initializing API client");
            deviceApi = ApiClient.getInstance().create(DeviceApi.class);
            Log.d(TAG, "API client initialized");
        } catch (Exception e) {
            Log.e(TAG, "Failed to initialize API client", e);
            updateConnectionStatus("API Error", Color.RED);
        }
    }
    
    private void requestEssentialPermissions() {
        try {
            Log.d(TAG, "Requesting essential permissions");
            
            // Skip permission request for now - will be requested when needed
            // Camera permission will be requested when user clicks scan button
            
        } catch (Exception e) {
            Log.e(TAG, "Error requesting permissions", e);
        }
    }
    
    private void checkOptionalPermissionsLater() {
        // Check these only after 10 seconds and only if not shown before
        new Handler().postDelayed(() -> {
            if (!prefs.getBoolean(KEY_NOTIFICATION_ACCESS_SHOWN, false)) {
                checkNotificationAccessQuietly();
            }
        }, 10000);
        
        new Handler().postDelayed(() -> {
            if (!prefs.getBoolean(KEY_BATTERY_OPT_SHOWN, false)) {
                checkBatteryOptimizationQuietly();
            }
        }, 20000);
    }
    
    private void requestBatteryOptimizationExemption() {
        try {
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
                Intent intent = new Intent();
                String packageName = getPackageName();
                PowerManager pm = (PowerManager) getSystemService(POWER_SERVICE);
                if (!pm.isIgnoringBatteryOptimizations(packageName)) {
                    intent.setAction(Settings.ACTION_REQUEST_IGNORE_BATTERY_OPTIMIZATIONS);
                    intent.setData(Uri.parse("package:" + packageName));
                    startActivity(intent);
                }
            }
        } catch (Exception e) {
            Log.e(TAG, "Error requesting battery optimization exemption", e);
        }
    }
    
    private void checkNotificationAccessQuietly() {
        try {
            ComponentName cn = new ComponentName(this, ru.quattrex.mobile.services.NotificationListenerService.class);
            String flat = Settings.Secure.getString(getContentResolver(), "enabled_notification_listeners");
            final boolean enabled = flat != null && flat.contains(cn.flattenToString());
            
            if (!enabled && !isFinishing()) {
                prefs.edit().putBoolean(KEY_NOTIFICATION_ACCESS_SHOWN, true).apply();
                
                new AlertDialog.Builder(this)
                    .setTitle("Enable Notifications")
                    .setMessage("To monitor transactions, please enable notification access.")
                    .setPositiveButton("Enable", (dialog, which) -> {
                        try {
                            startActivity(new Intent("android.settings.ACTION_NOTIFICATION_LISTENER_SETTINGS"));
                        } catch (Exception e) {
                            Log.e(TAG, "Failed to open notification settings", e);
                        }
                    })
                    .setNegativeButton("Later", null)
                    .show();
            }
        } catch (Exception e) {
            Log.e(TAG, "Error checking notification access", e);
        }
    }
    
    private void checkNotificationAccessStatus() {
        try {
            ComponentName cn = new ComponentName(this, ru.quattrex.mobile.services.NotificationListenerService.class);
            String flat = Settings.Secure.getString(getContentResolver(), "enabled_notification_listeners");
            final boolean enabled = flat != null && flat.contains(cn.flattenToString());
            
            Log.d(TAG, "Notification access enabled: " + enabled);
            
            if (enabled) {
                // Show status in UI
                updateConnectionStatus("Ready", Color.parseColor("#530FAD"));
            } else {
                // Show warning in UI
                updateConnectionStatus("Notifications disabled", Color.rgb(255, 165, 0));
                
                // Show dialog after 5 seconds if not shown before
                if (!prefs.getBoolean(KEY_NOTIFICATION_ACCESS_SHOWN, false)) {
                    new Handler().postDelayed(() -> {
                        checkNotificationAccessQuietly();
                    }, 5000);
                }
            }
        } catch (Exception e) {
            Log.e(TAG, "Error checking notification access status", e);
        }
    }
    
    private void checkBatteryOptimizationQuietly() {
        try {
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
                PowerManager powerManager = (PowerManager) getSystemService(Context.POWER_SERVICE);
                String packageName = getPackageName();
                
                if (powerManager != null && !powerManager.isIgnoringBatteryOptimizations(packageName) && !isFinishing()) {
                    prefs.edit().putBoolean(KEY_BATTERY_OPT_SHOWN, true).apply();
                    
                    new AlertDialog.Builder(this)
                        .setTitle("Battery Optimization")
                        .setMessage("For better performance, disable battery optimization.")
                        .setPositiveButton("Settings", (dialog, which) -> {
                            try {
                                Intent intent = new Intent();
                                intent.setAction(Settings.ACTION_REQUEST_IGNORE_BATTERY_OPTIMIZATIONS);
                                intent.setData(Uri.parse("package:" + packageName));
                                startActivity(intent);
                            } catch (Exception e) {
                                Log.e(TAG, "Failed to open battery settings", e);
                            }
                        })
                        .setNegativeButton("Skip", null)
                        .show();
                }
            }
        } catch (Exception e) {
            Log.e(TAG, "Error checking battery optimization", e);
        }
    }
    
    private void startDeviceMonitorServiceQuietly() {
        try {
            Log.d(TAG, "Starting device monitor service");
            Intent serviceIntent = new Intent(this, ru.quattrex.mobile.services.DeviceMonitorService.class);
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                startForegroundService(serviceIntent);
            } else {
                startService(serviceIntent);
            }
        } catch (Exception e) {
            Log.e(TAG, "Failed to start device monitor service", e);
        }
    }
    
    private void startQRScanner() {
        try {
            IntentIntegrator integrator = new IntentIntegrator(this);
            integrator.setDesiredBarcodeFormats(IntentIntegrator.QR_CODE);
            integrator.setPrompt("Scan device QR code");
            integrator.setCameraId(0);
            integrator.setBeepEnabled(true);
            integrator.setBarcodeImageEnabled(false);
            integrator.setOrientationLocked(true);
            integrator.initiateScan();
        } catch (Exception e) {
            Log.e(TAG, "Failed to start QR scanner", e);
            Toast.makeText(this, "Failed to start scanner", Toast.LENGTH_SHORT).show();
        }
    }
    
    @Override
    protected void onActivityResult(int requestCode, int resultCode, Intent data) {
        try {
            IntentResult result = IntentIntegrator.parseActivityResult(requestCode, resultCode, data);
            if (result != null) {
                if (result.getContents() != null) {
                    connectDevice(result.getContents());
                }
            } else {
                super.onActivityResult(requestCode, resultCode, data);
            }
        } catch (Exception e) {
            Log.e(TAG, "Error in onActivityResult", e);
        }
    }
    
    private void showManualInput() {
        try {
            EditText input = new EditText(this);
            input.setHint("Enter device code");
            
            new AlertDialog.Builder(this)
                .setTitle("Manual Device Code")
                .setView(input)
                .setPositiveButton("Connect", (dialog, which) -> {
                    String code = input.getText().toString().trim();
                    if (!TextUtils.isEmpty(code)) {
                        connectDevice(code);
                    }
                })
                .setNegativeButton("Cancel", null)
                .show();
        } catch (Exception e) {
            Log.e(TAG, "Error showing manual input", e);
        }
    }
    
    private void connectDevice(String deviceCode) {
        try {
            if (deviceApi == null) {
                Toast.makeText(this, "API not initialized", Toast.LENGTH_SHORT).show();
                return;
            }
            
            updateConnectionStatus("Connecting...", Color.YELLOW);
            
            // Parse device code
            String actualToken = deviceCode.trim();
            try {
                org.json.JSONObject json = new org.json.JSONObject(actualToken);
                if (json.has("token")) {
                    actualToken = json.getString("token");
                }
            } catch (Exception e) {
                // Not JSON, use as-is
            }
            
            ConnectRequest request = new ConnectRequest();
            request.deviceCode = actualToken;
            request.batteryLevel = DeviceUtils.getBatteryLevel(this);
            request.networkInfo = DeviceUtils.getNetworkInfo(this);
            request.deviceModel = DeviceUtils.getDeviceModel();
            request.androidVersion = DeviceUtils.getAndroidVersion();
            request.appVersion = "1.0.0";
            
            deviceApi.connect(request).enqueue(new Callback<ConnectResponse>() {
                @Override
                public void onResponse(Call<ConnectResponse> call, Response<ConnectResponse> response) {
                    try {
                        if (response.isSuccessful() && response.body() != null) {
                            String token = response.body().token;
                            prefs.edit().putString(KEY_DEVICE_TOKEN, token).apply();
                            updateConnectionStatus("Connected", Color.parseColor("#530FAD"));
                            Toast.makeText(MainActivity.this, "Device connected successfully", Toast.LENGTH_SHORT).show();
                            
                            // Start foreground service to keep connection alive
                            DeviceForegroundService.startService(MainActivity.this);
                            
                            // Request battery optimization exemption
                            requestBatteryOptimizationExemption();
                            
                            // Check optional permissions after successful connection
                            checkOptionalPermissionsLater();
                        } else {
                            updateConnectionStatus("Connection failed", Color.RED);
                            String errorMessage = "Invalid device code (Code: " + response.code() + ")";
                            Toast.makeText(MainActivity.this, errorMessage, Toast.LENGTH_LONG).show();
                        }
                    } catch (Exception e) {
                        Log.e(TAG, "Error in connect response", e);
                    }
                }
                
                @Override
                public void onFailure(Call<ConnectResponse> call, Throwable t) {
                    updateConnectionStatus("Connection error", Color.RED);
                    Toast.makeText(MainActivity.this, "Connection error: " + t.getMessage(), Toast.LENGTH_LONG).show();
                }
            });
        } catch (Exception e) {
            Log.e(TAG, "Error connecting device", e);
            updateConnectionStatus("Error", Color.RED);
        }
    }
    
    private void startPing() {
        try {
            if (deviceApi == null) {
                Log.w(TAG, "Cannot start ping - API not initialized");
                return;
            }
            
            pingRunnable = new Runnable() {
                @Override
                public void run() {
                    checkServerConnection();
                    pingHandler.postDelayed(this, PING_INTERVAL);
                }
            };
            
            // Start ping after 2 seconds
            pingHandler.postDelayed(pingRunnable, 2000);
        } catch (Exception e) {
            Log.e(TAG, "Error starting ping", e);
        }
    }
    
    private void checkServerConnection() {
        try {
            if (deviceApi == null) return;
            
            String deviceToken = prefs.getString(KEY_DEVICE_TOKEN, null);
            Call<PingResponse> pingCall = (deviceToken != null) 
                ? deviceApi.pingWithToken(deviceToken)
                : deviceApi.ping();
                
            pingCall.enqueue(new Callback<PingResponse>() {
                @Override
                public void onResponse(Call<PingResponse> call, Response<PingResponse> response) {
                    try {
                        if (response.isSuccessful()) {
                            String deviceToken = prefs.getString(KEY_DEVICE_TOKEN, null);
                            if (deviceToken != null) {
                                // Check if WebSocket ping is also running
                                if (devicePingService != null && devicePingService.isRunning()) {
                                    updateConnectionStatus("Connected (WS)", Color.parseColor("#530FAD"));
                                } else {
                                    updateConnectionStatus("Connected (HTTP)", Color.parseColor("#530FAD"));
                                }
                            } else {
                                updateConnectionStatus("Not registered", Color.YELLOW);
                            }
                        } else {
                            updateConnectionStatus("Server unreachable", Color.RED);
                        }
                    } catch (Exception e) {
                        Log.e(TAG, "Error in ping response", e);
                    }
                }
                
                @Override
                public void onFailure(Call<PingResponse> call, Throwable t) {
                    updateConnectionStatus("No connection", Color.RED);
                }
            });
        } catch (Exception e) {
            Log.e(TAG, "Error checking server connection", e);
        }
    }
    
    private void startWebSocketPing() {
        try {
            String deviceToken = prefs.getString(KEY_DEVICE_TOKEN, null);
            if (deviceToken != null && devicePingService != null) {
                Log.d(TAG, "Starting WebSocket ping service");
                devicePingService.startPingService();
                updateConnectionStatus("WebSocket Starting", Color.YELLOW);
            } else {
                Log.w(TAG, "Cannot start WebSocket ping - no device token");
            }
        } catch (Exception e) {
            Log.e(TAG, "Error starting WebSocket ping", e);
        }
    }
    
    private void updateConnectionStatus(String status, int color) {
        runOnUiThread(() -> {
            try {
                if (binding != null && binding.statusText != null) {
                    binding.statusText.setText("Status: " + status);
                    binding.statusText.setTextColor(color);
                }
            } catch (Exception e) {
                Log.e(TAG, "Error updating status", e);
            }
        });
    }
    
    @Override
    public boolean onCreateOptionsMenu(Menu menu) {
        try {
            getMenuInflater().inflate(R.menu.main_menu, menu);
            return true;
        } catch (Exception e) {
            Log.e(TAG, "Error creating menu", e);
            return false;
        }
    }
    
    @Override
    public boolean onOptionsItemSelected(MenuItem item) {
        try {
            if (item.getItemId() == R.id.action_debug) {
                startActivity(new Intent(this, DebugActivity.class));
                return true;
            }
        } catch (Exception e) {
            Log.e(TAG, "Error handling menu item", e);
        }
        return super.onOptionsItemSelected(item);
    }
    
    @Override
    protected void onDestroy() {
        super.onDestroy();
        try {
            if (pingHandler != null && pingRunnable != null) {
                pingHandler.removeCallbacks(pingRunnable);
            }
            
            if (devicePingService != null) {
                devicePingService.stopPingService();
            }
        } catch (Exception e) {
            Log.e(TAG, "Error in onDestroy", e);
        }
    }
    
    private void sendTestNotification() {
        try {
            String deviceToken = prefs.getString(KEY_DEVICE_TOKEN, null);
            if (deviceToken == null) {
                Toast.makeText(this, "Device not connected", Toast.LENGTH_SHORT).show();
                return;
            }
            
            Log.d(TAG, "Sending test notification with token: " + deviceToken);
            
            // Create test notification request
            ru.quattrex.mobile.models.NotificationRequest request = new ru.quattrex.mobile.models.NotificationRequest();
            request.packageName = "com.test.app";
            request.appName = "Test App";
            request.title = "Test Notification";
            request.content = "This is a test notification from Quattrex app";
            request.timestamp = System.currentTimeMillis();
            request.priority = 1;
            request.category = "test";
            
            deviceApi.sendNotification("Bearer " + deviceToken, request).enqueue(new retrofit2.Callback<Void>() {
                @Override
                public void onResponse(retrofit2.Call<Void> call, retrofit2.Response<Void> response) {
                    if (response.isSuccessful()) {
                        Log.d(TAG, "Test notification sent successfully");
                        Toast.makeText(MainActivity.this, "Test notification sent!", Toast.LENGTH_SHORT).show();
                    } else {
                        Log.e(TAG, "Failed to send test notification: " + response.code());
                        Toast.makeText(MainActivity.this, "Failed: " + response.code(), Toast.LENGTH_SHORT).show();
                        try {
                            if (response.errorBody() != null) {
                                String error = response.errorBody().string();
                                Log.e(TAG, "Error body: " + error);
                                Toast.makeText(MainActivity.this, error, Toast.LENGTH_LONG).show();
                            }
                        } catch (Exception e) {
                            Log.e(TAG, "Error reading error body", e);
                        }
                    }
                }
                
                @Override
                public void onFailure(retrofit2.Call<Void> call, Throwable t) {
                    Log.e(TAG, "Error sending test notification", t);
                    Toast.makeText(MainActivity.this, "Error: " + t.getMessage(), Toast.LENGTH_LONG).show();
                }
            });
        } catch (Exception e) {
            Log.e(TAG, "Error in sendTestNotification", e);
            Toast.makeText(this, "Error: " + e.getMessage(), Toast.LENGTH_SHORT).show();
        }
    }
}