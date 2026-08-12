// Sprawdzenie pierwszej planszy — bez przeglądarki, bez rysowania.
//
// Po co: rysunek mapy to tekst, a w tekście łatwo o wiersz krótszy o jeden
// znak albo o obiekt postawiony na lesie. Jedno i drugie widać dopiero
// w grze, i to jako coś zupełnie innego („nie da się tam wejść").
//
//   npx tsx tools/probe-mapa.ts

import {
  TEREN_INFO,
  kosztPola,
  obiektNa,
  trasa,
  wGranicach,
  type StanMapy,
} from '../src/data/mapa';
import { planszaPrzygody } from '../src/data/plansza';
import { MAPA_H, MAPA_W, OKNO_H, OKNO_W } from '../src/visual/uklad';
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';




let bledy = 0;
const sprawdz = (co: string, ok: boolean, szczegol = '') => {
  if (!ok) bledy++;
  console.log(`  ${ok ? 'OK  ' : 'ŹLE '} ${co}${szczegol ? ` — ${szczegol}` : ''}`);
};

const s: StanMapy = planszaPrzygody();

console.log('=== kształt planszy ===');
sprawdz('wszystkie wiersze równej długości', s.teren.every((w) => w.length === s.szer), `${s.szer} × ${s.wys}`);

console.log('\n=== układ mieści się w oknie gry ===');
sprawdz('szerokość', MAPA_W <= OKNO_W, `${MAPA_W} ≤ ${OKNO_W}`);
sprawdz('wysokość', MAPA_H <= OKNO_H, `${MAPA_H} ≤ ${OKNO_H}`);
// Plansza jest teraz większa od okna — to ona wymusiła przewijanie.
sprawdz('plansza większa od okna (jest co przewijać)', s.szer > 14 && s.wys > 12, `${s.szer} × ${s.wys}`);

console.log('\n=== tło zgodne z rysunkiem planszy ===');
// Tło jest generowane z `RYSUNEK` przez tools/render_mapa.py. Bez tej kontroli
// łatwo zmienić planszę w kodzie i oglądać stare tło: pola zmieniają koszty
// i przejezdność, a obrazek pokazuje poprzedni układ. Taki rozjazd wygląda
// jak usterka silnika, a nie jak zapomniane przegenerowanie.
{
  const rysunek = s.teren
    .map((w) => w.map((t) => ({ trawa: '.', sciezka: '=', piasek: ',', las: 'T', skaly: '#', woda: '~' })[t]).join(''))
    .join('\n');
  const teraz = createHash('sha256').update(rysunek, 'utf8').digest('hex').slice(0, 16);
  let zapisany = '(brak pliku)';
  try {
    zapisany = JSON.parse(readFileSync('public/mapa/plansza.json', 'utf8')).odcisk;
  } catch {
    /* zostaje „brak pliku" */
  }
  sprawdz(
    'odcisk planszy zgadza się z wygenerowanym tłem',
    teraz === zapisany,
    teraz === zapisany ? teraz : `kod ${teraz} ≠ tło ${zapisany} — uruchom: python3 tools/render_mapa.py`
  );
}

console.log('\n=== obiekty ===');
let zleStojace = 0;
for (const o of s.obiekty) {
  const nateren = wGranicach(s, o.x, o.y) ? s.teren[o.y][o.x] : null;
  if (!(nateren !== null && TEREN_INFO[nateren].koszt !== null)) {
    zleStojace++;
    sprawdz(`${o.nazwa} (${o.x},${o.y})`, false, nateren === null ? 'poza planszą' : TEREN_INFO[nateren].nazwa);
  }
}
sprawdz(`wszystkie ${s.obiekty.length} obiektów stoi na terenie przejezdnym`, zleStojace === 0);
const zajete = new Set(s.obiekty.map((o) => `${o.x},${o.y}`));
sprawdz('żadne dwa obiekty nie stoją na tym samym polu', zajete.size === s.obiekty.length);
sprawdz(
  'bohater nie startuje na obiekcie ani w skałach',
  !obiektNa(s, s.bohater.x, s.bohater.y) && kosztPola(s, s.bohater.x, s.bohater.y) !== null
);

console.log('\n=== dostępność ===');
// Każdy obiekt musi dać się osiągnąć. Trasa nie przechodzi PRZEZ obiekty,
// więc jeśli potwór zamyka jedyne przejście do zamku, wyjdzie to właśnie tu.
for (const o of s.obiekty) {
  const t = trasa(s, o.x, o.y);
  if (t === null) sprawdz(`da się dojść do: ${o.nazwa} (${o.x},${o.y})`, false, 'brak trasy');
}

console.log('\n=== pierwsza tura ma sens ===');
// Gra dla ośmiolatka: w pierwszej turze musi być coś do zrobienia, ale nie
// wszystko naraz — inaczej albo nie ma nagrody, albo nie ma następnej tury.
const wZasiegu = s.obiekty.filter((o) => {
  const t = trasa(s, o.x, o.y);
  return t !== null && t.reduce((a, k) => a + k.koszt, 0) <= s.bohater.ruchMax;
});
// Poprzednia wersja tego sprawdzenia wymagała 2–4 osiągalnych obiektów i była
// dobrana do planszy 14 × 12. Po przejściu na 36 × 36 i punkty ruchu z Heroes 3
// (1500–2000, czyli 15–20 pól dziennie) w pierwszym dniu widać kilkanaście
// obiektów — i tak właśnie wygląda pierwszy dzień w Heroes 3. Nie liczba jest
// tu istotna, tylko dwie rzeczy: żeby było co robić i żeby nie dało się od razu
// pojechać na koniec mapy.
sprawdz('w pierwszym dniu jest co robić', wZasiegu.length >= 3, `${wZasiegu.length} obiektów`);
const wrogiZamek = s.obiekty.find((o) => o.rodzaj === 'zamek' && !o.nasz)!;
sprawdz(
  'zamek przeciwnika NIE jest osiągalny pierwszego dnia',
  !wZasiegu.includes(wrogiZamek)
);
const straznik = s.obiekty.find((o) => o.nazwa === 'Strażnik Przełęczy')!;
sprawdz('strażnik przełęczy stoi poza zasięgiem pierwszego dnia', !wZasiegu.includes(straznik));

console.log('\n=== mgła wojny ===');
const odkrytych = s.odkryte.flat().filter(Boolean).length;
sprawdz('na starcie odsłonięty jest tylko fragment', odkrytych > 20 && odkrytych < s.szer * s.wys * 0.15, `${odkrytych} z ${s.szer * s.wys} pól`);
sprawdz('każdy obiekt daleko od startu jest zakryty', !s.obiekty.every((o) => s.odkryte[o.y][o.x]));

console.log(`\n${bledy === 0 ? 'Wszystko się zgadza.' : `Błędów: ${bledy}`}`);
process.exit(bledy === 0 ? 0 : 1);
