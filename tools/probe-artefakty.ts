/**
 * Artefakty w gniazdach — bez przeglądarki.
 *
 * Sprawdza: w gnieździe działa jeden artefakt (powtórki się nie sumują),
 * domyślnie najsilniejszy, wybór gracza wygrywa, plecak to reszta (z
 * powtórkami), każde gniazdo ma co najmniej dwa artefakty różnej siły,
 * wybór przechodzi do następnej misji, a cel misji dalej się liczy.
 *
 *   npx tsx tools/probe-artefakty.ts
 */
import {
  ARTEFAKTY,
  GNIAZDA,
  silaArtefaktu,
  statystyki,
  wPlecaku,
  zaloz,
  zalozone,
} from '../src/data/mapa';
import { planszaPrzygody } from '../src/data/plansza';
import { bohaterDoPrzeniesienia } from '../src/data/kampania-start';

declare const process: { exitCode?: number };
let bledy = 0;
const sprawdz = (co: string, ok: boolean, szczegol = '') => {
  if (!ok) bledy++;
  console.log(`  ${ok ? 'OK  ' : 'ŹLE '} ${co}${szczegol ? ` — ${szczegol}` : ''}`);
};

console.log('=== gniazda ===');
for (const g of GNIAZDA) {
  const w = ARTEFAKTY.filter((a) => a.gniazdo === g && a.klasa !== 'misja');
  sprawdz(`${g}: co najmniej dwa artefakty różnej siły`, w.length >= 2 && new Set(w.map(silaArtefaktu)).size >= 2, w.map((a) => a.id).join(', '));
}

console.log('=== jeden na gniazdo ===');
const s = planszaPrzygody();
const b = s.bohater;
b.artefakty = [];
const zero = statystyki(b);
b.artefakty = ['opaska', 'opaska', 'opaska', 'opaska', 'opaska'];
sprawdz('pięć opasek daje tyle co jedna', statystyki(b).atak === zero.atak + 1, `${statystyki(b).atak - zero.atak}`);
sprawdz('cztery opaski w plecaku', wPlecaku(b).length === 4);
b.artefakty = ['opaska', 'czapka', 'pazur', 'rekawica', 'buty'];
sprawdz('domyślnie najsilniejszy w gnieździe', zalozone(b).glowa?.id === 'czapka' && zalozone(b).prawa?.id === 'rekawica');
sprawdz('statystyki z noszonych', statystyki(b).atak === zero.atak + 1 + 4 && statystyki(b).obrona === zero.obrona + 1);
sprawdz('zakładanie słabszego z plecaka', zaloz(b, 'opaska') && zalozone(b).glowa?.id === 'opaska');
sprawdz('zdjęty wraca do plecaka', wPlecaku(b).some((a) => a.id === 'czapka') && !wPlecaku(b).some((a) => a.id === 'opaska'));
sprawdz('nie da się założyć niezebranego', !zaloz(b, 'kurtka'));
const p = bohaterDoPrzeniesienia(s);
sprawdz('wybór przechodzi do następnej misji', p.zalozone?.glowa === 'opaska');
b.artefakty = b.artefakty.filter((id) => id !== 'opaska');
sprawdz('zgubiony wybór → znów najsilniejszy', zalozone(b).glowa?.id === 'czapka');
b.artefakty.push('ksiezycowy-kamien', 'amulet');
sprawdz('Księżycowy Kamień nosi się na szyi', zalozone(b).szyja?.id === 'ksiezycowy-kamien');

console.log(bledy ? `\nBłędów: ${bledy}` : '\nWszystko się zgadza.');
process.exitCode = bledy ? 1 : 0;
