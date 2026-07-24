import machine, time, framebuf, random

# 1. 硬件配置 (保持不变)
SCR_DC = machine.Pin(4, machine.Pin.OUT)
SCR_CS = machine.Pin(5, machine.Pin.OUT)
spi = machine.SPI(2, baudrate=24000000, sck=machine.Pin(18), mosi=machine.Pin(23))

btns = {
    'up': machine.Pin(2, machine.Pin.IN, machine.Pin.PULL_UP),
    'dn': machine.Pin(13, machine.Pin.IN, machine.Pin.PULL_UP),
    'lt': machine.Pin(27, machine.Pin.IN, machine.Pin.PULL_UP),
    'rt': machine.Pin(35, machine.Pin.IN), # 确认35脚有外部上拉
    'a':  machine.Pin(34, machine.Pin.IN), # 暂停
    'b':  machine.Pin(12, machine.Pin.IN, machine.Pin.PULL_UP) # 瞬间落地
}

# ==========================================
# 2. 颜色定义 (大端序 RGB565)
# 针对深色背景优化
# ==========================================
C_BG    = 0x0000 # 黑色背景
C_FRAME = 0xFFFF # 白色边框
C_TEXT  = 0xFFFF # 白色文字
C_WHT   = 0xFFFF

# 7种方块的专属颜色
COLOR_I = 0xFF07 # 青色 (Cyan)
COLOR_O = 0xE0FF # 黄色 (Yellow)
COLOR_T = 0x18F8 # 紫色 (Purple)
COLOR_S = 0xE007 # 绿色 (Green)
COLOR_Z = 0x00F8 # 红色 (Red)
COLOR_J = 0x1F00 # 蓝色 (Blue)
COLOR_L = 0x00FD # 橙色 (Orange)

BLOCK_COLORS = [COLOR_I, COLOR_O, COLOR_T, COLOR_S, COLOR_Z, COLOR_J, COLOR_L]

WIDTH, HEIGHT = 160, 128
COLS, ROWS = 10, 20
OX, OY = 15, 6 

buffer = bytearray(WIDTH * HEIGHT * 2)
fbuf = framebuf.FrameBuffer(buffer, WIDTH, HEIGHT, framebuf.RGB565)

# 标准 7 种方块定义 (0/1 矩阵)
SHAPES = [
    [[1, 1, 1, 1]], # I
    [[1, 1], [1, 1]], # O
    [[0, 1, 0], [1, 1, 1]], # T
    [[0, 1, 1], [1, 1, 0]], # S
    [[1, 1, 0], [0, 1, 1]], # Z
    [[1, 0, 0], [1, 1, 1]], # J
    [[0, 0, 1], [1, 1, 1]]  # L
]

def refresh():
    SCR_DC.value(0); SCR_CS.value(0)
    spi.write(bytearray([0x2A, 0, 0, 0, 159, 0x2B, 0, 0, 0, 127, 0x2C]))
    SCR_DC.value(1); spi.write(buffer); SCR_CS.value(1)

