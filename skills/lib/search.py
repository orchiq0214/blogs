"""
skills — 联网搜索（search）

调用 MiniMax MCP web_search 工具进行联网搜索。
返回结构化结果：标题、链接、摘要。
"""

import asyncio
import json
import os
import sys

try:
    from mcp import ClientSession, StdioServerParameters
    from mcp.client.stdio import stdio_client
    MCP_AVAILABLE = True
except ImportError:
    MCP_AVAILABLE = False


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


async def _search_mcp(query: str, api_key: str) -> dict:
    """通过 MCP 协议调用 web_search"""
    params = StdioServerParameters(
        command="uvx",
        args=["minimax-coding-plan-mcp", "-y"],
        env={
            "MINIMAX_API_KEY": api_key,
            "MINIMAX_API_HOST": "https://api.minimaxi.com",
            "MINIMAX_API_RESOURCE_MODE": "local"
        }
    )
    async with stdio_client(params) as (read, write):
        async with ClientSession(read, write) as session:
            await session.initialize()
            result = await session.call_tool("web_search", {"query": query})
            for c in result.content:
                if c.type == "text":
                    return json.loads(c.text)
    return {}


def run_search(query: str):
    """执行搜索并输出结果"""
    if not MCP_AVAILABLE:
        print("错误：需要安装 mcp 库：pip install mcp", file=sys.stderr)
        sys.exit(1)

    api_key = _get_api_key()

    try:
        result = asyncio.run(_search_mcp(query, api_key))
    except Exception as e:
        print(f"搜索失败：{e}", file=sys.stderr)
        sys.exit(1)

    organic = result.get("organic", [])
    if not organic:
        print("未找到相关结果")
        return

    for i, item in enumerate(organic, 1):
        title = item.get("title", "")
        link = item.get("link", "")
        snippet = item.get("snippet", "")
        date = item.get("date", "")

        print(f"[{i}] {title}")
        if date:
            print(f"    日期：{date}")
        print(f"    链接：{link}")
        print(f"    摘要：{snippet}")
        print()


if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("用法：python3 search.py <搜索词>", file=sys.stderr)
        sys.exit(1)
    run_search(" ".join(sys.argv[1:]))
