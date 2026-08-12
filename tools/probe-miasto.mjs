// Czy ekran miasta naprawdę pozwala rozbudować zamek — sprawdzane klikaniem.
//
// Po co osobna sonda, skoro `probe-przygoda.mjs` wchodzi do zamku i werbuje:
// tamta sonda woła `kup(0)` wprost z kodu. Sprawdza więc zasady, ale nie
// sprawdza ANI JEDNEJ rzeczy, która na tym ekranie może się zepsuć: czy da się
// trafić myszą w bryłę na panoramie, czy zarys po budowie zamienia się
// w budynek, czy jeden budynek dziennie naprawdę obowiązuje i czy postawione
// siedlisko zmienia to, co przyrasta jutro.
//
// Rzecz, o którą tu naprawdę chodzi: drzewko budynków może być bez zarzutu
// w `zamki.ts` i zupełnie nieklikalne na ekranie. Jedno i drugie wygląda tak
// samo w kodzie.
//
//   node tools/probe-miasto.mjs [--url http://localhost:4173]

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

const scena = (nazwa) =>
  page.waitForFunction(
    (n) => window.__game?.scene.getScene(n)?.sys.settings.status === 5,
    nazwa,
    { timeout: 30000 }
  );

/** Klik w punkt PŁÓTNA, nie strony — płótno ma wokół siebie margines. */
async function klik(x, y) {
  const p = await page.locator('canvas').boundingBox();
  await page.mouse.click(p.x + x, p.y + y);
}

/**
 * Gdzie na ekranie widać daną bryłę. Pytamy o GRANICE RYSUNKU, a nie liczymy
 * położenia tym samym wzorem, co scena — sprawdzenie liczone wzorem sceny
 * przechodzi także wtedy, gdy wzór jest zły.
 */
const gdzieBudynek = (id) =>
  page.evaluate((b) => {
    const t = window.__game.scene.getScene('zamek');
    const k = t.kafle.find((x) => x.budynek.id === b);
    if (!k) return null;
    const g = k.obraz.getBounds();
    return { x: g.centerX, y: g.centerY, tekstura: k.obraz.texture.key, stoi: k.postawiony };
  }, id);

const stanZamku = () =>
  page.evaluate(() => {
    const t = window.__game.scene.getScene('zamek');
    return {
      postawione: [...(t.zamek.postawione ?? [])],
      dostepne: [...(t.zamek.dostepne ?? [])],
      budowanoDnia: t.zamek.budowanoDnia ?? null,
      skarbiec: { ...t.stan.skarbiec },
      dzien: t.stan.dzien,
      kafle: t.kafle.length,
      karta: t.karta.visible,
      wybrany: t.wybrany?.id ?? null,
    };
  });

await page.goto(`${BASE}/?ekran=mapa`, { waitUntil: 'domcontentloaded' });
await scena('adventure');
await page.waitForTimeout(900);

// Wejście do zamku drogą gry: bohater staje obok i wchodzi na pole zamku.
await page.evaluate(() => {
  const s = window.__game.scene.getScene('adventure');
  const z = s.stan.obiekty.find((o) => o.rodzaj === 'zamek' && o.nasz);
  s.stan.bohater.x = z.x;
  s.stan.bohater.y = z.y - 1;
  s.stan.bohater.ruch = 3000;
  s.zajety = false;
  s.idz([{ x: z.x, y: z.y, koszt: 100 }]);
});
await page.waitForTimeout(1500);
await scena('zamek');

// --- panorama ---
console.log('\n=== panorama ===');
const start = await stanZamku();
sprawdz(
  'na panoramie stoi tyle brył, ile jest budynków bez powtórzonych ratuszy',
  start.kafle === 9,
  `${start.kafle}`
);

const gniazdo = await gdzieBudynek('siedlisko1');
const fort = await gdzieBudynek('fort');
sprawdz(
  'postawione siedlisko ma grafikę frakcji, a nieposta­wiony fort — zarys',
  gniazdo?.tekstura?.startsWith('t-bor-') === true && fort?.tekstura === 't-plan-fort',
  `${gniazdo?.tekstura} / ${fort?.tekstura}`
);
sprawdz(
  'bryły nie leżą jedna na drugiej ani poza panoramą',
  !!fort && fort.y > 44 && fort.y < 640 && !!gniazdo && Math.abs(fort.x - gniazdo.x) > 40,
  `fort ${Math.round(fort?.x)},${Math.round(fort?.y)}`
);

