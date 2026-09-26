import Phaser from 'phaser';
import { sledzScene } from '../dev/dziennik';
import {
  KAMPANIA,
  biezacaMisja,
  kampaniaWToku,
  usunPostep,
  wczytajPostep,
} from '../data/kampania';
import { type Slot, listaZapisow, najnowszyZapis, usunZapis, wczytajGre } from '../data/zapis';
import { aktywnyProfil, listaProfili } from '../data/profile';
import { MUZYKA_MIASTO, initSfx, startMusic, stopMusic } from '../audio/mapSfx';
import { gradientText } from '../visual/hud';
import { TEX, ZM, ozywTlo, stworek, zbudujTekstury } from '../visual/menuZycie';
import { krojeZestawu, wczytajZestaw } from '../visual/zestaw';
import { KROJ, pokazAutorow, pokazProfile, pokazRekordy, type Zwoj } from '../visual/menuOkna';
import { pokazWczytanie, pytanie } from '../visual/oknoZapisu';

/**
 * Menu główne — ulica wioski trenerów z drogowskazem.
 *
 * Wzorzec to menu Heroes 2: namalowane miasteczko, w którym przyciskami są
 * szyldy sklepów. Bierzemy z niego zasadę, nie kadr — gracz klika w ŚWIAT,
 * a nie w formularz. U nas tym przedmiotem jest drogowskaz na skraju
 * wioski: deski-strzałki przybite do słupa, jedna pod drugą.
 *
 * Dlaczego drogowskaz, a nie szyldy rozrzucone po domach jak w Heroes 2:
 * dla ośmiolatka lista czytana z góry na dół jest prostsza niż szukanie
 * napisów po całym obrazku, a strzałka to znak „tędy się idzie", który
 * rozumie każde dziecko. Klawiatura też ma wtedy oczywisty porządek:
 * strzałka w górę i w dół.
 *
 * Podmenu („Nowa gra", „Wczytaj") nie otwiera okna — te same deski
 * obracają się na słupie i pokazują nowe napisy. Okno nad drogowskazem
 * zasłoniłoby jedyny przedmiot, z którym gracz właśnie rozmawia.
 */

const B = import.meta.env.BASE_URL;

/** Słup drogowskazu: czubek daszka. Słup stoi na malowanym słupku płotu z tła. */
const SLUP = { x: 104, y: 262 };

/**
 * Latarnia na kutym ramieniu u szczytu słupa: lewy brzeg obrazka i środek
 * szybki (tools/menu_wczytaj.py, `latarnia`: obejma w x 0–8, ramię na
 * y 10, szybka w (76, 49)). Plama światła na tle jest liczona z tego samego
 * miejsca (`LATARNIA` w tym skrypcie).
 */
const LATARNIA = { x: SLUP.x - 4, y: SLUP.y + 8, szybkaX: 76, szybkaY: 49 };

/** Sztandar z logo: drążek na tej wysokości, skala tak, by odsłonić drzwi chaty. */
const SZTANDAR = { x: 480, y: 22, skala: 0.8, drazekY: 64, galka: 278 };

/**
 * Kotwice lin sztandaru na tle: lewa — obręcz gniazda na wysokim pniu,
 * prawa — gałąź wielkiego drzewa. Zmierzone z `tlo.jpg`.
 */
const LINY = { lewa: [112, 124] as [number, number], prawa: [776, 30] as [number, number] };

/**
 * Trener na pierwszym planie, tyłem, idący ku drogowskazowi (stopy pod
 * dolną krawędzią kadru), i stworek na jego ramieniu.
 */
const BOHATER = { x: 668, stopy: 770, ramieX: 736, ramieY: 522 };

/**
 * Deski od góry. Kąty są drobne i różne — równiutko przybite deski wyglądają
 * na wyrównane w edytorze, a ręka cieśli nigdy tak nie przybija.
 */
const DESKI = [
  { tex: 'menu-deska-0', y: 392, kat: -2.4, w: 350, h: 72, kroj: 34 },
  { tex: 'menu-deska-1', y: 464, kat: 1.5, w: 330, h: 60, kroj: 27 },
  { tex: 'menu-deska-2', y: 530, kat: -1.1, w: 330, h: 60, kroj: 27 },
  { tex: 'menu-deska-3', y: 596, kat: 1.9, w: 330, h: 60, kroj: 27 },
] as const;

/** Szerokość poświaty wokół jasnej deski (tools/menu_wczytaj.py, `deska`). */
const MARGINES_BLASKU = 14;
/** Deska zaczyna się tyle przed osią słupa — gwoździe trafiają w słup. */
const ZAKLADKA = 22;

/** Tabliczka dźwięku: przybita do grubego słupka płotu po prawej. */
const DZWIEK = { x: 908, y: 0, sznurek: 46 };

/**
 * Tabliczka gracza: wisi na dwóch sznurkach w lewym górnym rogu, para dla
 * tabliczki dźwięku z prawego. Mówi, czyja gra jest teraz otwarta, i po
 * kliknięciu otwiera „Kto gra?".
 */
const GRACZ = { x: 112, sznurek: 16 };

const Z = {
  logo: 20,
  bohater: 26,
  slup: 30,
  deski: 32,
  dzwiek: 34,
  okno: 100,
  zaslona: 200,
} as const;

/** Stan głośności między sesjami — jak przełącznik w opcjach Heroes. */
const KLUCZ_DZWIEKU = 'heroes-dzwiek-v1';

type Poziom = 'glowne' | 'nowa' | 'wczytaj';

interface Pozycja {
  napis: string;
  podpis?: string;
  wlaczona: boolean;
  akcja: () => void;
}

interface Deska {
  kont: Phaser.GameObjects.Container;
  zwykla: Phaser.GameObjects.Image;
  jasna: Phaser.GameObjects.Image;
  szara: Phaser.GameObjects.Image;
  napis: Phaser.GameObjects.Text;
  podpis: Phaser.GameObjects.Text;
  klodka: Phaser.GameObjects.Image;
  /** Środek napisu na czynnej desce; nieczynna przesuwa go w lewo, robiąc miejsce na kłódkę. */
  srodek: number;
  pozycja?: Pozycja;
  x: number;
  y: number;
}

// ————————————————————————————————————————————————————————— kroje

/** Zakresy znaków podzbiorów fontsource — łaciński i łaciński rozszerzony (ą, ę, ł, ż…). */
const LACINSKI =
  'U+0000-00FF, U+0131, U+0152-0153, U+02BB-02BC, U+02C6, U+02DA, U+02DC, U+0304, U+0308, U+0329, U+2000-206F, U+20AC, U+2122, U+2191, U+2193, U+2212, U+2215, U+FEFF, U+FFFD';
const ROZSZERZONY =
  'U+0100-02BA, U+02BD-02C5, U+02C7-02CC, U+02CE-02D7, U+02DD-02FF, U+0304, U+0308, U+0329, U+1D00-1DBF, U+1E00-1E9F, U+1EF2-1EFF, U+2020, U+20A0-20AB, U+20AD-20C0, U+2113, U+2C60-2C7F, U+A720-A7FF';

