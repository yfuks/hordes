import { Scene } from "phaser";
import { ISO_TILE_HEIGHT, ISO_TILE_WIDTH } from "../assets/isoTileset";

export interface GameSceneData {
  roomId?: string;
}

/** Game scene – isometric view, tilemap-based (per AGENTS.md) */
export class Game extends Scene {
  camera!: Phaser.Cameras.Scene2D.Camera;
  isoLayer!: Phaser.Tilemaps.TilemapLayer;
  msg_text!: Phaser.GameObjects.Text;
  /** Placeholder character at map center */
  player!: Phaser.GameObjects.Container;
  roomId: string | null = null;
  /** Currently highlighted tile (tile coords); null when none */
  private highlightedTile: { x: number; y: number } | null = null;
  private highlightGraphics!: Phaser.GameObjects.Graphics;
  /** Movement speed in world pixels per second */
  private static readonly PLAYER_SPEED = 180;
  private moveTween: Phaser.Tweens.Tween | null = null;

  constructor() {
    super("Game");
  }

  init(data: GameSceneData) {
    this.roomId = data?.roomId ?? null;
  }

  create() {
    this.camera = this.cameras.main;


    this.createIsometricMap();
    this.createPlaceholderCharacter();
    this.setupTileHighlight();

    const roomLabel = this.roomId ? `Room: ${this.roomId}` : "No room";
    this.msg_text = this.add
      .text(512, 40, `${roomLabel} – Isometric view`, {
        fontFamily: "Arial Black",
        fontSize: 20,
        color: "#ffffff",
        stroke: "#000000",
        strokeThickness: 4,
        align: "center",
      })
      .setOrigin(0.5);

  }

  /** Placeholder character at map center. */
  private createPlaceholderCharacter() {
    const mapWidth = 480;
    const mapHeight = 480;
    const cx = mapWidth / 2;
    const cy = mapHeight / 2;
    const worldX =
      this.cameras.main.width / 2 -
      (mapWidth / 2 - mapHeight / 2) * (ISO_TILE_WIDTH / 2) +
      (cx - cy) * (ISO_TILE_WIDTH / 2);
    const worldY =
      this.cameras.main.height / 2 -
      (mapWidth / 2 + mapHeight / 2) * (ISO_TILE_HEIGHT / 2) +
      (cx + cy) * (ISO_TILE_HEIGHT / 2);

    const body = this.add.circle(0, 0, 14, 0x4a9eff);
    body.setStrokeStyle(2, 0x2d6cb5);
    const head = this.add.circle(0, -22, 8, 0xffd4a3);
    head.setStrokeStyle(1, 0xc4956a);

    this.player = this.add.container(worldX, worldY, [body, head]);
    this.player.setDepth(worldY);

    this.camera.startFollow(this.player);
  }

  /**
   * Creates isometric tilemap per Phaser docs:
   * - Orientation.ISOMETRIC, 64x32 grid (2:1 ratio)
   * - addTilesetImage with texture key and tile dimensions
   * - createBlankLayer with offset for centering
   */
  private createIsometricMap() {
    const mapWidth = 480;
    const mapHeight = 480;

    const mapData = new Phaser.Tilemaps.MapData({
      width: mapWidth,
      height: mapHeight,
      tileWidth: ISO_TILE_WIDTH,
      tileHeight: ISO_TILE_HEIGHT,
      orientation: Phaser.Tilemaps.Orientation.ISOMETRIC,
      format: Phaser.Tilemaps.Formats.ARRAY_2D,
    });

    const map = new Phaser.Tilemaps.Tilemap(this, mapData);
    const tileset = map.addTilesetImage(
      "iso-tiles",
      "iso-tiles",
      ISO_TILE_WIDTH,
      ISO_TILE_HEIGHT
    );

    if (!tileset) {
      console.error("iso-tiles texture missing – ensure Preloader created it");
      this.add.text(512, 384, "Tileset not loaded", {
        fontFamily: "Arial",
        fontSize: 24,
        color: "#ff6666",
      }).setOrigin(0.5);
      return;
    }

    // Center the map on screen (isometric: tile (cx,cy) at offset + (cx-cy)*tileW/2, offset + (cx+cy)*tileH/2)
    const cx = mapWidth / 2;
    const cy = mapHeight / 2;
    const offsetX = this.cameras.main.width / 2 - (cx - cy) * (ISO_TILE_WIDTH / 2);
    const offsetY = this.cameras.main.height / 2 - (cx + cy) * (ISO_TILE_HEIGHT / 2);
    this.isoLayer = map.createBlankLayer("ground", tileset, offsetX, offsetY)!;
    this.isoLayer.setDepth(Number.MAX_SAFE_INTEGER * -1); // Ground behind entities so player stays visible

    const groundData = this.generateGroundTiles(mapWidth, mapHeight);
    for (let y = 0; y < mapHeight; y++) {
      for (let x = 0; x < mapWidth; x++) {
        const index = groundData[y][x];
        this.isoLayer.putTileAt(index, x, y);
      }
    }

  }

