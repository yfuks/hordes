import { Client, Room } from "colyseus.js";
import { getServerUrl, setStoredRoomId } from "../config";

const ROOM_NAME = "game";
const CONNECTION_TIMEOUT_MS = 5_000;

let client: Client | null = null;
let currentRoom: Room | null = null;
/** Map received via "map" message (best practice: not in state). Cleared when leaving room. */
let currentMapData: MapData | null = null;

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

/** Map data from server (procedurally generated). Use when joining a room. */
export interface MapData {
  mapWidth: number;
  mapHeight: number;
  groundTiles: number[];
}

/** Room id from the Colyseus room (string; may be empty if not yet set). */
function getRoomId(room: Room): string {
  const r = room as { id?: string; roomId?: string };
  const id = r.id ?? r.roomId;
  return id != null && id !== "" ? String(id) : "";
}

function registerMapMessageListener(room: Room) {
  currentMapData = null;
  room.onMessage("map", (data: MapData) => {
    if (data && typeof data.mapWidth === "number" && typeof data.mapHeight === "number" && Array.isArray(data.groundTiles)) {
      const expected = data.mapWidth * data.mapHeight;
      if (data.groundTiles.length === expected) {
        currentMapData = { mapWidth: data.mapWidth, mapHeight: data.mapHeight, groundTiles: data.groundTiles };
      }
    }
  });
  // Request map so we get it even if the onJoin send was processed before our listener was registered
  room.send("requestMap");
}

/** Create a new room and join it. Returns room id and session id. */
export async function createRoom(): Promise<RoomJoinResult> {
  const room = await withTimeout(
    getClient().create(ROOM_NAME),
    CONNECTION_TIMEOUT_MS,
    `Connection timed out after ${CONNECTION_TIMEOUT_MS / 1000}s. Is the game server running at ${getServerUrl()}?`
  );
  currentRoom = room;
  registerMapMessageListener(room);
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
  registerMapMessageListener(room);
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
  registerMapMessageListener(room);
  const id = getRoomId(room) || roomId;
  return { roomId: id, sessionId: room.sessionId };
}

/** Current room (for state listeners). */
export function getCurrentRoom(): Room | null {
  return currentRoom;
}

/** Get server-generated map data (from "map" message). Undefined until message received or if offline. */
export function getMapData(): MapData | undefined {
  return currentMapData ?? undefined;
}
