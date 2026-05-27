# 插件开发指南

本文档与本工程（`plugins/template-plugin/`）一起，构成 Pasty 三方插件开发的**完整**参考。读完本文档并对照 demo 即可独立开发出一个生产可用的 Pasty 插件。

**配套文档：**

- **[`sdk/API.md`](./sdk/API.md)** — 由 `protocol/plugin/src/catalog.ts` 自动生成的 API 真相源（capability / host event / 类型一览）。运行 `cd protocol/plugin && npm run codegen` 会同步刷新这份文件。**有冲突时以 API.md 为准**。
- **[`sdk/README.md`](./sdk/README.md)** — SDK 公共符号速查（导出、运行时入口、UI 入口）。
- **[`sdk/SPECIFICATION.md`](./sdk/SPECIFICATION.md)** — SDK 形状规则、命名约定、扩展 capability 的 PR 流程。

本 GUIDE 偏向**实践**：怎么起步、怎么实现 detector/renderer/action、怎么写权限和入参、常见坑点。

---

## 0. 快速开始

### 前置条件

- Node.js >= 18

### 初始化

```sh
npm install
```

`sdk/` 是内嵌的 `@pasty/plugin-sdk`，`npm install` 会自动触发 `sdk/prepare`，在本地编译 `sdk/dist/`。完成后即可直接使用 SDK。

> `sdk/src/` 是宿主 SDK 的随包副本，**插件作者不需要查看或修改**。所有插件作者可用的符号由 codegen 产出，列在 [`sdk/API.md`](./sdk/API.md) 与 [`sdk/README.md`](./sdk/README.md)。

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

依次：clean → build:sdk → build:runtime → build:ui → verify:build，输出到 `dist/`。

### 测试

```sh
npm test         # tests/runtime/ 集成测试
cd sdk && npm test   # SDK 自身测试
```

---

## 1. 工程结构

新插件按 feature 切分，每个 feature 一个自洽目录。推荐布局：

```text
your-plugin/
├── manifest.json
├── package.json
├── sdk/                                ← 内嵌 @pasty/plugin-sdk（file:./sdk）
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

> `sdk/` 是 codegen 同步的内嵌副本，**不要手动改**。扩展 capability 见 [`sdk/SPECIFICATION.md`](./sdk/SPECIFICATION.md) Ch 3。

---

## 2. 架构

### 2.1 两个执行上下文

一个 v2 插件运行在两个完全隔离的环境：

| 环境 | 入口 | 负责 |
|---|---|---|
| **Node runtime** | `manifest.runtime.nodeEntry` | detector、`resolveAttachment`、`resolveSession`、`runAutoAction`、`messageHandlers` |
| **WebView UI** | `manifest.<thing>.uiEntry` HTML | 卡片/表单渲染、用户交互、最终结果提交 |

两边通过 SDK 暴露的高阶 API 通信：

- Runtime 侧用 `host.*`（来自 `@pasty/plugin-sdk/runtime`）调宿主能力
- UI 侧用 `pasty.*`（来自 `@pasty/plugin-sdk/ui`）调宿主能力
- UI ↔ Runtime 之间用 `pasty.runtime.invoke` ↔ `messageHandlers` 桥接

宿主与插件之间的传输层（postMessage / Node IPC / 宿主事件 envelope）由 SDK 完全封装，**插件作者不需要关心**底层 wire 形状。

### 2.2 三类产物

| 产物 | 在哪运行 | runtime 入口 | UI 入口 |
|---|---|---|---|
| **detector** | 仅 Node runtime | `detect(input, ctx)` | — |
| **attachment renderer** | Node runtime + WebView | `resolveAttachment(input, ctx)` | `manifest.attachmentRenderers[].uiEntry` |
| **action（auto-run）** | 仅 Node runtime | `runAutoAction(input, ctx)` | — |
| **action（draft）** | Node runtime + WebView | `resolveSession(input, ctx)`（可选） | `manifest.actions[].uiEntry` |

> 历史上的 `invokeOperation` 入口已被**完全移除**。`definePlugin` 在 setup 阶段就会拦截带 `invokeOperation` 的 handler 并抛错。所有按钮副作用与 draft 提交都通过 UI verb 完成。

### 2.3 数据流总图

```
┌─────────────────────────────────────┐
│           Pasty Host                │
└───────────┬─────────────┬───────────┘
            │             │
   ┌────────▼─────────┐  ┌▼─────────────────────────┐
   │  Node Runtime    │  │     WebView UI            │
   │                  │  │                           │
   │  definePlugin()  │  │  import { pasty }         │
   │   detect         │  │    from '@pasty/plugin-   │
   │   resolveAttach… │  │           sdk/ui'         │
   │   resolveSession │  │                           │
   │   runAutoAction  │  │  pasty.item.current()     │
   │   messageHandlers│  │  pasty.action.*           │
   │                  │  │  pasty.attachmentRenderer.│
   │  host.item.*     │  │  pasty.runtime.invoke()   │
   │  host.clipboard. │  │  …                        │
   │  host.action.*   │  │                           │
   │  …               │  │                           │
   └────────▲─────────┘  └───────────────────────────┘
            │                          │
            └──────────────────────────┘
              pasty.runtime.invoke
              ↔ messageHandlers
