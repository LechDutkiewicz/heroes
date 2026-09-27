import Phaser from 'phaser';
import {
  TYPE_INFO,
  TYPE_STRONG,
  fullHp,
  stackAtk,
  typeMatchup,
  type UnitDef,
} from '../data/units';
import { ALL_SPRITES, FACTIONS, factionById, type Faction } from '../data/factions';
import { gatunek, jednostkiBitwy, napisPoziomu } from '../data/stworki';
import { createPasekAtakow, type PasekAtakow } from '../visual/pasekAtakow';
import {
  KOSZT_RZUTU,
  PLECAK_NA_BITWE,
  moznaLeczyc,
  moznaWzmocnic,
  szansaZlapania,
  uzyjEliksiru,
  uzyjMikstury,
  zlap,
  LECZENIE_MIKSTURY,
  SILA_ELIKSIRU,
  type Przedmiot,
} from '../data/przedmioty';
import { pokazPlecak, type WierszPlecaka } from '../visual/oknoPlecaka';
import { pokazWyborSkladu, type WyborSkladu } from '../visual/wyborSkladu';
import { medalion } from '../visual/zestaw';
import { toEtapEwolucji, wczytajPortrety } from '../visual/portrety';
import { hexDistance, type Cell } from '../data/hex';

/**
 * Rzędy, w których staje drużyna z mapy — w kolejności, nie losowo, zawsze
 * z wolnym polem między stworkami (`rzedyNaPolu`).
 */
const rzedyDlaSkladu = (ile: number) => rzedyNaPolu(ile);

/** Oddział przekazany z mapy przygody: liczebność plus wskazanie definicji. */
interface OddzialZMapy {
  /**
   * Numer slotu u bohatera. Bez niego bitwa nie ma jak oddać armii na te same
   * miejsca, a ustawienie, które gracz świadomie ułożył, przepada po każdej
   * walce.
   */
  slot?: number;
  sprite: string;
  nazwa: string;
  ile: number;
  frakcja: string;
  tier: number;
  /** poziom stworka (w stadzie — każdego z nich) */
  poziom: number;
}

interface DaneZPrzygody {
  gracz: OddzialZMapy[];
  wrog: OddzialZMapy[];
  oObiekt: number;
  powrot?: string;
  /** Dodatki z drugorzędnych umiejętności bohatera — patrz `umiejetnosci.ts`. */
  bonusGracza?: { wrecz: number; strzal: number; pancerz: number; atak: number; obrona: number };
  /**
   * Trener przy polu bitwy (etap 5): kto to jest, ile pokeballi ma w skarbcu,
   * ile wolnych miejsc w drużynie i czy przeciwnik to dzikie stworki (tylko
   * takie wolno łapać).
   */
  trener?: {
    kto: 'janek' | 'ela';
    pokeballe: number;
    wolneSloty: number;
    dzikie: boolean;
    /** Gatunki, które trener już ma (`gatunek`) — drugiego się nie łapie. */
    posiadane?: string[];
  };
  /** Lider sali po drugiej stronie pola (etap 6): imię i portret (ścieżka w `public/`). */
  przeciwnik?: { imie: string; portret: string };
  /**
   * Ilu stworków staje naraz po stronie: 1 z dzikimi, 2 z trenerami, salami
   * i miastami (`NA_POLU_DZIKIE`, `NA_POLU`). Reszta czeka w pokeballach.
   */
  naPolu?: number;
}
// Wszystkie zasady walki biorą się STĄD i tylko stąd. Scena ma je odgrywać,
// nie powtarzać — druga kopia reguł rozjechałaby się z symulatorem balansu.
import { initSfx, loadSfx, sfx, startMusic, stopMusic, toggleSfx } from '../audio/sfx';
import { migawkaStanu, sledzScene, zapisz } from '../dev/dziennik';
import {
  GUARD_REDUCTION,
  NA_POLU,
  rzedyNaPolu,
  atakDostepny,
  atakiJednostki,
  attackPlan,
  canShoot,
  cellKey,
  chooseAction,
  damageOf,
  makeUnit,
  movePath,
  neighbours,
  performAttack,
  reachable,
  startRound,
  total,
  type Battle,
  type BattleEvent,
  type SimUnit,
} from '../data/battle';
import {
  BOARD_H,
  BOARD_W,
  BOARD_X,
  BOARD_Y,
  COLS,
  HEX_H,
  HEX_W,
  ROWS,
  cellToXY,
  drawBackground,
  drawBoard,
  drawObstacleShadow,
  hexPoints,
  paintApproachCell,
  paintAttackCell,
  paintMoveCell,
  paintPreviewCell,
  pulse,
} from '../visual/board';
import { C, H, Z, body, display } from '../visual/theme';
import { wersjonujZasoby } from '../visual/zasoby';
import { OKNO_H } from '../visual/uklad';
import {
  ICON,
  MINI,
  MINI_TYPE,
  TYPE_ICON,
  buildIcons,
  icon,
  type IconKey,
} from '../visual/icons';
import {
  blinkPanel,
  createForecast,
  createStatTable,
  createTurnQueue,
  drawPanelBody,
  drawTitle,
  makeHudButton,
  plate,
  type Forecast,
  type HudButton,
  type StatRow,
  type StatSlot,
  type StatTable,
  type TurnQueue,
} from '../visual/hud';
import {
  battleShake,
  buildEffectTextures,
  deathFlash,
  flashTarget,
  floatLabel,
  impactBurst,
  launchProjectile,
  muzzleFlash,
  setLabelObstacles,
  showOutcomeScreen,
  slashArc,
} from '../visual/effects';
import {
  beginUnitMove,
  muzzleOf,
  playHitPose,
  playShootPose,
  poseKey,
  poseRecover,
  POSES,
  poseStrike,
  poseWindup,
  buildUnitView,
  SKALA_POLA,
  endUnitMove,
  playUnitDeath,
  stepUnitMove,
  refreshUnitView,
  setUnitActive,
  sideAccent,
  type UnitView,
} from '../visual/unitView';

type Side = 'player' | 'enemy';

/**
 * Oddział na planszy to oddział z symulacji PLUS jego wygląd. Dzięki
 * rozszerzeniu `SimUnit` tablicę oddziałów sceny można podać wprost funkcjom
 * z `data/battle.ts` — bez przepisywania stanu tam i z powrotem.
 */
interface Unit extends SimUnit {
  /** cały wygląd oddziału — buduje i odświeża go src/visual/unitView.ts */
  view: UnitView;
  container: Phaser.GameObjects.Container;
}

// Geometria siatki i całe rysowanie planszy siedzą w src/visual/board.ts.
// Tutaj zostaje sama rozgrywka.

/**
 * UKŁAD: WĄSKI PASEK ZAMIAST PANELU (wzorzec: Heroes 3 / HotA).
 *
 * Dolny panel miał 208 px i przy oknie 850 px wysokości prognoza obrażeń —
 * jedyna liczba, którą gracz czyta PRZED kliknięciem — wypadała poniżej
 * krawędzi ekranu laptopa. W Heroes 3 plansza zajmuje prawie cały ekran,
 * a na dole jest wąski pasek z jedną linią podpowiedzi; pełnych statystyk
 * nie widać nigdy na stałe, wyskakują pod prawym przyciskiem na oddziale.
 *
 * Robimy to samo, tylko wywołane MYSZĄ zamiast prawym przyciskiem: pasek na
 * dole niesie prognozę i dwa przyciski, a cała tabela przenosi się do karty
 * oddziału, która wyskakuje nad planszą przy najechaniu.
 */
/** Tytuł i zdanie o turze odsunięte w prawo — w rogu stoi medalion trenera. */
const TYTUL_X = BOARD_X + 22;

const BAR_X = BOARD_X - 6;
const BAR_W = BOARD_W + 12;
const BAR_H = 62;
/**
 * Pasek stoi przy dolnej krawędzi okna, nie pod planszą: pole z bajki
 * (8 × 5) jest niższe od dawnego, a okno gry ma stałą wysokość (`OKNO_H`).
 * Między planszą a paskiem leżą pokeballe obu drużyn (`rysujDruzyny`).
 */
const BAR_Y = OKNO_H - 14 - BAR_H;
/** Rząd pokeballi z drużynami — pośrodku pasa między planszą a paskiem. */
const DRUZYNY_Y = (BOARD_Y + BOARD_H + BAR_Y) / 2 + 2;
const BAR_INSET = 6;
const BAR_PAD = 8;

const CONTENT_X = BAR_X + BAR_INSET + BAR_PAD;
const CONTENT_R = BAR_X + BAR_W - BAR_INSET - BAR_PAD;
const CONTENT_W = CONTENT_R - CONTENT_X;

/** Wysokość okna liczona z geometrii: plansza + pasek + margines pod cień. */
export const SCENE_H = BAR_Y + BAR_H + 14;

/** Dwa przyciski obok siebie, dosunięte do prawej krawędzi paska. */
const BTN_W = 148;
const BTN_H = 34;
const BTN_GAP = 10;
const BTN_Y = BAR_Y + BAR_H / 2;

const FORECAST_H = 30;
const FORECAST_Y = BAR_Y + (BAR_H - FORECAST_H) / 2;
const FORECAST_W = CONTENT_W - (BTN_W * 2 + BTN_GAP) - 14;

// ---------- karta oddziału ----------

/** Jedna kolumna pasm, bo karta stoi przy krawędzi planszy, nie na całą jej szerokość. */
const CARD_W = 336;
const CARD_INSET = 7;
const CARD_PAD = 7;
const CARD_CONTENT_X = CARD_INSET + CARD_PAD;
const CARD_CONTENT_W = CARD_W - CARD_CONTENT_X * 2;

const ROW_H = 22;
const ROW_STEP_Y = 26;
const HEAD_Y = 12;
const HEAD_H = 26;
/** Pierwszy wiersz zaczyna się pod pasem z nazwą oddziału. */
const ROWS_Y = HEAD_Y + HEAD_H + 8;
/** Osiem wierszy tabeli plus wstęga z umiejętnością pod nimi. */
const CARD_H = ROWS_Y + 9 * ROW_STEP_Y + 6;
/** Karta wisi w pionie na środku planszy — nigdy nie wychodzi poza jej ramę. */
const CARD_Y = BOARD_Y + (BOARD_H - CARD_H) / 2;
const CARD_LEFT_X = BOARD_X + 10;
const CARD_RIGHT_X = BOARD_X + BOARD_W - CARD_W - 10;

/** Tła pola bitwy — jedno losowane na bitwę, jak zmienne krajobrazy w Heroes 3. */
const TERRAINS = [
  { key: 'laka', label: 'Łąka', obstacles: ['drzewo', 'sosna', 'krzak', 'glaz', 'kopiec'] },
  { key: 'plaza', label: 'Plaża', obstacles: ['palma', 'trawa', 'glaz_piaskowy', 'kopiec_piaskowy'] },
  { key: 'snieg', label: 'Śnieżna polana', obstacles: ['sosna_snieg', 'drzewo_zimowe', 'glaz_sniezny', 'kopiec_sniezny'] },
  { key: 'noc', label: 'Nocna łąka', obstacles: ['drzewo_noc', 'sosna_noc', 'glaz_noc', 'kopiec_noc'] },
  { key: 'jesien', label: 'Jesienny las', obstacles: ['drzewo_jesien', 'sosna_jesien', 'krzak_jesien', 'kopiec_jesien'] },
];

/**
 * Drobne przeszkody rysujemy znacznie mniej niż drzewa. Wcześniej wszystko
 * dostawało rozmiar drzewa, przez co mały rysunek 16 pikseli rozdymał się
 * na całe pole i wyglądał jak klocki.
 */
const isSmallObstacle = (kind: string) => /^(krzak|trawa|glaz|kopiec)/.test(kind);

const ALL_OBSTACLES = [...new Set(TERRAINS.flatMap((t) => t.obstacles))];

/**
 * Ile przeszkód stawiamy — losowo, jak w Heroes 3. Nasza plansza jest znacznie
 * mniejsza niż tamta, więc kilka drzew wystarczy; czasem nie ma żadnego.
 */
const OBSTACLES_MIN = 0;
const OBSTACLES_MAX = 4;

/** Poprawna polska odmiana: 1 obrażenie, 2 obrażenia, 5 obrażeń. */
function damageWord(n: number) {
  if (n === 1) return 'obrażenie';
  const last = n % 10;
  const lastTwo = n % 100;
  if (last >= 2 && last <= 4 && !(lastTwo >= 12 && lastTwo <= 14)) return 'obrażenia';
  return 'obrażeń';
}

/** Poprawna polska odmiana: padnie 1, padną 2, padnie 5. */
function fellPhrase(n: number) {
  const last = n % 10;
  const lastTwo = n % 100;
  if (last >= 2 && last <= 4 && !(lastTwo >= 12 && lastTwo <= 14)) return `padną ${n}`;
  return `padnie ${n}`;
}

export class BattleScene extends Phaser.Scene {
  /**
   * Stan bitwy — ten sam obiekt, na którym pracuje symulator. Scena nie trzyma
   * własnych kopii listy oddziałów ani kolejki: `resolveHit` przy śmierci celu
   * PODMIENIA `units` na nową tablicę, więc każda odłożona referencja
   * zestarzałaby się po pierwszym poległym.
   */
  private battle: Battle = {
    units: [],
    obstacles: new Set<string>(),
    roundQueue: [],
    round: 1,
    dealt: new Map(),
    rezerwa: { player: [], enemy: [] },
  };

  /**
   * Wszystkie oddziały, także polegli. Zejście trzeba jeszcze zanimować, a
   * z `battle.units` nieboszczyk znika w chwili śmierci.
   */
  private roster = new Map<number, Unit>();

  private get units(): Unit[] {
    return this.battle.units as Unit[];
  }

  /** Kolejka na bieżącą rundę — pierwszy z brzegu ma teraz turę. */
  private get roundQueue(): number[] {
    return this.battle.roundQueue;
  }

  private get obstacles(): Set<string> {
    return this.battle.obstacles;
  }

  private nextId = 1;

  /** Ilu stworków stoi naraz po stronie w tej bitwie (1 albo 2). */
  private naPolu = NA_POLU;

  /** Stworki w pokeballach, czekające na wejście — po stronach. */
  private get rezerwa(): Record<Side, SimUnit[]> {
    return (this.battle.rezerwa ??= { player: [], enemy: [] });
  }

