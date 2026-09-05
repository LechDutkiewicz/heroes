import { PROMIEN_WIDZENIA, SKRZYNIE, naPokeballe } from './zasady-h3';
import { dochodZamku, przyrostZamku, surowceZamku } from './zamki';

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

export type RodzajObiektu =
  | 'surowiec'
  | 'kopalnia'
  | 'zamek'
  | 'potwor'
  | 'skrzynia'
  | 'artefakt';

/**
 * Artefakty. W Heroes 3 dzielą się na klasy o rosnącej sile; u nas trzy klasy
 * wystarczą, bo bohater ma trzy statystyki, na które mogą działać.
 *
 * Każdy daje stały dodatek — żadnych warunków ani „działa tylko w bitwie".
 * Ośmiolatek ma zobaczyć, że liczba w panelu urosła.
 */
export interface Artefakt {
  id: string;
  nazwa: string;
  klasa: 'drobny' | 'znaczny' | 'relikt';
  atak?: number;
  obrona?: number;
  ruch?: number;
}

export const ARTEFAKTY: Artefakt[] = [
  { id: 'opaska', nazwa: 'Opaska Treningowa', klasa: 'drobny', atak: 1 },
  { id: 'kamizelka', nazwa: 'Kamizelka Ochronna', klasa: 'drobny', obrona: 1 },
  { id: 'buty', nazwa: 'Buty Wędrowca', klasa: 'drobny', ruch: 150 },
  { id: 'pazur', nazwa: 'Pazur Ostrza', klasa: 'znaczny', atak: 2 },
  { id: 'tarcza', nazwa: 'Tarcza z Łusek', klasa: 'znaczny', obrona: 2 },
  { id: 'rower', nazwa: 'Rower Terenowy', klasa: 'znaczny', ruch: 300 },
  { id: 'mistrz', nazwa: 'Pas Mistrza Areny', klasa: 'relikt', atak: 3, obrona: 2 },
  { id: 'skrzydla', nazwa: 'Skrzydła Latającego', klasa: 'relikt', ruch: 450, obrona: 1 },
];

export const artefaktPoId = (id: string) => ARTEFAKTY.find((a) => a.id === id);

export interface Obiekt {
  id: number;
  rodzaj: RodzajObiektu;
  x: number;
  y: number;
  nazwa: string;
  /** dla surowca i skrzyni: co i ile daje */
  surowiec?: Surowiec;
  ile?: number;
  /** dla skrzyni: który z trzech wariantów z Heroes 3 (0–2) i czy kryje artefakt */
  wariant?: number;
  /** dla artefaktu i skrzyni z niespodzianką: identyfikator z `ARTEFAKTY` */
  artefakt?: string;
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
  /**
   * Zamek: ile oddziałów każdego poziomu czeka na rekrutację. Przyrasta co
   * dzień, tak jak w Heroes 3 przyrasta tygodniowo — u nas codziennie i po
   * trochu, bo tydzień to dla ośmiolatka bardzo długo.
   */
  dostepne?: number[];
  /** Z której frakcji rekrutuje ten zamek. */
  frakcjaZamku?: string;
  /**
   * Zamek: identyfikatory postawionych budynków z `zamki.ts`. To one decydują
   * o dochodzie (ratusze) i o tym, które poziomy oddziałów w ogóle przyrastają
   * (siedliska, fort). Drzewko budynków istniało wcześniej tylko jako dane —
   * nic go nie czytało, więc ratusz nie dawał ani jednego pokeballa.
   */
  postawione?: string[];
}

/**
 * Ile pokeballi kosztuje oddział danego poziomu i ile przybywa dziennie.
 *
 * Ceny to koszty oddziałów z Heroes 3 (60, 100, 175, 315, 500, 1000 złota)
 * przepuszczone przez `naPokeballe` — tę samą regułę, którą liczą się kopalnie,
 * skrzynie i ratusze. Wcześniej stało tu [2, 4, 7, 12, 20, 35], wycenione poza
 * jakąkolwiek skalą: dzienny przyrost całego miasta kosztował wtedy 95
 * pokeballi przy 30 pokeballach dochodu z CAŁEJ mapy. Teraz przyrost kosztuje
 * 51 przy 60 z samych kopalni i 100 z kopalniami plus trzeci ratusz — czyli
 * armię da się wykupić i jeszcze zostaje na rozbudowę, o co w tym całym
 * zbieraniu chodzi.
 */
