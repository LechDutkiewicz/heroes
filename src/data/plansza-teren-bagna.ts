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
  'TTTTTTbbbbbbbbbTTTTTT######.TTTTTbbbbbbbbbbbb~~~~~~TTT',
  'TTTTTTTbbbbbbbbTTTTTTT##.#.#TTTTTbbbbbbbb~~~~~~~~~~~TT',
  'TTTTTTTbbbbbbbbTTTTTTT###..#bTTTTTbb~~bb~~~~~~~~~~~~~T',
  'TTTbbbbbbbb.bbbTTTTTb#bb.b..TTTTTbbbbb~b~~~~....~~~~~~',
  'TTTbbbbbbbbbb..TTTbbbbbb...bbTTTTbbbbbb~~~~...T...~~~~',
  'TTTTbbbbbbbb.b..TT...bbb..bbTTbbbbbbbbb~~~.........~~~',
  'TTTbb~~~~bbbbbb.....bbbbb.b.bbbbbbbbb~~~~~.........~~~',
  'TTTbbb~~~b~bbb.b.....b=b...bbbbbbbbbb~~~~.T........~~~',
  'TTTbbb~~b~~bbb..b.....b=...bbbbbbbbbbb~~~.....=....~~~',
  'TTTTbb~b~~~~bb~.........=..bbbbbbbbbbb~~~..T...=....~~',
  'TTTbbbbbb~~b~bbb..b......=.bbbbb~~~bb~~~~~.....=.T..~~',
  'TTTTb~bbb~~bbbbbbbbbb....=bbb~~bb~bb~b~~~~..T..=...~~~',
  'TTTbb~~bbb~~bbbbbbbbbb...=b.bbbb~b~~~bb~~~~....=..~~~~',
  'TTTbbbbbbbbbbbbbbb~bbbbb..=bbbbbb~~bbbbbb~~~~,,=~~~~TT',
  'b#bbbbbbbbbbbbbb~~bbbbbb..=bbbbbb~~bbbbbb~~~~,=~~~~~TT',
  '#b##bbbbbbb~~bb~~bbbbbbbbb=bbbTTTTbbbbbbb~~b~,=~~~TTTT',
  '#b#TTbbbbbbb~~~~~~~bbbbbbb=bbTTTTTbbbbb~~bbb~,=~~~TTTT',
  '##TTTbbb.bbb~~~~~~bbbbbbb~=bbbTTTbbbbbbb~b~~b,=~~~TTTT',
  'TTTbbb...bb~~b~~~~bbbbb.bb=bbT..bbbbbbbbbb~~bb=b~bbTTT',
  'TTTbbb....~bbb~~~bbbbb....b=TT...bbbb~~bb~b~~b=bbbbTTT',
  'TTTbbbbbbbbbbbb~b~b~~~~~bb.=..b..bbbbb~~b~~~bb=bbbTTTT',
  'TTT~bbbbb~bbbbbb~bbbbb~b..b=b.bbbbbbbbb~~bb~bb=bb.TTTT',
  'TTTbbbbbbbbbbbbbbbbbb~.~bbb=bbbbb~~bbbb~~bbbb=bb..TTTT',
  'TTTbbbbbbbbbbbbbbbbb~b..bbb=bbbbb~~bbbb~bb===bbbbb.TTT',
  'TTTTTTbbbbbbb~~bbbbb...~bbb==bbbbbbbb~~bb=~~b~b.bb.TTT',
  'TTTTTTbbbbbb~~~~bb=========bb=bbbbbbb~~~~=b~~~bbbbbTTT',
  'TTTTbbbbbbbb~~~b==~bb....bbbbb==bb.bbbb~=b~~~~bbbb~TTT',
  'TTTTbbbbbbb...~=~b~bbb.TTTTbbbbb=bbbbbb=b~~b~~bb~~bTTT',
  'TTTbb~bbbbbb===~~~bbbTTTTTTTbbbbb===.b=bbbbbbbbbbb~~TT',
  'TT.bbbbbbbbb=.bb~b~bbTTTTTTb~bbbb...===bbbbbbbb~~~~TTT',
  'TTb...bbbbbb=~bbbb~b~bTbbbbbbbbb~b~~~b=bbbbbbbb.~~bTTT',
  'TTbb..bbbbb.=~~~~~~~~bbbbbbbbbbbbb~~TT=bbbbbbbb.bbbTTT',
  '~~~..bb~~~~.=~~~~~~~~~~bbbbbbbbb~~b~TT=bbbbb~b..bb~TTT',
  '~~~~~~~~~~~.=~~~~~~~~~~bbbbbbbbbbbbbb=b~~~~~~~b~~bTTTT',
  '~~~~~~~~~~~.=~bbbbbb~~~bbbbbbbbbbbbbb=~~~~~~~~bb~bTTTT',
  '~~~~~~~~~~~.=bbbbbbb~~~~bbb~~bbbbbbbbb=~~~~~~~bbbbbTTT',
  'TTT~~~~~~TTb=bbb..TT~~....b~~~bbbbbbbb=bbb~b~bbbbbbTTT',
  'TTTT######Tb=bb...T~~....bb~~bbbbbbbbb=bbbbb~~~~~bTTTT',
  'TTTT######Tb=b...bb~~....bb~~~bb.bbbb=bbbbb~bb~~~bTTTT',
  'TTTT######b.=..bTb.~~....bbb~~...====bbbbb~~~bbbbbTTTT',
  'TTTT######bb=..TTT~~....bbb~b~..=.bbbbbbbb~b~bbbbbTTTT',
  'TTTT######b=.TTTTb~~....bbbb~~.=..bbbbbbbb~~bbb~~bbTTT',
  'TTTb######b=TTTT.b~~....bbbb~b=.b.bbbbbbbbbb~b~~b~~TTT',
  'TTbb######.=TTT...~~....bbbbb=...bbbbbbbbbbb~~~~~~TTTT',
  'TT..######.=TT===============bb..bbbbbbbbbbb~~~~~~~TTT',
  'TTT.b.bbbb.b==.b..~~~..~~bbbbb..bbbbbb~~bbbb~b~b~bbTTT',
  'TTT....bbbbbb=bbbT~~T~~...bbbb...TTb~~~~bbbbbb~b~bbTTT',
  'TTT.bb......==..bb~~..~.bbbbb...TTT~b~bbbbbbbbbbbbbbTT',
  'TTTTbb....==.=...b~~....bbb~~....TTbb~bbbb~~~bbbbbbTTT',
  'TTTTbbb.......=..bb~~....bb~~~...bb~bbbbbbb~~~bbb..TTT',
  'TTTT#####b....=####~~....bb~~~~..bbbbbbbbTTT~bbbTTTTTT',
  'TTTT#####~~..=.####~~...TTT~TT.TTTTTbbbbbTTTT~TTTTTTTT',
  'TTTT#####~~..=.#####~~..TTTTTTTTTTTTTbbbTTTTTTTTTTTTTT',
  'TTTT#####b...=.#####~~...TTTTTTTTTTTbbbbTTTTTTTTTTTTTT',
];

