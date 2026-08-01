import Phaser from 'phaser';

/**
 * Każdy pokemon jest rysowany w kodzie na kwadracie 64x64 i zapamiętywany
 * jako tekstura. Dzięki temu gra nie potrzebuje żadnych plików graficznych.
 * Układ odniesienia: postać stoi na środku, ziemia mniej więcej na y=56.
 */

type G = Phaser.GameObjects.Graphics;

const OUTLINE = 0x2b2440;

function oval(g: G, x: number, y: number, w: number, h: number, color: number, stroke = 2) {
  g.fillStyle(color, 1);
  g.fillEllipse(x, y, w, h);
  if (stroke > 0) {
    g.lineStyle(stroke, OUTLINE, 1);
    g.strokeEllipse(x, y, w, h);
  }
}

function tri(g: G, pts: number[], color: number, stroke = 2) {
  g.fillStyle(color, 1);
  g.fillTriangle(pts[0], pts[1], pts[2], pts[3], pts[4], pts[5]);
  if (stroke > 0) {
    g.lineStyle(stroke, OUTLINE, 1);
    g.strokeTriangle(pts[0], pts[1], pts[2], pts[3], pts[4], pts[5]);
  }
}

/** Wypustka (liść, ucho, płetwa) zakotwiczona w punkcie i wychylona pod kątem. */
function limb(g: G, x: number, y: number, len: number, thick: number, angleDeg: number, color: number) {
  g.save();
  g.translateCanvas(x, y);
  g.rotateCanvas(Phaser.Math.DegToRad(angleDeg));
  g.fillStyle(color, 1);
  g.fillEllipse(len / 2, 0, len, thick);
  g.lineStyle(1.5, OUTLINE, 1);
  g.strokeEllipse(len / 2, 0, len, thick);
  g.restore();
}

/** Spiczasta wypustka — kolec, ogon lisa, płetwa. */
function spike(g: G, x: number, y: number, len: number, thick: number, angleDeg: number, color: number) {
  g.save();
  g.translateCanvas(x, y);
  g.rotateCanvas(Phaser.Math.DegToRad(angleDeg));
  tri(g, [0, -thick / 2, 0, thick / 2, len, 0], color, 1.5);
  g.restore();
}

function curve(g: G, pts: number[][], width: number, color: number) {
  g.lineStyle(width, color, 1);
  g.beginPath();
  g.moveTo(pts[0][0], pts[0][1]);
  for (let i = 1; i < pts.length; i++) g.lineTo(pts[i][0], pts[i][1]);
  g.strokePath();
}

function eyes(g: G, x: number, y: number, spread = 7, size = 3.6) {
  for (const dx of [-spread, spread]) {
    g.fillStyle(0xffffff, 1);
    g.fillEllipse(x + dx, y, size * 2, size * 2.2);
    g.lineStyle(1, OUTLINE, 0.8);
    g.strokeEllipse(x + dx, y, size * 2, size * 2.2);
    g.fillStyle(0x1a1a2e, 1);
    g.fillCircle(x + dx, y + 0.6, size * 0.8);
    g.fillStyle(0xffffff, 1);
    g.fillCircle(x + dx + 1, y - 1.2, size * 0.28);
  }
}

function smile(g: G, x: number, y: number, w: number) {
  g.lineStyle(1.6, OUTLINE, 1);
  g.beginPath();
  g.arc(x, y - w * 0.5, w, Phaser.Math.DegToRad(35), Phaser.Math.DegToRad(145), false);
  g.strokePath();
}

function flame(g: G, x: number, y: number, s: number) {
  g.fillStyle(0xff7a2f, 1);
  g.fillTriangle(x, y - 14 * s, x - 6.5 * s, y + 3 * s, x + 6.5 * s, y + 3 * s);
  g.fillStyle(0xffd166, 1);
  g.fillTriangle(x, y - 8 * s, x - 3 * s, y + 3 * s, x + 3 * s, y + 3 * s);
}

