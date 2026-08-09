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
import { ICON, TYPE_ICON, icon } from './icons';

// ---------- geometria etykiet ----------
// Wszystko liczone od środka hexa. Pas 69 pikseli dzielimy tak:
//   -44 .. -30  nazwa (leży na czubku sylwetki, jak logo na plakacie)
//   -43 ..  +7  sylwetka
//   +2  .. +12  krążek podestu pod nogami
//   +13 .. +28  JEDNA kapsułka: życie i liczebność w tym samym kształcie
//
// Poprzednia wersja miała cztery elementy oprawy na oddział — plakietkę ataku,
// pasek życia, bąbel liczebności i odznakę żywiołu — wszystkie podobnej wagi.
// Razem zajmowały więcej pola niż sam stworek i nachodziły na sąsiadów, a
// plakietka ataku wychodziła nawet poza ramę planszy. To odwrócona hierarchia:
// oprawa zjadała treść.
//
// Teraz zostają DWA elementy. Siła ataku zniknęła z pola całkiem — gracz i tak
// dostaje prognozę obrażeń, gdy celuje, więc nie musi jej czytać z każdego
// oddziału naraz. Życie i liczebność zrosły się w jedną kapsułkę, bo to o nich
// podejmuje się decyzje i mają być czytane jednym spojrzeniem.
//
// Zwolnione miejsce dostała sylwetka: to gra o stworkach, więc stworek ma być
// największą rzeczą na własnym polu.

/** Linia, na której stworek stoi — tu leży cień i podest. */
const FEET_Y = 7;
const SPRITE_H = 50;
const NAME_Y = -37;

/** Podest: płaski, szeroki znacznik barwy strony tuż pod nogami. */
const PLATE_W = 46;
const PLATE_H = 9;

/**
 * Scalona kapsułka „życie + liczebność". Wysokość 15 px, bo dopiero przy tylu
 * mieści się modelowanie (koryto, gradient, połysk) i jednocześnie cyfra
 * czytelna z odległości. Kapsułka jest wyśrodkowana na polu, więc przy
 * skrajnej kolumnie nigdy nie wychodzi poza ramę planszy.
 */
const CAP_Y = 20;
/**
 * Wysokość KORYTA; jego promień to zawsze połowa tej liczby, więc koryto jest
 * pigułką, nie prostokątem ze zmiękczonymi rogami.
 *
 * Zeszła z 14 do 11, bo pasek życia jest czytany przez PROPORCJĘ długości do
 * wysokości. Przy 30x14 stosunek wynosił nieco ponad 2:1 i już przy połowie
 * życia wypełnienie było niemal kwadratowe, a po zaokrągleniu — krążkiem.
 */
const BAR_H = 11;
/**
 * Szerokość koryta. Podniesiona z 30 do 42: dopiero przy ~4:1 ubytek długości
 * jest mierzalny okiem na całym zakresie. Razem z medalionem daje 54 px, czyli
 * mniej niż dwie trzecie szerokości hexa (~80) — nadal węższe od sylwetki
 * i bez szans na wejście w sąsiada.
 */
const BAR_W = 42;
/**
 * Liczebność w OKRĄGŁEJ plakietce NACHODZĄCEJ na prawy koniec paska, zamiast
 * doklejonej do niego drugiej strefy. Dwa przylegające segmenty ze wspólną
 * krawędzią oko czyta jako dwa kafle sklejone taśmą; medalion położony na
 * wierzchu czyta jako jeden obiekt z przypiętą do niego odznaką — tak jak
 * wskaźniki poziomu we wzorcu.
 */
const CNT_D = 17;
const CNT_OVERLAP = 5;

/**
 * Żywioł i tarcza: małe okrągłe odznaki przy głowie, po przeciwnych stronach.
 * Nie jedna pod drugą, bo kolumna dwóch krążków czytała się jak trzeci pas
 * informacji i konkurowała z kapsułką.
 */
