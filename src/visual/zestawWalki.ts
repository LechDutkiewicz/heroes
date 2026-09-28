/**
 * Zestaw w stylu gier Pokémon — to samo API co `zestaw.ts` (drewno, pergamin,
 * złoto), ale rysuje biel, tusz i pigułki z ekranu walki (`stylWalki.ts`).
 *
 * Po co osobny moduł o tych samych nazwach: okna mapy, miasta i kampanii
 * są zbudowane z `panelPergaminu`, `wstazka`, `Przycisk`… — ekran przechodzi
 * na nowy wygląd zmianą źródła importu, a nie przepisaniem każdego okna.
 * Układ (odstępy, rozmiary) zostaje ten sam, więc okno, które mieściło się
 * na pergaminie, mieści się i na bieli.
 */
import Phaser from 'phaser';
import {
  CZERWIEN,
  KROJ_WALKI,
  SPOD,
  TUSZ,
  TUSZ_CSS,
  krojWalki,
  napisNaPigulce,
  panelBialy,
  pigulka,
  pokeball,
  type KolorPigulki,
} from './stylWalki';
import { krojeZestawu as krojeStare, latki, wczytajZestaw as wczytajStary } from './zestaw';

export { latki };

export const KROJ = {
  tytul: KROJ_WALKI,
  tekst: KROJ_WALKI,
  kursywa: KROJ_WALKI,
} as const;

/** Te same klucze co w `zestaw.ts` — wartości z ekranu walki. */
export const BARWA = {
  atrament: TUSZ_CSS,
  atramentMiekki: '#5b6270',
  atramentCzerwony: '#c92a09',
  atramentZielony: '#2f9e55',
  krem: '#ffffff',
  braz: TUSZ_CSS,
  papier: 0xffffff,
  papierCiemny: 0xeaf4ff,
  kreska: 0x8b93a0,
  lak: CZERWIEN,
  lakJasny: 0xf2503a,
  lakCiemny: 0xb8230a,
  cien: TUSZ,
} as const;

/** Tekstury starego zestawu też bywają potrzebne (latki) — i krój Nunito. */
export function wczytajZestaw(scena: Phaser.Scene) {
  wczytajStary(scena);
  void krojWalki();
}

/** Oba kroje: Nunito tego zestawu i stare (inne moduły ekranu jeszcze ich używają). */
export function krojeZestawu(): Promise<void> {
  return Promise.all([krojWalki(), krojeStare()]).then(() => undefined);
}

// ————————————————————————————————————————————————— style tekstu

export function stylAtramentu(
  rozmiar: number,
  rodzaj: 'zwykly' | 'miekki' | 'czerwony' | 'zielony' = 'zwykly',
  szerokosc?: number
): Phaser.Types.GameObjects.Text.TextStyle {
  const barwa = {
    zwykly: BARWA.atrament,
    miekki: BARWA.atramentMiekki,
    czerwony: BARWA.atramentCzerwony,
    zielony: BARWA.atramentZielony,
  }[rodzaj];
  return {
    fontFamily: KROJ_WALKI,
    fontSize: `${rozmiar}px`,
    fontStyle: rodzaj === 'miekki' ? '700' : '700',
    color: barwa,
    lineSpacing: 2,
    ...(szerokosc ? { wordWrap: { width: szerokosc } } : {}),
  };
}

/** Nagłówek: Nunito najgrubszy. Czerwień starego zestawu → tusz (czerwień zostaje na belkach). */
export function stylEtykiety(rozmiar: number, barwa: string = BARWA.atrament) {
  return {
    fontFamily: KROJ_WALKI,
    fontSize: `${rozmiar}px`,
    fontStyle: '900',
    color: barwa === '#8e2a18' ? BARWA.atramentCzerwony : barwa,
  } as Phaser.Types.GameObjects.Text.TextStyle;
}

/** Napis „na belce": biały z obrysem tuszem — czytelny na każdym tle. */
export function napisNaDrewnie(scena: Phaser.Scene, x: number, y: number, tekst: string, rozmiar: number) {
  return scena.add
    .text(x, y, tekst, {
      fontFamily: KROJ_WALKI,
      fontSize: `${rozmiar}px`,
      fontStyle: '900',
      color: '#ffffff',
      stroke: TUSZ_CSS,
      strokeThickness: Math.max(3, rozmiar * 0.2),
    })
    .setShadow(0, 2, 'rgba(0,0,0,0.3)', 0, true, true);
}

