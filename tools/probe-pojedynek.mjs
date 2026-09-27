// Pojedynek trenerów w przeglądarce: podejście do rywala uruchamia bitwę,
// wygrana wraca na mapę, gracz dostaje pokeballe, rywal wraca do swojej sali.
// Użycie: node tools/probe-pojedynek.mjs [--url http://localhost:5210/]
import { chromium } from 'playwright';
const arg = process.argv.indexOf('--url');
const URL = (arg > 0 ? process.argv[arg + 1] : 'http://localhost:5210/') + '?ekran=mapa';
const b = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || '/opt/pw-browsers/chromium' });
const page = await b.newPage({ viewport: { width: 960, height: 694 } });
const bledy = [];
page.on('pageerror', (e) => bledy.push(String(e)));
const scena = (n) => page.waitForFunction((x) => window.__game?.scene.getScene(x)?.sys.settings.status === 5, n, { timeout: 400000 });
await page.goto(URL, { waitUntil: 'domcontentloaded' });
await scena('adventure');
await page.waitForTimeout(1500);
const przed = await page.evaluate(() => {
  const s = window.__game.scene.getScene('adventure');
  const b = s.stan.bohater;
  s.stan.wrogBohater.x = b.x + 2;
  s.stan.wrogBohater.y = b.y;
  s.stan.wrogBohater.armia.forEach((o) => { if (o) delete o.omdlaly; });
  b.ruch = 2000;
  s.zajety = false;
  const pb = s.stan.skarbiec.pokeball;
  s.idz([{ x: b.x + 1, y: b.y, koszt: 100 }, { x: b.x + 2, y: b.y, koszt: 100 }]);
  return { pb, rywalPb: s.stan.wrogSkarbiec.pokeball };
});
await scena('battle');
await page.waitForTimeout(1500);
await page.evaluate(() => window.__game.scene.getScene('battle').rozstrzygnijNatychmiast(true));
await scena('adventure');
await page.waitForTimeout(2000);
const po = await page.evaluate(() => {
  const s = window.__game.scene.getScene('adventure').stan;
  const w = s.wrogBohater;
  const b = s.bohater;
  return {
    pb: s.skarbiec.pokeball,
    rywalObokGracza: Math.abs(w.x - b.x) <= 2 && Math.abs(w.y - b.y) <= 2,
    rywalRuch: w.ruch,
  };
});
const zle = [];
if (po.pb <= przed.pb) zle.push(`brak nagrody: ${przed.pb} → ${po.pb}`);
if (po.rywalObokGracza) zle.push('rywal nie wrócił do swojej sali');
if (bledy.length) zle.push('błędy strony: ' + bledy.join(' | '));
console.log('przed', przed, 'po', po);
console.log(zle.length ? 'ŹLE:\n' + zle.join('\n') : 'OK — pojedynek: bitwa, nagroda, powrót rywala');
await b.close();
process.exit(zle.length ? 1 : 0);
