/**
 * Mierzy balans frakcji, rozgrywając bitwy bez grafiki.
 *
 * Pytanie „czy frakcje są równe" ma twardą odpowiedź, jeśli tylko da się
 * rozegrać dość bitew. Do tej pory nie dało się — reguły siedziały w scenie
 * i wymagały przeglądarki. Teraz siedzą w src/data/battle.ts i ten plik
 * rozgrywa kilka tysięcy starć w sekundę.
 *
 * Uruchomienie: npm run balans
 */

import { FACTIONS, type Faction } from '../src/data/factions';
import {
  COLS,
  ROWS,
  cellKey,
  createBattle,
  makeRng,
  runBattle,
  type Outcome,
} from '../src/data/battle';

declare const process: { env: Record<string, string | undefined> };
const BITEW = Number(process.env.BITEW ?? 400);

/**
 * Przeszkody rozrzucone tak jak w grze, ale z ziarna — inaczej dwa przebiegi
 * mierzyłyby dwie różne plansze i nie dałoby się porównać zmiany statystyk
 * ze stanem sprzed niej.
 */
function przeszkody(rng: () => number): string[] {
  const ile = Math.floor(rng() * 5);
  const pola: string[] = [];
  for (let i = 0; i < ile; i++) {
    const col = 2 + Math.floor(rng() * (COLS - 4));
    const row = Math.floor(rng() * ROWS);
    pola.push(cellKey(col, row));
  }
  return pola;
}

interface Wynik {
  lewa: number;
  prawa: number;
  remisy: number;
  rundy: number[];
  zadane: Map<string, number[]>;
}

function starcie(a: Faction, b: Faction, ile: number): Wynik {
  const w: Wynik = { lewa: 0, prawa: 0, remisy: 0, rundy: [], zadane: new Map() };
  for (let i = 0; i < ile; i++) {
    const rng = makeRng(i * 2654435761 + 1);
    const bitwa = createBattle(a, b, przeszkody(rng), rng);
    const { outcome, rounds } = runBattle(bitwa);
    if (outcome === 'player') w.lewa++;
    else if (outcome === 'enemy') w.prawa++;
    else w.remisy++;
    w.rundy.push(rounds);
    for (const [nazwa, ile] of bitwa.dealt) {
      if (!w.zadane.has(nazwa)) w.zadane.set(nazwa, []);
      w.zadane.get(nazwa)!.push(ile);
    }
  }
  return w;
}

const sred = (xs: number[]) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : 0);
const proc = (x: number, n: number) => `${((x / n) * 100).toFixed(1)}%`;

console.log(`\nBALANS — ${BITEW} bitew na parę, obie strony grane tą samą maszyną\n`);

// Każda para gra w obie strony. Strona lewa rusza się pierwsza przy remisie
// szybkości, więc bez zamiany mierzylibyśmy przewagę pierwszego ruchu,
// a nie przewagę frakcji.
let najgorszeOdchylenie = 0;
for (let i = 0; i < FACTIONS.length; i++) {
  for (let j = i + 1; j < FACTIONS.length; j++) {
    const a = FACTIONS[i];
    const b = FACTIONS[j];
    const tam = starcie(a, b, BITEW);
    const zpowrotem = starcie(b, a, BITEW);

    const wygraneA = tam.lewa + zpowrotem.prawa;
    const wygraneB = tam.prawa + zpowrotem.lewa;
    const rozstrzygniete = wygraneA + wygraneB;
    const udzialA = rozstrzygniete ? wygraneA / rozstrzygniete : 0.5;
    najgorszeOdchylenie = Math.max(najgorszeOdchylenie, Math.abs(udzialA - 0.5));

    console.log(`${a.name}  vs  ${b.name}`);
    console.log(
      `  ${a.name}: ${proc(wygraneA, rozstrzygniete)}   ${b.name}: ${proc(wygraneB, rozstrzygniete)}` +
        `   remisy: ${tam.remisy + zpowrotem.remisy}` +
        `   średnio rund: ${sred([...tam.rundy, ...zpowrotem.rundy]).toFixed(1)}`
    );

    // Przewaga pierwszego ruchu osobno — jeśli jest duża, sam odsetek
    // zwycięstw niewiele mówi o frakcjach.
    const pierwszyRuch = (tam.lewa + zpowrotem.lewa) / (2 * BITEW);
    console.log(`  strona lewa (rusza pierwsza) wygrywa: ${(pierwszyRuch * 100).toFixed(1)}%\n`);
  }
}

// Wkład poszczególnych oddziałów. Frakcja może mieć równy bilans i zarazem
// trzy oddziały, których obecność niczego nie zmienia.
console.log('WKŁAD ODDZIAŁÓW — średnie obrażenia zadane w bitwie\n');
for (const f of FACTIONS) {
  const przeciwnicy = FACTIONS.filter((x) => x.id !== f.id);
  const zebrane = new Map<string, number[]>();
  for (const p of przeciwnicy) {
    for (const w of [starcie(f, p, Math.round(BITEW / 2)), starcie(p, f, Math.round(BITEW / 2))]) {
      for (const [nazwa, xs] of w.zadane) {
        if (!zebrane.has(nazwa)) zebrane.set(nazwa, []);
        zebrane.get(nazwa)!.push(...xs);
      }
    }
  }
  console.log(`${f.name}`);
  const wiersze = f.units.map((u) => ({ nazwa: u.name, tier: u.tier, sr: sred(zebrane.get(u.name) ?? [0]) }));
  const maks = Math.max(...wiersze.map((r) => r.sr), 1);
  for (const r of wiersze) {
    const slupek = '█'.repeat(Math.round((r.sr / maks) * 28));
    console.log(`  p${r.tier} ${r.nazwa.padEnd(10)} ${r.sr.toFixed(1).padStart(6)}  ${slupek}`);
  }
  console.log('');
}

console.log(
  `Największe odchylenie od równowagi: ${(najgorszeOdchylenie * 100).toFixed(1)} punktu procentowego.`
);
console.log(najgorszeOdchylenie <= 0.05 ? 'W normie (do 5 pp).' : 'ZA DUŻE — frakcje nie są równe.');
