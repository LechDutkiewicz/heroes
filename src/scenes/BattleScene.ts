import Phaser from 'phaser';
import {
  ALL_SPRITES,
  ENEMY_TEAM,
  HALF_DAMAGE,
  PLAYER_TEAM,
  SPECIAL_COOLDOWN,
  TYPE_INFO,
  typeMultiplier,
  type UnitDef,
} from '../data/units';

type Side = 'player' | 'enemy';

interface Unit {
  id: number;
  side: Side;
  def: UnitDef;
  hp: number;
  col: number;
  row: number;
  specialCooldown: number;
  container: Phaser.GameObjects.Container;
  sprite: Phaser.GameObjects.Image;
  hpBar: Phaser.GameObjects.Rectangle;
  hpLabel: Phaser.GameObjects.Text;
  platform: Phaser.GameObjects.Ellipse;
}

interface Cell {
  col: number;
  row: number;
}

const COLS = 10;
const ROWS = 7;
const CELL = 72;
const BOARD_X = 40;
const BOARD_Y = 92;
const BOARD_W = COLS * CELL;
const BOARD_H = ROWS * CELL;
const PANEL_Y = BOARD_Y + BOARD_H + 14;
const PANEL_H = 126;
/** Szerokość lewej kolumny panelu — reszta należy do przycisku umiejętności. */
const TEXT_COL_W = BOARD_W - 290;

const HP_BAR_W = 50;
const HP_BAR_H = 9;

/** Sześć jednostek w kolumnie z przerwą pośrodku — reszta rzędów zostaje wolna. */
const START_ROWS = [0, 1, 2, 4, 5, 6];

const cellKey = (col: number, row: number) => `${col},${row}`;

/** Poprawna polska odmiana: 1 obrażenie, 2 obrażenia, 5 obrażeń. */
function damageWord(n: number) {
  if (n === 1) return 'obrażenie';
  const last = n % 10;
  const lastTwo = n % 100;
  if (last >= 2 && last <= 4 && !(lastTwo >= 12 && lastTwo <= 14)) return 'obrażenia';
  return 'obrażeń';
}

export class BattleScene extends Phaser.Scene {
  private units: Unit[] = [];
  private turnOrder: number[] = [];
  private turnIndex = 0;
  private nextId = 1;

  private highlightLayer!: Phaser.GameObjects.Container;
  private approachLayer!: Phaser.GameObjects.Container;
  private effectLayer!: Phaser.GameObjects.Container;
  /** Pole, z którego gracz chce uderzyć — wybierane położeniem kursora. */
  private preferredApproach: { targetId: number; cell: Cell } | null = null;
  private queueIcons: Phaser.GameObjects.Container[] = [];
  private queueLabel?: Phaser.GameObjects.Text;

  private turnText!: Phaser.GameObjects.Text;
  private statsText!: Phaser.GameObjects.Text;
  private forecastText!: Phaser.GameObjects.Text;
  private specialButton!: Phaser.GameObjects.Container;
  private specialLabel!: Phaser.GameObjects.Text;
  private specialBg!: Phaser.GameObjects.Rectangle;

  private specialArmed = false;
  private busy = false;
  private gameOver = false;

  constructor() {
    super('battle');
  }

  preload() {
    for (const key of ALL_SPRITES) {
      this.load.image(key, `${import.meta.env.BASE_URL}sprites/${key}.png`);
    }
  }

  create() {
    this.drawBackground();
    this.drawBoard();
    this.drawHud();

    this.highlightLayer = this.add.container(0, 0).setDepth(5);
    this.approachLayer = this.add.container(0, 0).setDepth(6);
    this.effectLayer = this.add.container(0, 0).setDepth(100);

    // Obie drużyny stoją w jednej kolumnie przy swojej krawędzi, jak w Heroes 3.
    PLAYER_TEAM.forEach((def, i) => this.spawnUnit(def, 'player', 0, START_ROWS[i]));
    ENEMY_TEAM.forEach((def, i) => this.spawnUnit(def, 'enemy', COLS - 1, START_ROWS[i]));

    // Szybsze pokemony ruszają się pierwsze.
    this.turnOrder = [...this.units]
      .sort((a, b) => b.def.move - a.def.move || Math.random() - 0.5)
      .map((u) => u.id);

    this.buildQueueIcons();
    this.beginTurn();
  }

