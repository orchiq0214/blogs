[Console]::OutputEncoding=[System.Text.Encoding]::UTF8
Write-Host "=== 所有 HIDClass 设备（含 Consumer Control / 音频控制） ==="
Get-PnpDevice | Where-Object { $_.Class -eq 'HIDClass' -or $_.Class -eq 'Keyboard' } |
    Select-Object Status, Class, FriendlyName, InstanceId |
    Sort-Object FriendlyName |
    Format-Table -AutoSize

Write-Host "`n=== Realtek Audio 关联的所有子设备 ==="
Get-PnpDevice | Where-Object { $_.InstanceId -like '*10EC*' -or $_.InstanceId -like '*INTELAUDIO*' -or $_.FriendlyName -match 'Realtek' } |
    Select-Object Status, Class, FriendlyName, InstanceId |
    Format-Table -AutoSize

Write-Host "`n=== 当前激活的键盘/媒体键 (rawinput devices) ==="
Add-Type @"
using System;
using System.Runtime.InteropServices;
using System.Collections.Generic;
public class RawInput {
    [DllImport("user32.dll")] public static extern uint GetRawInputDeviceList(IntPtr pRawInputDeviceList, ref uint puiNumDevices, uint cbSize);
    [StructLayout(LayoutKind.Sequential)] public struct RAWINPUTDEVICELIST { public IntPtr hDevice; public uint dwType; }
}
"@
$devs = [uint32]0
[RawInput]::GetRawInputDeviceList([IntPtr]::Zero, [ref]$devs, 16) | Out-Null
Write-Host "Total raw input devices: $devs"