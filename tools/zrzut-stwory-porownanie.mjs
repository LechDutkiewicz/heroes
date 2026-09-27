// Arkusz porównania: stworki-strażnicy obok NASZYCH obiektów mapy, w tej
// samej skali i tą samą drogą rysowania, co w grze.
//
//   node tools/zrzut-stwory-porownanie.mjs [--url http://localhost:4173]
//                                          [--mapy polana,bagna,twierdza]
//                                          [--out tools/shots/stwory-porownanie.png]
//
// Po co: cztery rundy wzorca „stwory na mapie" przerzucały nas między „za
// ostre naklejki" a „rozmyty muł", bo celem były słowa krytyków. Sędzią są
// nasze obiekty — chata, wieża, wóz, skrzynia, kopalnia — i ten arkusz
// stawia je obok stworków na jednym pasie gruntu, żeby technikę (ostrość,
// kontur, światło, nasycenie) dało się porównać wprost.
//
// Na każdej planszy: pas w barwie gruntu okolicy przykrywa widok, w górnym
// rzędzie stają KOPIE czterech obiektów tej planszy (te same tekstury, skale, obrysy
// i cienie co w ich kontenerach), niżej wszystkie 18 stworków zbudowanych
// przez `obrazyStworka` — tę samą metodę, której używa `rysujObiekty`.
// Zrzut w skali gry (32 px na pole), potem ×2 najbliższym sąsiadem; plansze
// jedna pod drugą.

import { chromium } from 'playwright';
import { mkdir, writeFile } from 'node:fs/promises';
import { dirname } from 'node:path';

const arg = (n, d) => {
  const i = process.argv.indexOf(n);
  return i !== -1 ? process.argv[i + 1] : d;
};
const BASE = arg('--url', 'http://localhost:4173');
const MAPY = arg('--mapy', 'polana,bagna,twierdza').split(',');
const OUT = arg('--out', 'tools/shots/stwory-porownanie.png');
const POWIEKSZENIE = 2;
/** Wysokość pasa jednej planszy na ekranie (px gry): trzy rzędy. */
const PAS_H = 224;

const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
const page = await browser.newPage({ viewport: { width: 1000, height: 760 }, deviceScaleFactor: 1 });
const bledy = [];
page.on('pageerror', (e) => bledy.push(String(e)));
page.on('console', (m) => m.type() === 'error' && bledy.push(m.text()));

const gotowa = () =>
  page.waitForFunction(() => window.__game?.scene.getScene('adventure')?.sys.settings.status === 5, null, {
    timeout: 60000,
  });

