import * as dwieDoliny from './plansza-teren';

/**
 * Rejestr plansz. Każda plansza to wynik generatora (teren, punkty, obiekty)
 * plus tło namalowane przez `tools/render_mapa.py`.
 *
 * `tlo` to katalog w `public/`, w którym leżą `plansza-0.jpg`
 * i `woda-maska.png` tej planszy. „Dwie Doliny" leżą w `mapa/` bezpośrednio,
 * bo były pierwsze i sięga tam kilkanaście narzędzi; kolejne plansze
 * dostają własne podkatalogi `mapa/<id>/`.
 */
export interface WpisRozstawienia {
  x: number;
  y: number;
  rodzaj: string;
  strefa: 'dom' | 'pogranicze' | 'wroga';
  surowiec?: string;
  sila?: string;
  nazwa?: string;
  budynek?: string;
  klucz?: string;
  /** Konkretny artefakt zamiast losowego — dla artefaktów-celów misji. */
  artefakt?: string;
}

export interface ModulPlanszy {
  TEREN: readonly string[];
  /** Muszą być co najmniej: 'start', 'zamek gracza'. Każdy klucz zaczynający
   *  się od 'zamek wroga' stawia zamek przeciwnika. */
  PUNKTY: Record<string, { x: number; y: number }>;
  ROZSTAWIENIE: WpisRozstawienia[];
}

export interface Plansza {
  id: string;
  nazwa: string;
  modul: ModulPlanszy;
  /** Katalog tła względem `public/`, z ukośnikiem na końcu. */
  tlo: string;
}

export const MAPY: Record<string, Plansza> = {
  'dwie-doliny': {
    id: 'dwie-doliny',
    nazwa: 'Dwie Doliny',
    modul: dwieDoliny as unknown as ModulPlanszy,
    tlo: 'mapa/',
  },
};

export const DOMYSLNA_MAPA = 'dwie-doliny';

export const planszaPoId = (id: string | undefined): Plansza =>
  MAPY[id ?? DOMYSLNA_MAPA] ?? MAPY[DOMYSLNA_MAPA];
