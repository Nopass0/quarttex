@echo off
echo === Building Chase Production Debug APK ===
echo.
echo Endpoint: https://chasepay.pro/api
echo Build Type: prodDebug (debuggable with production URL)
echo.

REM Navigate to the script's directory
cd /d "%~dp0"

REM Check if gradle wrapper exists
if exist gradlew.bat (
    echo Using gradlew.bat...
    call gradlew.bat clean assembleProdDebug
) else (
    echo gradlew.bat not found, trying with gradle command...
    gradle clean assembleProdDebug
)

if %errorlevel% == 0 (
    echo.
    echo === Build Successful! ===
    
    REM Create output directory
    if not exist "apk\prod" mkdir "apk\prod"
    
    REM Copy APK
    copy /Y "app\build\outputs\apk\prodDebug\app-prodDebug.apk" "apk\prod\chase-prod-debug.apk"
    
    echo.
    echo APK saved to: apk\prod\chase-prod-debug.apk
    echo.
    echo Features:
    echo - Production endpoint: https://chasepay.pro/api
    echo - Extended bank apps tracking
    echo - Debug mode enabled for testing
) else (
    echo.
    echo === Build Failed! ===
    echo Please check the error messages above.
)

echo.
echo Press any key to exit...
pause >nul