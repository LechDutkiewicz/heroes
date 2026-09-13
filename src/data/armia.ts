/**
 * Armia bohatera jako RZĄD SLOTÓW — i cała arytmetyka przekładania oddziałów
 * między nimi.
 *
 * Do tej pory armia była gęstą listą (`Oddzial[]`): oddział siedział pod
 * indeksem, który akurat wypadł przy werbunku, a wyjęcie środkowego zsuwało
 * resztę w lewo. Dla ekranu bohatera to za mało. W Heroes 3 slot jest
 * MIEJSCEM, nie pozycją na liście: gracz świadomie zostawia dziurę (żeby
 * dorzucić tam łucznika z zamku), świadomie układa szybkich na skraju, a to,
 * co zrobi z układem, ma przeżyć zamknięcie okna. Dlatego armia jest tu
 * tablicą stałej długości z `null` w pustych miejscach.
 *
 * Cała logika przekładania siedzi w tym pliku, a nie w scenie, z tego samego
 * powodu co zasady walki w `battle.ts`: scena ma odgrywać wynik, nie liczyć
 * go. Dzięki temu podział stosów sprawdza sonda bez przeglądarki, na setkach
 * przypadków brzegowych, których myszą nie da się wyklikać.
 */

import type { Oddzial } from './mapa';

/**
 * Siedem slotów — tyle ma bohater w Heroes 3. Panel na mapie przygody
 * pokazuje z nich cztery pierwsze (tyle się mieści), ekran bohatera wszystkie.
 */
export const SLOTY_ARMII = 7;

/** Jeden slot: oddział albo puste miejsce. */
export type Slot = Oddzial | null;

/** Armia bohatera — zawsze dokładnie `SLOTY_ARMII` slotów. */
export type Armia = Slot[];

/** Pusta armia: siedem dziur. */
export const pustaArmia = (): Armia => Array<Slot>(SLOTY_ARMII).fill(null);

/**
 * Doprowadza cokolwiek, co przypomina armię, do postaci kanonicznej.
 *
 * Potrzebne w trzech miejscach, w których armia przychodzi z zewnątrz i nie
 * ma gwarancji długości: zapisany stan gry sprzed tej zmiany (gęsta lista),
 * wynik bitwy (lista ocalałych) i dane startowe mapy. Bez jednego wejścia
 * każde z nich musiałoby pamiętać o dopchnięciu tablicy i któreś by nie
 * pamiętało.
 *
 * Przy okazji wypadają stosy o zerowej liczebności — po bitwie zostają
 * w wyniku jako ślad po wybitym oddziale, a w armii nie mają czego szukać.
 */
export function znormalizuj(zrodlo: readonly (Slot | undefined)[] | undefined): Armia {
  const a = pustaArmia();
  if (!zrodlo) return a;
  for (let i = 0; i < Math.min(zrodlo.length, SLOTY_ARMII); i++) {
    const o = zrodlo[i];
    if (o && o.ile > 0) a[i] = o;
  }
  // Gdyby źródło było dłuższe niż siedem slotów (stara gęsta lista po
  // werbunku), nadmiar nie może po prostu zniknąć — doklejamy go w dziury.
  for (let i = SLOTY_ARMII; i < (zrodlo.length ?? 0); i++) {
    const o = zrodlo[i];
    if (o && o.ile > 0) dolacz(a, o);
  }
  return a;
}

/** Same zajęte sloty, w kolejności slotów. Tego chce bitwa i podsumowania. */
export const zywe = (a: Armia): Oddzial[] => a.filter((o): o is Oddzial => !!o && o.ile > 0);

/** Ile stosów stoi w armii. */
export const zajete = (a: Armia): number => zywe(a).length;

/** Łączna liczba stworków — pasek „armia" i sondy liczą właśnie to. */
export const lacznie = (a: Armia): number => zywe(a).reduce((s, o) => s + o.ile, 0);

/** Pierwszy wolny slot albo `-1`. */
export const pierwszyWolny = (a: Armia): number => a.findIndex((o) => !o);

/**
 * Dokłada oddział do armii: do istniejącego stosu tego samego gatunku, a jak
 * takiego nie ma — do pierwszej dziury. Tak działa werbunek w zamku i wykluta
 * banda z gniazda.
 *
 * Zwraca `false`, gdy nie było gdzie postawić — wołający ma wtedy powiedzieć
 * o tym graczowi, a nie po cichu zgubić zakup.
 */
