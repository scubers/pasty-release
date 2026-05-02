# 插件开发指南（v2）

## 1. 文档目标与适用范围

这份文档是当前 v2 插件协议的开发手册。

适用范围：

- 面向当前已经落地、已经可执行的 v2 插件协议。
- 面向插件作者、自动生成代码的 AI、以及需要查字段定义的开发者。
- 不要求读者了解宿主源码结构。
- 不依赖任何示例工程才能理解。

这份文档覆盖：

- `manifest.json` 的完整字段规范
- 插件可声明的三类 capability
- Node runtime 的作者接口
- 本地 UI bridge 的消息协议
- SDK helper 的用法
- 各方法的入参、返回值、字段约束
- 开发时必须遵守的限制

这份文档不覆盖：

- 宿主界面里的安装步骤
- 发布、签名、商店分发
- 云同步内部实现
- 尚未落地的未来能力

如果你要从零开始做一个插件工程，直接以当前模板工程为起点；字段、协议和能力边界说明以本指南为准。

当前模板工程默认演示的是“紧凑 metadata inspector”路线：

- detector 直接覆盖 `text`、`image`、`path_reference`
- action 直接覆盖 `text`、`image`、`path_reference`
- attachment renderer 只展示关键字段，不铺大预览
- copy 按钮默认输出完整 payload / item / session / draft JSON，方便作者观察真实输入

## 2. 插件整体模型

一个 v2 插件由三部分组成：

1. `manifest.json`
   负责静态声明插件身份、入口路径、权限和 capability 列表。
2. Node runtime
   负责 detector、attachment renderer、action 的真实业务逻辑。
3. 本地 UI 资源
   负责 attachment renderer 或 draft action 的 WebView 页面。

当前支持三类 capability：

- `detectors[]`
- `attachmentRenderers[]`
- `actions[]`

它们的职责边界如下：

- detector：读取当前 item 的内容快照，返回一个或多个 artifact。
- attachment renderer：消费 attachment，返回卡片展示状态和可执行操作。
- action：针对当前 item 执行动作，可返回结果，也可在权限允许时触发宿主 mutation。

统一约束：

- 插件协议版本固定为 `schemaVersion: 2`。
- runtime 统一通过 `definePlugin(...) + setup(init)` 暴露。
- detector 统一实现 `detect(input, ctx)`。
- attachment renderer 统一实现 `resolveAttachment(input, ctx)` 和 `invokeOperation(input, ctx)`。
- action 统一实现 `resolveSession(input, ctx)` 和 `invokeOperation(input, ctx)`。
- UI 不直接拿宿主能力；UI 只能通过 bridge 读取 session、同步 draft、触发 operation。

推荐的插件工程组织如下：

```text
my-plugin/
├── manifest.json
├── package.json
├── scripts/
│   ├── build-runtime.mjs
│   └── build-ui.mjs
├── src/
│   ├── runtime/
│   │   ├── index.js
│   │   ├── sdk/
│   │   │   ├── definePlugin.js
│   │   │   └── results/
│   │   │       ├── actionResult.js
│   │   │       └── rendererResult.js
│   │   ├── detectors/
│   │   ├── renderers/
│   │   └── actions/
│   └── ui/
│       └── sdk/
│           ├── createAttachmentBridge.js
│           └── createActionBridge.js
└── dist/
    ├── runtime/
    │   └── index.cjs
    └── ui/
```

说明：

- SDK 是插件工程自带的源码级 helper，不是宿主通过 npm 自动注入的包。
- 宿主只加载构建产物，不会替插件执行源码编译。

## 3. manifest.json 完整规范

### 3.1 顶层字段

| 字段 | 类型 | 必填 | 说明 | 允许值 / 默认值 | 备注 |
| --- | --- | --- | --- | --- | --- |
| `schemaVersion` | `number` | 是 | 插件协议版本 | 当前固定为 `2` | 不是字符串 |
| `plugin` | `object` | 是 | 插件身份信息 | 无默认值 | 必须包含 `id`、`title`、`version` |
| `install` | `object` | 否 | 安装期 hook 配置 | 缺省表示无安装脚本 | 不是 runtime API 的一部分 |
| `runtime` | `object` | 是 | runtime 与 UI 根目录 | 无默认值 | 路径相对插件根目录 |
| `permissions` | `string[]` | 否 | mutation 权限声明 | 缺省按空数组处理 | 建议显式写出 |
| `attachmentRenderers` | `object[]` | 否 | attachment renderer 列表 | 缺省按空数组处理 | 建议显式写出 |
| `detectors` | `object[]` | 否 | detector 列表 | 缺省按空数组处理 | 建议显式写出 |
| `actions` | `object[]` | 否 | top-level action 列表 | 缺省按空数组处理 | 建议显式写出 |

### 3.2 `plugin`

| 字段 | 类型 | 必填 | 说明 | 允许值 / 默认值 | 备注 |
| --- | --- | --- | --- | --- | --- |
| `plugin.id` | `string` | 是 | 插件稳定命名空间 | 不能为空 | 建议使用反向域名风格，如 `plugin.example.demo` |
| `plugin.title` | `string` | 是 | 插件显示名称 | 不能为空 | 只用于展示 |
| `plugin.version` | `string` | 是 | 插件版本号 | 不能为空 | 宿主按字符串处理 |

校验规则：

- `plugin.id` 不能为空。
- `plugin.title` 不能为空。
- 旧字段 `plugin.displayName` 不再支持。

### 3.3 `install`

`install` 是可选字段，用于声明安装期 hook。

| 字段 | 类型 | 必填 | 说明 | 允许值 / 默认值 | 备注 |
| --- | --- | --- | --- | --- | --- |
| `install.runtime` | `string` | 是 | 安装脚本运行时 | `node`、`bash` | 只用于安装期 |
| `install.entry` | `string` | 是 | 安装脚本路径 | 相对插件根目录 | 必须位于插件根目录内 |

校验规则：

- `install.entry` 必须存在。
- `install.entry` 不允许跳出插件根目录。
- `install` 只影响安装准备阶段，不影响 runtime handler 的方法签名。

