// Zrzuty okien menu (rekordy, „Kto gra?") — `zrzut-menu.mjs` robi menu i autorów.
//   node tools/zrzut-menu-okna.mjs [--url http://localhost:4174] [--dir tools/shots]
import { chromium } from 'playwright';

const arg = (n, d) => {
  const i = process.argv.indexOf(n);
  return i !== -1 ? process.argv[i + 1] : d;
};
const BASE = arg('--url', 'http://localhost:4174');
const DIR = arg('--dir', 'tools/shots');

const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
const page = await browser.newPage({ viewport: { width: 960, height: 694 } });
page.on('pageerror', (e) => console.log('BŁĄD JS —', String(e)));
await page.goto(`${BASE}/`, { waitUntil: 'domcontentloaded' });
await page.evaluate(() => {
  localStorage.setItem('heroes-profile-v1', JSON.stringify({ v: 1, aktywny: 'p1', profile: [{ id: 'p1', imie: 'Ania', utworzony: 1 }, { id: 'p2', imie: 'Janek', utworzony: 2 }] }));
});
await page.reload({ waitUntil: 'domcontentloaded' });
await page.waitForFunction(() => window.__game?.scene.getScene('menu')?.gotowe === true, null, { timeout: 90000 });
await page.waitForTimeout(600);
for (const [nazwa, akcja] of [
  ['rekordy', (s) => s.otworzOkno('rekordy')],
  ['profile', (s) => s.otworzProfile()],
]) {
  await page.evaluate(`(${akcja.toString()})(window.__game.scene.getScene('menu'))`);
  await page.waitForTimeout(900);
  await page.screenshot({ path: `${DIR}/menu-okno-${nazwa}.png` });
  console.log(`zrzut: ${DIR}/menu-okno-${nazwa}.png`);
  await page.keyboard.press('Escape');
  await page.waitForTimeout(600);
}
await browser.close();
