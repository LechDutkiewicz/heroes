/**
 * Ekran bohatera — to, co w Heroes 3 otwiera kliknięcie w bohatera na mapie
 * przygody (albo w portret bohatera w mieście).
 *
 * Układ jest z HoMM3, materiał z naszego zestawu (`visual/zestaw.ts`) — ten
 * sam, co mapa przygody i miasto: drewno z belką (imię bohatera tam, gdzie
 * miasto ma swoją nazwę), pergaminowe pola w cienkich złotych ramach,
 * tabliczki przycisków i na dole ten sam pasek armii co w mieście.
 *
 *  - lewe pole: kim jest bohater (poziom, doświadczenie), trzy umiejętności
 *    pierwszorzędne jako malowane ikony z liczbą (atak, obrona, ruch)
 *    i siatka gniazd umiejętności drugorzędnych z malowanymi ikonami;
 *  - prawe pole: lalka jak w HoMM3 — bohater w całej postaci na ciemnym
 *    suknie w grubej złotej ramie, a gniazda artefaktów leżą NA nim: głowa,
 *    szyja, tułów, ręce, pas, stopy, plecy. Każdy artefakt ma swoje stałe
 *    gniazdo (opaska na głowie, pazur w ręce, buty na stopie…); brakujący to
 *    cień w półprzezroczystym gnieździe — zbieranie ma widoczny koniec,
 *    a postać prześwituje;
 *  - dół: blok armii na całą szerokość (ta sama ciężka rama i te same sloty
 *    co w mieście — `PanelArmii`: klik-klik, przeciąganie, drugi klik /
 *    prawy klik = okno stworka), obok linia statusu i wyjście.
 *
 * Stałych napisów-samouczków nie ma (runda 2 ślepego porównania: „wygląda
 * jak samouczek w formularzu"). Podpowiedź jest w dymku po najechaniu i w
 * linii statusu.
 *
 * Najechanie na umiejętność, artefakt, statystykę albo doświadczenie
 * pokazuje dymek z opisem (pergamin w złotej ramie); klik albo prawy klik
 * przypina go — na tablecie nie ma najechania.
 */

import Phaser from 'phaser';
import { spriteDoPortretow, wczytajPortrety } from '../visual/portrety';
import {
  ARTEFAKTY,
  ARTEFAKTY_LOSOWE,
  artefaktPoId,
  bonusPoziomu,
  data,
  poziom,
  postepPoziomu,
  ruchNaDzis,
  statystyki,
  type Artefakt,
  type StanMapy,
} from '../data/mapa';
import { znormalizuj, zywe } from '../data/armia';
import { planszaPrzygody } from '../data/plansza';
import {
  ATAK_BOHATERA_MAKS,
  ATAK_BOHATERA_ZA_PUNKT,
  OBRONA_BOHATERA_MAKS,
  OBRONA_BOHATERA_ZA_PUNKT,
} from '../data/battle';
import { STAJNIA_BONUS } from '../data/zasady-h3';
import {
  MAKS_UMIEJETNOSCI,
  POZIOMY,
  efekt,
  opisWartosci,
  posiadane,
  type PoziomUmiejetnosci,
  type Umiejetnosc,
} from '../data/umiejetnosci';
import { Z } from '../visual/theme';
import { PanelArmii } from '../visual/panelArmii';
import { OKNO_H, OKNO_W } from '../visual/uklad';
import { wersjonujZasoby } from '../visual/zasoby';
import { krojeZestawu, wczytajZestaw } from '../visual/zestaw';
import {
  TUSZ,
  TUSZ_CSS,
  ZOLTY,
  krojWalki,
  medalionPokeball,
  napisNaPigulce,
  panelBialy,
  pigulka,
  pokeball,
  stylWalki,
  tloWalki,
  type KolorPigulki,
} from '../visual/stylWalki';
import { przyciskWalki } from '../visual/hudWalki';
import { migawkaStanu, sledzScene, zapisz } from '../dev/dziennik';

const KLUCZ_STANU = 'stan-mapy';
/** Skąd przyszliśmy: 'zamek' (portret w mieście) albo brak — mapa przygody. */
const KLUCZ_POWROTU = 'powrot-z-bohatera';

/*
 * Geometria (styl gier Pokémon, jak ekran walki — `stylWalki.ts`): czerwona
 * belka-pokeball u góry, dwa białe panele, na dole pas drużyny.
 */
const BELKA_H = 58;
const POLA_Y = BELKA_H + 16;
const SLOT = 68;
const SLOT_ODSTEP = 6;
const BLOK_PAD = 8;
const BLOK_X = 12;
const BLOK_W = OKNO_W - 24;
const BLOK_H = BLOK_PAD * 2 + SLOT;
const BLOK_Y = OKNO_H - 10 - BLOK_H;
const POLA_H = BLOK_Y - 14 - POLA_Y;
const LEWA = { x: 12, w: 556 };
const PRAWA = { x: 580, w: OKNO_W - 12 - 580 };
/** Figurka bohatera i siedem slotów; po prawej status i wyjście. */
const HERB_X = BLOK_X + BLOK_PAD + 4;
const RZAD_X = HERB_X + SLOT + 12;
const RZAD_Y = BLOK_Y + BLOK_PAD;
const STATUS_X = RZAD_X + 7 * SLOT + 6 * SLOT_ODSTEP + 16;
const STATUS_W = BLOK_X + BLOK_W - 12 - STATUS_X;
const STATUS_Y = BLOK_Y + 8;
const STATUS_H = 36;
const PRZYCISKI_Y = BLOK_Y + BLOK_H - 8 - 16;

/**
 * Lalka: wnętrze prawego panelu, postać w całej sylwetce
 * (`public/bohater/postac-<kto>.png`, 600 px wysokości) i gniazda na niej.
 */
const LALKA = { x: PRAWA.x + 8, y: POLA_Y + 8, w: PRAWA.w - 16, h: POLA_H - 16 };
const POSTAC_H = 392;
const POSTAC_Y = LALKA.y + 12;
const POSTAC_CX = LALKA.x + LALKA.w / 2;
const ART_BOK = 46;

/** Barwy napisów na bieli. */
const SZARY = '#5b6270';
const ZIELONY = '#2f9e55';

