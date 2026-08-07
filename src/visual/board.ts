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
import { C, E, T, Z } from './theme';

// ---------- geometria (nie ruszać — reszta gry na niej stoi) ----------
// Układ „odd-r": hexy stoją wierzchołkiem do góry, a nieparzyste rzędy są
// przesunięte o pół hexa w prawo.

export const COLS = 10;
export const ROWS = 7;
/** promień hexa: od środka do wierzchołka */
export const HEX_R = 46;
export const HEX_W = Math.sqrt(3) * HEX_R;
export const HEX_H = 2 * HEX_R;
/** pionowy odstęp między rzędami — hexy zazębiają się, stąd 3/4 wysokości */
export const ROW_STEP = HEX_R * 1.5;

export const BOARD_X = 62;
export const BOARD_Y = 100;
export const BOARD_W = HEX_W * (COLS + 0.5);
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

// ---------- tło za planszą ----------

/**
 * Tło ma dawać głębię, ale nie kraść uwagi: plansza jest jasna, więc otoczenie
 * schodzi w przygaszony błękit. Czysty granat z poprzedniej wersji wyglądał jak
 * pusty ekran ładowania.
 */
export function drawBackground(scene: Phaser.Scene) {
  const w = scene.scale.width;
  const h = scene.scale.height;
  const g = scene.add.graphics().setDepth(Z.sky);

  const top = mix(C.skyBottom, C.shadow, 0.42);
  const bottom = mix(C.shadow, C.panelDeep, 0.3);
  g.fillGradientStyle(top, top, bottom, bottom, 1);
  g.fillRect(0, 0, w, h);

  // Ukośne smugi światła — w Masters tłem paneli są właśnie takie pasy, dzięki
  // nim płaszczyzna przestaje być martwa.
  for (let i = -2; i < 6; i++) {
    const x = i * 260;
    g.fillStyle(C.skyTop, 0.035);
    g.fillPoints(
      [
        new Phaser.Math.Vector2(x, 0),
        new Phaser.Math.Vector2(x + 120, 0),
        new Phaser.Math.Vector2(x + 120 - h * 0.45, h),
        new Phaser.Math.Vector2(x - h * 0.45, h),
      ],
      true
    );
  }

  // Znak wodny z hexów: zapowiada kształt planszy, zanim wzrok na nią spadnie.
  const wr = 62;
  const stepX = Math.sqrt(3) * wr;
  const stepY = wr * 1.5;
  for (let row = -1; row * stepY < h + wr; row++) {
    for (let col = -1; col * stepX < w + stepX; col++) {
      const x = col * stepX + (row & 1 ? stepX / 2 : 0);
      const y = row * stepY;
      g.lineStyle(2, C.skyTop, 0.05);
      g.strokePoints(hexPoints(x, y, wr - 4), true);
    }
  }

  // Poświata dokładnie za planszą — plansza ma wyglądać na podświetloną od tyłu,
  // a nie doklejoną do tła.
  for (let i = 12; i >= 1; i--) {
    g.fillStyle(C.skyTop, 0.012);
    g.fillRoundedRect(
      BOARD_X - i * 8,
      BOARD_Y - i * 8,
      BOARD_W + i * 16,
      BOARD_H + i * 16,
      BOARD_RADIUS + i * 7
    );
  }
}

// ---------- podłoże, siatka, rama ----------

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
  const g = scene.add.graphics().setDepth(Z.board);
  for (let i = 9; i >= 1; i--) {
    g.fillStyle(C.shadow, 0.05);
    g.fillRoundedRect(
      BOARD_X - i * 1.6,
      BOARD_Y - i * 1.6 + i * 2.6,
      BOARD_W + i * 3.2,
      BOARD_H + i * 3.2,
      BOARD_RADIUS + i * 1.6
    );
  }
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
  img.setScale(Math.max(BOARD_W / img.width, BOARD_H / img.height));

  const cut = scene.make.graphics({}, false);
  cut.fillStyle(0xffffff, 1);
  cut.fillRoundedRect(BOARD_X, BOARD_Y, BOARD_W, BOARD_H, BOARD_RADIUS);
  img.setMask(cut.createGeometryMask());

  // Warstwa detalu: rozmyte plamy światła i cienia rozbijają gładź terenu,
  // która po przeskalowaniu robi się podejrzanie równa.
  const detail = scene.add.graphics().setDepth(Z.board + 0.1);
  detail.setMask(cut.createGeometryMask());
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
 * Siatka. Zamiast jednej białej linii 1px rysujemy hex trzema przejściami:
 * ciemny kontur przesunięty o półtora piksela w dół robi cień pod krawędzią,
 * szeroka jasna linia daje poświatę, cienka — czysty brzeg. Z tego bierze się
 * wrażenie, że pola są wytłoczone w podłożu.
 */
function drawGrid(scene: Phaser.Scene) {
  const g = scene.add.graphics().setDepth(Z.grid);

  for (let row = 0; row < ROWS; row++) {
    for (let col = 0; col < COLS; col++) {
      const { x, y } = cellToXY(col, row);

      // Strefy startowe obu armii — czytelne od pierwszej sekundy, kto skąd wchodzi.
      if (col === 0 || col === COLS - 1) {
        const side = col === 0 ? C.ally : C.foe;
        g.fillStyle(side, 0.14);
        g.fillPoints(hexPoints(x, y, HEX_R - 2), true);
        g.lineStyle(12, side, 0.08);
        g.strokePoints(hexPoints(x, y, HEX_R - 8), true);
      }

      g.lineStyle(3, C.shadow, 0.16);
      g.strokePoints(hexPoints(x, y + 1.5), true);
      g.lineStyle(6, C.white, 0.05);
      g.strokePoints(hexPoints(x, y), true);
      g.lineStyle(2.5, C.white, 0.14);
      g.strokePoints(hexPoints(x, y), true);
      g.lineStyle(1, C.white, 0.3);
      g.strokePoints(hexPoints(x, y - 1, HEX_R - 1), true);
    }
  }
}

