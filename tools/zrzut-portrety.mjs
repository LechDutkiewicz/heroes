// Zrzuty portretów stworów w trzech miejscach interfejsu, w powtarzalnym
// stanie: rząd armii na ekranie bohatera, karta werbunku z załogą w mieście
// i sloty armii w panelu mapy. Kadry w rozdzielczości własnej (bez
// skalowania) — do porównania z portretami z Heroes 3 / HotA
// (`tools/reference/homm3/ref-portret-*.png`).
//
//   node tools/zrzut-portrety.mjs [--url http://localhost:4173] [--out tools/shots]
//
// Wynik: portrety-bohater.png, portrety-miasto.png, portrety-hud.png.

import { chromium } from 'playwright';
import { mkdir } from 'node:fs/promises';

const arg = (n, d) => {
  const i = process.argv.indexOf(n);
  return i !== -1 ? process.argv[i + 1] : d;
};
const BASE = arg('--url', 'http://localhost:4173');
const OUT = arg('--out', 'tools/shots');

/**
 * Armia pokazowa: sześć oddziałów Boru z dziurą w środku (slot 4). Jedna
 * frakcja, bo taka armia jest typowa, a pusty slot pokazuje, jak portret
 * odróżnia się od wolnego miejsca.
 */
const ARMIA = [
  ['00193', 'Pyroko', 24, 0],
  ['00020', 'Flamir', 9, 1],
  ['00218', 'Aquino', 6, 2],
  null,
  ['00030', 'Torrenar', 4, 3],
  ['00096', 'Verdiko', 3, 4],
  ['00227', 'Silvena', 1, 5],
].map((o) => (o ? { sprite: o[0], nazwa: o[1], ile: o[2], frakcja: 'bor', tier: o[3] } : null));

const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
const page = await browser.newPage({ viewport: { width: 960, height: 694 }, deviceScaleFactor: 1 });
const bledy = [];
page.on('pageerror', (e) => bledy.push(String(e)));
page.on('requestfinished', async (r) => {
  const res = await r.response();
  if (res && res.status() >= 400) bledy.push(`${res.status()} ${r.url()}`);
});
await mkdir(OUT, { recursive: true });

const scena = (n) =>
  page.waitForFunction((x) => window.__game?.scene.getScene(x)?.sys.settings.status === 5, n, {
    timeout: 90000,
  });
/** Kadr płótna w pikselach gry (płótno stoi w lewym górnym rogu strony). */
const kadr = async (nazwa, x, y, w, h) => {
  const r = await page.locator('canvas').boundingBox();
  await page.screenshot({ path: `${OUT}/${nazwa}.png`, clip: { x: r.x + x, y: r.y + y, width: w, height: h } });
  console.log(`zapisano ${OUT}/${nazwa}.png`);
};

await page.goto(`${BASE}/?ekran=mapa`, { waitUntil: 'domcontentloaded' });
await scena('adventure');
await page.waitForTimeout(600);

// Armia do stanu i odświeżenie panelu (sceny przeczytają ją z rejestru).
// Tekstury portretów ładuje `preload` — dlatego mapa startuje od nowa.
await page.evaluate((armia) => {
  const gra = window.__game;
  const s = gra.scene.getScene('adventure');
  s.stan.bohater.armia = armia.map((o) => (o ? { ...o } : null));
  gra.registry.set('stan-mapy', s.stan);
  s.scene.restart();
}, ARMIA);
await page.waitForTimeout(400);
await scena('adventure');
await page.waitForTimeout(1500);

// 1. HUD mapy: karta bohatera z rzędem slotów. Kadr liczony z położenia
//    slotów, żeby przesunięcie panelu nie psuło zrzutu.
const hud = await page.evaluate(() => {
  const s = window.__game.scene.getScene('adventure');
  const pierwszy = s.slotyArmii[0];
  const ostatni = s.slotyArmii[s.slotyArmii.length - 1];
  return { x: pierwszy.x, y: pierwszy.y, x2: ostatni.x + 28 };
});
await kadr('portrety-hud', Math.round(hud.x - 16), Math.round(hud.y - 96), Math.round(hud.x2 - hud.x + 32), 150);

// 2. Ekran bohatera: pas armii.
await page.evaluate(() => {
  const gra = window.__game;
  gra.registry.set('stan-mapy', gra.scene.getScene('adventure').stan);
  gra.scene.getScene('adventure').scene.start('bohater');
});
await scena('bohater');
await page.waitForTimeout(900);
await kadr('portrety-bohater', 20, 460, 920, 180);

// 3. Miasto: wejście bohaterem do zamku, karta siedliska drugiego poziomu.
await page.evaluate(() => {
  const gra = window.__game;
  gra.scene.getScene('bohater').scene.start('adventure');
});
await scena('adventure');
await page.waitForTimeout(800);
await page.evaluate(() => {
  const s = window.__game.scene.getScene('adventure');
  const z = s.stan.obiekty.find((o) => o.rodzaj === 'zamek' && o.wlasciciel === 'gracz');
  z.frakcjaZamku = 'bor';
  z.postawione = ['ratusz1', 'ratusz2', 'fort', 'siedlisko1', 'siedlisko2', 'siedlisko3', 'siedlisko5'];
  z.dostepne = [6, 4, 3, 0, 2, 0];
  Object.assign(s.stan.skarbiec, { pokeball: 140, jagoda: 22, kamien: 6, odlamek: 24 });
  s.stan.bohater.x = z.x;
  s.stan.bohater.y = z.y - 1;
  s.stan.bohater.ruch = 3000;
  s.zajety = false;
  s.idz([{ x: z.x, y: z.y, koszt: 100 }]);
});
await scena('zamek');
await page.waitForTimeout(800);
await page.evaluate(() => {
  const s = window.__game.scene.getScene('zamek');
  s.pokazBudynek(s.profil.budynki.find((b) => b.id === 'siedlisko2'));
});
await page.waitForTimeout(1500);
const r = await page.locator('canvas').boundingBox();
await kadr('portrety-miasto', 0, Math.round(r.height - 290), 640, 290);

if (bledy.length) console.log('BŁĘDY:\n' + bledy.join('\n'));
await browser.close();
