import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, "..");
const rendererUIPath = path.resolve(projectRoot, "dist/ui/renderers/template-renderer/index.html");
const expandedRendererUIPath = path.resolve(
  projectRoot,
  "dist/ui/renderers/template-expanded-renderer/index.html"
);
const rendererJSPath = path.resolve(projectRoot, "dist/ui/renderers/template-renderer/index.js");
const rendererCSSPath = path.resolve(projectRoot, "dist/ui/renderers/template-renderer/index.css");
const expandedRendererJSPath = path.resolve(
  projectRoot,
  "dist/ui/renderers/template-expanded-renderer/index.js"
);
const expandedRendererCSSPath = path.resolve(
  projectRoot,
  "dist/ui/renderers/template-expanded-renderer/index.css"
);
const runtimeEntryPath = path.resolve(projectRoot, "dist/plugin.cjs");

const rendererUI = await readFile(rendererUIPath, "utf8");
const expandedRendererUI = await readFile(expandedRendererUIPath, "utf8");
await readFile(rendererJSPath, "utf8");
await readFile(rendererCSSPath, "utf8");
await readFile(expandedRendererJSPath, "utf8");
await readFile(expandedRendererCSSPath, "utf8");
const runtimeEntry = await readFile(runtimeEntryPath, "utf8");

if (!rendererUI.includes("./index.js") || !rendererUI.includes("./index.css")) {
  throw new Error("renderer HTML must reference page-local built assets.");
}

if (rendererUI.includes('src="/') || rendererUI.includes('href="/')) {
  throw new Error("renderer HTML must not contain absolute local asset references.");
}

if (!expandedRendererUI.includes("./index.js") || !expandedRendererUI.includes("./index.css")) {
  throw new Error("expanded renderer HTML must reference page-local built assets.");
}

if (expandedRendererUI.includes('src="/') || expandedRendererUI.includes('href="/')) {
  throw new Error("expanded renderer HTML must not contain absolute local asset references.");
}

if (
  !runtimeEntry.includes("definePlugin") ||
  !runtimeEntry.includes("invokeOperation") ||
  !runtimeEntry.includes("template-auto-action") ||
  !runtimeEntry.includes("template-auto-action-text") ||
  !runtimeEntry.includes("template-auto-action-image") ||
  !runtimeEntry.includes("template-detector") ||
  !runtimeEntry.includes("template-renderer") ||
  !runtimeEntry.includes("template-expanded-renderer") ||
  !runtimeEntry.includes("gallery-detector") ||
  !runtimeEntry.includes("gallery-renderer-fixed") ||
  !runtimeEntry.includes("gallery-renderer-auto") ||
  !runtimeEntry.includes("gallery-renderer-bounded") ||
  !runtimeEntry.includes("gallery-auto-text") ||
  !runtimeEntry.includes("gallery-auto-image") ||
  !runtimeEntry.includes("gallery-auto-none") ||
  !runtimeEntry.includes("gallery-draft")
) {
  throw new Error("dist/plugin.cjs does not contain the required template + gallery runtime bundles.");
}

// Gallery UI bundles — each renderer + the gallery draft-action UI must have HTML + JS + CSS.
const galleryUIDirs = [
  "dist/ui/renderers/gallery-renderer-fixed",
  "dist/ui/renderers/gallery-renderer-auto",
  "dist/ui/renderers/gallery-renderer-bounded",
  "dist/ui/actions/gallery-draft",
];
for (const relativeDir of galleryUIDirs) {
  const html = await readFile(path.resolve(projectRoot, relativeDir, "index.html"), "utf8");
  await readFile(path.resolve(projectRoot, relativeDir, "index.js"), "utf8");
  await readFile(path.resolve(projectRoot, relativeDir, "index.css"), "utf8");
  if (!html.includes("./index.js") || !html.includes("./index.css")) {
    throw new Error(`${relativeDir}/index.html must reference page-local built assets.`);
  }
  if (html.includes('src="/') || html.includes('href="/')) {
    throw new Error(`${relativeDir}/index.html must not contain absolute local asset references.`);
  }
}

console.log("Build verification passed.");
