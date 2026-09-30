/**
 * Sonda porażki, Centrum za jagody i podsumowania walki (bez przeglądarki).
 *
 * Sprawdza: rozliczenie drużyny po walce (kto zemdlał, doświadczenie tylko
 * przy wygranej, Uzdrowiciel), ratowanie w Centrum za jagody (i jednego
 * stworka za darmo, gdy nie ma jagód), trenera bez sprawnych stworków (nie
 * zajmuje kopalni ani gniazda), brak darmowego budzenia z nowym tygodniem
 * i cofnięcie o pole po porażce.
 *
 *   npx tsx tools/probe-porazka.ts
 */
import { planszaPrzygody } from '../src/data/plansza';
import { nowaTura, obiektNa, odwiedz, polePoUcieczce, type StanMapy } from '../src/data/mapa';
import { pustaArmia } from '../src/data/armia';
import { nowyStworek } from '../src/data/stworki';
import { rozliczDruzyne } from '../src/data/podsumowanie';
import { kosztRatowania, kosztWszystkich, ratuj } from '../src/data/centrum';

declare const process: { exitCode?: number };
let bledy = 0;
const sprawdz = (co: string, ok: boolean, szczegol = '') => {
  if (!ok) bledy++;
  console.log(`  ${ok ? 'OK  ' : 'ŹLE '} ${co}${szczegol ? ` — ${szczegol}` : ''}`);
};
const druzyna = (poziom: number, ile = 3) => {
  const a = pustaArmia();
  for (let i = 0; i < ile; i++) a[i] = nowyStworek('bor', i, poziom)!;
  return a;
};
const zemdlej = (s: StanMapy) => s.bohater.armia.forEach((o) => o && (o.omdlaly = true));

console.log('=== rozliczenie drużyny po walce ===');
{
  const a = druzyna(5);
  const przed = a[0]!.dosw ?? 0;
  const w = rozliczDruzyne(a, { wygrana: true, armia: [{ slot: 0, ile: 1 }, { slot: 1, ile: 0 }], pokonani: [{ poziom: 6, tier: 0 }] });
  sprawdz('dwa wiersze — ci, którzy walczyli', w.length === 2);
  sprawdz('stojący dostaje doświadczenie', w[0].dosw > 0 && (a[0]!.dosw ?? 0) > przed, `${w[0].dosw}`);
  sprawdz('zemdlony zaznaczony, bez doświadczenia', w[1].zemdlal && a[1]!.omdlaly === true && w[1].dosw === 0);
  sprawdz('kto nie walczył — bez zmian', !a[2]!.omdlaly);
  const b = druzyna(5);
  const l = rozliczDruzyne(b, { wygrana: false, armia: [{ slot: 0, ile: 0 }], pokonani: [{ poziom: 6, tier: 0 }] });
  sprawdz('porażka: bez doświadczenia', l.every((x) => x.dosw === 0) && b[0]!.omdlaly === true);
  const c = druzyna(5);
  const u = rozliczDruzyne(c, { wygrana: true, armia: [{ slot: 0, ile: 0 }, { slot: 1, ile: 1 }], pokonani: [] }, 0.1);
  sprawdz('Uzdrowiciel stawia zemdlonego na nogi', u[0].uzdrowiony === true && !c[0]!.omdlaly);
}

console.log('=== Centrum za jagody ===');
{
  const s = planszaPrzygody();
  s.bohater.armia = druzyna(7, 3);
  zemdlej(s);
  const koszt = kosztWszystkich(s.bohater.armia);
  sprawdz('koszt: jagoda za każde trzy poziomy', kosztRatowania({ poziom: 7 }) === 3 && koszt === 9, `${koszt}`);
  s.skarbiec.jagoda = 6;
  const r = ratuj(s.bohater.armia, s.skarbiec);
  sprawdz('za 6 jagód wstaje dwóch', r.odratowani === 2 && r.jagody === 6 && r.zostalo === 1 && s.skarbiec.jagoda === 0, JSON.stringify(r));
  zemdlej(s);
  const r2 = ratuj(s.bohater.armia, s.skarbiec);
  sprawdz('bez jagód i bez nikogo na nogach — jeden za darmo', r2.zaDarmo === true && r2.odratowani === 1, JSON.stringify(r2));
  const r3 = ratuj(s.bohater.armia, s.skarbiec);
  sprawdz('gdy ktoś stoi, za darmo już nie', r3.odratowani === 0 && !r3.zaDarmo);
}

console.log('=== trener bez sprawnych stworków ===');
{
  const s = planszaPrzygody();
  zemdlej(s);
  const kop = s.obiekty.find((o) => o.rodzaj === 'kopalnia' && o.wlasciciel !== 'gracz')!;
  const przed = kop.wlasciciel;
  odwiedz(s, kop);
  sprawdz('nie zajmuje kopalni', kop.wlasciciel === przed);
  const z = s.obiekty.find((o) => o.rodzaj === 'zamek' && o.wlasciciel === 'gracz')!;
  odwiedz(s, z);
  sprawdz('wejście do własnego miasta nie budzi drużyny za darmo', s.bohater.armia.every((o) => !o || o.omdlaly));
  for (let d = 0; d < 8; d++) nowaTura(s);
  sprawdz('nowy tydzień nie budzi drużyny gracza', s.bohater.armia.every((o) => !o || o.omdlaly));
}

console.log('=== cofnięcie po porażce ===');
{
  const s = planszaPrzygody();
  const kop = s.obiekty.find((o) => o.rodzaj === 'kopalnia')!;
  s.bohater.x = kop.x;
  s.bohater.y = kop.y;
  const cel = polePoUcieczce(s, null);
  sprawdz('z pola obiektu trener schodzi na wolne pole obok', !!cel && !obiektNa(s, cel.x, cel.y) && Math.max(Math.abs(cel.x - kop.x), Math.abs(cel.y - kop.y)) === 1, JSON.stringify(cel));
  s.bohater.x = cel!.x;
  s.bohater.y = cel!.y;
  sprawdz('obok celu (strażnik, rywal) zostaje na miejscu', polePoUcieczce(s, null) === null);
}

if (bledy) {
  console.log(`\nBŁĘDÓW: ${bledy}`);
  process.exitCode = 1;
} else console.log('\nWszystko przeszło.');
