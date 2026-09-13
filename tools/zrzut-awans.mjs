// Zrzut okna awansu w powtarzalnym stanie.
//
// Osobno od `zrzut-bohater.mjs`, bo to okno żyje na scenie MAPY, a nie na
// ekranie bohatera — i pokazuje się tylko po wygranej bitwie, która przekroczy
// próg doświadczenia. Ustawiamy więc próg z zewnątrz i wygrywamy bitwę drogą
// gry, zamiast wołać okno wprost: gdyby dało się je pokazać z pominięciem
// bitwy, zrzut nie dowodziłby, że gracz kiedykolwiek je zobaczy.
//
//   node tools/zrzut-awans.mjs [--out tools/shots/awans.png] [--skala 2]

import { chromium } from 'playwright';

const arg = (n, d) => {
  const i = process.argv.indexOf(n);
  return i !== -1 ? process.argv[i + 1] : d;
};
const BASE = arg('--url', 'http://localhost:4173');
const OUT = arg('--out', 'tools/shots/awans.png');
const SKALA = Number(arg('--skala', '1'));

const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
const page = await browser.newPage({
  viewport: { width: 960, height: 694 },
  deviceScaleFactor: SKALA,
});
page.on('pageerror', (e) => console.log('BŁĄD JS —', String(e)));

const scena = (n) =>
  page.waitForFunction((x) => window.__game?.scene.getScene(x)?.sys.settings.status === 5, n, {
    timeout: 90000,
  });

await page.goto(`${BASE}/?ekran=mapa`, { waitUntil: 'domcontentloaded' });
await scena('adventure');
await page.waitForTimeout(700);

await page.evaluate(() => {
  const s = window.__game.scene.getScene('adventure');
  const b = s.stan.bohater;
  b.doswiadczenie = 95;
  // Jedna umiejętność na start, żeby w ofercie stanęły obok siebie obie karty:
  // nowa i ulepszenie. Pusty bohater dostaje dwie nowe i nie widać różnicy
  // między wstążkami.
  b.umiejetnosci = { zwiad: 1 };
  const o = s.stan.obiekty.find((x) => x.rodzaj === 'potwor' && !x.zebrany);
  b.x = o.x;
  b.y = o.y - 1;
  b.ruch = 2000;
  s.zajety = false;
  s.idz([{ x: o.x, y: o.y, koszt: 100 }]);
});
await page.waitForTimeout(1400);
await scena('battle');
await page.evaluate(() => window.__game.scene.getScene('battle').rozstrzygnijNatychmiast(true));
await scena('adventure');
await page.waitForFunction(() => window.__game.scene.getScene('adventure').zajety === true, null, {
  timeout: 15000,
});
await page.waitForTimeout(2800);

await page.screenshot({ path: OUT });
console.log(`zapisano ${OUT}`);
await browser.close();
