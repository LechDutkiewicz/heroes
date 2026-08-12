import Phaser from 'phaser';
import {
  SUROWCE,
  SUROWIEC_INFO,
  TEREN_INFO,
  data,
  dochod,
  kosztPola,
  nowaTura,
  obiektNa,
  odwiedz,
  trasa,
  zasiegNaTure,
  type Krok,
  type Obiekt,
  type StanMapy,
} from '../data/mapa';
import { pierwszaMapa } from '../data/mapa1';
import { C, E, FONT, H, Z, body, display } from '../visual/theme';
import { drawPanelBody, makeHudButton, mix, plate } from '../visual/hud';
import { ICON, buildIcons } from '../visual/icons';
import { GORA, KAFEL, MARGINES, PANEL_W, PASEK_H } from '../visual/uklad';

/**
 * Mapa przygody.
 *
 * Układ jest przeniesiony z Heroes III: Horn of the Abyss, bo tę grę zna
 * odbiorca i chodzi o to, żeby wiedział, gdzie co jest, zanim cokolwiek
 * kliknie. Stąd: mapa po lewej w ramie, prawa kolumna z minimapą (litery
 * stron świata na ramce), karta bohatera z portretem, statystykami i rzędem
 * oddziałów, a na samym dole pasek surowców z datą.
 *
 * Rysunek jest nasz, pokemonowy — z układu bierzemy rozmieszczenie, nie grafikę.
 *
 * Tło planszy przychodzi jako gotowy obrazek z `tools/render_mapa.py`. Scena
 * nie składa terenu z kafelków: kafelki trzeba by powiększać trzykrotnie
 * „najbliższym sąsiadem" i teren byłby kanciasty obok gładkich stworków.
 * Wygładzić da się dopiero całą złożoną mapę, a to robota dla narzędzia,
 * nie dla przeglądarki.
 *
 * Zasady siedzą w `src/data/mapa.ts`; scena tylko pokazuje stan.
 */

/** Co ile milisekund plansza przechodzi na następną klatkę (animacja wody). */
const WODA_MS = 550;
const KLATEK_PLANSZY = 4;

/** Arkusz bohatera: 4 kierunki (wiersze) × 4 klatki chodu (kolumny). */
const BOHATER_KLATKA = 96;
const KIERUNEK_WIERSZ = { dol: 0, lewo: 1, prawo: 2, gora: 3 } as const;
type Kierunek = keyof typeof KIERUNEK_WIERSZ;

/**
 * Tekst w polu podpowiedzi, kiedy kursor nie stoi na niczym. Mówi wprost, jak
 * się ruszać — ośmiolatek nie ma skąd wiedzieć, że trasę zatwierdza się drugim
 * kliknięciem, a w Heroes 3 tłumaczy to instrukcja, której nikt nie czyta.
 */
const DOMYSLNA_PODPOWIEDZ =
  'Kliknij pole, żeby zobaczyć trasę. Kliknij drugi raz w to samo miejsce, żeby ruszyć.';

export class AdventureScene extends Phaser.Scene {
  private stan!: StanMapy;
  private mapaX = MARGINES;
  private mapaY = GORA;

  private plansza!: Phaser.GameObjects.Image;
  private warstwaTrasy!: Phaser.GameObjects.Graphics;
  private bohaterObj!: Phaser.GameObjects.Container;
  private bohaterSprite!: Phaser.GameObjects.Sprite;
  private kierunek: Kierunek = 'dol';
  private podpisy: Record<string, Phaser.GameObjects.Text> = {};
  private dochody: Record<string, Phaser.GameObjects.Text> = {};
  private ikonyObiektow: Record<number, Phaser.GameObjects.Container> = {};
  private ruchTekst!: Phaser.GameObjects.Text;
  private dataTekst!: Phaser.GameObjects.Text;
  private podpowiedz!: Phaser.GameObjects.Text;
  private minimapa!: Phaser.GameObjects.Graphics;
  private trasaBiezaca: Krok[] | null = null;
  private zajety = false;
  private klatkaWody = 0;

  constructor() {
    super('adventure');
  }

