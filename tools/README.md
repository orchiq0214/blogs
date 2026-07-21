# tools/

小工具集合。每个工具独立一个目录、自带 `install.ps1`（如果有桌面端部署步骤），目录之间互不依赖。

## 收录标准

- 解决一个具体痛点，不是 demo / 教程
- 能在一台新机器上 `git clone` + `install.ps1` 几分钟配好
- 默认安装路径用环境变量（`%LOCALAPPDATA%`、`$PSScriptRoot`），不写死用户名
- 中文 README（方便我自己看）+ 代码注释也是中文为主

## 当前工具

| 工具 | 一句话 | 入口 |
|---|---|---|
| [cdga-quiz](./cdga-quiz/) | CDGA 静态刷题工具 v0.1.0，保留旧版入口 | [README](./cdga-quiz/README.md) |
| [cdga-quiz-v0.2.0](./cdga-quiz-v0.2.0/) | CDGA 刷题工具 v0.2.0：背题模式、答题卡错题标记、安卓 PWA | [README](./cdga-quiz-v0.2.0/README.md) |
| [headphone-remap](./headphone-remap/) | 把 3.5mm 耳机 +/−/中键 重映射成 ↑/↓/Enter，插耳机自动生效 | [README](./headphone-remap/README.md) |

## 计划中的工具（占位）

- `mouse-gesture/` — 鼠标手势驱动（按住右键画轨迹触发快捷键）
- `clipboard-history/` — 全局剪贴板历史（Win+V 的加强版，跨设备同步）
- `window-tiler/` — 键盘驱动的窗口分屏（类似 Win++，但用 vim 键）
