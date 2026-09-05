// PLIK GENEROWANY — nie poprawiaj ręcznie.
// Źródło: tools/generuj_mape.py (szkic krain jest w tamtym pliku).
//
// Plansza 36 × 36 — układ wzorowany na „Key to Victory" z Heroes 3:
// gracz na południowym wschodzie, przeciwnik na północy, między nimi grzbiet
// górski z dwoma pilnowanymi przejściami.
// Znaki: . trawa, = ścieżka, , piasek, T las, # skały, ~ woda.

export const TEREN = [
  '..T.TT.........###.....##########...',
  '..T.TTT.........##......#########...',
  '.T.T.T...TT.....##......##########..',
  '......T.TT.T.....#.......#########..',
  '..#...TTTTTT................###.#...',
  '......TTTTT................#####....',
  '###...TTTTTT...........###..##......',
  '##......T.TT............#...........',
  '##.......T.T...T..T.....#.=.........',
  '###.........TTTTTT......#..=....,,,,',
  '###........TTTTTTT....#####=.....,,,',
  '###........TTTTTT.......#.#=.....,,~',
  '............TTTT..T.......=....,,,~~',
  '............TTT..T.......=....,,,~~,',
  ',,..........TTT.=##..====.....,,,~~~',
  ',,.........T...=#====..........,,,~,',
  ',,,..,........=.#......#....#..,,~,,',
  ',,#..,...##..=..##...##.#.....#,###,',
  '###,,,.#####.=..###..####....##,##,,',
  '###,,,######.=.#####################',
  '###,,,######.=.#####################',
  '###,,,######.=.#####################',
  '###,,,######..=#####################',
  '###,,,..#.....=..##########,,#######',
  ',#,....##.#..#=#...#.....#..,,,,,,#,',
  ',,,....T......=...........,,.,,,,,,,',
  ',,,...T....============....,,,,,,.,,',
  '...,....T.=.......TTTTT=...........,',
  '.........=........TTTTTT=.........,,',
  '...~~...=.........TT======........,,',
  '~.~~~~.=..........TTTTTT..==....,...',
  '~~~~~~..........T.TTTTT.....=.......',
  '~~~~~~,...........TTTTTTT....=......',
  '~~~~~~,~,.........T..T..TTT...===...',
  '~~~~~~~,..............T.TTT.........',
  '~~~~~~~.................TTT.........',
];

export const PUNKTY = {
  'start': { x: 29, y: 32 },
  'zamek gracza': { x: 32, y: 33 },
  'dolina': { x: 20, y: 29 },
  'jezioro': { x: 7, y: 30 },
  'podnoze': { x: 14, y: 26 },
  'przelecz': { x: 13, y: 21 },
  'rozstaje polnocne': { x: 14, y: 16 },
  'zamek wroga': { x: 20, y: 15 },
  'polnocna polana': { x: 26, y: 8 },
  'plaza poludniowa': { x: 4, y: 26 },
  'plaza polnocna': { x: 4, y: 15 },
};

/**
 * Rozstawienie obiektów. `strefa` mówi, po której stronie grzbietu leży pole —
 * `src/data/plansza.ts` bierze z tego klasę artefaktu i siłę nagrody, bo na tej
 * mapie o wartości znaleziska decyduje strona pasma, a nie odległość od startu.
 */
