/**
 * Czy misje kampanii da się wygrać — i czy przeciwnik w ogóle gra. Liczbą,
 * bez przeglądarki, na PRAWDZIWYCH planszach i zasadach misji z `kampania.ts`.
 *
 * Dwa scenariusze na każdą misję, oba tą samą maszyną co AI przeciwnika
 * (`turaAI`), dokładnie jak `tools/wrog-symulacja.ts`:
 *
 *   1) gracz gra NORMALNIE (autopilot) — misja ma się rozstrzygnąć WYGRANĄ
 *      (`ocenMisje`), i to w rozsądnym czasie: autopilot nie zna mapy,
 *      odkrywa ją mgłą, bije się tylko wtedy, gdy symulacja bitwy wróży
 *      wygraną. Jeśli ON wygrywa, dziecko z podpowiedziami z opisu misji
 *      też da radę;
 *   2) gracz BIERNY — mierzy przeciwnika: czy w ogóle wychodzi z zamku, kiedy
 *      pierwszy raz sięga po zamek gracza i czy nie wygrywa za wcześnie.
 *
 * Uruchomienie:
 *   npx tsx tools/symulacja-misji.ts
 *   MISJA=bagienny-szlak PROB=5 npx tsx tools/symulacja-misji.ts
 */

import { nowaTura, type StanMapy } from '../src/data/mapa';
import { planszaPrzygody } from '../src/data/plansza';
import { turaAI } from '../src/data/wrog-ai';
import { KAMPANIA, ocenMisje, type Misja } from '../src/data/kampania';

declare const process: { env: Record<string, string | undefined>; exitCode?: number };
const PROB = Number(process.env.PROB ?? 3);
const TYLKO = process.env.MISJA;

let bledy = 0;
const sprawdz = (co: string, ok: boolean, szczegol = '') => {
  if (!ok) bledy++;
  console.log(`  ${ok ? 'OK  ' : 'ŹLE '} ${co}${szczegol ? ` — ${szczegol}` : ''}`);
};

/**
 * Progi na misję. `wygranaDo` — najpóźniejszy dzień, w którym autopilot ma
 * już wygrać (przy terminie misji: sam termin); `bezpiecznyDo` — do którego
 * dnia grający normalnie nie może stracić zamku; `wrogWychodzi` — czy
 * przeciwnik ma się ruszać z zamku (na Polanie celowo nie).
 */
const PROGI: Record<string, { wygranaDo: number; bezpiecznyDo: number; wrogWychodzi: boolean; horyzont: number }> = {
  'pierwsze-kroki': { wygranaDo: 21, bezpiecznyDo: 99, wrogWychodzi: false, horyzont: 35 },
  'klucze-do-przeleczy': { wygranaDo: 84, bezpiecznyDo: 25, wrogWychodzi: true, horyzont: 84 },
  'bagienny-szlak': { wygranaDo: 56, bezpiecznyDo: 25, wrogWychodzi: true, horyzont: 60 },
  'oblezenie-groty': { wygranaDo: 84, bezpiecznyDo: 20, wrogWychodzi: true, horyzont: 84 },
};

interface Wynik {
  rozstrzygniecie: 'wygrana' | 'przegrana' | null;
  dzien: number;
  /** Najdalej, jak bohater wroga odszedł od swojego zamku (w polach, Czebyszew). */
  zasiegWroga: number;
  /** Dzień, w którym bohater wroga pierwszy raz odszedł od zamku o ponad 5 pól. */
  wymarsz: number | null;
  /** Siła załogi pierwszego zamku wroga (suma stworków) na starcie i na końcu. */
  zalogaStart: number;
  zalogaKoniec: number;
}

const zaloga = (s: StanMapy) => {
  const z = s.obiekty.find((o) => o.rodzaj === 'zamek' && o.frakcjaZamku === 'grota');
  return (z?.oddzialy ?? []).reduce((a, o) => a + o.ile, 0);
};

