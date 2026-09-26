import { artefaktPoId, type Bohater, type StanMapy, type Surowiec } from './mapa';

/**
 * Kampania — kolejne misje ułożone w jedną opowieść, jak „The Succession Wars"
 * w Heroes 2: ekran kampanii z mapą krainy, opis misji, wybór jednego z trzech
 * bonusów na start, a po wygranej przejście do następnej.
 *
 * Ten plik jest KONTRAKTEM między scenami: menu, ekran kampanii, mapa przygody
 * i ekran wyniku rozmawiają wyłącznie przez typy i funkcje stąd. Żadna scena
 * nie trzyma własnej kopii tego, która misja jest następna ani co znaczy
 * „wygrana" — inaczej pierwsza zmiana kolejności misji rozjechałaby się
 * w trzech miejscach naraz.
 *
 * Co przechodzi między misjami: bohater (doświadczenie, umiejętności,
 * artefakty, atak i obrona) — tak jak w kampaniach Heroes 3. Armia i surowce
 * NIE przechodzą: każda misja zaczyna się od własnej armii startowej, bo
 * inaczej siła ostatniej misji zależałaby od tego, jak skąpo grało się
 * w pierwszej, i nie dałoby się jej zbalansować.
 */

export type WarunekZwyciestwa =
  /** Wszystkie zamki na mapie należą do gracza. */
  | { typ: 'zamki' }
  /** Bohater gracza nosi artefakt o tym identyfikatorze. */
  | { typ: 'artefakt'; artefakt: string }
  /** Skarbiec gracza ma co najmniej tyle surowca. */
  | { typ: 'zbierz'; surowiec: Surowiec; ile: number }
  /** Pokonany (zebrany) obiekt o tej nazwie — np. wódz, smok, strażnik skarbu. */
  | { typ: 'pokonaj'; nazwa: string };

export type WarunekPorazki =
  /** Gracz nie ma już żadnego zamku. */
  | { typ: 'utrata' }
  /** Minął termin — dzień gry większy niż `dni`. */
  | { typ: 'termin'; dni: number };

export type Bonus =
  | { typ: 'surowiec'; surowiec: Surowiec; ile: number; opis: string }
  | { typ: 'artefakt'; artefakt: string; opis: string }
  | { typ: 'oddzial'; tier: number; ile: number; opis: string }
  | { typ: 'statystyka'; atak?: number; obrona?: number; opis: string };

export interface Misja {
  id: string;
  /** Numer na liście i na mapie kampanii, od 1. */
  nr: number;
  tytul: string;
  /** Identyfikator planszy z rejestru `MAPY` w `src/data/mapy.ts`. */
  mapa: string;
  /** Akapity opisu misji — czytane przez dziecko, więc krótkie zdania. */
  opis: string[];
  zwyciestwo: WarunekZwyciestwa;
  porazka: WarunekPorazki[];
  /** Dokładnie trzy do wyboru, jak w Heroes 2. */
  bonusy: [Bonus, Bonus, Bonus];
  /** Gdzie stoi znacznik misji na ilustracji kampanii (0–1 w obu osiach). */
  naMapie: { x: number; y: number };
  /** Zdanie pokazywane po wygranej, przed przejściem dalej. */
  epilog: string;
}

export interface Kampania {
  id: string;
  tytul: string;
  /** Wstęp pokazywany przy pierwszym wejściu na ekran kampanii. */
  wstep: string[];
  misje: Misja[];
  /** Tekst zakończenia całej kampanii. */
  zakonczenie: string[];
}

/**
 * Pierwsza kampania. Treść misji wypełniają builderzy map i ekranów —
 * ta tablica jest jedynym źródłem kolejności.
 */
