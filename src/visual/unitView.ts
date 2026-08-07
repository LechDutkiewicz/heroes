/**
 * Wygląd oddziału stojącego na planszy: cień, podest, sprite, pierścień tury
 * i zwarta plakietka z liczbami.
 *
 * Wydzielone z BattleScene tak samo jak plansza — scena ma prowadzić walkę,
 * a nie układać etykiety. Ten moduł nic nie wie o turach ani o obrażeniach;
 * dostaje gotowe liczby i je pokazuje.
 *
 * Reguła nadrzędna jest jedna i wynika z geometrii, nie z gustu: rzędy hexów
 * dzieli 69 pikseli, więc CAŁY oddział razem z etykietami musi zmieścić się
 * w pasie tej wysokości. Poprzedni układ rozrzucał napisy od -39 do +33 i
 * pasek HP jednego oddziału wchodził w nazwę sąsiada. Dlatego liczby są tu
 * ściągnięte do wąskiego pasa przy nogach stworka, a nie rozsypane wokół.
 *
 * Warstwa druga to wzorzec z Pokémon Masters EX: nic nie jest gołym
 * prostokątem. Każda liczba siedzi w zaokrąglonej kapsułce z ciemnym konturem,
 * jasnym wypełnieniem i błykiem u góry — dokładnie tak jak tabela statystyk
 * i przyciski umiejętności na karcie trenera.
 */

import Phaser from 'phaser';
import { C, E, H, T, display } from './theme';
import { HEX_H, HEX_R, HEX_W, hexPoints } from './board';
import { ICON, TYPE_ICON, icon, type IconKey } from './icons';

// ---------- geometria etykiet ----------
// Wszystko liczone od środka hexa. Skrajne wartości: góra napisu -38,
// dół paska HP +31. Razem 69 — dokładnie tyle, ile dzieli rzędy, więc etykiety
// sąsiadów stykają się co najwyżej krawędziami i nigdy nie wchodzą na siebie.
//
// Liczby siedzą NA dolnej połowie stworka, a nie obok niego. Rozstawianie ich
// dookoła wymagało pasa szerszego niż hex; sięgnięcie po układ z Heroes 3 —
// plakietka wtopiona w sylwetkę — mieści wszystko i zostawia głowę widoczną.

/** Linia, na której stworek stoi — tu leży cień i podest. */
const FEET_Y = 22;
const SPRITE_H = 56;
const NAME_Y = -30;

/**
 * Podest jest jednocześnie oprawą paska życia. To nie ozdoba, tylko rachunek
 * miejsca: osobny podest i osobny pasek to dwa pasy po kilkanaście pikseli,
 * a razem z kapsułkami liczb zakrywały stworkowi całą dolną połowę. Zrośnięte
 * w jedną tabliczkę zajmują jeden pas i zostawiają sylwetkę widoczną.
 */
const PLATE_W = 52;
const PLATE_H = 15;
const HP_W = 38;
const HP_H = 6;

/** Kapsułki liczb rozsunięte na boki — środek zostaje wolny dla stworka. */
const CHIP_Y = 6;
const COUNT_X = 25;
const COUNT_W = 24;
const COUNT_H = 18;
const ATK_X = -25;
const ATK_W = 29;
const ATK_H = 15;

const TYPE_Y = -13;
const SIDE_ICON_X = 28;
const SIDE_ICON_SIZE = 15;

export type Side = 'player' | 'enemy';
export type ElementKey = keyof typeof TYPE_ICON;

export interface UnitViewSpec {
  spriteKey: string;
  name: string;
  type: ElementKey;
  shooter: boolean;
  side: Side;
  x: number;
  y: number;
  /**
   * Dowolna liczba różna dla każdego oddziału. Z niej bierzemy przesunięcie
   * fazy oddechu — sześć stworków unoszących się równo wygląda jak animacja
   * tapety, a nie jak żywe stwory.
   */
  seed: number;
}

export interface UnitViewState {
  count: number;
  hp: number;
  maxHp: number;
  atk: number;
  defending: boolean;
}

