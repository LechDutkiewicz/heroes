// Zrzut mapy przygody. Osobno od `capture.mjs`, bo tamten harness zna tylko
// scenę bitwy (czeka na `getScene('battle')`) i nie umiałby stwierdzić, czy
// mapa się w ogóle wczytała.
//
//   node tools/zrzut-mapa.mjs [--url http://localhost:4173] [--out tools/shots/mapa.png]
//                             [--mapa polana] [--caly] [--zwiad 12]
//
// `--mapa` wybiera planszę z rejestru `MAPY` (adres `?ekran=mapa&mapa=<id>`).
// `--caly` robi PODGLĄD CAŁEJ PLANSZY: mgła zdjęta, kamera planszy
// rozciągnięta na całe płótno i oddalona tak, żeby zmieściła się cała mapa —
// to jest ta sama scena co w grze (drzewa, skały, obiekty, woda), tylko
// widziana z góry, a nie obrazek składany osobno, który mógłby się z grą
// rozjechać.

import { chromium } from 'playwright';
import { mkdir } from 'node:fs/promises';
import { dirname } from 'node:path';

const arg = (n, d) => {
  const i = process.argv.indexOf(n);
  return i !== -1 ? process.argv[i + 1] : d;
};
const BASE = arg('--url', 'http://localhost:4173');
const MAPA = arg('--mapa', null);
const CALY = process.argv.includes('--caly');
/** `--zwiad 12` — mgła zdjęta w promieniu 12 pól od bohatera. */
const ZWIAD = Number(arg('--zwiad', 0));
const OUT = arg(
  '--out',
  `tools/shots/mapa${MAPA ? `-${MAPA}` : ''}${CALY ? '-caly' : ''}${ZWIAD ? '-zwiad' : ''}.png`
);
/** Bok podglądu całej planszy w pikselach. */
const BOK_PODGLADU = Number(arg('--bok', 1152));

const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
const page = await browser.newPage({
  viewport: CALY ? { width: BOK_PODGLADU + 40, height: BOK_PODGLADU + 40 } : { width: 1000, height: 760 },
  deviceScaleFactor: 1,
});

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

await page.goto(`${BASE}/?ekran=mapa${MAPA ? `&mapa=${MAPA}` : ''}`, { waitUntil: 'domcontentloaded' });
await gotowa();

if (ZWIAD > 0) {
  // Okolica startu odsłonięta tak, jak po kilku dniach zwiadu — ten sam
  // widok gry, tylko bez czerni mgły, która w pierwszej turze zakrywa
  // prawie cały ekran i nie pozwala ocenić, jak plansza wygląda.
  await page.evaluate((r) => {
    const scena = window.__game.scene.getScene('adventure');
    const stan = window.__game.registry.get('stan-mapy');
    const { x, y } = stan.bohater;
    // Promień dobrany był do widoku 14 × 12 pól. Po oddaleniu kamery
    // (ZOOM_MAPY) widok jest szerszy, więc promień rośnie razem z nim —
    // inaczej rogi kadru zostają w mgle, a wzorce HotA mgły w kadrze nie mają.
    r = r / (scena.kamera?.zoom || 1);
    stan.odkryte = stan.odkryte.map((w, wy) => w.map((v, wx) => v || (wx - x) ** 2 + (wy - y) ** 2 <= r * r));
    scena.scene.restart();
  }, ZWIAD);
  await page.waitForTimeout(300);
  await gotowa();
}

if (CALY) {
  // Zdejmujemy mgłę w stanie gry i przerysowujemy scenę — mgła jest rysowana
  // w `create`, więc samo przestawienie tablicy nie wystarczy.
  await page.evaluate(() => {
    const scena = window.__game.scene.getScene('adventure');
    const stan = window.__game.registry.get('stan-mapy');
    stan.odkryte = stan.odkryte.map((w) => w.map(() => true));
    scena.scene.restart();
  });
  await page.waitForTimeout(300);
  await gotowa();
  await page.waitForTimeout(1500);
  await page.evaluate((bok) => {
    const gra = window.__game;
    const scena = gra.scene.getScene('adventure');
    gra.scale.resize(bok, bok);
    const k = scena.kamera;
    k.setViewport(0, 0, bok, bok);
    // W grze kamera planszy ma origin (0, 0) i własny zoom mapy (32 px na
    // pole). `setBounds` i `centerOn` Phasera liczą za to od środka kamery,
    // więc na czas podglądu wracamy do originu 0,5 — inaczej plansza
    // wyjeżdżała z kadru o pół okna.
    k.setOrigin(0.5, 0.5);
    k.setBounds(0, 0, scena.mapaW, scena.mapaH);
    k.setZoom(bok / Math.max(scena.mapaW, scena.mapaH));
    k.centerOn(scena.mapaW / 2, scena.mapaH / 2);
    // Pasek HUD-u i okna nie należą do podglądu mapy.
    scena.cameras.main.setVisible(false);
    // Shader wody liczy współrzędne z originu, zoomu i przewinięcia kamery,
    // więc i w tym podglądzie rysuje wodę tam, gdzie leży tło.
    scena.kameraOkien?.setVisible(false);
  }, BOK_PODGLADU);
  await page.waitForTimeout(800);
} else {
  // Kafelki i sprite'y przeszkód ładują się po starcie sceny — bez tej pauzy
  // zrzut łapie gołe tło i wygląda, jakby teren się nie rysował.
  await page.waitForTimeout(1500);
}

await mkdir(dirname(OUT), { recursive: true });
const el = await page.$('canvas');
if (CALY) {
  await el.screenshot({ path: OUT, clip: { x: 0, y: 0, width: BOK_PODGLADU, height: BOK_PODGLADU } });
} else {
  await el.screenshot({ path: OUT });
}
console.log(`zrzut: ${OUT}`);
if (bledy.length) {
  console.log('BŁĘDY W KONSOLI:');
  for (const b of bledy) console.log('  ' + b);
}
await browser.close();
process.exit(bledy.length ? 1 : 0);