export function dolacz(a: Armia, o: Oddzial): boolean {
  const ten = a.findIndex((s) => s && s.sprite === o.sprite);
  if (ten !== -1) {
    a[ten]!.ile += o.ile;
    return true;
  }
  const wolny = pierwszyWolny(a);
  if (wolny === -1) return false;
  a[wolny] = { ...o };
  return true;
}

/**
 * Czy wolno ruszyć zawartość slotu.
 *
 * Zasada z Heroes 3, jedyna, która tu naprawdę ogranicza: bohater nie może
 * zostać z pustą armią. Ostatni stos wolno przenieść (to zmiana slotu, armia
 * dalej istnieje), ale nie wolno go podzielić tak, żeby w źródle został zero,
 * bo to jest to samo co przeniesienie, tylko wygląda jak podział.
 */
export const ostatniStos = (a: Armia): boolean => zajete(a) <= 1;

/**
 * Co gracz trzyma na klawiaturze przy upuszczeniu stosu.
 *
 * `okno` (Alt) jest tu osobno, a nie jako brak skrótu, od czasu, gdy zwykłe
 * przeciągnięcie na puste miejsce zaczęło po prostu przenosić.
 */
export type Skrot = 'brak' | 'polowa' | 'jeden' | 'okno';

export type Wynik =
  | { ok: true; opis: string }
  | { ok: false; powod: string };

const zle = (powod: string): Wynik => ({ ok: false, powod });

const wSlocie = (a: Armia, i: number) => i >= 0 && i < a.length;

/**
 * Przełożenie CAŁEGO stosu: przenieś, zamień albo scal.
 *
 * Trzy zachowania, wszystkie z Heroes 3, i wybór między nimi wynika wyłącznie
 * z tego, co stoi w celu:
 *
 * | Cel | Co się dzieje |
 * |---|---|
 * | pusty | oddział przenosi się do nowego slotu |
 * | ten sam gatunek | stosy się scalają |
 * | inny gatunek | sloty się zamieniają |
 *
 * Zamiana zamiast odmowy jest tu ważna: gracz układa kolejność armii właśnie
 * przez przeciąganie jednego oddziału na drugi, a odmowa („slot zajęty")
 * kazałaby mu najpierw odłożyć coś na bok. W Heroes 3 nie ma slotu na bok.
 */
export function przenies(a: Armia, z: number, doc: number): Wynik {
  if (!wSlocie(a, z) || !wSlocie(a, doc)) return zle('Slot poza armią.');
  if (z === doc) return zle('To ten sam slot.');
  const zrodlo = a[z];
  if (!zrodlo) return zle('Pusty slot — nie ma czego przenieść.');
  const cel = a[doc];

  if (!cel) {
    a[doc] = zrodlo;
    a[z] = null;
    return { ok: true, opis: `${zrodlo.nazwa} przeszedł do slotu ${doc + 1}.` };
  }
  if (cel.sprite === zrodlo.sprite) {
    cel.ile += zrodlo.ile;
    a[z] = null;
    return { ok: true, opis: `${cel.nazwa} — stosy scalone, razem ${cel.ile}.` };
  }
  a[doc] = zrodlo;
  a[z] = cel;
  return { ok: true, opis: `${zrodlo.nazwa} ↔ ${cel.nazwa}.` };
}

/**
 * Ile najwięcej wolno oddać ze slotu `z` do slotu `doc`.
 *
 * Dwa różne maksima, i to nie jest drobiazg:
 *  - do PUSTEGO slotu można oddać wszystko oprócz jednego stworka, bo oddanie
 *    wszystkiego to już przeniesienie i po podziale zostałby pusty stos;
 *  - do slotu z TYM SAMYM gatunkiem można oddać wszystko — źródło znika,
 *    a armia nie traci ani stworka. To jest zwykłe dolewanie do stosu.
 *
 * Wyjątek na ostatni stos: jeśli to jedyny oddział bohatera, do pustego slotu
 * i tak zostaje reguła „zostaw jednego", więc bohater nie zostanie bez armii.
 */
export function maksPodzialu(a: Armia, z: number, doc: number): number {
  if (!wSlocie(a, z) || !wSlocie(a, doc) || z === doc) return 0;
  const zrodlo = a[z];
  if (!zrodlo) return 0;
  const cel = a[doc];
  if (cel && cel.sprite !== zrodlo.sprite) return 0;
  return cel ? zrodlo.ile : zrodlo.ile - 1;
}