export interface UnitView {
  container: Phaser.GameObjects.Container;
  sprite: Phaser.GameObjects.Image;
  hit: Phaser.GameObjects.Zone;
  side: Side;
  /** Podest w barwie strony; przy turze przemalowywany na złoto. */
  platform: Phaser.GameObjects.Graphics;
  activeRing: Phaser.GameObjects.Graphics;
  hpBar: Phaser.GameObjects.Graphics;
  countBg: Phaser.GameObjects.Graphics;
  countLabel: Phaser.GameObjects.Text;
  atkLabel: Phaser.GameObjects.Text;
  shieldIcon: Phaser.GameObjects.Image;
  atkBg: Phaser.GameObjects.Graphics;
  atkIcon: Phaser.GameObjects.Image;
  /** Spokojne unoszenie w spoczynku — gasimy je na czas śmierci oddziału. */
  breath?: Phaser.Tweens.Tween;
}

// ---------- kapsułki ----------

/**
 * Kapsułka jak we wzorcu: ciemny kontur rysowany jako większy prostokąt pod
 * spodem, jasne wypełnienie i pasek błysku u góry. Obrys linią dawałby
 * cieniutką nitkę, która przy 17 pikselach wysokości ginie na tle trawy.
 */
function capsule(
  g: Phaser.GameObjects.Graphics,
  x: number,
  y: number,
  w: number,
  h: number,
  fill: number,
  edge: number
) {
  const r = h / 2;
  g.fillStyle(C.shadow, 0.9);
  g.fillRoundedRect(x - w / 2 - 2, y - h / 2 - 2, w + 4, h + 4, r + 2);
  g.fillStyle(edge, 1);
  g.fillRoundedRect(x - w / 2 - 1, y - h / 2 - 1, w + 2, h + 2, r + 1);
  g.fillStyle(fill, 1);
  g.fillRoundedRect(x - w / 2, y - h / 2, w, h, r);
  g.fillStyle(C.white, 0.28);
  g.fillRoundedRect(x - w / 2 + 2, y - h / 2 + 1.5, w - 4, h * 0.38, r * 0.6);
}

const accentOf = (side: Side) => (side === 'player' ? C.ally : C.foe);
const deepOf = (side: Side) => (side === 'player' ? C.allyDeep : C.foeDeep);

/**
 * Tabliczka pod stworkiem: barwa strony mówi, czyj to oddział, a wpuszczony
 * w nią pasek życia mówi, ile mu zostało. Zaokrąglona kapsułka z ciemnym
 * konturem i błykiem — ta sama konstrukcja co przyciski i pasma statystyk
 * we wzorcu. Przy turze robi się złota i szersza, więc aktywny oddział widać
 * nawet kątem oka.
 */
function drawPlatform(g: Phaser.GameObjects.Graphics, color: number, deep: number, active: boolean) {
  g.clear();
  const w = active ? PLATE_W + 8 : PLATE_W;
  const h = active ? PLATE_H + 2 : PLATE_H;

  // Poświata na zewnątrz — dzięki niej tabliczka wtapia się w pole zamiast
  // leżeć na nim jako naklejka.
  for (let i = 3; i >= 1; i--) {
    g.fillStyle(color, active ? 0.11 : 0.06);
    g.fillEllipse(0, FEET_Y, w + i * 8, h + i * 5);
  }

  g.fillStyle(C.shadow, 0.92);
  g.fillRoundedRect(-w / 2 - 2.5, FEET_Y - h / 2 - 2.5, w + 5, h + 5, h / 2 + 2.5);
  g.fillStyle(deep, 1);
  g.fillRoundedRect(-w / 2 - 1, FEET_Y - h / 2 - 1, w + 2, h + 2, h / 2 + 1);
  g.fillStyle(color, 1);
  g.fillRoundedRect(-w / 2, FEET_Y - h / 2, w, h, h / 2);
  g.fillStyle(C.white, active ? 0.4 : 0.26);
  g.fillRoundedRect(-w / 2 + 3, FEET_Y - h / 2 + 1.5, w - 6, h * 0.3, h * 0.15);
}

