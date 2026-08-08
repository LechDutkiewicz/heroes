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
 * Statystyki pojedynczego stworka na każdym poziomie i liczebność oddziału.
 *
 * WAŻNE, JAK TO CZYTAĆ: liczy się nie statystyka stworka, tylko suma oddziału.
 * Oddział bije za `count × atk` i znosi `count × hp`, więc liczebność mnoży
 * OBA człony naraz. Poprzednia tabela miała przez to sumy prawie stałe na
 * wszystkich poziomach — 30/30/35/40/39/40 życia i 15/20/14/15/15/16 ataku.
 * Czempion bił tyle samo co drobnica i ginął równie szybko, a poziom był
 * czysto ozdobny. Każdy oddział padał w dwa ciosy, więc bitwa sprowadzała się
 * do tego, kto zdąży uderzyć pierwszy; symulator pokazywał, że strona
 * ruszająca się pierwsza przegrywa 100% starć, bo to ona wydaje turę na
 * podejście i obrywa jako pierwsza.
 *
 * Teraz suma życia ROŚNIE z poziomem szybciej niż suma ataku, więc:
 *  - czas do wybicia oddziału wynosi ok. 3 ciosów zamiast 2, przez co
 *    pozycja, odwet i kolejność zaczynają mieć znaczenie;
 *  - wyższy poziom naprawdę jest twardszy, a nie tylko mniej liczny;
 *  - obrońca z poziomu 3 znosi najwięcej w stosunku do tego, co zadaje.
 *
 * Kolumny „suma" są komentarzem, nie kodem — trzymam je, bo bez nich każda
 * zmiana pojedynczej liczby wymaga liczenia w pamięci.
 */
export const TIERS = [
  //                                            suma HP / suma ataku / ciosów do wybicia
  { tier: 1, count: 20, hp: 3, atk: 1, move: 4 }, //  60 /  20 / 3.0
  { tier: 2, count: 14, hp: 5, atk: 2, move: 5 }, //  70 /  28 / 2.5
  { tier: 3, count: 10, hp: 8, atk: 2, move: 3 }, //  80 /  20 / 4.0
  { tier: 4, count: 7, hp: 12, atk: 4, move: 7 }, //  84 /  28 / 3.0
  { tier: 5, count: 5, hp: 18, atk: 6, move: 4 }, //  90 /  30 / 3.0
  { tier: 6, count: 3, hp: 32, atk: 12, move: 6 }, // 96 /  36 / 2.7
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
    hp: co1(t.hp * p.hp),
    atk: co1(t.atk * p.atk),
    count: co1(t.count * p.count),
    move: co1(t.move + p.move),
  };
}

/**
 * Trzy charaktery. Sumy mocy są zbliżone, rozłożone inaczej:
 *  - Bór: liczny i szybki, ale kruchy — bije często, znosi mało.
 *  - Grota: powolna, twarda i ciężka w ciosie — dochodzi na końcu, ale kogo
 *    dosięgnie, tego rozjeżdża; płaci za to najmniejszą liczebnością.
 *  - Zbocze: wyrównane i solidne — nic nie wystaje, nic nie zawodzi.
 */
// Uwaga przy strojeniu: te liczby NIE są liniowe i nie da się ich dobrać
// intuicją. Liczebność mnoży ZARAZEM atak i życie, więc działa kwadratowo —
// zmiana Groty z 0.90 na 0.95 przerzuciła starcie z Borem z 58:42 na 18:82.
// Do tego statystyki są całkowite, więc drobne mnożniki znikają w
// zaokrągleniu: atak 1.15 i 1.22 dają dokładnie te same oddziały. Jeśli
// zmiana „nic nie robi", to zwykle nie jest za mała, tylko wpadła między
// dwie liczby całkowite — a jeśli robi za dużo, to trafiła w próg.
// Do przeszukiwania siatki wariantów jest `npx tsx tools/strojenie.ts`,
// do sprawdzenia wyniku `npm run balans`.
const BOR: Profil = { hp: 0.75, atk: 0.95, count: 1.2, move: 1 };
const GROTA: Profil = { hp: 1.15, atk: 1.22, count: 0.9, move: 0 };
const ZBOCZE: Profil = { hp: 1.12, atk: 1.05, count: 0.95, move: 0 };

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
