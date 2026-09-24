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
import { C, FONT, H, display } from '../visual/theme';
import { gradientText, mix, plate } from '../visual/hud';
import { cienPod, faktura, listwa, naroznik, wneka } from '../visual/rama';
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
 *    jest narysowana śladami stóp. Dziecko widzi „gdzie byłem, gdzie jestem,
 *    dokąd idę" bez czytania.
 *  - Trener stoi przy bieżącej misji, a nad nią skacze strzałka. W Heroes 2
 *    bieżący scenariusz różni się od reszty tylko obwódką — dorosły to
 *    zauważy, dziecko niekoniecznie.
 *  - Nagrody są kartami z obrazkiem i liczbą, nie trzema ikonkami z podpisem
 *    pod spodem. „30 pokeballi" ma pokazywać pokeball i trzydziestkę.
 *
 * Czego świadomie nie robimy: nie pokazujemy opisów misji zamkniętych. Heroes 2
 * też ich nie zdradza, a dla dziecka „co tam będzie?" jest powodem, żeby grać
 * dalej.
 *
 * Trzy tryby jednej sceny: wybór trenera (brak postępu), opowieść (wstęp albo
 * zakończenie — nakładka) i sam ekran kampanii. Jedna scena, bo wszystkie trzy
 * dzielą grafiki i postęp, a przejście między nimi ma trwać ułamek sekundy,
 * bez ponownego wczytywania.
 */

// ————————————————————————————————————————————————— układ

const EKRAN_W = 960;
const EKRAN_H = 694;
/** Mapa krainy. Proporcje 4:3, tak jak plik (1232 × 924 — 2× tego, co na ekranie). */
const MAPA = { x: 14, y: 54, w: 616, h: 462 };
/** Zwój z opisem misji — prawa kolumna. */
const ZWOJ = { x: 642, y: 48, w: 308, h: 556 };
/** Pas nagród pod mapą. */
const PAS = { x: 14, y: 530, w: 616, h: 152 };
/** Środek przycisku „Graj" — prawa kolumna, pod zwojem. */
const GRAJ = { x: 846, y: 650, w: 200, h: 56 };
const MENU = { x: 694, y: 650, w: 96, h: 46 };

/** Atrament na pergaminie: ciemny brąz zamiast granatu z paneli bitwy. */
const ATRAMENT = '#4a2c12';
const ATRAMENT_MIEKKI = '#7a5530';
const ATRAMENT_CZERWONY = '#9c2f1d';

/** Barwa chorągiewki trenera: ta sama, co jego czapka. */
const BARWA_TRENERA: Record<string, number> = { Janek: 0xe4413c, Ola: 0x3fae5a };

interface Trener {
  imie: string;
  /** Klucz figurki na ekranie wyboru. */
  figurka: string;
  /** Klucz arkusza chodu na mapie. */
  arkusz: string;
  opis: string;
  /** Barwa tła karty — bez niej obie karty są jednakowe i wybór traci wagę. */
  barwa: number;
  barwaGleboka: number;
}

