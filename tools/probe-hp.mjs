// Zrzut oddziałów z NADSZARPNIĘTYM życiem.
//
// Po co osobno: wszystkie zrzuty startowe pokazują oddziały ze 100% HP,
// a przy pełnym pasku zielone wypełnienie zajmuje całą strefę i ciemne
// koryto jest niewidoczne. Krytyk oceniający modelowanie paska nie miał
// czego oglądać — trzy rundy z rzędu.
//
//   node tools/probe-hp.mjs [--url http://localhost:4188] [--out tools/shots-clean]

import { chromium } from 'playwright';
import { mkdir } from 'node:fs/promises';

const arg = (n, d) => {
  const i = process.argv.indexOf(n);
  return i !== -1 ? process.argv[i + 1] : d;
};
const BASE = arg('--url', 'http://localhost:4188');
const OUT = arg('--out', 'tools/shots-clean');

const main = async () => {
  await mkdir(OUT, { recursive: true });
  const browser = await chromium.launch({
    executablePath: process.env.CHROMIUM_PATH || '/opt/pw-browsers/chromium-1194/chrome-linux/chrome',
  });
  const page = await browser.newPage({ viewport: { width: 1000, height: 900 }, deviceScaleFactor: 2 });
  page.on('pageerror', (e) => console.error('BŁĄD STRONY:', e.message));

  await page.goto(`${BASE}/?seed=7&terrain=laka`, { waitUntil: 'load' });
  await page.waitForFunction(
    () => window.__game?.scene.getScene('battle')?.sys.settings.status === 5,
    null,
    { timeout: 30000 }
  );
  await page.waitForTimeout(400);

  // Różne poziomy życia naraz: pełny, wysoki, średni, niski. Dzięki temu
  // w jednym kadrze widać wszystkie trzy progi barwy i koryto.
  await page.evaluate(() => {
    const scene = window.__game.scene.getScene('battle');
    const ulamki = [1, 0.72, 0.45, 0.18, 0.6, 0.33];
    scene.units.forEach((u, i) => {
      const f = ulamki[i % ulamki.length];
      const pelne = u.def.count * u.def.hp;
      const zostalo = Math.max(1, Math.round(pelne * f));
      u.count = Math.max(1, Math.ceil(zostalo / u.def.hp));
      u.topHp = zostalo - (u.count - 1) * u.def.hp || u.def.hp;
      scene.refreshStack(u);
    });
    // Zatrzymaj oddech, żeby zrzut był powtarzalny między rundami.
    scene.tweens.timeScale = 0;
  });
  await page.waitForTimeout(300);

  const b = await page.locator('canvas').boundingBox();
  await page.screenshot({
    path: `${OUT}/11-oddzialy-ranne.png`,
    clip: { x: b.x + 40, y: b.y + 90, width: 300, height: 260 },
  });
  console.log(`  → ${OUT}/11-oddzialy-ranne.png`);

  await browser.close();
};

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