### 3.4 `runtime`

| 字段 | 类型 | 必填 | 说明 | 允许值 / 默认值 | 备注 |
| --- | --- | --- | --- | --- | --- |
| `runtime.nodeEntry` | `string` | 是 | Node runtime 入口 | 相对插件根目录 | 安装完成后必须存在 |
| `runtime.uiRoot` | `string` | 是 | UI 根目录 | 相对插件根目录 | 安装完成后必须存在 |

说明：

- 宿主通过 `runtime.nodeEntry` 加载 JS runtime。
- 所有 `uiEntry` 都以 `runtime.uiRoot` 为根目录解析。

### 3.5 `permissions`

当前宿主支持的权限值如下：

| 权限值 | 说明 |
| --- | --- |
| `setAttachment` | 允许替换当前 item 的某个 attachment group |
| `setTags` | 允许修改当前 item 的 tags |
| `setPinned` | 允许修改当前 item 的 pinned 状态 |
| `setSearchExtension` | 允许替换当前 item 的某个 search-extension group |

规则：

- 未声明的 mutation capability 不会注入到 runtime host API。
- 未声明时调用这些能力，会返回 `false` 或受控失败，不能依赖。

### 3.6 `attachmentRenderers[]`

| 字段 | 类型 | 必填 | 说明 | 允许值 / 默认值 | 备注 |
| --- | --- | --- | --- | --- | --- |
| `id` | `string` | 是 | renderer 在插件内的局部 ID | 不能为空 | 同一插件内必须唯一 |
| `title` | `string` | 是 | renderer 显示名称 | 不能为空 | 用于展示 |
| `attachmentType` | `string` | 是 | 该 renderer 负责的 attachment type | 不能为空 | 通常使用插件命名空间前缀 |
| `height` | `number` | 否 | WebView 卡片固定高度 | 正整数 | 不支持 `auto` |
| `uiEntry` | `string` | 否 | 本地 HTML 页面入口 | 相对 `runtime.uiRoot` | 声明后文件必须存在 |

规则：

- `id` 同一插件内必须唯一。
- `title` 不能为空。
- `height` 如果声明，必须是正整数。
- 旧字段 `displayName`、`defaultEnabled`、`defaultOrderKey`、`actions` 不再支持。
- renderer 的按钮不在 manifest 中声明，而是由 `resolveAttachment(...)` 返回。

### 3.7 `detectors[]`

| 字段 | 类型 | 必填 | 说明 | 允许值 / 默认值 | 备注 |
| --- | --- | --- | --- | --- | --- |
| `id` | `string` | 是 | detector 在插件内的局部 ID | 不能为空 | 同一插件内必须唯一 |
| `title` | `string` | 是 | detector 显示名称 | 不能为空 | 用于展示 |
| `supportedInputKinds` | `string[]` | 是 | detector 支持的输入类型 | `text`、`image`、`path_reference` | 不允许空数组 |
| `attachmentTypes` | `string[]` | 是 | detector 可能产出的 attachment type 列表 | 至少 1 项 | 每项都必须可渲染 |

规则：

- `supportedInputKinds` 不允许为空。
- `attachmentTypes` 不允许为空。
- `attachmentTypes` 中每个值都必须以 `plugin.id + "."` 为前缀。
- `attachmentTypes` 中每个值都必须能在 `attachmentRenderers[]` 中找到对应 renderer。
- 旧字段 `capabilityID`、`defaultEnabled`、`timeoutMs` 不再支持。

### 3.8 `actions[]`

| 字段 | 类型 | 必填 | 说明 | 允许值 / 默认值 | 备注 |
| --- | --- | --- | --- | --- | --- |
| `id` | `string` | 是 | action 在插件内的局部 ID | 不能为空 | 同一插件内必须唯一 |
| `title` | `string` | 是 | action 显示名称 | 不能为空 | 用于展示 |
| `supportedItemTypes` | `string[]` | 是 | action 支持的 item type | `text`、`image`、`path_reference` | 不允许空数组 |
| `lifecycle` | `string` | 是 | action 生命周期 | `auto-run`、`draft` | 作者侧枚举 |
| `keywords` | `string[]` | 否 | 搜索关键词 | 缺省按空数组处理 | 用于 action catalog 搜索 |
| `uiEntry` | `string` | 否 | draft action 的本地 HTML 入口 | 相对 `runtime.uiRoot` | 声明后文件必须存在 |

规则：

- `supportedItemTypes` 不允许为空。
- `lifecycle` 当前只支持 `auto-run` 和 `draft`。
- `auto-run` 是作者侧写法，宿主内部会映射到自动执行的 workspace lifecycle。
- 旧字段 `displayName`、`actionID`、`defaultEnabled`、`defaultOrderKey`、`revealButtons` 不再支持。
- action 按钮不在 manifest 中声明，而是由 `resolveSession(...)` 返回。

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
  "permissions": ["setTags", "setPinned"],
  "attachmentRenderers": [
    {
      "id": "sample-renderer",
      "title": "Sample Renderer",
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
      "id": "sample-action",
      "title": "Sample Action",
      "supportedItemTypes": ["text"],
      "lifecycle": "draft",
      "keywords": ["sample"],
      "uiEntry": "actions/sample/index.html"
    }
  ]
}
```

## 4. API Reference

### 4.1 通用约定

| 项目 | 说明 |
| --- | --- |
| 字段大小写 | 所有字段名区分大小写 |
| JSON 风格 | 所有 runtime 输入输出都使用普通 JSON 兼容对象 |
| `payloadJson` | 永远是 JSON 字符串，不是对象 |
| `PluginJSONValue` | draft、params 等结构化值可使用 `string`、`bool`、`int`、`double`、`array`、`object`、`null` |
| 触发来源 | `buttonID` 表示业务按钮；`triggerSource` 表示调用来源 |
| UI 权限 | UI bridge 不暴露宿主 mutation API |

### 4.2 插件入口 API

#### `definePlugin(definition)`

```js
const { definePlugin } = require("./sdk/definePlugin");

