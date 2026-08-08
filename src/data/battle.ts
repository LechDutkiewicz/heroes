/**
 * Zasady walki, bez grafiki.
 *
 * Do tej pory reguły siedziały w scenie, wplecione między tweeny i rysowanie.
 * Nie dało się ich uruchomić inaczej niż otwierając przeglądarkę i klikając,
 * więc jakiekolwiek pytanie o balans — czy frakcje są równe, czy któryś
 * oddział jest bezużyteczny — pozostawało kwestią wrażenia.
 *
 * Tutaj są te same reguły w postaci czystych funkcji: żadnego Phasera, żadnego
 * czasu, żadnych animacji. Dzięki temu narzędzie `tools/balance.ts` rozgrywa
 * tysiące bitew w sekundy i odpowiada liczbami. Scena ma z tego korzystać jako
 * z jedynego źródła zasad — dwie kopie reguł rozjechałyby się po pierwszej
 * zmianie i symulacja mierzyłaby coś innego niż to, w co gra gracz.
 */

import {
  HALF_DAMAGE,
  applyDamage,
  stackAtk,
  totalHp,
  typeMultiplier,
  type UnitDef,
} from './units';
import { hexDistance, hexNeighbours, type Cell } from './hex';

export const COLS = 10;
export const ROWS = 7;

/** Sześć oddziałów w kolumnie z przerwą pośrodku, jak w Heroes 3. */
export const START_ROWS = [0, 1, 2, 4, 5, 6];

/** O tyle słabsze jest trafienie w oddział, który stoi w obronie. */
export const GUARD_REDUCTION = 0.7;

export type Side = 'player' | 'enemy';

export interface SimUnit extends Cell {
  id: number;
  side: Side;
  def: UnitDef;
  /** ilu stworków zostało w oddziale */
  count: number;
  /** HP stworka stojącego z przodu — reszta ma pełne */
  topHp: number;
  /** ile razy jeszcze odda w tej rundzie */
  retaliations: number;
  waited: boolean;
  defending: boolean;
}

export interface Battle {
  units: SimUnit[];
  obstacles: Set<string>;
  roundQueue: number[];
  round: number;
  /**
   * Obrażenia zadane przez każdy oddział, po nazwie. Sam odsetek zwycięstw
   * mówi tylko, czy frakcje są równe — nie wykryje oddziału, który jest
   * bezużyteczny, bo jego brak nadrabiają pozostali. Bez tego licznika
   * „zbalansowana" frakcja może się składać z trzech gwiazd i trzech
   * pasażerów na gapę.
   */
  dealt: Map<string, number>;
}

export const cellKey = (col: number, row: number) => `${col},${row}`;

/**
 * Powtarzalne losowanie. Symulacja bez ziarna daje za każdym razem inny wynik
 * i nie da się powiedzieć, czy zmiana statystyk pomogła, czy tylko trafił się
 * lepszy los.
 */
export function makeRng(seed: number) {
  let s = seed >>> 0 || 1;
  return () => {
    s ^= s << 13;
    s ^= s >>> 17;
    s ^= s << 5;
    s >>>= 0;
    return s / 0x100000000;
  };
}

export const isAlive = (b: Battle, u: SimUnit) => b.units.includes(u) && u.count > 0;

export const total = (u: SimUnit) => totalHp(u.def, u);

export function neighbours(cell: Cell) {
  return hexNeighbours(cell, COLS, ROWS);
}

function blockedCells(b: Battle, excludeId: number) {
  const set = new Set<string>();
  for (const u of b.units) if (u.id !== excludeId) set.add(cellKey(u.col, u.row));
  return set;
}