  /** Czy stworek (po identyfikatorze) jest jeszcze na nogach — na polu albo w pokeballu. */
  private naNogach(id: number) {
    return this.units.some((u) => u.id === id) || this.rezerwa.player.some((u) => u.id === id) || this.rezerwa.enemy.some((u) => u.id === id);
  }

  /** Pokeballe obu drużyn pod planszą: pełny — czeka, pusty — zemdlał. */
  private druzynyWarstwa?: Phaser.GameObjects.Container;

  /**
   * Czyści stan poprzedniej bitwy. MUSI iść jako pierwsza rzecz w `create`.
   *
   * Phaser używa tej samej instancji sceny przy każdym `scene.start`, więc
   * wartości nadane przy deklaracji pól ustawiają się RAZ, przy tworzeniu gry,
   * a nie przy każdym wejściu do bitwy. Druga bitwa zaczynała się więc
   * z oddziałami pierwszej — a ich napisy i paski były już zniszczone razem
   * z poprzednią sceną. Pierwsze odświeżenie takiego oddziału sięgało po
   * nieistniejącą teksturę i gra stawała: „Cannot read properties of null
   * (reading 'glTexture')". Bez powrotu na mapę tego nie widać, bo pierwsza
   * bitwa w sesji zawsze zaczyna od pustych tablic.
   */
  private zerujBitwe() {
    this.battle = {
      units: [],
      obstacles: new Set<string>(),
      roundQueue: [],
      round: 1,
      dealt: new Map(),
      rezerwa: { player: [], enemy: [] },
    };
    this.roster.clear();
    this.slotyZMapy.clear();
    this.wrogZMapy = [];
    this.nextId = 1;
    this.busy = false;
    this.gameOver = false;
    this.preferredApproach = null;
    this.wybranyAtak = 0;
    this.prognozaDla = null;
    this.pasekAtakow = undefined;
    this.plecak = { ...PLECAK_NA_BITWE };
    const tr = this.zPrzygody?.trener;
    // Bitwa pokazowa (bez mapy) też ma plecak — łapanie tylko „na niby".
    this.pokeballe = tr?.pokeballe ?? 50;
    this.wolneSloty = tr?.wolneSloty ?? 1;
    this.dzikie = tr?.dzikie ?? !this.zPrzygody;
    this.posiadaneGatunki = new Set(tr?.posiadane ?? []);
    this.przedmiotWRundzie = 0;
    this.celowanie = null;
    this.oknoPlecaka = undefined;
    this.plecakButton = undefined;
    this.zlapani = [];
    this.wydanePokeballe = 0;
    this.wyborSkladu = undefined;
  }

  private highlightLayer!: Phaser.GameObjects.Container;
  /** Podgląd zasięgu oddziału, na który patrzy kursor — pod warstwą ruchu. */
  private previewLayer!: Phaser.GameObjects.Container;
  private approachLayer!: Phaser.GameObjects.Container;
  private effectLayer!: Phaser.GameObjects.Container;
  /** Pole, z którego gracz chce uderzyć — wybierane położeniem kursora. */
  private preferredApproach: { targetId: number; cell: Cell } | null = null;
  private queue!: TurnQueue;

  private turnText!: Phaser.GameObjects.Text;
  /** Karta statystyk nad planszą — pokazuje oddział spod kursora. */
  private card!: Phaser.GameObjects.Container;
  /** Pas z nazwą oddziału u góry karty — przemalowywany barwą strony. */
  private headBand!: Phaser.GameObjects.Graphics;
  private headName!: Phaser.GameObjects.Text;
  private headMeta!: Phaser.GameObjects.Text;
  private headIcon!: Phaser.GameObjects.Image;
  private stats!: StatTable;
  private forecast!: Forecast;
  /** Pasek ataków w miejscu prognozy — widać go, gdy gracz ma turę i nie celuje. */
  private pasekAtakow?: PasekAtakow;
  /** Atak wybrany dla stworka, który ma turę (indeks w `ataki.ts`). */
  private wybranyAtak = 0;
  /** Na kogo celuje prognoza — żeby klawisz 1–3 mógł ją przeliczyć. */
  private prognozaDla: { a: Unit; t: Unit } | null = null;
  private waitButton!: HudButton;
  /** Plecak trenera (`przedmioty.ts`): co zostało na tę bitwę. */
  private plecak = { ...PLECAK_NA_BITWE };
  private pokeballe = 0;
  private wolneSloty = 0;
  private dzikie = false;
  /** Gatunki trenera — jeden stworek danego gatunku, więc tych nie łapiemy. */
  private posiadaneGatunki = new Set<string>();
  /** Runda, w której trener ostatnio sięgnął do plecaka — raz na rundę. */
  private przedmiotWRundzie = 0;
  /** Przedmiot czekający na wskazanie celu. */
  private celowanie: Przedmiot | null = null;
  private oknoPlecaka?: Phaser.GameObjects.Container;
  private plecakButton?: HudButton;
  /** Skąd leci pokeball — środek medalionu trenera. */
  private readonly trenerXY = { x: 34, y: 50 };
  /** Złapane stworki: wpis w składzie wroga i id na polu. */
  private zlapani: { skad: number; id: number }[] = [];
  private wydanePokeballe = 0;
  /** Okno „Kto walczy?", dopóki jest otwarte. */
  private wyborSkladu?: WyborSkladu;
  /** Los rzutu pokeballem — osobno, żeby sonda mogła go ustawić. */
  losujRzut: () => number = Math.random;
  private guardButton!: HudButton;

  private busy = false;
  private gameOver = false;

  /**
   * Skład bitwy narzucony przez mapę przygody. Kiedy jest ustawiony, scena
   * NIE losuje frakcji — wystawia dokładnie te oddziały, na które gracz
   * wszedł na mapie, i po zakończeniu wraca tam z wynikiem.
   *
   * Kiedy go nie ma, wszystko działa jak dotąd: losowa bitwa dwóch frakcji.
   * To ta ścieżka jest używana przez test dymny i narzędzia do zrzutów, więc
   * musi zostać nietknięta.
   */
  private zPrzygody?: DaneZPrzygody;
  /** Który oddział na planszy odpowiada któremu wpisowi w armii z mapy. */
  private slotyZMapy = new Map<number, number>();
  /** Stworki przeciwnika z mapy: z którego wpisu pochodzą i jaki mają numer. */
  private wrogZMapy: { skad: number; id: number }[] = [];

  /** Krajobraz tej bitwy — losowany raz, przy tworzeniu sceny. */
  private terrain = TERRAINS[0];

  /** Zamki, których armie się biją. */
  private playerFaction: Faction = FACTIONS[0];
  private enemyFaction: Faction = FACTIONS[1];

  constructor() {
    super('battle');
  }

  preload() {
    wersjonujZasoby(this);
    for (const key of ALL_SPRITES) {
      this.load.image(key, `${import.meta.env.BASE_URL}sprites/${key}.png`);
      // Klatki póz (zamach, cios, trafienie, krok). Brak pliku nie psuje
      // bitwy — `setPose` zostawia wtedy obrazek „stoi".
      for (const poza of POSES) {
        this.load.image(poseKey(key, poza), `${import.meta.env.BASE_URL}sprites/pozy/${key}-${poza}.png`);
      }
    }
    // Etapy ewolucji (`01xxx`, `02xxx`) z armii przyniesionych z mapy: sam
    // sprite i okrągły portret do kolejki tur. Póz nie mają — `setPose`
    // zostawia wtedy obrazek „stoi", a o pliki póz nie prosimy (bez 404).
    const zMapy = [...(this.zPrzygody?.gracz ?? []), ...(this.zPrzygody?.wrog ?? [])].map((o) => o.sprite);
    const etapy = [...new Set(zMapy)].filter((s) => !ALL_SPRITES.includes(s));
    for (const key of etapy) this.load.image(key, `${import.meta.env.BASE_URL}sprites/${key}.png`);
    wczytajPortrety(this, { okragle: true }, etapy.filter(toEtapEwolucji));
    for (const t of TERRAINS) {
      this.load.image(t.key, `${import.meta.env.BASE_URL}terrain/${t.key}.png`);
    }
    for (const key of ALL_OBSTACLES) {
      this.load.image(key, `${import.meta.env.BASE_URL}terrain/obstacles/${key}.png`);
    }
    for (const kto of ['janek', 'ela']) {
      this.load.image(`tr-glowa-${kto}`, `${import.meta.env.BASE_URL}kampania/glowa-${kto}.png`);
    }
    this.load.image('przedmiot-mikstura', `${import.meta.env.BASE_URL}bohater/przedmiot-mikstura.png`);
    this.load.image('przedmiot-eliksir', `${import.meta.env.BASE_URL}bohater/przedmiot-eliksir.png`);
    this.load.image('przedmiot-pokeball', `${import.meta.env.BASE_URL}kampania/ikona-pokeball.png`);
    const p = this.zPrzygody?.przeciwnik;
    if (p) this.load.image(`przeciwnik-${p.portret}`, `${import.meta.env.BASE_URL}${p.portret}`);
    loadSfx(this);
  }

  /**
   * Powtarzalny stan bitwy na potrzeby zrzutów porównawczych: `?seed=7` ustala
   * losowanie, `?terrain=snieg` wymusza krajobraz. Bez tych parametrów gra
   * zachowuje się jak zwykle — losowo.
   */
  private applyHarnessParams() {
    const params = new URLSearchParams(window.location.search);
    const seed = params.get('seed');
    if (seed !== null) Phaser.Math.RND.sow([seed]);
    const wanted = params.get('terrain');
    const found = TERRAINS.find((t) => t.key === wanted);
    if (found) this.terrain = found;
    // Zrzuty porównawcze muszą pokazywać tę samą bitwę między rundami, więc
    // przy wymuszonym krajobrazie ustawiamy też stałe frakcje. Bez tego każdy
    // przebieg harnessu porównywałby inne wojska i nie dałoby się odróżnić
    // zmiany w kodzie od zmiany w losowaniu.
    const frakcje = params.get('frakcje');
    if (frakcje) {
      const [a, b] = frakcje.split(',');
      this.playerFaction = factionById(a) ?? this.playerFaction;
      this.enemyFaction = factionById(b) ?? this.enemyFaction;
      return true;
    }
    return found !== undefined;
  }

  /**
   * Losuje bitwę: dwie różne frakcje i układ oddziałów w kolumnie startowej.
   *
   * Bez tego gracz rozgrywa w kółko dokładnie to samo starcie — te same dwa
   * wojska w tej samej kolejności rzędów. Rzędy tasujemy osobno dla każdej
   * strony, więc nawet lustrzane frakcje ustawią się inaczej.
   */
  private drawArmies() {
    const pula = Phaser.Math.RND.shuffle([...FACTIONS]);
    this.playerFaction = pula[0];
    this.enemyFaction = pula[1];
  }

  /** Rzędy startowe w losowej kolejności — osobno dla każdej strony. */
  private startRows() {
    return Phaser.Math.RND.shuffle(rzedyNaPolu(this.naPolu));
  }

  init(dane?: DaneZPrzygody) {
    // `init` dostaje pusty obiekt także przy zwykłym starcie sceny, więc
    // o narzuconym składzie decyduje obecność armii, a nie samego obiektu.
    this.zPrzygody = dane && dane.gracz?.length ? dane : undefined;
    // Bonusy bohatera przypinamy do stanu walki od razu w `init`, a nie przy
    // wystawianiu oddziałów: `zerujBitwe` podmienia cały obiekt i ustawione
    // wcześniej pole by przepadło.

    // Phaser używa TEJ SAMEJ instancji sceny przy każdym `scene.start`, więc
    // pola klasy przeżywają całą poprzednią bitwę. Stan walki powstawał raz,
    // przy tworzeniu obiektu sceny, i nikt go potem nie czyścił: druga bitwa
    // zaczynała się z oddziałami pierwszej w `battle.units`. Ich widoki były
    // już skasowane razem z tamtą sceną, więc `beginTurn` wywracał się na
    // nieżyjącej teksturze napisu i gra zostawała na mapie przygody — bez
    // bitwy i bez sterowania. Stąd pełne zerowanie na wejściu.
    this.battle = {
      units: [],
      obstacles: new Set<string>(),
      roundQueue: [],
      round: 1,
      dealt: new Map(),
      rezerwa: { player: [], enemy: [] },
    };
    this.battle.bonusGracza = this.zPrzygody?.bonusGracza;
    this.roster.clear();
    this.slotyZMapy.clear();
    this.nextId = 1;
    this.preferredApproach = null;
    this.busy = false;
    this.gameOver = false;
  }