const TRENERZY: Trener[] = [
  {
    imie: 'Janek',
    figurka: 'k-janek',
    arkusz: 'bohater',
    opis: 'Odważny i szybki.\nZawsze pierwszy do przygody!',
    barwa: 0xd8573f,
    barwaGleboka: 0x8c2a1c,
  },
  {
    imie: 'Ola',
    figurka: 'k-ola',
    arkusz: 'k-bohaterka',
    opis: 'Sprytna i uważna.\nŻaden ślad jej nie umknie!',
    barwa: 0x2f9e86,
    barwaGleboka: 0x16574a,
  },
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
  radio: Phaser.GameObjects.Graphics;
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
  private graj?: PrzyciskDuzy;
  private nakladka?: Phaser.GameObjects.Container;
  private trenerNaMapie?: Phaser.GameObjects.Sprite;

  constructor() {
    super('kampania');
  }

  preload() {
    wersjonujZasoby(this);
    const b = import.meta.env.BASE_URL;
    this.load.image('k-mapa', `${b}kampania/mapa.jpg`);
    this.load.image('k-woda-a', `${b}kampania/woda-a.png`);
    this.load.image('k-woda-b', `${b}kampania/woda-b.png`);
    this.load.json('k-mapa-json', `${b}kampania/mapa.json`);
    this.load.image('k-zwoj', `${b}kampania/zwoj.png`);
    this.load.image('k-janek', `${b}kampania/janek.png`);
    this.load.image('k-ola', `${b}kampania/ola.png`);
    // Ilustracje wstępu i zakończenia: panoramy Groty i Boru z ekranu miasta.
    // Wstęp opowiada o Grocie nocą, zakończenie o powrocie do Boru — dokładnie
    // te dwa miejsca, więc nie ma powodu malować ich drugi raz.
    this.load.image('k-tlo-grota', `${b}miasto/tlo-grota.png`);
    this.load.image('k-tlo-bor', `${b}miasto/tlo-bor.png`);
    this.load.spritesheet('bohater', `${b}mapa/bohater.png`, { frameWidth: 96, frameHeight: 96 });
    this.load.spritesheet('k-bohaterka', `${b}mapa/bohaterka.png`, { frameWidth: 96, frameHeight: 96 });
    for (const s of Object.values(SUROWIEC_INFO)) this.load.image(`m-${s.ikona}`, `${b}mapa/${s.ikona}.png`);
    const bor = factionById('bor') ?? FACTIONS[0];
    for (const u of bor.units) this.load.image(`p-${u.sprite}`, `${b}sprites/${u.sprite}.png`);
  }

  create() {
    // Phaser używa tej samej instancji przy każdym `scene.start` — pola czyścimy tu.
    this.znaczniki = [];
    this.flagi = [];
    this.odcinki = [];
    this.drogaG = undefined;
    this.chmury = [];
    this.karty = [];
    this.bonus = undefined;
    this.nakladka = undefined;
    this.trenerNaMapie = undefined;
    this.biezacyOdcinek = -1;
    // Obiekty z poprzedniego przebiegu sceny są już zniszczone — odwołanie do
    // nich (np. `graj.ustaw` przy odświeżeniu nagród) wywraca scenę.
    this.graj = undefined;
    this.podpowiedz = undefined;
    this.tresc = undefined;
    this.flagiG = undefined;

    sledzScene(this);
    buildIcons(this);
    buildArtefakty(this);
    this.zbudujTekstury();
    initSfx(this);
    this.doladujDzwiek();
    this.input.keyboard?.on('keydown-M', () => toggleSfx(this));

    this.postep = wczytajPostep();
    migawkaStanu('kampania', () => ({ postep: this.postep, pokazana: this.pokazana?.id, bonus: this.bonus }));

    if (!this.postep) this.pokazWybor();
    else this.pokazKampanie();
    this.cameras.main.fadeIn(280, 13, 16, 35);
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
    if (!this.textures.exists('k-chmura')) {
      // Chmura z kilkudziesięciu bladych kół: każde z osobna prawie niewidoczne,
      // razem dają miękki brzeg, którego Graphics sam nie umie (nie ma rozmycia).
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
    if (!this.textures.exists('k-poswiata')) {
      // Poświata z prawdziwego gradientu promienistego. Koła o malejącej
      // alfie (tak rysuje się tu resztę blasków) na dużej plamie dają widoczne
      // pierścienie — przy 300 px średnicy każdy stopień to osobny prążek.
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
    for (const t of TRENERZY) {
      if (this.anims.exists(`k-chod-${t.imie}`)) continue;
      this.anims.create({
        key: `k-chod-${t.imie}`,
        frames: this.anims.generateFrameNumbers(t.arkusz, { start: 8, end: 11 }),
        frameRate: 8,
        repeat: -1,
      });
    }
  }

  update(czas: number, delta: number) {
    this.rysujFlagi(czas);
    for (const c of this.chmury) {
      c.img.x += (c.v * delta) / 1000;
      if (c.img.x - c.img.displayWidth / 2 > MAPA.x + MAPA.w) c.img.x = MAPA.x - c.img.displayWidth / 2;
    }
    this.rysujKreski(czas);
  }

  // ═════════════════════════════════════════════════ wybór trenera

  private pokazWybor() {
    this.tloIlustracji('k-tlo-bor', 0.42);
    this.pylki(40, 0xfff2b0);

    napisTytulowy(this, EKRAN_W / 2, 58, 'Kto wyruszy w drogę?', 34);
    this.add
      .text(EKRAN_W / 2, 104, 'Wybierz trenera. Poprowadzi twoje stworki przez całą kampanię.', {
        ...display(17),
        strokeThickness: 4,
      })
      .setOrigin(0.5);

    TRENERZY.forEach((t, i) => this.kartaTrenera(t, EKRAN_W / 2 + (i === 0 ? -172 : 172), 382));

    const menu = new PrzyciskDuzy(this, 84, 650, 120, 46, 'Menu', C.panelDeep, C.shadow, 17, () =>
      this.scene.start('menu')
    );
    menu.ustaw(true);
    this.input.keyboard?.on('keydown-ESC', () => this.scene.start('menu'));
  }

  private kartaTrenera(t: Trener, cx: number, cy: number) {
    const w = 300;
    const h = 430;
    const k = this.add.container(cx, cy);
    const g = this.add.graphics();
    const x = -w / 2;
    const y = -h / 2;

    // Poświata pod kartą: widoczna tylko przy najechaniu.
    const blask = this.add.graphics();
    for (let i = 6; i >= 1; i--) {
      blask.fillStyle(C.gold, 0.07);
      blask.fillRoundedRect(x - i * 5, y - i * 5, w + i * 10, h + i * 10, 22 + i * 5);
    }
    blask.setAlpha(0);

    cienPod(g, x, y, w, h, 22, 0.7);
    plate(g, x, y, w, h, 22, t.barwa, C.goldDeep, { edgeW: 4, drop: 0, light: 0.3, dark: 0.35, gloss: 0.12 });
    faktura(g, x + 4, y + 4, w - 8, h - 8, 0.05);

    // Okno z postacią: wnęka, a w niej światło zza pleców i cień pod stopami.
    const ox = x + 16;
    const oy = y + 16;
    const ow = w - 32;
    const oh = h - 128;
    wneka(g, ox, oy, ow, oh, 16, mix(t.barwaGleboka, C.shadow, 0.35), 1);
    g.fillStyle(C.shadow, 0.35);
    g.fillEllipse(0, oy + oh - 26, 150, 26);
    g.fillStyle(mix(t.barwa, C.goldLight, 0.4), 0.35);
    g.fillEllipse(0, oy + oh - 28, 120, 16);

    const swiatlo = this.add
      .image(0, oy + oh * 0.48, 'k-poswiata')
      .setDisplaySize(ow * 1.05, oh * 0.95)
      .setTint(mix(t.barwa, C.goldLight, 0.6))
      .setAlpha(0.55);
    // Stopy figurki na środku cienia: rysunki z modelu mają pod stopami pusty
    // margines różnej wysokości, więc poprawka jest per trener.
    const figurka = this.add.image(0, oy + oh - (t.imie === 'Janek' ? 16 : 22), t.figurka).setOrigin(0.5, 1);
    figurka.setScale(270 / figurka.height);

    // Tabliczka z imieniem.
    const ly = y + h - 104;
    g.fillStyle(C.shadow, 0.25);
    g.fillRoundedRect(x + 30, ly + 36, w - 60, 8, 4);
    listwa(g, x + 22, ly, w - 44, 42, 14, C.panelDeep, C.gold);
    const imie = napisTytulowy(this, 0, ly + 21, t.imie, 26);
    const opis = this.add
      .text(0, y + h - 38, t.opis, {
        fontFamily: FONT,
        fontSize: '15px',
        fontStyle: 'bold',
        color: '#ffffff',
        align: 'center',
        stroke: `#${t.barwaGleboka.toString(16).padStart(6, '0')}`,
        strokeThickness: 3,
        lineSpacing: 2,
      })
      .setOrigin(0.5);

    naroznik(g, x + 12, y + 12, 1, 1, 30);
    naroznik(g, x + w - 12, y + 12, -1, 1, 30);
    naroznik(g, x + 12, y + h - 12, 1, -1, 30);
    naroznik(g, x + w - 12, y + h - 12, -1, -1, 30);

    const strefa = this.add.zone(0, 0, w, h).setInteractive({ useHandCursor: true });
    k.add([blask, g, swiatlo, figurka, ...imie, opis, strefa]);

    // Figurka oddycha — stojąca nieruchomo wygląda jak wycinanka.
    this.tweens.add({
      targets: figurka,
      scaleY: figurka.scaleY * 1.015,
      duration: 1400 + (t.imie === 'Ola' ? 300 : 0),
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
    });

    strefa.on('pointerover', () => {
      this.tweens.add({ targets: k, y: cy - 10, duration: 140, ease: 'Quad.easeOut' });
      this.tweens.add({ targets: blask, alpha: 1, duration: 160 });
      this.tweens.add({ targets: figurka, y: figurka.y - 12, duration: 150, yoyo: true, ease: 'Quad.easeOut' });
      sfx(this, 'wejscie', 0.3);
    });
    strefa.on('pointerout', () => {
      this.tweens.add({ targets: k, y: cy, duration: 140, ease: 'Quad.easeOut' });
      this.tweens.add({ targets: blask, alpha: 0, duration: 160 });
    });
    strefa.on('pointerdown', () => this.wybierzTrenera(t, k));
  }

  private wybierzTrenera(t: Trener, karta: Phaser.GameObjects.Container) {
    if (this.postep) return;
    this.postep = nowyPostep(t.imie);
    zapiszPostep(this.postep);
    sfx(this, 'awans', 0.8);
    this.tweens.add({ targets: karta, scale: 1.06, duration: 160, yoyo: true, ease: 'Back.easeOut' });
    this.iskry(karta.x, karta.y - 60, 14);
    this.time.delayedCall(520, () =>
      this.pokazOpowiesc(
        {
          tlo: 'k-tlo-grota',
          naglowek: KAMPANIA.tytul,
          podtytul: 'Wstęp',
          akapity: KAMPANIA.wstep,
          przycisk: 'Dalej',
        },
        () => this.scene.restart()
      )
    );
  }

  // ═════════════════════════════════════════════════ opowieść (wstęp, zakończenie)

  /**
   * Opowieść na całym ekranie: ilustracja, tytuł i akapity pojawiające się po
   * kolei. W Heroes 2 w tym miejscu jest filmik; u nas ilustracja z powolnym
   * najazdem kamery, bo ruch robi z obrazka scenę, a nie tapetę.
   *
   * Pierwsze kliknięcie „Dalej" w trakcie pojawiania się tekstu odsłania go
   * całego zamiast zamykać — dziecko, które czyta szybciej, nie musi czekać,
   * a to, które kliknęło z rozpędu, nie gubi opowieści.
   */
  private pokazOpowiesc(
    o: { tlo: string; naglowek: string; podtytul: string; akapity: string[]; przycisk: string },
    poZamknieciu: () => void
  ) {
    this.nakladka?.destroy();
    const n = this.add.container(0, 0).setDepth(500);
    this.nakladka = n;
    const blok = this.add.zone(0, 0, EKRAN_W, EKRAN_H).setOrigin(0).setInteractive();
    n.add(blok);

    const tlo = this.add.image(EKRAN_W / 2, EKRAN_H / 2, o.tlo);
    const skala = Math.max(EKRAN_W / tlo.width, EKRAN_H / tlo.height);
    tlo.setScale(skala);
    n.add(tlo);
    this.tweens.add({ targets: tlo, scale: skala * 1.07, duration: 24000, ease: 'Sine.easeInOut', yoyo: true, repeat: -1 });

    const cien = this.add.graphics();
    for (let i = 0; i < 24; i++) {
      const t = i / 24;
      cien.fillStyle(0x07101c, 0.035 + t * t * 0.07);
      cien.fillRect(0, EKRAN_H * (0.3 + t * 0.7), EKRAN_W, EKRAN_H);
    }
    for (let i = 0; i < 12; i++) {
      cien.fillStyle(0x07101c, 0.045);
      cien.fillRect(0, 0, EKRAN_W, 150 - i * 11);
    }
    n.add(cien);
    for (const p of this.pylki(30, o.tlo === 'k-tlo-grota' ? 0xbfe8ff : 0xfff2b0)) n.add(p);

    n.add(napisTytulowy(this, EKRAN_W / 2, 52, o.naglowek, 38));
    n.add(
      this.add.text(EKRAN_W / 2, 98, o.podtytul.toUpperCase(), { ...display(15, H.goldLight), strokeThickness: 4 }).setOrigin(0.5)
    );

    // Pas tekstu: półprzezroczysta tafla ze złotym brzegiem.
    const px = 90;
    const py = 386;
    const pw = EKRAN_W - 180;
    const ph = 222;
    const panel = this.add.graphics();
    cienPod(panel, px, py, pw, ph, 18, 0.5);
    panel.fillStyle(0x0b1a2c, 0.72);
    panel.fillRoundedRect(px, py, pw, ph, 18);
    panel.lineStyle(2, C.gold, 0.8);
    panel.strokeRoundedRect(px, py, pw, ph, 18);
    panel.lineStyle(1, C.goldLight, 0.3);
    panel.strokeRoundedRect(px + 6, py + 6, pw - 12, ph - 12, 13);
    naroznik(panel, px + 10, py + 10, 1, 1, 26);
    naroznik(panel, px + pw - 10, py + 10, -1, 1, 26);
    naroznik(panel, px + 10, py + ph - 10, 1, -1, 26);
    naroznik(panel, px + pw - 10, py + ph - 10, -1, -1, 26);
    n.add(panel);

    let y = py + 26;
    const teksty: Phaser.GameObjects.Text[] = [];
    for (const a of o.akapity) {
      const t = this.add
        .text(EKRAN_W / 2, y, a, {
          fontFamily: FONT,
          fontSize: '21px',
          color: '#fff8e6',
          align: 'center',
          wordWrap: { width: pw - 90 },
          lineSpacing: 5,
          stroke: '#07101c',
          strokeThickness: 3,
        })
        .setOrigin(0.5, 0)
        .setAlpha(0);
      y += t.height + 14;
      teksty.push(t);
      n.add(t);
    }
    // Wyśrodkowanie bloku w pionie, gdy tekstu jest mniej niż miejsca.
    const zapas = py + ph - 18 - y;
    if (zapas > 0) for (const t of teksty) t.y += zapas / 2;

    const odslony = teksty.map((t, i) =>
      this.tweens.add({ targets: t, alpha: 1, y: t.y, duration: 700, delay: 350 + i * 1100, ease: 'Sine.easeOut' })
    );
    for (const t of teksty) t.y += 8;

    let odslonieta = false;
    const dalej = new PrzyciskDuzy(this, EKRAN_W - 160, EKRAN_H - 44, 190, 52, o.przycisk, C.gold, C.goldDeep, 21, () => {
      if (!odslonieta && teksty.some((t) => t.alpha < 1)) {
        odslonieta = true;
        for (const tw of odslony) tw.complete();
        return;
      }
      sfx(this, 'wejscie', 0.6);
      this.cameras.main.fadeOut(260, 13, 16, 35);
      this.cameras.main.once(Phaser.Cameras.Scene2D.Events.FADE_OUT_COMPLETE, () => {
        n.destroy();
        this.nakladka = undefined;
        this.cameras.main.fadeIn(260, 13, 16, 35);
        poZamknieciu();
      });
    });
    dalej.ustaw(true);
    dalej.strzalka();
    n.add(dalej.kontener);
    this.input.keyboard?.once('keydown-ENTER', () => dalej.kliknij());
  }

  // ═════════════════════════════════════════════════ ekran kampanii

  private pokazKampanie() {
    const p = this.postep!;
    const biezaca = biezacaMisja(p);
    this.pokazana = biezaca ?? null;
    // Bonus zapamiętany przy starcie misji — po przegranej wraca się tu z tym
    // samym wyborem, zamiast klikać go drugi raz.
    if (biezaca && p.bonus !== undefined) this.bonus = p.bonus;

    this.rysujTlo();
    this.rysujPasekGorny();
    this.rysujMape();
    this.rysujZwoj();
    this.odswiezTresc();
    this.rysujPas();
    this.rysujPrzyciski();
    this.klawisze();
    this.przejscie();
  }

  private rysujTlo() {
    const g = this.add.graphics();
    g.fillGradientStyle(C.skyTop, C.skyTop, C.skyBottom, C.skyBottom, 1);
    g.fillRect(0, 0, EKRAN_W, EKRAN_H);
    // Ciemniejsza dolna połowa i poświata za mapą — kadr prowadzi wzrok do mapy.
    g.fillStyle(C.shadow, 0.16);
    g.fillRect(0, EKRAN_H - 150, EKRAN_W, 150);
    faktura(g, 0, 0, EKRAN_W, EKRAN_H, 0.03);
    this.add
      .image(MAPA.x + MAPA.w / 2, MAPA.y + MAPA.h / 2, 'k-poswiata')
      .setDisplaySize(MAPA.w * 1.9, MAPA.h * 1.9)
      .setAlpha(0.35);
  }

  private rysujPasekGorny() {
    const p = this.postep!;
    napisTytulowy(this, 18, 25, KAMPANIA.tytul.toUpperCase(), 23, 0, 0.5);

    // Postęp w kropkach: tyle, ile misji, pełne za zrobione.
    const ile = KAMPANIA.misje.length;
    const zrobione = p.ukonczone.length;
    const kx = 318;
    const g = this.add.graphics();
    plate(g, kx - 12, 12, ile * 26 + 16, 26, 13, mix(C.panelDeep, C.shadow, 0.3), C.shadow, { drop: 2, gloss: 0.1 });
    for (let i = 0; i < ile; i++) {
      const cx = kx + 5 + i * 26;
      const zrob = i < zrobione;
      const biez = i === zrobione;
      g.fillStyle(C.shadow, 0.5);
      g.fillCircle(cx, 26, 9);
      g.fillStyle(zrob ? C.gold : biez ? C.ally : 0x5c6b78, 1);
      g.fillCircle(cx, 25, 7.5);
      g.fillStyle(0xffffff, zrob || biez ? 0.45 : 0.15);
      g.fillCircle(cx - 2, 22.5, 3);
    }
    this.add
      .text(kx + ile * 26 + 12, 25, kampaniaUkonczona(p) ? 'Ukończona!' : `Misja ${zrobione + 1} z ${ile}`, {
        ...display(15),
        strokeThickness: 3.5,
      })
      .setOrigin(0, 0.5);

    // Prawa strona: trener, dni w drodze, wstęp.
    const dni = Object.values(p.wyniki).reduce((s, w) => s + w.dni, 0);
    const t = trenerPoImieniu(p.trener);
    const prawy = EKRAN_W - 12;
    const wstep = new PrzyciskDuzy(this, prawy - 52, 25, 104, 32, 'Wstęp', C.panelDeep, C.shadow, 15, () => {
      sfx(this, 'wejscie', 0.6);
      this.pokazOpowiesc(
        { tlo: 'k-tlo-grota', naglowek: KAMPANIA.tytul, podtytul: 'Wstęp', akapity: KAMPANIA.wstep, przycisk: 'Zamknij' },
        () => {}
      );
    });
    wstep.ustaw(true);

    const dniTekst = this.add
      .text(prawy - 118, 25, `Dni w drodze: ${dni}`, { ...display(15), strokeThickness: 3.5 })
      .setOrigin(1, 0.5);
    this.add.image(dniTekst.x - dniTekst.width - 14, 25, ICON.hourglass).setDisplaySize(22, 22);

    const imieX = dniTekst.x - dniTekst.width - 42;
    const imie = this.add.text(imieX, 25, p.trener, { ...display(17, H.goldLight), strokeThickness: 4 }).setOrigin(1, 0.5);
    const mx = imie.x - imie.width - 22;
    const medal = this.add.graphics();
    medal.fillStyle(C.shadow, 0.5);
    medal.fillCircle(mx, 27, 19);
    medal.fillStyle(C.goldDeep, 1);
    medal.fillCircle(mx, 25, 18);
    medal.fillStyle(C.gold, 1);
    medal.fillCircle(mx, 25, 16);
    medal.fillStyle(t.barwa, 1);
    medal.fillCircle(mx, 25, 13.5);
    // Twarz trenera z pierwszej klatki arkusza — głowa siedzi w górnej ćwiartce.
    const twarz = this.add.image(mx, 25, t.arkusz, 0).setCrop(24, 4, 48, 44).setOrigin(0.5, 0.26).setScale(0.62);
    void twarz;
  }

  // ————————————————————————————————————————————————— mapa

  private rysujMape() {
    const p = this.postep!;
    const g = this.add.graphics();
    const r = 18;
    // Rama: cień, grube złocone obramowanie, ciemna fuga wokół obrazu.
    cienPod(g, MAPA.x - 8, MAPA.y - 8, MAPA.w + 16, MAPA.h + 16, r, 0.7);
    plate(g, MAPA.x - 8, MAPA.y - 8, MAPA.w + 16, MAPA.h + 16, r, C.goldDeep, mix(C.goldDeep, C.shadow, 0.5), {
      edgeW: 2,
      drop: 0,
      light: 0.45,
      dark: 0.35,
      gloss: 0.18,
    });
    g.fillStyle(mix(C.shadow, C.goldDeep, 0.2), 1);
    g.fillRect(MAPA.x - 2, MAPA.y - 2, MAPA.w + 4, MAPA.h + 4);

    this.add.image(MAPA.x, MAPA.y, 'k-mapa').setOrigin(0).setDisplaySize(MAPA.w, MAPA.h);

    // Woda: dwie fazy połysku przenikające się w przeciwnym rytmie. Każda
    // z osobna jest nieruchomym wzorem; ich suma „płynie".
    const wa = this.add.image(MAPA.x, MAPA.y, 'k-woda-a').setOrigin(0).setDisplaySize(MAPA.w, MAPA.h).setAlpha(0);
    const wb = this.add.image(MAPA.x, MAPA.y, 'k-woda-b').setOrigin(0).setDisplaySize(MAPA.w, MAPA.h).setAlpha(0.9);
    this.tweens.add({ targets: wa, alpha: 0.9, duration: 1700, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
    this.tweens.add({ targets: wb, alpha: 0, duration: 1700, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });

    this.rysujDroge();

    // Chmury i ich cienie — płyną nad całą krainą, przycięte do ramy.
    const maskaG = this.make.graphics({}, false);
    maskaG.fillStyle(0xffffff, 1);
    maskaG.fillRect(MAPA.x, MAPA.y, MAPA.w, MAPA.h);
    const maska = maskaG.createGeometryMask();
    const rnd = new Phaser.Math.RandomDataGenerator(['chmury']);
    for (let i = 0; i < 4; i++) {
      const x = MAPA.x + rnd.between(0, MAPA.w);
      const y = MAPA.y + 40 + i * 105 + rnd.between(-20, 20);
      const s = rnd.realInRange(0.7, 1.1);
      // Chmury są przezroczyste do połowy: mają dodać powietrza, a nie
      // zasłaniać krainy — pierwsza wersja (alfa 0,75) chowała twierdze wroga.
      const cienC = this.add.image(x - 30, y + 46, 'k-chmura').setScale(s, s * 0.8).setTint(0x0a2230).setAlpha(0.12);
      const ch = this.add.image(x, y, 'k-chmura').setScale(s).setAlpha(0.42);
      cienC.setMask(maska);
      ch.setMask(maska);
      const v = rnd.realInRange(5, 9);
      this.chmury.push({ img: ch, v }, { img: cienC, v });
    }

    // Wewnętrzna fazka ramy nad obrazem (i nad chmurami): ciemna linia od góry,
    // jasna od dołu — obraz jest WPUSZCZONY w ramę, nie przyklejony na nią.
    const f = this.add.graphics().setDepth(5);
    f.lineStyle(3, C.shadow, 0.55);
    f.strokeRect(MAPA.x - 1.5, MAPA.y - 1.5, MAPA.w + 3, MAPA.h + 3);
    f.lineStyle(1.5, C.goldLight, 0.7);
    f.strokeRect(MAPA.x - 4.5, MAPA.y - 4.5, MAPA.w + 9, MAPA.h + 9);
    naroznik(f, MAPA.x - 1, MAPA.y - 1, 1, 1, 40);
    naroznik(f, MAPA.x + MAPA.w + 1, MAPA.y - 1, -1, 1, 40);
    naroznik(f, MAPA.x - 1, MAPA.y + MAPA.h + 1, 1, -1, 40);
    naroznik(f, MAPA.x + MAPA.w + 1, MAPA.y + MAPA.h + 1, -1, -1, 40);

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
      const rodzaj: RodzajOdcinka =
        oi === this.biezacyOdcinek ? 'biezacy' : oi < zrobione ? 'przebyty' : 'przyszly';
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
      const przes = o.rodzaj === 'biezacy' ? (czas / 1000) * 16 % okres : 0;
      const odcinkiKresek: [number, number][] = [];
      for (let d = OD - okres + przes; d < koniec; d += okres) {
        const d0 = Math.max(OD, d);
        const d1 = Math.min(koniec, d + kreska);
        if (d1 > d0) odcinkiKresek.push([d0, d1]);
      }
      const warstwy: [number, number, number][] =
        o.rodzaj === 'przyszly'
          ? [[4.5, 0x1a1208, 0.5]]
          : o.rodzaj === 'biezacy'
            ? [[7, 0x3a2208, 0.85], [3.6, 0xffd34d, 1]]
            : [[6.5, 0x2a1a08, 0.7], [3.2, 0xfffaf0, 1]];
      for (const [grubosc, barwa, alfa] of warstwy) {
        g.lineStyle(grubosc, barwa, alfa);
        for (const [d0, d1] of odcinkiKresek) {
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

    const g = this.add.graphics();
    g.fillStyle(C.shadow, 0.4);
    g.fillEllipse(0, r * 0.9, r * 2.2, r * 0.8);
    const zloto = stan === 'zamknieta' ? 0x8d99a6 : C.gold;
    const zlotoCiemne = stan === 'zamknieta' ? 0x4f5a66 : C.goldDeep;
    const srodek = stan === 'zrobiona' ? 0x3f9d57 : stan === 'biezaca' ? C.ally : 0x56626e;
    g.fillStyle(mix(zlotoCiemne, C.shadow, 0.4), 1);
    g.fillCircle(0, 1.5, r + 2);
    g.fillStyle(zlotoCiemne, 1);
    g.fillCircle(0, 0, r + 1);
    g.fillStyle(zloto, 1);
    g.fillCircle(0, -0.5, r - 0.5);
    g.fillStyle(0xffffff, 0.35);
    g.slice(0, -0.5, r - 1, Phaser.Math.DegToRad(200), Phaser.Math.DegToRad(340));
    g.fillPath();
    g.fillStyle(mix(srodek, C.shadow, 0.45), 1);
    g.fillCircle(0, 0, r - 4.5);
    g.fillStyle(srodek, 1);
    g.fillCircle(0, 0.8, r - 5.5);
    g.fillStyle(0xffffff, 0.22);
    g.fillEllipse(0, -r * 0.32, r * 1.1, r * 0.55);
    k.add(g);

    const nr = this.add
      .text(0, 0.5, String(m.nr), { ...display(stan === 'biezaca' ? 20 : 17), strokeThickness: 4 })
      .setOrigin(0.5);
    if (stan === 'zamknieta') nr.setAlpha(0.7);
    k.add(nr);

    // Plakietka w rogu: ptaszek za zrobioną, kłódka za zamkniętą.
    const b = this.add.graphics();
    const bx = r * 0.72;
    const by = -r * 0.72;
    if (stan === 'zrobiona') {
      b.fillStyle(C.shadow, 0.5);
      b.fillCircle(bx, by + 1.5, 9);
      b.fillStyle(0xffffff, 1);
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
      b.fillStyle(C.shadow, 0.5);
      b.fillRoundedRect(bx - 6.5, by - 1, 13, 11, 2);
      b.lineStyle(2.4, 0xd7dde3, 1);
      b.beginPath();
      b.arc(bx, by - 1.5, 4, Math.PI, 0);
      b.strokePath();
      b.fillStyle(0xd7dde3, 1);
      b.fillRoundedRect(bx - 6, by - 2, 12, 10, 2);
      b.fillStyle(0x4f5a66, 1);
      b.fillCircle(bx, by + 2.4, 1.8);
    }
    k.add(b);

    // Wstążka z nazwą misji pod znacznikiem.
    const podpis = this.add
      .text(0, r + 16, m.tytul, {
        fontFamily: FONT,
        fontSize: '12px',
        fontStyle: 'bold',
        color: stan === 'zamknieta' ? '#d7dde3' : '#ffffff',
        stroke: '#0a2230',
        strokeThickness: 3,
      })
      .setOrigin(0.5);
    const ww = podpis.width + 20;
    const wst = this.add.graphics();
    const kolorWst = stan === 'zrobiona' ? 0x2f7a45 : stan === 'biezaca' ? C.panelDeep : 0x46505b;
    plate(wst, -ww / 2, r + 7, ww, 19, 9.5, kolorWst, stan === 'biezaca' ? C.gold : C.shadow, {
      edgeW: stan === 'biezaca' ? 2 : 1.5,
      drop: 2,
      gloss: 0.15,
    });
    if (stan === 'zamknieta') wst.setAlpha(0.85);
    k.add([wst, podpis]);

    if (stan === 'biezaca') {
      // Strzałka nad bieżącą: podskakuje. Najprostszy znak „tu" dla dziecka.
      const s = this.add.graphics();
      s.fillStyle(C.shadow, 0.6);
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

    // Klik i najechanie. Strefa kołowa pokrywa też wstążkę z nazwą.
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
      const x = xZnacznika + k * (r + 18);
      const y = yZnacznika + 14;
      let min = Infinity;
      for (const o of this.odcinki)
        for (const q of o.pkt) min = Math.min(min, Phaser.Math.Distance.Between(x, y - 20, q.x, q.y));
      const brzeg = x < MAPA.x + 20 || x > MAPA.x + MAPA.w - 20 ? -1000 : 0;
      return { x, y, ocena: min + brzeg };
    });
    const { x, y } = strony[0].ocena >= strony[1].ocena ? strony[0] : strony[1];
    const t = trenerPoImieniu(this.postep!.trener);
    const cien = this.add.ellipse(x, y - 2, 26, 8, C.shadow, 0.45).setDepth(9);
    const tr = this.add.sprite(x, y, t.arkusz, 0).setOrigin(0.5, 1).setScale(0.7).setDepth(9);
    this.trenerNaMapie = tr;
    tr.setData('cien', cien);
    this.tweens.add({ targets: tr, scaleY: 0.72, duration: 900, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
  }

  /** Obwódka wokół znacznika misji pokazanej na zwoju. */
  private zaznaczZnacznik() {
    for (const z of this.znaczniki) {
      z.obwodka.clear();
      if (z.misja !== this.pokazana) continue;
      const r = z.stan === 'biezaca' ? 30 : 27;
      z.obwodka.lineStyle(5, C.shadow, 0.35);
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
      g.fillStyle(C.shadow, 0.5);
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
      g.fillStyle(C.shadow, 0.35);
      g.fillPoints(ksztalt.map((v) => new Phaser.Math.Vector2(v.x + 1, v.y + 2)), true);
      g.fillStyle(f.barwa, 1);
      g.fillPoints(ksztalt, true);
      // Połysk na grzbietach fali: jasny pas w górnej części płótna.
      g.fillStyle(0xffffff, 0.25);
      g.fillPoints(
        [...gora, ...gora.map((v) => new Phaser.Math.Vector2(v.x, v.y + 4)).reverse()],
        true
      );
      // Gwiazdka na płótnie — znak zdobycia, ten sam, co w ramce nagród.
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
   * Przejście po wygranej misji: trener idzie po śladach z poprzedniej misji
   * do nowej, a na zdobytej wciąga się flaga. W Heroes 2 ten moment jest
   * suchy — nowy scenariusz po prostu świeci. Tu dziecko widzi, że krok
   * w opowieści się stał.
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
    const dane = this.cache.json.get('k-mapa-json') as { droga: number[][][] } | undefined;
    const trasa = dane?.droga[odcinek]?.map(([x, y]) => this.naEkran(x, y));
    if (!tr || !trasa) return;
    const odc = this.odcinki[odcinek];
    if (odc) odc.odkryty = 0;
    const cel = { x: tr.x, y: tr.y };
    const przes = { x: cel.x - trasa[trasa.length - 1].x, y: cel.y - trasa[trasa.length - 1].y };
    const cienTr = tr.getData('cien') as Phaser.GameObjects.Ellipse | undefined;
    tr.setPosition(trasa[0].x + przes.x, trasa[0].y + przes.y);
    cienTr?.setPosition(tr.x, tr.y - 2);
    const sciezka = new Phaser.Curves.Spline(trasa.map((pt) => new Phaser.Math.Vector2(pt.x + przes.x, pt.y + przes.y)));
    const t = trenerPoImieniu(p.trener);
    const postep = { u: 0 };
    this.time.delayedCall(1100, () => {
      tr.play(`k-chod-${t.imie}`);
      this.tweens.add({
        targets: postep,
        u: 1,
        duration: 2600,
        ease: 'Sine.easeInOut',
        onUpdate: () => {
          const pt = sciezka.getPoint(postep.u);
          tr.setFlipX(pt.x < tr.x);
          tr.setPosition(pt.x, pt.y);
          cienTr?.setPosition(pt.x, pt.y - 2);
          if (odc) odc.odkryty = postep.u;
        },
        onComplete: () => {
          tr.stop();
          tr.setFrame(0).setFlipX(false);
          if (odc) odc.odkryty = 1;
          sfx(this, 'wejscie', 0.7);
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
    const tlo = this.add.graphics();
    tlo.fillStyle(C.shadow, 0.3);
    tlo.fillRoundedRect(ZWOJ.x + 10, ZWOJ.y + 22, ZWOJ.w - 14, ZWOJ.h - 30, 12);
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
    let y = ZWOJ.y + 52;

    const akapit = (tekst: string, o: { rozmiar?: number; barwa?: string; kursywa?: boolean; wciecie?: number } = {}) => {
      const t = this.add.text(lewy + (o.wciecie ?? 0), y, tekst, {
        fontFamily: FONT,
        fontSize: `${o.rozmiar ?? 15}px`,
        fontStyle: o.kursywa ? 'italic' : '',
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
    const wstazka = (tekst: string, barwa: number) => {
      const t = this.add.text(srodek, y + 12, tekst, { ...display(13), strokeThickness: 3 }).setOrigin(0.5);
      const w = t.width + 34;
      const g = this.add.graphics();
      // Końcówki wstążki z wcięciem, jak na pieczęci listu.
      g.fillStyle(mix(barwa, C.shadow, 0.35), 1);
      g.fillPoints(
        [
          new Phaser.Math.Vector2(srodek - w / 2 - 12, y + 4),
          new Phaser.Math.Vector2(srodek - w / 2 + 6, y + 4),
          new Phaser.Math.Vector2(srodek - w / 2 + 6, y + 22),
          new Phaser.Math.Vector2(srodek - w / 2 - 12, y + 22),
          new Phaser.Math.Vector2(srodek - w / 2 - 6, y + 13),
        ],
        true
      );
      g.fillPoints(
        [
          new Phaser.Math.Vector2(srodek + w / 2 + 12, y + 4),
          new Phaser.Math.Vector2(srodek + w / 2 - 6, y + 4),
          new Phaser.Math.Vector2(srodek + w / 2 - 6, y + 22),
          new Phaser.Math.Vector2(srodek + w / 2 + 12, y + 22),
          new Phaser.Math.Vector2(srodek + w / 2 + 6, y + 13),
        ],
        true
      );
      plate(g, srodek - w / 2, y, w, 24, 4, barwa, mix(barwa, C.shadow, 0.5), { edgeW: 1.5, drop: 2, gloss: 0.2 });
      k.add([g, t]);
      y += 34;
    };
    const tytul = (tekst: string) => {
      const t = napisTytulowy(this, srodek, y + 16, tekst, tekst.length > 18 ? 21 : 24);
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
      const e = this.add.text(lewy + 30, y, etykieta, {
        fontFamily: FONT,
        fontSize: '14px',
        fontStyle: 'bold',
        color: ATRAMENT_CZERWONY,
      });
      k.add([ik, e]);
      y += e.height + 1;
      akapit(tekst, { wciecie: 30, rozmiar: 14 });
      y += 8;
    };

    const nr = (m: Misja) => `MISJA ${m.nr} Z ${KAMPANIA.misje.length}`;
    const m = this.pokazana;

    if (!m) {
      // Zakończenie kampanii.
      wstazka('KONIEC KAMPANII', 0xb8862c);
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
      this.pieczec(k, ZWOJ.x + ZWOJ.w - 70, ZWOJ.y + ZWOJ.h - 128, 'BRAWO!');
      const od = new PrzyciskDuzy(this, ZWOJ.x + ZWOJ.w / 2, ZWOJ.y + ZWOJ.h - 58, 170, 34, 'Zagraj od nowa', C.panelDeep, C.shadow, 14, () =>
        this.potwierdzNowa()
      );
      od.ustaw(true);
      k.add(od.kontener);
      return y;
    }

    const stan: StanZnacznika = p.ukonczone.includes(m.id) ? 'zrobiona' : m === biezacaMisja(p) ? 'biezaca' : 'zamknieta';

    if (stan === 'zamknieta') {
      wstazka(nr(m), 0x6d7884);
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
      akapit('Ta misja jest jeszcze zamknięta.', { rozmiar: 16 }).setFontStyle('bold');
      y += 6;
      if (poprzednia) akapit(`Najpierw ukończ misję ${poprzednia.nr}: „${poprzednia.tytul}".`);
      y += 10;
      akapit('Co tam czeka? Przekonasz się, gdy dojdziesz dalej!', { kursywa: true, barwa: ATRAMENT_MIEKKI });
      this.przyciskPowrotu(k);
      return y;
    }

    if (stan === 'zrobiona') {
      const w = p.wyniki[m.id];
      wstazka(`${nr(m)} · UKOŃCZONA`, 0x2f8a4c);
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
      this.pieczec(k, ZWOJ.x + ZWOJ.w - 68, ZWOJ.y + 146, 'ZDOBYTE');
      this.przyciskPowrotu(k);
      return y;
    }

    // Bieżąca misja.
    wstazka(nr(m), 0x2d6fa8);
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
    if (plecak.length) {
      wiersz(
        ICON.banner,
        `${p.trener} zabiera ze sobą`,
        plecak.map(nazwaArtefaktu).join(', ') + '.'
      );
    }
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
    const g = this.add.graphics();
    g.fillStyle(0x3a2412, 0.35);
    g.fillRoundedRect(x - 5, y - 3, w + 10, h + 10, 9);
    g.fillStyle(0x6b4a26, 1);
    g.fillRoundedRect(x - 5, y - 5, w + 10, h + 10, 9);
    g.fillStyle(0xc9a15e, 1);
    g.fillRoundedRect(x - 3, y - 3, w + 6, h + 6, 7);
    const img = this.add
      .image(x - sx * skala, y - sy * skala, 'k-mapa')
      .setOrigin(0)
      .setScale(skala)
      .setCrop(sx, sy, cw, ch);
    const f = this.add.graphics();
    // Ciemna fuga od góry: obrazek leży POD ramką, nie na niej.
    f.lineStyle(2, 0x2a1a08, 0.8);
    f.strokeRect(x, y, w, h);
    for (let i = 0; i < 4; i++) {
      f.fillStyle(0x2a1a08, 0.12 * (4 - i));
      f.fillRect(x, y + i * 2, w, 2);
    }
    f.lineStyle(1, 0xfff0c8, 0.6);
    f.strokeRect(x - 2.5, y - 2.5, w + 5, h + 5);
    k.add([g, img, f]);
  }

  /** Link „wróć do bieżącej misji" na dole zwoju, gdy pokazana jest inna. */
  private przyciskPowrotu(k: Phaser.GameObjects.Container) {
    const cel = biezacaMisja(this.postep!) ?? null;
    const b = new PrzyciskDuzy(
      this,
      ZWOJ.x + ZWOJ.w / 2,
      ZWOJ.y + ZWOJ.h - 58,
      210,
      34,
      cel ? `Wróć do misji ${cel.nr}` : 'Wróć do zakończenia',
      C.panelDeep,
      C.shadow,
      14,
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
    const t = this.add
      .text(0, 0, napis, { fontFamily: FONT, fontSize: '11px', fontStyle: 'bold', color: '#ffe6d8' })
      .setOrigin(0.5);
    const kont = this.add.container(x, y, [g, t]).setAngle(-14).setAlpha(0.95);
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
    const p = this.postep!;
    const g = this.add.graphics();
    cienPod(g, PAS.x, PAS.y, PAS.w, PAS.h, 16, 0.55);
    plate(g, PAS.x, PAS.y, PAS.w, PAS.h, 16, C.panel, C.panelDeep, { light: 0.22, dark: 0.2, gloss: 0.14, drop: 0, edgeW: 3 });
    faktura(g, PAS.x + 3, PAS.y + 3, PAS.w - 6, PAS.h - 6, 0.04);
    g.lineStyle(2, C.gold, 0.45);
    g.strokeRoundedRect(PAS.x + 6, PAS.y + 6, PAS.w - 12, PAS.h - 12, 11);

    const biezaca = biezacaMisja(p);
    if (!biezaca) {
      this.pasWynikow();
      return;
    }

    this.add.text(PAS.x + 20, PAS.y + 14, `Nagroda na start misji ${biezaca.nr}`, {
      ...display(17),
      strokeThickness: 4,
    });
    this.podpowiedz = this.add
      .text(PAS.x + PAS.w - 20, PAS.y + 18, '', {
        fontFamily: FONT,
        fontSize: '14px',
        fontStyle: 'bold',
        color: H.panelDeep,
      })
      .setOrigin(1, 0);

    const kw = 188;
    const kh = 96;
    const odstep = (PAS.w - 28 - kw * 3) / 2;
    biezaca.bonusy.forEach((b, i) => {
      const kx = PAS.x + 14 + i * (kw + odstep);
      this.kartaNagrody(b, i, kx, PAS.y + 44, kw, kh);
    });
    this.odswiezNagrody(false);
  }

  private kartaNagrody(b: Bonus, i: number, x: number, y: number, w: number, h: number) {
    const k = this.add.container(x, y);
    const tlo = this.add.graphics();
    k.add(tlo);

    // Gniazdo z obrazkiem nagrody.
    const g = this.add.graphics();
    wneka(g, 10, 10, 76, 76, 14, mix(C.panelDeep, C.shadow, 0.3), 1);
    k.add(g);
    const wyglad = this.wygladNagrody(b);
    const obraz = this.add.image(48, 48, wyglad.tekstura);
    const bok = wyglad.bok ?? 58;
    obraz.setScale(Math.min(bok / obraz.width, bok / obraz.height));
    k.add(obraz);
    if (wyglad.liczba) {
      const t = this.add.text(0, 0, wyglad.liczba, { ...display(14), strokeThickness: 3 }).setOrigin(0.5);
      const lw = t.width + 12;
      const lg = this.add.graphics();
      plate(lg, 84 - lw, 70, lw, 20, 10, C.gold, C.goldDeep, { edgeW: 1.5, drop: 2, gloss: 0.3 });
      t.setPosition(84 - lw / 2, 80);
      k.add([lg, t]);
    }

    const kat = this.add.text(96, 12, wyglad.kategoria.toUpperCase(), {
      fontFamily: FONT,
      fontSize: '11px',
      fontStyle: 'bold',
      color: H.inkSoft,
    });
    const opis = this.add.text(96, 28, wyglad.nazwa, {
      fontFamily: FONT,
      fontSize: '15px',
      fontStyle: 'bold',
      color: H.ink,
      wordWrap: { width: w - 104 },
      lineSpacing: 1,
    });
    const klawisz = this.add.text(w - 12, h - 10, `${i + 1}`, {
      fontFamily: FONT,
      fontSize: '11px',
      fontStyle: 'bold',
      color: H.inkSoft,
    }).setOrigin(1, 1).setAlpha(0.7);
    const radio = this.add.graphics();
    k.add([kat, opis, klawisz, radio]);

    const strefa = this.add.zone(w / 2, h / 2, w, h).setInteractive({ useHandCursor: true });
    k.add(strefa);
    const karta: KartaNagrody = { kontener: k, tlo, radio, y0: y };
    strefa.on('pointerover', () => {
      if (this.bonus !== i) this.tweens.add({ targets: k, y: y - 3, duration: 100 });
    });
    strefa.on('pointerout', () => {
      if (this.bonus !== i) this.tweens.add({ targets: k, y, duration: 100 });
    });
    strefa.on('pointerdown', () => this.wybierzNagrode(i));
    this.karty.push(karta);
    (k as unknown as { rozmiar: { w: number; h: number } }).rozmiar = { w, h };
  }

  private wygladNagrody(b: Bonus): { tekstura: string; kategoria: string; nazwa: string; liczba?: string; bok?: number } {
    if (b.typ === 'surowiec') {
      const s = SUROWIEC_INFO[b.surowiec];
      return { tekstura: `m-${s.ikona}`, kategoria: 'Surowce', nazwa: s.nazwa, liczba: `${b.ile}`, bok: 46 };
    }
    if (b.typ === 'artefakt') {
      const a = artefaktPoId(b.artefakt);
      return {
        tekstura: kluczArtefaktu(b.artefakt, a?.klasa ?? 'drobny'),
        kategoria: 'Artefakt',
        nazwa: a?.nazwa ?? nazwaArtefaktu(b.artefakt),
        bok: 60,
      };
    }
    if (b.typ === 'oddzial') {
      const f = factionById('bor') ?? FACTIONS[0];
      const u = f.units[b.tier];
      return {
        tekstura: `p-${u?.sprite ?? f.units[0].sprite}`,
        kategoria: 'Stworki',
        nazwa: `${u?.name ?? b.opis}\n(poziom ${b.tier + 1})`,
        liczba: `×${b.ile}`,
        bok: 70,
      };
    }
    const atak = b.atak ?? 0;
    return {
      tekstura: atak ? ICON.sword : ICON.shield,
      kategoria: 'Trening',
      nazwa: atak ? 'Atak bohatera' : 'Obrona bohatera',
      liczba: `+${atak || b.obrona || 0}`,
      bok: 50,
    };
  }

  private wybierzNagrode(i: number) {
    if (!biezacaMisja(this.postep!)) return;
    const zmiana = this.bonus !== i;
    this.bonus = i;
    if (zmiana) sfx(this, 'zbior', 0.6);
    this.odswiezNagrody(true);
  }

  private odswiezNagrody(animuj: boolean) {
    this.karty.forEach((kt, i) => {
      const { w, h } = (kt.kontener as unknown as { rozmiar: { w: number; h: number } }).rozmiar;
      const wybrana = this.bonus === i;
      const inna = this.bonus !== undefined && !wybrana;
      kt.tlo.clear();
      if (wybrana) {
        for (let j = 4; j >= 1; j--) {
          kt.tlo.fillStyle(C.gold, 0.12);
          kt.tlo.fillRoundedRect(-j * 3, -j * 3, w + j * 6, h + j * 6, 14 + j * 3);
        }
      }
      plate(kt.tlo, 0, 0, w, h, 14, wybrana ? mix(C.goldLight, C.white, 0.35) : C.panel, wybrana ? C.goldDeep : C.panelEdge, {
        edgeW: wybrana ? 3.5 : 2,
        drop: 3,
        light: 0.25,
        dark: 0.14,
        gloss: 0.2,
      });
      kt.radio.clear();
      const rx = w - 16;
      const ry = 16;
      kt.radio.fillStyle(C.shadow, 0.3);
      kt.radio.fillCircle(rx, ry + 1.5, 10);
      kt.radio.fillStyle(wybrana ? C.goldDeep : C.panelDeep, 1);
      kt.radio.fillCircle(rx, ry, 10);
      kt.radio.fillStyle(wybrana ? C.gold : C.white, 1);
      kt.radio.fillCircle(rx, ry, 8);
      if (wybrana) {
        kt.radio.lineStyle(3, C.white, 1);
        kt.radio.beginPath();
        kt.radio.moveTo(rx - 4.5, ry);
        kt.radio.lineTo(rx - 1.2, ry + 3.6);
        kt.radio.lineTo(rx + 5, ry - 3.6);
        kt.radio.strokePath();
      }
      this.tweens.killTweensOf(kt.kontener);
      kt.kontener.setAlpha(inna ? 0.78 : 1);
      if (wybrana && animuj) {
        kt.kontener.setY(kt.y0 - 4);
        this.tweens.add({ targets: kt.kontener, scale: { from: 1.05, to: 1 }, duration: 220, ease: 'Back.easeOut' });
      } else {
        kt.kontener.setY(wybrana ? kt.y0 - 4 : kt.y0);
      }
    });

    if (this.podpowiedz) {
      if (this.bonus === undefined) {
        this.podpowiedz.setText('Kliknij jedną z trzech ↓').setColor(ATRAMENT_CZERWONY);
        this.tweens.killTweensOf(this.podpowiedz);
        this.tweens.add({ targets: this.podpowiedz, alpha: 0.45, duration: 650, yoyo: true, repeat: -1 });
      } else {
        this.tweens.killTweensOf(this.podpowiedz);
        this.podpowiedz.setAlpha(1).setText('Gotowe! Teraz naciśnij „Graj".').setColor('#2f7a45');
      }
    }
    this.graj?.ustaw(this.bonus !== undefined);
  }

  /** Pas po zakończeniu kampanii: wynik każdej misji w jednym rzędzie. */
  private pasWynikow() {
    const p = this.postep!;
    this.add.text(PAS.x + 20, PAS.y + 14, 'Twoja kronika', { ...display(17), strokeThickness: 4 });
    const n = KAMPANIA.misje.length;
    const kw = (PAS.w - 28 - (n - 1) * 10) / n;
    KAMPANIA.misje.forEach((m, i) => {
      const x = PAS.x + 14 + i * (kw + 10);
      const y = PAS.y + 44;
      const w = p.wyniki[m.id];
      const g = this.add.graphics();
      plate(g, x, y, kw, 94, 12, C.panel, C.panelEdge, { edgeW: 2, drop: 3, gloss: 0.2 });
      g.fillStyle(0x3f9d57, 1);
      g.fillCircle(x + 18, y + 18, 11);
      this.add.text(x + 18, y + 18, `${m.nr}`, { ...display(13), strokeThickness: 3 }).setOrigin(0.5);
      this.add.text(x + 34, y + 10, m.tytul, {
        fontFamily: FONT,
        fontSize: '13px',
        fontStyle: 'bold',
        color: H.ink,
        wordWrap: { width: kw - 40 },
      });
      if (w) {
        this.add.text(x + 12, y + 50, `${w.dni} ${odmianaDni(w.dni)} · ${w.punkty} pkt`, {
          fontFamily: FONT,
          fontSize: '12px',
          color: H.inkSoft,
          fontStyle: 'bold',
        });
        for (let s = 0; s < 3; s++) {
          const im = this.add.image(x + 22 + s * 24, y + 78, ICON.star).setDisplaySize(22, 22);
          if (s >= gwiazdki(w.punkty)) im.setTint(0x7d8a96).setAlpha(0.45);
        }
      }
    });
  }

  // ————————————————————————————————————————————————— przyciski

  private rysujPrzyciski() {
    const p = this.postep!;
    const menu = new PrzyciskDuzy(this, MENU.x, MENU.y, MENU.w, MENU.h, 'Menu', C.panelDeep, C.shadow, 17, () => {
      sfx(this, 'wejscie', 0.5);
      this.scene.start('menu');
    });
    menu.ustaw(true);

    if (kampaniaUkonczona(p)) {
      // Po kampanii główny przycisk opowiada zakończenie. „Od nowa" kasuje
      // wyniki, więc jest mały, na zwoju i z pytaniem — nie w miejscu, gdzie
      // dziecko przez cztery misje przyzwyczaiło się klikać „Graj".
      const koniec = new PrzyciskDuzy(this, GRAJ.x, GRAJ.y, GRAJ.w, GRAJ.h, 'Zakończenie', C.gold, C.goldDeep, 21, () => {
        sfx(this, 'wejscie', 0.6);
        this.pokazOpowiesc(
          { tlo: 'k-tlo-bor', naglowek: 'Zwycięstwo!', podtytul: 'Zakończenie', akapity: KAMPANIA.zakonczenie, przycisk: 'Zamknij' },
          () => {}
        );
      });
      koniec.ustaw(true);
      return;
    }

    this.graj = new PrzyciskDuzy(this, GRAJ.x, GRAJ.y, GRAJ.w, GRAJ.h, 'Graj', C.gold, C.goldDeep, 24, () => this.start());
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
    this.cameras.main.fadeOut(320, 13, 16, 35);
    this.cameras.main.once(Phaser.Cameras.Scene2D.Events.FADE_OUT_COMPLETE, () => {
      this.input.enabled = true;
      this.scene.start('adventure');
    });
  }

  private potwierdzNowa() {
    if (this.nakladka) return;
    sfx(this, 'wejscie', 0.5);
    const n = this.add.container(0, 0).setDepth(500);
    this.nakladka = n;
    const tlo = this.add.graphics();
    tlo.fillStyle(0x07101c, 0.6);
    tlo.fillRect(0, 0, EKRAN_W, EKRAN_H);
    const blok = this.add.zone(0, 0, EKRAN_W, EKRAN_H).setOrigin(0).setInteractive();
    const w = 420;
    const h = 200;
    const x = (EKRAN_W - w) / 2;
    const y = (EKRAN_H - h) / 2;
    const g = this.add.graphics();
    cienPod(g, x, y, w, h, 18, 0.8);
    plate(g, x, y, w, h, 18, C.panel, C.panelDeep, { edgeW: 4, drop: 0, gloss: 0.15 });
    naroznik(g, x + 12, y + 12, 1, 1, 26);
    naroznik(g, x + w - 12, y + 12, -1, 1, 26);
    const t1 = napisTytulowy(this, EKRAN_W / 2, y + 40, 'Zacząć od nowa?', 26);
    const t2 = this.add
      .text(EKRAN_W / 2, y + 88, 'Kampania zacznie się od pierwszej misji,\na twoje wyniki znikną.', {
        fontFamily: FONT,
        fontSize: '16px',
        color: H.ink,
        align: 'center',
      })
      .setOrigin(0.5);
    n.add([tlo, blok, g, ...t1, t2]);
    const tak = new PrzyciskDuzy(this, EKRAN_W / 2 - 90, y + h - 40, 150, 46, 'Tak', C.foe, C.foeDeep, 18, () => {
      usunPostep();
      this.registry.remove('kampania-widziane');
      this.scene.restart();
    });
    const nie = new PrzyciskDuzy(this, EKRAN_W / 2 + 90, y + h - 40, 150, 46, 'Nie', C.panelDeep, C.shadow, 18, () => {
      n.destroy();
      this.nakladka = undefined;
    });
    tak.ustaw(true);
    nie.ustaw(true);
    n.add([tak.kontener, nie.kontener]);
  }

  // ————————————————————————————————————————————————— wspólne

  /** Ilustracja na cały ekran z przyciemnieniem od dołu. */
  private tloIlustracji(klucz: string, ciemnosc: number) {
    const tlo = this.add.image(EKRAN_W / 2, EKRAN_H / 2, klucz);
    const s = Math.max(EKRAN_W / tlo.width, EKRAN_H / tlo.height);
    tlo.setScale(s);
    this.tweens.add({ targets: tlo, scale: s * 1.05, duration: 20000, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
    const g = this.add.graphics();
    g.fillStyle(0x07101c, ciemnosc);
    g.fillRect(0, 0, EKRAN_W, EKRAN_H);
    for (let i = 0; i < 10; i++) {
      g.fillStyle(0x07101c, 0.05);
      g.fillRect(0, 0, EKRAN_W, 60 + i * 14);
      g.fillRect(0, EKRAN_H - 40 - i * 12, EKRAN_W, 40 + i * 12);
    }
  }

  /** Pyłki unoszące się w powietrzu — świetliki nocą, pyłek w dzień. */
  private pylki(ile: number, barwa: number) {
    const wynik: Phaser.GameObjects.Image[] = [];
    for (let i = 0; i < ile; i++) {
      const x = Phaser.Math.Between(0, EKRAN_W);
      const y = Phaser.Math.Between(120, EKRAN_H);
      const s = this.add.image(x, y, 'k-iskra').setTint(barwa).setScale(Phaser.Math.FloatBetween(0.12, 0.3)).setAlpha(0);
      this.tweens.add({
        targets: s,
        y: y - Phaser.Math.Between(60, 160),
        x: x + Phaser.Math.Between(-40, 40),
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
 * Tytuł w stylu logo gry: trzy warstwy liter (gruby ciemny kontur, złoty
 * kontur, napis z gradientem). To samo co `drawTitle` z hud.ts, ale
 * z wyborem punktu zaczepienia — `drawTitle` zna tylko lewy górny róg,
 * a tutaj większość tytułów jest wyśrodkowana.
 */
function napisTytulowy(
  scena: Phaser.Scene,
  x: number,
  y: number,
  tekst: string,
  rozmiar: number,
  ox = 0.5,
  oy = 0.5
): Phaser.GameObjects.Text[] {
  const hex = (v: number) => `#${v.toString(16).padStart(6, '0')}`;
  const warstwa = (obrys: number, grubosc: number) =>
    scena.add
      .text(x, y, tekst, {
        fontFamily: FONT,
        fontSize: `${rozmiar}px`,
        fontStyle: 'bold',
        color: hex(C.goldLight),
        stroke: hex(obrys),
        strokeThickness: grubosc,
      })
      .setOrigin(ox, oy);
  const tyl = warstwa(C.shadow, rozmiar * 0.42);
  tyl.setShadow(0, 3, '#00000066', 6, true, true);
  const srodek = warstwa(C.goldDeep, rozmiar * 0.2);
  const przod = warstwa(C.shadow, 0);
  gradientText(przod, H.white, H.gold);
  // Warstwy mają różne grubości obrysu, więc różne szerokości — przy
  // zaczepieniu innym niż środek trzeba je wyrównać do najszerszej.
  if (ox !== 0.5) {
    const d = (tyl.width - przod.width) / 2;
    przod.x += ox === 0 ? d : -d;
    srodek.x += ox === 0 ? (tyl.width - srodek.width) / 2 : -(tyl.width - srodek.width) / 2;
  }
  return [tyl, srodek, przod];
}

/**
 * Duży przycisk-kapsułka. Ten sam materiał co `makeHudButton` (trzy stany
 * rysowane z góry, przełączane widocznością), ale z napisem dowolnej
 * wielkości — „Graj" jest najważniejszym przyciskiem ekranu i napis 15 px
 * z paska bitwy gubił się pod dużą mapą.
 */
class PrzyciskDuzy {
  readonly kontener: Phaser.GameObjects.Container;
  private wlaczony = true;
  private nad = false;
  private normal: Phaser.GameObjects.Graphics;
  private jasny: Phaser.GameObjects.Graphics;
  private wyl: Phaser.GameObjects.Graphics;
  private napis: Phaser.GameObjects.Text;
  private grot?: Phaser.GameObjects.Graphics;
  private puls?: Phaser.Tweens.Tween;
  private scena: Phaser.Scene;
  private y: number;
  private akcja: () => void;

  constructor(
    scena: Phaser.Scene,
    x: number,
    y: number,
    w: number,
    h: number,
    tekst: string,
    ton: number,
    tonGleboki: number,
    rozmiar: number,
    akcja: () => void
  ) {
    this.scena = scena;
    this.y = y;
    this.akcja = akcja;
    const r = h / 2;
    const skora = (fill: number, edge: number, gloss: number, przygas: number) => {
      const g = scena.add.graphics();
      plate(g, -w / 2, -h / 2, w, h, r, fill, edge, { light: 0.34, dark: 0.3, gloss, drop: 3, edgeW: 2.5 });
      if (przygas > 0) {
        g.fillStyle(C.shadow, przygas);
        g.fillRoundedRect(-w / 2, -h / 2, w, h, r);
      }
      return g;
    };
    this.normal = skora(ton, tonGleboki, 0.3, 0);
    this.jasny = skora(mix(ton, C.white, 0.22), tonGleboki, 0.42, 0);
    this.wyl = skora(mix(ton, C.inkSoft, 0.75), mix(tonGleboki, C.shadow, 0.4), 0.08, 0.15);
    this.napis = scena.add.text(0, 0, tekst, { ...display(rozmiar), strokeThickness: Math.max(3.5, rozmiar / 5) }).setOrigin(0.5);
    const strefa = scena.add.zone(0, 0, w, h).setInteractive({ useHandCursor: true });
    this.kontener = scena.add.container(x, y, [this.normal, this.jasny, this.wyl, this.napis, strefa]).setDepth(30);

    strefa.on('pointerover', () => {
      this.nad = true;
      this.maluj();
      if (this.wlaczony) scena.tweens.add({ targets: this.kontener, y: this.y - 2, duration: 90 });
    });
    strefa.on('pointerout', () => {
      this.nad = false;
      this.maluj();
      scena.tweens.add({ targets: this.kontener, y: this.y, duration: 90 });
    });
    strefa.on('pointerdown', () => this.kliknij());
    this.maluj();
  }

  kliknij() {
    if (!this.wlaczony) return;
    this.scena.tweens.add({ targets: this.kontener, scaleX: 0.96, scaleY: 0.9, duration: 70, yoyo: true });
    this.akcja();
  }

  /** Grot w prawo za napisem — „dalej", „graj". */
  strzalka() {
    const g = this.scena.add.graphics();
    const x = this.napis.width / 2 + 16;
    g.fillStyle(C.shadow, 1);
    g.fillTriangle(x - 7, -11, x - 7, 11, x + 11, 0);
    g.fillStyle(C.white, 1);
    g.fillTriangle(x - 4.5, -7, x - 4.5, 7, x + 6.5, 0);
    this.napis.x -= 10;
    g.x = -10;
    this.grot = g;
    this.kontener.add(g);
    this.maluj();
  }

  ustaw(wlaczony: boolean) {
    this.wlaczony = wlaczony;
    this.maluj();
  }

  private maluj() {
    this.normal.setVisible(this.wlaczony && !this.nad);
    this.jasny.setVisible(this.wlaczony && this.nad);
    this.wyl.setVisible(!this.wlaczony);
    this.napis.setAlpha(this.wlaczony ? 1 : 0.55);
    this.grot?.setAlpha(this.wlaczony ? 1 : 0.4);
    gradientText(this.napis, this.wlaczony ? H.white : H.panelEdge, this.wlaczony ? H.goldLight : H.inkSoft);
    // Włączony przycisk główny oddycha — zaprasza do kliknięcia, gdy wszystko
    // jest już wybrane. Wyłączony stoi, żeby nie kusił na próżno.
    if (this.wlaczony && this.grot && !this.puls) {
      this.puls = this.scena.tweens.add({
        targets: this.kontener,
        scale: 1.04,
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
