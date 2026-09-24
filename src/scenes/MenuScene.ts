import Phaser from 'phaser';
import { sledzScene } from '../dev/dziennik';

/** Menu główne — szkielet, wypełnia builder menu. */
export class MenuScene extends Phaser.Scene {
  constructor() {
    super('menu');
  }

  create() {
    sledzScene(this);
    this.add
      .text(this.scale.width / 2, this.scale.height / 2, 'menu', { fontSize: '32px', color: '#ffffff' })
      .setOrigin(0.5);
  }
}
