"""小喵掌机 ST7735 屏幕正确初始化 + 测试"""
import machine, time

# === 引脚定义（按手册实测结果）===
SCR_DC  = machine.Pin(4, machine.Pin.OUT)
SCR_CS  = machine.Pin(5, machine.Pin.OUT)
SCR_RST = machine.Pin(19, machine.Pin.OUT)  # 手册：GPIO19，与 MISO 共用

spi = machine.SPI(2, baudrate=20000000, sck=machine.Pin(18), mosi=machine.Pin(23))

def write_cmd(cmd):
    SCR_DC.value(0)
    SCR_CS.value(0)
    spi.write(bytearray([cmd]))
    SCR_CS.value(1)

def write_data(data):
    SCR_DC.value(1)
    SCR_CS.value(0)
    spi.write(data)
    SCR_CS.value(1)

def set_window(x0, y0, x1, y1):
    """设置显示窗口（CASET=0x2A, RASET=0x2B）"""
    write_cmd(0x2A)
    write_data(bytearray([0x00, x0, 0x00, x1]))
    write_cmd(0x2B)
    write_data(bytearray([0x00, y0, 0x00, y1]))
    write_cmd(0x2C)  # RAMWR - 开始写入

def fill_screen(color):
    """用 RGB565 颜色填充全屏（横屏 160x128）"""
    set_window(0, 0, 159, 127)
    SCR_DC.value(1)
    SCR_CS.value(0)
    line = bytearray([(color >> 8) & 0xFF, color & 0xFF] * 160)
    for _ in range(128):
        spi.write(line)
    SCR_CS.value(1)

def init_st7735():
    """ST7735 完整初始化序列"""
    # 硬件复位
    SCR_RST.value(0)
    time.sleep_ms(50)
    SCR_RST.value(1)
    time.sleep_ms(150)

    # 退出睡眠
    write_cmd(0x11)
    time.sleep_ms(200)

    # 设置显示方向 (MADCTL)
    # 0x60 = MX=1, MV=1 → 横屏 160x128, RGB
    # 0xC0 = 翻转竖屏
    # 0x00 = 竖屏 128x160
    write_cmd(0x36)
    write_data(b'\x60')

    # 16-bit RGB565 色深
    write_cmd(0x3A)
    write_data(b'\x05')

    # 开启显示
    write_cmd(0x29)

    # 释放 RST 引脚（让 GPIO19 恢复 MISO 功能）
    rst_release = machine.Pin(19, machine.Pin.IN)

    time.sleep_ms(50)

# === 主程序 ===
print("初始化 ST7735...")
init_st7735()
print("初始化完成！")

# === 颜色循环测试 ===
colors = [
    (0xF800, "RED"),
    (0x07E0, "GREEN"),
    (0x001F, "BLUE"),
    (0xFFFF, "WHITE"),
    (0x0000, "BLACK"),
]

for color, name in colors:
    print(f"显示: {name}")
    fill_screen(color)
    time.sleep(1.5)

# 最后保持白色
fill_screen(0xFFFF)
print("测试完成！屏幕保持白色")
