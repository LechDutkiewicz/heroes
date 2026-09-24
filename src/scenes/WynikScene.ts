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
import { umiejetnoscPoId } from '../data/umiejetnosci';
import { dodajRekord, wczytajRekordy, type Rekord } from '../data/rekordy';
import {
  SPRITE_TYTULOW,
  celSlowami,
  coSieStalo,
  przyczynaPorazki,
  rada,
  sumaKampanii,
  tytulZaWynik,
} from '../data/wynik';
import { C, E, FONT, H, body, display } from '../visual/theme';
import { gradientText, makeHudButton, mix, plate } from '../visual/hud';
import { ICON, buildIcons, type IconKey } from '../visual/icons';
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
  /** Blokada podwójnego kliknięcia: każde przejście robi zapis. */
  private wyjscie = false;
  private muzyka: Phaser.Sound.BaseSound | null = null;
  /** Rysowanie łopoczącego sztandaru co klatkę — zdejmowane przy zmianie etapu. */
  private naKlatke: ((t: number) => void) | null = null;

  constructor() {
    super('wynik');
  }

  init(d: DaneWyniku) {
    this.dane = d;
  }

  preload() {
    wersjonujZasoby(this);
    const b = import.meta.env.BASE_URL;
    for (const n of ['tlo-zwyciestwo', 'tlo-porazka', 'tlo-koniec']) this.load.image(`w-${n}`, `${b}wynik/${n}.jpg`);
    for (const n of ['bohater', 'bohater-plecy', 'zamek', 'zamek-wroga', 'blask'])
      this.load.image(`w-${n}`, `${b}wynik/${n}.png`);
    this.load.image('m-ognisko', `${b}mapa/ognisko.png`);
    for (const s of this.potrzebneStworki()) this.load.image(`p-${s}`, `${b}sprites/${s}.png`);
    for (const n of ['wynik-zwyciestwo', 'wynik-porazka', 'wynik-koniec'])
      this.load.audio(n, `${b}audio/${n}.wav`);
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
    this.muzyka = null;
    this.naKlatke = null;
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

    const etap = this.dane.etap ?? 'wynik';
    if (etap === 'koniec') this.pokazKoniec();
    else if (etap === 'rekordy') this.pokazRekordy();
    else if (this.dane.rozstrzygniecie === 'wygrana') this.pokazZwyciestwo();
    else this.pokazPorazke();
    this.cameras.main.fadeIn(500, 0, 0, 0);
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
   * Napis-logo w trzech warstwach (gruby cień, złoty obrys, lico
   * z gradientem) — ten sam przepis co `drawTitle`, tyle że wyśrodkowany
   * i z wejściem „na sprężynie".
   */
  private tytul(x: number, y: number, tekst: string, rozmiar: number, gora: string, dol: string, obrys: number = C.goldDeep) {
    const warstwa = (kolor: number, grubosc: number) =>
      this.add
        .text(x, y, tekst, {
          fontFamily: FONT,
          fontSize: `${rozmiar}px`,
          fontStyle: 'bold',
          color: H.goldLight,
          stroke: `#${kolor.toString(16).padStart(6, '0')}`,
          strokeThickness: grubosc,
        })
        .setOrigin(0.5)
        .setDepth(50);
    const tyl = warstwa(C.shadow, rozmiar * 0.42).setShadow(0, 4, '#00000088', 10, true, true);
    const srodek = warstwa(obrys, rozmiar * 0.2);
    const lico = warstwa(C.shadow, 0);
    gradientText(lico, gora, dol);
    const czesci = [tyl, srodek, lico];
    for (const t of czesci) t.setScale(0.3).setAlpha(0);
    this.tweens.add({ targets: czesci, scale: 1, alpha: 1, duration: 650, ease: E.out, delay: 250 });
    return czesci;
  }

  /** Kapsułka pod tytułem: „Misja 1 · Pierwsze kroki". */
  private podtytul(x: number, y: number, tekst: string) {
    const t = this.add.text(0, 0, tekst, { ...display(16, H.white), strokeThickness: 4 }).setOrigin(0.5);
    const w = t.width + 44;
    const g = this.add.graphics();
    plate(g, -w / 2, -17, w, 34, 17, C.panelDeep, C.gold, { light: 0.24, dark: 0.3, gloss: 0.2, edgeW: 2 });
    const k = this.add.container(x, y, [g, t]).setDepth(50).setAlpha(0);
    this.tweens.add({ targets: k, alpha: 1, y: { from: y + 10, to: y }, duration: 400, delay: 700 });
    return k;
  }

  /** Karta z treścią u dołu ekranu — ta sama tabliczka co okna na mapie. */
  private karta(x: number, y: number, w: number, h: number, krawedz: number = C.gold) {
    // Płasko, bez gradientu z `plate`: na tabliczce tej wielkości gradient
    // krojony na pasy widać jako prążki, a jego dolne pasma odsłaniają
    // jaśniejsze kliny w zaokrąglonych rogach.
    const g = this.add.graphics().setDepth(40);
    plate(g, x, y, w, h, 16, C.panel, krawedz, { light: 0, dark: 0, gloss: 0, edgeW: 3, drop: 5 });
    g.lineStyle(1.5, C.panelEdge, 0.9);
    g.strokeRoundedRect(x + 6, y + 6, w - 12, h - 12, 11);
    g.setAlpha(0);
    this.tweens.add({ targets: g, alpha: 0.97, duration: 400, delay: 500 });
    return g;
  }

  /** Wszystko, co ma wejść razem z kartą, wchodzi z opóźnieniem karty. */
  private wejdz(obiekty: Phaser.GameObjects.GameObject[], opoznienie = 650) {
    for (const o of obiekty) (o as unknown as Phaser.GameObjects.Components.Alpha).setAlpha?.(0);
    this.tweens.add({ targets: obiekty, alpha: 1, duration: 380, delay: opoznienie });
  }

  private przycisk(
    x: number,
    y: number,
    w: number,
    napis: string,
    klik: () => void,
    o: { ikona?: IconKey; zloty?: boolean; h?: number } = {}
  ) {
    const b = makeHudButton(this, {
      x,
      y,
      w,
      h: o.h ?? 46,
      icon: o.ikona,
      tone: o.zloty === false ? C.ally : C.gold,
      toneDeep: o.zloty === false ? C.allyDeep : C.goldDeep,
      depth: 60,
      onClick: () => {
        if (this.wyjscie) return;
        klik();
      },
    });
    b.setLabel(napis);
    // Przycisk pojawia się ostatni: najpierw scena i tekst, dopiero potem
    // decyzja. Wcześniej dziecko klikało „Dalej", zanim cokolwiek przeczytało.
    b.setVisible(false);
    this.time.delayedCall(1300, () => b.setVisible(true));
    return b;
  }

  /** Wiersz tabeli jak w panelu oddziału: pasmo, ikona, etykieta, liczba z prawej. */
  private wiersz(x: number, y: number, w: number, ikona: IconKey, etykieta: string, wartosc: string, i: number) {
    const g = this.add.graphics().setDepth(45);
    g.fillStyle(i % 2 ? mix(C.panel, C.panelEdge, 0.55) : mix(C.panel, C.panelEdge, 0.25), 1);
    g.fillRoundedRect(x, y - 15, w, 30, 8);
    const ik = this.add.image(x + 18, y, ikona).setDisplaySize(20, 20).setDepth(46);
    const e = this.add.text(x + 34, y, etykieta, body(14, H.inkSoft)).setOrigin(0, 0.5).setDepth(46);
    const v = this.add
      .text(x + w - 12, y, wartosc, { ...display(18, H.white), strokeThickness: 4 })
      .setOrigin(1, 0.5)
      .setDepth(46);
    return { czesci: [g, ik, e, v], wartosc: v };
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
    const im = this.add.image(x, y, `p-${sprite}`).setOrigin(0.5, 1).setDepth(glebia);
    im.setScale(wys / im.height);
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

  private sztandar(x: number, y: number, wys: number) {
    // Drzewce wbite w ziemię obok bohatera, płachta łopocze — rysowana co
    // klatkę falą, bo sztywny prostokąt flagi wygląda jak tabliczka.
    const g = this.add.graphics().setDepth(24);
    const flaga = this.add.graphics().setDepth(25);
    g.fillStyle(C.shadow, 0.5);
    g.fillRoundedRect(x - 4, y - wys, 8, wys, 3);
    g.fillStyle(0x8a5a2b, 1);
    g.fillRoundedRect(x - 3, y - wys, 6, wys, 3);
    g.fillStyle(C.gold, 1);
    g.fillCircle(x, y - wys - 4, 7);
    g.fillStyle(C.white, 0.6);
    g.fillCircle(x - 2, y - wys - 6, 2.5);
    const dl = 118;
    const hF = 74;
    const gwiazda = this.add.image(0, 0, ICON.star).setDisplaySize(34, 34).setDepth(26);
    this.naKlatke = (t: number) => {
      flaga.clear();
      const fala = (u: number) => Math.sin(t / 190 - u * 5) * 7 * u;
      const pasy = 16;
      for (let i = 0; i < pasy; i++) {
        const u0 = i / pasy;
        const u1 = (i + 1) / pasy;
        const jasnosc = 0.5 + 0.5 * Math.cos(t / 190 - u0 * 5);
        flaga.fillStyle(mix(C.allyDeep, C.ally, jasnosc), 1);
        flaga.fillPoints(
          [
            new Phaser.Math.Vector2(x + 3 + u0 * dl, y - wys + 4 + fala(u0)),
            new Phaser.Math.Vector2(x + 3 + u1 * dl + 0.6, y - wys + 4 + fala(u1)),
            new Phaser.Math.Vector2(x + 3 + u1 * dl + 0.6, y - wys + 4 + hF - u1 * 10 + fala(u1)),
            new Phaser.Math.Vector2(x + 3 + u0 * dl, y - wys + 4 + hF - u0 * 10 + fala(u0)),
          ],
          true
        );
      }
      flaga.fillStyle(C.gold, 1);
      flaga.fillRect(x + 3, y - wys + 4 + fala(0), dl, 4);
      gwiazda.setPosition(x + 3 + dl * 0.48, y - wys + 4 + hF / 2 - 3 + fala(0.48));
    };
    this.events.on('update', this.naKlatke);
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

  // ————————————————————————————————————————————————— zwycięstwo

  private pokazZwyciestwo() {
    const s = this.dane.stan;
    const m = misjaPoId(s.misja);
    this.graj('wynik-zwyciestwo', 0.6);

    this.tlo('w-tlo-zwyciestwo');
    this.promienie(SZER / 2, 150, 0xfff0b8, 0.07);
    // Zamek daleko na łące: mniejszy i przymglony — bliżej wyglądał na
    // wklejony obok bohatera, a nie na cel wyprawy na horyzoncie.
    this.add.image(772, 236, 'w-zamek').setOrigin(0.5, 1).setScale(0.42).setTint(0xf2f0ff).setAlpha(0.96).setDepth(5);

    // Plama światła pod bohaterem — wyciąga go z trawy jak reflektor.
    this.add
      .image(SZER / 2, 452, 'w-blask')
      .setDisplaySize(620, 150)
      .setTint(0xfff0b8)
      .setAlpha(0.5)
      .setBlendMode(Phaser.BlendModes.ADD)
      .setDepth(6);
    this.gromadka(SZER / 2, 460, true);
    this.sztandar(SZER / 2 + 92, 452, 270);
    const boh = this.add.image(SZER / 2, 462, 'w-bohater').setOrigin(0.5, 1).setDepth(30);
    boh.setScale(300 / boh.height);
    this.tweens.add({ targets: boh, scaleY: boh.scaleY * 1.015, duration: 1100, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
    this.add.image(SZER / 2, 460, 'w-kulka').setTint(C.shadow).setAlpha(0.5).setDisplaySize(170, 26).setDepth(29);

    // Konfetti spada przez całą scenę, iskry mrugają wokół bohatera.
    this.add
      .particles(0, -20, 'w-konfetti', {
        emitZone: { type: 'random', source: new Phaser.Geom.Rectangle(0, 0, SZER, 10), quantity: 1 },
        speedY: { min: 70, max: 150 },
        speedX: { min: -40, max: 40 },
        lifespan: 7000,
        frequency: 55,
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

    this.tytul(SZER / 2, 58, 'Zwycięstwo!', 60, H.white, H.gold);
    this.podtytul(SZER / 2, 116, this.nazwaGry());

    // Karta: epilog | liczby | co bohater zabiera dalej.
    const kx = 24;
    const ky = 486;
    const kw = SZER - 48;
    const kh = 186;
    this.karta(kx, ky, kw, kh);
    const tresc: Phaser.GameObjects.GameObject[] = [];

    const epilog =
      m?.epilog ?? 'Wszystkie zamki na mapie należą do ciebie. Stworki z całej krainy świętują razem z tobą!';
    tresc.push(
      this.add.text(kx + 24, ky + 18, 'Misja wykonana', display(19, H.gold)).setDepth(45),
      this.add
        .text(kx + 24, ky + 50, epilog, { ...body(15, H.ink), lineSpacing: 5 })
        .setWordWrapWidth(372)
        .setDepth(45)
    );
    const cel = this.add.text(kx + 50, ky + kh - 30, `Cel wykonany: ${celSlowami((m ?? { zwyciestwo: { typ: 'zamki' } }).zwyciestwo).replace(/^./, (c) => c.toLowerCase())}`, {
      ...body(13, H.inkSoft),
      fontStyle: 'italic',
    });
    cel.setOrigin(0, 0.5).setDepth(45).setWordWrapWidth(340);
    tresc.push(cel, this.add.image(kx + 34, ky + kh - 30, ICON.star).setDisplaySize(20, 20).setDepth(45));

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
      const nastepna = this.nastepnaMisja();
      tresc.push(
        this.add.text(pcx, ky + 20, 'Zabierasz dalej', display(15, H.gold)).setOrigin(0.5, 0).setDepth(45)
      );
      const arty = b.artefakty.slice(0, 5);
      if (arty.length) {
        arty.forEach((id, i) => {
          const a = artefaktPoId(id);
          const x = pcx + (i - (arty.length - 1) / 2) * 38;
          const gn = this.add.graphics().setDepth(45);
          gn.fillStyle(mix(C.panel, C.panelDeep, 0.2), 1);
          gn.fillRoundedRect(x - 17, ky + 48, 34, 34, 7);
          gn.lineStyle(1.5, C.goldDeep, 0.8);
          gn.strokeRoundedRect(x - 17, ky + 48, 34, 34, 7);
          tresc.push(gn, this.add.image(x, ky + 65, kluczArtefaktu(id, a?.klasa ?? 'relikt')).setDisplaySize(30, 30).setDepth(46));
        });
      }
      const umiej = Object.keys(b.umiejetnosci ?? {})
        .map((id) => umiejetnoscPoId(id)?.nazwa)
        .filter(Boolean);
      const opis = [
        `${b.imie}, poziom ${poziom(b.doswiadczenie)}`,
        arty.length ? '' : 'bez artefaktów',
        umiej.length ? umiej.join(', ') : '',
      ]
        .filter(Boolean)
        .join('\n');
      tresc.push(
        this.add
          .text(pcx, arty.length ? ky + 90 : ky + 50, opis, { ...body(12, H.inkSoft), align: 'center', lineSpacing: 2 })
          .setOrigin(0.5, 0)
          .setWordWrapWidth(pw)
          .setDepth(45)
      );
      this.przycisk(pcx, ky + kh - 32, pw - 8, nastepna ? 'Dalej' : 'Zakończenie', () => this.dalejPoWygranej(), {
        ikona: ICON.banner,
      });
    } else {
      this.przycisk(pcx, ky + 58, pw - 8, 'Zagraj jeszcze raz', () => this.nowaGraPojedyncza(), {
        ikona: ICON.sword,
      });
      this.przycisk(pcx, ky + 124, pw - 8, 'Menu główne', () => this.wyjdz('menu'), { zloty: false });
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
    this.add.image(700, 250, 'w-zamek-wroga').setOrigin(0.5, 1).setScale(0.5).setDepth(5).setAlpha(0.9);

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
    const boh = this.add.image(bx, 476, 'w-bohater-plecy').setOrigin(0.5, 1).setDepth(30);
    // Chłodny odcień od nieba i ciepły od ogniska po prawej — `setTint`
    // przyjmuje cztery rogi, więc prawa strona sylwetki łapie blask ognia.
    boh.setScale(270 / boh.height).setTint(0xa8b0d8, 0xe0b890, 0xa8b0d8, 0xe0b890);
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

    this.tytul(SZER / 2, 58, 'Tym razem się nie udało', 46, H.white, '#bcd4ec', C.allyDeep);
    this.podtytul(SZER / 2, 112, this.nazwaGry());

    const kx = 24;
    const ky = 486;
    const kw = SZER - 48;
    const kh = 186;
    this.karta(kx, ky, kw, kh, C.panelEdge);
    const tresc: Phaser.GameObjects.GameObject[] = [
      this.add.text(kx + 24, ky + 18, 'Co się stało?', display(19, H.panelEdge)).setDepth(45),
      this.add
        .text(kx + 24, ky + 50, coSieStalo(przyczyna), { ...body(15, H.ink), fontStyle: 'bold' })
        .setWordWrapWidth(370)
        .setDepth(45),
      this.add
        .text(
          kx + 24,
          ky + 82,
          'Każdy wielki trener czasem przegrywa. Twoje stworki wciąż w ciebie wierzą — spróbujcie jeszcze raz!',
          { ...body(14, H.ink), lineSpacing: 4 }
        )
        .setWordWrapWidth(370)
        .setDepth(45),
    ];

    // Rada w osobnej karteczce, żeby się nie zgubiła w akapicie.
    const rx = kx + 418;
    const rw = 214;
    const g = this.add.graphics().setDepth(44);
    plate(g, rx, ky + 18, rw, kh - 36, 10, 0xfff6d6, C.goldDeep, { light: 0.1, dark: 0.1, gloss: 0.1, edgeW: 2, drop: 2 });
    tresc.push(
      g,
      this.add.image(rx + 22, ky + 40, ICON.star).setDisplaySize(22, 22).setDepth(45),
      this.add.text(rx + 40, ky + 40, 'Rada', display(16, H.gold)).setOrigin(0, 0.5).setDepth(45),
      this.add
        .text(rx + 14, ky + 60, rada(przyczyna), { ...body(13, H.ink), lineSpacing: 3 })
        .setWordWrapWidth(rw - 26)
        .setDepth(45)
    );

    const px = kx + 652;
    const pw = kw - 652 - 20;
    const pcx = px + pw / 2;
    if (m) {
      this.przycisk(pcx, ky + 58, pw - 8, 'Spróbuj jeszcze raz', () => this.powtorzMisje(), { ikona: ICON.sword, h: 50 });
    } else {
      this.przycisk(pcx, ky + 58, pw - 8, 'Zagraj jeszcze raz', () => this.nowaGraPojedyncza(), {
        ikona: ICON.sword,
        h: 50,
      });
    }
    this.przycisk(pcx, ky + 126, pw - 8, 'Menu główne', () => this.wyjdz('menu'), { zloty: false });
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
        data: new Date().toISOString(),
      };
      dodajRekord(this.nowyRekord);
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
      this.stworek(sprite, SZER / 2 + strona * (120 + rzad * 92), 356 - rzad * 12, 100 - rzad * 10, true, 20 - rzad);
    });
    const boh = this.add.image(SZER / 2, 362, 'w-bohater').setOrigin(0.5, 1).setDepth(30);
    boh.setScale(230 / boh.height);
    this.add
      .image(SZER / 2, 356, 'w-blask')
      .setDisplaySize(520, 120)
      .setTint(0xcfe4ff)
      .setAlpha(0.45)
      .setBlendMode(Phaser.BlendModes.ADD)
      .setDepth(6);

    this.tytul(SZER / 2, 52, 'Koniec kampanii!', 52, H.white, H.gold);
    this.podtytul(SZER / 2, 104, KAMPANIA.tytul);

    const kx = 24;
    const ky = 382;
    const kw = SZER - 48;
    const kh = 292;
    this.karta(kx, ky, kw, kh);
    const tresc: Phaser.GameObjects.GameObject[] = [
      this.add.text(kx + 24, ky + 18, 'Grota znów świeci', display(19, H.gold)).setDepth(45),
      this.add
        .text(kx + 24, ky + 52, KAMPANIA.zakonczenie.join('\n\n'), { ...body(15, H.ink), lineSpacing: 5 })
        .setWordWrapWidth(390)
        .setDepth(45),
    ];

    // Bohater, który przeszedł całą kampanię: portret, poziom i to, co nosi.
    const b = this.dane.stan.bohater;
    const hy = ky + kh - 52;
    const ramka = this.add.graphics().setDepth(44);
    ramka.fillStyle(mix(C.panel, C.panelEdge, 0.35), 1);
    ramka.fillRoundedRect(kx + 20, hy - 34, 396, 68, 12);
    const portret = this.add.image(kx + 52, hy + 30, 'w-bohater').setOrigin(0.5, 1).setDepth(45);
    portret.setScale(60 / portret.height);
    tresc.push(
      ramka,
      portret,
      this.add
        .text(kx + 88, hy - 12, `${b.imie}, poziom ${poziom(b.doswiadczenie)}`, display(16, H.white))
        .setOrigin(0, 0.5)
        .setDepth(45),
      this.add
        .text(kx + 88, hy + 12, 'Cała kampania ukończona', body(13, H.inkSoft))
        .setOrigin(0, 0.5)
        .setDepth(45)
    );
    b.artefakty.slice(0, 4).forEach((id, i) => {
      const a = artefaktPoId(id);
      tresc.push(
        this.add
          .image(kx + 396 - i * 34, hy, kluczArtefaktu(id, a?.klasa ?? 'relikt'))
          .setDisplaySize(30, 30)
          .setDepth(45)
      );
    });

    // Tabela misji: numer, tytuł, dni, punkty — i suma pod kreską.
    const tx = kx + 440;
    const tw = kw - 440 - 22;
    tresc.push(
      this.add.text(tx + 8, ky + 18, 'Twoja wyprawa', display(16, H.gold)).setDepth(45),
      this.add.text(tx + tw - 96, ky + 24, 'dni', body(12, H.inkSoft)).setOrigin(1, 0).setDepth(45),
      this.add.text(tx + tw - 10, ky + 24, 'punkty', body(12, H.inkSoft)).setOrigin(1, 0).setDepth(45)
    );
    KAMPANIA.misje.forEach((m, i) => {
      const y = ky + 60 + i * 30;
      const w = this.postep.wyniki[m.id];
      const g = this.add.graphics().setDepth(44);
      g.fillStyle(i % 2 ? mix(C.panel, C.panelEdge, 0.55) : mix(C.panel, C.panelEdge, 0.25), 1);
      g.fillRoundedRect(tx, y - 13, tw, 26, 7);
      tresc.push(
        g,
        this.add.text(tx + 10, y, `${m.nr}. ${m.tytul}`, body(14, H.ink)).setOrigin(0, 0.5).setDepth(45),
        this.add.text(tx + tw - 96, y, w ? String(w.dni) : '—', body(14, H.ink)).setOrigin(1, 0.5).setDepth(45),
        this.add
          .text(tx + tw - 10, y, w ? String(w.punkty) : '—', { ...body(14, H.ink), fontStyle: 'bold' })
          .setOrigin(1, 0.5)
          .setDepth(45)
      );
    });
    const sy = ky + 60 + KAMPANIA.misje.length * 30 + 6;
    const kreska = this.add.graphics().setDepth(45);
    kreska.lineStyle(2, C.goldDeep, 0.8);
    kreska.lineBetween(tx + 6, sy - 6, tx + tw - 6, sy - 6);
    const razem = this.add
      .text(tx + tw - 10, sy + 14, '0', { ...display(22, H.white), strokeThickness: 5 })
      .setOrigin(1, 0.5)
      .setDepth(45);
    tresc.push(
      kreska,
      this.add.text(tx + 10, sy + 14, 'Razem', display(17, H.gold)).setOrigin(0, 0.5).setDepth(45),
      this.add.text(tx + tw - 96, sy + 14, String(suma.dni), display(17, H.white)).setOrigin(1, 0.5).setDepth(45),
      razem
    );
    this.nabijaj(razem, suma.punkty, 1300);

    // Tytuł za wynik ze stworkiem — „Twój wynik to Smok" z Heroes 2.
    const ty = sy + 58;
    const znak = this.add.image(tx + 34, ty, `p-${tytul.sprite}`).setDepth(46);
    znak.setScale(52 / znak.height);
    tresc.push(
      znak,
      this.add.text(tx + 68, ty - 10, 'Twój tytuł', body(12, H.inkSoft)).setOrigin(0, 0.5).setDepth(45),
      this.add.text(tx + 68, ty + 10, tytul.tytul, display(18, H.gold)).setOrigin(0, 0.5).setDepth(45)
    );
    this.przycisk(kx + kw - 118, ky + kh - 34, 190, 'Sala sław', () => this.przejdz(() => this.pokazRekordy()), {
      ikona: ICON.star,
    });
    this.wejdz(tresc);
  }

  // ————————————————————————————————————————————————— sala sław

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

    this.tytul(SZER / 2, 46, 'Sala sław', 50, H.white, H.gold);

    const lista = wczytajRekordy();
    const kx = 110;
    const ky = 104;
    const kw = SZER - 220;
    const kh = 500;
    this.karta(kx, ky, kw, kh);
    const kol = { miejsce: kx + 44, imie: kx + 84, dni: kx + 388, punkty: kx + 486, tytul: kx + 520 };
    const tresc: Phaser.GameObjects.GameObject[] = [
      this.add.text(kol.miejsce, ky + 26, 'Miejsce', body(12, H.inkSoft)).setOrigin(0.5).setDepth(45),
      this.add.text(kol.imie, ky + 26, 'Trener', body(12, H.inkSoft)).setOrigin(0, 0.5).setDepth(45),
      this.add.text(kol.dni, ky + 26, 'Dni', body(12, H.inkSoft)).setOrigin(1, 0.5).setDepth(45),
      this.add.text(kol.punkty, ky + 26, 'Punkty', body(12, H.inkSoft)).setOrigin(1, 0.5).setDepth(45),
      this.add.text(kol.tytul + 40, ky + 26, 'Tytuł', body(12, H.inkSoft)).setOrigin(0, 0.5).setDepth(45),
    ];
    const nowy = this.nowyRekord;
    for (let i = 0; i < 10; i++) {
      const r = lista[i];
      const y = ky + 64 + i * 42;
      const moj = !!(nowy && r && r.data === nowy.data && r.imie === nowy.imie && r.punkty === nowy.punkty);
      const g = this.add.graphics().setDepth(44);
      if (moj) {
        plate(g, kx + 16, y - 18, kw - 32, 36, 10, C.goldLight, C.gold, { light: 0.2, dark: 0.1, gloss: 0.2, edgeW: 2, drop: 2 });
      } else {
        g.fillStyle(i % 2 ? mix(C.panel, C.panelEdge, 0.55) : mix(C.panel, C.panelEdge, 0.25), 1);
        g.fillRoundedRect(kx + 16, y - 18, kw - 32, 36, 9);
      }
      tresc.push(g);
      // Trzy pierwsze miejsca dostają medal zamiast gołej liczby.
      const medal = [C.gold, 0xc9d3dd, 0xd08a4a][i];
      if (medal !== undefined) {
        const m = this.add.graphics().setDepth(45);
        m.fillStyle(C.shadow, 0.35);
        m.fillCircle(kol.miejsce, y + 2, 14);
        m.fillStyle(medal, 1);
        m.fillCircle(kol.miejsce, y, 14);
        m.fillStyle(C.white, 0.45);
        m.fillCircle(kol.miejsce - 4, y - 5, 5);
        tresc.push(m);
      }
      tresc.push(
        this.add
          .text(kol.miejsce, y, String(i + 1), medal !== undefined ? display(15, H.white) : body(15, H.inkSoft))
          .setOrigin(0.5)
          .setDepth(46)
      );
      if (!r) {
        tresc.push(this.add.text(kol.imie, y, '—', body(15, H.inkSoft)).setOrigin(0, 0.5).setDepth(45));
        continue;
      }
      const t = tytulZaWynik(r.punkty);
      const znak = this.add.image(kol.tytul + 18, y, `p-${t.sprite}`).setDepth(46);
      znak.setScale(34 / znak.height);
      const imie = this.add.text(kol.imie, y, r.imie, { ...body(16, H.ink), fontStyle: 'bold' }).setOrigin(0, 0.5).setDepth(45);
      tresc.push(
        imie,
        this.add.text(kol.dni, y, String(r.dni), body(15, H.ink)).setOrigin(1, 0.5).setDepth(45),
        this.add.text(kol.punkty, y, String(r.punkty), { ...body(16, H.ink), fontStyle: 'bold' }).setOrigin(1, 0.5).setDepth(45),
        znak,
        this.add.text(kol.tytul + 40, y, t.tytul, body(14, H.ink)).setOrigin(0, 0.5).setDepth(45)
      );
      if (moj) {
        // Kapsułka „nowy" przy imieniu i wirująca gwiazdka — dziecko ma
        // znaleźć siebie w tabeli jednym spojrzeniem.
        const nx = kol.imie + imie.width + 12;
        const napis = this.add
          .text(nx + 10, y, 'NOWY', { ...body(11, H.white), fontStyle: 'bold' })
          .setOrigin(0, 0.5);
        const kaps = this.add.graphics();
        plate(kaps, nx, y - 10, napis.width + 20, 20, 10, C.foe, C.foeDeep, {
          light: 0.2,
          dark: 0.2,
          gloss: 0.25,
          edgeW: 1.5,
          drop: 1,
        });
        const gw = this.add.image(nx + napis.width + 36, y, ICON.star).setDisplaySize(22, 22);
        this.tweens.add({ targets: gw, angle: 360, duration: 4000, repeat: -1 });
        kaps.setDepth(46.5);
        napis.setDepth(47);
        gw.setDepth(47);
        tresc.push(kaps, napis, gw);
      }
    }
    this.przycisk(SZER / 2, ky + kh + 44, 240, 'Menu główne', () => this.wyjdz('menu'), { ikona: ICON.banner });
    this.wejdz(tresc, 450);
  }
}
