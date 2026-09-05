import type { StanMapy, Teren } from './mapa';

/**
 * Bloki przeszkód — las i skały jako predefiniowane, wieloplowe kompozycje,
 * a nie osobno losowany sprite na każdym polu.
 *
 * W Heroes 3 przeszkody na mapie przygody to gotowe, wieloplowe obiekty
 * z ustalonego zestawu (pojedynczy głaz, para głazów, gaik, duża skalna
 * formacja) — mapa nigdy nie losuje drzewa niezależnie na każdym polu z osobna,
 * tylko dobiera z tego zestawu kawałek, który zmieści się w wolnym miejscu.
 * Stąd bierze się wrażenie, że przeszkody "do siebie pasują": duży blok ma
 * przemyślaną sylwetkę, a nie przypadkowy zlepek.
 *
 * Robimy to samo: każdy blok ma stały odcisk pól (`szer` × `wys`) i stałą,
 * ręcznie ułożoną listę elementów. Elementy trzymają się z dala od SKRAJU
 * własnego odcisku — dzięki temu blok wygląda dobrze bez względu na to, jaki
 * inny blok padnie tuż obok; nie ma potrzeby dopasowywać krawędzi wprost, jak
 * przy autokafelkowaniu terenu w `kafelki_autotile.py`.
 */

export interface ElementBloku {
  klucz: string;
  /** środek elementu, w polach, licząc od lewego-górnego rogu odcisku bloku */
  dx: number;
  dy: number;
  /** wysokość rysunku w polach, jak w `AdventureScene.element` */
  wysokosc: number;
  odbicie?: boolean;
  /** przesunięcie głębi względem wiersza, w którym leży element (0 = bez zmian) */
  glebia?: number;
}

export interface BlokPrzeszkody {
  szer: number;
  wys: number;
  elementy: ElementBloku[];
}

const SOSNY = ['m-sosna', 'm-drzewo', 'm-sosna-b', 'm-drzewo-b'];
const PODSZYT = ['m-sosna-mala', 'm-krzak', 'm-krzak-2'];
const GLAZY = ['m-skala', 'm-skala-2', 'm-kopiec', 'm-kopiec-2'];

/**
 * Las: od pojedynczego drzewa po zwarty gaik 3 × 2. Każdy blok większy niż
 * 1 × 1 miesza główne drzewa (korony) z niższym podszytem, tak jak każe
 * `rysujPrzeszkody` — bez podszytu duży blok wygląda na siatkę identycznych
 * pni, a nie na las.
 */
