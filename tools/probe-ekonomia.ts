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
import { SKRZYNIE } from '../src/data/zasady-h3';
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
const zamek = stan.obiekty.find((o) => o.rodzaj === 'zamek' && o.wlasciciel === 'gracz')!;
const frakcja = zamek.frakcjaZamku ?? 'bor';
const profil = profilZamku(frakcja);
const wszystkie = profil.budynki.map((b) => b.id);

// ---------------------------------------------------------------------------
// 1. Skala: dochód kontra utrzymanie armii
// ---------------------------------------------------------------------------
console.log('\n=== dochód kontra armia ===');

/** Wszystkie kopalnie zajęte — górna granica tego, co daje mapa. */
const zWszystkimKopalniami = (s: StanMapy) => {
  for (const o of s.obiekty) if (o.rodzaj === 'kopalnia') o.wlasciciel = 'gracz';
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

/**
 * Ile dni zajmuje postawienie całego miasta, jeśli codziennie najpierw
 * wykupuje się przyrost, a dopiero z reszty buduje.
 *
 * `czyjeKopalnie` mówi, KTÓRE kopalnie gracz ma w rękach. To nie jest detal:
 * na planszy 72 × 72 kopalnie leżą w trzech pasach i te za grzbietem zdobywa
 * się dopiero po przełamaniu straży. Liczenie wszystkich naraz daje dolną
 * granicę czasu rozbudowy — czyli odpowiedź na inne pytanie niż „czy w drugim
 * tygodniu jest jeszcze co robić”.
 */
function dniRozbudowy(czyjeKopalnie: (o: { y: number }) => boolean) {
  const s = planszaPrzygody();
  for (const o of s.obiekty) if (o.rodzaj === 'kopalnia' && czyjeKopalnie(o)) o.wlasciciel = 'gracz';

  // Jednorazowe znaleziska z tego samego kawałka mapy: stosy surowca i skrzynie.
  // Bez nich symulacja liczy sam dochód z kopalń i wychodzi jej, że pierwszy
  // miesiąc jest głodowy — a w Heroes 3 to właśnie zbieranie leżących rzeczy
  // niesie pierwsze dwa tygodnie. Rozkładamy je na 21 dni, bo tyle mniej więcej
  // zajmuje objechanie własnego pasa mapy.
  const ZBIERANIE_DNI = 21;
  const znaleziska: Partial<Record<keyof Skarbiec, number>> = {};
  for (const o of s.obiekty) {
    if (!czyjeKopalnie(o)) continue;
    if (o.rodzaj === 'surowiec' && o.surowiec) {
      znaleziska[o.surowiec] = (znaleziska[o.surowiec] ?? 0) + (o.ile ?? 0);
    } else if (o.rodzaj === 'skrzynia') {
      // Skrzynia daje wybór; liczymy wariant pieniężny, bo to on wchodzi
      // do ekonomii. Środkowy wariant, żeby nie liczyć najlepszego przypadku.
      znaleziska.pokeball = (znaleziska.pokeball ?? 0) + SKRZYNIE[1].pokeballe;
    }
  }
  const zamekGracza = s.obiekty.find((o) => o.rodzaj === 'zamek' && o.wlasciciel === 'gracz')!;
  const skarbiec = s.skarbiec;
  const stoi = [...(zamekGracza.postawione ?? [])];
  let dzien = 0;
  let kupionych = 0;
  while (dzien++ < 400 && stoi.length < profil.budynki.length) {
    zamekGracza.postawione = stoi;
    for (const [co, ile] of Object.entries(dochod(s)) as [keyof Skarbiec, number][])
      skarbiec[co] += ile;
    if (dzien <= ZBIERANIE_DNI)
      for (const [co, ile] of Object.entries(znaleziska) as [keyof Skarbiec, number][])
        skarbiec[co] += ile / ZBIERANIE_DNI;

    // Gracz werbuje i buduje NARAZ, a nie jedno kosztem drugiego. Wcześniej
    // symulacja wykupywała codziennie cały przyrost, zanim cokolwiek postawiła
    // — czyli grała tak, jak nie gra nikt: przy dochodzie niższym niż koszt
    // pełnego przyrostu miasto nie stawało NIGDY, niezależnie od tego, jak
    // dobrze rozstawione są kopalnie. Sprawdzenie mierzyło wtedy model, a nie
    // mapę. Teraz na werbunek idzie połowa skarbca, druga połowa zostaje na
    // budowę — tak wygląda pierwszy miesiąc normalnej gry.
    const przyrost = przyrostZamku(stoi, PRZYROST_ODDZIALU);
    let naArmie = Math.floor(skarbiec.pokeball / 2);
    for (let tier = 5; tier >= 0; tier--) {
      const ile = Math.min(przyrost[tier], Math.floor(naArmie / KOSZT_ODDZIALU[tier]));
      naArmie -= ile * KOSZT_ODDZIALU[tier];
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
  return { dzien, kupionych, postawione: stoi.length };
}

// Pas gracza kończy się na wierszu 46 — dalej na północ zaczyna się pas sporny
// (patrz `tools/generuj_mape.py`). Kopalnie z doliny to jedyne, które da się
// mieć w pierwszym tygodniu, bez przełamywania straży granicznej.
const dolina = dniRozbudowy((o) => o.y > 46);
const calamapa = dniRozbudowy(() => true);
console.log(`  z kopalń doliny: ${dolina.dzien} dni, ${dolina.kupionych} oddziałów`);
console.log(`  z kopalń całej mapy: ${calamapa.dzien} dni, ${calamapa.kupionych} oddziałów`);

sprawdz(
  'całe miasto staje, mimo że armia jest wykupywana codziennie',
  dolina.postawione === profil.budynki.length,
  `${dolina.postawione} z ${profil.budynki.length} budynków`
);
// UWAGA, JAK TO CZYTAĆ: symulacja jest OPTYMISTYCZNA. Bohater zbiera wszystko
// z własnego pasa w trzy tygodnie, nie przegrywa ani jednej bitwy i nie traci
// dni na dojazdy. To jest DOLNA granica czasu rozbudowy — prawdziwa gra, ze
// strażami przy połowie znalezisk, wypada mniej więcej dwa razy dłużej.
// Dlatego próg to 12–60 dni, a nie 20–120 jak przy poprzedniej planszy, gdzie
// symulacja nie liczyła znalezisk w ogóle.
sprawdz(
  'na samej dolinie rozbudowa zajmuje 12–60 dni (jest co robić, ale nie w nieskończoność)',
  dolina.dzien >= 12 && dolina.dzien <= 60,
  `${dolina.dzien} dni`
);
// Zdobycie pasa spornego i krainy wroga ma NAPRAWDĘ przyspieszać rozbudowę —
// inaczej wyprawa na północ jest tylko zwiedzaniem. Ale nie na tyle, żeby
// miasto stawało w tydzień i przestawało być wyborem.
sprawdz(
  'zajęcie wszystkich kopalń skraca rozbudowę co najmniej o jedną trzecią',
  calamapa.dzien * 3 <= dolina.dzien * 2,
  `${calamapa.dzien} zamiast ${dolina.dzien} dni`
);
sprawdz(
  'ale nawet z całą mapą i wszystkimi znaleziskami miasto nie staje w trzy dni',
  calamapa.dzien >= 5,
  `${calamapa.dzien} dni`
);

console.log(bledy === 0 ? '\nEKONOMIA SIĘ SPINA' : `\nBŁĘDÓW: ${bledy}`);
process.exit(bledy === 0 ? 0 : 1);
