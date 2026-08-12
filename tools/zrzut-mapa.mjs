// Zrzut mapy przygody. Osobno od `capture.mjs`, bo tamten harness zna tylko
// scenę bitwy (czeka na `getScene('battle')`) i nie umiałby stwierdzić, czy
// mapa się w ogóle wczytała.
//
//   node tools/zrzut-mapa.mjs [--url http://localhost:4173] [--out tools/shots/mapa.png]

import { chromium } from 'playwright';
import { mkdir } from 'node:fs/promises';
import { dirname } from 'node:path';

const arg = (n, d) => {
  const i = process.argv.indexOf(n);
  return i !== -1 ? process.argv[i + 1] : d;
};
const BASE = arg('--url', 'http://localhost:4173');
const OUT = arg('--out', 'tools/shots/mapa.png');

const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
const page = await browser.newPage({ viewport: { width: 1000, height: 760 } });

const bledy = [];
page.on('pageerror', (e) => bledy.push(String(e)));
page.on('response', (r) => r.status() >= 400 && bledy.push(`${r.status()} ${r.url()}`));
page.on('console', (m) => m.type() === 'error' && bledy.push(m.text()));

await page.goto(`${BASE}/?ekran=mapa`, { waitUntil: 'domcontentloaded' });
await page.waitForFunction(
  () => window.__game?.scene.getScene('adventure')?.sys.settings.status === 5,
  null,
  { timeout: 30000 }
);
// Kafelki i sprite'y przeszkód ładują się po starcie sceny — bez tej pauzy
// zrzut łapie gołe tło i wygląda, jakby teren się nie rysował.
await page.waitForTimeout(1200);

await mkdir(dirname(OUT), { recursive: true });
const el = await page.$('canvas');
await el.screenshot({ path: OUT });
console.log(`zrzut: ${OUT}`);
if (bledy.length) {
  console.log('BŁĘDY W KONSOLI:');
  for (const b of bledy) console.log('  ' + b);
}
await browser.close();
process.exit(bledy.length ? 1 : 0);
