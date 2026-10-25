import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { deflateSync } from 'node:zlib';

/**
 * Draws the app icons (a 7-hexagon honeycomb on yellow) into src/static/icons/, as PNGs and an SVG.
 *
 *   npm run build:icons
 *
 * No packages needed: a tiny rasterizer and PNG encoder. The output is committed.
 */

/** Where the icons go */
const ICON_DIR = path.resolve(__dirname, '..', 'src', 'static', 'icons');

/** The background color */
const YELLOW = [0xf7, 0xda, 0x21];

/** The center hexagon's color */
const DARK = [0x12, 0x12, 0x12];

/** The outer hexagons' color */
const LIGHT = [0xff, 0xff, 0xff];

/** The CRC-32 lookup table PNG chunks need */
const CRC_TABLE = Array.from({ length: 256 }, (_, n) => {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    return c >>> 0;
});

/**
 * Works out the 7 hexagons, in a 1 x 1 square.
 *
 * @param scale - How big the honeycomb is (maskable icons need it smaller, to stay inside the safe zone)
 * @returns Each hexagon's color and corners
 */
function hexes(scale: number): { color: number[]; pts: [number, number][] }[] {
    const w = 0.3 * scale; // hexagon width, corner to corner
    const hh = (w * Math.sqrt(3)) / 2; // hexagon height
    const centers: [number, number, number[]][] = [
        [0.5, 0.5, DARK],
        [0.5, 0.5 - hh, LIGHT],
        [0.5, 0.5 + hh, LIGHT],
        [0.5 - 0.75 * w, 0.5 - hh / 2, LIGHT],
        [0.5 + 0.75 * w, 0.5 - hh / 2, LIGHT],
        [0.5 - 0.75 * w, 0.5 + hh / 2, LIGHT],
        [0.5 + 0.75 * w, 0.5 + hh / 2, LIGHT],
    ];
    const gap = 0.88; // each hexagon is shrunk a little, so the background shows between them
    return centers.map(([x, y, color]) => ({
        color,
        pts: [0, 60, 120, 180, 240, 300].map((deg): [number, number] => {
            const a = (deg * Math.PI) / 180;
            return [x + Math.cos(a) * (w / 2) * gap, y + Math.sin(a) * (w / 2) * gap];
        }),
    }));
}

/**
 * Checks whether a point is inside a polygon.
 *
 * @param pts - The polygon's corners
 * @param x - The point's x
 * @param y - The point's y
 * @returns True if it is inside
 */
function inside(pts: [number, number][], x: number, y: number): boolean {
    let c = false;
    for (let i = 0, j = pts.length - 1; i < pts.length; j = i++) {
        const [xi, yi] = pts[i];
        const [xj, yj] = pts[j];
        if (yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) c = !c;
    }
    return c;
}

/**
 * Calculates a CRC-32.
 *
 * @param buf - The bytes
 * @returns The CRC
 */
function crc32(buf: Buffer): number {
    let c = 0xffffffff;
    for (const b of buf) c = CRC_TABLE[(c ^ b) & 0xff] ^ (c >>> 8);
    return (c ^ 0xffffffff) >>> 0;
}

/**
 * Makes a PNG chunk.
 *
 * @param type - The chunk type (4 letters)
 * @param data - The chunk's data
 * @returns The chunk's bytes
 */
function chunk(type: string, data: Buffer): Buffer {
    const len = Buffer.alloc(4);
    len.writeUInt32BE(data.length);
    const td = Buffer.concat([Buffer.from(type, 'ascii'), data]);
    const crc = Buffer.alloc(4);
    crc.writeUInt32BE(crc32(td));
    return Buffer.concat([len, td, crc]);
}

/**
 * Encodes an image as a PNG.
 *
 * @param w - Width in pixels
 * @param h - Height in pixels
 * @param rgba - The pixels, 4 bytes each (red, green, blue, alpha), row by row
 * @returns The PNG file's bytes
 */
function encodePng(w: number, h: number, rgba: Buffer): Buffer {
    const ihdr = Buffer.alloc(13);
    ihdr.writeUInt32BE(w, 0);
    ihdr.writeUInt32BE(h, 4);
    ihdr[8] = 8; // bits per channel
    ihdr[9] = 6; // RGBA
    const raw = Buffer.alloc((w * 4 + 1) * h);
    for (let y = 0; y < h; y++) {
        raw[y * (w * 4 + 1)] = 0; // no filter
        rgba.copy(raw, y * (w * 4 + 1) + 1, y * w * 4, (y + 1) * w * 4);
    }
    return Buffer.concat([
        Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
        chunk('IHDR', ihdr),
        chunk('IDAT', deflateSync(raw, { level: 9 })),
        chunk('IEND', Buffer.alloc(0)),
    ]);
}

/**
 * Draws the icon (4 x 4 samples per pixel, for smooth edges).
 *
 * @param size - Width and height in pixels
 * @param scale - How big the honeycomb is
 * @returns The PNG file's bytes
 */
function render(size: number, scale = 1): Buffer {
    const shapes = hexes(scale);
    const px = Buffer.alloc(size * size * 4);
    const SS = 4;
    for (let y = 0; y < size; y++) {
        for (let x = 0; x < size; x++) {
            let r = 0;
            let g = 0;
            let b = 0;
            for (let sy = 0; sy < SS; sy++) {
                for (let sx = 0; sx < SS; sx++) {
                    const u = (x + (sx + 0.5) / SS) / size;
                    const v = (y + (sy + 0.5) / SS) / size;
                    const col = shapes.find((s) => inside(s.pts, u, v))?.color ?? YELLOW;
                    r += col[0];
                    g += col[1];
                    b += col[2];
                }
            }
            const n = SS * SS;
            const i = (y * size + x) * 4;
            px[i] = r / n;
            px[i + 1] = g / n;
            px[i + 2] = b / n;
            px[i + 3] = 255;
        }
    }
    return encodePng(size, size, px);
}

/**
 * Draws the icon as an SVG (with rounded corners, for browser tabs).
 *
 * @returns The SVG markup
 */
function toSvg(): string {
    const hex = (c: number[]): string => `#${c.map((v) => v.toString(16).padStart(2, '0')).join('')}`;
    const polys = hexes(1).map(
        (s) =>
            `<polygon fill="${hex(s.color)}" points="${s.pts.map(([x, y]) => `${(x * 100).toFixed(2)},${(y * 100).toFixed(2)}`).join(' ')}"/>`,
    );
    return (
        `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><rect width="100" height="100" rx="18" ` +
        `fill="${hex(YELLOW)}"/>${polys.join('')}</svg>\n`
    );
}

/**
 * Writes all the icons.
 */
export async function main(): Promise<void> {
    await mkdir(ICON_DIR, { recursive: true });
    await writeFile(path.join(ICON_DIR, 'icon-192.png'), render(192));
    await writeFile(path.join(ICON_DIR, 'icon-512.png'), render(512));
    await writeFile(path.join(ICON_DIR, 'maskable-512.png'), render(512, 0.8));
    await writeFile(path.join(ICON_DIR, 'apple-touch-icon.png'), render(180));
    await writeFile(path.join(ICON_DIR, 'icon.svg'), toSvg());
    console.log(`Icons written to ${ICON_DIR}`);
}
