// Zrzuty przebiegu misji: okno warunków, zwycięstwo, porażka, zakończenie
// kampanii i Sala sław. Stan ustawiany przez `window.__game` i most
// `__kampania`, bez klikania przez całą grę.
//
//   node tools/zrzut-wynik.mjs [--url http://localhost:4173] [--out tools/shots]

import { chromium } from 'playwright';
import { mkdir } from 'node:fs/promises';
import {
  KLUCZ_REKORDOW,
  POSTEP_PRZED_OSTATNIA,
  czekajNaNapis,
  klikPrzycisk,
  scena,
  startMisji,
  wymusPorazke,
  wymusWygrana,
} from './wynik-wspolne.mjs';

const arg = (n, d) => {
  const i = process.argv.indexOf(n);
  return i !== -1 ? process.argv[i + 1] : d;
};
const BASE = arg('--url', 'http://localhost:4173');
const OUT = arg('--out', 'tools/shots');

const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome' });
const page = await browser.newPage({ viewport: { width: 1000, height: 760 }, deviceScaleFactor: 1 });
const bledy = [];
page.on('pageerror', (e) => bledy.push(String(e)));
page.on('console', (m) => m.type() === 'error' && bledy.push(m.text()));
page.on('requestfinished', async (r) => {
  const res = await r.response();
  if (res && res.status() >= 400) bledy.push(`${res.status()} ${r.url()}`);
});

await mkdir(OUT, { recursive: true });
/**
 * Zrzut banera na mapie z zatrzymanym zegarem sceny. Baner żyje ~3 s czasu
 * gry, a zrzut płótna w przeglądarce bez GPU potrafi trwać dłużej — bez
 * pauzy łapał już ściemnienie i ekran wyniku.
 */
const zrzutZPauza = async (nazwa) => {
  await page.evaluate(() => {
    const s = window.__game.scene.getScene('adventure');
    s.tweens.pauseAll();
    s.time.paused = true;
  });
  await zrzut(nazwa);
  await page.evaluate(() => {
    const s = window.__game.scene.getScene('adventure');
    s.tweens.resumeAll();
    s.time.paused = false;
  });
};
const zrzut = async (nazwa) => {
  await page.locator('canvas').screenshot({ path: `${OUT}/${nazwa}.png` });
  console.log(`zrzut: ${OUT}/${nazwa}.png`);
};

await page.goto(`${BASE}/?ekran=mapa`, { waitUntil: 'domcontentloaded' });
await scena(page, 'adventure');
await page.evaluate((k) => localStorage.removeItem(k), KLUCZ_REKORDOW);

// 1. Warunki misji na starcie misji 1.
await startMisji(page, 'pierwsze-kroki', { trener: 'Janek', bonus: 0 });
await czekajNaNapis(page, 'adventure', 'Pierwsze kroki');
await page.waitForTimeout(300);
await zrzut('warunki');
await klikPrzycisk(page, 'adventure', 'Do dzieła!');
await page.waitForTimeout(600);

// 2. Zwycięstwo: bohater z dorobkiem, żeby było widać, co przechodzi dalej,
//    i dwa tygodnie gry, żeby punkty nie były okrągłym maksimum.
await page.evaluate(() => {
  window.__game.scene.getScene('adventure').stan.dzien = 14;
});
await wymusWygrana(page, {
  artefakty: ['buty', 'pazur'],
  doswiadczenie: 620,
  umiejetnosci: { zwiad: 1 },
  poziomOdebrany: 4,
});
await czekajNaNapis(page, 'adventure', 'Zwycięstwo!');
await zrzutZPauza('baner-zwyciestwo');
await scena(page, 'wynik');
await page.waitForTimeout(4200);
await zrzut('zwyciestwo');

// 3. Porażka w tej samej misji.
await startMisji(page, 'pierwsze-kroki', { trener: 'Janek', bonus: 0 }, { bezWarunkow: true });
await page.waitForTimeout(800);
await wymusPorazke(page);
await czekajNaNapis(page, 'adventure', 'Koniec wyprawy');
await zrzutZPauza('baner-porazka');
await scena(page, 'wynik');
await page.waitForTimeout(3600);
await zrzut('porazka');

// 4. Zakończenie kampanii: ostatnia misja wygrana, kilka starszych rekordów
//    w tabeli, żeby nowy wpis miał się gdzie zmieścić.
await page.evaluate((k) => {
  const teraz = Date.now();
  const d = (dni) => new Date(teraz - dni * 864e5).toISOString();
  localStorage.setItem(
    k,
    JSON.stringify([
      { imie: 'Ola', punkty: 3420, dni: 58, data: d(3) },
      { imie: 'Tata', punkty: 2610, dni: 88, data: d(10) },
      { imie: 'Kuba', punkty: 1980, dni: 112, data: d(20) },
      { imie: 'Babcia Ela', punkty: 1240, dni: 150, data: d(40) },
    ])
  );
}, KLUCZ_REKORDOW);
await startMisji(page, 'oblezenie-groty', POSTEP_PRZED_OSTATNIA, { bezWarunkow: true });
await page.evaluate(() => {
  window.__game.scene.getScene('adventure').stan.dzien = 16;
});
await wymusWygrana(page);
await scena(page, 'wynik');
await page.waitForTimeout(2500);
await zrzut('zwyciestwo-ostatnia');
await klikPrzycisk(page, 'wynik', 'Zakończenie');
await page.waitForTimeout(4200);
await zrzut('koniec-kampanii');
await klikPrzycisk(page, 'wynik', 'Sala sław');
await page.waitForTimeout(3000);
await zrzut('rekordy-koniec');

if (bledy.length) {
  console.log('BŁĘDY W KONSOLI:');
  for (const b of bledy) console.log('  ' + b);
}
await browser.close();
process.exit(bledy.length ? 1 : 0);
