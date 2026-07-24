"""小喵掌机 - 主菜单"""
import machine, time, framebuf

# 引脚
DC = machine.Pin(4, machine.Pin.OUT)
CS = machine.Pin(5, machine.Pin.OUT)
RST = machine.Pin(19, machine.Pin.OUT)
spi = machine.SPI(2, baudrate=20000000, sck=machine.Pin(18), mosi=machine.Pin(23))

U = machine.Pin(2, machine.Pin.IN, machine.Pin.PULL_UP)
D = machine.Pin(13, machine.Pin.IN, machine.Pin.PULL_UP)
L = machine.Pin(27, machine.Pin.IN, machine.Pin.PULL_UP)
R = machine.Pin(35, machine.Pin.IN, machine.Pin.PULL_DOWN)
A = machine.Pin(34, machine.Pin.IN, machine.Pin.PULL_DOWN)
B = machine.Pin(12, machine.Pin.IN, machine.Pin.PULL_UP)

W, H = 160, 128
buf = bytearray(W * H * 2)
fb = framebuf.FrameBuffer(buf, W, H, framebuf.RGB565)

C0 = 0x0000; C1 = 0xFFFF; C2 = 0xE007; C3 = 0x00F8; C4 = 0x001F
C5 = 0xFF07; C6 = 0x8410; C7 = 0x1082; C8 = 0xE0E0

def wc(c):
    DC.value(0); CS.value(0); spi.write(bytearray([c])); CS.value(1)
def wd(d):
    DC.value(1); CS.value(0); spi.write(d); CS.value(1)

def init():
    RST.value(0); time.sleep_ms(50)
    RST.value(1); time.sleep_ms(150)
    wc(0x11); time.sleep_ms(200)
    wc(0x36); wd(b'\x60')
    wc(0x3A); wd(b'\x05')
    wc(0x29)
    machine.Pin(19, machine.Pin.IN)

def ref():
    wc(0x2A); wd(bytes([0,0,0,159]))
    wc(0x2B); wd(bytes([0,0,0,127]))
    wc(0x2C)
    DC.value(1); CS.value(0); spi.write(buf); CS.value(1)

def key():
    """按键检测（模仿游戏里的方式）"""
    while True:
        if U.value() == 0:
            time.sleep_ms(5)
            while U.value() == 0: time.sleep_ms(5)
            return 'U'
        if D.value() == 0:
            time.sleep_ms(5)
            while D.value() == 0: time.sleep_ms(5)
            return 'D'
        if L.value() == 0:
            time.sleep_ms(5)
            while L.value() == 0: time.sleep_ms(5)
            return 'L'
        if R.value() == 0:
            time.sleep_ms(5)
            while R.value() == 0: time.sleep_ms(5)
            return 'R'
        if B.value() == 0:
            time.sleep_ms(5)
            while B.value() == 0: time.sleep_ms(5)
            return 'B'
        if A.value() == 0:
            time.sleep_ms(5)
            while A.value() == 0: time.sleep_ms(5)
            return 'A'

def icon(fb, x, y, pix, col, bg=C0):
    for row, line in enumerate(pix.strip().split('\n')):
        for col_i, ch in enumerate(line[:20]):
            if ch == '1':
                fb.pixel(x+col_i, y+row, col)

ICON_GAME = """
11111111111111111111
10000000000000000001
10111111111111111101
10100000000000000101
10101111000011110101
10100000000000000101
10111111111111111101
10000000000000000101
10111111111111111101
10100000000000000101
10101111000011110101
10100000000000000101
10111111111111111101
10000000000000000101
10111111111111111101
10100000000000000101
10101111000011110101
10100000000000000101
10111111111111111101
10000000000000000001
11111111111111111111
"""

ICON_TOOL = """
00000001110000000000
00000011111000000000
00000111111100000000
00001111111110000000
00011110011111000000
00111100011111100000
01111000011111110000
11110000011111111000
11100001111111111100
11000011111111111100
11000111111111111100
11001111111111111110
01111111111111111100
00111111111111111000
00011111111111110000
00001111111111100000
00000111111111000000
00000011111110000000
00000001111100000000
00000000111000000000
"""

