import { Room } from "colyseus";
import { Schema, type } from "@colyseus/schema";

export class GameState extends Schema {
  @type("number") tick = 0;
}

export class GameRoom extends Room<GameState> {
  onCreate() {
    this.setState(new GameState());
  }

  onJoin() {
    // TODO: game logic
  }

  onLeave() {
    // TODO: cleanup
  }
}
