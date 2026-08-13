import Phaser from 'phaser';
import { BattleScene, SCENE_H } from './scenes/BattleScene';
import { AdventureScene } from './scenes/AdventureScene';
import { TownScene } from './scenes/TownScene';
import { wlaczDziennik, wysiejZiarno } from './dev/dziennik';

// Który ekran otworzyć. Domyślnie bitwa, bo tak wchodzą wszystkie narzędzia
// pomiarowe (zrzuty, test dymny, sondy) i nie chcę ich unieważniać, zanim
// mapa przygody będzie skończona. `?ekran=mapa` otwiera mapę przygody.
const ekran = new URLSearchParams(location.search).get('ekran');

// Dziennik startuje przed grą, żeby złapać też błędy z jej rozruchu
// (brakująca tekstura, nieudany WebGL) i żeby ziarno sesji było ustalone,
// zanim cokolwiek z niego skorzysta — dzięki niemu zgłoszony błąd da się
// powtórzyć adresem `?seed=…`.
wlaczDziennik({
  kontekst: {
    sceny: () => game.scene.getScenes(true).map((s) => s.scene.key),
    fps: () => game.loop.actualFps,
  },
});

const game = new Phaser.Game({
  type: Phaser.AUTO,
  parent: 'app',
  width: 960,
  // Wysokość liczona z geometrii układu (górna belka + plansza + dolny pasek),
  // a nie wpisana na oko: patrz SCENE_H w BattleScene.
  height: SCENE_H,
  backgroundColor: '#0d1023',
  scene:
    ekran === 'mapa'
      ? [AdventureScene, BattleScene, TownScene]
      : [BattleScene, AdventureScene, TownScene],
});

// Most dla narzędzia do zrzutów (tools/capture.mjs). Pozwala ustawić bitwę
// w powtarzalny stan i złapać konkretną klatkę animacji, zamiast zgadywać
// klikaniem. Nie wpływa na grę, dopóki nikt po nim nie sięgnie.
(window as unknown as { __game: Phaser.Game }).__game = game;

// Generator Phasera istnieje dopiero teraz, więc ziarno sesji wysiewamy po
// utworzeniu gry — a jeszcze przed pierwszą sceną, która z niego korzysta.
wysiejZiarno((z) => Phaser.Math.RND.sow([String(z)]));
