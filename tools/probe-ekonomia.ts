// Czy ekonomia się spina: czy dochód z CAŁEJ mapy wystarcza na armię i miasto.
//
// Po co: `probe-zamki.ts` sprawdza samo drzewko budynków i robi to na
// zmyślonym dochodzie („+4 pokeballe dziennie"). Dlatego przez cały czas
// świeciło na zielono, choć w grze nie dało się ani wykupić przyrostu, ani
// rozbudować miasta: prawdziwa mapa dawała 30 pokeballi dziennie, a sam dzienny
// przyrost oddziałów kosztował 95. Ta próba liczy jedno i drugie z TYCH SAMYCH
// danych, z których gra buduje planszę.
//
//   npx tsx tools/probe-ekonomia.ts

import { KOSZT_ODDZIALU, PRZYROST_ODDZIALU, dochod, type StanMapy } from '../src/data/mapa';
import { planszaPrzygody } from '../src/data/plansza';
import {
  moznaBudowac,
  profilZamku,
  przyrostZamku,
  stacNas,
  zaplac,
  type Budynek,
} from '../src/data/zamki';
import type { Skarbiec } from '../src/data/mapa';

let bledy = 0;
const sprawdz = (co: string, ok: boolean, szczegol = '') => {
  if (!ok) bledy++;
  console.log(`  ${ok ? 'OK  ' : 'ŹLE '} ${co}${szczegol ? ` — ${szczegol}` : ''}`);
};

/** Ile pokeballi dziennie kosztuje wykupienie całego przyrostu miasta. */
const kosztPrzyrostu = (postawione: string[]) =>
  przyrostZamku(postawione, PRZYROST_ODDZIALU).reduce(
    (a, ile, tier) => a + ile * KOSZT_ODDZIALU[tier],
    0
  );

const stan = planszaPrzygody();
const zamek = stan.obiekty.find((o) => o.rodzaj === 'zamek' && o.nasz)!;
const frakcja = zamek.frakcjaZamku ?? 'bor';
const profil = profilZamku(frakcja);
const wszystkie = profil.budynki.map((b) => b.id);

// ---------------------------------------------------------------------------
// 1. Skala: dochód kontra utrzymanie armii
// ---------------------------------------------------------------------------
console.log('\n=== dochód kontra armia ===');

/** Wszystkie kopalnie zajęte — górna granica tego, co daje mapa. */
const zWszystkimKopalniami = (s: StanMapy) => {
  for (const o of s.obiekty) if (o.rodzaj === 'kopalnia') o.nasz = true;
  return s;
};
zWszystkimKopalniami(stan);

const tylkoKopalnie = { ...dochod(stan) };
zamek.postawione = wszystkie;
const pelny = dochod(stan);
const upkeep = kosztPrzyrostu(wszystkie);

console.log(`  przyrost całego miasta kosztuje ${upkeep} pokeballi dziennie`);
console.log(`  mapa + startowe miasto: ${tylkoKopalnie.pokeball} pokeballi dziennie`);
console.log(`  mapa + rozbudowane miasto: ${pelny.pokeball} pokeballi dziennie`);

sprawdz(
  'sama mapa (bez rozbudowy) pokrywa co najmniej połowę przyrostu',
  (tylkoKopalnie.pokeball ?? 0) >= upkeep * 0.5,
  `${tylkoKopalnie.pokeball} z ${upkeep}`
);
sprawdz(
  'rozbudowane miasto pokrywa cały przyrost i zostaje na budowanie',
  (pelny.pokeball ?? 0) >= upkeep * 1.3,
  `${pelny.pokeball} z ${upkeep}`
);
sprawdz(
  'ale nie na tyle, żeby pieniądze przestały być wyborem (poniżej trzykrotności)',
  (pelny.pokeball ?? 0) < upkeep * 3,
  `${pelny.pokeball} z ${upkeep}`
);

// ---------------------------------------------------------------------------
// 2. Każdy surowiec potrzebny do rozbudowy ma na mapie źródło
// ---------------------------------------------------------------------------
console.log('\n=== surowce rzadkie mają skąd płynąć ===');
const potrzebne: Partial<Skarbiec> = {};
for (const b of profil.budynki)
  for (const [co, ile] of Object.entries(b.koszt) as [keyof Skarbiec, number][])
    potrzebne[co] = (potrzebne[co] ?? 0) + ile;

for (const co of Object.keys(potrzebne) as (keyof Skarbiec)[]) {
  if (co === 'pokeball') continue;
  const zKopalni = pelny[co] ?? 0;
  const zeStosow = stan.obiekty
    .filter((o) => o.rodzaj === 'surowiec' && o.surowiec === co)
    .reduce((a, o) => a + (o.ile ?? 0), 0);
  sprawdz(
    `${co}: da się zebrać ${potrzebne[co]} na rozbudowę`,
    zKopalni > 0 || zeStosow >= (potrzebne[co] ?? 0),
    `${zKopalni}/dzień + ${zeStosow} ze stosów, trzeba ${potrzebne[co]}`
  );
}

// ---------------------------------------------------------------------------
// 3. Pełna pętla: buduj i werbuj naraz, na prawdziwym dochodzie
// ---------------------------------------------------------------------------
console.log('\n=== rozbudowa RAZEM z werbunkiem ===');
const swiezy = zWszystkimKopalniami(planszaPrzygody());
const mojZamek = swiezy.obiekty.find((o) => o.rodzaj === 'zamek' && o.nasz)!;
const skarbiec = swiezy.skarbiec;
const stoi = [...(mojZamek.postawione ?? [])];
let dzien = 0;
let kupionych = 0;
while (dzien++ < 200 && stoi.length < profil.budynki.length) {
  mojZamek.postawione = stoi;
  for (const [co, ile] of Object.entries(dochod(swiezy)) as [keyof Skarbiec, number][])
    skarbiec[co] += ile;

  // Gracz najpierw wykupuje dzienny przyrost — armia jest po to, żeby nią grać —
  // a dopiero z reszty buduje. To jest ta kolejność, na której poprzednia
  // ekonomia się wykładała.
  const przyrost = przyrostZamku(stoi, PRZYROST_ODDZIALU);
  for (let tier = 5; tier >= 0; tier--) {
    const ile = Math.min(przyrost[tier], Math.floor(skarbiec.pokeball / KOSZT_ODDZIALU[tier]));
    skarbiec.pokeball -= ile * KOSZT_ODDZIALU[tier];
    kupionych += ile;
  }

  let zbudowano = true;
  while (zbudowano) {
    zbudowano = false;
    const kandydat: Budynek | undefined = profil.budynki.find(
      (b) => moznaBudowac(b, stoi) && stacNas(skarbiec, b.koszt)
    );
    if (kandydat) {
      zaplac(skarbiec, kandydat.koszt);
      stoi.push(kandydat.id);
      zbudowano = true;
    }
  }
}
sprawdz(
  'całe miasto staje, mimo że armia jest wykupywana codziennie',
  stoi.length === profil.budynki.length,
  `${stoi.length} z ${profil.budynki.length} budynków, ${dzien} dni, ${kupionych} oddziałów`
);
sprawdz(
  'rozbudowa zajmuje 20–120 dni (jest co robić, ale nie w nieskończoność)',
  dzien >= 20 && dzien <= 120,
  `${dzien} dni`
);

console.log(bledy === 0 ? '\nEKONOMIA SIĘ SPINA' : `\nBŁĘDÓW: ${bledy}`);
process.exit(bledy === 0 ? 0 : 1);
