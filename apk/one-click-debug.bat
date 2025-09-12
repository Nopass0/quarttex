@echo off
REM One-click script to build debug APK and run on any connected device/emulator
title Chase - Building Debug APK

echo ====================================
echo    Chase Debug Build and Run
echo ====================================
echo.

REM Check ANDROID_HOME
if not defined ANDROID_HOME (
    echo ERROR: ANDROID_HOME environment variable is not set!
    echo Please set ANDROID_HOME to your Android SDK path.
    echo Example: C:\Users\YourName\AppData\Local\Android\Sdk
    echo.
    pause
    exit /b 1
)

REM Check for connected devices
echo Checking for connected devices...
"%ANDROID_HOME%\platform-tools\adb.exe" devices -l

REM Count connected devices
for /f "skip=1 tokens=1" %%i in ('"%ANDROID_HOME%\platform-tools\adb.exe" devices') do (
    set device_found=1
    goto :device_check_done
)

:device_check_done
if not defined device_found (
    echo.
    echo No devices found! Please:
    echo 1. Connect a physical device with USB debugging enabled, OR
    echo 2. Start an Android emulator
    echo.
    echo Would you like to see available emulators? (Y/N)
    set /p start_emu=
    
    if /i "!start_emu!"=="Y" (
        echo.
        echo Available emulators:
        "%ANDROID_HOME%\emulator\emulator.exe" -list-avds
        echo.
        set /p emu_name="Enter emulator name to start (or press Enter to skip): "
        
        if not "!emu_name!"=="" (
            echo Starting emulator !emu_name!...
            start "" "%ANDROID_HOME%\emulator\emulator.exe" -avd !emu_name! -gpu host
            echo Waiting for emulator to start...
            "%ANDROID_HOME%\platform-tools\adb.exe" wait-for-device
            timeout /t 10 /nobreak >nul
        )
    )
)

echo.
echo Building Debug APK...
echo.

REM Try to run build script
if exist "%~dp0build-dev.sh" (
    REM Try WSL first
    where wsl >nul 2>nul
    if %errorlevel% == 0 (
        echo Using WSL to build...
        pushd "%~dp0"
        wsl bash ./build-dev.sh
        popd
    ) else (
        REM Try Git Bash
        if exist "C:\Program Files\Git\bin\bash.exe" (
            echo Using Git Bash to build...
            "C:\Program Files\Git\bin\bash.exe" "%~dp0build-dev.sh"
        ) else (
            echo ERROR: No bash environment found (WSL or Git Bash required)
            pause
            exit /b 1
        )
    )
) else (
    echo ERROR: build-dev.sh not found!
    pause
    exit /b 1
)

REM Check if build succeeded
if not exist "%~dp0build\app\outputs\flutter-apk\app-*-debug.apk" (
    echo.
    echo ERROR: APK build failed or APK not found!
    pause
    exit /b 1
)

REM Find the latest debug APK
for /f "delims=" %%i in ('dir /b /od "%~dp0build\app\outputs\flutter-apk\app-*-debug.apk" 2^>nul') do set APK_FILE=%%i

echo.
echo Found APK: %APK_FILE%
echo.

REM Install APK
echo Installing APK on device...
"%ANDROID_HOME%\platform-tools\adb.exe" uninstall ru.chasepay.mobile >nul 2>&1
"%ANDROID_HOME%\platform-tools\adb.exe" install -r "%~dp0build\app\outputs\flutter-apk\%APK_FILE%"

if %errorlevel% == 0 (
    echo.
    echo Launching app...
    "%ANDROID_HOME%\platform-tools\adb.exe" shell am start -n ru.chasepay.mobile/ru.chasepay.mobile.MainActivity
    
    echo.
    echo ====================================
    echo    SUCCESS! App is running
    echo ====================================
    echo.
    echo Press L to view logs, or any other key to exit...
    
    set /p view_logs=
    if /i "!view_logs!"=="L" (
        echo.
        echo Showing logs (Press Ctrl+C to stop)...
        "%ANDROID_HOME%\platform-tools\adb.exe" logcat -s flutter:* Chase:*
    )
) else (
    echo.
    echo ERROR: Failed to install APK!
)

echo.
pause