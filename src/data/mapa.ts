import {
  ARENA_BONUS,
  BUDOWLA_STATYSTYKA,
  DRZEWO_WIEDZY_MIN,
  EWOLUCJA_KOSZT,
  GNIAZDO_TIER,
  OBSERWATORIUM_PROMIEN,
  OGNISKO_POKEBALLE,
  PROMIEN_WIDZENIA,
  PRZYROST_STRAZY,
  PRZYROST_STRAZY_SUFIT,
  SKRZYNIE,
  STAJNIA_BONUS,
  STAJNIA_DNI,
  STAJNIA_ODNOWA,
  WIATRAK_ODNOWA,
  naPokeballe,
} from './zasady-h3';
import {
  brakuje,
  budynek,
  daryZamku,
  moznaBudowac,
  przyrostZamku,
  stacNas,
  zaplac,
} from './zamki';
import { factionById } from './factions';
import type { Armia } from './armia';
import { efekt } from './umiejetnosci';

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
export type Teren =
  | 'trawa'
  | 'sciezka'
  | 'piasek'
  | 'jalowa'
  | 'snieg'
  | 'bagno'
  | 'las'
  | 'skaly'
  | 'woda';

export const TEREN_INFO: Record<Teren, { koszt: number | null; nazwa: string }> = {
  // Ścieżka tańsza od trawy — w Heroes 3 drogi są głównym powodem, dla
  // którego opłaca się nadkładać drogi, i to samo ma tu działać.
  sciezka: { koszt: 70, nazwa: 'Ścieżka' },
  trawa: { koszt: 100, nazwa: 'Trawa' },
  // [H3] Koszty ruchu po terenie: trawa/ziemia 100, żwir i piach 125–150,
  // bagno 175. To jest najtańszy sposób, żeby wybór drogi naprawdę coś
  // kosztował: bagno przez środek mapy jest krótsze, a droga naokoło szybsza.
  jalowa: { koszt: 125, nazwa: 'Ziemia jałowa' },
  piasek: { koszt: 125, nazwa: 'Piasek' },
  snieg: { koszt: 150, nazwa: 'Śnieg' },
  bagno: { koszt: 175, nazwa: 'Bagno' },
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
  | 'artefakt'
  | 'budynek'
  | 'straznica'
  | 'namiot'
  | 'jasnowidz';

/**
 * Klucze do strażnic granicznych.
 *
 * W Heroes 3 barw jest osiem i każda strażnica ma swoją; u nas dwie i to nie
 * jest oszczędność, tylko kształt mapy. Plansza ma dwa grzbiety po dwa
 * przejścia: zielony klucz otwiera oba przejścia z doliny gracza, niebieski —
 * oba do krainy przeciwnika. Dzięki temu mapa ma DWA akty, a nie cztery drobne
 * zadania, w których szuka się czterech namiotów.
 */
export type Klucz = 'zielony' | 'niebieski';

export const KLUCZE: Record<Klucz, { nazwa: string; barwa: number }> = {
  zielony: { nazwa: 'zielony klucz', barwa: 0x5fbf6a },
  niebieski: { nazwa: 'niebieski klucz', barwa: 0x4f8fe0 },
};

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
  /**
   * `misja` to artefakt-cel misji kampanii (np. Księżycowy Kamień). Leży na
   * mapie w jednym, ustalonym miejscu i NIE MOŻE wypaść z żadnego losowania —
   * skrzyni, wozu, chaty jasnowidza ani artefaktu leżącego luzem. Inaczej misja
   * „odnajdź Kamień" kończyłaby się przypadkiem, w skrzyni przy zamku.
   */
  klasa: 'drobny' | 'znaczny' | 'relikt' | 'misja';
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
  // Cel misji „Bagienny szlak". Dodatek skromny, na poziomie drobnego
  // artefaktu: to jest trofeum i dowód wygranej, a nie nagroda, która
  // rozstrzyga następną misję — bohater zabiera go ze sobą dalej.
  { id: 'ksiezycowy-kamien', nazwa: 'Księżycowy Kamień', klasa: 'misja', atak: 1, obrona: 1 },
];

/**
 * Artefakty, które wolno losować — wszystko poza celami misji. Każde losowanie
 * artefaktu (skrzynia, wóz, chata jasnowidza, artefakt na mapie) bierze pulę
 * STĄD albo filtruje po klasie, która `misja` nie jest.
 */
export const ARTEFAKTY_LOSOWE: Artefakt[] = ARTEFAKTY.filter((a) => a.klasa !== 'misja');

export const artefaktPoId = (id: string) => ARTEFAKTY.find((a) => a.id === id);

/**
 * Budowle odwiedzane — to, co w Heroes 3 stoi między kopalniami i daje powód,
 * żeby nadłożyć drogi.
 *
 * Wszystkie siedzą pod jednym rodzajem obiektu (`budynek`) i różnią się
 * wyłącznie wpisem w tej tablicy. Osobny rodzaj dla każdej z nich oznaczałby
 * czternaście gałęzi w `odwiedz`, czternaście wpisów w `BRYLA` i czternaście
 * miejsc do poprawienia przy każdej zmianie — a różnią się dokładnie trzema
 * rzeczami: rysunkiem, opisem i efektem.
 *
 * `odnowa` mówi, po ilu dniach można skorzystać ponownie:
 *   brak  — raz na zawsze (obóz treningowy, arena, drzewo wiedzy);
 *   0     — bez ograniczeń (portal, ośrodek ewolucji);
 *   n     — co n dni (źródło co dzień, wiatrak i stajnia co tydzień).
 * `znika` to drobiazgi jednorazowe, które po zabraniu schodzą z mapy.
 */
export type EfektBudowli =
  | { typ: 'staty'; atak?: number; obrona?: number }
  | { typ: 'arena' }
  | { typ: 'doswiadczenie' }
  | { typ: 'odslona' }
  | { typ: 'stajnia' }
  | { typ: 'zrodlo' }
  | { typ: 'portal' }
  | { typ: 'gniazdo' }
  | { typ: 'ewolucja' }
  | { typ: 'surowce' };

export interface Budowla {
  nazwa: string;
  /** jedno zdanie: co to daje. Scena pokazuje to po najechaniu. */
  opis: string;
  /** nazwa pliku w `public/mapa` (bez rozszerzenia) */
  plik: string;
  /** wysokość rysunku w polach */
  wys: number;
  /** ile pól zajmuje bryła (szerokość × wysokość), jeśli więcej niż jedno */
  bryla?: [number, number];
  efekt: EfektBudowli;
  odnowa?: number;
  znika?: boolean;
  /** ile pokeballi dokłada oprócz surowca (ognisko) */
  pokeballe?: number;
}

