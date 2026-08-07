/**
 * Oprawa walki: błysk w punkcie trafienia, iskry, pocisk żywiołu ze śladem,
 * napisy ulotne, wstrząs kamery, rozbłysk przy zejściu oddziału i ekran końca
 * bitwy.
 *
 * Wydzielone z BattleScene tak samo jak plansza i wygląd oddziału — scena ma
 * prowadzić walkę, a nie układać cząstki. Ten moduł nic nie wie o obrażeniach
 * ani o turach; dostaje punkt, barwę i siłę, i robi z tego widowisko.
 *
 * Reguła nadrzędna zdjęta z wzorca (rozbłysk ewolucji w Pokémon Masters EX):
 * jedno zdarzenie to NIE jeden obiekt. W tamtym kadrze dzieje się naraz pięć
 * rzeczy — promieniste światło od środka, pierścienie energii, gęsty deszcz
 * iskier o różnych rozmiarach, ciepła poświata zalewająca tło i miękki rdzeń.
 * Pojedyncze kółko nigdy nie da tego wrażenia, choćby było najładniejsze.
 * Dlatego każdy efekt tutaj składa się z kilku warstw o różnym czasie życia.
 *
 * Reguła druga, ważniejsza od pierwszej: efekt nie może zjeść informacji.
 * Gracz musi widzieć, kto kogo uderzył, za ile i ilu stworków padło. Stąd
 * trzy ograniczenia, które w kodzie widać jako liczby:
 *  - rdzeń błysku gaśnie w ~170 ms, zanim wypłynie napis z liczbą obrażeń;
 *  - iskry lecą NA ZEWNĄTRZ od punktu trafienia, więc środek pola zostaje czysty;
 *  - napisy ulotne same się rozsuwają w pionie (patrz `floatLabel`), bo przy
 *    jednym ciosie potrafią wyskoczyć trzy naraz i wcześniej zlewały się
 *    w nieczytelną kaszę.
 *
 * Reguła trzecia: walka ma zostać żwawa. Cała oprawa jednego ciosu mieści się
 * w około 400 ms i nie blokuje przebiegu tury — scena woła `onDone` wtedy,
 * kiedy wołała wcześniej, a iskry dopalają się już po fakcie.
 */

import Phaser from 'phaser';
import { C, E, H, T, display } from './theme';
import { BOARD_H, BOARD_W, BOARD_X, BOARD_Y } from './board';
import { ICON, TYPE_ICON, type IconKey } from './icons';

/** Tekstury rysowane raz przy starcie sceny — potem to zwykłe obrazki. */
export const FX = {
  /** Miękka poświata: rdzeń błysku, aureola pocisku, światło ekranu końca. */
  glow: 'fx_poswiata',
  /** Okrągła iskra z jasnym środkiem — główny budulec deszczu iskier. */
  spark: 'fx_iskra',
  /** Czterokątny błysk — drobniejszy pył, żeby iskry miały różne kształty. */
  twinkle: 'fx_blyszczka',
} as const;

/**
 * Poświata jako stos kółek o malejącym promieniu i niskiej alfie. Phaser nie
 * ma gradientu na kształcie, ale alfa nakłada się warstwami, więc środek
 * wychodzi jasny, a brzeg rozmyty — dokładnie to, czego potrzebuje błysk.
 */
function drawGlow(g: Phaser.GameObjects.Graphics, size: number) {
  const c = size / 2;
  for (let r = c - 1; r > 0; r -= 1.5) {
    g.fillStyle(C.white, 0.05);
    g.fillCircle(c, c, r);
  }
}

