'use strict';
// Doc lint: grep GUIDE.md / sdk/README.md / sdk/SPECIFICATION.md for
// forbidden strings (removed APIs) and required strings (new APIs).
// Source-grep based — no markdown parser required.
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const projectRoot = path.resolve(__dirname, '../..');

const docFiles = [
  { label: 'GUIDE.md', file: path.join(projectRoot, 'GUIDE.md') },
  { label: 'sdk/README.md', file: path.join(projectRoot, 'sdk/README.md') },
  { label: 'sdk/SPECIFICATION.md', file: path.join(projectRoot, 'sdk/SPECIFICATION.md') },
  { label: 'README.md', file: path.join(projectRoot, 'README.md') },
];

function readDocs() {
  return docFiles.map(({ label, file }) => ({
    label,
    content: fs.readFileSync(file, 'utf8'),
  }));
}

// Forbidden strings — must not appear in any doc file
const forbidden = [
  'disabledButtonIDs',
  'pasty.action.invoke',
];

// Forbidden in authoritative context: invokeOperation must not appear as a
// live API description (it may appear in deprecation notices or historical notes
// but must NOT appear as an active method signature or code example for current use).
// We check that it does not appear in code blocks as an active handler key.
const forbiddenCodePatterns = [
  'invokeOperation',
];

// Required strings — at least one doc file must contain each
const required = [
  'pasty.action.complete',
  'pasty.action.onHostInvoke',
  'shouldDisplay',
];

test('Doc files must not contain removed API: disabledButtonIDs', () => {
  const docs = readDocs();
  for (const { label, content } of docs) {
    assert.ok(
      !content.includes('disabledButtonIDs'),
      `${label}: must not contain removed field 'disabledButtonIDs'`
    );
  }
});

test('Doc files must not contain removed API: pasty.action.invoke', () => {
  const docs = readDocs();
  for (const { label, content } of docs) {
    assert.ok(
      !content.includes('pasty.action.invoke'),
      `${label}: must not contain removed verb 'pasty.action.invoke'`
    );
  }
});

test('Doc files must not describe invokeOperation as an active API', () => {
  const docs = readDocs();
  for (const { label, content } of docs) {
    // invokeOperation must not appear as a live code example or method table entry.
    // It is only acceptable in a deprecation notice that explicitly marks it removed.
    // We check that if it appears at all, it is only in a deprecation/removal context.
    const lines = content.split('\n');
    for (const line of lines) {
      if (!line.includes('invokeOperation')) continue;
      const lowerLine = line.toLowerCase();
      const isDeprecationContext =
        lowerLine.includes('removed') ||
        lowerLine.includes('deprecated') ||
        lowerLine.includes('no longer') ||
        lowerLine.includes('废弃') ||
        lowerLine.includes('移除') ||
        lowerLine.includes('不再') ||
        lowerLine.includes('已删除');
      assert.ok(
        isDeprecationContext,
        `${label}: found 'invokeOperation' in a non-deprecation context: "${line.trim()}"`
      );
    }
  }
});

test('At least one doc file contains pasty.action.complete', () => {
  const docs = readDocs();
  const found = docs.some(({ content }) => content.includes('pasty.action.complete'));
  assert.ok(found, 'Expected at least one doc file to contain "pasty.action.complete"');
});

test('At least one doc file contains pasty.action.onHostInvoke', () => {
  const docs = readDocs();
  const found = docs.some(({ content }) => content.includes('pasty.action.onHostInvoke'));
  assert.ok(found, 'Expected at least one doc file to contain "pasty.action.onHostInvoke"');
});

test('At least one doc file contains shouldDisplay', () => {
  const docs = readDocs();
  const found = docs.some(({ content }) => content.includes('shouldDisplay'));
  assert.ok(found, 'Expected at least one doc file to contain "shouldDisplay"');
});

test('At least one doc file contains pasty.attachmentRenderer.setButtons', () => {
  const docs = readDocs();
  const found = docs.some(({ content }) => content.includes('pasty.attachmentRenderer.setButtons'));
  assert.ok(found, 'Expected at least one doc file to contain "pasty.attachmentRenderer.setButtons"');
});

test('At least one doc file contains pasty.action.setButtons', () => {
  const docs = readDocs();
  const found = docs.some(({ content }) => content.includes('pasty.action.setButtons'));
  assert.ok(found, 'Expected at least one doc file to contain "pasty.action.setButtons"');
});

test('At least one doc file contains pasty.action.allocateImageTempPath', () => {
  const docs = readDocs();
  const found = docs.some(({ content }) => content.includes('pasty.action.allocateImageTempPath'));
  assert.ok(found, 'Expected at least one doc file to contain "pasty.action.allocateImageTempPath"');
});
