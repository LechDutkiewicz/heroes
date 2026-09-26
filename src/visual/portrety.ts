import Phaser from 'phaser';
import { FACTIONS } from '../data/factions';
import { BARWA, KROJ, krojeZestawu, ramaZlota } from './zestaw';

/**
 * Portrety stworów — to, co stoi w slotach armii, na karcie werbunku,
 * w kolejce tur i na ekranie kampanii.
 *
 * Wcześniej w każdym z tych miejsc stał CAŁY stworek zmniejszony do slotu:
 * przy 28 px kolorowa plamka z nóżkami, bez twarzy, zawieszona w pustym
 * gnieździe. W Heroes 3 portret stwora to osobny obrazek — popiersie
 * w ramce — i dopiero dzięki temu rząd armii czyta się przy 32 px. Nasze
 * portrety liczy `tools/stworki_portrety.py` z mistrzów (`assets/stworki/`):
 * kadr zakotwiczony w oczach (ta sama linia oczu i wielkość twarzy
 * u wszystkich), jedno ciepłe tło pergaminu i jedno światło. Po
 * przemalowaniu stworka wystarczy puścić skrypt jeszcze raz.
 *
 * Cztery pliki na stwora, każdy w wielkości, w jakiej gra go pokazuje:
 *  - duży (`pd-<id>`, 96 px) — ekran bohatera, karta werbunku;
 *  - mały (`pm-<id>`, 50 px, ciaśniej na twarz) — załoga w mieście;
 *  - panel (`pp-<id>`, 28 px) — panel armii na mapie;
 *  - okrągły (`po-<id>`, 56 px) — medaliony (kolejka tur w bitwie, karta
 *    nagrody w kampanii, wynik). Koło jest w pliku, a nie maską: maska
 *    geometryczna liczy się we współrzędnych świata i nie jedzie razem
 *    z kontenerem, który się rusza.
 */

// Wielkości plików = wielkości, w jakich gra je pokazuje (ostrość: Phaser
// zmniejsza bez mipmap, każde zmniejszenie w grze zmiękcza obraz).
export const PORTRET_DUZY = 96;
export const PORTRET_MALY = 50;
export const PORTRET_PANELU = 28;

/** Klucz tekstury portretu. */
export function kluczPortretu(sprite: string, maly = false) {
  return `${maly ? 'pm' : 'pd'}-${sprite}`;
}

/** Klucz najmniejszego portretu — panel armii na mapie (28 px). */
export function kluczPortretuPanelu(sprite: string) {
  return `pp-${sprite}`;
}

/** Klucz okrągłego portretu (medalion). */
export function kluczPortretuOkraglego(sprite: string) {
  return `po-${sprite}`;
}

/**
 * Wczytuje portrety — domyślnie wszystkich 18 stworów frakcji. Pliki są
 * małe (małe portrety po kilka KB, duże po kilkadziesiąt), a armia zmienia skład między scenami (werbunek,
 * łup, podział), więc ładowanie „tylko tego, co w armii" kończyło się
 * brakującą teksturą po powrocie z miasta. Klucze już wczytane Phaser pomija.
 */
export function wczytajPortrety(
  scena: Phaser.Scene,
  rozmiary: { duze?: boolean; male?: boolean; panel?: boolean; okragle?: boolean } = { duze: true, male: true },
  sprite: Iterable<string> = FACTIONS.flatMap((f) => f.units.map((u) => u.sprite))
) {
  const b = import.meta.env.BASE_URL;
  for (const s of sprite) {
    if (rozmiary.duze && !scena.textures.exists(kluczPortretu(s))) {
      scena.load.image(kluczPortretu(s), `${b}portrety/${s}.png`);
    }
    if (rozmiary.male && !scena.textures.exists(kluczPortretu(s, true))) {
      scena.load.image(kluczPortretu(s, true), `${b}portrety/${s}-m.png`);
    }
    if (rozmiary.panel && !scena.textures.exists(kluczPortretuPanelu(s))) {
      scena.load.image(kluczPortretuPanelu(s), `${b}portrety/${s}-p.png`);
    }
    if (rozmiary.okragle && !scena.textures.exists(kluczPortretuOkraglego(s))) {
      scena.load.image(kluczPortretuOkraglego(s), `${b}portrety/${s}-o.png`);
    }
  }
}