/**
 * Gniazda lalki: część ciała, artefakt, który tam siedzi, i punkt na
 * postaci (ułamki szerokości i wysokości rysunku). Punkty zmierzone na
 * obu postaciach (Janek i Ela stoją w tej samej pozie; Ela ma pas wyżej). Szyja jest na
 * amulet — cel misji (Księżycowy Kamień), gdy bohater go niesie.
 */
const GNIAZDA_LALKI: Array<{ czesc: string; id: string | null; fx: number; fy: number; ela?: { fx: number; fy: number } }> = [
  { czesc: 'głowa', id: 'opaska', fx: 0.14, fy: 0.07 },
  { czesc: 'plecy', id: 'skrzydla', fx: 0.9, fy: 0.13 },
  { czesc: 'szyja', id: null, fx: 0.5, fy: 0.385 },
  { czesc: 'tułów', id: 'kamizelka', fx: 0.22, fy: 0.47 },
  { czesc: 'pas', id: 'mistrz', fx: 0.5, fy: 0.585, ela: { fx: 0.5, fy: 0.515 } },
  { czesc: 'prawa ręka', id: 'pazur', fx: 0.04, fy: 0.665 },
  { czesc: 'lewa ręka', id: 'tarcza', fx: 0.96, fy: 0.665 },
  { czesc: 'stopy', id: 'buty', fx: 0.24, fy: 0.925 },
  { czesc: 'pojazd', id: 'rower', fx: 0.86, fy: 0.925 },
];

/** Gniazdo umiejętności drugorzędnej. */
const UM_BOK = 52;

interface Opis {
  klucz: string;
  tytul: string;
  podtytul?: string;
  tresc: string;
  ikona?: string;
}

interface Obszar {
  x: number;
  y: number;
  w: number;
  h: number;
}

export class HeroScene extends Phaser.Scene {
  private stan!: StanMapy;
  panel!: PanelArmii;
  private komunikat!: Phaser.GameObjects.Text;
  private dymek: Phaser.GameObjects.Container | null = null;
  /** Klucz opisu w dymku i czy jest przypięty (klik / tablet). */
  dymekKlucz = '';
  private dymekPrzypiety = false;
  private strefyOpisu = new Set<Phaser.GameObjects.GameObject>();
  /** Dla sond: ekran zbudowany (po wczytaniu krojów). */
  gotowy = false;
  private budowa = 0;

  constructor() {
    super('bohater');
  }

  preload() {
    wersjonujZasoby(this);
    wczytajZestaw(this);
    const b = import.meta.env.BASE_URL;
    this.load.spritesheet('bohater', `${b}mapa/bohater.png`, { frameWidth: 64, frameHeight: 64 });
    if (!this.textures.exists('bohaterka')) {
      this.load.spritesheet('bohaterka', `${b}mapa/bohaterka.png`, { frameWidth: 64, frameHeight: 64 });
    }
    // Sprite'y z armii, którą naprawdę mamy. Ekran bohatera potrafi być
    // pierwszą sceną po wczytaniu strony, więc nie zakładamy, że tekstury
    // wgrała już mapa.
    const armia = zywe(this.wczytajStan().bohater.armia).map((o) => o.sprite);
    for (const s of armia) {
      this.load.image(`p-${s}`, `${b}sprites/${s}.png`);
    }
    // Portrety do slotów paska armii i okna podziału (`PanelArmii`,
    // `src/visual/portrety.ts`) — także etapów ewolucji, jeśli są w armii.
    wczytajPortrety(this, { duze: true, okragle: true }, spriteDoPortretow(armia));
    const kto = this.kto;
    // Te same klucze, co w ekranie kampanii — jeśli tam już są, nie idą drugi raz.
    this.load.image(`bh-postac-${kto}`, `${b}bohater/postac-${kto}.png`);
    if (!this.textures.exists(`k-glowa-${kto}`)) this.load.image(`k-glowa-${kto}`, `${b}kampania/glowa-${kto}.png`);
    for (const n of ['zapal', 'opieka', 'buty', 'gwiazda']) {
      if (!this.textures.exists(`k-ikona-${n}`)) this.load.image(`k-ikona-${n}`, `${b}kampania/ikona-${n}.png`);
    }
    for (const a of ARTEFAKTY) this.load.image(`bh-artefakt-${a.id}`, `${b}bohater/artefakt-${a.id}.png`);
    for (const id of ['zwiad', 'tropiciel', 'napastnik', 'lucznictwo', 'pancerz', 'gospodarnosc', 'nauka', 'uzdrowiciel']) {
      this.load.image(`bh-umiejetnosc-${id}`, `${b}bohater/umiejetnosc-${id}.png`);
    }
  }

  private wczytajStan(): StanMapy {
    const zapisany = this.registry.get(KLUCZ_STANU) as StanMapy | undefined;
    if (zapisany) {
      zapisany.bohater.armia = znormalizuj(zapisany.bohater.armia);
      return zapisany;
    }
    const nowy = planszaPrzygody();
    this.registry.set(KLUCZ_STANU, nowy);
    return nowy;
  }

  /** Janek albo Ela — od tego zależy portret. Inne imiona dostają Janka. */
  private get kto(): 'janek' | 'ela' {
    const imie = (this.registry.get(KLUCZ_STANU) as StanMapy | undefined)?.bohater.imie ?? '';
    return /^el/i.test(imie.trim()) ? 'ela' : 'janek';
  }

  get oknoOtwarte() {
    return !!this.panel?.oknoOtwarte;
  }

  create() {
    this.stan = this.wczytajStan();
    this.dymek = null;
    this.dymekKlucz = '';
    this.dymekPrzypiety = false;
    this.strefyOpisu = new Set();
    this.gotowy = false;
    const numer = ++this.budowa;

    sledzScene(this);
    migawkaStanu('bohater', () => ({
      armia: this.stan.bohater.armia.map((o) => (o ? `${o.sprite}×${o.ile}` : '—')),
      artefakty: this.stan.bohater.artefakty,
      umiejetnosci: this.stan.bohater.umiejetnosci,
    }));

    tloWalki(this, Z.sky, BELKA_H);
    this.podepnijSterowanie();
    // Napisy mierzą się krojem — budujemy ekran, gdy kroje są: Nunito ekranu
    // i kroje zestawu (okno stworka z paska drużyny jest jeszcze na zestawie).
    void Promise.all([krojWalki(), krojeZestawu()]).then(() => {
      if (numer !== this.budowa || !this.sys.isActive()) return;
      this.rysujBelke();
      this.rysujLewePole();
      this.rysujPrawePole();
      this.rysujDol();
      this.gotowy = true;
    });
  }

