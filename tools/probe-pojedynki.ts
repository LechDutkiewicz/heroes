/**
 * Sonda sal, odznak i pojedynków trenerów (lore zamiast „pokonaj bohatera
 * i zdobądź zamek" z Heroes 3 — patrz PROJEKT-TRENERZY.md).
 *
 *   npx tsx tools/probe-pojedynki.ts
 */
import { planszaPrzygody } from '../src/data/plansza';
import {
  nagrodaZaPojedynek,
  odwiedz,
  rozliczPojedynek,
  rywalNa,
  trenerWGrze,
  zdobadzOdznake,
  type StanMapy,
} from '../src/data/mapa';
import { pustaArmia } from '../src/data/armia';
import { nowyStworek } from '../src/data/stworki';
import { turaAI } from '../src/data/wrog-ai';
import { KAMPANIA, ocenMisje } from '../src/data/kampania';

declare const process: { exit(k: number): never };
let bledy = 0;
const sprawdz = (co: string, ok: boolean, szczegol = '') => {
  if (!ok) bledy++;
  console.log(`  ${ok ? 'OK  ' : 'ŹLE '} ${co}${szczegol ? ` — ${szczegol}` : ''}`);
};
const zamekGracza = (s: StanMapy) => s.obiekty.find((o) => o.rodzaj === 'zamek' && o.wlasciciel === 'gracz')!;
const zamekWroga = (s: StanMapy) => s.obiekty.find((o) => o.rodzaj === 'zamek' && o.wlasciciel === 'wrog')!;
const druzyna = (frakcja: string, poziom: number, ile = 4) => {
  const a = pustaArmia();
  for (let i = 0; i < ile; i++) a[i] = nowyStworek(frakcja, i, poziom)!;
  return a;
};

console.log('=== rywal na mapie ===');
{
  const s = planszaPrzygody();
  const r = s.wrogBohater;
  sprawdz('rywal ma imię trenera', r.imie === 'Oskar', r.imie);
  sprawdz('rywal jest w grze, dopóki ma salę', trenerWGrze(s, 'wrog'));
  sprawdz('rywalNa widzi go na jego polu', rywalNa(s, r.x, r.y, 'gracz') && !rywalNa(s, r.x + 1, r.y, 'gracz'));
  for (const z of s.obiekty) if (z.rodzaj === 'zamek') z.wlasciciel = 'gracz';
  sprawdz('bez sali rywal wypada z gry (i z mapy)', !trenerWGrze(s, 'wrog') && !rywalNa(s, r.x, r.y, 'gracz'));
}

console.log('\n=== nagroda i powrót do Centrum ===');
{
  const s = planszaPrzygody();
  s.skarbiec.pokeball = 100;
  s.wrogSkarbiec.pokeball = 300;
  sprawdz('nagroda: piąta część, co najmniej 20', nagrodaZaPojedynek(s, 'wrog') === 60 && nagrodaZaPojedynek(s, 'gracz') === 20);
  s.skarbiec.pokeball = 7;
  sprawdz('nagroda nie większa niż skarbiec', nagrodaZaPojedynek(s, 'gracz') === 7);
  s.skarbiec.pokeball = 100;
  s.wrogBohater.x = 3;
  s.wrogBohater.y = 3;
  s.wrogBohater.armia[0]!.omdlaly = true;
  const n = rozliczPojedynek(s, 'gracz');
  const dom = zamekWroga(s);
  sprawdz('przegrany płaci zwycięzcy', n === 60 && s.skarbiec.pokeball === 160 && s.wrogSkarbiec.pokeball === 240);
  sprawdz('przegrany wraca do swojej sali, z obudzoną drużyną i bez ruchu',
    s.wrogBohater.x === dom.x && s.wrogBohater.y === dom.y && !s.wrogBohater.armia[0]!.omdlaly && s.wrogBohater.ruch === 0);
}

console.log('\n=== rywal wyzywa gracza w swojej turze ===');
{
  const s = planszaPrzygody();
  const z = zamekGracza(s);
  s.dzien = 80;
  s.wrogBuduje = false;
  s.wrogSkarbiec.pokeball = 0;
  s.skarbiec.pokeball = 100;
  // Gracz stoi na drodze, dwa pola od rywala; rywal dużo silniejszy.
  s.bohater.armia = druzyna('bor', 5);
  s.bohater.x = z.x + 3;
  s.bohater.y = z.y + 2;
  s.wrogBohater.armia = druzyna('grota', 40);
  s.wrogBohater.x = s.bohater.x + 2;
  s.wrogBohater.y = s.bohater.y;
  s.wrogBohater.ruch = s.wrogBohater.ruchMax = 3000;
  for (let y = 0; y < s.wys; y++) for (let x = 0; x < s.szer; x++) s.wrogOdkryte[y][x] = true;
  turaAI(s, 'wrog');
  const p = s.pojedynki?.[0];
  sprawdz('pojedynek się odbył', !!p && p.wyzywajacy === 'wrog', JSON.stringify(s.pojedynki));
  sprawdz('silniejszy rywal wygrywa', p?.zwyciezca === 'wrog');
  sprawdz('gracz płaci i wraca do Centrum z obudzoną drużyną',
    s.skarbiec.pokeball === 80 && s.bohater.x === z.x && s.bohater.y === z.y && !s.bohater.armia.some((o) => o?.omdlaly));
  sprawdz('drużyna rywala zebrała doświadczenie', (s.wrogBohater.armia[0]?.dosw ?? 0) > 5 * 40 * 39);
}
{
  // Przed dniem natarcia rywal nie poluje na gracza.
  const s = planszaPrzygody();
  s.dzien = 2;
  s.bohater.armia = druzyna('bor', 5);
  s.wrogBohater.armia = druzyna('grota', 40);
  s.bohater.x = s.wrogBohater.x - 2;
  s.bohater.y = s.wrogBohater.y;
  for (let y = 0; y < s.wys; y++) for (let x = 0; x < s.szer; x++) s.wrogOdkryte[y][x] = true;
  turaAI(s, 'wrog');
  sprawdz('pierwsze dni: rywal nie wyzywa', !(s.pojedynki ?? []).length);
}

console.log('\n=== sale i odznaki ===');
{
  const s = planszaPrzygody();
  const m = KAMPANIA.misje.find((x) => x.zwyciestwo.typ === 'zamki')!;
  s.misja = m.id;
  const sale = s.obiekty.filter((o) => o.rodzaj === 'zamek' && o.wlasciciel === 'wrog');
  for (const sala of sale) {
    sala.oddzialy = [];
    sala.garnizon = undefined;
    const w = odwiedz(s, sala);
    sprawdz(`pusta sala: ${sala.nazwa} — odznaka`, (s.odznaki ?? []).includes(sala.nazwa) && w.opis.includes('Odznaka'), w.opis.replace('\n', ' / '));
  }
  sprawdz('komplet odznak wygrywa misję', ocenMisje(s, m) === 'wygrana');
  sale[0].wlasciciel = 'wrog';
  sprawdz('odbita sala nie zabiera odznaki — misja dalej wygrana', ocenMisje(s, m) === 'wygrana');
  sprawdz('drugi raz ta sama odznaka się nie dubluje', zdobadzOdznake(s, sale[0]) === undefined && s.odznaki!.length === sale.length);
}

console.log(bledy === 0 ? '\nWszystko przeszło.' : `\n${bledy} sprawdzeń nie przeszło.`);
process.exit(bledy === 0 ? 0 : 1);
