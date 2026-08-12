/**
 * Mapa przygody — dane i zasady, bez rysowania.
 *
 * Ten plik trzyma się tej samej granicy co `battle.ts`: liczy stan i zwraca
 * wynik, a scena tylko go pokazuje. Dzięki temu ruch bohatera, koszty pól
 * i zbieranie surowców da się sprawdzić bez uruchamiania przeglądarki.
 */

/**
 * Surowce. W Heroes 3 jest ich siedem; tutaj cztery, bo gra jest dla
 * ośmiolatka, a każdy kolejny surowiec to jeden licznik więcej do pilnowania.
 *
 * Nie są to jednak drewno i złoto z Heroes 3, tylko rzeczy z bajki: pokeball
 * zamiast złota (nim się łapie stworki, więc to naturalna waluta), jagody
 * jako jedzenie, kamienie ewolucji do ulepszania oddziałów i odłamki na
 * rozbudowę zamku. Każdy z tych czterech znaczy w świecie Pokemon dokładnie
 * to, do czego służy tutaj — dzięki temu nie trzeba niczego tłumaczyć.
 */
export type Surowiec = 'jagoda' | 'kamien' | 'odlamek' | 'pokeball';

export const SUROWCE: Surowiec[] = ['pokeball', 'jagoda', 'kamien', 'odlamek'];

export const SUROWIEC_INFO: Record<
  Surowiec,
  { nazwa: string; dopelniacz: string; barwa: number; ikona: string }
> = {
  // `dopelniacz` służy do komunikatów w rodzaju „+5 jagód".
  pokeball: { nazwa: 'Pokeballe', dopelniacz: 'pokeballi', barwa: 0xe4413c, ikona: 'pokeball' },
  jagoda: { nazwa: 'Jagody', dopelniacz: 'jagód', barwa: 0xd94f5c, ikona: 'jagody' },
  kamien: {
    nazwa: 'Kamienie ewolucji',
    dopelniacz: 'kamieni ewolucji',
    barwa: 0x9660d2,
    ikona: 'kamien-ewolucji',
  },
  odlamek: { nazwa: 'Odłamki', dopelniacz: 'odłamków', barwa: 0x56bee8, ikona: 'odlamki' },
};

export type Skarbiec = Record<Surowiec, number>;

/** Rodzaje pól. `koszt` to punkty ruchu za wejście; null znaczy nieprzejezdne. */
export type Teren = 'trawa' | 'sciezka' | 'piasek' | 'las' | 'skaly' | 'woda';

export const TEREN_INFO: Record<Teren, { koszt: number | null; nazwa: string }> = {
  // Ścieżka tańsza od trawy — w Heroes 3 drogi są głównym powodem, dla
  // którego opłaca się nadkładać drogi, i to samo ma tu działać.
  sciezka: { koszt: 70, nazwa: 'Ścieżka' },
  trawa: { koszt: 100, nazwa: 'Trawa' },
  piasek: { koszt: 125, nazwa: 'Piasek' },
  las: { koszt: null, nazwa: 'Las' },
  skaly: { koszt: null, nazwa: 'Skały' },
  woda: { koszt: null, nazwa: 'Woda' },
};

export interface Pole {
  x: number;
  y: number;
}

export type RodzajObiektu = 'surowiec' | 'kopalnia' | 'zamek' | 'potwor' | 'skrzynia';

export interface Obiekt {
  id: number;
  rodzaj: RodzajObiektu;
  x: number;
  y: number;
  nazwa: string;
  /** dla surowca i skrzyni: co i ile daje */
  surowiec?: Surowiec;
  ile?: number;
  /** dla potwora: która frakcja go wystawia i co konkretnie stoi na drodze */
  frakcja?: string;
  oddzialy?: Oddzial[];
  /**
   * Czy zniknął z mapy. Dotyczy rzeczy jednorazowych: stosu surowca, skrzyni,
   * pokonanego potwora.
   */
  zebrany?: boolean;
  /**
   * Czy budynek produkcyjny jest już nasz. To NIE to samo co `zebrany`:
   * kopalni i sadu się nie podnosi — wchodzi się na nie, zajmuje i zostają
   * na mapie, dając surowiec każdego dnia. Wcześniej sad znikał po wejściu
   * jak stos jagód i cała mechanika była nieczytelna.
   */
  nasz?: boolean;
}

