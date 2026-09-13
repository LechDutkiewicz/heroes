// Sonda: czy układ armii z ekranu bohatera przeżywa bitwę.
//
// Trzy rzeczy, których nie łapała żadna z poprzednich sond, bo wszystkie
// zaczynały od armii bez dziur i bez dwóch stosów tego samego gatunku:
//
// 1. **Kolejność na polu walki.** Bitwa losowała rzędy startowe, więc oddział
//    z pierwszego slotu mógł stanąć na dole, a z ostatniego u góry. Na ekranie
//    bohatera układało się armię świadomie i nie miało to żadnego przełożenia.
// 2. **Dziury między stosami.** Wynik bitwy wracał jako gęsta lista i armia
//    sama się zsuwała w lewo po każdej wygranej.
// 3. **Dwa stosy tego samego gatunku.** Powrót szukał ocalałych po `sprite`,
//    więc oba sloty dostawały liczebność TEGO SAMEGO oddziału z planszy —
//    jeden stos wracał podwojony. Zwykły podział stosu to wywoływał.
//
// Układ testowy ma więc dziury I powtórzony gatunek — inaczej sonda znowu
// przeszłaby przy zepsutej grze.
//
//   node tools/probe-sloty-bitwa.mjs [--url http://localhost:4173]

import { chromium } from 'playwright';

const arg = (n, d) => {
  const i = process.argv.indexOf(n);
  return i !== -1 ? process.argv[i + 1] : d;
};
const BASE = arg('--url', 'http://localhost:4173');

let bledy = 0;
const sprawdz = (nazwa, warunek, szczegol = '') => {
  if (!warunek) bledy++;
  console.log(`${warunek ? 'OK  ' : 'BŁĄD'} ${nazwa}${szczegol ? ` — ${szczegol}` : ''}`);
};

const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
const page = await browser.newPage({ viewport: { width: 960, height: 694 } });
const bledyJs = [];
page.on('pageerror', (e) => bledyJs.push(String(e)));

const scena = (n) =>
  page.waitForFunction((x) => window.__game?.scene.getScene(x)?.sys.settings.status === 5, n, {
    timeout: 90000,
  });
const armia = () =>
  page.evaluate(() =>
    window.__game.registry
      .get('stan-mapy')
      .bohater.armia.map((o) => (o ? { s: o.sprite, ile: o.ile } : null))
  );

await page.goto(`${BASE}/?ekran=mapa`, { waitUntil: 'domcontentloaded' });
await scena('adventure');
await page.waitForTimeout(700);

// Układ z dziurami i z rozdzielonym stosem: sloty 0, 2, 3, 4, 6.
// Slot 0 i 6 to ten sam gatunek w różnej liczebności — po bitwie muszą wrócić
// jako DWA osobne stosy, każdy ze swoją liczbą.
const ukladPrzed = await page.evaluate(() => {
  const s = window.__game.scene.getScene('adventure');
  const wzory = s.stan.bohater.armia.filter(Boolean).map((o) => ({ ...o }));
  const nowa = new Array(7).fill(null);
  nowa[0] = { ...wzory[0], ile: 12 };
  nowa[2] = { ...wzory[1], ile: 9 };
  nowa[3] = { ...wzory[2], ile: 6 };
  nowa[4] = { ...wzory[3], ile: 4 };
  nowa[6] = { ...wzory[0], ile: 8 };
  s.stan.bohater.armia = nowa;
  s.registry.set('stan-mapy', s.stan);
  const o = s.stan.obiekty.find((x) => x.rodzaj === 'potwor' && !x.zebrany);
  s.stan.bohater.x = o.x;
  s.stan.bohater.y = o.y - 1;
  s.stan.bohater.ruch = 2000;
  s.zajety = false;
  s.idz([{ x: o.x, y: o.y, koszt: 100 }]);
  return nowa.map((o) => (o ? { s: o.sprite, ile: o.ile } : null));
});
sprawdz('układ startowy ma dziury', ukladPrzed.filter(Boolean).length === 5 && ukladPrzed[1] === null);
sprawdz(
  'układ startowy ma dwa stosy tego samego gatunku',
  ukladPrzed[0].s === ukladPrzed[6].s && ukladPrzed[0].ile !== ukladPrzed[6].ile
);

