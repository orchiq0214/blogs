"""
skills — 图片生成（genimg）

调用 MiniMax image-01 模型生成图片。
需要 api_keys.yaml 配置 API Key。
"""

import json
import base64
import os
import sys
import urllib.request


API_HOST = "https://api.minimaxi.com"


def _get_api_key():
    """读取 MiniMax API Key"""
    config_dirs = [
        os.environ.get("SKILLS_CONFIG_DIR", ""),
        os.path.expanduser("~/.config/skills"),
    ]
    for d in config_dirs:
        if not d:
            continue
        key_path = os.path.join(d, "api_keys.yaml")
        if os.path.exists(key_path):
            break
    else:
        print("错误：未找到 api_keys.yaml，请放到 ~/.config/skills/api_keys.yaml", file=sys.stderr)
        sys.exit(1)

    with open(key_path) as f:
        for line in f:
            line = line.strip()
            if line.startswith("minimax_cn:"):
                value = line.split(":", 1)[1].strip().strip("\"'")
                return value

    print("错误：api_keys.yaml 中未找到 minimax_cn", file=sys.stderr)
    sys.exit(1)


def run_genimg(prompt: str, output_path: str = ""):
    """生成图片"""
    api_key = _get_api_key()

    payload = {
        "model": "image-01",
        "prompt": prompt,
        "aspect_ratio": "1:1",
        "response_format": "base64"
    }

    req = urllib.request.Request(
        f"{API_HOST}/v1/image_generation",
        data=json.dumps(payload).encode(),
        headers={
            "Authorization": f"Bearer {api_key}",
            "Content-Type": "application/json"
        }
    )

    try:
        resp = json.loads(urllib.request.urlopen(req, timeout=60).read())
        b64 = resp["data"]["image_base64"][0]

        if not output_path:
            # 安全文件名：取 prompt 前 30 字符
            safe = "".join(c if c.isalnum() or c in "-_" else "_" for c in prompt[:30])
            output_path = f"{safe}.png"

        with open(output_path, "wb") as f:
            f.write(base64.b64decode(b64))

        print(f"图片已生成：{os.path.abspath(output_path)}")

    except Exception as e:
        print(f"生成失败：{e}", file=sys.stderr)
        sys.exit(1)


if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("用法：python3 genimg.py <prompt> [--output <path>]", file=sys.stderr)
        sys.exit(1)

    args = sys.argv[1:]
    output = ""
    if "--output" in args:
        idx = args.index("--output")
        output = args[idx + 1]
        args = args[:idx] + args[idx + 2:]

    run_genimg(" ".join(args), output)
