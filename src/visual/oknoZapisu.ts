/**
 * Okna zapisu i wczytania gry — jak ekran zapisu w Heroes 3: lista slotów
 * z nazwą misji, dniem gry i datą zapisu, zaznaczenie kliknięciem, zapis
 * albo wczytanie przyciskiem (albo podwójnym kliknięciem), nadpisanie
 * i usunięcie dopiero po potwierdzeniu.
 *
 * Materiał z `zestaw.ts` (pergamin w cienkiej złotej ramie, tabliczki
 * przycisków), ten sam co okno wyjścia i warunków misji na mapie — więc
 * okno wygląda tak samo z mapy przygody i z menu głównego.
 *
 * Moduł nie zna sceny poza `Phaser.Scene`. Wszystko, co rysuje, siedzi
 * w JEDNYM kontenerze-korzeniu, a scena z kilkoma kamerami (mapa przygody)
 * dostaje go przez `naWierzchu` i oddaje kamerze nakładek — raz, bo
 * później dokładane dzieci (pytania, odświeżona lista) jadą z korzeniem.
 * Tekstury zestawu musi wczytać scena (`wczytajZestaw` w `preload`).
 */

import Phaser from 'phaser';
import type { StanMapy } from '../data/mapa';
import { aktywnyProfil } from '../data/profile';
import {
  type OpisZapisu,
  type Slot,
  SLOTY,
  listaZapisow,
  nazwaSlotu,
  usunZapis,
  wczytajGre,
  zapiszGre,
} from '../data/zapis';
import { C } from './theme';
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

export interface OpcjeOkna {
  glebia: number;
  /** Oddaje korzeń okna kamerze nakładek — potrzebne tam, gdzie jest kilka kamer. */
  naWierzchu?: (o: Phaser.GameObjects.GameObject) => void;
  /** Wołane po każdym zamknięciu (także po zapisie i wczytaniu). */
  poZamknieciu?: () => void;
  dzwiek?: () => void;
}

export interface OknoGracza {
  zamknij(): void;
  readonly otwarty: boolean;
}

// ————————————————————————————————————————————————— szkielet

/** Korzeń okna: przyciemnienie łapiące kliknięcia i kontener na całą resztę. */
function korzen(scene: Phaser.Scene, o: { glebia: number; naWierzchu?: (x: Phaser.GameObjects.GameObject) => void }) {
  const W = scene.scale.width;
  const H = scene.scale.height;
  const k = scene.add.container(0, 0).setDepth(o.glebia);
  const cien = scene.add.rectangle(0, 0, W, H, BARWA.cien, 0.6).setOrigin(0).setInteractive();
  k.add(cien);
  o.naWierzchu?.(k);
  return { k, cien, W, H };
}

/** Zamyka okno: gasi tweeny na wszystkich dzieciach (tabliczki podskakują przy kliknięciu) i niszczy korzeń. */
function zniszcz(scene: Phaser.Scene, k: Phaser.GameObjects.Container) {
  const zgas = (o: Phaser.GameObjects.GameObject) => {
    scene.tweens.killTweensOf(o);
    if (o instanceof Phaser.GameObjects.Container) o.list.forEach(zgas);
  };
  zgas(k);
  k.destroy();
}

function przycisk(
  scene: Phaser.Scene,
  k: Phaser.GameObjects.Container,
  x: number,
  y: number,
  w: number,
  tekst: string,
  glowny: boolean,
  akcja: () => void
) {
  const p = new Przycisk(scene, { x, y, w, h: 44, tekst, glowny, rozmiar: 16, akcja });
  k.add(p.kontener);
  return p;
}

// ————————————————————————————————————————————————— pytanie

export interface OpcjaPytania {
  tekst: string;
  /** Złota tabliczka — bezpieczny albo oczekiwany wybór. */
  glowny?: boolean;
  akcja?: () => void;
}

/**
 * Pytanie z dwiema–trzema odpowiedziami na pergaminie. Enter wybiera złotą
 * odpowiedź, Escape — ostatnią (zawsze „Nie"/„Anuluj").
 */
