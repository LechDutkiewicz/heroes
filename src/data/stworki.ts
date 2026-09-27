import type { UnitDef } from './units';
import { factionById } from './factions';
import { etapStworka } from './ewolucje';
import type { Oddzial } from './mapa';
import { NA_POLU, createBattle, runBattle, type Battle, type Outcome } from './battle';

/**
 * Stworek jako POSTAĆ, nie jako stos — wszystko, co z tego wynika dla liczb.
 *
 * Skąd zmiana: „nikt nie ma stu Pikachu" (uwagi z rozgrywki, patrz
 * `PROJEKT-TRENERZY.md`). Slot armii to od teraz jeden stworek z poziomem
 * i doświadczeniem. Rośnie, bo walczy i trenuje, a nie dlatego, że dokupiło
 * się mu kolegów.
 *
 * Silnik bitwy (`battle.ts`) zostaje bez zmian: stworek to po prostu oddział
 * o liczebności 1, a jego HP i atak liczą się tutaj z gatunku, poziomu i etapu
 * ewolucji. Jedna reguła, jedno miejsce — bitwa, AI, symulator i miasto pytają
 * o statystyki `defStworka` i nikt nie trzyma własnej kopii wzoru.
 *
 * Dzikie stworki na mapie (straże) i załogi zamków to STADA: `Oddzial`
 * z `ile` > 1 znaczy „tylu osobnych stworków tego gatunku na tym poziomie".
 * W bitwie każdy stoi osobno. W armii bohatera `ile` jest zawsze 1.
 */

export const POZIOM_MIN = 1;
export const POZIOM_MAX = 50;

/** Poziom młodego stworka z rezerwatu i ze startowej drużyny. */
export const POZIOM_MLODEGO = 5;

/**
 * Mnożnik statystyk za poziom. Statystyki gatunku (`FACTIONS`) są podane dla
 * poziomu 5; poziom 20 to dwa razy tyle, 50 — cztery razy. Wzrost liniowy
 * jak w grach o pokemonach: każdy poziom daje tyle samo, więc różnica 5
 * poziomów jest czytelna niezależnie od tego, czy to 5 → 10, czy 40 → 45.
 */
export const skalaPoziomu = (poziom: number) => (poziom + 10) / 15;

/** Etap ewolucji (0 — forma bazowa) podnosi HP i atak o 20% na etap. */
export const SKALA_ETAPU = [1, 1.2, 1.44] as const;

export const przytnijPoziom = (p: number) =>
  Math.max(POZIOM_MIN, Math.min(POZIOM_MAX, Math.round(p)));

/**
 * Doświadczenie potrzebne, żeby z poziomu `p` wejść na `p + 1`: 10 × p.
 * Łącznie do poziomu `p` trzeba więc 5·p·(p−1): poziom 5 to 100, 10 — 450,
 * 16 — 1200, 20 — 1900, 32 — 4960.
 */
export const doswNaPoziom = (p: number) => 10 * p;
export const doswDoPoziomu = (p: number) => 5 * p * (p - 1);

/** Poziom wynikający z sumy doświadczenia. */
export function poziomZDosw(dosw: number): number {
  let p = POZIOM_MIN;
  while (p < POZIOM_MAX && dosw >= doswDoPoziomu(p + 1)) p++;
  return p;
}

/** Doświadczenie stworka — gdy brak pola, liczymy je z poziomu (początek poziomu). */
export const doswStworka = (o: Pick<Oddzial, 'poziom' | 'dosw'>) =>
  o.dosw ?? doswDoPoziomu(o.poziom);

/** Ile zebrano w bieżącym poziomie i ile trzeba na następny — do paska EXP. */
export function postepStworka(o: Pick<Oddzial, 'poziom' | 'dosw'>) {
  const d = doswStworka(o);
  if (o.poziom >= POZIOM_MAX) return { wPoziomie: 0, doNastepnego: 0 };
  return { wPoziomie: Math.max(0, d - doswDoPoziomu(o.poziom)), doNastepnego: doswNaPoziom(o.poziom) };
}

