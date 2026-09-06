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
} from '../data/armia';
import { planszaPrzygody } from '../data/plansza';
import { C, E, H, T, Z, body, display } from '../visual/theme';
import { makeHudButton, mix, plate } from '../visual/hud';
import { ICON, buildIcons, icon } from '../visual/icons';
import { BARWA_KLASY, OBRYS_KLASY, buildArtefakty, kluczArtefaktu } from '../visual/artefakty';
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
const SLOT_BOK = 92;
const SLOT_ODSTEP = 12;
const ARMIA_Y = TRESC_Y + TRESC_H + 32;

type Skrot = 'brak' | 'polowa' | 'jeden';

/** Kolejność klas — karta pokazuje domyślnie najmocniejszy noszony artefakt. */
const WAGA_KLASY = { drobny: 1, znaczny: 2, relikt: 3 } as const;

interface WidokSlotu {
  indeks: number;
  kontener: Phaser.GameObjects.Container;
  tlo: Phaser.GameObjects.Graphics;
  ramka: Phaser.GameObjects.Graphics;
  rysunek: Phaser.GameObjects.Image;
  licznik: Phaser.GameObjects.Text;
  nazwa: Phaser.GameObjects.Text;
  pusty: Phaser.GameObjects.Text;
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
    // Sprite'y ładujemy z armii, którą naprawdę mamy — nie z całej listy
    // frakcji. Ekran bohatera potrafi być pierwszą sceną po wczytaniu strony
    // (przeładowanie z otwartym ekranem), więc nie wolno zakładać, że tekstury
    // wgrała już mapa.
    for (const o of zywe(this.wczytajStan().bohater.armia)) {
      this.load.image(`p-${o.sprite}`, `${b}sprites/${o.sprite}.png`);
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
    plate(g, RAMA.x, RAMA.y, RAMA.w, RAMA.h, 18, C.panel, C.panelDeep, {
      light: 0.2,
      dark: 0.2,
      gloss: 0.14,
      drop: 6,
      edgeW: 4,
    });

    // Belka nagłówka — ciemna wstęga przez całą szerokość, jak w oknach
    // wieszcza we wzorcu. Trzyma imię i zamknięcie, a przy okazji odcina
    // treść od górnej krawędzi ramy.
    g.fillStyle(C.panelDeep, 1);
    g.fillRoundedRect(RAMA.x + 10, RAMA.y + 10, RAMA.w - 20, NAGLOWEK_H, 12);
    g.fillStyle(C.white, 0.1);
    g.fillRoundedRect(RAMA.x + 14, RAMA.y + 12, RAMA.w - 28, NAGLOWEK_H * 0.42, 10);
    g.lineStyle(2, C.gold, 0.85);
    g.strokeRoundedRect(RAMA.x + 10, RAMA.y + 10, RAMA.w - 20, NAGLOWEK_H, 12);

    // Cztery narożniki: krótkie złote kątowniki. We wzorcu rogi ramy są
    // wykuwane osobno i to one mówią, że okno jest przedmiotem, a nie
    // prostokątem. Rysujemy je jako kreski, nie jako grafikę do wczytania.
    const r = 26;
    g.lineStyle(3, C.gold, 0.9);
    for (const [sx, sy] of [
      [1, 1],
      [-1, 1],
      [1, -1],
      [-1, -1],
    ] as Array<[number, number]>) {
      const x = sx > 0 ? RAMA.x + 6 : RAMA.x + RAMA.w - 6;
      const y = sy > 0 ? RAMA.y + 6 : RAMA.y + RAMA.h - 6;
      g.beginPath();
      g.moveTo(x + sx * r, y);
      g.lineTo(x, y);
      g.lineTo(x, y + sy * r);
      g.strokePath();
    }

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
    plate(g, x, y, w, h, 12, mix(C.panel, C.panelDeep, 0.14), C.panelDeep, {
      light: 0.16,
      dark: 0.18,
      gloss: 0.1,
      drop: 3,
      edgeW: 2,
    });
    // Podpis pola leży na wstędze wpuszczonej w górną krawędź — bez niej
    // nagłówek zlewa się z treścią i pole wygląda jak nieopisany prostokąt.
    g.fillStyle(C.panelDeep, 1);
    g.fillRoundedRect(x, y, w, 26, { tl: 12, tr: 12, bl: 0, br: 0 });
    this.add
      .text(x + w / 2, y + 13, tytul, { ...body(12, H.goldLight), fontStyle: 'bold' })
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
    obrecz.fillStyle(C.shadow, 0.35);
    obrecz.fillCircle(px, py + 4, 49);
    obrecz.fillStyle(C.goldDeep, 1);
    obrecz.fillCircle(px, py, 48);
    obrecz.fillStyle(C.gold, 1);
    obrecz.fillCircle(px, py, 44);
    obrecz.fillStyle(mix(C.panel, C.panelDeep, 0.5), 1);
    obrecz.fillCircle(px, py, 39);
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
    const wiersze: Array<[string, string]> = [
      [ICON.sword, 'Atak'],
      [ICON.shield, 'Obrona'],
      [ICON.boot, 'Ruch'],
    ];
    wiersze.forEach(([ikona, nazwa], i) => {
      const wy = TRESC_Y + 198 + i * 38;
      const g = this.add.graphics().setDepth(Z.hud + 2);
      plate(g, dx, wy - 16, dw, 32, 8, mix(C.panel, C.panelDeep, 0.3), C.panelDeep, {
        light: 0.14,
        dark: 0.14,
        gloss: 0.08,
        drop: 0,
        edgeW: 1.5,
      });
      icon(this, ikona as never, dx + 20, wy, 20).setDepth(Z.hud + 3);
      this.add
        .text(dx + 38, wy, nazwa, body(12, H.ink))
        .setOrigin(0, 0.5)
        .setDepth(Z.hud + 3);
      this.statDodatki[i] = this.add
        .text(dx + dw - 12, wy, '', { ...body(11, '#2f8f3f'), fontStyle: 'bold' })
        .setOrigin(1, 0.5)
        .setDepth(Z.hud + 3);
      this.statTeksty[i] = this.add
        .text(dx + dw - 12, wy, '', display(15))
        .setOrigin(1, 0.5)
        .setDepth(Z.hud + 3);
    });

    this.add
      .text(LEWA.x + LEWA.w / 2, TRESC_Y + 306, 'CO DAJE SPRZĘT', {
        ...body(11, H.inkSoft),
        fontStyle: 'bold',
      })
      .setOrigin(0.5)
      .setDepth(Z.hud + 3);
    this.modyfikatory = this.add
      .text(LEWA.x + 16, TRESC_Y + 322, '', { ...body(11, H.ink), lineSpacing: 3 })
      .setOrigin(0, 0)
      .setDepth(Z.hud + 3)
      .setWordWrapWidth(LEWA.w - 32);
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

    ARTEFAKTY.forEach((a, i) => {
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
      .text(ARTE.x + ARTE.w / 2, TRESC_Y + 218, '', { ...body(11, H.inkSoft), fontStyle: 'bold' })
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

    const bok = (UMIEJ.w - 3 * 14) / 2;
    for (let i = 0; i < 4; i++) {
      const gx = UMIEJ.x + 14 + (i % 2) * (bok + 14);
      const gy = TRESC_Y + 46 + Math.floor(i / 2) * (bok + 16);
      const g = this.add.graphics().setDepth(Z.hud + 2);
      // Gniazdo puste rysujemy przerywaną obwódką i wpuszczonym tłem: to jest
      // umówiony znak „tu coś będzie", a nie wyłączony przycisk.
      g.fillStyle(mix(C.panel, C.panelDeep, 0.34), 1);
      g.fillRoundedRect(gx, gy, bok, bok, 10);
      g.fillStyle(C.shadow, 0.08);
      g.fillRoundedRect(gx, gy, bok, 8, { tl: 10, tr: 10, bl: 0, br: 0 });
      g.lineStyle(2, C.panelDeep, 0.45);
      const krok = 9;
      for (let t = 0; t < 4; t++) {
        const [x1, y1, x2, y2] = [
          [gx + 10, gy, gx + bok - 10, gy],
          [gx + bok, gy + 10, gx + bok, gy + bok - 10],
          [gx + bok - 10, gy + bok, gx + 10, gy + bok],
          [gx, gy + bok - 10, gx, gy + 10],
        ][t];
        const dlugosc = Math.hypot(x2 - x1, y2 - y1);
        for (let d = 0; d < dlugosc; d += krok * 2) {
          const a = d / dlugosc;
          const bb = Math.min(1, (d + krok) / dlugosc);
          g.beginPath();
          g.moveTo(x1 + (x2 - x1) * a, y1 + (y2 - y1) * a);
          g.lineTo(x1 + (x2 - x1) * bb, y1 + (y2 - y1) * bb);
          g.strokePath();
        }
      }
      // Rąb w środku — kształt gniazda umiejętności ze wzorca, przygaszony.
      const cx = gx + bok / 2;
      const cy = gy + bok / 2 - 6;
      g.fillStyle(C.panelDeep, 0.18);
      g.beginPath();
      g.moveTo(cx, cy - 20);
      g.lineTo(cx + 20, cy);
      g.lineTo(cx, cy + 20);
      g.lineTo(cx - 20, cy);
      g.closePath();
      g.fillPath();
      this.add
        .text(cx, gy + bok - 18, 'miejsce na\numiejętność', {
          ...body(10, H.inkSoft),
          align: 'center',
        })
        .setOrigin(0.5)
        .setDepth(Z.hud + 3);
    }

    this.add
      .text(
        UMIEJ.x + UMIEJ.w / 2,
        TRESC_Y + TRESC_H - 34,
        'Umiejętności wchodzą do gry później.\nMiejsce na nie jest już przygotowane.',
        { ...body(11, H.inkSoft), align: 'center' }
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
    const g = this.add.graphics().setDepth(Z.hud + 1);
    plate(g, pasX, ARMIA_Y - 26, pasW, SLOT_BOK + 62, 12, C.panelDeep, C.shadow, {
      light: 0.1,
      dark: 0.18,
      gloss: 0.06,
      drop: 3,
      edgeW: 2,
    });
    this.add
      .text(pasX + 14, ARMIA_Y - 16, 'ARMIA', { ...body(12, H.goldLight), fontStyle: 'bold' })
      .setOrigin(0, 0)
      .setDepth(Z.hud + 2);
    this.armiaPodsumowanie = this.add
      .text(pasX + pasW - 14, ARMIA_Y - 16, '', body(12, H.goldLight))
      .setOrigin(1, 0)
      .setDepth(Z.hud + 2);

    for (let i = 0; i < SLOTY_ARMII; i++) {
      const x = this.slotX(i);
      const y = ARMIA_Y + 6;
      const tlo = this.add.graphics();
      const ramka = this.add.graphics();
      const rysunek = this.add.image(SLOT_BOK / 2, SLOT_BOK / 2 - 8, 'bohater').setVisible(false);
      const nazwa = this.add
        .text(SLOT_BOK / 2, SLOT_BOK - 26, '', { ...display(10), strokeThickness: 3 })
        .setOrigin(0.5)
        .setVisible(false);
      // Tabliczka z liczebnością siedzi NA dolnej krawędzi slotu, zachodząc
      // na nią — tak samo jak liczba oddziału we wzorcu. Wpisana w środek
      // gniazda zlewałaby się z sylwetką, a pod gniazdem odkleiłaby się od
      // niego i zaczęła wyglądać jak podpis.
      const plakietka = this.add.graphics().setVisible(false);
      plate(plakietka, SLOT_BOK / 2 - 24, SLOT_BOK - 14, 48, 24, 12, C.gold, C.goldDeep, {
        light: 0.26,
        dark: 0.24,
        gloss: 0.3,
        drop: 2,
        edgeW: 2,
      });
      const licznik = this.add
        .text(SLOT_BOK / 2, SLOT_BOK - 2, '', display(15, H.shadow, C.goldLight))
        .setOrigin(0.5)
        .setVisible(false);
      const pusty = this.add
        .text(SLOT_BOK / 2, SLOT_BOK / 2, String(i + 1), display(22, H.inkSoft))
        .setOrigin(0.5)
        .setAlpha(0.4);
      const kontener = this.add
        .container(x, y, [tlo, ramka, rysunek, nazwa, plakietka, licznik, pusty])
        .setDepth(Z.hud + 2)
        .setSize(SLOT_BOK, SLOT_BOK);
      kontener.setData('plakietka', plakietka);
      this.sloty.push({ indeks: i, kontener, tlo, ramka, rysunek, licznik, nazwa, pusty });

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
    const im = this.add.image(0, 0, `p-${o.sprite}`);
    im.setScale(Math.min(1, (SLOT_BOK - 26) / im.height));
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

    const zaslona = this.add
      .rectangle(0, 0, EKRAN_W, EKRAN_H, 0x05131f, 0.55)
      .setOrigin(0, 0)
      .setDepth(Z.overlay)
      .setInteractive();
    const g = this.add.graphics().setDepth(Z.overlay + 1);
    plate(g, ox, oy, ow, oh, 14, C.panel, C.panelDeep, {
      light: 0.2,
      dark: 0.2,
      gloss: 0.16,
      drop: 6,
      edgeW: 3,
    });
    g.fillStyle(C.panelDeep, 1);
    g.fillRoundedRect(ox, oy, ow, 34, { tl: 14, tr: 14, bl: 0, br: 0 });

    const czesci: Phaser.GameObjects.GameObject[] = [zaslona, g];
    const dodaj = <X extends Phaser.GameObjects.GameObject>(o: X) => {
      czesci.push(o);
      return o;
    };

    dodaj(
      this.add
        .text(ox + ow / 2, oy + 17, `PODZIEL: ${zrodlo.nazwa}`, {
          ...body(13, H.goldLight),
          fontStyle: 'bold',
        })
        .setOrigin(0.5)
        .setDepth(Z.overlay + 2)
    );

    // Dwie liczby obok siebie: ile zostaje, ile odchodzi. To jest cała treść
    // okna — suwak z jedną liczbą kazałby dziecku odejmować w pamięci.
    const lewy = dodaj(
      this.add.text(ox + ow * 0.28, oy + 92, '', display(30)).setOrigin(0.5).setDepth(Z.overlay + 2)
    ) as Phaser.GameObjects.Text;
    const prawy = dodaj(
      this.add.text(ox + ow * 0.72, oy + 92, '', display(30, H.gold)).setOrigin(0.5).setDepth(Z.overlay + 2)
    ) as Phaser.GameObjects.Text;
    dodaj(
      this.add
        .text(ox + ow * 0.28, oy + 122, `zostaje w slocie ${z + 1}`, body(10, H.inkSoft))
        .setOrigin(0.5)
        .setDepth(Z.overlay + 2)
    );
    dodaj(
      this.add
        .text(ox + ow * 0.72, oy + 122, `idzie do slotu ${doc + 1}`, body(10, H.inkSoft))
        .setOrigin(0.5)
        .setDepth(Z.overlay + 2)
    );
    dodaj(this.add.text(ox + ow / 2, oy + 92, '→', display(24, H.inkSoft)).setOrigin(0.5).setDepth(Z.overlay + 2));

    const odswiezOkno = () => {
      lewy.setText(String(zrodlo.ile - ile));
      prawy.setText(String(ile));
    };

    const strzalka = (x: number, kier: number, etykieta: string) =>
      dodaj(
        this.add
          .text(x, oy + 56, etykieta, display(20, H.ink))
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
        tone: mix(C.panel, C.panelDeep, 0.4),
        toneDeep: C.panelDeep,
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
      toneDeep: C.panelDeep,
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
      this.powiedz(`Slot ${i + 1} — pusty. Przeciągnij tu oddział, żeby go rozdzielić.`);
      return;
    }
    this.powiedz(`${o.ile} × ${o.nazwa}   ·   poziom ${o.tier + 1}`);
  }

  private powiedz(tekst?: string) {
    this.podpowiedz?.setText(
      tekst ??
        'Przeciągnij oddział na inny slot, żeby go przenieść, połączyć albo zamienić. ' +
          'Na puste miejsce — żeby podzielić: Shift dzieli na pół, Ctrl odkłada jednego.'
    );
  }

  /** Odmowa musi być widoczna — sam brak zmiany wygląda jak zacięcie gry. */
  private drgnij(i: number) {
    const s = this.sloty[i];
    if (!s) return;
    const x = this.slotX(i);
    this.tweens.add({
      targets: s.kontener,
      x: { from: x - 5, to: x },
      duration: 220,
      ease: 'Elastic.easeOut',
    });
  }

  private blysk(i: number) {
    const s = this.sloty[i];
    if (!s) return;
    this.tweens.add({
      targets: s.kontener,
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
    const dy = TRESC_Y + 162;
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
      d.setX(t.x - t.width - 8);
    });

    // Lista modyfikatorów: co konkretnie daje sprzęt i awanse. Wiersz na
    // źródło, żeby dało się przeczytać „skąd to mam", a nie tylko „ile mam".
    const linie: string[] = [];
    if (bonus.atak || bonus.obrona || bonus.ruch) {
      const cz = [
        bonus.atak ? `+${bonus.atak} atak` : '',
        bonus.obrona ? `+${bonus.obrona} obrona` : '',
        bonus.ruch ? `+${bonus.ruch} ruchu` : '',
      ].filter(Boolean);
      linie.push(`Awanse: ${cz.join(', ')}`);
    }
    for (const id of b.artefakty) {
      const a = artefaktPoId(id);
      if (!a) continue;
      const cz = [
        a.atak ? `+${a.atak} atak` : '',
        a.obrona ? `+${a.obrona} obrona` : '',
        a.ruch ? `+${a.ruch} ruchu` : '',
      ].filter(Boolean);
      linie.push(`${a.nazwa}: ${cz.join(', ')}`);
    }
    // Lista ma ograniczoną wysokość: piąty wiersz wyszedłby poza kolumnę
    // i położył się na pasie armii. Nadmiar zbieramy w jedną linijkę.
    const widoczne = linie.length > 4 ? [...linie.slice(0, 3), `…i jeszcze ${linie.length - 3}`] : linie;
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
      plate(g, 0, 0, bok, bok, 9, ma ? BARWA_KLASY[a.klasa] : mix(C.panel, C.panelDeep, 0.34), ma ? OBRYS_KLASY[a.klasa] : C.panelDeep, {
        light: ma ? 0.24 : 0.1,
        dark: ma ? 0.22 : 0.12,
        gloss: ma ? 0.24 : 0.06,
        drop: ma ? 2 : 0,
        edgeW: ma ? 2.5 : 1.5,
      });
      ikona.setAlpha(ma ? 1 : 0.22);
      podpis.setAlpha(ma ? 1 : 0.4);
    }
    const licznikArt = this.children.getByName('licznik-artefaktow') as Phaser.GameObjects.Text;
    licznikArt?.setText(`ZEBRANE: ${b.artefakty.length} z ${ARTEFAKTY.length}`);
    this.pokazArtefakt();

    this.armiaPodsumowanie.setText(`${lacznie(b.armia)} stworków w ${zywe(b.armia).length} stosach`);
    this.odswiezSloty();
    this.powiedz();
  }

  private odswiezSloty() {
    const armia = this.stan.bohater.armia;
    for (const s of this.sloty) {
      const o: Oddzial | null = armia[s.indeks];
      const wybrany = this.wybrany === s.indeks;

      s.tlo.clear();
      plate(
        s.tlo,
        0,
        0,
        SLOT_BOK,
        SLOT_BOK,
        10,
        o ? mix(C.panel, C.panelDeep, 0.22) : mix(C.panelDeep, C.shadow, 0.35),
        o ? C.panelDeep : C.shadow,
        { light: o ? 0.18 : 0.06, dark: 0.2, gloss: o ? 0.14 : 0.04, drop: 0, edgeW: 2 }
      );
      // Pusty slot dostaje wpuszczone dno: ma wyglądać jak wolne MIEJSCE,
      // a nie jak wyłączona karta.
      if (!o) {
        s.tlo.fillStyle(C.shadow, 0.22);
        s.tlo.fillRoundedRect(6, 6, SLOT_BOK - 12, SLOT_BOK - 12, 7);
      }

      s.ramka.clear();
      if (wybrany) {
        s.ramka.lineStyle(3, C.gold, 1);
        s.ramka.strokeRoundedRect(-2, -2, SLOT_BOK + 4, SLOT_BOK + 4, 12);
        s.ramka.lineStyle(6, C.gold, 0.25);
        s.ramka.strokeRoundedRect(-4, -4, SLOT_BOK + 8, SLOT_BOK + 8, 14);
      }

      if (o) {
        s.rysunek.setTexture(`p-${o.sprite}`).setVisible(true);
        s.rysunek.setScale(Math.min(1, (SLOT_BOK - 26) / s.rysunek.height));
        s.rysunek.setAlpha(this.ciagniety === s.indeks ? 0.3 : 1);
        s.nazwa.setText(o.nazwa).setVisible(true);
        s.licznik.setText(String(o.ile)).setVisible(true);
        (s.kontener.getData('plakietka') as Phaser.GameObjects.Graphics).setVisible(true);
        s.pusty.setVisible(false);
      } else {
        s.rysunek.setVisible(false);
        s.nazwa.setVisible(false);
        s.licznik.setVisible(false);
        (s.kontener.getData('plakietka') as Phaser.GameObjects.Graphics).setVisible(false);
        s.pusty.setVisible(true);
      }
    }
  }

  private zamknij() {
    this.registry.set(KLUCZ_STANU, this.stan);
    this.scene.start('adventure');
  }
}
