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
  'TTTTTTTT.=..##~~~.....TTTT####=.....',
  'TTTTTTTTT.=..~~~TTT...TTTTT..=....TT',
  'TTTTTTTTT..=.~~~TTT...TTTTTT=...TTTT',
  'TTTTTTTTT..=~~~.TTT...TTTTT=....TTTT',
  'TTTTT......=~~~.TTT...TTTTT=.,,,,,TT',
  'TTTTT......=~~...j....TTTTT=.,,,,,TT',
  '#########TT.=~~.j....TTTT..=.,,,TTTT',
  '#########...=.~~..........==....TTTT',
  'TT#########.==============.=.....TTT',
  'TT#########.=.~~...........=....TTTT',
  'TTTjjj.jj.jjj=.~~jjj........=#...TTT',
  'TTT...j......=.~~j######.TT##=....TT',
  'TTT.........=..~~j######.TT#T=...TTT',
  'TTT........=...~~jjjjj###TTTTT=..TTT',
  'TTT......=.=....~~jjjj###TTTT==.TTTT',
  'TTTTTT....=.....~~jjjj###TTTTTT#.TTT',
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
  { x: 4, y: 29, rodzaj: 'budynek', strefa: 'dom', budynek: 'zrodlo' },
  { x: 5, y: 28, rodzaj: 'budynek', strefa: 'dom', budynek: 'ognisko' },
  { x: 11, y: 27, rodzaj: 'surowiec', strefa: 'dom', surowiec: 'odlamek' },
  { x: 14, y: 30, rodzaj: 'surowiec', strefa: 'dom', surowiec: 'pokeball' },
  { x: 6, y: 30, rodzaj: 'surowiec', strefa: 'dom', surowiec: 'jagoda' },
  { x: 11, y: 29, rodzaj: 'surowiec', strefa: 'dom', surowiec: 'kamien' },
  { x: 13, y: 26, rodzaj: 'skrzynia', strefa: 'dom' },
  { x: 9, y: 34, rodzaj: 'skrzynia', strefa: 'dom' },
  { x: 10, y: 33, rodzaj: 'potwor', strefa: 'dom', sila: 'slaby' },
  { x: 4, y: 31, rodzaj: 'artefakt', strefa: 'dom' },
  { x: 5, y: 31, rodzaj: 'potwor', strefa: 'dom', sila: 'slaby' },
  { x: 9, y: 21, rodzaj: 'budynek', strefa: 'dom', budynek: 'chatka' },
  { x: 9, y: 19, rodzaj: 'surowiec', strefa: 'dom', surowiec: 'pokeball' },
  { x: 10, y: 19, rodzaj: 'skrzynia', strefa: 'dom' },
  { x: 10, y: 12, rodzaj: 'kopalnia', strefa: 'dom', surowiec: 'pokeball' },
  { x: 9, y: 13, rodzaj: 'potwor', strefa: 'dom', sila: 'slaby' },
  { x: 10, y: 14, rodzaj: 'budynek', strefa: 'dom', budynek: 'ognisko' },
  { x: 5, y: 11, rodzaj: 'budynek', strefa: 'dom', budynek: 'drzewo-wiedzy' },
  { x: 13, y: 5, rodzaj: 'budynek', strefa: 'dom', budynek: 'zrodlo' },
  { x: 7, y: 10, rodzaj: 'budynek', strefa: 'dom', budynek: 'chatka' },
  { x: 6, y: 12, rodzaj: 'budynek', strefa: 'dom', budynek: 'gniazdo' },
  { x: 11, y: 14, rodzaj: 'budynek', strefa: 'dom', budynek: 'woz' },
  { x: 6, y: 15, rodzaj: 'surowiec', strefa: 'dom', surowiec: 'pokeball' },
  { x: 17, y: 12, rodzaj: 'surowiec', strefa: 'dom', surowiec: 'jagoda' },
  { x: 7, y: 12, rodzaj: 'surowiec', strefa: 'dom', surowiec: 'odlamek' },
  { x: 17, y: 9, rodzaj: 'surowiec', strefa: 'dom', surowiec: 'jagoda' },
  { x: 15, y: 11, rodzaj: 'surowiec', strefa: 'dom', surowiec: 'odlamek' },
  { x: 10, y: 3, rodzaj: 'skrzynia', strefa: 'dom' },
  { x: 11, y: 8, rodzaj: 'skrzynia', strefa: 'dom' },
  { x: 11, y: 3, rodzaj: 'artefakt', strefa: 'dom' },
  { x: 11, y: 4, rodzaj: 'potwor', strefa: 'dom', sila: 'slaby' },
  { x: 17, y: 7, rodzaj: 'potwor', strefa: 'dom', sila: 'slaby' },
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
  { x: 20, y: 20, rodzaj: 'skrzynia', strefa: 'pogranicze' },
  { x: 19, y: 21, rodzaj: 'potwor', strefa: 'pogranicze', sila: 'slaby' },
  { x: 16, y: 22, rodzaj: 'budynek', strefa: 'pogranicze', budynek: 'woz' },
  { x: 19, y: 17, rodzaj: 'surowiec', strefa: 'pogranicze', surowiec: 'pokeball' },
  { x: 24, y: 3, rodzaj: 'surowiec', strefa: 'pogranicze', surowiec: 'jagoda' },
  { x: 20, y: 16, rodzaj: 'surowiec', strefa: 'pogranicze', surowiec: 'kamien' },
  { x: 30, y: 26, rodzaj: 'surowiec', strefa: 'pogranicze', surowiec: 'kamien' },
  { x: 18, y: 17, rodzaj: 'surowiec', strefa: 'pogranicze', surowiec: 'odlamek' },
  { x: 30, y: 22, rodzaj: 'kopalnia', strefa: 'pogranicze', surowiec: 'odlamek' },
  { x: 31, y: 27, rodzaj: 'skrzynia', strefa: 'pogranicze' },
  { x: 32, y: 28, rodzaj: 'skrzynia', strefa: 'pogranicze' },
  { x: 34, y: 3, rodzaj: 'artefakt', strefa: 'pogranicze' },
  { x: 33, y: 4, rodzaj: 'potwor', strefa: 'pogranicze', sila: 'sredni' },
  { x: 27, y: 27, rodzaj: 'potwor', strefa: 'pogranicze', sila: 'slaby' },
  { x: 20, y: 15, rodzaj: 'budynek', strefa: 'pogranicze', budynek: 'wieza-obserwacyjna' },
  { x: 29, y: 23, rodzaj: 'budynek', strefa: 'pogranicze', budynek: 'gniazdo' },
  { x: 30, y: 4, rodzaj: 'budynek', strefa: 'pogranicze', budynek: 'chatka' },
  { x: 34, y: 4, rodzaj: 'budynek', strefa: 'pogranicze', budynek: 'woz' },
  { x: 25, y: 24, rodzaj: 'budynek', strefa: 'pogranicze', budynek: 'arena' },
  { x: 28, y: 24, rodzaj: 'budynek', strefa: 'pogranicze', budynek: 'ognisko' },
  { x: 32, y: 22, rodzaj: 'budynek', strefa: 'pogranicze', budynek: 'ranczo' },
  { x: 35, y: 3, rodzaj: 'surowiec', strefa: 'pogranicze', surowiec: 'kamien' },
  { x: 29, y: 1, rodzaj: 'skrzynia', strefa: 'pogranicze' },
  { x: 22, y: 14, rodzaj: 'kopalnia', strefa: 'wroga', surowiec: 'pokeball' },
  { x: 21, y: 15, rodzaj: 'potwor', strefa: 'pogranicze', sila: 'sredni' },
  { x: 33, y: 9, rodzaj: 'skrzynia', strefa: 'wroga' },
  { x: 26, y: 6, rodzaj: 'skrzynia', strefa: 'wroga' },
  { x: 32, y: 9, rodzaj: 'potwor', strefa: 'wroga', sila: 'sredni' },
  { x: 25, y: 7, rodzaj: 'potwor', strefa: 'wroga', sila: 'sredni' },
  { x: 25, y: 15, rodzaj: 'surowiec', strefa: 'wroga', surowiec: 'pokeball' },
  { x: 31, y: 18, rodzaj: 'surowiec', strefa: 'wroga', surowiec: 'kamien' },
  { x: 34, y: 11, rodzaj: 'budynek', strefa: 'wroga', budynek: 'kamienna-wieza' },
];

/** Ustawienia misji na tej planszy — patrz `UstawieniaPlanszy` w `src/data/mapy.ts`. */
export const USTAWIENIA = {
  "klocki": "trawa",
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
  "znajdzki": 0.68,
  "obrysObiektow": 0,
  "skalaStrazy": 1.1,
  "skalaBudowli": 1.0,
  "kepySkal": {
    "0,23": 1,
    "3,23": 3,
    "6,23": -1,
    "2,25": 4,
    "5,25": 2,
    "8,25": -1,
    "18,28": 2,
    "21,28": 1,
    "22,30": -2,
    "22,32": 4,
    "22,34": -1
  }
};
