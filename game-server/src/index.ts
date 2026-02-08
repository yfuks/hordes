import { config } from "dotenv";
import express from "express";
import { createServer } from "http";
import { Server } from "colyseus";
import { monitor } from "@colyseus/monitor";
import { GameRoom } from "./rooms/GameRoom.js";

config();

const port = Number(process.env.PORT ?? 2567);
const app = express();
const httpServer = createServer(app);
const gameServer = new Server({ server: httpServer });

gameServer.define("game", GameRoom);
app.use("/colyseus", monitor());
gameServer.listen(port);

console.log(`[GameServer] Listening on http://localhost:${port}`);
