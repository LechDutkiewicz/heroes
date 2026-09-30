/**
 * Teren pola bitwy — z pola mapy, na którym stoi trener (jak w Heroes 3:
 * tło bitwy to teren, na którym doszło do walki).
 *
 * Zgłoszenie gracza: „teren bitwy ma odpowiadać terenowi, na którym doszło do
 * walki na ekranie mapy — śnieg, trawa itd." Dotąd tło było losowane
 * z pięciu krajobrazów, więc walka na łące Polany mogła wypaść na śniegu.
 *
 * Przeszkody bitwy to te same drzewa i skały co klocki mapy danego klimatu
 * (`public/mapa/klocki/<zestaw>/`), więc walka wygląda jak kawałek mapy.
 */
import type { StanMapy, Teren } from './mapa';

export type TerenBitwy = 'laka' | 'las' | 'piasek' | 'ziemia' | 'bagno' | 'snieg';

export interface OpisTerenuBitwy {
  key: TerenBitwy;
  label: string;
  /** Przeszkody: `k-<zestaw>/<plik>` (klocek mapy) albo `przeszkoda-<nazwa>`. */
  obstacles: string[];
}

const DRZEWA = (z: string) => [`${z}/las-1x1-a`, `${z}/las-1x1-b`];
const SKALA = (z: string) => [`${z}/skala-1x1`];
const P = (...n: string[]) => n.map((x) => `przeszkoda-${x}`);

// Każdy obrazek najwyżej raz na polu (`scatterObstacles` losuje bez
// powtórzeń) — gracz: „3 razy ta sama skała", „to samo drzewo dwa razy,
// raz mniejsze". Zestawy mają co najmniej tyle obrazków, ile przeszkód
// może stanąć (OBSTACLES_MAX).
export const TERENY_BITWY: Record<TerenBitwy, OpisTerenuBitwy> = {
  laka: { key: 'laka', label: 'Łąka', obstacles: [...DRZEWA('trawa'), ...SKALA('trawa'), ...P('kloda', 'pniak', 'krzak-kwiaty')] },
  las: {
    key: 'las',
    label: 'Leśna polana',
    obstacles: [...DRZEWA('trawa'), ...P('paproc', 'pien-grzyby', 'glaz-mech', 'pniak')],
  },
  piasek: {
    key: 'piasek',
    label: 'Plaża',
    obstacles: [...P('palma', 'muszla', 'drewno-wyrzucone', 'kamienie-plaza'), ...SKALA('trawa')],
  },
  ziemia: {
    key: 'ziemia',
    label: 'Pustkowie',
    obstacles: [...P('krzak-suchy', 'kaktus', 'suche-drzewo', 'glaz-pekniety'), ...SKALA('trawa')],
  },
  bagno: { key: 'bagno', label: 'Bagno', obstacles: [...DRZEWA('bagno'), ...SKALA('bagno'), ...P('trzciny', 'pniak-bagno', 'grzyby-bagno')] },
  snieg: { key: 'snieg', label: 'Śnieżne pole', obstacles: [...DRZEWA('zima'), ...SKALA('zima'), ...P('lod', 'balwan', 'krzak-szron')] },
};

/** Wysokie przeszkody (drzewa, palma, kaktus, trzciny) — reszta to niskie kępy i głazy. */
export const wysokaPrzeszkoda = (kind: string) => /(las-|palma|kaktus|suche-drzewo|trzciny|pien-grzyby|lod|balwan)/.test(kind);

/** Wszystkie pliki przeszkód (do wczytania w scenie bitwy). */
export const PRZESZKODY_BITWY = [...new Set(Object.values(TERENY_BITWY).flatMap((t) => t.obstacles))];

/**
 * Teren bitwy dla pola (x, y) planszy. Klimat planszy (`USTAWIENIA.klocki`:
 * `trawa`, `bagno`, `zima`) przestawia zwykłą trawę: na zimowej planszy
 * trawa to tundra pod śniegiem, na bagiennej — mokra łąka. Trawa otoczona
 * lasem (co najmniej trzy z ośmiu sąsiadów) to leśna polana.
 */
export function terenBitwy(s: Pick<StanMapy, 'teren' | 'szer' | 'wys'>, x: number, y: number, klimat?: string): TerenBitwy {
  const t: Teren | undefined = s.teren[y]?.[x];
  if (t === 'snieg') return 'snieg';
  if (t === 'bagno') return 'bagno';
  if (t === 'piasek') return 'piasek';
  if (t === 'jalowa' || t === 'skaly') return klimat === 'zima' ? 'snieg' : 'ziemia';
  if (klimat === 'zima') return 'snieg';
  if (klimat === 'bagno') return 'bagno';
  if (t === 'las') return 'las';
  let lasu = 0;
  for (let dy = -1; dy <= 1; dy++)
    for (let dx = -1; dx <= 1; dx++) if ((dx || dy) && s.teren[y + dy]?.[x + dx] === 'las') lasu++;
  return lasu >= 3 ? 'las' : 'laka';
}