```

**Host → Plugin（推送）：**
- 宿主调 Node runtime 的 handler：`detect` / `resolveAttachment` / `resolveSession` / `runAutoAction`
- 宿主向 WebView 推送 topic 状态：UI 用 `pasty.<domain>.on(fn)` 订阅
- 宿主派发按钮点击：UI 用 `pasty.action.onHostInvoke(fn)` / `pasty.attachmentRenderer.onHostInvoke(fn)` 订阅

**Plugin → Host（请求）：**
- Runtime 用 `host.*` 调宿主（Node IPC，真 RPC，返回 `Promise<Result>`）
- UI 用 `pasty.*` verb 调宿主（WebView postMessage，同样是 `Promise<Result>`）

### 2.4 Host → WebView 状态形状

UI 侧拿到的所有宿主状态遵守三种形状之一（详见 [`sdk/SPECIFICATION.md`](./sdk/SPECIFICATION.md) 第 1 章）：

| 形状 | 接口 | 适用 | 举例 |
|---|---|---|---|
| **Topic\<T\>** | `.current(): T \| undefined` + `.on(fn)` | 有快照的持续状态 | `pasty.item`、`pasty.theme` |
| **OptionalTopic\<T\>** | 同上，但 `.current()` 可能 `undefined` | 上下文相关的状态 | `pasty.item.attachment`、`pasty.action.draft` |
| **Stream\<T\>** | `.on(fn)` only | 离散事件流 | `pasty.attachmentRenderer.onHostInvoke`、`pasty.action.onHostInvoke` |

> **重要：SDK 没有 `pasty.ready()`**。监听器可以在模块加载时立即注册——宿主会在 bootstrap 推送时唤起它们。`.current()` 在 bootstrap 之前可能返回 `undefined`，用 `?.` / `??` / 早返回防御即可。

---

## 3. manifest.json 规范

### 3.1 顶层字段

| 字段 | 类型 | 必填 | 说明 |
|---|---|---|---|
| `schemaVersion` | `number` | 是 | 固定 `2` |
| `plugin` | `object` | 是 | 插件身份信息 |
| `install` | `object` | 否 | 安装期 hook 配置 |
| `runtime` | `object` | 是 | runtime 与 UI 根目录 |
| `permissions` | `string[]` | 否 | mutation 权限声明（缺省 `[]`） |
| `attachmentRenderers` | `object[]` | 否 | attachment renderer 列表 |
| `detectors` | `object[]` | 否 | detector 列表 |
| `actions` | `object[]` | 否 | action 列表 |

### 3.2 `plugin`

| 字段 | 类型 | 必填 | 说明 |
|---|---|---|---|
| `plugin.id` | `string` | 是 | 稳定命名空间，建议反向域名（`plugin.example.demo`） |
| `plugin.title` | `string` | 是 | 显示名称 |
| `plugin.version` | `string` | 是 | 版本号；宿主按字符串处理 |

### 3.3 `install`（可选）

| 字段 | 类型 | 必填 | 说明 |
|---|---|---|---|
| `install.runtime` | `'node' \| 'bash'` | 是 | 安装脚本运行时 |
| `install.entry` | `string` | 是 | 脚本路径，相对插件根目录，不允许逃出 |

参见本工程 `scripts/install.mjs`。

### 3.4 `runtime`

| 字段 | 类型 | 必填 | 说明 |
|---|---|---|---|
| `runtime.nodeEntry` | `string` | 是 | Node runtime 入口（编译后 `.cjs`） |
| `runtime.uiRoot` | `string` | 是 | UI 根目录；所有 `uiEntry` 相对此目录 |

### 3.5 `permissions`

仅 4 个合法值：`setTags`、`setPinned`、`setAttachment`、`setSearchExtension`。声明哪个就解锁哪组 runtime mutation verb；其余 verb（clipboard、navigation、settings 读、console、attachment 读取、图片临时路径等）默认就能调。

完整的权限-到-verb 映射、声明示例与最小权限原则见 [§8 权限模型](#8-权限模型)。

### 3.6 `attachmentRenderers[]`

| 字段 | 类型 | 必填 | 说明 |
|---|---|---|---|
| `id` | `string` | 是 | 局部 ID，同插件内唯一 |
| `title` | `string` | 是 | 显示名称 |
| `attachmentType` | `string` | 是 | 该 renderer 负责的 attachment type，建议 `plugin.id + "."` 前缀 |
| `height` | `number \| "auto" \| { min, max }` | 否 | 卡片高度策略，见下 |
| `uiEntry` | `string` | 否 | HTML 入口，相对 `runtime.uiRoot` |

**height 三种形态：**

```json
{ "height": 320 }                          // 固定高度（1–800 px）
{ "height": "auto" }                       // 自适应，默认范围 [80, 800]
{ "height": { "min": 120, "max": 480 } }   // 有界范围
```

省略 `height` 等价于 `{ "min": 80, "max": 400 }`。`"auto"` 与 `{ min, max }` 下，**UI 必须显式调用 `pasty.window.autoFit()`**——SDK 不会自动启动。

### 3.7 `detectors[]`

| 字段 | 类型 | 必填 | 说明 |
|---|---|---|---|
| `id` | `string` | 是 | 局部 ID |
| `title` | `string` | 是 | 显示名称 |
| `supportedInputKinds` | `string[]` | 是 | `'text' \| 'image' \| 'path_reference'`；非空 |
| `attachmentTypes` | `string[]` | 是 | 可能产出的 attachment type；每项须在 `attachmentRenderers[]` 中有对应 renderer |

### 3.8 `actions[]`

| 字段 | 类型 | 必填 | 说明 |
|---|---|---|---|
| `id` | `string` | 是 | 局部 ID |
| `title` | `string` | 是 | 显示名称 |
| `supportedItemTypes` | `string[]` | 是 | `'text' \| 'image' \| 'path_reference'`；非空 |
| `lifecycle` | `'auto-run' \| 'draft'` | 是 | action 生命周期 |
| `keywords` | `string[]` | 否 | Action catalog 搜索关键词 |
| `uiEntry` | `string` | 否 | `lifecycle: 'draft'` 时必填 |

### 3.9 最小完整示例

```json
{
  "schemaVersion": 2,
  "plugin": {
    "id": "plugin.example.sample",
    "title": "Sample Plugin",
    "version": "0.1.0"
  },
  "runtime": {
    "nodeEntry": "dist/runtime/index.cjs",
    "uiRoot": "dist/ui"
  },
  "permissions": ["setTags"],
  "attachmentRenderers": [
    {
      "id": "sample-card",
      "title": "Sample Card",
      "attachmentType": "plugin.example.sample.card",
      "height": 320,
      "uiEntry": "renderers/sample/index.html"
    }
  ],
  "detectors": [
    {
      "id": "sample-detector",
      "title": "Sample Detector",
      "supportedInputKinds": ["text"],
      "attachmentTypes": ["plugin.example.sample.card"]
    }
  ],
  "actions": [
    {
      "id": "sample-apply",
      "title": "Apply Sample",
      "supportedItemTypes": ["text"],
      "lifecycle": "draft",
      "keywords": ["sample", "apply"],
      "uiEntry": "actions/sample/index.html"
    }
  ]
}
```

---

## 4. SDK 入口与初始化

SDK 暴露两个 subpath。一边导出的符号**完全由 codegen 生成**，列在 [`sdk/API.md`](./sdk/API.md)。

### 4.1 Runtime 入口

```ts
// CommonJS（推荐与现行 bundler 配合）
const { definePlugin, host, actionResult, defineMessage } = require('@pasty/plugin-sdk/runtime');

