/**
 * Życie na tle menu głównego: światło latarń i okien, piana wodospadu,
 * świetliki, spadające liście, ptaki i stworek, który mieszka w tej wiosce.
 *
 * Wzorzec (menu Heroes 2) ma w nieruchomym obrazku kilka ruchomych drobiazgów:
 * migające świece w oknach, dym, chorągiewkę. Robią one więcej, niż wynika
 * z ich wielkości — bez nich namalowana ulica jest pocztówką, z nimi jest
 * miejscem, w którym ktoś mieszka. Zasada, której się tu trzymamy: KAŻDY
 * ruch jest powolny i mały. Menu ma oddychać, a nie migać — dziecko ma
 * patrzeć na drogowskaz, nie na ptaki.
 *
 * Współrzędne są zdjęte z tła `public/menu/tlo.jpg` (siatka co 25 px nałożona
 * na obrazek). Po wymianie tła trzeba je zmierzyć od nowa — inaczej latarnie
 * świecą w powietrzu obok latarń.
 */

import Phaser from 'phaser';

/** Tekstury rysowane w kodzie — wszystkie miękkie, bez ostrych krawędzi. */
export const TEX = {
  blask: 'mz-blask',
  pylek: 'mz-pylek',
  lisc: 'mz-lisc',
  ptak: 'mz-ptak',
  gwiazdka: 'mz-gwiazdka',
  cien: 'mz-cien',
} as const;

/** Warstwy tła menu. Drogowskaz i okna leżą wyżej (patrz MenuScene). */
export const ZM = {
  tlo: 0,
  swiatlo: 2,
  stworki: 4,
  czastki: 6,
} as const;

/**
 * Latarnie i okna: (x, y, promień). Promień to wielkość poświaty, nie
 * płomienia — płomień jest już namalowany na tle, dokładamy tylko jego
 * oddech. Kolejność nie ma znaczenia.
 */
const LATARNIE: [number, number, number][] = [
  [285, 252, 24],
  [357, 256, 24],
  [323, 229, 30],
  [234, 243, 16],
  [410, 258, 16],
  [495, 258, 22],
  [453, 105, 12],
  [503, 105, 12],
  [620, 108, 12],
  [695, 108, 12],
  [758, 34, 16],
  [795, 86, 24],
  [724, 116, 16],
  [793, 172, 26],
  [115, 183, 13],
  [203, 183, 13],
  [857, 265, 17],
  [918, 276, 14],
  [275, 340, 16],
  [720, 408, 18],
];

/** Wodospad nad stawem: pas, w którym skrzy się woda. */
const WODOSPAD = new Phaser.Geom.Rectangle(742, 330, 20, 44);
/** Korona wielkiego drzewa: stąd spadają liście. */
const KORONA = new Phaser.Geom.Rectangle(560, 0, 400, 110);

