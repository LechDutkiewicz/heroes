/**
 * Ikony rysowane w kodzie, zamiast systemowych emoji.
 *
 * Emoji wyglądają inaczej na każdym systemie — ⚔️ na Windows jest inne niż na
 * Androidzie, a bez fontu emoji nie ma go wcale. W grze, która ma wyglądać na
 * dopracowaną, widać to od razu. Poza tym emoji przychodzą w swoich barwach
 * i gryzą się z paletą.
 *
 * Każda ikona to naklejka jak we wzorcu: gruby ciemny kontur, jasne
 * wypełnienie, błyk u góry dający kierunek światła. Kontur robimy rysując ten
 * sam kształt dwa razy — raz powiększony i wypełniony na ciemno, raz zwykle.
 * Obrys linią po tej samej ścieżce nie działa: wypełnienie zamalowuje jego
 * wewnętrzną połowę i grubość wychodzi losowa, zależnie od kształtu.
 *
 * Rysujemy raz do tekstury przy starcie sceny; potem to zwykły obrazek.
 */

import Phaser from 'phaser';
import { C } from './theme';

export const ICON = {
  sword: 'ic_miecz',
  bow: 'ic_luk',
  shield: 'ic_tarcza',
  heart: 'ic_serce',
  boot: 'ic_but',
  wing: 'ic_skrzydlo',
  retaliate: 'ic_odwet',
  hourglass: 'ic_klepsydra',
  skull: 'ic_czaszka',
  star: 'ic_gwiazda',
  flame: 'ic_ogien',
  drop: 'ic_woda',
  leaf: 'ic_trawa',
  banner: 'ic_poziom',
} as const;

export type IconKey = (typeof ICON)[keyof typeof ICON];

/** Ikony żywiołów — dobierane typem oddziału. */
export const TYPE_ICON = {
  fire: ICON.flame,
  water: ICON.drop,
  grass: ICON.leaf,
} as const;

/**
 * Rysujemy w kwadracie 64x64 i zmniejszamy dopiero przy użyciu. Rysowanie od
 * razu w docelowych kilkunastu pikselach dałoby poszarpane kształty.
 */
const S = 64;
/** O ile procent kształt konturu jest większy od właściwego. */
const OUTLINE = 1.16;

type Pen = Phaser.GameObjects.Graphics;
/** Kształt ikony: same wypełnienia, bez obrysów — te dokłada `sticker`. */
type Shape = (g: Pen) => void;

/** Wielokąt z płaskiej listy [x, y, x, y, ...] w skali 0-64. */
function poly(g: Pen, pts: number[]) {
  g.beginPath();
  g.moveTo(pts[0], pts[1]);
  for (let i = 2; i < pts.length; i += 2) g.lineTo(pts[i], pts[i + 1]);
  g.closePath();
  g.fillPath();
}

/**
 * Punkty na łuku. Kształty budujemy z punktów, a nie z `arc()` na ścieżce:
 * przy łączeniu łuku z odcinkami trzeba pilnować kierunku obiegu, a pomyłka
 * daje kształt wywrócony na drugą stronę — tak poległy pierwsze wersje
 * skrzydła i liścia.
 */
function arcPts(cx: number, cy: number, r: number, from: number, to: number, steps = 14) {
  const pts: number[] = [];
  for (let i = 0; i <= steps; i++) {
    const a = Phaser.Math.DegToRad(from + ((to - from) * i) / steps);
    pts.push(cx + r * Math.cos(a), cy + r * Math.sin(a));
  }
  return pts;
}

/** Wycinek pierścienia: łuk zewnętrzny plus wewnętrzny wracający z powrotem. */
function ring(
  cx: number,
  cy: number,
  rOut: number,
  rIn: number,
  from: number,
  to: number,
  steps = 14
) {
  const back = arcPts(cx, cy, rIn, to, from, steps);
  return [...arcPts(cx, cy, rOut, from, to, steps), ...back];
}

