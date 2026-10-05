/**
 * Starter — pierwszy stworek trenera, jak w grach o pokemonach.
 *
 * Nowa gra (misja 1 kampanii, pojedyncza mapa) zaczyna się z pustą drużyną
 * i wyborem jednego z trzech. Resztę drużyny trener buduje w mieście, więc
 * rezerwaty od pierwszego dnia mają sens — przy czwórce na start nie miały.
 *
 * Trzy startery to najniższe stworki trzech krain, po jednym na żywioł:
 * ogień, woda, trawa (trójkąt typów z `units.ts`). Wybór ma zależeć od tego,
 * na kogo trener idzie, a nie od tego, który jest „najlepszy" — dlatego
 * starter ma WŁASNE statystyki, wyrównane symulacją (`tools/probe-startery.ts`):
 * sam na dzikiego o poziom niżej i w parze z młodym z Boru na parę dzikich
 * z misji 1 każdy wygrywa podobnie często. Gatunek z rezerwatu zostaje taki,
 * jak był — balans frakcji się nie rusza.
 */
import { doswDoPoziomu, ewoluujOdPoziomu, nowyStworek, przytnijPoziom } from './stworki';
import { dolacz } from './armia';
import type { Oddzial, StanMapy } from './mapa';

export interface Starter {
  frakcja: string;
  tier: number;
  /** HP i atak na poziomie 5 — zamiast wartości gatunku z `FACTIONS`. */
  hp: number;
  atk: number;
  /** Jedno zdanie do okna wyboru. */
  opis: string;
}

export const STARTERY: readonly Starter[] = [
  { frakcja: 'bor', tier: 0, hp: 46, atk: 17, opis: 'Szybki i gorący. Najmocniej bije stworki trawy.' },
  { frakcja: 'grota', tier: 0, hp: 54, atk: 13, opis: 'Spokojny i wytrzymały. Gasi stworki ognia.' },
  { frakcja: 'zbocze', tier: 0, hp: 46, atk: 12, opis: 'Twardy jak skała. Fale mu niestraszne.' },
];

/** Poziom startera, gdy misja nie mówi inaczej — jak w grach. */
export const POZIOM_STARTERA = 5;

/** Statystyki startera dla stworka, który nim jest (flaga `starter`). */
export function wzorStartera(o: Pick<Oddzial, 'frakcja' | 'tier' | 'starter'>): Starter | undefined {
  if (!o.starter) return undefined;
  return STARTERY.find((s) => s.frakcja === o.frakcja && s.tier === o.tier);
}

/** Stworek-starter na danym poziomie (z ewolucją, jeśli poziom na nią pozwala). */
export function nowyStarter(i: number, poziom = POZIOM_STARTERA): Oddzial | undefined {
  const s = STARTERY[i];
  const o = s && nowyStworek(s.frakcja, s.tier, poziom);
  if (!o) return undefined;
  o.starter = true;
  o.poziom = przytnijPoziom(poziom);
  o.dosw = doswDoPoziomu(o.poziom);
  ewoluujOdPoziomu(o);
  return o;
}

/** Trener wybrał startera: stworek trafia do drużyny, wybór znika ze stanu. */
export function wybierzStartera(s: StanMapy, i: number): Oddzial | undefined {
  if (!s.starter) return undefined;
  const o = nowyStarter(i, s.starter.poziom);
  if (!o) return undefined;
  dolacz(s.bohater.armia, o);
  s.starter = undefined;
  return o;
}