/** BFS po planszy — koszt dojścia do każdego osiągalnego pola. */
export function reachable(b: Battle, unit: SimUnit): Map<string, number> {
  const blocked = blockedCells(b, unit.id);

  // Latacz idzie w linii prostej; musi tylko mieć gdzie wylądować.
  if (unit.def.flying) {
    const dist = new Map<string, number>();
    for (let row = 0; row < ROWS; row++) {
      for (let col = 0; col < COLS; col++) {
        const cost = hexDistance(unit, { col, row });
        if (cost > unit.def.move) continue;
        const key = cellKey(col, row);
        if (cost > 0 && (blocked.has(key) || b.obstacles.has(key))) continue;
        dist.set(key, cost);
      }
    }
    return dist;
  }

  const dist = new Map<string, number>([[cellKey(unit.col, unit.row), 0]]);
  const queue: Cell[] = [{ col: unit.col, row: unit.row }];
  while (queue.length > 0) {
    const cur = queue.shift()!;
    const cost = dist.get(cellKey(cur.col, cur.row))!;
    if (cost >= unit.def.move) continue;
    for (const n of neighbours(cur)) {
      const key = cellKey(n.col, n.row);
      if (blocked.has(key) || b.obstacles.has(key) || dist.has(key)) continue;
      dist.set(key, cost + 1);
      queue.push(n);
    }
  }
  return dist;
}

export const isAdjacent = (a: Cell, c: Cell) => hexDistance(a, c) === 1;

export function hasAdjacentEnemy(b: Battle, unit: SimUnit) {
  return b.units.some((u) => u.side !== unit.side && isAdjacent(unit, u));
}

/** Wróg tuż obok blokuje strzelca — musi bić wręcz, jak łucznik w Heroes 3. */
export function canShoot(b: Battle, unit: SimUnit) {
  return unit.def.shooter && !hasAdjacentEnemy(b, unit);
}

export function attackPlan(
  b: Battle,
  unit: SimUnit,
  target: SimUnit,
  reach: Map<string, number>
): { from: Cell } | null {
  if (canShoot(b, unit)) return { from: { col: unit.col, row: unit.row } };
  if (isAdjacent(unit, target)) return { from: { col: unit.col, row: unit.row } };
  // Zablokowany strzelec nie odbiega, żeby uderzyć kogoś dalej.
  if (unit.def.shooter) return null;

  let best: { from: Cell; cost: number } | null = null;
  for (const cell of neighbours(target)) {
    const cost = reach.get(cellKey(cell.col, cell.row));
    if (cost === undefined) continue;
    if (!best || cost < best.cost) best = { from: cell, cost };
  }
  return best ? { from: best.from } : null;
}

export function damageOf(b: Battle, attacker: SimUnit, target: SimUnit) {
  const typeMult = typeMultiplier(attacker.def.type, target.def.type);
  const pinned = attacker.def.shooter && hasAdjacentEnemy(b, attacker);
  const tooFar =
    attacker.def.shooter && !pinned && hexDistance(attacker, target) > attacker.def.shootRange;
  const penalty = pinned || tooFar ? HALF_DAMAGE : 1;
  const guard = target.defending ? GUARD_REDUCTION : 1;
  const base = stackAtk(attacker.def, attacker);
  const value = Math.max(1, Math.round(base * typeMult * penalty * guard));
  return {
    value,
    base,
    typeMult,
    penalty,
    pinned,
    tooFar,
    guarded: target.defending,
    kills: applyDamage(target.def, target, value).killed,
  };
}

/** Nalicza jedno trafienie. Zwraca liczbę poległych. */
export function resolveHit(b: Battle, attacker: SimUnit, target: SimUnit) {
  const { value, typeMult, pinned, tooFar } = damageOf(b, attacker, target);
  const guarded = target.defending;
  const { state, killed } = applyDamage(target.def, target, value);
  // Liczymy obrażenia FAKTYCZNIE zadane, nie wyliczone: cios w oddział, któremu
  // zostały trzy punkty życia, wart jest trzy, a nie trzydzieści. Inaczej
  // czempion dobijający resztki wyglądałby na najskuteczniejszy w armii.
  const before = totalHp(target.def, target);
  b.dealt.set(attacker.def.name, (b.dealt.get(attacker.def.name) ?? 0) + Math.min(value, before));
  target.count = state.count;
  target.topHp = state.topHp;
  if (target.count <= 0) {
    b.units = b.units.filter((u) => u.id !== target.id);
    b.roundQueue = b.roundQueue.filter((id) => id !== target.id);
  }
  // Zwracamy też stan celu PO ciosie i wszystkie mnożniki, bo scena ma tylko
  // odegrać to, co się stało — nie wolno jej niczego doliczać samodzielnie,
  // inaczej znów istniałyby dwie kopie tego samego rachunku.
  return {
    damage: value,
    killed,
    typeMult,
    pinned,
    tooFar,
    guarded,
    countAfter: target.count,
    topHpAfter: target.topHp,
  };
}

