# 小喵掌机（学而思 ESP32 编程机）折腾记录

> 学而思 ESP32 掌机（别名：小喵掌机、XiaoMiao、学而思编程掌机）  
> 主控：ESP32-WROVER-B（双核 240MHz, 8MB PSRAM）  
> 屏幕：1.8寸 ST7735 TFT LCD（128×160, SPI）  
> 价格：二手约 ¥50

---

## 目录

1. [硬件概览](#1-硬件概览)
2. [开发环境搭建](#2-开发环境搭建)
3. [固件选择与刷写](#3-固件选择与刷写)
4. [屏幕驱动](#4-屏幕驱动)
5. [按键系统](#5-按键系统)
6. [主菜单系统](#6-主菜单系统)
7. [游戏与工具](#7-游戏与工具)
8. [SD 卡驱动（未解决）](#8-sd-卡驱动未解决)
9. [项目结构](#9-项目结构)
10. [参考资料](#10-参考资料)

---

## 1. 硬件概览

| 项目 | 规格 |
|------|------|
| 主控 | ESP32-WROVER-B（240MHz, 8MB PSRAM, 4MB Flash） |
| 屏幕 | 1.8" ST7735 TFT, 128×160, SPI, RGB565 |
| 按键 | 6键：上(GPIO2) 下(GPIO13) 左(GPIO27) 右(GPIO35) A(GPIO34) B(GPIO12) |
| 蜂鸣器 | 无源蜂鸣器（GPIO14, PWM 驱动） |
| 传感器 | 光照传感器(GPIO36)、热敏电阻(GPIO39) |
| 存储 | MicroSD 卡槽（SPI2, CS=GPIO22, 与屏幕共用 SPI 总线） |
| 扩展 | I2C(GPIO15/21)、UART0(GPIO1/3)、4个预留 GPIO |
| USB | Micro USB（充电+下载），GD32F3X0 芯片作 USB 转串口 |
| 电池 | 内置可充电锂电池 |

### 完整引脚表

```
┌──────────────────────────────────────┐
│ 功能        │ GPIO │ 备注            │
├──────────────┼──────┼─────────────────┤
│ 上键 UP     │ 2    │ 启动敏感，有上拉 │
│ 下键 DOWN   │ 13   │ 有上拉           │
│ 左键 LEFT   │ 27   │ 有上拉           │
│ 右键 RIGHT  │ 35   │ 仅输入，无上下拉 │
│ A 键        │ 34   │ 仅输入，无上下拉 │
│ B 键        │ 12   │ 启动敏感，有上拉 │
│ 蜂鸣器      │ 14   │ PWM             │
│ 光照传感器  │ 36   │ ADC1_CH0        │
│ 热敏电阻    │ 39   │ ADC1_CH3        │
│ TFT DC      │ 4    │                 │
│ TFT CS      │ 5    │                 │
│ TFT RES     │ 19   │ 与 SD MISO 共用 │
│ I2C SCL     │ 15   │                 │
│ I2C SDA     │ 21   │                 │
│ SPI SCK     │ 18   │ TFT+SD 共享     │
│ SPI MOSI    │ 23   │ TFT+SD 共享     │
│ SPI MISO    │ 19   │ TFT+SD 共享     │
│ SD CS       │ 22   │                 │
└──────────────────────────────────────┘
```

### 关键硬件问题

- **GPIO19 同时用作 TFT RESET 和 SPI MISO**：这是最大坑点。初始化屏幕时需要 GPIO19 做 RESET 输出，之后释放为输入供 SPI MISO 使用。硬件 SPI 驱动在此引脚上工作不正常。
- **GPIO34/35 仅输入引脚**：A 键和右键无内部上拉/下拉，会导致浮空误触。

---

## 2. 开发环境搭建

### 所需工具

| 工具 | 用途 | 安装 |
|------|------|------|
| Python 3 | 运行刷写工具 | python.org |
| esptool | 擦除/刷写固件 | `pip install esptool` |
| mpremote | 文件管理/REPL | `pip install mpremote` |
| Thonny IDE | 图形化 MicroPython 开发 | thonny.org |

### 连接掌机

1. 通过 Micro USB 连接电脑
2. Windows 识别为 COM 口（本机为 COM9）
3. 使用 `mpremote connect COM9` 验证连接
4. 如果无响应，按 RST 按钮重启

```bash
# 验证连接
python -m mpremote connect COM9 exec "import os; print(os.listdir())"
```

---

## 3. 固件选择与刷写

### 固件对比

| 固件 | 优点 | 缺点 |
|------|------|------|
| **标准 MicroPython** ✅ | 兼容性好，framebuf 游戏可用 | 无 LVGL，SD 卡驱动需自配 |
| LVGL-MicroPython (Gitee) | 带 GUI 库，屏幕驱动内置 | 游戏代码不兼容（SPI API 不同） |
| LVGL-MicroPython (GitHub) | — | **实测有 bug（颜色参数崩溃）** |
| ESP-IDF 原生 | 性能最高（FPS 60-90） | 开发复杂度高 |

### 刷写步骤

**推荐使用标准 MicroPython v1.28.0（带 SPIRAM 支持）：**

```bash
# 1. 下载固件
# https://micropython.org/download/ESP32_GENERIC/
# 选 ESP32_GENERIC-SPIRAM 版本

# 2. 擦除 Flash
python -m esptool --port COM9 --baud 921200 erase_flash

# 3. 刷写固件（地址 0x1000）
python -m esptool --port COM9 --baud 921200 write_flash 0x1000 ESP32_GENERIC-SPIRAM-20260406-v1.28.0.bin
```

> ⚠️ 注意：刷写后需要用 `--after no_reset` 或按 RST 按钮重启。

---

## 4. 屏幕驱动

### 初始化序列（ST7735）

屏幕使用 ST7735 驱动 IC，初始化需要以下步骤：

```python
def init_st7735():
    # 硬件复位
    RST.value(0); time.sleep_ms(50)
    RST.value(1); time.sleep_ms(150)

    # 退出睡眠模式
    write_cmd(0x11); time.sleep_ms(200)

    # 设置横屏方向 (MADCTL, 0x60 = MX=1, MV=1)
    write_cmd(0x36); write_data(b'\x60')

    # 16-bit RGB565 色深
    write_cmd(0x3A); write_data(b'\x05')

    # 开启显示
    write_cmd(0x29)
```

### 关键参数

```python
import machine
spi = machine.SPI(2, baudrate=20000000, sck=machine.Pin(18), mosi=machine.Pin(23))
# ⚠️ 屏幕初始化时不要加 miso 参数！GPIO19 此时用作 RESET
```

### 颜色格式

ST7735 使用 RGB565 大端序格式。颜色值需要字节交换：

```python
# RGB565 颜色转换（大端序）
# 原色 0x07E0 (GREEN) → 大端序 0xE007
def swap_color(c):
    return ((c >> 8) | ((c & 0xFF) << 8)) & 0xFFFF
```

---

## 5. 按键系统

### 引脚与配置

| 按键 | GPIO | 配置 | 备注 |
|------|------|------|------|
| 上 | 2 | PULL_UP | 启动敏感 |
| 下 | 13 | PULL_UP | — |
| 左 | 27 | PULL_UP | — |
| 右 | 35 | PULL_DOWN 或外接上拉 | 仅输入，无内部上拉 |
| A | 34 | PULL_DOWN 或外接上拉 | 仅输入，无内部上拉 |
| B | 12 | PULL_UP | 启动敏感 |

### ⚠️ 已知问题

GPIO34 和 GPIO35 是 ESP32 的**仅输入引脚**，没有内部上拉/下拉电阻。这导致：

1. **浮空时可能随机读 0** → 误触发按键检测
2. **PULL_DOWN 可能不生效**（取决于芯片版本）
3. **解决方案**：软件上做二次确认去抖，或加外部上拉电阻

### 按键检测实现

```python
def key():
    """按键检测：连续读两次确认防抖"""
    while True:
        if U.value() == 0:
            time.sleep_ms(5)
            if U.value() != 0: continue  # 抖动忽略
            while U.value() == 0: time.sleep_ms(5)
            return 'U'
        # ... 其他按键同理
```

---

## 6. 主菜单系统

### 四宫格布局

```
┌────────────┐  ┌────────────┐
│   Games    │  │   Tools    │
│   🎮      │  │   🔧      │
└────────────┘  └────────────┘
┌────────────┐  ┌────────────┐
│  Settings  │  │   Files    │
│   ⚙️      │  │   📁      │
└────────────┘  └────────────┘
```

### 导航

- **上/下/左/右**：方向导航
- **B 键**：确认/进入
- 子菜单同样使用 **上下+B**

### 菜单结构

```
主菜单
├── Games
│   ├── Dodgeball（躲避球）
│   ├── Tetris（俄罗斯方块）
│   └── HW Test（硬件测试）
├── Tools
│   ├── Flashlight（手电筒）
│   └── Calculator（计算器）
├── Settings
│   └── Volume（音量）
└── File Mgr
    └── 文件列表（可删除）
```

---

## 7. 游戏与工具

### 游戏退出机制

游戏代码有独立的 `while True` 循环，进入后无法通过菜单返回。解决方案：

- **躲避球**：死亡画面按 **B 键** 退出回菜单
- **俄罗斯方块**：死亡后按 **B 键** 退出回菜单
- 使用 `raise SystemExit` 触发 `exec()` 的异常捕获

### 已实现工具

| 工具 | 文件 | 说明 |
|------|------|------|
| 手电筒 | 内置 menu.py | 白色全屏，按 B 退出 |
| 计算器 | 内置 menu.py | 加减乘除，方向键+B 操作 |
| 音量 | 内置 menu.py | 蜂鸣器 PWM 调幅，上下调节 |

---

## 8. SD 卡驱动（未解决）

### 尝试过的方案

| 方案 | 结果 | 原因 |
|------|------|------|
| `machine.SPI(2, ..., miso=19)` | ❌ 响应 0xC1/0x7F | GPIO19 硬件 SPI 冲突 |
| `SoftSPI` | ❌ 同 hardware SPI | 底层实现相同 |
| `machine.SDCard(spi, cs)` | ❌ 不支持 SPI 模式 | v1.28.0 API 变动 |
| `machine.SDCard(slot=3, ...)` | ❌ ESP_ERR_INVALID_STATE | SDSPI 驱动未启用 |
| 纯位操作 (bit-bang) | ⚠️ CMD0 通过(0x01)但 ACMD41 失败 | 时序精度不够 |
| 混合模式（HW SPI 发命令 + GPIO 读 MISO） | ❌ 数据错误 | 时钟同步问题 |

### 根本原因

GPIO19 被同时用作 **SPI MISO** 和 **TFT RESET**。初始化屏幕后虽然释放为输入，但当硬件 SPI 外设接管引脚时，可能与 LCD 的 RESET 电路产生电气冲突。

### 可能解决方向

1. **换一张不同品牌的 SD 卡**（部分卡对 SPI 时序要求不同）
2. **刷 ESP-IDF 原生固件**（可以精确控制 SPI 时序和 GPIO 矩阵）
3. **使用更完善的 SD 卡驱动库**
4. **物理飞线**：将 SD 卡 MISO 改到其他空闲 GPIO

---

## 9. 项目结构

```
xiaomiao-esp32-handheld/
├── README.md              # 本文件
├── games/
│   ├── dodgeball.py       # 躲避球（已打退出补丁）
│   ├── tetris_color.py    # 俄罗斯方块（已打退出补丁）
│   └── hardware_test.py   # 硬件测试（按键/蜂鸣器/光感）
├── system/
│   ├── menu.py            # 四宫格主菜单
│   ├── boot.py            # 启动脚本
│   └── sdcard.py          # SD 卡驱动（位操作版）
└── tools/
    ├── st7735_test.py     # 屏幕驱动测试
    ├── esp32_upload.py    # 串口文件上传工具
    └── upload_files_v2.py # base64 批量上传
```

### 文件说明

| 文件 | 大小 | 说明 |
|------|------|------|
| `boot.py` | ~20B | 开机启动 `import menu` |
| `menu.py` | ~10KB | 主菜单系统（四宫格+子菜单） |
| `dodgeball.py` | ~5KB | 躲避球游戏，B 键退出 |
| `tetris_color.py` | ~8KB | 俄罗斯方块彩色版，B 键退出 |
| `hardware_test.py` | ~4KB | 按键/蜂鸣器/光感测试 |
| `st7735_test.py` | ~2KB | 屏幕初始化与颜色测试 |
| `sdcard.py` | ~6KB | 位操作 SD 卡驱动（实验性） |

---

## 10. 参考资料

### 代码仓库

| 仓库 | 说明 |
|------|------|
| [Gitee: py2012/xueersi-eps32-handheld-device](https://gitee.com/py2012/xueersi-eps32-handheld-device) | LVGL-MicroPython 预编译固件 + 驱动 |
| [GitHub: pysn2012/xueersi-xiaomiao](https://github.com/pysn2012/xueersi-xiaomiao) | 综合开发仓库（示例/ESPHome/引脚文档） |
| [GitHub: initdc/mpy-xueersi-coding-esp32](https://github.com/initdc/mpy-xueersi-coding-esp32) | 游戏示例（俄罗斯方块/躲避球/硬件测试） |
| [GitHub: funnygeeker/micropython-easydisplay](https://github.com/funnygeeker/micropython-easydisplay) | EasyDisplay 中文字体库 |

### 参考文章

| 文章 | 内容 |
|------|------|
| [学而思掌机折腾记录](https://xuexi1234567890.github.io/jiyou/BznJoSD7g/) | 硬件逆向、I2C 指令还原、MicroBlocks 固件 |
| [50元不到的ESP32开发板](https://mp.weixin.qq.com/s/r7XjB64BlRY5ZDpYVHVl3g) | 硬件介绍、拆解、固件烧录 |
| [SD卡和屏幕共用一个SPI](http://mp.weixin.qq.com/s?__biz=MzkzNDQzMTc0OA==&mid=2247484900) | SPI 分时复用技巧 |
| [简易TXT阅读器](http://mp.weixin.qq.com/s?__biz=MzkzNDQzMTc0OA==&mid=2247484908) | SD 卡读取 + 文本显示 |

---

## 附录：问题与解决记录

### 问题 1：esptool 连不上 ESP32
**症状**：`Failed to connect to Espressif device: No serial data received.`
**原因**：GD32 USB 串口芯片不支持 DTR/RTS 自动复位
**解决**：手动按 RST 按钮

### 问题 2：刷机后串口无输出
**症状**：`mode` 显示 COM9 但无数据
**原因**：`--after no_reset` 导致芯片停在 bootloader
**解决**：用 `esptool chip-id` 触发硬件复位，或按 RST

### 问题 3：framebuf 菜单无法导入（ImportError）
**症状**：MicroPython v1.28.0 报 `ImportError: no module named 'base64'`
**原因**：MicroPython 中 base64 模块名为 `ubinascii`
**教训**：MicroPython 的模块命名与 CPython 不同（前缀 `u`）

### 问题 4：STM7735 屏幕初始化后无显示
**症状**：屏幕白屏，无任何画面
**原因**：缺少完整的初始化序列（复位→睡眠退出→颜色模式→显示开启）
**解决**：执行完整的 init 序列（见第 4 节）

### 问题 5：按键无响应（进入菜单后所有方向键失效）
**症状**：菜单显示正常，但按上下左右无反应
**原因**：GPIO35（右键）+ GPIO34（A 键）浮空读 0，`key()` 检测到 A 一直按下
**解决**：添加 PULL_DOWN + 去抖 + 超时保护

### 问题 6：游戏无法退出
**症状**：进入躲避球/俄罗斯方块后回不了菜单
**原因**：游戏代码有独立的 `while True` 循环
**解决**：在游戏死亡画面加入 B 键检测 → `raise SystemExit` → 菜单捕获异常

### 问题 7：SD 卡无法识别
**症状**：CMD0 响应 0x7F/0xC1（非正常 R1 0x01）
**原因**：GPIO19（MISO/RESET 共用）与硬件 SPI 驱动冲突
**状态**：❌ 未解决
