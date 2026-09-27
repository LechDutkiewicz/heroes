// Zrzuty ekranów przebudowy „trener zamiast armii" (PROJEKT-TRENERZY.md):
// mapa z drużyną (poziomy, zemdlony), bitwa ze stadem (4 na polu, przerwy),
// karta stworka, powrót z EXP, miasto (rezerwaty, Trenuj) i ekran bohatera.
//
//   node tools/zrzut-trenerzy.mjs [--url http://localhost:5210] [--out tools/blind/]
import { chromium } from 'playwright';
const arg = (n, d) => {
  const i = process.argv.indexOf(n);
  return i !== -1 ? process.argv[i + 1] : d;
};
const BASE = arg('--url', 'http://localhost:5210');
const OUT = arg('--out', 'tools/blind/trenerzy-');
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
const page = await b.newPage({ viewport: { width: 960, height: 694 } });
const bledy = [];
page.on('pageerror', (e) => bledy.push(String(e)));
const scena = (n) => page.waitForFunction((x) => window.__game?.scene.getScene(x)?.sys.settings.status === 5, n, { timeout: 120000 });
await page.goto(`${BASE}/?ekran=mapa`, { waitUntil: 'domcontentloaded' });
await scena('adventure');
await page.waitForTimeout(1500);
// hover guard
await page.evaluate(() => {
  const s = window.__game.scene.getScene('adventure');
  // Pokazowo: jeden stworek wyżej, jeden zemdlony (wyszarzony).
  const a = s.stan.bohater.armia;
  a[1].omdlaly = true;
  a[0].poziom = 14;
});
await page.locator('canvas').screenshot({ path: OUT + 'z-mapa.png' });
// battle
await page.evaluate(() => {
  const s = window.__game.scene.getScene('adventure');
  const o = s.stan.obiekty.find((x) => x.rodzaj === 'potwor' && !x.zebrany && (x.oddzialy[0].ile > 1));
  const cel = o ?? s.stan.obiekty.find((x) => x.rodzaj === 'potwor' && !x.zebrany);
  s.stan.bohater.x = cel.x; s.stan.bohater.y = cel.y - 1; s.stan.bohater.ruch = 2000; s.zajety = false;
  s.idz([{ x: cel.x, y: cel.y, koszt: 100 }]);
});
await scena('battle');
await page.waitForTimeout(2500);
await page.locator('canvas').screenshot({ path: OUT + 'z-bitwa.png' });
// hover over first player unit for card
const poz = await page.evaluate(() => {
  const s = window.__game.scene.getScene('battle');
  const u = s.units.find((x) => x.side === 'enemy');
  return { x: u.container.x, y: u.container.y };
});
await page.mouse.move(poz.x, poz.y - 20);
await page.waitForTimeout(600);
await page.locator('canvas').screenshot({ path: OUT + 'z-bitwa-karta.png' });
await page.evaluate(() => window.__game.scene.getScene('battle').rozstrzygnijNatychmiast(true));
await scena('adventure');
await page.waitForTimeout(1600);
await page.locator('canvas').screenshot({ path: OUT + 'z-po-bitwie.png' });
// town
await page.evaluate(() => {
  const s = window.__game.scene.getScene('adventure');
  const z = s.stan.obiekty.find((x) => x.rodzaj === 'zamek' && x.wlasciciel === 'gracz');
  s.stan.bohater.x = z.x; s.stan.bohater.y = z.y;
  s.stan.skarbiec.pokeball = 500;
  s.otworzZamek ? s.otworzZamek(z) : null;
});
await page.waitForTimeout(500);
if (!(await page.evaluate(() => window.__game.scene.getScene('zamek')?.sys.settings.status === 5))) {
  await page.evaluate(() => {
    const s = window.__game.scene.getScene('adventure');
    const z = s.stan.obiekty.find((x) => x.rodzaj === 'zamek' && x.wlasciciel === 'gracz');
    s.registry.set('stan-mapy', s.stan); s.registry.set('otwarty-zamek', z.id); s.scene.start('zamek');
  });
}
await scena('zamek');
await page.waitForTimeout(2000);
await page.locator('canvas').screenshot({ path: OUT + 'z-miasto.png' });
await page.evaluate(() => { const t = window.__game.scene.getScene('zamek'); t.scene.start('bohater'); });
await scena('bohater');
await page.waitForTimeout(1500);
await page.locator('canvas').screenshot({ path: OUT + 'z-bohater.png' });
console.log('bledy JS:', bledy);
await b.close();