  // ————————————————————————————————————————— belka

  /**
   * Belka-pokeball jak na ekranie walki: medalion z głową trenera, imię na
   * czerwieni, charakter kursywą na białym pasie, data w pigułce.
   */
  private rysujBelke() {
    const b = this.stan.bohater;
    const r = 24;
    medalionPokeball(this, 36, BELKA_H / 2 - 2, r).setDepth(Z.hud + 1);
    const glowa = this.add.image(36, BELKA_H / 2 - 2, `k-glowa-${this.kto}`).setDepth(Z.hud + 2);
    glowa.setScale(((r - 8) * 2) / Math.max(glowa.width, glowa.height));
    this.strefaOpisu({ x: 36 - r, y: BELKA_H / 2 - 2 - r, w: r * 2, h: r * 2 }, () => this.opisBohatera());
    const imie = this.add
      .text(70, 18, b.imie, stylWalki(22, '#ffffff'))
      .setOrigin(0, 0.5)
      .setShadow(0, 2, 'rgba(0,0,0,0.35)', 0, false, true)
      .setDepth(Z.hud + 1);
    const motto =
      this.kto === 'ela' ? 'Sprytna i uważna. Żaden ślad jej nie umknie!' : 'Odważny i szybki. Zawsze pierwszy do przygody!';
    this.add
      .text(imie.x + imie.width + 14, 19, `„${motto}"`, { ...stylWalki(14, '#ffffff', 800), fontStyle: 'italic 800' })
      .setOrigin(0, 0.5)
      .setShadow(0, 1, 'rgba(0,0,0,0.3)', 0, false, true)
      .setAlpha(0.92)
      .setDepth(Z.hud + 1);
    const d = data(this.stan.dzien);
    const napis = this.add.text(0, 0, `Tydzień ${d.tydzien}, dzień ${d.dzienTygodnia}`, stylWalki(14)).setDepth(Z.hud + 2);
    const pw = napis.width + 28;
    const px = OKNO_W - 14 - pw;
    const g = this.add.graphics().setDepth(Z.hud + 1);
    pigulka(g, px, 5, pw, 28, 'bialy');
    napis.setOrigin(0.5).setPosition(px + pw / 2, 18);
  }

  // ————————————————————————————————————————— lewe pole

  private rysujLewePole() {
    const { x, w } = LEWA;
    const y = POLA_Y;
    panelBialy(this.add.graphics().setDepth(Z.hud), x, y, w, POLA_H, 18);
    const b = this.stan.bohater;
    const p = postepPoziomu(b.doswiadczenie);
    const g = this.add.graphics().setDepth(Z.hud + 1);

    // --- nagłówek: poziom w pigułce, pasek doświadczenia jak pasek życia ---
    const x0 = x + 20;
    const x1 = x + w - 20;
    const poz = this.add.text(0, 0, `POZIOM ${p.poziom}`, stylWalki(16)).setDepth(Z.hud + 2);
    const pozW = poz.width + 28;
    pigulka(g, x0, y + 16, pozW, 32, 'niebieski');
    napisNaPigulce(poz.setOrigin(0.5).setPosition(x0 + pozW / 2, y + 31), 'niebieski');
    this.add
      .text(x0 + pozW + 12, y + 32, this.kto === 'ela' ? 'trenerka' : 'trener', stylWalki(18))
      .setOrigin(0, 0.5)
      .setDepth(Z.hud + 1);
    const gw = this.add.image(x1 - 14, y + 32, 'k-ikona-gwiazda').setDepth(Z.hud + 2);
    gw.setScale(30 / gw.width);
    const pasY = y + 60;
    const pasW = x1 - x0;
    g.fillStyle(TUSZ, 1);
    g.fillRoundedRect(x0, pasY, pasW, 14, 7);
    g.fillStyle(0xdfe4ea, 1);
    g.fillRoundedRect(x0 + 2.5, pasY + 2.5, pasW - 5, 9, 4.5);
    const ulamek = Phaser.Math.Clamp(p.wPoziomie / p.doAwansu, 0, 1);
    if (ulamek > 0.01) {
      g.fillStyle(ZOLTY, 1);
      g.fillRoundedRect(x0 + 2.5, pasY + 2.5, Math.max(9, (pasW - 5) * ulamek), 9, 4.5);
      g.fillStyle(0xffffff, 0.45);
      g.fillRoundedRect(x0 + 5, pasY + 3.5, Math.max(4, (pasW - 10) * ulamek), 2.5, 1.2);
    }
    this.add.text(x0, pasY + 20, `Doświadczenie ${b.doswiadczenie}`, stylWalki(13, TUSZ_CSS, 800)).setDepth(Z.hud + 1);
    this.add
      .text(x1, pasY + 20, `do awansu ${p.doAwansu - p.wPoziomie}`, stylWalki(13, SZARY, 800))
      .setOrigin(1, 0)
      .setDepth(Z.hud + 1);
    this.strefaOpisu({ x: x0, y: y + 12, w: pasW, h: 86 }, () => this.opisDoswiadczenia());

    // --- trzy statystyki trenera: białe karty z pigułką-nazwą ---
    const s = statystyki(b);
    const bonus = bonusPoziomu(poziom(b.doswiadczenie));
    const ruch = ruchNaDzis(this.stan);
    const staty: Array<{ klucz: string; nazwa: string; ikona: string; kolor: KolorPigulki; wartosc: number; dodatek: number }> = [
      { klucz: 'atak', nazwa: 'Zapał', ikona: 'k-ikona-zapal', kolor: 'pomaranczowy', wartosc: s.atak, dodatek: s.atak - b.atak },
      { klucz: 'obrona', nazwa: 'Opieka', ikona: 'k-ikona-opieka', kolor: 'czerwony', wartosc: s.obrona, dodatek: s.obrona - b.obrona },
      { klucz: 'ruch', nazwa: 'Ruch', ikona: 'k-ikona-buty', kolor: 'niebieski', wartosc: ruch, dodatek: ruch - b.ruchMax },
    ];
    const odst = 14;
    const kw = (pasW - odst * 2) / 3;
    const kh = 130;
    const sy = y + 112;
    staty.forEach((st, i) => {
      const kx = x0 + i * (kw + odst);
      panelBialy(g, kx, sy, kw, kh, 14, { obrys: 3, cien: 3, wypelnienie: 0xf4f8fd });
      const n = this.add.text(0, 0, st.nazwa.toUpperCase(), stylWalki(13)).setDepth(Z.hud + 2);
      const nw = n.width + 26;
      pigulka(g, kx + kw / 2 - nw / 2, sy - 12, nw, 26, st.kolor);
      napisNaPigulce(n.setOrigin(0.5).setPosition(kx + kw / 2, sy + 1), st.kolor);
      g.fillStyle(0xffffff, 1);
      g.fillCircle(kx + kw / 2, sy + 50, 30);
      const im = this.add.image(kx + kw / 2, sy + 50, st.ikona).setDepth(Z.hud + 2);
      im.setScale(52 / Math.max(im.width, im.height));
      const t = this.add
        .text(kx + kw / 2, sy + 100, String(st.wartosc), stylWalki(26))
        .setOrigin(0.5)
        .setDepth(Z.hud + 2);
      if (st.dodatek > 0) {
        this.add
          .text(t.x + t.width / 2 + 5, t.y + 3, `+${st.dodatek}`, stylWalki(14, ZIELONY))
          .setOrigin(0, 0.5)
          .setDepth(Z.hud + 2);
      }
      this.strefaOpisu({ x: kx, y: sy - 12, w: kw, h: kh + 12 }, () => this.opisStatystyki(st.klucz, bonus));
    });

    // Co zapał i opieka robią W BITWIE — wprost, liczbą (ten sam wzór co `battle.ts`).
    const zysk = Math.round(Math.min(ATAK_BOHATERA_MAKS, ATAK_BOHATERA_ZA_PUNKT * Math.max(0, s.atak)) * 100);
    const oslona = Math.round(Math.min(OBRONA_BOHATERA_MAKS, OBRONA_BOHATERA_ZA_PUNKT * Math.max(0, s.obrona)) * 100);
    const wb = this.add
      .text(0, 0, `W bitwie: +${zysk}% obrażeń, −${oslona}% otrzymywanych`, stylWalki(13, TUSZ_CSS, 800))
      .setDepth(Z.hud + 2);
    const wbW = wb.width + 30;
    const wbY = sy + kh + 14;
    pigulka(g, x + w / 2 - wbW / 2, wbY, wbW, 26, 'zolty', { cien: false });
    wb.setOrigin(0.5).setPosition(x + w / 2, wbY + 12);

    // --- umiejętności: 2 × 2 karty ---
    const mam = posiadane(b);
    const uy = wbY + 40;
    this.add.text(x0, uy, 'Umiejętności', stylWalki(17)).setDepth(Z.hud + 1);
    this.add
      .text(x1, uy + 3, `${mam.length} z ${MAKS_UMIEJETNOSCI} miejsc`, stylWalki(13, SZARY, 800))
      .setOrigin(1, 0)
      .setDepth(Z.hud + 1);
    const komW = (pasW - odst) / 2;
    const komH = UM_BOK + 20;
    for (let i = 0; i < MAKS_UMIEJETNOSCI; i++) {
      const kx = x0 + (i % 2) * (komW + odst);
      const ky = uy + 28 + Math.floor(i / 2) * (komH + 10);
      this.rysujUmiejetnosc(kx, ky, komW, komH, mam[i]);
    }
  }

