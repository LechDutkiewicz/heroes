import Phaser from 'phaser';
import { sledzScene, migawkaStanu } from '../dev/dziennik';
import {
  KAMPANIA,
  type Bonus,
  type Misja,
  type PostepKampanii,
  biezacaMisja,
  kampaniaUkonczona,
  nowyPostep,
  usunPostep,
  wczytajPostep,
  zapiszPostep,
} from '../data/kampania';
import { rozpocznijMisje } from '../data/kampania-start';
import { SUROWIEC_INFO, artefaktPoId } from '../data/mapa';
import { FACTIONS, factionById } from '../data/factions';
import { C } from '../visual/theme';
import { gradientText, mix } from '../visual/hud';
import { ICON, buildIcons, type IconKey } from '../visual/icons';
import { buildArtefakty, kluczArtefaktu } from '../visual/artefakty';
import { wersjonujZasoby } from '../visual/zasoby';
import { MUZYKA_MAPA, initSfx, sfx, startMusic, toggleSfx } from '../audio/mapSfx';

/**
 * Ekran kampanii — odpowiednik ekranu „The Succession Wars" z Heroes 2.
 *
 * Co robi wzorzec i co bierzemy
 * -----------------------------
 * Heroes 2 pokazuje między misjami jeden malowany ekran: mapę scenariuszy
 * (zrobione odhaczone, bieżący podświetlony, przyszłe widoczne), opis misji
 * na pergaminie, licznik dni i trzy bonusy do wyboru jako przyciski radiowe.
 * Bez wybranego bonusu nie da się ruszyć. Przed pierwszą misją — wybór strony
 * dwoma portretami i filmik wstępu.
 *
 * Wszystko to jest tutaj, z trzema zmianami pod ośmiolatka:
 *
 *  - Mapa jest MAPĄ KRAINY, nie schematem ikon. Misje stoją w miejscach,
 *    o których opowiadają (fort, grota, bagno, twierdze), a droga między nimi
 *    płynie w stronę bieżącej misji. Dziecko widzi „gdzie byłem, gdzie jestem,
 *    dokąd idę" bez czytania.
 *  - Trener stoi przy bieżącej misji, a nad nią skacze strzałka. W Heroes 2
 *    bieżący scenariusz różni się od reszty tylko obwódką — dorosły to
 *    zauważy, dziecko niekoniecznie.
 *  - Nagrody są kartami z obrazkiem i liczbą, nie trzema ikonkami z podpisem
 *    pod spodem. „30 pokeballi" ma pokazywać pokeball i trzydziestkę.
 *
 * Jeden materiał na cały ekran
 * ----------------------------
 * Pierwsza wersja przegrała ślepe porównanie z Heroes 2 przez to, co WOKÓŁ
 * mapy: błękitne tło, białe karty i błyszczące kapsułki z interfejsu bitwy
 * obok malowanej mapy i pergaminu — cztery języki wizualne na jednym ekranie.
 * Teraz wszystko jest z trzech materiałów (`tools/kampania_kit.py`): drewno
 * (tło, belka nagłówka, tabliczki przycisków), złoto (ramy, obwódki, główny
 * przycisk) i pergamin (każdy tekst). Kapsułek i mlecznych paneli z bitwy
 * tu nie ma; zostały tylko medaliony misji na mapie, bo są częścią mapy.
 *
 * Czego świadomie nie robimy: nie pokazujemy opisów misji zamkniętych. Heroes 2
 * też ich nie zdradza, a dla dziecka „co tam będzie?" jest powodem, żeby grać
 * dalej. Nie rozgałęziamy też drogi — kampania ma cztery misje po kolei,
 * a namalowana odnoga prowadząca donikąd byłaby obietnicą bez pokrycia.
 *
 * Trzy tryby jednej sceny: wybór trenera (brak postępu), opowieść (wstęp albo
 * zakończenie — nakładka) i sam ekran kampanii. Jedna scena, bo wszystkie trzy
 * dzielą grafiki i postęp, a przejście między nimi ma trwać ułamek sekundy.
 */

// ————————————————————————————————————————————————— układ

const EKRAN_W = 960;
const EKRAN_H = 694;
/** Belka nagłówka namalowana w `drewno.jpg` (z listwą perełkową pod spodem). */
const BELKA_Y = 25;
/** Mapa krainy, 4:3 jak plik (1232 × 924). */
const MAPA = { x: 28, y: 76, w: 588, h: 441 };
/** Zwój z opisem misji — prawa kolumna. */
const ZWOJ = { x: 646, y: 64, w: 300, h: 541 };
/** Pergamin z nagrodami pod mapą. */
const PAS = { x: 22, y: 546, w: 600, h: 138 };
const GRAJ = { x: 850, y: 650, w: 188, h: 54 };
const MENU = { x: 698, y: 650, w: 92, h: 46 };

/**
 * Kroje. Lora (OFL, `public/fonty/`) — szeryfowa, z kaligraficznym
 * zacięciem, wczytywana z plików gry, a nie z sieci. Pogrubiony Trebuchet
 * z grubym konturem, którego używa bitwa, czytał się przy malowanej mapie
 * jak napis z gry na telefon.
 */
const SERIF = 'KampaniaSerif, Georgia, serif';
const TEKST = 'KampaniaTekst, Georgia, serif';
const KURSYWA = 'KampaniaKursywa, Georgia, serif';

/** Atrament na pergaminie. */
const ATRAMENT = '#4a2c12';
const ATRAMENT_MIEKKI = '#7a5530';
const ATRAMENT_CZERWONY = '#8e2a18';
/** Napis na drewnie: kremowy z ciemnym konturem, jak wypalony i pozłacany. */
const KREM = '#f8e6b8';
const BRAZ = '#2a1606';

/** Barwa chorągiewki trenera: ta sama, co jego czapka. */
const BARWA_TRENERA: Record<string, number> = { Janek: 0xe4413c, Ola: 0x3fae5a };

interface Trener {
  imie: string;
  /** Figurka (pixel art 1×) i jej głowa do medalionu. */
  figurka: string;
  glowa: string;
  opis: string;
  /** Który wycinek ilustracji Boru jest tłem karty. */
  tloX: number;
}

const TRENERZY: Trener[] = [
  { imie: 'Janek', figurka: 'k-janek', glowa: 'k-glowa-janek', opis: 'Odważny i szybki.\nZawsze pierwszy do przygody!', tloX: 0.28 },
  { imie: 'Ola', figurka: 'k-ola', glowa: 'k-glowa-ola', opis: 'Sprytna i uważna.\nŻaden ślad jej nie umknie!', tloX: 0.72 },
];

const trenerPoImieniu = (imie: string) => TRENERZY.find((t) => t.imie === imie) ?? TRENERZY[0];

// ————————————————————————————————————————————————— słowa

/**
 * Nazwy artefaktów, których nie ma w `ARTEFAKTY` — cel misji 3 jest przedmiotem
 * fabularnym i nie musi istnieć jako zwykły artefakt, a identyfikator
 * „ksiezycowy-kamien" pokazany dziecku wprost wyglądałby na błąd.
 */
const NAZWY_FABULARNE: Record<string, string> = { 'ksiezycowy-kamien': 'Księżycowy Kamień' };

const nazwaArtefaktu = (id: string) =>
  artefaktPoId(id)?.nazwa ?? NAZWY_FABULARNE[id] ?? id.replace(/-/g, ' ');

/**
 * Cel misji słowami dziecka. `opisZwyciestwa` z kontraktu pokazuje
 * identyfikator artefaktu i surowca — tu idą nazwy z gry.
 */
function celMisji(m: Misja): string {
  const z = m.zwyciestwo;
  if (z.typ === 'zamki') return 'Zdobądź wszystkie zamki przeciwnika.';
  if (z.typ === 'artefakt') return `Odnajdź ${nazwaArtefaktu(z.artefakt)}.`;
  if (z.typ === 'zbierz') return `Zbierz ${z.ile} ${SUROWIEC_INFO[z.surowiec].dopelniacz}.`;
  return `Pokonaj: ${z.nazwa}.`;
}

/** Warunki porażki — każdy osobno, z liczbą tygodni, bo dziecko liczy w tygodniach gry. */
function porazkiMisji(m: Misja): { ikona: IconKey; tekst: string }[] {
  return m.porazka.map((w) =>
    w.typ === 'utrata'
      ? { ikona: ICON.skull, tekst: 'Przegrasz, jeśli stracisz wszystkie zamki.' }
      : {
          ikona: ICON.hourglass,
          tekst:
            w.dni % 7 === 0
              ? `Masz na to ${w.dni / 7} tygodni (${w.dni} dni).`
              : `Masz na to ${w.dni} dni.`,
        }
  );
}

/** Gwiazdki za wynik — liczby punktów dziecku nic nie mówią, trzy gwiazdki mówią wszystko. */
const gwiazdki = (pkt: number) => (pkt >= 700 ? 3 : pkt >= 400 ? 2 : 1);

const odmianaDni = (n: number) => (n === 1 ? 'dzień' : 'dni');

// ————————————————————————————————————————————————— scena

type StanZnacznika = 'zrobiona' | 'biezaca' | 'zamknieta';

interface Znacznik {
  misja: Misja;
  stan: StanZnacznika;
  x: number;
  y: number;
  kontener: Phaser.GameObjects.Container;
  obwodka: Phaser.GameObjects.Graphics;
}

interface Flaga {
  x: number;
  y: number;
  barwa: number;
  /** 0–1: jak wysoko wciągnięta. Nowo zdobyta misja wciąga ją na oczach gracza. */
  wzrost: number;
  faza: number;
}

type RodzajOdcinka = 'przebyty' | 'biezacy' | 'przyszly';

interface Odcinek {
  pkt: { x: number; y: number }[];
  /** Długość łamanej od początku do każdego punktu. */
  dl: number[];
  L: number;
  rodzaj: RodzajOdcinka;
  /** 0–1: jaka część jest narysowana. Poniżej 1 tylko w trakcie przejścia trenera. */
  odkryty: number;
}

interface KartaNagrody {
  kontener: Phaser.GameObjects.Container;
  tlo: Phaser.GameObjects.Graphics;
  pieczec: Phaser.GameObjects.Graphics;
  w: number;
  h: number;
  y0: number;
}

export class KampaniaScene extends Phaser.Scene {
  private postep: PostepKampanii | null = null;
  /** Misja pokazana na zwoju; `null` = zakończenie kampanii. */
  private pokazana: Misja | null = null;
  private bonus?: number;
  private znaczniki: Znacznik[] = [];
  private flagi: Flaga[] = [];
  private flagiG?: Phaser.GameObjects.Graphics;
  private odcinki: Odcinek[] = [];
  private drogaG?: Phaser.GameObjects.Graphics;
  private biezacyOdcinek = -1;
  private chmury: { img: Phaser.GameObjects.Image; v: number }[] = [];
  private tresc?: Phaser.GameObjects.Container;
  private karty: KartaNagrody[] = [];
  private podpowiedz?: Phaser.GameObjects.Text;
  private graj?: Tabliczka;
  private nakladka?: Phaser.GameObjects.Container;
  private trenerNaMapie?: Phaser.GameObjects.Image;
  /** Postacie scenek opowieści — przesuwane co klatkę; `false` = do usunięcia. */
  private ruchome: ((czas: number) => boolean)[] = [];

  constructor() {
    super('kampania');
  }

  preload() {
    wersjonujZasoby(this);
    const b = import.meta.env.BASE_URL;
    this.load.font('KampaniaSerif', `${b}fonty/Lora-Bold.ttf`, 'truetype');
    this.load.font('KampaniaTekst', `${b}fonty/Lora-Regular.ttf`, 'truetype');
    this.load.font('KampaniaKursywa', `${b}fonty/Lora-Italic.ttf`, 'truetype');
    for (const n of ['mapa', 'drewno']) this.load.image(`k-${n}`, `${b}kampania/${n}.jpg`);
    for (const n of [
      'woda-a',
      'woda-b',
      'zwoj',
      'janek',
      'ola',
      'glowa-janek',
      'glowa-ola',
      'rama-zlota',
      'rama-cienka',
      'pergamin',
      'cien',
      'tabliczka-drewno',
      'tabliczka-drewno-jasny',
      'tabliczka-drewno-wyl',
      'tabliczka-zloto',
      'tabliczka-zloto-jasny',
      'tabliczka-zloto-wyl',
    ])
      this.load.image(`k-${n}`, `${b}kampania/${n}.png`);
    this.load.json('k-mapa-json', `${b}kampania/mapa.json`);
    // Ilustracje wstępu i zakończenia: panoramy Groty i Boru z ekranu miasta.
    // Wstęp opowiada o Grocie nocą, zakończenie o powrocie do Boru — dokładnie
    // te dwa miejsca, więc nie ma powodu malować ich drugi raz.
    this.load.image('k-tlo-grota', `${b}miasto/tlo-grota.png`);
    this.load.image('k-tlo-bor', `${b}miasto/tlo-bor.png`);
    // Narrator opowieści — Drzewo Wiedzy, to samo, które dziecko spotyka na mapie.
    this.load.image('k-drzewo', `${b}mapa/drzewo-wiedzy.png`);
    // Srebrne płaszcze we wstępie: figurka przeciwnika z mapy przygody.
    this.load.spritesheet('k-wrog', `${b}mapa/wrog.png`, { frameWidth: 96, frameHeight: 96 });
    for (const s of Object.values(SUROWIEC_INFO)) this.load.image(`m-${s.ikona}`, `${b}mapa/${s.ikona}.png`);
    const bor = factionById('bor') ?? FACTIONS[0];
    for (const u of bor.units) this.load.image(`p-${u.sprite}`, `${b}sprites/${u.sprite}.png`);
  }