  create() {
    this.zerujBitwe();
    const wymuszone = Number(new URLSearchParams(window.location.search).get('naPolu'));
    this.naPolu = this.zPrzygody?.naPolu ?? (wymuszone === 1 || wymuszone === 2 ? wymuszone : NA_POLU);
    // Po `zerujBitwe` — nie przed: ta metoda podmienia cały obiekt stanu walki,
    // więc bonus ustawiony w `init` przepadał i umiejętności bojowe nie
    // działały ani razu. Wyszło dopiero z sondy, bo w oknie nic tego nie widać.
    this.battle.bonusGracza = this.zPrzygody?.bonusGracza;
    sledzScene(this);
    // Wszystko, co ustala KSZTAŁT bitwy (teren, frakcje, rzędy, przeszkody),
    // idzie przez `Phaser.Math.RND` — generator z wysianym ziarnem sesji.
    // `Phaser.Utils.Array.Shuffle` i `Phaser.Math.Between` sięgają po
    // `Math.random`, więc bitwa nie dawała się powtórzyć nawet z ziarnem,
    // a zgłoszenie błędu było wtedy tylko opowieścią. Efekty wizualne dalej
    // mogą losować swobodnie — one na przebieg walki nie wpływają.
    this.terrain = Phaser.Math.RND.pick(TERRAINS);
    this.drawArmies();
    this.applyHarnessParams();
    // Ikony muszą istnieć, zanim cokolwiek po nie sięgnie — rysują się do
    // tekstur raz, przy starcie sceny.
    buildIcons(this);
    // To samo dotyczy tekstur efektów: iskra i poświata muszą istnieć, zanim
    // padnie pierwszy cios.
    buildEffectTextures(this);
    initSfx(this);
    // Podkład rusza sam, gdy przeglądarka odblokuje dźwięk — czyli przy
    // pierwszym kliknięciu gracza. Szczegóły w src/audio/sfx.ts.
    startMusic(this);
    drawBackground(this);
    drawBoard(this, this.terrain.key);
    this.drawHud();

    this.previewLayer = this.add.container(0, 0).setDepth(4);
    this.highlightLayer = this.add.container(0, 0).setDepth(5);
    this.approachLayer = this.add.container(0, 0).setDepth(6);
    this.effectLayer = this.add.container(0, 0).setDepth(100);

    // Napisy ulotne mają omijać oddziały, więc dajemy warstwie efektów wgląd
    // w to, gdzie kto stoi. Pas -46..+30 od środka pola to sylwetka razem
    // z nazwą u góry i kapsułką życia pod nogami — czyli wszystko, czego
    // zasłonić nie wolno.
    setLabelObstacles(this, () =>
      this.units.map((u) => {
        const p = this.cellToXY(u.col, u.row);
        return new Phaser.Geom.Rectangle(p.x - 46, p.y - 46, 92, 76);
      })
    );

    this.scatterObstacles();

    // Obie armie stoją w jednej kolumnie przy swojej krawędzi, jak w Heroes 3.
    // Kolejność w tablicy to poziomy 1-6, więc drobnica staje u góry, a
    // czempion na dole; strzelcy i piechota wychodzą przy tym na przemian.
    const rzedyGracza = this.startRows();
    const rzedyWroga = this.startRows();
    let czekaNaSklad = false;
    if (this.zPrzygody) {
      // Bitwa z mapy NIE losuje rzędów: oddziały stają w kolejności slotów
      // u bohatera, z góry na dół. Losowanie jest dla bitwy pokazowej, gdzie
      // nie ma żadnego układu do uszanowania — tutaj gracz świadomie ustawia
      // armię na swoim ekranie i chce ją zobaczyć tak samo na polu walki.
      czekaNaSklad = this.wystawZPrzygody();
    } else {
      // Bitwa pokazowa: po trzy losowe stworki z każdej frakcji, na
      // poziomie 5 — na polu stoi `naPolu`, reszta czeka w pokeballach.
      const trojka = (f: Faction) => Phaser.Math.RND.shuffle([...f.units]).slice(0, 3);
      trojka(this.playerFaction).forEach((def, i) =>
        i < this.naPolu
          ? this.spawnUnit({ ...def, poziom: 5 }, 'player', 0, rzedyGracza[i])
          : this.spawnUnit({ ...def, poziom: 5 }, 'player', -1, -1, false)
      );
      trojka(this.enemyFaction).forEach((def, i) =>
        i < this.naPolu
          ? this.spawnUnit({ ...def, poziom: 5 }, 'enemy', COLS - 1, rzedyWroga[i])
          : this.spawnUnit({ ...def, poziom: 5 }, 'enemy', -1, -1, false)
      );
      this.rysujDruzyny();
    }

    this.input.keyboard?.on('keydown-C', () => this.waitTurn());
    this.input.keyboard?.on('keydown-O', () => this.guardTurn());
    this.input.keyboard?.on('keydown-ONE', () => this.wybierzAtak(0));
    this.input.keyboard?.on('keydown-TWO', () => this.wybierzAtak(1));
    this.input.keyboard?.on('keydown-THREE', () => this.wybierzAtak(2));
    this.input.keyboard?.on('keydown-P', () => (this.oknoPlecaka ? this.zamknijPlecak() : this.otworzPlecak()));
    this.input.keyboard?.on('keydown-ESC', () => {
      if (this.oknoPlecaka) this.zamknijPlecak();
      else if (this.celowanie) this.anulujCelowanie();
    });
    this.input.on('pointerdown', (p: Phaser.Input.Pointer) => {
      if (p.rightButtonDown() && this.celowanie) this.anulujCelowanie();
    });
    // Wyciszenie. Dźwięku nie da się przeczekać wzrokiem jak animacji — kto go
    // nie chce, musi mieć czym wyłączyć od razu, bez wchodzenia w ustawienia.
    this.input.keyboard?.on('keydown-M', () => {
      const wlaczony = toggleSfx(this);
      floatLabel(this, this.effectLayer, {
        x: this.scale.width / 2,
        y: 96,
        text: wlaczony ? 'Dźwięk włączony  (M)' : 'Dźwięk wyciszony  (M)',
        color: '#cfd8dc',
      });
    });

    zapisz('bitwa', 'start', {
      gracz: this.playerFaction.id,
      wrog: this.enemyFaction.id,
      teren: this.terrain.key,
      zMapy: this.zPrzygody !== undefined,
      oddzialy: this.units.map((u) => `${u.side}:${u.def.sprite}×${u.count}`),
    });
    // Migawka trafia do raportu w chwili jego składania, więc pokazuje stan
    // z momentu zgłoszenia błędu, a nie sprzed bitwy.
    migawkaStanu('bitwa', () =>
      this.scene.isActive()
        ? {
            runda: this.battle.round,
            koniec: this.gameOver,
            kolejka: this.battle.roundQueue,
            oddzialy: this.units.map((u) => ({
              id: u.id,
              strona: u.side,
              kto: u.def.sprite,
              ile: u.count,
              hpPrzedniego: u.topHp,
              pole: `${u.col},${u.row}`,
            })),
          }
        : undefined
    );

    // Okno „Kto walczy?" jeszcze otwarte — walka rusza po jego zatwierdzeniu.
    if (czekaNaSklad) return;
    startRound(this.battle);
    this.beginTurn();
  }

  /**
   * Rozrzuca przeszkody po środkowej części planszy. Skrajne kolumny zostają
   * wolne, żeby oddziały miały gdzie stanąć, a po każdej dostawionej przeszkodzie
   * sprawdzamy, czy piechota nadal przejdzie z jednej strony na drugą — inaczej
   * bitwa zamieniłaby się w oblężenie muru.
   */
  private scatterObstacles() {
    const candidates: Cell[] = [];
    for (let row = 0; row < ROWS; row++) {
      for (let col = 2; col <= COLS - 3; col++) candidates.push({ col, row });
    }
    Phaser.Math.RND.shuffle(candidates);

    const wanted = Phaser.Math.RND.between(OBSTACLES_MIN, OBSTACLES_MAX);
    const placed: Cell[] = [];
    for (const cell of candidates) {
      if (placed.length >= wanted) break;
      const key = cellKey(cell.col, cell.row);
      this.obstacles.add(key);
      if (this.sidesConnected()) placed.push(cell);
      else this.obstacles.delete(key);
    }

    for (const cell of placed) {
      const { x, y } = this.cellToXY(cell.col, cell.row);
      const kind = Phaser.Math.RND.pick(this.terrain.obstacles);
      // Podstawa ma stanąć na środku hexa, a korona wystawać ponad niego.
      // Drzewo trzyma się pnia u dołu, płaska kępa czy pagórek siedzą środkiem
      // na polu — stąd różne punkty zaczepienia.
      const obstacle = this.add
        .image(x, y, kind)
        .setOrigin(0.5, /^(kopiec|glaz)/.test(kind) ? 0.62 : 0.78);
      // Skalujemy z zachowaniem proporcji: drzewa są wysokie, głazy przysadziste,
      // więc sztywny rozmiar spłaszczyłby jedne albo rozciągnął drugie.
      const big = !isSmallObstacle(kind);
      const fit = Math.min(
        (HEX_W * (big ? 0.9 : 0.46)) / obstacle.width,
        (HEX_W * (big ? 1.45 : 0.5)) / obstacle.height
      );
      obstacle.setScale(fit * Phaser.Math.FloatBetween(0.92, 1.06));

      // Korona drzewa z górnego rzędu wychodziła ponad ramę na pasek stanu tury.
      // Skracamy ją proporcjonalnie zamiast przycinać — ucięte drzewo wyglądałoby
      // jak błąd rysowania, niższe wygląda po prostu na młodsze.
      const top = y - obstacle.displayHeight * obstacle.originY;
      const limit = BOARD_Y + 8;
      if (top < limit) obstacle.setScale(obstacle.scaleX * ((y - limit) / (y - top)));

      obstacle.setDepth(10 + cell.row - 0.5);
      drawObstacleShadow(this, x, y, HEX_W * (big ? 0.5 : 0.3));
    }
  }

  /** Czy piechota przejdzie od lewej krawędzi planszy do prawej. */
  private sidesConnected() {
    const seen = new Set<string>();
    const queue: Cell[] = [];
    for (let row = 0; row < ROWS; row++) {
      const key = cellKey(0, row);
      seen.add(key);
      queue.push({ col: 0, row });
    }
    while (queue.length > 0) {
      const cur = queue.shift()!;
      if (cur.col === COLS - 1) return true;
      for (const n of neighbours(cur)) {
        const key = cellKey(n.col, n.row);
        if (seen.has(key) || this.obstacles.has(key)) continue;
        seen.add(key);
        queue.push(n);
      }
    }
    return false;
  }

  private drawHud() {
    this.drawTopBar();
    this.drawBottomBar();
    this.drawStatCard();
  }

  /** Górna belka: tytuł, wstęgi zamków, zdanie o turze i pasek kolejki. */
  private drawTopBar() {
    // Górna belka ma tylko 100 pikseli do ramy planszy, a rama wystaje jeszcze
    // kilka pikseli ponad BOARD_Y. Stąd trzy ciasno upakowane wiersze:
    // tytuł, wstęgi zamków, zdanie o turze.
    // Trener przy polu bitwy — jak bohater Heroes 3 w rogu pola walki.
    // Medalion z głową trenera, a obok tytułu przycisk plecaka (etap 5).
    const kto = this.zPrzygody?.trener?.kto ?? 'janek';
    medalion(this, this.trenerXY.x, this.trenerXY.y, 30, C.panelDeep).setDepth(61);
    const glowa = this.add.image(this.trenerXY.x, this.trenerXY.y + 1, `tr-glowa-${kto}`).setDepth(62);
    glowa.setScale(40 / Math.max(glowa.width, glowa.height));
    glowa.setInteractive({ useHandCursor: true }).on('pointerdown', () => this.otworzPlecak());
    drawTitle(this, TYTUL_X, 0, 'POKÉMON HEROES', 24);
    // Lider sali stoi po drugiej stronie — medalion w prawym rogu, lustrzanie
    // do trenera gracza.
    const przeciwnik = this.zPrzygody?.przeciwnik;
    if (przeciwnik && this.textures.exists(`przeciwnik-${przeciwnik.portret}`)) {
      const px = this.scale.width - this.trenerXY.x + 8;
      medalion(this, px, this.trenerXY.y + 26, 24, C.foeDeep).setDepth(61);
      const twarz = this.add.image(px, this.trenerXY.y + 25, `przeciwnik-${przeciwnik.portret}`).setDepth(62);
      twarz.setScale(36 / Math.max(twarz.width, twarz.height));
    }
    this.plecakButton = makeHudButton(this, {
      x: TYTUL_X + 316,
      y: 17,
      w: 138,
      h: 28,
      icon: ICON.star,
      tone: C.gold,
      toneDeep: C.goldDeep,
      onClick: () => (this.oknoPlecaka ? this.zamknijPlecak() : this.otworzPlecak()),
    });
    this.plecakButton.setLabel('Plecak  (P)');

    // Wstęg z nazwami zamków i kaflem terenu tu NIE MA — świadomie.
    //
    // Trzy kafle zajmowały cały wiersz górnej belki, żeby powtórzyć rzeczy,
    // które gracz i tak widzi: strony rozróżnia barwa oddziałów (ta sama, co
    // na wstędze), a teren widać na planszy, bo się po nim chodzi. Nazwa
    // zamku nie wpływa na żadną decyzję w bitwie — to podpis pod obrazkiem.
    // Miejsce po nich idzie na zdanie o turze, które jest instrukcją, a nie
    // podpisem.

    // Zdanie o turze z konturem, bo leży wprost na tle, nie na panelu.
    this.turnText = this.add.text(TYTUL_X, 52, '', display(15)).setOrigin(0, 0.5);

    this.queue = createTurnQueue(this, BOARD_X + BOARD_W, 24);
  }

  /**
   * Dolny PASEK. Jedna linia tekstu kontekstowego po lewej — domyślnie
   * podpowiedź, a przy celowaniu prognoza obrażeń — i dwa przyciski po prawej.
   * Nic więcej: statystyki mają swoją kartę, a pasek ma się mieścić na ekranie.
   */
  private drawBottomBar() {
    drawPanelBody(this, BAR_X, BAR_Y, BAR_W, BAR_H, BAR_INSET);

    const kapsula = createForecast(
      this,
      CONTENT_X,
      FORECAST_Y,
      FORECAST_W,
      FORECAST_H,
      MINI.forecast,
      'Kliknij pole, by podejść, albo wroga, by zaatakować  ·  M wycisza dźwięk'
    );
    this.pasekAtakow = createPasekAtakow(this, CONTENT_X, BTN_Y, FORECAST_W, BTN_H, (i) => this.wybierzAtak(i));
    this.pasekAtakow.setVisible(false);
    // Prognoza i pasek ataków dzielą jedno miejsce: prognoza, gdy celujemy,
    // pasek, gdy gracz ma turę i jeszcze nie celuje.
    this.forecast = {
      show: (text, deadly) => {
        this.pasekAtakow?.setVisible(false);
        kapsula.setVisible?.(true);
        kapsula.show(text, deadly);
      },
      hide: () => {
        this.prognozaDla = null;
        kapsula.hide();
        const ataki = this.atakiWidoczne();
        kapsula.setVisible?.(!ataki);
        this.pasekAtakow?.setVisible(ataki);
      },
    };

    const guardX = CONTENT_R - BTN_W / 2;
    const waitX = guardX - BTN_W - BTN_GAP;
    this.waitButton = makeHudButton(this, {
      x: waitX,
      y: BTN_Y,
      w: BTN_W,
      h: BTN_H,
      icon: ICON.hourglass,
      tone: C.ally,
      toneDeep: C.allyDeep,
      onClick: () => this.waitTurn(),
    });
    this.guardButton = makeHudButton(this, {
      x: guardX,
      y: BTN_Y,
      w: BTN_W,
      h: BTN_H,
      icon: ICON.shield,
      tone: C.gold,
      toneDeep: C.goldDeep,
      onClick: () => this.guardTurn(),
    });
  }