const TYPE_X = 25;
// Na wysokości barków, nie przy czubku głowy — wyżej krążek wchodził
// w ostatnie litery dłuższych nazw.
const BADGE_Y = -17;
const SHIELD_X = -25;
const SIDE_ICON_SIZE = 11;
const BADGE_D = 16;

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
  /** Zostawione w umowie dla sceny, ale świadomie nie pokazywane na planszy. */
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
  /** Jeden kształt na życie i liczebność naraz. */
  hpBar: Phaser.GameObjects.Graphics;
  countLabel: Phaser.GameObjects.Text;
  shieldIcon: Phaser.GameObjects.Image;
  shieldBg: Phaser.GameObjects.Graphics;
  /** Cień pod nogami — w ruchu pracuje osobno od sylwetki. */
  shadow: Phaser.GameObjects.Graphics;
  /**
   * Skala sylwetki w spoczynku. Sprite jest wpasowywany w wysokość przez
   * setDisplaySize, więc jego scaleX/scaleY NIE są jedynkami — każde ugięcie
   * musi być liczone jako mnożnik tych wartości, inaczej stworek skacze
   * do rozmiaru surowego PNG.
   */
  baseScaleX: number;
  baseScaleY: number;
  /** Do odtworzenia oddechu po zakończeniu ruchu. */
  seed: number;
  /** Spokojne unoszenie w spoczynku — gasimy je na czas śmierci oddziału. */
  breath?: Phaser.Tweens.Tween;
  /**
   * Uchwyty tweenów ruchu, po jednym na WŁAŚCIWOŚĆ. Phaser potrafi puścić dwa
   * tweeny na to samo pole tego samego obiektu i wtedy animacja zapada się po
   * szczycie, więc każdy nowy tween najpierw usuwa poprzednika.
   */
  moveHop?: Phaser.Tweens.Tween;
  moveSquash?: Phaser.Tweens.Tween;
  moveLean?: Phaser.Tweens.Tween;
  moveShadow?: Phaser.Tweens.Tween;
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

/**
 * Kształt o niezależnych promieniach lewego i prawego końca — potrzebny, bo
 * scalona kapsułka składa się z dwóch stref, które od środka stykają się
 * płaską krawędzią, a na zewnątrz są zaokrąglone.
 */
interface Seg {
  x: number;
  y: number;
  w: number;
  h: number;
  /** Promień lewego końca; 0 = płasko. */
  rl: number;
  rr: number;
}

function segRect(g: Phaser.GameObjects.Graphics, s: Seg) {
  g.fillRoundedRect(s.x, s.y, s.w, s.h, { tl: s.rl, bl: s.rl, tr: s.rr, br: s.rr });
}

/**
 * Pionowy gradient na takim kształcie. Graphics nie umie gradientu, więc
 * kroimy go na poziome pasy; przy zaokrąglonych końcach pas musi być węższy,
 * inaczej gradient wystaje poza kształt kwadratowymi rogami. Pasy zachodzą
 * o 0.6 px, bo bez tego wygładzanie zostawia między nimi jasne szpary.
 */
