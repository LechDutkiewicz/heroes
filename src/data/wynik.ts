import { SUROWIEC_INFO, artefaktPoId, type StanMapy } from './mapa';
import {
  KAMPANIA,
  type Misja,
  type PostepKampanii,
  type Rozstrzygniecie,
  type WarunekPorazki,
  type WarunekZwyciestwa,
  misjaPoId,
  ocenMisje,
} from './kampania';

/**
 * Rozstrzygnięcie gry i to, jak je opowiedzieć — wspólne dla mapy przygody
 * (okno „Warunki misji", sprawdzanie końca) i ekranu wyniku.
 *
 * Kampania ma swoje warunki w `kampania.ts`. Gra pojedyncza nie ma misji,
 * ale też musi się kończyć — i kończy się tak jak dawniej, zanim była
 * kampania: wygrywa, kto ma wszystkie zamki, przegrywa, kto stracił ostatni.
 * Zamiast drugiej kopii tej logiki gra pojedyncza dostaje po prostu te dwa
 * warunki i idzie przez tę samą `ocenMisje`.
 */

export interface Warunki {
  zwyciestwo: WarunekZwyciestwa;
  porazka: WarunekPorazki[];
}

const WARUNKI_POJEDYNCZEJ: Warunki = { zwyciestwo: { typ: 'zamki' }, porazka: [{ typ: 'utrata' }] };

export const warunkiGry = (s: StanMapy): Warunki => misjaPoId(s.misja) ?? WARUNKI_POJEDYNCZEJ;

/** Czy gra (misja albo gra pojedyncza) już się rozstrzygnęła. */
export function ocenGre(s: StanMapy): Rozstrzygniecie {
  // `ocenMisje` czyta z misji wyłącznie oba warunki — reszta pól jej nie obchodzi.
  return ocenMisje(s, warunkiGry(s) as Misja);
}

/** Który warunek porażki zadziałał. Pierwszy spełniony, w kolejności z misji. */
export function przyczynaPorazki(s: StanMapy): WarunekPorazki {
  const w = warunkiGry(s).porazka;
  for (const p of w) {
    if (p.typ === 'utrata' && !s.obiekty.some((o) => o.rodzaj === 'zamek' && o.wlasciciel === 'gracz')) return p;
    if (p.typ === 'termin' && s.dzien > p.dni) return p;
  }
  return w[0] ?? { typ: 'utrata' };
}

// ————————————————————————————————————————————— słowami, dla dziecka

/**
 * Cel słowami. `opisZwyciestwa` z kampanii pokazuje identyfikator artefaktu
 * („ksiezycowy-kamien"); tu idzie jego nazwa, a surowiec — po polsku.
 */
export function celSlowami(w: WarunekZwyciestwa): string {
  if (w.typ === 'zamki') return 'Zdobądź wszystkie zamki przeciwnika.';
  if (w.typ === 'artefakt') return `Odnajdź ${artefaktPoId(w.artefakt)?.nazwa ?? nazwaZId(w.artefakt)}.`;
  if (w.typ === 'zbierz') return `Zbierz ${w.ile} ${SUROWIEC_INFO[w.surowiec].dopelniacz}.`;
  return `Pokonaj: ${w.nazwa}.`;
}

export function porazkaSlowami(w: WarunekPorazki): string {
  return w.typ === 'utrata'
    ? 'Nie oddaj wszystkich swoich zamków.'
    : `Zdąż w ${w.dni} dni (${Math.floor(w.dni / 7)} tygodni).`;
}

/**
 * Artefakt-cel, którego jeszcze nie ma w `ARTEFAKTY` (dopisuje go plansza
 * misji). Polskich znaków z identyfikatora się nie odzyska, ale „Ksiezycowy
 * kamien" czyta się lepiej niż „ksiezycowy-kamien".
 */
const nazwaZId = (id: string) => {
  const t = id.replace(/-/g, ' ');
  return t.charAt(0).toUpperCase() + t.slice(1);
};

/** Co poszło nie tak — jedno zdanie, bez obwiniania. */
export function coSieStalo(p: WarunekPorazki): string {
  return p.typ === 'utrata'
    ? 'Srebrne płaszcze zajęły twój ostatni zamek.'
    : `Minęło ${p.dni} dni, a cel misji wciąż czeka.`;
}

/**
 * Rada na następną próbę. Heroes 2 po porażce nie mówi nic; ośmiolatek,
 * któremu nikt nie powie, CO zrobić inaczej, spróbuje dokładnie tak samo.
 */
export function rada(p: WarunekPorazki): string {
  return p.typ === 'utrata'
    ? 'Zostaw w zamku kilka stworków na straży i buduj siedliska od pierwszego dnia. Co tydzień werbuj nowe stworki.'
    : 'Nie zbieraj wszystkiego po drodze — idź prosto do celu, a surowce bierz te, które leżą blisko.';
}

// ————————————————————————————————————————————— punkty i tytuł

/** Suma punktów i dni z wszystkich ukończonych misji. */
export function sumaKampanii(p: PostepKampanii): { punkty: number; dni: number } {
  let punkty = 0;
  let dni = 0;
  for (const m of KAMPANIA.misje) {
    const w = p.wyniki[m.id];
    if (!w) continue;
    punkty += w.punkty;
    dni += w.dni;
  }
  return { punkty, dni };
}

/**
 * Tytuł za wynik — w Heroes 2 tabela rekordów mówi „twój wynik to Smok"
 * i pokazuje stworzenie. U nas stworek z Boru: im wyżej, tym wyższy poziom.
 * Progi liczone od maksimum 1000 punktów na misję.
 */
const TYTULY: Array<{ od: number; tytul: string; sprite: string }> = [
  { od: 0.9, tytul: 'Legenda Boru', sprite: '00227' },
  { od: 0.78, tytul: 'Mistrz Stworków', sprite: '00096' },
  { od: 0.64, tytul: 'Strażnik Doliny', sprite: '00030' },
  { od: 0.5, tytul: 'Dzielny Tropiciel', sprite: '00218' },
  { od: 0.3, tytul: 'Młody Trener', sprite: '00020' },
  { od: 0, tytul: 'Uczeń Trenera', sprite: '00193' },
];

export function tytulZaWynik(punkty: number, misji = KAMPANIA.misje.length) {
  const udzial = punkty / (1000 * Math.max(1, misji));
  return TYTULY.find((t) => udzial >= t.od) ?? TYTULY[TYTULY.length - 1];
}

export const SPRITE_TYTULOW = TYTULY.map((t) => t.sprite);
