// Zrzuty paska ataków w bitwie: pasek w turze gracza, wybrany atak 2,
// prognoza dla wybranego ataku, napis „X używa: Y!" i karta z atakami.
// Użycie: node tools/zrzut-ataki.mjs [--url http://localhost:5210/] [--out katalog]
import { chromium } from 'playwright';
const arg = (n, d) => (process.argv.indexOf(n) > 0 ? process.argv[process.argv.indexOf(n) + 1] : d);
const URL = arg('--url', 'http://localhost:5210/') + '?ekran=bitwa&seed=7';
const OUT = arg('--out', 'tools/shots') + '/';
const b = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || '/opt/pw-browsers/chromium' });
const page = await b.newPage({ viewport: { width: 960, height: 694 } });
const bledy = [];
page.on('pageerror', (e) => bledy.push(String(e)));
await page.goto(URL, { waitUntil: 'domcontentloaded' });
await page.waitForFunction(() => window.__game?.scene.getScene('battle')?.sys.settings.status === 5, null, { timeout: 400000 });
const turaGracza = () =>
  page.waitForFunction(
    () => {
      const s = window.__game.scene.getScene('battle');
      const a = s.activeUnit();
      return a && a.side === 'player' && !s.busy;
    },
    null,
    { timeout: 400000 }
  );
await turaGracza();
// Stworek po ewolucji, żeby było widać trzeci atak.
await page.evaluate(() => {
  const s = window.__game.scene.getScene('battle');
  const a = s.activeUnit();
  a.def = { ...a.def, etap: 1 };
  a.pp = [null, a.pp[1], 1];
  s.odswiezAtaki();
});
await page.waitForTimeout(800);
await page.locator('canvas').screenshot({ path: OUT + 'ataki-pasek.png' });
await page.keyboard.press('2');
await page.waitForTimeout(400);
await page.locator('canvas').screenshot({ path: OUT + 'ataki-wybrany.png' });
const cel = await page.evaluate(() => {
  const s = window.__game.scene.getScene('battle');
  const a = s.activeUnit();
  const w = s.units.find((u) => u.side !== a.side);
  // Wróg tuż obok — prognoza i atak bez podchodzenia.
  w.col = a.col + 1;
  w.row = a.row;
  const p = s.cellToXY(w.col, w.row);
  w.container.setPosition(p.x, p.y);
  s.showOptions(a);
  s.onUnitHover(w);
  return { id: w.id };
});
await page.waitForTimeout(500);
await page.locator('canvas').screenshot({ path: OUT + 'ataki-prognoza.png' });
await page.evaluate((c) => {
  const s = window.__game.scene.getScene('battle');
  s.attackTarget(s.activeUnit(), s.units.find((u) => u.id === c.id));
}, cel);
await page.waitForTimeout(350);
await page.locator('canvas').screenshot({ path: OUT + 'ataki-uzywa.png' });
console.log('bledy', bledy);
await b.close();
