/**
 * HUD ekranu walki w stylu z gier Pokémon (makieta A): przyciski-pigułki,
 * białe panele z obrysem tuszem, kolejka tur w kółkach, tabela karty
 * stworka i prognoza. Te same interfejsy, co dawne kapsułki z `hud.ts`
 * (`HudButton`, `TurnQueue`, `StatTable`, `Forecast`), więc scena tylko
 * podmienia wywołania.
 */
import Phaser from 'phaser';
import { miniIcon, type IconKey, type MiniKey } from './icons';
import { mix } from './hud';
import {
  NIEBIESKI,
  CZERWIEN,
  TUSZ,
  TUSZ_CSS,
  ZOLTY,
  napisNaPigulce,
  panelBialy,
  pigulka,
  stylWalki,
  type KolorPigulki,
} from './stylWalki';

// ————————————————————————————————————————————— panel

/** Biały panel z obrysem tuszem (kadłub paska, karty, okien). */
export function panelWalki(
  scene: Phaser.Scene,
  x: number,
  y: number,
  w: number,
  h: number,
  parent?: Phaser.GameObjects.Container,
  r = 16
) {
  const g = scene.add.graphics().setDepth(60);
  panelBialy(g, x, y, w, h, r);
  parent?.add(g);
  return g;
}

// ————————————————————————————————————————————— przycisk

export interface HudButton {
  setLabel(text: string): void;
  setEnabled(enabled: boolean): void;
  setVisible(visible: boolean): void;
  destroy(): void;
}

/**
 * Pigułka z napisem i znakiem. Trzy stany rysujemy raz i przełączamy
 * widocznością — przerysowywanie przy ruchu kursora migałoby.
 */
export function przyciskWalki(
  scene: Phaser.Scene,
  o: {
    x: number;
    y: number;
    w: number;
    h: number;
    kolor: KolorPigulki;
    /** Znak z `icons.ts` albo klucz tekstury (np. pokeball z plecaka). */
    ikona?: IconKey | string;
    rozmiar?: number;
    onClick: () => void;
    depth?: number;
  }
): HudButton {
  const { w, h } = o;
  const skora = (kolor: KolorPigulki, jasniej: boolean) => {
    const g = scene.add.graphics();
    pigulka(g, -w / 2, -h / 2, w, h, kolor);
    if (jasniej) {
      g.fillStyle(0xffffff, 0.18);
      g.fillRoundedRect(-w / 2 + 3, -h / 2 + 3, w - 6, h - 6, Math.min(10, h / 2 - 3));
    }
    return g;
  };
  const normal = skora(o.kolor, false);
  const nad = skora(o.kolor, true);
  const wyl = skora('szary', false);
  const d = h - 16;
  const znak = o.ikona ? scene.add.image(-w / 2 + 12 + d / 2, 0, o.ikona).setDisplaySize(d, d) : undefined;
  const napis = scene.add.text(o.ikona ? d / 2 + 4 : 0, -1, '', stylWalki(o.rozmiar ?? 15)).setOrigin(0.5);
  napisNaPigulce(napis, o.kolor);
  const strefa = scene.add.zone(0, 0, w, h).setInteractive({ useHandCursor: true });
  const kontener = scene.add.container(o.x, o.y, [normal, nad, wyl, ...(znak ? [znak] : []), napis, strefa]);
  kontener.setDepth(o.depth ?? 62);

  let wlaczony = true;
  let kursor = false;
  const maluj = () => {
    normal.setVisible(wlaczony && !kursor);
    nad.setVisible(wlaczony && kursor);
    wyl.setVisible(!wlaczony);
    znak?.setAlpha(wlaczony ? 1 : 0.45);
    napisNaPigulce(napis, wlaczony ? o.kolor : 'szary');
  };
  strefa.on('pointerover', () => {
    kursor = true;
    maluj();
    if (wlaczony) scene.tweens.add({ targets: kontener, y: o.y - 2, duration: 90 });
  });
  strefa.on('pointerout', () => {
    kursor = false;
    maluj();
    scene.tweens.add({ targets: kontener, y: o.y, duration: 90 });
  });
  strefa.on('pointerdown', () => {
    if (!wlaczony) return;
    scene.tweens.add({ targets: kontener, scaleX: 0.96, scaleY: 0.92, duration: 70, yoyo: true });
    o.onClick();
  });
  maluj();

  return {
    setLabel(text) {
      napis.setText(text);
    },
    setEnabled(v) {
      wlaczony = v;
      if (v) strefa.setInteractive({ useHandCursor: true });
      else strefa.disableInteractive();
      maluj();
    },
    setVisible(v) {
      kontener.setVisible(v);
    },
    destroy() {
      scene.tweens.killTweensOf(kontener);
      kontener.destroy();
    },
  };
}

// ————————————————————————————————————————————— kolejka tur

export interface QueueEntry {
  spriteKey: string;
  side: 'player' | 'enemy';
}

export interface TurnQueue {
  update(entries: QueueEntry[], round: number): void;
}

