"""Use SendInput (modern API) to inject vkB3, also try WM_APPCOMMAND."""
import ctypes
from ctypes import wintypes
import time

user32 = ctypes.windll.user32

INPUT_KEYBOARD = 1
KEYEVENTF_KEYUP = 0x0002

class KEYBDINPUT(ctypes.Structure):
    _fields_ = [("wVk", wintypes.WORD),
                ("wScan", wintypes.WORD),
                ("dwFlags", wintypes.DWORD),
                ("time", wintypes.DWORD),
                ("dwExtraInfo", ctypes.POINTER(wintypes.ULONG))]

class INPUT(ctypes.Structure):
    _fields_ = [("type", wintypes.DWORD), ("ki", KEYBDINPUT)]
    _anonymous_ = ("ki",)

def send_vk(vk):
    extra = ctypes.POINTER(wintypes.ULONG)()
    down = INPUT(INPUT_KEYBOARD, KEYBDINPUT(vk, 0, 0, 0, extra))
    up   = INPUT(INPUT_KEYBOARD, KEYBDINPUT(vk, 0, KEYEVENTF_KEYUP, 0, extra))
    user32.SendInput(1, ctypes.byref(down), ctypes.sizeof(INPUT))
    time.sleep(0.05)
    user32.SendInput(1, ctypes.byref(up), ctypes.sizeof(INPUT))
    time.sleep(0.2)

print("=== SendInput test: + + + - - - M M M ===", flush=True)
for label, vk in [("+", 0xAF), ("+", 0xAF), ("+", 0xAF),
                  ("-", 0xAE), ("-", 0xAE), ("-", 0xAE),
                  ("M", 0xB3), ("M", 0xB3), ("M", 0xB3)]:
    print(f"  {label} vk=0x{vk:02X}", flush=True)
    send_vk(vk)
print("Done.")