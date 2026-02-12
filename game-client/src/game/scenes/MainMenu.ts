import { Scene, GameObjects } from "phaser";
import { joinLobby } from "../network/roomClient";
import { textStyles } from "../theme";
import { getStoredAppearance } from "./CharacterEdit";

export class MainMenu extends Scene {
  statusText!: GameObjects.Text;

  constructor() {
    super("MainMenu");
  }

  create() {
    // Background
    this.cameras.main.setBackgroundColor(0x1a1a2e);

    // Logo/Title
    this.add
      .text(512, 180, "HORDES", {
        fontFamily: "Arial Black",
        fontSize: 72,
        color: "#ff6b6b",
      })
      .setOrigin(0.5);

    this.add
      .text(512, 240, "Survive the Zombie Apocalypse", {
        fontFamily: "Arial",
        fontSize: 20,
        color: "#888888",
      })
      .setOrigin(0.5);

    // Character preview
    const appearance = getStoredAppearance();
    const hasAppearance = Object.keys(appearance).length > 0;
    
    this.add
      .text(512, 320, "Your Character", {
        fontFamily: "Arial",
        fontSize: 18,
        color: "#666666",
      })
      .setOrigin(0.5);

    // Placeholder character preview (will be replaced with actual sprite later)
    const characterPreview = this.add
      .rectangle(512, 380, 100, 100, hasAppearance ? 0x4ecdc4 : 0x444444)
      .setStrokeStyle(2, 0x888888);

    this.add
      .text(512, 445, hasAppearance ? "Custom Character" : "Default Character", {
        fontFamily: "Arial",
        fontSize: 14,
        color: "#aaaaaa",
      })
      .setOrigin(0.5);

    // Customize button
    const customizeBtn = this.add
      .text(512, 490, "Customize Character", textStyles.button)
      .setOrigin(0.5)
      .setInteractive({ useHandCursor: true });

    customizeBtn
      .on("pointerover", () => customizeBtn.setStyle(textStyles.buttonHover))
      .on("pointerout", () => customizeBtn.setStyle(textStyles.button));
    customizeBtn.on("pointerdown", () => this.scene.start("CharacterEdit"));

    // BIG PLAY BUTTON
    const playBtn = this.add
      .text(512, 580, "PLAY", {
        fontFamily: "Arial Black",
        fontSize: 48,
        color: "#00ff00",
        stroke: "#000000",
        strokeThickness: 4,
      })
      .setOrigin(0.5)
      .setInteractive({ useHandCursor: true });

    playBtn
      .on("pointerover", () => {
        playBtn.setScale(1.1);
        playBtn.setColor("#44ff44");
      })
      .on("pointerout", () => {
        playBtn.setScale(1);
        playBtn.setColor("#00ff00");
      });
    playBtn.on("pointerdown", () => this.onPlayGame());

    // Status text
    this.statusText = this.add
      .text(512, 680, "", textStyles.status)
      .setOrigin(0.5);

    // Footer info
    this.add
      .text(512, 730, "Up to 100 players | Procedurally generated map | Zombie waves every 10 minutes", {
        fontFamily: "Arial",
        fontSize: 12,
        color: "#555555",
      })
      .setOrigin(0.5);
  }

  private setStatus(msg: string, isError = false) {
    if (this.statusText) {
      this.statusText.setText(msg).setStyle(isError ? textStyles.statusError : textStyles.status);
    }
  }

  private addBackToMenuButton() {
    const back = this.add
      .text(512, 720, "Back to menu", textStyles.button)
      .setOrigin(0.5)
      .setInteractive({ useHandCursor: true });
    back
      .on("pointerover", () => back.setStyle(textStyles.buttonHover))
      .on("pointerout", () => back.setStyle(textStyles.button));
    back.on("pointerdown", () => this.scene.restart());
  }

  private async onPlayGame() {
    this.setStatus("Entering safe zone...");
    
    try {
      const appearance = getStoredAppearance();
      const result = await joinLobby(appearance);
      
      // Go to lobby (safe zone)
      this.scene.start("Lobby", { roomId: result.roomId });
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      this.setStatus(msg || "Could not connect to server. Is it running?", true);
      this.addBackToMenuButton();
    }
  }
}
