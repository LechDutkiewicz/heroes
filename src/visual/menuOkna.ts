/**
 * Okna menu głównego: zwój z rekordami i zwój z autorami.
 *
 * Zwój, a nie panel z ramką, bo menu jest ulicą wioski — okno w stylu
 * interfejsu bitwy (mleczna karta z kapsułkami) wyskoczyłoby tu jak
 * reklama z innej gry. Zwój się ROZWIJA (skala Y od środka), więc widać,
 * skąd się wziął; wyskakujący prostokąt nie ma skąd przyjść.
 *
 * Moduł nie wie nic o scenie menu poza tym, że dostaje `Phaser.Scene`
 * i krój — dzięki temu te same okna można otworzyć z innego ekranu
 * (np. rekordy z ekranu wyniku) bez przenoszenia kodu.
 */

import Phaser from 'phaser';
import { KAMPANIA, wczytajPostep } from '../data/kampania';
import { ILE_REKORDOW, wczytajRekordy, type Rekord } from '../data/rekordy';

/** Kroje menu — rejestruje je MenuScene (`wczytajKroje`). */
export const KROJ = {
  szyld: 'MenuCinzel, Georgia, serif',
  tekst: 'MenuFredoka, Trebuchet MS, Verdana, sans-serif',
} as const;

/** Atrament na pergaminie: brąz, nie czerń — czerń na beżu wygląda jak wydruk. */
export const ATRAMENT = {
  tytul: '#5e1d0c',
  naglowek: '#7b3b12',
  tekst: '#3b2310',
  blady: '#8a6a48',
} as const;

const SRODEK = { x: 480, y: 336 };
/** Pole do pisania na pergaminie (bez wałków i przybrudzonego brzegu). */
const POLE = { w: 590, h: 420 };

export interface Zwoj {
  zamknij(): void;
  readonly otwarty: boolean;
}

/**
 * Wspólny szkielet obu okien: przyciemnienie, pergamin, tytuł z ozdobnikiem,
 * deseczka „Zamknij". `tresc` dostaje kontener z początkiem układu w lewym
 * górnym rogu pola do pisania (pod tytułem).
 */
function zwoj(
  scene: Phaser.Scene,
  tytul: string,
  tresc: (k: Phaser.GameObjects.Container, szer: number) => void,
  o: { depth: number; poZamknieciu: () => void; dzwiek: () => void }
): Zwoj {
  let otwarty = true;
  const cien = scene.add
    .rectangle(480, 347, 960, 694, 0x120a04, 0)
    .setDepth(o.depth)
    .setInteractive();
  scene.tweens.add({ targets: cien, fillAlpha: 0.55, duration: 220 });

  const kont = scene.add.container(SRODEK.x, SRODEK.y).setDepth(o.depth + 1);
  const papier = scene.add.image(0, 0, 'menu-pergamin');
  // Pergamin przechwytuje kliknięcia — inaczej klik w tekst zamykałby okno
  // przez warstwę przyciemnienia pod spodem.
  papier.setInteractive();
  kont.add(papier);

  const lewa = -POLE.w / 2;
  const gora = -POLE.h / 2;
  const t = scene.add
    .text(0, gora + 4, tytul, {
      fontFamily: KROJ.szyld,
      fontSize: '38px',
      fontStyle: '900',
      color: ATRAMENT.tytul,
    })
    .setOrigin(0.5, 0)
    .setShadow(0, 1, 'rgba(255,240,200,0.8)', 0, false, true);
  kont.add(t);
  kont.add(ozdobnik(scene, 0, gora + 56, 300));

  const wnetrze = scene.add.container(lewa, gora + 72);
  kont.add(wnetrze);
  tresc(wnetrze, POLE.w);

  const zamknij = deseczka(scene, 0, 292, 'Zamknij', () => zamknijOkno());
  kont.add(zamknij);

  // Rozwinięcie: z paska w pełny zwój. Treść wchodzi chwilę później, żeby
  // nie była ściśnięta razem z papierem.
  kont.setScale(1, 0.06);
  wnetrze.setAlpha(0);
  t.setAlpha(0);
  scene.tweens.add({ targets: kont, scaleY: 1, duration: 360, ease: 'Back.easeOut' });
  scene.tweens.add({ targets: [wnetrze, t], alpha: 1, delay: 180, duration: 220 });
  o.dzwiek();

  const naKlawisz = (e: KeyboardEvent) => {
    if (e.key === 'Escape' || e.key === 'Enter' || e.key === ' ') zamknijOkno();
  };
  scene.input.keyboard?.on('keydown', naKlawisz);
  cien.on('pointerdown', () => zamknijOkno());

  function zamknijOkno() {
    if (!otwarty) return;
    otwarty = false;
    scene.input.keyboard?.off('keydown', naKlawisz);
    o.dzwiek();
    scene.tweens.add({ targets: cien, fillAlpha: 0, duration: 200, onComplete: () => cien.destroy() });
    scene.tweens.add({
      targets: kont,
      scaleY: 0.04,
      alpha: 0.4,
      duration: 200,
      ease: 'Quad.easeIn',
      onComplete: () => {
        kont.destroy();
        o.poZamknieciu();
      },
    });
  }

  return {
    zamknij: zamknijOkno,
    get otwarty() {
      return otwarty;
    },
  };
}