export const KOSZT_ODDZIALU = [
  naPokeballe(60),
  naPokeballe(100),
  naPokeballe(175),
  naPokeballe(315),
  naPokeballe(500),
  naPokeballe(1000),
];
export const PRZYROST_ODDZIALU = [3, 2, 2, 1, 1, 1];

/** Oddział w armii — to samo, co slot w bitwie: jeden gatunek i jego liczba. */
export interface Oddzial {
  /** numer pliku w `public/sprites` */
  sprite: string;
  nazwa: string;
  ile: number;
  /**
   * Skąd wziąć pełną definicję oddziału (statystyki, żywioł, umiejętność),
   * kiedy mapa oddaje sterowanie scenie bitwy. Bez tego bitwa musiałaby
   * odgadywać, czym jest oddział o danym sprite'ie.
   */
  frakcja: string;
  tier: number;
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
  /** Zebrane artefakty (identyfikatory z `ARTEFAKTY`). */
  artefakty: string[];
  doswiadczenie: number;
}

/**
 * Statystyki bohatera z doliczonymi artefaktami. Trzymamy je osobno od
 * `Bohater`, żeby podniesienie artefaktu nie wymagało przeliczania i zapisywania
 * niczego — dodatki zawsze liczą się z tego, co bohater aktualnie nosi, więc
 * nie da się ich policzyć dwa razy.
 */
export function statystyki(b: Bohater) {
  let atak = b.atak;
  let obrona = b.obrona;
  let ruchMax = b.ruchMax;
  for (const id of b.artefakty) {
    const a = artefaktPoId(id);
    if (!a) continue;
    atak += a.atak ?? 0;
    obrona += a.obrona ?? 0;
    ruchMax += a.ruch ?? 0;
  }
  return { atak, obrona, ruchMax };
}

/** Poziom bohatera z doświadczenia. Progi rosną, jak w Heroes 3. */
export function poziom(doswiadczenie: number) {
  let p = 1;
  let prog = 100;
  let suma = prog;
  while (doswiadczenie >= suma) {
    p++;
    prog = Math.round(prog * 1.4);
    suma += prog;
  }
  return p;
}

export interface StanMapy {
  szer: number;
  wys: number;
  teren: Teren[][];
  obiekty: Obiekt[];
  bohater: Bohater;
  skarbiec: Skarbiec;
  dzien: number;
  /**
   * Mgła wojny. `true` znaczy „już tu byliśmy". Raz odsłonięte pole zostaje
   * odsłonięte — tak jest w Heroes 3 i tak jest łaskawiej dla dziecka niż
   * mgła, która wraca.
   */
  odkryte: boolean[][];
}

/** Odsłania mgłę wokół bohatera. Zwraca, ile pól przybyło. */
export function odslon(s: StanMapy, promien = PROMIEN_WIDZENIA): number {
  let nowe = 0;
  const { x, y } = s.bohater;
  for (let dy = -promien; dy <= promien; dy++) {
    for (let dx = -promien; dx <= promien; dx++) {
      // Koło, nie kwadrat — inaczej odsłonięty obszar ma widoczne rogi
      // i wygląda jak usterka, a nie jak zasięg wzroku.
      if (dx * dx + dy * dy > promien * promien) continue;
      const nx = x + dx;
      const ny = y + dy;
      if (nx < 0 || ny < 0 || nx >= s.szer || ny >= s.wys) continue;
      if (!s.odkryte[ny][nx]) {
        s.odkryte[ny][nx] = true;
        nowe++;
      }
    }
  }
  return nowe;
}

/** Czy pole leży na mapie. */
export const wGranicach = (s: StanMapy, x: number, y: number) =>
  x >= 0 && y >= 0 && x < s.szer && y < s.wys;

/** Obiekt stojący na polu, o ile jest i o ile nie został jeszcze zebrany. */
export const obiektNa = (s: StanMapy, x: number, y: number) =>
  s.obiekty.find((o) => o.x === x && o.y === y && !o.zebrany);

