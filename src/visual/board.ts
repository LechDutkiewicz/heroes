/**
 * Plansza bitwy: tło za planszą, podłoże, siatka hexów, rama i podświetlenia pól.
 *
 * Wydzielone z BattleScene, bo scena i tak jest przeładowana logiką walki, a
 * plansza to zamknięty kawałek rysowania — nic tu nie wie o oddziałach.
 *
 * Reguła przewodnia zdjęta z wzorca (Sync Grid w Pokémon Masters EX): hex nie
 * jest konturem o grubości piksela. Jest bryłą — ma miękkie wypełnienie
 * gęstniejące ku krawędzi, wyraźny kolorowy brzeg i poświatę wokół. Dlatego
 * każde pole rysujemy kilkoma nakładającymi się warstwami zamiast jedną linią:
 * Graphics nie umie gradientu na wielokącie, a warstwy dają ten sam efekt.
 */

import Phaser from 'phaser';
import { COLS, ROWS } from '../data/battle';
import { C, E, T, Z } from './theme';
import { TUSZ, panelBialy, tloWalki } from './stylWalki';

// ---------- geometria (nie ruszać — reszta gry na niej stoi) ----------
// Układ „odd-r": hexy stoją wierzchołkiem do góry, a nieparzyste rzędy są
// przesunięte o pół hexa w prawo.

// Wymiary planszy są zasadą walki, więc pochodzą z `data/battle.ts`.
export { COLS, ROWS };
/** promień hexa: od środka do wierzchołka (pole z bajki: 8 × 5, większe heksy) */
export const HEX_R = 54;
export const HEX_W = Math.sqrt(3) * HEX_R;
export const HEX_H = 2 * HEX_R;
/** pionowy odstęp między rzędami — hexy zazębiają się, stąd 3/4 wysokości */
export const ROW_STEP = HEX_R * 1.5;

export const BOARD_W = HEX_W * (COLS + 0.5);
export const BOARD_X = Math.round((960 - BOARD_W) / 2);
export const BOARD_Y = 100;
export const BOARD_H = ROW_STEP * (ROWS - 1) + HEX_H;

/** Nic w bajce nie ma ostrego rogu — plansza też nie. */
const BOARD_RADIUS = 22;

export function cellToXY(col: number, row: number) {
  return {
    x: BOARD_X + HEX_W / 2 + col * HEX_W + (row & 1 ? HEX_W / 2 : 0),
    y: BOARD_Y + HEX_R + row * ROW_STEP,
  };
}

/** Sześć wierzchołków hexa wokół podanego środka. */
export function hexPoints(cx: number, cy: number, r: number = HEX_R) {
  const pts: Phaser.Math.Vector2[] = [];
  for (let i = 0; i < 6; i++) {
    const a = Phaser.Math.DegToRad(60 * i - 90);
    pts.push(new Phaser.Math.Vector2(cx + r * Math.cos(a), cy + r * Math.sin(a)));
  }
  return pts;
}

/**
 * Mieszanie barw w locie. Dzięki temu odcienie tła wyprowadzamy z tokenów
 * motywu, zamiast dopisywać obok nich kolejne wartości na sztywno.
 */
function mix(a: number, b: number, t: number) {
  const chan = (shift: number) => {
    const av = (a >> shift) & 0xff;
    const bv = (b >> shift) & 0xff;
    return Math.round(av + (bv - av) * t) << shift;
  };
  return chan(16) | chan(8) | chan(0);
}

/**
 * Jedno źródło światła dla całej planszy: chłodne niebo z góry, chłodny cień
 * u dołu. Oba odcienie są zimne, także cień — dzięki temu ciepła łąka i zimny
 * śnieg trafiają pod to samo światło i przestają być dwiema różnymi paletami.
 * To jest ten „akcent porządkujący": błękit rządzi planszą, a złoto zostaje
 * zarezerwowane wyłącznie na to, co gracz ma zaraz zrobić.
 */
const LIGHT = mix(C.white, C.skyTop, 0.35);
const SHADE = mix(C.shadow, C.panelDeep, 0.4);

