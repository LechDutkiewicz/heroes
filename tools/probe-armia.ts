/**
 * Sonda arytmetyki drużyny: przenoszenie i zamiana stworków.
 *
 * Od przebudowy „trener zamiast armii" (`PROJEKT-TRENERZY.md`) slot to jeden
 * stworek z poziomem: nic się nie scala i nic nie dzieli. Sonda pilnuje, że
 * stare gesty (Shift, Ctrl, upuszczenie na ten sam gatunek) nie robią już
 * z dwóch postaci jednej.
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

/** Stworek: `imie` odróżnia postacie tego samego gatunku. */
const od = (sprite: string, poziom = 5, imie = sprite): Oddzial => ({
  sprite,
  nazwa: imie,
  ile: 1,
  frakcja: 'bor',
  tier: 0,
  poziom,
});

const armia = (...wpisy: Array<Oddzial | null>): Armia => {
  const a = pustaArmia();
  wpisy.forEach((o, i) => (a[i] = o));
  return a;
};

console.log('--- przenoszenie i zamiana ---');
{
  const a = armia(od('a'), null, od('b'));
  const w = przenies(a, 0, 1);
  sprawdz('przeniesienie na pusty slot', w.ok && a[1]?.sprite === 'a' && a[0] === null);
  sprawdz('liczba stworków bez zmian', lacznie(a) === 2);
}
{
  const a = armia(od('a'), od('b'));
  przenies(a, 0, 1);
  sprawdz('zamiana slotów różnych gatunków', a[0]?.sprite === 'b' && a[1]?.sprite === 'a');
}
{
  // Dwa Pyroko to dwie postacie: upuszczenie jednego na drugiego zamienia
  // je miejscami, a nie zlewa w jeden stos z sumą poziomów.
  const a = armia(od('a', 5, 'Pierwszy'), od('a', 12, 'Drugi'));
  const co = zamiar(a, 0, 1, 'brak').rodzaj;
  przenies(a, 0, 1);
  sprawdz('ten sam gatunek → zamiana, nie scalenie', co === 'zamien' && zajete(a) === 2);
  sprawdz('poziomy jadą ze swoimi stworkami', a[0]?.poziom === 12 && a[1]?.poziom === 5);
}
{
  const a = armia(od('a'));
  sprawdz('przeniesienie w to samo miejsce odrzucone', !przenies(a, 0, 0).ok);
  sprawdz('przeniesienie z pustego odrzucone', !przenies(a, 3, 4).ok);
  sprawdz('slot poza armią odrzucony', !przenies(a, 0, SLOTY_ARMII).ok);
  const w = przenies(a, 0, 5);
  sprawdz('ostatniego stworka wolno przestawić', w.ok && a[5]?.sprite === 'a' && zajete(a) === 1);
}

console.log('--- podział nie istnieje ---');
{
  const a = armia(od('a'), od('a'));
  sprawdz('stworka nie da się podzielić', maksPodzialu(a, 0, 2) === 0 && maksPodzialu(a, 0, 1) === 0);
  sprawdz('Shift nic nie robi', ileNaSkrot(a, 0, 2, 'polowa') === 0 && zamiar(a, 0, 2, 'polowa').rodzaj === 'nic');
  sprawdz('Ctrl nic nie robi', ileNaSkrot(a, 0, 2, 'jeden') === 0);
  sprawdz('Alt na pusty slot przenosi', zamiar(a, 0, 2, 'okno').rodzaj === 'przenies');
}

console.log('--- nowy stworek i normalizacja ---');
{
  const a = armia(od('a'));
  dolacz(a, od('a', 5, 'Drugi'));
  sprawdz('nowy stworek tego samego gatunku zajmuje własny slot', zajete(a) === 2);
  for (let i = 0; i < 5; i++) dolacz(a, od(`x${i}`));
  sprawdz('siedem slotów się zapełnia', zajete(a) === SLOTY_ARMII);
  sprawdz('ósmy stworek nie wchodzi', !dolacz(a, od('y')));
  sprawdz('odmowa nic nie psuje', zajete(a) === SLOTY_ARMII && lacznie(a) === SLOTY_ARMII);
}
{
  const a = znormalizuj([od('a'), od('b'), od('c'), od('d')]);
  sprawdz('gęsta lista wchodzi w sloty', a.length === SLOTY_ARMII && zajete(a) === 4);
  sprawdz('pusty wynik nie wywraca', znormalizuj(undefined).length === SLOTY_ARMII);
  sprawdz('nadmiar nie wywraca normalizacji', zajete(znormalizuj(Array.from({ length: 9 }, (_, i) => od(`g${i}`)))) === SLOTY_ARMII);
}

console.log('--- próba losowa: 40 000 ruchów ---');
{
  let ziarno = 12345;
  const los = (n: number) => {
    ziarno = (ziarno * 1103515245 + 12345) & 0x7fffffff;
    return ((ziarno >>> 15) & 0xffff) % n;
  };
  const a = pustaArmia();
  ['a', 'a', 'b', 'c', 'd'].forEach((g, i) => (a[i] = od(g, 5 + i, `${g}${i}`)));
  const imiona = () => zywe(a).map((o) => `${o.nazwa}@${o.poziom}`).sort().join(',');
  const start = imiona();
  let zmian = 0;
  let bezArmii = 0;
  let zmienione = 0;
  for (let k = 0; k < 40000; k++) {
    const z = los(SLOTY_ARMII);
    const doc = los(SLOTY_ARMII);
    const skrot = (['brak', 'polowa', 'jeden', 'okno'] as const)[los(4)];
    const co = zamiar(a, z, doc, skrot);
    if (co.rodzaj !== 'nic' && co.rodzaj !== 'podziel' && co.rodzaj !== 'okno' && przenies(a, z, doc).ok) zmian++;
    if (imiona() !== start) zmienione++;
    if (zajete(a) === 0) bezArmii++;
  }
  sprawdz('te same postacie z tymi samymi poziomami', zmienione === 0, `${zmienione} razy inaczej`);
  sprawdz('bohater nigdy bez drużyny', bezArmii === 0);
  sprawdz('ruchy naprawdę się działy', zmian > 10000, `${zmian} zmian`);
}

console.log(bledy === 0 ? '\nWszystko przeszło.' : `\n${bledy} sprawdzeń nie przeszło.`);
process.exit(bledy === 0 ? 0 : 1);
