// Sonda tymczasowa: łapie SAM rozbłysk trafienia w kilku momentach.
// capture.mjs robi zrzut 04 dokładnie w chwili wywołania efektu (poświata ma
// wtedy alfę 0) i 05 dużo później, więc szczytu łuny nie widać w żadnym.
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
const shot = async (page, name) => {
  await page.locator('canvas').screenshot({ path: `${OUT}/${name}.png` });
  console.log('  →', name);
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
      try {
      const scene = window.__game.scene.getScene('battle');
      scene.time.timeScale = 0.12;
      scene.tweens.timeScale = 0.12;
      const a = scene.units.find((u) => u.side === 'player' && !u.def.shooter);
      const d = scene.units.find((u) => u.side === 'enemy');
      d.col = a.col + 1;
      d.row = a.row;
      const p = scene.cellToXY(d.col, d.row);
      d.container.setPosition(p.x, p.y);
      window.__trafienie = 0;
      scene.meleeLunge(a, d, () => {
        scene.resolveHit(a, d);
        window.__trafienie = 1;
      });
      } catch (e) { console.log('WYJATEK', e && e.message); }
    });
    await page.waitForFunction(() => window.__trafienie === 1, null, { timeout: 30000 });
    // 0.05 * 1000 ms zegara = 50 ms sceny na krok.
    for (const step of [1, 2, 3, 5, 8]) {
      await page.waitForTimeout(step === 1 ? 300 : 250);
      await freeze(page);
      await shot(page, `${terrain}-krok${step}`);
      await thaw(page);
    }
  }
  await browser.close();
};
main();
