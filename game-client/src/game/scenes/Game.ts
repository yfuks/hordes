import { Scene } from "phaser";

export interface GameSceneData {
  roomId?: string;
}

export class Game extends Scene {
  camera!: Phaser.Cameras.Scene2D.Camera;
  background!: Phaser.GameObjects.Image;
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
    this.camera.setBackgroundColor(0x00ff00);

    this.background = this.add.image(512, 384, "background");
    this.background.setAlpha(0.5);

    const roomLabel = this.roomId ? `Room: ${this.roomId}` : "No room";
    this.msg_text = this.add.text(
      512,
      384,
      `${roomLabel}\n\n(Placeholder – game logic here)`,
      {
        fontFamily: "Arial Black",
        fontSize: 28,
        color: "#ffffff",
        stroke: "#000000",
        strokeThickness: 6,
        align: "center",
      }
    );
    this.msg_text.setOrigin(0.5);
  }
}
