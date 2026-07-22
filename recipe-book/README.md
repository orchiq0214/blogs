# 今天吃什么

手机优先的家庭菜谱购物清单。选菜后按份数汇总食材；调料仅展示种类，不列入采购清单。

## 使用

直接打开 `index.html`，或部署在 GitHub Pages。新增与编辑先保存到本机；在右上角“同步设置”填入对 `orchiq0214/blogs` 有 Contents 读写权限的 GitHub token 后，使用“保存并同步 GitHub”写回 `data/recipes.json`。

令牌只存在当前浏览器的本地存储中，绝不提交进仓库。

## 自测

```powershell
node .\tests\recipe-core.test.cjs
```
