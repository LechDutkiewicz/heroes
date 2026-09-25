import Phaser from 'phaser';
import { sledzScene, zapisz } from '../dev/dziennik';
import { artefaktPoId, poziom, statystyki, type StanMapy } from '../data/mapa';
import {
  KAMPANIA,
  type PostepKampanii,
  biezacaMisja,
  kampaniaUkonczona,
  misjaPoId,
  nowyPostep,
  punkty,
  wczytajPostep,
  zapiszPostep,
} from '../data/kampania';
import { rozpocznijMisje, zaliczMisje } from '../data/kampania-start';
import { planszaPrzygody } from '../data/plansza';
import { planszaPoId } from '../data/mapy';
import { umiejetnoscPoId } from '../data/umiejetnosci';
import { ILE_REKORDOW, dodajRekord, wczytajRekordy, type Rekord } from '../data/rekordy';
import { LEGENDY } from '../visual/menuOkna';
import {
  SPRITE_TYTULOW,
  celSlowami,
  coSieStalo,
  przyczynaPorazki,
  rada,
  sumaKampanii,
  tytulZaWynik,
} from '../data/wynik';
import { C, E } from '../visual/theme';
import { plate } from '../visual/hud';
import {
  BARWA,
  KROJ,
  Przycisk,
  krojeZestawu,
  medalion,
  napisTytulowy,
  panelPergaminu,
  stylAtramentu,
  stylEtykiety,
  wczytajZestaw,
  wstazka,
} from '../visual/zestaw';
import { ICON, buildIcons } from '../visual/icons';
import { buildArtefakty, kluczArtefaktu } from '../visual/artefakty';
import { wersjonujZasoby } from '../visual/zasoby';

/**
 * Ekran wyniku — to, co w Heroes 2 dzieje się po ostatnim zamku albo po
 * utracie ostatniego: JEDNA malowana ilustracja na cały ekran (bohater ze
 * sztandarem na wzgórzu, bohater przy ognisku w deszczu, nocne święto z
 * medalem), a na niej tytuł, karta z podsumowaniem i droga dalej.
 *
 * Postacie są częścią obrazu, nie osobnymi wycinkami: wycięte figurki bez
 * cieni, w tej samej pozie na każdym ekranie, wyglądały jak naklejki. Ruch
 * dają tylko rzeczy, które na obrazie i tak by się ruszały — konfetti,
 * deszcz, blask ogniska, fajerwerki — i powolny najazd kamery.
 *
 * Trzy etapy w jednej scenie, bo idą po sobie bez powrotu na mapę:
 *  - `wynik` — zwycięstwo albo porażka w misji (albo w grze pojedynczej),
 *  - `koniec` — zakończenie całej kampanii: tekst, suma punktów, tytuł,
 *  - `rekordy` — Sala sław z nowym wpisem podświetlonym.
 *
 * Scena jest pisana pod ośmiolatka. Porażka jest smutna, ale łagodna: nic
 * tu nie mówi „przegrałeś", mówi „tym razem się nie udało" i od razu daje
 * radę na następny raz. W Heroes 2 porażka to czarny ekran i „You have been
 * defeated" — dla dorosłego wystarczy, dziecko po czymś takim odchodzi od gry.
 */

export interface DaneWyniku {
  rozstrzygniecie: 'wygrana' | 'przegrana';
  stan: StanMapy;
  /** Tylko dla narzędzi: wejście od razu w dalszy etap. */
  etap?: Etap;
}

type Etap = 'wynik' | 'koniec' | 'rekordy';

const SZER = 960;
const WYS = 694;

/**
 * Punkty w kadrze ilustracji (po przycięciu w `tools/wynik_wczytaj.py`),
 * na których stoi to, co scena animuje. Zmiana `KADRY` w skrypcie = zmiana
 * tych liczb.
 */
const NA_OBRAZIE = {
  /** Zwycięstwo: bohater na szczycie wzgórza i słońce za nim. */
  bohaterWygrana: { x: 318, y: 330 },
  slonce: { x: 215, y: 285 },
  /** Porażka: ognisko pod dębem. */
  ognisko: { x: 772, y: 446 },
  /** Koniec: bohater z medalem na brzegu jeziora. */
  bohaterKoniec: { x: 470, y: 380 },
};

export class WynikScene extends Phaser.Scene {
  private dane!: DaneWyniku;
  private postep!: PostepKampanii;
  /** Nowy wpis w Sali sław — do podświetlenia w tabeli. */
  private nowyRekord: Rekord | null = null;
  /** Miejsce nowego wpisu wśród prawdziwych rekordów (od 1); `null` = nie wszedł. */
  private miejsceRekordu: number | null = null;
  /** Blokada podwójnego kliknięcia: każde przejście robi zapis. */
  private wyjscie = false;
  private muzyka: Phaser.Sound.BaseSound | null = null;

  constructor() {
    super('wynik');
  }

  init(d: DaneWyniku) {
    this.dane = d;
  }

  preload() {
    wersjonujZasoby(this);
    wczytajZestaw(this);
    const b = import.meta.env.BASE_URL;
    for (const n of ['tlo-zwyciestwo', 'tlo-porazka', 'tlo-koniec'])
      this.load.image(`w-${n}`, `${b}wynik/${n}.jpg`);
    // Portret do karty zakończenia kampanii — Janka albo Oli.
    this.load.image('w-bohater', `${b}wynik/bohater.png`);
    this.load.image('w-ola', `${b}kampania/ola.png`);
    // Mapa kampanii — z niej miniatura następnej misji.
    this.load.image('w-kampania', `${b}kampania/mapa.jpg`);
    // Stworki-znaki tytułów („Twój tytuł", Sala sław).
    for (const s of SPRITE_TYTULOW) this.load.image(`p-${s}`, `${b}sprites/${s}.png`);
    for (const n of ['wynik-zwyciestwo', 'wynik-porazka', 'wynik-koniec'])
      this.load.audio(n, `${b}audio/${n}.wav`);
  }

  /** Portret trenera, który prowadzi kampanię — do karty zakończenia. */
  private bohaterKlucz(): string {
    const trener = this.postep?.trener ?? this.dane.stan.bohater.imie;
    if (trener === 'Ola' && this.textures.exists('w-ola')) return 'w-ola';
    return 'w-bohater';
  }

  create() {
    sledzScene(this);
    this.wyjscie = false;
    this.nowyRekord = null;
    this.miejsceRekordu = null;
    this.muzyka = null;
    if (!this.dane?.stan) {
      // Wejście bez wyniku (np. odświeżona karta) — nie ma czego pokazać.
      this.scene.start('menu');
      return;
    }
    buildIcons(this);
    buildArtefakty(this);
    this.zbudujTekstury();

    // Skończona gra nie może wrócić przy następnym wejściu na mapę: dalej
    // prowadzi już tylko ten ekran (nowa misja, powtórka albo menu).
    this.registry.remove('stan-mapy');
    this.postep = wczytajPostep() ?? nowyPostep(this.dane.stan.bohater.imie);

    this.input.keyboard?.on('keydown-M', () => {
      this.sound.mute = !this.sound.mute;
    });
    this.events.once('shutdown', () => {
      this.muzyka?.destroy();
      this.muzyka = null;
    });

    zapisz('wynik', `ekran wyniku: ${this.dane.rozstrzygniecie}`, {
      misja: this.dane.stan.misja ?? '(gra pojedyncza)',
      dzien: this.dane.stan.dzien,
    });

    // Kroje zestawu (Cinzel, Lora) muszą być w przeglądarce, ZANIM powstanie
    // pierwszy napis — inaczej Phaser zmierzy i narysuje go krojem zapasowym.
    this.cameras.main.setAlpha(0);
    void krojeZestawu().then(() => {
      if (!this.scene.isActive()) return;
      this.cameras.main.setAlpha(1);
      const etap = this.dane.etap ?? 'wynik';
      if (etap === 'koniec') this.pokazKoniec();
      else if (etap === 'rekordy') this.pokazRekordy();
      else if (this.dane.rozstrzygniecie === 'wygrana') this.pokazZwyciestwo();
      else this.pokazPorazke();
      this.cameras.main.fadeIn(500, 0, 0, 0);
    });
  }

