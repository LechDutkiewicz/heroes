// PLIK GENEROWANY — nie poprawiaj ręcznie.
// Źródło: tools/mapy/polana.py (szkic i rozstawienie), silnik: tools/generuj_mape.py.
//
// Plansza 36 × 36 („Polana”, rozmiar S) — misja 1, samouczek. Rzeka z dwoma
// brodami dzieli dolinę domu (zamek gracza na południowym zachodzie) od
// wschodniej łąki ze starym fortem przeciwnika.
// Znaki: . trawa, = ścieżka, , piasek, j ziemia jałowa, s śnieg, b bagno,
// T las, # skały, ~ woda.

export const TEREN = [
  'TTTTTTTT####TTTTTT~~~~TTTTT####TTTTT',
  'TTTTTTTTTT###TTTTTT~~~TTTTT###TTTTTT',
  'TT~TTT~~T#.#.TT..TTT~~~~T.T##TT.TTTT',
  'TTT~T~~~~#~..TTT.TTT~~~T.T..#..T..TT',
  'TTT~~~~T~~....T..T.T~~~.......T...TT',
  'TTT~~~~~~....T....T~~~~........T....',
  'TTT~~~~~....T.TT....~~~........T..##',
  'TT~~~~~~~...TT......,,,.......TTTT##',
  'TTT~~~~.~....T......,,,.......TT###.',
  'TTT~..~~...T.T......~~~.......TTT...',
  'TTT~~....=..TT.T....~~~TT.....T.....',
  'TTTT.....=.........~~~~TT.........T.',
  '###TT....=.........~~~..T...TT...T.T',
  '#TTTTT...=.........~~~.....TTT=.T.TT',
  '#T#.TT...=.........~~~.......T=...TT',
  'TT.T.T...=T#..#...~~~.......T=T...TT',
  'TTT......=.T.#.#..~~~.......=...T.T.',
  'TTT......=#T.##...~~~......=.....T..',
  'TTT.......=T#....~~~.....T.=.....T.T',
  'TTTT.......=.....~~~...T.TT=......TT',
  'TTTT.......=.....~~~~..T.TT=.....TTT',
  'TTTTTT.....T=...~~~~...TTTT=..,,T.TT',
  'TTTTT....TTT=..~~~~......T.=..,,,TTT',
  'TTTTTT....TTT=..~~~.....T.T=..,,,TTT',
  'TTT.........=..T~~~........=..,..TTT',
  'TTT.........=..T~~~~......==...T..TT',
  'TTTT..T....==...,,,..=====.=...T.TTT',
  'TTT...T..T.=.========......=.#....TT',
  'TTT...TTT.=....~~~~.....TT##=#....TT',
  'TTT...T.==......~~~....TT#TTT=...TTT',
  'TT.....=........~~~...TT.TTTT=...TTT',
  'TT.T..=.....T....~~~....TTTTT=..TTTT',
  'TTT.TT...T.TTT..#~~~...TTTTTTT.#TTTT',
  'TTT..TTT.TTTTTTT~~~~T.TTTTTTTTT##TTT',
  'TTTTTTTTTTTTTT###T~~~TTTTTTTT####TTT',
  'TTTTTTTTTTTTTTT###~~~TTTTTTTTT####TT',
];

export const PUNKTY = {
  'start': { x: 9, y: 29 },
  'zamek gracza': { x: 6, y: 31 },
  'rozstaje': { x: 12, y: 24 },
  'polnocna laka': { x: 9, y: 10 },
  'brod zachod': { x: 13, y: 27 },
  'brod wschod': { x: 21, y: 26 },
  'wschodnia laka': { x: 27, y: 23 },
  'zamek wroga': { x: 30, y: 13 },
  'poludniowy wschod': { x: 29, y: 31 },
};

/**
 * Rozstawienie obiektów. `strefa` mówi, w którym pasie leży pole —
 * `src/data/plansza.ts` bierze z tego klasę artefaktu i siłę nagrody, bo na tej
 * mapie o wartości znaleziska decyduje pas, a nie odległość od startu.
 */
