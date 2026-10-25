#!/usr/bin/env node
// Renders the app icons (a 7-hex hive on yellow) to icons/*.png and icons/icon.svg.
// No dependencies: a tiny rasterizer + PNG encoder. Output is committed.

import { writeFile, mkdir } from 'node:fs/promises';
import { deflateSync } from 'node:zlib';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const YELLOW = [0xf7, 0xda, 0x21];
const DARK = [0x12, 0x12, 0x12];
const LIGHT = [0xff, 0xff, 0xff];

// Hexes in a unit square; `scale` shrinks the hive (maskable icons need a safe zone).
function hexes(scale) {
  const w = 0.3 * scale; // hex width
  const hh = (w * Math.sqrt(3)) / 2; // hex height
  const cx = 0.5, cy = 0.5;
  const centers = [
    [cx, cy, DARK],
    [cx, cy - hh, LIGHT], [cx, cy + hh, LIGHT],
    [cx - 0.75 * w, cy - hh / 2, LIGHT], [cx + 0.75 * w, cy - hh / 2, LIGHT],
    [cx - 0.75 * w, cy + hh / 2, LIGHT], [cx + 0.75 * w, cy + hh / 2, LIGHT],
  ];
  const gap = 0.88; // shrink each hex a little so the background shows between them
  return centers.map(([x, y, color]) => ({
    color,
    pts: [0, 60, 120, 180, 240, 300].map((deg) => {
      const a = (deg * Math.PI) / 180;
      return [x + Math.cos(a) * (w / 2) * gap, y + Math.sin(a) * (w / 2) * gap];
    }),
  }));
}

function inside(pts, x, y) {
  let c = false;
  for (let i = 0, j = pts.length - 1; i < pts.length; j = i++) {
    const [xi, yi] = pts[i], [xj, yj] = pts[j];
    if ((yi > y) !== (yj > y) && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) c = !c;
  }
  return c;
}

function render(size, { scale = 1, rounded = false } = {}) {
  const shapes = hexes(scale);
  const px = Buffer.alloc(size * size * 4);
  const SS = 4;
  const radius = rounded ? 0.18 : 0;
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      let r = 0, g = 0, b = 0, a = 0;
      for (let sy = 0; sy < SS; sy++) {
        for (let sx = 0; sx < SS; sx++) {
          const u = (x + (sx + 0.5) / SS) / size, v = (y + (sy + 0.5) / SS) / size;
          if (radius) {
            const dx = Math.max(radius - u, 0, u - (1 - radius)), dy = Math.max(radius - v, 0, v - (1 - radius));
            if (dx * dx + dy * dy > radius * radius) continue;
          }
          let col = YELLOW;
          for (const s of shapes) if (inside(s.pts, u, v)) { col = s.color; break; }
          r += col[0]; g += col[1]; b += col[2]; a += 255;
        }
      }
      const n = SS * SS, i = (y * size + x) * 4;
      const cov = a / 255;
      px[i] = cov ? r / cov : 0; px[i + 1] = cov ? g / cov : 0; px[i + 2] = cov ? b / cov : 0; px[i + 3] = a / n;
    }
  }
  return encodePng(size, size, px);
}

const CRC_TABLE = Array.from({ length: 256 }, (_, n) => {
  let c = n;
  for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  return c >>> 0;
});
function crc32(buf) {
  let c = 0xffffffff;
  for (const b of buf) c = CRC_TABLE[(c ^ b) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}
function chunk(type, data) {
  const len = Buffer.alloc(4); len.writeUInt32BE(data.length);
  const td = Buffer.concat([Buffer.from(type, 'ascii'), data]);
  const crc = Buffer.alloc(4); crc.writeUInt32BE(crc32(td));
  return Buffer.concat([len, td, crc]);
}
function encodePng(w, h, rgba) {
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(w, 0); ihdr.writeUInt32BE(h, 4);
  ihdr[8] = 8; ihdr[9] = 6; ihdr[10] = 0; ihdr[11] = 0; ihdr[12] = 0;
  const raw = Buffer.alloc((w * 4 + 1) * h);
  for (let y = 0; y < h; y++) {
    raw[y * (w * 4 + 1)] = 0;
    rgba.copy(raw, y * (w * 4 + 1) + 1, y * w * 4, (y + 1) * w * 4);
  }
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', ihdr), chunk('IDAT', deflateSync(raw, { level: 9 })), chunk('IEND', Buffer.alloc(0)),
  ]);
}

function toSvg() {
  const hex = (c) => `#${c.map((v) => v.toString(16).padStart(2, '0')).join('')}`;
  const polys = hexes(1).map((s) => `<polygon fill="${hex(s.color)}" points="${s.pts.map(([x, y]) => `${(x * 100).toFixed(2)},${(y * 100).toFixed(2)}`).join(' ')}"/>`);
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><rect width="100" height="100" rx="18" fill="${hex(YELLOW)}"/>${polys.join('')}</svg>\n`;
}

const dir = path.join(ROOT, 'icons');
await mkdir(dir, { recursive: true });
await writeFile(path.join(dir, 'icon-192.png'), render(192));
await writeFile(path.join(dir, 'icon-512.png'), render(512));
await writeFile(path.join(dir, 'maskable-512.png'), render(512, { scale: 0.8 }));
await writeFile(path.join(dir, 'apple-touch-icon.png'), render(180));
await writeFile(path.join(dir, 'icon.svg'), toSvg());
console.log('Icons written to icons/');
