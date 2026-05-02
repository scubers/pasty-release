# Template Plugin

`template-plugin/` 是给插件作者准备的最小全功能模板工程，也是当前提供给作者 fork 的源码型插件示例。

字段约束、消息协议和能力边界以同目录的 `GUIDE.md` 为准；本 README 负责说明这个模板工程如何 fork、构建、预览和改造。

它保留了参考插件工程需要的核心开发体验：

- manifest + source-based runtime / UI 构建流程
- 内嵌源码版 runtime SDK 与 UI bridge SDK
- detector / attachment renderer / `auto-run action` / `draft action + UI`
- `npm run build` + `npm test` + `scripts/verify-build.mjs`

但它去掉了 demo 业务依赖和示例逻辑，只保留能直接改造的模板骨架。

当前模板默认走“紧凑元数据参考工程”路线：

- detector 默认覆盖 `text`、`image`、`path_reference`
- action 默认覆盖 `text`、`image`、`path_reference`
- renderer UI 默认低高度、少展示，只保留关键字段
- copy 按钮默认复制完整 payload / session / item / draft JSON，方便作者直接观察真实输入

## 1. 适合拿它做什么

这个模板适合直接作为新插件起点：

- 改 `manifest.json` 里的 `plugin.id`、`title`、`attachmentType`
- 替换 `src/runtime/` 里的 detector / renderer / action 逻辑
- 替换 `src/ui/` 里的 renderer 页面和 draft action 页面
- 保留 `src/runtime/sdk/` 与 `src/ui/sdk/` 作为内嵌 helper
- 保留紧凑 metadata inspector 的布局骨架，只替换你自己的业务字段和 copy 逻辑

如果你想查完整字段和 contract 说明，直接看同目录 `GUIDE.md`。

## 2. 工程结构

```text
template-plugin/
├── README.md
├── manifest.json
├── package.json
├── package-lock.json
├── scripts/
│   ├── build-runtime.mjs
│   ├── build-ui.mjs
│   ├── install.mjs
│   └── verify-build.mjs
├── src/
│   ├── runtime/
│   │   ├── index.js
│   │   ├── sdk/
│   │   ├── detectors/
│   │   │   └── templateDetector.js
│   │   ├── renderers/
│   │   │   └── templateRenderer.js
│   │   ├── actions/
│   │   │   ├── templateAutoAction.js
│   │   │   └── templateDraftAction.js
│   │   └── shared/
│   │       ├── templateAttachmentPayload.js
│   │       └── templateCapabilityMetadata.js
│   └── ui/
│       ├── AttachmentTemplateApp.vue
│       ├── DraftActionTemplateApp.vue
│       ├── sdk/
│       ├── composables/
│       ├── shared/
│       ├── renderers/template-renderer/
│       └── actions/template-draft-action/
├── tests/runtime/
│   └── templateCapabilities.test.cjs
└── dist/
```

## 3. 模板里已经演示的能力

### detector

- 文件：`src/runtime/detectors/templateDetector.js`
- 输入：`text`、`image`、`path_reference`
- 输出：一个 `plugin.template.full.preview` attachment
- 作用：演示如何把三种 detector 输入统一映射成紧凑 preview payload，并额外保留完整 debug snapshot 供复制

### attachment renderer

- 文件：`src/runtime/renderers/templateRenderer.js`
- UI：`src/ui/renderers/template-renderer/`
- 作用：演示 `resolveAttachment()`、`invokeOperation()`、按钮回调和 attachment bootstrap
- 默认行为：只展示类型、标题、2 到 4 个关键 metadata；点击按钮复制完整 payload 或完整 renderer context JSON

### auto-run action

- 文件：`src/runtime/actions/templateAutoAction.js`
- 支持 item type：`text`、`image`、`path_reference`
- 作用：演示无 UI action 如何返回可直接复制的完整执行上下文文本结果

### draft action

- 文件：`src/runtime/actions/templateDraftAction.js`
- UI：`src/ui/actions/template-draft-action/`
- 作用：演示 `resolveSession()`、draft bootstrap、draft 更新、button invoke、`setTags` / `setPinned`
- 支持 item type：`text`、`image`、`path_reference`
- 默认行为：UI 只显示少量关键字段，但提供 `Copy Item JSON`、`Copy Session JSON`、`Copy Draft JSON`

## 4. 默认模板在展示什么

### attachment renderer 里会看到

- 当前类型：`Text`、`Image`、`Path`
- 一个 headline
- 一个简短 subtitle
- 2 到 4 个 key facts
- 用于复制完整上下文的按钮

这块故意不做大预览，也不铺开原始正文，因为宿主 attachment 区域高度有限。

### draft action 里会看到

