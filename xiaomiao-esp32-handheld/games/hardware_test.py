import machine
import time
import framebuf
import ustruct

# ==========================================
# 1. 硬件引脚配置
# ==========================================
# 屏幕引脚
SCR_DC   = machine.Pin(4, machine.Pin.OUT)
SCR_CS   = machine.Pin(5, machine.Pin.OUT)
SCR_RST  = machine.Pin(2, machine.Pin.OUT)
SCR_BL   = machine.Pin(21, machine.Pin.OUT, value=1) # 背光

# 按键引脚 (根据你提供的引脚定义)
key_map = {
    "A": 34, "B": 12, 
    "UP": 2, "DOWN": 13, 
    "LEFT": 27, "RIGHT": 35
}

buttons = {}
for name, pin in key_map.items():
    # GPIO 34, 35 为仅输入引脚，不支持内部上拉
    if pin in [34, 35]:
        buttons[name] = machine.Pin(pin, machine.Pin.IN)
    else:
        buttons[name] = machine.Pin(pin, machine.Pin.IN, machine.Pin.PULL_UP)

# 光感 (ADC)
light_sensor = machine.ADC(machine.Pin(36))
light_sensor.atten(machine.ADC.ATTN_11DB) # 0-3.6V量程

# 扬声器 (PWM)
speaker = machine.PWM(machine.Pin(14))
speaker.duty(0)

# 屏幕参数与 SPI 初始化
WIDTH, HEIGHT = 160, 128
spi = machine.SPI(2, baudrate=24000000, sck=machine.Pin(18), mosi=machine.Pin(23))
buffer = bytearray(WIDTH * HEIGHT * 2)
fbuf = framebuf.FrameBuffer(buffer, WIDTH, HEIGHT, framebuf.RGB565)

# ==========================================
# 2. 核心驱动函数
# ==========================================
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

def init_st7735():
    SCR_RST.value(0)
    time.sleep_ms(50)
    SCR_RST.value(1)
    time.sleep_ms(120)
    write_cmd(0x01) # 软件复位
    time.sleep_ms(150)
    write_cmd(0x11) # 退出睡眠
    write_cmd(0x36)
    write_data(b'\x60') # 顺时针90度
    write_cmd(0x3A)
    write_data(b'\x05')
    write_cmd(0x29) # 开启显示

def refresh_screen():
    write_cmd(0x2A) 
    write_data(bytearray([0x00, 0x00, 0x00, 159]))
    write_cmd(0x2B) 
    write_data(bytearray([0x00, 0x00, 0x00, 127]))
    write_cmd(0x2C)
    # 字节交换解决颜色偏差
    for i in range(0, len(buffer), 2):
        b1 = buffer[i]
        buffer[i] = buffer[i+1]
        buffer[i+1] = b1
    SCR_DC.value(1)
    SCR_CS.value(0)
    spi.write(buffer)
    SCR_CS.value(1)

def beep(freq=1000, duration=50):
    speaker.freq(freq)
    speaker.duty(512)
    time.sleep_ms(duration)
    speaker.duty(0)

# ==========================================
# 3. 动态测试主程序
# ==========================================
def run_test():
    init_st7735()
    print("硬件测试已启动...")
    
    last_pressed = ""
    
    while True:
        # 清屏并绘制背景
        fbuf.fill(0x0000)
        fbuf.rect(0, 0, 160, 128, 0x07E0) # 绿色外框
        fbuf.text("HARDWARE TEST", 30, 10, 0xFFFF)
        fbuf.line(5, 25, 155, 25, 0x4444)
        
        # 1. 读取并显示光感数值
        light_val = light_sensor.read()
        fbuf.text("LIGHT: {}".format(light_val), 15, 40, 0xFFE0)
        # 绘制感光能量条
        bar_width = int((light_val / 4095) * 130)
        fbuf.rect(15, 52, 132, 10, 0xFFFF)
        fbuf.fill_rect(16, 53, bar_width, 8, 0xF800)
        
        # 2. 检测按键状态
        pressed_list = []
        for name, obj in buttons.items():
            if obj.value() == 0: # 假设按下为低电平
                pressed_list.append(name)
        
        status_text = ", ".join(pressed_list) if pressed_list else "NONE"
        fbuf.text("KEYS: ", 15, 80, 0x07FF)
        fbuf.text(status_text, 15, 95, 0xFFFF)
        
        # 3. 按键音反馈
        if pressed_list:
            current_key = pressed_list[0]
            if current_key != last_pressed:
                beep(800 if current_key in ["A", "B"] else 1200, 30)
                last_pressed = current_key
        else:
            last_pressed = ""

        # 4. 刷新屏幕
        refresh_screen()
        time.sleep_ms(50)

# 启动测试
try:
    run_test()
except KeyboardInterrupt:
    speaker.duty(0)
    print("测试停止")