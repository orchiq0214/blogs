"""
skills — 图片生成（genimg）— 开发中
"""

import sys


def run_genimg(prompt: str, output_path: str = ""):
    print(f"图片生成功能开发中")
    print(f"Prompt: {prompt}")
    if output_path:
        print(f"输出: {output_path}")
    sys.exit(1)


if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("用法：python3 genimg.py <prompt> [--output <path>]", file=sys.stderr)
        sys.exit(1)
    run_genimg(" ".join(sys.argv[1:]))
