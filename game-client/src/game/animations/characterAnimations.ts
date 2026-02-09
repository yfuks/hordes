/**
 * Registers character atlas animations (idle, walk, special) for down, up, side.
 * Used by the Game scene for the placeholder / player sprite.
 */
export function registerCharacterAnimations(scene: Phaser.Scene): void {
  const walkRate = 8;
  const idleRate = 6;
  const specialRate = 10;
  const atlas = "character";

  const dirs = [
    { key: "D", name: "down" },
    { key: "U", name: "up" },
    { key: "S", name: "side" },
  ] as const;

  for (const { key, name } of dirs) {
    if (!scene.anims.exists(`idle-${name}`)) {
      scene.anims.create({
        key: `idle-${name}`,
        frames: scene.anims.generateFrameNames(atlas, { prefix: `${key}_Idle_`, start: 0, end: 3 }),
        frameRate: idleRate,
        repeat: -1,
      });
    }
    if (!scene.anims.exists(`walk-${name}`)) {
      scene.anims.create({
        key: `walk-${name}`,
        frames: scene.anims.generateFrameNames(atlas, { prefix: `${key}_Walk_`, start: 0, end: 5 }),
        frameRate: walkRate,
        repeat: -1,
      });
    }
    if (!scene.anims.exists(`special-${name}`)) {
      scene.anims.create({
        key: `special-${name}`,
        frames: scene.anims.generateFrameNames(atlas, { prefix: `${key}_Special_`, start: 0, end: 5 }),
        frameRate: specialRate,
        repeat: 0,
      });
    }
  }
}
