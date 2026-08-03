import Phaser from 'phaser';
import {
  ALL_SPRITES,
  ENEMY_TEAM,
  HALF_DAMAGE,
  PLAYER_TEAM,
  SPECIAL_COOLDOWN,
  TYPE_INFO,
  applyDamage,
  applyHeal,
  fullHp,
  stackAtk,
  totalHp,
  typeMultiplier,
  type UnitDef,
} from '../data/units';
import { hexDistance, hexNeighbours, type Cell } from '../data/hex';

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
  specialCooldown: number;
  /** przeczekał już w tej rundzie — drugi raz nie wolno */
  waited: boolean;
  /** stoi w obronie do swojej następnej kolejki */
  defending: boolean;
  container: Phaser.GameObjects.Container;
  sprite: Phaser.GameObjects.Image;
  hpBar: Phaser.GameObjects.Rectangle;
  hpLabel: Phaser.GameObjects.Text;
  countLabel: Phaser.GameObjects.Text;
  atkBadge: Phaser.GameObjects.Text;
  shieldIcon: Phaser.GameObjects.Text;
  platform: Phaser.GameObjects.Ellipse;
}

// ---------- geometria planszy z hexów ----------
// Układ „odd-r": hexy stoją wierzchołkiem do góry, a nieparzyste rzędy są
// przesunięte o pół hexa w prawo. Każdy hex ma sześciu sąsiadów w równej
// odległości — nie ma już skosów tańszych albo droższych niż proste.

const COLS = 10;
const ROWS = 7;
/** promień hexa: od środka do wierzchołka */
const HEX_R = 46;
const HEX_W = Math.sqrt(3) * HEX_R;
const HEX_H = 2 * HEX_R;
/** pionowy odstęp między rzędami — hexy zazębiają się, stąd 3/4 wysokości */
const ROW_STEP = HEX_R * 1.5;

// Plansza wyśrodkowana: szerokość hexów wyznacza margines, nie odwrotnie.
const BOARD_X = 62;
const BOARD_Y = 92;
const BOARD_W = HEX_W * (COLS + 0.5);
const BOARD_H = ROW_STEP * (ROWS - 1) + HEX_H;
const PANEL_Y = BOARD_Y + BOARD_H + 14;
const PANEL_H = 168;
/** Szerokość lewej kolumny panelu — reszta należy do przycisków. */
const TEXT_COL_W = BOARD_W - 300;

const HP_BAR_W = 50;
const HP_BAR_H = 9;

/** O tyle słabsze jest trafienie w oddział, który stoi w obronie. */
const GUARD_REDUCTION = 0.7;

/** Sześć oddziałów w kolumnie z przerwą pośrodku — reszta rzędów zostaje wolna. */
const START_ROWS = [0, 1, 2, 4, 5, 6];

const cellKey = (col: number, row: number) => `${col},${row}`;

