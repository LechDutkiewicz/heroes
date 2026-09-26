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
 * największą ruchomą rzeczą na mapie (1,8 pola), strażnik 1,45 pola — zawsze
 * wyraźnie większy od kupki surowca (0,62 pola, `ZNAJDZKI_NA_MAPIE`),
 * a mniejszy od budowli. Wcześniej bohater miał 0,9 pola, czyli
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
 *
 * Stworki, runda 4 (r3 1/3): „Janek wyższy niż tawerna, sięga połowy
 * wiatraka", „stwory tej samej wielkości co znajdźki obok", „kolaż naklejek,
 * a nie mapa z jedną regułą skali". Jedna reguła, jak w HotA: budowla >
 * bohater (1,8) > strażnik (1,45, do 1,8 wszerz) > znajdźka (0,62,
 * `ZNAJDZKI_NA_MAPIE.wys`) — każdy stopień wyraźnie mniejszy od
 * poprzedniego, na wszystkich planszach te same liczby.
 */
export const WYS_BOHATERA = 1.9;
export const WYS_STRAZNIKA = 1.4;
/**
 * Szerokie stworki (węże, płaszczki) przy pełnej wysokości rozlewałyby się
 * na trzy pola i zasłaniały sąsiadów — ich sylwetkę ograniczamy szerokością.
 */
export const SZER_STRAZNIKA_MAX = 1.65;

/**
 * Proporzec bohatera w kolorze gracza (runda 3: „bez flagi, podstawki ani
 * obrysu"), w polach: drzewce od stóp do `ponadGlowe` nad czubkiem głowy,
 * płat `dlugosc` × `wysokosc`. W HoMM3 bohatera znajduje się wzrokiem po
 * flagi nad koniem — tu po proporcu nad głową.
 */
export const PROPORZEC = { ponadGlowe: 0.4, dlugosc: 0.8, wysokosc: 0.45 };

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
 * - `otoczenie` — ile samego gruntu przebija przez stworka (powietrze),
 * - `podstawka` — krycie ciemnej, zwartej plamy gruntu pod stopami (runda 4:
 *   „brak podstawki / znacznika strażnika") — cień kontaktowy jednostki,
 *   ciemniejszy i węższy niż pod znajdźką, bez poświaty.
 * Bitwa, miasto i HUD dalej biorą oryginalne pliki.
 */
export const STWORKI_NA_MAPIE = {
  nasycenie: 0.95,
  swiatlo: 0.2,
  podcien: 0.24,
  krawedz: 0.24,
  paleta: 0.12,
  otoczenie: 0.03,
  podstawka: 0.42,
};

/**
 * Bohater w świetle planszy (runda 4: „narysowany płasko, jak postać z innej
 * gry"): ten sam przebieg co u strażników (`STWORKI_NA_MAPIE`, bez barwy
 * gruntu — bohater chodzi po całej planszy), na każdej klatce arkusza osobno.
 * `obrys` — krycie ciemnego obrysu z kopii klatki (runda 3 dała 0,6; twarda
 * ciemna linia robiła „naklejkę", teraz sylwetkę niesie światło i cień).
 */
export const BOHATER_NA_MAPIE = { nasycenie: 1, swiatlo: 0.16, podcien: 0.2, krawedz: 0.26, obrys: 0 };

/**
 * Znajdźki (stosy, skrzynie, artefakty) — runda 3: „strażnicy mają tę samą
 * wagę i nasycenie co kryształy i jagody"; runda 4: „turkusowe smoczki przy
 * turkusowych kryształach, fioletowe potwory przy fioletowych jagodach".
 * Łup to drobiazg przy gruncie, tło dla strażnika:
 * - `wys` — widoczna wysokość w polach (jedna na wszystkie plansze; dawniej
 *   0,39–0,63 z `USTAWIENIA.znajdzki`), `szerMax` — najwyżej tyle wszerz,
 * - `nasycenie`, `kontrast` (ściśnięcie jasności ku średniej), `jasnosc`,
 * - `obrys` — mnożnik `USTAWIENIA.obrysObiektow` (ciemna linia wokół łupu
 *   wyciągała go na pierwszy plan jak naklejkę),
 * - `przyStrazniku` — znajdźka do `pola` od strażnika o barwie bliższej niż
 *   `roznica` stopni odcienia gaśnie mocniej (`nasycenie`, `jasnosc`), żeby
 *   jedno nie zlewało się z drugim.
 */
export const ZNAJDZKI_NA_MAPIE = {
  wys: 0.62,
  szerMax: 0.95,
  nasycenie: 0.55,
  kontrast: 0.82,
  jasnosc: 0.94,
  obrys: 0.35,
  przyStrazniku: { pola: 3, roznica: 42, nasycenie: 0.3, jasnosc: 0.88 },
};

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