export function buildEffectTextures(scene: Phaser.Scene) {
  if (scene.textures.exists(FX.glow)) return;

  const glow = scene.add.graphics();
  drawGlow(glow, 128);
  glow.generateTexture(FX.glow, 128, 128);
  glow.destroy();

  const spark = scene.add.graphics();
  spark.fillStyle(C.white, 0.22);
  spark.fillCircle(8, 8, 7.5);
  spark.fillStyle(C.white, 0.55);
  spark.fillCircle(8, 8, 5);
  spark.fillStyle(C.white, 1);
  spark.fillCircle(8, 8, 3);
  spark.generateTexture(FX.spark, 16, 16);
  spark.destroy();

  // Ośmioramienna gwiazdka z bardzo wciętym środkiem — czyta się jak błysk
  // światła, a nie jak gwiazda z ikon. Te dwa kształty mają się różnić.
  const tw = scene.add.graphics();
  const pts: number[] = [];
  for (let i = 0; i < 8; i++) {
    const r = i % 2 === 0 ? 15 : 2.6;
    const a = Phaser.Math.DegToRad(i * 45);
    pts.push(16 + r * Math.cos(a), 16 + r * Math.sin(a));
  }
  tw.fillStyle(C.white, 1);
  tw.beginPath();
  tw.moveTo(pts[0], pts[1]);
  for (let i = 2; i < pts.length; i += 2) tw.lineTo(pts[i], pts[i + 1]);
  tw.closePath();
  tw.fillPath();
  tw.generateTexture(FX.twinkle, 32, 32);
  tw.destroy();
}

// ---------- trafienie ----------

export interface ImpactOpts {
  /** Barwa żywiołu atakującego — po niej gracz poznaje, czym oberwał. */
  color: number;
  /** Siła ciosu 0-1 (ułamek życia, który cel stracił). Skaluje cały efekt. */
  power: number;
  /** Przewaga typu: „super skuteczne" ma wyglądać wyraźnie mocniej. */
  strong?: boolean;
  /** Słaby typ: cios ma się odbić, nie rozbłysnąć. */
  weak?: boolean;
}

/**
 * Błysk w punkcie uderzenia. Sześć warstw, każda o innym czasie życia:
 * kolorowa aureola, biały rdzeń, dwa pierścienie energii, grube iskry i drobny
 * pył. Bez tego stosu trafienie było samym drgnięciem kamery — gracz nie miał
 * gdzie skierować wzroku.
 */