  /** Grid step for value noise – larger = bigger patches of same tile. */
  private static readonly GROUND_NOISE_SCALE = 14;
  /** Number of tile variants in the tileset (0..TILE_VARIANTS-1). */
  private static readonly TILE_VARIANTS = 16;

  /** Seeded hash for deterministic noise; returns [0, 1). */
  private static hash(n: number): number {
    let h = (n >>> 0) * 2654435761;
    return (h >>> 0) / 4294967296;
  }

  /** Value at integer grid point (ix, iy) for ground noise. */
  private static noise2d(ix: number, iy: number): number {
    return Game.hash(ix * 7919 + iy * 31);
  }

  /** Bilinear interpolation for smooth grouping of same-colored tiles. */
  private static smoothNoise(x: number, y: number): number {
    const scale = Game.GROUND_NOISE_SCALE;
    const gx = x / scale;
    const gy = y / scale;
    const ix = Math.floor(gx);
    const iy = Math.floor(gy);
    const fx = gx - ix;
    const fy = gy - iy;
    const fx1 = 1 - fx;
    const fy1 = 1 - fy;
    const v00 = Game.noise2d(ix, iy);
    const v10 = Game.noise2d(ix + 1, iy);
    const v01 = Game.noise2d(ix, iy + 1);
    const v11 = Game.noise2d(ix + 1, iy + 1);
    return v00 * fx1 * fy1 + v10 * fx * fy1 + v01 * fx1 * fy + v11 * fx * fy;
  }

  private generateGroundTiles(width: number, height: number): number[][] {
    const tiles: number[][] = [];
    for (let y = 0; y < height; y++) {
      const row: number[] = [];
      for (let x = 0; x < width; x++) {
        const t = Game.smoothNoise(x, y);
        const index = Math.floor(t * Game.TILE_VARIANTS) % Game.TILE_VARIANTS;
        row.push(index);
      }
      tiles.push(row);
    }
    return tiles;
  }

  private setupTileHighlight() {
    this.highlightGraphics = this.add.graphics().setDepth(1000);

    this.input.on("pointerdown", (pointer: Phaser.Input.Pointer) => {
      const worldX = pointer.worldX;
      const worldY = pointer.worldY;
      const tileXY = this.isoLayer.worldToTileXY(worldX, worldY, true);
      const tileX = Math.round(tileXY.x);
      const tileY = Math.round(tileXY.y);

      const mapWidth = 480;
      const mapHeight = 480;
      if (tileX < 0 || tileX >= mapWidth || tileY < 0 || tileY >= mapHeight) return;

      this.highlightedTile = { x: tileX, y: tileY };
      this.drawHighlight();
      this.movePlayerToTile(tileX, tileY);
    });
  }

  /** Moves the player to the center of the given tile at PLAYER_SPEED. */
  private movePlayerToTile(tileX: number, tileY: number) {
    const { x: targetX, y: targetY } = this.getTileCenterWorldXY(tileX, tileY);
    const dx = targetX - this.player.x;
    const dy = targetY - this.player.y;
    const distance = Math.sqrt(dx * dx + dy * dy);
    if (distance < 1) return;

    if (this.moveTween) this.moveTween.stop();
    const duration = (distance / Game.PLAYER_SPEED) * 1000; // ms

    this.moveTween = this.tweens.add({
      targets: this.player,
      x: targetX,
      y: targetY,
      duration,
      ease: "Linear",
      onUpdate: () => this.player.setDepth(this.player.y),
      onComplete: () => {
        this.moveTween = null;
        // Clear highlight when player arrives on the highlighted tile
        if (
          this.highlightedTile &&
          this.highlightedTile.x === tileX &&
          this.highlightedTile.y === tileY
        ) {
          this.highlightedTile = null;
          this.drawHighlight();
        }
      },
    });
  }

  /** World position of the center of a tile (same as highlight drawing). */
  private getTileCenterWorldXY(tileX: number, tileY: number): { x: number; y: number } {
    const worldXY = this.isoLayer.tileToWorldXY(tileX, tileY);
    return {
      x: worldXY.x + ISO_TILE_WIDTH / 2,
      y: worldXY.y + ISO_TILE_HEIGHT,
    };
  }

  private drawHighlight() {
    this.highlightGraphics.clear();
    if (!this.highlightedTile) return;

    const { x: tileX, y: tileY } = this.highlightedTile;
    const { x: cx, y: cy } = this.getTileCenterWorldXY(tileX, tileY);

    this.highlightGraphics.fillStyle(0x4a9eff, 0.35);
    this.highlightGraphics.lineStyle(2, 0x4a9eff, 0.9);
    this.highlightGraphics.beginPath();
    this.highlightGraphics.moveTo(cx, cy - ISO_TILE_HEIGHT / 2);
    this.highlightGraphics.lineTo(cx + ISO_TILE_WIDTH / 2, cy);
    this.highlightGraphics.lineTo(cx, cy + ISO_TILE_HEIGHT / 2);
    this.highlightGraphics.lineTo(cx - ISO_TILE_WIDTH / 2, cy);
    this.highlightGraphics.closePath();
    this.highlightGraphics.fillPath();
    this.highlightGraphics.strokePath();
  }
}
