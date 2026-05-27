import { build } from 'esbuild';
import { execSync } from 'node:child_process';
import { mkdirSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const sdkRoot = path.resolve(__dirname, '..');

mkdirSync(path.join(sdkRoot, 'dist/runtime'), { recursive: true });
mkdirSync(path.join(sdkRoot, 'dist/ui'), { recursive: true });
mkdirSync(path.join(sdkRoot, 'dist/dom'), { recursive: true });

// Build runtime CJS
await build({
  entryPoints: [path.join(sdkRoot, 'src/runtime/index.ts')],
  outfile: path.join(sdkRoot, 'dist/runtime/index.cjs'),
  bundle: true,
  format: 'cjs',
  platform: 'node',
  target: 'node18',
});

// Build runtime ESM
await build({
  entryPoints: [path.join(sdkRoot, 'src/runtime/index.ts')],
  outfile: path.join(sdkRoot, 'dist/runtime/index.js'),
  bundle: true,
  format: 'esm',
  platform: 'node',
  target: 'node18',
});

// Build UI ESM
await build({
  entryPoints: [path.join(sdkRoot, 'src/ui/index.ts')],
  outfile: path.join(sdkRoot, 'dist/ui/index.js'),
  bundle: true,
  format: 'esm',
  platform: 'browser',
  target: 'es2022',
});

// Build UI CJS (for tests)
await build({
  entryPoints: [path.join(sdkRoot, 'src/ui/index.ts')],
  outfile: path.join(sdkRoot, 'dist/ui/index.cjs'),
  bundle: true,
  format: 'cjs',
  platform: 'browser',
  target: 'es2022',
});

// Build DOM ESM
await build({
  entryPoints: [path.join(sdkRoot, 'src/dom/index.ts')],
  outfile: path.join(sdkRoot, 'dist/dom/index.js'),
  bundle: true,
  format: 'esm',
  platform: 'browser',
  target: 'es2022',
});

// Build DOM CJS (for tests)
await build({
  entryPoints: [path.join(sdkRoot, 'src/dom/index.ts')],
  outfile: path.join(sdkRoot, 'dist/dom/index.cjs'),
  bundle: true,
  format: 'cjs',
  platform: 'browser',
  target: 'es2022',
});

// Generate .d.ts with tsc
try {
  execSync('tsc --project tsconfig.json', { cwd: sdkRoot, stdio: 'inherit' });
} catch {
  console.warn('[sdk] tsc declaration emit had warnings (non-fatal)');
}

console.log('[sdk] build complete');