export const ROZSTAWIENIE: Array<{
  x: number;
  y: number;
  rodzaj: string;
  strefa: 'dom' | 'pogranicze' | 'wroga';
  surowiec?: string;
  sila?: string;
  nazwa?: string;
}> = [
  { x: 27, y: 25, rodzaj: 'surowiec', strefa: 'dom', surowiec: 'pokeball' },
  { x: 35, y: 29, rodzaj: 'surowiec', strefa: 'dom', surowiec: 'pokeball' },
  { x: 24, y: 24, rodzaj: 'kopalnia', strefa: 'dom', surowiec: 'jagoda' },
  { x: 32, y: 25, rodzaj: 'skrzynia', strefa: 'dom' },
  { x: 29, y: 25, rodzaj: 'potwor', strefa: 'dom', sila: 'slaby' },
  { x: 19, y: 25, rodzaj: 'potwor', strefa: 'dom', sila: 'slaby' },
  { x: 13, y: 33, rodzaj: 'surowiec', strefa: 'dom', surowiec: 'pokeball' },
  { x: 14, y: 30, rodzaj: 'surowiec', strefa: 'dom', surowiec: 'pokeball' },
  { x: 9, y: 26, rodzaj: 'surowiec', strefa: 'dom', surowiec: 'pokeball' },
  { x: 8, y: 34, rodzaj: 'kopalnia', strefa: 'dom', surowiec: 'odlamek' },
  { x: 17, y: 24, rodzaj: 'kopalnia', strefa: 'dom', surowiec: 'pokeball' },
  { x: 7, y: 28, rodzaj: 'kopalnia', strefa: 'dom', surowiec: 'jagoda' },
  { x: 9, y: 31, rodzaj: 'skrzynia', strefa: 'dom' },
  { x: 15, y: 32, rodzaj: 'skrzynia', strefa: 'dom' },
  { x: 15, y: 28, rodzaj: 'skrzynia', strefa: 'dom' },
  { x: 10, y: 23, rodzaj: 'potwor', strefa: 'dom', sila: 'slaby' },
  { x: 12, y: 23, rodzaj: 'potwor', strefa: 'dom', sila: 'slaby' },
  { x: 0, y: 29, rodzaj: 'potwor', strefa: 'dom', sila: 'slaby' },
  { x: 3, y: 28, rodzaj: 'potwor', strefa: 'dom', sila: 'slaby' },
  { x: 22, y: 33, rodzaj: 'artefakt', strefa: 'dom' },
  { x: 1, y: 26, rodzaj: 'artefakt', strefa: 'dom' },
  { x: 29, y: 15, rodzaj: 'surowiec', strefa: 'wroga', surowiec: 'kamien' },
  { x: 5, y: 7, rodzaj: 'surowiec', strefa: 'wroga', surowiec: 'kamien' },
  { x: 12, y: 8, rodzaj: 'surowiec', strefa: 'wroga', surowiec: 'kamien' },
  { x: 5, y: 18, rodzaj: 'surowiec', strefa: 'wroga', surowiec: 'odlamek' },
  { x: 28, y: 8, rodzaj: 'kopalnia', strefa: 'wroga', surowiec: 'pokeball' },
  { x: 18, y: 3, rodzaj: 'kopalnia', strefa: 'wroga', surowiec: 'pokeball' },
  { x: 8, y: 17, rodzaj: 'skrzynia', strefa: 'wroga' },
  { x: 8, y: 1, rodzaj: 'skrzynia', strefa: 'wroga' },
  { x: 10, y: 14, rodzaj: 'skrzynia', strefa: 'wroga' },
  { x: 19, y: 9, rodzaj: 'potwor', strefa: 'wroga', sila: 'silny' },
  { x: 35, y: 7, rodzaj: 'potwor', strefa: 'wroga', sila: 'silny' },
  { x: 0, y: 2, rodzaj: 'potwor', strefa: 'wroga', sila: 'silny' },
  { x: 16, y: 6, rodzaj: 'potwor', strefa: 'wroga', sila: 'silny' },
  { x: 21, y: 7, rodzaj: 'potwor', strefa: 'wroga', sila: 'silny' },
  { x: 9, y: 11, rodzaj: 'artefakt', strefa: 'wroga' },
  { x: 33, y: 15, rodzaj: 'artefakt', strefa: 'wroga' },
  { x: 13, y: 19, rodzaj: 'potwor', strefa: 'pogranicze', sila: 'straznik', nazwa: 'Strażnik Przełęczy' },
  { x: 4, y: 19, rodzaj: 'potwor', strefa: 'pogranicze', sila: 'straznik', nazwa: 'Strażnik Nadmorskiej Ścieżki' },
];
