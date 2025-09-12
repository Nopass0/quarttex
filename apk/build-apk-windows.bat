@echo off
echo === Building Chase Production Debug APK ===
echo.

REM Navigate to script directory
cd /d "%~dp0"

REM Set Java to use the Microsoft JDK 17
set "PATH=C:\Program Files\Microsoft\jdk-17.0.12.7-hotspot\bin;%PATH%"

REM Clean gradle cache to avoid Java version issues
if exist ".gradle" (
    echo Cleaning gradle cache...
    rmdir /s /q .gradle
)

REM Stop any existing gradle daemons
echo Stopping gradle daemons...
call gradlew.bat --stop

REM Build the APK
echo.
echo Building prodDebug APK...
call gradlew.bat clean assembleProdDebug

if %errorlevel% == 0 (
    echo.
    echo === Build Successful! ===
    
    REM Create output directory
    if not exist "apk\prod" mkdir "apk\prod"
    
    REM Copy APK
    copy /Y "app\build\outputs\apk\prodDebug\app-prodDebug.apk" "apk\prod\chase-prod-debug.apk" 2>nul
    
    echo.
    echo APK saved to: apk\prod\chase-prod-debug.apk
    echo Endpoint: https://chasepay.pro/api
) else (
    echo.
    echo === Build Failed! ===
)

echo.
pause