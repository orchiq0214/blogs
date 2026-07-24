import machine
import time
import framebuf
import random

# ==========================================
# 1. 硬件引脚配置
# ==========================================
SCR_DC   = machine.Pin(4, machine.Pin.OUT)
SCR_CS   = machine.Pin(5, machine.Pin.OUT)
SCR_RST  = machine.Pin(2, machine.Pin.OUT)
SCR_BL   = machine.Pin(21, machine.Pin.OUT, value=1)
WIDTH, HEIGHT = 160, 128

# SPI 高速模式
spi = machine.SPI(2, baudrate=24000000, sck=machine.Pin(18), mosi=machine.Pin(23))

# 按键引脚 (Pin 34, 35 需要外部上拉或注意逻辑)
btn_a  = machine.Pin(34, machine.Pin.IN)
btn_b  = machine.Pin(12, machine.Pin.IN, machine.Pin.PULL_UP)
btn_up = machine.Pin(2, machine.Pin.IN, machine.Pin.PULL_UP)
btn_dn = machine.Pin(13, machine.Pin.IN, machine.Pin.PULL_UP)
btn_lt = machine.Pin(27, machine.Pin.IN, machine.Pin.PULL_UP)
btn_rt = machine.Pin(35, machine.Pin.IN)

# 光感与扬声器
adc_light = machine.ADC(machine.Pin(36))
speaker = machine.PWM(machine.Pin(14))
speaker.duty(0)

# ==========================================
# 2. 颜色预定义 (大端序，解决颜色反转并提升性能)
# ==========================================
# 算法: (Original_Color >> 8) | ((Original_Color & 0xFF) << 8)
C_BLACK  = 0x0000
C_WHITE  = 0xFFFF
C_GREEN  = 0xE007  # 0x07E0 转换后
C_RED    = 0x00F8  # 0xF800 转换后
C_YELLOW = 0xE0FF  # 0xFFE0 转换后

# ==========================================
# 3. 驱动底层
# ==========================================
buffer = bytearray(WIDTH * HEIGHT * 2)
fbuf = framebuf.FrameBuffer(buffer, WIDTH, HEIGHT, framebuf.RGB565)

def write_cmd(cmd):
    SCR_DC.value(0); SCR_CS.value(0)
    spi.write(bytearray([cmd])); SCR_CS.value(1)

def write_data(data):
    SCR_DC.value(1); SCR_CS.value(0)
    spi.write(data); SCR_CS.value(1)

def refresh():
    write_cmd(0x2A); write_data(bytearray([0x00, 0x00, 0x00, 159]))
    write_cmd(0x2B); write_data(bytearray([0x00, 0x00, 0x00, 127]))
    write_cmd(0x2C)
    # 极速推送：不再进行字节交换循环
    SCR_DC.value(1); SCR_CS.value(0)
    spi.write(buffer)
    SCR_CS.value(1)

def beep(freq, duration):
    try:
        speaker.freq(freq)
        speaker.duty(512)
        time.sleep_ms(duration)
        speaker.duty(0)
    except: pass

# ==========================================
# 4. 游戏逻辑
# ==========================================
def run_game():
    random.seed(adc_light.read())
    px, py = 80, 64        # 玩家坐标
    move_speed = 5         # 移动速度：5像素/帧
    enemies = []           # 敌人列表 [x, y, vx, vy]
    score = 0
    
    # 初始化第一个敌人
    enemies.append([random.randint(20, 140), 10, 2, 2])

    while True:
        # --- 1. 清屏 (黑色) ---
        fbuf.fill(C_BLACK)
        
        # --- 2. 处理输入 ---
        # 针对不同按键的低电平触发逻辑
        if btn_up.value() == 0: py -= move_speed
        if btn_dn.value() == 0: py += move_speed
        if btn_lt.value() == 0: px -= move_speed
        if btn_rt.value() == 0: px += move_speed
        
        # B 键加速
        if btn_b.value() == 0: move_speed = 8
        else: move_speed = 5
        
        # 边界碰撞
        px = max(0, min(152, px))
        py = max(0, min(120, py))
        
        # --- 3. 更新敌人逻辑 ---
        for e in enemies:
            e[0] += e[2]
            e[1] += e[3]
            
            # 墙壁反弹
            if e[0] <= 0 or e[0] >= 156: e[2] *= -1
            if e[1] <= 0 or e[1] >= 124: e[3] *= -1
            
            # 绘制敌人 (红色)
            fbuf.fill_rect(int(e[0]), int(e[1]), 5, 5, C_RED)
            
            # 碰撞检测
            if abs(px + 4 - (e[0] + 2)) < 6 and abs(py + 4 - (e[1] + 2)) < 6:
                return score # 游戏结束，返回分数

        # --- 4. 难度增加 ---
        score += 1
        if score % 150 == 0: # 每150帧增加一个敌人
            enemies.append([random.randint(0, 150), 0, random.choice([-2,2]), 2])
            beep(1200, 30)

        # --- 5. 绘制玩家和UI ---
        fbuf.fill_rect(px, py, 8, 8, C_GREEN)
        fbuf.text("S:%d" % (score//10), 2, 2, C_YELLOW)
        
        # --- 6. 刷新屏幕 ---
        refresh()
        # 不再使用 time.sleep，由 SPI 传输速度自然控制帧率

# ==========================================
# 5. 主循环
# ==========================================
while True:
    final_score = run_game()
    
    # 死亡界面
    fbuf.fill(C_BLACK)
    fbuf.text("GAME OVER", 45, 50, C_RED)
    fbuf.text("Score: %d" % (final_score//10), 45, 70, C_WHITE)
    fbuf.text("Press A to Restart", 10, 100, C_GREEN)
    refresh()
    
    beep(400, 200)
    time.sleep(0.5)
    
    # 等待 A 键重启
    while btn_a.value() == 1:
        time.sleep_ms(20)