/** Gruba kreska jako wypełniony kształt — żeby kontur objął ją tak jak resztę. */
function bar(g: Pen, x1: number, y1: number, x2: number, y2: number, w: number) {
  const a = Math.atan2(y2 - y1, x2 - x1);
  const dx = (Math.sin(a) * w) / 2;
  const dy = (Math.cos(a) * w) / 2;
  poly(g, [x1 + dx, y1 - dy, x2 + dx, y2 - dy, x2 - dx, y2 + dy, x1 - dx, y1 + dy]);
}

/**
 * Rysuje kształt dwa razy: powiększony na ciemno (kontur) i normalnie
 * w barwie właściwej. Skalujemy względem środka kafla, więc kontur wychodzi
 * równomiernie ze wszystkich stron.
 */
function sticker(g: Pen, fill: number, shape: Shape) {
  g.save();
  g.translateCanvas(S / 2, S / 2);
  g.scaleCanvas(OUTLINE, OUTLINE);
  g.translateCanvas(-S / 2, -S / 2);
  g.fillStyle(C.shadow, 1);
  shape(g);
  g.restore();

  g.fillStyle(fill, 1);
  shape(g);
}

/** Błyk u góry — ten sam kierunek światła na każdej ikonie. */
function gloss(g: Pen, x: number, y: number, rx: number, ry: number, a = 0.42) {
  g.fillStyle(C.white, a);
  g.fillEllipse(x, y, rx, ry);
}

