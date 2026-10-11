/**
 * Z misji do misji przechodzi najwyżej jeden wybrany stworek (bez
 * podciągania) i jeden artefakt; resztę drużyny daje plansza na poziomie
 * misji. Odznaki zbierają się przez całą kampanię, obrońcy rosną.
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

// Weteran na 20 (Aquino-linia) i artefakty z misji 1 — zabiera weterana i buty.
p1.bohater = { ...p1.bohater!, artefakty: ['buty', 'tarcza', 'opaska'] };
const s2 = rozpocznijMisje({ ...p1, zabiera: { stworek: 0, artefakt: 'buty' } }, m2, 0);
const druzyna2 = s2.bohater.armia.filter(Boolean);
sprawdz('zabrany weteran jest w drużynie z poziomem 20', druzyna2.some((o) => o!.poziom === 20 && o!.nazwa === weteran.nazwa));
sprawdz(
  'zemdlony z misji 1 nie przechodzi (tylko jeden stworek)',
  !druzyna2.some((o) => o!.poziom === 9 && o!.nazwa === zemdlony.nazwa),
  druzyna2.map((o) => `${o!.nazwa} ${o!.poziom}`).join(', ')
);
sprawdz(
  `nowa drużyna planszy na poziomie ${m2.poziomStartowy}`,
  druzyna2.filter((o) => o!.poziom !== 20).every((o) => o!.poziom === m2.poziomStartowy),
  druzyna2.map((o) => o!.poziom).join(', ')
);
sprawdz('przechodzi jeden artefakt', JSON.stringify(s2.bohater.artefakty) === '["buty"]', JSON.stringify(s2.bohater.artefakty));
const s2nikt = rozpocznijMisje({ ...p1, zabiera: {} }, m2, 0);
sprawdz(
  'bez wyboru „nikogo / nic" — sama drużyna planszy, bez artefaktów',
  s2nikt.bohater.armia.filter(Boolean).every((o) => o!.poziom === m2.poziomStartowy) && s2nikt.bohater.artefakty.length === 0
);
const slaby = { ...p1, druzyna: [nowyStworek('bor', 5, 3)!], zabiera: { stworek: 0 } };
const s2slaby = rozpocznijMisje(slaby, m2, 0);
sprawdz(
  'słaby zabrany stworek nie jest podciągany',
  s2slaby.bohater.armia.some((o) => o?.tier === 5 && o.poziom === 3),
  s2slaby.bohater.armia.filter(Boolean).map((o) => `${o!.nazwa} ${o!.poziom}`).join(', ')
);
s2.odznaki = ['Grota Księżycowa'];
const p2 = zaliczMisje(p1, s2);
sprawdz('odznaki się sumują', p2.odznaki?.length === 2, JSON.stringify(p2.odznaki));

// Stary zapis bez drużyny: misja 4 daje startera na poziomie misji.
const s4 = rozpocznijMisje(p0, m4, 0);
sprawdz(
  `bez drużyny z poprzedniej misji — starter na poziomie ${m4.poziomStartowy}`,
  s4.starter?.poziom === m4.poziomStartowy,
  JSON.stringify(s4.starter)
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