export const PUNKTY = {
  'start': { x: 13, y: 46 },
  'zamek gracza': { x: 10, y: 48 },
  'rozstaje doliny': { x: 12, y: 40 },
  'grobla poludnie': { x: 12, y: 38 },
  'grobla polnoc': { x: 12, y: 28 },
  'trzesawisko': { x: 27, y: 24 },
  'brod zachod': { x: 14, y: 44 },
  'brod wschod': { x: 27, y: 44 },
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
  { x: 48, y: 11, rodzaj: 'surowiec', strefa: 'wroga', surowiec: 'kamien' },
  { x: 11, y: 51, rodzaj: 'kopalnia', strefa: 'dom', surowiec: 'jagoda' },
  { x: 14, y: 45, rodzaj: 'kopalnia', strefa: 'dom', surowiec: 'odlamek' },
  { x: 17, y: 47, rodzaj: 'budynek', strefa: 'dom', budynek: 'drzewo-wiedzy' },
  { x: 16, y: 35, rodzaj: 'budynek', strefa: 'dom', budynek: 'zrodlo' },
  { x: 14, y: 47, rodzaj: 'surowiec', strefa: 'dom', surowiec: 'pokeball' },
  { x: 16, y: 47, rodzaj: 'surowiec', strefa: 'dom', surowiec: 'jagoda' },
  { x: 16, y: 45, rodzaj: 'surowiec', strefa: 'dom', surowiec: 'jagoda' },
  { x: 16, y: 46, rodzaj: 'skrzynia', strefa: 'dom' },
  { x: 17, y: 34, rodzaj: 'artefakt', strefa: 'dom' },
  { x: 18, y: 35, rodzaj: 'potwor', strefa: 'dom', sila: 'slaby' },
  { x: 3, y: 46, rodzaj: 'surowiec', strefa: 'dom', surowiec: 'odlamek' },
  { x: 13, y: 37, rodzaj: 'surowiec', strefa: 'dom', surowiec: 'odlamek' },
  { x: 2, y: 43, rodzaj: 'skrzynia', strefa: 'dom' },
  { x: 18, y: 38, rodzaj: 'kopalnia', strefa: 'dom', surowiec: 'pokeball' },
  { x: 17, y: 39, rodzaj: 'potwor', strefa: 'dom', sila: 'slaby' },
  { x: 11, y: 37, rodzaj: 'kopalnia', strefa: 'dom', surowiec: 'jagoda' },
  { x: 14, y: 34, rodzaj: 'surowiec', strefa: 'dom', surowiec: 'odlamek' },
  { x: 11, y: 38, rodzaj: 'surowiec', strefa: 'dom', surowiec: 'pokeball' },
  { x: 16, y: 36, rodzaj: 'surowiec', strefa: 'dom', surowiec: 'pokeball' },
  { x: 15, y: 34, rodzaj: 'surowiec', strefa: 'dom', surowiec: 'jagoda' },
  { x: 14, y: 36, rodzaj: 'skrzynia', strefa: 'dom' },
  { x: 4, y: 46, rodzaj: 'skrzynia', strefa: 'dom' },
  { x: 2, y: 44, rodzaj: 'artefakt', strefa: 'dom' },
  { x: 3, y: 45, rodzaj: 'potwor', strefa: 'dom', sila: 'slaby' },
  { x: 15, y: 36, rodzaj: 'potwor', strefa: 'dom', sila: 'slaby' },
  { x: 14, y: 39, rodzaj: 'potwor', strefa: 'dom', sila: 'slaby' },
  { x: 15, y: 35, rodzaj: 'budynek', strefa: 'dom', budynek: 'wiatrak' },
  { x: 3, y: 47, rodzaj: 'budynek', strefa: 'dom', budynek: 'oboz-treningowy' },
  { x: 14, y: 37, rodzaj: 'budynek', strefa: 'dom', budynek: 'ognisko' },
  { x: 16, y: 42, rodzaj: 'budynek', strefa: 'dom', budynek: 'drzewo-wiedzy' },
  { x: 15, y: 37, rodzaj: 'budynek', strefa: 'dom', budynek: 'zrodlo' },
  { x: 17, y: 42, rodzaj: 'budynek', strefa: 'dom', budynek: 'ranczo' },
  { x: 4, y: 47, rodzaj: 'budynek', strefa: 'dom', budynek: 'gniazdo' },
  { x: 18, y: 34, rodzaj: 'budynek', strefa: 'dom', budynek: 'chatka' },
  { x: 15, y: 38, rodzaj: 'budynek', strefa: 'dom', budynek: 'woz' },
  { x: 11, y: 33, rodzaj: 'potwor', strefa: 'pogranicze', sila: 'sredni' },
  { x: 20, y: 44, rodzaj: 'potwor', strefa: 'pogranicze', sila: 'sredni' },
  { x: 25, y: 42, rodzaj: 'surowiec', strefa: 'pogranicze', surowiec: 'jagoda' },
  { x: 5, y: 32, rodzaj: 'surowiec', strefa: 'pogranicze', surowiec: 'jagoda' },
  { x: 41, y: 28, rodzaj: 'surowiec', strefa: 'pogranicze', surowiec: 'odlamek' },
  { x: 17, y: 22, rodzaj: 'surowiec', strefa: 'pogranicze', surowiec: 'kamien' },
  { x: 28, y: 27, rodzaj: 'surowiec', strefa: 'pogranicze', surowiec: 'jagoda' },
  { x: 24, y: 39, rodzaj: 'surowiec', strefa: 'pogranicze', surowiec: 'jagoda' },
  { x: 41, y: 17, rodzaj: 'surowiec', strefa: 'pogranicze', surowiec: 'kamien' },
  { x: 32, y: 42, rodzaj: 'surowiec', strefa: 'pogranicze', surowiec: 'jagoda' },
  { x: 27, y: 17, rodzaj: 'surowiec', strefa: 'pogranicze', surowiec: 'jagoda' },
  { x: 46, y: 33, rodzaj: 'surowiec', strefa: 'pogranicze', surowiec: 'odlamek' },
  { x: 35, y: 45, rodzaj: 'surowiec', strefa: 'pogranicze', surowiec: 'odlamek' },
  { x: 22, y: 37, rodzaj: 'surowiec', strefa: 'pogranicze', surowiec: 'pokeball' },
  { x: 40, y: 51, rodzaj: 'surowiec', strefa: 'pogranicze', surowiec: 'pokeball' },
  { x: 28, y: 15, rodzaj: 'surowiec', strefa: 'pogranicze', surowiec: 'odlamek' },
  { x: 30, y: 48, rodzaj: 'surowiec', strefa: 'pogranicze', surowiec: 'jagoda' },
  { x: 34, y: 24, rodzaj: 'surowiec', strefa: 'pogranicze', surowiec: 'odlamek' },
  { x: 34, y: 27, rodzaj: 'surowiec', strefa: 'pogranicze', surowiec: 'pokeball' },
  { x: 4, y: 27, rodzaj: 'surowiec', strefa: 'pogranicze', surowiec: 'pokeball' },
  { x: 46, y: 25, rodzaj: 'surowiec', strefa: 'pogranicze', surowiec: 'kamien' },
  { x: 26, y: 23, rodzaj: 'surowiec', strefa: 'pogranicze', surowiec: 'jagoda' },
  { x: 33, y: 27, rodzaj: 'surowiec', strefa: 'pogranicze', surowiec: 'kamien' },
  { x: 6, y: 32, rodzaj: 'surowiec', strefa: 'pogranicze', surowiec: 'odlamek' },
  { x: 5, y: 18, rodzaj: 'surowiec', strefa: 'pogranicze', surowiec: 'pokeball' },
  { x: 19, y: 13, rodzaj: 'surowiec', strefa: 'pogranicze', surowiec: 'jagoda' },
  { x: 49, y: 46, rodzaj: 'kopalnia', strefa: 'pogranicze', surowiec: 'kamien' },
  { x: 46, y: 32, rodzaj: 'kopalnia', strefa: 'pogranicze', surowiec: 'odlamek' },
  { x: 36, y: 14, rodzaj: 'kopalnia', strefa: 'pogranicze', surowiec: 'pokeball' },
  { x: 22, y: 23, rodzaj: 'kopalnia', strefa: 'pogranicze', surowiec: 'jagoda' },
  { x: 47, y: 21, rodzaj: 'kopalnia', strefa: 'pogranicze', surowiec: 'kamien' },
  { x: 39, y: 30, rodzaj: 'kopalnia', strefa: 'pogranicze', surowiec: 'pokeball' },
  { x: 34, y: 19, rodzaj: 'kopalnia', strefa: 'pogranicze', surowiec: 'odlamek' },
  { x: 48, y: 47, rodzaj: 'potwor', strefa: 'pogranicze', sila: 'sredni' },
  { x: 35, y: 15, rodzaj: 'potwor', strefa: 'pogranicze', sila: 'sredni' },
  { x: 46, y: 22, rodzaj: 'potwor', strefa: 'pogranicze', sila: 'sredni' },
  { x: 40, y: 31, rodzaj: 'potwor', strefa: 'pogranicze', sila: 'sredni' },
  { x: 49, y: 37, rodzaj: 'skrzynia', strefa: 'pogranicze' },
  { x: 34, y: 44, rodzaj: 'skrzynia', strefa: 'pogranicze' },
  { x: 30, y: 13, rodzaj: 'skrzynia', strefa: 'pogranicze' },
  { x: 28, y: 16, rodzaj: 'skrzynia', strefa: 'pogranicze' },
  { x: 26, y: 30, rodzaj: 'skrzynia', strefa: 'pogranicze' },
  { x: 32, y: 25, rodzaj: 'skrzynia', strefa: 'pogranicze' },
  { x: 6, y: 23, rodzaj: 'skrzynia', strefa: 'pogranicze' },
  { x: 32, y: 34, rodzaj: 'skrzynia', strefa: 'pogranicze' },
  { x: 16, y: 24, rodzaj: 'skrzynia', strefa: 'pogranicze' },
  { x: 28, y: 32, rodzaj: 'skrzynia', strefa: 'pogranicze' },
  { x: 32, y: 37, rodzaj: 'skrzynia', strefa: 'pogranicze' },
  { x: 23, y: 32, rodzaj: 'skrzynia', strefa: 'pogranicze' },
  { x: 24, y: 35, rodzaj: 'artefakt', strefa: 'pogranicze' },
  { x: 28, y: 20, rodzaj: 'artefakt', strefa: 'pogranicze' },
  { x: 31, y: 27, rodzaj: 'artefakt', strefa: 'pogranicze' },
  { x: 12, y: 14, rodzaj: 'artefakt', strefa: 'pogranicze' },
  { x: 24, y: 36, rodzaj: 'potwor', strefa: 'pogranicze', sila: 'sredni' },
  { x: 27, y: 21, rodzaj: 'potwor', strefa: 'pogranicze', sila: 'sredni' },
  { x: 32, y: 28, rodzaj: 'potwor', strefa: 'pogranicze', sila: 'sredni' },
  { x: 11, y: 14, rodzaj: 'potwor', strefa: 'pogranicze', sila: 'sredni' },
  { x: 27, y: 32, rodzaj: 'potwor', strefa: 'pogranicze', sila: 'sredni' },
  { x: 25, y: 48, rodzaj: 'potwor', strefa: 'pogranicze', sila: 'sredni' },
  { x: 38, y: 23, rodzaj: 'potwor', strefa: 'pogranicze', sila: 'sredni' },
  { x: 1, y: 16, rodzaj: 'artefakt', strefa: 'pogranicze' },
  { x: 3, y: 14, rodzaj: 'potwor', strefa: 'pogranicze', sila: 'sredni' },
  { x: 47, y: 45, rodzaj: 'skrzynia', strefa: 'pogranicze' },
  { x: 45, y: 48, rodzaj: 'artefakt', strefa: 'pogranicze' },
  { x: 45, y: 50, rodzaj: 'skrzynia', strefa: 'pogranicze' },
  { x: 51, y: 47, rodzaj: 'artefakt', strefa: 'pogranicze' },
  { x: 45, y: 46, rodzaj: 'potwor', strefa: 'pogranicze', sila: 'silny' },
  { x: 50, y: 41, rodzaj: 'surowiec', strefa: 'pogranicze', surowiec: 'pokeball' },
  { x: 49, y: 39, rodzaj: 'potwor', strefa: 'pogranicze', sila: 'sredni' },
  { x: 49, y: 26, rodzaj: 'budynek', strefa: 'pogranicze', budynek: 'wieza-obserwacyjna' },
  { x: 20, y: 26, rodzaj: 'budynek', strefa: 'pogranicze', budynek: 'ranczo' },
  { x: 46, y: 26, rodzaj: 'budynek', strefa: 'pogranicze', budynek: 'gniazdo' },
  { x: 43, y: 45, rodzaj: 'budynek', strefa: 'pogranicze', budynek: 'arena' },
  { x: 27, y: 34, rodzaj: 'budynek', strefa: 'pogranicze', budynek: 'wiatrak' },
  { x: 7, y: 25, rodzaj: 'budynek', strefa: 'pogranicze', budynek: 'zrodlo' },
  { x: 10, y: 23, rodzaj: 'budynek', strefa: 'pogranicze', budynek: 'chatka' },
  { x: 9, y: 28, rodzaj: 'budynek', strefa: 'pogranicze', budynek: 'woz' },
  { x: 24, y: 50, rodzaj: 'budynek', strefa: 'pogranicze', budynek: 'drzewo-wiedzy' },
  { x: 10, y: 27, rodzaj: 'budynek', strefa: 'pogranicze', budynek: 'kamienna-wieza' },
  { x: 24, y: 13, rodzaj: 'budynek', strefa: 'pogranicze', budynek: 'ognisko' },
  { x: 21, y: 38, rodzaj: 'budynek', strefa: 'pogranicze', budynek: 'oboz-treningowy' },
  { x: 16, y: 30, rodzaj: 'budynek', strefa: 'pogranicze', budynek: 'wieza-obserwacyjna' },
  { x: 40, y: 47, rodzaj: 'budynek', strefa: 'pogranicze', budynek: 'ranczo' },
  { x: 43, y: 37, rodzaj: 'budynek', strefa: 'pogranicze', budynek: 'gniazdo' },
  { x: 37, y: 30, rodzaj: 'budynek', strefa: 'pogranicze', budynek: 'arena' },
  { x: 22, y: 18, rodzaj: 'budynek', strefa: 'pogranicze', budynek: 'wiatrak' },
  { x: 37, y: 53, rodzaj: 'budynek', strefa: 'pogranicze', budynek: 'zrodlo' },
  { x: 23, y: 53, rodzaj: 'budynek', strefa: 'pogranicze', budynek: 'chatka' },
  { x: 33, y: 29, rodzaj: 'budynek', strefa: 'pogranicze', budynek: 'woz' },
  { x: 13, y: 13, rodzaj: 'budynek', strefa: 'pogranicze', budynek: 'drzewo-wiedzy' },
  { x: 31, y: 37, rodzaj: 'budynek', strefa: 'pogranicze', budynek: 'kamienna-wieza' },
  { x: 42, y: 31, rodzaj: 'budynek', strefa: 'pogranicze', budynek: 'ognisko' },
  { x: 32, y: 31, rodzaj: 'budynek', strefa: 'pogranicze', budynek: 'oboz-treningowy' },
  { x: 46, y: 40, rodzaj: 'budynek', strefa: 'pogranicze', budynek: 'portal' },
  { x: 23, y: 14, rodzaj: 'budynek', strefa: 'pogranicze', budynek: 'portal' },
  { x: 31, y: 19, rodzaj: 'jasnowidz', strefa: 'pogranicze' },
  { x: 30, y: 9, rodzaj: 'surowiec', strefa: 'wroga', surowiec: 'pokeball' },
  { x: 45, y: 8, rodzaj: 'surowiec', strefa: 'wroga', surowiec: 'pokeball' },
  { x: 41, y: 8, rodzaj: 'surowiec', strefa: 'wroga', surowiec: 'kamien' },
  { x: 46, y: 3, rodzaj: 'surowiec', strefa: 'wroga', surowiec: 'kamien' },
  { x: 13, y: 5, rodzaj: 'surowiec', strefa: 'wroga', surowiec: 'kamien' },
  { x: 39, y: 2, rodzaj: 'surowiec', strefa: 'wroga', surowiec: 'kamien' },
  { x: 28, y: 6, rodzaj: 'surowiec', strefa: 'wroga', surowiec: 'odlamek' },
  { x: 33, y: 6, rodzaj: 'surowiec', strefa: 'wroga', surowiec: 'odlamek' },
  { x: 36, y: 7, rodzaj: 'kopalnia', strefa: 'wroga', surowiec: 'kamien' },
  { x: 13, y: 4, rodzaj: 'kopalnia', strefa: 'wroga', surowiec: 'pokeball' },
  { x: 49, y: 9, rodzaj: 'kopalnia', strefa: 'wroga', surowiec: 'odlamek' },
  { x: 35, y: 8, rodzaj: 'potwor', strefa: 'wroga', sila: 'silny' },
  { x: 12, y: 5, rodzaj: 'potwor', strefa: 'wroga', sila: 'silny' },
  { x: 47, y: 5, rodzaj: 'skrzynia', strefa: 'wroga' },
  { x: 4, y: 11, rodzaj: 'skrzynia', strefa: 'wroga' },
  { x: 3, y: 4, rodzaj: 'skrzynia', strefa: 'wroga' },
  { x: 7, y: 0, rodzaj: 'skrzynia', strefa: 'wroga' },
  { x: 46, y: 6, rodzaj: 'potwor', strefa: 'wroga', sila: 'silny' },
  { x: 3, y: 12, rodzaj: 'potwor', strefa: 'wroga', sila: 'silny' },
  { x: 4, y: 5, rodzaj: 'potwor', strefa: 'wroga', sila: 'silny' },
  { x: 8, y: 1, rodzaj: 'potwor', strefa: 'wroga', sila: 'silny' },
  { x: 18, y: 12, rodzaj: 'potwor', strefa: 'wroga', sila: 'silny' },
  { x: 13, y: 0, rodzaj: 'potwor', strefa: 'wroga', sila: 'silny' },
  { x: 10, y: 4, rodzaj: 'budynek', strefa: 'wroga', budynek: 'osrodek-ewolucji' },
  { x: 18, y: 10, rodzaj: 'budynek', strefa: 'wroga', budynek: 'arena' },
  { x: 36, y: 1, rodzaj: 'budynek', strefa: 'wroga', budynek: 'kamienna-wieza' },
  { x: 40, y: 1, rodzaj: 'budynek', strefa: 'wroga', budynek: 'drzewo-wiedzy' },
  { x: 29, y: 10, rodzaj: 'budynek', strefa: 'wroga', budynek: 'gniazdo' },
  { x: 15, y: 11, rodzaj: 'budynek', strefa: 'wroga', budynek: 'zrodlo' },
  { x: 47, y: 8, rodzaj: 'potwor', strefa: 'wroga', sila: 'silny' },
];

