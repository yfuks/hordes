import { TILE_SIZE, GROUND_TILESET_TILE_COUNT } from "../assets/tileset";
import { getCurrentRoom, getMapData, type MapData } from "../network/roomClient";

/** Grid step for value noise – larger = bigger patches of same tile. */
const GROUND_NOISE_SCALE = 14;

/** Seeded hash for deterministic noise; returns [0, 1). */
function hash(n: number): number {
  const h = (n >>> 0) * 2654435761;
  return (h >>> 0) / 4294967296;
}

/** Value at integer grid point (ix, iy) for ground noise. */
function noise2d(ix: number, iy: number): number {
  return hash(ix * 7919 + iy * 31);
}

/** Bilinear interpolation for smooth grouping of same-colored tiles. */
function smoothNoise(x: number, y: number): number {
  const scale = GROUND_NOISE_SCALE;
  const gx = x / scale;
  const gy = y / scale;
  const ix = Math.floor(gx);
  const iy = Math.floor(gy);
  const fx = gx - ix;
  const fy = gy - iy;
  const fx1 = 1 - fx;
  const fy1 = 1 - fy;
  const v00 = noise2d(ix, iy);
  const v10 = noise2d(ix + 1, iy);
  const v01 = noise2d(ix, iy + 1);
  const v11 = noise2d(ix + 1, iy + 1);
  return v00 * fx1 * fy1 + v10 * fx * fy1 + v01 * fx1 * fy + v11 * fx * fy;
}

/** Generate a 2D grid of ground tile indices using value noise. */
export function generateGroundTiles(width: number, height: number): number[][] {
  const tiles: number[][] = [];
  for (let y = 0; y < height; y++) {
    const row: number[] = [];
    for (let x = 0; x < width; x++) {
      const t = smoothNoise(x, y);
      const index = Math.floor(t * GROUND_TILESET_TILE_COUNT) % GROUND_TILESET_TILE_COUNT;
      row.push(index);
    }
    tiles.push(row);
  }
  return tiles;
}

export interface CreateGameMapOptions {
  scene: Phaser.Scene;
  /** Server map when passed from MainMenu (avoids timing issues). */
  mapData?: MapData | null;
  roomId: string | null;
}

/**
 * Creates top-down (orthogonal) tilemap. Uses server map when available, else local fallback.
 * Returns the ground layer, a function to schedule applying server map when ready, and whether local fallback was used.
 */
export function createGameMap(options: CreateGameMapOptions): {
  groundLayer: Phaser.Tilemaps.TilemapLayer;
  scheduleApplyServerMapWhenReady: () => void;
  usedLocalFallback: boolean;
} {
  const { scene, mapData, roomId } = options;
  const camera = scene.cameras.main;

  const serverMap =
    mapData ?? (roomId && roomId !== "offline" ? getMapData() : undefined);
  const mapWidth = serverMap?.mapWidth ?? 480;
  const mapHeight = serverMap?.mapHeight ?? 480;

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

  let usedLocalFallback = false;
  if (serverMap?.groundTiles.length === mapWidth * mapHeight) {
    const tiles = serverMap.groundTiles;
    for (let y = 0; y < mapHeight; y++) {
      for (let x = 0; x < mapWidth; x++) {
        groundLayer.putTileAt(tiles[y * mapWidth + x], x, y);
      }
    }
  } else {
    usedLocalFallback = true;
    const groundData = generateGroundTiles(mapWidth, mapHeight);
    for (let y = 0; y < mapHeight; y++) {
      for (let x = 0; x < mapWidth; x++) {
        groundLayer.putTileAt(groundData[y][x], x, y);
      }
    }
  }

  function scheduleApplyServerMapWhenReady() {
    const tryApply = () => {
      const data = getMapData();
      if (!data || !groundLayer.scene) return;
      const { mapWidth: w, mapHeight: h, groundTiles } = data;
      if (w !== groundLayer.width || h !== groundLayer.height) return;
      if (groundTiles.length !== w * h) return;
      for (let y = 0; y < h; y++) {
        for (let x = 0; x < w; x++) {
          groundLayer.putTileAt(groundTiles[y * w + x], x, y);
        }
      }
    };
    tryApply();
    const room = getCurrentRoom();
    if (room?.onStateChange?.once) {
      room.onStateChange.once(() => tryApply());
    }
    scene.time.delayedCall(150, tryApply);
    scene.time.delayedCall(500, tryApply);
    scene.time.delayedCall(1500, tryApply);
    scene.time.delayedCall(2500, tryApply);
  }

  return { groundLayer, scheduleApplyServerMapWhenReady, usedLocalFallback };
}
