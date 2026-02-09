import { TILE_SIZE } from "../assets/tileset";
import type { MapData } from "../network/roomClient";

export interface CreateGameMapOptions {
  scene: Phaser.Scene;
  /** Server-generated map (always required). */
  mapData: MapData;
}

/**
 * Creates top-down (orthogonal) tilemap from server map data.
 * The server is the single source of truth for the map.
 */
export function createGameMap(options: CreateGameMapOptions): Phaser.Tilemaps.TilemapLayer {
  const { scene, mapData } = options;
  const camera = scene.cameras.main;
  const { mapWidth, mapHeight, groundTiles } = mapData;

  const mapDataObj = new Phaser.Tilemaps.MapData({
    width: mapWidth,
    height: mapHeight,
    tileWidth: TILE_SIZE,
    tileHeight: TILE_SIZE,
    orientation: Phaser.Tilemaps.Orientation.ORTHOGONAL,
    format: Phaser.Tilemaps.Formats.ARRAY_2D,
  });

  const map = new Phaser.Tilemaps.Tilemap(scene, mapDataObj);
  const tileset = map.addTilesetImage(
    "ground-tiles",
    "ground-tiles",
    TILE_SIZE,
    TILE_SIZE
  );

  if (!tileset) {
    throw new Error("ground-tiles texture missing – ensure Preloader loaded it");
  }

  const offsetX = camera.width / 2 - (mapWidth / 2) * TILE_SIZE - TILE_SIZE / 2;
  const offsetY = camera.height / 2 - (mapHeight / 2) * TILE_SIZE - TILE_SIZE / 2;
  const groundLayer = map.createBlankLayer("ground", tileset, offsetX, offsetY)!;
  groundLayer.setDepth(Number.MAX_SAFE_INTEGER * -1);

  if (groundTiles.length === mapWidth * mapHeight) {
    for (let y = 0; y < mapHeight; y++) {
      for (let x = 0; x < mapWidth; x++) {
        groundLayer.putTileAt(groundTiles[y * mapWidth + x], x, y);
      }
    }
  }

  return groundLayer;
}
