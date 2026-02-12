# Room Status System

This document describes the room lifecycle status system used to track game room states.

## Room Statuses

The game room goes through several statuses during its lifecycle:

### 1. WAITING_ROOM (`"waiting_room"`)
- **Description**: Lobby phase where players gather before the game starts
- **Behavior**: Room is unlocked, players can join freely
- **Duration**: Until minimum players reached and countdown completes
- **Minimum Players**: 2 players required to start countdown
- **Countdown**: 10 seconds after minimum players reached

### 2. GENERATING (`"generating"`)
- **Description**: The game is procedurally generating the map
- **Behavior**: Room is locked, players cannot join during generation
- **Duration**: ~2 seconds (placeholder - will depend on actual map generation)

### 3. ACTIVE (`"active"`)
- **Description**: Game is running and accepting new players
- **Behavior**: Room is unlocked, players can join freely
- **Duration**: Until max players reached or game ends

### 4. FULL (`"full"`)
- **Description**: Game is running but has reached max players (100)
- **Behavior**: Room is locked, no new players can join
- **Duration**: Until a player leaves or game ends
- **Note**: If a player leaves, room automatically transitions back to ACTIVE

### 5. GAME_OVER (`"game_over"`)
- **Description**: The game has ended
- **Behavior**: Room is locked, no new players can join
- **Duration**: 10 seconds before room disposal
- **Note**: All clients are disconnected after the grace period

## User Flow

1. **Main Menu**: Player sees a big "PLAY" button and character preview
2. **Character Customization** (optional): Player can customize their character appearance (hair, color, outfit)
3. **Matchmaking**: Clicking "PLAY" automatically finds or creates a suitable room
4. **Waiting Room**: Players gather in a lobby scene
   - Shows all connected players
   - Displays countdown when minimum players reached
   - Automatically transitions to game when ready
5. **Game**: Map generates and gameplay begins

## Implementation Details

### Server (`GameRoom`)

The server manages status transitions automatically:

```typescript
// Status is tracked in GameState schema
export class GameState extends Schema {
  @type("string") status: string = RoomStatus.WAITING_ROOM;
  @type("number") playerCount = 0;
  @type("number") waveNumber = 0;
  @type("number") countdown = 0;
}

// Status transitions happen automatically:
onCreate() → WAITING_ROOM
onJoin() → check min players → start countdown
countdown expires → GENERATING → ACTIVE
onJoin() → check if FULL (when playerCount >= MAX_PLAYERS)
onLeave() → cancel countdown if below min players
onLeave() → check if should unlock (when FULL → ACTIVE)
endGame() → GAME_OVER → dispose after 10s
```

### Client Scenes

**MainMenu**: Single "PLAY" button with character customization

```typescript
import { playGame } from "../network/roomClient";
import { getStoredAppearance } from "./CharacterEdit";

// Auto-matchmaking with appearance
const appearance = getStoredAppearance();
const result = await playGame(appearance);
this.scene.start("WaitingRoom", { roomId: result.roomId });
```

**WaitingRoom**: Lobby showing all players and countdown

```typescript
room.onStateChange((state) => {
  // Display player count and countdown
  if (state.playerCount < MIN_PLAYERS_TO_START) {
    // Show "waiting for X more players"
  } else if (state.countdown > 0) {
    // Show countdown timer
  }
  
  // Auto-transition to Game when status changes
  if (state.status === RoomStatus.GENERATING) {
    this.scene.start("Game", { roomId });
  }
});
```

**Game**: Game scene displays status with color coding

```typescript
// Status colors:
// - Orange: WAITING_ROOM
// - Blue: GENERATING
// - Green: ACTIVE
// - Red-orange: FULL
// - Red: GAME_OVER
```

### Room Metadata

Status is also exposed in room metadata for lobby listing:

```typescript
room.metadata = {
  status: RoomStatus.WAITING_ROOM,
  playerCount: 4,
  maxPlayers: 100,
  waveNumber: 0,
}
```

### Matchmaking

Auto-matchmaking uses `joinOrCreate` to find available rooms:

```typescript
// Client automatically joins waiting room or creates new one
const room = await client.joinOrCreate("game", { appearance });
```

## Usage Examples

### Player Joins Game

```typescript
// 1. Player customizes character (optional)
setStoredAppearance({ hair: "spiky", color: "blue", outfit: "tactical" });

// 2. Player clicks PLAY
const appearance = getStoredAppearance();
const result = await playGame(appearance);

// 3. System routes to waiting room
scene.start("WaitingRoom", { roomId: result.roomId });
```

### Waiting Room Countdown

Server automatically manages countdown:

```typescript
// When 2nd player joins
onJoin() → playerCount === 2 → startCountdown(10 seconds)

// Countdown ticks every second
state.countdown: 10, 9, 8, 7...

// When countdown reaches 0
generateMap() → status = GENERATING → startGame()
```

### Triggering Game Over

From within GameRoom:

```typescript
// When all players die or victory condition is met:
this.endGame();
```

### Character Appearance Flow

```typescript
// Server receives appearance on join
onJoin(client, options) {
  if (options?.appearance) {
    // Store with player entity for sprite rendering
    player.appearance = options.appearance;
  }
}
```

## Future Enhancements

- Add PAUSED status for temporary game suspension
- Add COUNTDOWN status for match start countdown
- Add MAINTENANCE status for server maintenance
- Track additional metadata (game duration, difficulty level, etc.)