ICON_LIGHT = """
00000011111000000000
00000111111100000000
00001111111110000000
00001111111110000000
00011111111111000000
00011111111111000000
00111111111111100000
00111111111111100000
01111111111111110000
01111111111111110000
11111111111111111000
11100011111000111000
11100011111000111000
01100011111000110000
01100011111000110000
00110001110001100000
00011000000011000000
00001111111110000000
00000111111100000000
00000011111000000000
"""

ICON_FOLDER = """
00000000000000000000
01111111111111111110
11111111111111111111
11000000000000000011
11111111111111111111
11111111111111111111
11111111111111111111
11111111111111111111
11111111111111111111
11111111111111111111
11111111111111111111
11111111111111111111
11111111111111111111
11111111111111111111
11111111111111111111
11111111111111111111
11111111111111111111
11111111111111111111
01111111111111111110
00111111111111111100
"""

def menu(title, items):
    sel = 0
    while True:
        fb.fill(C0)
        fb.fill_rect(0, 0, 160, 14, C4)
        fb.text(title, 8, 3, C1)
        for i, (name, _) in enumerate(items):
            y = 18 + i * 26
            if y > 115: break
            if i == sel:
                fb.fill_rect(1, y-2, 158, 24, C7)
            cl = C5 if i == sel else C6
            fb.text('  ' + name, 14, y+6, cl)
            if i == sel: fb.text('>', 148, y+6, C5)
        fb.text('A=enter  B=back', 4, 118, C6); ref()
        k = key()
        if k == 'U' or k == 'L': sel = (sel-1) % len(items)
        elif k == 'D': sel = (sel+1) % len(items)
        elif k == 'A':
            init()
            items[sel][1]()
            init()
            return

def run_file(path):
    fb.fill(C0); ref()
    try:
        exec(open(path).read(), {})
    except SystemExit:
        pass  # 游戏内按 B 退出

def flashlight():
    fb.fill(C1)
    fb.text('Flashlight ON', 20, 55, C0)
    fb.text('B to exit', 36, 75, C0)
    ref()
    while B.value() == 1: time.sleep_ms(20)
    time.sleep_ms(30)
    while B.value() == 0: time.sleep_ms(10)

def calc():
    nums = [('7','8','9'),('4','5','6'),('1','2','3'),('C','0','=')]
    ops = ['+','-','*','/']
    disp = '0'; a = 0; op = ''
    sx, sy = 0, 0; mode = 'n'
    while True:
        fb.fill(C0)
        fb.text('Calculator', 30, 3, C5)
        fb.fill_rect(2, 14, 156, 18, C7)
        fb.text(str(disp)[:14], 148 - len(str(disp)[:14])*8, 17, C1)
        for r in range(4):
            for c in range(3):
                n = nums[r][c]; x = 4 + c*38; y = 36 + r*22
                fb.fill_rect(x, y, 36, 20, C4 if r==sy and c==sx and mode=='n' else C7)
                fb.text(n, x+14, y+5, C3 if n=='C' else C1)
        for i, o in enumerate(ops):
            x, y = 120, 36 + i*22
            fb.fill_rect(x, y, 36, 20, C8 if i==sy and mode=='o' else C7)
            fb.text(o, x+14, y+5, C1)
        fb.text('B=exit', 8, 120, C6); ref()
        k = key()
        if k == 'B': return
        if k == 'U' and sy > 0: sy -= 1
        if k == 'D':
            if mode == 'n' and sy < 3: sy += 1
            elif mode == 'n' and sy == 3: mode = 'o'; sy = 0
        if mode == 'n' and k == 'A':
            n = nums[sy][sx]
            if n == 'C': disp = '0'; a = 0; op = ''
            elif n == '=':
                try:
                    disp = str(eval(f'{a}{op}{disp}'))
                except: disp = 'ERR'
            else: disp = n if disp == '0' else disp + n
        if mode == 'o' and k == 'A':
            try: a = int(disp); op = ops[sy]; disp = '0'
            except: disp = 'ERR'
            mode = 'n'; sx = 0; sy = 0
        if mode == 'n':
            if k == 'L' and sx > 0: sx -= 1
            if k == 'R' and sx < 2: sx += 1