let kroje: Promise<void> | undefined;

/**
 * Kroje menu. Nie przez `load.font` Phasera, bo ten rejestruje jeden plik
 * na nazwę rodziny, a polskie litery są w osobnym pliku — dwa `FontFace`
 * z tą samą rodziną i różnym `unicodeRange` to jedyny sposób, żeby „ż"
 * w „Dźwięk" nie wypadło z innego kroju niż reszta słowa.
 *
 * Porażka nie blokuje menu: napisy spadną na krój zapasowy (Georgia,
 * Trebuchet), brzydziej, ale czytelnie.
 */
function wczytajKroje(): Promise<void> {
  kroje ??= Promise.all([
    krojeZestawu(),
    ...(
      [
        ['MenuCinzel', 'cinzel-latin-900', LACINSKI, '900'],
        ['MenuCinzel', 'cinzel-latin-ext-900', ROZSZERZONY, '900'],
      ] as const
    ).map(async ([rodzina, plik, zakres, waga]) => {
      const f = new FontFace(rodzina, `url(${B}menu/${plik}.woff2)`, { unicodeRange: zakres, weight: waga });
      await f.load();
      document.fonts.add(f);
    }),
  ]).then(
    () => undefined,
    () => undefined
  );
  return kroje;
}

// ————————————————————————————————————————————————————————— scena

export class MenuScene extends Phaser.Scene {
  private deski: Deska[] = [];
  private poziom: Poziom = 'glowne';
  /** Deska pod kursorem albo wskazana klawiaturą; −1 — żadna. */
  private wybor = -1;
  private zajety = false;
  private okno?: Zwoj;
  private zaproszenie?: Phaser.GameObjects.Image;
  private dymek?: Phaser.GameObjects.Container;
  /** Sztandar i liny, którymi jest przywiązany — liny przerysowujemy co klatkę. */
  private sztandar?: Phaser.GameObjects.Image;
  private liny?: Phaser.GameObjects.Graphics;
  private napisGracza?: Phaser.GameObjects.Text;
  /** Flaga dla narzędzi (tools/zrzut-menu.mjs): menu zbudowane i po wejściu. */
  gotowe = false;

  constructor() {
    super('menu');
  }

  preload() {
    const m = `${B}menu/`;
    this.load.image('menu-tlo', `${m}tlo.jpg`);
    this.load.image('menu-logo', `${m}logo.png`);
    this.load.image('menu-slup', `${m}slup.png`);
    this.load.image('menu-pergamin', `${m}pergamin.png`);
    for (const d of DESKI) {
      this.load.image(d.tex, `${m}${d.tex.slice(5)}.png`);
      this.load.image(`${d.tex}-jasna`, `${m}${d.tex.slice(5)}-jasna.png`);
      this.load.image(`${d.tex}-szara`, `${m}${d.tex.slice(5)}-szara.png`);
    }
    for (const n of ['tabliczka', 'tabliczka-jasna', 'deseczka', 'deseczka-jasna'])
      this.load.image(`menu-${n}`, `${m}${n}.png`);
    for (const n of ['latarnia', 'klodka', 'stworek', 'bohater', 'trawa']) this.load.image(`menu-${n}`, `${m}${n}.png`);
    for (const d of DESKI) this.load.image(`${d.tex}-cien`, `${m}${d.tex.slice(5)}-cien.png`);
    // Dwie krótkie próbki: stuknięcie deski i wejście. Muzyka dochodzi
    // później, w tle — 4 MB nie może trzymać czarnego ekranu.
    this.load.audio('wejscie', `${B}audio/wejscie.wav`);
    this.load.audio('krok', `${B}audio/krok.ogg`);
    // Pergamin i tabliczki zestawu — okno zapisanych gier i pytania.
    wczytajZestaw(this);
    void wczytajKroje();
  }

  create() {
    sledzScene(this);
    this.deski = [];
    this.poziom = 'glowne';
    this.wybor = -1;
    this.zajety = false;
    this.okno = undefined;
    this.dymek = undefined;
    this.napisGracza = undefined;
    this.gotowe = false;

    this.jednaTeksturaNaRaz();
    initSfx(this);
    this.sound.mute = this.czytajWyciszenie();
    zbudujTekstury(this);
    this.add.image(0, 0, 'menu-tlo').setOrigin(0).setDepth(ZM.tlo);
    const zatrzymaj = ozywTlo(this);
    this.events.once('shutdown', zatrzymaj);
    this.cameras.main.fadeIn(450, 12, 8, 4);

    // Napisy powstają dopiero z krojami — inaczej Phaser zmierzy je krojem
    // zapasowym i deska dostanie napis złej szerokości na jedną klatkę.
    void wczytajKroje().then(() => {
      if (!this.sys.isActive()) return;
      this.zbuduj();
    });
    this.wczytajMuzyke();
  }

  /**
   * Obejście błędu Phasera 4.2.1: gdy w jednej partii rysowania jest więcej
   * tekstur niż jednostek GPU, partia dzieli się na podpartie i któraś
   * z nich dostaje wierzchołki od innej — deska rysowała się jako poszarpane
   * trójkąty drewna, a litery sąsiednich desek znikały (tools/dbg-menu.mjs:
   * znika po `maxTextures: 1`, zostaje przy 8). Menu ma kilkadziesiąt
   * napisów, a każdy to osobna tekstura, więc trafia na to od razu.
   *
   * Jedna tekstura na partię to kilkadziesiąt wywołań rysowania więcej —
   * przy menu bez znaczenia. Ustawienie wraca przy wyjściu ze sceny, bo mapa
   * i bitwa mają własne tempo i nie ruszamy im tego po cichu.
   */
  private jednaTeksturaNaRaz() {
    const r = this.sys.renderer;
    if (!(r instanceof Phaser.Renderer.WebGL.WebGLRenderer)) return;
    const przed = r.renderNodes.maxParallelTextureUnits;
    r.renderNodes.setMaxParallelTextureUnits(1);
    this.events.once('shutdown', () => r.renderNodes.setMaxParallelTextureUnits(przed));
  }

  private zbuduj() {
    this.logo();
    this.zbudujDrogowskaz();
    this.przelacznikDzwieku();
    this.tabliczkaGracza();

    this.bohater();

    this.pokazPoziom('glowne', false);
    this.klawiatura();
    this.wejscie();
  }

  /**
   * Temat kadru: trener tyłem, na pierwszym planie, w drodze do wioski —
   * i jego stworek na ramieniu, odwrócony do gracza, machający „chodź!".
   * Krytyk drugiej rundy: „brak tematu, oko ląduje na pustym stawie".
   * Obie postacie są wmalowane w zmierzch w tools/menu_wczytaj.py
   * (`wmaluj`: to samo światło z lewej-góry co latarnia i deski).
   */
  private bohater() {
    const b = this.add.image(BOHATER.x, BOHATER.stopy, 'menu-bohater').setOrigin(0.5, 1).setDepth(Z.bohater);
    // Oddech: ledwie widoczny, ale bez niego postać na pierwszym planie
    // wygląda jak wycinanka.
    this.tweens.add({
      targets: b,
      scaleY: 1.008,
      scaleX: 0.996,
      duration: 1900,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
    });
    stworek(this, 'menu-stworek', BOHATER.ramieX, BOHATER.ramieY, 122, {
      glos: () => this.graj('krok', 0.5),
      depth: Z.bohater + 1,
      bezCienia: true,
    });
  }

