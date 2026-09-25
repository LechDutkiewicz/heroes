// PLIK GENEROWANY — nie poprawiaj ręcznie.
// Źródło: tools/mapy/polana.py (szkic i rozstawienie), silnik: tools/generuj_mape.py.
//
// Plansza 36 × 36 („Polana”, rozmiar S) — misja 1, samouczek. Rzeka z dwoma
// brodami dzieli dolinę domu (zamek gracza na południowym zachodzie) od
// wschodniej łąki ze starym fortem przeciwnika.
// Znaki: . trawa, = ścieżka, , piasek, j ziemia jałowa, s śnieg, b bagno,
// T las, # skały, ~ woda.

export const TEREN = [
  'TTTTTTTTTT###TTTTT~~~~TTTT####TTTTTT',
  'TTTTTT~TT###TTTTTTT~~~TTTTT##.TTTTTT',
  'TTTTT~~~.#.#TTTTTTTT~~~~TTT.##.TTTTT',
  'TTTTT~~~~...,,TTTTTT~~~..T.####.....',
  'TTTTT~~~....,,...TTT~~~.....##......',
  'TTTT~~~~~~~.,,,...T~~~~.....##...#.#',
  'TTTT~~~~~..........T~~~,........####',
  'TT~~~~.~~...TT......,,,,........####',
  'TTT.~.~..~..TT......,,,,,.......#.##',
  'TTT....~...#TTT.....~~~,............',
  'TT.......=.T#T......~~~.............',
  'TTT.......=##......~~~~.............',
  'TT.TT.....=#.....,,~~~.....TT....TTT',
  'TTTTTT.....=.......~~~.....TT.=..TTT',
  'TTTTT.......===..,,~~~.....TTT=...TT',
  'TTTT........#.#=..~~~......#TT=.....',
  'TTTT.....TTT###=..~~~......###=.....',
  'TTTT..,..TTT###=..~~~....T####=.....',
  'TTT...,.TTT...=..~~~....TTT..=....TT',
  'TTT....,,T...=...~~~...TTTTT=...TTTT',
  'TTTT...,,,..=....~~~..TTTTT=....TTTT',
  'TTTTT..,.T..=...~~~...TTTTT=.,,,,,TT',
  'TTTTT...TTT.=...~~......TTT=.,,,,,TT',
  'TT#########.=...~~......T===.,,,TTTT',
  'TT#########.=...~~.....==..=....TTTT',
  'T#########...=..~~===.=....=.....TTT',
  'T#########...=.===,..=.....=....TTTT',
  'TTT..........==,,,..........=#...TTT',
  'TTT..........=.,~~.###...TT##=....TT',
  'TTT........==...~~.###...TT#T=...TTT',
  'TTT.......=....,~~......TTTTTT=..TTT',
  'TTT......=.......~~.###.TTTTT==.TTTT',
  'TTTTT.T..T.......~~.###.TTTTTTT#.TTT',
  'TTTTTTTTTTTTTTT#.~~####TTTTTTT####TT',
  'TTTTTTTTTTTTTTT##.~####TTTTTTTT###TT',
  'TTTTTTTTTTTTTTT##~~~TTTTTTTTTT###TTT',
];

