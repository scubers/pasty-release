const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const projectRoot = path.resolve(__dirname, "..", "..");
const manifestPath = path.resolve(projectRoot, "manifest.json");

function loadManifest() {
  return JSON.parse(fs.readFileSync(manifestPath, "utf8"));
}

test("manifest registers template detector, renderer, and actions", () => {
  const manifest = loadManifest();

  assert.equal(manifest.plugin.id, "plugin.template.full");
  assert.equal(manifest.detectors.length, 1);
  assert.equal(manifest.attachmentRenderers.length, 1);
  assert.equal(manifest.actions.length, 2);

  const detector = manifest.detectors.find((entry) => entry.id === "template-detector");
  assert.ok(detector, "expected template-detector to be declared in manifest");
  assert.deepEqual(detector.supportedInputKinds, ["text", "image", "path_reference"]);
  assert.deepEqual(detector.attachmentTypes, ["plugin.template.full.preview"]);

  const renderer = manifest.attachmentRenderers.find((entry) => entry.id === "template-renderer");
  assert.ok(renderer, "expected template-renderer to be declared in manifest");
  assert.equal(renderer.attachmentType, "plugin.template.full.preview");
  assert.equal(renderer.uiEntry, "renderers/template-renderer/index.html");

  const autoAction = manifest.actions.find((entry) => entry.id === "template-auto-action");
  assert.ok(autoAction, "expected template-auto-action to be declared in manifest");
  assert.equal(autoAction.lifecycle, "auto-run");
  assert.deepEqual(autoAction.supportedItemTypes, ["text", "image", "path_reference"]);

  const draftAction = manifest.actions.find((entry) => entry.id === "template-draft-action");
  assert.ok(draftAction, "expected template-draft-action to be declared in manifest");
  assert.equal(draftAction.lifecycle, "draft");
  assert.deepEqual(draftAction.supportedItemTypes, ["text", "image", "path_reference"]);
  assert.equal(draftAction.uiEntry, "actions/template-draft-action/index.html");
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
  const pluginDefinition = require(path.resolve(projectRoot, "src/runtime/index.js"));
  const runtime = pluginDefinition.setup({});

  assert.ok(runtime.detectors["template-detector"], "expected template-detector runtime handler");
  assert.ok(
    runtime.attachmentRenderers["template-renderer"],
    "expected template-renderer runtime handler"
  );
  assert.ok(runtime.actions["template-auto-action"], "expected template-auto-action runtime handler");
  assert.ok(
    runtime.actions["template-draft-action"],
    "expected template-draft-action runtime handler"
  );
});

