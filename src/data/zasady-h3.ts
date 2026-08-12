/**
 * Liczby z Heroes of Might and Magic III — odwzorowane, a nie wymyślone.
 *
 * Po co osobny plik
 * -----------------
 * Mechaniki mapy przygody mają w Heroes 3 konkretne wartości i to one dają
 * grze rytm: skrzynia daje 1000, 1500 albo 2000 sztuk złota, tartak dwie
 * jednostki drewna dziennie, skos kosztuje 141 zamiast 100. Wpisane „na oko"
 * wyglądają podobnie, a grają zupełnie inaczej — dlatego siedzą w jednym
 * miejscu, z podaniem, skąd pochodzą.
 *
 * Co jest potwierdzone, a co nasze
 * --------------------------------
 * Każda stała ma dopisek. `[H3]` znaczy: wartość z dokumentacji Heroes 3.
 * `[NASZE]` znaczy: Heroes 3 tego nie ma albo nie udało się potwierdzić liczby,
 * więc jest dobrana przez nas — i wtedy komentarz mówi, po co akurat taka.
 * Bez tego rozdziału po miesiącu nie da się już odróżnić odwzorowania od
 * zgadywanki, a to właśnie ta różnica decyduje, czy wolno coś stroić.
 *
 * Źródła (wiki są zablokowane przez proxy tego środowiska, więc liczby
 * pochodzą z wyników wyszukiwania cytujących te strony):
 *   - heroes.thelazy.net/index.php/Treasure_chest
 *   - heroes.thelazy.net/index.php/Resource
 *   - heroes.thelazy.net/index.php/Movement
 *   - heroes.thelazy.net/index.php/Mine
 */

// ---------------------------------------------------------------------------
// RUCH
// ---------------------------------------------------------------------------

/**
 * [H3] Koszt wejścia na sąsiednie pole: 100 w pionie i poziomie, 141 na skos.
 *
 * 141 to nie ozdobnik — bez niego skos byłby o 41% tańszy niż jazda bokiem
 * i każda trasa zamieniałaby się w schodki.
 */
export const KOSZT_PROSTO = 100;
export const KOSZT_SKOS = 141;

/**
 * [H3] Kary terenowe: bagno 175%, śnieg i piasek 150%, teren nierówny 125%.
 * U nas z tej listy jest piasek; reszta czeka na własne rodzaje terenu.
 */
export const KARA_PIASEK = 1.5;
export const KARA_NIEROWNY = 1.25;

/**
 * [NASZE] Droga kosztuje 70% pola. W Heroes 3 drogi mają trzy klasy o różnym
 * koszcie; my mamy jedną, więc jedna liczba. Ma być wyraźnie taniej niż trawa,
 * bo o to w drogach chodzi.
 */
export const KOSZT_DROGI = 0.7;

/**
 * Punkty ruchu na dzień w zależności od szybkości najwolniejszego oddziału.
 *
 * [H3] Potwierdzone są końce skali: przy szybkości 3 jest 1500, przy 11 i wyżej
 * 2000. [NASZE] Wartości pośrednie są rozłożone równomiernie — pełnej tabeli
 * z wiki nie udało się pobrać, więc nie udaję, że ją mam.
 *
 * Sama zasada jest ważniejsza od dokładnych liczb: armia idzie z prędkością
 * najwolniejszego, więc zabranie ciężkiego oddziału naprawdę kosztuje.
 */
export function ruchNaDzien(najwolniejszy: number): number {
  const s = Math.max(3, Math.min(11, najwolniejszy));
  return Math.round(1500 + ((s - 3) / 8) * 500);
}

// ---------------------------------------------------------------------------
// SKRZYNIA
// ---------------------------------------------------------------------------

/**
 * [H3] Skrzynia daje WYBÓR: pieniądze albo doświadczenie, w trzech wariantach —
 * 1000 złota / 500 dośw., 1500 / 1000, 2000 / 1500.
 *
 * Wybór jest tu całą mechaniką. Bez niego skrzynia jest tylko kolejnym stosem
 * surowca; z nim dziecko po raz pierwszy podejmuje decyzję „teraz czy później".
 * Nasza waluta to pokeballe, więc kwoty są przeskalowane — patrz `SKRZYNIE`.
 */
export const SKRZYNIE_H3 = [
  { waluta: 1000, doswiadczenie: 500 },
  { waluta: 1500, doswiadczenie: 1000 },
  { waluta: 2000, doswiadczenie: 1500 },
] as const;

