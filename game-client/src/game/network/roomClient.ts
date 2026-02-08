import { Client } from "colyseus.js";
import { getServerUrl } from "../config";
import { setStoredRoomId } from "../config";

const ROOM_NAME = "game";

let client: Client | null = null;

function getClient(): Client {
  if (!client) client = new Client(getServerUrl());
  return client;
}

export type RoomJoinResult = { roomId: string; sessionId: string };

/** Create a new room and join it. Returns room id and session id. */
export async function createRoom(): Promise<RoomJoinResult> {
  const room = await getClient().create(ROOM_NAME);
  setStoredRoomId(room.id);
  return { roomId: room.id, sessionId: room.sessionId };
}

/** Join an existing room by id. */
export async function joinRoom(roomId: string): Promise<RoomJoinResult> {
  const room = await getClient().joinById(ROOM_NAME, roomId);
  setStoredRoomId(room.id);
  return { roomId: room.id, sessionId: room.sessionId };
}

/** Reconnect to a room by id (e.g. after page refresh). */
export async function reconnectRoom(roomId: string): Promise<RoomJoinResult> {
  const room = await getClient().reconnect(roomId);
  return { roomId: room.id, sessionId: room.sessionId };
}