test("template source files exist in runtime and ui trees", () => {
  const requiredPaths = [
    "src/runtime/shared/templateCapabilityMetadata.js",
    "src/runtime/shared/templateAttachmentPayload.js",
    "src/runtime/detectors/templateDetector.js",
    "src/runtime/renderers/templateRenderer.js",
    "src/runtime/actions/templateAutoAction.js",
    "src/runtime/actions/templateDraftAction.js",
    "src/ui/AttachmentTemplateApp.vue",
    "src/ui/DraftActionTemplateApp.vue",
    "src/ui/preview/PreviewShellApp.vue",
    "src/ui/preview/preview-host/main.js",
    "src/ui/preview/preview-host/index.html",
    "src/ui/preview/scenarios/attachmentScenarios.js",
    "src/ui/preview/scenarios/actionScenarios.js",
    "src/ui/renderers/template-renderer/index.html",
    "src/ui/renderers/template-renderer/main.js",
    "src/ui/actions/template-draft-action/index.html",
    "src/ui/actions/template-draft-action/main.js"
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
    path.resolve(projectRoot, "src/ui/preview/PreviewShellApp.vue"),
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
  const { detectTemplateAttachment } = require(path.resolve(
    projectRoot,
    "src/runtime/detectors/templateDetector.js"
  ));

  const artifacts = await detectTemplateAttachment({
    content: {
      kind: "text",
      payload: {
        text: "Template plugin headline\nSecond line\nThird line"
      }
    }
  });

  assert.equal(artifacts.length, 1);
  assert.equal(artifacts[0].attachmentType, "plugin.template.full.preview");
  assert.equal(artifacts[0].searchProjection.scope, "template_preview");

  const payload = JSON.parse(artifacts[0].payloadJson);
  assert.equal(payload.kind, "template_preview");
  assert.equal(payload.contentKind, "text");
  assert.equal(payload.display.typeLabel, "Text");
  assert.equal(payload.display.headline, "Template plugin headline");
  assert.equal(payload.display.facts[0].value, "3");
  assert.equal(payload.display.facts[1].value, "47");
});

test("template detector emits compact payloads for image and path-reference input", async () => {
  const { detectTemplateAttachment } = require(path.resolve(
    projectRoot,
    "src/runtime/detectors/templateDetector.js"
  ));

  const imageArtifacts = await detectTemplateAttachment({
    item: {
      id: "image-item",
      type: "image",
      text: null,
      tags: [],
      sourceAppID: "preview.app"
    },
    content: {
      kind: "image",
      payload: {
        dataBase64: Buffer.from("image-bytes").toString("base64"),
        width: 320,
        height: 200,
        format: "png"
      }
    }
  });
  assert.equal(imageArtifacts.length, 1);
  assert.equal(JSON.parse(imageArtifacts[0].payloadJson).display.typeLabel, "Image");

  const pathArtifacts = await detectTemplateAttachment({
    item: {
      id: "path-item",
      type: "path_reference",
      text: null,
      tags: [],
      sourceAppID: "finder"
    },
    content: {
      kind: "path_reference",
      payload: {
        entries: [
          { kind: "file", path: "/tmp/report.txt", displayName: "report.txt" },
          { kind: "folder", path: "/tmp/archive", displayName: "archive" }
        ]
      }
    }
  });
  assert.equal(pathArtifacts.length, 1);
  assert.equal(JSON.parse(pathArtifacts[0].payloadJson).display.typeLabel, "Path");
});

test("template detector manifest and runtime reject legacy pathReference spelling", async () => {
  const manifest = loadManifest();
  const detector = manifest.detectors.find((entry) => entry.id === "template-detector");

  assert.ok(detector, "expected template-detector to be declared in manifest");
  assert.equal(detector.supportedInputKinds.includes("pathReference"), false);

  const { detectTemplateAttachment } = require(path.resolve(
    projectRoot,
    "src/runtime/detectors/templateDetector.js"
  ));

  await assert.rejects(
    () =>
      detectTemplateAttachment({
        item: {
          id: "path-item",
          type: "path_reference",
          text: null,
          tags: [],
          sourceAppID: "finder"
        },
        content: {
          kind: "pathReference",
          payload: {
            entries: [
              { kind: "file", path: "/tmp/report.txt", displayName: "report.txt" }
            ]
          }
        }
      }),
    /path_reference/
  );
});

test("template renderer resolves buttons and copies payload json", async () => {
  const { resolveAttachment, invokeOperation } = require(path.resolve(
    projectRoot,
    "src/runtime/renderers/templateRenderer.js"
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
  const attachment = { payloadJson };
  const resolved = resolveAttachment({ attachment });

  assert.equal(resolved.displayName, "Template Preview · Template plugin headline");
  assert.deepEqual(
    resolved.buttons.map((entry) => entry.id),
    ["copy-payload-json", "copy-renderer-context"]
  );

  let copiedText = null;
  const output = await invokeOperation(
    {
      attachment,
      buttonID: "copy-payload-json"
    },
    {
      host: {
        clipboard: {
          async copyText(value) {
            copiedText = value;
          }
        }
      }
    }
  );

  assert.equal(output.success, true);
  assert.equal(output.userMessage, "Template payload copied");
  assert.match(copiedText, /"kind": "template_preview"/);
});

test("template draft action applies tags and pin state", async () => {
  const { createTemplateDraftAction } = require(path.resolve(
    projectRoot,
    "src/runtime/actions/templateDraftAction.js"
  ));

  const action = createTemplateDraftAction();
  const session = await action.resolveSession({
    item: {
      text: "Draft action example",
      tags: ["existing"]
    }
  });

  assert.deepEqual(
    session.buttons.map((entry) => entry.id),
    ["copy-item-json", "copy-session-json", "copy-draft-json", "apply-metadata"]
  );
  assert.equal(session.initialDraft.templateTag, "template-plugin");

  let appliedTags = null;
  let pinnedValue = null;

  const result = await action.invokeOperation(
    {
      item: {
        text: "Draft action example",
        tags: ["existing"]
      },
      draft: {
        templateTag: "release-note",
        shouldPin: true
      },
      buttonID: "apply-metadata"
    },
    {
      host: {
        capabilities: {
          canSetTags: true,
          canSetPinned: true
        },
        item: {
          async setTags(nextTags) {
            appliedTags = nextTags;
          },
          async setPinned(nextPinned) {
            pinnedValue = nextPinned;
          }
        }
      }
    }
  );

  assert.equal(result.result.resultKind, "none");
  assert.equal(result.userMessage, "Template metadata applied and pinned");
  assert.deepEqual(appliedTags, ["existing", "template-plugin", "release-note"]);
  assert.equal(pinnedValue, true);
});

test("template auto action returns copyable metadata for non-text items", async () => {
  const { createTemplateAutoAction } = require(path.resolve(
    projectRoot,
    "src/runtime/actions/templateAutoAction.js"
  ));

  const action = createTemplateAutoAction();
  const result = await action.invokeOperation(
    {
      item: {
        id: "image-item",
        type: "image",
        text: null,
        tags: ["asset"],
        sourceAppID: "preview.app"
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