export const BUDOWLE: Record<string, Budowla> = {
  'oboz-treningowy': {
    nazwa: 'Obóz Treningowy',
    opis: `+${BUDOWLA_STATYSTYKA} do ataku, raz na zawsze`,
    plik: 'oboz-treningowy',
    wys: 1.6,
    efekt: { typ: 'staty', atak: BUDOWLA_STATYSTYKA },
  },
  'kamienna-wieza': {
    nazwa: 'Kamienna Wieża',
    opis: `+${BUDOWLA_STATYSTYKA} do obrony, raz na zawsze`,
    plik: 'kamienna-wieza',
    wys: 2.0,
    efekt: { typ: 'staty', obrona: BUDOWLA_STATYSTYKA },
  },
  arena: {
    nazwa: 'Arena',
    opis: `Wybór: +${ARENA_BONUS} ataku albo +${ARENA_BONUS} obrony`,
    plik: 'arena',
    wys: 1.5,
    bryla: [3, 1],
    efekt: { typ: 'arena' },
  },
  'drzewo-wiedzy': {
    nazwa: 'Drzewo Wiedzy',
    opis: 'Doświadczenie na cały następny poziom',
    plik: 'drzewo-wiedzy',
    wys: 2.4,
    efekt: { typ: 'doswiadczenie' },
  },
  'wieza-obserwacyjna': {
    nazwa: 'Wieża Obserwacyjna',
    opis: `Odsłania mapę na ${OBSERWATORIUM_PROMIEN} pól wokół`,
    plik: 'wieza-obserwacyjna',
    wys: 2.6,
    efekt: { typ: 'odslona' },
  },
  ranczo: {
    nazwa: 'Ranczo Ponyt',
    opis: `+${STAJNIA_BONUS} ruchu przez ${STAJNIA_DNI} dni`,
    plik: 'ranczo',
    wys: 1.5,
    bryla: [3, 1],
    efekt: { typ: 'stajnia' },
    odnowa: STAJNIA_ODNOWA,
  },
  zrodlo: {
    nazwa: 'Źródło Mocy',
    opis: 'Odnawia punkty ruchu — raz dziennie',
    plik: 'zrodlo',
    wys: 1.1,
    efekt: { typ: 'zrodlo' },
    odnowa: 1,
  },
  portal: {
    nazwa: 'Portal',
    opis: 'Przenosi do bliźniaczego portalu',
    plik: 'portal',
    wys: 1.8,
    efekt: { typ: 'portal' },
    odnowa: 0,
  },
  gniazdo: {
    nazwa: 'Gniazdo',
    opis: 'Zajęte hoduje oddziały dla twojego zamku',
    plik: 'gniazdo',
    wys: 1.4,
    efekt: { typ: 'gniazdo' },
  },
  'osrodek-ewolucji': {
    nazwa: 'Ośrodek Ewolucji',
    opis: `Ulepsza oddział o poziom za ${EWOLUCJA_KOSZT} kamienie ewolucji`,
    plik: 'osrodek-ewolucji',
    wys: 1.9,
    bryla: [3, 1],
    efekt: { typ: 'ewolucja' },
    odnowa: 0,
  },
  wiatrak: {
    nazwa: 'Wiatrak',
    opis: 'Garść surowca — raz na tydzień',
    plik: 'wiatrak',
    wys: 2.2,
    efekt: { typ: 'surowce' },
    odnowa: WIATRAK_ODNOWA,
  },
  ognisko: {
    nazwa: 'Ognisko',
    opis: 'Pokeballe i surowiec po wędrowcach',
    plik: 'ognisko',
    wys: 0.9,
    efekt: { typ: 'surowce' },
    znika: true,
    pokeballe: OGNISKO_POKEBALLE,
  },
  chatka: {
    nazwa: 'Chatka Skrzata',
    opis: 'Garść surowca ze schowka',
    plik: 'chatka',
    wys: 1.2,
    efekt: { typ: 'surowce' },
    znika: true,
  },
  woz: {
    nazwa: 'Wóz Kupca',
    opis: 'Porzucony ładunek: surowce albo artefakt',
    plik: 'woz',
    wys: 1.3,
    efekt: { typ: 'surowce' },
    znika: true,
  },
};

export const budowlaPoId = (id: string | undefined) => (id ? BUDOWLE[id] : undefined);

/** Kto jest właścicielem obiektu/zamku/bohatera na mapie. */
export type Wlasciciel = 'gracz' | 'wrog';

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
   * Potwór: ilu ich było na początku gry. Z tego liczy się sufit przyrostu —
   * stado rośnie co tydzień, ale nie w nieskończoność.
   */
  wyjsciowe?: number;
  /**
   * Czy zniknął z mapy. Dotyczy rzeczy jednorazowych: stosu surowca, skrzyni,
   * pokonanego potwora.
   */
  zebrany?: boolean;
  /**
   * Czyj jest budynek produkcyjny (kopalnia, gniazdo, zamek). To NIE to samo
   * co `zebrany`: kopalni i sadu się nie podnosi — wchodzi się na nie,
   * zajmuje i zostają na mapie, dając surowiec każdego dnia. Wcześniej sad
   * znikał po wejściu jak stos jagód i cała mechanika była nieczytelna.
   *
   * Trzy stany: brak pola — niczyje; `'gracz'` — nasze; `'wrog'` — przeciwnika.
   * Wcześniej było to `boolean` ("nasz"), co nie miało miejsca na "wroga" —
   * kopalnia była albo nasza, albo (fałszywie) niczyja, nawet gdy stała już
   * zajęta przez przeciwnika. Tamten model rozjeżdżał się z dniem, w którym
   * na mapie pojawił się drugi gracz.
   */
  wlasciciel?: Wlasciciel;
  /**
   * Zamek: ile oddziałów każdego poziomu czeka na rekrutację. Przyrasta co
   * dzień, tak jak w Heroes 3 przyrasta tygodniowo — u nas codziennie i po
   * trochu, bo tydzień to dla ośmiolatka bardzo długo.
   */
  dostepne?: number[];
  /** Z której frakcji rekrutuje ten zamek. */
  frakcjaZamku?: string;
  /**
   * Zamek: co już w nim stoi (identyfikatory z `zamki.ts`). To jest cała
   * pamięć rozbudowy: dochód (ratusze), przyrost i to, które poziomy w ogóle
   * przyrastają (siedliska, fort) liczą się z tej listy. Nie da się więc mieć
   * siedliska, które daje oddziały, ale nie widać go na panoramie — ani
   * ratusza, który stoi, a nie daje ani jednego pokeballa.
   */
  postawione?: string[];
  /**
   * Którego dnia postawiono tu ostatni budynek. Heroes 3 pozwala na jeden
   * budynek dziennie i to jest powód, dla którego kolejność rozbudowy w ogóle
   * jest wyborem.
   */
  budowanoDnia?: number;
  /**
   * Budowla odwiedzana: identyfikator z `BUDOWLE`. Wszystkie czternaście
   * siedzi pod jednym rodzajem obiektu i różni się właśnie tym polem.
   */
  budynek?: string;
  /**
   * Którego dnia budowla była użyta ostatni raz. Z tego liczy się `odnowa`:
   * źródło działa raz dziennie, wiatrak i ranczo raz na tydzień, a budowla
   * bez `odnowy` — raz na zawsze.
   */
  uzyteDnia?: number;
  /** Portal: numer bliźniaczego portalu, do którego przenosi. */
  para?: number;
  /**
   * Chata jasnowidza: czego żąda i co za to daje. Zadanie jest ustalane raz,
   * przy składaniu planszy — inaczej dałoby się wyjść i wejść jeszcze raz,
   * aż trafi się na tanie.
   */
  zadanie?: { surowiec: Surowiec; ile: number };
  nagroda?: { artefakt?: string; doswiadczenie?: number };
  /** Czy zadanie zostało już wykonane. */
  spelnione?: boolean;
  /**
   * Strażnica graniczna i namiot klucznika: barwa klucza. Strażnica otwiera
   * się wyłącznie kluczem w SWOJEJ barwie; namiot tej samej barwy klucz daje.
   */
  klucz?: Klucz;
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
  /**
   * Armia jako rząd slotów stałej długości, z dziurami — patrz `armia.ts`.
   * Slot jest MIEJSCEM, nie pozycją na liście: układ, który gracz ustawi
   * na ekranie bohatera, ma przeżyć zamknięcie okna.
   */
  armia: Armia;
  /** Zebrane artefakty (identyfikatory z `ARTEFAKTY`). */
  artefakty: string[];
  doswiadczenie: number;
  /**
   * Drugorzędne umiejętności: identyfikator z `UMIEJETNOSCI` → poziom 1-3.
   * Trzymamy jako mapę, a nie listę, bo jedyne pytanie, jakie zadają zasady
   * gry, brzmi „na jakim poziomie mam X" — lista wymagałaby szukania przy
   * każdym pytaniu, a pytań jest osiem na turę.
   */
  umiejetnosci?: Record<string, number>;
  /**
   * Poziom, za który gracz ODEBRAŁ już nagrodę (wybrał umiejętność).
   *
   * Osobno od `poziom(doswiadczenie)`, bo poziom wylicza się z doświadczenia
   * natychmiast, a okno wyboru pokazuje się dopiero, gdy da się je pokazać.
   * Bez tego licznika awans widziała tylko bitwa: skrzynia i drzewo wiedzy
   * też dają doświadczenie i po cichu podnosiły poziom, a wybór umiejętności
   * przepadał.
   */
  poziomOdebrany?: number;
  /**
   * Do którego dnia włącznie trwa dodatek do ruchu z ranczo. Trzymamy datę
   * końca, a nie licznik dni: licznik trzeba by zmniejszać co turę i każde
   * pominięcie tury (bitwa, wczytanie stanu) rozjeżdżałoby go z kalendarzem.
   */
  bonusRuchuDo?: number;
  /**
   * Cel wytyczonej trasy, do którego bohater nie zdążył dojść w tej turze.
   * Nowy dzień pokazuje tę trasę od razu jako zaznaczoną — jak w Heroes 3 —
   * zamiast zmuszać do ponownego wskazywania tego samego miejsca.
   */
  celDlugiejTrasy?: { x: number; y: number };
}

