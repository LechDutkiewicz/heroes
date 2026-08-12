import Phaser from 'phaser';
import { BattleScene, SCENE_H } from './scenes/BattleScene';
import { AdventureScene } from './scenes/AdventureScene';

// Który ekran otworzyć. Domyślnie bitwa, bo tak wchodzą wszystkie narzędzia
// pomiarowe (zrzuty, test dymny, sondy) i nie chcę ich unieważniać, zanim
// mapa przygody będzie skończona. `?ekran=mapa` otwiera mapę przygody.
const ekran = new URLSearchParams(location.search).get('ekran');

const game = new Phaser.Game({
  type: Phaser.AUTO,
  parent: 'app',
  width: 960,
  // Wysokość liczona z geometrii układu (górna belka + plansza + dolny pasek),
  // a nie wpisana na oko: patrz SCENE_H w BattleScene.
  height: SCENE_H,
  backgroundColor: '#0d1023',
  scene: ekran === 'mapa' ? [AdventureScene, BattleScene] : [BattleScene, AdventureScene],
});

// Most dla narzędzia do zrzutów (tools/capture.mjs). Pozwala ustawić bitwę
// w powtarzalny stan i złapać konkretną klatkę animacji, zamiast zgadywać
// klikaniem. Nie wpływa na grę, dopóki nikt po nim nie sięgnie.
(window as unknown as { __game: Phaser.Game }).__game = game;
