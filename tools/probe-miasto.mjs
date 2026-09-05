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
 * Gdzie na ekranie widać daną bryłę — punkt, w który człowiek by kliknął.
 *
 * Uwaga na środek GRANIC rysunku: odkąd w pliku jest wypalony cień rzucony,
 * obrazek jest szerszy od bryły i jego środek leży obok budynku, w przezroczystym
 * marginesie. Sonda klikała tam i wszystkie sprawdzenia budowy poleciały —
 * wyglądało to na zepsuty ekran, a zepsuty był celownik. Bierzemy więc punkt
 * zaczepienia obrazka (`x` to środek samej bryły) i wysokość nad podstawą.
 */
const gdzieBudynek = (id) =>
  page.evaluate((b) => {
    const t = window.__game.scene.getScene('zamek');
    const k = t.kafle.find((x) => x.budynek.id === b);
    if (!k) return null;
    const g = k.obraz.getBounds();
    return {
      x: k.obraz.x,
      y: g.bottom - g.height * 0.3,
      tekstura: k.obraz.texture.key,
      stoi: k.postawiony,
    };
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

// --- panorama pokazuje TYLKO to, co stoi ---
console.log('\n=== panorama ===');
const start = await stanZamku();
sprawdz(
  'na panoramie stoi tyle brył, ile budynków postawiono',
  start.kafle === start.postawione.filter((x) => !x.startsWith('ratusz')).length + 1,
  `${start.kafle} brył, postawione: ${start.postawione.join(', ')}`
);
sprawdz(
  'niepostawiony budynek NIE jest rysowany',
  (await gdzieBudynek('fort')) === null,
  'fort'
);

const gniazdo = await gdzieBudynek('siedlisko1');
sprawdz(
  'postawione siedlisko ma własną grafikę frakcji',
  gniazdo?.tekstura?.startsWith('t-bor-') === true,
  String(gniazdo?.tekstura)
);

// --- lista budowy ---
//
// Budowanie przeniosło się z panoramy do listy: w Heroes 3 miasto na starcie
// jest puste i wypełnia się w miarę rozbudowy, a co postawić, wybiera się
// z listy w ratuszu. Sonda musi więc klikać w wiersz listy, a nie w zarys.
console.log('\n=== lista budowy ===');
await page.evaluate(() => {
  const t = window.__game.scene.getScene('zamek');
  Object.assign(t.stan.skarbiec, { pokeball: 300, jagoda: 40, kamien: 10, odlamek: 40 });
  t.odswiez();
});

/** Gdzie na ekranie leży wiersz danego budynku na otwartej liście. */
const gdzieWiersz = (id) =>
  page.evaluate((b) => {
    const t = window.__game.scene.getScene('zamek');
    const wiersz = t.children.list.find(
      (o) => o.type === 'Text' && o.text === (t.profil.budynki.find((x) => x.id === b)?.nazwa ?? '')
    );
    return wiersz ? { x: wiersz.x + 120, y: wiersz.y + 14 } : null;
  }, id);

await klik(960 - 296, 663);
await page.waitForTimeout(400);
const wierszFortu = await gdzieWiersz('fort');
sprawdz('przycisk „Buduj" otwiera listę z wierszem fortu', !!wierszFortu);

await klik(wierszFortu.x, wierszFortu.y);
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
  'fort pojawił się na panoramie dopiero po postawieniu',
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
//
// Ratusz jest teraz wejściem do listy budowy — tak jak w Heroes 3, gdzie to on
// otwiera rozbudowę całego miasta. Klikamy więc w jego bryłę i sprawdzamy, czy
// lista się otworzyła, a potem stawiamy z niej drugi stopień.
console.log('\n=== rozbudowa ratusza ===');
await page.evaluate(() => {
  const t = window.__game.scene.getScene('zamek');
  t.zamek.budowanoDnia = null;
  Object.assign(t.stan.skarbiec, { pokeball: 300, jagoda: 40, kamien: 10, odlamek: 40 });
  t.odswiez();
});
const bryłaRatusza = await gdzieBudynek('ratusz1');
await klik(bryłaRatusza.x, bryłaRatusza.y);
await page.waitForTimeout(400);
const wierszRatusza = await gdzieWiersz('ratusz2');
sprawdz('klik w ratusz otwiera listę budowy', !!wierszRatusza);

await klik(wierszRatusza.x, wierszRatusza.y);
await page.waitForTimeout(500);
const poRozbudowie = await page.evaluate(() => {
  const t = window.__game.scene.getScene('zamek');
  const ratusze = t.kafle.filter((k) => k.budynek.rodzaj === 'ratusz');
  return { ile: ratusze.length, id: ratusze[0]?.budynek.id, postawione: [...t.zamek.postawione] };
});
sprawdz(
  'po rozbudowie na panoramie stoi JEDEN ratusz, ten wyższy',
  poRozbudowie.ile === 1 && poRozbudowie.id === 'ratusz2',
  `${poRozbudowie.ile} × ${poRozbudowie.id}`
);

await page.locator('canvas').screenshot({ path: 'tools/shots/miasto.png' });
console.log('\nzrzut: tools/shots/miasto.png');

console.log(`\n${bledy === 0 ? 'Wszystko się zgadza.' : `Błędów: ${bledy}`}`);
await browser.close();
process.exit(bledy === 0 ? 0 : 1);