/**
 * Kolejka tur: kto teraz — duże kółko w żółtym pierścieniu, reszta mniejsza,
 * z wewnętrzną obwódką w barwie strony. Po lewej biała pigułka z rundą.
 * Dosunięta do prawej krawędzi `right`, rośnie w lewo.
 */
export function createTurnQueue(scene: Phaser.Scene, right: number, y: number): TurnQueue {
  const holder = scene.add.container(0, 0).setDepth(61);
  const AKT = 44;
  const RESZTA = 32;
  const ODSTEP = 5;

  const kolko = (e: QueueEntry, cx: number, d: number, teraz: boolean) => {
    const g = scene.add.graphics();
    const barwa = e.side === 'player' ? NIEBIESKI : CZERWIEN;
    g.fillStyle(0x000000, 0.25);
    g.fillCircle(cx, y + 2, d / 2);
    if (teraz) {
      g.fillStyle(TUSZ, 1);
      g.fillCircle(cx, y, d / 2 + 5);
      g.fillStyle(ZOLTY, 1);
      g.fillCircle(cx, y, d / 2 + 3);
    }
    g.fillStyle(TUSZ, 1);
    g.fillCircle(cx, y, d / 2);
    g.fillStyle(barwa, 1);
    g.fillCircle(cx, y, d / 2 - 3);
    g.fillStyle(e.side === 'player' ? 0xe6efff : 0xffe9e4, 1);
    g.fillCircle(cx, y, d / 2 - 5.5);
    // Cała figurka na jasnym tle — okrągły portret w tej wielkości to ciemna plama.
    const twarz = scene.add.image(cx, y, e.spriteKey);
    twarz.setScale((d - 12) / Math.max(twarz.width, twarz.height));
    holder.add([g, twarz]);
  };

  const kolejka: TurnQueue = {
    update(entries, round) {
      holder.removeAll(true);
      const reszta = Math.min(entries.length - 1, 7);
      const szer = AKT + (reszta > 0 ? reszta * (RESZTA + ODSTEP) : 0);
      const lewo = right - szer;
      if (entries.length > 0) kolko(entries[0], lewo + AKT / 2, AKT, true);
      for (let i = 1; i <= reszta; i++) kolko(entries[i], lewo + AKT + ODSTEP + (i - 0.5) * (RESZTA + ODSTEP), RESZTA, false);

      const napis = scene.add.text(0, y - 1, `Runda ${round}`, stylWalki(14)).setOrigin(0.5);
      const pw = napis.width + 26;
      const px = lewo - 12 - pw;
      const g = scene.add.graphics();
      pigulka(g, px, y - 15, pw, 30, 'bialy', { r: 15 });
      napis.setX(px + pw / 2);
      holder.add([g, napis]);
    },
  };
  return kolejka;
}

// ————————————————————————————————————————————— tabela karty

export interface StatSlot {
  x: number;
  y: number;
  w: number;
  h: number;
  band?: 0 | 1;
  ribbon?: boolean;
}

export interface StatRow {
  label: string;
  value: string;
  icon?: MiniKey;
  /** Barwa znaku (żywioł, przewaga) — tylko znak, nigdy tło wiersza. */
  mark?: number;
  /** Ostrzeżenie: wartość na czerwono. */
  alert?: boolean;
}

export interface StatTable {
  update(rows: (StatRow | null)[]): void;
}

const SZARY_TEKST = '#5b6270';
const CZERWONY_TEKST = '#c0280c';
/** Znak w tabeli: tusz, lekko zabarwiony treścią wiersza. */
const barwaZnaku = (mark?: number, alert?: boolean) => (alert ? 0xc0280c : mark === undefined ? 0x4a4f5c : mix(0x4a4f5c, mark, 0.6));

/**
 * Tabela: co drugi wiersz na jasnoszarym pasie, etykieta szarym tuszem,
 * wartość czarnym i grubszym; wstęga pod tabelą to błękitna pigułka.
 * Napisy tworzymy raz i tylko podmieniamy treść.
 */
