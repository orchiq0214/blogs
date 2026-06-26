# 踩坑记录

完整记录从"耳机查到能用" → "脚本可工作" → "开机自启"过程中遇到的所有坑。**遇到同型号问题先查这里**。

## 1. AHK v2 启动失败（exit code 2 / 编译错误）

### 1.1 `Media_Select` 在 AHK v2 里**不是合法热键名**

错误信息：
```
Error: Invalid key name.
Text:    Media_Select
```

AHK v1 有这个键名（模拟某些键盘的"媒体选择"），v2 移除了。删掉这条 hotkey 即可。

### 1.2 `vkB3` 单独写**不触发**

**症状**：脚本能加载运行，`Volume_Up::` / `Volume_Down::` 正常，但 `vkB3::` 完全不响应。

**原因**：AHK v2 在解析裸 vk 码 hotkey 时，依赖某个"主名注册表"做初始化。如果只写 `vkB3::`，vk 路径的监听器虽然装了，但 Realtek CTIA 发的事件绕过了它。

**解法**：同时定义 `Media_Play_Pause::`（空操作也行）：
```ahk
Media_Play_Pause:: {
}
vkB3::Send "{Enter}"
```

不要省略前者。

### 1.3 `Format()` 函数语法在 v1 / v2 不同

v1：`Format("{1:HH:mm:ss}", A_Now)` （索引从 1）
v2：`Format("{:HH:mm:ss}", A_Now)` （无索引）

更简单：直接字符串拼接 `A_Now "  msg"`（v2 的 `A_Now` 已经是格式化好的字符串）。

## 2. PowerShell 编码 / 解析

### 2.1 中文 + `-Action { ... }` 脚本块导致解析失败

错误：
```
缺少表达式: "}"  /  表达式中缺少 "}"
```

**症状**：PowerShell 报一堆语法错误，停在中文附近。

**原因**：PowerShell 5.x 的脚本块 tokenizer 对非 ASCII 字符处理有 bug。

**解法**：不要在 `-Action { ... }` 里写中文/复杂逻辑。改用轮询模式（while + Start-Sleep），循环体内调用普通函数。

### 2.2 脚本必须 UTF-8 BOM 编码

PowerShell 5.x 默认期望 UTF-8 BOM 或 ANSI。**不带 BOM 的 UTF-8** 会导致中文乱码甚至解析错误。

**症状**：日志里中文显示成问号，或者直接报 "意外的字符"。

**解法**：写完脚本后手动加 BOM：
```powershell
$utf8Bom = New-Object System.Text.UTF8Encoding($true)
[System.IO.File]::WriteAllText($path, [System.IO.File]::ReadAllText($path), $utf8Bom)
```

或者用 `Out-File -Encoding utf8BOM`。

## 3. bash 调用 PowerShell 的坑

### 3.1 `$_` 被 bash 的 extglob 吃掉

PowerShell 命令里的 `$_` 在 bash 里被替换成 `extglob`，导致 PS 报：
```
无法将 "extglob.Class" 项识别为 cmdlet
```

**解法**：
- 写到 .ps1 文件用 `-File`（最稳）
- 用 `$PSItem` 替代 `$_`
- 用 `\$` 转义

### 3.2 `curl` 下载 Windows 软件报证书错误

```
curl: (35) schannel: next InitializeSecurityContext failed: CRYPT_E_REVOCATION_OFFLINE
```

**解法**：
```bash
curl --ssl-no-revoke -L -o "out.zip" "https://..."
```

或者用 PowerShell `Invoke-WebRequest`。

### 3.3 `mkdir && curl -o` 顺序坑

`mkdir -p dir && curl -o dir/file ...` 在某些 bash 里 `dir/` 创建不及时，curl 报 "client returned ERROR on write"。

**解法**：分两步。

## 4. PnP / 音频设备相关

### 4.1 `Get-CimInstance Win32_SoundDevice` 不区分耳机/扬声器/麦克风

它只列出硬件声卡设备，不显示 PnP 端点。要检测"耳机是否插入"，必须用 `Get-PnpDevice | Where-Object Class -eq 'AudioEndpoint'`。

### 4.2 `MMDeviceEnumerator` COM 对象在 PowerShell 里经常失败

错误：`检索 COM 类工厂中 CLSID 为 {00000000-...} 的组件失败`（Class not registered）

**解法**：别用。改用 `Get-PnpDevice` 查询端点 GUID。

### 4.3 `Disable-PnpDevice` 模拟拔插需要管理员

普通用户会报 0x80041001。需要 sudo / 管理员终端。普通测试**直接物理拔插**最方便。

## 5. AHK 脚本设计

### 5.1 多行 hotkey 必须用 `{ ... }` 块

```ahk
; ❌ 这样不行（v2 不支持旧 v1 的多行写法）
Volume_Up::
Send "{Up}"

; ✅ v2 标准写法
Volume_Up:: {
    Send "{Up}"
    FileAppend A_Now "`n", LogFile
}
```

### 5.2 `Send` 在浏览器/游戏中可能不响应

某些 Electron 应用、游戏不接受 `SendEvent` 模拟。换成：
```ahk
SendMode "Input"   ; 用 SendInput API（更"硬"）
Send "{Enter}"
```

或用 `ControlSend` 定向发到目标窗口。

## 6. 自启动

### 6.1 `Register-ScheduledTask` 需要管理员

无管理员方案 → 启动文件夹快捷方式（详见 README）。

### 6.2 快捷方式"最小化"用 WindowStyle=7

`WindowStyle=7` 表示最小化启动（不是隐藏）。要真正隐藏脚本里的 PS 窗口还得加 `-WindowStyle Hidden` 到 powershell.exe 参数里。

## 7. 调试流程

按顺序检查：

1. **硬件识别**：PowerShell `Get-PnpDevice | ? Class -eq 'AudioEndpoint'` 看到 `耳机 (Realtek(R) Audio)`
2. **按键事件**：用 Python ctypes low-level keyboard hook 监听，确认 `vk=0xAF/0xAE/0xB3` 出现
3. **AHK 拦截**：看 `headphone_log.txt` 有没有对应记录
4. **应用接收**：在浏览器打开 `tests/headphone_test.html`，看右上角 keyflash

哪一步断了就回查哪一节的坑。

## 8. Python ctypes keyboard hook 模板的坑

`user32.CallNextHookEx(None, ...)` 第一参数传 `None` 会报 "int too long to convert"。**必须传 hHook**：

```python
h = user32.SetWindowsHookExA(WH_KEYBOARD_LL, proc, None, 0)
def cb(nCode, wParam, lParam):
    ...
    return user32.CallNextHookEx(h, nCode, wParam, lParam)   # ← 传 h
```

Python `-u` 启动避免缓冲：
```bash
python -u listener.py
```