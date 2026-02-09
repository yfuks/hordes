import { Scene } from 'phaser';

export class Preloader extends Scene {
  constructor() {
    super('Preloader');
  }

  init() {
    this.add.image(512, 384, 'background');
    this.add.rectangle(512, 384, 468, 32).setStrokeStyle(1, 0xffffff);
    const bar = this.add.rectangle(512 - 230, 384, 4, 28, 0xffffff);
    this.load.on('progress', (progress: number) => {
      bar.width = 4 + 460 * progress;
    });
  }

  preload() {
    this.load.setPath('assets');
    this.load.image('logo', 'logo.png');
    // Ground tilesets from Craftpix village pack (8×8 tiles, 32×32 each)
    this.load.image('ground-tiles', 'ground-tiles.png');
    this.load.image('ground-tiles-2', 'ground-tiles-2.png');
    // Single character atlas: D/U/S × Idle/Walk/Special (Craftpix pixel citizens)
    this.load.atlas('character', 'character-atlas.png', 'character-atlas.json');
  }

  create() {
    this.scene.start('MainMenu');
  }
}