const PAINTERS: Record<string, (g: G) => void> = {
  charmander(g) {
    // ogon wyrasta z boku ciała i kończy się płomieniem
    curve(g, [[38, 44], [46, 42], [52, 36], [54, 30]], 6, 0xe07f34);
    flame(g, 54, 24, 1);

    oval(g, 30, 42, 30, 28, 0xf2913d); // tułów
    oval(g, 30, 46, 18, 16, 0xffe0b2, 0); // brzuch
    oval(g, 21, 55, 12, 9, 0xf2913d); // stopy
    oval(g, 38, 55, 12, 9, 0xf2913d);
    oval(g, 15, 40, 10, 13, 0xf2913d); // rączki
    oval(g, 45, 40, 10, 13, 0xf2913d);

    oval(g, 30, 22, 27, 24, 0xf2913d); // głowa
    eyes(g, 30, 19, 7, 3.6);
    smile(g, 30, 30, 5);
  },

  charmeleon(g) {
    curve(g, [[40, 42], [49, 40], [55, 33], [56, 26]], 6, 0xc4402f);
    flame(g, 56, 20, 1.05);

    oval(g, 29, 42, 30, 30, 0xd94f3d);
    oval(g, 29, 47, 17, 16, 0xffd9b3, 0);
    oval(g, 20, 56, 12, 9, 0xd94f3d);
    oval(g, 38, 56, 12, 9, 0xd94f3d);
    oval(g, 14, 40, 10, 13, 0xd94f3d);
    oval(g, 44, 40, 10, 13, 0xd94f3d);

    oval(g, 29, 21, 27, 24, 0xd94f3d);
    spike(g, 29, 12, 12, 12, -90, 0xd94f3d); // róg
    eyes(g, 29, 19, 7, 3.6);
    smile(g, 29, 29, 5);
  },

  vulpix(g) {
    // wachlarz spiczastych ogonów z tyłu
    spike(g, 42, 44, 20, 12, -35, 0xe8b04b);
    spike(g, 43, 45, 21, 12, -10, 0xd9a441);
    spike(g, 42, 47, 19, 11, 15, 0xe8b04b);

    oval(g, 27, 44, 28, 24, 0xd9a441); // tułów
    oval(g, 19, 55, 11, 8, 0xd9a441);
    oval(g, 34, 55, 11, 8, 0xd9a441);

    oval(g, 25, 25, 25, 22, 0xe8b04b); // głowa
    spike(g, 15, 16, 14, 12, -110, 0xd9a441); // uszy
    spike(g, 35, 16, 14, 12, -70, 0xd9a441);
    // charakterystyczna grzywka
    oval(g, 25, 14, 20, 11, 0xc98f35, 1.5);
    eyes(g, 25, 25, 6.5, 3.4);
    g.fillStyle(OUTLINE, 1);
    g.fillEllipse(25, 32, 4, 3);
  },

  magmar(g) {
    curve(g, [[42, 46], [50, 46], [55, 42]], 5, 0xc4402f);
    flame(g, 57, 37, 0.85);

    oval(g, 28, 42, 30, 28, 0xd94f3d);
    g.fillStyle(0xffd166, 1); // ogniste łaty
    g.fillEllipse(21, 44, 12, 15);
    g.fillEllipse(34, 47, 10, 11);
    oval(g, 19, 55, 11, 9, 0xd94f3d);
    oval(g, 36, 55, 11, 9, 0xd94f3d);

    oval(g, 28, 22, 26, 22, 0xd94f3d); // głowa
    tri(g, [28, 26, 17, 31, 39, 31], 0xffd166); // dziób
    flame(g, 28, 7, 0.75); // płomień na czubku
    eyes(g, 28, 19, 7, 3.4);
  },

  squirtle(g) {
    limb(g, 42, 46, 16, 11, -15, 0xf2c17a); // ogon

    oval(g, 30, 41, 34, 30, 0xb5651d); // skorupa
    g.fillStyle(0xf2c17a, 1);
    g.fillCircle(30, 41, 11);
    g.lineStyle(1.5, 0x8a4f16, 1);
    g.strokeCircle(30, 41, 11);
    g.lineBetween(19, 41, 41, 41);
    g.lineBetween(30, 30, 30, 52);

    oval(g, 17, 51, 11, 9, 0x6fc3e8); // łapki
    oval(g, 43, 51, 11, 9, 0x6fc3e8);
    oval(g, 13, 38, 10, 12, 0x6fc3e8);
    oval(g, 47, 38, 10, 12, 0x6fc3e8);

    oval(g, 29, 20, 27, 24, 0x6fc3e8); // głowa
    eyes(g, 29, 18, 7, 3.8);
    smile(g, 29, 28, 5);
  },

  wartortle(g) {
    limb(g, 44, 44, 18, 13, -25, 0xf5f5f5); // puszysty ogon

    oval(g, 30, 42, 34, 30, 0x8a5a2b);
    g.fillStyle(0xe8c07a, 1);
    g.fillCircle(30, 42, 11);
    g.lineStyle(1.5, 0x6b4520, 1);
    g.strokeCircle(30, 42, 11);
    g.lineBetween(19, 42, 41, 42);

    oval(g, 17, 52, 11, 9, 0x4aa3d6);
    oval(g, 43, 52, 11, 9, 0x4aa3d6);
    oval(g, 13, 39, 10, 12, 0x4aa3d6);
    oval(g, 47, 39, 10, 12, 0x4aa3d6);

    oval(g, 29, 20, 27, 24, 0x4aa3d6); // głowa
    limb(g, 17, 14, 13, 8, 200, 0xf5f5f5); // futrzane uszy
    limb(g, 41, 14, 13, 8, -20, 0xf5f5f5);
    eyes(g, 29, 18, 7, 3.8);
    smile(g, 29, 27, 5);
  },

  horsea(g) {
    // zwinięty ogonek konika morskiego
    curve(g, [[30, 46], [34, 52], [30, 57], [24, 55], [25, 50]], 5, 0x4a95d1);
    spike(g, 40, 26, 14, 16, 20, 0x9fd6f2); // płetwa grzbietowa

    oval(g, 31, 32, 24, 30, 0x5aa9e6); // korpus
    oval(g, 31, 36, 13, 17, 0xbfe3f7, 0); // jasny brzuszek

    oval(g, 29, 19, 22, 19, 0x5aa9e6); // głowa
    limb(g, 20, 21, 14, 9, 190, 0x5aa9e6); // pyszczek-rurka
    spike(g, 32, 9, 10, 9, -60, 0x9fd6f2); // grzebień
    eyes(g, 31, 18, 5.5, 3.2);
  },

  staryu(g) {
    const pts: number[] = [];
    for (let i = 0; i < 10; i++) {
      const r = i % 2 === 0 ? 27 : 11;
      const a = Phaser.Math.DegToRad(-90 + i * 36);
      pts.push(32 + Math.cos(a) * r, 34 + Math.sin(a) * r);
    }
    g.fillStyle(0xd9b26a, 1);
    g.beginPath();
    g.moveTo(pts[0], pts[1]);
    for (let i = 2; i < pts.length; i += 2) g.lineTo(pts[i], pts[i + 1]);
    g.closePath();
    g.fillPath();
    g.lineStyle(2, OUTLINE, 1);
    g.strokePath();

    g.fillStyle(0xc0392b, 1);
    g.fillCircle(32, 34, 9);
    g.lineStyle(2, OUTLINE, 1);
    g.strokeCircle(32, 34, 9);
    g.fillStyle(0xffd166, 1);
    g.fillCircle(32, 34, 4.5);
    g.fillStyle(0xffffff, 0.85);
    g.fillCircle(30.3, 32.3, 1.7);
  },

  bulbasaur(g) {
    // cebulka na grzbiecie
    oval(g, 38, 26, 24, 22, 0x63b85f);
    g.fillStyle(0x4e9c4a, 1);
    g.fillEllipse(38, 20, 22, 9);
    limb(g, 44, 22, 12, 8, -40, 0x4e9c4a);

    oval(g, 26, 42, 32, 28, 0x7fd0ca); // tułów
    g.fillStyle(0x5aa9a4, 1); // ciemne łatki
    g.fillEllipse(17, 38, 9, 6);
    g.fillEllipse(31, 50, 8, 5);
    oval(g, 16, 53, 12, 9, 0x7fd0ca);
    oval(g, 33, 54, 12, 9, 0x7fd0ca);

    oval(g, 21, 31, 26, 22, 0x7fd0ca); // głowa
    spike(g, 12, 22, 11, 10, -120, 0x7fd0ca); // uszy
    spike(g, 29, 21, 11, 10, -60, 0x7fd0ca);
    eyes(g, 21, 31, 7, 3.6);
    smile(g, 21, 39, 4.5);
  },

  ivysaur(g) {
    // pąk kwiatu z płatkami
    for (const a of [-150, -110, -70, -30]) limb(g, 38, 24, 14, 9, a, 0x4e9c4a);
    oval(g, 38, 20, 16, 15, 0xe86ba0);
    g.fillStyle(0xf49bc1, 1);
    g.fillEllipse(38, 18, 9, 7);

    oval(g, 26, 44, 34, 30, 0x6fc0ba);
    g.fillStyle(0x4f9c98, 1);
    g.fillEllipse(16, 40, 9, 6);
    g.fillEllipse(31, 52, 8, 5);
    oval(g, 15, 55, 12, 9, 0x6fc0ba);
    oval(g, 34, 56, 12, 9, 0x6fc0ba);

    oval(g, 21, 33, 27, 23, 0x6fc0ba);
    spike(g, 11, 24, 11, 10, -120, 0x6fc0ba);
    spike(g, 29, 23, 11, 10, -60, 0x6fc0ba);
    eyes(g, 21, 33, 7, 3.6);
    smile(g, 21, 41, 4.5);
  },

  bellsprout(g) {
    // korzonki
    curve(g, [[30, 52], [24, 58]], 2.5, 0xd9b94a);
    curve(g, [[30, 52], [36, 58]], 2.5, 0xd9b94a);
    // łodyga
    curve(g, [[30, 52], [29, 40], [30, 32]], 4.5, 0x6bbf59);
    limb(g, 28, 40, 18, 10, 165, 0x6bbf59); // listki
    limb(g, 32, 44, 18, 10, 15, 0x6bbf59);

    oval(g, 30, 22, 30, 27, 0xe8d05a); // dzwonkowa głowa
    g.fillStyle(0xd6b94a, 1);
    g.fillEllipse(30, 32, 23, 8);
    eyes(g, 30, 20, 7, 3.6);
    g.fillStyle(OUTLINE, 1);
    g.fillEllipse(30, 28, 7, 4);
  },

  oddish(g) {
    // liście wyrastające z czubka głowy
    limb(g, 30, 22, 20, 11, 205, 0x5aa845);
    limb(g, 34, 22, 20, 11, -25, 0x5aa845);
    limb(g, 32, 20, 16, 10, -90, 0x6bbf59);

    oval(g, 32, 40, 34, 30, 0x6b8fd6); // ciało
    oval(g, 24, 55, 11, 8, 0xe8d05a); // stópki
    oval(g, 40, 55, 11, 8, 0xe8d05a);
    eyes(g, 32, 38, 8, 4);
    g.fillStyle(OUTLINE, 1);
    g.fillEllipse(32, 47, 9, 5);
  },
};

export function createSpriteTextures(scene: Phaser.Scene) {
  for (const [key, paint] of Object.entries(PAINTERS)) {
    if (scene.textures.exists(key)) continue;
    const g = scene.add.graphics();
    paint(g);
    g.generateTexture(key, 64, 64);
    g.destroy();
  }
}
