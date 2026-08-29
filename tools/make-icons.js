/* Renders the Neon Snake app icon to PNG with no dependencies:
   a tiny software rasteriser + Node's built-in zlib for PNG encoding.
   Draws once at high resolution, then box-downsamples to each target size. */

const fs = require('fs');
const path = require('path');
const zlib = require('zlib');

const OUT_DIR = process.argv[2] || '.';
const SUPER = 2048;                      // master render size
const TARGETS = [
  { size: 180, file: 'apple-touch-icon.png' },   // iOS home screen
  { size: 192, file: 'icon-192.png' },           // Android / PWA
  { size: 512, file: 'icon-512.png' },           // PWA splash
  { size: 32,  file: 'favicon-32.png' }
];

/* ---------- colour helpers ---------- */

const clamp01 = v => (v < 0 ? 0 : v > 1 ? 1 : v);
const mix = (a, b, t) => a + (b - a) * t;
const smoothstep = (e0, e1, x) => {
  const t = clamp01((x - e0) / (e1 - e0));
  return t * t * (3 - 2 * t);
};

/* ---------- signed distance fields (in 0..1 icon space) ---------- */

// Negative inside, positive outside.
function sdRoundRect(px, py, cx, cy, halfW, halfH, r) {
  const qx = Math.abs(px - cx) - (halfW - r);
  const qy = Math.abs(py - cy) - (halfH - r);
  const ax = Math.max(qx, 0), ay = Math.max(qy, 0);
  return Math.hypot(ax, ay) + Math.min(Math.max(qx, qy), 0) - r;
}

function sdCircle(px, py, cx, cy, r) {
  return Math.hypot(px - cx, py - cy) - r;
}

// Regular hexagon, flat-top, approximated by intersecting half-planes.
function sdHex(px, py, cx, cy, r) {
  const dx = Math.abs(px - cx), dy = Math.abs(py - cy);
  const k = Math.max(dx * 0.8660254 + dy * 0.5, dy);
  return k - r;
}

/* ---------- the icon ---------- */

// A 10x10 cell grid. The snake curves up and to the right toward the apple.
const CELL = 1 / 10;
const SNAKE = [
  [1.6, 6.4], [2.6, 6.4], [3.6, 6.4],
  [3.6, 5.4], [3.6, 4.4],
  [4.6, 4.4], [5.6, 4.4]
];
const HEAD = SNAKE[SNAKE.length - 1];
const APPLE = [7.7, 2.3];

const SNAKE_GLOW = [0.00, 0.90, 1.00];   // #00e5ff
const SNAKE_CORE = [0.72, 0.99, 1.00];
const APPLE_GLOW = [1.00, 0.18, 0.82];   // #ff2fd0
const GROUND = [0.020, 0.027, 0.051];    // #05070d

// Scale the composition up about the centre so it still reads at 60px on a
// home screen, while staying inside the squircle iOS masks the corners with.
const ZOOM = 1.18;

function shade(sx, sy) {
  const x = (sx - 0.5) / ZOOM + 0.5;
  const y = (sy - 0.5) / ZOOM + 0.5;

  // Base ground with a soft cyan bloom behind the snake.
  const bd = Math.hypot(x - 0.42, y - 0.52) / 0.42;
  const bloom = Math.exp(-(bd * bd)) * 0.16;
  let r = GROUND[0] + SNAKE_GLOW[0] * bloom;
  let g = GROUND[1] + SNAKE_GLOW[1] * bloom;
  let b = GROUND[2] + SNAKE_GLOW[2] * bloom;

  // Faint grid, so it reads as the game board even at 32px.
  const gridX = Math.abs(((x / CELL) % 1) - 0.5);
  const gridY = Math.abs(((y / CELL) % 1) - 0.5);
  const grid = (smoothstep(0.46, 0.5, gridX) + smoothstep(0.46, 0.5, gridY)) * 0.035;
  r += SNAKE_GLOW[0] * grid; g += SNAKE_GLOW[1] * grid; b += SNAKE_GLOW[2] * grid;

  const half = CELL * 0.42;
  const radius = CELL * 0.15;
  const aa = 1.2 / SUPER;

  // --- snake: glow pass, then solid body, then a brighter core ---
  let glow = 0, body = 1e9, core = 1e9;
  for (let i = 0; i < SNAKE.length; i++) {
    const cx = SNAKE[i][0] * CELL + CELL / 2;
    const cy = SNAKE[i][1] * CELL + CELL / 2;
    const d = sdRoundRect(x, y, cx, cy, half, half, radius);
    body = Math.min(body, d);
    core = Math.min(core, sdRoundRect(x, y, cx, cy, half * 0.56, half * 0.56, radius * 0.6));
    glow += Math.exp(-Math.max(d, 0) / (CELL * 0.30));
  }
  glow = clamp01(glow * 0.42);
  r += SNAKE_GLOW[0] * glow * 0.55;
  g += SNAKE_GLOW[1] * glow * 0.55;
  b += SNAKE_GLOW[2] * glow * 0.55;

  const inBody = 1 - smoothstep(-aa, aa, body);
  r = mix(r, SNAKE_GLOW[0], inBody);
  g = mix(g, SNAKE_GLOW[1], inBody);
  b = mix(b, SNAKE_GLOW[2], inBody);

  const inCore = 1 - smoothstep(-aa, aa, core);
  r = mix(r, SNAKE_CORE[0], inCore);
  g = mix(g, SNAKE_CORE[1], inCore);
  b = mix(b, SNAKE_CORE[2], inCore);

  // --- eyes on the head ---
  const hx = HEAD[0] * CELL + CELL / 2;
  const hy = HEAD[1] * CELL + CELL / 2;
  const eye = Math.min(
    sdCircle(x, y, hx + CELL * 0.16, hy - CELL * 0.15, CELL * 0.075),
    sdCircle(x, y, hx + CELL * 0.16, hy + CELL * 0.15, CELL * 0.075)
  );
  const inEye = 1 - smoothstep(-aa, aa, eye);
  r = mix(r, 0.016, inEye); g = mix(g, 0.027, inEye); b = mix(b, 0.055, inEye);

  // --- apple: glowing magenta hex with a white centre ---
  const ax = APPLE[0] * CELL + CELL / 2;
  const ay = APPLE[1] * CELL + CELL / 2;
  const dApple = sdHex(x, y, ax, ay, CELL * 0.40);
  const aGlow = clamp01(Math.exp(-Math.max(dApple, 0) / (CELL * 0.34)) * 0.95);
  r += APPLE_GLOW[0] * aGlow * 0.6;
  g += APPLE_GLOW[1] * aGlow * 0.6;
  b += APPLE_GLOW[2] * aGlow * 0.6;

  const inApple = 1 - smoothstep(-aa, aa, dApple);
  r = mix(r, APPLE_GLOW[0], inApple);
  g = mix(g, APPLE_GLOW[1], inApple);
  b = mix(b, APPLE_GLOW[2], inApple);

  const inPip = 1 - smoothstep(-aa, aa, sdCircle(x, y, ax, ay, CELL * 0.13));
  r = mix(r, 1, inPip); g = mix(g, 0.96, inPip); b = mix(b, 1, inPip);

  return [clamp01(r), clamp01(g), clamp01(b)];
}

