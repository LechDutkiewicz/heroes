/**
 * Sonda garnizonu zamku: arytmetyka dwóch armii (garnizon ↔ bohater) i to,
 * czy garnizon naprawdę BRONI zamku w turze przeciwnika.
 *
 * Bez przeglądarki — to warstwa danych (`armia.ts`, `mapa.ts`, `wrog-ai.ts`).
 * Gesty myszą na ekranie miasta sprawdza `tools/probe-armia.mjs`.
 *
 *   npx tsx tools/probe-garnizon.ts
 */

import {
  SLOTY_ARMII,
  lacznie,
  maksPodzialuMiedzy,
  podzielMiedzy,
  przeniesMiedzy,
  pustaArmia,
  zajete,
  zwolnij,
  type Armia,
} from '../src/data/armia';
import { obroncyZamku, odwiedz, rozdzielStratyZamku, type Oddzial, type StanMapy } from '../src/data/mapa';
import { planszaPrzygody } from '../src/data/plansza';
import { turaAI } from '../src/data/wrog-ai';
import { factionById } from '../src/data/factions';

declare const process: { exit(k: number): never };

let bledy = 0;
const sprawdz = (co: string, ok: boolean, szczegol = '') => {
  if (!ok) bledy++;
  console.log(`  ${ok ? 'OK  ' : 'ŹLE '} ${co}${szczegol ? ` — ${szczegol}` : ''}`);
};

const odd = (sprite: string, ile: number, tier = 0, frakcja = 'bor'): Oddzial => ({
  sprite,
  nazwa: sprite,
  ile,
  frakcja,
  tier,
});

console.log('=== dwie armie: przypadki ===');
{
  const bohater: Armia = pustaArmia();
  const garnizon: Armia = pustaArmia();
  bohater[0] = odd('A', 10);
  bohater[1] = odd('B', 5);
  garnizon[0] = odd('A', 4);

  let w = przeniesMiedzy(bohater, 1, garnizon, 3, true);
  sprawdz('przeniesienie do pustego slotu garnizonu', w.ok && !bohater[1] && garnizon[3]?.sprite === 'B');
  w = przeniesMiedzy(bohater, 0, garnizon, 0, true);
  sprawdz('ostatni stos bohatera nie przechodzi do garnizonu', !w.ok && bohater[0]?.ile === 10);
  w = przeniesMiedzy(bohater, 0, garnizon, 3, true);
  sprawdz('zamiana z garnizonem wolna nawet przy ostatnim stosie', w.ok && bohater[0]?.sprite === 'B' && garnizon[3]?.sprite === 'A');
  sprawdz(
    'podział ostatniego stosu zostawia jednego',
    maksPodzialuMiedzy(bohater, 0, garnizon, 5, true) === 4,
    String(maksPodzialuMiedzy(bohater, 0, garnizon, 5, true))
  );
  w = podzielMiedzy(garnizon, 0, bohater, 2, 4);
  sprawdz('garnizon oddaje cały stos podziałem (nie jest chroniony)', w.ok && !garnizon[0] && bohater[2]?.ile === 4);
  w = przeniesMiedzy(garnizon, 3, bohater, 2, false);
  sprawdz('łączenie tego samego gatunku między armiami', w.ok && bohater[2]?.ile === 14 && !garnizon[3]);
  w = zwolnij(bohater, 2, true);
  sprawdz('zwolnienie stosu', w.ok && !bohater[2]);
  w = zwolnij(bohater, 0, true);
  sprawdz('ostatniego stosu bohatera nie da się zwolnić', !w.ok && !!bohater[0]);
}

console.log('\n=== dwie armie: próba losowa ===');
{
  let s = 12345;
  const los = () => ((s = (s * 1103515245 + 12345) & 0x7fffffff) / 0x7fffffff);
  const bohater: Armia = pustaArmia();
  const garnizon: Armia = pustaArmia();
  bohater[0] = odd('A', 30);
  bohater[2] = odd('B', 12);
  garnizon[1] = odd('C', 20);
  garnizon[4] = odd('D', 7);
  const suma0 = lacznie(bohater) + lacznie(garnizon);
  let zgubione = 0;
  let bezArmii = 0;
  let udane = 0;
  for (let n = 0; n < 40000; n++) {
    const armie = [bohater, garnizon];
    const zi = Math.floor(los() * 2);
    const di = Math.floor(los() * 2);
    const z = Math.floor(los() * SLOTY_ARMII);
    const d = Math.floor(los() * SLOTY_ARMII);
    const w =
      los() < 0.5
        ? przeniesMiedzy(armie[zi], z, armie[di], d, zi === 0)
        : podzielMiedzy(armie[zi], z, armie[di], d, 1 + Math.floor(los() * 15), zi === 0);
    if (w.ok) udane++;
    if (lacznie(bohater) + lacznie(garnizon) !== suma0) zgubione++;
    if (zajete(bohater) === 0) bezArmii++;
  }
  sprawdz('żaden ruch nie zgubił stworka', zgubione === 0, `${zgubione}`);
  sprawdz('bohater nigdy bez armii', bezArmii === 0, `${bezArmii}`);
  sprawdz('ruchy się działy', udane > 8000, `${udane}`);
}