export const BLOKI_LAS: BlokPrzeszkody[] = [
  // 1×1 — trzy warianty pojedynczego drzewa, z podszytem albo bez.
  { szer: 1, wys: 1, elementy: [{ klucz: SOSNY[0], dx: 0.5, dy: 0.62, wysokosc: 1.32 }] },
  {
    szer: 1,
    wys: 1,
    elementy: [
      { klucz: SOSNY[1], dx: 0.42, dy: 0.6, wysokosc: 1.4 },
      { klucz: PODSZYT[0], dx: 0.72, dy: 0.78, wysokosc: 0.46, glebia: 0.3 },
    ],
  },
  {
    szer: 1,
    wys: 1,
    elementy: [{ klucz: SOSNY[2], dx: 0.56, dy: 0.6, wysokosc: 1.24, odbicie: true }],
  },
  // 2×1 — para drzew, jedno na cell, tak że korony stykają się na styku pól —
  // dokładnie ta gęstość, jaką dawał dawny rysunek pole-po-polu.
  {
    szer: 2,
    wys: 1,
    elementy: [
      { klucz: SOSNY[0], dx: 0.45, dy: 0.6, wysokosc: 1.3 },
      { klucz: SOSNY[3], dx: 1.4, dy: 0.68, wysokosc: 1.4, odbicie: true },
      { klucz: PODSZYT[1], dx: 0.95, dy: 0.82, wysokosc: 0.42, glebia: 0.3 },
    ],
  },
  // 1×2 — to samo w pionie: drugie drzewo o pełne pole głębiej.
  {
    szer: 1,
    wys: 2,
    elementy: [
      { klucz: SOSNY[1], dx: 0.42, dy: 0.6, wysokosc: 1.3 },
      { klucz: SOSNY[2], dx: 0.58, dy: 1.62, wysokosc: 1.4, glebia: 0.1 },
      { klucz: PODSZYT[2], dx: 0.3, dy: 1.85, wysokosc: 0.4, glebia: 0.3 },
    ],
  },
  // 2×2 — gaik: JEDNO drzewo na komórkę (cztery korony), plus podszyt na
  // stykach. Bez elementu w każdej komórce blok ma pustą trawę w rogach i
  // sąsiedzi zlewają się w siatkę prostokątnych dziur zamiast w zwarty las.
  {
    szer: 2,
    wys: 2,
    elementy: [
      { klucz: SOSNY[0], dx: 0.42, dy: 0.6, wysokosc: 1.28 },
      { klucz: SOSNY[3], dx: 1.48, dy: 0.56, wysokosc: 1.4, odbicie: true },
      { klucz: SOSNY[1], dx: 0.55, dy: 1.6, wysokosc: 1.36 },
      { klucz: SOSNY[2], dx: 1.42, dy: 1.65, wysokosc: 1.24, odbicie: true },
      { klucz: PODSZYT[0], dx: 1.0, dy: 1.05, wysokosc: 0.46, glebia: 0.35 },
    ],
  },
  // 3×2 — zwarty gaik: sześć koron, jedna na komórkę, żeby duży blok krył
  // pełne 3 × 2 pola zamiast czterech drzew z pustym pasem wokół.
  {
    szer: 3,
    wys: 2,
    elementy: [
      { klucz: SOSNY[0], dx: 0.42, dy: 0.58, wysokosc: 1.26 },
      { klucz: SOSNY[2], dx: 1.48, dy: 0.5, wysokosc: 1.44, odbicie: true },
      { klucz: SOSNY[3], dx: 2.5, dy: 0.62, wysokosc: 1.3 },
      { klucz: SOSNY[1], dx: 0.55, dy: 1.58, wysokosc: 1.38 },
      { klucz: SOSNY[0], dx: 1.55, dy: 1.65, wysokosc: 1.32, odbicie: true },
      { klucz: SOSNY[2], dx: 2.45, dy: 1.55, wysokosc: 1.22, glebia: 0.1 },
      { klucz: PODSZYT[2], dx: 1.0, dy: 1.1, wysokosc: 0.42, glebia: 0.35 },
      { klucz: PODSZYT[1], dx: 2.0, dy: 1.1, wysokosc: 0.38, glebia: 0.35 },
    ],
  },
];

/**
 * Skały: od pojedynczego głazu po dużą formację 3 × 2, jak grzbiety górskie
 * w szkicu mapy (`generuj_mape.py`, pole `#`). Duży blok kładzie największy
 * głaz z tyłu i obudowuje go mniejszymi z przodu, żeby czytał się jak jedna
 * bryła terenu, a nie kupka osobnych kamieni.
 */
export const BLOKI_SKALY: BlokPrzeszkody[] = [
  { szer: 1, wys: 1, elementy: [{ klucz: GLAZY[0], dx: 0.5, dy: 0.66, wysokosc: 0.86 }] },
  {
    szer: 1,
    wys: 1,
    elementy: [
      { klucz: GLAZY[2], dx: 0.4, dy: 0.68, wysokosc: 0.6 },
      { klucz: GLAZY[1], dx: 0.68, dy: 0.8, wysokosc: 0.5, glebia: 0.3 },
    ],
  },
  { szer: 1, wys: 1, elementy: [{ klucz: GLAZY[3], dx: 0.55, dy: 0.64, wysokosc: 0.78 }] },
  {
    szer: 2,
    wys: 1,
    elementy: [
      { klucz: GLAZY[0], dx: 0.4, dy: 0.62, wysokosc: 0.88 },
      { klucz: GLAZY[2], dx: 1.45, dy: 0.74, wysokosc: 0.56, odbicie: true, glebia: 0.2 },
      { klucz: GLAZY[1], dx: 0.95, dy: 0.86, wysokosc: 0.42, glebia: 0.35 },
    ],
  },
  {
    szer: 1,
    wys: 2,
    elementy: [
      { klucz: GLAZY[1], dx: 0.42, dy: 0.62, wysokosc: 0.8 },
      { klucz: GLAZY[3], dx: 0.58, dy: 1.66, wysokosc: 0.6, glebia: 0.1 },
    ],
  },
  // 2×2 — formacja: jeden głaz na komórkę, największy w tylnym rogu, żeby
  // bryła miała czytelny szczyt zamiast czterech równych kamyków.
  {
    szer: 2,
    wys: 2,
    elementy: [
      { klucz: GLAZY[0], dx: 0.5, dy: 0.68, wysokosc: 0.95 },
      { klucz: GLAZY[3], dx: 1.45, dy: 0.6, wysokosc: 0.75, odbicie: true },
      { klucz: GLAZY[2], dx: 0.42, dy: 1.62, wysokosc: 0.62 },
      { klucz: GLAZY[1], dx: 1.5, dy: 1.68, wysokosc: 0.7, odbicie: true },
    ],
  },
  // 3×2 — grzbiet: sześć głazów, jeden na komórkę, żeby duży blok krył pełne
  // 3 × 2 pola — sam grzbiet w szkicu mapy (`#`) bywa lity na tej głębokości.
  {
    szer: 3,
    wys: 2,
    elementy: [
      { klucz: GLAZY[0], dx: 0.5, dy: 0.6, wysokosc: 0.9 },
      { klucz: GLAZY[3], dx: 1.5, dy: 0.52, wysokosc: 1.05 },
      { klucz: GLAZY[1], dx: 2.45, dy: 0.62, wysokosc: 0.78, odbicie: true },
      { klucz: GLAZY[2], dx: 0.45, dy: 1.6, wysokosc: 0.64 },
      { klucz: GLAZY[0], dx: 1.5, dy: 1.68, wysokosc: 0.72, odbicie: true },
      { klucz: GLAZY[3], dx: 2.5, dy: 1.6, wysokosc: 0.6, glebia: 0.1 },
    ],
  },
];

