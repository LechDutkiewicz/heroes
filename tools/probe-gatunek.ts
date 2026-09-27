/**
 * Jeden stworek danego gatunku (linii ewolucji): duplikaty znikają, zostaje
 * najsilniejszy, drużyna nie pustoszeje, nagroda kampanii za posiadany
 * gatunek to trening, a rezerwat i autopilot nie werbują drugiego.
 *
 *   npx tsx tools/probe-gatunek.ts
 */
import { KAMPANIA, nowyPostep } from '../src/data/kampania';
import { rozpocznijMisje } from '../src/data/kampania-start';
import { listyStworkowGracza, maGatunek } from '../src/data/mapa';
import { planszaPrzygody } from '../src/data/plansza';
import { doswStworka, gatunek, nowyStworek, usunDuplikaty } from '../src/data/stworki';

let bledy = 0;
const sprawdz = (nazwa: string, warunek: boolean, szczegol = '') => {
  if (!warunek) bledy++;
  console.log(`${warunek ? 'OK  ' : 'BŁĄD'} ${nazwa}${szczegol ? ` — ${szczegol}` : ''}`);
};

// Flamir (bor, tier 1) i jego ewolucja to ten sam gatunek.
const flamir = nowyStworek('bor', 1, 9)!;
const flamirEwo = { ...nowyStworek('bor', 1, 20)!, sprite: '01020', nazwa: 'Flamiros' };
sprawdz('ewolucja to ten sam gatunek', gatunek(flamir.sprite) === gatunek(flamirEwo.sprite), `${flamir.sprite} / ${flamirEwo.sprite}`);

{
  const s = planszaPrzygody();
  const f10 = nowyStworek('bor', 1, 10)!;
  const f9 = nowyStworek('bor', 1, 9)!;
  const pyroko = nowyStworek('bor', 0, 5)!;
  s.bohater.armia = [f9, pyroko, f10, null, null, null, null];
  const przed = doswStworka(f10);
  const usuniete = usunDuplikaty(listyStworkowGracza(s));
  const flamiry = s.bohater.armia.filter((o) => o && gatunek(o.sprite) === gatunek(f10.sprite));
  sprawdz('z dwóch Flamirów zostaje jeden', flamiry.length === 1 && usuniete.length === 1, usuniete.join(', '));
  sprawdz('zostaje silniejszy (poz. 10)', flamiry[0]!.poziom >= 10);
  sprawdz('dostaje połowę doświadczenia słabszego', doswStworka(flamiry[0]!) > przed, `${przed} → ${doswStworka(flamiry[0]!)}`);
  sprawdz('Pyroko nietknięty', s.bohater.armia.includes(pyroko));
}

{
  // Silniejszy w garnizonie, słabszy w drużynie: silniejszy przechodzi do drużyny.
  const s = planszaPrzygody();
  const zamek = s.obiekty.find((o) => o.rodzaj === 'zamek' && o.wlasciciel === 'gracz')!;
  const slaby = nowyStworek('bor', 2, 6)!;
  const mocny = nowyStworek('bor', 2, 14)!;
  s.bohater.armia = [slaby, null, null, null, null, null, null];
  zamek.garnizon = [mocny, null, null, null, null, null, null];
  usunDuplikaty(listyStworkowGracza(s));
  sprawdz('drużyna nie zostaje pusta — silniejszy przechodzi z garnizonu', s.bohater.armia[0] === mocny);
  sprawdz('garnizon bez duplikatu', zamek.garnizon.every((o) => o === null));
  sprawdz('maGatunek znajduje stworka po gatunku', maGatunek(s, '00218') === mocny);
}

{
  // Nagroda kampanii za gatunek, który drużyna już ma: trening zamiast drugiego.
  const m2 = KAMPANIA.misje[1];
  const druzyna = [nowyStworek('bor', 2, 12)!, nowyStworek('bor', 0, 12)!];
  const i = m2.bonusy.findIndex((b) => b.typ === 'oddzial');
  const s = rozpocznijMisje({ ...nowyPostep('Janek'), druzyna }, m2, i);
  const aquino = s.bohater.armia.filter((o) => o && gatunek(o.sprite) === gatunek('00218'));
  sprawdz('bonus „Aquino" przy posiadanym Aquino — nadal jeden', aquino.length === 1);
  sprawdz('…za to silniejszy', aquino[0]!.poziom >= 14, `poz. ${aquino[0]!.poziom}`);
}

console.log(bledy ? `\nBŁĘDÓW: ${bledy}` : '\nWSZYSTKO OK');
process.exit(bledy ? 1 : 0);
