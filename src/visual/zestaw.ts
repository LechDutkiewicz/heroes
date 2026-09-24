import Phaser from 'phaser';
import { C } from './theme';
import { gradientText, mix } from './hud';

/**
 * Zestaw — jeden materiał interfejsu dla ekranów „między bitwami":
 * kampanii, wyniku misji, okna warunków.
 *
 * Skąd się wziął
 * --------------
 * Trzech krytyków trzech różnych ekranów (menu, kampania, wynik) napisało
 * niezależnie to samo: wokół malowanych obrazów stoi interfejs ze strony
 * internetowej — bladoniebieskie zaokrąglone panele, błyszczące kapsułki,
 * systemowy krój z grubym czarnym konturem. Heroes 2 ma jeden ręcznie robiony
 * komplet i trzyma go wszędzie. Tu jest nasz: DREWNO (tło, belka nagłówka,
 * tabliczki przycisków), ZŁOTO (ramy, obwódki, przycisk główny) i PERGAMIN
 * (każdy dłuższy tekst). Mleczne panele z `hud.ts` zostają w bitwie, gdzie
 * pasują do planszy z kafelków — do malowanych ekranów nie.
 *
 * Grafiki liczy `tools/zestaw.py` (2× rozdzielczość ekranu, `public/zestaw/`).
 * Ramy, pergamin, cień i tabliczki są „dziewięcioma łatkami": rogi stoją,
 * boki się rozciągają, więc jedna tekstura obsługuje dowolny rozmiar.
 *
 * Użycie
 * ------
 *   preload() { wczytajZestaw(this); }
 *   create()  {
 *     void krojeZestawu().then(() => {        // kroje muszą być przed napisami
 *       tloDrewna(this);                       // tło + belka nagłówka
 *       napisTytulowy(this, 480, BELKA_Y, 'Zwycięstwo!', 28);
 *       panelPergaminu(this, 100, 100, 400, 200);
 *       new Przycisk(this, { x: 800, y: 650, w: 180, h: 52, tekst: 'Dalej', glowny: true, akcja: () => … });
 *     });
 *   }
 *
 * Kroje: Cinzel (tytuły, przyciski, etykiety — rzymskie kapitały jak na
 * szyldach Heroes; plik z `public/menu/`, ten sam co w menu głównym) i Lora
 * (tekst ciągły — szeryfowy krój z książki z bajkami, `public/zestaw/`, OFL).
 * Lora, a nie Fredoka z menu: podzbiór Fredoki z fontsource NIE MA ą, ę, ń,
 * ś, ż — te litery wypadały z kroju zapasowego, cieńsze i wyższe, w co
 * drugim polskim słowie. Lora ma pełny polski alfabet i kursywę.
 */

// ————————————————————————————————————————————————— stałe

const B = import.meta.env.BASE_URL;

export const KROJ = {
  /** Tytuły, przyciski, etykiety. */
  tytul: 'ZestawCinzel, Georgia, serif',
  /** Tekst ciągły na pergaminie. */
  tekst: 'ZestawLora, Georgia, serif',
  /** Kursywa: epilogi, dopiski, podpowiedzi. */
  kursywa: 'ZestawLoraKursywa, Georgia, serif',
} as const;

/** Barwy materiałów — do stylów tekstu (łańcuchy) i do Graphics (liczby). */
export const BARWA = {
  atrament: '#4a2c12',
  atramentMiekki: '#7a5530',
  atramentCzerwony: '#8e2a18',
  atramentZielony: '#2f6b3a',
  /** Napis na drewnie. */
  krem: '#f8e6b8',
  /** Kontur napisów na drewnie — ciemny brąz, nigdy czerń: czarny kontur na złocie brudzi. */
  braz: '#2a1606',
  papier: 0xf3e2ba,
  papierCiemny: 0xe8d2a2,
  kreska: 0x8a5a2b,
  lak: 0xa3261b,
  lakJasny: 0xb8342a,
  lakCiemny: 0x7d1a12,
  cien: 0x0a0602,
} as const;