- 当前 item 的紧凑摘要
- 一个最小表单：tag、note、pin
- copy 按钮和一个 apply 按钮
- 一段明确说明：top-level action 只能拿到 item/session/draft，不会拿到 detector 那种原始 `content payload`

## 5. 开发流程

安装依赖并构建：

```bash
npm install
npm run build
```

运行测试：

```bash
npm test
```

本地开发 UI 预览：

```bash
npm run dev
npm run dev:renderer
npm run dev:action
```

- `dev` 会打开本地 preview workbench，可在页面里切换 renderer / action、主题和 mock scenario。
- `dev:renderer` / `dev:action` 会直接用对应 view 打开 workbench，适合只调单个界面。
- 这个 workbench 会模拟可手动调整尺寸的宿主 viewport、位于宿主 chrome 的 resize 控件、宿主 action strip、bootstrap / search / theme 事件。
- 本地预览模式下没有真实宿主，因此 bridge 的执行类调用会退化为 `console.info(...)`，重点用于调布局、文案、响应式和不同 viewport 尺寸下的表现。

本地开发时，把当前插件项目根目录作为 `Developer Plugins` 的路径加入宿主即可。

如果你是把这个源码目录直接交给宿主安装，而不是走 `Developer Plugins` 开发模式：

- `manifest.json` 已声明 `install.runtime` 与 `install.entry`
- 宿主会在 staging plugin root 下先运行 `scripts/install.mjs`
- install hook 完成后，宿主再校验 `dist/runtime/index.cjs` 和 `dist/ui/` 下的声明产物是否存在
- 如果脚本本身退出失败，宿主会把它视为 install hook execution failure
- 如果脚本成功但声明产物缺失，宿主会把它视为 runtime output validation failure

`Developer Plugins` 模式的边界也要注意：

- 宿主只消费 `manifest.json` 声明的 runtime/ui 产物，不负责自动安装依赖、自动 build、自动 watch 或自动 reload
- 代码改动后需要你自己重新构建；下一次 capability 触发时宿主会读取最新产物
- 如果你改了 `manifest.json`、capability 列表或入口路径，修改不会自动生效，需要手动 `Reload`

## 6. 开始改造时优先改哪些文件

建议最先一起改这几处，避免 manifest 和 runtime 脱节：

1. `manifest.json`
2. `src/runtime/index.js`
3. `src/runtime/shared/templateCapabilityMetadata.js`
4. `src/runtime/shared/templateAttachmentPayload.js`
5. `src/runtime/detectors/templateDetector.js`
6. `src/runtime/renderers/templateRenderer.js`
7. `src/runtime/actions/templateAutoAction.js`
8. `src/runtime/actions/templateDraftAction.js`
9. `src/ui/AttachmentTemplateApp.vue`
10. `src/ui/DraftActionTemplateApp.vue`

如果你改了下面这些 ID / 类型名，记得同步改全套引用：

- `plugin.id`
- `attachmentRenderers[].id`
- `detectors[].id`
- `actions[].id`
- `attachmentType`
- UI 入口路径 `uiEntry`

## 7. 哪些文件通常不需要改

除非你要换构建链路，否则一般直接保留：

- `src/runtime/sdk/**`
- `src/ui/sdk/**`
- `src/ui/composables/**`
- `scripts/build-runtime.mjs`
- `scripts/install.mjs`

## 8. 作者改模板时最常见的边界误解

- detector 能看到 `input.content.payload`，所以它能区分 `text / image / path_reference` 的真实输入形状
- top-level action 看不到 detector 输入里的 `image.dataBase64` 或 `path_reference.entries`
- renderer runtime 能拿到 item + attachment；如果要把 UI 侧 bootstrap/search/theme 一起复制出来，需要通过 `invokeOperation(..., params)` 把这些 UI 数据传回 runtime
- UI 不直接拿宿主高权限能力；复制、tag、pin 等操作都应该回到 runtime 执行

## 9. 验证约定

模板自带了三层验证：

- `npm test`
  - 校验 manifest、runtime handler、最小行为
- `npm run build`
  - 产出 runtime bundle 和 UI bundle
- `node ./scripts/verify-build.mjs`
  - 校验构建产物路径和关键 runtime 注册项

宿主内的最小 smoke 路径建议至少覆盖这些步骤：

- 以源码目录直接安装，或把当前插件项目根目录加到 `Developer Plugins`
- 准备一个 `text`、`image` 或 `path_reference` item，确认出现 `Template Preview`
- 打开 renderer，确认 `Copy Payload` 和 `Copy Context` 可用
- 触发 `Template Auto Action`，确认返回可复制的执行上下文文本
- 触发 `Template Draft Action`，确认 `Copy Item JSON`、`Copy Session JSON`、`Copy Draft JSON` 和 `Apply Metadata` 都能运行

如果你替换了页面名称、action ID 或 renderer ID，记得同步更新对应测试和 `verify-build.mjs`。
