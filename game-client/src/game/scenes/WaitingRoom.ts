import { Scene, GameObjects } from "phaser";
import { getCurrentRoom, joinGameRoom } from "../network/roomClient";
import { RoomStatus, LOBBY_MAX_PLAYERS, LOBBY_MAP_SIZE } from "shared";

export interface LobbyData {
  roomId: string;
}

/** 
 * Lobby scene - Playable pre-apocalypse safe zone
 * 
 * Lore: Before the zombie outbreak, this was a peaceful gathering place.
 * Players can move around, interact, and prepare before venturing into the infected world.
 * 
 * Game starts after 60 seconds OR when 100 players gather.
 */
export class Lobby extends Scene {
  private roomId!: string;
  private titleText!: GameObjects.Text;
  private statusText!: GameObjects.Text;
  private playerCountText!: GameObjects.Text;
  private countdownText!: GameObjects.Text;
  private infoText!: GameObjects.Text;
  
  // Player movement
  private playerSprite!: GameObjects.Graphics;
  private targetMarker!: GameObjects.Graphics;
  private playerX = 400;
  private playerY = 300;
  private moveSpeed = 200;
  private targetX: number | null = null;
  private targetY: number | null = null;
  private movementThreshold = 5; // Stop when within 5 pixels of target
  
  // Other players
  private otherPlayers = new Map<string, GameObjects.Graphics>();

  constructor() {
    super("Lobby");
  }

  init(data: LobbyData) {
    this.roomId = data.roomId;
  }