// ESM（types）
import type { PluginAttachmentRendererHandler, PluginAutoRunActionHandler, PluginDetectorHandler } from '@pasty/plugin-sdk/runtime';
```

入口导出：

- `definePlugin` —— 注册 handler；本地校验 registry 形状
- `host` —— 直接调宿主能力的单例（`host.<domain>.<verb>(payload)`）。**推荐写法**是从 handler 收到的 `ctx.host` 调用（同一个对象，但写在 handler 内更显式）。
- `actionResult` —— `runAutoAction` 的返回值构造器
- `defineMessage` —— UI ↔ Runtime RPC 的类型契约

### 4.2 UI 入口

```ts
import { pasty } from '@pasty/plugin-sdk/ui';
import { defineMessage } from '@pasty/plugin-sdk/ui';
import { PluginContextError } from '@pasty/plugin-sdk/ui';
```

`pasty` 的命名空间一览：

| Namespace | 形态 | 说明 |
|---|---|---|
| `pasty.item` | Topic | `current()`, `on()`, `readAttachment()`，子 OptionalTopic `pasty.item.attachment` |
| `pasty.theme` | Topic | `current()`, `on()` |
| `pasty.pluginContext` | Topic | `current()`, `on()`，返回 `{mode, pluginID}` |
| `pasty.action` | Verb + OptionalTopic | action 上下文专属；`setButtons`、`complete`、`draft`、`onHostInvoke` |
| `pasty.attachmentRenderer` | Verb + Stream | attachment 上下文专属；`setButtons`、`onHostInvoke` |
| `pasty.window` | Verb | `setHeight`, `autoFit` |
| `pasty.clipboard` | Verb | `copyText` |
| `pasty.navigation` | Verb | `openUrl`, `revealInFinder`, `openFilePath` |
| `pasty.settings` | Verb | `get`, `getAll` |
| `pasty.console` | Verb | `log({level, message})` |
| `pasty.textInput` | Verb | `stateChanged({isFocused, isComposing})` |
| `pasty.runtime` | Verb | `invoke<TResp>({key, payload, timeoutMs?})` |

**每个方法的精确 payload / response 形状以 [`sdk/API.md`](./sdk/API.md) 为准。** GUIDE 不再重复 23 个 capability 的完整签名表——那是 codegen 的责任。

### 4.3 没有 `pasty.ready()`

SDK **不**导出 `pasty.ready()`。订阅者（`pasty.<domain>.on(fn)`）可在模块加载时立即注册——监听是 context-neutral 的，宿主推送 bootstrap 时会自动触发回调。

如果需要在初始数据到达后做同步动作，常见模式是：

```ts
import { pasty } from '@pasty/plugin-sdk/ui';

