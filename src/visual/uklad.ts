/**
 * Geometria mapy przygody — same liczby, bez Phasera.
 *
 * Wydzielone z `AdventureScene`, żeby dało się sprawdzić bez przeglądarki,
 * czy mapa, panel i pasek surowców mieszczą się w oknie gry. Wcześniej te
 * stałe siedziały w scenie i test musiał importować Phasera, co pod Node
 * kończyło się „window is not defined".
 */

/**
 * Okno jest wspólne z bitwą. `OKNO_H` powiela `SCENE_H` z `BattleScene`,
 * bo tamten plik ciągnie za sobą Phasera; `main.ts` sprawdza w locie, że obie
 * liczby są równe, więc rozjazd nie przejdzie niezauważony.
 */
export const OKNO_W = 960;
export const OKNO_H = 694;

/**
 * Bok pola w układzie ŚWIATA mapy przygody. W tej skali są wyrenderowane tła
 * plansz (`plansza-0`), a wysokości sprite'ów są podawane w KAFEL-ach — więc
 * ta liczba zostaje 48 niezależnie od tego, jak duże pole widać na ekranie.
 */
export const KAFEL = 48;

/**
 * Oddalenie kamery mapy przygody. Pole mapy ma na ekranie 32 px — tyle, co
 * w Heroes 3 — choć w świecie ma `KAFEL` = 48. Przy 48 px na ekranie widać
 * było ledwie 14 × 12 pól i mapa wyglądała jak przez dziurkę od klucza.
 *
 * Przeliczenie ekran ↔ świat w ramie mapy: `świat = (ekran − róg ramy) / ZOOM
 * + przewinięcie kamery`. Kamera ma origin (0, 0), więc przewinięcie to
 * dokładnie lewy górny róg widocznego wycinka świata.
 */
export const ZOOM_MAPY = 32 / 48;
/** Bok pola mapy przygody na EKRANIE, w pikselach. */
export const KAFEL_EKRAN = KAFEL * ZOOM_MAPY;

/**
 * Skala RUCHOMYCH postaci na mapie przygody — jedyne miejsce z tymi liczbami.
 *
 * Wysokości to WIDOCZNA sylwetka (od stóp do czubka głowy, bez przezroczystego
 * marginesu pliku), w polach. Hierarchia jak w Heroes 3: bohater jest
 * największą ruchomą rzeczą na mapie (~2,2 pola), strażnik ~1,3 pola — zawsze
 * wyraźnie większy od kupki surowca (0,45–0,8 pola, `USTAWIENIA.znajdzki`
 * planszy), a mniejszy od budowli. Wcześniej bohater miał 0,9 pola, czyli
 * mniej niż kryształ przy drodze, a strażnik 1,0 — oba ginęły między
 * znajdźkami. Znajdźek i budowli te liczby nie dotyczą.
 *
 * Stworki, runda 2 (ślepe porównanie z HotA, 0/2): „strażnika nie da się
 * odróżnić od znajdźki", „Janek jest wielkości kryształu" — stąd 1,6 i 1,9
 * i cień rzucany (`cienRzucany` w scenie mapy).
 *
 * Stworki, runda 3 (0/3): „hierarchia odwrócona — strażnicy więksi od
 * bohatera, wielkości chat i wieży; Janek ginie przy zamku". Bohater jest
 * chudy (chłopiec, nie jeździec na koniu), więc przy 1,9 pola strażnik
 * szeroki na dwa pola i tak zajmował więcej ekranu. Teraz bohater 2,2 pola
 * i proporzec gracza nad nim (`PROPORZEC`), strażnik 1,3 pola, najwyżej
 * 1,6 wszerz — dwa razy więcej niż kupka surowca, dużo mniej niż budowla.
 */
export const WYS_BOHATERA = 2.2;
export const WYS_STRAZNIKA = 1.3;
/**
 * Szerokie stworki (węże, płaszczki) przy pełnej wysokości rozlewałyby się
 * na trzy pola i zasłaniały sąsiadów — ich sylwetkę ograniczamy szerokością.
 */
export const SZER_STRAZNIKA_MAX = 1.6;

/**
 * Proporzec bohatera w kolorze gracza (runda 3: „bez flagi, podstawki ani
 * obrysu"), w polach: drzewce od stóp do `ponadGlowe` nad czubkiem głowy,
 * płat `dlugosc` × `wysokosc`. W HoMM3 bohatera znajduje się wzrokiem po
 * flagi nad koniem — tu po proporcu nad głową.
 */
export const PROPORZEC = { ponadGlowe: 0.6, dlugosc: 1.1, wysokosc: 0.6 };

/**
 * Jak stworki-strażnicy siadają w oświetleniu planszy (runda 3: „cieniowane
 * płasko, wklejone z innej gry"). Pliki `public/sprites/` mają +12%
 * nasycenia i ciemną obwódkę 1 px pod bitwę (`tools/stworki_wczytaj.py`);
 * mapa robi z nich własną teksturę (`teksturaStworkaNaMape` w scenie):
 * - `nasycenie` — mnożnik nasycenia (0,9 zdejmuje te +12%),
 * - `swiatlo` — jaśniej od lewej-góry, ciemniej ku prawemu-dołowi (±),
 * - `podcien` — przyciemnienie dołu sylwetki przy ziemi (dolne ~35%),
 * - `krawedz` — ciemniejszy brzeg po stronie cienia (prawy-dolny),
 * - `paleta` — ile barwy gruntu spod strażnika wchodzi w barwę stworka,
 * - `otoczenie` — ile samego gruntu przebija przez stworka (powietrze).
 * Bitwa, miasto i HUD dalej biorą oryginalne pliki.
 */
export const STWORKI_NA_MAPIE = {
  nasycenie: 0.9,
  swiatlo: 0.18,
  podcien: 0.22,
  krawedz: 0.2,
  paleta: 0.15,
  otoczenie: 0.04,
};

/**
 * Znajdźki (stosy, skrzynie, artefakty) — runda 3: „strażnicy mają tę samą
 * wagę i nasycenie co kryształy i jagody". Znajdźka jest o `skala` mniejsza
 * niż `USTAWIENIA.znajdzki` planszy i ma `nasycenie` barw — tło dla
 * strażnika, a nie konkurent.
 */
export const ZNAJDZKI_NA_MAPIE = { skala: 0.88, nasycenie: 0.8 };

export const PANEL_W = 250;
export const PASEK_H = 34;
export const MARGINES = 8;
/** Pas na tytuł nad mapą. */
export const GORA = 44;

/**
 * Ile pól planszy widać naraz w ramie mapy. Rama ma na ekranie 672 × 576 px
 * — największy prostokąt, który mieści się obok panelu w oknie 960 × 694 —
 * a pole ma w niej `KAFEL_EKRAN` = 32 px, więc widać 21 × 18 pól (dawniej,
 * przy 48 px na pole, 14 × 12). Sama plansza jest większa i się przewija.
 */
export const KOL = 21;
export const WIE = 18;

/** Rama mapy na ekranie, w pikselach ekranu. */
export const RAMA_MAPY_W = KOL * KAFEL_EKRAN;
export const RAMA_MAPY_H = WIE * KAFEL_EKRAN;

export const MAPA_W = MARGINES + RAMA_MAPY_W + 14 + PANEL_W + 8;
export const MAPA_H = GORA + RAMA_MAPY_H + 8 + PASEK_H + 14;
