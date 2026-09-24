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
import { zywe } from '../data/armia';
import { FACTIONS } from '../data/factions';
import { POZIOMY, umiejetnoscPoId } from '../data/umiejetnosci';
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
import { mix, plate } from '../visual/hud';
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
 * utracie ostatniego: malowana, RUCHOMA scena (bohater z uniesionym
 * sztandarem albo samotny pod drzewem), podsumowanie i droga dalej.
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
/** Ile stworków staje przy bohaterze. Więcej zasłania tło i robi tłum. */
const STWORKOW = 6;

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
  /** Rysowanie łopoczącego sztandaru co klatkę — zdejmowane przy zmianie etapu. */
  private naKlatke: ((t: number) => void) | null = null;
  /** Łopoczące flagi sceny — jedna pętla rysowania dla wszystkich. */
  private flagi: Array<(t: number) => void> = [];

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
    for (const n of ['tlo-zwyciestwo', 'tlo-porazka', 'tlo-koniec', 'tlo-grota-zwyciestwo', 'tlo-final'])
      this.load.image(`w-${n}`, `${b}wynik/${n}.jpg`);
    for (const n of ['bohater', 'bohater-plecy', 'zamek', 'zamek-wroga', 'blask', 'grota-fort', 'grota-twierdza'])
      this.load.image(`w-${n}`, `${b}wynik/${n}.png`);
    // Mapa kampanii — z niej miniatura następnej misji; figurka Oli, gdy
    // kampanię prowadzi ona, a nie Janek.
    this.load.image('w-kampania', `${b}kampania/mapa.jpg`);
    this.load.image('w-ola', `${b}kampania/ola.png`);
    this.load.image('m-ognisko', `${b}mapa/ognisko.png`);
    for (const s of this.potrzebneStworki()) this.load.image(`p-${s}`, `${b}sprites/${s}.png`);
    for (const n of ['wynik-zwyciestwo', 'wynik-porazka', 'wynik-koniec'])
      this.load.audio(n, `${b}audio/${n}.wav`);
  }

  /**
   * Figurka trenera, który prowadzi kampanię. Ola ma tylko figurkę z ekranu
   * wyboru (bez widoku z tyłu), więc na porażce też stoi przodem.
   */
  private bohaterKlucz(plecy = false): string {
    const trener = this.postep?.trener ?? this.dane.stan.bohater.imie;
    if (trener === 'Ola' && this.textures.exists('w-ola')) return 'w-ola';
    return plecy ? 'w-bohater-plecy' : 'w-bohater';
  }

  /** Stworki z armii bohatera, parada Boru na zakończenie i znaki tytułów. */
  private potrzebneStworki(): string[] {
    const z = new Set<string>(SPRITE_TYTULOW);
    for (const o of zywe(this.dane?.stan?.bohater.armia ?? [])) z.add(o.sprite);
    for (const u of FACTIONS[0].units) z.add(u.sprite);
    return [...z];
  }

  create() {
    sledzScene(this);
    this.wyjscie = false;
    this.nowyRekord = null;
    this.miejsceRekordu = null;
    this.muzyka = null;
    this.naKlatke = null;
    this.flagi = [];
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
      // Scena żyje dalej jako ten sam obiekt: słuchacz rysujący zniszczoną
      // flagę wywróciłby następne wejście na ten ekran.
      if (this.naKlatke) this.events.off('update', this.naKlatke);
      this.naKlatke = null;
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

  /** Tło na cały ekran, powoli najeżdżane — jak kamera na obrazie w Heroes 2. */
  private tlo(klucz: string) {
    const im = this.add.image(SZER / 2, WYS / 2, klucz).setDisplaySize(SZER, WYS);
    const s = im.scaleX;
    this.tweens.add({
      targets: im,
      scaleX: s * 1.05,
      scaleY: im.scaleY * 1.05,
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

  /** Stworek na scenie: stoi na ziemi, oddycha i od czasu do czasu podskakuje. */
  private stworek(sprite: string, x: number, y: number, wys: number, radosny: boolean, glebia: number) {
    const cien = this.add
      .image(x, y - 2, 'w-kulka')
      .setTint(C.shadow)
      .setAlpha(0.45)
      .setDisplaySize(wys * 0.8, wys * 0.16)
      .setDepth(glebia - 0.1);
    const im = this.obraz(x, y, `p-${sprite}`, wys).setOrigin(0.5, 1).setDepth(glebia);
    const s = im.scaleY;
    this.tweens.add({
      targets: im,
      scaleY: s * 1.03,
      duration: 900 + Math.random() * 500,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
    });
    if (radosny) {
      // Podskok z przysiadem, co 1,5–3 s — każdy stworek w swoim rytmie,
      // inaczej cała gromadka skacze jak na sznurku.
      const skok = () => {
        this.tweens.chain({
          targets: im,
          tweens: [
            { scaleY: s * 0.86, duration: 110, ease: 'Quad.easeOut' },
            { y: y - wys * 0.28, scaleY: s * 1.08, duration: 260, ease: 'Quad.easeOut' },
            { y, scaleY: s, duration: 240, ease: 'Bounce.easeOut' },
          ],
          onComplete: () => this.time.delayedCall(1200 + Math.random() * 1600, skok),
        });
        this.tweens.add({
          targets: cien,
          scaleX: cien.scaleX * 0.7,
          scaleY: cien.scaleY * 0.7,
          duration: 260,
          yoyo: true,
          delay: 110,
        });
      };
      this.time.delayedCall(800 + Math.random() * 1500, skok);
    }
    return im;
  }

  /** Armia bohatera: najmocniejsze stworki pierwsze, bez powtórzeń gatunku. */
  private druzyna(): string[] {
    const armia = zywe(this.dane.stan.bohater.armia).sort((a, b) => (b.tier ?? 0) - (a.tier ?? 0));
    const s = [...new Set(armia.map((o) => o.sprite))];
    return (s.length ? s : FACTIONS[0].units.slice(0, 3).map((u) => u.sprite)).slice(0, STWORKOW);
  }

  /** Stworki w łuku po obu stronach bohatera — dalsze wyżej i mniejsze. */
  private gromadka(x: number, y: number, radosni: boolean, rozstaw = 150, barwa?: number) {
    this.druzyna().forEach((sprite, i) => {
      const strona = i % 2 ? 1 : -1;
      const rzad = Math.floor(i / 2);
      const wys = 118 - rzad * 14;
      const im = this.stworek(sprite, x + strona * (rozstaw + rzad * 105), y - rzad * 16, wys, radosni, 20 - rzad);
      // Światło sceny: o zmierzchu stworki w pełnym kolorze wyglądały na
      // wklejone z innego obrazka.
      if (barwa !== undefined) im.setTint(barwa);
    });
  }

  /**
   * Sztandar gracza: drzewce i łopocząca płachta z gwiazdą — rysowana co
   * klatkę falą, bo sztywny prostokąt flagi wygląda jak tabliczka. `skala`
   * zmniejsza całość do chorągiewki na zdobytej twierdzy w tle.
   */
  private sztandar(x: number, y: number, wys: number, skala = 1, glebia = 24) {
    const g = this.add.graphics().setDepth(glebia);
    const flaga = this.add.graphics().setDepth(glebia + 1);
    const grub = Math.max(2, 6 * skala);
    g.fillStyle(C.shadow, 0.5);
    g.fillRoundedRect(x - grub / 2 - 1, y - wys, grub + 2, wys, 3);
    g.fillStyle(0x8a5a2b, 1);
    g.fillRoundedRect(x - grub / 2, y - wys, grub, wys, 3);
    g.fillStyle(C.gold, 1);
    g.fillCircle(x, y - wys - 4 * skala, 7 * skala);
    const dl = 118 * skala;
    const hF = 74 * skala;
    const gwiazda = this.obraz(0, 0, ICON.star, 34 * skala).setDepth(glebia + 2);
    const faza = Math.random() * 1000;
    this.flagi.push((t: number) => {
      const tt = t + faza;
      flaga.clear();
      const fala = (u: number) => Math.sin(tt / 190 - u * 5) * 7 * skala * u;
      const pasy = 16;
      for (let i = 0; i < pasy; i++) {
        const u0 = i / pasy;
        const u1 = (i + 1) / pasy;
        const jasnosc = 0.5 + 0.5 * Math.cos(tt / 190 - u0 * 5);
        flaga.fillStyle(mix(C.allyDeep, C.ally, jasnosc), 1);
        flaga.fillPoints(
          [
            new Phaser.Math.Vector2(x + 3 * skala + u0 * dl, y - wys + 4 * skala + fala(u0)),
            new Phaser.Math.Vector2(x + 3 * skala + u1 * dl + 0.6, y - wys + 4 * skala + fala(u1)),
            new Phaser.Math.Vector2(x + 3 * skala + u1 * dl + 0.6, y - wys + 4 * skala + hF - u1 * 10 * skala + fala(u1)),
            new Phaser.Math.Vector2(x + 3 * skala + u0 * dl, y - wys + 4 * skala + hF - u0 * 10 * skala + fala(u0)),
          ],
          true
        );
      }
      flaga.fillStyle(C.gold, 1);
      flaga.fillRect(x + 3 * skala, y - wys + 4 * skala + fala(0), dl, 4 * skala);
      gwiazda.setPosition(x + 3 * skala + dl * 0.48, y - wys + 4 * skala + hF / 2 - 3 * skala + fala(0.48));
    });
    if (!this.naKlatke) {
      this.naKlatke = (t: number) => this.flagi.forEach((f) => f(t));
      this.events.on('update', this.naKlatke);
    }
  }

  /** Promienie słońca zza horyzontu — kilka trójkątów w trybie ADD, wolno wirujących. */
  private promienie(x: number, y: number, barwa: number, moc: number) {
    const g = this.add.graphics().setDepth(2).setBlendMode(Phaser.BlendModes.ADD);
    g.setPosition(x, y);
    for (let i = 0; i < 12; i++) {
      const a = (i / 12) * Math.PI * 2;
      const r = 900;
      g.fillStyle(barwa, moc * (i % 2 ? 0.6 : 1));
      g.fillTriangle(0, 0, Math.cos(a - 0.09) * r, Math.sin(a - 0.09) * r, Math.cos(a + 0.09) * r, Math.sin(a + 0.09) * r);
    }
    this.tweens.add({ targets: g, angle: 360, duration: 120000, repeat: -1 });
    return g;
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
      // Tylko własny słuchacz: na tym samym zdarzeniu wiszą zegar i tweeny sceny.
      if (this.naKlatke) this.events.off('update', this.naKlatke);
      this.naKlatke = null;
      this.flagi = [];
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

  /**
   * Sceneria zwycięstwa. Każda misja kończy się tam, gdzie się toczyła:
   * Polana na łące, Grota Księżycowa w jaskini, a ostatnia misja — w tej
   * samej jaskini, ale w pełnym słońcu, z oboma zdobytymi twierdzami
   * i całą paradą. Wcześniej finał kampanii dostawał łąkę z misji 1 i szczyt
   * całej gry wyglądał jak jej początek.
   */
  private sceneria(): 'polana' | 'grota' | 'final' {
    const m = misjaPoId(this.dane.stan.misja);
    if (!m) return 'polana';
    if (m.id === KAMPANIA.misje[KAMPANIA.misje.length - 1].id) return 'final';
    return m.nr === 2 ? 'grota' : 'polana';
  }

  /** Budowla w tle ze wbitą chorągwią gracza — znak, że jest już nasza. */
  private zdobyta(klucz: string, x: number, y: number, wys: number, maszt: { dx: number; dy: number }) {
    const im = this.obraz(x, y, klucz, wys).setOrigin(0.5, 1).setDepth(5);
    this.sztandar(x + maszt.dx, y - wys + maszt.dy, 58, 0.36, 6);
    return im;
  }

  /** Złota korona nad głową bohatera w finale — rysowana, lekko się kołysze. */
  private korona(x: number, y: number) {
    const g = this.add.graphics();
    const pkt = [-34, 18, -40, -14, -18, 2, 0, -24, 18, 2, 40, -14, 34, 18];
    const v = (dy: number) =>
      pkt.reduce<Phaser.Math.Vector2[]>(
        (a, n, i, t) => (i % 2 ? a : [...a, new Phaser.Math.Vector2(n, t[i + 1] + dy)]),
        []
      );
    g.fillStyle(C.shadow, 0.35);
    g.fillPoints(v(4), true);
    g.fillStyle(C.goldDeep, 1);
    g.fillPoints(v(0), true);
    g.fillStyle(C.gold, 1);
    g.fillPoints(v(-2).map((p) => new Phaser.Math.Vector2(p.x * 0.9, p.y * 0.9)), true);
    g.fillStyle(C.goldDeep, 1);
    g.fillRoundedRect(-36, 12, 72, 12, 4);
    g.fillStyle(C.gold, 1);
    g.fillRoundedRect(-34, 13, 68, 7, 3);
    for (const [cx, kolor] of [
      [-20, C.foe],
      [0, C.ally],
      [20, C.hpHigh],
    ] as const) {
      g.fillStyle(kolor, 1);
      g.fillCircle(cx, 17, 4);
      g.fillStyle(C.white, 0.7);
      g.fillCircle(cx - 1.2, 15.8, 1.4);
    }
    for (const [cx, cy] of [
      [-40, -14],
      [0, -24],
      [40, -14],
    ]) {
      g.fillStyle(C.goldLight, 1);
      g.fillCircle(cx, cy, 4.5);
    }
    const k = this.add.container(x, y, [g]).setDepth(31).setScale(0).setAlpha(0);
    this.tweens.add({ targets: k, scale: 1, alpha: 1, duration: 700, delay: 900, ease: E.out });
    this.tweens.add({ targets: k, y: y - 6, angle: 3, duration: 1300, yoyo: true, repeat: -1, ease: 'Sine.easeInOut', delay: 1600 });
    this.add
      .particles(x, y, 'w-iskra', {
        emitZone: { type: 'random', source: new Phaser.Geom.Circle(0, 0, 48), quantity: 1 },
        lifespan: 800,
        frequency: 120,
        scale: { start: 0, end: 0.6 },
        alpha: { start: 1, end: 0 },
        tint: [C.goldLight, C.white],
        blendMode: Phaser.BlendModes.ADD,
      })
      .setDepth(32);
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
    const gdzie = this.sceneria();
    const final = gdzie === 'final';
    this.graj('wynik-zwyciestwo', 0.6);

    const zBohaterem = (y: number, wys: number) => {
      this.add
        .image(SZER / 2, y - 10, 'w-blask')
        .setDisplaySize(620, 150)
        .setTint(0xfff0b8)
        .setAlpha(final ? 0.65 : 0.5)
        .setBlendMode(Phaser.BlendModes.ADD)
        .setDepth(6);
      this.sztandar(SZER / 2 + 92, y - 10, 270);
      const boh = this.obraz(SZER / 2, y, this.bohaterKlucz(), wys).setOrigin(0.5, 1).setDepth(30);
      this.tweens.add({ targets: boh, scaleY: boh.scaleY * 1.015, duration: 1100, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
      this.add.image(SZER / 2, y - 2, 'w-kulka').setTint(C.shadow).setAlpha(0.5).setDisplaySize(170, 26).setDepth(29);
      return boh;
    };

    if (gdzie === 'polana') {
      this.tlo('w-tlo-zwyciestwo');
      this.promienie(SZER / 2, 150, 0xfff0b8, 0.07);
      // Zamek daleko na łące: mniejszy i przymglony — bliżej wyglądał na
      // wklejony obok bohatera, a nie na cel wyprawy na horyzoncie.
      this.obraz(772, 236, 'w-zamek', 134).setOrigin(0.5, 1).setTint(0xf2f0ff).setAlpha(0.96).setDepth(5);
      this.gromadka(SZER / 2, 460, true);
      zBohaterem(462, 300);
    } else if (gdzie === 'grota') {
      this.tlo('w-tlo-grota-zwyciestwo');
      this.promienie(SZER / 2, -40, 0xffe2a0, 0.06);
      this.zdobyta('w-grota-fort', 770, 262, 150, { dx: -40, dy: 6 });
      this.gromadka(SZER / 2, 460, true);
      zBohaterem(462, 300);
    } else {
      // Finał: obie twierdze Groty zdobyte, światło z otworu w sklepieniu,
      // złoty deszcz iskier, cała parada i korona nad bohaterem.
      this.tlo('w-tlo-final');
      this.promienie(SZER / 2, -60, 0xffd890, 0.1);
      this.zdobyta('w-grota-twierdza', 150, 300, 200, { dx: 0, dy: 4 });
      this.zdobyta('w-grota-fort', 820, 286, 150, { dx: -46, dy: 6 });
      const parada = [...new Set([...this.druzyna(), ...FACTIONS[0].units.map((u) => u.sprite)])].slice(0, 8);
      parada.forEach((sprite, i) => {
        const strona = i % 2 ? 1 : -1;
        const rzad = Math.floor(i / 2);
        this.stworek(sprite, SZER / 2 + strona * (150 + rzad * 92), 462 - rzad * 14, 116 - rzad * 12, true, 20 - rzad);
      });
      zBohaterem(466, 282);
      this.korona(SZER / 2, 160);
      this.add
        .particles(0, -10, 'w-iskra', {
          emitZone: { type: 'random', source: new Phaser.Geom.Rectangle(160, 0, SZER - 320, 10), quantity: 1 },
          speedY: { min: 60, max: 130 },
          speedX: { min: -20, max: 20 },
          lifespan: 5200,
          frequency: 45,
          scale: { min: 0.25, max: 0.6 },
          alpha: { start: 1, end: 0.2 },
          rotate: { start: 0, end: 180 },
          tint: [C.goldLight, C.gold, C.white],
          blendMode: Phaser.BlendModes.ADD,
        })
        .setDepth(34);
    }

    // Konfetti spada przez całą scenę, iskry mrugają wokół bohatera.
    this.add
      .particles(0, -20, 'w-konfetti', {
        emitZone: { type: 'random', source: new Phaser.Geom.Rectangle(0, 0, SZER, 10), quantity: 1 },
        speedY: { min: 70, max: 150 },
        speedX: { min: -40, max: 40 },
        lifespan: 7000,
        frequency: final ? 30 : 55,
        rotate: { start: 0, end: 540 },
        scale: { min: 0.7, max: 1.3 },
        tint: [C.gold, C.ally, C.foe, C.hpHigh, C.white, 0xb57bff],
      })
      .setDepth(35);
    this.add
      .particles(SZER / 2, 300, 'w-iskra', {
        emitZone: { type: 'random', source: new Phaser.Geom.Circle(0, 0, 230), quantity: 1 },
        lifespan: 900,
        frequency: 140,
        scale: { start: 0, end: 0.9, ease: 'Sine.easeOut' },
        alpha: { start: 1, end: 0 },
        tint: [C.goldLight, C.white],
        blendMode: Phaser.BlendModes.ADD,
      })
      .setDepth(36);

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
    const w4 = this.wiersz(lx, ky + 142, lw, ICON.sword, 'Atak i obrona', `${st.atak} / ${st.obrona}`, 1);
    tresc.push(...w1.czesci, ...w2.czesci, ...w3.czesci, ...w4.czesci);
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
          napis: `${umiejetnoscPoId(id)?.nazwa ?? id} (${POZIOMY[(poz as number) - 1] ?? poz})`,
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
            .text(px + 34, ky + 52 + widac.length * 26, `i jeszcze ${wpisy.length - widac.length} (ekran bohatera)`, stylAtramentu(13, 'miekki'))
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

    this.tlo('w-tlo-porazka');
    this.obraz(700, 250, 'w-zamek-wroga', 160).setOrigin(0.5, 1).setDepth(5).setAlpha(0.9);

    // Ognisko: jedyne ciepłe światło na obrazku, więc mruga i sypie iskrami.
    const bx = SZER / 2 - 80;
    const ox = bx + 104;
    const oy = 480;
    const blask = this.add
      .image(ox, oy - 20, 'w-blask')
      .setDisplaySize(420, 260)
      .setTint(0xffa040)
      .setAlpha(0.5)
      .setBlendMode(Phaser.BlendModes.ADD)
      .setDepth(6);
    this.tweens.add({ targets: blask, alpha: 0.32, duration: 180, yoyo: true, repeat: -1, repeatDelay: 90, ease: 'Stepped' });
    // Płomienie jasne, obrzeże ogniska w cieniu zmierzchu — inaczej zielony
    // wianek wokół kamieni świecił mocniej niż sam ogień.
    this.add
      .image(ox, oy, 'm-ognisko')
      .setOrigin(0.5, 1)
      .setScale(1.25)
      .setTint(0xffffff, 0xffffff, 0x8890b0, 0x8890b0)
      .setDepth(22);
    this.add
      .particles(ox, oy - 40, 'w-kulka', {
        speedY: { min: -60, max: -25 },
        speedX: { min: -12, max: 12 },
        lifespan: 1600,
        frequency: 160,
        scale: { start: 0.45, end: 0 },
        tint: [0xffc060, 0xff8030],
        blendMode: Phaser.BlendModes.ADD,
      })
      .setDepth(23);

    // Bohater tyłem, patrzy na zamek, który trzeba będzie odbić. Stworki
    // przy nim — nie skaczą, tylko są blisko.
    this.gromadka(bx, 472, false, 196, 0xb4b8dc);
    const boh = this.obraz(bx, 476, this.bohaterKlucz(true), 270).setOrigin(0.5, 1).setDepth(30);
    // Chłodny odcień od nieba i ciepły od ogniska po prawej — `setTint`
    // przyjmuje cztery rogi, więc prawa strona sylwetki łapie blask ognia.
    boh.setTint(0xa8b0d8, 0xe0b890, 0xa8b0d8, 0xe0b890);
    this.tweens.add({ targets: boh, scaleY: boh.scaleY * 1.012, duration: 1600, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
    this.add.image(bx, 474, 'w-kulka').setTint(C.shadow).setAlpha(0.5).setDisplaySize(150, 24).setDepth(29);

    // Deszcz pada kilka sekund i przestaje, potem na niebie zapalają się
    // gwiazdy — cała historia obrazka w jednym geście: będzie lepiej.
    const deszcz = this.add
      .particles(0, -30, 'w-kropla', {
        emitZone: { type: 'random', source: new Phaser.Geom.Rectangle(-100, 0, SZER + 100, 10), quantity: 1 },
        speedY: { min: 700, max: 820 },
        speedX: 90,
        rotate: -7,
        lifespan: 1400,
        frequency: 5,
        alpha: { min: 0.2, max: 0.45 },
        tint: 0xc8d8ff,
      })
      .setDepth(34);
    this.time.delayedCall(5200, () => deszcz.stop());
    this.time.delayedCall(6200, () => {
      this.add
        .particles(0, 0, 'w-iskra', {
          emitZone: { type: 'random', source: new Phaser.Geom.Rectangle(40, 10, SZER - 80, 150), quantity: 1 },
          lifespan: 2400,
          frequency: 260,
          scale: { start: 0, end: 0.45, ease: 'Sine.easeInOut' },
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

    this.tlo('w-tlo-koniec');
    // Fajerwerki: wybuch w losowym miejscu nieba co chwilę, w barwach
    // wszystkich trzech frakcji.
    const ogien = this.add
      .particles(0, 0, 'w-kulka', {
        speed: { min: 80, max: 260 },
        lifespan: 1500,
        gravityY: 80,
        scale: { start: 1.1, end: 0.1 },
        alpha: { start: 1, end: 0 },
        blendMode: Phaser.BlendModes.ADD,
        emitting: false,
      })
      .setDepth(3);
    const wybuch = () => {
      ogien.setParticleTint(Phaser.Utils.Array.GetRandom([C.gold, C.ally, C.foe, C.hpHigh, 0xc890ff]));
      ogien.explode(64, Phaser.Math.Between(80, SZER - 80), Phaser.Math.Between(50, 190));
    };
    this.time.addEvent({ delay: 700, loop: true, callback: wybuch });
    wybuch();

    // Parada: stworki Boru wracają do domu, a bohater stoi w środku.
    const parada = [...new Set([...this.druzyna(), ...FACTIONS[0].units.map((u) => u.sprite)])].slice(0, 8);
    parada.forEach((sprite, i) => {
      const strona = i % 2 ? 1 : -1;
      const rzad = Math.floor(i / 2);
      this.stworek(sprite, SZER / 2 + strona * (132 + rzad * 100), 360 - rzad * 12, 120 - rzad * 10, true, 20 - rzad);
    });
    this.obraz(SZER / 2, 362, this.bohaterKlucz(), 240).setOrigin(0.5, 1).setDepth(30);
    this.add
      .image(SZER / 2, 356, 'w-blask')
      .setDisplaySize(520, 120)
      .setTint(0xcfe4ff)
      .setAlpha(0.45)
      .setBlendMode(Phaser.BlendModes.ADD)
      .setDepth(6);

    this.tytul(SZER / 2, 52, 'Koniec kampanii!', 52);
    this.podtytul(SZER / 2, 104, KAMPANIA.tytul);

    const kx = 24;
    const ky = 382;
    const kw = SZER - 48;
    const kh = 292;
    this.karta(kx, ky, kw, kh);
    const tresc: Phaser.GameObjects.GameObject[] = [
      this.add.text(kx + 24, ky + 18, 'Grota znów świeci', stylEtykiety(19)).setDepth(45),
      this.add
        .text(kx + 24, ky + 52, KAMPANIA.zakonczenie.join('\n\n'), { ...stylAtramentu(15), lineSpacing: 5 })
        .setWordWrapWidth(390)
        .setDepth(45),
    ];

    // Bohater, który przeszedł całą kampanię: portret, poziom i to, co nosi.
    const b = this.dane.stan.bohater;
    const hy = ky + kh - 52;
    const ramka = this.add.graphics().setDepth(44);
    ramka.fillStyle(0x8a5a2a, 0.1);
    ramka.fillRoundedRect(kx + 20, hy - 34, 396, 68, 12);
    const portret = this.obraz(kx + 52, hy + 31, this.bohaterKlucz(), 62).setOrigin(0.5, 1).setDepth(45);
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
      this.add.text(tx + 8, ky + 18, 'Twoja wyprawa', stylEtykiety(16)).setDepth(45),
      this.add.text(tx + tw - 96, ky + 24, 'dni', stylAtramentu(12, 'miekki')).setOrigin(1, 0).setDepth(45),
      this.add.text(tx + tw - 10, ky + 24, 'punkty', stylAtramentu(12, 'miekki')).setOrigin(1, 0).setDepth(45)
    );
    KAMPANIA.misje.forEach((m, i) => {
      const y = ky + 60 + i * 30;
      const w = this.postep.wyniki[m.id];
      const g = this.add.graphics().setDepth(44);
      this.pasmo(g, tx, y - 13, tw, 26, i);
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
    const sy = ky + 60 + KAMPANIA.misje.length * 30 + 6;
    const kreska = this.add.graphics().setDepth(45);
    kreska.lineStyle(2, C.goldDeep, 0.8);
    kreska.lineBetween(tx + 6, sy - 6, tx + tw - 6, sy - 6);
    const razem = this.add
      .text(tx + tw - 10, sy + 14, '0', stylEtykiety(22, BARWA.atrament))
      .setOrigin(1, 0.5)
      .setDepth(45);
    tresc.push(
      kreska,
      this.add.text(tx + 10, sy + 14, 'Razem', stylEtykiety(17)).setOrigin(0, 0.5).setDepth(45),
      this.add.text(tx + tw - 96, sy + 14, String(suma.dni), stylEtykiety(17, BARWA.atrament)).setOrigin(1, 0.5).setDepth(45),
      razem
    );
    this.nabijaj(razem, suma.punkty, 1300);

    // Tytuł za wynik ze stworkiem — „Twój wynik to Smok" z Heroes 2.
    const ty = sy + 58;
    const znak = this.obraz(tx + 34, ty, `p-${tytul.sprite}`, 54).setDepth(46);
    tresc.push(
      znak,
      this.add.text(tx + 68, ty - 10, 'Twój tytuł', stylAtramentu(12, 'miekki')).setOrigin(0, 0.5).setDepth(45),
      this.add.text(tx + 68, ty + 10, tytul.tytul, stylEtykiety(18)).setOrigin(0, 0.5).setDepth(45)
    );
    this.przycisk(kx + kw - 118, ky + kh - 34, 190, 'Sala sław', () => this.przejdz(() => this.pokazRekordy()), {});
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
    const pobite = moj ? LEGENDY.filter((l) => l.punkty < moj.punkty).length : 0;
    const zdanie = moj
      ? `${moj.imie}, jesteś na ${wiersze.indexOf(moj) + 1}. miejscu! Pokonane legendy: ${pobite} z ${LEGENDY.length}.`
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
