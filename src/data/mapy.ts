import * as dwieDoliny from './plansza-teren';
import * as polana from './plansza-teren-polana';
import * as bagna from './plansza-teren-bagna';
import * as twierdza from './plansza-teren-twierdza';

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
   * Od dnia natarcia zamek gracza jest celem ponad wszystko (o ile AI go zna
   * i da radę go zdobyć). Bez tego AI najpierw odkrywa mapę — na dużej
   * planszy przez tygodnie.
   */
  natarcie?: boolean;
  /**
   * `false` — przeciwnik nie rozbudowuje zamków, więc tempo wzrostu jego armii
   * wynika wprost z `budynkiWroga`. W Twierdzy to jest pokrętło trudności:
   * wróg naciera wcześnie, ale nie rośnie wykładniczo.
   */
  wrogBuduje?: boolean;
  /** Co przeciwnik wie od pierwszego dnia — np. gdzie stoi zamek gracza. */
  wrogOdkryte?: Array<{ x: number; y: number; promien: number }>;
  /**
   * Załoga każdego zamku wroga: poziomy oddziałów i ile tygodniowych
   * przyrostów każdego z nich (1 = jeden tydzień, jak na Dwóch Dolinach).
   */
  garnizonWroga?: { poziomy: number[]; tygodnie: number };
  /**
   * Zestaw sprite'ów klimatu: scena, która go zna, bierze drzewa, krzaki,
   * skały i kopalnie z `public/mapa/<zestaw>/<nazwa>.png` zamiast
   * `public/mapa/<nazwa>.png`, gdy taki plik istnieje (zaśnieżone sosny
   * w Twierdzy, martwe drzewa na Bagnach). Kontrakt i lista plików: STAN.md,
   * „Grafiki plansz kampanii". Brak = zestaw podstawowy.
   */
  zestaw?: 'zima' | 'bagno' | 'polana';
  /**
   * Wysokość znajdziek leżących na ziemi (stos surowca, skrzynia, artefakt)
   * w polach. Brak = dawne rozmiary (0,7 / 0,78 / 0,72). Przy ustawionej
   * znajdźka dostaje też ciaśniejszy, ciemniejszy cień kontaktowy —
   * mała rzecz bez cienia wygląda na ikonę wklejoną w tło.
   */
  znajdzki?: number;
  /**
   * Mnożnik wysokości rysunków budowli odwiedzanych (`budynek`: wiatrak,
   * wieża, obóz…) na tej planszy. Budowle zajmują jedno pole, więc rysunek
   * mniejszy niż w `BUDOWLE` niczego nie odsłania. Brak = 1.
   */
  skalaBudowli?: number;
  /**
   * Krycie ciemnego obrysu wokół obiektów gry (budowle, kopalnie, znajdźki,
   * zamki — bez stworków). Odcina to, co da się odwiedzić, od drzew i skał.
   * Brak = bez obrysu.
   */
  obrysObiektow?: number;
  /**
   * Barwy tafli w shaderze wody (`src/visual/woda.ts`, składowe 0–1): płycizna,
   * głębia, piana, krycie piany i siła iskier. Bagna: mętna oliwkowa woda
   * zamiast turkusu z białą pianą. Brak = dawne stałe.
   */
  wodaBarwy?: {
    plytka?: [number, number, number];
    gleboka?: [number, number, number];
    piana?: [number, number, number];
    pianaMoc?: number;
    iskry?: number;
  };
  /** Załoga zamku gracza (domyślnie poziomy 0–1, pięć tygodni przyrostu). */
  garnizonGracza?: { poziomy: number[]; tygodnie: number };
  /** Nazwy zamków wroga, w kolejności punktów 'zamek wroga', 'zamek wroga 2'… */
  nazwyZamkowWroga?: string[];
  /** Budynki stojące w zamkach wroga od pierwszego dnia. */
  budynkiWroga?: string[];
  /** Ile oddziałów czeka w zamkach wroga do werbunku pierwszego dnia. */
  dostepneWroga?: number[];
  /** Mnożnik armii startowej bohatera wroga (1 = taka jak gracza). */
  armiaWroga?: number;
  /**
   * Miejsca odsłonięte na starcie — jak zaznaczenie na mapie od zleceniodawcy.
   * Na Bagnach to Wyspa Księżyca: misja mówi „odnajdź Kamień", a ośmiolatek
   * ma wiedzieć, w którą stronę jechać, zanim wyjedzie z doliny.
   */
  odkryte?: Array<{ x: number; y: number; promien: number }>;
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
  bagna: {
    id: 'bagna',
    nazwa: 'Bagna',
    modul: bagna as unknown as ModulPlanszy,
    tlo: 'mapa/bagna/',
  },
  twierdza: {
    id: 'twierdza',
    nazwa: 'Twierdza',
    modul: twierdza as unknown as ModulPlanszy,
    tlo: 'mapa/twierdza/',
  },
};

export const DOMYSLNA_MAPA = 'dwie-doliny';

export const planszaPoId = (id: string | undefined): Plansza =>
  MAPY[id ?? DOMYSLNA_MAPA] ?? MAPY[DOMYSLNA_MAPA];
