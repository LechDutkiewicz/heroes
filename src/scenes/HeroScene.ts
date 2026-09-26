/**
 * Ekran bohatera — to, co w Heroes 3 otwiera kliknięcie w bohatera na mapie
 * przygody.
 *
 * Cztery rzeczy naraz, bo tak działa oryginał i bo rozdzielenie ich na cztery
 * okna zamieniłoby jedno spojrzenie w cztery kliknięcia:
 *
 *  1. statystyki — z rozbiciem na to, co bohater ma sam, i to, co daje sprzęt;
 *  2. armia — rząd siedmiu slotów, którym da się ZARZĄDZAĆ, a nie tylko go
 *     oglądać;
 *  3. artefakty — co jest założone i co to daje;
 *  4. umiejętności — puste, przygotowane pole (patrz niżej).
 *
 * **Dlaczego zarządzanie armią jest tu najważniejsze.** Reszta ekranu tylko
 * pokazuje liczby, które i tak widać w panelu na mapie. Przekładanie oddziałów
 * jest jedyną rzeczą, której nie da się zrobić nigdzie indziej, a w Heroes 3
 * robi się to co turę: łączy się resztki dwóch stosów po bitwie, odkłada
 * jednego stworka na osobny slot, żeby przyjął pierwszy cios, albo dzieli
 * strzelców na dwa stosy. Dlatego sloty są tu duże, a nie takie jak w panelu,
 * i dlatego cała arytmetyka podziału siedzi w `data/armia.ts` — sprawdza ją
 * sonda bez przeglądarki, na przypadkach, których myszą nie da się wyklikać.
 *
 * **Skróty są z HotA i to nie jest ozdoba.** Shift przy upuszczeniu dzieli
 * stos na pół, Ctrl odkłada jednego stworka. Bez nich każdy podział przechodzi
 * przez okno z suwakiem, a odłożenie jednego chochlika na przynętę to czynność,
 * którą się robi kilka razy na turę.
 *
 * **Umiejętności są pustym polem i to jest świadome.** Gry jeszcze ich nie
 * mają. Rysujemy więc gniazda z podpisem „miejsce na umiejętność", żeby
 * ekran miał docelowy układ od pierwszego dnia — dorobienie umiejętności
 * później nie będzie przesuwaniem wszystkiego, tylko wypełnieniem gniazd.
 * Puste pole udające, że czegoś brakuje, jest uczciwsze niż ekran, który po
 * dodaniu mechaniki trzeba przeprojektować.
 */

import Phaser from 'phaser';
import {
  ARTEFAKTY,
  ARTEFAKTY_LOSOWE,
  artefaktPoId,
  poziom,
  postepPoziomu,
  bonusPoziomu,
  ruchNaDzis,
  statystyki,
  type Artefakt,
  type Oddzial,
  type StanMapy,
} from '../data/mapa';
import {
  SLOTY_ARMII,
  lacznie,
  maksPodzialu,
  podziel,
  przenies,
  zamiar,
  ileNaSkrot,
  znormalizuj,
  zywe,
  type Skrot,
} from '../data/armia';
import { planszaPrzygody } from '../data/plansza';
import {
  ATAK_BOHATERA_MAKS,
  ATAK_BOHATERA_ZA_PUNKT,
  OBRONA_BOHATERA_MAKS,
  OBRONA_BOHATERA_ZA_PUNKT,
} from '../data/battle';
import {
  MAKS_UMIEJETNOSCI,
  POZIOMY,
  opisWartosci,
  posiadane,
} from '../data/umiejetnosci';
import { C, E, H, T, Z, body, display } from '../visual/theme';
import { makeHudButton, mix, plate } from '../visual/hud';
import { ICON, buildIcons, icon } from '../visual/icons';
import { BARWA_KLASY, OBRYS_KLASY, buildArtefakty, kluczArtefaktu } from '../visual/artefakty';
import { GniazdoPortretu, kluczPortretu, wczytajPortrety } from '../visual/portrety';
import { BARWA, napisNaDrewnie, ramaZlota, stylAtramentu, wczytajZestaw } from '../visual/zestaw';
import { cienPod, faktura, listwa, naroznik, pierscien, wneka, zabkowanie } from '../visual/rama';
import { migawkaStanu, sledzScene, zapisz } from '../dev/dziennik';

const KLUCZ_STANU = 'stan-mapy';

/** Okno gry. Ekran bohatera zajmuje je w całości — to jest osobny widok. */
const EKRAN_W = 960;
const EKRAN_H = 694;

/** Rama okna. Marginesy zostawiają widoczny skrawek mapy pod spodem. */
const RAMA = { x: 18, y: 12, w: EKRAN_W - 36, h: EKRAN_H - 24 };
const NAGLOWEK_H = 52;

/** Kolumna z portretem i statystykami. */
const LEWA = { x: RAMA.x + 18, w: 244 };
/** Dwa pola po prawej: artefakty i umiejętności. */
const ARTE = { x: LEWA.x + LEWA.w + 16, w: 300 };
const UMIEJ = { x: ARTE.x + 300 + 16, w: RAMA.x + RAMA.w - 18 - (ARTE.x + 300 + 16) };
const TRESC_Y = RAMA.y + NAGLOWEK_H + 12;
const TRESC_H = 388;

/** Pas armii na dole — siedem slotów w jednym rzędzie, jak u bohatera w H3. */
// Sloty armii: duże portrety w ciasnym rzędzie, jak 58 × 64 w Heroes.
// Przy 92 px portret był małym obrazkiem w pustej drewnianej płycie.
const SLOT_BOK = 104;
const SLOT_ODSTEP = 14;
/** Bok portretu w slocie armii: gniazdo minus wąski margines na złotą oprawę. */
const PORTRET_W_SLOCIE = SLOT_BOK - 10;
const ARMIA_Y = TRESC_Y + TRESC_H + 32;

/** Kolejność klas — karta pokazuje domyślnie najmocniejszy noszony artefakt. */
const WAGA_KLASY = { drobny: 1, znaczny: 2, relikt: 3, misja: 4 } as const;

interface WidokSlotu {
  indeks: number;
  gniazdo: GniazdoPortretu;
}

export class HeroScene extends Phaser.Scene {
  private stan!: StanMapy;
  private sloty: WidokSlotu[] = [];
  private artefaktIkony: Phaser.GameObjects.Container[] = [];
  private statTeksty: Phaser.GameObjects.Text[] = [];
  private statDodatki: Phaser.GameObjects.Text[] = [];
  private poziomTekst!: Phaser.GameObjects.Text;
  private doswTekst!: Phaser.GameObjects.Text;
  private doswPasek!: Phaser.GameObjects.Graphics;
  private modyfikatory!: Phaser.GameObjects.Text;
  private armiaPodsumowanie!: Phaser.GameObjects.Text;
  private podpowiedz!: Phaser.GameObjects.Text;
  private kartaIkona!: Phaser.GameObjects.Image;
  private kartaNazwa!: Phaser.GameObjects.Text;
  private kartaKlasa!: Phaser.GameObjects.Text;
  private kartaOpis!: Phaser.GameObjects.Text;
  private wplywNaBitwe!: Phaser.GameObjects.Text;

  /** Slot, z którego trwa przeciąganie, i lecąca za kursorem sylwetka. */
  private ciagniety: number | null = null;
  private duch: Phaser.GameObjects.Container | null = null;
  /** Slot wskazany klikiem — droga bez przeciągania, dla małej ręki i tabletu. */
  private wybrany: number | null = null;
  /** Czy okno podziału jest otwarte; wtedy sloty nie przyjmują kliknięć. */
  private oknoOtwarte = false;

  constructor() {
    super('bohater');
  }

