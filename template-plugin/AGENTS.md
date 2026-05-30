# AGENTS.md — 给 AI 与编码工具的入口指引

本工程（`@pasty/template-plugin`）是 Pasty 三方插件的**脚手架与可运行示例**。

## 权威开发知识在 SDK 包内，不在本工程

插件开发的全部权威文档（架构、`manifest.json`、SDK 入口、detector / renderer / action、入参形状、UI↔Runtime RPC、权限、坑点）**随 `@pasty/plugin-sdk` 一起发布**。`npm install` 后它们就在本地：

- **文档地图（稳定入口，先读这个）**：`node_modules/@pasty/plugin-sdk/docs/README.md`
- **capability 真相源**：`node_modules/@pasty/plugin-sdk/API.md`（由 codegen 直出，保证与代码一致）

开发本插件前，请先打开上面的**文档地图**——它会列出当前 SDK 版本的全部主题文档。

## 工作约定

- 这些 SDK 文档**始终对应当前安装的 SDK 版本**；通过 `npm update @pasty/plugin-sdk` 刷新，**无需替换本工程任何文件**。
- 本工程内的代码、`GUIDE.md` 及注释都是**示例与脚手架工作流说明，可能滞后于已安装的 SDK**。**与 SDK 文档冲突时以 SDK 文档为准；capability 签名以 `API.md` 为准。**
- 本工程的 `GUIDE.md` 只覆盖**脚手架工作流**（起步、本地开发、在 Pasty 调试、构建、测试）与工程结构。
- **不要**查看或修改 `node_modules/@pasty/plugin-sdk/` 内的 SDK 源码；它由 codegen 维护。
