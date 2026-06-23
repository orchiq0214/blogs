"""
skills — JD 分析（jd_analyze）

接收 JD 文本，输出结构化行业理解简报。
需要 api_keys.yaml 配置 API Key。
"""

import json
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
        print("错误：未找到 api_keys.yaml", file=sys.stderr)
        sys.exit(1)

    with open(key_path) as f:
        for line in f:
            line = line.strip()
            if line.startswith("minimax_cn:"):
                value = line.split(":", 1)[1].strip().strip("\"'")
                return value

    print("错误：api_keys.yaml 中未找到 minimax_cn", file=sys.stderr)
    sys.exit(1)


JD_ANALYSIS_PROMPT = """你是一位资深产品经理和数据分析专家。请对以下JD进行深度分析，输出结构化简报。

分析框架：
1. 行业理解：这家公司靠什么赚钱？商业模式、盈利核心是什么？
2. 业务拆解：核心业务流程有哪些环节？每个环节的目标和关键指标是什么？
3. 角色定位：这个岗位进去要解决什么核心问题？和哪些团队协作？考核什么？
4. 面试策略：针对这个JD，面试的重点方向、加分认知和雷区是什么？

请用中文输出，结构清晰，每个部分用 ## 标题分隔。

JD内容：
{jd_text}"""


def run_jd(text: str):
    """分析 JD 文本"""
    api_key = _get_api_key()

    payload = {
        "model": "MiniMax-M3",
        "messages": [{
            "role": "user",
            "content": [
                {"type": "text", "text": JD_ANALYSIS_PROMPT.format(jd_text=text)}
            ]
        }],
        "max_tokens": 4000
    }

    req = urllib.request.Request(
        f"{API_HOST}/v1/chat/completions",
        data=json.dumps(payload).encode(),
        headers={
            "Authorization": f"Bearer {api_key}",
            "Content-Type": "application/json"
        }
    )

    try:
        resp = json.loads(urllib.request.urlopen(req, timeout=180).read())
        report = resp["choices"][0]["message"]["content"]
        print(report)
    except Exception as e:
        print(f"分析失败：{e}", file=sys.stderr)
        sys.exit(1)


if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("用法：python3 jd_analyze.py --text <JD内容> 或 --file <JD文件路径>", file=sys.stderr)
        sys.exit(1)

    args = sys.argv[1:]
    if "--file" in args or "-f" in args:
        idx = args.index("--file") if "--file" in args else args.index("-f")
        with open(args[idx + 1], encoding="utf-8") as f:
            run_jd(f.read())
    elif "--text" in args or "-t" in args:
        idx = args.index("--text") if "--text" in args else args.index("-t")
        run_jd(args[idx + 1])
    else:
        run_jd(" ".join(args))
