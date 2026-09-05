// PLIK GENEROWANY — nie poprawiaj ręcznie.
// Źródło: tools/generuj_mape.py (szkic krain jest w tamtym pliku).
//
// Plansza 36 × 36 — rozmiar małej mapy z Heroes 3.
// Znaki: . trawa, = ścieżka, , piasek, T las, # skały, ~ woda.

export const TEREN = [
  '~~~~~~~~,,,,,,,......#######....TTTT',
  '~~~~~~~,~,,,,,.,.....########....TTT',
  '~~~~~~~~,,,,,,.......#####......T.TT',
  '~~~~~,~~~,,,.........######.....TTTT',
  '~~~~~~,,,,,,....=....####..#.....TTT',
  '~~~~~~~,,.,.....=....#######.....T##',
  '~~~,,,,,,,,.....=.....#####......###',
  '~~,,,,,,,.......=.....#####......###',
  '~.~,,.,.,,......=....#######.......#',
  '~~..............=......####.........',
  '....=============....######.....#...',
  '....=.....TT.T.T.=..#.######........',
  '....=...TT.TT.....=.#.#####.....##.#',
  '....=....TTTTTTT..=..#####.......###',
  '....=....TTTTTTTT..=#######..#.#..##',
  '....=T..TTTTTTTTTTT=.#####....######',
  '....=.TTTTTTTTTTTT.=.#######..######',
  '......TTTTTTTTTTT...=#.####...###.#.',
  '......TTTTTTTT.......==.......##....',
  '.......TTTTTTTT........===..........',
  '......TT.T..TTT...........=.........',
  '..........T.TTT......####.#=......##',
  '..........T.TTT......#######=....##.',
  '...........TTTT.T..########.=....#..',
  '......................######=....#..',
  '......................#####.=.......',
  '......T.T............######..=......',
  '....T..T............########..=.....',
  '......T.TT............#####....=...~',
  '......TTTTT...........#####.......~.',
  '......TTTT.T..........####......~..~',
  '........TTT..........######.......~~',
  '......TTTTT..........######......~~~',
  '........T............######.........',
  '........T..........########.........',
  '.....................#####..........',
];

export const PUNKTY = {
  'start': { x: 4, y: 10 },
  'zamek gracza': { x: 4, y: 16 },
  'rozstaje': { x: 16, y: 10 },
  'polnocna polana': { x: 16, y: 4 },
  'przelecz': { x: 23, y: 19 },
  'zamek wroga': { x: 31, y: 28 },
};

export const ROZSTAWIENIE: Array<{ x: number; y: number; rodzaj: string; surowiec?: string; sila?: string }> = [
  { x: 8, y: 7, rodzaj: 'surowiec', surowiec: 'jagoda' },
  { x: 0, y: 11, rodzaj: 'surowiec', surowiec: 'jagoda' },
  // Odsunięty od zachodniej krawędzi: sad zajmuje bryłę szeroką na trzy pola,
  // a stojąc w kolumnie zerowej wystawał połową poza planszę.
  { x: 1, y: 15, rodzaj: 'kopalnia', surowiec: 'jagoda' },
  { x: 9, y: 2, rodzaj: 'surowiec', surowiec: 'jagoda' },
  { x: 20, y: 10, rodzaj: 'surowiec', surowiec: 'jagoda' },
  { x: 6, y: 24, rodzaj: 'surowiec', surowiec: 'pokeball' },
  { x: 10, y: 26, rodzaj: 'kopalnia', surowiec: 'odlamek' },
  { x: 7, y: 21, rodzaj: 'kopalnia', surowiec: 'pokeball' },
  { x: 13, y: 5, rodzaj: 'skrzynia' },
  { x: 3, y: 19, rodzaj: 'skrzynia' },
  { x: 7, y: 5, rodzaj: 'skrzynia' },
  { x: 0, y: 24, rodzaj: 'potwor', sila: 'slaby' },
  { x: 14, y: 2, rodzaj: 'potwor', sila: 'slaby' },
  { x: 16, y: 12, rodzaj: 'potwor', sila: 'slaby' },
  { x: 14, y: 25, rodzaj: 'potwor', sila: 'slaby' },
  { x: 5, y: 26, rodzaj: 'artefakt' },
  { x: 2, y: 28, rodzaj: 'surowiec', surowiec: 'odlamek' },
  { x: 31, y: 4, rodzaj: 'surowiec', surowiec: 'odlamek' },
  { x: 35, y: 24, rodzaj: 'surowiec', surowiec: 'odlamek' },
  { x: 14, y: 34, rodzaj: 'surowiec', surowiec: 'kamien' },
  // Kamieniołom ewolucji — jedyne stałe źródło najrzadszego surowca.
  //
  // Bez niego kamień dawał wyłącznie budynek specjalny Zbocza (1 dziennie)
  // i pojedyncze znaleziska, a startujemy w Borze, którego budynek specjalny
  // daje jagody. Osiem sztuk potrzebnych na pełne drzewko budowy było więc
  // praktycznie nie do zdobycia i połowa budynków pozostawała poza zasięgiem.
  //
  // Stoi daleko na południu i pilnuje go silna straż: rzadki surowiec ma
  // JEDNĄ kopalnię i ma być za nią co zapłacić — tak jest w Heroes 3.
  { x: 11, y: 33, rodzaj: 'kopalnia', surowiec: 'kamien' },
  { x: 12, y: 32, rodzaj: 'potwor', sila: 'silny' },
  { x: 27, y: 13, rodzaj: 'kopalnia', surowiec: 'pokeball' },
  { x: 31, y: 26, rodzaj: 'kopalnia', surowiec: 'pokeball' },
  { x: 16, y: 28, rodzaj: 'skrzynia' },
  { x: 14, y: 29, rodzaj: 'skrzynia' },
  { x: 35, y: 11, rodzaj: 'skrzynia' },
  { x: 21, y: 29, rodzaj: 'potwor', sila: 'silny' },
  { x: 16, y: 32, rodzaj: 'potwor', sila: 'silny' },
  { x: 31, y: 13, rodzaj: 'potwor', sila: 'silny' },
  { x: 4, y: 32, rodzaj: 'potwor', sila: 'silny' },
  { x: 21, y: 6, rodzaj: 'potwor', sila: 'silny' },
  { x: 30, y: 35, rodzaj: 'artefakt' },
  { x: 5, y: 30, rodzaj: 'artefakt' },
  { x: 24, y: 19, rodzaj: 'potwor', sila: 'straznik' },
];
