import { Client, Room } from "colyseus.js";
import { getServerUrl, setStoredRoomId } from "../config";

const LOBBY_ROOM_NAME = "lobby";
const GAME_ROOM_NAME = "game";
const CONNECTION_TIMEOUT_MS = 5_000;

let client: Client | null = null;
let currentRoom: Room | null = null;

function getClient(): Client {
  if (!client) client = new Client(getServerUrl());
  return client;
}

function withTimeout<T>(promise: Promise<T>, ms: number, message: string): Promise<T> {
  return Promise.race([
    promise,
    new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error(message)), ms)
    ),
  ]);
}

export type RoomJoinResult = { roomId: string; sessionId: string };

/** Room id from the Colyseus room (string; may be empty if not yet set). */
function getRoomId(room: Room): string {
  const r = room as { id?: string; roomId?: string };
  const id = r.id ?? r.roomId;
  return id != null && id !== "" ? String(id) : "";
}

/** Create a new room and join it. Returns room id and session id. */
export async function createRoom(): Promise<RoomJoinResult> {
  const room = await withTimeout(
    getClient().create(GAME_ROOM_NAME),
    CONNECTION_TIMEOUT_MS,
    `Connection timed out after ${CONNECTION_TIMEOUT_MS / 1000}s. Is the game server running at ${getServerUrl()}?`
  );
  currentRoom = room;
  const roomId = getRoomId(room);
  setStoredRoomId(roomId);
  return { roomId, sessionId: room.sessionId };
}

/** 
 * Join the shared lobby (pre-apocalypse safe zone).
 * All players join the same persistent lobby room.
 */
export async function joinLobby(appearance?: Record<string, string>): Promise<RoomJoinResult> {
  const options = appearance ? { appearance } : {};
  
  try {
    // Join or create the lobby room (there should only be one)
    const room = await withTimeout(
      getClient().joinOrCreate(LOBBY_ROOM_NAME, options),
      CONNECTION_TIMEOUT_MS,
      `Connection timed out after ${CONNECTION_TIMEOUT_MS / 1000}s. Is the game server running at ${getServerUrl()}?`
    );
    currentRoom = room;
    const roomId = getRoomId(room);
    return { roomId, sessionId: room.sessionId };
  } catch (e) {
    throw new Error(`Failed to join lobby: ${e instanceof Error ? e.message : String(e)}`);
  }
}

/** Join a specific game room by ID with seat reservation (used when transitioning from lobby) */
export async function joinGameRoom(roomId: string, sessionId: string, appearance?: Record<string, string>): Promise<RoomJoinResult> {
  const options = appearance ? { appearance } : {};
  
  try {
    // Use consumeSeatReservation to join the locked game room
    const room = await withTimeout(
      getClient().consumeSeatReservation({
        sessionId,
        room: await getClient().getAvailableRooms(GAME_ROOM_NAME).then(rooms => {
          const targetRoom = rooms.find(r => r.roomId === roomId);
          if (!targetRoom) throw new Error(`Game room ${roomId} not found`);
          return targetRoom;
        }),
        ...options,
      }),
      CONNECTION_TIMEOUT_MS,
      `Connection timed out. Could not join game room ${roomId}.`
    );
    currentRoom = room;
    const id = getRoomId(room) || roomId;
    setStoredRoomId(id);
    return { roomId: id, sessionId: room.sessionId };
  } catch (e) {
    throw new Error(`Failed to join game room: ${e instanceof Error ? e.message : String(e)}`);
  }
}

/** Join an existing room by id. */
export async function joinRoom(roomId: string): Promise<RoomJoinResult> {
  const room = await withTimeout(
    getClient().joinById(GAME_ROOM_NAME, roomId),
    CONNECTION_TIMEOUT_MS,
    `Connection timed out. Is the game server running at ${getServerUrl()}?`
  );
  currentRoom = room;
  const id = getRoomId(room) || roomId;
  setStoredRoomId(id);
  return { roomId: id, sessionId: room.sessionId };
}

/** Reconnect to a room by id (e.g. after page refresh). */
export async function reconnectRoom(roomId: string): Promise<RoomJoinResult> {
  const room = await withTimeout(
    getClient().reconnect(roomId),
    CONNECTION_TIMEOUT_MS,
    "Reconnection timed out."
  );
  currentRoom = room;
  const id = getRoomId(room) || roomId;
  return { roomId: id, sessionId: room.sessionId };
}

/** Current room (for state listeners). */
export function getCurrentRoom(): Room | null {
  return currentRoom;
}