  // ————————————————————————————————————————————————— tekstury efektów

  private zbudujTekstury() {
    const rysuj = (klucz: string, w: number, h: number, f: (g: Phaser.GameObjects.Graphics) => void) => {
      if (this.textures.exists(klucz)) return;
      const g = this.add.graphics();
      f(g);
      g.generateTexture(klucz, w, h);
      g.destroy();
    };
    // Iskra: czteroramienna gwiazdka, jak błysk na złocie.
    rysuj('w-iskra', 32, 32, (g) => {
      g.fillStyle(0xffffff, 1);
      g.fillPoints(
        [16, 0, 19, 13, 32, 16, 19, 19, 16, 32, 13, 19, 0, 16, 13, 13].reduce<Phaser.Math.Vector2[]>(
          (a, v, i, t) => (i % 2 ? a : [...a, new Phaser.Math.Vector2(v, t[i + 1])]),
          []
        ),
        true
      );
    });
    rysuj('w-konfetti', 10, 6, (g) => {
      g.fillStyle(0xffffff, 1);
      g.fillRect(0, 0, 10, 6);
    });
    rysuj('w-kropla', 2, 30, (g) => {
      g.fillStyle(0xffffff, 1);
      g.fillRoundedRect(0, 0, 2, 30, 1);
    });
    rysuj('w-kulka', 16, 16, (g) => {
      for (let r = 8; r > 0; r--) {
        g.fillStyle(0xffffff, 0.14);
        g.fillCircle(8, 8, r);
      }
    });
  }

  /**
   * Gładka kopia tekstury w DOCELOWEJ wysokości.
   *
   * Phaser zmniejsza obrazek w locie bez mipmap, więc bohater 440 px ściśnięty
   * do 60 px albo stworek 128 px do 34 px wychodził poszarpany — jak piksel-art
   * wklejony między malowane plansze (krytyk to wytknął). Tu zmniejszamy
   * w płótnie przeglądarki, schodkami po połowie i z wygładzaniem „high":
   * wynik ma miękkie brzegi, jak reszta ilustracji.
   */
  private gladka(klucz: string, wys: number): string {
    const h = Math.max(4, Math.round(wys));
    const cel = `${klucz}@${h}`;
    if (this.textures.exists(cel)) return cel;
    const zrodlo = this.textures.get(klucz).getSourceImage() as HTMLImageElement | HTMLCanvasElement;
    if (!zrodlo?.width || zrodlo.height <= h) return klucz;
    let obraz: HTMLImageElement | HTMLCanvasElement = zrodlo;
    let w = zrodlo.width;
    let hh = zrodlo.height;
    while (hh / 2 >= h * 1.4) {
      const c = document.createElement('canvas');
      c.width = Math.round(w / 2);
      c.height = Math.round(hh / 2);
      const x = c.getContext('2d')!;
      x.imageSmoothingEnabled = true;
      x.imageSmoothingQuality = 'high';
      x.drawImage(obraz, 0, 0, c.width, c.height);
      obraz = c;
      w = c.width;
      hh = c.height;
    }
    const c = document.createElement('canvas');
    c.width = Math.max(1, Math.round((w * h) / hh));
    c.height = h;
    const x = c.getContext('2d')!;
    x.imageSmoothingEnabled = true;
    x.imageSmoothingQuality = 'high';
    x.drawImage(obraz, 0, 0, c.width, c.height);
    this.textures.addCanvas(cel, c);
    return cel;
  }

  /** Obrazek o zadanej wysokości na ekranie, z gładkiej kopii tekstury. */
  private obraz(x: number, y: number, klucz: string, wys: number) {
    const k = this.gladka(klucz, wys);
    const im = this.add.image(x, y, k);
    if (k === klucz) im.setScale(wys / im.height);
    return im;
  }

  // ————————————————————————————————————————————————— wspólne klocki

  /**
   * Ilustracja na cały ekran, powoli najeżdżana — jak kamera na obrazie
   * w Heroes 2. Najazd idzie NA bohatera (`cel`), a nie na środek ekranu:
   * gromadka zostaje w miejscu, a brzegi kadru (zamek, księżyc) uciekają
   * najwyżej o kilkanaście pikseli.
   */
  private tlo(klucz: string, cel: { x: number; y: number } = { x: SZER / 2, y: WYS / 2 }) {
    const im = this.add
      .image(cel.x, cel.y, klucz)
      .setOrigin(cel.x / SZER, cel.y / WYS)
      .setDisplaySize(SZER, WYS);
    const s = im.scaleX;
    this.tweens.add({
      targets: im,
      scaleX: s * 1.04,
      scaleY: im.scaleY * 1.04,
      duration: 18000,
      ease: 'Sine.easeInOut',
      yoyo: true,
      repeat: -1,
    });
    return im;
  }

  /**
   * Tytuł ekranu: Cinzel pozłacany z zestawu, wchodzi „na sprężynie".
   * Pod nim ciemna, miękka poświata, żeby złoto czytało się na jasnym
   * niebie obrazu tak samo jak na zmierzchu.
   */
  private tytul(x: number, y: number, tekst: string, rozmiar: number) {
    const poswiata = this.add
      .image(x, y + 4, 'w-kulka')
      .setTint(BARWA.cien)
      .setAlpha(0.45)
      .setDisplaySize(tekst.length * rozmiar * 0.62, rozmiar * 1.7)
      .setDepth(49);
    const t = napisTytulowy(this, x, y, tekst, rozmiar).setDepth(50);
    for (const o of [t, poswiata]) o.setScale(o.scaleX * 0.3, o.scaleY * 0.3).setAlpha(0);
    this.tweens.add({ targets: t, scale: 1, alpha: 1, duration: 650, ease: E.out, delay: 250 });
    this.tweens.add({
      targets: poswiata,
      scaleX: poswiata.scaleX / 0.3,
      scaleY: poswiata.scaleY / 0.3,
      alpha: 0.45,
      duration: 650,
      delay: 250,
    });
    return t;
  }

  /** Wstążka z laku pod tytułem: „Misja 1 · Pierwsze kroki". */
  private podtytul(x: number, y: number, tekst: string) {
    const k = wstazka(this, 0, 0, tekst.toUpperCase());
    k.setPosition(x, y).setScale(1.3).setDepth(50).setAlpha(0);
    this.tweens.add({ targets: k, alpha: 1, y: { from: y + 10, to: y }, duration: 400, delay: 700 });
    return k;
  }

