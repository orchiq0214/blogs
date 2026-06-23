"""
skills — 图片文字识别（readimg）

读取本地图片，调用 MiniMax-M3 模型识别图片中的文字。
需要 api_keys.yaml 配置 API Key。
"""

import json
import base64
import os
import sys
import urllib.request


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


def run_readimg(image_path: str):
    """识别图片中的文字"""
    if not os.path.exists(image_path):
        print(f"错误：文件不存在 {image_path}", file=sys.stderr)
        sys.exit(1)

    api_key = _get_api_key()

    with open(image_path, "rb") as f:
        b64 = base64.b64encode(f.read()).decode()

    ext = os.path.splitext(image_path)[1].lower()
    mime_map = {".jpg": "image/jpeg", ".jpeg": "image/jpeg",
                ".png": "image/png", ".gif": "image/gif", ".webp": "image/webp"}
    mime = mime_map.get(ext, "image/jpeg")
    data_url = f"data:{mime};base64,{b64}"

    payload = {
        "model": "MiniMax-M3",
        "messages": [{
            "role": "user",
            "content": [
                {"type": "text", "text": "请完整识别这张图片中的所有文字，逐字逐句输出，不要遗漏"},
                {"type": "image_url", "image_url": {"url": data_url}}
            ]
        }],
        "max_tokens": 4000
    }

    req = urllib.request.Request(
        "https://api.minimaxi.com/v1/chat/completions",
        data=json.dumps(payload).encode(),
        headers={
            "Authorization": f"Bearer {api_key}",
            "Content-Type": "application/json"
        }
    )

    try:
        resp = json.loads(urllib.request.urlopen(req, timeout=180).read())
        text = resp["choices"][0]["message"]["content"]
        print(text)
    except Exception as e:
        print(f"识别失败：{e}", file=sys.stderr)
        sys.exit(1)


if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("用法：python3 readimg.py <图片路径>", file=sys.stderr)
        sys.exit(1)
    run_readimg(sys.argv[1])
