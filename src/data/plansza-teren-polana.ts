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
  'TTT.....=..##......~~~~.............',
  'TT.TT...=..#.....,,~~~.....TT....TTT',
  'TTTTTT..=.........~~~,.....TT.=..TTT',
  'TTTTT...=........~~~,......TTT=...TT',
  'TTTT....=...#.#.~~~,.......#TT=.....',
  'TTTT....=TTT###~~~.........###=.....',
  'TTTT.....=..##~~~........T####=.....',
  'TTT.......=..~~~........TTT..=....TT',
  'TTT........=.~~~.......TTTTT=...TTTT',
  'TTTT.......=~~~......TTTTTT=....TTTT',
  'TTTTT......=~~~......TTTTTT=.,,,,,TT',
  'TTTTT......=~~...j...TTTTTT=.,,,,,TT',
  '#########TT.=~~.j....TTTT..=.,,,TTTT',
  '#########...=.~~..........==....TTTT',
  'TT#########.==============.=.....TTT',
  'TT#########.=.~~...........=....TTTT',
  'TTTjjj.jj.jjj=.~~jjj........=#...TTT',
  'TTT...j......=.~~j######.TT##=....TT',
  'TTT........==..~~j######.TT#T=...TTT',
  'TTT.......=....~~jjjjj###TTTTT=..TTT',
  'TTT......=......~~jjjj###TTTT==.TTTT',
  'TTTTTT..........~~jjjj###TTTTTT#.TTT',
  'TTTTTT...........~~jjj###TTTTT####TT',
  'TTTTTTT..........~~jjj###TTTTTT###TT',
  'TTTTTTTTT........~~~jj###TTTTT###TTT',
];

