// PLIK GENEROWANY — nie poprawiaj ręcznie.
// Źródło: tools/mapy/bagna.py (szkic i rozstawienie), silnik: tools/generuj_mape.py.
//
// Plansza 54 × 54 („Bagna”) — misja 3, „Bagienny szlak”. Dolina gracza za
// Czarną Strugą na południowym zachodzie, trzęsawisko z groblami pośrodku,
// warownia wroga na północy i Wyspa Księżyca w pierścieniu wody na
// północnym wschodzie — tam, pod strażą wodza, leży Księżycowy Kamień.
// Znaki: . trawa, = ścieżka, , piasek, j ziemia jałowa, s śnieg, b bagno,
// T las, # skały, ~ woda.

export const TEREN = [
  'TTTTTT..........TTTTTTTTTTTTTTTTTTT..........~~~~~~TTT',
  'TTTTTT..........TTTTTTTTTTTTTTTTTTT......~~~~~~~~~~TTT',
  'TTTTTT.........TTTTTT..TT.T..TTTTTT.....~~~~~~~~~~~~~T',
  'TTTTTTTTT.....TTTT..##..#.....TTT.......~~~~....~~~~~~',
  'TTTTTTTTT.....TTTT.....................~~~~.......~~~~',
  'TTTTTTTTT......TTT.............TTTTTT..~~~.........~~~',
  'TTTT.TT........TTT.............TTTTTT.~~~~.........~~~',
  'TTTTT....TTT....T.....=........TTTTTT.~~~..........~~~',
  'TTTT.....TTT....T......=.......TTTTT~.~~~.....=....~~~',
  'TTTTTTTT.TTT...T.T.....=.............~~~~......=....~~',
  'TTT....TTTTT....TTT.....=............~~~~~.....=....~~',
  'TTT....TT.......TT.......=.....~~...~~~~~~.....=...~~~',
  'TTT......................=......~~.~...~~~~....=..~~~~',
  'TTT....TT................=.TTTTTT~T~TTTTT~~~~,,=~~~~TT',
  'TTTTTTTT......TTT......#.=#TTTTTTTTTTTTTT~~~~,=~~~~~TT',
  'TTTTTTTTTTTTTTTTTTTTTTTT##=.##TTTTTTTTTTT~~T~,=~~~~TTT',
  'TTTTTTTTTTTTTTTTTTTTTTTT##.=##TTTTTTTTTTTTTT~,=~~~TTTT',
  'TTTTTTTTTTTTTTTTTTTTTTTT##b=##TTTTTTTTTTTTTTT,=~TTTTTT',
  'TTTTTTTTTTT~~T~~~TT~~~~~bbb=T##~TTTTTTTTTT~~~b=TTTTTTT',
  'TTTTTTbTbTT~~~T~~~~T~~~~bbb=TTTTTTTTTTTTT~~~~b=TbbbTTT',
  'TTTTbbbbbTT~~~~~~~~~~~~~b~b=TTTTTT~TTTTTT~~bbb=TbbbTTT',
  'TTTTbbbbbT~~~~~~~~~~~~~~bbb=TTTTTTbTTTTTT~~~bb=TbbbTTT',
  'TTTbbbbbbT~~~~~~~~~~~~~~bbb=bbbbbbbTTTTTTbbbb=bTbbbTTT',
  'TTTTTTbTTT~~bbbbb~~~~~b~bbb=bbbbbbbbTTT~~~~bb=bTTbTTTT',
  'TTTTTTbTbbb~bbbbbbb~~bbbbbb====bbbbbbbbb~~~~~=bbTbTTTT',
  'TTTTTTbbbbbbbb~bbbbbbbbbbb=bbbb=bbbbbbbbb~b~~=bbbbbTTT',
  'TTTTTbbbbbbbbbbbbbbbbb====bbbbbb=bbbbbbbbbb~=TTTTTTTTT',
  'TTTTbbbbbbbbbbbbbbbb==~~bbbbbbbbb=bbbbbbbbb~=TTTTTTTTT',
  'TTTTTTbbbbbb========TTTb~bbbbbbb~b=bbbbbbbb=bTTTTTTTTT',
  'TTT~TTbbbbbb=bTTTTTTTTTTbbbbbbbbb~.====bbb=bbTTTTTTTTT',
  'TTTTTTTTTTTb=bTTTT~T~TTTbbbbbbbb~~..TTT=b=bbbbbTTTTTTT',
  'TTTTTTTTTTbb=~~~~~~~~TTTTTTTTTTT~~~~~TTT=bbbbbbbTbTTTT',
  '~~~TTTTT~~~~=~~~~~~~~~~~TTTTT~TT~~~~bTT=bbbbbbbbbbTTTT',
  '~~~~~~~~~~~~=~~~~~~~~~~~~~~~~~~~T~~b~b=bbbbbbbbbbbbTTT',
  '~~~~~~~~~~~~=~~~~~~~~~~~~~~~~~~~T~bbbb=bbbTTTTTTbbbTTT',
  'TT~~~~~~~~~.=......TT...~~~~~~~~~Tbbbb=bbTTbbbbTbbbbTT',
  'TTTT~~~~~TT.=......TT.....~..~~TTTbbbb=bbbbbbbbTbbbTTT',
  'TTTT######T.=......TT.......~~TTTTTTbb=bbTTbbbbTbbbTTT',
  'TTTT######..=......TT.......~~TTTTTTb=bbbbTTTTTTbbbTTT',
  'TTTT######..=..TTT....b.....~~TTTTTT=bbbbb~~~b~bbbbTTT',
  'TTTT######..=..~~~...bb....~~TTTTTT=bbbbbb~~~bbTTTTTTT',
  'TTTT######...=~~~....bb....~~TTTTTT=bbbbbbb~~~~~TTTTTT',
  'TTTT######...=bbb..........~~TT..==.=bbTTTTb~~~~TT~TTT',
  'TTTT######..b=......======.~~...=....==TTTTb~~~~~~~TTT',
  'TTTT######...=======......======..T..TT=Tbbbb~~~~~TTTT',
  'TTT..........=.............~~.....TTTTTb====b~~~..TTTT',
  'TTTT.........=.............~~TT..TTTTTT~~bbb=~~b~..TTT',
  'TTTT........==.............~~TTTTTTTTTbb~b~b~=~~....TT',
  'TTT.......=.==.............~~TTTTTTTTTbbbbb~bb==..TTTT',
  'TTTTTTTTT..=..=.............~~TTTTTTTTTTb~~~~~~...TTTT',
  'TTTT..........=#####..bb.b..~~TTTTTT~TTTbTTT~....TTTTT',
  'TTTT.....~~..=~#####T.bbbbbT~~TTTTTTTT~~TTTTTTTTTTTTTT',
  'TTTT.....~~b.=.#####T..bbTTTT~~TTTTTTTTTTTTTTTTTTTTTTT',
  'TTTT.....~~b.=.#####T.b.bbTTT~~TTTTTTTTTTTTTTTTTTTTTTT',
];

