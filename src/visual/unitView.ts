/**
 * Wygląd oddziału stojącego na planszy: cień, podest, sprite, pierścień tury
 * i zwarta plakietka z liczbami.
 *
 * Wydzielone z BattleScene tak samo jak plansza — scena ma prowadzić walkę,
 * a nie układać etykiety. Ten moduł nic nie wie o turach ani o obrażeniach;
 * dostaje gotowe liczby i je pokazuje.
 *
 * Dwie reguły nadrzędne:
 *
 * 1. GEOMETRIA. Rzędy hexów dzieli 69 pikseli, więc cały oddział razem
 *    z etykietami musi zmieścić się w pasie tej wysokości. Wszystkie stałe
 *    układu niżej są dobrane tak, żeby skrajne wartości mieściły się między
 *    LIMIT_TOP a LIMIT_BOTTOM — inaczej pasek HP jednego oddziału wchodzi
 *    w nazwę sąsiada z rzędu wyżej.
 *
 * 2. MODELOWANIE. We wzorcu (karta trenera z Pokémon Masters EX) nic nie jest
 *    płaską plamą. Każdy element ma cztery warstwy: cień pod spodem, ciemny
 *    obrys, wypełnienie z pionowym gradientem od jaśniejszego u góry do
 *    ciemniejszego u dołu i wąski połysk w górnej części. Cały ten język
 *    zamknięty jest w jednej funkcji `plate()` i używany wszędzie — dzięki
 *    temu pasek życia, plakietka liczebności i plakietka ataku wyglądają jak
 *    rodzeństwo, a nie jak trzy różne pomysły.
 */

import Phaser from 'phaser';
import { C, E, H, T, display } from './theme';
import { HEX_H, HEX_R, HEX_W, hexPoints } from './board';
import { ICON, TYPE_ICON, icon, type IconKey } from './icons';

// ---------- geometria etykiet ----------
// Wszystko liczone od środka hexa. Pas 69 pikseli dzielimy tak:
//   -39 .. -23  nazwa
//   -38 ..  +4  sylwetka (nazwa leży na jej górnej krawędzi, jak logo)
//  -0.5 .. +8.5 krążek podestu pod nogami
//   +11 .. +29  jeden rząd plakietek: pasek życia i liczebność obok siebie
//
// Rząd plakietek jest JEDEN, nie dwa. Poprzednio pasek życia leżał pod rzędem
// liczb i cała dolna kondygnacja miała 30 pikseli — nie mieściła się w pasie
// rzędu, a przy okazji zjadała miejsce sylwetce. Ustawione obok siebie zajmują
// 18 pikseli i zostaje zapas.
//
// Atak wisi z boku, na wysokości piersi. Nie u góry, bo tam zasłaniał głowy —
// a głowa jest tym, po czym gracz rozpoznaje stworka. Na wysokości piersi
// sylwetka jest wąska, więc plakietka wchodzi na nią najwyżej kilkoma
// pikselami krawędzi.

/** Linia, na której stworek stoi — tu leży cień i podest. */
const FEET_Y = 4;
const SPRITE_H = 42;
const NAME_Y = -31;

/** Podest: płaski, szeroki znacznik barwy strony tuż pod nogami. */
const PLATE_W = 44;
const PLATE_H = 9;

/**
 * Pasek życia. 11 pikseli, bo przy sześciu nie mieści się żadne modelowanie —
 * na cztery piksele wypełnienia nie da się nałożyć gradientu ani połysku
 * i wychodzi płaska kreska. Promień to połowa wysokości, więc jest kapsułką,
 * a nie prostokątem z zaokrąglonymi rogami.
 */
const BADGE_Y = 20;
const HP_W = 34;
const HP_H = 11;
const HP_X = -15;

/** Liczebność — jedyna liczba przy nogach, więc dostaje pełną wysokość rzędu. */
const COUNT_X = 16;
const COUNT_W = 22;
const COUNT_H = 18;

const ATK_X = -19;
const ATK_Y = -5;
const ATK_W = 24;
const ATK_H = 13;

/**
 * Żywioł i tarcza: okrągłe odznaki po prawej, jedna pod drugą. Wcześniej były
 * gołymi naklejkami zawieszonymi w powietrzu obok stworka i wyglądały jak
 * zgubione — we wzorcu każda ikona siedzi w okrągłej obwódce, więc te też.
 */
