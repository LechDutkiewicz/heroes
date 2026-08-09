// Sprawdza, co widać po najechaniu na wroga W ZASIĘGU ataku.
import { chromium } from 'playwright';
const browser = await chromium.launch({
  executablePath: process.env.CHROMIUM_PATH || '/opt/pw-browsers/chromium-1194/chrome-linux/chrome',
});
const page = await browser.newPage({ viewport: { width: 1000, height: 760 }, deviceScaleFactor: 2 });
await page.goto('http://localhost:4173/?seed=7', { waitUntil: 'domcontentloaded' });
await page.waitForFunction(
  () => window.__game?.scene.getScene('battle')?.sys.settings.status === 5,
  null, { timeout: 30000 }
);
// Stawiamy wroga tuż obok oddziału gracza, żeby na pewno był w zasięgu.
const gdzie = await page.evaluate(() => {
  const s = window.__game.scene.getScene('battle');
  const a = s.activeUnit();
  const d = s.units.find((u) => u.side !== a.side);
  d.col = a.col + 1; d.row = a.row;
  const p = s.cellToXY(d.col, d.row);
  d.container.setPosition(p.x, p.y);
  s.onUnitHover(d);
  return { x: p.x, y: p.y, kartaWidoczna: s.card.visible, wrog: d.def.name };
});
console.log(JSON.stringify(gdzie));
await page.waitForTimeout(500);
await page.locator('canvas').screenshot({ path: 'tools/shots/13-najechanie-wrog.png' });
await browser.close();