/** Sześć wierzchołków hexa wokół podanego środka. */
function hexPoints(cx: number, cy: number) {
  const pts: Phaser.Math.Vector2[] = [];
  for (let i = 0; i < 6; i++) {
    const a = Phaser.Math.DegToRad(60 * i - 90);
    pts.push(new Phaser.Math.Vector2(cx + HEX_R * Math.cos(a), cy + HEX_R * Math.sin(a)));
  }
  return pts;
}

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
  private approachLayer!: Phaser.GameObjects.Container;
  private effectLayer!: Phaser.GameObjects.Container;
  /** Pole, z którego gracz chce uderzyć — wybierane położeniem kursora. */
  private preferredApproach: { targetId: number; cell: Cell } | null = null;
  private queueIcons: Phaser.GameObjects.Container[] = [];
  private queueLabel?: Phaser.GameObjects.Text;

  private turnText!: Phaser.GameObjects.Text;
  private statsText!: Phaser.GameObjects.Text;
  private forecastText!: Phaser.GameObjects.Text;
  private specialButton!: Button;
  private waitButton!: Button;
  private guardButton!: Button;

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

    this.input.keyboard?.on('keydown-C', () => this.waitTurn());
    this.input.keyboard?.on('keydown-O', () => this.guardTurn());

    this.startRound();
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

    for (let row = 0; row < ROWS; row++) {
      for (let col = 0; col < COLS; col++) {
        const { x, y } = this.cellToXY(col, row);
        // Strefy startowe obu drużyn dostają własny odcień.
        const fill = col === 0 ? 0x2c4a66 : col === COLS - 1 ? 0x4a2f3f : (col + row) % 2 === 0 ? 0x2f3c60 : 0x2a3556;
        g.fillStyle(fill, 1);
        g.fillPoints(hexPoints(x, y), true);
        g.lineStyle(1, 0x3a4770, 0.8);
        g.strokePoints(hexPoints(x, y), true);
      }
    }
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

    // Teksty trzymają się lewej kolumny, przyciski prawej.
    this.statsText = this.add.text(BOARD_X + 10, PANEL_Y + 8, '', {
      fontFamily: 'Trebuchet MS, sans-serif',
      fontSize: '14px',
      color: '#e8ecff',
      lineSpacing: 3,
      wordWrap: { width: TEXT_COL_W },
    });

    // Prognoza stoi pod przyciskami, więc ma całą szerokość panelu.
    this.forecastText = this.add.text(BOARD_X + 10, PANEL_Y + 128, '', {
      fontFamily: 'Trebuchet MS, sans-serif',
      fontSize: '14px',
      color: '#ffd166',
      wordWrap: { width: BOARD_W - 20 },
    });

    const right = BOARD_X + BOARD_W - 140;
    this.specialButton = this.makeButton(right, PANEL_Y + 32, 250, 40, () => this.toggleSpecial());
    this.waitButton = this.makeButton(right - 65, PANEL_Y + 84, 120, 36, () => this.waitTurn());
    this.guardButton = this.makeButton(right + 65, PANEL_Y + 84, 120, 36, () => this.guardTurn());
  }

  // ---------- jednostki ----------

  private cellToXY(col: number, row: number) {
    return {
      x: BOARD_X + HEX_W / 2 + col * HEX_W + (row & 1 ? HEX_W / 2 : 0),
      y: BOARD_Y + HEX_R + row * ROW_STEP,
    };
  }

  /** Obszar kliknięcia w kształcie hexa — prostokąt zachodziłby na sąsiadów. */
  private hexHitArea() {
    return new Phaser.Geom.Polygon(hexPoints(HEX_W / 2, HEX_H / 2));
  }

  private spawnUnit(def: UnitDef, side: Side, col: number, row: number) {
    const { x, y } = this.cellToXY(col, row);
    const accent = side === 'player' ? 0x4fc3f7 : 0xef5350;

    // Podest pod pokemonem zdradza, do kogo należy i podświetla aktywny oddział.
    const platform = this.add.ellipse(0, 18, 42, 13, accent, 0.22).setStrokeStyle(2, accent, 0.6);

    const sprite = this.add.image(0, -6, def.sprite).setDisplaySize(58, 58);

    const name = this.add
      .text(0, -31, def.name, {
        fontFamily: 'Trebuchet MS, sans-serif',
        fontSize: '10px',
        color: '#ffffff',
        fontStyle: 'bold',
        stroke: '#0d1023',
        strokeThickness: 3,
      })
      .setOrigin(0.5);

    const typeBadge = this.add.text(-25, -20, TYPE_INFO[def.type].emoji, { fontSize: '12px' }).setOrigin(0.5);

    // Tarcza zapala się tylko wtedy, gdy oddział stoi w obronie.
    const shieldIcon = this.add
      .text(24, -20, '\u{1F6E1}\u{FE0F}', { fontSize: '13px' })
      .setOrigin(0.5)
      .setVisible(false);

    // Odznaka pokazuje siłę całego oddziału, bo to ona decyduje o trafieniu.
    const atkBadge = this.add
      .text(-19, 16, `${def.shooter ? '\u{1F3F9}' : '⚔️'}${def.count * def.atk}`, {
        fontFamily: 'Trebuchet MS, sans-serif',
        fontSize: '11px',
        color: '#ffffff',
        backgroundColor: '#000000aa',
        padding: { x: 3, y: 1 },
      })
      .setOrigin(0.5);

    // Liczebność oddziału w rogu, jak w Heroes 3 — najważniejsza liczba na polu.
    const countBg = this.add.rectangle(23, 16, 26, 16, 0x11162b, 0.92).setStrokeStyle(2, accent, 1);
    const countLabel = this.add
      .text(23, 16, `${def.count}`, {
        fontFamily: 'Trebuchet MS, sans-serif',
        fontSize: '13px',
        color: '#ffffff',
        fontStyle: 'bold',
      })
      .setOrigin(0.5);

    const hpBarBg = this.add.rectangle(0, 28, HP_BAR_W, HP_BAR_H, 0x11162b, 0.9).setStrokeStyle(1, 0x000000, 0.6);
    const hpBar = this.add.rectangle(-HP_BAR_W / 2, 28, HP_BAR_W, HP_BAR_H, 0x4caf50).setOrigin(0, 0.5);
    const hpLabel = this.add
      .text(0, 28, `${fullHp(def)}/${fullHp(def)}`, {
        fontFamily: 'Trebuchet MS, sans-serif',
        fontSize: '9px',
        color: '#ffffff',
        fontStyle: 'bold',
      })
      .setOrigin(0.5);

    const hit = this.add
      .zone(0, 0, HEX_W, HEX_H)
      .setInteractive(this.hexHitArea(), Phaser.Geom.Polygon.Contains);

    const container = this.add.container(x, y, [
      platform,
      sprite,
      typeBadge,
      shieldIcon,
      atkBadge,
      name,
      hpBarBg,
      hpBar,
      hpLabel,
      countBg,
      countLabel,
      hit,
    ]);
    container.setDepth(10);

    const unit: Unit = {
      id: this.nextId++,
      side,
      def,
      count: def.count,
      topHp: def.hp,
      col,
      row,
      specialCooldown: 0,
      waited: false,
      defending: false,
      container,
      sprite,
      hpBar,
      hpLabel,
      countLabel,
      atkBadge,
      shieldIcon,
      platform,
    };

    hit.on('pointerdown', () => this.onUnitClicked(unit));
    hit.on('pointerover', () => this.onUnitHover(unit));
    hit.on('pointermove', (p: Phaser.Input.Pointer) => this.onEnemyPointerMove(unit, p));
    hit.on('pointerout', () => {
      this.forecastText.setText('');
      this.clearApproach();
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
    const max = fullHp(unit.def);
    const ratio = Phaser.Math.Clamp(this.total(unit) / max, 0, 1);
    unit.hpBar.width = HP_BAR_W * ratio;
    unit.hpBar.fillColor = ratio > 0.5 ? 0x4caf50 : ratio > 0.25 ? 0xffb300 : 0xe53935;
    unit.hpLabel.setText(`${this.total(unit)}/${max}`);
    unit.countLabel.setText(`${unit.count}`);
    unit.atkBadge.setText(`${unit.def.shooter ? '\u{1F3F9}' : '⚔️'}${stackAtk(unit.def, unit)}`);
    unit.shieldIcon.setVisible(unit.defending);
  }

  // ---------- kolejka tur ----------

  /** Nowa runda: wszyscy żywi ustawiają się od najszybszego. */
  private startRound() {
    this.units.forEach((u) => (u.waited = false));
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
    return this.units.find((u) => u.id === this.roundQueue[0]);
  }

  private beginTurn() {
    if (this.gameOver) return;
    this.clearHighlights();
    this.specialArmed = false;
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

    if (unit.specialCooldown > 0) unit.specialCooldown--;
    // Obrona trzyma tylko do własnej następnej kolejki.
    unit.defending = false;
    this.refreshStack(unit);

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
    this.tweens.killTweensOf(this.units.map((u) => u.platform));
    this.units.forEach((u) => u.platform.setScale(1));
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
    this.floatText(unit, '\u{23F3} Czekam', '#8ea0d0', -46);
    this.tweens.killTweensOf(this.units.map((u) => u.platform));
    this.units.forEach((u) => u.platform.setScale(1));
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
    this.floatText(unit, '\u{1F6E1}\u{FE0F} Obrona', '#4fc3f7', -46);
    this.time.delayedCall(500, () => this.advanceTurn());
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
    const whose = unit.side === 'player' ? 'twój oddział' : 'oddział przeciwnika';
    const guard = unit.defending ? '   \u{1F6E1}\u{FE0F} w obronie' : '';

    this.statsText.setText(
      `${unit.def.name} ×${unit.count}   ${t.emoji} ${t.label}   (${whose})${guard}\n` +
        `❤️ HP ${this.total(unit)}/${fullHp(unit.def)} (po ${unit.def.hp} na stworka)    ` +
        `\u{1F462} Ruch ${unit.def.move}\n` +
        `⚔️ Atak ${unit.count} × ${unit.def.atk} = ${stackAtk(unit.def, unit)}\n` +
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

  private neighbours(cell: Cell): Cell[] {
    return hexNeighbours(cell, COLS, ROWS);
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

      for (const n of this.neighbours(cur)) {
        const key = cellKey(n.col, n.row);
        if (blocked.has(key) || dist.has(key)) continue;
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
   * Cel jest atakowalny, gdy strzelec ma go w zasięgu, albo gdy jednostka
   * walcząca wręcz stoi obok lub może dojść na sąsiednie wolne pole.
   */
  private attackPlan(unit: Unit, target: Unit, reach: Map<string, number>): { from: Cell } | null {
    // Strzelec, jak łucznik w Heroes 3, dosięga każdego celu na planszy.
    if (unit.def.shooter) return { from: { col: unit.col, row: unit.row } };
    if (this.isAdjacent(unit, target)) return { from: { col: unit.col, row: unit.row } };

    let best: { from: Cell; cost: number } | null = null;
    for (const cell of this.neighbours(target)) {
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
      attacker.def.shooter && !pinned && hexDistance(attacker, target) > attacker.def.shootRange;
    const penalty = pinned || tooFar ? HALF_DAMAGE : 1;
    const guard = target.defending ? GUARD_REDUCTION : 1;

    // Bije cały oddział naraz, więc podstawą jest liczebność razy atak stworka.
    const base = stackAtk(attacker.def, attacker);
    const value = Math.max(1, Math.round(base * typeMult * specialMult * penalty * guard));

    return {
      value,
      base,
      typeMult,
      specialMult,
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

    if (!this.specialArmed) {
      for (const [key, cost] of reach) {
        if (cost === 0) continue;
        const [col, row] = key.split(',').map(Number);
        this.addHighlight(g, col, row, 0x4fc3f7, 0.22, () => this.performMove(unit, { col, row }));
      }
    }

    for (const target of this.units.filter((u) => u.side !== unit.side)) {
      const plan = this.attackPlan(unit, target, reach);
      if (!plan) continue;
      // Pomarańczowy obrys znaczy cel, do którego strzał doleci osłabiony.
      const { tooFar } = this.damageOf(unit, target, this.specialArmed);
      const attackColor = this.specialArmed ? 0xffd166 : tooFar ? 0xff9800 : 0xef5350;
      this.addHighlight(
        g,
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
    g: Phaser.GameObjects.Graphics,
    col: number,
    row: number,
    color: number,
    alpha: number,
    onClick: () => void,
    onHover?: () => void
  ) {
    const { x, y } = this.cellToXY(col, row);
    const pts = hexPoints(x, y);
    g.fillStyle(color, alpha);
    g.fillPoints(pts, true);
    g.lineStyle(2, color, 0.9);
    g.strokePoints(pts, true);

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

  private clearHighlights() {
    this.highlightLayer?.removeAll(true);
    this.approachLayer?.removeAll(true);
    this.preferredApproach = null;
    this.forecastText?.setText('');
    this.setCursor(null);
  }

  private showForecast(attacker: Unit, target: Unit, special: boolean) {
    const { value, base, typeMult, specialMult, penalty, pinned, tooFar, guarded, kills } =
      this.damageOf(attacker, target, special);
    // Zaczynamy od liczebności razy atak — stąd bierze się siła oddziału.
    const parts = [`Atak ${attacker.count} × ${attacker.def.atk} = ${base}`];
    if (typeMult !== 1) parts.push(`× ${typeMult} (${typeMult > 1 ? 'przewaga typu' : 'słaby typ'})`);
    if (specialMult !== 1) parts.push(`× ${specialMult} (${attacker.def.specialName})`);
    if (pinned) parts.push('× 0.5 (strzelec w zwarciu)');
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

  private onUnitHover(unit: Unit) {
    if (this.gameOver) return;
    // Najechanie na kogokolwiek pokazuje jego statystyki — także wroga.
    this.showStats(unit);

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
    this.approachLayer.removeAll(true);
    const { x, y } = this.cellToXY(cell.col, cell.row);
    const pts = hexPoints(x, y);
    const g = this.add.graphics();
    g.fillStyle(0xffd166, 0.28);
    g.fillPoints(pts, true);
    g.lineStyle(3, 0xffd166, 1);
    g.strokePoints(pts, true);
    this.approachLayer.add(g);
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
    this.updateButtons(unit);
    this.showOptions(unit);
  }

  private setButtonsVisible(visible: boolean) {
    this.specialButton.container.setVisible(visible);
    this.waitButton.container.setVisible(visible);
    this.guardButton.container.setVisible(visible);
  }

  private updateButtons(unit: Unit) {
    const ready = unit.specialCooldown === 0;
    this.specialButton.label.setText(
      ready
        ? this.specialArmed
          ? `⚡ ${unit.def.specialName}\nwybierz cel`
          : `⚡ ${unit.def.specialName}\nkliknij, by użyć`
        : `⚡ ${unit.def.specialName}\nodnowi się za ${unit.specialCooldown} tur`
    );
    this.specialButton.bg.setFillStyle(this.specialArmed ? 0x8d6e00 : 0x2c3a63);
    this.specialButton.container.setAlpha(ready ? 1 : 0.45);

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
    const { value, typeMult, pinned, tooFar, guarded } = this.damageOf(attacker, target, special);
    const { state, killed } = applyDamage(target.def, target, value);
    target.count = state.count;
    target.topHp = state.topHp;

    if (tooFar) this.floatText(target, 'Złamana strzała — pół siły', '#ff9800', -66);
    else if (pinned) this.floatText(attacker, 'Strzelec w zwarciu!', '#ff9800', -60);
    if (guarded && target.count > 0) this.floatText(target, 'Obrona zamortyzowała', '#4fc3f7', -82);

    if (special) {
      attacker.specialCooldown = SPECIAL_COOLDOWN;
      this.floatText(attacker, attacker.def.specialName, '#ffd166', -46);
      if (attacker.def.specialKind === 'drain') {
        const before = this.total(attacker);
        const healed = applyHeal(attacker.def, attacker, Math.floor(value / 2));
        attacker.topHp = healed.topHp;
        this.refreshStack(attacker);
        this.floatText(attacker, `+${this.total(attacker) - before} HP`, '#66bb6a', -30);
      }
    }

    this.floatText(target, `-${value}`, '#ff8a80', -34);
    // Liczba poległych to dla gracza ważniejsza informacja niż same obrażenia.
    if (killed > 0 && target.count > 0) {
      this.floatText(target, `\u{1F480} ${killed}`, '#ff5252', -50);
    }
    if (typeMult > 1) this.floatText(target, 'Super skuteczne!', '#66bb6a', -68);
    else if (typeMult < 1) this.floatText(target, 'Słabo skuteczne...', '#b0bec5', -68);

    this.cameras.main.shake(120, special ? 0.006 : 0.003);

    if (target.count <= 0) {
      this.refreshStack(target);
      this.tweens.add({
        targets: target.container,
        alpha: 0,
        scale: 0.5,
        duration: 320,
        onComplete: () => target.container.destroy(),
      });
      this.units = this.units.filter((u) => u.id !== target.id);
      this.roundQueue = this.roundQueue.filter((id) => id !== target.id);
    } else {
      this.refreshStack(target);
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
    t.y = Phaser.Math.Clamp(t.y, BOARD_Y + 24, BOARD_Y + BOARD_H - 8);

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
      const { value: dmg, kills } = this.damageOf(unit, target, useSpecial);
      // Wybij cały oddział, jeśli się da; poza tym licz się z liczbą poległych,
      // bo każdy padły stworek to trwale słabszy przeciwnik.
      const score =
        (dmg >= this.total(target) ? 100 : 0) + kills * 10 + dmg + (target.def.shooter ? 5 : 0);
      if (!best || score > best.score) best = { target, from: plan.from, score };
    }

    if (best) {
      this.performAttack(unit, best.target, best.from, useSpecial);
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
      this.floatText(unit, '\u{1F6E1}\u{FE0F} Obrona', '#ef9a9a', -46);
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