const TYPE_X = 27;
const TYPE_Y = -16;
const SHIELD_Y = 2;
const SIDE_ICON_SIZE = 12;
const BADGE_D = 18;

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
  shieldBg: Phaser.GameObjects.Graphics;
  atkBg: Phaser.GameObjects.Graphics;
  atkIcon: Phaser.GameObjects.Image;
  /** Spokojne unoszenie w spoczynku — gasimy je na czas śmierci oddziału. */
  breath?: Phaser.Tweens.Tween;
}

// ---------- barwy pomocnicze ----------

/** Rozjaśnienie / przyciemnienie barwy o zadany ułamek — do gradientów. */
function shift(color: number, towards: number, amount: number) {
  const a = Phaser.Display.Color.IntegerToColor(color);
  const b = Phaser.Display.Color.IntegerToColor(towards);
  return Phaser.Display.Color.GetColor(
    Math.round(a.red + (b.red - a.red) * amount),
    Math.round(a.green + (b.green - a.green) * amount),
    Math.round(a.blue + (b.blue - a.blue) * amount)
  );
}

// ---------- kapsułki ----------

/**
 * Połowa szerokości kapsułki na danej wysokości. Potrzebna, bo gradient
 * kroimy na poziome pasy, a pasy przy zaokrąglonych końcach muszą być węższe —
 * inaczej gradient wystaje poza kształt kwadratowymi rogami.
 */
function capHalf(w: number, h: number, dy: number) {
  const r = Math.min(h, w) / 2;
  const flat = Math.max(0, w / 2 - r);
  const d = Phaser.Math.Clamp(dy, -r, r);
  return flat + Math.sqrt(Math.max(0, r * r - d * d));
}

/**
 * Pionowy gradient na kapsułce. Graphics nie umie gradientu na zaokrąglonym
 * kształcie, więc tak samo jak plansza kroimy go na poziome pasy o rosnącej
 * alfie: górna połowa dostaje rozjaśnienie, dolna ściemnienie, środek nic.
 *
 * Pasy zachodzą na siebie o 0.6 piksela. Bez tego wygładzanie zostawia między
 * nimi jasne szpary i kapsułka wygląda jak prążkowana.
 */
