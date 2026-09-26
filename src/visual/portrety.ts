import Phaser from 'phaser';
import { FACTIONS } from '../data/factions';

/**
 * Portrety stworów — to, co stoi w slotach armii, na karcie werbunku,
 * w kolejce tur i na ekranie kampanii.
 *
 * Wcześniej w każdym z tych miejsc stał CAŁY stworek zmniejszony do slotu:
 * przy 28 px kolorowa plamka z nóżkami, bez twarzy, zawieszona w pustym
 * gnieździe. W Heroes 3 portret stwora to osobny obrazek — popiersie na
 * malowanym tle jego miasta, w ciemnej ramce — i dopiero dzięki temu rząd
 * armii czyta się przy 32 px. Nasze portrety liczy
 * `tools/stworki_portrety.py` z mistrzów (`assets/stworki/`) i z panoram
 * miast (`public/miasto/`), więc po przemalowaniu stworka wystarczy puścić
 * skrypt jeszcze raz.
 *
 * Trzy kadry, bo mały nie jest zmniejszonym dużym:
 *  - duży (`pd-<id>`, 128 px): głowa z tułowiem — ekran bohatera, karta
 *    werbunku, ekran kampanii;
 *  - mały (`pm-<id>`, 48 px): ciasno na twarz, ciemniejsze tło — panel
 *    armii na mapie, załoga w mieście, tytuły wyniku;
 *  - okrągły (`po-<id>`, 56 px): kadr małego wycięty w koło — do okrągłych
 *    medalionów (kolejka tur w bitwie, karta nagrody w kampanii). Koło jest
 *    w pliku, a nie maską: maska geometryczna liczy się we współrzędnych
 *    świata i nie jedzie razem z kontenerem, który się rusza.
 * Phaser zmniejsza bez mipmap, więc do slotu 28 px idzie plik 48 px, a nie
 * 128 px — z tego drugiego próbkowałby co piąty piksel i twarz by się
 * szarpała.
 */

export const PORTRET_DUZY = 128;
export const PORTRET_MALY = 48;

/** Klucz tekstury portretu. */
export function kluczPortretu(sprite: string, maly = false) {
  return `${maly ? 'pm' : 'pd'}-${sprite}`;
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
  rozmiary: { duze?: boolean; male?: boolean; okragle?: boolean } = { duze: true, male: true },
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
