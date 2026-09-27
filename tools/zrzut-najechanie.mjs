// Pasek „najechanie na stos": strażnik na mapie przygody pod kursorem —
// do ślepego porównania z paskami HotA (`tools/reference/homm3/
// ref-anim-mapa-hota-*-pasek.png`).
//
//   node tools/zrzut-najechanie.mjs [--url http://localhost:4173] [--mapa polana]
//                                   [--stwor 00096 | --pole 9,13] [--out tools/shots]
//
// Mgła zdjęta, kamera na strażniku, kursor (prawdziwy ruch myszy Playwrighta)
// na jego widocznym rysunku. Potem jedna podróż do strony: próbnik na
// zegarze wirtualnym, jak w `tools/zrzut-anim.mjs` — pętla gry uśpiona,
// `game.step` co 1/60 s, `Date.now` idzie tym samym zegarem, po każdym
// kroku kopia wycinka kanwasu. Pasek to dwanaście RÓWNO rozłożonych klatek
// pierwszej pętli (`NAJECHANIE_OKRES`, od chwili najechania do jej końca
// włącznie — ostatnia ma być znów pierwszą; wzorce mają 27–42 klatek, przy
// sześciu przejścia między pozami w ogóle nie było widać),
// wycinek 3 × 2,4 pola wokół strażnika w skali gry, ×2 najbliższym sąsiadem —
// ta sama obróbka co wycinki wzorca.
//
// Wynik: `tools/shots/anim-najechanie.png`.

import { chromium } from 'playwright';
import { mkdir, writeFile } from 'node:fs/promises';

const arg = (n, d) => {
  const i = process.argv.indexOf(n);
  return i !== -1 ? process.argv[i + 1] : d;
};
const BASE = arg('--url', 'http://localhost:4173');
const MAPA = arg('--mapa', 'polana');
const STWOR = arg('--stwor', '');
const POLE = arg('--pole', '');
const OUT = arg('--out', 'tools/shots');
/** Długość nagrania — jedna pętla najechania (`NAJECHANIE_OKRES`). */
const OKRES = 1600;
const KLATEK = 12;

const browser = await chromium.launch({
  executablePath: process.env.CHROMIUM_PATH || '/opt/pw-browsers/chromium',
});
const page = await browser.newPage({ viewport: { width: 1000, height: 760 }, deviceScaleFactor: 1 });
const bledy = [];
page.on('pageerror', (e) => bledy.push(String(e)));
page.on('console', (m) => m.type() === 'error' && bledy.push(m.text()));

const gotowa = () =>
  page.waitForFunction(() => window.__game?.scene.getScene('adventure')?.sys.settings.status === 5, null, {
    timeout: 60000,
  });

await mkdir(OUT, { recursive: true });
await page.goto(`${BASE}/?ekran=mapa&mapa=${MAPA}`, { waitUntil: 'domcontentloaded' });
await gotowa();
await page.evaluate(() => {
  const stan = window.__game.registry.get('stan-mapy');
  stan.odkryte = stan.odkryte.map((w) => w.map(() => true));
  window.__game.scene.getScene('adventure').scene.restart();
});
await page.waitForTimeout(300);
await gotowa();

// Strażnik: z podanego pola, podany stworek albo ten najbliżej bohatera,
// z dala od brzegu.
const cel = await page.evaluate(([stwor, pole]) => {
  const s = window.__game.scene.getScene('adventure');
  const stan = window.__game.registry.get('stan-mapy');
  const b = stan.bohater;
  const stosy = stan.obiekty.filter(
    (o) =>
      o.rodzaj === 'potwor' &&
      !o.zebrany &&
      o.oddzialy?.length &&
      (!stwor || o.oddzialy[0].sprite === stwor) &&
      (!pole || `${o.x},${o.y}` === pole) &&
      (pole || (o.x >= 4 && o.y >= 4 && o.x < stan.szer - 4 && o.y < stan.wys - 4))
  );
  stosy.sort((p, q) => Math.hypot(p.x - b.x, p.y - b.y) - Math.hypot(q.x - b.x, q.y - b.y));
  const o = stosy[0];
  if (!o) return { blad: 'brak strażnika' };
  s.wysrodkujNa(o.x, o.y - 0.3, false);
  return { x: o.x, y: o.y, nazwa: o.nazwa, sprite: o.oddzialy[0].sprite };
}, [STWOR, POLE]);
if (cel.blad) throw new Error(cel.blad);
await page.waitForTimeout(300);