/**
 * Dziennik ataku: co po kolei się wydarzyło. Scena odgrywa go animacjami,
 * zamiast prowadzić własną, równoległą kolejność zdarzeń — bo to właśnie
 * kolejność (dojście, cios, drugi cios, odwet, powrót), a nie same liczby,
 * decyduje o wyniku starcia.
 */
export type BattleEvent =
  | { rodzaj: 'ruch'; kto: number; doKol: number; doRzed: number }
  | {
      rodzaj: 'cios';
      kto: number;
      wKogo: number;
      obrazenia: number;
      polegli: number;
      celLiczebnoscPo: number;
      celTopHpPo: number;
      /** to trafienie jest odwetem obrońcy */
      odwet: boolean;
      /** to trafienie jest strzałem — leci pocisk, nie ma zwarcia */
      strzal: boolean;
      /** to drugi cios oddziału z podwójnym uderzeniem */
      drugi: boolean;
      typeMult: number;
      pinned: boolean;
      tooFar: boolean;
      guarded: boolean;
    }
  | { rodzaj: 'zejscie'; kto: number }
  | { rodzaj: 'powrot'; kto: number; doKol: number; doRzed: number };

/**
 * Pełna wymiana: dojście, cios, ewentualny drugi cios, odwet i powrót.
 * Kolejność jest ta sama co w scenie — to ona, a nie same liczby, decyduje
 * o tym, ile oddział realnie znosi i zadaje.
 */
export function performAttack(
  b: Battle,
  attacker: SimUnit,
  target: SimUnit,
  from: Cell
): BattleEvent[] {
  const origin = { col: attacker.col, row: attacker.row };
  const shooting = canShoot(b, attacker);
  const log: BattleEvent[] = [];

  const hit = (a: SimUnit, t: SimUnit, opts: { odwet: boolean; strzal: boolean; drugi: boolean }) => {
    const r = resolveHit(b, a, t);
    log.push({
      rodzaj: 'cios',
      kto: a.id,
      wKogo: t.id,
      obrazenia: r.damage,
      polegli: r.killed,
      celLiczebnoscPo: r.countAfter,
      celTopHpPo: r.topHpAfter,
      odwet: opts.odwet,
      strzal: opts.strzal,
      drugi: opts.drugi,
      typeMult: r.typeMult,
      pinned: r.pinned,
      tooFar: r.tooFar,
      guarded: r.guarded,
    });
    if (t.count <= 0) log.push({ rodzaj: 'zejscie', kto: t.id });
  };

  if (from.col !== attacker.col || from.row !== attacker.row) {
    attacker.col = from.col;
    attacker.row = from.row;
    log.push({ rodzaj: 'ruch', kto: attacker.id, doKol: from.col, doRzed: from.row });
  }

  hit(attacker, target, { odwet: false, strzal: shooting, drugi: false });

  // Podwójny cios pada, zanim obrońca zdąży oddać.
  if (attacker.def.ability === 'double' && isAlive(b, attacker) && isAlive(b, target)) {
    hit(attacker, target, { odwet: false, strzal: shooting, drugi: true });
  }

  // Strzał nie prowokuje odwetu; uderz-i-wróć też go nie dostaje.
  const retaliates =
    !shooting &&
    attacker.def.ability !== 'strikeAndReturn' &&
    isAlive(b, attacker) &&
    isAlive(b, target) &&
    target.retaliations > 0;

  if (retaliates) {
    if (target.def.ability !== 'guardian') target.retaliations--;
    hit(target, attacker, { odwet: true, strzal: false, drugi: false });
  }

  // Harpia odskakuje na pole, z którego ruszyła.
  const moved = attacker.col !== origin.col || attacker.row !== origin.row;
  if (attacker.def.ability === 'strikeAndReturn' && isAlive(b, attacker) && moved) {
    const occupied = b.units.some(
      (u) => u.id !== attacker.id && u.col === origin.col && u.row === origin.row
    );
    if (!occupied) {
      attacker.col = origin.col;
      attacker.row = origin.row;
      log.push({ rodzaj: 'powrot', kto: attacker.id, doKol: origin.col, doRzed: origin.row });
    }
  }

  return log;
}