/** Połowa szerokości hexa na wysokości dy od jego środka. */
function hexHalfWidth(dy: number, r: number) {
  const half = (Math.sqrt(3) * r) / 2;
  const a = Math.abs(dy);
  return a <= r / 2 ? half : (half * (r - a)) / (r / 2);
}

interface HexFill {
  /** równomierna mgiełka na całym polu — to ona robi z hexa bryłę, nie dziurę */
  veil?: number;
  base?: number;
  /** barwa i moc rozjaśnienia u góry pola */
  light?: number;
  lightAlpha?: number;
  /** barwa i moc ściemnienia u dołu */
  dark?: number;
  darkAlpha?: number;
  r?: number;
}

/**
 * Wypełnienie hexa gradientem. Graphics nie umie gradientu na wielokącie, więc
 * kroimy pole na poziome pasy i każdy dostaje własną alfę — u góry rozjaśnienie,
 * u dołu ściemnienie, w połowie nic. Stąd bierze się kierunek światła: pole
 * wygląda na wypukłe, a nie na płaską plamę.
 */
function gradientHex(g: Phaser.GameObjects.Graphics, cx: number, cy: number, o: HexFill) {
  const r = o.r ?? HEX_R;

  if (o.veil) {
    g.fillStyle(o.base ?? LIGHT, o.veil);
    g.fillPoints(hexPoints(cx, cy, r), true);
  }

  const steps = 14;
  for (let i = 0; i < steps; i++) {
    const t = (i + 0.5) / steps;
    const up = t < 0.5;
    const alpha = up
      ? (o.lightAlpha ?? 0) * (1 - t * 2)
      : (o.darkAlpha ?? 0) * (t - 0.5) * 2;
    if (alpha <= 0.004) continue;

    const y0 = -r + (2 * r * i) / steps;
    // Pasy zachodzą na siebie o pół piksela, inaczej wygładzanie zostawia
    // między nimi jasne szpary.
    const y1 = -r + (2 * r * (i + 1)) / steps + 0.6;
    const h0 = hexHalfWidth(y0, r);
    const h1 = hexHalfWidth(y1, r);

    g.fillStyle(up ? (o.light ?? LIGHT) : (o.dark ?? SHADE), alpha);
    g.fillPoints(
      [
        new Phaser.Math.Vector2(cx - h0, cy + y0),
        new Phaser.Math.Vector2(cx + h0, cy + y0),
        new Phaser.Math.Vector2(cx + h1, cy + y1),
        new Phaser.Math.Vector2(cx - h1, cy + y1),
      ],
      true
    );
  }
}

/**
 * Fazka na krawędzi. Trzy górne boki dostają jasną nitkę, trzy dolne ciemną —
 * ta sama sztuczka, którą wytłacza się kafle w grach z rzutem izometrycznym.
 * Bez niej hex jest tylko obrysem, z nią ma grubość.
 */
function bevel(
  g: Phaser.GameObjects.Graphics,
  cx: number,
  cy: number,
  r: number,
  lightAlpha: number,
  darkAlpha: number
) {
  const p = hexPoints(cx, cy, r);
  g.lineStyle(1.8, LIGHT, lightAlpha);
  g.strokePoints([p[4], p[5], p[0], p[1]], false);
  g.lineStyle(1.8, SHADE, darkAlpha);
  g.strokePoints([p[1], p[2], p[3], p[4]], false);
}

// ---------- tło za planszą ----------

/** Tło ekranu walki — styl z gier Pokémon (`stylWalki.ts`). */
export function drawBackground(scene: Phaser.Scene) {
  // Styl z gier Pokémon (makieta A): jasne tło w kropki i belka-pokeball.
  tloWalki(scene, Z.sky);
}

// ---------- podłoże, siatka, rama ----------

/**
 * Maska w kształcie planszy — trzyma teren i warstwę detalu w zaokrąglonych
 * rogach zamiast pozwalać im wyjść pod ramę. Wspólna, bo maski geometryczne
 * można dzielić między obiektami, a każda kosztuje osobne przejście stencilem.
 */
const MASKS = new WeakMap<Phaser.Scene, Phaser.Display.Masks.GeometryMask>();

