const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const projectRoot = path.resolve(__dirname, "..", "..");
const manifestPath = path.resolve(projectRoot, "manifest.json");

// Local helper: composite detector equivalent to createCompositeDetector() in src/plugin.ts.
// Replaces require("src/runtime/detectors/templateDetector.ts") after §5 restructure.
async function detectTemplateAttachment(input) {
  const { buildPreviewArtifact } = require(path.resolve(projectRoot, "src/features/preview-renderer/detector.ts"));
  const { buildExpandedArtifact } = require(path.resolve(projectRoot, "src/features/expanded-renderer/detector.ts"));
  const out = [];
  const a = buildPreviewArtifact(input);
  if (a) out.push(a);
  const b = buildExpandedArtifact(input);
  if (b) out.push(b);
  return out;
}

function loadManifest() {
  return JSON.parse(fs.readFileSync(manifestPath, "utf8"));
}

test("manifest registers template detector, renderer, and actions", () => {
  const manifest = loadManifest();

  assert.equal(manifest.plugin.id, "plugin.template.full");
  // template-* entries are the "minimal sample" set. The gallery (gallery-*)
  // adds its own entries; restrict these length asserts to the template- subset.
  // NOTE: template-draft-action was removed in plugin-api-shrink; the live
  // draft action is now gallery-draft under the gallery- prefix.
  const templateDetectors = manifest.detectors.filter((entry) => entry.id.startsWith("template-"));
  const templateRenderers = manifest.attachmentRenderers.filter((entry) => entry.id.startsWith("template-"));
  const templateActions = manifest.actions.filter((entry) => entry.id.startsWith("template-"));
  assert.equal(templateDetectors.length, 1);
  assert.equal(templateRenderers.length, 2);
  assert.equal(templateActions.length, 3);

  const detector = manifest.detectors.find((entry) => entry.id === "template-detector");
  assert.ok(detector, "expected template-detector to be declared in manifest");
  assert.deepEqual(detector.supportedInputKinds, ["text", "image", "path_reference"]);
  assert.deepEqual(
    detector.attachmentTypes,
    ["plugin.template.full.preview", "plugin.template.full.expanded"]
  );

  const renderer = manifest.attachmentRenderers.find((entry) => entry.id === "template-renderer");
  assert.ok(renderer, "expected template-renderer to be declared in manifest");
  assert.equal(renderer.attachmentType, "plugin.template.full.preview");
  assert.equal(renderer.uiEntry, "renderers/template-renderer/index.html");
  assert.equal(renderer.height, 220);

  const autoAction = manifest.actions.find((entry) => entry.id === "template-auto-action");
  assert.ok(autoAction, "expected template-auto-action to be declared in manifest");
  assert.equal(autoAction.lifecycle, "auto-run");
  assert.deepEqual(autoAction.supportedItemTypes, ["text", "image", "path_reference"]);

  // template-draft-action was removed in plugin-api-shrink (features/draft-action/ deleted).
  const removedDraftAction = manifest.actions.find((entry) => entry.id === "template-draft-action");
  assert.ok(!removedDraftAction, "template-draft-action must not be declared in manifest after plugin-api-shrink");
});

test("manifest declares expanded renderer with bounded auto-fit height policy", () => {
  const manifest = loadManifest();
  const expanded = manifest.attachmentRenderers.find(
    (entry) => entry.id === "template-expanded-renderer"
  );

  assert.ok(expanded, "expected template-expanded-renderer to be declared in manifest");
  assert.equal(expanded.attachmentType, "plugin.template.full.expanded");
  assert.equal(expanded.uiEntry, "renderers/template-expanded-renderer/index.html");
  assert.deepEqual(expanded.height, { min: 120, max: 480 });
});

test("package declares only the template build dependencies", () => {
  const packageJSON = JSON.parse(
    fs.readFileSync(path.resolve(projectRoot, "package.json"), "utf8")
  );

  assert.equal(packageJSON.name, "@pasty/template-plugin");
  assert.ok(packageJSON.dependencies.vue, "expected vue dependency");
  assert.ok(packageJSON.scripts.dev, "expected local preview dev script");
  assert.ok(packageJSON.scripts["dev:renderer"], "expected renderer preview dev script");
  assert.ok(packageJSON.scripts["dev:action"], "expected action preview dev script");
  assert.equal(packageJSON.dependencies.gridjs, undefined);
  assert.equal(packageJSON.dependencies.luxon, undefined);
  assert.equal(packageJSON.dependencies.yaml, undefined);
});