/** Tytuł: żółty jak logo gier, z grubym niebieskim obrysem. */
export function napisTytulowy(scena: Phaser.Scene, x: number, y: number, tekst: string, rozmiar: number, ox = 0.5) {
  return scena.add
    .text(x, y, tekst, {
      fontFamily: KROJ_WALKI,
      fontSize: `${rozmiar}px`,
      fontStyle: '900',
      color: '#ffd43b',
      stroke: '#2a4fa0',
      strokeThickness: Math.max(4, rozmiar * 0.16),
    })
    .setOrigin(ox, 0.5)
    .setShadow(0, 3, 'rgba(0,0,0,0.35)', 0, true, true);
}

// ————————————————————————————————————————————————— materiał

/** Wysokość belki nagłówka i jej oś — te same liczby co w `zestaw.ts`. */
export const BELKA_H = 48;
export const BELKA_Y = 25;

/**
 * Tło ekranu: błękit z kropkami i czerwona belka nagłówka o wysokości
 * `BELKA_H` — tam, gdzie drewno miało namalowaną belkę, więc ekrany, które
 * kładą tytuł na `BELKA_Y`, nie muszą nic przesuwać.
 */
export function tloDrewna(scena: Phaser.Scene) {
  const w = scena.scale.width;
  const h = scena.scale.height;
  const g = scena.add.graphics();
  g.fillGradientStyle(0xdfe7f0, 0xdfe7f0, 0xcfd9e6, 0xcfd9e6, 1);
  g.fillRect(0, 0, w, h);
  g.fillStyle(0xffffff, 0.55);
  for (let y = 12; y < h; y += 24) for (let x = 12; x < w; x += 24) g.fillCircle(x, y, 3);
  const pas = BELKA_H - 5;
  g.fillGradientStyle(0xf2503a, 0xf2503a, 0xc92a09, 0xc92a09, 1);
  g.fillRect(0, 0, w, pas);
  g.fillStyle(0xffffff, 0.3);
  g.fillRect(0, 3, w, 5);
  g.fillStyle(TUSZ, 1);
  g.fillRect(0, pas, w, 5);
  g.fillStyle(0x000000, 0.12);
  g.fillRect(0, BELKA_H, w, 4);
  return g;
}

/** Obrys tuszem w miejscu złotej ramy (rama jest NAD treścią, więc bez wypełnienia). */
export function ramaZlota(scena: Phaser.Scene, x: number, y: number, w: number, h: number, gruba = true) {
  const g = scena.add.graphics();
  g.lineStyle(gruba ? 4 : 2.5, TUSZ, 1);
  g.strokeRoundedRect(x, y, w, h, gruba ? 12 : 8);
  return g;
}

/** Cień pod panelem. */
export function cienPanelu(scena: Phaser.Scene, x: number, y: number, w: number, h: number, moc = 0.8) {
  const g = scena.add.graphics();
  g.fillStyle(TUSZ, 0.3 * moc);
  g.fillRoundedRect(x, y + 5, w, h, 16);
  return g;
}

/** Biały panel z obrysem tuszem — zamiast pergaminu w złotej ramie. */
export function panelPergaminu(scena: Phaser.Scene, x: number, y: number, w: number, h: number) {
  const g = scena.add.graphics();
  panelBialy(g, x, y, w, h, Math.min(18, h / 3), { obrys: 3, cien: 5 });
  return [g];
}

/** Medalion: pierścień tuszem i bielą, dno w podanej barwie (portret kładzie scena). */
export function medalion(scena: Phaser.Scene, x: number, y: number, r: number, dno: number = 0xeaf4ff) {
  const g = scena.add.graphics();
  g.fillStyle(TUSZ, 0.25);
  g.fillCircle(x, y + 3, r);
  g.fillStyle(TUSZ, 1);
  g.fillCircle(x, y, r);
  g.fillStyle(0xffffff, 1);
  g.fillCircle(x, y, r - 3);
  // Ciemne dno starego zestawu na bieli wyglądałoby jak dziura — rozjaśniamy.
  const jasne = Phaser.Display.Color.IntegerToColor(dno).v < 0.5 ? 0xeaf4ff : dno;
  g.fillStyle(jasne, 1);
  g.fillCircle(x, y, r * 0.8);
  g.fillStyle(0xffffff, 0.45);
  g.fillCircle(x, y - r * 0.22, r * 0.45);
  return g;
}

