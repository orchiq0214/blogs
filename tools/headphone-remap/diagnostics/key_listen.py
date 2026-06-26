"""
Verbose listener - captures EVERY keypress (filtered to interesting ones).
Writes to file with line buffering so we can monitor in real time.
"""
import ctypes
import ctypes.wintypes as wt
import os
import sys
import time
from datetime import datetime

WH_KEYBOARD_LL = 13
WM_KEYDOWN = 0x0100
WM_KEYUP = 0x0101

user32 = ctypes.windll.user32

class KBDLLHOOKSTRUCT(ctypes.Structure):
    _fields_ = [
        ("vkCode", wt.DWORD),
        ("scanCode", wt.DWORD),
        ("flags", wt.DWORD),
        ("time", wt.DWORD),
        ("dwExtraInfo", wt.LPARAM),
    ]

class POINT(ctypes.Structure):
    _fields_ = [("x", ctypes.c_long), ("y", ctypes.c_long)]
class MSG(ctypes.Structure):
    _fields_ = [("hwnd", wt.HWND),("message", wt.UINT),("wParam", wt.WPARAM),("lParam", wt.LPARAM),("time", wt.DWORD),("pt", POINT)]

LOW_LEVEL_KB_PROC = ctypes.WINFUNCTYPE(ctypes.c_int, ctypes.c_int, wt.WPARAM, wt.LPARAM)

LOG_PATH = os.environ.get("TEMP", "/tmp")
if not LOG_PATH.endswith(os.sep):
    LOG_PATH += os.sep
LOG_PATH += "key_log.txt"
LOG = open(LOG_PATH, "a", buffering=1)
LOG.write(f"\n=== Session start {datetime.now().isoformat()} ===\n")

VK_NAMES = {
    0xAD: "VOLUME_MUTE", 0xAE: "VOLUME_DOWN", 0xAF: "VOLUME_UP",
    0xB0: "MEDIA_NEXT", 0xB1: "MEDIA_PREV", 0xB2: "MEDIA_STOP",
    0xB3: "MEDIA_PLAY_PAUSE",
    0xA6: "BROWSER_BACK", 0xA7: "BROWSER_FORWARD",
    0xA8: "BROWSER_REFRESH", 0xA9: "BROWSER_STOP",
    0xAB: "BROWSER_FAVORITES", 0xAC: "BROWSER_HOME",
    0xA1: "BROWSER_SEARCH", 0xA2: "BROWSER_MAIL",
    0xA3: "MEDIA_SELECT", 0xA4: "LAUNCH_APP1", 0xA5: "LAUNCH_APP2",
    0x1B: "ESC", 0x0D: "ENTER", 0x20: "SPACE",
    0x25: "LEFT", 0x26: "UP", 0x27: "RIGHT", 0x28: "DOWN",
    0x21: "PGUP", 0x22: "PGDN", 0x23: "END", 0x24: "HOME",
}

def hook_callback(nCode, wParam, lParam):
    if nCode == 0:
        info = ctypes.cast(lParam, ctypes.POINTER(KBDLLHOOKSTRUCT)).contents
        vk = info.vkCode
        evt = "DOWN" if wParam == WM_KEYDOWN else ("UP" if wParam == WM_KEYUP else f"0x{wParam:X}")
        name = VK_NAMES.get(vk, f"0x{vk:02X}")
        ts = datetime.now().strftime("%H:%M:%S.%f")[:-3]
        # Log media/consumer/arrow/page/enter/space, ignore plain alphanumerics
        if vk >= 0xA0 or vk in (0x1B, 0x0D, 0x20, 0x25, 0x26, 0x27, 0x28, 0x21, 0x22):
            line = f"[{ts}] {evt:4} vk={name}  scan=0x{info.scanCode:X}  flags=0x{info.flags:X}"
            LOG.write(line + "\n")
            print(line, flush=True)
    return user32.CallNextHookEx(None, nCode, wParam, lParam)

HOOKPROC = LOW_LEVEL_KB_PROC(hook_callback)
hHook = user32.SetWindowsHookExA(WH_KEYBOARD_LL, HOOKPROC, None, 0)

if not hHook:
    print("Failed to install hook", file=sys.stderr)
    LOG.close()
    sys.exit(1)

DURATION = int(sys.argv[1]) if len(sys.argv) > 1 else 60
print(f"=== Hook OK. Listening {DURATION}s ===", flush=True)
LOG.write(f"=== Listening {DURATION}s ===\n")

msg = MSG()
start = time.time()
while time.time() - start < DURATION:
    user32.GetMessageA(ctypes.byref(msg), None, 0, 0)

user32.UnhookWindowsHookEx(hHook)
LOG.write("=== Done ===\n")
LOG.close()
print("=== Done ===", flush=True)