export const KAMPANIA: Kampania = {
  id: 'ksiezycowa-grota',
  tytul: 'Księżycowa Grota',
  wstep: [
    'Od stu lat Bór Szmaragdowy i Grota Księżycowa żyły w zgodzie.',
    'Aż pewnej nocy z Groty wyszli trenerzy w srebrnych płaszczach i zaczęli zabierać stworki z pogranicza.',
    'Stary strażnik Boru nie da już rady ich gonić. Dlatego wybrał ciebie.',
  ],
  misje: [
    {
      id: 'pierwsze-kroki',
      nr: 1,
      tytul: 'Pierwsze kroki',
      mapa: 'polana',
      opis: [
        'Srebrne płaszcze zajęły stary fort na wschodnim skraju Polany.',
        'Zbierz stworki, rozbuduj swój zamek i odbij fort, zanim wróg się w nim umocni.',
      ],
      zwyciestwo: { typ: 'zamki' },
      porazka: [{ typ: 'utrata' }],
      bonusy: [
        { typ: 'surowiec', surowiec: 'pokeball', ile: 30, opis: '30 pokeballi' },
        { typ: 'artefakt', artefakt: 'buty', opis: 'Buty Wędrowca' },
        { typ: 'oddzial', tier: 1, ile: 6, opis: '6 stworków drugiego poziomu' },
      ],
      naMapie: { x: 0.2198, y: 0.8643 },
      epilog: 'Fort jest wolny, a stworki z Polany wracają do domu. Ale srebrne płaszcze uciekły za góry.',
    },
    {
      id: 'klucze-do-przeleczy',
      nr: 2,
      tytul: 'Klucze do przełęczy',
      mapa: 'dwie-doliny',
      opis: [
        'Za górami leżą Dwie Doliny. Przełęczy pilnują strażnice, których nie da się pokonać siłą.',
        'Odszukaj namioty klucznika, otwórz przejścia i zdobądź Grotę Księżycową.',
      ],
      zwyciestwo: { typ: 'zamki' },
      porazka: [{ typ: 'utrata' }],
      bonusy: [
        { typ: 'surowiec', surowiec: 'jagoda', ile: 10, opis: '10 jagód' },
        { typ: 'statystyka', atak: 1, opis: '+1 do ataku' },
        { typ: 'oddzial', tier: 2, ile: 4, opis: '4 stworki trzeciego poziomu' },
      ],
      naMapie: { x: 0.348, y: 0.459 },
      epilog: 'Grota Księżycowa padła. W jej skarbcu była tylko mapa bagien i jedno słowo: Kamień.',
    },
    {
      id: 'bagienny-szlak',
      nr: 3,
      tytul: 'Bagienny szlak',
      mapa: 'bagna',
      opis: [
        'Wódz srebrnych płaszczy ukrył na bagnach Księżycowy Kamień. To z niego Grota bierze swoją moc.',
        'Odnajdź Kamień w ciągu ośmiu tygodni, zanim wódz przeniesie go w bezpieczne miejsce.',
      ],
      zwyciestwo: { typ: 'artefakt', artefakt: 'ksiezycowy-kamien' },
      porazka: [{ typ: 'utrata' }, { typ: 'termin', dni: 56 }],
      bonusy: [
        { typ: 'artefakt', artefakt: 'rower', opis: 'Rower Terenowy' },
        { typ: 'surowiec', surowiec: 'kamien', ile: 6, opis: '6 kamieni ewolucji' },
        { typ: 'statystyka', obrona: 2, opis: '+2 do obrony' },
      ],
      naMapie: { x: 0.5971, y: 0.752 },
      epilog: 'Księżycowy Kamień świeci w twojej dłoni. Bez niego twierdze Groty są słabsze niż kiedykolwiek.',
    },
    {
      id: 'oblezenie-groty',
      nr: 4,
      tytul: 'Oblężenie Groty',
      mapa: 'twierdza',
      opis: [
        'Srebrne płaszcze bronią się w dwóch ostatnich twierdzach na północy.',
        'Zdobądź obie i zakończ tę wojnę. Wróg nie będzie czekał, aż do niego przyjdziesz.',
      ],
      zwyciestwo: { typ: 'zamki' },
      porazka: [{ typ: 'utrata' }],
      bonusy: [
        { typ: 'oddzial', tier: 3, ile: 4, opis: '4 stworki czwartego poziomu' },
        { typ: 'artefakt', artefakt: 'tarcza', opis: 'Tarcza z Łusek' },
        { typ: 'surowiec', surowiec: 'pokeball', ile: 60, opis: '60 pokeballi' },
      ],
      naMapie: { x: 0.8242, y: 0.459 },
      epilog: 'Ostatnia twierdza Groty otwiera bramy. Srebrne płaszcze składają broń.',
    },
  ],
  zakonczenie: [
    'Stworki wróciły do Boru, a Grota Księżycowa znów świeci tylko nocą, tak jak dawniej.',
    'Stary strażnik mówi, że nigdy nie widział lepszego trenera. I chyba ma rację.',
  ],
};

export const misjaPoId = (id: string | undefined): Misja | undefined =>
  KAMPANIA.misje.find((m) => m.id === id);

// ————————————————————————————————————————————————————— postęp kampanii

export interface WynikMisji {
  dni: number;
  /** Punkty jak w tabeli rekordów Heroes 2 — patrz `punkty()`. */
  punkty: number;
}

export interface PostepKampanii {
  kampania: string;
  /** Imię i wygląd wybranego trenera — wybór „strony" z Heroes 2. */
  trener: string;
  /** Misje ukończone, w kolejności. */
  ukonczone: string[];
  wyniki: Record<string, WynikMisji>;
  /** Wybrany bonus (indeks 0–2) dla misji, która się teraz toczy. */
  bonus?: number;
  /** Bohater zabrany z ostatniej wygranej misji. */
  bohater?: BohaterPrzenoszony;
}

/** To, co z bohatera przechodzi dalej. Pozycja, ruch i armia — nie. */
export type BohaterPrzenoszony = Pick<
  Bohater,
  'imie' | 'atak' | 'obrona' | 'artefakty' | 'doswiadczenie' | 'umiejetnosci' | 'poziomOdebrany'