/** Oddział w armii — to samo, co slot w bitwie: jeden gatunek i jego liczba. */
export interface Oddzial {
  /** numer pliku w `public/sprites` */
  sprite: string;
  nazwa: string;
  ile: number;
}

export interface Bohater {
  x: number;
  y: number;
  /** punkty ruchu zostałe w tej turze */
  ruch: number;
  ruchMax: number;
  imie: string;
  atak: number;
  obrona: number;
  /** Armia. Karta bohatera pokazuje ją tak jak w Heroes 3: rząd slotów. */
  armia: Oddzial[];
}

export interface StanMapy {
  szer: number;
  wys: number;
  teren: Teren[][];
  obiekty: Obiekt[];
  bohater: Bohater;
  skarbiec: Skarbiec;
  dzien: number;
}

/** Czy pole leży na mapie. */
export const wGranicach = (s: StanMapy, x: number, y: number) =>
  x >= 0 && y >= 0 && x < s.szer && y < s.wys;

/** Obiekt stojący na polu, o ile jest i o ile nie został jeszcze zebrany. */
export const obiektNa = (s: StanMapy, x: number, y: number) =>
  s.obiekty.find((o) => o.x === x && o.y === y && !o.zebrany);

/**
 * Koszt wejścia na pole. Obiekty do odwiedzenia (surowiec, skrzynia, potwór)
 * stoją na przejezdnym terenie — wchodzi się na nie. Zamek i kopalnia też,
 * bo w Heroes 3 wjeżdża się na nie wprost.
 */
export function kosztPola(s: StanMapy, x: number, y: number): number | null {
  if (!wGranicach(s, x, y)) return null;
  return TEREN_INFO[s.teren[y][x]].koszt;
}

/** Osiem kierunków, jak w Heroes 3. Skos kosztuje więcej — inaczej byłby darmowy. */
const KIERUNKI: Array<[number, number, number]> = [
  [1, 0, 1],
  [-1, 0, 1],
  [0, 1, 1],
  [0, -1, 1],
  [1, 1, 1.41],
  [1, -1, 1.41],
  [-1, 1, 1.41],
  [-1, -1, 1.41],
];

export interface Krok {
  x: number;
  y: number;
  /** ile punktów ruchu kosztuje wejście na to pole */
  koszt: number;
}

/**
 * Najtańsza trasa do celu (Dijkstra — koszty pól są różne, więc zwykły BFS
 * dałby trasę o najmniejszej liczbie pól, a nie najtańszą).
 *
 * Zwraca kroki BEZ pola startowego. Trasa może być dłuższa niż zapas ruchu —
 * scena pokazuje wtedy, dokąd bohater dojdzie w tej turze, a resztę na szaro,
 * dokładnie jak Heroes 3.
 */
export function trasa(s: StanMapy, doX: number, doY: number): Krok[] | null {
  if (!wGranicach(s, doX, doY) || kosztPola(s, doX, doY) === null) return null;
  const start = `${s.bohater.x},${s.bohater.y}`;
  const koszty = new Map<string, number>([[start, 0]]);
  const skad = new Map<string, string>();
  const kolejka: Array<{ x: number; y: number; k: number }> = [
    { x: s.bohater.x, y: s.bohater.y, k: 0 },
  ];

  while (kolejka.length > 0) {
    // Mała mapa, więc wyszukanie minimum liniowo jest tańsze niż kopiec.
    kolejka.sort((a, b) => a.k - b.k);
    const cur = kolejka.shift()!;
    if (cur.x === doX && cur.y === doY) break;
    if (cur.k > (koszty.get(`${cur.x},${cur.y}`) ?? Infinity)) continue;

    for (const [dx, dy, mnoznik] of KIERUNKI) {
      const nx = cur.x + dx;
      const ny = cur.y + dy;
      const bazowy = kosztPola(s, nx, ny);
      if (bazowy === null) continue;
      // Na obiekt wchodzi się tylko jako na cel trasy — bohater nie przechodzi
      // przez potwora ani przez zamek w drodze gdzie indziej.
      if (obiektNa(s, nx, ny) && !(nx === doX && ny === doY)) continue;
      const klucz = `${nx},${ny}`;
      const nowy = cur.k + bazowy * mnoznik;
      if (nowy < (koszty.get(klucz) ?? Infinity)) {
        koszty.set(klucz, nowy);
        skad.set(klucz, `${cur.x},${cur.y}`);
        kolejka.push({ x: nx, y: ny, k: nowy });
      }
    }
  }

  const cel = `${doX},${doY}`;
  if (!koszty.has(cel)) return null;

  const kroki: Krok[] = [];
  let biezacy = cel;
  while (biezacy !== start) {
    const [x, y] = biezacy.split(',').map(Number);
    const poprzedni = skad.get(biezacy);
    if (poprzedni === undefined) return null;
    kroki.push({ x, y, koszt: koszty.get(biezacy)! - koszty.get(poprzedni)! });
    biezacy = poprzedni;
  }
  return kroki.reverse();
}