/** Rysuje tekstury raz na grę — po powrocie do menu są już w pamięci. */
export function zbudujTekstury(scene: Phaser.Scene) {
  if (scene.textures.exists(TEX.blask)) return;

  const kolo = (klucz: string, r: number, stopy: [number, string][]) => {
    const t = scene.textures.createCanvas(klucz, r * 2, r * 2)!;
    const ctx = t.getContext();
    const g = ctx.createRadialGradient(r, r, 0, r, r, r);
    for (const [o, c] of stopy) g.addColorStop(o, c);
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, r * 2, r * 2);
    t.refresh();
  };
  // Poświata: gęsty środek i bardzo długi ogon. Krótki ogon daje widoczny
  // krążek, a światło latarni nie ma krawędzi.
  kolo(TEX.blask, 64, [
    [0, 'rgba(255,255,255,1)'],
    [0.18, 'rgba(255,255,255,0.55)'],
    [0.5, 'rgba(255,255,255,0.14)'],
    [1, 'rgba(255,255,255,0)'],
  ]);
  // Cień kontaktowy od razu czarny — przyciemnianie białej poświaty
  // tintem dawało w Phaserze 4 plamę niewidoczną na jasnej ścieżce.
  kolo(TEX.cien, 32, [
    [0, 'rgba(10,6,2,0.85)'],
    [0.5, 'rgba(10,6,2,0.45)'],
    [1, 'rgba(10,6,2,0)'],
  ]);
  kolo(TEX.pylek, 8, [
    [0, 'rgba(255,255,255,1)'],
    [0.4, 'rgba(255,255,255,0.5)'],
    [1, 'rgba(255,255,255,0)'],
  ]);

  // Gwiazdka: cztery ramiona z miękkim środkiem — błysk na literach logo
  // i na wodzie.
  {
    const r = 24;
    const t = scene.textures.createCanvas(TEX.gwiazdka, r * 2, r * 2)!;
    const ctx = t.getContext();
    const g = ctx.createRadialGradient(r, r, 0, r, r, r * 0.5);
    g.addColorStop(0, 'rgba(255,255,255,1)');
    g.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, r * 2, r * 2);
    ctx.fillStyle = 'rgba(255,255,255,0.95)';
    for (const [dx, dy] of [
      [1, 0],
      [0, 1],
    ]) {
      ctx.beginPath();
      ctx.moveTo(r - dx * r, r - dy * r);
      ctx.quadraticCurveTo(r + dy * 2.2, r + dx * 2.2, r + dx * r, r + dy * r);
      ctx.quadraticCurveTo(r - dy * 2.2, r - dx * 2.2, r - dx * r, r - dy * r);
      ctx.fill();
    }
    t.refresh();
  }

  // Liść: dwa łuki i żyłka, w dwóch odcieniach zieleni korony drzewa.
  {
    const t = scene.textures.createCanvas(TEX.lisc, 20, 12)!;
    const ctx = t.getContext();
    const g = ctx.createLinearGradient(0, 0, 0, 12);
    g.addColorStop(0, '#b8d65a');
    g.addColorStop(1, '#5f9a2e');
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.moveTo(1, 6);
    ctx.quadraticCurveTo(10, -3, 19, 6);
    ctx.quadraticCurveTo(10, 15, 1, 6);
    ctx.fill();
    ctx.strokeStyle = 'rgba(60,90,20,0.7)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(2, 6);
    ctx.lineTo(18, 6);
    ctx.stroke();
    t.refresh();
  }

  // Ptak: sylwetka „ptaszka z bajki" — łuk skrzydeł z grubszym środkiem.
  // Machanie robi skala Y, więc wystarczy jedna klatka.
  {
    const t = scene.textures.createCanvas(TEX.ptak, 22, 10)!;
    const ctx = t.getContext();
    ctx.fillStyle = '#3a2a24';
    ctx.beginPath();
    ctx.moveTo(0, 2);
    ctx.quadraticCurveTo(6, 1, 11, 7);
    ctx.quadraticCurveTo(16, 1, 22, 2);
    ctx.quadraticCurveTo(16, 4, 11, 10);
    ctx.quadraticCurveTo(6, 4, 0, 2);
    ctx.fill();
    t.refresh();
  }

}

/** Wszystko, co żyje na tle. Zwraca funkcję, która zatrzymuje ptaki i liście. */
export function ozywTlo(scene: Phaser.Scene) {
  // Tło jest o zmierzchu (tools/menu_wczytaj.py, `tlo`), więc bez snopów
  // słońca i bez dymu — komin chaty chowa się za sztandarem. Staw zostaje
  // cichy: w pierwszej rundzie błyski na wodzie ciągnęły oko od menu.
  latarnie(scene);
  woda(scene);
  swietliki(scene);
  const liscie = spadajaceLiscie(scene);
  const ptaki = stadaPtakow(scene);
  return () => {
    liscie.remove();
    ptaki.remove();
  };
}

/**
 * Latarnie oddychają — każda we własnym tempie. Równe tempo wszystkich
 * naraz czyta się jak migający neon, a nie jak płomienie.
 */