/**
 * Cień. Kilka elips o rosnącym promieniu zamiast jednej — pojedyncza ma
 * twardy kant i stworek wygląda, jakby stał na naklejce. Bez cienia wisiał
 * w powietrzu, co było najbardziej rzucającą się w oczy wadą poprzedniej wersji.
 */
function drawShadow(g: Phaser.GameObjects.Graphics) {
  for (let i = 4; i >= 1; i--) {
    g.fillStyle(C.shadow, 0.08);
    g.fillEllipse(0, FEET_Y + 7, 20 + i * 6, 4 + i * 2);
  }
}

// ---------- budowa ----------

export function buildUnitView(scene: Phaser.Scene, spec: UnitViewSpec): UnitView {
  const accent = accentOf(spec.side);
  const deep = deepOf(spec.side);

  // Pierścień pola pod tym, kto ma turę. Cztery kanty jeden na drugim:
  // szeroka poświata, ciemny spód, złota taśma i jasny błysk — pojedyncza
  // linia gubiła się na jasnej łące.
  const activeRing = scene.add.graphics();
  const pts = (r: number) => hexPoints(0, 0, r);
  activeRing.lineStyle(14, C.gold, 0.18);
  activeRing.strokePoints(pts(HEX_R - 6), true);
  activeRing.lineStyle(7, C.shadow, 0.45);
  activeRing.strokePoints(pts(HEX_R - 3), true);
  activeRing.lineStyle(4.5, C.goldDeep, 1);
  activeRing.strokePoints(pts(HEX_R - 3), true);
  activeRing.lineStyle(2, C.goldLight, 1);
  activeRing.strokePoints(pts(HEX_R - 4), true);
  activeRing.setVisible(false);

  const shadow = scene.add.graphics();
  drawShadow(shadow);

  const platform = scene.add.graphics();
  drawPlatform(platform, accent, deep, false);

  // Punkt zaczepienia u stóp: dzięki temu stworek stoi na podeście niezależnie
  // od tego, jak wysoki jest jego rysunek.
  const sprite = scene.add.image(0, FEET_Y, spec.spriteKey).setOrigin(0.5, 1);
  sprite.setDisplaySize(SPRITE_H * (sprite.width / sprite.height), SPRITE_H);

  // Nazwa jak logo z bajki: gruby ciemny kontur i cień pod spodem. Leży nad
  // głową, bo to jedyne miejsce, gdzie nie zasłania ani stworka, ani liczb.
  const name = scene.add.text(0, NAME_Y, spec.name, display(11)).setOrigin(0.5);

  // Żywioł i tarcza po bokach głowy — same naklejki z własnym konturem,
  // bez czarnego prostokąta pod spodem.
  const typeIcon = icon(scene, TYPE_ICON[spec.type], -SIDE_ICON_X, TYPE_Y, SIDE_ICON_SIZE);
  const shieldIcon = icon(scene, ICON.shield, SIDE_ICON_X, TYPE_Y, SIDE_ICON_SIZE).setVisible(false);

  // Siła oddziału: ikona broni mówi CZYM bije, liczba ILE. Ciemna kapsułka,
  // bo to informacja pomocnicza — nie ma konkurować z liczebnością.
  const atkKey: IconKey = spec.shooter ? ICON.bow : ICON.sword;
  const atkBg = scene.add.graphics();
  const atkIcon = icon(scene, atkKey, 0, CHIP_Y, 13);
  const atkLabel = scene.add
    .text(ATK_X + 6, CHIP_Y, '', { ...display(10), strokeThickness: 3 })
    .setOrigin(0.5);

  // Liczebność — najważniejsza liczba na planszy, więc dostaje największą
  // kapsułkę i barwę strony. Gracz ma ją czytać bez zatrzymywania wzroku.
  const countBg = scene.add.graphics();
  const countLabel = scene.add
    .text(COUNT_X, CHIP_Y, '', { ...display(13), strokeThickness: 3.5 })
    .setOrigin(0.5);

  const hpBar = scene.add.graphics();

  const hit = scene.add
    .zone(0, 0, HEX_W, HEX_H)
    .setInteractive(new Phaser.Geom.Polygon(hexPoints(HEX_W / 2, HEX_H / 2)), Phaser.Geom.Polygon.Contains);

  const container = scene.add.container(spec.x, spec.y, [
    activeRing,
    shadow,
    platform,
    sprite,
    typeIcon,
    shieldIcon,
    name,
    atkBg,
    atkIcon,
    atkLabel,
    countBg,
    countLabel,
    hpBar,
    hit,
  ]);

  const view: UnitView = {
    container,
    sprite,
    hit,
    side: spec.side,
    platform,
    activeRing,
    hpBar,
    countBg,
    countLabel,
    atkLabel,
    shieldIcon,
    atkBg,
    atkIcon,
  };

  startBreathing(scene, view, spec.seed);
  return view;
}

