"""Upload files to ESP32 via raw REPL - v2 using base64"""
import serial, time, base64, sys, os

def upload(port, local_path, remote_name):
    s = serial.Serial(port, 115200, timeout=3)
    time.sleep(1.5)
    s.reset_input_buffer()

    with open(local_path, 'rb') as f:
        data = f.read()

    b64 = base64.b64encode(data).decode()

    # Enter raw REPL
    s.write(b'\x01')
    time.sleep(0.3)
    s.reset_input_buffer()

    # Build and send code
    code = 'import base64;f=open("' + remote_name + '","wb");f.write(base64.b64decode("""' + b64 + '"""));f.close();print("OK")'

    print(f"Uploading {remote_name} ({len(data)} bytes, code={len(code)} chars)...")
    s.write(code.encode())
    time.sleep(0.5)
    s.write(b'\x04')
    time.sleep(3)

    out = b''
    t = time.time()
    while time.time() - t < 4:
        while s.in_waiting:
            out += s.read(s.in_waiting)
            t = time.time()
        time.sleep(0.1)

    result = out.decode('utf-8', errors='replace').strip()
    print(f"Result: {result[:100]}")

    if 'OK' in result:
        print(f"  ✅ {remote_name} uploaded successfully!")
    else:
        print(f"  ❌ Upload may have failed")

    s.close()
    return 'OK' in result

if __name__ == '__main__':
    port = sys.argv[1] if len(sys.argv) > 1 else 'COM9'
    files = [
        (r'C:\Users\yahui\AppData\Local\Temp\dodgeball.py', 'dodgeball.py'),
        (r'C:\Users\yahui\AppData\Local\Temp\hardware_test.py', 'hardware_test.py'),
        (r'C:\Users\yahui\AppData\Local\Temp\tetris_simple.py', 'tetris_simple.py'),
        (r'C:\Users\yahui\AppData\Local\Temp\tetris_color.py', 'tetris_color.py'),
    ]

    for local, remote in files:
        if not os.path.exists(local):
            print(f"⚠️  {local} not found, skipping")
            continue
        success = upload(port, local, remote)
        if not success:
            print(f"⚠️  Failed to upload {remote}, continuing anyway...")
        time.sleep(1)