test("runtime setup registers template handlers", () => {
  // Build the runtime object directly from feature factories (avoids requiring
  // src/plugin.ts which has bare ESM specifiers without .ts extensions that
  // trip up node --experimental-strip-types module resolution).
  // NOTE: template-draft-action was removed in plugin-api-shrink (features/draft-action/ deleted).
  // The live draft action is gallery-draft under capability-gallery/runtime/draft-action.ts.
  const { createTemplatePreviewRenderer } = require(path.resolve(projectRoot, "src/features/preview-renderer/renderer.ts"));
  const { createTemplateExpandedRenderer } = require(path.resolve(projectRoot, "src/features/expanded-renderer/renderer.ts"));
  const { createTemplateAutoAction, createTemplateAutoActionTextOnly, createTemplateAutoActionImageOnly } = require(path.resolve(projectRoot, "src/features/auto-action/action.ts"));
  const { buildPreviewArtifact } = require(path.resolve(projectRoot, "src/features/preview-renderer/detector.ts"));
  const { buildExpandedArtifact } = require(path.resolve(projectRoot, "src/features/expanded-renderer/detector.ts"));

  const runtime = {
    detectors: { "template-detector": { detect: async (input) => { const out = []; const a = buildPreviewArtifact(input); if (a) out.push(a); const b = buildExpandedArtifact(input); if (b) out.push(b); return out; } } },
    attachmentRenderers: { "template-renderer": createTemplatePreviewRenderer(), "template-expanded-renderer": createTemplateExpandedRenderer() },
    actions: { "template-auto-action": createTemplateAutoAction(), "template-auto-action-text": createTemplateAutoActionTextOnly(), "template-auto-action-image": createTemplateAutoActionImageOnly() }
  };

  assert.ok(runtime.detectors["template-detector"], "expected template-detector runtime handler");
  assert.ok(
    runtime.attachmentRenderers["template-renderer"],
    "expected template-renderer runtime handler"
  );
  assert.ok(
    runtime.attachmentRenderers["template-expanded-renderer"],
    "expected template-expanded-renderer runtime handler"
  );
  assert.ok(runtime.actions["template-auto-action"], "expected template-auto-action runtime handler");
  assert.ok(
    runtime.actions["template-auto-action-text"],
    "expected template-auto-action-text runtime handler"
  );
  assert.ok(
    runtime.actions["template-auto-action-image"],
    "expected template-auto-action-image runtime handler"
  );
});

test("manifest declares more actions than free-tier quota to demo plugin-pro gating", () => {
  const manifest = loadManifest();
  const FREE_TIER_ACTION_QUOTA = 3;
  assert.ok(
    manifest.actions.length > FREE_TIER_ACTION_QUOTA,
    `template manifest should declare more than ${FREE_TIER_ACTION_QUOTA} actions to exercise plugin-pro gating`
  );

  const variantIDs = manifest.actions.map((entry) => entry.id);
  assert.ok(variantIDs.includes("template-auto-action-text"));
  assert.ok(variantIDs.includes("template-auto-action-image"));
});

test("template source files exist in runtime and ui trees", () => {
  // NOTE: src/features/draft-action/ was removed in plugin-api-shrink.
  // The draft action demo now lives in capability-gallery/runtime/draft-action.ts.
  const requiredPaths = [
    "src/shared/display.ts",
    "src/shared/debug.ts",
    "src/features/preview-renderer/detector.ts",
    "src/features/preview-renderer/renderer.ts",
    "src/features/expanded-renderer/detector.ts",
    "src/features/expanded-renderer/renderer.ts",
    "src/features/auto-action/action.ts",
    "src/features/preview-renderer/app.vue",
    "src/features/expanded-renderer/app.vue",
    "src/preview/PreviewShellApp.vue",
    "src/preview/preview-host/main.ts",
    "src/preview/preview-host/index.html",
    "src/preview/scenarios/attachmentScenarios.ts",
    "src/preview/scenarios/actionScenarios.ts",
    "src/features/preview-renderer/index.html",
    "src/features/preview-renderer/main.ts",
    "src/features/expanded-renderer/index.html",
    "src/features/expanded-renderer/main.ts",
  ];

  for (const relativePath of requiredPaths) {
    assert.ok(
      fs.existsSync(path.resolve(projectRoot, relativePath)),
      `expected ${relativePath} to exist`
    );
  }
});

