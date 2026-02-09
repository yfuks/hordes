/**
 * Packs all character direction sprites (D/U/S × Idle/Walk/Special) into a single
 * atlas PNG + Phaser JSON. Run: node scripts/build-character-atlas.mjs
 * Sources: scripts/character-sources/*.png → public/assets/character-atlas.png + .json
 */

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const SOURCE_DIR = path.join(__dirname, "character-sources");
const OUT_DIR = path.join(__dirname, "..", "public", "assets");
const FRAME_W = 48;
const FRAME_H = 48;
const ATLAS_W = 288;

const ROWS = [
  { file: "D_Idle.png", key: "D_Idle", frames: 4 },
  { file: "D_Walk.png", key: "D_Walk", frames: 6 },
  { file: "D_Special.png", key: "D_Special", frames: 6 },
  { file: "U_Idle.png", key: "U_Idle", frames: 4 },
  { file: "U_Walk.png", key: "U_Walk", frames: 6 },
  { file: "U_Special.png", key: "U_Special", frames: 6 },
  { file: "S_Idle.png", key: "S_Idle", frames: 4 },
  { file: "S_Walk.png", key: "S_Walk", frames: 6 },
  { file: "S_Special.png", key: "S_Special", frames: 6 },
];

async function main() {
  let sharp;
  try {
    sharp = (await import("sharp")).default;
  } catch {
    console.error("Missing 'sharp'. Install with: npm install -D sharp");
    process.exit(1);
  }

  let atlasH = 0;
  const atlasFrames = {};

  for (let rowIndex = 0; rowIndex < ROWS.length; rowIndex++) {
    const row = ROWS[rowIndex];
    const y = rowIndex * FRAME_H;
    atlasH += FRAME_H;
    const srcPath = path.join(SOURCE_DIR, row.file);
    if (!fs.existsSync(srcPath)) {
      console.error("Missing:", srcPath);
      process.exit(1);
    }
    for (let i = 0; i < row.frames; i++) {
      const frameName = `${row.key}_${i}`;
      atlasFrames[frameName] = {
        frame: { x: i * FRAME_W, y, w: FRAME_W, h: FRAME_H },
        sourceSize: { w: FRAME_W, h: FRAME_H },
        spriteSourceSize: { x: 0, y: 0, w: FRAME_W, h: FRAME_H },
      };
    }
  }

  const overlays = await Promise.all(
    ROWS.map(async (row, index) => {
      const srcPath = path.join(SOURCE_DIR, row.file);
      const buf = await sharp(srcPath).ensureAlpha().toBuffer();
      return { input: buf, top: index * FRAME_H, left: 0 };
    })
  );

  fs.mkdirSync(OUT_DIR, { recursive: true });
  const outImage = path.join(OUT_DIR, "character-atlas.png");
  await sharp({
    create: {
      width: ATLAS_W,
      height: atlasH,
      channels: 4,
      background: { r: 0, g: 0, b: 0, alpha: 0 },
    },
  })
    .composite(overlays)
    .png()
    .toFile(outImage);

  const atlasJson = {
    frames: atlasFrames,
    meta: { app: "hordes", image: "character-atlas.png", size: { w: ATLAS_W, h: atlasH }, scale: 1 },
  };
  const outJson = path.join(OUT_DIR, "character-atlas.json");
  fs.writeFileSync(outJson, JSON.stringify(atlasJson, null, 0));

  console.log("Wrote", outImage, "and", outJson);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
