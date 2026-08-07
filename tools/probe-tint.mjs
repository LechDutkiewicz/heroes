// Sonda diagnostyczna: czy barwienie (setTint) i tryby mieszania w Phaser 4
// w ogóle działają na teksturach efektów. Rysuje rząd próbek na pustej planszy.
import { chromium } from 'playwright';
const OUT = process.argv[2] || '/tmp/claude-0/-home-user-heroes/f2176f42-8776-5656-879a-9f5fca028b8e/scratchpad/fx';
const browser = await chromium.launch({
  executablePath: process.env.CHROMIUM_PATH || '/opt/pw-browsers/chromium-1194/chrome-linux/chrome',
});
const page = await browser.newPage({ viewport: { width: 1000, height: 900 }, deviceScaleFactor: 2 });
page.on('pageerror', (e) => console.error('BŁĄD:', e.message));
await page.goto('http://localhost:4173/?seed=7&terrain=laka', { waitUntil: 'load' });
await page.waitForFunction(() => window.__game?.scene.getScene('battle')?.sys.settings.status === 5, null, { timeout: 30000 });
await page.waitForTimeout(500);
await page.evaluate(() => {
  const s = window.__game.scene.getScene('battle');
  const P = { BlendModes: { NORMAL: 0, ADD: 1, SCREEN: 9 } };
  const modes = [P.BlendModes.NORMAL, P.BlendModes.ADD, P.BlendModes.SCREEN];
  const keys = ['fx_luna', 'fx_poswiata', 'fx_iskra'];
  keys.forEach((k, ki) =>
    modes.forEach((m, mi) => {
      const img = s.add
        .image(180 + mi * 220, 200 + ki * 150, k)
        .setDisplaySize(120, 120)
        .setTint(0xff3300)
        .setBlendMode(m);
      // Ta sama próbka, ale w warstwie efektów — sprawdzamy, czy to kontener
      // gubi tryb mieszania.
      const img2 = s.add
        .image(180 + mi * 220, 620 + ki * 150, k)
        .setDisplaySize(120, 120)
        .setTint(0xff3300)
        .setBlendMode(m);
      s.effectLayer.add(img2);
    })
  );
});
await page.waitForTimeout(400);
await page.locator('canvas').screenshot({ path: `${OUT}/tint.png` });
await browser.close();
console.log('ok');
