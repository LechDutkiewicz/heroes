/**
 * Sonda arytmetyki armii: przenoszenie, scalanie, zamiana i podział stosów.
 *
 * Bez przeglądarki i bez Phasera, bo to jest czysta arytmetyka na tablicy
 * siedmiu slotów — a przypadków brzegowych jest tu więcej, niż da się
 * wyklikać myszą: ostatni stos, pełne sloty, podział na skrót przy jednym
 * stworku, podział do slotu zajętego innym gatunkiem.
 *
 * Na końcu leci próba losowa: kilkadziesiąt tysięcy losowych ruchów, po
 * każdym sprawdzenie dwóch niezmienników — łączna liczba stworków się nie
 * zmienia i bohater nigdy nie zostaje bez armii. To jest właściwy test tej
 * warstwy: pojedyncze przypadki sprawdzają, że rozumiem zasady, a próba
 * losowa łapie to, czego nie przewidziałem.
 *
 *   npx tsx tools/probe-armia.ts
 */

import {
  SLOTY_ARMII,
  dolacz,
  ileNaSkrot,
  lacznie,
  maksPodzialu,
  podziel,
  przenies,
  pustaArmia,
  zajete,
  zamiar,
  znormalizuj,
  zywe,
  type Armia,
} from '../src/data/armia';
import type { Oddzial } from '../src/data/mapa';

let bledy = 0;
const sprawdz = (nazwa: string, warunek: boolean, szczegol = '') => {
  if (!warunek) bledy++;
  console.log(`${warunek ? 'OK  ' : 'BŁĄD'} ${nazwa}${szczegol ? ` — ${szczegol}` : ''}`);
};

const od = (sprite: string, ile: number, tier = 0): Oddzial => ({
  sprite,
  nazwa: sprite,
  ile,
  frakcja: 'bor',
  tier,
});

const armia = (...wpisy: Array<Oddzial | null>): Armia => {
  const a = pustaArmia();
  wpisy.forEach((o, i) => (a[i] = o));
  return a;
};

console.log('--- przenoszenie ---');
{
  const a = armia(od('a', 10), null, od('b', 4));
  const w = przenies(a, 0, 1);
  sprawdz('przeniesienie na pusty slot', w.ok && a[1]?.sprite === 'a' && a[0] === null);
  sprawdz('liczebność bez zmian', lacznie(a) === 14);
}
{
  const a = armia(od('a', 10), od('b', 4));
  przenies(a, 0, 1);
  sprawdz('zamiana slotów różnych gatunków', a[0]?.sprite === 'b' && a[1]?.sprite === 'a');
  sprawdz('nic nie ginie przy zamianie', lacznie(a) === 14);
}
{
  const a = armia(od('a', 10), od('a', 4));
  przenies(a, 0, 1);
  sprawdz('scalenie tego samego gatunku', a[1]?.ile === 14 && a[0] === null);
  sprawdz('po scaleniu został jeden stos', zajete(a) === 1);
}
{
  const a = armia(od('a', 10));
  sprawdz('przeniesienie w to samo miejsce odrzucone', !przenies(a, 0, 0).ok);
  sprawdz('przeniesienie z pustego odrzucone', !przenies(a, 3, 4).ok);
  sprawdz('slot poza armią odrzucony', !przenies(a, 0, SLOTY_ARMII).ok);
}
{
  // Ostatni stos WOLNO przenieść: armia dalej istnieje, zmienia się tylko
  // miejsce. To odróżnia przeniesienie od podziału.
  const a = armia(od('a', 3));
  const w = przenies(a, 0, 5);
  sprawdz('ostatni stos wolno przenieść', w.ok && a[5]?.ile === 3 && zajete(a) === 1);
}