const DRAW: Record<string, (g: Pen) => void> = {
  // Miecz celowo krępy: smukła klinga znikała przy 14 pikselach.
  [ICON.sword]: (g) => {
    sticker(g, 0xe3edf5, (p) => poly(p, [32, 3, 43, 17, 43, 38, 32, 47, 21, 38, 21, 17]));
    sticker(g, C.goldDeep, (p) => poly(p, [13, 40, 51, 40, 51, 49, 13, 49]));
    sticker(g, C.gold, (p) => poly(p, [27, 49, 37, 49, 37, 61, 27, 61]));
    gloss(g, 27, 20, 3.5, 11);
  },

  // Łuk: łęczysko jako wycinek pierścienia otwarty w lewo, cięciwa i strzała.
  [ICON.bow]: (g) => {
    sticker(g, 0xc98a3c, (p) => poly(p, ring(44, 32, 28, 22, 122, 238)));
    sticker(g, 0xb9c9d6, (p) => bar(p, 30, 10, 30, 54, 3.5));
    sticker(g, 0xe3edf5, (p) => {
      bar(p, 9, 32, 46, 32, 6.5);
      poly(p, [42, 22, 60, 32, 42, 42]);
    });
  },

  [ICON.shield]: (g) => {
    sticker(g, C.ally, (p) => poly(p, [32, 4, 55, 14, 55, 33, 32, 59, 9, 33, 9, 14]));
    gloss(g, 22, 20, 6, 12);
  },

  [ICON.heart]: (g) => {
    sticker(g, 0xff5e7a, (p) => {
      p.beginPath();
      p.moveTo(32, 57);
      p.lineTo(10, 32);
      p.arc(21, 22, 13.5, Phaser.Math.DegToRad(135), Phaser.Math.DegToRad(325), false);
      p.arc(43, 22, 13.5, Phaser.Math.DegToRad(215), Phaser.Math.DegToRad(45), false);
      p.closePath();
      p.fillPath();
    });
    gloss(g, 22, 20, 5, 8);
  },

  [ICON.boot]: (g) => {
    sticker(g, 0xc97b4a, (p) => poly(p, [20, 6, 35, 6, 37, 33, 55, 42, 55, 55, 17, 55, 17, 29]));
    gloss(g, 26, 17, 4, 9);
  },

  // Latanie: sylwetka ptaka, nie pojedyncze skrzydło. Skrzydło z piórami jest
  // przy 14 pikselach nieczytelne — próbowaliśmy, wychodziła plama. Dwie
  // rozłożone kreski czyta się od razu i w każdym rozmiarze.
  [ICON.wing]: (g) => {
    sticker(g, 0xeaf4ff, (p) => {
      bar(p, 5, 44, 20, 22, 8);
      bar(p, 20, 22, 32, 38, 8);
      bar(p, 32, 38, 44, 22, 8);
      bar(p, 44, 22, 59, 44, 8);
    });
  },

  // Odwet: strzałka zawracająca — cios oddany z powrotem.
  [ICON.retaliate]: (g) => {
    sticker(g, C.gold, (p) => {
      poly(p, ring(30, 38, 22, 13, 175, 355));
      poly(p, [38, 6, 62, 20, 38, 30]);
    });
  },

  [ICON.hourglass]: (g) => {
    sticker(g, 0xe8f1f8, (p) => poly(p, [13, 6, 51, 6, 34, 32, 51, 58, 13, 58, 30, 32]));
    g.fillStyle(C.gold, 1);
    g.fillTriangle(21, 50, 43, 50, 32, 34);
    gloss(g, 23, 15, 5, 4);
  },

  [ICON.skull]: (g) => {
    sticker(g, 0xf0f4f7, (p) => {
      p.fillCircle(32, 26, 20);
      poly(p, [19, 39, 45, 39, 45, 55, 19, 55]);
    });
    g.fillStyle(C.shadow, 1);
    g.fillCircle(24, 25, 6.5);
    g.fillCircle(40, 25, 6.5);
    g.fillRect(28, 44, 3, 9);
    g.fillRect(34, 44, 3, 9);
  },

  [ICON.star]: (g) => {
    const pts: number[] = [];
    for (let i = 0; i < 10; i++) {
      const r = i % 2 === 0 ? 28 : 12.5;
      const a = Phaser.Math.DegToRad(i * 36 - 90);
      pts.push(32 + r * Math.cos(a), 32 + r * Math.sin(a));
    }
    sticker(g, C.gold, (p) => poly(p, pts));
    gloss(g, 26, 22, 4, 6);
  },

  [ICON.flame]: (g) => {
    sticker(g, 0xff8a3c, (p) => {
      p.beginPath();
      p.moveTo(32, 3);
      p.lineTo(47, 25);
      p.lineTo(43, 33);
      p.lineTo(51, 39);
      p.arc(32, 42, 20, Phaser.Math.DegToRad(-19), Phaser.Math.DegToRad(199), false);
      p.lineTo(21, 29);
      p.lineTo(19, 21);
      p.closePath();
      p.fillPath();
    });
    g.fillStyle(C.goldLight, 0.9);
    g.fillEllipse(32, 45, 13, 17);
  },

  [ICON.drop]: (g) => {
    sticker(g, 0x4aa8f0, (p) => {
      p.beginPath();
      p.moveTo(32, 3);
      p.lineTo(50, 31);
      p.arc(32, 38, 20, Phaser.Math.DegToRad(-21), Phaser.Math.DegToRad(201), false);
      p.closePath();
      p.fillPath();
    });
    gloss(g, 24, 37, 5, 9);
  },

  // Liść: migdał złożony z dwóch łuków wygiętych w przeciwne strony, z żyłką.
  // Równoległobok czytał się jak kartka papieru, a klin jak nic.
  [ICON.leaf]: (g) => {
    sticker(g, 0x5ec95e, (p) =>
      poly(p, [...arcPts(10, 10, 52, 78, 6), ...arcPts(54, 54, 52, 186, 258)])
    );
    g.fillStyle(0x2f7a3a, 0.75);
    bar(g, 14, 50, 47, 17, 3.4);
    bar(g, 24, 33, 33, 24, 2.2);
    bar(g, 31, 41, 41, 31, 2.2);
  },

  [ICON.banner]: (g) => {
    sticker(g, C.foe, (p) => poly(p, [12, 5, 52, 5, 52, 54, 32, 41, 12, 54]));
    gloss(g, 22, 17, 5, 9);
  },
};

// ---------- komplet „mini": znaki do tabeli w panelu ----------

