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
 * Bohater przechodzi z misji do misji, jak w kampanii (`rozpocznijMisje`,
 * pierwszy bonus z listy): misja N zaczyna się bohaterem, z którym autopilot
 * skończył pierwszy przebieg misji N−1. Bez tego ostatnia misja byłaby
 * mierzona bohaterem z pierwszego dnia kampanii, a gracz przychodzi tam
 * z doświadczeniem, umiejętnościami i artefaktami z trzech misji.
 *
 * Uruchomienie:
 *   npx tsx tools/symulacja-misji.ts
 *   MISJA=bagienny-szlak PROB=5 npx tsx tools/symulacja-misji.ts
 *   WETERAN=0 …   — każda misja świeżym bohaterem (najgorszy przypadek)
 *   WROG=obronca … — przeciwnik nie wychodzi (ile zajmuje sama misja)
 *   NATARCIE=25 … — inny dzień natarcia niż w USTAWIENIACH planszy
 */

import { nowaTura, type StanMapy } from '../src/data/mapa';
import { turaAI } from '../src/data/wrog-ai';
import {
  KAMPANIA,
  nowyPostep,
  ocenMisje,
  type BohaterPrzenoszony,
  type Misja,
} from '../src/data/kampania';
import { bohaterDoPrzeniesienia, rozpocznijMisje } from '../src/data/kampania-start';

declare const process: { env: Record<string, string | undefined>; exitCode?: number };
const PROB = Number(process.env.PROB ?? 3);
const TYLKO = process.env.MISJA;
const WETERAN = process.env.WETERAN !== '0';
const WROG = process.env.WROG as 'aktywny' | 'obronca' | undefined;
const NATARCIE = process.env.NATARCIE ? Number(process.env.NATARCIE) : undefined;

let bledy = 0;
const sprawdz = (co: string, ok: boolean, szczegol = '') => {
  if (!ok) bledy++;
  console.log(`  ${ok ? 'OK  ' : 'ŹLE '} ${co}${szczegol ? ` — ${szczegol}` : ''}`);
};

/**
 * Progi na misję. `wygranaDo` — najpóźniejszy dzień, w którym autopilot ma
 * już wygrać (przy terminie misji: sam termin); `wygranych` — w ilu
 * przebiegach (ułamek) ma wygrać; `bezpiecznyDo` — do którego dnia grający
 * normalnie nie może stracić zamku; `wrogWychodzi` — czy przeciwnik ma się
 * ruszać z zamku (na Polanie celowo nie).
 */
const PROGI: Record<
  string,
  { wygranaDo: number; wygranych: number; bezpiecznyDo: number; wrogWychodzi: boolean; horyzont: number }
> = {
  'pierwsze-kroki': { wygranaDo: 21, wygranych: 1, bezpiecznyDo: 99, wrogWychodzi: false, horyzont: 35 },
  // „Dwie Doliny" są zamrożone i strojone osobno (`tools/wrog-symulacja.ts`):
  // tu liczy się tylko to, żeby przeciwnik grał i żeby nie wygrywał w dwa tygodnie.
  'klucze-do-przeleczy': { wygranaDo: 84, wygranych: 0, bezpiecznyDo: 25, wrogWychodzi: true, horyzont: 60 },
  'bagienny-szlak': { wygranaDo: 56, wygranych: 1, bezpiecznyDo: 25, wrogWychodzi: true, horyzont: 60 },
  // Najtrudniejsza misja: wystarczy, że autopilot wygrywa w większości przebiegów.
  'oblezenie-groty': { wygranaDo: 84, wygranych: 0.6, bezpiecznyDo: 20, wrogWychodzi: true, horyzont: 84 },
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
  /** Dzień, w którym cel misji (artefakt albo zamek wroga) pierwszy raz wyszedł z mgły gracza. */
  celWidac: number | null;
  /** Dzień, w którym padła imienna straż przy celu (wódz na grobli). */
  strazPadla: number | null;
  /** Dni, w których gracz zdobywał kolejne zamki wroga. */
  zdobyte: number[];
  /** Stan na koniec — z niego bierze się bohatera do następnej misji. */
  stan: StanMapy;
}

const zaloga = (s: StanMapy) => {
  const z = s.obiekty.find((o) => o.rodzaj === 'zamek' && o.frakcjaZamku === 'grota');
  return (z?.oddzialy ?? []).reduce((a, o) => a + o.ile, 0);
};

let weteran: BohaterPrzenoszony | undefined;

