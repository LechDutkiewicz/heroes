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
  'T##TTTTjjjjjjjjTTTTTTTTTTTTTTTTTTTTTTTjjjjjjj~~~~~~TTT',
  'T###TTjjjjjjjjjjTTT#TTTTTTTTTTTTTTTTTjjjj~~~~~~~~~~TTT',
  '#####TTjjjjjjjjTTTTTTTTTTTTjjTTTTTTTTjjj~~~~~~~~~~~~~T',
  '#####TTTTjjjjjTTTTjj##jj#jjjjjTTTjjjjjjj~~~~,,,,~~~~~~',
  '#####TTTTjjjjjTTTTjjjjjjjjjjjjjjjTTTTjj~~~~,,,,,,,~~~~',
  '#####TTTTjjjjjjTTTjjjjjjjjjjTT######TTT~~~TTTT,TTTT~~~',
  '####TTTjjjjjjjjTTTjjjjjjjjjjT#########~~~~,,,,,,,,,~~~',
  'T####jjjjTTTjjjjTTjjjj=jjjjjT#########~~~,,,,,,,,,,~~~',
  'T###TjjjjTTTjjjjTjjjjj=jjjjjTT######TT~~~,,,,,=,,,,~~~',
  'T#TTTTTTTTTTjjjjjjjjjjj=jjjjjjjjjjjjj~~~~,,,,,,=,,,,~~',
  'TTTjjjjTTTTTjjjjjjTjjjj=jjjjjjjjjjjjj~~~~~,,,,,=,,,,~~',
  'TTTjjjjTTTTTjjjjjjjjjjjj=jjjjjjjjjjj~~~~~~,,,,,=,,,~~~',
  'TTTjjjjjjjjjjjjjjjTTjjjj=jjjjjjjjjjTjjj~~~~,,,,=,,~~~~',
  'TTTTjjjjjjjjjjjjjTTTTjjjj=jTTTTTTTTTTTTTT~~~~,,=~~~~TT',
  'TTTT####jjjjjjTTTTTTTjjTj=TTTTTTTTTTTTTTT~~~~,=~~~~~TT',
  '###########T#TTTTTTTTTTTTT=jTTTT######T#T~~T~,=~~~~TTT',
  'T###########TT#TTTTTTTTTTTj=TT##########TTTT~,=~~~TTTT',
  'T############TTTTTTTTTTTTTb=T############TTTT,=~TTTT#T',
  'TT#########~~~~~~TT~~~~~bbb=T###########TT~~~b=TTTTTTT',
  'TTTTTTbTTTT~~~~~~~~~~~~~bbb=TT###########~~~~b=TbbbTTT',
  'TTbbbbbbbTT~~~~~~~~~~~~~bbb=TTTT######TTT~~~bb=TbbbTTT',
  'TTTbbbbbbT~~~~~~~~~~~~~~bbb=TTTTTTTTTTTTT~~~bb=TbbbTTT',
  'TTbbbbbbbT~~~~~~~~~~~~~~bbb=bbbbbbbTTTTTT~~bb=bTbbbTTT',
  'TTTTTTbTTT~~~bbbb~~~~~~~bbb=bbbbbbbbTTT~~~~~b=bTTbTTTT',
  'TTTTTTbTbbb~bbbbbbb~~bbbbbb====bbbbbbbbb~~~~~=bbTbTTTT',
  'TTTTbbbbbb=bbbbbbbbbbbbbbb=bbbb=bbbbbbbbb~~~~=bbbbbTTT',
  'TTTbbbbbbbb=bbbbbbbbbb====bbbbbb=bbbbbbbbb~~=TTTT####T',
  'TTbbbbbbbbbb=bbbbbbb==bbbbbbbbbbb=bbbbbbbb~~=TTT######',
  'TTTTbbbbbbbb========TTTbbbbbbbbbbb=bbbbbb~~~=bbT######',
  'TT#TTTbbbbbb=bTTTTTTTTTTbbbbbbbbb~b====bb~~~=bbb######',
  'TTTTTTTTbbbb=bTTTTTTTTTTbbbbbbbb~~bbTTT=bT~~=bbb######',
  'TTTTTTTTTTbb=~~~~~~~~TTTTTTTTTTT~~~~~TTT====bbbbTb###T',
  '~~~TTTTT~~~~=~~~~~~~~~~~TTTTT~TT~~~~bTT=bbbbbbbbbbTTTT',
  '~~~~~~~~~~~~=~~~~~~~~~~~~~~~~~~~T~~bbb=bbbbbbbbbbbbTTT',
  '~~~~~~~~~~~~=~~~~~~~~~~~~~~~~~~~T~Tbbb=bbbTTTTTTbbbbTT',
  'TT~~~~~~~~~.=...........~~~~~~~~~TTTbb=bTTTTbbbTbbbbTT',
  'TTTT~~~~~TT.=.............~..~~TTTTTbb=bbbbbbbbTbbbbTT',
  'TTTT######T.=...............~~TTTTTTbb=bTTTTbbbTbbbbTT',
  'TTTT######..=...............~~TTTTTTb=bbbbTTTTTTbbbTTT',
  'TTTT######..=...............~~TTTTTT=bbbbb~~~bbbbbTTTT',
  'TTTT######..=..............~~TTTTTT=bbbbbb~~~~bTTTTT#T',
  'TTTT######...=..T.T........~~TTTTTT=bbbbbbb~~~~~TTTTTT',
  'TTTT######...=..T.T........~~TT..==.=bbTTTTb~~~~TT~TTT',
  'TTTT######...=.............~~TT.=....==TTTTb~~~~~~~TTT',
  'TTTT######...===================..T..TT=Tbbbb~~~~~TTTT',
  'TTT..........=.............~~TT..TTTTTTb====b~~~~bTTTT',
  'TTTT.=.......=.............~~TT.....TTTbbbbb=~~~~bbTTT',
  'TTTT..==....==.............~~TTTT...TTbbbb~b~=~~bbbTTT',
  'TTT.....===.==.............~~TTTTTTTTTbbbb~~~b==bbTTTT',
  'TTTTTTTTTT.=..=.............~~TTTTTTTTTTb~~~~~~bbbTTTT',
  'TTTT..........=TTTTT........~~TTTT#T####T###~bbbbTTTTT',
  'TTTT.....T...=.TTTTTTTTTT..T~~TTT#############TTTTTTTT',
  'TTTT.....T..=..TTTTTTTTTTTTTT~~TTT#############T#TTTTT',
  'TTTT.....T.....TTTTTTTTTTTTTT~~TTTT###########TTTTTTTT',
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
  { x: 18, y: 46, rodzaj: 'kopalnia', strefa: 'dom', surowiec: 'odlamek' },
  { x: 11, y: 43, rodzaj: 'surowiec', strefa: 'dom', surowiec: 'jagoda' },
  { x: 4, y: 45, rodzaj: 'kopalnia', strefa: 'dom', surowiec: 'jagoda' },
  { x: 24, y: 36, rodzaj: 'budynek', strefa: 'dom', budynek: 'oboz-treningowy' },
  { x: 21, y: 35, rodzaj: 'budynek', strefa: 'dom', budynek: 'gniazdo' },
  { x: 30, y: 44, rodzaj: 'potwor', strefa: 'pogranicze', sila: 'slaby' },
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
  { x: 46, y: 36, rodzaj: 'skrzynia', strefa: 'pogranicze' },
  { x: 35, y: 27, rodzaj: 'kopalnia', strefa: 'pogranicze', surowiec: 'odlamek' },
  { x: 10, y: 24, rodzaj: 'kopalnia', strefa: 'pogranicze', surowiec: 'pokeball' },
  { x: 39, y: 39, rodzaj: 'budynek', strefa: 'pogranicze', budynek: 'gniazdo' },
  { x: 46, y: 33, rodzaj: 'budynek', strefa: 'pogranicze', budynek: 'zrodlo' },
  { x: 26, y: 27, rodzaj: 'jasnowidz', strefa: 'pogranicze' },
  { x: 49, y: 9, rodzaj: 'surowiec', strefa: 'wroga', surowiec: 'odlamek' },
  { x: 49, y: 8, rodzaj: 'surowiec', strefa: 'wroga', surowiec: 'pokeball' },
  { x: 32, y: 10, rodzaj: 'kopalnia', strefa: 'wroga', surowiec: 'kamien' },
  { x: 11, y: 0, rodzaj: 'kopalnia', strefa: 'wroga', surowiec: 'pokeball' },
  { x: 38, y: 12, rodzaj: 'budynek', strefa: 'wroga', budynek: 'osrodek-ewolucji' },
  { x: 29, y: 12, rodzaj: 'budynek', strefa: 'wroga', budynek: 'arena' },
  { x: 26, y: 16, rodzaj: 'potwor', strefa: 'wroga', sila: 'silny' },
  { x: 3, y: 11, rodzaj: 'artefakt', strefa: 'wroga' },
  { x: 4, y: 10, rodzaj: 'skrzynia', strefa: 'wroga' },
  { x: 5, y: 10, rodzaj: 'surowiec', strefa: 'wroga', surowiec: 'kamien' },
  { x: 12, y: 6, rodzaj: 'kopalnia', strefa: 'wroga', surowiec: 'jagoda' },
  { x: 40, y: 27, rodzaj: 'budynek', strefa: 'pogranicze', budynek: 'chatka' },
  { x: 19, y: 10, rodzaj: 'skrzynia', strefa: 'wroga' },
  { x: 20, y: 10, rodzaj: 'surowiec', strefa: 'wroga', surowiec: 'kamien' },
  { x: 39, y: 3, rodzaj: 'skrzynia', strefa: 'wroga' },
  { x: 45, y: 48, rodzaj: 'potwor', strefa: 'pogranicze', sila: 'sredni' },
  { x: 36, y: 33, rodzaj: 'kopalnia', strefa: 'pogranicze', surowiec: 'kamien' },
  { x: 22, y: 13, rodzaj: 'budynek', strefa: 'wroga', budynek: 'gniazdo' },
  { x: 7, y: 7, rodzaj: 'budynek', strefa: 'wroga', budynek: 'ognisko' },
  { x: 11, y: 3, rodzaj: 'budynek', strefa: 'wroga', budynek: 'wieza-obserwacyjna' },
  { x: 47, y: 24, rodzaj: 'budynek', strefa: 'pogranicze', budynek: 'woz' },
  { x: 13, y: 9, rodzaj: 'budynek', strefa: 'wroga', budynek: 'zrodlo' },
  { x: 35, y: 46, rodzaj: 'skrzynia', strefa: 'pogranicze' },
  { x: 35, y: 47, rodzaj: 'surowiec', strefa: 'pogranicze', surowiec: 'jagoda' },
  { x: 34, y: 47, rodzaj: 'artefakt', strefa: 'pogranicze' },
  { x: 25, y: 24, rodzaj: 'budynek', strefa: 'pogranicze', budynek: 'kamienna-wieza' },
  { x: 38, y: 42, rodzaj: 'budynek', strefa: 'pogranicze', budynek: 'portal' },
  { x: 33, y: 23, rodzaj: 'budynek', strefa: 'pogranicze', budynek: 'ranczo' },
  { x: 29, y: 29, rodzaj: 'budynek', strefa: 'pogranicze', budynek: 'wiatrak' },
  { x: 25, y: 9, rodzaj: 'budynek', strefa: 'wroga', budynek: 'wiatrak' },
  { x: 29, y: 23, rodzaj: 'budynek', strefa: 'pogranicze', budynek: 'chatka' },
  { x: 25, y: 30, rodzaj: 'budynek', strefa: 'pogranicze', budynek: 'gniazdo' },
  { x: 13, y: 24, rodzaj: 'budynek', strefa: 'pogranicze', budynek: 'zrodlo' },
  { x: 49, y: 35, rodzaj: 'budynek', strefa: 'pogranicze', budynek: 'chatka' },
  { x: 25, y: 47, rodzaj: 'budynek', strefa: 'dom', budynek: 'ognisko' },
  { x: 18, y: 4, rodzaj: 'skrzynia', strefa: 'wroga' },
  { x: 25, y: 11, rodzaj: 'surowiec', strefa: 'wroga', surowiec: 'jagoda' },
  { x: 26, y: 11, rodzaj: 'skrzynia', strefa: 'wroga' },
  { x: 15, y: 27, rodzaj: 'surowiec', strefa: 'pogranicze', surowiec: 'kamien' },
  { x: 16, y: 27, rodzaj: 'skrzynia', strefa: 'pogranicze' },
  { x: 36, y: 38, rodzaj: 'kopalnia', strefa: 'pogranicze', surowiec: 'jagoda' },
  { x: 11, y: 42, rodzaj: 'skrzynia', strefa: 'dom' },
  { x: 23, y: 40, rodzaj: 'skrzynia', strefa: 'dom' },
  { x: 24, y: 40, rodzaj: 'artefakt', strefa: 'dom' },
  { x: 12, y: 53, rodzaj: 'skrzynia', strefa: 'dom' },
  { x: 17, y: 41, rodzaj: 'kopalnia', strefa: 'dom', surowiec: 'pokeball' },
  { x: 16, y: 36, rodzaj: 'budynek', strefa: 'dom', budynek: 'drzewo-wiedzy' },
  { x: 35, y: 10, rodzaj: 'budynek', strefa: 'wroga', budynek: 'ognisko' },
  { x: 28, y: 4, rodzaj: 'skrzynia', strefa: 'wroga' },
  { x: 29, y: 4, rodzaj: 'artefakt', strefa: 'wroga' },
  { x: 7, y: 29, rodzaj: 'skrzynia', strefa: 'pogranicze' },
  { x: 8, y: 29, rodzaj: 'artefakt', strefa: 'pogranicze' },
  { x: 40, y: 30, rodzaj: 'potwor', strefa: 'pogranicze', sila: 'sredni' },
  { x: 42, y: 36, rodzaj: 'potwor', strefa: 'pogranicze', sila: 'sredni' },
  { x: 34, y: 3, rodzaj: 'potwor', strefa: 'wroga', sila: 'silny' },
  { x: 46, y: 5, rodzaj: 'potwor', strefa: 'wroga', sila: 'silny' },
  { x: 44, y: 4, rodzaj: 'skrzynia', strefa: 'wroga' },
  { x: 45, y: 3, rodzaj: 'surowiec', strefa: 'wroga', surowiec: 'kamien' },
  { x: 47, y: 4, rodzaj: 'artefakt', strefa: 'wroga' },
  { x: 48, y: 4, rodzaj: 'surowiec', strefa: 'wroga', surowiec: 'pokeball' },
  { x: 13, y: 53, rodzaj: 'surowiec', strefa: 'dom', surowiec: 'pokeball' },
  { x: 13, y: 52, rodzaj: 'surowiec', strefa: 'dom', surowiec: 'odlamek' },
  { x: 48, y: 47, rodzaj: 'skrzynia', strefa: 'pogranicze' },
  { x: 48, y: 48, rodzaj: 'artefakt', strefa: 'pogranicze' },
  { x: 49, y: 48, rodzaj: 'surowiec', strefa: 'pogranicze', surowiec: 'odlamek' },
  { x: 3, y: 26, rodzaj: 'skrzynia', strefa: 'pogranicze' },
  { x: 3, y: 27, rodzaj: 'surowiec', strefa: 'pogranicze', surowiec: 'jagoda' },
  { x: 18, y: 27, rodzaj: 'budynek', strefa: 'pogranicze', budynek: 'portal' },
  { x: 44, y: 9, rodzaj: 'budynek', strefa: 'wroga', budynek: 'wieza-obserwacyjna' },
  { x: 39, y: 0, rodzaj: 'budynek', strefa: 'wroga', budynek: 'ognisko' },
  { x: 5, y: 27, rodzaj: 'budynek', strefa: 'pogranicze', budynek: 'wiatrak' },
  { x: 39, y: 48, rodzaj: 'budynek', strefa: 'pogranicze', budynek: 'gniazdo' },
  { x: 8, y: 1, rodzaj: 'budynek', strefa: 'wroga', budynek: 'zrodlo' },
  { x: 3, y: 21, rodzaj: 'budynek', strefa: 'pogranicze', budynek: 'chatka' },
  { x: 49, y: 32, rodzaj: 'budynek', strefa: 'pogranicze', budynek: 'wiatrak' },
  { x: 17, y: 42, rodzaj: 'potwor', strefa: 'dom', sila: 'slaby' },
  { x: 11, y: 35, rodzaj: 'potwor', strefa: 'dom', sila: 'slaby' },
  { x: 8, y: 50, rodzaj: 'potwor', strefa: 'dom', sila: 'slaby' },
  { x: 22, y: 43, rodzaj: 'skrzynia', strefa: 'dom' },
  { x: 23, y: 43, rodzaj: 'surowiec', strefa: 'dom', surowiec: 'pokeball' },
  { x: 31, y: 24, rodzaj: 'skrzynia', strefa: 'pogranicze' },
  { x: 32, y: 24, rodzaj: 'surowiec', strefa: 'pogranicze', surowiec: 'jagoda' },
  { x: 31, y: 23, rodzaj: 'skrzynia', strefa: 'pogranicze' },
  { x: 25, y: 19, rodzaj: 'skrzynia', strefa: 'pogranicze' },
  { x: 25, y: 20, rodzaj: 'surowiec', strefa: 'pogranicze', surowiec: 'pokeball' },
  { x: 26, y: 20, rodzaj: 'surowiec', strefa: 'pogranicze', surowiec: 'odlamek' },
  { x: 5, y: 52, rodzaj: 'kopalnia', strefa: 'dom', surowiec: 'kamien' },
  { x: 6, y: 53, rodzaj: 'surowiec', strefa: 'dom', surowiec: 'kamien' },
  { x: 7, y: 53, rodzaj: 'skrzynia', strefa: 'dom' },
  { x: 7, y: 12, rodzaj: 'potwor', strefa: 'wroga', sila: 'silny' },
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