/**
 * Statystyki bohatera z doliczonymi artefaktami. Trzymamy je osobno od
 * `Bohater`, żeby podniesienie artefaktu nie wymagało przeliczania i zapisywania
 * niczego — dodatki zawsze liczą się z tego, co bohater aktualnie nosi, więc
 * nie da się ich policzyć dwa razy.
 */
/**
 * Co daje awans na poziom.
 *
 * Poziomy istniały wcześniej jako sama liczba w panelu i NIE DAWAŁY NICZEGO:
 * `statystyki` doliczały wyłącznie artefakty. Doświadczenie było więc licznikiem
 * bez znaczenia — a to jedyna nagroda za wygraną bitwę poza tym, co po niej
 * zostaje na mapie.
 *
 * Zasada jest prosta na tyle, żeby dziecko ją zauważyło samo: co poziom
 * na przemian atak i obrona, a co trzeci dodatkowo zapas ruchu. W Heroes 3
 * przydział jest losowany z wag klasy bohatera, ale losowa nagroda, której
 * nie da się przewidzieć, uczy tylko tego, że nagrody są losowe.
 */
export function bonusPoziomu(p: number) {
  const awansow = Math.max(0, p - 1);
  return {
    atak: Math.ceil(awansow / 2),
    obrona: Math.floor(awansow / 2),
    ruch: Math.floor(awansow / 3) * 100,
  };
}

/**
 * Ile doświadczenia zebrano w bieżącym poziomie i ile trzeba na następny.
 * Panel pokazuje to jako „X/Y do awansu" — bez tego nie widać ani tego, że
 * awans w ogóle nadchodzi, ani jak blisko jest.
 */
export function postepPoziomu(doswiadczenie: number) {
  let p = 1;
  let prog = 100;
  let dolny = 0;
  let gorny = prog;
  while (doswiadczenie >= gorny) {
    p++;
    dolny = gorny;
    prog = Math.round(prog * 1.4);
    gorny += prog;
  }
  return { poziom: p, wPoziomie: doswiadczenie - dolny, doAwansu: gorny - dolny };
}

export function statystyki(b: Bohater) {
  const bonus = bonusPoziomu(poziom(b.doswiadczenie));
  let atak = b.atak + bonus.atak;
  let obrona = b.obrona + bonus.obrona;
  let ruchMax = b.ruchMax + bonus.ruch;
  for (const id of b.artefakty) {
    const a = artefaktPoId(id);
    if (!a) continue;
    atak += a.atak ?? 0;
    obrona += a.obrona ?? 0;
    ruchMax += a.ruch ?? 0;
  }
  return { atak, obrona, ruchMax };
}

/**
 * Zapas ruchu na dziś: maksimum bohatera plus dodatek z ranczo, jeśli jeszcze
 * trwa. Jedno miejsce, bo liczą to trzy: nowa tura, źródło mocy i panel.
 */
export function ruchNaDzis(s: StanMapy, kto: Wlasciciel = 'gracz'): number {
  const bohater = kto === 'gracz' ? s.bohater : s.wrogBohater;
  const bonus =
    bohater.bonusRuchuDo !== undefined && s.dzien <= bohater.bonusRuchuDo ? STAJNIA_BONUS : 0;
  // Zwiad podbija CAŁY zapas, razem z dodatkiem z ranczo — inaczej gracz
  // z mistrzowskim Zwiadem miałby w dniu po ranczu mniejszy procentowy zysk
  // niż zwykle i wyglądałoby to na usterkę.
  return Math.round((statystyki(bohater).ruchMax + bonus) * (1 + efekt(bohater, 'ruch')));
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
  /** Identyfikator planszy z `MAPY` (src/data/mapy.ts). Brak = „Dwie Doliny". */
  mapa?: string;
  /** Misja kampanii, która się na tej planszy toczy. Brak = gra pojedyncza. */
  misja?: string;
  /**
   * Jak gra przeciwnik na tej planszy (z `USTAWIENIA` planszy): `aktywny` —
   * pełna tura, bohater wyrusza po mapie; `obronca` — bohater zostaje w zamku,
   * a przeciwnik co dzień werbuje do załogi, czyli umacnia się. Brak = aktywny.
   */
  wrogTryb?: 'aktywny' | 'obronca';
  /** Od którego dnia AI wolno wycelować w zamek gracza. Brak = wartość domyślna AI. */
  dzienNatarcia?: number;
  /**
   * Czy od dnia natarcia zamek gracza jest dla AI celem ponad wszystko
   * (o ile go zna i da radę go zdobyć). Brak = AI najpierw odkrywa mapę.
   */
  natarcie?: boolean;
  szer: number;
  wys: number;
  teren: Teren[][];
  obiekty: Obiekt[];
  bohater: Bohater;
  skarbiec: Skarbiec;
  /**
   * Bohater przeciwnika. Gra jest tymi samymi zasadami co bohater gracza —
   * `trasa`, `odwiedz`, `zbuduj` — tyle że wywoływanymi z `kto: 'wrog'`.
   * Osobne pole (a nie lista bohaterów) celowo: gra ma dokładnie dwie strony,
   * nigdy więcej, i kod, który by to zakładał, byłby ogólnością bez potrzeby.
   */
  wrogBohater: Bohater;
  wrogSkarbiec: Skarbiec;
  dzien: number;
  /**
   * Mgła wojny GRACZA. `true` znaczy „już tu byliśmy". Raz odsłonięte pole
   * zostaje odsłonięte — tak jest w Heroes 3 i tak jest łaskawiej dla dziecka
   * niż mgła, która wraca.
   */
  odkryte: boolean[][];
  /**
   * Mgła wojny PRZECIWNIKA — osobna siatka, bo przeciwnik nie ma prawa
   * wiedzieć więcej niż faktycznie odkrył. Bez tego AI widziałoby całą mapę
   * i zawsze szło po najlepszy łup, a to czuć od razu jako oszustwo.
   */
  wrogOdkryte: boolean[][];
  /**
   * Pola zajęte bryłami zamków i kopalni, policzone raz. Zamek ani kopalnia
   * nigdy z mapy nie znikają, więc ten zbiór się nie zmienia — a liczenie go
   * przy każdym pytaniu o koszt pola oznaczałoby przechodzenie wszystkich
   * obiektów wewnątrz wyznaczania trasy.
   */
  bryly?: Set<string>;
  /**
   * Klucze zabrane z namiotów klucznika. Klucz należy do GRACZA, nie do
   * bohatera — tak jest w Heroes 3 i tylko tak ma sens, gdy bohaterów będzie
   * kiedyś dwóch: znaleziony klucz otwiera strażnice każdemu z nich.
   */
  klucze: Klucz[];
  /** Klucze przeciwnika — osobna pula, symetrycznie z `klucze` gracza. */
  wrogKlucze: Klucz[];
}