const item = pasty.item.current(); // bootstrap 已到时直接拿到
if (item) {
  init(item);
} else {
  const unsub = pasty.item.on(initialItem => {
    init(initialItem);
    unsub();
  });
}
```

### 4.4 Context guards

部分 verb 只在特定 WebView 上下文有意义，在错误上下文调用会以 `PluginContextError` reject：

| Verb | 必须的上下文 |
|---|---|
| `pasty.action.complete(...)` | action |
| `pasty.action.setButtons(...)` | action |
| `pasty.attachmentRenderer.setButtons(...)` | attachmentRenderer |

捕获方式：

```ts
import { PluginContextError } from '@pasty/plugin-sdk/ui';

try {
  await pasty.action.complete({ result: { resultKind: 'none' } });
} catch (e) {
  if ((e as Error).name === 'PluginContextError') {
    // 当前 WebView 不是 action 上下文
  }
}
```

订阅类 verb（`pasty.action.draft.on`、`pasty.attachmentRenderer.onHostInvoke.on` 等）是 context-neutral 的：在错误上下文订阅不会抛错，监听器只是永远不会被触发。

### 4.5 `definePlugin`

```ts
const { definePlugin } = require('@pasty/plugin-sdk/runtime');

module.exports = definePlugin({
  attachmentRenderers: {
    'sample-card': createSampleRenderer(),
  },
  detectors: {
    'sample-detector': createSampleDetector(),
  },
  actions: {
    'sample-apply': createSampleAction(),
  },
  messageHandlers: {
    'sample.applyMetadata': async (req, ctx) => {
      await ctx.host.item.setTags({ tags: req.tags });
      return { ok: true };
    },
  },
});
```

注册项的 key **必须**与 `manifest.json` 中对应 `id` 完全一致，否则宿主无法寻址。

`definePlugin` 同时接受 setup 函数形式：

```ts
module.exports = definePlugin({
  setup() {
    return { attachmentRenderers, detectors, actions, messageHandlers };
  },
});
```

校验规则（在 setup 阶段 throw）：

- renderer / action 注册项若包含 `invokeOperation` 立刻抛错（该入口已删除）
- 其他 registry 形状由 TypeScript 在编译期约束

---

## 5. Detector / Renderer / Action 开发约定

### 5.1 Detector

入参 `PluginDetectorInput`（详见 [`sdk/API.md`](./sdk/API.md) §8）：

```ts
input.item            // PluginClipboardItem: {id, type, tags, sourceAppID}
input.content         // PluginContentEnvelope (见 §6)
input.attachments     // PluginAttachmentRef[]：当前 item 已有的附件引用
```

**返回值是 artifact 数组本身**（不是 `{artifacts}` 包装）：

```ts
import type { PluginDetectorHandler, PluginDetectorArtifact } from '@pasty/plugin-sdk/runtime';

const detector: PluginDetectorHandler = {
  async detect(input, ctx) {
    if (input.content.kind !== 'text') return [];

    return [
      {
        attachmentType: 'plugin.example.sample.card',  // 必须已在 manifest 声明
        attachmentKey: `card-${input.item.id}`,        // 稳定 key，不允许空字符串
        payloadJson: JSON.stringify({ text: input.content.text }),
        attachmentSyncScope: 'syncable',               // 'syncable' | 'local_only'
        searchProjection: {                            // 可选
          scope: 'sample',
          searchText: input.content.text.slice(0, 80),
          label: null,
        },
      },
    ] satisfies PluginDetectorArtifact[];
  },
};
```

**约定：**

- 未命中时返回 `[]`，不要返回半成品 artifact
- Detector 内不应执行宿主 mutation（标签写入等）；那是 action 的职责
- `attachmentType` 必须出自 manifest 的 `detectors[].attachmentTypes`

### 5.2 Attachment Renderer

Runtime 入口**只有** `resolveAttachment`。所有按钮副作用、用户交互都在 UI 侧完成。

入参 `PluginResolveAttachmentInput`：

```ts
input.item                       // PluginClipboardItem
input.content                    // PluginContentEnvelope
input.attachments                // PluginAttachmentRef[]
input.attachment                 // PluginAttachmentEntry：当前要渲染的附件
   .historyID
   .owner
   .attachmentType
   .attachmentKey
   .payloadJson                  // 完整 JSON 字符串；插件自行解析
