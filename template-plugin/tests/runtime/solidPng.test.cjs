const test = require("node:test");
const assert = require("node:assert/strict");
const path = require("node:path");
const zlib = require("node:zlib");

const projectRoot = path.resolve(__dirname, "..", "..");
const { solidColorPng } = require(
  path.resolve(projectRoot, "src/features/capability-gallery/runtime/solid-png.ts"),
);

const PNG_SIGNATURE = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);

test("solidColorPng emits the PNG signature", () => {
  const png = solidColorPng(4, 3, [255, 0, 0]);
  assert.ok(Buffer.isBuffer(png));
  assert.deepEqual(png.subarray(0, 8), PNG_SIGNATURE);
});

test("solidColorPng IHDR encodes the requested dimensions and RGB color type", () => {
  const png = solidColorPng(7, 5, [0, 128, 255]);
  // Layout: 8-byte signature, then IHDR chunk = 4 (length) + 4 ("IHDR") + 13 (data).
  // IHDR data begins at offset 16: width(4) height(4) bitDepth(1) colorType(1) ...
  assert.equal(png.readUInt32BE(16), 7, "IHDR width");
  assert.equal(png.readUInt32BE(20), 5, "IHDR height");
  assert.equal(png.readUInt8(24), 8, "bit depth");
  assert.equal(png.readUInt8(25), 2, "color type 2 = truecolor RGB");
});

test("solidColorPng produces a fully decodable PNG (valid chunk CRCs + IDAT scanlines)", () => {
  const width = 5;
  const height = 4;
  const rgb = [10, 200, 30];
  const png = solidColorPng(width, height, rgb);

  // Walk length-prefixed chunks: 8-byte signature, then [len(4) | type(4) | data | crc(4)]*.
  let offset = 8;
  const seen = [];
  while (offset < png.length) {
    const len = png.readUInt32BE(offset);
    const type = png.toString("ascii", offset + 4, offset + 8);
    const data = png.subarray(offset + 8, offset + 8 + len);
    const storedCrc = png.readUInt32BE(offset + 8 + len);
    // Independent cross-check of the hand-rolled CRC32 against node's zlib.crc32:
    // catches a bad CRC table / framing bug that the signature+IHDR checks miss.
    const expectedCrc = zlib.crc32(png.subarray(offset + 4, offset + 8 + len)) >>> 0;
    assert.equal(storedCrc, expectedCrc, `CRC mismatch for ${type} chunk`);
    seen.push({ type, data });
    offset += 12 + len;
  }
  assert.equal(offset, png.length, "chunk framing must consume the whole buffer exactly");
  assert.deepEqual(seen.map((c) => c.type), ["IHDR", "IDAT", "IEND"]);

  // IDAT must inflate to: per row, a filter byte (0 = none) followed by RGB triples.
  const idat = seen.find((c) => c.type === "IDAT").data;
  const raw = zlib.inflateSync(idat);
  const rowLength = 1 + width * 3;
  assert.equal(raw.length, rowLength * height, "decompressed scanline byte count");
  for (let y = 0; y < height; y++) {
    assert.equal(raw[y * rowLength], 0, "scanline filter byte must be 0 (none)");
    for (let x = 0; x < width; x++) {
      const px = y * rowLength + 1 + x * 3;
      assert.deepEqual([raw[px], raw[px + 1], raw[px + 2]], rgb, `pixel (${x},${y})`);
    }
  }
});

test("solidColorPng rejects invalid dimensions", () => {
  assert.throws(() => solidColorPng(0, 10, [0, 0, 0]));
  assert.throws(() => solidColorPng(10, -1, [0, 0, 0]));
  assert.throws(() => solidColorPng(2.5, 2, [0, 0, 0]));
});
