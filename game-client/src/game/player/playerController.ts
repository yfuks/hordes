export interface PlayerController {
  /** The placeholder character (simple circle). */
  player: Phaser.GameObjects.Graphics;
}

export function createPlayerController(scene: Phaser.Scene): PlayerController {
  const camera = scene.cameras.main;
  const worldX = camera.width / 2;
  const worldY = camera.height / 2;

  // Simple placeholder: a circle
  const player = scene.add.graphics();
  player.fillStyle(0x00ff00, 1);
  player.fillCircle(0, 0, 16);
  player.setPosition(worldX, worldY);
  player.setDepth(100);

  return { player };
}
