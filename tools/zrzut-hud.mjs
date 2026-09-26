// Zrzuty HUD-u mapy przygody na wspólnym zestawie: zwykła gra w misji 1,
// mapa z otwartym oknem skrzyni i okno awansu.
//
//   node tools/zrzut-hud.mjs [--url http://localhost:4173] [--out tools/shots]

import { chromium } from 'playwright';
import { mkdir } from 'node:fs/promises';
import { zainstalujPodejdz } from './sonda-wspolne.mjs';
import { czekajNaNapis, klikPrzycisk, scena, startMisji } from './wynik-wspolne.mjs';

const arg = (n, d) => {
  const i = process.argv.indexOf(n);
  return i !== -1 ? process.argv[i + 1] : d;
};
const BASE = arg('--url', 'http://localhost:4173');
const OUT = arg('--out', 'tools/shots');

const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome' });
const page = await browser.newPage({ viewport: { width: 1000, height: 760 }, deviceScaleFactor: 1 });
const bledy = [];
page.on('pageerror', (e) => bledy.push(String(e)));
page.on('console', (m) => m.type() === 'error' && bledy.push(m.text()));
page.on('requestfinished', async (r) => {
  const res = await r.response();
  if (res && res.status() >= 400) bledy.push(`${res.status()} ${r.url()}`);
});

await mkdir(OUT, { recursive: true });
const zrzut = async (nazwa) => {
  await page.locator('canvas').screenshot({ path: `${OUT}/${nazwa}.png` });
  console.log(`zrzut: ${OUT}/${nazwa}.png`);
};
const plotno = async (x, y) => {
  const r = await page.locator('canvas').boundingBox();
  await page.mouse.click(r.x + x, r.y + y);
};

await page.goto(`${BASE}/?ekran=mapa`, { waitUntil: 'domcontentloaded' });
await scena(page, 'adventure');

// 1. Zwykła gra: misja 1 prosto z `rozpocznijMisje`, okno warunków zamknięte,
//    kursor nad planszą, żeby było widać podpowiedź i znak kursora.
await startMisji(page, 'pierwsze-kroki', { trener: 'Janek', bonus: 0 });
await czekajNaNapis(page, 'adventure', 'Pierwsze kroki');
await klikPrzycisk(page, 'adventure', 'Do dzieła!');
await page.waitForTimeout(1800);
const r = await page.locator('canvas').boundingBox();
await page.mouse.move(r.x + 420, r.y + 250);
await page.waitForTimeout(500);
await zrzut('hud-mapa');

// 2. Okno skrzyni — wejście kliknięciami, jak w `probe-zwis.mjs`.
await zainstalujPodejdz(page);
const skrzynia = await page.evaluate(() => {
  const s = window.__game.scene.getScene('adventure');
  const o = window.__podejdz(s, (x) => x.rodzaj === 'skrzynia' && !x.artefakt && !x.zebrany);
  s.przeniesBohatera(s.stan.bohater.x, s.stan.bohater.y);
  s.wysrodkujNaBohaterze(false);
  return { x: o.x, y: o.y };
});
await page.waitForTimeout(500);
const punkt = await page.evaluate((p) => {
  const s = window.__game.scene.getScene('adventure');
  // Środek pola na ekranie macierzą kamery planszy (uwzględnia jej zoom).
  const e = s.kamera.matrixCombined.transformPoint(p.x * 48 + 24, p.y * 48 + 24, { x: 0, y: 0 });
  return { x: e.x, y: e.y };
}, skrzynia);
await plotno(punkt.x, punkt.y);
await page.waitForTimeout(300);
await plotno(punkt.x, punkt.y);
await czekajNaNapis(page, 'adventure', 'Skrzynia!');
await page.waitForTimeout(400);
await zrzut('hud-mapa-okno');
await page.evaluate(() => {
  // Wybór „pokeballe" — okno znika i nic nie zostaje po nim na scenie.
  const s = window.__game.scene.getScene('adventure');
  const c = s.children.list.find((o) => o.type === 'Container' && o.list?.some((t) => /pokeballi/.test(t.text ?? '')));
  c?.list.find((x) => x.type === 'Zone')?.emit('pointerdown');
  c?.list.find((x) => x.type === 'Zone')?.emit('pointerup');
});
await page.waitForTimeout(800);

// 3. Okno awansu: doświadczenie na próg poziomu 2 i odświeżenie panelu.
await page.evaluate(() => {
  const s = window.__game.scene.getScene('adventure');
  s.zajety = false;
  s.stan.bohater.doswiadczenie = Math.max(s.stan.bohater.doswiadczenie, 120);
  s.odswiezWszystko();
});
await page.waitForTimeout(1600);
await zrzut('hud-mapa-awans');

if (bledy.length) {
  console.log('BŁĘDY W KONSOLI:');
  for (const b of bledy) console.log('  ' + b);
}
await browser.close();
process.exit(bledy.length ? 1 : 0);