export function createStatTable(scene: Phaser.Scene, slots: StatSlot[], parent?: Phaser.GameObjects.Container): StatTable {
  const g = scene.add.graphics().setDepth(61);
  parent?.add(g);
  const etykiety: Phaser.GameObjects.Text[] = [];
  const wartosci: Phaser.GameObjects.Text[] = [];
  const znaki: (Phaser.GameObjects.Image | undefined)[] = [];
  for (const s of slots) {
    const e = scene.add.text(0, s.y + s.h / 2, '', stylWalki(13, SZARY_TEKST, 800)).setOrigin(0, 0.5).setDepth(62);
    const v = scene.add.text(s.x + s.w - 10, s.y + s.h / 2, '', stylWalki(15)).setOrigin(1, 0.5).setDepth(62);
    parent?.add([e, v]);
    etykiety.push(e);
    wartosci.push(v);
    znaki.push(undefined);
  }
  return {
    update(rows) {
      g.clear();
      rows.forEach((row, i) => {
        const s = slots[i];
        if (!s) return;
        const e = etykiety[i];
        const v = wartosci[i];
        znaki[i]?.destroy();
        znaki[i] = undefined;
        if (!row) {
          e.setText('');
          v.setText('');
          return;
        }
        const rx = s.ribbon ? s.x + 4 : s.x;
        const rw = s.ribbon ? s.w - 8 : s.w;
        const rh = s.ribbon ? s.h - 2 : s.h;
        if (s.ribbon) {
          g.fillStyle(TUSZ, 1);
          g.fillRoundedRect(rx, s.y, rw, rh, rh / 2);
          g.fillStyle(0xe6efff, 1);
          g.fillRoundedRect(rx + 2, s.y + 2, rw - 4, rh - 4, rh / 2 - 2);
        } else if (s.band === 1) {
          g.fillStyle(0xf1f4f8, 1);
          g.fillRoundedRect(rx, s.y, rw, rh, 6);
        }
        let tx = rx + 10;
        if (row.icon) {
          const d = rh - 8;
          znaki[i] = miniIcon(scene, row.icon, rx + 9 + d / 2, s.y + rh / 2, d, barwaZnaku(row.mark, row.alert)).setDepth(62);
          parent?.add(znaki[i]!);
          tx = rx + 11 + d + 6;
        }
        e.setX(tx).setY(s.y + rh / 2).setText(row.label).setColor(s.ribbon ? TUSZ_CSS : SZARY_TEKST);
        v.setScale(1).setX(rx + rw - 10).setY(s.y + rh / 2).setText(row.value).setColor(row.alert ? CZERWONY_TEKST : TUSZ_CSS);
        let miejsce = rx + rw - 10 - (tx + e.width + 8);
        if (v.width * 0.72 > miejsce) {
          e.setText('');
          miejsce = rx + rw - 10 - tx;
        }
        if (miejsce > 0 && v.width > miejsce) v.setScale(Math.max(0.58, miejsce / v.width));
      });
    },
  };
}

// ————————————————————————————————————————————— prognoza

export interface Forecast {
  show(text: string, deadly: boolean): void;
  hide(): void;
  setVisible?(visible: boolean): void;
}

/**
 * Prognoza obrażeń w pigułce: w spoczynku jasnoszara z podpowiedzią,
 * przy celowaniu żółta, a gdy cios mdli cel — czerwona.
 */
export function createForecast(
  scene: Phaser.Scene,
  x: number,
  y: number,
  w: number,
  h: number,
  iconKey: MiniKey,
  hint: string
): Forecast {
  const g = scene.add.graphics().setDepth(61);
  const d = h - 12;
  const znak = miniIcon(scene, iconKey, x + 12 + d / 2, y + h / 2, d, 0x8b93a0).setDepth(62);
  const napis = scene.add.text(x + 20 + d, y + h / 2, '', stylWalki(14, TUSZ_CSS, 800)).setOrigin(0, 0.5).setDepth(62);
  const maks = w - (20 + d) - 12;
  const zmiesc = () => {
    napis.setScale(1);
    if (napis.width > maks) napis.setScale(Math.max(0.6, maks / napis.width));
  };
  const rysuj = (kolor: KolorPigulki | null) => {
    g.clear();
    if (!kolor) {
      g.fillStyle(TUSZ, 1);
      g.fillRoundedRect(x, y, w, h, h / 2);
      g.fillStyle(0xeef1f5, 1);
      g.fillRoundedRect(x + 2, y + 2, w - 4, h - 4, h / 2 - 2);
      return;
    }
    pigulka(g, x, y, w, h, kolor, { r: h / 2, cien: false });
  };
  const spoczynek = () => {
    rysuj(null);
    znak.setTint(0x8b93a0);
    napis.setText(hint).setColor('#6b7280').setFontStyle('italic 800').setShadow(0, 0, 'rgba(0,0,0,0)', 0);
    zmiesc();
  };
  spoczynek();
  return {
    show(tekst, deadly) {
      rysuj(deadly ? 'czerwony' : 'zolty');
      znak.setTint(deadly ? 0xffffff : TUSZ);
      napis.setText(tekst).setFontStyle('900');
      napisNaPigulce(napis, deadly ? 'czerwony' : 'zolty');
      zmiesc();
    },
    hide: spoczynek,
    setVisible(v) {
      g.setVisible(v);
      znak.setVisible(v);
      napis.setVisible(v);
    },
  };
}

/** Mały znak w kółku (numer ataku). */
export function numerWKolku(scene: Phaser.Scene, x: number, y: number, n: string, szary = false) {
  const g = scene.add.graphics();
  g.fillStyle(szary ? 0x8b93a0 : TUSZ, 1);
  g.fillCircle(x, y, 11);
  g.fillStyle(0xffffff, 1);
  g.fillCircle(x, y, 9);
  const t = scene.add.text(x, y, n, stylWalki(13, szary ? '#8b93a0' : TUSZ_CSS)).setOrigin(0.5);
  return [g, t] as const;
}

