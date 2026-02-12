/** Shared game constants */
export const DEFAULT_PORT = 2567;
export const WS_PATH = "/ws";
export const MAX_PLAYERS = 100;

/** Lobby configuration */
export const LOBBY_MAX_WAIT_TIME = 60; // Maximum seconds to wait in lobby (1 minute)
export const LOBBY_MAX_PLAYERS = 100; // Max players before auto-starting game
export const LOBBY_MAP_SIZE = { width: 800, height: 600 }; // Lobby playable area

/** Room lifecycle status */
export enum RoomStatus {
  LOBBY = "lobby", // Shared lobby (pre-apocalypse safe zone)
  GENERATING = "generating", // Procedurally generating the map
  ACTIVE = "active", // Game running, players can join
  FULL = "full", // Game running but max players reached
  GAME_OVER = "game_over", // Game has ended
}

/** Game configuration */
export const ZOMBIE_WAVE_INTERVAL = 10 * 60 * 1000; // 10 minutes in milliseconds
