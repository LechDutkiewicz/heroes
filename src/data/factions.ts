import type { UnitDef } from './units';

/**
 * Frakcje, czyli zamki. Każda ma sześć poziomów oddziałów — od licznej
 * drobnicy po nielicznych czempionów, jak w Heroes 3.
 *
 * Obie frakcje korzystają z tej samej tabeli statystyk dla danego poziomu
 * (patrz TIERS niżej). Dzięki temu są równe co do siły z samej konstrukcji,
 * a różnią się tym, co ciekawe: stworkami, żywiołami i tym, który poziom
 * jest u kogo strzelcem, lataczem czy czempionem.
 */
export interface Faction {
  id: string;
  /** nazwa zamku */
  name: string;
  /** jednym zdaniem: kim oni są */
  motto: string;
  /** barwa przewodnia, używana w interfejsie */
  color: number;
  emoji: string;
  /** oddziały od poziomu 1 do 6 */
  units: UnitDef[];
}

/**
 * Statystyki pojedynczego stworka na każdym poziomie i liczebność oddziału.
 * Im wyższy poziom, tym mniej sztuk, ale każda znacznie mocniejsza.
 */
export const TIERS = [
  { tier: 1, count: 15, hp: 2, atk: 1, move: 3 },
  { tier: 2, count: 10, hp: 3, atk: 2, move: 4 },
  { tier: 3, count: 7, hp: 5, atk: 2, move: 3 },
  { tier: 4, count: 5, hp: 8, atk: 3, move: 6 },
  { tier: 5, count: 3, hp: 13, atk: 5, move: 4 },
  { tier: 6, count: 2, hp: 20, atk: 8, move: 5 },
] as const;

/**
 * Role poziomów są wspólne dla obu frakcji: drobnica, strzelec, obrońca,
 * latacz, elitarny strzelec i czempion. Dopiero żywioły i stworki się różnią.
 */
type Role = Pick<UnitDef, 'shooter' | 'shootRange' | 'flying' | 'ability'>;

const ROLES: Role[] = [
  { shooter: false, shootRange: 0 },
  { shooter: true, shootRange: 5 },
  { shooter: false, shootRange: 0, ability: 'guardian' },
  { shooter: false, shootRange: 0, flying: true, ability: 'strikeAndReturn' },
  { shooter: true, shootRange: 6 },
  { shooter: false, shootRange: 0, ability: 'double' },
];

/** Składa opis oddziału z tabeli poziomów, roli i tego, co frakcji własne. */
function unit(index: number, sprite: string, name: string, type: UnitDef['type']): UnitDef {
  return { ...TIERS[index], ...ROLES[index], sprite, name, type };
}

/**
 * Frakcje to miejsca, bo tak jest poukładany świat pokemonów: w lesie żyją
 * inne stworki niż w jaskini. Nazwy oddziałów są zmyślone, ale w tym samym
 * stylu co w bajce — obco brzmiące zlepki, nie polskie rzeczowniki.
 * Prawdziwych nazw pokemonów nie używamy: nasze stworki to autorskie rysunki,
 * a nie te z bajki, więc nazwanie któregoś Pikachu opisywałoby coś, czym on
 * nie jest (nie mówiąc o cudzym znaku towarowym).
 *
 * Żywioły rozłożone tak, żeby żadna frakcja nie miała przewagi z góry.
 * Na poziomach 1-3 przewagę typu ma Grota, na 4-6 Bór, a każda ma po dwa
 * oddziały ognia, wody i trawy.
 */
export const FACTIONS: Faction[] = [
  {
    id: 'bor',
    name: 'Bór Szmaragdowy',
    motto: 'Stworki lasu i leśnych strumieni — liczne, zwinne i zgrane.',
    color: 0x66bb6a,
    emoji: '\u{1F332}',
    units: [
      unit(0, '00096', 'Verdiko', 'grass'),
      unit(1, '00218', 'Aquino', 'water'),
      unit(2, '00193', 'Pyroko', 'fire'),
      unit(3, '00020', 'Flamir', 'fire'),
      unit(4, '00227', 'Silvena', 'grass'),
      unit(5, '00030', 'Torrenar', 'water'),
    ],
  },
  {
    id: 'grota',
    name: 'Grota Księżycowa',
    motto: 'Stworki podziemi — twarde, zarodnikowe i cierpliwe.',
    color: 0xab47bc,
    emoji: '\u{1F311}',
    units: [
      unit(0, '00263', 'Cindro', 'fire'),
      unit(1, '00002', 'Sporex', 'grass'),
      unit(2, '00220', 'Aquator', 'water'),
      unit(3, '00250', 'Sporina', 'grass'),
      unit(4, '00246', 'Glacyn', 'water'),
      unit(5, '00196', 'Vulkaron', 'fire'),
    ],
  },
];

export const factionById = (id: string) => FACTIONS.find((f) => f.id === id)!;

/** Wszystkie sprite'y, które gra musi wczytać przed bitwą. */
export const ALL_SPRITES = FACTIONS.flatMap((f) => f.units.map((u) => u.sprite));
