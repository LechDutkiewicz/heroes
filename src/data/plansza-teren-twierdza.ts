// PLIK GENEROWANY — nie poprawiaj ręcznie.
// Źródło: tools/mapy/twierdza.py (szkic i rozstawienie), silnik: tools/generuj_mape.py.
//
// Plansza 72 × 72 („Twierdza”, rozmiar M) — misja 4, „Oblężenie Groty”.
// Dolina gracza na południu, tundra z zamarzniętym jeziorem pośrodku, dwie
// twierdze wroga w śnieżnych dolinach na północy, rozdzielone skalnym
// grzbietem z jedną przełęczą.
// Znaki: . trawa, = ścieżka, , piasek, j ziemia jałowa, s śnieg, b bagno,
// T las, # skały, ~ woda.

export const TEREN = [
  'TTTTssssssTssTTTTTTTTTTT#############TTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTT',
  'TTTTsssssssssTTTTTTTTTTT#############TTTTTTTTTTTTTTTTTTTTTTTTTTTTTTsssss',
  'TTTTsssssssssTTTTTTTTTTT############TTTTTTTTTTTsTTTTTTTTTssssssTTTTsssss',
  'TTTTTsssssT=ssTTTTTTTTT#############TTTTTTTTsssssTTTTTTTTsssssssssssssss',
  'TTTTssssssTs=ssssTTTTTTT############TTTTTTTTsssssssssssssssss=sTTTTsssss',
  'TTTTTTTTTTTss=sssTTTTTTT#############TTTTTTTssssssssssssssssss=TTTTsssss',
  'TTTTsssssss###=ssTTTTTTT############TTTTTTTTTsssssssssssssss##=TTTTTTTTT',
  'TTTTsssssss###s=sTTTTTTT##s#s###s###TTTTTTTTTTTTTTTTTTs###ss##=TTTTTTTTT',
  'TTTTsssssssssss=TTTTTTTTs#ss=======sssTTTTTTTTTTTTTTss#s#ssss=TTTTTTTTTT',
  'TTTTsssssssssTT=ssss========sss#ssssssTTTTTTTTTTTTTTssssss=s=sTTTTTTTTTT',
  'TTTTTTTTTssssTT=s===sssssssssss#####ssTTTTTTTTTTTTTTssss==s=ssTTTTTTTTTT',
  'TTTTTTTTTTTTs=s==#####sssssssss######sTTTTTTTTTTTTTTTTs=####s######TTTTT',
  'TTTTTTTTTTTT=s=ss#####sTTTTT#ss#####ssTTTTTT######TTTTs=####s######sTTTT',
  'TTTTTTTTTss==s########TTTTTTssss#####sssssss######Tss===###########sTTTT',
  'TssssTTTss=ss=#ssssss#TTTTTTTssss###ssssssss######T==sss=sssssssssssTTTT',
  'TssssTTTss=sss======T#TTTTTTssss####sssssss##ss====Ts#ss========sTsTTTTT',
  'Tsssssssss=###ssssssT#TTTTTTsss#s###sssssss#ss=sTTss##s#=####TsTTTTTTTTT',
  'TssssTTTss=####sssssT#TTTTTssssss###sssssss##TTT###ss###=####TTTTTTTTTTT',
  'TssssTTTsss=ss########TTTTTsssss####sssssssssssssssss###s=sssTTTTTTTTTTT',
  'TTTTTTTTsss#=ss#s####TTTTT##ssss####sss##s##T#T#TTTT######=sTTTTTTTT#TTT',
  'T######ss#s#=s#s#s#####T########s#####s#################jj=##T#TT#######',
  '############=s###########################################=j#############',
  '############s=###########################################=j#############',
  '##T####j##jjss=######################################j#j=jT#TTTT###TTT##',
  'TTTTTTTjTjjTjj=TTTTT~~TT~~T~~~~T~~~~Tjjjjjjj~~~~~~~~Tj==jjTTTTTTTTTTTTTT',
  'TTTTTTTjjjjjjj=jTTTT~~~~~~~~~~~~T~~jjjjjjjjj~~~~~~~~~=####TTTTjjjTjjjjTT',
  'TTTTTTTTjjjjjj=jTTT~~~~~~~~~~~~~~~~~jjjjjjjj~~~~~~~~~=####TTTTjjTjjjjjTT',
  'TTTTTTTTjjjjjj=jTTT~~~~~~~~~~~~~~~~~jjjj=jjj~~~~~~~~j=####TTTTjj====jjTT',
  'TTTTTTTTTTjjjj=jTTT~~~~~~~~~~~~~~~~~jjj=jjjj~~~~~~~~jj=jjjTTTTj=TTjjjjTT',
  'TTTTTTTTTTjjjj=jTTT~~~~~~~~~~~~~~~~~~jj=jjjj~~~~~~~~jjj=jjTTTT=jTTTTTTTT',
  'TT#####jj======jjjjj~~~~~~~~~~~~~~~~~jj=jjj~~~~~~~~~####=jjjjj=#######TT',
  'TT#####j=TTTTTj=jjj~~~~~~~~~~~~~~~~~jjj=jjj~~~~~~~~~####=jjjjj=#######TT',
  'TTTjjTj=jTTTTTjj=jjj~~~~~~~~~~~~~~~####=jjTT~~~~~~~~TTTj=TTTTT=#######TT',
  'TTTjjj=jjTTTjjjjj=jj~~~~~~~~~~~~~~~####=jjTT~~~~~~~~TTTj=TTTTT=#######jj',
  'TjjjjjjjjTTTjjjjjj=~~~~~~~~~~~~~~~~jjj=jjjj~~~~~~~~~TTT=j=========jjjjjj',
  'TjjjjjjjjTTTjjjjjj=jj~~~~~~~~~~~~~~~jj=jjjjj~~~~~~~~TTT=jTTTTjjTjj=jjjjj',
  'TjjjjjjjjjTTjjjjjj=~~~~~~~~~~~~~~~~~~j=jjjjjjjjTTTTTTT=jjTTTTjjTjjjjjjjj',
  'TTjjjjjjjjTTTTTTTTj=~~~~~~~~~~~~~~~~~~=jjjjjj=========jjjjjjjjTTjjjjjjjj',
  'TTjjjjjjjjTTTTTTTTj=~~~~~~~~~~~~~~~~j=jjjjjj=TTTTTTTTjjjjjjjjjTjjjjjjjjj',
  'TTjjjjsssTTTTTTTTTTT=jjj~~~~~~~~j~~~~=======########jjjjTTjjjjTjjjjjjjjj',
  'TTjsjsssTTTTTTjjTTTTj=========jjjjjj=jjjjjj=########TjTTTTTTjTTjjjjjjjjj',
  'TTsssssssTTTTTTTjjjjjTTTTjjjjj======TTTjjjj=########jTTTTTTTjTjjjjjjjjjj',
  'TTsssTTTTTTTTTTTjjjjjTTTTjjjjj=jTTTTTTTjjj=j#########TTTTTTTjTjjTTTTTjjj',
  'TTssTTTTTTTTTTTjjjjTjTTTTjjjjj=jTTTTTTTTTj=T#########TTTTTTTTTjjTTTTTsss',
  '###ss##########j#####jjj##j#jj=jjj######j=jj#########T#####T###j########',
  '#############################=.#########=j##############################',
  '#############################=.#########j=##############################',
  '###T#####################.#..=.#jj#j####j=########T##########.#..TT#####',
  '#T#TT#..######.#..#...####...=#.#jjjj#jjj=.#TTT#TTTTT######..##.#TTTT###',
  'TTTTTTT..............#TTT#TTT=..jjjjjjjj.=.TTTTTTTTTT#TTTTTTT....TTTTTTT',
  'TTTTTT.....=====.....TTTTTTTT=..jTTTTTjj.=.......TTTTTTTTTTTTT..TTTTTTTT',
  'TTTTT...TTTTTTT.====.......===.jjTTTTTjjj=........TTTTTTTTTTTT...TTTTTTT',
  'TTTTTTTTTTTTTTTTTTTT=.....=jjj======j...=........~~~T~~~.TTTTT....TTTT..',
  'TTTT.................=...=..jjjjjjjj====....TTTT.~~~~~~~.TTTTTTT........',
  'TTT...................=.=.TTTTTTTTjj....=..TTTTT.~~~~~~.................',
  'TTT........=.....~..~.==..TTTTTTTTjjj....=..TTTTT~~~~~~~~...####........',
  'TTT..####.=~~~~~~~~~~.=..TTTTTjjjjjjTTTTTT=.TTTTT~~~~~~~~...#########...',
  'TTT..#####=~~~~TTT~~~.=..TTTTTTjjjTTTTTTj..=..T~~~~~~~~~~...#########...',
  'TTT...####.=~~~~T~~...=.TTTTTTTTjjTTTTTT....=...~~~~~~~~~......######...',
  'T#T..####..=....~~~...=...TTTTTTjjjjTjjj.....=.~~~~~~T~~TT...=..#####...',
  '#########..==..~.....=..TTTTTTTTTTTTTTTjTTTT..===~TT~T~TTT..=..####.....',
  '#########....=......=..##TTTTTTTTTTTTTTTTTTTTTTTT=TTTTTTTT.=#######.....',
  '#########....=======...##TTTTTTTTTTTTTTTTTTTTTTTTT=T......=.#######.....',
  '#########...==.....=.......TTTT.TTTTTTTTTTTTTTTTTTT=======..#######.....',
  '###......=====TTT.TT=..TTT.........TTTTTTTTTTTTT.TT.........#######.....',
  '###...===..=.=TTT.TT...TTT..............TTTTTTTT...........########.....',
  '###.==...TT.=.====....TT..TTT..TTT......TTTTTTTTT..........########.....',
  '##########T.=#####=....T..TTT..TTT......TTTTTTTTT...........#######.....',
  '###########.=####.T==.##TTTTT..TTTTTTTTTTTTTTTTT........TTTTTTTTTTTTTT..',
  '###########.=..##T.....TT.......TTTTTTTTTTTTTTTT..TTTT..TTTTTTTTTTTTTTTT',
  '###########..==##TT...TTT.......TTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTT',
  '############...##TT...TTT.......TTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTT',
];

