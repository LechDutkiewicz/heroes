import Phaser from 'phaser';

type Side = 'player' | 'enemy';

interface UnitDef {
  name: string;
  hp: number;
  atk: number;
  move: number;
  color: number;
}

interface Unit {
  id: number;
  side: Side;
  def: UnitDef;
  hp: number;
  col: number;
  row: number;
  container: Phaser.GameObjects.Container;
  hpText: Phaser.GameObjects.Text;
  bg: Phaser.GameObjects.Rectangle;
}

const COLS = 10;
const ROWS = 6;
const CELL = 80;
const BOARD_X = 40;
const BOARD_Y = 90;

const PLAYER_TEAM: UnitDef[] = [
  { name: 'Ognisz', hp: 30, atk: 8, move: 3, color: 0xe74c3c },
  { name: 'Wodnik', hp: 26, atk: 7, move: 4, color: 0x3498db },
  { name: 'Lisliść', hp: 22, atk: 9, move: 3, color: 0x2ecc71 },
];

const ENEMY_TEAM: UnitDef[] = [
  { name: 'Skalun', hp: 34, atk: 6, move: 2, color: 0x95a5a6 },
  { name: 'Iskrzyk', hp: 20, atk: 10, move: 4, color: 0xf1c40f },
  { name: 'Mroczek', hp: 24, atk: 8, move: 3, color: 0x8e44ad },
];

export class BattleScene extends Phaser.Scene {
  private units: Unit[] = [];
  private turnOrder: number[] = [];
  private turnIndex = 0;
  private nextId = 1;
  private highlights: Phaser.GameObjects.Rectangle[] = [];
  private statusText!: Phaser.GameObjects.Text;
  private gameOver = false;

  constructor() {
    super('battle');
  }

  create() {
    this.drawGrid();

    this.statusText = this.add.text(BOARD_X, 20, '', {
      fontFamily: 'sans-serif',
      fontSize: '22px',
      color: '#ffffff',
    });

    PLAYER_TEAM.forEach((def, i) => this.spawnUnit(def, 'player', 0, i * 2));
    ENEMY_TEAM.forEach((def, i) => this.spawnUnit(def, 'enemy', COLS - 1, i * 2));

    this.turnOrder = this.units.map((u) => u.id).sort(() => Math.random() - 0.5);
    this.turnIndex = 0;

    this.beginTurn();
  }

  private drawGrid() {
    const g = this.add.graphics();
    g.lineStyle(1, 0x2c2c44, 1);
    for (let c = 0; c <= COLS; c++) {
      g.lineBetween(BOARD_X + c * CELL, BOARD_Y, BOARD_X + c * CELL, BOARD_Y + ROWS * CELL);
    }
    for (let r = 0; r <= ROWS; r++) {
      g.lineBetween(BOARD_X, BOARD_Y + r * CELL, BOARD_X + COLS * CELL, BOARD_Y + r * CELL);
    }
  }

  private cellToXY(col: number, row: number) {
    return {
      x: BOARD_X + col * CELL + CELL / 2,
      y: BOARD_Y + row * CELL + CELL / 2,
    };
  }

  private spawnUnit(def: UnitDef, side: Side, col: number, row: number) {
    const { x, y } = this.cellToXY(col, row);
    const bg = this.add.rectangle(0, 0, CELL - 10, CELL - 10, def.color).setStrokeStyle(2, 0x000000);
    const label = this.add
      .text(0, -8, def.name, { fontFamily: 'sans-serif', fontSize: '12px', color: '#ffffff' })
      .setOrigin(0.5);
    const hpText = this.add
      .text(0, 14, `${def.hp}/${def.hp}`, { fontFamily: 'sans-serif', fontSize: '12px', color: '#ffffff' })
      .setOrigin(0.5);

    const container = this.add.container(x, y, [bg, label, hpText]);
    container.setSize(CELL - 10, CELL - 10);
    bg.setInteractive({ useHandCursor: true });

    const unit: Unit = {
      id: this.nextId++,
      side,
      def,
      hp: def.hp,
      col,
      row,
      container,
      hpText,
      bg,
    };

    bg.on('pointerdown', () => this.onUnitClicked(unit));
    this.units.push(unit);
    return unit;
  }

  private activeUnit(): Unit | undefined {
    const id = this.turnOrder[this.turnIndex];
    return this.units.find((u) => u.id === id);
  }

  private beginTurn() {
    if (this.gameOver) return;
    this.clearHighlights();

    const unit = this.activeUnit();
    if (!unit) {
      this.advanceTurn();
      return;
    }

    this.statusText.setText(
      `Tura: ${unit.def.name} (${unit.side === 'player' ? 'Ty' : 'Przeciwnik'})`
    );

    if (unit.side === 'enemy') {
      this.time.delayedCall(500, () => this.enemyAct(unit));
    } else {
      this.showRange(unit);
    }
  }

