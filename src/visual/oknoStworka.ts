/**
 * Okno stworka — odpowiednik okna „Creature Info" z Heroes 3 / HotA.
 *
 * W Heroes 3 kliknięcie prawym przyciskiem (albo drugi klik w zaznaczony
 * oddział) otwiera kartę: portret, statystyki, liczebność i przycisk
 * „Dismiss". Tu to samo, na pergaminie w złotej ramie, z tabliczkami
 * z zestawu. Okno nie wie nic o scenie, z której je otwarto — dostaje
 * oddział i (opcjonalnie) co zrobić przy zwolnieniu. Dzięki temu to samo
 * okno otwiera miasto, ekran bohatera i każdy inny ekran, na którym widać
 * armię.
 *
 * Statystyki czytamy z definicji jednostki (`factions.ts` → `UnitDef`), a nie
 * z osobnego opisu: te same liczby prowadzą bitwę, więc okno nie może
 * zacząć kłamać po zmianie bilansu. Model walki nie ma obrony ani licznika
 * strzał (strzelec strzela bez limitu) — okno pokazuje to, co w grze
 * naprawdę działa, zamiast wymyślać kolumny z Heroes 3.
 */

import Phaser from 'phaser';
import type { Oddzial } from '../data/mapa';
import { defStworka, napisPoziomu, postepStworka } from '../data/stworki';
import { ABILITIES, TYPE_INFO, typeMatchup, type UnitDef } from '../data/units';
import { etapStworka, liniaStworka, nastepnyEtap, progEwolucji } from '../data/ewolucje';
import { MINI, MINI_TYPE, buildIcons, miniIcon, type MiniKey } from './icons';
import { pytanie } from './oknoZapisu';
import {
  BARWA,
  KROJ,
  Przycisk,
  medalion,
  ozdobnik,
  panelPergaminu,
  stylAtramentu,
  stylEtykiety,
} from './zestaw';

export interface OpcjeOknaStworka {
  oddzial: Oddzial;
  glebia: number;
  /**
   * Zwolnienie oddziału. Brak pola — okno tylko informuje (np. oddział
   * przeciwnika). `mozna: false` pokazuje wyłączoną tabliczkę i powód.
   */
  zwolnij?: { mozna: boolean; powod?: string; akcja: () => void };
  /**
   * Przełącznik „Nie ewoluuj" (flaga `bezEwolucji`). Brak pola — okno nie
   * pokazuje przycisku (stworek przeciwnika albo nieaktywny pasek).
   */
  przelaczEwolucje?: () => void;
  /** Podpis nad liczebnością, np. „w garnizonie" / „u bohatera". */
  gdzie?: string;
  poZamknieciu?: () => void;
  /** Oddaje korzeń okna kamerze nakładek — tam, gdzie scena ma kilka kamer. */
  naWierzchu?: (o: Phaser.GameObjects.GameObject) => void;
}

export interface OknoStworka {
  zamknij(): void;
  readonly otwarty: boolean;
}

/**
 * Definicja stworka z mapy — ta sama droga co w `BattleScene`: gatunek
 * przeskalowany poziomem i etapem ewolucji (`defStworka`).
 */
export function definicjaOddzialu(o: Oddzial): UnitDef | undefined {
  return defStworka(o);
}

const SZER = 560;
const WYS = 410;

