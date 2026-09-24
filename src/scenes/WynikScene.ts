import Phaser from 'phaser';
import { sledzScene } from '../dev/dziennik';

/** Ekran wyniku misji (zwycięstwo, porażka, koniec kampanii) — szkielet. */
export class WynikScene extends Phaser.Scene {
  constructor() {
    super('wynik');
  }

  create() {
    sledzScene(this);
    this.add
      .text(this.scale.width / 2, this.scale.height / 2, 'wynik', { fontSize: '32px', color: '#ffffff' })
      .setOrigin(0.5);
  }
}
