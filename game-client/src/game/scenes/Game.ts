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

    this.setupZoom();
  }

  private static readonly MIN_ZOOM = 0.25;
  private static readonly MAX_ZOOM = 3;
  private static readonly ZOOM_SENSITIVITY = 0.001;

  private setupZoom() {
    const canvas = this.sys.game.canvas;
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      const pointer = this.input.activePointer;
      const worldX = this.camera.scrollX + pointer.x / this.camera.zoom;
      const worldY = this.camera.scrollY + pointer.y / this.camera.zoom;

      const delta = -e.deltaY * Game.ZOOM_SENSITIVITY;
      const newZoom = Phaser.Math.Clamp(
        this.camera.zoom + delta * this.camera.zoom,
        Game.MIN_ZOOM,
        Game.MAX_ZOOM
      );

      this.camera.setZoom(newZoom);
      this.camera.setScroll(
        worldX - pointer.x / newZoom,
        worldY - pointer.y / newZoom
      );
    };
    canvas.addEventListener("wheel", onWheel, { passive: false });
    this.events.once("shutdown", () =>
      canvas.removeEventListener("wheel", onWheel)
    );
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

    // Camera bounds so we can drag around the bigger map
    const margin = 200;
    const minX = offsetX - margin - (mapHeight - 0) * (ISO_TILE_WIDTH / 2);
    const maxX = offsetX + margin + (mapWidth - 0) * (ISO_TILE_WIDTH / 2);
    const minY = offsetY - margin;
    const maxY = offsetY + margin + (mapWidth + mapHeight) * (ISO_TILE_HEIGHT / 2);
    this.camera.setBounds(minX, minY, maxX - minX, maxY - minY);

    let prevX = 0;
    let prevY = 0;
    this.input.on("pointerdown", (p: Phaser.Input.Pointer) => {
      prevX = p.x;
      prevY = p.y;
    });
    this.input.on("pointermove", (p: Phaser.Input.Pointer) => {
      if (p.isDown) {
        this.camera.scrollX -= p.x - prevX;
        this.camera.scrollY -= p.y - prevY;
        prevX = p.x;
        prevY = p.y;
      }
    });
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