console.log('--- podział ---');
{
  const a = armia(od('a', 10));
  const w = podziel(a, 0, 1, 4);
  sprawdz('podział na pusty slot', w.ok && a[0]?.ile === 6 && a[1]?.ile === 4);
  sprawdz('podział zachowuje gatunek', a[1]?.sprite === 'a' && a[1]?.tier === a[0]?.tier);
}
{
  const a = armia(od('a', 10));
  sprawdz('podział całego stosu na pusty odrzucony', !podziel(a, 0, 1, 10).ok, 'zostałby pusty stos');
  sprawdz('podział zera odrzucony', !podziel(a, 0, 1, 0).ok);
  sprawdz('podział ułamka odrzucony', !podziel(a, 0, 1, 1.5).ok);
  sprawdz('stos nietknięty po odmowie', a[0]?.ile === 10 && a[1] === null);
}
{
  // Do slotu z tym samym gatunkiem wolno przelać WSZYSTKO: armia nie traci
  // ani stworka, źródło po prostu znika.
  const a = armia(od('a', 10), od('a', 2));
  const w = podziel(a, 0, 1, 10);
  sprawdz('przelanie całości na ten sam gatunek', w.ok && a[0] === null && a[1]?.ile === 12);
}
{
  const a = armia(od('a', 10), od('b', 2));
  sprawdz('podział na obcy gatunek odrzucony', !podziel(a, 0, 1, 3).ok);
}
{
  const a = armia(od('a', 1));
  sprawdz('jeden stworek nie ma się jak podzielić', maksPodzialu(a, 0, 1) === 0);
  sprawdz('zamiar dla jednego stworka to przeniesienie', zamiar(a, 0, 1, 'brak').rodzaj === 'przenies');
}

console.log('--- skróty (Shift, Ctrl) ---');
{
  const a = armia(od('a', 10));
  sprawdz('Shift dzieli na pół', ileNaSkrot(a, 0, 1, 'polowa') === 5);
  sprawdz('Ctrl odkłada jednego', ileNaSkrot(a, 0, 1, 'jeden') === 1);
}
{
  // Zaokrąglenie w DÓŁ: większa połowa zostaje w źródle, jak w Heroes 3.
  const a = armia(od('a', 7));
  sprawdz('nieparzysty stos: 7 → 4 i 3', ileNaSkrot(a, 0, 1, 'polowa') === 3);
  podziel(a, 0, 1, ileNaSkrot(a, 0, 1, 'polowa'));
  sprawdz('po podziale 4 zostaje, 3 odchodzi', a[0]?.ile === 4 && a[1]?.ile === 3);
}
{
  const a = armia(od('a', 1));
  sprawdz('Shift na jednym stworku nic nie daje', ileNaSkrot(a, 0, 1, 'polowa') === 0);
  sprawdz('zamiar ze skrótem przy jednym: nic', zamiar(a, 0, 1, 'jeden').rodzaj === 'nic');
}
{
  const a = armia(od('a', 2));
  sprawdz('Shift przy dwóch: jeden idzie', ileNaSkrot(a, 0, 1, 'polowa') === 1);
}

console.log('--- zamiar (co scena ma pokazać przed puszczeniem) ---');
{
  const a = armia(od('a', 10), od('a', 3), od('b', 5));
  sprawdz('pusty cel → okno podziału', zamiar(a, 0, 4, 'brak').rodzaj === 'okno');
  sprawdz('ten sam gatunek → scalenie', zamiar(a, 0, 1, 'brak').rodzaj === 'scal');
  sprawdz('inny gatunek → zamiana', zamiar(a, 0, 2, 'brak').rodzaj === 'zamien');
  const skrot = zamiar(a, 0, 4, 'polowa');
  sprawdz('Shift omija okno', skrot.rodzaj === 'podziel' && skrot.ile === 5);
}

console.log('--- werbunek i normalizacja ---');
{
  const a = armia(od('a', 5));
  dolacz(a, od('a', 3));
  sprawdz('werbunek dokłada do istniejącego stosu', a[0]?.ile === 8 && zajete(a) === 1);
  for (let i = 0; i < 6; i++) dolacz(a, od(`x${i}`, 1));
  sprawdz('siedem slotów się zapełnia', zajete(a) === SLOTY_ARMII);
  sprawdz('ósmy gatunek nie wchodzi', !dolacz(a, od('y', 1)));
  sprawdz('odmowa nic nie psuje', zajete(a) === SLOTY_ARMII && lacznie(a) === 14);
}
{
  // Stara, gęsta armia z zapisanego stanu gry: musi wejść w sloty bez straty.
  const stara = [od('a', 5), od('b', 2), od('c', 1), od('d', 9)];
  const a = znormalizuj(stara);
  sprawdz('gęsta lista wchodzi w sloty', a.length === SLOTY_ARMII && zajete(a) === 4);
  sprawdz('normalizacja nic nie gubi', lacznie(a) === 17);
  sprawdz('pusty wynik bitwy nie wywraca', znormalizuj(undefined).length === SLOTY_ARMII);
  sprawdz('wybite stosy wypadają', zajete(znormalizuj([od('a', 0), od('b', 3)])) === 1);
  // Dziewięć gatunków z werbunku sprzed zmiany — dwa ostatnie nie mają gdzie
  // wejść, ale siedem pierwszych musi ocaleć w komplecie.
  const dziewiec = Array.from({ length: 9 }, (_, i) => od(`g${i}`, i + 1));
  sprawdz('nadmiar nie wywraca normalizacji', zajete(znormalizuj(dziewiec)) === SLOTY_ARMII);
}

