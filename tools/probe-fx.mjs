// Sonda: sam rozbłysk trafienia, w środku planszy i w kilku momentach życia.
//
// capture.mjs łapie zrzut 04 dokładnie w chwili wywołania efektu (poświata ma
// wtedy jeszcze alfę 0), a 05 długo po nim — szczytu łuny nie widać w żadnym.
// Tutaj wołamy impactBurst wprost przez scenę, w pustym środku planszy, żeby
// nic nie zasłaniało światła, i tniemy klatkę do samej planszy.
import { chromium } from 'playwright';
import { mkdir } from 'node:fs/promises';

const OUT = process.argv[2] || '/tmp/claude-0/-home-user-heroes/f2176f42-8776-5656-879a-9f5fca028b8e/scratchpad/fx';
const BASE = 'http://localhost:4173';

const ready = async (page) => {
  await page.waitForFunction(() => {
    const g = window.__game;
    return g && g.scene.getScene('battle')?.sys.settings.status === 5;
  }, null, { timeout: 30000 });
  await page.waitForTimeout(400);
};
const freeze = (p) => p.evaluate(() => window.__game.scene.pause('battle'));
const thaw = (p) => p.evaluate(() => window.__game.scene.resume('battle'));

const main = async () => {
  await mkdir(OUT, { recursive: true });
  const browser = await chromium.launch({
    executablePath: process.env.CHROMIUM_PATH || '/opt/pw-browsers/chromium-1194/chrome-linux/chrome',
  });
  const page = await browser.newPage({ viewport: { width: 1000, height: 900 }, deviceScaleFactor: 2 });
  page.on('pageerror', (e) => console.error('BŁĄD STRONY:', e.message, e.stack));
  page.on('console', (m) => console.log('KONSOLA:', m.type(), m.text()));

  for (const terrain of ['laka', 'snieg']) {
    await page.goto(`${BASE}/?seed=7&terrain=${terrain}`, { waitUntil: 'load' });
    await ready(page);
    await page.evaluate(() => {
      const scene = window.__game.scene.getScene('battle');
      scene.time.timeScale = 0.1;
      scene.tweens.timeScale = 0.1;
      // Przestawiamy cel na puste pole w środku planszy — chodzi o samo
      // światło, więc nic nie może go zasłaniać ani mieszać się z plakietkami.
      const a = scene.units.find((u) => u.side === 'player' && !u.def.shooter);
      const d = scene.units.find((u) => u.side === 'enemy');
      d.col = 4;
      d.row = 3;
      const p = scene.cellToXY(d.col, d.row);
      d.container.setPosition(p.x, p.y);
      scene.resolveHit(a, d);
    });
    // Przy spowolnieniu 0.1 każde 250 ms zegara to 25 ms sceny. Kroki rosną
    // wykładniczo, bo rozbłysk narasta w 70 ms, a iskry lecą jeszcze pół sekundy.
    for (const step of [1, 2, 4, 8, 16]) {
      await page.waitForTimeout(step * 250);
      await freeze(page);
      const b = await page.locator('canvas').boundingBox();
      await page.screenshot({
        path: `${OUT}/${terrain}-krok${step}.png`,
        clip: { x: b.x + 48, y: b.y + 86, width: 866, height: 536 },
      });
      console.log('  →', `${terrain}-krok${step}`);
      await thaw(page);
    }
  }
  await browser.close();
};
main();
