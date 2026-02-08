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
    this.camera.setBackgroundColor(0x000000);

    // Rounded circular view with soft blur at the border
    this.camera.postFX.addCircle(0, 0x000000, 0x000000, 1, 0.04);
    this.camera.postFX.addVignette(0.5, 0.5, 0.5, 0.5);

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