  create() {
    // Phaser używa tej samej instancji przy każdym `scene.start` — pola czyścimy tu.
    // Obiekty z poprzedniego przebiegu sceny są już zniszczone; odwołanie do
    // nich (np. `graj.ustaw` przy odświeżeniu nagród) wywraca scenę.
    this.znaczniki = [];
    this.flagi = [];
    this.odcinki = [];
    this.chmury = [];
    this.karty = [];
    this.bonus = undefined;
    this.nakladka = undefined;
    this.trenerNaMapie = undefined;
    this.biezacyOdcinek = -1;
    this.graj = undefined;
    this.podpowiedz = undefined;
    this.tresc = undefined;
    this.flagiG = undefined;
    this.drogaG = undefined;
    this.ruchome = [];

    sledzScene(this);
    buildIcons(this);
    buildArtefakty(this);
    this.zbudujTekstury();
    initSfx(this);
    this.doladujDzwiek();
    this.input.keyboard?.on('keydown-M', () => toggleSfx(this));

    this.postep = wczytajPostep();
    migawkaStanu('kampania', () => ({ postep: this.postep, pokazana: this.pokazana?.id, bonus: this.bonus }));

    this.add.image(0, 0, 'k-drewno').setOrigin(0).setDisplaySize(EKRAN_W, EKRAN_H);
    if (!this.postep) this.pokazWybor();
    else this.pokazKampanie();
    this.cameras.main.fadeIn(280, 20, 12, 6);
  }

  /**
   * Dźwięk dociągany PO starcie sceny. Podkład mapy waży 4 MB — w `preload`
   * trzymałby czarny ekran do końca pobierania, a ekran kampanii jest
   * pierwszym, który gracz widzi po menu.
   */
  private doladujDzwiek() {
    const b = import.meta.env.BASE_URL;
    for (const k of ['wejscie', 'zbior', 'awans', MUZYKA_MAPA.klucz])
      if (!this.cache.audio.exists(k)) this.load.audio(k, `${b}audio/${k}.wav`);
    this.load.once(Phaser.Loader.Events.COMPLETE, () => startMusic(this, MUZYKA_MAPA));
    this.load.start();
  }

  /** Tekstury rysowane: poświata, chmura, iskra. Raz na grę. */
  private zbudujTekstury() {
    // Figurki trenerów to pixel art — powiększane bez wygładzania, inaczej
    // każdy piksel rozlewa się w plamę.
    for (const k of ['k-janek', 'k-ola', 'k-glowa-janek', 'k-glowa-ola', 'k-wrog'])
      this.textures.get(k).setFilter(Phaser.Textures.FilterMode.NEAREST);
    if (!this.anims.exists('k-wrog-idzie'))
      this.anims.create({
        key: 'k-wrog-idzie',
        frames: this.anims.generateFrameNumbers('k-wrog', { start: 4, end: 7 }),
        frameRate: 6,
        repeat: -1,
      });
    if (!this.textures.exists('k-poswiata')) {
      // Poświata z prawdziwego gradientu promienistego. Koła o malejącej alfie
      // na dużej plamie dają widoczne pierścienie.
      const t = this.textures.createCanvas('k-poswiata', 256, 256);
      const ctx = t?.getContext();
      if (t && ctx) {
        const gr = ctx.createRadialGradient(128, 128, 0, 128, 128, 128);
        gr.addColorStop(0, 'rgba(255,255,255,1)');
        gr.addColorStop(0.35, 'rgba(255,255,255,0.55)');
        gr.addColorStop(0.7, 'rgba(255,255,255,0.16)');
        gr.addColorStop(1, 'rgba(255,255,255,0)');
        ctx.fillStyle = gr;
        ctx.fillRect(0, 0, 256, 256);
        t.refresh();
      }
    }
    if (!this.textures.exists('k-chmura')) {
      // Chmura z kilkudziesięciu bladych kół: każde z osobna prawie niewidoczne,
      // razem dają miękki brzeg, którego Graphics sam nie umie.
      const g = this.add.graphics();
      const rnd = new Phaser.Math.RandomDataGenerator(['chmura']);
      for (let i = 0; i < 70; i++) {
        const t = rnd.frac();
        const x = 40 + t * 140;
        const y = 58 - Math.sin(t * Math.PI) * 18 + rnd.between(-6, 6);
        const r = 14 + Math.sin(t * Math.PI) * 22 + rnd.between(-4, 4);
        g.fillStyle(0xffffff, 0.07);
        g.fillCircle(x, y, r);
      }
      g.generateTexture('k-chmura', 220, 100);
      g.destroy();
    }
    if (!this.textures.exists('k-iskra')) {
      const g = this.add.graphics();
      for (let i = 5; i >= 1; i--) {
        g.fillStyle(0xfff4c0, 0.12 * (6 - i));
        g.fillCircle(16, 16, i * 3);
      }
      g.fillStyle(0xffffff, 1);
      g.fillPoints(
        [0, 1, 2, 3, 4, 5, 6, 7].map((k) => {
          const a = (k * Math.PI) / 4;
          const r = k % 2 ? 2.2 : 14;
          return new Phaser.Math.Vector2(16 + Math.cos(a) * r, 16 + Math.sin(a) * r);
        }),
        true
      );
      g.generateTexture('k-iskra', 32, 32);
      g.destroy();
    }
  }

  update(czas: number, delta: number) {
    this.ruchome = this.ruchome.filter((f) => f(czas));
    this.rysujFlagi(czas);
    this.rysujKreski(czas);
    for (const c of this.chmury) {
      c.img.x += (c.v * delta) / 1000;
      if (c.img.x > MAPA.x + MAPA.w) c.img.x = MAPA.x - c.img.width * c.img.scaleX;
      this.przytnijDoMapy(c.img);
    }
  }

  /** Przycina obraz (zaczepiony w lewym górnym rogu) do prostokąta mapy. */
  private przytnijDoMapy(img: Phaser.GameObjects.Image) {
    const sx = img.scaleX;
    const sy = img.scaleY;
    const x0 = Math.max(0, (MAPA.x - img.x) / sx);
    const x1 = Math.min(img.width, (MAPA.x + MAPA.w - img.x) / sx);
    const y0 = Math.max(0, (MAPA.y - img.y) / sy);
    const y1 = Math.min(img.height, (MAPA.y + MAPA.h - img.y) / sy);
    if (x1 <= x0 || y1 <= y0) img.setVisible(false);
    else img.setVisible(true).setCrop(x0, y0, x1 - x0, y1 - y0);
  }

  // ═════════════════════════════════════════════════ materiał

  /** Dziewięć łatek w 2× — tekstury kitu mają podwójną rozdzielczość. */
  private latki(klucz: string, x: number, y: number, w: number, h: number, l: number, r: number, t: number, b: number) {
    return this.add
      .nineslice(x, y, klucz, undefined, w * 2, h * 2, l, r, t, b)
      .setOrigin(0)
      .setScale(0.5);
  }

  /**
   * Złocona rama WOKÓŁ prostokąta (x, y, w, h) — wewnętrzna warga ramy
   * zachodzi na treść o 2 px, żeby między złotem a obrazem nie było szpary.
   */
  private ramaZlota(x: number, y: number, w: number, h: number, gruba = true) {
    const g = gruba ? 13 : 5;
    return gruba
      ? this.latki('k-rama-zlota', x - g, y - g, w + g * 2, h + g * 2, 34, 34, 34, 34)
      : this.latki('k-rama-cienka', x - g, y - g, w + g * 2, h + g * 2, 16, 16, 16, 16);
  }

  /** Miękki cień rzucony przez panel na drewno. */
  private cien(x: number, y: number, w: number, h: number, moc = 0.8) {
    return this.latki('k-cien', x - 22, y - 16, w + 44, h + 48, 60, 60, 60, 60).setAlpha(moc);
  }

  /** Pergamin w cienkiej złotej ramie, z cieniem — każdy panel tekstu na tym ekranie. */
  private panelPergaminu(x: number, y: number, w: number, h: number) {
    const cien = this.cien(x, y, w, h);
    const papier = this.latki('k-pergamin', x, y, w, h, 48, 48, 48, 48);
    const rama = this.ramaZlota(x, y, w, h, false);
    return [cien, papier, rama];
  }

  /** Napis na drewnie (belka, tabliczki): kremowy z ciemnym konturem. */
  private napisNaDrewnie(x: number, y: number, tekst: string, rozmiar: number) {
    return this.add
      .text(x, y, tekst, {
        fontFamily: SERIF,
        fontSize: `${rozmiar}px`,
        color: KREM,
        stroke: BRAZ,
        strokeThickness: Math.max(3, rozmiar * 0.2),
      })
      .setShadow(0, 2, '#00000088', 3, true, true);
  }

  // ═════════════════════════════════════════════════ wybór trenera

  private pokazWybor() {
    napisTytulowy(this, EKRAN_W / 2, BELKA_Y, 'Kto wyruszy w drogę?', 28);
    const pod = this.add
      .text(EKRAN_W / 2, 96, 'Wybierz trenera. Poprowadzi twoje stworki przez całą kampanię.', {
        fontFamily: KURSYWA,
        fontSize: '18px',
        color: KREM,
        stroke: BRAZ,
        strokeThickness: 4,
      })
      .setOrigin(0.5);
    void pod;

    TRENERZY.forEach((t, i) => this.kartaTrenera(t, EKRAN_W / 2 + (i === 0 ? -170 : 170), 146));

    const menu = new Tabliczka(this, EKRAN_W - 66, BELKA_Y, 100, 36, 'Menu', false, 16, () => this.scene.start('menu'));
    menu.ustaw(true);
    this.input.keyboard?.on('keydown-ESC', () => this.scene.start('menu'));
    this.input.keyboard?.on('keydown-LEFT', () => this.wybierzTrenera(TRENERZY[0]));
    this.input.keyboard?.on('keydown-RIGHT', () => this.wybierzTrenera(TRENERZY[1]));
  }

  /**
   * Karta trenera: malowane okno z postacią w złotej ramie, pod nim pergamin
   * z imieniem. Heroes 2 w tym miejscu stawia dwa portrety w ramach — tu jest
   * to samo, tylko portret jest całą postacią, bo dziecko wybiera, KIM będzie
   * chodzić po mapie.
   */
  private kartaTrenera(t: Trener, cx: number, gora: number) {
    const w = 292;
    const oknoH = 318;
    const papierH = 118;
    const h = oknoH + 14 + papierH;
    const k = this.add.container(cx, gora);
    const x = -w / 2;

    const blask = this.add.image(0, h / 2, 'k-poswiata').setDisplaySize(w * 1.9, h * 1.5).setTint(C.gold).setAlpha(0);
    const cien = this.latki('k-cien', x - 22, -16, w + 44, h + 48, 60, 60, 60, 60).setAlpha(0.9);

    // Okno: wycinek ilustracji Boru, inny dla każdego trenera, z poświatą za postacią.
    const tlo = this.add.image(0, 0, 'k-tlo-bor');
    const skala = oknoH / tlo.height * 1.25;
    const cw = w / skala;
    const ch = oknoH / skala;
    const sx = Phaser.Math.Clamp(t.tloX * tlo.width - cw / 2, 0, tlo.width - cw);
    const sy = tlo.height - ch - 20;
    tlo.setOrigin(0).setScale(skala).setCrop(sx, sy, cw, ch).setPosition(x - sx * skala, -sy * skala);
    const swiatlo = this.add.image(0, oknoH * 0.5, 'k-poswiata').setDisplaySize(w * 1.1, oknoH).setTint(0xfff2c0).setAlpha(0.55);
    const ziemia = this.add.ellipse(0, oknoH - 26, 150, 26, 0x1a0e04, 0.45);

    // Figurka: pixel art powiększony całkowicie (×4), stopy na cieniu.
    const figurka = this.add.image(0, oknoH - 24, t.figurka).setOrigin(0.5, 1).setScale(4);

    const rama = this.latki('k-rama-zlota', x - 13, -13, w + 26, oknoH + 26, 34, 34, 34, 34);

    // Pergamin z imieniem i jednym zdaniem.
    const py = oknoH + 14;
    const papier = this.latki('k-pergamin', x, py, w, papierH, 48, 48, 48, 48);
    const ramaP = this.latki('k-rama-cienka', x - 5, py - 5, w + 10, papierH + 10, 16, 16, 16, 16);
    const imie = this.add
      .text(0, py + 30, t.imie, { fontFamily: SERIF, fontSize: '30px', color: ATRAMENT_CZERWONY })
      .setOrigin(0.5)
      .setShadow(0, 1, '#fff6dc', 0, false, true);
    const opis = this.add
      .text(0, py + 78, t.opis, {
        fontFamily: KURSYWA,
        fontSize: '16px',
        color: ATRAMENT,
        align: 'center',
        lineSpacing: 2,
      })
      .setOrigin(0.5);

    const strefa = this.add.zone(0, h / 2, w, h).setInteractive({ useHandCursor: true });
    k.add([blask, cien, tlo, swiatlo, ziemia, figurka, rama, papier, ramaP, imie, opis, strefa]);

    // Postać oddycha — stojąca nieruchomo wygląda jak wycinanka.
    this.tweens.add({
      targets: figurka,
      y: figurka.y - 3,
      duration: 700 + (t.imie === 'Ola' ? 120 : 0),
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
    });

    strefa.on('pointerover', () => {
      this.tweens.add({ targets: k, y: gora - 8, duration: 140, ease: 'Quad.easeOut' });
      this.tweens.add({ targets: blask, alpha: 0.55, duration: 160 });
      sfx(this, 'wejscie', 0.3);
    });
    strefa.on('pointerout', () => {
      this.tweens.add({ targets: k, y: gora, duration: 140, ease: 'Quad.easeOut' });
      this.tweens.add({ targets: blask, alpha: 0, duration: 160 });
    });
    strefa.on('pointerdown', () => this.wybierzTrenera(t, k));
  }

