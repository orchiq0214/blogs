$startup = [Environment]::GetFolderPath('Startup')
$shortcut = Join-Path $startup "HeadphoneAHKWatcher.lnk"
$script = "C:\Users\1\Tools\AutoHotkey\headphone_watcher.ps1"

$ws = New-Object -ComObject WScript.Shell
$sc = $ws.CreateShortcut($shortcut)
$sc.TargetPath = "powershell.exe"
$sc.Arguments = "-NoProfile -ExecutionPolicy Bypass -WindowStyle Hidden -File `"$script`""
$sc.WorkingDirectory = "C:\Users\1\Tools\AutoHotkey"
$sc.WindowStyle = 7   # minimized
$sc.IconLocation = "powershell.exe,0"
$sc.Description = "Watch headphone plug/unplug, run AHK remap"
$sc.Save()

Write-Host "Shortcut created: $shortcut"
Get-Item $shortcut | Select-Object FullName, Length, LastWriteTime | Format-List