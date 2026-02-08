import { Client } from "colyseus.js";
import { getServerUrl, setStoredRoomId } from "../config";

const ROOM_NAME = "game";
const CONNECTION_TIMEOUT_MS = 5_000;

let client: Client | null = null;

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

/** Create a new room and join it. Returns room id and session id. */
export async function createRoom(): Promise<RoomJoinResult> {
  const room = await withTimeout(
    getClient().create(ROOM_NAME),
    CONNECTION_TIMEOUT_MS,
    `Connection timed out after ${CONNECTION_TIMEOUT_MS / 1000}s. Is the game server running at ${getServerUrl()}?`
  );
  setStoredRoomId(room.id);
  return { roomId: room.id, sessionId: room.sessionId };
}

/** Join an existing room by id. */
export async function joinRoom(roomId: string): Promise<RoomJoinResult> {
  const room = await withTimeout(
    getClient().joinById(ROOM_NAME, roomId),
    CONNECTION_TIMEOUT_MS,
    `Connection timed out. Is the game server running at ${getServerUrl()}?`
  );
  setStoredRoomId(room.id);
  return { roomId: room.id, sessionId: room.sessionId };
}

/** Reconnect to a room by id (e.g. after page refresh). */
export async function reconnectRoom(roomId: string): Promise<RoomJoinResult> {
  const room = await withTimeout(
    getClient().reconnect(roomId),
    CONNECTION_TIMEOUT_MS,
    "Reconnection timed out."
  );
  return { roomId: room.id, sessionId: room.sessionId };
}