console.log('\n=== obrońcy zamku: straż + garnizon ===');
{
  const z = { id: 1, rodzaj: 'zamek' as const, x: 0, y: 0, nazwa: 'Z', oddzialy: [odd('A', 10)], garnizon: pustaArmia() };
  z.garnizon[2] = odd('A', 5);
  z.garnizon[4] = odd('B', 3);
  const o = obroncyZamku(z);
  sprawdz('ten sam gatunek staje jako jeden stos', o.length === 2 && o[0].ile === 15, JSON.stringify(o.map((x) => x.ile)));
  rozdzielStratyZamku(z, [odd('A', 8), odd('B', 3)]);
  sprawdz('straty najpierw ze straży', (z.oddzialy[0]?.ile ?? 0) === 3 && z.garnizon[2]?.ile === 5, `straż ${z.oddzialy[0]?.ile}, garnizon ${z.garnizon[2]?.ile}`);
  rozdzielStratyZamku(z, [odd('B', 1)]);
  sprawdz('po wybiciu: straż pusta, w garnizonie zostaje ocalały', z.oddzialy.length === 0 && !z.garnizon[2] && z.garnizon[4]?.ile === 1);
}

console.log('\n=== garnizon broni zamku w turze przeciwnika ===');
const smoki = (ile: number): Oddzial => {
  const u = factionById('grota')!.units[5];
  return { sprite: u.sprite, nazwa: u.name, ile, frakcja: 'grota', tier: 5 };
};
const bor = (tier: number, ile: number): Oddzial => {
  const u = factionById('bor')!.units[tier];
  return { sprite: u.sprite, nazwa: u.name, ile, frakcja: 'bor', tier };
};

/** Plansza z wrogiem tuż pod bramą zamku gracza, po dniu natarcia. */
function podBrama(armiaWroga: Oddzial[], garnizon: Oddzial[]): { s: StanMapy; zamek: ReturnType<typeof znajdz> } {
  const s = planszaPrzygody();
  const zamek = znajdz(s);
  s.dzien = 60;
  s.natarcie = true;
  s.wrogBuduje = false;
  s.wrogSkarbiec.pokeball = 0;
  const b = s.wrogBohater;
  b.x = zamek.x;
  b.y = zamek.y + 1;
  b.ruch = b.ruchMax = 3000;
  b.armia = pustaArmia();
  armiaWroga.forEach((o, i) => (b.armia[i] = o));
  for (let y = 0; y < s.wys; y++) for (let x = 0; x < s.szer; x++) s.wrogOdkryte[y][x] = true;
  zamek.garnizon = pustaArmia();
  garnizon.forEach((o, i) => (zamek.garnizon![i] = o));
  return { s, zamek };
}
function znajdz(s: StanMapy) {
  return s.obiekty.find((o) => o.rodzaj === 'zamek' && o.wlasciciel === 'gracz')!;
}

{
  const { s, zamek } = podBrama([smoki(60)], [bor(0, 30)]);
  sprawdz('wejście wroga na zamek z garnizonem zaczyna bitwę', !!odwiedz({ ...s }, zamek, 'wrog').bitwaZ);
  turaAI(s, 'wrog');
  sprawdz('przytłaczająca armia zdobywa zamek', zamek.wlasciciel === 'wrog', String(zamek.wlasciciel));
  sprawdz('garnizon przepadł razem z zamkiem', !zamek.garnizon && (zamek.oddzialy ?? []).length === 0);
  const zostalo = lacznie(s.wrogBohater.armia);
  sprawdz('wróg zapłacił za szturm (bitwa naprawdę była)', zostalo < 60 && zostalo > 0, `${zostalo} z 60 smoków`);
}
{
  // Ta sama armia wroga, która bez garnizonu bierze zamek, przy garnizonie
  // nie rusza — AI liczy obrońców razem (straż + garnizon).
  const bez = podBrama([smoki(30)], []);
  turaAI(bez.s, 'wrog');
  const z = podBrama([smoki(30)], [bor(5, 40), bor(4, 60), bor(3, 80)]);
  turaAI(z.s, 'wrog');
  sprawdz('bez garnizonu 30 smoków bierze zamek (sama straż)', bez.zamek.wlasciciel === 'wrog', String(bez.zamek.wlasciciel));
  sprawdz('z garnizonem zamek zostaje nasz', z.zamek.wlasciciel === 'gracz', String(z.zamek.wlasciciel));
  sprawdz('garnizon nietknięty', lacznie(z.zamek.garnizon ?? []) === 180, String(lacznie(z.zamek.garnizon ?? [])));
}

console.log(bledy === 0 ? '\nWszystko przeszło.' : `\n${bledy} sprawdzeń nie przeszło.`);
process.exit(bledy === 0 ? 0 : 1);
