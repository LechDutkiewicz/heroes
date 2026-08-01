export type ElementType = 'fire' | 'water' | 'grass';
export type SpecialKind = 'power' | 'drain';

export interface UnitDef {
  /** nazwa pliku w public/sprites bez rozszerzenia */
  sprite: string;
  name: string;
  hp: number;
  atk: number;
  move: number;
  /** strzelec trafia na dowolny dystans, ale dalej niż shootRange za pół siły */
  shooter: boolean;
  shootRange: number;
  type: ElementType;
  specialName: string;
  specialKind: SpecialKind;
}

export const TYPE_INFO: Record<ElementType, { emoji: string; label: string; color: number }> = {
  fire: { emoji: '\u{1F525}', label: 'Ogień', color: 0xff7043 },
  water: { emoji: '\u{1F4A7}', label: 'Woda', color: 0x42a5f5 },
  grass: { emoji: '\u{1F33F}', label: 'Trawa', color: 0x66bb6a },
};

export const SPECIAL_COOLDOWN = 3;
/** Kara za zwarcie i za zbyt daleki strzał (złamana strzała). */
export const HALF_DAMAGE = 0.5;

// Kolejność w tablicy wyznacza miejsce w kolumnie startowej — walczący wręcz
// i strzelcy stoją na przemian, żeby żaden nie zasłaniał drugiego.
export const PLAYER_TEAM: UnitDef[] = [
  { sprite: '00026', name: 'Żarwilk', hp: 32, atk: 9, move: 3, shooter: false, shootRange: 0, type: 'fire', specialName: 'Ognisty pazur', specialKind: 'power' },
  { sprite: '00041', name: 'Żarokur', hp: 22, atk: 8, move: 3, shooter: true, shootRange: 4, type: 'fire', specialName: 'Deszcz iskier', specialKind: 'power' },
  { sprite: '00030', name: 'Skorupiec', hp: 40, atk: 6, move: 2, shooter: false, shootRange: 0, type: 'water', specialName: 'Tarcza fal', specialKind: 'drain' },
  { sprite: '00040', name: 'Kropelek', hp: 20, atk: 7, move: 3, shooter: true, shootRange: 5, type: 'water', specialName: 'Armatka wodna', specialKind: 'power' },
  { sprite: '00055', name: 'Modliś', hp: 30, atk: 8, move: 3, shooter: false, shootRange: 0, type: 'grass', specialName: 'Bicz pnączy', specialKind: 'drain' },
  { sprite: '00025', name: 'Kiełek', hp: 24, atk: 8, move: 2, shooter: true, shootRange: 4, type: 'grass', specialName: 'Ostry liść', specialKind: 'power' },
];

export const ENEMY_TEAM: UnitDef[] = [
  { sprite: '00052', name: 'Twardziel', hp: 44, atk: 7, move: 2, shooter: false, shootRange: 0, type: 'water', specialName: 'Wir', specialKind: 'power' },
  { sprite: '00066', name: 'Iskrzyk', hp: 24, atk: 9, move: 3, shooter: true, shootRange: 4, type: 'fire', specialName: 'Wybuch ognia', specialKind: 'power' },
  { sprite: '00067', name: 'Mrocznik', hp: 30, atk: 9, move: 4, shooter: false, shootRange: 0, type: 'fire', specialName: 'Rozżarzenie', specialKind: 'drain' },
  { sprite: '00048', name: 'Płetwiak', hp: 20, atk: 7, move: 3, shooter: true, shootRange: 5, type: 'water', specialName: 'Lodowy strzał', specialKind: 'power' },
  { sprite: '00027', name: 'Choinek', hp: 32, atk: 8, move: 3, shooter: false, shootRange: 0, type: 'grass', specialName: 'Wysysanie', specialKind: 'drain' },
  { sprite: '00024', name: 'Skrzydliść', hp: 22, atk: 8, move: 2, shooter: true, shootRange: 4, type: 'grass', specialName: 'Tańczące liście', specialKind: 'power' },
];

/** Ogień bije trawę, trawa bije wodę, woda bije ogień. */
export function typeMultiplier(attacker: ElementType, defender: ElementType): number {
  if (attacker === defender) return 1;
  const strong =
    (attacker === 'fire' && defender === 'grass') ||
    (attacker === 'grass' && defender === 'water') ||
    (attacker === 'water' && defender === 'fire');
  return strong ? 1.5 : 0.67;
}

/** Wszystkie sprite'y, które gra musi wczytać przed bitwą. */
export const ALL_SPRITES = [...PLAYER_TEAM, ...ENEMY_TEAM].map((u) => u.sprite);
