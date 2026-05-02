import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, "..");
const rendererUIPath = path.resolve(projectRoot, "dist/ui/renderers/template-renderer/index.html");
const actionUIPath = path.resolve(projectRoot, "dist/ui/actions/template-draft-action/index.html");
const rendererJSPath = path.resolve(projectRoot, "dist/ui/renderers/template-renderer/index.js");
const rendererCSSPath = path.resolve(projectRoot, "dist/ui/renderers/template-renderer/index.css");
const actionJSPath = path.resolve(projectRoot, "dist/ui/actions/template-draft-action/index.js");
const actionCSSPath = path.resolve(projectRoot, "dist/ui/actions/template-draft-action/index.css");
const runtimeEntryPath = path.resolve(projectRoot, "dist/runtime/index.cjs");

const rendererUI = await readFile(rendererUIPath, "utf8");
const actionUI = await readFile(actionUIPath, "utf8");
await readFile(rendererJSPath, "utf8");
await readFile(rendererCSSPath, "utf8");
await readFile(actionJSPath, "utf8");
await readFile(actionCSSPath, "utf8");
const runtimeEntry = await readFile(runtimeEntryPath, "utf8");

if (!rendererUI.includes("./index.js") || !rendererUI.includes("./index.css")) {
  throw new Error("renderer HTML must reference page-local built assets.");
}

if (rendererUI.includes('src="/') || rendererUI.includes('href="/')) {
  throw new Error("renderer HTML must not contain absolute local asset references.");
}

if (!actionUI.includes("./index.js") || !actionUI.includes("./index.css")) {
  throw new Error("action HTML must reference page-local built assets.");
}

if (
  !runtimeEntry.includes("definePlugin") ||
  !runtimeEntry.includes("invokeOperation") ||
  !runtimeEntry.includes("template-draft-action") ||
  !runtimeEntry.includes("template-auto-action") ||
  !runtimeEntry.includes("template-detector") ||
  !runtimeEntry.includes("template-renderer")
) {
  throw new Error("dist/runtime/index.cjs does not contain the required template runtime bundles.");
}

console.log("Build verification passed.");