  preload() {
    const b = import.meta.env.BASE_URL;
    for (let i = 0; i < KLATEK_PLANSZY; i++) {
      this.load.image(`plansza-${i}`, `${b}mapa/plansza-1-${i}.png`);
    }
    this.load.spritesheet('bohater', `${b}mapa/bohater.png`, {
      frameWidth: BOHATER_KLATKA,
      frameHeight: BOHATER_KLATKA,
    });
    for (const n of [
      'sosna',
      'sosna-mala',
      'drzewo',
      'skala',
      'kopiec',
      'kepka',
      'kwiaty',
      'pokeball',
      'jagody',
      'kamien-ewolucji',
      'odlamki',
      'sad',
      'kopalnia',
      'skrzynia',
      'zamek-las',
    ]) {
      this.load.image(`m-${n}`, `${b}mapa/${n}.png`);
    }
    // Sprite'y stworków: armia bohatera i to, co stoi na mapie.
    const stan = pierwszaMapa();
    const potrzebne = new Set<string>();
    for (const o of stan.bohater.armia) potrzebne.add(o.sprite);
    for (const ob of stan.obiekty) for (const o of ob.oddzialy ?? []) potrzebne.add(o.sprite);
    for (const s of potrzebne) this.load.image(`p-${s}`, `${b}sprites/${s}.png`);
  }

  create() {
    this.stan = pierwszaMapa();
    buildIcons(this);
    this.przygotujAnimacje();

    this.rysujTlo();
    this.rysujPlansze();
    this.warstwaTrasy = this.add.graphics().setDepth(Z.board + 2);
    this.rysujPrzeszkody();
    this.rysujOzdoby();
    this.rysujObiekty();
    this.rysujBohatera();
    this.rysujPanel();
    this.rysujPasekSurowcow();
    this.odswiezPanel();

    // Woda ma cztery klatki. Bez animacji morze wygląda jak niebieska tapeta
    // i cała mapa robi wrażenie zatrzymanej.
    this.time.addEvent({
      delay: WODA_MS,
      loop: true,
      callback: () => {
        this.klatkaWody = (this.klatkaWody + 1) % KLATEK_PLANSZY;
        this.plansza.setTexture(`plansza-${this.klatkaWody}`);
      },
    });

    // Klik na mapę: pierwszy pokazuje trasę, drugi w to samo miejsce rusza —
    // tak samo jak w Heroes 3, gdzie trasę najpierw się widzi, a potem zatwierdza.
    this.input.on('pointerdown', (p: Phaser.Input.Pointer) => this.klikMapa(p));
    this.input.on('pointermove', (p: Phaser.Input.Pointer) => this.ruchMyszy(p));
  }

  private przygotujAnimacje() {
    for (const [nazwa, wiersz] of Object.entries(KIERUNEK_WIERSZ)) {
      this.anims.create({
        key: `chod-${nazwa}`,
        frames: this.anims.generateFrameNumbers('bohater', {
          start: wiersz * 4,
          end: wiersz * 4 + 3,
        }),
        frameRate: 8,
        repeat: -1,
      });
    }
  }

  // ---------- geometria ----------

  private naEkran(x: number, y: number) {
    return { x: this.mapaX + x * KAFEL + KAFEL / 2, y: this.mapaY + y * KAFEL + KAFEL / 2 };
  }

  private zEkranu(px: number, py: number) {
    return {
      x: Math.floor((px - this.mapaX) / KAFEL),
      y: Math.floor((py - this.mapaY) / KAFEL),
    };
  }

  private get mapaW() {
    return this.stan.szer * KAFEL;
  }
  private get mapaH() {
    return this.stan.wys * KAFEL;
  }

  // ---------- plansza ----------

  private rysujTlo() {
    const g = this.add.graphics().setDepth(Z.sky);
    g.fillGradientStyle(C.skyTop, C.skyTop, C.skyBottom, C.skyBottom, 1);
    g.fillRect(0, 0, this.scale.width, this.scale.height);

    this.add
      .text(MARGINES + 4, 10, 'MAPA PRZYGODY', display(19, H.goldLight))
      .setOrigin(0, 0)
      .setDepth(Z.hud);
  }

  private rysujPlansze() {
    // Ramka pod mapą — jak gruba, złota rama wokół mapy w Heroes 3.
    const rama = this.add.graphics().setDepth(Z.board - 1);
    rama.fillStyle(C.shadow, 0.5);
    rama.fillRoundedRect(this.mapaX - 8, this.mapaY - 8, this.mapaW + 16, this.mapaH + 16, 10);
    rama.lineStyle(4, C.goldDeep, 1);
    rama.strokeRoundedRect(this.mapaX - 6, this.mapaY - 6, this.mapaW + 12, this.mapaH + 12, 9);
    rama.lineStyle(2, C.gold, 1);
    rama.strokeRoundedRect(this.mapaX - 3, this.mapaY - 3, this.mapaW + 6, this.mapaH + 6, 7);

    this.plansza = this.add
      .image(this.mapaX, this.mapaY, 'plansza-0')
      .setOrigin(0, 0)
      .setDepth(Z.board);
  }