export function impactBurst(
  scene: Phaser.Scene,
  layer: Phaser.GameObjects.Container,
  x: number,
  y: number,
  o: ImpactOpts
) {
  const p = Phaser.Math.Clamp(o.power, 0, 1);
  // Słaby cios ma zostać czytelnie mniejszy od mocnego, ale nie może zniknąć —
  // stąd dolna granica, a nie czyste mnożenie przez siłę.
  const scale = (o.strong ? 1.5 : o.weak ? 0.72 : 1) * (0.8 + p * 0.6);

  // 1. Aureola w barwie żywiołu — to ona zalewa okolicę światłem.
  const halo = scene.add
    .image(x, y, FX.glow)
    .setTint(o.color)
    .setBlendMode(Phaser.BlendModes.ADD)
    .setScale(0.3 * scale)
    .setAlpha(0.95);
  layer.add(halo);
  scene.tweens.add({
    targets: halo,
    scale: 1.5 * scale,
    alpha: 0,
    duration: 300,
    ease: E.snap,
    onComplete: () => halo.destroy(),
  });

  // 2. Biały rdzeń — gaśnie najszybciej, żeby zaraz odsłonić liczbę obrażeń.
  const core = scene.add
    .image(x, y, FX.glow)
    .setBlendMode(Phaser.BlendModes.ADD)
    .setScale(0.14 * scale)
    .setAlpha(1);
  layer.add(core);
  scene.tweens.add({
    targets: core,
    scale: 0.52 * scale,
    alpha: 0,
    duration: 170,
    ease: E.snap,
    onComplete: () => core.destroy(),
  });

  // 3. Pierścienie energii. Dwa, z przesunięciem — jeden wygląda jak animacja
  // ładowania, dwa jak fala uderzeniowa.
  ring(scene, layer, x, y, C.white, 4, 3.4 * scale, 300, 0);
  ring(scene, layer, x, y, o.color, 3, 4.6 * scale, 380, 80);

  // 4. Grube iskry lecące na zewnątrz. Trzy barwy na jednym wystrzale, tak jak
  // we wzorcu, gdzie pył nie jest jednolity: żywioł, biel i złoto.
  const big = scene.add.particles(0, 0, FX.spark, {
    speed: { min: 90 * scale, max: 300 * scale },
    lifespan: { min: 230, max: 480 },
    scale: { start: 0.85 * scale, end: 0 },
    tint: [o.color, C.white, C.goldLight],
    blendMode: Phaser.BlendModes.ADD,
    gravityY: 140,
    emitting: false,
  });
  layer.add(big);
  big.explode(Math.round((o.strong ? 20 : 12) + p * 12), x, y);

  // 5. Drobny pył o innym kształcie — od niego zależy wrażenie „gęstości".
  const dust = scene.add.particles(0, 0, FX.twinkle, {
    speed: { min: 40, max: 170 * scale },
    lifespan: { min: 300, max: 620 },
    scale: { start: 0.5 * scale, end: 0 },
    rotate: { start: 0, end: 180 },
    tint: [C.white, o.color],
    blendMode: Phaser.BlendModes.ADD,
    emitting: false,
  });
  layer.add(dust);
  dust.explode(Math.round((o.strong ? 18 : 10) + p * 10), x, y);

  // Emitery żyją własnym życiem po wystrzale, więc sprzątamy je z opóźnieniem
  // dłuższym niż najdłuższa cząstka.
  scene.time.delayedCall(900, () => {
    big.destroy();
    dust.destroy();
  });

  // 6. Przy przewadze typu dokładamy wieniec gwiazdek — „super skuteczne" ma
  // się różnić OD RAZU, zanim gracz przeczyta napis.
  if (o.strong) {
    for (let i = 0; i < 8; i++) {
      const a = Phaser.Math.DegToRad(i * 45 + 22);
      const star = scene.add
        .image(x, y, ICON.star)
        .setDisplaySize(16, 16)
        .setDepth(1);
      layer.add(star);
      scene.tweens.add({
        targets: star,
        x: x + Math.cos(a) * 54,
        y: y + Math.sin(a) * 38,
        angle: 180,
        scale: 0,
        alpha: 0,
        duration: 420,
        ease: E.snap,
        onComplete: () => star.destroy(),
      });
    }
  }
}

/** Rozchodzący się pierścień — pusty okrąg rosnący i gasnący. */
function ring(
  scene: Phaser.Scene,
  layer: Phaser.GameObjects.Container,
  x: number,
  y: number,
  color: number,
  width: number,
  to: number,
  duration: number,
  delay: number
) {
  const r = scene.add
    .circle(x, y, 12)
    .setStrokeStyle(width, color, 1)
    .setBlendMode(Phaser.BlendModes.ADD)
    .setScale(0.3);
  layer.add(r);
  scene.tweens.add({
    targets: r,
    scale: to,
    alpha: 0,
    duration,
    delay,
    ease: E.snap,
    onComplete: () => r.destroy(),
  });
}

/**
 * Cięcie w miejscu ciosu wręcz: jasny łuk pod kątem natarcia. Bez niego ruch
 * wręcz był samym przesunięciem sprite'a i nie było widać MOMENTU kontaktu.
 */
export function slashArc(
  scene: Phaser.Scene,
  layer: Phaser.GameObjects.Container,
  x: number,
  y: number,
  angle: number,
  color: number
) {
  const g = scene.add.graphics({ x, y });
  g.setBlendMode(Phaser.BlendModes.ADD);
  // Rysujemy dwa łuki: szeroki przygaszony robi poświatę, wąski jasny daje
  // ostrą krawędź. Ta sama sztuczka co przy obrysach w reszcie gry.
  g.lineStyle(13, color, 0.5);
  g.beginPath();
  g.arc(0, 0, 34, Phaser.Math.DegToRad(-56), Phaser.Math.DegToRad(56));
  g.strokePath();
  g.lineStyle(5, C.white, 0.95);
  g.beginPath();
  g.arc(0, 0, 34, Phaser.Math.DegToRad(-48), Phaser.Math.DegToRad(48));
  g.strokePath();
  // Łuk ma otwierać się w stronę celu, więc obracamy go o kąt natarcia.
  g.setRotation(angle);
  g.setScale(0.6, 1.1);
  layer.add(g);

  scene.tweens.add({
    targets: g,
    scaleX: 1.25,
    scaleY: 0.75,
    alpha: 0,
    duration: 210,
    ease: E.snap,
    onComplete: () => g.destroy(),
  });
}