/**
 * Oddech w spoczynku. Rusza się sam stworek, nie cały kontener — inaczej
 * pływałyby też liczby i pasek HP, a te mają stać jak wmurowane, bo gracz
 * na nie patrzy. Faza jest przesunięta per oddział, żeby sześć stworków nie
 * podskakiwało zgodnie; ruch jest mały (2 piksele) i wolny, żeby żył, a nie
 * migotał.
 */
function startBreathing(scene: Phaser.Scene, view: UnitView, seed: number) {
  const phase = ((seed * 379) % T.breath) as number;
  view.breath = scene.tweens.add({
    targets: view.sprite,
    y: { from: FEET_Y, to: FEET_Y - 2.5 },
    duration: T.breath,
    delay: phase,
    ease: E.soft,
    yoyo: true,
    repeat: -1,
  });
}

// ---------- odświeżanie ----------

export function refreshUnitView(view: UnitView, s: UnitViewState) {
  const ratio = Phaser.Math.Clamp(s.hp / Math.max(1, s.maxHp), 0, 1);
  drawHpBar(view.hpBar, ratio);

  view.countLabel.setText(`${s.count}`);
  view.atkLabel.setText(`${s.atk}`);
  view.shieldIcon.setVisible(s.defending);

  // Obie kapsułki rosną razem z liczbą cyfr. Sztywna szerokość albo ucinała
  // trzycyfrowy oddział, albo zostawiała dziurę obok jedynki. Rosną na
  // zewnątrz — do środka nie mogą, bo tam stoi stworek.
  const cw = Math.max(COUNT_W, view.countLabel.width + 10);
  view.countBg.clear();
  const cx = COUNT_X + (cw - COUNT_W) / 2;
  capsule(view.countBg, cx, CHIP_Y, cw, COUNT_H, accentOf(view.side), deepOf(view.side));
  view.countLabel.setX(cx);

  const aw = Math.max(ATK_W, view.atkLabel.width + 22);
  const ax = ATK_X - (aw - ATK_W) / 2;
  view.atkBg.clear();
  capsule(view.atkBg, ax, CHIP_Y, aw, ATK_H, C.hpTrack, C.panelDeep);
  view.atkIcon.setX(ax - aw / 2 + 8);
  view.atkLabel.setX(ax + 6);
}

/**
 * Pasek życia wpuszczony w tabliczkę: ciemne koryto, kolorowe wypełnienie,
 * połysk u góry. Barwa zmienia się na trzech progach, bo przy 38 pikselach
 * sam ubytek długości widać za słabo — kolor niesie ostrzeżenie szybciej.
 * Liczby „30/30" celowo nie ma: przy tej wysokości była nieczytelna, a dokładne
 * wartości i tak stoją w panelu na dole.
 */
function drawHpBar(g: Phaser.GameObjects.Graphics, ratio: number) {
  const r = HP_H / 2;
  const left = -HP_W / 2;
  const y = FEET_Y;
  g.clear();

  g.fillStyle(C.shadow, 0.85);
  g.fillRoundedRect(left - 1.5, y - HP_H / 2 - 1.5, HP_W + 3, HP_H + 3, r + 1.5);
  g.fillStyle(C.hpTrack, 1);
  g.fillRoundedRect(left, y - HP_H / 2, HP_W, HP_H, r);

  if (ratio > 0) {
    // Minimalna długość, żeby ostatni punkt życia był widoczny jako kropka,
    // a nie znikał zupełnie.
    const w = Math.max(HP_H, HP_W * ratio);
    const fill = ratio > 0.5 ? C.hpHigh : ratio > 0.25 ? C.hpMid : C.hpLow;
    g.fillStyle(fill, 1);
    g.fillRoundedRect(left, y - HP_H / 2, w, HP_H, r);
    g.fillStyle(C.white, 0.4);
    g.fillRoundedRect(left + 1, y - HP_H / 2 + 0.8, w - 2, HP_H * 0.32, r * 0.6);
  }
}