  /**
   * Las i skały. Wariant wybieramy z położenia pola, a nie losowo: dzięki
   * temu ten sam las wygląda tak samo po każdym wejściu do gry i da się go
   * porównywać między zrzutami.
   */
  private rysujPrzeszkody() {
    const wariant = (x: number, y: number, ile: number) => (x * 7 + y * 13) % ile;
    for (let y = 0; y < this.stan.wys; y++) {
      for (let x = 0; x < this.stan.szer; x++) {
        const t = this.stan.teren[y][x];
        if (t !== 'las' && t !== 'skaly') continue;
        const { x: ex, y: ey } = this.naEkran(x, y);

        if (t === 'las') {
          const klucz = ['m-sosna', 'm-drzewo', 'm-sosna-mala'][wariant(x, y, 3)];
          // Lekkie rozsunięcie z położenia pola: bez niego las stoi w idealnej
          // kracie i czyta się jak sad, a nie jak las.
          const jx = ((wariant(x, y, 5) - 2) / 2) * KAFEL * 0.11;
          const im = this.add
            .image(ex + jx, ey + KAFEL * (0.3 + wariant(y, x, 3) * 0.03), klucz)
            .setDepth(Z.units + y);
          im.setScale((KAFEL * (1.34 + wariant(x + 1, y, 3) * 0.06)) / im.height).setOrigin(0.5, 1);
        } else {
          // Skały: dwa głazy różnej wielkości zamiast jednego wielkiego —
          // pojedynczy głaz na pole dawał regularną kratę i wyglądał jak mur.
          for (const [dx, dy, s] of [
            [-0.17, 0.08, 0.78],
            [0.2, 0.24, 0.5],
          ] as Array<[number, number, number]>) {
            const klucz = ['m-skala', 'm-kopiec'][wariant(x + Math.round(dx * 10), y, 2)];
            const jx = ((wariant(x, y + 2, 5) - 2) / 2) * KAFEL * 0.12;
            const jy = ((wariant(y, x + 3, 3) - 1) / 2) * KAFEL * 0.08;
            const im = this.add
              .image(ex + dx * KAFEL + jx, ey + dy * KAFEL + jy, klucz)
              .setDepth(Z.units + y + dy);
            im.setScale((KAFEL * (s + wariant(x + y, y, 3) * 0.05)) / im.height).setOrigin(0.5, 0.95);
          }
        }
      }
    }
  }

  /**
   * Kępki trawy i kwiatki na pustych polach. Nic nie blokują — są po to, żeby
   * trawa nie była jednolitą plamą. W Heroes 3 pusty kawałek mapy praktycznie
   * nie istnieje; tu też nie powinien, bo puste pole wygląda na niedokończone.
   */
  private rysujOzdoby() {
    for (let y = 0; y < this.stan.wys; y++) {
      for (let x = 0; x < this.stan.szer; x++) {
        if (this.stan.teren[y][x] !== 'trawa') continue;
        if (obiektNa(this.stan, x, y)) continue;
        const h = (x * 17 + y * 31 + x * y * 5) % 7;
        if (h > 2) continue;
        const { x: ex, y: ey } = this.naEkran(x, y);
        const klucz = h === 2 ? 'm-kwiaty' : 'm-kepka';
        const im = this.add
          .image(ex + ((h - 1) * KAFEL) / 5, ey + KAFEL * (0.18 + h * 0.06), klucz)
          .setDepth(Z.units + y - 0.5);
        im.setScale(0.7 + h * 0.1).setOrigin(0.5, 1);
      }
    }
  }

  // ---------- obiekty ----------

  /** Czym rysujemy obiekt i jak wysoki ma być względem pola. */
  private grafikaObiektu(o: Obiekt): { klucz: string; wys: number } {
    if (o.rodzaj === 'zamek') return { klucz: 'm-zamek-las', wys: KAFEL * 1.9 };
    if (o.rodzaj === 'kopalnia')
      return { klucz: o.surowiec === 'jagoda' ? 'm-sad' : 'm-kopalnia', wys: KAFEL * 1.25 };
    if (o.rodzaj === 'skrzynia') return { klucz: 'm-skrzynia', wys: KAFEL * 0.78 };
    if (o.rodzaj === 'potwor')
      return { klucz: `p-${o.oddzialy?.[0].sprite ?? '00002'}`, wys: KAFEL * 1.05 };
    return { klucz: `m-${SUROWIEC_INFO[o.surowiec ?? 'pokeball'].ikona}`, wys: KAFEL * 0.7 };
  }