/**
 * Krótkie rozbielenie trafionego stworka. Najtańszy możliwy sygnał „to on
 * oberwał" — działa nawet gdy iskry przesłoni sąsiad.
 */
export function flashTarget(scene: Phaser.Scene, sprite: Phaser.GameObjects.Image) {
  // W Phaser 4 barwa i tryb barwienia to dwa osobne ustawienia; samo
  // `setTintFill()` jest już tylko pustą zaślepką po Phaserze 3.
  sprite.setTint(C.white).setTintMode(Phaser.TintModes.FILL);
  scene.time.delayedCall(90, () => {
    if (!sprite.active) return;
    sprite.setTintMode(Phaser.TintModes.MULTIPLY);
    sprite.clearTint();
  });
}

/**
 * Wstrząs kamery zależny od siły ciosu. Stała wartość sprawiała, że draśnięcie
 * trzęsło ekranem tak samo jak wybicie połowy oddziału — i przez to żadne
 * trafienie nie miało wagi.
 */
export function battleShake(scene: Phaser.Scene, power: number) {
  const p = Phaser.Math.Clamp(power, 0, 1);
  scene.cameras.main.shake(90 + p * 140, 0.0016 + p * 0.007);
}

// ---------- pocisk ----------

export interface ShotOpts {
  from: { x: number; y: number };
  to: { x: number; y: number };
  /** Barwa żywiołu — ona odróżnia strzał ognisty od wodnego. */
  color: number;
  /** Żywioł strzelca; jego ikona jest kształtem pocisku. */
  element: keyof typeof TYPE_ICON;
  /** Złamana strzała: pocisk sypie się w locie i leci wolniej. */
  broken: boolean;
}

/**
 * Pocisk strzelca. Wcześniej był to dosłownie prostokąt plus trójkąt — jedna
 * strzała dla ognia, wody i trawy. Tutaj pocisk NIESIE ŻYWIOŁ: leci ikona
 * żywiołu w aureoli jego barwy, a za nią zostaje smużący ślad z iskier.
 *
 * Ślad robimy emiterem podpiętym pod pocisk (`follow`), a nie łańcuchem
 * obiektów — emiter sam gasi cząstki po czasie życia, więc smuga zwęża się
 * naturalnie i nie trzeba jej sprzątać ręcznie.
 */