function segGradient(g: Phaser.GameObjects.Graphics, s: Seg, lightA: number, darkA: number) {
  const steps = 9;
  // Wcięcie brzegu na danej wysokości: promień minus cięciwa okręgu narożnika.
  const inset = (r: number, y: number) => {
    if (r <= 0) return 0;
    const d = Math.abs(y < r ? r - y : y > s.h - r ? y - (s.h - r) : 0);
    return r - Math.sqrt(Math.max(0, r * r - d * d));
  };
  for (let i = 0; i < steps; i++) {
    const t = (i + 0.5) / steps;
    const up = t < 0.5;
    const alpha = up ? lightA * (1 - t * 2) : darkA * (t - 0.5) * 2;
    if (alpha <= 0.004) continue;
    const y0 = (s.h * i) / steps;
    const y1 = Math.min(s.h, (s.h * (i + 1)) / steps + 0.6);
    const l0 = inset(s.rl, y0);
    const l1 = inset(s.rl, y1);
    const r0 = inset(s.rr, y0);
    const r1 = inset(s.rr, y1);
    g.fillStyle(up ? C.white : C.shadow, alpha);
    g.fillPoints(
      [
        new Phaser.Math.Vector2(s.x + l0, s.y + y0),
        new Phaser.Math.Vector2(s.x + s.w - r0, s.y + y0),
        new Phaser.Math.Vector2(s.x + s.w - r1, s.y + y1),
        new Phaser.Math.Vector2(s.x + l1, s.y + y1),
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
 *
 * Rysowany wokół WŁASNEGO punktu (0,0), a na miejsce przesuwany pozycją
 * obiektu. Dzięki temu skalowanie cienia w ruchu ściąga go do własnego środka,
 * a nie do środka hexa — inaczej przy podskoku plama uciekałaby w górę.
 */
const SHADOW_Y = FEET_Y + 2;
const SHADOW_REST = 0.75;

function drawShadow(g: Phaser.GameObjects.Graphics) {
  for (let i = 4; i >= 1; i--) {
    g.fillStyle(C.shadow, 0.107);
    g.fillEllipse(0, 0, 18 + i * 6, 3 + i * 1.8);
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

  const shadow = scene.add.graphics({ x: 0, y: SHADOW_Y });
  drawShadow(shadow);
  // Cień jest rysowany MOCNIEJ niż wygląda w spoczynku, a przygaszany alfą
  // obiektu. Dzięki temu w ruchu jest gdzie iść w OBIE strony: przy zetknięciu
  // do pełnej mocy, w powietrzu poniżej stanu spoczynkowego.
  shadow.setAlpha(SHADOW_REST);

  const platform = scene.add.graphics();
  drawPlatform(platform, accent, deep, false);

  // Punkt zaczepienia u stóp: dzięki temu stworek stoi na podeście niezależnie
  // od tego, jak wysoki jest jego rysunek.
  const sprite = scene.add.image(0, FEET_Y, spec.spriteKey).setOrigin(0.5, 1);
  sprite.setDisplaySize(SPRITE_H * (sprite.width / sprite.height), SPRITE_H);

  // Nazwa jak logo z bajki: gruby ciemny kontur i cień pod spodem. Leży nad
  // głową, bo to jedyne miejsce, gdzie nie zasłania liczb.
  const name = scene.add.text(0, NAME_Y, spec.name, display(9)).setOrigin(0.5);
  gradientText(name, H.white, H.panelEdge);

  // Żywioł i tarcza po bokach głowy — same naklejki z własnym konturem,
  // bez czarnego prostokąta pod spodem.
  // Okrągła odznaka żywiołu: ta sama konstrukcja co kapsułki, tylko szerokość
  // równa wysokości — dzięki temu wszystko na planszy jest z jednej rodziny.
  const typeBg = scene.add.graphics();
  plate(typeBg, TYPE_X, BADGE_Y, BADGE_D, BADGE_D, C.panel, C.panelDeep, {
    light: 0.3,
    dark: 0.26,
    gloss: 0.5,
  });
  const typeIcon = icon(scene, TYPE_ICON[spec.type], TYPE_X, BADGE_Y, SIDE_ICON_SIZE);

  // Tarcza po przeciwnej stronie głowy i tylko na czas obrony — element
  // chwilowy nie może na stałe rezerwować miejsca w układzie.
  const shieldBg = scene.add.graphics().setVisible(false);
  plate(shieldBg, SHIELD_X, BADGE_Y, BADGE_D, BADGE_D, C.gold, C.goldDeep, {
    light: 0.34,
    dark: 0.3,
    gloss: 0.45,
  });
  const shieldIcon = icon(scene, ICON.shield, SHIELD_X, BADGE_Y, SIDE_ICON_SIZE).setVisible(false);

  // Liczebność siedzi WEWNĄTRZ kapsułki życia, w jej prawym końcu. Nie ma
  // własnego tła — tłem jest segment kapsułki w barwie strony.
  const countLabel = scene.add
    .text(0, CAP_Y, '', { ...display(10), strokeThickness: 3 })
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
    hpBar,
    countLabel,
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
    countLabel,
    shieldIcon,
    shieldBg,
    shadow,
    baseScaleX: sprite.scaleX,
    baseScaleY: sprite.scaleY,
    seed: spec.seed,
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

  view.countLabel.setText(`${s.count}`);
  gradientText(view.countLabel, H.white, H.panelEdge);
  view.shieldIcon.setVisible(s.defending);
  view.shieldBg.setVisible(s.defending);

  // Plakietka rośnie razem z liczbą cyfr, ale cały zestaw zostaje
  // wyśrodkowany na polu — trzycyfrowy oddział się nie ucina, a przy skrajnej
  // kolumnie nic nie wyjeżdża poza ramę planszy.
  const countW = Math.max(CNT_D, view.countLabel.width + 8);
  const lay = capsuleLayout(countW);
  drawStatCapsule(view.hpBar, ratio, view.side, lay);
  view.countLabel.setX(lay.badgeCx);
}

interface CapLayout {
  /** Lewa krawędź paska życia. */
  barX: number;
  badgeCx: number;
  countW: number;
}

/**
 * Rozkład poziomy. Liczony osobno, bo tej samej geometrii potrzebuje rysunek
 * i pozycja napisu — gdyby każde liczyło po swojemu, cyfra uciekałaby
 * z medalionu przy zmianie liczby cyfr.
 */
function capsuleLayout(countW: number): CapLayout {
  const total = BAR_W + countW - CNT_OVERLAP;
  const barX = -total / 2;
  return { barX, badgeCx: barX + BAR_W - CNT_OVERLAP + countW / 2, countW };
}

/**
 * Pigułka życia z nachodzącym na nią medalionem liczebności.
 *
 * Promień zaokrąglenia jest równy połowie wysokości — kształt jest pigułką,
 * a nie prostokątem ze zmiękczonymi rogami. Poprzednia wersja stykała pasek
 * i liczbę płaskimi krawędziami i mimo wspólnego obrysu czytała się jako dwa
 * doklejone do siebie kafle; teraz liczba leży NA pasku, więc oko widzi jeden
 * przedmiot z odznaką.
 *
 * Barwa wypełnienia zmienia się na trzech progach, bo sam ubytek długości
 * widać za słabo — kolor niesie ostrzeżenie szybciej.
 */
function drawStatCapsule(g: Phaser.GameObjects.Graphics, ratio: number, side: Side, lay: CapLayout) {
  g.clear();
  const h = BAR_H;
  const r = h / 2;
  const x = lay.barX;
  const y = CAP_Y - h / 2;

  const fill = ratio > 0.5 ? C.hpHigh : ratio > 0.25 ? C.hpMid : C.hpLow;
  const pill = (s: Partial<Seg> & { x: number; y: number; w: number; h: number }) =>
    segRect(g, { rl: s.h / 2, rr: s.h / 2, ...s } as Seg);

  // Cień pod paskiem i ciemny obrys o ~45% ciemniejszy od wypełnienia.
  // Obrys rysujemy jako większy kształt pod spodem, bo linia 1.5 px przy tej
  // skali gubi się na jasnej trawie i przy łukach wychodzi nierówna.
  const ew = 1.5;
  g.fillStyle(C.shadow, 0.5);
  pill({ x: x - ew, y: y - ew + 2, w: BAR_W + ew * 2, h: h + ew * 2 });
  g.fillStyle(shift(fill, C.shadow, 0.42), 1);
  pill({ x: x - ew, y: y - ew, w: BAR_W + ew * 2, h: h + ew * 2 });

  // Koryto: JASNY ton wypełnienia, nie ciemny.
  //
  // Przez kilka rund koryto było prawie czarne i ciążyło bardziej niż
  // cokolwiek we wzorcu. Właściwym punktem odniesienia dla paska tej
  // wielkości nie jest tabela statystyk z karty trenera (wiersze 30 px,
  // przyciski 55 px), tylko pasek postępu ze świata gry, który ma niemal
  // dokładnie naszą wysokość — i ten jest płaski, w jasnym korycie
  // z cienkim obrysem. Patrz tools/reference/pasek-maly.png.
  //
  // Kontrast wobec trawy niesie ciemny obrys rysowany wyżej, więc jasne
  // koryto nie gubi paska na jasnym tle.
  const trough: Seg = { x, y, w: BAR_W, h, rl: r, rr: r };
  g.fillStyle(shift(fill, C.white, 0.66), 1);
  segRect(g, trough);
  // Delikatne wgłębienie pod górną krawędzią. Słabsze niż przy ciemnym
  // korycie — na jasnym tle wystarczy ślad, mocniejszy robi brudną smugę.
  g.fillStyle(C.shadow, 0.16);
  pill({ x: x + 1, y: y + 0.8, w: BAR_W - 2, h: h * 0.34 });
  segGradient(g, trough, 0, 0.12);

  // Wnętrze koryta — pole, po którym biegnie wypełnienie. Trzymamy je w jednym
  // miejscu, żeby podziałka i wypełnienie liczyły się z tej samej geometrii.
  const ih = h - 3.2;
  const ix = x + 1.6;
  const iw = BAR_W - 3.2;

  // PODZIAŁKA. Trzy cienkie kreski na 1/4, 1/2 i 3/4 długości koryta. Bez nich
  // krótkie wypełnienie mówi tylko „mało", bo oko nie ma z czym porównać jego
  // długości. Kreski leżą POD wypełnieniem, więc widać wyłącznie te w pustej
  // części — czyli dokładnie tyle, ile życia brakuje. Przy pełnym pasku znikają
  // i nie zaśmiecają obrazu.
  // Ciemniejsze od koryta, odkąd koryto jest jasne — biała kreska na jasnym
  // tle znikała. Kreska w połowie mocniejsza, bo połowa życia to próg,
  // który gracz sprawdza najczęściej.
  for (let i = 1; i <= 3; i++) {
    g.fillStyle(C.shadow, i === 2 ? 0.3 : 0.17);
    g.fillRect(ix + iw * (i / 4) - 0.5, y + 2.4, 1, h - 4.8);
  }

  if (ratio > 0) {
    // Lewy koniec zaokrąglony do pełna, PRAWY prawie płaski (1.4 px).
    //
    // To jest sedno naprawy. Przy dwóch zaokrąglonych końcach, gdy szerokość
    // wypełnienia zbliżała się do jego wysokości, oba łuki się spotykały
    // i pigułka degenerowała się w KÓŁKO — kształt przestawał nieść informację
    // o długości, czyli jedyną, po którą się na pasek patrzy. Płaska prawa
    // krawędź jest granicą stanu: nawet dwupikselowy kikut czyta się jako
    // „słupek zaczyna się z lewej i kończy TU", a nie jako kropka.
    const w = Math.max(3, iw * ratio);
    const seg: Seg = { x: ix, y: y + 1.6, w, h: ih, rl: Math.min(ih / 2, w / 2), rr: 1.4 };
    g.fillStyle(fill, 1);
    segRect(g, seg);
    // Ciało: góra jaśniejsza o ~25%, dół ciemniejszy — bez tego wypełnienie
    // jest płaską plamą farby.
    segGradient(g, seg, 0.44, 0.4);
    // Pasmo połysku na górnej jednej trzeciej wysokości, wtopione w prawą
    // krawędź (płaskie z prawej, jak samo wypełnienie).
    if (w > 3.6) {
      g.fillStyle(C.white, 0.3);
      segRect(g, {
        x: seg.x + 1.1,
        y: seg.y + 0.8,
        w: w - 1.9,
        h: ih * 0.33,
        rl: Math.min(ih * 0.165, (w - 1.9) / 2),
        rr: 0.8,
      });
    }
    // Jasna krecha na samym czole wypełnienia. Oddziela je od ciemnego koryta
    // twardym kantem, więc koniec słupka widać nawet na tle trawy.
    g.fillStyle(shift(fill, C.white, 0.55), 1);
    g.fillRect(seg.x + w - 1.4, seg.y + 0.6, 1.4, ih - 1.2);
  }

  // --- medalion liczebności, położony NA prawym końcu paska ---
  // Wyższy od paska, więc wystaje nad i pod niego; dopiero to nakładanie
  // sprawia, że czyta się jako osobna warstwa, a nie kolejny segment w rzędzie.
  const cw = lay.countW;
  const ch = CNT_D;
  const cx = lay.badgeCx - cw / 2;
  const cy = CAP_Y - ch / 2;
  const accent = accentOf(side);
  g.fillStyle(C.shadow, 0.45);
  pill({ x: cx - 2, y: cy - 2 + 2, w: cw + 4, h: ch + 4 });
  g.fillStyle(shift(accent, C.shadow, 0.5), 1);
  pill({ x: cx - 2, y: cy - 2, w: cw + 4, h: ch + 4 });
  const cSeg: Seg = { x: cx, y: cy, w: cw, h: ch, rl: ch / 2, rr: ch / 2 };
  g.fillStyle(accent, 1);
  segRect(g, cSeg);
  segGradient(g, cSeg, 0.44, 0.36);
  g.fillStyle(C.white, 0.3);
  pill({ x: cx + 1.6, y: cy + 1.2, w: cw - 3.2, h: ch * 0.35 });
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

// ---------- przemieszczanie ----------
//
// Sprite'y stworków to pojedyncze statyczne PNG — nie ma klatek chodu, więc
// cała różnica między marszem a lotem musi wyjść z przekształceń jednego
// obrazka: położenia, dwóch skal, obrotu oraz z pracy cienia.
//
// Chodzący ma być PRZYWIĄZANY DO ZIEMI: podskok na każde pole, ugięcie przy
// zetknięciu, wyciągnięcie w locie i cień w PRZECIWFAZIE (mniejszy i jaśniejszy
// u szczytu). Bez przeciwfazy cienia podskok czyta się jak drganie obrazka.
//
// Latacz ma być ODERWANY OD ZIEMI: unosi się na starcie, płynie po sinusie bez
// jednego zetknięcia, przechyla w stronę lotu i opada przy lądowaniu; jego cień
// zostaje na ziemi, maleje i blednie, więc odległość od sylwetki niesie wysokość.
//
// Wszystkie tweeny są trzymane za uchwyt i usuwane przed założeniem nowego na
// TĘ SAMĄ właściwość — dwa tweeny na jedno pole Phaser rozstrzyga po swojemu
// i animacja zapada się po szczycie.

/** Podskok piechoty: tyle pikseli nad linią stóp na szczycie kroku. */
const STEP_HOP = 12;
/** Ugięcie i wyciągnięcie sylwetki; objętość zachowana, bo X idzie odwrotnie. */
const SQUASH = 0.17;
/** Pochylenie w stronę marszu. */
const WALK_LEAN = 8;
/** Latacz: wysokość przelotu nad linią stóp i amplituda sinusa. */
const FLY_RISE = 13;
const FLY_BOB = 3.5;
const FLY_TILT = 11;

/** Czy obiekt wciąż żyje — ruch bywa przerywany śmiercią albo końcem bitwy. */
const alive = (view: UnitView) => view.container.active && view.sprite.active;

/**
 * Zdejmuje wszystko, co ruch założył, i przywraca stan spoczynkowy: sylwetka
 * na linii stóp, skala bazowa, obrót zero, cień w pełni. Wołane i na końcu
 * przejścia, i przy śmierci — zostawiony przechył albo ugięcie to najgorszy
 * możliwy ślad po tej animacji.
 */
function resetMoveTweens(view: UnitView) {
  view.moveHop?.remove();
  view.moveSquash?.remove();
  view.moveLean?.remove();
  view.moveShadow?.remove();
  view.moveHop = view.moveSquash = view.moveLean = view.moveShadow = undefined;
}

/** Przygotowanie do przejścia: gasimy oddech, żeby nie walczył o `y` sylwetki. */
export function beginUnitMove(scene: Phaser.Scene, view: UnitView, flying: boolean) {
  if (!alive(view)) return;
  view.breath?.remove();
  view.breath = undefined;
  resetMoveTweens(view);
  view.sprite.setPosition(0, FEET_Y).setAngle(0).setScale(view.baseScaleX, view.baseScaleY);
  view.shadow.setPosition(0, SHADOW_Y).setScale(1).setAlpha(SHADOW_REST);

  if (!flying) return;

  // Latacz: wznosi się RAZ, przed pierwszym polem, i dopiero na górze zaczyna
  // sinus. Wznoszenie i sinus to dwa tweeny na to samo `y`, więc drugi startuje
  // dopiero z zakończenia pierwszego, nigdy równolegle.
  const rise = scene.tweens.add({
    targets: view.sprite,
    y: FEET_Y - FLY_RISE,
    duration: 140,
    ease: 'Sine.easeOut',
    onComplete: () => {
      if (!alive(view) || view.moveHop !== rise) return;
      view.moveHop = scene.tweens.add({
        targets: view.sprite,
        y: { from: FEET_Y - FLY_RISE + FLY_BOB, to: FEET_Y - FLY_RISE - FLY_BOB },
        duration: 420,
        ease: E.soft,
        yoyo: true,
        repeat: -1,
      });
    },
  });
  view.moveHop = rise;

  // Cień zostaje na ziemi: odsuwa się od sylwetki, maleje i blednie.
  view.moveShadow = scene.tweens.add({
    targets: view.shadow,
    y: SHADOW_Y + 3,
    scaleX: 0.6,
    scaleY: 0.55,
    alpha: 0.3,
    duration: 140,
    ease: 'Sine.easeOut',
  });
}

/**
 * Jedno pole trasy. Dla piechoty to pełny cykl kroku — stąd synchronizacja
 * podskoków z heksami. Dla latacza tylko przechył, bo jego unoszenie jest
 * ciągłe i nie ma prawa wiedzieć o granicach pól.
 *
 * `dirX` to znak przemieszczenia; pochylenie idzie w stronę marszu, nie zawsze
 * w prawo. Przy ruchu czysto pionowym zostaje ostatni przechył.
 */
export function stepUnitMove(
  scene: Phaser.Scene,
  view: UnitView,
  opts: { dirX: number; duration: number; flying: boolean }
) {
  if (!alive(view)) return;
  const { dirX, duration, flying } = opts;
  const lean = (flying ? FLY_TILT : WALK_LEAN) * (dirX >= 0 ? 1 : -1);

  if (dirX !== 0 && Math.round(view.sprite.angle) !== Math.round(lean)) {
    view.moveLean?.remove();
    view.moveLean = scene.tweens.add({
      targets: view.sprite,
      angle: lean,
      duration: Math.min(220, duration),
      ease: E.snap,
    });
  }

  if (flying) return;

  // Krok: odbicie z ziemi, wyciągnięcie w locie, ugięcie przy lądowaniu.
  // `yoyo` domyka cykl dokładnie na granicy pola, więc następny krok zaczyna
  // się z tego samego stanu, w którym poprzedni skończył.
  const half = duration / 2;
  view.moveHop?.remove();
  view.moveHop = scene.tweens.add({
    targets: view.sprite,
    y: { from: FEET_Y, to: FEET_Y - STEP_HOP },
    duration: half,
    ease: 'Sine.easeOut',
    yoyo: true,
  });

  view.moveSquash?.remove();
  view.moveSquash = scene.tweens.add({
    targets: view.sprite,
    scaleX: { from: view.baseScaleX * (1 + SQUASH), to: view.baseScaleX * (1 - SQUASH * 0.7) },
    scaleY: { from: view.baseScaleY * (1 - SQUASH), to: view.baseScaleY * (1 + SQUASH * 0.9) },
    duration: half,
    ease: 'Sine.easeOut',
    yoyo: true,
  });

  // Cień w PRZECIWFAZIE: u szczytu mniejszy i jaśniejszy, przy zetknięciu
  // szerszy i ciemniejszy. To ono robi z podskoku oderwanie się od ziemi.
  view.moveShadow?.remove();
  view.moveShadow = scene.tweens.add({
    targets: view.shadow,
    scaleX: { from: 1.22, to: 0.55 },
    scaleY: { from: 1.22, to: 0.55 },
    alpha: { from: 1, to: 0.34 },
    duration: half,
    ease: 'Sine.easeOut',
    yoyo: true,
  });
}

/**
 * Koniec przejścia. Latacz opada na linię stóp, piechota już na niej stoi;
 * w obu wypadkach przechył jest wychodzony, a oddech wraca.
 */
export function endUnitMove(scene: Phaser.Scene, view: UnitView, flying: boolean) {
  if (!alive(view)) {
    resetMoveTweens(view);
    return;
  }
  resetMoveTweens(view);

  const land = flying ? 260 : 140;
  view.moveHop = scene.tweens.add({
    targets: view.sprite,
    y: FEET_Y,
    duration: land,
    ease: flying ? 'Sine.easeIn' : E.snap,
    onComplete: () => {
      if (!alive(view)) return;
      view.sprite.setPosition(0, FEET_Y).setAngle(0).setScale(view.baseScaleX, view.baseScaleY);
      view.moveHop = undefined;
      startBreathing(scene, view, view.seed);
    },
  });
  view.moveSquash = scene.tweens.add({
    targets: view.sprite,
    scaleX: view.baseScaleX,
    scaleY: view.baseScaleY,
    duration: land,
    ease: E.snap,
  });
  view.moveLean = scene.tweens.add({
    targets: view.sprite,
    angle: 0,
    duration: land,
    ease: E.snap,
  });
  view.moveShadow = scene.tweens.add({
    targets: view.shadow,
    y: SHADOW_Y,
    scaleX: 1,
    scaleY: 1,
    alpha: SHADOW_REST,
    duration: land,
    ease: E.snap,
  });
}

// ---------- śmierć ----------

/**
 * Zejście oddziału. Sam zanik alfy wyglądał jak błąd rysowania — nie było
 * widać, że coś się skończyło. Tutaj stworek najpierw podskakuje, potem
 * zapada się w obłok iskier w barwie strony, a plakietka znika razem z nim.
 */
export function playUnitDeath(scene: Phaser.Scene, view: UnitView, onDone: () => void) {
  view.breath?.remove();
  // Ruch mógł zostać przerwany śmiercią — zdejmujemy jego tweeny, żeby nic nie
  // dociągało sylwetki w trakcie rozsypki.
  resetMoveTweens(view);
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
