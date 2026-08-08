import Phaser from 'phaser';
import {
  TYPE_INFO,
  ABILITIES,
  fullHp,
  stackAtk,
  typeMatchup,
  type UnitDef,
} from '../data/units';
import { ALL_SPRITES, FACTIONS, factionById, type Faction } from '../data/factions';
import { type Cell } from '../data/hex';
// Wszystkie zasady walki biorą się STĄD i tylko stąd. Scena ma je odgrywać,
// nie powtarzać — druga kopia reguł rozjechałaby się z symulatorem balansu.
import {
  GUARD_REDUCTION,
  START_ROWS,
  attackPlan,
  canShoot,
  cellKey,
  chooseAction,
  damageOf,
  makeUnit,
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
  makeChip,
  makeHudButton,
  mix,
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
  setLabelObstacles,
  showOutcomeScreen,
  slashArc,
} from '../visual/effects';
import {
  buildUnitView,
  playUnitDeath,
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

const PANEL_Y = BOARD_Y + BOARD_H + 14;
const PANEL_H = 208;
const PANEL_X = BOARD_X - 6;
const PANEL_W = BOARD_W + 12;
/** Ramka kadłuba panelu — pole z pasmami jest w nią wpuszczone. */
const PANEL_INSET = 8;
/** Margines treści wewnątrz wpuszczonego pola. */
const PANEL_PAD = 8;

const CONTENT_X = PANEL_X + PANEL_INSET + PANEL_PAD;
const CONTENT_R = PANEL_X + PANEL_W - PANEL_INSET - PANEL_PAD;
const CONTENT_W = CONTENT_R - CONTENT_X;

/** Kolumna przycisków po prawej; pasma statystyk dzielą resztę na pół. */
const BTN_W = 180;
const BTN_H = 44;
const STATS_W = CONTENT_W - BTN_W - 16;
const COL_GAP = 12;
const COL_W = (STATS_W - COL_GAP) / 2;

const ROW_H = 22;
const ROW_STEP_Y = 26;
/** Pierwszy wiersz zaczyna się pod pasem z nazwą oddziału. */
const ROWS_Y = PANEL_Y + 44;
const HEAD_Y = PANEL_Y + 14;
const HEAD_H = 26;
/** Prognoza siedzi najniżej i na pełnej szerokości — ma się nie gubić. */
const FORECAST_Y = PANEL_Y + 172;
const FORECAST_H = 26;

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

  private highlightLayer!: Phaser.GameObjects.Container;
  /** Podgląd zasięgu oddziału, na który patrzy kursor — pod warstwą ruchu. */
  private previewLayer!: Phaser.GameObjects.Container;
  private approachLayer!: Phaser.GameObjects.Container;
  private effectLayer!: Phaser.GameObjects.Container;
  /** Pole, z którego gracz chce uderzyć — wybierane położeniem kursora. */
  private preferredApproach: { targetId: number; cell: Cell } | null = null;
  private queue!: TurnQueue;

  private turnText!: Phaser.GameObjects.Text;
  /** Pas z nazwą oddziału u góry panelu — przemalowywany barwą strony. */
  private headBand!: Phaser.GameObjects.Graphics;
  private headName!: Phaser.GameObjects.Text;
  private headMeta!: Phaser.GameObjects.Text;
  private headIcon!: Phaser.GameObjects.Image;
  private stats!: StatTable;
  private forecast!: Forecast;
  private waitButton!: HudButton;
  private guardButton!: HudButton;

  private busy = false;
  private gameOver = false;

  /** Krajobraz tej bitwy — losowany raz, przy tworzeniu sceny. */
  private terrain = TERRAINS[0];

  /** Zamki, których armie się biją. */
  private playerFaction: Faction = FACTIONS[0];
  private enemyFaction: Faction = FACTIONS[1];

  constructor() {
    super('battle');
  }

  preload() {
    for (const key of ALL_SPRITES) {
      this.load.image(key, `${import.meta.env.BASE_URL}sprites/${key}.png`);
    }
    for (const t of TERRAINS) {
      this.load.image(t.key, `${import.meta.env.BASE_URL}terrain/${t.key}.png`);
    }
    for (const key of ALL_OBSTACLES) {
      this.load.image(key, `${import.meta.env.BASE_URL}terrain/obstacles/${key}.png`);
    }
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
    const pula = Phaser.Utils.Array.Shuffle([...FACTIONS]);
    this.playerFaction = pula[0];
    this.enemyFaction = pula[1];
  }

  /** Rzędy startowe w losowej kolejności — osobno dla każdej strony. */
  private startRows() {
    return Phaser.Utils.Array.Shuffle([...START_ROWS]);
  }

  create() {
    this.terrain = Phaser.Utils.Array.GetRandom(TERRAINS);
    this.drawArmies();
    this.applyHarnessParams();
    // Ikony muszą istnieć, zanim cokolwiek po nie sięgnie — rysują się do
    // tekstur raz, przy starcie sceny.
    buildIcons(this);
    // To samo dotyczy tekstur efektów: iskra i poświata muszą istnieć, zanim
    // padnie pierwszy cios.
    buildEffectTextures(this);
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
    this.playerFaction.units.forEach((def, i) => this.spawnUnit(def, 'player', 0, rzedyGracza[i]));
    this.enemyFaction.units.forEach((def, i) => this.spawnUnit(def, 'enemy', COLS - 1, rzedyWroga[i]));

    this.input.keyboard?.on('keydown-C', () => this.waitTurn());
    this.input.keyboard?.on('keydown-O', () => this.guardTurn());

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
    Phaser.Utils.Array.Shuffle(candidates);

    const wanted = Phaser.Math.Between(OBSTACLES_MIN, OBSTACLES_MAX);
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
      const kind = Phaser.Utils.Array.GetRandom(this.terrain.obstacles);
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
    this.drawPanel();
  }

  /** Górna belka: tytuł, wstęgi zamków, zdanie o turze i pasek kolejki. */
  private drawTopBar() {
    // Górna belka ma tylko 100 pikseli do ramy planszy, a rama wystaje jeszcze
    // kilka pikseli ponad BOARD_Y. Stąd trzy ciasno upakowane wiersze:
    // tytuł, wstęgi zamków, zdanie o turze.
    drawTitle(this, BOARD_X, 0, 'POKÉMON HEROES', 24);

    // Zamki jako wstęgi w barwach stron — ta sama barwa, którą oddziały noszą
    // na planszy, więc nie trzeba czytać nazw, żeby wiedzieć, kto jest kto.
    let x = BOARD_X;
    const player = makeChip(this, x, 46, this.playerFaction.name, {
      icon: ICON.banner,
      color: C.ally,
      edge: C.allyDeep,
      bold: true,
    });
    x += player.width + 8;
    this.add.text(x, 46, 'kontra', body(12, H.panelEdge)).setOrigin(0, 0.5);
    x += 52;
    const enemy = makeChip(this, x, 46, this.enemyFaction.name, {
      icon: ICON.banner,
      color: C.foe,
      edge: C.foeDeep,
      bold: true,
    });
    x += enemy.width + 10;
    makeChip(this, x, 46, this.terrain.label, {
      icon: ICON.leaf,
      color: mix(C.panelDeep, C.skyTop, 0.3),
      edge: C.shadow,
      size: 12,
    });

    // Zdanie o turze z konturem, bo leży wprost na tle, nie na panelu.
    this.turnText = this.add.text(BOARD_X, 74, '', display(14)).setOrigin(0, 0.5);

    this.queue = createTurnQueue(this, BOARD_X + BOARD_W, 24);
  }

  /**
   * Dolny panel. Układ jest z góry ustalony: pas z nazwą, dwie kolumny pasm,
   * jedno pasmo na całą szerokość dla umiejętności, kolumna przycisków po
   * prawej i prognoza na dole. Pozycje liczymy raz — zawartość tylko się
   * podmienia, bo panel odświeża się przy każdym ruchu kursora.
   */
  private drawPanel() {
    drawPanelBody(this, PANEL_X, PANEL_Y, PANEL_W, PANEL_H, PANEL_INSET);

    this.headBand = this.add.graphics().setDepth(61);
    this.headIcon = icon(this, ICON.flame, CONTENT_X + 8 + HEAD_H / 2, HEAD_Y + HEAD_H / 2, HEAD_H - 6)
      .setDepth(62);
    this.headName = this.add
      .text(CONTENT_X + 14 + HEAD_H, HEAD_Y + HEAD_H / 2, '', { ...display(16), strokeThickness: 3.5 })
      .setOrigin(0, 0.5)
      .setDepth(62);
    this.headMeta = this.add
      .text(CONTENT_X + STATS_W - 10, HEAD_Y + HEAD_H / 2, '', body(13, H.white))
      .setOrigin(1, 0.5)
      .setDepth(62);

    // Siatka jest domknięta: dokładnie cztery pasma po lewej i cztery po
    // prawej, ta sama szerokość, ta sama linia bazowa. Wcześniej wychodziło
    // pięć na cztery, bo „Umiejętność" wchodziła do siatki jako dziewiąty
    // wiersz na całą szerokość i rozjeżdżała rytm kolumn.
    const slots: StatSlot[] = [];
    for (let col = 0; col < 2; col++) {
      for (let i = 0; i < 4; i++) {
        slots.push({
          x: CONTENT_X + col * (COL_W + COL_GAP),
          y: ROWS_Y + i * ROW_STEP_Y,
          w: COL_W,
          h: ROW_H,
          // Zebra liczy się z miejsca w kolumnie, nie ze znaczenia wiersza.
          band: (i % 2) as 0 | 1,
        });
      }
    }
    // Umiejętność ląduje POD tabelą jako wstęga na całą szerokość — tak jak
    // we wzorcu wstęga z nazwą ruchu pod kratką przycisków. Osobne tło i brak
    // zebry mówią, że to nie kolejny wiersz tabeli, tylko podpis do niej.
    slots.push({
      x: CONTENT_X,
      y: ROWS_Y + 4 * ROW_STEP_Y,
      w: STATS_W,
      h: ROW_H,
      ribbon: true,
    });
    this.stats = createStatTable(this, slots);

    const btnX = CONTENT_R - BTN_W / 2;
    this.waitButton = makeHudButton(this, {
      x: btnX,
      y: PANEL_Y + 70,
      w: BTN_W,
      h: BTN_H,
      icon: ICON.hourglass,
      tone: C.ally,
      toneDeep: C.allyDeep,
      onClick: () => this.waitTurn(),
    });
    this.guardButton = makeHudButton(this, {
      x: btnX,
      y: PANEL_Y + 124,
      w: BTN_W,
      h: BTN_H,
      icon: ICON.shield,
      tone: C.gold,
      toneDeep: C.goldDeep,
      onClick: () => this.guardTurn(),
    });

    this.forecast = createForecast(
      this,
      CONTENT_X,
      FORECAST_Y,
      CONTENT_W,
      FORECAST_H,
      MINI.forecast,
      'Najedź kursorem na wroga, żeby zobaczyć prognozę obrażeń'
    );
  }

  // ---------- jednostki ----------

  private cellToXY(col: number, row: number) {
    return cellToXY(col, row);
  }

  /** Obszar kliknięcia w kształcie hexa — prostokąt zachodziłby na sąsiadów. */
  private hexHitArea() {
    return new Phaser.Geom.Polygon(hexPoints(HEX_W / 2, HEX_H / 2));
  }

  private spawnUnit(def: UnitDef, side: Side, col: number, row: number) {
    const { x, y } = this.cellToXY(col, row);
    const id = this.nextId++;
    const view = buildUnitView(this, {
      spriteKey: def.sprite,
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
      // Wracamy do statystyk tego, kto ma turę.
      const active = this.activeUnit();
      if (active) this.showStats(active);
    });

    this.units.push(unit);
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
        : `Tura przeciwnika: ${unit.def.name}`
    );

    this.buildQueueIcons();
    this.showStats(unit);

    if (unit.side === 'enemy') {
      this.setButtonsVisible(false);
      this.time.delayedCall(600, () => this.enemyTurn(unit));
    } else {
      this.setButtonsVisible(true);
      this.updateButtons(unit);
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
  private showStats(unit: Unit) {
    const t = TYPE_INFO[unit.def.type];
    const { strong, weak } = typeMatchup(unit.def.type);
    const strongInfo = TYPE_INFO[strong];
    const weakInfo = TYPE_INFO[weak];
    const { color: accent, deep } = sideAccent(unit.side);

    // Pas z nazwą w barwie strony — czyje to jest, widać, zanim się cokolwiek
    // przeczyta.
    this.headBand.clear();
    plate(this.headBand, CONTENT_X, HEAD_Y, STATS_W, HEAD_H, HEAD_H * 0.36, accent, deep, {
      light: 0.32,
      dark: 0.28,
      gloss: 0.26,
      drop: 2,
    });
    this.headIcon.setTexture(TYPE_ICON[unit.def.type]).setDisplaySize(HEAD_H - 6, HEAD_H - 6);
    this.headName.setText(`${unit.def.name} ×${unit.count}`);
    this.headMeta.setText(
      `poziom ${unit.def.tier} · ${unit.side === 'player' ? 'twój oddział' : 'oddział przeciwnika'}` +
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

    const ability: StatRow = unit.def.ability
      ? {
          label: 'Umiejętność',
          value: `${ABILITIES[unit.def.ability].name} — ${ABILITIES[unit.def.ability].desc}`,
          icon: MINI.ability,
        }
      : { label: 'Umiejętność', value: 'brak', icon: MINI.ability };

    this.stats.update([
      {
        label: 'Życie',
        value: `${total(unit)} / ${fullHp(unit.def)}`,
        icon: MINI.life,
      },
      {
        label: 'Atak',
        value: `${unit.count} × ${unit.def.atk} = ${stackAtk(unit.def, unit)}`,
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
        value: `${strongInfo.dative} ×1.5`,
        icon: MINI.strong,
        mark: strongInfo.color,
      },
      {
        label: 'Słaby wobec',
        value: `${weakInfo.genitive} ×1.5`,
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
    const { value, base, typeMult, penalty, pinned, tooFar, guarded, kills } =
      damageOf(this.battle, attacker, target);
    // Zaczynamy od liczebności razy atak — stąd bierze się siła oddziału.
    // Bez sumy pośredniej: przy braku mnożników wychodziło „= 15 = 15", co
    // wyglądało na błąd rachunku.
    void base;
    const parts = [`Atak ${attacker.count} × ${attacker.def.atk}`];
    if (typeMult !== 1) parts.push(`× ${typeMult} (${typeMult > 1 ? 'przewaga typu' : 'słaby typ'})`);
    if (pinned) parts.push('× 0.5 (zablokowany strzelec bije wręcz)');
    else if (tooFar) parts.push('× 0.5 (za daleko — złamana strzała)');
    if (guarded) parts.push(`× ${GUARD_REDUCTION} (cel w obronie)`);
    void penalty;

    const outcome =
      kills >= target.count
        ? `— cały oddział ${target.def.name} padnie`
        : kills > 0
          ? `dla ${target.def.name} — ${fellPhrase(kills)} z ${target.count}`
          : `dla ${target.def.name} — żaden nie padnie`;
    this.forecast.show(
      `${parts.join(' ')} = ${value} ${damageWord(value)} ${outcome}`,
      kills >= target.count
    );
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
    // Najechanie na kogokolwiek pokazuje jego statystyki — także wroga.
    this.showStats(unit);
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

    if (canAttack) this.showForecast(active!, unit);
  }

  private onUnitClicked(unit: Unit) {
    if (this.gameOver || this.busy) return;
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
    this.resolveAttack(attacker, target, chosen);
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
  }

  private updateButtons(unit: Unit) {
    // Przeczekać wolno raz na rundę, więc przycisk musi wyglądać na wyłączony,
    // zanim gracz w niego kliknie — sama przygaszona alfa tego nie mówiła.
    this.waitButton.setLabel(unit.waited ? 'Już czekałeś' : 'Czekaj  (C)');
    this.waitButton.setEnabled(!unit.waited);

    this.guardButton.setLabel('Broń się  (O)');
    this.guardButton.setEnabled(true);
  }

  // ---------- akcje ----------

  /** Sam tween przejścia na pole — stanu nie rusza, ten zmienia `battle.ts`. */
  private animateMove(unit: Unit, col: number, row: number, onDone: () => void) {
    // Niższe rzędy zasłaniają wyższe, żeby oddziały i drzewa układały się
    // w naturalnej kolejności.
    unit.container.setDepth(10 + row);
    const { x, y } = this.cellToXY(col, row);
    this.tweens.add({
      targets: unit.container,
      x,
      y,
      duration: 260,
      ease: 'Sine.easeInOut',
      onComplete: onDone,
    });
  }

  /** Zwykły ruch bez ataku — jedyne miejsce, gdzie scena sama przestawia pionek. */
  private performMove(unit: Unit, cell: Cell, onDone?: () => void) {
    this.busy = true;
    this.clearHighlights();
    unit.col = cell.col;
    unit.row = cell.row;
    this.animateMove(unit, cell.col, cell.row, () => (onDone ? onDone() : this.advanceTurn()));
  }

  /**
   * Atak. Cały jego przebieg — dojście, cios, drugi cios, odwet i powrót —
   * rozstrzyga `battle.ts` i oddaje dziennik zdarzeń. Scena tylko go odgrywa,
   * więc kolejność zdarzeń istnieje już w jednym egzemplarzu, a nie w dwóch.
   */
  private resolveAttack(attacker: Unit, target: Unit, from: Cell) {
    this.busy = true;
    this.clearHighlights();

    const log = performAttack(this.battle, attacker, target, from);
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
        this.animateMove(this.unitById(ev.kto), ev.doKol, ev.doRzed, next);
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
        this.time.delayedCall(ev.odwet ? 500 : 450, next);
      };

      if (ev.drugi) this.floatText(attacker, 'Drugi cios!', '#ffd166', -46, ICON.sword, 17);
      if (ev.odwet) this.floatText(attacker, 'Odwet!', '#ffd166', -60, ICON.retaliate, 17);

      if (ev.strzal) this.fireProjectile(attacker, target, ev.tooFar, landed);
      else this.meleeLunge(attacker, target, landed);
    };

    next();
  }

  /**
   * Cios wręcz: krótkie odchylenie do tyłu, szybkie natarcie i powrót.
   * Zamach przed uderzeniem to jedna klatka więcej (60 ms), ale bez niego cios
   * był płaskim przesunięciem — oko nie miało czego wyczekać.
   */
  private meleeLunge(attacker: Unit, target: Unit, onDone: () => void) {
    const start = { x: attacker.container.x, y: attacker.container.y };
    const to = this.cellToXY(target.col, target.row);
    const dx = to.x - start.x;
    const dy = to.y - start.y;

    // Dwa osobne ruchy zamiast yoyo: yoyo zgłasza się raz na animowaną
    // właściwość, więc trafienie liczyłoby się podwójnie (x i y).
    this.tweens.add({
      targets: attacker.container,
      x: start.x - dx * 0.12,
      y: start.y - dy * 0.12,
      duration: 60,
      ease: 'Sine.easeOut',
      onComplete: () => {
        this.tweens.add({
          targets: attacker.container,
          x: start.x + dx * 0.42,
          y: start.y + dy * 0.42,
          duration: 105,
          ease: 'Quad.easeOut',
          onComplete: () => {
            // Cięcie rysujemy w połowie drogi do celu, czyli tam, gdzie ręce
            // faktycznie się spotykają — nie na środku hexa obrońcy.
            slashArc(
              this,
              this.effectLayer,
              start.x + dx * 0.68,
              start.y + dy * 0.68 - 8,
              Math.atan2(dy, dx),
              TYPE_INFO[attacker.def.type].color
            );
            onDone();
            this.tweens.add({
              targets: attacker.container,
              x: start.x,
              y: start.y,
              duration: 150,
              ease: 'Quad.easeIn',
            });
          },
        });
      },
    });
  }

  /** Pocisk strzelca — kształt, barwa i ślad bierze się z żywiołu (effects.ts). */
  private fireProjectile(attacker: Unit, target: Unit, broken: boolean, onDone: () => void) {
    launchProjectile(
      this,
      this.effectLayer,
      {
        from: this.cellToXY(attacker.col, attacker.row),
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
    impactBurst(this, this.effectLayer, hitAt.x, hitAt.y - 10, {
      color: TYPE_INFO[attacker.def.type].color,
      power,
      strong: typeMult > 1,
      weak: typeMult < 1,
      // Środek heksa: rozbłysk celuje w korpus stworka, ale oświetlenie
      // terenu musi trafić w pole pod nim (patrz ImpactOpts.cellY).
      cellY: hitAt.y,
    });
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
    }
    if (typeMult > 1) this.floatText(target, 'Super skuteczne!', '#a5f5a5', -70, ICON.star, 17);
    else if (typeMult < 1) this.floatText(target, 'Słabo skuteczne...', '#cfd8dc', -70);

    this.refreshStack(target);
  }

  /** Zejście oddziału. Z listy żywych zdjął go już `battle.ts`. */
  private playDeath(id: number) {
    const unit = this.unitById(id);
    const at = this.cellToXY(unit.col, unit.row);
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
      this.resolveAttack(unit, action.cel as Unit, action.from);
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

  // ---------- koniec bitwy ----------

  private checkGameOver() {
    const playersLeft = this.units.some((u) => u.side === 'player');
    const enemiesLeft = this.units.some((u) => u.side === 'enemy');
    if (playersLeft && enemiesLeft) return;

    this.gameOver = true;
    this.clearHighlights();
    this.setButtonsVisible(false);
    this.turnText.setText('');

    const won = playersLeft;
    // Ekran końca należy do warstwy nakładki, nie efektów — inaczej iskry
    // z ostatniego ciosu potrafią wylądować NAD wstęgą z napisem.
    this.effectLayer.setDepth(Z.overlay);
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