```

返回值 `PluginAttachmentResolveResult`：

```ts
return {
  displayName: 'Sample Card',           // string | undefined；建议始终返回
  tintHex: '#2563EB',                   // string | undefined；卡片强调色
  shouldDisplay: true,                  // boolean | undefined（默认 true）
  buttons: [                            // 可选首屏 seed
    { id: 'copy-json', title: 'Copy JSON', isEnabled: true },
  ],
};
```

**`shouldDisplay` 语义：** 宿主在 WebView 启动**之前**读取它。

- `true` / 省略 — 正常进入渲染队列
- `false` — 宿主跳过该 attachment，**不**分配卡片位、**不**启动 WebView

典型用法：payload 解析失败时静默退出，避免 UI 报错：

```ts
async resolveAttachment(input, ctx) {
  let parsed;
  try {
    parsed = JSON.parse(input.attachment.payloadJson);
  } catch {
    return { shouldDisplay: false };
  }
  if (!parsed.kind) return { shouldDisplay: false };
  return {
    displayName: parsed.title ?? 'Sample Card',
    buttons: [{ id: 'copy-json', title: 'Copy JSON', isEnabled: true }],
  };
}
```

**按钮 seed 与 UI 覆盖：** `resolveAttachment.buttons` 是首屏 seed（供宿主在 WebView 启动前渲染 native chrome）。UI 一旦调用 `pasty.attachmentRenderer.setButtons([...])`，列表被**整体替换**，seed 永远不再生效。**没有差分更新**——UI 每次推送完整列表。

#### Renderer UI 典型生命周期

```ts
import { pasty } from '@pasty/plugin-sdk/ui';

const attachment = pasty.item.attachment.current();
if (attachment) {
  const payload = JSON.parse(attachment.payloadJson);
  renderInitial(payload);
}

const unsub = pasty.item.attachment.on(newAttachment => {
  renderInitial(JSON.parse(newAttachment.payloadJson));
});

// 启用自适应高度（manifest height: { min, max } 时必须调用）；
// 实际像素由 UI 之后通过 pasty.window.setHeight({ height }) 持续上报，
// 或使用 @pasty/plugin-sdk/dom 的 autoFit 辅助函数自动做 ResizeObserver。
await pasty.window.autoFit();

// 按需更新按钮（覆盖 seed）
await pasty.attachmentRenderer.setButtons({
  buttons: [
    { id: 'copy-json', title: 'Copy JSON', isEnabled: true },
    { id: 'copy-raw', title: 'Copy Raw', isEnabled: false },
  ],
});

// 订阅宿主派发的按钮点击
const unsubClick = pasty.attachmentRenderer.onHostInvoke.on(({ buttonID }) => {
  if (buttonID === 'copy-json') {
    pasty.clipboard.copyText({ text: JSON.stringify(payload, null, 2) });
  }
});
```

### 5.3 Action

按 lifecycle 分叉为两种形态，runtime 入口不同：

| lifecycle | runtime 入口 | UI 入口 |
|---|---|---|
| `auto-run` | `runAutoAction(input, ctx)` | 无 |
| `draft` | `resolveSession(input, ctx)`（可选） | 必填 `uiEntry`；UI 自管表单状态，最终调 `pasty.action.complete(...)` 提交 |

#### resolveSession 入参

```ts
input.item                    // PluginClipboardItem
input.content                 // PluginContentEnvelope
input.attachments             // PluginAttachmentRef[]
```

#### resolveSession 返回值

```ts
return {
  displayName: 'Apply Metadata',         // string | undefined
  buttons: [                              // 可选首屏 seed
    { id: 'apply', title: 'Apply', isEnabled: true },
  ],
  defaultButtonID: 'apply',               // string | undefined
  initialDraft: { subject: '', note: '' } // Record<string, JSONValue>
};
```

`initialDraft` 由宿主存入 draft topic，UI 可通过 `pasty.action.draft.current()` 读到。`auto-run` lifecycle 可省略 `resolveSession`，宿主按空 session 处理。

#### runAutoAction 入参

```ts
input.item                    // PluginClipboardItem
input.content                 // PluginContentEnvelope
input.attachments             // PluginAttachmentRef[]
```

#### runAutoAction 返回值（用 `actionResult`）

```ts
const { actionResult } = require('@pasty/plugin-sdk/runtime');

// text 结果
actionResult.text('hello world', { userMessage: 'Copied' });
// → { result: { resultKind: 'text', text: 'hello world' }, userMessage: 'Copied' }

// image 结果（注意：第一个参数是 imageTempPath 字符串，不是对象）
actionResult.image(imageTempPath, { imageFormatHint: 'png', userMessage: 'Saved' });

// 仅副作用，无输出
actionResult.none({ userMessage: 'Applied' });
```

签名：

```ts
actionResult.text(text: string, options?: { userMessage?: string })
actionResult.image(imageTempPath: string, options?: { imageFormatHint?: string; userMessage?: string })
actionResult.none(options?: { userMessage?: string })
```

#### Draft Action UI 生命周期（强类型）

Draft 是**只读 OptionalTopic**：UI 通过 `current()` / `on()` 读宿主的 `initialDraft`。**SDK 不暴露 `draft.update()`**——UI 自管表单本地状态，最终通过 `pasty.action.complete(...)` 提交结果。如果 runtime 端需要参与（例如生成图片），通过 `pasty.runtime.invoke(...)` 桥接。

```ts
import { pasty } from '@pasty/plugin-sdk/ui';

