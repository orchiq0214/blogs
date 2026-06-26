# 原理详解

## 1. 硬件层：3.5mm CTIA 标准

3.5mm 模拟耳机插头有 4 段（TRRS）：左声道 / 右声道 / 地 / 麦克风。CTIA 是其中一种线序标准（iPhone 用这个，Android 也兼容）。

按下中键时，麦克风线对地被短路（约 100Ω），Realtek codec 的"按键检测电路"识别到这个阻抗变化。

## 2. 驱动层：Realtek HDAudio codec

Realtek 声卡驱动在 Windows 里跑一段轮询/中断逻辑：
- 检测到按键短路 → 通过 `keybd_event` 或 `SendInput` 注入一个 Windows 媒体键
- `+` → `VK_VOLUME_UP` (0xAF)
- `−` → `VK_VOLUME_DOWN` (0xAE)
- 中键（单击）→ `VK_MEDIA_PLAY_PAUSE` (0xB3)
- 中键（双击）→ `VK_MEDIA_NEXT_TRACK` (0xB0)（很多耳机不实现）
- 中键（三击）→ `VK_MEDIA_PREV_TRACK` (0xB1)（同上）

特征：**scan code = 0x0**。这是因为这些键不是物理键盘产生的，是 Realtek 驱动虚拟出来的。

## 3. 系统层：PnP AudioEndpoint

Windows 把每个音频输出/输入注册成一个 PnP 设备类 `AudioEndpoint`，在 `Get-PnpDevice | Where-Object Class -eq 'AudioEndpoint'` 里能看到。

耳机插入 → 出现一个 `耳机 (Realtek(R) Audio)` 端点
耳机拔出 → 该端点消失

插拔检测就是靠这个状态变化触发。

## 4. 应用层：AHK v2 按键映射

AutoHotkey v2 的热键可以匹配 vk 码或名称。但有几个坑：

### 4.1 `Media_Play_Pause` 名称匹配不上 Realtek 中键

AHK v2 内部把 `Media_Play_Pause` 映射为 `vkB3 + sc045`（标准 Microsoft 键盘扫描码）。
Realtek 中键发的是 `vkB3 + sc00`（scan code 是 0）。
sc 不匹配 → 名称 hotkey 不触发。

### 4.2 单独写 `vkB3` 也不触发（v2 怪癖）

哪怕用裸 vk 码，AHK v2 在某些情况下需要"主名注册"才能完整装上 vk 路径的监听。`vkB3::` 单独写，监听器虽然装了但 Realtek CTIA 路径绕过去了。

**解决方法**：同时定义 `Media_Play_Pause::`（空块也行）。AHK 会注册"标准媒体键路径"，这时 `vkB3` 才会被命中。

```ahk
; 必须有这个空块
Media_Play_Pause:: {
}

; 真正干活的在这
vkB3::Send "{Enter}"
```

### 4.3 `Send` 的局限性

AHK 的 `Send` 默认用 SendEvent 模拟按键（keydown + keyup）。
大部分应用响应正常，但某些 Electron / 游戏可能不响应，需要换 `SendEvent` / `SendInput` / `ControlSend`。

## 5. 触发层：PnP 轮询 vs WMI 事件

理论上可以用 WMI `__InstanceCreationEvent` 监听 PnP 变化。但实际踩到两个坑：
1. PowerShell `-Action { ... }` 脚本块里写中文 / 特殊字符，解析器会挂（"缺少表达式" / "表达式中含未匹配 }"）
2. 某些系统上 WMI 事件不触发

所以改用最朴素的轮询：
```powershell
while ($true) {
    Start-Sleep 2
    $present = Test-Device
    if ($present -ne $last) {
        # 边沿检测，触发动作
    }
}
```

每 2 秒查一次 PnP 列表，CPU 几乎为 0，对人类插拔动作足够快。

## 6. 自启动层：启动文件夹 vs Task Scheduler

`Register-ScheduledTask` 需要管理员权限（用户态会报 0x80070005）。

无管理员方案：在 `%APPDATA%\...\Programs\Startup\` 放一个 `.lnk` 快捷方式，登录后自动跑。这样只对当前用户生效，符合个人工具场景。

## 7. 数据流汇总

```
[物理按键按下]
    ↓ (100Ω 短路)
[Realtek codec 检测]
    ↓ (驱动注入 keybd_event)
[Windows keyboard event: vk=B3, sc=0]
    ↓
[AHK low-level hook 捕获]
    ↓ (匹配 vkB3 hotkey, 因为 Media_Play_Pause:: 占位注册了路径)
[AHK Send "{Enter}"]
    ↓ (注入 keydown VK_RETURN + keyup VK_RETURN)
[前台应用收到 Enter 键]
```

## 8. 替代方案对比

| 方案 | 优点 | 缺点 |
|---|---|---|
| **AHK v2 + 轮询触发（当前方案）** | 灵活、可改键、易调试 | 多个进程、占内存 |
| PowerToys Keyboard Manager | GUI 友好 | 媒体键重映射受限 |
| 单独写一个 C# 程序 | 性能好 | 部署复杂 |
| 换 USB 耳机 | 自带 HID、键位可重映射 | 花钱 |
| 改 Realtek 驱动 CTIA 映射 | 干净 | 需要逆向、风险高 |

当前方案对个人/小工具场景性价比最高。