  // ---------- rysowanie planszy ----------

  private drawBackground() {
    const g = this.add.graphics();
    g.fillGradientStyle(0x1b2340, 0x1b2340, 0x0d1023, 0x0d1023, 1);
    g.fillRect(0, 0, this.scale.width, this.scale.height);
  }

  private drawBoard() {
    const g = this.add.graphics();

    g.fillStyle(0x000000, 0.35);
    g.fillRoundedRect(BOARD_X - 10, BOARD_Y - 10, BOARD_W + 20, BOARD_H + 20, 14);
    g.fillStyle(0x24304f, 1);
    g.fillRoundedRect(BOARD_X - 6, BOARD_Y - 6, BOARD_W + 12, BOARD_H + 12, 12);

    for (let col = 0; col < COLS; col++) {
      for (let row = 0; row < ROWS; row++) {
        const shade = (col + row) % 2 === 0 ? 0x2f3c60 : 0x2a3556;
        g.fillStyle(shade, 1);
        g.fillRoundedRect(BOARD_X + col * CELL + 2, BOARD_Y + row * CELL + 2, CELL - 4, CELL - 4, 8);
      }
    }

    // Strefy startowe obu drużyn.
    g.fillStyle(0x4fc3f7, 0.1);
    g.fillRoundedRect(BOARD_X + 2, BOARD_Y + 2, CELL - 4, BOARD_H - 4, 8);
    g.fillStyle(0xef5350, 0.1);
    g.fillRoundedRect(BOARD_X + (COLS - 1) * CELL + 2, BOARD_Y + 2, CELL - 4, BOARD_H - 4, 8);
  }

  private drawHud() {
    this.add
      .text(BOARD_X, 10, 'POKEMON HEROES', {
        fontFamily: 'Trebuchet MS, sans-serif',
        fontSize: '19px',
        color: '#ffd166',
        fontStyle: 'bold',
      })
      .setAlpha(0.9);

    this.turnText = this.add.text(BOARD_X, 58, '', {
      fontFamily: 'Trebuchet MS, sans-serif',
      fontSize: '14px',
      color: '#ffffff',
    });

    const panel = this.add.graphics();
    panel.fillStyle(0x141a30, 0.9);
    panel.fillRoundedRect(BOARD_X - 6, PANEL_Y, BOARD_W + 12, PANEL_H, 10);
    panel.lineStyle(1, 0x3a4770, 1);
    panel.strokeRoundedRect(BOARD_X - 6, PANEL_Y, BOARD_W + 12, PANEL_H, 10);

    // Teksty trzymają się lewej kolumny, przycisk umiejętności prawej.
    this.statsText = this.add.text(BOARD_X + 10, PANEL_Y + 10, '', {
      fontFamily: 'Trebuchet MS, sans-serif',
      fontSize: '15px',
      color: '#e8ecff',
      lineSpacing: 4,
      wordWrap: { width: TEXT_COL_W },
    });

    this.forecastText = this.add.text(BOARD_X + 10, PANEL_Y + 86, '', {
      fontFamily: 'Trebuchet MS, sans-serif',
      fontSize: '14px',
      color: '#ffd166',
      wordWrap: { width: TEXT_COL_W },
    });

    this.specialBg = this.add
      .rectangle(0, 0, 250, 40, 0x2c3a63)
      .setStrokeStyle(2, 0xffd166)
      .setInteractive({ useHandCursor: true });
    this.specialLabel = this.add
      .text(0, 0, '', {
        fontFamily: 'Trebuchet MS, sans-serif',
        fontSize: '14px',
        color: '#ffffff',
        align: 'center',
      })
      .setOrigin(0.5);
    this.specialButton = this.add.container(BOARD_X + BOARD_W - 140, PANEL_Y + 60, [
      this.specialBg,
      this.specialLabel,
    ]);
    this.specialBg.on('pointerdown', () => this.toggleSpecial());
  }

  // ---------- jednostki ----------

  private cellToXY(col: number, row: number) {
    return { x: BOARD_X + col * CELL + CELL / 2, y: BOARD_Y + row * CELL + CELL / 2 };
  }

