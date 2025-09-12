# Quick PowerShell script for building and running APK
# Simple version with minimal options

# Set error action preference
$ErrorActionPreference = "Stop"

# Colors
$host.UI.RawUI.ForegroundColor = "Cyan"
Write-Host "=== Chase APK Build & Run Script ==="
$host.UI.RawUI.ForegroundColor = "Gray"

try {
    # Change to APK directory
    Set-Location $PSScriptRoot
    
    # Check Android SDK
    if (-not $env:ANDROID_HOME) {
        throw "ANDROID_HOME not set. Please set it to your Android SDK path"
    }
    
    $adb = "$env:ANDROID_HOME\platform-tools\adb.exe"
    $emulator = "$env:ANDROID_HOME\emulator\emulator.exe"
    
    # Check connected devices
    Write-Host "`nChecking connected devices..."
    $devices = & $adb devices
    Write-Host $devices
    
    if ($devices -notmatch "device\s*$") {
        Write-Host "`nNo devices connected. Starting emulator..."
        
        # List available AVDs
        Write-Host "`nAvailable emulators:"
        & $emulator -list-avds
        
        $avdName = Read-Host "`nEnter emulator name"
        
        if ($avdName) {
            Write-Host "Starting emulator..."
            Start-Process $emulator -ArgumentList "-avd $avdName" -WindowStyle Hidden
            
            # Wait for device
            Write-Host "Waiting for emulator to start..."
            & $adb wait-for-device
            
            # Wait for boot
            Write-Host "Waiting for boot to complete..."
            while ((& $adb shell getprop sys.boot_completed 2>$null) -ne "1") {
                Start-Sleep -Seconds 2
                Write-Host "." -NoNewline
            }
            Write-Host " Done!"
        }
    }
    
    # Build APK
    Write-Host "`nBuilding debug APK..."
    
    # Try WSL first
    if (Get-Command wsl -ErrorAction SilentlyContinue) {
        wsl bash ./build-dev.sh
    } else {
        # Try Git Bash
        $gitBash = "C:\Program Files\Git\bin\bash.exe"
        if (Test-Path $gitBash) {
            & $gitBash ./build-dev.sh
        } else {
            Write-Host "Please run build-dev.sh manually in WSL or Git Bash"
            throw "No bash environment found"
        }
    }
    
    # Find APK
    $apkPath = Get-ChildItem ".\build\app\outputs\flutter-apk\app-*-debug.apk" | 
               Sort-Object LastWriteTime -Descending | 
               Select-Object -First 1
    
    if (-not $apkPath) {
        throw "APK not found. Build may have failed."
    }
    
    Write-Host "`nFound APK: $($apkPath.Name)"
    Write-Host "Size: $([math]::Round($apkPath.Length / 1MB, 2)) MB"
    
    # Install APK
    Write-Host "`nInstalling APK..."
    & $adb uninstall ru.chasepay.mobile 2>$null
    & $adb install -r $apkPath.FullName
    
    # Launch app
    Write-Host "`nLaunching app..."
    & $adb shell am start -n ru.chasepay.mobile/ru.chasepay.mobile.MainActivity
    
    Write-Host "`n[OK] Success! App is running on device."
    
    # Optional: Show logs
    $showLogs = Read-Host "`nShow logs? (y/N)"
    if ($showLogs -eq "y") {
        & $adb logcat -s flutter Chase
    }
    
} catch {
    $host.UI.RawUI.ForegroundColor = "Red"
    Write-Host "`n[ERROR] $_"
    $host.UI.RawUI.ForegroundColor = "Gray"
    exit 1
}

$host.UI.RawUI.ForegroundColor = "Green"
Write-Host "`n[OK] Done!"
$host.UI.RawUI.ForegroundColor = "Gray"