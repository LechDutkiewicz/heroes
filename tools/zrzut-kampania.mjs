// Zrzuty ekranu kampanii w czterech powtarzalnych stanach, plus sprawdzenie,
// że „Graj" naprawdę uruchamia mapę przygody.
//
// Stan kampanii żyje w localStorage (`heroes-kampania-v1`), więc każdy zrzut
// zaczyna się od wpisania tam gotowego postępu i dopiero potem otwiera grę.
// Bez tego dwie rundy pętli jakości różniłyby się tym, co akurat zostało
// w przeglądarce, a nie rzemiosłem ekranu.
//
//   node tools/zrzut-kampania.mjs [--url http://localhost:4175]
//
// Wynik: tools/shots/kampania-wybor.png, kampania-wstep.png, kampania.png,
// kampania-m3.png, kampania-koniec.png. Kod wyjścia ≠ 0, gdy w konsoli były
// błędy albo „Graj" nie doprowadził do mapy przygody.

import { chromium } from 'playwright';
import { mkdir } from 'node:fs/promises';

const arg = (n, d) => {
  const i = process.argv.indexOf(n);
  return i !== -1 ? process.argv[i + 1] : d;
};
const BASE = arg('--url', 'http://localhost:4175');
const KATALOG = 'tools/shots';
const KLUCZ = 'heroes-kampania-v1';

// Układ ekranu (współrzędne gry) — te same liczby co w KampaniaScene.ts.
const KARTA_NAGRODY = (i) => ({ x: 22 + 18 + i * 190 + 92, y: 546 + 42 + 43 });
const GRAJ = { x: 850, y: 650 };
const KARTA_TRENERA = (i) => ({ x: 480 + (i === 0 ? -170 : 170), y: 382 });

const WYNIKI = {
  'pierwsze-kroki': { dni: 12, punkty: 835 },
  'klucze-do-przeleczy': { dni: 27, punkty: 610 },
  'bagienny-szlak': { dni: 41, punkty: 400 },
  'oblezenie-groty': { dni: 19, punkty: 730 },
};
const BOHATER = {
  imie: 'Janek',
  atak: 3,
  obrona: 2,
  artefakty: ['buty', 'tarcza'],
  doswiadczenie: 1400,
  umiejetnosci: [],
  poziomOdebrany: 3,
};

const postep = (trener, ile) => {
  const misje = Object.keys(WYNIKI).slice(0, ile);
  return {
    kampania: 'ksiezycowa-grota',
    trener,
    ukonczone: misje,
    wyniki: Object.fromEntries(misje.map((m) => [m, WYNIKI[m]])),
    ...(ile ? { bohater: { ...BOHATER, imie: trener } } : {}),
  };
};

const browser = await chromium.launch({
  executablePath: process.env.CHROMIUM_PATH || '/opt/pw-browsers/chromium-1194/chrome-linux/chrome',
});
await mkdir(KATALOG, { recursive: true });
const bledy = [];

async function otworz(stan) {
  const page = await browser.newPage({ viewport: { width: 960, height: 694 }, deviceScaleFactor: 1 });
  page.on('pageerror', (e) => bledy.push(`pageerror: ${e.message}`));
  page.on('console', (m) => {
    if (m.type() === 'error' && !m.text().startsWith('Failed to load resource')) bledy.push(`console: ${m.text()}`);
  });
  page.on('response', (r) => {
    if (r.status() >= 400 && !r.url().endsWith('favicon.ico')) bledy.push(`${r.status()}: ${r.url()}`);
  });
  await page.addInitScript(
    ([klucz, wartosc]) => {
      // Tylko przy pierwszym wczytaniu — przeładowanie w trakcie testu ma
      // widzieć to, co zapisała gra, a nie nasz stan startowy.
      if (sessionStorage.getItem('zrzut-zasiany')) return;
      sessionStorage.setItem('zrzut-zasiany', '1');
      if (wartosc === null) localStorage.removeItem(klucz);
      else localStorage.setItem(klucz, wartosc);
    },
    [KLUCZ, stan === null ? null : JSON.stringify(stan)]
  );
  await page.goto(`${BASE}/?ekran=kampania`, { waitUntil: 'domcontentloaded' });
  await page.waitForFunction(() => window.__game?.scene.getScene('kampania')?.sys.settings.status === 5, null, {
    timeout: 30000,
  });
  // Wejście sceny to rozjaśnienie kamery, a pulsy znaczników ruszają od
  // zera — czekamy, aż kamera skończy, i jeszcze chwilę na pulsy.
  await page.waitForFunction(() => {
    const s = window.__game.scene.getScene('kampania');
    return s.gotowa && !s.cameras.main.fadeEffect.isRunning;
  }, null, {
    timeout: 30000,
  });
  await page.waitForTimeout(1200);
  return page;
}