  /** Jedna karta umiejętności: ikona w kółku, poziom kropkami, nazwa, wartość. */
  private rysujUmiejetnosc(
    x: number,
    y: number,
    w: number,
    h: number,
    wpis: { u: Umiejetnosc; poziom: PoziomUmiejetnosci } | undefined
  ) {
    const g = this.add.graphics().setDepth(Z.hud + 1);
    const cx = x + 12 + UM_BOK / 2;
    const cy = y + h / 2;
    if (wpis) {
      panelBialy(g, x, y, w, h, 14, { obrys: 3, cien: 3 });
      g.fillStyle(TUSZ, 1);
      g.fillCircle(cx, cy - 1, UM_BOK / 2);
      g.fillStyle(0xeaf4ff, 1);
      g.fillCircle(cx, cy - 1, UM_BOK / 2 - 3);
      const im = this.add.image(cx, cy - 1, `bh-umiejetnosc-${wpis.u.id}`).setDepth(Z.hud + 3);
      im.setScale((UM_BOK - 12) / Math.max(im.width, im.height));
      const tx = x + UM_BOK + 24;
      const nazwaPoziomu = POZIOMY[wpis.poziom - 1];
      this.add
        .text(tx, y + 10, nazwaPoziomu[0].toUpperCase() + nazwaPoziomu.slice(1), stylWalki(12, SZARY, 800))
        .setDepth(Z.hud + 2);
      this.add.text(tx, y + 26, wpis.u.nazwa, stylWalki(16)).setDepth(Z.hud + 2);
      this.add.text(tx, y + 47, opisWartosci(wpis.u, wpis.poziom), stylWalki(13, ZIELONY, 800)).setDepth(Z.hud + 2);
      // Trzy pokeballe poziomu — ile z trzech, bez czytania.
      for (let k = 0; k < 3; k++) pokeball(g, x + w - 20 - (2 - k) * 21, y + 19, 8.5, k >= wpis.poziom);
    } else {
      g.fillStyle(0xb9c0c9, 1);
      g.fillRoundedRect(x, y, w, h, 14);
      g.fillStyle(0xe6eaf0, 1);
      g.fillRoundedRect(x + 2, y + 2, w - 4, h - 4, 12);
      g.fillStyle(0xffffff, 0.7);
      g.fillCircle(cx, cy, UM_BOK / 2 - 4);
      this.add
        .text(x + UM_BOK + 24, cy, 'Wolne miejsce', stylWalki(14, '#8b93a0', 800))
        .setOrigin(0, 0.5)
        .setDepth(Z.hud + 2);
    }
    this.strefaOpisu({ x, y, w, h }, () => this.opisUmiejetnosci(wpis));
  }

  // ————————————————————————————————————————— prawe pole: lalka z artefaktami