const pasy = [];
for (const mapa of MAPY) {
  await page.goto(`${BASE}/?ekran=mapa&mapa=${mapa}`, { waitUntil: 'domcontentloaded' });
  await gotowa();
  await page.evaluate(() => {
    const scena = window.__game.scene.getScene('adventure');
    const stan = window.__game.registry.get('stan-mapy');
    stan.odkryte = stan.odkryte.map((w) => w.map(() => true));
    scena.scene.restart();
  });
  await page.waitForTimeout(300);
  await gotowa();
  // Tło dużej planszy dochodzi kawałkami już po starcie sceny i ląduje NAD
  // wcześniej dodanym pasem — czekamy, aż wszystko się dorysuje.
  await page.waitForTimeout(2500);
  const wynik = await page.evaluate(async (pasH) => {
    const scena = window.__game.scene.getScene('adventure');
    const stan = window.__game.registry.get('stan-mapy');
    const KAFEL = scena.mapaW / stan.szer;
    const ID = ['00193', '00020', '00218', '00030', '00096', '00227', '00246', '00002', '00263', '00250', '00220', '00196', '00074', '00058', '00095', '00023', '00077', '00041'];
    // Stworki, których nie ma na tej planszy, trzeba doczytać.
    const brak = ID.filter((s) => !scena.textures.exists(`p-${s}`));
    if (brak.length) {
      for (const s of brak) scena.load.image(`p-${s}`, `sprites/${s}.png`);
      await new Promise((r) => {
        scena.load.once('complete', r);
        scena.load.start();
      });
    }
    // Widok: lewy górny róg kamery w świecie. Scena potrafi jeszcze dosuwać
    // kamerę płynnie (tween) — zatrzymujemy ją, zanim odczytamy przewinięcie.
    const k = scena.kamera;
    scena.tweens.killTweensOf(k);
    const x0 = k.scrollX;
    const y0 = k.scrollY;
    const szerW = scena.oknoW / k.zoom;
    const wysW = pasH / k.zoom;
    // Barwa gruntu: okolica pierwszego strażnika planszy (albo bohatera).
    const straz = stan.obiekty.find((o) => o.rodzaj === 'potwor' && !o.zebrany) ?? stan.bohater;
    const tlo = scena.barwaOkolicy(straz.x, straz.y);
    const barwaPasa = (Math.round(tlo[0]) << 16) | (Math.round(tlo[1]) << 8) | Math.round(tlo[2]);
    // Uwaga: na Twierdzy pas pokrywa tylko lewą część widoku (przyczyny nie
    // znalazłem — nic nie leży nad nim na liście świata); w prawej stworki
    // stoją na prawdziwym śniegu planszy, co do porównania też się przydaje.
    const kluczPasa = `pas-porownania-${barwaPasa}`;
    if (!scena.textures.exists(kluczPasa)) {
      const t = scena.textures.createCanvas(kluczPasa, 4, 4);
      const ctx = t.getContext();
      ctx.fillStyle = `rgb(${tlo.map(Math.round).join(',')})`;
      ctx.fillRect(0, 0, 4, 4);
      t.refresh();
    }
    scena.swiat.add(scena.add.image(x0, y0, kluczPasa).setOrigin(0, 0).setDisplaySize(szerW, wysW));

    // Rząd 1: kopie obiektów planszy, po jednym na teksturę.
    const chciane = ['chatka', 'wieza-obserwacyjna', 'woz', 'skrzynia', 'kopalnia', 'namiot-klucznika', 'chata-jasnowidza', 'wiatrak'];
    const kontenery = Object.values(scena.ikonyObiektow);
    const wybrane = [];
    for (const nazwa of chciane) {
      const kt = kontenery.find((c) => {
        const o = c.getData('obiekt');
        return o?.rodzaj !== 'potwor' && c.list.some((ch) => ch.texture?.key === `m-${nazwa}`);
      });
      if (kt && !wybrane.includes(kt)) wybrane.push(kt);
      if (wybrane.length >= 4) break;
    }
    let x = x0 + KAFEL * 1.2;
    const nazwyObiektow = [];
    for (const kt of wybrane) {
      // Kopia stoi tak, żeby lewy brzeg jej granic wypadł na `x`, a spód
      // rysunku (środek pola + 0,46) na linii rzędu.
      const b = kt.getBounds();
      const szer = b.width;
      const kopia = scena.add.container(x + (kt.x - b.x), y0 + KAFEL * (2.9 - 0.46));
      for (const ch of kt.list) {
        if (!ch.texture || !ch.visible) continue;
        const im = scena.add
          .image(ch.x, ch.y, ch.texture.key, ch.frame.name)
          .setOrigin(ch.originX, ch.originY)
          .setScale(ch.scaleX, ch.scaleY)
          .setAlpha(ch.alpha)
          .setFlipX(ch.flipX);
        if (ch.isTinted) im.setTint(ch.tintTopLeft).setTintMode(ch.tintMode);
        kopia.add(im);
      }
      scena.swiat.add(kopia);
      nazwyObiektow.push(kt.list.find((ch) => ch.texture?.key?.startsWith('m-'))?.texture.key);
      x += szer + KAFEL * 0.6;
    }
    // Rzędy 2–3: stworki.
    ID.forEach((s, i) => {
      const klucz = `p-${s}`;
      const { wys } = scena.grafikaObiektu({ rodzaj: 'potwor', oddzialy: [{ sprite: s }] });
      const kont = scena.add.container(
        x0 + KAFEL * (1.1 + (i % 9) * 2.2),
        y0 + KAFEL * (4.1 + Math.floor(i / 9) * 1.5)
      );
      kont.add(scena.obrazyStworka(klucz, wys, tlo).obrazy);
      scena.swiat.add(kont);
    });
    return { x: scena.mapaX, y: scena.mapaY, w: scena.oknoW, obiekty: nazwyObiektow };
  }, PAS_H);
  await page.waitForTimeout(600);
  const plotno = await (await page.$('canvas')).boundingBox();
  const png = await page.screenshot({
    clip: { x: plotno.x + wynik.x, y: plotno.y + wynik.y, width: wynik.w, height: PAS_H },
  });
  pasy.push(png.toString('base64'));
  console.log(`${mapa}: obiekty ${wynik.obiekty.join(', ')}`);
}

const arkusz = await page.evaluate(
  async ({ pasy, k }) => {
    const obrazy = await Promise.all(
      pasy.map(async (b64) => {
        const im = new Image();
        im.src = `data:image/png;base64,${b64}`;
        await im.decode();
        return im;
      })
    );
    const c = document.createElement('canvas');
    c.width = obrazy[0].width * k;
    c.height = obrazy.reduce((s, im) => s + im.height * k + 4, 0);
    const ctx = c.getContext('2d');
    ctx.imageSmoothingEnabled = false;
    let y = 0;
    for (const im of obrazy) {
      ctx.drawImage(im, 0, y, im.width * k, im.height * k);
      y += im.height * k + 4;
    }
    return c.toDataURL('image/png').split(',')[1];
  },
  { pasy, k: POWIEKSZENIE }
);
await mkdir(dirname(OUT), { recursive: true });
await writeFile(OUT, Buffer.from(arkusz, 'base64'));
console.log(`arkusz: ${OUT}`);
if (bledy.length) {
  console.log('BŁĘDY W KONSOLI:');
  for (const b of bledy) console.log('  ' + b);
}
await browser.close();
process.exit(bledy.length ? 1 : 0);