export const PUNKTY = {
  'start': { x: 13, y: 62 },
  'zamek gracza': { x: 10, y: 64 },
  'rozstaje doliny': { x: 22, y: 56 },
  'podnoze poludniowe': { x: 29, y: 51 },
  'przelecz poludniowa': { x: 29, y: 45 },
  'tundra': { x: 30, y: 41 },
  'zachodni bor': { x: 14, y: 30 },
  'przelecz zachodnia': { x: 12, y: 21 },
  'zamek wroga 2': { x: 13, y: 11 },
  'przelecz twierdz': { x: 34, y: 8 },
  'zamek wroga': { x: 58, y: 9 },
  'rozstaje wschodnie': { x: 37, y: 53 },
  'przelecz wschodnia poludniowa': { x: 40, y: 45 },
  'brod': { x: 45, y: 37 },
  'wschodnia tundra': { x: 56, y: 33 },
  'przelecz wschodnia': { x: 57, y: 21 },
  'zachodnia kopalnia': { x: 11, y: 50 },
  'wzgorze wiezy': { x: 61, y: 59 },
  'zachodnia odnoga': { x: 6, y: 33 },
  'polnocna odnoga': { x: 40, y: 27 },
  'wschodnia odnoga': { x: 66, y: 35 },
  'kopalnia srebrna': { x: 19, y: 15 },
  'kopalnia lodowa': { x: 63, y: 15 },
  'kopalnia lodowa 2': { x: 46, y: 16 },
  'skarbiec srebrny': { x: 11, y: 3 },
  'skarbiec lodowy': { x: 61, y: 4 },
  'wschodni zakatek': { x: 67, y: 27 },
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
  { x: 29, y: 46, rodzaj: 'potwor', strefa: 'pogranicze', sila: 'straznik', nazwa: 'Strażnik Mroźnej Przełęczy' },
  { x: 40, y: 46, rodzaj: 'potwor', strefa: 'pogranicze', sila: 'straznik', nazwa: 'Strażnik Tundry' },
  { x: 12, y: 21, rodzaj: 'potwor', strefa: 'pogranicze', sila: 'straznik', nazwa: 'Strażnik Zachodniej Przełęczy' },
  { x: 57, y: 21, rodzaj: 'potwor', strefa: 'pogranicze', sila: 'wodz', nazwa: 'Wódz Wschodniej Przełęczy' },
  { x: 34, y: 9, rodzaj: 'potwor', strefa: 'wroga', sila: 'silny', nazwa: 'Straż Przełęczy Twierdz' },
  { x: 45, y: 37, rodzaj: 'potwor', strefa: 'pogranicze', sila: 'sredni', nazwa: 'Straż Brodu' },
  { x: 40, y: 33, rodzaj: 'potwor', strefa: 'pogranicze', sila: 'sredni', nazwa: 'Straż Międzyjezierza' },
  { x: 18, y: 61, rodzaj: 'kopalnia', strefa: 'dom', surowiec: 'jagoda' },
  { x: 14, y: 60, rodzaj: 'kopalnia', strefa: 'dom', surowiec: 'odlamek' },
  { x: 21, y: 64, rodzaj: 'budynek', strefa: 'dom', budynek: 'wiatrak' },
  { x: 14, y: 70, rodzaj: 'kopalnia', strefa: 'dom', surowiec: 'pokeball' },
  { x: 12, y: 68, rodzaj: 'potwor', strefa: 'dom', sila: 'slaby' },
  { x: 4, y: 66, rodzaj: 'kopalnia', strefa: 'dom', surowiec: 'kamien' },
  { x: 7, y: 65, rodzaj: 'potwor', strefa: 'dom', sila: 'slaby' },
  { x: 13, y: 54, rodzaj: 'surowiec', strefa: 'dom', surowiec: 'pokeball' },
  { x: 20, y: 60, rodzaj: 'skrzynia', strefa: 'dom' },
  { x: 16, y: 61, rodzaj: 'surowiec', strefa: 'dom', surowiec: 'kamien' },
  { x: 9, y: 61, rodzaj: 'skrzynia', strefa: 'dom' },
  { x: 13, y: 66, rodzaj: 'skrzynia', strefa: 'dom' },
  { x: 12, y: 59, rodzaj: 'surowiec', strefa: 'dom', surowiec: 'jagoda' },
  { x: 17, y: 63, rodzaj: 'surowiec', strefa: 'dom', surowiec: 'odlamek' },
  { x: 50, y: 62, rodzaj: 'potwor', strefa: 'dom', sila: 'slaby', nazwa: 'Straż Lodowego Brzegu' },
  { x: 24, y: 51, rodzaj: 'budynek', strefa: 'dom', budynek: 'zrodlo' },
  { x: 31, y: 50, rodzaj: 'budynek', strefa: 'dom', budynek: 'woz' },
  { x: 35, y: 55, rodzaj: 'budynek', strefa: 'dom', budynek: 'oboz-treningowy' },
  { x: 44, y: 50, rodzaj: 'budynek', strefa: 'dom', budynek: 'chatka' },
  { x: 37, y: 49, rodzaj: 'surowiec', strefa: 'dom', surowiec: 'jagoda' },
  { x: 38, y: 48, rodzaj: 'surowiec', strefa: 'dom', surowiec: 'odlamek' },
  { x: 36, y: 48, rodzaj: 'skrzynia', strefa: 'dom' },
  { x: 11, y: 49, rodzaj: 'kopalnia', strefa: 'dom', surowiec: 'odlamek' },
  { x: 13, y: 49, rodzaj: 'surowiec', strefa: 'dom', surowiec: 'pokeball' },
  { x: 6, y: 50, rodzaj: 'skrzynia', strefa: 'dom' },
  { x: 6, y: 51, rodzaj: 'artefakt', strefa: 'dom' },
  { x: 8, y: 50, rodzaj: 'potwor', strefa: 'dom', sila: 'slaby' },
  { x: 57, y: 54, rodzaj: 'kopalnia', strefa: 'dom', surowiec: 'jagoda' },
  { x: 66, y: 54, rodzaj: 'budynek', strefa: 'dom', budynek: 'ranczo' },
  { x: 70, y: 54, rodzaj: 'surowiec', strefa: 'dom', surowiec: 'jagoda' },
  { x: 70, y: 58, rodzaj: 'potwor', strefa: 'dom', sila: 'sredni' },
  { x: 69, y: 64, rodzaj: 'artefakt', strefa: 'dom' },
  { x: 70, y: 66, rodzaj: 'skrzynia', strefa: 'dom' },
  { x: 68, y: 62, rodzaj: 'surowiec', strefa: 'dom', surowiec: 'kamien' },
  { x: 64, y: 47, rodzaj: 'skrzynia', strefa: 'dom' },
  { x: 63, y: 47, rodzaj: 'surowiec', strefa: 'dom', surowiec: 'kamien' },
  { x: 47, y: 52, rodzaj: 'budynek', strefa: 'dom', budynek: 'wiatrak' },
  { x: 32, y: 57, rodzaj: 'budynek', strefa: 'dom', budynek: 'woz' },
  { x: 63, y: 50, rodzaj: 'budynek', strefa: 'dom', budynek: 'gniazdo' },
  { x: 63, y: 59, rodzaj: 'budynek', strefa: 'dom', budynek: 'kamienna-wieza' },
  { x: 58, y: 66, rodzaj: 'budynek', strefa: 'dom', budynek: 'ognisko' },
  { x: 57, y: 65, rodzaj: 'skrzynia', strefa: 'dom' },
  { x: 56, y: 67, rodzaj: 'surowiec', strefa: 'dom', surowiec: 'pokeball' },
  { x: 53, y: 66, rodzaj: 'surowiec', strefa: 'dom', surowiec: 'odlamek' },
  { x: 54, y: 67, rodzaj: 'surowiec', strefa: 'dom', surowiec: 'jagoda' },
  { x: 52, y: 65, rodzaj: 'artefakt', strefa: 'dom' },
  { x: 30, y: 65, rodzaj: 'budynek', strefa: 'dom', budynek: 'wiatrak' },
  { x: 34, y: 67, rodzaj: 'skrzynia', strefa: 'dom' },
  { x: 27, y: 69, rodzaj: 'surowiec', strefa: 'dom', surowiec: 'jagoda' },
  { x: 28, y: 70, rodzaj: 'surowiec', strefa: 'dom', surowiec: 'odlamek' },
  { x: 31, y: 70, rodzaj: 'artefakt', strefa: 'dom' },
  { x: 30, y: 68, rodzaj: 'potwor', strefa: 'dom', sila: 'slaby' },
  { x: 37, y: 66, rodzaj: 'budynek', strefa: 'dom', budynek: 'zrodlo' },
  { x: 43, y: 58, rodzaj: 'budynek', strefa: 'dom', budynek: 'gniazdo' },
  { x: 26, y: 65, rodzaj: 'budynek', strefa: 'dom', budynek: 'chatka' },
  { x: 33, y: 64, rodzaj: 'surowiec', strefa: 'dom', surowiec: 'kamien' },
  { x: 4, y: 32, rodzaj: 'kopalnia', strefa: 'pogranicze', surowiec: 'odlamek' },
  { x: 2, y: 34, rodzaj: 'surowiec', strefa: 'pogranicze', surowiec: 'odlamek' },
  { x: 7, y: 35, rodzaj: 'surowiec', strefa: 'pogranicze', surowiec: 'jagoda' },
  { x: 4, y: 35, rodzaj: 'artefakt', strefa: 'pogranicze' },
  { x: 6, y: 38, rodzaj: 'kopalnia', strefa: 'pogranicze', surowiec: 'pokeball' },
  { x: 1, y: 36, rodzaj: 'surowiec', strefa: 'pogranicze', surowiec: 'pokeball' },
  { x: 3, y: 41, rodzaj: 'surowiec', strefa: 'pogranicze', surowiec: 'kamien' },
  { x: 4, y: 42, rodzaj: 'skrzynia', strefa: 'pogranicze' },
  { x: 2, y: 39, rodzaj: 'artefakt', strefa: 'pogranicze' },
  { x: 10, y: 25, rodzaj: 'skrzynia', strefa: 'pogranicze' },
  { x: 11, y: 27, rodzaj: 'surowiec', strefa: 'pogranicze', surowiec: 'pokeball' },
  { x: 8, y: 26, rodzaj: 'surowiec', strefa: 'pogranicze', surowiec: 'kamien' },
  { x: 10, y: 29, rodzaj: 'budynek', strefa: 'pogranicze', budynek: 'woz' },
  { x: 40, y: 26, rodzaj: 'budynek', strefa: 'pogranicze', budynek: 'drzewo-wiedzy' },
  { x: 37, y: 25, rodzaj: 'surowiec', strefa: 'pogranicze', surowiec: 'kamien' },
  { x: 42, y: 25, rodzaj: 'surowiec', strefa: 'pogranicze', surowiec: 'odlamek' },
  { x: 38, y: 28, rodzaj: 'skrzynia', strefa: 'pogranicze' },
  { x: 41, y: 29, rodzaj: 'skrzynia', strefa: 'pogranicze' },
  { x: 43, y: 28, rodzaj: 'budynek', strefa: 'pogranicze', budynek: 'ognisko' },
  { x: 37, y: 30, rodzaj: 'budynek', strefa: 'pogranicze', budynek: 'portal' },
  { x: 66, y: 34, rodzaj: 'kopalnia', strefa: 'pogranicze', surowiec: 'kamien' },
  { x: 68, y: 36, rodzaj: 'surowiec', strefa: 'pogranicze', surowiec: 'kamien' },
  { x: 69, y: 37, rodzaj: 'skrzynia', strefa: 'pogranicze' },
  { x: 66, y: 40, rodzaj: 'budynek', strefa: 'pogranicze', budynek: 'wieza-obserwacyjna' },
  { x: 69, y: 42, rodzaj: 'artefakt', strefa: 'pogranicze' },
  { x: 70, y: 39, rodzaj: 'budynek', strefa: 'pogranicze', budynek: 'portal' },
  { x: 59, y: 37, rodzaj: 'budynek', strefa: 'pogranicze', budynek: 'arena' },
  { x: 54, y: 38, rodzaj: 'budynek', strefa: 'pogranicze', budynek: 'ognisko' },
  { x: 42, y: 36, rodzaj: 'surowiec', strefa: 'pogranicze', surowiec: 'pokeball' },
  { x: 42, y: 38, rodzaj: 'skrzynia', strefa: 'pogranicze' },
  { x: 39, y: 37, rodzaj: 'budynek', strefa: 'pogranicze', budynek: 'zrodlo' },
  { x: 36, y: 34, rodzaj: 'budynek', strefa: 'pogranicze', budynek: 'wiatrak' },
  { x: 59, y: 31, rodzaj: 'budynek', strefa: 'pogranicze', budynek: 'chatka' },
  { x: 26, y: 43, rodzaj: 'kopalnia', strefa: 'pogranicze', surowiec: 'odlamek' },
  { x: 15, y: 34, rodzaj: 'budynek', strefa: 'pogranicze', budynek: 'wiatrak' },
  { x: 12, y: 33, rodzaj: 'surowiec', strefa: 'pogranicze', surowiec: 'jagoda' },
  { x: 13, y: 36, rodzaj: 'budynek', strefa: 'pogranicze', budynek: 'ognisko' },
  { x: 14, y: 40, rodzaj: 'budynek', strefa: 'pogranicze', budynek: 'zrodlo' },
  { x: 19, y: 42, rodzaj: 'budynek', strefa: 'pogranicze', budynek: 'gniazdo' },
  { x: 27, y: 41, rodzaj: 'budynek', strefa: 'pogranicze', budynek: 'chatka' },
  { x: 33, y: 40, rodzaj: 'skrzynia', strefa: 'pogranicze' },
  { x: 35, y: 40, rodzaj: 'surowiec', strefa: 'pogranicze', surowiec: 'odlamek' },
  { x: 68, y: 26, rodzaj: 'budynek', strefa: 'pogranicze', budynek: 'ognisko' },
  { x: 68, y: 28, rodzaj: 'surowiec', strefa: 'pogranicze', surowiec: 'odlamek' },
  { x: 69, y: 25, rodzaj: 'skrzynia', strefa: 'pogranicze' },
  { x: 69, y: 27, rodzaj: 'surowiec', strefa: 'pogranicze', surowiec: 'jagoda' },
  { x: 65, y: 26, rodzaj: 'potwor', strefa: 'pogranicze', sila: 'sredni' },
  { x: 57, y: 31, rodzaj: 'budynek', strefa: 'pogranicze', budynek: 'zrodlo' },
  { x: 61, y: 35, rodzaj: 'surowiec', strefa: 'pogranicze', surowiec: 'jagoda' },
  { x: 56, y: 37, rodzaj: 'skrzynia', strefa: 'pogranicze' },
  { x: 56, y: 38, rodzaj: 'surowiec', strefa: 'pogranicze', surowiec: 'kamien' },
  { x: 36, y: 27, rodzaj: 'artefakt', strefa: 'pogranicze' },
  { x: 40, y: 41, rodzaj: 'kopalnia', strefa: 'pogranicze', surowiec: 'jagoda' },
  { x: 23, y: 39, rodzaj: 'jasnowidz', strefa: 'pogranicze' },
  { x: 16, y: 14, rodzaj: 'kopalnia', strefa: 'wroga', surowiec: 'odlamek' },
  { x: 19, y: 14, rodzaj: 'kopalnia', strefa: 'wroga', surowiec: 'kamien' },
  { x: 19, y: 16, rodzaj: 'surowiec', strefa: 'wroga', surowiec: 'odlamek' },
  { x: 15, y: 17, rodzaj: 'skrzynia', strefa: 'wroga' },
  { x: 26, y: 10, rodzaj: 'budynek', strefa: 'wroga', budynek: 'ognisko' },
  { x: 23, y: 11, rodzaj: 'surowiec', strefa: 'wroga', surowiec: 'kamien' },
  { x: 31, y: 14, rodzaj: 'skrzynia', strefa: 'wroga' },
  { x: 28, y: 17, rodzaj: 'surowiec', strefa: 'wroga', surowiec: 'pokeball' },
  { x: 31, y: 18, rodzaj: 'budynek', strefa: 'wroga', budynek: 'gniazdo' },
  { x: 29, y: 14, rodzaj: 'surowiec', strefa: 'wroga', surowiec: 'odlamek' },
  { x: 10, y: 9, rodzaj: 'kopalnia', strefa: 'wroga', surowiec: 'jagoda' },
  { x: 6, y: 8, rodzaj: 'budynek', strefa: 'wroga', budynek: 'wiatrak' },
  { x: 9, y: 6, rodzaj: 'budynek', strefa: 'wroga', budynek: 'chatka' },
  { x: 63, y: 14, rodzaj: 'kopalnia', strefa: 'wroga', surowiec: 'pokeball' },
  { x: 66, y: 15, rodzaj: 'surowiec', strefa: 'wroga', surowiec: 'kamien' },
  { x: 67, y: 13, rodzaj: 'surowiec', strefa: 'wroga', surowiec: 'pokeball' },
  { x: 62, y: 16, rodzaj: 'skrzynia', strefa: 'wroga' },
  { x: 46, y: 15, rodzaj: 'kopalnia', strefa: 'wroga', surowiec: 'odlamek' },
  { x: 44, y: 16, rodzaj: 'surowiec', strefa: 'wroga', surowiec: 'odlamek' },
  { x: 47, y: 16, rodzaj: 'skrzynia', strefa: 'wroga' },
  { x: 40, y: 17, rodzaj: 'surowiec', strefa: 'wroga', surowiec: 'kamien' },
  { x: 39, y: 14, rodzaj: 'budynek', strefa: 'wroga', budynek: 'wiatrak' },
  { x: 37, y: 18, rodzaj: 'skrzynia', strefa: 'wroga' },
  { x: 42, y: 13, rodzaj: 'skrzynia', strefa: 'wroga' },
  { x: 36, y: 15, rodzaj: 'surowiec', strefa: 'wroga', surowiec: 'pokeball' },
  { x: 50, y: 6, rodzaj: 'kopalnia', strefa: 'wroga', surowiec: 'jagoda' },
  { x: 46, y: 3, rodzaj: 'budynek', strefa: 'wroga', budynek: 'zrodlo' },
  { x: 54, y: 4, rodzaj: 'surowiec', strefa: 'wroga', surowiec: 'kamien' },
  { x: 56, y: 6, rodzaj: 'budynek', strefa: 'wroga', budynek: 'wiatrak' },
  { x: 52, y: 9, rodzaj: 'budynek', strefa: 'wroga', budynek: 'chatka' },
  { x: 57, y: 4, rodzaj: 'budynek', strefa: 'wroga', budynek: 'gniazdo' },
  { x: 46, y: 6, rodzaj: 'surowiec', strefa: 'wroga', surowiec: 'jagoda' },
  { x: 52, y: 18, rodzaj: 'budynek', strefa: 'wroga', budynek: 'gniazdo' },
  { x: 4, y: 14, rodzaj: 'artefakt', strefa: 'wroga' },
  { x: 4, y: 18, rodzaj: 'artefakt', strefa: 'wroga' },
  { x: 1, y: 16, rodzaj: 'skrzynia', strefa: 'wroga' },
  { x: 5, y: 16, rodzaj: 'potwor', strefa: 'wroga', sila: 'wodz' },
  { x: 67, y: 5, rodzaj: 'budynek', strefa: 'wroga', budynek: 'osrodek-ewolucji' },
  { x: 67, y: 2, rodzaj: 'artefakt', strefa: 'wroga' },
  { x: 71, y: 4, rodzaj: 'skrzynia', strefa: 'wroga' },
  { x: 62, y: 2, rodzaj: 'potwor', strefa: 'wroga', sila: 'wodz' },
  { x: 7, y: 1, rodzaj: 'artefakt', strefa: 'wroga' },
  { x: 4, y: 0, rodzaj: 'skrzynia', strefa: 'wroga' },
  { x: 9, y: 3, rodzaj: 'surowiec', strefa: 'wroga', surowiec: 'kamien' },
  { x: 10, y: 1, rodzaj: 'potwor', strefa: 'wroga', sila: 'wodz', nazwa: 'Wódz Srebrnego Skarbca' },
  { x: 14, y: 15, rodzaj: 'potwor', strefa: 'wroga', sila: 'silny', nazwa: 'Straż Srebrnej Kopalni' },
  { x: 30, y: 12, rodzaj: 'potwor', strefa: 'wroga', sila: 'silny', nazwa: 'Straż Zakątka pod Borem' },
  { x: 60, y: 15, rodzaj: 'potwor', strefa: 'wroga', sila: 'silny', nazwa: 'Straż Lodowej Kopalni' },
  { x: 50, y: 16, rodzaj: 'potwor', strefa: 'wroga', sila: 'silny', nazwa: 'Straż Kopalni Odłamków' },
  { x: 8, y: 31, rodzaj: 'potwor', strefa: 'pogranicze', sila: 'sredni', nazwa: 'Straż Zachodniej Zatoki' },
  { x: 63, y: 34, rodzaj: 'potwor', strefa: 'pogranicze', sila: 'sredni', nazwa: 'Straż Wschodniej Zatoki' },
  { x: 9, y: 19, rodzaj: 'jasnowidz', strefa: 'wroga' },
  { x: 39, y: 54, rodzaj: 'budynek', strefa: 'dom', budynek: 'ognisko' },
  { x: 18, y: 49, rodzaj: 'budynek', strefa: 'dom', budynek: 'wiatrak' },
  { x: 71, y: 63, rodzaj: 'budynek', strefa: 'dom', budynek: 'zrodlo' },
  { x: 52, y: 68, rodzaj: 'budynek', strefa: 'dom', budynek: 'woz' },
  { x: 48, y: 68, rodzaj: 'budynek', strefa: 'dom', budynek: 'chatka' },
  { x: 9, y: 15, rodzaj: 'skrzynia', strefa: 'wroga' },
  { x: 12, y: 18, rodzaj: 'skrzynia', strefa: 'wroga' },
  { x: 26, y: 8, rodzaj: 'skrzynia', strefa: 'wroga' },
  { x: 49, y: 65, rodzaj: 'skrzynia', strefa: 'dom' },
  { x: 12, y: 29, rodzaj: 'skrzynia', strefa: 'pogranicze' },
];

