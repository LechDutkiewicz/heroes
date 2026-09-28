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
      .bohater.armia.map((o) => (o ? { s: o.sprite, n: o.nazwa, p: o.poziom, d: o.dosw ?? 0, z: !!o.omdlaly } : null))
  );

await page.goto(`${BASE}/?ekran=mapa`, { waitUntil: 'domcontentloaded' });
await scena('adventure');
await page.waitForTimeout(700);

// Drużyna z dziurami: sloty 0, 2, 3, 4, 6. Slot 0 i 6 to ten sam gatunek na
// różnych poziomach (dwie postacie), slot 2 jest zemdlony. Do bitwy idą
// dwa pierwsze SPRAWNE sloty: 0 i 3 (reszta w tej walce nie walczy).
const ukladPrzed = await page.evaluate(() => {
  const s = window.__game.scene.getScene('adventure');
  const wzory = s.stan.bohater.armia.filter(Boolean).map((o) => ({ ...o }));
  const nowa = new Array(7).fill(null);
  nowa[0] = { ...wzory[0], nazwa: 'Pierwszy', poziom: 12, dosw: undefined };
  nowa[2] = { ...wzory[1], poziom: 9, dosw: undefined, omdlaly: true };
  nowa[3] = { ...wzory[2], poziom: 6, dosw: undefined };
  nowa[4] = { ...wzory[3], poziom: 4, dosw: undefined };
  nowa[6] = { ...wzory[0], nazwa: 'Drugi', poziom: 8, dosw: undefined };
  s.stan.bohater.armia = nowa;
  s.registry.set('stan-mapy', s.stan);
  const o = s.stan.obiekty.find((x) => x.rodzaj === 'potwor' && !x.zebrany);
  s.stan.bohater.x = o.x;
  s.stan.bohater.y = o.y - 1;
  s.stan.bohater.ruch = 2000;
  s.zajety = false;
  s.idz([{ x: o.x, y: o.y, koszt: 100 }]);
  return nowa.map((o) => (o ? { s: o.sprite, n: o.nazwa, p: o.poziom, z: !!o.omdlaly } : null));
});
sprawdz('układ startowy ma dziury', ukladPrzed.filter(Boolean).length === 5 && ukladPrzed[1] === null);

await page.waitForTimeout(1400);
await scena('battle');
await page.waitForTimeout(400);

// Okno „Kto walczy?" — zostawiamy domyślny wybór (dwa pierwsze sprawne).
await page.evaluate(() => window.__game.scene.getScene('battle').wyborSkladu?.zatwierdz());
await page.waitForTimeout(300);
const naPlanszy = await page.evaluate(() => {
  const s = window.__game.scene.getScene('battle');
  const nasi = s.units
    .filter((u) => u.side === 'player')
    .slice()
    .sort((a, b) => a.row - b.row);
  return {
    kolejnosc: nasi.map((u) => ({ n: u.def.name, p: u.def.poziom })),
    naPolu: nasi.length,
    rzedy: nasi.map((u) => u.row),
    wrogRzedy: s.units.filter((u) => u.side === 'enemy').map((u) => u.row).sort((a, b) => a - b),
  };
});
const oczekiwana = [0, 3].map((i) => ukladPrzed[i]);
sprawdz(
  'do bitwy idą dwa pierwsze sprawne stworki, w kolejności slotów',
  JSON.stringify(naPlanszy.kolejnosc.map((u) => [u.n, u.p])) === JSON.stringify(oczekiwana.map((u) => [u.n, u.p])),
  naPlanszy.kolejnosc.map((u) => `${u.n}@${u.p}`).join(', ')
);
sprawdz('trener wystawia dwa stworki', naPlanszy.naPolu === 2, String(naPlanszy.naPolu));
const zPrzerwa = (r) => r.every((x, i) => i === 0 || x - r[i - 1] >= 2);
sprawdz('między naszymi stworkami zawsze wolne pole', zPrzerwa(naPlanszy.rzedy), naPlanszy.rzedy.join(', '));
sprawdz('między stworkami przeciwnika też', zPrzerwa(naPlanszy.wrogRzedy), naPlanszy.wrogRzedy.join(', '));

await page.evaluate(() => window.__game.scene.getScene('battle').rozstrzygnijNatychmiast(true));
await scena('adventure');
await page.waitForTimeout(1200);

const po = await armia();
sprawdz('dziury w drużynie przeżywają bitwę', po[1] === null && po[5] === null, JSON.stringify(po));
sprawdz(
  'każdy stworek wrócił NA SWÓJ slot',
  po.every((o, i) => (ukladPrzed[i] === null ? o === null : o?.n === ukladPrzed[i].n)),
  JSON.stringify(po.map((o) => o?.n ?? null))
);
sprawdz('zemdlony został zemdlony i nic nie dostał', po[2]?.z === true && po[2]?.p === 9);
sprawdz('walczący nie zemdleli (wygrana od ręki)', [0, 3, 4, 6].every((i) => po[i] && !po[i].z));
sprawdz(
  'walczący zebrali doświadczenie',
  [0, 3, 4, 6].every((i) => po[i].d > 5 * ukladPrzed[i].p * (ukladPrzed[i].p - 1)),
  [0, 3, 4, 6].map((i) => `${po[i].n}: poz. ${ukladPrzed[i].p}→${po[i].p}`).join(', ')
);

sprawdz('bez błędów JS', bledyJs.length === 0, bledyJs.slice(0, 2).join(' | '));

await browser.close();
console.log(bledy === 0 ? '\nWszystko przeszło.' : `\n${bledy} sprawdzeń nie przeszło.`);
process.exit(bledy === 0 ? 0 : 1);
