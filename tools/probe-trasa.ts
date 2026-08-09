/**
 * Sonda: czy piechota chodzi po heksach, a latacze prosto?
 *
 * Gracz zgłosił, że oddziały przechodzą jedna przez drugą. Powodem był jeden
 * tween z pola startowego wprost na docelowe. Tu sprawdzamy to liczbowo na
 * setkach losowych sytuacji: czy każdy krok trasy sąsiaduje z poprzednim
 * i czy żaden nie ląduje na polu zajętym albo na przeszkodzie.
 *
 * Uruchomienie: npx tsx tools/probe-trasa.ts
 */
import { FACTIONS } from '../src/data/factions';
import {
  COLS,
  ROWS,
  cellKey,
  createBattle,
  makeRng,
  movePath,
  neighbours,
  reachable,
} from '../src/data/battle';
import { hexDistance } from '../src/data/hex';

let tras = 0;
let przezSasiada = 0;
let naZajete = 0;
let naPrzeszkode = 0;
let lataczeProsto = 0;
let latacze = 0;

for (let seed = 1; seed <= 400; seed++) {
  const rng = makeRng(seed * 2654435761 + 1);
  const przeszkody: string[] = [];
  for (let i = 0; i < Math.floor(rng() * 5); i++)
    przeszkody.push(cellKey(2 + Math.floor(rng() * (COLS - 4)), Math.floor(rng() * ROWS)));
  const b = createBattle(FACTIONS[seed % 3], FACTIONS[(seed + 1) % 3], przeszkody, rng);

  for (const u of b.units) {
    const zajete = new Set(b.units.filter((x) => x.id !== u.id).map((x) => cellKey(x.col, x.row)));
    for (const key of reachable(b, u).keys()) {
      const [col, row] = key.split(',').map(Number);
      if (col === u.col && row === u.row) continue;
      const trasa = movePath(b, u, { col, row });
      tras++;

      if (u.def.flying) {
        latacze++;
        if (trasa.length === 1) lataczeProsto++;
        continue;
      }

      let poprzedni = { col: u.col, row: u.row };
      for (const k of trasa) {
        if (hexDistance(poprzedni, k) !== 1) przezSasiada++;
        if (zajete.has(cellKey(k.col, k.row))) naZajete++;
        if (b.obstacles.has(cellKey(k.col, k.row))) naPrzeszkode++;
        poprzedni = k;
      }
      void neighbours;
    }
  }
}

console.log(`Tras sprawdzonych: ${tras} (w tym lataczy: ${latacze})`);
console.log(`  kroki NIE na sąsiedni heks: ${przezSasiada}`);
console.log(`  kroki na pole zajęte:       ${naZajete}`);
console.log(`  kroki na przeszkodę:        ${naPrzeszkode}`);
console.log(`  latacze jednym skokiem:     ${lataczeProsto}/${latacze}`);
const ok = przezSasiada === 0 && naZajete === 0 && naPrzeszkode === 0 && lataczeProsto === latacze;
console.log(ok ? '\nOK.' : '\nBŁĄD — trasa łamie siatkę.');
process.exitCode = ok ? 0 : 1;
