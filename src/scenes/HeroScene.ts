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
 *  - prawe pole: portret w grubej złotej ramie, a wokół niego gniazda
 *    artefaktów — jak lalka z HoMM3, ale bez przypisania do części ciała
 *    (u nas artefakt działa samym posiadaniem; lalka z hełmem i butami
 *    obiecywałaby zasadę, której nie ma). Każdy artefakt ma swoje stałe
 *    gniazdo: brakujące widać jako cień — zbieranie ma widoczny koniec;
 *  - dół: `PanelArmii` (klik-klik, przeciąganie, Shift = okno podziału,
 *    Ctrl = jeden stworek, drugi klik / prawy klik = okno stworka), obok
 *    komunikat z tabliczką „Podziel" i wyjście — jak w mieście.
 *
 * Najechanie na umiejętność, artefakt, statystykę albo doświadczenie
 * pokazuje dymek z opisem (pergamin w złotej ramie); klik albo prawy klik
 * przypina go — na tablecie nie ma najechania.
 */

import Phaser from 'phaser';
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
import { lacznie, znormalizuj, zywe } from '../data/armia';
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
import { C, Z } from '../visual/theme';
import { PanelArmii } from '../visual/panelArmii';
import { GORA, MARGINES, OKNO_H, OKNO_W } from '../visual/uklad';
import { wersjonujZasoby } from '../visual/zasoby';
import {
  BARWA,
  KROJ,
  Przycisk,
  krojeZestawu,
  medalion,
  napisNaDrewnie,
  ozdobnik,
  panelPergaminu,
  ramaZlota,
  stylAtramentu,
  stylEtykiety,
  tloDrewna,
  wczytajZestaw,
} from '../visual/zestaw';
import { migawkaStanu, sledzScene, zapisz } from '../dev/dziennik';

const KLUCZ_STANU = 'stan-mapy';
/** Skąd przyszliśmy: 'zamek' (portret w mieście) albo brak — mapa przygody. */
const KLUCZ_POWROTU = 'powrot-z-bohatera';

/*
 * Geometria. Podział na kolumny jest ten sam co w mieście: lewa kończy się
 * na x = 568, prawa zaczyna na 586 — pasek armii i komunikat stoją dokładnie
 * tam, gdzie w mieście rząd bohatera i komunikat z „Podziel".
 */
const POLA_Y = GORA + 12;
const POLA_H = 510;
const LEWA = { x: MARGINES + 5, w: 568 - (MARGINES + 5) };
const PRAWA = { x: 586, w: OKNO_W - MARGINES - 5 - 586 };
/** Pasek armii i prawa kolumna dołu. */
const DOL_Y = POLA_Y + POLA_H + 18;
const RZAD_H = 76;
const RZAD_Y = DOL_Y + 8;
const SLOT = 58;
const SLOT_ODSTEP = 4;
const KOMUNIKAT_H = 54;
const WYJSCIE_Y = OKNO_H - 26;

/** Portret w prawym polu i gniazda artefaktów po jego bokach (po cztery). */
const PORTRET_W = 176;
const PORTRET_H = Math.round(PORTRET_W * (892 / 620));
const PORTRET_X = PRAWA.x + PRAWA.w / 2;
const PORTRET_Y = POLA_Y + 60;
const ART_BOK = 52;
/** Kolejność gniazd: lewa kolumna z góry na dół, potem prawa. */
const GNIAZDA_ARTEFAKTOW = ['opaska', 'pazur', 'mistrz', 'buty', 'kamizelka', 'tarcza', 'skrzydla', 'rower'];

/** Gniazdo umiejętności drugorzędnej. */
const UM_BOK = 56;