/** Ozdobnik pod tytułem: dwie kreski rozchodzące się od rombu. */
function ozdobnik(scene: Phaser.Scene, x: number, y: number, szer: number) {
  const g = scene.add.graphics();
  const kol = 0x8a4a1c;
  for (const s of [-1, 1]) {
    g.lineStyle(2, kol, 0.9);
    g.beginPath();
    g.moveTo(x + s * 12, y);
    g.lineTo(x + (s * szer) / 2, y);
    g.strokePath();
    g.fillStyle(kol, 0.9);
    g.fillCircle(x + (s * szer) / 2, y, 2.5);
    g.lineStyle(1, kol, 0.5);
    g.beginPath();
    g.moveTo(x + s * 24, y + 5);
    g.lineTo(x + (s * szer) / 2 - s * 30, y + 5);
    g.strokePath();
  }
  g.fillStyle(kol, 1);
  g.fillPoints(
    [
      new Phaser.Math.Vector2(x, y - 6),
      new Phaser.Math.Vector2(x + 7, y),
      new Phaser.Math.Vector2(x, y + 6),
      new Phaser.Math.Vector2(x - 7, y),
    ],
    true
  );
  return g;
}

/**
 * Mała deseczka z napisem — przycisk „Zamknij" w oknie i podpis przełącznika
 * dźwięku. Ten sam materiał co drogowskaz, żeby okno i ulica były z jednej
 * wioski.
 */
export function deseczka(
  scene: Phaser.Scene,
  x: number,
  y: number,
  napis: string,
  naKlik?: () => void
): Phaser.GameObjects.Container & { ustawNapis(n: string): void } {
  const zwykla = scene.add.image(0, 0, 'menu-deseczka');
  const jasna = scene.add.image(0, 0, 'menu-deseczka-jasna').setVisible(false);
  const t = scene.add
    .text(0, 1, napis, {
      fontFamily: KROJ.szyld,
      fontSize: '16px',
      fontStyle: '900',
      color: '#3a1c0a',
    })
    .setOrigin(0.5)
    .setShadow(0, 1, 'rgba(255,226,170,0.7)', 0, false, true);
  const k = scene.add.container(x, y, [zwykla, jasna, t]) as Phaser.GameObjects.Container & {
    ustawNapis(n: string): void;
  };
  k.ustawNapis = (n: string) => t.setText(n);
  if (naKlik) {
    k.setSize(zwykla.width, zwykla.height).setInteractive({ useHandCursor: true });
    k.on('pointerover', () => {
      jasna.setVisible(true);
      zwykla.setVisible(false);
      t.setColor('#fff2c4').setStroke('#3a1c0a', 4);
    });
    k.on('pointerout', () => {
      jasna.setVisible(false);
      zwykla.setVisible(true);
      t.setColor('#3a1c0a').setStroke('#3a1c0a', 0);
    });
    k.on('pointerdown', () => {
      scene.tweens.add({ targets: k, scaleX: 0.95, scaleY: 0.9, duration: 60, yoyo: true });
      naKlik();
    });
  }
  return k;
}