export function launchProjectile(
  scene: Phaser.Scene,
  layer: Phaser.GameObjects.Container,
  o: ShotOpts,
  onHit: () => void
) {
  const angle = Phaser.Math.Angle.Between(o.from.x, o.from.y, o.to.x, o.to.y);

  const shot = scene.add.container(o.from.x, o.from.y);
  const halo = scene.add
    .image(0, 0, FX.glow)
    .setTint(o.color)
    .setBlendMode(Phaser.BlendModes.ADD)
    .setScale(o.broken ? 0.3 : 0.55)
    .setAlpha(0.95);
  // Jasny rdzeń pod ikoną. Bez niego ikona żywiołu — która ma gruby ciemny
  // kontur — czytała się na poświacie jak dziura, a nie jak lecące światło.
  const spark = scene.add
    .image(0, 0, FX.spark)
    .setBlendMode(Phaser.BlendModes.ADD)
    .setScale(2.4);
  const head = scene.add
    .image(0, 0, TYPE_ICON[o.element])
    .setDisplaySize(o.broken ? 20 : 30, o.broken ? 20 : 30);
  shot.add([halo, spark, head]);
  layer.add(shot);

  // Ikony są rysowane czubkiem do góry, więc odejmujemy ćwierć obrotu, żeby
  // szpic płomienia i kropli wskazywał kierunek lotu.
  shot.setRotation(angle - Math.PI / 2);

  const trail = scene.add.particles(0, 0, FX.spark, {
    follow: shot,
    speed: { min: 10, max: 70 },
    lifespan: o.broken ? 200 : 340,
    frequency: 8,
    scale: { start: o.broken ? 0.4 : 0.8, end: 0 },
    tint: [o.color, C.white, C.goldLight],
    blendMode: Phaser.BlendModes.ADD,
    quantity: 3,
  });
  layer.add(trail);

  // Pocisk pulsuje w locie — żywioł ma wyglądać na żywy, nie na wystrzelony
  // kamień. Złamana strzała zamiast tego chybocze się i gaśnie.
  scene.tweens.add({
    targets: head,
    scaleX: head.scaleX * 1.18,
    scaleY: head.scaleY * 1.18,
    duration: 90,
    yoyo: true,
    repeat: -1,
    ease: E.soft,
  });
  if (o.broken) {
    scene.tweens.add({
      targets: shot,
      angle: `+=${40}`,
      alpha: 0.55,
      duration: 380,
      ease: E.soft,
    });
  }

  scene.tweens.add({
    targets: shot,
    x: o.to.x,
    y: o.to.y,
    duration: o.broken ? 380 : 270,
    ease: o.broken ? 'Quad.easeOut' : 'Quad.easeIn',
    onComplete: () => {
      trail.stop();
      // Emiter musi przeżyć swoje ostatnie cząstki, inaczej smuga urywa się
      // w powietrzu dokładnie w chwili trafienia.
      scene.time.delayedCall(360, () => trail.destroy());
      shot.destroy();
      onHit();
    },
  });
}

// ---------- napisy ulotne ----------

/**
 * Zajęte prostokąty napisów, per scena. Przy jednym ciosie wyskakują nawet
 * trzy komunikaty naraz („-15", „padło 2", „Super skuteczne!") i wcześniej
 * lądowały jedne na drugich, dając nieczytelną plamę. Tutaj każdy nowy napis
 * przesuwa się w górę, dopóki nie znajdzie wolnego pasa.
 */
const taken = new WeakMap<Phaser.Scene, Phaser.Geom.Rectangle[]>();

export interface LabelOpts {
  x: number;
  y: number;
  text: string;
  color: string;
  /** Ikona przed napisem — zamiast systemowego emoji. */
  iconKey?: IconKey;
  size?: number;
}

/**
 * Napis ulotny: wyskakuje ze sprężyną, unosi się i gaśnie. Kontur bierzemy
 * z `display()`, więc czyta się i na jasnej trawie, i na śniegu, i na tle
 * własnych iskier.
 */
