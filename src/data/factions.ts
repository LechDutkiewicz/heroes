import type { UnitDef } from './units';

/**
 * Frakcje, czyli zamki. Każda ma sześć poziomów oddziałów — od licznej
 * drobnicy po nielicznych czempionów, jak w Heroes 3.
 *
 * Obie frakcje korzystają z tej samej tabeli statystyk dla danego poziomu
 * (patrz TIERS niżej). Dzięki temu są równe co do siły z samej konstrukcji,
 * a różnią się tym, co ciekawe: stworkami, żywiołami i tym, który poziom
 * jest u kogo strzelcem, lataczem czy czempionem.
 */
export interface Faction {
  id: string;
  /** nazwa zamku */
  name: string;
  /** jednym zdaniem: kim oni są */
  motto: string;
  /** barwa przewodnia, używana w interfejsie */
  color: number;
  emoji: string;
  /** oddziały od poziomu 1 do 6 */
  units: UnitDef[];
}

/**
 * Statystyki JEDNEGO stworka każdego poziomu frakcji, na poziomie
 * doświadczenia 5 i w formie bazowej. `defStworka` (`stworki.ts`) skaluje
 * je poziomem i etapem ewolucji.
 *
 * Dawniej była tu tabela stosów (20 drobnicy, 3 czempionów) o prawie równej
 * sumie życia i ataku na każdym poziomie — bo o sile decydowała liczebność
 * z tygodniowego przyrostu. Od przebudowy „trener zamiast armii" stworek jest
 * jeden, więc poziom frakcji znaczy to, co w grach o pokemonach rzadkość
 * gatunku: czempion z szóstego poziomu jest mniej więcej dwa razy mocniejszy
 * od drobnicy na tym samym poziomie doświadczenia, a za to rzadki i drogi.
 *
 * Proporcje HP do ataku pilnują długości walki: równy przeciwnik pada po
 * 3–4 ciosach, więc pozycja, odwet i kolejka dalej mają znaczenie. Obrońca
 * z poziomu 3 znosi najwięcej w stosunku do tego, co zadaje — jak dawniej.
 */
export const TIERS = [
  //                                              ciosów do wybicia równego
  { tier: 1, count: 1, hp: 40, atk: 13, move: 4 }, // 3.1
  { tier: 2, count: 1, hp: 38, atk: 14, move: 5 }, // 2.7 — strzelec
  { tier: 3, count: 1, hp: 58, atk: 13, move: 3 }, // 4.5 — obrońca
  { tier: 4, count: 1, hp: 52, atk: 17, move: 7 }, // 3.1 — latacz
  { tier: 5, count: 1, hp: 58, atk: 20, move: 4 }, // 2.9 — elitarny strzelec
  { tier: 6, count: 1, hp: 84, atk: 22, move: 6 }, // 3.8 (bije dwa razy)
] as const;

/**
 * Role poziomów są wspólne dla obu frakcji: drobnica, strzelec, obrońca,
 * latacz, elitarny strzelec i czempion. Dopiero żywioły i stworki się różnią.
 */
type Role = Pick<UnitDef, 'shooter' | 'shootRange' | 'flying' | 'ability'>;

const ROLES: Role[] = [
  { shooter: false, shootRange: 0 },
  { shooter: true, shootRange: 5 },
  { shooter: false, shootRange: 0, ability: 'guardian' },
  { shooter: false, shootRange: 0, flying: true, ability: 'strikeAndReturn' },
  { shooter: true, shootRange: 6 },
  { shooter: false, shootRange: 0, ability: 'double' },
];

/**
 * Charakter frakcji: mnożniki nakładane na tabelę poziomów.
 *
 * Do tej pory wszystkie frakcje brały statystyki wprost z TIERS i różniły się
 * wyłącznie sprite'em, nazwą i żywiołem — czyli były matematycznie tym samym
 * wojskiem w innych barwach. Tutaj każda dostaje własny profil: coś zyskuje,
 * coś traci.
 *
 * Trzymamy to jako mnożniki, nie jako sześć ręcznie wpisanych tabel, bo dzięki
 * temu zmiana wspólnej podstawy (np. wydłużenie walki) przenosi się na
 * wszystkie frakcje naraz i nie trzeba jej nanosić w osiemnastu miejscach.
 * Budżet mocy pilnuje symulator, nie te liczby — `npm run balans`.
 */
interface Profil {
  hp: number;
  atk: number;
  count: number;
  /** dodawane, nie mnożone: ruch to małe liczby, procenty by się zaokrągliły do zera */
  move: number;
}

const RUWNO: Profil = { hp: 1, atk: 1, count: 1, move: 0 };

/** Zaokrąglenie do co najmniej jedynki — statystyka zerowa psuje walkę. */
const co1 = (x: number) => Math.max(1, Math.round(x));

/** Składa opis oddziału z tabeli poziomów, roli, profilu frakcji i odchyłki. */
function unit(
  index: number,
  sprite: string,
  name: string,
  type: UnitDef['type'],
  profil: Profil = RUWNO,
  odchylka: Partial<Profil> = {}
): UnitDef {
  const t = TIERS[index];
  const p = { ...profil, ...odchylka };
  return {
    ...t,
    ...ROLES[index],
    sprite,
    name,
    type,
    // Liczebność z profilu (dawne „Bór jest liczny") przechodzi na HP
    // i atak po równo: stos o 20% liczniejszy był o 20% mocniejszy w obu.
    // Pierwiastek, bo liczy się iloczyn życia i ataku, nie ich suma.
    hp: co1(t.hp * p.hp * Math.sqrt(p.count)),
    atk: co1(t.atk * p.atk * Math.sqrt(p.count)),
    count: 1,
    move: co1(t.move + p.move),
  };
}