/** Przerywnik akapitów: szara kreska z pokeballem pośrodku. */
export function ozdobnik(scena: Phaser.Scene, x: number, y: number, w: number) {
  const g = scena.add.graphics();
  const s = x + w / 2;
  g.fillStyle(0xdfe4ea, 1);
  g.fillRoundedRect(x + 10, y - 1.5, s - 14 - (x + 10), 3, 1.5);
  g.fillRoundedRect(s + 14, y - 1.5, x + w - 10 - (s + 14), 3, 1.5);
  pokeball(g, s, y, 7);
  return g;
}

/** Wstążka → czerwona pigułka z białym napisem kapitałami. Środek w (x, y). */
export function wstazka(scena: Phaser.Scene, x: number, y: number, tekst: string, _barwa?: number) {
  const t = scena.add
    .text(x, y, tekst, { fontFamily: KROJ_WALKI, fontSize: '13px', fontStyle: '900', color: '#ffffff' })
    .setOrigin(0.5);
  napisNaPigulce(t, 'czerwony');
  const w = t.width + 30;
  const g = scena.add.graphics();
  pigulka(g, x - w / 2, y - 13, w, 26, 'czerwony');
  return scena.add.container(0, 0, [g, t]);
}

/** Pieczęć „zdobyte" → okrągła odznaka: czerwień w obrysie tuszem. */
export function pieczecLakowa(scena: Phaser.Scene, x: number, y: number, napis: string) {
  const g = scena.add.graphics();
  g.fillStyle(TUSZ, 0.3);
  g.fillCircle(2, 4, 32);
  g.fillStyle(TUSZ, 1);
  g.fillCircle(0, 0, 32);
  g.fillStyle(CZERWIEN, 1);
  g.fillCircle(0, 0, 28);
  g.fillStyle(0xffffff, 0.25);
  g.fillEllipse(-7, -11, 26, 12);
  const t = scena.add
    .text(0, 0, napis, { fontFamily: KROJ_WALKI, fontSize: '11px', fontStyle: '900', color: '#ffffff' })
    .setOrigin(0.5);
  return scena.add.container(x, y, [g, t]).setAngle(-12);
}

// ————————————————————————————————————————————————— przycisk

export interface OpcjePrzycisku {
  x: number;
  y: number;
  w: number;
  h: number;
  tekst: string;
  /** Czerwona pigułka: jedyny „następny krok" na ekranie. Zwykły: biała. */
  glowny?: boolean;
  rozmiar?: number;
  strzalka?: boolean;
  akcja: () => void;
  glebia?: number;
}

/**
 * Pigułka przycisku o API `Przycisk` z `zestaw.ts`: stany zwykły, najechany,
 * wyłączony (przełączane widocznością), grot za napisem, oddech głównego.
 */
export class Przycisk {
  readonly kontener: Phaser.GameObjects.Container;
  private wlaczony = true;
  private nad = false;
  private reaguje = true;
  private stany: Record<'n' | 'jasny' | 'wyl', Phaser.GameObjects.Graphics>;
  private napis: Phaser.GameObjects.Text;
  private grot?: Phaser.GameObjects.Graphics;
  private strefa: Phaser.GameObjects.Zone;
  private puls?: Phaser.Tweens.Tween;
  private scena: Phaser.Scene;
  private o: OpcjePrzycisku;
  private kolor: KolorPigulki;

