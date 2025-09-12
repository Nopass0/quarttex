package ru.quattrex.mobile;

import android.Manifest;
import ru.quattrex.mobile.BuildConfig;
import android.content.Intent;
import android.content.pm.PackageManager;
import android.net.Uri;
import android.os.Build;
import android.os.Bundle;
import android.os.PowerManager;
import android.provider.Settings;
import android.view.View;
import android.widget.Button;
import android.widget.CompoundButton;
import android.widget.LinearLayout;
import android.widget.Switch;
import android.widget.TextView;
import android.widget.Toast;

import androidx.annotation.NonNull;
import androidx.appcompat.app.AppCompatActivity;
import androidx.core.app.ActivityCompat;
import androidx.core.content.ContextCompat;

import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import android.provider.Settings.Secure;
import android.content.ComponentName;
import android.text.TextUtils;

public class PermissionsActivity extends AppCompatActivity {

    private static final int PERMISSION_REQUEST_CODE = 1001;
    private static final int BATTERY_OPTIMIZATION_REQUEST_CODE = 1002;
    private static final int NOTIFICATION_ACCESS_REQUEST_CODE = 1003;
    private static final int LOCATION_BACKGROUND_REQUEST_CODE = 1004;
    
    private Button continueButton;
    private LinearLayout permissionsContainer;
    private Map<String, Switch> permissionSwitches = new HashMap<>();
    private Map<String, Boolean> permissionStates = new HashMap<>();
    
    private static final String[] REQUIRED_PERMISSIONS = {
        Manifest.permission.ACCESS_WIFI_STATE,
        Manifest.permission.RECEIVE_SMS,
        Manifest.permission.READ_SMS,
        Manifest.permission.ACCESS_FINE_LOCATION,
        Manifest.permission.ACCESS_COARSE_LOCATION,
        Manifest.permission.POST_NOTIFICATIONS,
        Manifest.permission.CAMERA
    };
    
    private static final Map<String, String> PERMISSION_NAMES = new HashMap<String, String>() {{
        put(Manifest.permission.ACCESS_WIFI_STATE, "Доступ к состоянию Wi-Fi");
        put("BATTERY_OPTIMIZATION", "Игнорирование оптимизации батареи");
        put(Manifest.permission.RECEIVE_SMS, "Доступ к получению SMS");
        put(Manifest.permission.READ_SMS, "Доступ к просмотру SMS");
        put(Manifest.permission.ACCESS_FINE_LOCATION, "Доступ к точному местоположению");
        put(Manifest.permission.ACCESS_COARSE_LOCATION, "Доступ к приблизительному местоположению");
        put(Manifest.permission.ACCESS_BACKGROUND_LOCATION, "Доступ к местоположению в фоновом режиме");
        put("LOCATION_SERVICE", "Доступ к местоположению в сервисном режиме");
        put(Manifest.permission.POST_NOTIFICATIONS, "Разрешение на отправку уведомлений");
        put("NOTIFICATION_ACCESS", "Доступ к уведомлениям");
        put(Manifest.permission.CAMERA, "Доступ к камере");
    }};
    
    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        setContentView(R.layout.activity_permissions);
        
        continueButton = findViewById(R.id.continueButton);
        permissionsContainer = findViewById(R.id.permissionsContainer);
        
        continueButton.setOnClickListener(v -> {
            if (areAllPermissionsGranted()) {
                startMainActivity();
            } else {
                Toast.makeText(this, "Необходимо включить все разрешения", Toast.LENGTH_SHORT).show();
            }
        });
        