  create() {
    // Peaceful pre-apocalypse background (light blue sky)
    this.cameras.main.setBackgroundColor(0x87CEEB);
    
    // Draw ground/grass
    const ground = this.add.rectangle(
      LOBBY_MAP_SIZE.width / 2, 
      LOBBY_MAP_SIZE.height / 2, 
      LOBBY_MAP_SIZE.width, 
      LOBBY_MAP_SIZE.height, 
      0x90EE90
    );

    // Title - "Safe Zone"
    this.titleText = this.add
      .text(LOBBY_MAP_SIZE.width / 2, 40, "SAFE ZONE", {
        fontFamily: "Arial Black",
        fontSize: 36,
        color: "#ffffff",
        stroke: "#000000",
        strokeThickness: 6,
      })
      .setOrigin(0.5)
      .setScrollFactor(0)
      .setDepth(1000);

    // Subtitle - Pre-apocalypse lore
    this.add
      .text(LOBBY_MAP_SIZE.width / 2, 80, "Before the outbreak...", {
        fontFamily: "Arial",
        fontSize: 16,
        color: "#ffffff",
        stroke: "#000000",
        strokeThickness: 3,
      })
      .setOrigin(0.5)
      .setScrollFactor(0)
      .setDepth(1000);

    // Status text
    this.statusText = this.add
      .text(LOBBY_MAP_SIZE.width / 2, 120, "Gathering survivors...", {
        fontFamily: "Arial",
        fontSize: 20,
        color: "#ffaa00",
        stroke: "#000000",
        strokeThickness: 3,
      })
      .setOrigin(0.5)
      .setScrollFactor(0)
      .setDepth(1000);

    // Player count
    this.playerCountText = this.add
      .text(LOBBY_MAP_SIZE.width / 2, 150, "", {
        fontFamily: "Arial",
        fontSize: 18,
        color: "#ffffff",
        stroke: "#000000",
        strokeThickness: 3,
      })
      .setOrigin(0.5)
      .setScrollFactor(0)
      .setDepth(1000);

    // Countdown (hidden initially)
    this.countdownText = this.add
      .text(LOBBY_MAP_SIZE.width / 2, LOBBY_MAP_SIZE.height / 2, "", {
        fontFamily: "Arial Black",
        fontSize: 96,
        color: "#ff0000",
        stroke: "#ffffff",
        strokeThickness: 8,
      })
      .setOrigin(0.5)
      .setScrollFactor(0)
      .setDepth(1000)
      .setVisible(false);

    // Info text
    this.infoText = this.add
      .text(LOBBY_MAP_SIZE.width / 2, LOBBY_MAP_SIZE.height - 30, 
        "CLICK to move around | Game starts in 60s or when 100 players join", {
        fontFamily: "Arial",
        fontSize: 14,
        color: "#ffffff",
        stroke: "#000000",
        strokeThickness: 3,
        align: "center",
      })
      .setOrigin(0.5)
      .setScrollFactor(0)
      .setDepth(1000);

    // Create player sprite (placeholder)
    this.playerSprite = this.add.graphics();
    this.playerSprite.fillStyle(0x4444ff, 1);
    this.playerSprite.fillCircle(0, 0, 16);
    this.playerSprite.setDepth(10);

    // Create target marker (shown when clicking)
    this.targetMarker = this.add.graphics();
    this.targetMarker.lineStyle(3, 0xffff00, 1);
    this.targetMarker.strokeCircle(0, 0, 20);
    this.targetMarker.lineStyle(2, 0xffff00, 1);
    this.targetMarker.beginPath();
    this.targetMarker.moveTo(-25, 0);
    this.targetMarker.lineTo(25, 0);
    this.targetMarker.moveTo(0, -25);
    this.targetMarker.lineTo(0, 25);
    this.targetMarker.strokePath();
    this.targetMarker.setVisible(false);
    this.targetMarker.setDepth(5);

    // Setup mouse/touch controls
    this.input.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
      // Convert screen coordinates to world coordinates
      const worldPoint = this.cameras.main.getWorldPoint(pointer.x, pointer.y);
      this.targetX = worldPoint.x;
      this.targetY = worldPoint.y;
      
      // Show target marker at clicked position
      this.targetMarker.setPosition(this.targetX, this.targetY);
      this.targetMarker.setVisible(true);
      
      console.log(`Moving to: ${this.targetX}, ${this.targetY}`);
    });

    // Setup camera to follow player
    this.cameras.main.setBounds(0, 0, LOBBY_MAP_SIZE.width, LOBBY_MAP_SIZE.height);
    this.cameras.main.startFollow(this.playerSprite);

    // Setup room listeners
    this.setupRoomListeners();
  }

  update(time: number, delta: number) {
    const deltaSeconds = delta / 1000;
    const room = getCurrentRoom();
    
    if (!room) return;

    // Handle movement toward target position
    if (this.targetX !== null && this.targetY !== null) {
      // Calculate distance to target
      const dx = this.targetX - this.playerX;
      const dy = this.targetY - this.playerY;
      const distance = Math.sqrt(dx * dx + dy * dy);

      // If close enough to target, stop moving
      if (distance < this.movementThreshold) {
        this.targetX = null;
        this.targetY = null;
        this.targetMarker.setVisible(false); // Hide target marker
        return;
      }

      // Calculate direction and move toward target
      const directionX = dx / distance;
      const directionY = dy / distance;

      let newX = this.playerX + directionX * this.moveSpeed * deltaSeconds;
      let newY = this.playerY + directionY * this.moveSpeed * deltaSeconds;

      // Don't overshoot the target
      if (Math.abs(newX - this.playerX) > Math.abs(dx)) {
        newX = this.targetX;
      }
      if (Math.abs(newY - this.playerY) > Math.abs(dy)) {
        newY = this.targetY;
      }

      // Keep player within bounds
      newX = Phaser.Math.Clamp(newX, 20, LOBBY_MAP_SIZE.width - 20);
      newY = Phaser.Math.Clamp(newY, 20, LOBBY_MAP_SIZE.height - 20);

      // Determine facing direction based on movement
      let direction = "down";
      if (Math.abs(directionX) > Math.abs(directionY)) {
        direction = directionX > 0 ? "right" : "left";
      } else {
        direction = directionY > 0 ? "down" : "up";
      }

      // Update position if moved
      if (newX !== this.playerX || newY !== this.playerY) {
        this.playerX = newX;
        this.playerY = newY;
        this.playerSprite.setPosition(this.playerX, this.playerY);

        // Send position to server
        room.send("move", { x: this.playerX, y: this.playerY, direction });
      }
    }
  }

  private setupRoomListeners() {
    const room = getCurrentRoom();
    if (!room) {
      console.error("No room found in Lobby scene");
      return;
    }

    // Listen for state changes
    room.onStateChange((state: any) => {
      this.updateDisplay(state);
    });

    // Listen for other players
    room.state.players.onAdd((player: any, sessionId: string) => {
      if (sessionId === room.sessionId) {
        // This is us - set initial position
        this.playerX = player.x;
        this.playerY = player.y;
        this.playerSprite.setPosition(this.playerX, this.playerY);
      } else {
        // Other player - create sprite
        this.createOtherPlayer(sessionId, player);
      }

      // Listen for position updates
      player.onChange(() => {
        if (sessionId !== room.sessionId) {
          this.updateOtherPlayer(sessionId, player);
        }
      });
    });

    room.state.players.onRemove((player: any, sessionId: string) => {
      this.removeOtherPlayer(sessionId);
    });

    // Listen for game ready message
    room.onMessage("game_ready", (data: { roomId: string; sessionId: string; appearance: any }) => {
      console.log("Game ready! Transitioning to game room:", data.roomId);
      this.transitionToGame(data.roomId, data.sessionId, data.appearance);
    });
  }

  private updateDisplay(state: any) {
    const playerCount = state.playerCount as number;
    const countdown = state.countdown as number;
    
    // Update player count
    this.playerCountText.setText(`Survivors: ${playerCount}/${LOBBY_MAX_PLAYERS}`);

    // Update countdown
    if (countdown > 0) {
      this.statusText.setText("Venturing into the infected world...");
      this.statusText.setColor("#ff6600");
      this.countdownText.setText(String(countdown));
      this.countdownText.setVisible(true);
    } else {
      this.statusText.setText("Gathering survivors...");
      this.statusText.setColor("#ffaa00");
      this.countdownText.setVisible(false);
    }
  }

  private createOtherPlayer(sessionId: string, player: any) {
    const sprite = this.add.graphics();
    sprite.fillStyle(0xff4444, 1);
    sprite.fillCircle(0, 0, 16);
    sprite.setPosition(player.x, player.y);
    sprite.setDepth(10);
    this.otherPlayers.set(sessionId, sprite);
  }

  private updateOtherPlayer(sessionId: string, player: any) {
    const sprite = this.otherPlayers.get(sessionId);
    if (sprite) {
      sprite.setPosition(player.x, player.y);
    }
  }

  private removeOtherPlayer(sessionId: string) {
    const sprite = this.otherPlayers.get(sessionId);
    if (sprite) {
      sprite.destroy();
      this.otherPlayers.delete(sessionId);
    }
  }

  private async transitionToGame(gameRoomId: string, reservedSessionId: string, appearance: any) {
    // Fade out
    this.cameras.main.fadeOut(1000, 0, 0, 0);
    
    await new Promise(resolve => {
      this.cameras.main.once("camerafadeoutcomplete", resolve);
    });

    // Leave lobby and join game room using seat reservation
    try {
      const result = await joinGameRoom(gameRoomId, reservedSessionId, appearance);
      this.scene.start("Game", { roomId: result.roomId });
    } catch (error) {
      console.error("Failed to join game room:", error);
      this.scene.start("MainMenu");
    }
  }
}
