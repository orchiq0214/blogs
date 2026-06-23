"""
skills — JD 分析（jd_analyze）— 开发中
"""

import sys


def run_jd(text: str):
    print(f"JD 分析功能开发中")
    print(f"输入文本长度：{len(text)} 字")
    sys.exit(1)


if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("用法：python3 jd_analyze.py --text <JD内容> 或 --file <JD文件路径>", file=sys.stderr)
        sys.exit(1)
    # 简单处理
    args = sys.argv[1:]
    if "--file" in args or "-f" in args:
        idx = args.index("--file") if "--file" in args else args.index("-f")
        with open(args[idx + 1]) as f:
            run_jd(f.read())
    elif "--text" in args or "-t" in args:
        idx = args.index("--text") if "--text" in args else args.index("-t")
        run_jd(args[idx + 1])
    else:
        run_jd(" ".join(args))
