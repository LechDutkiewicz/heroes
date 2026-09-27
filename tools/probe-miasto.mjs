// Czy ekran miasta naprawdę pozwala rozbudować zamek — sprawdzane klikaniem.
//
// Po co osobna sonda, skoro `probe-przygoda.mjs` wchodzi do zamku i werbuje:
// tamta sonda woła `kup(0)` wprost z kodu. Sprawdza więc zasady, ale nie
// sprawdza ANI JEDNEJ rzeczy, która na tym ekranie może się zepsuć: czy da się
// trafić myszą w bryłę na panoramie, czy zarys po budowie zamienia się
// w budynek, czy jeden budynek dziennie naprawdę obowiązuje, czy postawione
// siedlisko (rezerwat) zmienia to, co przyrasta jutro, i czy zaproszenie
// z rezerwatu daje dokładnie JEDNEGO młodego stworka („trener zamiast armii":
// rezerwat przyrasta ułamkami dziennie, najwyżej do `MAKS_CZEKA`).
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
  const z = s.stan.obiekty.find((o) => o.rodzaj === 'zamek' && o.wlasciciel === 'gracz');
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
  // +1 za ratusz (jedna bryła na trzy stopnie), +2 za Centrum Pokemon i Salę
  // treningową, które stoją zawsze (etap 6).
  start.kafle === start.postawione.filter((x) => !x.startsWith('ratusz')).length + 1 + 2,
  `${start.kafle} brył, postawione: ${start.postawione.join(', ')}`
);
sprawdz('Centrum Pokemon stoi od początku', (await gdzieBudynek('centrum'))?.stoi === true);
sprawdz('Sala treningowa stoi od początku', (await gdzieBudynek('sala'))?.stoi === true);
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
  const z = s.stan.obiekty.find((o) => o.rodzaj === 'zamek' && o.wlasciciel === 'gracz');
  return {
    przed: przed.dostepne,
    po: [...(z.dostepne ?? [])],
    kasa: przed.kasa,
    kasaPo: s.stan.skarbiec.pokeball,
  };
}, przedNoca);
sprawdz(
  'w postawionych rezerwatach przybywa młodych stworków',
  jutro.po[0] > jutro.przed[0] && jutro.po[1] > jutro.przed[1],
  `${jutro.przed.join(',')} → ${jutro.po.join(',')}`
);
sprawdz(
  'w niepostawionych siedliskach nie przybywa nic',
  jutro.po[3] === jutro.przed[3] && jutro.po[5] === jutro.przed[5]
);
const zasady = await page.evaluate(async () => {
  const m = await import('/src/data/mapa.ts');
  return { przyrost: m.PRZYROST_ODDZIALU, koszt: m.KOSZT_ODDZIALU, maks: m.MAKS_CZEKA };
});
sprawdz(
  `fort podniósł przyrost powyżej gołej tabeli (${zasady.przyrost[0].toFixed(2)} i ${zasady.przyrost[1].toFixed(2)} na dzień)`,
  jutro.po[0] - jutro.przed[0] > zasady.przyrost[0] + 1e-9 && jutro.po[1] - jutro.przed[1] > zasady.przyrost[1] + 1e-9,
  `+${(jutro.po[0] - jutro.przed[0]).toFixed(3)}, +${(jutro.po[1] - jutro.przed[1]).toFixed(3)}`
);
sprawdz('w rezerwacie czeka najwyżej MAKS_CZEKA', jutro.po.every((x) => x <= zasady.maks), jutro.po.join(','));
sprawdz(
  'ratusz dokłada pokeballe',
  jutro.kasaPo > jutro.kasa,
  `${jutro.kasa} → ${jutro.kasaPo}`
);

// Sufit: pełny rezerwat nie rośnie dalej, niepełny dochodzi najwyżej do sufitu.
const sufit = await page.evaluate(async (maks) => {
  const s = window.__game.scene.getScene('adventure');
  const z = s.stan.obiekty.find((o) => o.rodzaj === 'zamek' && o.wlasciciel === 'gracz');
  z.dostepne[0] = maks - 0.1;
  s.koniecTury();
  await new Promise((r) => setTimeout(r, 600));
  return { po0: z.dostepne[0] };
}, zasady.maks);
sprawdz('rezerwat nie przerasta sufitu MAKS_CZEKA', Math.abs(sufit.po0 - zasady.maks) < 1e-9, `${sufit.po0}`);

