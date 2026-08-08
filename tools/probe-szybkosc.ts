/**
 * Sonda: dlaczego szybkość jest wadą?
 *
 * Rozgrywa tę samą frakcję przeciw sobie samej, jednej stronie dodając N ruchu,
 * i liczy nie tylko zwycięstwa, ale też co strona robi w turach. Jeśli szybsza
 * strona przegrywa, chcemy wiedzieć CZYM — mniej ciosów, więcej obrywania,
 * czy oddawaniem tur na marsz.
 *
 * Uruchomienie: npx tsx tools/probe-szybkosc.ts
 */
import { FACTIONS, type Faction } from '../src/data/factions';
import {
  COLS,
  ROWS,
  cellKey,
  chooseAction,
  createBattle,
  makeRng,
  performAttack,
  startRound,
  type Battle,
  type Side,
} from '../src/data/battle';

function przeszkody(rng: () => number): string[] {
  const ile = Math.floor(rng() * 5);
  const pola: string[] = [];
  for (let i = 0; i < ile; i++)
    pola.push(cellKey(2 + Math.floor(rng() * (COLS - 4)), Math.floor(rng() * ROWS)));
  return pola;
}

function przesun(f: Faction, d: number): Faction {
  return { ...f, id: f.id + '_x', units: f.units.map((u) => ({ ...u, move: Math.max(1, u.move + d) })) };
}

interface Licznik {
  ataki: number;
  marsze: number;
  obrony: number;
  zadane: number;
  bitwy: number;
}
const pusty = (): Licznik => ({ ataki: 0, marsze: 0, obrony: 0, zadane: 0, bitwy: 0 });

/** Kopia pętli z runBattle, ale z licznikami czynności per strona. */
function rozegraj(b: Battle, lic: Record<Side, Licznik>, maxRounds = 60) {
  while (b.round <= maxRounds) {
    while (b.roundQueue.length > 0) {
      const id = b.roundQueue.shift()!;
      const unit = b.units.find((u) => u.id === id);
      if (!unit) continue;
      unit.defending = false;
      const a = chooseAction(b, unit);
      const przed = [...b.dealt.values()].reduce((x, y) => x + y, 0);
      if (a.rodzaj === 'atak') {
        lic[unit.side].ataki++;
        performAttack(b, unit, a.cel, a.from);
      } else if (a.rodzaj === 'obrona') {
        lic[unit.side].obrony++;
        unit.defending = true;
      } else if (a.rodzaj === 'ruch') {
        lic[unit.side].marsze++;
        unit.col = a.cel.col;
        unit.row = a.cel.row;
      }
      // Różnica w sumie zadanych obrażeń obejmuje też odwet obrońcy, ale
      // przypisujemy ją turze — chodzi o bilans tury, nie o autorstwo ciosu.
      lic[unit.side].zadane += [...b.dealt.values()].reduce((x, y) => x + y, 0) - przed;

      const left = b.units.some((u) => u.side === 'player');
      const right = b.units.some((u) => u.side === 'enemy');
      if (!left || !right) return left ? 'player' : 'enemy';
    }
    b.round++;
    startRound(b);
  }
  return 'remis';
}

for (const f of FACTIONS) {
  for (const d of [1, 2]) {
    const szybka = przesun(f, d);
    const lic = { szybka: pusty(), wolna: pusty() };
    let wygraneSzybkiej = 0;
    let n = 0;
    for (const szybkaJestLewa of [true, false]) {
      for (let i = 0; i < 300; i++) {
        const rng = makeRng(i * 2654435761 + 1);
        const b = createBattle(
          szybkaJestLewa ? szybka : f,
          szybkaJestLewa ? f : szybka,
          przeszkody(rng),
          rng
        );
        const perSide = pusty();
        const tmp: Record<Side, Licznik> = { player: pusty(), enemy: pusty() };
        void perSide;
        const outcome = rozegraj(b, tmp);
        const s = szybkaJestLewa ? tmp.player : tmp.enemy;
        const w = szybkaJestLewa ? tmp.enemy : tmp.player;
        for (const k of ['ataki', 'marsze', 'obrony', 'zadane'] as const) {
          lic.szybka[k] += s[k];
          lic.wolna[k] += w[k];
        }
        lic.szybka.bitwy++;
        lic.wolna.bitwy++;
        if (outcome === 'remis') continue;
        n++;
        if ((outcome === 'player') === szybkaJestLewa) wygraneSzybkiej++;
      }
    }
    const na = (l: Licznik) =>
      `ataki ${(l.ataki / l.bitwy).toFixed(1)}  marsze ${(l.marsze / l.bitwy).toFixed(1)}` +
      `  obrony ${(l.obrony / l.bitwy).toFixed(1)}  obraz. ${(l.zadane / l.bitwy).toFixed(0)}`;
    console.log(`${f.name}  +${d} ruchu -> ${((wygraneSzybkiej / n) * 100).toFixed(1)}% zwyciestw`);
    console.log(`   szybka: ${na(lic.szybka)}`);
    console.log(`   wolna : ${na(lic.wolna)}\n`);
  }
}