function gradientCapsule(
  g: Phaser.GameObjects.Graphics,
  cx: number,
  cy: number,
  w: number,
  h: number,
  lightA: number,
  darkA: number
) {
  const steps = 10;
  for (let i = 0; i < steps; i++) {
    const t = (i + 0.5) / steps;
    const up = t < 0.5;
    const alpha = up ? lightA * (1 - t * 2) : darkA * (t - 0.5) * 2;
    if (alpha <= 0.004) continue;

    const y0 = -h / 2 + (h * i) / steps;
    const y1 = Math.min(h / 2, -h / 2 + (h * (i + 1)) / steps + 0.6);
    const h0 = capHalf(w, h, y0);
    const h1 = capHalf(w, h, y1);

    g.fillStyle(up ? C.white : C.shadow, alpha);
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

interface PlateOpts {
  /** Ile gradientu — 0 dla koryta paska życia, które ma być matowe. */
  light?: number;
  dark?: number;
  /** Siła połysku w górnej części. */
  gloss?: number;
  /** Cień pod spodem; wyłączany, gdy kapsułka leży w innej kapsułce. */
  drop?: number;
  /** Grubość ciemnego obrysu. */
  edgeW?: number;
}

/**
 * Jedyny sposób, w jaki ten moduł rysuje cokolwiek wypełnionego. Cztery
 * warstwy w kolejności od spodu: cień, obrys, wypełnienie, gradient, połysk.
 *
 * Obrys jest rysowany jako większy wypełniony kształt pod spodem, a nie linią.
 * Linia o grubości 1.5 px przy tej skali gubi się na jasnej trawie, a przy
 * zaokrąglonych końcach potrafi wyjść nierówna.
 */
function plate(
  g: Phaser.GameObjects.Graphics,
  cx: number,
  cy: number,
  w: number,
  h: number,
  fill: number,
  edge: number,
  o: PlateOpts = {}
) {
  const r = h / 2;
  const ew = o.edgeW ?? 1.5;
  const drop = o.drop ?? 2;

  if (drop > 0) {
    g.fillStyle(C.shadow, 0.5);
    g.fillRoundedRect(-w / 2 + cx - ew, cy - h / 2 - ew + drop, w + ew * 2, h + ew * 2, r + ew);
  }
  g.fillStyle(edge, 1);
  g.fillRoundedRect(cx - w / 2 - ew, cy - h / 2 - ew, w + ew * 2, h + ew * 2, r + ew);
  g.fillStyle(fill, 1);
  g.fillRoundedRect(cx - w / 2, cy - h / 2, w, h, r);

  gradientCapsule(g, cx, cy, w, h, o.light ?? 0.34, o.dark ?? 0.3);

  const gloss = o.gloss ?? 0.3;
  if (gloss > 0) {
    // Połysk siedzi w górnych ~36% wysokości i jest węższy od kapsułki, żeby
    // czytał się jak odbicie światła, a nie jak druga kapsułka w środku.
    const gh = h * 0.36;
    const gy = cy - h / 2 + 1.2;
    const gw = capHalf(w, h, -h / 2 + gh + 1.2) * 2;
    g.fillStyle(C.white, gloss);
    g.fillRoundedRect(cx - gw / 2, gy, gw, gh, gh / 2);
  }
}

/**
 * Pionowy gradient na literach. We wzorcu żaden napis nie jest płaską bielą —
 * góra liter jest czysto biała, dół schodzi w chłodny odcień i to właśnie daje
 * wrażenie grubego, fazowanego kroju z logo bajki. Trzeba wywołać po każdej
 * zmianie treści, bo gradient jest liczony z aktualnej wysokości tekstu.
 */
function gradientText(t: Phaser.GameObjects.Text, top: string, bottom: string) {
  const grad = t.context.createLinearGradient(0, 0, 0, t.height);
  grad.addColorStop(0, top);
  grad.addColorStop(0.55, top);
  grad.addColorStop(1, bottom);
  t.setFill(grad);
}

const accentOf = (side: Side) => (side === 'player' ? C.ally : C.foe);
const deepOf = (side: Side) => (side === 'player' ? C.allyDeep : C.foeDeep);

/**
 * Podest — krążek w barwie strony leżący płasko pod nogami. Świadomie ELIPSA,
 * a nie kapsułka: kapsułka o tej samej sylwetce co pasek życia dawała pod
 * stworkiem dwa równoległe paski i oko nie wiedziało, który z nich czytać.
 * Elipsa czyta się jako plama na ziemi, więc nie konkuruje z paskiem.
 *
 * Odpowiada tylko za jedno pytanie: czyj to oddział.
 */
function drawPlatform(g: Phaser.GameObjects.Graphics, color: number, deep: number, active: boolean) {
  g.clear();
  const w = active ? PLATE_W + 12 : PLATE_W;
  const h = active ? PLATE_H + 3 : PLATE_H;

  // Poświata na zewnątrz — dzięki niej krążek wtapia się w pole zamiast leżeć
  // na nim jako naklejka.
  for (let i = 3; i >= 1; i--) {
    g.fillStyle(color, active ? 0.13 : 0.07);
    g.fillEllipse(0, FEET_Y, w + i * 10, h + i * 6);
  }

  // Te same warstwy co w `plate`, tylko na elipsie: obrys, wypełnienie,
  // gradient poziomymi pasami i połysk u góry.
  g.fillStyle(deep, 1);
  g.fillEllipse(0, FEET_Y, w + 3, h + 3);
  g.fillStyle(color, 1);
  g.fillEllipse(0, FEET_Y, w, h);

  const steps = 8;
  for (let i = 0; i < steps; i++) {
    const t = (i + 0.5) / steps;
    const up = t < 0.5;
    const alpha = up ? 0.4 * (1 - t * 2) : 0.34 * (t - 0.5) * 2;
    if (alpha <= 0.004) continue;
    const y0 = -h / 2 + (h * i) / steps;
    // Pasy zachodzą o 0.6 px, inaczej wygładzanie zostawia jasne szpary.
    const y1 = Math.min(h / 2, -h / 2 + (h * (i + 1)) / steps + 0.6);
    const hw = (dy: number) => (w / 2) * Math.sqrt(Math.max(0, 1 - (dy / (h / 2)) ** 2));
    g.fillStyle(up ? C.white : C.shadow, alpha);
    g.fillPoints(
      [
        new Phaser.Math.Vector2(-hw(y0), FEET_Y + y0),
        new Phaser.Math.Vector2(hw(y0), FEET_Y + y0),
        new Phaser.Math.Vector2(hw(y1), FEET_Y + y1),
        new Phaser.Math.Vector2(-hw(y1), FEET_Y + y1),
      ],
      true
    );
  }

  g.fillStyle(C.white, active ? 0.42 : 0.28);
  g.fillEllipse(0, FEET_Y - h * 0.24, w * 0.66, h * 0.34);
}

/**
 * Cień. Kilka elips o rosnącym promieniu zamiast jednej — pojedyncza ma
 * twardy kant i stworek wygląda, jakby stał na naklejce. Bez cienia wisiał
 * w powietrzu, co było najbardziej rzucającą się w oczy wadą pierwszej wersji.
 */
function drawShadow(g: Phaser.GameObjects.Graphics) {
  for (let i = 4; i >= 1; i--) {
    g.fillStyle(C.shadow, 0.08);
    g.fillEllipse(0, FEET_Y + 2, 18 + i * 6, 3 + i * 1.8);
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
  // głową, bo to jedyne miejsce, gdzie nie zasłania liczb.
  const name = scene.add.text(0, NAME_Y, spec.name, display(10)).setOrigin(0.5);
  gradientText(name, H.white, H.panelEdge);

  // Żywioł i tarcza po bokach głowy — same naklejki z własnym konturem,
  // bez czarnego prostokąta pod spodem.
  // Okrągła odznaka żywiołu: ta sama konstrukcja co kapsułki, tylko szerokość
  // równa wysokości — dzięki temu wszystko na planszy jest z jednej rodziny.
  const typeBg = scene.add.graphics();
  plate(typeBg, TYPE_X, TYPE_Y, BADGE_D, BADGE_D, C.panel, C.panelDeep, {
    light: 0.3,
    dark: 0.26,
    gloss: 0.5,
  });
  const typeIcon = icon(scene, TYPE_ICON[spec.type], TYPE_X, TYPE_Y, SIDE_ICON_SIZE);

  const shieldBg = scene.add.graphics().setVisible(false);
  plate(shieldBg, TYPE_X, SHIELD_Y, BADGE_D, BADGE_D, C.gold, C.goldDeep, {
    light: 0.34,
    dark: 0.3,
    gloss: 0.45,
  });
  const shieldIcon = icon(scene, ICON.shield, TYPE_X, SHIELD_Y, SIDE_ICON_SIZE).setVisible(false);

  // Siła oddziału: ikona broni mówi CZYM bije, liczba ILE. Ciemna kapsułka,
  // bo to informacja pomocnicza — nie ma konkurować z liczebnością.
  const atkKey: IconKey = spec.shooter ? ICON.bow : ICON.sword;
  const atkBg = scene.add.graphics();
  const atkIcon = icon(scene, atkKey, 0, ATK_Y, 11);
  const atkLabel = scene.add
    .text(ATK_X + 5, ATK_Y, '', { ...display(9), strokeThickness: 3 })
    .setOrigin(0.5);

  // Liczebność — najważniejsza liczba na planszy, więc dostaje największą
  // kapsułkę i barwę strony. Gracz ma ją czytać bez zatrzymywania wzroku.
  const countBg = scene.add.graphics();
  const countLabel = scene.add
    .text(COUNT_X, BADGE_Y, '', { ...display(12), strokeThickness: 3.5 })
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
    typeBg,
    typeIcon,
    shieldBg,
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
    shieldBg,
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
 * podskakiwało zgodnie; ruch jest mały i wolny, żeby żył, a nie migotał.
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
  gradientText(view.countLabel, H.white, H.panelEdge);
  view.atkLabel.setText(`${s.atk}`);
  gradientText(view.atkLabel, H.white, H.panelEdge);
  view.shieldIcon.setVisible(s.defending);
  view.shieldBg.setVisible(s.defending);

  // Obie kapsułki rosną razem z liczbą cyfr. Sztywna szerokość albo ucinała
  // trzycyfrowy oddział, albo zostawiała dziurę obok jedynki. Rosną na
  // zewnątrz — do środka nie mogą, bo tam stoi stworek.
  const cw = Math.max(COUNT_W, view.countLabel.width + 10);
  const cx = COUNT_X + (cw - COUNT_W) / 2;
  view.countBg.clear();
  plate(view.countBg, cx, BADGE_Y, cw, COUNT_H, accentOf(view.side), deepOf(view.side), {
    light: 0.44,
    dark: 0.34,
    gloss: 0.36,
  });
  view.countLabel.setX(cx);

  const aw = Math.max(ATK_W, view.atkLabel.width + 19);
  const ax = ATK_X - (aw - ATK_W) / 2;
  view.atkBg.clear();
  // Ten sam trójwarstwowy przepis co liczebność, tylko na ciemnym atramencie:
  // hierarchia ma wynikać z barwy i rozmiaru, nie z braku modelowania.
  plate(view.atkBg, ax, ATK_Y, aw, ATK_H, C.inkSoft, C.hpTrack, {
    light: 0.34,
    dark: 0.34,
    gloss: 0.24,
  });
  view.atkIcon.setX(ax - aw / 2 + 7);
  view.atkLabel.setX(ax + 5);
}

/**
 * Pasek życia jako pełnoprawna kapsułka, nie kreska. Koryto jest o ~45%
 * ciemniejsze od wypełnienia i ma własny cień wewnętrzny u góry, więc czyta
 * się jak wgłębienie; wypełnienie dostaje ten sam gradient i połysk co
 * plakietki, więc czyta się jak wsunięty w to wgłębienie klocek.
 *
 * Barwa zmienia się na trzech progach, bo sam ubytek długości widać za słabo —
 * kolor niesie ostrzeżenie szybciej. Liczby „30/30" celowo nie ma: przy tej
 * szerokości była nieczytelna, a dokładne wartości stoją w panelu na dole.
 */
function drawHpBar(g: Phaser.GameObjects.Graphics, ratio: number) {
  const left = HP_X - HP_W / 2;
  g.clear();

  const fill = ratio > 0.5 ? C.hpHigh : ratio > 0.25 ? C.hpMid : C.hpLow;
  const track = shift(fill, C.shadow, 0.78);

  // Koryto: matowe, bez połysku i bez gradientu rozjaśniającego — gdyby je
  // dostało, przestałoby wyglądać na dziurę, a zaczęło na drugi pasek.
  plate(g, HP_X, BADGE_Y, HP_W, HP_H, track, C.hpTrack, {
    light: 0,
    dark: 0.25,
    gloss: 0,
    edgeW: 1.6,
  });

  // Cień wewnętrzny: ciemny łuk tuż pod górną krawędzią koryta. To on sprawia,
  // że koryto czyta się jako wgłębienie, a nie jako ciemniejszy pasek.
  g.fillStyle(C.shadow, 0.5);
  g.fillRoundedRect(left + 1.5, BADGE_Y - HP_H / 2 + 0.5, HP_W - 3, HP_H * 0.42, HP_H * 0.21);

  if (ratio > 0) {
    // Wypełnienie jest z każdej strony o ~2 px mniejsze od koryta, więc ciemna
    // obwódka koryta zostaje widoczna także przy pełnym życiu — bez tego pasek
    // na 100% wyglądał jak jednolita zielona pigułka bez wnętrza.
    const iw = HP_W - 4;
    const ih = HP_H - 4;
    // Minimalna długość, żeby ostatni punkt życia był widoczny jako kropka,
    // a nie znikał zupełnie.
    const w = Math.max(ih, iw * ratio);
    // Cień pod wypełnieniem wyłączony: leży ono w korycie, więc własny cień
    // wyszedłby ciemną obwódką w środku innej kapsułki.
    plate(g, left + 2 + w / 2, BADGE_Y, w, ih, fill, shift(fill, C.shadow, 0.5), {
      light: 0.5,
      dark: 0.42,
      gloss: 0.5,
      drop: 0,
      edgeW: 0.8,
    });
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
