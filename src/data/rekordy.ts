/**
 * Tabela rekordów — jak „High Scores" w menu Heroes 2.
 *
 * Wpis powstaje raz, na końcu CAŁEJ kampanii (woła to ekran wyniku), a nie
 * po każdej misji: rekord ma mówić, jak dobrze poszła cała przygoda. Wyniki
 * pojedynczych misji i tak leżą w `PostepKampanii.wyniki` i menu pokazuje je
 * osobno, obok tabeli.
 *
 * Tabela jest krótka i posortowana przy zapisie, nie przy odczycie — czyta
 * ją tylko menu, a zapis dzieje się raz na kilka godzin gry, więc to on może
 * zapłacić za porządek.
 */

export interface Rekord {
  /** Imię trenera, tak jak w `PostepKampanii.trener`. */
  imie: string;
  /** Suma punktów z misji kampanii — patrz `punkty()` w kampania.ts. */
  punkty: number;
  /** Suma dni we wszystkich misjach. */
  dni: number;
  /** Data zapisu, ISO (`2026-09-24`). Napis, żeby JSON nie musiał znać Date. */
  data: string;
}

const KLUCZ_REKORDOW = 'heroes-rekordy-v1';

/** Tyle wpisów mieści się w oknie rekordów bez przewijania. */
export const ILE_REKORDOW = 8;

/** Rekordy od najlepszego. Pusta tablica, gdy nic nie zapisano albo zapis jest zepsuty. */
export function wczytajRekordy(): Rekord[] {
  try {
    const s = localStorage.getItem(KLUCZ_REKORDOW);
    if (!s) return [];
    const surowe = JSON.parse(s) as unknown;
    if (!Array.isArray(surowe)) return [];
    // Odsiew zamiast zaufania: ten klucz zapisuje inna scena, a jeden
    // zepsuty wpis nie może wywrócić całego menu.
    return surowe
      .filter(
        (r): r is Rekord =>
          !!r &&
          typeof r.imie === 'string' &&
          typeof r.punkty === 'number' &&
          typeof r.dni === 'number' &&
          typeof r.data === 'string'
      )
      .sort(porzadek)
      .slice(0, ILE_REKORDOW);
  } catch {
    return [];
  }
}

/**
 * Dopisuje rekord i zwraca jego miejsce w tabeli (od 1) albo `null`, gdy
 * wynik się nie zmieścił. Ekran wyniku może dzięki temu powiedzieć „jesteś
 * trzeci!", nie licząc tego drugi raz.
 */
export function dodajRekord(r: Omit<Rekord, 'data'> & { data?: string }): number | null {
  const wpis: Rekord = {
    imie: r.imie.trim() || 'Trener',
    punkty: Math.max(0, Math.round(r.punkty)),
    dni: Math.max(0, Math.round(r.dni)),
    data: r.data ?? new Date().toISOString().slice(0, 10),
  };
  const tabela = [...wczytajRekordy(), wpis].sort(porzadek).slice(0, ILE_REKORDOW);
  const miejsce = tabela.indexOf(wpis);
  try {
    localStorage.setItem(KLUCZ_REKORDOW, JSON.stringify(tabela));
  } catch {
    // Prywatna karta albo pełny limit — rekord przepada, gra działa dalej.
    return null;
  }
  return miejsce === -1 ? null : miejsce + 1;
}

/** Więcej punktów wyżej; przy remisie wyżej ten, kto zrobił to w mniej dni. */
function porzadek(a: Rekord, b: Rekord) {
  return b.punkty - a.punkty || a.dni - b.dni;
}
