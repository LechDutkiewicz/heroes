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
import { planszaPrzygody } from '../data/plansza';
import { POZIOM_STARTERA } from '../data/startery';
import { MUZYKA_MIASTO, initSfx, startMusic, stopMusic } from '../audio/mapSfx';
import { gradientText } from '../visual/hud';
import { CZERWIEN, KROJ_WALKI, TUSZ, ZOLTY, type KolorPigulki, krojWalki, napisNaPigulce, pigulka, stylWalki } from '../visual/stylWalki';
import { TEX, ozywTloDnia, stworek, zbudujTekstury } from '../visual/menuZycie';
import { krojeZestawu, wczytajZestaw } from '../visual/zestaw';
import { pokazAutorow, pokazProfile, pokazRekordy, type Zwoj } from '../visual/menuOkna';
import { pokazWczytanie, pytanie } from '../visual/oknoZapisu';

/**
 * Menu główne — ekran tytułowy jak w grach Pokémon.
 *
 * Wcześniej było ulicą baśniowej wioski z drogowskazem (wzorzec: menu
 * Heroes 2, gdzie przyciskami są szyldy sklepów). Po przejściu całej gry
 * na styl gier Pokémon — biel, tusz, czerwień, pigułki — i po narysowaniu
 * miast od nowa drogowskaz i sztandar zostały jedynym drewnem w grze.
 * Teraz: tło to miasteczko Boru z nowego miasta, logo w barwach serii
 * (żółte litery, niebieski obrys), przyciski to te same pigułki co w walce,
 * a z przodu stoją Ela i Janek ze starterem — postacie, którymi się gra.
 *
 * Co zostało z drogowskazu: lista z góry na dół (dla ośmiolatka prostsza
 * niż szukanie napisów po obrazku), strzałki na klawiaturze i to, że podmenu
 * („Nowa gra", „Wczytaj") nie otwiera okna, tylko przewraca te same
 * przyciski na nowe napisy.
 */

const B = import.meta.env.BASE_URL;

/** Kolumna przycisków: lewy brzeg. */
const PRZYCISKI_X = 58;

/** Przyciski od góry — pierwszy większy, bo to „zacznij tutaj". */
const DESKI = [
  { y: 322, w: 340, h: 66, kroj: 30 },
  { y: 404, w: 340, h: 56, kroj: 23 },
  { y: 474, w: 340, h: 56, kroj: 23 },
  { y: 544, w: 340, h: 56, kroj: 23 },
] as const;

/** Logo nad kolumną przycisków: środek pierwszego wiersza liter. */
const LOGO = { x: 230, y: 92 };

/** Ela, Janek i starter na pierwszym planie, na szczycie łąki po prawej. */
const POSTACIE = { ela: { x: 668, wys: 342 }, janek: { x: 872, wys: 354 }, starter: { x: 562, wys: 104 }, stopy: 676 };

/** Korona wielkiego drzewa w prawym górnym rogu tła — stąd spadają liście. */
const KORONA = new Phaser.Geom.Rectangle(640, 0, 320, 150);

/** Przycisk dźwięku: prawy górny róg. */
const DZWIEK = { x: 922, y: 38, r: 24 };

/** Tabliczka gracza: pigułka na lewo od dźwięku — czyja gra jest teraz otwarta. */
const GRACZ = { x: 876, y: 38, h: 40 };