export function pokazOknoStworka(scena: Phaser.Scene, o: OpcjeOknaStworka): OknoStworka {
  let otwarty = true;
  buildIcons(scena);
  const W = scena.scale.width;
  const H = scena.scale.height;
  const k = scena.add.container(0, 0).setDepth(o.glebia);
  const zaslona = scena.add.rectangle(0, 0, W, H, BARWA.cien, 0.6).setOrigin(0).setInteractive();
  k.add(zaslona);
  o.naWierzchu?.(k);

  const od = o.oddzial;
  const def = definicjaOddzialu(od);
  const x = Math.round((W - SZER) / 2);
  const y = Math.round((H - WYS) / 2);
  k.add(panelPergaminu(scena, x, y, SZER, WYS));

  // Nagłówek: nazwa i poziom, pod nimi ozdobnik — jak tytuł karty w księdze.
  k.add(scena.add.text(x + SZER / 2, y + 28, od.nazwa, stylEtykiety(24)).setOrigin(0.5));
  const zywiol = def ? TYPE_INFO[def.type] : undefined;
  k.add(
    scena.add
      .text(
        x + SZER / 2,
        y + 54,
        `Poziom ${od.poziom}${zywiol ? ` · żywioł: ${zywiol.label}` : ''}${od.omdlaly ? ' · zemdlony' : ''}`,
        stylAtramentu(14, 'miekki')
      )
      .setOrigin(0.5)
  );
  k.add(ozdobnik(scena, x + 60, y + 74, SZER - 120));

  // Portret w medalionie po lewej, liczebność na złotej tabliczce pod nim.
  const px = x + 100;
  const py = y + 150;
  const r = 62;
  k.add(medalion(scena, px, py, r, BARWA.papierCiemny));
  const klucz = `p-${od.sprite}`;
  const portret = scena.add.image(px, py - 2, scena.textures.exists(klucz) ? klucz : '__MISSING');
  const dopasuj = () => portret.setScale(Math.min(1, (r * 2 - 22) / Math.max(portret.width, portret.height)));
  dopasuj();
  k.add(portret);
  if (!scena.textures.exists(klucz)) {
    // Ekran, który nie wczytał tego stworka (np. oddział z innej frakcji) —
    // dociągamy portret w locie zamiast pokazywać pustą ramkę.
    scena.load.image(klucz, `${import.meta.env.BASE_URL}sprites/${od.sprite}.png`);
    scena.load.once(`filecomplete-image-${klucz}`, () => {
      if (!portret.active) return;
      portret.setTexture(klucz).setVisible(true);
      dopasuj();
    });
    portret.setVisible(false);
    scena.load.start();
  }
  const tabliczka = new Przycisk(scena, {
    x: px,
    y: py + r + 22,
    w: 110,
    h: 34,
    tekst: od.ile > 1 ? `× ${od.ile}` : napisPoziomu(od.poziom),
    glowny: true,
    rozmiar: 17,
    akcja: () => {},
  }).szyld();
  k.add(tabliczka.kontener);
  if (o.gdzie) {
    k.add(scena.add.text(px, py + r + 50, o.gdzie, stylAtramentu(12, 'miekki')).setOrigin(0.5, 0));
  }

  // Wiersze statystyk: znak z kompletu mini (atramentem), nazwa, wartość.
  const kx = x + 196;
  let ky = y + 92;
  const wiersz = (znak: MiniKey, etykieta: string, wartosc: string, barwaZnaku = 0x7a4a1c) => {
    k.add(miniIcon(scena, znak, kx + 9, ky + 9, 18, barwaZnaku));
    k.add(scena.add.text(kx + 24, ky, etykieta, stylEtykiety(12, BARWA.atramentMiekki)).setOrigin(0, 0));
    const t = scena.add.text(kx + 136, ky - 1, wartosc, { ...stylAtramentu(14), wordWrap: { width: x + SZER - 22 - (kx + 136) } });
    k.add(t);
    ky += Math.max(22, t.height + 4);
  };
  if (def) {
    const mecz = typeMatchup(def.type);
    wiersz(MINI.attack, 'Atak', od.ile > 1 ? `${def.atk} (stado: ${def.atk * od.ile})` : String(def.atk));
    wiersz(MINI.life, 'Życie', od.ile > 1 ? `${def.hp} (stado: ${def.hp * od.ile})` : String(def.hp));
    const post = postepStworka(od);
    wiersz(
      MINI.forecast,
      'Doświadczenie',
      post.doNastepnego ? `${post.wPoziomie} / ${post.doNastepnego} do poziomu ${od.poziom + 1}` : 'najwyższy poziom'
    );
    wiersz(def.flying ? MINI.fly : MINI.move, 'Szybkość', def.flying ? `${def.move} — lata` : String(def.move));
    wiersz(
      MINI.reach,
      'Strzały',
      def.shooter ? `strzela, pełna siła do ${def.shootRange} pól` : 'walczy wręcz'
    );
    wiersz(MINI_TYPE[def.type], 'Żywioł', TYPE_INFO[def.type].label, TYPE_INFO[def.type].color);
    wiersz(MINI.strong, 'Mocny przeciw', TYPE_INFO[mecz.strong].dative);
    wiersz(MINI.weak, 'Słaby wobec', TYPE_INFO[mecz.weak].genitive);
    wiersz(
      MINI.ability,
      'Umiejętność',
      def.ability ? `${ABILITIES[def.ability].name} — ${ABILITIES[def.ability].desc}` : 'brak'
    );
  } else {
    wiersz(MINI.ability, 'Opis', 'Nieznany stworek.');
  }

  // Ewolucja — linia stworka (`ewolucje.ts`); ewoluuje w Ośrodku Ewolucji.
  const linia = liniaStworka(od.sprite);
  if (linia) {
    const etap = etapStworka(od.sprite);
    const dalej = nastepnyEtap(od.sprite);
    const prog = progEwolucji(od.sprite);
    const kiedy = !dalej
      ? ', forma ostateczna'
      : od.bezEwolucji
        ? `. Trener nie pozwala mu ewoluować w: ${dalej.nazwa}`
        : prog !== undefined
          ? `. Na poziomie ${prog} ewoluuje w: ${dalej.nazwa}`
          : `. W ${dalej.nazwa} ewoluuje tylko od kamienia (Ośrodek Ewolucji)`;
    const tekst = `Ewolucja: etap ${etap + 1} z ${linia.etapy.length}${kiedy}`;
    k.add(
      scena.add
        .text(px, py + r + (o.gdzie ? 70 : 52), tekst, {
          fontFamily: KROJ.kursywa,
          fontSize: '13px',
          color: BARWA.atramentMiekki,
          align: 'center',
          wordWrap: { width: 170 },
        })
        .setOrigin(0.5, 0)
    );
  }

  // Tabliczki: „Wypuść" (drewno, z pytaniem), „Nie ewoluuj" (drewno,
  // przełącznik — tylko gdy stworek ma dokąd ewoluować) i „Zamknij" (złoto).
  const dolY = y + WYS - 38;
  const przelacznik = o.przelaczEwolucje && nastepnyEtap(od.sprite) ? o.przelaczEwolucje : undefined;
  // Trzy tabliczki dzielą dół okna na trzy, dwie — na dwie.
  const krok = przelacznik ? 180 : 95;
  const szer = przelacznik ? 150 : 160;
  if (przelacznik) {
    const napis = () => (od.bezEwolucji ? 'Pozwól ewoluować' : 'Nie ewoluuj');
    const p = new Przycisk(scena, {
      x: x + SZER / 2,
      y: dolY,
      w: szer,
      h: 42,
      tekst: napis(),
      rozmiar: 14,
      akcja: () => {
        przelacznik();
        p.setLabel(napis(), { rozmiar: 14 });
      },
    });
    k.add(p.kontener);
  }
  let pytanieOkno: { readonly otwarty: boolean } | undefined;
  if (o.zwolnij) {
    const zw = o.zwolnij;
    const przyciskZwolnij = new Przycisk(scena, {
      x: x + SZER / 2 - krok,
      y: dolY,
      w: szer,
      h: 42,
      tekst: 'Wypuść',
      rozmiar: 16,
      akcja: () => {
        pytanieOkno = pytanie(scena, {
          glebia: o.glebia + 20,
          naWierzchu: o.naWierzchu,
          tytul: 'Wypuścić stworka?',
          tekst: `${od.nazwa} (${napisPoziomu(od.poziom)}) wróci na wolność i już nie wróci.`,
          opcje: [
            {
              tekst: 'Wypuść',
              akcja: () => {
                zamknij();
                zw.akcja();
              },
            },
            { tekst: 'Zostaw', glowny: true },
          ],
        });
      },
    }).ustaw(zw.mozna);
    k.add(przyciskZwolnij.kontener);
    if (!zw.mozna && zw.powod) {
      k.add(
        scena.add
          .text(x + SZER / 2, y + WYS - 66, zw.powod, { ...stylAtramentu(12, 'czerwony'), align: 'center' })
          .setOrigin(0.5, 1)
      );
    }
  }
  const przyciskZamknij = new Przycisk(scena, {
    x: o.zwolnij || przelacznik ? x + SZER / 2 + krok : x + SZER / 2,
    y: dolY,
    w: szer,
    h: 42,
    tekst: 'Zamknij',
    glowny: true,
    rozmiar: 16,
    akcja: () => zamknij(),
  });
  k.add(przyciskZamknij.kontener);

  zaslona.on('pointerdown', () => zamknij());
  k.setAlpha(0);
  scena.tweens.add({ targets: k, alpha: 1, duration: 140 });

  const naKlawisz = (e: KeyboardEvent) => {
    if (pytanieOkno?.otwarty) return;
    if (e.key === 'Escape' || e.key === 'Enter') zamknij();
  };
  scena.time.delayedCall(0, () => {
    if (otwarty) scena.input.keyboard?.on('keydown', naKlawisz);
  });

  function zamknij() {
    if (!otwarty) return;
    otwarty = false;
    scena.input.keyboard?.off('keydown', naKlawisz);
    const zgas = (x: Phaser.GameObjects.GameObject) => {
      scena.tweens.killTweensOf(x);
      if (x instanceof Phaser.GameObjects.Container) x.list.forEach(zgas);
    };
    zgas(k);
    k.destroy();
    o.poZamknieciu?.();
  }

  return {
    zamknij,
    get otwarty() {
      return otwarty;
    },
  };
}