/**
 * Pełna definicja stworka do bitwy: gatunek z frakcji, przeskalowany
 * poziomem i etapem ewolucji. Liczebność zawsze 1 — stado rozwija
 * `jednostkiBitwy`.
 */
export function defStworka(o: Pick<Oddzial, 'frakcja' | 'tier' | 'sprite' | 'nazwa' | 'poziom'>): UnitDef | undefined {
  const baza = factionById(o.frakcja)?.units[o.tier];
  if (!baza) return undefined;
  const etap = Math.max(0, etapStworka(o.sprite));
  const s = skalaPoziomu(o.poziom) * SKALA_ETAPU[etap];
  return {
    ...baza,
    sprite: o.sprite,
    name: o.nazwa,
    count: 1,
    hp: Math.max(1, Math.round(baza.hp * s)),
    atk: Math.max(1, Math.round(baza.atk * s)),
    poziom: o.poziom,
  };
}

/** Najwięcej stworków po jednej stronie pola bitwy (`NA_POLU` w `battle.ts`). */
export const MAKS_W_BITWIE = NA_POLU;

/**
 * Oddziały z mapy → jednostki bitwy. Stado rozpada się na osobne stworki,
 * zemdlone zostają poza polem, a do walki idą pierwsi `MAKS_W_BITWIE` —
 * w drużynie trenera to cztery pierwsze sprawne sloty, więc skład na bitwę
 * wybiera się kolejnością w drużynie. Wynik ma przy każdej jednostce indeks wpisu,
 * z którego pochodzi — po bitwie trzeba wiedzieć, KTÓRY stworek zemdlał.
 */
export function jednostkiBitwy(oddzialy: readonly (Oddzial | null | undefined)[]): { def: UnitDef; skad: number }[] {
  const wynik: { def: UnitDef; skad: number }[] = [];
  oddzialy.forEach((o, skad) => {
    if (!o || o.omdlaly || o.ile <= 0) return;
    const def = defStworka(o);
    if (!def) return;
    for (let i = 0; i < o.ile && wynik.length < MAKS_W_BITWIE; i++) wynik.push({ def, skad });
  });
  return wynik;
}

/**
 * Najsilniejsi na przód drużyny — do walki idą pierwsze sprawne sloty.
 * Tak układa drużynę AI (i autopilot w symulacjach); gracz układa sam.
 */
export function najsilniejsiNaPrzod(armia: (Oddzial | null)[]) {
  const sila = (o: Oddzial) => {
    const d = defStworka(o);
    return d ? d.hp * d.atk * (d.ability === 'double' ? 2 : 1) : 0;
  };
  const stworki = armia.filter((o): o is Oddzial => !!o).sort((a, b) => sila(b) - sila(a));
  for (let i = 0; i < armia.length; i++) armia[i] = stworki[i] ?? null;
}

/**
 * Siła „na papierze" — do porównań (AI, podpowiedzi, balans). Walka dwóch
 * grup to iloczyn sumy życia i sumy ataku (prawo Lanchestera), więc siłą
 * grupy jest pierwiastek z tego iloczynu.
 */
export function silaGrupy(oddzialy: readonly (Oddzial | null | undefined)[]): number {
  let hp = 0;
  let atk = 0;
  for (const { def } of jednostkiBitwy(oddzialy)) {
    hp += def.hp;
    atk += def.atk * (def.ability === 'double' ? 2 : 1);
  }
  return Math.sqrt(hp * atk);
}

/**
 * Liczebność typowego stosu w dawnym modelu, dla poziomów 1–6. Plansze,
 * garnizony i nagrody kampanii były strojone w liczebnościach („20 Pyroko",
 * „4 stworki czwartego poziomu"). Zamiast przepisywać każdą z tych liczb
 * ręcznie, przeliczamy je tą samą regułą: taki stos to jeden stworek na
 * poziomie 5, a większy stos — więcej stworków albo wyższy poziom.
 */
export const STARY_STOS = [20, 14, 10, 7, 5, 3] as const;

