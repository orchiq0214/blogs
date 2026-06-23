# skills — 跨 agent 工具包 CLI

一个纯 Python 标准库的工具包，提供联网搜索、图片文字识别、图片生成、JD 分析等能力。
设计为 CLI 调用，任何 agent（Claude Code、Codex、Hermes 等）只要能执行 shell 就能使用。

## 快速开始

```bash
# 1. 配置 API Key
mkdir -p ~/.config/skills
cat > ~/.config/skills/api_keys.yaml << 'EOF'
minimax_cn: "your-minimax-api-key"
EOF

# 2. 运行
./bin/skills search "关键词"
./bin/skills readimg /path/to/image.png
```

## 子命令

| 命令 | 功能 | 示例 |
|------|------|------|
| `search` | 联网搜索 | `skills search AI agent 2025` |
| `readimg` | 图片文字识别 | `skills readimg screenshot.png` |
| `genimg` | 图片生成（开发中） | `skills genimg "cat wearing suit"` |
| `jd` | JD 分析（开发中） | `skills jd --file job.txt` |

## 依赖

- Python 3.8+
- 搜索功能需要安装 `mcp` 库：`pip install mcp`
- MiniMax API Key（[申请地址](https://platform.minimaxi.com)）

## 设计原则

- **零框架依赖** — 仅使用 Python 标准库
- **自包含** — 每个脚本可直接独立运行
- **密钥外置** — API Key 不写在代码里，从 `~/.config/skills/api_keys.yaml` 读取
- **可迁移** — 复制整个目录到新机器即可使用