/**
 * Złota oprawa portretu, jak ramki w zestawie: ciemna kreska na zewnątrz
 * (odcina od tła panelu), złoto z jasną górą i ciemnym dołem (światło
 * z góry-lewa, tak jak na całej mapie). Sam plik portretu ma już własną
 * ciemną ramkę z fazką — ta idzie DOOKOŁA niej.
 *
 * `x, y` to lewy górny róg portretu, `bok` jego bok na ekranie.
 */
export function oprawPortret(
  g: Phaser.GameObjects.Graphics,
  x: number,
  y: number,
  bok: number,
  grubosc = 2,
  zaznaczony = false
) {
  const z = grubosc;
  const zewn = z + 1;
  // Ciemny obrys zewnętrzny.
  g.fillStyle(0x1a0e04, 0.95);
  g.fillRect(x - zewn, y - zewn, bok + 2 * zewn, bok + 2 * zewn);
  // Złoto: najpierw ciemne pole, na nim jasna góra i lewa krawędź.
  const zloto = zaznaczony ? 0xffd75a : 0xc8912a;
  const jasne = zaznaczony ? 0xfff2c0 : 0xf2cf6a;
  const ciemne = zaznaczony ? 0xc88a14 : 0x7a4f14;
  g.fillStyle(ciemne, 1);
  g.fillRect(x - z, y - z, bok + 2 * z, bok + 2 * z);
  g.fillStyle(zloto, 1);
  g.fillRect(x - z, y - z, bok + 2 * z - 1, bok + 2 * z - 1);
  g.fillStyle(jasne, 1);
  g.fillRect(x - z, y - z, bok + 2 * z - 1, 1);
  g.fillRect(x - z, y - z, 1, bok + 2 * z - 1);
}

/**
 * Dno pustego gniazda: ciemne drewno wpuszczone w materiał — cień od góry,
 * odbicie przy dolnej krawędzi (światło z góry, jak w `rama.ts`).
 */
export function dnoGniazda(g: Phaser.GameObjects.Graphics, x: number, y: number, bok: number) {
  // Dno: ciepłe ciemne drewno, jaśniejsze ku środkowi — wnęka ma głębię, a nie
  // jest czarną dziurą (runda 6: „przygaszona czarna dziura").
  g.fillStyle(0x2e1c0c, 1);
  g.fillRect(x, y, bok, bok);
  for (let i = 1; i <= 4; i++) {
    const k = (bok * i) / 14;
    g.fillStyle(0x5a3a1c, 0.18);
    g.fillRect(x + k, y + k, bok - 2 * k, bok - 2 * k);
  }
  // Cień od górnej i lewej krawędzi (światło z góry-lewa pada do wnęki).
  const gleb = Math.max(3, bok * 0.14);
  for (let i = 0; i < 5; i++) {
    g.fillStyle(0x000000, 0.26 * (1 - i / 5));
    g.fillRect(x, y + (i * gleb) / 5, bok, gleb / 5 + 0.5);
    g.fillRect(x + (i * gleb) / 5, y, gleb / 5 + 0.5, bok);
  }
  g.fillStyle(0xf8e6b8, 0.12);
  g.fillRect(x + 2, y + bok - 2, bok - 3, 1.5);
  g.fillRect(x + bok - 2, y + 2, 1.5, bok - 3);
  // Rytowany znak w dnie — pięcioramienna gwiazda, ta sama co na złotych
  // przyciskach zestawu: gniazdo jest zaprojektowanym miejscem na stworka,
  // nie brakiem obrazka. Ryt = ciemna kreska i jasna tuż pod nią (światło
  // z góry). Żadnych znaków z bajki — tylko motywy z naszego zestawu.
  if (bok >= 40) {
    const cx = x + bok / 2;
    const cy = y + bok / 2 + bok * 0.02;
    const R = bok * 0.2;
    const r = R * 0.45;
    const punkty: Phaser.Math.Vector2[] = [];
    for (let i = 0; i < 10; i++) {
      const kat = -Math.PI / 2 + (i * Math.PI) / 5;
      const d = i % 2 === 0 ? R : r;
      punkty.push(new Phaser.Math.Vector2(cx + Math.cos(kat) * d, cy + Math.sin(kat) * d));
    }
    for (const [dy, barwa, alfa] of [
      [1, 0xf8e6b8, 0.16],
      [0, 0x120a04, 0.55],
    ] as const) {
      g.lineStyle(Math.max(1.5, bok / 40), barwa, alfa);
      g.strokePoints(
        punkty.map((p) => new Phaser.Math.Vector2(p.x, p.y + dy)),
        true,
        true
      );
    }
  }
}

