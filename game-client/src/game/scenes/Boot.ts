import { Scene } from 'phaser';

export class Boot extends Scene
{
    constructor ()
    {
        super('Boot');
    }

    preload ()
    {
        //  No assets to load - using placeholders
    }

    create ()
    {
        this.scene.start('Preloader');
    }
}