function przebieg(m: Misja, graj: boolean, ziarno: number, horyzont: number): Wynik {
  const s = planszaPrzygody(m.mapa);
  s.misja = m.id;
  const zamekWroga = s.obiekty.find((o) => o.rodzaj === 'zamek' && o.wlasciciel === 'wrog')!;
  const wynik: Wynik = {
    rozstrzygniecie: null,
    dzien: horyzont,
    zasiegWroga: 0,
    wymarsz: null,
    zalogaStart: zaloga(s),
    zalogaKoniec: 0,
  };
  for (let d = 1; d <= horyzont; d++) {
    nowaTura(s);
    if (graj) turaAI(s, 'gracz', ziarno * 2);
    turaAI(s, 'wrog', ziarno * 2 + 1);
    const odl = Math.max(Math.abs(s.wrogBohater.x - zamekWroga.x), Math.abs(s.wrogBohater.y - zamekWroga.y));
    wynik.zasiegWroga = Math.max(wynik.zasiegWroga, odl);
    if (odl > 5 && wynik.wymarsz === null) wynik.wymarsz = s.dzien;
    const r = ocenMisje(s, m);
    if (r) {
      wynik.rozstrzygniecie = r;
      wynik.dzien = s.dzien;
      break;
    }
  }
  wynik.zalogaKoniec = zaloga(s);
  return wynik;
}

const lista = (w: Wynik[]) =>
  w.map((x) => `${x.rozstrzygniecie ?? '—'}@${x.dzien}`).join(', ');

for (const m of KAMPANIA.misje) {
  if (TYLKO && m.id !== TYLKO) continue;
  const p = PROGI[m.id];
  console.log(`\n=== misja ${m.nr}: ${m.tytul} (plansza ${m.mapa}) — ${PROB} przebiegów ===`);
  const t0 = Date.now();

  const normalne: Wynik[] = [];
  for (let i = 0; i < PROB; i++) normalne.push(przebieg(m, true, 1000 + i, p.horyzont));
  console.log(`  gra normalna: ${lista(normalne)}`);
  const wygrane = normalne.filter((w) => w.rozstrzygniecie === 'wygrana');
  sprawdz(
    `autopilot wygrywa w każdym przebiegu do dnia ${p.wygranaDo}`,
    wygrane.length === PROB && wygrane.every((w) => w.dzien <= p.wygranaDo),
    wygrane.length ? `średnio dnia ${(wygrane.reduce((a, w) => a + w.dzien, 0) / wygrane.length).toFixed(1)}` : 'ani razu'
  );
  sprawdz(
    `grający normalnie nie przegrywa przed dniem ${p.bezpiecznyDo}`,
    normalne.every((w) => !(w.rozstrzygniecie === 'przegrana' && w.dzien < p.bezpiecznyDo))
  );

  const bierne: Wynik[] = [];
  for (let i = 0; i < PROB; i++) bierne.push(przebieg(m, false, 2000 + i, p.horyzont));
  console.log(`  gracz bierny: ${lista(bierne)}`);
  console.log(
    `  bohater wroga: najdalej ${bierne.map((w) => w.zasiegWroga).join('/')} pól od zamku, ` +
      `wymarsz dnia ${bierne.map((w) => w.wymarsz ?? '—').join('/')}`
  );
  console.log(`  załoga zamku wroga: ${bierne.map((w) => `${w.zalogaStart}→${w.zalogaKoniec}`).join(', ')}`);
  if (p.wrogWychodzi) {
    sprawdz('przeciwnik wychodzi z zamku', bierne.every((w) => w.wymarsz !== null));
    sprawdz(
      'przeciwnik nie wygrywa z biernym graczem przed dniem 14',
      bierne.every((w) => !(w.rozstrzygniecie === 'przegrana' && w.dzien < 14))
    );
  } else {
    sprawdz('przeciwnik zostaje w forcie (misja samouczkowa)', bierne.every((w) => w.zasiegWroga === 0));
    sprawdz('fort umacnia się z czasem', bierne.every((w) => w.zalogaKoniec > w.zalogaStart));
  }
  console.log(`  (${((Date.now() - t0) / 1000).toFixed(0)} s)`);
}

console.log(`\nBŁĘDÓW: ${bledy}`);
if (bledy > 0) process.exitCode = 1;