  constructor(scena: Phaser.Scene, o: OpcjePrzycisku) {
    this.scena = scena;
    this.o = o;
    const { w, h } = o;
    this.kolor = o.glowny ? 'czerwony' : 'bialy';
    const skora = (kolor: KolorPigulki, jasniej: boolean) => {
      const g = scena.add.graphics();
      pigulka(g, -w / 2, -h / 2, w, h, kolor, { r: Math.min(16, h / 2) });
      if (jasniej) {
        g.fillStyle(kolor === 'bialy' ? 0xeaf4ff : 0xffffff, kolor === 'bialy' ? 0.9 : 0.18);
        g.fillRoundedRect(-w / 2 + 3, -h / 2 + 3, w - 6, h - 12, Math.min(12, h / 2 - 3));
      }
      return g;
    };
    this.stany = { n: skora(this.kolor, false), jasny: skora(this.kolor, true), wyl: skora('szary', false) };
    const rozmiar = o.rozmiar ?? Math.round(h * 0.4);
    this.napis = scena.add
      .text(0, -1, o.tekst, { fontFamily: KROJ_WALKI, fontSize: `${rozmiar}px`, fontStyle: '900', color: TUSZ_CSS })
      .setOrigin(0.5);
    napisNaPigulce(this.napis, this.kolor);
    this.strefa = scena.add.zone(0, 0, w, h).setInteractive({ useHandCursor: true });
    this.kontener = scena.add
      .container(o.x, o.y, [...Object.values(this.stany), this.napis, this.strefa])
      .setDepth(o.glebia ?? 30);
    if (o.strzalka) this.strzalka();

    this.strefa.on('pointerover', () => {
      this.nad = true;
      this.maluj();
      if (this.wlaczony && this.reaguje) scena.tweens.add({ targets: this.kontener, y: o.y - 2, duration: 90 });
    });
    this.strefa.on('pointerout', () => {
      this.nad = false;
      this.maluj();
      scena.tweens.add({ targets: this.kontener, y: o.y, duration: 90 });
    });
    this.strefa.on('pointerup', () => this.kliknij());
    this.maluj();
  }

  kliknij() {
    if (!this.wlaczony || !this.reaguje) return;
    this.scena.tweens.add({ targets: this.kontener, scaleX: 0.96, scaleY: 0.92, duration: 70, yoyo: true });
    this.o.akcja();
  }

  ustaw(wlaczony: boolean) {
    this.wlaczony = wlaczony;
    this.maluj();
    return this;
  }

  szyld() {
    this.reaguje = false;
    this.strefa.disableInteractive();
    this.maluj();
    return this;
  }

  setLabel(tekst: string, o: { rozmiar?: number; strzalka?: boolean } = {}) {
    this.napis.setText(tekst);
    if (o.rozmiar) this.napis.setFontSize(o.rozmiar);
    const zGrotem = o.strzalka ?? !!this.grot;
    this.grot?.destroy();
    this.grot = undefined;
    this.napis.x = 0;
    if (zGrotem) this.strzalka();
    else this.maluj();
    return this;
  }

  destroy() {
    this.scena.tweens.killTweensOf(this.kontener);
    this.kontener.destroy();
  }

  strzalka() {
    if (this.grot) return this;
    const g = this.scena.add.graphics();
    const x = this.napis.width / 2 + 14;
    g.fillStyle(this.kolor === 'bialy' ? TUSZ : 0xffffff, 1);
    g.fillTriangle(x - 6, -8, x - 6, 8, x + 8, 0);
    this.napis.x -= 10;
    g.x = -10;
    this.grot = g;
    this.kontener.add(g);
    this.maluj();
    return this;
  }

  private maluj() {
    const stan = !this.wlaczony ? 'wyl' : this.nad && this.reaguje ? 'jasny' : 'n';
    for (const [k, v] of Object.entries(this.stany)) v.setVisible(k === stan);
    napisNaPigulce(this.napis, this.wlaczony ? this.kolor : 'szary');
    this.grot?.setAlpha(this.wlaczony ? 1 : 0.35);
    if (this.wlaczony && this.grot && this.reaguje && !this.puls) {
      this.puls = this.scena.tweens.add({
        targets: this.kontener,
        scale: 1.035,
        duration: 700,
        yoyo: true,
        repeat: -1,
        ease: 'Sine.easeInOut',
      });
    } else if (!this.wlaczony && this.puls) {
      this.puls.stop();
      this.puls = undefined;
      this.kontener.setScale(1);
    }
  }
}

/** Szary spód panelu — dla okien, które go potrzebują jako tła wiersza. */
export const SPOD_PANELU = SPOD;