def volume():
    v = 512
    beep = machine.PWM(machine.Pin(14))
    while True:
        fb.fill(C0)
        fb.text('Volume', 50, 10, C5)
        fb.hline(0, 22, 160, C1)
        fb.fill_rect(10, 50, 140, 20, C7)
        fb.fill_rect(12, 52, max(4, v*136//1024), 16, C4)
        fb.text(str(v*100//1024)+'%', 56, 55, C1)
        fb.text('U/D adj  B=back', 12, 118, C6); ref()
        k = key()
        if k == 'U': v = min(1023, v+64)
        elif k == 'D': v = max(0, v-64)
        elif k == 'B': beep.duty(0); beep.deinit(); return
        beep.freq(800); beep.duty(v); time.sleep_ms(40); beep.duty(0)

def files():
    import os
    sel = 0
    while True:
        fl = [f for f in os.listdir() if f.endswith('.py') and f != 'boot.py' and f != 'menu.py']
        fb.fill(C0)
        fb.text('Files', 60, 3, C5)
        fb.hline(0, 14, 160, C1)
        if not fl:
            fb.text('(no files)', 40, 50, C6)
        else:
            for i, fn in enumerate(fl):
                y = 18 + i*13
                if y > 110: break
                sz = os.stat(fn)[6]//1024
                if i == sel:
                    fb.fill_rect(1, y-1, 158, 12, C4)
                    fb.text('> '+fn, 3, y, C1)
                else:
                    fb.text('  '+fn, 3, y, C6)
                fb.text(str(sz)+'K', 130, y, C6)
        vfs = os.statvfs('/')
        fb.text('Free:'+str(vfs[0]*vfs[3]//1024)+'K', 4, 118, C6)
        ref()
        k = key()
        if k == 'U' and fl: sel = (sel-1) % len(fl)
        elif k == 'D' and fl: sel = (sel+1) % len(fl)
        elif k == 'B': return
        elif k == 'A' and fl:
            fn = fl[sel]
            fb.fill(C0)
            fb.text('Delete?', 50, 40, C1)
            fb.text(fn, 8, 56, C8); fb.text('A=yes B=no', 20, 80, C2); ref()
            if key() == 'A':
                try:
                    os.remove(fn)
                    fb.fill(C0); fb.text('Deleted!', 50, 55, C2); ref(); time.sleep(1)
                except:
                    fb.fill(C0); fb.text('Error!', 50, 55, C3); ref(); time.sleep(1)
            sel = min(sel, max(0, len([f for f in os.listdir() if f.endswith('.py') and f!='boot.py' and f!='menu.py'])-1))

# === Start ===
init()

def main_menu():
    mm = [
        ('Games', lambda: menu('Games', [
            ('Dodgeball', lambda: run_file('dodgeball.py')),
            ('Tetris', lambda: run_file('tetris_color.py')),
            ('HW Test', lambda: run_file('hardware_test.py')),
        ]), ICON_GAME),
        ('Tools', lambda: menu('Tools', [
            ('Flashlight', flashlight),
            ('Calculator', calc),
        ]), ICON_TOOL),
        ('Settings', lambda: menu('Settings', [
            ('Volume', volume),
        ]), ICON_LIGHT),
        ('Files', lambda: files(), ICON_FOLDER),
    ]
    sel_x, sel_y = 0, 0
    while True:
        fb.fill(C0)
        fb.fill_rect(0, 0, 160, 14, C4)
        fb.text('XiaoMiao', 56, 3, C1)
        # 四宫格 2x2（方向键导航）
        for i in range(4):
            name, _, ico = mm[i]
            x = 4 + (i % 2) * 78
            y = 20 + (i // 2) * 52
            sx, sy = i % 2, i // 2
            if sx == sel_x and sy == sel_y:
                fb.fill_rect(x, y, 75, 48, C4)
            else:
                fb.fill_rect(x, y, 75, 48, C7)
            icon(fb, x+27, y+6, ico, C5 if (sx==sel_x and sy==sel_y) else C6)
            tx = x + (75 - len(name)*8) // 2
            fb.text(name, tx, y+36, C1 if (sx==sel_x and sy==sel_y) else C6)
        fb.text('A=enter  B=back', 4, 118, C6)
        ref()
        k = key()
        if k == 'U' and sel_y > 0: sel_y -= 1
        elif k == 'D' and sel_y < 1: sel_y += 1
        elif k == 'L' and sel_x > 0: sel_x -= 1
        elif k == 'R' and sel_x < 1: sel_x += 1
        elif k == 'A':
            init()
            mm[sel_y*2 + sel_x][1]()
            init()

main_menu()
