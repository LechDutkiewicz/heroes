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
  'TTTTTT~T######TTTTT~~~TTTTT####TTTTT',
  'TTTTTT~~####,,TTTTT~~~~~TT####TTTTTT',
  'TTTTT~~~~##,,.,TTTTT~~~....####TT...',
  'TTTT~~~~.~..,,,.TTTT~~~....####.....',
  'TTT~~~~~~...,,,,...~~~~.....#.......',
  'TTTT~~~~~~..TT......~~~.......TTT.##',
  'TTT~~~~.~...TT......,,,,.....TTTT#.#',
  'TTT~~~~~....TT......,,,,,....TTT#.##',
  'TTT...~~...#TTT.....~~~T............',
  'TT....~..=.##T......~~~T............',
  '#T##......=#......,~~~~.............',
  '#T#T......=#......,~~~...........TTT',
  '##TTTT....#=#....,,~~~........=..TTT',
  '##TTTT..TT.#==...,,~~~.........=..TT',
  'TTTTTTTTTTTT##=...~~~..........=....',
  'TTT.....TTTT###=..~~~......####=....',
  'TTT....,.TT.###=..~~~.....#.#.=.....',
  'TTT....,T....#=..~~~....TTT..=....TT',
  'TTT...,,TT...=...~~~...TTTT.=....TTT',
  'TTT...,,TT..=....~~~~..TTTT=,.,,,TTT',
  'TTTT...,TTT.=...~~~~..TTTTT=.,,,,TTT',
  'TTTT.....TTT=..~~~~....TTTT=..,,TTTT',
  'TTTT......TT=...~~~.....TT.=..,,TTTT',
  'TTT.........=..T~~~.......=.=...TTTT',
  'TTT........==..T~~~~.....=...=....TT',
  'TTT.......=.=..,,,,..====....=....TT',
  'TTT......=.,.========.........=....T',
  'TTT......=..,,,~~~~......#.##.=...TT',
  'TTTT....==......~~~......#T###=..TTT',
  'TTT....=...##,..~~~.....TTTT.=..TTTT',
  'TTTT..=..###.....~~~...TTTTTT=...TTT',
  'TTTT.....###...#.~~~....TTTTTT...TTT',
  'TTTTTTTTT.TTT..#~~~~TT..TTTTT##.#TTT',
  'TTTTTTTTTTTTTTT.#T~~~TTTTTTTT###.TTT',
  'TTTTTTTTTTTTTT#.##~~~TTTTTTTTT####TT',
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
  { x: 12, y: 27, rodzaj: 'kopalnia', strefa: 'dom', surowiec: 'jagoda' },
  { x: 8, y: 26, rodzaj: 'kopalnia', strefa: 'dom', surowiec: 'odlamek' },
  { x: 12, y: 31, rodzaj: 'budynek', strefa: 'dom', budynek: 'wiatrak' },
  { x: 10, y: 27, rodzaj: 'budynek', strefa: 'dom', budynek: 'oboz-treningowy' },
  { x: 13, y: 30, rodzaj: 'surowiec', strefa: 'dom', surowiec: 'odlamek' },
  { x: 13, y: 33, rodzaj: 'surowiec', strefa: 'dom', surowiec: 'jagoda' },
  { x: 14, y: 32, rodzaj: 'surowiec', strefa: 'dom', surowiec: 'pokeball' },
  { x: 10, y: 30, rodzaj: 'skrzynia', strefa: 'dom' },
  { x: 5, y: 26, rodzaj: 'skrzynia', strefa: 'dom' },
  { x: 6, y: 26, rodzaj: 'potwor', strefa: 'dom', sila: 'slaby' },
  { x: 16, y: 9, rodzaj: 'kopalnia', strefa: 'dom', surowiec: 'pokeball' },
  { x: 16, y: 10, rodzaj: 'potwor', strefa: 'dom', sila: 'slaby' },
  { x: 11, y: 3, rodzaj: 'budynek', strefa: 'dom', budynek: 'ognisko' },
  { x: 15, y: 14, rodzaj: 'budynek', strefa: 'dom', budynek: 'drzewo-wiedzy' },
  { x: 16, y: 11, rodzaj: 'budynek', strefa: 'dom', budynek: 'zrodlo' },
  { x: 13, y: 28, rodzaj: 'budynek', strefa: 'dom', budynek: 'chatka' },
  { x: 14, y: 22, rodzaj: 'budynek', strefa: 'dom', budynek: 'gniazdo' },
  { x: 13, y: 11, rodzaj: 'budynek', strefa: 'dom', budynek: 'woz' },
  { x: 5, y: 19, rodzaj: 'surowiec', strefa: 'dom', surowiec: 'pokeball' },
  { x: 13, y: 2, rodzaj: 'surowiec', strefa: 'dom', surowiec: 'jagoda' },
  { x: 18, y: 10, rodzaj: 'surowiec', strefa: 'dom', surowiec: 'pokeball' },
  { x: 13, y: 12, rodzaj: 'surowiec', strefa: 'dom', surowiec: 'pokeball' },
  { x: 7, y: 18, rodzaj: 'surowiec', strefa: 'dom', surowiec: 'odlamek' },
  { x: 6, y: 11, rodzaj: 'skrzynia', strefa: 'dom' },
  { x: 6, y: 12, rodzaj: 'skrzynia', strefa: 'dom' },
  { x: 11, y: 18, rodzaj: 'artefakt', strefa: 'dom' },
  { x: 10, y: 19, rodzaj: 'potwor', strefa: 'dom', sila: 'slaby' },
  { x: 4, y: 19, rodzaj: 'potwor', strefa: 'dom', sila: 'slaby' },
  { x: 17, y: 26, rodzaj: 'potwor', strefa: 'pogranicze', sila: 'slaby' },
  { x: 21, y: 8, rodzaj: 'potwor', strefa: 'pogranicze', sila: 'sredni' },
  { x: 32, y: 29, rodzaj: 'surowiec', strefa: 'pogranicze', surowiec: 'pokeball' },
  { x: 32, y: 32, rodzaj: 'surowiec', strefa: 'pogranicze', surowiec: 'pokeball' },
  { x: 34, y: 3, rodzaj: 'surowiec', strefa: 'pogranicze', surowiec: 'jagoda' },
  { x: 35, y: 4, rodzaj: 'surowiec', strefa: 'pogranicze', surowiec: 'kamien' },
  { x: 31, y: 25, rodzaj: 'surowiec', strefa: 'pogranicze', surowiec: 'odlamek' },
  { x: 29, y: 23, rodzaj: 'surowiec', strefa: 'pogranicze', surowiec: 'odlamek' },
  { x: 33, y: 28, rodzaj: 'surowiec', strefa: 'pogranicze', surowiec: 'pokeball' },
  { x: 27, y: 25, rodzaj: 'kopalnia', strefa: 'pogranicze', surowiec: 'kamien' },
  { x: 26, y: 26, rodzaj: 'potwor', strefa: 'pogranicze', sila: 'slaby' },
  { x: 21, y: 19, rodzaj: 'kopalnia', strefa: 'pogranicze', surowiec: 'odlamek' },
  { x: 24, y: 27, rodzaj: 'skrzynia', strefa: 'pogranicze' },
  { x: 30, y: 32, rodzaj: 'skrzynia', strefa: 'pogranicze' },
  { x: 33, y: 26, rodzaj: 'skrzynia', strefa: 'pogranicze' },
  { x: 20, y: 29, rodzaj: 'artefakt', strefa: 'pogranicze' },
  { x: 19, y: 28, rodzaj: 'potwor', strefa: 'pogranicze', sila: 'sredni' },
  { x: 21, y: 28, rodzaj: 'potwor', strefa: 'pogranicze', sila: 'slaby' },
  { x: 19, y: 29, rodzaj: 'budynek', strefa: 'pogranicze', budynek: 'wieza-obserwacyjna' },
  { x: 22, y: 29, rodzaj: 'budynek', strefa: 'pogranicze', budynek: 'gniazdo' },
  { x: 26, y: 4, rodzaj: 'budynek', strefa: 'pogranicze', budynek: 'chatka' },
  { x: 24, y: 4, rodzaj: 'budynek', strefa: 'pogranicze', budynek: 'woz' },
  { x: 20, y: 22, rodzaj: 'budynek', strefa: 'pogranicze', budynek: 'arena' },
  { x: 20, y: 31, rodzaj: 'budynek', strefa: 'pogranicze', budynek: 'ognisko' },
  { x: 23, y: 23, rodzaj: 'budynek', strefa: 'pogranicze', budynek: 'ranczo' },
  { x: 30, y: 5, rodzaj: 'kopalnia', strefa: 'wroga', surowiec: 'pokeball' },
  { x: 29, y: 6, rodzaj: 'potwor', strefa: 'wroga', sila: 'sredni' },
  { x: 32, y: 20, rodzaj: 'skrzynia', strefa: 'wroga' },
  { x: 22, y: 14, rodzaj: 'skrzynia', strefa: 'wroga' },
  { x: 31, y: 20, rodzaj: 'potwor', strefa: 'wroga', sila: 'sredni' },
  { x: 21, y: 15, rodzaj: 'potwor', strefa: 'pogranicze', sila: 'sredni' },
  { x: 31, y: 21, rodzaj: 'surowiec', strefa: 'wroga', surowiec: 'kamien' },
  { x: 28, y: 21, rodzaj: 'surowiec', strefa: 'wroga', surowiec: 'kamien' },
  { x: 23, y: 17, rodzaj: 'budynek', strefa: 'wroga', budynek: 'kamienna-wieza' },
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