module.exports = definePlugin({
  setup(init) {
    return {
      attachmentRenderers: {},
      detectors: {},
      actions: {}
    };
  }
});
```

| 字段 | 类型 | 必填 | 说明 | 允许值 / 默认值 | 备注 |
| --- | --- | --- | --- | --- | --- |
| `definition.setup` | `function` | 是 | 插件唯一初始化入口 | 无默认值 | 缺失会抛错 |
| `setup(init)` 返回值 | `object` | 是 | capability registry | 缺省可返回空对象 | 宿主只从这里取 handler |
| `return.attachmentRenderers` | `object` | 否 | renderer registry | 缺省按空对象处理 | key 必须与 manifest `attachmentRenderers[].id` 对齐 |
| `return.detectors` | `object` | 否 | detector registry | 缺省按空对象处理 | key 必须与 manifest `detectors[].id` 对齐 |
| `return.actions` | `object` | 否 | action registry | 缺省按空对象处理 | key 必须与 manifest `actions[].id` 对齐 |

说明：

- registry key 和 manifest 中的 `id` 不一致时，宿主无法正确寻址该 capability。
- runtime 多返回但 manifest 未声明的 capability，不应依赖宿主去调用。

#### `setup(init)` 的 `init` 对象

| 字段 | 类型 | 必填 | 说明 | 允许值 / 默认值 | 备注 |
| --- | --- | --- | --- | --- | --- |
| `init.plugin.id` | `string` | 是 | 当前插件 ID | 无默认值 | 来自 manifest |
| `init.plugin.title` | `string` | 是 | 当前插件标题 | 无默认值 | 来自 manifest |
| `init.plugin.version` | `string` | 是 | 当前插件版本 | 无默认值 | 来自 manifest |
| `init.manifest.permissions` | `string[]` | 是 | 当前插件声明的权限列表 | 缺省为空数组 | 摘要信息 |
| `init.manifest.attachmentRenderers` | `object[]` | 是 | renderer 摘要 | 每项仅包含 `id`、`title` | 不是完整 manifest |
| `init.manifest.detectors` | `object[]` | 是 | detector 摘要 | 每项仅包含 `id`、`title` | 不是完整 manifest |
| `init.manifest.actions` | `object[]` | 是 | action 摘要 | 每项仅包含 `id`、`title` | 不是完整 manifest |
| `init.host.platform` | `string` | 是 | 宿主平台 | 当前为 `macos` | 只读 |
| `init.host.hostVersion` | `string` | 是 | 宿主版本号 | 无默认值 | 只读 |
| `init.host.devMode` | `boolean` | 是 | 是否开发模式 | `true` / `false` | 只读 |

`init` 不包含：

- `item`
- `attachment`
- `draft`
- `buttonID`
- `triggerSource`

这些都属于 request-scoped 数据，只会在具体 handler 调用时出现。

### 4.3 Detector Runtime API

#### `async detect(input, ctx)`

当前 detector 的输入对象：

| 字段 | 类型 | 必填 | 说明 | 允许值 / 默认值 | 备注 |
| --- | --- | --- | --- | --- | --- |
| `input.item.id` | `string` | 是 | 当前历史项 ID | 无默认值 | 由宿主提供 |
| `input.item.type` | `string` | 是 | 当前 item 类型 | 例如 `text`、`image`、`path_reference` | 由宿主提供 |
| `input.item.text` | `string \| null` | 否 | 当前 item 的文本快照 | 文本 item 通常有值 | 非文本 item 可为 `null` |
| `input.item.tags` | `string[]` | 是 | 当前 item tags | 缺省为空数组 | 只读 |
| `input.item.sourceAppID` | `string` | 是 | 来源应用标识 | 缺省可为空字符串 | 只读 |
| `input.content.kind` | `string` | 是 | 当前 detector 命中的内容类型 | `text`、`image`、`path_reference` | 必须与 manifest 对齐 |
| `input.content.payload` | `object` | 是 | 当前内容 payload | 随 `kind` 变化 | 见下表 |

`input.content.payload` 取值：

| `kind` | payload 字段 |
| --- | --- |
| `text` | `{ text: string }` |
| `image` | `{ dataBase64: string, width: number, height: number, format: string }` |
| `path_reference` | `{ entries: ClipboardPathReferenceEntry[] }` |

返回值对象：

```js
return {
  artifacts: [
    {
      attachmentType: "plugin.example.sample.card",
      attachmentKey: "sample-card-1",
      payloadJson: "{\"kind\":\"sample_card\"}",
      searchProjection: {
        scope: "sample",
        searchText: "hello world",
        label: "Sample"
      },
      attachmentSyncScope: "syncable",
      createdAtMs: null,
      updatedAtMs: null
    }
  ]
};
```

| 字段 | 类型 | 必填 | 说明 | 允许值 / 默认值 | 备注 |
| --- | --- | --- | --- | --- | --- |
| `artifacts` | `object[]` | 是 | detector 产出的 artifact 列表 | 未命中时返回空数组 | 不直接写宿主存储 |
| `artifacts[].attachmentType` | `string` | 是 | attachment 类型 | 必须已在 manifest 声明 | 且必须能被 renderer 渲染 |
| `artifacts[].attachmentKey` | `string` | 是 | attachment 稳定 key | 不允许空字符串 | 用于 group replace / upsert |
| `artifacts[].payloadJson` | `string` | 是 | attachment payload 的 JSON 字符串 | 必须是 JSON 对象字符串 | 不能是数组或原始值 |
| `artifacts[].searchProjection` | `object \| null` | 否 | 可选搜索投影 | 缺省为 `null` | 见下表 |
| `artifacts[].attachmentSyncScope` | `string` | 是 | attachment 同步范围 | `syncable`、`local_only` | 其他值会被丢弃 |
| `artifacts[].createdAtMs` | `number \| null` | 否 | 可选创建时间 | 缺省为 `null` | 毫秒时间戳 |
| `artifacts[].updatedAtMs` | `number \| null` | 否 | 可选更新时间 | 缺省为 `null` | 毫秒时间戳 |

`searchProjection` 字段：

| 字段 | 类型 | 必填 | 说明 | 允许值 / 默认值 | 备注 |
| --- | --- | --- | --- | --- | --- |
| `scope` | `string` | 是 | 搜索 scope | 会被宿主转小写 | 不允许为空，不允许包含 `:` |
| `searchText` | `string` | 是 | 搜索文本 | 去除首尾空白后不能为空 | 进入搜索扩展 |
| `label` | `string \| null` | 否 | 可选标签 | 缺省为 `null` | 用于展示上下文 |

`ctx` 对象：

| 字段 | 类型 | 必填 | 说明 | 允许值 / 默认值 | 备注 |
| --- | --- | --- | --- | --- | --- |
| `ctx.request.id` | `string` | 是 | 当前请求 ID | 无默认值 | 只读 |
| `ctx.plugin.id` | `string` | 是 | 当前插件 ID | 无默认值 | 只读 |
| `ctx.capability` | `object \| null` | 否 | 当前 capability 描述 | 可能为 `null` | 不建议依赖具体 shape |
| `ctx.host` | `object` | 是 | 宿主能力入口 | detector 模式禁用 mutation | 只读 |
| `ctx.log.info` | `function` | 是 | 信息日志 | 无默认值 | 仅用于调试 |
| `ctx.log.warn` | `function` | 是 | 警告日志 | 无默认值 | 仅用于调试 |
| `ctx.log.error` | `function` | 是 | 错误日志 | 无默认值 | 仅用于调试 |

detector 模式的关键限制：

- detector 必须“返回 artifact”，而不是直接写 attachment。
- detector 不能依赖 `ctx.host.item.setTags(...)`、`setPinned(...)`、`setAttachments(...)`、`setSearchExtension(...)`。
- 宿主会校验 `attachmentType`、`attachmentKey`、`payloadJson` 和 `attachmentSyncScope`；非法 artifact 会被丢弃。

### 4.4 Attachment Renderer Runtime API

#### `async resolveAttachment(input, ctx)`

输入对象：

| 字段 | 类型 | 必填 | 说明 | 允许值 / 默认值 | 备注 |
| --- | --- | --- | --- | --- | --- |
| `input.item.id` | `string` | 是 | 当前历史项 ID | 无默认值 | 只读 |
| `input.item.type` | `string` | 是 | 当前 item 类型 | 由宿主提供 | 只读 |
| `input.item.text` | `string \| null` | 否 | 当前 item 的文本快照 | 可能为 `null` | 只读 |
| `input.item.tags` | `string[]` | 是 | 当前 item tags | 缺省为空数组 | 只读 |
| `input.item.sourceAppID` | `string` | 是 | 来源应用标识 | 缺省可为空字符串 | 只读 |
| `input.attachment.historyID` | `string` | 是 | attachment 所属 history item ID | 无默认值 | 只读 |
| `input.attachment.owner` | `string` | 是 | attachment owner | 无默认值 | 只读 |
| `input.attachment.attachmentType` | `string` | 是 | attachment 类型 | 无默认值 | 只读 |
| `input.attachment.attachmentKey` | `string` | 是 | attachment key | 无默认值 | 只读 |
| `input.attachment.payloadJson` | `string` | 是 | attachment payload JSON 字符串 | 无默认值 | 插件自己解析 |
| `input.declaredActions` | `object[]` | 是 | 宿主提供的已声明 action 摘要 | 当前实现为 `[]` | 预留字段 |

返回值对象：

```js
return {
  displayName: "Sample Card",
  tintHex: "#2563EB",
  buttons: [
    { id: "copy-json", title: "Copy Json", isEnabled: true },
    { id: "open", title: "Open", isEnabled: true }
  ]
};
```

| 字段 | 类型 | 必填 | 说明 | 允许值 / 默认值 | 备注 |
| --- | --- | --- | --- | --- | --- |
| `displayName` | `string` | 是 | 卡片标题 | 缺省会被归一化为空字符串 | 建议始终返回 |
| `tintHex` | `string \| null` | 否 | 卡片强调色 | 例如 `#2563EB` | 缺省为 `null` |
| `buttons` | `object[]` | 是 | 当前会话的可执行按钮 | 缺省为空数组 | session truth |
| `buttons[].id` | `string` | 是 | 按钮 ID | 不允许空字符串 | 在当前 renderer 内唯一 |
| `buttons[].title` | `string` | 是 | 按钮标题 | 不允许空字符串 | 用于宿主 command strip 和 UI |
| `buttons[].isEnabled` | `boolean` | 否 | 按钮是否可用 | 缺省按 `true` | 用于禁用态 |

