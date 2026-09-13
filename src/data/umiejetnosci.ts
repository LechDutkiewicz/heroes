/**
 * Drugorzędne umiejętności bohatera.
 *
 * W Heroes 3 to one, a nie statystyki, decydują o tym, czym jest dany bohater:
 * dwóch rycerzy z tym samym atakiem gra się zupełnie inaczej, jeśli jeden ma
 * Logistykę, a drugi Łucznictwo. Dlatego awans NIE jest tu automatycznym
 * przyrostem liczby — jest WYBOREM między dwiema drogami, i to ten wybór ma
 * być tym, co gracz zapamięta z wygranej bitwy.
 *
 * Cztery zasady, które ustaliły kształt tej listy:
 *
 * 1. **Każda umiejętność musi coś realnie robić.** Ósemka niżej jest dobrana
 *    pod to, co gra już ma: punkty ruchu, mgłę, obrażenia wręcz, obrażenia
 *    strzałami, obronę, dochód, doświadczenie i straty po bitwie. Umiejętność
 *    opisująca mechanikę, której nie ma, byłaby kłamstwem w oknie awansu.
 *
 * 2. **Cztery gniazda, osiem umiejętności.** Tak jak w Heroes 3, gdzie miejsc
 *    jest mniej niż umiejętności: po zapełnieniu gniazd awans może już tylko
 *    ULEPSZAĆ to, co się ma. Bez tego limitu wybór po piątym awansie przestaje
 *    cokolwiek znaczyć, bo i tak zbierze się wszystko.
 *
 * 3. **Trzy poziomy, nazwane.** Podstawowa / zaawansowana / mistrzowska —
 *    nazwy z Heroes 3, bo niosą informację „można to jeszcze podbić".
 *
 * 4. **Efekt liczy się z jednego miejsca.** Każdy efekt wychodzi przez
 *    `efekt(bohater, klucz)`, a nie przez gałąź w kodzie, który akurat go
 *    potrzebuje. Dzięki temu dodanie dziewiątej umiejętności to wpis w tablicy,
 *    a nie polowanie po scenach.
 */

import type { Bohater } from './mapa';

export const MAKS_UMIEJETNOSCI = 4;

/** Klucze efektów — to, o co pytają sceny i zasady gry. */
export type KluczEfektu =
  | 'ruch' // mnożnik punktów ruchu na dzień
  | 'mgla' // dodatek do promienia widzenia, w polach
  | 'wrecz' // mnożnik obrażeń oddziałów walczących wręcz
  | 'strzal' // mnożnik obrażeń strzelców
  | 'pancerz' // mnożnik obrażeń OTRZYMYWANYCH (mniejszy = lepiej)
  | 'dochod' // dodatek do dziennego dochodu w pokeballach
  | 'nauka' // mnożnik zdobywanego doświadczenia
  | 'leczenie'; // odsetek strat wracających po wygranej bitwie

export interface Umiejetnosc {
  id: string;
  nazwa: string;
  /** Jedno zdanie: co to robi. Pokazywane w oknie awansu i na ekranie bohatera. */
  opis: string;
  klucz: KluczEfektu;
  /**
   * Wartość efektu na każdym z trzech poziomów. Dla mnożników trzymamy
   * DODATEK (0,1 = +10%), a nie gotowy mnożnik — inaczej „brak umiejętności"
   * musiałby być zapisany jako 1 i każde sumowanie zaczynałoby się od wyjątku.
   */
  wartosci: [number, number, number];
  /** Jak opisać wartość poziomu — czysta prezentacja, bez wpływu na zasady. */
  jednostka: 'procent' | 'pola' | 'pokeballe';
}

export const POZIOMY = ['podstawowa', 'zaawansowana', 'mistrzowska'] as const;
export type PoziomUmiejetnosci = 1 | 2 | 3;

export const UMIEJETNOSCI: Umiejetnosc[] = [
  {
    id: 'zwiad',
    nazwa: 'Zwiad',
    opis: 'Bohater przechodzi dziennie więcej pól.',
    klucz: 'ruch',
    wartosci: [0.1, 0.2, 0.3],
    jednostka: 'procent',
  },
  {
    id: 'tropiciel',
    nazwa: 'Tropiciel',
    opis: 'Odsłania mgłę dalej wokół siebie.',
    klucz: 'mgla',
    wartosci: [1, 2, 3],
    jednostka: 'pola',
  },
  {
    id: 'napastnik',
    nazwa: 'Napastnik',
    opis: 'Twoje oddziały mocniej biją wręcz.',
    klucz: 'wrecz',
    wartosci: [0.1, 0.2, 0.3],
    jednostka: 'procent',
  },
  {
    id: 'lucznictwo',
    nazwa: 'Łucznictwo',
    opis: 'Twoi strzelcy zadają większe obrażenia.',
    klucz: 'strzal',
    wartosci: [0.12, 0.25, 0.4],
    jednostka: 'procent',
  },
  {
    id: 'pancerz',
    nazwa: 'Pancerz',
    opis: 'Twoje oddziały dostają mniej obrażeń.',
    klucz: 'pancerz',
    wartosci: [0.08, 0.15, 0.22],
    jednostka: 'procent',
  },
  {
    id: 'gospodarnosc',
    nazwa: 'Gospodarność',
    opis: 'Codziennie znajdujesz dodatkowe pokeballe.',
    klucz: 'dochod',
    wartosci: [2, 4, 7],
    jednostka: 'pokeballe',
  },
  {
    id: 'nauka',
    nazwa: 'Nauka',
    opis: 'Zdobywasz więcej doświadczenia.',
    klucz: 'nauka',
    wartosci: [0.08, 0.16, 0.25],
    jednostka: 'procent',
  },
  {
    id: 'uzdrowiciel',
    nazwa: 'Uzdrowiciel',
    opis: 'Po wygranej bitwie część poległych wraca do armii.',
    klucz: 'leczenie',
    wartosci: [0.1, 0.2, 0.33],
    jednostka: 'procent',
  },
];

