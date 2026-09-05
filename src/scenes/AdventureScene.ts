import Phaser from 'phaser';
import {
  BRYLA,
  SUROWCE,
  SUROWIEC_INFO,
  TEREN_INFO,
  brylaNa,
  data,
  dochod,
  kosztPola,
  nowaTura,
  obiektNa,
  odslon,
  odwiedz,
  poziom,
  strzezoneProzez,
  statystyki,
  trasa,
  wezZeSkrzyni,
  zasiegNaTure,
  type Krok,
  type Obiekt,
  type Oddzial,
  type StanMapy,
  type WyborSkrzyni,
} from '../data/mapa';
import { planszaPrzygody } from '../data/plansza';
import { C, E, FONT, H, Z, body, display } from '../visual/theme';
import { drawPanelBody, makeHudButton, mix, plate } from '../visual/hud';
import { ICON, buildIcons } from '../visual/icons';
import { GORA, KAFEL, MARGINES, PANEL_W, PASEK_H } from '../visual/uklad';
import { wersjonujZasoby } from '../visual/zasoby';

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

/** Co ile milisekund plansza przechodzi na następną klatkę (animacja wody). */
const WODA_MS = 550;
const KLATEK_PLANSZY = 4;

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
const KLUCZ_WYNIKU = 'wynik-bitwy';

