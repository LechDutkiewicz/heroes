/**
 * Ataki stworków (etap 4 w `PROJEKT-TRENERZY.md`).
 *
 * W pokemonach stworek nie „bije" — trener wybiera jeden z jego ataków.
 * U nas każdy stworek ma dwa ataki, trzeci dochodzi po pierwszej ewolucji:
 *
 * 1. Zwykły — bez limitu, siła 1. To dawny cios albo strzał, więc bitwa bez
 *    wybierania ataków gra się tak samo jak dotąd.
 * 2. Specjalny — mocniejszy, ale ma PUNKTY MOCY (PP), jak amunicja strzelca
 *    w Heroes. Stworki z umiejętnością z Heroes (podwójny cios, uderz
 *    i wróć) mają ją właśnie tutaj — to już nie jest stała cecha, tylko ruch,
 *    który trzeba wybrać i który się kończy.
 * 3. Ostateczny (od etapu 2 ewolucji) — najmocniejszy, raz na bitwę, i tak
 *    potężny, że cel nie oddaje.
 *
 * Zasięg ataku zawsze idzie za stworkiem: strzelec strzela wszystkimi, reszta
 * bije wręcz — trasy dojścia, zablokowanie i złamana strzała działają bez
 * zmian. PP odnawiają się co bitwę (dzieci nie mają pilnować PP w Centrum).
 *
 * „Nieograniczony odwet" zostaje cechą, nie atakiem: to nie jest coś, co się
 * wybiera, tylko to, jak stworek się broni.
 */

import type { ElementType, UnitDef } from './units';

export type EfektAtaku = 'podwojny' | 'uderzIWroc' | 'bezOdwetu';

export interface Atak {
  nazwa: string;
  /** mnożnik ataku stworka */
  moc: number;
  /** ile razy na bitwę; null — bez limitu */
  pp: number | null;
  efekt?: EfektAtaku;
  /** krótki opis do karty i paska ataków */
  opis: string;
}

/** Moc i PP ataków — jedno miejsce do strojenia (`npm run balans`). */
export const MOC_SPECJALNEGO = 1.5;
export const PP_SPECJALNEGO = 2;
export const PP_UMIEJETNOSCI = 3;
export const MOC_OSTATECZNEGO = 2;
export const PP_OSTATECZNEGO = 1;

const NAZWY: Record<ElementType, { wrecz: [string, string, string]; dystans: [string, string, string] }> = {
  fire: { wrecz: ['Ognisty pazur', 'Płomienny skok', 'Wielki ogień'], dystans: ['Iskry', 'Kula ognia', 'Ognisty wir'] },
  water: { wrecz: ['Wodny cios', 'Fala', 'Ogromna fala'], dystans: ['Strumień', 'Wodny pocisk', 'Wodna pompa'] },
  grass: { wrecz: ['Pnącze', 'Bicz z pnączy', 'Burza liści'], dystans: ['Ostre liście', 'Nasienna bomba', 'Promień słońca'] },
};

/** Etap ewolucji, od którego stworek zna trzeci atak (0 = pierwsza forma). */
export const ETAP_TRZECIEGO = 1;

/** Ataki stworka w kolejności przycisków: zwykły, specjalny, (ostateczny). */
export function atakiStworka(def: Pick<UnitDef, 'type' | 'shooter' | 'ability' | 'etap'>): Atak[] {
  const n = NAZWY[def.type][def.shooter ? 'dystans' : 'wrecz'];
  const ataki: Atak[] = [{ nazwa: n[0], moc: 1, pp: null, opis: def.shooter ? 'strzał bez limitu' : 'cios bez limitu' }];
  if (def.ability === 'double') {
    ataki.push({ nazwa: 'Podwójny cios', moc: 1, pp: PP_UMIEJETNOSCI, efekt: 'podwojny', opis: 'uderza dwa razy' });
  } else if (def.ability === 'strikeAndReturn') {
    ataki.push({
      nazwa: 'Uderz i wróć',
      moc: 1,
      pp: PP_UMIEJETNOSCI,
      efekt: 'uderzIWroc',
      opis: 'wraca na swoje pole, odwet go nie dosięga',
    });
  } else {
    ataki.push({ nazwa: n[1], moc: MOC_SPECJALNEGO, pp: PP_SPECJALNEGO, opis: `siła ×${MOC_SPECJALNEGO}` });
  }
  if ((def.etap ?? 0) >= ETAP_TRZECIEGO) {
    ataki.push({
      nazwa: n[2],
      moc: MOC_OSTATECZNEGO,
      pp: PP_OSTATECZNEGO,
      efekt: 'bezOdwetu',
      opis: `siła ×${MOC_OSTATECZNEGO}, cel nie oddaje`,
    });
  }
  return ataki;
}

/** Nazwa trzeciego ataku, zanim stworek go pozna — do zablokowanego przycisku. */
export function nazwaTrzeciego(def: Pick<UnitDef, 'type' | 'shooter'>): string {
  return NAZWY[def.type][def.shooter ? 'dystans' : 'wrecz'][2];
}

/**
 * Ataki jednym zdaniem — do okna stworka poza bitwą: „Pnącze · Bicz
 * z pnączy (2 na bitwę) · po ewolucji: Burza liści".
 */
export function opisAtakow(def: Pick<UnitDef, 'type' | 'shooter' | 'ability' | 'etap'>): string {
  const ataki = atakiStworka(def);
  const czesci = ataki.map((a) => (a.pp === null ? a.nazwa : `${a.nazwa} (${a.pp} na bitwę)`));
  if (ataki.length < 3) czesci.push(`po ewolucji: ${nazwaTrzeciego(def)}`);
  return czesci.join(' · ');
}
