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
  /**
   * Wielka, bardzo miękka łuna — osobna tekstura od `glow`, bo poświata
   * trafienia ma mieć 200-250 px średnicy. Rozciąganie 128-pikselowego
   * rdzenia na taki rozmiar dawało widoczny stopień i twardy brzeg, czyli
   * dokładnie tę „naklejkę", którą zarzucił krytyk. Ta tekstura jest większa
   * i gaśnie znacznie łagodniej, więc na brzegu naprawdę dochodzi do zera.
   */
  bloom: 'fx_luna',
  /** Okrągła iskra z jasnym środkiem — główny budulec deszczu iskier. */
  spark: 'fx_iskra',
  /** Rozmyta drobinka bez ostrego środka — iskry „zdmuchnięte w pył" w tle. */
  mote: 'fx_pyl',
  /** Czterokątny błysk — drobniejszy pył, żeby iskry miały różne kształty. */
  twinkle: 'fx_blyszczka',
} as const;

/**
 * Poświata jako stos kółek o malejącym promieniu i niskiej alfie. Phaser nie
 * ma gradientu na kształcie, ale alfa nakłada się warstwami, więc środek
 * wychodzi jasny, a brzeg rozmyty — dokładnie to, czego potrzebuje błysk.
 *
 * `k` steruje profilem: alfa w odległości t od środka wychodzi w przybliżeniu
 * 1 - exp(-k * (1 - t)), bo każda kolejna warstwa mnoży przezroczystość. Dzięki
 * temu jedną liczbą ustawiamy jasność rdzenia i zawsze mamy zero na brzegu —
 * bez tego poświata kończyła się widocznym kółkiem.
 */
function drawGlow(g: Phaser.GameObjects.Graphics, size: number, k = 3.5, steps = 72) {
  const c = size / 2;
  const a = k / steps;
  for (let i = steps; i > 0; i--) {
    g.fillStyle(C.white, a);
    g.fillCircle(c, c, (c * i) / steps);
  }
}

