"""Upload a file to XiaoMiao ESP32 via serial raw REPL."""
import serial, time, sys

def raw_exec(s, code):
    s.write(b'\x01')
    time.sleep(0.2)
    s.reset_input_buffer()
    s.write(code.encode())
    time.sleep(0.3)
    s.write(b'\x04')
    time.sleep(1.5)
    out = b''
    t = time.time()
    while time.time() - t < 2:
        while s.in_waiting:
            out += s.read(s.in_waiting)
            t = time.time()
        time.sleep(0.1)
    return out

def upload_file(local_path, remote_name, port='COM9'):
    s = serial.Serial(port, 115200, timeout=3)
    time.sleep(1.5)
    s.reset_input_buffer()

    with open(local_path, 'r', encoding='utf-8') as f:
        content = f.read()

    # Escape the content - use repr-style escaping for the triple-quoted string
    # Replace backslash with double-backslash, and triple-quote with escaped version
    escaped = content.replace('\\', '\\\\')
    escaped = escaped.replace("'''", "\\'\\'\\'")

    code = f"f=open('{remote_name}','w');f.write('''{escaped}''');f.close();print('OK')"

    if len(code) > 4000:
        print(f"File too large ({len(code)} chars), splitting into 2 parts...")
        half = len(escaped) // 2
        # Find a good split point (newline)
        split_at = escaped.rfind('\n', 0, half)
        if split_at < 0:
            split_at = half

        part1 = escaped[:split_at+1]
        part2 = escaped[split_at+1:]

        code1 = f"f=open('{remote_name}','w');f.write('''{part1}''')"
        code2 = f"f.write('''{part2}''');f.close();print('OK')"

        r1 = raw_exec(s, code1)
        print(f"Part 1: {repr(r1[:80])}")
        r2 = raw_exec(s, code2)
        print(f"Part 2: {repr(r2[:80])}")
    else:
        r = raw_exec(s, code)
        print(f"Result: {repr(r[:80])}")

    # Verify
    r = raw_exec(s, f"import os;print('OK' if '{remote_name}' in os.listdir() else 'FAIL')")
    print(f"Verify: {r.decode('utf-8', errors='replace').strip()}")

    s.close()

if __name__ == '__main__':
    upload_file(sys.argv[1], sys.argv[2])