  private spawnUnit(def: UnitDef, side: Side, col: number, row: number) {
    const { x, y } = this.cellToXY(col, row);
    const accent = side === 'player' ? 0x4fc3f7 : 0xef5350;

    // Podest pod pokemonem zdradza, do kogo należy i podświetla aktywną jednostkę.
    const platform = this.add.ellipse(0, 18, 42, 13, accent, 0.22).setStrokeStyle(2, accent, 0.6);

    // Sprite'y są kwadratowe 128x128 — skalujemy do wielkości pola.
    const sprite = this.add.image(0, -7, def.sprite).setDisplaySize(64, 64);

    const name = this.add
      .text(0, -33, def.name, {
        fontFamily: 'Trebuchet MS, sans-serif',
        fontSize: '10px',
        color: '#ffffff',
        fontStyle: 'bold',
        stroke: '#0d1023',
        strokeThickness: 3,
      })
      .setOrigin(0.5);

    // Odznaki na dole, żeby nie zasłaniały rysunku pokemona.
    const typeBadge = this.add.text(-24, 16, TYPE_INFO[def.type].emoji, { fontSize: '12px' }).setOrigin(0.5);

    const atkBadge = this.add
      .text(22, 16, `${def.shooter ? '\u{1F3F9}' : '⚔️'}${def.atk}`, {
        fontFamily: 'Trebuchet MS, sans-serif',
        fontSize: '11px',
        color: '#ffffff',
        backgroundColor: '#000000aa',
        padding: { x: 3, y: 1 },
      })
      .setOrigin(0.5);

    const hpBarBg = this.add.rectangle(0, 28, HP_BAR_W, HP_BAR_H, 0x11162b, 0.9).setStrokeStyle(1, 0x000000, 0.6);
    const hpBar = this.add.rectangle(-HP_BAR_W / 2, 28, HP_BAR_W, HP_BAR_H, 0x4caf50).setOrigin(0, 0.5);
    const hpLabel = this.add
      .text(0, 28, `${def.hp}/${def.hp}`, {
        fontFamily: 'Trebuchet MS, sans-serif',
        fontSize: '9px',
        color: '#ffffff',
        fontStyle: 'bold',
      })
      .setOrigin(0.5);

    // Pole trafienia obejmuje całą kratkę, żeby dało się celować w jej krawędzie.
    const hit = this.add.rectangle(0, 0, CELL, CELL, 0xffffff, 0).setInteractive();

    const container = this.add.container(x, y, [
      platform,
      sprite,
      typeBadge,
      atkBadge,
      name,
      hpBarBg,
      hpBar,
      hpLabel,
      hit,
    ]);
    container.setDepth(10);

    const unit: Unit = {
      id: this.nextId++,
      side,
      def,
      hp: def.hp,
      col,
      row,
      specialCooldown: 0,
      container,
      sprite,
      hpBar,
      hpLabel,
      platform,
    };

    hit.on('pointerdown', () => this.onUnitClicked(unit));
    hit.on('pointerover', () => this.onUnitHover(unit));
    hit.on('pointermove', (p: Phaser.Input.Pointer) => this.onEnemyPointerMove(unit, p));
    hit.on('pointerout', () => {
      this.forecastText.setText('');
      this.clearApproach();
    });

    this.units.push(unit);
    return unit;
  }

  private refreshHp(unit: Unit) {
    const ratio = Phaser.Math.Clamp(unit.hp / unit.def.hp, 0, 1);
    unit.hpBar.width = HP_BAR_W * ratio;
    unit.hpBar.fillColor = ratio > 0.5 ? 0x4caf50 : ratio > 0.25 ? 0xffb300 : 0xe53935;
    unit.hpLabel.setText(`${unit.hp}/${unit.def.hp}`);
  }

  // ---------- kolejka tur ----------

