import { chromium } from 'playwright';
const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
const page = await browser.newPage({ viewport: { width: 1000, height: 760 } });
page.on('pageerror', (e) => console.log('BŁĄD —', String(e)));
await page.goto('http://localhost:4173/?ekran=mapa', { waitUntil: 'domcontentloaded' });
await page.waitForFunction(() => window.__game?.scene.getScene('adventure')?.sys.settings.status === 5);
await page.waitForTimeout(900);
await page.evaluate(() => {
  const s = window.__game.scene.getScene('adventure');
  const z = s.stan.obiekty.find((o) => o.rodzaj === 'zamek' && o.nasz);
  for (let y = 0; y < s.stan.odkryte.length; y++) s.stan.odkryte[y].fill(true);
  s.malujMgle();
  s.stan.bohater.x = z.x - 2; s.stan.bohater.y = z.y + 2;
  s.bohaterObj.setPosition((z.x - 2) * 48 + 24, (z.y + 2) * 48 + 24);
  s.wysrodkujNa(z.x, z.y - 1, false);
});
await page.waitForTimeout(700);
await page.locator('canvas').screenshot({ path: 'tools/shots/zamek-na-mapie.png' });
await browser.close();