export interface UmiejscowionyBlok {
  x: number;
  y: number;
  blok: BlokPrzeszkody;
}

/** (x*7 + y*13) % ile — ten sam hash, którego scena używa do wariantów. */
const wariant = (x: number, y: number, ile: number) => (((x * 7 + y * 13) % ile) + ile) % ile;

/**
 * Rozkłada bloki na całej planszy dla jednego rodzaju terenu (las albo skały).
 *
 * Zachłannie, od największego odcisku do najmniejszego: idąc wiersz po
 * wierszu, na pierwszym wolnym polu danego terenu próbuje położyć największy
 * blok, który się tam zmieści (wszystkie jego pola muszą być tym samym
 * terenem i jeszcze nie zajęte). Gdy żaden większy nie pasuje, pole dostaje
 * blok 1×1. To jest dokładnie sposób, w jaki H3 wypełnia obszar lasu czy
 * skał gotowymi obiektami — obszar nie jest jedną fakturą, tylko układanką
 * z osobnych, ale pasujących do siebie kawałków.
 */
export function rozlozBloki(s: StanMapy, typ: Teren): UmiejscowionyBlok[] {
  const katalog = typ === 'las' ? BLOKI_LAS : BLOKI_SKALY;
  // Pola odcisków obecne w katalogu, malejąco — przy każdym wolnym polu
  // próbujemy najpierw największe, a dopiero gdy żaden nie pasuje, mniejsze.
  const pola = [...new Set(katalog.map((b) => b.szer * b.wys))].sort((a, b) => b - a);
  const zajete: boolean[][] = Array.from({ length: s.wys }, () => Array(s.szer).fill(false));
  const wynik: UmiejscowionyBlok[] = [];

  const pasuje = (x: number, y: number, blok: BlokPrzeszkody) => {
    if (x + blok.szer > s.szer || y + blok.wys > s.wys) return false;
    for (let dy = 0; dy < blok.wys; dy++) {
      for (let dx = 0; dx < blok.szer; dx++) {
        if (s.teren[y + dy][x + dx] !== typ || zajete[y + dy][x + dx]) return false;
      }
    }
    return true;
  };

  for (let y = 0; y < s.wys; y++) {
    for (let x = 0; x < s.szer; x++) {
      if (s.teren[y][x] !== typ || zajete[y][x]) continue;

      // Pierwsze pole odcisku, dla którego cokolwiek w katalogu pasuje —
      // wśród bloków TEGO pola wybór jest deterministyczny (ten sam hash,
      // którego scena używa do wariantów), więc ta sama plansza zawsze
      // układa się tak samo.
      let wybrany: BlokPrzeszkody | undefined;
      for (const pole of pola) {
        const pasujace = katalog.filter((b) => b.szer * b.wys === pole && pasuje(x, y, b));
        if (pasujace.length === 0) continue;
        wybrany = pasujace[wariant(x, y, pasujace.length)];
        break;
      }
      if (!wybrany) continue; // nie powinno się zdarzyć: 1×1 zawsze pasuje

      for (let dy = 0; dy < wybrany.wys; dy++) {
        for (let dx = 0; dx < wybrany.szer; dx++) zajete[y + dy][x + dx] = true;
      }
      wynik.push({ x, y, blok: wybrany });
    }
  }
  return wynik;
}