  private rysujObiekty() {
    for (const o of this.stan.obiekty) {
      const { x, y } = this.naEkran(o.x, o.y);
      const kont = this.add.container(x, y).setDepth(Z.units + o.y + 0.5);

      const cien = this.add.graphics();
      cien.fillStyle(C.shadow, 0.28);
      cien.fillEllipse(0, KAFEL * 0.36, KAFEL * 0.54, KAFEL * 0.17);
      kont.add(cien);

      const { klucz, wys } = this.grafikaObiektu(o);
      const im = this.add.image(0, KAFEL * 0.38, klucz).setOrigin(0.5, 1);
      im.setScale(wys / im.height);
      kont.add(im);

      // Potwór dostaje chorągiewkę w barwie przeciwnika — z daleka to jedyna
      // rzecz, po której widać, że to walka, a nie surowiec do podniesienia.
      if (o.rodzaj === 'potwor') kont.add(this.chorag(C.foe));
      // Budynek produkcyjny: chorągiewka pojawia się dopiero po zajęciu,
      // dokładnie jak w Heroes 3. Do tego czasu stoi bez flagi = niczyj.
      if (o.rodzaj === 'kopalnia') {
        const f = this.chorag(C.ally).setVisible(!!o.nasz);
        f.setData('flaga', o.id);
        kont.add(f);
        kont.setData('flaga', f);
      }

      kont.setData('obiekt', o);
      this.ikonyObiektow[o.id] = kont;
    }
  }

  /** Chorągiewka na maszcie — w Heroes 3 to ona mówi, czyje jest to, co stoi pod nią. */
  private chorag(barwa: number) {
    const g = this.add.graphics();
    g.lineStyle(2.5, C.shadow, 0.75);
    g.lineBetween(-2, -KAFEL * 0.66, -2, -KAFEL * 0.28);
    g.fillStyle(barwa, 1);
    g.fillTriangle(-1, -KAFEL * 0.64, 17, -KAFEL * 0.56, -1, -KAFEL * 0.46);
    g.lineStyle(1.5, C.white, 0.6);
    g.strokeTriangle(-1, -KAFEL * 0.64, 17, -KAFEL * 0.56, -1, -KAFEL * 0.46);
    return g;
  }

  private rysujBohatera() {
    const { x, y } = this.naEkran(this.stan.bohater.x, this.stan.bohater.y);
    this.bohaterObj = this.add.container(x, y).setDepth(Z.units + this.stan.bohater.y + 0.8);

    const cien = this.add.graphics();
    cien.fillStyle(C.shadow, 0.34);
    cien.fillEllipse(0, KAFEL * 0.34, KAFEL * 0.5, KAFEL * 0.16);
    this.bohaterObj.add(cien);

    this.bohaterSprite = this.add.sprite(0, KAFEL * 0.4, 'bohater', 0).setOrigin(0.5, 1);
    this.bohaterSprite.setScale((KAFEL * 1.15) / this.bohaterSprite.height);
    this.bohaterObj.add(this.bohaterSprite);
    this.bohaterObj.add(this.chorag(C.ally));
  }

  // ---------- prawa kolumna ----------

