import { Room } from "colyseus";
import { Schema, type } from "@colyseus/schema";
import { generateMap, MAP_WIDTH, MAP_HEIGHT } from "../systems/mapGenerator.js";

/** Map payload sent once per client on join (not in state – best practice for large static data). */
export interface MapPayload {
  mapWidth: number;
  mapHeight: number;
  groundTiles: number[];
}

export class GameState extends Schema {
  @type("number") tick = 0;
}

export class GameRoom extends Room<GameState> {
  /** Map generated once; sent to each client on join via message. */
  private mapPayload!: MapPayload;

  onCreate() {
    this.setState(new GameState());
    const tiles = generateMap(this.roomId);
    this.mapPayload = {
      mapWidth: MAP_WIDTH,
      mapHeight: MAP_HEIGHT,
      groundTiles: tiles,
    };
    this.onMessage("requestMap", (client: { send: (type: string, payload: unknown) => void }) => {
      client.send("map", this.mapPayload);
    });
  }

  onJoin(client: { send: (type: string, payload: unknown) => void }) {
    client.send("map", this.mapPayload);
  }

  onLeave() {
    // TODO: cleanup
  }
}
