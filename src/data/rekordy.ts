/**
 * Tabela rekordów — „High Scores" z Heroes 2. Jedna lista na przeglądarkę,
 * najlepsze wyniki na górze. Pisze do niej ekran końca kampanii, czyta ekran
 * rekordów w menu.
 */

export interface Rekord {
  imie: string;
  punkty: number;
  /** Ile dni gry trwało całe przejście. */
  dni: number;
  /** Data wpisu w zapisie ISO — do pokazania, nie do liczenia. */
  data: string;
}

const KLUCZ = 'heroes-rekordy-v1';
/** Tyle wierszy mieści tabela w Heroes 2 i tyle mieści nasza. */
const MIEJSC = 10;

export function wczytajRekordy(): Rekord[] {
  try {
    const s = localStorage.getItem(KLUCZ);
    const lista = s ? (JSON.parse(s) as Rekord[]) : [];
    return Array.isArray(lista) ? lista : [];
  } catch {
    return [];
  }
}

/** Dopisuje wynik, sortuje od najlepszego i ucina do dziesięciu miejsc. */
export function dodajRekord(r: Rekord): void {
  const lista = [...wczytajRekordy(), r]
    .sort((a, b) => b.punkty - a.punkty || a.dni - b.dni)
    .slice(0, MIEJSC);
  try {
    localStorage.setItem(KLUCZ, JSON.stringify(lista));
  } catch {
    // Prywatna karta — rekord zostaje tylko na ekranie.
  }
}