  preload() {
    const b = import.meta.env.BASE_URL;
    this.load.spritesheet('bohater', `${b}mapa/bohater.png`, {
      frameWidth: 64,
      frameHeight: 64,
    });
    // Portrety (duże) ładujemy tu, a nie liczymy na mapę: ekran bohatera
    // potrafi być pierwszą sceną po wczytaniu strony (przeładowanie
    // z otwartym ekranem).
    wczytajPortrety(this, { duze: true });
    // Gniazda armii są z zestawu (drewno, cienka złota rama, kroje).
    wczytajZestaw(this);
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

  create() {
    this.stan = this.wczytajStan();
    this.sloty = [];
    this.artefaktIkony = [];
    this.statTeksty = [];
    this.statDodatki = [];
    this.ciagniety = null;
    this.duch = null;
    this.wybrany = null;
    this.oknoOtwarte = false;

    buildIcons(this);
    buildArtefakty(this);
    sledzScene(this);
    migawkaStanu('bohater', () => ({
      armia: this.stan.bohater.armia.map((o) => (o ? `${o.sprite}×${o.ile}` : '—')),
      artefakty: this.stan.bohater.artefakty,
    }));

    this.rysujTlo();
    this.rysujRame();
    this.rysujKolumneStatystyk();
    this.rysujArtefakty();
    this.rysujUmiejetnosci();
    this.rysujArmie();
    this.rysujStopke();
    this.podepnijSterowanie();
    this.odswiez();
  }

  // ---------- tło i rama ----------

  /**
   * Za oknem leży przygaszony ekran, a nie czarne tło. Bez tego ekran bohatera
   * wygląda jak osobna aplikacja, a nie jak karta otwarta NAD mapą — i po
   * zamknięciu nie wiadomo, dokąd się wraca.
   */
  private rysujTlo() {
    const g = this.add.graphics().setDepth(Z.sky);
    g.fillStyle(0x0b1b2a, 1);
    g.fillRect(0, 0, EKRAN_W, EKRAN_H);
    // Delikatna poświata w środku ekranu — kadr sam prowadzi wzrok do okna.
    for (let i = 6; i > 0; i--) {
      g.fillStyle(0x1d5f80, 0.06);
      g.fillEllipse(EKRAN_W / 2, EKRAN_H / 2, 300 + i * 120, 220 + i * 90);
    }
  }

  private rysujRame() {
    const g = this.add.graphics().setDepth(Z.hud);
    cienPod(g, RAMA.x, RAMA.y, RAMA.w, RAMA.h, 18, 0.55);
    plate(g, RAMA.x, RAMA.y, RAMA.w, RAMA.h, 18, C.panel, C.panelDeep, {
      light: 0.2,
      dark: 0.2,
      gloss: 0.14,
      drop: 0,
      edgeW: 4,
    });
    faktura(g, RAMA.x + 4, RAMA.y + 4, RAMA.w - 8, RAMA.h - 8, 0.04);
    // Wewnętrzna listwa złota: druga krawędź w głębi ramy. Rama z jednym
    // obrysem czyta się jako obwódka wokół pola koloru — dopiero druga,
    // wpuszczona linia robi z niej profil.
    g.lineStyle(2, C.gold, 0.45);
    g.strokeRoundedRect(RAMA.x + 7, RAMA.y + 7, RAMA.w - 14, RAMA.h - 14, 13);
    g.lineStyle(1.5, C.white, 0.3);
    g.beginPath();
    g.moveTo(RAMA.x + 22, RAMA.y + 3.5);
    g.lineTo(RAMA.x + RAMA.w - 22, RAMA.y + 3.5);
    g.strokePath();

    // Belka nagłówka — wypukła listwa z profilem, z własnym cieniem rzuconym
    // na treść pod spodem. Bez cienia belka i panele leżą na jednej
    // płaszczyźnie i okno wygląda jak tabela.
    const nx = RAMA.x + 10;
    const ny = RAMA.y + 10;
    const nw = RAMA.w - 20;
    g.fillStyle(C.shadow, 0.22);
    g.fillRoundedRect(nx + 6, ny + NAGLOWEK_H - 2, nw - 12, 10, 6);
    g.fillStyle(C.shadow, 0.12);
    g.fillRoundedRect(nx + 12, ny + NAGLOWEK_H + 4, nw - 24, 8, 5);
    listwa(g, nx, ny, nw, NAGLOWEK_H, 12, C.panelDeep, C.gold);
    faktura(g, nx + 3, ny + 3, nw - 6, NAGLOWEK_H - 6, 0.045);
    // Gzyms: warga wystająca spod belki plus rząd ząbków. To ten jeden detal,
    // który odróżnia gzyms od paska farby — belka bez niego kończy się
    // kreską i cała rama czyta się jako obrys, a nie jako konstrukcja.
    g.fillStyle(C.goldDeep, 1);
    g.fillRoundedRect(nx - 4, ny + NAGLOWEK_H - 5, nw + 8, 9, 3);
    g.fillStyle(C.gold, 1);
    g.fillRoundedRect(nx - 4, ny + NAGLOWEK_H - 5, nw + 8, 5, 3);
    g.fillStyle(C.goldLight, 0.6);
    g.fillRect(nx - 2, ny + NAGLOWEK_H - 4, nw + 4, 2);
    zabkowanie(g, nx + 24, ny + NAGLOWEK_H - 16, nw - 48, C.goldDeep, 9);

    // Cztery okucia w rogach ramy.
    naroznik(g, RAMA.x + 13, RAMA.y + 13, 1, 1, 52);
    naroznik(g, RAMA.x + RAMA.w - 13, RAMA.y + 13, -1, 1, 52);
    naroznik(g, RAMA.x + 13, RAMA.y + RAMA.h - 13, 1, -1, 52);
    naroznik(g, RAMA.x + RAMA.w - 13, RAMA.y + RAMA.h - 13, -1, -1, 52);

    // Klamra w osi belki: medalion, który spina nagłówek z ramą. We wzorcu
    // to samo miejsce trzyma godło — u nas gwiazdka, ta sama, którą gra
    // znaczy nagrody.
    const kx = EKRAN_W / 2;
    const ky = RAMA.y + 10;
    g.fillStyle(C.shadow, 0.45);
    g.fillCircle(kx, ky + 3, 20);
    g.fillStyle(C.goldDeep, 1);
    g.fillCircle(kx, ky, 19);
    g.fillStyle(C.gold, 1);
    g.fillCircle(kx, ky, 15.5);
    g.fillStyle(C.goldLight, 0.6);
    g.fillCircle(kx, ky - 3, 11);
    icon(this, ICON.star, kx, ky, 18).setDepth(Z.hud + 3);

    const b = this.stan.bohater;
    this.add
      .text(EKRAN_W / 2, RAMA.y + 10 + NAGLOWEK_H / 2, b.imie.toUpperCase(), {
        ...display(23, H.goldLight),
        letterSpacing: 2,
      })
      .setOrigin(0.5)
      .setDepth(Z.hud + 2);

    // Zamknięcie: krzyżyk w kółku po prawej stronie belki. Klawisz Escape
    // robi to samo, ale dziecko szuka krzyżyka, nie klawisza.
    const zx = RAMA.x + RAMA.w - 34;
    const zy = RAMA.y + 10 + NAGLOWEK_H / 2;
    const kolo = this.add.graphics().setDepth(Z.hud + 2);
    plate(kolo, zx - 15, zy - 15, 30, 30, 15, C.foe, C.foeDeep, {
      light: 0.3,
      dark: 0.25,
      gloss: 0.28,
      drop: 2,
    });
    const krzyz = this.add.graphics().setDepth(Z.hud + 3);
    krzyz.lineStyle(3.5, C.white, 1);
    krzyz.beginPath();
    krzyz.moveTo(zx - 7, zy - 7);
    krzyz.lineTo(zx + 7, zy + 7);
    krzyz.moveTo(zx + 7, zy - 7);
    krzyz.lineTo(zx - 7, zy + 7);
    krzyz.strokePath();
    this.add
      .zone(zx, zy, 40, 40)
      .setInteractive({ useHandCursor: true })
      .setDepth(Z.hud + 4)
      .on('pointerdown', () => this.zamknij());
  }

  /** Tabliczka pola: wspólny kształt dla trzech pól treści. */
  private pole(x: number, y: number, w: number, h: number, tytul: string) {
    const g = this.add.graphics().setDepth(Z.hud + 1);
    // Pole jest WNĘKĄ w ramie, nie kartą na niej. To była największa różnica
    // wobec wzorca w pierwszej rundzie: u nas wszystko było wypukłe, więc nic
    // nie wyglądało na pojemnik.
    plate(g, x, y, w, h, 12, mix(C.panel, C.panelDeep, 0.14), C.panelDeep, {
      light: 0.16,
      dark: 0.18,
      gloss: 0.1,
      drop: 3,
      edgeW: 2,
    });
    g.fillStyle(C.shadow, 0.16);
    g.fillRoundedRect(x + 4, y + 28, w - 8, 7, 4);
    faktura(g, x + 3, y + 30, w - 6, h - 34, 0.03);

    // Podpis pola siedzi na listwie z profilem, wpuszczonej w górną krawędź.
    listwa(g, x + 6, y + 4, w - 12, 26, 8, C.panelDeep, C.goldDeep);
    this.add
      .text(x + w / 2, y + 17, tytul, {
        ...body(12, H.goldLight),
        fontStyle: 'bold',
        letterSpacing: 1.5,
      })
      .setOrigin(0.5)
      .setDepth(Z.hud + 2);
    return g;
  }

  // ---------- kolumna statystyk ----------

  private rysujKolumneStatystyk() {
    this.pole(LEWA.x, TRESC_Y, LEWA.w, TRESC_H, 'BOHATER');

    // Portret w złotym medalionie, z pierścieniem poziomu — jak portrety
    // wieszczów we wzorcu, gdzie liczba poziomu siedzi w oczku obręczy.
    const px = LEWA.x + LEWA.w / 2;
    const py = TRESC_Y + 84;
    const obrecz = this.add.graphics().setDepth(Z.hud + 2);
    pierscien(obrecz, px, py, 48, 9);
    const portret = this.add.image(px, py, 'bohater', 0).setDepth(Z.hud + 3);
    portret.setScale(72 / portret.height);
    const maska = this.add.graphics().setVisible(false);
    maska.fillCircle(px, py, 39);
    portret.setMask(maska.createGeometryMask());

    const oczko = this.add.graphics().setDepth(Z.hud + 4);
    oczko.fillStyle(C.panelDeep, 1);
    oczko.fillCircle(px, py + 42, 16);
    oczko.lineStyle(3, C.gold, 1);
    oczko.strokeCircle(px, py + 42, 16);
    this.poziomTekst = this.add
      .text(px, py + 42, '', display(15, H.goldLight))
      .setOrigin(0.5)
      .setDepth(Z.hud + 5);

    // Doświadczenie: pasek z podpisem. Sama liczba nie mówi, jak blisko jest
    // awans, a to jedyna rzecz, na którą gracz w tej kolumnie czeka.
    const dx = LEWA.x + 16;
    const dw = LEWA.w - 32;
    const dy = TRESC_Y + 146;
    const rowek = this.add.graphics().setDepth(Z.hud + 2);
    plate(rowek, dx, dy, dw, 14, 7, C.hpTrack, C.shadow, {
      light: 0,
      dark: 0.3,
      gloss: 0,
      drop: 0,
      edgeW: 2,
    });
    this.doswPasek = this.add.graphics().setDepth(Z.hud + 3);
    this.doswTekst = this.add
      .text(LEWA.x + LEWA.w / 2, dy + 25, '', body(10, H.inkSoft))
      .setOrigin(0.5)
      .setDepth(Z.hud + 3);

    // Trzy statystyki. Każda w swoim wierszu: ikona, nazwa, wartość i — jeśli
    // coś ją podbija — dodatek na zielono. Rozbicie „ile z siebie, ile ze
    // sprzętu" jest tu całym sensem ekranu: bez niego nie widać, po co się
    // zbiera artefakty.
    // Trzy statystyki w JEDNEJ tabliczce z grawerowanymi przegrodami, a nie
    // w trzech osobnych kapsułkach.
    //
    // Dwaj krytycy niezależnie napisali to samo: „ten sam preset obsługuje
    // pięć różnych ról, więc oko nie ma gdzie usiąść". Kolumna ma teraz trzy
    // RÓŻNE materiały: obręcz portretu to metal, statystyki to ciemny kamień
    // z rytem, a lista sprzętu niżej — jasny pergamin. Rola poznaje się po
    // materiale, zanim przeczyta się choć jedno słowo.
    const wiersze: Array<[string, string]> = [
      [ICON.sword, 'Atak'],
      [ICON.shield, 'Obrona'],
      [ICON.boot, 'Ruch'],
    ];
    const tabY = TRESC_Y + 176;
    const wiersz = 34;
    const tab = this.add.graphics().setDepth(Z.hud + 2);
    // Tabliczka ma miejsce na trzy wiersze PLUS stopkę z tym, co atak
    // i obrona robią w bitwie — bez niej ta informacja nie miała się gdzie
    // podziać i wychodziła poza kolumnę.
    wneka(tab, dx, tabY, dw, wiersz * 3 + 30, 8, mix(C.panelDeep, C.shadow, 0.34), 1);

    wiersze.forEach(([ikona, nazwa], i) => {
      const wy = tabY + 21 + i * wiersz;
      // Przegroda to RYT: ciemna kreska z jasną tuż pod nią. Pojedyncza linia
      // wygląda jak obramowanie tabeli, dwie — jak rowek wycięty w materiale.
      if (i > 0) {
        tab.lineStyle(1, C.shadow, 0.55);
        tab.beginPath();
        tab.moveTo(dx + 10, wy - wiersz / 2);
        tab.lineTo(dx + dw - 10, wy - wiersz / 2);
        tab.strokePath();
        tab.lineStyle(1, C.white, 0.12);
        tab.beginPath();
        tab.moveTo(dx + 10, wy - wiersz / 2 + 1.5);
        tab.lineTo(dx + dw - 10, wy - wiersz / 2 + 1.5);
        tab.strokePath();
      }
      // Ikona w oczku z metalu — ten sam materiał co obręcz portretu, więc
      // kolumna ma dwa nawroty złota zamiast złota wszędzie.
      tab.fillStyle(C.shadow, 0.6);
      tab.fillCircle(dx + 21, wy + 1.5, 12.5);
      tab.fillStyle(C.goldDeep, 1);
      tab.fillCircle(dx + 21, wy, 12);
      tab.fillStyle(mix(C.panelDeep, C.shadow, 0.2), 1);
      tab.fillCircle(dx + 21, wy, 9.5);
      icon(this, ikona as never, dx + 21, wy, 15).setDepth(Z.hud + 3);
      this.add
        .text(dx + 40, wy, nazwa.toUpperCase(), {
          ...body(10, '#9dc3d6'),
          fontStyle: 'bold',
          letterSpacing: 1.2,
        })
        .setOrigin(0, 0.5)
        .setDepth(Z.hud + 3);
      this.statDodatki[i] = this.add
        .text(dx + dw - 14, wy, '', { ...body(10.5, '#7ce89a'), fontStyle: 'bold' })
        .setOrigin(1, 0.5)
        .setDepth(Z.hud + 3);
      this.statTeksty[i] = this.add
        .text(dx + dw - 14, wy, '', display(20, H.goldLight))
        .setOrigin(1, 0.5)
        .setDepth(Z.hud + 3);
    });

    // Co atak i obrona bohatera robią W BITWIE — wprost, liczbą.
    //
    // Obie liczby rosły w panelu, arena je podnosiła, artefakty je podnosiły,
    // a nigdzie nie było napisane, po co. Bez tego wiersza gracz musiałby
    // zgadywać, czy „+1 do ataku" cokolwiek znaczy.
    tab.lineStyle(1, C.shadow, 0.55);
    tab.beginPath();
    tab.moveTo(dx + 10, tabY + wiersz * 3 + 9);
    tab.lineTo(dx + dw - 10, tabY + wiersz * 3 + 9);
    tab.strokePath();
    this.wplywNaBitwe = this.add
      .text(dx + dw / 2, tabY + wiersz * 3 + 20, '', {
        ...body(9, '#7ce89a'),
        align: 'center',
        fontStyle: 'bold',
      })
      .setOrigin(0.5)
      .setDepth(Z.hud + 3);

    // Trzeci materiał: pergamin. Jasny, ciepły, bez połysku — celowo najdalej
    // od metalu obręczy i od kamienia tabliczki statystyk.
    const my = TRESC_Y + 308;
    const mh = TRESC_H - 320;
    const mg = this.add.graphics().setDepth(Z.hud + 2);
    const pergamin = mix(C.panel, C.gold, 0.14);
    mg.fillStyle(C.shadow, 0.35);
    mg.fillRoundedRect(dx - 1, my + 3, dw + 2, mh, 6);
    mg.fillStyle(mix(pergamin, C.goldDeep, 0.25), 1);
    mg.fillRoundedRect(dx - 2, my - 2, dw + 4, mh + 4, 7);
    mg.fillStyle(pergamin, 1);
    mg.fillRoundedRect(dx, my, dw, mh, 5);
    // Plamy starego papieru zamiast gradientu — pergamin ma być nierówny.
    for (let i = 0; i < 7; i++) {
      mg.fillStyle(C.goldDeep, 0.05);
      mg.fillEllipse(dx + 18 + ((i * 37) % (dw - 30)), my + 12 + ((i * 23) % (mh - 16)), 34, 18);
    }
    // Nagłówek wpisany W pergamin, oddzielony rytą kreską — nie osobna belka.
    this.add
      .text(dx + 10, my + 11, 'CO DAJE SPRZĘT', {
        ...body(10, '#8a6a2a'),
        fontStyle: 'bold',
        letterSpacing: 1.2,
      })
      .setOrigin(0, 0.5)
      .setDepth(Z.hud + 3);
    mg.lineStyle(1, C.goldDeep, 0.45);
    mg.beginPath();
    mg.moveTo(dx + 10, my + 21);
    mg.lineTo(dx + dw - 10, my + 21);
    mg.strokePath();

    this.modyfikatory = this.add
      .text(dx + 10, my + 28, '', { ...body(10.5, '#3d3016'), lineSpacing: 3 })
      .setOrigin(0, 0)
      .setDepth(Z.hud + 3)
      .setWordWrapWidth(dw - 20);
  }

  // ---------- artefakty ----------

  /**
   * Gniazda artefaktów: osiem, po jednym na każdy artefakt w grze.
   *
   * Nie robimy z tego sylwetki z miejscami na hełm, buty i pierścień, choć
   * wzorzec tak ma. U nas artefakt nie ma slotu — daje dodatek samym
   * posiadaniem — więc paper doll obiecywałby zasadę, której nie ma, i pierwsza
   * próba włożenia buta w gniazdo hełmu skończyłaby się pytaniem „dlaczego
   * nie wchodzi". Siatka mówi prawdę: to jest sakwa, a nie zbroja.
   */
  private rysujArtefakty() {
    this.pole(ARTE.x, TRESC_Y, ARTE.w, TRESC_H, 'ARTEFAKTY');

    const kol = 4;
    const bok = 62;
    const odstep = 8;
    const siatkaW = kol * bok + (kol - 1) * odstep;
    const startX = ARTE.x + (ARTE.w - siatkaW) / 2;
    const startY = TRESC_Y + 46;

    ARTEFAKTY_LOSOWE.forEach((a, i) => {
      const gx = startX + (i % kol) * (bok + odstep);
      const gy = startY + Math.floor(i / kol) * (bok + odstep + 14);
      const g = this.add.graphics().setDepth(Z.hud + 2);
      const ikona = this.add
        .image(bok / 2, bok / 2, kluczArtefaktu(a.id, a.klasa))
        .setDisplaySize(bok - 14, bok - 14);
      const podpis = this.add
        .text(bok / 2, bok + 8, a.nazwa.split(' ')[0], body(9, H.inkSoft))
        .setOrigin(0.5, 0);
      const kont = this.add
        .container(gx, gy, [g, ikona, podpis])
        .setDepth(Z.hud + 2)
        .setSize(bok, bok);
      kont.setData('artefakt', a).setData('tlo', g).setData('ikona', ikona).setData('podpis', podpis);
      this.artefaktIkony.push(kont);

      this.add
        .zone(gx, gy, bok, bok + 20)
        .setOrigin(0, 0)
        .setDepth(Z.hud + 4)
        .setInteractive()
        .on('pointerover', () => {
          this.powiedz(this.opisArtefaktu(a));
          this.pokazArtefakt(a);
        })
        .on('pointerout', () => {
          this.powiedz();
          this.pokazArtefakt();
        });
    });

    // Podsumowanie pod siatką: ile z ośmiu. Bez tego nie widać, że zbieranie
    // ma koniec, a to jest cel sam w sobie — w Heroes 3 komplet artefaktów
    // składa się w zestaw.
    this.add
      .text(ARTE.x + ARTE.w / 2, TRESC_Y + 222, '', { ...body(11, H.inkSoft), fontStyle: 'bold' })
      .setOrigin(0.5)
      .setDepth(Z.hud + 3)
      .setName('licznik-artefaktow');

    this.rysujKarteArtefaktu();
  }

  /**
   * Karta pod siatką: powiększony artefakt, jego klasa i co dokładnie daje.
   *
   * Bez niej dolna połowa kolumny stała pusta, a siatka musiałaby zmieścić
   * nazwę I działanie w kwadracie 62 px — czyli w czcionce, której ośmiolatek
   * nie przeczyta. Karta pokazuje jeden artefakt naraz: ten, na który gracz
   * właśnie patrzy, a zanim najedzie na cokolwiek — najmocniejszy z noszonych.
   */
  private rysujKarteArtefaktu() {
    const kx = ARTE.x + 12;
    const kw = ARTE.w - 24;
    const ky = TRESC_Y + 238;
    const kh = TRESC_Y + TRESC_H - 14 - ky;
    const g = this.add.graphics().setDepth(Z.hud + 2).setName('karta-artefaktu-tlo');
    plate(g, kx, ky, kw, kh, 10, mix(C.panel, C.panelDeep, 0.28), C.panelDeep, {
      light: 0.14,
      dark: 0.16,
      gloss: 0.08,
      drop: 2,
      edgeW: 2,
    });

    this.kartaIkona = this.add
      .image(kx + 46, ky + 46, 'art-klasa-drobny')
      .setDisplaySize(64, 64)
      .setDepth(Z.hud + 3);
    this.kartaNazwa = this.add
      .text(kx + 88, ky + 24, '', display(14))
      .setOrigin(0, 0.5)
      .setDepth(Z.hud + 3)
      .setWordWrapWidth(kw - 100);
    this.kartaKlasa = this.add
      .text(kx + 88, ky + 46, '', { ...body(10, H.goldLight), fontStyle: 'bold' })
      .setOrigin(0, 0.5)
      .setDepth(Z.hud + 3);
    this.kartaOpis = this.add
      .text(kx + 12, ky + 88, '', body(11, H.ink))
      .setOrigin(0, 0)
      .setDepth(Z.hud + 3)
      .setWordWrapWidth(kw - 24);
  }

  /** Wypełnia kartę artefaktu; `undefined` znaczy „wróć do domyślnego". */
  private pokazArtefakt(a?: Artefakt) {
    const b = this.stan.bohater;
    const wybor =
      a ??
      ARTEFAKTY.filter((x) => b.artefakty.includes(x.id)).sort(
        (p, q) => WAGA_KLASY[q.klasa] - WAGA_KLASY[p.klasa]
      )[0];
    if (!wybor) {
      this.kartaIkona.setTexture('art-klasa-drobny').setAlpha(0.25);
      this.kartaNazwa.setText('Brak artefaktów');
      this.kartaKlasa.setText('');
      this.kartaOpis.setText(
        'Artefakty leżą na mapie i wypadają ze skrzyń. Każdy dodaje coś na stałe — najedź na gniazdo, żeby zobaczyć co.'
      );
      return;
    }
    const ma = b.artefakty.includes(wybor.id);
    this.kartaIkona.setTexture(kluczArtefaktu(wybor.id, wybor.klasa)).setAlpha(ma ? 1 : 0.3);
    this.kartaNazwa.setText(wybor.nazwa);
    this.kartaKlasa.setText(`${wybor.klasa.toUpperCase()}  ·  ${ma ? 'noszony' : 'jeszcze nie masz'}`);
    const cz = [
      wybor.atak ? `+${wybor.atak} do ataku` : '',
      wybor.obrona ? `+${wybor.obrona} do obrony` : '',
      wybor.ruch ? `+${wybor.ruch} punktów ruchu` : '',
    ].filter(Boolean);
    this.kartaOpis.setText(cz.join('\n'));
  }

  private opisArtefaktu(a: Artefakt) {
    const ma = this.stan.bohater.artefakty.includes(a.id);
    const co = [
      a.atak ? `+${a.atak} atak` : '',
      a.obrona ? `+${a.obrona} obrona` : '',
      a.ruch ? `+${a.ruch} ruchu` : '',
    ]
      .filter(Boolean)
      .join(', ');
    return ma
      ? `${a.nazwa} (${a.klasa}) — ${co}. Nosisz go.`
      : `${a.nazwa} (${a.klasa}) — ${co}. Jeszcze go nie masz.`;
  }

  // ---------- umiejętności ----------

  private rysujUmiejetnosci() {
    this.pole(UMIEJ.x, TRESC_Y, UMIEJ.w, TRESC_H, 'UMIEJĘTNOŚCI');

    const mam = posiadane(this.stan.bohater);
    const bok = (UMIEJ.w - 3 * 14) / 2;
    for (let i = 0; i < MAKS_UMIEJETNOSCI; i++) {
      const gx = UMIEJ.x + 14 + (i % 2) * (bok + 14);
      const gy = TRESC_Y + 46 + Math.floor(i / 2) * (bok + 16);
      const wpis = mam[i];
      const g = this.add.graphics().setDepth(Z.hud + 2);
      // Gniazdo jest tym samym kształtem zajęte i puste — zmienia się tylko
      // to, co w nim stoi. Inaczej zdobycie umiejętności wyglądałoby jak
      // podmiana całej karty, a nie jak wypełnienie przygotowanego miejsca.
      wneka(g, gx, gy, bok, bok, 10);
      faktura(g, gx + 4, gy + 4, bok - 8, bok - 8, 0.03);
      const cx = gx + bok / 2;
      const cy = gy + bok / 2 - 8;

      const med = this.add.graphics().setDepth(Z.hud + 2).setAlpha(wpis ? 1 : 0.5);
      pierscien(med, cx, cy, 25, 6);
      // Romb fazowany: cztery ściany, każda z własną jasnością zgodną z jednym
      // źródłem światła z góry-lewej. Poziom umiejętności czyta się z liczby
      // ścian w pełnym złocie — mistrzowska świeci cała.
      const rr = 14;
      const jasnosc = wpis ? wpis.poziom : 0;
      const sciana = (
        x1: number,
        y1: number,
        x2: number,
        y2: number,
        barwa: number,
        a: number
      ) => {
        med.fillStyle(barwa, a);
        med.beginPath();
        med.moveTo(cx, cy);
        med.lineTo(x1, y1);
        med.lineTo(x2, y2);
        med.closePath();
        med.fillPath();
      };
      sciana(cx, cy - rr, cx - rr, cy, C.goldLight, 0.95);
      sciana(cx, cy - rr, cx + rr, cy, jasnosc >= 2 ? C.goldLight : C.gold, 0.85);
      sciana(cx, cy + rr, cx - rr, cy, jasnosc >= 3 ? C.gold : C.goldDeep, 0.85);
      sciana(cx, cy + rr, cx + rr, cy, jasnosc >= 3 ? C.goldDeep : C.shadow, 0.5);
      med.lineStyle(1.5, C.shadow, 0.6);
      med.beginPath();
      med.moveTo(cx, cy - rr);
      med.lineTo(cx + rr, cy);
      med.lineTo(cx, cy + rr);
      med.lineTo(cx - rr, cy);
      med.closePath();
      med.strokePath();

      const ozdoby = this.add.graphics().setDepth(Z.hud + 2).setAlpha(wpis ? 0.85 : 0.55);
      naroznik(ozdoby, gx + 4, gy + 4, 1, 1, 13);
      naroznik(ozdoby, gx + bok - 4, gy + 4, -1, 1, 13);
      naroznik(ozdoby, gx + 4, gy + bok - 4, 1, -1, 13);
      naroznik(ozdoby, gx + bok - 4, gy + bok - 4, -1, -1, 13);

      const sy2 = gy + bok - 46;
      g.lineStyle(1.5, C.shadow, 0.5);
      g.beginPath();
      g.moveTo(gx + 20, sy2);
      g.lineTo(gx + bok - 20, sy2);
      g.strokePath();
      g.lineStyle(1.5, C.gold, 0.3);
      g.beginPath();
      g.moveTo(gx + 20, sy2 + 1.5);
      g.lineTo(gx + bok - 20, sy2 + 1.5);
      g.strokePath();
      g.fillStyle(mix(C.panelDeep, C.shadow, 0.45), 1);
      g.fillCircle(cx, sy2, 11);
      g.lineStyle(2, C.goldDeep, 0.9);
      g.strokeCircle(cx, sy2, 11);
      this.add
        .text(cx, sy2, wpis ? String(wpis.poziom) : String(i + 1), {
          ...body(11, H.goldLight),
          fontStyle: 'bold',
        })
        .setOrigin(0.5)
        .setDepth(Z.hud + 3)
        .setAlpha(wpis ? 1 : 0.8);

      if (wpis) {
        this.add
          .text(cx, gy + bok - 36, wpis.u.nazwa.toUpperCase(), {
            ...body(10, H.goldLight),
            fontStyle: 'bold',
            letterSpacing: 1,
          })
          .setOrigin(0.5)
          .setDepth(Z.hud + 3);
        this.add
          .text(cx, gy + bok - 20, `${POZIOMY[wpis.poziom - 1]}   ${opisWartosci(wpis.u, wpis.poziom)}`, {
            ...body(9, '#cfe6f2'),
            align: 'center',
          })
          .setOrigin(0.5)
          .setDepth(Z.hud + 3)
          .setWordWrapWidth(bok - 20);
        this.add
          .zone(gx, gy, bok, bok)
          .setOrigin(0, 0)
          .setDepth(Z.hud + 4)
          .setInteractive()
          .on('pointerover', () =>
            this.powiedz(`${wpis.u.nazwa} (${POZIOMY[wpis.poziom - 1]}) — ${wpis.u.opis}`)
          )
          .on('pointerout', () => this.powiedz());
      } else {
        this.add
          .text(cx, gy + bok - 26, 'MIEJSCE NA UMIEJĘTNOŚĆ', {
            ...body(8.5, H.goldLight),
            align: 'center',
            fontStyle: 'bold',
          })
          .setOrigin(0.5)
          .setDepth(Z.hud + 3)
          .setAlpha(0.75);
      }
    }

    this.add
      .text(
        UMIEJ.x + UMIEJ.w / 2,
        TRESC_Y + TRESC_H - 34,
        mam.length
          ? `${mam.length} z ${MAKS_UMIEJETNOSCI} gniazd — kolejne wybierasz przy awansie.`
          : 'Umiejętność wybiera się przy awansie na nowy poziom.\nMiejsce na cztery jest już przygotowane.',
        { ...body(11, '#cfe6f2'), align: 'center' }
      )
      .setOrigin(0.5)
      .setDepth(Z.hud + 3);
  }

  // ---------- armia ----------

  private slotX(i: number) {
    const razem = SLOTY_ARMII * SLOT_BOK + (SLOTY_ARMII - 1) * SLOT_ODSTEP;
    return (EKRAN_W - razem) / 2 + i * (SLOT_BOK + SLOT_ODSTEP);
  }

  private rysujArmie() {
    const pasX = RAMA.x + 12;
    const pasW = RAMA.w - 24;
    const pasY = ARMIA_Y - 26;
    const pasH = SLOT_BOK + 50;
    // Pas armii z zestawu: ciemne drewno w cienkiej złotej ramie — ten sam
    // materiał co panel bohatera na mapie. Wcześniej był tu płaski niebieski
    // prostokąt z zaokrąglonymi rogami, a w nim siedem mlecznych kafelków —
    // krytyk nazwał to wprost „pudełkami z aplikacji internetowej".
    this.add
      .tileSprite(pasX, pasY, pasW, pasH, 'z-drewno')
      .setOrigin(0)
      .setTileScale(0.5)
      // Z pominięciem belki nagłówka namalowanej u góry `drewno.jpg`.
      .setTilePosition(0, 420)
      .setTint(0xb8a890)
      .setDepth(Z.hud + 1);
    ramaZlota(this, pasX, pasY, pasW, pasH, false).setDepth(Z.hud + 1);
    napisNaDrewnie(this, pasX + 14, ARMIA_Y - 18, 'Armia', 14)
      .setOrigin(0, 0)
      .setDepth(Z.hud + 2);
    this.armiaPodsumowanie = this.add
      .text(pasX + pasW - 14, ARMIA_Y - 16, '', stylAtramentu(13, 'zwykly'))
      .setColor(BARWA.krem)
      .setOrigin(1, 0)
      .setDepth(Z.hud + 2);

    for (let i = 0; i < SLOTY_ARMII; i++) {
      const x = this.slotX(i);
      const y = ARMIA_Y + 6;
      // Portret wypełnia gniazdo prawie do krawędzi, jak w Heroes: slot armii
      // to ramka na obrazek, a nie półka, na której stoi figurka. Liczba
      // siedzi na odznace w rogu ramy, nie na portrecie.
      const m = (SLOT_BOK - PORTRET_W_SLOCIE) / 2;
      // Bez numeru na pustym gnieździe: duża cyfra na środku czytała się jak
      // liczebność stosu (runda 4). Numer slotu mówi podpowiedź po najechaniu.
      const gniazdo = new GniazdoPortretu(this, x + m, y + m, PORTRET_W_SLOCIE, {
        rozmiarLiczby: 15,
      });
      gniazdo.kontener.setDepth(Z.hud + 2);
      this.sloty.push({ indeks: i, gniazdo });

      this.add
        .zone(x, y, SLOT_BOK, SLOT_BOK)
        .setOrigin(0, 0)
        .setDepth(Z.hud + 6)
        .setInteractive({ useHandCursor: true })
        .on('pointerdown', (p: Phaser.Input.Pointer) => this.chwyc(i, p))
        .on('pointerover', () => this.najechano(i))
        .on('pointerout', () => this.powiedz());
    }
  }

  private rysujStopke() {
    this.podpowiedz = this.add
      .text(RAMA.x + 26, RAMA.y + RAMA.h - 30, '', { ...body(11.5, H.ink), align: 'left' })
      .setOrigin(0, 0.5)
      .setDepth(Z.hud + 3)
      .setWordWrapWidth(RAMA.w - 220);

    const przycisk = makeHudButton(this, {
      x: RAMA.x + RAMA.w - 92,
      y: RAMA.y + RAMA.h - 30,
      w: 150,
      h: 34,
      icon: ICON.banner,
      tone: C.ally,
      toneDeep: C.allyDeep,
      onClick: () => this.zamknij(),
    });
    przycisk.setLabel('Na mapę');
  }

  // ---------- sterowanie ----------

  private podepnijSterowanie() {
    this.input.on('pointermove', (p: Phaser.Input.Pointer) => {
      if (this.duch) this.duch.setPosition(p.x, p.y);
    });
    this.input.on('pointerup', (p: Phaser.Input.Pointer) => this.puszczono(p));
    this.input.keyboard?.on('keydown-ESC', () => this.zamknij());
  }

  private skrotZWejscia(p: Phaser.Input.Pointer): Skrot {
    const e = p.event as MouseEvent | undefined;
    if (e?.shiftKey) return 'polowa';
    if (e?.ctrlKey || e?.metaKey) return 'jeden';
    if (e?.altKey) return 'okno';
    return 'brak';
  }

  /**
   * Wciśnięcie na slocie. Dwie drogi naraz, bo obie są w Heroes 3 i obie się
   * przydają: przeciągnięcie (szybkie, myszą) i klik-klik (bez trzymania
   * przycisku, co przy panelu dotykowym jest jedyną, która działa).
   */
  private chwyc(i: number, p: Phaser.Input.Pointer) {
    if (this.oknoOtwarte) return;
    const armia = this.stan.bohater.armia;

    // Drugi klik: wskazany wcześniej slot jest źródłem, ten — celem.
    if (this.wybrany !== null && this.wybrany !== i) {
      this.wykonaj(this.wybrany, i, this.skrotZWejscia(p));
      this.odznacz();
      return;
    }
    if (this.wybrany === i) {
      this.odznacz();
      return;
    }
    if (!armia[i]) {
      this.powiedz('Ten slot jest pusty — nie ma czego stąd wziąć.');
      return;
    }

    this.wybrany = i;
    this.ciagniety = i;
    this.zbudujDucha(i, p);
    this.odswiezSloty();
  }

  private zbudujDucha(i: number, p: Phaser.Input.Pointer) {
    const o = this.stan.bohater.armia[i];
    if (!o) return;
    const im = this.add.image(0, 0, kluczPortretu(o.sprite));
    im.setDisplaySize(PORTRET_W_SLOCIE, PORTRET_W_SLOCIE);
    const licznik = this.add.text(0, SLOT_BOK / 2 - 14, String(o.ile), display(15)).setOrigin(0.5);
    this.duch = this.add
      .container(p.x, p.y, [im, licznik])
      .setDepth(Z.overlay + 5)
      .setAlpha(0.85)
      .setScale(0.92);
  }

  private puszczono(p: Phaser.Input.Pointer) {
    if (this.ciagniety === null) return;
    const z = this.ciagniety;
    this.ciagniety = null;
    this.duch?.destroy();
    this.duch = null;

    const cel = this.slotPod(p.x, p.y);
    // Upuszczenie na tym samym slocie (albo obok pasa) nie jest pomyłką —
    // to jest po prostu „wziąłem i odłożyłem". Zaznaczenie zostaje, więc
    // dalej działa droga klik-klik.
    if (cel === null || cel === z) return;
    this.wykonaj(z, cel, this.skrotZWejscia(p));
    this.odznacz();
  }

  private slotPod(x: number, y: number): number | null {
    const y0 = ARMIA_Y + 6;
    if (y < y0 || y > y0 + SLOT_BOK) return null;
    for (let i = 0; i < SLOTY_ARMII; i++) {
      const sx = this.slotX(i);
      if (x >= sx && x <= sx + SLOT_BOK) return i;
    }
    return null;
  }

  private odznacz() {
    this.wybrany = null;
    this.odswiezSloty();
  }

  /**
   * Wykonanie ruchu. Cała decyzja „co to właściwie ma zrobić" należy do
   * `zamiar` w warstwie danych — scena tylko odgrywa wynik i mówi o nim
   * graczowi.
   */
  private wykonaj(z: number, doc: number, skrot: Skrot) {
    const armia = this.stan.bohater.armia;
    const co = zamiar(armia, z, doc, skrot);

    if (co.rodzaj === 'nic') {
      this.powiedz('Tego się tak nie da.');
      this.drgnij(doc);
      return;
    }
    if (co.rodzaj === 'okno') {
      this.oknoPodzialu(z, doc);
      return;
    }

    const wynik =
      co.rodzaj === 'podziel'
        ? podziel(armia, z, doc, co.ile ?? 1)
        : przenies(armia, z, doc);

    if (!wynik.ok) {
      this.powiedz(wynik.powod);
      this.drgnij(doc);
      return;
    }
    zapisz('armia', `${co.rodzaj} ${z}→${doc}: ${wynik.opis}`);
    this.powiedz(wynik.opis);
    this.blysk(doc);
    this.odswiez();
  }

  /**
   * Okno podziału — odpowiednik suwaka z Heroes 3.
   *
   * Suwak zastąpiony parą strzałek i przyciskami „połowa / jeden / wszystko":
   * przeciąganie uchwytu o szerokości kilku pikseli jest dla ośmiolatka
   * zadaniem zręcznościowym, a wynik i tak zawsze jest jedną z tych trzech
   * liczb albo czymś bardzo blisko.
   */
  private oknoPodzialu(z: number, doc: number) {
    const armia = this.stan.bohater.armia;
    const zrodlo = armia[z];
    if (!zrodlo) return;
    const maks = maksPodzialu(armia, z, doc);
    if (maks < 1) {
      this.powiedz('Nie ma jak podzielić tego stosu.');
      return;
    }
    this.oknoOtwarte = true;
    let ile = Math.max(1, Math.floor(zrodlo.ile / 2));

    const ow = 380;
    const oh = 230;
    const ox = (EKRAN_W - ow) / 2;
    const oy = (EKRAN_H - oh) / 2;

    // Przyciemnienie musi być mocne: przy 0,55 tło prześwitywało ostro tuż
    // przy krawędzi okna i okno czytało się jak arkusz naklejony na zrzut,
    // a nie jak coś, co się nad ekranem uniosło.
    const zaslona = this.add
      .rectangle(0, 0, EKRAN_W, EKRAN_H, 0x04101a, 0.78)
      .setOrigin(0, 0)
      .setDepth(Z.overlay)
      .setInteractive();
    // Okno jest z INNEGO materiału niż ekran pod spodem: ciemny kamień
    // zamiast jasnego panelu. Jasne okno na jasnym ekranie różniło się od tła
    // tylko obrysem i krytyk słusznie napisał, że „pływa na niczym" — przy
    // zamianie wartości okno odcina się samo, jeszcze zanim zadziała cień.
    const korpus = mix(C.panelDeep, C.shadow, 0.45);
    const g = this.add.graphics().setDepth(Z.overlay + 1);
    cienPod(g, ox, oy, ow, oh, 14, 1);
    plate(g, ox, oy, ow, oh, 14, korpus, C.goldDeep, {
      light: 0.1,
      dark: 0.16,
      gloss: 0.05,
      drop: 0,
      edgeW: 3,
    });
    faktura(g, ox + 4, oy + 4, ow - 8, oh - 8, 0.05);
    g.lineStyle(2, C.gold, 0.5);
    g.strokeRoundedRect(ox + 7, oy + 7, ow - 14, oh - 14, 10);
    g.fillStyle(C.shadow, 0.35);
    g.fillRoundedRect(ox + 10, oy + 36, ow - 20, 10, 5);
    listwa(g, ox + 6, oy + 6, ow - 12, 34, 10, mix(C.panelDeep, C.shadow, 0.2), C.gold);
    // Gzyms i ząbkowanie jak przy ramie ekranu — okno ma być z tej samej
    // stolarki co reszta, a nie z innej gry.
    g.fillStyle(C.goldDeep, 1);
    g.fillRoundedRect(ox + 2, oy + 36, ow - 4, 7, 3);
    g.fillStyle(C.gold, 1);
    g.fillRoundedRect(ox + 2, oy + 36, ow - 4, 4, 3);
    zabkowanie(g, ox + 30, oy + 44, ow - 60, C.goldDeep, 6);
    naroznik(g, ox + 14, oy + 14, 1, 1, 22);
    naroznik(g, ox + ow - 14, oy + 14, -1, 1, 22);
    naroznik(g, ox + 14, oy + oh - 14, 1, -1, 22);
    naroznik(g, ox + ow - 14, oy + oh - 14, -1, -1, 22);

    const czesci: Phaser.GameObjects.GameObject[] = [zaslona, g];
    const dodaj = <X extends Phaser.GameObjects.GameObject>(o: X) => {
      czesci.push(o);
      return o;
    };

    dodaj(
      this.add
        .text(ox + ow / 2, oy + 21, `PODZIEL: ${zrodlo.nazwa}`, {
          ...body(13, H.goldLight),
          fontStyle: 'bold',
        })
        .setOrigin(0.5)
        .setDepth(Z.overlay + 2)
    );

    // Dwie liczby obok siebie: ile zostaje, ile odchodzi. To jest cała treść
    // okna — suwak z jedną liczbą kazałby dziecku odejmować w pamięci.
    const wg = this.add.graphics().setDepth(Z.overlay + 1);
    for (const cx of [ox + ow * 0.28, ox + ow * 0.72]) {
      wneka(wg, cx - 58, oy + 74, 116, 48, 9, mix(C.panelDeep, C.shadow, 0.3), 0.9);
    }
    dodaj(wg);
    const lewy = dodaj(
      this.add
        .text(ox + ow * 0.28, oy + 98, '', display(30, H.white))
        .setOrigin(0.5)
        .setDepth(Z.overlay + 2)
    ) as Phaser.GameObjects.Text;
    const prawy = dodaj(
      this.add
        .text(ox + ow * 0.72, oy + 98, '', display(30, H.gold))
        .setOrigin(0.5)
        .setDepth(Z.overlay + 2)
    ) as Phaser.GameObjects.Text;
    dodaj(
      this.add
        .text(ox + ow * 0.28, oy + 130, `zostaje w slocie ${z + 1}`, body(10, '#9dc3d6'))
        .setOrigin(0.5)
        .setDepth(Z.overlay + 2)
    );
    dodaj(
      this.add
        .text(ox + ow * 0.72, oy + 130, `idzie do slotu ${doc + 1}`, body(10, '#9dc3d6'))
        .setOrigin(0.5)
        .setDepth(Z.overlay + 2)
    );
    dodaj(this.add.text(ox + ow / 2, oy + 98, '→', display(24, H.goldLight)).setOrigin(0.5).setDepth(Z.overlay + 2));

    const odswiezOkno = () => {
      lewy.setText(String(zrodlo.ile - ile));
      prawy.setText(String(ile));
    };

    const strzalka = (x: number, kier: number, etykieta: string) =>
      dodaj(
        this.add
          .text(x, oy + 62, etykieta, display(18, H.goldLight))
          .setOrigin(0.5)
          .setDepth(Z.overlay + 3)
          .setInteractive({ useHandCursor: true })
          .on('pointerdown', () => {
            ile = Phaser.Math.Clamp(ile + kier, 1, maks);
            odswiezOkno();
          })
      );
    strzalka(ox + ow * 0.28, -1, '◀');
    strzalka(ox + ow * 0.72, +1, '▶');

    const przyciski: ReturnType<typeof makeHudButton>[] = [];
    const skroty: Array<[string, number]> = [
      ['Jeden', 1],
      ['Połowa', Math.max(1, Math.floor(zrodlo.ile / 2))],
      ['Wszystko', maks],
    ];
    skroty.forEach(([etykieta, wartosc], i) => {
      const b = makeHudButton(this, {
        x: ox + 62 + i * 128,
        y: oy + 152,
        w: 118,
        h: 30,
        tone: mix(C.panel, C.panelDeep, 0.32),
        toneDeep: C.goldDeep,
        depth: Z.overlay + 3,
        onClick: () => {
          ile = Phaser.Math.Clamp(wartosc, 1, maks);
          odswiezOkno();
        },
      });
      b.setLabel(etykieta);
      przyciski.push(b);
    });

    const zamknijOkno = () => {
      czesci.forEach((o) => o.destroy());
      przyciski.forEach((b) => b.destroy());
      this.oknoOtwarte = false;
      this.odznacz();
    };

    const potwierdz = makeHudButton(this, {
      x: ox + ow * 0.68,
      y: oy + 196,
      w: 168,
      h: 36,
      icon: ICON.star,
      tone: C.gold,
      toneDeep: C.goldDeep,
      depth: Z.overlay + 3,
      onClick: () => {
        const w = podziel(this.stan.bohater.armia, z, doc, ile);
        zamknijOkno();
        if (!w.ok) return this.powiedz(w.powod);
        this.powiedz(w.opis);
        this.blysk(doc);
        this.odswiez();
      },
    });
    potwierdz.setLabel('Podziel');
    przyciski.push(potwierdz);

    const anuluj = makeHudButton(this, {
      x: ox + ow * 0.26,
      y: oy + 196,
      w: 140,
      h: 36,
      tone: mix(C.panel, C.panelDeep, 0.45),
      toneDeep: C.goldDeep,
      depth: Z.overlay + 3,
      onClick: zamknijOkno,
    });
    anuluj.setLabel('Anuluj');
    przyciski.push(anuluj);

    odswiezOkno();
  }

  // ---------- podpowiedzi i odświeżanie ----------

  private najechano(i: number) {
    const armia = this.stan.bohater.armia;
    const o = armia[i];
    if (this.wybrany !== null && this.wybrany !== i) {
      const co = zamiar(armia, this.wybrany, i, 'brak');
      const opis: Record<string, string> = {
        przenies: `Przenieś tu ${armia[this.wybrany]?.nazwa}.`,
        scal: `Połącz oba stosy ${o?.nazwa}.`,
        zamien: `Zamień miejscami z ${o?.nazwa}.`,
        okno: 'Puść tutaj, żeby podzielić stos.',
        podziel: 'Puść tutaj, żeby podzielić stos.',
        nic: 'Tego się tak nie da.',
      };
      const polowa = ileNaSkrot(armia, this.wybrany, i, 'polowa');
      this.powiedz(
        opis[co.rodzaj] + (polowa > 0 ? `   Shift = ${polowa} sztuk, Ctrl = 1 sztuka.` : '')
      );
      return;
    }
    if (!o) {
      this.powiedz(`Slot ${i + 1} — pusty. Przeciągnij tu oddział, żeby go przenieść.`);
      return;
    }
    this.powiedz(`${o.ile} × ${o.nazwa}   ·   poziom ${o.tier + 1}`);
  }

  private powiedz(tekst?: string) {
    this.podpowiedz?.setText(
      tekst ??
        'Przeciągnij oddział na inny slot: puste miejsce przenosi, ten sam gatunek łączy, ' +
          'obcy zamienia. Podział: Shift = połowa, Ctrl = jeden, Alt = okno z liczbą.'
    );
  }

  /** Odmowa musi być widoczna — sam brak zmiany wygląda jak zacięcie gry. */
  private drgnij(i: number) {
    const s = this.sloty[i];
    if (!s) return;
    const x = this.slotX(i) + (SLOT_BOK - PORTRET_W_SLOCIE) / 2;
    this.tweens.add({
      targets: s.gniazdo.kontener,
      x: { from: x - 5, to: x },
      duration: 220,
      ease: 'Elastic.easeOut',
    });
  }

  private blysk(i: number) {
    const s = this.sloty[i];
    if (!s) return;
    this.tweens.add({
      targets: s.gniazdo.kontener,
      scale: { from: 1.12, to: 1 },
      duration: T.pop,
      ease: E.out,
    });
  }

  private odswiez() {
    const b = this.stan.bohater;
    const s = statystyki(b);
    const p = postepPoziomu(b.doswiadczenie);
    const bonus = bonusPoziomu(poziom(b.doswiadczenie));

    this.poziomTekst.setText(String(p.poziom));
    this.doswTekst.setText(`${b.doswiadczenie} dośw.  ·  ${p.wPoziomie}/${p.doAwansu} do awansu`);
    const dx = LEWA.x + 16;
    const dw = LEWA.w - 32;
    const dy = TRESC_Y + 146;
    this.doswPasek.clear();
    const ulamek = Phaser.Math.Clamp(p.wPoziomie / p.doAwansu, 0, 1);
    if (ulamek > 0.01) {
      this.doswPasek.fillStyle(C.gold, 1);
      this.doswPasek.fillRoundedRect(dx + 2, dy + 2, Math.max(6, (dw - 4) * ulamek), 10, 5);
      this.doswPasek.fillStyle(C.white, 0.35);
      this.doswPasek.fillRoundedRect(dx + 2, dy + 3, Math.max(6, (dw - 4) * ulamek), 4, 2);
    }

    // Wartość i dodatek stoją w tym samym wierszu, więc dodatek musi się
    // odsunąć o zmierzoną szerokość liczby — inaczej przy trzycyfrowym ruchu
    // napisy wchodzą na siebie.
    const wartosci = [s.atak, s.obrona, ruchNaDzis(this.stan)];
    const dodatki = [
      s.atak - b.atak,
      s.obrona - b.obrona,
      s.ruchMax - b.ruchMax + (ruchNaDzis(this.stan) - s.ruchMax),
    ];
    wartosci.forEach((w, i) => {
      const t = this.statTeksty[i];
      t.setText(String(w));
      const d = this.statDodatki[i];
      d.setText(dodatki[i] > 0 ? `+${dodatki[i]}` : '');
      d.setX(t.x - t.width - 16);
    });

    // Lista modyfikatorów: co konkretnie daje sprzęt i awanse. Wiersz na
    // źródło, żeby dało się przeczytać „skąd to mam", a nie tylko „ile mam".
    // Wpisy muszą mieścić się w JEDNYM wierszu każdy: zawijanie w kolumnie
    // szerokiej na 200 px zjadało po dwa wiersze na wpis i lista wychodziła
    // poza panel na pas armii. Stąd skróty zamiast pełnych nazw statystyk.
    const skrotem = (a: number | undefined, o: number | undefined, r: number | undefined) =>
      [a ? `+${a} at.` : '', o ? `+${o} obr.` : '', r ? `+${r} ruch` : ''].filter(Boolean).join(' ');
    const skroc = (t: string, n: number) => (t.length > n ? `${t.slice(0, n - 1)}…` : t);

    const linie: string[] = [];
    if (bonus.atak || bonus.obrona || bonus.ruch) {
      linie.push(`Awanse   ${skrotem(bonus.atak, bonus.obrona, bonus.ruch)}`);
    }
    for (const id of b.artefakty) {
      const a = artefaktPoId(id);
      if (!a) continue;
      linie.push(`${skroc(a.nazwa, 17)}   ${skrotem(a.atak, a.obrona, a.ruch)}`);
    }
    // Lista ma ograniczoną wysokość: piąty wiersz wyszedłby poza kolumnę
    // i położył się na pasie armii. Nadmiar zbieramy w jedną linijkę.
    const widoczne = linie.length > 3 ? [...linie.slice(0, 2), `…i jeszcze ${linie.length - 2}`] : linie;
    // Ten sam wzór co w `battle.ts` — gdyby rozjechał się z tamtym, panel
    // obiecywałby co innego, niż liczy bitwa.
    const zysk = Math.round(
      Math.min(ATAK_BOHATERA_MAKS, ATAK_BOHATERA_ZA_PUNKT * Math.max(0, s.atak)) * 100
    );
    const oslona = Math.round(
      Math.min(OBRONA_BOHATERA_MAKS, OBRONA_BOHATERA_ZA_PUNKT * Math.max(0, s.obrona)) * 100
    );
    this.wplywNaBitwe.setText(`w bitwie:  +${zysk}% obrażeń  ·  −${oslona}% otrzymywanych`);

    this.modyfikatory.setText(
      widoczne.length ? widoczne.join('\n') : 'Nic — na razie liczysz na siebie.'
    );

    // Artefakty: posiadane świecą pełną barwą klasy, brakujące są przygaszone.
    // Widok „czego jeszcze nie mam" jest tu równie ważny jak „co mam" — to on
    // robi ze zbierania cel.
    for (const kont of this.artefaktIkony) {
      const a = kont.getData('artefakt') as Artefakt;
      const g = kont.getData('tlo') as Phaser.GameObjects.Graphics;
      const ikona = kont.getData('ikona') as Phaser.GameObjects.Image;
      const podpis = kont.getData('podpis') as Phaser.GameObjects.Text;
      const ma = b.artefakty.includes(a.id);
      const bok = 62;
      g.clear();
      // Gniazdo jest WNĘKĄ — zawsze, także dla artefaktu, którego nie mamy.
      // Przedmiot dopiero w niej siedzi, na własnej płytce w barwie klasy.
      // Poprzednia wersja malowała cały kafelek na kolor klasy i przez to
      // rzadkość czytała się jako „inny kafelek", a nie jako „inna rzecz".
      wneka(g, 0, 0, bok, bok, 9);
      if (ma) {
        // Rzadkość siedzi na KRAWĘDZI GNIAZDA, a poświata jest zamknięta w
        // jego wnętrzu. Poprzednia wersja malowała halo dolepione pod ikoną,
        // rozlewające się poza obrys — czytało się jak podklejona poświata,
        // a nie jak oprawa gniazda. Teraz kolor mówi „to gniazdo trzyma
        // relikt", a nie „ta ikona świeci".
        const cx = bok / 2;
        const cy = bok / 2;
        const moc = a.klasa === 'relikt' ? 0.5 : a.klasa === 'znaczny' ? 0.32 : 0.18;
        // Poświata wewnątrz wnęki: pierścienie wpisane w prostokąt gniazda,
        // więc nic nie wychodzi poza jego krawędź.
        for (let i = 5; i >= 1; i--) {
          const wc = 5 + i * 3;
          g.fillStyle(BARWA_KLASY[a.klasa], (moc / 5) * (6 - i) * 0.34);
          g.fillRoundedRect(wc, wc, bok - wc * 2, bok - wc * 2, 8);
        }
        // Przedmiot: okrągły medalion w metalowej oprawie. Krągłość kontra
        // kwadratowe gniazdo — kontrast kształtów zamiast kontrastu koloru.
        const r = bok / 2 - 13;
        g.fillStyle(C.shadow, 0.5);
        g.fillCircle(cx + 1, cy + 3, r);
        g.fillStyle(OBRYS_KLASY[a.klasa], 1);
        g.fillCircle(cx, cy, r);
        g.fillStyle(mix(BARWA_KLASY[a.klasa], C.panel, 0.35), 1);
        g.fillCircle(cx, cy, r - 3);
        g.fillStyle(C.white, 0.3);
        g.fillCircle(cx, cy - r * 0.3, r * 0.62);
        // Obrys gniazda w barwie klasy — dwie kreski, bo jedna czyta się jak
        // obwódka tabeli, a dwie jak oprawa.
        g.lineStyle(2.5, OBRYS_KLASY[a.klasa], 0.95);
        g.strokeRoundedRect(1, 1, bok - 2, bok - 2, 8);
        g.lineStyle(1.5, BARWA_KLASY[a.klasa], 0.7);
        g.strokeRoundedRect(4, 4, bok - 8, bok - 8, 6);
      }
      ikona.setAlpha(ma ? 1 : 0.16);
      ikona.setDisplaySize(ma ? bok - 34 : bok - 20, ma ? bok - 34 : bok - 20);
      podpis.setAlpha(ma ? 1 : 0.4);
    }
    const licznikArt = this.children.getByName('licznik-artefaktow') as Phaser.GameObjects.Text;
    // Siatka i licznik obejmują artefakty do zbierania. Cel misji (Księżycowy
    // Kamień) nie ma gniazda w siatce — pokazuje go karta pod nią, jako
    // najważniejszą rzecz, którą bohater niesie.
    const zebrane = b.artefakty.filter((id) => ARTEFAKTY_LOSOWE.some((a) => a.id === id)).length;
    licznikArt?.setText(`ZEBRANE: ${zebrane} z ${ARTEFAKTY_LOSOWE.length}`);
    this.pokazArtefakt();

    this.armiaPodsumowanie.setText(`${lacznie(b.armia)} stworków w ${zywe(b.armia).length} stosach`);
    this.odswiezSloty();
    this.powiedz();
  }

  private odswiezSloty() {
    const armia = this.stan.bohater.armia;
    for (const s of this.sloty) {
      const o: Oddzial | null = armia[s.indeks];
      // Nazwy nie ma na portrecie: zasłaniałaby stwora. Mówi ją podpowiedź
      // po najechaniu, jak w Heroes.
      s.gniazdo.ustaw(o ? o.sprite : null, o?.ile);
      s.gniazdo.zaznacz(this.wybrany === s.indeks);
      s.gniazdo.przygas(this.ciagniety === s.indeks ? 0.3 : 1);
    }
  }

  private zamknij() {
    this.registry.set(KLUCZ_STANU, this.stan);
    this.scene.start('adventure');
  }
}
