import Phaser from 'phaser';
import {
  BUDOWLE,
  SUROWCE,
  SUROWIEC_INFO,
  TEREN_INFO,
  artefaktPoId,
  brylaNa,
  brylaObiektu,
  budowlaPoId,
  data,
  dochod,
  kosztPola,
  nowaTura,
  obiektNa,
  odslon,
  odwiedz,
  odpowiedzNaPytanie,
  bonusPoziomu,
  poziom,
  postepPoziomu,
  strzezoneProzez,
  statystyki,
  trasa,
  wezZeSkrzyni,
  zSasiedniegoPola,
  zamknietaBrama,
  zasiegNaTure,
  dniNaTrase,
  type Krok,
  type Obiekt,
  type Oddzial,
  type Pytanie,
  type StanMapy,
  type WyborSkrzyni,
} from '../data/mapa';
import { planszaPrzygody } from '../data/plansza';
import { planszaPoId } from '../data/mapy';
import { turaWroga } from '../data/wrog-ai';
import { SLOTY_ARMII, dolacz, pustaArmia, zywe } from '../data/armia';
import { jestZapis, wczytajGre, zapiszGre } from '../data/zapis';
import { KAMPANIA, misjaPoId, wczytajPostep } from '../data/kampania';
import { celSlowami, coSieStalo, ocenGre, przyczynaPorazki, warunkiGry } from '../data/wynik';
import {
  efekt,
  ofertaAwansu,
  opisWartosci,
  POZIOMY,
  przyznaj,
  umiejetnoscPoId,
} from '../data/umiejetnosci';
import { C, E, FONT, H, Z, body, display } from '../visual/theme';
import { drawPanelBody, gradientText, makeHudButton, mix, plate } from '../visual/hud';
import { buildArtefakty, kluczArtefaktu } from '../visual/artefakty';
import { cienPod, listwa, naroznik, wneka } from '../visual/rama';
import { ICON, buildIcons } from '../visual/icons';
import { GORA, KAFEL, MARGINES, PANEL_W, PASEK_H } from '../visual/uklad';
import { dodajWode } from '../visual/woda';
import { wersjonujZasoby } from '../visual/zasoby';
import { migawkaStanu, sledzScene, zapisz } from '../dev/dziennik';
import {
  MUZYKA_MAPA,
  aktualizujAmbient,
  initSfx,
  loadSfx,
  sfx,
  startMusic,
  stopAmbient,
  stopMusic,
  toggleSfx,
} from '../audio/mapSfx';

/**
 * Mapa przygody.
 *
 * Układ jest przeniesiony z Heroes III: Horn of the Abyss, bo tę grę zna
 * odbiorca: mapa po lewej w ramie, prawa kolumna z minimapą, kartą bohatera
 * i polem komunikatu, na dole pasek surowców.
 *
 * Plansza ma 36 × 36 pól — rozmiar małej mapy z Heroes 3 — a w okno mieści się
 * 14 × 12. Dlatego wszystko, co leży na mapie, siedzi w jednym kontenerze
 * `swiat`, przyciętym maską do ramy i przesuwanym; HUD zostaje nieruchomy na
 * zewnątrz. To jedyne miejsce w tej scenie, gdzie współrzędne pola i piksela
 * się rozjeżdżają, więc przeliczenia idą wyłącznie przez `naEkran`/`zEkranu`.
 *
 * Zasady siedzą w `src/data/mapa.ts` i `src/data/zasady-h3.ts`; scena je pokazuje.
 */

/**
 * Prędkość przewijania kursorem przy krawędzi, w pikselach na sekundę.
 * Dobrane tak, żeby przejechanie całej planszy zajmowało jakieś trzy sekundy:
 * szybciej gubi się orientację, wolniej łatwiej sięgnąć po minimapę.
 */
const PREDKOSC_PRZEWIJANIA = 560;

/** Arkusz bohatera: 4 kierunki (wiersze) × 4 klatki chodu (kolumny). */
const BOHATER_KLATKA = 96;
const KIERUNEK_WIERSZ = { dol: 0, lewo: 1, prawo: 2, gora: 3 } as const;
type Kierunek = keyof typeof KIERUNEK_WIERSZ;

/**
 * Ile pikseli płótna mgły przypada na jedno pole planszy.
 *
 * Przy jednym pikselu na pole obrazek był rozciągany czterdziestoośmiokrotnie
 * i rozmycie z filtrowania sięgało pół pola w głąb odsłoniętego terenu —
 * cała mapa wyglądała przez to na przyciemnioną. Przy czterech pikselach
 * na pole rozmycie ma kilkanaście pikseli: granica jest wciąż miękka,
 * a odsłonięty teren zostaje w pełnym kolorze.
 */
const MGLA_GESTOSC = 4;
/** Mgła nie jest czarna. Ma zasłaniać, ale nie odbierać planszy koloru. */
const MGLA_ALFA = 0.88;

/** Klucze, pod którymi stan przeżywa przejście do bitwy i z powrotem. */
const KLUCZ_STANU = 'stan-mapy';
/** Skład armii sprzed bitwy (slot → liczebność) — z niego Uzdrowiciel liczy straty. */
const KLUCZ_PRZED_BITWA = 'armia-przed-bitwa';
const KLUCZ_WYNIKU = 'wynik-bitwy';
/** Katalog tła, z którego wczytano `plansza-0` — patrz `preload`. */
const KLUCZ_TLA = 'tlo-planszy';

const DOMYSLNA_PODPOWIEDZ =
  'Klik w pole pokazuje trasę, drugi klik w to samo miejsce — rusza.\n' +
  'Strzałki przesuwają mapę, spacja wraca do bohatera.\n' +
  'Klik w bohatera otwiera jego ekran.\n' +
  'Klawisz C pokazuje cele misji.';

export class AdventureScene extends Phaser.Scene {
  private stan!: StanMapy;
  private mapaX = MARGINES;
  private mapaY = GORA;

  private swiat!: Phaser.GameObjects.Container;
  /**
   * Kamera pokazująca planszę. Przycinanie robi jej prostokąt widoku, a nie
   * maska: maska na kontenerze w Phaserze 4 po prostu nie działała i świat
   * wychodził poza ramę. Nie było tego widać, dopóki mgła była niemal czarna
   * i zlewała się z tłem — po jej rozjaśnieniu wyszło od razu.
   */
  private kamera!: Phaser.Cameras.Scene2D.Camera;
  /**
   * Kamera okien dialogowych. Musi istnieć osobno, bo kamery rysują się
   * w kolejności dodania, a kamera planszy powstaje PO kamerze głównej —
   * więc wszystko, co główna narysuje w obrębie ramy mapy, plansza natychmiast
   * zamalowuje. Na tym poległo okno skrzyni: powstawało, przyjmowało
   * kliknięcia, ale było niewidoczne pod mapą i gra wyglądała na zawieszoną.
   */
  private kameraOkien!: Phaser.Cameras.Scene2D.Camera;
  private plansza!: Phaser.GameObjects.Image;
  /** Kwadrat shadera z animowaną wodą; `null`, gdy karta go nie uciągnie. */
  private woda: Phaser.GameObjects.Shader | null = null;
  private mgla!: Phaser.GameObjects.Image;
  private warstwaTrasy!: Phaser.GameObjects.Graphics;
  private bohaterObj!: Phaser.GameObjects.Container;
  private bohaterSprite!: Phaser.GameObjects.Sprite;
  private kierunek: Kierunek = 'dol';

  private podpisy: Record<string, Phaser.GameObjects.Text> = {};
  private dochody: Record<string, Phaser.GameObjects.Text> = {};
  private ikonyObiektow: Record<number, Phaser.GameObjects.Container> = {};
  /** Rysunki obiektów wraz z ich obiektami — do samodzielnego trafiania kliknięciem. */
  private trafienia: Array<{ o: Obiekt; im: Phaser.GameObjects.Image }> = [];
  private ruchTekst!: Phaser.GameObjects.Text;
  private statTeksty: Phaser.GameObjects.Text[] = [];
  private poziomTekst!: Phaser.GameObjects.Text;
  private doswPasek!: Phaser.GameObjects.Graphics;
  private dataTekst!: Phaser.GameObjects.Text;
  private podpowiedz!: Phaser.GameObjects.Text;
  private minimapa!: Phaser.GameObjects.Graphics;
  private ramkaWidoku!: Phaser.GameObjects.Graphics;
  private slotyArmii: Phaser.GameObjects.Container[] = [];
  /**
   * Znak przy kursorze — miecz nad tym, co skończy się bitwą, gwiazda nad
   * tym, co coś uruchomi (surowiec, skrzynia, budowla), klepsydra z liczbą
   * dni nad odległym celem trasy. Jak w Heroes 3, gdzie kursor sam mówił,
   * co się stanie, zanim się kliknęło.
   */
  private kursorZnak!: Phaser.GameObjects.Container;
  private kursorZnakTlo!: Phaser.GameObjects.Graphics;
  private kursorZnakIkona!: Phaser.GameObjects.Image;
  private kursorZnakTekst!: Phaser.GameObjects.Text;

  /** Zmierzone marginesy tekstur — liczone raz, bo to czytanie całego obrazka. */
  private marginesy = new Map<string, number>();
  /** Kanały alfa tekstur — do marginesów i do trafiania kliknięciem. */
  private alfy = new Map<string, { w: number; h: number; dane: Uint8Array } | null>();

  private trasaBiezaca: Krok[] | null = null;
  private zajety = false;
  /**
   * Gra się rozstrzygnęła i scena odlicza do ekranu wyniku. Osobno od
   * `zajety`, bo okna zamykane w tym czasie zdejmują `zajety` — a po
   * rozstrzygnięciu nic już nie może oddać graczowi sterowania.
   */
  private rozstrzygnieta = false;
  /**
   * Czy trwa właśnie animacja marszu — w odróżnieniu od `zajety`, który blokuje
   * kliknięcia też przy bitwach i innych animacjach. Tylko podczas marszu ma
   * sens przerywanie klikiem i zmiana trasy w locie, jak w Heroes 3.
   */
  private wRuchu = false;
  /** Klik podczas marszu: przerywa go i czeka na dokończenie bieżącego kroku. */
  private przerwijRuch = false;
  /** Cel klikniętego pola/obiektu, gdy klik przerwał trwający marsz. */
  private celPoPrzerwaniu: { x: number; y: number } | null = null;
  /** Ostatnie położenie kursora — do przewijania przy krawędzi. */
  private kursor: { x: number; y: number } | null = null;
  private przewX = 0;
  private przewY = 0;

  constructor() {
    super('adventure');
  }

  preload() {
    wersjonujZasoby(this);
    loadSfx(this, MUZYKA_MAPA);
    const b = import.meta.env.BASE_URL;
    // Tło zależy od planszy, a klucze tekstur zostają te same (`plansza-0`,
    // `woda-maska`) — sięga po nie kilka miejsc sceny i shader wody. Phaser
    // nie wczytuje drugi raz klucza, który już zna, więc przy zmianie
    // planszy (następna misja kampanii) stare tło trzeba najpierw usunąć.
    const tlo = `${b}${planszaPoId(this.wczytajStan().mapa).tlo}`;
    if (this.registry.get(KLUCZ_TLA) !== tlo) {
      this.textures.remove('plansza-0');
      this.textures.remove('woda-maska');
      this.registry.set(KLUCZ_TLA, tlo);
    }
    this.load.image('plansza-0', `${tlo}plansza-0.jpg`);
    this.load.image('woda-maska', `${tlo}woda-maska.png`);
    this.load.image('woda-zmarszczki', `${b}mapa/woda-zmarszczki.png`);
    this.load.spritesheet('bohater', `${b}mapa/bohater.png`, {
      frameWidth: BOHATER_KLATKA,
      frameHeight: BOHATER_KLATKA,
    });
    for (const n of [
      'sosna',
      'sosna-mala',
      'drzewo',
      'sosna-b',
      'drzewo-b',
      'skala',
      'skala-2',
      'kopiec',
      'kopiec-2',
      'krzak',
      'krzak-2',
      'pokeball',
      'jagody',
      'kamien-ewolucji',
      'odlamki',
      'sad',
      'kepa-las-1',
      'kepa-las-2',
      'kepa-las-3',
      'kepa-las-4',
      'kepa-skaly-1',
      'kepa-skaly-2',
      'kepa-skaly-3',
      'kepa-skaly-4',
      'kopalnia-pokeball',
      'kopalnia-odlamek',
      'kopalnia-kamien',
      // Budowle odwiedzane — nazwy plików biorą się z jednego miejsca
      // (`BUDOWLE`), więc dodanie budowli nie wymaga dopisywania jej tutaj.
      ...Object.values(BUDOWLE).map((b) => b.plik),
      'skrzynia',
      'zamek-las',
      'zamek-ogien',
      // Strażnice i namioty w obu barwach kluczy. Pliki robi
      // `tools/klucze_przemaluj.py` z jednej dostawy — patrz tamten skrypt.
      'straznica-zielony',
      'straznica-niebieski',
      'namiot-klucznika-zielony',
      'namiot-klucznika-niebieski',
      'chata-jasnowidza',
    ]) {
      this.load.image(`m-${n}`, `${b}mapa/${n}.png`);
    }
    const stan = this.wczytajStan();
    const potrzebne = new Set<string>();
    for (const o of zywe(stan.bohater.armia)) potrzebne.add(o.sprite);
    for (const ob of stan.obiekty) for (const o of ob.oddzialy ?? []) potrzebne.add(o.sprite);
    for (const s of potrzebne) this.load.image(`p-${s}`, `${b}sprites/${s}.png`);
  }

  /**
   * Stan mapy przeżywa przejście do bitwy i z powrotem, bo siedzi w rejestrze
   * gry, a nie w scenie. Gdyby powstawał w `create`, każdy powrót z bitwy
   * kasowałby zebrane surowce, zajęte kopalnie i odsłoniętą mgłę.
   */
  private wczytajStan(): StanMapy {
    const zapisany = this.registry.get(KLUCZ_STANU) as StanMapy | undefined;
    if (zapisany) {
      // Stan sprzed wprowadzenia licznika: zaczynamy od poziomu, na którym
      // bohater już jest, żeby wejście na mapę nie wysypało serii okien
      // za awanse, które dawno się wydarzyły.
      if (zapisany.bohater.poziomOdebrany === undefined) {
        zapisany.bohater.poziomOdebrany = poziom(zapisany.bohater.doswiadczenie);
      }
      return zapisany;
    }
    const nowy = planszaPrzygody();
    this.registry.set(KLUCZ_STANU, nowy);
    return nowy;
  }

  create() {
    sledzScene(this);
    // Phaser używa TEJ SAMEJ instancji sceny przy każdym `scene.start`, więc
    // pola klasy przeżywają przejście do bitwy i z powrotem. `zajety` zostawało
    // włączone po wyjściu do bitwy i po powrocie nie dało się już sterować
    // bohaterem. Reszta to tablice trzymające obiekty, których Phaser już nie ma.
    this.zajety = false;
    this.rozstrzygnieta = false;
    // `rozstrzygnij` wyłącza wejście całej sceny, a obiekt sceny (i jego
    // wtyczka wejścia) przeżywa do następnej gry — tu je włączamy z powrotem.
    this.input.enabled = true;
    if (this.input.keyboard) this.input.keyboard.enabled = true;
    this.wRuchu = false;
    this.przerwijRuch = false;
    this.celPoPrzerwaniu = null;
    this.trasaBiezaca = null;
    this.kierunek = 'dol';
    this.woda = null;
    this.przewX = 0;
    this.przewY = 0;
    this.slotyArmii = [];
    this.statTeksty = [];
    this.podpisy = {};
    this.dochody = {};
    this.ikonyObiektow = {};
    this.trafienia = [];
    this.marginesy.clear();
    this.alfy.clear();

    this.stan = this.wczytajStan();
    // Stan mapy jest tym, czego brakuje najbardziej w zgłoszeniach typu
    // „bohater utknął": pozycja, ruch, surowce i skład armii w jednym miejscu.
    migawkaStanu('mapa', () =>
      this.scene.isActive()
        ? {
            pole: `${this.stan.bohater.x},${this.stan.bohater.y}`,
            ruch: this.stan.bohater.ruch,
            armia: zywe(this.stan.bohater.armia).map((o) => `${o.sprite}×${o.ile}`),
            skarbiec: this.stan.skarbiec,
            zajety: this.zajety,
            trasa: this.trasaBiezaca?.length ?? 0,
          }
        : undefined
    );
    buildIcons(this);
    this.zbudujCien();
    this.przygotujAnimacje();

    // Wynik bitwy rozliczamy PRZED zbudowaniem świata. Wcześniej szło to po
    // `rysujObiekty`, więc pokonany strażnik był już narysowany, zanim ktokolwiek
    // oznaczył go jako pokonanego — znikał z zasad gry, ale zostawał na ekranie.
    this.rozliczBitwe();

    this.rysujTlo();
    this.budujSwiat();
    this.rysujPanel();
    this.rysujPasekSurowcow();
    this.rozdzielKamery();
    initSfx(this);
    startMusic(this, MUZYKA_MAPA);
    // Znak przy kursorze powstaje PO podziale kamer, jak każde okno: powstały
    // wcześniej trafiał w domyślny snapshot `kameraOkien.ignore(...)` i nie
    // rysowała go żadna kamera, bo `kamera` planszy i tak zamalowywała go
    // w obrębie mapy, zanim doszło do `naWierzchu`.
    this.zbudujKursor();
    this.odswiezWszystko();
    this.wysrodkujNaBohaterze(false);

    // Warunki misji — raz, na starcie, jak okno „Scenario Information"
    // w Heroes 2. Chwila zwłoki, żeby najpierw było widać mapę, na której
    // to wszystko się rozegra.
    if (this.stan.misja && !this.stan.warunkiPokazane) {
      this.time.delayedCall(450, () => {
        if (!this.stan.warunkiPokazane) this.pokazWarunki();
      });
    }

    // Wyciszenie, ten sam skrót i ten sam powód co w walce: dźwięku nie da
    // się przeczekać wzrokiem, więc kto go nie chce, musi mieć czym wyłączyć
    // go od razu.
    this.input.keyboard?.on('keydown-M', () => {
      const wlaczony = toggleSfx(this);
      this.napisUlotny(wlaczony ? 'Dźwięk włączony  (M)' : 'Dźwięk wyciszony  (M)');
    });

    this.input.on('pointerdown', (p: Phaser.Input.Pointer) => this.klikMapa(p));
    this.input.on('pointermove', (p: Phaser.Input.Pointer) => {
      this.kursor = { x: p.x, y: p.y };
      this.ruchMyszy(p);
    });
    // Kursor poza płótnem nie wysyła `pointermove`, więc bez tego mapa jechałaby
    // dalej po wyjściu myszy za okno — aż do końca planszy.
    this.input.on('gameout', () => {
      this.kursor = null;
      // Bez tego znak-kursor zostawał zawieszony w powietrzu, kiedy mysz
      // wyjeżdżała za okno gry — a systemowy kursor jest tam wyłączony.
      this.kursorZnak.setVisible(false);
      this.input.setDefaultCursor('default');
    });
    // Strzałki przesuwają widok. Na planszy 36 × 36 samo podążanie za bohaterem
    // nie wystarczy — trzeba móc się rozejrzeć, zanim się ruszy.
    this.input.keyboard?.on('keydown', (e: KeyboardEvent) => this.klawisz(e));
  }

  /**
   * Miękka plama cienia jako tekstura, rysowana raz na scenę.
   *
   * Elipsa z `fillEllipse` ma OSTRĄ krawędź, a cień kontaktowy nie ma żadnej —
   * gaśnie stopniowo. Ostry brzeg czyta się jak kałuża albo dziura w trawie,
   * a nie jak cień. Kilkadziesiąt elips o rosnącym promieniu i malejącym
   * kryciu daje zejście do zera, którego nie widać.
   */
  private zbudujCien() {
    if (this.textures.exists('t-cien')) return;
    const bok = 256;
    const g = this.add.graphics();
    const krokow = 72;
    for (let i = krokow; i > 0; i--) {
      const t = i / krokow;
      // Trzecia potęga zamiast kwadratu: ogon schodzi do zera znacznie
      // łagodniej, więc plama nie ma żadnej krawędzi, którą dałoby się
      // wskazać palcem — a to po niej poznaje się namalowany cień.
      g.fillStyle(0x000000, 0.03 * (1 - t) * (1 - t) * (1 - t));
      g.fillEllipse(bok / 2, bok / 4, bok * t, (bok / 2) * t);
    }
    g.generateTexture('t-cien', bok, bok / 2);
    g.destroy();
  }

