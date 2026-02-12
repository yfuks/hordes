# Lobby System

This document describes the redesigned lobby and matchmaking system.

## Overview

The lobby system features a **shared, playable safe zone** where all players gather before games start:
- **Single "PLAY" button** - No manual room creation/joining
- **Character customization** - Players customize their appearance before playing
- **Playable Lobby** - Move around and interact in the pre-apocalypse safe zone
- **60-second timer** - Game starts after 1 minute OR when 100 players join
- **Batch matchmaking** - All lobby players transfer to a new game together

## Lore

**The Safe Zone** - Before the zombie apocalypse began, this was a peaceful gathering place where survivors would meet. Players can move around freely in this pre-infection world before venturing into the dangerous, zombie-infested areas.

## Player Flow

```
Main Menu → [Customize Character] → Click PLAY → Shared Lobby (Playable) → Game Room
```

### 1. Main Menu
- **Big "PLAY" button** - Primary action to join the safe zone
- **Character preview** - Shows current character appearance
- **Customize button** - Opens character editor
- **Game info** - Brief description of game features

### 2. Character Customization (Optional)
- **Hair Style**: Short, Long, Spiky, Bald
- **Hair Color**: Black, Brown, Blonde, Red, Blue
- **Outfit**: Casual, Tactical, Survivor, Medic
- Appearance saved to localStorage
- Changes persist across sessions

### 3. Shared Lobby - "Safe Zone" (Playable)
- **All players join the same persistent lobby room**
- **Playable area**: 800x600 pixel map with peaceful pre-apocalypse theme
- **Player movement**: Use arrow keys to move around
- **See other players**: Red circles represent other survivors
- **Player count**: Shows current survivors (X/100)
- **Timer system**:
  - 60-second countdown starts when first player joins
  - OR game starts immediately when 100 players gather
  - Timer shown prominently when active
  - No minimum player requirement - game starts even if alone

### 4. Game Room Generation (Background)
- **During lobby wait**: Server prepares a new game room
- **Procedural map generation**: ~3 seconds
- **Room creation**: Dedicated GameRoom for the batch

### 5. Batch Transfer
- **All lobby players** transferred together to the new game
- **Appearance data** carried over automatically
- **Smooth transition** with fade effect
- **Lobby resets** for the next batch of players

### 6. Game Start
- Players spawn in the procedurally generated city
- Zombie survival gameplay begins
- Waves start every 10 minutes

## Technical Implementation

### Client Components

#### MainMenu Scene
```typescript
// Single PLAY button handler
private async onPlayGame() {
  const appearance = getStoredAppearance();
  const result = await playGame(appearance);
  this.scene.start("WaitingRoom", { roomId: result.roomId });
}
```

#### CharacterEdit Scene
- Interactive selectors for appearance options
- Save to localStorage
- Preview color changes
- Placeholder for future sprite system

#### WaitingRoom Scene
- Displays player count with emoji visualization
- Shows countdown timer when active
- Listens for status changes
- Transitions to Game scene when map generation starts

#### Network Client
```typescript
// Auto-matchmaking function
export async function playGame(appearance?: Record<string, string>) {
  const options = appearance ? { appearance } : {};
  const room = await client.joinOrCreate(ROOM_NAME, options);
  return { roomId: room.id, sessionId: room.sessionId };
}
```

### Server Components

#### GameRoom Lifecycle

**Room Creation**
```typescript
onCreate() {
  status = WAITING_ROOM
  playerCount = 0
  countdown = 0
}
```

**Player Join**
```typescript
onJoin(client, options) {
  // Store appearance
  if (options?.appearance) {
    // TODO: Associate with player entity
  }
  
  // Check for countdown start
  if (playerCount >= MIN_PLAYERS_TO_START) {
    startCountdown()
  }
}
```

**Player Leave**
```typescript
onLeave(client) {
  // Cancel countdown if below minimum
  if (playerCount < MIN_PLAYERS_TO_START) {
    cancelCountdown()
  }
}
```

**Countdown System**
```typescript
private startCountdown() {
  state.countdown = WAITING_ROOM_COUNTDOWN; // 10 seconds
  
  setInterval(() => {
    state.countdown--;
    
    if (state.countdown <= 0) {
      generateMap();
    }
  }, 1000);
}
```

## Configuration

### Constants (shared/src/constants.ts)

```typescript
export const MAX_PLAYERS = 100;
export const MIN_PLAYERS_TO_START = 2;
export const WAITING_ROOM_COUNTDOWN = 10; // seconds
```

### Room Statuses

- `WAITING_ROOM` - Lobby phase (unlocked)
- `GENERATING` - Map generation (locked)
- `ACTIVE` - Game running (unlocked)
- `FULL` - Max players reached (locked)
- `GAME_OVER` - Game ended (locked)

## User Experience

### What Players See

**Main Menu**
```
╔══════════════════════════════╗
║         HORDES              ║
║  Survive the Zombie         ║
║      Apocalypse             ║
║                             ║
║    [Character Preview]      ║
║  [Customize Character]      ║
║                             ║
║      ▶▶  PLAY  ◀◀          ║
╚══════════════════════════════╝
```

**Waiting Room**
```
╔══════════════════════════════╗
║      Waiting Room           ║
║     Room: abc123            ║
║                             ║
║  Waiting for 1 more player  ║
║                             ║
║      Players: 1             ║
║          👤                 ║
╚══════════════════════════════╝
```

**Waiting Room (Countdown)**
```
╔══════════════════════════════╗
║      Waiting Room           ║
║     Room: abc123            ║
║                             ║
║   Game starting soon!       ║
║                             ║
║      Players: 2             ║
║        👤👤                ║
║                             ║
║           5                 ║
╚══════════════════════════════╝
```

## Future Enhancements

### Character System
- Replace placeholder rectangles with actual sprite rendering
- Support for more customization options (skin tone, accessories)
- Preview animations (idle, walk)
- Gender/body type options

### Waiting Room Features
- Chat system for players waiting
- "Ready" button to start earlier (when all ready)
- Show player names and appearances
- Map preview or game tips
- Team selection (if applicable)
- Kick/vote system for problematic players

### Matchmaking Improvements
- Skill-based matchmaking
- Region selection
- Game mode selection (casual, ranked, etc.)
- Party/group system (join with friends)
- Reconnection to in-progress games

### UI Enhancements
- Animations and transitions
- Sound effects
- Loading screens with progress
- Tooltips and onboarding
- Settings panel (audio, graphics, controls)

## Design Rationale

### Why Remove Manual Room Selection?
- **Simpler UX** - One button vs multiple steps
- **Faster matchmaking** - Players find games immediately
- **Better player distribution** - Fills rooms evenly
- **Modern standard** - Matches expectations from other multiplayer games

### Why Add Waiting Room?
- **Social aspect** - Players see who they'll play with
- **Anticipation** - Builds excitement before game starts
- **Fairness** - Everyone starts together, not mid-game
- **Technical buffer** - Time for map generation without blocking

### Why Character Customization?
- **Player identity** - Personalization increases engagement
- **Per AGENTS.md** - Design spec requirement
- **Visual diversity** - Easier to identify players in-game
- **Future monetization** - Premium skins/cosmetics possible

## Testing Checklist

- [ ] Single player can't start game (needs 2+)
- [ ] Two players trigger countdown
- [ ] Countdown cancels when player leaves
- [ ] Appearance persists across sessions
- [ ] Matchmaking finds existing waiting rooms
- [ ] Multiple rooms can exist simultaneously
- [ ] Room locks during map generation
- [ ] Game starts automatically after countdown
- [ ] Players can customize appearance
- [ ] Back button works in character editor