/**
 * Dawna liczebność → stado (ilu stworków i na jakim poziomie).
 *
 * Rachunek: `r` = ile typowych stosów. Siła stada rośnie z liczbą stworków
 * i ze skalą poziomu, więc szukamy `n · skalaPoziomu(p) ≈ r`. Najpierw
 * „naturalny" poziom dla takiej siły (rośnie powoli, logarytmicznie), z niego
 * liczba stworków, a na końcu dokładny poziom dla tej liczby. Dzięki temu
 * słabe stado to jeden stworek z niskim poziomem, a potężne — kilka
 * stworków na dwudziestym, a nie jeden na pięćdziesiątym.
 */
export function stadoZLiczebnosci(tier: number, ile: number, maks = MAKS_W_BITWIE): { ile: number; poziom: number } {
  const r = Math.max(0.05, ile / (STARY_STOS[tier] ?? 10));
  const naturalny = POZIOM_MLODEGO + 6 * Math.log(1 + r);
  const n = Math.max(1, Math.min(maks, Math.round(r / skalaPoziomu(naturalny))));
  return { ile: n, poziom: przytnijPoziom(15 * (r / n) - 10) };
}

/** Nowy stworek gatunku `tier` frakcji `frakcja` na zadanym poziomie. */
export function nowyStworek(frakcja: string, tier: number, poziom = POZIOM_MLODEGO): Oddzial | undefined {
  const u = factionById(frakcja)?.units[tier];
  if (!u) return undefined;
  const p = przytnijPoziom(poziom);
  return { sprite: u.sprite, nazwa: u.name, ile: 1, frakcja, tier, poziom: p, dosw: doswDoPoziomu(p) };
}

/**
 * Stado jako lista osobnych stworków — do armii i załóg, w których każdy
 * slot to jeden stworek.
 */
export function rozbijStado(o: Oddzial): Oddzial[] {
  return Array.from({ length: Math.max(0, o.ile) }, () => ({
    ...o,
    ile: 1,
    dosw: o.dosw ?? doswDoPoziomu(o.poziom),
  }));
}

/**
 * Doświadczenie za pokonanie jednego stworka: 4 × jego poziom, więcej za
 * rzadszy gatunek. Kto pokonał silniejszego od siebie, uczy się szybciej —
 * mnożnik to stosunek poziomów, przycięty do 0,5–2. Tak słabszy stworek
 * w drużynie dogania resztę, a silny nie farmi drobnicy.
 */
export function doswZaPokonanego(pokonany: { poziom: number; tier: number }, poziomUcznia: number) {
  const baza = 4 * pokonany.poziom * (1 + 0.2 * pokonany.tier);
  const mn = Math.max(0.5, Math.min(2, pokonany.poziom / Math.max(1, poziomUcznia)));
  return Math.round(baza * mn);
}

/**
 * Dolicza doświadczenie stworkowi i podnosi mu poziom. Zwraca, o ile
 * poziomów urósł — scena mówi o awansie, a nie o liczbie punktów.
 */
export function dodajDosw(o: Oddzial, ile: number): number {
  const przed = o.poziom;
  o.dosw = doswStworka(o) + Math.max(0, Math.round(ile));
  o.poziom = Math.max(o.poziom, poziomZDosw(o.dosw));
  return o.poziom - przed;
}

/**
 * Doświadczenie po wygranej bitwie: każdy stworek, który walczył i nie
 * zemdlał, dostaje pełną pulę za wszystkich pokonanych (jak Exp. Share
 * w nowszych grach — dziecko nie musi pilnować, kto dobił przeciwnika).
 * Zwraca awanse do pokazania.
 */
export function rozdajDosw(
  armia: readonly (Oddzial | null)[],
  pokonani: readonly { poziom: number; tier: number }[]
): { nazwa: string; poziom: number; o: number }[] {
  const awanse: { nazwa: string; poziom: number; o: number }[] = [];
  for (const s of armia) {
    if (!s || s.omdlaly || s.ile <= 0) continue;
    const ile = pokonani.reduce((a, p) => a + doswZaPokonanego(p, s.poziom), 0);
    const o = dodajDosw(s, ile);
    if (o > 0) awanse.push({ nazwa: s.nazwa, poziom: s.poziom, o });
  }
  return awanse;
}

