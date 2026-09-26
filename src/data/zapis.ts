import type { StanMapy } from './mapa';
import { misjaPoId } from './kampania';
import { znormalizuj } from './armia';
import { MAPY } from './mapy';
import { aktywnyProfil, czytajKlucz, imieTrenera, kluczProfilu, piszKlucz, usunKlucz, wymusProfil } from './profile';

/**
 * Zapisy gry w przeglądarce — jak ekran zapisu w Heroes 3: kilka slotów
 * na profil gracza (src/data/profile.ts) i autozapis na początku każdego
 * dnia. Dzięki temu planszę da się rozegrać w kilku krótkich sesjach,
 * a Ela, Janek i tata nie nadpisują sobie nawzajem gier.
 *
 * Plik w slocie: `{ v: 2, zapisano, stan }`. Opis na liście (misja, dzień,
 * trener) liczymy ze stanu przy odczycie, więc nie może się rozjechać z tym,
 * co naprawdę jest w zapisie.
 *
 * Garnizon zamku to `garnizon` obiektu zamku (patrz `Obiekt` w mapa.ts);
 * zapisuje się razem ze stanem, a zapis bez tego pola to pusty garnizon.
 *
 * `bryly` to pamięć podręczna (Set), której JSON nie zna i której zapis
 * i tak nie potrzebuje: `brylyNa` w mapa.ts liczy ją od nowa, kiedy jej nie
 * ma. Zapisujemy więc stan bez niej, żeby `JSON.stringify` nie dostał
 * czegoś, czego nie umie zamienić z powrotem w Set.
 */

export const ILE_SLOTOW = 6;

/** Slot 1–6 albo autozapis. */
export type Slot = number | 'auto';

/** Wszystkie sloty w kolejności okna: autozapis na górze, jak w Heroes 3. */
export const SLOTY: Slot[] = ['auto', ...Array.from({ length: ILE_SLOTOW }, (_, i) => i + 1)];

interface PlikZapisu {
  v: 2;
  /** ISO — kiedy zapisano. */
  zapisano: string;
  /** Zapis przeniesiony z gry sprzed profili (jego data to dzień przeniesienia). */
  przeniesiony?: boolean;
  stan: StanMapy;
}

export interface OpisZapisu {
  slot: Slot;
  /** Tytuł misji albo nazwa planszy („Polana — pojedyncza mapa”). */
  nazwa: string;
  misja?: string;
  dzien: number;
  /** „tydzień 2, dzień 3” — jak w Heroes, gdzie doba to dzień tygodnia. */
  kiedyWGrze: string;
  zapisano: Date;
  bohater: string;
  przeniesiony: boolean;
}

const kluczSlotu = (profil: string, slot: Slot) => kluczProfilu(profil, `zapis-${slot}`);

/** Dzień gry słowami: tydzień i dzień tygodnia. */
export function opisDnia(dzien: number): string {
  const d = Math.max(1, dzien);
  return `tydzień ${Math.floor((d - 1) / 7) + 1}, dzień ${((d - 1) % 7) + 1}`;
}

export const nazwaSlotu = (slot: Slot) => (slot === 'auto' ? 'Autozapis' : `Zapis ${slot}`);

function czytajPlik(profil: string, slot: Slot): PlikZapisu | null {
  const s = czytajKlucz(kluczSlotu(profil, slot));
  if (!s) return null;
  try {
    const d = JSON.parse(s) as Partial<PlikZapisu> & Partial<StanMapy>;
    // Surowy stan (stary format, bez koperty) też wczytujemy.
    const plik: PlikZapisu | null =
      d.v === 2 && d.stan ? (d as PlikZapisu) : d.obiekty ? { v: 2, zapisano: '', stan: d as StanMapy } : null;
    if (!plik || !plik.stan?.bohater || !Array.isArray(plik.stan.obiekty)) return null;
    // Bohaterka zwała się kiedyś Ola — zapisy sprzed zmiany czytamy jako Elę.
    plik.stan.bohater.imie = imieTrenera(plik.stan.bohater.imie);
    // Garnizon zamku (`garnizon`) przyszedł z ekranem miasta. Zapis sprzed
    // zmiany nie ma pola — to pusty garnizon; zapisany doprowadzamy do
    // siedmiu slotów, jak armię bohatera.
    for (const o of plik.stan.obiekty) {
      if (o.rodzaj !== 'zamek') continue;
      o.garnizon = Array.isArray(o.garnizon) ? znormalizuj(o.garnizon) : undefined;
    }
    return plik;
  } catch {
    return null;
  }
}

function opisz(slot: Slot, p: PlikZapisu): OpisZapisu {
  const s = p.stan;
  const m = misjaPoId(s.misja);
  const plansza = s.mapa ? MAPY[s.mapa]?.nazwa : undefined;
  const nazwa = m ? `${m.nr}. ${m.tytul}` : `${plansza ?? 'Mapa'} — pojedyncza mapa`;
  const data = new Date(p.zapisano);
  return {
    slot,
    nazwa,
    misja: m?.id,
    dzien: s.dzien,
    kiedyWGrze: opisDnia(s.dzien),
    zapisano: Number.isNaN(data.getTime()) ? new Date(0) : data,
    bohater: s.bohater.imie,
    przeniesiony: !!p.przeniesiony,
  };
}

/** Opisy slotów profilu (domyślnie aktywnego) w kolejności `SLOTY`; `null` — pusty slot. */
export function listaZapisow(profil: string | undefined = aktywnyProfil()?.id): (OpisZapisu | null)[] {
  return SLOTY.map((slot) => {
    const p = profil ? czytajPlik(profil, slot) : null;
    return p ? opisz(slot, p) : null;
  });
}

/** Najświeższy zapis profilu (autozapis albo slot), opcjonalnie tylko spełniający warunek. */
export function najnowszyZapis(warunek: (o: OpisZapisu) => boolean = () => true): OpisZapisu | null {
  return (
    listaZapisow()
      .filter((o): o is OpisZapisu => !!o && warunek(o))
      .sort((a, b) => b.zapisano.getTime() - a.zapisano.getTime())[0] ?? null
  );
}

/** Czy aktywny profil ma jakikolwiek zapis. */
export function jestZapis(): boolean {
  return listaZapisow().some((o) => o !== null);
}

export function zapiszGre(stan: StanMapy, slot: Slot = 'auto'): boolean {
  try {
    const plik: PlikZapisu = { v: 2, zapisano: new Date().toISOString(), stan: { ...stan, bryly: undefined } };
    // Prywatna karta, pełny limit przeglądarki albo localStorage wyłączony —
    // gra ma dalej działać, tylko bez zapisu (`piszKlucz` zwraca wtedy false).
    return piszKlucz(kluczSlotu(wymusProfil().id, slot), JSON.stringify(plik));
  } catch {
    return false;
  }
}

/** Autozapis na początku dnia (i na starcie misji). */
export const autozapis = (stan: StanMapy) => zapiszGre(stan, 'auto');

export function wczytajGre(slot: Slot = 'auto'): StanMapy | null {
  const profil = aktywnyProfil();
  return profil ? (czytajPlik(profil.id, slot)?.stan ?? null) : null;
}

export function usunZapis(slot: Slot): void {
  const profil = aktywnyProfil();
  if (profil) usunKlucz(kluczSlotu(profil.id, slot));
}
