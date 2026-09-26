// Zrzut miasta z blokiem armii w powtarzalnym stanie (do ślepego porównania):
// bohater w zamku z czterema oddziałami, garnizon z dziurą, kilka siedlisk
// i fort (przyrost tygodniowy ma co pokazać). Płótno 960 × 695.
//
//   node tools/zrzut-miasto-armia.mjs [--out tools/blind/miasto-armia-r2.png] [--url http://localhost:5219]
//                                     [--poza]  (bohater poza zamkiem)

import { chromium } from 'playwright';

const arg = (n, d) => {
  const i = process.argv.indexOf(n);
  return i !== -1 ? process.argv[i + 1] : d;
};
const BASE = arg('--url', 'http://localhost:4173');
const OUT = arg('--out', 'tools/shots/miasto-armia.png');
const POZA = process.argv.includes('--poza');

const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
const page = await browser.newPage({ viewport: { width: 1000, height: 760 } });
page.on('pageerror', (e) => console.log('BŁĄD JS —', String(e)));
const scena = (n) =>
  page.waitForFunction((x) => window.__game?.scene.getScene(x)?.sys.settings.status === 5, n, { timeout: 90000 });

await page.goto(`${BASE}/?ekran=mapa`, { waitUntil: 'domcontentloaded' });
await scena('adventure');
await page.waitForTimeout(600);
await page.evaluate(() => {
  const s = window.__game.scene.getScene('adventure');
  const z = s.stan.obiekty.find((o) => o.rodzaj === 'zamek' && o.wlasciciel === 'gracz');
  z.postawione = ['ratusz1', 'ratusz2', 'fort', 'siedlisko1', 'siedlisko2', 'siedlisko3', 'siedlisko5'];
  z.dostepne = [6, 4, 3, 0, 2, 0];
  Object.assign(s.stan.skarbiec, { pokeball: 394, jagoda: 22, kamien: 6, odlamek: 24 });
  s.stan.bohater.x = z.x;
  s.stan.bohater.y = z.y - 1;
  s.stan.bohater.ruch = 3000;
  s.zajety = false;
  s.idz([{ x: z.x, y: z.y, koszt: 100 }]);
});
await scena('zamek');
await page.waitForTimeout(600);
await page.evaluate((poza) => {
  const t = window.__game.scene.getScene('zamek');
  if (poza) t.stan.bohater.x -= 3;
  const f = (i, ile) => {
    const u = t.frakcja.units[i];
    return { sprite: u.sprite, nazwa: u.name, ile, frakcja: t.frakcja.id, tier: i };
  };
  const b = t.stan.bohater.armia;
  [f(0, 20), f(1, 9), f(2, 6), f(3, 4), null, null, null].forEach((o, i) => (b[i] = o));
  const g = t.zamek.garnizon;
  [f(0, 18), null, f(2, 12), f(4, 3), null, null, null].forEach((o, i) => (g[i] = o));
  t.scene.restart();
}, POZA);
await page.waitForTimeout(300);
await scena('zamek');
await page.waitForTimeout(1500);
await page.locator('canvas').screenshot({ path: OUT });
console.log('zapisano', OUT);
await browser.close();