  private wybierzTrenera(t: Trener, karta?: Phaser.GameObjects.Container) {
    if (this.postep) return;
    this.postep = nowyPostep(t.imie);
    zapiszPostep(this.postep);
    sfx(this, 'awans', 0.8);
    if (karta) {
      this.tweens.add({ targets: karta, scale: 1.04, duration: 160, yoyo: true, ease: 'Back.easeOut' });
      this.iskry(karta.x, karta.y + 140, 14);
    }
    this.time.delayedCall(520, () =>
      this.pokazOpowiesc(
        { tlo: 'k-tlo-grota', naglowek: KAMPANIA.tytul, podtytul: 'Wstęp', akapity: KAMPANIA.wstep, przycisk: 'Dalej' },
        () => this.scene.restart()
      )
    );
  }

  // ═════════════════════════════════════════════════ opowieść (wstęp, zakończenie)

  /**
   * Opowieść: ilustracja w złotej ramie, narrator w medalionie i tekst na
   * pergaminie, akapit po akapicie. W Heroes 2 w tym miejscu jest filmik
   * z lektorem; u nas lektorem jest Drzewo Wiedzy z mapy przygody, a ruch
   * daje powolny najazd kamery na ilustrację.
   *
   * Pierwsze kliknięcie „Dalej" w trakcie pojawiania się tekstu odsłania go
   * całego zamiast zamykać — dziecko, które czyta szybciej, nie musi czekać,
   * a to, które kliknęło z rozpędu, nie gubi opowieści.
   */
  private pokazOpowiesc(
    o: { tlo: string; naglowek: string; podtytul: string; akapity: string[]; przycisk: string; odNowa?: boolean },
    poZamknieciu: () => void
  ) {
    this.nakladka?.destroy();
    const n = this.add.container(0, 0).setDepth(500);
    this.nakladka = n;
    const blok = this.add.zone(0, 0, EKRAN_W, EKRAN_H).setOrigin(0).setInteractive();
    n.add([blok, this.add.image(0, 0, 'k-drewno').setOrigin(0).setDisplaySize(EKRAN_W, EKRAN_H)]);

    n.add(napisTytulowy(this, EKRAN_W / 2, BELKA_Y, `${o.naglowek} · ${o.podtytul}`, 26));

    // Ilustracja przycięta do okna ramy; najazd kamery wewnątrz okna.
    const IL = { x: 44, y: 76, w: 872, h: 290 };
    n.add(this.cien(IL.x, IL.y, IL.w, IL.h));
    // Najazd kamery liczony przycięciem, nie maską: `GeometryMask` w Phaserze 4
    // działa tylko na płótnie 2D, w WebGL nic nie przycina i obraz wylewał się
    // na belkę. Przycięcie przeliczane przy każdym kroku trzyma obraz w oknie.
    const tlo = this.add.image(IL.x, IL.y, o.tlo).setOrigin(0);
    const tw = tlo.width;
    const th = tlo.height;
    const bazowa = Math.max(IL.w / tw, IL.h / th);
    const najazd = { z: 1 };
    const kadruj = () => {
      const s = bazowa * najazd.z;
      const cw = IL.w / s;
      const ch = IL.h / s;
      const cx = (tw - cw) / 2;
      const cy = (th - ch) * 0.55;
      tlo.setScale(s).setCrop(cx, cy, cw, ch).setPosition(IL.x - cx * s, IL.y - cy * s);
    };
    kadruj();
    n.add(tlo);
    this.tweens.add({ targets: najazd, z: 1.08, duration: 22000, ease: 'Sine.easeInOut', yoyo: true, repeat: -1, onUpdate: kadruj });
    for (const f of o.tlo === 'k-tlo-grota' ? this.scenkaWstepu(IL) : this.scenkaKonca(IL)) n.add(f);
    for (const p of this.pylki(22, o.tlo === 'k-tlo-grota' ? 0xbfe8ff : 0xfff2b0, IL)) n.add(p);
    n.add(this.ramaZlota(IL.x, IL.y, IL.w, IL.h));

    // Narrator: Drzewo Wiedzy w złotym medalionie, z tabliczką imienia.
    const NX = 124;
    const NY = 494;
    const med = this.add.graphics();
    med.fillStyle(0x0a0602, 0.45);
    med.fillCircle(NX + 2, NY + 6, 72);
    med.fillStyle(C.goldDeep, 1);
    med.fillCircle(NX, NY, 70);
    med.fillStyle(C.gold, 1);
    med.fillCircle(NX, NY - 1, 66);
    med.fillStyle(C.goldLight, 0.55);
    med.slice(NX, NY - 1, 64, Phaser.Math.DegToRad(200), Phaser.Math.DegToRad(340));
    med.fillPath();
    med.fillStyle(mix(C.goldDeep, 0x2a1606, 0.4), 1);
    med.fillCircle(NX, NY, 58);
    med.fillStyle(o.tlo === 'k-tlo-grota' ? 0x1d2a4a : 0x3d6b3a, 1);
    med.fillCircle(NX, NY, 55);
    const drzewo = this.add.image(NX, NY + 6, 'k-drzewo');
    drzewo.setScale(96 / drzewo.height);
    const ts = new Tabliczka(this, NX, NY + 88, 176, 34, 'Drzewo Wiedzy', false, 15, () => {});
    ts.ustaw(true, false);
    n.add([med, drzewo, ts.kontener]);

    // Pergamin z tekstem, z „dzióbkiem" w stronę narratora — to on mówi.
    const PX = 222;
    const PY = 392;
    const PW = 694;
    const PH = 222;
    n.add(this.panelPergaminu(PX, PY, PW, PH));
    const dziob = this.add.graphics();
    dziob.fillStyle(0xf3e3bd, 1);
    dziob.fillTriangle(PX + 2, NY - 16, PX + 2, NY + 16, PX - 24, NY);
    dziob.lineStyle(2, C.goldDeep, 1);
    dziob.beginPath();
    dziob.moveTo(PX, NY - 16);
    dziob.lineTo(PX - 24, NY);
    dziob.lineTo(PX, NY + 16);
    dziob.strokePath();
    n.add(dziob);

    let y = PY + 24;
    const teksty: Phaser.GameObjects.Text[] = [];
    o.akapity.forEach((a, i) => {
      const t = this.add
        .text(PX + 30, y, a, {
          fontFamily: i === 0 ? SERIF : TEKST,
          fontSize: '19px',
          color: ATRAMENT,
          wordWrap: { width: PW - 60 },
          lineSpacing: 5,
        })
        .setAlpha(0);
      y += t.height + 12;
      teksty.push(t);
      n.add(t);
    });
    const zapas = PY + PH - 18 - y;
    if (zapas > 0) for (const t of teksty) t.y += zapas / 2;

    for (const t of teksty) t.y += 8;
    const odslony = teksty.map((t, i) =>
      this.tweens.add({ targets: t, alpha: 1, y: t.y - 8, duration: 700, delay: 350 + i * 1100, ease: 'Sine.easeOut' })
    );

    const zamknij = (dalej: () => void) => {
      sfx(this, 'wejscie', 0.6);
      this.cameras.main.fadeOut(260, 20, 12, 6);
      this.cameras.main.once(Phaser.Cameras.Scene2D.Events.FADE_OUT_COMPLETE, () => {
        n.destroy();
        this.nakladka = undefined;
        this.cameras.main.fadeIn(260, 20, 12, 6);
        dalej();
      });
    };

    let odslonieta = false;
    const dalej = new Tabliczka(this, EKRAN_W - 132, EKRAN_H - 38, 190, 50, o.przycisk, true, 21, () => {
      if (!odslonieta && teksty.some((t) => t.alpha < 1)) {
        odslonieta = true;
        for (const tw of odslony) tw.complete();
        return;
      }
      zamknij(poZamknieciu);
    });
    dalej.ustaw(true);
    dalej.strzalka();
    n.add(dalej.kontener);
    if (o.odNowa) {
      const od = new Tabliczka(this, EKRAN_W - 360, EKRAN_H - 38, 200, 42, 'Zagraj od nowa', false, 16, () =>
        this.potwierdzNowa()
      );
      od.ustaw(true);
      n.add(od.kontener);
    }
    this.input.keyboard?.once('keydown-ENTER', () => dalej.kliknij());
  }

  /**
   * Wstęp to nie sama grota: przez ilustrację idą dwa srebrne płaszcze,
   * a za nimi, na smyczy z blasku, trzy stworki z pogranicza — dokładnie to,
   * o czym mówi tekst. Pusta panorama była tłem; z postaciami jest sceną.
   */
  private scenkaWstepu(IL: { x: number; y: number; w: number; h: number }) {
    const figury: Phaser.GameObjects.GameObject[] = [];
    const bor = factionById('bor') ?? FACTIONS[0];
    const ziemia = IL.y + IL.h - 34;
    const start = IL.x + IL.w - 40;
    const koniec = IL.x + 220;
    const CZAS = 26000;
    // Odstępy w pochodzie są odstępami w CZASIE, nie w miejscu: każdy rusza
    // z prawego brzegu ilustracji chwilę po poprzednim. Odstęp w miejscu
    // wypychał ostatnich poza ramę, na drewno.
    const idz = (obj: Phaser.GameObjects.Image | Phaser.GameObjects.Sprite, odstep: number, podskok: number) => {
      const cien = this.add.ellipse(start, ziemia + 2, obj.displayWidth * 0.7, 8, 0x05030a, 0.45);
      figury.push(cien, obj);
      // Ruch liczony z zegara sceny, nie tweenem: pochód ma zaczynać się
      // w pół drogi (kto otworzy wstęp, od razu widzi scenę, a nie pustą
      // grotę), a przewijanie tweenu z opóźnieniem (`seek`) gubiło pozycje.
      // Odstępy są odstępami w CZASIE — każdy rusza z prawego brzegu chwilę
      // po poprzednim, więc nikt nie wychodzi poza ramę na drewno.
      const faza = 0.42 - odstep / (start - koniec);
      this.ruchome.push((czas) => {
        if (!obj.active) return false;
        const u = (((czas / CZAS + faza) % 1) + 1) % 1;
        const x = start - u * (start - koniec);
        const a = Phaser.Math.Clamp(Math.min(u, 1 - u) * 8, 0, 1);
        obj.setPosition(x, ziemia - Math.abs(Math.sin(u * Math.PI * 60)) * podskok).setAlpha(a);
        cien.setPosition(x, ziemia + 2).setAlpha(a * 0.45);
        return true;
      });
    };
    for (const [i, odstep] of [0, 70].entries()) {
      const w = this.add.sprite(0, ziemia, 'k-wrog', 4).setOrigin(0.5, 1).setScale(1.25);
      w.play({ key: 'k-wrog-idzie', startFrame: i * 2 });
      idz(w, odstep, 0);
    }
    bor.units.slice(0, 3).forEach((u, i) => {
      const s = this.add.image(0, ziemia, `p-${u.sprite}`).setOrigin(0.5, 1);
      s.setScale(40 / s.height).setTint(0xc8d4ff);
      idz(s, 150 + i * 46, 5);
    });
    return figury;
  }

  /** Zakończenie: trener stoi na polanie, a stworki biegną z powrotem do lasu. */
  private scenkaKonca(IL: { x: number; y: number; w: number; h: number }) {
    const figury: Phaser.GameObjects.GameObject[] = [];
    const t = trenerPoImieniu(this.postep?.trener ?? 'Janek');
    const ziemia = IL.y + IL.h - 26;
    const tx = IL.x + 250;
    figury.push(this.add.ellipse(tx, ziemia, 60, 12, 0x1a0e04, 0.4));
    const tr = this.add.image(tx, ziemia, t.figurka).setOrigin(0.5, 1).setScale(2);
    figury.push(tr);
    this.tweens.add({ targets: tr, y: ziemia - 6, duration: 420, yoyo: true, repeat: -1, ease: 'Sine.easeOut' });
    const bor = factionById('bor') ?? FACTIONS[0];
    bor.units.forEach((u, i) => {
      const s = this.add.image(0, 0, `p-${u.sprite}`).setOrigin(0.5, 1);
      s.setScale(46 / s.height);
      const x0 = tx + 50;
      const x1 = IL.x + IL.w - 24;
      const faza = i / bor.units.length;
      const okres = 7000 + i * 700;
      const y0 = ziemia - (i % 2) * 14;
      figury.push(s);
      this.ruchome.push((czas) => {
        if (!s.active) return false;
        const u = (((czas / okres + faza) % 1) + 1) % 1;
        s.setPosition(x0 + u * (x1 - x0), y0 - Math.abs(Math.sin(u * Math.PI * (8 + i))) * 16);
        s.setAlpha(Phaser.Math.Clamp(Math.min((1 - u) * 6, u * 10), 0, 1));
        return true;
      });
    });
    return figury;
  }

  // ═════════════════════════════════════════════════ ekran kampanii

