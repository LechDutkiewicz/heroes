import Phaser from 'phaser';
import { sledzScene } from '../dev/dziennik';
import { KAMPANIA, biezacaMisja, kampaniaUkonczona, wczytajPostep } from '../data/kampania';
import { jestZapis, wczytajGre } from '../data/zapis';
import { MUZYKA_MIASTO, initSfx, startMusic, stopMusic } from '../audio/mapSfx';
import { gradientText } from '../visual/hud';
import { TEX, ZM, ozywTlo, stworek, zbudujTekstury } from '../visual/menuZycie';
import { KROJ, deseczka, pokazAutorow, pokazRekordy, type Zwoj } from '../visual/menuOkna';

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
const SLUP = { x: 104, y: 300 };

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
const DZWIEK = { x: 667, y: 556 };

const Z = {
  logo: 20,
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
  kroje ??= Promise.all(
    (
      [
        ['MenuCinzel', 'cinzel-latin-900', LACINSKI, '900'],
        ['MenuCinzel', 'cinzel-latin-ext-900', ROZSZERZONY, '900'],
        ['MenuFredoka', 'fredoka-latin-600', LACINSKI, '400'],
        ['MenuFredoka', 'fredoka-latin-ext-600', ROZSZERZONY, '400'],
      ] as const
    ).map(async ([rodzina, plik, zakres, waga]) => {
      const f = new FontFace(rodzina, `url(${B}menu/${plik}.woff2)`, { unicodeRange: zakres, weight: waga });
      await f.load();
      document.fonts.add(f);
    })
  ).then(
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
    // Stworki z wioski — te same pliki i klucze co na mapie przygody.
    for (const s of ['00096', '00218', '00020']) this.load.image(`p-${s}`, `${B}sprites/${s}.png`);
    // Dwie krótkie próbki: stuknięcie deski i wejście. Muzyka dochodzi
    // później, w tle — 4 MB nie może trzymać czarnego ekranu.
    this.load.audio('wejscie', `${B}audio/wejscie.wav`);
    this.load.audio('krok', `${B}audio/krok.ogg`);
    void wczytajKroje();
  }

  create() {
    sledzScene(this);
    this.deski = [];
    this.poziom = 'glowne';
    this.wybor = -1;
    this.zajety = false;
    this.okno = undefined;
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

    const glos = () => this.graj('krok', 0.5);
    stworek(this, 'p-00096', SLUP.x + 2, SLUP.y + 6, 62, { glos, depth: Z.deski + 2 });
    stworek(this, 'p-00218', 578, 446, 44, { glos, flip: true });
    stworek(this, 'p-00020', 906, 134, 40, { glos, flip: true });

    this.pokazPoziom('glowne', false);
    this.klawiatura();
    this.wejscie();
  }

  // ——————————————————————————————————————————————— logo

  private logo() {
    const logo = this.add.image(480, 132, 'menu-logo').setDepth(Z.logo);
    // Błyski na literach — jak odbicie słońca na złocie. Punkt losujemy
    // w górnej połowie logo (litery, nie wstęga) i tylko tam, gdzie tekstura
    // jest nieprzezroczysta, żeby gwiazdka nie zabłysła w powietrzu.
    const tex = this.textures.get('menu-logo').getSourceImage() as HTMLImageElement;
    const blysk = () => {
      for (let proba = 0; proba < 20; proba++) {
        const px = Phaser.Math.Between(40, tex.width - 40);
        const py = Phaser.Math.Between(30, tex.height * 0.66);
        if ((this.textures.getPixelAlpha(px, py, 'menu-logo') ?? 0) < 250) continue;
        const g = this.add
          .image(logo.x - tex.width / 2 + px, logo.y - tex.height / 2 + py, TEX.gwiazdka)
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
    this.time.addEvent({ delay: 650, loop: true, callback: blysk });
    this.data.set('logo', logo);
  }

  // ——————————————————————————————————————————————— drogowskaz

  private zbudujDrogowskaz() {
    const slup = this.add.image(SLUP.x, SLUP.y, 'menu-slup').setDepth(Z.slup);
    // Czubek daszka w teksturze: środek w poziomie, 16 px od góry (margines
    // na cień z tools/menu_wczytaj.py).
    slup.setOrigin(0.5, 16 / slup.height);

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
        .text(srodek, 0, '', { fontFamily: KROJ.tekst, fontSize: '14px', color: '#4a2a12' })
        .setOrigin(0.5);
      // Strefa kliknięcia = cała deska. Osobna strefa w kontenerze, a nie
      // `setInteractive` na kontenerze: kontener ma początek na lewym końcu
      // deski (tam jest oś obrotu — gwoździe), a jego pole trafień liczy się
      // od środka i wypadałoby pół deski w bok.
      const strefa = this.add.zone(d.w / 2, 0, d.w, d.h).setInteractive({ useHandCursor: true });
      const kont = this.add
        .container(x, d.y, [zwykla, jasna, szara, napis, podpis, strefa])
        .setAngle(d.kat)
        .setDepth(Z.deski + (DESKI.length - i) * 0.01);
      strefa.on('pointerover', () => this.ustawWybor(i, true));
      strefa.on('pointerout', () => {
        if (this.wybor === i) this.ustawWybor(-1, true);
      });
      strefa.on('pointerdown', () => this.uruchom(i));
      this.deski.push({ kont, zwykla, jasna, szara, napis, podpis, x, y: d.y });
    });
  }

  /** Pozycje menu na danym poziomie — liczone przy każdym wejściu, bo zapis mógł się zmienić. */
  private pozycje(p: Poziom): (Pozycja | undefined)[] {
    if (p === 'nowa') {
      return [
        { napis: 'Kampania', podpis: KAMPANIA.tytul, wlaczona: true, akcja: () => this.idz('kampania') },
        {
          napis: 'Pojedyncza mapa',
          wlaczona: true,
          akcja: () => {
            this.registry.remove('stan-mapy');
            this.idz('adventure');
          },
        },
        { napis: 'Szybka bitwa', wlaczona: true, akcja: () => this.idz('battle') },
        { napis: 'Wróć', wlaczona: true, akcja: () => this.pokazPoziom('glowne') },
      ];
    }
    const kampania = this.kampaniaWToku();
    const mapa = jestZapis() ? wczytajGre() : null;
    if (p === 'wczytaj') {
      return [
        kampania ? { napis: 'Kampania', podpis: kampania, wlaczona: true, akcja: () => this.idz('kampania') } : undefined,
        mapa ? {
          napis: 'Zapisana mapa',
          podpis: `dzień ${mapa.dzien}`,
          wlaczona: true,
          akcja: () => this.wczytajMape(),
        } : undefined,
        undefined,
        { napis: 'Wróć', wlaczona: true, akcja: () => this.pokazPoziom('glowne') },
      ];
    }
    const cos = !!kampania || !!mapa;
    return [
      { napis: 'Nowa gra', wlaczona: true, akcja: () => this.pokazPoziom('nowa') },
      {
        napis: 'Wczytaj',
        podpis: cos ? (kampania && mapa ? 'kampania albo mapa' : (kampania ?? `mapa, dzień ${mapa!.dzien}`)) : 'nic jeszcze nie zapisano',
        wlaczona: cos,
        akcja: () => {
          // Jedna rzecz do wczytania — od razu. Dwie — deski pytają, którą.
          if (kampania && mapa) this.pokazPoziom('wczytaj');
          else if (kampania) this.idz('kampania');
          else this.wczytajMape();
        },
      },
      { napis: 'Rekordy', wlaczona: true, akcja: () => this.otworzOkno('rekordy') },
      { napis: 'Autorzy', wlaczona: true, akcja: () => this.otworzOkno('autorzy') },
    ];
  }

  /** Opis kampanii w toku („misja 2: Klucze do przełęczy") albo `null`. */
  private kampaniaWToku(): string | null {
    const p = wczytajPostep();
    if (!p || kampaniaUkonczona(p)) return null;
    const m = biezacaMisja(p);
    // Postęp bez żadnej ukończonej misji i bez wybranego bonusu to tylko
    // wybrane imię — jeszcze nie ma czego „wczytywać".
    if (!m || (p.ukonczone.length === 0 && p.bonus === undefined)) return null;
    return `misja ${m.nr}: ${m.tytul}`;
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
    const zPodpisem = !!poz.podpis;
    // Pusty podpis się CHOWA, a nie tylko dostaje pusty napis: tekst
    // skrócony do "" ma teksturę szerokości 0, a taki kwadrat w partii
    // WebGL Phasera 4 rozsypywał wierzchołki sąsiadów — deska rysowała się
    // jako poszarpane trójkąty, a litery sąsiednich desek znikały.
    d.podpis.setText(poz.podpis ?? ' ').setVisible(zPodpisem);
    d.napis.setY(zPodpisem ? -8 : 1);
    d.podpis.setY(cfg.h / 2 - 17);
    this.pomalujDeske(d, false);
  }

  /** Trzy wyglądy deski: zwykła (wyryty ciemny napis), wskazana (złoty, świecący), nieczynna. */
  private pomalujDeske(d: Deska, wskazana: boolean) {
    const czynna = d.pozycja?.wlaczona ?? false;
    d.zwykla.setVisible(czynna && !wskazana);
    d.jasna.setVisible(czynna && wskazana);
    d.szara.setVisible(!czynna);
    if (!czynna) {
      d.napis.setStroke('#000000', 0).setShadow(0, 1.5, 'rgba(255,255,255,0.45)', 0, false, true);
      d.napis.setFill('#3c3630');
      d.napis.setAlpha(0.75);
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

  private wczytajMape() {
    const stan = wczytajGre();
    if (!stan) {
      this.pokazPoziom('glowne');
      return;
    }
    this.registry.set('stan-mapy', stan);
    this.idz('adventure');
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
   */
  private przelacznikDzwieku() {
    const zwykla = this.add.image(0, 0, 'menu-tabliczka');
    const jasna = this.add.image(0, 0, 'menu-tabliczka-jasna').setVisible(false);
    const znak = this.add.graphics();
    const k = this.add.container(DZWIEK.x, DZWIEK.y, [zwykla, jasna, znak]).setDepth(Z.dzwiek);
    const podpis = deseczka(this, DZWIEK.x, DZWIEK.y + 46, '').setDepth(Z.dzwiek).setAngle(-2);

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
      podpis.ustawNapis(cisza ? 'Dźwięk: nie' : 'Dźwięk: tak');
    };
    rysuj();

    k.setSize(64, 64).setInteractive({ useHandCursor: true });
    podpis.setSize(176, 40).setInteractive({ useHandCursor: true });
    for (const cel of [k, podpis]) {
      cel.on('pointerover', () => {
        jasna.setVisible(true);
        zwykla.setVisible(false);
      });
      cel.on('pointerout', () => {
        jasna.setVisible(false);
        zwykla.setVisible(true);
      });
      cel.on('pointerdown', () => {
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
        this.tweens.add({ targets: k, angle: { from: -12, to: 0 }, duration: 380, ease: 'Back.easeOut' });
        rysuj();
      });
    }
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
    const logo = this.data.get('logo') as Phaser.GameObjects.Image;
    const yLogo = logo.y;
    logo.setAlpha(0).setY(yLogo - 40);
    this.tweens.add({ targets: logo, alpha: 1, y: yLogo, duration: 700, ease: 'Back.easeOut', delay: 150 });
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
          }
        },
      });
    });
  }
}