export interface OpcjeGniazda {
  /** Mały portret (`pm-`) zamiast dużego — do slotów poniżej ~56 px. */
  maly?: boolean;
  /** Numer slotu na dnie pustego gniazda. */
  numer?: string;
  /** Wielkość liczby na odznace; domyślnie z boku gniazda. */
  rozmiarLiczby?: number;
  /**
   * Gdzie stoi tabliczka z liczbą — zawsze POZA obrazem: `pod` — pod ramą,
   * na środku (domyślnie); `bok` — z prawej strony ramy przy dole, gdy pod
   * gniazdem nie ma miejsca (pasek załogi w mieście).
   */
  odznaka?: 'pod' | 'bok';
}

/**
 * Gniazdo portretu z zestawu: ciemne drewniane dno, portret, cienka złota
 * rama (`z-rama-cienka`, ta sama co na pergaminowych panelach) i liczebność
 * na OSOBNEJ odznace przypiętej do prawego dolnego rogu ramy.
 *
 * Po rundzie 1 portretów krytyk wytknął dwie rzeczy, które to naprawia:
 * płaskie jasnoniebieskie „kafelki z aplikacji" wokół portretów oraz
 * tabliczkę z liczbą leżącą na dolnej trzeciej portretu — zasłaniała pierś
 * stwora i myliła się z nim. Odznaka siedzi teraz na krawędzi ramy
 * i zachodzi na portret tylko narożnikiem, jak liczba w Heroes.
 *
 * Kontener zaczepiony w lewym górnym rogu PORTRETU (rama wystaje o 5 px).
 * Wymaga `wczytajZestaw` w `preload` sceny.
 */
export class GniazdoPortretu {
  readonly kontener: Phaser.GameObjects.Container;
  private readonly dno: Phaser.GameObjects.Graphics;
  private readonly obraz: Phaser.GameObjects.Image;
  private readonly rama: Phaser.GameObjects.GameObject & { setAlpha(a: number): unknown };
  private readonly poswiata: Phaser.GameObjects.Graphics;
  private readonly odznaka: Phaser.GameObjects.Graphics;
  private readonly liczba: Phaser.GameObjects.Text;
  private readonly numer?: Phaser.GameObjects.Text;

  readonly bok: number;
  private readonly opcje: OpcjeGniazda;