const DOMYSLNA_PODPOWIEDZ =
  'Kliknij pole, żeby zobaczyć trasę. Kliknij drugi raz w to samo miejsce, żeby ruszyć.\n' +
  'Mapę przesuwasz strzałkami, spacja wraca do bohatera.';

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
  private kameraOkien!: Phaser.Cameras.Scene2D.Camera;
  private plansza!: Phaser.GameObjects.Image;
  private naklejkiWody: Phaser.GameObjects.Image[] = [];
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
  private dataTekst!: Phaser.GameObjects.Text;
  private podpowiedz!: Phaser.GameObjects.Text;
  private minimapa!: Phaser.GameObjects.Graphics;
  private ramkaWidoku!: Phaser.GameObjects.Graphics;
  private slotyArmii: Phaser.GameObjects.Container[] = [];

  private trasaBiezaca: Krok[] | null = null;
  private zajety = false;
  private klatkaWody = 0;
  /** Ostatnie położenie kursora — do przewijania przy krawędzi. */
  private kursor: { x: number; y: number } | null = null;
  private przewX = 0;
  private przewY = 0;

  constructor() {
    super('adventure');
  }

  preload() {
    wersjonujZasoby(this);
    const b = import.meta.env.BASE_URL;
    for (let i = 0; i < KLATEK_PLANSZY; i++) {
      this.load.image(`plansza-${i}`, `${b}mapa/plansza-${i}.png`);
    }
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
      'kopalnia',
      'skrzynia',
      'zamek-las',
      'zamek-ogien',
    ]) {
      this.load.image(`m-${n}`, `${b}mapa/${n}.png`);
    }
    const stan = this.wczytajStan();
    const potrzebne = new Set<string>();
    for (const o of stan.bohater.armia) potrzebne.add(o.sprite);
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
    if (zapisany) return zapisany;
    const nowy = planszaPrzygody();
    this.registry.set(KLUCZ_STANU, nowy);
    return nowy;
  }

  create() {
    // Phaser używa TEJ SAMEJ instancji sceny przy każdym `scene.start`, więc
    // pola klasy przeżywają przejście do bitwy i z powrotem. `zajety` zostawało
    // włączone po wyjściu do bitwy i po powrocie nie dało się już sterować
    // bohaterem. Reszta to tablice trzymające obiekty, których Phaser już nie ma.
    this.zajety = false;
    this.trasaBiezaca = null;
    this.kierunek = 'dol';
    this.klatkaWody = 0;
    this.przewX = 0;
    this.przewY = 0;
    this.naklejkiWody = [];
    this.slotyArmii = [];
    this.statTeksty = [];
    this.podpisy = {};
    this.dochody = {};
    this.ikonyObiektow = {};
    this.trafienia = [];

    this.stan = this.wczytajStan();
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
    this.odswiezWszystko();
    this.wysrodkujNaBohaterze(false);

    this.time.addEvent({
      delay: WODA_MS,
      loop: true,
      callback: () => {
        this.klatkaWody = (this.klatkaWody + 1) % KLATEK_PLANSZY;
        this.naklejkiWody.forEach((n, i) => n.setVisible(i + 1 === this.klatkaWody));
      },
    });

    this.input.on('pointerdown', (p: Phaser.Input.Pointer) => this.klikMapa(p));
    this.input.on('pointermove', (p: Phaser.Input.Pointer) => {
      this.kursor = { x: p.x, y: p.y };
      this.ruchMyszy(p);
    });
    // Kursor poza płótnem nie wysyła `pointermove`, więc bez tego mapa jechałaby
    // dalej po wyjściu myszy za okno — aż do końca planszy.
    this.input.on('gameout', () => (this.kursor = null));
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
    const krokow = 48;
    for (let i = krokow; i > 0; i--) {
      const t = i / krokow;
      g.fillStyle(0x000000, 0.055 * (1 - t) * (1 - t));
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
  }

  // ---------- świat ----------

  private rysujTlo() {
    const g = this.add.graphics().setDepth(Z.sky);
    g.fillGradientStyle(C.skyTop, C.skyTop, C.skyBottom, C.skyBottom, 1);
    g.fillRect(0, 0, this.scale.width, this.scale.height);
    this.add
      .text(MARGINES + 4, 10, 'MAPA PRZYGODY', display(19, H.goldLight))
      .setOrigin(0, 0)
      .setDepth(Z.hud);
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

    this.swiat = this.add.container(this.mapaX, this.mapaY).setDepth(Z.board);
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
    // Klatki 1–3 to naklejki z samą wodą, leżące na klatce zerowej. Cztery
    // pełne klatki byłyby czterema teksturami 1728 × 1728 w pamięci karty.
    for (let i = 1; i < KLATEK_PLANSZY; i++) {
      const n = this.add.image(0, 0, `plansza-${i}`).setOrigin(0, 0).setVisible(false).setDepth(-0.5);
      this.naklejkiWody.push(n);
      this.swiat.add(n);
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
    // Trzecia kamera, wyłącznie na okna dialogowe. Kamery rysują się
    // w kolejności dodania, a kamera planszy powstaje PO głównej, więc
    // zamalowywała wszystko, co główna narysowała w prostokącie mapy —
    // łącznie z oknem skrzyni. Okno było wtedy niewidzialne, a gra czekała
    // na decyzję, której nie dało się podjąć: wyglądało to na zawieszenie.
    // Ta kamera idzie jako ostatnia, więc jej nikt nie zamaluje.
    this.kameraOkien = this.cameras.add(0, 0, this.scale.width, this.scale.height);
    this.kameraOkien.ignore(this.children.list);
  }

  /**
   * To, co ma być NAD wszystkim — okna dialogowe. Zabieramy je obu wcześniejszym
   * kamerom i zostawiamy tej ostatniej.
   *
   * Wcześniej stało tu `tylkoHud`, które zabierało obiekt tylko kamerze
   * planszy. Chroniło przed rysowaniem okna wewnątrz mapy, ale nie przed
   * zamalowaniem go przez tę kamerę — a to była właśnie usterka.
   */
  private naWierzchu(...obiekty: Phaser.GameObjects.GameObject[]) {
    this.cameras.main.ignore(obiekty);
    this.kamera?.ignore(obiekty);
  }

  private wariant(x: number, y: number, ile: number) {
    return (x * 7 + y * 13) % ile;
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

  private rysujPrzeszkody() {
    for (let y = 0; y < this.stan.wys; y++) {
      for (let x = 0; x < this.stan.szer; x++) {
        const t = this.stan.teren[y][x];
        if (t !== 'las' && t !== 'skaly') continue;
        const { x: ex, y: ey } = this.naEkran(x, y);
        const z = this.wariant(x, y, 6);

        if (t === 'las') {
          // Las to nie sad: na jednym polu stoi drzewo główne i podszyt.
          // Przy jednym drzewie na pole widać kratę, w której rosną, i cały
          // obszar przestaje wyglądać na las.
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
          // Skały: duża bryła z tyłu i mniejsza z przodu, obie z czterech
          // sylwetek. Rytm łamie odbicie i skala, nie liczba plików.
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
    const bryla = BRYLA[o.rodzaj];
    if (o.rodzaj === 'zamek')
      return { klucz: o.nasz ? 'm-zamek-las' : 'm-zamek-ogien', wys: KAFEL * (bryla ? 3.1 : 1.9) };
    if (o.rodzaj === 'kopalnia')
      return {
        klucz: o.surowiec === 'jagoda' ? 'm-sad' : 'm-kopalnia',
        wys: KAFEL * (bryla ? 2.2 : 1.25),
      };
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
      const szerBryly = BRYLA[o.rodzaj]?.[0];
      if (szerBryly) {
        const polowa = (szerBryly * KAFEL) / 2;
        kont.x = Phaser.Math.Clamp(x, polowa, this.mapaW - polowa);
      }

      const { klucz, wys } = this.grafikaObiektu(o);
      const bryla = BRYLA[o.rodzaj];

      // Cień kontaktowy. Przy bryle siada na jej podstawie — czyli w rzędzie
      // NAD polem wejścia, nie na samym wejściu; położony niżej odklejał się
      // od budowli i cała rzecz zaczynała lewitować.
      //
      // Miękka tekstura, nie elipsa z `fillEllipse`: elipsa ma ostrą krawędź,
      // a cień kontaktowy nie ma żadnej. Mnożenie zamiast przykrywania, bo
      // czarna plama o krycia 0,3 rozjaśnia się do szarości i leży na trawie
      // jak folia, zamiast przyciemniać to, co pod nią.
      const cien = this.add
        .image(0, bryla ? -KAFEL * 0.52 : KAFEL * 0.4, 't-cien')
        .setDisplaySize(
          KAFEL * (bryla ? bryla[0] * 0.78 : 0.62),
          KAFEL * (bryla ? 0.34 : 0.2)
        )
        .setBlendMode(Phaser.BlendModes.MULTIPLY)
        .setAlpha(0.8);
      kont.add(cien);
      // Budowle z bryłą stoją ZA polem wejścia, a nie na nim: podstawa siada na
      // górnej krawędzi tego pola, więc brama zostaje odsłonięta i widać, że
      // jest po niej gdzie chodzić. Reszta obiektów stoi na swoim polu.
      const podstawa = BRYLA[o.rodzaj] ? -KAFEL * 0.5 : KAFEL * 0.46;
      const im = this.add.image(0, podstawa, klucz).setOrigin(0.5, 1);
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
      if (o.rodzaj === 'kopalnia' || o.rodzaj === 'zamek') {
        const f = this.chorag(o.rodzaj === 'zamek' && !o.nasz ? C.foe : C.ally);
        f.setVisible(!!o.nasz || o.rodzaj === 'zamek');
        // Chorągiew ma stać na budowli, a nie na wolnym polu przed nią.
        // Odkąd bryła przeniosła się o pole wyżej, flaga musi pójść za nią —
        // inaczej wygląda, jakby ktoś wbił maszt na środku placu.
        if (bryla) f.setY(-KAFEL * (0.5 + wys / KAFEL / 2));
        kont.add(f);
        kont.setData('flaga', f);
      }

      kont.setData('obiekt', o);
      this.ikonyObiektow[o.id] = kont;
      this.swiat.add(kont);
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
    this.bohaterObj.add(this.chorag(C.ally));
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
    const kartaH = 152;
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
      .text(wnetrzeX + portretBok + 18, kartaY + 27, '', body(11, H.inkSoft))
      .setOrigin(0, 0)
      .setDepth(Z.hud + 2);

    const statY = kartaY + 50;
    [ICON.sword, ICON.shield, ICON.boot].forEach((klucz, i) => {
      const sx = wnetrzeX + portretBok + 24 + i * 46;
      this.add.image(sx, statY, klucz).setDisplaySize(17, 17).setDepth(Z.hud + 2);
      this.statTeksty[i] = this.add
        .text(sx + 12, statY, '', display(14, i === 2 ? H.gold : H.white))
        .setOrigin(0, 0.5)
        .setDepth(Z.hud + 2);
    });
    this.ruchTekst = this.statTeksty[2];

    const slotBok = 40;
    const odstep = 4;
    const rzadX = wnetrzeX + (wnetrzeW - (4 * slotBok + 3 * odstep)) / 2;
    const rzadY = kartaY + 78;
    for (let i = 0; i < 4; i++) {
      const sx = rzadX + i * (slotBok + odstep);
      const g = this.add.graphics();
      g.fillStyle(mix(C.panel, C.panelDeep, 0.3), 1);
      g.fillRoundedRect(0, 0, slotBok, slotBok + 12, 5);
      g.lineStyle(1.5, C.panelDeep, 0.7);
      g.strokeRoundedRect(0, 0, slotBok, slotBok + 12, 5);
      const slot = this.add.container(sx, rzadY, [g]).setDepth(Z.hud + 1);
      const od = b.armia[i];
      if (od) {
        const im = this.add.image(slotBok / 2, slotBok / 2 - 1, `p-${od.sprite}`);
        im.setScale((slotBok - 6) / im.height);
        const licznik = this.add
          .text(slotBok / 2, slotBok + 4, String(od.ile), display(12))
          .setOrigin(0.5);
        slot.add([im, licznik]);
        slot.setData('licznik', licznik);
      }
      this.slotyArmii.push(slot);
    }

    const podY = kartaY + kartaH + 10;
    const podH = py + ph - 56 - podY;
    const ramkaPod = this.add.graphics().setDepth(Z.hud);
    plate(ramkaPod, wnetrzeX, podY, wnetrzeW, podH, 9, mix(C.panel, C.panelDeep, 0.16), C.panelDeep, {
      light: 0.14,
      dark: 0.16,
      gloss: 0.1,
      edgeW: 2,
    });
    this.podpowiedz = this.add
      .text(wnetrzeX + 10, podY + 10, DOMYSLNA_PODPOWIEDZ, body(11, H.ink))
      .setOrigin(0, 0)
      .setDepth(Z.hud + 2)
      .setWordWrapWidth(wnetrzeW - 20);

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
    const miasta = this.stan.obiekty.filter((o) => o.rodzaj === 'zamek' && o.nasz);
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

  private odswiezWszystko() {
    const b = this.stan.bohater;
    const st = statystyki(b);
    this.statTeksty[0].setText(String(st.atak));
    this.statTeksty[1].setText(String(st.obrona));
    this.ruchTekst.setText(String(Math.round(b.ruch)));
    this.poziomTekst.setText(
      `poziom ${poziom(b.doswiadczenie)}` +
        (b.artefakty.length ? `  ·  artefakty: ${b.artefakty.length}` : '')
    );
    b.armia.forEach((od, i) => {
      const licznik = this.slotyArmii[i]?.getData('licznik') as Phaser.GameObjects.Text | undefined;
      licznik?.setText(String(od.ile));
    });

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
        o.rodzaj === 'potwor' ? C.foe : o.rodzaj === 'zamek' ? (o.nasz ? C.ally : C.foe) : C.gold;
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
    if (this.zajety) return;
    const { x, y } = this.zEkranu(p.x, p.y);
    if (!this.wRamie(p.x, p.y) || !this.wGranicach(x, y)) {
      this.podpowiedz.setText(DOMYSLNA_PODPOWIEDZ);
      return;
    }
    if (!this.stan.odkryte[y][x]) {
      this.podpowiedz.setText('Nieznany teren — trzeba tam podejść.');
      return;
    }
    // Kursor musi powiedzieć, które kliknięcie dostaniesz — na bryle zamku
    // inne niż na jego polu. Bez tego podział jest niewidzialny.
    const zamek = this.zamekPodKursorem(p);
    this.input.setDefaultCursor(zamek ? 'pointer' : 'default');
    if (zamek) {
      this.podpowiedz.setText(`${zamek.nazwa}\nKliknij, żeby wejść do miasta.`);
      return;
    }
    const o = this.obiektPodKursorem(p) ?? obiektNa(this.stan, x, y);
    if (o) {
      this.podpowiedz.setText(this.opisObiektu(o));
      return;
    }
    const teren = TEREN_INFO[this.stan.teren[y][x]];
    const straz = strzezoneProzez(this.stan, x, y);
    if (straz && teren.koszt !== null) {
      this.podpowiedz.setText(
        `${teren.nazwa} — koszt ${teren.koszt}\nPilnuje tego: ${straz.nazwa}.\nWejście tu zaczyna bitwę.`
      );
      return;
    }
    this.podpowiedz.setText(
      teren.koszt === null
        ? `${teren.nazwa} — nie do przejścia`
        : `${teren.nazwa} — koszt ${teren.koszt}`
    );
  }

  private opisObiektu(o: Obiekt) {
    if (o.rodzaj === 'potwor') {
      const armia = (o.oddzialy ?? []).map((s) => `${s.ile} × ${s.nazwa}`).join(', ');
      return `${o.nazwa}\n${armia}\nWejdź, żeby stoczyć bitwę.`;
    }
    if (o.rodzaj === 'kopalnia') {
      const co = SUROWIEC_INFO[o.surowiec ?? 'pokeball'].dopelniacz;
      return o.nasz
        ? `${o.nazwa} — twoja\n+${o.ile} ${co} dziennie`
        : `${o.nazwa}\nWejdź, żeby zająć: +${o.ile} ${co} dziennie`;
    }
    if (o.rodzaj === 'zamek') return `${o.nazwa}\n${o.nasz ? 'Twój zamek' : 'Zamek przeciwnika'}`;
    if (o.rodzaj === 'skrzynia') return 'Skrzynia\nW środku pokeballe albo doświadczenie.';
    if (o.rodzaj === 'artefakt') return `${o.nazwa}\nArtefakt — wzmacnia bohatera na stałe.`;
    return `${o.nazwa}\n+${o.ile} ${SUROWIEC_INFO[o.surowiec ?? 'pokeball'].dopelniacz}`;
  }

  /** Trasa do pola — wystawione dla sond, żeby dało się sprawdzić omijanie stref. */
  trasaDo(x: number, y: number) {
    return trasa(this.stan, x, y);
  }

  private klikMapa(p: Phaser.Input.Pointer) {
    if (this.zajety || !this.wRamie(p.x, p.y)) return;
    const zamek = this.zamekPodKursorem(p);
    if (zamek) return this.pokazZamek(zamek);
    const cel = this.obiektPodKursorem(p) ?? this.zEkranu(p.x, p.y);
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
    if (mur?.rodzaj === 'zamek' && mur.nasz) return mur;
    const o = this.obiektPodKursorem(p);
    if (!o || o.rodzaj !== 'zamek' || !o.nasz) return undefined;
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
        if (o) {
          this.wejdzNa(o);
        } else {
          // Wejście w strefę kontroli potwora — bez wchodzenia na jego pole —
          // też zaczyna bitwę. Tak działa Heroes 3 i tylko dlatego strażnicy
          // czegokolwiek pilnują.
          const straz = strzezoneProzez(this.stan, this.stan.bohater.x, this.stan.bohater.y);
          if (straz) this.zacznijBitwe(straz);
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
      this.tweens.add({
        targets: this.bohaterObj,
        x,
        y,
        duration: 160,
        ease: 'Linear',
        onComplete: () => {
          this.odswiezWszystko();
          dalej();
        },
      });
    };
    dalej();
  }

  private wejdzNa(o: Obiekt) {
    const wynik = odwiedz(this.stan, o);

    if (wynik.bitwaZ) return this.zacznijBitwe(wynik.bitwaZ);
    if (wynik.wybor) return this.zapytajOSkrzynie(wynik.wybor);
    if (wynik.zamek) return this.pokazZamek(wynik.zamek);

    if (wynik.opis) this.napisUlotny(wynik.opis);
    if (o.zebrany) this.znikaj(o);
    if (wynik.zajete) this.podnies(o);
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
    // Okno należy do HUD-u, nie do planszy — inaczej jechałoby razem z mapą.
    const doHud: Phaser.GameObjects.GameObject[] = [];

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

    doHud.push(zaslona, tlo, ...napisy);
    this.naWierzchu(...doHud);

    const zamknij = (co: 'pokeballe' | 'doswiadczenie') => {
      const opis = wezZeSkrzyni(this.stan, w, co);
      [zaslona, tlo, ...napisy].forEach((x) => x.destroy());
      przyciski.forEach((p) => p.setVisible(false));
      this.znikaj(w.obiekt);
      this.napisUlotny(opis);
      this.zajety = false;
      this.odswiezWszystko();
    };

    // Przyciski powstają jako osobne obiekty sceny, więc kamera planszy też by
    // je narysowała — w środku mapy i przesunięte o przewinięcie. Notujemy,
    // co przybyło, i chowamy to przed nią.
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

  private pokazZamek(o: Obiekt) {
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
    this.napisUlotny(`${o.nazwa}\nDo boju!`);
    this.registry.set(KLUCZ_STANU, this.stan);
    this.time.delayedCall(750, () => {
      this.scene.start('battle', {
        gracz: this.stan.bohater.armia,
        wrog: o.oddzialy ?? [],
        oObiekt: o.id,
        powrot: 'adventure',
      });
    });
  }

  /** Po powrocie z bitwy: zwycięstwo usuwa strażnika, porażka cofa do zamku. */
  private rozliczBitwe() {
    const wynik = this.registry.get(KLUCZ_WYNIKU) as
      | { oObiekt: number; wygrana: boolean; armia?: Oddzial[] }
      | undefined;
    if (!wynik) return;
    this.registry.remove(KLUCZ_WYNIKU);
    const o = this.stan.obiekty.find((x) => x.id === wynik.oObiekt);

    if (wynik.armia) this.stan.bohater.armia = wynik.armia.filter((a) => a.ile > 0);

    if (wynik.wygrana) {
      if (o) o.zebrany = true;
      this.stan.bohater.doswiadczenie += 80;
      this.time.delayedCall(900, () => this.napisUlotny('Zwycięstwo!\n+80 doświadczenia'));
    } else {
      // Przegrana nie kończy gry: bohater wraca do zamku i traci resztę dnia.
      // Dla ośmiolatka „przegrałeś, zacznij od nowa" to koniec zabawy.
      const zamek = this.stan.obiekty.find((x) => x.rodzaj === 'zamek' && x.nasz);
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
    const wplyw = nowaTura(this.stan);
    this.trasaBiezaca = null;
    this.warstwaTrasy.clear();
    const wpisy = Object.entries(wplyw).map(
      ([co, ile]) => `+${ile} ${SUROWIEC_INFO[co as keyof typeof SUROWIEC_INFO].dopelniacz}`
    );
    this.napisUlotny(['Nowy dzień', ...wpisy].join('\n'));
    this.odswiezWszystko();
  }
}