await page.waitForTimeout(1400);
await scena('battle');
await page.waitForTimeout(400);

// Kolejność na planszy: oddziały gracza czytane z góry na dół muszą odpowiadać
// kolejności ZAJĘTYCH slotów u bohatera.
const naPlanszy = await page.evaluate(() => {
  const s = window.__game.scene.getScene('battle');
  const nasi = s.units
    .filter((u) => u.side === 'player')
    .slice()
    .sort((a, b) => a.row - b.row);
  return {
    kolejnosc: nasi.map((u) => ({ s: u.def.sprite, ile: u.count, rzad: u.row })),
    rzedy: nasi.map((u) => u.row),
  };
});
const oczekiwana = ukladPrzed.filter(Boolean);
sprawdz(
  'na polu walki stoi tyle oddziałów, ile zajętych slotów',
  naPlanszy.kolejnosc.length === oczekiwana.length,
  `${naPlanszy.kolejnosc.length} vs ${oczekiwana.length}`
);
sprawdz(
  'kolejność na polu walki ODPOWIADA kolejności slotów',
  JSON.stringify(naPlanszy.kolejnosc.map((u) => [u.s, u.ile])) ===
    JSON.stringify(oczekiwana.map((u) => [u.s, u.ile])),
  `plansza: ${naPlanszy.kolejnosc.map((u) => `${u.s}×${u.ile}`).join(', ')}`
);
sprawdz(
  'żadne dwa oddziały nie stoją w tym samym rzędzie',
  new Set(naPlanszy.rzedy).size === naPlanszy.rzedy.length,
  naPlanszy.rzedy.join(', ')
);

await page.evaluate(() => window.__game.scene.getScene('battle').rozstrzygnijNatychmiast(true));
await scena('adventure');
await page.waitForTimeout(1200);

const po = await armia();
sprawdz(
  'dziury między stosami przeżywają bitwę',
  po[1] === null && po[5] === null,
  JSON.stringify(po)
);
sprawdz(
  'każdy ocalały stos wrócił NA SWÓJ slot',
  po.every((o, i) => (ukladPrzed[i] === null ? o === null : o === null || o.s === ukladPrzed[i].s)),
  JSON.stringify(po)
);
// Bitwa rozstrzygnięta natychmiast nie zabija nikogo po naszej stronie, więc
// liczebności muszą wrócić dokładnie takie, jakie poszły. Gdyby powrót szukał
// po gatunku, slot 6 dostałby liczbę slotu 0.
sprawdz(
  'dwa stosy tego samego gatunku zachowują SWOJE liczebności',
  po[0]?.ile === ukladPrzed[0].ile && po[6]?.ile === ukladPrzed[6].ile,
  `${po[0]?.ile} i ${po[6]?.ile}, miało być ${ukladPrzed[0].ile} i ${ukladPrzed[6].ile}`
);
const sumaPrzed = ukladPrzed.reduce((s, o) => s + (o ? o.ile : 0), 0);
const sumaPo = po.reduce((s, o) => s + (o ? o.ile : 0), 0);
sprawdz('bitwa nie mnoży ani nie gubi stworków', sumaPo === sumaPrzed, `${sumaPrzed} → ${sumaPo}`);

sprawdz('bez błędów JS', bledyJs.length === 0, bledyJs.slice(0, 2).join(' | '));

await browser.close();
console.log(bledy === 0 ? '\nWszystko przeszło.' : `\n${bledy} sprawdzeń nie przeszło.`);
process.exit(bledy === 0 ? 0 : 1);
