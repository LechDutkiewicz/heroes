import type { Obiekt, StanMapy, Teren } from './mapa';

/**
 * Pierwsza plansza. Mała i celowo prosta: ma nauczyć trzech rzeczy naraz —
 * że ruch kosztuje, że ścieżka jest tańsza od trawy i że po drodze stoi coś,
 * co trzeba pokonać, zanim wejdzie się dalej.
 *
 * Rysunek zamiast tablicy liczb, bo planszę trzeba widzieć, żeby ją stroić:
 *   .  trawa      =  ścieżka     ,  piasek
 *   T  las        #  skały       ~  woda
 *
 * Ścieżka ma szerokość JEDNEGO pola. Przy dwóch polach obok siebie na skosach
 * zostawały trójkąty trawy wewnątrz wstęgi drogi i całość wyglądała jak tory
 * kolejowe, a nie jak trakt.
 *
 * UWAGA: tło planszy jest generowane z tego rysunku przez
 * `tools/render_mapa.py`. Po każdej zmianie trzeba je przegenerować —
 * `tools/probe-mapa.ts` sprawdza odcisk i krzyknie, jeśli się rozjedzie.
 */
const RYSUNEK = [
  '~~~,,,.......T',
  '~~,,,.====...T',
  '~,,..=....=...',
  '..,.=.....=...',
  '....=..TT..=..',
  '...=..TTTT..=.',
  '..=...TTT....=',
  '.=.....T.....=',
  '.=.....##....=',
  '.=....####...=',
  '.=...######.=.',
  '.=....####..=.',
];

const ZNAKI: Record<string, Teren> = {
  '.': 'trawa',
  '=': 'sciezka',
  ',': 'piasek',
  T: 'las',
  '#': 'skaly',
  '~': 'woda',
};

/**
 * Obiekty. Rozstawione tak, żeby pierwsza tura miała oczywisty cel (dwa
 * surowce i sad w zasięgu), a dalsza droga wymagała już decyzji: obejść
 * potwora dookoła czy stanąć do walki i skrócić drogę do zamku.
 *
 * Budynki produkcyjne (`kopalnia`) różnią się od stosów surowca (`surowiec`)
 * tym, że się ich nie podnosi — zajmuje się je i zostają na mapie, dając
 * `ile` surowca każdego dnia.
 */
const OBIEKTY: Array<Omit<Obiekt, 'id'>> = [
  { rodzaj: 'surowiec', x: 6, y: 1, nazwa: 'Kiść jagód', surowiec: 'jagoda', ile: 5 },
  {
    rodzaj: 'surowiec',
    x: 3,
    y: 4,
    nazwa: 'Kamień ewolucji',
    surowiec: 'kamien',
    ile: 1,
  },
  { rodzaj: 'skrzynia', x: 12, y: 2, nazwa: 'Skrzynia trenera', surowiec: 'pokeball', ile: 8 },
  { rodzaj: 'surowiec', x: 12, y: 6, nazwa: 'Odłamki', surowiec: 'odlamek', ile: 3 },
  { rodzaj: 'kopalnia', x: 2, y: 9, nazwa: 'Sad jagodowy', surowiec: 'jagoda', ile: 2 },
  { rodzaj: 'kopalnia', x: 4, y: 8, nazwa: 'Kopalnia odłamków', surowiec: 'odlamek', ile: 1 },
  {
    rodzaj: 'potwor',
    x: 9,
    y: 7,
    nazwa: 'Dzicy Sporexi',
    frakcja: 'grota',
    oddzialy: [{ sprite: '00002', nazwa: 'Sporex', ile: 12 }],
  },
  {
    rodzaj: 'potwor',
    x: 11,
    y: 10,
    nazwa: 'Straż Zbocza',
    frakcja: 'zbocze',
    oddzialy: [
      { sprite: '00074', nazwa: 'Bazalt', ile: 14 },
      { sprite: '00058', nazwa: 'Ashko', ile: 6 },
    ],
  },
  { rodzaj: 'zamek', x: 12, y: 11, nazwa: 'Bór Szmaragdowy' },
];

export function pierwszaMapa(): StanMapy {
  const teren: Teren[][] = RYSUNEK.map((wiersz) =>
    [...wiersz].map((z) => ZNAKI[z] ?? 'trawa')
  );
  return {
    szer: RYSUNEK[0].length,
    wys: RYSUNEK.length,
    teren,
    obiekty: OBIEKTY.map((o, i) => ({ ...o, id: i + 1 })),
    // 700 punktów ruchu, nie 1500 jak w Heroes 3. Tamta liczba jest dobrana
    // do map po sto pól szerokości; tutaj plansza ma czternaście, więc przy
    // 1500 bohater objechałby całą mapę w pierwszej turze i „koniec tury"
    // nie znaczyłby nic. Przy 700 pierwsza tura daje trzy cele do wyboru,
    // a do zamku idzie się trzy dni.
    bohater: {
      x: 1,
      y: 3,
      ruch: 700,
      ruchMax: 700,
      imie: 'Janek',
      atak: 2,
      obrona: 1,
      // Armia. Bohater jest trenerem, a nie stworkiem — stworki są armią,
      // więc bohater grany przez Pokemona nie miał sensu.
      armia: [
        { sprite: '00193', nazwa: 'Pyroko', ile: 20 },
        { sprite: '00020', nazwa: 'Flamir', ile: 9 },
        { sprite: '00218', nazwa: 'Aquino', ile: 6 },
        { sprite: '00096', nazwa: 'Verdiko', ile: 4 },
      ],
    },
    skarbiec: { pokeball: 15, jagoda: 6, kamien: 1, odlamek: 2 },
    dzien: 1,
  };
}