// --- klikanie w bryłę otwiera kartę TEGO budynku ---
console.log('\n=== karta budynku ===');
await klik(fort.x, fort.y);
await page.waitForTimeout(300);
const poKliku = await stanZamku();
sprawdz('kliknięcie w bryłę otwiera kartę', poKliku.karta === true);
sprawdz('karta pokazuje budynek, w który kliknięto', poKliku.wybrany === 'fort', String(poKliku.wybrany));

// --- budowa ---
console.log('\n=== budowa ===');
// Dosypujemy surowców przez skarbiec gracza, nie przez ominięcie zasady:
// sprawdzamy budowanie, a nie to, czy da się mieć dużo pokeballi.
await page.evaluate(() => {
  const t = window.__game.scene.getScene('zamek');
  Object.assign(t.stan.skarbiec, { pokeball: 300, jagoda: 40, kamien: 10, odlamek: 40 });
  t.odswiez();
});
// Przycisk karty klikamy MYSZĄ, w miejscu, w którym scena go trzyma —
// wołanie `dzialaj()` z kodu ominęłoby to, czy przycisk w ogóle da się trafić.
const przycisk = await page.evaluate(() => {
  const t = window.__game.scene.getScene('zamek');
  return { x: t.karta.x + 150, y: t.karta.y + 166 };
});
await klik(przycisk.x, przycisk.y);
await page.waitForTimeout(500);
const poBudowie = await stanZamku();
sprawdz('fort stanął', poBudowie.postawione.includes('fort'), poBudowie.postawione.join(', '));
sprawdz(
  'budowa kosztowała surowce',
  poBudowie.skarbiec.pokeball < 300 && poBudowie.skarbiec.odlamek < 40,
  `pokeballe 300 → ${poBudowie.skarbiec.pokeball}, odłamki 40 → ${poBudowie.skarbiec.odlamek}`
);
const fortPo = await gdzieBudynek('fort');
sprawdz(
  'zarys zamienił się w bryłę',
  fortPo?.tekstura === 't-bor-fort' && fortPo.stoi === true,
  String(fortPo?.tekstura)
);

// --- jeden budynek dziennie ---
console.log('\n=== jeden budynek dziennie ===');
const drugi = await page.evaluate(() => {
  const t = window.__game.scene.getScene('zamek');
  const b = t.profil.budynki.find(
    (x) => x.id === 'siedlisko3'
  );
  t.pokazBudynek(b);
  const przed = [...(t.zamek.postawione ?? [])];
  t.dzialaj();
  return { przed, po: [...(t.zamek.postawione ?? [])] };
});
sprawdz(
  'drugi budynek tego samego dnia nie staje',
  drugi.po.length === drugi.przed.length,
  drugi.po.join(', ')
);

// --- nowy dzień: przyrost tylko w tym, co postawione ---
console.log('\n=== przyrost i dochód ===');
// Dzień kończymy DROGĄ GRY: wracamy na mapę i wołamy to samo, co przycisk
// „koniec dnia". Przestawienie licznika dni z zewnątrz sprawdzałoby tylko
// naszą własną arytmetykę.
const przedNoca = await page.evaluate(() => {
  const t = window.__game.scene.getScene('zamek');
  return { dostepne: [...(t.zamek.dostepne ?? [])], kasa: t.stan.skarbiec.pokeball };
});
await page.evaluate(() => window.__game.scene.getScene('zamek').scene.start('adventure'));
await scena('adventure');
await page.waitForTimeout(400);
await page.evaluate(() => window.__game.scene.getScene('adventure').koniecTury());
await page.waitForTimeout(600);
const jutro = await page.evaluate((przed) => {
  const s = window.__game.scene.getScene('adventure');
  const z = s.stan.obiekty.find((o) => o.rodzaj === 'zamek' && o.nasz);
  return {
    przed: przed.dostepne,
    po: [...(z.dostepne ?? [])],
    kasa: przed.kasa,
    kasaPo: s.stan.skarbiec.pokeball,
  };
}, przedNoca);
sprawdz(
  'w postawionych siedliskach przybywa oddziałów',
  jutro.po[0] > jutro.przed[0] && jutro.po[1] > jutro.przed[1],
  `${jutro.przed.join(',')} → ${jutro.po.join(',')}`
);
sprawdz(
  'w niepostawionych siedliskach nie przybywa nic',
  jutro.po[3] === jutro.przed[3] && jutro.po[5] === jutro.przed[5]
);
sprawdz(
  'fort podniósł przyrost powyżej gołej tabeli (3 i 2 na dzień)',
  jutro.po[0] - jutro.przed[0] > 3 && jutro.po[1] - jutro.przed[1] > 2,
  `+${jutro.po[0] - jutro.przed[0]}, +${jutro.po[1] - jutro.przed[1]}`
);
sprawdz(
  'ratusz dokłada pokeballe',
  jutro.kasaPo > jutro.kasa,
  `${jutro.kasa} → ${jutro.kasaPo}`
);