>;

const KLUCZ_POSTEPU = 'heroes-kampania-v1';

export function nowyPostep(trener: string): PostepKampanii {
  return { kampania: KAMPANIA.id, trener, ukonczone: [], wyniki: {} };
}

/**
 * Imię trenera po zmianach w grze. Bohaterka nazywała się kiedyś Ola —
 * zapisy i rekordy sprzed zmiany mają to imię, a obrazki i barwy są już
 * pod „Ela". Stare imię czytamy jako nowe, zamiast gubić postęp.
 */
const DAWNE_IMIONA: Record<string, string> = { Ola: 'Ela' };
export const imieTrenera = (imie: string) => DAWNE_IMIONA[imie] ?? imie;

export function wczytajPostep(): PostepKampanii | null {
  try {
    const s = localStorage.getItem(KLUCZ_POSTEPU);
    if (!s) return null;
    const p = JSON.parse(s) as PostepKampanii;
    if (p.kampania !== KAMPANIA.id) return null;
    p.trener = imieTrenera(p.trener);
    if (p.bohater) p.bohater.imie = imieTrenera(p.bohater.imie);
    return p;
  } catch {
    return null;
  }
}

export function zapiszPostep(p: PostepKampanii): void {
  try {
    localStorage.setItem(KLUCZ_POSTEPU, JSON.stringify(p));
  } catch {
    // Prywatna karta albo pełny limit — kampania działa dalej, bez pamięci.
  }
}

export function usunPostep(): void {
  try {
    localStorage.removeItem(KLUCZ_POSTEPU);
  } catch {
    // nie było czego kasować
  }
}

/** Pierwsza nieukończona misja — ta, którą ekran kampanii proponuje. */
export function biezacaMisja(p: PostepKampanii): Misja | undefined {
  return KAMPANIA.misje.find((m) => !p.ukonczone.includes(m.id));
}

export const kampaniaUkonczona = (p: PostepKampanii) => biezacaMisja(p) === undefined;

// ————————————————————————————————————————————————————— ocena misji

export type Rozstrzygniecie = 'wygrana' | 'przegrana' | null;

/**
 * Czy misja już się rozstrzygnęła. Wołać po każdym zdarzeniu, które może to
 * zmienić (bitwa, zebranie obiektu, koniec tury). Porażka ma pierwszeństwo
 * przed wygraną tylko wtedy, gdy obie zaszły naraz — w praktyce nie zachodzą.
 */
export function ocenMisje(stan: StanMapy, m: Misja): Rozstrzygniecie {
  for (const w of m.porazka) {
    if (w.typ === 'utrata') {
      const moje = stan.obiekty.some((o) => o.rodzaj === 'zamek' && o.wlasciciel === 'gracz');
      if (!moje) return 'przegrana';
    } else if (w.typ === 'termin' && stan.dzien > w.dni) {
      return 'przegrana';
    }
  }
  const z = m.zwyciestwo;
  if (z.typ === 'zamki') {
    const cudze = stan.obiekty.some((o) => o.rodzaj === 'zamek' && o.wlasciciel !== 'gracz');
    return cudze ? null : 'wygrana';
  }
  if (z.typ === 'artefakt') return stan.bohater.artefakty.includes(z.artefakt) ? 'wygrana' : null;
  if (z.typ === 'zbierz') return stan.skarbiec[z.surowiec] >= z.ile ? 'wygrana' : null;
  if (z.typ === 'pokonaj') {
    const cel = stan.obiekty.find((o) => o.nazwa === z.nazwa);
    return cel?.zebrany ? 'wygrana' : null;
  }
  return null;
}

/** Warunki misji słowami — dla okna „Warunki misji" i ekranu kampanii. */
export function opisZwyciestwa(m: Misja): string {
  const z = m.zwyciestwo;
  if (z.typ === 'zamki') return 'Zdobądź wszystkie zamki przeciwnika.';
  if (z.typ === 'artefakt') return `Odnajdź artefakt: ${artefaktPoId(z.artefakt)?.nazwa ?? z.artefakt}.`;
  if (z.typ === 'zbierz') return `Zbierz ${z.ile} × ${z.surowiec}.`;
  return `Pokonaj: ${z.nazwa}.`;
}

export function opisPorazki(m: Misja): string {
  return m.porazka
    .map((w) => (w.typ === 'utrata' ? 'Stracisz wszystkie zamki.' : `Nie zdążysz w ${w.dni} dni.`))
    .join(' ');
}

/**
 * Punkty za misję — im szybciej, tym więcej. Heroes 2 liczy wynik z liczby
 * dni i poziomu trudności; my mamy jeden poziom, więc liczą się dni.
 */
export function punkty(dni: number): number {
  return Math.max(50, 1000 - (dni - 1) * 15);
}
