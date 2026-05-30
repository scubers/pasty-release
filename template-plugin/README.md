# Template Plugin

> 写新插件先看 [GUIDE.md](./GUIDE.md)。它和本工程一起就是开发 Pasty 插件的完整起步资料。

`template-plugin/` 是给三方插件作者和 AI 助手准备的**最小全功能**模板工程，演示了 Pasty 当前所有的扩展点：detector、attachment renderer（compact + expanded）、auto-run action、draft action，依赖独立发布的 SDK 包 `@pasty/plugin-sdk`。

只需要这一个工程就能开发出生产可用的 Pasty 插件——架构、API、字段约束都以代码为真相源，文档同步更新。

## 三份必读文档

| 文档 | 用途 |
|---|---|
| [GUIDE.md](./GUIDE.md) | 插件开发完整指南：快速开始、架构、manifest、三类入口实现、入参形状、权限模型、坑点 Q&A |
| `API.md`（随 [`@pasty/plugin-sdk`](https://www.npmjs.com/package/@pasty/plugin-sdk) 发布） | 由 `protocol/plugin/src/catalog.ts` 自动生成的 API 真相源：26 个 capability、7 个 host event、22 个命名类型的精确签名 |
| `SPECIFICATION.md`（随 [`@pasty/plugin-sdk`](https://www.npmjs.com/package/@pasty/plugin-sdk) 发布） | SDK 形状规则（Topic / OptionalTopic / Stream / Verb）、命名约定、扩展 capability 的 PR 流程 |

> SDK 包内的 `API.md` 是**镜像文件**。运行 `cd protocol/plugin && npm run codegen` 时由 codegen 自动同步——文档与 catalog 不会漂移。

## 工程结构

```text
template-plugin/
├── manifest.json
├── package.json                        ← 依赖 @pasty/plugin-sdk（独立 npm 包）
├── scripts/
│   ├── build-runtime.mjs
│   ├── build-ui.mjs
│   └── verify-build.mjs
├── src/
│   ├── features/                       ← 每个能力一个文件夹
│   │   ├── preview-renderer/           ← detector + compact renderer + Vue app
│   │   ├── expanded-renderer/          ← detector + 自适应高度 renderer + Vue app
│   │   ├── auto-action/                ← auto-run action（无 UI）
│   │   └── capability-gallery/         ← SDK 全能力演示参考（含 draft action）
│   ├── shared/                         ← 跨 feature 的薄共享层
│   │   ├── display.ts
│   │   └── debug.ts
│   ├── preview/                        ← 本地预览工作台（dev-only）
│   │   ├── PreviewShellApp.vue
│   │   ├── scenarios/
│   │   └── preview-host/
│   └── plugin.ts                       ← definePlugin 入口
└── tests/runtime/
    └── templateCapabilities.test.cjs
```

## 演示的能力

### detector

- 文件：`src/features/preview-renderer/detector.ts` + `src/features/expanded-renderer/detector.ts`
- 输入：`text`、`image`、`path_reference`（三 kind 全覆盖）
- 输出：`plugin.template.full.preview` 与 `plugin.template.full.expanded` attachment
- 演示：用 `PluginContentEnvelope` / `PluginClipboardItem` 强类型处理三种 input kind，统一映射成 artifact

### attachment renderer（compact，固定高度）

- 文件：`src/features/preview-renderer/renderer.ts` + `src/features/preview-renderer/app.vue`
- 演示：`resolveAttachment()`、`pasty.attachmentRenderer.onHostInvoke`、固定 `height: 320`、12 个 theme token 主题适配

### attachment renderer（expanded，自适应高度 + 主题事件）

- 文件：`src/features/expanded-renderer/renderer.ts` + `src/features/expanded-renderer/app.vue`
- 演示：manifest `height: { min: 120, max: 480 }` + `pasty.window.autoFit()` + `pasty.theme.on()` 驱动强调条颜色

### auto-run action

- 文件：`src/features/auto-action/action.ts`
- 演示：无 UI action，runtime 完全闭环，返回 `actionResult.text(...)`/`actionResult.none(...)` 形态的执行上下文

模板还声明了 `template-auto-action-text` / `template-auto-action-image` 两个子变体，用于演示超出免费配额后的 Plugin Pro 门控行为（manifest 共 4 个 action，超过默认配额 3 个）。

### draft action

- 文件：`src/features/capability-gallery/runtime/draft-action.ts` + `src/features/capability-gallery/draft-action-ui/app.vue`（manifest id：`gallery-draft`）
- 演示：`resolveSession` 返回 `initialDraft` + buttons seed → UI 自管表单状态 → `pasty.action.complete(...)` 提交

### capability-gallery（全集合 API 参考）

- 目录：`src/features/capability-gallery/`（详见 [`src/features/capability-gallery/README.md`](./src/features/capability-gallery/README.md)）
- 角色：与上面 4 个最小样板互补的 "SDK 全能力演示" feature——覆盖 26 个 capability 中的 25 个（仅 `asset.pathReferenceImageUrl` 未单独演示）、7 个 host event、4 个 permission、3 种 height 形态、3 种 actionResult 形态、3 种 item kind
- 包含：1 detector（×3 attachment）+ 3 个 auto-run action + 1 draft action + 3 个 attachment renderer + 4 个 WebView（bounded 主舞台 + fixed + auto + draft-action）
- 图片展示：bounded renderer 与 draft action 经 `pasty.asset.currentItemImageUrl()` 取 `pasty-asset://` URL 在 `<img>` 显示当前 item 图，并经 `host.asset.registerImage()` 显示 Node 产出的纯色图（见 [GUIDE.md](./GUIDE.md) §6.6）
- 用途：三方插件作者想"这个 SDK 到底能做什么"的可点击参考

## 起步改造清单

最先改这几处，避免 manifest 与 runtime 脱节：

1. `manifest.json`——`plugin.id`、`title`、`attachmentType`、capability 列表
2. `src/plugin.ts`——注册的 handler key 必须与 manifest `id` 完全一致
3. `src/features/<feature>/payload.ts`（数据类型定义）
4. `src/features/<feature>/detector.ts`（detector 处理）
5. `src/features/<feature>/renderer.ts`（renderer runtime 处理）
6. `src/features/<feature>/action.ts`（action 处理）
7. `src/features/<feature>/app.vue`（对应的 UI 入口）

通常**不需要改**：

- `@pasty/plugin-sdk`——独立 SDK 包；扩展 capability 见包内 `SPECIFICATION.md`（[`@pasty/plugin-sdk`](https://www.npmjs.com/package/@pasty/plugin-sdk)）
- `src/shared/`——共享工具
- `scripts/build-runtime.mjs` / `scripts/build-ui.mjs`

## 三个常用命令

```sh
npm install       # 装依赖（含 @pasty/plugin-sdk）
npm run dev       # 启动 Vite 预览工作台
npm test          # 运行 tests/ 下集成测试
npm run build     # 生产构建到 dist/
```

完整说明、字段规范、API 参考与权限模型见 [GUIDE.md](./GUIDE.md)。
