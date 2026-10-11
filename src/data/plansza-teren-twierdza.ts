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
  'TT#####ssssssssssTTTTsssTTTsssss####sssssTTTTTTTssss###sssssssssTTTT####',
  'TTT####ssssssssssTTTTsssTTTssssss###sssssTTTTTTTssss###sssssssssTTTT####',
  'TT######sssssssssTTTssssTTTTsss#######sssTTTTTTTssss####sssssssTTTTT####',
  'TTTT###sssssss~sTTTTssssTTTTsss#####ssssssTTTTTTssssss#sssssssssTTTT####',
  'TTTTTssss#s~ss~~sssssssssTTTssss####ssssssssTTTTTss#sssssssTTTTTsss#####',
  'TTTTssssssss~~~sssssssssTTTTsssss###ssssssssTTTTsssssssssssTTTTssssss###',
  'TTTTssssssss~~~~ssssssssTTTTsssss###sssssssTTTTT.sssssssssssTTTssss##s##',
  'sTTTsssssssss~s.s.ssssssssssssss####sssssssTTTTT.ss.s.sssssssTTssss#####',
  'ssTssssss..ssss..s.ssssssssssssssssssssssTTTTsss......s..ssss...sssssTTT',
  'ssssssss...sssss....ssssssssssssssssssssTTTTsss........s.s=s.....ssssTTT',
  'ssssssss...ssss.....ssssssssssss####ssssTTTTssss........sss==.sssssssTTT',
  'ssssTTTs....s=s.....ssssssssssss#####sssTTTTs~ss.....ss.s.sss=s.ssssTTTs',
  'sssTTTTTTsss=s....ssssTTsssssss#####ssss~~T~~~~~~sssssss....=.ssssTTssss',
  'sssTTTTTTss.=...s.sssTTTssssssss####ssss~~~~~~~s~sssssss.s.=sssTTTTTTsss',
  'ssssTTTTssss=....ssssTTTssssssss#####sss~~~~~~~~sssssssss.=ssssTTTTTssss',
  'sTssTTTTsss.=...sssssssssssssssss###sssss~~~s~~~ssssssss.s=.ssssTTTsss##',
  'TTTTTsss####=sssssssssssTTTssss######sss~ssssss~~###sssss=sssssssss#####',
  'TTTTTsss##ss=sssssssssssTTTTsssss###ssssssssssss####sssss=sssssssss#s###',
  'TTTTssss###s=sssssssssssTTTTssss####ssssssssssss####sssss=ssssssssss####',
  'TTT#sss#####=ss#sssssssssTT##ss#####sssssss#sss#####s##ss=s#ss###sss####',
  '###s#s######=s##ss##s##s#s#############s#ss###########s##=.ss###########',
  '############=s###########################################=.#############',
  '############s=###########################################=.#############',
  '#j##s##ss###s=###~~######j#j#s###########################.=########s####',
  'j#jjs#ss##Tjj#=jj~~~~~~~j#jj#sss#sssssss#j###jjjTTTTT##sss#=jjj##jjjs#ss',
  'jjsjssssTTTTTj=jjj~~~~~###jsssssssssssssjjj#jjjjTTTTTTTTssss=j#jjjjjssss',
  'jjjjssssTTTTTs=s~j~~~~~~jjjjssssssssssssjjjjjjjjjTTTTTTTTsssj=jjjjsssjss',
  'jjjjjsTTTTT..s=~~~~~~~~~jjjjssjsssssssjsjjjjjjjjTT#TTTTTTTssj=jjsssjjjjj',
  'jjjjjTTTTT.jss=s~~~~~~~~~~jjjjjssssssjjjjTTjjsss#TTT#TTTTTTsj=jjsssjjjjj',
  'jjjjTTTTT..sss=s~~~~~~~~~~~~~jjsssssjjjjTTTTsss#######TTTTTTj=jjssjjjjjj',
  'jjjjjTTT.....s=s~~~~~~~~~~~~~jjjjsssjjjTTTTTTsss######TTTTTTj=jjsssjsjjj',
  'jjjjjTTs....s=ss~~~~~~~~~~~~jj~~~~sjjjjjTTTTsjss###~~~~~TTTjs=sssjssssjj',
  'jTjjjj.ss....=s..~~j~~~~~~~~~~jj~~s~jjjjsssjjsjjjjj~~~~~~TTs=sjsjjjjTTTT',
  'TTTjjjjsj.s...==j~jj~~~~~~~~~~~~~~j~jjjjsssssjjjjjjjj~~~~~s~=sssjjjsTTTT',
  'TTTjjjjjssss...j=jj~j~~~~~~~~~~~~~~j~~jjjssjjjjjjj=j~~~~~~~=ssssjjjjTTTT',
  'TTTjjjsssss.....j===sj~~~~~~~~~~~~jjjjjjss..sjsjsjj=~~~~~~~=ssssjjjjTTTT',
  'jjjjjss#s###j.sjssjs=~~j~~~~~~~~~~~jjjjj.....sssjjj=~~~~~~~~=jjjTTjTjjTj',
  'jjjjssss#####jjssjssj=jj~~~~~~~~~~~~jjjj.....ssjjjj=~~~~~~~~=jjjTTTTjjjj',
  'jjjssssj####jjjjjsss.j==~~~~~~~~~~~~jjjj....ssssjsj=~~~~~~~=jjjjTTTTjjjj',
  'jjjjssssj###jjjj.s..jjs~=~~~~j.T~~~~jjjjj...sssjjjjj=jj~ss=~jjjj###jjjjj',
  'sjssTTTjjjjjjjjj...jjsss=~~~~.=T##~jjjjjss.sjssjTTTjj=~ss=ssjjjjj###jjjj',
  'sssTTTTjjjjjjjjjj...ssssj=====.TT###jjjjjssjjjjjTTTTjj=~=~ssjjjjj#j#jjjj',
  'ssssTTTjjjjjj#jjj..ssssssjjjT=.T###jjjjjssssjjjjjTTTjjj=sssssjjj###jjj#j',
  'sssss#jjjj##jj#j#..#ss###j#jT=.#####jjjsssssjj#j###jj#j=ssssjjjjj###j##j',
  's###s######j####j.#sss#######=.#######ss###j##j##T#####=j###############',
  '#############################=.########################=j###############',
  '#############################=.########################=j###############',
  '#TT###s###############..j####=.################T####.##=j###j##ss####.##',
  'TTT#ss#s####ssss###.....jj#j=#s##ss#jjjj#####TTTT..sss=j#jjjssss...#.T#T',
  'TTTT#sss###s#sss###....jjjjj=sssssssjjj#####TTTTT.====sjjj#jssss....TTTT',
  'TTTTssss####s#sss####....jjj=sssssssjjjj###TTTTT.=~.ssssjjjssss....TTTTT',
  'TTTTTTss##ssssss###....s====s=ssss.s.sj######TTT=~..~~sjsjjjssss..sTTTTT',
  'TTTTTTT#sssssss#####...=ssss====s...sjs##=#.TT.=.~~~~~s~~jjssTT.ssssTTTT',
  'TTTTTTTTssssssss###.#.=.ssss####====s====T=====.~~~~~~~~ssssTTTTssssTTTT',
  'TTTTTTTTsssssssss###..=..sss#####...=sssTTT....~~~~~~~~~sssssTTTsssTTTTT',
  'TTTTTTTTsss=ssss###~..=.ssss###s.ssssjssTTj....~~~~~~~~~sssssTTjssjTTTTT',
  'TTTTT####s=~~~~~~~~~..=.ssss####sssjjjssjjjj..~~.~~~~~~~~ssss###jjsjTTTT',
  'TTTTT#####=~~~~TTT~~~.=.ssss#####sjjjjsjjjjj....~~~~~~~~~ss######jjTTTTT',
  'TTTTT#####s=~~~~T~~sss=s..ss###sssssjjjjjjjj.....~~~~~s~~ssss###jjjTTTTT',
  'TTTT#####ss=....~~~ssss=.sss####ssssjj..jjjjs...~~~~..~.ssTs#.##.jjjTTTT',
  '#########ss==.........=.....####sssss...ssss.TT.ssss..~ssTTT...sjssTTTTT',
  '#########ssss=.......=.##...###sssss.....sssTTT~ssss~...TTTT..ssssssTTTT',
  '#########ssss========..##.s..##sssss.....ssTTTTssss.s...TTTT...jssssTTTT',
  '#########sss==.....=......s.s.#.ssss....ss..TT#sss......sTT.s...jsssTTTT',
  '###ssssss=====TTTsTT=..TTTs.s..sssssTs......#.##ss.....ssTTssssjjjjjTTTT',
  '###sss===ss=s=TTTsTTs..TTTss.s..sssTTT.......##....s.sssTTTTssssjjjjTTTT',
  '###s==sssTTs=s====ssssTTsssss....sssTTT.....#####..s.sTTTTTTTsssjjjjTTTT',
  '##########Ts=#####=s.sTTssss.#..#ssssTTT...#####.#.ssTTTTTTTTsssjjjTTTTT',
  '###########s=###ssT==s##Tsss#..#sTTsTTTT...TTT#TTTTTTTTTTTTTsssssTTTTTTT',
  '###########s=ssssTsssssTTssss##ssTTTTTT....TTTTTTTTTTTTTTTTTssssTTTTTTTT',
  '###########ss==sTTTsssTTTsss##s##TTTTTTT....TTTTTTTTTTTTTTTTssssTTTTTTTT',
  '############ssssTTTsssTTTsss#####TTTTTTT....TTTTTTTTTTTTTTTsssssTTTTTTTT',
];

