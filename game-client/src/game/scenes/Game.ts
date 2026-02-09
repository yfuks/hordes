import { Scene } from "phaser";
import { getRoomIdFromPage } from "../config";
import { type MapData } from "../network/roomClient";
import { registerCharacterAnimations } from "../animations/characterAnimations";
import { createGameMap } from "../map/gameMap";
import { createPlayerController } from "../player/playerController";
import { setupTileHighlight } from "../map/tileHighlight";

export interface GameSceneData {
  roomId?: string;
  /** Server map (passed when MainMenu waited for it); avoids timing issues. */
  mapData?: MapData;
}

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

  constructor() {
    super("Game");
  }

  init(data: GameSceneData) {
    const raw = data?.roomId ?? getRoomIdFromPage();
    this.roomId = raw != null && raw !== "" && String(raw) !== "undefined" ? String(raw) : null;
    this.mapData = data?.mapData ?? null;
  }

  create() {
    this.camera = this.cameras.main;
    this.input.enabled = true;

    registerCharacterAnimations(this);

    let groundLayer: Phaser.Tilemaps.TilemapLayer;
    let scheduleApplyServerMapWhenReady: () => void;

    try {
      const mapResult = createGameMap({
        scene: this,
        mapData: this.mapData,
        roomId: this.roomId,
      });
      groundLayer = mapResult.groundLayer;
      scheduleApplyServerMapWhenReady = mapResult.scheduleApplyServerMapWhenReady;
      if (mapResult.usedLocalFallback && this.roomId && this.roomId !== "offline") {
        scheduleApplyServerMapWhenReady();
      }
    } catch (err) {
      this.add
        .text(512, 384, "Tileset not loaded", {
          fontFamily: "Arial",
          fontSize: 24,
          color: "#ff6666",
        })
        .setOrigin(0.5);
      return;
    }

    this.groundLayer = groundLayer;

    let tileHighlight: ReturnType<typeof setupTileHighlight>;

    const playerController = createPlayerController(this, groundLayer, {
      onMoveComplete: (tileX, tileY) => {
        if (
          tileHighlight.highlightedTile &&
          tileHighlight.highlightedTile.x === tileX &&
          tileHighlight.highlightedTile.y === tileY
        ) {
          tileHighlight.setHighlightedTile(null);
          tileHighlight.draw();
        }
      },
    });
    this.player = playerController.player;
    this.camera.startFollow(this.player);

    tileHighlight = setupTileHighlight({
      scene: this,
      groundLayer,
      onTileSelected: (tileX, tileY) => playerController.moveToTile(tileX, tileY),
    });

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
}
