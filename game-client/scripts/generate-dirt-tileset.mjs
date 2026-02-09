/**
 * Generates a dirt/floor top-down tileset PNG for the game.
 * Output: public/assets/dirt-tileset.png (256×256, 8×8 tiles of 32×32).
 * Run: node scripts/generate-dirt-tileset.mjs
 */

import { Jimp } from "jimp";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const TILE_SIZE = 32;
const COLS = 8;
const ROWS = 8;
const W = COLS * TILE_SIZE;
const H = ROWS * TILE_SIZE;

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
  const grain = Math.floor((h - 0.5) * 24);
  let c = shift(baseHex, grain, grain, grain);
  if (h2 < 0.12) c = shift(baseHex, -40, -35, -30);
  else if (h2 < 0.18) c = shift(baseHex, -22, -18, -15);
  else if (h3 < 0.06) c = shift(baseHex, 18, 14, 10);
  return c;
}

async function main() {
  const image = new Jimp({ width: W, height: H });
  const bgOpaque = opaque(COLORS[0]);

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
      const ox = col * TILE_SIZE;
      const oy = row * TILE_SIZE;
      const strokeColor = shift(color, -28, -22, -18);

      for (let dy = 0; dy < TILE_SIZE; dy++) {
        for (let dx = 0; dx < TILE_SIZE; dx++) {
          const px = ox + dx;
          const py = oy + dy;
          const isEdge =
            dx === 0 || dx === TILE_SIZE - 1 || dy === 0 || dy === TILE_SIZE - 1;
          const pixelColor = isEdge
            ? strokeColor
            : detailColor(color, tileIdx, px, py, ox, oy);
          image.setPixelColor(pixelColor, px, py);
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
