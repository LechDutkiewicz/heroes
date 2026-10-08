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
  'TTTTT~~~.###TTTTTTTT~~~~############',
  'TTTTT~~~~.....TTTTTT~~~bbbb####bbbb#',
  'TTTTT~~~......TTTTTT~~~bbbb####bbbb#',
  'TTTT~~~~~~~.=.TTTTT~~~~bbbbbbbbbbbb#',
  'TTTT~~~~~TTT=TTTT..T~~~bbbbbbbbbb###',
  'TT~~~~~~~TTT=TTTT...~~~bbbbbbbbbb###',
  'TTT........=.T....=======bbbbbbbb###',
  'TTT.......=.TTT..=..~~~bb=bbbbbbb###',
  'TT.......==T.T..=...~~~bbb=bbbbbb###',
  'TTT.....=..=====...~~~~bbb=bbbbbb###',
  'TT.TT...=..........~~~bbbbb=bbbbb###',
  'TTTTTT..=.........~~~bbbbbbb=b=bb###',
  'TTTTT...=........~~~bbbbbbbbb==bb###',
  'TTTT....=.......~~~bbbbbbbb###=#####',
  'TTTTTTTT=TTTTTT~~~############=#####',
  'TTTTTTTT.=TTTT~~~#############=#####',
  'TTTTTTTTT.=TT~~~TTTTTTTTTTTjjj=jjjjT',
  'TTTTTTTTT..=.~~~TTTTTTTTjjjTjj=jjjjT',
  'TTTTTTTTT..=~~~~TTTTTTTTjjjjj=jjTTTT',
  'T..........=~~~TTTTTTTTTTTTjj=jjjjTT',
  'T..........=~~TTTTjjjTTTTTTj=jjjjjTT',
  '#########TT.=~~TTTjjjTTTTjj=jjjjTTTT',
  '#########...=.~~TTTTjjjjjj=j=jjjTTTT',
  'TT#########.==============jjj=jjjTTT',
  'TT#########.=.~~jj=jjjjjjjjjj=jjTTTT',
  'TTT..........=.~~j=jjjjjjjjjjj=jjTTT',
  'TTT..........=.~~=###########j=jjjTT',
  'TTT..=......=..~~=###########jjjjTTT',
  'TTT...=....=...~~j=jjj###jjjjjjjjTTT',
  'TTTT...=.=.=....~~j=jj###jjjjjjjTTTT',
  'T....T..=.=.....~~jjjj###jjjjj######',
  'T....T...........~~TTT###jjjjj######',
  'T....TT..........~~TTT###TTTTT######',
  'TTTTTTTTT........~~~TT###TTTTT######',
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
  'kopalnia domu': { x: 5, y: 29 },
  'jaskinia': { x: 19, y: 31 },
  'plaza': { x: 12, y: 5 },
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
  { x: 12, y: 33, rodzaj: 'kopalnia', strefa: 'dom', surowiec: 'jagoda' },
  { x: 11, y: 27, rodzaj: 'surowiec', strefa: 'dom', surowiec: 'odlamek' },
  { x: 11, y: 28, rodzaj: 'skrzynia', strefa: 'dom' },
  { x: 5, y: 28, rodzaj: 'kopalnia', strefa: 'dom', surowiec: 'odlamek' },
  { x: 2, y: 21, rodzaj: 'skrzynia', strefa: 'dom' },
  { x: 8, y: 34, rodzaj: 'surowiec', strefa: 'dom', surowiec: 'pokeball' },
  { x: 2, y: 33, rodzaj: 'kopalnia', strefa: 'dom', surowiec: 'kamien' },
  { x: 4, y: 34, rodzaj: 'skrzynia', strefa: 'dom' },
  { x: 25, y: 20, rodzaj: 'kopalnia', strefa: 'pogranicze', surowiec: 'kamien' },
  { x: 8, y: 16, rodzaj: 'potwor', strefa: 'pogranicze', sila: 'slaby' },
  { x: 17, y: 26, rodzaj: 'potwor', strefa: 'pogranicze', sila: 'slaby' },
  { x: 24, y: 8, rodzaj: 'potwor', strefa: 'wroga', sila: 'sredni' },
  { x: 4, y: 32, rodzaj: 'potwor', strefa: 'dom', sila: 'slaby' },
  { x: 27, y: 20, rodzaj: 'potwor', strefa: 'pogranicze', sila: 'slaby' },
  { x: 30, y: 16, rodzaj: 'potwor', strefa: 'wroga', sila: 'silny' },
  { x: 12, y: 7, rodzaj: 'potwor', strefa: 'pogranicze', sila: 'slaby' },
  { x: 31, y: 5, rodzaj: 'potwor', strefa: 'wroga', sila: 'sredni' },
  { x: 10, y: 4, rodzaj: 'kopalnia', strefa: 'pogranicze', surowiec: 'pokeball' },
  { x: 13, y: 4, rodzaj: 'artefakt', strefa: 'pogranicze' },
  { x: 12, y: 3, rodzaj: 'skrzynia', strefa: 'pogranicze' },
  { x: 6, y: 9, rodzaj: 'budynek', strefa: 'pogranicze', budynek: 'zrodlo' },
  { x: 3, y: 10, rodzaj: 'budynek', strefa: 'pogranicze', budynek: 'chatka' },
  { x: 5, y: 12, rodzaj: 'budynek', strefa: 'pogranicze', budynek: 'woz' },
  { x: 5, y: 14, rodzaj: 'skrzynia', strefa: 'pogranicze' },
  { x: 4, y: 15, rodzaj: 'surowiec', strefa: 'pogranicze', surowiec: 'jagoda' },
  { x: 10, y: 13, rodzaj: 'budynek', strefa: 'pogranicze', budynek: 'oboz-treningowy' },
  { x: 10, y: 11, rodzaj: 'skrzynia', strefa: 'pogranicze' },
  { x: 9, y: 12, rodzaj: 'surowiec', strefa: 'pogranicze', surowiec: 'odlamek' },
  { x: 15, y: 12, rodzaj: 'budynek', strefa: 'pogranicze', budynek: 'drzewo-wiedzy' },
  { x: 13, y: 15, rodzaj: 'budynek', strefa: 'pogranicze', budynek: 'gniazdo' },
  { x: 15, y: 9, rodzaj: 'surowiec', strefa: 'pogranicze', surowiec: 'kamien' },
  { x: 16, y: 9, rodzaj: 'skrzynia', strefa: 'pogranicze' },
  { x: 18, y: 11, rodzaj: 'budynek', strefa: 'pogranicze', budynek: 'wiatrak' },
  { x: 19, y: 30, rodzaj: 'budynek', strefa: 'pogranicze', budynek: 'gniazdo' },
  { x: 18, y: 23, rodzaj: 'budynek', strefa: 'pogranicze', budynek: 'wieza-obserwacyjna' },
  { x: 25, y: 23, rodzaj: 'skrzynia', strefa: 'pogranicze' },
  { x: 25, y: 24, rodzaj: 'surowiec', strefa: 'pogranicze', surowiec: 'odlamek' },
  { x: 26, y: 27, rodzaj: 'jasnowidz', strefa: 'pogranicze' },
  { x: 31, y: 28, rodzaj: 'skrzynia', strefa: 'pogranicze' },
  { x: 31, y: 29, rodzaj: 'artefakt', strefa: 'pogranicze' },
  { x: 32, y: 21, rodzaj: 'surowiec', strefa: 'pogranicze', surowiec: 'pokeball' },
  { x: 33, y: 21, rodzaj: 'surowiec', strefa: 'pogranicze', surowiec: 'jagoda' },
  { x: 31, y: 24, rodzaj: 'budynek', strefa: 'pogranicze', budynek: 'arena' },
  { x: 30, y: 26, rodzaj: 'budynek', strefa: 'pogranicze', budynek: 'wiatrak' },
  { x: 28, y: 31, rodzaj: 'budynek', strefa: 'pogranicze', budynek: 'osrodek-ewolucji' },
  { x: 25, y: 32, rodzaj: 'skrzynia', strefa: 'pogranicze' },
  { x: 26, y: 33, rodzaj: 'surowiec', strefa: 'pogranicze', surowiec: 'odlamek' },
  { x: 26, y: 30, rodzaj: 'artefakt', strefa: 'pogranicze' },
  { x: 33, y: 19, rodzaj: 'budynek', strefa: 'pogranicze', budynek: 'ranczo' },
  { x: 25, y: 10, rodzaj: 'artefakt', strefa: 'wroga' },
  { x: 24, y: 10, rodzaj: 'surowiec', strefa: 'wroga', surowiec: 'pokeball' },
  { x: 25, y: 11, rodzaj: 'surowiec', strefa: 'wroga', surowiec: 'kamien' },
  { x: 24, y: 15, rodzaj: 'budynek', strefa: 'wroga', budynek: 'ognisko' },
  { x: 28, y: 6, rodzaj: 'skrzynia', strefa: 'wroga' },
  { x: 29, y: 6, rodzaj: 'surowiec', strefa: 'wroga', surowiec: 'pokeball' },
  { x: 26, y: 14, rodzaj: 'budynek', strefa: 'wroga', budynek: 'chatka' },
  { x: 31, y: 3, rodzaj: 'kopalnia', strefa: 'wroga', surowiec: 'pokeball' },
  { x: 34, y: 3, rodzaj: 'artefakt', strefa: 'wroga' },
  { x: 33, y: 4, rodzaj: 'skrzynia', strefa: 'wroga' },
  { x: 34, y: 5, rodzaj: 'surowiec', strefa: 'wroga', surowiec: 'kamien' },
  { x: 25, y: 3, rodzaj: 'budynek', strefa: 'wroga', budynek: 'kamienna-wieza' },
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
