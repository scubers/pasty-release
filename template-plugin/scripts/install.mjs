import { spawn } from "node:child_process";
import { access } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, "..");

async function exists(relativePath) {
  try {
    await access(path.resolve(projectRoot, relativePath));
    return true;
  } catch {
    return false;
  }
}

async function resolveNpmExecutable() {
  const configured = process.env.PASTY_PLUGIN_NPM_PATH;
  if (configured) {
    try {
      await access(configured);
      return configured;
    } catch {
      // fall back to PATH lookup
    }
  }
  return "npm";
}

function run(command, args) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      cwd: projectRoot,
      stdio: "inherit",
      env: process.env
    });
    child.on("error", reject);
    child.on("exit", (code) => {
      if (code === 0) {
        resolve();
        return;
      }
      reject(new Error(`${command} ${args.join(" ")} failed with exit code ${code}`));
    });
  });
}

const npmExecutable = await resolveNpmExecutable();
const hasNodeModules = await exists("node_modules");
if (!hasNodeModules) {
  await run(npmExecutable, ["install"]);
}

await run(npmExecutable, ["run", "build"]);