  private rysujPanel() {
    const px = this.mapaX + this.mapaW + 14;
    const py = this.mapaY - 8;
    const ph = this.mapaH + 16;
    drawPanelBody(this, px, py, PANEL_W, ph, 8);

    const wnetrzeX = px + 16;
    const wnetrzeW = PANEL_W - 32;

    // MINIMAPA — u góry, jak w Heroes 3, z literami stron świata na ramce.
    const mmBok = wnetrzeW;
    const mmX = wnetrzeX;
    const mmY = py + 26;
    const ramka = this.add.graphics().setDepth(Z.hud);
    ramka.fillStyle(C.panelDeep, 1);
    ramka.fillRoundedRect(mmX - 5, mmY - 5, mmBok + 10, mmBok + 10, 5);
    ramka.lineStyle(2, C.gold, 0.95);
    ramka.strokeRoundedRect(mmX - 5, mmY - 5, mmBok + 10, mmBok + 10, 5);
    for (const [lit, dx, dy] of [
      ['N', mmBok / 2, -14],
      ['S', mmBok / 2, mmBok + 14],
      ['W', -15, mmBok / 2],
      ['E', mmBok + 15, mmBok / 2],
    ] as Array<[string, number, number]>) {
      this.add
        .text(mmX + dx, mmY + dy, lit, { ...body(11, H.goldLight), fontStyle: 'bold' })
        .setOrigin(0.5)
        .setDepth(Z.hud);
    }
    this.minimapa = this.add.graphics().setDepth(Z.hud + 1);
    this.minimapa.setData('x', mmX).setData('y', mmY).setData('bok', mmBok);

    // KARTA BOHATERA — portret, statystyki, rząd oddziałów. Dokładnie ten
    // porządek co w HotA, bo dziecko, które tamto zna, nie musi się uczyć od nowa.
    const kartaY = mmY + mmBok + 26;
    const kartaH = 150;
    const karta = this.add.graphics().setDepth(Z.hud);
    plate(karta, wnetrzeX, kartaY, wnetrzeW, kartaH, 9, C.panel, C.panelDeep, {
      light: 0.2,
      dark: 0.2,
      gloss: 0.16,
      edgeW: 2,
    });

    const b = this.stan.bohater;
    const portretBok = 52;
    const ram = this.add.graphics().setDepth(Z.hud + 1);
    ram.fillStyle(mix(C.panel, C.panelDeep, 0.35), 1);
    ram.fillRoundedRect(wnetrzeX + 8, kartaY + 8, portretBok, portretBok, 6);
    ram.lineStyle(2, C.goldDeep, 1);
    ram.strokeRoundedRect(wnetrzeX + 8, kartaY + 8, portretBok, portretBok, 6);
    // Portret to ta sama klatka co na mapie — bohater w panelu i bohater na
    // planszy muszą być rozpoznawalnie tą samą postacią.
    const portret = this.add
      .image(wnetrzeX + 8 + portretBok / 2, kartaY + 6 + portretBok / 2, 'bohater', 0)
      .setDepth(Z.hud + 2);
    portret.setScale((portretBok - 4) / portret.height);

    this.add
      .text(wnetrzeX + portretBok + 18, kartaY + 10, b.imie, display(15))
      .setOrigin(0, 0)
      .setDepth(Z.hud + 2);

    // Trzy statystyki zamiast czterech z Heroes 3 — magii jeszcze nie ma,
    // więc czwarte pole byłoby pustym miejscem udającym mechanikę.
    const statY = kartaY + 40;
    const staty: Array<[string, string]> = [
      [ICON.sword, String(b.atak)],
      [ICON.shield, String(b.obrona)],
      [ICON.boot, ''],
    ];
    staty.forEach(([klucz, wartosc], i) => {
      const sx = wnetrzeX + portretBok + 24 + i * 44;
      this.add.image(sx, statY, klucz).setDisplaySize(17, 17).setDepth(Z.hud + 2);
      const t = this.add
        .text(sx + 12, statY, wartosc, display(14, i === 2 ? H.gold : H.white))
        .setOrigin(0, 0.5)
        .setDepth(Z.hud + 2);
      if (i === 2) this.ruchTekst = t;
    });

    // RZĄD ODDZIAŁÓW — sloty jak w Heroes 3: portret i liczba pod spodem.
    const slotBok = 40;
    const odstep = 4;
    const ileSlotow = 4;
    const rzadX = wnetrzeX + (wnetrzeW - (ileSlotow * slotBok + (ileSlotow - 1) * odstep)) / 2;
    const rzadY = kartaY + 74;
    for (let i = 0; i < ileSlotow; i++) {
      const sx = rzadX + i * (slotBok + odstep);
      const g = this.add.graphics().setDepth(Z.hud + 1);
      g.fillStyle(mix(C.panel, C.panelDeep, 0.3), 1);
      g.fillRoundedRect(sx, rzadY, slotBok, slotBok + 12, 5);
      g.lineStyle(1.5, C.panelDeep, 0.7);
      g.strokeRoundedRect(sx, rzadY, slotBok, slotBok + 12, 5);
      const od = b.armia[i];
      if (!od) continue;
      const im = this.add.image(sx + slotBok / 2, rzadY + slotBok / 2 - 1, `p-${od.sprite}`);
      im.setScale((slotBok - 6) / im.height).setDepth(Z.hud + 2);
      this.add
        .text(sx + slotBok / 2, rzadY + slotBok + 4, String(od.ile), display(12))
        .setOrigin(0.5)
        .setDepth(Z.hud + 3);
    }

    // PODPOWIEDŹ — co jest pod kursorem. W Heroes 3 mówi to pasek stanu na
    // dole ekranu; tutaj jest w kolumnie, bo dół zajmują surowce. Pole ma
    // stałą ramkę i tekst zastępczy: puste miejsce w tym rogu wyglądało jak
    // niedokończony interfejs, a nie jak miejsce na komunikat.
    const podY = kartaY + kartaH + 12;
    const podH = py + ph - 58 - podY;
    const ramkaPod = this.add.graphics().setDepth(Z.hud);
    plate(ramkaPod, wnetrzeX, podY, wnetrzeW, podH, 9, mix(C.panel, C.panelDeep, 0.16), C.panelDeep, {
      light: 0.14,
      dark: 0.16,
      gloss: 0.1,
      edgeW: 2,
    });
    this.podpowiedz = this.add
      .text(wnetrzeX + 12, podY + 12, DOMYSLNA_PODPOWIEDZ, body(12, H.ink))
      .setOrigin(0, 0)
      .setDepth(Z.hud + 2)
      .setWordWrapWidth(wnetrzeW - 24);

    const przycisk = makeHudButton(this, {
      x: px + PANEL_W / 2,
      y: py + ph - 32,
      w: wnetrzeW,
      h: 40,
      icon: ICON.hourglass,
      tone: C.gold,
      toneDeep: C.goldDeep,
      onClick: () => this.koniecTury(),
    });
    przycisk.setLabel('Zakończ turę');
  }