/** Ustawienia misji na tej planszy — patrz `UstawieniaPlanszy` w `src/data/mapy.ts`. */
export const USTAWIENIA = {
  "wrog": "aktywny",
  "nazwyZamkowWroga": [
    "Warownia na Grobli"
  ],
  "zestaw": "bagno",
  "odkryte": [
    {
      "x": 46,
      "y": 8,
      "promien": 7
    },
    {
      "x": 25,
      "y": 35,
      "promien": 3
    },
    {
      "x": 25,
      "y": 53,
      "promien": 3
    },
    {
      "x": 22,
      "y": 38,
      "promien": 3
    },
    {
      "x": 4,
      "y": 37,
      "promien": 3
    }
  ],
  "znajdzki": 0.8,
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
      "plik": "gora-1",
      "x": 6.3,
      "y": 45.4,
      "szer": 9.0,
      "pokrywa": [
        4,
        41,
        9,
        44
      ]
    },
    {
      "plik": "gora-4",
      "x": 6.3,
      "y": 54.4,
      "szer": 7.4,
      "pokrywa": [
        4,
        50,
        8,
        53
      ]
    },
    {
      "plik": "gora-3",
      "x": 17.4,
      "y": 54.4,
      "szer": 6.0,
      "odbij": true,
      "pokrywa": [
        15,
        50,
        18,
        53
      ]
    }
  ],
  "skalaBudowli": 1.2,
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
