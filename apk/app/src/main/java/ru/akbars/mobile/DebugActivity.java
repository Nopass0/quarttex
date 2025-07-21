package ru.akbars.mobile;

import android.app.Notification;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.content.Context;
import android.content.SharedPreferences;
import android.os.Build;
import android.os.Bundle;
import android.widget.Button;
import android.widget.TextView;
import android.widget.Toast;
import android.content.pm.PackageInfo;
import android.content.pm.PackageManager;

import androidx.appcompat.app.AppCompatActivity;
import androidx.core.app.NotificationCompat;

import ru.akbars.mobile.databinding.ActivityDebugBinding;

public class DebugActivity extends AppCompatActivity {
    private ActivityDebugBinding binding;
    private SharedPreferences prefs;
    
    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        binding = ActivityDebugBinding.inflate(getLayoutInflater());
        setContentView(binding.getRoot());
        
        setTitle("Отладка");
        if (getSupportActionBar() != null) {
            getSupportActionBar().setDisplayHomeAsUpEnabled(true);
        }
        
        prefs = getSharedPreferences("ChasePrefs", MODE_PRIVATE);
        displayDebugInfo();
    }
    
    private void displayDebugInfo() {
        StringBuilder info = new StringBuilder();
        
        String versionName = "Unknown";
        int versionCode = 0;
        try {
            PackageInfo pInfo = getPackageManager().getPackageInfo(getPackageName(), 0);
            versionName = pInfo.versionName;
            versionCode = pInfo.versionCode;
        } catch (PackageManager.NameNotFoundException e) {
            e.printStackTrace();
        }
        
        info.append("=== ИНФОРМАЦИЯ О ПРИЛОЖЕНИИ ===\n");
        info.append("Версия: ").append(versionName).append("\n");
        info.append("Код версии: ").append(versionCode).append("\n");
        info.append("Тип сборки: ").append(BuildConfig.BUILD_TYPE).append("\n");
        info.append("Базовый URL: ").append(BuildConfig.BASE_URL).append("\n\n");
        
        info.append("=== ИНФОРМАЦИЯ ОБ УСТРОЙСТВЕ ===\n");
        info.append("Токен устройства: ").append(prefs.getString("device_token", "Не подключено")).append("\n");
        info.append("Модель: ").append(android.os.Build.MODEL).append("\n");
        info.append("Производитель: ").append(android.os.Build.MANUFACTURER).append("\n");
        info.append("Версия Android: ").append(android.os.Build.VERSION.RELEASE).append("\n");
        info.append("SDK Int: ").append(android.os.Build.VERSION.SDK_INT).append("\n\n");
        
        info.append("=== РАЗРЕШЕНИЯ ===\n");
        info.append("Проверьте настройки приложения для статуса разрешений\n");
        
        // Add test notification button
        binding.testNotificationButton.setOnClickListener(v -> createTestNotification());
        
        binding.debugText.setText(info.toString());
    }
    
    private void createTestNotification() {
        String channelId = "test_channel";
        String channelName = "Тестовые уведомления";
        
        NotificationManager notificationManager = (NotificationManager) getSystemService(Context.NOTIFICATION_SERVICE);
        
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            NotificationChannel channel = new NotificationChannel(channelId, channelName, NotificationManager.IMPORTANCE_HIGH);
            channel.setDescription("Канал для тестовых уведомлений");
            notificationManager.createNotificationChannel(channel);
        }
        
        NotificationCompat.Builder builder = new NotificationCompat.Builder(this, channelId)
                .setSmallIcon(android.R.drawable.ic_dialog_info)
                .setContentTitle("Сбербанк")
                .setContentText("Поступление 1500.00 ₽ от *1234")
                .setPriority(NotificationCompat.PRIORITY_HIGH)
                .setAutoCancel(true)
                .setDefaults(Notification.DEFAULT_ALL);
        
        notificationManager.notify(12345, builder.build());
        
        Toast.makeText(this, "Тестовое уведомление создано", Toast.LENGTH_SHORT).show();
    }
    
    @Override
    public boolean onSupportNavigateUp() {
        finish();
        return true;
    }
}