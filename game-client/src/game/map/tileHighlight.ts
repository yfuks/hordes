import { TILE_SIZE } from "../assets/tileset";

export interface TileHighlight {
  /** Currently highlighted tile (tile coords); null when none. */
  highlightedTile: { x: number; y: number } | null;
  /** Update which tile is highlighted (null to clear). Call draw() after. */
  setHighlightedTile: (tile: { x: number; y: number } | null) => void;
  /** Redraw the highlight graphic. */
  draw: () => void;
}

export interface SetupTileHighlightOptions {
  scene: Phaser.Scene;
  groundLayer: Phaser.Tilemaps.TilemapLayer;
  /** Called when user clicks a valid tile (tile coords). */
  onTileSelected: (tileX: number, tileY: number) => void;
}

/**
 * Sets up tile highlight graphics and click-to-select. Returns control to update/clear highlight.
 */
export function setupTileHighlight(options: SetupTileHighlightOptions): TileHighlight {
  const { scene, groundLayer, onTileSelected } = options;
  const highlightGraphics = scene.add.graphics().setDepth(1000);

  let highlightedTile: { x: number; y: number } | null = null;

  function draw() {
    highlightGraphics.clear();
    if (!highlightedTile) return;

    const { x: tileX, y: tileY } = highlightedTile;
    const worldXY = groundLayer.tileToWorldXY(tileX, tileY);

    highlightGraphics.fillStyle(0x4a9eff, 0.35);
    highlightGraphics.lineStyle(2, 0x4a9eff, 0.9);
    highlightGraphics.strokeRect(worldXY.x, worldXY.y, TILE_SIZE, TILE_SIZE);
    highlightGraphics.fillRect(worldXY.x, worldXY.y, TILE_SIZE, TILE_SIZE);
  }

  scene.input.on("pointerdown", (pointer: Phaser.Input.Pointer) => {
    if (!groundLayer.scene) return;
    const worldX = pointer.worldX;
    const worldY = pointer.worldY;
    const tileXY = groundLayer.worldToTileXY(worldX, worldY, true);
    const tileX = Math.floor(tileXY.x);
    const tileY = Math.floor(tileXY.y);

    const mapWidth = groundLayer.width;
    const mapHeight = groundLayer.height;
    if (tileX < 0 || tileX >= mapWidth || tileY < 0 || tileY >= mapHeight) return;

    highlightedTile = { x: tileX, y: tileY };
    draw();
    onTileSelected(tileX, tileY);
  });

  return {
    get highlightedTile() {
      return highlightedTile;
    },
    setHighlightedTile(tile) {
      highlightedTile = tile;
    },
    draw,
  };
}