/**
 * Odsłania mgłę wokół bohatera — albo wokół dowolnego pola, bo wieża
 * obserwacyjna odsłania okolicę WIEŻY, a nie tego, kto na nią wszedł.
 */
/** Bohater danej strony. Jedyne miejsce, które wie, że są dwa pola na stan. */
export const bohaterOf = (s: StanMapy, kto: Wlasciciel): Bohater =>
  kto === 'gracz' ? s.bohater : s.wrogBohater;

/** Skarbiec danej strony. */
export const skarbiecOf = (s: StanMapy, kto: Wlasciciel): Skarbiec =>
  kto === 'gracz' ? s.skarbiec : s.wrogSkarbiec;

/** Siatka mgły wojny danej strony. */
export const odkryteOf = (s: StanMapy, kto: Wlasciciel): boolean[][] =>
  kto === 'gracz' ? s.odkryte : s.wrogOdkryte;

/** Klucze zebrane przez daną stronę. */
export const kluczeOf = (s: StanMapy, kto: Wlasciciel): Klucz[] =>
  kto === 'gracz' ? s.klucze : s.wrogKlucze;

export function odslon(
  s: StanMapy,
  promien = PROMIEN_WIDZENIA,
  srodek?: Pole,
  kto: Wlasciciel = 'gracz'
): number {
  let nowe = 0;
  const bohater = bohaterOf(s, kto);
  const { x, y } = srodek ?? bohater;
  // Tropiciel poszerza wzrok BOHATERA, nie wieży: odsłanianie z podanym
  // środkiem to zawsze budowla, która widzi tyle, ile widzi, bez względu na
  // to, kto koło niej przechodził.
  if (!srodek) promien += efekt(bohater, 'mgla');
  const siatka = odkryteOf(s, kto);
  for (let dy = -promien; dy <= promien; dy++) {
    for (let dx = -promien; dx <= promien; dx++) {
      // Koło, nie kwadrat — inaczej odsłonięty obszar ma widoczne rogi
      // i wygląda jak usterka, a nie jak zasięg wzroku.
      if (dx * dx + dy * dy > promien * promien) continue;
      const nx = x + dx;
      const ny = y + dy;
      if (nx < 0 || ny < 0 || nx >= s.szer || ny >= s.wys) continue;
      if (!siatka[ny][nx]) {
        siatka[ny][nx] = true;
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
 * Bryły zajmujące więcej niż jedno pole — szerokość i wysokość w polach.
 *
 * W Heroes 3 zamek zajmuje kawał planszy, a wchodzi się do niego JEDNYM polem
 * na dole; tak samo kopalnia ma budynek i hałdę, a bramę w jednym miejscu.
 * To nie jest ozdoba: dzięki temu widać z daleka, że to coś dużego i ważnego,
 * a mimo to wiadomo dokładnie, gdzie trzeba stanąć.
 *
 * Pole obiektu (`o.x`, `o.y`) jest WEJŚCIEM i leży pośrodku dolnego rzędu.
 * Reszta bryły jest nieprzejezdna i po kliknięciu otwiera ekran miasta —
 * czyli dokładnie ten podział, który w H3 pokazuje zmiana kursora.
 *
 * Szerokości są nieparzyste, żeby wejście wypadało dokładnie na środku.
 */
export const BRYLA: Partial<Record<RodzajObiektu, [number, number]>> = {
  zamek: [3, 2],
  kopalnia: [3, 1],
  // Strażnica ma szerokość trzech pól TYLKO dla rysunku: scena bierze stąd
  // dosunięcie od krawędzi planszy, cień i wysokość. Które pola naprawdę
  // blokuje, mówi `polaBryly` — i są to pola OBOK wejścia, w jego rzędzie,
  // a nie rząd nad nim jak u zamku.
  straznica: [3, 1],
};

/**
 * Bryła konkretnego obiektu. Rodzaj wystarczał, dopóki wszystkie budowle
 * jednego rodzaju były tej samej wielkości — a budowle odwiedzane nie są:
 * arena i ośrodek ewolucji zajmują trzy pola, ognisko i chatka jedno.
 * Wielkość siedzi więc przy budowli, a nie przy rodzaju.
 */
export function brylaObiektu(o: Obiekt): [number, number] | undefined {
  if (o.rodzaj === 'budynek') return budowlaPoId(o.budynek)?.bryla;
  return BRYLA[o.rodzaj];
}

/**
 * Pola zajęte przez bryłę obiektu, BEZ wejścia.
 *
 * Pole, które wypadłoby poza mapą, na nieprzejezdnym terenie albo na innym
 * obiekcie, jest po prostu pomijane. To jest celowe: plansza była układana,
 * gdy każdy obiekt zajmował jedno pole, a bryła nie ma prawa jej unieważnić —
 * zamek przy skале dostanie węższy bok i tyle.
 */
export function polaBryly(s: StanMapy, o: Obiekt): Pole[] {
  // Strażnica graniczna stoi W POPRZEK drogi, więc jej mur to pola OBOK
  // wejścia, w tym samym rzędzie — a nie rząd nad nim, jak u zamku czy
  // kopalni. Przejście przez grzbiet ma dwa pola szerokości, więc brama
  // szeroka na trzy zamyka je w całości. To jest jedyny powód, dla którego
  // strażnica w ogóle cokolwiek pilnuje: gdyby blokowała samo swoje pole,
  // dałoby się ją minąć bokiem, dokładnie tak, jak dawało się minąć
  // strażnika w przejściu szerokim na cztery pola.
  if (o.rodzaj === 'straznica') {
    if (o.zebrany) return [];
    return [
      { x: o.x - 1, y: o.y },
      { x: o.x + 1, y: o.y },
    ].filter(
      (p) =>
        wGranicach(s, p.x, p.y) &&
        TEREN_INFO[s.teren[p.y][p.x]].koszt !== null &&
        !obiektNa(s, p.x, p.y)
    );
  }
  const rozmiar = brylaObiektu(o);
  if (!rozmiar || o.zebrany) return [];
  const [szer, wys] = rozmiar;
  const pola: Pole[] = [];
  // Bryła stoi ZA wejściem, nie na nim. Pierwsza wersja obejmowała rząd wejścia
  // i budynek zasłaniał jedyne pole, w które da się wejść bohaterem: gracz
  // widział wielki zamek, klikał w to, co widać, i zawsze otwierał tylko
  // podgląd miasta. W Heroes 3 brama leży PRZED budowlą, na wolnej ziemi.
  for (let dy = -wys; dy <= -1; dy++) {
    for (let dx = -Math.floor(szer / 2); dx <= Math.floor(szer / 2); dx++) {
      const x = o.x + dx;
      const y = o.y + dy;
      if (!wGranicach(s, x, y)) continue;
      if (TEREN_INFO[s.teren[y][x]].koszt === null) continue;
      if (obiektNa(s, x, y)) continue;
      // Bryła nie zamurowuje wejścia sąsiada.
      //
      // Zamek wroga stoi dwa pola od kopalni i jego mury odcięły jej wszystkie
      // dojścia — kopalnia stała się nieosiągalna, choć na ekranie wyglądała
      // normalnie. Pole stykające się bokiem z cudzym wejściem zostaje więc
      // wolne. Kosztuje to kawałek muru tam, gdzie budowle stoją ciasno,
      // a chroni przed planszą, po której nie da się grać.
      if (
        s.obiekty.some(
          (inny) =>
            inny !== o &&
            !inny.zebrany &&
            Math.abs(inny.x - x) + Math.abs(inny.y - y) === 1
        )
      )
        continue;
      pola.push({ x, y });
    }
  }
  return pola;
}

/** Obiekt, którego bryła (poza wejściem) przykrywa to pole. */
export function brylaNa(s: StanMapy, x: number, y: number): Obiekt | undefined {
  return s.obiekty.find(
    (o) => !o.zebrany && polaBryly(s, o).some((p) => p.x === x && p.y === y)
  );
}

/** Wszystkie pola pod bryłami, jako `"x,y"`. Liczone raz i zapamiętane. */
export function polaZajete(s: StanMapy): Set<string> {
  // UWAGA: ten zbiór NIE jest już niezmienny. Zamek i kopalnia z mapy nie
  // znikają, ale otwarta strażnica graniczna — owszem, i wtedy przejście musi
  // natychmiast stać się przejezdne. `odwiedz` kasuje więc `s.bryly`, żeby
  // policzyły się od nowa. Bez tego brama stoi otworem na ekranie, a trasa
  // dalej ją omija.
  if (!s.bryly) {
    s.bryly = new Set(
      s.obiekty.flatMap((o) => polaBryly(s, o).map((p) => `${p.x},${p.y}`))
    );
  }
  return s.bryly;
}

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
 * Koszt wejścia na pole — samego TERENU, bez pytania, co na nim leży.
 *
 * Kto na pole wejdzie, a kto tylko sięgnie z sąsiedztwa, rozstrzyga się wyżej:
 * `trasa` wpuszcza na pole obiektu wyłącznie jako na CEL, a scena skraca marsz
 * o jedno pole przed wszystkim, co jest w `Z_SASIEDNIEGO_POLA` (stos surowca,
 * artefakt, skrzynia, potwór). Wprost wjeżdża się tylko na przejezdne wejście
 * zamku i kopalni — tak jak w Heroes 3.
 */
export function kosztPola(s: StanMapy, x: number, y: number): number | null {
  if (!wGranicach(s, x, y)) return null;
  // Mury zamku i budynek kopalni są nie do przejścia — wchodzi się wejściem.
  if (polaZajete(s).has(`${x},${y}`)) return null;
  // Zamknięta strażnica jest murem także na SWOIM polu. Tym różni się od
  // potwora: potwora się bije i pole jest przejezdne po wygranej, strażnicy
  // nie da się pokonać w ogóle — otwiera ją klucz. Wejście na jej pole jest
  // osobnym przypadkiem w `trasa`: wolno tam wejść jako na CEL, i wtedy albo
  // brama się otwiera, albo gracz dostaje wiadomość, po co mu klucz.
  if (zamknietaBrama(s, x, y)) return null;
  return TEREN_INFO[s.teren[y][x]].koszt;
}

/**
 * Rzeczy ODWIEDZANE Z SĄSIEDNIEGO POLA — bohater na nie nie wchodzi.
 *
 * Tak to działa w Heroes 3: pole obiektu jest ZABLOKOWANE, a jednocześnie
 * „odwiedzalne". Bohater wjeżdża w nie z sąsiedztwa, obiekt się odpala,
 * a bohater zostaje tam, gdzie stał. Na stałe wchodzi się tylko na przejezdne
 * WEJŚCIE, jakie mają zamek i kopalnia — dlatego kopalni się nie „podnosi",
 * tylko się ją zajmuje i stoi w jej bramie.
 *
 * U nas przez długi czas wszystko działało odwrotnie i to zgubiło skrzynię:
 * bohater wchodził na jej pole, obok stała straż, scena wybierała bitwę,
 * a po niej nikt skrzyni już nie odwiedzał — a że bohater NA NIEJ STAŁ, nie
 * dało się jej nawet wywołać ponownie bez odejścia i powrotu.
 *
 * Potwór jest na tej liście z tego samego powodu, dla którego jest w Heroes 3:
 * bije się go z sąsiedniego pola, a nie wchodząc na niego.
 */
export const Z_SASIEDNIEGO_POLA: RodzajObiektu[] = [
  'surowiec',
  'artefakt',
  'skrzynia',
  'potwor',
];

export const zSasiedniegoPola = (s: StanMapy, x: number, y: number): Obiekt | undefined =>
  s.obiekty.find(
    (o) => !o.zebrany && o.x === x && o.y === y && Z_SASIEDNIEGO_POLA.includes(o.rodzaj)
  );

/** Zamknięta strażnica stojąca na tym polu — albo `undefined`. */
export function zamknietaBrama(s: StanMapy, x: number, y: number): Obiekt | undefined {
  return s.obiekty.find((o) => o.rodzaj === 'straznica' && !o.zebrany && o.x === x && o.y === y);
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
  // Zamknięta brama jest jedynym polem nieprzejezdnym, na które wolno wejść:
  // inaczej nie dałoby się do niej podejść i użyć klucza, a gracz widziałby
  // bramę, w którą nie da się kliknąć.
  const bramaNaCelu = zamknietaBrama(s, doX, doY);
  if (!wGranicach(s, doX, doY) || (kosztPola(s, doX, doY) === null && !bramaNaCelu)) return null;
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
      const koncoweDlaBramy = bramaNaCelu !== undefined && nx === doX && ny === doY;
      const bazowy = koncoweDlaBramy
        ? TEREN_INFO[s.teren[ny][nx]].koszt ?? 100
        : kosztPola(s, nx, ny);
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

/**
 * Ile dni zajmie przejście całej trasy, licząc dzisiejszy jako pierwszy —
 * każdy kolejny dzień zaczyna się z pełnym zapasem ruchu (`ruchMax`).
 */
export function dniNaTrase(bohater: Bohater, kroki: Krok[]): number {
  let zostalo = bohater.ruch;
  let dni = 1;
  for (const k of kroki) {
    if (k.koszt > zostalo) {
      dni++;
      zostalo = bohater.ruchMax;
    }
    zostalo -= k.koszt;
  }
  return dni;
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
  /**
   * Budowla stawia pytanie: arena pyta o statystykę, ośrodek ewolucji o zgodę
   * na ulepszenie. Skrzynia ma własne `wybor`, bo jej okno pokazuje dwie
   * konkretne nagrody, a nie listę odpowiedzi.
   */
  pytanie?: Pytanie;
  /** Portal: dokąd przenosi. Scena przestawia bohatera i odsłania mgłę. */
  przenies?: Pole;
  /** Coś odsłoniło mgłę poza ruchem bohatera — scena musi ją przerysować. */
  odkryto?: boolean;
}

/**
 * Pytanie budowli. Ta sama konstrukcja obsługuje arenę (dwie statystyki)
 * i ośrodek ewolucji (ulepszać czy nie), bo z punktu widzenia sceny to jedno
 * i to samo: okno, kilka przycisków, jedna odpowiedź.
 */
export interface Pytanie {
  obiekt: Obiekt;
  tytul: string;
  tresc: string;
  opcje: Array<{ klucz: string; etykieta: string }>;
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

/**
 * Oddział, który da się ulepszyć w Ośrodku Ewolucji, i to, co z niego wyjdzie.
 *
 * Bierzemy PIERWSZY oddział, który ma dokąd awansować — nie najsilniejszy
 * i nie wybrany z listy. Wybór oddziału to trzecie okno z rzędu na jednym
 * polu, a różnica między awansem drobnicy a awansem czempiona jest dla
 * ośmiolatka niewidoczna; liczba w karcie armii rośnie tak czy inaczej.
 */
export function doUlepszenia(b: Bohater) {
  for (let i = 0; i < b.armia.length; i++) {
    const o = b.armia[i];
    if (!o || o.tier >= 5) continue;
    const f = factionById(o.frakcja);
    if (!f) continue;
    const z = f.units[o.tier];
    const na = f.units[o.tier + 1];
    // Liczebność spada w proporcji, w jakiej stoją te poziomy w drzewku
    // frakcji — inaczej ulepszenie byłoby czystym zyskiem i nie byłoby czego
    // rozważać. Nigdy poniżej jednego: oddział nie może zniknąć w nagrodę.
    const ile = Math.max(1, Math.round((o.ile * na.count) / z.count));
    return { indeks: i, oddzial: o, na, ile };
  }
  return undefined;
}

/** Rozstrzygnięcie pytania budowli (arena, ośrodek ewolucji). */
export function odpowiedzNaPytanie(
  s: StanMapy,
  p: Pytanie,
  klucz: string,
  kto: Wlasciciel = 'gracz'
): string {
  const o = p.obiekt;
  const b = budowlaPoId(o.budynek);
  const bohater = bohaterOf(s, kto);
  const skarbiec = skarbiecOf(s, kto);
  if (klucz === 'nie') return 'Może innym razem';

  if (b?.efekt.typ === 'arena') {
    o.uzyteDnia = s.dzien;
    if (klucz === 'atak') {
      bohater.atak += ARENA_BONUS;
      return `+${ARENA_BONUS} do ataku`;
    }
    bohater.obrona += ARENA_BONUS;
    return `+${ARENA_BONUS} do obrony`;
  }

  if (b?.efekt.typ === 'ewolucja') {
    const u = doUlepszenia(bohater);
    if (!u) return 'Nie ma czego ulepszać';
    if (skarbiec.kamien < EWOLUCJA_KOSZT) return 'Za mało kamieni ewolucji';
    skarbiec.kamien -= EWOLUCJA_KOSZT;
    const stara = u.oddzial.nazwa;
    bohater.armia[u.indeks] = {
      sprite: u.na.sprite,
      nazwa: u.na.name,
      ile: u.ile,
      frakcja: u.oddzial.frakcja,
      tier: u.oddzial.tier + 1,
    };
    return `${stara} ewoluuje!\n${u.ile} × ${u.na.name}`;
  }

  return '';
}

/**
 * Wejście na budowlę odwiedzaną. Cała czternastka idzie tędy: co budowla robi,
 * mówi jej wpis w `BUDOWLE`, a nie kolejna gałąź w `odwiedz`.
 */
function odwiedzBudowle(s: StanMapy, o: Obiekt, kto: Wlasciciel = 'gracz'): WynikWejscia {
  const b = budowlaPoId(o.budynek);
  if (!b) return { opis: o.nazwa };
  const bohater = bohaterOf(s, kto);
  const skarbiec = skarbiecOf(s, kto);

  // Czy już z niej korzystaliśmy. `odnowa` równa 0 znaczy „zawsze wolno"
  // (portal, ośrodek ewolucji), brak `odnowy` — „raz na zawsze".
  if (o.uzyteDnia !== undefined && b.odnowa !== 0) {
    if (b.odnowa === undefined) return { opis: `${b.nazwa}\nTu już byliśmy` };
    const zostalo = b.odnowa - (s.dzien - o.uzyteDnia);
    if (zostalo > 0)
      return { opis: `${b.nazwa}\nWróć za ${zostalo} ${zostalo === 1 ? 'dzień' : 'dni'}` };
  }

  const e = b.efekt;

  if (e.typ === 'staty') {
    o.uzyteDnia = s.dzien;
    bohater.atak += e.atak ?? 0;
    bohater.obrona += e.obrona ?? 0;
    const co = e.atak ? `+${e.atak} do ataku` : `+${e.obrona} do obrony`;
    return { opis: `${b.nazwa}\n${co}` };
  }

  if (e.typ === 'arena')
    return {
      opis: '',
      pytanie: {
        obiekt: o,
        tytul: b.nazwa,
        tresc: 'Czego chcesz się nauczyć?',
        opcje: [
          { klucz: 'atak', etykieta: `+${ARENA_BONUS} ataku` },
          { klucz: 'obrona', etykieta: `+${ARENA_BONUS} obrony` },
        ],
      },
    };

  if (e.typ === 'doswiadczenie') {
    o.uzyteDnia = s.dzien;
    // Tyle, ile brakuje do następnego poziomu — czyli awans od ręki, ale nie
    // za darmo na wysokim poziomie, gdzie brakować może dużo więcej.
    const p = postepPoziomu(bohater.doswiadczenie);
    const ile = Math.max(DRZEWO_WIEDZY_MIN, p.doAwansu - p.wPoziomie);
    bohater.doswiadczenie += ile;
    return { opis: `${b.nazwa}\n+${ile} doświadczenia` };
  }

  if (e.typ === 'odslona') {
    o.uzyteDnia = s.dzien;
    const nowe = odslon(s, OBSERWATORIUM_PROMIEN, { x: o.x, y: o.y }, kto);
    return { opis: `${b.nazwa}\nWidać stąd całą okolicę`, odkryto: nowe > 0 };
  }

  if (e.typ === 'stajnia') {
    o.uzyteDnia = s.dzien;
    // Dzień odwiedzin liczy się jako pierwszy z trzech — inaczej „przez trzy
    // dni" znaczyłoby cztery: dziś i trzy następne.
    bohater.bonusRuchuDo = s.dzien + STAJNIA_DNI - 1;
    bohater.ruch += STAJNIA_BONUS;
    return { opis: `${b.nazwa}\n+${STAJNIA_BONUS} ruchu przez ${STAJNIA_DNI} dni` };
  }

  if (e.typ === 'zrodlo') {
    o.uzyteDnia = s.dzien;
    bohater.ruch = ruchNaDzis(s, kto);
    return { opis: `${b.nazwa}\nSiły wróciły — pełen zapas ruchu` };
  }

  if (e.typ === 'portal') {
    const drugi = s.obiekty.find((i) => i.id === o.para);
    if (!drugi) return { opis: `${b.nazwa}\nNic się nie dzieje` };
    return { opis: `${b.nazwa}\nPrzeskok!`, przenies: { x: drugi.x, y: drugi.y } };
  }

  if (e.typ === 'gniazdo') {
    if (o.wlasciciel === kto) return { opis: `${b.nazwa} — już twoje` };
    o.wlasciciel = kto;
    return { opis: `${b.nazwa} jest twoje!\nOddziały czekają w zamku`, zajete: o };
  }

  if (e.typ === 'ewolucja') {
    const u = doUlepszenia(bohater);
    if (!u) return { opis: `${b.nazwa}\nNie ma czego ulepszać` };
    if (skarbiec.kamien < EWOLUCJA_KOSZT)
      return { opis: `${b.nazwa}\nPotrzeba ${EWOLUCJA_KOSZT} kamieni ewolucji` };
    return {
      opis: '',
      pytanie: {
        obiekt: o,
        tytul: b.nazwa,
        tresc: `${u.oddzial.nazwa} → ${u.na.name} (${u.ile})`,
        opcje: [
          { klucz: 'tak', etykieta: `Za ${EWOLUCJA_KOSZT} kamienie` },
          { klucz: 'nie', etykieta: 'Nie teraz' },
        ],
      },
    };
  }

  // Drobiazgi: wóz z artefaktem, ognisko z pokeballami, reszta z surowcem.
  o.uzyteDnia = s.dzien;
  if (o.artefakt) {
    o.zebrany = true;
    const a = artefaktPoId(o.artefakt);
    if (a) bohater.artefakty.push(a.id);
    return { opis: a ? `${b.nazwa}\nZnaleziono: ${a.nazwa}` : b.nazwa };
  }
  const co = o.surowiec ?? 'pokeball';
  const czesci: string[] = [];
  if (o.ile) {
    skarbiec[co] += o.ile;
    czesci.push(`+${o.ile} ${SUROWIEC_INFO[co].dopelniacz}`);
  }
  if (b.pokeballe) {
    skarbiec.pokeball += b.pokeballe;
    czesci.push(`+${b.pokeballe} pokeballi`);
  }
  if (b.znika) o.zebrany = true;
  return { opis: `${b.nazwa}\n${czesci.join(', ')}` };
}

/**
 * Wejście na pole z obiektem: zbiera, zajmuje albo zaczyna bitwę.
 *
 * `kto` domyślnie 'gracz' — to jedyny aktor, dopóki AI nie istniało, więc
 * żadne dotychczasowe wywołanie w scenie nie musiało się zmienić. AI wywołuje
 * tę samą funkcję z `kto: 'wrog'` — bez tego mielibyśmy dwie kopie tych
 * samych czternastu reguł, jedną dla gracza i jedną dla przeciwnika.
 */
export function odwiedz(s: StanMapy, o: Obiekt, kto: Wlasciciel = 'gracz'): WynikWejscia {
  if (o.rodzaj === 'budynek') return odwiedzBudowle(s, o, kto);

  if (o.rodzaj === 'potwor') return { opis: `${o.nazwa} zagradza drogę!`, bitwaZ: o };

  const bohater = bohaterOf(s, kto);
  const skarbiec = skarbiecOf(s, kto);

  if (o.rodzaj === 'jasnowidz') {
    const z = o.zadanie;
    if (!z) return { opis: 'Chata jest pusta.' };
    if (o.spelnione) {
      return { opis: 'Jasnowidz już ci pomógł.\nNie ma dla ciebie nic więcej.' };
    }
    const mamy = skarbiec[z.surowiec];
    if (mamy < z.ile) {
      // Pierwsza wizyta prawie zawsze kończy się tutaj i o to chodzi: chata
      // jasnowidza jest jedynym obiektem w grze, który każe WRÓCIĆ w to samo
      // miejsce po raz drugi. Mówimy więc wprost, czego brakuje i ile.
      return {
        opis:
          `Jasnowidz prosi o ${z.ile} ${SUROWIEC_INFO[z.surowiec].dopelniacz}.\n` +
          `Masz ${mamy}. Wróć, gdy uzbierasz resztę.`,
      };
    }
    skarbiec[z.surowiec] -= z.ile;
    o.spelnione = true;
    const a = artefaktPoId(o.nagroda?.artefakt ?? '');
    if (a) bohater.artefakty.push(a.id);
    const dosw = o.nagroda?.doswiadczenie ?? 0;
    if (dosw) bohater.doswiadczenie += dosw;
    return {
      opis:
        `Oddajesz ${z.ile} ${SUROWIEC_INFO[z.surowiec].dopelniacz}.\n` +
        (a ? `Jasnowidz daje w zamian: ${a.nazwa}` : `Jasnowidz dzieli się wiedzą: +${dosw} doświadczenia`),
    };
  }

  if (o.rodzaj === 'namiot') {
    o.zebrany = true;
    const k = o.klucz ?? 'zielony';
    const klucze = kluczeOf(s, kto);
    if (!klucze.includes(k)) klucze.push(k);
    return {
      opis: `Klucznik daje ci ${KLUCZE[k].nazwa}.\nOtwiera strażnice w tej barwie.`,
    };
  }

  if (o.rodzaj === 'straznica') {
    const k = o.klucz ?? 'zielony';
    if (!kluczeOf(s, kto).includes(k)) {
      // Bez bitwy, bez utraty dnia i bez wchodzenia na pole. Strażnica ma
      // odesłać gracza po klucz, a nie ukarać go za podejście.
      return { opis: `Wrota są zamknięte.\nPotrzebny jest ${KLUCZE[k].nazwa} — klucznik\nobozuje gdzieś na tej mapie.` };
    }
    o.zebrany = true;
    // Bryły przestają się zgadzać w chwili otwarcia bramy: policzone są raz
    // i zapamiętane, a przejście ma być przejezdne NATYCHMIAST.
    s.bryly = undefined;
    const nazwaKlucza = KLUCZE[k].nazwa;
    return { opis: `${nazwaKlucza[0].toUpperCase()}${nazwaKlucza.slice(1)} pasuje.\nWrota stanęły otworem.` };
  }

  if (o.rodzaj === 'surowiec') {
    const co = o.surowiec ?? 'pokeball';
    skarbiec[co] += o.ile ?? 0;
    o.zebrany = true;
    return { opis: `+${o.ile} ${SUROWIEC_INFO[co].dopelniacz}` };
  }

  if (o.rodzaj === 'artefakt') {
    o.zebrany = true;
    const a = artefaktPoId(o.artefakt ?? '');
    if (a) bohater.artefakty.push(a.id);
    return { opis: a ? `Znaleziono: ${a.nazwa}` : 'Pusto' };
  }

  if (o.rodzaj === 'skrzynia') {
    // Rzadka skrzynia z artefaktem rozstrzyga się od razu — nie ma tu czego
    // wybierać, a pytanie „artefakt czy artefakt" byłoby tylko kliknięciem.
    if (o.artefakt) {
      o.zebrany = true;
      const a = artefaktPoId(o.artefakt);
      if (a) bohater.artefakty.push(a.id);
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
    // Wchodzi się i na kopalnię niczyją, i na kopalnię przeciwnika — tak jak
    // w Heroes 3: przejęcie cudzej kopalni nie wymaga bitwy, samo wejście
    // przestawia właściciela.
    if (o.wlasciciel === kto) return { opis: `${o.nazwa} — już twoja` };
    o.wlasciciel = kto;
    const co = o.surowiec ?? 'pokeball';
    return {
      opis: `${o.nazwa} jest twoja!\n+${o.ile} ${SUROWIEC_INFO[co].dopelniacz} dziennie`,
      zajete: o,
    };
  }

  if (o.rodzaj === 'zamek') {
    // Zamku broni garnizon. Dopóki stoi, wejście zaczyna bitwę — dokładnie tak
    // jak w Heroes 3 i tak jak przy każdym innym strażniku na mapie.
    //
    // Wcześniej stało tu „jeszcze nie do zdobycia": gra nie miała żadnego
    // zakończenia. Dziecko dochodziło przez pół planszy do celu i dostawało
    // komunikat, że celu nie ma.
    if (o.wlasciciel !== kto) {
      if (o.oddzialy?.length) return { opis: `${o.nazwa}\nBroni się!`, bitwaZ: o };
      o.wlasciciel = kto;
      return { opis: `${o.nazwa} jest twoja!`, zamek: o, zajete: o };
    }
    return { opis: o.nazwa, zamek: o };
  }

  return { opis: o.nazwa };
}

/**
 * Ile surowców wpłynie jutro z zajętych budynków — z kopalń NA mapie
 * i z tego, co postawione w naszych zamkach. Ratusz jest tu razem z kopalnią
 * celowo: dla gracza to jedna liczba („ile mi jutro przybędzie"), a nie dwa
 * osobne rachunki, których trzeba się domyślać. Panel czyta wyłącznie tę
 * funkcję, więc rozdzielenie ich oznaczałoby pokazywanie nieprawdy.
 */
export function dochod(s: StanMapy, kto: Wlasciciel = 'gracz'): Partial<Record<Surowiec, number>> {
  const suma: Partial<Record<Surowiec, number>> = {};
  for (const o of s.obiekty) {
    if (o.rodzaj === 'kopalnia' && o.wlasciciel === kto && o.surowiec) {
      suma[o.surowiec] = (suma[o.surowiec] ?? 0) + (o.ile ?? 1);
    }
    if (o.rodzaj === 'zamek' && o.wlasciciel === kto) {
      const dary = daryZamku(o.postawione ?? [], o.frakcjaZamku ?? 'bor');
      for (const [co, ile] of Object.entries(dary)) {
        suma[co as Surowiec] = (suma[co as Surowiec] ?? 0) + ile;
      }
    }
  }
  // Gospodarność wchodzi TUTAJ, a nie w `nowaTura`, bo pasek na mapie czyta
  // dochód z tej funkcji. Doliczona osobno przy naliczaniu dawałaby co dzień
  // więcej pokeballi, niż pasek obiecuje — a to wygląda jak błąd rachunku.
  const gospodarnosc = efekt(bohaterOf(s, kto), 'dochod');
  if (gospodarnosc > 0) suma.pokeball = (suma.pokeball ?? 0) + gospodarnosc;
  return suma;
}

/**
 * Straże rosną co tydzień. Patrz `PRZYROST_STRAZY` w `zasady-h3.ts`.
 *
 * Rośnie KAŻDY stos osobno, żeby stado trzystosowe nie przyrastało trzy razy
 * wolniej od jednostosowego, a sufit liczy się z sumy — czyli z tego, co gracz
 * naprawdę widzi w oknie bitwy.
 */
export function urosnijStraze(s: StanMapy): number {
  let urosly = 0;
  for (const o of s.obiekty) {
    if (o.rodzaj !== 'potwor' || o.zebrany || !o.oddzialy?.length) continue;
    const razem = o.oddzialy.reduce((a, od) => a + od.ile, 0);
    if (o.wyjsciowe === undefined) o.wyjsciowe = razem;
    const sufit = Math.round(o.wyjsciowe * PRZYROST_STRAZY_SUFIT);
    if (razem >= sufit) continue;
    let zostalo = sufit - razem;
    for (const od of o.oddzialy) {
      if (zostalo <= 0) break;
      const ile = Math.min(zostalo, Math.max(1, Math.round(od.ile * PRZYROST_STRAZY)));
      od.ile += ile;
      zostalo -= ile;
    }
    urosly++;
  }
  return urosly;
}

/**
 * Nowa tura: odnawia ruch OBU bohaterów, dolicza dochód i przyrost OBU stron.
 *
 * Jedna funkcja na dwie strony, a nie `nowaTura` + `wrogTura`: dzień jest
 * jeden na całą mapę, a rachunek dochodu/przyrostu to te same wzory z
 * `zamki.ts`, tylko czytane z innym `wlasciciel`. Druga kopia tej pętli
 * rozjechałaby się z pierwszą przy pierwszej poprawce balansu.
 */
export function nowaTura(s: StanMapy): Partial<Record<Surowiec, number>> {
  s.dzien++;
  // Nowy tydzień: stada na mapie się powiększają. Dzień 8, 15, 22...
  // Straże są NICZYJE, więc rosną raz na dzień, a nie raz na stronę —
  // dlatego stoi to przed pętlą po graczu i wrogu, a nie w niej.
  if (s.dzien > 1 && s.dzien % 7 === 1) urosnijStraze(s);
  s.bohater.ruch = ruchNaDzis(s, 'gracz');
  s.wrogBohater.ruch = ruchNaDzis(s, 'wrog');
  let wplywGracza: Partial<Record<Surowiec, number>> = {};
  for (const kto of ['gracz', 'wrog'] as const) {
    const wplyw = dochod(s, kto);
    const skarbiec = skarbiecOf(s, kto);
    for (const [co, ile] of Object.entries(wplyw)) {
      skarbiec[co as Surowiec] += ile;
    }
    if (kto === 'gracz') wplywGracza = wplyw;

    // Przyrost w zamkach. Bez niego rekrutacja byłaby jednorazowa i cała
    // gospodarka kończyłaby się w pierwszym dniu.
    //
    // Przyrasta tylko to, co POSTAWIONE: siedlisko, którego nie ma, nie hoduje
    // niczego, a fort podnosi przyrost we wszystkich naraz. Dopóki liczyło się
    // to z samej tablicy `PRZYROST_ODDZIALU`, rozbudowa miasta nie zmieniała
    // nic w armii i drzewko budynków było dekoracją.
    for (const o of s.obiekty) {
      if (o.rodzaj === 'zamek' && o.wlasciciel === kto && o.dostepne) {
        const przyrost = przyrostZamku(o.postawione ?? [], PRZYROST_ODDZIALU);
        o.dostepne = o.dostepne.map((ile, t) => Math.min(ile + przyrost[t], 99));
      }
    }
    // Zajęte gniazda hodują do zamku TEJ SAMEJ strony, bo rekrutuje się w mieście.
    //
    // W Heroes 3 werbuje się wprost w siedlisku na mapie, ale to znaczyłoby
    // trzeci ekran werbunku (mapa, miasto, gniazdo) na tę samą czynność.
    // Gniazdo daje więc to samo, co siedlisko tego poziomu w mieście — tyle że
    // trzeba po nie pojechać i utrzymać je po swojej stronie mapy.
    const zamekTejStrony = s.obiekty.find((o) => o.rodzaj === 'zamek' && o.wlasciciel === kto);
    if (zamekTejStrony?.dostepne) {
      for (const o of s.obiekty) {
        if (o.rodzaj !== 'budynek' || o.wlasciciel !== kto) continue;
        if (budowlaPoId(o.budynek)?.efekt.typ !== 'gniazdo') continue;
        const t = GNIAZDO_TIER;
        zamekTejStrony.dostepne[t] = Math.min(
          zamekTejStrony.dostepne[t] + PRZYROST_ODDZIALU[t],
          99
        );
      }
    }
  }
  return wplywGracza;
}

export interface WynikBudowy {
  ok: boolean;
  opis: string;
}

/**
 * Postawienie budynku w zamku. Cała decyzja siedzi tutaj, a nie w scenie,
 * bo to są zasady gry: jeden budynek dziennie, tylko po spełnieniu warunków
 * i tylko za pełną cenę.
 *
 * Odmowa zawsze mówi DLACZEGO. Zablokowany przycisk bez powodu jest dla
 * dziecka ślepym zaułkiem — nie wie, czy ma szukać surowca, czy postawić
 * najpierw co innego, czy po prostu poczekać do jutra.
 */
export function zbuduj(s: StanMapy, zamek: Obiekt, id: string, kto: Wlasciciel = 'gracz'): WynikBudowy {
  const frakcja = zamek.frakcjaZamku ?? 'bor';
  const b = budynek(frakcja, id);
  if (!b) return { ok: false, opis: 'Nie ma tu czego budować.' };
  const skarbiec = skarbiecOf(s, kto);

  const postawione = (zamek.postawione ??= []);
  if (postawione.includes(id)) return { ok: false, opis: `${b.nazwa} już stoi.` };
  if (!moznaBudowac(b, postawione)) {
    const brak = b.wymaga
      .filter((w) => !postawione.includes(w))
      .map((w) => budynek(frakcja, w)?.nazwa ?? w);
    return { ok: false, opis: `Najpierw: ${brak.join(', ')}.` };
  }
  if (zamek.budowanoDnia === s.dzien) {
    return { ok: false, opis: 'Dziś już tu budowano. Jeden budynek dziennie.' };
  }
  if (!stacNas(skarbiec, b.koszt)) {
    const brak = brakuje(skarbiec, b.koszt)
      .map((x) => `${x.ile} ${SUROWIEC_INFO[x.surowiec].dopelniacz}`)
      .join(', ');
    return { ok: false, opis: `Brakuje: ${brak}.` };
  }

  zaplac(skarbiec, b.koszt);
  postawione.push(id);
  zamek.budowanoDnia = s.dzien;

  // Nowe siedlisko od razu ma kogo dać. W Heroes 3 wybudowane siedlisko
  // dostaje tygodniowy przyrost natychmiast — bez tego dziecko stawia budynek
  // i nic się nie zmienia, więc nie widzi związku między budową a armią.
  if (b.rodzaj === 'siedlisko' && b.poziom !== undefined && zamek.dostepne) {
    const przyrost = przyrostZamku(postawione, PRZYROST_ODDZIALU);
    zamek.dostepne[b.poziom] += przyrost[b.poziom];
  }
  return { ok: true, opis: `${b.nazwa} — gotowe!` };
}

/** Data w formacie z Heroes 3: tydzień i dzień tygodnia. */
export function data(dzien: number) {
  return { tydzien: Math.floor((dzien - 1) / 7) + 1, dzienTygodnia: ((dzien - 1) % 7) + 1 };
}