  /**
   * KARTA ODDZIAŁU NA ŻĄDANIE.
   *
   * To ta sama tabela, co dotąd w dolnym panelu — te same pasma, ten sam pas
   * z nazwą w barwie strony — tylko przeniesiona nad planszę i zwinięta do
   * jednej kolumny. Wyskakuje po najechaniu na dowolny oddział, a bez kursora
   * pokazuje tego, kto ma turę, żeby gracz nigdy nie został bez informacji
   * o samym sobie.
   *
   * Cała karta siedzi w jednym kontenerze, więc jej współrzędne są lokalne
   * i przestawienie jej na drugą krawędź planszy to jedno `setX`.
   */
  private drawStatCard() {
    // Karta jest domyślnie SCHOWANA i to jest jej najważniejsza cecha.
    //
    // Pierwsza wersja pokazywała ją zawsze — dla oddziału, który ma turę —
    // więc wisiała na ekranie bez przerwy i przykrywała kilka pól z armią
    // przeciwnika. To ten sam problem, od którego uciekaliśmy, tylko
    // przeniesiony z dołu ekranu na bok: informacja pomocnicza zasłaniała
    // stan gry. W Heroes 3 statystyk nie widać domyślnie NIGDY — pojawiają
    // się na żądanie i znikają, gdy przestajesz pytać. Tak samo tutaj:
    // karta wychodzi na najechanie i chowa się, gdy kursor zejdzie.
    // Kto ma turę, mówi zdanie w górnej belce, nie karta.
    this.card = this.add.container(CARD_RIGHT_X, CARD_Y).setDepth(90).setAlpha(0.94);
    this.card.setVisible(false);

    drawPanelBody(this, 0, 0, CARD_W, CARD_H, CARD_INSET, this.card);

    this.headBand = this.add.graphics().setDepth(61);
    this.headIcon = icon(
      this,
      ICON.flame,
      CARD_CONTENT_X + 8 + HEAD_H / 2,
      HEAD_Y + HEAD_H / 2,
      HEAD_H - 6
    ).setDepth(62);
    this.headName = this.add
      .text(CARD_CONTENT_X + 14 + HEAD_H, HEAD_Y + HEAD_H / 2, '', {
        ...display(15),
        strokeThickness: 3.5,
      })
      .setOrigin(0, 0.5)
      .setDepth(62);
    this.headMeta = this.add
      .text(CARD_CONTENT_X + CARD_CONTENT_W - 10, HEAD_Y + HEAD_H / 2, '', body(12, H.white))
      .setOrigin(1, 0.5)
      .setDepth(62);
    this.card.add([this.headBand, this.headIcon, this.headName, this.headMeta]);

    // Osiem pasm jedno pod drugim; zebra nadal liczy się z miejsca w kolumnie,
    // nie ze znaczenia wiersza.
    const slots: StatSlot[] = [];
    for (let i = 0; i < 8; i++) {
      slots.push({
        x: CARD_CONTENT_X,
        y: ROWS_Y + i * ROW_STEP_Y,
        w: CARD_CONTENT_W,
        h: ROW_H,
        band: (i % 2) as 0 | 1,
      });
    }
    // Umiejętność zostaje wstęgą POD tabelą: inna geometria i brak zebry mówią,
    // że to podpis do tabeli, a nie jej dziewiąty wiersz.
    slots.push({
      x: CARD_CONTENT_X,
      y: ROWS_Y + 8 * ROW_STEP_Y,
      w: CARD_CONTENT_W,
      h: ROW_H,
      ribbon: true,
    });
    this.stats = createStatTable(this, slots, this.card);
  }

  /**
   * Karta nie może zasłaniać oddziału, który opisuje. Oddział z lewej połowy
   * planszy dostaje kartę przy prawej krawędzi i odwrotnie — tak samo jak
   * w Heroes 3 okno statystyk odsuwa się od klikniętego stworka.
   */
  private placeCard(unit: Unit) {
    this.card.setX(unit.col < COLS / 2 ? CARD_RIGHT_X : CARD_LEFT_X);
  }

  // ---------- jednostki ----------

  private cellToXY(col: number, row: number) {
    return cellToXY(col, row);
  }

  /** Obszar kliknięcia w kształcie hexa — prostokąt zachodziłby na sąsiadów. */
  private hexHitArea() {
    return new Phaser.Geom.Polygon(hexPoints(HEX_W / 2, HEX_H / 2));
  }

  /**
   * Wystawia oddziały podane przez mapę. Liczebność bierzemy z mapy, a resztę
   * statystyk z definicji frakcji — dzięki temu bitwa nie musi znać się na
   * oddziałach, a mapa nie musi przechowywać ich statystyk.
   */
  /** Zwraca `true`, gdy drużyna gracza czeka jeszcze na wybór czwórki. */
  private wystawZPrzygody(): boolean {
    const naPolu = this.naPolu;
    const wystaw = (sklad: (OddzialZMapy | null)[], side: Side, col: number, kolejnosc?: number[]) => {
      // Stado dzikich rozpada się na osobne stworki (`jednostkiBitwy`).
      // Pierwsi `naPolu` stają na polu, reszta czeka w pokeballach i wchodzi
      // po zemdlonym — jak w bajce. Statystyki liczy `defStworka` z gatunku,
      // poziomu i etapu ewolucji.
      let jednostki = jednostkiBitwy(sklad);
      if (kolejnosc) {
        const miejsce = (skad: number) => (kolejnosc.includes(skad) ? kolejnosc.indexOf(skad) : kolejnosc.length + skad);
        jednostki = [...jednostki].sort((x, y) => miejsce(x.skad) - miejsce(y.skad));
      }
      const rzedy = rzedyDlaSkladu(Math.min(naPolu, jednostki.length));
      jednostki.forEach(({ def, skad }, i) => {
        const unit = i < naPolu ? this.spawnUnit(def, side, col, rzedy[i]) : this.spawnUnit(def, side, -1, -1, false);
        // Zapamiętujemy, KTÓRY stworek na planszy odpowiada któremu wpisowi
        // w drużynie. Szukanie go potem po `sprite` wyglądało na
        // wystarczające i nie było: dwa sloty mogą mieć ten sam gatunek.
        if (side === 'player') this.slotyZMapy.set(skad, unit.id);
        else this.wrogZMapy.push({ skad, id: unit.id });
      });
    };
    wystaw(this.zPrzygody!.wrog, 'enemy', COLS - 1);
    // Nazwy stron w ekranie końca biorą się z frakcji, więc dopasowujemy je
    // do tego, kto naprawdę stanął do walki.
    const frakcjaGracza = factionById(this.zPrzygody!.gracz[0]?.frakcja ?? '');
    const frakcjaWroga = factionById(this.zPrzygody!.wrog[0]?.frakcja ?? '');
    if (frakcjaGracza) this.playerFaction = frakcjaGracza;
    if (frakcjaWroga) this.enemyFaction = frakcjaWroga;

    const gracz = this.zPrzygody!.gracz;
    if (gracz.length <= naPolu) {
      wystaw(gracz, 'player', 0);
      this.rysujDruzyny();
      return false;
    }
    // Więcej sprawnych stworków niż miejsc na polu: trener wybiera, kto
    // zaczyna, widząc już przeciwnika. Reszta wchodzi po kolei ze slotów.
    this.busy = true;
    this.setButtonsVisible(false);
    this.turnText.setText(naPolu === 1 ? 'Kto zaczyna walkę?' : 'Kto zaczyna? Wybierz dwójkę');
    this.wyborSkladu = pokazWyborSkladu(
      this,
      gracz.map((o, skad) => ({ skad, sprite: o.sprite, nazwa: o.nazwa, poziom: o.poziom })),
      naPolu,
      { x: BOARD_X, y: BOARD_Y, w: BOARD_W, h: BOARD_H },
      (wybrane) => {
        this.wyborSkladu = undefined;
        wystaw(gracz, 'player', 0, wybrane);
        this.rysujDruzyny();
        this.busy = false;
        startRound(this.battle);
        this.beginTurn();
      }
    );
    return true;
  }

  /**
   * Drużyny pod planszą: po pokeballu na każdego stworka strony. Ci na polu
   * i w pokeballach — pełny, zemdleni — szary. Jak pasek drużyny w grach
   * z pokemonami: od razu widać, ilu jeszcze zostało.
   */
  private rysujDruzyny() {
    this.druzynyWarstwa?.destroy();
    const w = this.add.container(0, 0).setDepth(20);
    this.druzynyWarstwa = w;
    const rysuj = (side: Side) => {
      const wszyscy = [...this.roster.values()].filter((u) => u.side === side).sort((a, b) => a.id - b.id);
      if (wszyscy.length === 0) return;
      const R = 11;
      const krok = 2 * R + 6;
      const lewa = side === 'player';
      const x0 = lewa ? BOARD_X + 16 + R : BOARD_X + BOARD_W - 16 - R;
      const podpis = this.add
        .text(lewa ? BOARD_X + 10 : BOARD_X + BOARD_W - 10, DRUZYNY_Y - 22, lewa ? 'Twoja drużyna' : this.zPrzygody?.przeciwnik?.imie ?? (this.dzikie ? 'Dzikie stworki' : 'Przeciwnik'), body(12, H.white))
        .setOrigin(lewa ? 0 : 1, 0.5)
        .setShadow(1, 1, '#000', 2, false, true);
      w.add(podpis);
      wszyscy.forEach((u, i) => {
        const x = lewa ? x0 + i * krok : x0 - i * krok;
        const sprawny = this.naNogach(u.id);
        const kula = this.add.image(x, DRUZYNY_Y + 2, 'przedmiot-pokeball');
        kula.setScale((2 * R) / Math.max(kula.width, kula.height));
        if (!sprawny) kula.setTint(0x6d6d6d).setAlpha(0.55);
        w.add(kula);
      });
    };
    rysuj('player');
    rysuj('enemy');
  }

  private spawnUnit(def: UnitDef, side: Side, col: number, row: number, naPole = true) {
    const { x, y } = this.cellToXY(Math.max(0, col), Math.max(0, row));
    const id = this.nextId++;
    const view = buildUnitView(this, {
      spriteKey: def.sprite,
      tier: def.tier,
      name: def.name,
      type: def.type,
      shooter: def.shooter,
      side,
      x,
      y,
      // Identyfikator jest różny dla każdego oddziału, więc wystarcza za
      // ziarno przesunięcia fazy oddechu.
      seed: id,
    });
    view.container.setDepth(10 + row);

    // Wartości startowe oddziału bierzemy z `battle.ts`, żeby nowe pole stanu
    // nie musiało być dopisywane w dwóch miejscach.
    const unit: Unit = { ...makeUnit(def, side, col, row, id), view, container: view.container };
    this.refreshStack(unit);

    const hit = view.hit;
    hit.on('pointerdown', () => this.onUnitClicked(unit));
    hit.on('pointerover', () => this.onUnitHover(unit));
    hit.on('pointermove', (p: Phaser.Input.Pointer) => this.onEnemyPointerMove(unit, p));
    hit.on('pointerout', () => {
      this.forecast.hide();
      this.clearApproach();
      this.setCursor(null);
      this.clearMovePreview();
      // Kursor zszedł z oddziału — pytanie się skończyło, karta znika.
      this.hideStats();
    });

    if (naPole) this.units.push(unit);
    else {
      // Czeka w pokeballu: istnieje (ma identyfikator i wygląd), ale nie stoi
      // na polu, dopóki `wejdzZmiennik` go nie wpuści.
      unit.col = -1;
      unit.row = -1;
      unit.container.setVisible(false);
      this.rezerwa[side].push(unit);
    }
    this.roster.set(id, unit);
    return unit;
  }

  private unitById(id: number) {
    return this.roster.get(id)!;
  }

  /** Pasek, licznik, tarcza i odznaka ataku po każdej zmianie stanu oddziału. */
  private refreshStack(unit: Unit) {
    refreshUnitView(unit.view, {
      count: unit.count,
      poziom: unit.def.poziom,
      hp: total(unit),
      maxHp: fullHp(unit.def),
      atk: stackAtk(unit.def, unit),
      defending: unit.defending,
    });
  }

  // ---------- kolejka tur ----------

  private buildQueueIcons() {
    const entries = this.roundQueue
      .map((id) => this.units.find((u) => u.id === id))
      .filter((u): u is Unit => !!u)
      .map((u) => {
        const { color, deep } = sideAccent(u.side);
        return { spriteKey: u.def.sprite, accent: color, deep };
      });
    this.queue.update(entries, this.battle.round);
  }

  // ---------- przebieg tury ----------

  private activeUnit(): Unit | undefined {
    return this.units.find((u) => u.id === this.roundQueue[0]);
  }

  private beginTurn() {
    if (this.gameOver) return;
    this.celowanie = null;
    this.zamknijPlecak();
    this.clearHighlights();
    this.busy = false;

    // Wyrzuć z kolejki poległych, a po wyczerpaniu rundy zacznij następną.
    while (this.roundQueue.length > 0 && !this.units.some((u) => u.id === this.roundQueue[0])) {
      this.roundQueue.shift();
    }
    if (this.roundQueue.length === 0) {
      this.battle.round++;
      startRound(this.battle);
    }

    const unit = this.activeUnit();
    if (!unit) return;

    // Obrona trzyma tylko do własnej następnej kolejki.
    unit.defending = false;
    this.refreshStack(unit);

    // Kto ma turę, dostaje złoty podest i pulsujący pierścień; reszta wraca
    // do barwy swojej strony.
    this.units.forEach((u) => setUnitActive(this, u.view, u.id === unit.id));

    this.turnText.setText(
      unit.side === 'player'
        ? `Twoja tura: ${unit.def.name} — kliknij pole, by podejść, albo wroga, by zaatakować`
        : this.zPrzygody?.przeciwnik
          ? `${this.zPrzygody.przeciwnik.imie}: ${unit.def.name}, naprzód!`
          : `Tura przeciwnika: ${unit.def.name}`
    );

    this.buildQueueIcons();
    // Nowa tura NIE otwiera karty — patrz komentarz przy `this.card`.
    // Kto się rusza, mówi zdanie w górnej belce.
    this.hideStats();

    if (unit.side === 'enemy') {
      this.setButtonsVisible(false);
      this.time.delayedCall(600, () => this.enemyTurn(unit));
    } else {
      this.setButtonsVisible(true);
      this.updateButtons(unit);
      // Każda tura zaczyna się od zwykłego ataku — specjalny trzeba wybrać,
      // żeby nie wystrzelać PP jednym nieuważnym kliknięciem.
      this.wybranyAtak = 0;
      this.odswiezAtaki();
      this.showOptions(unit);
    }
  }

