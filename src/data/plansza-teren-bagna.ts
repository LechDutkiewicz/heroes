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
  'TTTTTTbbbbbbbbbbTTTTTTTTTTTTTTTTTbbbbbbbbbbbb~~~~~~TTT',
  'TTTTTTbbbbbbbbbbTTTTTTTTTTTTTTTTTbbbbbbbb~~~~~~~~~~TTT',
  'TTTTTTb~~bbbbbbTTTTTTbbTT.TbbTTTbbbbbbbb~~~~~~~~~~~~~T',
  'TTTTTTTTT~bbb.TTTTbb##bb#..bbbTTTbbbbbbb~~~~....~~~~~~',
  'TTTTTTTTTbb.b.TTTTbbbbbbb.bbbbbbbbbbbbb~~~~...b...~~~~',
  'TTTTTTTTT~bb.bbTTTbbbbb...bbbbbbbbbbbbb~~~.........~~~',
  'TTTT~TT~~~bbbbbTTT.b.bbb...bbbbbbbbbbb~~~~.........~~~',
  'TTTTT~~~~bbbbbb.T.....=....bbbbbbbbbbb~~~.b........~~~',
  'TTTT~~~bb~bbbbb.T.b..bb=..bbbbbbbbbb~b~~~.....=....~~~',
  'TTTTTTTT~~~b~~bT.Tbbbbb=..bbbbbbbbbbb~~~~..b...=....~~',
  'TTTbbbbTT~~~bbbbTTTbbb..=...bbbbbbbbb~~~~~.....=.b..~~',
  'TTTbbbbTT~~bbbbbTTbbbbb..=..bbb~~bbb~~~~~~..b..=...~~~',
  'TTTbbbbbbbbbbbbbbbbbb.bb.=..bbbb~~b~bbb~~~~....=..~~~~',
  'TTTbbbbTTbbbbbbbbbbbbbbb.=.TTTTTT~T~TTTTT~~~~,,=~~~~TT',
  'TTTTTTTTbbbb~bTTTbbbbbb#.=#TTTTTTTTTTTTTT~~~~,=~~~~~TT',
  'TTTTTTTTTTTTTTTTTTTTTTTT##=.##TTTTTTTTTTT~~T~,=~~~~TTT',
  'TTTTTTTTTTTTTTTTTTTTTTTT##.=##TTTTTTTTTTTTTT~,=~~~TTTT',
  'TTTTTTTTTTTTTTTTTTTTTTTT##.=##TTTTTTTTTTTTTTT,=~TTTTTT',
  'TTTTTTTTTTT~~T~~~TT~~~~~...=T##~TTTTTTTTTT~~~b=TTTTTTT',
  'TTTbbbbbbTT~~~T~~~~T~~~~...=TTTTTTbTbbbbT~~~~b=TbbbTTT',
  'TTTbbbbbbTT~~~~~~~~~~~~~.~b=...bbb~TbbbbT~~bbb=TbbbTTT',
  'TTTbbbbbbT~~~~~~~~~~~~~~bbb=..bbbbbTbbbbT~~~bb=TbbbTTT',
  'TTTbbbbbbT~~~~~~~~~~~~~~bbb=bbbbbbbTTbTTTbbbb=bTbbbTTT',
  'TTTTTTbTTT~~bbbbb~~~~~b~bbb=bbbbbbbbTbT~~~~bb=bTTbTTTT',
  'TTTTTTbTbbb~bbbbbbb~~bbbbbb====bbbbbbbbb~~~~~=bbTbTTTT',
  'TTTTTTbbbbbbbb~bbbbbbbbbbb=bbbb=bbbbbbbbb~b~~=bbbbbTTT',
  'TTTTTbbbbbbbbbbbbbbbbb====bbbbbb=.bbbbbbbbb~=bbTTTTTTT',
  'TTTTbbbbbbbbbbbbbbbb==~~bbbbbbbbb=.bbbbbbbb~=bbTbbbTTT',
  'TTTbbbbbbbbb========TTTb~bbbbbbb~.=bbbbbbbb=bbbTbbbTTT',
  'TTT~b..bbbbb=bTTTTTTTTTTbbbbbbbbb~.====bbb=bbbbTbbbTTT',
  'TTT...bbbbbb=bTTTT~T~TTTbbbbbbbb~~..TTT=b=bbb..TTbTTTT',
  'TTTTTTTTTTb.=~~~~~~~~TTTTTTTTTTT~~~~~TTT=~~~....TbTTTT',
  '~~~TTTTT~~~.=~~~~~~~~~~~TTTTT~TT~~~~bTT=b~bb..bbbbTTTT',
  '~~~~~~~~~~~.=~~~~~~~~~~~~~~~~~~~T~~b~b=b~~b~bbbbbbbTTT',
  '~~~~~~~~~~~.=~~~~~~~~~~~~~~~~~~~T~bbbb=~~~TTTTTTbbbTTT',
  'TT~~~~~~~~~.=......TT...~~~~~~~~~Tbbbb=b~TTbbbbTbbbbTT',
  'TTTT~~~~~TT.=......TT.....~..~~TT..bbb=bbbbbbbbTbbbTTT',
  'TTTT######T.=......TT.......~~TT.TTTbb=bbTTbbbbTbbbTTT',
  'TTTT######..=......TT.......~~TT.TTTb=bbbbTTTTTTbbbTTT',
  'TTTT######..=..TTT....b.....~~TT.TTT=bbbbb~~~b~bbbbTTT',
  'TTTT######..=..~~~...bb....~~TT.TTT=bbbbbb~~~bbbbbbTTT',
  'TTTT######...=~~~....bb....~~TT.TTT=bbbbbbb~~~~~bbTTTT',
  'TTTT######...=bbb..........~~TT..==b=bbTTTTb~~~~bb~TTT',
  'TTTT######..b=......======.~~...=bbbb==TTTTb~~~~~~~TTT',
  'TTTT######...=======~~~...======..TbbTT=Tbbbb~~~~~TTTT',
  'TTT..........=.bbb...b~bbb.~~.....TTTTbb====b~~~bbTTTT',
  'TTTT.........=.bbb..~~~~~..~~TT...TTTTT~~bbb=~~b~bbbTT',
  'TTTT........==.bbb...~b~~..~~TT.TTTTTTbb~b~b~=~~b.bbTT',
  'TTT.bbbb..=.==.~~..........~~TT.TTTbTTbbbbb~bb==b.TTTT',
  'TTTTTTTTT..=..=~~bb.........~~TT.TTTbbbbb~~~~~~bb.TTTT',
  'TTTT..........=#####..bb.b..~~TT.TTT~bbbbTTT~bbbbTTTTT',
  'TTTT.....~~..=~#####T.bbbbbT~~TT.TTTbb~~TTTTTbT.TTTTTT',
  'TTTT.....~~b.=.#####T..bbTTTT~~TT.TTTbbTTTTTTTTTTTTTTT',
  'TTTT.....~~b.=.#####T.b.bbTTT~~TT...bbbTTTTTTTTTTTTTTT',
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
  { x: 48, y: 11, rodzaj: 'surowiec', strefa: 'wroga', surowiec: 'kamien' },
  { x: 11, y: 51, rodzaj: 'kopalnia', strefa: 'dom', surowiec: 'kamien' },
  { x: 18, y: 46, rodzaj: 'kopalnia', strefa: 'dom', surowiec: 'odlamek' },
  { x: 14, y: 43, rodzaj: 'budynek', strefa: 'dom', budynek: 'drzewo-wiedzy' },
  { x: 11, y: 43, rodzaj: 'surowiec', strefa: 'dom', surowiec: 'jagoda' },
  { x: 16, y: 43, rodzaj: 'skrzynia', strefa: 'dom' },
  { x: 22, y: 49, rodzaj: 'surowiec', strefa: 'dom', surowiec: 'pokeball' },
  { x: 26, y: 48, rodzaj: 'skrzynia', strefa: 'dom' },
  { x: 24, y: 42, rodzaj: 'kopalnia', strefa: 'dom', surowiec: 'pokeball' },
  { x: 23, y: 43, rodzaj: 'potwor', strefa: 'dom', sila: 'slaby' },
  { x: 4, y: 45, rodzaj: 'kopalnia', strefa: 'dom', surowiec: 'jagoda' },
  { x: 18, y: 39, rodzaj: 'budynek', strefa: 'dom', budynek: 'wiatrak' },
  { x: 24, y: 36, rodzaj: 'budynek', strefa: 'dom', budynek: 'oboz-treningowy' },
  { x: 21, y: 35, rodzaj: 'budynek', strefa: 'dom', budynek: 'gniazdo' },
  { x: 11, y: 33, rodzaj: 'potwor', strefa: 'pogranicze', sila: 'slaby' },
  { x: 30, y: 44, rodzaj: 'potwor', strefa: 'pogranicze', sila: 'slaby' },
  { x: 21, y: 49, rodzaj: 'budynek', strefa: 'dom', budynek: 'wieza-obserwacyjna' },
  { x: 6, y: 22, rodzaj: 'artefakt', strefa: 'pogranicze' },
  { x: 6, y: 19, rodzaj: 'skrzynia', strefa: 'pogranicze' },
  { x: 3, y: 22, rodzaj: 'surowiec', strefa: 'pogranicze', surowiec: 'kamien' },
  { x: 8, y: 19, rodzaj: 'surowiec', strefa: 'pogranicze', surowiec: 'pokeball' },
  { x: 6, y: 24, rodzaj: 'potwor', strefa: 'pogranicze', sila: 'sredni' },
  { x: 48, y: 21, rodzaj: 'skrzynia', strefa: 'pogranicze' },
  { x: 50, y: 19, rodzaj: 'surowiec', strefa: 'pogranicze', surowiec: 'pokeball' },
  { x: 48, y: 20, rodzaj: 'surowiec', strefa: 'pogranicze', surowiec: 'jagoda' },
  { x: 49, y: 20, rodzaj: 'surowiec', strefa: 'pogranicze', surowiec: 'odlamek' },
  { x: 49, y: 24, rodzaj: 'potwor', strefa: 'pogranicze', sila: 'sredni' },
  { x: 46, y: 37, rodzaj: 'artefakt', strefa: 'pogranicze' },
  { x: 46, y: 35, rodzaj: 'surowiec', strefa: 'pogranicze', surowiec: 'kamien' },
  { x: 44, y: 35, rodzaj: 'surowiec', strefa: 'pogranicze', surowiec: 'jagoda' },
  { x: 46, y: 36, rodzaj: 'skrzynia', strefa: 'pogranicze' },
  { x: 41, y: 36, rodzaj: 'potwor', strefa: 'pogranicze', sila: 'sredni' },
  { x: 36, y: 19, rodzaj: 'skrzynia', strefa: 'pogranicze' },
  { x: 37, y: 21, rodzaj: 'surowiec', strefa: 'pogranicze', surowiec: 'odlamek' },
  { x: 37, y: 19, rodzaj: 'surowiec', strefa: 'pogranicze', surowiec: 'pokeball' },
  { x: 38, y: 21, rodzaj: 'surowiec', strefa: 'pogranicze', surowiec: 'kamien' },
  { x: 37, y: 23, rodzaj: 'potwor', strefa: 'pogranicze', sila: 'sredni' },
  { x: 48, y: 28, rodzaj: 'skrzynia', strefa: 'pogranicze' },
  { x: 50, y: 28, rodzaj: 'skrzynia', strefa: 'pogranicze' },
  { x: 50, y: 29, rodzaj: 'surowiec', strefa: 'pogranicze', surowiec: 'jagoda' },
  { x: 50, y: 27, rodzaj: 'surowiec', strefa: 'pogranicze', surowiec: 'kamien' },
  { x: 49, y: 31, rodzaj: 'potwor', strefa: 'pogranicze', sila: 'sredni' },
  { x: 48, y: 48, rodzaj: 'artefakt', strefa: 'pogranicze' },
  { x: 50, y: 47, rodzaj: 'surowiec', strefa: 'pogranicze', surowiec: 'pokeball' },
  { x: 51, y: 47, rodzaj: 'skrzynia', strefa: 'pogranicze' },
  { x: 31, y: 24, rodzaj: 'surowiec', strefa: 'pogranicze', surowiec: 'odlamek' },
  { x: 11, y: 28, rodzaj: 'surowiec', strefa: 'pogranicze', surowiec: 'jagoda' },
  { x: 47, y: 24, rodzaj: 'surowiec', strefa: 'pogranicze', surowiec: 'jagoda' },
  { x: 29, y: 26, rodzaj: 'surowiec', strefa: 'pogranicze', surowiec: 'odlamek' },
  { x: 37, y: 42, rodzaj: 'surowiec', strefa: 'pogranicze', surowiec: 'pokeball' },
  { x: 10, y: 29, rodzaj: 'surowiec', strefa: 'pogranicze', surowiec: 'jagoda' },
  { x: 23, y: 25, rodzaj: 'surowiec', strefa: 'pogranicze', surowiec: 'jagoda' },
  { x: 31, y: 28, rodzaj: 'surowiec', strefa: 'pogranicze', surowiec: 'odlamek' },
  { x: 44, y: 31, rodzaj: 'surowiec', strefa: 'pogranicze', surowiec: 'pokeball' },
  { x: 46, y: 29, rodzaj: 'surowiec', strefa: 'pogranicze', surowiec: 'pokeball' },
  { x: 41, y: 28, rodzaj: 'surowiec', strefa: 'pogranicze', surowiec: 'kamien' },
  { x: 38, y: 27, rodzaj: 'surowiec', strefa: 'pogranicze', surowiec: 'jagoda' },
  { x: 39, y: 33, rodzaj: 'kopalnia', strefa: 'pogranicze', surowiec: 'kamien' },
  { x: 35, y: 27, rodzaj: 'kopalnia', strefa: 'pogranicze', surowiec: 'odlamek' },
  { x: 10, y: 24, rodzaj: 'kopalnia', strefa: 'pogranicze', surowiec: 'pokeball' },
  { x: 37, y: 36, rodzaj: 'kopalnia', strefa: 'pogranicze', surowiec: 'jagoda' },
  { x: 26, y: 30, rodzaj: 'kopalnia', strefa: 'pogranicze', surowiec: 'odlamek' },
  { x: 38, y: 33, rodzaj: 'potwor', strefa: 'pogranicze', sila: 'sredni' },
  { x: 34, y: 36, rodzaj: 'skrzynia', strefa: 'pogranicze' },
  { x: 20, y: 25, rodzaj: 'skrzynia', strefa: 'pogranicze' },
  { x: 30, y: 25, rodzaj: 'skrzynia', strefa: 'pogranicze' },
  { x: 38, y: 26, rodzaj: 'skrzynia', strefa: 'pogranicze' },
  { x: 49, y: 35, rodzaj: 'skrzynia', strefa: 'pogranicze' },
  { x: 38, y: 49, rodzaj: 'skrzynia', strefa: 'pogranicze' },
  { x: 24, y: 20, rodzaj: 'skrzynia', strefa: 'pogranicze' },
  { x: 33, y: 23, rodzaj: 'skrzynia', strefa: 'pogranicze' },
  { x: 34, y: 34, rodzaj: 'skrzynia', strefa: 'pogranicze' },
  { x: 36, y: 28, rodzaj: 'skrzynia', strefa: 'pogranicze' },
  { x: 9, y: 27, rodzaj: 'skrzynia', strefa: 'pogranicze' },
  { x: 39, y: 40, rodzaj: 'skrzynia', strefa: 'pogranicze' },
  { x: 40, y: 27, rodzaj: 'artefakt', strefa: 'pogranicze' },
  { x: 40, y: 28, rodzaj: 'potwor', strefa: 'pogranicze', sila: 'sredni' },
  { x: 39, y: 39, rodzaj: 'budynek', strefa: 'pogranicze', budynek: 'wieza-obserwacyjna' },
  { x: 6, y: 28, rodzaj: 'budynek', strefa: 'pogranicze', budynek: 'ranczo' },
  { x: 34, y: 19, rodzaj: 'budynek', strefa: 'pogranicze', budynek: 'gniazdo' },
  { x: 42, y: 27, rodzaj: 'budynek', strefa: 'pogranicze', budynek: 'wiatrak' },
  { x: 44, y: 20, rodzaj: 'budynek', strefa: 'pogranicze', budynek: 'zrodlo' },
  { x: 39, y: 24, rodzaj: 'budynek', strefa: 'pogranicze', budynek: 'chatka' },
  { x: 41, y: 47, rodzaj: 'budynek', strefa: 'pogranicze', budynek: 'woz' },
  { x: 49, y: 41, rodzaj: 'budynek', strefa: 'pogranicze', budynek: 'ognisko' },
  { x: 25, y: 25, rodzaj: 'budynek', strefa: 'pogranicze', budynek: 'oboz-treningowy' },
  { x: 49, y: 38, rodzaj: 'budynek', strefa: 'pogranicze', budynek: 'kamienna-wieza' },
  { x: 43, y: 43, rodzaj: 'budynek', strefa: 'pogranicze', budynek: 'drzewo-wiedzy' },
  { x: 15, y: 25, rodzaj: 'budynek', strefa: 'pogranicze', budynek: 'wieza-obserwacyjna' },
  { x: 18, y: 27, rodzaj: 'budynek', strefa: 'pogranicze', budynek: 'ranczo' },
  { x: 26, y: 19, rodzaj: 'budynek', strefa: 'pogranicze', budynek: 'gniazdo' },
  { x: 50, y: 35, rodzaj: 'budynek', strefa: 'pogranicze', budynek: 'wiatrak' },
  { x: 46, y: 33, rodzaj: 'budynek', strefa: 'pogranicze', budynek: 'zrodlo' },
  { x: 37, y: 53, rodzaj: 'budynek', strefa: 'pogranicze', budynek: 'woz' },
  { x: 45, y: 29, rodzaj: 'budynek', strefa: 'pogranicze', budynek: 'ognisko' },
  { x: 30, y: 43, rodzaj: 'budynek', strefa: 'pogranicze', budynek: 'oboz-treningowy' },
  { x: 34, y: 22, rodzaj: 'budynek', strefa: 'pogranicze', budynek: 'kamienna-wieza' },
  { x: 37, y: 49, rodzaj: 'budynek', strefa: 'pogranicze', budynek: 'drzewo-wiedzy' },
  { x: 31, y: 23, rodzaj: 'budynek', strefa: 'pogranicze', budynek: 'wieza-obserwacyjna' },
  { x: 35, y: 33, rodzaj: 'budynek', strefa: 'pogranicze', budynek: 'ranczo' },
  { x: 11, y: 27, rodzaj: 'budynek', strefa: 'pogranicze', budynek: 'portal' },
  { x: 32, y: 27, rodzaj: 'budynek', strefa: 'pogranicze', budynek: 'portal' },
  { x: 26, y: 27, rodzaj: 'jasnowidz', strefa: 'pogranicze' },
  { x: 26, y: 10, rodzaj: 'surowiec', strefa: 'wroga', surowiec: 'pokeball' },
  { x: 49, y: 9, rodzaj: 'surowiec', strefa: 'wroga', surowiec: 'odlamek' },
  { x: 45, y: 10, rodzaj: 'surowiec', strefa: 'wroga', surowiec: 'odlamek' },
  { x: 44, y: 6, rodzaj: 'surowiec', strefa: 'wroga', surowiec: 'pokeball' },
  { x: 49, y: 8, rodzaj: 'surowiec', strefa: 'wroga', surowiec: 'pokeball' },
  { x: 21, y: 10, rodzaj: 'surowiec', strefa: 'wroga', surowiec: 'odlamek' },
  { x: 26, y: 9, rodzaj: 'surowiec', strefa: 'wroga', surowiec: 'kamien' },
  { x: 32, y: 10, rodzaj: 'kopalnia', strefa: 'wroga', surowiec: 'kamien' },
  { x: 11, y: 0, rodzaj: 'kopalnia', strefa: 'wroga', surowiec: 'pokeball' },
  { x: 15, y: 13, rodzaj: 'kopalnia', strefa: 'wroga', surowiec: 'odlamek' },
  { x: 11, y: 1, rodzaj: 'potwor', strefa: 'wroga', sila: 'silny' },
  { x: 14, y: 2, rodzaj: 'skrzynia', strefa: 'wroga' },
  { x: 35, y: 4, rodzaj: 'skrzynia', strefa: 'wroga' },
  { x: 42, y: 10, rodzaj: 'skrzynia', strefa: 'wroga' },
  { x: 36, y: 5, rodzaj: 'potwor', strefa: 'wroga', sila: 'silny' },
  { x: 43, y: 11, rodzaj: 'potwor', strefa: 'wroga', sila: 'silny' },
  { x: 6, y: 2, rodzaj: 'skrzynia', strefa: 'wroga' },
  { x: 8, y: 0, rodzaj: 'potwor', strefa: 'wroga', sila: 'silny' },
  { x: 38, y: 12, rodzaj: 'budynek', strefa: 'wroga', budynek: 'osrodek-ewolucji' },
  { x: 29, y: 12, rodzaj: 'budynek', strefa: 'wroga', budynek: 'arena' },
  { x: 7, y: 0, rodzaj: 'budynek', strefa: 'wroga', budynek: 'kamienna-wieza' },
  { x: 34, y: 3, rodzaj: 'budynek', strefa: 'wroga', budynek: 'drzewo-wiedzy' },
  { x: 40, y: 1, rodzaj: 'budynek', strefa: 'wroga', budynek: 'ognisko' },
  { x: 38, y: 5, rodzaj: 'budynek', strefa: 'wroga', budynek: 'zrodlo' },
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
  { x: 21, y: 14, rodzaj: 'potwor', strefa: 'wroga', sila: 'silny' },
  { x: 12, y: 12, rodzaj: 'skrzynia', strefa: 'wroga' },
  { x: 29, y: 28, rodzaj: 'kopalnia', strefa: 'pogranicze', surowiec: 'pokeball' },
  { x: 25, y: 23, rodzaj: 'kopalnia', strefa: 'pogranicze', surowiec: 'kamien' },
  { x: 24, y: 24, rodzaj: 'potwor', strefa: 'pogranicze', sila: 'sredni' },
  { x: 44, y: 46, rodzaj: 'potwor', strefa: 'pogranicze', sila: 'sredni' },
  { x: 49, y: 49, rodzaj: 'surowiec', strefa: 'pogranicze', surowiec: 'odlamek' },
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
