import { Room, Client, Delayed } from "colyseus";
import { Schema, type, MapSchema } from "@colyseus/schema";
import { RoomStatus, LOBBY_MAX_WAIT_TIME, LOBBY_MAX_PLAYERS } from "shared";

// Player entity in the lobby
export class LobbyPlayer extends Schema {
  @type("string") sessionId: string = "";
  @type("number") x: number = 0;
  @type("number") y: number = 0;
  @type("string") direction: string = "down";
  @type({ map: "string" }) appearance = new MapSchema<string>();
}

export class LobbyState extends Schema {
  @type({ map: LobbyPlayer }) players = new MapSchema<LobbyPlayer>();
  @type("number") countdown: number = 0;
  @type("number") playerCount: number = 0;
  @type("string") status: string = RoomStatus.LOBBY;
}

/**
 * LobbyRoom - Shared, persistent lobby where players gather before games
 * 
 * Lore: This is the safe zone before the zombie apocalypse began.
 * A peaceful area where survivors gather before venturing into the infected world.
 * 
 * Flow:
 * 1. All players join this single lobby room
 * 2. Lobby is playable - players can move around
 * 3. Countdown starts when first player joins (or after previous batch leaves)
 * 4. Game starts after 60 seconds OR when 100 players join
 * 5. Server creates a GameRoom and transfers all players
 * 6. Lobby resets for the next batch
 */
export class LobbyRoom extends Room<LobbyState> {
  private countdownInterval?: Delayed;
  private isGeneratingGame = false;
  private countdownActive = false;

  onCreate(options: any) {
    this.setState(new LobbyState());
    this.maxClients = LOBBY_MAX_PLAYERS;
    
    // Lobby never locks - always accepting players
    this.setMetadata({
      status: RoomStatus.LOBBY,
      playerCount: 0,
      description: "Safe Zone - Pre-Apocalypse",
    });

    console.log(`[Lobby] Created - Safe zone ready for survivors`);

    // Handle player movement messages
    this.onMessage("move", (client, message: { x: number; y: number; direction: string }) => {
      const player = this.state.players.get(client.sessionId);
      if (player) {
        player.x = message.x;
        player.y = message.y;
        player.direction = message.direction;
      }
    });
  }

  onJoin(client: Client, options: any) {
    console.log(`[Lobby] Player ${client.sessionId} entered safe zone`);

    // Create player entity
    const player = new LobbyPlayer();
    player.sessionId = client.sessionId;
    
    // Spawn at random position in lobby
    player.x = 200 + Math.random() * 400;
    player.y = 200 + Math.random() * 200;
    
    // Store appearance if provided
    if (options?.appearance) {
      Object.entries(options.appearance).forEach(([key, value]) => {
        player.appearance.set(key, String(value));
      });
    }

    this.state.players.set(client.sessionId, player);
    this.state.playerCount = this.state.players.size;
    this.updateMetadata({ playerCount: this.state.playerCount });

    // Start countdown if this is the first player or countdown isn't running
    if (!this.countdownActive && !this.isGeneratingGame) {
      this.startCountdown();
    }

    // Check if we've hit max players
    if (this.state.playerCount >= LOBBY_MAX_PLAYERS) {
      this.initiateGameStart();
    }
  }

  onLeave(client: Client, consented: boolean) {
    console.log(`[Lobby] Player ${client.sessionId} left safe zone`);
    
    this.state.players.delete(client.sessionId);
    this.state.playerCount = this.state.players.size;
    this.updateMetadata({ playerCount: this.state.playerCount });

    // If lobby empties, reset countdown
    if (this.state.playerCount === 0 && this.countdownInterval) {
      this.stopCountdown();
    }
  }

  private startCountdown() {
    if (this.countdownActive || this.isGeneratingGame) return;

    console.log(`[Lobby] Starting ${LOBBY_MAX_WAIT_TIME}s countdown`);
    this.countdownActive = true;
    this.state.countdown = LOBBY_MAX_WAIT_TIME;

    this.countdownInterval = this.clock.setInterval(() => {
      this.state.countdown--;

      if (this.state.countdown <= 0) {
        this.initiateGameStart();
      }
    }, 1000);
  }

  private stopCountdown() {
    if (this.countdownInterval) {
      this.countdownInterval.clear();
      this.countdownInterval = undefined;
    }
    this.countdownActive = false;
    this.state.countdown = 0;
  }

  private async initiateGameStart() {
    if (this.isGeneratingGame) return;
    if (this.state.playerCount === 0) return;

    this.isGeneratingGame = true;
    this.stopCountdown();

    console.log(`[Lobby] Game starting! Transferring ${this.state.playerCount} players`);

    try {
      // Create a new game room
      const gameRoom = await this.presence.matchMaker.createRoom("game", {
        lobbyPlayers: this.state.players.size,
      });

      console.log(`[Lobby] Game room ${gameRoom.roomId} created`);

      // Collect all current players
      const playersToTransfer = Array.from(this.state.players.keys());

      // Create seat reservations for all players (so they can join the locked room)
      const seatReservations = new Map<string, any>();
      for (const sessionId of playersToTransfer) {
        const player = this.state.players.get(sessionId);
        if (player) {
          // Reserve a seat for this specific player
          const reservation = await this.presence.matchMaker.reserveSeatFor(gameRoom, {
            sessionId,
            appearance: Object.fromEntries(player.appearance),
          });
          seatReservations.set(sessionId, reservation);
        }
      }

      // Transfer each player to the game room
      for (const sessionId of playersToTransfer) {
        const client = Array.from(this.clients).find((c) => c.sessionId === sessionId);
        const player = this.state.players.get(sessionId);
        const reservation = seatReservations.get(sessionId);
        
        if (client && player && reservation) {
          // Send game room info with seat reservation
          client.send("game_ready", {
            roomId: gameRoom.roomId,
            sessionId: reservation.sessionId,
            appearance: Object.fromEntries(player.appearance),
          });

          // Remove from lobby
          this.state.players.delete(sessionId);
        }
      }

      this.state.playerCount = this.state.players.size;
      this.updateMetadata({ playerCount: this.state.playerCount });

      // Reset for next batch
      this.isGeneratingGame = false;
      
      // If there are new players who joined during transfer, start countdown again
      if (this.state.playerCount > 0) {
        this.startCountdown();
      }

    } catch (error) {
      console.error(`[Lobby] Failed to create game room:`, error);
      this.isGeneratingGame = false;
      
      // Retry countdown
      if (this.state.playerCount > 0) {
        this.startCountdown();
      }
    }
  }

  private updateMetadata(partial: Partial<any>) {
    this.setMetadata({
      ...this.metadata,
      ...partial,
    });
  }

  onDispose() {
    console.log(`[Lobby] Disposing...`);
    if (this.countdownInterval) {
      this.countdownInterval.clear();
    }
  }
}