/**
 * Podział stosu: `ile` stworków ze slotu `z` ląduje w slocie `doc`.
 *
 * To jest ta operacja, którą w Heroes 3 wywołuje przeciągnięcie na pusty slot
 * (okno z suwakiem), Shift (połowa) i Ctrl (jeden). Wszystkie trzy wchodzą
 * tędy, więc reguła „nie zostawiaj pustego stosu" jest zapisana raz.
 */
export function podziel(a: Armia, z: number, doc: number, ile: number): Wynik {
  if (!wSlocie(a, z) || !wSlocie(a, doc)) return zle('Slot poza armią.');
  if (z === doc) return zle('To ten sam slot.');
  const zrodlo = a[z];
  if (!zrodlo) return zle('Pusty slot — nie ma czego dzielić.');
  const cel = a[doc];
  if (cel && cel.sprite !== zrodlo.sprite) return zle('W tym slocie stoi ktoś inny.');
  if (!Number.isInteger(ile) || ile < 1) return zle('Trzeba oddać co najmniej jednego.');
  const maks = maksPodzialu(a, z, doc);
  if (ile > maks) return zle(`Najwięcej ${maks}.`);

  zrodlo.ile -= ile;
  if (cel) cel.ile += ile;
  else a[doc] = { ...zrodlo, ile };
  if (zrodlo.ile === 0) a[z] = null;

  return {
    ok: true,
    opis: cel
      ? `${ile} × ${zrodlo.nazwa} dołączyło do slotu ${doc + 1}.`
      : `${zrodlo.nazwa} rozdzielony: ${a[z]?.ile ?? 0} i ${ile}.`,
  };
}

/**
 * Ile stworków oddaje skrót klawiszowy.
 *
 * Podział „na pół" zaokrągla w DÓŁ, więc przy nieparzystym stosie większa
 * połowa zostaje w źródle — tak samo jak w Heroes 3 i HotA. Z zaokrągleniem
 * w górę siedmiu jednorożców rozpadłoby się na 3 i 4 z czwórką po nowej
 * stronie, co przy przeciąganiu wygląda na pomyłkę gry.
 */
export function ileNaSkrot(a: Armia, z: number, doc: number, skrot: 'polowa' | 'jeden'): number {
  const maks = maksPodzialu(a, z, doc);
  if (maks < 1) return 0;
  const zrodlo = a[z];
  if (!zrodlo) return 0;
  return skrot === 'jeden' ? 1 : Math.min(maks, Math.floor(zrodlo.ile / 2));
}

/**
 * Czy z tego slotu w ogóle da się coś przeciągnąć, i co się stanie po
 * upuszczeniu. Scena pyta o to przy najechaniu, żeby pokazać kursor i
 * podpowiedź ZANIM gracz puści przycisk — inaczej dowiaduje się o odmowie
 * dopiero po ruchu, który wygląda na wykonany.
 */
export function zamiar(
  a: Armia,
  z: number,
  doc: number,
  skrot: Skrot
): { rodzaj: 'przenies' | 'scal' | 'zamien' | 'podziel' | 'okno' | 'nic'; ile?: number } {
  if (!wSlocie(a, z) || !wSlocie(a, doc) || z === doc || !a[z]) return { rodzaj: 'nic' };
  const zrodlo = a[z]!;
  const cel = a[doc];

  if (skrot === 'polowa' || skrot === 'jeden') {
    const ile = ileNaSkrot(a, z, doc, skrot);
    return ile > 0 ? { rodzaj: 'podziel', ile } : { rodzaj: 'nic' };
  }
  if (skrot === 'okno') {
    // Jeden stworek nie ma się jak podzielić — okno z suwakiem od 1 do 0
    // byłoby kpiną, więc taki stos po prostu się przenosi.
    return maksPodzialu(a, z, doc) >= 1 ? { rodzaj: 'okno' } : { rodzaj: 'przenies' };
  }
  // Puste miejsce: zwykłe przeciągnięcie PRZENOSI cały stos.
  //
  // Heroes 3 otwiera w tym miejscu okno z suwakiem i tak było tu na początku —
  // ale wyszło z grania, że to jest zły domyślny wybór: przełożenie oddziału
  // na inny slot robi się kilka razy częściej niż podział, a okno kazało przy
  // każdym takim przełożeniu zatwierdzać liczbę, której nikt nie chciał
  // zmieniać. Podział ma trzy własne drogi (Shift, Ctrl, Alt), więc nic nie
  // znika — zmienia się tylko to, co jest pod ręką bez klawisza.
  if (!cel) return { rodzaj: 'przenies' };
  return cel.sprite === zrodlo.sprite ? { rodzaj: 'scal' } : { rodzaj: 'zamien' };
}