/**
 * Ruch oddziału sterowanego przez maszynę. Ta sama polityka, którą w grze
 * gra przeciwnik — w symulacji stosujemy ją do obu stron, żeby porównywać
 * frakcje, a nie umiejętności dwóch różnych algorytmów.
 */
/**
 * Decyzja maszyny, bez wykonania. Wydzielona z `takeTurn`, żeby scena mogła
 * podjąć TĘ SAMĄ decyzję, a potem odegrać ją animacjami — wcześniej miała
 * własną kopię punktacji celów i to ona rozjeżdżała się z symulacją.
 */
export type AiAction =
  | { rodzaj: 'atak'; cel: SimUnit; from: Cell }
  | { rodzaj: 'ruch'; cel: Cell }
  | { rodzaj: 'obrona' }
  | { rodzaj: 'nic' };

export function chooseAction(b: Battle, unit: SimUnit): AiAction {
  const targets = b.units.filter((u) => u.side !== unit.side);
  if (targets.length === 0) return { rodzaj: 'nic' };

  const reach = reachable(b, unit);

  let best: { target: SimUnit; from: Cell; score: number } | null = null;
  for (const target of targets) {
    const plan = attackPlan(b, unit, target, reach);
    if (!plan) continue;
    const { value: dmg, kills } = damageOf(b, unit, target);
    const score =
      (dmg >= total(target) ? 100 : 0) + kills * 10 + dmg + (target.def.shooter ? 5 : 0);
    if (!best || score > best.score) best = { target, from: plan.from, score };
  }

  if (best) return { rodzaj: 'atak', cel: best.target, from: best.from };

  let nearest = targets[0];
  for (const t of targets) {
    if (hexDistance(unit, t) < hexDistance(unit, nearest)) nearest = t;
  }
  let bestCell: Cell = { col: unit.col, row: unit.row };
  let bestDist = hexDistance(unit, nearest);
  for (const key of reach.keys()) {
    const [col, row] = key.split(',').map(Number);
    const d = hexDistance({ col, row }, nearest);
    if (d < bestDist) {
      bestDist = d;
      bestCell = { col, row };
    }
  }
  if (bestCell.col === unit.col && bestCell.row === unit.row) return { rodzaj: 'obrona' };
  return { rodzaj: 'ruch', cel: bestCell };
}

export function takeTurn(b: Battle, unit: SimUnit) {
  const action = chooseAction(b, unit);
  if (action.rodzaj === 'atak') performAttack(b, unit, action.cel, action.from);
  else if (action.rodzaj === 'obrona') unit.defending = true;
  else if (action.rodzaj === 'ruch') {
    unit.col = action.cel.col;
    unit.row = action.cel.row;
  }
}

/**
 * Nowa runda: odwet się odnawia, kolejność od najszybszego.
 *
 * Przy równej szybkości pierwszeństwo ODWRACA SIĘ co rundę. Wcześniej remis
 * rozstrzygał numer oddziału, a numery rosną od lewej armii do prawej, więc
 * przy lustrzanych szybkościach cała lewa strona ruszała się przed całą prawą
 * w każdej rundzie bez wyjątku. To dawało prawej stronie trwałą przewagę:
 * lewa rozprowadzała obrażenia po sześciu oddziałach, a prawa zamieniała je
 * w ZABICIA — a zabity oddział przestaje i zadawać, i oddawać. Symulator
 * pokazywał z tego powodu, że strona ruszająca się pierwsza przegrywa
 * wszystkie starcia sześć na sześć, choć w pojedynku jeden na jednego
 * wygrywa. Naprzemienność znosi tę przewagę, nie ruszając samych statystyk.
 */
