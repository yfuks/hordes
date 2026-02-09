import { Scene } from "phaser";
import { TILE_SIZE, GROUND_TILESET_TILE_COUNT } from "../assets/tileset";
import { getRoomIdFromPage } from "../config";
import { getCurrentRoom, getMapData, type MapData } from "../network/roomClient";

export interface GameSceneData {
  roomId?: string;
  /** Server map (passed when MainMenu waited for it); avoids timing issues. */
  mapData?: MapData;
}

/** Character facing direction for idle/special. */
type CharacterDirection = "down" | "up" | "side";

/** Game scene – top-down view, tilemap-based (per AGENTS.md) */
export class Game extends Scene {
  camera!: Phaser.Cameras.Scene2D.Camera;
  groundLayer!: Phaser.Tilemaps.TilemapLayer;
  msg_text!: Phaser.GameObjects.Text;
  /** Placeholder character at map center */
  player!: Phaser.GameObjects.Container;
  roomId: string | null = null;
  /** Server map when passed from MainMenu (so we don't rely on state timing). */
  private mapData: MapData | null = null;
  /** Currently highlighted tile (tile coords); null when none */
  private highlightedTile: { x: number; y: number } | null = null;
  private highlightGraphics!: Phaser.GameObjects.Graphics;
  /** Movement speed in world pixels per second */
  private static readonly PLAYER_SPEED = 80;
  private moveTween: Phaser.Tweens.Tween | null = null;
  /** Last movement direction for idle/special. */
  private lastDirection: CharacterDirection = "down";
  /** When direction is side, true = right, false = left. */
  private facingRight = false;
  /** Whether special is currently playing. */
  private isPlayingSpecial = false;
  /** Timer for triggering special after long idle; reset when player moves. */
  private idleSpecialTimer: Phaser.Time.TimerEvent | null = null;
  /** Idle delay range (ms) before special can trigger. */
  private static readonly IDLE_SPECIAL_MIN_MS = 4000;
  private static readonly IDLE_SPECIAL_MAX_MS = 8000;

  constructor() {
    super("Game");
  }

  init(data: GameSceneData) {
    // Prefer scene data; fallback to stored/URL room ID (set when we create/join)
    const raw = data?.roomId ?? getRoomIdFromPage();
    this.roomId = raw != null && raw !== "" && String(raw) !== "undefined" ? String(raw) : null;
    this.mapData = data?.mapData ?? null;
  }

  create() {
    this.camera = this.cameras.main;
    this.input.enabled = true;

    this.createCharacterAnimations();
    this.createTopDownMap();
    this.createPlaceholderCharacter();
    this.setupTileHighlight();
    this.startIdleSpecialTimer();

    const roomLabel = this.roomId != null && this.roomId !== "" ? `Room: ${this.roomId}` : "No room";
    this.msg_text = this.add
      .text(512, 40, `${roomLabel} – Top-down view`, {
        fontFamily: "Arial Black",
        fontSize: 20,
        color: "#ffffff",
        stroke: "#000000",
        strokeThickness: 4,
        align: "center",
      })
      .setOrigin(0.5);
  }

  private createCharacterAnimations() {
    const walkRate = 8;
    const idleRate = 6;
    const specialRate = 10;
    const atlas = "character";

    const dirs = [
      { key: "D", name: "down" },
      { key: "U", name: "up" },
      { key: "S", name: "side" },
    ] as const;
    for (const { key, name } of dirs) {
      if (!this.anims.exists(`idle-${name}`)) {
        this.anims.create({
          key: `idle-${name}`,
          frames: this.anims.generateFrameNames(atlas, { prefix: `${key}_Idle_`, start: 0, end: 3 }),
          frameRate: idleRate,
          repeat: -1,
        });
      }
      if (!this.anims.exists(`walk-${name}`)) {
        this.anims.create({
          key: `walk-${name}`,
          frames: this.anims.generateFrameNames(atlas, { prefix: `${key}_Walk_`, start: 0, end: 5 }),
          frameRate: walkRate,
          repeat: -1,
        });
      }
      if (!this.anims.exists(`special-${name}`)) {
        this.anims.create({
          key: `special-${name}`,
          frames: this.anims.generateFrameNames(atlas, { prefix: `${key}_Special_`, start: 0, end: 5 }),
          frameRate: specialRate,
          repeat: 0,
        });
      }
    }
  }

