package ru.quattrex.mobile.utils;

import java.text.SimpleDateFormat;
import java.util.ArrayList;
import java.util.Date;
import java.util.List;
import java.util.Locale;

public class ApiLogManager {
    private static ApiLogManager instance;
    private final List<ApiLogEntry> logs = new ArrayList<>();
    private static final int MAX_LOGS = 500;
    private static final SimpleDateFormat dateFormat = new SimpleDateFormat("yyyy-MM-dd HH:mm:ss.SSS", Locale.getDefault());
    
    public static ApiLogManager getInstance() {
        if (instance == null) {
            instance = new ApiLogManager();
        }
        return instance;
    }
    
    public void addLog(ApiLogEntry entry) {
        synchronized (logs) {
            logs.add(0, entry); // Add to beginning for recent first
            if (logs.size() > MAX_LOGS) {
                logs.remove(logs.size() - 1);
            }
        }
    }
    
    public List<ApiLogEntry> getLogs() {
        synchronized (logs) {
            return new ArrayList<>(logs);
        }
    }
    
    public void clearLogs() {
        synchronized (logs) {
            logs.clear();
        }
    }
    
    public static class ApiLogEntry {
        public final String timestamp;
        public final String method;
        public final String url;
        public final String requestBody;
        public final int responseCode;
        public final String responseBody;
        public final long duration;
        public final boolean isSuccess;
        
        public ApiLogEntry(String method, String url, String requestBody, 
                          int responseCode, String responseBody, long duration) {
            this.timestamp = dateFormat.format(new Date());
            this.method = method;
            this.url = url;
            this.requestBody = requestBody;
            this.responseCode = responseCode;
            this.responseBody = responseBody;
            this.duration = duration;
            this.isSuccess = responseCode >= 200 && responseCode < 300;
        }
        
        public String getFormattedLog() {
            StringBuilder sb = new StringBuilder();
            sb.append("=== API REQUEST ===\n");
            sb.append("Time: ").append(timestamp).append("\n");
            sb.append("Method: ").append(method).append("\n");
            sb.append("URL: ").append(url).append("\n");
            sb.append("Duration: ").append(duration).append("ms\n");
            
            if (requestBody != null && !requestBody.isEmpty()) {
                sb.append("\n--- Request Body ---\n");
                sb.append(requestBody).append("\n");
            }
            
            sb.append("\n--- Response (").append(responseCode).append(") ---\n");
            if (responseBody != null && !responseBody.isEmpty()) {
                sb.append(responseBody);
            } else {
                sb.append("(empty response)");
            }
            sb.append("\n==================\n\n");
            
            return sb.toString();
        }
    }
}