export function pytanie(
  scene: Phaser.Scene,
  o: OpcjeOkna & { tytul: string; tekst: string; opcje: OpcjaPytania[] }
): OknoGracza {
  let otwarty = true;
  const { k, W, H } = korzen(scene, o);
  const ROZ = 15;
  const miarka = scene.add.text(0, 0, '', { fontFamily: KROJ.tytul, fontSize: `${ROZ}px` });
  const szer = o.opcje.map((p) => Math.max(116, Math.ceil(miarka.setText(p.tekst).width) + 56));
  miarka.destroy();
  const ODSTEP = 16;
  const razem = szer.reduce((a, b) => a + b, 0) + ODSTEP * (szer.length - 1);
  const w = Math.max(460, razem + 64);
  const tekst = scene.add.text(W / 2, 0, o.tekst, { ...stylAtramentu(16, 'zwykly', w - 70), align: 'center' }).setOrigin(0.5, 0);
  const h = 150 + tekst.height;
  const x = (W - w) / 2;
  const y = (H - h) / 2;
  k.add(panelPergaminu(scene, x, y, w, h));
  k.add(scene.add.text(W / 2, y + 34, o.tytul, stylEtykiety(24)).setOrigin(0.5));
  tekst.setY(y + 64);
  k.add(tekst);
  let px = W / 2 - razem / 2;
  o.opcje.forEach((op, i) => {
    const p = new Przycisk(scene, {
      x: px + szer[i] / 2,
      y: y + h - 38,
      w: szer[i],
      h: 44,
      tekst: op.tekst,
      glowny: !!op.glowny,
      rozmiar: ROZ,
      akcja: () => wybierz(op),
    });
    k.add(p.kontener);
    px += szer[i] + ODSTEP;
  });
  k.setAlpha(0);
  scene.tweens.add({ targets: k, alpha: 1, duration: 160 });
  o.dzwiek?.();

  const naKlawisz = (e: KeyboardEvent) => {
    if (e.key === 'Escape') wybierz(o.opcje[o.opcje.length - 1]);
    else if (e.key === 'Enter') {
      const zloty = o.opcje.find((p) => p.glowny);
      if (zloty) wybierz(zloty);
    }
  };
  // Klawiatura dopiero od następnej klatki: Enter, który OTWORZYŁ pytanie,
  // nie może go od razu zamknąć.
  scene.time.delayedCall(0, () => {
    if (otwarty) scene.input.keyboard?.on('keydown', naKlawisz);
  });

  function zamknij() {
    if (!otwarty) return;
    otwarty = false;
    scene.input.keyboard?.off('keydown', naKlawisz);
    zniszcz(scene, k);
    o.poZamknieciu?.();
  }
  function wybierz(op: OpcjaPytania) {
    zamknij();
    op.akcja?.();
  }
  return {
    zamknij,
    get otwarty() {
      return otwarty;
    },
  };
}

// ————————————————————————————————————————————————— lista slotów

const DATA = new Intl.DateTimeFormat('pl-PL', { day: '2-digit', month: '2-digit', year: 'numeric' });
const GODZINA = new Intl.DateTimeFormat('pl-PL', { hour: '2-digit', minute: '2-digit' });

/** Zapis jednym zdaniem — do pytań o nadpisanie i usunięcie. */
export const zapisSlowami = (z: OpisZapisu) => `„${z.nazwa}", ${z.kiedyWGrze}`;

type Tryb = 'zapisz' | 'wczytaj';

interface OpcjeListy extends OpcjeOkna {
  tryb: Tryb;
  /** Stan do zapisania (tryb „zapisz"). */
  stan?: StanMapy;
  /** Tryb „wczytaj": zapytać przed wczytaniem (na mapie — przepadnie bieżąca gra). */
  pytaj?: boolean;
  poZapisie?: (slot: Slot, udany: boolean) => void;
  poWczytaniu?: (stan: StanMapy, slot: Slot) => void;
}