export function boardMask(scene: Phaser.Scene) {
  let mask = MASKS.get(scene);
  if (!mask) {
    const cut = scene.make.graphics({}, false);
    cut.fillStyle(0xffffff, 1);
    cut.fillRoundedRect(BOARD_X, BOARD_Y, BOARD_W, BOARD_H, BOARD_RADIUS);
    mask = cut.createGeometryMask();
    MASKS.set(scene, mask);
  }
  return mask;
}

/** Rysuje całą planszę: cień, teren, winietę, siatkę hexów i ramę. */
export function drawBoard(scene: Phaser.Scene, terrainKey: string) {
  drawGroundShadow(scene);
  drawTerrain(scene, terrainKey);
  drawVignette(scene);
  drawGrid(scene);
  drawFrame(scene);
}

/**
 * Miękki cień pod planszą. Kilka warstw zamiast jednej: pojedynczy prostokąt
 * z alfą daje twardy kant, a plansza ma sprawiać wrażenie bryły leżącej nad tłem.
 */
function drawGroundShadow(scene: Phaser.Scene) {
  // Plansza w grubej białej ramie z obrysem tuszem — jak ekran w grze Pokémon.
  const rama = scene.add.graphics().setDepth(Z.board - 0.5);
  panelBialy(rama, BOARD_X - 10, BOARD_Y - 10, BOARD_W + 20, BOARD_H + 20, 18, { obrys: 4, cien: 5 });
}

/**
 * Krajobraz. Skalujemy „na pokrycie" i przycinamy maską do zaokrąglonego
 * prostokąta — obrazek jest większy niż plansza, więc idzie w dół, a to trzyma
 * go ostrym. Wcześniejsze rozciąganie do dokładnych wymiarów zmieniało
 * proporcje i widać było rozmycie.
 */
function drawTerrain(scene: Phaser.Scene, terrainKey: string) {
  const cx = BOARD_X + BOARD_W / 2;
  const cy = BOARD_Y + BOARD_H / 2;

  const img = scene.add.image(cx, cy, terrainKey).setDepth(Z.board);
  const k = Math.max(BOARD_W / img.width, BOARD_H / img.height);
  img.setScale(k);
  img.setMask(boardMask(scene));
  // Maska geometryczna w Phaserze 4 nie przycina obrazka — a obraz terenu
  // ma proporcje dawnej planszy (10 × 7) i wystawał nad i pod niższą planszę
  // z bajki (8 × 5). Przycinamy go więc wprost do prostokąta planszy.
  const cw = BOARD_W / k;
  const ch = BOARD_H / k;
  img.setCrop((img.width - cw) / 2, (img.height - ch) / 2, cw, ch);

  // Warstwa detalu: rozmyte plamy światła i cienia rozbijają gładź terenu,
  // która po przeskalowaniu robi się podejrzanie równa.
  const detail = scene.add.graphics().setDepth(Z.board + 0.1);
  detail.setMask(boardMask(scene));
  const rnd = new Phaser.Math.RandomDataGenerator([terrainKey]);
  for (let i = 0; i < 90; i++) {
    const x = BOARD_X + rnd.frac() * BOARD_W;
    const y = BOARD_Y + rnd.frac() * BOARD_H;
    const r = 12 + rnd.frac() * 46;
    detail.fillStyle(rnd.frac() > 0.5 ? C.white : C.shadow, 0.025);
    detail.fillEllipse(x, y, r * 2, r * 1.3);
  }
}

/**
 * Winieta i przyciemnienie dołu. Dwie role naraz: brzegi planszy schodzą
 * w cień, więc plansza wygląda na wypukłą, a napisy i paski HP nie giną na
 * jasnej trawie ani na śniegu.
 */
function drawVignette(scene: Phaser.Scene) {
  const g = scene.add.graphics().setDepth(Z.board + 0.2);

  g.fillGradientStyle(C.shadow, C.shadow, C.shadow, C.shadow, 0, 0, 0.28, 0.28);
  g.fillRect(BOARD_X, BOARD_Y + BOARD_H * 0.45, BOARD_W, BOARD_H * 0.55);

  const rings = 16;
  for (let i = 0; i < rings; i++) {
    g.lineStyle(4, C.shadow, 0.075 * (1 - i / rings));
    g.strokeRoundedRect(
      BOARD_X + i * 3.5,
      BOARD_Y + i * 3.5,
      BOARD_W - i * 7,
      BOARD_H - i * 7,
      Math.max(2, BOARD_RADIUS - i * 1.4)
    );
  }
}

