// Zrzut ekranu miasta w powtarzalnym stanie.
//
// Po co osobne narzędzie: `capture.mjs` zna tylko bitwę, a `zrzut-mapa.mjs`
// tylko planszę przygody. Do porównań z wzorcem potrzebny jest ekran miasta
// zawsze w TYM SAMYM stanie — inaczej dwie rundy różnią się nie rzemiosłem,
// tylko tym, ile budynków akurat stało.
//
//   node tools/zrzut-miasto.mjs [--frakcja bor] [--out tools/shots/miasto.png]
//                               [--budynki wszystkie|start] [--url http://localhost:4173]

import { chromium } from 'playwright';

const arg = (n, d) => {
  const i = process.argv.indexOf(n);
  return i !== -1 ? process.argv[i + 1] : d;
};
const BASE = arg('--url', 'http://localhost:4173');
const FRAKCJA = arg('--frakcja', 'bor');
const OUT = arg('--out', 'tools/shots/miasto.png');
const BUDYNKI = arg('--budynki', 'wszystkie');

/**
 * Stan pokazowy: miasto w połowie rozbudowy. Nie pełne i nie puste —
 * na pełnym nie widać zarysów, a na pustym nie widać miasta.
 */
const POSTAWIONE = {
  wszystkie: ['ratusz1', 'ratusz2', 'fort', 'siedlisko1', 'siedlisko2', 'siedlisko3', 'siedlisko5'],
  start: ['ratusz1', 'siedlisko1', 'siedlisko2'],
};

const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
const page = await browser.newPage({ viewport: { width: 1000, height: 760 } });
page.on('pageerror', (e) => console.log('BŁĄD JS —', String(e)));

const scena = (n) =>
  page.waitForFunction(
    (x) => window.__game?.scene.getScene(x)?.sys.settings.status === 5,
    n,
    { timeout: 90000 }
  );

await page.goto(`${BASE}/?ekran=mapa`, { waitUntil: 'domcontentloaded' });
await scena('adventure');
await page.waitForTimeout(800);

await page.evaluate(
  ([frakcja, postawione]) => {
    const s = window.__game.scene.getScene('adventure');
    const z = s.stan.obiekty.find((o) => o.rodzaj === 'zamek' && o.nasz);
    z.frakcjaZamku = frakcja;
    z.nazwa = { bor: 'Bór Szmaragdowy', grota: 'Grota Księżycowa', zbocze: 'Zbocze Popielne' }[
      frakcja
    ];
    z.postawione = postawione;
    z.dostepne = [6, 4, 3, 0, 2, 0];
    Object.assign(s.stan.skarbiec, { pokeball: 140, jagoda: 22, kamien: 6, odlamek: 24 });
    s.stan.bohater.x = z.x;
    s.stan.bohater.y = z.y - 1;
    s.stan.bohater.ruch = 3000;
    s.zajety = false;
    s.idz([{ x: z.x, y: z.y, koszt: 100 }]);
  },
  [FRAKCJA, POSTAWIONE[BUDYNKI] ?? POSTAWIONE.wszystkie]
);

await scena('zamek');
// Gwiazdki nad budynkami falują tweenem — bez odczekania łapiemy je w losowej
// fazie i dwa zrzuty tej samej wersji różnią się bez powodu.
await page.waitForTimeout(1800);
await page.locator('canvas').screenshot({ path: OUT });
console.log(`zapisano ${OUT}`);
await browser.close();