console.log('--- próba losowa: 40 000 ruchów ---');
{
  let ziarno = 12345;
  const los = (n: number) => {
    ziarno = (ziarno * 1103515245 + 12345) & 0x7fffffff;
    return ziarno % n;
  };

  const gatunki = ['a', 'b', 'c', 'd'];
  const a = pustaArmia();
  gatunki.forEach((g, i) => (a[i] = od(g, 10 + i * 7)));
  const suma0 = lacznie(a);

  let zmian = 0;
  let podzialow = 0;
  let scalen = 0;
  let bezArmii = 0;
  let zgubione = 0;
  let zdublowane = 0;

  for (let k = 0; k < 40000; k++) {
    const z = los(SLOTY_ARMII);
    const doc = los(SLOTY_ARMII);
    const skrot = (['brak', 'polowa', 'jeden'] as const)[los(3)];
    const co = zamiar(a, z, doc, skrot);
    const przed = lacznie(a);

    if (co.rodzaj === 'podziel') {
      if (podziel(a, z, doc, co.ile ?? 1).ok) {
        zmian++;
        podzialow++;
      }
    } else if (co.rodzaj === 'okno') {
      // Okno w scenie kończy się podziałem o dowolnej dozwolonej wielkości —
      // sonda losuje ją z tego samego zakresu, co suwak.
      const maks = maksPodzialu(a, z, doc);
      if (maks >= 1 && podziel(a, z, doc, 1 + los(maks)).ok) {
        zmian++;
        podzialow++;
      }
    } else if (co.rodzaj !== 'nic') {
      if (przenies(a, z, doc).ok) {
        zmian++;
        if (co.rodzaj === 'scal') scalen++;
      }
    }

    if (lacznie(a) !== przed) zgubione++;
    if (zajete(a) === 0) bezArmii++;
    // Ten sam gatunek nie może stać w dwóch slotach: scalenie jest jedyną
    // drogą, którą stosy się spotykają, a rozdzielony stos musi dać się
    // z powrotem złożyć. Dwa stosy „a" to cichy błąd, który w grze wychodzi
    // dopiero jako niescalalna armia.
    const widziane = new Set<string>();
    for (const o of zywe(a)) {
      if (widziane.has(o.sprite)) zdublowane++;
      widziane.add(o.sprite);
    }
  }

  sprawdz('łączna liczba stworków nietknięta', lacznie(a) === suma0, `${suma0} → ${lacznie(a)}`);
  sprawdz('żaden ruch nie zgubił stworka', zgubione === 0, `${zgubione} razy`);
  sprawdz('bohater nigdy bez armii', bezArmii === 0, `${bezArmii} razy`);
  sprawdz('ruchy naprawdę się działy', zmian > 10000, `${zmian} zmian`);
  sprawdz('podziały się działy', podzialow > 3000, `${podzialow}`);
  sprawdz('scalenia się działy', scalen > 500, `${scalen}`);
  // Dublowanie JEST dozwolone (podział tworzy dwa stosy tego samego gatunku)
  // — sprawdzamy tylko, że da się je z powrotem scalić, a nie że go nie ma.
  const kopia = znormalizuj(a.map((o) => (o ? { ...o } : null)));
  for (let i = 0; i < SLOTY_ARMII; i++)
    for (let j = i + 1; j < SLOTY_ARMII; j++)
      if (kopia[i] && kopia[j] && kopia[i]!.sprite === kopia[j]!.sprite) przenies(kopia, j, i);
  sprawdz(
    'rozbite stosy dają się z powrotem złożyć',
    zajete(kopia) <= gatunki.length && lacznie(kopia) === suma0,
    `${zajete(kopia)} stosów, ${zdublowane > 0 ? 'dublowanie wystąpiło' : 'bez dublowania'}`
  );
}

console.log(bledy === 0 ? '\nWszystko przeszło.' : `\n${bledy} sprawdzeń nie przeszło.`);
process.exit(bledy === 0 ? 0 : 1);
