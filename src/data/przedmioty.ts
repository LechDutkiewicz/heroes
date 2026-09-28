/**
 * Plecak trenera — przedmioty w bitwie (etap 5 w `PROJEKT-TRENERZY.md`).
 *
 * W Heroes 3 bohater stoi przy polu bitwy i raz na rundę rzuca czar. U nas
 * trener raz na rundę sięga do plecaka:
 *
 * - **Mikstura** leczy swojego stworka o połowę pełnego życia,
 * - **Eliksir siły** daje stworkowi ×1,5 ataku do końca bitwy,
 * - **Pokeball** łapie osłabionego DZIKIEGO stworka — ten dołącza do
 *   drużyny. Zastępuje „neutralni dołączają do armii" z Heroes. Stworków
 *   innego trenera (sala, rywal) łapać nie wolno, jak w pokemonach.
 *
 * Użycie przedmiotu nie zabiera stworkowi tury (jak czar w Heroes).
 * Mikstury i eliksiry są na bitwę — plecak napełnia się sam, bez sklepu;
 * rzut pokeballem kosztuje pokeballe ze skarbca.
 *
 * Wszystko tu jest czystą funkcją stanu bitwy — scena tylko odgrywa.
 */
import { fullHp } from './units';
import { SILA_ELIKSIRU, total, type Battle, type SimUnit } from './battle';

export type Przedmiot = 'mikstura' | 'eliksir' | 'pokeball';

/** Ile czego jest w plecaku na początku każdej bitwy. */
export const PLECAK_NA_BITWE: Record<'mikstura' | 'eliksir', number> = { mikstura: 2, eliksir: 1 };
/** Ile pokeballi ze skarbca kosztuje jeden rzut. */
export const KOSZT_RZUTU = 10;
/** Mikstura leczy tyle pełnego życia. */
export const LECZENIE_MIKSTURY = 0.5;
export { SILA_ELIKSIRU };

export const PRZEDMIOTY: Record<Przedmiot, { nazwa: string; opis: string }> = {
  mikstura: { nazwa: 'Mikstura', opis: 'leczy twojego stworka o połowę życia' },
  eliksir: { nazwa: 'Eliksir siły', opis: 'twój stworek bije mocniej ×1,5 do końca bitwy' },
  pokeball: { nazwa: 'Pokeball', opis: 'łapie osłabionego dzikiego stworka' },
};

/** Czy mikstura coś da — pełnego życia nie ma czego leczyć. */
export const moznaLeczyc = (u: SimUnit) => total(u) < fullHp(u.def);

/** Leczy stworka; zwraca, ile życia wróciło. */
export function uzyjMikstury(u: SimUnit): number {
  const przed = total(u);
  const pelne = fullHp(u.def);
  const po = Math.min(pelne, przed + Math.max(1, Math.round(pelne * LECZENIE_MIKSTURY)));
  // Liczymy stos jak w `applyDamage`: pełni z tyłu, ranny z przodu.
  u.count = Math.ceil(po / u.def.hp);
  u.topHp = po - (u.count - 1) * u.def.hp;
  return po - przed;
}

export const moznaWzmocnic = (u: SimUnit) => !u.eliksir;

export function uzyjEliksiru(u: SimUnit) {
  u.eliksir = true;
}

/**
 * Szansa złapania: im mniej życia, tym łatwiej, a rzadsze stworki (wyższa
 * ranga) bronią się mocniej. Przy pełnym życiu prawie się nie da (5%),
 * przy 1/4 życia zwykły stworek daje się złapać w ~80%.
 */
export function szansaZlapania(u: SimUnit): number {
  const ubytek = 1 - total(u) / fullHp(u.def);
  const ranga = 1.1 - 0.05 * (u.def.tier - 1);
  return Math.min(0.95, Math.max(0.05, ubytek * ranga));
}

/** Zdejmuje złapanego stworka z pola — dla bitwy liczy się jak pokonany. */
export function zlap(b: Battle, u: SimUnit) {
  b.units = b.units.filter((x) => x.id !== u.id);
  b.roundQueue = b.roundQueue.filter((id) => id !== u.id);
}
