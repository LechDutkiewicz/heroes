import Phaser from 'phaser';
import { sledzScene } from '../dev/dziennik';

/** Ekran kampanii — szkielet, wypełnia builder ekranu kampanii. */
export class KampaniaScene extends Phaser.Scene {
  constructor() {
    super('kampania');
  }

  create() {
    sledzScene(this);
    this.add
      .text(this.scale.width / 2, this.scale.height / 2, 'kampania', { fontSize: '32px', color: '#ffffff' })
      .setOrigin(0.5);
  }
}