  // ——————————————————————————————————————————————— logo

  /**
   * Logo to sztandar na drążku, zawieszony nad wioską — przedmiot, nie
   * napis (patrz `sztandar` w tools/menu_wczytaj.py). Kołysze się na linach
   * wokół drążka, bardzo wolno: wiatr o zmierzchu, nie wichura.
   */
  private logo() {
    const tex = this.textures.get('menu-logo').getSourceImage() as HTMLImageElement;
    const logo = this.add
      .image(SZTANDAR.x, SZTANDAR.y, 'menu-logo')
      .setOrigin(0.5, SZTANDAR.drazekY / tex.height)
      .setScale(SZTANDAR.skala)
      .setDepth(Z.logo);
    this.tweens.add({
      targets: logo,
      angle: { from: -0.6, to: 0.6 },
      duration: 4200,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
    });
    // Błyski na złotej nici liter. Punkt losujemy tylko tam, gdzie piksel
    // jest złoty (jasny, ciepły) — gwiazdka na czerwonym suknie wyglądałaby
    // na błąd, a w powietrzu obok sztandaru jeszcze gorzej.
    const blysk = () => {
      for (let proba = 0; proba < 30; proba++) {
        const px = Phaser.Math.Between(60, tex.width - 60);
        const py = Phaser.Math.Between(SZTANDAR.drazekY + 20, tex.height - 60);
        const c = this.textures.getPixel(px, py, 'menu-logo');
        if (!c || c.alpha < 250 || c.red < 220 || c.green < 150 || c.blue > 150) continue;
        const k = SZTANDAR.skala;
        const g = this.add
          .image(logo.x + (px - tex.width / 2) * k, logo.y + (py - SZTANDAR.drazekY) * k, TEX.gwiazdka)
          .setBlendMode(Phaser.BlendModes.ADD)
          .setTint(0xfff6d0)
          .setScale(0)
          .setDepth(Z.logo + 1);
        this.tweens.add({
          targets: g,
          scale: Phaser.Math.FloatBetween(0.45, 0.8),
          angle: 45,
          duration: 360,
          yoyo: true,
          ease: 'Sine.easeOut',
          onComplete: () => g.destroy(),
        });
        return;
      }
    };
    this.time.addEvent({ delay: 900, loop: true, callback: blysk });
    this.data.set('logo', logo);
    this.sztandar = logo;
    this.liny = this.add.graphics().setDepth(Z.logo - 0.5);
    this.events.on(Phaser.Scenes.Events.UPDATE, this.rysujLiny, this);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => this.events.off(Phaser.Scenes.Events.UPDATE, this.rysujLiny, this));
  }

  /**
   * Liny sztandaru: od gałek drążka do gałęzi wielkiego drzewa (prawa)
   * i do gniazda na pniu (lewa). Przerysowywane co klatkę, bo sztandar się
   * kołysze i opada na starcie — lina przyklejona na sztywno do tła
   * rozjechałaby się z gałką. Zwisają (krzywa z ugięciem w połowie), bo
   * napięta jak struna lina wygląda na narysowaną linijką.
   */
  private rysujLiny() {
    const s = this.sztandar;
    const g = this.liny;
    if (!s || !g) return;
    const kat = Phaser.Math.DegToRad(s.angle);
    const pol = SZTANDAR.galka * SZTANDAR.skala;
    const konce: [number, number, number, number, number][] = [
      // x gałki, y gałki, x kotwicy, y kotwicy, ugięcie
      [s.x - Math.cos(kat) * pol, s.y - Math.sin(kat) * pol, ...LINY.lewa, 26],
      [s.x + Math.cos(kat) * pol, s.y + Math.sin(kat) * pol, ...LINY.prawa, 14],
    ];
    g.clear();
    for (const [grubosc, barwa] of [
      [4.2, 0x1a0f06],
      [2, 0x8f6e42],
    ] as const) {
      g.lineStyle(grubosc, barwa, 1);
      for (const [x0, y0, x1, y1, ug] of konce) {
        g.beginPath();
        g.moveTo(x0, y0);
        for (let i = 1; i <= 16; i++) {
          const t = i / 16;
          g.lineTo(x0 + (x1 - x0) * t, y0 + (y1 - y0) * t + Math.sin(t * Math.PI) * ug);
        }
        g.strokePath();
      }
    }
  }

  // ——————————————————————————————————————————————— drogowskaz

  private zbudujDrogowskaz() {
    const slup = this.add.image(SLUP.x, SLUP.y, 'menu-slup').setDepth(Z.slup);
    // Czubek daszka w teksturze: środek w poziomie, 16 px od góry (margines
    // na cień z tools/menu_wczytaj.py).
    slup.setOrigin(0.5, 16 / slup.height);
    // Słup stoi W ziemi: cień kontaktowy i kępa trawy na podstawie.
    // Druga runda: „słup niczym nie jest związany z ziemią".
    const podstawa = SLUP.y + slup.height - 16 - 24;
    this.add
      .image(SLUP.x + 16, podstawa + 2, TEX.cien)
      .setDisplaySize(120, 26)
      .setAlpha(0.7)
      .setDepth(Z.slup - 0.2);
    this.add.image(SLUP.x + 4, podstawa + 12, 'menu-trawa').setOrigin(0.5, 1).setDepth(Z.slup + 0.2);
    this.latarnia();

    // Zaproszenie: miękki złoty blask za „Nową grą", dopóki gracz niczego
    // nie wskazał. Pierwsze pytanie dziecka przed menu brzmi „gdzie się
    // zaczyna?" — to jest odpowiedź bez słów.
    this.zaproszenie = this.add
      .image(SLUP.x - ZAKLADKA + DESKI[0].w / 2, DESKI[0].y, TEX.blask)
      .setDisplaySize(DESKI[0].w * 1.5, DESKI[0].h * 2.6)
      .setTint(0xffc24a)
      .setBlendMode(Phaser.BlendModes.ADD)
      .setAlpha(0)
      .setDepth(Z.deski - 1);

    DESKI.forEach((d, i) => {
      const x = SLUP.x - ZAKLADKA;
      // Cień deski na słupie i na desce niżej: od latarni, czyli w prawo w dół.
      const cienD = this.add.image(7, 11, `${d.tex}-cien`).setOrigin(18 / (d.w + 36), 0.5);
      const zwykla = this.add.image(0, 0, d.tex).setOrigin(0, 0.5);
      const jasna = this.add
        .image(0, 0, `${d.tex}-jasna`)
        .setOrigin(MARGINES_BLASKU / (d.w + MARGINES_BLASKU * 2), 0.5)
        .setVisible(false);
      const szara = this.add.image(0, 0, `${d.tex}-szara`).setOrigin(0, 0.5).setVisible(false);
      const grot = d.h * 0.42;
      const srodek = ZAKLADKA + (d.w - ZAKLADKA - grot) / 2 + 4;
      const napis = this.add
        .text(srodek, 0, '', { fontFamily: KROJ.szyld, fontSize: `${d.kroj}px`, fontStyle: '900' })
        .setOrigin(0.5);
      const podpis = this.add
        .text(srodek, 0, '', { fontFamily: KROJ.tekst, fontSize: '15px', color: '#4a2a12' })
        .setOrigin(0.5);
      // Kłódka wisi na gwoździu przy górnym brzegu, przed grotem — widać ją
      // tylko na desce nieczynnej.
      const klodka = this.add
        .image(d.w - grot - 30, -d.h / 2 - 4, 'menu-klodka')
        .setOrigin(0.5, 0.08)
        .setVisible(false);
      // Deski niżej są dalej od latarni — ciemniejsze drewno (napis nie,
      // napis ma zostać czytelny). Ten sam spadek światła, co na tle.
      const mrok = Phaser.Display.Color.GetColor(255 - i * 16, 255 - i * 20, 255 - i * 24);
      zwykla.setTint(mrok);
      szara.setTint(mrok);
      // Strefa kliknięcia = cała deska. Osobna strefa w kontenerze, a nie
      // `setInteractive` na kontenerze: kontener ma początek na lewym końcu
      // deski (tam jest oś obrotu — gwoździe), a jego pole trafień liczy się
      // od środka i wypadałoby pół deski w bok.
      const strefa = this.add.zone(d.w / 2, 0, d.w, d.h).setInteractive({ useHandCursor: true });
      const kont = this.add
        .container(x, d.y, [cienD, zwykla, jasna, szara, napis, podpis, klodka, strefa])
        .setAngle(d.kat)
        .setDepth(Z.deski + (DESKI.length - i) * 0.01);
      strefa.on('pointerover', () => this.ustawWybor(i, true));
      strefa.on('pointerout', () => {
        if (this.wybor === i) this.ustawWybor(-1, true);
      });
      strefa.on('pointerdown', () => this.uruchom(i));
      this.deski.push({ kont, zwykla, jasna, szara, napis, podpis, klodka, srodek, x, y: d.y });
    });
  }

  /**
   * Latarnia i jej światło. Dwie poświaty: szeroka POD deskami (oświetla
   * tło wokół drogowskazu, dokłada się do plamy namalowanej w `tlo.jpg`)
   * i mała, ostra przy szybce. Obie migoczą nierówno — dwa tweeny o różnych
   * okresach nakładają się tak, że rytm się nie powtarza.
   */
  private latarnia() {
    this.add.image(LATARNIA.x, LATARNIA.y, 'menu-latarnia').setOrigin(0, 0).setDepth(Z.slup + 0.5);
    const x = LATARNIA.x + LATARNIA.szybkaX;
    const y = LATARNIA.y + LATARNIA.szybkaY;
    const szeroka = this.add
      .image(x, y + 30, TEX.blask)
      .setDisplaySize(420, 360)
      .setTint(0xffa040)
      .setBlendMode(Phaser.BlendModes.ADD)
      .setAlpha(0.28)
      .setDepth(Z.slup - 1);
    const rdzen = this.add
      .image(x, y, TEX.blask)
      .setDisplaySize(70, 80)
      .setTint(0xffd27a)
      .setBlendMode(Phaser.BlendModes.ADD)
      .setAlpha(0.8)
      .setDepth(Z.slup + 0.6);
    this.tweens.add({ targets: szeroka, alpha: 0.2, duration: 1300, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
    this.tweens.add({ targets: rdzen, alpha: 0.55, scale: rdzen.scale * 0.92, duration: 170, yoyo: true, repeat: -1, repeatDelay: 380 });
  }

  /** Pozycje menu na danym poziomie — liczone przy każdym wejściu, bo zapis albo gracz mogły się zmienić. */
  private pozycje(p: Poziom): (Pozycja | undefined)[] {
    if (p === 'nowa') {
      return [
        { napis: 'Kampania', podpis: KAMPANIA.tytul, wlaczona: true, akcja: () => this.nowaKampania() },
        {
          napis: 'Pojedyncza mapa',
          wlaczona: true,
          akcja: () =>
            this.zProfilem(() => {
              this.registry.remove('stan-mapy');
              this.idz('adventure');
            }),
        },
        { napis: 'Szybka bitwa', wlaczona: true, akcja: () => this.idz('battle') },
        { napis: 'Wróć', wlaczona: true, akcja: () => this.pokazPoziom('glowne') },
      ];
    }
    const profil = aktywnyProfil();
    const cel = this.celKontynuacji();
    const postep = wczytajPostep();
    const zapisow = listaZapisow().filter((z) => z !== null).length;
    if (p === 'wczytaj') {
      const m = postep && biezacaMisja(postep);
      return [
        {
          napis: 'Kontynuuj',
          podpis: cel?.podpis ?? 'Nie ma jeszcze gry do kontynuowania',
          wlaczona: !!cel,
          akcja: () => cel?.akcja(),
        },
        {
          napis: 'Zapisane gry',
          podpis: zapisow ? `zapisów: ${zapisow}` : 'Nie ma jeszcze zapisanych gier',
          wlaczona: zapisow > 0,
          akcja: () => this.otworzZapisy(),
        },
        {
          napis: 'Kampania',
          podpis: !postep ? 'Kampania jeszcze nie zaczęta' : m ? `misja ${m.nr}: ${m.tytul}` : 'ukończona!',
          wlaczona: !!postep,
          akcja: () => this.idz('kampania'),
        },
        { napis: 'Wróć', wlaczona: true, akcja: () => this.pokazPoziom('glowne') },
      ];
    }
    const cos = !!cel || zapisow > 0 || !!postep;
    return [
      { napis: 'Nowa gra', wlaczona: true, akcja: () => this.pokazPoziom('nowa') },
      {
        napis: 'Wczytaj grę',
        podpis: cos
          ? (cel?.podpis ?? 'zapisane gry')
          : profil
            ? 'Nic jeszcze nie zapisano — najpierw zagraj!'
            : 'Najpierw powiedz, kto gra — tabliczka w rogu',
        wlaczona: cos,
        akcja: () => this.pokazPoziom('wczytaj'),
      },
      { napis: 'Rekordy', wlaczona: true, akcja: () => this.otworzOkno('rekordy') },
      { napis: 'Autorzy', wlaczona: true, akcja: () => this.otworzOkno('autorzy') },
    ];
  }

  /**
   * Co zrobi „Kontynuuj": najświeższy zapis gracza (autozapis albo slot),
   * a bez zapisu — ekran kampanii w toku. Zapisy misji kampanii liczą się
   * tylko dla misji, która się teraz toczy: zapis z misji już wygranej albo
   * z kampanii zaczętej od nowa nie jest „ciągiem dalszym".
   */
  private celKontynuacji(): { podpis: string; akcja: () => void } | null {
    const p = wczytajPostep();
    const biezaca = p ? biezacaMisja(p) : undefined;
    const z = najnowszyZapis((o) => !o.misja || o.misja === biezaca?.id);
    if (z) return { podpis: `${z.nazwa}, dzień ${z.dzien}`, akcja: () => this.wczytajZapis(z.slot) };
    if (p && biezaca) return { podpis: `kampania, misja ${biezaca.nr}: ${biezaca.tytul}`, akcja: () => this.idz('kampania') };
    return null;
  }

  /**
   * Przełącza poziom menu. Deski obracają się na gwoździach (skala Y do zera
   * i z powrotem) jedna po drugiej — jak drogowskaz, który ktoś przekręca.
   */
  private pokazPoziom(p: Poziom, animuj = true) {
    this.poziom = p;
    const pozycje = this.pozycje(p);
    this.ustawWybor(-1, false);
    this.przestawBlask(p === 'glowne' ? 0 : -1, false);
    if (animuj) this.graj('wejscie', 0.25);
    this.deski.forEach((d, i) => {
      const poz = pozycje[i];
      if (!animuj) {
        this.opiszDeske(d, poz);
        d.kont.setVisible(!!poz).setScale(1);
        return;
      }
      this.zajety = true;
      this.tweens.add({
        targets: d.kont,
        // Nie zero: kontener o skali 0 ma nieodwracalną macierz i Phaser 4
        // rysował potem dzieci deski z rozsypanymi wierzchołkami (trójkąty
        // drewna w poprzek napisu) — także po powrocie skali do 1.
        scaleY: 0.03,
        duration: 110,
        delay: i * 55,
        ease: 'Quad.easeIn',
        onComplete: () => {
          this.opiszDeske(d, poz);
          d.kont.setVisible(!!poz);
          this.tweens.add({
            targets: d.kont,
            scaleY: 1,
            duration: 170,
            ease: 'Back.easeOut',
            onComplete: () => {
              if (i !== this.deski.length - 1) return;
              this.zajety = false;
              this.wskazPodKursorem();
            },
          });
        },
      });
    });
  }

  private opiszDeske(d: Deska, poz: Pozycja | undefined) {
    d.pozycja = poz;
    if (!poz) return;
    const i = this.deski.indexOf(d);
    const cfg = DESKI[i];
    d.napis.setText(poz.napis.toUpperCase());
    // Napis ma się zmieścić przed grotem — „POJEDYNCZA MAPA" jest najdłuższe.
    const miejsce = cfg.w - ZAKLADKA - cfg.h * 0.42 - 34;
    let rozmiar: number = cfg.kroj;
    d.napis.setFontSize(rozmiar);
    while (d.napis.width > miejsce && rozmiar > 14) d.napis.setFontSize(--rozmiar);
    // Nieczynna deska nie ma podpisu: mówi kłódka, a zdanie pokazuje dymek.
    const zPodpisem = !!poz.podpis && poz.wlaczona;
    // Pusty podpis się CHOWA, a nie tylko dostaje pusty napis: tekst
    // skrócony do "" ma teksturę szerokości 0, a taki kwadrat w partii
    // WebGL Phasera 4 rozsypywał wierzchołki sąsiadów — deska rysowała się
    // jako poszarpane trójkąty, a litery sąsiednich desek znikały.
    d.podpis.setText(poz.podpis ?? ' ').setVisible(zPodpisem);
    // Podpis też ma się zmieścić — „1. Pierwsze kroki, dzień 12" bywa długi.
    let rozmiarP = 15;
    d.podpis.setFontSize(rozmiarP);
    while (d.podpis.width > miejsce && rozmiarP > 11) d.podpis.setFontSize(--rozmiarP);
    d.napis.setY(zPodpisem ? -8 : 1);
    d.podpis.setY(cfg.h / 2 - 17);
    this.pomalujDeske(d, false);
  }

  /** Trzy wyglądy deski: zwykła (wyryty ciemny napis), wskazana (złoty, świecący), nieczynna. */
  private pomalujDeske(d: Deska, wskazana: boolean) {
    const czynna = d.pozycja?.wlaczona ?? false;
    d.klodka.setVisible(!czynna);
    const x = czynna ? d.srodek : d.srodek - 26;
    d.napis.setX(x);
    d.podpis.setX(x);
    d.zwykla.setVisible(czynna && !wskazana);
    d.jasna.setVisible(czynna && wskazana);
    d.szara.setVisible(!czynna);
    if (!czynna) {
      d.napis.setStroke('#000000', 0).setShadow(0, 1.5, 'rgba(255,255,255,0.45)', 0, false, true);
      d.napis.setFill('#2e2924');
      d.napis.setAlpha(0.85);
      d.podpis.setColor('#2a241e').setAlpha(1);
      return;
    }
    d.napis.setAlpha(1);
    d.podpis.setAlpha(1);
    if (wskazana) {
      d.napis.setStroke('#3a1606', 6).setShadow(0, 2, 'rgba(40,10,0,0.6)', 3, true, true);
      gradientText(d.napis, '#fffbe6', '#ffc53a');
      d.podpis.setColor('#3a1a06');
    } else {
      // Napis „wyryty": ciemny brąz i jasna krawędź POD literą — światło
      // z góry oświetla dolną ściankę rowka, nie górną.
      d.napis.setStroke('#000000', 0).setShadow(0, 1.5, 'rgba(255,228,170,0.75)', 0, false, true);
      gradientText(d.napis, '#4a230c', '#2a1204');
      d.podpis.setColor('#4a2a12');
    }
  }

  private ustawWybor(i: number, zMyszy: boolean) {
    // W trakcie obracania desek (i wjazdu na starcie) wskazanie czeka —
    // tween wysunięcia zabiłby tween obrotu w pół drogi i deska zostałaby
    // spłaszczona do kreski.
    if (this.okno?.otwarty || (this.zajety && i >= 0)) return;
    const stary = this.wybor;
    if (stary === i) return;
    this.wybor = i;
    if (stary >= 0 && this.deski[stary]) {
      const d = this.deski[stary];
      this.pomalujDeske(d, false);
      this.tweens.killTweensOf(d.kont);
      // Ubity tween mógł być wciśnięciem (skala 0,97 × 0,9) — bez powrotu
      // deska zostałaby na stałe ściśnięta.
      d.kont.setScale(1);
      this.tweens.add({ targets: d.kont, x: d.x, duration: 120, ease: 'Quad.easeOut' });
    }
    const d = this.deski[i];
    this.ukryjDymek();
    if (d?.pozycja && !d.pozycja.wlaczona && zMyszy && d.pozycja.podpis) {
      this.pokazDymek(d.x + DESKI[i].w + 8, d.y, d.pozycja.podpis);
    }
    if (!d || !d.pozycja?.wlaczona) {
      this.przestawBlask(this.poziom === 'glowne' ? 0 : -1, false);
      return;
    }
    this.pomalujDeske(d, true);
    this.przestawBlask(i, true);
    // Wskazana deska wysuwa się o kawałek w stronę, w którą pokazuje.
    this.tweens.killTweensOf(d.kont);
    d.kont.setScale(1);
    this.tweens.add({ targets: d.kont, x: d.x + 8, duration: 140, ease: 'Back.easeOut' });
    if (zMyszy || stary !== -1) this.graj('krok', 0.35);
  }

  /**
   * Po obrocie desek kursor stoi zwykle dokładnie tam, gdzie kliknął —
   * nad nową deską — ale Phaser nie wyśle `pointerover`, bo mysz się nie
   * ruszyła. Bez tego nowa deska pod kursorem nie świeci, dopóki dziecko
   * nie poruszy myszą, i wygląda na nieczynną.
   */
  private wskazPodKursorem() {
    const p = this.input.activePointer;
    if (!p || p.wasTouch) return;
    const trafione = this.input.hitTestPointer(p);
    const i = this.deski.findIndex((d) => d.kont.list.some((c) => trafione.includes(c)));
    if (i >= 0) this.ustawWybor(i, false);
  }

  /**
   * Złoty blask za deską. Bez wskazania pulsuje za „Nową grą" (zaproszenie),
   * przy wskazaniu przeskakuje za wskazaną deskę i świeci równo — ta sama
   * poświata mówi raz „zacznij tutaj", raz „to kliknę".
   */
  private przestawBlask(i: number, wskazana: boolean) {
    const b = this.zaproszenie;
    if (!b) return;
    const d = this.deski[i];
    b.setVisible(!!d);
    if (!d) return;
    const cfg = DESKI[i];
    this.tweens.killTweensOf(b);
    b.setPosition(d.x + cfg.w / 2 + (wskazana ? 8 : 0), d.y).setAngle(cfg.kat);
    b.setDisplaySize(cfg.w * 1.45, cfg.h * 2.5);
    if (wskazana) {
      b.setAlpha(0.5);
      return;
    }
    this.tweens.add({
      targets: b,
      alpha: { from: 0.1, to: 0.42 },
      duration: 1100,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
    });
  }

  private uruchom(i: number) {
    if (this.zajety || this.okno?.otwarty) return;
    const d = this.deski[i];
    const poz = d?.pozycja;
    if (!poz) return;
    if (!poz.wlaczona) {
      // Nieczynna deska kiwa się „nie" — kliknięcie bez żadnej odpowiedzi
      // dziecko odbiera jako zepsutą grę i klika dalej.
      this.tweens.add({ targets: d.kont, angle: DESKI[i].kat + 3, duration: 60, yoyo: true, repeat: 2 });
      this.tweens.add({ targets: d.klodka, angle: { from: 18, to: 0 }, duration: 700, ease: 'Elastic.easeOut' });
      if (poz.podpis) this.pokazDymek(d.x + DESKI[i].w + 8, d.y, poz.podpis);
      this.graj('krok', 0.4);
      return;
    }
    this.graj('wejscie', 0.45);
    this.tweens.add({ targets: d.kont, scaleX: 0.97, scaleY: 0.9, duration: 70, yoyo: true });
    poz.akcja();
  }

  // ——————————————————————————————————————————————— przejścia

  private idz(scena: 'kampania' | 'adventure' | 'battle') {
    if (this.zajety) return;
    this.zajety = true;
    stopMusic(this);
    this.cameras.main.fadeOut(320, 12, 8, 4);
    this.cameras.main.once(Phaser.Cameras.Scene2D.Events.FADE_OUT_COMPLETE, () => this.scene.start(scena));
  }

  private wczytajZapis(slot: Slot) {
    const stan = wczytajGre(slot);
    if (!stan) {
      this.pokazPoziom(this.poziom);
      return;
    }
    this.registry.set('stan-mapy', stan);
    this.idz('adventure');
  }

  /**
   * „Nowa gra → Kampania" ZAWSZE zaczyna nową kampanię. Jeśli gracz ma
   * kampanię w toku, najpierw pyta — i daje „Kontynuuj" dla tych, którzy
   * kliknęli tu z przyzwyczajenia, szukając swojej gry.
   */
  private nowaKampania() {
    this.zProfilem(() => {
      const p = wczytajPostep();
      if (!kampaniaWToku(p)) {
        this.zacznijKampanieOdNowa();
        return;
      }
      const m = biezacaMisja(p);
      const kto = aktywnyProfil()?.imie;
      this.ustawWybor(-1, false);
      this.okno = pytanie(this, {
        glebia: Z.okno,
        dzwiek: () => this.graj('krok', 0.6),
        tytul: 'Zacząć od nowa?',
        tekst:
          `${kto ? `${kto} ma` : 'Masz'} rozpoczętą kampanię${m ? ` (misja ${m.nr}: ${m.tytul})` : ''}.\n` +
          'Nowa kampania zacznie się od pierwszej misji,\na obecny postęp przepadnie.',
        opcje: [
          { tekst: 'Od nowa', akcja: () => this.zacznijKampanieOdNowa() },
          { tekst: 'Kontynuuj', glowny: true, akcja: () => this.kontynuujKampanie() },
          { tekst: 'Anuluj' },
        ],
        poZamknieciu: () => {
          this.okno = undefined;
        },
      });
    });
  }

  private zacznijKampanieOdNowa() {
    usunPostep();
    // Autozapis to „bieżąca gra" — po nowym starcie nie może nią zostać
    // misja ze starej kampanii. Zapisy w slotach zostają: to wybór gracza.
    if (listaZapisow()[0]?.misja) usunZapis('auto');
    this.registry.remove('kampania-widziane');
    this.idz('kampania');
  }

  /** Kampania w toku: najświeższy zapis toczącej się misji, a bez niego ekran kampanii. */
  private kontynuujKampanie() {
    const p = wczytajPostep();
    const biezaca = p ? biezacaMisja(p) : undefined;
    const z = biezaca ? najnowszyZapis((o) => o.misja === biezaca.id) : null;
    if (z) this.wczytajZapis(z.slot);
    else this.idz('kampania');
  }

  /** Akcja, która coś zapisze — najpierw musi być wiadomo, czyja to gra. */
  private zProfilem(akcja: () => void) {
    if (aktywnyProfil()) akcja();
    else this.otworzProfile({ potem: akcja, nowy: !listaProfili().length });
  }

  private otworzProfile(o: { potem?: () => void; nowy?: boolean } = {}) {
    this.ustawWybor(-1, false);
    this.ukryjDymek();
    this.okno = pokazProfile(this, {
      depth: Z.okno,
      nowy: o.nowy,
      dzwiek: () => this.graj('krok', 0.6),
      poZamknieciu: (wybrany) => {
        this.okno = undefined;
        this.odswiezTabliczke();
        if (wybrany && o.potem) o.potem();
        // Deski zależą od gracza (zapisy, kampania) — obracamy je na nowo.
        else this.pokazPoziom(this.poziom);
      },
    });
  }

  private otworzZapisy() {
    this.ustawWybor(-1, false);
    this.okno = pokazWczytanie(this, {
      glebia: Z.okno,
      dzwiek: () => this.graj('krok', 0.6),
      poZamknieciu: () => {
        this.okno = undefined;
      },
      poWczytaniu: (stan) => {
        this.registry.set('stan-mapy', stan);
        this.idz('adventure');
      },
    });
  }

  private otworzOkno(ktore: 'rekordy' | 'autorzy') {
    this.ustawWybor(-1, false);
    const o = {
      depth: Z.okno,
      dzwiek: () => this.graj('krok', 0.6),
      poZamknieciu: () => {
        this.okno = undefined;
      },
    };
    this.okno = ktore === 'rekordy' ? pokazRekordy(this, o) : pokazAutorow(this, o);
  }

  // ——————————————————————————————————————————————— klawiatura

  private klawiatura() {
    this.input.keyboard?.on('keydown', (e: KeyboardEvent) => {
      if (this.okno?.otwarty || this.zajety) return;
      const widoczne = this.deski.map((d, i) => (d.pozycja?.wlaczona ? i : -1)).filter((i) => i >= 0);
      if (!widoczne.length) return;
      const gdzie = widoczne.indexOf(this.wybor);
      if (e.key === 'ArrowDown' || e.key === 's' || e.key === 'S') {
        this.ustawWybor(widoczne[(gdzie + 1) % widoczne.length], false);
      } else if (e.key === 'ArrowUp' || e.key === 'w' || e.key === 'W') {
        this.ustawWybor(widoczne[(gdzie - 1 + widoczne.length) % widoczne.length], false);
      } else if (e.key === 'Enter' || e.key === ' ') {
        if (this.wybor >= 0) this.uruchom(this.wybor);
        else this.ustawWybor(widoczne[0], false);
      } else if (e.key === 'Escape' || e.key === 'Backspace') {
        if (this.poziom !== 'glowne') this.pokazPoziom('glowne');
      }
    });
  }

  // ——————————————————————————————————————————————— dźwięk

  private czytajWyciszenie(): boolean {
    try {
      return localStorage.getItem(KLUCZ_DZWIEKU) === 'wyl';
    } catch {
      return false;
    }
  }

  /**
   * Przełącznik dźwięku zamiast „Quit" z Heroes 2 — gra w przeglądarce nie
   * ma czego zamykać, a rodzic przy dziecku bardzo chce mieć ciszę pod ręką.
   * Wycisza cały menedżer dźwięku gry (`sound.mute`), więc działa też na
   * mapie i w bitwie, a nie tylko tutaj.
   *
   * Okrągła tabliczka z nutą wisi na sznurku z gałęzi wielkiego drzewa.
   * Bez napisu: w drugiej rundzie krytyk nie umiał przeczytać „Dźwięk: tak"
   * na deseczce przybitej do płotu — nuta (i nuta przekreślona) mówi to
   * samo każdemu dziecku, a pełne zdanie pokazuje dymek po wskazaniu.
   */
  private przelacznikDzwieku() {
    const sznurek = this.add.graphics();
    sznurek.lineStyle(3, 0x1e1208, 1);
    sznurek.lineBetween(-10, -6, -4, DZWIEK.sznurek);
    sznurek.lineBetween(10, -6, 4, DZWIEK.sznurek);
    sznurek.lineStyle(1.2, 0x9a7a4a, 1);
    sznurek.lineBetween(-10, -6, -4, DZWIEK.sznurek);
    sznurek.lineBetween(10, -6, 4, DZWIEK.sznurek);
    const cienT = this.add.image(5, DZWIEK.sznurek + 38, 'menu-tabliczka').setTint(0x000000).setAlpha(0.35);
    const zwykla = this.add.image(0, DZWIEK.sznurek + 32, 'menu-tabliczka');
    const jasna = this.add.image(0, DZWIEK.sznurek + 32, 'menu-tabliczka-jasna').setVisible(false);
    const znak = this.add.graphics().setPosition(0, DZWIEK.sznurek + 30);
    const k = this.add
      .container(DZWIEK.x, DZWIEK.y, [sznurek, cienT, zwykla, jasna, znak])
      .setDepth(Z.dzwiek);
    // Wisi, więc się kołysze — wolniej i szerzej niż sztandar, bo jest lżejsza.
    this.tweens.add({
      targets: k,
      angle: { from: -3, to: 3 },
      duration: 2600,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
    });

    const opis = () => (this.sound.mute ? 'Dźwięk wyłączony — kliknij, żeby włączyć' : 'Dźwięk włączony — kliknij, żeby wyciszyć');
    const rysuj = () => {
      const cisza = this.sound.mute;
      znak.clear();
      // Nuta wypalona w drewnie: dwie główki na belce.
      const kol = 0x3a1a08;
      znak.fillStyle(kol, 1);
      znak.fillEllipse(-8, 9, 13, 10);
      znak.fillEllipse(10, 5, 13, 10);
      znak.fillRect(-3, -14, 4, 23);
      znak.fillRect(15, -18, 4, 23);
      znak.fillPoints(
        [
          new Phaser.Math.Vector2(-3, -14),
          new Phaser.Math.Vector2(19, -18),
          new Phaser.Math.Vector2(19, -11),
          new Phaser.Math.Vector2(-3, -7),
        ],
        true
      );
      if (cisza) {
        znak.lineStyle(5, 0xb22a18, 1);
        znak.beginPath();
        znak.moveTo(-18, -18);
        znak.lineTo(20, 18);
        znak.strokePath();
      }
    };
    rysuj();

    const strefa = this.add.zone(0, DZWIEK.sznurek + 32, 70, 70).setInteractive({ useHandCursor: true });
    k.add(strefa);
    strefa.on('pointerover', () => {
      jasna.setVisible(true);
      zwykla.setVisible(false);
      this.pokazDymek(DZWIEK.x - 40, DZWIEK.y + DZWIEK.sznurek + 32, opis(), 'lewo');
    });
    strefa.on('pointerout', () => {
      jasna.setVisible(false);
      zwykla.setVisible(true);
      this.ukryjDymek();
    });
    strefa.on('pointerdown', () => {
      this.sound.mute = !this.sound.mute;
      try {
        localStorage.setItem(KLUCZ_DZWIEKU, this.sound.mute ? 'wyl' : 'wl');
      } catch {
        // bez pamięci — przełącznik działa do końca sesji
      }
      if (!this.sound.mute) {
        this.graj('wejscie', 0.4);
        startMusic(this, MUZYKA_MIASTO);
      }
      this.tweens.add({ targets: znak, angle: { from: -25, to: 0 }, duration: 420, ease: 'Back.easeOut' });
      rysuj();
      this.pokazDymek(DZWIEK.x - 40, DZWIEK.y + DZWIEK.sznurek + 32, opis(), 'lewo');
    });
  }

  /** Tabliczka z imieniem gracza w lewym górnym rogu — klik otwiera „Kto gra?". */
  private tabliczkaGracza() {
    const y = GRACZ.sznurek + 20;
    const sznurek = this.add.graphics();
    for (const [grubosc, barwa] of [
      [3, 0x1e1208],
      [1.2, 0x9a7a4a],
    ] as const) {
      sznurek.lineStyle(grubosc, barwa, 1);
      sznurek.lineBetween(-78, -6, -70, y - 14);
      sznurek.lineBetween(78, -6, 70, y - 14);
    }
    // Deseczka o 1/5 większa niż „Zamknij" w oknach — ma być widać z daleka, czyja to gra.
    const SKALA = 1.2;
    const cienT = this.add.image(4, y + 5, 'menu-deseczka').setTint(0x000000).setAlpha(0.35).setScale(SKALA);
    const zwykla = this.add.image(0, y, 'menu-deseczka').setScale(SKALA);
    const jasna = this.add.image(0, y, 'menu-deseczka-jasna').setVisible(false).setScale(SKALA);
    const napis = this.add
      .text(0, y + 1, '', { fontFamily: KROJ.szyld, fontSize: '18px', fontStyle: '900', color: '#2a1204' })
      .setOrigin(0.5)
      .setShadow(0, 1, 'rgba(255,226,170,0.7)', 0, false, true);
    const strefa = this.add.zone(0, y, 212, 50).setInteractive({ useHandCursor: true });
    const k = this.add.container(GRACZ.x, 0, [sznurek, cienT, zwykla, jasna, napis, strefa]).setDepth(Z.dzwiek);
    this.tweens.add({ targets: k, angle: { from: -1.2, to: 1.2 }, duration: 3100, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
    const opis = () => {
      const p = aktywnyProfil();
      return p ? `Grasz jako ${p.imie} — kliknij, żeby zmienić gracza` : 'Kliknij i powiedz, kto gra';
    };
    strefa.on('pointerover', () => {
      jasna.setVisible(true);
      zwykla.setVisible(false);
      this.pokazDymek(GRACZ.x + 116, y, opis());
    });
    strefa.on('pointerout', () => {
      jasna.setVisible(false);
      zwykla.setVisible(true);
      this.ukryjDymek();
    });
    strefa.on('pointerdown', () => {
      if (this.okno?.otwarty || this.zajety) return;
      this.graj('wejscie', 0.4);
      this.tweens.add({ targets: napis, scale: { from: 0.9, to: 1 }, duration: 200, ease: 'Back.easeOut' });
      this.otworzProfile();
    });
    this.napisGracza = napis;
    this.odswiezTabliczke();
  }

  private odswiezTabliczke() {
    const t = this.napisGracza;
    if (!t) return;
    const p = aktywnyProfil();
    t.setText(p ? `Gracz: ${p.imie}` : 'Kto gra?');
    let r = 18;
    t.setFontSize(r);
    while (t.width > 180 && r > 11) t.setFontSize(--r);
  }

  /**
   * Dymek z podpowiedzią — kartka pergaminu z pełnym zdaniem dużą czcionką.
   * Zamiast drobnych podpisów na deskach, których krytyk nie umiał odczytać:
   * pełne zdanie pokazuje się dopiero, gdy dziecko o coś „pyta" myszą.
   */
  private pokazDymek(x: number, y: number, tekst: string, strona: 'lewo' | 'prawo' = 'prawo') {
    this.ukryjDymek();
    const t = this.add
      .text(0, 0, tekst, { fontFamily: KROJ.tekst, fontSize: '18px', color: '#3b2310' })
      .setOrigin(strona === 'prawo' ? 0 : 1, 0.5);
    const w = t.width + 24;
    const h = t.height + 14;
    const x0 = strona === 'prawo' ? -12 : -w + 12;
    const g = this.add.graphics();
    g.fillStyle(0x000000, 0.35);
    g.fillRoundedRect(x0 + 3, -h / 2 + 4, w, h, 8);
    g.fillStyle(0xf4e4bf, 1);
    g.fillRoundedRect(x0, -h / 2, w, h, 8);
    g.lineStyle(2, 0x7b3b12, 1);
    g.strokeRoundedRect(x0, -h / 2, w, h, 8);
    this.dymek = this.add.container(x, y, [g, t]).setDepth(Z.okno - 1).setAlpha(0);
    this.tweens.add({ targets: this.dymek, alpha: 1, duration: 140 });
  }

  private ukryjDymek() {
    this.dymek?.destroy();
    this.dymek = undefined;
  }

  /**
   * Muzyka wioski — ta sama co w mieście, bo menu JEST wioską. Wczytywana
   * po zbudowaniu sceny, żeby 4 MB nie opóźniały pierwszej klatki; gra
   * dopiero po pierwszym geście gracza (przeglądarki blokują autoodtwarzanie
   * — `startMusic` czeka na odblokowanie sama).
   */
  private wczytajMuzyke() {
    const graj = () => {
      if (this.sys.isActive()) startMusic(this, MUZYKA_MIASTO);
    };
    if (this.cache.audio.exists(MUZYKA_MIASTO.klucz)) {
      graj();
      return;
    }
    this.load.audio(MUZYKA_MIASTO.klucz, `${B}audio/${MUZYKA_MIASTO.klucz}.wav`);
    this.load.once(Phaser.Loader.Events.COMPLETE, graj);
    this.load.start();
  }

  private graj(klucz: string, glosnosc: number) {
    if (this.sound.mute || !this.cache.audio.exists(klucz)) return;
    try {
      this.sound.play(klucz, { volume: glosnosc, detune: Phaser.Math.Between(-60, 60) });
    } catch {
      // kontekst dźwięku jeszcze zablokowany — przed pierwszym gestem to normalne
    }
  }

  // ——————————————————————————————————————————————— wejście

  /** Logo spada z góry, deski wjeżdżają po kolei — menu „rozkłada się" na oczach. */
  private wejscie() {
    this.zajety = true;
    // Sztandar opuszcza się na linach z góry i dobija z lekkim sprężynowaniem.
    const logo = this.data.get('logo') as Phaser.GameObjects.Image;
    const yLogo = logo.y;
    logo.setY(yLogo - 260);
    this.tweens.add({ targets: logo, y: yLogo, duration: 900, ease: 'Back.easeOut', delay: 120 });
    this.deski.forEach((d, i) => {
      const cel = d.kont.alpha;
      d.kont.setAlpha(0).setX(d.x - 40);
      this.tweens.add({
        targets: d.kont,
        alpha: cel,
        x: d.x,
        duration: 380,
        delay: 380 + i * 90,
        ease: 'Back.easeOut',
        onComplete: () => {
          if (i === this.deski.length - 1) {
            this.zajety = false;
            this.gotowe = true;
            // Pierwsze uruchomienie: zanim ktokolwiek zagra, pytamy, kto gra.
            if (!listaProfili().length) this.otworzProfile({ nowy: true });
          }
        },
      });
    });
  }
}
