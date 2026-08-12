/**
 * Geometria mapy przygody — same liczby, bez Phasera.
 *
 * Wydzielone z `AdventureScene`, żeby dało się sprawdzić bez przeglądarki,
 * czy mapa, panel i pasek surowców mieszczą się w oknie gry. Wcześniej te
 * stałe siedziały w scenie i test musiał importować Phasera, co pod Node
 * kończyło się „window is not defined".
 */

/**
 * Okno jest wspólne z bitwą. `OKNO_H` powiela `SCENE_H` z `BattleScene`,
 * bo tamten plik ciągnie za sobą Phasera; `main.ts` sprawdza w locie, że obie
 * liczby są równe, więc rozjazd nie przejdzie niezauważony.
 */
export const OKNO_W = 960;
export const OKNO_H = 694;

/** Bok kafelka. Grafika ma 16 px, więc trzykrotność daje ostre piksele. */
export const KAFEL = 48;

export const PANEL_W = 250;
export const PASEK_H = 34;
export const MARGINES = 8;
/** Pas na tytuł nad mapą. */
export const GORA = 44;

/**
 * Rozmiar pierwszej planszy. 14 × 12 to nie jest liczba z powietrza: przy
 * kafelku 48 px (jedyna skala bez rozmycia) to największa plansza, która
 * mieści się obok panelu w oknie 960 × 694.
 */
export const KOL = 14;
export const WIE = 12;

export const MAPA_W = MARGINES + KOL * KAFEL + 14 + PANEL_W + 8;
export const MAPA_H = GORA + WIE * KAFEL + 8 + PASEK_H + 14;
