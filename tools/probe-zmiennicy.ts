/**
 * Walki jak w bajce: 1 na 1 z dzikimi, 2 na 2 z trenerami, a po zemdlonym
 * wchodzi następny stworek z pokeballa (`wejdzZmiennik`).
 *
 *   npx tsx tools/probe-zmiennicy.ts
 */
import {
  COLS,
  NA_POLU,
  NA_POLU_DZIKIE,
  createBattle,
  makeRng,
  performAttack,
  runBattle,
  sprawnych,
} from '../src/data/battle';
import { RYWAL_ID, naPoluPrzeciw } from '../src/data/mapa';
import { zlap } from '../src/data/przedmioty';
import { defStworka, nowyStworek, rozegrajBitwe } from '../src/data/stworki';

let bledy = 0;
const sprawdz = (nazwa: string, warunek: boolean, szczegol = '') => {
  if (!warunek) bledy++;
  console.log(`${warunek ? 'OK  ' : 'BŁĄD'} ${nazwa}${szczegol ? ` — ${szczegol}` : ''}`);
};

const def = (tier: number, poziom: number) => defStworka(nowyStworek('bor', tier, poziom)!)!;
const trzy = { units: [def(0, 8), def(1, 8), def(2, 8)] };

{
  const b = createBattle(trzy, trzy, [], makeRng(3), NA_POLU_DZIKIE);
  sprawdz('1 na 1: na polu po jednym', b.units.filter((u) => u.side === 'player').length === 1 && b.units.filter((u) => u.side === 'enemy').length === 1);
  sprawdz('reszta czeka w pokeballach', b.rezerwa!.player.length === 2 && b.rezerwa!.enemy.length === 2);
  const ids = [...b.units, ...b.rezerwa!.player, ...b.rezerwa!.enemy].map((u) => u.id).sort((x, y) => x - y);
  sprawdz('identyfikatory po kolei, lewa strona pierwsza', ids.join(',') === '1,2,3,4,5,6', ids.join(','));
  const { outcome } = runBattle(b);
  const przegrany = outcome === 'player' ? 'enemy' : 'player';
  sprawdz('bitwa się rozstrzyga', outcome !== 'remis', outcome);
  sprawdz('przegrany nie ma już nikogo — ani na polu, ani w pokeballach', sprawnych(b, przegrany) === 0);
}

{
  const b = createBattle(trzy, trzy, [], makeRng(5), NA_POLU);
  sprawdz('2 na 2: na polu po dwa', b.units.length === 4 && b.rezerwa!.player.length === 1);
  // Cios, który na pewno zwala cel: zmiennik wchodzi przy krawędzi celu.
  const a = b.units.find((u) => u.side === 'player')!;
  const cel = b.units.find((u) => u.side === 'enemy')!;
  cel.topHp = 1;
  a.col = cel.col - 1;
  a.row = cel.row;
  const log = performAttack(b, a, cel, { col: a.col, row: a.row });
  const wejscie = log.find((e) => e.rodzaj === 'wejscie');
  const zejscie = log.findIndex((e) => e.rodzaj === 'zejscie');
  sprawdz('po zemdlonym wchodzi zmiennik', !!wejscie && log.indexOf(wejscie) > zejscie);
  const nowy = wejscie && b.units.find((u) => u.id === wejscie.kto);
  sprawdz('zmiennik staje przy swojej krawędzi', !!nowy && nowy.col === COLS - 1, nowy ? `${nowy.col},${nowy.row}` : '');
  sprawdz('pole wroga dalej ma dwóch', b.units.filter((u) => u.side === 'enemy').length === 2);
  sprawdz('zmiennik nie rusza się w tej rundzie', !!nowy && !b.roundQueue.includes(nowy.id));
}

{
  // Złapany dziki robi miejsce następnemu ze stada.
  const b = createBattle(trzy, trzy, [], makeRng(7), NA_POLU_DZIKIE);
  const dziki = b.units.find((u) => u.side === 'enemy')!;
  const nastepny = zlap(b, dziki);
  sprawdz('po złapanym wskakuje następny dziki', !!nastepny && b.units.some((u) => u.id === nastepny.id));
}

{
  // Rozegranie bez sceny: kto nie zdążył wyjść z pokeballa, nie mdleje.
  const druzyna = [nowyStworek('bor', 5, 30)!, nowyStworek('bor', 0, 5)!, nowyStworek('bor', 1, 5)!];
  const dziki = [nowyStworek('grota', 0, 3)!];
  const w = rozegrajBitwe(druzyna, dziki, makeRng(11), undefined, NA_POLU_DZIKIE);
  sprawdz('silny pierwszy wygrywa sam', w.outcome === 'player');
  sprawdz('czekający w pokeballach wracają cali', w.ocalaliAtak[1] === 1 && w.ocalaliAtak[2] === 1, w.ocalaliAtak.join(','));
}

{
  // Cała drużyna walczy po kolei — słabsi pierwsi, silny ostatni, i tak wygrywa.
  const druzyna = [nowyStworek('bor', 0, 3)!, nowyStworek('bor', 1, 3)!, nowyStworek('bor', 5, 40)!];
  const straz = [nowyStworek('grota', 2, 12)!, nowyStworek('grota', 3, 12)!];
  const w = rozegrajBitwe(druzyna, straz, makeRng(13), undefined, NA_POLU);
  sprawdz('zmiennik z końca drużyny wchodzi i rozstrzyga', w.outcome === 'player', `${w.outcome}, ocaleli ${w.ocalaliAtak.join(',')}`);
}

sprawdz('dzikie: jeden na jednego', naPoluPrzeciw({ rodzaj: 'potwor', id: 5 }) === 1);
sprawdz('miasto / sala: dwa na dwa', naPoluPrzeciw({ rodzaj: 'zamek', id: 5 }) === 2);
sprawdz('rywal: dwa na dwa', naPoluPrzeciw({ rodzaj: 'potwor', id: RYWAL_ID }) === 2);

console.log(bledy ? `\nBŁĘDÓW: ${bledy}` : '\nWSZYSTKO OK');
process.exit(bledy ? 1 : 0);
