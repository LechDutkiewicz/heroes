/**
 * Etap 6: drużyna przechodzi z misji do misji, odznaki zbierają się przez
 * całą kampanię, a misja podciąga za słabą drużynę i wzmacnia obrońców.
 *
 *   npx tsx tools/probe-druzyna-kampanii.ts
 */
import { KAMPANIA, nowyPostep } from '../src/data/kampania';
import { rozpocznijMisje, zaliczMisje } from '../src/data/kampania-start';
import { nowyStworek } from '../src/data/stworki';

let bledy = 0;
const sprawdz = (nazwa: string, warunek: boolean, szczegol = '') => {
  if (!warunek) bledy++;
  console.log(`${warunek ? 'OK  ' : 'BŁĄD'} ${nazwa}${szczegol ? ` — ${szczegol}` : ''}`);
};

const [m1, m2, , m4] = KAMPANIA.misje;
const p0 = nowyPostep('Janek');
const s1 = rozpocznijMisje(p0, m1, 0);
// Drużyna „po misji 1": jeden weteran na poziomie 20, jeden zemdlony.
const weteran = nowyStworek('bor', 2, 20)!;
const zemdlony = { ...nowyStworek('bor', 0, 9)!, omdlaly: true };
s1.bohater.armia = [weteran, zemdlony, null, null, null, null, null];
s1.odznaki = ['Stary Fort'];
const p1 = zaliczMisje(p0, s1);
sprawdz('drużyna zapisana w postępie', p1.druzyna?.length === 2, JSON.stringify(p1.druzyna?.map((o) => o.poziom)));
sprawdz('zemdlony wstaje przed następną misją', !p1.druzyna?.some((o) => o.omdlaly));
sprawdz('odznaka Starego Fortu w postępie', p1.odznaki?.includes('fort') === true, JSON.stringify(p1.odznaki));

const s2 = rozpocznijMisje(p1, m2, 0);
const druzyna2 = s2.bohater.armia.filter(Boolean);
sprawdz('misja 2 zaczyna się tą samą drużyną', druzyna2.some((o) => o!.poziom === 20 && o!.nazwa === weteran.nazwa));
sprawdz(
  `słabszy stworek podciągnięty do poziomu ${m2.poziomDruzyny}`,
  druzyna2.every((o) => o!.poziom >= (m2.poziomDruzyny ?? 0)),
  druzyna2.map((o) => o!.poziom).join(', ')
);
s2.odznaki = ['Grota Księżycowa'];
const p2 = zaliczMisje(p1, s2);
sprawdz('odznaki się sumują', p2.odznaki?.length === 2, JSON.stringify(p2.odznaki));

// Stary zapis bez drużyny: misja 4 startuje drużyną startową podciągniętą do progu.
const s4 = rozpocznijMisje(p0, m4, 0);
const d4 = s4.bohater.armia.filter(Boolean);
sprawdz(
  `bez drużyny z poprzedniej misji — startowa na poziomie ${m4.poziomDruzyny}`,
  d4.length > 0 && d4.every((o) => o!.poziom >= (m4.poziomDruzyny ?? 0)),
  d4.map((o) => `${o!.nazwa} ${o!.poziom}`).join(', ')
);
const s4bez = rozpocznijMisje(p0, { ...m4, wrogPoziomy: undefined }, 0);
const poziomyWroga = (s: typeof s4) =>
  s.obiekty
    .filter((o) => o.rodzaj === 'zamek' && o.wlasciciel === 'wrog')
    .flatMap((o) => o.oddzialy ?? [])
    .reduce((a, o) => a + o.poziom, 0);
sprawdz(
  `obrońcy zamków misji 4 silniejsi o ${m4.wrogPoziomy} poziomów`,
  poziomyWroga(s4) > poziomyWroga(s4bez),
  `${poziomyWroga(s4bez)} → ${poziomyWroga(s4)}`
);

console.log(bledy ? `\nBŁĘDÓW: ${bledy}` : '\nWSZYSTKO OK');
process.exit(bledy ? 1 : 0);