export const PUNKTY = {
  'start': { x: 13, y: 28 },
  'zamek gracza': { x: 9, y: 31 },
  'polnocna laka': { x: 9, y: 10 },
  'brod zachod': { x: 12, y: 26 },
  'brod wschod': { x: 17, y: 25 },
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
  { x: 9, y: 27, rodzaj: 'kopalnia', strefa: 'dom', surowiec: 'odlamek' },
  { x: 12, y: 33, rodzaj: 'kopalnia', strefa: 'dom', surowiec: 'jagoda' },
  { x: 7, y: 33, rodzaj: 'budynek', strefa: 'dom', budynek: 'wiatrak' },
  { x: 15, y: 33, rodzaj: 'budynek', strefa: 'dom', budynek: 'oboz-treningowy' },
  { x: 13, y: 30, rodzaj: 'budynek', strefa: 'dom', budynek: 'zrodlo' },
  { x: 5, y: 28, rodzaj: 'budynek', strefa: 'dom', budynek: 'ognisko' },
  { x: 11, y: 27, rodzaj: 'surowiec', strefa: 'dom', surowiec: 'odlamek' },
  { x: 14, y: 31, rodzaj: 'surowiec', strefa: 'dom', surowiec: 'pokeball' },
  { x: 6, y: 30, rodzaj: 'surowiec', strefa: 'dom', surowiec: 'jagoda' },
  { x: 10, y: 28, rodzaj: 'surowiec', strefa: 'dom', surowiec: 'kamien' },
  { x: 13, y: 26, rodzaj: 'skrzynia', strefa: 'dom' },
  { x: 9, y: 34, rodzaj: 'skrzynia', strefa: 'dom' },
  { x: 10, y: 33, rodzaj: 'potwor', strefa: 'dom', sila: 'slaby' },
  { x: 4, y: 31, rodzaj: 'artefakt', strefa: 'dom' },
  { x: 5, y: 31, rodzaj: 'potwor', strefa: 'dom', sila: 'slaby' },
  { x: 9, y: 21, rodzaj: 'budynek', strefa: 'dom', budynek: 'chatka' },
  { x: 6, y: 19, rodzaj: 'surowiec', strefa: 'dom', surowiec: 'pokeball' },
  { x: 10, y: 19, rodzaj: 'skrzynia', strefa: 'dom' },
  { x: 10, y: 12, rodzaj: 'kopalnia', strefa: 'dom', surowiec: 'pokeball' },
  { x: 9, y: 13, rodzaj: 'potwor', strefa: 'dom', sila: 'slaby' },
  { x: 6, y: 14, rodzaj: 'budynek', strefa: 'dom', budynek: 'ognisko' },
  { x: 19, y: 10, rodzaj: 'budynek', strefa: 'dom', budynek: 'drzewo-wiedzy' },
  { x: 13, y: 5, rodzaj: 'budynek', strefa: 'dom', budynek: 'zrodlo' },
  { x: 5, y: 10, rodzaj: 'budynek', strefa: 'dom', budynek: 'chatka' },
  { x: 17, y: 11, rodzaj: 'budynek', strefa: 'dom', budynek: 'gniazdo' },
  { x: 7, y: 14, rodzaj: 'budynek', strefa: 'dom', budynek: 'woz' },
  { x: 16, y: 14, rodzaj: 'surowiec', strefa: 'dom', surowiec: 'pokeball' },
  { x: 14, y: 12, rodzaj: 'surowiec', strefa: 'dom', surowiec: 'jagoda' },
  { x: 18, y: 11, rodzaj: 'surowiec', strefa: 'dom', surowiec: 'odlamek' },
  { x: 15, y: 9, rodzaj: 'surowiec', strefa: 'dom', surowiec: 'jagoda' },
  { x: 7, y: 11, rodzaj: 'surowiec', strefa: 'dom', surowiec: 'odlamek' },
  { x: 11, y: 17, rodzaj: 'skrzynia', strefa: 'dom' },
  { x: 10, y: 3, rodzaj: 'skrzynia', strefa: 'dom' },
  { x: 11, y: 8, rodzaj: 'artefakt', strefa: 'dom' },
  { x: 10, y: 9, rodzaj: 'potwor', strefa: 'dom', sila: 'slaby' },
  { x: 5, y: 9, rodzaj: 'potwor', strefa: 'dom', sila: 'slaby' },
  { x: 16, y: 25, rodzaj: 'potwor', strefa: 'pogranicze', sila: 'slaby' },
  { x: 21, y: 8, rodzaj: 'potwor', strefa: 'pogranicze', sila: 'sredni' },
  { x: 19, y: 30, rodzaj: 'kopalnia', strefa: 'pogranicze', surowiec: 'kamien' },
  { x: 17, y: 30, rodzaj: 'potwor', strefa: 'pogranicze', sila: 'slaby' },
  { x: 19, y: 32, rodzaj: 'skrzynia', strefa: 'pogranicze' },
  { x: 19, y: 33, rodzaj: 'budynek', strefa: 'pogranicze', budynek: 'ognisko' },
  { x: 20, y: 31, rodzaj: 'surowiec', strefa: 'pogranicze', surowiec: 'odlamek' },
  { x: 20, y: 35, rodzaj: 'surowiec', strefa: 'pogranicze', surowiec: 'kamien' },
  { x: 18, y: 23, rodzaj: 'budynek', strefa: 'pogranicze', budynek: 'wieza-obserwacyjna' },
  { x: 20, y: 23, rodzaj: 'budynek', strefa: 'pogranicze', budynek: 'gniazdo' },
  { x: 19, y: 24, rodzaj: 'surowiec', strefa: 'pogranicze', surowiec: 'jagoda' },
  { x: 22, y: 26, rodzaj: 'surowiec', strefa: 'pogranicze', surowiec: 'kamien' },
  { x: 18, y: 20, rodzaj: 'skrzynia', strefa: 'pogranicze' },
  { x: 19, y: 21, rodzaj: 'potwor', strefa: 'pogranicze', sila: 'slaby' },
  { x: 21, y: 19, rodzaj: 'budynek', strefa: 'pogranicze', budynek: 'woz' },
  { x: 20, y: 17, rodzaj: 'surowiec', strefa: 'pogranicze', surowiec: 'odlamek' },
  { x: 25, y: 27, rodzaj: 'surowiec', strefa: 'pogranicze', surowiec: 'jagoda' },
  { x: 33, y: 4, rodzaj: 'surowiec', strefa: 'pogranicze', surowiec: 'odlamek' },
  { x: 32, y: 28, rodzaj: 'surowiec', strefa: 'pogranicze', surowiec: 'kamien' },
  { x: 28, y: 26, rodzaj: 'surowiec', strefa: 'pogranicze', surowiec: 'kamien' },
  { x: 21, y: 16, rodzaj: 'kopalnia', strefa: 'pogranicze', surowiec: 'odlamek' },
  { x: 32, y: 29, rodzaj: 'skrzynia', strefa: 'pogranicze' },
  { x: 34, y: 4, rodzaj: 'skrzynia', strefa: 'pogranicze' },
  { x: 26, y: 26, rodzaj: 'artefakt', strefa: 'pogranicze' },
  { x: 25, y: 26, rodzaj: 'potwor', strefa: 'pogranicze', sila: 'sredni' },
  { x: 30, y: 27, rodzaj: 'potwor', strefa: 'pogranicze', sila: 'slaby' },
  { x: 30, y: 23, rodzaj: 'budynek', strefa: 'pogranicze', budynek: 'wieza-obserwacyjna' },
  { x: 26, y: 23, rodzaj: 'budynek', strefa: 'pogranicze', budynek: 'gniazdo' },
  { x: 30, y: 29, rodzaj: 'budynek', strefa: 'pogranicze', budynek: 'chatka' },
  { x: 17, y: 17, rodzaj: 'budynek', strefa: 'pogranicze', budynek: 'woz' },
  { x: 18, y: 17, rodzaj: 'budynek', strefa: 'pogranicze', budynek: 'arena' },
  { x: 30, y: 4, rodzaj: 'budynek', strefa: 'pogranicze', budynek: 'ognisko' },
  { x: 28, y: 25, rodzaj: 'budynek', strefa: 'pogranicze', budynek: 'ranczo' },
  { x: 35, y: 3, rodzaj: 'skrzynia', strefa: 'pogranicze' },
  { x: 29, y: 1, rodzaj: 'skrzynia', strefa: 'pogranicze' },
  { x: 34, y: 5, rodzaj: 'skrzynia', strefa: 'wroga' },
  { x: 32, y: 3, rodzaj: 'potwor', strefa: 'pogranicze', sila: 'sredni' },
  { x: 24, y: 12, rodzaj: 'kopalnia', strefa: 'wroga', surowiec: 'pokeball' },
  { x: 25, y: 13, rodzaj: 'potwor', strefa: 'wroga', sila: 'sredni' },
  { x: 32, y: 9, rodzaj: 'skrzynia', strefa: 'wroga' },
  { x: 23, y: 16, rodzaj: 'skrzynia', strefa: 'wroga' },
  { x: 31, y: 8, rodzaj: 'potwor', strefa: 'wroga', sila: 'sredni' },
  { x: 23, y: 17, rodzaj: 'potwor', strefa: 'wroga', sila: 'sredni' },
  { x: 26, y: 6, rodzaj: 'surowiec', strefa: 'wroga', surowiec: 'kamien' },
  { x: 27, y: 9, rodzaj: 'surowiec', strefa: 'wroga', surowiec: 'kamien' },
  { x: 26, y: 9, rodzaj: 'budynek', strefa: 'wroga', budynek: 'kamienna-wieza' },
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
  "zestaw": "polana",
  "znajdzki": 0.5,
  "obrysObiektow": 0.35,
  "skalaBudowli": 0.8,
  "kepySkal": {
    "0,23": 1,
    "3,23": 3,
    "6,23": -1,
    "2,25": 4,
    "5,25": 2,
    "8,25": -1,
    "18,28": 3,
    "21,28": 1,
    "22,30": -2,
    "22,32": 4,
    "22,34": -1
  },
  "odkryte": [
    {
      "x": 4,
      "y": 19,
      "promien": 3
    },
    {
      "x": 23,
      "y": 20,
      "promien": 4
    },
    {
      "x": 24,
      "y": 34,
      "promien": 2
    },
    {
      "x": 3,
      "y": 35,
      "promien": 2
    }
  ]
};
