// Strażnica graniczna i klucz — sprawdzenie na żywej grze.
//
// Po co osobna sonda, skoro `probe-mapa.ts` liczy trzy akty mapy: tamta zna
// tylko ZASADY (kto kogo blokuje), a to jest obiekt, na który się WCHODZI,
// i cała jego mechanika dzieje się w scenie. Trzy rzeczy mogą się tu zepsuć
// i żadnej nie widać w danych:
//
//  1. Bohater wchodzi NA bramę i zostaje w środku muru. Brama nie jest
//     potworem: nie ma bitwy, po której pole staje się wolne, więc bohater
//     stałby tam do końca gry. Dlatego marsz kończy się pole wcześniej.
//  2. Brama bez klucza zaczyna bitwę albo pochłania turę. Ma tylko powiedzieć,
//     czego brakuje.
//  3. Brama otwarta kluczem dalej blokuje drogę, bo bryły liczą się RAZ
//     i są zapamiętane. Przejście musi stać otworem natychmiast.
//
//   node tools/probe-brama.mjs [--url http://localhost:4173]

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
page.on('pageerror', (e) => {
  bledy++;
  console.log('  BŁĄD JS —', String(e));
});

const scena = (nazwa, timeout = 120000) =>
  page.waitForFunction(
    (n) => window.__game?.scene.getScene(n)?.sys.settings.status === 5,
    nazwa,
    { timeout }
  );

await page.goto(`${BASE}/?ekran=mapa`, { waitUntil: 'domcontentloaded' });
await scena('adventure');
await page.waitForTimeout(900);

console.log('\n=== brama bez klucza ===');
const start = await page.evaluate(() => {
  const s = window.__game.scene.getScene('adventure');
  s.stan.odkryte.forEach((w, y) => w.forEach((_, x) => (s.stan.odkryte[y][x] = true)));
  // Strażnica przełęczy południowej: pierwsza, którą gracz spotyka.
  const brama = s.stan.obiekty
    .filter((o) => o.rodzaj === 'straznica')
    .sort((a, b) => b.y - a.y)[0];
  s.stan.bohater.x = brama.x;
  s.stan.bohater.y = brama.y + 2;
  s.stan.bohater.ruch = 5000;
  s.zajety = false;
  return { x: brama.x, y: brama.y, klucz: brama.klucz, nazwa: brama.nazwa };
});
sprawdz(`strażnica stoi na mapie (${start.nazwa})`, !!start.klucz, `klucz ${start.klucz}`);

// Pole PO DRUGIEJ STRONIE bramy wybiera gra, a nie sonda.
//
// Pierwsza wersja brała na sztywno (x−1, y−1) i po dołożeniu bagna ze śniegiem
// trafiła w las — sonda ogłosiła wtedy, że przejście nie otwiera się kluczem,
// choć otwierało się normalnie. Szukamy więc najbliższego pola na północ od
// bramy, na które w ogóle da się wejść.
const przed = await page.evaluate((b) => {
  const s = window.__game.scene.getScene('adventure');
  const wolne = [];
  for (let dy = 1; dy <= 4 && wolne.length === 0; dy++)
    for (let dx = -2; dx <= 2; dx++) {
      const x = b.x + dx;
      const y = b.y - dy;
      if (!['skaly', 'woda', 'las'].includes(s.stan.teren[y]?.[x])) wolne.push({ x, y });
    }
  window.__zaBrama = wolne[0];
  return {
    naBrame: s.trasaDo(b.x, b.y)?.length ?? null,
    zaBrame: wolne[0] ? (s.trasaDo(wolne[0].x, wolne[0].y)?.length ?? null) : null,
    pole: wolne[0],
  };
}, start);
sprawdz('do bramy prowadzi trasa (da się w nią kliknąć)', przed.naBrame !== null, `${przed.naBrame} pola`);
sprawdz('ZA bramę trasy nie ma', przed.zaBrame === null, `cel ${przed.pole?.x},${przed.pole?.y}`);

await page.evaluate((b) => {
  const s = window.__game.scene.getScene('adventure');
  s.idz(s.trasaDo(b.x, b.y));
}, start);
await page.waitForTimeout(1500);

const poProbie = await page.evaluate((b) => {
  const s = window.__game.scene.getScene('adventure');
  const brama = s.stan.obiekty.find((o) => o.rodzaj === 'straznica' && o.x === b.x && o.y === b.y);
  return {
    x: s.stan.bohater.x,
    y: s.stan.bohater.y,
    zajety: s.zajety,
    otwarta: !!brama.zebrany,
    bitwa: window.__game.scene.getScene('battle')?.sys.settings.active === true,
  };
}, start);
sprawdz('bohater NIE wszedł na bramę', !(poProbie.x === start.x && poProbie.y === start.y), `stoi na ${poProbie.x},${poProbie.y}`);
sprawdz('brama bez klucza nie zaczyna bitwy', poProbie.bitwa === false);
sprawdz('brama bez klucza została zamknięta', poProbie.otwarta === false);
sprawdz('gra oddaje sterowanie', poProbie.zajety === false);

console.log('\n=== brama z kluczem ===');
await page.evaluate((b) => {
  const s = window.__game.scene.getScene('adventure');
  s.stan.klucze.push(b.klucz);
  s.stan.bohater.ruch = 5000;
  s.idz(s.trasaDo(b.x, b.y));
}, start);
await page.waitForTimeout(1500);

const po = await page.evaluate((b) => {
  const s = window.__game.scene.getScene('adventure');
  const brama = s.stan.obiekty.find((o) => o.rodzaj === 'straznica' && o.x === b.x && o.y === b.y);
  return {
    otwarta: !!brama.zebrany,
    zaBrame: s.trasaDo(window.__zaBrama.x, window.__zaBrama.y)?.length ?? null,
    zajety: s.zajety,
  };
}, start);
sprawdz('klucz otwiera bramę', po.otwarta === true);
sprawdz('przejście staje otworem NATYCHMIAST', po.zaBrame !== null, `${po.zaBrame} pól za bramę`);
sprawdz('gra oddaje sterowanie', po.zajety === false);

console.log('\n=== namiot klucznika daje klucz ===');
const namiot = await page.evaluate(() => {
  const s = window.__game.scene.getScene('adventure');
  s.stan.klucze.length = 0;
  const n = s.stan.obiekty.find((o) => o.rodzaj === 'namiot' && !o.zebrany);
  s.stan.bohater.x = n.x;
  s.stan.bohater.y = n.y + 1;
  s.stan.bohater.ruch = 5000;
  s.zajety = false;
  s.idz(s.trasaDo(n.x, n.y));
  return { klucz: n.klucz, id: n.id };
});
await page.waitForTimeout(1400);
const poNamiocie = await page.evaluate(() => {
  const s = window.__game.scene.getScene('adventure');
  return { klucze: [...s.stan.klucze], zajety: s.zajety };
});
sprawdz('namiot daje klucz w swojej barwie', poNamiocie.klucze.includes(namiot.klucz), poNamiocie.klucze.join(', ') || 'brak');
sprawdz('gra oddaje sterowanie', poNamiocie.zajety === false);

console.log(`\n${bledy === 0 ? 'Wszystko się zgadza.' : `Błędów: ${bledy}`}`);
await browser.close();
process.exit(bledy === 0 ? 0 : 1);