  /** Placeholder character at map center (Craftpix pixel citizen sprite). */
  private createPlaceholderCharacter() {
    const mapWidth = this.groundLayer.width;
    const mapHeight = this.groundLayer.height;
    const cx = mapWidth / 2;
    const cy = mapHeight / 2;
    const offsetX = this.cameras.main.width / 2 - cx * TILE_SIZE - TILE_SIZE / 2;
    const offsetY = this.cameras.main.height / 2 - cy * TILE_SIZE - TILE_SIZE / 2;
    const worldX = offsetX + cx * TILE_SIZE + TILE_SIZE / 2;
    const worldY = offsetY + cy * TILE_SIZE + TILE_SIZE / 2;

    const sprite = this.add.sprite(0, 0, "character", "D_Idle_0");
    sprite.setOrigin(0.5, 1);

    this.player = this.add.container(worldX, worldY, [sprite]);
    this.player.setDepth(worldY);

    this.camera.startFollow(this.player);
  }

  /** Play idle animation in current direction. */
  private playIdle() {
    const sprite = this.player.list[0] as Phaser.GameObjects.Sprite;
    if (!sprite?.play) return;
    sprite.setFlipX(this.lastDirection === "side" && this.facingRight);
    sprite.play(`idle-${this.lastDirection}`);
  }

  /** Schedule a random delay; when it fires, play special once then reschedule. */
  private startIdleSpecialTimer() {
    if (this.idleSpecialTimer) return;
    const delay =
      Game.IDLE_SPECIAL_MIN_MS +
      Math.random() * (Game.IDLE_SPECIAL_MAX_MS - Game.IDLE_SPECIAL_MIN_MS);
    this.idleSpecialTimer = this.time.delayedCall(delay, () => {
      this.idleSpecialTimer = null;
      this.playSpecial();
    });
  }

  private stopIdleSpecialTimer() {
    if (this.idleSpecialTimer) {
      this.idleSpecialTimer.destroy();
      this.idleSpecialTimer = null;
    }
  }

  /** Play special once; on complete return to idle and schedule next idle special. */
  private playSpecial() {
    if (this.isPlayingSpecial) return;
    const sprite = this.player.list[0] as Phaser.GameObjects.Sprite;
    if (!sprite?.play) return;
    this.isPlayingSpecial = true;
    sprite.setFlipX(this.lastDirection === "side" && this.facingRight);
    sprite.play(`special-${this.lastDirection}`);
    sprite.once(Phaser.Animations.Events.ANIMATION_COMPLETE, () => {
      this.isPlayingSpecial = false;
      this.playIdle();
      this.startIdleSpecialTimer();
    });
  }

  /**
   * Creates top-down (orthogonal) tilemap per Phaser docs.
   * Uses server-generated map when joined to a room, else local fallback (e.g. offline).
   */
  private createTopDownMap() {
    // Use map passed from MainMenu first (waited for state), then getMapData(), then local
    const serverMap =
      this.mapData ??
      (this.roomId && this.roomId !== "offline" ? getMapData() : undefined);
    const mapWidth = serverMap?.mapWidth ?? 480;
    const mapHeight = serverMap?.mapHeight ?? 480;

    const mapData = new Phaser.Tilemaps.MapData({
      width: mapWidth,
      height: mapHeight,
      tileWidth: TILE_SIZE,
      tileHeight: TILE_SIZE,
      orientation: Phaser.Tilemaps.Orientation.ORTHOGONAL,
      format: Phaser.Tilemaps.Formats.ARRAY_2D,
    });

    const map = new Phaser.Tilemaps.Tilemap(this, mapData);
    const tileset = map.addTilesetImage(
      "ground-tiles",
      "ground-tiles",
      TILE_SIZE,
      TILE_SIZE
    );

    if (!tileset) {
      console.error("ground-tiles texture missing – ensure Preloader loaded it");
      this.add.text(512, 384, "Tileset not loaded", {
        fontFamily: "Arial",
        fontSize: 24,
        color: "#ff6666",
      }).setOrigin(0.5);
      return;
    }

    const offsetX = this.cameras.main.width / 2 - (mapWidth / 2) * TILE_SIZE - TILE_SIZE / 2;
    const offsetY = this.cameras.main.height / 2 - (mapHeight / 2) * TILE_SIZE - TILE_SIZE / 2;
    this.groundLayer = map.createBlankLayer("ground", tileset, offsetX, offsetY)!;
    this.groundLayer.setDepth(Number.MAX_SAFE_INTEGER * -1);

    if (serverMap?.groundTiles.length === mapWidth * mapHeight) {
      const tiles = serverMap.groundTiles;
      for (let y = 0; y < mapHeight; y++) {
        for (let x = 0; x < mapWidth; x++) {
          const index = tiles[y * mapWidth + x];
          this.groundLayer.putTileAt(index, x, y);
        }
      }
    } else {
      const groundData = this.generateGroundTiles(mapWidth, mapHeight);
      for (let y = 0; y < mapHeight; y++) {
        for (let x = 0; x < mapWidth; x++) {
          this.groundLayer.putTileAt(groundData[y][x], x, y);
        }
      }
      // State may arrive after join; apply server map when it's ready
      if (this.roomId && this.roomId !== "offline") {
        this.scheduleApplyServerMapWhenReady();
      }
    }
  }

