import { Scene, GameObjects } from "phaser";
import { clearStoredRoomId, getRoomIdFromPage } from "../config";
import { createRoom, joinRoom } from "../network/roomClient";
import { textStyles } from "../theme";

export class MainMenu extends Scene {
  roomInput!: HTMLInputElement;
  statusText!: GameObjects.Text;

  constructor() {
    super("MainMenu");
  }

  create() {
    // Placeholder background
    this.add.rectangle(512, 384, 1024, 768, 0x222222);
    // Placeholder logo
    this.add.rectangle(512, 200, 200, 100, 0x444444);

    this.statusText = this.add
      .text(512, 670, "", textStyles.status)
      .setOrigin(0.5);

    this.events.on("shutdown", () => {
      this.roomInput?.parentNode?.removeChild(this.roomInput);
    });

    const roomId = getRoomIdFromPage();
    if (roomId) {
      this.goToRoom(roomId);
      return;
    }

    this.add
      .text(512, 320, "Main Menu", textStyles.title)
      .setOrigin(0.5);

    const editCharacter = this.add
      .text(512, 400, "Edit character", textStyles.heading)
      .setOrigin(0.5)
      .setInteractive({ useHandCursor: true });

    editCharacter.on("pointerdown", () => this.scene.start("CharacterEdit"));

    // Room id input (DOM overlay — uses theme via .hordes-input in style.css)
    this.add
      .text(512, 470, "Room ID", textStyles.label)
      .setOrigin(0.5);

    const inputEl = document.createElement("input");
    inputEl.type = "text";
    inputEl.placeholder = "Enter room ID";
    inputEl.className = "hordes-input";
    inputEl.style.cssText = `
      position: absolute; left: 50%; top: 500px; transform: translate(-50%, -50%);
      width: 220px; text-align: center; z-index: 1;
    `;
    this.roomInput = inputEl;
    this.scale.parent?.appendChild(inputEl);

    const enterRoom = this.add
      .text(512, 555, "Enter room", textStyles.button)
      .setOrigin(0.5)
      .setInteractive({ useHandCursor: true });

    enterRoom
      .on("pointerover", () => enterRoom.setStyle(textStyles.buttonHover))
      .on("pointerout", () => enterRoom.setStyle(textStyles.button));
    enterRoom.on("pointerdown", () => this.onEnterRoom());

    const createRoomBtn = this.add
      .text(512, 610, "Create room", textStyles.button)
      .setOrigin(0.5)
      .setInteractive({ useHandCursor: true });

    createRoomBtn
      .on("pointerover", () => createRoomBtn.setStyle(textStyles.buttonHover))
      .on("pointerout", () => createRoomBtn.setStyle(textStyles.button));

    createRoomBtn.on("pointerdown", () => this.onCreateRoom());
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

  private async goToRoom(roomId: string) {
    this.setStatus("Joining room…");
    try {
      const result = await joinRoom(roomId);
      this.scene.start("Game", { roomId: result.roomId });
    } catch (e) {
      clearStoredRoomId();
      const msg = e instanceof Error ? e.message : String(e);
      this.setStatus(msg || "Could not join room. Try again or create one.", true);
      this.addBackToMenuButton();
    }
  }

  private async onEnterRoom() {
    const id = this.roomInput?.value?.trim();
    if (!id) {
      this.setStatus("Enter a room ID", true);
      return;
    }
    this.setStatus("Joining…");
    try {
      const result = await joinRoom(id);
      this.scene.start("Game", { roomId: result.roomId });
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      this.setStatus(msg || "Room not found or full. Try another ID or create a room.", true);
    }
  }

  private async onCreateRoom() {
    this.setStatus("Creating room…");
    try {
      const result = await createRoom();
      this.scene.start("Game", { roomId: result.roomId });
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      this.setStatus(msg || "Could not create room. Is the server running?", true);
      this.addBackToMenuButton();
    }
  }
}
