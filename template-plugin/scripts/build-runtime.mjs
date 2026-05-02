import { build } from "esbuild";
import { mkdir } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, "..");
const outputDirectory = path.resolve(projectRoot, "dist/runtime");

await mkdir(outputDirectory, { recursive: true });

await build({
  absWorkingDir: projectRoot,
  entryPoints: [path.resolve(projectRoot, "src/runtime/index.js")],
  outfile: path.resolve(outputDirectory, "index.cjs"),
  bundle: true,
  format: "cjs",
  platform: "node",
  target: "node18",
  logLevel: "info"
});