/**
 * Strefa kontroli potwora: pole, na którym stoi, i osiem pól wokół niego.
 *
 * Tak działa to w Heroes 3 i to jest cały powód, dla którego strażnicy coś
 * znaczą. Bez strefy potwora obchodzi się bokiem i pilnowanie przełęczy jest
 * fikcją — wystarczy przejść o jedno pole obok. Ze strefą trzeba albo stanąć
 * do walki, albo naprawdę nadłożyć drogi.
 *
 * Zwraca potwora, którego strefa obejmuje dane pole (o ile jakiś obejmuje).
 */
export function strzezoneProzez(s: StanMapy, x: number, y: number): Obiekt | undefined {
  return s.obiekty.find(
    (o) =>
      o.rodzaj === 'potwor' &&
      !o.zebrany &&
      Math.abs(o.x - x) <= 1 &&
      Math.abs(o.y - y) <= 1
  );
}

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

    // Strefa kontroli potwora jest KOŃCOWA, nie zakazana: można w nią wejść
    // (i wtedy zaczyna się bitwa), ale nie da się przez nią przejść dalej.
    // Dzięki temu strażnika nie obchodzi się o jedno pole, a jednocześnie da
    // się do niego dojść. Pierwsza wersja po prostu zakazywała tych pól —
    // i wtedy nie dało się dojść do żadnego potwora, bo wszystkie pola wokół
    // niego są jego strefą.
    //
    // Wyjątek: z pola strefy wolno zrobić jeden krok na samego potwora,
    // bo to jest atak, a nie przejście. Pole, na którym stoi bohater, nie
    // ogranicza niczego — inaczej po przegranej bitwie nie dałoby się ruszyć.
    const straz = strzezoneProzez(s, cur.x, cur.y);
    const naStarcie = cur.x === s.bohater.x && cur.y === s.bohater.y;
    const wolneKierunki =
      straz && !naStarcie
        ? KIERUNKI.filter(([dx, dy]) => cur.x + dx === straz.x && cur.y + dy === straz.y)
        : KIERUNKI;

    for (const [dx, dy, mnoznik] of wolneKierunki) {
      const nx = cur.x + dx;
      const ny = cur.y + dy;
      const bazowy = kosztPola(s, nx, ny);
      if (bazowy === null) continue;
      // Na obiekt wchodzi się tylko jako na cel trasy — bohater nie przechodzi
      // przez potwora ani przez zamek w drodze gdzie indziej.
      const koncowe = nx === doX && ny === doY;
      if (obiektNa(s, nx, ny) && !koncowe) continue;
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
  /** wejście do zamku — scena otwiera ekran miasta */
  zamek?: Obiekt;
  /**
   * Skrzynia czeka na decyzję gracza. Scena musi zapytać, zanim cokolwiek
   * doda — to jest cała mechanika skrzyni w Heroes 3 i bez pytania znika.
   */
  wybor?: WyborSkrzyni;
}

export interface WyborSkrzyni {
  obiekt: Obiekt;
  pokeballe: number;
  doswiadczenie: number;
}

/** Rozstrzygnięcie wyboru ze skrzyni. */
export function wezZeSkrzyni(s: StanMapy, w: WyborSkrzyni, co: 'pokeballe' | 'doswiadczenie') {
  w.obiekt.zebrany = true;
  if (co === 'pokeballe') {
    s.skarbiec.pokeball += w.pokeballe;
    return `+${w.pokeballe} pokeballi`;
  }
  s.bohater.doswiadczenie += w.doswiadczenie;
  return `+${w.doswiadczenie} doświadczenia`;
}

