import { TILE_SIZE } from "../assets/tileset";

/** Character facing direction for idle/special. */
export type CharacterDirection = "down" | "up" | "side";

/** Movement speed in world pixels per second */
const PLAYER_SPEED = 80;
/** Idle delay range (ms) before special can trigger. */
const IDLE_SPECIAL_MIN_MS = 4000;
const IDLE_SPECIAL_MAX_MS = 8000;

export interface PlayerControllerCallbacks {
  /** Called when movement to a tile finishes (for clearing tile highlight). */
  onMoveComplete?: (tileX: number, tileY: number) => void;
}

export interface PlayerController {
  /** The placeholder character container (sprite inside). */
  player: Phaser.GameObjects.Container;
  /** Move the player to the center of the given tile. */
  moveToTile: (tileX: number, tileY: number) => void;
}

export function createPlayerController(
  scene: Phaser.Scene,
  groundLayer: Phaser.Tilemaps.TilemapLayer,
  callbacks: PlayerControllerCallbacks = {}
): PlayerController {
  const { onMoveComplete } = callbacks;
  let moveTween: Phaser.Tweens.Tween | null = null;
  let lastDirection: CharacterDirection = "down";
  let facingRight = false;
  let isPlayingSpecial = false;
  let idleSpecialTimer: Phaser.Time.TimerEvent | null = null;

  const mapWidth = groundLayer.width;
  const mapHeight = groundLayer.height;
  const camera = scene.cameras.main;
  const cx = mapWidth / 2;
  const cy = mapHeight / 2;
  const offsetX = camera.width / 2 - cx * TILE_SIZE - TILE_SIZE / 2;
  const offsetY = camera.height / 2 - cy * TILE_SIZE - TILE_SIZE / 2;
  const worldX = offsetX + cx * TILE_SIZE + TILE_SIZE / 2;
  const worldY = offsetY + cy * TILE_SIZE + TILE_SIZE / 2;

  const sprite = scene.add.sprite(0, 0, "character", "D_Idle_0");
  sprite.setOrigin(0.5, 1);

  const player = scene.add.container(worldX, worldY, [sprite]);
  player.setDepth(worldY);

  function getTileCenterWorldXY(tileX: number, tileY: number): { x: number; y: number } {
    const worldXY = groundLayer.tileToWorldXY(tileX, tileY);
    return {
      x: worldXY.x + TILE_SIZE / 2,
      y: worldXY.y + TILE_SIZE / 2,
    };
  }

  function playIdle() {
    const s = player.list[0] as Phaser.GameObjects.Sprite;
    if (!s?.play) return;
    s.setFlipX(lastDirection === "side" && facingRight);
    s.play(`idle-${lastDirection}`);
  }

  function startIdleSpecialTimer() {
    if (idleSpecialTimer) return;
    const delay =
      IDLE_SPECIAL_MIN_MS + Math.random() * (IDLE_SPECIAL_MAX_MS - IDLE_SPECIAL_MIN_MS);
    idleSpecialTimer = scene.time.delayedCall(delay, () => {
      idleSpecialTimer = null;
      playSpecial();
    });
  }

  function stopIdleSpecialTimer() {
    if (idleSpecialTimer) {
      idleSpecialTimer.destroy();
      idleSpecialTimer = null;
    }
  }

  function playSpecial() {
    if (isPlayingSpecial) return;
    const s = player.list[0] as Phaser.GameObjects.Sprite;
    if (!s?.play) return;
    isPlayingSpecial = true;
    s.setFlipX(lastDirection === "side" && facingRight);
    s.play(`special-${lastDirection}`);
    s.once(Phaser.Animations.Events.ANIMATION_COMPLETE, () => {
      isPlayingSpecial = false;
      playIdle();
      startIdleSpecialTimer();
    });
  }

  function moveToTile(tileX: number, tileY: number) {
    const { x: targetX, y: targetY } = getTileCenterWorldXY(tileX, tileY);
    const dx = targetX - player.x;
    const dy = targetY - player.y;
    const distance = Math.sqrt(dx * dx + dy * dy);
    if (distance < 1) return;

    stopIdleSpecialTimer();
    if (moveTween) moveTween.stop();

    const duration = (distance / PLAYER_SPEED) * 1000;

    const isHorizontal = Math.abs(dx) > Math.abs(dy);
    if (isHorizontal) {
      lastDirection = "side";
      facingRight = dx > 0;
    } else if (dy < 0) {
      lastDirection = "up";
      facingRight = false;
    } else {
      lastDirection = "down";
      facingRight = false;
    }

    const s = player.list[0] as Phaser.GameObjects.Sprite;
    if (s?.play) {
      s.setFlipX(lastDirection === "side" && facingRight);
      s.play(`walk-${lastDirection}`);
    }

    moveTween = scene.tweens.add({
      targets: player,
      x: targetX,
      y: targetY,
      duration,
      ease: "Linear",
      onUpdate: () => player.setDepth(player.y),
      onComplete: () => {
        moveTween = null;
        playIdle();
        startIdleSpecialTimer();
        onMoveComplete?.(tileX, tileY);
      },
    });
  }

  // Start idle special timer
  startIdleSpecialTimer();

  return { player, moveToTile };
}
