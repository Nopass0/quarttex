package ru.quattrex.mobile.api;

import android.util.Log;

import java.io.IOException;
import java.nio.charset.Charset;

import okhttp3.Interceptor;
import okhttp3.Request;
import okhttp3.Response;
import okhttp3.ResponseBody;
import okio.Buffer;
import okio.BufferedSource;
import ru.quattrex.mobile.utils.ApiLogManager;

public class LoggingInterceptor implements Interceptor {
    private static final String TAG = "API_LOG";
    private static final Charset UTF8 = Charset.forName("UTF-8");
    
    @Override
    public Response intercept(Chain chain) throws IOException {
        Request request = chain.request();
        long startTime = System.currentTimeMillis();
        
        // Extract request info
        String method = request.method();
        String url = request.url().toString();
        String requestBody = getRequestBody(request);
        
        // Log to console
        Log.d(TAG, ">>> " + method + " " + url);
        if (requestBody != null) {
            Log.d(TAG, "Request body: " + requestBody);
        }
        
        Response response;
        try {
            response = chain.proceed(request);
        } catch (IOException e) {
            long duration = System.currentTimeMillis() - startTime;
            String errorMsg = "Network error: " + e.getMessage();
            
            // Log error
            Log.e(TAG, "<<< ERROR " + url + " (" + duration + "ms)");
            Log.e(TAG, errorMsg);
            
            // Save to log manager
            ApiLogManager.getInstance().addLog(new ApiLogManager.ApiLogEntry(
                method, url, requestBody, 0, errorMsg, duration
            ));
            
            throw e;
        }
        
        long duration = System.currentTimeMillis() - startTime;
        
        // Get response body
        String responseBody = getResponseBody(response);
        
        // Log to console
        Log.d(TAG, "<<< " + response.code() + " " + url + " (" + duration + "ms)");
        if (responseBody != null) {
            Log.d(TAG, "Response body: " + responseBody);
        }
        
        // Save to log manager
        ApiLogManager.getInstance().addLog(new ApiLogManager.ApiLogEntry(
            method, url, requestBody, response.code(), responseBody, duration
        ));
        
        return response;
    }
    
    private String getRequestBody(Request request) {
        try {
            if (request.body() == null) {
                return null;
            }
            
            Buffer buffer = new Buffer();
            request.body().writeTo(buffer);
            
            Charset charset = UTF8;
            if (request.body().contentType() != null) {
                charset = request.body().contentType().charset(UTF8);
            }
            
            return buffer.readString(charset);
        } catch (Exception e) {
            Log.e(TAG, "Failed to extract request body", e);
            return null;
        }
    }
    
    private String getResponseBody(Response response) {
        try {
            ResponseBody responseBody = response.body();
            if (responseBody == null) {
                return null;
            }
            
            BufferedSource source = responseBody.source();
            source.request(Long.MAX_VALUE);
            Buffer buffer = source.getBuffer();
            
            Charset charset = UTF8;
            if (responseBody.contentType() != null) {
                charset = responseBody.contentType().charset(UTF8);
            }
            
            return buffer.clone().readString(charset);
        } catch (Exception e) {
            Log.e(TAG, "Failed to extract response body", e);
            return null;
        }
    }
}