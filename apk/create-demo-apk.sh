#!/bin/bash

echo "Creating demo APK for Chase app..."

# Create build directory
mkdir -p ../build/apk

# Create a simple APK structure
cd /tmp
mkdir -p chase-apk-demo
cd chase-apk-demo

# Create a minimal valid APK (using zip format)
cat > AndroidManifest.xml << 'EOF'
<?xml version="1.0" encoding="utf-8"?>
<manifest xmlns:android="http://schemas.android.com/apk/res/android"
    package="com.chase.mobile">
    <application android:label="Chase">
        <activity android:name=".MainActivity">
            <intent-filter>
                <action android:name="android.intent.action.MAIN"/>
                <category android:name="android.intent.category.LAUNCHER"/>
            </intent-filter>
        </activity>
    </application>
</manifest>
EOF

# Create a basic APK file
echo "UEsDBAoAAAAAAIdO4kgAAAAAAAAAAAAAAAAJAAAATUVUQS1JTkYvUEsDBBQAAAAIAIdO4kiaOAfJMAAAADAAAAAUAAAATUVUQS1JTkYvTUFOSUZFU1QuTUbzTczLTEstLtENSy0qzszPs1Iw1DFQUPDNTynNTdrIwMDAxMDAxMDAxMDEwMDEwMDEwMDE0MDA0MDQwNDAwNjUyMjE3MTI3ODcz