export const PUNKTY = {
  'start': { x: 13, y: 62 },
  'zamek gracza': { x: 10, y: 64 },
  'rozstaje doliny': { x: 22, y: 56 },
  'podnoze poludniowe': { x: 29, y: 51 },
  'przelecz poludniowa': { x: 29, y: 45 },
  'tundra': { x: 30, y: 40 },
  'zachodni bor': { x: 14, y: 30 },
  'przelecz zachodnia': { x: 12, y: 21 },
  'wschodnie jezioro': { x: 50, y: 34 },
  'przelecz wschodnia': { x: 57, y: 21 },
  'zamek wroga': { x: 58, y: 9 },
  'zamek wroga 2': { x: 13, y: 11 },
  'przelecz twierdz': { x: 34, y: 8 },
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
  { x: 55, y: 46, rodzaj: 'potwor', strefa: 'pogranicze', sila: 'straznik', nazwa: 'Strażnik Tundry' },
  { x: 12, y: 21, rodzaj: 'potwor', strefa: 'pogranicze', sila: 'straznik', nazwa: 'Strażnik Zachodniej Przełęczy' },
  { x: 57, y: 21, rodzaj: 'potwor', strefa: 'pogranicze', sila: 'wodz', nazwa: 'Wódz Wschodniej Przełęczy' },
  { x: 34, y: 9, rodzaj: 'potwor', strefa: 'wroga', sila: 'silny', nazwa: 'Straż Przełęczy Twierdz' },
  { x: 18, y: 61, rodzaj: 'kopalnia', strefa: 'dom', surowiec: 'jagoda' },
  { x: 21, y: 64, rodzaj: 'kopalnia', strefa: 'dom', surowiec: 'odlamek' },
  { x: 14, y: 70, rodzaj: 'kopalnia', strefa: 'dom', surowiec: 'pokeball' },
  { x: 12, y: 68, rodzaj: 'potwor', strefa: 'dom', sila: 'slaby' },
  { x: 15, y: 70, rodzaj: 'surowiec', strefa: 'dom', surowiec: 'kamien' },
  { x: 14, y: 60, rodzaj: 'budynek', strefa: 'dom', budynek: 'wiatrak' },
  { x: 12, y: 55, rodzaj: 'budynek', strefa: 'dom', budynek: 'chatka' },
  { x: 4, y: 66, rodzaj: 'kopalnia', strefa: 'dom', surowiec: 'kamien' },
  { x: 7, y: 65, rodzaj: 'potwor', strefa: 'dom', sila: 'slaby' },
  { x: 6, y: 64, rodzaj: 'skrzynia', strefa: 'dom' },
  { x: 9, y: 55, rodzaj: 'budynek', strefa: 'dom', budynek: 'kamienna-wieza' },
  { x: 13, y: 54, rodzaj: 'surowiec', strefa: 'dom', surowiec: 'pokeball' },
  { x: 15, y: 55, rodzaj: 'surowiec', strefa: 'dom', surowiec: 'jagoda' },
  { x: 20, y: 55, rodzaj: 'budynek', strefa: 'dom', budynek: 'zrodlo' },
  { x: 24, y: 57, rodzaj: 'budynek', strefa: 'dom', budynek: 'woz' },
  { x: 12, y: 65, rodzaj: 'budynek', strefa: 'dom', budynek: 'ognisko' },
  { x: 22, y: 61, rodzaj: 'surowiec', strefa: 'dom', surowiec: 'odlamek' },
  { x: 19, y: 67, rodzaj: 'skrzynia', strefa: 'dom' },
  { x: 20, y: 58, rodzaj: 'potwor', strefa: 'dom', sila: 'slaby' },
  { x: 21, y: 59, rodzaj: 'artefakt', strefa: 'dom' },
  { x: 20, y: 61, rodzaj: 'skrzynia', strefa: 'dom' },
  { x: 23, y: 63, rodzaj: 'surowiec', strefa: 'dom', surowiec: 'pokeball' },
  { x: 14, y: 54, rodzaj: 'skrzynia', strefa: 'dom' },
  { x: 16, y: 61, rodzaj: 'surowiec', strefa: 'dom', surowiec: 'kamien' },
  { x: 11, y: 70, rodzaj: 'skrzynia', strefa: 'dom' },
  { x: 20, y: 69, rodzaj: 'budynek', strefa: 'dom', budynek: 'gniazdo' },
  { x: 19, y: 70, rodzaj: 'surowiec', strefa: 'dom', surowiec: 'jagoda' },
  { x: 25, y: 55, rodzaj: 'surowiec', strefa: 'dom', surowiec: 'pokeball' },
  { x: 41, y: 57, rodzaj: 'surowiec', strefa: 'dom', surowiec: 'jagoda' },
  { x: 33, y: 49, rodzaj: 'surowiec', strefa: 'dom', surowiec: 'jagoda' },
  { x: 41, y: 63, rodzaj: 'surowiec', strefa: 'dom', surowiec: 'pokeball' },
  { x: 38, y: 59, rodzaj: 'surowiec', strefa: 'dom', surowiec: 'odlamek' },
  { x: 29, y: 50, rodzaj: 'surowiec', strefa: 'dom', surowiec: 'pokeball' },
  { x: 34, y: 49, rodzaj: 'surowiec', strefa: 'dom', surowiec: 'jagoda' },
  { x: 28, y: 63, rodzaj: 'skrzynia', strefa: 'dom' },
  { x: 33, y: 57, rodzaj: 'skrzynia', strefa: 'dom' },
  { x: 43, y: 55, rodzaj: 'skrzynia', strefa: 'dom' },
  { x: 5, y: 48, rodzaj: 'artefakt', strefa: 'dom' },
  { x: 5, y: 49, rodzaj: 'potwor', strefa: 'dom', sila: 'slaby' },
  { x: 27, y: 58, rodzaj: 'surowiec', strefa: 'dom', surowiec: 'pokeball' },
  { x: 32, y: 68, rodzaj: 'surowiec', strefa: 'dom', surowiec: 'pokeball' },
  { x: 35, y: 64, rodzaj: 'surowiec', strefa: 'dom', surowiec: 'jagoda' },
  { x: 53, y: 64, rodzaj: 'surowiec', strefa: 'dom', surowiec: 'jagoda' },
  { x: 53, y: 61, rodzaj: 'surowiec', strefa: 'dom', surowiec: 'jagoda' },
  { x: 35, y: 62, rodzaj: 'surowiec', strefa: 'dom', surowiec: 'jagoda' },
  { x: 25, y: 56, rodzaj: 'surowiec', strefa: 'dom', surowiec: 'jagoda' },
  { x: 43, y: 64, rodzaj: 'surowiec', strefa: 'dom', surowiec: 'odlamek' },
  { x: 22, y: 49, rodzaj: 'kopalnia', strefa: 'dom', surowiec: 'odlamek' },
  { x: 20, y: 49, rodzaj: 'kopalnia', strefa: 'dom', surowiec: 'pokeball' },
  { x: 28, y: 67, rodzaj: 'kopalnia', strefa: 'dom', surowiec: 'odlamek' },
  { x: 46, y: 57, rodzaj: 'kopalnia', strefa: 'dom', surowiec: 'pokeball' },
  { x: 47, y: 62, rodzaj: 'kopalnia', strefa: 'dom', surowiec: 'kamien' },
  { x: 45, y: 58, rodzaj: 'potwor', strefa: 'dom', sila: 'slaby' },
  { x: 38, y: 49, rodzaj: 'kopalnia', strefa: 'dom', surowiec: 'jagoda' },
  { x: 32, y: 51, rodzaj: 'skrzynia', strefa: 'dom' },
  { x: 11, y: 51, rodzaj: 'skrzynia', strefa: 'dom' },
  { x: 26, y: 55, rodzaj: 'skrzynia', strefa: 'dom' },
  { x: 25, y: 49, rodzaj: 'skrzynia', strefa: 'dom' },
  { x: 35, y: 49, rodzaj: 'skrzynia', strefa: 'dom' },
  { x: 36, y: 53, rodzaj: 'potwor', strefa: 'dom', sila: 'slaby' },
  { x: 33, y: 65, rodzaj: 'potwor', strefa: 'dom', sila: 'slaby' },
  { x: 26, y: 50, rodzaj: 'potwor', strefa: 'dom', sila: 'slaby' },
  { x: 27, y: 50, rodzaj: 'artefakt', strefa: 'dom' },
  { x: 39, y: 65, rodzaj: 'artefakt', strefa: 'dom' },
  { x: 26, y: 51, rodzaj: 'potwor', strefa: 'dom', sila: 'slaby' },
  { x: 38, y: 65, rodzaj: 'potwor', strefa: 'dom', sila: 'slaby' },
  { x: 7, y: 49, rodzaj: 'skrzynia', strefa: 'dom' },
  { x: 4, y: 48, rodzaj: 'skrzynia', strefa: 'dom' },
  { x: 4, y: 50, rodzaj: 'skrzynia', strefa: 'dom' },
  { x: 6, y: 51, rodzaj: 'potwor', strefa: 'dom', sila: 'slaby' },
  { x: 65, y: 53, rodzaj: 'budynek', strefa: 'dom', budynek: 'ognisko' },
  { x: 50, y: 63, rodzaj: 'budynek', strefa: 'dom', budynek: 'wiatrak' },
  { x: 60, y: 48, rodzaj: 'budynek', strefa: 'dom', budynek: 'oboz-treningowy' },
  { x: 42, y: 66, rodzaj: 'budynek', strefa: 'dom', budynek: 'zrodlo' },
  { x: 67, y: 64, rodzaj: 'budynek', strefa: 'dom', budynek: 'ranczo' },
  { x: 64, y: 58, rodzaj: 'budynek', strefa: 'dom', budynek: 'gniazdo' },
  { x: 56, y: 54, rodzaj: 'budynek', strefa: 'dom', budynek: 'drzewo-wiedzy' },
  { x: 31, y: 63, rodzaj: 'budynek', strefa: 'dom', budynek: 'chatka' },
  { x: 33, y: 55, rodzaj: 'budynek', strefa: 'dom', budynek: 'woz' },
  { x: 65, y: 50, rodzaj: 'budynek', strefa: 'dom', budynek: 'kamienna-wieza' },
  { x: 60, y: 68, rodzaj: 'budynek', strefa: 'dom', budynek: 'ognisko' },
  { x: 57, y: 58, rodzaj: 'budynek', strefa: 'dom', budynek: 'wiatrak' },
  { x: 33, y: 61, rodzaj: 'budynek', strefa: 'dom', budynek: 'oboz-treningowy' },
  { x: 27, y: 61, rodzaj: 'budynek', strefa: 'dom', budynek: 'zrodlo' },
  { x: 13, y: 39, rodzaj: 'surowiec', strefa: 'pogranicze', surowiec: 'kamien' },
  { x: 70, y: 27, rodzaj: 'surowiec', strefa: 'pogranicze', surowiec: 'jagoda' },
  { x: 13, y: 34, rodzaj: 'surowiec', strefa: 'pogranicze', surowiec: 'kamien' },
  { x: 50, y: 35, rodzaj: 'surowiec', strefa: 'pogranicze', surowiec: 'jagoda' },
  { x: 15, y: 26, rodzaj: 'surowiec', strefa: 'pogranicze', surowiec: 'pokeball' },
  { x: 16, y: 40, rodzaj: 'surowiec', strefa: 'pogranicze', surowiec: 'kamien' },
  { x: 42, y: 40, rodzaj: 'surowiec', strefa: 'pogranicze', surowiec: 'pokeball' },
  { x: 46, y: 28, rodzaj: 'surowiec', strefa: 'pogranicze', surowiec: 'pokeball' },
  { x: 42, y: 42, rodzaj: 'surowiec', strefa: 'pogranicze', surowiec: 'kamien' },
  { x: 63, y: 27, rodzaj: 'surowiec', strefa: 'pogranicze', surowiec: 'odlamek' },
  { x: 29, y: 26, rodzaj: 'surowiec', strefa: 'pogranicze', surowiec: 'pokeball' },
  { x: 46, y: 32, rodzaj: 'surowiec', strefa: 'pogranicze', surowiec: 'jagoda' },
  { x: 63, y: 30, rodzaj: 'surowiec', strefa: 'pogranicze', surowiec: 'pokeball' },
  { x: 35, y: 36, rodzaj: 'surowiec', strefa: 'pogranicze', surowiec: 'pokeball' },
  { x: 12, y: 29, rodzaj: 'surowiec', strefa: 'pogranicze', surowiec: 'odlamek' },
  { x: 37, y: 33, rodzaj: 'surowiec', strefa: 'pogranicze', surowiec: 'jagoda' },
  { x: 44, y: 25, rodzaj: 'surowiec', strefa: 'pogranicze', surowiec: 'pokeball' },
  { x: 69, y: 38, rodzaj: 'surowiec', strefa: 'pogranicze', surowiec: 'pokeball' },
  { x: 60, y: 26, rodzaj: 'kopalnia', strefa: 'pogranicze', surowiec: 'odlamek' },
  { x: 21, y: 42, rodzaj: 'kopalnia', strefa: 'pogranicze', surowiec: 'kamien' },
  { x: 44, y: 31, rodzaj: 'kopalnia', strefa: 'pogranicze', surowiec: 'pokeball' },
  { x: 6, y: 33, rodzaj: 'kopalnia', strefa: 'pogranicze', surowiec: 'odlamek' },
  { x: 44, y: 37, rodzaj: 'kopalnia', strefa: 'pogranicze', surowiec: 'kamien' },
  { x: 9, y: 29, rodzaj: 'kopalnia', strefa: 'pogranicze', surowiec: 'odlamek' },
  { x: 37, y: 42, rodzaj: 'kopalnia', strefa: 'pogranicze', surowiec: 'pokeball' },
  { x: 43, y: 32, rodzaj: 'potwor', strefa: 'pogranicze', sila: 'sredni' },
  { x: 45, y: 38, rodzaj: 'potwor', strefa: 'pogranicze', sila: 'sredni' },
  { x: 38, y: 43, rodzaj: 'potwor', strefa: 'pogranicze', sila: 'sredni' },
  { x: 41, y: 37, rodzaj: 'kopalnia', strefa: 'pogranicze', surowiec: 'jagoda' },
  { x: 41, y: 42, rodzaj: 'skrzynia', strefa: 'pogranicze' },
  { x: 10, y: 42, rodzaj: 'skrzynia', strefa: 'pogranicze' },
  { x: 44, y: 32, rodzaj: 'skrzynia', strefa: 'pogranicze' },
  { x: 11, y: 33, rodzaj: 'skrzynia', strefa: 'pogranicze' },
  { x: 3, y: 31, rodzaj: 'skrzynia', strefa: 'pogranicze' },
  { x: 34, y: 29, rodzaj: 'skrzynia', strefa: 'pogranicze' },
  { x: 8, y: 39, rodzaj: 'skrzynia', strefa: 'pogranicze' },
  { x: 45, y: 25, rodzaj: 'skrzynia', strefa: 'pogranicze' },
  { x: 45, y: 43, rodzaj: 'skrzynia', strefa: 'pogranicze' },
  { x: 29, y: 30, rodzaj: 'skrzynia', strefa: 'pogranicze' },
  { x: 63, y: 26, rodzaj: 'artefakt', strefa: 'pogranicze' },
  { x: 66, y: 26, rodzaj: 'artefakt', strefa: 'pogranicze' },
  { x: 5, y: 39, rodzaj: 'artefakt', strefa: 'pogranicze' },
  { x: 16, y: 32, rodzaj: 'artefakt', strefa: 'pogranicze' },
  { x: 18, y: 37, rodzaj: 'artefakt', strefa: 'pogranicze' },
  { x: 64, y: 27, rodzaj: 'potwor', strefa: 'pogranicze', sila: 'sredni' },
  { x: 67, y: 27, rodzaj: 'potwor', strefa: 'pogranicze', sila: 'sredni' },
  { x: 6, y: 39, rodzaj: 'potwor', strefa: 'pogranicze', sila: 'sredni' },
  { x: 16, y: 33, rodzaj: 'potwor', strefa: 'pogranicze', sila: 'sredni' },
  { x: 19, y: 36, rodzaj: 'potwor', strefa: 'pogranicze', sila: 'sredni' },
  { x: 47, y: 27, rodzaj: 'potwor', strefa: 'pogranicze', sila: 'sredni' },
  { x: 15, y: 32, rodzaj: 'potwor', strefa: 'pogranicze', sila: 'sredni' },
  { x: 14, y: 34, rodzaj: 'potwor', strefa: 'pogranicze', sila: 'sredni' },
  { x: 60, y: 41, rodzaj: 'potwor', strefa: 'pogranicze', sila: 'sredni' },
  { x: 70, y: 39, rodzaj: 'skrzynia', strefa: 'pogranicze' },
  { x: 69, y: 40, rodzaj: 'surowiec', strefa: 'pogranicze', surowiec: 'kamien' },
  { x: 71, y: 43, rodzaj: 'skrzynia', strefa: 'pogranicze' },
  { x: 69, y: 41, rodzaj: 'skrzynia', strefa: 'pogranicze' },
  { x: 68, y: 36, rodzaj: 'potwor', strefa: 'pogranicze', sila: 'sredni' },
  { x: 38, y: 28, rodzaj: 'budynek', strefa: 'pogranicze', budynek: 'arena' },
  { x: 53, y: 42, rodzaj: 'budynek', strefa: 'pogranicze', budynek: 'wieza-obserwacyjna' },
  { x: 1, y: 40, rodzaj: 'budynek', strefa: 'pogranicze', budynek: 'kamienna-wieza' },
  { x: 3, y: 29, rodzaj: 'budynek', strefa: 'pogranicze', budynek: 'ranczo' },
  { x: 12, y: 31, rodzaj: 'budynek', strefa: 'pogranicze', budynek: 'gniazdo' },
  { x: 16, y: 37, rodzaj: 'budynek', strefa: 'pogranicze', budynek: 'wiatrak' },
  { x: 71, y: 25, rodzaj: 'budynek', strefa: 'pogranicze', budynek: 'ognisko' },
  { x: 7, y: 42, rodzaj: 'budynek', strefa: 'pogranicze', budynek: 'chatka' },
  { x: 64, y: 41, rodzaj: 'budynek', strefa: 'pogranicze', budynek: 'woz' },
  { x: 66, y: 33, rodzaj: 'budynek', strefa: 'pogranicze', budynek: 'drzewo-wiedzy' },
  { x: 35, y: 34, rodzaj: 'budynek', strefa: 'pogranicze', budynek: 'zrodlo' },
  { x: 0, y: 31, rodzaj: 'budynek', strefa: 'pogranicze', budynek: 'oboz-treningowy' },
  { x: 60, y: 35, rodzaj: 'budynek', strefa: 'pogranicze', budynek: 'arena' },
  { x: 62, y: 37, rodzaj: 'budynek', strefa: 'pogranicze', budynek: 'wieza-obserwacyjna' },
  { x: 31, y: 29, rodzaj: 'budynek', strefa: 'pogranicze', budynek: 'kamienna-wieza' },
  { x: 48, y: 35, rodzaj: 'budynek', strefa: 'pogranicze', budynek: 'ranczo' },
  { x: 26, y: 42, rodzaj: 'budynek', strefa: 'pogranicze', budynek: 'gniazdo' },
  { x: 13, y: 26, rodzaj: 'budynek', strefa: 'pogranicze', budynek: 'wiatrak' },
  { x: 58, y: 41, rodzaj: 'budynek', strefa: 'pogranicze', budynek: 'ognisko' },
  { x: 48, y: 37, rodzaj: 'budynek', strefa: 'pogranicze', budynek: 'chatka' },
  { x: 42, y: 27, rodzaj: 'budynek', strefa: 'pogranicze', budynek: 'woz' },
  { x: 20, y: 34, rodzaj: 'budynek', strefa: 'pogranicze', budynek: 'drzewo-wiedzy' },
  { x: 62, y: 40, rodzaj: 'budynek', strefa: 'pogranicze', budynek: 'portal' },
  { x: 41, y: 41, rodzaj: 'budynek', strefa: 'pogranicze', budynek: 'portal' },
  { x: 16, y: 24, rodzaj: 'jasnowidz', strefa: 'pogranicze' },
  { x: 27, y: 13, rodzaj: 'surowiec', strefa: 'wroga', surowiec: 'odlamek' },
  { x: 21, y: 4, rodzaj: 'surowiec', strefa: 'wroga', surowiec: 'kamien' },
  { x: 65, y: 6, rodzaj: 'surowiec', strefa: 'wroga', surowiec: 'kamien' },
  { x: 54, y: 15, rodzaj: 'surowiec', strefa: 'wroga', surowiec: 'odlamek' },
  { x: 9, y: 1, rodzaj: 'surowiec', strefa: 'wroga', surowiec: 'pokeball' },
  { x: 37, y: 17, rodzaj: 'surowiec', strefa: 'wroga', surowiec: 'pokeball' },
  { x: 48, y: 8, rodzaj: 'surowiec', strefa: 'wroga', surowiec: 'pokeball' },
  { x: 38, y: 1, rodzaj: 'surowiec', strefa: 'wroga', surowiec: 'pokeball' },
  { x: 58, y: 4, rodzaj: 'surowiec', strefa: 'wroga', surowiec: 'odlamek' },
  { x: 20, y: 2, rodzaj: 'surowiec', strefa: 'wroga', surowiec: 'odlamek' },
  { x: 3, y: 11, rodzaj: 'surowiec', strefa: 'wroga', surowiec: 'kamien' },
  { x: 10, y: 3, rodzaj: 'surowiec', strefa: 'wroga', surowiec: 'kamien' },
  { x: 55, y: 12, rodzaj: 'surowiec', strefa: 'wroga', surowiec: 'odlamek' },
  { x: 17, y: 18, rodzaj: 'surowiec', strefa: 'wroga', surowiec: 'pokeball' },
  { x: 15, y: 16, rodzaj: 'kopalnia', strefa: 'wroga', surowiec: 'kamien' },
  { x: 37, y: 6, rodzaj: 'kopalnia', strefa: 'wroga', surowiec: 'pokeball' },
  { x: 23, y: 16, rodzaj: 'kopalnia', strefa: 'wroga', surowiec: 'odlamek' },
  { x: 50, y: 0, rodzaj: 'kopalnia', strefa: 'wroga', surowiec: 'kamien' },
  { x: 66, y: 16, rodzaj: 'kopalnia', strefa: 'wroga', surowiec: 'pokeball' },
  { x: 61, y: 15, rodzaj: 'kopalnia', strefa: 'wroga', surowiec: 'odlamek' },
  { x: 16, y: 17, rodzaj: 'potwor', strefa: 'wroga', sila: 'silny' },
  { x: 36, y: 7, rodzaj: 'potwor', strefa: 'wroga', sila: 'silny' },
  { x: 51, y: 1, rodzaj: 'potwor', strefa: 'wroga', sila: 'silny' },
  { x: 65, y: 16, rodzaj: 'potwor', strefa: 'wroga', sila: 'silny' },
  { x: 31, y: 0, rodzaj: 'skrzynia', strefa: 'wroga' },
  { x: 61, y: 0, rodzaj: 'skrzynia', strefa: 'wroga' },
  { x: 62, y: 2, rodzaj: 'skrzynia', strefa: 'wroga' },
  { x: 26, y: 15, rodzaj: 'skrzynia', strefa: 'wroga' },
  { x: 62, y: 0, rodzaj: 'skrzynia', strefa: 'wroga' },
  { x: 36, y: 17, rodzaj: 'skrzynia', strefa: 'wroga' },
  { x: 52, y: 8, rodzaj: 'skrzynia', strefa: 'wroga' },
  { x: 30, y: 1, rodzaj: 'potwor', strefa: 'wroga', sila: 'silny' },
  { x: 62, y: 1, rodzaj: 'potwor', strefa: 'wroga', sila: 'silny' },
  { x: 63, y: 1, rodzaj: 'potwor', strefa: 'wroga', sila: 'silny' },
  { x: 37, y: 16, rodzaj: 'potwor', strefa: 'wroga', sila: 'silny' },
  { x: 51, y: 9, rodzaj: 'potwor', strefa: 'wroga', sila: 'silny' },
  { x: 71, y: 12, rodzaj: 'potwor', strefa: 'wroga', sila: 'silny' },
  { x: 17, y: 6, rodzaj: 'potwor', strefa: 'wroga', sila: 'silny' },
  { x: 27, y: 11, rodzaj: 'potwor', strefa: 'wroga', sila: 'silny' },
  { x: 6, y: 18, rodzaj: 'surowiec', strefa: 'wroga', surowiec: 'kamien' },
  { x: 4, y: 18, rodzaj: 'artefakt', strefa: 'wroga' },
  { x: 3, y: 20, rodzaj: 'skrzynia', strefa: 'wroga' },
  { x: 5, y: 18, rodzaj: 'surowiec', strefa: 'wroga', surowiec: 'kamien' },
  { x: 6, y: 16, rodzaj: 'potwor', strefa: 'wroga', sila: 'wodz' },
  { x: 44, y: 16, rodzaj: 'budynek', strefa: 'wroga', budynek: 'osrodek-ewolucji' },
  { x: 30, y: 9, rodzaj: 'budynek', strefa: 'wroga', budynek: 'arena' },
  { x: 58, y: 18, rodzaj: 'budynek', strefa: 'wroga', budynek: 'kamienna-wieza' },
  { x: 28, y: 18, rodzaj: 'budynek', strefa: 'wroga', budynek: 'wieza-obserwacyjna' },
  { x: 4, y: 7, rodzaj: 'budynek', strefa: 'wroga', budynek: 'gniazdo' },
  { x: 52, y: 15, rodzaj: 'budynek', strefa: 'wroga', budynek: 'drzewo-wiedzy' },
  { x: 26, y: 9, rodzaj: 'budynek', strefa: 'wroga', budynek: 'zrodlo' },
  { x: 24, y: 9, rodzaj: 'budynek', strefa: 'wroga', budynek: 'wiatrak' },
  { x: 43, y: 18, rodzaj: 'budynek', strefa: 'wroga', budynek: 'ognisko' },
  { x: 39, y: 12, rodzaj: 'budynek', strefa: 'wroga', budynek: 'woz' },
  { x: 5, y: 4, rodzaj: 'budynek', strefa: 'wroga', budynek: 'osrodek-ewolucji' },
  { x: 16, y: 2, rodzaj: 'budynek', strefa: 'wroga', budynek: 'arena' },
  { x: 48, y: 5, rodzaj: 'budynek', strefa: 'wroga', budynek: 'kamienna-wieza' },
  { x: 41, y: 3, rodzaj: 'budynek', strefa: 'wroga', budynek: 'wieza-obserwacyjna' },
  { x: 54, y: 18, rodzaj: 'jasnowidz', strefa: 'wroga' },
  { x: 45, y: 8, rodzaj: 'artefakt', strefa: 'wroga' },
  { x: 66, y: 10, rodzaj: 'artefakt', strefa: 'wroga' },
  { x: 54, y: 4, rodzaj: 'artefakt', strefa: 'wroga' },
  { x: 46, y: 9, rodzaj: 'potwor', strefa: 'wroga', sila: 'wodz' },
  { x: 65, y: 10, rodzaj: 'potwor', strefa: 'wroga', sila: 'wodz' },
  { x: 53, y: 5, rodzaj: 'potwor', strefa: 'wroga', sila: 'wodz' },
  { x: 42, y: 5, rodzaj: 'skrzynia', strefa: 'wroga' },
  { x: 50, y: 12, rodzaj: 'skrzynia', strefa: 'wroga' },
  { x: 41, y: 4, rodzaj: 'potwor', strefa: 'wroga', sila: 'silny' },
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
  "obiekty": "polana",
  "bryly": {
    "wiatrak": [
      3,
      1
    ],
    "oboz-treningowy": [
      3,
      1
    ],
    "drzewo-wiedzy": [
      3,
      1
    ],
    "kamienna-wieza": [
      3,
      1
    ],
    "wieza-obserwacyjna": [
      1,
      1
    ]
  },
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