// ---------- tura ----------

/**
 * Zaznaczenie oddziału, który ma turę. Trzy sygnały naraz, bo to najważniejsza
 * informacja na planszy: złoty podest, pulsujący pierścień pola i lekkie
 * podniesienie stworka ponad resztę.
 */
export function setUnitActive(scene: Phaser.Scene, view: UnitView, active: boolean) {
  scene.tweens.killTweensOf(view.activeRing);
  view.activeRing.setScale(1).setAlpha(1).setVisible(active);

  if (active) {
    drawPlatform(view.platform, C.gold, C.goldDeep, true);
    scene.tweens.add({
      targets: view.activeRing,
      scaleX: { from: 0.95, to: 1.03 },
      scaleY: { from: 0.95, to: 1.03 },
      alpha: { from: 1, to: 0.55 },
      duration: T.breath / 2.5,
      ease: E.soft,
      yoyo: true,
      repeat: -1,
    });
  } else {
    drawPlatform(view.platform, accentOf(view.side), deepOf(view.side), false);
  }
}

// ---------- śmierć ----------

/**
 * Zejście oddziału. Sam zanik alfy wyglądał jak błąd rysowania — nie było
 * widać, że coś się skończyło. Tutaj stworek najpierw podskakuje, potem
 * zapada się w obłok iskier w barwie strony, a plakietka znika razem z nim.
 */
export function playUnitDeath(scene: Phaser.Scene, view: UnitView, onDone: () => void) {
  view.breath?.remove();
  scene.tweens.killTweensOf(view.activeRing);
  view.activeRing.setVisible(false);

  const { x, y } = view.container;
  const color = accentOf(view.side);
  const puff = scene.add.graphics().setDepth(view.container.depth + 0.5);

  for (let i = 0; i < 9; i++) {
    const a = Phaser.Math.DegToRad(i * 40 + Phaser.Math.Between(-12, 12));
    const spark = scene.add
      .graphics({ x: x + Math.cos(a) * 6, y: y + FEET_Y - 12 + Math.sin(a) * 4 })
      .setDepth(view.container.depth + 0.5);
    spark.fillStyle(C.shadow, 0.85);
    spark.fillCircle(0, 0, 5.5);
    spark.fillStyle(i % 2 ? C.white : color, 1);
    spark.fillCircle(0, 0, 4);
    scene.tweens.add({
      targets: spark,
      x: x + Math.cos(a) * Phaser.Math.Between(26, 40),
      y: y + FEET_Y - 12 + Math.sin(a) * Phaser.Math.Between(14, 24) - 10,
      scale: 0,
      alpha: 0,
      duration: T.fade + 420,
      ease: E.snap,
      onComplete: () => spark.destroy(),
    });
  }

  scene.tweens.add({
    targets: view.container,
    scaleX: 1.14,
    scaleY: 0.86,
    duration: 90,
    ease: E.snap,
    yoyo: true,
  });
  scene.tweens.add({
    targets: view.container,
    alpha: 0,
    scale: 0.2,
    angle: view.side === 'player' ? -14 : 14,
    delay: 200,
    duration: T.fade + 420,
    ease: E.in,
    onComplete: () => {
      puff.destroy();
      view.container.destroy();
      onDone();
    },
  });
}

/** Barwa akcentu strony — scena używa jej też poza planszą, np. w kolejce tur. */
export function sideAccent(side: Side) {
  return { color: accentOf(side), deep: deepOf(side), hex: side === 'player' ? H.ally : H.foe };
}