/** Ile pierwszych kroków trasy bohater pokona jeszcze w tej turze. */
export function zasiegNaTure(bohater: Bohater, kroki: Krok[]): number {
  let zostalo = bohater.ruch;
  let ile = 0;
  for (const k of kroki) {
    if (k.koszt > zostalo) break;
    zostalo -= k.koszt;
    ile++;
  }
  return ile;
}

export interface WynikWejscia {
  /** co się stało — scena zamienia to na napisy i animacje */
  opis: string;
  bitwaZ?: Obiekt;
  /** budynek właśnie zajęty — scena zatyka na nim chorągiewkę */
  zajete?: Obiekt;
}

/** Wejście na pole z obiektem: zbiera, zajmuje albo zaczyna bitwę. */
export function odwiedz(s: StanMapy, o: Obiekt): WynikWejscia {
  if (o.rodzaj === 'potwor') return { opis: `${o.nazwa} zagradza drogę!`, bitwaZ: o };

  if (o.rodzaj === 'surowiec' || o.rodzaj === 'skrzynia') {
    const co = o.surowiec ?? 'pokeball';
    s.skarbiec[co] += o.ile ?? 0;
    o.zebrany = true;
    return { opis: `+${o.ile} ${SUROWIEC_INFO[co].dopelniacz}` };
  }

  if (o.rodzaj === 'kopalnia') {
    // Zajęcie, nie zebranie: budynek zostaje na mapie i od jutra produkuje.
    if (o.nasz) return { opis: `${o.nazwa} — już twoja` };
    o.nasz = true;
    const co = o.surowiec ?? 'pokeball';
    return {
      opis: `${o.nazwa} jest twoja!\n+${o.ile} ${SUROWIEC_INFO[co].dopelniacz} dziennie`,
      zajete: o,
    };
  }

  return { opis: `${o.nazwa}: tu stanie zamek` };
}

/** Ile surowców wpłynie jutro z zajętych budynków. */
export function dochod(s: StanMapy): Partial<Record<Surowiec, number>> {
  const suma: Partial<Record<Surowiec, number>> = {};
  for (const o of s.obiekty) {
    if (o.rodzaj === 'kopalnia' && o.nasz && o.surowiec) {
      suma[o.surowiec] = (suma[o.surowiec] ?? 0) + (o.ile ?? 1);
    }
  }
  return suma;
}

/** Nowa tura: odnawia ruch, dolicza dochód z zajętych budynków. */
export function nowaTura(s: StanMapy): Partial<Record<Surowiec, number>> {
  s.dzien++;
  s.bohater.ruch = s.bohater.ruchMax;
  const wplyw = dochod(s);
  for (const [co, ile] of Object.entries(wplyw)) {
    s.skarbiec[co as Surowiec] += ile;
  }
  return wplyw;
}

/** Data w formacie z Heroes 3: tydzień i dzień tygodnia. */
export function data(dzien: number) {
  return { tydzien: Math.floor((dzien - 1) / 7) + 1, dzienTygodnia: ((dzien - 1) % 7) + 1 };
}
