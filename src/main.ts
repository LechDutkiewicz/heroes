import Phaser from 'phaser';
import { BattleScene, SCENE_H } from './scenes/BattleScene';
import { AdventureScene } from './scenes/AdventureScene';
import { TownScene } from './scenes/TownScene';
import { HeroScene } from './scenes/HeroScene';
import { MenuScene } from './scenes/MenuScene';
import { KampaniaScene } from './scenes/KampaniaScene';
import { WynikScene } from './scenes/WynikScene';
import { wlaczDziennik, wysiejZiarno } from './dev/dziennik';
import { rozpocznijMisje } from './data/kampania-start';
import { misjaPoId, nowyPostep } from './data/kampania';
import { pokazWersje } from './wersja';

// Który ekran otworzyć. Domyślnie menu główne, jak w każdej grze.
// `?ekran=bitwa` otwiera od razu bitwę — tak wchodzą narzędzia pomiarowe
// (zrzuty, test dymny, sondy walki); `?ekran=mapa` otwiera mapę przygody,
// `?ekran=kampania` ekran kampanii.
const ekran = new URLSearchParams(location.search).get('ekran');

// Dziennik startuje przed grą, żeby złapać też błędy z jej rozruchu
// (brakująca tekstura, nieudany WebGL) i żeby ziarno sesji było ustalone,
// zanim cokolwiek z niego skorzysta — dzięki niemu zgłoszony błąd da się
// powtórzyć adresem `?seed=…`.
// Podpis wersji w rogu strony — żeby było widać, czy przeglądarka pokazuje
// najnowsze wydanie, czy stare z pamięci podręcznej.
pokazWersje();

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
  // Pierwsza scena na liście startuje sama; reszta czeka na `scene.start`.
  scene: (() => {
    const wszystkie = {
      menu: MenuScene,
      bitwa: BattleScene,
      mapa: AdventureScene,
      kampania: KampaniaScene,
    } as const;
    const pierwsza = wszystkie[(ekran ?? 'menu') as keyof typeof wszystkie] ?? MenuScene;
    return [
      pierwsza,
      ...[MenuScene, BattleScene, AdventureScene, KampaniaScene, TownScene, HeroScene, WynikScene].filter(
        (s) => s !== pierwsza
      ),
    ];
  })(),
});

// Most dla narzędzia do zrzutów (tools/capture.mjs). Pozwala ustawić bitwę
// w powtarzalny stan i złapać konkretną klatkę animacji, zamiast zgadywać
// klikaniem. Nie wpływa na grę, dopóki nikt po nim nie sięgnie.
(window as unknown as { __game: Phaser.Game }).__game = game;
// Drugi most, dla sond kampanii (`tools/probe-misja.mjs`): start misji tą samą
// funkcją, której używa gra, zamiast składania stanu misji ręcznie w sondzie.
(window as unknown as { __kampania: object }).__kampania = { rozpocznijMisje, misjaPoId, nowyPostep };

// Generator Phasera istnieje dopiero teraz, więc ziarno sesji wysiewamy po
// utworzeniu gry — a jeszcze przed pierwszą sceną, która z niego korzysta.
wysiejZiarno((z) => Phaser.Math.RND.sow([String(z)]));
