/**
 * Centrum Pokemon — ratowanie zemdlonych stworków za jagody.
 *
 * Dotąd za darmo: wystarczyło wejść do miasta (albo przeczekać do nowego
 * tygodnia). Zgłoszenie gracza: „żeby w centrum odratować padniętego
 * pokemona, powinno to coś kosztować". Cena rośnie z poziomem — jagoda za
 * każde rozpoczęte trzy poziomy — więc przegrana z silnym przeciwnikiem boli
 * bardziej niż porażka ze słabym, a jagody (z sadów i znajdźek) mają drugie
 * zastosowanie obok budowania.
 *
 * Żeby porażka nie zamykała gry: gdy wszyscy leżą, a jagód nie starcza na
 * nikogo, Centrum stawia na nogi jednego stworka (najtańszego) za darmo.
 */
import type { Oddzial, Skarbiec } from './mapa';

/** Ile jagód kosztuje odratowanie stworka. */
export const kosztRatowania = (o: Pick<Oddzial, 'poziom'>) => Math.max(1, Math.ceil(o.poziom / 3));

/** Zemdleni w drużynie, od najtańszego. */
export function zemdleni(armia: readonly (Oddzial | null | undefined)[]): Oddzial[] {
  return armia
    .filter((o): o is Oddzial => !!o && !!o.omdlaly && o.ile > 0)
    .sort((a, b) => kosztRatowania(a) - kosztRatowania(b));
}

export interface WynikRatowania {
  /** Ilu wstało. */
  odratowani: number;
  /** Ile jagód poszło. */
  jagody: number;
  /** Ilu dalej leży (nie starczyło jagód). */
  zostalo: number;
  /** Jeden wstał za darmo (wszyscy leżeli, a jagód nie było na nikogo). */
  zaDarmo?: boolean;
}

/**
 * Ratuje zemdlonych od najtańszego, dopóki starcza jagód. Odejmuje jagody ze
 * skarbca. Zwraca, co się stało.
 */
export function ratuj(armia: readonly (Oddzial | null | undefined)[], skarbiec: Skarbiec): WynikRatowania {
  const lista = zemdleni(armia);
  let odratowani = 0;
  let jagody = 0;
  for (const o of lista) {
    const k = kosztRatowania(o);
    if (skarbiec.jagoda < k) break;
    skarbiec.jagoda -= k;
    jagody += k;
    delete o.omdlaly;
    odratowani++;
  }
  const naNogach = armia.some((o) => !!o && !o.omdlaly && o.ile > 0);
  if (!odratowani && lista.length && !naNogach) {
    delete lista[0].omdlaly;
    return { odratowani: 1, jagody: 0, zostalo: lista.length - 1, zaDarmo: true };
  }
  return { odratowani, jagody, zostalo: lista.length - odratowani };
}

/** Łączny koszt odratowania wszystkich zemdlonych. */
export const kosztWszystkich = (armia: readonly (Oddzial | null | undefined)[]) =>
  zemdleni(armia).reduce((a, o) => a + kosztRatowania(o), 0);