  private pokazKampanie() {
    const p = this.postep!;
    const biezaca = biezacaMisja(p);
    this.pokazana = biezaca ?? null;
    // Bonus zapamiętany przy starcie misji — po przegranej wraca się tu z tym
    // samym wyborem, zamiast klikać go drugi raz.
    if (biezaca && p.bonus !== undefined) this.bonus = p.bonus;

    this.rysujPasekGorny();
    this.rysujMape();
    this.rysujZwoj();
    this.odswiezTresc();
    this.rysujPas();
    this.rysujPrzyciski();
    this.klawisze();
    this.przejscie();
  }

  private rysujPasekGorny() {
    const p = this.postep!;
    napisTytulowy(this, 22, BELKA_Y, KAMPANIA.tytul, 26, 0);

    // Postęp w klejnotach osadzonych w belce: pełne za zrobione.
    const ile = KAMPANIA.misje.length;
    const zrobione = p.ukonczone.length;
    const kx = 296;
    const g = this.add.graphics();
    for (let i = 0; i < ile; i++) {
      const cx = kx + i * 24;
      const zrob = i < zrobione;
      const biez = i === zrobione;
      g.fillStyle(0x0a0602, 0.6);
      g.fillCircle(cx, BELKA_Y + 1.5, 10);
      g.fillStyle(C.goldDeep, 1);
      g.fillCircle(cx, BELKA_Y, 9.5);
      g.fillStyle(C.gold, 1);
      g.fillCircle(cx, BELKA_Y - 0.5, 8);
      g.fillStyle(zrob ? 0x3fae5a : biez ? 0x2d8fe0 : 0x3a2a1c, 1);
      g.fillCircle(cx, BELKA_Y, 6);
      g.fillStyle(0xffffff, zrob || biez ? 0.55 : 0.12);
      g.fillCircle(cx - 2, BELKA_Y - 2.5, 2.4);
    }
    this.napisNaDrewnie(kx + ile * 24 - 4, BELKA_Y, kampaniaUkonczona(p) ? 'Ukończona!' : `Misja ${zrobione + 1} z ${ile}`, 17).setOrigin(0, 0.5);

    // Prawa strona: trener, dni w drodze, wstęp.
    const dni = Object.values(p.wyniki).reduce((s, w) => s + w.dni, 0);
    const t = trenerPoImieniu(p.trener);
    const prawy = EKRAN_W - 16;
    const wstep = new Tabliczka(this, prawy - 48, BELKA_Y, 96, 34, 'Wstęp', false, 15, () => {
      sfx(this, 'wejscie', 0.6);
      this.pokazOpowiesc(
        { tlo: 'k-tlo-grota', naglowek: KAMPANIA.tytul, podtytul: 'Wstęp', akapity: KAMPANIA.wstep, przycisk: 'Zamknij' },
        () => {}
      );
    });
    wstep.ustaw(true);

    const dniTekst = this.napisNaDrewnie(prawy - 110, BELKA_Y, `Dni w drodze: ${dni}`, 16).setOrigin(1, 0.5);
    this.add.image(dniTekst.x - dniTekst.width - 12, BELKA_Y, ICON.hourglass).setDisplaySize(22, 22);

    const imie = this.napisNaDrewnie(dniTekst.x - dniTekst.width - 34, BELKA_Y, p.trener, 18).setOrigin(1, 0.5);
    const mx = imie.x - imie.width - 22;
    const medal = this.add.graphics();
    medal.fillStyle(0x0a0602, 0.55);
    medal.fillCircle(mx, BELKA_Y + 2, 19);
    medal.fillStyle(C.goldDeep, 1);
    medal.fillCircle(mx, BELKA_Y, 18);
    medal.fillStyle(C.gold, 1);
    medal.fillCircle(mx, BELKA_Y - 0.5, 16);
    medal.fillStyle(BARWA_TRENERA[p.trener] ?? C.foe, 1);
    medal.fillCircle(mx, BELKA_Y, 13);
    this.add.image(mx, BELKA_Y + 1, t.glowa).setOrigin(0.5, 0.5);
  }

  // ————————————————————————————————————————————————— mapa

