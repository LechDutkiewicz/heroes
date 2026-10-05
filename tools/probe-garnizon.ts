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
import { nowyStworek } from '../src/data/stworki';

declare const process: { exit(k: number): never };

let bledy = 0;
const sprawdz = (co: string, ok: boolean, szczegol = '') => {
  if (!ok) bledy++;
  console.log(`  ${ok ? 'OK  ' : 'ŹLE '} ${co}${szczegol ? ` — ${szczegol}` : ''}`);
};

/** Stworek; `imie` odróżnia postacie tego samego gatunku. */
const odd = (sprite: string, poziom = 5, imie = sprite, tier = 0, frakcja = 'bor'): Oddzial => ({
  sprite,
  nazwa: imie,
  ile: 1,
  frakcja,
  tier,
  poziom,
});

console.log('=== dwie armie: przypadki ===');
{
  const bohater: Armia = pustaArmia();
  const garnizon: Armia = pustaArmia();
  bohater[0] = odd('A', 10);
  bohater[1] = odd('B', 5);
  garnizon[0] = odd('A', 4, 'A2');

  let w = przeniesMiedzy(bohater, 1, garnizon, 3, true);
  sprawdz('przeniesienie do pustego slotu garnizonu', w.ok && !bohater[1] && garnizon[3]?.sprite === 'B');
  w = przeniesMiedzy(bohater, 0, garnizon, 5, true);
  sprawdz('ostatni stworek trenera nie przechodzi do garnizonu', !w.ok && bohater[0]?.poziom === 10);
  w = przeniesMiedzy(bohater, 0, garnizon, 0, true);
  sprawdz(
    'ten sam gatunek się zamienia, nie łączy',
    w.ok && bohater[0]?.nazwa === 'A2' && garnizon[0]?.nazwa === 'A' && zajete(garnizon) === 2
  );
  sprawdz('stworka nie da się podzielić między armiami', maksPodzialuMiedzy(garnizon, 0, bohater, 5, false) === 1);
  w = przeniesMiedzy(garnizon, 3, bohater, 2, false);
  sprawdz('garnizon oddaje stworka (nie jest chroniony)', w.ok && bohater[2]?.sprite === 'B' && !garnizon[3]);
  w = zwolnij(bohater, 2, true);
  sprawdz('wypuszczenie stworka', w.ok && !bohater[2]);
  w = zwolnij(bohater, 0, true);
  sprawdz('ostatniego stworka trenera nie da się wypuścić', !w.ok && !!bohater[0]);
}

console.log('\n=== dwie armie: próba losowa ===');
{
  let s = 12345;
  const los = () => ((s = (s * 1103515245 + 12345) & 0x7fffffff) / 0x7fffffff);
  const bohater: Armia = pustaArmia();
  const garnizon: Armia = pustaArmia();
  bohater[0] = odd('A', 5, 'A1');
  bohater[2] = odd('B', 6, 'B1');
  garnizon[1] = odd('A', 7, 'A2');
  garnizon[4] = odd('D', 8, 'D1');
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
        : podzielMiedzy(armie[zi], z, armie[di], d, 1 + Math.floor(los() * 3), zi === 0);
    if (w.ok) udane++;
    if (lacznie(bohater) + lacznie(garnizon) !== suma0) zgubione++;
    if (zajete(bohater) === 0) bezArmii++;
  }
  sprawdz('żaden ruch nie zgubił stworka', zgubione === 0, `${zgubione}`);
  sprawdz('trener nigdy bez drużyny', bezArmii === 0, `${bezArmii}`);
  sprawdz('ruchy się działy', udane > 5000, `${udane}`);
}