  private przygotujAnimacje() {
    for (const [nazwa, wiersz] of Object.entries(KIERUNEK_WIERSZ)) {
      if (this.anims.exists(`chod-${nazwa}`)) continue;
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

  private get mapaW() {
    return this.stan.szer * KAFEL;
  }
  private get mapaH() {
    return this.stan.wys * KAFEL;
  }
  /** Ile mieści się w ramie — stąd wiadomo, o ile wolno przewinąć. */
  private get oknoW() {
    return 14 * KAFEL;
  }
  private get oknoH() {
    return 12 * KAFEL;
  }

  /** Środek pola w układzie świata (bez przewinięcia). */
  private naEkran(x: number, y: number) {
    return { x: x * KAFEL + KAFEL / 2, y: y * KAFEL + KAFEL / 2 };
  }

  /** Pole pod kursorem. Uwzględnia i ramę, i przewinięcie. */
  private zEkranu(px: number, py: number) {
    // Punkt na ekranie → punkt świata: odejmujemy początek prostokąta kamery
    // i dodajemy jej przewinięcie.
    const sx = this.kamera?.scrollX ?? 0;
    const sy = this.kamera?.scrollY ?? 0;
    return {
      x: Math.floor((px - this.mapaX + sx) / KAFEL),
      y: Math.floor((py - this.mapaY + sy) / KAFEL),
    };
  }

  private wGranicach(x: number, y: number) {
    return x >= 0 && y >= 0 && x < this.stan.szer && y < this.stan.wys;
  }

  private wRamie(px: number, py: number) {
    return (
      px >= this.mapaX &&
      py >= this.mapaY &&
      px < this.mapaX + this.oknoW &&
      py < this.mapaY + this.oknoH
    );
  }

  // ---------- przewijanie ----------

  private przewin(x: number, y: number, plynnie = true) {
    this.przewX = Phaser.Math.Clamp(x, this.oknoW - this.mapaW, 0);
    this.przewY = Phaser.Math.Clamp(y, this.oknoH - this.mapaH, 0);
    if (!this.kamera) return;
    if (plynnie) {
      this.tweens.add({
        targets: this.kamera,
        scrollX: -this.przewX,
        scrollY: -this.przewY,
        duration: 220,
        ease: E.soft,
        onUpdate: () => this.rysujRamkeWidoku(),
      });
    } else {
      this.kamera.setScroll(-this.przewX, -this.przewY);
    }
    this.rysujRamkeWidoku();
  }

  private wysrodkujNa(x: number, y: number, plynnie = true) {
    this.przewin(this.oknoW / 2 - (x + 0.5) * KAFEL, this.oknoH / 2 - (y + 0.5) * KAFEL, plynnie);
  }

  private wysrodkujNaBohaterze(plynnie = true) {
    this.wysrodkujNa(this.stan.bohater.x, this.stan.bohater.y, plynnie);
  }

  /**
   * Dosuwa widok dopiero wtedy, gdy bohater zbliży się do brzegu ramy. Przy
   * centrowaniu co krok to mapa jedzie pod bohaterem, a nie bohater po mapie,
   * i po kilku krokach nie wiadomo, gdzie się jest.
   */
  private dosunDoBohatera() {
    // Margines to niemal trzecia część okna. Przy trzech polach trzeba było
    // dojść niemal do samej krawędzi, żeby kadr drgnął — a wtedy człowiek
    // idzie w ciemno, bo nie widzi, dokąd.
    const margines = 4.5 * KAFEL;
    const ex = this.stan.bohater.x * KAFEL + this.przewX;
    const ey = this.stan.bohater.y * KAFEL + this.przewY;
    if (ex < margines || ey < margines || ex > this.oknoW - margines || ey > this.oknoH - margines) {
      this.wysrodkujNaBohaterze();
    }
  }

  /**
   * Przewijanie kursorem przy krawędzi ramy — jak w Heroes 3.
   *
   * Strzałki i minimapa już były, ale obie wymagają oderwania się od tego,
   * co się właśnie ogląda. Przy planszy 36 × 36, z której widać jedną trzecią,
   * zerknięcie „co jest kawałek dalej" to najczęstszy ruch w całej grze.
   *
   * Prędkość jest liczona z czasu klatki, a nie stała na klatkę: gra chodzi
   * raz po 60, raz po 20 klatek na sekundę i bez tego mapa jechałaby trzy razy
   * wolniej dokładnie wtedy, gdy jest najwięcej do narysowania.
   */
  update(_czas: number, delta: number) {
    if (!this.kursor || this.zajety) return;
    const { x, y } = this.kursor;
    // Pas jest liczony od ramy mapy, nie od okna: po prawej stronie leży panel
    // i przewijanie miało się włączać nad mapą, a nie nad portretem bohatera.
    const pas = KAFEL * 0.75;
    const lewo = this.mapaX;
    const gora = this.mapaY;
    const prawo = this.mapaX + this.oknoW;
    const dol = this.mapaY + this.oknoH;
    if (x < lewo - pas || x > prawo + pas || y < gora - pas || y > dol + pas) return;

    const krok = (PREDKOSC_PRZEWIJANIA * delta) / 1000;
    let dx = 0;
    let dy = 0;
    if (x < lewo + pas) dx = krok;
    else if (x > prawo - pas) dx = -krok;
    if (y < gora + pas) dy = krok;
    else if (y > dol - pas) dy = -krok;
    if (dx === 0 && dy === 0) return;
    // Bez wygładzania: to ma być natychmiastowe i ciągłe. Tween co klatkę
    // nakładałby się sam na siebie i mapa szarpałaby się zamiast płynąć.
    this.przewin(this.przewX + dx, this.przewY + dy, false);
  }

  private klawisz(e: KeyboardEvent) {
    const skok = KAFEL * 3;
    const ruchy: Record<string, [number, number]> = {
      ArrowLeft: [skok, 0],
      ArrowRight: [-skok, 0],
      ArrowUp: [0, skok],
      ArrowDown: [0, -skok],
    };
    if (ruchy[e.key]) {
      e.preventDefault();
      this.przewin(this.przewX + ruchy[e.key][0], this.przewY + ruchy[e.key][1]);
    }
    if (e.key === ' ') {
      e.preventDefault();
      this.wysrodkujNaBohaterze();
    }
    if (e.key === 'g' || e.key === 'G') {
      e.preventDefault();
      this.kontynuujTrase();
    }
    if (e.key === 'c' || e.key === 'C') {
      e.preventDefault();
      this.pokazWarunki();
    }
  }

  /**
   * Kontynuuje wytyczoną trasę pod G (Go) — przydatne rano, gdy `koniecTury`
   * już pokazał zaznaczoną trasę sprzed dnia i zostaje tylko ruszyć, bez
   * ponownego celowania w to samo pole.
   *
   * M było zajęte wcześniej niż ten skrót powstał — wyciszenie dźwięku
   * (`keydown-M` wyżej) doszło z innej gałęzi tego samego dnia i wygrywa,
   * bo jest bliższe konwencji (M jak mute) niż M jak move.
   *
   * Heroes 3 nie miał do tego osobnego klawisza — tam wystarczał sam klik
   * w bohatera, bo trasa czekała już jako gotowa strzałka. U nas trasa jest
   * tylko narysowana, nie „aktywna" do samego kliknięcia, więc G daje ten
   * sam skrót jednym klawiszem.
   */
  private kontynuujTrase() {
    if (this.zajety || !this.trasaBiezaca || this.trasaBiezaca.length === 0) return;
    this.idz(this.trasaBiezaca);
  }

  // ---------- świat ----------

  private rysujTlo() {
    const g = this.add.graphics().setDepth(Z.sky);
    g.fillGradientStyle(C.skyTop, C.skyTop, C.skyBottom, C.skyBottom, 1);
    g.fillRect(0, 0, this.scale.width, this.scale.height);
    // W misji nagłówek mówi, KTÓRA to misja — dziecko wraca do gry po
    // tygodniu i pierwsze pytanie brzmi „gdzie ja jestem".
    const m = misjaPoId(this.stan.misja);
    this.add
      .text(
        MARGINES + 4,
        10,
        m ? `MISJA ${m.nr} · ${m.tytul.toUpperCase()}` : 'MAPA PRZYGODY',
        display(19, H.goldLight)
      )
      .setOrigin(0, 0)
      .setDepth(Z.hud);

    // Cele i wyjście do menu w górnej belce nad panelem — jedyne wolne
    // miejsce, które nie zabiera wysokości podpowiedziom ani minimapie.
    const px = this.mapaX + this.oknoW + 14;
    const polowa = (PANEL_W - 8) / 2;
    const cele = makeHudButton(this, {
      x: px + polowa / 2,
      y: 20,
      w: polowa,
      h: 28,
      icon: ICON.star,
      tone: C.gold,
      toneDeep: C.goldDeep,
      onClick: () => this.pokazWarunki(),
    });
    cele.setLabel('Cele (C)');
    const menu = makeHudButton(this, {
      x: px + polowa + 8 + polowa / 2,
      y: 20,
      w: polowa,
      h: 28,
      tone: mix(C.panel, C.panelDeep, 0.1),
      toneDeep: C.panelDeep,
      onClick: () => this.zapytajOWyjscie(),
    });
    menu.setLabel('Menu');
  }

  private budujSwiat() {
    // Rama idzie NAD światem, nie pod nim. Pod spodem przykrywała ją mapa
    // (maska tnie równo z ramą, więc na styku nie zostawało miejsca na złotą
    // kreskę) — a w HotA rama i tak nachodzi na krawędź planszy.
    const rama = this.add.graphics().setDepth(Z.hud - 1);
    rama.fillStyle(C.shadow, 0.5);
    rama.fillRoundedRect(this.mapaX - 8, this.mapaY - 8, this.oknoW + 16, this.oknoH + 16, 10);
    rama.lineStyle(4, C.goldDeep, 1);
    rama.strokeRoundedRect(this.mapaX - 6, this.mapaY - 6, this.oknoW + 12, this.oknoH + 12, 9);
    rama.lineStyle(2, C.gold, 1);
    rama.strokeRoundedRect(this.mapaX - 3, this.mapaY - 3, this.oknoW + 6, this.oknoH + 6, 7);

    this.swiat = this.add.container(0, 0).setDepth(Z.board);
    // Maska przycina świat do ramy. Bez niej mapa wychodzi na panel i na pasek
    // surowców — kontener sam z siebie niczego nie obcina.
    // Kształt maski musi być zwykłym obiektem sceny, tylko niewidocznym.
    // `make.graphics({}, false)` tworzy obiekt poza listą wyświetlania i maska
    // z niego po prostu nie działa — mapa wyjeżdżała wtedy na lewo poza ramę,
    // na panel i na pasek surowców.
    const ksztalt = this.add.graphics().setVisible(false);
    ksztalt.fillStyle(0xffffff, 1);
    ksztalt.fillRect(this.mapaX, this.mapaY, this.oknoW, this.oknoH);
    this.swiat.setMask(ksztalt.createGeometryMask());

    this.plansza = this.add.image(0, 0, 'plansza-0').setOrigin(0, 0).setDepth(-1);
    this.swiat.add(this.plansza);
    // Woda leży NAD planszą i przepisuje ją w całości, więc namalowana plansza
    // zostaje widoczna tylko wtedy, gdy shader się nie utworzył. Jest w ten
    // sposób zapasem, a nie martwym obrazkiem pod spodem.
    this.woda = dodajWode(this, this.mapaW, this.mapaH, () => this.kamera);
    if (this.woda) {
      this.woda.setDepth(-0.5);
      this.swiat.add(this.woda);
    }

    this.rysujPrzeszkody();
    this.rysujOzdoby();
    this.warstwaTrasy = this.add.graphics().setDepth(this.stan.wys + 1);
    this.swiat.add(this.warstwaTrasy);
    this.rysujObiekty();
    this.rysujBohatera();
    this.rysujMgle();

    this.kamera = this.cameras.add(this.mapaX, this.mapaY, this.oknoW, this.oknoH);
    this.kamera.setBounds(0, 0, this.mapaW, this.mapaH);
  }

  /**
   * Rozdziela, co widzi która kamera. MUSI iść na samym końcu `create`: lista
   * ignorowanych jest zdejmowana raz, więc wszystko dorysowane po niej kamera
   * planszy narysuje w środku mapy. Pasek surowców pojawiał się przez to dwa
   * razy — na dole ekranu i w poprzek planszy.
   */
  private rozdzielKamery() {
    this.cameras.main.ignore(this.swiat);
    this.kamera.ignore(this.children.list.filter((o) => o !== this.swiat));
    // Trzecia kamera, dodana NA SAMYM KOŃCU, więc rysująca PO planszy.
    // Kamery rysują się w kolejności dodania, a kamera planszy powstaje po
    // głównej — więc zamalowywała wszystko, co główna narysowała w prostokącie
    // mapy, łącznie z oknem skrzyni. Okno było wtedy niewidzialne, a gra
    // czekała na decyzję, której nie dało się podjąć: wyglądało to na
    // zawieszenie. Kopia listy, bo `ignore` przyjmuje ją przez referencję.
    this.kameraOkien = this.cameras.add(0, 0, this.scale.width, this.scale.height);
    this.kameraOkien.ignore([...this.children.list]);
  }

  /**
   * Oddaje obiekty kamerze okien: znikają i z HUD-u, i z planszy, a rysuje je
   * wyłącznie kamera nakładek. To jedyny sposób, żeby cokolwiek pojawiło się
   * NAD mapą — sama głębokość nie wystarczy, bo o kolejności decyduje kamera,
   * a nie `depth`.
   *
   * Wcześniej stało tu `tylkoHud`, które zabierało obiekt tylko kamerze
   * planszy. Chroniło przed rysowaniem okna wewnątrz mapy, ale nie przed
   * zamalowaniem go przez tę kamerę — a to była właśnie usterka.
   */
  private naWierzchu(...obiekty: Phaser.GameObjects.GameObject[]) {
    if (obiekty.length === 0) return;
    this.cameras.main.ignore(obiekty);
    this.kamera?.ignore(obiekty);
    this.cameras.main.ignore(obiekty);
  }

  /**
   * Znak przy kursorze — miecz, gwiazda albo klepsydra z liczbą dni, zależnie
   * od tego, co spotka bohatera na polu pod kursorem. Powstaje jak zwykły
   * element HUD, PRZED `rozdzielKamery`: ta metoda i tak weźmie go pod uwagę
   * przy dzieleniu, więc nie trzeba go osobno oddawać żadnej kamerze.
   */
  /**
   * Zastępuje kursor systemowy w całości — dotąd znak (miecz/gwiazda/klepsydra)
   * pływał OBOK zwykłej strzałki, więc podpowiedź i to, co naprawdę wskazywał
   * kursor, żyły osobno. Grot w (0,0) jest tym, co dotąd było samą strzałką
   * systemową — stoi dokładnie tam, gdzie wskaźnik myszy — a odznaka z ikoną
   * siedzi obok niego tak jak wcześniej.
   */
  private zbudujKursor() {
    const grot = this.add.graphics();
    grot.fillStyle(C.shadow, 0.9);
    grot.fillTriangle(1, 1, 1, 15, 11, 11);
    grot.fillStyle(C.white, 1);
    grot.fillTriangle(0, 0, 0, 13, 9, 9);
    grot.lineStyle(1.5, C.shadow, 0.8);
    grot.strokeTriangle(0, 0, 0, 13, 9, 9);

    const tlo = this.add.graphics();
    tlo.fillStyle(C.shadow, 0.6);
    tlo.fillCircle(16, 16, 13);
    tlo.lineStyle(2, C.gold, 0.9);
    tlo.strokeCircle(16, 16, 13);
    const ikona = this.add.image(16, 16, ICON.sword).setDisplaySize(16, 16).setVisible(false);
    const tekst = this.add
      .text(31, 28, '', { ...display(12, H.goldLight), fontStyle: 'bold' })
      .setOrigin(0, 0.5);
    this.kursorZnak = this.add
      .container(0, 0, [grot, tlo, ikona, tekst])
      .setDepth(Z.overlay + 5)
      .setVisible(false);
    this.kursorZnakTlo = tlo;
    this.kursorZnakIkona = ikona;
    this.kursorZnakTekst = tekst;
    // Bez tego kamera planszy zamalowywała znak w każdej klatce wewnątrz
    // obszaru mapy — dokładnie ten sam powód, dla którego okno skrzyni idzie
    // do kamery okien, opisany przy `naWierzchu`.
    this.naWierzchu(this.kursorZnak);
  }

  /**
   * Pokazuje znak przy kursorze. `ikona = null` to stan neutralny — sam grot,
   * bez odznaki — bo nad zwykłym, przejezdnym terenem klik nie obiecuje nic
   * szczególnego. Gracz i tak potrzebuje TEGO grotu zawsze, skoro systemowy
   * kursor jest wyłączony na całej planszy.
   */
  private pokazZnakKursora(ikona: string | null, tekst = '') {
    this.kursorZnakIkona.setVisible(!!ikona);
    if (ikona) this.kursorZnakIkona.setTexture(ikona);
    this.kursorZnakTlo.setVisible(!!ikona);
    this.kursorZnakTekst.setText(tekst).setVisible(!!tekst);
    this.kursorZnak.setVisible(true);
  }

  /**
   * Liczba „losowa", ale zawsze ta sama dla danego pola.
   *
   * Poprzednia wersja liczyła `(x * 7 + y * 13) % ile` i to był cały powód,
   * dla którego pasmo gór wyglądało jak tapeta: wyrażenie liniowe modulo N
   * daje REGULARNĄ KRATĘ. Krok o jedno pole w bok zawsze zmieniał wariant
   * o tyle samo, więc te same cztery sylwetki układały się w powtarzalne
   * ukośne pasy — widać je było natychmiast, choć każdy pojedynczy element
   * był inny.
   *
   * Mieszanie bitowe (wariant hasha Wanga) rozbija tę zależność: sąsiednie
   * pola dostają wartości bez żadnego wzoru, a wynik nadal jest powtarzalny,
   * bo zależy wyłącznie od współrzędnych.
   */
  /**
   * Ile pikseli PRZEZROCZYSTEGO marginesu ma tekstura pod swoim rysunkiem.
   *
   * Po co to w ogóle istnieje
   * -------------------------
   * Sprite budowli nie kończy się tam, gdzie kończy się plik. `zamek-las.png`
   * ma pod murami dwadzieścia osiem pikseli pustki, `kopalnia-pokeball.png`
   * dwa, `wiatrak.png` zero. Cały kod osadzania budowli w terenie — cień
   * kontaktowy, grunt podchodzący na spód, zarośla — celował dotąd w dolną
   * krawędź PLIKU. Przy zamku znaczyło to jedenaście pikseli poniżej murów:
   * cień leżał w powietrzu, grunt zakrywał pustkę, a budowla wyglądała, jakby
   * była naklejona na mapę. Właśnie to było zgłaszane, i to kilka razy pod
   * rząd, bo każda kolejna poprawka celowała w to samo, nieistniejące miejsce.
   *
   * Liczymy z alfy, a nie z tabeli w kodzie: tabela rozjeżdża się przy
   * pierwszej wymianie grafiki, a wymieniamy je często. Wynik zapamiętujemy,
   * bo to jedno czytanie całego obrazka.
   */
  private pustkaPodRysunkiem(klucz: string, wysNaEkranie: number): number {
    let margines = this.marginesy.get(klucz);
    if (margines === undefined) {
      margines = this.zmierzMargines(klucz);
      this.marginesy.set(klucz, margines);
    }
    // Tekstura jest skalowana do zadanej wysokości, więc margines też.
    const zrodlo = this.textures.get(klucz)?.getSourceImage() as { height?: number } | undefined;
    const h = zrodlo?.height ?? 0;
    return h > 0 ? (margines * wysNaEkranie) / h : 0;
  }

  /**
   * Kanał alfa tekstury, wczytany raz i trzymany w pamięci.
   *
   * Służy dwóm rzeczom naraz — i dlatego jest liczony w jednym miejscu:
   * marginesowi pod rysunkiem oraz trafianiu kliknięciem w sam rysunek,
   * a nie w jego prostokąt.
   */
  private alfa(klucz: string): { w: number; h: number; dane: Uint8Array } | null {
    const znane = this.alfy.get(klucz);
    if (znane !== undefined) return znane;

    let wynik: { w: number; h: number; dane: Uint8Array } | null = null;
    const zrodlo = this.textures.get(klucz)?.getSourceImage() as
      | HTMLImageElement
      | HTMLCanvasElement
      | undefined;
    if (zrodlo?.width) {
      const p = document.createElement('canvas');
      p.width = zrodlo.width;
      p.height = zrodlo.height;
      const ctx = p.getContext('2d', { willReadFrequently: true });
      if (ctx) {
        ctx.drawImage(zrodlo, 0, 0);
        const dane = ctx.getImageData(0, 0, p.width, p.height).data;
        const kanal = new Uint8Array(p.width * p.height);
        for (let i = 0; i < kanal.length; i++) kanal[i] = dane[i * 4 + 3];
        wynik = { w: p.width, h: p.height, dane: kanal };
      }
    }
    this.alfy.set(klucz, wynik);
    return wynik;
  }

  /** Sam pomiar w pikselach tekstury. */
  private zmierzMargines(klucz: string): number {
    const a = this.alfa(klucz);
    if (!a) return 0;
    // Od dołu w górę, do pierwszego wiersza, w którym cokolwiek widać.
    // Próg ósemki, a nie zera: wygładzone krawędzie zostawiają ogon alfy
    // rzędu jedynek, który dla oka jest niewidoczny, a zerowałby cały efekt.
    for (let y = a.h - 1; y >= 0; y--) {
      for (let x = 0; x < a.w; x++) {
        if (a.dane[y * a.w + x] > 8) return a.h - 1 - y;
      }
    }
    return 0;
  }

  /**
   * Czy punkt świata trafia w WIDOCZNY piksel rysunku, a nie tylko w jego
   * prostokąt.
   *
   * Prostokąt wiatraka to w dwóch trzecich puste niebo. Dopóki liczył się sam
   * prostokąt, wysoka budowla zabierała kliknięcia wszystkiemu, co stało za
   * nią — łącznie z portalem dwa rzędy dalej, w który nie dało się wejść,
   * mimo że było go doskonale widać.
   */
  private wRysunku(im: Phaser.GameObjects.Image, wx: number, wy: number): boolean {
    const b = im.getBounds();
    const a = this.alfa(im.texture.key);
    if (!a || b.width <= 0 || b.height <= 0) return true;
    const u = Math.floor(((wx - b.x) / b.width) * a.w);
    const v = Math.floor(((wy - b.y) / b.height) * a.h);
    if (u < 0 || v < 0 || u >= a.w || v >= a.h) return false;
    return a.dane[v * a.w + u] > 8;
  }

  private wariant(x: number, y: number, ile: number) {
    let h = (x * 0x1f1f1f1f) ^ (y * 0x85ebca6b);
    h = Math.imul(h ^ (h >>> 16), 0x2545f491);
    h = Math.imul(h ^ (h >>> 13), 0x27d4eb2f);
    return ((h ^ (h >>> 16)) >>> 0) % ile;
  }

  /**
   * Stawia jeden element terenu i od razu go różnicuje.
   *
   * Odbicie w poziomie jest tu najtańszą rzeczą, jaka istnieje: podwaja liczbę
   * widocznych sylwetek bez ani jednego nowego pliku. Razem ze zmienną skalą
   * i przesunięciem sprawia, że dwa sąsiednie pola tego samego rodzaju nigdy
   * nie wyglądają identycznie — a to właśnie powtarzalność sprawiała, że pasmo
   * gór czytało się jak tapeta.
   */
  private element(
    klucz: string,
    ex: number,
    ey: number,
    wysokosc: number,
    depth: number,
    ziarno: number
  ) {
    const im = this.add.image(ex, ey, klucz);
    im.setScale((KAFEL * wysokosc) / im.height)
      .setOrigin(0.5, 1)
      .setFlipX(ziarno % 2 === 1)
      .setDepth(depth);
    this.swiat.add(im);
    return im;
  }

  /**
   * Las i skały jako KĘPY, a nie jako jeden element na pole.
   *
   * Poprzednia wersja stawiała drzewo albo skałę na każdym polu z osobna
   * i przy paśmie gór wychodziła z tego tapeta: te same sylwetki w regularnym
   * rytmie, każda w swoim kwadracie. W Heroes 3 las i góry są obiektami
   * WIELOPOLOWYMI — kawałek lasu, zwał skalny — i dlatego czytają się jak
   * teren, a nie jak rząd doniczek.
   *
   * Zwarte obszary pokrywamy więc gotowymi kępami 3 × 2 (`tools/kepy.py`),
   * a pojedynczych sprite'ów używamy dopiero do tego, co zostanie na
   * brzegach. Kępa jest o pole szersza od swojego obrysu, żeby zachodziła na
   * sąsiednią i nie było widać, gdzie jedna się kończy.
   */
  private rysujPrzeszkody() {
    const zajete = new Set<string>();
    const takiSam = (x: number, y: number, t: string) =>
      x >= 0 &&
      y >= 0 &&
      x < this.stan.szer &&
      y < this.stan.wys &&
      this.stan.teren[y][x] === t &&
      !zajete.has(`${x},${y}`);

    // Najpierw kępy — od góry, żeby dalsze rzędy szły pod bliższe.
    for (let y = 0; y < this.stan.wys; y++) {
      for (let x = 0; x < this.stan.szer; x++) {
        const t = this.stan.teren[y][x];
        if (t !== 'las' && t !== 'skaly') continue;
        if (zajete.has(`${x},${y}`)) continue;
        let miesciSie = true;
        for (let dy = 0; dy < 2 && miesciSie; dy++)
          for (let dx = 0; dx < 3; dx++)
            if (!takiSam(x + dx, y + dy, t)) {
              miesciSie = false;
              break;
            }
        if (!miesciSie) continue;

        for (let dy = 0; dy < 2; dy++)
          for (let dx = 0; dx < 3; dx++) zajete.add(`${x + dx},${y + dy}`);

        const { x: ex, y: ey } = this.naEkran(x, y);
        const nr = this.wariant(x, y, 4) + 1;
        const im = this.add
          .image(ex + KAFEL, ey + KAFEL * 1.5, `m-kepa-${t}-${nr}`)
          .setOrigin(0.5, 1)
          .setFlipX(this.wariant(y, x, 2) === 1)
          // Głębia z DOLNEGO rzędu kępy: to on decyduje, co ją zasłoni.
          .setDepth(y + 1);
        this.swiat.add(im);
      }
    }

    // Reszta: pojedyncze sylwetki na polach, na których kępa się nie zmieściła.
    for (let y = 0; y < this.stan.wys; y++) {
      for (let x = 0; x < this.stan.szer; x++) {
        const t = this.stan.teren[y][x];
        if (t !== 'las' && t !== 'skaly') continue;
        if (zajete.has(`${x},${y}`)) continue;
        const { x: ex, y: ey } = this.naEkran(x, y);
        const z = this.wariant(x, y, 6);

        if (t === 'las') {
          const glowne = ['m-sosna', 'm-drzewo', 'm-sosna-b', 'm-drzewo-b'][
            this.wariant(x, y, 4)
          ];
          this.element(
            glowne,
            ex + ((this.wariant(x, y, 5) - 2) / 2) * KAFEL * 0.16,
            ey + KAFEL * (0.3 + this.wariant(y, x, 3) * 0.04),
            1.3 + this.wariant(x + 1, y, 4) * 0.07,
            y,
            z
          );
          if (this.wariant(x + 2, y + 1, 3) !== 0) {
            const podszyt = ['m-sosna-mala', 'm-krzak', 'm-krzak-2'][this.wariant(y, x, 3)];
            this.element(
              podszyt,
              ex + ((this.wariant(y, x, 4) - 1.5) / 1.5) * KAFEL * 0.3,
              ey + KAFEL * 0.42,
              0.5 + this.wariant(x, y + 3, 3) * 0.08,
              y - 0.2,
              z + 1
            );
          }
        } else {
          const duza = ['m-skala', 'm-skala-2', 'm-kopiec', 'm-kopiec-2'][this.wariant(x, y, 4)];
          this.element(
            duza,
            ex + ((this.wariant(x, y + 2, 5) - 2) / 2) * KAFEL * 0.14,
            ey + KAFEL * (0.34 + this.wariant(y, x + 3, 3) * 0.05),
            0.82 + this.wariant(x + y, y, 4) * 0.09,
            y,
            z
          );
          const mala = ['m-kopiec', 'm-skala', 'm-kopiec-2'][this.wariant(y, x, 3)];
          this.element(
            mala,
            ex + KAFEL * (0.16 + this.wariant(x, y, 3) * 0.06),
            ey + KAFEL * 0.46,
            0.44 + this.wariant(y + 1, x, 3) * 0.06,
            y + 0.3,
            z + 1
          );
        }
      }
    }
  }

  private rysujOzdoby() {
    for (let y = 0; y < this.stan.wys; y++) {
      for (let x = 0; x < this.stan.szer; x++) {
        if (this.stan.teren[y][x] !== 'trawa') continue;
        if (obiektNa(this.stan, x, y)) continue;
        const h = (x * 17 + y * 31 + x * y * 5) % 9;
        // Rzadziej niż wcześniej i tylko krzaki.
        //
        // Kępki trawy, kwiatki i kamyki stały tu jako osobne sprite'y, bo
        // dawna tekstura trawy była gładką plamą koloru i sama z siebie nie
        // mówiła nic. Tekstura z modelu ma to wszystko wmalowane, więc te
        // sprite'y dokładały drugą warstwę kwiatków — w dodatku rysowanych
        // inną techniką. Zostaje krzak: ma własną bryłę i cień, czyli daje
        // to, czego płaska tekstura dać nie może.
        if (h > 2) continue;
        const { x: ex, y: ey } = this.naEkran(x, y);
        this.element(
          ['m-krzak', 'm-krzak-2', 'm-krzak'][h],
          ex + ((h - 1) * KAFEL) / 5,
          ey + KAFEL * (0.2 + h * 0.07),
          0.42 + h * 0.05,
          y - 0.5,
          x + y
        );
      }
    }
  }

  private grafikaObiektu(o: Obiekt): { klucz: string; wys: number } {
    // Zamek i kopalnia zajmują kilka pól (patrz BRYLA), więc rozmiar bierzemy
    // z szerokości bryły, a nie z wysokości rysunku: budynek ma wypełniać
    // miejsce, które naprawdę blokuje, bo inaczej gracz nie wie, skąd
    // nieprzejezdność.
    const bryla = brylaObiektu(o);
    if (o.rodzaj === 'budynek') {
      const b = budowlaPoId(o.budynek);
      return { klucz: `m-${b?.plik ?? 'skrzynia'}`, wys: KAFEL * (b?.wys ?? 1) };
    }
    if (o.rodzaj === 'zamek')
      return {
        klucz: o.wlasciciel === 'gracz' ? 'm-zamek-las' : 'm-zamek-ogien',
        wys: KAFEL * (bryla ? 3.1 : 1.9),
      };
    if (o.rodzaj === 'kopalnia')
      return {
        // Kopalnia, kamieniołom i obóz łowców to jeden rysunek przemalowany
        // na barwę surowca. Bez tego gracz nie wiedział, co zajmuje, dopóki
        // nie najechał kursorem — a w grze o zasoby to informacja, którą
        // trzeba widzieć jednym spojrzeniem, z drugiego końca ekranu.
        klucz: o.surowiec === 'jagoda' ? 'm-sad' : `m-kopalnia-${o.surowiec ?? 'pokeball'}`,
        wys: KAFEL * (bryla ? 2.2 : 1.25),
      };
    // Strażnica jest szeroka na trzy pola i wysoka na dwa — ma zamykać
    // przejście także dla oka, nie tylko w zasadach gry. Namiot jest drobny:
    // to obozowisko przy drodze, a nie budowla.
    // Wysokość dobrana tak, żeby SZEROKOŚĆ wyszła na trzy pola: rysunek ma
    // 222 × 190 px, więc przy trzech kafelkach szerokości wychodzi 2,57 kafla
    // wysokości. Skalowanie po wysokości dawało bramę na dwa pola — wąską
    // jak furtka i wyraźnie nie zamykającą drogi, choć w zasadach gry
    // zamykała ją w całości.
    if (o.rodzaj === 'straznica')
      return { klucz: `m-straznica-${o.klucz ?? 'zielony'}`, wys: KAFEL * 2.57 };
    if (o.rodzaj === 'namiot')
      return { klucz: `m-namiot-klucznika-${o.klucz ?? 'zielony'}`, wys: KAFEL * 1.15 };
    if (o.rodzaj === 'jasnowidz') return { klucz: 'm-chata-jasnowidza', wys: KAFEL * 1.35 };
    if (o.rodzaj === 'skrzynia') return { klucz: 'm-skrzynia', wys: KAFEL * 0.78 };
    if (o.rodzaj === 'artefakt') return { klucz: 'm-kamien-ewolucji', wys: KAFEL * 0.72 };
    if (o.rodzaj === 'potwor')
      return { klucz: `p-${o.oddzialy?.[0].sprite ?? '00002'}`, wys: KAFEL * 1.05 };
    return { klucz: `m-${SUROWIEC_INFO[o.surowiec ?? 'pokeball'].ikona}`, wys: KAFEL * 0.7 };
  }

  private rysujObiekty() {
    for (const o of this.stan.obiekty) {
      if (o.zebrany) continue;
      const { x, y } = this.naEkran(o.x, o.y);
      const kont = this.add.container(x, y).setDepth(o.y + 0.5);
      // Bryła szeroka na trzy pola, stojąca przy krawędzi planszy, wystawałaby
      // poza nią. Dosuwamy rysunek do środka — o najwyżej pół pola, czego nikt
      // nie zauważy, a budowla przestaje być ucięta. Kliknięcia to nie rusza:
      // liczą się z pól i z granic rysunku, więc jedno idzie za drugim.
      const szerBryly = brylaObiektu(o)?.[0];
      if (szerBryly) {
        const polowa = (szerBryly * KAFEL) / 2;
        kont.x = Phaser.Math.Clamp(x, polowa, this.mapaW - polowa);
      }

      const { klucz, wys } = this.grafikaObiektu(o);
      const bryla = brylaObiektu(o);

      // Cień kontaktowy. Przy bryle siada na jej podstawie — czyli w rzędzie
      // NAD polem wejścia, nie na samym wejściu; położony niżej odklejał się
      // od budowli i cała rzecz zaczynała lewitować.
      //
      // Miękka tekstura, nie elipsa z `fillEllipse`: elipsa ma ostrą krawędź,
      // a cień kontaktowy nie ma żadnej. Mnożenie zamiast przykrywania, bo
      // czarna plama o krycia 0,3 rozjaśnia się do szarości i leży na trawie
      // jak folia, zamiast przyciemniać to, co pod nią.
      //
      // Poprzednia wersja była za mała i siedziała dokładnie pod podstawą,
      // więc bryła zasłaniała ją niemal w całości — porównanie z włączonym
      // i wyłączonym cieniem nie pokazywało ŻADNEJ różnicy. Cień, którego nie
      // widać, nie osadza niczego. Teraz jest szerszy od budowli, wychodzi
      // spod niej w lewo i w dół (słońce stoi w prawym górnym rogu) i widać
      // go na tyle, żeby robił swoją robotę.
      // Prawdziwy spód rysunku, a nie dolna krawędź pliku — patrz
      // `marginesPodRysunkiem`. Wszystko, co osadza budowlę w terenie, liczy
      // się od tej jednej wartości, więc nie da się już tego rozjechać
      // osobno dla cienia i osobno dla gruntu.
      const spod = (bryla ? -KAFEL * 0.5 : KAFEL * 0.46) - this.pustkaPodRysunkiem(klucz, wys);
      const cien = this.add
        .image(-KAFEL * (bryla ? 0.3 : 0.12), spod + KAFEL * (bryla ? 0.08 : 0.02), 't-cien')
        // Szeroka i WYSOKA plama, nie pasek. Spłaszczona do jednej trzeciej
        // wysokości czytała się jak ciemna kreska doklejona pod bryłą; cień
        // widziany pod tym kątem jest owalny i sięga dalej, niż się wydaje.
        .setDisplaySize(
          KAFEL * (bryla ? bryla[0] * 1.15 : 0.9),
          KAFEL * (bryla ? 1.0 : 0.42)
        )
        .setBlendMode(Phaser.BlendModes.MULTIPLY)
        .setAlpha(bryla ? 0.85 : 0.7);
      kont.add(cien);
      // Wejście do budowli z bryłą (zamek, kopalnia) nie ma żadnego
      // odrębnego oznaczenia na gruncie — z daleka wygląda jak zwykła
      // ścieżka POD budynkiem, więc nie widać, gdzie naprawdę trzeba
      // kliknąć, żeby wejść: budynek wygląda na jedną spójną bryłę, choć
      // pole wejścia leży kawałek przed nią. Miękka złota poświata na tym
      // polu nie zmienia mechaniki — to wciąż to samo pole — tylko robi je
      // wreszcie widocznym jako osobne miejsce, a nie część muru.
      if (bryla && (o.rodzaj === 'zamek' || o.rodzaj === 'kopalnia')) {
        const wejscie = this.add.graphics();
        wejscie.fillStyle(C.gold, 0.3);
        wejscie.fillEllipse(0, KAFEL * 0.1, KAFEL * 0.85, KAFEL * 0.4);
        wejscie.lineStyle(2, C.gold, 0.6);
        wejscie.strokeEllipse(0, KAFEL * 0.1, KAFEL * 0.85, KAFEL * 0.4);
        kont.add(wejscie);
      }
      // Budowle z bryłą stoją ZA polem wejścia, a nie na nim: podstawa siada na
      // górnej krawędzi tego pola, więc brama zostaje odsłonięta i widać, że
      // jest po niej gdzie chodzić. Reszta obiektów stoi na swoim polu.
      const im = this.add
        .image(0, bryla ? -KAFEL * 0.5 : KAFEL * 0.46, klucz)
        .setOrigin(0.5, 1);
      im.setScale(wys / im.height);
      kont.add(im);

      // Klik w RYSUNEK ma celować w pole obiektu.
      //
      // Bez tego trzeba trafić w pole, a rysunek stoi wyżej niż ono: zamek ma
      // prawie dwa pola wysokości, stworek ponad jedno. Kliknięcie w to, co
      // widać, trafiało w sąsiednie pole i bohater zatrzymywał się obok celu,
      // niczego nie podnosząc.
      //
      // Trafienie liczymy SAMI, zamiast oznaczać obrazek jako interaktywny.
      // Wejście Phasera testuje kamerą główną, a świat rysuje druga kamera —
      // kliknięcia w te obrazki po prostu do nich nie docierały.
      this.trafienia.push({ o, im });

      // Artefakt pulsuje — to jedyny obiekt, którego nie da się pomylić
      // z surowcem samym kształtem, więc dostaje własny sygnał.
      if (o.rodzaj === 'artefakt') {
        this.tweens.add({
          targets: im,
          alpha: { from: 1, to: 0.5 },
          duration: 900,
          yoyo: true,
          repeat: -1,
        });
      }

      if (o.rodzaj === 'potwor') kont.add(this.chorag(C.foe));
      const doZajecia =
        o.rodzaj === 'kopalnia' ||
        o.rodzaj === 'zamek' ||
        budowlaPoId(o.budynek)?.efekt.typ === 'gniazdo';
      if (doZajecia) {
        // Kolor chorągwi: przeciwnika (foe), nasza (ally) — a dla zamku, który
        // nie ma jeszcze właściciela, foe, bo broni go garnizon tak samo jak
        // wcześniej broniło "nie nasze".
        const f = this.chorag(o.wlasciciel === 'gracz' ? C.ally : C.foe);
        f.setVisible(!!o.wlasciciel || o.rodzaj === 'zamek');
        // Chorągiew ma stać na budowli, a nie na wolnym polu przed nią.
        // Odkąd bryła przeniosła się o pole wyżej, flaga musi pójść za nią —
        // inaczej wygląda, jakby ktoś wbił maszt na środku placu.
        if (bryla) f.setY(-KAFEL * (0.5 + wys / KAFEL / 2));
        kont.add(f);
        kont.setData('flaga', f);
      }

      if (bryla) this.zaroslaPrzyPodstawie(o, im, kont, spod);

      kont.setData('obiekt', o);
      this.ikonyObiektow[o.id] = kont;
      this.swiat.add(kont);
    }
  }

  /**
   * Zarośla zachodzące na dolną krawędź budowli — wycięte z TŁA PLANSZY.
   *
   * Budowla wycięta do sylwetki ma nieprzerwany, ostry obrys od dołu i przez
   * to unosi się nad ziemią, choćby cień był idealny. W naturze przy każdej
   * ścianie coś rośnie i zasłania jej podstawę; przerwanie tej krawędzi robi
   * dla osadzenia więcej niż cień, bo oko przestaje widzieć granicę wycięcia.
   *
   * Ta sama sztuczka co na ekranie miasta i z tego samego powodu: proceduralna
   * trawa przegrywa z malowaną, więc nie podrabiamy jej, tylko bierzemy pas
   * tła dokładnie stamtąd, gdzie stoi budowla, i kładziemy z powrotem na wierzch.
   * To jest ta sama trawa, po której chodzi bohater.
   *
   * Krycie schodzi ku górze trzema pasami — gradientu alfy na obrazku nie da
   * się zrobić bez maski bitmapowej, a przy paśmie wysokim na kilkanaście
   * pikseli nikt nie zobaczy stopni.
   */
  private zaroslaPrzyPodstawie(
    o: Obiekt,
    im: Phaser.GameObjects.Image,
    kont: Phaser.GameObjects.Container,
    spod: number
  ) {
    const podstawa = kont.y + spod;
    const szer = im.displayWidth;
    const lewo = kont.x - szer / 2;

    // 1. Grunt podchodzi na spód rysunku.
    //
    // Wcześniej były trzy pasy o kryciu 0,4 / 0,72 / 1 — czyli trzy widoczne
    // stopnie zamiast przejścia. Teraz krycie rośnie po krzywej i pasów jest
    // tyle, że każdy ma dwa piksele: oko nie ma czego złapać jako krawędzi.
    const pasmo = KAFEL * 0.3;
    const pasow = 10;
    for (let i = 0; i < pasow; i++) {
      const t = (i + 1) / pasow;
      const wysPasa = pasmo / pasow;
      const y = podstawa - pasmo + i * wysPasa;
      const kopia = this.add
        .image(0, 0, 'plansza-0')
        .setOrigin(0, 0)
        // Nad tą budowlą, ale pod wszystkim, co stoi w następnych rzędach.
        .setDepth(o.y + 0.7)
        // Kwadrat, a nie prosta: przy prostej grunt zaczyna się widocznie już
        // w połowie pasma i budowla wygląda, jakby zapadła się w ziemię.
        .setAlpha(t * t);
      // Tło planszy leży w świecie jeden do jednego od (0,0), więc piksel
      // świata jest wprost pikselem tekstury.
      kopia.setCrop(lewo, y, szer, wysPasa + 1);
      this.swiat.add(kopia);
    }

    // 2. Ziemia podchodzi NIERÓWNO — każda kolumna na inną wysokość.
    //
    // Sam gładki przemiał z punktu pierwszego nie wystarczy i widać to było na
    // zgłoszonym zrzucie: sprite jest ucięty POZIOMO, więc miękkie przejście
    // przesuwa tę samą prostą wyżej, zamiast ją zlikwidować. Dopiero gdy
    // grunt zakrywa spód budowli raz wyżej, raz niżej, linii nie da się już
    // obrysować linijką — a to jest cała różnica między „stoi w ziemi"
    // a „leży na niej".
    const kolumn = 16;
    for (let i = 0; i < kolumn; i++) {
      const wysokosc = pasmo * (0.2 + (this.wariant(o.x * 71 + i, o.y * 53, 100) / 100) * 1.1);
      const kopia = this.add
        .image(0, 0, 'plansza-0')
        .setOrigin(0, 0)
        .setDepth(o.y + 0.71);
      kopia.setCrop(lewo + (szer * i) / kolumn, podstawa - wysokosc, szer / kolumn + 1, wysokosc);
      this.swiat.add(kopia);
    }

    // 3. Kilka krzaków przy samej podstawie.
    //
    // Rzadko i z dużym rozrzutem wysokości: gęsty równy rządek czyta się jak
    // żywopłot posadzony przez ogrodnika, a nie jak zarośla, które same tam
    // wyrosły. Środek zostaje pusty, bo tam jest brama — krzak przed wejściem
    // wygląda na przeszkodę, a właśnie tamtędy się do miasta wchodzi.
    const ile = 7;
    for (let i = 0; i < ile; i++) {
      const u = (i + 0.5) / ile;
      if (Math.abs(u - 0.5) < 0.12) continue;
      const los = this.wariant(o.x * 31 + i, o.y * 17 + i * 7, 1000) / 1000;
      if (los < 0.25) continue;
      const kx = lewo + szer * u + (los - 0.5) * KAFEL * 0.3;
      const krzak = this.add
        .image(kx, podstawa + (los - 0.4) * KAFEL * 0.2, los < 0.6 ? 'm-krzak' : 'm-krzak-2')
        .setOrigin(0.5, 1)
        .setDepth(o.y + 0.75)
        .setFlipX(los > 0.5);
      krzak.setScale((KAFEL * (0.3 + los * 0.4)) / krzak.height);
      this.swiat.add(krzak);
    }
  }

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
    this.bohaterObj = this.add.container(x, y).setDepth(this.stan.bohater.y + 0.8);

    const cien = this.add.graphics();
    cien.fillStyle(C.shadow, 0.34);
    cien.fillEllipse(0, KAFEL * 0.34, KAFEL * 0.5, KAFEL * 0.16);
    this.bohaterObj.add(cien);

    this.bohaterSprite = this.add.sprite(0, KAFEL * 0.4, 'bohater', 0).setOrigin(0.5, 1);
    this.bohaterSprite.setScale((KAFEL * 1.15) / this.bohaterSprite.height);
    this.bohaterObj.add(this.bohaterSprite);
    // Chorągiewka OBOK głowy, nie na niej. Domyślne położenie `chorag`
    // wypadało dokładnie na wysokości twarzy sprite'a i wyglądało, jakby
    // bohater miał wetknięty maszt w oko.
    this.bohaterObj.add(this.chorag(C.ally).setPosition(KAFEL * 0.26, -KAFEL * 0.36));
    this.swiat.add(this.bohaterObj);
  }

  /**
   * Mgła wojny. Rysujemy ją na płótnie 36 × 36 — jeden piksel na pole — i
   * rozciągamy na całą planszę. Filtrowanie robi z tego miękką granicę za
   * darmo; tysiąc prostokątów przerysowywanych przy każdym kroku byłoby
   * wolniejsze i wyglądałoby jak kratka.
   */
  private rysujMgle() {
    if (!this.textures.exists('mgla')) {
      this.textures.createCanvas('mgla', this.stan.szer * MGLA_GESTOSC, this.stan.wys * MGLA_GESTOSC);
    }
    this.mgla = this.add.image(0, 0, 'mgla').setOrigin(0, 0).setDepth(this.stan.wys + 50);
    this.mgla.setDisplaySize(this.mapaW, this.mapaH);
    this.swiat.add(this.mgla);
    this.malujMgle();
  }

  /** Obiekty na nieodkrytych polach nie mają prawa być widoczne pod mgłą. */
  private aktualizujWidocznoscObiektow() {
    for (const o of this.stan.obiekty) {
      const kont = this.ikonyObiektow[o.id];
      if (kont) kont.setVisible(!!this.stan.odkryte[o.y][o.x]);
    }
  }

  private malujMgle() {
    const tekstura = this.textures.get('mgla') as Phaser.Textures.CanvasTexture;
    const ctx = tekstura.getContext();
    const g = MGLA_GESTOSC;
    ctx.clearRect(0, 0, this.stan.szer * g, this.stan.wys * g);
    ctx.fillStyle = `rgba(10, 14, 28, ${MGLA_ALFA})`;
    for (let y = 0; y < this.stan.wys; y++) {
      for (let x = 0; x < this.stan.szer; x++) {
        if (!this.stan.odkryte[y][x]) ctx.fillRect(x * g, y * g, g, g);
      }
    }
    tekstura.refresh();
    this.aktualizujWidocznoscObiektow();
  }

  // ---------- prawa kolumna ----------

  private rysujPanel() {
    const px = this.mapaX + this.oknoW + 14;
    const py = this.mapaY - 8;
    const ph = this.oknoH + 16;
    drawPanelBody(this, px, py, PANEL_W, ph, 8);

    const wnetrzeX = px + 16;
    const wnetrzeW = PANEL_W - 32;

    // Minimapa jest węższa od panelu, żeby pod nią zmieścił się pasek
    // własności. Przy planszy 36 × 36 to nadal blisko pięć pikseli na pole —
    // dość, żeby rozpoznać kształt lądu, a o to w minimapie chodzi.
    const mmBok = 176;
    const mmX = wnetrzeX + (wnetrzeW - mmBok) / 2;
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
    this.ramkaWidoku = this.add.graphics().setDepth(Z.hud + 2);

    // Klik w minimapę przenosi widok. Na planszy 36 × 36 to najszybszy sposób,
    // żeby wrócić do zamku albo zerknąć, co się dzieje po drugiej stronie gór.
    this.add
      .zone(mmX, mmY, mmBok, mmBok)
      .setOrigin(0, 0)
      .setInteractive({ useHandCursor: true })
      .on('pointerdown', (p: Phaser.Input.Pointer) => {
        this.wysrodkujNa(
          Math.floor(((p.x - mmX) / mmBok) * this.stan.szer),
          Math.floor(((p.y - mmY) / mmBok) * this.stan.wys)
        );
      });

    const kartaY = this.rysujPasekWlasnosci(wnetrzeX, mmY + mmBok + 22, wnetrzeW) + 10;
    const kartaH = 134;
    const karta = this.add.graphics().setDepth(Z.hud);
    plate(karta, wnetrzeX, kartaY, wnetrzeW, kartaH, 9, C.panel, C.panelDeep, {
      light: 0.2,
      dark: 0.2,
      gloss: 0.16,
      edgeW: 2,
    });

    const b = this.stan.bohater;
    const portretBok = 50;
    const ram = this.add.graphics().setDepth(Z.hud + 1);
    ram.fillStyle(mix(C.panel, C.panelDeep, 0.35), 1);
    ram.fillRoundedRect(wnetrzeX + 8, kartaY + 8, portretBok, portretBok, 6);
    ram.lineStyle(2, C.goldDeep, 1);
    ram.strokeRoundedRect(wnetrzeX + 8, kartaY + 8, portretBok, portretBok, 6);
    const portret = this.add
      .image(wnetrzeX + 8 + portretBok / 2, kartaY + 6 + portretBok / 2, 'bohater', 0)
      .setDepth(Z.hud + 2);
    portret.setScale((portretBok - 4) / portret.height);

    this.add
      .text(wnetrzeX + portretBok + 18, kartaY + 8, b.imie, display(15))
      .setOrigin(0, 0)
      .setDepth(Z.hud + 2);
    this.poziomTekst = this.add
      .text(wnetrzeX + portretBok + 18, kartaY + 25, '', body(11, H.inkSoft))
      .setOrigin(0, 0)
      .setDepth(Z.hud + 2)
      .setData('maks', wnetrzeW - portretBok - 24);

    // Pasek do awansu. Sama liczba „190/384" mówi, ILE brakuje, ale nie mówi,
    // czy to blisko — a to jest jedyne pytanie, które gracz sobie przy niej
    // zadaje. Pasek odpowiada na nie bez czytania.
    const pdX = wnetrzeX + portretBok + 18;
    const pdW = wnetrzeW - portretBok - 26;
    const pdY = kartaY + 40;
    const rowek = this.add.graphics().setDepth(Z.hud + 1);
    rowek.fillStyle(C.hpTrack, 1);
    rowek.fillRoundedRect(pdX, pdY, pdW, 8, 4);
    rowek.lineStyle(1.5, C.shadow, 0.5);
    rowek.strokeRoundedRect(pdX, pdY, pdW, 8, 4);
    this.doswPasek = this.add.graphics().setDepth(Z.hud + 2);
    this.doswPasek.setData('x', pdX).setData('y', pdY).setData('w', pdW);

    const statY = kartaY + 60;
    [ICON.sword, ICON.shield, ICON.boot].forEach((klucz, i) => {
      const sx = wnetrzeX + portretBok + 24 + i * 46;
      this.add.image(sx, statY, klucz).setDisplaySize(17, 17).setDepth(Z.hud + 2);
      this.statTeksty[i] = this.add
        .text(sx + 12, statY, '', display(14, i === 2 ? H.gold : H.white))
        .setOrigin(0, 0.5)
        .setDepth(Z.hud + 2);
    });
    this.ruchTekst = this.statTeksty[2];

    // Siedem slotów w JEDNYM rzędzie.
    //
    // Były w dwóch, bo przy boku 40 px siedem się nie mieści — ale dwa rzędy
    // urosły kartę o 58 px i pole podpowiedzi pod nią zrobiło się tak niskie,
    // że tekst wychodził spod przycisku „Zakończ turę". Panel na mapie ma
    // pokazywać SKŁAD, a nie służyć do zarządzania: od tego jest ekran
    // bohatera, gdzie sloty są dwa i pół raza większe. Bok 28 px wystarczy,
    // żeby rozpoznać sylwetkę i odczytać liczbę.
    //
    // Rysunek i licznik powstają ZAWSZE, także dla pustego slotu, i są tylko
    // chowane: ekran bohatera przekłada oddziały między slotami, więc panel
    // musi umieć pokazać każdą zawartość każdego slotu bez przebudowy.
    const slotBok = 28;
    const odstep = 3;
    const rzadX = wnetrzeX + (wnetrzeW - (SLOTY_ARMII * slotBok + (SLOTY_ARMII - 1) * odstep)) / 2;
    const rzadY = kartaY + 86;
    for (let i = 0; i < SLOTY_ARMII; i++) {
      const sx = rzadX + i * (slotBok + odstep);
      const g = this.add.graphics();
      g.fillStyle(mix(C.panel, C.panelDeep, 0.3), 1);
      g.fillRoundedRect(0, 0, slotBok, slotBok + 12, 4);
      g.lineStyle(1.5, C.panelDeep, 0.7);
      g.strokeRoundedRect(0, 0, slotBok, slotBok + 12, 4);
      const im = this.add.image(slotBok / 2, slotBok / 2 - 1, 'bohater').setVisible(false);
      const licznik = this.add.text(slotBok / 2, slotBok + 4, '', display(10)).setOrigin(0.5);
      const slot = this.add.container(sx, rzadY, [g, im, licznik]).setDepth(Z.hud + 1);
      slot.setData('licznik', licznik).setData('rysunek', im);
      this.slotyArmii.push(slot);
    }

    // Karta bohatera jest KLIKALNA — stąd wchodzi się na ekran bohatera.
    // Bez tego jedyną drogą byłoby kliknięcie w sylwetkę na mapie, a ta
    // potrafi stać za krawędzią widoku.
    this.add
      .zone(wnetrzeX, kartaY, wnetrzeW, kartaH)
      .setOrigin(0, 0)
      .setInteractive({ useHandCursor: true })
      .on('pointerdown', () => this.otworzBohatera());

    // Rząd zapisu stoi NAD „Zakończ turę" i zabiera panelowi podpowiedzi
    // 37 px wysokości — tyle, ile zajmują przyciski (28) plus odstępy z obu
    // stron (8 i 1) od sąsiadów. Zmiana tej liczby bez przeliczenia niżej
    // rozjeżdża odstępy, tak jak już raz się zdarzyło z tekstem podpowiedzi.
    const podY = kartaY + kartaH + 10;
    const podH = py + ph - 56 - 27 - podY;
    const ramkaPod = this.add.graphics().setDepth(Z.hud);
    plate(ramkaPod, wnetrzeX, podY, wnetrzeW, podH, 9, mix(C.panel, C.panelDeep, 0.16), C.panelDeep, {
      light: 0.14,
      dark: 0.16,
      gloss: 0.1,
      edgeW: 2,
    });
    this.podpowiedz = this.add
      .text(wnetrzeX + 10, podY + 6, DOMYSLNA_PODPOWIEDZ, { ...body(10, H.ink), lineSpacing: 1 })
      .setOrigin(0, 0)
      .setDepth(Z.hud + 2)
      .setWordWrapWidth(wnetrzeW - 20);

    const wierszAkcjiY = py + ph - 65;
    const polowaW = (wnetrzeW - 6) / 2;
    const zapiszBtn = makeHudButton(this, {
      x: wnetrzeX + polowaW / 2,
      y: wierszAkcjiY,
      w: polowaW,
      h: 24,
      tone: mix(C.panel, C.panelDeep, 0.1),
      toneDeep: C.panelDeep,
      onClick: () => this.zapiszStanGry(),
    });
    zapiszBtn.setLabel('Zapisz');
    const wczytajBtn = makeHudButton(this, {
      x: wnetrzeX + polowaW + 6 + polowaW / 2,
      y: wierszAkcjiY,
      w: polowaW,
      h: 24,
      tone: mix(C.panel, C.panelDeep, 0.1),
      toneDeep: C.panelDeep,
      onClick: () => this.wczytajStanGry(),
    });
    wczytajBtn.setLabel('Wczytaj');

    const przycisk = makeHudButton(this, {
      x: px + PANEL_W / 2,
      y: py + ph - 30,
      w: wnetrzeW,
      h: 38,
      icon: ICON.hourglass,
      tone: C.gold,
      toneDeep: C.goldDeep,
      onClick: () => this.koniecTury(),
    });
    przycisk.setLabel('Zakończ turę');
  }

  /** Zapis gry w przeglądarce — jeden slot, żeby dało się wrócić do planszy później. */
  private zapiszStanGry() {
    if (this.zajety) return;
    this.napisUlotny(zapiszGre(this.stan) ? 'Gra zapisana.' : 'Nie udało się zapisać gry.');
  }

  private wczytajStanGry() {
    if (this.zajety) return;
    if (!jestZapis()) {
      this.napisUlotny('Nie ma jeszcze żadnego zapisu.');
      return;
    }
    // Wczytanie zastępuje bieżący, niezapisany postęp — to jedyna operacja
    // tutaj, która coś nieodwracalnie kasuje, więc pyta wprost, zamiast
    // ciszej zamiany stanu pod nogami gracza.
    if (!window.confirm('Wczytać zapisaną grę? Obecny postęp od ostatniego zapisu przepadnie.')) {
      return;
    }
    const wczytany = wczytajGre();
    if (!wczytany) {
      this.napisUlotny('Nie udało się wczytać zapisu.');
      return;
    }
    this.registry.set(KLUCZ_STANU, wczytany);
    this.scene.start('adventure');
  }

  /**
   * Pasek własności: bohaterowie i miasta, jak dwie kolumny portretów po
   * prawej stronie ekranu przygody w Heroes 3.
   *
   * Miasto otwiera się STĄD, nie wchodząc tam bohaterem — to jest cały sens
   * tej listy. Bez niej każde zajrzenie do zamku, żeby coś dobudować, kosztuje
   * kilka tur marszu, a budowanie jest tym, co się robi codziennie.
   *
   * Bohaterowie pojawiają się dopiero, gdy jest ich więcej niż jeden: przy
   * jednym lista powtarzałaby kartę, która i tak wisi niżej. Na razie nie ma
   * w grze sposobu, żeby zdobyć drugiego, więc ten rząd nigdy się nie pokazuje
   * — kod jest tu po to, żeby dodanie drugiego bohatera nie wymagało wracania
   * do układu panelu.
   *
   * Zwraca dolną krawędź, bo to od niej zaczyna się karta bohatera.
   */
  private rysujPasekWlasnosci(x: number, y: number, szer: number): number {
    const miasta = this.stan.obiekty.filter((o) => o.rodzaj === 'zamek' && o.wlasciciel === 'gracz');
    const bohaterowie = [this.stan.bohater];
    const wpisy: Array<{ klucz: string; klik: () => void; podpis: string }> = [
      ...(bohaterowie.length > 1
        ? bohaterowie.map((b) => ({
            klucz: 'bohater',
            klik: () => this.wysrodkujNa(b.x, b.y),
            podpis: b.imie,
          }))
        : []),
      ...miasta.map((m) => ({
        klucz: 'm-zamek-las',
        klik: () => this.pokazZamek(m),
        podpis: m.nazwa,
      })),
    ];
    if (wpisy.length === 0) return y;

    const bok = 40;
    const odstep = 6;
    const rzadX = x + (szer - (wpisy.length * bok + (wpisy.length - 1) * odstep)) / 2;
    for (const [i, w] of wpisy.entries()) {
      const sx = rzadX + i * (bok + odstep);
      const g = this.add.graphics().setDepth(Z.hud);
      g.fillStyle(mix(C.panel, C.panelDeep, 0.3), 1);
      g.fillRoundedRect(sx, y, bok, bok, 5);
      g.lineStyle(2, C.goldDeep, 1);
      g.strokeRoundedRect(sx, y, bok, bok, 5);
      const im = this.add.image(sx + bok / 2, y + bok / 2, w.klucz).setDepth(Z.hud + 1);
      im.setScale(Math.min((bok - 8) / im.width, (bok - 6) / im.height));
      this.add
        .zone(sx, y, bok, bok)
        .setOrigin(0, 0)
        .setInteractive({ useHandCursor: true })
        .on('pointerdown', w.klik)
        .on('pointerover', () => this.podpowiedz.setText(`${w.podpis}\nKliknij, żeby wejść.`));
    }
    return y + bok;
  }

  private rysujPasekSurowcow() {
    const y = this.mapaY + this.oknoH + 14;
    const x0 = this.mapaX - 8;
    const szer = this.oknoW + 16;
    const g = this.add.graphics().setDepth(Z.hud);
    g.fillStyle(C.panelDeep, 1);
    g.fillRoundedRect(x0, y, szer, PASEK_H, 7);
    g.lineStyle(2, C.goldDeep, 1);
    g.strokeRoundedRect(x0, y, szer, PASEK_H, 7);

    const krok = (szer - 24) / SUROWCE.length;
    SUROWCE.forEach((s, i) => {
      const sx = x0 + 20 + i * krok;
      const sy = y + PASEK_H / 2;
      const im = this.add.image(sx, sy, `m-${SUROWIEC_INFO[s].ikona}`).setDepth(Z.hud + 1);
      im.setScale(Math.min(1, (PASEK_H - 10) / im.height));
      this.podpisy[s] = this.add
        .text(sx + 17, sy, '0', display(15))
        .setOrigin(0, 0.5)
        .setDepth(Z.hud + 1);
      this.dochody[s] = this.add
        .text(sx + 17, sy, '', body(10, H.goldLight))
        .setOrigin(0, 0.5)
        .setDepth(Z.hud + 1);
    });

    this.dataTekst = this.add
      .text(this.mapaX + this.oknoW + 14 + PANEL_W / 2, y + PASEK_H / 2, '', display(13, H.goldLight))
      .setOrigin(0.5)
      .setDepth(Z.hud + 1);
  }

  // ---------- odświeżanie ----------

  /**
   * Czy bohater ma nieodebrany awans — i jeśli tak, otwiera okno wyboru.
   *
   * Wołane z `odswiezWszystko`, czyli po KAŻDEJ zmianie stanu gry, a nie
   * tylko po bitwie. To był błąd pierwszej wersji: okno odpalała wyłącznie
   * `rozliczBitwe`, więc doświadczenie ze skrzyni i z drzewa wiedzy podnosiło
   * poziom po cichu — statystyki rosły, a umiejętności nie było skąd wziąć.
   *
   * Nagrody odbiera się po jednej: przy skoku o dwa poziomy naraz okno
   * pokazuje się dwa razy, bo dwa awanse to dwie decyzje.
   */
  private sprawdzAwans() {
    if (this.zajety) return;
    // Na starcie misji pierwsze są warunki. Bohater przenoszony z poprzedniej
    // misji potrafi mieć nieodebrany awans (ostatnia bitwa dała poziom, a gra
    // skończyła się, zanim okno zdążyło wyskoczyć) — i to okno zajmowało
    // miejsce warunków, które przepadały. Awans poczeka na „Do dzieła!".
    if (this.stan.misja && !this.stan.warunkiPokazane) return;
    const b = this.stan.bohater;
    const teraz = poziom(b.doswiadczenie);
    const odebrany = b.poziomOdebrany ?? 1;
    if (teraz <= odebrany) return;
    this.oknoAwansu(odebrany, odebrany + 1);
  }

  private odswiezWszystko() {
    const b = this.stan.bohater;
    const st = statystyki(b);
    this.statTeksty[0].setText(String(st.atak));
    this.statTeksty[1].setText(String(st.obrona));
    this.ruchTekst.setText(String(Math.round(b.ruch)));
    // Sam numer poziomu nie mówił nic: ani tego, że awans nadchodzi, ani jak
    // blisko jest, ani co da. Licznik do awansu robi z doświadczenia widoczny
    // pasek postępu, a co awans daje — mówi komunikat w chwili awansu.
    const p = postepPoziomu(b.doswiadczenie);
    // Licznik artefaktów wypadł z tej linijki: przy dwucyfrowym doświadczeniu
    // wychodził za kartę („…do awansu · ar"). Artefakty widać na ekranie
    // bohatera; tu zostaje to, czego pasek pod spodem nie mówi sam — liczby.
    // Gdyby i to się nie zmieściło (duże liczby na wysokich poziomach),
    // napis traci „do awansu", a nie ucina się w pół słowa.
    const maks = this.poziomTekst.getData('maks') as number | undefined;
    this.poziomTekst.setText(`poziom ${p.poziom} · ${p.wPoziomie}/${p.doAwansu} do awansu`);
    if (maks && this.poziomTekst.width > maks) {
      this.poziomTekst.setText(`poziom ${p.poziom} · ${p.wPoziomie}/${p.doAwansu}`);
    }
    const pdX = this.doswPasek.getData('x') as number;
    const pdY = this.doswPasek.getData('y') as number;
    const pdW = this.doswPasek.getData('w') as number;
    this.doswPasek.clear();
    const ulamek = Phaser.Math.Clamp(p.wPoziomie / p.doAwansu, 0, 1);
    if (ulamek > 0.01) {
      this.doswPasek.fillStyle(C.gold, 1);
      this.doswPasek.fillRoundedRect(pdX + 1, pdY + 1, Math.max(4, (pdW - 2) * ulamek), 6, 3);
      this.doswPasek.fillStyle(C.white, 0.35);
      this.doswPasek.fillRoundedRect(pdX + 1, pdY + 1.5, Math.max(4, (pdW - 2) * ulamek), 2.5, 1.5);
    }
    for (let i = 0; i < SLOTY_ARMII; i++) {
      const slot = this.slotyArmii[i];
      if (!slot) continue;
      const od = b.armia[i];
      const im = slot.getData('rysunek') as Phaser.GameObjects.Image;
      const licznik = slot.getData('licznik') as Phaser.GameObjects.Text;
      if (od) {
        im.setTexture(`p-${od.sprite}`).setVisible(true);
        im.setScale(24 / im.height);
        licznik.setText(String(od.ile));
      } else {
        im.setVisible(false);
        licznik.setText('');
      }
    }

    const wplyw = dochod(this.stan);
    for (const s of SUROWCE) {
      const t = this.podpisy[s];
      t.setText(String(this.stan.skarbiec[s]));
      const ile = wplyw[s] ?? 0;
      this.dochody[s].setText(ile > 0 ? `+${ile}` : '').setX(t.x + t.width + 5);
    }
    const d = data(this.stan.dzien);
    this.dataTekst.setText(`Tydzień ${d.tydzien}, dzień ${d.dzienTygodnia}`);
    this.rysujMinimape();
    aktualizujAmbient(this, b, this.stan.obiekty);
    // Nieodebrany awans na samym końcu odświeżania — po tym, jak panel
    // pokazał już nowe liczby. Okno ma być ostatnią rzeczą, którą gracz
    // zobaczy, a nie pierwszą.
    //
    // Przed nim — rozstrzygnięcie gry. Tędy przechodzi KAŻDE zdarzenie, które
    // może je zmienić (krok, obiekt, okno, bitwa, koniec tury z ruchem
    // przeciwnika), więc to jedno wywołanie zastępuje pilnowanie końca gry
    // w dziesięciu miejscach naraz.
    if (this.sprawdzRozstrzygniecie()) return;
    this.sprawdzAwans();
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
        // Minimapa pokazuje tylko to, co odsłonięte — inaczej zdradza całą
        // planszę i mgła wojny przestaje cokolwiek znaczyć.
        g.fillStyle(
          this.stan.odkryte[y][x] ? barwy[this.stan.teren[y][x]] ?? 0x888888 : 0x141a2c,
          1
        );
        g.fillRect(mx + x * kw, my + y * kh, Math.ceil(kw), Math.ceil(kh));
      }
    }
    for (const o of this.stan.obiekty) {
      if (o.zebrany || !this.stan.odkryte[o.y][o.x]) continue;
      const barwa =
        o.rodzaj === 'potwor'
          ? C.foe
          : o.rodzaj === 'zamek'
            ? o.wlasciciel === 'gracz'
              ? C.ally
              : C.foe
            : C.gold;
      g.fillStyle(barwa, 1);
      g.fillRect(mx + o.x * kw - 1, my + o.y * kh - 1, Math.ceil(kw) + 2, Math.ceil(kh) + 2);
    }
    g.fillStyle(C.white, 1);
    g.fillRect(mx + this.stan.bohater.x * kw - 1, my + this.stan.bohater.y * kh - 1, kw + 3, kh + 3);
    this.rysujRamkeWidoku();
  }

  /** Prostokąt na minimapie pokazujący, którą część planszy właśnie widać. */
  private rysujRamkeWidoku() {
    if (!this.ramkaWidoku) return;
    const g = this.ramkaWidoku;
    const mx = this.minimapa.getData('x') as number;
    const my = this.minimapa.getData('y') as number;
    const bok = this.minimapa.getData('bok') as number;
    const skala = bok / this.mapaW;
    g.clear();
    g.lineStyle(1.5, C.white, 0.9);
    g.strokeRect(
      mx - this.przewX * skala,
      my - this.przewY * skala,
      this.oknoW * skala,
      this.oknoH * skala
    );
  }

  // ---------- interakcja ----------

  private ruchMyszy(p: Phaser.Input.Pointer) {
    if (this.zajety) {
      this.kursorZnak.setVisible(false);
      return;
    }
    const { x, y } = this.zEkranu(p.x, p.y);
    if (!this.wRamie(p.x, p.y) || !this.wGranicach(x, y)) {
      this.podpowiedz.setText(DOMYSLNA_PODPOWIEDZ);
      this.kursorZnak.setVisible(false);
      // Poza planszą (panel, przyciski) wraca zwykły kursor systemowy —
      // to tam żyją prawdziwe elementy HUD-u z własnym `useHandCursor`.
      this.input.setDefaultCursor('default');
      return;
    }
    // Od tego miejsca kursor systemowy jest wyłączony w całości — zastępuje
    // go nasz znak, żeby to, co widać, i to, co obiecuje podpowiedź, były
    // dokładnie tym samym rysunkiem, a nie dwoma osobnymi kursorami naraz.
    this.input.setDefaultCursor('none');
    this.kursorZnak.setPosition(p.x, p.y);
    if (!this.stan.odkryte[y][x]) {
      this.podpowiedz.setText('Nieznany teren — trzeba tam podejść.');
      this.pokazZnakKursora(null);
      return;
    }
    // Kursor nad celem wytyczonej trasy, do którego nie da się dojść w tej
    // turze, ma od razu mówić, ile dni to zajmie — jak w Heroes 3.
    const t = this.trasaBiezaca;
    const celTrasy = t && t.length ? t[t.length - 1] : null;
    if (celTrasy && celTrasy.x === x && celTrasy.y === y) {
      const dni = dniNaTrase(this.stan.bohater, t!);
      if (dni > 1) {
        this.podpowiedz.setText(
          `Dojście zajmie ${dni} ${dni === 1 ? 'dzień' : 'dni'}.\nKliknij, żeby ruszyć.`
        );
        this.pokazZnakKursora(ICON.hourglass, String(dni));
        return;
      }
    }
    // Kursor musi powiedzieć, które kliknięcie dostaniesz — na bryle zamku
    // inne niż na jego polu. Bez tego podział jest niewidzialny.
    const zamek = this.zamekPodKursorem(p);
    if (zamek) {
      this.podpowiedz.setText(`${zamek.nazwa}\nKliknij, żeby wejść do miasta.`);
      this.pokazZnakKursora(ICON.star);
      return;
    }
    const o = this.obiektPodKursorem(p) ?? obiektNa(this.stan, x, y);
    const straz = strzezoneProzez(this.stan, x, y);
    // Miecz nad wszystkim, co skończy się bitwą — potwór wprost albo
    // strażnik pilnujący pola czy obiektu. Gwiazda nad resztą, co da się
    // odwiedzić: to zawsze albo surowiec, albo skrzynia, albo budowla —
    // czyli coś, co po wejściu COŚ robi.
    const bedzieBitwa = o?.rodzaj === 'potwor' || !!(straz && straz !== o);
    if (o) {
      this.podpowiedz.setText(this.opisObiektu(o));
      this.pokazZnakKursora(bedzieBitwa ? ICON.sword : ICON.star);
      return;
    }
    const teren = TEREN_INFO[this.stan.teren[y][x]];
    if (straz && teren.koszt !== null) {
      this.podpowiedz.setText(
        `${teren.nazwa} — koszt ${teren.koszt}\nPilnuje tego: ${straz.nazwa}.\nWejście tu zaczyna bitwę.`
      );
      this.pokazZnakKursora(ICON.sword);
      return;
    }
    this.podpowiedz.setText(
      teren.koszt === null
        ? `${teren.nazwa} — nie do przejścia`
        : `${teren.nazwa} — koszt ${teren.koszt}`
    );
    // Nie do przejścia dostaje czaszkę — jedyny wypadek, gdzie kursor
    // ostrzega, zamiast tylko milczeć jak nad zwykłą, przejezdną trawą.
    this.pokazZnakKursora(teren.koszt === null ? ICON.skull : null);
  }

  private opisObiektu(o: Obiekt) {
    if (o.rodzaj === 'potwor') {
      const armia = (o.oddzialy ?? []).map((s) => `${s.ile} × ${s.nazwa}`).join(', ');
      return `${o.nazwa}\n${armia}\nWejdź, żeby stoczyć bitwę.`;
    }
    if (o.rodzaj === 'kopalnia') {
      const co = SUROWIEC_INFO[o.surowiec ?? 'pokeball'].dopelniacz;
      return o.wlasciciel === 'gracz'
        ? `${o.nazwa} — twoja\n+${o.ile} ${co} dziennie`
        : `${o.nazwa}\nWejdź, żeby zająć: +${o.ile} ${co} dziennie`;
    }
    if (o.rodzaj === 'zamek')
      return `${o.nazwa}\n${o.wlasciciel === 'gracz' ? 'Twój zamek' : 'Zamek przeciwnika'}`;
    if (o.rodzaj === 'budynek') {
      const b = budowlaPoId(o.budynek);
      if (!b) return o.nazwa;
      // Budowla, z której już korzystaliśmy, ma to mówić przed wejściem,
      // a nie po. Nadłożenie drogi po nic to dla ośmiolatka stracona tura.
      if (o.uzyteDnia !== undefined && b.odnowa !== 0) {
        const zostalo = b.odnowa === undefined ? null : b.odnowa - (this.stan.dzien - o.uzyteDnia);
        if (zostalo === null) return `${b.nazwa}\nTu już byliśmy`;
        if (zostalo > 0)
          return `${b.nazwa}\nZnów będzie czynne za ${zostalo} ${zostalo === 1 ? 'dzień' : 'dni'}`;
      }
      if (b.efekt.typ === 'gniazdo' && o.wlasciciel === 'gracz') return `${b.nazwa} — twoje\n${b.opis}`;
      return `${b.nazwa}\n${b.opis}`;
    }
    if (o.rodzaj === 'skrzynia') return 'Skrzynia\nW środku pokeballe albo doświadczenie.';
    if (o.rodzaj === 'artefakt') return `${o.nazwa}\nArtefakt — wzmacnia bohatera na stałe.`;
    return `${o.nazwa}\n+${o.ile} ${SUROWIEC_INFO[o.surowiec ?? 'pokeball'].dopelniacz}`;
  }

  /** Trasa do pola — wystawione dla sond, żeby dało się sprawdzić omijanie stref. */
  trasaDo(x: number, y: number) {
    return trasa(this.stan, x, y);
  }

  private klikMapa(p: Phaser.Input.Pointer) {
    if (!this.wRamie(p.x, p.y)) return;
    // Bez tego znak (miecz, gwiazda, klepsydra) wisiał przy kursorze przez
    // całą bitwę czy animację marszu, jeśli mysz się w tym czasie nie ruszyła.
    this.kursorZnak.setVisible(false);
    // Klik w trakcie marszu przerywa go — jak w Heroes 3, gdzie kliknięcie
    // gdzie indziej podczas chodzenia zatrzymuje bohatera i pozwala wskazać
    // nową trasę, zamiast czekać, aż dojdzie do wcześniej wybranego celu.
    if (this.wRuchu) {
      this.celPoPrzerwaniu = this.obiektPodKursorem(p) ?? this.zEkranu(p.x, p.y);
      this.przerwijRuch = true;
      return;
    }
    if (this.zajety) return;
    const zamek = this.zamekPodKursorem(p);
    if (zamek) return this.pokazZamek(zamek);
    const cel = this.obiektPodKursorem(p) ?? this.zEkranu(p.x, p.y);
    // Klik w pole, na którym stoi bohater, otwiera jego ekran — jak w Heroes 3,
    // gdzie kliknięcie w aktywnego bohatera na planszy pokazuje kartę postaci.
    // Wcześniej prowadziło to donikąd: trasa do własnego pola jest pusta,
    // więc kliknięcie po prostu nic nie robiło.
    if (cel.x === this.stan.bohater.x && cel.y === this.stan.bohater.y) {
      return this.otworzBohatera();
    }
    this.celujW(cel.x, cel.y);
  }

  /**
   * Czy kursor stoi na BRYLE własnego zamku — czyli czy kliknięcie ma otworzyć
   * miasto, zamiast prowadzić tam bohatera.
   *
   * Tak to działa w Heroes 3: zamek zajmuje kilka pól, wejście na dole
   * prowadzi bohatera, a reszta bryły otwiera ekran miasta i kursor się przy
   * tym zmienia. Nasz zamek stoi na jednym polu, ale ma wysoki rysunek — więc
   * ta sama zasada wychodzi tu jako podział „pole kontra wieża nad polem".
   *
   * Rozróżnienie musi zostać, bo obie rzeczy są potrzebne: werbunek dokłada
   * stworki do armii BOHATERA, więc żeby werbować, trzeba go tam naprawdę
   * przyprowadzić.
   */
  private zamekPodKursorem(p: Phaser.Input.Pointer): Obiekt | undefined {
    const pole = this.zEkranu(p.x, p.y);
    // Najpierw mury: pole bryły jest nieprzejezdne, więc nie ma tam czego
    // pokazywać poza wejściem do środka.
    const mur = brylaNa(this.stan, pole.x, pole.y);
    if (mur?.rodzaj === 'zamek' && mur.wlasciciel === 'gracz') return mur;
    const o = this.obiektPodKursorem(p);
    if (!o || o.rodzaj !== 'zamek' || o.wlasciciel !== 'gracz') return undefined;
    // Bohater stojący w bramie: całe pole otwiera miasto, bo nie ma go już
    // dokąd prowadzić.
    if (this.stan.bohater.x === o.x && this.stan.bohater.y === o.y) return o;
    // Rysunek zamku wystaje ponad bramę. Klik w bramę prowadzi tam bohatera
    // (bez tego nie da się werbować), klik w to, co nad nią — otwiera miasto.
    return pole.x === o.x && pole.y === o.y ? undefined : o;
  }

  /**
   * Który obiekt gracz naprawdę wskazał. Sprawdzamy prostokąty rysunków,
   * od najniżej stojącego — obiekt bliżej dołu ekranu zasłania te za nim,
   * więc to on ma pierwszeństwo, tak jak przy rysowaniu.
   */
  private obiektPodKursorem(p: Phaser.Input.Pointer) {
    const swiatowy = this.kamera.getWorldPoint(p.x, p.y);
    let najlepszy: Obiekt | undefined;
    for (const { o, im } of this.trafienia) {
      if (o.zebrany || !im.active) continue;
      if (!im.getBounds().contains(swiatowy.x, swiatowy.y)) continue;
      if (!this.wRysunku(im, swiatowy.x, swiatowy.y)) continue;
      if (!najlepszy || o.y > najlepszy.y) najlepszy = o;
    }
    return najlepszy;
  }

  /**
   * Pierwsze wskazanie pola pokazuje trasę, drugie w to samo miejsce nią rusza.
   * Wspólne dla kliknięcia w teren i w rysunek obiektu.
   */
  private celujW(x: number, y: number) {
    if (!this.wGranicach(x, y) || kosztPola(this.stan, x, y) === null) return;
    const t = this.trasaBiezaca;
    const cel = t && t.length > 0 ? t[t.length - 1] : null;
    if (cel && cel.x === x && cel.y === y) {
      this.idz(t!);
      return;
    }
    this.trasaBiezaca = trasa(this.stan, x, y);
    this.pokazTrase();
  }

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

  private kierunekKroku(dx: number, dy: number): Kierunek {
    if (dx !== 0) return dx > 0 ? 'prawo' : 'lewo';
    return dy > 0 ? 'dol' : 'gora';
  }

  private idz(kroki: Krok[]) {
    let ile = zasiegNaTure(this.stan.bohater, kroki);
    // Trasa za daleka na dzisiaj: zapamiętujemy cel, żeby nowy dzień pokazał
    // ją od razu jako zaznaczoną, zamiast każąc klikać drugi raz w to samo.
    const celFinalny = kroki[kroki.length - 1];
    this.stan.bohater.celDlugiejTrasy =
      celFinalny && ile < kroki.length ? { x: celFinalny.x, y: celFinalny.y } : undefined;
    if (ile === 0) return;

    // Pod zamkniętą strażnicę podchodzi się, a nie wchodzi na nią.
    //
    // Reszta obiektów leży NA drodze i bohater staje na ich polu. Brama jest
    // murem: gdyby bohater na nią wszedł, stałby w środku muru, a po odmowie
    // („nie masz klucza") zostałby tam na stałe. Zatrzymujemy więc marsz pole
    // wcześniej i stamtąd próbujemy klucza — dokładnie tak, jak wygląda to
    // w Heroes 3.
    const ostatni = kroki[ile - 1];
    // Stos surowca, artefakt, skrzynia i POTWÓR odwiedza się z sąsiedniego
    // pola, tak samo jak otwiera się bramę: marsz kończy się pole wcześniej.
    // Patrz `Z_SASIEDNIEGO_POLA` w `src/data/mapa.ts`, tam jest powód i to,
    // jak robi to Heroes 3.
    const zObok =
      (ostatni ? zamknietaBrama(this.stan, ostatni.x, ostatni.y) : undefined) ??
      (ostatni ? zSasiedniegoPola(this.stan, ostatni.x, ostatni.y) : undefined);
    if (zObok) {
      ile -= 1;
      if (ile === 0) {
        this.wejdzNa(zObok);
        this.odswiezWszystko();
        return;
      }
    }

    this.zajety = true;
    this.wRuchu = true;
    this.warstwaTrasy.clear();

    let i = 0;
    const dalej = () => {
      if (i >= ile) {
        this.zajety = false;
        this.wRuchu = false;
        this.trasaBiezaca = null;
        this.bohaterSprite.stop();
        this.bohaterSprite.setFrame(KIERUNEK_WIERSZ[this.kierunek] * 4);
        const o = obiektNa(this.stan, this.stan.bohater.x, this.stan.bohater.y);
        // Straż ma pierwszeństwo PRZED obiektem, na który się weszło.
        //
        // Wcześniej sprawdzaliśmy ją tylko wtedy, gdy na polu nie było nic —
        // więc wejście wprost na pilnowaną kopalnię omijało strażnika
        // i zajmowało ją za darmo. Cała różnica między kopalnią pilnowaną
        // a niepilnowaną znikała, a to jedyne, co na tej mapie chroni nagrody.
        const straz = strzezoneProzez(this.stan, this.stan.bohater.x, this.stan.bohater.y);
        if (straz && straz !== o) {
          this.zacznijBitwe(straz);
        } else if (o) {
          this.wejdzNa(o);
        } else if (zObok) {
          // Marsz skrócony o pole: stoimy PRZED bramą albo przed rzeczą, po
          // którą przyszliśmy, i dopiero teraz sięgamy.
          this.wejdzNa(zObok);
        }
        this.odswiezWszystko();
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
      if (odslon(this.stan) > 0) this.malujMgle();
      const { x, y } = this.naEkran(k.x, k.y);
      this.bohaterObj.setDepth(k.y + 0.8);
      this.dosunDoBohatera();
      sfx(this, 'krok');
      this.tweens.add({
        targets: this.bohaterObj,
        x,
        y,
        duration: 160,
        ease: 'Linear',
        onComplete: () => {
          this.odswiezWszystko();
          if (this.przerwijRuch) {
            this.przerwijRuch = false;
            this.zajety = false;
            this.wRuchu = false;
            this.trasaBiezaca = null;
            // Zamiar przerwano — cel z niedokończonej trasy przestaje
            // obowiązywać, żeby nowy dzień nie wskrzeszał porzuconego planu.
            this.stan.bohater.celDlugiejTrasy = undefined;
            this.bohaterSprite.stop();
            this.bohaterSprite.setFrame(KIERUNEK_WIERSZ[this.kierunek] * 4);
            const cel = this.celPoPrzerwaniu;
            this.celPoPrzerwaniu = null;
            if (cel) this.celujW(cel.x, cel.y);
            return;
          }
          dalej();
        },
      });
    };
    dalej();
  }

  private wejdzNa(o: Obiekt) {
    const wynik = odwiedz(this.stan, o);
    zapisz('mapa', `wejście na obiekt: ${o.nazwa}`, {
      id: o.id,
      rodzaj: o.rodzaj,
      pole: `${o.x},${o.y}`,
      skutek: {
        bitwa: wynik.bitwaZ?.id,
        wybor: wynik.wybor !== undefined,
        zamek: wynik.zamek?.id,
        zajete: wynik.zajete,
      },
    });

    if (wynik.bitwaZ) return this.zacznijBitwe(wynik.bitwaZ);
    if (wynik.wybor) return this.zapytajOSkrzynie(wynik.wybor);
    if (wynik.pytanie) {
      sfx(this, 'wejscie');
      return this.zapytajOBudowle(wynik.pytanie);
    }
    if (wynik.zamek) return this.pokazZamek(wynik.zamek);

    // Wieża obserwacyjna odsłania mgłę bez ruchu bohatera, więc trzeba ją
    // przemalować tutaj — pętla ruchu robi to tylko po każdym kroku.
    if (wynik.odkryto) this.malujMgle();
    if (wynik.opis) this.napisUlotny(wynik.opis);
    if (wynik.przenies) this.przeniesBohatera(wynik.przenies.x, wynik.przenies.y);
    if (o.zebrany) {
      sfx(this, 'zbior');
      this.znikaj(o);
    }
    if (wynik.zajete) {
      sfx(this, 'zajecie');
      this.podnies(o);
    }
    this.odswiezWszystko();
  }

  private znikaj(o: Obiekt) {
    const kont = this.ikonyObiektow[o.id];
    if (!kont) return;
    this.tweens.add({
      targets: kont,
      alpha: 0,
      y: kont.y - 12,
      duration: 380,
      onComplete: () => kont.destroy(),
    });
  }

  private podnies(o: Obiekt) {
    const flaga = this.ikonyObiektow[o.id]?.getData('flaga') as
      | Phaser.GameObjects.Graphics
      | undefined;
    if (!flaga) return;
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

  /**
   * Skrzynia z Heroes 3 to pytanie, a nie nagroda. Wybór między pokeballami
   * a doświadczeniem jest pierwszą decyzją w tej grze, która nie ma jednej
   * dobrej odpowiedzi — i dlatego wart jest osobnego okna.
   */
  private zapytajOSkrzynie(w: WyborSkrzyni) {
    this.zajety = true;
    const szer = 360;
    const wys = 176;
    const cx = this.mapaX + this.oknoW / 2;
    const cy = this.mapaY + this.oknoH / 2;
    // Okno nie należy ani do planszy (jechałoby razem z mapą), ani do HUD-u
    // (plansza rysuje się po nim i by je zakryła) — idzie do kamery okien.
    const doOkna: Phaser.GameObjects.GameObject[] = [];

    const zaslona = this.add
      .rectangle(0, 0, this.scale.width, this.scale.height, C.shadow, 0.45)
      .setOrigin(0, 0)
      .setDepth(Z.overlay);
    const tlo = this.add.graphics().setDepth(Z.overlay + 1);
    plate(tlo, cx - szer / 2, cy - wys / 2, szer, wys, 12, C.panel, C.gold, {
      light: 0.24,
      dark: 0.22,
      gloss: 0.2,
      edgeW: 3,
    });
    const napisy = [
      this.add
        .text(cx, cy - wys / 2 + 24, 'Skrzynia!', display(20, H.gold))
        .setOrigin(0.5)
        .setDepth(Z.overlay + 2),
      this.add
        .text(cx, cy - wys / 2 + 54, 'Co wolisz?', body(13, H.ink))
        .setOrigin(0.5)
        .setDepth(Z.overlay + 2),
    ];

    doOkna.push(zaslona, tlo, ...napisy);
    this.naWierzchu(...doOkna);

    const zamknij = (co: 'pokeballe' | 'doswiadczenie') => {
      const opis = wezZeSkrzyni(this.stan, w, co);
      [zaslona, tlo, ...napisy].forEach((x) => x.destroy());
      przyciski.forEach((p) => p.destroy());
      sfx(this, 'zbior');
      this.znikaj(w.obiekt);
      this.napisUlotny(opis);
      this.zajety = false;
      this.odswiezWszystko();
    };

    // Przyciski powstają jako osobne obiekty sceny, więc trzeba je oddać
    // kamerze okien tak samo jak tło. Notujemy, co przybyło na liście sceny,
    // i przekazujemy dokładnie to.
    const przedPrzyciskami = this.children.list.length;
    const przyciski = [
      makeHudButton(this, {
        x: cx - 86,
        y: cy + 36,
        w: 156,
        h: 42,
        icon: ICON.star,
        tone: C.gold,
        toneDeep: C.goldDeep,
        // Przyciski HUD siedzą domyślnie na głębokości 62, czyli POD zasłoną
        // okna (100). Dlatego okno skrzyni wyglądało na puste: tło i napisy
        // były, a jedyne, co miało w nim znaczenie — przyciski — chowało się
        // pod przyciemnieniem.
        depth: Z.overlay + 3,
        onClick: () => zamknij('pokeballe'),
      }),
      makeHudButton(this, {
        x: cx + 86,
        y: cy + 36,
        w: 156,
        h: 42,
        icon: ICON.banner,
        tone: C.ally,
        toneDeep: C.panelDeep,
        depth: Z.overlay + 3,
        onClick: () => zamknij('doswiadczenie'),
      }),
    ];
    this.naWierzchu(...this.children.list.slice(przedPrzyciskami));
    przyciski[0].setLabel(`${w.pokeballe} pokeballi`);
    przyciski[1].setLabel(`${w.doswiadczenie} dośw.`);
  }

  /**
   * Przeniesienie przez portal. To NIE jest ruch: nie kosztuje punktów, nie da
   * się go przerwać i nie przechodzi przez pola po drodze — więc omija całą
   * pętlę `idz`. Mgła musi się odsłonić po drugiej stronie od razu, inaczej
   * bohater ląduje w czarnej plamie i wygląda to jak usterka.
   */
  private przeniesBohatera(x: number, y: number) {
    this.stan.bohater.x = x;
    this.stan.bohater.y = y;
    const { x: ex, y: ey } = this.naEkran(x, y);
    this.bohaterObj.setPosition(ex, ey).setDepth(y + 0.8);
    if (odslon(this.stan) > 0) this.malujMgle();
    this.wysrodkujNa(x, y, true);
    this.odswiezWszystko();
  }

  /**
   * Okno z pytaniem. Ta sama konstrukcja co przy skrzyni — bo to jest ta sama
   * rzecz: przyciemniony ekran, tabliczka i po jednym przycisku na odpowiedź.
   * Skrzynia zostaje przy własnym oknie, bo pokazuje dwie konkretne nagrody,
   * a nie listę wyborów.
   */
  private zapytajOBudowle(p: Pytanie) {
    this.zajety = true;
    const szer = 380;
    const wys = 176;
    const cx = this.mapaX + this.oknoW / 2;
    const cy = this.mapaY + this.oknoH / 2;

    const zaslona = this.add
      .rectangle(0, 0, this.scale.width, this.scale.height, C.shadow, 0.45)
      .setOrigin(0, 0)
      .setDepth(Z.overlay);
    const tlo = this.add.graphics().setDepth(Z.overlay + 1);
    plate(tlo, cx - szer / 2, cy - wys / 2, szer, wys, 12, C.panel, C.gold, {
      light: 0.24,
      dark: 0.22,
      gloss: 0.2,
      edgeW: 3,
    });
    const napisy = [
      this.add
        .text(cx, cy - wys / 2 + 24, p.tytul, display(20, H.gold))
        .setOrigin(0.5)
        .setDepth(Z.overlay + 2),
      this.add
        .text(cx, cy - wys / 2 + 56, p.tresc, body(13, H.ink))
        .setOrigin(0.5)
        .setDepth(Z.overlay + 2),
    ];
    this.naWierzchu(zaslona, tlo, ...napisy);

    const zamknij = (klucz: string) => {
      const opis = odpowiedzNaPytanie(this.stan, p, klucz);
      [zaslona, tlo, ...napisy].forEach((x) => x.destroy());
      przyciski.forEach((b) => b.destroy());
      if (p.obiekt.zebrany) {
        sfx(this, 'zbior');
        this.znikaj(p.obiekt);
      }
      if (opis) this.napisUlotny(opis);
      this.zajety = false;
      this.odswiezWszystko();
    };

    // Przyciski powstają jako osobne obiekty sceny i trzeba je oddać kamerze
    // okien tak samo jak tło — inaczej okno wygląda na puste, bo jedyne, co
    // się w nim klika, chowa się pod przyciemnieniem.
    const przedPrzyciskami = this.children.list.length;
    const odstep = 172;
    const przyciski = p.opcje.map((opcja, i) =>
      makeHudButton(this, {
        x: cx + (i - (p.opcje.length - 1) / 2) * odstep,
        y: cy + 36,
        w: 160,
        h: 42,
        icon: i === 0 ? ICON.star : ICON.banner,
        tone: i === 0 ? C.gold : C.ally,
        toneDeep: i === 0 ? C.goldDeep : C.panelDeep,
        depth: Z.overlay + 3,
        onClick: () => zamknij(opcja.klucz),
      })
    );
    this.naWierzchu(...this.children.list.slice(przedPrzyciskami));
    przyciski.forEach((b, i) => b.setLabel(p.opcje[i].etykieta));
  }

  /**
   * Ekran bohatera. Wchodzi się tu kliknięciem w kartę w panelu ALBO w samą
   * sylwetkę na mapie — tak samo jak w Heroes 3, gdzie działa i portret,
   * i podwójne kliknięcie w bohatera na planszy.
   *
   * Stan idzie do rejestru gry, nie w parametrze sceny: ekran bohatera
   * PRZESTAWIA armię, a nie tylko ją pokazuje, więc musi pisać po tym samym
   * obiekcie, do którego mapa wróci.
   */
  private otworzBohatera() {
    if (this.zajety) return;
    this.registry.set(KLUCZ_STANU, this.stan);
    this.scene.start('bohater');
  }

  /**
   * Uzdrowiciel: część poległych wraca po wygranej bitwie.
   *
   * Liczymy ze SKŁADU SPRZED BITWY, bo wynik bitwy zna wyłącznie ocalałych —
   * a „ilu zginęło" to jedyna liczba, z której ta umiejętność może korzystać.
   * Wracają tylko do stosów, które PRZEŻYŁY: wskrzeszanie wybitego do zera
   * oddziału byłoby cofaniem bitwy, a nie leczeniem rannych.
   */
  private uzdrowiciel(): number {
    const odsetek = efekt(this.stan.bohater, 'leczenie');
    const przed = this.registry.get(KLUCZ_PRZED_BITWA) as
      | Array<{ slot: number; ile: number }>
      | undefined;
    this.registry.remove(KLUCZ_PRZED_BITWA);
    if (odsetek <= 0 || !przed) return 0;

    // Po SLOCIE, nie po gatunku: dwa sloty tego samego gatunku (rozdzielony
    // stos) to zwykły układ, a szukanie po `sprite` leczyło pierwszy z brzegu
    // dwa razy i nie leczyło drugiego.
    let wrocilo = 0;
    for (const wpis of przed) {
      const stos = this.stan.bohater.armia[wpis.slot];
      if (!stos || stos.ile >= wpis.ile) continue;
      const straty = wpis.ile - stos.ile;
      const wraca = Math.floor(straty * odsetek);
      stos.ile += wraca;
      wrocilo += wraca;
    }
    return wrocilo;
  }

  /**
   * Okno awansu: co dał poziom i JAKĄ UMIEJĘTNOŚĆ wybierasz.
   *
   * Dwie karty, jak w Heroes 3. To jest jedyny moment w grze, w którym gracz
   * podejmuje decyzję o tym, kim jest jego bohater — przyrost ataku i obrony
   * dostaje tak czy inaczej, więc gdyby awans był tylko nim, nie byłoby czego
   * ogłaszać. Okno zatrzymuje grę, bo nagroda, którą da się przegapić, nie
   * jest nagrodą.
   */
  private oknoAwansu(poziomPrzed: number, poziomPo: number) {
    this.zajety = true;
    sfx(this, 'awans');
    const przed = bonusPoziomu(poziomPrzed);
    const po = bonusPoziomu(poziomPo);
    const zyski: string[] = [];
    if (po.atak > przed.atak) zyski.push(`+${po.atak - przed.atak} atak`);
    if (po.obrona > przed.obrona) zyski.push(`+${po.obrona - przed.obrona} obrona`);
    if (po.ruch > przed.ruch) zyski.push(`+${po.ruch - przed.ruch} ruchu`);

    const oferty = ofertaAwansu(this.stan.bohater, (n) => Phaser.Math.RND.between(0, n - 1));

    const szer = 560;
    const wys = oferty.length ? 330 : 190;
    const cx = MARGINES + this.oknoW / 2;
    const cy = GORA + this.oknoH / 2;
    const zaslona = this.add
      .rectangle(0, 0, this.scale.width, this.scale.height, 0x04101a, 0.72)
      .setOrigin(0, 0)
      .setDepth(Z.overlay)
      .setInteractive();
    const tlo = this.add.graphics().setDepth(Z.overlay + 1);
    cienPod(tlo, cx - szer / 2, cy - wys / 2, szer, wys, 16, 1);
    plate(tlo, cx - szer / 2, cy - wys / 2, szer, wys, 16, C.panel, C.goldDeep, {
      light: 0.2,
      dark: 0.2,
      gloss: 0.14,
      drop: 0,
      edgeW: 3,
    });
    listwa(tlo, cx - szer / 2 + 8, cy - wys / 2 + 8, szer - 16, 38, 10, C.panelDeep, C.gold);
    naroznik(tlo, cx - szer / 2 + 14, cy - wys / 2 + 14, 1, 1, 24);
    naroznik(tlo, cx + szer / 2 - 14, cy - wys / 2 + 14, -1, 1, 24);
    naroznik(tlo, cx - szer / 2 + 14, cy + wys / 2 - 14, 1, -1, 24);
    naroznik(tlo, cx + szer / 2 - 14, cy + wys / 2 - 14, -1, -1, 24);

    const czesci: Phaser.GameObjects.GameObject[] = [zaslona, tlo];
    const dodaj = <X extends Phaser.GameObjects.GameObject>(x: X) => {
      czesci.push(x);
      return x;
    };
    dodaj(
      this.add
        .text(cx, cy - wys / 2 + 27, `AWANS NA POZIOM ${poziomPo}`, {
          ...display(19, H.goldLight),
          letterSpacing: 1.5,
        })
        .setOrigin(0.5)
        .setDepth(Z.overlay + 2)
    );
    dodaj(
      this.add
        .text(cx, cy - wys / 2 + 60, zyski.join('   ·   ') || 'Statystyki bez zmian', body(13, H.ink))
        .setOrigin(0.5)
        .setDepth(Z.overlay + 2)
    );

    const przyciski: ReturnType<typeof makeHudButton>[] = [];
    const zamknij = (opis?: string) => {
      czesci.forEach((x) => x.destroy());
      przyciski.forEach((b) => b.destroy());
      this.stan.bohater.poziomOdebrany = poziomPo;
      this.zajety = false;
      if (opis) this.napisUlotny(opis);
      // `odswiezWszystko` sam sprawdzi, czy czeka jeszcze jeden awans —
      // przy skoku o dwa poziomy naraz okno pokaże się drugi raz.
      this.odswiezWszystko();
    };

    if (!oferty.length) {
      // Cztery gniazda pełne, wszystko mistrzowskie — nie ma czego proponować.
      // Mówimy to wprost, zamiast pokazywać puste okno wyboru.
      dodaj(
        this.add
          .text(cx, cy + 10, 'Wszystkie umiejętności na mistrzowskim poziomie.', body(12, H.inkSoft))
          .setOrigin(0.5)
          .setDepth(Z.overlay + 2)
      );
      const ok = makeHudButton(this, {
        x: cx,
        y: cy + wys / 2 - 34,
        w: 180,
        h: 40,
        icon: ICON.star,
        tone: C.gold,
        toneDeep: C.goldDeep,
        depth: Z.overlay + 3,
        onClick: () => zamknij(),
      });
      ok.setLabel('Dalej');
      przyciski.push(ok);
      this.naWierzchu(...this.children.list.slice(this.children.list.length - 40));
      return;
    }

    dodaj(
      this.add
        .text(cx, cy - wys / 2 + 84, 'WYBIERZ UMIEJĘTNOŚĆ', {
          ...body(11, H.inkSoft),
          fontStyle: 'bold',
          letterSpacing: 1.2,
        })
        .setOrigin(0.5)
        .setDepth(Z.overlay + 2)
    );

    const kartaW = 236;
    const kartaH = 150;
    const kartaY = cy - wys / 2 + 104;
    oferty.forEach((oferta, i) => {
      const u = umiejetnoscPoId(oferta.id)!;
      const kx = cx + (i - (oferty.length - 1) / 2) * (kartaW + 20) - kartaW / 2;
      const g = dodaj(this.add.graphics().setDepth(Z.overlay + 2)) as Phaser.GameObjects.Graphics;
      wneka(g, kx, kartaY, kartaW, kartaH, 10, mix(C.panelDeep, C.shadow, 0.3), 1);
      // Nowa umiejętność dostaje złotą wstążkę, ulepszenie — niebieską.
      // Gracz ma widzieć różnicę „dokładam coś" kontra „podbijam coś",
      // zanim przeczyta obie karty.
      listwa(
        g,
        kx + 8,
        kartaY + 8,
        kartaW - 16,
        24,
        7,
        oferta.nowa ? C.goldDeep : C.allyDeep,
        oferta.nowa ? C.gold : C.ally
      );
      dodaj(
        this.add
          .text(kx + kartaW / 2, kartaY + 20, oferta.nowa ? 'NOWA' : 'ULEPSZENIE', {
            ...body(10, H.white),
            fontStyle: 'bold',
            letterSpacing: 1.2,
          })
          .setOrigin(0.5)
          .setDepth(Z.overlay + 3)
      );
      dodaj(
        this.add
          .text(kx + kartaW / 2, kartaY + 52, u.nazwa, display(17, H.goldLight))
          .setOrigin(0.5)
          .setDepth(Z.overlay + 3)
      );
      dodaj(
        this.add
          .text(kx + kartaW / 2, kartaY + 74, POZIOMY[oferta.poziom - 1], body(11, '#9dc3d6'))
          .setOrigin(0.5)
          .setDepth(Z.overlay + 3)
      );
      dodaj(
        this.add
          .text(kx + kartaW / 2, kartaY + 96, opisWartosci(u, oferta.poziom), display(18, H.gold))
          .setOrigin(0.5)
          .setDepth(Z.overlay + 3)
      );
      dodaj(
        this.add
          .text(kx + kartaW / 2, kartaY + 124, u.opis, {
            ...body(10.5, '#dff2fb'),
            align: 'center',
          })
          .setOrigin(0.5)
          .setDepth(Z.overlay + 3)
          .setWordWrapWidth(kartaW - 24)
      );

      const b = makeHudButton(this, {
        x: kx + kartaW / 2,
        y: cy + wys / 2 - 32,
        w: kartaW - 20,
        h: 38,
        icon: oferta.nowa ? ICON.star : ICON.banner,
        tone: oferta.nowa ? C.gold : C.ally,
        toneDeep: oferta.nowa ? C.goldDeep : C.allyDeep,
        depth: Z.overlay + 3,
        onClick: () => zamknij(przyznaj(this.stan.bohater, oferta)),
      });
      b.setLabel(oferta.nowa ? 'Naucz się' : 'Ulepsz');
      przyciski.push(b);
    });

    // Okno musi trafić do kamery rysowanej PO planszy — inaczej mapa
    // zamalowuje je w tej samej klatce i gra wygląda na zawieszoną.
    this.naWierzchu(...czesci);
  }

  private pokazZamek(o: Obiekt) {
    sfx(this, 'wejscie');
    stopMusic(this);
    stopAmbient(this);
    this.registry.set(KLUCZ_STANU, this.stan);
    this.registry.set('otwarty-zamek', o.id);
    this.scene.start('zamek');
  }

  /**
   * Oddaje sterowanie scenie bitwy. Stan mapy zostaje w rejestrze gry, więc
   * po powrocie wszystko jest tam, gdzie było; bitwa dostaje tylko skład obu
   * armii i numer obiektu, o który się bije.
   */
  private zacznijBitwe(o: Obiekt) {
    this.zajety = true;
    stopMusic(this);
    stopAmbient(this);
    // Skład PRZED bitwą: Uzdrowiciel liczy straty, a te znamy tylko przez
    // porównanie z tym, co ruszyło do boju. Wynik bitwy zna wyłącznie
    // ocalałych.
    this.registry.set(
      KLUCZ_PRZED_BITWA,
      this.stan.bohater.armia
        .map((od, slot) => (od && od.ile > 0 ? { slot, ile: od.ile } : null))
        .filter(Boolean)
    );
    this.napisUlotny(`${o.nazwa}\nDo boju!`);
    this.registry.set(KLUCZ_STANU, this.stan);
    this.time.delayedCall(750, () => {
      this.scene.start('battle', {
        // Każdy stos jedzie do bitwy ZE SWOIM numerem slotu. Bez tego wynik
        // wraca jako gęsta lista i układ, który gracz ułożył na ekranie
        // bohatera, rozsypuje się po każdej walce — dziury się zasklepiają,
        // a oddziały zjeżdżają w lewo.
        gracz: this.stan.bohater.armia
          .map((o, i) => (o && o.ile > 0 ? { ...o, slot: i } : null))
          .filter((o): o is NonNullable<typeof o> => !!o),
        wrog: o.oddzialy ?? [],
        oObiekt: o.id,
        powrot: 'adventure',
        // Drugorzędne umiejętności wchodzą do walki jako trzy liczby, a nie
        // jako bohater: symulacja bitwy nie zna postaci i nie powinna, żeby
        // `balance.ts` dalej mierzył czystą siłę frakcji.
        // Razem z atakiem i obroną bohatera: to jedyne miejsce, w którym te
        // dwie liczby wchodzą do walki. Wcześniej rosły w panelu i nie robiły
        // nic — arena je podnosiła, artefakty je podnosiły, a bitwa o nich
        // nie wiedziała.
        bonusGracza: {
          wrecz: efekt(this.stan.bohater, 'wrecz'),
          strzal: efekt(this.stan.bohater, 'strzal'),
          pancerz: efekt(this.stan.bohater, 'pancerz'),
          atak: statystyki(this.stan.bohater).atak,
          obrona: statystyki(this.stan.bohater).obrona,
        },
      });
    });
  }

  /**
   * Czy gra się rozstrzygnęła — misja kampanii albo gra pojedyncza (wszystkie
   * zamki / utrata ostatniego). Zwraca `true`, gdy tak, i od tej chwili scena
   * już tylko odlicza do ekranu wyniku.
   */
  private sprawdzRozstrzygniecie(): boolean {
    if (this.rozstrzygnieta) return true;
    const r = ocenGre(this.stan);
    if (!r) return false;
    this.rozstrzygnij(r);
    return true;
  }

  /**
   * Koniec gry na mapie: blokada sterowania, krótka chwila z banerem nad
   * mapą (fanfara, gwiazdy — albo cichy, szary baner porażki) i przejście
   * do ekranu wyniku. Bez tej chwili gra przeskakiwała na inny ekran
   * w połowie ruchu i dziecko nie wiedziało, CO się właściwie stało.
   */
  private rozstrzygnij(r: 'wygrana' | 'przegrana') {
    this.rozstrzygnieta = true;
    this.zajety = true;
    if (this.wRuchu) this.przerwijRuch = true;
    // Blokada wejścia całej sceny, nie tylko `zajety`: okno zamknięte
    // w tej chwili zdjęłoby `zajety` i oddało graczowi mysz na trzy sekundy
    // przed zmianą ekranu.
    this.input.enabled = false;
    if (this.input.keyboard) this.input.keyboard.enabled = false;
    this.kursorZnak?.setVisible(false);
    this.warstwaTrasy?.clear();
    this.registry.set(KLUCZ_STANU, this.stan);
    zapisz('mapa', `rozstrzygnięcie: ${r}`, { dzien: this.stan.dzien, misja: this.stan.misja ?? '(pojedyncza)' });
    // Po zdobyciu zamku najpierw wzlatuje napis „…jest twoja!" (900 ms po
    // powrocie z bitwy) — baner wchodzi dopiero po nim.
    this.time.delayedCall(r === 'wygrana' ? 1500 : 800, () => this.banerKonca(r === 'wygrana'));
  }

  private banerKonca(wygrana: boolean) {
    stopMusic(this);
    stopAmbient(this);
    if (wygrana) sfx(this, 'awans');
    const cx = this.mapaX + this.oknoW / 2;
    const cy = this.mapaY + this.oknoH / 2;
    const przed = this.children.list.length;

    const zaslona = this.add
      .rectangle(0, 0, this.scale.width, this.scale.height, C.shadow, wygrana ? 0.35 : 0.55)
      .setOrigin(0, 0)
      .setDepth(Z.overlay)
      .setAlpha(0);
    this.tweens.add({ targets: zaslona, alpha: 1, duration: 500 });

    // Wstęga: tabliczka z dwoma „ogonami" po bokach, jak baner nad bramą.
    const szer = 500;
    const wys = 118;
    const g = this.add.graphics();
    const punkty = (pts: number[], dy = 0) =>
      pts.reduce<Phaser.Math.Vector2[]>(
        (a, v, i, t) => (i % 2 ? a : [...a, new Phaser.Math.Vector2(v, t[i + 1] + dy)]),
        []
      );
    for (const s of [-1, 1]) {
      const x0 = (s * szer) / 2;
      const ksztalt = [x0 - s * 30, -26, x0 + s * 58, -26, x0 + s * 38, 6, x0 + s * 58, 38, x0 - s * 30, 38];
      g.fillStyle(C.shadow, 0.35);
      g.fillPoints(punkty(ksztalt, 4), true);
      g.fillStyle(wygrana ? C.goldDeep : C.panelDeep, 1);
      g.fillPoints(punkty(ksztalt), true);
    }
    plate(
      g,
      -szer / 2,
      -wys / 2,
      szer,
      wys,
      14,
      wygrana ? C.panel : mix(C.panel, C.panelEdge, 0.5),
      wygrana ? C.gold : C.panelDeep,
      { light: 0.16, dark: 0, gloss: 0.22, edgeW: 4, drop: 5 }
    );
    const napis = this.add
      .text(0, -18, wygrana ? 'Zwycięstwo!' : 'Koniec wyprawy', display(44, H.gold))
      .setOrigin(0.5);
    gradientText(napis, H.white, wygrana ? H.gold : H.panelEdge);
    const pod = this.add
      .text(
        0,
        32,
        wygrana
          ? this.stan.misja
            ? 'Cel misji wykonany!'
            : 'Wszystkie zamki należą do ciebie!'
          : coSieStalo(przyczynaPorazki(this.stan)),
        { ...body(16, H.ink), fontStyle: 'bold' }
      )
      .setOrigin(0.5);
    const baner = this.add
      .container(cx, cy, [g, napis, pod])
      .setDepth(Z.overlay + 2)
      .setScale(0.4)
      .setAlpha(0);
    this.tweens.add({ targets: baner, scale: 1, alpha: 1, duration: 520, ease: E.out });

    if (wygrana) {
      // Wybuch gwiazdek zza wstęgi — dwa, jeden po drugim, jak salwa.
      const gwiazdy = this.add
        .particles(cx, cy, ICON.star, {
          speed: { min: 160, max: 420 },
          angle: { min: 0, max: 360 },
          scale: { start: 0.42, end: 0 },
          rotate: { start: 0, end: 360 },
          lifespan: 1500,
          gravityY: 260,
          emitting: false,
        })
        .setDepth(Z.overlay + 1);
      this.time.delayedCall(260, () => gwiazdy.explode(36));
      this.time.delayedCall(900, () => gwiazdy.explode(24));
    }

    // Ściemnienie do czerni i ekran wyniku. Stan idzie w danych sceny: ekran
    // wyniku ma go pokazać i rozliczyć, a nie grać dalej.
    const czern = this.add
      .rectangle(0, 0, this.scale.width, this.scale.height, 0x000000, 1)
      .setOrigin(0, 0)
      .setDepth(Z.overlay + 10)
      .setAlpha(0);
    this.naWierzchu(...this.children.list.slice(przed));
    this.tweens.add({
      targets: czern,
      alpha: 1,
      delay: wygrana ? 2700 : 2900,
      duration: 550,
      onComplete: () =>
        this.scene.start('wynik', { rozstrzygniecie: wygrana ? 'wygrana' : 'przegrana', stan: this.stan }),
    });
  }

  /**
   * Okno „Warunki misji" — odpowiednik „Scenario Information" z Heroes 2:
   * numer i tytuł misji, opis, warunek zwycięstwa i warunki porażki, każdy
   * z obrazkiem. Pokazuje się samo na starcie misji, a potem pod przyciskiem
   * „Cele" i klawiszem C — także w grze pojedynczej.
   */
  private pokazWarunki() {
    if (this.zajety) return;
    this.zajety = true;
    buildArtefakty(this);
    const s = this.stan;
    const m = misjaPoId(s.misja);
    const w = warunkiGry(s);
    const pierwszyRaz = !!m && !s.warunkiPokazane;
    const cx = this.mapaX + this.oknoW / 2;
    const cy = this.mapaY + this.oknoH / 2;
    const szer = 548;
    const wnetrze = szer - 72;
    const przed = this.children.list.length;

    const zaslona = this.add
      .rectangle(0, 0, this.scale.width, this.scale.height, C.shadow, 0.5)
      .setOrigin(0, 0)
      .setDepth(Z.overlay);

    // Treść w kontenerze o współrzędnych lokalnych: wysokość okna wychodzi
    // dopiero z długości opisu, więc tło rysuje się na końcu, pod spodem.
    const k = this.add.container(cx, 0).setDepth(Z.overlay + 1);
    const tlo = this.add.graphics();
    k.add(tlo);
    let y = 28;

    const znak = this.add
      .text(0, y, m ? `MISJA ${m.nr} Z ${KAMPANIA.misje.length}` : 'GRA POJEDYNCZA', {
        ...body(12, H.white),
        fontStyle: 'bold',
      })
      .setOrigin(0.5);
    const znakTlo = this.add.graphics();
    plate(znakTlo, -znak.width / 2 - 14, y - 12, znak.width + 28, 24, 12, C.panelDeep, C.goldDeep, {
      light: 0.2,
      dark: 0.3,
      gloss: 0.2,
      edgeW: 2,
      drop: 2,
    });
    k.add([znakTlo, znak]);
    y += 38;

    const tytul = this.add.text(0, y, m ? m.tytul : planszaPoId(s.mapa).nazwa, display(30, H.gold)).setOrigin(0.5);
    gradientText(tytul, H.white, H.gold);
    k.add(tytul);
    y += 30;

    const opis = this.add
      .text(
        0,
        y,
        m
          ? m.opis.join('\n')
          : 'Dwie doliny, dwa zamki i przeciwnik, który też zbiera armię.\nKto pierwszy zdobędzie zamek rywala, ten wygrywa.',
        { ...body(14, H.ink), align: 'center', lineSpacing: 5 }
      )
      .setOrigin(0.5, 0)
      .setWordWrapWidth(wnetrze);
    k.add(opis);
    y += opis.height + 20;
    const poleOd = y - 10;

    // Kreska z gwiazdką — oddziela opowieść od zasad.
    const kreska = this.add.graphics();
    kreska.lineStyle(2, C.goldDeep, 0.55);
    kreska.lineBetween(-wnetrze / 2, y, -16, y);
    kreska.lineBetween(16, y, wnetrze / 2, y);
    k.add([kreska, this.add.image(0, y, ICON.star).setDisplaySize(20, 20)]);
    y += 22;

    // Wiersz warunku: kafelek z obrazkiem, etykieta w barwie, zdanie.
    type Obrazek = (x: number, y: number) => Phaser.GameObjects.GameObject[];
    const wierszWarunku = (obrazek: Obrazek, etykieta: string, barwa: number, zdanie: string) => {
      const x0 = -wnetrze / 2;
      const kafel = this.add.graphics();
      plate(kafel, x0, y, 58, 58, 12, mix(barwa, C.white, 0.78), barwa, {
        light: 0.2,
        dark: 0.12,
        gloss: 0.18,
        edgeW: 2,
        drop: 2,
      });
      const pas = this.add.graphics();
      pas.fillStyle(mix(barwa, C.white, 0.9), 1);
      pas.fillRoundedRect(x0 + 68, y + 2, wnetrze - 68, 54, 10);
      const et = this.add
        .text(x0 + 82, y + 16, etykieta, {
          ...display(13, `#${barwa.toString(16).padStart(6, '0')}`),
          stroke: H.white,
          strokeThickness: 3,
        })
        .setOrigin(0, 0.5);
      const zd = this.add
        .text(x0 + 82, y + 38, zdanie, { ...body(14, H.ink), fontStyle: 'bold' })
        .setOrigin(0, 0.5)
        .setWordWrapWidth(wnetrze - 92);
      k.add([kafel, pas, ...obrazek(x0 + 29, y + 29), et, zd]);
      y += 66;
    };

    const zamek =
      (klucz: string, szary = false): Obrazek =>
      (x, yy) => {
        const im = this.add.image(x, yy + 2, klucz);
        im.setScale(48 / Math.max(im.width, im.height));
        if (szary) im.setTint(0xa4acb8);
        return [im];
      };
    // Odznaka w rogu kafelka: zielony „ptaszek" przy celu, czerwony krzyżyk
    // przy porażce — czytelne, zanim dziecko przeczyta etykietę.
    const zOdznaka =
      (baza: Obrazek, dobra: boolean): Obrazek =>
      (x, yy) => {
        const o = this.add.graphics();
        o.fillStyle(C.shadow, 0.4);
        o.fillCircle(x + 20, yy + 20, 11);
        o.fillStyle(dobra ? C.hpHigh : C.foe, 1);
        o.fillCircle(x + 20, yy + 18, 11);
        o.lineStyle(3, C.white, 1);
        if (dobra) {
          o.beginPath();
          o.moveTo(x + 14, yy + 18);
          o.lineTo(x + 18.5, yy + 22.5);
          o.lineTo(x + 26, yy + 13.5);
          o.strokePath();
        } else {
          o.lineBetween(x + 15.5, yy + 13.5, x + 24.5, yy + 22.5);
          o.lineBetween(x + 24.5, yy + 13.5, x + 15.5, yy + 22.5);
        }
        return [...baza(x, yy), o];
      };

    // Zamek rysowany wektorem, nie zmniejszaną ilustracją: przy 48 px
    // obrazek z mapy robił się poszarpany, a zdobyty i stracony zamek
    // wyglądały identycznie. Tu zdobyty dostaje naszą chorągiew z gwiazdą,
    // stracony — pęknięcie, osunięte kamienie i opuszczoną szarą flagę.
    const rysowanyZamek =
      (zdobyty: boolean): Obrazek =>
      (x, yy) => {
        const g = this.add.graphics();
        const mur = zdobyty ? 0xc9ccd6 : 0x9aa0ac;
        const cien = zdobyty ? 0x7d8494 : 0x646a76;
        const baza = yy + 20;
        g.fillStyle(C.shadow, 0.25);
        g.fillEllipse(x, baza + 2, 44, 7);
        // Wieże boczne, mur i brama.
        for (const dx of [-15, 15]) {
          g.fillStyle(cien, 1);
          g.fillRect(x + dx - 6, baza - 22, 12, 22);
          g.fillStyle(mur, 1);
          g.fillRect(x + dx - 6, baza - 22, 9, 22);
          for (const zx of [-6, -1, 4]) g.fillRect(x + dx + zx, baza - 26, 3, 4);
        }
        g.fillStyle(mur, 1);
        g.fillRect(x - 10, baza - 15, 20, 15);
        for (const zx of [-10, -4, 2, 8]) g.fillRect(x + zx, baza - 18, 3, 3);
        g.fillStyle(0x4a3524, 1);
        g.fillRoundedRect(x - 4, baza - 9, 8, 9, { tl: 4, tr: 4, bl: 0, br: 0 });
        g.fillStyle(cien, 1);
        g.fillRect(x - 10, baza - 15, 20, 2);
        if (zdobyty) {
          // Maszt na środkowej wieży i niebieska chorągiew z gwiazdą.
          g.fillStyle(0x8a5a2b, 1);
          g.fillRect(x - 1, baza - 40, 2.5, 25);
          g.fillStyle(C.allyDeep, 1);
          g.fillTriangle(x + 1.5, baza - 40, x + 22, baza - 34, x + 1.5, baza - 27);
          g.fillStyle(C.ally, 1);
          g.fillTriangle(x + 1.5, baza - 40, x + 19, baza - 35, x + 1.5, baza - 30);
          g.fillStyle(C.gold, 1);
          g.fillCircle(x, baza - 41, 2.2);
        } else {
          // Pęknięcie przez mur, kamienie osunięte pod wieżą, szara flaga opuszczona.
          g.lineStyle(2, 0x2a2f3a, 1);
          g.beginPath();
          g.moveTo(x + 3, baza - 18);
          g.lineTo(x - 1, baza - 12);
          g.lineTo(x + 4, baza - 8);
          g.lineTo(x, baza - 2);
          g.strokePath();
          g.fillStyle(0x7a808c, 1);
          g.fillRect(x + 12, baza - 26, 10, 7);
          for (const [kx, ky, r] of [
            [22, -2, 3.5],
            [17, 0, 2.5],
            [26, -1, 2],
          ] as const) {
            g.fillStyle(0x7a808c, 1);
            g.fillCircle(x + kx, baza + ky, r);
          }
          g.fillStyle(0x8a5a2b, 1);
          g.fillRect(x - 16, baza - 36, 2, 14);
          g.fillStyle(0x8c8f98, 1);
          g.fillTriangle(x - 14, baza - 30, x - 3, baza - 27, x - 14, baza - 23);
        }
        return [g];
      };

    const z = w.zwyciestwo;
    const obrazZwyciestwa: Obrazek =
      z.typ === 'artefakt'
        ? (x, yy) => [
            this.add
              .image(x, yy, kluczArtefaktu(z.artefakt, artefaktPoId(z.artefakt)?.klasa ?? 'relikt'))
              .setDisplaySize(44, 44),
          ]
        : z.typ === 'zbierz'
          ? zamek(`m-${SUROWIEC_INFO[z.surowiec].ikona}`)
          : z.typ === 'pokonaj'
            ? (x, yy) => [this.add.image(x, yy, ICON.sword).setDisplaySize(40, 40)]
            : rysowanyZamek(true);
    wierszWarunku(zOdznaka(obrazZwyciestwa, true), 'ZWYCIĘSTWO', C.goldDeep, celSlowami(z));
    for (const p of w.porazka) {
      wierszWarunku(
        p.typ === 'termin'
          ? (x, yy) => [this.add.image(x, yy, ICON.hourglass).setDisplaySize(42, 42)]
          : zOdznaka(rysowanyZamek(false), false),
        'PORAŻKA, JEŚLI…',
        C.foeDeep,
        p.typ === 'termin' ? `Minie ${p.dni} dni. Dziś jest dzień ${s.dzien}.` : 'Stracisz wszystkie swoje zamki.'
      );
    }

    const poleDo = y;
    // Bonus wybrany na ekranie kampanii — przypomnienie, że już działa.
    const postep = m ? wczytajPostep() : null;
    const bonus = m && postep?.bonus !== undefined ? m.bonusy[postep.bonus] : undefined;
    if (bonus) {
      k.add(
        this.add
          .text(0, y + 14, `Twój bonus na start: ${bonus.opis}`, { ...body(15, H.ink), fontStyle: 'bold' })
          .setOrigin(0.5)
      );
      y += 34;
    }
    y += 8;
    const przyciskY = y + 24;
    y += 52;
    k.add(
      this.add
        .text(0, y + 8, 'Cele zawsze sprawdzisz przyciskiem „Cele" albo klawiszem C.', body(13, H.inkSoft))
        .setOrigin(0.5)
    );
    y += 30;

    const wys = y;
    const gora = Math.round(cy - wys / 2);
    k.setY(gora);
    // Płaska tabliczka: gradient z `plate` na oknie tej wysokości kroi się
    // w widoczne prążki i odsłania jaśniejsze kliny w dolnych rogach.
    plate(tlo, -szer / 2, 0, szer, wys, 16, C.panel, C.gold, { light: 0, dark: 0, gloss: 0, edgeW: 3, drop: 5 });
    tlo.lineStyle(1.5, C.panelEdge, 0.9);
    tlo.strokeRoundedRect(-szer / 2 + 7, 7, szer - 14, wys - 14, 11);
    // Wpuszczone pole pod warunkami i dwa złote nity u góry — okno ma być
    // dokumentem misji, a nie kolejnym dymkiem.
    tlo.fillStyle(mix(C.panel, C.panelEdge, 0.3), 1);
    tlo.fillRoundedRect(-szer / 2 + 18, poleOd, szer - 36, poleDo - poleOd, 12);
    for (const sx of [-1, 1]) {
      tlo.fillStyle(C.goldDeep, 1);
      tlo.fillCircle(sx * (szer / 2 - 20), 20, 6);
      tlo.fillStyle(C.gold, 1);
      tlo.fillCircle(sx * (szer / 2 - 20), 19, 5);
      tlo.fillStyle(C.white, 0.7);
      tlo.fillCircle(sx * (szer / 2 - 20) - 1.5, 17.5, 1.8);
    }
    k.setAlpha(0);
    this.tweens.add({ targets: k, alpha: 1, y: { from: gora + 14, to: gora }, duration: 280, ease: E.snap });

    const przycisk = makeHudButton(this, {
      x: cx,
      y: gora + przyciskY,
      w: 230,
      h: 46,
      icon: ICON.sword,
      tone: C.gold,
      toneDeep: C.goldDeep,
      depth: Z.overlay + 3,
      onClick: () => {
        zaslona.destroy();
        k.destroy();
        przycisk.destroy();
        s.warunkiPokazane = true;
        this.zajety = false;
        if (pierwszyRaz) this.napisUlotny('Powodzenia!');
        this.odswiezWszystko();
      },
    });
    przycisk.setLabel(pierwszyRaz ? 'Do dzieła!' : 'Graj dalej');
    this.naWierzchu(...this.children.list.slice(przed));
  }

  /**
   * Wyjście do menu głównego. Pyta, bo kasuje wszystko od ostatniego
   * zapisu — i od razu daje „Zapisz i wyjdź", żeby nie trzeba było wracać
   * do przycisku zapisu.
   */
  private zapytajOWyjscie() {
    if (this.zajety) return;
    this.zajety = true;
    const cx = this.mapaX + this.oknoW / 2;
    const cy = this.mapaY + this.oknoH / 2;
    const szer = 480;
    const wys = 190;
    const przed = this.children.list.length;
    this.add
      .rectangle(0, 0, this.scale.width, this.scale.height, C.shadow, 0.5)
      .setOrigin(0, 0)
      .setDepth(Z.overlay);
    const tlo = this.add.graphics().setDepth(Z.overlay + 1);
    plate(tlo, cx - szer / 2, cy - wys / 2, szer, wys, 14, C.panel, C.gold, {
      light: 0.24,
      dark: 0.22,
      gloss: 0.2,
      edgeW: 3,
    });
    const tytul = this.add
      .text(cx, cy - wys / 2 + 32, 'Wyjść do menu?', display(24, H.gold))
      .setOrigin(0.5)
      .setDepth(Z.overlay + 2);
    gradientText(tytul, H.white, H.gold);
    this.add
      .text(cx, cy - 16, 'To, co zrobiłeś od ostatniego zapisu, przepadnie.', body(14, H.ink))
      .setOrigin(0.5)
      .setDepth(Z.overlay + 2);

    const zamknij = () => {
      for (const o of this.children.list.slice(przed)) {
        this.tweens.killTweensOf(o);
        o.destroy();
      }
      this.zajety = false;
    };
    const wyjdz = (zapisac: boolean) => {
      if (zapisac) zapiszGre(this.stan);
      stopMusic(this);
      stopAmbient(this);
      this.registry.set(KLUCZ_STANU, this.stan);
      this.scene.start('menu');
    };
    const opcje: Array<[string, number, number, () => void]> = [
      ['Zapisz i wyjdź', C.gold, C.goldDeep, () => wyjdz(true)],
      ['Wyjdź', C.foe, C.foeDeep, () => wyjdz(false)],
      ['Zostań', C.ally, C.allyDeep, zamknij],
    ];
    opcje.forEach(([napis, ton, glebszy, klik], i) =>
      makeHudButton(this, {
        x: cx + (i - 1) * 150,
        y: cy + 44,
        w: 142,
        h: 42,
        tone: ton,
        toneDeep: glebszy,
        depth: Z.overlay + 3,
        onClick: klik,
      }).setLabel(napis)
    );
    this.naWierzchu(...this.children.list.slice(przed));
  }

  /** Po powrocie z bitwy: zwycięstwo usuwa strażnika, porażka cofa do zamku. */
  private rozliczBitwe() {
    const wynik = this.registry.get(KLUCZ_WYNIKU) as
      | { oObiekt: number; wygrana: boolean; armia?: Array<Oddzial & { slot?: number }> }
      | undefined;
    if (!wynik) return;
    this.registry.remove(KLUCZ_WYNIKU);
    const o = this.stan.obiekty.find((x) => x.id === wynik.oObiekt);

    if (wynik.armia) {
      // Ocalali wracają NA SWOJE MIEJSCA. Bitwa oddaje listę w tej samej
      // kolejności, w jakiej ją dostała, a każdy wpis niesie numer slotu —
      // więc dziury między stosami zostają tam, gdzie gracz je zostawił.
      // Wcześniej szło to przez `znormalizuj`, która upycha listę od zera,
      // i armia sama się przesuwała po każdej wygranej.
      const nowa = pustaArmia();
      for (const od of wynik.armia) {
        if (!od || od.ile <= 0) continue;
        const slot = typeof od.slot === 'number' && od.slot >= 0 && od.slot < SLOTY_ARMII ? od.slot : -1;
        if (slot >= 0 && !nowa[slot]) nowa[slot] = { ...od };
        else dolacz(nowa, od);
      }
      this.stan.bohater.armia = nowa;
    }

    if (wynik.wygrana) {
      // Zamek się nie „zbiera" — zmienia właściciela. Oznaczenie go jako
      // zebranego skasowałoby go z mapy razem z całym miastem, które właśnie
      // się zdobyło.
      if (o?.rodzaj === 'zamek') {
        o.wlasciciel = 'gracz';
        o.oddzialy = [];
      } else if (o) {
        o.zebrany = true;
      }
      const wyleczeni = this.uzdrowiciel();
      const nagroda = Math.round(80 * (1 + efekt(this.stan.bohater, 'nauka')));
      const poziomPrzed = poziom(this.stan.bohater.doswiadczenie);
      this.stan.bohater.doswiadczenie += nagroda;
      const poziomPo = poziom(this.stan.bohater.doswiadczenie);
      this.time.delayedCall(900, () =>
        this.napisUlotny(
          [
            o?.rodzaj === 'zamek' ? `${o.nazwa} jest twoja!` : 'Zwycięstwo!',
            `+${nagroda} doświadczenia`,
            wyleczeni ? `Uzdrowiciel: wraca ${wyleczeni} stworków` : '',
          ]
            .filter(Boolean)
            .join('\n')
        )
      );
      // Awans ma być ZDARZENIEM, nie liczbą, która po cichu urosła w panelu.
      // Okno otwiera `sprawdzAwans`, a nie to miejsce: doświadczenie wpada do
      // gry także ze skrzyń i z drzewa wiedzy, więc wykrywanie awansu musi
      // siedzieć w jednym miejscu dla wszystkich źródeł naraz.
      if (poziomPo > poziomPrzed) {
        this.time.delayedCall(2100, () => this.sprawdzAwans());
      }
      // Obiekt POD BOHATEREM po wygranej bitwie.
      //
      // Na pilnowaną kopalnię czy budowlę wchodzi się wprost, a straż stoi
      // obok — scena wybiera wtedy bitwę i po powrocie trzeba odwiedzić to,
      // po co się przyszło. Poprzednia wersja robiła to bezwarunkowo po 1200 ms
      // i właśnie dlatego gubiła nagrody: gdy bitwa dała awans, okno awansu
      // wchodziło 900 ms później i przykrywało okno obiektu, a gra zostawała
      // z `zajety`, którego nikt już nie zdejmował. Stąd i odczekanie na awans,
      // i warunek `!zajety`.
      // (Wszystko z `Z_SASIEDNIEGO_POLA` — surowiec, artefakt, skrzynia, potwór
      // — nie trafia tu nigdy, bo sięga się po to z sąsiedniego pola i bohater
      // na tym nie staje.)
      const podNogami = obiektNa(this.stan, this.stan.bohater.x, this.stan.bohater.y);
      if (
        podNogami &&
        podNogami !== o &&
        !podNogami.zebrany &&
        podNogami.wlasciciel !== 'gracz'
      ) {
        // Po awansie czekamy, aż zamknie się jego okno: dwa okna naraz to
        // jedno okno niewidoczne pod drugim.
        this.time.delayedCall(poziomPo > poziomPrzed ? 2600 : 1400, () => {
          if (!this.zajety) this.wejdzNa(podNogami);
        });
      }

      // Zdobycie ostatniego cudzego zamku KOŃCZY grę — ale tego nie trzeba
      // już pilnować tutaj: `create` woła `odswiezWszystko`, a ono sprawdza
      // rozstrzygnięcie po każdym zdarzeniu, także po powrocie z bitwy.

    } else {
      // Przegrana nie kończy gry: bohater wraca do zamku i traci resztę dnia.
      // Dla ośmiolatka „przegrałeś, zacznij od nowa" to koniec zabawy.
      const zamek = this.stan.obiekty.find((x) => x.rodzaj === 'zamek' && x.wlasciciel === 'gracz');
      if (zamek) {
        this.stan.bohater.x = zamek.x;
        this.stan.bohater.y = zamek.y;
      }
      this.stan.bohater.ruch = 0;
      this.time.delayedCall(400, () => this.napisUlotny('Porażka.\nWracasz do zamku.'));
    }
  }

  private napisUlotny(tekst: string) {
    const { x, y } = this.naEkran(this.stan.bohater.x, this.stan.bohater.y);
    const t = this.add
      .text(x, y - KAFEL * 0.7, tekst, {
        fontFamily: FONT,
        fontSize: '15px',
        fontStyle: 'bold',
        color: H.goldLight,
        stroke: H.shadow,
        strokeThickness: 4,
        align: 'center',
      })
      .setOrigin(0.5, 1)
      .setDepth(this.stan.wys + 100);
    this.swiat.add(t);
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
    this.zajety = true;
    // Bez żadnego znaku na ekranie koniec tury wygląda jak zawieszenie gry.
    // Ten komentarz mówił kiedyś „zwłaszcza gdy dojdzie tu ruch przeciwnika" —
    // i właśnie doszedł, więc zasłona przestała być ostrożnością na zapas.
    // Rysuje się NIM zaczniemy liczyć nowy dzień, a `setTimeout(0)` oddaje
    // klatkę przeglądarce, żeby zdążyła ją namalować przed resztą pracy.
    const zaslona = this.add
      .rectangle(0, 0, this.scale.width, this.scale.height, C.shadow, 0.45)
      .setOrigin(0, 0)
      .setDepth(Z.overlay);
    const napis = this.add
      .text(
        this.mapaX + this.oknoW / 2,
        this.mapaY + this.oknoH / 2,
        'Przetwarzanie tury…',
        display(18, H.goldLight)
      )
      .setOrigin(0.5)
      .setDepth(Z.overlay + 1);
    this.naWierzchu(zaslona, napis);

    setTimeout(() => {
      const wplyw = nowaTura(this.stan);
      // Przeciwnik gra swoją turę zaraz po naszej — tak jak w Heroes 3, gdzie
      // AI rusza się między turą gracza a początkiem następnej. Idzie POD
      // zasłoną, bo ze wszystkiego, co dzieje się na koniec tury, to on liczy
      // najdłużej: szuka celów i wytycza trasy po planszy 72 × 72.
      turaWroga(this.stan);
      this.warstwaTrasy.clear();
      // Trasa niedokończona wczoraj wraca od razu jako zaznaczona — jak
      // w Heroes 3 — pod warunkiem, że cel wciąż da się osiągnąć (np. nie
      // zajął go w międzyczasie inny obiekt).
      const cel = this.stan.bohater.celDlugiejTrasy;
      this.trasaBiezaca = cel ? trasa(this.stan, cel.x, cel.y) : null;
      if (this.trasaBiezaca && this.trasaBiezaca.length === 0) {
        this.trasaBiezaca = null;
        this.stan.bohater.celDlugiejTrasy = undefined;
      }
      this.pokazTrase();
      const wpisy = Object.entries(wplyw).map(
        ([co, ile]) => `+${ile} ${SUROWIEC_INFO[co as keyof typeof SUROWIEC_INFO].dopelniacz}`
      );
      zapisz('mapa', 'koniec tury', { data: this.stan.dzien, dochod: wplyw });
      zaslona.destroy();
      napis.destroy();
      this.zajety = false;
      this.napisUlotny(['Nowy dzień', ...wpisy].join('\n'));
      this.odswiezWszystko();
    }, 0);
  }
}