/** Wysokość belki nagłówka namalowanej w `drewno.jpg`; `BELKA_Y` to jej oś. */
export const BELKA_H = 48;
export const BELKA_Y = 25;

// ————————————————————————————————————————————————— wczytanie

const TEKSTURY = [
  'drewno',
  'rama-zlota',
  'rama-cienka',
  'pergamin',
  'cien',
  ...['drewno', 'zloto'].flatMap((r) => ['', '-jasny', '-wcisniety', '-wyl'].map((s) => `tabliczka-${r}${s}`)),
];

/** Kolejkuje tekstury zestawu. Wołać w `preload`. Klucze: `z-<nazwa>`. */
export function wczytajZestaw(scena: Phaser.Scene) {
  for (const n of TEKSTURY) {
    if (scena.textures.exists(`z-${n}`)) continue;
    scena.load.image(`z-${n}`, `${B}zestaw/${n}.${n === 'drewno' ? 'jpg' : 'png'}`);
  }
  void krojeZestawu();
}

const LACINSKI =
  'U+0000-00FF, U+0131, U+0152-0153, U+02BB-02BC, U+02C6, U+02DA, U+02DC, U+0304, U+0308, U+0329, U+2000-206F, U+20AC, U+2122, U+2191, U+2193, U+2212, U+2215, U+FEFF, U+FFFD';
const ROZSZERZONY =
  'U+0100-02BA, U+02BD-02C5, U+02C7-02CC, U+02CE-02D7, U+02DD-02FF, U+0304, U+0308, U+0329, U+1D00-1DBF, U+1E00-1E9F, U+1EF2-1EFF, U+2020, U+20A0-20AB, U+20AD-20C0, U+2113, U+2C60-2C7F, U+A720-A7FF';

let kroje: Promise<void> | undefined;

/**
 * Rejestruje kroje zestawu. Przez `FontFace`, nie `load.font` Phasera: ten
 * zna jeden plik na rodzinę, a polskie litery siedzą w osobnym podzbiorze —
 * bez drugiego pliku z tym samym `unicodeRange` „ż" wypadałoby z kroju
 * zapasowego. Porażka nie blokuje gry: napisy spadną na Georgię i Trebuchet.
 */
export function krojeZestawu(): Promise<void> {
  kroje ??= Promise.all(
    (
      [
        ['ZestawCinzel', 'cinzel-latin-900', LACINSKI],
        ['ZestawCinzel', 'cinzel-latin-ext-900', ROZSZERZONY],
        ['ZestawLora', 'Lora-Regular', undefined],
        ['ZestawLoraKursywa', 'Lora-Italic', undefined],
      ] as const
    ).map(async ([rodzina, plik, zakres]) => {
      const url = zakres ? `${B}menu/${plik}.woff2` : `${B}zestaw/${plik}.ttf`;
      const f = new FontFace(rodzina, `url(${url})`, zakres ? { unicodeRange: zakres } : {});
      await f.load();
      document.fonts.add(f);
    })
  ).then(
    () => undefined,
    () => undefined
  );
  return kroje;
}

// ————————————————————————————————————————————————— style tekstu

/** Tekst na pergaminie (Lora). `rodzaj`: zwykły atrament, miękki (drugi plan), czerwony, zielony. */
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
    fontFamily: KROJ.tekst,
    fontSize: `${rozmiar}px`,
    color: barwa,
    lineSpacing: 3,
    ...(szerokosc ? { wordWrap: { width: szerokosc } } : {}),
  };
}

/** Etykieta/nagłówek na pergaminie: Cinzel atramentem. */
export function stylEtykiety(rozmiar: number, barwa: string = BARWA.atramentCzerwony) {
  return { fontFamily: KROJ.tytul, fontSize: `${rozmiar}px`, color: barwa } as Phaser.Types.GameObjects.Text.TextStyle;
}

