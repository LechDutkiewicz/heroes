/**
 * Przeszukuje profile frakcji w poszukiwaniu równowagi.
 *
 * Strojenie ręczne słabo działa: statystyki są całkowite (drobny mnożnik
 * potrafi nic nie zmienić), a szybkość zmienia kolejność kolejki skokowo.
 * Zamiast zgadywać, przechodzimy siatkę mnożników HP i ataku dla Boru
 * i Groty (Zbocze jest punktem odniesienia) i wypisujemy najlepsze.
 *
 * Od przebudowy „trener zamiast armii" stworek jest jeden (`count` = 1),
 * a na pole wchodzą cztery (`NA_POLU`) — każda bitwa losuje czwórkę
 * z sześciu gatunków frakcji, tak jak `tools/balance.ts`. Wynik to
 * mnożniki WZGLĘDEM obecnych profili w `factions.ts`.
 *
 * Uruchomienie: npx tsx tools/strojenie.ts
 */
import { FACTIONS, type Faction } from '../src/data/factions';
import { COLS, NA_POLU, ROWS, cellKey, createBattle, makeRng, runBattle, shuffle } from '../src/data/battle';

const BITEW = 150;

function przeszkody(rng: () => number): string[] {
  const ile = Math.floor(rng() * 5);
  const pola: string[] = [];
  for (let i = 0; i < ile; i++)
    pola.push(cellKey(2 + Math.floor(rng() * (COLS - 4)), Math.floor(rng() * ROWS)));
  return pola;
}

/** Frakcja z HP i atakiem wszystkich gatunków przemnożonymi przez podane liczby. */
function skaluj(f: Faction, hp: number, atk: number): Faction {
  return {
    ...f,
    units: f.units.map((u) => ({
      ...u,
      hp: Math.max(1, Math.round(u.hp * hp)),
      atk: Math.max(1, Math.round(u.atk * atk)),
    })),
  };
}

function udzial(a: Faction, b: Faction): number {
  let wa = 0;
  let wb = 0;
  for (const [x, y, aJestLewa] of [[a, b, true], [b, a, false]] as [Faction, Faction, boolean][]) {
    for (let i = 0; i < BITEW; i++) {
      const rng = makeRng(i * 2654435761 + 1);
      const czworka = (f: Faction) => ({ units: shuffle([...f.units], rng).slice(0, NA_POLU) });
      const { outcome } = runBattle(createBattle(czworka(x), czworka(y), przeszkody(rng), rng));
      if (outcome === 'remis') continue;
      if ((outcome === 'player') === aJestLewa) wa++;
      else wb++;
    }
  }
  return wa + wb ? wa / (wa + wb) : 0.5;
}

const odchylenie = (fs: Faction[]) => {
  let m = 0;
  for (let i = 0; i < fs.length; i++)
    for (let j = i + 1; j < fs.length; j++) m = Math.max(m, Math.abs(udzial(fs[i], fs[j]) - 0.5));
  return m;
};

const siatka = [0.95, 1, 1.05];
const wyniki: { opis: string; odch: number }[] = [];
for (const bh of siatka)
  for (const ba of siatka)
    for (const gh of siatka)
      for (const ga of siatka) {
        const fs = [skaluj(FACTIONS[0], bh, ba), skaluj(FACTIONS[1], gh, ga), FACTIONS[2]];
        wyniki.push({ opis: `bor hp×${bh} atk×${ba}  grota hp×${gh} atk×${ga}`, odch: odchylenie(fs) });
      }
wyniki.sort((a, b) => a.odch - b.odch);
for (const w of wyniki.slice(0, 12)) console.log(`${(w.odch * 100).toFixed(1)} pp   ${w.opis}`);
