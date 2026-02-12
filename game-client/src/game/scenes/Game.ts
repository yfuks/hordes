import { Scene } from "phaser";
import { getRoomIdFromPage } from "../config";
import { createPlayerController } from "../player/playerController";

export interface GameSceneData {
  roomId?: string;
}

/** Game scene – simplified placeholder (no map/assets yet) */
export class Game extends Scene {
  camera!: Phaser.Cameras.Scene2D.Camera;
  msg_text!: Phaser.GameObjects.Text;
  player!: Phaser.GameObjects.Graphics;
  roomId: string | null = null;

  constructor() {
    super("Game");
  }

  init(data: GameSceneData) {
    const raw = data?.roomId ?? getRoomIdFromPage();
    this.roomId = raw != null && raw !== "" && String(raw) !== "undefined" ? String(raw) : null;
  }

  create() {
    this.camera = this.cameras.main;
    this.input.enabled = true;

    if (!this.roomId) {
      this.add
        .text(512, 384, "Join a room from the main menu", {
          fontFamily: "Arial",
          fontSize: 24,
          color: "#ffffff",
        })
        .setOrigin(0.5);
      return;
    }

    // Create simple placeholder player
    const playerController = createPlayerController(this);
    this.player = playerController.player;

    const roomLabel = this.roomId != null && this.roomId !== "" ? `Room: ${this.roomId}` : "No room";
    this.msg_text = this.add
      .text(512, 40, `${roomLabel}`, {
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
