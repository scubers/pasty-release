// Zero-dependency solid-color PNG encoder.
//
// Used by the capability-gallery demo to prove the `pasty-asset://` rendering
// path end-to-end: Node generates an image, registers it via
// `host.asset.registerImage`, and the WebView displays the returned token URL.
//
// We hand-roll the encoder (CRC32 table + zlib deflate) rather than pull in
// `pngjs`/`sharp` — the template plugin's only runtime dependency is `vue`, and
// the build target is node18 (which lacks `zlib.crc32`, added in v22).

import { deflateSync } from "node:zlib";

// Precomputed CRC32 lookup table (IEEE 802.3 polynomial 0xEDB88320).
const CRC_TABLE: Uint32Array = (() => {
  const table = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) {
      c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    }
    table[n] = c >>> 0;
  }
  return table;
})();

function crc32(buf: Buffer): number {
  let c = 0xffffffff;
  for (let i = 0; i < buf.length; i++) {
    c = CRC_TABLE[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  }
  return (c ^ 0xffffffff) >>> 0;
}

// A PNG chunk: length (BE) + type + data + CRC32(type+data) (BE).
function chunk(type: string, data: Buffer): Buffer {
  const length = Buffer.alloc(4);
  length.writeUInt32BE(data.length, 0);
  const body = Buffer.concat([Buffer.from(type, "ascii"), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(body), 0);
  return Buffer.concat([length, body, crc]);
}

/**
 * Encode a `width`×`height` solid-color image as an 8-bit truecolor PNG.
 * `rgb` channels are masked to a byte; non-positive dimensions throw.
 */
export function solidColorPng(
  width: number,
  height: number,
  rgb: [number, number, number],
): Buffer {
  if (!Number.isInteger(width) || !Number.isInteger(height) || width <= 0 || height <= 0) {
    throw new Error(`solidColorPng: invalid dimensions ${width}x${height}`);
  }

  const signature = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);

  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr.writeUInt8(8, 8); // bit depth
  ihdr.writeUInt8(2, 9); // color type 2 = truecolor (RGB)
  ihdr.writeUInt8(0, 10); // compression method
  ihdr.writeUInt8(0, 11); // filter method
  ihdr.writeUInt8(0, 12); // interlace method

  // Raw image: each scanline is a filter byte (0 = none) followed by RGB
  // triples for every pixel.
  const [r, g, b] = rgb;
  const rowLength = 1 + width * 3;
  const raw = Buffer.alloc(rowLength * height);
  for (let y = 0; y < height; y++) {
    const rowStart = y * rowLength;
    raw[rowStart] = 0x00; // filter: none
    for (let x = 0; x < width; x++) {
      const px = rowStart + 1 + x * 3;
      raw[px] = r & 0xff;
      raw[px + 1] = g & 0xff;
      raw[px + 2] = b & 0xff;
    }
  }

  return Buffer.concat([
    signature,
    chunk("IHDR", ihdr),
    chunk("IDAT", deflateSync(raw)),
    chunk("IEND", Buffer.alloc(0)),
  ]);
}