  private rysujPasekSurowcow() {
    const y = this.mapaY + this.mapaH + 14;
    const x0 = this.mapaX - 8;
    const szer = this.mapaW + 16;
    const g = this.add.graphics().setDepth(Z.hud);
    g.fillStyle(C.panelDeep, 1);
    g.fillRoundedRect(x0, y, szer, PASEK_H, 7);
    g.lineStyle(2, C.goldDeep, 1);
    g.strokeRoundedRect(x0, y, szer, PASEK_H, 7);

    const krok = (szer - 24) / SUROWCE.length;
    SUROWCE.forEach((s, i) => {
      const sx = x0 + 20 + i * krok;
      const sy = y + PASEK_H / 2;
      // Ikona surowca, nie kolorowa kropka: kropki trzeba się nauczyć,
      // a pokeball i jagodę widać od razu.
      const im = this.add.image(sx, sy, `m-${SUROWIEC_INFO[s].ikona}`).setDepth(Z.hud + 1);
      im.setScale(Math.min(1, (PASEK_H - 10) / im.height));
      this.podpisy[s] = this.add
        .text(sx + 17, sy, '0', display(15))
        .setOrigin(0, 0.5)
        .setDepth(Z.hud + 1);
      // Dochód dzienny obok liczby — bez tego nie widać, po co zajmować sad.
      this.dochody[s] = this.add
        .text(sx + 17, sy, '', body(10, H.goldLight))
        .setOrigin(0, 0.5)
        .setDepth(Z.hud + 1);
    });

    // Data siedzi w prawej kolumnie, pod przyciskiem — w HotA jest po prawej
    // stronie paska, a tam u nas kończy się plansza.
    this.dataTekst = this.add
      .text(this.mapaX + this.mapaW + 14 + PANEL_W / 2, y + PASEK_H / 2, '', display(13, H.goldLight))
      .setOrigin(0.5)
      .setDepth(Z.hud + 1);
  }

  // ---------- odświeżanie ----------

  private odswiezPanel() {
    const b = this.stan.bohater;
    this.ruchTekst.setText(`${Math.round(b.ruch)}`);
    const wplyw = dochod(this.stan);
    for (const s of SUROWCE) {
      const t = this.podpisy[s];
      t.setText(String(this.stan.skarbiec[s]));
      const ile = wplyw[s] ?? 0;
      this.dochody[s].setText(ile > 0 ? `+${ile}/dzień` : '').setX(t.x + t.width + 6);
    }
    const d = data(this.stan.dzien);
    this.dataTekst.setText(`Tydzień ${d.tydzien}, dzień ${d.dzienTygodnia}`);
    this.rysujMinimape();
  }

