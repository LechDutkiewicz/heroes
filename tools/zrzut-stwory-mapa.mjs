// Zbliżenie stworów na mapie przygody — to, co krytyk widzi obok wycinka
// z Heroes 3 (`tools/reference/homm3/ref-mapa-stos-*.png`).
//
//   node tools/zrzut-stwory-mapa.mjs [--url http://localhost:4173]
//                                    [--mapy polana,bagna,twierdza] [--out tools/shots]
//
// Dla każdej planszy: mgła zdjęta, kamera wyśrodkowana na neutralnym stosie,
// wycinek 8 × 6 pól w NATYWNEJ skali gry (32 px na pole na ekranie), potem
// powiększony ×2 najbliższym sąsiadem — ta sama obróbka co wycinki wzorców,
// żeby porównanie szło piksel do piksela, a nie rozmazanie do rozmazania.
//
// Który stos: para stosów mieszcząca się razem w kadrze (do 4 pól w poziomie,
// 2 w pionie), najlepiej dwa różne stworki, których nie było w kadrach
// poprzednich plansz; potem najciaśniejsza, potem bliższa bohatera. Bez
// pary — stos najbliższy bohatera. Wybór zależy tylko od danych planszy,
// więc zrzut jest powtarzalny między rundami.
//
// Wynik: `tools/shots/stwory-mapa-<id>.png` (512 × 384).

import { chromium } from 'playwright';
import { mkdir } from 'node:fs/promises';

const arg = (n, d) => {
  const i = process.argv.indexOf(n);
  return i !== -1 ? process.argv[i + 1] : d;
};
const BASE = arg('--url', 'http://localhost:4173');
const MAPY = arg('--mapy', 'polana,bagna,twierdza').split(',');
const OUT = arg('--out', 'tools/shots');
/** Wycinek w polach i bok pola na ekranie (KAFEL × ZOOM_MAPY = 32). */
const POLA_W = 8;
const POLA_H = 6;
const POLE = 32;
const POWIEKSZENIE = 2;

const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
const page = await browser.newPage({ viewport: { width: 1000, height: 760 }, deviceScaleFactor: 1 });

const bledy = [];
page.on('pageerror', (e) => bledy.push(String(e)));
page.on('requestfinished', async (r) => {
  const res = await r.response();
  if (res && res.status() >= 400) bledy.push(`${res.status()} ${r.url()}`);
});
page.on('console', (m) => m.type() === 'error' && bledy.push(m.text()));

const gotowa = () =>
  page.waitForFunction(
    () => window.__game?.scene.getScene('adventure')?.sys.settings.status === 5,
    null,
    { timeout: 60000 }
  );

await mkdir(OUT, { recursive: true });

