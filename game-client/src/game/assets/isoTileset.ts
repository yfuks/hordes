/**
 * Isometric tileset utilities – procedural generation for development.
 * Replace with real assets from the Art agent (per AGENTS.md).
 *
 * Best practice: load shared game assets in Preloader before scenes that need them.
 */

/**
 * Isometric tile dimensions – 2:1 ratio for flat ground (per Phaser docs).
 * tileWidth x tileHeight = grid cell; tileset uses same for flat diamonds.
 */
export const ISO_TILE_WIDTH = 64;
export const ISO_TILE_HEIGHT = 32;

/** Palette – post‑apocalyptic, decay (per theme) */
const COLORS = [
  0x3d5a3c, 0x4a6b49, 0x5a7a58, 0x6b8a68, 0x2d4a2e, 0x3a5a3b, 0x4a6a48,
  0x5a7a56, 0x253d26, 0x324d33, 0x425d42, 0x526d52, 0x364a37, 0x435a44,
  0x536a54, 0x637a64,
];

/**
 * Creates a procedural isometric tileset texture.
 * Flat diamonds (64x32) match the isometric grid so the map reads as a flat ground plane.
 */
export function createIsoTilesetTexture(textures: Phaser.Textures.TextureManager): void {
  if (textures.exists("iso-tiles")) return;

  const cols = 8;
  const rows = 4;
  const w = cols * ISO_TILE_WIDTH;
  const h = rows * ISO_TILE_HEIGHT;

  const texture = textures.createCanvas("iso-tiles", w, h);
  const ctx = texture.context;

  if (!ctx) return;

  for (let row = 0; row < rows; row++) {
    for (let col = 0; col < cols; col++) {
      const idx = (row * cols + col) % COLORS.length;
      const color = COLORS[idx];
      const x = col * ISO_TILE_WIDTH;
      const y = row * ISO_TILE_HEIGHT;

      // Flat isometric diamond – fills 64x32 cell (top, right, bottom, left)
      const cx = x + ISO_TILE_WIDTH / 2;
      const top = y + 2;
      const bottom = y + ISO_TILE_HEIGHT - 2;

      ctx.fillStyle = `#${color.toString(16).padStart(6, "0")}`;
      ctx.beginPath();
      ctx.moveTo(cx, top);
      ctx.lineTo(x + ISO_TILE_WIDTH - 2, y + ISO_TILE_HEIGHT / 2);
      ctx.lineTo(cx, bottom);
      ctx.lineTo(x + 2, y + ISO_TILE_HEIGHT / 2);
      ctx.closePath();
      ctx.fill();

      ctx.strokeStyle = `#${Math.max(0, color - 0x111111).toString(16).padStart(6, "0")}`;
      ctx.lineWidth = 1;
      ctx.stroke();
    }
  }

  texture.refresh();
}