/** Napis na drewnie (belka, tabliczki): kremowy, z konturem z ciemnego brązu. */
export function napisNaDrewnie(scena: Phaser.Scene, x: number, y: number, tekst: string, rozmiar: number) {
  return scena.add
    .text(x, y, tekst, {
      fontFamily: KROJ.tytul,
      fontSize: `${rozmiar}px`,
      color: BARWA.krem,
      stroke: BARWA.braz,
      strokeThickness: Math.max(3, rozmiar * 0.18),
    })
    .setShadow(0, 2, '#00000088', 3, true, true);
}

/**
 * Tytuł: Cinzel ze złotym gradientem i cienkim konturem z ciemnego brązu,
 * jak litery wycięte w drewnie i pozłocone. Zaczepiony w pionie na środku.
 */
export function napisTytulowy(scena: Phaser.Scene, x: number, y: number, tekst: string, rozmiar: number, ox = 0.5) {
  const t = scena.add
    .text(x, y, tekst, {
      fontFamily: KROJ.tytul,
      fontSize: `${rozmiar}px`,
      color: '#ffe9a8',
      stroke: '#3a2208',
      strokeThickness: Math.max(2.5, rozmiar * 0.12),
    })
    .setOrigin(ox, 0.5)
    .setShadow(0, 3, '#000000aa', 4, true, true);
  gradientText(t, '#fff7d6', '#e0a53a');
  return t;
}

// ————————————————————————————————————————————————— materiał

/** Dziewięć łatek z tekstury 2× — `l r t b` to wymiary rogów w pikselach tekstury. */
export function latki(
  scena: Phaser.Scene,
  klucz: string,
  x: number,
  y: number,
  w: number,
  h: number,
  l: number,
  r = l,
  t = l,
  b = t
) {
  return scena.add.nineslice(x, y, klucz, undefined, w * 2, h * 2, l, r, t, b).setOrigin(0).setScale(0.5);
}

/** Tło drewniane na cały ekran, z belką nagłówka u góry (0…BELKA_H). */
export function tloDrewna(scena: Phaser.Scene) {
  return scena.add.image(0, 0, 'z-drewno').setOrigin(0).setDisplaySize(scena.scale.width, scena.scale.height);
}

/**
 * Złocona rama WOKÓŁ prostokąta (x, y, w, h) — wewnętrzna warga zachodzi na
 * treść o 2 px, żeby między złotem a obrazem nie było szpary. Gruba: 13 px,
 * z rozetami w rogach (obrazy, mapy); cienka: 5 px (panele, karty, winiety).
 */
export function ramaZlota(scena: Phaser.Scene, x: number, y: number, w: number, h: number, gruba = true) {
  const g = gruba ? 13 : 5;
  return gruba
    ? latki(scena, 'z-rama-zlota', x - g, y - g, w + g * 2, h + g * 2, 34)
    : latki(scena, 'z-rama-cienka', x - g, y - g, w + g * 2, h + g * 2, 16);
}

/** Miękki cień rzucony przez panel na drewno. */
export function cienPanelu(scena: Phaser.Scene, x: number, y: number, w: number, h: number, moc = 0.8) {
  return latki(scena, 'z-cien', x - 22, y - 16, w + 44, h + 48, 60).setAlpha(moc);
}

/** Pergamin w cienkiej złotej ramie, z cieniem: [cień, papier, rama]. */
export function panelPergaminu(scena: Phaser.Scene, x: number, y: number, w: number, h: number) {
  return [
    cienPanelu(scena, x, y, w, h),
    latki(scena, 'z-pergamin', x, y, w, h, 48),
    ramaZlota(scena, x, y, w, h, false),
  ];
}

/**
 * Medalion: złoty pierścień z połyskiem od góry i ciemnym dnem. Pod ikonę
 * nagrody, portret, numer. Zwraca Graphics — obraz kładzie się osobno na (x, y).
 */