#### `async invokeOperation(input, ctx)`

输入对象：

| 字段 | 类型 | 必填 | 说明 | 允许值 / 默认值 | 备注 |
| --- | --- | --- | --- | --- | --- |
| `input.item` | `object` | 是 | 当前 item 快照 | 同 `resolveAttachment` | 只读 |
| `input.attachment` | `object` | 是 | 当前 attachment 快照 | 同 `resolveAttachment` | 只读 |
| `input.buttonID` | `string \| null` | 是 | 被触发的按钮 ID | 来自宿主或 UI | renderer 场景通常应非空 |
| `input.params` | `object` | 是 | UI 传入的结构化参数 | 缺省为空对象 | 值类型为 `PluginJSONValue` |
| `input.triggerSource` | `string` | 是 | 触发来源 | `hostButton`、`pluginUI` | 宿主已归一化 |

返回值对象：

| 字段 | 类型 | 必填 | 说明 | 允许值 / 默认值 | 备注 |
| --- | --- | --- | --- | --- | --- |
| `success` | `boolean` | 是 | 是否执行成功 | `true` / `false` | 宿主据此展示结果态 |
| `userMessage` | `string \| null` | 否 | 反馈消息 | 缺省为 `null` | 用于 toast 或 workspace 提示 |

源码级 helper：

```js
const { rendererResult } = require("./sdk/results/rendererResult");

rendererResult.success({ userMessage: "Done" });
rendererResult.failure("Something went wrong");
```

