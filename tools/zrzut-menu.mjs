// Zrzuty menu głównego: widok startowy, podmenu „Nowa gra", okno rekordów
// i okno autorów. Wszystko PRAWDZIWĄ myszą w miejsca desek — jeśli deska
// nie przyjmuje kliknięcia, zrzut podmenu pokaże to od razu (zostanie menu
// główne), zamiast udawać sukces wywołaniem metody sceny.
//
//   node tools/zrzut-menu.mjs [--url http://localhost:4174] [--dir tools/shots]
//
// Czysta przeglądarka (bez zapisu, bez kampanii), więc „Wczytaj" jest
// wyszarzone — tak zobaczy menu dziecko przy pierwszym uruchomieniu.
// `--z-zapisem` wkłada przedtem przykładowy postęp kampanii i rekord, żeby
// obejrzeć także stan z danymi (menu-zapis.png, menu-rekordy-zapis.png).

import { chromium } from 'playwright';
import { mkdir } from 'node:fs/promises';

const arg = (n, d) => {
  const i = process.argv.indexOf(n);
  return i !== -1 ? process.argv[i + 1] : d;
};
const BASE = arg('--url', 'http://localhost:4174');
const DIR = arg('--dir', 'tools/shots');
const Z_ZAPISEM = process.argv.includes('--z-zapisem');

// Środki desek w układzie płótna — muszą się zgadzać z DESKI/SLUP
// w src/scenes/MenuScene.ts (x = lewy koniec deski + ok. połowa szerokości).
const DESKA = [
  { x: 260, y: 392 },
  { x: 250, y: 464 },
  { x: 250, y: 530 },
  { x: 250, y: 596 },
];

const browser = await chromium.launch({
  executablePath: process.env.CHROMIUM_PATH || '/opt/pw-browsers/chromium-1194/chrome-linux/chrome',
});
const page = await browser.newPage({ viewport: { width: 1000, height: 760 }, deviceScaleFactor: 1 });

const bledy = [];
page.on('pageerror', (e) => bledy.push(`pageerror: ${e.message}`));
page.on('console', (m) => m.type() === 'error' && bledy.push(`console: ${m.text()}`));
page.on('response', (r) => r.status() >= 400 && bledy.push(`${r.status()}: ${r.url()}`));

await mkdir(DIR, { recursive: true });

if (Z_ZAPISEM) {
  await page.goto(`${BASE}/?ekran=bitwa`, { waitUntil: 'domcontentloaded' });
  await page.evaluate(() => {
    localStorage.setItem(
      'heroes-kampania-v1',
      JSON.stringify({
        kampania: 'ksiezycowa-grota',
        trener: 'Ania',
        ukonczone: ['pierwsze-kroki'],
        wyniki: { 'pierwsze-kroki': { dni: 18, punkty: 745 } },
      })
    );
    localStorage.setItem(
      'heroes-rekordy-v1',
      JSON.stringify([{ imie: 'Ania', punkty: 2810, dni: 83, data: '2026-09-20' }])
    );
  });
}

await page.goto(`${BASE}/`, { waitUntil: 'domcontentloaded' });
await page.waitForFunction(() => window.__game?.scene.getScene('menu')?.gotowe === true, null, {
  timeout: 30000,
});
// Dym, pyłek i liście startują z `advance`, ale błyski i ptaki potrzebują
// chwili — zrzut w pierwszej klatce po wejściu byłby martwszy niż menu.
await page.waitForTimeout(1500);

const canvas = await page.$('canvas');
const box = await canvas.boundingBox();
const klik = async (d) => {
  await page.mouse.move(box.x + d.x, box.y + d.y, { steps: 4 });
  await page.waitForTimeout(150);
  await page.mouse.click(box.x + d.x, box.y + d.y);
};
const zrzut = async (nazwa) => {
  await canvas.screenshot({ path: `${DIR}/${nazwa}` });
  console.log(`zrzut: ${DIR}/${nazwa}`);
};

// Mysz poza deskami — widok bez wskazania, z „zaproszeniem" przy Nowej grze.
await page.mouse.move(box.x + 700, box.y + 300);
await zrzut(Z_ZAPISEM ? 'menu-zapis.png' : 'menu.png');

// Wskazanie myszą — złota deska.
await page.mouse.move(box.x + DESKA[2].x, box.y + DESKA[2].y, { steps: 4 });
await page.waitForTimeout(400);
await zrzut('menu-wskazanie.png');

// Nowa gra → podmenu (deski się obracają), mysz zostaje na „Kampanii".
await klik(DESKA[0]);
await page.waitForTimeout(900);
await zrzut('menu-nowa-gra.png');
await page.keyboard.press('Escape');
await page.waitForTimeout(900);

await klik(DESKA[2]);
await page.waitForTimeout(900);
await zrzut(Z_ZAPISEM ? 'menu-rekordy-zapis.png' : 'menu-rekordy.png');
await page.keyboard.press('Escape');
await page.waitForTimeout(700);

await klik(DESKA[3]);
await page.waitForTimeout(900);
await zrzut('menu-autorzy.png');
await page.keyboard.press('Escape');
await page.waitForTimeout(700);

// Klawiatura: strzałka w dół dwa razy i Enter = „Rekordy" przy wyszarzonym
// „Wczytaj" (pomija nieczynną deskę). Sprawdzamy tylko, że okno się otwiera.
await page.mouse.move(box.x + 700, box.y + 300);
await page.keyboard.press('ArrowDown');
await page.keyboard.press('ArrowDown');
await page.waitForTimeout(200);
await page.keyboard.press('Enter');
await page.waitForTimeout(700);
await zrzut('menu-klawiatura.png');

if (Z_ZAPISEM) {
  await page.evaluate(() => {
    localStorage.removeItem('heroes-kampania-v1');
    localStorage.removeItem('heroes-rekordy-v1');
  });
}

if (bledy.length) {
  console.log('BŁĘDY W KONSOLI:');
  for (const b of bledy) console.log('  ' + b);
}
await browser.close();
process.exit(bledy.length ? 1 : 0);
