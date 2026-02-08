/**
 * Generates a dirt/floor isometric tileset PNG for the game.
 * Output: public/assets/dirt-tileset.png (512×128, 8×4 tiles of 64×32).
 * Run: node scripts/generate-dirt-tileset.mjs
 */

import { Jimp } from "jimp";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const ISO_TILE_WIDTH = 64;
const ISO_TILE_HEIGHT = 32;
const COLS = 8;
const ROWS = 4;
const W = COLS * ISO_TILE_WIDTH;
const H = ROWS * ISO_TILE_HEIGHT;

/** Dirt / earth palette (hex) */
const COLORS = [
  0xc4a574, 0xb8956b, 0xa88462, 0x9a7358, 0xd4b88a, 0xc9a97a, 0xbe9a6e,
  0xb38b64, 0x8b6b4a, 0x7d5f42, 0x6f533a, 0x614732, 0xa07d52, 0x93704a,
  0x866344, 0x79563e,
];

/** Opaque color 0xAARRGGBB (alpha=0xff) for Jimp. */
function opaque(hex) {
  return ((0xff << 24) | (hex & 0xffffff)) >>> 0;
}

/** Darken/lighten; returns opaque 0xAARRGGBB. */
function shift(hex, dr, dg, db) {
  const r = Math.max(0, Math.min(255, ((hex >> 16) & 0xff) + dr));
  const g = Math.max(0, Math.min(255, ((hex >> 8) & 0xff) + dg));
  const b = Math.max(0, Math.min(255, (hex & 0xff) + db));
  return ((0xff << 24) | (r << 16) | (g << 8) | b) >>> 0;
}

/** Deterministic pseudo-random in [0, 1) from integer seed. */
function hash(n) {
  let h = (n >>> 0) * 2654435761;
  return (h >>> 0) / 4294967296;
}

/** Small dark spots (pebbles) and grain for dirt detail. */
function detailColor(baseHex, tileIdx, px, py, ox, oy) {
  const seed = (tileIdx * 7919 + (px - ox) * 31 + (py - oy)) >>> 0;
  const h = hash(seed);
  const h2 = hash(seed + 1);
  const h3 = hash(seed + 2);
  // Grain: slight random darken/lighten per pixel
  const grain = Math.floor((h - 0.5) * 24);
  let c = shift(baseHex, grain, grain, grain);
  // Occasional darker spots (pebbles / small cracks)
  if (h2 < 0.12) c = shift(baseHex, -40, -35, -30);
  else if (h2 < 0.18) c = shift(baseHex, -22, -18, -15);
  // Occasional lighter speck
  else if (h3 < 0.06) c = shift(baseHex, 18, 14, 10);
  return c;
}

/** True if (px, py) is inside the flat isometric diamond for the cell at (ox, oy). */
function insideDiamond(px, py, ox, oy) {
  const cx = ox + ISO_TILE_WIDTH / 2;
  const midY = oy + ISO_TILE_HEIGHT / 2;
  const right = ox + ISO_TILE_WIDTH;
  const bottom = oy + ISO_TILE_HEIGHT;
  // Four edges (clockwise): top->right, right->bottom, bottom->left, left->top. Inside when all cross >= 0.
  const cross = (ax, ay, bx, by, x, y) => (bx - ax) * (y - ay) - (by - ay) * (x - ax);
  const c1 = cross(cx, oy, right, midY, px, py) >= 0;
  const c2 = cross(right, midY, cx, bottom, px, py) >= 0;
  const c3 = cross(cx, bottom, ox, midY, px, py) >= 0;
  const c4 = cross(ox, midY, cx, oy, px, py) >= 0;
  return c1 && c2 && c3 && c4;
}

/** True if (px, py) lies on the diamond boundary (for outline), 1px. */
function onDiamondEdge(px, py, ox, oy) {
  if (!insideDiamond(px, py, ox, oy)) return false;
  const cx = ox + ISO_TILE_WIDTH / 2;
  const midY = oy + ISO_TILE_HEIGHT / 2;
  const right = ox + ISO_TILE_WIDTH;
  const bottom = oy + ISO_TILE_HEIGHT;
  const dist = (ax, ay, bx, by, x, y) => {
    const segLen = Math.hypot(bx - ax, by - ay);
    if (segLen === 0) return Math.hypot(x - ax, y - ay);
    const t = Math.max(0, Math.min(1, ((x - ax) * (bx - ax) + (y - ay) * (by - ay)) / (segLen * segLen)));
    const projX = ax + t * (bx - ax);
    const projY = ay + t * (by - ay);
    return Math.hypot(x - projX, y - projY);
  };
  const d1 = dist(cx, oy, right, midY, px, py);
  const d2 = dist(right, midY, cx, bottom, px, py);
  const d3 = dist(cx, bottom, ox, midY, px, py);
  const d4 = dist(ox, midY, cx, oy, px, py);
  return Math.min(d1, d2, d3, d4) <= 1.5;
}

async function main() {
  const image = new Jimp({ width: W, height: H });
  const bgOpaque = opaque(COLORS[0]);

  // Fill entire image with opaque background (no transparency)
  for (let py = 0; py < H; py++) {
    for (let px = 0; px < W; px++) {
      image.setPixelColor(bgOpaque, px, py);
    }
  }

  for (let row = 0; row < ROWS; row++) {
    for (let col = 0; col < COLS; col++) {
      const tileIdx = row * COLS + col;
      const idx = tileIdx % COLORS.length;
      const color = COLORS[idx];
      const ox = col * ISO_TILE_WIDTH;
      const oy = row * ISO_TILE_HEIGHT;
      const strokeColor = shift(color, -28, -22, -18);

      for (let dy = 0; dy < ISO_TILE_HEIGHT; dy++) {
        for (let dx = 0; dx < ISO_TILE_WIDTH; dx++) {
          const px = ox + dx;
          const py = oy + dy;
          if (insideDiamond(px, py, ox, oy)) {
            const isEdge = onDiamondEdge(px, py, ox, oy);
            const pixelColor = isEdge ? strokeColor : detailColor(color, tileIdx, px, py, ox, oy);
            image.setPixelColor(pixelColor, px, py);
          }
          // Else: keep opaque background (no transparency in tile cell)
        }
      }
    }
  }

  const outDir = path.join(__dirname, "..", "public", "assets");
  const outPath = path.join(outDir, "dirt-tileset.png");
  fs.mkdirSync(outDir, { recursive: true });
  await image.write(outPath);
  console.log("Wrote", outPath);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
