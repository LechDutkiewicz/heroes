// Czy dziennik diagnostyczny naprawdę zbiera to, co potrzebne do zgłoszenia?
//
// Sonda sprawdza cztery rzeczy, bo każda z nich osobno potrafi zawieść cicho:
// czy sesja ma ziarno (bez niego zgłoszenie jest nie do powtórzenia), czy
// wyjątek rzucony w grze trafia do bufora, czy raport zawiera migawkę stanu
// aktywnej sceny, i czy podgląd F8 daje się otworzyć.
//
//   node tools/probe-dziennik.mjs [--url http://localhost:4173]

import { chromium } from 'playwright';

const arg = (n, d) => {
  const i = process.argv.indexOf(n);
  return i !== -1 ? process.argv[i + 1] : d;
};
const BASE = arg('--url', 'http://localhost:4173');

let bledy = 0;
const sprawdz = (co, ok, szczegol = '') => {
  if (!ok) bledy++;
  console.log(`  ${ok ? 'OK  ' : 'ŹLE '} ${co}${szczegol ? ` — ${szczegol}` : ''}`);
};

const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
const page = await browser.newPage({ viewport: { width: 1000, height: 760 } });

await page.goto(`${BASE}/?ekran=mapa`, { waitUntil: 'domcontentloaded' });
await page.waitForFunction(
  () => window.__game?.scene.getScene('adventure')?.sys.settings.status === 5,
  null,
  { timeout: 30000 }
);
await page.waitForTimeout(600);

const ziarno = await page.evaluate(() => window.__dziennik?.ziarno());
sprawdz('sesja ma ziarno', Number.isFinite(ziarno) && ziarno > 0, `ziarno=${ziarno}`);

const startSceny = await page.evaluate(() =>
  window.__dziennik.wpisy().some((w) => w.zrodlo === 'scena' && w.tekst.includes('adventure'))
);
sprawdz('start sceny zapisany', startSceny);

// Wyjątek rzucony poza obsługą Phasera — dokładnie taki, jaki zobaczyłby
// gracz w chwili awarii.
await page.evaluate(() => setTimeout(() => { throw new Error('probny-blad-dziennika'); }, 0));
await page.waitForTimeout(300);
const zlapany = await page.evaluate(() =>
  window.__dziennik.wpisy().some((w) => w.waga === 'blad' && w.tekst.includes('probny-blad-dziennika'))
);
sprawdz('wyjątek trafia do dziennika', zlapany);
sprawdz('licznik błędów rośnie', (await page.evaluate(() => window.__dziennik.bledow())) >= 1);

const raport = await page.evaluate(() => window.__dziennik.raport());
sprawdz('raport ma ziarno', raport.includes(`?seed=${ziarno}`));
sprawdz('raport ma migawkę mapy', raport.includes('### Stan: mapa'));
sprawdz('raport ma oś czasu', raport.includes('### Zdarzenia'));
sprawdz('raport ma rozsądną długość', raport.length > 400, `${raport.length} znaków`);

await page.keyboard.press('F8');
await page.waitForTimeout(200);
const widocznyPodglad = await page.evaluate(() => {
  const t = document.querySelector('textarea');
  return t !== null && t.value.includes('## Dziennik gry');
});
sprawdz('F8 otwiera podgląd z raportem', widocznyPodglad);
await page.keyboard.press('F8');
await page.waitForTimeout(150);
sprawdz('F8 zamyka podgląd', (await page.evaluate(() => document.querySelector('textarea') === null)));

// Powtarzalność: ten sam adres z ziarnem musi dać tę samą bitwę.
const opis = async (url) => {
  const p = await browser.newPage({ viewport: { width: 1000, height: 760 } });
  await p.goto(url, { waitUntil: 'domcontentloaded' });
  await p.waitForFunction(
    () => window.__dziennik?.wpisy().some((w) => w.zrodlo === 'bitwa' && w.tekst === 'start'),
    null,
    { timeout: 30000 }
  );
  const w = await p.evaluate(
    () => window.__dziennik.wpisy().find((x) => x.zrodlo === 'bitwa' && x.tekst === 'start').dane
  );
  await p.close();
  return JSON.stringify(w);
};
const a = await opis(`${BASE}/?seed=4242`);
const b = await opis(`${BASE}/?seed=4242`);
sprawdz('to samo ziarno = ta sama bitwa', a === b, a === b ? '' : `${a}\n       vs ${b}`);

await browser.close();
console.log(bledy === 0 ? '\nDziennik: wszystko gra.' : `\nDziennik: ${bledy} problemów.`);
process.exit(bledy === 0 ? 0 : 1);
