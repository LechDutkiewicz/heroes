import type { ElementType } from './units';

/**
 * Linie ewolucyjne stworków — PROJEKT, jeszcze bez mechaniki w grze.
 *
 * Skąd pomysł: „ewolucja zmienia jednego pokemona w innego — fabularnie się
 * nie klei" (uwagi z rozgrywki, STAN.md). Dziś Ośrodek Ewolucji podnosi
 * oddział o poziom, czyli Pyroko staje się Flamirem, który z Pyroko nie ma
 * nic wspólnego. Tu każdy stworek z zamku dostaje własną linię jak
 * w Pokemonach: forma bazowa (obecny oddział) → etap 2 → etap 3, ten sam
 * gatunek, te same barwy, coraz większy i groźniejszy. Mechanika (budynek
 * w mieście, koszt w kamieniach ewolucji i jagodach, statystyki etapów, AI)
 * to osobne zadanie — ten plik mówi tylko, KTO w KOGO ewoluuje.
 *
 * Sprawdzone pary w frakcjach: każda frakcja ma po dwa oddziały każdego
 * żywiołu (Bór: ogień 1–2, woda 3–4, trawa 5–6; Grota: woda 1–5, trawa
 * 2–4, ogień 3–6; Zbocze: trawa 1–3, woda 2–6, ogień 4–5), więc kusiło,
 * żeby łańcuch szedł „poziom niżej → poziom wyżej tego samego żywiołu".
 * Odrzucone: (1) w Grocie i Zboczu skok bywa o cztery poziomy (Glacyn 1 →
 * Aquator 5), (2) dwa siedliska dawałyby tego samego stworka i poziom
 * znikałby z zamku, (3) na obrazkach te pary to zupełnie inne zwierzęta
 * (Bazalt — salamandra, Obsydian — bakłażan). Linia per stworek zostawia
 * poziom na swoim miejscu i pasuje do „ulepszonych siedlisk" z Heroes 3:
 * ewolucja to ulepszenie oddziału w obrębie jego poziomu.
 *
 * Numery sprite'ów: forma bazowa ma numer obecnego oddziału (`FACTIONS`),
 * etap 2 — `01` + trzy ostatnie cyfry bazy, etap 3 — `02` + te same cyfry.
 * Pliki leżą w `public/sprites/<numer>.png` (`tools/stworki_wczytaj.py`
 * z promptów `tools/PROMPTY-STWORKI.md`). Nazwy w stylu reszty oddziałów:
 * obco brzmiące zlepki od nazwy bazy, żadnych prawdziwych pokemonów.
 */

export interface EtapEwolucji {
  /** nazwa pliku w public/sprites bez rozszerzenia */
  sprite: string;
  nazwa: string;
}

export interface LiniaEwolucji {
  frakcja: 'bor' | 'grota' | 'zbocze';
  /** poziom oddziału w zamku (1–6) — wspólny dla wszystkich etapów */
  poziom: number;
  zywiol: ElementType;
  /** od formy bazowej (obecny oddział) do ostatniej */
  etapy: [EtapEwolucji, EtapEwolucji, EtapEwolucji];
}

type Para = [sprite: string, nazwa: string];

function linia(
  frakcja: LiniaEwolucji['frakcja'],
  poziom: number,
  zywiol: ElementType,
  ...etapy: [Para, Para, Para]
): LiniaEwolucji {
  const [a, b, c] = etapy.map(([sprite, nazwa]) => ({ sprite, nazwa }));
  return { frakcja, poziom, zywiol, etapy: [a, b, c] };
}

export const LINIE_EWOLUCJI: LiniaEwolucji[] = [
  // Bór Szmaragdowy
  linia('bor', 1, 'fire', ['00193', 'Pyroko'], ['01193', 'Pyrokin'], ['02193', 'Pyrogar']),
  linia('bor', 2, 'fire', ['00020', 'Flamir'], ['01020', 'Flamiron'], ['02020', 'Flamidor']),
  linia('bor', 3, 'water', ['00218', 'Aquino'], ['01218', 'Aquilon'], ['02218', 'Aquarion']),
  linia('bor', 4, 'water', ['00030', 'Torrenar'], ['01030', 'Torrenos'], ['02030', 'Torrendor']),
  linia('bor', 5, 'grass', ['00096', 'Verdiko'], ['01096', 'Verdilo'], ['02096', 'Verdiantor']),
  linia('bor', 6, 'grass', ['00227', 'Silvena'], ['01227', 'Silvaris'], ['02227', 'Silvanora']),

  // Grota Księżycowa
  linia('grota', 1, 'water', ['00246', 'Glacyn'], ['01246', 'Glacynar'], ['02246', 'Glacyrion']),
  linia('grota', 2, 'grass', ['00002', 'Sporex'], ['01002', 'Sporexil'], ['02002', 'Sporedon']),
  linia('grota', 3, 'fire', ['00263', 'Cindro'], ['01263', 'Cindrak'], ['02263', 'Cindragor']),
  linia('grota', 4, 'grass', ['00250', 'Sporina'], ['01250', 'Sporilla'], ['02250', 'Sporinelle']),
  linia('grota', 5, 'water', ['00220', 'Aquator'], ['01220', 'Aquatorn'], ['02220', 'Aquatoros']),
  linia('grota', 6, 'fire', ['00196', 'Vulkaron'], ['01196', 'Vulkarex'], ['02196', 'Vulkadon']),

  // Zbocze Popielne
  linia('zbocze', 1, 'grass', ['00074', 'Bazalt'], ['01074', 'Bazaltor'], ['02074', 'Bazaltron']),
  linia('zbocze', 2, 'water', ['00058', 'Ashko'], ['01058', 'Ashkor'], ['02058', 'Ashkoran']),
  linia('zbocze', 3, 'grass', ['00095', 'Obsydian'], ['01095', 'Obsydiak'], ['02095', 'Obsydion']),
  linia('zbocze', 4, 'fire', ['00023', 'Cynder'], ['01023', 'Cynderos'], ['02023', 'Cyndrakon']),
  linia('zbocze', 5, 'fire', ['00077', 'Lawina'], ['01077', 'Lawinix'], ['02077', 'Lawinara']),
  linia('zbocze', 6, 'water', ['00041', 'Sadzin'], ['01041', 'Sadzinor'], ['02041', 'Sadzimar']),
];

/** Linia, do której należy stworek o danym sprite'ie (dowolny etap). */
export function liniaStworka(sprite: string): LiniaEwolucji | undefined {
  return LINIE_EWOLUCJI.find((l) => l.etapy.some((e) => e.sprite === sprite));
}

/** Etap w linii: 0 — forma bazowa, 2 — ostatnia; -1, gdy stworek nie ma linii. */
export function etapStworka(sprite: string): number {
  return liniaStworka(sprite)?.etapy.findIndex((e) => e.sprite === sprite) ?? -1;
}

/** W kogo stworek ewoluuje; `undefined` dla ostatniego etapu i stworków bez linii. */
export function nastepnyEtap(sprite: string): EtapEwolucji | undefined {
  const l = liniaStworka(sprite);
  const i = etapStworka(sprite);
  return l && i >= 0 ? l.etapy[i + 1] : undefined;
}

/** Wszystkie sprite'y wszystkich etapów — do wczytania przed sceną z ewolucją. */
export const SPRITE_EWOLUCJI = LINIE_EWOLUCJI.flatMap((l) => l.etapy.map((e) => e.sprite));