  private advanceTurn() {
    if (this.gameOver) return;
    this.roundQueue.shift();
    this.beginTurn();
  }

  /** Przeczekanie: oddział wraca na koniec kolejki tej samej rundy. */
  private waitTurn() {
    if (this.gameOver || this.busy) return;
    const unit = this.activeUnit();
    if (!unit || unit.side !== 'player' || unit.waited) return;

    unit.waited = true;
    this.roundQueue.shift();
    this.roundQueue.push(unit.id);
    this.floatText(unit, 'Czekam', '#cfd8dc', -46, ICON.hourglass);
    this.beginTurn();
  }

  /** Obrona: rezygnujemy z ruchu, ale do następnej kolejki obrywamy słabiej. */
  private guardTurn() {
    if (this.gameOver || this.busy) return;
    const unit = this.activeUnit();
    if (!unit || unit.side !== 'player') return;

    this.busy = true;
    this.clearHighlights();
    unit.defending = true;
    this.refreshStack(unit);
    this.floatText(unit, 'Obrona', '#9ce0ff', -46, ICON.shield);
    this.time.delayedCall(500, () => this.advanceTurn());
  }

  /**
   * Panel oddziału. Wcześniej było to siedem linii ciągłego tekstu z emoji —
   * gracz musiał je czytać zdanie po zdaniu, żeby znaleźć jedną liczbę. Teraz
   * każda wartość ma stałe miejsce w tabeli i stałą barwę pasma, więc szuka
   * się jej wzrokiem, a nie czytaniem.
   */
  /** Chowa kartę oddziału. Domyślny stan ekranu to plansza bez niczego na wierzchu. */
  private hideStats() {
    this.card.setVisible(false);
  }

  private showStats(unit: Unit) {
    const t = TYPE_INFO[unit.def.type];
    const { strong, weak } = typeMatchup(unit.def.type);
    const strongInfo = TYPE_INFO[strong];
    const weakInfo = TYPE_INFO[weak];
    const { color: accent, deep } = sideAccent(unit.side);

    // Pas z nazwą w barwie strony — czyje to jest, widać, zanim się cokolwiek
    // przeczyta.
    this.placeCard(unit);
    this.card.setVisible(true);
    this.headBand.clear();
    plate(this.headBand, CARD_CONTENT_X, HEAD_Y, CARD_CONTENT_W, HEAD_H, HEAD_H * 0.36, accent, deep, {
      light: 0.32,
      dark: 0.28,
      gloss: 0.26,
      drop: 2,
    });
    this.headIcon.setTexture(TYPE_ICON[unit.def.type]).setDisplaySize(HEAD_H - 6, HEAD_H - 6);
    this.headName.setText(unit.count > 1 ? `${unit.def.name} ×${unit.count}` : unit.def.name);
    // W wąskiej karcie nie ma miejsca na „twój oddział / oddział przeciwnika":
    // to samo mówi barwa pasa z nazwą, ta sama co plakietka pod stworkiem.
    this.headMeta.setText(
      (unit.def.poziom !== undefined ? napisPoziomu(unit.def.poziom) : `ranga ${unit.def.tier}`) +
        (unit.defending ? ' · w obronie' : '')
    );

    // Każdy wiersz ma WŁASNY znak. Wcześniej miecz obsługiwał „Atak", „Zasięg"
    // i prognozę naraz — jeden rysunek na trzy różne pojęcia. Teraz zasięg to
    // tarcza celownicza, atak to miecz, a prognoza ma własny rozbłysk.
    const blocked = unit.def.shooter && !canShoot(this.battle, unit);
    const reach: StatRow = unit.def.shooter
      ? blocked
        ? { label: 'Zasięg', value: 'zablokowany — pół siły', icon: MINI.reach, alert: true }
        : {
            label: 'Zasięg',
            value: `strzela, pełna siła do ${unit.def.shootRange}`,
            icon: MINI.reach,
          }
      : { label: 'Zasięg', value: 'walka wręcz', icon: MINI.reach };

    const retaliation: StatRow =
      unit.def.ability === 'guardian'
        ? { label: 'Odwet', value: 'bez limitu', icon: MINI.retaliate }
        : unit.retaliations > 0
          ? { label: 'Odwet', value: 'gotowy', icon: MINI.retaliate }
          : { label: 'Odwet', value: 'już oddał', icon: MINI.retaliate, alert: true };

    // Ataki z pozostałymi PP — u wroga też, bo to mówi, czym jeszcze uderzy.
    const ability: StatRow = {
      label: 'Ataki',
      value: atakiJednostki(unit)
        .map((a, i) => (a.pp === null ? a.nazwa : `${a.nazwa} ${unit.pp[i] ?? a.pp}/${a.pp}`))
        .join(' · '),
      icon: MINI.ability,
    };

    this.stats.update([
      {
        label: 'Życie',
        value: `${total(unit)} / ${fullHp(unit.def)}`,
        icon: MINI.life,
      },
      {
        label: 'Atak',
        value:
          unit.count > 1
            ? `${unit.count} × ${unit.def.atk} = ${stackAtk(unit.def, unit)}`
            : `${unit.def.atk}${unit.eliksir ? ` (eliksir ×${SILA_ELIKSIRU})` : ''}`,
        icon: MINI.attack,
      },
      {
        label: 'Ruch',
        value: unit.def.flying ? `${unit.def.move} — lata` : `${unit.def.move}`,
        icon: unit.def.flying ? MINI.fly : MINI.move,
      },
      reach,
      // Barwa żywiołu wchodzi tylko w znak i tylko w postaci stonowanej —
      // pasmo zostaje takie samo jak w każdym innym wierszu.
      { label: 'Żywioł', value: t.label, icon: MINI_TYPE[unit.def.type], mark: t.color },
      {
        label: 'Mocny przeciw',
        value: `${strongInfo.dative} ×${TYPE_STRONG}`,
        icon: MINI.strong,
        mark: strongInfo.color,
      },
      {
        label: 'Słaby wobec',
        value: `${weakInfo.genitive} ×${TYPE_STRONG}`,
        icon: MINI.weak,
        alert: true,
      },
      retaliation,
      ability,
    ]);

    blinkPanel(this, this.headBand);
  }

  // ---------- zasięg ruchu i cele ----------

  // ---------- interakcja gracza ----------

  private showOptions(unit: Unit) {
    this.clearHighlights();
    const reach = reachable(this.battle, unit);

    // Jedna warstwa Graphics na wszystkie podświetlenia: rysuje we
    // współrzędnych planszy, więc hexy siadają dokładnie na siatce.
    const g = this.add.graphics();
    this.highlightLayer.add(g);
    pulse(this, g);

    for (const [key, cost] of reach) {
      if (cost === 0) continue;
      const [col, row] = key.split(',').map(Number);
      paintMoveCell(g, col, row);
      this.addHighlight(col, row, () => this.performMove(unit, { col, row }));
    }

    for (const target of this.units.filter((u) => u.side !== unit.side)) {
      const plan = attackPlan(this.battle, unit, target, reach);
      if (!plan) continue;
      // Złoty obrys znaczy cel, do którego strzał doleci osłabiony.
      const { tooFar } = damageOf(this.battle, unit, target);
      paintAttackCell(g, target.col, target.row, tooFar);
      this.addHighlight(
        target.col,
        target.row,
        () => this.attackTarget(unit, target),
        () => this.showForecast(unit, target)
      );
    }
  }

  /** Samo pole kliknięcia — wygląd pola maluje moduł planszy. */
  private addHighlight(col: number, row: number, onClick: () => void, onHover?: () => void) {
    const { x, y } = this.cellToXY(col, row);
    const zone = this.add
      .zone(x, y, HEX_W, HEX_H)
      .setInteractive(this.hexHitArea(), Phaser.Geom.Polygon.Contains);
    zone.input!.cursor = 'pointer';

    zone.on('pointerdown', onClick);
    if (onHover) {
      zone.on('pointerover', onHover);
      zone.on('pointerout', () => this.forecast.hide());
    }
    this.highlightLayer.add(zone);
  }

  /**
   * Sprząta warstwę razem z jej pulsowaniem. Sam removeAll zostawiłby tween
   * celujący w zniszczony obiekt.
   */
  private wipeLayer(layer?: Phaser.GameObjects.Container) {
    if (!layer) return;
    this.tweens.killTweensOf(layer.list);
    layer.removeAll(true);
  }

  private clearApproachGraphics() {
    this.wipeLayer(this.approachLayer);
  }

  private clearHighlights() {
    this.clearMovePreview();
    this.wipeLayer(this.highlightLayer);
    this.clearApproachGraphics();
    this.preferredApproach = null;
    this.forecast?.hide();
    this.setCursor(null);
  }

  private showForecast(attacker: Unit, target: Unit) {
    const nrAtaku = attacker.side === 'player' && atakDostepny(attacker, this.wybranyAtak) ? this.wybranyAtak : 0;
    const atak = atakiJednostki(attacker)[nrAtaku];
    const { value: jeden, base, moc, typeMult, penalty, pinned, tooFar, guarded } =
      damageOf(this.battle, attacker, target, nrAtaku);
    // Podwójny cios to dwa trafienia tej samej siły — prognoza mówi o obu.
    const podwojny = atak?.efekt === 'podwojny';
    const value = podwojny ? jeden * 2 : jeden;
    const kills = value >= total(target) ? target.count : 0;
    // Zaczynamy od liczebności razy atak — stąd bierze się siła oddziału.
    // Bez sumy pośredniej: przy braku mnożników wychodziło „= 15 = 15", co
    // wyglądało na błąd rachunku.
    void base;
    const parts = [
      `${atak?.nazwa ?? 'Atak'}:`,
      attacker.count > 1 ? `Atak ${attacker.count} × ${attacker.def.atk}` : `Atak ${attacker.def.atk}`,
    ];
    if (moc !== 1) parts.push(`× ${moc} (siła ataku)`);
    if (podwojny) parts.push('× 2 (dwa ciosy)');
    if (typeMult !== 1) parts.push(`× ${typeMult} (${typeMult > 1 ? 'przewaga typu' : 'słaby typ'})`);
    if (pinned) parts.push('× 0.5 (zablokowany strzelec bije wręcz)');
    else if (tooFar) parts.push('× 0.5 (za daleko — złamana strzała)');
    if (guarded) parts.push(`× ${GUARD_REDUCTION} (cel w obronie)`);
    void penalty;

    // Stworek nie „traci ludzi" — albo wytrzyma, albo zemdleje. Przy
    // pojedynczym stworku mówimy więc, ile życia mu zostanie.
    const zostanie = Math.max(0, total(target) - value);
    const outcome =
      kills >= target.count
        ? target.count > 1
          ? `— całe stado ${target.def.name} zemdleje`
          : `— ${target.def.name} zemdleje`
        : target.count > 1 && kills > 0
          ? `dla ${target.def.name} — ${fellPhrase(kills)} z ${target.count}`
          : `dla ${target.def.name} — zostanie ${zostanie} życia`;
    this.forecast.show(
      `${parts.join(' ')} = ${value} ${damageWord(value)} ${outcome}`,
      kills >= target.count
    );
    this.prognozaDla = { a: attacker, t: target };
  }

  /**
   * Dokąd ten oddział dojdzie w swojej kolejce. Rysujemy sam obrys, żeby nie
   * mylił się z pełnym podświetleniem pól jednostki, która ma turę teraz.
   */
  private showMovePreview(unit: Unit) {
    this.clearMovePreview();
    const g = this.add.graphics();
    const color = unit.side === 'player' ? C.ally : C.foe;
    for (const [key, cost] of reachable(this.battle, unit)) {
      if (cost === 0) continue;
      const [col, row] = key.split(',').map(Number);
      paintPreviewCell(g, col, row, color);
    }
    this.previewLayer.add(g);
  }

  private clearMovePreview() {
    this.wipeLayer(this.previewLayer);
  }

  private onUnitHover(unit: Unit) {
    if (this.gameOver) return;
    if (this.celowanie) {
      this.showStats(unit);
      this.prognozaPrzedmiotu(unit);
      return;
    }
    const active = this.activeUnit();
    const canAttack =
      !!active &&
      !this.busy &&
      active.side === 'player' &&
      unit.side !== active.side &&
      !!attackPlan(this.battle, active, unit, reachable(this.battle, active));

    // Zasięg ruchu pokazujemy tylko wtedy, gdy nie celujemy. Przy wrogu na
    // wyciągnięcie ręki liczy się kursor ataku i prognoza, a nie to, dokąd on
    // dojdzie — dwa podświetlenia naraz tylko przeszkadzały. Pomijamy też
    // oddział, który ma turę: ten ma już narysowane pełne pola ruchu.
    if (unit.id !== active?.id && !canAttack) this.showMovePreview(unit);

    // Najechanie na kogokolwiek pokazuje jego kartę — także wroga w zasięgu.
    //
    // Była tu przez chwilę reguła „karta ALBO prognoza": przy wrogu w zasięgu
    // karta się chowała, bo miało to być celowanie, a nie studiowanie. To był
    // błąd. Żeby zdecydować, CZY atakować, trzeba wiedzieć, ile ten oddział ma
    // życia, jaki ma żywioł i czy ma gotowy odwet — a to jest właśnie treść
    // karty. Reguła zabierała te dane dokładnie w chwili, w której zapada
    // decyzja. Prognoza mówi „ile mu zabiorę", karta mówi „i co mi za to
    // zrobi"; jedno bez drugiego nie wystarcza.
    this.showStats(unit);
    if (canAttack) this.showForecast(active!, unit);
  }