export function buildEffectTextures(scene: Phaser.Scene) {
  if (scene.textures.exists(FX.glow)) return;

  const glow = scene.add.graphics();
  drawGlow(glow, 128);
  glow.generateTexture(FX.glow, 128, 128);
  glow.destroy();

  // Łuna. Poprzednia była tak słaba (k = 0.9, czyli ~0.6 alfy w samym środku,
  // rozciągnięte na 250 px), że po rozciągnięciu do rozmiaru trafienia w ogóle
  // nie było jej widać — sonda pokazała pustą planszę tam, gdzie miało zalewać
  // światło. Stąd k = 2.6: rdzeń praktycznie kryjący, brzeg nadal schodzący do
  // zera. Tekstura ma 512 px, bo przy 256 rozciągnięcie na 250 px pokazywało
  // stopnie warstw.
  const bloom = scene.add.graphics();
  drawGlow(bloom, 512, 2.6, 128);
  bloom.generateTexture(FX.bloom, 512, 512);
  bloom.destroy();

  // Pył: ta sama metoda co łuna, ale bez jasnego środka — drobinka wygląda na
  // nieostrą, więc iskry z niej zrobione czytają się jako dalszy plan.
  const mote = scene.add.graphics();
  drawGlow(mote, 32, 1.1, 24);
  mote.generateTexture(FX.mote, 32, 32);
  mote.destroy();

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

/**
 * Przyciemnienie barwy przy zachowaniu proporcji kanałów.
 *
 * Potrzebne przy warstwach ADD: dodanie pełnej barwy żywiołu do już jasnego
 * terenu wypycha wszystkie kanały do 255 i zostaje biel. Ta sama barwa
 * przyciemniona dodaje mniej, ale ZACHOWUJE nierówność kanałów — i właśnie
 * z niej bierze się temperatura światła, o którą upomniał się krytyk.
 */
function shade(color: number, k: number) {
  const c = Phaser.Display.Color.IntegerToRGB(color);
  return Phaser.Display.Color.GetColor(
    Math.round(c.r * k),
    Math.round(c.g * k),
    Math.round(c.b * k)
  );
}

/** Rozjaśnienie w stronę bieli — dla rdzenia światła, gdzie żar jest najgorętszy. */
function tintTowardsWhite(color: number, k: number) {
  const c = Phaser.Display.Color.IntegerToRGB(color);
  const up = (v: number) => Math.round(v + (255 - v) * k);
  return Phaser.Display.Color.GetColor(up(c.r), up(c.g), up(c.b));
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
 * Rozrzucone iskry. Krytyk zarzucił „parę identycznych kresek" — we wzorcu
 * iskry różnią się WSZYSTKIM: rozmiarem, jasnością i ostrością, i dopiero
 * z tego bierze się głębia (bliskie ostre, dalekie zdmuchnięte w pył).
 *
 * Dlatego nie emiter, tylko własne obiekty: emiter Phasera losuje prędkość
 * i czas życia, ale rozmiar i alfę bierze z jednej krzywej dla wszystkich
 * cząstek, więc wszystkie wyglądają tak samo. Tutaj każda iskra dostaje
 * własny promień 1-4 px, własną alfę 0.3-1.0 i własną teksturę: ostrą albo
 * rozmytą. Kilkadziesiąt obrazków na cios to dla Phasera nic.
 */
function sparkSpray(
  scene: Phaser.Scene,
  layer: Phaser.GameObjects.Container,
  x: number,
  y: number,
  color: number,
  count: number,
  reach: number
) {
  for (let i = 0; i < count; i++) {
    // Więcej iskier ostrych niż pyłu — pył ma tło budować, nie zamulać kadru.
    const sharp = Math.random() < 0.6;
    const r = Phaser.Math.FloatBetween(1, 4) * (sharp ? 1 : 1.7);
    // Barwa żywiołu przeważa; biel i złoto tylko doprawiają, żeby błysk nie
    // zrobił się znów biały (to był osobny zarzut).
    // Barwa żywiołu przeważa, ale rozjaśniona: drobna iskra w surowej barwie
    // ginie na tle w tej samej barwie (zielona iskra na trawie). Rozjaśnienie
    // trzyma hue, a daje kontrast.
    const bright = tintTowardsWhite(color, 0.35);
    const tint = Phaser.Math.RND.pick([bright, bright, bright, color, C.goldLight]);
    const sp = scene.add
      .image(x, y, sharp ? FX.spark : FX.mote)
      // `r` to promień JASNEGO RDZENIA iskry, nie całego obrazka. Tekstura ma
      // rdzeń o promieniu 3/16 swojej szerokości i miękką otoczkę wokół, więc
      // żeby rdzeń miał naprawdę 1-4 px, obrazek musi być kilka razy większy.
      // Poprzednio rysowaliśmy cały obrazek w rozmiarze 2r — rdzeń wychodził
      // poniżej piksela i iskier po prostu nie było widać.
      .setDisplaySize(r * (sharp ? 5.4 : 7), r * (sharp ? 5.4 : 7))
      .setTint(tint)
      // Ostre iskry świecą (ADD) — są małe, więc wypalenie do bieli im nie
      // grozi, a muszą się przebić przez jasny teren. Pył idzie przez SCREEN:
      // ma być zdmuchniętą mgiełką w barwie żywiołu, nie punktem światła.
      .setBlendMode(sharp ? Phaser.BlendModes.ADD : Phaser.BlendModes.SCREEN)
      .setAlpha(Phaser.Math.FloatBetween(0.35, 1));
    layer.add(sp);

    const a = Phaser.Math.FloatBetween(0, Math.PI * 2);
    const d = Phaser.Math.FloatBetween(0.25, 1) * reach * (sharp ? 1 : 0.7);
    const life = Phaser.Math.Between(200, 520);
    scene.tweens.add({
      targets: sp,
      x: x + Math.cos(a) * d,
      // Lekkie opadanie: iskry mają ciążyć do ziemi, inaczej wyglądają jak
      // rozjeżdżająca się rozeta.
      y: y + Math.sin(a) * d * 0.72 + 14,
      displayWidth: r * 0.8,
      displayHeight: r * 0.8,
      alpha: 0,
      duration: life,
      ease: 'Quad.easeOut',
      onComplete: () => sp.destroy(),
    });
  }
}

/**
 * Błysk w punkcie uderzenia. Warstwy o różnym czasie życia, od najdłuższej
 * (poświata) po najkrótszą (przyciemnienie): bez tego stosu trafienie było
 * samym drgnięciem kamery — gracz nie miał gdzie skierować wzroku.
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

  // 0. Krótkie przyciemnienie pod uderzeniem. Na jasnej łące — a tym bardziej
  // na śniegu — tryb ADD nie ma już zapasu jasności i błysk po prostu ginie.
  // Ciemna elipsa daje światłu tło, od którego może się odbić: przez ~90 ms
  // pole pod celem ciemnieje, więc następna klatka z łuną czyta się jako
  // rozbłysk, a nie jako jaśniejsza plama na jasnym.
  const dim = scene.add
    .ellipse(x, y + 10, 104 * scale, 50 * scale, C.shadow, 0)
    .setBlendMode(Phaser.BlendModes.MULTIPLY);
  layer.add(dim);
  scene.tweens.add({
    targets: dim,
    fillAlpha: 0.5,
    duration: 35,
    yoyo: true,
    hold: 20,
    ease: E.snap,
    onComplete: () => dim.destroy(),
  });

  // 1. POŚWIATA — najważniejsza warstwa i główny zarzut z rundy 1. Rdzeń miał
  // ~30 px i był biały, więc trafienie wyglądało jak naklejka: nie wpływało na
  // resztę planszy. Tu łuna ma 200-250 px, czyli obejmuje cel RAZEM z sąsiednimi
  // heksami (pole ma ~80 px) i gaśnie do zera na brzegu.
  //
  // Światło buduje się z DWÓCH warstw, bo żaden pojedynczy tryb mieszania nie
  // daje naraz jasności i barwy (sprawdzone sondą na łące i na śniegu):
  //  - ADD rozjaśnia i naprawdę „zalewa scenę", ale przy jasnej barwie żywiołu
  //    wypala wszystko do bieli;
  //  - SCREEN barwę trzyma, ale zielona poświata na zielonej trawie nie
  //    rozjaśnia niczego — trafienie Verdiko było po prostu niewidoczne.
  // Stąd: przygaszona barwa w ADD (nierówne kanały, więc światło ma temperaturę)
  // plus pełna barwa położona zwyczajnie, która nasyca to, co ADD rozjaśniło.
  const bloomPx = (205 + p * 45) * (o.strong ? 1.18 : o.weak ? 0.82 : 1);
  const lights: Phaser.GameObjects.Image[] = [];
  const addLight = (tint: number, mode: number, alpha: number, from: number) => {
    const img = scene.add
      .image(x, y, FX.bloom)
      .setTint(tint)
      .setBlendMode(mode)
      .setDisplaySize(bloomPx * from, bloomPx * from)
      .setAlpha(0);
    layer.add(img);
    // Rozbłysk: w 70 ms do pełna, potem spokojne gaśnięcie. Wolniejsze
    // narastanie wyglądałoby jak zapalana lampa, a nie jak uderzenie.
    scene.tweens.add({
      targets: img,
      displayWidth: bloomPx,
      displayHeight: bloomPx,
      alpha,
      duration: 70,
      ease: E.snap,
    });
    scene.tweens.add({
      targets: img,
      displayWidth: bloomPx * 1.25,
      displayHeight: bloomPx * 1.25,
      alpha: 0,
      delay: 80,
      duration: 260,
      ease: 'Quad.easeIn',
      onComplete: () => img.destroy(),
    });
    lights.push(img);
  };
  addLight(shade(o.color, 0.62), Phaser.BlendModes.ADD, 1, 0.5);
  addLight(o.color, Phaser.BlendModes.NORMAL, 0.5, 0.62);

  // 2. Aureola — gęstsze światło tuż przy punkcie kontaktu, między szeroką łuną
  // a białym rdzeniem. Bez niej przejście od łuny do rdzenia było skokiem.
  // Barwa rozjaśniona w stronę bieli, bo tutaj światło jest już tak mocne, że
  // czysta barwa żywiołu czytałaby się jak plama farby, a nie jak żar.
  const halo = scene.add
    .image(x, y, FX.glow)
    .setTint(tintTowardsWhite(o.color, 0.45))
    .setBlendMode(Phaser.BlendModes.ADD)
    .setScale(0.34 * scale)
    .setAlpha(1);
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
  // Celowo mały: to on był całym rozbłyskiem z rundy 1 („biała plamka ~30 px").
  // Teraz jest tylko punktem kontaktu wewnątrz barwnego światła.
  const core = scene.add
    .image(x, y, FX.glow)
    .setBlendMode(Phaser.BlendModes.ADD)
    .setScale(0.11 * scale)
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
  ring(scene, layer, x, y, tintTowardsWhite(o.color, 0.3), 3, 4.6 * scale, 380, 80);

  // 4. Deszcz iskier o losowym promieniu i jasności — 30-50 sztuk, część
  // ostra, część rozmyta w pył (szczegóły w `sparkSpray`). To one dają wrażenie
  // głębi; wcześniej wszystkie wyglądały identycznie i czytały się jak kreski.
  sparkSpray(
    scene,
    layer,
    x,
    y,
    o.color,
    Math.round((o.strong ? 44 : o.weak ? 26 : 34) + p * 10),
    120 * scale
  );

  // 5. Kilka błyszczek o innym kształcie — pojedyncze ostre gwiazdki w gęstwie
  // okrągłych iskier łamią monotonię, tak jak we wzorcu.
  const dust = scene.add.particles(0, 0, FX.twinkle, {
    speed: { min: 40, max: 170 * scale },
    lifespan: { min: 300, max: 620 },
    scale: { start: 0.45 * scale, end: 0 },
    alpha: { min: 0.35, max: 1 },
    rotate: { start: 0, end: 180 },
    tint: [tintTowardsWhite(o.color, 0.4), C.goldLight],
    blendMode: Phaser.BlendModes.ADD,
    emitting: false,
  });
  layer.add(dust);
  dust.explode(Math.round(6 + p * 6), x, y);

  // Emiter żyje własnym życiem po wystrzale, więc sprzątamy go z opóźnieniem
  // dłuższym niż najdłuższa cząstka.
  scene.time.delayedCall(900, () => dust.destroy());

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
  g.lineStyle(18, color, 0.55);
  g.beginPath();
  g.arc(0, 0, 38, Phaser.Math.DegToRad(-58), Phaser.Math.DegToRad(58));
  g.strokePath();
  g.lineStyle(8, C.white, 0.95);
  g.beginPath();
  g.arc(0, 0, 38, Phaser.Math.DegToRad(-50), Phaser.Math.DegToRad(50));
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
  // Barwna łuna wokół pocisku, osobno od jasnego rdzenia. Poprzednia wersja
  // miała samą aureolę ADD i biel z rdzenia wygrywała z barwą żywiołu —
  // strzał ognisty i wodny wyglądały tak samo. SCREEN nie wypala barwy, więc
  // pomarańcz zostaje pomarańczą także nad jasną trawą.
  const wash = scene.add
    .image(0, 0, FX.bloom)
    .setTint(o.color)
    // Zwykłe krycie o niskiej alfie: to warstwa NASYCENIA, nie jasności.
    // Jasność daje aureola w ADD, a ta plama pilnuje, żeby pocisk miał barwę
    // żywiołu także nad jasną trawą, gdzie tryby świetlne bieleją.
    .setBlendMode(Phaser.BlendModes.NORMAL)
    .setDisplaySize(o.broken ? 60 : 96, o.broken ? 60 : 96)
    .setAlpha(0.45);
  const halo = scene.add
    .image(0, 0, FX.glow)
    // Przygaszona barwa w ADD: świeci, ale nie wypala się do bieli — ta sama
    // zasada co przy łunie trafienia.
    .setTint(shade(o.color, 0.75))
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
  shot.add([wash, halo, spark, head]);
  layer.add(shot);

  // Ikony są rysowane czubkiem do góry, więc dokładamy ćwierć obrotu: wtedy
  // szpic płomienia i kropli wskazuje kierunek lotu.
  shot.setRotation(angle + Math.PI / 2);

  // Ślad pocisku sypany ręcznie, obrazek po obrazku.
  //
  // Wcześniej robił to emiter cząstek z listą barw — i mimo tej listy smuga
  // wychodziła biała (widać to na zrzucie 06 z rundy 1: za niebieską kroplą
  // lecą białe kulki). Barwienie pojedynczych obrazków działa niezawodnie,
  // więc smugę robimy tak samo jak iskry trafienia. Przy okazji każdy ślad
  // dostaje własny rozmiar i rozmycie — bliskie ostre, dalekie w pył — czyli
  // to samo zróżnicowanie, którego krytyk zażądał od iskier.
  const bright = tintTowardsWhite(o.color, 0.3);
  const trail = scene.time.addEvent({
    delay: 16,
    loop: true,
    callback: () => {
      if (!shot.active) return;
      const sharp = Math.random() < 0.65;
      const r = Phaser.Math.FloatBetween(1.5, 4) * (o.broken ? 0.6 : 1);
      const puff = scene.add
        .image(
          shot.x + Phaser.Math.FloatBetween(-4, 4),
          shot.y + Phaser.Math.FloatBetween(-4, 4),
          sharp ? FX.spark : FX.mote
        )
        .setDisplaySize(r * (sharp ? 5 : 8), r * (sharp ? 5 : 8))
        .setTint(Phaser.Math.RND.pick([bright, bright, o.color, C.goldLight]))
        .setBlendMode(sharp ? Phaser.BlendModes.ADD : Phaser.BlendModes.SCREEN)
        .setAlpha(Phaser.Math.FloatBetween(0.45, 1));
      layer.add(puff);
      scene.tweens.add({
        targets: puff,
        displayWidth: 1,
        displayHeight: 1,
        alpha: 0,
        duration: o.broken ? 220 : 340,
        ease: 'Quad.easeOut',
        onComplete: () => puff.destroy(),
      });
    },
  });

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
      // Sypanie kończymy w chwili trafienia; już wypuszczone drobiny gasną
      // same, więc smuga zwęża się naturalnie zamiast urwać się w powietrzu.
      trail.remove();
      shot.destroy();
      onHit();
    },
  });
}

// ---------- napisy ulotne ----------

/**
 * Zajęte prostokąty napisów, per scena — nowa tabliczka szuka wolnego pasa,
 * zamiast lądować na poprzedniej.
 */
const taken = new WeakMap<Phaser.Scene, Phaser.Geom.Rectangle[]>();

/**
 * Skąd tabliczka wie, CO leży pod spodem.
 *
 * Rozsuwanie z rundy 1 pilnowało tylko innych napisów, więc trzy komunikaty
 * z jednego ciosu owszem nie zlewały się ze sobą, ale całą kolumną siadały na
 * plakietkach sąsiednich oddziałów (widać to na zrzucie 05: „-10 / padło 5 /
 * Słabo skuteczne..." przykrywa Verdiko i Cindro razem z paskami życia).
 * Napis ulotny gaśnie po chwili, a plakietka jest stałą informacją — to napis
 * ma ustąpić, nie odwrotnie.
 *
 * Scena rejestruje tu funkcję zwracającą prostokąty zajęte przez oddziały.
 * Funkcja, nie gotowa lista, bo oddziały chodzą i giną w trakcie bitwy, a
 * tabliczka musi znać stan z chwili, w której wyskakuje.
 */
const obstacles = new WeakMap<Phaser.Scene, () => Phaser.Geom.Rectangle[]>();

export function setLabelObstacles(scene: Phaser.Scene, fn: () => Phaser.Geom.Rectangle[]) {
  obstacles.set(scene, fn);
}

/**
 * Bufor napisów zgłoszonych w tej samej klatce.
 *
 * Rozsuwanie w pionie z rundy 1 działało między napisami, ale nie wiedziało
 * nic o plakietkach oddziałów pod spodem — przy ciosie zabijającym część
 * oddziału leciały trzy komunikaty naraz („-10", „padło 5", „Słabo
 * skuteczne...") i rozpychały się po całej lewej kolumnie, wchodząc na paski
 * życia i liczebności. Stąd zmiana podejścia: wszystkie komunikaty z jednego
 * ciosu zbieramy przez jedną klatkę i pokazujemy jako JEDNĄ tabliczkę
 * z wierszami, na własnym ciemnym tle. Jeden zwarty prostokąt da się odsunąć
 * od plakietek; trzy latające napisy nie dały się.
 */
const pending = new WeakMap<
  Phaser.Scene,
  { layer: Phaser.GameObjects.Container; o: LabelOpts }[]
>();

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
 * Zgłasza napis ulotny. Nie rysuje od razu: komunikaty z tego samego ciosu
 * padają w jednym wywołaniu sceny, więc czekamy jedną klatkę i dopiero wtedy
 * układamy je razem (patrz `pending`). Opóźnienie jest niezauważalne — napis
 * i tak wypływał dopiero po rozbłysku.
 */
export function floatLabel(
  scene: Phaser.Scene,
  layer: Phaser.GameObjects.Container,
  o: LabelOpts
) {
  const q = pending.get(scene);
  if (q) {
    q.push({ layer, o });
    return;
  }
  const fresh = [{ layer, o }];
  pending.set(scene, fresh);
  scene.time.delayedCall(0, () => {
    pending.delete(scene);
    flushLabels(scene, fresh);
  });
}

/** Jeden wiersz tabliczki: ikona plus tekst, wyśrodkowane w swojej szerokości. */
function labelRow(scene: Phaser.Scene, o: LabelOpts) {
  const size = o.size ?? 15;
  const label = scene.add.text(0, 0, o.text, display(size, o.color)).setOrigin(0, 0.5);
  const parts: Phaser.GameObjects.Image[] = [label as unknown as Phaser.GameObjects.Image];
  let w = label.width;
  if (o.iconKey) {
    const ic = scene.add
      .image(0, 0, o.iconKey)
      .setDisplaySize(size + 3, size + 3)
      .setOrigin(0, 0.5);
    label.setX(size + 6);
    w += size + 6;
    parts.push(ic);
  }
  parts.forEach((p) => p.setX(p.x - w / 2));
  // Tryb mieszania jawnie zwykły: w tej samej warstwie leżą iskry rysowane
  // addytywnie i bez tego napis potrafi przejąć ich tryb, przez co biel na
  // jasnej trawie robi się prawie niewidoczna.
  parts.forEach((p) => p.setBlendMode(Phaser.BlendModes.NORMAL));
  return { parts, w, h: size + 7 };
}

/**
 * Układa zebrane komunikaty w tabliczki — po jednej na punkt na planszy.
 * Grupujemy po pozycji, bo w jednej klatce potrafi paść komunikat przy celu
 * i przy atakującym; to dwa różne miejsca i nie wolno ich zlepić.
 */
function flushLabels(
  scene: Phaser.Scene,
  items: { layer: Phaser.GameObjects.Container; o: LabelOpts }[]
) {
  const groups: { layer: Phaser.GameObjects.Container; list: LabelOpts[]; x: number; y: number }[] =
    [];
  for (const it of items) {
    const g = groups.find(
      (k) => k.layer === it.layer && Math.abs(k.x - it.o.x) < 70 && Math.abs(k.y - it.o.y) < 70
    );
    if (g) {
      g.list.push(it.o);
      // Tabliczka czepia się najwyższego z komunikatów grupy, żeby rosła w dół
      // od stałego punktu, a nie skakała przy każdym dołożonym wierszu.
      g.y = Math.min(g.y, it.o.y);
    } else groups.push({ layer: it.layer, list: [it.o], x: it.o.x, y: it.o.y });
  }
  for (const g of groups) plate(scene, g.layer, g.x, g.y, g.list);
}

/** Ciemna kapsułka z wierszami komunikatów, wyskakująca i wypływająca w górę. */
function plate(
  scene: Phaser.Scene,
  layer: Phaser.GameObjects.Container,
  ax: number,
  ay: number,
  list: LabelOpts[]
) {
  const rows = list.map((o) => labelRow(scene, o));
  const padX = 10;
  const padY = 6;
  const gap = 2;
  const w = Math.max(...rows.map((r) => r.w)) + padX * 2;
  const h = rows.reduce((s, r) => s + r.h, 0) + gap * (rows.length - 1) + padY * 2;

  // Tło: ciemna kapsułka o wysokiej alfie. To ona odcina napis od plakietek
  // oddziału — sam kontur liter nie wystarczał, bo pod spodem leżały paski
  // życia i liczebność, czyli drobny, kontrastowy wzór.
  const bg = scene.add.graphics();
  bg.fillStyle(C.shadow, 0.8);
  bg.fillRoundedRect(-w / 2, -h / 2, w, h, 9);
  bg.lineStyle(2, C.white, 0.22);
  bg.strokeRoundedRect(-w / 2, -h / 2, w, h, 9);
  bg.setBlendMode(Phaser.BlendModes.NORMAL);

  const parts: Phaser.GameObjects.GameObject[] = [bg];
  let cy = -h / 2 + padY;
  for (const r of rows) {
    r.parts.forEach((p) => p.setY(p.y + cy + r.h / 2));
    parts.push(...r.parts);
    cy += r.h + gap;
  }

  const minY = BOARD_Y + h / 2 + 6;
  const maxY = BOARD_Y + BOARD_H - h / 2 - 6;
  const x = Phaser.Math.Clamp(ax, BOARD_X + w / 2 + 4, BOARD_X + BOARD_W - w / 2 - 4);
  // Tabliczka siada nad punktem zdarzenia, ale o własną wysokość wyżej: przy
  // wielowierszowej treści dolna krawędź inaczej wjeżdżałaby na plakietkę
  // stojącego niżej oddziału.
  const baseY = Phaser.Math.Clamp(ay - (h - 24) / 2, minY, maxY);

  // Szukanie wolnego miejsca. Nie „pierwsze, które nie koliduje" — przy
  // zatłoczonym rogu planszy takiego miejsca po prostu nie ma i trzeba wybrać
  // najmniej złe. Dlatego każdy kandydat dostaje karę i wygrywa najmniejsza.
  //
  // Kandydaci idą też w bok, nie tylko w pionie: cios w narożniku ma nad sobą
  // krawędź planszy i pod sobą sąsiada, więc jedyne wolne miejsce bywa obok.
  const busy = taken.get(scene) ?? [];
  taken.set(scene, busy);
  const units = obstacles.get(scene)?.() ?? [];
  const minX = BOARD_X + w / 2 + 4;
  const maxX = BOARD_X + BOARD_W - w / 2 - 4;
  const step = h + 4;

  const probe = new Phaser.Geom.Rectangle(0, 0, w, h);
  const overlap = (r: Phaser.Geom.Rectangle) => {
    const ox = Math.min(probe.right, r.right) - Math.max(probe.left, r.left);
    const oy = Math.min(probe.bottom, r.bottom) - Math.max(probe.top, r.top);
    return ox > 0 && oy > 0 ? ox * oy : 0;
  };

  let bestX = Phaser.Math.Clamp(x, minX, maxX);
  let bestY = Phaser.Math.Clamp(baseY, minY, maxY);
  let bestCost = Infinity;
  for (const dy of [-1, -2, 0, -3, 1, 2, 3, -4]) {
    for (const dx of [0, -0.75, 0.75, -1.4, 1.4]) {
      const cx = Phaser.Math.Clamp(x + dx * w, minX, maxX);
      const cy = Phaser.Math.Clamp(baseY + dy * step, minY, maxY);
      probe.setPosition(cx - w / 2, cy - h / 2);
      // Nachodzenie na inną tabliczkę jest gorsze niż na oddział: dwa napisy
      // na sobie są nie do przeczytania, napis na stworku tylko go zasłania.
      let cost = 0;
      for (const r of busy) cost += overlap(r) * 3;
      for (const r of units) cost += overlap(r);
      // Drobna kara za oddalenie od zdarzenia — przy równym koszcie tabliczka
      // ma zostać przy tym, kogo dotyczy, inaczej gracz nie wie, kto oberwał.
      cost += (Math.abs(cx - x) + Math.abs(cy - baseY) * 1.6) * 6;
      if (cost < bestCost) {
        bestCost = cost;
        bestX = cx;
        bestY = cy;
      }
      if (bestCost === 0) break;
    }
    if (bestCost === 0) break;
  }
  const x2 = bestX;
  const y = bestY;
  const box = new Phaser.Geom.Rectangle(x2 - w / 2, y - h / 2, w, h);
  busy.push(box);

  const cont = scene.add
    .container(x2, y, parts)
    .setScale(0.45)
    .setBlendMode(Phaser.BlendModes.NORMAL);
  layer.add(cont);

  // Sprężyste wejście i dopiero potem wypłynięcie: skok przyciąga wzrok
  // w chwili trafienia, powolne unoszenie daje czas na przeczytanie.
  scene.tweens.add({ targets: cont, scale: 1, duration: 170, ease: E.out });
  scene.tweens.add({
    targets: cont,
    y: y - 28,
    alpha: 0,
    delay: 260,
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

  // Wybuch iskier tym samym mechanizmem co przy trafieniu — emiter cząstek
  // gubił barwę i sypał samą bielą, a zejście oddziału ma nieść barwę strony.
  sparkSpray(scene, layer, x, y, color, 40, 150);

  // Czaszka jako pieczęć na zejściu — rysowana ikona, nie systemowe emoji.
  // Czaszka unosi się nad pole, ale nie wyżej niż górna krawędź planszy —
  // przy oddziale z pierwszego rzędu wyjeżdżała na pasek stanu tury.
  const top = Math.max(y - 44, BOARD_Y + 22);
  const skull = scene.add.image(x, y - 6, ICON.skull).setDisplaySize(10, 10);
  layer.add(skull);
  scene.tweens.add({
    targets: skull,
    displayWidth: 34,
    displayHeight: 34,
    y: top,
    duration: 340,
    ease: E.out,
  });
  scene.tweens.add({
    targets: skull,
    alpha: 0,
    y: top - 16,
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
  // Światło ekranu końca ma osobną barwę od wstęgi. Przy porażce wstęga jest
  // czerwona, ale ŚWIATŁO musi być zimne i słabe — na czerwono-złotych
  // promieniach przegrana wyglądała jak druga wersja zwycięstwa.
  const light = won ? accent : C.skyBottom;

  const veil = scene.add
    .rectangle(scene.scale.width / 2, scene.scale.height / 2, scene.scale.width, scene.scale.height, C.shadow, 0)
    .setInteractive();
  layer.add(veil);
  scene.tweens.add({ targets: veil, fillAlpha: won ? 0.62 : 0.78, duration: T.fade });

  // Promienie: wachlarz wąskich klinów od środka. Obracają się bardzo powoli,
  // więc kadr żyje, ale nie odciąga wzroku od napisu.
  const rays = scene.add.graphics({ x, y }).setBlendMode(Phaser.BlendModes.ADD);
  const len = Math.max(scene.scale.width, scene.scale.height);
  for (let i = 0; i < 20; i++) {
    const a = Phaser.Math.DegToRad(i * 18);
    const spread = Phaser.Math.DegToRad(i % 2 === 0 ? 6.5 : 3);
    rays.fillStyle(light, (i % 2 === 0 ? 0.16 : 0.09) * (won ? 1 : 0.55));
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
    .setTint(light)
    .setBlendMode(Phaser.BlendModes.ADD)
    .setScale(0.5)
    .setAlpha(0);
  layer.add(glow);
  // Poświata jest celowo przygaszona: przy pełnej sile zalewała środek na
  // biało i podpis pod wstęgą przestawał być czytelny.
  scene.tweens.add({
    targets: glow,
    scale: 4.2,
    alpha: won ? 0.42 : 0.2,
    duration: 620,
    ease: E.snap,
  });

  ring(scene, layer, x, y, C.white, 6, 14, 900, 120);
  ring(scene, layer, x, y, light, 4, 20, 1100, 300);

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
