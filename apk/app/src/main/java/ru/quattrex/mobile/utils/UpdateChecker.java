package ru.quattrex.mobile.utils;

import android.app.DownloadManager;
import android.content.Context;
import android.content.Intent;
import android.content.pm.PackageInfo;
import android.net.Uri;
import android.os.Build;
import android.os.Environment;
import android.util.Log;
import android.widget.Toast;

import androidx.appcompat.app.AlertDialog;
import androidx.core.content.FileProvider;

import ru.quattrex.mobile.BuildConfig;
import ru.quattrex.mobile.api.ApiClient;
import ru.quattrex.mobile.api.DeviceApi;
import ru.quattrex.mobile.models.AppVersion;

import java.io.File;

import retrofit2.Call;
import retrofit2.Callback;
import retrofit2.Response;

public class UpdateChecker {
    private static final String TAG = "UpdateChecker";
    
    public static void checkForUpdate(Context context) {
        DeviceApi api = ApiClient.getInstance().create(DeviceApi.class);
        
        api.getLatestVersion().enqueue(new Callback<AppVersion>() {
            @Override
            public void onResponse(Call<AppVersion> call, Response<AppVersion> response) {
                if (response.isSuccessful() && response.body() != null) {
                    AppVersion latestVersion = response.body();
                    checkAndPromptUpdate(context, latestVersion);
                }
            }
            
            @Override
            public void onFailure(Call<AppVersion> call, Throwable t) {
                Log.e(TAG, "Failed to check for updates", t);
            }
        });
    }
    
    private static void checkAndPromptUpdate(Context context, AppVersion latestVersion) {
        try {
            PackageInfo pInfo = context.getPackageManager()
                .getPackageInfo(context.getPackageName(), 0);
            int currentVersionCode = pInfo.versionCode;
            
            if (latestVersion.versionCode > currentVersionCode) {
                if (latestVersion.forceUpdate) {
                    // Force update
                    showUpdateDialog(context, latestVersion, true);
                } else {
                    // Optional update
                    showUpdateDialog(context, latestVersion, false);
                }
            }
        } catch (Exception e) {
            Log.e(TAG, "Error checking version", e);
        }
    }
    
    private static void showUpdateDialog(Context context, AppVersion version, boolean force) {
        AlertDialog.Builder builder = new AlertDialog.Builder(context);
        builder.setTitle("Update Available");
        builder.setMessage("Version " + version.version + " is available.\n\n" + 
                          version.releaseNotes);
        
        builder.setPositiveButton("Update", (dialog, which) -> {
            downloadAndInstall(context, version.downloadUrl);
        });
        
        if (!force) {
            builder.setNegativeButton("Later", null);
        }
        
        builder.setCancelable(!force);
        builder.show();
    }
    
    private static void downloadAndInstall(Context context, String downloadUrl) {
        String fileName = "quattrex_app_update.apk";
        String destination = Environment.getExternalStoragePublicDirectory(
            Environment.DIRECTORY_DOWNLOADS) + "/" + fileName;
        
        Uri uri = Uri.parse(BuildConfig.BASE_URL + downloadUrl);
        
        // Delete old file if exists
        File file = new File(destination);
        if (file.exists()) {
            file.delete();
        }
        
        DownloadManager.Request request = new DownloadManager.Request(uri);
        request.setTitle("Quattrex App Update");
        request.setDescription("Downloading update...");
        request.setDestinationUri(Uri.fromFile(file));
        request.setNotificationVisibility(
            DownloadManager.Request.VISIBILITY_VISIBLE_NOTIFY_COMPLETED);
        
        DownloadManager manager = (DownloadManager) 
            context.getSystemService(Context.DOWNLOAD_SERVICE);
        
        if (manager != null) {
            long downloadId = manager.enqueue(request);
            Toast.makeText(context, "Downloading update...", Toast.LENGTH_SHORT).show();
            
            // You would typically monitor the download and install when complete
            // For brevity, this is simplified
        }
    }
}