  private rysujMinimape() {
    const g = this.minimapa;
    const mx = g.getData('x') as number;
    const my = g.getData('y') as number;
    const bok = g.getData('bok') as number;
    const kw = bok / this.stan.szer;
    const kh = bok / this.stan.wys;
    g.clear();
    const barwy: Record<string, number> = {
      trawa: 0xa8c93a,
      sciezka: 0xd0a468,
      piasek: 0xf6d98a,
      las: 0x3f7a3a,
      skaly: 0x8a8a92,
      woda: 0x2f9fe0,
    };
    for (let y = 0; y < this.stan.wys; y++) {
      for (let x = 0; x < this.stan.szer; x++) {
        g.fillStyle(barwy[this.stan.teren[y][x]] ?? 0x888888, 1);
        g.fillRect(mx + x * kw, my + y * kh, Math.ceil(kw), Math.ceil(kh));
      }
    }
    for (const o of this.stan.obiekty) {
      if (o.zebrany) continue;
      const barwa = o.rodzaj === 'potwor' ? C.foe : o.nasz ? C.ally : C.gold;
      g.fillStyle(barwa, 1);
      g.fillRect(mx + o.x * kw, my + o.y * kh, Math.ceil(kw), Math.ceil(kh));
    }
    g.fillStyle(C.white, 1);
    g.fillRect(mx + this.stan.bohater.x * kw - 1, my + this.stan.bohater.y * kh - 1, kw + 2, kh + 2);
  }

  // ---------- interakcja ----------

  private ruchMyszy(p: Phaser.Input.Pointer) {
    if (this.zajety) return;
    const { x, y } = this.zEkranu(p.x, p.y);
    if (x < 0 || y < 0 || x >= this.stan.szer || y >= this.stan.wys) {
      this.podpowiedz.setText(DOMYSLNA_PODPOWIEDZ);
      return;
    }
    const o = obiektNa(this.stan, x, y);
    if (o) {
      this.podpowiedz.setText(this.opisObiektu(o));
      return;
    }
    const teren = TEREN_INFO[this.stan.teren[y][x]];
    this.podpowiedz.setText(
      teren.koszt === null ? `${teren.nazwa} — nie do przejścia` : `${teren.nazwa} — koszt ${teren.koszt}`
    );
  }

  private opisObiektu(o: Obiekt) {
    if (o.rodzaj === 'potwor') {
      const armia = (o.oddzialy ?? []).map((s) => `${s.ile} × ${s.nazwa}`).join(', ');
      return `${o.nazwa}\n${armia}`;
    }
    if (o.rodzaj === 'kopalnia') {
      const co = SUROWIEC_INFO[o.surowiec ?? 'pokeball'].dopelniacz;
      return o.nasz
        ? `${o.nazwa} — twoja\n+${o.ile} ${co} dziennie`
        : `${o.nazwa}\nWejdź, żeby zająć: +${o.ile} ${co} dziennie`;
    }
    if (o.rodzaj === 'zamek') return `${o.nazwa}\nTwój zamek`;
    return `${o.nazwa}\n+${o.ile} ${SUROWIEC_INFO[o.surowiec ?? 'pokeball'].dopelniacz}`;
  }

  private klikMapa(p: Phaser.Input.Pointer) {
    if (this.zajety) return;
    const { x, y } = this.zEkranu(p.x, p.y);
    if (!this.stan || x < 0 || y < 0 || x >= this.stan.szer || y >= this.stan.wys) return;
    if (kosztPola(this.stan, x, y) === null) return;

    const t = this.trasaBiezaca;
    const cel = t && t.length > 0 ? t[t.length - 1] : null;
    if (cel && cel.x === x && cel.y === y) {
      this.idz(t!);
      return;
    }
    this.trasaBiezaca = trasa(this.stan, x, y);
    this.pokazTrase();
  }

  /**
   * Trasa jak w Heroes 3: kropki po polach, jasne dopóki starcza ruchu,
   * przygaszone dalej. Bez tego gracz nie wie, gdzie skończy się tura.
   */
  private pokazTrase() {
    const g = this.warstwaTrasy;
    g.clear();
    const t = this.trasaBiezaca;
    if (!t || t.length === 0) return;
    const wZasiegu = zasiegNaTure(this.stan.bohater, t);
    t.forEach((k, i) => {
      const { x, y } = this.naEkran(k.x, k.y);
      const jasny = i < wZasiegu;
      const barwa = jasny ? C.gold : C.white;
      if (i === t.length - 1) {
        g.lineStyle(3.5, C.shadow, jasny ? 0.5 : 0.25);
        g.strokeCircle(x, y + 1, KAFEL * 0.33);
        g.lineStyle(3, barwa, jasny ? 1 : 0.45);
        g.strokeCircle(x, y, KAFEL * 0.33);
      } else {
        g.fillStyle(C.shadow, jasny ? 0.45 : 0.2);
        g.fillCircle(x, y + 1.5, KAFEL * 0.12);
        g.fillStyle(barwa, jasny ? 1 : 0.45);
        g.fillCircle(x, y, KAFEL * 0.11);
      }
    });
  }