test("preview workbench uses resizable host viewport instead of fixed shell sizes", () => {
  const previewShellSource = fs.readFileSync(
    path.resolve(projectRoot, "src/preview/PreviewShellApp.vue"),
    "utf8"
  );

  assert.equal(
    previewShellSource.includes('height: "320px"'),
    false,
    "expected renderer preview height to stop using a fixed 320px shell"
  );
  assert.equal(
    previewShellSource.includes('width: "350px"'),
    false,
    "expected action preview width to stop using a fixed 350px shell"
  );
  assert.equal(
    previewShellSource.includes('height: "250px"'),
    false,
    "expected action preview height to stop using a fixed 250px shell"
  );
  assert.equal(
    previewShellSource.includes("Responsive height 320"),
    false,
    "expected static renderer size label to be removed"
  );
  assert.equal(
    previewShellSource.includes("Fixed size 350 × 250"),
    false,
    "expected static action size label to be removed"
  );
  assert.match(
    previewShellSource,
    /host-frame__viewport|viewportStyle|startResize/,
    "expected preview shell to implement a resizable viewport"
  );
  assert.match(
    previewShellSource,
    /host-frame__chrome|Host resize/,
    "expected resize affordance to be presented as host chrome"
  );
  const viewportStart = previewShellSource.indexOf('<div class="host-frame__viewport"');
  const viewportEnd = previewShellSource.indexOf("</div>", viewportStart);
  const chromeStart = previewShellSource.indexOf('<div class="host-frame__chrome">');
  const handleStart = previewShellSource.indexOf('class="host-frame__resize-handle"');

  assert.notEqual(viewportStart, -1, "expected preview shell viewport markup");
  assert.notEqual(chromeStart, -1, "expected host chrome wrapper markup");
  assert.notEqual(handleStart, -1, "expected resize handle markup");
  assert.ok(
    chromeStart > viewportEnd,
    "expected host chrome to be rendered after the plugin content viewport"
  );
  assert.ok(
    handleStart > chromeStart,
    "expected resize handle to live inside host chrome instead of plugin content"
  );
});

test("template detector emits preview attachment for text input", async () => {

  const artifacts = await detectTemplateAttachment({
    content: {
      kind: "text",
      text: "Template plugin headline\nSecond line\nThird line"
    }
  });

  assert.equal(artifacts.length, 2);
  const compact = artifacts.find(
    (artifact) => artifact.attachmentType === "plugin.template.full.preview"
  );
  assert.ok(compact, "expected compact preview artifact");
  assert.equal(compact.searchProjection.scope, "template_preview");

  const payload = JSON.parse(compact.payloadJson);
  assert.equal(payload.kind, "template_preview");
  assert.equal(payload.contentKind, "text");
  assert.equal(payload.display.typeLabel, "Text");
  assert.equal(payload.display.headline, "Template plugin headline");
  assert.equal(payload.display.facts[0].value, "3");
  assert.equal(payload.display.facts[1].value, "47");
});