export const PUNKTY = {
  'start': { x: 14, y: 46 },
  'zamek gracza': { x: 10, y: 48 },
  'rozstaje doliny': { x: 12, y: 40 },
  'grobla poludnie': { x: 12, y: 38 },
  'grobla polnoc': { x: 12, y: 28 },
  'trzesawisko': { x: 27, y: 24 },
  'brod zachod': { x: 14, y: 44 },
  'brod wschod': { x: 31, y: 44 },
  'wschodnie wyspy': { x: 38, y: 37 },
  'podnoze wyspy': { x: 46, y: 21 },
  'zamek wroga': { x: 22, y: 7 },
  'wyspa': { x: 46, y: 8 },
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
  artefakt?: string;
}> = [
  { x: 46, y: 7, rodzaj: 'artefakt', strefa: 'wroga', artefakt: 'ksiezycowy-kamien' },
  { x: 45, y: 15, rodzaj: 'potwor', strefa: 'wroga', sila: 'wodz', nazwa: 'Wódz Srebrnych Płaszczy' },
  { x: 45, y: 5, rodzaj: 'skrzynia', strefa: 'wroga' },
  { x: 43, y: 5, rodzaj: 'skrzynia', strefa: 'wroga' },
  { x: 47, y: 4, rodzaj: 'artefakt', strefa: 'wroga' },
  { x: 11, y: 51, rodzaj: 'kopalnia', strefa: 'dom', surowiec: 'kamien' },
  { x: 18, y: 46, rodzaj: 'kopalnia', strefa: 'dom', surowiec: 'odlamek' },
  { x: 14, y: 43, rodzaj: 'budynek', strefa: 'dom', budynek: 'drzewo-wiedzy' },
  { x: 11, y: 43, rodzaj: 'surowiec', strefa: 'dom', surowiec: 'jagoda' },
  { x: 16, y: 43, rodzaj: 'skrzynia', strefa: 'dom' },
  { x: 22, y: 49, rodzaj: 'surowiec', strefa: 'dom', surowiec: 'pokeball' },
  { x: 26, y: 48, rodzaj: 'skrzynia', strefa: 'dom' },
  { x: 24, y: 42, rodzaj: 'kopalnia', strefa: 'dom', surowiec: 'pokeball' },
  { x: 4, y: 45, rodzaj: 'kopalnia', strefa: 'dom', surowiec: 'jagoda' },
  { x: 18, y: 39, rodzaj: 'budynek', strefa: 'dom', budynek: 'wiatrak' },
  { x: 24, y: 36, rodzaj: 'budynek', strefa: 'dom', budynek: 'oboz-treningowy' },
  { x: 21, y: 35, rodzaj: 'budynek', strefa: 'dom', budynek: 'gniazdo' },
  { x: 12, y: 33, rodzaj: 'potwor', strefa: 'pogranicze', sila: 'slaby' },
  { x: 30, y: 44, rodzaj: 'potwor', strefa: 'pogranicze', sila: 'slaby' },
  { x: 21, y: 49, rodzaj: 'budynek', strefa: 'dom', budynek: 'wieza-obserwacyjna' },
  { x: 6, y: 21, rodzaj: 'artefakt', strefa: 'pogranicze' },
  { x: 7, y: 21, rodzaj: 'skrzynia', strefa: 'pogranicze' },
  { x: 5, y: 21, rodzaj: 'surowiec', strefa: 'pogranicze', surowiec: 'kamien' },
  { x: 6, y: 20, rodzaj: 'surowiec', strefa: 'pogranicze', surowiec: 'pokeball' },
  { x: 6, y: 24, rodzaj: 'potwor', strefa: 'pogranicze', sila: 'sredni' },
  { x: 48, y: 21, rodzaj: 'skrzynia', strefa: 'pogranicze' },
  { x: 50, y: 21, rodzaj: 'surowiec', strefa: 'pogranicze', surowiec: 'pokeball' },
  { x: 48, y: 20, rodzaj: 'surowiec', strefa: 'pogranicze', surowiec: 'jagoda' },
  { x: 49, y: 20, rodzaj: 'surowiec', strefa: 'pogranicze', surowiec: 'odlamek' },
  { x: 49, y: 24, rodzaj: 'potwor', strefa: 'pogranicze', sila: 'sredni' },
  { x: 46, y: 37, rodzaj: 'artefakt', strefa: 'pogranicze' },
  { x: 46, y: 35, rodzaj: 'surowiec', strefa: 'pogranicze', surowiec: 'kamien' },
  { x: 45, y: 36, rodzaj: 'surowiec', strefa: 'pogranicze', surowiec: 'jagoda' },
  { x: 46, y: 36, rodzaj: 'skrzynia', strefa: 'pogranicze' },
  { x: 41, y: 36, rodzaj: 'potwor', strefa: 'pogranicze', sila: 'sredni' },
  { x: 48, y: 48, rodzaj: 'artefakt', strefa: 'pogranicze' },
  { x: 50, y: 47, rodzaj: 'surowiec', strefa: 'pogranicze', surowiec: 'pokeball' },
  { x: 51, y: 47, rodzaj: 'skrzynia', strefa: 'pogranicze' },
  { x: 11, y: 28, rodzaj: 'surowiec', strefa: 'pogranicze', surowiec: 'jagoda' },
  { x: 10, y: 29, rodzaj: 'surowiec', strefa: 'pogranicze', surowiec: 'jagoda' },
  { x: 23, y: 25, rodzaj: 'surowiec', strefa: 'pogranicze', surowiec: 'jagoda' },
  { x: 39, y: 33, rodzaj: 'kopalnia', strefa: 'pogranicze', surowiec: 'kamien' },
  { x: 35, y: 27, rodzaj: 'kopalnia', strefa: 'pogranicze', surowiec: 'odlamek' },
  { x: 10, y: 24, rodzaj: 'kopalnia', strefa: 'pogranicze', surowiec: 'pokeball' },
  { x: 37, y: 36, rodzaj: 'kopalnia', strefa: 'pogranicze', surowiec: 'jagoda' },
  { x: 26, y: 30, rodzaj: 'kopalnia', strefa: 'pogranicze', surowiec: 'odlamek' },
  { x: 38, y: 33, rodzaj: 'potwor', strefa: 'pogranicze', sila: 'sredni' },
  { x: 34, y: 36, rodzaj: 'skrzynia', strefa: 'pogranicze' },
  { x: 20, y: 25, rodzaj: 'skrzynia', strefa: 'pogranicze' },
  { x: 30, y: 25, rodzaj: 'skrzynia', strefa: 'pogranicze' },
  { x: 24, y: 20, rodzaj: 'skrzynia', strefa: 'pogranicze' },
  { x: 34, y: 34, rodzaj: 'skrzynia', strefa: 'pogranicze' },
  { x: 9, y: 27, rodzaj: 'skrzynia', strefa: 'pogranicze' },
  { x: 39, y: 39, rodzaj: 'budynek', strefa: 'pogranicze', budynek: 'wieza-obserwacyjna' },
  { x: 41, y: 47, rodzaj: 'budynek', strefa: 'pogranicze', budynek: 'woz' },
  { x: 49, y: 38, rodzaj: 'budynek', strefa: 'pogranicze', budynek: 'kamienna-wieza' },
  { x: 46, y: 33, rodzaj: 'budynek', strefa: 'pogranicze', budynek: 'zrodlo' },
  { x: 30, y: 43, rodzaj: 'budynek', strefa: 'pogranicze', budynek: 'oboz-treningowy' },
  { x: 31, y: 23, rodzaj: 'budynek', strefa: 'pogranicze', budynek: 'wieza-obserwacyjna' },
  { x: 11, y: 27, rodzaj: 'budynek', strefa: 'pogranicze', budynek: 'portal' },
  { x: 32, y: 27, rodzaj: 'budynek', strefa: 'pogranicze', budynek: 'portal' },
  { x: 26, y: 27, rodzaj: 'jasnowidz', strefa: 'pogranicze' },
  { x: 26, y: 10, rodzaj: 'surowiec', strefa: 'wroga', surowiec: 'pokeball' },
  { x: 49, y: 9, rodzaj: 'surowiec', strefa: 'wroga', surowiec: 'odlamek' },
  { x: 49, y: 8, rodzaj: 'surowiec', strefa: 'wroga', surowiec: 'pokeball' },
  { x: 21, y: 10, rodzaj: 'surowiec', strefa: 'wroga', surowiec: 'odlamek' },
  { x: 32, y: 10, rodzaj: 'kopalnia', strefa: 'wroga', surowiec: 'kamien' },
  { x: 11, y: 0, rodzaj: 'kopalnia', strefa: 'wroga', surowiec: 'pokeball' },
  { x: 15, y: 13, rodzaj: 'kopalnia', strefa: 'wroga', surowiec: 'odlamek' },
  { x: 14, y: 2, rodzaj: 'skrzynia', strefa: 'wroga' },
  { x: 38, y: 12, rodzaj: 'budynek', strefa: 'wroga', budynek: 'osrodek-ewolucji' },
  { x: 29, y: 12, rodzaj: 'budynek', strefa: 'wroga', budynek: 'arena' },
  { x: 40, y: 1, rodzaj: 'budynek', strefa: 'wroga', budynek: 'ognisko' },
  { x: 45, y: 8, rodzaj: 'potwor', strefa: 'wroga', sila: 'silny' },
  { x: 26, y: 16, rodzaj: 'potwor', strefa: 'wroga', sila: 'silny' },
  { x: 6, y: 52, rodzaj: 'artefakt', strefa: 'dom' },
  { x: 5, y: 51, rodzaj: 'skrzynia', strefa: 'dom' },
  { x: 7, y: 51, rodzaj: 'surowiec', strefa: 'dom', surowiec: 'pokeball' },
  { x: 9, y: 50, rodzaj: 'potwor', strefa: 'dom', sila: 'slaby' },
  { x: 3, y: 11, rodzaj: 'artefakt', strefa: 'wroga' },
  { x: 4, y: 10, rodzaj: 'skrzynia', strefa: 'wroga' },
  { x: 5, y: 10, rodzaj: 'surowiec', strefa: 'wroga', surowiec: 'kamien' },
  { x: 8, y: 12, rodzaj: 'potwor', strefa: 'wroga', sila: 'silny' },
  { x: 12, y: 6, rodzaj: 'kopalnia', strefa: 'wroga', surowiec: 'jagoda' },
  { x: 20, y: 13, rodzaj: 'kopalnia', strefa: 'wroga', surowiec: 'kamien' },
  { x: 12, y: 12, rodzaj: 'skrzynia', strefa: 'wroga' },
  { x: 29, y: 28, rodzaj: 'kopalnia', strefa: 'pogranicze', surowiec: 'pokeball' },
  { x: 25, y: 23, rodzaj: 'kopalnia', strefa: 'pogranicze', surowiec: 'kamien' },
  { x: 24, y: 24, rodzaj: 'potwor', strefa: 'pogranicze', sila: 'sredni' },
  { x: 44, y: 46, rodzaj: 'potwor', strefa: 'pogranicze', sila: 'sredni' },
  { x: 49, y: 49, rodzaj: 'surowiec', strefa: 'pogranicze', surowiec: 'odlamek' },
  { x: 40, y: 27, rodzaj: 'budynek', strefa: 'pogranicze', budynek: 'drzewo-wiedzy' },
  { x: 15, y: 37, rodzaj: 'budynek', strefa: 'dom', budynek: 'ranczo' },
  { x: 19, y: 10, rodzaj: 'skrzynia', strefa: 'wroga' },
  { x: 20, y: 10, rodzaj: 'surowiec', strefa: 'wroga', surowiec: 'kamien' },
  { x: 20, y: 11, rodzaj: 'surowiec', strefa: 'wroga', surowiec: 'odlamek' },
  { x: 32, y: 4, rodzaj: 'potwor', strefa: 'wroga', sila: 'silny' },
  { x: 37, y: 3, rodzaj: 'surowiec', strefa: 'wroga', surowiec: 'jagoda' },
  { x: 38, y: 3, rodzaj: 'surowiec', strefa: 'wroga', surowiec: 'odlamek' },
  { x: 39, y: 3, rodzaj: 'skrzynia', strefa: 'wroga' },
  { x: 38, y: 2, rodzaj: 'surowiec', strefa: 'wroga', surowiec: 'pokeball' },
  { x: 28, y: 8, rodzaj: 'skrzynia', strefa: 'wroga' },
  { x: 29, y: 8, rodzaj: 'surowiec', strefa: 'wroga', surowiec: 'jagoda' },
  { x: 13, y: 2, rodzaj: 'skrzynia', strefa: 'wroga' },
  { x: 27, y: 3, rodzaj: 'surowiec', strefa: 'wroga', surowiec: 'odlamek' },
  { x: 28, y: 3, rodzaj: 'skrzynia', strefa: 'wroga' },
  { x: 32, y: 45, rodzaj: 'skrzynia', strefa: 'pogranicze' },
  { x: 33, y: 45, rodzaj: 'surowiec', strefa: 'pogranicze', surowiec: 'jagoda' },
  { x: 43, y: 22, rodzaj: 'surowiec', strefa: 'pogranicze', surowiec: 'kamien' },
  { x: 44, y: 22, rodzaj: 'skrzynia', strefa: 'pogranicze' },
];