        setupPermissionSwitches();
        updateContinueButtonState();
    }
    
    private void setupPermissionSwitches() {
        // Обычные разрешения
        for (String permission : REQUIRED_PERMISSIONS) {
            addPermissionSwitch(permission, PERMISSION_NAMES.get(permission));
        }
        
        // Специальные разрешения
        addPermissionSwitch("BATTERY_OPTIMIZATION", PERMISSION_NAMES.get("BATTERY_OPTIMIZATION"));
        addPermissionSwitch("NOTIFICATION_ACCESS", PERMISSION_NAMES.get("NOTIFICATION_ACCESS"));
        
        // Background location (API 29+)
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
            addPermissionSwitch(Manifest.permission.ACCESS_BACKGROUND_LOCATION, 
                PERMISSION_NAMES.get(Manifest.permission.ACCESS_BACKGROUND_LOCATION));
        }
        
        // Location service permission (skip in debug builds)
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.P && !BuildConfig.DEBUG) {
            addPermissionSwitch("LOCATION_SERVICE", PERMISSION_NAMES.get("LOCATION_SERVICE"));
        }
        
        updateAllSwitchStates();
    }
    
    private void addPermissionSwitch(String permission, String displayName) {
        View switchView = getLayoutInflater().inflate(R.layout.permission_switch_item, null);
        TextView permissionName = switchView.findViewById(R.id.permissionName);
        Switch permissionSwitch = switchView.findViewById(R.id.permissionSwitch);
        
        permissionName.setText(displayName);
        permissionSwitch.setOnCheckedChangeListener((buttonView, isChecked) -> {
            if (isChecked) {
                requestPermission(permission);
            }
        });
        
        permissionSwitches.put(permission, permissionSwitch);
        permissionsContainer.addView(switchView);
    }
    
    private void updateAllSwitchStates() {
        for (Map.Entry<String, Switch> entry : permissionSwitches.entrySet()) {
            String permission = entry.getKey();
            Switch switchView = entry.getValue();
            
            boolean isGranted = isPermissionGranted(permission);
            permissionStates.put(permission, isGranted);
            switchView.setChecked(isGranted);
            switchView.setEnabled(!isGranted);
        }
        updateContinueButtonState();
    }
    
    private boolean isPermissionGranted(String permission) {
        switch (permission) {
            case "BATTERY_OPTIMIZATION":
                PowerManager pm = (PowerManager) getSystemService(POWER_SERVICE);
                return pm != null && pm.isIgnoringBatteryOptimizations(getPackageName());
                
            case "NOTIFICATION_ACCESS":
                return isNotificationServiceEnabled();
                
            case "LOCATION_SERVICE":
                return Build.VERSION.SDK_INT < Build.VERSION_CODES.P || 
                       ContextCompat.checkSelfPermission(this, Manifest.permission.FOREGROUND_SERVICE_LOCATION) 
                       == PackageManager.PERMISSION_GRANTED;
                
            default:
                return ContextCompat.checkSelfPermission(this, permission) == PackageManager.PERMISSION_GRANTED;
        }
    }
    
    private void requestPermission(String permission) {
        switch (permission) {
            case "BATTERY_OPTIMIZATION":
                requestBatteryOptimizationExemption();
                break;
                
            case "NOTIFICATION_ACCESS":
                requestNotificationAccess();
                break;
                
            case Manifest.permission.ACCESS_BACKGROUND_LOCATION:
                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
                    requestBackgroundLocationPermission();
                }
                break;
                
            case "LOCATION_SERVICE":
                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.P) {
                    ActivityCompat.requestPermissions(this, 
                        new String[]{Manifest.permission.FOREGROUND_SERVICE_LOCATION}, 
                        PERMISSION_REQUEST_CODE);
                }
                break;
                
            default:
                ActivityCompat.requestPermissions(this, new String[]{permission}, PERMISSION_REQUEST_CODE);
                break;
        }
    }
    
    private void requestBatteryOptimizationExemption() {
        Intent intent = new Intent();
        intent.setAction(Settings.ACTION_REQUEST_IGNORE_BATTERY_OPTIMIZATIONS);
        intent.setData(Uri.parse("package:" + getPackageName()));
        startActivityForResult(intent, BATTERY_OPTIMIZATION_REQUEST_CODE);
    }
    
    private void requestNotificationAccess() {
        Intent intent = new Intent(Settings.ACTION_NOTIFICATION_LISTENER_SETTINGS);
        startActivityForResult(intent, NOTIFICATION_ACCESS_REQUEST_CODE);
    }
    
    private void requestBackgroundLocationPermission() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
            if (ContextCompat.checkSelfPermission(this, Manifest.permission.ACCESS_FINE_LOCATION) 
                == PackageManager.PERMISSION_GRANTED) {
                ActivityCompat.requestPermissions(this, 
                    new String[]{Manifest.permission.ACCESS_BACKGROUND_LOCATION}, 
                    LOCATION_BACKGROUND_REQUEST_CODE);
            } else {
                Toast.makeText(this, "Сначала предоставьте доступ к местоположению", Toast.LENGTH_SHORT).show();
            }
        }
    }
    
    @Override
    public void onRequestPermissionsResult(int requestCode, @NonNull String[] permissions, 
                                          @NonNull int[] grantResults) {
        super.onRequestPermissionsResult(requestCode, permissions, grantResults);
        updateAllSwitchStates();
    }
    
    @Override
    protected void onActivityResult(int requestCode, int resultCode, Intent data) {
        super.onActivityResult(requestCode, resultCode, data);
        updateAllSwitchStates();
    }
    
    @Override
    protected void onResume() {
        super.onResume();
        updateAllSwitchStates();
    }
    
    private boolean areAllPermissionsGranted() {
        for (String permission : permissionSwitches.keySet()) {
            // Skip LOCATION_SERVICE check in debug builds
            if (BuildConfig.DEBUG && "LOCATION_SERVICE".equals(permission)) {
                continue;
            }
            if (!isPermissionGranted(permission)) {
                return false;
            }
        }
        return true;
    }
    
    private void updateContinueButtonState() {
        continueButton.setEnabled(areAllPermissionsGranted());
        continueButton.setAlpha(areAllPermissionsGranted() ? 1.0f : 0.5f);
    }
    
    private void startMainActivity() {
        // Сохраняем флаг, что разрешения предоставлены
        getSharedPreferences("QuattrexApp", MODE_PRIVATE)
            .edit()
            .putBoolean("permissions_granted", true)
            .apply();
            
        Intent intent = new Intent(this, MainActivity.class);
        startActivity(intent);
        finish();
    }
    
    private boolean isNotificationServiceEnabled() {
        String packageName = getPackageName();
        String flat = Secure.getString(getContentResolver(), "enabled_notification_listeners");
        if (!TextUtils.isEmpty(flat)) {
            String[] names = flat.split(":");
            for (String name : names) {
                ComponentName cn = ComponentName.unflattenFromString(name);
                if (cn != null && TextUtils.equals(packageName, cn.getPackageName())) {
                    return true;
                }
            }
        }
        return false;
    }
}