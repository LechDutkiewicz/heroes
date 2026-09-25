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
  '~~~~~~~~~~~.=~......~~~.....bbbbbbbbb=~~~~~~~~bb~bTTTT',
  '~~~~~~~~~~~.=.......~~~~...~~bbbbbbbbb=~~~~~~~bbbbbTTT',
  'TTT~~~~~~TT.=.....TT~~.....~~~bbbbbbbb=bbb~b~bbbbbbTTT',
  'TTTT######T.=.....T~~...TTT~~bbbbbbbbb=bbbbb~~~~~bTTTT',
  'TTTT######T.=......~~...TTT~~~bb.bbbb=bbbbb~bb~~~bTTTT',
  'TTTT######..=...T..~~...TTTb~~...====bbbbb~~~bbbbbTTTT',
  'TTTT######..=..TTT~~...TTTb~b~..=.bbbbbbbb~b~bbbbbTTTT',
  'TTTT######.=.TTTT.~~...TTTbb~~.=..bbbbbbbb~~bbb~~bbTTT',
  'TTT.######.=TTTT..~~......bb~b=.b.bbbbbbbbbb~b~~b~~TTT',
  'TT..######.=TTT...~~......bbb=...bbbbbbbbbbb~~~~~~TTTT',
  'TT..######.=TT===============bb..bbbbbbbbbbb~~~~~~~TTT',
  'TTT.........==....~~......bbbb..bbbbbb~~bbbb~b~b~bbTTT',
  'TTT..........=...T~~......bbbb...TTb~~~~bbbbbb~b~bbTTT',
  'TTT........===....~~...TTTbbb...TTT~b~bbbbbbbbbbbbbbTT',
  'TTTT......=..=....~~...TTTb~~....TTbb~bbbb~~~bbbbbbTTT',
  'TTTT..........=....~~...TTT~~~...bb~bbbbbbb~~~bbb..TTT',
  'TTTT#####.....=####~~...TTT~~~~..bbbbbbbbTTT~bbbTTTTTT',
  'TTTT#####~~..=.####~~...TTT~TT.TTTTTbbbbbTTTT~TTTTTTTT',
  'TTTT#####~~..=.#####~~...TTTTTTTTTTTTbbbTTTTTTTTTTTTTT',
  'TTTT#####....=.#####~~.....TTTTTTTTTbbbbTTTTTTTTTTTTTT',
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
  { x: 23, y: 43, rodzaj: 'surowiec', strefa: 'pogranicze', surowiec: 'jagoda' },
  { x: 5, y: 32, rodzaj: 'surowiec', strefa: 'pogranicze', surowiec: 'jagoda' },
  { x: 41, y: 28, rodzaj: 'surowiec', strefa: 'pogranicze', surowiec: 'odlamek' },
  { x: 17, y: 22, rodzaj: 'surowiec', strefa: 'pogranicze', surowiec: 'kamien' },
  { x: 28, y: 27, rodzaj: 'surowiec', strefa: 'pogranicze', surowiec: 'jagoda' },
  { x: 41, y: 39, rodzaj: 'surowiec', strefa: 'pogranicze', surowiec: 'jagoda' },
  { x: 41, y: 17, rodzaj: 'surowiec', strefa: 'pogranicze', surowiec: 'kamien' },
  { x: 28, y: 43, rodzaj: 'surowiec', strefa: 'pogranicze', surowiec: 'jagoda' },
  { x: 27, y: 17, rodzaj: 'surowiec', strefa: 'pogranicze', surowiec: 'jagoda' },
  { x: 46, y: 33, rodzaj: 'surowiec', strefa: 'pogranicze', surowiec: 'odlamek' },
  { x: 31, y: 46, rodzaj: 'surowiec', strefa: 'pogranicze', surowiec: 'odlamek' },
  { x: 23, y: 37, rodzaj: 'surowiec', strefa: 'pogranicze', surowiec: 'pokeball' },
  { x: 25, y: 26, rodzaj: 'surowiec', strefa: 'pogranicze', surowiec: 'jagoda' },
  { x: 40, y: 43, rodzaj: 'surowiec', strefa: 'pogranicze', surowiec: 'odlamek' },
  { x: 36, y: 49, rodzaj: 'surowiec', strefa: 'pogranicze', surowiec: 'jagoda' },
  { x: 33, y: 24, rodzaj: 'surowiec', strefa: 'pogranicze', surowiec: 'odlamek' },
  { x: 34, y: 27, rodzaj: 'surowiec', strefa: 'pogranicze', surowiec: 'pokeball' },
  { x: 4, y: 27, rodzaj: 'surowiec', strefa: 'pogranicze', surowiec: 'pokeball' },
  { x: 36, y: 25, rodzaj: 'surowiec', strefa: 'pogranicze', surowiec: 'kamien' },
  { x: 25, y: 23, rodzaj: 'surowiec', strefa: 'pogranicze', surowiec: 'jagoda' },
  { x: 33, y: 27, rodzaj: 'surowiec', strefa: 'pogranicze', surowiec: 'kamien' },
  { x: 6, y: 32, rodzaj: 'surowiec', strefa: 'pogranicze', surowiec: 'odlamek' },
  { x: 4, y: 18, rodzaj: 'surowiec', strefa: 'pogranicze', surowiec: 'pokeball' },
  { x: 19, y: 13, rodzaj: 'surowiec', strefa: 'pogranicze', surowiec: 'jagoda' },
  { x: 46, y: 32, rodzaj: 'kopalnia', strefa: 'pogranicze', surowiec: 'kamien' },
  { x: 36, y: 14, rodzaj: 'kopalnia', strefa: 'pogranicze', surowiec: 'odlamek' },
  { x: 21, y: 23, rodzaj: 'kopalnia', strefa: 'pogranicze', surowiec: 'pokeball' },
  { x: 47, y: 21, rodzaj: 'kopalnia', strefa: 'pogranicze', surowiec: 'jagoda' },
  { x: 43, y: 30, rodzaj: 'kopalnia', strefa: 'pogranicze', surowiec: 'kamien' },
  { x: 33, y: 19, rodzaj: 'kopalnia', strefa: 'pogranicze', surowiec: 'pokeball' },
  { x: 26, y: 20, rodzaj: 'kopalnia', strefa: 'pogranicze', surowiec: 'odlamek' },
  { x: 20, y: 24, rodzaj: 'potwor', strefa: 'pogranicze', sila: 'sredni' },
  { x: 42, y: 31, rodzaj: 'potwor', strefa: 'pogranicze', sila: 'sredni' },
  { x: 34, y: 20, rodzaj: 'potwor', strefa: 'pogranicze', sila: 'sredni' },
  { x: 30, y: 39, rodzaj: 'skrzynia', strefa: 'pogranicze' },
  { x: 25, y: 46, rodzaj: 'skrzynia', strefa: 'pogranicze' },
  { x: 30, y: 13, rodzaj: 'skrzynia', strefa: 'pogranicze' },
  { x: 25, y: 16, rodzaj: 'skrzynia', strefa: 'pogranicze' },
  { x: 4, y: 31, rodzaj: 'skrzynia', strefa: 'pogranicze' },
  { x: 5, y: 26, rodzaj: 'skrzynia', strefa: 'pogranicze' },
  { x: 13, y: 23, rodzaj: 'skrzynia', strefa: 'pogranicze' },
  { x: 32, y: 35, rodzaj: 'skrzynia', strefa: 'pogranicze' },
  { x: 26, y: 24, rodzaj: 'skrzynia', strefa: 'pogranicze' },
  { x: 25, y: 33, rodzaj: 'skrzynia', strefa: 'pogranicze' },
  { x: 33, y: 38, rodzaj: 'skrzynia', strefa: 'pogranicze' },
  { x: 43, y: 32, rodzaj: 'skrzynia', strefa: 'pogranicze' },
  { x: 48, y: 35, rodzaj: 'artefakt', strefa: 'pogranicze' },
  { x: 32, y: 20, rodzaj: 'artefakt', strefa: 'pogranicze' },
  { x: 6, y: 28, rodzaj: 'artefakt', strefa: 'pogranicze' },
  { x: 12, y: 14, rodzaj: 'artefakt', strefa: 'pogranicze' },
  { x: 47, y: 34, rodzaj: 'potwor', strefa: 'pogranicze', sila: 'sredni' },
  { x: 31, y: 21, rodzaj: 'potwor', strefa: 'pogranicze', sila: 'sredni' },
  { x: 7, y: 28, rodzaj: 'potwor', strefa: 'pogranicze', sila: 'sredni' },
  { x: 11, y: 14, rodzaj: 'potwor', strefa: 'pogranicze', sila: 'sredni' },
  { x: 49, y: 49, rodzaj: 'potwor', strefa: 'pogranicze', sila: 'sredni' },
  { x: 6, y: 24, rodzaj: 'potwor', strefa: 'pogranicze', sila: 'sredni' },
  { x: 37, y: 37, rodzaj: 'potwor', strefa: 'pogranicze', sila: 'sredni' },
  { x: 1, y: 16, rodzaj: 'skrzynia', strefa: 'pogranicze' },
  { x: 3, y: 14, rodzaj: 'potwor', strefa: 'pogranicze', sila: 'sredni' },
  { x: 47, y: 50, rodzaj: 'artefakt', strefa: 'pogranicze' },
  { x: 50, y: 49, rodzaj: 'artefakt', strefa: 'pogranicze' },
  { x: 45, y: 48, rodzaj: 'skrzynia', strefa: 'pogranicze' },
  { x: 50, y: 48, rodzaj: 'artefakt', strefa: 'pogranicze' },
  { x: 45, y: 46, rodzaj: 'potwor', strefa: 'pogranicze', sila: 'silny' },
  { x: 50, y: 41, rodzaj: 'surowiec', strefa: 'pogranicze', surowiec: 'pokeball' },
  { x: 49, y: 39, rodzaj: 'potwor', strefa: 'pogranicze', sila: 'sredni' },
  { x: 20, y: 27, rodzaj: 'budynek', strefa: 'pogranicze', budynek: 'wieza-obserwacyjna' },
  { x: 34, y: 34, rodzaj: 'budynek', strefa: 'pogranicze', budynek: 'ranczo' },
  { x: 27, y: 25, rodzaj: 'budynek', strefa: 'pogranicze', budynek: 'gniazdo' },
  { x: 12, y: 27, rodzaj: 'budynek', strefa: 'pogranicze', budynek: 'arena' },
  { x: 24, y: 13, rodzaj: 'budynek', strefa: 'pogranicze', budynek: 'wiatrak' },
  { x: 39, y: 39, rodzaj: 'budynek', strefa: 'pogranicze', budynek: 'zrodlo' },
  { x: 31, y: 30, rodzaj: 'budynek', strefa: 'pogranicze', budynek: 'chatka' },
  { x: 23, y: 49, rodzaj: 'budynek', strefa: 'pogranicze', budynek: 'woz' },
  { x: 38, y: 39, rodzaj: 'budynek', strefa: 'pogranicze', budynek: 'drzewo-wiedzy' },
  { x: 8, y: 25, rodzaj: 'budynek', strefa: 'pogranicze', budynek: 'kamienna-wieza' },
  { x: 8, y: 31, rodzaj: 'budynek', strefa: 'pogranicze', budynek: 'ognisko' },
  { x: 19, y: 18, rodzaj: 'budynek', strefa: 'pogranicze', budynek: 'oboz-treningowy' },
  { x: 2, y: 30, rodzaj: 'budynek', strefa: 'pogranicze', budynek: 'wieza-obserwacyjna' },
  { x: 13, y: 13, rodzaj: 'budynek', strefa: 'pogranicze', budynek: 'ranczo' },
  { x: 38, y: 38, rodzaj: 'budynek', strefa: 'pogranicze', budynek: 'gniazdo' },
  { x: 28, y: 32, rodzaj: 'budynek', strefa: 'pogranicze', budynek: 'arena' },
  { x: 48, y: 32, rodzaj: 'budynek', strefa: 'pogranicze', budynek: 'wiatrak' },
  { x: 24, y: 43, rodzaj: 'budynek', strefa: 'pogranicze', budynek: 'zrodlo' },
  { x: 6, y: 16, rodzaj: 'budynek', strefa: 'pogranicze', budynek: 'chatka' },
  { x: 40, y: 19, rodzaj: 'budynek', strefa: 'pogranicze', budynek: 'woz' },
  { x: 31, y: 31, rodzaj: 'budynek', strefa: 'pogranicze', budynek: 'drzewo-wiedzy' },
  { x: 31, y: 40, rodzaj: 'budynek', strefa: 'pogranicze', budynek: 'kamienna-wieza' },
  { x: 33, y: 29, rodzaj: 'budynek', strefa: 'pogranicze', budynek: 'ognisko' },
  { x: 39, y: 42, rodzaj: 'budynek', strefa: 'pogranicze', budynek: 'oboz-treningowy' },
  { x: 15, y: 29, rodzaj: 'budynek', strefa: 'pogranicze', budynek: 'portal' },
  { x: 38, y: 14, rodzaj: 'budynek', strefa: 'pogranicze', budynek: 'portal' },
  { x: 18, y: 15, rodzaj: 'jasnowidz', strefa: 'pogranicze' },
  { x: 12, y: 5, rodzaj: 'surowiec', strefa: 'wroga', surowiec: 'kamien' },
  { x: 39, y: 2, rodzaj: 'surowiec', strefa: 'wroga', surowiec: 'kamien' },
  { x: 27, y: 6, rodzaj: 'surowiec', strefa: 'wroga', surowiec: 'odlamek' },
  { x: 32, y: 6, rodzaj: 'surowiec', strefa: 'wroga', surowiec: 'odlamek' },
  { x: 35, y: 7, rodzaj: 'surowiec', strefa: 'wroga', surowiec: 'kamien' },
  { x: 17, y: 9, rodzaj: 'surowiec', strefa: 'wroga', surowiec: 'kamien' },
  { x: 36, y: 1, rodzaj: 'surowiec', strefa: 'wroga', surowiec: 'pokeball' },
  { x: 26, y: 5, rodzaj: 'surowiec', strefa: 'wroga', surowiec: 'pokeball' },
  { x: 7, y: 10, rodzaj: 'kopalnia', strefa: 'wroga', surowiec: 'kamien' },
  { x: 34, y: 3, rodzaj: 'kopalnia', strefa: 'wroga', surowiec: 'pokeball' },
  { x: 7, y: 0, rodzaj: 'kopalnia', strefa: 'wroga', surowiec: 'odlamek' },
  { x: 6, y: 11, rodzaj: 'potwor', strefa: 'wroga', sila: 'silny' },
  { x: 33, y: 4, rodzaj: 'potwor', strefa: 'wroga', sila: 'silny' },
  { x: 41, y: 8, rodzaj: 'skrzynia', strefa: 'wroga' },
  { x: 29, y: 9, rodzaj: 'skrzynia', strefa: 'wroga' },
  { x: 21, y: 12, rodzaj: 'skrzynia', strefa: 'wroga' },
  { x: 27, y: 11, rodzaj: 'skrzynia', strefa: 'wroga' },
  { x: 41, y: 9, rodzaj: 'potwor', strefa: 'wroga', sila: 'silny' },
  { x: 28, y: 10, rodzaj: 'potwor', strefa: 'wroga', sila: 'silny' },
  { x: 22, y: 13, rodzaj: 'potwor', strefa: 'pogranicze', sila: 'silny' },
  { x: 26, y: 12, rodzaj: 'potwor', strefa: 'wroga', sila: 'silny' },
  { x: 29, y: 12, rodzaj: 'potwor', strefa: 'wroga', sila: 'silny' },
  { x: 37, y: 1, rodzaj: 'potwor', strefa: 'wroga', sila: 'silny' },
  { x: 15, y: 9, rodzaj: 'budynek', strefa: 'wroga', budynek: 'osrodek-ewolucji' },
  { x: 50, y: 11, rodzaj: 'budynek', strefa: 'wroga', budynek: 'arena' },
  { x: 7, y: 5, rodzaj: 'budynek', strefa: 'wroga', budynek: 'kamienna-wieza' },
  { x: 3, y: 4, rodzaj: 'budynek', strefa: 'wroga', budynek: 'drzewo-wiedzy' },
  { x: 39, y: 0, rodzaj: 'budynek', strefa: 'wroga', budynek: 'gniazdo' },
  { x: 28, y: 11, rodzaj: 'budynek', strefa: 'wroga', budynek: 'zrodlo' },
  { x: 45, y: 8, rodzaj: 'potwor', strefa: 'wroga', sila: 'silny' },
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
    },
    {
      "x": 2,
      "y": 52,
      "promien": 3
    },
    {
      "x": 2,
      "y": 40,
      "promien": 4
    },
    {
      "x": 26,
      "y": 44,
      "promien": 4
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
      "plik": "gora-6",
      "x": 6.3,
      "y": 54.4,
      "szer": 7.8,
      "pokrywa": [
        4,
        50,
        8,
        53
      ]
    },
    {
      "plik": "gora-5",
      "x": 16.9,
      "y": 54.4,
      "szer": 5.8,
      "odbij": true,
      "pokrywa": [
        15,
        50,
        18,
        53
      ]
    }
  ],
  "skalaBudowli": 1.05,
  "skalaZamku": 1.35,
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
