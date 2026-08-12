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
import { pierwszaMapa } from '../src/data/mapa1';
import { MAPA_H, MAPA_W, OKNO_H, OKNO_W } from '../src/visual/uklad';




let bledy = 0;
const sprawdz = (co: string, ok: boolean, szczegol = '') => {
  if (!ok) bledy++;
  console.log(`  ${ok ? 'OK  ' : 'ŹLE '} ${co}${szczegol ? ` — ${szczegol}` : ''}`);
};

const s: StanMapy = pierwszaMapa();

console.log('=== kształt planszy ===');
sprawdz('wszystkie wiersze równej długości', s.teren.every((w) => w.length === s.szer), `${s.szer} × ${s.wys}`);

console.log('\n=== układ mieści się w oknie gry ===');
sprawdz('szerokość', MAPA_W <= OKNO_W, `${MAPA_W} ≤ ${OKNO_W}`);
sprawdz('wysokość', MAPA_H <= OKNO_H, `${MAPA_H} ≤ ${OKNO_H}`);

console.log('\n=== obiekty ===');
for (const o of s.obiekty) {
  const nateren = wGranicach(s, o.x, o.y) ? s.teren[o.y][o.x] : null;
  sprawdz(
    `${o.nazwa} (${o.x},${o.y})`,
    nateren !== null && TEREN_INFO[nateren].koszt !== null,
    nateren === null ? 'poza planszą' : TEREN_INFO[nateren].nazwa
  );
}
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
  const koszt = t?.reduce((a, k) => a + k.koszt, 0) ?? 0;
  sprawdz(
    `da się dojść do: ${o.nazwa}`,
    t !== null,
    t ? `${t.length} pól, ${Math.round(koszt)} pkt ruchu (zapas na turę: ${s.bohater.ruchMax})` : 'brak trasy'
  );
}

console.log('\n=== pierwsza tura ma sens ===');
// Gra dla ośmiolatka: w pierwszej turze musi być coś do zrobienia, ale nie
// wszystko naraz — inaczej albo nie ma nagrody, albo nie ma następnej tury.
const wZasiegu = s.obiekty.filter((o) => {
  const t = trasa(s, o.x, o.y);
  return t !== null && t.reduce((a, k) => a + k.koszt, 0) <= s.bohater.ruchMax;
});
sprawdz(
  'w pierwszej turze osiągalne 2–4 obiekty',
  wZasiegu.length >= 2 && wZasiegu.length <= 4,
  wZasiegu.map((o) => o.nazwa).join(', ') || 'żaden'
);

console.log(`\n${bledy === 0 ? 'Wszystko się zgadza.' : `Błędów: ${bledy}`}`);
process.exit(bledy === 0 ? 0 : 1);