console.log('\n=== obrońcy zamku: straż + garnizon ===');
{
  const z = { id: 1, rodzaj: 'zamek' as const, x: 0, y: 0, nazwa: 'Z', oddzialy: [odd('A', 10, 'straż')], garnizon: pustaArmia() };
  z.garnizon[2] = odd('A', 8, 'g1');
  z.garnizon[4] = odd('B', 5, 'g2');
  const o = obroncyZamku(z);
  sprawdz('każdy stworek staje osobno, straż pierwsza', o.length === 3 && o[0].nazwa === 'straż', o.map((x) => x.nazwa).join(','));
  rozdzielStratyZamku(z, o.map((x, i) => ({ ...x, ile: i === 0 ? 0 : 1 })));
  sprawdz('straty trafiają w tego, kto padł', z.oddzialy.length === 0 && !!z.garnizon[2] && !!z.garnizon[4]);
  rozdzielStratyZamku(z, [{ ...odd('A'), ile: 0 }, { ...odd('B'), ile: 1 }]);
  sprawdz('po drugiej bitwie w garnizonie zostaje ocalały', !z.garnizon[2] && z.garnizon[4]?.nazwa === 'g2');
}

console.log('\n=== garnizon broni zamku w turze przeciwnika ===');
const smoki = (ile: number, poziom: number): Oddzial[] =>
  Array.from({ length: ile }, (_, i) => nowyStworek('grota', 5, poziom)!).map((o, i) => ({ ...o, nazwa: `${o.nazwa}${i}` }));
const bor = (tier: number, poziom: number): Oddzial => nowyStworek('bor', tier, poziom)!;

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
  const { s, zamek } = podBrama(smoki(6, 50), [bor(0, 10)]);
  sprawdz('wejście wroga na zamek z garnizonem zaczyna bitwę', !!odwiedz({ ...s }, zamek, 'wrog').bitwaZ);
  const przed = s.wrogBohater.armia.map((o) => o?.dosw ?? 0).reduce((a, b) => a + b, 0);
  turaAI(s, 'wrog');
  sprawdz('przytłaczająca drużyna zdobywa zamek', zamek.wlasciciel === 'wrog', String(zamek.wlasciciel));
  sprawdz('garnizon przepadł razem z zamkiem', !zamek.garnizon && (zamek.oddzialy ?? []).length === 0);
  const po = s.wrogBohater.armia.map((o) => o?.dosw ?? 0).reduce((a, b) => a + b, 0);
  sprawdz('bitwa naprawdę była — drużyna wroga zebrała doświadczenie', po > przed, `${przed} → ${po}`);
}
{
  // Najsłabsza drużyna wroga, która bierze zamek bronioną samą strażą —
  // przy mocnym garnizonie ta sama drużyna nie rusza. AI liczy obrońców
  // razem (straż + garnizon).
  let prog = 0;
  for (let p = 10; p <= 50 && !prog; p += 2) {
    const bez = podBrama(smoki(3, p), []);
    turaAI(bez.s, 'wrog');
    if (bez.zamek.wlasciciel === 'wrog') prog = p;
  }
  sprawdz('jest drużyna, która bierze zamek z samą strażą', prog > 0, `3 × poz. ${prog}`);
  // Garnizon wyraźnie silniejszy od napastnika: ten sam gatunek, poziom 50.
  // Dawniej stały tu stworki Boru, ale od ruchu 2–6 (wolniejsi napastnicy pod
  // murami) próg napastnika urósł z poz. 32 do 46, a kruchy Bór na 50 przeciw
  // Grocie na 46 to już rzut monetą — sonda sprawdza AI, nie balans frakcji.
  const z = podBrama(smoki(3, prog), smoki(4, 50));
  turaAI(z.s, 'wrog');
  sprawdz('z garnizonem zamek zostaje nasz', z.zamek.wlasciciel === 'gracz', String(z.zamek.wlasciciel));
  sprawdz('garnizon nietknięty', zajete(z.zamek.garnizon ?? pustaArmia()) === 4);
}

console.log(bledy === 0 ? '\nWszystko przeszło.' : `\n${bledy} sprawdzeń nie przeszło.`);
process.exit(bledy === 0 ? 0 : 1);
