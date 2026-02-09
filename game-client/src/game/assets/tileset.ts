/**
 * Top-down tileset utilities – procedural generation for development.
 * Replace with real assets from the Art agent (per AGENTS.md).
 *
 * Phaser 3 orthogonal (top-down) uses square tiles; 32×32 is a common choice.
 * See: https://phaser.io/examples/v3/view/tilemap
 */

/** Top-down tile size – square cells (Phaser orthogonal default). */
export const TILE_SIZE = 32;

/** Palette – sand / dirt ground (simple environment) */
const COLORS = [
  0xc4a574, 0xb8956b, 0xa88462, 0x9a7358, 0xd4b88a, 0xc9a97a, 0xbe9a6e,
  0xb38b64, 0x8b6b4a, 0x7d5f42, 0x6f533a, 0x614732, 0xa07d52, 0x93704a,
  0x866344, 0x79563e,
];

/**
 * Creates a procedural top-down tileset texture (square tiles).
 * Used as fallback when dirt-tileset.png is not available.
 */
export function createTilesetTexture(textures: Phaser.Textures.TextureManager): void {
  if (textures.exists("ground-tiles")) return;

  const cols = 8;
  const rows = 8;
  const w = cols * TILE_SIZE;
  const h = rows * TILE_SIZE;

  const texture = textures.createCanvas("ground-tiles", w, h);
  const ctx = texture.context;

  if (!ctx) return;

  for (let row = 0; row < rows; row++) {
    for (let col = 0; col < cols; col++) {
      const idx = (row * cols + col) % COLORS.length;
      const color = COLORS[idx];
      const x = col * TILE_SIZE;
      const y = row * TILE_SIZE;

      ctx.fillStyle = `#${color.toString(16).padStart(6, "0")}`;
      ctx.fillRect(x, y, TILE_SIZE, TILE_SIZE);

      const r = Math.max(0, ((color >> 16) & 0xff) - 28);
      const g = Math.max(0, ((color >> 8) & 0xff) - 22);
      const b = Math.max(0, (color & 0xff) - 18);
      ctx.strokeStyle = `#${(r << 16 | g << 8 | b).toString(16).padStart(6, "0")}`;
      ctx.lineWidth = 1;
      ctx.strokeRect(x, y, TILE_SIZE, TILE_SIZE);
    }
  }

  texture.refresh();
}