export function medalion(scena: Phaser.Scene, x: number, y: number, r: number, dno: number = 0x2a1a0c) {
  const g = scena.add.graphics();
  g.fillStyle(BARWA.cien, 0.35);
  g.fillCircle(x + 1, y + 3, r);
  g.fillStyle(C.goldDeep, 1);
  g.fillCircle(x, y, r);
  g.fillStyle(C.gold, 1);
  g.fillCircle(x, y - 1, r * 0.91);
  g.fillStyle(C.goldLight, 0.5);
  g.slice(x, y - 1, r * 0.88, Phaser.Math.DegToRad(200), Phaser.Math.DegToRad(340));
  g.fillPath();
  g.fillStyle(dno, 1);
  g.fillCircle(x, y, r * 0.76);
  g.fillStyle(mix(dno, 0xffffff, 0.12), 1);
  g.fillCircle(x, y + r * 0.06, r * 0.7);
  return g;
}

/** Ozdobnik — pozioma kreska z rombem na środku, oddziela akapity na pergaminie. */
export function ozdobnik(scena: Phaser.Scene, x: number, y: number, w: number) {
  const g = scena.add.graphics();
  const s = x + w / 2;
  g.lineStyle(1.5, 0x9a6a38, 0.7);
  g.beginPath();
  g.moveTo(x + 10, y);
  g.lineTo(s - 12, y);
  g.moveTo(s + 12, y);
  g.lineTo(x + w - 10, y);
  g.strokePath();
  g.fillStyle(0x9a6a38, 0.85);
  g.fillPoints(
    [
      new Phaser.Math.Vector2(s, y - 5),
      new Phaser.Math.Vector2(s + 6, y),
      new Phaser.Math.Vector2(s, y + 5),
      new Phaser.Math.Vector2(s - 6, y),
    ],
    true
  );
  return g;
}

/** Wstążka z laku z wciętymi końcami i napisem kapitałami. Środek w (x, y). */
export function wstazka(scena: Phaser.Scene, x: number, y: number, tekst: string, barwa: number = 0x9c2f1d) {
  const t = scena.add
    .text(x, y, tekst, { fontFamily: KROJ.tytul, fontSize: '13px', color: '#fff4dc' })
    .setOrigin(0.5)
    .setShadow(0, 1, '#00000088', 1, false, true);
  const w = t.width + 34;
  const g = scena.add.graphics();
  const ciemna = mix(barwa, BARWA.cien, 0.4);
  const gy = y - 12;
  for (const s of [-1, 1]) {
    const x0 = x + s * (w / 2 - 6);
    const x1 = x + s * (w / 2 + 12);
    g.fillStyle(ciemna, 1);
    g.fillPoints(
      [
        new Phaser.Math.Vector2(x0, gy + 6),
        new Phaser.Math.Vector2(x1, gy + 6),
        new Phaser.Math.Vector2(x1 - s * 6, gy + 15),
        new Phaser.Math.Vector2(x1, gy + 24),
        new Phaser.Math.Vector2(x0, gy + 24),
      ],
      true
    );
  }
  g.fillStyle(BARWA.cien, 0.25);
  g.fillRect(x - w / 2, gy + 3, w, 24);
  g.fillStyle(barwa, 1);
  g.fillRect(x - w / 2, gy, w, 24);
  g.fillStyle(0xffffff, 0.16);
  g.fillRect(x - w / 2, gy + 2, w, 3);
  g.fillStyle(BARWA.cien, 0.18);
  g.fillRect(x - w / 2, gy + 19, w, 5);
  return scena.add.container(0, 0, [g, t]);
}

