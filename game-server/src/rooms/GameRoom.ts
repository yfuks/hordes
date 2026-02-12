import { Room, Client, Delayed } from "colyseus";
import { Schema, type } from "@colyseus/schema";
import { RoomStatus, MAX_PLAYERS, ZOMBIE_WAVE_INTERVAL } from "shared";

export class GameState extends Schema {
  @type("number") tick = 0;
  @type("string") status: string = RoomStatus.GENERATING;
  @type("number") playerCount = 0;
  @type("number") waveNumber = 0;
}

export class GameRoom extends Room<GameState> {
  private gameLoopInterval?: NodeJS.Timeout;
  private zombieWaveInterval?: Delayed;
  private hasStarted = false;

  onCreate(options: any) {
    this.setState(new GameState());
    this.maxClients = MAX_PLAYERS;

    // Lock room during generation
    this.lock();

    // Set room metadata
    this.setMetadata({
      status: RoomStatus.GENERATING,
      playerCount: 0,
      maxPlayers: MAX_PLAYERS,
      waveNumber: 0,
      lobbyPlayers: options?.lobbyPlayers || 0,
    });

    console.log(`[Game ${this.roomId}] Created for ${options?.lobbyPlayers || 0} players from lobby`);

    // Start map generation immediately
    this.generateMap();
  }

  private generateMap() {
    if (this.hasStarted) return;
    this.hasStarted = true;

    console.log(`[Game ${this.roomId}] Generating procedural map...`);
    this.updateStatus(RoomStatus.GENERATING);

    // Simulate map generation (replace with actual procedural generation)
    this.clock.setTimeout(() => {
      console.log(`[Game ${this.roomId}] Map generation complete`);
      this.startGame();
    }, 3000); // 3 seconds for map generation
  }

  private startGame() {
    this.updateStatus(RoomStatus.ACTIVE);
    console.log(`[Game ${this.roomId}] Game started - Room locked (no new players)`);

    // Start game loop
    this.gameLoopInterval = setInterval(() => {
      this.state.tick++;
    }, 1000 / 60); // 60 ticks per second

    // Start zombie wave timer
    this.scheduleNextZombieWave();
    
    // Ensure room stays locked - no new players after game starts
    this.lock();
  }

  private scheduleNextZombieWave() {
    this.zombieWaveInterval = this.clock.setTimeout(() => {
      this.spawnZombieWave();
      this.scheduleNextZombieWave();
    }, ZOMBIE_WAVE_INTERVAL);
  }

  private spawnZombieWave() {
    this.state.waveNumber++;
    console.log(`Room ${this.roomId}: Zombie wave ${this.state.waveNumber} spawning`);
    this.updateMetadata({ waveNumber: this.state.waveNumber });
    // TODO: Actual zombie spawning logic
  }

  private updateStatus(status: RoomStatus) {
    this.state.status = status;
    this.updateMetadata({ status });

    // Game rooms are ALWAYS locked - only lobby transfers allowed
    // Room remains locked during GENERATING, ACTIVE, FULL, and GAME_OVER
    this.lock();
  }

  private updateMetadata(partial: Partial<any>) {
    this.setMetadata({
      ...this.metadata,
      ...partial,
    });
  }

  onJoin(client: Client, options: any) {
    console.log(`[Game ${this.roomId}] Player ${client.sessionId} joined from lobby`);
    
    // Store appearance if provided
    if (options?.appearance) {
      console.log(`[Game ${this.roomId}] Player ${client.sessionId} appearance:`, options.appearance);
      // TODO: Store appearance with player entity
    }

    this.state.playerCount = this.clients.length;
    this.updateMetadata({ playerCount: this.state.playerCount });

    // Check if room is now full
    if (this.state.playerCount >= MAX_PLAYERS && this.state.status === RoomStatus.ACTIVE) {
      this.updateStatus(RoomStatus.FULL);
    }

    // TODO: Create player entity
  }

  onLeave(client: Client, consented: boolean) {
    console.log(`[Game ${this.roomId}] Player ${client.sessionId} left`);
    
    this.state.playerCount = this.clients.length;
    this.updateMetadata({ playerCount: this.state.playerCount });

    // Update status from FULL to ACTIVE if players leave (but room stays locked)
    if (this.state.status === RoomStatus.FULL && this.state.playerCount < MAX_PLAYERS) {
      this.state.status = RoomStatus.ACTIVE;
      this.updateMetadata({ status: RoomStatus.ACTIVE });
      // Note: Room stays locked, no new players can join
    }

    // TODO: Remove player entity
  }

  endGame() {
    console.log(`Room ${this.roomId}: Game over`);
    this.updateStatus(RoomStatus.GAME_OVER);

    // Clear intervals
    if (this.gameLoopInterval) {
      clearInterval(this.gameLoopInterval);
    }
    if (this.zombieWaveInterval) {
      this.zombieWaveInterval.clear();
    }

    // Disconnect all clients after a delay
    this.clock.setTimeout(() => {
      this.disconnect();
    }, 10000); // 10 seconds to show game over state
  }

  onDispose() {
    console.log(`[Game ${this.roomId}] Disposing`);
    
    // Cleanup
    if (this.gameLoopInterval) {
      clearInterval(this.gameLoopInterval);
    }
    if (this.zombieWaveInterval) {
      this.zombieWaveInterval.clear();
    }
  }
}