class Tetris:
    def __init__(self):
        # 建立网格：0表示空，非0表示对应位置方块的颜色值
        self.grid = [[0 for _ in range(COLS)] for _ in range(ROWS)]
        self.score = 0
        self.paused = False
        self.game_over = False
        self.next_idx = random.randint(0, 6)
        self.spawn()

    def spawn(self):
        self.idx = self.next_idx
        self.piece = SHAPES[self.idx]
        self.color = BLOCK_COLORS[self.idx] # 获取当前方块的颜色
        self.next_idx = random.randint(0, 6)
        self.px = COLS // 2 - len(self.piece[0]) // 2
        self.py = 0
        if self.is_collision(self.px, self.py):
            self.game_over = True

    def is_collision(self, nx, ny, p=None):
        p = p or self.piece
        for r, row in enumerate(p):
            for c, val in enumerate(row):
                if val:
                    if nx + c < 0 or nx + c >= COLS or ny + r >= ROWS:
                        return True
                    if ny + r >= 0 and self.grid[ny+r][nx+c]: # 网格不为0即为碰撞
                        return True
        return False

    def rotate(self):
        new_p = [list(row) for row in zip(*self.piece[::-1])]
        # 旋转碰撞修正 (简单的踢墙)
        if not self.is_collision(self.px, self.py, new_p):
            self.piece = new_p
        elif not self.is_collision(self.px-1, self.py, new_p): # 向左踢
            self.px -= 1
            self.piece = new_p
        elif not self.is_collision(self.px+1, self.py, new_p): # 向右踢
            self.px += 1
            self.piece = new_p

    def lock_and_clear(self):
        # 将当前方块的颜色值锁定到网格中
        for r, row in enumerate(self.piece):
            for c, val in enumerate(row):
                if val:
                    self.grid[self.py+r][self.px+c] = self.color
        
        # 消除逻辑
        # 只有当一行中所有元素都不为 0 时才消除
        new_grid = [row for row in self.grid if not all(row)]
        lines_cleared = ROWS - len(new_grid)
        self.score += [0, 10, 30, 60, 100][min(lines_cleared, 4)]
        
        # 补齐上方空行
        for _ in range(lines_cleared):
            new_grid.insert(0, [0 for _ in range(COLS)])
        self.grid = new_grid
        self.spawn()

    def drop(self):
        if not self.is_collision(self.px, self.py + 1):
            self.py += 1
        else:
            self.lock_and_clear()

    def draw(self):
        fbuf.fill(C_BG) # 黑色背景
        
        # UI 装饰 (白色边框)
        fbuf.rect(OX-2, OY-2, COLS*6+4, ROWS*6+4, C_FRAME)
        fbuf.line(85, 0, 85, 128, C_FRAME)
        fbuf.text("NEXT", 95, 10, C_TEXT)
        
        # 画预览图 (使用对应颜色)
        np = SHAPES[self.next_idx]
        nc = BLOCK_COLORS[self.next_idx]
        for r, row in enumerate(np):
            for c, val in enumerate(row):
                if val: fbuf.fill_rect(105+c*6, 25+r*6, 5, 5, nc)
        
        fbuf.text("SCORE", 95, 60, C_TEXT)
        fbuf.text(str(self.score), 95, 75, C_TEXT)

        # 画已锁定的方块 (使用存储在网格中的颜色)
        for y, row in enumerate(self.grid):
            for x, val in enumerate(row):
                if val: # val 就是颜色值
                    fbuf.fill_rect(OX+x*6, OY+y*6, 5, 5, val)
        
        # 画正在下落的方块 (使用当前颜色)
        for r, row in enumerate(self.piece):
            for c, val in enumerate(row):
                if val: fbuf.fill_rect(OX+(self.px+c)*6, OY+(self.py+r)*6, 5, 5, self.color)
        
        if self.paused:
            fbuf.fill_rect(OX+10, OY+50, 40, 15, C_WHT)
            fbuf.text("PAUSE", OX+12, OY+54, C_BG) # 白色背景，黑色文字
        refresh()

# 主游戏进程
def run():
    # 使用光感作为随机种子，保证每次游戏方块序列不同
    adc = machine.ADC(machine.Pin(36))
    random.seed(adc.read())
    
    game = Tetris()
    last_move = time.ticks_ms()
    last_fall = time.ticks_ms()
    a_prev = 1

    while not game.game_over:
        now = time.ticks_ms()
        
        # A键暂停 (下降沿触发)
        a_val = btns['a'].value()
        if a_val == 0 and a_prev == 1:
            game.paused = not game.paused
        a_prev = a_val

        if not game.paused:
            # 左右移动控制
            if now - last_move > 100: # 限制移动频率
                if btns['lt'].value() == 0 and not game.is_collision(game.px-1, game.py):
                    game.px -= 1
                    last_move = now
                if btns['rt'].value() == 0 and not game.is_collision(game.px+1, game.py):
                    game.px += 1
                    last_move = now
            
            # 上键旋转
            if btns['up'].value() == 0:
                game.rotate()
                time.sleep_ms(150) # 旋转延时
            
            # B键瞬间落地
            if btns['b'].value() == 0:
                while not game.is_collision(game.px, game.py + 1):
                    game.py += 1
                game.lock_and_clear()
                # 落地后短暂停顿，防止连续 Hard Drop
                time.sleep_ms(250)
                # 落地后重置自动下落时间
                last_fall = time.ticks_ms()

            # 自动下落逻辑
            # 按住下键加速，正常 500ms 一格
            fall_speed = 80 if btns['dn'].value() == 0 else 500
            if now - last_fall > fall_speed:
                game.drop()
                last_fall = now

        game.draw()
        time.sleep_ms(20) # 提高界面刷新率到 ~50FPS，让移动看起来更平滑

    # 死亡画面 (红色 DEAD 文字)
    fbuf.text("DEAD", OX+10, 50, COLOR_Z)
    refresh()
    time.sleep(2)

while True:
    run()