/** Wejście na pole z obiektem: zbiera, zajmuje albo zaczyna bitwę. */
export function odwiedz(s: StanMapy, o: Obiekt): WynikWejscia {
  if (o.rodzaj === 'potwor') return { opis: `${o.nazwa} zagradza drogę!`, bitwaZ: o };

  if (o.rodzaj === 'surowiec') {
    const co = o.surowiec ?? 'pokeball';
    s.skarbiec[co] += o.ile ?? 0;
    o.zebrany = true;
    return { opis: `+${o.ile} ${SUROWIEC_INFO[co].dopelniacz}` };
  }

  if (o.rodzaj === 'artefakt') {
    o.zebrany = true;
    const a = artefaktPoId(o.artefakt ?? '');
    if (a) s.bohater.artefakty.push(a.id);
    return { opis: a ? `Znaleziono: ${a.nazwa}` : 'Pusto' };
  }

  if (o.rodzaj === 'skrzynia') {
    // Rzadka skrzynia z artefaktem rozstrzyga się od razu — nie ma tu czego
    // wybierać, a pytanie „artefakt czy artefakt" byłoby tylko kliknięciem.
    if (o.artefakt) {
      o.zebrany = true;
      const a = artefaktPoId(o.artefakt);
      if (a) s.bohater.artefakty.push(a.id);
      return { opis: a ? `W skrzyni był artefakt!\n${a.nazwa}` : 'Pusta skrzynia' };
    }
    const w = SKRZYNIE[o.wariant ?? 0];
    return {
      opis: '',
      wybor: { obiekt: o, pokeballe: w.pokeballe, doswiadczenie: w.doswiadczenie },
    };
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

  if (o.rodzaj === 'zamek') {
    if (!o.nasz) return { opis: `${o.nazwa}\nZamek przeciwnika — jeszcze nie do zdobycia` };
    return { opis: o.nazwa, zamek: o };
  }

  return { opis: o.nazwa };
}

/**
 * Ile surowców wpłynie jutro — z zajętych kopalni ORAZ z ratuszy w naszych
 * zamkach. Ratusz jest tu, a nie osobno, bo panel „jutro wpłynie" na mapie
 * czyta tę jedną funkcję i inaczej pokazywałby graczowi nieprawdę.
 */
export function dochod(s: StanMapy): Partial<Record<Surowiec, number>> {
  const suma: Partial<Record<Surowiec, number>> = {};
  for (const o of s.obiekty) {
    if (o.rodzaj === 'kopalnia' && o.nasz && o.surowiec) {
      suma[o.surowiec] = (suma[o.surowiec] ?? 0) + (o.ile ?? 1);
    }
    if (o.rodzaj === 'zamek' && o.nasz) {
      const postawione = o.postawione ?? [];
      const frakcja = o.frakcjaZamku ?? 'bor';
      const z = dochodZamku(postawione, frakcja);
      if (z > 0) suma.pokeball = (suma.pokeball ?? 0) + z;
      for (const [co, ile] of Object.entries(surowceZamku(postawione, frakcja)) as [
        Surowiec,
        number,
      ][]) {
        suma[co] = (suma[co] ?? 0) + ile;
      }
    }
  }
  return suma;
}

/** Nowa tura: odnawia ruch, dolicza dochód z zajętych budynków. */
export function nowaTura(s: StanMapy): Partial<Record<Surowiec, number>> {
  s.dzien++;
  s.bohater.ruch = statystyki(s.bohater).ruchMax;
  const wplyw = dochod(s);
  for (const [co, ile] of Object.entries(wplyw)) {
    s.skarbiec[co as Surowiec] += ile;
  }
  // Przyrost w zamkach. Bez niego rekrutacja byłaby jednorazowa i cała
  // gospodarka kończyłaby się w pierwszym dniu.
  for (const o of s.obiekty) {
    if (o.rodzaj === 'zamek' && o.nasz && o.dostepne) {
      // Przyrost liczy się z POSTAWIONYCH siedlisk: poziom bez siedliska nie
      // daje nic, a fort podnosi wszystkie naraz o połowę. Wcześniej przyrastały
      // wszystkie sześć poziomów niezależnie od miasta, więc rozbudowa nie
      // zmieniała niczego poza opisem.
      const przyrost = przyrostZamku(o.postawione ?? [], PRZYROST_ODDZIALU);
      o.dostepne = o.dostepne.map((ile, t) => Math.min(ile + przyrost[t], 99));
    }
  }
  return wplyw;
}

/** Data w formacie z Heroes 3: tydzień i dzień tygodnia. */
export function data(dzien: number) {
  return { tydzien: Math.floor((dzien - 1) / 7) + 1, dzienTygodnia: ((dzien - 1) % 7) + 1 };
}