  private rysujPrawePole() {
    const { x, w } = PRAWA;
    const y = POLA_Y;
    const L = LALKA;
    const g = this.add.graphics().setDepth(Z.hud);
    panelBialy(g, x, y, w, POLA_H, 18);
    // Niebo za postacią: błękit z jaśniejszym środkiem, jak tło portretu w grach.
    g.fillStyle(0xcfe6fb, 1);
    g.fillRoundedRect(L.x, L.y, L.w, L.h, 12);
    for (let i = 8; i >= 1; i--) {
      g.fillStyle(0xffffff, 0.07);
      g.fillEllipse(POSTAC_CX, POSTAC_Y + POSTAC_H * 0.42, 44 * i, 56 * i);
    }
    g.fillStyle(0x9fcf8a, 1);
    g.fillEllipse(POSTAC_CX, POSTAC_Y + POSTAC_H - 4, 230, 34);
    g.fillStyle(0x6fae62, 1);
    g.fillEllipse(POSTAC_CX, POSTAC_Y + POSTAC_H - 2, 180, 20);
    const b = this.stan.bohater;

    const postac = this.add.image(POSTAC_CX, POSTAC_Y, `bh-postac-${this.kto}`).setOrigin(0.5, 0).setDepth(Z.hud + 2);
    postac.setScale(POSTAC_H / postac.height);
    const pw = postac.displayWidth;
    const px = POSTAC_CX - pw / 2;
    this.strefaOpisu({ x: px + pw * 0.3, y: POSTAC_Y + POSTAC_H * 0.12, w: pw * 0.4, h: POSTAC_H * 0.16 }, () => this.opisBohatera());

    // Gniazda na postaci.
    const misja = ARTEFAKTY.find((a) => a.klasa === 'misja' && b.artefakty.includes(a.id));
    for (const gn of GNIAZDA_LALKI) {
      const { fx, fy } = (this.kto === 'ela' && gn.ela) || gn;
      const cx = Phaser.Math.Clamp(px + pw * fx, L.x + ART_BOK / 2 + 8, L.x + L.w - ART_BOK / 2 - 8);
      const cy = POSTAC_Y + POSTAC_H * fy;
      const a = gn.id ? artefaktPoId(gn.id) : misja;
      this.rysujArtefakt(cx - ART_BOK / 2, cy - ART_BOK / 2, ART_BOK, a ?? null, !!a && b.artefakty.includes(a.id), gn.czesc);
    }

    // Pod stopami: ile zebrano i co to razem daje.
    const zebrane = b.artefakty.filter((id) => ARTEFAKTY_LOSOWE.some((a) => a.id === id));
    const suma = { atak: 0, obrona: 0, ruch: 0 };
    for (const id of b.artefakty) {
      const a = artefaktPoId(id);
      if (!a) continue;
      suma.atak += a.atak ?? 0;
      suma.obrona += a.obrona ?? 0;
      suma.ruch += a.ruch ?? 0;
    }
    const co = [
      suma.atak ? `+${suma.atak} zapału` : '',
      suma.obrona ? `+${suma.obrona} opieki` : '',
      suma.ruch ? `+${suma.ruch} ruchu` : '',
    ].filter(Boolean);
    const dy = L.y + L.h - (co.length ? 44 : 26);
    const n = this.add.text(0, 0, `ARTEFAKTY ${zebrane.length} Z ${ARTEFAKTY_LOSOWE.length}`, stylWalki(13)).setDepth(Z.hud + 4);
    const nw = n.width + 26;
    const pg = this.add.graphics().setDepth(Z.hud + 3);
    pigulka(pg, L.x + L.w / 2 - nw / 2, dy - 13, nw, 26, 'bialy');
    n.setOrigin(0.5).setPosition(L.x + L.w / 2, dy - 1);
    if (co.length) {
      this.add
        .text(L.x + L.w / 2, dy + 26, co.join(' · '), stylWalki(13, ZIELONY, 900))
        .setOrigin(0.5)
        .setDepth(Z.hud + 3);
    }
  }

  /**
   * Gniazdo lalki. Noszony artefakt: biała płytka z obrysem tuszem. Brakujący:
   * półprzezroczysta płytka z cieniem ikony — widać, co jeszcze jest do
   * zebrania, a postać pod spodem prześwituje.
   */
  private rysujArtefakt(x: number, y: number, bok: number, a: Artefakt | null, ma: boolean, czesc?: string) {
    const g = this.add.graphics().setDepth(Z.hud + 3);
    if (ma) panelBialy(g, x, y, bok, bok, 10, { obrys: 3, cien: 3 });
    else {
      // Puste gniazdo: jasna płytka z przerywanym obrysem — wyraźnie „tu coś
      // brakuje", a nie mgła na postaci.
      g.fillStyle(0xffffff, 0.82);
      g.fillRoundedRect(x, y, bok, bok, 10);
      g.lineStyle(2.5, TUSZ, 0.55);
      const r = 10;
      const krok = 7;
      for (let p = x + r; p < x + bok - r; p += krok) {
        g.lineBetween(p, y, Math.min(p + 4, x + bok - r), y);
        g.lineBetween(p, y + bok, Math.min(p + 4, x + bok - r), y + bok);
      }
      for (let p = y + r; p < y + bok - r; p += krok) {
        g.lineBetween(x, p, x, Math.min(p + 4, y + bok - r));
        g.lineBetween(x + bok, p, x + bok, Math.min(p + 4, y + bok - r));
      }
      g.beginPath();
      g.arc(x + r, y + r, r, Math.PI, Math.PI * 1.5);
      g.strokePath();
      g.beginPath();
      g.arc(x + bok - r, y + r, r, Math.PI * 1.5, Math.PI * 2);
      g.strokePath();
      g.beginPath();
      g.arc(x + bok - r, y + bok - r, r, 0, Math.PI * 0.5);
      g.strokePath();
      g.beginPath();
      g.arc(x + r, y + bok - r, r, Math.PI * 0.5, Math.PI);
      g.strokePath();
    }
    if (a) {
      const im = this.add.image(x + bok / 2, y + bok / 2 - (ma ? 1 : 0), `bh-artefakt-${a.id}`).setDepth(Z.hud + 5);
      im.setScale((bok - (ma ? 10 : 16)) / Math.max(im.width, im.height));
      if (!ma) im.setTint(0x8b93a0).setAlpha(0.5);
    }
    this.strefaOpisu({ x, y, w: bok, h: bok }, () => (a ? this.opisArtefaktu(a, ma, czesc) : this.opisWolnegoGniazda(czesc)));
  }

