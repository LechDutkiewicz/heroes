/**
 * Sonda startera (`src/data/startery.ts`): nowa gra z pustą drużyną i wyborem
 * jednego z trzech, bonus kampanii „+3 poziomy", wyrównanie starterów.
 *
 *   npx tsx tools/probe-startery.ts
 *
 * Wyrównanie mierzy ta sama miara, którą strojono statystyki starterów:
 * starter sam na dzikiego o poziom niżej (9 gatunków z trzech krain, poziomy
 * 1–3 frakcji) i w parze z młodym z Boru na parę dzikich z misji 1.
 * Żaden nie może odstawać od reszty — wybór ma zależeć od przeciwnika.
 */
import { FACTIONS } from '../src/data/factions';
import { createBattle, runBattle } from '../src/data/battle';
import { defStworka, nowyStworek } from '../src/data/stworki';
import { STARTERY, nowyStarter, wybierzStartera, POZIOM_STARTERA } from '../src/data/startery';
import { planszaPrzygody } from '../src/data/plansza';
import { rozpocznijMisje } from '../src/data/kampania-start';
import { KAMPANIA, nowyPostep } from '../src/data/kampania';
import { zywe } from '../src/data/armia';

declare const process: { exitCode?: number };
let bledy = 0;
const sprawdz = (co: string, ok: boolean, szczegol = '') => {
  if (!ok) bledy++;
  console.log(`  ${ok ? 'OK  ' : 'ŹLE '} ${co}${szczegol ? ` — ${szczegol}` : ''}`);
};

console.log('=== nowa gra ze starterem ===');
const s = planszaPrzygody(undefined, { starter: { poziom: POZIOM_STARTERA } });
const dawna = planszaPrzygody();
const zamek = s.obiekty.find((o) => o.rodzaj === 'zamek' && o.wlasciciel === 'gracz')!;
sprawdz('drużyna pusta, czeka wybór startera', zywe(s.bohater.armia).length === 0 && s.starter?.poziom === 5);
sprawdz('miasto bez rezerwatów, nikt nie czeka', JSON.stringify(zamek.postawione) === '["ratusz1"]' && (zamek.dostepne ?? []).every((v) => v === 0));
sprawdz('skarbiec o 20 pokeballi większy', s.skarbiec.pokeball === dawna.skarbiec.pokeball + 20, `${s.skarbiec.pokeball}`);
sprawdz('rywal zaczyna dwójką', zywe(s.wrogBohater.armia).length === 2, `${zywe(s.wrogBohater.armia).length}`);
sprawdz('dawny start (sondy) bez zmian: czwórka', zywe(dawna.bohater.armia).length === 4 && !dawna.starter);
const o = wybierzStartera(s, 2);
sprawdz('wybór dodaje startera do drużyny i kasuje okno', !!o && zywe(s.bohater.armia).length === 1 && !s.starter && s.bohater.armia[0]?.starter === true);
const d = defStworka(s.bohater.armia[0]!)!;
sprawdz('starter ma statystyki startera, nie gatunku', d.hp === STARTERY[2].hp && d.atk === STARTERY[2].atk, `${d.hp}/${d.atk}`);
const zwykly = defStworka(nowyStworek(STARTERY[2].frakcja, STARTERY[2].tier, 5)!)!;
sprawdz('ten sam gatunek z rezerwatu — bez zmian', zwykly.hp !== d.hp || zwykly.atk !== d.atk, `${zwykly.hp}/${zwykly.atk}`);
sprawdz('drugi wybór nic nie robi', wybierzStartera(s, 0) === undefined && zywe(s.bohater.armia).length === 1);

console.log('\n=== kampania ===');
const [m1, m2] = KAMPANIA.misje;
const iStarter = m1.bonusy.findIndex((b) => b.typ === 'starter');
sprawdz('misja 1 ma bonus „starter +3"', iStarter >= 0);
const k1 = rozpocznijMisje(nowyPostep('Ela'), m1, iStarter);
sprawdz('z bonusem starter zaczyna na poziomie 8', k1.starter?.poziom === 8, `${k1.starter?.poziom}`);
const k1b = rozpocznijMisje(nowyPostep('Ela'), m1, iStarter === 0 ? 1 : 0);
sprawdz('bez bonusu — poziom 5', k1b.starter?.poziom === 5);
const druzyna = [nowyStarter(0, 12)!, nowyStworek('bor', 1, 12)!];
const k2 = rozpocznijMisje({ ...nowyPostep('Ela'), druzyna }, m2, 0);
sprawdz('misja 2 z drużyną — bez wyboru startera', !k2.starter && zywe(k2.bohater.armia).length === 2);
sprawdz('starter przechodzi do misji 2 jako starter', k2.bohater.armia.some((x) => x?.starter));

console.log('\n=== wyrównanie starterów ===');
let ziarno = 7;
const rng = () => ((ziarno = (ziarno * 1103515245 + 12345) % 2147483648) / 2147483648);
const def = (f: string, t: number, p: number) => defStworka(nowyStworek(f, t, p)!)!;
const zycie = (lewa: ReturnType<typeof def>[], prawa: ReturnType<typeof def>[], n = 30) => {
  const pelne = lewa.reduce((a, x) => a + x.hp, 0);
  let suma = 0;
  for (let i = 0; i < n; i++) {
    const b = createBattle({ units: lewa }, { units: prawa }, [], rng, 2, 3);
    runBattle(b);
    suma += b.units.filter((u) => u.side === 'player' && u.count > 0).reduce((a, u) => a + u.topHp, 0) / pelne;
  }
  return suma / n;
};
const dzikie = FACTIONS.flatMap((f) => [0, 1, 2].map((t) => [f.id, t] as const));
const wyniki = STARTERY.map((_, i) => {
  const st = defStworka(nowyStarter(i)!)!;
  const solo = dzikie.map(([f, t]) => zycie([st], [def(f, t, 4)]));
  const para = [0, 1, 2].flatMap((pt) => dzikie.map(([f, t]) => zycie([st, def('bor', pt, 5)], [def(f, t, 3), def(f, t, 3)])));
  const wyg = (a: number[]) => a.filter((x) => x > 0).length / a.length;
  console.log(`  ${st.name.padEnd(7)} sam: ${Math.round(100 * wyg(solo))}% wygranych, w parze: ${Math.round(100 * wyg(para))}%`);
  return { solo: wyg(solo), para: wyg(para) };
});
const rozrzut = (a: number[]) => Math.max(...a) - Math.min(...a);
sprawdz('sam na dzikiego: rozrzut najwyżej 15 punktów', rozrzut(wyniki.map((w) => w.solo)) <= 0.15);
sprawdz('w parze: rozrzut najwyżej 10 punktów', rozrzut(wyniki.map((w) => w.para)) <= 0.1);

console.log(bledy ? `\nBłędów: ${bledy}` : '\nWszystko się zgadza.');
if (bledy) process.exitCode = 1;