/** Ustawienia misji na tej planszy — patrz `UstawieniaPlanszy` w `src/data/mapy.ts`. */
export const USTAWIENIA = {
  "klocki": "zima",
  "wrog": "aktywny",
  "natarcie": true,
  "dzienNatarcia": 21,
  "nazwyZamkowWroga": [
    "Lodowa Twierdza",
    "Srebrna Strażnica"
  ],
  "zestaw": "zima",
  "garnizonWroga": {
    "poziomy": [
      0,
      1,
      2,
      3
    ],
    "tygodnie": 1
  },
  "budynkiWroga": [
    "ratusz1",
    "siedlisko1",
    "siedlisko2"
  ],
  "wrogBuduje": false,
  "garnizonGracza": {
    "poziomy": [
      0,
      1,
      2
    ],
    "tygodnie": 8
  },
  "wrogOdkryte": [
    {
      "x": 10,
      "y": 64,
      "promien": 5
    }
  ],
  "odkryte": [
    {
      "x": 58,
      "y": 8,
      "promien": 2
    },
    {
      "x": 13,
      "y": 10,
      "promien": 2
    }
  ],
  "znajdzki": 0.72,
  "osadzZnajdzki": 0.2,
  "skalaStrazy": 1.0,
  "bezOzdobTrawy": true,
  "skalaZamku": 1.15,
  "skalaBudowli": 1.3,
  "skalaKepLasu": 0.76,
  "cienBudowli": {
    "szer": 0.7,
    "krycie": 0.6
  },
  "cienZnajdzek": {
    "szer": 1.25,
    "krycie": 1.0
  },
  "cienNaSniegu": {
    "barwa": 3820152,
    "krycie": 1.35,
    "gory": 0.55,
    "las": 0.32
  },
  "masywy": [
    {
      "plik": "gora-2",
      "x": 6.6,
      "y": 60.3,
      "szer": 5.4,
      "pokrywa": [
        4,
        56,
        9,
        59
      ]
    },
    {
      "plik": "gora-12",
      "x": 4.3,
      "y": 64.0,
      "szer": 6.0,
      "pokrywa": [
        0,
        60,
        8,
        63
      ]
    },
    {
      "plik": "gora-7",
      "x": 7.7,
      "y": 63.2,
      "szer": 2.7,
      "odbij": true,
      "pokrywa": [
        0,
        60,
        8,
        63
      ]
    },
    {
      "plik": "gora-13",
      "x": 5.2,
      "y": 70.4,
      "szer": 7.6,
      "pokrywa": [
        0,
        64,
        10,
        71
      ]
    },
    {
      "plik": "gora-14",
      "x": 3.4,
      "y": 71.45,
      "szer": 4.6,
      "pokrywa": [
        0,
        64,
        10,
        71
      ]
    },
    {
      "plik": "gora-8",
      "x": 9.4,
      "y": 71.6,
      "szer": 3.6,
      "odbij": true,
      "pokrywa": [
        0,
        64,
        10,
        71
      ]
    },
    {
      "plik": "gora-10",
      "x": 17.4,
      "y": 56.0,
      "szer": 7.0,
      "pokrywa": [
        15,
        50,
        20,
        55
      ]
    },
    {
      "plik": "gora-6",
      "x": 15.5,
      "y": 69.1,
      "szer": 5.8,
      "pokrywa": [
        13,
        67,
        17,
        68
      ]
    },
    {
      "plik": "gora-7",
      "x": 24.0,
      "y": 63.2,
      "szer": 2.8,
      "pokrywa": [
        23,
        61,
        24,
        62
      ]
    }
  ]
};
