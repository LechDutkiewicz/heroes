/**
 * Sonda ataków stworków (etap 4): czy każdy atak robi to, co obiecuje jego
 * przycisk — siła, PP, podwójny cios, uderz i wróć, brak odwetu, trzeci atak
 * dopiero po ewolucji — i czy maszyna w ogóle sięga po ataki specjalne.
 *
 *   npx tsx tools/probe-ataki.ts
 */
import {
  atakiJednostki,
  createBattle,
  damageOf,
  makeRng,
  performAttack,
  runBattle,
  type Battle,
  type BattleEvent,
  type SimUnit,
} from '../src/data/battle';
import { MOC_OSTATECZNEGO, MOC_SPECJALNEGO, atakiStworka } from '../src/data/ataki';
import { FACTIONS } from '../src/data/factions';
import type { UnitDef } from '../src/data/units';

let bledy = 0;
const sprawdz = (nazwa: string, warunek: boolean, szczegol = '') => {
  if (!warunek) bledy++;
  console.log(`${warunek ? 'OK  ' : 'BŁĄD'} ${nazwa}${szczegol ? ` — ${szczegol}` : ''}`);
};

const bor = FACTIONS[0].units;
const zwykly = bor.find((u) => !u.shooter && !u.ability)!;
const strzelec = bor.find((u) => u.shooter)!;
const podwojny = bor.find((u) => u.ability === 'double')!;
const harpia = bor.find((u) => u.ability === 'strikeAndReturn')!;
const straznik = bor.find((u) => u.ability === 'guardian')!;

/** Dwóch na planszy: napastnik tuż obok celu, żeby nie liczyć dojścia. */
function para(a: UnitDef, cel: UnitDef): { b: Battle; x: SimUnit; y: SimUnit } {
  const b = createBattle({ units: [a] }, { units: [{ ...cel, hp: cel.hp * 20 }] });
  const [x, y] = b.units;
  x.col = 4;
  x.row = 3;
  y.col = 5;
  y.row = 3;
  return { b, x, y };
}
const ciosy = (log: BattleEvent[]) => log.filter((e) => e.rodzaj === 'cios') as Extract<BattleEvent, { rodzaj: 'cios' }>[];

console.log('--- lista ataków ---');
sprawdz('zwykły stworek ma 2 ataki przed ewolucją', atakiStworka(zwykly).length === 2);
sprawdz('po ewolucji dochodzi trzeci', atakiStworka({ ...zwykly, etap: 1 }).length === 3);
sprawdz('pierwszy atak jest bez limitu', atakiStworka(zwykly)[0].pp === null);
sprawdz('podwójny cios jest atakiem, nie cechą', atakiStworka(podwojny)[1].efekt === 'podwojny');
sprawdz('uderz i wróć jest atakiem', atakiStworka(harpia)[1].efekt === 'uderzIWroc');
sprawdz('strażnik ma zwykły atak specjalny', atakiStworka(straznik)[1].moc === MOC_SPECJALNEGO);

console.log('--- siła i PP ---');
{
  const { b, x, y } = para(zwykly, zwykly);
  const d0 = damageOf(b, x, y, 0).value;
  const d1 = damageOf(b, x, y, 1).value;
  sprawdz('specjalny bije mocniej', Math.abs(d1 - d0 * MOC_SPECJALNEGO) <= 1, `${d0} → ${d1}`);
  const pp = x.pp[1]!;
  performAttack(b, x, y, { col: x.col, row: x.row }, 1);
  sprawdz('atak zużywa PP', x.pp[1] === pp - 1, `${pp} → ${x.pp[1]}`);
  for (let i = 0; i < 5; i++) performAttack(b, x, y, { col: x.col, row: x.row }, 1);
  sprawdz('PP nie schodzą poniżej zera', x.pp[1] === 0);
  const log = performAttack(b, x, y, { col: x.col, row: x.row }, 1);
  sprawdz('bez PP atak zamienia się w zwykły', ciosy(log)[0].atak === 0 && ciosy(log)[0].obrazenia <= d0 + 1);
}
{
  const ewo = { ...zwykly, etap: 1 };
  const { b, x, y } = para(ewo, zwykly);
  const d0 = damageOf(b, x, y, 0).value;
  const log = performAttack(b, x, y, { col: x.col, row: x.row }, 2);
  const c = ciosy(log);
  sprawdz('ostateczny: siła ×2', Math.abs(c[0].obrazenia - d0 * MOC_OSTATECZNEGO) <= 1, `${d0} → ${c[0].obrazenia}`);
  sprawdz('ostateczny: cel nie oddaje', !c.some((e) => e.odwet));
  const { b: b2, x: x2, y: y2 } = para(zwykly, zwykly);
  const log2 = performAttack(b2, x2, y2, { col: x2.col, row: x2.row }, 2);
  sprawdz('przed ewolucją trzeciego ataku nie ma (zwykły cios)', ciosy(log2)[0].atak === 0);
}

console.log('--- efekty ---');
{
  const { b, x, y } = para(podwojny, zwykly);
  const zw = ciosy(performAttack(b, x, y, { col: x.col, row: x.row }, 0));
  sprawdz('zwykły atak czempiona to jeden cios', zw.filter((e) => !e.odwet).length === 1);
  const sp = ciosy(performAttack(b, x, y, { col: x.col, row: x.row }, 1));
  sprawdz('podwójny cios to dwa ciosy', sp.filter((e) => !e.odwet).length === 2);
}
{
  const { b, x, y } = para(harpia, zwykly);
  x.col = 2;
  const log = performAttack(b, x, y, { col: 4, row: 3 }, 1);
  sprawdz('uderz i wróć: bez odwetu', !ciosy(log).some((e) => e.odwet));
  sprawdz('uderz i wróć: wraca na swoje pole', log.some((e) => e.rodzaj === 'powrot') && x.col === 2);
  const { b: b2, x: x2, y: y2 } = para(harpia, zwykly);
  x2.col = 2;
  const log2 = performAttack(b2, x2, y2, { col: 4, row: 3 }, 0);
  sprawdz('zwykły atak harpii: dostaje odwet i zostaje', ciosy(log2).some((e) => e.odwet) && x2.col === 4);
}

console.log('--- maszyna ---');
{
  // Czy AI sięga po ataki specjalne i czy żadna bitwa nie wisi.
  let specjalne = 0;
  let wszystkie = 0;
  let remisy = 0;
  for (let s = 1; s <= 200; s++) {
    const rng = makeRng(s);
    const ewo = (u: UnitDef) => ({ ...u, etap: s % 2 });
    const b = createBattle(
      { units: FACTIONS[s % 3].units.slice(0, 4).map(ewo) },
      { units: FACTIONS[(s + 1) % 3].units.slice(2, 6).map(ewo) },
      [],
      rng
    );
    const pp0 = b.units.map((u) => [...u.pp]);
    const jednostki = [...b.units];
    const { outcome } = runBattle(b);
    if (outcome === 'remis') remisy++;
    jednostki.forEach((u, i) => {
      atakiJednostki(u).forEach((a, k) => {
        if (a.pp === null) return;
        wszystkie += pp0[i][k]!;
        specjalne += pp0[i][k]! - u.pp[k]!;
      });
    });
  }
  sprawdz('maszyna używa ataków specjalnych', specjalne > wszystkie * 0.3, `${specjalne} z ${wszystkie} PP`);
  sprawdz('żadna bitwa nie kończy się remisem', remisy === 0, `${remisy}`);
}

console.log(bledy ? `\nBŁĘDÓW: ${bledy}` : '\nWSZYSTKO OK');
process.exit(bledy ? 1 : 0);
