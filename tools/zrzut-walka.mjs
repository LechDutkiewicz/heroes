// Zrzuty ekranu walki (bitwa pokazowa): start tury gracza i stan po
// zemdleniu jednego wroga. `--naPolu` — ilu wrogów (1–3); gracz ma zawsze dwa.
//
//   node tools/zrzut-walka.mjs [--url http://localhost:5210/] [--out tools/shots] [--naPolu 1|2|3] [--seed 7]
import { chromium } from 'playwright';
import { mkdir } from 'node:fs/promises';

const arg = (n, d) => (process.argv.indexOf(n) > 0 ? process.argv[process.argv.indexOf(n) + 1] : d);
const URL = arg('--url', 'http://localhost:5210/');
const OUT = arg('--out', 'tools/shots');
const NA_POLU = arg('--naPolu', '3');
const SEED = arg('--seed', '7');
await mkdir(OUT, { recursive: true });

const b = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || '/opt/pw-browsers/chromium' });
const page = await b.newPage({ viewport: { width: 960, height: 694 } });
const bledy = [];
page.on('pageerror', (e) => bledy.push(String(e)));
await page.goto(`${URL}?ekran=bitwa&seed=${SEED}&naPolu=${NA_POLU}`, { waitUntil: 'domcontentloaded' });
await page.waitForFunction(
  () => {
    const s = window.__game?.scene.getScene('battle');
    return s?.sys.settings.status === 5 && s.activeUnit()?.side === 'player' && !s.busy;
  },
  null,
  { timeout: 300000 }
);
await page.waitForTimeout(700);
const nazwa = `walka-2na${NA_POLU}`;
await page.locator('canvas').screenshot({ path: `${OUT}/${nazwa}-start.png` });
// Zwal jednego wroga, żeby zobaczyć omdlenie i drużyny pod planszą.
await page.evaluate(() => {
  const s = window.__game.scene.getScene('battle');
  const a = s.activeUnit();
  const cel = s.units.find((u) => u.side === 'enemy');
  cel.topHp = 1;
  s.resolveAttack(a, cel, { col: a.col, row: a.row });
});
// Czekamy na sam efekt, nie na zegar: bez karty graficznej gra chodzi
// kilkanaście razy wolniej niż w oknie.
await page.waitForFunction(
  () => {
    const s = window.__game.scene.getScene('battle');
    return !s.busy || s.gameOver;
  },
  null,
  { timeout: 300000 }
);
await page.waitForTimeout(300);
await page.locator('canvas').screenshot({ path: `${OUT}/${nazwa}-zmiennik.png` });
console.log('błędy strony:', bledy.length ? bledy : 'brak');
await b.close();
process.exit(bledy.length ? 1 : 0);
