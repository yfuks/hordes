/**
 * Server-side procedural map generator.
 * Roads use the 3×3 green tile block (with adjacent autotiling); rest is plain brown.
 * Tile indices match client ground-tiles.png (8×8 sheet).
 */

import { MAP_WIDTH, MAP_HEIGHT } from "shared";

/** Plain brown ground (non-road). Single tile for consistent look. */
const BROWN_TILE = 0;

/**
 * Green road 3×3 block in the tileset (bottom-right of 8×8 sheet).
 * Layout: [NW, N, NE] / [W, C, E] / [SW, S, SE] -> indices 45..47, 53..55, 61..63.
 */
const ROAD_3X3_BASE = 45;
/** Map 4-neighbor mask (N=1, S=2, E=4, W=8) to 3×3 subIndex 0..8. */
const MASK_TO_3X3: number[] = [
  4, 1, 7, 4, 5, 6, 0, 5, 3, 8, 2, 3, 4, 1, 7, 4,
];
/** Convert subIndex 0..8 to tile index in sheet (row-major 8 cols). */
function roadSubIndexToTile(subIndex: number): number {
  const col = subIndex % 3;
  const row = Math.floor(subIndex / 3);
  return ROAD_3X3_BASE + col + row * 8;
}

/** Road width in tiles; roads extend from center to map edge. */
const ROAD_WIDTH = 3;
/** Number of roads from center (angles spread evenly). */
const NUM_ROADS = 4;

/** Hash a string to a number for seeding. */
function hashString(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) {
    h = (Math.imul(31, h) + s.charCodeAt(i)) >>> 0;
  }
  return h;
}

/**
 * Generate a 2D map of tile indices (row-major: index = y * width + x).
 * Roads use green 3×3 with adjacency; everything else is plain brown.
 */
export function generateMap(seedInput: string | number): number[] {
  const seed = typeof seedInput === "string" ? hashString(seedInput) : seedInput >>> 0;
  const cx = MAP_WIDTH / 2;
  const cy = MAP_HEIGHT / 2;

  /** Check if (x, y) is on a road. */
  const isOnRoad = (x: number, y: number): boolean => {
    const dx = x - cx;
    const dy = y - cy;
    const angle = Math.atan2(dy, dx);
    const radius = Math.sqrt(dx * dx + dy * dy);
    if (radius < 6) return false;
    const angularWidth = ROAD_WIDTH / radius;
    for (let i = 0; i < NUM_ROADS; i++) {
      const roadAngle = (i / NUM_ROADS) * Math.PI * 2;
      let diff = Math.abs(angle - roadAngle);
      if (diff > Math.PI) diff = Math.PI * 2 - diff;
      if (diff <= angularWidth) return true;
    }
    return false;
  };

  // Build road mask (2D grid)
  const road: boolean[] = [];
  for (let y = 0; y < MAP_HEIGHT; y++) {
    for (let x = 0; x < MAP_WIDTH; x++) {
      road[y * MAP_WIDTH + x] = isOnRoad(x, y);
    }
  }

  const at = (x: number, y: number) => road[y * MAP_WIDTH + x] ?? false;

  // Fill tiles: road -> green 3×3 by adjacency; else brown
  const tiles: number[] = [];
  for (let y = 0; y < MAP_HEIGHT; y++) {
    for (let x = 0; x < MAP_WIDTH; x++) {
      if (!at(x, y)) {
        tiles.push(BROWN_TILE);
        continue;
      }
      const hasN = y > 0 && at(x, y - 1);
      const hasS = y < MAP_HEIGHT - 1 && at(x, y + 1);
      const hasE = x < MAP_WIDTH - 1 && at(x + 1, y);
      const hasW = x > 0 && at(x - 1, y);
      const mask = (hasN ? 1 : 0) | (hasS ? 2 : 0) | (hasE ? 4 : 0) | (hasW ? 8 : 0);
      const subIndex = MASK_TO_3X3[mask] ?? 4;
      tiles.push(roadSubIndexToTile(subIndex));
    }
  }

  return tiles;
}

export { MAP_WIDTH, MAP_HEIGHT };