// ————————————————————————————————————————————————————————— rekordy

/**
 * Legendy wioski — wpisy „do pobicia", jak domyślna tabela w Heroes 2
 * (tam „Lord Kilburn" i spółka). Pokazywane WYŁĄCZNIE w oknie i wyraźnie
 * podpisane jako legendy; do localStorage nie trafiają nigdy, żeby
 * `wczytajRekordy()` zawsze zwracało tylko prawdziwe wyniki.
 *
 * Punkty zgadzają się z liczbą dni według `punkty()` z kampania.ts
 * (4 misje, 4000 − 15 × (dni − 4)) — dziecko, które to sprawdzi,
 * nie znajdzie oszustwa.
 */
const LEGENDY: Omit<Rekord, 'data'>[] = [
  { imie: 'Stary Strażnik', punkty: 3100, dni: 64 },
  { imie: 'Leśna Ola', punkty: 2590, dni: 98 },
  { imie: 'Kapitan Tomek', punkty: 2200, dni: 124 },
  { imie: 'Zosia z Polany', punkty: 1750, dni: 154 },
  { imie: 'Wędrowny Bartek', punkty: 1300, dni: 184 },
  { imie: 'Babcia Hela', punkty: 850, dni: 214 },
  { imie: 'Mały Kuba', punkty: 520, dni: 236 },
  { imie: 'Kowal Zbyszek', punkty: 280, dni: 252 },
];