  private onUnitClicked(unit: Unit) {
    if (this.gameOver || this.busy) return;
    if (this.celowanie) {
      this.uzyjNa(unit);
      return;
    }
    const active = this.activeUnit();
    if (!active || active.side !== 'player') return;

    if (unit.side === 'enemy') {
      this.attackTarget(active, unit);
      return;
    }
    this.showStats(unit);
  }

  /** Atakuje z pola wskazanego kursorem, a gdy go nie ma — z pola wyliczonego. */
  private attackTarget(attacker: Unit, target: Unit) {
    const plan = attackPlan(this.battle, attacker, target, reachable(this.battle, attacker));
    if (!plan) return;
    const chosen =
      this.preferredApproach && this.preferredApproach.targetId === target.id
        ? this.preferredApproach.cell
        : plan.from;
    this.setCursor(null);
    this.resolveAttack(attacker, target, chosen, this.wybranyAtak);
  }

  private cursorFor(name: string) {
    return `url('${import.meta.env.BASE_URL}cursors/${name}.png') 16 16, pointer`;
  }

  private setCursor(name: string | null) {
    this.input.setDefaultCursor(name ? this.cursorFor(name) : 'default');
  }

  /** Które pola sąsiadujące z celem da się wykorzystać do ataku wręcz. */
  private approachOptions(attacker: Unit, target: Unit): Cell[] {
    const reach = reachable(this.battle, attacker);
    return neighbours(target).filter(
      (c) => (c.col === attacker.col && c.row === attacker.row) || reach.has(cellKey(c.col, c.row))
    );
  }

  /** Nazwa pazura zależy od tego, z której strony spada cios — sześć wariantów. */
  private clawFor(from: Cell, target: Unit) {
    const a = this.cellToXY(from.col, from.row);
    const b = this.cellToXY(target.col, target.row);
    const deg = Phaser.Math.RadToDeg(Math.atan2(b.y - a.y, b.x - a.x));
    const names = ['claw_e', 'claw_se', 'claw_sw', 'claw_w', 'claw_nw', 'claw_ne'];
    const index = Math.round(((deg + 360) % 360) / 60) % 6;
    return names[index];
  }

  private onEnemyPointerMove(target: Unit, pointer: Phaser.Input.Pointer) {
    if (this.celowanie) return;
    const active = this.activeUnit();
    if (this.gameOver || this.busy || !active || active.side !== 'player') return;
    if (target.side === active.side) return;

    if (!attackPlan(this.battle, active, target, reachable(this.battle, active))) {
      this.setCursor(null);
      this.clearApproach();
      return;
    }

    if (canShoot(this.battle, active)) {
      const { tooFar } = damageOf(this.battle, active, target);
      this.setCursor(tooFar ? 'bolt_broken' : 'bolt');
      this.clearApproach();
      return;
    }

    // Wybierz stronę ataku po tym, w którą stronę celu odchylony jest kursor —
    // tak jak w Heroes 3, gdzie miecz obracał się zależnie od miejsca najechania.
    const options = this.approachOptions(active, target);
    if (options.length === 0) return;

    const center = this.cellToXY(target.col, target.row);
    const dx = pointer.x - center.x;
    const dy = pointer.y - center.y;

    let best = options[0];
    let bestScore = -Infinity;
    for (const option of options) {
      const p = this.cellToXY(option.col, option.row);
      const vx = p.x - center.x;
      const vy = p.y - center.y;
      const len = Math.hypot(vx, vy) || 1;
      const score = (dx * vx + dy * vy) / len;
      if (score > bestScore) {
        bestScore = score;
        best = option;
      }
    }

    this.preferredApproach = { targetId: target.id, cell: best };
    this.setCursor(this.clawFor(best, target));
    this.showApproachMarker(best);
  }

  private showApproachMarker(cell: Cell) {
    this.clearApproachGraphics();
    const g = this.add.graphics();
    paintApproachCell(g, cell.col, cell.row);
    this.approachLayer.add(g);
    pulse(this, g, 0.75);
  }

  /**
   * Zdejmuje znacznik pola podejścia. Kursora celowo nie rusza: dla strzelca
   * ustawiamy kulę tuż przed tym wywołaniem i skasowałoby ją z powrotem.
   */
  private clearApproach() {
    this.preferredApproach = null;
    this.clearApproachGraphics();
  }

  private setButtonsVisible(visible: boolean) {
    this.waitButton.setVisible(visible);
    this.guardButton.setVisible(visible);
    this.plecakButton?.setEnabled(visible);
  }

  private updateButtons(unit: Unit) {
    // Przeczekać wolno raz na rundę, więc przycisk musi wyglądać na wyłączony,
    // zanim gracz w niego kliknie — sama przygaszona alfa tego nie mówiła.
    this.waitButton.setLabel(unit.waited ? 'Już czekałeś' : 'Czekaj  (C)');
    this.waitButton.setEnabled(!unit.waited);

    this.guardButton.setLabel('Broń się  (O)');
    this.guardButton.setEnabled(true);
  }

  /** Pasek ataków jest na ekranie tylko w turze gracza, poza animacją. */
  private atakiWidoczne(): boolean {
    const a = this.activeUnit();
    return !!a && a.side === 'player' && !this.busy && !this.gameOver;
  }

  private odswiezAtaki() {
    const a = this.activeUnit();
    if (!a || a.side !== 'player' || !this.pasekAtakow) return;
    this.pasekAtakow.pokaz(a.def, a.pp, this.wybranyAtak);
  }

  /** Klik w przycisk ataku albo klawisz 1–3. */
  private wybierzAtak(i: number) {
    if (!this.atakiWidoczne()) return;
    const a = this.activeUnit()!;
    if (!atakDostepny(a, i)) return;
    this.wybranyAtak = i;
    this.odswiezAtaki();
    if (this.prognozaDla) this.showForecast(this.prognozaDla.a, this.prognozaDla.t);
  }

  // ---------- plecak trenera (etap 5) ----------

  /** Dlaczego przedmiotu nie można teraz użyć — albo null, gdy można. */
  private blokadaPrzedmiotu(co: Przedmiot): string | null {
    if (this.przedmiotWRundzie === this.battle.round) return 'już sięgałeś do plecaka w tej rundzie';
    const swoi = this.units.filter((u) => u.side === 'player');
    if (co === 'mikstura') {
      if (this.plecak.mikstura <= 0) return 'mikstury się skończyły';
      if (!swoi.some(moznaLeczyc)) return 'nikt nie jest ranny';
    } else if (co === 'eliksir') {
      if (this.plecak.eliksir <= 0) return 'eliksir już wypity';
      if (!swoi.some(moznaWzmocnic)) return 'wszyscy już po eliksirze';
    } else {
      if (!this.dzikie) return 'stworków innego trenera nie wolno łapać';
      if (!this.units.some((u) => this.celPrzedmiotu('pokeball', u))) return 'masz już każdy z tych gatunków';
      if (this.wolneSloty <= 0) return 'drużyna pełna — nie ma miejsca';
      if (this.pokeballe < KOSZT_RZUTU) return `za mało pokeballi (masz ${this.pokeballe})`;
    }
    return null;
  }

  /** Czy ten stworek może przyjąć wybrany przedmiot. */
  private celPrzedmiotu(co: Przedmiot, u: Unit): boolean {
    if (co === 'pokeball') return u.side === 'enemy' && !this.posiadaneGatunki.has(gatunek(u.def.sprite));
    if (u.side !== 'player') return false;
    return co === 'mikstura' ? moznaLeczyc(u) : moznaWzmocnic(u);
  }

  private otworzPlecak() {
    const a = this.activeUnit();
    if (this.oknoPlecaka || this.gameOver || this.busy || !a || a.side !== 'player') return;
    this.anulujCelowanie(false);
    const wiersze: WierszPlecaka[] = [
      { co: 'mikstura', tekstura: 'przedmiot-mikstura', ile: `× ${this.plecak.mikstura}`, blokada: null },
      { co: 'eliksir', tekstura: 'przedmiot-eliksir', ile: `× ${this.plecak.eliksir}`, blokada: null },
      {
        co: 'pokeball',
        tekstura: 'przedmiot-pokeball',
        ile: `${KOSZT_RZUTU} z ${this.pokeballe}`,
        blokada: null,
      },
    ];
    wiersze.forEach((w) => (w.blokada = this.blokadaPrzedmiotu(w.co)));
    this.oknoPlecaka = pokazPlecak(
      this,
      TYTUL_X + 180,
      34,
      wiersze,
      (co) => this.wybierzPrzedmiot(co),
      () => this.zamknijPlecak()
    );
  }

  private zamknijPlecak() {
    this.oknoPlecaka?.destroy();
    this.oknoPlecaka = undefined;
  }

  /** Przedmiot wybrany — teraz trzeba wskazać, na kogo. */
  private wybierzPrzedmiot(co: Przedmiot) {
    this.zamknijPlecak();
    if (this.blokadaPrzedmiotu(co)) return;
    this.celowanie = co;
    this.clearHighlights();
    const g = this.add.graphics();
    this.highlightLayer.add(g);
    pulse(this, g);
    for (const u of this.units) {
      if (!this.celPrzedmiotu(co, u)) continue;
      if (u.side === 'enemy') paintAttackCell(g, u.col, u.row, false);
      else paintMoveCell(g, u.col, u.row);
    }
    this.turnText.setText(
      co === 'pokeball'
        ? 'Rzuć pokeball: kliknij dzikiego stworka  ·  Esc — anuluj'
        : co === 'mikstura'
          ? 'Mikstura: kliknij swojego rannego stworka  ·  Esc — anuluj'
          : 'Eliksir siły: kliknij swojego stworka  ·  Esc — anuluj'
    );
  }

  /** Esc, prawy klik albo ponowne otwarcie plecaka — wraca zwykła tura. */
  private anulujCelowanie(pokaz = true) {
    if (!this.celowanie) return;
    this.celowanie = null;
    if (pokaz) this.poPrzedmiocie();
  }

  private prognozaPrzedmiotu(u: Unit) {
    const co = this.celowanie;
    if (co === 'pokeball' && u.side === 'enemy' && this.posiadaneGatunki.has(gatunek(u.def.sprite))) {
      this.forecast.show(`Masz już ${u.def.name} — każdego stworka ma się jednego`, false);
      return;
    }
    if (!co || !this.celPrzedmiotu(co, u)) {
      this.forecast.hide();
      return;
    }
    if (co === 'mikstura') {
      const ile = Math.min(fullHp(u.def) - total(u), Math.round(fullHp(u.def) * LECZENIE_MIKSTURY));
      this.forecast.show(`Mikstura: +${ile} życia dla ${u.def.name}`, false);
    } else if (co === 'eliksir') {
      const atk = stackAtk(u.def, u);
      this.forecast.show(
        `Eliksir siły: ${u.def.name} bije mocniej — atak ${atk} → ${Math.round(atk * SILA_ELIKSIRU)}`,
        false
      );
    } else {
      const s = Math.round(szansaZlapania(u) * 100);
      this.forecast.show(
        `Pokeball: szansa ${s}% na złapanie ${u.def.name}${s < 30 ? ' — najpierw go osłab!' : ''}`,
        false
      );
    }
  }

  private uzyjNa(u: Unit) {
    const co = this.celowanie;
    if (!co || !this.celPrzedmiotu(co, u)) return;
    this.celowanie = null;
    this.przedmiotWRundzie = this.battle.round;
    if (co === 'pokeball') {
      this.rzucPokeball(u);
      return;
    }
    if (co === 'mikstura') {
      this.plecak.mikstura--;
      const ile = uzyjMikstury(u);
      this.refreshStack(u);
      flashTarget(this, u.view.sprite, C.hpHigh);
      this.floatText(u, `+${ile} życia`, '#b9f6ca', -52, ICON.star, 19);
    } else {
      this.plecak.eliksir--;
      uzyjEliksiru(u);
      this.refreshStack(u);
      flashTarget(this, u.view.sprite, C.gold);
      this.floatText(u, `Siła ×${SILA_ELIKSIRU}!`, '#ffd166', -52, ICON.sword, 19);
    }
    this.poPrzedmiocie();
  }

  /** Po przedmiocie tura stworka trwa dalej — jak po czarze w Heroes 3. */
  private poPrzedmiocie() {
    const a = this.activeUnit();
    if (!a || a.side !== 'player' || this.gameOver) return;
    this.turnText.setText(`Twoja tura: ${a.def.name} — kliknij pole, by podejść, albo wroga, by zaatakować`);
    this.updateButtons(a);
    this.odswiezAtaki();
    this.showOptions(a);
  }

  /**
   * Rzut pokeballem: lot łukiem od trenera, stworek znika w kuli, kula
   * kołysze się trzy razy — i albo „Złapany!", albo stworek się wyrywa.
   */
  private rzucPokeball(cel: Unit) {
    this.busy = true;
    this.clearHighlights();
    this.pokeballe -= KOSZT_RZUTU;
    this.wydanePokeballe += KOSZT_RZUTU;
    const udane = this.losujRzut() < szansaZlapania(cel);
    const start = this.trenerXY;
    const kon = this.cellToXY(cel.col, cel.row);
    const kula = this.add.image(start.x, start.y, 'przedmiot-pokeball').setDepth(120);
    kula.setScale(30 / kula.width);
    this.turnText.setText(`Rzucasz pokeball w ${cel.def.name}!`);
    const sx = cel.container.scaleX;
    const sy = cel.container.scaleY;

    const wynik = () => {
      if (udane) {
        const zmiennik = zlap(this.battle, cel);
        if (zmiennik) this.time.delayedCall(900, () => this.pokazWejscie(zmiennik as Unit));
        const skad = this.wrogZMapy.find((w) => w.id === cel.id)?.skad ?? -1;
        this.zlapani.push({ skad, id: cel.id });
        this.posiadaneGatunki.add(gatunek(cel.def.sprite));
        this.wolneSloty--;
        cel.container.setVisible(false);
        flashTarget(this, kula, C.gold);
        this.floatText(cel, `Złapany! ${cel.def.name} dołącza do drużyny!`, '#ffe08a', -40, ICON.star, 19);
        this.turnText.setText(`Złapany: ${cel.def.name}!`);
        this.buildQueueIcons();
      } else {
        this.tweens.add({ targets: cel.container, scaleX: sx, scaleY: sy, alpha: 1, duration: 260, ease: 'Back.easeOut' });
        this.floatText(cel, 'Wyrwał się!', '#ff8a80', -52, undefined, 19);
        this.turnText.setText(`${cel.def.name} wyrwał się z pokeballa!`);
      }
      this.tweens.add({
        targets: kula,
        alpha: 0,
        scale: kula.scale * (udane ? 1 : 1.6),
        delay: udane ? 700 : 0,
        duration: 300,
        onComplete: () => kula.destroy(),
      });
      this.time.delayedCall(udane ? 1100 : 700, () => {
        this.busy = false;
        this.checkGameOver();
        if (!this.gameOver) this.poPrzedmiocie();
      });
    };

    // Kołysanie: trzy przechyły, jak w grach z pokemonami.
    const kolysz = () =>
      this.tweens.add({
        targets: kula,
        angle: { from: -22, to: 22 },
        duration: 180,
        yoyo: true,
        repeat: 2,
        delay: 200,
        onComplete: () => {
          kula.setAngle(0);
          wynik();
        },
      });

    this.tweens.addCounter({
      from: 0,
      to: 1,
      duration: 560,
      onUpdate: (tw) => {
        const p = tw.getValue() ?? 0;
        kula.x = start.x + (kon.x - start.x) * p;
        kula.y = start.y + (kon.y - 24 - start.y) * p - Math.sin(p * Math.PI) * 110;
        kula.setAngle(p * 540);
      },
      onComplete: () => {
        kula.setAngle(0);
        flashTarget(this, cel.view.sprite, C.white);
        this.tweens.add({ targets: cel.container, scaleX: 0.1, scaleY: 0.1, alpha: 0, duration: 240 });
        this.tweens.add({ targets: kula, y: kon.y + 6, duration: 320, delay: 200, ease: 'Bounce.easeOut', onComplete: kolysz });
      },
    });
  }