/* ---------- render ---------- */

console.log('rendering master at ' + SUPER + 'x' + SUPER + ' ...');
const master = new Float32Array(SUPER * SUPER * 3);
for (let py = 0; py < SUPER; py++) {
  const y = (py + 0.5) / SUPER;
  for (let px = 0; px < SUPER; px++) {
    const c = shade((px + 0.5) / SUPER, y);
    const o = (py * SUPER + px) * 3;
    master[o] = c[0]; master[o + 1] = c[1]; master[o + 2] = c[2];
  }
}

function downsample(size) {
  const out = Buffer.alloc(size * size * 3);
  const block = SUPER / size;
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      let r = 0, g = 0, b = 0, n = 0;
      const y0 = Math.floor(y * block), y1 = Math.floor((y + 1) * block);
      const x0 = Math.floor(x * block), x1 = Math.floor((x + 1) * block);
      for (let sy = y0; sy < y1; sy++) {
        for (let sx = x0; sx < x1; sx++) {
          const o = (sy * SUPER + sx) * 3;
          r += master[o]; g += master[o + 1]; b += master[o + 2]; n++;
        }
      }
      const o = (y * size + x) * 3;
      // sRGB-ish gamma is already baked into the colour choices; just round.
      out[o] = Math.round(clamp01(r / n) * 255);
      out[o + 1] = Math.round(clamp01(g / n) * 255);
      out[o + 2] = Math.round(clamp01(b / n) * 255);
    }
  }
  return out;
}

/* ---------- minimal PNG encoder (truecolour, 8-bit, no alpha) ---------- */

const CRC_TABLE = (() => {
  const t = new Int32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) { c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1; }
    t[n] = c;
  }
  return t;
})();

function crc32(buf) {
  let c = 0xffffffff;
  for (let i = 0; i < buf.length; i++) { c = CRC_TABLE[(c ^ buf[i]) & 0xff] ^ (c >>> 8); }
  return (c ^ 0xffffffff) >>> 0;
}

function chunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length, 0);
  const td = Buffer.concat([Buffer.from(type, 'ascii'), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(td), 0);
  return Buffer.concat([len, td, crc]);
}

function encodePNG(rgb, size) {
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0);
  ihdr.writeUInt32BE(size, 4);
  ihdr[8] = 8;    // bit depth
  ihdr[9] = 2;    // colour type: truecolour
  ihdr[10] = 0; ihdr[11] = 0; ihdr[12] = 0;

  // One filter byte (0 = None) per scanline.
  const raw = Buffer.alloc(size * (size * 3 + 1));
  for (let y = 0; y < size; y++) {
    raw[y * (size * 3 + 1)] = 0;
    rgb.copy(raw, y * (size * 3 + 1) + 1, y * size * 3, (y + 1) * size * 3);
  }

  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', ihdr),
    chunk('IDAT', zlib.deflateSync(raw, { level: 9 })),
    chunk('IEND', Buffer.alloc(0))
  ]);
}

fs.mkdirSync(OUT_DIR, { recursive: true });
for (const t of TARGETS) {
  const png = encodePNG(downsample(t.size), t.size);
  const dest = path.join(OUT_DIR, t.file);
  fs.writeFileSync(dest, png);
  console.log('  ' + t.file + '  ' + t.size + 'x' + t.size + '  ' + png.length + ' bytes');
}
console.log('done');
