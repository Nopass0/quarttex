@echo off
echo === Building Chase APK with Java 17 ===
echo.

cd /d "%~dp0"

REM Explicitly set Java 17
set "JAVA_HOME=C:\Program Files\Java\jdk-17"
set "PATH=%JAVA_HOME%\bin;%PATH%"

echo Using Java from: %JAVA_HOME%
"%JAVA_HOME%\bin\java.exe" -version
echo.

REM Clear any cached daemons
call gradlew.bat --stop 2>nul

echo Building prodDebug variant...
call gradlew.bat clean assembleProdDebug

if %errorlevel% == 0 (
    echo.
    echo === Build Successful! ===
    if not exist "apk\prod" mkdir "apk\prod"
    copy /Y "app\build\outputs\apk\prodDebug\app-prodDebug.apk" "apk\prod\chase-prod-debug.apk" 2>nul
    echo APK location: apk\prod\chase-prod-debug.apk
) else (
    echo.
    echo === Build Failed! ===
)

pause