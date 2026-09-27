/**
 * Sonda ewolucji (etap 3 w `PROJEKT-TRENERZY.md`): od poziomu, od kamienia
 * i „Nie ewoluuj" — bez przeglądarki, na zasadach z `stworki.ts`,
 * `ewolucje.ts` i `mapa.ts`.
 *
 *   npx tsx tools/probe-ewolucja.ts
 */
import { LINIE_EWOLUCJI, PROG_EWOLUCJI, progEwolucji } from '../src/data/ewolucje';
import { defStworka, dodajDosw, doswDoPoziomu, nowyStworek, rozdajDosw } from '../src/data/stworki';
import { budowlaPoId, doUlepszenia, odpowiedzNaPytanie, odwiedz, trenuj } from '../src/data/mapa';
import { planszaPrzygody } from '../src/data/plansza';
import { EWOLUCJA_KOSZT } from '../src/data/zasady-h3';

declare const process: { exit(k: number): never };
let bledy = 0;
const sprawdz = (co: string, ok: boolean, szczegol = '') => {
  if (!ok) bledy++;
  console.log(`  ${ok ? 'OK  ' : 'ŹLE '} ${co}${szczegol ? ` — ${szczegol}` : ''}`);
};
const doPoziomu = (o: NonNullable<ReturnType<typeof nowyStworek>>, p: number) =>
  dodajDosw(o, doswDoPoziomu(p) - (o.dosw ?? 0));

console.log('=== linie ===');
const odKamienia = LINIE_EWOLUCJI.filter((l) => l.kamien);
sprawdz('po jednej linii od kamienia na frakcję', odKamienia.length === 3 && new Set(odKamienia.map((l) => l.frakcja)).size === 3, odKamienia.map((l) => l.etapy[0].nazwa).join(', '));
sprawdz('progi rosną', PROG_EWOLUCJI[0] < PROG_EWOLUCJI[1]);

console.log('\n=== ewolucja od poziomu ===');
{
  const o = nowyStworek('bor', 0)!; // Pyroko
  const sila5 = defStworka(o)!.hp;
  let w = doPoziomu(o, PROG_EWOLUCJI[0] - 1);
  sprawdz('przed progiem zostaje formą bazową', !w.ewolucja && o.nazwa === 'Pyroko', `poz. ${o.poziom}`);
  w = doPoziomu(o, PROG_EWOLUCJI[0]);
  sprawdz('na progu ewoluuje w swojej linii', w.ewolucja?.z === 'Pyroko' && o.nazwa === 'Pyrokin', o.nazwa);
  sprawdz('poziom i doświadczenie zostają', o.poziom === PROG_EWOLUCJI[0] && (o.dosw ?? 0) >= doswDoPoziomu(PROG_EWOLUCJI[0]));
  const bez = { ...nowyStworek('bor', 0)!, poziom: PROG_EWOLUCJI[0] };
  sprawdz('etap 2 jest silniejszy niż forma bazowa na tym samym poziomie', defStworka(o)!.hp > defStworka(bez)!.hp && defStworka(o)!.hp > sila5);
  w = doPoziomu(o, PROG_EWOLUCJI[1]);
  sprawdz('na drugim progu — etap 3', o.nazwa === 'Pyrogar', o.nazwa);
  sprawdz('forma ostateczna nie ma progu', progEwolucji(o.sprite) === undefined);
}
{
  // Skok przez dwa progi naraz (np. nagroda) — dwie ewolucje po kolei.
  const o = nowyStworek('bor', 0)!;
  doPoziomu(o, PROG_EWOLUCJI[1] + 1);
  sprawdz('skok przez oba progi daje ostatni etap', o.nazwa === 'Pyrogar', o.nazwa);
}

console.log('\n=== od kamienia i „Nie ewoluuj" ===');
{
  const o = nowyStworek('bor', 1)!; // Flamir — od kamienia
  doPoziomu(o, 40);
  sprawdz('linia od kamienia nie ewoluuje od poziomu', o.nazwa === 'Flamir', `poz. ${o.poziom}, ${o.nazwa}`);
}
{
  const o = { ...nowyStworek('bor', 0)!, bezEwolucji: true };
  doPoziomu(o, 40);
  sprawdz('„Nie ewoluuj" zatrzymuje ewolucję, poziom rośnie', o.nazwa === 'Pyroko' && o.poziom === 40);
  o.bezEwolucji = undefined;
  dodajDosw(o, 1);
  sprawdz('po zdjęciu flagi ewoluuje przy najbliższym doświadczeniu', o.nazwa === 'Pyrogar', o.nazwa);
}
{
  const armia = [nowyStworek('bor', 0, 15)!, null];
  const aw = rozdajDosw(armia, [{ poziom: 20, tier: 3 }, { poziom: 20, tier: 3 }]);
  sprawdz('bitwa zgłasza ewolucję', aw.some((a) => a.ewolucja?.na === 'Pyrokin'), JSON.stringify(aw));
}

console.log('\n=== trening i Ośrodek Ewolucji ===');
{
  const s = planszaPrzygody();
  const zamek = s.obiekty.find((o) => o.rodzaj === 'zamek' && o.wlasciciel === 'gracz')!;
  s.skarbiec.pokeball = 1000;
  const o = s.bohater.armia[0]!;
  doPoziomu(o, PROG_EWOLUCJI[0] - 1);
  const w = trenuj(s, zamek, o);
  sprawdz('trening przez próg ewoluuje', w.ok && o.nazwa === 'Pyrokin', w.opis);
}
{
  const s = planszaPrzygody();
  const osrodek = s.obiekty.find((o) => o.budynek === 'osrodek-ewolucji')!;
  sprawdz('Ośrodek jest na planszy', !!osrodek && budowlaPoId(osrodek.budynek)?.efekt.typ === 'ewolucja');
  s.bohater.armia = [{ ...nowyStworek('bor', 0)!, bezEwolucji: true }, nowyStworek('bor', 1)!, null, null, null, null, null];
  s.skarbiec.kamien = EWOLUCJA_KOSZT;
  const u = doUlepszenia(s.bohater);
  sprawdz('Ośrodek pomija stworka z „Nie ewoluuj"', u?.oddzial.nazwa === 'Flamir', u?.oddzial.nazwa);
  const pyt = odwiedz(s, osrodek).pytanie!;
  odpowiedzNaPytanie(s, pyt, 'tak');
  sprawdz('kamień ewoluuje linię od kamienia', s.bohater.armia[1]?.nazwa === 'Flamiron', s.bohater.armia[1]?.nazwa);
  sprawdz('Pyroko z flagą nietknięty', s.bohater.armia[0]?.nazwa === 'Pyroko');
}

console.log(bledy === 0 ? '\nWszystko przeszło.' : `\n${bledy} sprawdzeń nie przeszło.`);
process.exit(bledy === 0 ? 0 : 1);