  constructor(scena: Phaser.Scene, x: number, y: number, bok: number, opcje: OpcjeGniazda = {}) {
    this.bok = bok;
    this.opcje = opcje;
    this.poswiata = scena.add.graphics().setVisible(false);
    for (let i = 4; i >= 1; i--) {
      this.poswiata.fillStyle(0xffc93c, 0.12);
      this.poswiata.fillRoundedRect(-5 - i * 3, -5 - i * 3, bok + 10 + i * 6, bok + 10 + i * 6, 4 + i * 2);
    }
    this.dno = scena.add.graphics();
    dnoGniazda(this.dno, 0, 0, bok);
    this.obraz = scena.add.image(bok / 2, bok / 2, '__DEFAULT').setDisplaySize(bok, bok).setVisible(false);
    this.rama = ramaZlota(scena, 0, 0, bok, bok, false);
    const czesci: Phaser.GameObjects.GameObject[] = [this.poswiata, this.dno, this.obraz, this.rama];
    if (opcje.numer) {
      this.numer = scena.add
        .text(bok / 2, bok / 2, opcje.numer, {
          fontFamily: KROJ.tytul,
          fontSize: `${Math.round(bok * 0.26)}px`,
          color: '#6b4a26',
        })
        .setOrigin(0.5)
        .setAlpha(0.7);
      czesci.push(this.numer);
    }
    this.odznaka = scena.add.graphics();
    this.liczba = scena.add
      .text(0, 0, '', {
        fontFamily: KROJ.tytul,
        fontSize: `${opcje.rozmiarLiczby ?? Math.max(11, Math.round(bok * 0.16))}px`,
        color: BARWA.krem,
        stroke: BARWA.braz,
        strokeThickness: 3,
      })
      .setOrigin(0.5);
    czesci.push(this.odznaka, this.liczba);
    this.kontener = scena.add.container(x, y, czesci);
    // Cinzel może dojść po pierwszym rysunku napisu — wtedy przerysować.
    void krojeZestawu().then(() => {
      if (this.liczba.active) this.liczba.setText(this.liczba.text);
      if (this.numer?.active) this.numer.setText(this.numer.text);
    });
  }

  /** Stwór i liczebność; `null` — puste gniazdo. */
  ustaw(sprite: string | null, ile?: number) {
    const jest = sprite !== null;
    if (jest) {
      this.obraz
        .setTexture(kluczPortretu(sprite, this.opcje.maly))
        .setDisplaySize(this.bok, this.bok)
        .setVisible(true);
    } else {
      this.obraz.setVisible(false);
    }
    // Rama pełnym złotem także przy pustym gnieździe — przygaszona czytała
    // się jak wyłączony przycisk.
    this.rama.setAlpha(1);
    this.numer?.setVisible(!jest);
    this.odznaka.clear();
    const napis = jest && ile !== undefined ? String(ile) : '';
    this.liczba.setText(napis).setVisible(napis !== '');
    if (!napis) return;
    // Tabliczka: drewno ze złotym obrzeżem, POZA obrazem — runda 6: liczba
    // na rogu portretu i tak zachodziła na stwora.
    const h = Math.round(this.liczba.height * 0.9) + 2;
    const zBoku = this.opcje.odznaka === 'bok';
    const w = Math.max(zBoku ? h + 2 : this.bok * 0.46, this.liczba.width + 12);
    const x = zBoku ? this.bok + 8 : (this.bok - w) / 2;
    const y = zBoku ? this.bok - h : this.bok + 8;
    this.odznaka.fillStyle(0x000000, 0.35);
    this.odznaka.fillRoundedRect(x + 1, y + 2, w, h, h / 2.4);
    this.odznaka.fillStyle(0x7a4f14, 1);
    this.odznaka.fillRoundedRect(x - 1, y - 1, w + 2, h + 2, h / 2.2);
    this.odznaka.fillStyle(0xe0a53a, 1);
    this.odznaka.fillRoundedRect(x - 1, y - 1, w + 1, h + 1, h / 2.2);
    this.odznaka.fillStyle(0x3a2410, 1);
    this.odznaka.fillRoundedRect(x + 0.5, y + 0.5, w - 1, h - 1, h / 2.6);
    this.odznaka.fillStyle(0xf8e6b8, 0.12);
    this.odznaka.fillRoundedRect(x + 2, y + 1.5, w - 4, h * 0.35, h / 4);
    this.liczba.setPosition(x + w / 2, y + h / 2);
  }

  zaznacz(tak: boolean) {
    this.poswiata.setVisible(tak);
  }

  /** Przyciemnienie portretu (np. gdy stos jest właśnie przenoszony). */
  przygas(alfa: number) {
    this.obraz.setAlpha(alfa);
  }
}