export const PUNKTY = {
  'start': { x: 13, y: 28 },
  'zamek gracza': { x: 9, y: 31 },
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
  { x: 14, y: 30, rodzaj: 'kopalnia', strefa: 'dom', surowiec: 'jagoda' },
  { x: 10, y: 25, rodzaj: 'kopalnia', strefa: 'dom', surowiec: 'odlamek' },
  { x: 14, y: 32, rodzaj: 'budynek', strefa: 'dom', budynek: 'wiatrak' },
  { x: 12, y: 25, rodzaj: 'budynek', strefa: 'dom', budynek: 'oboz-treningowy' },
  { x: 12, y: 31, rodzaj: 'surowiec', strefa: 'dom', surowiec: 'odlamek' },
  { x: 15, y: 32, rodzaj: 'surowiec', strefa: 'dom', surowiec: 'jagoda' },
  { x: 13, y: 32, rodzaj: 'surowiec', strefa: 'dom', surowiec: 'pokeball' },
  { x: 12, y: 30, rodzaj: 'skrzynia', strefa: 'dom' },
  { x: 13, y: 24, rodzaj: 'skrzynia', strefa: 'dom' },
  { x: 14, y: 25, rodzaj: 'potwor', strefa: 'dom', sila: 'slaby' },
  { x: 8, y: 8, rodzaj: 'kopalnia', strefa: 'dom', surowiec: 'pokeball' },
  { x: 9, y: 9, rodzaj: 'potwor', strefa: 'dom', sila: 'slaby' },
  { x: 11, y: 3, rodzaj: 'budynek', strefa: 'dom', budynek: 'ognisko' },
  { x: 6, y: 13, rodzaj: 'budynek', strefa: 'dom', budynek: 'drzewo-wiedzy' },
  { x: 18, y: 10, rodzaj: 'budynek', strefa: 'dom', budynek: 'zrodlo' },
  { x: 6, y: 20, rodzaj: 'budynek', strefa: 'dom', budynek: 'chatka' },
  { x: 15, y: 19, rodzaj: 'budynek', strefa: 'dom', budynek: 'gniazdo' },
  { x: 8, y: 27, rodzaj: 'budynek', strefa: 'dom', budynek: 'woz' },
  { x: 15, y: 10, rodzaj: 'surowiec', strefa: 'dom', surowiec: 'odlamek' },
  { x: 12, y: 19, rodzaj: 'surowiec', strefa: 'dom', surowiec: 'jagoda' },
  { x: 14, y: 7, rodzaj: 'surowiec', strefa: 'dom', surowiec: 'jagoda' },
  { x: 16, y: 17, rodzaj: 'surowiec', strefa: 'dom', surowiec: 'odlamek' },
  { x: 14, y: 19, rodzaj: 'surowiec', strefa: 'dom', surowiec: 'odlamek' },
  { x: 18, y: 12, rodzaj: 'skrzynia', strefa: 'dom' },
  { x: 6, y: 10, rodzaj: 'skrzynia', strefa: 'dom' },
  { x: 4, y: 11, rodzaj: 'artefakt', strefa: 'dom' },
  { x: 5, y: 12, rodzaj: 'potwor', strefa: 'dom', sila: 'slaby' },
  { x: 11, y: 15, rodzaj: 'potwor', strefa: 'dom', sila: 'slaby' },
  { x: 17, y: 26, rodzaj: 'potwor', strefa: 'pogranicze', sila: 'slaby' },
  { x: 21, y: 8, rodzaj: 'potwor', strefa: 'pogranicze', sila: 'sredni' },
  { x: 22, y: 27, rodzaj: 'surowiec', strefa: 'pogranicze', surowiec: 'pokeball' },
  { x: 32, y: 3, rodzaj: 'surowiec', strefa: 'pogranicze', surowiec: 'jagoda' },
  { x: 31, y: 4, rodzaj: 'surowiec', strefa: 'pogranicze', surowiec: 'kamien' },
  { x: 29, y: 26, rodzaj: 'surowiec', strefa: 'pogranicze', surowiec: 'odlamek' },
  { x: 18, y: 24, rodzaj: 'surowiec', strefa: 'pogranicze', surowiec: 'odlamek' },
  { x: 31, y: 26, rodzaj: 'surowiec', strefa: 'pogranicze', surowiec: 'pokeball' },
  { x: 26, y: 25, rodzaj: 'surowiec', strefa: 'pogranicze', surowiec: 'odlamek' },
  { x: 24, y: 4, rodzaj: 'kopalnia', strefa: 'pogranicze', surowiec: 'kamien' },
  { x: 23, y: 5, rodzaj: 'potwor', strefa: 'wroga', sila: 'slaby' },
  { x: 31, y: 30, rodzaj: 'kopalnia', strefa: 'pogranicze', surowiec: 'odlamek' },
  { x: 23, y: 29, rodzaj: 'skrzynia', strefa: 'pogranicze' },
  { x: 20, y: 18, rodzaj: 'skrzynia', strefa: 'pogranicze' },
  { x: 28, y: 22, rodzaj: 'skrzynia', strefa: 'pogranicze' },
  { x: 26, y: 4, rodzaj: 'artefakt', strefa: 'pogranicze' },
  { x: 25, y: 4, rodzaj: 'potwor', strefa: 'pogranicze', sila: 'sredni' },
  { x: 24, y: 26, rodzaj: 'potwor', strefa: 'pogranicze', sila: 'slaby' },
  { x: 28, y: 25, rodzaj: 'budynek', strefa: 'pogranicze', budynek: 'wieza-obserwacyjna' },
  { x: 30, y: 23, rodzaj: 'budynek', strefa: 'pogranicze', budynek: 'gniazdo' },
  { x: 28, y: 26, rodzaj: 'budynek', strefa: 'pogranicze', budynek: 'chatka' },
  { x: 22, y: 24, rodzaj: 'budynek', strefa: 'pogranicze', budynek: 'woz' },
  { x: 22, y: 22, rodzaj: 'budynek', strefa: 'pogranicze', budynek: 'arena' },
  { x: 23, y: 25, rodzaj: 'budynek', strefa: 'pogranicze', budynek: 'ognisko' },
  { x: 30, y: 22, rodzaj: 'budynek', strefa: 'pogranicze', budynek: 'ranczo' },
  { x: 25, y: 12, rodzaj: 'kopalnia', strefa: 'wroga', surowiec: 'pokeball' },
  { x: 24, y: 13, rodzaj: 'potwor', strefa: 'wroga', sila: 'sredni' },
  { x: 25, y: 15, rodzaj: 'skrzynia', strefa: 'wroga' },
  { x: 25, y: 9, rodzaj: 'skrzynia', strefa: 'wroga' },
  { x: 25, y: 16, rodzaj: 'potwor', strefa: 'wroga', sila: 'sredni' },
  { x: 25, y: 13, rodzaj: 'surowiec', strefa: 'wroga', surowiec: 'kamien' },
  { x: 23, y: 15, rodzaj: 'surowiec', strefa: 'wroga', surowiec: 'pokeball' },
  { x: 29, y: 19, rodzaj: 'budynek', strefa: 'wroga', budynek: 'kamienna-wieza' },
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
  },
  "zestaw": "polana"
};
