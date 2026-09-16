import type { StanMapy } from './mapa';

/**
 * Zapis stanu gry w przeglądarce — jeden slot, żeby dało się rozegrać
 * planszę w kilku krótkich sesjach, zamiast kończyć ją za jednym posiedzeniem.
 *
 * `bryly` to pamięć podręczna (Set), której JSON nie zna i której zapis
 * i tak nie potrzebuje: `brylyNa` w mapa.ts liczy ją od nowa, kiedy jej nie
 * ma. Zapisujemy więc stan bez niej, żeby `JSON.stringify` nie dostał
 * czegoś, czego nie umie zamienić z powrotem w Set.
 */
const KLUCZ_ZAPISU = 'heroes-zapis-mapy-v1';

export function jestZapis(): boolean {
  try {
    return localStorage.getItem(KLUCZ_ZAPISU) !== null;
  } catch {
    return false;
  }
}

export function zapiszGre(stan: StanMapy): boolean {
  try {
    const doZapisu: StanMapy = { ...stan, bryly: undefined };
    localStorage.setItem(KLUCZ_ZAPISU, JSON.stringify(doZapisu));
    return true;
  } catch {
    // Prywatna karta, pełny limit przeglądarki albo localStorage wyłączony —
    // gra ma dalej działać, tylko bez zapisu.
    return false;
  }
}

export function wczytajGre(): StanMapy | null {
  try {
    const surowy = localStorage.getItem(KLUCZ_ZAPISU);
    if (!surowy) return null;
    return JSON.parse(surowy) as StanMapy;
  } catch {
    return null;
  }
}

export function usunZapis(): void {
  try {
    localStorage.removeItem(KLUCZ_ZAPISU);
  } catch {
    // nic do zrobienia — nie było czego kasować
  }
}
