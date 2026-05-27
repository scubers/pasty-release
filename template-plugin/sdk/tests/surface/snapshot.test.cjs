'use strict';
const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { JSDOM } = require('jsdom');

function enumerate(obj, prefix = '') {
  const lines = [];
  for (const key of Object.keys(obj).sort()) {
    const val = obj[key];
    const fullKey = prefix ? `${prefix}.${key}` : key;
    if (typeof val === 'function') {
      lines.push(`${fullKey}: function/${val.length}`);
    } else if (val && typeof val === 'object') {
      lines.push(...enumerate(val, fullKey));
    } else {
      lines.push(`${fullKey}: ${typeof val}`);
    }
  }
  return lines;
}

describe('SDK surface snapshot', () => {
  it('runtime entry exposes the locked set', () => {
    const runtime = require('../../dist/runtime/index.cjs');
    const lines = enumerate(runtime).join('\n');
    const goldenPath = path.join(__dirname, 'runtime.surface.snapshot.txt');
    if (process.env.SNAPSHOT_UPDATE) {
      fs.writeFileSync(goldenPath, lines + '\n');
      return;
    }
    const golden = fs.readFileSync(goldenPath, 'utf8').trimEnd();
    assert.equal(lines, golden, 'runtime surface drifted; run SNAPSHOT_UPDATE=1 to update');
  });

  it('ui entry exposes the locked set', () => {
    // Set up jsdom globals before requiring the ui CJS build
    Object.keys(require.cache).forEach(k => { if (k.includes('dist/ui')) delete require.cache[k]; });
    const dom = new JSDOM('', { url: 'http://localhost' });
    global.window = dom.window;
    global.document = dom.window.document;

    const ui = require('../../dist/ui/index.cjs');
    const lines = enumerate(ui).join('\n');
    const goldenPath = path.join(__dirname, 'ui.surface.snapshot.txt');
    if (process.env.SNAPSHOT_UPDATE) {
      fs.writeFileSync(goldenPath, lines + '\n');
      return;
    }
    const golden = fs.readFileSync(goldenPath, 'utf8').trimEnd();
    assert.equal(lines, golden, 'ui surface drifted; run SNAPSHOT_UPDATE=1 to update');
  });
});
