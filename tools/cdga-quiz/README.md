# CDGA 静态刷题应用

这个版本不需要常驻服务器。网页本身是静态文件，题库和答题日志可以放在 GitHub 仓库里，通过浏览器直接同步。

## 本地预览

在 `D:\claude\cdga-prep` 目录启动任意静态文件服务，然后打开：

```text
http://localhost:5188/quiz-static/
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
