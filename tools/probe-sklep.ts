/**
 * Pokémart i plecak trenera — bez przeglądarki.
 *
 * Sprawdza: plecak startowy (jedna mikstura), zakupy według stopnia sklepu,
 * limit sztuk, warunek „trener w mieście", plecak starego zapisu, przejście
 * plecaka do następnej misji, działanie Tarczy w bitwie i to, że przeciwnik
 * nie wydaje pokeballi na sklep.
 *
 *   npx tsx tools/probe-sklep.ts
 */
import { createBattle, damageOf } from '../src/data/battle';
import { defStworka, nowyStworek } from '../src/data/stworki';
import { planszaPrzygody } from '../src/data/plansza';
import { bohaterDoPrzeniesienia } from '../src/data/kampania-start';
import { MAKS_W_PLECAKU, PLECAK_STARTOWY, plecakBohatera } from '../src/data/przedmioty';
import { kupWPokemarcie, stopienSklepu } from '../src/data/zamki';
import { nowaTura } from '../src/data/mapa';
import { turaAI } from '../src/data/wrog-ai';

declare const process: { exitCode?: number };
let bledy = 0;
const sprawdz = (co: string, ok: boolean, szczegol = '') => {
  if (!ok) bledy++;
  console.log(`  ${ok ? 'OK  ' : 'ŹLE '} ${co}${szczegol ? ` — ${szczegol}` : ''}`);
};

console.log('=== plecak na starcie ===');
const s = planszaPrzygody();
sprawdz('nowa gra: jedna mikstura, nic więcej', JSON.stringify(plecakBohatera(s.bohater)) === JSON.stringify(PLECAK_STARTOWY), JSON.stringify(s.bohater.plecak));
const stary: { plecak?: undefined } = {};
const p0 = plecakBohatera(stary);
sprawdz('stary zapis bez plecaka: dwie mikstury i eliksir', p0.mikstura === 2 && p0.eliksir === 1 && p0.tarcza === 0);

console.log('=== zakupy ===');
s.skarbiec = { pokeball: 500, jagoda: 50, kamien: 5, odlamek: 20 };
sprawdz('bez sklepu nic nie kupisz', kupWPokemarcie(s.skarbiec, s.bohater, [], 'mikstura', true) === 'Za mały sklep.');
const przed = s.skarbiec.pokeball;
sprawdz('stopień I: mikstura', kupWPokemarcie(s.skarbiec, s.bohater, ['sklep1'], 'mikstura', true) === null);
sprawdz('mikstura w plecaku (1 → 2)', s.bohater.plecak?.mikstura === 2);
sprawdz('zapłacone pokeballami i jagodą', s.skarbiec.pokeball === przed - 6 && s.skarbiec.jagoda === 49);
sprawdz('stopień I: bez Super mikstury', kupWPokemarcie(s.skarbiec, s.bohater, ['sklep1'], 'superMikstura', true) === 'Za mały sklep.');
sprawdz('stopień II: Super mikstura', kupWPokemarcie(s.skarbiec, s.bohater, ['sklep1', 'sklep2'], 'superMikstura', true) === null);
sprawdz('stopień II: bez Tarczy', kupWPokemarcie(s.skarbiec, s.bohater, ['sklep1', 'sklep2'], 'tarcza', true) === 'Za mały sklep.');
sprawdz('stopień III: Tarcza', kupWPokemarcie(s.skarbiec, s.bohater, ['sklep1', 'sklep2', 'sklep3'], 'tarcza', true) === null);
sprawdz('stopień z listy budynków', stopienSklepu(['sklep1', 'sklep2']) === 2 && stopienSklepu([]) === 0);
sprawdz('trener poza miastem nie kupuje', kupWPokemarcie(s.skarbiec, s.bohater, ['sklep1'], 'mikstura', false) === 'Trener musi być w mieście.');
while (kupWPokemarcie(s.skarbiec, s.bohater, ['sklep1'], 'mikstura', true) === null);
sprawdz(`najwyżej ${MAKS_W_PLECAKU} sztuk`, s.bohater.plecak?.mikstura === MAKS_W_PLECAKU);
s.skarbiec = { pokeball: 3, jagoda: 0, kamien: 0, odlamek: 0 };
sprawdz('bez pieniędzy — odmowa', kupWPokemarcie(s.skarbiec, s.bohater, ['sklep1', 'sklep2'], 'eliksir', true) === 'Nie stać cię.');

console.log('=== kampania ===');
const dalej = bohaterDoPrzeniesienia(s);
sprawdz('plecak przechodzi do następnej misji', dalej.plecak?.mikstura === MAKS_W_PLECAKU && dalej.plecak?.tarcza === 1);

console.log('=== tarcza w bitwie ===');
const a = nowyStworek('bor', 2, 10)!;
const d = nowyStworek('grota', 2, 10)!;
const b = createBattle({ units: [defStworka(a)!] }, { units: [defStworka(d)!] });
const [atakujacy, cel] = [b.units[0], b.units[1]];
const bez = damageOf(b, atakujacy, { ...cel }).value;
const z = damageOf(b, atakujacy, { ...cel, tarcza: true }).value;
sprawdz('tarcza osłabia cios (~2/3)', z < bez && Math.abs(z / bez - 0.67) < 0.08, `${bez} → ${z}`);

console.log('=== przeciwnik nie buduje sklepu ===');
const w = planszaPrzygody();
w.wrogSkarbiec = { pokeball: 9999, jagoda: 999, kamien: 99, odlamek: 999 };
for (let dzien = 0; dzien < 20; dzien++) {
  turaAI(w, 'wrog', dzien);
  nowaTura(w);
}
const zamekWroga = w.obiekty.find((o) => o.rodzaj === 'zamek' && o.wlasciciel === 'wrog');
sprawdz('w zamku wroga nie stoi Pokémart', !!zamekWroga && !(zamekWroga.postawione ?? []).some((x) => x.startsWith('sklep')), (zamekWroga?.postawione ?? []).join(', '));

if (bledy) {
  console.log(`\nBŁĘDÓW: ${bledy}`);
  process.exitCode = 1;
} else console.log('\nWszystko przeszło.');
