import { Scene } from "phaser";
import { getRoomIdFromPage } from "../config";
import { createPlayerController } from "../player/playerController";
import { getCurrentRoom } from "../network/roomClient";
import { RoomStatus } from "shared";

export interface GameSceneData {
  roomId?: string;
}

/** Game scene – simplified placeholder (no map/assets yet) */
export class Game extends Scene {
  camera!: Phaser.Cameras.Scene2D.Camera;
  msg_text!: Phaser.GameObjects.Text;
  status_text!: Phaser.GameObjects.Text;
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

    // Add status display
    this.status_text = this.add
      .text(512, 70, "Connecting...", {
        fontFamily: "Arial",
        fontSize: 16,
        color: "#FFF",
        align: "center",
      })
      .setOrigin(0.5);

    // Listen to room state changes
    this.setupRoomListeners();
  }

  private setupRoomListeners() {
    const room = getCurrentRoom();
    if (!room) return;

    room.onStateChange((state: any) => {
      this.updateStatusDisplay(state);
    });
  }

  private updateStatusDisplay(state: any) {
    const status = state.status as string;
    const playerCount = state.playerCount as number;
    const waveNumber = state.waveNumber as number;

    const statusText = this.formatStatus(status);
    const playerText = `Players: ${playerCount}`;
    const waveText = waveNumber > 0 ? ` | Wave: ${waveNumber}` : "";

    this.status_text.setText(`${statusText} | ${playerText}${waveText}`);
    this.status_text.setColor(this.getStatusColor(status));
  }

  private formatStatus(status: string): string {
    switch (status) {
      case RoomStatus.LOBBY:
        return "In Safe Zone";
      case RoomStatus.GENERATING:
        return "Generating map...";
      case RoomStatus.ACTIVE:
        return "Game Active";
      case RoomStatus.FULL:
        return "Room Full";
      case RoomStatus.GAME_OVER:
        return "GAME OVER";
      default:
        return status;
    }
  }

  private getStatusColor(status: string): string {
    switch (status) {
      case RoomStatus.LOBBY:
        return "#90EE90"; // Light green (safe)
      case RoomStatus.GENERATING:
        return "#00aaff"; // Blue
      case RoomStatus.ACTIVE:
        return "#00ff00"; // Green
      case RoomStatus.FULL:
        return "#ff6600"; // Red-orange
      case RoomStatus.GAME_OVER:
        return "#ff0000"; // Red
      default:
        return "#cccccc"; // Gray
    }
  }
}
