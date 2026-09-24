/**
 * Ikony artefaktów — rysowane, nie wczytywane.
 *
 * Ten sam powód, dla którego rysujemy ikony statystyk (`icons.ts`): ośmiu
 * plików graficznych nikt by nie utrzymał w jednym stylu z resztą, a systemowe
 * emoji wyglądają inaczej na każdym urządzeniu. Kształty idą przez `sticker`,
 * więc mają ten sam kontur i ten sam kierunek światła co ikony miecza i tarczy
 * — na ekranie bohatera leżą kilkanaście pikseli od siebie i każda różnica
 * w technice byłaby widoczna.
 *
 * Klucz tekstury to `art-<id>` z tablicy `ARTEFAKTY`. Brak ikony dla nowego
 * artefaktu nie wywraca ekranu: `kluczArtefaktu` oddaje wtedy pieczęć klasy,
 * czyli kształt, który i tak umie narysować różnicę między drobiazgiem
 * a reliktem.
 */

import Phaser from 'phaser';
import { C } from './theme';
import { S, arcPts, bar, gloss, poly, sticker, type Pen } from './icons';

/**
 * Barwa klasy — jedyna rzecz, która na ikonie artefaktu niesie informację
 * o jego sile. W Heroes 3 mówi to obwódka gniazda i tak samo jest tutaj:
 * kształt mówi CO to jest, barwa mówi ILE to warte.
 */
export const BARWA_KLASY = {
  drobny: 0x8fd48f,
  znaczny: 0x6fb7ff,
  relikt: 0xffb24a,
  // Cel misji: srebrzysty fiolet Groty. Ma się odróżniać od wszystkich trzech
  // klas naraz — to nie jest „lepszy relikt", tylko rzecz, po którą się przyszło.
  misja: 0xc9b6ff,
} as const;

export const OBRYS_KLASY = {
  drobny: 0x3f8a4a,
  znaczny: 0x2f6ea8,
  relikt: 0xc06a10,
  misja: 0x6a4fb8,
} as const;

/** Krążek pod kształtem — daje ikonie bryłę i odsuwa ją od tła gniazda. */
const krazek = (g: Pen, barwa: number) => {
  g.fillStyle(C.shadow, 1);
  g.fillCircle(S / 2, S / 2, 27);
  g.fillStyle(barwa, 1);
  g.fillCircle(S / 2, S / 2, 24);
  g.fillStyle(C.white, 0.18);
  g.fillCircle(S / 2, S / 2 - 6, 19);
};