export function floatLabel(
  scene: Phaser.Scene,
  layer: Phaser.GameObjects.Container,
  o: LabelOpts
) {
  const size = o.size ?? 15;
  const label = scene.add.text(0, 0, o.text, display(size, o.color)).setOrigin(0, 0.5);
  const parts: Phaser.GameObjects.GameObject[] = [label];

  let w = label.width;
  if (o.iconKey) {
    const ic = scene.add.image(0, 0, o.iconKey).setDisplaySize(size + 3, size + 3).setOrigin(0, 0.5);
    label.setX(size + 6);
    w += size + 6;
    parts.push(ic);
  }
  // Środkujemy zawartość w kontenerze, żeby pozycja odnosiła się do środka
  // napisu — tak jak przy poprzednim setOrigin(0.5).
  parts.forEach((p) => {
    const go = p as Phaser.GameObjects.Image;
    go.setX(go.x - w / 2);
  });

  const h = size + 8;
  const minY = BOARD_Y + 24;
  const maxY = BOARD_Y + BOARD_H - 12;
  const x = Phaser.Math.Clamp(o.x, BOARD_X + w / 2 + 4, BOARD_X + BOARD_W - w / 2 - 4);
  const baseY = Phaser.Math.Clamp(o.y, minY, maxY);

  // Szukanie wolnego pasa: najpierw w górę, a gdy nad polem jest już krawędź
  // planszy — w dół. Samo spychanie do góry wypychało napisy poza planszę,
  // na pasek stanu tury, gdy cios padał w górnym rzędzie.
  const busy = taken.get(scene) ?? [];
  taken.set(scene, busy);
  const step = h + 3;
  const box = new Phaser.Geom.Rectangle(x - w / 2, baseY - h / 2, w, h);
  for (const k of [0, -1, -2, -3, -4, 1, 2, 3, 4]) {
    const cy = baseY + k * step;
    if (cy < minY || cy > maxY) continue;
    box.y = cy - h / 2;
    if (!busy.some((r) => Phaser.Geom.Intersects.RectangleToRectangle(r, box))) break;
  }
  const y = box.y + h / 2;
  busy.push(box);

  // Tryb mieszania ustawiamy jawnie na zwykły. W tej samej warstwie leżą
  // emitery iskier rysowane addytywnie i bez tego napis potrafi przejąć ich
  // tryb — biel na jasnej trawie robi się wtedy prawie niewidoczna.
  const cont = scene.add
    .container(x, y, parts)
    .setScale(0.4)
    .setBlendMode(Phaser.BlendModes.NORMAL);
  parts.forEach((p) => (p as Phaser.GameObjects.Image).setBlendMode(Phaser.BlendModes.NORMAL));
  layer.add(cont);

  // Sprężyste wejście i dopiero potem wypłynięcie: skok przyciąga wzrok
  // w chwili trafienia, powolne unoszenie daje czas na przeczytanie.
  scene.tweens.add({
    targets: cont,
    scale: 1,
    duration: 170,
    ease: E.out,
  });
  scene.tweens.add({
    targets: cont,
    y: y - 30,
    alpha: 0,
    delay: 200,
    duration: T.float,
    ease: 'Quad.easeOut',
    onComplete: () => {
      const i = busy.indexOf(box);
      if (i !== -1) busy.splice(i, 1);
      cont.destroy();
    },
  });
}

// ---------- zejście oddziału ----------

/**
 * Rozbłysk towarzyszący zejściu oddziału. Sama animacja stworka siedzi
 * w `unitView.playUnitDeath` (cudzy kawałek) — tutaj dokładamy to, czego jej
 * brakowało: mocne światło i czaszkę wyskakującą nad polem, żeby padnięcie
 * oddziału było widać z drugiego końca planszy.
 */
export function deathFlash(
  scene: Phaser.Scene,
  layer: Phaser.GameObjects.Container,
  x: number,
  y: number,
  color: number
) {
  const flash = scene.add
    .image(x, y, FX.glow)
    .setTint(C.white)
    .setBlendMode(Phaser.BlendModes.ADD)
    .setScale(0.2);
  layer.add(flash);
  scene.tweens.add({
    targets: flash,
    scale: 1.9,
    alpha: 0,
    duration: 420,
    ease: E.snap,
    onComplete: () => flash.destroy(),
  });

  ring(scene, layer, x, y, C.white, 5, 5, 460, 0);
  ring(scene, layer, x, y, color, 3, 6.5, 560, 90);

  const burst = scene.add.particles(0, 0, FX.spark, {
    speed: { min: 60, max: 240 },
    lifespan: { min: 400, max: 780 },
    scale: { start: 1, end: 0 },
    tint: [color, C.white, C.goldLight],
    blendMode: Phaser.BlendModes.ADD,
    gravityY: 90,
    emitting: false,
  });
  layer.add(burst);
  burst.explode(28, x, y);
  scene.time.delayedCall(1200, () => burst.destroy());

  // Czaszka jako pieczęć na zejściu — rysowana ikona, nie systemowe emoji.
  const skull = scene.add.image(x, y - 6, ICON.skull).setDisplaySize(10, 10);
  layer.add(skull);
  scene.tweens.add({
    targets: skull,
    displayWidth: 34,
    displayHeight: 34,
    y: y - 44,
    duration: 340,
    ease: E.out,
  });
  scene.tweens.add({
    targets: skull,
    alpha: 0,
    y: y - 62,
    delay: 520,
    duration: 420,
    onComplete: () => skull.destroy(),
  });
}

