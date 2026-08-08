/**
 * Przeszukuje profile frakcji w poszukiwaniu równowagi.
 *
 * Strojenie ręczne nie działa, bo knobs działają nieliniowo: liczebność mnoży
 * naraz atak i życie, a szybkość zmienia kolejność kolejki skokowo. Zamiast
 * zgadywać, przechodzimy siatkę wariantów i wypisujemy najlepsze.
 *
 * Uruchomienie: npx tsx tools/strojenie.ts
 */
import { FACTIONS, TIERS, type Faction } from '../src/data/factions';
import { COLS, ROWS, cellKey, createBattle, makeRng, runBattle } from '../src/data/battle';

const BITEW = 120;

function przeszkody(rng: () => number): string[] {
  const ile = Math.floor(rng() * 5);
  const pola: string[] = [];
  for (let i = 0; i < ile; i++)
    pola.push(cellKey(2 + Math.floor(rng() * (COLS - 4)), Math.floor(rng() * ROWS)));
  return pola;
}

/** Przeskalowuje frakcję względem tabeli poziomów, zachowując jej odchyłki. */
function skaluj(f: Faction, hp: number, atk: number, count: number): Faction {
  return {
    ...f,
    units: f.units.map((u, i) => ({
      ...u,
      hp: Math.max(1, Math.round((u.hp / TIERS[i].hp) * hp * TIERS[i].hp)),
      atk: Math.max(1, Math.round((u.atk / TIERS[i].atk) * atk * TIERS[i].atk)),
      count: Math.max(1, Math.round((u.count / TIERS[i].count) * count * TIERS[i].count)),
    })),
  };
}

function udzial(a: Faction, b: Faction): number {
  let wa = 0;
  let wb = 0;
  for (const [x, y, aJestLewa] of [[a, b, true], [b, a, false]] as [Faction, Faction, boolean][]) {
    for (let i = 0; i < BITEW; i++) {
      const rng = makeRng(i * 2654435761 + 1);
      const { outcome } = runBattle(createBattle(x, y, przeszkody(rng), rng));
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

// Bór jest za mocny, Grota za słaba — szukamy poprawki tylko na tych dwóch,
// Zbocze zostawiamy jako punkt odniesienia.
const wyniki: { opis: string; odch: number }[] = [];
for (const borCount of [1.0, 1.05, 1.1, 1.15, 1.2]) {
  for (const grotaHp of [1.15, 1.25, 1.35]) {
    for (const grotaAtk of [0.95, 1.05, 1.15]) {
      const fs = [
        skaluj(FACTIONS[0], 1, 1, borCount / 1.2),
        skaluj(FACTIONS[1], grotaHp / 1.15, grotaAtk / 0.95, 1),
        FACTIONS[2],
      ];
      const odch = odchylenie(fs);
      wyniki.push({ opis: `bor.count ${borCount}  grota.hp ${grotaHp}  grota.atk ${grotaAtk}`, odch });
    }
  }
}
wyniki.sort((a, b) => a.odch - b.odch);
for (const w of wyniki.slice(0, 12)) console.log(`${(w.odch * 100).toFixed(1)} pp   ${w.opis}`);