/** Ustawienia misji na tej planszy — patrz `UstawieniaPlanszy` w `src/data/mapy.ts`. */
export const USTAWIENIA = {
  "klocki": "bagno",
  "wrog": "aktywny",
  "nazwyZamkowWroga": [
    "Warownia na Grobli"
  ],
  "zestaw": "bagno",
  "odkryte": [
    {
      "x": 46,
      "y": 8,
      "promien": 2
    }
  ],
  "znajdzki": 0.44,
  "masywy": [
    {
      "plik": "gora-2",
      "x": 6.0,
      "y": 41.5,
      "szer": 7.0,
      "pokrywa": [
        4,
        37,
        9,
        40
      ]
    },
    {
      "plik": "gora-7",
      "x": 6.0,
      "y": 45.6,
      "szer": 9.0,
      "pokrywa": [
        4,
        41,
        9,
        44
      ]
    },
    {
      "plik": "gora-11",
      "x": 17.0,
      "y": 54.25,
      "szer": 5.4,
      "pokrywa": [
        15,
        50,
        18,
        53
      ]
    }
  ],
  "skalaBudowli": 1.05,
  "skalaZamku": 1.05,
  "obrysObiektow": 0.55,
  "wodaBarwy": {
    "plytka": [
      0.3,
      0.44,
      0.44
    ],
    "gleboka": [
      0.12,
      0.22,
      0.25
    ],
    "piana": [
      0.5,
      0.56,
      0.4
    ],
    "pianaMoc": 0.25,
    "iskry": 1.0
  }
};
