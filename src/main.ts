import Phaser from 'phaser';
import { BattleScene } from './scenes/BattleScene';

const game = new Phaser.Game({
  type: Phaser.AUTO,
  parent: 'app',
  width: 960,
  height: 850,
  backgroundColor: '#0d1023',
  scene: [BattleScene],
});

// Most dla narzędzia do zrzutów (tools/capture.mjs). Pozwala ustawić bitwę
// w powtarzalny stan i złapać konkretną klatkę animacji, zamiast zgadywać
// klikaniem. Nie wpływa na grę, dopóki nikt po nim nie sięgnie.
(window as unknown as { __game: Phaser.Game }).__game = game;
