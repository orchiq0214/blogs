# CDGA 静态刷题应用

当前版本：`v0.2.0`

这个版本不需要常驻服务器。网页本身是静态文件，题库和答题日志可以放在 GitHub 仓库里，通过浏览器直接同步。

## 版本说明

- `v0.1.0`：初始静态版。
- `v0.2.0`：新增背题模式、考试/背题切换、答题卡错题标记、安卓 PWA 支持、同步页默认配置。
- 新版本使用独立目录发布，不覆盖旧版。

## 默认同步配置

同步页已默认填好：

- GitHub 用户名：`orchiq0214`
- 仓库名：`cdga-quiz-data`
- 分支：`main`
- 题库路径：`question-banks/CDGA100道模拟题.md`
- 答题日志路径：`data/cdga-state.json`

通常只需要粘贴 GitHub token，然后点“保存并连接”。

## 安卓使用

用安卓 Chrome 或 Edge 打开网页后，选择“添加到主屏幕”。添加后可以像普通应用一样从桌面打开。

## 本地预览

在 `D:\claude\cdga-prep` 目录启动任意静态文件服务，然后打开：

```text
http://localhost:5188/quiz-static-v0.2.0/
```

## GitHub 仓库结构

推荐使用私有仓库，例如 `cdga-quiz-data`：

```text
question-banks/
  CDGA100道模拟题.md
data/
  cdga-state.json
```

`data/cdga-state.json` 不需要手动创建，第一次同步时会自动创建。

## Token 权限

使用 GitHub fine-grained token，权限只给这个仓库：

- Contents: Read and write
- Metadata: Read

token 只保存在当前浏览器的 localStorage，不写进代码和仓库。

## 使用方式

1. 打开网页。
2. 进入“同步”页。
3. 填写 GitHub 用户名、仓库名、分支、题库路径、日志路径和 token。
4. 点“保存并连接”。
5. 手机和电脑用同一套配置，就能继续同一份答题进度。

## 当前支持

- Markdown 题库解析。
- 本地浏览器保存。
- GitHub 私有仓库读取题库。
- GitHub 私有仓库同步答题日志。
- 创建测试、暂停继续、提交判分、错题本、测试记录。
