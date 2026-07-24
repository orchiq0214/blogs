"""
SDCard driver using bit-bang SPI (works with GPIO19/MISO conflict)
"""
import time, machine, ustruct

class SDCard:
    def __init__(self, sck, mosi, miso, cs):
        self._sck = machine.Pin(sck, machine.Pin.OUT, value=0)
        self._mosi = machine.Pin(mosi, machine.Pin.OUT, value=1)
        self._miso = machine.Pin(miso, machine.Pin.IN)
        self._cs = machine.Pin(cs, machine.Pin.OUT, value=1)
        self.sectors = 0
        self._init_card()

    def _delay(self):
        for _ in range(2): pass  # small delay for timing

    def _spi_write(self, b):
        for i in range(8):
            self._mosi((b >> (7-i)) & 1)
            self._sck(1); self._delay()
            self._sck(0); self._delay()

    def _spi_read(self):
        r = 0
        for i in range(8):
            self._sck(1); self._delay()
            r = (r << 1) | self._miso()
            self._sck(0); self._delay()
        return r

    def _spi_readinto(self, buf, n):
        for i in range(n):
            buf[i] = self._spi_read()

    def _spi_clocks(self, n):
        for _ in range(n):
            self._spi_write(0xFF)

    def _cmd(self, cmd, arg, crc=0):
        self._cs(0)
        self._spi_write(0x40 | cmd)
        self._spi_write((arg >> 24) & 0xFF)
        self._spi_write((arg >> 16) & 0xFF)
        self._spi_write((arg >> 8) & 0xFF)
        self._spi_write(arg & 0xFF)
        self._spi_write(crc)
        for _ in range(20):
            r = self._spi_read()
            if r != 0xFF:
                self._cs(1)
                return r
        self._cs(1)
        return 0xFF

    def _cmd_read_data(self, cmd, arg=0, crc=0):
        self._cs(0)
        self._spi_write(0x40 | cmd)
        self._spi_write((arg >> 24) & 0xFF)
        self._spi_write((arg >> 16) & 0xFF)
        self._spi_write((arg >> 8) & 0xFF)
        self._spi_write(arg & 0xFF)
        self._spi_write(crc)
        # Wait for R1
        for _ in range(20):
            if self._spi_read() != 0xFF:
                break
        # Wait for data token 0xFE
        for _ in range(100000):
            if self._spi_read() == 0xFE:
                data = bytearray(512)
                self._spi_readinto(data, 512)
                self._spi_read()  # CRC high
                self._spi_read()  # CRC low
                self._cs(1)
                return data
        self._cs(1)
        return None

    def _wait_ready(self):
        self._cs(0)
        for _ in range(1000):
            if self._spi_read() == 0xFF:
                self._cs(1)
                return True
        self._cs(1)
        return False

    def _init_card(self):
        # 80+ clocks with CS high
        self._cs(1)
        self._spi_clocks(80)

        # CMD0 - go idle
        r = self._cmd(0, 0, 0x95)
        if r != 1:
            raise OSError("no SD card (0x%02X)" % r)

        # CMD8 - check SDv2
        self._cs(0)
        self._spi_write(0x48)
        for _ in range(4): self._spi_write(0)
        self._spi_write(0x01); self._spi_write(0xAA); self._spi_write(0x87)
        for _ in range(20):
            r = self._spi_read()
            if r != 0xFF:
                break
        if r == 1:
            # SDv2 - read extra 4 bytes
            for _ in range(4): self._spi_read()
            v2 = True
        else:
            v2 = False
        self._cs(1)

        # ACMD41 - init
        for _ in range(1000):
            self._cmd(55, 0, 0)  # CMD55 = next is app cmd
            r = self._cmd(41, 0x40000000 if v2 else 0, 0)
            if r == 0:
                break
            time.sleep_ms(1)
        if r != 0:
            raise OSError("SD init timeout")

        # CMD58 - check SDHC
        if v2:
            self._cs(0)
            self._spi_write(0x7A)  # CMD58
            for _ in range(4): self._spi_write(0)
            self._spi_write(0)
            for _ in range(20):
                if self._spi_read() != 0xFF:
                    break
            ocr = bytearray(4)
            self._spi_readinto(ocr, 4)
            self._cs(1)
            self._sdhc = (ocr[0] & 0x40) != 0
        else:
            self._sdhc = False

        # CMD16 - block size 512
        self._cmd(16, 512, 0)

        # CMD9 - CSD for size
        csd = self._cmd_read_data(9, 0, 0)
        if csd:
            if csd[0] & 0xC0 == 0x40:
                size = ((csd[7] & 0x3F) << 16) | (csd[8] << 8) | csd[9]
                self.sectors = (size + 1) * 1024
            else:
                c_size = ((csd[6] & 3) << 10) | (csd[7] << 2) | ((csd[8] & 0xC0) >> 6)
                c_mult = 1 << (((csd[5] & 0xF) >> 1) + 2)
                self.sectors = (c_size + 1) * c_mult

    def readblocks(self, block_num, buf, offset=0):
        n = len(buf) // 512
        if n == 1:
            data = self._cmd_read_data(17, block_num if self._sdhc else block_num * 512, 0)
            if data:
                for i in range(512):
                    buf[offset + i] = data[i]
        else:
            self._cmd(18, block_num if self._sdhc else block_num * 512, 0)
            for i in range(n):
                for _ in range(100000):
                    if self._spi_read() == 0xFE:
                        self._spi_readinto(buf, offset + i*512, 512)
                        self._spi_read(); self._spi_read()  # CRC
                        break
            self._cs(0)
            self._cmd(12, 0, 0)  # STOP

    def writeblocks(self, block_num, buf, offset=0):
        n = len(buf) // 512
        for i in range(n):
            self._wait_ready()
            self._cs(0)
            addr = (block_num + i) if self._sdhc else (block_num + i) * 512
            self._spi_write(0x58 | 24)  # CMD24
            self._spi_write((addr >> 24) & 0xFF)
            self._spi_write((addr >> 16) & 0xFF)
            self._spi_write((addr >> 8) & 0xFF)
            self._spi_write(addr & 0xFF)
            self._spi_write(0)
            for _ in range(20):
                if self._spi_read() & 0x80 == 0:
                    break
            self._spi_write(0xFE)
            for j in range(512):
                self._spi_write(buf[offset + i*512 + j])
            self._spi_write(0); self._spi_write(0)  # CRC
            for _ in range(65535):
                if (self._spi_read() & 0x1F) == 0x05:
                    break
            self._cs(1)

    def ioctl(self, op, arg):
        if op == 4: return 0
        if op == 5: return 0
        if op == 6: return 0
        if op == 3: return self.sectors
        if op == 1: return 512
        return 0
