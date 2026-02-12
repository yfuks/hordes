import { Client, Room } from "colyseus.js";
import { getServerUrl, setStoredRoomId } from "../config";

const ROOM_NAME = "game";
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
    getClient().create(ROOM_NAME),
    CONNECTION_TIMEOUT_MS,
    `Connection timed out after ${CONNECTION_TIMEOUT_MS / 1000}s. Is the game server running at ${getServerUrl()}?`
  );
  currentRoom = room;
  const roomId = getRoomId(room);
  setStoredRoomId(roomId);
  return { roomId, sessionId: room.sessionId };
}

/** Join an existing room by id. */
export async function joinRoom(roomId: string): Promise<RoomJoinResult> {
  const room = await withTimeout(
    getClient().joinById(ROOM_NAME, roomId),
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