/**
 * Drugi komplet, przeznaczony WYŁĄCZNIE do dolnego panelu.
 *
 * Dlaczego osobny: naklejki wyżej są pełnobarwne — czerwone serce, złota
 * gwiazda, pomarańczowy płomień. Na planszy, przy oddziale wielkości hexa, to
 * działa: znak ma się rzucać w oczy z odległości. W tabeli statystyk ten sam
 * zabieg daje rejestr wizualny emoji — dziewięć naklejek w dziewięciu barwach,
 * każda krzyczy własnym kolorem i tabela rozpada się na dziewięć obrazków.
 *
 * Mini są dokładnie odwrotne i trzymają się trzech reguł:
 *  1. JEDNA WAGA — sama sylwetka, bez konturu, bez błysku, bez drugiego
 *     wypełnienia. Wcześniej serce było pełną plamą, miecz miał trzy barwy,
 *     a ptak był cienkim zarysem, który na jasnym paśmie znikał.
 *  2. JEDEN MODUŁ — każdy kształt mieści się w tym samym kole o średnicy
 *     `MINI_D` w kaflu 64. Bez tego gwiazda wychodzi dwa razy większa od kropli.
 *  3. BRAK WŁASNEJ BARWY — rysujemy na biało i barwimy dopiero przy wstawianiu
 *     (`miniIcon`). Dzięki temu znak przyjmuje barwę swojego wiersza, zamiast
 *     wnosić do panelu kolejny kolor.
 */
export const MINI = {
  life: 'mi_zycie',
  attack: 'mi_atak',
  reach: 'mi_zasieg',
  move: 'mi_ruch',
  fly: 'mi_lot',
  fire: 'mi_ogien',
  water: 'mi_woda',
  grass: 'mi_trawa',
  strong: 'mi_mocny',
  weak: 'mi_slaby',
  retaliate: 'mi_odwet',
  ability: 'mi_umiejetnosc',
  forecast: 'mi_prognoza',
} as const;

export type MiniKey = (typeof MINI)[keyof typeof MINI];

export const MINI_TYPE = {
  fire: MINI.fire,
  water: MINI.water,
  grass: MINI.grass,
} as const;

/** Średnica modułu: każdy znak mieści się w tym kole, więc wszystkie ważą tyle samo. */
const MINI_D = 52;
const M0 = (S - MINI_D) / 2; // 6
const M1 = S - M0; // 58

/** Gwiazda o zadanej liczbie ramion — jeden przepis na iskrę i na rozbłysk. */
function starPts(arms: number, rOut: number, rIn: number, turn = -90) {
  const pts: number[] = [];
  for (let i = 0; i < arms * 2; i++) {
    const r = i % 2 === 0 ? rOut : rIn;
    const a = Phaser.Math.DegToRad((i * 180) / arms + turn);
    pts.push(32 + r * Math.cos(a), 32 + r * Math.sin(a));
  }
  return pts;
}

/** Strzałka blokowa w pionie: `dir` = -1 w górę, 1 w dół. */
function blockArrow(g: Pen, dir: number) {
  const t = (y: number) => 32 + dir * (y - 32);
  poly(g, [32, t(M0), 55, t(30), 42, t(30), 42, t(M1), 22, t(M1), 22, t(30), 9, t(30)]);
}

