import Phaser from 'phaser';
import { BattleScene } from './scenes/BattleScene';

new Phaser.Game({
  type: Phaser.AUTO,
  parent: 'app',
  width: 880,
  height: 640,
  backgroundColor: '#1a1a2e',
  scene: [BattleScene],
});