/**
 * Rama. Trzy kanty jeden na drugim (ciemny spód, złota taśma, jasny błysk)
 * plus ćwieki w rogach — zwykły prostokąt z cieniem wyglądał jak obramowanie
 * okna, a nie jak brzeg pola bitwy.
 */
function drawFrame(scene: Phaser.Scene) {
  // Nad podświetleniami, żeby żadne pole nie wylewało się poza krawędź.
  const g = scene.add.graphics().setDepth(Z.units - 0.1);

  const outer = (inset: number, radius: number) =>
    g.strokeRoundedRect(BOARD_X + inset, BOARD_Y + inset, BOARD_W - inset * 2, BOARD_H - inset * 2, radius);

  // Rama wychodzi poza planszę tylko o kilka pikseli: wyżej zaczyna się już
  // wiersz stanu tury, a plansza nie może go przykryć.
  g.lineStyle(10, mix(C.panelDeep, C.shadow, 0.45), 1);
  outer(-1, BOARD_RADIUS + 1);
  g.lineStyle(6, C.goldDeep, 1);
  outer(0, BOARD_RADIUS);
  g.lineStyle(3, C.gold, 1);
  outer(0.5, BOARD_RADIUS);
  g.lineStyle(1.2, C.goldLight, 0.8);
  outer(2, BOARD_RADIUS - 1);
  g.lineStyle(1.2, mix(C.panelDeep, C.shadow, 0.5), 0.6);
  outer(3.5, BOARD_RADIUS - 2);

  // Ćwieki: małe hexy, bo hex jest tu motywem przewodnim.
  const studs = [
    [BOARD_X, BOARD_Y],
    [BOARD_X + BOARD_W, BOARD_Y],
    [BOARD_X, BOARD_Y + BOARD_H],
    [BOARD_X + BOARD_W, BOARD_Y + BOARD_H],
    [BOARD_X + BOARD_W / 2, BOARD_Y],
    [BOARD_X + BOARD_W / 2, BOARD_Y + BOARD_H],
  ];
  for (const [x, y] of studs) {
    g.fillStyle(C.goldDeep, 1);
    g.fillPoints(hexPoints(x, y, 8), true);
    g.fillStyle(C.gold, 1);
    g.fillPoints(hexPoints(x, y, 6), true);
    g.fillStyle(C.goldLight, 0.9);
    g.fillPoints(hexPoints(x, y - 0.5, 3), true);
  }
}

// ---------- podświetlenia pól ----------

interface HexPaint {
  /** wypełnienie całego pola */
  fill?: number;
  /** wewnętrzna szeroka opaska — udaje gradient gęstniejący ku krawędzi */
  band?: number;
  /** kolorowy brzeg 2-3px, jak w Sync Grid */
  edge?: number;
  /** poświata na zewnątrz pola */
  glow?: number;
  /** biała aureola — w Masters ma ją pole właśnie wybrane */
  halo?: number;
}

function softHex(
  g: Phaser.GameObjects.Graphics,
  x: number,
  y: number,
  color: number,
  o: HexPaint
) {
  if (o.glow) {
    g.lineStyle(12, color, o.glow * 0.3);
    g.strokePoints(hexPoints(x, y, HEX_R + 2), true);
    g.lineStyle(7, color, o.glow * 0.55);
    g.strokePoints(hexPoints(x, y, HEX_R), true);
  }
  if (o.halo) {
    g.lineStyle(5, C.white, o.halo);
    g.strokePoints(hexPoints(x, y, HEX_R + 3), true);
  }
  if (o.fill) {
    g.fillStyle(color, o.fill);
    g.fillPoints(hexPoints(x, y, HEX_R - 2), true);
  }
  if (o.band) {
    g.lineStyle(14, color, o.band);
    g.strokePoints(hexPoints(x, y, HEX_R - 9), true);
  }
  if (o.edge) {
    g.lineStyle(3, color, o.edge);
    g.strokePoints(hexPoints(x, y, HEX_R - 2), true);
    g.lineStyle(1.2, C.white, o.edge * 0.5);
    g.strokePoints(hexPoints(x, y, HEX_R - 5), true);
  }
}

/** Pole, na które aktywny oddział może wejść. */
export function paintMoveCell(g: Phaser.GameObjects.Graphics, col: number, row: number) {
  const { x, y } = cellToXY(col, row);
  softHex(g, x, y, C.ally, { fill: 0.16, band: 0.1, edge: 0.85, glow: 0.25 });
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
  const { x, y } = cellToXY(col, row);
  const color = weakened ? C.gold : C.foe;
  softHex(g, x, y, color, {
    fill: weakened ? 0.16 : 0.22,
    band: 0.14,
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
  const { x, y } = cellToXY(col, row);
  softHex(g, x, y, color, { fill: 0.07, band: 0.06, edge: 0.4 });
}

/** Pole, z którego padnie cios — najmocniej zaznaczone pole na planszy. */
export function paintApproachCell(g: Phaser.GameObjects.Graphics, col: number, row: number) {
  const { x, y } = cellToXY(col, row);
  softHex(g, x, y, C.gold, { fill: 0.26, band: 0.18, edge: 1, glow: 0.5, halo: 0.55 });
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
  for (let i = 3; i >= 1; i--) {
    g.fillStyle(C.shadow, 0.1);
    g.fillEllipse(x, y + 4, width * (0.6 + i * 0.12), width * (0.2 + i * 0.05));
  }
  return g;
}
