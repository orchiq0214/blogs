# 诊断脚本

新机器上出问题，按顺序跑这些来定位问题。

## 1. 音频设备识别检查

```powershell
powershell -ExecutionPolicy Bypass -File diagnostics\audio_check.ps1
```

应该看到：
- `扬声器 (Realtek(R) Audio)` — 内置扬声器
- `耳机 (Realtek(R) Audio)` — 你的耳机（**插上才有**）
- `麦克风 (Realtek(R) Audio)`

如果"耳机"端点没出现 → 物理没插好 / 接触不良 / Realtek 驱动没装。

## 2. HID 设备检查

```powershell
powershell -ExecutionPolicy Bypass -File diagnostics\hid_check.ps1
```

**3.5mm 模拟耳机不会显示成 HID 设备**（它只有 AudioEndpoint）。如果你看到疑似耳机的 HID 设备，说明你的耳机可能是 USB 或蓝牙耳机，那本项目的 AHK 映射可能不适用。

## 3. 按键事件捕获

```powershell
python -u diagnostics\key_listen.py 60
```

60 秒内依次按耳机的 3 个按键，应该看到：
- `VOL_UP` (vk=0xAF) → 多次
- `VOL_DN` (vk=0xAE) → 多次
- `MED_PLAY` (vk=0xB3) → 多次

每个键的 scan code 应该是 0x0（说明是 Realtek 驱动注入的虚拟键，不是物理键盘）。

如果某个键没出现 → 该键硬件问题，或 Realtek 不识别该键。

## 4. 注入测试（验证 AHK 拦截层）

```powershell
python -u diagnostics\inject_sendinput.py
```

模拟发送 9 个键（`+ + + - - - M M M`），然后看 `headphone_log.txt`：
- 应该看到 3 条 `+ -> Up` + 3 条 `- -> Down`
- **不会**看到 `M -> Enter`（AHK 的 `vkB3` 监听的是 Realtek CTIA 路径，不是 SendInput）

这说明 AHK 对真实物理按键有效，但对模拟注入无效——这是 AHK v2 + Realtek 的限制，**不影响实际使用**。

## 故障排查决策树

```
耳机按键完全没反应
├─ audio_check.ps1 看不到"耳机"端点
│  └─ 物理接触问题：换插孔/换耳机/重装 Realtek 驱动
├─ key_listen.py 看不到对应 vkCode
│  └─ Realtek 驱动没识别该键：试用其他 Realtek 控制台 / 换个耳机型号
├─ key_listen.py 能看到，AHK 日志没记录
│  └─ AHK 没装 / Media_Play_Pause 占位没写：检查脚本
└─ AHK 日志有记录，前台应用没反应
   └─ 焦点问题 / AHK Send 被目标拒绝：见 docs/PITFALLS.md 第 5 节
```