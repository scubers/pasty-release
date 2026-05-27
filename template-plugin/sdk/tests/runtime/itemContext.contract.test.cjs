// Pasty - Copyright (c) 2026. MIT License.
// Contract lock: ItemContext triple present on all five handler input types.
// Reads ctx.d.ts text directly so the test catches type regressions before
// any runtime code is reached.

"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const sdkRoot = path.resolve(__dirname, "..", "..");
const ctxDts = fs.readFileSync(
  path.resolve(sdkRoot, "dist/runtime/types/ctx.d.ts"),
  "utf8"
);

/**
 * Extract the set of top-level field names declared in a TypeScript interface
 * body. Uses balanced-brace scanning so inline `{ ... }` object types don't
 * confuse the boundary detection.
 */
function fieldsOf(dtsText, interfaceName) {
  // Find the opening `interface Name ... {`
  const startRe = new RegExp(`interface ${interfaceName}[^{]*\\{`, "g");
  const startMatch = startRe.exec(dtsText);
  if (!startMatch) return null;

  // Collect the balanced interface body
  let depth = 1;
  let i = startMatch.index + startMatch[0].length;
  const bodyParts = [];
  while (i < dtsText.length && depth > 0) {
    const ch = dtsText[i];
    if (ch === "{") { depth++; bodyParts.push(ch); }
    else if (ch === "}") { depth--; if (depth > 0) bodyParts.push(ch); }
    else { bodyParts.push(ch); }
    i++;
  }
  const body = bodyParts.join("");

  // Extract names that appear at top-level (no surrounding braces)
  const names = new Set();
  const lineRe = /^ {4}(\w+)\??[\s:(]/gm;
  let m;
  while ((m = lineRe.exec(body)) !== null) {
    const before = body.slice(0, m.index);
    const depth0 = (before.match(/\{/g) || []).length === (before.match(/\}/g) || []).length;
    if (depth0) names.add(m[1]);
  }
  return names;
}

// ─── ItemContext itself ───────────────────────────────────────────────────────

test("ItemContext declares exactly {item, content, attachments}", () => {
  const fields = fieldsOf(ctxDts, "ItemContext");
  assert.ok(fields, "ItemContext must be declared in ctx.d.ts");
  assert.deepEqual(
    [...fields].sort(),
    ["attachments", "content", "item"],
    "ItemContext must have exactly item, content, attachments"
  );
});

// ─── Five handler input types must all extend ItemContext ─────────────────────

test("DetectorInput extends ItemContext with no own fields", () => {
  assert.ok(ctxDts.includes("DetectorInput extends ItemContext"), "DetectorInput must extend ItemContext");
  const ownFields = fieldsOf(ctxDts, "DetectorInput");
  assert.ok(ownFields !== null, "DetectorInput must be declared");
  assert.equal(ownFields.size, 0, "DetectorInput must add no own fields beyond ItemContext");
});

test("ResolveAttachmentInput extends ItemContext and adds {attachment, declaredActions}", () => {
  assert.ok(ctxDts.includes("ResolveAttachmentInput extends ItemContext"), "ResolveAttachmentInput must extend ItemContext");
  const fields = fieldsOf(ctxDts, "ResolveAttachmentInput");
  assert.ok(fields, "ResolveAttachmentInput must be declared");
  assert.ok(fields.has("attachment"), "must have attachment");
  assert.ok(fields.has("declaredActions"), "must have declaredActions");
});

test("AttachmentOperationInput is not present in ctx.d.ts (removed with invokeOperation)", () => {
  assert.ok(
    !ctxDts.includes("AttachmentOperationInput"),
    "AttachmentOperationInput must be removed after invokeOperation was deleted from AttachmentRendererHandler"
  );
});

test("ActionSessionResolveInput extends ItemContext and adds {action}", () => {
  assert.ok(ctxDts.includes("ActionSessionResolveInput extends ItemContext"), "ActionSessionResolveInput must extend ItemContext");
  const fields = fieldsOf(ctxDts, "ActionSessionResolveInput");
  assert.ok(fields, "ActionSessionResolveInput must be declared");
  assert.ok(fields.has("action"), "must have action");
});

test("ActionRunInput extends ItemContext and adds {actionID, draft, buttonID}", () => {
  assert.ok(ctxDts.includes("ActionRunInput extends ItemContext"), "ActionRunInput must extend ItemContext");
  const fields = fieldsOf(ctxDts, "ActionRunInput");
  assert.ok(fields, "ActionRunInput must be declared");
  assert.ok(fields.has("actionID"), "must have actionID");
  assert.ok(fields.has("draft"), "must have draft");
  assert.ok(fields.has("buttonID"), "must have buttonID");
  assert.ok(!fields.has("text"), "ActionRunInput must not carry legacy text field");
});

// ─── HostClient verb surface (generated) ─────────────────────────────────────

const hostClientsDts = fs.readFileSync(
  path.resolve(sdkRoot, "dist/generated/hostClients.generated.d.ts"),
  "utf8"
);

test("HostClient.item declares materializeImagePath and readAttachment", () => {
  const fields = fieldsOf(hostClientsDts, "HostClient");
  assert.ok(fields, "HostClient must be declared in hostClients.generated.d.ts");
  assert.ok(fields.has("item"), "HostClient must have item namespace");
  assert.ok(
    hostClientsDts.includes("materializeImagePath"),
    "HostClient must declare item.materializeImagePath"
  );
  assert.ok(
    hostClientsDts.includes("readAttachment"),
    "HostClient must declare item.readAttachment"
  );
});

test("HostClient.action declares allocateImageTempPath", () => {
  const fields = fieldsOf(hostClientsDts, "HostClient");
  assert.ok(fields, "HostClient must be declared in hostClients.generated.d.ts");
  assert.ok(fields.has("action"), "HostClient must have action namespace");
  assert.ok(
    hostClientsDts.includes("allocateImageTempPath"),
    "HostClient must declare action.allocateImageTempPath"
  );
});

// ─── AttachmentResolveResult shouldDisplay field ──────────────────────────────

test("AttachmentResolveResult declares optional shouldDisplay boolean", () => {
  const fields = fieldsOf(ctxDts, "AttachmentResolveResult");
  assert.ok(fields, "AttachmentResolveResult must be declared in ctx.d.ts");
  assert.ok(fields.has("shouldDisplay"), "AttachmentResolveResult must declare shouldDisplay");
});

test("AttachmentRendererHandler does not declare invokeOperation", () => {
  const fields = fieldsOf(ctxDts, "AttachmentRendererHandler");
  assert.ok(fields, "AttachmentRendererHandler must be declared");
  assert.ok(!fields.has("invokeOperation"), "AttachmentRendererHandler must not declare invokeOperation");
  assert.ok(fields.has("resolveAttachment"), "AttachmentRendererHandler must declare resolveAttachment");
});

test("ActionResolveResult.buttons is optional (no longer required)", () => {
  // Verify by checking the d.ts text contains 'buttons?' (optional) not 'buttons:' (required)
  // The fieldsOf function strips the '?' from names, so we check the raw text
  const resolveResultMatch = ctxDts.match(/interface ActionResolveResult[^{]*\{([^}]+)\}/s);
  assert.ok(resolveResultMatch, "ActionResolveResult must be in ctx.d.ts");
  const body = resolveResultMatch[1];
  assert.ok(body.includes("buttons?"), "ActionResolveResult.buttons must be optional (buttons?)");
  assert.ok(!body.match(/^\s+buttons:/m), "ActionResolveResult.buttons must not be required");
});

// ─── ClipboardItem must not have legacy text field ───────────────────────────

test("ClipboardItem in data.d.ts does not expose text field", () => {
  const dataDts = fs.readFileSync(
    path.resolve(sdkRoot, "dist/runtime/types/data.d.ts"),
    "utf8"
  );
  const fields = fieldsOf(dataDts, "ClipboardItem");
  assert.ok(fields, "ClipboardItem must be declared");
  assert.ok(!fields.has("text"), "ClipboardItem must not expose legacy text field");
});
