import { build } from "vite";
import { cp, rm, readdir, stat } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import vue from "@vitejs/plugin-vue";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, "..");
const featuresDir = path.resolve(projectRoot, "src/features");
const uiOutputRoot = path.resolve(projectRoot, "dist/ui");

function pascalCase(slug) {
  return slug.split("-").map(p => p.charAt(0).toUpperCase() + p.slice(1)).join("");
}

// Capability-gallery sub-features map to first-class manifest IDs that don't
// follow the simple "template-{featureName}" convention. Keep this map in
// sync with manifest.json — covered by tests/integration/galleryWiring.test.cjs.
const NESTED_OVERRIDES = {
  "capability-gallery/renderer-bounded-ui": { kind: "renderers", name: "gallery-renderer-bounded" },
  "capability-gallery/renderer-fixed-ui": { kind: "renderers", name: "gallery-renderer-fixed" },
  "capability-gallery/renderer-auto-ui": { kind: "renderers", name: "gallery-renderer-auto" },
  "capability-gallery/draft-action-ui": { kind: "actions", name: "gallery-draft" },
};

async function hasEntryFiles(dir) {
  try {
    await stat(path.join(dir, "main.ts"));
    await stat(path.join(dir, "index.html"));
    return true;
  } catch {
    return false;
  }
}

async function discoverPages() {
  const pages = [];
  const topLevel = await readdir(featuresDir, { withFileTypes: true });
  for (const dirent of topLevel) {
    if (!dirent.isDirectory()) continue;
    const featureName = dirent.name;
    const featurePath = path.join(featuresDir, featureName);

    if (await hasEntryFiles(featurePath)) {
      // Existing single-feature dir (preview-renderer / expanded-renderer / draft-action).
      let kind, name;
      if (featureName.endsWith("-renderer")) {
        kind = "renderers";
        name = featureName === "preview-renderer" ? "template-renderer" : `template-${featureName}`;
      } else {
        kind = "actions";
        name = `template-${featureName}`;
      }
      const globalName = `PastyTemplatePlugin${pascalCase(featureName)}`;
      pages.push({
        name,
        kind,
        globalName,
        entry: path.join(featurePath, "main.ts"),
        template: path.join(featurePath, "index.html"),
      });
      continue;
    }

    // Nested layout — each subdirectory with main.ts + index.html is its own UI bundle.
    const sublevel = await readdir(featurePath, { withFileTypes: true });
    for (const subDirent of sublevel) {
      if (!subDirent.isDirectory()) continue;
      const subPath = path.join(featurePath, subDirent.name);
      if (!(await hasEntryFiles(subPath))) continue;
      const key = `${featureName}/${subDirent.name}`;
      const override = NESTED_OVERRIDES[key];
      if (!override) {
        throw new Error(`Nested UI entry ${key} has no NESTED_OVERRIDES mapping in build-ui.mjs`);
      }
      const globalName = `PastyTemplatePlugin${pascalCase(featureName)}${pascalCase(subDirent.name)}`;
      pages.push({
        name: override.name,
        kind: override.kind,
        globalName,
        entry: path.join(subPath, "main.ts"),
        template: path.join(subPath, "index.html"),
      });
    }
  }
  return pages;
}

const pages = await discoverPages();

await rm(uiOutputRoot, { recursive: true, force: true });

for (const page of pages) {
  const outDir = path.resolve(uiOutputRoot, page.kind, page.name);
  await build({
    root: projectRoot,
    configFile: false,
    define: { "process.env.NODE_ENV": JSON.stringify("production") },
    plugins: [vue()],
    build: {
      lib: { entry: page.entry, name: page.globalName, formats: ["iife"], fileName: () => "index.js", cssFileName: "index" },
      outDir,
      emptyOutDir: true,
      cssCodeSplit: false,
      assetsDir: ".",
      rollupOptions: {
        output: { assetFileNames: (asset) => asset.name?.endsWith(".css") ? "index.css" : "[name][extname]" }
      }
    }
  });
  await cp(page.template, path.resolve(outDir, "index.html"));
}
