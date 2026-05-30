# 插件开发指南（脚手架工作流）

本工程（`plugins/template-plugin/`）是 Pasty 三方插件的**脚手架与可运行示例**。本文件只讲**脚手架工作流**（起步、本地开发、在 Pasty 中调试、构建、测试）与**工程结构**。

**插件开发的权威知识**（架构、manifest、SDK 入口、detector/renderer/action、入参形状、RPC、权限、坑点）**随 SDK 包发布**，`npm install` 后在 `node_modules/@pasty/plugin-sdk/docs/`——它始终对应你当前安装的 SDK 版本。

- **AI / 工具**：请先读本工程根目录的 [`AGENTS.md`](./AGENTS.md)，它指向 SDK 文档的稳定入口。
- **文档地图**：`node_modules/@pasty/plugin-sdk/docs/README.md`
- **capability 真相源**：`node_modules/@pasty/plugin-sdk/API.md`（generated，有冲突以它为准）
- 通过 `npm update @pasty/plugin-sdk` 刷新文档与能力，**无需替换本工程任何文件**。

> 本工程内的代码与说明是**示例**，可能滞后于已安装的 SDK；与 SDK 文档冲突时**以 SDK 文档为准**。

---

## 0. 快速开始

### 前置条件

- Node.js >= 18

### 初始化

```sh
npm install
```

依赖 `@pasty/plugin-sdk` 是独立发布的 npm 包（三方工程通过 `npm install @pasty/plugin-sdk` 安装）。`npm install` 会拉取并编译 SDK，完成后即可直接使用。

> 所有插件作者可用的符号由 codegen 产出，列在 SDK 包的 `API.md` 与 `README.md`（见 [`@pasty/plugin-sdk`](https://www.npmjs.com/package/@pasty/plugin-sdk)）。**插件作者不需要查看或修改 SDK 内部源码。**

### 本地开发

```sh
npm run dev
```

启动 Vite 预览工作台（Preview Workbench）。工作台模拟宿主推送 bootstrap，提供两个视图：

- `?view=renderer` — 预览 attachment renderer 卡片
- `?view=action` — 预览 draft action 表单

修改 `src/features/*/app.vue` 后浏览器热更新。

也可以直接打开单一视图：

```sh
npm run dev:renderer
npm run dev:action
```

### 在 Pasty 中调试

Pasty → Settings → Plugins → Developer Plugins 区段提供开发插件生命周期管理：

1. **Add Path** — 选择含 `manifest.json` 的目录（即 `sourceRootPath`）。
2. 若 `manifest.json` 声明了 `install` 字段，Pasty **自动执行安装脚本**，工作目录为 `sourceRootPath`。`node_modules/` 等产物落到工程目录（等价于你手动 `npm install`）。
3. 安装日志写入 `<AppData>/development-plugins/<pluginID>/install-logs/`，不会污染你的 git status。

| 按钮 | 行为 |
|---|---|
| **重新加载** | 重读 `manifest.json`，刷新 fingerprint / permissions / loadState。**不**重跑 install。 |
| **执行安装** | 就地重跑 install hook，更新 `lastInstallExecution`。**不**重读 manifest。 |
| **查看日志** | `installFailed` 状态下显示，打开最近一次安装日志（支持实时 tail）。 |

状态：`installing` → 安装中；`installFailed` → 退出码非 0 或 runtime 不可达；`ready` → 可用。

### 生产构建

```sh
npm run build
```

依次：clean → build:runtime → build:ui → verify:build，输出到 `dist/`。

### 测试

```sh
npm test         # tests/runtime/ 集成测试
```

---

## 1. 工程结构

新插件按 feature 切分，每个 feature 一个自洽目录。推荐布局：

```text
your-plugin/
├── manifest.json
├── package.json                        ← 依赖 @pasty/plugin-sdk（npm 安装）
├── scripts/                            ← build:runtime / build:ui / verify:build
├── src/
│   ├── features/<feature-name>/        ← 每个能力一个文件夹
│   │   ├── payload.ts                  ← 数据类型 / draft 类型
│   │   ├── detector.ts                 ← detector（若有）
│   │   ├── renderer.ts                 ← renderer runtime 端（若有）
│   │   ├── action.ts                   ← action runtime 端（若有）
│   │   ├── app.vue                     ← UI 入口（renderer 或 draft action）
│   │   ├── main.ts / index.html        ← Vite 入口
│   ├── shared/                         ← 跨 feature 的薄工具层
│   ├── preview/                        ← 本地预览工作台（dev-only）
│   └── plugin.ts                       ← definePlugin 入口；注册所有 handler
└── tests/runtime/
```

template-plugin 自带的具体 feature 列表（`preview-renderer/` / `expanded-renderer/` / `auto-action/` / `capability-gallery/`）见 [README.md](./README.md) "演示的能力"。

> SDK 是独立包 `@pasty/plugin-sdk`，由 codegen 同步、**不要手动改**。扩展 capability 见包内 `SPECIFICATION.md`（[`@pasty/plugin-sdk`](https://www.npmjs.com/package/@pasty/plugin-sdk)）Ch 3。

---

## 接下来

脚手架工作流就这些。**插件实现的全部知识在 SDK 文档**——见根目录 [`AGENTS.md`](./AGENTS.md)，或直接打开 `node_modules/@pasty/plugin-sdk/docs/README.md`（文档地图）与 `node_modules/@pasty/plugin-sdk/API.md`（capability 真相源）。