export function startRound(b: Battle) {
  for (const u of b.units) {
    u.waited = false;
    u.retaliations = 1;
  }
  const najpierwGracz = b.round % 2 === 1;
  const waga = (u: SimUnit) => (u.side === 'player' ? (najpierwGracz ? 0 : 1) : najpierwGracz ? 1 : 0);
  b.roundQueue = [...b.units]
    .sort((x, y) => y.def.move - x.def.move || waga(x) - waga(y) || x.id - y.id)
    .map((u) => u.id);
}

export function makeUnit(def: UnitDef, side: Side, col: number, row: number, id: number): SimUnit {
  return {
    id,
    side,
    def,
    count: def.count,
    topHp: def.hp,
    col,
    row,
    retaliations: 1,
    waited: false,
    defending: false,
  };
}

export interface Army {
  units: UnitDef[];
}

/** Tasowanie w miejscu, z podanego źródła losowości — powtarzalne przy ziarnie. */
export function shuffle<T>(xs: T[], rng: () => number): T[] {
  for (let i = xs.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [xs[i], xs[j]] = [xs[j], xs[i]];
  }
  return xs;
}

/**
 * Ustawia obie armie przy swoich krawędziach.
 *
 * `rng` losuje, który oddział staje w którym rzędzie. Bez tego bitwa jest
 * w pełni deterministyczna — obrażenia liczone bez losowości, wybór celu bez
 * losowości, pozycje stałe — a symulacja tysiąca starć rozgrywa tysiąc razy
 * TĘ SAMĄ bitwę i zwraca 0% albo 100%, nigdy nic pomiędzy. Wyglądało to jak
 * mocny wynik statystyczny, a było jednym wynikiem powielonym.
 *
 * Losowy układ jest zresztą potrzebny samej grze: bez niego gracz rozgrywa
 * w kółko identyczne starcie.
 */
export function createBattle(
  left: Army,
  right: Army,
  obstacles: string[] = [],
  rng?: () => number
): Battle {
  let id = 1;
  const units: SimUnit[] = [];
  const rzedy = () => (rng ? shuffle([...START_ROWS], rng) : [...START_ROWS]);
  const rzedyL = rzedy();
  const rzedyP = rzedy();
  left.units.forEach((def, i) => units.push(makeUnit(def, 'player', 0, rzedyL[i], id++)));
  right.units.forEach((def, i) => units.push(makeUnit(def, 'enemy', COLS - 1, rzedyP[i], id++)));
  const b: Battle = {
    units,
    obstacles: new Set(obstacles),
    roundQueue: [],
    round: 1,
    dealt: new Map(),
  };
  startRound(b);
  return b;
}

export type Outcome = 'player' | 'enemy' | 'remis';

/**
 * Rozgrywa całą bitwę do rozstrzygnięcia. Limit rund chroni przed patem,
 * w którym dwa oddziały nie mogą się dosięgnąć — bez niego pętla wisi.
 */
export function runBattle(b: Battle, maxRounds = 60): { outcome: Outcome; rounds: number } {
  while (b.round <= maxRounds) {
    while (b.roundQueue.length > 0) {
      // Zdejmujemy z kolejki PRZED turą, nie po niej.
      //
      // Oddział może zginąć we własnej turze — od odwetu obrońcy. Wtedy
      // `resolveHit` usuwa jego numer z kolejki, więc na czele stoi już
      // następny, a `shift()` po turze zjadałby JEGO kolejkę. Symulacja
      // pokazywała przez to, że strona ruszająca się pierwsza przegrywa
      // wszystkie bitwy — bo po każdej śmierci od odwetu jej sojusznik
      // tracił turę.
      const id = b.roundQueue.shift()!;
      const unit = b.units.find((u) => u.id === id);
      if (!unit) continue;
      unit.defending = false;
      takeTurn(b, unit);

      const left = b.units.some((u) => u.side === 'player');
      const right = b.units.some((u) => u.side === 'enemy');
      if (!left || !right) {
        return { outcome: left ? 'player' : 'enemy', rounds: b.round };
      }
    }
    b.round++;
    startRound(b);
  }
  return { outcome: 'remis', rounds: b.round };
}
