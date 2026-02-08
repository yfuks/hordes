/** Message types and payloads for client-server communication */
export type ClientMessage =
  | { type: "ACTION"; action: string; target?: string }
  | { type: "APPEARANCE_SELECT"; appearance: Record<string, string> };

export type ServerMessage =
  | { type: "STATE"; payload: unknown }
  | { type: "ERROR"; message: string };