| helper | 参数 | 返回值 | 说明 |
| --- | --- | --- | --- |
| `rendererResult.success(options = {})` | `options.userMessage?: string \| null` | `{ success: true, userMessage }` | 成功结果 |
| `rendererResult.failure(userMessage)` | `userMessage?: string \| null` | `{ success: false, userMessage }` | 失败结果 |

### 4.5 Action Runtime API

#### `async resolveSession(input, ctx)`

`resolveSession(...)` 用于返回 draft session truth。

说明：

- `draft` lifecycle 的 action 应实现该方法。
- `auto-run` lifecycle 的 action 可以省略该方法；宿主会按空 session 处理。

输入对象：

| 字段 | 类型 | 必填 | 说明 | 允许值 / 默认值 | 备注 |
| --- | --- | --- | --- | --- | --- |
| `input.item.id` | `string` | 是 | 当前 item ID | 无默认值 | 只读 |
| `input.item.type` | `string` | 是 | 当前 item 类型 | `text`、`image`、`path_reference` | 只读 |
| `input.item.text` | `string \| null` | 否 | 当前 item 文本 | 可能为 `null` | 只读 |
| `input.item.tags` | `string[]` | 是 | 当前 item tags | 缺省为空数组 | 只读 |
| `input.item.sourceAppID` | `string` | 是 | 来源应用 ID | 缺省可为空字符串 | 只读 |
| `input.action.id` | `string` | 是 | 插件内 action 局部 ID | 无默认值 | 对应 manifest `actions[].id` |
| `input.action.actionID` | `string` | 是 | 宿主 catalog action ID | 通常为 `plugin.id + "." + action.id` | 只读 |
| `input.action.title` | `string` | 是 | 当前 action 标题 | 无默认值 | 只读 |
| `input.action.lifecycle` | `string` | 是 | action lifecycle | `auto-run`、`draft` | 只读 |
| `input.action.supportedItemTypes` | `string[]` | 是 | action 支持的 item types | 由 manifest 提供 | 只读 |
| `input.action.keywords` | `string[]` | 是 | action 关键词 | 缺省为空数组 | 只读 |
| `input.action.uiEntry` | `string \| null` | 否 | 本地 UI 入口 | 可能为 `null` | 只读 |
| `input.action.buttons` | `object[]` | 是 | 当前宿主已知按钮列表 | 初次 resolve 时通常为空数组 | 只读 |

返回值对象：

```js
return {
  displayName: "Compose Follow-up",
  buttons: [
    { id: "compose", title: "Compose", isEnabled: true }
  ],
  defaultButtonID: "compose",
  initialDraft: {
    subject: "Hello",
    note: ""
  }
};
```

| 字段 | 类型 | 必填 | 说明 | 允许值 / 默认值 | 备注 |
| --- | --- | --- | --- | --- | --- |
| `displayName` | `string \| null` | 否 | 当前会话显示名 | 缺省为 `null` | 不返回时宿主可回退到 manifest title |
| `buttons` | `object[]` | 是 | reveal buttons 列表 | 缺省为空数组 | session truth |
| `buttons[].id` | `string` | 是 | 按钮 ID | 不允许空字符串 | 在当前 action session 内唯一 |
| `buttons[].title` | `string` | 是 | 按钮标题 | 不允许空字符串 | 用于宿主 command strip 和 UI |
| `buttons[].isEnabled` | `boolean` | 否 | 按钮是否可用 | 缺省按 `true` | 用于禁用态 |
| `defaultButtonID` | `string \| null` | 否 | 默认按钮 ID | 缺省为 `null` | 建议指向一个已返回的按钮 |
| `initialDraft` | `object` | 是 | 初始 draft | 缺省为空对象 | 值类型为 `PluginJSONValue` |

#### `async invokeOperation(input, ctx)`

输入对象：

| 字段 | 类型 | 必填 | 说明 | 允许值 / 默认值 | 备注 |
| --- | --- | --- | --- | --- | --- |
| `input.item` | `object` | 是 | 当前 item 快照 | 同 `resolveSession` | 只读 |
| `input.draft` | `object` | 是 | 当前 draft 全量快照 | 缺省为空对象 | 值类型为 `PluginJSONValue` |
| `input.buttonID` | `string \| null` | 否 | 被触发的按钮 ID | `auto-run` 时通常为 `null` | 由宿主归一化 |
| `input.triggerSource` | `string` | 是 | 触发来源 | `autoRun`、`hostButton`、`pluginUI` | 与 `buttonID` 分离 |

注意：

- 顶层 plugin action 只能拿到 item snapshot 与当前 draft/session 上下文。
- 它拿不到 detector 模式里的 `input.content.payload.image.dataBase64` 或 `input.content.payload.path_reference.entries`。
- 如果你想让 action UI 的 copy 按钮复制“更完整的 bootstrap/session 元数据”，需要像当前模板工程这样，把 UI 可见的 session 信息同步进 draft 或通过 UI run payload 带回 runtime。

返回值对象：

| 字段 | 类型 | 必填 | 说明 | 允许值 / 默认值 | 备注 |
| --- | --- | --- | --- | --- | --- |
| `result` | `object \| null` | 否 | action 结果对象 | 缺省为 `null` | 见下表 |
| `userMessage` | `string \| null` | 否 | 反馈消息 | 缺省为 `null` | 用于 workspace 或 toast 提示 |

`result` 字段：

| 字段 | 类型 | 必填 | 说明 | 允许值 / 默认值 | 备注 |
| --- | --- | --- | --- | --- | --- |
| `result.resultKind` | `string` | 是 | 结果类型 | `text`、`image`、`none` | 当前 plugin action 只支持这三种 |
| `result.text` | `string \| null` | 否 | 文本结果 | `resultKind = "text"` 时通常有值 | 其他类型可为 `null` |
| `result.imageDataBase64` | `string \| null` | 否 | 图片数据 | `resultKind = "image"` 时使用 | Base64 编码 |
| `result.imageFormatHint` | `string \| null` | 否 | 图片格式提示 | 例如 `png`、`jpeg` | `image` 结果可选 |