  // ————————————————————————————————————————— dół: drużyna, status, wyjście

  private rysujDol() {
    this.panel = new PanelArmii(this, {
      glebia: Z.hud + 1,
      styl: 'walka',
      powiedz: (t) => this.powiedz(t),
      poZmianie: (opis) => {
        zapisz('armia', `bohater: ${opis}`);
        this.registry.set(KLUCZ_STANU, this.stan);
        this.odswiezArmie();
      },
    });

    // --- pas drużyny: biały panel, figurka z mapy w pierwszym slocie, 7 slotów ---
    const g = this.add.graphics().setDepth(Z.hud);
    panelBialy(g, BLOK_X, BLOK_Y, BLOK_W, BLOK_H, 18);
    panelBialy(g, HERB_X, RZAD_Y, SLOT, SLOT, 12, { obrys: 3, cien: 3, wypelnienie: 0xcfe6fb });
    const figurka = this.kto === 'ela' && this.textures.exists('bohaterka') ? 'bohaterka' : 'bohater';
    if (this.textures.exists(figurka)) {
      const f = this.add.image(HERB_X + SLOT / 2, RZAD_Y + SLOT / 2 - 1, figurka, 0).setDepth(Z.hud + 3);
      f.setScale((SLOT - 8) / f.height);
    }
    const tag = this.add.text(0, 0, 'DRUŻYNA', stylWalki(11)).setDepth(Z.hud + 4);
    const tw = tag.width + 16;
    const tg = this.add.graphics().setDepth(Z.hud + 3);
    pigulka(tg, BLOK_X + 26, BLOK_Y - 10, tw, 20, 'niebieski', { r: 10, cien: false });
    napisNaPigulce(tag.setOrigin(0.5).setPosition(BLOK_X + 26 + tw / 2, BLOK_Y - 1), 'niebieski');
    this.strefaOpisu({ x: HERB_X, y: RZAD_Y, w: SLOT, h: SLOT }, () => this.opisArmii());
    this.panel.dodajPasek({
      x: RZAD_X,
      y: RZAD_Y,
      slotW: SLOT,
      slotH: SLOT,
      odstep: SLOT_ODSTEP,
      armia: () => this.stan.bohater.armia,
      chroniona: true,
      gdzie: 'u bohatera',
      dokad: 'do bohatera',
    });

    // --- linia statusu: szare okienko jak okienko dialogu w walce ---
    g.fillStyle(TUSZ, 1);
    g.fillRoundedRect(STATUS_X, STATUS_Y, STATUS_W, STATUS_H, 10);
    g.fillStyle(0xf4f6f9, 1);
    g.fillRoundedRect(STATUS_X + 2, STATUS_Y + 2, STATUS_W - 4, STATUS_H - 4, 8);
    this.komunikat = this.add
      .text(STATUS_X + 9, STATUS_Y + STATUS_H / 2, '', { ...stylWalki(13, TUSZ_CSS, 800), lineSpacing: -3 })
      .setOrigin(0, 0.5)
      .setDepth(Z.hud + 2)
      .setWordWrapWidth(STATUS_W - 18);

    // --- wyjście: czerwona pigułka — jedyny „następny krok" ---
    const doMiasta = this.registry.get(KLUCZ_POWROTU) === 'zamek';
    przyciskWalki(this, {
      x: STATUS_X + STATUS_W / 2,
      y: PRZYCISKI_Y,
      w: STATUS_W,
      h: 34,
      kolor: 'czerwony',
      rozmiar: 16,
      depth: Z.hud + 2,
      onClick: () => this.zamknij(),
    }).setLabel(doMiasta ? 'Do miasta' : 'Na mapę');

    this.odswiezArmie();
    this.powiedz();
  }

  private odswiezArmie() {
    this.panel.odswiez();
    if (!this.dymekPrzypiety) this.powiedz();
  }

  /** Stan armii jednym zdaniem — domyślna treść linii statusu. */
  private stanArmii() {
    const a = this.stan.bohater.armia;
    const ile = zywe(a).length;
    const omdlale = zywe(a).filter((o) => o.omdlaly).length;
    return (
      `${this.stan.bohater.imie} ma w drużynie ${ile} ${ile === 1 ? 'stworka' : 'stworków'}. Do walki staje dwójka — przed bitwą wybierasz którą.` +
      (omdlale ? ` Zemdlone: ${omdlale} (obudzi je miasto).` : '')
    );
  }

  /** Linia statusu: najpierw 13 px, a gdy się nie mieści — mniej (jak w mieście). */
  private powiedz(tekst?: string) {
    const k = this.komunikat;
    if (!k) return;
    k.setFontSize(13);
    k.setText(tekst ?? this.stanArmii());
    for (const rozmiar of [12, 11]) {
      if (k.height <= STATUS_H - 4) break;
      k.setFontSize(rozmiar);
    }
  }

  // ————————————————————————————————————————— dymki z opisem

  /**
   * Strefa z opisem: najechanie pokazuje dymek, klik (lewy albo prawy) go
   * przypina, drugi klik w to samo — zdejmuje. Na tablecie jest tylko klik.
   */
  private strefaOpisu(o: Obszar, opis: () => Opis) {
    const z = this.add
      .zone(o.x, o.y, o.w, o.h)
      .setOrigin(0)
      .setDepth(Z.hud + 5)
      .setInteractive({ useHandCursor: true });
    this.strefyOpisu.add(z);
    z.on('pointerover', () => {
      if (this.dymekPrzypiety || this.oknoOtwarte) return;
      const d = opis();
      this.pokazDymek(o, d);
      this.powiedz(`${d.tytul} — kliknij, żeby przypiąć opis.`);
    });
    z.on('pointerout', () => {
      if (this.dymekPrzypiety) return;
      this.schowajDymek();
      this.powiedz();
    });
    z.on('pointerdown', () => {
      if (this.oknoOtwarte) return;
      const d = opis();
      if (this.dymekPrzypiety && this.dymekKlucz === d.klucz) {
        this.schowajDymek();
        return;
      }
      this.pokazDymek(o, d);
      this.dymekPrzypiety = true;
      this.powiedz(`${d.tytul} — kliknij obok albo Escape, żeby zamknąć opis.`);
    });
  }

