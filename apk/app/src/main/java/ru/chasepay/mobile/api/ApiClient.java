package ru.quattrex.mobile.api;

import android.util.Log;
import ru.quattrex.mobile.BuildConfig;

import okhttp3.OkHttpClient;
import okhttp3.logging.HttpLoggingInterceptor;
import retrofit2.Retrofit;
import retrofit2.converter.gson.GsonConverterFactory;
import java.util.concurrent.TimeUnit;
import javax.net.ssl.SSLContext;
import javax.net.ssl.SSLSocketFactory;
import javax.net.ssl.TrustManager;
import javax.net.ssl.X509TrustManager;
import java.security.cert.CertificateException;
import java.security.cert.X509Certificate;

public class ApiClient {
    private static final String TAG = "ApiClient";
    private static Retrofit retrofit = null;
    private static final String DEFAULT_BASE_URL = "https://quattrex.pro/api/";
    
    public static Retrofit getInstance() {
        if (retrofit == null) {
            synchronized (ApiClient.class) {
                if (retrofit == null) {
                    try {
                        retrofit = buildRetrofit();
                    } catch (Exception e) {
                        Log.e(TAG, "Failed to build Retrofit instance", e);
                        // Build a fallback instance
                        retrofit = buildFallbackRetrofit();
                    }
                }
            }
        }
        return retrofit;
    }
    
    private static Retrofit buildRetrofit() {
        Log.d(TAG, "Building Retrofit instance");
        
        // Use custom logging interceptor
        LoggingInterceptor customLogger = new LoggingInterceptor();
        
        OkHttpClient.Builder clientBuilder = new OkHttpClient.Builder()
            .connectTimeout(30, TimeUnit.SECONDS)
            .readTimeout(30, TimeUnit.SECONDS)
            .writeTimeout(30, TimeUnit.SECONDS)
            .addInterceptor(customLogger);
        
        // Configure SSL
        configureSsl(clientBuilder);
        
        OkHttpClient client = clientBuilder.build();
        
        // Get base URL safely
        String baseUrl = DEFAULT_BASE_URL;
        try {
            if (BuildConfig.BASE_URL != null && !BuildConfig.BASE_URL.isEmpty()) {
                baseUrl = BuildConfig.BASE_URL;
            }
        } catch (Exception e) {
            Log.e(TAG, "Error accessing BuildConfig.BASE_URL", e);
        }
        
        // Ensure URL ends with /
        if (!baseUrl.endsWith("/")) {
            baseUrl = baseUrl + "/";
        }
        
        Log.d(TAG, "Using base URL: " + baseUrl);
        
        return new Retrofit.Builder()
            .baseUrl(baseUrl)
            .client(client)
            .addConverterFactory(GsonConverterFactory.create())
            .build();
    }
    
    private static Retrofit buildFallbackRetrofit() {
        Log.w(TAG, "Building fallback Retrofit instance");
        
        OkHttpClient client = new OkHttpClient.Builder()
            .connectTimeout(30, TimeUnit.SECONDS)
            .readTimeout(30, TimeUnit.SECONDS)
            .writeTimeout(30, TimeUnit.SECONDS)
            .build();
        
        return new Retrofit.Builder()
            .baseUrl(DEFAULT_BASE_URL)
            .client(client)
            .addConverterFactory(GsonConverterFactory.create())
            .build();
    }
    
    private static void configureSsl(OkHttpClient.Builder clientBuilder) {
        try {
            // Create a trust manager that does not validate certificate chains
            final TrustManager[] trustAllCerts = new TrustManager[] {
                new X509TrustManager() {
                    @Override
                    public void checkClientTrusted(X509Certificate[] chain, String authType) throws CertificateException {
                    }

                    @Override
                    public void checkServerTrusted(X509Certificate[] chain, String authType) throws CertificateException {
                    }

                    @Override
                    public X509Certificate[] getAcceptedIssuers() {
                        return new X509Certificate[]{};
                    }
                }
            };

            // Install the all-trusting trust manager
            final SSLContext sslContext = SSLContext.getInstance("SSL");
            sslContext.init(null, trustAllCerts, new java.security.SecureRandom());
            // Create an ssl socket factory with our all-trusting manager
            final SSLSocketFactory sslSocketFactory = sslContext.getSocketFactory();

            clientBuilder.sslSocketFactory(sslSocketFactory, (X509TrustManager)trustAllCerts[0]);
            clientBuilder.hostnameVerifier((hostname, session) -> true);
            
            Log.d(TAG, "SSL configured successfully");
        } catch (Exception e) {
            Log.e(TAG, "Failed to configure SSL", e);
        }
    }
}