async function klik(page, p) {
  const r = await page.$eval('canvas', (c) => {
    const b = c.getBoundingClientRect();
    return { x: b.left, y: b.top, s: b.width / 960 };
  });
  await page.mouse.move(r.x + p.x * r.s, r.y + p.y * r.s);
  await page.waitForTimeout(120);
  await page.mouse.click(r.x + p.x * r.s, r.y + p.y * r.s);
}

async function zrzut(page, nazwa) {
  // Kursor poza kanwą — najechanie zmienia wygląd kart i znaczników.
  await page.mouse.move(0, 0);
  await page.waitForTimeout(250);
  await (await page.$('canvas')).screenshot({ path: `${KATALOG}/${nazwa}` });
  console.log(`zrzut: ${KATALOG}/${nazwa}`);
}

// 1. Wybór trenera (brak postępu) i wstęp po wyborze.
{
  const page = await otworz(null);
  await zrzut(page, 'kampania-wybor.png');
  await klik(page, KARTA_TRENERA(1));
  // Akapity wstępu wchodzą po kolei na tweenach. Czekamy na stan sceny, a nie
  // na zegar ściany: przeglądarka bez GPU rysuje kilka klatek na sekundę
  // i animacje idą w niej wolniej niż u gracza.
  await page.waitForFunction(
    () => {
      const s = window.__game.scene.getScene('kampania');
      const n = s.children.list.find((o) => o.depth === 500);
      const t = n ? n.list.filter((o) => o.type === 'Text') : [];
      return t.length > 3 && t.every((o) => o.alpha > 0.99);
    },
    null,
    { timeout: 60000 }
  );
  await zrzut(page, 'kampania-wstep.png');
  const zapisany = await page.evaluate((k) => JSON.parse(localStorage.getItem(k) ?? 'null'), KLUCZ);
  if (zapisany?.trener !== 'Ola') bledy.push(`wybór trenera nie zapisał postępu: ${JSON.stringify(zapisany)}`);
  await page.close();
}

// 2. Misja 1 bieżąca, nagroda niewybrana.
{
  const page = await otworz(postep('Janek', 0));
  await zrzut(page, 'kampania.png');

  // „Graj" przed wyborem nagrody nie może nic zrobić…
  await klik(page, GRAJ);
  await page.waitForTimeout(600);
  const zaWczesnie = await page.evaluate(() => window.__game.scene.isActive('adventure'));
  if (zaWczesnie) bledy.push('„Graj" wystartował misję bez wybranej nagrody');

  // …a po wyborze ma uruchomić mapę przygody z misją i nagrodą.
  await klik(page, KARTA_NAGRODY(0));
  await page.waitForTimeout(300);
  await klik(page, GRAJ);
  try {
    await page.waitForFunction(() => window.__game.scene.getScene('adventure')?.sys.settings.status === 5, null, {
      timeout: 20000,
    });
    const s = await page.evaluate(() => {
      const st = window.__game.registry.get('stan-mapy');
      return { misja: st?.misja, pokeball: st?.skarbiec?.pokeball, imie: st?.bohater?.imie };
    });
    const zapisany = await page.evaluate((k) => JSON.parse(localStorage.getItem(k) ?? 'null'), KLUCZ);
    console.log(`Graj → adventure: misja=${s.misja}, pokeballe=${s.pokeball}, bohater=${s.imie}, zapisany bonus=${zapisany?.bonus}`);
    if (s.misja !== 'pierwsze-kroki' || zapisany?.bonus !== 0) bledy.push(`start misji niespójny: ${JSON.stringify(s)}`);
  } catch {
    bledy.push('„Graj" nie uruchomił sceny adventure');
  }
  await page.close();
}

// 3. Misje 1–2 zrobione, bieżąca 3, nagroda wybrana.
{
  const page = await otworz(postep('Ola', 2));
  await klik(page, KARTA_NAGRODY(1));
  await page.waitForTimeout(500);
  await zrzut(page, 'kampania-m3.png');
  await page.close();
}

// 4. Cała kampania zrobiona.
{
  const page = await otworz(postep('Janek', 4));
  await page.waitForTimeout(600);
  await zrzut(page, 'kampania-koniec.png');
  await page.close();
}

await browser.close();
if (bledy.length) {
  console.log('BŁĘDY:');
  for (const b of bledy) console.log('  ' + b);
}
process.exit(bledy.length ? 1 : 0);