  private pokazDymek(o: Obszar, d: Opis) {
    this.schowajDymek();
    const W = 300;
    const pad = 14;
    const k = this.add.container(0, 0).setDepth(Z.overlay);
    const ikona = d.ikona ? 48 : 0;
    const tx = pad + (ikona ? ikona + 12 : 0);
    const tytul = this.add.text(tx, pad - 1, d.tytul, stylWalki(17)).setWordWrapWidth(W - tx - pad);
    let yy = tytul.y + tytul.height + 1;
    const podtytul = d.podtytul
      ? this.add
          .text(tx, yy, d.podtytul, { ...stylWalki(12, SZARY, 800), fontStyle: 'italic 800' })
          .setWordWrapWidth(W - tx - pad)
      : null;
    if (podtytul) yy += podtytul.height;
    yy = Math.max(yy, pad + ikona) + 8;
    const linia = this.add.graphics();
    linia.fillStyle(0xdfe4ea, 1);
    linia.fillRoundedRect(pad, yy, W - pad * 2, 3, 1.5);
    yy += 10;
    const tresc = this.add.text(pad, yy, d.tresc, { ...stylWalki(13, TUSZ_CSS, 700), lineSpacing: 2 }).setWordWrapWidth(W - pad * 2);
    const H = Math.ceil(yy + tresc.height + pad);
    const tlo = this.add.graphics();
    panelBialy(tlo, 0, 0, W, H, 14, { obrys: 3, cien: 5 });
    k.add(tlo);
    if (d.ikona) {
      const g = this.add.graphics();
      g.fillStyle(TUSZ, 1);
      g.fillCircle(pad + ikona / 2, pad + ikona / 2, ikona / 2);
      g.fillStyle(0xeaf4ff, 1);
      g.fillCircle(pad + ikona / 2, pad + ikona / 2, ikona / 2 - 3);
      k.add(g);
      const im = this.add.image(pad + ikona / 2, pad + ikona / 2, d.ikona);
      im.setScale((ikona - 12) / Math.max(im.width, im.height));
      k.add(im);
    }
    k.add([tytul, ...(podtytul ? [podtytul] : []), linia, tresc]);

    // Dymek staje obok elementu: po prawej, a gdy się nie mieści — po lewej;
    // w pionie wyrównany do jego góry, przycięty do ekranu.
    let dx = o.x + o.w + 16;
    if (dx + W > OKNO_W - 10) dx = o.x - W - 16;
    if (dx < 10) dx = Phaser.Math.Clamp(o.x + o.w / 2 - W / 2, 10, OKNO_W - W - 10);
    const dy = Phaser.Math.Clamp(o.y, BELKA_H + 6, OKNO_H - H - 14);
    k.setPosition(Math.round(dx), Math.round(dy));
    this.dymek = k;
    this.dymekKlucz = d.klucz;
  }

  private schowajDymek() {
    if (this.dymekPrzypiety) this.powiedz();
    this.dymek?.destroy();
    this.dymek = null;
    this.dymekKlucz = '';
    this.dymekPrzypiety = false;
  }

  private opisBohatera(): Opis {
    const b = this.stan.bohater;
    const p = postepPoziomu(b.doswiadczenie);
    const ela = this.kto === 'ela';
    return {
      klucz: 'bohater',
      tytul: b.imie,
      podtytul: `Poziom ${p.poziom} · ${ela ? 'trenerka' : 'trener'}`,
      tresc:
        (ela ? 'Sprytna i uważna. Żaden ślad jej nie umknie!' : 'Odważny i szybki. Zawsze pierwszy do przygody!') +
        `\n\nMa w drużynie ${zywe(b.armia).length} stworków. Nosi ${b.artefakty.length} ${b.artefakty.length === 1 ? 'artefakt' : 'artefaktów'} i zna ${posiadane(b).length} ${posiadane(b).length === 1 ? 'umiejętność' : 'umiejętności'}.`,
    };
  }

  private opisDoswiadczenia(): Opis {
    const b = this.stan.bohater;
    const p = postepPoziomu(b.doswiadczenie);
    const nauka = efekt(b, 'nauka');
    return {
      klucz: 'doswiadczenie',
      tytul: 'Doświadczenie',
      podtytul: `${b.doswiadczenie} punktów · poziom ${p.poziom}`,
      ikona: 'k-ikona-gwiazda',
      tresc:
        `Do poziomu ${p.poziom + 1} brakuje ${p.doAwansu - p.wPoziomie} punktów.\n` +
        'Doświadczenie dają wygrane bitwy, skrzynie i drzewa wiedzy. Awans podnosi zapał albo opiekę i pozwala wybrać umiejętność.' +
        (nauka ? `\nNauka: +${Math.round(nauka * 100)}% doświadczenia.` : ''),
    };
  }

  private opisStatystyki(klucz: string, bonus: ReturnType<typeof bonusPoziomu>): Opis {
    const b = this.stan.bohater;
    const s = statystyki(b);
    const zArtefaktow = (pole: 'atak' | 'obrona' | 'ruch') =>
      b.artefakty
        .map((id) => artefaktPoId(id))
        .filter((a): a is Artefakt => !!a && !!a[pole])
        .map((a) => `${a.nazwa} +${a[pole]}`);
    if (klucz === 'atak' || klucz === 'obrona') {
      const atak = klucz === 'atak';
      const wartosc = atak ? s.atak : s.obrona;
      const proc = atak
        ? Math.round(Math.min(ATAK_BOHATERA_MAKS, ATAK_BOHATERA_ZA_PUNKT * Math.max(0, wartosc)) * 100)
        : Math.round(Math.min(OBRONA_BOHATERA_MAKS, OBRONA_BOHATERA_ZA_PUNKT * Math.max(0, wartosc)) * 100);
      const arts = zArtefaktow(klucz);
      const lw = [
        `${b.imie}: ${atak ? b.atak : b.obrona}`,
        (atak ? bonus.atak : bonus.obrona) ? `awanse: +${atak ? bonus.atak : bonus.obrona}` : '',
        ...arts,
      ].filter(Boolean);
      return {
        klucz,
        tytul: atak ? 'Zapał' : 'Opieka',
        podtytul: `razem ${wartosc}`,
        ikona: atak ? 'k-ikona-zapal' : 'k-ikona-opieka',
        tresc:
          (atak
            ? `Każdy twój stworek zadaje w bitwie o ${proc}% więcej obrażeń.`
            : `Każdy twój stworek dostaje w bitwie o ${proc}% mniej obrażeń.`) +
          `\n\nSkąd to masz:\n${lw.join('\n')}`,
      };
    }
    const dzis = ruchNaDzis(this.stan);
    const zwiad = efekt(b, 'ruch');
    const ranczo = b.bonusRuchuDo !== undefined && this.stan.dzien <= b.bonusRuchuDo;
    const lw = [
      `${b.imie}: ${b.ruchMax}`,
      bonus.ruch ? `awanse: +${bonus.ruch}` : '',
      ...zArtefaktow('ruch'),
      ranczo ? `ranczo: +${STAJNIA_BONUS}` : '',
      zwiad ? `Zwiad: +${Math.round(zwiad * 100)}%` : '',
    ].filter(Boolean);
    return {
      klucz,
      tytul: 'Ruch',
      podtytul: `${dzis} punktów na dzień`,
      ikona: 'k-ikona-buty',
      tresc: `Tyle punktów ruchu bohater dostaje co rano. Dziś zostało ${Math.round(b.ruch)}.\n\nSkąd to masz:\n${lw.join('\n')}`,
    };
  }