  /** When we used local map but are in a room, apply server map once state is available. */
  private scheduleApplyServerMapWhenReady() {
    const tryApply = () => {
      const data = getMapData();
      if (!data || !this.groundLayer) return;
      const { mapWidth, mapHeight, groundTiles } = data;
      if (mapWidth !== this.groundLayer.width || mapHeight !== this.groundLayer.height) return;
      if (groundTiles.length !== mapWidth * mapHeight) return;
      for (let y = 0; y < mapHeight; y++) {
        for (let x = 0; x < mapWidth; x++) {
          this.groundLayer.putTileAt(groundTiles[y * mapWidth + x], x, y);
        }
      }
    };
    tryApply();
    const room = getCurrentRoom();
    if (room?.onStateChange?.once) {
      room.onStateChange.once(() => tryApply());
    }
    this.time.delayedCall(150, tryApply);
    this.time.delayedCall(500, tryApply);
    this.time.delayedCall(1500, tryApply);
    this.time.delayedCall(2500, tryApply);
  }

  /** Grid step for value noise – larger = bigger patches of same tile. */
  private static readonly GROUND_NOISE_SCALE = 14;
  /** Number of tile variants in the ground tileset (0..TILE_VARIANTS-1). */
  private static readonly TILE_VARIANTS = GROUND_TILESET_TILE_COUNT;

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
      if (!this.groundLayer) return;
      const worldX = pointer.worldX;
      const worldY = pointer.worldY;
      const tileXY = this.groundLayer.worldToTileXY(worldX, worldY, true);
      const tileX = Math.floor(tileXY.x);
      const tileY = Math.floor(tileXY.y);

      const mapWidth = this.groundLayer.width;
      const mapHeight = this.groundLayer.height;
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

    this.stopIdleSpecialTimer();
    if (this.moveTween) this.moveTween.stop();
    const duration = (distance / Game.PLAYER_SPEED) * 1000;

    const isHorizontal = Math.abs(dx) > Math.abs(dy);
    if (isHorizontal) {
      this.lastDirection = "side";
      this.facingRight = dx > 0;
    } else if (dy < 0) {
      this.lastDirection = "up";
      this.facingRight = false;
    } else {
      this.lastDirection = "down";
      this.facingRight = false;
    }

    const sprite = this.player.list[0] as Phaser.GameObjects.Sprite;
    if (sprite && sprite.play) {
      sprite.setFlipX(this.lastDirection === "side" && this.facingRight);
      sprite.play(`walk-${this.lastDirection}`);
    }

    this.moveTween = this.tweens.add({
      targets: this.player,
      x: targetX,
      y: targetY,
      duration,
      ease: "Linear",
      onUpdate: () => this.player.setDepth(this.player.y),
      onComplete: () => {
        this.moveTween = null;
        this.playIdle();
        this.startIdleSpecialTimer();
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

  /** World position of the center of a tile (top-down: tile origin + half size). */
  private getTileCenterWorldXY(tileX: number, tileY: number): { x: number; y: number } {
    const worldXY = this.groundLayer.tileToWorldXY(tileX, tileY);
    return {
      x: worldXY.x + TILE_SIZE / 2,
      y: worldXY.y + TILE_SIZE / 2,
    };
  }

  private drawHighlight() {
    this.highlightGraphics.clear();
    if (!this.highlightedTile) return;

    const { x: tileX, y: tileY } = this.highlightedTile;
    const worldXY = this.groundLayer.tileToWorldXY(tileX, tileY);

    this.highlightGraphics.fillStyle(0x4a9eff, 0.35);
    this.highlightGraphics.lineStyle(2, 0x4a9eff, 0.9);
    this.highlightGraphics.strokeRect(worldXY.x, worldXY.y, TILE_SIZE, TILE_SIZE);
    this.highlightGraphics.fillRect(worldXY.x, worldXY.y, TILE_SIZE, TILE_SIZE);
  }
}
