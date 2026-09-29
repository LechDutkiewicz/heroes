/**
 * Plecak trenera — przedmioty w bitwie (etap 5 w `PROJEKT-TRENERZY.md`).
 *
 * W Heroes 3 bohater stoi przy polu bitwy i raz na rundę rzuca czar. U nas
 * trener raz na rundę sięga do plecaka:
 *
 * - **Mikstura** leczy swojego stworka o połowę pełnego życia,
 * - **Super mikstura** leczy go do pełna,
 * - **Eliksir siły** daje stworkowi ×1,5 ataku do końca bitwy,
 * - **Tarcza** osłabia ciosy w stworka do końca bitwy,
 * - **Pokeball** łapie osłabionego DZIKIEGO stworka — ten dołącza do
 *   drużyny. Zastępuje „neutralni dołączają do armii" z Heroes. Stworków
 *   innego trenera (sala, rywal) łapać nie wolno, jak w pokemonach.
 *
 * Użycie przedmiotu nie zabiera stworkowi tury (jak czar w Heroes).
 * Plecak to ZAPAS trenera, a nie przydział na bitwę: co zużyte, znika,
 * a nowe kupuje się w Pokémarcie w mieście (sklep zamiast gildii magów —
 * im wyższy stopień budynku, tym lepszy towar, jak czary w Heroes 3). Na
 * start trener ma jedną miksturę. Rzut pokeballem kosztuje pokeballe ze
 * skarbca, jak dotąd.
 *
 * Wszystko tu jest czystą funkcją stanu bitwy — scena tylko odgrywa.
 */
import { fullHp } from './units';
import { SILA_ELIKSIRU, SILA_TARCZY, total, type Battle, type SimUnit } from './battle';
import type { Skarbiec } from './mapa';

export type Przedmiot = 'mikstura' | 'superMikstura' | 'eliksir' | 'tarcza' | 'pokeball';
/** To, co leży w plecaku (pokeballe są w skarbcu). */
export type PrzedmiotPlecaka = Exclude<Przedmiot, 'pokeball'>;
export type Plecak = Record<PrzedmiotPlecaka, number>;

/** Kolejność w plecaku i w sklepie. */
export const PRZEDMIOTY_PLECAKA: readonly PrzedmiotPlecaka[] = ['mikstura', 'superMikstura', 'eliksir', 'tarcza'];

/** Z czym trener rusza w drogę na nowej mapie. */
export const PLECAK_STARTOWY: Plecak = { mikstura: 1, superMikstura: 0, eliksir: 0, tarcza: 0 };
/** Plecak bitwy pokazowej (bez mapy): wszystkiego po trochu, do wypróbowania. */
export const PLECAK_NA_BITWE: Plecak = { mikstura: 2, superMikstura: 1, eliksir: 1, tarcza: 1 };
/** Najwięcej sztuk jednego przedmiotu — plecak ma dno, jak w grach. */
export const MAKS_W_PLECAKU = 5;

/** Plecak z brakującymi polami uzupełnionymi zerami. */
export function pelnyPlecak(p?: Partial<Plecak>): Plecak {
  const w: Plecak = { mikstura: 0, superMikstura: 0, eliksir: 0, tarcza: 0 };
  for (const k of PRZEDMIOTY_PLECAKA) w[k] = Math.max(0, Math.floor(p?.[k] ?? 0));
  return w;
}

/**
 * Plecak bohatera — tworzony przy pierwszym dotknięciu. Zapis sprzed sklepu
 * nie ma plecaka: trener dostaje wtedy to, co wcześniej miał na każdą bitwę
 * (dwie mikstury i eliksir), żeby nikt nie stracił przedmiotów na aktualizacji.
 */
export function plecakBohatera(b: { plecak?: Partial<Plecak> }): Plecak {
  const p = pelnyPlecak(b.plecak ?? { mikstura: 2, eliksir: 1 });
  b.plecak = p;
  return p;
}

/**
 * Towar Pokémartu: od którego stopnia sklepu jest i ile kosztuje. Ceny
 * w pokeballach i jagodach (z jagód robi się mikstury) — mikstura kosztuje
 * mniej niż dzień dochodu laboratorium, tarcza tyle co mały rezerwat.
 */
export const SKLEP: Record<PrzedmiotPlecaka, { poziom: 1 | 2 | 3; cena: Partial<Skarbiec> }> = {
  mikstura: { poziom: 1, cena: { pokeball: 6, jagoda: 1 } },
  superMikstura: { poziom: 2, cena: { pokeball: 14, jagoda: 2 } },
  eliksir: { poziom: 2, cena: { pokeball: 16 } },
  tarcza: { poziom: 3, cena: { pokeball: 20, odlamek: 1 } },
};

/** Ile pokeballi ze skarbca kosztuje jeden rzut. */
export const KOSZT_RZUTU = 10;
/** Mikstura leczy tyle pełnego życia (Super mikstura — całe). */
export const LECZENIE_MIKSTURY = 0.5;
export const LECZENIE_SUPER_MIKSTURY = 1;
export { SILA_ELIKSIRU, SILA_TARCZY };

export const PRZEDMIOTY: Record<Przedmiot, { nazwa: string; opis: string; tekstura: string }> = {
  mikstura: { nazwa: 'Mikstura', opis: 'leczy twojego stworka o połowę życia', tekstura: 'przedmiot-mikstura' },
  superMikstura: {
    nazwa: 'Super mikstura',
    opis: 'leczy twojego stworka do pełna',
    tekstura: 'przedmiot-super-mikstura',
  },
  // Opisy dla ośmiolatka: słowami, bez „×1,5" i „1/3" (krytyk sklepu).
  eliksir: { nazwa: 'Eliksir siły', opis: 'stworek bije dużo mocniej do końca bitwy', tekstura: 'przedmiot-eliksir' },
  tarcza: { nazwa: 'Tarcza', opis: 'ciosy mniej bolą do końca bitwy', tekstura: 'przedmiot-tarcza' },
  pokeball: { nazwa: 'Pokeball', opis: 'łapie osłabionego dzikiego stworka', tekstura: 'przedmiot-pokeball' },
};

/** Czy mikstura coś da — pełnego życia nie ma czego leczyć. */
export const moznaLeczyc = (u: SimUnit) => total(u) < fullHp(u.def);

/** Leczy stworka (`ulamek` pełnego życia); zwraca, ile życia wróciło. */
export function uzyjMikstury(u: SimUnit, ulamek = LECZENIE_MIKSTURY): number {
  const przed = total(u);
  const pelne = fullHp(u.def);
  const po = Math.min(pelne, przed + Math.max(1, Math.round(pelne * ulamek)));
  // Liczymy stos jak w `applyDamage`: pełni z tyłu, ranny z przodu.
  u.count = Math.ceil(po / u.def.hp);
  u.topHp = po - (u.count - 1) * u.def.hp;
  return po - przed;
}

export const moznaWzmocnic = (u: SimUnit) => !u.eliksir;

export function uzyjEliksiru(u: SimUnit) {
  u.eliksir = true;
}

export const moznaOslonic = (u: SimUnit) => !u.tarcza;

export function uzyjTarczy(u: SimUnit) {
  u.tarcza = true;
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