// Punkt na WIDOCZNYM rysunku, który gra rozpoznaje jako tego strażnika —
// od środka sylwetki w dół (jak `tools/probe-zwis.mjs`).
const pkt = await page.evaluate((c) => {
  const s = window.__game.scene.getScene('adventure');
  const naEkran = (wx, wy) => s.kamera.matrixCombined.transformPoint(wx, wy, { x: 0, y: 0 });
  const t = s.trafienia.find((z) => z.o.x === c.x && z.o.y === c.y);
  const b = t.im.getBounds();
  for (let f = 0.5; f <= 0.95; f += 0.05) {
    const e = naEkran(b.centerX, b.y + b.height * f);
    if (s.obiektPodKursorem(e) === t.o) return { x: e.x, y: e.y, stopy: naEkran(b.centerX, b.bottom) };
  }
  return null;
}, cel);
if (!pkt) throw new Error('nie trafiam w rysunek strażnika');
const plotno = await (await page.$('canvas')).boundingBox();
const sk = plotno.width / (await page.evaluate(() => window.__game.canvas.width));
await page.mouse.move(plotno.x + pkt.x * sk, plotno.y + pkt.y * sk);

/** Próbnik — cały w stronie, jedna podróż. */
function nagraj({ stopy, okres, ile }) {
  const game = window.__game;
  const s = game.scene.getScene('adventure');
  const DT = 1000 / 60;
  const POLE = 32;
  const KW = Math.round(POLE * 3);
  const KH = Math.round(POLE * 2.4);
  const ZOOM = 2;
  // Znak kursora wisiałby na środku kadru — pasek ma pokazać samego stworka.
  s.kursorZnak.setVisible(false);
  const z = [...s.ruchomeStraze][0];
  if (!z) return { blad: 'najechanie nie obudziło strażnika' };
  // Kadr: stopy strażnika na 80% wysokości kadru.
  const x0 = Math.round(stopy.x - KW / 2);
  const y0 = Math.round(stopy.y - KH * 0.8);

  const prawdziwy = Date.now;
  let teraz = prawdziwy();
  Date.now = () => teraz;
  let t = performance.now();
  game.loop.sleep();
  const kanwas = game.canvas;
  const klatki = [];
  const zapisz = () => {
    game.renderer.preRender();
    game.scene.render(game.renderer);
    game.renderer.postRender();
    const c = document.createElement('canvas');
    c.width = KW * ZOOM;
    c.height = KH * ZOOM;
    const g = c.getContext('2d');
    g.imageSmoothingEnabled = false;
    g.drawImage(kanwas, x0, y0, KW, KH, 0, 0, KW * ZOOM, KH * ZOOM);
    // Udział pozy: krycie jej sylwetki (0 — stoi, 1 — poza).
    klatki.push({ c, poza: z.klatki?.[1]?.rysunek.visible ? z.klatki[1].rysunek.alpha : 0 });
  };
  try {
    // Klatka 0 — chwila najechania (ruch jeszcze nie ruszył).
    zapisz();
    const kroki = Math.round(okres / DT);
    for (let i = 0; i < kroki; i++) {
      teraz += DT;
      t += DT;
      game.step(t, DT);
      zapisz();
    }
    const W = KW * ZOOM;
    const H = KH * ZOOM;
    const pasek = document.createElement('canvas');
    pasek.width = W * ile + (ile - 1) * 2;
    pasek.height = H;
    const g = pasek.getContext('2d');
    g.fillStyle = '#1c1c1c';
    g.fillRect(0, 0, pasek.width, pasek.height);
    const wybor = [];
    for (let i = 0; i < ile; i++) wybor.push(Math.round((kroki * i) / (ile - 1)));
    wybor.forEach((k, i) => {
      const x = i * (W + 2);
      g.drawImage(klatki[k].c, x, 0);
      g.font = '13px sans-serif';
      g.fillStyle = '#000';
      g.fillText(`${i + 1}/${ile}`, x + 5, 16);
      g.fillStyle = '#fff';
      g.fillText(`${i + 1}/${ile}`, x + 4, 15);
    });
    return {
      png: pasek.toDataURL('image/png'),
      klatki: wybor.map((k) => `${Math.round(k * DT)}ms${klatki[k].poza ? `(poza ${klatki[k].poza.toFixed(2)})` : ''}`),
    };
  } finally {
    Date.now = prawdziwy;
    game.loop.wake();
  }
}

const w = await page.evaluate(nagraj, { stopy: pkt.stopy, okres: OKRES, ile: KLATEK });
if (w.blad) throw new Error(w.blad);
const plik = `${OUT}/anim-najechanie.png`;
await writeFile(plik, Buffer.from(w.png.split(',')[1], 'base64'));
console.log(`${cel.nazwa} (${cel.sprite}) @${cel.x},${cel.y} → ${plik}  klatki ${w.klatki.join(' / ')}`);
if (bledy.length) console.log(`błędy strony:\n  ${[...new Set(bledy)].join('\n  ')}`);
await browser.close();