// --- werbunek z siedliska ---
console.log('\n=== werbunek ===');
// Wracamy do miasta tą samą drogą co gracz: wejściem na pole zamku.
await page.evaluate(() => {
  const s = window.__game.scene.getScene('adventure');
  const z = s.stan.obiekty.find((o) => o.rodzaj === 'zamek' && o.wlasciciel === 'gracz');
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
  // Jeden stworek danego gatunku: drużyna startowa ma już Flamira, więc
  // najpierw go wypuszczamy — inaczej rezerwat słusznie odmówi.
  t.stan.bohater.armia = t.stan.bohater.armia.map((o) => (o && o.tier === 1 ? null : o));
  t.pokazBudynek(b);
  const ilu = (a) => a.filter(Boolean).length;
  const puste = t.stan.bohater.armia.map((o) => !o);
  const przed = {
    armia: ilu(t.stan.bohater.armia),
    zapas: t.zamek.dostepne[1],
    kasa: t.stan.skarbiec.pokeball,
  };
  t.dzialaj();
  const nowy = t.stan.bohater.armia.find((o, i) => o && puste[i]) ?? null;
  return {
    przed,
    po: {
      armia: ilu(t.stan.bohater.armia),
      zapas: t.zamek.dostepne[1],
      kasa: t.stan.skarbiec.pokeball,
    },
    nowy: nowy && { ile: nowy.ile, poziom: nowy.poziom, tier: nowy.tier, nazwa: nowy.nazwa },
    komunikat: t.komunikat.text,
    // Drugi Flamir: rezerwat ma jeszcze kogoś, ale gatunek już jest.
    drugi: (() => {
      const przedDrugim = ilu(t.stan.bohater.armia);
      t.zamek.dostepne[1] = 1;
      t.dzialaj();
      return { armia: ilu(t.stan.bohater.armia) - przedDrugim, komunikat: t.komunikat.text };
    })(),
  };
});
sprawdz(
  'drugiego stworka tego samego gatunku rezerwat nie zaprasza',
  kupno.drugi.armia === 0 && /Masz już/.test(kupno.drugi.komunikat),
  kupno.drugi.komunikat
);
sprawdz(
  'kliknięcie w rezerwat zaprasza JEDNEGO stworka z tego właśnie poziomu',
  kupno.po.armia === kupno.przed.armia + 1 && kupno.nowy?.tier === 1 && kupno.nowy?.ile === 1,
  `drużyna ${kupno.przed.armia} → ${kupno.po.armia}, ${JSON.stringify(kupno.nowy)}`
);
sprawdz('zaproszony jest młody (poz. 5)', kupno.nowy?.poziom === 5, kupno.komunikat);
sprawdz(
  'w rezerwacie czeka o jednego mniej',
  Math.abs(kupno.po.zapas - (kupno.przed.zapas - 1)) < 1e-9,
  `${kupno.przed.zapas} → ${kupno.po.zapas}`
);
sprawdz(
  'zaproszenie kosztuje KOSZT_ODDZIALU tego poziomu',
  kupno.przed.kasa - kupno.po.kasa === zasady.koszt[1],
  `${kupno.przed.kasa} → ${kupno.po.kasa} (koszt ${zasady.koszt[1]})`
);

// Ułamek młodego to jeszcze nie stworek.
const zaMalo = await page.evaluate(() => {
  const t = window.__game.scene.getScene('zamek');
  t.zamek.dostepne[0] = 0.9;
  t.stan.skarbiec.pokeball = 300;
  const ilu = (a) => a.filter(Boolean).length;
  const przed = { armia: ilu(t.stan.bohater.armia) + ilu(t.garnizon), kasa: t.stan.skarbiec.pokeball };
  t.pokazBudynek(t.profil.budynki.find((x) => x.id === 'siedlisko1'));
  t.dzialaj();
  return {
    przed,
    po: { armia: ilu(t.stan.bohater.armia) + ilu(t.garnizon), kasa: t.stan.skarbiec.pokeball, zapas: t.zamek.dostepne[0] },
    komunikat: t.komunikat.text,
  };
});
sprawdz(
  'przy 0,9 czekającego nie da się nikogo zaprosić',
  zaMalo.po.armia === zaMalo.przed.armia && zaMalo.po.kasa === zaMalo.przed.kasa && zaMalo.po.zapas === 0.9,
  zaMalo.komunikat
);

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