  /** W którą stronę odwrócić trenera. Przy skosie decyduje ruch w poziomie. */
  private kierunekKroku(dx: number, dy: number): Kierunek {
    if (dx !== 0) return dx > 0 ? 'prawo' : 'lewo';
    return dy > 0 ? 'dol' : 'gora';
  }

  private idz(kroki: Krok[]) {
    const ile = zasiegNaTure(this.stan.bohater, kroki);
    if (ile === 0) return;
    this.zajety = true;
    this.warstwaTrasy.clear();

    let i = 0;
    const dalej = () => {
      if (i >= ile) {
        this.zajety = false;
        this.trasaBiezaca = null;
        this.bohaterSprite.stop();
        this.bohaterSprite.setFrame(KIERUNEK_WIERSZ[this.kierunek] * 4);
        const o = obiektNa(this.stan, this.stan.bohater.x, this.stan.bohater.y);
        if (o) this.wejdzNa(o);
        this.odswiezPanel();
        return;
      }
      const k = kroki[i++];
      const kier = this.kierunekKroku(k.x - this.stan.bohater.x, k.y - this.stan.bohater.y);
      if (kier !== this.kierunek || !this.bohaterSprite.anims.isPlaying) {
        this.kierunek = kier;
        this.bohaterSprite.play(`chod-${kier}`);
      }
      this.stan.bohater.ruch -= k.koszt;
      this.stan.bohater.x = k.x;
      this.stan.bohater.y = k.y;
      const { x, y } = this.naEkran(k.x, k.y);
      this.bohaterObj.setDepth(Z.units + k.y + 0.8);
      this.tweens.add({
        targets: this.bohaterObj,
        x,
        y,
        duration: 170,
        ease: 'Linear',
        onComplete: () => {
          this.odswiezPanel();
          dalej();
        },
      });
    };
    dalej();
  }

  private wejdzNa(o: Obiekt) {
    const wynik = odwiedz(this.stan, o);
    this.napisUlotny(wynik.opis);

    if (o.zebrany) {
      // Zebrany surowiec znika — zostawianie go przygaszonego wyglądało jak
      // usterka, a nie jak „już to masz".
      const kont = this.ikonyObiektow[o.id];
      if (kont) {
        this.tweens.add({
          targets: kont,
          alpha: 0,
          y: kont.y - 12,
          duration: 380,
          onComplete: () => kont.destroy(),
        });
      }
    }

    if (wynik.zajete) {
      // Budynek ZOSTAJE — podnosi się na nim chorągiewka. To jest cała
      // różnica między „zebrałem" a „zająłem" i musi ją być widać.
      const kont = this.ikonyObiektow[o.id];
      const flaga = kont?.getData('flaga') as Phaser.GameObjects.Graphics | undefined;
      if (flaga) {
        flaga.setVisible(true).setAlpha(0).setScale(0.6, 0.6);
        this.tweens.add({
          targets: flaga,
          alpha: 1,
          scaleX: 1,
          scaleY: 1,
          duration: 420,
          ease: E.out,
        });
      }
    }

    this.odswiezPanel();
  }

  private napisUlotny(tekst: string, dy = 0) {
    const { x, y } = this.naEkran(this.stan.bohater.x, this.stan.bohater.y);
    const t = this.add
      .text(x, y - KAFEL * 0.7 + dy, tekst, {
        fontFamily: FONT,
        fontSize: '15px',
        fontStyle: 'bold',
        color: H.goldLight,
        stroke: H.shadow,
        strokeThickness: 4,
        align: 'center',
      })
      .setOrigin(0.5, 1)
      .setDepth(Z.effects);
    this.tweens.add({
      targets: t,
      y: t.y - 30,
      alpha: 0,
      duration: 1500,
      onComplete: () => t.destroy(),
    });
  }

  private koniecTury() {
    if (this.zajety) return;
    const wplyw = nowaTura(this.stan);
    this.trasaBiezaca = null;
    this.warstwaTrasy.clear();
    const wpisy = Object.entries(wplyw).map(
      ([co, ile]) => `+${ile} ${SUROWIEC_INFO[co as keyof typeof SUROWIEC_INFO].dopelniacz}`
    );
    this.napisUlotny(['Nowy dzień', ...wpisy].join('\n'));
    this.odswiezPanel();
  }
}
