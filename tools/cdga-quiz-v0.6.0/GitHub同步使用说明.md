# GitHub 同步使用说明

## 推荐方案

用一个私有仓库保存题库和答题日志，例如：

```text
cdga-quiz-data
```

仓库结构：

```text
question-banks/
  CDGA100道模拟题.md
data/
  cdga-state.json
```

其中 `cdga-state.json` 可以不提前创建，第一次推送进度时会自动创建。

## 网页放哪里

网页本身可以放在：

- GitHub Pages
- 你的任意静态网页空间
- 本机临时预览

网页本身不需要服务器后台。

## Token 权限

创建 GitHub fine-grained token，只授权给这个私有仓库：

- Metadata: Read
- Contents: Read and write

不要给全账号权限。

## 网页配置

打开网页后进入“同步”页，填写：

```text
GitHub 用户名：orchiq0214
仓库名：cdga-quiz-data
分支：main
题库路径：question-banks/CDGA100道模拟题.md
答题日志路径：data/cdga-state.json
GitHub token：你的 fine-grained token
```

点“保存并连接”。

手机和电脑都填同一套配置，就能读写同一份答题日志。

## 注意

- token 只保存在当前浏览器，不会写进代码。
- 答题后会自动同步到 GitHub；如果网络不好，可以用“推送当前进度”手动补一次。
- 如果你不配 GitHub，也能本地刷题，但手机和电脑不会自动同步。