/**
 * Siatka. Każde pole jest wypełnionym kaflem, nie obrysem: mgiełka na całej
 * powierzchni, gradient rozjaśniający górę i przyciemniający dół, ciemny obrys
 * i fazka. Obrys jest CIEMNIEJSZY od wypełnienia — jasna kreska na jasnym polu
 * czytała się jak drut naciągnięty nad planszą.
 *
 * Progi alfy są dobrane tak, żeby kafel był widoczny na jasnej łące i na
 * śniegu, a teren pod nim nadal się przebijał: rozjaśnienie u góry to ok. 15%,
 * ściemnienie u dołu ok. 12%.
 */
function drawGrid(scene: Phaser.Scene) {
  const g = scene.add.graphics().setDepth(Z.grid);

  for (let row = 0; row < ROWS; row++) {
    for (let col = 0; col < COLS; col++) {
      const { x, y } = cellToXY(col, row);
      // Kolumny startowe bez barwnej mgiełki — na ciepłym terenie czerwień
      // wroga czytała się jak pomarańczowy szew, a strony i tak odróżnia
      // barwa podestów pod stworkami.
      const zone = null;

      // Pole z bajki: teren ma być widać, siatka tylko go dzieli — jak
      // w Heroes 3 cienka, ciemna kreska, bez szklanych kafli. Kolumny
      // startowe lekko w barwach stron.
      gradientHex(g, x, y, {
        veil: zone ? 0.1 : 0.02,
        base: zone ?? LIGHT,
        lightAlpha: 0.08,
        darkAlpha: 0.08,
        r: HEX_R - 0.5,
      });

      g.lineStyle(1.6, 0x2a1606, 0.44);
      g.strokePoints(hexPoints(x, y, HEX_R - 1), true);
      bevel(g, x, y, HEX_R - 2.5, 0.22, 0.12);
    }
  }
}

/**
 * Rama. Trzy kanty jeden na drugim (ciemny spód, złota taśma, jasny błysk)
 * plus ćwieki w rogach — zwykły prostokąt z cieniem wyglądał jak obramowanie
 * okna, a nie jak brzeg pola bitwy.
 */
function drawFrame(scene: Phaser.Scene) {
  // Obrys tuszem na krawędzi pola — wnętrze białej ramy (`drawGroundShadow`).
  const obrys = scene.add.graphics().setDepth(Z.units - 0.1);
  obrys.lineStyle(3, TUSZ, 1);
  obrys.strokeRoundedRect(BOARD_X - 1.5, BOARD_Y - 1.5, BOARD_W + 3, BOARD_H + 3, 10);
}

// ---------- podświetlenia pól ----------

interface HexPaint {
  /** siła barwnej mgiełki na całym polu */
  veil: number;
  /** obrys — zawsze ciemna odmiana barwy pola, nigdy jaśniejsza od wypełnienia */
  edge: number;
  /** poświata na zewnątrz pola */
  glow?: number;
  /** biała aureola — w Masters ma ją pole właśnie wybrane */
  halo?: number;
}

/**
 * Podświetlone pole jest tym samym kaflem co reszta siatki, tylko przebarwionym:
 * ta sama mgiełka, ten sam gradient i ta sama fazka. Dzięki temu pola ruchu
 * układają się w planszę, zamiast leżeć na niej jako obca warstwa.
 */
