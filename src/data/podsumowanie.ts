/**
 * Rozliczenie drużyny gracza po walce — jedno miejsce dla mapy i dla ekranu
 * podsumowania walki (jak w Heroes 3: kto padł, ile doświadczenia, kto
 * awansował; „Przyjmij" albo „Jeszcze raz").
 *
 * Mapa przygody wywołuje to na prawdziwej drużynie (`rozliczBitwe`), a scena
 * walki na KOPII drużyny, żeby pokazać wynik, zanim gracz go przyjmie. Ta
 * sama funkcja w obu miejscach — podsumowanie nie może obiecać czegoś innego,
 * niż potem stanie się na mapie.
 */
import { SLOTY_ARMII } from './armia';
import type { Oddzial } from './mapa';
import { dodajDosw, doswZaPokonanego } from './stworki';

/** To, co bitwa oddaje o drużynie gracza (część `wynik-bitwy`). */
export interface WynikDruzyny {
  wygrana: boolean;
  /** Każdy stworek, który stanął na polu: numer slotu i 1/0 — stoi / zemdlał. */
  armia?: Array<{ slot?: number; ile: number }>;
  /** Pokonani przeciwnicy — z nich liczy się doświadczenie drużyny. */
  pokonani?: Array<{ poziom: number; tier: number }>;
}

export interface WierszDruzyny {
  slot: number;
  /** Nazwa i rysunek sprzed walki (przed ewentualną ewolucją). */
  nazwa: string;
  sprite: string;
  poziomPrzed: number;
  poziom: number;
  /** Zdobyte doświadczenie (0 przy porażce i u zemdlonych). */
  dosw: number;
  ewolucja?: { z: string; na: string };
  /** Zemdlał w tej walce. */
  zemdlal: boolean;
  /** Zemdlał, ale Uzdrowiciel postawił go na nogi. */
  uzdrowiony?: boolean;
}

/** Doświadczenie bohatera za wygraną walkę (bez premii z umiejętności). */
export const DOSW_BOHATERA_ZA_WALKE = 80;

/**
 * Zaznacza, kto zemdlał, rozdaje doświadczenie (tylko przy wygranej) i —
 * z umiejętnością Uzdrowiciel (`leczenie`, ułamek) — stawia część zemdlonych
 * na nogi. Zmienia `armia` w miejscu; zwraca wiersze do pokazania.
 *
 * Doświadczenie jak dotąd (`rozdajDosw`): każdy, kto walczył i nie zemdlał,
 * dostaje pełną pulę za wszystkich pokonanych.
 */
export function rozliczDruzyne(
  armia: (Oddzial | null | undefined)[],
  wynik: WynikDruzyny,
  leczenie = 0
): WierszDruzyny[] {
  const stoi = new Map<number, boolean>();
  for (const od of wynik.armia ?? []) {
    const slot = typeof od.slot === 'number' ? od.slot : -1;
    if (slot < 0 || slot >= SLOTY_ARMII || !armia[slot]) continue;
    stoi.set(slot, od.ile > 0);
  }
  const wiersze: WierszDruzyny[] = [];
  for (const [slot, naNogach] of [...stoi].sort((a, b) => a[0] - b[0])) {
    const o = armia[slot]!;
    wiersze.push({
      slot,
      nazwa: o.nazwa,
      sprite: o.sprite,
      poziomPrzed: o.poziom,
      poziom: o.poziom,
      dosw: 0,
      zemdlal: !naNogach,
    });
    if (!naNogach) o.omdlaly = true;
  }
  if (!wynik.wygrana) return wiersze;
  for (const w of wiersze) {
    const o = armia[w.slot]!;
    if (w.zemdlal || o.omdlaly || o.ile <= 0) continue;
    const ile = (wynik.pokonani ?? []).reduce((a, p) => a + doswZaPokonanego(p, o.poziom), 0);
    const r = dodajDosw(o, ile);
    w.dosw = Math.max(0, Math.round(ile));
    w.poziom = o.poziom;
    w.ewolucja = r.ewolucja;
  }
  // Uzdrowiciel: zaokrąglenie w górę — przy jednym zemdlonym nawet pierwszy
  // stopień umiejętności coś daje. Wstają bez doświadczenia za tę walkę.
  if (leczenie > 0) {
    const padli = wiersze.filter((w) => w.zemdlal);
    for (const w of padli.slice(0, Math.ceil(padli.length * leczenie))) {
      delete armia[w.slot]!.omdlaly;
      w.uzdrowiony = true;
    }
  }
  return wiersze;
}

/** Awanse i ewolucje z wierszy — w starym kształcie napisu na mapie. */
export function awanseZWierszy(wiersze: readonly WierszDruzyny[], armia: readonly (Oddzial | null | undefined)[]) {
  return wiersze
    .filter((w) => w.poziom > w.poziomPrzed || w.ewolucja)
    .map((w) => ({
      nazwa: armia[w.slot]?.nazwa ?? w.nazwa,
      poziom: w.poziom,
      o: w.poziom - w.poziomPrzed,
      ewolucja: w.ewolucja,
    }));
}
