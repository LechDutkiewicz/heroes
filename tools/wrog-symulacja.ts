/**
 * Poziom trudności AI przeciwnika, mierzony liczbą, nie wrażeniem — dzień po
 * dniu, bez przeglądarki, tak jak `tools/balance.ts` rozgrywa bitwy.
 *
 * Próg jest dwuliczbowy i obie liczby trzeba trafić naraz:
 *   1) gracz BIERNY (zero akcji) przez 55 dni → MA PRZEGRAĆ (jego zamek
 *      startowy ma zmienić właściciela na 'wrog'). Do 2026-09-24 było to
 *      40 dni; od kiedy „Dwie Doliny" są misją 2 kampanii, mają własne
 *      USTAWIENIA (natarcie od dnia 40, mocniejsza załoga zamku), żeby
 *      dziecko zdążyło znaleźć namioty klucznika — bierny gracz pada teraz
 *      dnia 45 zamiast 30.
 *   2) gracz grający NORMALNIE (ten sam silnik decyzji co AI, z `turaAI`,
 *      więc "normalnie" znaczy "rozsądnie, ale bez przewagi wiedzy") NIE MA
 *      zostać zmieciony przed dniem ~25.
 *
 * "Przegrana" = zamek startowy gracza zmienił właściciela na 'wrog'. To
 * jedyny jednoznaczny koniec gry, jaki `mapa.ts` już zna — dokładnie
 * odwrotność `sprawdzKoniec()` w AdventureScene, który kończy grę, gdy
 * WSZYSTKIE zamki są nasze.
 *
 * Uruchomienie:
 *   npx tsx tools/wrog-symulacja.ts
 *   PROB=100 DNI=60 npx tsx tools/wrog-symulacja.ts
 */

import { nowaTura, type StanMapy } from '../src/data/mapa';
import { planszaPrzygody } from '../src/data/plansza';
import { turaAI } from '../src/data/wrog-ai';

declare const process: { env: Record<string, string | undefined>; exitCode?: number };
const PROB = Number(process.env.PROB ?? 40);
const DNI_BIERNY = Number(process.env.DNI ?? 55);
const DNI_NORMALNY = DNI_BIERNY + 20; // margines, żeby zobaczyć, CZY w ogóle pada, nie tylko czy pada w progu

let bledy = 0;
const sprawdz = (co: string, ok: boolean, szczegol = '') => {
  if (!ok) bledy++;
  console.log(`  ${ok ? 'OK  ' : 'ŹLE '} ${co}${szczegol ? ` — ${szczegol}` : ''}`);
};

/** Zamek startowy gracza — ten sam obiekt cały przebieg, więc `wlasciciel` śledzi jego los. */
function zamekGracza(s: StanMapy) {
  return s.obiekty.find((o) => o.rodzaj === 'zamek' && o.frakcjaZamku === 'bor')!;
}

/**
 * Jeden przebieg: `graj` mówi, czy gracz w ogóle rusza się tego dnia.
 * Zwraca dzień, w którym padł zamek gracza, albo `null`, jeśli przetrwał
 * cały horyzont.
 */
function przebieg(dni: number, graj: boolean, ziarno: number): number | null {
  const s = planszaPrzygody();
  const zamek = zamekGracza(s);
  for (let dzien = 1; dzien <= dni; dzien++) {
    nowaTura(s);
    if (graj) turaAI(s, 'gracz', ziarno * 2);
    turaAI(s, 'wrog', ziarno * 2 + 1);
    if (zamek.wlasciciel === 'wrog') return dzien;
  }
  return null;
}

console.log(`\nPRÓG TRUDNOŚCI AI — ${PROB} przebiegów na scenariusz\n`);

// ---------------------------------------------------------------------------
// 1. Gracz bierny 40 dni → MA przegrać
// ---------------------------------------------------------------------------
console.log(`=== gracz bierny przez ${DNI_BIERNY} dni ===`);
const bierne: (number | null)[] = [];
for (let i = 0; i < PROB; i++) bierne.push(przebieg(DNI_BIERNY, false, i));
const przegrane = bierne.filter((d) => d !== null) as number[];
const udzialPrzegranych = przegrane.length / PROB;
const sredniDzien = przegrane.length
  ? przegrane.reduce((a, b) => a + b, 0) / przegrane.length
  : NaN;
console.log(
  `  zamek gracza padł w ${przegrane.length}/${PROB} przebiegach, średnio dnia ${sredniDzien.toFixed(1)}`
);
console.log('  dni:', bierne.join(','));
sprawdz(
  `bierny gracz przegrywa w co najmniej 95% przebiegów do dnia ${DNI_BIERNY}`,
  udzialPrzegranych >= 0.95,
  `${(udzialPrzegranych * 100).toFixed(0)}%`
);

// ---------------------------------------------------------------------------
// 2. Gracz normalny → NIE MA zostać zmieciony przed dniem ~25
// ---------------------------------------------------------------------------
console.log(`\n=== gracz gra normalnie (autopilot), horyzont ${DNI_NORMALNY} dni ===`);
const normalne: (number | null)[] = [];
for (let i = 0; i < PROB; i++) normalne.push(przebieg(DNI_NORMALNY, true, i + 10_000));
const padlyWczesnie = normalne.filter((d) => d !== null && d < 25);
const przetrwaloDo25 = 1 - padlyWczesnie.length / PROB;
const wogolePadly = normalne.filter((d) => d !== null).length;
console.log(
  `  zamek padł przed dniem 25 w ${padlyWczesnie.length}/${PROB} przebiegach` +
    ` (padł kiedykolwiek: ${wogolePadly}/${PROB})`
);
console.log('  dni:', normalne.join(','));
sprawdz(
  'normalnie grający gracz NIE zostaje zmieciony przed dniem 25 w co najmniej 90% przebiegów',
  przetrwaloDo25 >= 0.9,
  `${(przetrwaloDo25 * 100).toFixed(0)}%`
);

console.log(`\nBŁĘDÓW: ${bledy}`);
if (bledy > 0) process.exitCode = 1;