export function pokazRekordy(
  scene: Phaser.Scene,
  o: { depth: number; poZamknieciu: () => void; dzwiek: () => void }
): Zwoj {
  return zwoj(
    scene,
    'Rekordy',
    (k, szer) => {
      const prawdziwe = wczytajRekordy();
      const wiersze: (Rekord & { legenda?: boolean })[] = [
        ...prawdziwe,
        ...LEGENDY.map((l) => ({ ...l, data: '', legenda: true })),
      ]
        .sort((a, b) => b.punkty - a.punkty || a.dni - b.dni)
        .slice(0, ILE_REKORDOW);

      const podtytul = prawdziwe.length
        ? `Najlepsi trenerzy kampanii „${KAMPANIA.tytul}"`
        : `Ukończ kampanię „${KAMPANIA.tytul}" i pobij legendy wioski!`;
      k.add(
        scene.add
          .text(szer / 2, 0, podtytul, { fontFamily: KROJ.tekst, fontSize: '16px', color: ATRAMENT.blady })
          .setOrigin(0.5, 0)
      );

      const kol = { miejsce: 44, imie: 80, dni: 400, punkty: 530 };
      const y0 = 30;
      const naglowek = (x: number, t: string, origin = 0) =>
        k.add(
          scene.add
            .text(x, y0, t, { fontFamily: KROJ.szyld, fontSize: '14px', fontStyle: '900', color: ATRAMENT.naglowek })
            .setOrigin(origin, 0)
        );
      naglowek(kol.imie, 'Trener');
      naglowek(kol.dni, 'Dni', 1);
      naglowek(kol.punkty, 'Punkty', 1);

      const g = scene.add.graphics();
      k.add(g);
      const krok = 28;
      wiersze.forEach((r, i) => {
        const y = y0 + 24 + i * krok;
        if (i % 2 === 0) {
          g.fillStyle(0x8a5a2a, 0.09);
          g.fillRoundedRect(14, y - 2, szer - 28, krok - 2, 6);
        }
        medal(g, kol.miejsce, y + krok / 2 - 2, i);
        k.add(
          scene.add
            .text(kol.miejsce, y + krok / 2 - 2, String(i + 1), {
              fontFamily: KROJ.szyld,
              fontSize: '14px',
              fontStyle: '900',
              color: i < 3 ? '#3a1c0a' : ATRAMENT.naglowek,
            })
            .setOrigin(0.5)
        );
        const barwa = r.legenda ? ATRAMENT.blady : ATRAMENT.tekst;
        const imie = scene.add
          .text(kol.imie, y + 1, r.imie, { fontFamily: KROJ.tekst, fontSize: '18px', color: barwa })
          .setOrigin(0, 0);
        k.add(imie);
        if (r.legenda) {
          k.add(
            scene.add
              .text(kol.imie + imie.width + 8, y + 5, 'legenda', {
                fontFamily: KROJ.tekst,
                fontSize: '12px',
                color: '#a0845f',
              })
              .setOrigin(0, 0)
          );
        }
        k.add(
          scene.add
            .text(kol.dni, y + 1, String(r.dni), { fontFamily: KROJ.tekst, fontSize: '18px', color: barwa })
            .setOrigin(1, 0)
        );
        k.add(
          scene.add
            .text(kol.punkty, y + 1, r.punkty.toLocaleString('pl-PL'), {
              fontFamily: KROJ.tekst,
              fontSize: '18px',
              color: r.legenda ? ATRAMENT.blady : '#6a1a08',
            })
            .setOrigin(1, 0)
        );
      });

      // Pasek postępu bieżącej kampanii — cztery misje jak cztery pieczęcie.
      const yK = y0 + 24 + ILE_REKORDOW * krok + 10;
      const p = wczytajPostep();
      k.add(
        scene.add
          .text(szer / 2, yK, 'Twoja kampania', {
            fontFamily: KROJ.szyld,
            fontSize: '14px',
            fontStyle: '900',
            color: ATRAMENT.naglowek,
          })
          .setOrigin(0.5, 0)
      );
      const n = KAMPANIA.misje.length;
      const szerM = (szer - 40) / n;
      KAMPANIA.misje.forEach((m, i) => {
        const x = 20 + szerM * i + szerM / 2;
        const w = p?.wyniki[m.id];
        pieczec(g, x, yK + 42, !!w);
        k.add(
          scene.add
            .text(x, yK + 42, String(m.nr), {
              fontFamily: KROJ.szyld,
              fontSize: '15px',
              fontStyle: '900',
              color: w ? '#fff1c8' : '#9a7a58',
            })
            .setOrigin(0.5)
        );
        k.add(
          scene.add
            .text(x, yK + 60, w ? `${w.punkty} pkt · ${w.dni} dni` : m.tytul, {
              fontFamily: KROJ.tekst,
              fontSize: '13px',
              color: w ? ATRAMENT.tekst : ATRAMENT.blady,
              align: 'center',
            })
            .setOrigin(0.5, 0)
        );
      });
    },
    o
  );
}

/** Krążek miejsca: złoto, srebro, brąz dla podium, reszta bez krążka. */
function medal(g: Phaser.GameObjects.Graphics, x: number, y: number, i: number) {
  const barwy = [
    [0xffd257, 0xb57a12],
    [0xe6e6ea, 0x8a8a96],
    [0xe0a066, 0x8a4f22],
  ];
  const b = barwy[i];
  if (!b) return;
  g.fillStyle(0x3a1c0a, 0.35);
  g.fillCircle(x, y + 1.5, 11);
  g.fillStyle(b[1], 1);
  g.fillCircle(x, y, 11);
  g.fillStyle(b[0], 1);
  g.fillCircle(x, y, 9);
  g.fillStyle(0xffffff, 0.45);
  g.fillEllipse(x - 2, y - 4, 10, 5);
}