interface MyDraft { subject: string; note: string; }

// 读 initialDraft 作为表单初始状态
const initial = pasty.action.draft.current() as MyDraft | undefined;
const form = reactive({ subject: initial?.subject ?? '', note: initial?.note ?? '' });

// 订阅 host 推送的后续更新（罕见；通常 initialDraft 之后就由 UI 接管）
pasty.action.draft.on(next => {
  Object.assign(form, next);
});

// 订阅按钮点击
pasty.action.onHostInvoke.on(({ buttonID }) => {
  if (buttonID === 'apply') handleApply();
});

// 按需推送按钮列表（启用/禁用通过完整列表的 isEnabled 表达）
await pasty.action.setButtons({
  buttons: [
    { id: 'apply', title: 'Apply', isEnabled: form.subject.length > 0 },
    { id: 'cancel', title: 'Cancel', isEnabled: true },
  ],
});

async function handleApply() {
  await pasty.action.complete({
    result: { resultKind: 'text', text: form.subject },
    userMessage: 'Applied',
  });
}
```

#### Draft Action：UI 需要 runtime 协助时

`pasty.action.complete` 接收 `{result: {resultKind: 'text' | 'image' | 'none', …}}`。**image 结果的 `imageTempPath` 必须由 runtime 端通过 `host.action.allocateImageTempPath` 分配**（UI 端没有这个能力），所以图片类 draft 的典型流程是：

```ts
// shared/contracts.ts —— 两端共享类型契约
import { defineMessage } from '@pasty/plugin-sdk/runtime';  // 或 /ui，类型相同
export const GenerateImage = defineMessage<{ prompt: string }, { imageTempPath: string }>('generate-image');

// runtime/index.ts
const { definePlugin, host } = require('@pasty/plugin-sdk/runtime');
const fs = require('node:fs/promises');
const { GenerateImage } = require('../shared/contracts');

module.exports = definePlugin({
  messageHandlers: Object.fromEntries([
    GenerateImage.handle(async (req, ctx) => {
      const { path } = await ctx.host.action.allocateImageTempPath({ formatHint: 'png' });
      await fs.writeFile(path, await generateImage(req.prompt));
      return { imageTempPath: path };
    }),
  ]),
});

// UI 端
import { defineMessage, pasty } from '@pasty/plugin-sdk/ui';
const GenerateImage = defineMessage<{ prompt: string }, { imageTempPath: string }>('generate-image');

async function handleApplyImage(prompt: string) {
  const { imageTempPath } = await GenerateImage.invoke({ prompt }, { timeoutMs: 60_000 });
  await pasty.action.complete({
    result: { resultKind: 'image', imageTempPath, imageFormatHint: 'png' },
  });
}
```

> **不要**尝试通过 `runtime.invoke` 把图片字节传回 UI。postMessage 经 base64 + JSON 双重序列化，几 MB 图片就会卡顿数百 ms。让 runtime 直接写文件、只把路径返回给 UI。

---

## 6. 入参形状（ItemContext envelope）

每个 handler 的 `input` 都遵守 **ItemContext envelope**：

```ts
interface ItemContext {
  item: PluginClipboardItem;
  content: PluginContentEnvelope;
  attachments: PluginAttachmentRef[];
}
```

各 handler 在此之上附加专属字段（见 §5）。

### 6.1 `PluginContentEnvelope`：三种 kind，字段平铺在顶层

**关键：字段直接挂在 `content` 上，没有 `.payload.` 间接层。**

| kind | 字段 |
|---|---|
| `'text'` | `content.text: string` |
| `'image'` | `content.width: number`, `content.height: number`, `content.format: string`, `content.bytes: number` |
| `'path_reference'` | `content.entries: PluginPathEntry[]` |

```ts
switch (input.content.kind) {
  case 'text':
    console.log(input.content.text);
    break;
  case 'image':
    console.log(`${input.content.width}x${input.content.height} ${input.content.format}`);
    // input.content 不含像素数据，需要时调 host.item.materializeImagePath（见 §6.3）
    break;
  case 'path_reference':
    for (const entry of input.content.entries) {
      console.log(entry.kind, entry.path, entry.displayName);
    }
    break;
}
```

`PluginPathEntry` 形状：

```ts
interface PluginPathEntry {
  kind: 'file' | 'folder';
  path: string;
  displayName: string;
}
```

### 6.2 `PluginClipboardItem`

```ts
interface PluginClipboardItem {
  id: string;
  type: string;          // 'text' | 'image' | 'path_reference'
  tags: string[];
  sourceAppID: string;
}
```

> **历史变更：** 旧版 SDK 在 `item` 上有 `text`。新版**已移除**——文本走 `input.content.text`（且仅在 `kind === 'text'` 时存在）。

### 6.3 图片懒副本机制

`input.content`（image 情形）只携带元信息，不带像素。当 detector / action 需要读字节时：

```ts
const { path } = await ctx.host.item.materializeImagePath();
// path 是宿主复制到临时目录的副本，invocation 结束后宿主自动清理。
```

同一 invocation 多次调用幂等返回同一路径。

### 6.4 Attachment 按需读

```ts
const { payloadJson } = await ctx.host.item.readAttachment({
  attachmentType: 'plugin.example.sample.card',
  attachmentKey: 'card-1',
});
if (payloadJson) {
  const payload = JSON.parse(payloadJson);
}
```

`input.attachments` 给出当前 item 已有的附件引用列表（`{attachmentType, attachmentKey}`）。`readAttachment` 按需拉取真正内容，避免把所有附件塞进入参。

### 6.5 Action 返回图片

字节写入由 **runtime 端**完成，**不要**让 UI 写文件。两种推荐写法：

**A. Auto-run action — runtime 一气呵成：**

```ts
const { definePlugin, actionResult } = require('@pasty/plugin-sdk/runtime');
const fs = require('node:fs/promises');

