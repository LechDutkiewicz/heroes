// Zrzut ekranu bohatera w powtarzalnym stanie.
//
// Po co osobne narzędzie i po co „powtarzalny stan": ekran bohatera pokazuje
// armię, artefakty i doświadczenie. Gdyby zrzut szedł z gry zastanej, dwie
// rundy pętli jakości różniłyby się nie rzemiosłem, tylko tym, ile akurat
// zebrano artefaktów. Stan ustawiamy więc z zewnątrz, przez rejestr gry.
//
//   node tools/zrzut-bohater.mjs [--out tools/shots/bohater.png]
//                                [--stan pelny|pusty|po-bitwie]
//                                [--okno] [--url http://localhost:4173]

import { chromium } from 'playwright';

const arg = (n, d) => {
  const i = process.argv.indexOf(n);
  return i !== -1 ? process.argv[i + 1] : d;
};
const BASE = arg('--url', 'http://localhost:4173');
const OUT = arg('--out', 'tools/shots/bohater.png');
const STAN = arg('--stan', 'pelny');
const OKNO = process.argv.includes('--okno');

/**
 * Trzy stany pokazowe. „Pełny" jest tym, z którego robimy porównania: ekran
 * pusty nie pokazuje ani slotów, ani modyfikatorów, więc ocenianie na nim
 * rzemiosła jest ocenianiem tła.
 */
const STANY = {
  pelny: { artefakty: ['opaska', 'pazur', 'buty', 'mistrz'], dosw: 900, sloty: 6 },
  pusty: { artefakty: [], dosw: 0, sloty: 1 },
  'po-bitwie': { artefakty: ['kamizelka'], dosw: 260, sloty: 3 },
};

const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
const page = await browser.newPage({ viewport: { width: 960, height: 694 } });
page.on('pageerror', (e) => console.log('BŁĄD JS —', String(e)));

const scena = (n) =>
  page.waitForFunction(
    (x) => window.__game?.scene.getScene(x)?.sys.settings.status === 5,
    n,
    { timeout: 90000 }
  );

await page.goto(`${BASE}/?ekran=mapa`, { waitUntil: 'domcontentloaded' });
await scena('adventure');
await page.waitForTimeout(600);

await page.evaluate((s) => {
  const gra = window.__game;
  const stan = gra.registry.get('stan-mapy');
  const b = stan.bohater;
  b.artefakty = s.artefakty;
  b.doswiadczenie = s.dosw;
  // Armia rozłożona z dziurą w środku: bez pustego slotu między zajętymi nie
  // widać, że sloty są MIEJSCAMI, a to jest cała treść tego ekranu.
  const wzor = b.armia.filter(Boolean);
  const nowa = new Array(7).fill(null);
  const miejsca = [0, 1, 2, 4, 5, 6];
  for (let i = 0; i < Math.min(s.sloty, wzor.length, miejsca.length); i++) {
    nowa[miejsca[i]] = wzor[i % wzor.length];
  }
  // Kopie, nie te same obiekty — inaczej dwa sloty dzielą jeden stos i zmiana
  // liczebności w jednym zmienia oba.
  b.armia = nowa.map((o) => (o ? { ...o } : null));
  gra.registry.set('stan-mapy', stan);
  gra.scene.getScene('adventure').scene.start('bohater');
}, STANY[STAN] ?? STANY.pelny);

await scena('bohater');
await page.waitForTimeout(900);

if (OKNO) {
  // Okno podziału: przeciągamy pierwszy zajęty slot na pusty. Zrzut robimy
  // z otwartym oknem, bo to ono jest kawałkiem do oceny.
  const y = 548; // środek pasa slotów: ARMIA_Y (496) + 6 + SLOT_BOK/2
  const slotX = (i) => (960 - (7 * 92 + 6 * 12)) / 2 + i * 104 + 46;
  await page.mouse.move(slotX(0), y);
  await page.mouse.down();
  await page.mouse.move(slotX(3), y, { steps: 12 });
  await page.mouse.up();
  await page.waitForTimeout(500);
}

await page.screenshot({ path: OUT });
console.log(`zapisano ${OUT}${OKNO ? ' (z oknem podziału)' : ''}`);
await browser.close();
