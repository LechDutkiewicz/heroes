import Phaser from 'phaser';
import {
  HALF_DAMAGE,
  TYPE_INFO,
  ABILITIES,
  applyDamage,
  fullHp,
  stackAtk,
  totalHp,
  typeMatchup,
  typeMultiplier,
  type UnitDef,
} from '../data/units';
import { ALL_SPRITES, FACTIONS, type Faction } from '../data/factions';
import { hexDistance, hexNeighbours, type Cell } from '../data/hex';
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
import { C, Z } from '../visual/theme';
import { ICON, buildIcons, type IconKey } from '../visual/icons';
import {
  battleShake,
  buildEffectTextures,
  deathFlash,
  flashTarget,
  floatLabel,
  impactBurst,
  launchProjectile,
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

interface Unit {
  id: number;
  side: Side;
  def: UnitDef;
  /** ilu stworków zostało w oddziale */
  count: number;
  /** HP stworka stojącego z przodu — reszta ma pełne */
  topHp: number;
  col: number;
  row: number;
  /** ile razy jeszcze odda w tej rundzie (Nieograniczony odwet ignoruje limit) */
  retaliations: number;
  /** przeczekał już w tej rundzie — drugi raz nie wolno */
  waited: boolean;
  /** stoi w obronie do swojej następnej kolejki */
  defending: boolean;
  /** cały wygląd oddziału — buduje i odświeża go src/visual/unitView.ts */
  view: UnitView;
  container: Phaser.GameObjects.Container;
}

// Geometria siatki i całe rysowanie planszy siedzą w src/visual/board.ts.
// Tutaj zostaje sama rozgrywka.

const PANEL_Y = BOARD_Y + BOARD_H + 14;
const PANEL_H = 208;
/** Szerokość lewej kolumny panelu — reszta należy do przycisków. */
const TEXT_COL_W = BOARD_W - 300;

/** O tyle słabsze jest trafienie w oddział, który stoi w obronie. */
const GUARD_REDUCTION = 0.7;

/** Sześć oddziałów w kolumnie z przerwą pośrodku — reszta rzędów zostaje wolna. */
const START_ROWS = [0, 1, 2, 4, 5, 6];

const cellKey = (col: number, row: number) => `${col},${row}`;

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

interface Button {
  container: Phaser.GameObjects.Container;
  bg: Phaser.GameObjects.Rectangle;
  label: Phaser.GameObjects.Text;
}

export class BattleScene extends Phaser.Scene {
  private units: Unit[] = [];
  /** Kolejka na bieżącą rundę — pierwszy z brzegu ma teraz turę. */
  private roundQueue: number[] = [];
  private round = 1;
  private nextId = 1;

  private highlightLayer!: Phaser.GameObjects.Container;
  /** Podgląd zasięgu oddziału, na który patrzy kursor — pod warstwą ruchu. */
  private previewLayer!: Phaser.GameObjects.Container;
  private approachLayer!: Phaser.GameObjects.Container;
  private effectLayer!: Phaser.GameObjects.Container;
  /** Pole, z którego gracz chce uderzyć — wybierane położeniem kursora. */
  private preferredApproach: { targetId: number; cell: Cell } | null = null;
  private queueIcons: Phaser.GameObjects.Container[] = [];
  private queueLabel?: Phaser.GameObjects.Text;

  private turnText!: Phaser.GameObjects.Text;
  private statsText!: Phaser.GameObjects.Text;
  private forecastText!: Phaser.GameObjects.Text;
  private waitButton!: Button;
  private guardButton!: Button;

  /** Pola zajęte przez przeszkody — piechota je omija, latacze przelatują. */
  private obstacles = new Set<string>();

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
    return found !== undefined;
  }

  create() {
    this.terrain = Phaser.Utils.Array.GetRandom(TERRAINS);
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

    this.scatterObstacles();

    // Obie armie stoją w jednej kolumnie przy swojej krawędzi, jak w Heroes 3.
    // Kolejność w tablicy to poziomy 1-6, więc drobnica staje u góry, a
    // czempion na dole; strzelcy i piechota wychodzą przy tym na przemian.
    this.playerFaction.units.forEach((def, i) => this.spawnUnit(def, 'player', 0, START_ROWS[i]));
    this.enemyFaction.units.forEach((def, i) => this.spawnUnit(def, 'enemy', COLS - 1, START_ROWS[i]));

    this.input.keyboard?.on('keydown-C', () => this.waitTurn());
    this.input.keyboard?.on('keydown-O', () => this.guardTurn());

    this.startRound();
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
      for (const n of this.neighbours(cur)) {
        const key = cellKey(n.col, n.row);
        if (seen.has(key) || this.obstacles.has(key)) continue;
        seen.add(key);
        queue.push(n);
      }
    }
    return false;
  }

  private makeButton(x: number, y: number, w: number, h: number, onClick: () => void): Button {
    const bg = this.add
      .rectangle(0, 0, w, h, 0x2c3a63)
      .setStrokeStyle(2, 0xffd166)
      .setInteractive({ useHandCursor: true });
    const label = this.add
      .text(0, 0, '', {
        fontFamily: 'Trebuchet MS, sans-serif',
        fontSize: '14px',
        color: '#ffffff',
        align: 'center',
      })
      .setOrigin(0.5);
    bg.on('pointerdown', onClick);
    return { container: this.add.container(x, y, [bg, label]), bg, label };
  }

  private drawHud() {
    this.add
      .text(BOARD_X, 6, 'POKEMON HEROES', {
        fontFamily: 'Trebuchet MS, sans-serif',
        fontSize: '19px',
        color: '#ffd166',
        fontStyle: 'bold',
      })
      .setAlpha(0.9);

    this.add
      .text(BOARD_X, 50, `${this.playerFaction.emoji} ${this.playerFaction.name}`, {
        fontFamily: 'Trebuchet MS, sans-serif',
        fontSize: '14px',
        color: '#8fe1a2',
        fontStyle: 'bold',
      })
      .setOrigin(0, 0.5);
    this.add
      .text(BOARD_X + 152, 50, 'kontra', {
        fontFamily: 'Trebuchet MS, sans-serif',
        fontSize: '12px',
        color: '#8ea0d0',
      })
      .setOrigin(0, 0.5);
    this.add
      .text(BOARD_X + 205, 50, `${this.enemyFaction.emoji} ${this.enemyFaction.name}`, {
        fontFamily: 'Trebuchet MS, sans-serif',
        fontSize: '14px',
        color: '#d9a2ec',
        fontStyle: 'bold',
      })
      .setOrigin(0, 0.5);

    this.add
      .text(BOARD_X + 372, 50, `\u{1F5FA}\u{FE0F} ${this.terrain.label}`, {
        fontFamily: 'Trebuchet MS, sans-serif',
        fontSize: '13px',
        color: '#8ea0d0',
      })
      .setOrigin(0, 0.5);

    this.turnText = this.add.text(BOARD_X, 74, '', {
      fontFamily: 'Trebuchet MS, sans-serif',
      fontSize: '14px',
      color: '#ffffff',
    });

    const panel = this.add.graphics();
    panel.fillStyle(0x141a30, 0.9);
    panel.fillRoundedRect(BOARD_X - 6, PANEL_Y, BOARD_W + 12, PANEL_H, 10);
    panel.lineStyle(1, 0x3a4770, 1);
    panel.strokeRoundedRect(BOARD_X - 6, PANEL_Y, BOARD_W + 12, PANEL_H, 10);

    // Teksty trzymają się lewej kolumny, przyciski prawej.
    this.statsText = this.add.text(BOARD_X + 10, PANEL_Y + 8, '', {
      fontFamily: 'Trebuchet MS, sans-serif',
      fontSize: '14px',
      color: '#e8ecff',
      lineSpacing: 3,
      wordWrap: { width: TEXT_COL_W },
    });

    // Prognoza stoi pod przyciskami, więc ma całą szerokość panelu.
    this.forecastText = this.add.text(BOARD_X + 10, PANEL_Y + 166, '', {
      fontFamily: 'Trebuchet MS, sans-serif',
      fontSize: '14px',
      color: '#ffd166',
      wordWrap: { width: BOARD_W - 20 },
    });

    const right = BOARD_X + BOARD_W - 140;
    this.waitButton = this.makeButton(right - 70, PANEL_Y + 44, 130, 42, () => this.waitTurn());
    this.guardButton = this.makeButton(right + 70, PANEL_Y + 44, 130, 42, () => this.guardTurn());
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

    const unit: Unit = {
      id,
      side,
      def,
      count: def.count,
      topHp: def.hp,
      col,
      row,
      retaliations: 1,
      waited: false,
      defending: false,
      view,
      container: view.container,
    };
    this.refreshStack(unit);

    const hit = view.hit;
    hit.on('pointerdown', () => this.onUnitClicked(unit));
    hit.on('pointerover', () => this.onUnitHover(unit));
    hit.on('pointermove', (p: Phaser.Input.Pointer) => this.onEnemyPointerMove(unit, p));
    hit.on('pointerout', () => {
      this.forecastText.setText('');
      this.clearApproach();
      this.setCursor(null);
      this.clearMovePreview();
      // Wracamy do statystyk tego, kto ma turę.
      const active = this.activeUnit();
      if (active) this.showStats(active);
    });

    this.units.push(unit);
    return unit;
  }

  /** Ile HP ma cały oddział razem. */
  private total(unit: Unit) {
    return totalHp(unit.def, unit);
  }

  /** Pasek, licznik, tarcza i odznaka ataku po każdej zmianie stanu oddziału. */
  private refreshStack(unit: Unit) {
    refreshUnitView(unit.view, {
      count: unit.count,
      hp: this.total(unit),
      maxHp: fullHp(unit.def),
      atk: stackAtk(unit.def, unit),
      defending: unit.defending,
    });
  }

  // ---------- kolejka tur ----------

  /** Nowa runda: wszyscy żywi ustawiają się od najszybszego. */
  private startRound() {
    // Odwet odnawia się co rundę — jak w Heroes 3, gdzie oddział oddaje raz.
    this.units.forEach((u) => {
      u.waited = false;
      u.retaliations = 1;
    });
    this.roundQueue = [...this.units]
      .sort((a, b) => b.def.move - a.def.move || a.id - b.id)
      .map((u) => u.id);
  }

  private buildQueueIcons() {
    this.queueIcons.forEach((c) => c.destroy());
    this.queueIcons = [];

    const count = Math.min(this.roundQueue.length, 12);
    const spacing = 31;
    const startX = BOARD_X + BOARD_W - (count - 1) * spacing - 14;

    if (!this.queueLabel) {
      this.queueLabel = this.add
        .text(startX - 132, 26, '', {
          fontFamily: 'Trebuchet MS, sans-serif',
          fontSize: '13px',
          color: '#8ea0d0',
        })
        .setOrigin(0, 0.5);
    }
    this.queueLabel.setText(`Runda ${this.round} — kolejka:`);
    this.queueLabel.setX(startX - 132);

    for (let i = 0; i < count; i++) {
      const unit = this.units.find((u) => u.id === this.roundQueue[i]);
      if (!unit) continue;
      const accent = sideAccent(unit.side).color;
      const bg = this.add
        .circle(0, 0, 13, accent, i === 0 ? 0.45 : 0.2)
        .setStrokeStyle(2, accent, i === 0 ? 1 : 0.45);
      const face = this.add
        .image(0, 0, unit.def.sprite)
        .setDisplaySize(24, 24)
        .setAlpha(i === 0 ? 1 : 0.6);
      this.queueIcons.push(this.add.container(startX + i * spacing, 26, [bg, face]));
    }
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
      this.round++;
      this.startRound();
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
      this.time.delayedCall(600, () => this.enemyAct(unit));
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

  private showStats(unit: Unit) {
    const t = TYPE_INFO[unit.def.type];
    const { strong, weak } = typeMatchup(unit.def.type);
    const strongInfo = TYPE_INFO[strong];
    const weakInfo = TYPE_INFO[weak];
    const reach = !unit.def.shooter
      ? '⚔️ walka wręcz'
      : this.canShoot(unit)
        ? `\u{1F3F9} strzelec — strzela wszędzie, pełna siła do ${unit.def.shootRange} pól`
        : '\u{1F6AB} strzelec ZABLOKOWANY — wróg obok, bije wręcz za pół siły';
    const ability = unit.def.ability
      ? `${ABILITIES[unit.def.ability].emoji} ${ABILITIES[unit.def.ability].name} — ${ABILITIES[unit.def.ability].desc}`
      : '\u{2B50} brak specjalnej umiejętności';
    const retaliation =
      unit.def.ability === 'guardian'
        ? '\u{21A9}\u{FE0F} Odwet: bez limitu'
        : unit.retaliations > 0
          ? '\u{21A9}\u{FE0F} Odwet: gotowy'
          : '\u{21A9}\u{FE0F} Odwet: już oddał w tej rundzie';
    const whose = unit.side === 'player' ? 'twój oddział' : 'oddział przeciwnika';
    const guard = unit.defending ? '   \u{1F6E1}\u{FE0F} w obronie' : '';

    this.statsText.setText(
      `${unit.def.name} ×${unit.count}   \u{1F3F0} poziom ${unit.def.tier}   ${t.emoji} ${t.label}   ` +
        `(${whose})${guard}\n` +
        `❤️ HP ${this.total(unit)}/${fullHp(unit.def)} (po ${unit.def.hp} na stworka)    ` +
        `\u{1F462} Ruch ${unit.def.move}${unit.def.flying ? '   \u{1F54A}\u{FE0F} lata nad wszystkim' : ''}\n` +
        `⚔️ Atak ${unit.count} × ${unit.def.atk} = ${stackAtk(unit.def, unit)}\n` +
        `\u{1F4AA} Mocny przeciw ${strongInfo.emoji} ${strongInfo.dative}: bije ×1.5, obrywa ×0.67\n` +
        `\u{1F494} Słaby wobec ${weakInfo.emoji} ${weakInfo.genitive}: obrywa ×1.5\n` +
        `${reach}    ${retaliation}\n` +
        `${ability}`
    );
  }

  // ---------- zasięg ruchu i cele ----------

  private blockedCells(excludeId: number) {
    const set = new Set<string>();
    this.units.filter((u) => u.id !== excludeId).forEach((u) => set.add(cellKey(u.col, u.row)));
    return set;
  }

  private neighbours(cell: Cell): Cell[] {
    return hexNeighbours(cell, COLS, ROWS);
  }

  /** BFS po planszy — zwraca koszt dojścia do każdego osiągalnego pola. */
  private reachable(unit: Unit): Map<string, number> {
    const blocked = this.blockedCells(unit.id);

    // Lataczowi nic nie zagradza drogi — liczy się sama odległość w linii
    // prostej. Musi tylko mieć gdzie wylądować: na drzewie ani na cudzej
    // głowie nie usiądzie.
    if (unit.def.flying) {
      const dist = new Map<string, number>();
      for (let row = 0; row < ROWS; row++) {
        for (let col = 0; col < COLS; col++) {
          const cost = hexDistance(unit, { col, row });
          if (cost > unit.def.move) continue;
          const key = cellKey(col, row);
          if (cost > 0 && (blocked.has(key) || this.obstacles.has(key))) continue;
          dist.set(key, cost);
        }
      }
      return dist;
    }

    const dist = new Map<string, number>([[cellKey(unit.col, unit.row), 0]]);
    const queue: Cell[] = [{ col: unit.col, row: unit.row }];

    while (queue.length > 0) {
      const cur = queue.shift()!;
      const cost = dist.get(cellKey(cur.col, cur.row))!;
      if (cost >= unit.def.move) continue;

      for (const n of this.neighbours(cur)) {
        const key = cellKey(n.col, n.row);
        if (blocked.has(key) || this.obstacles.has(key) || dist.has(key)) continue;
        dist.set(key, cost + 1);
        queue.push(n);
      }
    }
    return dist;
  }

  private isAdjacent(a: Cell, b: Cell) {
    return hexDistance(a, b) === 1;
  }

  private hasAdjacentEnemy(unit: Unit) {
    return this.units.some((u) => u.side !== unit.side && this.isAdjacent(unit, u));
  }

  /**
   * Czy strzelec może w ogóle strzelać. Wróg tuż obok blokuje go tak jak
   * w Heroes 3: łucznik nie ma jak naciągnąć cięciwy i musi bić wręcz.
   */
  private canShoot(unit: Unit) {
    return unit.def.shooter && !this.hasAdjacentEnemy(unit);
  }

  /**
   * Cel jest atakowalny, gdy strzelec ma go w zasięgu, albo gdy jednostka
   * walcząca wręcz stoi obok lub może dojść na sąsiednie wolne pole.
   */
  private attackPlan(unit: Unit, target: Unit, reach: Map<string, number>): { from: Cell } | null {
    // Wolny strzelec, jak łucznik w Heroes 3, dosięga każdego celu na planszy.
    if (this.canShoot(unit)) return { from: { col: unit.col, row: unit.row } };
    if (this.isAdjacent(unit, target)) return { from: { col: unit.col, row: unit.row } };

    // Zablokowany strzelec nie odbiega, żeby uderzyć kogoś dalej — albo bije
    // tego, kto go trzyma, albo ucieka, ale to już zwykły ruch, nie atak.
    if (unit.def.shooter) return null;

    let best: { from: Cell; cost: number } | null = null;
    for (const cell of this.neighbours(target)) {
      const cost = reach.get(cellKey(cell.col, cell.row));
      if (cost === undefined) continue;
      if (!best || cost < best.cost) best = { from: cell, cost };
    }
    return best ? { from: best.from } : null;
  }

  private damageOf(attacker: Unit, target: Unit) {
    const typeMult = typeMultiplier(attacker.def.type, target.def.type);

    // Strzelec traci połowę siły w zwarciu albo gdy cel stoi za daleko.
    const pinned = attacker.def.shooter && this.hasAdjacentEnemy(attacker);
    const tooFar =
      attacker.def.shooter && !pinned && hexDistance(attacker, target) > attacker.def.shootRange;
    const penalty = pinned || tooFar ? HALF_DAMAGE : 1;
    const guard = target.defending ? GUARD_REDUCTION : 1;

    // Bije cały oddział naraz, więc podstawą jest liczebność razy atak stworka.
    const base = stackAtk(attacker.def, attacker);
    const value = Math.max(1, Math.round(base * typeMult * penalty * guard));

    return {
      value,
      base,
      typeMult,
      penalty,
      pinned,
      tooFar,
      guarded: target.defending,
      /** ilu stworków celu padnie od tego trafienia */
      kills: applyDamage(target.def, target, value).killed,
    };
  }

  // ---------- interakcja gracza ----------

  private showOptions(unit: Unit) {
    this.clearHighlights();
    const reach = this.reachable(unit);

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
      const plan = this.attackPlan(unit, target, reach);
      if (!plan) continue;
      // Złoty obrys znaczy cel, do którego strzał doleci osłabiony.
      const { tooFar } = this.damageOf(unit, target);
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
      zone.on('pointerout', () => this.forecastText.setText(''));
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
    this.forecastText?.setText('');
    this.setCursor(null);
  }

  private showForecast(attacker: Unit, target: Unit) {
    const { value, base, typeMult, penalty, pinned, tooFar, guarded, kills } =
      this.damageOf(attacker, target);
    // Zaczynamy od liczebności razy atak — stąd bierze się siła oddziału.
    const parts = [`Atak ${attacker.count} × ${attacker.def.atk} = ${base}`];
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
    this.forecastText.setText(`${parts.join(' ')} = ${value} ${damageWord(value)} ${outcome}`);
  }

  /**
   * Dokąd ten oddział dojdzie w swojej kolejce. Rysujemy sam obrys, żeby nie
   * mylił się z pełnym podświetleniem pól jednostki, która ma turę teraz.
   */
  private showMovePreview(unit: Unit) {
    this.clearMovePreview();
    const g = this.add.graphics();
    const color = unit.side === 'player' ? C.ally : C.foe;
    for (const [key, cost] of this.reachable(unit)) {
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
      !!this.attackPlan(active, unit, this.reachable(active));

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
    const plan = this.attackPlan(attacker, target, this.reachable(attacker));
    if (!plan) return;
    const chosen =
      this.preferredApproach && this.preferredApproach.targetId === target.id
        ? this.preferredApproach.cell
        : plan.from;
    this.setCursor(null);
    this.performAttack(attacker, target, chosen);
  }

  private cursorFor(name: string) {
    return `url('${import.meta.env.BASE_URL}cursors/${name}.png') 16 16, pointer`;
  }

  private setCursor(name: string | null) {
    this.input.setDefaultCursor(name ? this.cursorFor(name) : 'default');
  }

  /** Które pola sąsiadujące z celem da się wykorzystać do ataku wręcz. */
  private approachOptions(attacker: Unit, target: Unit): Cell[] {
    const reach = this.reachable(attacker);
    return this.neighbours(target).filter(
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

    if (!this.attackPlan(active, target, this.reachable(active))) {
      this.setCursor(null);
      this.clearApproach();
      return;
    }

    if (this.canShoot(active)) {
      const { tooFar } = this.damageOf(active, target);
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
    this.waitButton.container.setVisible(visible);
    this.guardButton.container.setVisible(visible);
  }

  private updateButtons(unit: Unit) {
    this.waitButton.label.setText(unit.waited ? '\u{23F3} Już czekałeś' : '\u{23F3} Czekaj  (C)');
    this.waitButton.container.setAlpha(unit.waited ? 0.4 : 1);

    this.guardButton.label.setText('\u{1F6E1}\u{FE0F} Broń się  (O)');
  }

  // ---------- akcje ----------

  private performMove(unit: Unit, cell: Cell, onDone?: () => void) {
    this.busy = true;
    this.clearHighlights();
    unit.col = cell.col;
    unit.row = cell.row;
    // Niższe rzędy zasłaniają wyższe, żeby oddziały i drzewa układały się
    // w naturalnej kolejności.
    unit.container.setDepth(10 + cell.row);
    const { x, y } = this.cellToXY(cell.col, cell.row);
    this.tweens.add({
      targets: unit.container,
      x,
      y,
      duration: 260,
      ease: 'Sine.easeInOut',
      onComplete: () => (onDone ? onDone() : this.advanceTurn()),
    });
  }

  private isAlive(unit: Unit) {
    return this.units.includes(unit);
  }

  /**
   * Cały przebieg ataku: dojście, cios (u niektórych podwójny), odwet obrońcy
   * i powrót na swoje pole u tych, co uderzają i odlatują. Kolejne kroki
   * odpalają się z opóźnieniem, żeby dało się je nadążyć obejrzeć.
   */
  private performAttack(attacker: Unit, target: Unit, from: Cell) {
    this.busy = true;
    this.clearHighlights();

    const origin = { col: attacker.col, row: attacker.row };
    // O strzale decydujemy przed ruchem: po podejściu strzelec byłby już
    // w zwarciu i wychodziłoby, że wali wręcz mimo wystrzelonego pocisku.
    const shooting = this.canShoot(attacker);

    const finish = () => {
      this.checkGameOver();
      if (!this.gameOver) this.time.delayedCall(450, () => this.advanceTurn());
    };

    // Uderz i wróć: harpia z Heroes 3 odskakuje na pole, z którego ruszyła.
    const returnHome = () => {
      const moved = attacker.col !== origin.col || attacker.row !== origin.row;
      if (attacker.def.ability !== 'strikeAndReturn' || !this.isAlive(attacker) || !moved) {
        finish();
        return;
      }
      this.floatText(attacker, 'Odlatuje', '#b3e5fc', -46, ICON.wing);
      this.performMove(attacker, origin, finish);
    };

    const retaliate = () => {
      // Strzał nie prowokuje odwetu, tak jak łucznik w Heroes 3 nie obrywa
      // od kogoś z drugiego końca planszy.
      if (shooting || !this.isAlive(attacker) || !this.isAlive(target)) return returnHome();
      // Kto uderza i odlatuje, temu odwet nie sięga.
      if (attacker.def.ability === 'strikeAndReturn') return returnHome();
      if (target.retaliations <= 0) return returnHome();

      if (target.def.ability !== 'guardian') target.retaliations--;
      this.floatText(target, 'Odwet!', '#ffd166', -60, ICON.retaliate, 17);
      this.meleeLunge(target, attacker, () => {
        this.resolveHit(target, attacker);
        this.time.delayedCall(500, returnHome);
      });
    };

    const secondStrike = () => {
      if (attacker.def.ability !== 'double' || !this.isAlive(attacker) || !this.isAlive(target)) {
        return retaliate();
      }
      this.floatText(attacker, 'Drugi cios!', '#ffd166', -46, ICON.sword, 17);
      this.meleeLunge(attacker, target, () => {
        this.resolveHit(attacker, target);
        this.time.delayedCall(450, retaliate);
      });
    };

    const strike = () => {
      if (shooting) {
        const { tooFar } = this.damageOf(attacker, target);
        this.fireProjectile(attacker, target, tooFar, () => {
          this.resolveHit(attacker, target);
          this.time.delayedCall(450, retaliate);
        });
      } else {
        this.meleeLunge(attacker, target, () => {
          this.resolveHit(attacker, target);
          this.time.delayedCall(450, secondStrike);
        });
      }
    };

    if (from.col !== attacker.col || from.row !== attacker.row) {
      this.performMove(attacker, from, strike);
    } else {
      strike();
    }
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
   * Nalicza jedno trafienie: obrażenia, poległych i napisy. Turą się nie
   * zajmuje — ciosem, odwetem i powrotem steruje performAttack.
   */
  private resolveHit(attacker: Unit, target: Unit) {
    const { value, typeMult, pinned, tooFar, guarded } = this.damageOf(attacker, target);
    const { state, killed } = applyDamage(target.def, target, value);
    target.count = state.count;
    target.topHp = state.topHp;

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
    });
    flashTarget(this, target.view.sprite);
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

    if (target.count <= 0) {
      this.refreshStack(target);
      deathFlash(this, this.effectLayer, hitAt.x, hitAt.y - 6, sideAccent(target.side).color);
      playUnitDeath(this, target.view, () => {});
      this.units = this.units.filter((u) => u.id !== target.id);
      this.roundQueue = this.roundQueue.filter((id) => id !== target.id);
    } else {
      this.refreshStack(target);
    }
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

  private enemyAct(unit: Unit) {
    if (this.gameOver) return;
    const targets = this.units.filter((u) => u.side === 'player');
    if (targets.length === 0) {
      this.checkGameOver();
      return;
    }

    const reach = this.reachable(unit);

    let best: { target: Unit; from: Cell; score: number } | null = null;
    for (const target of targets) {
      const plan = this.attackPlan(unit, target, reach);
      if (!plan) continue;
      const { value: dmg, kills } = this.damageOf(unit, target);
      // Wybij cały oddział, jeśli się da; poza tym licz się z liczbą poległych,
      // bo każdy padły stworek to trwale słabszy przeciwnik.
      const score =
        (dmg >= this.total(target) ? 100 : 0) + kills * 10 + dmg + (target.def.shooter ? 5 : 0);
      if (!best || score > best.score) best = { target, from: plan.from, score };
    }

    if (best) {
      this.performAttack(unit, best.target, best.from);
      return;
    }

    // Nikt w zasięgu — podejdź w stronę najbliższego celu.
    let nearest = targets[0];
    for (const t of targets) {
      if (hexDistance(unit, t) < hexDistance(unit, nearest)) nearest = t;
    }

    let bestCell: Cell = { col: unit.col, row: unit.row };
    let bestDist = hexDistance(unit, nearest);
    for (const key of reach.keys()) {
      const [col, row] = key.split(',').map(Number);
      const d = hexDistance({ col, row }, nearest);
      if (d < bestDist) {
        bestDist = d;
        bestCell = { col, row };
      }
    }

    if (bestCell.col === unit.col && bestCell.row === unit.row) {
      // Nie ma kogo bić ani dokąd iść — lepiej stanąć w obronie niż stać bezczynnie.
      unit.defending = true;
      this.refreshStack(unit);
      this.floatText(unit, 'Obrona', '#ffc9c9', -46, ICON.shield);
      this.time.delayedCall(500, () => this.advanceTurn());
    } else {
      this.performMove(unit, bestCell);
    }
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
