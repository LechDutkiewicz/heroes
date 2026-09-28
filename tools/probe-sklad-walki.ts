/**
 * Skład walki i ładowanie ataków: trener wystawia zawsze dwa stworki (bez
 * wymiany z pokeballi), dzikie stado i obrońcy miasta — do trzech, a ataki
 * specjalne są gotowe dopiero po pierwszym zwykłym ciosie stworka.
 *
 *   npx tsx tools/probe-sklad-walki.ts
 */
import {
  NA_POLU,
  NA_POLU_DZIKIE,
  atakDostepny,
  chooseAction,
  createBattle,
  makeRng,
  performAttack,
  runBattle,
} from '../src/data/battle';
import { RYWAL_ID, naPoluPrzeciw } from '../src/data/mapa';
import { defStworka, nowyStworek, rozegrajBitwe } from '../src/data/stworki';

let bledy = 0;
const sprawdz = (nazwa: string, warunek: boolean, szczegol = '') => {
  if (!warunek) bledy++;
  console.log(`${warunek ? 'OK  ' : 'BŁĄD'} ${nazwa}${szczegol ? ` — ${szczegol}` : ''}`);
};

const def = (tier: number, poziom: number) => defStworka(nowyStworek('bor', tier, poziom)!)!;
const piec = { units: [def(0, 8), def(1, 8), def(2, 8), def(3, 8), def(4, 8)] };

{
  const b = createBattle(piec, piec, [], makeRng(3), NA_POLU, NA_POLU_DZIKIE);
  const nasi = b.units.filter((u) => u.side === 'player').length;
  const dzicy = b.units.filter((u) => u.side === 'enemy').length;
  sprawdz('trener wystawia dwa stworki', nasi === 2, String(nasi));
  sprawdz('dzikie stado staje w trójkę', dzicy === 3, String(dzicy));
  const rzedy = b.units.filter((u) => u.side === 'enemy').map((u) => u.row).sort();
  sprawdz('trójka z przerwami między sobą', rzedy.every((r, i) => i === 0 || r - rzedy[i - 1] >= 2), rzedy.join(','));
  const { outcome } = runBattle(b);
  sprawdz('bitwa się rozstrzyga', outcome !== 'remis', outcome);
}

{
  // Ładowanie: specjalny dopiero po zwykłym ciosie.
  const b = createBattle({ units: [def(0, 10)] }, { units: [{ ...def(2, 10), hp: 9999 }] }, [], makeRng(5), 1, 1);
  const a = b.units.find((u) => u.side === 'player')!;
  const cel = b.units.find((u) => u.side === 'enemy')!;
  sprawdz('na starcie specjalny niedostępny', !atakDostepny(a, 1));
  a.col = cel.col - 1;
  a.row = cel.row;
  const log = performAttack(b, a, cel, { col: a.col, row: a.row }, 1);
  const cios = log.find((e) => e.rodzaj === 'cios' && e.kto === a.id);
  sprawdz('niedostępny specjalny zamienia się w zwykły cios', !!cios && cios.rodzaj === 'cios' && cios.atak === 0);
  sprawdz('po zwykłym ciosie specjalny gotowy', atakDostepny(a, 1));
  const ai = chooseAction(b, cel);
  sprawdz('maszyna też nie strzela specjalnym od razu', ai.rodzaj !== 'atak' || ai.atak === 0, JSON.stringify(ai.rodzaj === 'atak' ? ai.atak : ai.rodzaj));
}

{
  // Poza dwójką nikt nie walczy i nikt nie mdleje.
  const druzyna = [nowyStworek('bor', 5, 30)!, nowyStworek('bor', 4, 30)!, nowyStworek('bor', 0, 5)!, nowyStworek('bor', 1, 5)!];
  const stado = [nowyStworek('grota', 0, 3)!, nowyStworek('grota', 1, 3)!, nowyStworek('grota', 2, 3)!, nowyStworek('grota', 3, 3)!];
  const w = rozegrajBitwe(druzyna, stado, makeRng(11), undefined, NA_POLU_DZIKIE);
  sprawdz('silna dwójka wygrywa', w.outcome === 'player');
  sprawdz('stworki spoza dwójki wracają nietknięte', w.ocalaliAtak[2] === 1 && w.ocalaliAtak[3] === 1, w.ocalaliAtak.join(','));
  sprawdz('pokonanych dzikich najwyżej trzech', w.pokonaniObrona.length <= 3, String(w.pokonaniObrona.length));
}

sprawdz('dzikie: do trzech', naPoluPrzeciw({ rodzaj: 'potwor', id: 5 }) === 3);
sprawdz('miasto / sala: do trzech obrońców', naPoluPrzeciw({ rodzaj: 'zamek', id: 5 }) === 3);
sprawdz('rywal: dwa na dwa', naPoluPrzeciw({ rodzaj: 'potwor', id: RYWAL_ID }) === 2);

console.log(bledy ? `\nBŁĘDÓW: ${bledy}` : '\nWSZYSTKO OK');
process.exit(bledy ? 1 : 0);