const MINI_DRAW: Record<string, (g: Pen) => void> = {
  [MINI.life]: (g) => {
    g.beginPath();
    g.moveTo(32, M1);
    g.lineTo(9, 32);
    g.arc(20.5, 21, 13.5, Phaser.Math.DegToRad(135), Phaser.Math.DegToRad(325), false);
    g.arc(43.5, 21, 13.5, Phaser.Math.DegToRad(215), Phaser.Math.DegToRad(45), false);
    g.closePath();
    g.fillPath();
  },

  // Atak: miecz. Krępy, bo w 16 pikselach smukła klinga to kreska.
  [MINI.attack]: (g) => {
    poly(g, [32, M0, 41, 19, 41, 38, 32, 46, 23, 38, 23, 19]);
    poly(g, [13, 38, 51, 38, 51, 45, 13, 45]);
    poly(g, [28, 45, 36, 45, 36, M1, 28, M1]);
  },

  // Zasięg: tarcza celownicza. Wcześniej „Zasięg" nosił ten sam miecz co
  // „Atak" — jeden znak na dwa różne pojęcia. Pierścienie mówią o dystansie,
  // nie o sile ciosu, i nie mylą się z niczym innym w panelu.
  [MINI.reach]: (g) => {
    poly(g, ring(32, 32, 26, 20, 0, 360, 40));
    poly(g, ring(32, 32, 14, 9, 0, 360, 32));
    g.fillCircle(32, 32, 4.5);
  },

  [MINI.move]: (g) => {
    poly(g, [19, M0, 34, M0, 36, 32, 55, 42, 55, M1, 16, M1, 16, 28]);
  },

  // Lot: podwójny daszek w górę. Poprzednia sylwetka ptaka w rozmiarze
  // panelowym czytała się jak zawijas — była projektowana na duży znak przy
  // oddziale. Daszki nie udają ptaka, ale w każdym rozmiarze mówią „w górze".
  [MINI.fly]: (g) => {
    bar(g, 9, 33, 32, 13, 9);
    bar(g, 32, 13, 55, 33, 9);
    bar(g, 9, M1, 32, 38, 9);
    bar(g, 32, 38, 55, M1, 9);
  },

  [MINI.fire]: (g) => {
    g.beginPath();
    g.moveTo(32, M0);
    g.lineTo(48, 26);
    g.lineTo(44, 33);
    g.lineTo(50, 38);
    g.arc(32, 40, 18, Phaser.Math.DegToRad(-19), Phaser.Math.DegToRad(199), false);
    g.lineTo(22, 29);
    g.lineTo(20, 22);
    g.closePath();
    g.fillPath();
  },

  [MINI.water]: (g) => {
    g.beginPath();
    g.moveTo(32, M0);
    g.lineTo(48, 30);
    g.arc(32, 37, 18, Phaser.Math.DegToRad(-21), Phaser.Math.DegToRad(201), false);
    g.closePath();
    g.fillPath();
  },

  [MINI.grass]: (g) => {
    poly(g, [...arcPts(11, 11, 47, 78, 6), ...arcPts(51, 51, 47, 186, 258)]);
  },

  // Przewaga i słabość: strzałki, nie ikony żywiołów. Który to żywioł, mówi
  // napis obok; znak ma mówić, w którą stronę działa mnożnik.
  [MINI.strong]: (g) => blockArrow(g, -1),
  [MINI.weak]: (g) => blockArrow(g, 1),

  [MINI.retaliate]: (g) => {
    poly(g, ring(29, 37, 21, 12, 175, 355));
    poly(g, [37, 8, 58, 21, 37, 32]);
  },

  // Umiejętność: iskra o czterech ramionach.
  [MINI.ability]: (g) => poly(g, starPts(4, 26, 7)),

  // Prognoza: rozbłysk uderzenia — dwanaście krótkich ramion. Celowo inny
  // rysunek niż iskra umiejętności i niż miecz ataku, bo to trzecia sprawa.
  [MINI.forecast]: (g) => poly(g, starPts(12, 26, 15)),
};

/**
 * Rysuje wszystkie ikony do tekstur. Woła się raz, na starcie sceny —
 * powtórne wywołanie nic nie psuje, bo gotowe tekstury pomijamy.
 */
export function buildIcons(scene: Phaser.Scene) {
  for (const [key, draw] of Object.entries(MINI_DRAW)) {
    if (scene.textures.exists(key)) continue;
    const g = scene.add.graphics();
    g.fillStyle(0xffffff, 1);
    draw(g);
    g.generateTexture(key, S, S);
    g.destroy();
  }
  for (const [key, draw] of Object.entries(DRAW)) {
    if (scene.textures.exists(key)) continue;
    const g = scene.add.graphics();
    draw(g);
    g.generateTexture(key, S, S);
    g.destroy();
  }
}

/** Ikona gotowa do wstawienia; `size` to docelowa wysokość w pikselach. */
export function icon(scene: Phaser.Scene, key: IconKey, x: number, y: number, size: number) {
  return scene.add.image(x, y, key).setDisplaySize(size, size);
}
