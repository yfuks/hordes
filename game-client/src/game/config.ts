/** Game client config (server URL, storage keys) */
const SERVER_URL =
  typeof import.meta.env !== "undefined" && import.meta.env?.VITE_SERVER_URL
    ? String(import.meta.env.VITE_SERVER_URL)
    : "ws://localhost:2567";

const ROOM_STORAGE_KEY = "hordes_roomId";

export function getServerUrl(): string {
  return SERVER_URL;
}

export function getRoomIdFromPage(): string | null {
  if (typeof window === "undefined") return null;
  const params = new URLSearchParams(window.location.search);
  const fromUrl = params.get("room");
  if (fromUrl) return fromUrl;
  return sessionStorage.getItem(ROOM_STORAGE_KEY);
}

export function setStoredRoomId(roomId: string): void {
  if (typeof sessionStorage === "undefined") return;
  sessionStorage.setItem(ROOM_STORAGE_KEY, roomId);
}

export function clearStoredRoomId(): void {
  if (typeof sessionStorage === "undefined") return;
  sessionStorage.removeItem(ROOM_STORAGE_KEY);
}