// ---------- ekran końca bitwy ----------

/** Wstęga z wzorca: kapsułka z wciętymi końcami, ciemny kontur, błyk u góry. */
function ribbon(
  g: Phaser.GameObjects.Graphics,
  w: number,
  h: number,
  fill: number,
  deep: number
) {
  const tail = 26;
  const half = w / 2;
  // Ogony wstęgi rysujemy pod spodem, żeby wychodziły zza właściwego pasa.
  for (const dir of [-1, 1]) {
    g.fillStyle(deep, 1);
    g.beginPath();
    g.moveTo(dir * (half - 12), -h / 2 + 4);
    g.lineTo(dir * (half + tail), -h / 2 + 16);
    g.lineTo(dir * (half + tail - 14), 0);
    g.lineTo(dir * (half + tail), h / 2 - 16);
    g.lineTo(dir * (half - 12), h / 2 - 4);
    g.closePath();
    g.fillPath();
  }

  g.fillStyle(C.shadow, 0.95);
  g.fillRoundedRect(-half - 5, -h / 2 - 5, w + 10, h + 10, h / 2 + 5);
  g.fillStyle(deep, 1);
  g.fillRoundedRect(-half - 2, -h / 2 - 2, w + 4, h + 4, h / 2 + 2);
  g.fillStyle(fill, 1);
  g.fillRoundedRect(-half, -h / 2, w, h, h / 2);
  g.fillStyle(C.white, 0.3);
  g.fillRoundedRect(-half + 8, -h / 2 + 5, w - 16, h * 0.3, h * 0.15);
}

/**
 * Ekran zwycięstwa i porażki. Poprzednia wersja to był szary prostokąt
 * z napisem — po dwóch minutach bitwy gracz dostawał widok okna dialogowego.
 *
 * Wzorzec (rozbłysk ewolucji) mówi wprost, czego brakowało: promieniste
 * światło bijące od środka, obracające się powoli, pierścienie i deszcz iskier.
 * Napis siedzi na wstędze, tak jak logo POKÉTOON siedzi na swojej płytce —
 * słowo rzucone na tło zawsze wygląda na prowizorkę.
 *
 * Przy porażce zostaje ta sama konstrukcja, ale w chłodnej palecie i bez
 * iskier: przegrana ma być czytelnie inna, nie tylko innym słowem.
 */
