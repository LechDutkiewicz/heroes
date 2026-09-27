export type ElementType = 'fire' | 'water' | 'grass';

/**
 * Umiejętności wzorowane na Heroes 3. Ma je tylko część oddziałów — reszta
 * bije zwyczajnie, a strzelcy mają za swoją zdolność sam strzał.
 */
export type Ability = 'double' | 'guardian' | 'strikeAndReturn';

export const ABILITIES: Record<Ability, { emoji: string; name: string; desc: string }> = {
  // Wilczy Jeździec z Heroes 3 — uderza dwa razy w jednym ataku.
  double: {
    emoji: '\u{2694}\u{FE0F}',
    name: 'Podwójny cios',
    desc: 'uderza dwa razy',
  },
  // Gryf — oddaje każdemu napastnikowi, ile razy trzeba w rundzie.
  guardian: {
    emoji: '\u{1F6E1}\u{FE0F}',
    name: 'Nieograniczony odwet',
    desc: 'oddaje każdemu, bez limitu',
  },
  // Harpia — po ciosie wraca na swoje pole, więc odwet jej nie dosięga.
  strikeAndReturn: {
    emoji: '\u{1F4A8}',
    name: 'Uderz i wróć',
    desc: 'wraca na swoje pole, odwet go nie dosięga',
  },
};

export interface UnitDef {
  /** poziom oddziału w zamku, 1-6 — im wyżej, tym mocniejsze stworki */
  tier: number;
  /** nazwa pliku w public/sprites bez rozszerzenia */
  sprite: string;
  name: string;
  /**
   * Ile stworków stoi na jednym polu. Od przebudowy „trener zamiast armii"
   * zawsze 1 — stworek to postać, nie stos (`stworki.ts`). Silnik bitwy
   * dalej umie liczyć stosy, więc pole zostaje.
   */
  count: number;
  /** HP stworka — w `FACTIONS` na poziomie 5, w bitwie już przeskalowane */
  hp: number;
  /** atak stworka — jak HP */
  atk: number;
  move: number;
  /** strzelec trafia na dowolny dystans, ale dalej niż shootRange za pół siły */
  shooter: boolean;
  shootRange: number;
  type: ElementType;
  /** lata nad przeszkodami i nad innymi oddziałami */
  flying?: boolean;
  ability?: Ability;
  /** poziom stworka (1–50), gdy definicja pochodzi z `defStworka` */
  poziom?: number;
}

// Odmiana przez przypadki, bo teksty w panelu wymagają różnych form:
// „mocny przeciw Ogniowi", ale „słaby wobec Ognia".
export const TYPE_INFO: Record<
  ElementType,
  { emoji: string; label: string; dative: string; genitive: string; color: number }
> = {
  fire: { emoji: '\u{1F525}', label: 'Ogień', dative: 'Ogniowi', genitive: 'Ognia', color: 0xff7043 },
  water: { emoji: '\u{1F4A7}', label: 'Woda', dative: 'Wodzie', genitive: 'Wody', color: 0x42a5f5 },
  grass: { emoji: '\u{1F33F}', label: 'Trawa', dative: 'Trawie', genitive: 'Trawy', color: 0x66bb6a },
};

/** Kara za zwarcie i za zbyt daleki strzał (złamana strzała). */
export const HALF_DAMAGE = 0.5;

/**
 * Kto komu zagraża. Krąg jest zamknięty, więc typ, którego dany oddział nie
 * lubi, to ten jeden jedyny, a typ, który sam bije mocniej, jest zarazem tym,
 * którego ciosy najlepiej wytrzymuje.
 */
export function typeMatchup(type: ElementType): { strong: ElementType; weak: ElementType } {
  const strong: Record<ElementType, ElementType> = { fire: 'grass', grass: 'water', water: 'fire' };
  const weak: Record<ElementType, ElementType> = { fire: 'water', grass: 'fire', water: 'grass' };
  return { strong: strong[type], weak: weak[type] };
}

/**
 * Siła przewagi żywiołu. Było 1.5 / 0.67, czyli 2,24-krotny rozstrzał między
 * atakiem z przewagą a atakiem pod prąd — tyle, że o wyniku bitwy decydował
 * wyłącznie układ żywiołów, a starcia frakcji rozstrzygały się w 90-98%.
 * Symulator to pokazał (`npm run balans`). Węższy rozstrzał zostawia
 * przewagę typu odczuwalną, ale nie przesądzającą.
 */
export const TYPE_STRONG = 1.25;
export const TYPE_WEAK = 0.85;

/** Ogień bije trawę, trawa bije wodę, woda bije ogień. */
export function typeMultiplier(attacker: ElementType, defender: ElementType): number {
  if (attacker === defender) return 1;
  const strong =
    (attacker === 'fire' && defender === 'grass') ||
    (attacker === 'grass' && defender === 'water') ||
    (attacker === 'water' && defender === 'fire');
  return strong ? TYPE_STRONG : TYPE_WEAK;
}

/**
 * Stan oddziału: ilu stworków zostało i ile HP ma ten, który akurat obrywa.
 * Reszta stoi z pełnym życiem, więc całość liczymy jako (count-1) × hp + topHp.
 */
export interface StackState {
  count: number;
  topHp: number;
}

export const totalHp = (def: UnitDef, s: StackState) => (s.count - 1) * def.hp + s.topHp;

export const fullHp = (def: UnitDef) => def.count * def.hp;

/** Obrażenia całego oddziału — im więcej stworków, tym mocniej bije. */
export const stackAtk = (def: UnitDef, s: StackState) => s.count * def.atk;

/**
 * Rozdziela obrażenia na oddział: najpierw dobija stworka z przodu, potem
 * kolejnych. Zwraca nowy stan i ilu padło; count 0 znaczy, że oddział zginął.
 */
export function applyDamage(def: UnitDef, s: StackState, damage: number): { state: StackState; killed: number } {
  const left = totalHp(def, s) - damage;
  if (left <= 0) return { state: { count: 0, topHp: 0 }, killed: s.count };
  const count = Math.ceil(left / def.hp);
  return { state: { count, topHp: left - (count - 1) * def.hp }, killed: s.count - count };
}