module.exports = definePlugin({
  actions: {
    'generate-image': {
      async runAutoAction(input, ctx) {
        const { path } = await ctx.host.action.allocateImageTempPath({ formatHint: 'png' });
        await fs.writeFile(path, await generateImageBytes(input));
        return actionResult.image(path, { imageFormatHint: 'png' });
      },
    },
  },
});
```

**B. Draft action — UI 触发 runtime 产文件，再由 UI 调 `complete`：** 见 §5.3 中的示例。

---

## 7. UI ↔ Runtime RPC（`pasty.runtime.invoke`）

让 UI 调用插件自己的 Node runtime 逻辑，无需写 native 桥接。

### 7.1 直接接口

```ts
import { pasty } from '@pasty/plugin-sdk/ui';

// pasty.runtime.invoke<TResp> 直接返回 TResp（SDK 已自动解 wire envelope）
const { title } = await pasty.runtime.invoke<{ title: string }>({
  key: 'fetch-title',
  payload: { url: 'https://example.com' },
  timeoutMs: 10_000,  // 可选；默认 30_000 ms
});
```

Runtime 端：

```ts
const { definePlugin } = require('@pasty/plugin-sdk/runtime');

module.exports = definePlugin({
  messageHandlers: {
    'fetch-title': async (req, ctx) => {
      const html = await fetch(req.url).then(r => r.text());
      return { title: html.match(/<title>(.*?)<\/title>/)?.[1] ?? '' };
    },
  },
});
```

### 7.2 `defineMessage` —— 两端共享契约（推荐写法）

`defineMessage<TReq, TResp>(key)` 把字符串 key + 类型一起钉死，两端导入同一契约：

```ts
// shared/contracts.ts —— 仅做类型，避免拼字符串
import { defineMessage } from '@pasty/plugin-sdk/runtime';   // 或 /ui，类型完全相同
export const FetchTitle = defineMessage<{ url: string }, { title: string }>('fetch-title');

// runtime/index.ts
const { definePlugin } = require('@pasty/plugin-sdk/runtime');
const { FetchTitle } = require('../shared/contracts');

module.exports = definePlugin({
  messageHandlers: Object.fromEntries([
    FetchTitle.handle(async (req, ctx) => {
      const html = await fetch(req.url).then(r => r.text());
      return { title: html.match(/<title>(.*?)<\/title>/)?.[1] ?? '' };
    }),
  ]),
});

// ui/app.ts
import { FetchTitle } from '../shared/contracts';
const { title } = await FetchTitle.invoke({ url: 'https://example.com' }, { timeoutMs: 10_000 });
```

### 7.3 超时与错误

- 默认超时 **30 秒**；用 `options.timeoutMs` 覆盖
- handler 中 `throw` 一个 Error，UI 侧 `await` reject，`name` 与 `data` 跨进程保留：

```ts
// runtime 端
throw Object.assign(new Error('rate limited'), {
  name: 'RateLimitError',
  data: { retryAfterSec: 60 },
});