test("template detector emits compact payloads for image and path-reference input", async () => {

  const imageArtifacts = await detectTemplateAttachment({
    item: {
      id: "image-item",
      type: "image",
      tags: [],
      sourceAppID: "preview.app"
    },
    content: {
      kind: "image",
      bytes: 11,
      width: 320,
      height: 200,
      format: "png"
    }
  });
  assert.equal(imageArtifacts.length, 2);
  const imageCompact = imageArtifacts.find(
    (artifact) => artifact.attachmentType === "plugin.template.full.preview"
  );
  assert.ok(imageCompact, "expected compact image artifact");
  assert.equal(JSON.parse(imageCompact.payloadJson).display.typeLabel, "Image");

  const pathArtifacts = await detectTemplateAttachment({
    item: {
      id: "path-item",
      type: "path_reference",
      tags: [],
      sourceAppID: "finder"
    },
    content: {
      kind: "path_reference",
      entries: [
        { kind: "file", path: "/tmp/report.txt", displayName: "report.txt" },
        { kind: "folder", path: "/tmp/archive", displayName: "archive" }
      ]
    }
  });
  assert.equal(pathArtifacts.length, 2);
  const pathCompact = pathArtifacts.find(
    (artifact) => artifact.attachmentType === "plugin.template.full.preview"
  );
  assert.ok(pathCompact, "expected compact path artifact");
  assert.equal(JSON.parse(pathCompact.payloadJson).display.typeLabel, "Path");
});

test("template detector emits both compact and expanded artifacts per input", async () => {

  const artifacts = await detectTemplateAttachment({
    item: {
      id: "text-item",
      type: "text",
      tags: ["template-plugin", "expanded-demo"],
      sourceAppID: "com.preview.editor"
    },
    content: {
      kind: "text",
      text: "Expanded preview demo\nSecond line"
    }
  });

  assert.equal(artifacts.length, 2);
  const compact = artifacts.find(
    (artifact) => artifact.attachmentType === "plugin.template.full.preview"
  );
  const expanded = artifacts.find(
    (artifact) => artifact.attachmentType === "plugin.template.full.expanded"
  );
  assert.ok(compact, "expected compact artifact");
  assert.ok(expanded, "expected expanded artifact");

  assert.equal(compact.attachmentKey, "primary");
  assert.equal(expanded.attachmentKey, "expanded");

  const expandedPayload = JSON.parse(expanded.payloadJson);
  assert.equal(expandedPayload.kind, "template_expanded");
  assert.equal(expandedPayload.extended.contentKind, "text");
  assert.deepEqual(expandedPayload.extended.tags, ["template-plugin", "expanded-demo"]);
  assert.equal(expanded.searchProjection.scope, "template_expanded");
});

test("template detector manifest and runtime reject legacy pathReference spelling", async () => {
  const manifest = loadManifest();
  const detector = manifest.detectors.find((entry) => entry.id === "template-detector");

  assert.ok(detector, "expected template-detector to be declared in manifest");
  assert.equal(detector.supportedInputKinds.includes("pathReference"), false);

  await assert.rejects(
    () =>
      detectTemplateAttachment({
        item: {
          id: "path-item",
          type: "path_reference",
          tags: [],
          sourceAppID: "finder"
        },
        content: {
          kind: "pathReference",
          entries: [
            { kind: "file", path: "/tmp/report.txt", displayName: "report.txt" }
          ]
        }
      }),
    /path_reference/
  );
});

test("template renderer only exposes resolveAttachment — no invokeOperation", () => {
  const { createTemplatePreviewRenderer } = require(path.resolve(
    projectRoot,
    "src/features/preview-renderer/renderer.ts"
  ));
  const renderer = createTemplatePreviewRenderer();
  assert.equal(typeof renderer.resolveAttachment, "function", "expected resolveAttachment method");
  assert.equal(renderer.invokeOperation, undefined, "expected no invokeOperation on renderer");
});

test("template renderer resolveAttachment returns shouldDisplay: false for unparseable payload", () => {
  const { resolveAttachment } = require(path.resolve(
    projectRoot,
    "src/features/preview-renderer/renderer.ts"
  ));

  const result = resolveAttachment({ attachment: { payloadJson: "not-json" } });
  assert.equal(result.shouldDisplay, false, "expected shouldDisplay: false for invalid payload");
});

test("template renderer resolveAttachment returns display info for valid payload", () => {
  const { resolveAttachment } = require(path.resolve(
    projectRoot,
    "src/features/preview-renderer/renderer.ts"
  ));

  const payloadJson = JSON.stringify({
    kind: "template_preview",
    version: 2,
    contentKind: "text",
    display: {
      typeLabel: "Text",
      headline: "Template plugin headline",
      subheadline: "Second line",
      facts: [
        { label: "Lines", value: "2" },
        { label: "Chars", value: "36" }
      ]
    }
  });

  const result = resolveAttachment({ attachment: { payloadJson } });
  // displayName is fixed; headline is surfaced in the Vue component, not in the runtime result.
  assert.equal(result.displayName, "Template Preview");
  // Runtime returns no seed buttons; UI's setButtons() is the sole source of buttons.
  assert.ok(!result.buttons || result.buttons.length === 0, "runtime renderer must not return seed buttons");
  assert.equal(result.shouldDisplay, undefined, "shouldDisplay omitted means true by default");
});