注意：

- 当前源码级 helper 只内置 `actionResult.text(...)` 和 `actionResult.none(...)`。
- 如果你需要 `image` 结果，可以按上表手动构造返回对象。

源码级 helper：

```js
const { actionResult } = require("./sdk/results/actionResult");

actionResult.text("hello", { userMessage: "Done" });
actionResult.none({ userMessage: "Applied metadata" });
```

| helper | 参数 | 返回值 | 说明 |
| --- | --- | --- | --- |
| `actionResult.text(value, options = {})` | `value: any`，`options.userMessage?: string \| null` | `{ result: { resultKind: "text", text: string }, userMessage }` | 生成文本结果 |
| `actionResult.none(options = {})` | `options.userMessage?: string \| null` | `{ result: { resultKind: "none", text: null }, userMessage }` | 生成无内容结果 |

### 4.6 Attachment UI Bridge API

附件渲染 UI 侧通常会使用：

```js
import { createAttachmentBridge } from "./sdk/createAttachmentBridge";

const bridge = createAttachmentBridge();
```

#### `bridge.getSession()`

返回值来自全局变量 `window.__PASTY_PLUGIN_BOOTSTRAP__`。

| 字段 | 类型 | 必填 | 说明 | 允许值 / 默认值 | 备注 |
| --- | --- | --- | --- | --- | --- |
| `pluginID` | `string` | 是 | 当前插件 ID | 无默认值 | 只读 |
| `rendererID` | `string` | 是 | 当前 renderer ID | 无默认值 | 只读 |
| `item` | `object` | 是 | 当前 item 快照 | 同 runtime item snapshot | 只读 |
| `attachment` | `object` | 是 | 当前 attachment 快照 | 同 runtime attachment snapshot | 只读 |
| `buttons` | `object[]` | 是 | 当前按钮列表 | 来自 `resolveAttachment(...)` | 只读 |

补充：

- 宿主还会触发一次 `pasty-plugin-bootstrap` 事件。
- 当前 helper 没有单独暴露 `onBootstrap(...)`，通常用 `getSession()` 读取初始快照即可。

#### `bridge.onAttachmentUpdated(callback)`

监听事件：`pasty-plugin-attachment-updated`

回调参数：

| 字段 | 类型 | 必填 | 说明 |
| --- | --- | --- | --- |
| `item` | `object` | 是 | 最新 item 快照 |
| `attachment` | `object` | 是 | 最新 attachment 快照 |

#### `bridge.onSearchUpdated(callback)`

监听事件：`pasty-plugin-search-updated`

回调参数：

| 字段 | 类型 | 必填 | 说明 |
| --- | --- | --- | --- |
| `searchTerms` | `string[]` | 是 | 当前命中的搜索词列表 |

#### `bridge.onThemeUpdated(callback)`

监听事件：`pasty-plugin-theme-updated`

回调参数：

| 字段 | 类型 | 必填 | 说明 |
| --- | --- | --- | --- |
| `accentHex` | `string \| null` | 否 | 当前主题强调色 |

#### `bridge.invokeOperation(buttonID, params = {})`

发送消息：`window.webkit.messageHandlers.pastyPluginAction.postMessage(...)`

消息 payload：

| 字段 | 类型 | 必填 | 说明 | 备注 |
| --- | --- | --- | --- | --- |
| `actionID` | `string` | 是 | 要触发的业务按钮 ID | 会映射到 runtime 的 `input.buttonID` |
| `params` | `object` | 否 | 结构化参数 | 值类型为 `PluginJSONValue` |

### 4.7 Action UI Bridge API

Action UI 侧通常会使用：

```js
import { createActionBridge } from "./sdk/createActionBridge";

const bridge = createActionBridge();
```

#### `bridge.getSession()`

返回值来自全局变量 `window.__PASTY_PLUGIN_ACTION_BOOTSTRAP__`。

| 字段 | 类型 | 必填 | 说明 | 允许值 / 默认值 | 备注 |
| --- | --- | --- | --- | --- | --- |
| `pluginID` | `string` | 是 | 当前插件 ID | 无默认值 | 只读 |
| `actionID` | `string` | 是 | 当前宿主 action ID | 无默认值 | 只读 |
| `item` | `object` | 是 | 当前 item 快照 | 同 runtime item snapshot | 只读 |
| `action` | `object` | 是 | action descriptor | 同 `resolveSession` 输入里的 `action` | 只读 |
| `displayName` | `string \| null` | 否 | 当前显示名 | 来自 `resolveSession(...)` | 只读 |
| `draft` | `object` | 是 | 当前 draft 全量快照 | 值类型为 `PluginJSONValue` | 只读 |
| `buttons` | `object[]` | 是 | 当前按钮列表 | 来自 `resolveSession(...)` | 只读 |
| `defaultButtonID` | `string \| null` | 否 | 当前默认按钮 | 缺省为 `null` | 只读 |

#### `bridge.onBootstrap(callback)`

监听事件：`pasty-plugin-action-bootstrap`

回调参数：

- 与 `bridge.getSession()` 返回值同 shape。

#### `bridge.onDraftUpdated(callback)`

当前 helper 同样监听 `pasty-plugin-action-bootstrap`，因此它收到的是“完整 session bootstrap 刷新”，不是单独的局部 patch 事件。

这意味着：

- `onDraftUpdated(...)` 的回调参数和 `getSession()` 同 shape。
- 需要更新 draft 时，请直接用最新的完整 session 覆盖本地状态。

#### `bridge.updateDraft({ draft, disabledButtonIDs = [], defaultButtonID = null })`

发送消息：`window.webkit.messageHandlers.pastyPluginActionDraft.postMessage(...)`

消息 payload：

| 字段 | 类型 | 必填 | 说明 | 备注 |
| --- | --- | --- | --- | --- |
| `draft` | `object` | 是 | 当前 draft 全量快照 | 值类型为 `PluginJSONValue` |
| `disabledButtonIDs` | `string[]` | 否 | 当前要禁用的按钮 ID 列表 | 缺省为空数组 |
| `defaultButtonID` | `string \| null` | 否 | 当前默认按钮 ID | 缺省为 `null` |