const Z = {
  logo: 20,
  bohater: 26,
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
  /** Pigułka przycisku — przerysowywana przy każdej zmianie stanu. */
  tlo: Phaser.GameObjects.Graphics;
  napis: Phaser.GameObjects.Text;
  podpis: Phaser.GameObjects.Text;
  klodka: Phaser.GameObjects.Image;
  /** Środek napisu na czynnym przycisku; nieczynny przesuwa go w lewo, robiąc miejsce na kłódkę. */
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
  private napisGracza?: Phaser.GameObjects.Text;
  private tabliczka?: { g: Phaser.GameObjects.Graphics; strefa: Phaser.GameObjects.Zone; wskazana: boolean };
  /** Flaga dla narzędzi (tools/zrzut-menu.mjs): menu zbudowane i po wejściu. */
  gotowe = false;

  constructor() {
    super('menu');
  }

  preload() {
    const m = `${B}menu/`;
    this.load.image('menu-tlo', `${m}tlo2.jpg`);
    this.load.image('menu-klodka', `${m}klodka.png`);
    this.load.image('menu-ela', `${B}bohater/postac-ela.png`);
    this.load.image('menu-janek', `${B}bohater/postac-janek.png`);
    // Starter Boru (Pyroko) — ten, z którym zaczyna się pierwsza misja.
    this.load.image('menu-starter', `${B}sprites/00193.png`);
    // Dwie krótkie próbki: stuknięcie przycisku i wejście. Muzyka dochodzi
    // później, w tle — 4 MB nie może trzymać czarnego ekranu.
    this.load.audio('wejscie', [`${B}audio/wejscie.ogg`, `${B}audio/wejscie.mp3`]);
    this.load.audio('krok', `${B}audio/krok.ogg`);
    // Zestaw — okno zapisanych gier i pytania.
    wczytajZestaw(this);
    void wczytajKroje();
    void krojWalki();
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
    this.add.image(0, 0, 'menu-tlo').setOrigin(0).setDepth(0);
    const zatrzymaj = ozywTloDnia(this, KORONA);
    this.events.once('shutdown', zatrzymaj);
    this.cameras.main.fadeIn(450, 12, 8, 4);

    // Napisy powstają dopiero z krojami — inaczej Phaser zmierzy je krojem
    // zapasowym i przycisk dostanie napis złej szerokości na jedną klatkę.
    void Promise.all([wczytajKroje(), krojWalki()]).then(() => {
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
   * Ela i Janek — trenerzy, którymi się gra (ekran wyboru kampanii, ekran
   * bohatera) — i starter Boru między nimi. Stoją przodem do gracza jak na
   * ekranach tytułowych gier: „chodź, zaczynamy".
   */
  private bohater() {
    const stopy = POSTACIE.stopy;
    for (const [klucz, poz] of [
      ['menu-ela', POSTACIE.ela],
      ['menu-janek', POSTACIE.janek],
    ] as const) {
      this.add
        .image(poz.x, stopy - 4, TEX.cien)
        .setDisplaySize(poz.wys * 0.5, poz.wys * 0.09)
        .setAlpha(0.9)
        .setDepth(Z.bohater - 0.1);
      const b = this.add.image(poz.x, stopy, klucz).setOrigin(0.5, 1).setDepth(Z.bohater);
      b.setScale(poz.wys / b.height);
      // Oddech: ledwie widoczny, ale bez niego postać wygląda jak wycinanka.
      this.tweens.add({
        targets: b,
        scaleY: b.scaleY * 1.008,
        scaleX: b.scaleX * 0.996,
        duration: klucz === 'menu-ela' ? 1900 : 2150,
        yoyo: true,
        repeat: -1,
        ease: 'Sine.easeInOut',
      });
    }
    stworek(this, 'menu-starter', POSTACIE.starter.x, stopy - 6, POSTACIE.starter.wys, {
      glos: () => this.graj('krok', 0.5),
      depth: Z.bohater + 1,
    });
  }

  // ——————————————————————————————————————————————— logo

  /**
   * Logo w barwach serii: grube żółte litery z niebieskim obrysem i cieniem,
   * pod nim tytuł kampanii na czerwonej pigułce — jak podtytuł wersji gry.
   * Rysowane w kodzie, więc nie ma czego „wmalowywać" w tło.
   */
  private logo() {
    const k = this.add.container(LOGO.x, LOGO.y).setDepth(Z.logo);
    const litery = (tekst: string, y: number, rozmiar: number) => {
      const t = this.add
        .text(0, y, tekst, { fontFamily: KROJ_WALKI, fontSize: `${rozmiar}px`, fontStyle: '900', color: '#ffd43b' })
        .setOrigin(0.5)
        .setLetterSpacing(2)
        .setStroke('#2a5bb8', Math.round(rozmiar * 0.22))
        .setShadow(0, Math.round(rozmiar * 0.09), '#173a80', 0, true, true);
      gradientText(t, '#fff07a', '#f5b82e');
      k.add(t);
      return t;
    };
    litery('POKÉMON', 0, 66);
    const dol = litery('HEROES', 64, 58);
    // Podtytuł: nazwa kampanii na czerwonej pigułce pod literami.
    const pod = this.add.text(0, 0, KAMPANIA.tytul, stylWalki(21)).setOrigin(0.5);
    napisNaPigulce(pod, 'czerwony');
    const w = pod.width + 52;
    const g = this.add.graphics();
    const y = dol.y + 54;
    pigulka(g, -w / 2, y - 20, w, 40, 'czerwony', { r: 20 });
    pod.setY(y);
    k.add([g, pod]);
    this.data.set('logo', k);
  }

  // ——————————————————————————————————————————————— przyciski

  private zbudujDrogowskaz() {
    // Zaproszenie: miękki żółty blask za „Nową grą", dopóki gracz niczego
    // nie wskazał. Pierwsze pytanie dziecka przed menu brzmi „gdzie się
    // zaczyna?" — to jest odpowiedź bez słów.
    this.zaproszenie = this.add
      .image(PRZYCISKI_X + DESKI[0].w / 2, DESKI[0].y, TEX.blask)
      .setDisplaySize(DESKI[0].w * 1.5, DESKI[0].h * 2.6)
      .setTint(ZOLTY)
      .setBlendMode(Phaser.BlendModes.ADD)
      .setAlpha(0)
      .setDepth(Z.deski - 1);

    DESKI.forEach((d, i) => {
      const x = PRZYCISKI_X;
      const tlo = this.add.graphics();
      const srodek = d.w / 2;
      const napis = this.add.text(srodek, 0, '', stylWalki(d.kroj)).setOrigin(0.5);
      const podpis = this.add.text(srodek, 0, '', stylWalki(14, '#3d4350', 800)).setOrigin(0.5);
      // Kłódka przy prawym końcu — widać ją tylko na przycisku nieczynnym.
      const klodka = this.add
        .image(d.w - 32, 0, 'menu-klodka')
        .setOrigin(0.5, 0.5)
        .setDisplaySize(26, 33)
        .setVisible(false);
      // Strefa kliknięcia = cały przycisk. Osobna strefa w kontenerze: jego
      // początek jest na lewym końcu, a pole trafień kontenera liczy się
      // od środka i wypadałoby pół przycisku w bok.
      const strefa = this.add.zone(d.w / 2, 0, d.w, d.h).setInteractive({ useHandCursor: true });
      const kont = this.add
        .container(x, d.y, [tlo, napis, podpis, klodka, strefa])
        .setDepth(Z.deski + (DESKI.length - i) * 0.01);
      strefa.on('pointerover', () => this.ustawWybor(i, true));
      strefa.on('pointerout', () => {
        if (this.wybor === i) this.ustawWybor(-1, true);
      });
      strefa.on('pointerdown', () => this.uruchom(i));
      this.deski.push({ kont, tlo, napis, podpis, klodka, srodek, x, y: d.y });
    });
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
              // Nowa gra zaczyna się od wyboru startera na mapie (`startery.ts`).
              this.registry.set('stan-mapy', planszaPrzygody(undefined, { starter: { poziom: POZIOM_STARTERA } }));
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
    d.napis.setText(poz.napis);
    // Napis ma się zmieścić w pigułce — „Pojedyncza mapa" jest najdłuższe.
    const miejsce = cfg.w - 70;
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
    let rozmiarP = 14;
    d.podpis.setFontSize(rozmiarP);
    while (d.podpis.width > miejsce && rozmiarP > 11) d.podpis.setFontSize(--rozmiarP);
    d.napis.setY(zPodpisem ? -8 : -1);
    d.podpis.setY(cfg.h / 2 - 16);
    this.pomalujDeske(d, false);
  }

  /**
   * Wygląd przycisku: pierwszy czerwony (główny — „zacznij tutaj"), reszta
   * biała, nieczynny szary z kłódką. Wskazany dostaje żółtą obwódkę, jak
   * wybrany atak w walce.
   */
  private pomalujDeske(d: Deska, wskazana: boolean) {
    const czynna = d.pozycja?.wlaczona ?? false;
    const i = this.deski.indexOf(d);
    const cfg = DESKI[i];
    const kolor: KolorPigulki = !czynna ? 'szary' : i === 0 ? 'czerwony' : 'bialy';
    d.tlo.clear();
    pigulka(d.tlo, 0, -cfg.h / 2, cfg.w, cfg.h, kolor, { r: cfg.h / 2, wybrana: czynna && wskazana });
    d.klodka.setVisible(!czynna);
    const x = czynna ? d.srodek : d.srodek - 16;
    d.napis.setX(x);
    d.podpis.setX(x);
    napisNaPigulce(d.napis, kolor);
    d.podpis.setColor(kolor === 'czerwony' ? '#ffe3dc' : kolor === 'szary' ? '#8b93a0' : '#3d4350');
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
    b.setPosition(d.x + cfg.w / 2 + (wskazana ? 8 : 0), d.y);
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
      this.tweens.add({ targets: d.kont, x: d.x + 6, duration: 60, yoyo: true, repeat: 2 });
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
    if (listaZapisow()[0]?.misja) {
      usunZapis('auto');
      usunZapis('bitwa');
    }
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
   * Okrągły biały przycisk z nutą, bez napisu: nuta (i nuta przekreślona)
   * mówi to samo każdemu dziecku, a pełne zdanie pokazuje dymek po wskazaniu.
   */
  private przelacznikDzwieku() {
    const tlo = this.add.graphics();
    const znak = this.add.graphics();
    const k = this.add.container(DZWIEK.x, DZWIEK.y, [tlo, znak]).setDepth(Z.dzwiek);
    const kolo = (wskazany: boolean) => {
      tlo.clear();
      tlo.fillStyle(TUSZ, 0.3);
      tlo.fillCircle(0, 3, DZWIEK.r);
      if (wskazany) {
        tlo.fillStyle(TUSZ, 1);
        tlo.fillCircle(0, 0, DZWIEK.r + 6);
        tlo.fillStyle(ZOLTY, 1);
        tlo.fillCircle(0, 0, DZWIEK.r + 3);
      }
      tlo.fillStyle(TUSZ, 1);
      tlo.fillCircle(0, 0, DZWIEK.r);
      tlo.fillStyle(0xffffff, 1);
      tlo.fillCircle(0, 0, DZWIEK.r - 3);
    };
    kolo(false);

    const opis = () => (this.sound.mute ? 'Dźwięk wyłączony — kliknij, żeby włączyć' : 'Dźwięk włączony — kliknij, żeby wyciszyć');
    const rysuj = () => {
      const cisza = this.sound.mute;
      znak.clear();
      // Nuta: dwie główki na belce, tuszem.
      znak.fillStyle(TUSZ, 1);
      znak.fillEllipse(-6, 7, 10, 8);
      znak.fillEllipse(8, 4, 10, 8);
      znak.fillRect(-2.5, -11, 3, 18);
      znak.fillRect(11.5, -14, 3, 18);
      znak.fillPoints(
        [
          new Phaser.Math.Vector2(-2.5, -11),
          new Phaser.Math.Vector2(14.5, -14),
          new Phaser.Math.Vector2(14.5, -9),
          new Phaser.Math.Vector2(-2.5, -6),
        ],
        true
      );
      if (cisza) {
        znak.lineStyle(4, CZERWIEN, 1);
        znak.beginPath();
        znak.moveTo(-14, -14);
        znak.lineTo(15, 15);
        znak.strokePath();
      }
    };
    rysuj();

    const strefa = this.add.zone(0, 0, DZWIEK.r * 2 + 10, DZWIEK.r * 2 + 10).setInteractive({ useHandCursor: true });
    k.add(strefa);
    strefa.on('pointerover', () => {
      kolo(true);
      this.pokazDymek(DZWIEK.x - 10, DZWIEK.y + 52, opis(), 'lewo');
    });
    strefa.on('pointerout', () => {
      kolo(false);
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
      this.pokazDymek(DZWIEK.x - 10, DZWIEK.y + 52, opis(), 'lewo');
    });
  }

  /** Pigułka z imieniem gracza w prawym górnym rogu — klik otwiera „Kto gra?". */
  private tabliczkaGracza() {
    const g = this.add.graphics();
    const napis = this.add.text(0, 0, '', stylWalki(18)).setOrigin(1, 0.5);
    const strefa = this.add.zone(0, 0, 10, GRACZ.h).setOrigin(1, 0.5).setInteractive({ useHandCursor: true });
    this.add.container(GRACZ.x, GRACZ.y, [g, napis, strefa]).setDepth(Z.dzwiek);
    const opis = () => {
      const p = aktywnyProfil();
      return p ? `Grasz jako ${p.imie} — kliknij, żeby zmienić gracza` : 'Kliknij i powiedz, kto gra';
    };
    this.tabliczka = { g, strefa, wskazana: false };
    strefa.on('pointerover', () => {
      if (this.tabliczka) this.tabliczka.wskazana = true;
      this.odswiezTabliczke();
      this.pokazDymek(GRACZ.x, GRACZ.y + 44, opis(), 'lewo');
    });
    strefa.on('pointerout', () => {
      if (this.tabliczka) this.tabliczka.wskazana = false;
      this.odswiezTabliczke();
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
    const tab = this.tabliczka;
    if (!t || !tab) return;
    const p = aktywnyProfil();
    t.setText(p ? `Gracz: ${p.imie}` : 'Kto gra?');
    let r = 18;
    t.setFontSize(r);
    while (t.width > 200 && r > 12) t.setFontSize(--r);
    const w = t.width + 36;
    t.setX(-18);
    napisNaPigulce(t, 'bialy');
    tab.g.clear();
    pigulka(tab.g, -w, -GRACZ.h / 2, w, GRACZ.h, 'bialy', { r: GRACZ.h / 2, wybrana: tab.wskazana });
    tab.strefa.setSize(w, GRACZ.h);
  }

  /**
   * Dymek z podpowiedzią — biały dymek z pełnym zdaniem dużą czcionką.
   * Zamiast drobnych podpisów na przyciskach, których krytyk nie umiał odczytać:
   * pełne zdanie pokazuje się dopiero, gdy dziecko o coś „pyta" myszą.
   */
  private pokazDymek(x: number, y: number, tekst: string, strona: 'lewo' | 'prawo' = 'prawo') {
    this.ukryjDymek();
    const t = this.add
      .text(0, 0, tekst, stylWalki(17, '#26262e', 800))
      .setOrigin(strona === 'prawo' ? 0 : 1, 0.5);
    const w = t.width + 24;
    const h = t.height + 14;
    const x0 = strona === 'prawo' ? -12 : -w + 12;
    const g = this.add.graphics();
    g.fillStyle(TUSZ, 0.3);
    g.fillRoundedRect(x0, -h / 2 + 4, w, h, 12);
    g.fillStyle(TUSZ, 1);
    g.fillRoundedRect(x0, -h / 2, w, h, 12);
    g.fillStyle(0xffffff, 1);
    g.fillRoundedRect(x0 + 3, -h / 2 + 3, w - 6, h - 6, 10);
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
    this.load.audio(MUZYKA_MIASTO.klucz, [`${B}audio/${MUZYKA_MIASTO.klucz}.ogg`, `${B}audio/${MUZYKA_MIASTO.klucz}.mp3`]);
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

  /** Logo spada z góry, przyciski wjeżdżają po kolei — menu „rozkłada się" na oczach. */
  private wejscie() {
    this.zajety = true;
    // Logo spada z góry i dobija z lekkim sprężynowaniem.
    const logo = this.data.get('logo') as Phaser.GameObjects.Container;
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