// UI 端
try {
  await FetchTitle.invoke({ url });
} catch (err: any) {
  if (err.name === 'RateLimitError') {
    console.log('retry in', err.data.retryAfterSec, 's');
  }
}
```

- **不**支持通过此通道传图片字节（参见 §6.5）

---

## 8. 权限模型

### 8.1 manifest 声明

```json
{ "permissions": ["setTags", "setPinned"] }
```

未声明的权限对应方法在宿主侧 reject。

### 8.2 受门控的 Verb

| 权限 | runtime Verb |
|---|---|
| `setTags` | `host.item.setTags` / `addTags` / `removeTags` |
| `setPinned` | `host.item.setPinned` |
| `setAttachment` | `host.item.setAttachments` |
| `setSearchExtension` | `host.item.setSearchExtension` |

**不受门控：** `host.clipboard.*`、`host.navigation.*`、`host.settings.*`（只读）、`host.console.log`、`host.action.allocateImageTempPath`、`host.item.materializeImagePath`、`host.item.readAttachment`、所有 `pasty.*` 中的 UI 专属 verb（`window.*`、`action.setButtons`、`action.complete`、`attachmentRenderer.setButtons` 等）。

### 8.3 最小权限原则

只声明真正会调的权限。多声明不会导致功能异常，但会在宿主权限审查中显得可疑。

---

## 9. 常见坑点 Q&A

**Q：监听器要等 `pasty.ready()` 才能注册吗？**

A：不要。**SDK 没有 `pasty.ready()`**。监听器在模块加载时就注册——宿主 bootstrap 推送到达时会自动触发。同步读快照用 `.current()`，可能返回 `undefined`，用 `?.` / `??` 防御即可。

**Q：`pasty.action.draft.update` 在哪？**

A：**不存在**。Draft 是只读 OptionalTopic：UI 通过 `current()` / `on()` 读 `initialDraft`，之后自管表单本地状态，最终通过 `pasty.action.complete(...)` 提交。这是 plugin-api-shrink 的主动设计——宿主不需要知道每次按键。

**Q：`pasty.theme.refresh()` / `pasty.theme.getThemeSnapshot()` 在哪？**

A：**不存在**。`pasty.theme` 只有 `current()` 和 `on(fn)`。宿主在 WebView 启动时通过 `__PASTY_PLUGIN_THEME__` window global 注入快照，并通过 `pasty-plugin-theme` host event 推送更新，SDK 自动维护 Topic。

**Q：旧版的 `pasty.action.allocateImageTempPath` 还在吗？**

A：**已从 UI 端移除**。临时路径只能由 runtime 端通过 `host.action.allocateImageTempPath({formatHint?})` 申请，再由 runtime 写文件。如果 UI 需要触发，按 §5.3 的 draft action 模式：UI 调 `pasty.runtime.invoke(...)` → 自己的 `messageHandlers` → 在 runtime 里申请路径 + 写文件 + 把路径返回给 UI → UI 用 `pasty.action.complete({result: {resultKind: 'image', imageTempPath}})` 提交。

**Q：旧版的 `ctx.host.capabilities.setTags` 检查在哪？**

A：**已移除**。如果调用未授权的 verb，宿主侧 reject，错误会通过 `host.item.setTags(...)` 的 Promise 抛回来。在调用点 `try/catch` 即可。如果需要在执行前做条件分支，直接看 `manifest.json` 的 `permissions` 数组——它就是真相源。

**Q：`actionResult.image` 的参数形状到底是什么？**

A：第一个参数是 **`imageTempPath: string`**（不是对象）。选项里用 `imageFormatHint`：

```ts
actionResult.image(tempPath, { imageFormatHint: 'png', userMessage: 'Saved' });
```

**Q：`actionResult.none()` 返回值还有 `text: null` 吗？**

A：没有。当前实现：`{ result: { resultKind: 'none' }, userMessage }`。

**Q：detector 返回值是数组还是对象？**

A：**数组**：`Promise<PluginDetectorArtifact[]>`。直接 `return [artifact1, artifact2]`，不要 `return { artifacts: [...] }`。未命中返回 `[]`。

**Q：detector 也能调 `materializeImagePath` 吗？**

A：可以。但 detector 的超时较短（3 秒级），大图拷贝可能超时，请酌情使用。

**Q：`input.content.payload.text` 还存在吗？**

A：不存在。`content` 的字段**平铺**在顶层：`content.text`（text）/`content.{width,height,format,bytes}`（image）/`content.entries`（path_reference）。

**Q：`PluginPathEntry` 还存在吗？**

A：是。`{kind: 'file' | 'folder', path: string, displayName: string}`，导出自生成的 `data.generated.ts`。被废弃的是无前缀的便利别名 `PathEntry`。

**Q：临时目录什么时候清理？**

A：invocation 结束后宿主同步删除。宿主启动时还会扫描 1 小时以上的遗留目录兜底清理。

**Q：handler key 拼错了会怎样？**

A：宿主无法寻址该 capability，调用静默失败或宿主侧报"未注册"。务必保证 `manifest.json` 的 `id` 与 `definePlugin({...})` 中 registry 的 key **完全一致**。

**Q：怎么给 capability/host event 加新能力？**

A：见 [`sdk/SPECIFICATION.md`](./sdk/SPECIFICATION.md) 第 3 章。简而言之：改 `protocol/plugin/src/catalog.ts` → 跑 `npm run codegen` → 在宿主端实现新方法 → 添测试。SDK 表面由 codegen 自动暴露。

---

## 10. 完整对照表

要查具体某个 capability / host event / 类型的精确形状（payload、response、wire path、context），请直接看 [`sdk/API.md`](./sdk/API.md)——它是从 `protocol/plugin/src/catalog.ts` 由 codegen 直出，**保证与代码一致**。本 GUIDE 描述模式与约定，API.md 描述每个符号。