export const umiejetnoscPoId = (id: string) => UMIEJETNOSCI.find((u) => u.id === id);

/** Poziom umiejętności u bohatera; 0 znaczy „nie ma jej". */
export function poziomUmiejetnosci(b: Bohater, id: string): 0 | PoziomUmiejetnosci {
  return (b.umiejetnosci?.[id] ?? 0) as 0 | PoziomUmiejetnosci;
}

/** Umiejętności bohatera w kolejności zdobycia — tyle, ile gniazd. */
export function posiadane(b: Bohater): Array<{ u: Umiejetnosc; poziom: PoziomUmiejetnosci }> {
  const wpisy = Object.entries(b.umiejetnosci ?? {});
  return wpisy
    .map(([id, p]) => ({ u: umiejetnoscPoId(id)!, poziom: p as PoziomUmiejetnosci }))
    .filter((w) => !!w.u);
}

/**
 * Wartość efektu dla bohatera. Jedno wejście dla wszystkich zasad gry.
 *
 * Zwraca DODATEK, nie mnożnik: zero znaczy „nic nie zmienia", więc wołający
 * nie musi wiedzieć, czy bohater ma daną umiejętność.
 */
export function efekt(b: Bohater, klucz: KluczEfektu): number {
  let suma = 0;
  for (const { u, poziom } of posiadane(b)) {
    if (u.klucz !== klucz) continue;
    suma += u.wartosci[poziom - 1];
  }
  return suma;
}

/** Opis wartości poziomu — „+20%", „+2 pola", „+4 pokeballe dziennie". */
export function opisWartosci(u: Umiejetnosc, poziom: PoziomUmiejetnosci): string {
  const w = u.wartosci[poziom - 1];
  if (u.jednostka === 'procent') return `${u.klucz === 'pancerz' ? '−' : '+'}${Math.round(w * 100)}%`;
  if (u.jednostka === 'pola') return `+${w} ${w === 1 ? 'pole' : 'pola'}`;
  return `+${w} dziennie`;
}

export interface Oferta {
  id: string;
  /** Poziom, KTÓRY GRACZ DOSTANIE po wybraniu tej karty. */
  poziom: PoziomUmiejetnosci;
  nowa: boolean;
}

/**
 * Co zaproponować przy awansie: zawsze dwie karty, jak w Heroes 3.
 *
 * Zasada doboru jest prosta i widoczna gołym okiem, bo dziecko ma zrozumieć,
 * skąd się wzięły te dwie, a nie zgadywać: jedna karta to NOWA umiejętność
 * (jeśli jest jeszcze wolne gniazdo), druga to ULEPSZENIE czegoś, co już masz.
 * Gdy brakuje którejś ze stron — bo gniazda pełne albo wszystko na maksie —
 * obie karty są z tej, która została.
 *
 * Zwraca pustą listę, gdy nie ma czego dać: cztery gniazda, wszystko
 * mistrzowskie. Wołający pokazuje wtedy sam przyrost statystyk.
 */
export function ofertaAwansu(b: Bohater, losuj: (n: number) => number): Oferta[] {
  const mam = posiadane(b);
  const doUlepszenia: Oferta[] = mam
    .filter((w) => w.poziom < 3)
    .map((w) => ({ id: w.u.id, poziom: (w.poziom + 1) as PoziomUmiejetnosci, nowa: false }));
  const nowe: Oferta[] =
    mam.length < MAKS_UMIEJETNOSCI
      ? UMIEJETNOSCI.filter((u) => poziomUmiejetnosci(b, u.id) === 0).map((u) => ({
          id: u.id,
          poziom: 1 as PoziomUmiejetnosci,
          nowa: true,
        }))
      : [];

  const wez = (pula: Oferta[]) => (pula.length ? pula.splice(losuj(pula.length), 1)[0] : undefined);
  const wynik: Oferta[] = [];
  const a = wez(nowe) ?? wez(doUlepszenia);
  if (a) wynik.push(a);
  const bb = wez(doUlepszenia) ?? wez(nowe);
  if (bb) wynik.push(bb);
  return wynik;
}

/** Przyznaje wybraną kartę. Zwraca zdanie do pokazania graczowi. */
export function przyznaj(b: Bohater, oferta: Oferta): string {
  if (!b.umiejetnosci) b.umiejetnosci = {};
  b.umiejetnosci[oferta.id] = oferta.poziom;
  const u = umiejetnoscPoId(oferta.id)!;
  return `${u.nazwa} ${POZIOMY[oferta.poziom - 1]} — ${opisWartosci(u, oferta.poziom)}`;
}