  private opisUmiejetnosci(wpis: { u: Umiejetnosc; poziom: PoziomUmiejetnosci } | undefined): Opis {
    if (!wpis) {
      return {
        klucz: `umiejetnosc-wolna`,
        tytul: 'Wolne miejsce',
        tresc:
          `Przy awansie na nowy poziom wybierasz jedną z dwóch umiejętności — nowa trafi tutaj. Bohater zna najwyżej ${MAKS_UMIEJETNOSCI} umiejętności, a każdą można podnieść do poziomu mistrzowskiego.`,
      };
    }
    const { u, poziom: p } = wpis;
    const drabina = POZIOMY.map(
      (n, i) => `${n}: ${opisWartosci(u, (i + 1) as PoziomUmiejetnosci)}${i + 1 === p ? '  ← masz' : ''}`
    );
    return {
      klucz: `umiejetnosc-${u.id}`,
      tytul: u.nazwa,
      podtytul: `${POZIOMY[p - 1]} (poziom ${p} z 3)`,
      ikona: `bh-umiejetnosc-${u.id}`,
      tresc:
        `${u.opis}\nTeraz: ${opisWartosci(u, p)}.\n\n${drabina.join('\n')}` +
        (p < 3 ? '\n\nKolejny poziom możesz wybrać przy awansie.' : '\n\nTo najwyższy poziom.'),
    };
  }

  private opisArmii(): Opis {
    const b = this.stan.bohater;
    return {
      klucz: 'armia',
      tytul: 'Drużyna',
      podtytul: this.stanArmii(),
      tresc:
        'Kliknij stworka, potem inny slot — przeniesiesz go albo zamienisz miejscami. ' +
        'Możesz też przeciągnąć. Liczba pod portretem to poziom stworka. ' +
        'Do walki staje dwójka: przed bitwą wybierasz, które stworki — domyślnie dwa pierwsze sprawne (mają złoty róg). ' +
        `Prawy klik albo drugi klik: opis stworka.\n\n${b.imie} nie może zostać bez ani jednego stworka.`,
    };
  }

  private opisWolnegoGniazda(czesc?: string): Opis {
    return {
      klucz: `gniazdo-${czesc ?? ''}`,
      tytul: czesc ? czesc[0].toUpperCase() + czesc.slice(1) : 'Wolne gniazdo',
      podtytul: 'wolne gniazdo',
      tresc:
        czesc === 'szyja'
          ? 'Tu bohater nosi amulet — na przykład Księżycowy Kamień, gdy misja każe go odnaleźć i zanieść.'
          : 'Artefakty leżą na mapie i wypadają ze skrzyń.',
    };
  }

  private opisArtefaktu(a: Artefakt, ma: boolean, czesc?: string): Opis {
    const co = [
      a.atak ? `+${a.atak} do zapału` : '',
      a.obrona ? `+${a.obrona} do opieki` : '',
      a.ruch ? `+${a.ruch} punktów ruchu na dzień` : '',
    ].filter(Boolean);
    const klasa = { drobny: 'artefakt drobny', znaczny: 'artefakt znaczny', relikt: 'relikt', misja: 'cel misji' }[a.klasa];
    return {
      klucz: `artefakt-${a.id}`,
      tytul: a.nazwa,
      podtytul: `${klasa}${czesc ? ` · ${czesc}` : ''} · ${ma ? 'noszony' : 'jeszcze go nie masz'}`,
      ikona: `bh-artefakt-${a.id}`,
      tresc: (
        co.join('\n') +
        (a.klasa === 'misja'
          ? '\n\nCel misji — zanieś go tam, dokąd każe misja.'
          : ma
            ? '\n\nDziała, dopóki bohater go nosi.'
            : '\n\nSzukaj go na mapie i w skrzyniach — zacznie działać, gdy tylko go podniesiesz.')
      ).trim(),
    };
  }

  // ————————————————————————————————————————— sterowanie i wyjście

  private podepnijSterowanie() {
    // Klik w puste miejsce zdejmuje przypięty dymek.
    this.input.on('pointerdown', (_p: Phaser.Input.Pointer, nad: Phaser.GameObjects.GameObject[]) => {
      if (!this.dymek) return;
      if (nad.some((o) => this.strefyOpisu.has(o))) return;
      this.schowajDymek();
    });
    // 'keydown', a nie 'keydown-ESC': ten słuchacz jest zapisany PRZED
    // słuchaczami okien panelu (stworek, podział), więc widzi, że okno jest
    // otwarte, i nie zamyka ekranu razem z oknem.
    this.input.keyboard?.on('keydown', (e: KeyboardEvent) => {
      if (e.key !== 'Escape' || !this.gotowy || this.oknoOtwarte) return;
      if (this.dymek) {
        this.schowajDymek();
        this.powiedz();
        return;
      }
      this.zamknij();
    });
  }

  private zamknij() {
    this.registry.set(KLUCZ_STANU, this.stan);
    // Z miasta (klik w portret bohatera odwiedzającego) wraca się do miasta.
    const powrot = (this.registry.get(KLUCZ_POWROTU) as string | undefined) ?? 'adventure';
    this.registry.remove(KLUCZ_POWROTU);
    this.scene.start(powrot);
  }
}
