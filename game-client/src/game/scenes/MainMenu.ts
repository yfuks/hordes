import { Scene, GameObjects } from "phaser";
import { clearStoredRoomId, getRoomIdFromPage } from "../config";
import { createRoom, joinRoom } from "../network/roomClient";
import { textStyles } from "../theme";

export class MainMenu extends Scene {
  background!: GameObjects.Image;
  logo!: GameObjects.Image;
  roomInput!: HTMLInputElement;
  statusText!: GameObjects.Text;

  constructor() {
    super("MainMenu");
  }

  create() {
    this.background = this.add.image(512, 384, "background");
    this.logo = this.add.image(512, 200, "logo");

    this.statusText = this.add
      .text(512, 670, "", textStyles.status)
      .setOrigin(0.5);

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
      width: 220px; text-align: center;
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

    this.events.on("shutdown", () => {
      if (this.roomInput?.parentNode) this.roomInput.parentNode.removeChild(this.roomInput);
    });
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
      await joinRoom(roomId);
      this.scene.start("Game", { roomId });
    } catch (e) {
      clearStoredRoomId();
      this.setStatus("Could not join room. Try again or create one.", true);
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
      await joinRoom(id);
      this.scene.start("Game", { roomId: id });
    } catch (e) {
      this.setStatus("Room not found or full. Try another ID or create a room.", true);
    }
  }

  private async onCreateRoom() {
    this.setStatus("Creating room…");
    try {
      const { roomId } = await createRoom();
      this.scene.start("Game", { roomId });
    } catch (e) {
      this.setStatus("Could not create room. Is the server running?", true);
    }
  }
}
