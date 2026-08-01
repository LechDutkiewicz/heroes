export type ElementType = 'fire' | 'water' | 'grass';
export type SpecialKind = 'power' | 'drain';

export interface UnitDef {
  name: string;
  emoji: string;
  hp: number;
  atk: number;
  move: number;
  /** 1 = walczy wręcz, >1 = strzelec o takim zasięgu */
  range: number;
  type: ElementType;
  color: number;
  specialName: string;
  specialKind: SpecialKind;
}

export const TYPE_INFO: Record<ElementType, { emoji: string; label: string; color: number }> = {
  fire: { emoji: '\u{1F525}', label: 'Ogień', color: 0xff7043 },
  water: { emoji: '\u{1F4A7}', label: 'Woda', color: 0x42a5f5 },
  grass: { emoji: '\u{1F33F}', label: 'Trawa', color: 0x66bb6a },
};

export const SPECIAL_COOLDOWN = 3;
/** Strzelec przygwożdżony w zwarciu strzela o połowę słabiej. */
export const MELEE_PENALTY = 0.5;

export const PLAYER_TEAM: UnitDef[] = [
  { name: 'Ognisz', emoji: '\u{1F98E}', hp: 32, atk: 9, move: 3, range: 1, type: 'fire', color: 0xe74c3c, specialName: 'Ognista fala', specialKind: 'power' },
  { name: 'Fala', emoji: '\u{1F422}', hp: 40, atk: 6, move: 2, range: 1, type: 'water', color: 0x2980b9, specialName: 'Skorupa', specialKind: 'drain' },
  { name: 'Lisliść', emoji: '\u{1F98A}', hp: 26, atk: 10, move: 4, range: 1, type: 'grass', color: 0x27ae60, specialName: 'Chłost liśćmi', specialKind: 'power' },
  { name: 'Płomyk', emoji: '\u{1F426}', hp: 20, atk: 8, move: 3, range: 4, type: 'fire', color: 0xe67e22, specialName: 'Deszcz iskier', specialKind: 'power' },
  { name: 'Wodnik', emoji: '\u{1F42C}', hp: 22, atk: 7, move: 3, range: 5, type: 'water', color: 0x3498db, specialName: 'Wodna trąba', specialKind: 'drain' },
  { name: 'Kolczak', emoji: '\u{1F335}', hp: 24, atk: 8, move: 2, range: 3, type: 'grass', color: 0x16a085, specialName: 'Grad kolców', specialKind: 'power' },
];

export const ENEMY_TEAM: UnitDef[] = [
  { name: 'Skalun', emoji: '\u{1FAA8}', hp: 44, atk: 6, move: 2, range: 1, type: 'water', color: 0x7f8c8d, specialName: 'Kamienny cios', specialKind: 'power' },
  { name: 'Mroczek', emoji: '\u{1F987}', hp: 26, atk: 9, move: 4, range: 1, type: 'fire', color: 0x8e44ad, specialName: 'Mroczny impet', specialKind: 'drain' },
  { name: 'Cierń', emoji: '\u{1F33B}', hp: 28, atk: 8, move: 3, range: 1, type: 'grass', color: 0x9b59b6, specialName: 'Splątanie', specialKind: 'power' },
  { name: 'Iskrzyk', emoji: '\u{26A1}', hp: 18, atk: 10, move: 4, range: 4, type: 'grass', color: 0xf1c40f, specialName: 'Wyładowanie', specialKind: 'power' },
  { name: 'Bąbel', emoji: '\u{1F421}', hp: 20, atk: 7, move: 3, range: 4, type: 'water', color: 0x1abc9c, specialName: 'Bańka', specialKind: 'drain' },
  { name: 'Żarek', emoji: '\u{1F31F}', hp: 22, atk: 8, move: 3, range: 3, type: 'fire', color: 0xd35400, specialName: 'Rozbłysk', specialKind: 'power' },
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