/**
 * Trzy charaktery. Sumy mocy są zbliżone, rozłożone inaczej:
 *  - Bór: szybki i ostry, ale kruchy — bije mocno, znosi mało.
 *  - Grota: powolna i twarda — dochodzi na końcu, ale trudno ją przewrócić.
 *  - Zbocze: wyrównane i solidne — nic nie wystaje, nic nie zawodzi.
 */
// Strojone po przebudowie „trener zamiast armii" (stworek = postać, cztery
// na polu bitwy). Dawne mnożniki były dobrane pod stosy, w których
// liczebność działała kwadratowo — po przejściu na pojedyncze stworki Grota
// wygrywała z Borem 99:1. `count` zostaje w profilu, bo `unit()` przenosi go
// na HP i atak (pierwiastek), ale samo strojenie idzie przez `hp` i `atk`.
// Statystyki są całkowite, więc drobne zmiany potrafią nic nie dać (wpadają
// między dwie liczby) — sprawdzaj wynik `npm run balans` (cel: do 5 pp).
const BOR: Profil = { hp: 0.74, atk: 1.10, count: 1.2, move: 1 };
const GROTA: Profil = { hp: 1.265, atk: 1.0, count: 0.9, move: 0 };
const ZBOCZE: Profil = { hp: 1.10, atk: 1.03, count: 0.95, move: 0 };

/**
 * Frakcje to miejsca, bo tak jest poukładany świat pokemonów: w lesie żyją
 * inne stworki niż w jaskini. Nazwy oddziałów są zmyślone, ale w tym samym
 * stylu co w bajce — obco brzmiące zlepki, nie polskie rzeczowniki.
 * Prawdziwych nazw pokemonów nie używamy: nasze stworki to autorskie rysunki,
 * a nie te z bajki, więc nazwanie któregoś Pikachu opisywałoby coś, czym on
 * nie jest (nie mówiąc o cudzym znaku towarowym).
 *
 * Żywioły rozłożone tak, żeby żadna frakcja nie miała przewagi z góry.
 * Na poziomach 1-3 przewagę typu ma Grota, na 4-6 Bór, a każda ma po dwa
 * oddziały ognia, wody i trawy.
 */
export const FACTIONS: Faction[] = [
  {
    id: 'bor',
    name: 'Bór Szmaragdowy',
    motto: 'Stworki lasu i leśnych strumieni — liczne, zwinne i zgrane.',
    color: 0x66bb6a,
    emoji: '\u{1F332}',
    units: [
      unit(0, '00193', 'Pyroko', 'fire', BOR, { count: 1.35 }),
      unit(1, '00020', 'Flamir', 'fire', BOR),
      unit(2, '00218', 'Aquino', 'water', BOR, { hp: 1.15 }),
      unit(3, '00030', 'Torrenar', 'water', BOR, { move: 2 }),
      unit(4, '00096', 'Verdiko', 'grass', BOR),
      unit(5, '00227', 'Silvena', 'grass', BOR, { hp: 1.1, atk: 0.9 }),
    ],
  },
  {
    id: 'grota',
    name: 'Grota Księżycowa',
    motto: 'Stworki podziemi — twarde, zarodnikowe i cierpliwe.',
    color: 0xab47bc,
    emoji: '\u{1F311}',
    units: [
      unit(0, '00246', 'Glacyn', 'water', GROTA),
      unit(1, '00002', 'Sporex', 'grass', GROTA, { atk: 1.15 }),
      unit(2, '00263', 'Cindro', 'fire', GROTA, { hp: 1.45 }),
      unit(3, '00250', 'Sporina', 'grass', GROTA, { move: -2 }),
      unit(4, '00220', 'Aquator', 'water', GROTA),
      unit(5, '00196', 'Vulkaron', 'fire', GROTA, { atk: 1.1 }),
    ],
  },
];

/**
 * Trzecia frakcja. Żywioły dobrane tak, żeby przewaga typów krążyła:
 * na poziomach 1-3 Zbocze bije Grotę i przegrywa z Borem, na 4-6 odwrotnie.
 * Gdyby dostała układ „bije jedną, przegrywa z drugą" na wszystkich
 * poziomach, wybór frakcji sprowadzałby się do tego, kogo się spodziewasz.
 */
FACTIONS.push({
  id: 'zbocze',
  name: 'Zbocze Popielne',
  motto: 'Stworki spod wulkanu — nieliczne, ale uderzają jak obuch.',
  color: 0xff7043,
  emoji: '\u{1F30B}',
  units: [
    unit(0, '00074', 'Bazalt', 'grass', ZBOCZE, { count: 1.2 }),
    unit(1, '00058', 'Ashko', 'water', ZBOCZE),
    unit(2, '00095', 'Obsydian', 'grass', ZBOCZE, { hp: 1.25, atk: 0.85 }),
    unit(3, '00023', 'Cynder', 'fire', ZBOCZE, { move: 1 }),
    unit(4, '00077', 'Lawina', 'fire', ZBOCZE),
    unit(5, '00041', 'Sadzin', 'water', ZBOCZE, { hp: 1.15 }),
  ],
});

export const factionById = (id: string) => FACTIONS.find((f) => f.id === id)!;

/** Wszystkie sprite'y, które gra musi wczytać przed bitwą. */
export const ALL_SPRITES = FACTIONS.flatMap((f) => f.units.map((u) => u.sprite));