function paintCell(
  g: Phaser.GameObjects.Graphics,
  col: number,
  row: number,
  color: number,
  deep: number,
  o: HexPaint
) {
  const { x, y } = cellToXY(col, row);

  if (o.glow) {
    g.lineStyle(12, color, o.glow * 0.28);
    g.strokePoints(hexPoints(x, y, HEX_R + 2), true);
  }
  if (o.halo) {
    g.lineStyle(5, C.white, o.halo);
    g.strokePoints(hexPoints(x, y, HEX_R + 3), true);
  }

  gradientHex(g, x, y, {
    veil: o.veil,
    base: color,
    light: mix(color, C.white, 0.7),
    lightAlpha: 0.22,
    dark: deep,
    darkAlpha: 0.2,
    r: HEX_R - 0.5,
  });

  g.lineStyle(2.5, deep, o.edge);
  g.strokePoints(hexPoints(x, y, HEX_R - 1), true);
  bevel(g, x, y, HEX_R - 3, o.edge * 0.55, o.edge * 0.35);
}

/** Pole, na które aktywny oddział może wejść. */
export function paintMoveCell(g: Phaser.GameObjects.Graphics, col: number, row: number) {
  // Jak w Heroes 3: zasięg ruchu to przyciemnione pola z jasnym brzegiem,
  // nie niebieska szyba — ta gryzła się z drewnem i złotą ramą.
  const { x, y } = cellToXY(col, row);
  g.fillStyle(0x1a0c03, 0.2);
  g.fillPoints(hexPoints(x, y, HEX_R - 1), true);
  g.lineStyle(2, 0xf8e6b8, 0.55);
  g.strokePoints(hexPoints(x, y, HEX_R - 2.5), true);
}

/**
 * Cel ataku. Osłabiony strzał dostaje złoto zamiast czerwieni — kolor niesie
 * ostrzeżenie, więc gracz nie musi czytać prognozy, żeby je zauważyć.
 */
export function paintAttackCell(
  g: Phaser.GameObjects.Graphics,
  col: number,
  row: number,
  weakened: boolean
) {
  paintCell(g, col, row, weakened ? C.gold : C.foe, weakened ? C.goldDeep : C.foeDeep, {
    veil: weakened ? 0.22 : 0.28,
    edge: 0.95,
    glow: 0.45,
  });
}

/** Zasięg oddziału, na którego patrzy kursor — słabszy, żeby nie mylił się z ruchem. */
export function paintPreviewCell(
  g: Phaser.GameObjects.Graphics,
  col: number,
  row: number,
  color: number
) {
  paintCell(g, col, row, color, color === C.ally ? C.allyDeep : C.foeDeep, {
    veil: 0.1,
    edge: 0.4,
  });
}

/** Pole, z którego padnie cios — najmocniej zaznaczone pole na planszy. */
export function paintApproachCell(g: Phaser.GameObjects.Graphics, col: number, row: number) {
  paintCell(g, col, row, C.gold, C.goldDeep, {
    veil: 0.34,
    edge: 1,
    glow: 0.5,
    halo: 0.55,
  });
}

/**
 * Oddech podświetleń. Ruch w tle sam ściąga wzrok, więc gracz od razu widzi,
 * że te pola są klikalne — a że to sama alfa, nic nie ucieka z siatki.
 */
export function pulse(scene: Phaser.Scene, target: Phaser.GameObjects.Graphics, min = 0.7) {
  scene.tweens.add({
    targets: target,
    alpha: { from: 1, to: min },
    duration: T.breath / 2,
    ease: E.soft,
    yoyo: true,
    repeat: -1,
  });
}

// ---------- przeszkody ----------

/**
 * Cień pod przeszkodą. Bez niego drzewo wygląda, jakby wisiało nad polem;
 * elipsa przyklejona do podstawy sadza je na ziemi.
 */
export function drawObstacleShadow(scene: Phaser.Scene, x: number, y: number, width: number) {
  const g = scene.add.graphics().setDepth(Z.grid + 0.1);
  g.setMask(boardMask(scene));
  // Zablokowane pole ciemniejsze, jak udeptana ziemia pod przeszkodą
  // w Heroes 3 — krytyk: przeszkoda nie czytała się jako „tu nie wejdziesz".
  g.fillStyle(C.shadow, 0.16);
  g.fillPoints(hexPoints(x, y, HEX_R - 1.5), true);
  for (let i = 3; i >= 1; i--) {
    g.fillStyle(C.shadow, 0.14);
    g.fillEllipse(x, y + 4, width * (0.6 + i * 0.12), width * (0.2 + i * 0.05));
  }
  return g;
}
