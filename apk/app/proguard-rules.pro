# Add project specific ProGuard rules here.
# You can control the set of applied configuration files using the
# proguardFiles setting in build.gradle.
#
# For more details, see
#   http://developer.android.com/guide/developing/tools/proguard.html

# Keep data models - CRITICAL for preventing crashes
-keep class ru.quattrex.mobile.data.models.** { *; }
-keep class ru.quattrex.mobile.data.remote.responses.** { *; }
-keep class ru.quattrex.mobile.data.remote.requests.** { *; }

# Keep all Retrofit interfaces
-keep interface ru.quattrex.mobile.data.remote.** { *; }

# Keep all Services
-keep class ru.quattrex.mobile.services.** { *; }

# Keep Activities
-keep class ru.quattrex.mobile.MainActivity { *; }
-keep class ru.quattrex.mobile.DebugActivity { *; }

# Keep Application class
-keep class ru.quattrex.mobile.ChaseApplication { *; }

# Keep Broadcast Receivers
-keep class ru.quattrex.mobile.receivers.** { *; }

# Keep BuildConfig
-keep class ru.quattrex.mobile.BuildConfig { *; }

# Retrofit
-keepattributes Signature
-keepattributes Exceptions
-keepattributes *Annotation*

-keepclasseswithmembers class * {
    @retrofit2.http.* <methods>;
}

-keepclassmembers,allowshrinking,allowobfuscation interface * {
    @retrofit2.http.* <methods>;
}

# OkHttp
-dontwarn okhttp3.**
-dontwarn okio.**
-dontwarn javax.annotation.**
-keepnames class okhttp3.internal.publicsuffix.PublicSuffixDatabase

# Gson
-keep class com.google.gson.** { *; }
-keep class com.google.gson.stream.** { *; }
-keepattributes EnclosingMethod

# Prevent R8 from leaving Data object members always null
-keepclassmembers,allowobfuscation class * {
    @com.google.gson.annotations.SerializedName <fields>;
}

# Timber
-dontwarn org.jetbrains.annotations.**

# ZXing
-keep class com.google.zxing.** { *; }
-keep class com.journeyapps.** { *; }

# AndroidX
-keep class androidx.** { *; }
-dontwarn androidx.**

# Dexter - CRITICAL for permissions
-keep class com.karumi.dexter.** { *; }
-keep interface com.karumi.dexter.** { *; }
-keepclasseswithmembers class * {
    @com.karumi.dexter.* <fields>;
}
-keepclasseswithmembers class * {
    @com.karumi.dexter.* <methods>;
}

# JSR 305 annotations are for embedding nullability information.
-dontwarn javax.annotation.**

# A resource is loaded with a relative path so the package of this class must be preserved.
-keepnames class okhttp3.internal.publicsuffix.PublicSuffixDatabase

# Animal Sniffer compileOnly dependency to ensure APIs are compatible with older versions of Java.
-dontwarn org.codehaus.mojo.animal_sniffer.*

# OkHttp platform used only on JVM and when Conscrypt dependency is available.
-dontwarn okhttp3.internal.platform.ConscryptPlatform
-dontwarn org.conscrypt.ConscryptHostnameVerifier

# Generic signature optimization
-keep,allowobfuscation,allowshrinking class * extends java.lang.annotation.Annotation
-keep,allowobfuscation,allowshrinking @interface *

# JSON
-keep class org.json.** { *; }

# Android components
-keep public class * extends android.app.Activity
-keep public class * extends android.app.Application
-keep public class * extends android.app.Service
-keep public class * extends android.content.BroadcastReceiver
-keep public class * extends android.content.ContentProvider

# View binding
-keep class ru.quattrex.mobile.databinding.** { *; }

# Keep native methods
-keepclasseswithmembernames class * {
    native <methods>;
}