  private buildQueueIcons() {
    this.queueIcons.forEach((c) => c.destroy());
    this.queueIcons = [];

    const count = Math.min(this.turnOrder.length, 12);
    const spacing = 31;
    const startX = BOARD_X + BOARD_W - (count - 1) * spacing - 14;

    if (!this.queueLabel) {
      this.queueLabel = this.add
        .text(startX - 74, 26, 'Kolejka:', {
          fontFamily: 'Trebuchet MS, sans-serif',
          fontSize: '13px',
          color: '#8ea0d0',
        })
        .setOrigin(0, 0.5);
    }

    for (let i = 0; i < count; i++) {
      const unit = this.units.find((u) => u.id === this.turnOrder[(this.turnIndex + i) % this.turnOrder.length]);
      if (!unit) continue;
      const accent = unit.side === 'player' ? 0x4fc3f7 : 0xef5350;
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
    return this.units.find((u) => u.id === this.turnOrder[this.turnIndex]);
  }

  private beginTurn() {
    if (this.gameOver) return;
    this.clearHighlights();
    this.specialArmed = false;
    this.busy = false;

    const unit = this.activeUnit();
    if (!unit) {
      this.advanceTurn();
      return;
    }

    if (unit.specialCooldown > 0) unit.specialCooldown--;

    this.units.forEach((u) => {
      const accent = u.side === 'player' ? 0x4fc3f7 : 0xef5350;
      u.platform.setStrokeStyle(2, accent, 0.75);
      u.platform.setFillStyle(accent, 0.28);
    });
    unit.platform.setStrokeStyle(3, 0xffd166, 1);
    unit.platform.setFillStyle(0xffd166, 0.35);
    this.tweens.add({
      targets: unit.platform,
      scaleX: { from: 1, to: 1.14 },
      scaleY: { from: 1, to: 1.14 },
      duration: 520,
      yoyo: true,
      repeat: -1,
    });

    this.turnText.setText(
      unit.side === 'player'
        ? `Twoja tura: ${unit.def.name} — kliknij pole, by podejść, albo wroga, by zaatakować`
        : `Tura przeciwnika: ${unit.def.name}`
    );

    this.buildQueueIcons();
    this.showStats(unit);

    if (unit.side === 'enemy') {
      this.specialButton.setVisible(false);
      this.time.delayedCall(600, () => this.enemyAct(unit));
    } else {
      this.updateSpecialButton(unit);
      this.showOptions(unit);
    }
  }

  private advanceTurn() {
    if (this.gameOver) return;
    this.tweens.killTweensOf(this.units.map((u) => u.platform));
    this.units.forEach((u) => u.platform.setScale(1));
    this.turnOrder = this.turnOrder.filter((id) => this.units.some((u) => u.id === id));
    if (this.turnOrder.length === 0) return;
    this.turnIndex = (this.turnIndex + 1) % this.turnOrder.length;
    this.beginTurn();
  }

  private showStats(unit: Unit) {
    const t = TYPE_INFO[unit.def.type];
    const reach = unit.def.shooter
      ? `\u{1F3F9} strzelec — strzela wszędzie, pełna siła do ${unit.def.shootRange} pól`
      : '⚔️ walka wręcz';
    const special =
      unit.specialCooldown === 0
        ? `${unit.def.specialName} — gotowy`
        : `${unit.def.specialName} — za ${unit.specialCooldown} tur`;
    this.statsText.setText(
      `${unit.def.name}   ${t.emoji} ${t.label}\n` +
        `❤️ HP ${unit.hp}/${unit.def.hp}    ⚔️ Atak ${unit.def.atk}    \u{1F462} Ruch ${unit.def.move}\n` +
        `${reach}\n` +
        `⚡ ${special}`
    );
  }

  // ---------- zasięg ruchu i cele ----------

  private blockedCells(excludeId: number) {
    const set = new Set<string>();
    this.units.filter((u) => u.id !== excludeId).forEach((u) => set.add(cellKey(u.col, u.row)));
    return set;
  }

  /** BFS po planszy — zwraca koszt dojścia do każdego osiągalnego pola. */
  private reachable(unit: Unit): Map<string, number> {
    const blocked = this.blockedCells(unit.id);
    const dist = new Map<string, number>([[cellKey(unit.col, unit.row), 0]]);
    const queue: Cell[] = [{ col: unit.col, row: unit.row }];

    while (queue.length > 0) {
      const cur = queue.shift()!;
      const cost = dist.get(cellKey(cur.col, cur.row))!;
      if (cost >= unit.def.move) continue;

      const neighbours: Cell[] = [
        { col: cur.col + 1, row: cur.row },
        { col: cur.col - 1, row: cur.row },
        { col: cur.col, row: cur.row + 1 },
        { col: cur.col, row: cur.row - 1 },
      ];
      for (const n of neighbours) {
        if (n.col < 0 || n.col >= COLS || n.row < 0 || n.row >= ROWS) continue;
        const key = cellKey(n.col, n.row);
        if (blocked.has(key) || dist.has(key)) continue;
        dist.set(key, cost + 1);
        queue.push(n);
      }
    }
    return dist;
  }

  private chebyshev(a: Cell, b: Cell) {
    return Math.max(Math.abs(a.col - b.col), Math.abs(a.row - b.row));
  }

  private adjacentCells(cell: Cell): Cell[] {
    return [
      { col: cell.col + 1, row: cell.row },
      { col: cell.col - 1, row: cell.row },
      { col: cell.col, row: cell.row + 1 },
      { col: cell.col, row: cell.row - 1 },
    ].filter((c) => c.col >= 0 && c.col < COLS && c.row >= 0 && c.row < ROWS);
  }

  private isAdjacent(a: Cell, b: Cell) {
    return Math.abs(a.col - b.col) + Math.abs(a.row - b.row) === 1;
  }

  private hasAdjacentEnemy(unit: Unit) {
    return this.units.some((u) => u.side !== unit.side && this.isAdjacent(unit, u));
  }

  /**
   * Cel jest atakowalny, gdy strzelec ma go w zasięgu, albo gdy jednostka
   * walcząca wręcz stoi obok lub może dojść na sąsiednie wolne pole.
   */
  private attackPlan(unit: Unit, target: Unit, reach: Map<string, number>): { from: Cell } | null {
    // Strzelec, jak łucznik w Heroes 3, dosięga każdego celu na planszy.
    if (unit.def.shooter) return { from: { col: unit.col, row: unit.row } };
    if (this.isAdjacent(unit, target)) return { from: { col: unit.col, row: unit.row } };

    let best: { from: Cell; cost: number } | null = null;
    for (const cell of this.adjacentCells(target)) {
      const cost = reach.get(cellKey(cell.col, cell.row));
      if (cost === undefined) continue;
      if (!best || cost < best.cost) best = { from: cell, cost };
    }
    return best ? { from: best.from } : null;
  }

  private damageOf(attacker: Unit, target: Unit, special: boolean) {
    const typeMult = typeMultiplier(attacker.def.type, target.def.type);
    const specialMult = special ? (attacker.def.specialKind === 'power' ? 2 : 1.5) : 1;

    // Strzelec traci połowę siły w zwarciu albo gdy cel stoi za daleko.
    const pinned = attacker.def.shooter && this.hasAdjacentEnemy(attacker);
    const tooFar =
      attacker.def.shooter && !pinned && this.chebyshev(attacker, target) > attacker.def.shootRange;
    const penalty = pinned || tooFar ? HALF_DAMAGE : 1;

    return {
      value: Math.max(1, Math.round(attacker.def.atk * typeMult * specialMult * penalty)),
      typeMult,
      specialMult,
      penalty,
      pinned,
      tooFar,
    };
  }

  // ---------- interakcja gracza ----------

  private showOptions(unit: Unit) {
    this.clearHighlights();
    const reach = this.reachable(unit);

    if (!this.specialArmed) {
      for (const [key, cost] of reach) {
        if (cost === 0) continue;
        const [col, row] = key.split(',').map(Number);
        this.addHighlight(col, row, 0x4fc3f7, 0.22, () => this.performMove(unit, { col, row }));
      }
    }

    for (const target of this.units.filter((u) => u.side !== unit.side)) {
      const plan = this.attackPlan(unit, target, reach);
      if (!plan) continue;
      // Pomarańczowy obrys znaczy cel, do którego strzał doleci osłabiony.
      const { tooFar } = this.damageOf(unit, target, this.specialArmed);
      const attackColor = this.specialArmed ? 0xffd166 : tooFar ? 0xff9800 : 0xef5350;
      this.addHighlight(
        target.col,
        target.row,
        attackColor,
        tooFar ? 0.22 : 0.35,
        () => this.attackTarget(unit, target),
        () => this.showForecast(unit, target, this.specialArmed)
      );
    }
  }

  private addHighlight(
    col: number,
    row: number,
    color: number,
    alpha: number,
    onClick: () => void,
    onHover?: () => void
  ) {
    const { x, y } = this.cellToXY(col, row);
    const rect = this.add
      .rectangle(x, y, CELL - 6, CELL - 6, color, alpha)
      .setStrokeStyle(2, color, 0.9)
      .setInteractive({ useHandCursor: true });
    rect.on('pointerdown', onClick);
    if (onHover) {
      rect.on('pointerover', onHover);
      rect.on('pointerout', () => this.forecastText.setText(''));
    }
    this.highlightLayer.add(rect);
  }

  private clearHighlights() {
    this.highlightLayer?.removeAll(true);
    this.approachLayer?.removeAll(true);
    this.preferredApproach = null;
    this.forecastText?.setText('');
    this.setCursor(null);
  }

  private showForecast(attacker: Unit, target: Unit, special: boolean) {
    const { value, typeMult, specialMult, penalty, pinned, tooFar } = this.damageOf(attacker, target, special);
    const parts = [`Atak ${attacker.def.atk}`];
    if (typeMult !== 1) parts.push(`× ${typeMult} (${typeMult > 1 ? 'przewaga typu' : 'słaby typ'})`);
    if (specialMult !== 1) parts.push(`× ${specialMult} (${attacker.def.specialName})`);
    if (pinned) parts.push('× 0.5 (strzelec w zwarciu)');
    else if (tooFar) parts.push('× 0.5 (za daleko — złamana strzała)');
    void penalty;
    this.forecastText.setText(`${parts.join(' ')} = ${value} ${damageWord(value)} dla ${target.def.name}`);
  }

  private onUnitHover(unit: Unit) {
    const active = this.activeUnit();
    if (!active || this.busy) return;
    if (unit.side !== active.side) {
      const plan = this.attackPlan(active, unit, this.reachable(active));
      if (plan) this.showForecast(active, unit, this.specialArmed);
    }
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
    this.performAttack(attacker, target, chosen, this.specialArmed);
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
    return this.adjacentCells(target).filter(
      (c) =>
        (c.col === attacker.col && c.row === attacker.row) || reach.has(cellKey(c.col, c.row))
    );
  }

  private clawFor(from: Cell, target: Unit) {
    if (from.col < target.col) return 'claw_right';
    if (from.col > target.col) return 'claw_left';
    if (from.row < target.row) return 'claw_down';
    return 'claw_up';
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

    if (active.def.shooter) {
      const { tooFar } = this.damageOf(active, target, this.specialArmed);
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
    const ranked = [
      { cell: { col: target.col - 1, row: target.row }, score: -dx },
      { cell: { col: target.col + 1, row: target.row }, score: dx },
      { cell: { col: target.col, row: target.row - 1 }, score: -dy },
      { cell: { col: target.col, row: target.row + 1 }, score: dy },
    ].sort((a, b) => b.score - a.score);

    const best =
      ranked.find((r) => options.some((o) => o.col === r.cell.col && o.row === r.cell.row))?.cell ??
      options[0];

    this.preferredApproach = { targetId: target.id, cell: best };
    this.setCursor(this.clawFor(best, target));
    this.showApproachMarker(best);
  }

  private showApproachMarker(cell: Cell) {
    this.approachLayer.removeAll(true);
    const { x, y } = this.cellToXY(cell.col, cell.row);
    this.approachLayer.add(
      this.add.rectangle(x, y, CELL - 10, CELL - 10, 0xffd166, 0.28).setStrokeStyle(3, 0xffd166, 1)
    );
  }

  private clearApproach() {
    this.preferredApproach = null;
    this.approachLayer?.removeAll(true);
    this.setCursor(null);
  }

  private toggleSpecial() {
    if (this.gameOver || this.busy) return;
    const unit = this.activeUnit();
    if (!unit || unit.side !== 'player' || unit.specialCooldown > 0) return;
    this.specialArmed = !this.specialArmed;
    this.updateSpecialButton(unit);
    this.showOptions(unit);
  }

  private updateSpecialButton(unit: Unit) {
    this.specialButton.setVisible(true);
    const ready = unit.specialCooldown === 0;
    this.specialLabel.setText(
      ready
        ? this.specialArmed
          ? `⚡ ${unit.def.specialName}\nwybierz cel`
          : `⚡ ${unit.def.specialName}\nkliknij, by użyć`
        : `⚡ ${unit.def.specialName}\nodnowi się za ${unit.specialCooldown} tur`
    );
    this.specialBg.setFillStyle(this.specialArmed ? 0x8d6e00 : 0x2c3a63);
    this.specialButton.setAlpha(ready ? 1 : 0.45);
  }

  // ---------- akcje ----------

  private performMove(unit: Unit, cell: Cell, onDone?: () => void) {
    this.busy = true;
    this.clearHighlights();
    unit.col = cell.col;
    unit.row = cell.row;
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

  private performAttack(attacker: Unit, target: Unit, from: Cell, special: boolean) {
    this.busy = true;
    this.clearHighlights();

    const strike = () => {
      const done = () => this.resolveAttack(attacker, target, special);
      if (attacker.def.shooter) {
        const { tooFar } = this.damageOf(attacker, target, special);
        this.fireProjectile(attacker, target, tooFar, done);
      } else {
        this.meleeLunge(attacker, target, done);
      }
    };

    if (from.col !== attacker.col || from.row !== attacker.row) {
      this.performMove(attacker, from, strike);
    } else {
      strike();
    }
  }

  private meleeLunge(attacker: Unit, target: Unit, onDone: () => void) {
    const start = { x: attacker.container.x, y: attacker.container.y };
    const to = this.cellToXY(target.col, target.row);

    // Dwa osobne ruchy zamiast yoyo: yoyo zgłasza się raz na animowaną
    // właściwość, więc trafienie liczyłoby się podwójnie (x i y).
    this.tweens.add({
      targets: attacker.container,
      x: start.x + (to.x - start.x) * 0.4,
      y: start.y + (to.y - start.y) * 0.4,
      duration: 120,
      ease: 'Quad.easeOut',
      onComplete: () => {
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
  }

  private fireProjectile(attacker: Unit, target: Unit, broken: boolean, onDone: () => void) {
    const from = this.cellToXY(attacker.col, attacker.row);
    const to = this.cellToXY(target.col, target.row);
    const color = TYPE_INFO[attacker.def.type].color;
    const angle = Phaser.Math.Angle.Between(from.x, from.y, to.x, to.y);

    const shot = this.add.container(from.x, from.y);
    if (broken) {
      // Złamana strzała: dwa kawałki lecące osobno, jak w Heroes 3.
      shot.add(this.add.rectangle(-7, -2, 9, 3, color).setAngle(-12));
      shot.add(this.add.rectangle(5, 3, 9, 3, color).setAngle(14));
    } else {
      shot.add(this.add.rectangle(-4, 0, 14, 3, color));
      shot.add(this.add.triangle(7, 0, 0, -5, 0, 5, 9, 0, color));
    }
    shot.setRotation(angle);
    this.effectLayer.add(shot);

    this.tweens.add({
      targets: shot,
      x: to.x,
      y: to.y,
      duration: broken ? 380 : 280,
      ease: broken ? 'Quad.easeOut' : 'Quad.easeIn',
      onComplete: () => {
        shot.destroy();
        onDone();
      },
    });
  }

  private resolveAttack(attacker: Unit, target: Unit, special: boolean) {
    const { value, typeMult, pinned, tooFar } = this.damageOf(attacker, target, special);
    target.hp -= value;

    if (tooFar) this.floatText(target, 'Złamana strzała — pół siły', '#ff9800', -66);
    else if (pinned) this.floatText(attacker, 'Strzelec w zwarciu!', '#ff9800', -60);

    if (special) {
      attacker.specialCooldown = SPECIAL_COOLDOWN;
      this.floatText(attacker, attacker.def.specialName, '#ffd166', -46);
      if (attacker.def.specialKind === 'drain') {
        const heal = Math.floor(value / 2);
        attacker.hp = Math.min(attacker.def.hp, attacker.hp + heal);
        this.refreshHp(attacker);
        this.floatText(attacker, `+${heal} HP`, '#66bb6a', -30);
      }
    }

    this.floatText(target, `-${value}`, '#ff8a80', -34);
    if (typeMult > 1) this.floatText(target, 'Super skuteczne!', '#66bb6a', -52);
    else if (typeMult < 1) this.floatText(target, 'Słabo skuteczne...', '#b0bec5', -52);

    this.cameras.main.shake(120, special ? 0.006 : 0.003);

    if (target.hp <= 0) {
      target.hp = 0;
      this.refreshHp(target);
      this.tweens.add({
        targets: target.container,
        alpha: 0,
        scale: 0.5,
        duration: 320,
        onComplete: () => target.container.destroy(),
      });
      this.units = this.units.filter((u) => u.id !== target.id);
    } else {
      this.refreshHp(target);
    }

    this.checkGameOver();
    if (!this.gameOver) this.time.delayedCall(650, () => this.advanceTurn());
  }

  private floatText(unit: Unit, text: string, color: string, offsetY: number) {
    const cell = this.cellToXY(unit.col, unit.row);
    const t = this.add
      .text(cell.x, cell.y + offsetY, text, {
        fontFamily: 'Trebuchet MS, sans-serif',
        fontSize: '14px',
        color,
        fontStyle: 'bold',
        stroke: '#000000',
        strokeThickness: 3,
      })
      .setOrigin(0.5);

    // Trzymaj napis w granicach planszy — inaczej ucieka poza ekran przy krawędzi.
    t.x = Phaser.Math.Clamp(t.x, BOARD_X + t.width / 2, BOARD_X + BOARD_W - t.width / 2);
    t.y = Phaser.Math.Clamp(t.y, BOARD_Y + 32, BOARD_Y + BOARD_H - 8);

    this.effectLayer.add(t);
    this.tweens.add({
      targets: t,
      y: t.y - 26,
      alpha: 0,
      duration: 850,
      onComplete: () => t.destroy(),
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
    const useSpecial = unit.specialCooldown === 0;

    let best: { target: Unit; from: Cell; score: number } | null = null;
    for (const target of targets) {
      const plan = this.attackPlan(unit, target, reach);
      if (!plan) continue;
      const dmg = this.damageOf(unit, target, useSpecial).value;
      // Premiuj dobicie celu i mocne trafienia w słabo opancerzonych.
      const score = dmg >= target.hp ? dmg + 100 : dmg + (target.def.shooter ? 10 : 0);
      if (!best || score > best.score) best = { target, from: plan.from, score };
    }

    if (best) {
      this.performAttack(unit, best.target, best.from, useSpecial);
      return;
    }

    // Nikt w zasięgu — podejdź w stronę najbliższego celu.
    let nearest = targets[0];
    for (const t of targets) {
      if (this.chebyshev(unit, t) < this.chebyshev(unit, nearest)) nearest = t;
    }

    let bestCell: Cell = { col: unit.col, row: unit.row };
    let bestDist = this.chebyshev(unit, nearest);
    for (const key of reach.keys()) {
      const [col, row] = key.split(',').map(Number);
      const d = this.chebyshev({ col, row }, nearest);
      if (d < bestDist) {
        bestDist = d;
        bestCell = { col, row };
      }
    }

    if (bestCell.col === unit.col && bestCell.row === unit.row) this.advanceTurn();
    else this.performMove(unit, bestCell);
  }

  // ---------- koniec bitwy ----------

  private checkGameOver() {
    const playersLeft = this.units.some((u) => u.side === 'player');
    const enemiesLeft = this.units.some((u) => u.side === 'enemy');
    if (playersLeft && enemiesLeft) return;

    this.gameOver = true;
    this.clearHighlights();
    this.specialButton.setVisible(false);
    this.turnText.setText('');

    const won = playersLeft;
    const overlay = this.add.rectangle(
      this.scale.width / 2,
      this.scale.height / 2,
      this.scale.width,
      this.scale.height,
      0x000000,
      0.6
    );
    const label = this.add
      .text(this.scale.width / 2, this.scale.height / 2, won ? 'ZWYCIĘSTWO!' : 'PORAŻKA', {
        fontFamily: 'Trebuchet MS, sans-serif',
        fontSize: '48px',
        color: won ? '#ffd166' : '#ef5350',
        fontStyle: 'bold',
        stroke: '#000000',
        strokeThickness: 6,
      })
      .setOrigin(0.5);
    this.effectLayer.add([overlay, label]);
  }
}