  // ---------- akcje ----------

  /** Sam tween przejścia na pole — stanu nie rusza, ten zmienia `battle.ts`. */
  /**
   * Przejście oddziału na pole — po TRASIE, nie po odcinku.
   *
   * Wcześniej był tu jeden tween z pola startowego wprost na docelowe. Latacz
   * ma tak lecieć i nadal leci, ale piechota szła przez to na ukos przez
   * siatkę i przy ciasnym ustawieniu przechodziła przez inne oddziały.
   * Trasę liczy `movePath` z battle.ts — po tej samej siatce i z tymi samymi
   * blokadami co zasady, więc animacja nie może pokazać drogi, której zasady
   * by nie pozwoliły przejść.
   *
   * `zKol`/`zRzed` to pole, z którego oddział wychodzi. Trzeba je podać
   * jawnie, bo w chwili animowania jego stan wskazuje już cel — dziennik
   * odgrywamy po fakcie.
   */
  private animateMove(
    unit: Unit,
    col: number,
    row: number,
    onDone: () => void,
    zKol = unit.col,
    zRzed = unit.row
  ) {
    // Trasę liczymy od pola wyjścia, więc na czas liczenia udajemy, że oddział
    // tam stoi. Inaczej `movePath` dostałby cel jako punkt startowy i zwrócił
    // pustą trasę.
    const trasa = movePath(
      this.battle,
      { ...unit, col: zKol, row: zRzed } as SimUnit,
      { col, row }
    );
    const kroki = trasa.length > 0 ? trasa : [{ col, row }];

    // Krok słychać raz na przejście, nie raz na pole — dwanaście oddziałów
    // maszerujących co rundę z dźwiękiem na każdym heksie robi z bitwy deptak.
    sfx(this, 'krok');

    // Czas całego przejścia rośnie z długością trasy, ale wolniej niż liniowo:
    // marsz przez pół planszy nie może trwać sześć razy dłużej niż krok obok,
    // bo gracz czeka. Za to nie może też lecieć w stałym czasie, bo wtedy
    // dalekie przejście wygląda jak teleport z rozmyciem.
    //
    // Latacz jest osobnym przypadkiem, bo jego „trasa" to jedno pole — cel.
    // Przy stałym czasie 260 ms przelot przez pół planszy trwał tyle samo co
    // skok na sąsiedni heks, więc falowanie w locie nie miało się kiedy
    // pokazać, a sam przelot wyglądał jak przeskok. Dla niego liczymy czas
    // z FAKTYCZNEJ odległości, nie z liczby kroków.
    const dystans = Math.max(1, hexDistance({ col: zKol, row: zRzed }, { col, row }));
    const naKrok = unit.def.flying
      ? Phaser.Math.Clamp(190 * Math.sqrt(dystans), 240, 760)
      : Phaser.Math.Clamp(300 / Math.sqrt(kroki.length), 90, 260);

    // Chód i lot mają wyglądać inaczej; sam przebieg trasy zostaje bez zmian,
    // dokłada się tylko warstwa przekształceń sylwetki (patrz unitView.ts).
    const lata = !!unit.def.flying;
    beginUnitMove(this, unit.view, lata);

    let i = 0;
    const dalej = () => {
      if (i >= kroki.length) {
        endUnitMove(this, unit.view, lata);
        onDone();
        return;
      }
      const k = kroki[i++];
      // Niższe rzędy zasłaniają wyższe, żeby oddziały i drzewa układały się
      // w naturalnej kolejności. Przeliczamy na KAŻDYM polu, bo w trakcie
      // marszu oddział mija innych i musi chować się za właściwymi.
      unit.container.setDepth(10 + k.row);
      const { x, y } = this.cellToXY(k.col, k.row);
      // Kierunek liczony z RZECZYWISTEGO przesunięcia, żeby stworek pochylał
      // się w stronę marszu, a nie zawsze w prawo.
      const dx = x - unit.container.x;
      stepUnitMove(this, unit.view, {
        dirX: Math.abs(dx) < 0.5 ? 0 : Math.sign(dx),
        duration: naKrok,
        flying: lata,
      });
      this.tweens.add({
        targets: unit.container,
        x,
        y,
        duration: naKrok,
        // Płynne wejście i wyjście ma sens dla całego przejścia, nie dla
        // pojedynczego pola: przy trasie z ośmiu kroków dałoby osiem
        // przystanków. Środkowe pola przelatujemy jednostajnie.
        ease: kroki.length === 1 ? 'Sine.easeInOut' : 'Linear',
        onComplete: dalej,
      });
    };
    dalej();
  }

  /** Zwykły ruch bez ataku — jedyne miejsce, gdzie scena sama przestawia pionek. */
  private performMove(unit: Unit, cell: Cell, onDone?: () => void) {
    this.busy = true;
    this.clearHighlights();
    // Pole wyjścia zapamiętane PRZED zmianą stanu — trasa liczy się od niego.
    const zKol = unit.col;
    const zRzed = unit.row;
    unit.col = cell.col;
    unit.row = cell.row;
    this.animateMove(
      unit,
      cell.col,
      cell.row,
      () => (onDone ? onDone() : this.advanceTurn()),
      zKol,
      zRzed
    );
  }

  /**
   * Atak. Cały jego przebieg — dojście, cios, drugi cios, odwet i powrót —
   * rozstrzyga `battle.ts` i oddaje dziennik zdarzeń. Scena tylko go odgrywa,
   * więc kolejność zdarzeń istnieje już w jednym egzemplarzu, a nie w dwóch.
   */
  private resolveAttack(attacker: Unit, target: Unit, from: Cell, atak = 0) {
    this.busy = true;
    this.clearHighlights();

    const log = performAttack(this.battle, attacker, target, from, atak);
    this.playLog(log, () => {
      this.checkGameOver();
      if (!this.gameOver) this.time.delayedCall(450, () => this.advanceTurn());
    });
  }

  /**
   * Odgrywa dziennik krok po kroku. Przerwy po ciosie są te same, co dawniej:
   * po odwecie dłuższa, bo domyka wymianę i oko musi zdążyć ją odczytać.
   */
  private playLog(log: BattleEvent[], onDone: () => void) {
    let i = 0;

    const next = () => {
      if (i >= log.length) {
        onDone();
        return;
      }
      const ev = log[i++];

      if (ev.rodzaj === 'ruch') {
        this.animateMove(this.unitById(ev.kto), ev.doKol, ev.doRzed, next, ev.zKol, ev.zRzed);
        return;
      }

      if (ev.rodzaj === 'powrot') {
        // Uderz i wróć: harpia z Heroes 3 odskakuje na pole, z którego ruszyła.
        const unit = this.unitById(ev.kto);
        // Napis zostawiamy tam, gdzie oddział stoi NA EKRANIE — w stanie gry
        // jest już z powrotem u siebie, więc pole by go przeniosło za wcześnie.
        floatLabel(this, this.effectLayer, {
          x: unit.container.x,
          y: unit.container.y - 46,
          text: 'Odlatuje',
          color: '#b3e5fc',
          iconKey: ICON.wing,
        });
        this.animateMove(unit, ev.doKol, ev.doRzed, next);
        return;
      }

      if (ev.rodzaj === 'zejscie') {
        this.playDeath(ev.kto);
        next();
        return;
      }

      if (ev.rodzaj === 'wejscie') {
        this.pokazWejscie(this.unitById(ev.kto));
        this.time.delayedCall(700, next);
        return;
      }

      const attacker = this.unitById(ev.kto);
      const target = this.unitById(ev.wKogo);

      const landed = () => {
        this.showHit(ev);
        // Zejście pada w tej samej chwili co cios, który je spowodował —
        // dlatego zdejmujemy je z dziennika od razu, a nie po przerwie.
        while (i < log.length && log[i].rodzaj === 'zejscie') {
          this.playDeath((log[i] as { kto: number }).kto);
          i++;
        }
        // Zmiennik wchodzi dopiero, gdy zemdlony zdąży zejść.
        const wejscia: number[] = [];
        while (i < log.length && log[i].rodzaj === 'wejscie') {
          wejscia.push((log[i] as { kto: number }).kto);
          i++;
        }
        if (wejscia.length > 0) {
          this.time.delayedCall(650, () => wejscia.forEach((id) => this.pokazWejscie(this.unitById(id))));
          this.time.delayedCall(1350, next);
          return;
        }
        this.time.delayedCall(ev.odwet ? 500 : 450, next);
      };

      if (!ev.odwet && !ev.drugi) {
        // Jak w pokemonach: „Torrenar używa: Fala!" — w górnej belce zawsze,
        // nad stworkiem tylko przy ataku specjalnym, żeby zwykłe ciosy nie
        // zasypywały planszy napisami.
        const nazwa = atakiJednostki(attacker)[ev.atak]?.nazwa;
        if (nazwa) this.turnText.setText(`${attacker.def.name} używa: ${nazwa}!`);
        if (nazwa && ev.atak > 0) this.floatText(attacker, `${nazwa}!`, '#ffe08a', -76, ICON.star, 18);
      }
      if (ev.drugi) this.floatText(attacker, 'Drugi cios!', '#ffd166', -46, ICON.sword, 17);
      if (ev.odwet) this.floatText(attacker, 'Odwet!', '#ffd166', -60, ICON.retaliate, 17);

      if (ev.strzal) this.fireProjectile(attacker, target, ev.tooFar, landed);
      else this.meleeLunge(attacker, target, landed);
    };

    next();
  }

  /**
   * Cios wręcz: zamach, natarcie, uderzenie z przytrzymaniem i powrót.
   * Kontener niesie dojście do celu, a sylwetka w tym czasie zmienia pozy
   * (unitView.ts): odchylenie w zamachu, poza ciosu w natarciu, trzymana
   * przez uderzenie. Przytrzymanie na trafieniu (110 ms) to ta klatka
   * z Heroes 3, w której broń jest w celu — bez niej cios przelatywał.
   */
  private meleeLunge(attacker: Unit, target: Unit, onDone: () => void) {
    const start = { x: attacker.container.x, y: attacker.container.y };
    const to = this.cellToXY(target.col, target.row);
    const dx = to.x - start.x;
    const dy = to.y - start.y;
    // Runda 2 porównania z Heroes 3: przytrzymanie wydłużone z 60 do 110 ms,
    // bo przy 60 rozbłysk trafienia wypadał już na cofającym się stworku.
    const ZAMACH = 110;
    const NATARCIE = 90;
    const TRZYMA = 110;
    const POWROT = 150;

    poseWindup(this, attacker.view, ZAMACH);
    // Dwa osobne ruchy zamiast yoyo: yoyo zgłasza się raz na animowaną
    // właściwość, więc trafienie liczyłoby się podwójnie (x i y).
    this.tweens.add({
      targets: attacker.container,
      x: start.x - dx * 0.1,
      y: start.y - dy * 0.1,
      duration: ZAMACH,
      ease: 'Sine.easeOut',
      onComplete: () => {
        poseStrike(this, attacker.view, NATARCIE);
        this.tweens.add({
          targets: attacker.container,
          x: start.x + dx * 0.42,
          y: start.y + dy * 0.42,
          duration: NATARCIE,
          ease: 'Quad.easeIn',
          onComplete: () => {
            // Cięcie rysujemy w połowie drogi do celu, czyli tam, gdzie ręce
            // faktycznie się spotykają — nie na środku hexa obrońcy.
            sfx(this, 'ciecie');
            slashArc(
              this,
              this.effectLayer,
              start.x + dx * 0.68,
              start.y + dy * 0.68 - 8,
              Math.atan2(dy, dx),
              TYPE_INFO[attacker.def.type].color
            );
            onDone();
            poseRecover(this, attacker.view, TRZYMA, POWROT);
            this.tweens.add({
              targets: attacker.container,
              x: start.x,
              y: start.y,
              delay: TRZYMA,
              duration: POWROT,
              ease: 'Quad.easeInOut',
            });
          },
        });
      },
    });
  }

  /** Pocisk strzelca — kształt, barwa i ślad bierze się z żywiołu (effects.ts). */
  private fireProjectile(attacker: Unit, target: Unit, broken: boolean, onDone: () => void) {
    // Pocisk wylatuje w chwili, gdy stworek przechodzi z zamachu w pozę
    // strzału — nie wcześniej, bo wtedy leciałby ze stojącego obrazka.
    playShootPose(this, attacker.view, () => this.releaseProjectile(attacker, target, broken, onDone));
  }

