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

  constructor() {
    super("Game");
  }

  init(data: GameSceneData) {
    this.roomId = data?.roomId ?? null;
  }

  create() {
    this.camera = this.cameras.main;
    this.camera.setBackgroundColor(0x1a1a2e);

    this.createIsometricMap();
    this.createPlaceholderCharacter();

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

    // Start with camera centered on character
    this.camera.centerOn(worldX, worldY);
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

    const groundData = this.generateGroundTiles(mapWidth, mapHeight);
    for (let y = 0; y < mapHeight; y++) {
      for (let x = 0; x < mapWidth; x++) {
        const index = groundData[y][x];
        this.isoLayer.putTileAt(index, x, y);
      }
    }

  }

  private generateGroundTiles(width: number, height: number): number[][] {
    const tiles: number[][] = [];
    for (let y = 0; y < height; y++) {
      const row: number[] = [];
      for (let x = 0; x < width; x++) {
        row.push((x + y) % 16);
      }
      tiles.push(row);
    }
    return tiles;
  }
}