语义：

- 这是“同步草稿状态”，不是“执行 action”。
- draft 更新采用全量替换，不是增量 patch。

#### `bridge.invokeOperation(buttonID, { draft } = {})`

发送消息：`window.webkit.messageHandlers.pastyPluginActionRun.postMessage(...)`

消息 payload：

| 字段 | 类型 | 必填 | 说明 | 备注 |
| --- | --- | --- | --- | --- |
| `buttonID` | `string \| null` | 否 | 要执行的按钮 ID | 会映射到 runtime 的 `input.buttonID` |
| `buttonTitle` | `string \| null` | 否 | 当前 helper 默认回传与 `buttonID` 相同的值 | 仅作辅助元数据 |
| `draft` | `object` | 是 | 本次执行使用的 draft 全量快照 | 值类型为 `PluginJSONValue` |

## 5. Detector 开发规范

Detector 的职责只有一件事：把当前输入内容转换成 artifact。

必须遵守：

- detector 只返回 `{ artifacts }`。
- detector 不直接执行任何宿主 mutation。
- 未命中时返回空数组，不要返回半成品 artifact。
- `payloadJson` 必须是 JSON 对象字符串。
- `attachmentType` 必须来自 manifest 已声明的 `attachmentTypes`。
- `searchProjection.scope` 会被宿主转成小写；不要依赖大小写语义。

推荐模式：

1. 先校验 `input.content.kind`。
2. 再解析 `input.content.payload`。
3. 解析失败时直接返回 `{ artifacts: [] }`。
4. 解析成功时返回一个或多个完整 artifact。

最小示例：

```js
function createSampleDetector() {
  return {
    async detect(input, ctx) {
      if (input?.content?.kind !== "text") {
        return { artifacts: [] };
      }

      const text = input.content.payload?.text || "";
      if (!text.startsWith("sample:")) {
        return { artifacts: [] };
      }

      return {
        artifacts: [
          {
            attachmentType: "plugin.example.sample.card",
            attachmentKey: "sample-card-1",
            payloadJson: JSON.stringify({ kind: "sample_card", text }),
            attachmentSyncScope: "syncable"
          }
        ]
      };
    }
  };
}
```

## 6. Attachment Renderer 开发规范

Attachment renderer 分两层：

- runtime：决定显示名、按钮和操作执行
- UI：只负责展示 attachment 内容和触发操作

必须遵守：

- renderer 通过 `attachmentType` 绑定。
- `resolveAttachment(...)` 只负责返回当前 session truth，不执行副作用。
- `invokeOperation(...)` 才执行副作用。
- `buttonID` 表示业务按钮身份；`triggerSource` 表示是宿主触发还是 UI 触发。
- 如果声明了 `uiEntry`，页面必须位于 `runtime.uiRoot` 之下。
- `height` 只能是固定正整数，不能 runtime 动态调整。

最小示例：

```js
function createSampleRenderer() {
  return {
    async resolveAttachment(input, ctx) {
      return {
        displayName: "Sample Card",
        tintHex: "#0F766E",
        buttons: [
          { id: "copy-text", title: "Copy Text", isEnabled: true }
        ]
      };
    },

    async invokeOperation(input, ctx) {
      if (input.buttonID === "copy-text") {
        await ctx.host.clipboard.copyText("sample");
        return { success: true, userMessage: "已复制" };
      }
      return { success: false, userMessage: "未知操作" };
    }
  };
}
```

## 7. Action 开发规范

Top-level plugin `actions[]` 是当前已支持、已可执行的 capability。

作者只需要理解两种 lifecycle：

- `auto-run`
- `draft`

### 7.1 `auto-run`

适合：

- 不需要用户先编辑 draft
- 选中后即可直接执行

特点：

- `resolveSession(...)` 可以省略。
- `invokeOperation(...)` 会直接执行。
- `input.buttonID` 通常为 `null`。
- `input.triggerSource` 通常为 `autoRun`。

### 7.2 `draft`

适合：

- 需要先准备表单或草稿
- 需要 reveal buttons
- 需要可选自定义 UI

特点：

- `resolveSession(...)` 负责返回 `buttons`、`defaultButtonID`、`initialDraft`。
- UI 可以通过 `updateDraft(...)` 同步草稿。
- 真正执行必须走 `invokeOperation(...)`。
- 宿主按钮触发和 UI 内触发最终都会落到同一个 runtime hook。

### 7.3 Action 结果与副作用

Action 可以做两类事情：

1. 返回结果
   - 例如文本结果、图片结果、无结果但有消息。
2. 请求宿主执行 mutation
   - 例如 `setTags`、`setPinned`、`setAttachments`、`setSearchExtension`。

但 mutation 必须满足两个条件：

- manifest 已声明对应 `permissions`
- runtime 调用的是 `ctx.host.item.*`，不是 UI 直接调用

最小示例：

```js
const { actionResult } = require("./sdk/results/actionResult");

function createSampleAction() {
  return {
    async resolveSession(input, ctx) {
      return {
        displayName: "Sample Action",
        buttons: [
          { id: "run", title: "Run", isEnabled: true }
        ],
        defaultButtonID: "run",
        initialDraft: {
          title: input.item.text || ""
        }
      };
    },

    async invokeOperation(input, ctx) {
      return actionResult.text(`Hello ${input.draft.title || ""}`, {
        userMessage: "已生成"
      });
    }
  };
}
```

## 8. 权限与宿主能力

### 8.1 默认可用能力

这些能力默认注入：

| 能力 | 方法 | 返回值 |
| --- | --- | --- |
| 剪贴板 | `ctx.host.clipboard.copyText(text)` | `Promise<boolean>` |
| 导航 | `ctx.host.navigation.openUrl(url)` | `Promise<boolean>` |
| 导航 | `ctx.host.navigation.revealInFinder(path)` | `Promise<boolean>` |
| 导航 | `ctx.host.navigation.openFilePath(path)` | `Promise<boolean>` |