function latarnie(scene: Phaser.Scene) {
  for (const [x, y, r] of LATARNIE) {
    const b = scene.add
      .image(x, y, TEX.blask)
      .setDisplaySize(r * 2.6, r * 2.6)
      .setTint(0xffb14a)
      .setBlendMode(Phaser.BlendModes.ADD)
      .setAlpha(0.32)
      .setDepth(ZM.swiatlo);
    scene.tweens.add({
      targets: b,
      alpha: { from: 0.22, to: 0.46 },
      scale: b.scale * 1.08,
      duration: Phaser.Math.Between(700, 1300),
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
      delay: Phaser.Math.Between(0, 900),
    });
  }
}

/** Wodospad: ledwie widoczna piana — ruch, który się zauważa dopiero po chwili. */
function woda(scene: Phaser.Scene) {
  scene.add
    .particles(0, 0, TEX.pylek, {
      emitZone: { type: 'random', source: WODOSPAD, quantity: 1 },
      lifespan: 700,
      frequency: 90,
      speedY: { min: 20, max: 50 },
      scale: { start: 0.6, end: 0.1 },
      alpha: { start: 0.45, end: 0 },
      tint: 0xcfe6ff,
      blendMode: Phaser.BlendModes.ADD,
    })
    .setDepth(ZM.czastki);
}

/**
 * Świetliki w krzakach — zmierzch bez nich byłby po prostu ciemniejszym
 * południem. Kilkanaście naraz, każdy zapala się i gaśnie w swoim tempie,
 * dryfując powoli; więcej w lewej połowie, bliżej drogowskazu.
 */
function swietliki(scene: Phaser.Scene) {
  for (const [strefa, co] of [
    [new Phaser.Geom.Rectangle(0, 300, 520, 394), 420],
    [new Phaser.Geom.Rectangle(520, 250, 440, 444), 900],
  ] as const) {
    scene.add
      .particles(0, 0, TEX.blask, {
        emitZone: { type: 'random', source: strefa, quantity: 1 },
        lifespan: { min: 2600, max: 4200 },
        frequency: co,
        speedX: { min: -10, max: 10 },
        speedY: { min: -12, max: 4 },
        scale: { min: 0.08, max: 0.14 },
        alpha: { onEmit: () => 0, onUpdate: (_p: unknown, _k: string, t: number) => Math.pow(Math.sin(t * Math.PI), 2) * 0.95 },
        tint: [0xf4ff9a, 0xffe27a, 0xd8ff8a],
        blendMode: Phaser.BlendModes.ADD,
        advance: 4000,
      })
      .setDepth(ZM.czastki);
  }
}

/**
 * Liście spadające z wielkiego drzewa: po kilka, co kilka sekund, kołysząc
 * się w locie. Tweeny zamiast emitera, bo emiter nie umie wahadła — a liść
 * spadający w linii prostej wygląda jak kamyk.
 */
function spadajaceLiscie(scene: Phaser.Scene) {
  const jeden = () => {
    const p = Phaser.Geom.Rectangle.Random(KORONA, new Phaser.Math.Vector2());
    const lisc = scene.add
      .image(p.x, p.y, TEX.lisc)
      .setScale(Phaser.Math.FloatBetween(0.55, 0.9))
      .setAngle(Phaser.Math.Between(0, 360))
      .setAlpha(0)
      .setDepth(ZM.czastki);
    const czas = Phaser.Math.Between(6000, 9000);
    scene.tweens.add({
      targets: lisc,
      y: p.y + Phaser.Math.Between(260, 420),
      x: p.x - Phaser.Math.Between(80, 220),
      duration: czas,
      ease: 'Sine.easeIn',
      onComplete: () => lisc.destroy(),
    });
    scene.tweens.add({ targets: lisc, alpha: 0.95, duration: 500 });
    scene.tweens.add({ targets: lisc, alpha: 0, delay: czas - 900, duration: 900 });
    // Wahadło: obrót i skala X (liść odwraca się bokiem do słońca).
    scene.tweens.add({
      targets: lisc,
      angle: '+=70',
      scaleX: { from: lisc.scaleX, to: lisc.scaleX * 0.25 },
      duration: Phaser.Math.Between(700, 1100),
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
    });
  };
  jeden();
  return scene.time.addEvent({ delay: 2400, loop: true, callback: jeden });
}

