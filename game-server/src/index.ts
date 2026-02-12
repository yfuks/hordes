import { config } from "dotenv";
import express from "express";
import { createServer } from "http";
import { Server } from "colyseus";
import { WebSocketTransport } from "@colyseus/ws-transport";
import { monitor } from "@colyseus/monitor";
import { LobbyRoom } from "./rooms/LobbyRoom.js";
import { GameRoom } from "./rooms/GameRoom.js";

config();

const port = Number(process.env.PORT ?? 2567);
const app = express();
const httpServer = createServer(app);
const gameServer = new Server({
  transport: new WebSocketTransport({ server: httpServer }),
});

// Register rooms
gameServer.define("lobby", LobbyRoom).enableRealtimeListing();
gameServer.define("game", GameRoom);

app.use("/colyseus", monitor());
gameServer.listen(port);

console.log(`[GameServer] Listening on http://localhost:${port}`);
