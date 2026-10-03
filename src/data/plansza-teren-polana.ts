// PLIK GENEROWANY — nie poprawiaj ręcznie.
// Źródło: tools/mapy/polana.py (szkic i rozstawienie), silnik: tools/generuj_mape.py.
//
// Plansza 36 × 36 („Polana”, rozmiar S) — misja 1, samouczek. Rzeka z dwoma
// brodami dzieli dolinę domu (zamek gracza na południowym zachodzie) od
// wschodniej łąki ze starym fortem przeciwnika.
// Znaki: . trawa, = ścieżka, , piasek, j ziemia jałowa, s śnieg, b bagno,
// T las, # skały, ~ woda.

export const TEREN = [
  'TTTTTTTTTT###TTTTT~~~~##############',
  'TTTTTT~TT###TTTTTTT~~~##############',
  'TTTTT~~~.#.#TTTTTTTT~~~~###j########',
  'TTTTT~~~~.....TTTTTT~~~jj#j####jjjj#',
  'TTTTT~~~......TTTTTT~~~jjjjj##jjjjj#',
  'TTTT~~~~~~~...TTTTT~~~~jjjjj##jjj#j#',
  'TTTT~~~~~TTT.TTTT..T~~~jjjjjjjjj####',
  'TT~~~~.~~...TT......~~~jjjjjjjjj####',
  'TTT.~.~..~..TT....============jj#j##',
  'TTT....~....TTT..=..~~~jjjjjjj=jjjjj',
  'TT.......==T.T..=...~~~jjjjjjjj=jjjj',
  'TTT.....=..=====...~~~~jjjjjjjjj=jjj',
  'TT.TT...=..........~~~jjjjj##jjj=###',
  'TTTTTT..=.........~~~jjjjjj##j=j=###',
  'TTTTT...=........~~~jjjjjjj##.==jj##',
  'TTTT....=.......~~~jjjjjjjj###=#####',
  'TTTTTTTT=TTTTTT~~~############=#####',
  'TTTTTTTT.=TTTT~~~#############=#####',
  'TTTTTTTTT.=TT~~~TTT...TTTTT...=...TT',
  'TTTTTTTTT..=.~~~TTT...TTTTTT..=.TTTT',
  'TTTTTTTTT..=~~~.TTT...TTTTT..=..TTTT',
  'TTTTT......=~~~.TTT...TTTTT..=....TT',
  'TTTTT......=~~........TTTTT.=.....TT',
  '#########TT.=~~......TTTT..=....TTTT',
  '#########...=.~~..........=.=...TTTT',
  'TT#########.==============...=...TTT',
  'TT#########.=.~~.............=..TTTT',
  'TTT..........=.~~jjj..........=..TTT',
  'TTT..........=.~~j######.TT##.=...TT',
  'TTT.........=..~~j######.TT#T....TTT',
  'TTT........=...~~jjjjj###TTTTT...TTT',
  'TTT......=.=....~~jjjj###TTTTT..TTTT',
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
  'brod wschod': { x: 18, y: 25 },
  'brod polnocny zachod': { x: 18, y: 8 },
  'brod polnocny wschod': { x: 24, y: 8 },
  'wschodnia laka': { x: 27, y: 23 },
  'zamek wroga': { x: 30, y: 13 },
  'poludniowy wschod': { x: 30, y: 28 },
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
  { x: 9, y: 27, rodzaj: 'kopalnia', strefa: 'dom', surowiec: 'kamien' },
  { x: 12, y: 33, rodzaj: 'kopalnia', strefa: 'dom', surowiec: 'jagoda' },
  { x: 11, y: 27, rodzaj: 'surowiec', strefa: 'dom', surowiec: 'odlamek' },
  { x: 6, y: 30, rodzaj: 'surowiec', strefa: 'dom', surowiec: 'jagoda' },
  { x: 11, y: 28, rodzaj: 'skrzynia', strefa: 'dom' },
  { x: 9, y: 34, rodzaj: 'skrzynia', strefa: 'dom' },
  { x: 9, y: 17, rodzaj: 'potwor', strefa: 'dom', sila: 'slaby' },
  { x: 17, y: 25, rodzaj: 'potwor', strefa: 'pogranicze', sila: 'slaby' },
  { x: 21, y: 8, rodzaj: 'potwor', strefa: 'wroga', sila: 'sredni' },
  { x: 30, y: 16, rodzaj: 'potwor', strefa: 'wroga', sila: 'silny' },
  { x: 12, y: 6, rodzaj: 'potwor', strefa: 'dom', sila: 'slaby' },
  { x: 31, y: 5, rodzaj: 'potwor', strefa: 'wroga', sila: 'sredni' },
  { x: 10, y: 4, rodzaj: 'kopalnia', strefa: 'dom', surowiec: 'pokeball' },
  { x: 13, y: 4, rodzaj: 'artefakt', strefa: 'dom' },
  { x: 12, y: 3, rodzaj: 'skrzynia', strefa: 'dom' },
  { x: 7, y: 12, rodzaj: 'kopalnia', strefa: 'dom', surowiec: 'odlamek' },
  { x: 3, y: 9, rodzaj: 'budynek', strefa: 'dom', budynek: 'drzewo-wiedzy' },
  { x: 11, y: 14, rodzaj: 'budynek', strefa: 'dom', budynek: 'zrodlo' },
  { x: 17, y: 8, rodzaj: 'budynek', strefa: 'dom', budynek: 'gniazdo' },
  { x: 14, y: 13, rodzaj: 'budynek', strefa: 'dom', budynek: 'ognisko' },
  { x: 10, y: 15, rodzaj: 'budynek', strefa: 'dom', budynek: 'chatka' },
  { x: 19, y: 10, rodzaj: 'budynek', strefa: 'dom', budynek: 'oboz-treningowy' },
  { x: 12, y: 15, rodzaj: 'surowiec', strefa: 'dom', surowiec: 'odlamek' },
  { x: 10, y: 13, rodzaj: 'surowiec', strefa: 'dom', surowiec: 'jagoda' },
  { x: 5, y: 15, rodzaj: 'surowiec', strefa: 'dom', surowiec: 'odlamek' },
  { x: 18, y: 6, rodzaj: 'skrzynia', strefa: 'dom' },
  { x: 19, y: 30, rodzaj: 'kopalnia', strefa: 'pogranicze', surowiec: 'kamien' },
  { x: 17, y: 30, rodzaj: 'potwor', strefa: 'pogranicze', sila: 'slaby' },
  { x: 19, y: 32, rodzaj: 'skrzynia', strefa: 'pogranicze' },
  { x: 20, y: 31, rodzaj: 'surowiec', strefa: 'pogranicze', surowiec: 'odlamek' },
  { x: 18, y: 23, rodzaj: 'budynek', strefa: 'pogranicze', budynek: 'wieza-obserwacyjna' },
  { x: 20, y: 18, rodzaj: 'skrzynia', strefa: 'pogranicze' },
  { x: 26, y: 27, rodzaj: 'jasnowidz', strefa: 'pogranicze' },
  { x: 31, y: 28, rodzaj: 'skrzynia', strefa: 'pogranicze' },
  { x: 31, y: 29, rodzaj: 'artefakt', strefa: 'pogranicze' },
  { x: 31, y: 22, rodzaj: 'surowiec', strefa: 'pogranicze', surowiec: 'jagoda' },
  { x: 28, y: 23, rodzaj: 'surowiec', strefa: 'pogranicze', surowiec: 'odlamek' },
  { x: 31, y: 26, rodzaj: 'kopalnia', strefa: 'pogranicze', surowiec: 'odlamek' },
  { x: 32, y: 28, rodzaj: 'skrzynia', strefa: 'pogranicze' },
  { x: 32, y: 30, rodzaj: 'budynek', strefa: 'pogranicze', budynek: 'wiatrak' },
  { x: 32, y: 21, rodzaj: 'budynek', strefa: 'pogranicze', budynek: 'arena' },
  { x: 31, y: 27, rodzaj: 'budynek', strefa: 'pogranicze', budynek: 'ognisko' },
  { x: 28, y: 18, rodzaj: 'budynek', strefa: 'pogranicze', budynek: 'zrodlo' },
  { x: 30, y: 21, rodzaj: 'budynek', strefa: 'pogranicze', budynek: 'gniazdo' },
  { x: 25, y: 9, rodzaj: 'artefakt', strefa: 'wroga' },
  { x: 24, y: 10, rodzaj: 'surowiec', strefa: 'wroga', surowiec: 'pokeball' },
  { x: 25, y: 11, rodzaj: 'surowiec', strefa: 'wroga', surowiec: 'kamien' },
  { x: 26, y: 6, rodzaj: 'skrzynia', strefa: 'wroga' },
  { x: 24, y: 5, rodzaj: 'budynek', strefa: 'wroga', budynek: 'ognisko' },
  { x: 34, y: 11, rodzaj: 'surowiec', strefa: 'wroga', surowiec: 'kamien' },
  { x: 35, y: 11, rodzaj: 'surowiec', strefa: 'wroga', surowiec: 'pokeball' },
  { x: 35, y: 9, rodzaj: 'skrzynia', strefa: 'wroga' },
  { x: 31, y: 3, rodzaj: 'kopalnia', strefa: 'wroga', surowiec: 'pokeball' },
  { x: 34, y: 3, rodzaj: 'artefakt', strefa: 'wroga' },
  { x: 33, y: 4, rodzaj: 'skrzynia', strefa: 'wroga' },
  { x: 34, y: 5, rodzaj: 'surowiec', strefa: 'wroga', surowiec: 'kamien' },
  { x: 31, y: 7, rodzaj: 'budynek', strefa: 'wroga', budynek: 'kamienna-wieza' },
  { x: 22, y: 13, rodzaj: 'budynek', strefa: 'wroga', budynek: 'arena' },
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
