import * as dwieDoliny from './plansza-teren';
import * as polana from './plansza-teren-polana';

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

/**
 * Ustawienia misji, które zależą od PLANSZY, a nie od zasad gry — każde pole
 * jest opcjonalne i jego brak znaczy „tak jak na Dwóch Dolinach". Siedzą
 * w module planszy (eksport `USTAWIENIA`, wypisywany przez generator z
 * `tools/mapy/<id>.py`), bo trudność misji to cecha mapy: ta sama armia
 * wroga na Polanie dla ośmiolatka i w Twierdzy na koniec kampanii to dwie
 * różne gry.
 */
export interface UstawieniaPlanszy {
  /**
   * `aktywny` — przeciwnik gra pełną turę i wyrusza bohaterem; `obronca` —
   * bohater wroga zostaje w zamku, a przeciwnik co dzień werbuje do załogi
   * (misja samouczkowa: fort „umacnia się", ale nikt nie napada na gracza).
   */
  wrog?: 'aktywny' | 'obronca';
  /** Od którego dnia AI wolno wycelować w zamek gracza. */
  dzienNatarcia?: number;
  /**
   * Załoga każdego zamku wroga: poziomy oddziałów i ile tygodniowych
   * przyrostów każdego z nich (1 = jeden tydzień, jak na Dwóch Dolinach).
   */
  garnizonWroga?: { poziomy: number[]; tygodnie: number };
  /** Nazwy zamków wroga, w kolejności punktów 'zamek wroga', 'zamek wroga 2'… */
  nazwyZamkowWroga?: string[];
  /** Budynki stojące w zamkach wroga od pierwszego dnia. */
  budynkiWroga?: string[];
  /** Ile oddziałów czeka w zamkach wroga do werbunku pierwszego dnia. */
  dostepneWroga?: number[];
  /** Mnożnik armii startowej bohatera wroga (1 = taka jak gracza). */
  armiaWroga?: number;
  /** Skarbiec startowy gracza i przeciwnika. */
  skarbiec?: { pokeball: number; jagoda: number; kamien: number; odlamek: number };
  wrogSkarbiec?: { pokeball: number; jagoda: number; kamien: number; odlamek: number };
}

export interface ModulPlanszy {
  TEREN: readonly string[];
  /** Muszą być co najmniej: 'start', 'zamek gracza'. Każdy klucz zaczynający
   *  się od 'zamek wroga' stawia zamek przeciwnika. */
  PUNKTY: Record<string, { x: number; y: number }>;
  ROZSTAWIENIE: WpisRozstawienia[];
  USTAWIENIA?: UstawieniaPlanszy;
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
  polana: {
    id: 'polana',
    nazwa: 'Polana',
    modul: polana as unknown as ModulPlanszy,
    tlo: 'mapa/polana/',
  },
};

export const DOMYSLNA_MAPA = 'dwie-doliny';

export const planszaPoId = (id: string | undefined): Plansza =>
  MAPY[id ?? DOMYSLNA_MAPA] ?? MAPY[DOMYSLNA_MAPA];
