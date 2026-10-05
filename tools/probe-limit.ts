/**
 * Limit poziomu z odznak (stworki i trener) — bez przeglądarki.
 *
 * Sprawdza: sufit doświadczenia i nadmiar, przelew nadmiaru na resztę
 * drużyny (także ławkę), posłuszeństwo przeniesionej drużyny (`slucha`),
 * blokadę treningu na limicie, pół ceny dla zaległych, limit trenera,
 * start misji z limitem i próg dzikich stad, i że bez limitu nic się nie
 * zmienia (gra pojedyncza).
 *
 *   npx tsx tools/probe-limit.ts
 */
import {
  defStworka,
  dodajDosw,
  doswDoPoziomu,
  nowyStworek,
  przelejNadmiar,
  rozdajDosw,
} from '../src/data/stworki';
import { planszaPrzygody } from '../src/data/plansza';
import {
  dodajDoswBohatera,
  doswDoPoziomuBohatera,
  kosztTreningu,
  kosztTreninguW,
  poziom,
  trenuj,
  type Oddzial,
} from '../src/data/mapa';
import { KAMPANIA, nowyPostep } from '../src/data/kampania';
import { rozpocznijMisje } from '../src/data/kampania-start';
import { rozliczDruzyne } from '../src/data/podsumowanie';

declare const process: { exitCode?: number };
let bledy = 0;
const sprawdz = (co: string, ok: boolean, szczegol = '') => {
  if (!ok) bledy++;
  console.log(`  ${ok ? 'OK  ' : 'ŹLE '} ${co}${szczegol ? ` — ${szczegol}` : ''}`);
};
const st = (tier: number, p: number) => nowyStworek('bor', tier, p)!;

console.log('=== sufit doświadczenia ===');
{
  const o = st(0, 17);
  const w = dodajDosw(o, 5000, 18);
  sprawdz('stworek staje na limicie', o.poziom === 18, `poz. ${o.poziom}`);
  sprawdz('doświadczenie równo na progu limitu', o.dosw === doswDoPoziomu(18), `${o.dosw}`);
  sprawdz('reszta wraca jako nadmiar', w.nadmiar === 5000 - (doswDoPoziomu(18) - doswDoPoziomu(17)), `${w.nadmiar}`);
  const nic = dodajDosw(o, 300, 18);
  sprawdz('na limicie całość to nadmiar', nic.nadmiar === 300 && o.poziom === 18);
  const bez = st(0, 17);
  dodajDosw(bez, 5000);
  sprawdz('bez limitu rośnie jak dawniej', bez.poziom > 18, `poz. ${bez.poziom}`);
  const wyzej = st(0, 30);
  const w2 = dodajDosw(wyzej, 400, 18);
  sprawdz('powyżej limitu (z poprzedniej misji) nie rośnie i nie traci', wyzej.poziom === 30 && w2.nadmiar === 400);
}

console.log('=== przelew nadmiaru ===');
{
  const a = st(0, 18);
  const b = st(1, 10);
  const c = st(2, 8);
  const lezy = { ...st(3, 6), omdlaly: true };
  const druzyna: (Oddzial | null)[] = [a, b, c, lezy, null, null];
  const przed = [b.dosw!, c.dosw!];
  const p = przelejNadmiar(druzyna, 400, 18);
  sprawdz('dostają tylko stworki pod limitem i na nogach', p.length === 2 && !p.some((x) => x.o === a || x.o === lezy));
  sprawdz('po równo', b.dosw! - przed[0] === 200 && c.dosw! - przed[1] === 200, `${b.dosw! - przed[0]}/${c.dosw! - przed[1]}`);
  // Walka: dwaj na limicie walczą, ławka dostaje ich doświadczenie.
  const x = st(0, 18);
  const y = st(1, 18);
  const lawka = st(2, 9);
  const dosw0 = lawka.dosw!;
  rozdajDosw([x, y, null, null, null, null], [{ poziom: 15, tier: 3 }], 18, [x, y, lawka, null, null, null]);
  sprawdz('ławka dostaje nadmiar walczących z limitem', lawka.dosw! > dosw0, `+${lawka.dosw! - dosw0}`);
  // Podsumowanie walki gracza pokazuje ławkę.
  const d = [st(0, 18), st(1, 18), st(2, 9), null, null, null] as (Oddzial | null)[];
  const w = rozliczDruzyne(d, { wygrana: true, armia: [{ slot: 0, ile: 1 }, { slot: 1, ile: 1 }], pokonani: [{ poziom: 15, tier: 3 }] }, 0, 18);
  sprawdz('podsumowanie: walczący na limicie oznaczeni', w.filter((r) => r.naLimicie).length === 2);
  sprawdz('podsumowanie: ławka ma swój wiersz', w.some((r) => r.zLawki && r.slot === 2 && r.dosw > 0));
}