const W_OKNA = 640;
const WIERSZ = 46;
const ODSTEP_W = 5;

function oknoSlotow(scene: Phaser.Scene, o: OpcjeListy): OknoGracza {
  let otwarty = true;
  /** Otwarte pytanie nad oknem — do tego czasu okno nie słucha klawiatury. */
  let pytanieOtwarte = false;
  const { k, W, H } = korzen(scene, o);
  const zapis = o.tryb === 'zapisz';
  // Autozapisu nie nadpisuje się ręcznie — pisze go gra na początku dnia.
  const sloty = zapis ? SLOTY.filter((s) => s !== 'auto') : SLOTY;
  const hListy = sloty.length * (WIERSZ + ODSTEP_W) - ODSTEP_W;
  const h = 112 + hListy + 76;
  const x = (W - W_OKNA) / 2;
  const y = Math.max(8, (H - h) / 2);
  k.add(panelPergaminu(scene, x, y, W_OKNA, h));
  k.add(scene.add.text(W / 2, y + 30, zapis ? 'Zapisz grę' : 'Wczytaj grę', stylEtykiety(26)).setOrigin(0.5));
  const gracz = aktywnyProfil()?.imie;
  k.add(
    scene.add
      .text(W / 2, y + 62, gracz ? `Zapisy gracza: ${gracz}` : 'Zapisy gry', {
        ...stylAtramentu(15, 'miekki'),
        fontFamily: KROJ.kursywa,
      })
      .setOrigin(0.5)
  );
  k.add(ozdobnik(scene, x + 40, y + 84, W_OKNA - 80));

  const listaX = x + 26;
  const listaW = W_OKNA - 52;
  const listaY = y + 98;
  let opisy: (OpisZapisu | null)[] = [];
  let wybrany: Slot | null = null;
  let wiersze = scene.add.container(0, 0);
  k.add(wiersze);
  /** Do podwójnego kliknięcia — poza `odswiez`, bo pierwsze kliknięcie przebudowuje listę. */
  let ostatniKlik = { slot: null as Slot | null, czas: 0 };

  const przyciskiY = y + h - 42;
  const glowny = przycisk(scene, k, W / 2 - (zapis ? 80 : 150), przyciskiY, 170, zapis ? 'Zapisz' : 'Wczytaj', true, () => akcja());
  const usun = zapis ? undefined : przycisk(scene, k, W / 2 + 26, przyciskiY, 130, 'Usuń', false, () => zapytajOUsuniecie());
  przycisk(scene, k, W / 2 + (zapis ? 100 : 180), przyciskiY, 140, 'Anuluj', false, () => zamknij());

  const opisSlotu = (s: Slot) => opisy[SLOTY.indexOf(s)] ?? null;

  function odswiez() {
    opisy = listaZapisow();
    zniszcz(scene, wiersze);
    wiersze = scene.add.container(0, 0);
    k.addAt(wiersze, k.list.indexOf(glowny.kontener));
    sloty.forEach((slot, i) => {
      const z = opisSlotu(slot);
      const wy = listaY + i * (WIERSZ + ODSTEP_W);
      const zaznaczony = wybrany === slot;
      const tlo = scene.add.graphics();
      const maluj = (nad: boolean) => {
        tlo.clear();
        if (zaznaczony) {
          tlo.fillStyle(C.goldLight, 0.95);
          tlo.fillRoundedRect(listaX, wy, listaW, WIERSZ, 8);
          tlo.lineStyle(2.5, C.goldDeep, 1);
          tlo.strokeRoundedRect(listaX, wy, listaW, WIERSZ, 8);
        } else {
          tlo.fillStyle(BARWA.papierCiemny, nad ? 0.95 : 0.55);
          tlo.fillRoundedRect(listaX, wy, listaW, WIERSZ, 8);
          tlo.lineStyle(1, BARWA.kreska, nad ? 0.8 : 0.35);
          tlo.strokeRoundedRect(listaX, wy, listaW, WIERSZ, 8);
        }
      };
      maluj(false);
      const med = medalion(scene, listaX + 26, wy + WIERSZ / 2, 16, slot === 'auto' ? 0x2f4a22 : 0x3a2210);
      const nr = scene.add
        .text(listaX + 26, wy + WIERSZ / 2, slot === 'auto' ? 'A' : String(slot), {
          fontFamily: KROJ.tytul,
          fontSize: '15px',
          color: '#ffe9a8',
        })
        .setOrigin(0.5);
      const elementy: Phaser.GameObjects.GameObject[] = [tlo, med, nr];
      const tx = listaX + 54;
      if (z) {
        elementy.push(
          scene.add.text(tx, wy + 5, z.nazwa, { ...stylEtykiety(16, BARWA.atrament) }).setOrigin(0, 0),
          scene.add
            .text(tx, wy + 25, `${nazwaSlotu(slot)} · ${z.bohater} · ${z.kiedyWGrze}`, stylAtramentu(13, 'miekki'))
            .setOrigin(0, 0),
          scene.add
            .text(listaX + listaW - 14, wy + 7, z.zapisano.getTime() ? DATA.format(z.zapisano) : '', stylAtramentu(13, 'miekki'))
            .setOrigin(1, 0),
          scene.add
            .text(
              listaX + listaW - 14,
              wy + 25,
              z.przeniesiony ? 'z dawnej wersji' : z.zapisano.getTime() ? GODZINA.format(z.zapisano) : '',
              stylAtramentu(13, 'miekki')
            )
            .setOrigin(1, 0)
        );
      } else {
        elementy.push(
          scene.add
            .text(tx, wy + WIERSZ / 2, slot === 'auto' ? 'Autozapis — jeszcze pusty' : `${nazwaSlotu(slot)} — pusty`, {
              ...stylAtramentu(15, 'miekki'),
              fontFamily: KROJ.kursywa,
            })
            .setOrigin(0, 0.5)
        );
      }
      const strefa = scene.add.zone(listaX, wy, listaW, WIERSZ).setOrigin(0).setInteractive({ useHandCursor: true });
      strefa.on('pointerover', () => maluj(true));
      strefa.on('pointerout', () => maluj(false));
      strefa.on('pointerdown', () => {
        if (pytanieOtwarte) return;
        const teraz = scene.time.now;
        const podwojny = ostatniKlik.slot === slot && teraz - ostatniKlik.czas < 400;
        ostatniKlik = { slot, czas: teraz };
        wybierz(slot);
        if (podwojny) akcja();
      });
      elementy.push(strefa);
      wiersze.add(elementy);
    });
    const z = wybrany !== null ? opisSlotu(wybrany) : null;
    glowny.ustaw(wybrany !== null && (zapis || !!z));
    usun?.ustaw(!!z);
  }

  function wybierz(slot: Slot) {
    if (wybrany === slot) return;
    wybrany = slot;
    o.dzwiek?.();
    // Przebudowa listy w środku obsługi kliknięcia strefy, którą niszczymy —
    // dopiero w następnej klatce, bo Phaser jeszcze po niej chodzi.
    scene.time.delayedCall(0, () => {
      if (otwarty) odswiez();
    });
  }

  function zapytaj(tytul: string, tekst: string, opcje: OpcjaPytania[]) {
    pytanieOtwarte = true;
    pytanie(scene, {
      glebia: o.glebia + 10,
      naWierzchu: o.naWierzchu,
      dzwiek: o.dzwiek,
      tytul,
      tekst,
      opcje,
      poZamknieciu: () => {
        // Ta sama klatka co Enter w pytaniu — okno nie może go złapać drugi raz.
        scene.time.delayedCall(0, () => (pytanieOtwarte = false));
      },
    });
  }

  function akcja() {
    if (pytanieOtwarte || wybrany === null) return;
    const slot = wybrany;
    const z = opisSlotu(slot);
    if (zapis) {
      if (!o.stan) return;
      const stan = o.stan;
      const zrob = () => {
        const udany = zapiszGre(stan, slot);
        zamknij();
        o.poZapisie?.(slot, udany);
      };
      if (!z) return zrob();
      zapytaj('Nadpisać zapis?', `W miejscu „${nazwaSlotu(slot)}" jest już gra:\n${zapisSlowami(z)}.\nZastąpić ją obecną?`, [
        { tekst: 'Nadpisz', akcja: zrob },
        { tekst: 'Nie', glowny: true },
      ]);
      return;
    }
    if (!z) return;
    const wczytaj = () => {
      const stan = wczytajGre(slot);
      if (!stan) {
        odswiez();
        return;
      }
      zamknij();
      o.poWczytaniu?.(stan, slot);
    };
    if (!o.pytaj) return wczytaj();
    zapytaj('Wczytać grę?', `${zapisSlowami(z)}.\nTo, co zrobiłeś od ostatniego zapisu, przepadnie.`, [
      { tekst: 'Wczytaj', glowny: true, akcja: wczytaj },
      { tekst: 'Nie' },
    ]);
  }

  function zapytajOUsuniecie() {
    if (pytanieOtwarte || wybrany === null) return;
    const slot = wybrany;
    const z = opisSlotu(slot);
    if (!z) return;
    zapytaj('Usunąć zapis?', `${zapisSlowami(z)}\nzniknie na zawsze.`, [
      {
        tekst: 'Usuń',
        akcja: () => {
          usunZapis(slot);
          wybrany = null;
          odswiez();
        },
      },
      { tekst: 'Nie', glowny: true },
    ]);
  }

  // Zaznaczenie na starcie: przy zapisie pierwszy pusty slot, przy
  // wczytaniu najświeższy zapis — to, czego gracz szuka najczęściej.
  opisy = listaZapisow();
  if (zapis) wybrany = sloty.find((s) => !opisSlotu(s)) ?? null;
  else {
    const naj = opisy
      .filter((z): z is OpisZapisu => !!z)
      .sort((a, b) => b.zapisano.getTime() - a.zapisano.getTime())[0];
    wybrany = naj?.slot ?? null;
  }
  odswiez();

  k.setAlpha(0);
  scene.tweens.add({ targets: k, alpha: 1, duration: 180 });
  o.dzwiek?.();

  const naKlawisz = (e: KeyboardEvent) => {
    if (pytanieOtwarte) return;
    if (e.key === 'Escape') zamknij();
    else if (e.key === 'Enter') akcja();
    else if (e.key === 'Delete' && !zapis) zapytajOUsuniecie();
    else if (/^[1-6]$/.test(e.key)) wybierz(Number(e.key));
  };
  scene.time.delayedCall(0, () => {
    if (otwarty) scene.input.keyboard?.on('keydown', naKlawisz);
  });

  function zamknij() {
    if (!otwarty) return;
    otwarty = false;
    scene.input.keyboard?.off('keydown', naKlawisz);
    zniszcz(scene, k);
    o.poZamknieciu?.();
  }

  return {
    zamknij,
    get otwarty() {
      return otwarty;
    },
  };
}

/** Okno „Zapisz grę": sześć slotów profilu, nadpisanie po potwierdzeniu. */
export function pokazZapis(
  scene: Phaser.Scene,
  stan: StanMapy,
  o: OpcjeOkna & { poZapisie?: (slot: Slot, udany: boolean) => void }
): OknoGracza {
  return oknoSlotow(scene, { ...o, tryb: 'zapisz', stan });
}

/** Okno „Wczytaj grę": autozapis i sześć slotów profilu. */
export function pokazWczytanie(
  scene: Phaser.Scene,
  o: OpcjeOkna & { pytaj?: boolean; poWczytaniu: (stan: StanMapy, slot: Slot) => void }
): OknoGracza {
  return oknoSlotow(scene, { ...o, tryb: 'wczytaj' });
}