  private releaseProjectile(attacker: Unit, target: Unit, broken: boolean, onDone: () => void) {
    sfx(this, 'strzal');
    const wylot = muzzleOf(attacker.view);
    muzzleFlash(this, this.effectLayer, wylot.x, wylot.y, TYPE_INFO[attacker.def.type].color);
    launchProjectile(
      this,
      this.effectLayer,
      {
        // Z pyska / przodu sylwetki, w klatce wypuszczenia — nie ze środka heksa.
        from: wylot,
        to: this.cellToXY(target.col, target.row),
        color: TYPE_INFO[attacker.def.type].color,
        element: attacker.def.type,
        broken,
      },
      onDone
    );
  }

  /**
   * Odgrywa jedno trafienie z dziennika: rozbłysk, wstrząs, napisy i plakietka.
   * Niczego nie liczy — wszystkie wartości przyszły w zdarzeniu, bo policzył
   * je już `battle.ts`.
   */
  private showHit(ev: Extract<BattleEvent, { rodzaj: 'cios' }>) {
    const attacker = this.unitById(ev.kto);
    const target = this.unitById(ev.wKogo);
    const { obrazenia: value, polegli: killed, typeMult, pinned, tooFar, guarded } = ev;
    target.count = ev.celLiczebnoscPo;
    target.topHp = ev.celTopHpPo;

    // Siła ciosu jako ułamek pełnego życia oddziału — od niej zależy rozmiar
    // błysku i wstrząs kamery. Draśnięcie ma wyglądać inaczej niż cios, który
    // wybija pół oddziału.
    const power = Phaser.Math.Clamp(value / Math.max(1, fullHp(target.def)), 0.08, 1);
    const hitAt = this.cellToXY(target.col, target.row);

    // Dźwięk trafienia. Trzy różne, bo przewaga typu jest informacją, którą
    // gracz i tak czyta z napisu — ucho odbiera ją szybciej niż wzrok, jeśli
    // cios z przewagą brzmi inaczej niż cios odbity. Dzwon przewagi idzie
    // NAD uderzeniem, nie zamiast: sam dzwon bez trzasku brzmi jak nagroda,
    // a nie jak cios.
    if (ev.strzal) sfx(this, 'pocisk', power);
    sfx(this, typeMult > 1 ? 'trafienieMocne' : typeMult < 1 ? 'trafienieSlabe' : 'trafienie', power);
    if (typeMult > 1) sfx(this, 'przewaga', power);
    impactBurst(this, this.effectLayer, hitAt.x, hitAt.y - 10, {
      color: TYPE_INFO[attacker.def.type].color,
      power,
      strong: typeMult > 1,
      weak: typeMult < 1,
      // Środek heksa: rozbłysk celuje w korpus stworka, ale oświetlenie
      // terenu musi trafić w pole pod nim (patrz ImpactOpts.cellY).
      cellY: hitAt.y,
      // Wachlarz promieni ma wskazywać stronę, z której przyszedł cios.
      // Kąt liczymy od napastnika do celu; przy strzale z drugiego końca
      // planszy to jest właśnie tor pocisku.
      axis: Math.atan2(
        hitAt.y - this.cellToXY(attacker.col, attacker.row).y,
        hitAt.x - this.cellToXY(attacker.col, attacker.row).x
      ),
    });
    // Najpierw poza „oberwał", potem rozbłysk — kopia do rozbłysku bierze
    // bieżącą teksturę, więc świeci już skulona sylwetka.
    playHitPose(this, target.view, Math.sign(target.container.x - attacker.container.x) || 1);
    flashTarget(this, target.view.sprite, TYPE_INFO[attacker.def.type].color);
    battleShake(this, typeMult > 1 ? Math.min(1, power + 0.25) : power);

    if (tooFar) this.floatText(target, 'Złamana strzała — pół siły', '#ff9800', -66);
    else if (pinned) this.floatText(attacker, 'Zablokowany — bije wręcz!', '#ff9800', -60);
    if (guarded && target.count > 0) {
      this.floatText(target, 'Obrona zamortyzowała', '#4fc3f7', -82, ICON.shield);
    }

    // Liczba obrażeń jest najważniejsza, więc dostaje największy stopień pisma.
    this.floatText(target, `-${value}`, '#ffd6cf', -34, undefined, 21);
    // Zaraz po niej liczba poległych — dla gracza ważniejsza niż samo HP.
    if (killed > 0 && target.count > 0) {
      this.floatText(target, `padło ${killed}`, '#ff8a80', -52, ICON.skull);
    } else if (target.count <= 0) {
      this.floatText(target, `${target.def.name} mdleje!`, '#ff8a80', -52);
    }
    if (typeMult > 1) this.floatText(target, 'Super skuteczne!', '#a5f5a5', -70, ICON.star, 17);
    else if (typeMult < 1) this.floatText(target, 'Słabo skuteczne...', '#cfd8dc', -70);

    this.refreshStack(target);
  }

  /**
   * Zmiennik z pokeballa staje na polu (`wejdzZmiennik` już go tam postawił):
   * błysk, wyrośnięcie z punktu i okrzyk trenera — „Naprzód, Flamir!".
   */
  private pokazWejscie(unit: Unit) {
    const { x, y } = this.cellToXY(unit.col, unit.row);
    const skala = SKALA_POLA;
    unit.container.setPosition(x, y).setDepth(10 + unit.row).setVisible(true).setAlpha(0).setScale(0.1 * skala);
    this.refreshStack(unit);
    flashTarget(this, unit.view.sprite, C.white);
    deathFlash(this, this.effectLayer, x, y - 6, C.gold);
    this.tweens.add({ targets: unit.container, alpha: 1, scaleX: skala, scaleY: skala, duration: 320, ease: 'Back.easeOut' });
    const okrzyk =
      unit.side === 'player'
        ? `Naprzód, ${unit.def.name}!`
        : this.zPrzygody?.przeciwnik
          ? `${this.zPrzygody.przeciwnik.imie} wysyła: ${unit.def.name}!`
          : this.dzikie
            ? `Dziki ${unit.def.name} wyskakuje!`
            : `Przeciwnik wysyła: ${unit.def.name}!`;
    this.floatText(unit, okrzyk, '#ffe08a', -60, ICON.star, 18);
    this.turnText.setText(okrzyk);
    this.rysujDruzyny();
    this.buildQueueIcons();
  }

  /** Zejście oddziału. Z listy żywych zdjął go już `battle.ts`. */
  private playDeath(id: number) {
    const unit = this.unitById(id);
    this.time.delayedCall(0, () => this.rysujDruzyny());
    const at = this.cellToXY(unit.col, unit.row);
    sfx(this, 'smierc');
    deathFlash(this, this.effectLayer, at.x, at.y - 6, sideAccent(unit.side).color);
    playUnitDeath(this, unit.view, () => {});
  }

  /**
   * Napis ulotny nad oddziałem. Cała oprawa (kontur, ikona zamiast emoji,
   * rozsuwanie nachodzących na siebie napisów) siedzi w effects.ts — tutaj
   * zostaje tylko przeliczenie pola na współrzędne.
   */
  private floatText(
    unit: Unit,
    text: string,
    color: string,
    offsetY: number,
    iconKey?: IconKey,
    size?: number
  ) {
    const cell = this.cellToXY(unit.col, unit.row);
    floatLabel(this, this.effectLayer, {
      x: cell.x,
      y: cell.y + offsetY,
      text,
      color,
      iconKey,
      size,
    });
  }

  // ---------- AI przeciwnika ----------

  /**
   * Tura przeciwnika. Decyzję podejmuje `chooseAction` z `battle.ts` — ta sama,
   * którą gra symulator. Scena dobiera do niej tylko animację.
   */
  private enemyTurn(unit: Unit) {
    if (this.gameOver) return;

    const action = chooseAction(this.battle, unit);

    if (action.rodzaj === 'nic') {
      this.checkGameOver();
      return;
    }
    if (action.rodzaj === 'atak') {
      this.resolveAttack(unit, action.cel as Unit, action.from, action.atak);
      return;
    }
    if (action.rodzaj === 'czekanie') {
      // Maszyna też umie czekać — nie rzuca się na linię przeciwnika sama.
      unit.waited = true;
      this.roundQueue.shift();
      this.roundQueue.push(unit.id);
      this.floatText(unit, 'Czekam', '#cfd8dc', -46, ICON.hourglass);
      this.time.delayedCall(400, () => this.beginTurn());
      return;
    }
    if (action.rodzaj === 'obrona') {
      // Nie ma kogo bić ani dokąd iść — lepiej stanąć w obronie niż bezczynnie.
      unit.defending = true;
      this.refreshStack(unit);
      this.floatText(unit, 'Obrona', '#ffc9c9', -46, ICON.shield);
      this.time.delayedCall(500, () => this.advanceTurn());
      return;
    }
    this.performMove(unit, action.cel);
  }

  /**
   * Wraca na mapę przygody z wynikiem. Ocalałe oddziały wracają z liczebnością
   * z końca bitwy — inaczej wygrana byłaby darmowa i nie byłoby powodu unikać
   * silniejszych strażników.
   */
  private wrocDoPrzygody(wygrana: boolean) {
    // Ocalałych dopasowujemy po IDENTYFIKATORZE oddziału, nie po gatunku:
    // dwa sloty z tym samym gatunkiem (po podziale stosu) to normalny układ,
    // a szukanie po `sprite` dawało obu liczebność pierwszego z brzegu.
    // Tylko ci, którzy stanęli na polu: stworek, który czekał poza czwórką,
    // nie walczył i nie mdleje (wcześniej wracał z `ile: 0` i mdlał).
    const ocalali = this.zPrzygody!.gracz
      .map((o, i) => {
        const id = this.slotyZMapy.get(i);
        if (id === undefined) return null;
        return { ...o, ile: this.naNogach(id) ? 1 : 0 };
      })
      .filter((o) => o !== null);
    // Złapane dzikie stworki — z poziomem, na którym stały na polu.
    const zlapani = this.zlapani
      .map((z) => {
        const o = this.zPrzygody!.wrog[z.skad];
        if (!o) return null;
        return { ...o, ile: 1, poziom: this.roster.get(z.id)?.def.poziom ?? o.poziom, skad: z.skad };
      })
      .filter((o) => o !== null);
    // Pokonani przeciwnicy — z nich liczy się doświadczenie drużyny.
    const pokonani = this.wrogZMapy
      .filter((w) => !this.naNogach(w.id))
      .map((w) => {
        const def = this.roster.get(w.id)?.def;
        return { poziom: def?.poziom ?? 5, tier: (def?.tier ?? 1) - 1 };
      });
    // Ilu stworków przeciwnika z każdego wpisu stoi na nogach — pojedynek
    // z rywalem musi wiedzieć, kto z JEGO drużyny zemdlał.
    const wrogOcalali = this.zPrzygody!.wrog.map((o, skad) => {
      const naPolu = this.wrogZMapy.filter((w) => w.skad === skad);
      const padli = naPolu.filter((w) => !this.naNogach(w.id)).length;
      return Math.max(0, o.ile - padli);
    });
    this.registry.set('wynik-bitwy', {
      oObiekt: this.zPrzygody!.oObiekt,
      wygrana,
      armia: ocalali,
      pokonani,
      wrogOcalali,
      zlapani,
      wydanePokeballe: this.wydanePokeballe,
    });
    // Chwila na przeczytanie ekranu końca, dopiero potem powrót.
    this.time.delayedCall(2600, () => this.scene.start(this.zPrzygody!.powrot ?? 'adventure'));
  }

  // ---------- koniec bitwy ----------

  /**
   * Kończy bitwę natychmiast z zadanym wynikiem.
   *
   * Potrzebne z dwóch powodów. Po pierwsze, sondy muszą umieć sprawdzić drogę
   * powrotną na mapę, a rozgrywanie całej bitwy klik po kliku trwałoby minuty
   * i zależałoby od losowania. Po drugie, to jest zalążek „szybkiej walki"
   * z Heroes 3 — tam też można oddać bitwę silnikowi i dostać sam wynik.
   *
   * Wcześniej sonda kasowała oddziały, sięgając wprost do pól sceny. Nie
   * działało to i nie mogło działać: takie podmienienie tablicy omija całą
   * resztę stanu bitwy, więc scena dalej uważała, że wróg stoi.
   */
  rozstrzygnijNatychmiast(wygrana: boolean) {
    if (this.gameOver) return;
    // Okno wyboru czwórki jeszcze otwarte — bez drużyny na polu każda bitwa
    // byłaby przegrana.
    this.wyborSkladu?.zatwierdz();
    const przegrani = wygrana ? 'enemy' : 'player';
    this.rezerwa[przegrani] = [];
    for (const u of [...this.units]) {
      if (u.side !== przegrani) continue;
      u.count = 0;
      u.view.container.destroy();
      this.units.splice(this.units.indexOf(u), 1);
      const wSymulacji = this.battle.units.indexOf(u);
      if (wSymulacji !== -1) this.battle.units.splice(wSymulacji, 1);
    }
    this.checkGameOver();
  }

  private checkGameOver() {
    const playersLeft = this.units.some((u) => u.side === 'player');
    const enemiesLeft = this.units.some((u) => u.side === 'enemy');
    if (playersLeft && enemiesLeft) return;

    this.gameOver = true;
    zapisz('bitwa', playersLeft ? 'wygrana gracza' : 'wygrana wroga', {
      runda: this.battle.round,
      ocalali: this.units.map((u) => `${u.def.sprite}×${u.count}`),
    });
    this.clearHighlights();
    this.setButtonsVisible(false);
    this.turnText.setText('');

    const won = playersLeft;
    if (this.zPrzygody) this.wrocDoPrzygody(won);
    // Ekran końca należy do warstwy nakładki, nie efektów — inaczej iskry
    // z ostatniego ciosu potrafią wylądować NAD wstęgą z napisem.
    this.effectLayer.setDepth(Z.overlay);
    // Muzyka schodzi pod ekran końca, nie razem z nim: ucięcie jej w tej samej
    // klatce, w której pada ostatni oddział, brzmi jak awaria odtwarzacza.
    stopMusic(this);
    showOutcomeScreen(
      this,
      this.effectLayer,
      won,
      BOARD_X + BOARD_W / 2,
      BOARD_Y + BOARD_H / 2,
      won
        ? `${this.playerFaction.name} rozbija armię: ${this.enemyFaction.name}`
        : `${this.enemyFaction.name} rozbija twoją armię`
    );
  }
}