console.log('=== posłuszeństwo ===');
{
  const o = st(0, 30);
  const pelny = defStworka(o)!;
  const sluchajacy = defStworka({ ...o, slucha: 18 })!;
  const naLimicie = defStworka(st(0, 18))!;
  sprawdz('powyżej limitu walczy jak na limicie', sluchajacy.atk === naLimicie.atk && sluchajacy.hp === naLimicie.hp);
  sprawdz('…a bez limitu pełną siłą', pelny.atk > sluchajacy.atk);
}

console.log('=== start misji ===');
{
  const m2 = KAMPANIA.misje[1];
  const druzyna = [st(0, 30), st(1, 12)];
  const s = rozpocznijMisje({ ...nowyPostep('Ela'), druzyna }, m2, 0);
  sprawdz('stan zna limity misji', s.limitPoziomu === m2.limitPoziomu && s.limitBohatera === m2.limitBohatera);
  const silny = s.bohater.armia.find((o) => o && o.poziom === 30);
  sprawdz('silniejszy niż limit słucha do limitu, poziom zostaje', silny?.slucha === m2.limitPoziomu, `${silny?.slucha}`);
  sprawdz('słabszy bez ograniczenia', s.bohater.armia.filter((o) => o && o.poziom < 30).every((o) => o!.slucha === undefined));
  const dzikie = s.obiekty.filter((o) => o.rodzaj === 'potwor').flatMap((o) => o.oddzialy ?? []);
  sprawdz('dzikie stada co najmniej na progu misji', dzikie.every((o) => o.poziom >= (m2.poziomDzikich ?? 0)), `min ${Math.min(...dzikie.map((o) => o.poziom))}`);
  const m1 = rozpocznijMisje(nowyPostep('Ela'), KAMPANIA.misje[0], 0);
  sprawdz('misja 1 ma limit', m1.limitPoziomu === KAMPANIA.misje[0].limitPoziomu);
  sprawdz('limity rosną z misją', KAMPANIA.misje.every((m, i, a) => i === 0 || (m.limitPoziomu ?? 0) > (a[i - 1].limitPoziomu ?? 0)));

  // Trening.
  const zamek = s.obiekty.find((o) => o.rodzaj === 'zamek' && o.wlasciciel === 'gracz')!;
  zamek.treningi = 10;
  s.skarbiec.pokeball = 1000;
  sprawdz('trening na limicie zablokowany', !trenuj(s, zamek, silny!).ok);
  const slaby = s.bohater.armia.find((o) => o && o.poziom < 30)!;
  sprawdz('zaległy o 5+ poziomów trenuje za pół ceny', kosztTreninguW(s, slaby) === Math.ceil(kosztTreningu(slaby) / 2));
  const bez = planszaPrzygody();
  sprawdz('gra pojedyncza bez limitu', bez.limitPoziomu === undefined && bez.limitBohatera === undefined);

  // Trener.
  s.bohater.doswiadczenie = 0;
  dodajDoswBohatera(s, s.bohater, 1e6);
  sprawdz('trener staje na limicie misji', poziom(s.bohater.doswiadczenie) === m2.limitBohatera, `poz. ${poziom(s.bohater.doswiadczenie)}`);
  sprawdz('próg limitu trenera zgodny z `poziom`', poziom(doswDoPoziomuBohatera(7)) === 7 && poziom(doswDoPoziomuBohatera(7) - 1) === 6);
  const bezB = planszaPrzygody();
  dodajDoswBohatera(bezB, bezB.bohater, 1e5);
  sprawdz('bez limitu trener rośnie', poziom(bezB.bohater.doswiadczenie) > 10);
}

console.log(bledy ? `\nBłędów: ${bledy}` : '\nWszystko się zgadza.');
process.exitCode = bledy ? 1 : 0;