test("template expanded renderer only exposes resolveAttachment — no invokeOperation", () => {
  const { createTemplateExpandedRenderer } = require(path.resolve(
    projectRoot,
    "src/features/expanded-renderer/renderer.ts"
  ));
  const renderer = createTemplateExpandedRenderer();
  assert.equal(typeof renderer.resolveAttachment, "function", "expected resolveAttachment method");
  assert.equal(renderer.invokeOperation, undefined, "expected no invokeOperation on expanded renderer");
});

test("template expanded renderer resolveAttachment returns display info for valid payload", () => {
  const { resolveAttachment } = require(path.resolve(
    projectRoot,
    "src/features/expanded-renderer/renderer.ts"
  ));

  const expandedPayload = {
    kind: "template_expanded",
    version: 1,
    contentKind: "text",
    display: {
      typeLabel: "Text",
      headline: "Expanded headline",
      subheadline: "Expanded subheadline",
      facts: []
    },
    extended: { contentKind: "text", sourceAppID: "preview.app", tags: [], text: "" },
    debug: {}
  };
  const result = resolveAttachment({ attachment: { payloadJson: JSON.stringify(expandedPayload) } });
  // displayName is fixed; headline is surfaced in the Vue component, not in the runtime result.
  assert.equal(result.displayName, "Template Expanded");
  assert.equal(result.tintHex, "#2563EB");
  // Runtime returns no seed buttons; UI's setButtons() is the sole source of buttons.
  assert.ok(!result.buttons || result.buttons.length === 0, "runtime renderer must not return seed buttons");
});

// template-draft-action and its feature directory (src/features/draft-action/)
// were removed in plugin-api-shrink. The draft action demo is now gallery-draft
// in src/features/capability-gallery/runtime/draft-action.ts.
// Verify the old path does NOT exist (regression guard against accidental re-introduction).
test("src/features/draft-action/ must not exist after plugin-api-shrink removal", () => {
  const fs = require("node:fs");
  const draftActionDir = path.resolve(projectRoot, "src/features/draft-action");
  assert.ok(
    !fs.existsSync(draftActionDir),
    "src/features/draft-action/ must not exist — it was removed in plugin-api-shrink"
  );
});

test("template auto-run action exposes runAutoAction + stub resolveSession, no legacy invokeOperation", () => {
  // Post plugin-api-shrink (R13 strict handler), PluginAutoRunActionHandler
  // requires BOTH `resolveSession` and `runAutoAction`. Auto-run lifecycle
  // actions provide a minimal resolveSession stub the host never reads.
  // The legacy `invokeOperation` key remains explicitly forbidden — the
  // runtime SDK `validateRegistry` still throws on it (kept as a regression
  // guard against pre-rename plugin shapes).
  const { createTemplateAutoAction } = require(path.resolve(
    projectRoot,
    "src/features/auto-action/action.ts"
  ));
  const action = createTemplateAutoAction();
  assert.equal(typeof action.runAutoAction, "function", "expected runAutoAction method");
  assert.equal(typeof action.resolveSession, "function", "expected resolveSession method (R13 strict handler)");
  assert.equal(action.invokeOperation, undefined, "expected no legacy invokeOperation on auto-run action");
});

test("template auto action runAutoAction returns copyable metadata for non-text items", async () => {
  const { createTemplateAutoAction } = require(path.resolve(
    projectRoot,
    "src/features/auto-action/action.ts"
  ));

  const action = createTemplateAutoAction();
  const result = await action.runAutoAction(
    {
      item: {
        id: "image-item",
        type: "image",
        tags: ["asset"],
        sourceAppID: "preview.app"
      },
      content: {
        kind: "image",
        bytes: 0, width: 0, height: 0, format: "png"
      },
      draft: {},
      buttonID: null,
      triggerSource: "autoRun"
    },
    {
      request: { id: "request-1" },
      plugin: { id: "plugin.template.full" },
      capability: { id: "template-auto-action" },
      host: { capabilities: {} }
    }
  );

  assert.equal(result.result.resultKind, "text");
  assert.match(result.result.text, /Template Auto Action/);
  assert.match(result.result.text, /Image: Image item/);
  assert.match(result.result.text, /"triggerSource": "autoRun"/);
});