  private advanceTurn() {
    if (this.gameOver) return;
    this.turnOrder = this.turnOrder.filter((id) => this.units.some((u) => u.id === id && u.hp > 0));
    if (this.turnOrder.length === 0) return;
    this.turnIndex = (this.turnIndex + 1) % this.turnOrder.length;
    this.beginTurn();
  }

  private distance(a: { col: number; row: number }, b: { col: number; row: number }) {
    return Math.abs(a.col - b.col) + Math.abs(a.row - b.row);
  }

  private occupiedCells(excludeId?: number) {
    return this.units
      .filter((u) => u.hp > 0 && u.id !== excludeId)
      .map((u) => ({ col: u.col, row: u.row }));
  }

  private showRange(unit: Unit) {
    this.clearHighlights();
    const occupied = this.occupiedCells(unit.id);

    for (let col = 0; col < COLS; col++) {
      for (let row = 0; row < ROWS; row++) {
        const dist = this.distance(unit, { col, row });
        const blocked = occupied.some((o) => o.col === col && o.row === row);
        if (dist > 0 && dist <= unit.def.move && !blocked) {
          this.addHighlight(col, row, 0x3498db, () => this.moveUnit(unit, col, row));
        }
      }
    }

    const enemies = this.units.filter((u) => u.hp > 0 && u.side !== unit.side);
    for (const enemy of enemies) {
      if (this.distance(unit, enemy) === 1) {
        this.addHighlight(enemy.col, enemy.row, 0xe74c3c, () => this.attackUnit(unit, enemy));
      }
    }
  }

  private addHighlight(col: number, row: number, color: number, onClick: () => void) {
    const { x, y } = this.cellToXY(col, row);
    const rect = this.add.rectangle(x, y, CELL - 6, CELL - 6, color, 0.35).setStrokeStyle(2, color);
    rect.setInteractive({ useHandCursor: true });
    rect.on('pointerdown', onClick);
    this.highlights.push(rect);
  }

  private clearHighlights() {
    this.highlights.forEach((h) => h.destroy());
    this.highlights = [];
  }

  private onUnitClicked(unit: Unit) {
    if (this.gameOver) return;
    const active = this.activeUnit();
    if (!active || active.side !== 'player' || active.id !== unit.id) return;
    this.showRange(unit);
  }

  private moveUnit(unit: Unit, col: number, row: number) {
    unit.col = col;
    unit.row = row;
    const { x, y } = this.cellToXY(col, row);
    this.tweens.add({ targets: unit.container, x, y, duration: 200 });
    this.clearHighlights();
    this.time.delayedCall(220, () => this.advanceTurn());
  }

  private attackUnit(attacker: Unit, target: Unit) {
    target.hp -= attacker.def.atk;
    if (target.hp <= 0) {
      target.hp = 0;
      target.hpText.setText('0/0');
      target.container.destroy();
      this.units = this.units.filter((u) => u.id !== target.id);
    } else {
      target.hpText.setText(`${target.hp}/${target.def.hp}`);
    }
    this.clearHighlights();
    this.checkGameOver();
    if (!this.gameOver) {
      this.time.delayedCall(200, () => this.advanceTurn());
    }
  }

  private enemyAct(unit: Unit) {
    if (this.gameOver) return;
    const targets = this.units.filter((u) => u.hp > 0 && u.side === 'player');
    if (targets.length === 0) {
      this.checkGameOver();
      return;
    }

    let nearest = targets[0];
    let bestDist = this.distance(unit, nearest);
    for (const t of targets) {
      const d = this.distance(unit, t);
      if (d < bestDist) {
        bestDist = d;
        nearest = t;
      }
    }

    if (bestDist === 1) {
      this.attackUnit(unit, nearest);
      return;
    }

    const occupied = this.occupiedCells(unit.id);
    let bestCell = { col: unit.col, row: unit.row };
    let bestScore = bestDist;
    for (let col = 0; col < COLS; col++) {
      for (let row = 0; row < ROWS; row++) {
        const d = this.distance({ col, row }, unit);
        const blocked = occupied.some((o) => o.col === col && o.row === row);
        if (d > 0 && d <= unit.def.move && !blocked) {
          const distToTarget = this.distance({ col, row }, nearest);
          if (distToTarget < bestScore) {
            bestScore = distToTarget;
            bestCell = { col, row };
          }
        }
      }
    }

    this.moveUnit(unit, bestCell.col, bestCell.row);
  }

  private checkGameOver() {
    const playersLeft = this.units.some((u) => u.side === 'player' && u.hp > 0);
    const enemiesLeft = this.units.some((u) => u.side === 'enemy' && u.hp > 0);
    if (!playersLeft || !enemiesLeft) {
      this.gameOver = true;
      this.clearHighlights();
      this.statusText.setText(playersLeft ? 'Wygrana!' : 'Przegrana...');
    }
  }
}