/** Czerwona pieczęć lakowa z napisem, przekrzywiona — „zdobyte", „brawo". */
export function pieczecLakowa(scena: Phaser.Scene, x: number, y: number, napis: string) {
  const g = scena.add.graphics();
  const rnd = new Phaser.Math.RandomDataGenerator([napis]);
  const pts: Phaser.Math.Vector2[] = [];
  for (let i = 0; i < 22; i++) {
    const a = (i / 22) * Math.PI * 2;
    const r = 34 + rnd.between(-3, 3);
    pts.push(new Phaser.Math.Vector2(Math.cos(a) * r, Math.sin(a) * r));
  }
  g.fillStyle(0x3a0a06, 0.35);
  g.fillPoints(pts.map((v) => new Phaser.Math.Vector2(v.x + 2, v.y + 3)), true);
  g.fillStyle(BARWA.lak, 1);
  g.fillPoints(pts, true);
  g.fillStyle(BARWA.lakCiemny, 1);
  g.fillCircle(0, 0, 25);
  g.fillStyle(BARWA.lakJasny, 1);
  g.fillCircle(0, -1, 23);
  g.lineStyle(1.5, 0xe57a6a, 0.6);
  g.strokeCircle(0, 0, 19);
  g.fillStyle(0xffffff, 0.18);
  g.fillEllipse(-8, -12, 26, 12);
  const t = scena.add.text(0, 0, napis, { fontFamily: KROJ.tytul, fontSize: '10px', color: '#ffe6d8' }).setOrigin(0.5);
  return scena.add.container(x, y, [g, t]).setAngle(-14);
}

// ————————————————————————————————————————————————— przycisk

export interface OpcjePrzycisku {
  x: number;
  y: number;
  w: number;
  /** Co najmniej 30 — rogi tabliczki mają 15 px. */
  h: number;
  tekst: string;
  /** Złota tabliczka: jedyny „następny krok" na ekranie. Drewniana: wszystko inne. */
  glowny?: boolean;
  /** Wielkość napisu; domyślnie z wysokości. */
  rozmiar?: number;
  /** Grot w prawo za napisem („Dalej", „Graj") — i oddech, gdy przycisk jest aktywny. */
  strzalka?: boolean;
  akcja: () => void;
  glebia?: number;
}

/**
 * Tabliczka przycisku z czterema stanami: zwykły, najechany, wciśnięty,
 * wyłączony. Każdy to osobna tekstura, przełączana widocznością —
 * przerysowywanie przy ruchu kursora migałoby.
 *
 * Napis na złocie jest WYBITY (ciemna litera z jasnym odbiciem pod spodem),
 * na drewnie kremowy z brązowym konturem. Czarnego konturu na złocie nie ma
 * nigdzie — krytyk nazwał go „brudnym".
 */
export class Przycisk {
  readonly kontener: Phaser.GameObjects.Container;
  private wlaczony = true;
  private nad = false;
  private wcisniety = false;
  private reaguje = true;
  private stany: Record<'n' | 'jasny' | 'wcisniety' | 'wyl', Phaser.GameObjects.NineSlice>;
  private napis: Phaser.GameObjects.Text;
  private grot?: Phaser.GameObjects.Graphics;
  private strefa: Phaser.GameObjects.Zone;
  private puls?: Phaser.Tweens.Tween;
  private scena: Phaser.Scene;
  private o: OpcjePrzycisku;

