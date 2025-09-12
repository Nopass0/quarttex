# PowerShell script for building APK and running on emulator
# Requires: Android SDK, Java, Node.js

param(
    [Parameter(Mandatory=$false)]
    [ValidateSet("debug", "release", "prod", "dev")]
    [string]$BuildType = "debug",
    
    [Parameter(Mandatory=$false)]
    [string]$EmulatorName = "",
    
    [Parameter(Mandatory=$false)]
    [switch]$SkipBuild = $false,
    
    [Parameter(Mandatory=$false)]
    [switch]$SkipEmulatorStart = $false
)

# Color output functions
function Write-ColorOutput($ForegroundColor) {
    $fc = $host.UI.RawUI.ForegroundColor
    $host.UI.RawUI.ForegroundColor = $ForegroundColor
    if ($args) {
        Write-Output $args
    }
    $host.UI.RawUI.ForegroundColor = $fc
}

function Write-Success($message) {
    Write-ColorOutput Green "[OK] $message"
}

function Write-Info($message) {
    Write-ColorOutput Cyan "-> $message"
}

function Write-Error($message) {
    Write-ColorOutput Red "[ERROR] $message"
}

# Set error action preference
$ErrorActionPreference = "Stop"

try {
    # Change to script directory
    $scriptPath = Split-Path -Parent $MyInvocation.MyCommand.Path
    Set-Location $scriptPath
    
    Write-Info "Current directory: $(Get-Location)"
    
    # Check if required tools are installed
    Write-Info "Checking required tools..."
    
    # Check Android SDK
    if (-not $env:ANDROID_HOME) {
        throw "ANDROID_HOME environment variable is not set"
    }
    
    $adbPath = Join-Path $env:ANDROID_HOME "platform-tools\adb.exe"
    $emulatorPath = Join-Path $env:ANDROID_HOME "emulator\emulator.exe"
    
    if (-not (Test-Path $adbPath)) {
        throw "ADB not found at: $adbPath"
    }
    
    if (-not (Test-Path $emulatorPath)) {
        throw "Android Emulator not found at: $emulatorPath"
    }
    
    Write-Success "Android SDK found"
    
    # Check Java
    try {
        $javaVersion = java -version 2>&1 | Select-String "version"
        Write-Success "Java found: $javaVersion"
    } catch {
        throw "Java is not installed or not in PATH"
    }
    
    # List available emulators if name not provided
    if (-not $EmulatorName) {
        Write-Info "Available emulators:"
        & $emulatorPath -list-avds
        
        $EmulatorName = Read-Host "Enter emulator name (or press Enter to skip emulator start)"
        if (-not $EmulatorName) {
            $SkipEmulatorStart = $true
        }
    }
    
    # Start emulator if requested
    if (-not $SkipEmulatorStart -and $EmulatorName) {
        Write-Info "Checking if emulator is already running..."
        $devices = & $adbPath devices
        $runningEmulator = $devices | Select-String "emulator"
        
        if ($runningEmulator) {
            Write-Success "Emulator is already running"
        } else {
            Write-Info "Starting emulator: $EmulatorName"
            Start-Process -FilePath $emulatorPath -ArgumentList "-avd", $EmulatorName, "-gpu", "host" -WindowStyle Hidden
            
            Write-Info "Waiting for emulator to boot..."
            $timeout = 120 # seconds
            $elapsed = 0
            
            while ($elapsed -lt $timeout) {
                Start-Sleep -Seconds 2
                $elapsed += 2
                
                $bootCompleted = & $adbPath shell getprop sys.boot_completed 2>$null
                if ($bootCompleted -eq "1") {
                    Write-Success "Emulator booted successfully"
                    break
                }
                
                Write-Host "." -NoNewline
            }
            
            if ($elapsed -ge $timeout) {
                throw "Emulator boot timeout"
            }
            
            # Additional wait for system to stabilize
            Write-Info "Waiting for system to stabilize..."
            Start-Sleep -Seconds 5
        }
    }
    
    # Build APK if not skipped
    if (-not $SkipBuild) {
        Write-Info "Building APK (type: $BuildType)..."
        
        # Select build script based on build type
        $buildScript = switch ($BuildType) {
            "debug" { ".\build-dev.sh" }
            "release" { ".\build-prod.sh" }
            "prod" { ".\build-prod.sh" }
            "dev" { ".\build-dev.sh" }
        }
        
        # Convert to Windows path if needed
        if (Get-Command wsl -ErrorAction SilentlyContinue) {
            Write-Info "Using WSL to run build script..."
            $wslPath = wsl wslpath -a $buildScript
            wsl bash -c "cd `$(dirname $wslPath) && bash `$(basename $wslPath)"
        } else {
            # Try with Git Bash
            $gitBashPath = "C:\Program Files\Git\bin\bash.exe"
            if (Test-Path $gitBashPath) {
                Write-Info "Using Git Bash to run build script..."
                & $gitBashPath $buildScript
            } else {
                throw "Neither WSL nor Git Bash found. Please install one of them to run build scripts."
            }
        }
        
        if ($LASTEXITCODE -ne 0) {
            throw "Build failed with exit code: $LASTEXITCODE"
        }
        
        Write-Success "APK built successfully"
    }
    
    # Find the APK file
    Write-Info "Looking for APK file..."
    
    $apkPattern = switch ($BuildType) {
        "debug" { "app-*-debug.apk" }
        "release" { "app-*-release.apk" }
        "prod" { "app-*-release.apk" }
        "dev" { "app-*-debug.apk" }
    }
    
    $apkFiles = Get-ChildItem -Path ".\build\app\outputs\flutter-apk\" -Filter $apkPattern -ErrorAction SilentlyContinue | 
                Sort-Object LastWriteTime -Descending
    
    if (-not $apkFiles) {
        throw "No APK file found matching pattern: $apkPattern"
    }
    
    $apkFile = $apkFiles[0]
    Write-Success "Found APK: $($apkFile.Name)"
    Write-Info "Size: $([math]::Round($apkFile.Length / 1MB, 2)) MB"
    
    # Install APK
    if (-not $SkipEmulatorStart) {
        Write-Info "Installing APK on device..."
        
        # Uninstall previous version (optional)
        Write-Info "Uninstalling previous version..."
        & $adbPath uninstall "ru.chasepay.mobile" 2>$null
        
        # Install new APK
        $installResult = & $adbPath install -r $apkFile.FullName 2>&1
        
        if ($installResult -match "Success") {
            Write-Success "APK installed successfully"
        } else {
            throw "APK installation failed: $installResult"
        }
        
        # Launch the app
        Write-Info "Launching app..."
        & $adbPath shell am start -n "ru.chasepay.mobile/ru.chasepay.mobile.MainActivity"
        
        Write-Success "App launched successfully"
        
        # Show logcat (optional)
        $showLogs = Read-Host "Show app logs? (y/N)"
        if ($showLogs -eq "y") {
            Write-Info "Showing logs (Ctrl+C to stop)..."
            & $adbPath logcat -s "flutter" "Chase"
        }
    } else {
        Write-Info "Skipping installation (no emulator specified)"
        Write-Success "APK available at: $($apkFile.FullName)"
    }
    
} catch {
    Write-Error "Error: $_"
    exit 1
}

Write-Success "Script completed successfully!"