  /** Pergamin w złotej ramie u dołu ekranu — jak karta misji na ekranie kampanii. */
  private karta(x: number, y: number, w: number, h: number) {
    const czesci = panelPergaminu(this, x, y, w, h);
    czesci.forEach((c, i) => c.setDepth(40 + i * 0.1).setAlpha(0));
    this.tweens.add({ targets: czesci, alpha: 1, duration: 400, delay: 500 });
    return czesci;
  }

  /** Wszystko, co ma wejść razem z kartą, wchodzi z opóźnieniem karty. */
  private wejdz(obiekty: Phaser.GameObjects.GameObject[], opoznienie = 650) {
    for (const o of obiekty) (o as unknown as Phaser.GameObjects.Components.Alpha).setAlpha?.(0);
    this.tweens.add({ targets: obiekty, alpha: 1, duration: 380, delay: opoznienie });
  }

  /**
   * Tabliczka z zestawu. Złota (`glowny`) tylko dla JEDNEGO następnego kroku
   * na ekranie, reszta drewniana — tak czyta się, co kliknąć najpierw.
   */
  private przycisk(
    x: number,
    y: number,
    w: number,
    napis: string,
    klik: () => void,
    o: { glowny?: boolean; h?: number; strzalka?: boolean } = {}
  ) {
    const b = new Przycisk(this, {
      x,
      y,
      w,
      h: o.h ?? 48,
      tekst: napis,
      glowny: o.glowny ?? true,
      strzalka: o.strzalka,
      glebia: 60,
      akcja: () => {
        if (this.wyjscie) return;
        klik();
      },
    });
    // Przycisk pojawia się ostatni: najpierw scena i tekst, dopiero potem
    // decyzja. Wcześniej dziecko klikało „Dalej", zanim cokolwiek przeczytało.
    b.kontener.setVisible(false);
    this.time.delayedCall(1300, () => b.kontener.setVisible(true));
    return b;
  }

  /** Pasmo tabeli na pergaminie — ciemniejszy papier co drugi wiersz. */
  private pasmo(g: Phaser.GameObjects.Graphics, x: number, y: number, w: number, h: number, i: number) {
    g.fillStyle(0x8a5a2a, i % 2 ? 0.13 : 0.06);
    g.fillRoundedRect(x, y, w, h, 7);
  }

  /** Wiersz liczb: ikona w medalionie, etykieta atramentem, liczba Cinzelem z prawej. */
  private wiersz(x: number, y: number, w: number, ikona: string, etykieta: string, wartosc: string, i: number) {
    const g = this.add.graphics().setDepth(45);
    this.pasmo(g, x, y - 15, w, 30, i);
    const md = medalion(this, x + 16, y, 12, BARWA.papierCiemny).setDepth(45.5);
    const ik = this.obraz(x + 16, y, ikona, 15).setDepth(46);
    const e = this.add.text(x + 36, y, etykieta, stylAtramentu(15, 'miekki')).setOrigin(0, 0.5).setDepth(46);
    const v = this.add
      .text(x + w - 12, y, wartosc, stylEtykiety(19, BARWA.atrament))
      .setOrigin(1, 0.5)
      .setDepth(46);
    return { czesci: [g, md, ik, e, v], wartosc: v };
  }

  /** Licznik rosnący od zera — punkty „nabijają się" jak w Heroes 2. */
  private nabijaj(t: Phaser.GameObjects.Text, do_: number, opoznienie: number) {
    const licznik = { v: 0 };
    t.setText('0');
    this.tweens.add({
      targets: licznik,
      v: do_,
      duration: 1400,
      delay: opoznienie,
      ease: 'Cubic.easeOut',
      onUpdate: () => t.setText(String(Math.round(licznik.v))),
      onComplete: () => {
        t.setText(String(do_));
        this.tweens.add({ targets: t, scale: { from: 1.35, to: 1 }, duration: 300, ease: E.out });
      },
    });
  }

