# =========================================================================
# headphone-remap 一键安装 / 卸载
# 用法（新机器上）：
#   git clone <repo> somewhere
#   cd somewhere/tools/headphone-remap
#   powershell -ExecutionPolicy Bypass -File install.ps1
#
# 自定义安装路径：  powershell -File install.ps1 -InstallDir 'D:\MyTools\AHK'
# 跳过自启：        powershell -File install.ps1 -SkipAutostart
# 卸载：            powershell -File install.ps1 -Uninstall
# =========================================================================

param(
    [string]$InstallDir = (Join-Path $env:LOCALAPPDATA "Tools\AutoHotkey"),
    [switch]$Uninstall,
    [switch]$SkipAutostart,
    [switch]$OpenTestPage
)

$ErrorActionPreference = "Stop"

function Write-Step {
    param([string]$msg, [string]$color = "Cyan")
    Write-Host "[$(Get-Date -Format 'HH:mm:ss')] $msg" -ForegroundColor $color
}

# ──────────────────────────── Uninstall ────────────────────────────
if ($Uninstall) {
    Write-Step "Uninstalling headphone-remap..."

    $shortcut = Join-Path ([Environment]::GetFolderPath('Startup')) "HeadphoneAHKWatcher.lnk"
    if (Test-Path $shortcut) { Remove-Item $shortcut; Write-Step "Removed startup shortcut" }

    Get-Process AutoHotkey64 -ErrorAction SilentlyContinue | Stop-Process -Force
    Get-Process powershell -ErrorAction SilentlyContinue |
        Where-Object { $_.CommandLine -match 'headphone_watcher' } |
        Stop-Process -Force

    if (Test-Path $InstallDir) {
        Write-Step "Install dir kept at $InstallDir (delete manually if you want a clean uninstall)"
    }
    Write-Step "Uninstall done." "Green"
    exit 0
}

# ───────────────────────────── Install ─────────────────────────────
$ScriptRoot = $PSScriptRoot
if (-not $ScriptRoot) { $ScriptRoot = (Get-Location).Path }

Write-Step "Installing headphone-remap" "Green"
Write-Step "  Install dir : $InstallDir"
Write-Step "  Source dir  : $ScriptRoot"

# 1. Make sure install dir exists
if (-not (Test-Path $InstallDir)) {
    New-Item -ItemType Directory -Path $InstallDir -Force | Out-Null
}

# 2. Download AHK v2 if not present
$AhkExe = Join-Path $InstallDir "AutoHotkey64.exe"
if (Test-Path $AhkExe) {
    Write-Step "AHK already installed"
} else {
    Write-Step "Downloading AutoHotkey v2 (~3 MB)..."
    $zipPath = Join-Path $env:TEMP "ahk-v2.zip"
    [Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12
    Invoke-WebRequest -Uri "https://www.autohotkey.com/download/ahk-v2.zip" -OutFile $zipPath -UseBasicParsing
    Expand-Archive -Path $zipPath -DestinationPath $InstallDir -Force
    Remove-Item $zipPath
    Write-Step "AHK v2 installed"
}

# 3. Copy scripts
Write-Step "Copying scripts..."
Copy-Item "$ScriptRoot\scripts\headphone_remap.ahk" $InstallDir -Force
Copy-Item "$ScriptRoot\scripts\headphone_watcher.ps1" $InstallDir -Force

# 4. (Watcher uses $PSScriptRoot relative paths — no patching needed)

# 5. Autostart
$watcherPath = Join-Path $InstallDir "headphone_watcher.ps1"
if (-not $SkipAutostart) {
    $startup = [Environment]::GetFolderPath('Startup')
    $shortcut = Join-Path $startup "HeadphoneAHKWatcher.lnk"
    $ws = New-Object -ComObject WScript.Shell
    $sc = $ws.CreateShortcut($shortcut)
    $sc.TargetPath = "powershell.exe"
    $sc.Arguments = "-NoProfile -ExecutionPolicy Bypass -WindowStyle Hidden -File `"$watcherPath`""
    $sc.WorkingDirectory = $InstallDir
    $sc.WindowStyle = 7
    $sc.Description = "Headphone AHK watcher (auto-start from install.ps1)"
    $sc.Save()
    Write-Step "Autostart shortcut: $shortcut"
}

# 6. Health check
Write-Step "Detecting audio devices..."
$headphone = Get-PnpDevice | Where-Object {
    $_.Class -eq 'AudioEndpoint' -and
    $_.FriendlyName -match 'Headphone|Earphone|Headset|耳机' -and
    $_.Status -eq 'OK'
} | Select-Object -First 1

if ($headphone) {
    Write-Step "Headphone detected: $($headphone.FriendlyName)" "Green"
} else {
    Write-Step "No headphone detected right now (plug it in, watcher will start AHK automatically)" "Yellow"
}

# 7. Open test page
if ($OpenTestPage -and (Test-Path "$ScriptRoot\tests\headphone_test.html")) {
    Start-Process "$ScriptRoot\tests\headphone_test.html"
}

Write-Step "=== Installation complete ===" "Green"
Write-Host ""
Write-Host "Quick test:" -ForegroundColor Yellow
Write-Host "  1. Plug in your 3.5mm headphone (if not already)"
Write-Host "  2. Open: $ScriptRoot\tests\headphone_test.html"
Write-Host "  3. Press +, -, middle buttons on the headphone"
Write-Host "  4. Logs: $InstallDir\watcher_log.txt, $InstallDir\headphone_log.txt"
Write-Host ""
Write-Host "Uninstall: powershell -ExecutionPolicy Bypass -File install.ps1 -Uninstall" -ForegroundColor DarkGray