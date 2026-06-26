[Console]::OutputEncoding=[System.Text.Encoding]::UTF8
Write-Host "=== USB / 蓝牙音频设备 ==="
Get-PnpDevice | Where-Object { $_.Class -match 'AudioEndpoint|USB' } |
    Where-Object { $_.FriendlyName -match 'Headset|Headphone|耳机|耳麦|Audio|USB|Bluetooth' } |
    Select-Object Status, Class, FriendlyName, InstanceId |
    Format-List

Write-Host "`n=== 当前默认音频输出端点 ==="
$enumerator = New-Object -ComObject MMDeviceEnumerator
$device = $enumerator.GetDefaultAudioEndpoint(0, 1)  # 0=Render, 1=Multimedia
Write-Host ("Name         : " + $device.Properties.Item("{a45c254e-df1c-4efd-8020-67d146a850e0} 14").Value)
Write-Host ("DeviceId     : " + $device.GetId)
Write-Host ("State        : " + $device.State)
Write-Host ("FriendlyName : " + $device.Properties.Item("{a45c254e-df1c-4efd-8020-67d146a850e0} 6").Value)