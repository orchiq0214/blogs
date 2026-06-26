# =========================================================================
# Headphone plug/unplug watcher - polling mode (2s interval)
# Starts AHK when Realtek headphone endpoint appears, stops when it disappears.
# Auto-starts via Task Scheduler on user logon (see setup below).
# =========================================================================

$LogFile   = "C:\Users\1\Tools\AutoHotkey\watcher_log.txt"
$AhkExe    = "C:\Users\1\Tools\AutoHotkey\AutoHotkey64.exe"
$AhkScript = "C:\Users\1\Tools\AutoHotkey\headphone_remap.ahk"

function Write-Log([string]$msg) {
    Add-Content -Path $LogFile -Value "$(Get-Date -Format 'yyyy-MM-dd HH:mm:ss') $msg"
}

$AhkProc = $null

function Start-Ahk {
    if ($AhkProc -and -not $AhkProc.HasExited) { return }
    $AhkProc = Start-Process -FilePath $AhkExe -ArgumentList "`"$AhkScript`"" -PassThru -WindowStyle Hidden
    Write-Log "AHK started PID=$($AhkProc.Id)"
}

function Stop-Ahk {
    if ($AhkProc -and -not $AhkProc.HasExited) {
        Stop-Process -Id $AhkProc.Id -Force -ErrorAction SilentlyContinue
        Write-Log "AHK stopped (PID=$($AhkProc.Id))"
    }
    $AhkProc = $null
}

function Test-HeadphonePresent {
    $dev = Get-PnpDevice | Where-Object {
        $_.Class -eq 'AudioEndpoint' -and
        $_.FriendlyName -match 'Realtek' -and
        $_.FriendlyName -match 'Headphone|Earphone|Headset|耳机' -and
        $_.Status -eq 'OK'
    } | Select-Object -First 1
    return $null -ne $dev
}

# Edge detection: when the device first appears/disappears
$lastPresent = Test-HeadphonePresent
Write-Log "=== Watcher started (polling, 2s). Initial state: headphone=$(if($lastPresent){'YES'}else{'NO'}) ==="
if ($lastPresent) { Start-Ahk }

while ($true) {
    Start-Sleep -Seconds 2
    $present = Test-HeadphonePresent
    if ($present -ne $lastPresent) {
        if ($present) {
            Write-Log ">>> Headphone PLUGGED IN <<<"
            Start-Sleep -Milliseconds 500   # let device settle
            Start-Ahk
        } else {
            Write-Log ">>> Headphone UNPLUGGED <<<"
            Stop-Ahk
        }
        $lastPresent = $present
    }
    if ($AhkProc -and $AhkProc.HasExited) {
        Write-Log "AHK died unexpectedly, will restart on next plug"
        $AhkProc = $null
    }
}