/** Stworki z kadrów poprzednich plansz — patrz `ocena`. */
const pokazane = [];
for (const mapa of MAPY) {
  await page.goto(`${BASE}/?ekran=mapa&mapa=${mapa}`, { waitUntil: 'domcontentloaded' });
  await gotowa();
  // Mgła zdjęta w stanie gry, scena przerysowana — mgła powstaje w `create`.
  await page.evaluate(() => {
    const scena = window.__game.scene.getScene('adventure');
    const stan = window.__game.registry.get('stan-mapy');
    stan.odkryte = stan.odkryte.map((w) => w.map(() => true));
    scena.scene.restart();
  });
  await page.waitForTimeout(300);
  await gotowa();
  const cel = await page.evaluate((pokazane) => {
    const scena = window.__game.scene.getScene('adventure');
    const stan = window.__game.registry.get('stan-mapy');
    // Stosy przy brzegu planszy odpadają: kamera nie przewinie się dalej niż
    // brzeg, więc lądowały w rogu kadru, pół-zasłonięte drzewami brzegu.
    const stosy = stan.obiekty.filter(
      (o) =>
        o.rodzaj === 'potwor' &&
        !o.zebrany &&
        o.oddzialy?.length &&
        o.x >= 5 && o.y >= 4 && o.x < stan.szer - 5 && o.y < stan.wys - 4
    );
    const b = stan.bohater;
    // Para mieści się w kadrze 8 × 6 z zapasem na sylwetkę i chorągiewkę.
    // Najciaśniejsza para (remis — bliższa bohatera); bez pary — stos
    // najbliższy bohatera.
    const odl = (p, o) => Math.max(Math.abs(p.x - o.x), Math.abs(p.y - o.y));
    const doBoh = (p) => Math.hypot(p.x - b.x, p.y - b.y);
    // Różnorodność: para dwóch RÓŻNYCH stworków i takich, których nie było
    // w kadrach poprzednich plansz, wygrywa z ciaśniejszą parą bliźniaków —
    // krytyk ma zobaczyć kilka stworków, a nie ciągle tego samego.
    const sp = (p) => p.oddzialy[0].sprite;
    const ocena = (p, q) =>
      odl(p, q) * 1000 +
      doBoh(p) +
      (sp(p) === sp(q) ? 6000 : 0) +
      (pokazane.includes(sp(p)) ? 4000 : 0) +
      (pokazane.includes(sp(q)) ? 4000 : 0);
    let o = null;
    let s = null;
    for (const p of stosy)
      for (const q of stosy) {
        if (p === q || Math.abs(p.x - q.x) > 4 || Math.abs(p.y - q.y) > 2) continue;
        if (!o || ocena(p, q) < ocena(o, s)) [o, s] = [p, q];
      }
    if (!o) o = [...stosy].sort((p, q) => doBoh(p) - doBoh(q))[0];
    const cx = s ? (o.x + s.x) / 2 : o.x;
    const cy = (s ? (o.y + s.y) / 2 : o.y) - 0.4;
    scena.wysrodkujNa(cx, cy, false);
    return {
      cx,
      cy,
      stosy: [o, s].filter(Boolean).map((p) => `${p.nazwa ?? '?'} (${p.oddzialy[0].sprite}) @${p.x},${p.y}`),
      sprite: [o, s].filter(Boolean).map((p) => p.oddzialy[0].sprite),
    };
  }, pokazane);
  pokazane.push(...cel.sprite);
  // Kafelki, przeszkody i tekstury stworów doczytują się po starcie sceny.
  await page.waitForTimeout(1500);
  // Położenie na ekranie liczone PO odczekaniu: scena potrafi jeszcze dosunąć
  // kamerę (brzeg planszy, bohater), a kadr ma iść za tym, co naprawdę widać.
  Object.assign(
    cel,
    await page.evaluate(({ cx, cy }) => {
      const scena = window.__game.scene.getScene('adventure');
      const stan = window.__game.registry.get('stan-mapy');
      const k = scena.kamera;
      const KAFEL = scena.mapaW / stan.szer;
      return {
        x: scena.mapaX + ((cx + 0.5) * KAFEL - k.scrollX) * k.zoom,
        y: scena.mapaY + ((cy + 0.5) * KAFEL - k.scrollY) * k.zoom,
        ramka: { x: scena.mapaX, y: scena.mapaY, w: scena.oknoW, h: scena.oknoH },
      };
    }, cel)
  );
  const w = POLA_W * POLE;
  const h = POLA_H * POLE;
  const r = cel.ramka;
  // Płótno jest wyśrodkowane w oknie przeglądarki — współrzędne gry trzeba
  // przesunąć o jego róg, bo `clip` liczy się od rogu strony.
  const plotno = await (await page.$('canvas')).boundingBox();
  const clip = {
    x: plotno.x + Math.round(Math.min(Math.max(cel.x - w / 2, r.x), r.x + r.w - w)),
    y: plotno.y + Math.round(Math.min(Math.max(cel.y - h / 2, r.y), r.y + r.h - h)),
    width: w,
    height: h,
  };
  const png = await page.screenshot({ clip });
  // ×2 najbliższym sąsiadem — w przeglądarce, bez zależności od Pythona.
  const powiekszony = await page.evaluate(
    async ({ b64, k }) => {
      const img = new Image();
      img.src = `data:image/png;base64,${b64}`;
      await img.decode();
      const c = document.createElement('canvas');
      c.width = img.width * k;
      c.height = img.height * k;
      const ctx = c.getContext('2d');
      ctx.imageSmoothingEnabled = false;
      ctx.drawImage(img, 0, 0, c.width, c.height);
      return c.toDataURL('image/png').split(',')[1];
    },
    { b64: png.toString('base64'), k: POWIEKSZENIE }
  );
  const plik = `${OUT}/stwory-mapa-${mapa}.png`;
  const { writeFile } = await import('node:fs/promises');
  await writeFile(plik, Buffer.from(powiekszony, 'base64'));
  console.log(`zrzut: ${plik}  — ${cel.stosy.join(', ')}`);
}

if (bledy.length) {
  console.log('BŁĘDY W KONSOLI:');
  for (const b of bledy) console.log('  ' + b);
}
await browser.close();
process.exit(bledy.length ? 1 : 0);