  /**
   * Miękka plama światła w trybie ADD — pulsujący blask słońca albo
   * ogniska namalowanego na ilustracji. Nie rysuje niczego nowego, tylko
   * ożywia światło, które już jest na obrazie.
   */
  private blask(x: number, y: number, w: number, h: number, barwa: number, moc: number, puls: number) {
    const b = this.add
      .image(x, y, 'w-kulka')
      .setDisplaySize(w, h)
      .setTint(barwa)
      .setAlpha(moc)
      .setBlendMode(Phaser.BlendModes.ADD)
      .setDepth(3);
    this.tweens.add({ targets: b, alpha: moc * 0.55, duration: puls, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
    return b;
  }

  private graj(klucz: string, glosnosc: number, petla = false) {
    if (!this.cache.audio.exists(klucz)) return;
    const puscic = () => {
      this.muzyka?.destroy();
      this.muzyka = this.sound.add(klucz, { volume: glosnosc, loop: petla });
      this.muzyka.play();
    };
    if (this.sound.locked) this.sound.once('unlocked', puscic);
    else puscic();
  }

  /** Przejście między etapami: ściemnienie, przebudowa, rozjaśnienie. */
  private przejdz(dalej: () => void) {
    this.wyjscie = true;
    this.cameras.main.fadeOut(400, 0, 0, 0);
    this.cameras.main.once(Phaser.Cameras.Scene2D.Events.FADE_OUT_COMPLETE, () => {
      this.tweens.killAll();
      this.time.removeAllEvents();
      this.children.removeAll(true);
      this.wyjscie = false;
      dalej();
      this.cameras.main.fadeIn(450, 0, 0, 0);
    });
  }

  /** Wyjście do innej sceny z wygaszeniem obrazu i muzyki. */
  private wyjdz(scena: string) {
    this.wyjscie = true;
    if (this.muzyka) this.tweens.add({ targets: this.muzyka, volume: 0, duration: 380 });
    this.cameras.main.fadeOut(400, 0, 0, 0);
    this.cameras.main.once(Phaser.Cameras.Scene2D.Events.FADE_OUT_COMPLETE, () => this.scene.start(scena));
  }

  private nazwaGry(): string {
    const m = misjaPoId(this.dane.stan.misja);
    return m ? `Misja ${m.nr} · ${m.tytul}` : planszaPoId(this.dane.stan.mapa).nazwa;
  }

  /** Czy to była ostatnia misja kampanii — wtedy „Wielkie zwycięstwo!" i złoty deszcz. */
  private final(): boolean {
    const m = misjaPoId(this.dane.stan.misja);
    return !!m && m.id === KAMPANIA.misje[KAMPANIA.misje.length - 1].id;
  }

  /** „1 legenda", „3 legendy", „5 legend" wioski. */
  private legend(n: number) {
    const d = n % 10;
    const nascie = n % 100 >= 12 && n % 100 <= 14;
    if (n === 1) return '1 legenda wioski';
    return d >= 2 && d <= 4 && !nascie ? `${n} legendy wioski` : `${n} legend wioski`;
  }

  /** „1 inna rzecz", „3 inne rzeczy", „5 innych rzeczy" — polska liczba mnoga. */
  private innych(n: number) {
    const d = n % 10;
    const nascie = n % 100 >= 12 && n % 100 <= 14;
    if (n === 1) return '1 inna rzecz';
    return d >= 2 && d <= 4 && !nascie ? `${n} inne rzeczy` : `${n} innych rzeczy`;
  }

  /** Pasy nad lewym i prawym bokiem sceny — skąd spada konfetti, omijając tytuł i bohatera. */
  private bokiSceny() {
    return [new Phaser.Geom.Rectangle(10, 0, 250, 10), new Phaser.Geom.Rectangle(SZER - 260, 0, 250, 10)];
  }

  /**
   * Miniatura misji wycięta z mapy kampanii wokół jej znacznika — ten sam
   * obrazek, który dziecko za chwilę zobaczy na ekranie kampanii.
   */
  private miniaturaMisji(id: string, x: number, y: number, w: number, h: number): Phaser.GameObjects.Image | null {
    const m = misjaPoId(id);
    if (!m || !this.textures.exists('w-kampania')) return null;
    const cel = `w-misja-${id}-${w}x${h}`;
    if (!this.textures.exists(cel)) {
      const zr = this.textures.get('w-kampania').getSourceImage() as HTMLImageElement;
      const sw = zr.width * 0.24;
      const sh = (sw * h) / w;
      const sx = Phaser.Math.Clamp(m.naMapie.x * zr.width - sw / 2, 0, zr.width - sw);
      const sy = Phaser.Math.Clamp(m.naMapie.y * zr.height - sh * 0.62, 0, zr.height - sh);
      const c = document.createElement('canvas');
      c.width = w;
      c.height = h;
      const x2 = c.getContext('2d')!;
      x2.imageSmoothingQuality = 'high';
      x2.beginPath();
      x2.roundRect(0, 0, w, h, 10);
      x2.clip();
      x2.drawImage(zr, sx, sy, sw, sh, 0, 0, w, h);
      this.textures.addCanvas(cel, c);
    }
    return this.add.image(x, y, cel);
  }

  // ————————————————————————————————————————————————— zwycięstwo

  private pokazZwyciestwo() {
    const s = this.dane.stan;
    const m = misjaPoId(s.misja);
    const final = this.final();
    this.graj('wynik-zwyciestwo', 0.6);

    // Ilustracja: bohater ze sztandarem na wzgórzu o wschodzie słońca.
    // Scena dokłada tylko ruch — oddech słońca, konfetti i błyski wokół
    // gromadki. Ostatnia misja ma ten sam obraz, ale złoty deszcz iskier.
    const boh = NA_OBRAZIE.bohaterWygrana;
    this.tlo('w-tlo-zwyciestwo', boh);
    this.blask(NA_OBRAZIE.slonce.x, NA_OBRAZIE.slonce.y, 520, 380, 0xffe6a0, final ? 0.5 : 0.35, 2600);

    const niebo = new Phaser.Geom.Rectangle(0, 0, SZER, 10);
    this.add
      .particles(0, -20, 'w-konfetti', {
        emitZone: { type: 'random', source: niebo, quantity: 1 },
        speedY: { min: 60, max: 130 },
        speedX: { min: -14, max: 14 },
        lifespan: 6000,
        frequency: final ? 70 : 130,
        rotate: { start: 0, end: 540 },
        scale: { min: 0.6, max: 1.1 },
        alpha: { start: 1, end: 0.6 },
        tint: [C.gold, C.ally, C.foe, C.hpHigh, C.white, 0xb57bff],
      })
      .setDepth(28);
    this.add
      .particles(boh.x, boh.y - 40, 'w-iskra', {
        emitZone: { type: 'random', source: new Phaser.Geom.Ellipse(0, 0, 360, 200), quantity: 1 },
        lifespan: 900,
        frequency: 240,
        scale: { start: 0, end: 0.8, ease: 'Sine.easeOut' },
        alpha: { start: 1, end: 0 },
        tint: [C.goldLight, C.white],
        blendMode: Phaser.BlendModes.ADD,
      })
      .setDepth(36);
    if (final) {
      for (const pas of this.bokiSceny()) this.add
        .particles(0, -10, 'w-iskra', {
          emitZone: { type: 'random', source: pas, quantity: 1 },
          speedY: { min: 60, max: 130 },
          speedX: { min: -8, max: 8 },
          lifespan: 5200,
          frequency: 160,
          scale: { min: 0.25, max: 0.6 },
          alpha: { start: 1, end: 0.2 },
          rotate: { start: 0, end: 180 },
          tint: [C.goldLight, C.gold, C.white],
          blendMode: Phaser.BlendModes.ADD,
        })
        .setDepth(28);
    }

    if (final) {
      this.tytul(SZER / 2, 50, 'Wielkie zwycięstwo!', 56);
      this.podtytul(SZER / 2, 106, `${this.nazwaGry()} · ostatnia misja`);
    } else {
      this.tytul(SZER / 2, 58, 'Zwycięstwo!', 60);
      this.podtytul(SZER / 2, 116, this.nazwaGry());
    }

    // Karta: epilog i co dalej | liczby | co bohater zabiera dalej.
    const kx = 24;
    const ky = 486;
    const kw = SZER - 48;
    const kh = 186;
    this.karta(kx, ky, kw, kh);
    const tresc: Phaser.GameObjects.GameObject[] = [];

    const epilog =
      m?.epilog ?? 'Wszystkie zamki na mapie należą do ciebie. Stworki z całej krainy świętują razem z tobą!';
    tresc.push(
      this.add.text(kx + 24, ky + 16, 'Misja wykonana', stylEtykiety(19)).setDepth(45),
      this.add
        .text(kx + 24, ky + 46, epilog, { ...stylAtramentu(15), lineSpacing: 4 })
        .setWordWrapWidth(372)
        .setDepth(45)
    );

    // Co dalej — jak w Heroes 2 po wygranej misji kampanii: następna misja
    // otwiera się na mapie. Dziecko ma wiedzieć, DOKĄD prowadzi „Dalej".
    const nastepna = m ? this.nastepnaMisja() : undefined;
    const dy = ky + kh - 44;
    const pasek = this.add.graphics().setDepth(44);
    pasek.fillStyle(0x8a5a2a, 0.1);
    pasek.fillRoundedRect(kx + 18, dy - 28, 384, 56, 12);
    pasek.lineStyle(1.5, BARWA.kreska, 0.55);
    pasek.strokeRoundedRect(kx + 18, dy - 28, 384, 56, 12);
    tresc.push(pasek);
    if (nastepna) {
      const mini = this.miniaturaMisji(nastepna.id, kx + 60, dy, 72, 46);
      if (mini) {
        mini.setDepth(45);
        const ramka = this.add.graphics().setDepth(46);
        ramka.lineStyle(2.5, C.gold, 1);
        ramka.strokeRoundedRect(kx + 24, dy - 23, 72, 46, 10);
        tresc.push(mini, ramka);
      }
      tresc.push(
        this.add
          .text(kx + 108, dy - 11, `Odblokowana misja ${nastepna.nr}`, { ...stylEtykiety(14), strokeThickness: 3 })
          .setOrigin(0, 0.5)
          .setDepth(45),
        this.add
          .text(kx + 108, dy + 12, nastepna.tytul, stylEtykiety(17, BARWA.atrament))
          .setOrigin(0, 0.5)
          .setDepth(45)
      );
    } else {
      tresc.push(
        this.obraz(kx + 46, dy, ICON.star, 30).setDepth(45),
        this.add
          .text(
            kx + 72,
            dy,
            m ? 'To była ostatnia misja kampanii!\nZa chwilę jej zakończenie.' : `Cel wykonany: ${celSlowami({ typ: 'zamki' }).toLowerCase()}`,
            stylEtykiety(14, BARWA.atrament)
          )
          .setOrigin(0, 0.5)
          .setWordWrapWidth(320)
          .setDepth(45)
      );
    }

    // Liczby.
    const lx = kx + 418;
    const lw = 214;
    const b = s.bohater;
    const pkt = punkty(s.dzien);
    const w1 = this.wiersz(lx, ky + 34, lw, ICON.hourglass, 'Dni wyprawy', String(s.dzien), 0);
    const w2 = this.wiersz(lx, ky + 70, lw, ICON.star, 'Punkty', '0', 1);
    const w3 = this.wiersz(lx, ky + 106, lw, ICON.banner, 'Poziom bohatera', String(poziom(b.doswiadczenie)), 0);
    const st = statystyki(b);
    // Atak i obrona osobno, każde z własną ikoną — „6 / 2" bez podpisu
    // wyglądało na ułamek.
    const g4 = this.add.graphics().setDepth(45);
    this.pasmo(g4, lx, ky + 142 - 15, lw, 30, 1);
    // Liczba stoi tuż za swoim słowem, a nie przy prawej krawędzi połówki —
    // „Obrona" jest dłuższa od „Atak" i przy krawędzi zlewała się z liczbą.
    const polowa = (x: number, ikona: string, nazwa: string, ile: number) => {
      const et = this.add.text(x + 32, ky + 142, nazwa, stylAtramentu(15, 'miekki')).setOrigin(0, 0.5).setDepth(46);
      return [
        medalion(this, x + 16, ky + 142, 12, BARWA.papierCiemny).setDepth(45.5),
        this.obraz(x + 16, ky + 142, ikona, 15).setDepth(46),
        et,
        this.add
          .text(et.x + et.width + 7, ky + 142, String(ile), stylEtykiety(19, BARWA.atrament))
          .setOrigin(0, 0.5)
          .setDepth(46),
      ];
    };
    tresc.push(
      ...w1.czesci,
      ...w2.czesci,
      ...w3.czesci,
      g4,
      ...polowa(lx, ICON.sword, 'Atak', st.atak),
      ...polowa(lx + lw / 2, ICON.shield, 'Obrona', st.obrona)
    );
    this.nabijaj(w2.wartosc, pkt, 1100);

    // Prawa kolumna: w kampanii — co przechodzi do następnej misji i „Dalej".
    const px = kx + 652;
    const pw = kw - 652 - 20;
    const pcx = px + pw / 2;
    if (m) {
      tresc.push(this.add.text(px + 4, ky + 14, 'Zabierasz dalej', stylEtykiety(15)).setDepth(45));
      // Każda rzecz z PODPISEM: sama ikona artefaktu nic dziecku nie mówi.
      const wpisy: Array<{ ikona: string; napis: string }> = [
        ...b.artefakty.map((id) => {
          const a = artefaktPoId(id);
          return { ikona: kluczArtefaktu(id, a?.klasa ?? 'relikt'), napis: a?.nazwa ?? id };
        }),
        ...Object.entries(b.umiejetnosci ?? {}).map(([id, poz]) => ({
          ikona: ICON.banner as string,
          napis: `${umiejetnoscPoId(id)?.nazwa ?? id} — poziom ${poz}`,
        })),
      ];
      const miesci = 3;
      const widac = wpisy.length > miesci ? wpisy.slice(0, miesci - 1) : wpisy;
      widac.forEach((w, i) => {
        const y = ky + 52 + i * 26;
        tresc.push(
          this.obraz(px + 16, y, w.ikona, 24).setDepth(46),
          this.add
            .text(px + 34, y, w.napis, stylAtramentu(13))
            .setOrigin(0, 0.5)
            .setDepth(46)
        );
      });
      if (wpisy.length > widac.length) {
        tresc.push(
          this.add
            .text(px + 34, ky + 52 + widac.length * 26, `…i ${this.innych(wpisy.length - widac.length)}`, stylAtramentu(13, 'miekki'))
            .setOrigin(0, 0.5)
            .setWordWrapWidth(pw - 36)
            .setDepth(46)
        );
      }
      if (!wpisy.length) {
        tresc.push(
          this.add
            .text(px + 4, ky + 50, `${b.imie} i całe doświadczenie\nz tej misji.`, stylAtramentu(13))
            .setOrigin(0, 0.5)
            .setDepth(46)
        );
      }
      this.przycisk(pcx, ky + kh - 30, pw - 8, nastepna ? 'Dalej' : 'Zakończenie', () => this.dalejPoWygranej(), { strzalka: true });
    } else {
      this.przycisk(pcx, ky + 58, pw - 8, 'Zagraj jeszcze raz', () => this.nowaGraPojedyncza(), {});
      this.przycisk(pcx, ky + 124, pw - 8, 'Menu główne', () => this.wyjdz('menu'), { glowny: false });
    }
    this.wejdz(tresc);
  }

  /** Misja, która czeka po zaliczeniu bieżącej. `undefined` = to była ostatnia. */
  private nastepnaMisja() {
    const id = this.dane.stan.misja;
    return biezacaMisja({ ...this.postep, ukonczone: [...this.postep.ukonczone, ...(id ? [id] : [])] });
  }

  private dalejPoWygranej() {
    const nowy = zaliczMisje(this.postep, this.dane.stan);
    zapiszPostep(nowy);
    this.postep = nowy;
    zapisz('wynik', 'misja zaliczona', { ukonczone: nowy.ukonczone });
    if (kampaniaUkonczona(nowy)) this.przejdz(() => this.pokazKoniec());
    else this.wyjdz('kampania');
  }

  private nowaGraPojedyncza() {
    this.registry.set('stan-mapy', planszaPrzygody(this.dane.stan.mapa));
    this.wyjdz('adventure');
  }

  // ————————————————————————————————————————————————— porażka

  private pokazPorazke() {
    const s = this.dane.stan;
    const m = misjaPoId(s.misja);
    const przyczyna = przyczynaPorazki(s);
    this.graj('wynik-porazka', 0.55);

    // Ilustracja: trener bez czapki na kłodzie pod dębem, stworki go
    // pocieszają, ognisko grzeje, za stawem zamek wroga pod chmurami.
    const og = NA_OBRAZIE.ognisko;
    this.tlo('w-tlo-porazka', { x: og.x - 60, y: og.y - 60 });

    // Ognisko: jedyne ciepłe światło na obrazku, więc mruga i sypie iskrami.
    const blask = this.add
      .image(og.x, og.y - 30, 'w-kulka')
      .setDisplaySize(300, 210)
      .setTint(0xffa040)
      .setAlpha(0.42)
      .setBlendMode(Phaser.BlendModes.ADD)
      .setDepth(3);
    this.tweens.add({ targets: blask, alpha: 0.26, duration: 180, yoyo: true, repeat: -1, repeatDelay: 90, ease: 'Stepped' });
    this.add
      .particles(og.x, og.y - 22, 'w-kulka', {
        speedY: { min: -55, max: -22 },
        speedX: { min: -10, max: 10 },
        lifespan: 1500,
        frequency: 170,
        scale: { start: 0.35, end: 0 },
        tint: [0xffc060, 0xff8030],
        blendMode: Phaser.BlendModes.ADD,
      })
      .setDepth(4);

    // Deszcz z obrazu pada jeszcze kilka sekund i przestaje, potem na niebie
    // zapalają się gwiazdy — cała historia obrazka w jednym geście: będzie lepiej.
    const deszcz = this.add
      .particles(0, -30, 'w-kropla', {
        emitZone: { type: 'random', source: new Phaser.Geom.Rectangle(-100, 0, SZER + 100, 10), quantity: 1 },
        speedY: { min: 700, max: 820 },
        speedX: 90,
        rotate: -7,
        lifespan: 1400,
        frequency: 9,
        alpha: { min: 0.15, max: 0.35 },
        tint: 0xc8d8ff,
      })
      .setDepth(34);
    this.time.delayedCall(5200, () => deszcz.stop());
    this.time.delayedCall(6200, () => {
      this.add
        .particles(0, 0, 'w-iskra', {
          emitZone: { type: 'random', source: new Phaser.Geom.Rectangle(40, 10, 560, 150), quantity: 1 },
          lifespan: 2400,
          frequency: 300,
          scale: { start: 0, end: 0.4, ease: 'Sine.easeInOut' },
          alpha: { start: 0.9, end: 0 },
          tint: [0xffffff, 0xfff0b8],
          blendMode: Phaser.BlendModes.ADD,
        })
        .setDepth(3);
    });

    this.tytul(SZER / 2, 58, 'Tym razem się nie udało', 46);
    this.podtytul(SZER / 2, 112, this.nazwaGry());

    const kx = 24;
    const ky = 486;
    const kw = SZER - 48;
    const kh = 186;
    this.karta(kx, ky, kw, kh);
    const tresc: Phaser.GameObjects.GameObject[] = [
      this.add.text(kx + 24, ky + 18, 'Co się stało?', stylEtykiety(19)).setDepth(45),
      this.add
        .text(kx + 24, ky + 50, coSieStalo(przyczyna), { ...stylAtramentu(16, 'czerwony'), fontStyle: 'bold' })
        .setWordWrapWidth(370)
        .setDepth(45),
      this.add
        .text(
          kx + 24,
          ky + 82,
          'Każdy wielki trener czasem przegrywa. Twoje stworki wciąż w ciebie wierzą — spróbujcie jeszcze raz!',
          { ...stylAtramentu(14), lineSpacing: 4 }
        )
        .setWordWrapWidth(370)
        .setDepth(45),
      // Co da „Spróbuj jeszcze raz" — żeby dziecko nie bało się, że straci
      // bohatera, którego wychowało w poprzednich misjach.
      this.obraz(kx + 36, ky + kh - 30, ICON.heart, 20).setDepth(45),
      this.add
        .text(
          kx + 54,
          ky + kh - 30,
          m ? 'Twój bohater i bonus zostają — zaczniesz misję od nowa.' : 'Nowa gra zacznie się na świeżej mapie.',
          { ...stylAtramentu(14, 'miekki'), fontFamily: KROJ.kursywa }
        )
        .setOrigin(0, 0.5)
        .setDepth(45),
    ];

    // Rada w osobnej karteczce, żeby się nie zgubiła w akapicie.
    const rx = kx + 418;
    const rw = 214;
    const g = this.add.graphics().setDepth(44);
    // Karteczka z radą: ciemniejszy papier z kreską, jak dopisek na marginesie.
    g.fillStyle(0x8a5a2a, 0.1);
    g.fillRoundedRect(rx, ky + 18, rw, kh - 36, 10);
    g.lineStyle(1.5, BARWA.kreska, 0.55);
    g.strokeRoundedRect(rx, ky + 18, rw, kh - 36, 10);
    tresc.push(
      g,
      this.obraz(rx + 22, ky + 40, ICON.star, 22).setDepth(45),
      this.add.text(rx + 40, ky + 40, 'Rada', stylEtykiety(16)).setOrigin(0, 0.5).setDepth(45),
      this.add
        .text(rx + 14, ky + 58, rada(przyczyna), { ...stylAtramentu(14), lineSpacing: 2 })
        .setWordWrapWidth(rw - 26)
        .setDepth(45)
    );

    const px = kx + 652;
    const pw = kw - 652 - 20;
    const pcx = px + pw / 2;
    if (m) {
      this.przycisk(pcx, ky + 58, pw - 8, 'Spróbuj jeszcze raz', () => this.powtorzMisje(), { h: 50 });
    } else {
      this.przycisk(pcx, ky + 58, pw - 8, 'Zagraj jeszcze raz', () => this.nowaGraPojedyncza(), {
        h: 50,
      });
    }
    this.przycisk(pcx, ky + 126, pw - 8, 'Menu główne', () => this.wyjdz('menu'), { glowny: false });
    this.wejdz(tresc);
  }

  /** Ta sama misja od nowa: z tym samym bonusem i bohaterem sprzed misji. */
  private powtorzMisje() {
    const m = misjaPoId(this.dane.stan.misja);
    if (!m) return;
    const stan = rozpocznijMisje(this.postep, m, this.postep.bonus ?? 0);
    this.registry.set('stan-mapy', stan);
    zapisz('wynik', 'powtórka misji', { misja: m.id, bonus: this.postep.bonus ?? 0 });
    this.wyjdz('adventure');
  }

  // ————————————————————————————————————————————————— koniec kampanii

  private pokazKoniec() {
    this.graj('wynik-koniec', 0.45, true);
    const suma = sumaKampanii(this.postep);
    const tytul = tytulZaWynik(suma.punkty);
    if (!this.nowyRekord) {
      this.nowyRekord = {
        imie: this.postep.trener,
        punkty: suma.punkty,
        dni: suma.dni,
        data: new Date().toISOString().slice(0, 10),
      };
      this.miejsceRekordu = dodajRekord(this.nowyRekord);
    }

    // Ilustracja: nocne święto nad jeziorem — trener z medalem, strażnik
    // lasu, parada stworków i Grota, która znów świeci. Scena dokłada
    // fajerwerki (na obrazie stoją w miejscu) i błyski wokół medalu.
    const boh = NA_OBRAZIE.bohaterKoniec;
    this.tlo('w-tlo-koniec', boh);
    const ogien = this.add
      .particles(0, 0, 'w-kulka', {
        speed: { min: 70, max: 220 },
        lifespan: 1400,
        gravityY: 80,
        // Mała skala na starcie: w pierwszej klatce wszystkie cząstki stoją
        // w jednym punkcie i w trybie ADD sumowały się w białą plamę.
        scale: { start: 0.35, end: 0.08 },
        alpha: { start: 0.9, end: 0 },
        blendMode: Phaser.BlendModes.ADD,
        emitting: false,
      })
      .setDepth(3);
    // Wybuchy po bokach nieba — środek zajmuje księżyc i tytuł.
    const wybuch = () => {
      ogien.setParticleTint(Phaser.Utils.Array.GetRandom([C.gold, C.ally, C.foe, C.hpHigh, 0xc890ff]));
      const x = Phaser.Math.Between(70, 300);
      ogien.explode(32, Math.random() < 0.5 ? x : SZER - x, Phaser.Math.Between(60, 200));
    };
    this.time.addEvent({ delay: 1100, loop: true, callback: wybuch });
    wybuch();
    this.add
      .particles(boh.x, boh.y, 'w-iskra', {
        emitZone: { type: 'random', source: new Phaser.Geom.Ellipse(0, 0, 220, 110), quantity: 1 },
        lifespan: 900,
        frequency: 260,
        scale: { start: 0, end: 0.6, ease: 'Sine.easeOut' },
        alpha: { start: 1, end: 0 },
        tint: [C.goldLight, C.white],
        blendMode: Phaser.BlendModes.ADD,
      })
      .setDepth(36);

    this.tytul(SZER / 2, 52, 'Koniec kampanii!', 52);
    this.podtytul(SZER / 2, 104, KAMPANIA.tytul);

    // Karta niższa niż kiedyś (224 zamiast 292 px): nad nią musi się zmieścić
    // cała ilustracja z gromadką na brzegu — pod kartą leży już tylko jezioro.
    const kx = 24;
    const ky = 448;
    const kw = SZER - 48;
    const kh = 224;
    this.karta(kx, ky, kw, kh);
    const tresc: Phaser.GameObjects.GameObject[] = [
      this.add.text(kx + 24, ky + 14, 'Grota znów świeci', stylEtykiety(19)).setDepth(45),
      this.add
        .text(kx + 24, ky + 44, KAMPANIA.zakonczenie.join('\n'), { ...stylAtramentu(15), lineSpacing: 4 })
        .setWordWrapWidth(390)
        .setDepth(45),
    ];

    // Bohater, który przeszedł całą kampanię: portret, poziom i to, co nosi.
    const b = this.dane.stan.bohater;
    const hy = ky + kh - 42;
    const ramka = this.add.graphics().setDepth(44);
    ramka.fillStyle(0x8a5a2a, 0.1);
    ramka.fillRoundedRect(kx + 20, hy - 29, 396, 58, 12);
    const portret = this.obraz(kx + 52, hy + 27, this.bohaterKlucz(), 54).setOrigin(0.5, 1).setDepth(45);
    tresc.push(
      ramka,
      portret,
      this.add
        .text(kx + 88, hy - 12, `${b.imie}, poziom ${poziom(b.doswiadczenie)}`, stylEtykiety(16, BARWA.atrament))
        .setOrigin(0, 0.5)
        .setDepth(45),
      this.add
        .text(kx + 88, hy + 12, 'Cała kampania ukończona', stylAtramentu(13, 'miekki'))
        .setOrigin(0, 0.5)
        .setDepth(45)
    );
    b.artefakty.slice(0, 4).forEach((id, i) => {
      const a = artefaktPoId(id);
      tresc.push(
        this.obraz(kx + 396 - i * 34, hy, kluczArtefaktu(id, a?.klasa ?? 'relikt'), 30).setDepth(45)
      );
    });

    // Tabela misji: numer, tytuł, dni, punkty — i suma pod kreską.
    const tx = kx + 440;
    const tw = kw - 440 - 22;
    tresc.push(
      this.add.text(tx + 8, ky + 14, 'Twoja wyprawa', stylEtykiety(16)).setDepth(45),
      this.add.text(tx + tw - 96, ky + 20, 'dni', stylAtramentu(12, 'miekki')).setOrigin(1, 0).setDepth(45),
      this.add.text(tx + tw - 10, ky + 20, 'punkty', stylAtramentu(12, 'miekki')).setOrigin(1, 0).setDepth(45)
    );
    KAMPANIA.misje.forEach((m, i) => {
      const y = ky + 50 + i * 24;
      const w = this.postep.wyniki[m.id];
      const g = this.add.graphics().setDepth(44);
      this.pasmo(g, tx, y - 11, tw, 22, i);
      tresc.push(
        g,
        this.add.text(tx + 10, y, `${m.nr}. ${m.tytul}`, stylAtramentu(14)).setOrigin(0, 0.5).setDepth(45),
        this.add.text(tx + tw - 96, y, w ? String(w.dni) : '—', stylAtramentu(14)).setOrigin(1, 0.5).setDepth(45),
        this.add
          .text(tx + tw - 10, y, w ? String(w.punkty) : '—', stylEtykiety(14, BARWA.atrament))
          .setOrigin(1, 0.5)
          .setDepth(45)
      );
    });
    const sy = ky + 50 + KAMPANIA.misje.length * 24 + 2;
    const kreska = this.add.graphics().setDepth(45);
    kreska.lineStyle(2, C.goldDeep, 0.8);
    kreska.lineBetween(tx + 6, sy - 6, tx + tw - 6, sy - 6);
    const razem = this.add
      .text(tx + tw - 10, sy + 12, '0', stylEtykiety(22, BARWA.atrament))
      .setOrigin(1, 0.5)
      .setDepth(45);
    tresc.push(
      kreska,
      this.add.text(tx + 10, sy + 12, 'Razem', stylEtykiety(17)).setOrigin(0, 0.5).setDepth(45),
      this.add.text(tx + tw - 96, sy + 12, String(suma.dni), stylEtykiety(17, BARWA.atrament)).setOrigin(1, 0.5).setDepth(45),
      razem
    );
    this.nabijaj(razem, suma.punkty, 1300);

    // Tytuł za wynik ze stworkiem — „Twój wynik to Smok" z Heroes 2.
    const ty = ky + kh - 32;
    const znak = this.obraz(tx + 30, ty, `p-${tytul.sprite}`, 42).setDepth(46);
    tresc.push(
      znak,
      this.add.text(tx + 60, ty - 10, 'Twój tytuł', stylAtramentu(12, 'miekki')).setOrigin(0, 0.5).setDepth(45),
      this.add.text(tx + 60, ty + 10, tytul.tytul, stylEtykiety(18)).setOrigin(0, 0.5).setDepth(45)
    );
    this.przycisk(kx + kw - 118, ky + kh - 32, 190, 'Sala sław', () => this.przejdz(() => this.pokazRekordy()), {});
    this.wejdz(tresc);
  }

  // ————————————————————————————————————————————————— sala sław

  /**
   * Sala sław. Prawdziwe wyniki z `wczytajRekordy()` przeplecione z legendami
   * wioski — tymi samymi, co w oknie rekordów w menu, i tak samo podpisanymi.
   * Pusta tabela z pięcioma kreskami wyglądała jak niedokończona; w Heroes 2
   * tabela też jest od początku pełna nazwisk do pobicia.
   */
  private pokazRekordy() {
    if (!this.muzyka) this.graj('wynik-koniec', 0.45, true);
    this.tlo('w-tlo-koniec');
    this.add.rectangle(0, 0, SZER, WYS, C.shadow, 0.5).setOrigin(0, 0).setDepth(1);
    this.add
      .particles(0, 0, 'w-kulka', {
        emitZone: { type: 'random', source: new Phaser.Geom.Rectangle(0, 0, SZER, WYS), quantity: 1 },
        lifespan: 3000,
        frequency: 120,
        scale: { start: 0, end: 0.5, ease: 'Sine.easeInOut' },
        alpha: { start: 0.9, end: 0 },
        tint: [0xcfe4ff, C.goldLight],
        blendMode: Phaser.BlendModes.ADD,
      })
      .setDepth(2);

    this.tytul(SZER / 2, 46, 'Sala sław', 50);

    const prawdziwe = wczytajRekordy();
    // Nowy wpis rozpoznajemy po MIEJSCU, które oddał `dodajRekord` — data
    // w zapisie jest przycięta do dnia, więc porównanie pól bywało ślepe.
    const moj = this.miejsceRekordu ? prawdziwe[this.miejsceRekordu - 1] : undefined;
    const wiersze: Array<Rekord & { legenda?: boolean }> = [
      ...prawdziwe,
      ...LEGENDY.map((l) => ({ ...l, data: '', legenda: true })),
    ]
      .sort((a, b) => b.punkty - a.punkty || a.dni - b.dni)
      .slice(0, ILE_REKORDOW);

    const kx = 110;
    const ky = 100;
    const kw = SZER - 220;
    const krok = 44;
    const kh = 64 + ILE_REKORDOW * krok + 44;
    this.karta(kx, ky, kw, kh);
    const kol = { miejsce: kx + 44, imie: kx + 84, dni: kx + 388, punkty: kx + 486, tytul: kx + 520 };
    const tresc: Phaser.GameObjects.GameObject[] = [
      this.add.text(kol.imie, ky + 26, 'Trener', stylAtramentu(13, 'miekki')).setOrigin(0, 0.5).setDepth(45),
      this.add.text(kol.dni, ky + 26, 'Dni', stylAtramentu(13, 'miekki')).setOrigin(1, 0.5).setDepth(45),
      this.add.text(kol.punkty, ky + 26, 'Punkty', stylAtramentu(13, 'miekki')).setOrigin(1, 0.5).setDepth(45),
      this.add.text(kol.tytul + 42, ky + 26, 'Tytuł', stylAtramentu(13, 'miekki')).setOrigin(0, 0.5).setDepth(45),
    ];
    wiersze.forEach((r, i) => {
      const y = ky + 64 + i * krok;
      const jaTo = r === moj;
      const miekki = !!r.legenda;
      const g = this.add.graphics().setDepth(44);
      if (jaTo) {
        // Własny wiersz: złota poświata na papierze i złota obwódka.
        g.fillStyle(C.gold, 0.35);
        g.fillRoundedRect(kx + 16, y - 19, kw - 32, 38, 9);
        g.lineStyle(2, C.goldDeep, 0.9);
        g.strokeRoundedRect(kx + 16, y - 19, kw - 32, 38, 9);
      } else {
        this.pasmo(g, kx + 16, y - 19, kw - 32, 38, i);
      }
      tresc.push(g);
      // Trzy pierwsze miejsca dostają medalion z zestawu — złoty pierścień
      // i dno w barwie miejsca (złoto, srebro, brąz) — zamiast gołej liczby.
      const medal = [0x7a4a10, 0x4d5560, 0x6a3a1a][i];
      if (medal !== undefined) tresc.push(medalion(this, kol.miejsce, y, 15, medal).setDepth(45));
      const t = tytulZaWynik(r.punkty);
      const imie = this.add
        .text(kol.imie, y, r.imie, stylAtramentu(18, miekki ? 'miekki' : 'zwykly'))
        .setOrigin(0, 0.5)
        .setDepth(45);
      const znak = this.obraz(kol.tytul + 18, y, `p-${t.sprite}`, 36).setDepth(46);
      if (r.legenda) znak.setAlpha(0.75);
      tresc.push(
        this.add
          .text(kol.miejsce, y, String(i + 1), medal !== undefined ? stylEtykiety(15, BARWA.krem) : stylAtramentu(15, 'miekki'))
          .setOrigin(0.5)
          .setDepth(46),
        imie,
        this.add.text(kol.dni, y, String(r.dni), stylAtramentu(16, miekki ? 'miekki' : 'zwykly')).setOrigin(1, 0.5).setDepth(45),
        this.add
          .text(kol.punkty, y, r.punkty.toLocaleString('pl-PL'), stylEtykiety(17, miekki ? BARWA.atramentMiekki : BARWA.atrament))
          .setOrigin(1, 0.5)
          .setDepth(45),
        znak,
        this.add.text(kol.tytul + 42, y, t.tytul, stylAtramentu(15, miekki ? 'miekki' : 'zwykly')).setOrigin(0, 0.5).setDepth(45)
      );
      if (r.legenda) {
        tresc.push(
          this.add
            .text(kol.imie + imie.width + 8, y + 1, 'legenda wioski', { ...stylAtramentu(11, 'miekki'), fontFamily: KROJ.kursywa })
            .setOrigin(0, 0.5)
            .setDepth(45)
        );
      }
      if (jaTo) {
        // Kapsułka „ty" przy imieniu i wirująca gwiazdka — dziecko ma
        // znaleźć siebie w tabeli jednym spojrzeniem.
        const nx = kol.imie + imie.width + 12;
        const napis = this.add.text(nx + 10, y, 'NOWY', stylEtykiety(11, '#fff4dc')).setOrigin(0, 0.5);
        const kaps = this.add.graphics();
        plate(kaps, nx, y - 10, napis.width + 20, 20, 10, BARWA.lak, BARWA.lakCiemny, {
          light: 0.2,
          dark: 0.2,
          gloss: 0.25,
          edgeW: 1.5,
          drop: 1,
        });
        const gw = this.obraz(nx + napis.width + 36, y, ICON.star, 22);
        this.tweens.add({ targets: gw, angle: 360, duration: 4000, repeat: -1 });
        kaps.setDepth(46.5);
        napis.setDepth(47);
        gw.setDepth(47);
        tresc.push(kaps, napis, gw);
      }
    });

    // Jedno zdanie pod tabelą — mówi, co ten wynik znaczy.
    // Liczymy legendy z wierszy tabeli PONIŻEJ gracza — to, co dziecko
    // widzi. Liczone z całej listy legend dawało „7 z 8" przy trzecim
    // miejscu i trzech legendach pod spodem.
    const pobite = moj ? wiersze.slice(wiersze.indexOf(moj) + 1).filter((r) => r.legenda).length : 0;
    const zdanie = moj
      ? `${moj.imie}, jesteś na ${wiersze.indexOf(moj) + 1}. miejscu!` +
        (pobite ? ` Za tobą w tabeli: ${this.legend(pobite)}.` : ' Legendy wioski wciąż czekają!')
      : this.miejsceRekordu === null && this.nowyRekord
        ? 'Tym razem bez miejsca w tabeli — zagraj jeszcze raz i pobij legendy wioski!'
        : `Ukończ kampanię „${KAMPANIA.tytul}" i pobij legendy wioski!`;
    tresc.push(
      this.add
        .text(SZER / 2, ky + kh - 26, zdanie, stylEtykiety(15, BARWA.atrament))
        .setOrigin(0.5)
        .setDepth(45)
    );
    this.przycisk(SZER / 2, ky + kh + 40, 240, 'Menu główne', () => this.wyjdz('menu'), {});
    this.wejdz(tresc, 450);
  }
}