/**
 * [NASZE] Te same trzy poziomy, przeliczone na naszą skalę. Pokeballi jest
 * kilkanaście, nie tysiące — oddział kosztuje kilka — więc dzielimy przez 100.
 * Proporcje między poziomami i sam wybór zostają nietknięte.
 */
export const SKRZYNIE = SKRZYNIE_H3.map((s) => ({
  pokeballe: s.waluta / 100,
  doswiadczenie: s.doswiadczenie / 10,
}));

/**
 * [NASZE] Co dwudziesta skrzynia zamiast wyboru daje artefakt. W Heroes 3 robi
 * to skrzynia morska, a nie lądowa, ale rzadka niespodzianka jest dokładnie tą
 * rzeczą, dla której warto otwierać każdą kolejną skrzynię.
 */
export const SZANSA_ARTEFAKTU = 0.05;

// ---------------------------------------------------------------------------
// STOSY SUROWCA
// ---------------------------------------------------------------------------

/**
 * [H3] Losowy stos to 5–10 drewna lub rudy, 3–6 surowca rzadkiego,
 * 500–1000 złota.
 *
 * [NASZE] Przełożenie na nasze cztery surowce: jagody są odpowiednikiem
 * drewna (pospolite), kamienie ewolucji i odłamki — rzadkiego, pokeballe —
 * złota, w naszej skali.
 */
export const STOS = {
  jagoda: [5, 10],
  odlamek: [3, 6],
  kamien: [1, 3],
  pokeball: [5, 10],
} as const;

/**
 * [H3] Dzienna produkcja: tartak +2 drewna, kopalnia rudy +2, kryształy, klejnoty,
 * rtęć i siarka po +1, kopalnia złota +1000 złota.
 *
 * [NASZE] To samo u nas: pospolity surowiec po 2 dziennie, rzadki po 1,
 * a „kopalnia złota" to obóz z pokeballami — 10 dziennie, bo nasza waluta jest
 * sto razy mniejsza.
 */
export const PRODUKCJA = {
  jagoda: 2,
  odlamek: 1,
  kamien: 1,
  pokeball: 10,
} as const;

// ---------------------------------------------------------------------------
// MGŁA WOJNY
// ---------------------------------------------------------------------------

/**
 * [H3] Bohater bez zwiadu odsłania pola w promieniu 5. My mamy jedną wartość,
 * bo umiejętności bohatera jeszcze nie ma.
 */
export const PROMIEN_WIDZENIA = 5;

// ---------------------------------------------------------------------------
// POTWORY
// ---------------------------------------------------------------------------

/**
 * [H3] Neutralne oddziały reagują na siłę armii bohatera: słabsze uciekają
 * albo proponują dołączenie, silniejsze walczą. Progi w Heroes 3 zależą od
 * stosunku sił (`AI value`).
 *
 * [NASZE] Nasz odpowiednik siły to suma „liczebność × atak × życie" po całej
 * armii — jedyna miara, którą naprawdę mamy. Progi dobrane tak, żeby dziecko
 * widziało wyraźną różnicę między „to jest na teraz" a „na to jeszcze za wcześnie".
 */
export const PROG_UCIECZKI = 2.5;
export const PROG_DOLACZENIA = 5;

// ---------------------------------------------------------------------------
// ZAMEK
// ---------------------------------------------------------------------------

/**
 * [H3] W mieście stawia się JEDEN budynek dziennie. To jest cała ekonomia
 * Heroes 3 w jednym zdaniu: surowce zbierasz szybciej, niż możesz je wydać,
 * więc liczy się kolejność, a nie tempo. Gracz, który ma na trzy budynki,
 * i tak musi wybrać, który stanie dziś.
 *
 * [NASZE] To samo. Bez tej zasady ekran miasta zamienia się w listę zakupów:
 * klika się wszystko, na co starczy, i drzewko rozwoju przestaje być wyborem.
 */
export const BUDYNKOW_NA_DZIEN = 1;

/**
 * [H3] Przyrost w siedliskach jest tygodniowy, a fort (i jego ulepszenia)
 * podnosi go we wszystkich siedliskach naraz.
 *
 * [NASZE] Przyrost jest dzienny i mniejszy — tydzień to dla ośmiolatka bardzo
 * długo, a nagroda musi być widoczna następnego dnia. Mnożnik fortu został.
 */
export const MNOZNIK_FORTU = 1.5;