### 8.2 权限门控能力

这些能力必须通过 `permissions[]` 显式声明：

| 能力 | 方法 | 需要的权限 | 返回值 |
| --- | --- | --- | --- |
| 改 tags | `ctx.host.item.setTags(tags)` | `setTags` | `Promise<boolean>` |
| 改 pinned | `ctx.host.item.setPinned(pinned)` | `setPinned` | `Promise<boolean>` |
| 改 attachment | `ctx.host.item.setAttachments({ owner, attachmentType, attachments })` | `setAttachment` | `Promise<boolean>` |
| 改搜索扩展 | `ctx.host.item.setSearchExtension({ scope, owner, entries })` | `setSearchExtension` | `Promise<boolean>` |

### 8.3 payload 字段

`ctx.host.item.setAttachments(...)`：

| 字段 | 类型 | 必填 | 说明 |
| --- | --- | --- | --- |
| `owner` | `string` | 是 | attachment owner |
| `attachmentType` | `string` | 是 | attachment 类型 |
| `attachments` | `object[]` | 是 | 要替换进去的 attachment entries |

`attachments[]`：

| 字段 | 类型 | 必填 | 说明 |
| --- | --- | --- | --- |
| `attachmentKey` | `string` | 是 | attachment key |
| `payloadJson` | `string` | 是 | payload JSON 字符串 |
| `syncScope` | `string` | 是 | `syncable` 或 `local_only` |
| `createdAtMs` | `number \| null` | 否 | 可选创建时间 |
| `updatedAtMs` | `number \| null` | 否 | 可选更新时间 |

`ctx.host.item.setSearchExtension(...)`：

| 字段 | 类型 | 必填 | 说明 |
| --- | --- | --- | --- |
| `scope` | `string` | 是 | 搜索 scope |
| `owner` | `string` | 是 | 搜索扩展 owner |
| `entries` | `object[]` | 是 | 要替换进去的搜索扩展 entries |

`entries[]`：

| 字段 | 类型 | 必填 | 说明 |
| --- | --- | --- | --- |
| `entryKey` | `string` | 是 | 搜索条目 key |
| `searchText` | `string` | 是 | 搜索文本 |
| `label` | `string \| null` | 否 | 可选标签 |
| `updatedAtMs` | `number \| null` | 否 | 可选更新时间 |

### 8.4 能力探测

当前 runtime 可通过：

- `ctx.host.capabilities.canCopyText`
- `ctx.host.capabilities.canOpenUrl`
- `ctx.host.capabilities.canRevealInFinder`
- `ctx.host.capabilities.canOpenFilePath`
- `ctx.host.capabilities.canSetAttachment`
- `ctx.host.capabilities.canSetTags`
- `ctx.host.capabilities.canSetPinned`
- `ctx.host.capabilities.canSetSearchExtension`

做显式分支。

推荐模式：

```js
if (!ctx.host.capabilities.canSetTags) {
  return actionResult.none({ userMessage: "Tag capability unavailable" });
}
```

## 9. 开发流程

推荐开发流程：

1. 先设计插件命名空间和 capability 列表。
2. 编写 `manifest.json`，把 `id`、路径、权限和 lifecycle 固定下来。
3. 在 `src/runtime/index.js` 里实现 `definePlugin(...) + setup(init)`。
4. 先写 detector / renderer / action 的最小 runtime 逻辑。
5. 如果需要 WebView 页面，再实现 `uiEntry` 对应的本地 HTML / JS。
6. 使用本地 SDK helper 对接 bridge，而不是在 UI 里手写宿主私有消息。
7. 构建产物，保证 `runtime.nodeEntry` 和 `runtime.uiRoot` 指向实际文件。
8. 对照本指南逐项自检：
   - 字段名是否全用 v2 canonical 名称
   - registry key 是否和 manifest `id` 对齐
   - `payloadJson` 是否真的是 JSON 字符串
   - 是否误把按钮写进 manifest
   - 是否误让 UI 直接调用宿主 mutation

最小构建要求：

- 必须生成 `runtime.nodeEntry`
- 必须生成 `runtime.uiRoot`
- 如果声明了 `uiEntry`，对应 HTML 文件必须存在

## 10. 限制与非目标

当前明确不支持或不应依赖的边界：

- 不支持 `schemaVersion: 2` 之外的作者协议。
- 不支持 action `immediateResult` lifecycle。
- 不支持 Bash / shell 作为 action runtime。
- 不支持把 renderer 或 action 按钮静态写进 manifest。
- 不支持 detector 直接做宿主 mutation。
- 不支持 UI 直接拿到 `ctx.host`。
- 不支持 attachment card runtime 动态高度。
- 不支持在 `attachmentSyncScope` 里使用 `syncable`、`local_only` 之外的值。
- 不支持把 `searchProjection.scope` 写成空字符串或包含 `:`。
- 不支持继续依赖 v1 / legacy 字段，例如：
  - `plugin.displayName`
  - `attachmentRenderers[].displayName`
  - `attachmentRenderers[].defaultEnabled`
  - `attachmentRenderers[].defaultOrderKey`
  - `attachmentRenderers[].actions`
  - `detectors[].capabilityID`
  - `detectors[].defaultEnabled`
  - `detectors[].timeoutMs`
  - `actions[].displayName`
  - `actions[].actionID`
  - `actions[].defaultEnabled`
  - `actions[].defaultOrderKey`
  - `actions[].revealButtons`

最常见的错误：

- 还在导出裸对象，而不是 `definePlugin(...)`。
- 还在用 `run(...)`、`onAction(...)` 之类旧 hook 名。
- 还在 manifest 里声明 action / renderer buttons。
- 假设 UI 可以直接调用 `setTags` / `setPinned`。
- 假设 detector 可以直接写 attachment 或搜索扩展。
- 在任何 item type 字段里继续使用旧拼写，或者在 detector / action 之间混用两套拼写。

如果只记住一条规则：

- runtime 负责业务逻辑和宿主能力调用；
- UI 只负责展示、同步状态和触发 operation；
- manifest 只负责静态声明。