const BARWA_GNIAZDA = 0x2a1a0c;

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
  private podsumowanieArmii!: Phaser.GameObjects.Text;
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
    // Sprite'y z armii, którą naprawdę mamy. Ekran bohatera potrafi być
    // pierwszą sceną po wczytaniu strony, więc nie zakładamy, że tekstury
    // wgrała już mapa.
    for (const o of zywe(this.wczytajStan().bohater.armia)) {
      this.load.image(`p-${o.sprite}`, `${b}sprites/${o.sprite}.png`);
    }
    const kto = this.kto;
    // Te same klucze, co w ekranie kampanii — jeśli tam już są, nie idą drugi raz.
    if (!this.textures.exists(`k-portret-${kto}`)) this.load.image(`k-portret-${kto}`, `${b}kampania/portret-${kto}.jpg`);
    if (!this.textures.exists(`k-glowa-${kto}`)) this.load.image(`k-glowa-${kto}`, `${b}kampania/glowa-${kto}.png`);
    for (const n of ['miecz', 'tarcza', 'buty', 'gwiazda']) {
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

    tloDrewna(this).setDepth(Z.sky);
    this.podepnijSterowanie();
    // Napisy zestawu mierzą się krojem — budujemy ekran, gdy kroje są
    // (zwykle od razu: wczytała je już mapa albo miasto).
    void krojeZestawu().then(() => {
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
   * Belka jak w mieście: imię tam, gdzie miasto ma nazwę, obok kursywą
   * charakter bohatera (w mieście motto), po prawej data.
   */
  private rysujBelke() {
    const b = this.stan.bohater;
    const imie = napisNaDrewnie(this, MARGINES + 6, 20, b.imie, 19).setOrigin(0, 0.5).setDepth(Z.hud + 1);
    const motto =
      this.kto === 'ela' ? 'Sprytna i uważna. Żaden ślad jej nie umknie!' : 'Odważny i szybki. Zawsze pierwszy do przygody!';
    this.add
      .text(imie.x + imie.width + 14, 21, `„${motto}"`, {
        fontFamily: KROJ.kursywa,
        fontSize: '14px',
        color: BARWA.krem,
        stroke: BARWA.braz,
        strokeThickness: 3,
      })
      .setOrigin(0, 0.5)
      .setAlpha(0.82)
      .setDepth(Z.hud + 1);
    const d = data(this.stan.dzien);
    napisNaDrewnie(this, OKNO_W - MARGINES - 6, 20, `Tydzień ${d.tydzien}, dzień ${d.dzienTygodnia}`, 15)
      .setOrigin(1, 0.5)
      .setDepth(Z.hud + 1);
  }

  // ————————————————————————————————————————— lewe pole

  private rysujLewePole() {
    const { x, w } = LEWA;
    const y = POLA_Y;
    panelPergaminu(this, x, y, w, POLA_H).forEach((c) => c.setDepth(Z.hud));
    const b = this.stan.bohater;
    const p = postepPoziomu(b.doswiadczenie);

    // --- nagłówek: głowa w medalionie, poziom, doświadczenie ---
    const r = 40;
    const mx = x + 18 + r;
    const my = y + 18 + r;
    medalion(this, mx, my, r, BARWA.papierCiemny).setDepth(Z.hud + 1);
    const glowa = this.add.image(mx, my, `k-glowa-${this.kto}`).setDepth(Z.hud + 2);
    glowa.setScale((r * 2 - 14) / Math.max(glowa.width, glowa.height));
    // Oczko z numerem poziomu na obręczy medalionu.
    const ox = mx + r * 0.72;
    const oy = my + r * 0.72;
    medalion(this, ox, oy, 15, 0x5a2a12).setDepth(Z.hud + 3);
    this.add
      .text(ox, oy, String(p.poziom), stylEtykiety(15, BARWA.krem))
      .setOrigin(0.5)
      .setDepth(Z.hud + 4);
    this.strefaOpisu({ x: mx - r, y: my - r, w: r * 2, h: r * 2 }, () => this.opisBohatera());

    const tx = mx + r + 20;
    this.add
      .text(tx, y + 20, `Poziom ${p.poziom} · ${this.kto === 'ela' ? 'trenerka' : 'trener'}`, stylEtykiety(22, BARWA.atrament))
      .setDepth(Z.hud + 1);
    // Pasek doświadczenia z gwiazdą — ta sama gwiazda, którą kampania znaczy
    // doświadczenie w nagrodach.
    const pasX = tx + 20;
    const pasW = x + w - 22 - pasX;
    const pasY = y + 62;
    const gw = this.add.image(tx + 4, pasY + 5, 'k-ikona-gwiazda').setDepth(Z.hud + 2);
    gw.setScale(28 / gw.width);
    const g = this.add.graphics().setDepth(Z.hud + 1);
    g.fillStyle(0x3a2410, 1);
    g.fillRoundedRect(pasX, pasY, pasW, 11, 5);
    const ulamek = Phaser.Math.Clamp(p.wPoziomie / p.doAwansu, 0, 1);
    if (ulamek > 0.01) {
      g.fillStyle(C.gold, 1);
      g.fillRoundedRect(pasX + 1.5, pasY + 1.5, Math.max(8, (pasW - 3) * ulamek), 8, 4);
      g.fillStyle(0xffffff, 0.35);
      g.fillRoundedRect(pasX + 3, pasY + 2.5, Math.max(4, (pasW - 6) * ulamek), 3, 1.5);
    }
    g.lineStyle(1.5, BARWA.kreska, 0.9);
    g.strokeRoundedRect(pasX, pasY, pasW, 11, 5);
    this.add
      .text(pasX, pasY + 17, `Doświadczenie ${b.doswiadczenie}`, stylAtramentu(13))
      .setDepth(Z.hud + 1);
    this.add
      .text(pasX + pasW, pasY + 17, `do awansu ${p.doAwansu - p.wPoziomie}`, stylAtramentu(13, 'miekki'))
      .setOrigin(1, 0)
      .setDepth(Z.hud + 1);
    this.strefaOpisu({ x: tx - 12, y: pasY - 10, w: x + w - tx, h: 44 }, () => this.opisDoswiadczenia());

    ozdobnik(this, x + 20, y + 112, w - 40).setDepth(Z.hud + 1);

    // --- umiejętności pierwszorzędne ---
    const s = statystyki(b);
    const bonus = bonusPoziomu(poziom(b.doswiadczenie));
    const ruch = ruchNaDzis(this.stan);
    const staty: Array<{ klucz: string; nazwa: string; ikona: string; wartosc: number; dodatek: number }> = [
      { klucz: 'atak', nazwa: 'Atak', ikona: 'k-ikona-miecz', wartosc: s.atak, dodatek: s.atak - b.atak },
      { klucz: 'obrona', nazwa: 'Obrona', ikona: 'k-ikona-tarcza', wartosc: s.obrona, dodatek: s.obrona - b.obrona },
      { klucz: 'ruch', nazwa: 'Ruch', ikona: 'k-ikona-buty', wartosc: ruch, dodatek: ruch - b.ruchMax },
    ];
    const kol = (w - 40) / 3;
    const sy = y + 124;
    const sBok = 60;
    staty.forEach((st, i) => {
      const cx = x + 20 + kol * (i + 0.5);
      this.add.text(cx, sy, st.nazwa, stylEtykiety(15)).setOrigin(0.5, 0).setDepth(Z.hud + 1);
      this.gniazdo(cx - sBok / 2, sy + 24, sBok, true);
      const im = this.add.image(cx, sy + 24 + sBok / 2, st.ikona).setDepth(Z.hud + 3);
      im.setScale((sBok - 10) / Math.max(im.width, im.height));
      const t = this.add
        .text(cx, sy + 24 + sBok + 8, String(st.wartosc), stylEtykiety(22, BARWA.atrament))
        .setOrigin(0.5, 0)
        .setDepth(Z.hud + 1);
      if (st.dodatek > 0) {
        this.add
          .text(t.x + t.width / 2 + 5, t.y + 7, `+${st.dodatek}`, { ...stylAtramentu(13, 'zielony'), fontStyle: 'bold' })
          .setDepth(Z.hud + 1);
      }
      this.strefaOpisu({ x: cx - kol / 2 + 6, y: sy, w: kol - 12, h: sBok + 60 }, () => this.opisStatystyki(st.klucz, bonus));
    });

    // Co atak i obrona robią W BITWIE — wprost, liczbą (ten sam wzór co `battle.ts`).
    const zysk = Math.round(Math.min(ATAK_BOHATERA_MAKS, ATAK_BOHATERA_ZA_PUNKT * Math.max(0, s.atak)) * 100);
    const oslona = Math.round(Math.min(OBRONA_BOHATERA_MAKS, OBRONA_BOHATERA_ZA_PUNKT * Math.max(0, s.obrona)) * 100);
    this.add
      .text(x + w / 2, sy + 24 + sBok + 40, `W bitwie: +${zysk}% obrażeń, −${oslona}% otrzymywanych`, {
        ...stylAtramentu(13, 'zielony'),
        fontStyle: 'italic',
      })
      .setOrigin(0.5, 0)
      .setDepth(Z.hud + 1);

    ozdobnik(this, x + 20, y + 276, w - 40).setDepth(Z.hud + 1);

    // --- umiejętności drugorzędne: 2 × 2 gniazda ---
    const mam = posiadane(b);
    const uy = y + 286;
    this.add.text(x + 22, uy, 'Umiejętności', stylEtykiety(15)).setDepth(Z.hud + 1);
    this.add
      .text(x + w - 22, uy + 2, `${mam.length} z ${MAKS_UMIEJETNOSCI} miejsc`, stylAtramentu(13, 'miekki'))
      .setOrigin(1, 0)
      .setDepth(Z.hud + 1);
    const komW = (w - 44 - 16) / 2;
    const komH = UM_BOK + 20;
    for (let i = 0; i < MAKS_UMIEJETNOSCI; i++) {
      const kx = x + 22 + (i % 2) * (komW + 16);
      const ky = uy + 30 + Math.floor(i / 2) * (komH + 8);
      this.rysujUmiejetnosc(kx, ky, komW, komH, mam[i]);
    }
    this.add
      .text(
        x + w / 2,
        y + POLA_H - 18,
        mam.length < MAKS_UMIEJETNOSCI
          ? 'Nową umiejętność wybierasz przy awansie na kolejny poziom.'
          : 'Wszystkie miejsca zajęte — awans może już tylko ulepszać to, co masz.',
        { ...stylAtramentu(12, 'miekki'), fontFamily: KROJ.kursywa }
      )
      .setOrigin(0.5)
      .setDepth(Z.hud + 1);
  }

  /** Jedna komórka siatki umiejętności: gniazdo z ikoną, poziom, nazwa, wartość. */
  private rysujUmiejetnosc(
    x: number,
    y: number,
    w: number,
    h: number,
    wpis: { u: Umiejetnosc; poziom: PoziomUmiejetnosci } | undefined
  ) {
    // Tło komórki: ciemniejszy papier z kreską — jak slot armii.
    const g = this.add.graphics().setDepth(Z.hud + 1);
    g.fillStyle(0x8a5a2a, wpis ? 0.14 : 0.07);
    g.fillRoundedRect(x, y, w, h, 5);
    g.lineStyle(1.2, BARWA.kreska, wpis ? 0.55 : 0.35);
    g.strokeRoundedRect(x, y, w, h, 5);
    const gx = x + 10;
    const gy = y + (h - UM_BOK) / 2;
    this.gniazdo(gx, gy, UM_BOK, !!wpis);
    const tx = gx + UM_BOK + 14;
    if (wpis) {
      const im = this.add.image(gx + UM_BOK / 2, gy + UM_BOK / 2, `bh-umiejetnosc-${wpis.u.id}`).setDepth(Z.hud + 3);
      im.setScale((UM_BOK - 6) / Math.max(im.width, im.height));
      const nazwaPoziomu = POZIOMY[wpis.poziom - 1];
      this.add
        .text(tx, y + 11, nazwaPoziomu[0].toUpperCase() + nazwaPoziomu.slice(1), stylAtramentu(13, 'miekki'))
        .setDepth(Z.hud + 1);
      this.add.text(tx, y + 29, wpis.u.nazwa, stylEtykiety(16, BARWA.atrament)).setDepth(Z.hud + 1);
      this.add
        .text(tx, y + 51, opisWartosci(wpis.u, wpis.poziom), { ...stylAtramentu(13, 'zielony'), fontStyle: 'bold' })
        .setDepth(Z.hud + 1);
      // Trzy kropki poziomu — ile z trzech, bez czytania.
      const kg = this.add.graphics().setDepth(Z.hud + 1);
      for (let k = 0; k < 3; k++) {
        const kx = x + w - 16 - (2 - k) * 14;
        const ky = y + 18;
        kg.fillStyle(k < wpis.poziom ? C.gold : 0x8a5a2a, k < wpis.poziom ? 1 : 0.25);
        kg.fillCircle(kx, ky, 4.5);
        kg.lineStyle(1.2, k < wpis.poziom ? C.goldDeep : BARWA.kreska, 0.9);
        kg.strokeCircle(kx, ky, 4.5);
      }
    } else {
      this.add.text(tx, y + h / 2 - 20, 'Wolne miejsce', stylEtykiety(14, BARWA.atramentMiekki)).setAlpha(0.85).setDepth(Z.hud + 1);
      this.add
        .text(tx, y + h / 2 + 2, 'na umiejętność z awansu', { ...stylAtramentu(12, 'miekki'), fontFamily: KROJ.kursywa })
        .setAlpha(0.85)
        .setDepth(Z.hud + 1);
    }
    this.strefaOpisu({ x, y, w, h }, () => this.opisUmiejetnosci(wpis));
  }

  // ————————————————————————————————————————— prawe pole: portret i artefakty

  private rysujPrawePole() {
    const { x, w } = PRAWA;
    const y = POLA_Y;
    panelPergaminu(this, x, y, w, POLA_H).forEach((c) => c.setDepth(Z.hud));
    const b = this.stan.bohater;
    this.add.text(x + w / 2, y + 14, 'Artefakty', stylEtykiety(18)).setOrigin(0.5, 0).setDepth(Z.hud + 1);
    ozdobnik(this, x + 40, y + 44, w - 80).setDepth(Z.hud + 1);

    // Portret w grubej złotej ramie — jak obraz planszy i panoramy miasta.
    const px = PORTRET_X - PORTRET_W / 2;
    const portret = this.add.image(px, PORTRET_Y, `k-portret-${this.kto}`).setOrigin(0).setDepth(Z.hud + 1);
    portret.setDisplaySize(PORTRET_W, PORTRET_H);
    ramaZlota(this, px, PORTRET_Y, PORTRET_W, PORTRET_H, true).setDepth(Z.hud + 2);
    this.strefaOpisu({ x: px, y: PORTRET_Y, w: PORTRET_W, h: PORTRET_H }, () => this.opisBohatera());

    // Gniazda po bokach portretu, po cztery.
    const miejsce = (a: Artefakt) => {
      const i = GNIAZDA_ARTEFAKTOW.indexOf(a.id);
      return i < 0 ? 99 : i;
    };
    const kolejne = [...ARTEFAKTY_LOSOWE].sort((p, q) => miejsce(p) - miejsce(q));
    const odstepY = (PORTRET_H - 4 * ART_BOK) / 3;
    const lewaX = px - 13 - 14 - ART_BOK;
    const prawaX = px + PORTRET_W + 13 + 14;
    kolejne.slice(0, 8).forEach((a, i) => {
      const gx = i < 4 ? lewaX : prawaX;
      const gy = PORTRET_Y + (i % 4) * (ART_BOK + odstepY);
      this.rysujArtefakt(gx, gy, ART_BOK, a, b.artefakty.includes(a.id));
    });

    // Pod portretem: ile zebrano, co to razem daje, cel misji.
    const zebrane = b.artefakty.filter((id) => ARTEFAKTY_LOSOWE.some((a) => a.id === id));
    const dy = PORTRET_Y + PORTRET_H + 28;
    this.add
      .text(x + w / 2, dy, `Zebrane: ${zebrane.length} z ${ARTEFAKTY_LOSOWE.length}`, stylEtykiety(15, BARWA.atrament))
      .setOrigin(0.5, 0)
      .setDepth(Z.hud + 1);
    const suma = { atak: 0, obrona: 0, ruch: 0 };
    for (const id of b.artefakty) {
      const a = artefaktPoId(id);
      if (!a) continue;
      suma.atak += a.atak ?? 0;
      suma.obrona += a.obrona ?? 0;
      suma.ruch += a.ruch ?? 0;
    }
    const co = [
      suma.atak ? `+${suma.atak} ataku` : '',
      suma.obrona ? `+${suma.obrona} obrony` : '',
      suma.ruch ? `+${suma.ruch} ruchu` : '',
    ].filter(Boolean);
    this.add
      .text(x + w / 2, dy + 24, co.length ? `Razem dają: ${co.join(', ')}` : 'Jeszcze nic — na razie liczysz na siebie.', {
        ...stylAtramentu(13, co.length ? 'zielony' : 'miekki', w - 40),
        align: 'center',
      })
      .setOrigin(0.5, 0)
      .setDepth(Z.hud + 1);

    const misja = ARTEFAKTY.filter((a) => a.klasa === 'misja' && b.artefakty.includes(a.id));
    const my = y + POLA_H - 64;
    if (misja.length) {
      const a = misja[0];
      const bok = 44;
      const gx = x + 30;
      this.rysujArtefakt(gx, my, bok, a, true);
      this.add.text(gx + bok + 12, my + 2, a.nazwa, stylEtykiety(14, BARWA.atramentCzerwony)).setDepth(Z.hud + 1);
      this.add
        .text(gx + bok + 12, my + 22, 'cel misji — zanieś go, dokąd trzeba', { ...stylAtramentu(12, 'miekki'), fontFamily: KROJ.kursywa })
        .setDepth(Z.hud + 1);
    } else {
      this.add
        .text(x + w / 2, my + 8, 'Artefakty leżą na mapie i wypadają ze skrzyń.\nNajedź na gniazdo, żeby zobaczyć, co daje.', {
          ...stylAtramentu(12, 'miekki'),
          fontFamily: KROJ.kursywa,
          align: 'center',
        })
        .setOrigin(0.5, 0)
        .setDepth(Z.hud + 1);
    }
  }

  private rysujArtefakt(x: number, y: number, bok: number, a: Artefakt, ma: boolean) {
    this.gniazdo(x, y, bok, ma);
    const im = this.add.image(x + bok / 2, y + bok / 2, `bh-artefakt-${a.id}`).setDepth(Z.hud + 3);
    im.setScale((bok - (ma ? 6 : 14)) / Math.max(im.width, im.height));
    // Brakujący artefakt to cień w gnieździe: widać, CO jeszcze jest do
    // zebrania, ale nie da się go pomylić z noszonym.
    if (!ma) im.setTint(0x6b4a2a).setAlpha(0.3);
    this.strefaOpisu({ x, y, w: bok, h: bok }, () => this.opisArtefaktu(a, ma));
  }

  /**
   * Gniazdo na ikonę: ciemne, wpuszczone w pergamin pole. Zajęte dostaje
   * cienką złotą ramę (jak ikony nagród w kampanii), puste zostaje samą
   * wnęką — puste miejsce ma być widoczne, ale ciche.
   */
  private gniazdo(x: number, y: number, bok: number, pelne: boolean) {
    const g = this.add.graphics().setDepth(Z.hud + 1);
    g.fillStyle(BARWA_GNIAZDA, pelne ? 0.9 : 0.22);
    g.fillRoundedRect(x, y, bok, bok, 3);
    g.fillStyle(0x000000, pelne ? 0.28 : 0.1);
    g.fillRect(x + 2, y + 2, bok - 4, 4);
    g.lineStyle(1.2, BARWA.kreska, pelne ? 0.9 : 0.55);
    g.strokeRoundedRect(x, y, bok, bok, 3);
    if (pelne) ramaZlota(this, x, y, bok, bok, false).setDepth(Z.hud + 2);
    return g;
  }

  // ————————————————————————————————————————— dół: armia, komunikat, wyjście

  private rysujDol() {
    this.panel = new PanelArmii(this, {
      glebia: Z.hud + 1,
      powiedz: (t) => this.powiedz(t),
      poZmianie: (opis) => {
        zapisz('armia', `bohater: ${opis}`);
        this.registry.set(KLUCZ_STANU, this.stan);
        this.odswiezArmie();
      },
    });

    // --- rząd armii: pergamin, podpis, siedem slotów ---
    const { x } = LEWA;
    const w = 568 - x;
    panelPergaminu(this, x, RZAD_Y, w, RZAD_H).forEach((c) => c.setDepth(Z.hud));
    const rzadX = x + w - 10 - (7 * SLOT + 6 * SLOT_ODSTEP);
    this.add.text(x + 12, RZAD_Y + 10, 'Armia', stylEtykiety(16, BARWA.atrament)).setDepth(Z.hud + 1);
    this.podsumowanieArmii = this.add
      .text(x + 12, RZAD_Y + 32, '', stylAtramentu(12, 'miekki', rzadX - x - 20))
      .setDepth(Z.hud + 1);
    this.panel.dodajPasek({
      x: rzadX,
      y: RZAD_Y + (RZAD_H - SLOT) / 2,
      slotW: SLOT,
      slotH: SLOT,
      odstep: SLOT_ODSTEP,
      armia: () => this.stan.bohater.armia,
      chroniona: true,
      gdzie: 'u bohatera',
      dokad: 'do bohatera',
    });

    // --- komunikat z tabliczką „Podziel" (jak w mieście) ---
    const kx = PRAWA.x;
    const kw = PRAWA.w;
    const ky = DOL_Y;
    const podzielW = 92;
    panelPergaminu(this, kx, ky, kw, KOMUNIKAT_H).forEach((c) => c.setDepth(Z.hud));
    this.komunikat = this.add
      .text(kx + 10, ky + KOMUNIKAT_H / 2, '', { ...stylAtramentu(13), lineSpacing: 1 })
      .setOrigin(0, 0.5)
      .setDepth(Z.hud + 1)
      .setWordWrapWidth(kw - podzielW - 26);
    new Przycisk(this, {
      x: kx + kw - podzielW / 2 - 8,
      y: ky + KOMUNIKAT_H / 2,
      w: podzielW,
      h: 34,
      tekst: 'Podziel',
      rozmiar: 13,
      glebia: Z.hud + 2,
      akcja: () => this.panel.podziel(),
    });

    // --- wyjście: złota tabliczka, jedyny „następny krok" tego ekranu ---
    const doMiasta = this.registry.get(KLUCZ_POWROTU) === 'zamek';
    new Przycisk(this, {
      x: kx + kw / 2,
      y: WYJSCIE_Y,
      w: kw,
      h: 38,
      tekst: doMiasta ? 'Do miasta' : 'Na mapę',
      glowny: true,
      rozmiar: 17,
      glebia: Z.hud + 2,
      akcja: () => this.zamknij(),
    });

    this.odswiezArmie();
    this.powiedz();
  }

  private odswiezArmie() {
    const a = this.stan.bohater.armia;
    const ile = lacznie(a);
    const stosy = zywe(a).length;
    this.podsumowanieArmii.setText(`${ile} ${ile === 1 ? 'stworek' : 'stworków'}\nw ${stosy} ${stosy === 1 ? 'oddziale' : 'oddziałach'}`);
    this.panel.odswiez();
  }

  /** Komunikat: najpierw 13 px, a gdy się nie mieści — mniej (jak w mieście). */
  private powiedz(tekst?: string) {
    const k = this.komunikat;
    if (!k) return;
    k.setFontSize(13);
    k.setText(
      tekst ??
        'Kliknij stworka, potem inny slot — przeniesiesz, zamienisz albo połączysz. Prawy klik: opis. Ctrl: jeden stworek.'
    );
    for (const rozmiar of [12, 11]) {
      if (k.height <= KOMUNIKAT_H - 6) break;
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
    const tytul = this.add.text(tx, pad - 2, d.tytul, stylEtykiety(17)).setWordWrapWidth(W - tx - pad);
    let yy = tytul.y + tytul.height + 2;
    const podtytul = d.podtytul
      ? this.add.text(tx, yy, d.podtytul, { ...stylAtramentu(13, 'miekki', W - tx - pad), fontFamily: KROJ.kursywa })
      : null;
    if (podtytul) yy += podtytul.height;
    yy = Math.max(yy, pad + ikona) + 8;
    const linia = ozdobnik(this, pad, yy, W - pad * 2);
    yy += 10;
    const tresc = this.add.text(pad, yy, d.tresc, stylAtramentu(13, 'zwykly', W - pad * 2));
    const H = Math.ceil(yy + tresc.height + pad);
    k.add(panelPergaminu(this, 0, 0, W, H));
    if (d.ikona) {
      const g = this.add.graphics();
      g.fillStyle(BARWA_GNIAZDA, 0.9);
      g.fillRoundedRect(pad, pad, ikona, ikona, 3);
      k.add(g);
      k.add(ramaZlota(this, pad, pad, ikona, ikona, false));
      const im = this.add.image(pad + ikona / 2, pad + ikona / 2, d.ikona);
      im.setScale((ikona - 6) / Math.max(im.width, im.height));
      k.add(im);
    }
    k.add([tytul, ...(podtytul ? [podtytul] : []), linia, tresc]);

    // Dymek staje obok elementu: po prawej, a gdy się nie mieści — po lewej;
    // w pionie wyrównany do jego góry, przycięty do ekranu.
    let dx = o.x + o.w + 16;
    if (dx + W > OKNO_W - 10) dx = o.x - W - 16;
    if (dx < 10) dx = Phaser.Math.Clamp(o.x + o.w / 2 - W / 2, 10, OKNO_W - W - 10);
    const dy = Phaser.Math.Clamp(o.y, GORA + 6, OKNO_H - H - 14);
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
        `\n\nProwadzi ${lacznie(b.armia)} stworków. Nosi ${b.artefakty.length} ${b.artefakty.length === 1 ? 'artefakt' : 'artefaktów'} i zna ${posiadane(b).length} ${posiadane(b).length === 1 ? 'umiejętność' : 'umiejętności'}.`,
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
        'Doświadczenie dają wygrane bitwy, skrzynie i drzewa wiedzy. Awans podnosi atak albo obronę i pozwala wybrać umiejętność.' +
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
        tytul: atak ? 'Atak' : 'Obrona',
        podtytul: `razem ${wartosc}`,
        ikona: atak ? 'k-ikona-miecz' : 'k-ikona-tarcza',
        tresc:
          (atak
            ? `Każdy twój oddział zadaje w bitwie o ${proc}% więcej obrażeń.`
            : `Każdy twój oddział dostaje w bitwie o ${proc}% mniej obrażeń.`) +
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

  private opisArtefaktu(a: Artefakt, ma: boolean): Opis {
    const co = [
      a.atak ? `+${a.atak} do ataku` : '',
      a.obrona ? `+${a.obrona} do obrony` : '',
      a.ruch ? `+${a.ruch} punktów ruchu na dzień` : '',
    ].filter(Boolean);
    const klasa = { drobny: 'artefakt drobny', znaczny: 'artefakt znaczny', relikt: 'relikt', misja: 'cel misji' }[a.klasa];
    return {
      klucz: `artefakt-${a.id}`,
      tytul: a.nazwa,
      podtytul: `${klasa} · ${ma ? 'noszony' : 'jeszcze go nie masz'}`,
      ikona: `bh-artefakt-${a.id}`,
      tresc:
        co.join('\n') +
        (ma
          ? '\n\nDziała, dopóki bohater go nosi.'
          : '\n\nSzukaj go na mapie i w skrzyniach — zacznie działać, gdy tylko go podniesiesz.'),
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
