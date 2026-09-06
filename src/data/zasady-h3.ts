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
// SKALA WALUTY
// ---------------------------------------------------------------------------

/**
 * [NASZE] JEDNA reguła przeliczania złota z Heroes 3 na pokeballe. Wszystko,
 * co ma cenę — oddziały, skrzynie, stosy, kopalnie, ratusze — musi z niej
 * wynikać, bo inaczej ekonomia się rozjeżdża.
 *
 * Wcześniej rozjeżdżała się dokładnie tak: dochód liczyliśmy jak złoto dzielone
 * przez sto (kopalnia 1000 → 10 pokeballi), a oddziały wyceniliśmy „na oko",
 * czyli jakby dzielić przez trzydzieści (60 złota → 2 pokeballe). Efekt: dzienny
 * przyrost całego miasta kosztował 95 pokeballi, a cała mapa dawała 30. Gracz
 * z KAŻDĄ kopalnią i tak nie miał na armię, nie mówiąc o rozbudowie.
 *
 * Dzielnik 50, a nie 100, bo przy stu najtańszy oddział kosztowałby 0,6
 * pokeballa i po zaokrągleniu dwa pierwsze poziomy miałyby tę samą cenę —
 * drabinka cen przestałaby cokolwiek znaczyć.
 */
export const ZLOTO_NA_POKEBALL = 50;

/** Złoto z Heroes 3 → pokeballe, zawsze co najmniej jeden. */
export const naPokeballe = (zloto: number) =>
  Math.max(1, Math.round(zloto / ZLOTO_NA_POKEBALL));

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
 * [NASZE] Te same trzy poziomy, przeliczone przez `naPokeballe`. Proporcje
 * między poziomami i sam wybór zostają nietknięte — zmienia się tylko to, że
 * skrzynia liczy się tą samą miarą co oddziały, więc widać, ile armii kupuje.
 */
export const SKRZYNIE = SKRZYNIE_H3.map((s) => ({
  pokeballe: naPokeballe(s.waluta),
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
  // 500–1000 złota przez `naPokeballe`. Wcześniej stało tu [5, 10] — stos
  // złota był wart tyle, co stos jagód, choć w Heroes 3 jest wart kilka razy
  // więcej niż stos drewna.
  pokeball: [10, 20],
} as const;

/**
 * [H3] Dzienna produkcja: tartak +2 drewna, kopalnia rudy +2, kryształy, klejnoty,
 * rtęć i siarka po +1, kopalnia złota +1000 złota.
 *
 * [NASZE] To samo u nas: pospolity surowiec po 2 dziennie, rzadki po 1,
 * a „kopalnia złota" to obóz z pokeballami — 1000 złota przez `naPokeballe`,
 * czyli 20 dziennie.
 */
export const PRODUKCJA = {
  jagoda: 2,
  odlamek: 1,
  kamien: 1,
  pokeball: naPokeballe(1000),
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

// ---------------------------------------------------------------------------
// BUDOWLE MAPY PRZYGODY
// ---------------------------------------------------------------------------

/**
 * [H3] Budowle odwiedzane — Mercenary Camp, Marletto Tower, Tree of Knowledge,
 * Arena, Redwood Observatory, Stables, Windmill i cała reszta drobiazgów.
 * To one zamieniają wędrówkę w decyzję: nadłóż drogi, dostań liczbę na stałe.
 *
 * [NASZE] Wartości bonusów są takie same jak w Heroes 3 (+1 atak, +1 obrona,
 * +2 w arenie), bo są to małe liczby na małych statystykach i przenoszą się
 * wprost. Skalowane są tylko rzeczy liczone w złocie i w punktach ruchu.
 */

/** [H3] Obóz najemników i kamienna wieża: +1 do jednej statystyki, raz. */
export const BUDOWLA_STATYSTYKA = 1;

/** [H3] Arena: wybór między +2 ataku a +2 obrony. Wybór jest tu mechaniką. */
export const ARENA_BONUS = 2;

/**
 * [H3] Drzewo Wiedzy daje jeden pełny poziom bohatera (albo 2000 złota za nic).
 *
 * [NASZE] Nasz odpowiednik „poziomu" to 100 doświadczenia na pierwszym progu,
 * więc drzewo daje tyle, ile brakuje do następnego poziomu — liczone przy
 * odwiedzeniu, żeby na wyższych poziomach nie było darmowym awansem.
 */
export const DRZEWO_WIEDZY_MIN = 100;

/** [H3] Redwood Observatory odsłania mgłę w promieniu 20 pól na mapie 72 × 72. */
export const OBSERWATORIUM_PROMIEN = 10;

/**
 * [H3] Stajnia daje +400 punktów ruchu na tydzień. [NASZE] Tydzień to u nas
 * bardzo długo (dzienny przyrost, dzienny dochód), więc bonus trwa trzy dni,
 * a stajni można użyć ponownie po tygodniu.
 */
export const STAJNIA_BONUS = 400;
export const STAJNIA_DNI = 3;
export const STAJNIA_ODNOWA = 7;

/**
 * [H3] Wiatrak daje 3–6 jednostek losowego surowca innego niż drewno, raz na
 * tydzień. [NASZE] To samo, z naszych czterech surowców — bez pokeballi, bo
 * pokeballe sypią się i tak zewsząd, a wiatrak ma dawać to, czego brakuje.
 */
export const WIATRAK_ILE = [3, 6] as const;
export const WIATRAK_ODNOWA = 7;

/** [H3] Ognisko: 400–600 złota i tyle samo (w setkach) jednego surowca. */
export const OGNISKO_POKEBALLE = naPokeballe(500);
export const OGNISKO_SUROWIEC = 5;

/** [H3] Chatka skrzata (Lean-To): 1–4 jednostki jednego surowca, jednorazowo. */
export const CHATKA_ILE = [1, 4] as const;

/** [H3] Wóz (Wagon): albo artefakt, albo 2–5 jednostek surowca. */
export const WOZ_ILE = [2, 5] as const;

/**
 * [H3] Hill Fort ulepsza oddziały na miejscu, taniej niż w mieście.
 *
 * [NASZE] Nie mamy ulepszonych wersji stworków, więc Ośrodek Ewolucji robi to,
 * co w świecie Pokemon robi kamień ewolucji: zamienia oddział w oddział
 * poziom wyżej z tej samej frakcji. Liczebność spada w proporcji poziomów
 * (tak jak w drzewku frakcji), a płaci się kamieniami ewolucji — pierwsze
 * zastosowanie tego surowca poza rozbudową zamku.
 */
export const EWOLUCJA_KOSZT = 2;

/** [NASZE] Gniazdo na mapie hoduje tyle samo, co siedlisko tego poziomu w mieście. */
export const GNIAZDO_TIER = 1;