export const ROZSTAWIENIE: Array<{
  x: number;
  y: number;
  rodzaj: string;
  strefa: 'dom' | 'pogranicze' | 'wroga';
  surowiec?: string;
  sila?: string;
  nazwa?: string;
  budynek?: string;
  klucz?: string;
}> = [
  { x: 10, y: 26, rodzaj: 'surowiec', strefa: 'dom', surowiec: 'jagoda' },
  { x: 9, y: 23, rodzaj: 'surowiec', strefa: 'dom', surowiec: 'pokeball' },
  { x: 7, y: 25, rodzaj: 'surowiec', strefa: 'dom', surowiec: 'odlamek' },
  { x: 9, y: 25, rodzaj: 'skrzynia', strefa: 'dom' },
  { x: 16, y: 20, rodzaj: 'kopalnia', strefa: 'dom', surowiec: 'jagoda' },
  { x: 6, y: 23, rodzaj: 'kopalnia', strefa: 'dom', surowiec: 'odlamek' },
  { x: 7, y: 12, rodzaj: 'kopalnia', strefa: 'dom', surowiec: 'pokeball' },
  { x: 6, y: 13, rodzaj: 'potwor', strefa: 'dom', sila: 'slaby' },
  { x: 13, y: 13, rodzaj: 'budynek', strefa: 'dom', budynek: 'wiatrak' },
  { x: 14, y: 14, rodzaj: 'budynek', strefa: 'dom', budynek: 'oboz-treningowy' },
  { x: 5, y: 12, rodzaj: 'budynek', strefa: 'dom', budynek: 'ognisko' },
  { x: 7, y: 24, rodzaj: 'budynek', strefa: 'dom', budynek: 'drzewo-wiedzy' },
  { x: 14, y: 23, rodzaj: 'budynek', strefa: 'dom', budynek: 'zrodlo' },
  { x: 16, y: 11, rodzaj: 'surowiec', strefa: 'dom', surowiec: 'odlamek' },
  { x: 12, y: 3, rodzaj: 'surowiec', strefa: 'dom', surowiec: 'jagoda' },
  { x: 18, y: 10, rodzaj: 'surowiec', strefa: 'dom', surowiec: 'pokeball' },
  { x: 18, y: 12, rodzaj: 'skrzynia', strefa: 'dom' },
  { x: 6, y: 17, rodzaj: 'artefakt', strefa: 'dom' },
  { x: 6, y: 18, rodzaj: 'potwor', strefa: 'dom', sila: 'slaby' },
  { x: 12, y: 11, rodzaj: 'potwor', strefa: 'dom', sila: 'slaby' },
  { x: 15, y: 2, rodzaj: 'skrzynia', strefa: 'dom' },
  { x: 15, y: 5, rodzaj: 'potwor', strefa: 'dom', sila: 'slaby' },
  { x: 17, y: 26, rodzaj: 'potwor', strefa: 'pogranicze', sila: 'slaby' },
  { x: 21, y: 8, rodzaj: 'potwor', strefa: 'pogranicze', sila: 'sredni' },
  { x: 20, y: 31, rodzaj: 'surowiec', strefa: 'pogranicze', surowiec: 'odlamek' },
  { x: 30, y: 28, rodzaj: 'surowiec', strefa: 'pogranicze', surowiec: 'pokeball' },
  { x: 32, y: 29, rodzaj: 'surowiec', strefa: 'pogranicze', surowiec: 'pokeball' },
  { x: 30, y: 24, rodzaj: 'surowiec', strefa: 'pogranicze', surowiec: 'jagoda' },
  { x: 27, y: 4, rodzaj: 'kopalnia', strefa: 'pogranicze', surowiec: 'kamien' },
  { x: 26, y: 5, rodzaj: 'potwor', strefa: 'wroga', sila: 'slaby' },
  { x: 30, y: 31, rodzaj: 'kopalnia', strefa: 'pogranicze', surowiec: 'odlamek' },
  { x: 23, y: 23, rodzaj: 'skrzynia', strefa: 'pogranicze' },
  { x: 25, y: 25, rodzaj: 'skrzynia', strefa: 'pogranicze' },
  { x: 20, y: 21, rodzaj: 'artefakt', strefa: 'pogranicze' },
  { x: 20, y: 22, rodzaj: 'potwor', strefa: 'pogranicze', sila: 'sredni' },
  { x: 23, y: 22, rodzaj: 'budynek', strefa: 'pogranicze', budynek: 'wieza-obserwacyjna' },
  { x: 19, y: 30, rodzaj: 'budynek', strefa: 'pogranicze', budynek: 'gniazdo' },
  { x: 32, y: 25, rodzaj: 'budynek', strefa: 'pogranicze', budynek: 'chatka' },
  { x: 24, y: 25, rodzaj: 'budynek', strefa: 'pogranicze', budynek: 'woz' },
  { x: 33, y: 4, rodzaj: 'skrzynia', strefa: 'pogranicze' },
  { x: 33, y: 6, rodzaj: 'surowiec', strefa: 'wroga', surowiec: 'kamien' },
  { x: 32, y: 3, rodzaj: 'skrzynia', strefa: 'pogranicze' },
  { x: 30, y: 3, rodzaj: 'potwor', strefa: 'pogranicze', sila: 'sredni' },
  { x: 23, y: 17, rodzaj: 'kopalnia', strefa: 'wroga', surowiec: 'pokeball' },
  { x: 22, y: 18, rodzaj: 'potwor', strefa: 'wroga', sila: 'sredni' },
  { x: 32, y: 18, rodzaj: 'skrzynia', strefa: 'wroga' },
  { x: 25, y: 8, rodzaj: 'skrzynia', strefa: 'wroga' },
  { x: 31, y: 17, rodzaj: 'potwor', strefa: 'wroga', sila: 'sredni' },
  { x: 24, y: 7, rodzaj: 'potwor', strefa: 'wroga', sila: 'sredni' },
  { x: 24, y: 14, rodzaj: 'surowiec', strefa: 'wroga', surowiec: 'kamien' },
  { x: 34, y: 9, rodzaj: 'surowiec', strefa: 'wroga', surowiec: 'kamien' },
  { x: 26, y: 12, rodzaj: 'budynek', strefa: 'wroga', budynek: 'kamienna-wieza' },
];

/** Ustawienia misji na tej planszy — patrz `UstawieniaPlanszy` w `src/data/mapy.ts`. */
export const USTAWIENIA = {
  "wrog": "obronca",
  "nazwyZamkowWroga": [
    "Stary Fort"
  ],
  "budynkiWroga": [
    "ratusz1",
    "siedlisko1"
  ],
  "dostepneWroga": [
    0,
    0,
    0,
    0,
    0,
    0
  ],
  "garnizonWroga": {
    "poziomy": [
      0,
      1
    ],
    "tygodnie": 1
  },
  "wrogSkarbiec": {
    "pokeball": 0,
    "jagoda": 0,
    "kamien": 0,
    "odlamek": 0
  }
};