function przebieg(m: Misja, graj: boolean, ziarno: number, horyzont: number): Wynik {
  const s = rozpocznijMisje({ ...nowyPostep('Janek'), bohater: WETERAN ? weteran : undefined }, m, 0);
  if (WROG) s.wrogTryb = WROG;
  if (NATARCIE) s.dzienNatarcia = NATARCIE;
  const zamekWroga = s.obiekty.find((o) => o.rodzaj === 'zamek' && o.wlasciciel === 'wrog')!;
  const wynik: Wynik = {
    rozstrzygniecie: null,
    dzien: horyzont,
    zasiegWroga: 0,
    wymarsz: null,
    zalogaStart: zaloga(s),
    zalogaKoniec: 0,
    celWidac: null,
    strazPadla: null,
    zdobyte: [],
    stan: s,
  };
  const z = m.zwyciestwo;
  const cel =
    z.typ === 'artefakt'
      ? s.obiekty.find((o) => o.rodzaj === 'artefakt' && o.artefakt === z.artefakt)
      : zamekWroga;
  const straz = cel
    ? s.obiekty.filter(
        (o) =>
          o.rodzaj === 'potwor' &&
          Math.max(Math.abs(o.x - cel.x), Math.abs(o.y - cel.y)) <= 9 &&
          o.nazwa !== o.oddzialy?.[0]?.nazwa
      )
    : [];
  const zamki = s.obiekty.filter((o) => o.rodzaj === 'zamek' && o.wlasciciel === 'wrog');
  for (let d = 1; d <= horyzont; d++) {
    nowaTura(s);
    if (graj) turaAI(s, 'gracz', ziarno * 2);
    turaAI(s, 'wrog', ziarno * 2 + 1);
    const odl = Math.max(Math.abs(s.wrogBohater.x - zamekWroga.x), Math.abs(s.wrogBohater.y - zamekWroga.y));
    wynik.zasiegWroga = Math.max(wynik.zasiegWroga, odl);
    if (odl > 5 && wynik.wymarsz === null) wynik.wymarsz = s.dzien;
    if (cel && wynik.celWidac === null && s.odkryte[cel.y][cel.x]) wynik.celWidac = s.dzien;
    if (straz.length && wynik.strazPadla === null && straz.every((o) => o.zebrany)) wynik.strazPadla = s.dzien;
    const nasze = zamki.filter((o) => o.wlasciciel === 'gracz').length;
    while (wynik.zdobyte.length < nasze) wynik.zdobyte.push(s.dzien);
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

const lista = (w: Wynik[]) => w.map((x) => `${x.rozstrzygniecie ?? '—'}@${x.dzien}`).join(', ');

const opisBohatera = (b: BohaterPrzenoszony | undefined) =>
  b
    ? `atak ${b.atak}, obrona ${b.obrona}, doświadczenie ${b.doswiadczenie}, artefakty: ${b.artefakty.join(', ') || 'brak'}`
    : 'świeży bohater';

const cel = TYLKO ? KAMPANIA.misje.findIndex((m) => m.id === TYLKO) : KAMPANIA.misje.length - 1;

for (const [i, m] of KAMPANIA.misje.entries()) {
  if (i > cel) break;
  const p = PROGI[m.id];
  if (TYLKO && m.id !== TYLKO) {
    // Misja przed badaną: jeden przebieg, tylko po to, żeby mieć bohatera.
    if (WETERAN) weteran = bohaterDoPrzeniesienia(przebieg(m, true, 1000, p.horyzont).stan);
    continue;
  }
  console.log(`\n=== misja ${m.nr}: ${m.tytul} (plansza ${m.mapa}) — ${PROB} przebiegów ===`);
  console.log(`  bohater: ${opisBohatera(WETERAN ? weteran : undefined)}`);
  const t0 = Date.now();

  const normalne: Wynik[] = [];
  for (let k = 0; k < PROB; k++) normalne.push(przebieg(m, true, 1000 + k, p.horyzont));
  console.log(`  gra normalna: ${lista(normalne)}`);
  console.log(`  cel pierwszy raz widać dnia: ${normalne.map((w) => w.celWidac ?? '—').join('/')}`);
  if (normalne.some((w) => w.strazPadla !== null))
    console.log(`  imienna straż celu pada dnia: ${normalne.map((w) => w.strazPadla ?? '—').join('/')}`);
  if (normalne.some((w) => w.zdobyte.length))
    console.log(`  zdobyte zamki wroga (dni): ${normalne.map((w) => w.zdobyte.join('+') || '—').join(' / ')}`);
  const wygrane = normalne.filter((w) => w.rozstrzygniecie === 'wygrana' && w.dzien <= p.wygranaDo);
  sprawdz(
    `autopilot wygrywa do dnia ${p.wygranaDo} w co najmniej ${Math.round(p.wygranych * 100)}% przebiegów`,
    wygrane.length >= Math.ceil(PROB * p.wygranych),
    wygrane.length
      ? `${wygrane.length}/${PROB}, średnio dnia ${(wygrane.reduce((a, w) => a + w.dzien, 0) / wygrane.length).toFixed(1)}`
      : `0/${PROB}`
  );
  sprawdz(
    `grający normalnie nie przegrywa przed dniem ${p.bezpiecznyDo}`,
    normalne.every((w) => !(w.rozstrzygniecie === 'przegrana' && w.dzien < p.bezpiecznyDo))
  );
  const nastepny = bohaterDoPrzeniesienia(normalne[0].stan);

  const bierne: Wynik[] = [];
  for (let k = 0; k < PROB; k++) bierne.push(przebieg(m, false, 2000 + k, p.horyzont));
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
  weteran = nastepny;
  console.log(`  (${((Date.now() - t0) / 1000).toFixed(0)} s)`);
}

console.log(`\nBŁĘDÓW: ${bledy}`);
if (bledy > 0) process.exitCode = 1;
