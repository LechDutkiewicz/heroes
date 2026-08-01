import Phaser from 'phaser';
import { BattleScene } from './scenes/BattleScene';

new Phaser.Game({
  type: Phaser.AUTO,
  parent: 'app',
  width: 800,
  height: 770,
  backgroundColor: '#0d1023',
  scene: [BattleScene],
});
