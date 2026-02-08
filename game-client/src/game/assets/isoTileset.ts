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

/** Palette – sand / dirt ground (simple environment) */
const COLORS = [
  0xc4a574, 0xb8956b, 0xa88462, 0x9a7358, 0xd4b88a, 0xc9a97a, 0xbe9a6e,
  0xb38b64, 0x8b6b4a, 0x7d5f42, 0x6f533a, 0x614732, 0xa07d52, 0x93704a,
  0x866344, 0x79563e,
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

      // Flat isometric diamond – fills 64x32 cell, no gap (tiles touch)
      const cx = x + ISO_TILE_WIDTH / 2;
      const top = y;
      const bottom = y + ISO_TILE_HEIGHT;

      ctx.fillStyle = `#${color.toString(16).padStart(6, "0")}`;
      ctx.beginPath();
      ctx.moveTo(cx, top);
      ctx.lineTo(x + ISO_TILE_WIDTH, y + ISO_TILE_HEIGHT / 2);
      ctx.lineTo(cx, bottom);
      ctx.lineTo(x, y + ISO_TILE_HEIGHT / 2);
      ctx.closePath();
      ctx.fill();

      // Darker outline for sand/dirt – subtle shadow between tiles
      const r = Math.max(0, ((color >> 16) & 0xff) - 28);
      const g = Math.max(0, ((color >> 8) & 0xff) - 22);
      const b = Math.max(0, (color & 0xff) - 18);
      ctx.strokeStyle = `#${(r << 16 | g << 8 | b).toString(16).padStart(6, "0")}`;
      ctx.lineWidth = 1;
      ctx.stroke();
    }
  }

  texture.refresh();
}