  constructor(scena: Phaser.Scene, o: OpcjePrzycisku) {
    this.scena = scena;
    this.o = o;
    const { w, h } = o;
    const rodzaj = o.glowny ? 'zloto' : 'drewno';
    const latka = (s: string) =>
      scena.add
        .nineslice(0, 0, `z-tabliczka-${rodzaj}${s}`, undefined, w * 2, h * 2, 40, 40, 30, 30)
        .setScale(0.5)
        .setOrigin(0.5);
    const cien = scena.add.ellipse(0, h / 2 - 1, w * 0.92, 10, BARWA.cien, 0.45);
    this.stany = { n: latka(''), jasny: latka('-jasny'), wcisniety: latka('-wcisniety'), wyl: latka('-wyl') };
    const rozmiar = o.rozmiar ?? Math.round(h * 0.36);
    this.napis = scena.add
      .text(0, 0, o.tekst, {
        fontFamily: KROJ.tytul,
        fontSize: `${rozmiar}px`,
        color: o.glowny ? '#3b1f08' : BARWA.krem,
        stroke: BARWA.braz,
        strokeThickness: o.glowny ? 0 : Math.max(2.5, rozmiar * 0.16),
      })
      .setOrigin(0.5);
    if (o.glowny) this.napis.setShadow(0, 1.5, '#fff3c8', 0, false, true);
    else this.napis.setShadow(0, 2, '#000000aa', 2, true, true);
    this.strefa = scena.add.zone(0, 0, w, h).setInteractive({ useHandCursor: true });
    this.kontener = scena.add
      .container(o.x, o.y, [cien, ...Object.values(this.stany), this.napis, this.strefa])
      .setDepth(o.glebia ?? 30);
    if (o.strzalka) this.strzalka();

    this.strefa.on('pointerover', () => {
      this.nad = true;
      this.maluj();
      if (this.wlaczony) scena.tweens.add({ targets: this.kontener, y: o.y - 2, duration: 90 });
    });
    this.strefa.on('pointerout', () => {
      this.nad = false;
      this.wcisniety = false;
      this.maluj();
      scena.tweens.add({ targets: this.kontener, y: o.y, duration: 90 });
    });
    this.strefa.on('pointerdown', () => {
      if (!this.wlaczony) return;
      this.wcisniety = true;
      this.maluj();
    });
    this.strefa.on('pointerup', () => {
      if (!this.wcisniety) return;
      this.wcisniety = false;
      this.maluj();
      this.kliknij();
    });
    this.maluj();
  }

  /** Wywołuje akcję tak, jak kliknięcie (np. z klawiatury), z krótkim przysiadem tabliczki. */
  kliknij() {
    if (!this.wlaczony || !this.reaguje) return;
    this.scena.tweens.add({ targets: this.napis, y: 1.5, duration: 70, yoyo: true });
    this.o.akcja();
  }

  ustaw(wlaczony: boolean) {
    this.wlaczony = wlaczony;
    this.maluj();
    return this;
  }

  /** Szyld zamiast przycisku (np. imię narratora): ten sam wygląd, bez kursora i kliknięć. */
  szyld() {
    this.reaguje = false;
    this.strefa.disableInteractive();
    this.maluj();
    return this;
  }

  setLabel(tekst: string) {
    this.napis.setText(tekst);
  }

  destroy() {
    this.scena.tweens.killTweensOf(this.kontener);
    this.kontener.destroy();
  }

  /** Dokłada grot w prawo za napisem (jak opcja `strzalka`). */
  strzalka() {
    if (this.grot) return this;
    const g = this.scena.add.graphics();
    const x = this.napis.width / 2 + 14;
    const ciemny = this.o.glowny ? 0x3b1f08 : 0x2a1606;
    const jasny = this.o.glowny ? 0x7a4a14 : 0xf8e6b8;
    g.fillStyle(ciemny, 1);
    g.fillTriangle(x - 7, -10, x - 7, 10, x + 10, 0);
    g.fillStyle(jasny, 1);
    g.fillTriangle(x - 4.5, -6, x - 4.5, 6, x + 5.5, 0);
    this.napis.x -= 10;
    g.x = -10;
    this.grot = g;
    this.kontener.add(g);
    this.maluj();
    return this;
  }

  private maluj() {
    const stan = !this.wlaczony ? 'wyl' : this.wcisniety ? 'wcisniety' : this.nad && this.reaguje ? 'jasny' : 'n';
    for (const [k, v] of Object.entries(this.stany)) v.setVisible(k === stan);
    this.napis.setAlpha(this.wlaczony ? 1 : 0.5);
    this.grot?.setAlpha(this.wlaczony ? 1 : 0.35);
    // Włączony przycisk ze strzałką oddycha — zaprasza, gdy wszystko jest
    // już wybrane. Wyłączony stoi, żeby nie kusił na próżno.
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