/** Czy w drużynie jest ktokolwiek zdolny do walki. */
export const ktosNaNogach = (armia: readonly (Oddzial | null | undefined)[]) =>
  armia.some((o) => !!o && !o.omdlaly && o.ile > 0);

/** Budzi zemdlone stworki (Centrum Pokemon, nowy tydzień). Zwraca, ile obudziło. */
export function obudz(armia: readonly (Oddzial | null | undefined)[]): number {
  let ile = 0;
  for (const o of armia) {
    if (o?.omdlaly) {
      delete o.omdlaly;
      ile++;
    }
  }
  return ile;
}

/** „poz. 12" — jeden zapis poziomu w całym interfejsie. */
export const napisPoziomu = (poziom: number) => `poz. ${poziom}`;

/**
 * Cała bitwa rozegrana bez sceny — dla AI i symulatorów. Zwraca wynik oraz,
 * dla KAŻDEGO wpisu wejściowych list, ilu jego stworków stoi na nogach po
 * bitwie (stado mogło stracić część). Kolejność jednostek w `createBattle`
 * to kolejność z `jednostkiBitwy`, a identyfikatory rosną od 1 po lewej
 * stronie i dalej po prawej — z tego odtwarzamy, kto przetrwał.
 */
export function rozegrajBitwe(
  atak: readonly (Oddzial | null | undefined)[],
  obrona: readonly (Oddzial | null | undefined)[],
  rng: () => number,
  bonusGracza?: Battle['bonusGracza']
): {
  outcome: Outcome;
  ocalaliAtak: number[];
  ocalaliObrona: number[];
  pokonaniAtak: { poziom: number; tier: number }[];
  pokonaniObrona: { poziom: number; tier: number }[];
} {
  const lewa = jednostkiBitwy(atak);
  const prawa = jednostkiBitwy(obrona);
  const bitwa = createBattle({ units: lewa.map((j) => j.def) }, { units: prawa.map((j) => j.def) }, [], rng);
  bitwa.bonusGracza = bonusGracza;
  const { outcome } = runBattle(bitwa);
  const zywi = new Set(bitwa.units.filter((u) => u.count > 0).map((u) => u.id));
  const policz = (lista: typeof lewa, zrodlo: readonly (Oddzial | null | undefined)[], offset: number) => {
    // Kto nie stanął do walki (zemdlony, ponad siedmiu na pole), zostaje,
    // jaki był — odejmujemy tylko tych, którzy padli na polu.
    const ocalali = zrodlo.map((o) => (o && o.ile > 0 ? o.ile : 0));
    const pokonani: { poziom: number; tier: number }[] = [];
    lista.forEach((j, i) => {
      if (zywi.has(offset + i + 1)) return;
      ocalali[j.skad]--;
      pokonani.push({ poziom: j.def.poziom ?? POZIOM_MLODEGO, tier: j.def.tier - 1 });
    });
    return { ocalali, pokonani };
  };
  const l = policz(lewa, atak, 0);
  const p = policz(prawa, obrona, lewa.length);
  return {
    outcome,
    ocalaliAtak: l.ocalali,
    ocalaliObrona: p.ocalali,
    pokonaniAtak: l.pokonani,
    pokonaniObrona: p.pokonani,
  };
}

/**
 * Po bitwie drużyny trenera: kto nie przetrwał, mdleje (zostaje w slocie),
 * a po wygranej reszta dostaje doświadczenie za pokonanych.
 */
export function rozliczDruzyne(
  armia: (Oddzial | null)[],
  ocalali: readonly number[],
  wygrana: boolean,
  pokonani: readonly { poziom: number; tier: number }[]
) {
  const walczyli = new Set(jednostkiBitwy(armia).map((j) => j.skad));
  armia.forEach((o, i) => {
    if (!o || !walczyli.has(i)) return;
    if ((ocalali[i] ?? 0) <= 0) o.omdlaly = true;
  });
  if (!wygrana) return [];
  return rozdajDosw(
    armia.map((o, i) => (walczyli.has(i) ? o : null)),
    pokonani
  );
}