test("expanded renderer Vue uses attachAutoFit bounds matching manifest height", () => {
  const manifest = loadManifest();
  const expanded = manifest.attachmentRenderers.find(
    (entry) => entry.id === "template-expanded-renderer"
  );
  assert.ok(expanded, "expected expanded renderer in manifest");

  const vueSource = fs.readFileSync(
    path.resolve(projectRoot, "src/features/expanded-renderer/app.vue"),
    "utf8"
  );

  const minMatch = vueSource.match(/autoFit\(\s*\{[^}]*min:\s*(\d+)/);
  const maxMatch = vueSource.match(/autoFit\(\s*\{[^}]*max:\s*(\d+)/);
  assert.ok(minMatch && maxMatch, "expected autoFit({ min, max }) call");
  assert.equal(Number(minMatch[1]), expanded.height.min);
  assert.equal(Number(maxMatch[1]), expanded.height.max);
});

test("attachment / expanded Vue files use pasty CSS tokens instead of raw hex", () => {
  // Note: src/features/draft-action/app.vue was removed in plugin-api-shrink.
  const filesToScan = [
    "src/features/preview-renderer/app.vue",
    "src/features/expanded-renderer/app.vue"
  ];

  const guardedHexes = [
    "#0f172a",
    "#475569",
    "#334155",
    "#64748b",
    "#f8fafc",
    "#f1f5f9",
    "#e2e8f0"
  ];

  function stripStringContent(source) {
    return source.replace(/\/\*[\s\S]*?\*\//g, "");
  }

  function extractScopedStyle(source) {
    const match = source.match(/<style scoped>([\s\S]*?)<\/style>/i);
    return match ? match[1] : "";
  }

  for (const relativePath of filesToScan) {
    const source = fs.readFileSync(path.resolve(projectRoot, relativePath), "utf8");
    const styleBlock = stripStringContent(extractScopedStyle(source));
    assert.ok(styleBlock.length > 0, `expected <style scoped> in ${relativePath}`);

    for (const hex of guardedHexes) {
      const lowercaseStyle = styleBlock.toLowerCase();
      let cursor = 0;
      while ((cursor = lowercaseStyle.indexOf(hex, cursor)) !== -1) {
        const contextStart = Math.max(0, cursor - 80);
        const context = lowercaseStyle.slice(contextStart, cursor);
        const lastVar = context.lastIndexOf("var(--pasty-");
        const lastClose = context.lastIndexOf(")");
        const insideVar = lastVar !== -1 && lastVar > lastClose;
        assert.ok(
          insideVar,
          `${relativePath}: hardcoded ${hex} must appear only as var(--pasty-..., ${hex}) fallback`
        );
        cursor += hex.length;
      }
    }
  }
});

test("no dataBase64 references in plugin runtime source files", () => {
  const srcDir = path.resolve(projectRoot, "src");
  const thisFile = __filename;

  function scanDir(dir) {
    if (!fs.existsSync(dir)) return [];
    const results = [];
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const fullPath = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        results.push(...scanDir(fullPath));
      } else if (/\.(js|ts|cjs|mjs)$/.test(entry.name)) {
        results.push(fullPath);
      }
    }
    return results;
  }

  const allFiles = scanDir(srcDir).filter((f) => f !== thisFile);
  const violations = [];

  for (const filePath of allFiles) {
    const source = fs.readFileSync(filePath, "utf8");
    const lines = source.split("\n");
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      if (line.includes("dataBase64")) {
        violations.push(`${filePath}:${i + 1}: ${line.trim()}`);
      }
    }
  }

  assert.deepEqual(
    violations,
    [],
    `Found forbidden 'dataBase64' references in plugin source:\n${violations.join("\n")}`
  );
});
