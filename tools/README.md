# Headphone Remap

把 MINISO 3.5mm 耳机的 3 个按键（`+` / `−` / 中键）重映射成 `↑` / `↓` / `Enter`，**插耳机自动生效，拔耳机自动停，开机自动跑看门狗**。

## 5 分钟在新机器上配好（推荐）

```powershell
# 1. 克隆仓库
git clone <repo-url> C:\Users\1\myagents\headphone-remap
cd C:\Users\1\myagents\headphone-remap

# 2. 一键安装（自动下载 AHK v2、部署脚本、配开机自启）
powershell -ExecutionPolicy Bypass -File install.ps1

# 3. 打开测试页验证
start tests\headphone_test.html
```

详细步骤见下面的"手动安装"小节。完整原理、踩坑、故障排查看 `docs/`。

## 效果

| 物理按键 | 系统识别 | 重映射为 | 用途举例 |
|---|---|---|---|
| `+`（音量上） | `VK_VOLUME_UP` (0xAF) | `↑`（上箭头） | PDF/网页/视频 上一项 |
| `−`（音量下） | `VK_VOLUME_DOWN` (0xAE) | `↓`（下箭头） | PDF/网页/视频 下一项 |
| 中键 | `VK_MEDIA_PLAY_PAUSE` (0xB3, 但走 CTIA 路径) | `Enter`（回车） | 确认选择 |

## 系统要求

- Windows 10/11
- 3.5mm 接口耳机（CTIA 标准线序）
- Realtek HDAudio 声卡（绝大多数笔记本/台式机自带）

## 安装

### 1. 装 AutoHotkey v2

```powershell
# 下载并解压到 C:\Users\1\Tools\AutoHotkey\
# 也可以换其他目录，下面脚本里改路径即可
```

### 2. 部署脚本到运行目录

把 `scripts/` 里 3 个脚本复制到 `C:\Users\1\Tools\AutoHotkey\`：

```
C:\Users\1\Tools\AutoHotkey\
├── AutoHotkey64.exe          ← AHK v2 运行时
├── headphone_remap.ahk       ← 按键映射脚本
├── headphone_watcher.ps1     ← 插拔监听
└── setup_autostart.ps1       ← 一键开机自启
```

或在源码目录直接运行 `setup_autostart.ps1`。

### 3. 配置开机自启（可选）

```powershell
powershell -ExecutionPolicy Bypass -File C:\Users\1\Tools\AutoHotkey\setup_autostart.ps1
```

会在 `%APPDATA%\Microsoft\Windows\Start Menu\Programs\Startup\` 放一个快捷方式，开机登录后自动跑看门狗。

### 4. 测试

打开 `tests/headphone_test.html`，按耳机 3 个键，右上角应该弹出蓝色提示：
- `+` → 显示 `↑`，选项上移
- `−` → 显示 `↓`，选项下移
- 中键 → 显示 `Enter`，确认答案

## 工作原理（30 秒版）

```
[耳机按键] → [Realtek HDAudio codec] → [Windows media key]
                                                  ↓
                                         [PnP AudioEndpoint 出现/消失]
                                                  ↓
                                  [headphone_watcher.ps1 轮询检测]
                                                  ↓
                                  [插 → 启 AHK；拔 → 停 AHK]
                                                  ↓
                            [headphone_remap.ahk 拦截并重映射键]
                                                  ↓
                                       [应用收到 ↑/↓/Enter]
```

详细原理见 [`docs/PRINCIPLES.md`](docs/PRINCIPLES.md)。

## 日志

| 日志 | 位置 | 内容 |
|---|---|---|
| 看门狗 | `C:\Users\1\Tools\AutoHotkey\watcher_log.txt` | 插拔事件、AHK 启停 |
| 按键 | `C:\Users\1\Tools\AutoHotkey\headphone_log.txt` | 每次按键触发 |

## 卸载

```powershell
# 1. 删自启快捷方式
Remove-Item "$env:APPDATA\Microsoft\Windows\Start Menu\Programs\Startup\HeadphoneAHKWatcher.lnk"

# 2. 关掉当前 AHK 和看门狗
Stop-Process -Name AutoHotkey64,powershell -Force -ErrorAction SilentlyContinue

# 3. 删工具目录（可选）
Remove-Item -Recurse "C:\Users\1\Tools\AutoHotkey"
```

## 故障排查

按 `+` / `−` / 中键完全没反应 → 看 `headphone_log.txt`：
- 完全没有该键记录 → 看门狗没启 AHK，看 `watcher_log.txt`
- 有记录但应用没反应 → AHK 抢走了按键，应用不在前台？焦点问题
- 启动 AHK 时报错 → 看 `docs/PITFALLS.md` 第 1 节

更多 → [`docs/PITFALLS.md`](docs/PITFALLS.md)

## 文件清单

```
headphone-remap/
├── README.md                          ← 本文件（5 分钟上手 + 使用说明）
├── install.ps1                        ← 一键安装/卸载（PowerShell）
├── .gitignore
├── scripts/                           ← 实际部署的脚本
│   ├── headphone_remap.ahk            ←   AHK v2 按键映射
│   ├── headphone_watcher.ps1          ←   PnP 插拔监听（轮询）
│   └── setup_autostart.ps1            ←   单独配自启（install.ps1 也会调）
├── diagnostics/                       ← 出问题时定位用
│   ├── README.md                      ←   决策树
│   ├── audio_check.ps1                ←   查音频端点
│   ├── hid_check.ps1                  ←   查 HID 设备
│   ├── key_listen.py                  ←   Python 按键捕获（验证硬件）
│   └── inject_sendinput.py            ←   SendInput 注入测试
├── tests/
│   └── headphone_test.html            ← 5 道选择题测试页
└── docs/
    ├── PRINCIPLES.md                  ← 原理详解（CTIA / Realtek / AHK v2）
    ├── PITFALLS.md                    ← 踩坑记录（v2 怪癖 / 编码 / COM 等）
    ├── architecture.txt               ← 数据流 ASCII 图
    └── sample_logs.txt                ← 成功/故障日志样例
```

## 自定义键映射

编辑 `scripts/headphone_remap.ahk`，把 `Send "{Up}"` / `Send "{Down}"` / `Send "{Enter}"` 改成想要的键：
- `Send "{Tab}"` / `Send "{Esc}"` / `Send "^{Tab}"` 等
- 任何 AHK v2 支持的键名（详见 [AHK v2 键名表](https://www.autohotkey.com/docs/v2/KeyList.htm)）

改完直接双击运行新脚本（看门狗下次插拔时会自动加载新版本）。