/** Pieczęć misji: czerwony lak, gdy ukończona — pusty odcisk, gdy nie. */
function pieczec(g: Phaser.GameObjects.Graphics, x: number, y: number, jest: boolean) {
  if (jest) {
    g.fillStyle(0x3a0a06, 0.35);
    g.fillCircle(x, y + 2, 15);
    g.fillStyle(0x8e1c14, 1);
    g.fillCircle(x, y, 15);
    g.fillStyle(0xb8321f, 1);
    g.fillCircle(x, y - 1, 12);
    g.fillStyle(0xffffff, 0.25);
    g.fillEllipse(x - 4, y - 6, 12, 6);
  } else {
    g.lineStyle(2, 0x8a6a48, 0.6);
    g.strokeCircle(x, y, 14);
    g.lineStyle(1, 0x8a6a48, 0.35);
    g.strokeCircle(x, y, 10);
  }
}

// ————————————————————————————————————————————————————————— autorzy

/**
 * Autorzy — tylko to, co da się sprawdzić w repozytorium: licencje dźwięków
 * są w `public/audio/LICENCJA.md`, stworków w `assets/pokemon/README.md`,
 * teł bitwy w `assets/kit/CREDITS.md`, krojów w `public/menu/OFL.txt`.
 *
 * Układ jak w napisach końcowych gier: rola małymi kapitalikami, pod nią
 * kto. Dziecko czyta to jak listę „kto co zrobił", a nie jak tabelę licencji.
 */
const AUTORZY: [string, string][][] = [
  [
    ['Pomysł i prowadzenie', 'Lech Dutkiewicz'],
    ['Kod i zasady gry', 'Claude Code (Anthropic)'],
    ['Wioska, mapa i budynki', 'obrazy z modeli AI'],
    ['Stworki', 'Pixmon Index (domena publiczna)'],
    ['Tła bitew', 'Ismael García „scarloxy"'],
  ],
  [
    ['Odgłosy walki', 'Kenney.nl (CC0)'],
    ['Muzyka bitwy', '„Cynic Battle Loop" (CC0)'],
    ['Muzyka wioski i mapy', 'napisana w kodzie'],
    ['Logo, drogowskaz i zwój', 'rysowane w kodzie'],
    ['Silnik i kroje', 'Phaser · Cinzel · Fredoka'],
  ],
];

export function pokazAutorow(
  scene: Phaser.Scene,
  o: { depth: number; poZamknieciu: () => void; dzwiek: () => void }
): Zwoj {
  return zwoj(
    scene,
    'Autorzy',
    (k, szer) => {
      const kolW = szer / 2;
      AUTORZY.forEach((kolumna, ki) => {
        const x = kolW * ki + kolW / 2;
        kolumna.forEach(([rola, kto], i) => {
          const y = 4 + i * 58;
          k.add(
            scene.add
              .text(x, y, rola, {
                fontFamily: KROJ.szyld,
                fontSize: '15px',
                fontStyle: '900',
                color: ATRAMENT.naglowek,
              })
              .setOrigin(0.5, 0)
          );
          k.add(
            scene.add
              .text(x, y + 21, kto, { fontFamily: KROJ.tekst, fontSize: '18px', color: ATRAMENT.tekst })
              .setOrigin(0.5, 0)
          );
        });
      });
      const g = scene.add.graphics();
      g.lineStyle(1, 0x8a5a2a, 0.35);
      g.beginPath();
      g.moveTo(kolW, 8);
      g.lineTo(kolW, 270);
      g.strokePath();
      k.add(g);
      k.add(
        scene.add
          .text(
            szer / 2,
            300,
            'Zainspirowane grami Heroes of Might and Magic II i III oraz światem Pokémon.\nTo nie jest oficjalna gra żadnej z tych serii.',
            { fontFamily: KROJ.tekst, fontSize: '14px', color: ATRAMENT.blady, align: 'center', lineSpacing: 3 }
          )
          .setOrigin(0.5, 0)
      );
    },
    o
  );
}
