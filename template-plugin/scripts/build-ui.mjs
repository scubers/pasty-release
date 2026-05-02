import { build } from "vite";
import { cp, rm } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import vue from "@vitejs/plugin-vue";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, "..");
const uiOutputRoot = path.resolve(projectRoot, "dist/ui");

const pages = [
  {
    name: "template-renderer",
    kind: "renderers",
    globalName: "PastyTemplatePluginRenderer",
    entry: path.resolve(projectRoot, "src/ui/renderers/template-renderer/main.js"),
    template: path.resolve(projectRoot, "src/ui/renderers/template-renderer/index.html")
  },
  {
    name: "template-draft-action",
    kind: "actions",
    globalName: "PastyTemplatePluginDraftAction",
    entry: path.resolve(projectRoot, "src/ui/actions/template-draft-action/main.js"),
    template: path.resolve(projectRoot, "src/ui/actions/template-draft-action/index.html")
  }
];

await rm(uiOutputRoot, { recursive: true, force: true });

for (const page of pages) {
  const outDir = path.resolve(uiOutputRoot, page.kind, page.name);
  await build({
    root: projectRoot,
    configFile: false,
    define: {
      "process.env.NODE_ENV": JSON.stringify("production")
    },
    plugins: [vue()],
    build: {
      lib: {
        entry: page.entry,
        name: page.globalName,
        formats: ["iife"],
        fileName: () => "index.js",
        cssFileName: "index"
      },
      outDir,
      emptyOutDir: true,
      cssCodeSplit: false,
      assetsDir: ".",
      rollupOptions: {
        output: {
          assetFileNames: (asset) => asset.name?.endsWith(".css") ? "index.css" : "[name][extname]"
        }
      }
    }
  });
  await cp(page.template, path.resolve(outDir, "index.html"));
}