  private rysujMape() {
    const p = this.postep!;
    this.cien(MAPA.x - 12, MAPA.y - 12, MAPA.w + 24, MAPA.h + 24, 1);
    this.add.image(MAPA.x, MAPA.y, 'k-mapa').setOrigin(0).setDisplaySize(MAPA.w, MAPA.h);

    // Woda: dwie fazy połysku przenikające się w przeciwnym rytmie. Każda
    // z osobna jest nieruchomym wzorem; ich suma „płynie".
    const wa = this.add.image(MAPA.x, MAPA.y, 'k-woda-a').setOrigin(0).setDisplaySize(MAPA.w, MAPA.h).setAlpha(0);
    const wb = this.add.image(MAPA.x, MAPA.y, 'k-woda-b').setOrigin(0).setDisplaySize(MAPA.w, MAPA.h).setAlpha(0.9);
    this.tweens.add({ targets: wa, alpha: 0.9, duration: 1700, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
    this.tweens.add({ targets: wb, alpha: 0, duration: 1700, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });

    this.rysujDroge();

    // Nad krainą płyną same CIENIE chmur. Białe chmury (runda pierwsza)
    // czytały się jako mleczna plama na mapie — cień daje ten sam ruch
    // powietrza i niczego nie zasłania.
    // Przycinane do mapy co klatkę (`przytnijDoMapy`) — maski WebGL tu nie ma.
    const rnd = new Phaser.Math.RandomDataGenerator(['chmury']);
    for (let i = 0; i < 3; i++) {
      const x = MAPA.x + rnd.between(-100, MAPA.w - 100);
      const y = MAPA.y + 30 + i * 130 + rnd.between(-20, 20);
      const s = rnd.realInRange(1.1, 1.6);
      const c = this.add.image(x, y, 'k-chmura').setOrigin(0).setScale(s, s * 0.7).setTint(0x0a1a10).setAlpha(0.2);
      this.chmury.push({ img: c, v: rnd.realInRange(5, 9) });
      this.przytnijDoMapy(c);
    }

    this.ramaZlota(MAPA.x, MAPA.y, MAPA.w, MAPA.h).setDepth(5);

    this.flagiG = this.add.graphics().setDepth(12);
    const biezaca = biezacaMisja(p);
    KAMPANIA.misje.forEach((m, i) => {
      const stan: StanZnacznika = p.ukonczone.includes(m.id) ? 'zrobiona' : m === biezaca ? 'biezaca' : 'zamknieta';
      this.znacznik(m, i, stan);
    });
    this.zaznaczZnacznik();

    if (!biezaca) this.swietowanie();
  }

  /** Punkt mapy (ułamki 0–1) na ekranie. */
  private naEkran(x: number, y: number) {
    return { x: MAPA.x + x * MAPA.w, y: MAPA.y + y * MAPA.h };
  }

  /**
   * Droga między misjami, po namalowanej ścieżce (punkty z `mapa.json`).
   *
   * Kreska przerywana jak na mapie skarbów, w trzech odmianach: przebyta —
   * biała z ciemną obwódką, bieżąca — złota i PŁYNĄCA w stronę celu,
   * przyszła — ciemne kropki. Pierwsza wersja miała ślady stóp; były urocze
   * z bliska, a z odległości ekranu czytały się jako rozsypane okruchy.
   * Płynąca kreska mówi „idź tędy" bez słowa.
   */
  private rysujDroge() {
    const p = this.postep!;
    const dane = this.cache.json.get('k-mapa-json') as { droga: number[][][] } | undefined;
    if (!dane) return;
    const zrobione = p.ukonczone.length;
    this.biezacyOdcinek = zrobione >= 1 && zrobione < KAMPANIA.misje.length ? zrobione - 1 : -1;
    this.drogaG = this.add.graphics().setDepth(8);
    this.odcinki = dane.droga.map((odcinek, oi) => {
      const pkt = odcinek.map(([x, y]) => this.naEkran(x, y));
      const dl = [0];
      for (let i = 1; i < pkt.length; i++)
        dl.push(dl[i - 1] + Phaser.Math.Distance.Between(pkt[i - 1].x, pkt[i - 1].y, pkt[i].x, pkt[i].y));
      const rodzaj: RodzajOdcinka = oi === this.biezacyOdcinek ? 'biezacy' : oi < zrobione ? 'przebyty' : 'przyszly';
      return { pkt, dl, L: dl[dl.length - 1], rodzaj, odkryty: 1 };
    });
  }

  /** Punkt na łamanej w odległości `d` od początku. */
  private punktNaOdcinku(o: Odcinek, d: number) {
    let i = 1;
    while (i < o.dl.length - 1 && o.dl[i] < d) i++;
    const a = o.pkt[i - 1];
    const b = o.pkt[i];
    const t = (d - o.dl[i - 1]) / Math.max(0.001, o.dl[i] - o.dl[i - 1]);
    return { x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t };
  }

  /** Rysuje całą drogę; woła się co klatkę, bo bieżący odcinek płynie. */
  private rysujKreski(czas: number) {
    const g = this.drogaG;
    if (!g) return;
    g.clear();
    // Kreska zaczyna się i kończy przed znacznikiem, żeby nie wchodzić pod medal.
    const OD = 24;
    const DO = 27;
    for (const o of this.odcinki) {
      const koniec = Math.min(o.L - DO, OD + (o.L - OD - DO) * o.odkryty);
      if (koniec <= OD) continue;
      const kreska = o.rodzaj === 'przyszly' ? 2 : 8;
      const przerwa = o.rodzaj === 'przyszly' ? 7 : 6;
      const okres = kreska + przerwa;
      const przes = o.rodzaj === 'biezacy' ? ((czas / 1000) * 16) % okres : 0;
      const kawalki: [number, number][] = [];
      for (let d = OD - okres + przes; d < koniec; d += okres) {
        const d0 = Math.max(OD, d);
        const d1 = Math.min(koniec, d + kreska);
        if (d1 > d0) kawalki.push([d0, d1]);
      }
      const warstwy: [number, number, number][] =
        o.rodzaj === 'przyszly'
          ? [[4.5, 0x1a1208, 0.5]]
          : o.rodzaj === 'biezacy'
            ? [
                [7, 0x3a2208, 0.85],
                [3.6, 0xffd34d, 1],
              ]
            : [
                [6.5, 0x2a1a08, 0.7],
                [3.2, 0xfffaf0, 1],
              ];
      for (const [grubosc, barwa, alfa] of warstwy) {
        g.lineStyle(grubosc, barwa, alfa);
        for (const [d0, d1] of kawalki) {
          // Kreska po łuku: dzielona na krótkie kawałki, żeby na zakręcie
          // szła za drogą, a nie cięła go na skos.
          const n = Math.max(1, Math.ceil((d1 - d0) / 3));
          const a0 = this.punktNaOdcinku(o, d0);
          g.beginPath();
          g.moveTo(a0.x, a0.y);
          for (let k = 1; k <= n; k++) {
            const q = this.punktNaOdcinku(o, d0 + ((d1 - d0) * k) / n);
            g.lineTo(q.x, q.y);
          }
          g.strokePath();
          if (o.rodzaj === 'przyszly') {
            g.fillStyle(barwa, alfa);
            g.fillCircle(a0.x, a0.y, grubosc / 2);
          }
        }
      }
    }
  }

  private znacznik(m: Misja, i: number, stan: StanZnacznika) {
    const { x, y } = this.naEkran(m.naMapie.x, m.naMapie.y);
    const k = this.add.container(x, y).setDepth(10 + i);
    const r = stan === 'biezaca' ? 21 : 18;

    if (stan === 'biezaca') {
      // Pulsujące kręgi — dwa, przesunięte w fazie, żeby puls był ciągły.
      for (const opoznienie of [0, 900]) {
        const krag = this.add.graphics();
        krag.fillStyle(C.gold, 0.55);
        krag.fillCircle(0, 0, r);
        krag.lineStyle(3, C.goldLight, 0.9);
        krag.strokeCircle(0, 0, r);
        k.add(krag);
        this.tweens.add({
          targets: krag,
          scale: { from: 1, to: 2.4 },
          alpha: { from: 0.9, to: 0 },
          duration: 1800,
          delay: opoznienie,
          repeat: -1,
          ease: 'Sine.easeOut',
        });
      }
    }

    const obwodka = this.add.graphics();
    k.add(obwodka);

    // Medalion: złoty odlew z emaliowanym środkiem — zielonym za zdobyte,
    // niebieskim za bieżącą, ciemnym żelazem za zamknięte.
    const g = this.add.graphics();
    g.fillStyle(0x0a0602, 0.45);
    g.fillEllipse(0, r * 0.9, r * 2.2, r * 0.8);
    const zloto = stan === 'zamknieta' ? 0x8d8478 : C.gold;
    const zlotoCiemne = stan === 'zamknieta' ? 0x4f473e : C.goldDeep;
    const srodek = stan === 'zrobiona' ? 0x3f9d57 : stan === 'biezaca' ? 0x2d8fe0 : 0x4a4038;
    g.fillStyle(mix(zlotoCiemne, 0x0a0602, 0.4), 1);
    g.fillCircle(0, 1.5, r + 2);
    g.fillStyle(zlotoCiemne, 1);
    g.fillCircle(0, 0, r + 1);
    g.fillStyle(zloto, 1);
    g.fillCircle(0, -0.5, r - 0.5);
    g.fillStyle(0xffffff, 0.35);
    g.slice(0, -0.5, r - 1, Phaser.Math.DegToRad(200), Phaser.Math.DegToRad(340));
    g.fillPath();
    g.fillStyle(mix(srodek, 0x0a0602, 0.45), 1);
    g.fillCircle(0, 0, r - 4.5);
    g.fillStyle(srodek, 1);
    g.fillCircle(0, 0.8, r - 5.5);
    g.fillStyle(0xffffff, 0.22);
    g.fillEllipse(0, -r * 0.32, r * 1.1, r * 0.55);
    k.add(g);

    const nr = this.add
      .text(0, 0, String(m.nr), {
        fontFamily: SERIF,
        fontSize: `${stan === 'biezaca' ? 21 : 18}px`,
        color: '#fff8e4',
        stroke: BRAZ,
        strokeThickness: 4,
      })
      .setOrigin(0.5);
    if (stan === 'zamknieta') nr.setAlpha(0.7);
    k.add(nr);

    // Plakietka w rogu: ptaszek za zrobioną, kłódka za zamkniętą.
    const b = this.add.graphics();
    const bx = r * 0.72;
    const by = -r * 0.72;
    if (stan === 'zrobiona') {
      b.fillStyle(0x0a0602, 0.5);
      b.fillCircle(bx, by + 1.5, 9);
      b.fillStyle(C.goldLight, 1);
      b.fillCircle(bx, by, 8.5);
      b.fillStyle(0x2f9e4f, 1);
      b.fillCircle(bx, by, 7);
      b.lineStyle(2.6, 0xffffff, 1);
      b.beginPath();
      b.moveTo(bx - 3.6, by + 0.2);
      b.lineTo(bx - 1, by + 3);
      b.lineTo(bx + 3.8, by - 2.8);
      b.strokePath();
    } else if (stan === 'zamknieta') {
      b.fillStyle(0x0a0602, 0.5);
      b.fillRoundedRect(bx - 6.5, by - 1, 13, 11, 2);
      b.lineStyle(2.4, 0xd8cdb8, 1);
      b.beginPath();
      b.arc(bx, by - 1.5, 4, Math.PI, 0);
      b.strokePath();
      b.fillStyle(0xd8cdb8, 1);
      b.fillRoundedRect(bx - 6, by - 2, 12, 10, 2);
      b.fillStyle(0x4f473e, 1);
      b.fillCircle(bx, by + 2.4, 1.8);
    }
    k.add(b);

    // Wstążka z nazwą: pergaminowy szyld z atramentem, jak podpis na mapie.
    const podpis = this.add
      .text(0, r + 16, m.tytul, {
        fontFamily: SERIF,
        fontSize: '12px',
        color: stan === 'zamknieta' ? '#6e5a44' : ATRAMENT,
      })
      .setOrigin(0.5);
    const ww = podpis.width + 18;
    const wst = this.add.graphics();
    wst.fillStyle(0x0a0602, 0.4);
    wst.fillRoundedRect(-ww / 2 + 1, r + 8, ww, 19, 4);
    wst.fillStyle(stan === 'biezaca' ? C.goldDeep : 0x6b4a26, 1);
    wst.fillRoundedRect(-ww / 2 - 1.5, r + 5.5, ww + 3, 22, 5);
    wst.fillStyle(stan === 'zamknieta' ? 0xd9c7a2 : 0xf3e2ba, 1);
    wst.fillRoundedRect(-ww / 2, r + 7, ww, 19, 4);
    wst.fillStyle(0xffffff, 0.25);
    wst.fillRect(-ww / 2 + 3, r + 8, ww - 6, 2);
    if (stan === 'zamknieta') wst.setAlpha(0.88);
    k.add([wst, podpis]);

    if (stan === 'biezaca') {
      // Strzałka nad bieżącą: podskakuje. Najprostszy znak „tu" dla dziecka.
      const s = this.add.graphics();
      s.fillStyle(0x0a0602, 0.6);
      s.fillTriangle(-11, -2, 11, -2, 0, 13);
      s.fillStyle(C.goldDeep, 1);
      s.fillTriangle(-10, -4, 10, -4, 0, 10);
      s.fillStyle(C.gold, 1);
      s.fillTriangle(-7, -3, 7, -3, 0, 7);
      s.fillStyle(C.goldDeep, 1);
      s.fillRect(-4, -16, 8, 13);
      s.fillStyle(C.gold, 1);
      s.fillRect(-2.5, -15, 5, 12);
      s.setY(-r - 26);
      k.add(s);
      this.tweens.add({ targets: s, y: -r - 18, duration: 520, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });

      // Trener stoi obok bieżącej misji.
      this.postawTrenera(x, y, r);
    }

    if (stan === 'zrobiona' && i === KAMPANIA.misje.length - 1) this.postawTrenera(x, y, r);

    if (stan === 'zrobiona') {
      const t = this.postep!.trener;
      this.flagi.push({ x: x + 4, y: y - r + 2, barwa: BARWA_TRENERA[t] ?? C.foe, wzrost: 1, faza: i * 1.7 });
    }

    // Klik i najechanie. Strefa pokrywa też wstążkę z nazwą.
    const strefa = this.add.zone(0, 8, 64, 72).setInteractive({ useHandCursor: true });
    k.add(strefa);
    strefa.on('pointerover', () => {
      this.tweens.add({ targets: k, scale: 1.1, duration: 120, ease: 'Quad.easeOut' });
    });
    strefa.on('pointerout', () => {
      this.tweens.add({ targets: k, scale: 1, duration: 120, ease: 'Quad.easeOut' });
    });
    strefa.on('pointerdown', () => {
      sfx(this, 'wejscie', 0.5);
      this.pokazMisje(m);
    });

    this.znaczniki.push({ misja: m, stan, x, y, kontener: k, obwodka });
  }

  /** Figurka trenera przy znaczniku — bieżącej misji albo ostatniej, gdy kampania skończona. */
  private postawTrenera(xZnacznika: number, yZnacznika: number, r: number) {
    // Trener staje po tej stronie znacznika, po której nie biegnie droga —
    // inaczej zasłania akurat tę kreskę, która mówi, dokąd iść.
    const strony = [-1, 1].map((k) => {
      const x = xZnacznika + k * (r + 16);
      const y = yZnacznika + 16;
      let min = Infinity;
      for (const o of this.odcinki)
        for (const q of o.pkt) min = Math.min(min, Phaser.Math.Distance.Between(x, y - 20, q.x, q.y));
      const brzeg = x < MAPA.x + 20 || x > MAPA.x + MAPA.w - 20 ? -1000 : 0;
      return { x, y, ocena: min + brzeg };
    });
    const { x, y } = strony[0].ocena >= strony[1].ocena ? strony[0] : strony[1];
    const t = trenerPoImieniu(this.postep!.trener);
    const cien = this.add.ellipse(x, y - 1, 26, 8, 0x0a0602, 0.45).setDepth(9);
    // Pixel art w skali 1: jeden piksel rysunku na piksel ekranu.
    const tr = this.add.image(x, y, t.figurka).setOrigin(0.5, 1).setDepth(9);
    this.trenerNaMapie = tr;
    tr.setData('cien', cien);
    this.tweens.add({ targets: tr, y: y - 2, duration: 700, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
  }

  /** Obwódka wokół znacznika misji pokazanej na zwoju. */
  private zaznaczZnacznik() {
    for (const z of this.znaczniki) {
      z.obwodka.clear();
      if (z.misja !== this.pokazana) continue;
      const r = z.stan === 'biezaca' ? 30 : 27;
      z.obwodka.lineStyle(5, 0x0a0602, 0.35);
      z.obwodka.strokeCircle(0, 1, r);
      z.obwodka.lineStyle(3, 0xffffff, 0.95);
      for (let i = 0; i < 12; i++) {
        const a0 = (i / 12) * Math.PI * 2;
        z.obwodka.beginPath();
        z.obwodka.arc(0, 0, r, a0, a0 + Math.PI / 12);
        z.obwodka.strokePath();
      }
      this.tweens.killTweensOf(z.obwodka);
      z.obwodka.setRotation(0);
      this.tweens.add({ targets: z.obwodka, rotation: Math.PI * 2, duration: 9000, repeat: -1 });
    }
  }

  /**
   * Chorągiewki nad zdobytymi misjami — rysowane co klatkę jako łamana
   * z falą sinusa. Sprite z animacją poklatkową machałby w rytm kilku klatek;
   * fala liczona z czasu jest płynna i każda flaga ma własną fazę.
   */
  private rysujFlagi(czas: number) {
    const g = this.flagiG;
    if (!g) return;
    g.clear();
    for (const f of this.flagi) {
      const maszt = 36 * f.wzrost;
      if (maszt <= 1) continue;
      const px = f.x + 13;
      const py = f.y;
      g.fillStyle(0x0a0602, 0.5);
      g.fillRect(px - 0.5, py - maszt, 3.5, maszt + 2);
      g.fillStyle(0x6b4a26, 1);
      g.fillRect(px - 1, py - maszt, 2.6, maszt + 1);
      g.fillStyle(C.gold, 1);
      g.fillCircle(px + 0.3, py - maszt - 1.5, 2.6);
      const dl = 27;
      const wys = 16;
      const gora: Phaser.Math.Vector2[] = [];
      const dol: Phaser.Math.Vector2[] = [];
      const t = czas / 1000;
      for (let i = 0; i <= 8; i++) {
        const u = i / 8;
        const fala = Math.sin(t * 5 + f.faza - u * 4.2) * 2.6 * u;
        gora.push(new Phaser.Math.Vector2(px + 1.5 + u * dl, py - maszt + 1 + fala));
        dol.push(new Phaser.Math.Vector2(px + 1.5 + u * dl, py - maszt + 1 + wys - u * 2 + fala));
      }
      const ksztalt = [...gora, ...dol.reverse()];
      g.fillStyle(0x0a0602, 0.35);
      g.fillPoints(ksztalt.map((v) => new Phaser.Math.Vector2(v.x + 1, v.y + 2)), true);
      g.fillStyle(f.barwa, 1);
      g.fillPoints(ksztalt, true);
      g.fillStyle(0xffffff, 0.25);
      g.fillPoints([...gora, ...gora.map((v) => new Phaser.Math.Vector2(v.x, v.y + 4)).reverse()], true);
      // Gwiazdka na płótnie — znak zdobycia.
      const sx = px + 1.5 + dl * 0.5;
      const sy = py - maszt + 1 + wys / 2 + Math.sin(t * 5 + f.faza - 2.1) * 1.3;
      g.fillStyle(0xffffff, 0.95);
      g.fillPoints(
        Array.from({ length: 10 }, (_, k) => {
          const a = -Math.PI / 2 + (k * Math.PI) / 5;
          const rr = k % 2 ? 2.1 : 5;
          return new Phaser.Math.Vector2(sx + Math.cos(a) * rr, sy + Math.sin(a) * rr);
        }),
        true
      );
    }
  }

  /**
   * Przejście po wygranej misji: trener idzie drogą z poprzedniej misji do
   * nowej, a na zdobytej wciąga się flaga. W Heroes 2 ten moment jest suchy —
   * nowy scenariusz po prostu świeci. Tu dziecko widzi, że krok w opowieści
   * się stał.
   *
   * Rejestr pamięta, ile misji było zrobionych przy ostatnim pokazaniu ekranu.
   * Po przeładowaniu strony go nie ma — wtedy nie animujemy, bo nie wiemy,
   * czy gracz już to widział.
   */
  private przejscie() {
    const p = this.postep!;
    const bylo = this.registry.get('kampania-widziane') as number | undefined;
    const jest = p.ukonczone.length;
    this.registry.set('kampania-widziane', jest);
    if (bylo === undefined || jest <= bylo || jest === 0) return;

    const odcinek = jest - 1;
    const flaga = this.flagi[this.flagi.length - 1];
    if (flaga) {
      flaga.wzrost = 0;
      this.tweens.add({ targets: flaga, wzrost: 1, duration: 900, delay: 300, ease: 'Back.easeOut' });
      this.time.delayedCall(700, () => sfx(this, 'zbior', 0.8));
    }
    const tr = this.trenerNaMapie;
    const odc = this.odcinki[odcinek];
    if (!tr || !odc) return;
    const trasa = odc.pkt;
    odc.odkryty = 0;
    const cienTr = tr.getData('cien') as Phaser.GameObjects.Ellipse | undefined;
    const cel = { x: tr.x, y: tr.y };
    this.tweens.killTweensOf(tr);
    const przes = { x: cel.x - trasa[trasa.length - 1].x, y: cel.y - trasa[trasa.length - 1].y };
    tr.setPosition(trasa[0].x + przes.x, trasa[0].y + przes.y);
    cienTr?.setPosition(tr.x, tr.y - 1);
    const sciezka = new Phaser.Curves.Spline(trasa.map((pt) => new Phaser.Math.Vector2(pt.x + przes.x, pt.y + przes.y)));
    const stan = { u: 0 };
    this.time.delayedCall(1100, () => {
      this.tweens.add({
        targets: stan,
        u: 1,
        duration: 2600,
        ease: 'Sine.easeInOut',
        onUpdate: () => {
          const pt = sciezka.getPoint(stan.u);
          tr.setFlipX(pt.x < tr.x);
          // Krok: podskok co kilka pikseli drogi, zamiast klatek chodu.
          const podskok = Math.abs(Math.sin(stan.u * Math.PI * 14)) * 3;
          tr.setPosition(pt.x, pt.y - podskok);
          cienTr?.setPosition(pt.x, pt.y - 1);
          odc.odkryty = stan.u;
        },
        onComplete: () => {
          tr.setFlipX(false).setPosition(cel.x, cel.y);
          odc.odkryty = 1;
          sfx(this, 'wejscie', 0.7);
          this.tweens.add({ targets: tr, y: cel.y - 2, duration: 700, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
        },
      });
    });
  }

  /** Iskry nad zdobytą krainą po zakończeniu kampanii. */
  private swietowanie() {
    const punkty = this.znaczniki.map((z) => ({ x: z.x, y: z.y - 30 }));
    this.time.addEvent({
      delay: 650,
      loop: true,
      callback: () => {
        const p = Phaser.Utils.Array.GetRandom(punkty);
        this.iskry(p.x + Phaser.Math.Between(-30, 30), p.y + Phaser.Math.Between(-20, 10), 7);
      },
    });
  }

  private iskry(x: number, y: number, ile: number) {
    for (let i = 0; i < ile; i++) {
      const a = (i / ile) * Math.PI * 2 + Math.random() * 0.5;
      const d = 26 + Math.random() * 30;
      const s = this.add
        .image(x, y, 'k-iskra')
        .setDepth(600)
        .setScale(0.4 + Math.random() * 0.5)
        .setTint(Phaser.Utils.Array.GetRandom([0xffffff, 0xffe27a, 0xffb3c8, 0xa8e6ff]));
      this.tweens.add({
        targets: s,
        x: x + Math.cos(a) * d,
        y: y + Math.sin(a) * d + 10,
        alpha: 0,
        scale: 0.1,
        angle: 180,
        duration: 900 + Math.random() * 400,
        ease: 'Quad.easeOut',
        onComplete: () => s.destroy(),
      });
    }
  }

  // ————————————————————————————————————————————————— zwój

  private rysujZwoj() {
    this.cien(ZWOJ.x + 8, ZWOJ.y + 18, ZWOJ.w - 16, ZWOJ.h - 26, 0.9);
    this.add.image(ZWOJ.x, ZWOJ.y, 'k-zwoj').setOrigin(0).setDisplaySize(ZWOJ.w, ZWOJ.h);
  }

  private pokazMisje(m: Misja) {
    if (this.pokazana === m) return;
    this.pokazana = m;
    this.zaznaczZnacznik();
    this.odswiezTresc();
  }

  /**
   * Treść zwoju — przebudowywana przy każdej zmianie pokazanej misji.
   *
   * Najpierw z winietą (powiększonym wycinkiem mapy z miejscem misji); gdy
   * z nią tekst nie mieści się na zwoju, drugi raz bez niej. Opisy misji mają
   * różną długość i przewidywanie wysokości tekstu z łamaniem wierszy byłoby
   * zgadywaniem — taniej zbudować i zmierzyć.
   */
  private odswiezTresc() {
    const doly = ZWOJ.y + ZWOJ.h - (this.pokazana && this.pokazana !== biezacaMisja(this.postep!) ? 84 : 34);
    if (this.zbudujTresc(true) > doly) this.zbudujTresc(false);
  }

  private zbudujTresc(zWinieta: boolean): number {
    this.tresc?.destroy();
    const p = this.postep!;
    const k = this.add.container(0, 0).setDepth(20);
    this.tresc = k;
    const lewy = ZWOJ.x + 34;
    const szer = ZWOJ.w - 68;
    const srodek = ZWOJ.x + ZWOJ.w / 2;
    let y = ZWOJ.y + 46;

    const akapit = (tekst: string, o: { rozmiar?: number; barwa?: string; kursywa?: boolean; wciecie?: number } = {}) => {
      const t = this.add.text(lewy + (o.wciecie ?? 0), y, tekst, {
        fontFamily: o.kursywa ? KURSYWA : TEKST,
        fontSize: `${o.rozmiar ?? 14.5}px`,
        color: o.barwa ?? ATRAMENT,
        wordWrap: { width: szer - (o.wciecie ?? 0) },
        lineSpacing: 3,
      });
      k.add(t);
      y += t.height;
      return t;
    };
    const ozdobnik = () => {
      const g = this.add.graphics();
      g.lineStyle(1.5, 0x9a6a38, 0.7);
      g.beginPath();
      g.moveTo(lewy + 10, y + 8);
      g.lineTo(srodek - 12, y + 8);
      g.moveTo(srodek + 12, y + 8);
      g.lineTo(lewy + szer - 10, y + 8);
      g.strokePath();
      g.fillStyle(0x9a6a38, 0.85);
      g.fillPoints(
        [
          new Phaser.Math.Vector2(srodek, y + 3),
          new Phaser.Math.Vector2(srodek + 6, y + 8),
          new Phaser.Math.Vector2(srodek, y + 13),
          new Phaser.Math.Vector2(srodek - 6, y + 8),
        ],
        true
      );
      k.add(g);
      y += 20;
    };
    /** Wstążka z lakowej czerwieni (albo zieleni/złota) z wciętymi końcami. */
    const wstazka = (tekst: string, barwa: number) => {
      const t = this.add
        .text(srodek, y + 12, tekst, { fontFamily: SERIF, fontSize: '13px', color: '#fff4dc' })
        .setOrigin(0.5)
        .setShadow(0, 1, '#00000088', 1, false, true);
      const w = t.width + 34;
      const g = this.add.graphics();
      const ciemna = mix(barwa, 0x0a0602, 0.4);
      for (const s of [-1, 1]) {
        const x0 = srodek + s * (w / 2 - 6);
        const x1 = srodek + s * (w / 2 + 12);
        g.fillStyle(ciemna, 1);
        g.fillPoints(
          [
            new Phaser.Math.Vector2(x0, y + 6),
            new Phaser.Math.Vector2(x1, y + 6),
            new Phaser.Math.Vector2(x1 - s * 6, y + 15),
            new Phaser.Math.Vector2(x1, y + 24),
            new Phaser.Math.Vector2(x0, y + 24),
          ],
          true
        );
      }
      g.fillStyle(0x0a0602, 0.25);
      g.fillRect(srodek - w / 2, y + 3, w, 24);
      g.fillStyle(barwa, 1);
      g.fillRect(srodek - w / 2, y, w, 24);
      g.fillStyle(0xffffff, 0.16);
      g.fillRect(srodek - w / 2, y + 2, w, 3);
      g.fillStyle(0x0a0602, 0.18);
      g.fillRect(srodek - w / 2, y + 19, w, 5);
      k.add([g, t]);
      y += 34;
    };
    /** Tytuł misji odręcznym atramentem — czerwonym, jak inicjał w kronice. */
    const tytul = (tekst: string) => {
      const t = this.add
        .text(srodek, y + 16, tekst, {
          fontFamily: SERIF,
          fontSize: tekst.length > 18 ? '22px' : '25px',
          color: ATRAMENT_CZERWONY,
        })
        .setOrigin(0.5)
        .setShadow(0, 1, '#fff6dc', 0, false, true);
      k.add(t);
      y += 40;
    };
    const winieta = (m: Misja) => {
      if (!zWinieta) return;
      y += 2;
      this.winieta(k, srodek, y, szer, 92, m);
      y += 102;
    };
    const wiersz = (ikona: IconKey, etykieta: string, tekst: string) => {
      const ik = this.add.image(lewy + 12, y + 10, ikona).setDisplaySize(24, 24);
      const e = this.add.text(lewy + 30, y, etykieta, { fontFamily: SERIF, fontSize: '14px', color: ATRAMENT_CZERWONY });
      k.add([ik, e]);
      y += e.height + 1;
      akapit(tekst, { wciecie: 30, rozmiar: 13.5 });
      y += 6;
    };

    const nr = (m: Misja) => `MISJA ${m.nr} Z ${KAMPANIA.misje.length}`;
    const m = this.pokazana;

    if (!m) {
      // Zakończenie kampanii.
      wstazka('KONIEC KAMPANII', 0xa8781c);
      tytul('Zwycięstwo!');
      ozdobnik();
      for (const a of KAMPANIA.zakonczenie) {
        akapit(a);
        y += 8;
      }
      ozdobnik();
      const dni = Object.values(p.wyniki).reduce((s, w) => s + w.dni, 0);
      const pkt = Object.values(p.wyniki).reduce((s, w) => s + w.punkty, 0);
      wiersz(ICON.hourglass, 'Cała wyprawa', `${dni} ${odmianaDni(dni)} w drodze`);
      wiersz(ICON.star, 'Wynik', `${pkt} punktów`);
      this.pieczec(k, ZWOJ.x + ZWOJ.w - 76, ZWOJ.y + ZWOJ.h - 92, 'BRAWO!');
      return y;
    }

    const stan: StanZnacznika = p.ukonczone.includes(m.id) ? 'zrobiona' : m === biezacaMisja(p) ? 'biezaca' : 'zamknieta';

    if (stan === 'zamknieta') {
      wstazka(nr(m), 0x6d5f50);
      tytul(m.tytul);
      ozdobnik();
      const poprzednia = KAMPANIA.misje[m.nr - 2];
      y += 20;
      const klodka = this.add.graphics();
      klodka.lineStyle(7, 0x8a6a48, 1);
      klodka.beginPath();
      klodka.arc(srodek, y + 30, 18, Math.PI, 0);
      klodka.strokePath();
      klodka.fillStyle(0x6b4a26, 1);
      klodka.fillRoundedRect(srodek - 28, y + 28, 56, 44, 8);
      klodka.fillStyle(0x9a6a38, 1);
      klodka.fillRoundedRect(srodek - 25, y + 30, 50, 18, 6);
      klodka.fillStyle(0x2a1a08, 1);
      klodka.fillCircle(srodek, y + 52, 5);
      klodka.fillRect(srodek - 2, y + 52, 4, 11);
      k.add(klodka);
      y += 92;
      const t = akapit('Ta misja jest jeszcze zamknięta.', { rozmiar: 16 });
      t.setFontFamily(SERIF);
      y += 6;
      if (poprzednia) akapit(`Najpierw ukończ misję ${poprzednia.nr}: „${poprzednia.tytul}".`);
      y += 10;
      akapit('Co tam czeka? Przekonasz się, gdy dojdziesz dalej!', { kursywa: true, barwa: ATRAMENT_MIEKKI });
      this.przyciskPowrotu(k);
      return y;
    }

    if (stan === 'zrobiona') {
      const w = p.wyniki[m.id];
      wstazka(`${nr(m)} · UKOŃCZONA`, 0x2f7a45);
      tytul(m.tytul);
      winieta(m);
      ozdobnik();
      for (const a of m.opis) {
        akapit(a, { rozmiar: 14, barwa: ATRAMENT_MIEKKI });
        y += 6;
      }
      ozdobnik();
      akapit(m.epilog, { kursywa: true });
      y += 12;
      if (w) {
        wiersz(ICON.hourglass, 'Czas', `${w.dni} ${odmianaDni(w.dni)}`);
        wiersz(ICON.star, 'Wynik', `${w.punkty} punktów`);
        this.gwiazdkiRzad(k, lewy + 30, y + 4, gwiazdki(w.punkty), 13);
        y += 26;
      }
      this.pieczec(k, ZWOJ.x + ZWOJ.w - 70, ZWOJ.y + 146, 'ZDOBYTE');
      this.przyciskPowrotu(k);
      return y;
    }

    // Bieżąca misja.
    wstazka(nr(m), 0x9c2f1d);
    tytul(m.tytul);
    winieta(m);
    ozdobnik();
    for (const a of m.opis) {
      akapit(a);
      y += 8;
    }
    ozdobnik();
    wiersz(ICON.star, 'Cel misji', celMisji(m));
    for (const w of porazkiMisji(m)) wiersz(w.ikona, w.ikona === ICON.skull ? 'Uważaj' : 'Czas', w.tekst);
    const plecak = p.bohater?.artefakty ?? [];
    if (plecak.length) wiersz(ICON.banner, `${p.trener} zabiera ze sobą`, plecak.map(nazwaArtefaktu).join(', ') + '.');
    return y;
  }

  /**
   * Winieta: miejsce misji z mapy krainy, powiększone i oprawione jak
   * miniatura w liście. Mapa pokazuje fort wielkości paznokcia — tu dziecko
   * widzi, DOKĄD idzie, zanim przeczyta, po co.
   */
  private winieta(k: Phaser.GameObjects.Container, cx: number, y: number, w: number, h: number, m: Misja) {
    const tex = this.textures.get('k-mapa').getSourceImage() as { width: number; height: number };
    const skala = 0.78;
    const cw = w / skala;
    const ch = h / skala;
    // Środek wycinka trochę nad znacznikiem — budowla misji stoi za nim.
    const sx = Phaser.Math.Clamp(m.naMapie.x * tex.width - cw / 2, 0, tex.width - cw);
    const sy = Phaser.Math.Clamp(m.naMapie.y * tex.height - ch * 0.78, 0, tex.height - ch);
    const x = cx - w / 2;
    const img = this.add
      .image(x - sx * skala, y - sy * skala, 'k-mapa')
      .setOrigin(0)
      .setScale(skala)
      .setCrop(sx, sy, cw, ch);
    const f = this.add.graphics();
    // Ciemna fuga od góry: obrazek leży POD ramką, nie na niej.
    for (let i = 0; i < 4; i++) {
      f.fillStyle(0x2a1a08, 0.12 * (4 - i));
      f.fillRect(x, y + i * 2, w, 2);
    }
    k.add([img, f, this.ramaZlota(x, y, w, h, false)]);
  }

  /** Link „wróć do bieżącej misji" na dole zwoju, gdy pokazana jest inna. */
  private przyciskPowrotu(k: Phaser.GameObjects.Container) {
    const cel = biezacaMisja(this.postep!) ?? null;
    const b = new Tabliczka(
      this,
      ZWOJ.x + ZWOJ.w / 2,
      ZWOJ.y + ZWOJ.h - 58,
      212,
      36,
      cel ? `Wróć do misji ${cel.nr}` : 'Wróć do zakończenia',
      false,
      15,
      () => {
        sfx(this, 'wejscie', 0.5);
        this.pokazana = cel;
        this.zaznaczZnacznik();
        this.odswiezTresc();
      }
    );
    b.ustaw(true);
    k.add(b.kontener);
  }

  /** Czerwona pieczęć lakowa — „zdobyte", jak stempel na liście z frontu. */
  private pieczec(k: Phaser.GameObjects.Container, x: number, y: number, napis: string) {
    const g = this.add.graphics();
    const rnd = new Phaser.Math.RandomDataGenerator([napis]);
    const pts: Phaser.Math.Vector2[] = [];
    for (let i = 0; i < 22; i++) {
      const a = (i / 22) * Math.PI * 2;
      const r = 34 + rnd.between(-3, 3);
      pts.push(new Phaser.Math.Vector2(Math.cos(a) * r, Math.sin(a) * r));
    }
    g.fillStyle(0x3a0a06, 0.35);
    g.fillPoints(pts.map((v) => new Phaser.Math.Vector2(v.x + 2, v.y + 3)), true);
    g.fillStyle(0xa3261b, 1);
    g.fillPoints(pts, true);
    g.fillStyle(0x7d1a12, 1);
    g.fillCircle(0, 0, 25);
    g.fillStyle(0xb8342a, 1);
    g.fillCircle(0, -1, 23);
    g.lineStyle(1.5, 0xe57a6a, 0.6);
    g.strokeCircle(0, 0, 19);
    g.fillStyle(0xffffff, 0.18);
    g.fillEllipse(-8, -12, 26, 12);
    const t = this.add.text(0, 0, napis, { fontFamily: SERIF, fontSize: '11px', color: '#ffe6d8' }).setOrigin(0.5);
    const kont = this.add.container(x, y, [g, t]).setAngle(-14);
    k.add(kont);
    kont.setScale(1.6).setAlpha(0);
    this.tweens.add({ targets: kont, scale: 1, alpha: 0.95, duration: 260, ease: 'Back.easeOut' });
  }

  private gwiazdkiRzad(k: Phaser.GameObjects.Container, x: number, y: number, ile: number, r: number) {
    for (let i = 0; i < 3; i++) {
      const s = this.add.image(x + r + i * (r * 2 + 4), y + r, ICON.star).setDisplaySize(r * 2.2, r * 2.2);
      if (i >= ile) s.setTint(0x6b5a48).setAlpha(0.45);
      k.add(s);
    }
  }

  // ————————————————————————————————————————————————— pas nagród

  private rysujPas() {
    this.panelPergaminu(PAS.x, PAS.y, PAS.w, PAS.h);
    const biezaca = biezacaMisja(this.postep!);
    if (!biezaca) {
      this.pasWynikow();
      return;
    }

    this.add.text(PAS.x + 20, PAS.y + 12, `Nagroda na start misji ${biezaca.nr}`, {
      fontFamily: SERIF,
      fontSize: '18px',
      color: ATRAMENT_CZERWONY,
    });
    this.podpowiedz = this.add
      .text(PAS.x + PAS.w - 20, PAS.y + 15, '', { fontFamily: KURSYWA, fontSize: '15px', color: ATRAMENT_CZERWONY })
      .setOrigin(1, 0);

    const kw = 184;
    const kh = 86;
    const odstep = (PAS.w - 36 - kw * 3) / 2;
    biezaca.bonusy.forEach((b, i) => this.kartaNagrody(b, i, PAS.x + 18 + i * (kw + odstep), PAS.y + 42, kw, kh));
    this.odswiezNagrody(false);
  }

  /**
   * Karta nagrody: medalion z obrazkiem, liczba na lakowym krążku, nazwa
   * atramentem. Bez podpisów kategorii i numerów klawiszy — dziecko wybiera
   * po obrazku i liczbie, a „SUROWCE" nad pokeballem nic mu nie mówiło.
   * Klawisze 1–3 dalej działają, tylko nie zaśmiecają karty.
   */
  private kartaNagrody(b: Bonus, i: number, x: number, y: number, w: number, h: number) {
    const k = this.add.container(x, y);
    const tlo = this.add.graphics();
    k.add(tlo);

    // Medalion: złoty pierścień, ciemne dno, obrazek w środku.
    const g = this.add.graphics();
    const mx = 42;
    const my = h / 2;
    g.fillStyle(0x0a0602, 0.35);
    g.fillCircle(mx + 1, my + 3, 34);
    g.fillStyle(C.goldDeep, 1);
    g.fillCircle(mx, my, 34);
    g.fillStyle(C.gold, 1);
    g.fillCircle(mx, my - 1, 31);
    g.fillStyle(C.goldLight, 0.5);
    g.slice(mx, my - 1, 30, Phaser.Math.DegToRad(200), Phaser.Math.DegToRad(340));
    g.fillPath();
    g.fillStyle(0x2a1a0c, 1);
    g.fillCircle(mx, my, 26);
    g.fillStyle(0x4a3220, 1);
    g.fillCircle(mx, my + 2, 24);
    k.add(g);
    const wyglad = this.wygladNagrody(b);
    const obraz = this.add.image(mx, my, wyglad.tekstura);
    const bok = wyglad.bok ?? 42;
    obraz.setScale(Math.min(bok / obraz.width, bok / obraz.height));
    k.add(obraz);
    if (wyglad.liczba) {
      const t = this.add.text(0, 0, wyglad.liczba, { fontFamily: SERIF, fontSize: '14px', color: '#fff4dc' }).setOrigin(0.5);
      const lw = Math.max(26, t.width + 12);
      const lg = this.add.graphics();
      lg.fillStyle(0x3a0a06, 0.4);
      lg.fillRoundedRect(mx + 30 - lw / 2 + 1, my + 16, lw, 22, 11);
      lg.fillStyle(0x7d1a12, 1);
      lg.fillRoundedRect(mx + 30 - lw / 2 - 1, my + 13, lw + 2, 24, 12);
      lg.fillStyle(0xb8342a, 1);
      lg.fillRoundedRect(mx + 30 - lw / 2, my + 14, lw, 21, 10.5);
      t.setPosition(mx + 30, my + 24.5);
      k.add([lg, t]);
    }

    const opis = this.add
      .text(86, h / 2, wyglad.nazwa, {
        fontFamily: SERIF,
        fontSize: '16px',
        color: ATRAMENT,
        wordWrap: { width: w - 100 },
        lineSpacing: 0,
      })
      .setOrigin(0, 0.5);
    const pieczec = this.add.graphics();
    k.add([opis, pieczec]);

    const strefa = this.add.zone(w / 2, h / 2, w, h).setInteractive({ useHandCursor: true });
    k.add(strefa);
    const karta: KartaNagrody = { kontener: k, tlo, pieczec, w, h, y0: y };
    strefa.on('pointerover', () => {
      if (this.bonus !== i) this.tweens.add({ targets: k, y: y - 3, duration: 100 });
    });
    strefa.on('pointerout', () => {
      if (this.bonus !== i) this.tweens.add({ targets: k, y, duration: 100 });
    });
    strefa.on('pointerdown', () => this.wybierzNagrode(i));
    this.karty.push(karta);
  }

  private wygladNagrody(b: Bonus): { tekstura: string; nazwa: string; liczba?: string; bok?: number } {
    if (b.typ === 'surowiec') {
      const s = SUROWIEC_INFO[b.surowiec];
      return { tekstura: `m-${s.ikona}`, nazwa: s.nazwa, liczba: `${b.ile}`, bok: 34 };
    }
    if (b.typ === 'artefakt') {
      const a = artefaktPoId(b.artefakt);
      return {
        tekstura: kluczArtefaktu(b.artefakt, a?.klasa ?? 'drobny'),
        nazwa: a?.nazwa ?? nazwaArtefaktu(b.artefakt),
        bok: 46,
      };
    }
    if (b.typ === 'oddzial') {
      const f = factionById('bor') ?? FACTIONS[0];
      const u = f.units[b.tier];
      return { tekstura: `p-${u?.sprite ?? f.units[0].sprite}`, nazwa: u?.name ?? b.opis, liczba: `×${b.ile}`, bok: 50 };
    }
    const atak = b.atak ?? 0;
    return {
      tekstura: atak ? ICON.sword : ICON.shield,
      nazwa: atak ? 'Silniejszy atak' : 'Mocniejsza obrona',
      liczba: `+${atak || b.obrona || 0}`,
      bok: 38,
    };
  }

  private wybierzNagrode(i: number) {
    if (!biezacaMisja(this.postep!) || this.nakladka) return;
    const zmiana = this.bonus !== i;
    this.bonus = i;
    if (zmiana) sfx(this, 'zbior', 0.6);
    this.odswiezNagrody(true);
  }

  private odswiezNagrody(animuj: boolean) {
    this.karty.forEach((kt, i) => {
      const { w, h } = kt;
      const wybrana = this.bonus === i;
      const inna = this.bonus !== undefined && !wybrana;
      const g = kt.tlo;
      g.clear();
      if (wybrana) {
        // Złota ramka z poświatą: wybrana karta jest „oprawiona".
        for (let j = 4; j >= 1; j--) {
          g.fillStyle(C.gold, 0.13);
          g.fillRoundedRect(-j * 3, -j * 3, w + j * 6, h + j * 6, 10 + j * 3);
        }
        g.fillStyle(C.goldDeep, 1);
        g.fillRoundedRect(-3, -3, w + 6, h + 6, 11);
        g.fillStyle(C.gold, 1);
        g.fillRoundedRect(-1.5, -1.5, w + 3, h + 3, 10);
        g.fillStyle(0xfbeecb, 1);
        g.fillRoundedRect(1.5, 1.5, w - 3, h - 3, 8);
      } else {
        // Wgłębienie w pergaminie: ciemniejsze dno, cień od górnej krawędzi.
        g.fillStyle(0x8a5a2b, 0.55);
        g.fillRoundedRect(0, 0, w, h, 9);
        g.fillStyle(0xe8d2a2, 1);
        g.fillRoundedRect(1.5, 1.5, w - 3, h - 3, 8);
        g.fillStyle(0x6b4a26, 0.14);
        g.fillRoundedRect(1.5, 1.5, w - 3, 7, { tl: 8, tr: 8, bl: 0, br: 0 });
        g.lineStyle(1, 0x8a5a2b, 0.45);
        g.strokeRoundedRect(5, 5, w - 10, h - 10, 6);
      }
      // Pieczęć wyboru: pusty okrąg atramentem albo czerwony lak z ptaszkiem.
      const p = kt.pieczec;
      p.clear();
      const rx = w - 16;
      const ry = 16;
      if (wybrana) {
        p.fillStyle(0x3a0a06, 0.4);
        p.fillCircle(rx + 1, ry + 2, 12);
        p.fillStyle(0xa3261b, 1);
        p.fillCircle(rx, ry, 12);
        p.fillStyle(0xb8342a, 1);
        p.fillCircle(rx, ry - 0.5, 9.5);
        p.lineStyle(3, 0xfff4dc, 1);
        p.beginPath();
        p.moveTo(rx - 5, ry);
        p.lineTo(rx - 1.5, ry + 4);
        p.lineTo(rx + 5.5, ry - 4);
        p.strokePath();
      } else {
        p.lineStyle(2, 0x8a5a2b, 0.8);
        p.strokeCircle(rx, ry, 9);
      }
      this.tweens.killTweensOf(kt.kontener);
      kt.kontener.setAlpha(inna ? 0.72 : 1);
      if (wybrana && animuj) {
        kt.kontener.setY(kt.y0 - 3);
        this.tweens.add({ targets: kt.kontener, scale: { from: 1.05, to: 1 }, duration: 220, ease: 'Back.easeOut' });
      } else {
        kt.kontener.setY(wybrana ? kt.y0 - 3 : kt.y0);
      }
    });

    if (this.podpowiedz) {
      this.tweens.killTweensOf(this.podpowiedz);
      if (this.bonus === undefined) {
        this.podpowiedz.setText('Wybierz jedną nagrodę').setColor(ATRAMENT_CZERWONY).setAlpha(1);
        this.tweens.add({ targets: this.podpowiedz, alpha: 0.4, duration: 650, yoyo: true, repeat: -1 });
      } else {
        this.podpowiedz.setAlpha(1).setText('Gotowe! Teraz naciśnij „Graj".').setColor('#2f6b3a');
      }
    }
    this.graj?.ustaw(this.bonus !== undefined);
  }

  /** Pas po zakończeniu kampanii: kronika wszystkich misji w jednym rzędzie. */
  private pasWynikow() {
    const p = this.postep!;
    this.add.text(PAS.x + 20, PAS.y + 12, 'Twoja kronika', { fontFamily: SERIF, fontSize: '18px', color: ATRAMENT_CZERWONY });
    const n = KAMPANIA.misje.length;
    const kw = (PAS.w - 36) / n;
    const g = this.add.graphics();
    KAMPANIA.misje.forEach((m, i) => {
      const x = PAS.x + 18 + i * kw;
      const y = PAS.y + 42;
      const w = p.wyniki[m.id];
      if (i > 0) {
        g.lineStyle(1.5, 0x8a5a2b, 0.5);
        g.lineBetween(x, y + 4, x, y + 82);
      }
      g.fillStyle(C.goldDeep, 1);
      g.fillCircle(x + 22, y + 14, 12);
      g.fillStyle(0x3f9d57, 1);
      g.fillCircle(x + 22, y + 14, 9.5);
      this.add
        .text(x + 22, y + 14, `${m.nr}`, { fontFamily: SERIF, fontSize: '13px', color: '#fff8e4' })
        .setOrigin(0.5);
      this.add.text(x + 40, y + 5, m.tytul, {
        fontFamily: SERIF,
        fontSize: '13px',
        color: ATRAMENT,
        wordWrap: { width: kw - 46 },
      });
      if (w) {
        this.add.text(x + 12, y + 44, `${w.dni} ${odmianaDni(w.dni)} · ${w.punkty} pkt`, {
          fontFamily: TEKST,
          fontSize: '13px',
          color: ATRAMENT_MIEKKI,
        });
        for (let s = 0; s < 3; s++) {
          const im = this.add.image(x + 22 + s * 24, y + 76, ICON.star).setDisplaySize(22, 22);
          if (s >= gwiazdki(w.punkty)) im.setTint(0x6b5a48).setAlpha(0.45);
        }
      }
    });
  }

  // ————————————————————————————————————————————————— przyciski

  private rysujPrzyciski() {
    const p = this.postep!;
    const menu = new Tabliczka(this, MENU.x, MENU.y, MENU.w, MENU.h, 'Menu', false, 18, () => {
      sfx(this, 'wejscie', 0.5);
      this.scene.start('menu');
    });
    menu.ustaw(true);

    if (kampaniaUkonczona(p)) {
      // Po kampanii jest jeden następny krok: posłuchać zakończenia. „Od nowa"
      // kasuje wyniki, więc mieszka dopiero w opowieści końcowej, pod pytaniem
      // — nie w miejscu, gdzie dziecko przez cztery misje klikało „Graj".
      const koniec = new Tabliczka(this, GRAJ.x, GRAJ.y, GRAJ.w, GRAJ.h, 'Zakończenie', true, 21, () => {
        sfx(this, 'wejscie', 0.6);
        this.pokazOpowiesc(
          {
            tlo: 'k-tlo-bor',
            naglowek: 'Zwycięstwo!',
            podtytul: 'Zakończenie',
            akapity: KAMPANIA.zakonczenie,
            przycisk: 'Zamknij',
            odNowa: true,
          },
          () => {}
        );
      });
      koniec.strzalka();
      koniec.ustaw(true);
      return;
    }

    this.graj = new Tabliczka(this, GRAJ.x, GRAJ.y, GRAJ.w, GRAJ.h, 'Graj', true, 26, () => this.start());
    this.graj.strzalka();
    this.graj.ustaw(this.bonus !== undefined);
  }

  private klawisze() {
    const kb = this.input.keyboard;
    if (!kb) return;
    kb.on('keydown-ONE', () => this.wybierzNagrode(0));
    kb.on('keydown-TWO', () => this.wybierzNagrode(1));
    kb.on('keydown-THREE', () => this.wybierzNagrode(2));
    kb.on('keydown-ENTER', () => {
      if (!this.nakladka && this.bonus !== undefined) this.start();
    });
    kb.on('keydown-ESC', () => {
      if (!this.nakladka) this.scene.start('menu');
    });
  }

  /** Start misji — jedyne miejsce, które zamienia wybór na tym ekranie w grę. */
  private start() {
    const p = this.postep;
    const m = p && biezacaMisja(p);
    if (!p || !m || this.bonus === undefined) return;
    const s = rozpocznijMisje(p, m, this.bonus);
    p.bonus = this.bonus;
    zapiszPostep(p);
    this.registry.set('stan-mapy', s);
    sfx(this, 'awans', 0.7);
    this.input.enabled = false;
    this.cameras.main.fadeOut(320, 20, 12, 6);
    this.cameras.main.once(Phaser.Cameras.Scene2D.Events.FADE_OUT_COMPLETE, () => {
      this.input.enabled = true;
      this.scene.start('adventure');
    });
  }

  private potwierdzNowa() {
    sfx(this, 'wejscie', 0.5);
    const n = this.add.container(0, 0).setDepth(700);
    const tlo = this.add.graphics();
    tlo.fillStyle(0x0a0602, 0.6);
    tlo.fillRect(0, 0, EKRAN_W, EKRAN_H);
    const blok = this.add.zone(0, 0, EKRAN_W, EKRAN_H).setOrigin(0).setInteractive();
    const w = 440;
    const h = 200;
    const x = (EKRAN_W - w) / 2;
    const y = (EKRAN_H - h) / 2;
    n.add([tlo, blok, ...this.panelPergaminu(x, y, w, h)]);
    const t1 = this.add
      .text(EKRAN_W / 2, y + 40, 'Zacząć od nowa?', { fontFamily: SERIF, fontSize: '26px', color: ATRAMENT_CZERWONY })
      .setOrigin(0.5);
    const t2 = this.add
      .text(EKRAN_W / 2, y + 90, 'Kampania zacznie się od pierwszej misji,\na twoje wyniki znikną.', {
        fontFamily: TEKST,
        fontSize: '17px',
        color: ATRAMENT,
        align: 'center',
      })
      .setOrigin(0.5);
    n.add([t1, t2]);
    // „Nie" jest złote — bezpieczny wybór wygląda jak główny.
    const tak = new Tabliczka(this, EKRAN_W / 2 - 96, y + h - 40, 170, 44, 'Tak, od nowa', false, 16, () => {
      usunPostep();
      this.registry.remove('kampania-widziane');
      this.scene.restart();
    });
    const nie = new Tabliczka(this, EKRAN_W / 2 + 96, y + h - 40, 150, 44, 'Nie', true, 18, () => n.destroy());
    tak.ustaw(true);
    nie.ustaw(true);
    n.add([tak.kontener, nie.kontener]);
  }

  // ————————————————————————————————————————————————— wspólne

  /** Pyłki unoszące się w powietrzu — świetliki nocą, pyłek w dzień — w obrębie prostokąta. */
  private pylki(ile: number, barwa: number, o: { x: number; y: number; w: number; h: number }) {
    const wynik: Phaser.GameObjects.Image[] = [];
    for (let i = 0; i < ile; i++) {
      // Tor lotu mieści się w prostokącie — bez maski nic by ich nie przycięło.
      const x = o.x + 40 + Phaser.Math.Between(0, o.w - 80);
      const y = o.y + Phaser.Math.Between(o.h * 0.5, o.h - 12);
      const s = this.add.image(x, y, 'k-iskra').setTint(barwa).setScale(Phaser.Math.FloatBetween(0.12, 0.3)).setAlpha(0);
      this.tweens.add({
        targets: s,
        y: y - Phaser.Math.Between(20, o.h * 0.4),
        x: x + Phaser.Math.Between(-30, 30),
        alpha: { from: 0, to: Phaser.Math.FloatBetween(0.5, 0.9) },
        duration: Phaser.Math.Between(3000, 6000),
        delay: Phaser.Math.Between(0, 4000),
        yoyo: true,
        repeat: -1,
        ease: 'Sine.easeInOut',
      });
      wynik.push(s);
    }
    return wynik;
  }
}

// ————————————————————————————————————————————————— elementy

/**
 * Tytuł na belce: Lora ze złotym gradientem i cienkim ciemnym konturem —
 * jak litery wycięte w drewnie i pozłocone. Gruby kontur i kapitaliki
 * z interfejsu bitwy (pierwsza runda) czytały się jak logo gry mobilnej.
 */
function napisTytulowy(scena: Phaser.Scene, x: number, y: number, tekst: string, rozmiar: number, ox = 0.5) {
  const t = scena.add
    .text(x, y, tekst, {
      fontFamily: SERIF,
      fontSize: `${rozmiar}px`,
      color: '#ffe9a8',
      stroke: BRAZ,
      strokeThickness: Math.max(3, rozmiar * 0.16),
    })
    .setOrigin(ox, 0.5)
    .setShadow(0, 3, '#000000aa', 4, true, true);
  gradientText(t, '#fff7d6', '#e0a53a');
  return t;
}

/**
 * Tabliczka przycisku: drewniana w złotej obwódce albo cała złota (przycisk
 * główny). Trzy stany to trzy tekstury z `tools/kampania_kit.py`
 * (zwykły, podświetlony, wyłączony), przełączane widocznością — przerysowanie
 * przy każdym najechaniu kursorem migałoby.
 */
class Tabliczka {
  readonly kontener: Phaser.GameObjects.Container;
  private wlaczony = true;
  private nad = false;
  private reaguje = true;
  private normal: Phaser.GameObjects.NineSlice;
  private jasny: Phaser.GameObjects.NineSlice;
  private wyl: Phaser.GameObjects.NineSlice;
  private napis: Phaser.GameObjects.Text;
  private grot?: Phaser.GameObjects.Graphics;
  private puls?: Phaser.Tweens.Tween;
  private scena: Phaser.Scene;
  private y: number;
  private zlota: boolean;
  private akcja: () => void;

  constructor(
    scena: Phaser.Scene,
    x: number,
    y: number,
    w: number,
    h: number,
    tekst: string,
    zlota: boolean,
    rozmiar: number,
    akcja: () => void
  ) {
    this.scena = scena;
    this.y = y;
    this.zlota = zlota;
    this.akcja = akcja;
    const rodzaj = zlota ? 'zloto' : 'drewno';
    const latka = (klucz: string) =>
      scena.add
        .nineslice(0, 0, klucz, undefined, w * 2, h * 2, 40, 40, 30, 30)
        .setScale(0.5)
        .setOrigin(0.5);
    const cien = scena.add.ellipse(0, h / 2 - 1, w * 0.92, 10, 0x0a0602, 0.45);
    this.normal = latka(`k-tabliczka-${rodzaj}`);
    this.jasny = latka(`k-tabliczka-${rodzaj}-jasny`);
    this.wyl = latka(`k-tabliczka-${rodzaj}-wyl`);
    this.napis = scena.add
      .text(0, 0, tekst, {
        fontFamily: SERIF,
        fontSize: `${rozmiar}px`,
        color: zlota ? '#3b1f08' : KREM,
        stroke: zlota ? '#fff0c0' : BRAZ,
        strokeThickness: zlota ? 0 : Math.max(3, rozmiar * 0.18),
      })
      .setOrigin(0.5);
    // Na złocie napis wybity: ciemna litera z jasnym odbiciem pod spodem.
    if (zlota) this.napis.setShadow(0, 1.5, '#fff3c8', 0, false, true);
    else this.napis.setShadow(0, 2, '#000000aa', 2, true, true);
    const strefa = scena.add.zone(0, 0, w, h).setInteractive({ useHandCursor: true });
    this.kontener = scena.add.container(x, y, [cien, this.normal, this.jasny, this.wyl, this.napis, strefa]).setDepth(30);

    strefa.on('pointerover', () => {
      if (!this.reaguje) return;
      this.nad = true;
      this.maluj();
      if (this.wlaczony) scena.tweens.add({ targets: this.kontener, y: this.y - 2, duration: 90 });
    });
    strefa.on('pointerout', () => {
      if (!this.reaguje) return;
      this.nad = false;
      this.maluj();
      scena.tweens.add({ targets: this.kontener, y: this.y, duration: 90 });
    });
    strefa.on('pointerdown', () => this.kliknij());
    this.maluj();
  }

  kliknij() {
    if (!this.wlaczony || !this.reaguje) return;
    this.scena.tweens.add({ targets: this.kontener, scaleX: 0.97, scaleY: 0.92, duration: 70, yoyo: true });
    this.akcja();
  }

  /** Grot w prawo za napisem — „dalej", „graj". */
  strzalka() {
    const g = this.scena.add.graphics();
    const x = this.napis.width / 2 + 14;
    const ciemny = this.zlota ? 0x3b1f08 : 0x2a1606;
    const jasny = this.zlota ? 0x6b3a10 : 0xf8e6b8;
    g.fillStyle(ciemny, 1);
    g.fillTriangle(x - 7, -10, x - 7, 10, x + 10, 0);
    g.fillStyle(jasny, 1);
    g.fillTriangle(x - 4.5, -6, x - 4.5, 6, x + 5.5, 0);
    this.napis.x -= 10;
    g.x = -10;
    this.grot = g;
    this.kontener.add(g);
    this.maluj();
  }

  /** `reaguje = false` robi z tabliczki szyld (np. imię narratora): bez kursora i klików. */
  ustaw(wlaczony: boolean, reaguje = true) {
    this.wlaczony = wlaczony;
    this.reaguje = reaguje;
    if (!reaguje) (this.kontener.list[this.kontener.list.length - 1] as Phaser.GameObjects.Zone).disableInteractive();
    this.maluj();
  }

  private maluj() {
    this.normal.setVisible(this.wlaczony && !this.nad);
    this.jasny.setVisible(this.wlaczony && this.nad);
    this.wyl.setVisible(!this.wlaczony);
    this.napis.setAlpha(this.wlaczony ? 1 : 0.5);
    this.grot?.setAlpha(this.wlaczony ? 1 : 0.35);
    // Włączony przycisk główny oddycha — zaprasza do kliknięcia, gdy wszystko
    // jest już wybrane. Wyłączony stoi, żeby nie kusił na próżno.
    if (this.wlaczony && this.grot && this.reaguje && !this.puls) {
      this.puls = this.scena.tweens.add({
        targets: this.kontener,
        scale: 1.035,
        duration: 700,
        yoyo: true,
        repeat: -1,
        ease: 'Sine.easeInOut',
      });
    } else if (!this.wlaczony && this.puls) {
      this.puls.stop();
      this.puls = undefined;
      this.kontener.setScale(1);
    }
  }
}