/** Co jakiś czas przez niebo przelatuje stadko — dwa albo trzy ptaki. */
function stadaPtakow(scene: Phaser.Scene) {
  const stado = () => {
    const wPrawo = Math.random() < 0.5;
    const y = Phaser.Math.Between(18, 64);
    const ile = Phaser.Math.Between(2, 3);
    for (let i = 0; i < ile; i++) {
      const x0 = wPrawo ? -30 - i * 26 : 990 + i * 26;
      const ptak = scene.add
        .image(x0, y + i * 9 * (i % 2 ? -1 : 1), TEX.ptak)
        .setScale(0.7 - i * 0.08)
        .setFlipX(!wPrawo)
        .setAlpha(0.85)
        .setDepth(ZM.czastki);
      scene.tweens.add({
        targets: ptak,
        x: wPrawo ? 1000 + i * 26 : -40 - i * 26,
        y: ptak.y + Phaser.Math.Between(-18, 10),
        duration: Phaser.Math.Between(11000, 14000),
        ease: 'Linear',
        onComplete: () => ptak.destroy(),
      });
      scene.tweens.add({
        targets: ptak,
        scaleY: { from: ptak.scaleY, to: -ptak.scaleY * 0.6 },
        duration: 180 + i * 20,
        yoyo: true,
        repeat: -1,
        ease: 'Sine.easeInOut',
      });
    }
  };
  scene.time.delayedCall(1800, stado);
  return scene.time.addEvent({ delay: 9000, loop: true, callback: stado });
}

/**
 * Stworek mieszkający w wiosce: oddycha, czasem podskakuje, a kliknięty
 * cieszy się podskokiem. Dziecko kliknie w każde żywe stworzenie na ekranie
 * — lepiej, żeby coś z tego wynikało.
 */
export function stworek(
  scene: Phaser.Scene,
  klucz: string,
  x: number,
  y: number,
  wys: number,
  o: { flip?: boolean; glos?: () => void; depth?: number } = {}
) {
  // Cień kontaktowy: miękka plama, ciemniejsza w środku — twarda elipsa
  // czytała się jak podstawka pod figurką.
  const cien = scene.add
    .image(x + wys * 0.08, y - 2, TEX.cien)
    .setDisplaySize(wys * 0.95, wys * 0.22)
    .setAlpha(0.75)
    .setDepth(o.depth ?? ZM.stworki);
  const s = scene.add
    .image(x, y, klucz)
    .setOrigin(0.5, 0.94)
    .setFlipX(!!o.flip)
    .setDepth((o.depth ?? ZM.stworki) + 0.1);
  s.setScale(wys / s.height);
  const baza = s.scaleY;
  scene.tweens.add({
    targets: s,
    scaleY: baza * 1.035,
    scaleX: s.scaleX * 0.985,
    duration: Phaser.Math.Between(1300, 1700),
    yoyo: true,
    repeat: -1,
    ease: 'Sine.easeInOut',
  });
  let skacze = false;
  const podskok = () => {
    if (skacze) return;
    skacze = true;
    scene.tweens.add({
      targets: s,
      y: y - wys * 0.22,
      duration: 170,
      yoyo: true,
      ease: 'Quad.easeOut',
      repeat: 1,
      onComplete: () => {
        skacze = false;
      },
    });
    scene.tweens.add({ targets: cien, scaleX: cien.scaleX * 0.7, alpha: 0.4, duration: 170, yoyo: true, repeat: 1 });
  };
  s.setInteractive({ useHandCursor: true, pixelPerfect: true, alphaTolerance: 40 });
  s.on('pointerdown', () => {
    o.glos?.();
    podskok();
  });
  scene.time.addEvent({ delay: Phaser.Math.Between(5000, 8000), loop: true, callback: podskok });
  return s;
}