export function showOutcomeScreen(
  scene: Phaser.Scene,
  layer: Phaser.GameObjects.Container,
  won: boolean,
  x: number,
  y: number,
  subtitle: string
) {
  const accent = won ? C.gold : C.foe;
  const deep = won ? C.goldDeep : C.foeDeep;

  const veil = scene.add
    .rectangle(scene.scale.width / 2, scene.scale.height / 2, scene.scale.width, scene.scale.height, C.shadow, 0)
    .setInteractive();
  layer.add(veil);
  scene.tweens.add({ targets: veil, fillAlpha: 0.62, duration: T.fade });

  // Promienie: wachlarz wąskich klinów od środka. Obracają się bardzo powoli,
  // więc kadr żyje, ale nie odciąga wzroku od napisu.
  const rays = scene.add.graphics({ x, y }).setBlendMode(Phaser.BlendModes.ADD);
  const len = Math.max(scene.scale.width, scene.scale.height);
  for (let i = 0; i < 20; i++) {
    const a = Phaser.Math.DegToRad(i * 18);
    const spread = Phaser.Math.DegToRad(i % 2 === 0 ? 6.5 : 3);
    rays.fillStyle(accent, i % 2 === 0 ? 0.16 : 0.09);
    rays.beginPath();
    rays.moveTo(0, 0);
    rays.lineTo(Math.cos(a - spread) * len, Math.sin(a - spread) * len);
    rays.lineTo(Math.cos(a + spread) * len, Math.sin(a + spread) * len);
    rays.closePath();
    rays.fillPath();
  }
  rays.setScale(0.2).setAlpha(0);
  layer.add(rays);
  scene.tweens.add({ targets: rays, scale: 1, alpha: 1, duration: 520, ease: E.snap });
  scene.tweens.add({ targets: rays, angle: 360, duration: 60000, repeat: -1 });

  // Ciepła poświata w środku — to ona „zalewa kadr" jak we wzorcu.
  const glow = scene.add
    .image(x, y, FX.glow)
    .setTint(accent)
    .setBlendMode(Phaser.BlendModes.ADD)
    .setScale(0.5)
    .setAlpha(0);
  layer.add(glow);
  // Poświata jest celowo przygaszona: przy pełnej sile zalewała środek na
  // biało i podpis pod wstęgą przestawał być czytelny.
  scene.tweens.add({ targets: glow, scale: 4.2, alpha: 0.42, duration: 620, ease: E.snap });

  ring(scene, layer, x, y, C.white, 6, 14, 900, 120);
  ring(scene, layer, x, y, accent, 4, 20, 1100, 300);

  // Wstęga z napisem.
  const g = scene.add.graphics();
  ribbon(g, 420, 74, accent, deep);
  const title = scene.add
    .text(0, 0, won ? 'ZWYCIĘSTWO!' : 'PORAŻKA', display(44, won ? H.white : H.white))
    .setOrigin(0.5);
  const plate = scene.add.container(x, y, [g, title]).setScale(0.2).setAngle(-6);
  layer.add(plate);
  scene.tweens.add({
    targets: plate,
    scale: 1,
    angle: 0,
    duration: 480,
    delay: 180,
    ease: E.out,
  });

  // Podpis na własnej ciemnej kapsułce — jasne tło rozbłysku zjadłoby sam
  // napis, choćby miał kontur.
  const sub = scene.add.text(0, 0, subtitle, display(16, H.goldLight)).setOrigin(0.5);
  const subBg = scene.add.graphics();
  subBg.fillStyle(C.shadow, 0.72);
  subBg.fillRoundedRect(-sub.width / 2 - 16, -17, sub.width + 32, 34, 17);
  const subBox = scene.add.container(x, y + 78, [subBg, sub]).setAlpha(0);
  layer.add(subBox);
  scene.tweens.add({ targets: subBox, alpha: 1, y: y + 72, duration: T.fade, delay: 620 });

  if (!won) return;

  // Deszcz iskier — sypie się przez chwilę po wygranej, potem gaśnie, żeby
  // ekran dało się spokojnie oglądać.
  const rain = scene.add.particles(0, 0, FX.twinkle, {
    x: { min: BOARD_X, max: BOARD_X + BOARD_W },
    y: BOARD_Y - 20,
    speedY: { min: 70, max: 220 },
    speedX: { min: -40, max: 40 },
    lifespan: 2600,
    scale: { start: 0.55, end: 0 },
    rotate: { start: 0, end: 120 },
    tint: [C.gold, C.goldLight, C.white],
    blendMode: Phaser.BlendModes.ADD,
    frequency: 40,
  });
  layer.add(rain);

  const burst = scene.add.particles(0, 0, FX.spark, {
    speed: { min: 120, max: 520 },
    lifespan: { min: 500, max: 1100 },
    scale: { start: 1.1, end: 0 },
    tint: [C.gold, C.goldLight, C.white],
    blendMode: Phaser.BlendModes.ADD,
    emitting: false,
  });
  layer.add(burst);
  burst.explode(60, x, y);
}