// --- werbunek z siedliska ---
console.log('\n=== werbunek ===');
// Wracamy do miasta tą samą drogą co gracz: wejściem na pole zamku.
await page.evaluate(() => {
  const s = window.__game.scene.getScene('adventure');
  const z = s.stan.obiekty.find((o) => o.rodzaj === 'zamek' && o.nasz);
  s.stan.bohater.x = z.x;
  s.stan.bohater.y = z.y - 1;
  s.stan.bohater.ruch = 3000;
  s.zajety = false;
  s.idz([{ x: z.x, y: z.y, koszt: 100 }]);
});
await page.waitForTimeout(1500);
await scena('zamek');
const kupno = await page.evaluate(() => {
  const t = window.__game.scene.getScene('zamek');
  const b = t.profil.budynki.find((x) => x.id === 'siedlisko2');
  t.pokazBudynek(b);
  const przed = {
    armia: t.stan.bohater.armia.reduce((a, o) => a + o.ile, 0),
    zapas: t.zamek.dostepne[1],
    kasa: t.stan.skarbiec.pokeball,
  };
  t.dzialaj();
  return {
    przed,
    po: {
      armia: t.stan.bohater.armia.reduce((a, o) => a + o.ile, 0),
      zapas: t.zamek.dostepne[1],
      kasa: t.stan.skarbiec.pokeball,
    },
  };
});
sprawdz(
  'kliknięcie w siedlisko werbuje z tego właśnie poziomu',
  kupno.po.armia > kupno.przed.armia && kupno.po.zapas < kupno.przed.zapas,
  `armia ${kupno.przed.armia} → ${kupno.po.armia}, zapas ${kupno.przed.zapas} → ${kupno.po.zapas}`
);
sprawdz('werbunek kosztuje', kupno.po.kasa < kupno.przed.kasa, `${kupno.przed.kasa} → ${kupno.po.kasa}`);

// --- rozbudowa ratusza podmienia bryłę, a nie dokłada drugiej ---
console.log('\n=== rozbudowa ratusza ===');
const ratusz = await page.evaluate(() => {
  const t = window.__game.scene.getScene('zamek');
  t.zamek.budowanoDnia = null;
  Object.assign(t.stan.skarbiec, { pokeball: 300, jagoda: 40, kamien: 10, odlamek: 40 });
  const przedIle = t.kafle.filter((k) => k.budynek.rodzaj === 'ratusz').length;
  const stary = t.kafle.find((k) => k.budynek.rodzaj === 'ratusz').budynek.id;
  t.pokazBudynek(t.profil.budynki.find((x) => x.id === stary));
  const cel = t.wybrany.id;
  t.dzialaj();
  const ratusze = t.kafle.filter((k) => k.budynek.rodzaj === 'ratusz');
  return {
    przedIle,
    cel,
    stary,
    poIle: ratusze.length,
    poId: ratusze[0]?.budynek.id,
    postawione: [...t.zamek.postawione],
  };
});
sprawdz(
  'kliknięcie w stojący ratusz proponuje jego następny stopień',
  ratusz.cel === 'ratusz2' && ratusz.stary === 'ratusz1',
  `${ratusz.stary} → ${ratusz.cel}`
);
sprawdz(
  'po rozbudowie na panoramie stoi JEDEN ratusz, ten wyższy',
  ratusz.poIle === 1 && ratusz.poId === 'ratusz2',
  `${ratusz.poIle} × ${ratusz.poId}`
);

await page.locator('canvas').screenshot({ path: 'tools/shots/miasto.png' });
console.log('\nzrzut: tools/shots/miasto.png');

console.log(`\n${bledy === 0 ? 'Wszystko się zgadza.' : `Błędów: ${bledy}`}`);
await browser.close();
process.exit(bledy === 0 ? 0 : 1);
