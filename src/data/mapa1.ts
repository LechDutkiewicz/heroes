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
 * surowce w zasięgu), a dalsza droga wymagała już decyzji: obejść potwora
 * dookoła czy stanąć do walki i skrócić drogę do zamku.
 */
const OBIEKTY: Array<Omit<Obiekt, 'id'>> = [
  { rodzaj: 'surowiec', x: 6, y: 1, nazwa: 'Stos drewna', surowiec: 'drewno', ile: 5 },
  { rodzaj: 'surowiec', x: 3, y: 4, nazwa: 'Bryła kamienia', surowiec: 'kamien', ile: 4 },
  { rodzaj: 'skrzynia', x: 12, y: 2, nazwa: 'Skrzynia', surowiec: 'zloto', ile: 500 },
  { rodzaj: 'surowiec', x: 12, y: 6, nazwa: 'Kryształ', surowiec: 'krysztal', ile: 2 },
  { rodzaj: 'kopalnia', x: 2, y: 9, nazwa: 'Tartak', surowiec: 'drewno', ile: 2 },
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
  { rodzaj: 'zamek', x: 13, y: 11, nazwa: 'Bór Szmaragdowy' },
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
      // Prowadzi Verdiko — to jego widać na mapie. Reszta armii siedzi
      // w karcie bohatera, jak rząd slotów w Heroes 3.
      sprite: '00096',
      atak: 2,
      obrona: 1,
      armia: [
        { sprite: '00193', nazwa: 'Pyroko', ile: 20 },
        { sprite: '00020', nazwa: 'Flamir', ile: 9 },
        { sprite: '00218', nazwa: 'Aquino', ile: 6 },
        { sprite: '00096', nazwa: 'Verdiko', ile: 4 },
      ],
    },
    skarbiec: { drewno: 10, kamien: 8, krysztal: 2, zloto: 2000 },
    dzien: 1,
  };
}