const RYSUNKI: Record<string, (g: Pen) => void> = {
  // Opaska treningowa: wstęga z węzłem, czytelna jako „coś się nosi na głowie".
  opaska: (g) => {
    krazek(g, BARWA_KLASY.drobny);
    sticker(g, 0xf05a5a, (p) => poly(p, [12, 26, 52, 26, 52, 38, 12, 38]));
    sticker(g, 0xffd0d0, (p) => poly(p, [12, 28, 52, 28, 52, 31, 12, 31]));
    sticker(g, 0xf05a5a, (p) => poly(p, [46, 32, 60, 22, 60, 46]));
    gloss(g, 26, 29, 9, 2.5);
  },
  // Kamizelka: korpus z wycięciem pod szyję i dwiema klapami.
  kamizelka: (g) => {
    krazek(g, BARWA_KLASY.drobny);
    sticker(g, 0x6f8fb5, (p) =>
      poly(p, [20, 14, 28, 14, 32, 22, 36, 14, 44, 14, 50, 22, 50, 50, 14, 50, 14, 22])
    );
    sticker(g, C.shadow, (p) => poly(p, [31, 22, 33, 22, 33, 50, 31, 50]));
    gloss(g, 23, 26, 4, 9);
  },
  // Buty wędrowca: cholewka i podeszwa, sylwetka z profilu.
  buty: (g) => {
    krazek(g, BARWA_KLASY.drobny);
    sticker(g, 0xa97b4f, (p) => poly(p, [22, 12, 38, 12, 38, 36, 52, 40, 52, 48, 22, 48]));
    sticker(g, 0x4a3520, (p) => poly(p, [20, 46, 54, 46, 54, 53, 20, 53]));
    gloss(g, 29, 20, 4, 7);
  },
  // Pazur ostrza: trzy szpony na wspólnej nasadzie.
  pazur: (g) => {
    krazek(g, BARWA_KLASY.znaczny);
    [-13, 0, 13].forEach((dx, i) => {
      const dlugosc = i === 1 ? 34 : 27;
      sticker(g, 0xe9f2fa, (p) =>
        poly(p, [
          32 + dx, 52,
          32 + dx - 5, 52 - dlugosc * 0.55,
          32 + dx + dx * 0.35, 52 - dlugosc,
          32 + dx + 5, 52 - dlugosc * 0.5,
        ])
      );
    });
    sticker(g, C.goldDeep, (p) => poly(p, [16, 48, 48, 48, 48, 57, 16, 57]));
    gloss(g, 32, 30, 3, 8);
  },
  // Tarcza z łusek: obrys tarczy plus trzy rzędy łusek.
  tarcza: (g) => {
    krazek(g, BARWA_KLASY.znaczny);
    sticker(g, 0x4fa3d8, (p) => poly(p, [32, 8, 54, 18, 54, 38, 32, 58, 10, 38, 10, 18]));
    g.fillStyle(0x2a6d9a, 1);
    for (let r = 0; r < 3; r++)
      for (let k = 0; k < 3 - (r % 2 ? 1 : 0); k++)
        g.fillCircle(24 + k * 8 + (r % 2 ? 4 : 0), 22 + r * 9, 3.4);
    gloss(g, 24, 20, 5, 8, 0.3);
  },
  // Rower terenowy: dwa koła i rama — jedyny artefakt, który mówi „szybkość"
  // bez podpisu.
  rower: (g) => {
    krazek(g, BARWA_KLASY.znaczny);
    sticker(g, 0x2f3b46, (p) => poly(p, arcPts(20, 40, 13, 0, 359, 20)));
    sticker(g, 0x2f3b46, (p) => poly(p, arcPts(45, 40, 13, 0, 359, 20)));
    g.fillStyle(BARWA_KLASY.znaczny, 1);
    g.fillCircle(20, 40, 8);
    g.fillCircle(45, 40, 8);
    sticker(g, 0xff6b6b, (p) => bar(p, 20, 40, 33, 22, 4));
    sticker(g, 0xff6b6b, (p) => bar(p, 33, 22, 45, 40, 4));
    sticker(g, 0xff6b6b, (p) => bar(p, 20, 40, 45, 40, 4));
  },
  // Pas mistrza areny: klamra z gwiazdą — nagroda, a nie sprzęt.
  mistrz: (g) => {
    krazek(g, BARWA_KLASY.relikt);
    sticker(g, 0x6b4a2a, (p) => poly(p, [6, 26, 58, 26, 58, 38, 6, 38]));
    sticker(g, C.gold, (p) => poly(p, [20, 18, 44, 18, 44, 46, 20, 46]));
    g.fillStyle(C.goldDeep, 1);
    g.fillRect(25, 23, 14, 18);
    const gwiazda: number[] = [];
    for (let i = 0; i < 10; i++) {
      const a = Phaser.Math.DegToRad(-90 + i * 36);
      const r = i % 2 ? 4 : 9;
      gwiazda.push(32 + r * Math.cos(a), 32 + r * Math.sin(a));
    }
    sticker(g, C.goldLight, (p) => poly(p, gwiazda));
  },
  // Skrzydła latającego: para skrzydeł rozłożonych symetrycznie.
  skrzydla: (g) => {
    krazek(g, BARWA_KLASY.relikt);
    const skrzydlo = (kier: number) =>
      sticker(g, 0xf3f7fb, (p) =>
        poly(p, [
          32, 24,
          32 + kier * 26, 18,
          32 + kier * 22, 30,
          32 + kier * 26, 34,
          32 + kier * 14, 42,
          32, 40,
        ])
      );
    skrzydlo(1);
    skrzydlo(-1);
    sticker(g, C.goldDeep, (p) => poly(p, [30, 20, 34, 20, 34, 48, 30, 48]));
    gloss(g, 44, 24, 7, 3);
  },
  // Księżycowy Kamień: owalny kamień z sierpem księżyca w środku — to, po co
  // gracz jechał przez bagna, ma być rozpoznawalne bez podpisu.
  'ksiezycowy-kamien': (g) => {
    krazek(g, BARWA_KLASY.misja);
    const owal: number[] = [];
    for (let i = 0; i < 20; i++) {
      const a = Phaser.Math.DegToRad(i * 18);
      owal.push(32 + 17 * Math.cos(a), 33 + 21 * Math.sin(a));
    }
    sticker(g, 0x5a4a9a, (p) => poly(p, owal));
    const sierp = [
      ...arcPts(33, 33, 12, 110, 330, 12),
      ...arcPts(38, 30, 9, 330, 110, 10),
    ];
    sticker(g, 0xf4f0ff, (p) => poly(p, sierp));
    gloss(g, 26, 22, 6, 3.5);
  },
};

/**
 * Pieczęć klasy — zapasowy kształt dla artefaktu bez własnej ikony. Trzy
 * warianty (koło, sześciokąt, gwiazda) różnią się na tyle, że nawet bez
 * podpisu widać, czy to drobiazg, czy relikt.
 */
function pieczec(g: Pen, klasa: keyof typeof BARWA_KLASY) {
  krazek(g, BARWA_KLASY[klasa]);
  const boki = klasa === 'drobny' ? 3 : klasa === 'znaczny' ? 6 : klasa === 'misja' ? 4 : 5;
  const pts: number[] = [];
  for (let i = 0; i < boki * 2; i++) {
    const a = Phaser.Math.DegToRad(-90 + (i * 360) / (boki * 2));
    const r = klasa === 'relikt' && i % 2 ? 8 : 17;
    pts.push(32 + r * Math.cos(a), 32 + r * Math.sin(a));
  }
  sticker(g, C.goldLight, (p) => poly(p, pts));
}

/** Buduje wszystkie tekstury artefaktów. Wołać raz na scenę, w `create`. */
export function buildArtefakty(scene: Phaser.Scene) {
  for (const [id, draw] of Object.entries(RYSUNKI)) {
    const klucz = `art-${id}`;
    if (scene.textures.exists(klucz)) continue;
    const g = scene.add.graphics();
    draw(g);
    g.generateTexture(klucz, S, S);
    g.destroy();
  }
  for (const klasa of ['drobny', 'znaczny', 'relikt', 'misja'] as const) {
    const klucz = `art-klasa-${klasa}`;
    if (scene.textures.exists(klucz)) continue;
    const g = scene.add.graphics();
    pieczec(g, klasa);
    g.generateTexture(klucz, S, S);
    g.destroy();
  }
}

/** Klucz tekstury dla artefaktu; nieznany dostaje pieczęć swojej klasy. */
export const kluczArtefaktu = (id: string, klasa: keyof typeof BARWA_KLASY) =>
  id in RYSUNKI ? `art-${id}` : `art-klasa-${klasa}`;
