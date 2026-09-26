/**
 * Pasek armii z zarządzaniem — wspólny dla miasta i ekranu bohatera.
 *
 * W Heroes 3 / HotA ekran miasta i ekran bohatera mają ten sam rząd siedmiu
 * slotów i ten sam zestaw gestów:
 *  - klik w oddział zaznacza go, klik w inny slot przenosi / łączy (ten sam
 *    gatunek) / zamienia (inny gatunek) — także między dwoma paskami
 *    (garnizon ↔ bohater odwiedzający);
 *  - przeciągnięcie robi to samo jednym ruchem;
 *  - Shift przy drugim kliku (albo przy upuszczeniu), albo tabliczka
 *    „Podziel", otwiera okno podziału z suwakiem; Ctrl odkłada jednego
 *    stworka bez okna;
 *  - drugi klik w zaznaczony oddział, prawy klik albo przytrzymanie palca
 *    otwiera okno stworka (`oknoStworka.ts`).
 *
 * Jeden obiekt `PanelArmii` prowadzi WSZYSTKIE paski ekranu naraz, bo
 * zaznaczenie jest jedno: wybrany oddział w garnizonie i klik w slot
 * bohatera to jeden ruch, a nie dwa niezależne paski.
 *
 * Arytmetyka (co wolno, ile wolno oddać, zasada „bohater nie zostaje bez
 * armii") siedzi w `data/armia.ts` — tu jest tylko rysowanie i gesty.
 */

import Phaser from 'phaser';
import {
  type Armia,
  maksPodzialuMiedzy,
  ostatniStos,
  podzielMiedzy,
  przeniesMiedzy,
  zwolnij,
  SLOTY_ARMII,
} from '../data/armia';
import { pokazOknoStworka, type OknoStworka } from './oknoStworka';
import { C } from './theme';
import { BARWA, KROJ, Przycisk, medalion, ozdobnik, panelPergaminu, stylAtramentu, stylEtykiety } from './zestaw';

export interface OpcjePaska {
  /** Lewy górny róg pierwszego slotu. */
  x: number;
  y: number;
  slotW: number;
  slotH: number;
  odstep?: number;
  /** Funkcja, nie tablica: scena potrafi podmienić armię (np. po bitwie). */
  armia: () => Armia;
  /** Armia bohatera — nie może zostać bez ostatniego stosu. */
  chroniona?: boolean;
  /** Czy pasek przyjmuje gesty (np. bohater poza zamkiem — nie). */
  aktywny?: () => boolean;
  /** Co powiedzieć po kliknięciu w nieaktywny pasek. */
  powodNieaktywny?: string;
  /** „w garnizonie", „u bohatera" — do okna stworka i komunikatów. */
  gdzie: string;
  /** „do garnizonu", „do bohatera" — cel w oknie podziału. */
  dokad: string;
}

export interface OpcjePaneluArmii {
  glebia: number;
  /** Komunikat dla gracza (pole podpowiedzi sceny). */
  powiedz: (tekst: string) => void;
  /** Po każdej udanej zmianie armii — scena zapisuje stan i odświeża resztę. */
  poZmianie: (opis: string) => void;
}

interface WidokSlotu {
  kontener: Phaser.GameObjects.Container;
  tlo: Phaser.GameObjects.Graphics;
  zaznaczenie: Phaser.GameObjects.Graphics;
  rysunek: Phaser.GameObjects.Image;
  licznik: Phaser.GameObjects.Text;
  x: number;
  y: number;
}

interface Pasek extends OpcjePaska {
  sloty: WidokSlotu[];
}

interface Miejsce {
  pasek: Pasek;
  slot: number;
}

/** Po ilu pikselach ruchu wciśnięcie staje się przeciąganiem. */
const PROG_CIAGNIECIA = 8;
/** Przytrzymanie (tablet) — tyle ms do okna stworka. */
const PRZYTRZYMANIE_MS = 520;

export class PanelArmii {
  private scena: Phaser.Scene;
  private o: OpcjePaneluArmii;
  private paski: Pasek[] = [];
  /** Zaznaczony oddział — jeden na cały ekran. */
  private wybor: Miejsce | null = null;
  /** Po „Podziel": następny klik w slot otwiera okno podziału. */
  private trybPodzialu = false;
  private wcisk: { m: Miejsce; x: number; y: number; shift: boolean; ctrl: boolean } | null = null;
  private ciagnie = false;
  private duch: Phaser.GameObjects.Container | null = null;
  private zegarPrzytrzymania: Phaser.Time.TimerEvent | null = null;
  private okno: OknoStworka | null = null;
  private oknoPodzialuOtwarte = false;
  /** Uchwyt dla sond: otwarte okno podziału (ustaw liczbę, zatwierdź). */
  podzial: { ustaw(v: number): void; zatwierdz(): void; zamknij(): void; readonly ile: number; maks: number } | null =
    null;

  constructor(scena: Phaser.Scene, o: OpcjePaneluArmii) {
    this.scena = scena;
    this.o = o;
    // Prawy klik to okno stworka — menu przeglądarki by je przykryło.
    scena.input.mouse?.disableContextMenu();
    scena.input.on('pointermove', this.ruch, this);
    scena.input.on('pointerup', this.puszczono, this);
    scena.events.once('shutdown', () => this.zniszcz());
  }

  /** Czy jakieś okno panelu (stworka, podziału) jest otwarte. */
  get oknoOtwarte() {
    return this.oknoPodzialuOtwarte || !!this.okno?.otwarty;
  }

  /** Czy jest zaznaczony oddział (dla tabliczki „Podziel"). */
  get zaznaczony() {
    return this.wybor !== null;
  }

  dodajPasek(opcje: OpcjePaska) {
    const pasek: Pasek = { odstep: 4, ...opcje, sloty: [] };
    const { slotW, slotH } = pasek;
    for (let i = 0; i < SLOTY_ARMII; i++) {
      const x = pasek.x + i * (slotW + (pasek.odstep ?? 4));
      const y = pasek.y;
      const tlo = this.scena.add.graphics();
      const zaznaczenie = this.scena.add.graphics().setVisible(false);
      zaznaczenie.fillStyle(0xffe9a8, 0.6);
      zaznaczenie.fillRoundedRect(0, 0, slotW, slotH, 4);
      zaznaczenie.lineStyle(3, C.goldDeep, 1);
      zaznaczenie.strokeRoundedRect(-1, -1, slotW + 2, slotH + 2, 5);
      zaznaczenie.lineStyle(1.5, C.goldLight, 0.9);
      zaznaczenie.strokeRoundedRect(1.5, 1.5, slotW - 3, slotH - 3, 3);
      const rysunek = this.scena.add.image(slotW / 2, slotH / 2 - 2, '__DEFAULT').setVisible(false);
      const licznik = this.scena.add
        .text(slotW - 4, slotH - 1, '', {
          fontFamily: KROJ.tytul,
          fontSize: '13px',
          color: BARWA.krem,
          stroke: BARWA.braz,
          strokeThickness: 3,
        })
        .setOrigin(1, 1);
      const kontener = this.scena.add
        .container(x, y, [tlo, zaznaczenie, rysunek, licznik])
        .setDepth(this.o.glebia);
      const m: Miejsce = { pasek, slot: i };
      this.scena.add
        .zone(x, y, slotW, slotH)
        .setOrigin(0, 0)
        .setDepth(this.o.glebia + 2)
        .setInteractive({ useHandCursor: true })
        .on('pointerdown', (p: Phaser.Input.Pointer) => this.wcisnieto(m, p));
      pasek.sloty.push({ kontener, tlo, zaznaczenie, rysunek, licznik, x, y });
    }
    this.paski.push(pasek);
    this.odswiez();
  }

  /** Przerysowuje wszystkie sloty z bieżących armii. */
  odswiez() {
    for (const pasek of this.paski) {
      const armia = pasek.armia();
      const aktywny = pasek.aktywny?.() ?? true;
      pasek.sloty.forEach((s, i) => {
        const o = armia[i];
        const wybrany = this.wybor?.pasek === pasek && this.wybor.slot === i;
        s.tlo.clear();
        s.tlo.fillStyle(0x8a5a2a, o ? 0.2 : 0.12);
        s.tlo.fillRoundedRect(0, 0, pasek.slotW, pasek.slotH, 4);
        s.tlo.lineStyle(1.2, BARWA.kreska, 0.6);
        s.tlo.strokeRoundedRect(0, 0, pasek.slotW, pasek.slotH, 4);
        s.zaznaczenie.setVisible(wybrany);
        s.kontener.setAlpha(aktywny ? 1 : 0.55);
        if (o) {
          const klucz = `p-${o.sprite}`;
          if (this.scena.textures.exists(klucz)) {
            s.rysunek.setTexture(klucz).setVisible(true);
            s.rysunek.setScale(Math.min(1, (pasek.slotH - 6) / s.rysunek.height, (pasek.slotW - 4) / s.rysunek.width));
          } else s.rysunek.setVisible(false);
          s.licznik.setText(String(o.ile));
        } else {
          s.rysunek.setVisible(false);
          s.licznik.setText('');
        }
      });
    }
  }

  /**
   * Tabliczka „Podziel": z zaznaczonym oddziałem następny klik w slot (pusty
   * albo z tym samym gatunkiem) otwiera okno podziału. Drugi raz — rezygnacja.
   */
  podziel() {
    if (this.oknoOtwarte) return;
    if (!this.wybor) {
      this.o.powiedz('Najpierw kliknij oddział, który chcesz podzielić.');
      return;
    }
    this.trybPodzialu = !this.trybPodzialu;
    this.o.powiedz(
      this.trybPodzialu
        ? 'Kliknij pusty slot (albo slot z tym samym stworkiem) — tam przejdzie część oddziału.'
        : 'Podział odwołany.'
    );
  }

  /** Zdejmuje zaznaczenie. */
  odznacz() {
    this.wybor = null;
    this.trybPodzialu = false;
    this.odswiez();
  }

  zniszcz() {
    this.scena.input.off('pointermove', this.ruch, this);
    this.scena.input.off('pointerup', this.puszczono, this);
    this.zegarPrzytrzymania?.remove();
    this.duch?.destroy();
    this.duch = null;
    this.okno?.zamknij();
    this.okno = null;
    this.paski = [];
    this.wybor = null;
  }

  // ————————————————————————————————————————— gesty

  private wcisnieto(m: Miejsce, p: Phaser.Input.Pointer) {
    if (this.oknoOtwarte) return;
    const oddzial = m.pasek.armia()[m.slot];
    // Prawy klik: okno stworka — działa także na nieaktywnym pasku (to tylko
    // podgląd), tak jak w Heroes 3 prawy przycisk zawsze tylko pokazuje.
    if (p.rightButtonDown()) {
      if (oddzial) this.oknoStworka(m);
      return;
    }
    if (!(m.pasek.aktywny?.() ?? true)) {
      this.o.powiedz(m.pasek.powodNieaktywny ?? 'Tego paska nie da się teraz zmieniać.');
      return;
    }
    const e = p.event as MouseEvent | undefined;
    this.wcisk = { m, x: p.x, y: p.y, shift: !!e?.shiftKey, ctrl: !!(e?.ctrlKey || e?.metaKey) };
    this.ciagnie = false;
    this.zegarPrzytrzymania?.remove();
    if (oddzial) {
      this.zegarPrzytrzymania = this.scena.time.delayedCall(PRZYTRZYMANIE_MS, () => {
        // Przytrzymanie bez ruchu — na tablecie to jedyny „prawy klik".
        if (!this.wcisk || this.ciagnie || this.wcisk.m !== m) return;
        this.wcisk = null;
        this.oknoStworka(m);
      });
    }
  }

  private ruch(p: Phaser.Input.Pointer) {
    if (this.duch) {
      this.duch.setPosition(p.x, p.y);
      return;
    }
    const w = this.wcisk;
    if (!w || !p.isDown) return;
    if (Math.hypot(p.x - w.x, p.y - w.y) < PROG_CIAGNIECIA) return;
    const oddzial = w.m.pasek.armia()[w.m.slot];
    if (!oddzial) return;
    this.ciagnie = true;
    this.zegarPrzytrzymania?.remove();
    const klucz = `p-${oddzial.sprite}`;
    const im = this.scena.add.image(0, 0, this.scena.textures.exists(klucz) ? klucz : '__DEFAULT');
    im.setScale(Math.min(1, (w.m.pasek.slotH - 4) / im.height));
    const licznik = this.scena.add
      .text(0, w.m.pasek.slotH / 2 - 8, String(oddzial.ile), {
        fontFamily: KROJ.tytul,
        fontSize: '14px',
        color: BARWA.krem,
        stroke: BARWA.braz,
        strokeThickness: 3,
      })
      .setOrigin(0.5);
    this.duch = this.scena.add
      .container(p.x, p.y, [im, licznik])
      .setDepth(this.o.glebia + 40)
      .setAlpha(0.85);
    this.wybor = w.m;
    this.odswiez();
  }

  private puszczono(p: Phaser.Input.Pointer) {
    this.zegarPrzytrzymania?.remove();
    const w = this.wcisk;
    this.wcisk = null;
    if (!w) return;
    if (this.ciagnie) {
      this.ciagnie = false;
      this.duch?.destroy();
      this.duch = null;
      const cel = this.miejscePod(p.x, p.y);
      const e = p.event as MouseEvent | undefined;
      // Upuszczenie obok albo na tym samym slocie to „wziąłem i odłożyłem" —
      // zaznaczenie zostaje, więc dalej działa klik-klik.
      if (!cel || (cel.pasek === w.m.pasek && cel.slot === w.m.slot)) return;
      if (!(cel.pasek.aktywny?.() ?? true)) {
        this.o.powiedz(cel.pasek.powodNieaktywny ?? 'Tam nie można niczego odłożyć.');
        return;
      }
      if (e?.shiftKey || w.shift) this.oknoPodzialu(w.m, cel);
      else if (e?.ctrlKey || e?.metaKey || w.ctrl) this.odlozJednego(w.m, cel);
      else this.wykonaj(w.m, cel);
      return;
    }
    this.klik(w.m, w.shift, w.ctrl);
  }

  /**
   * Ctrl przy upuszczeniu (albo przy drugim kliku) odkłada JEDNEGO stworka —
   * skrót z HotA: pojedynczy stworek na osobnym slocie przyjmuje pierwszy
   * cios, a przez okno z suwakiem robiłoby się to kilka razy na turę.
   */
  private odlozJednego(z: Miejsce, doc: Miejsce) {
    const w = podzielMiedzy(z.pasek.armia(), z.slot, doc.pasek.armia(), doc.slot, 1, !!z.pasek.chroniona);
    this.wybor = null;
    this.trybPodzialu = false;
    if (!w.ok) {
      this.o.powiedz(w.powod);
      this.drgnij(doc);
      this.odswiez();
      return;
    }
    this.o.poZmianie(w.opis);
    this.o.powiedz(w.opis);
    this.odswiez();
    this.blysk(doc);
  }

  private klik(m: Miejsce, shift: boolean, ctrl = false) {
    const armia = m.pasek.armia();
    const w = this.wybor;
    const tenSam = !!w && w.pasek === m.pasek && w.slot === m.slot;

    if (w && !tenSam) {
      if (this.trybPodzialu || shift) this.oknoPodzialu(w, m);
      else if (ctrl) this.odlozJednego(w, m);
      else this.wykonaj(w, m);
      return;
    }
    if (w && tenSam && this.trybPodzialu) {
      this.trybPodzialu = false;
      this.o.powiedz('Podział odwołany.');
      return;
    }
    if (w && tenSam) {
      // Drugi klik w zaznaczony oddział — jak w Heroes 3: karta stworka.
      this.oknoStworka(m);
      return;
    }
    const o = armia[m.slot];
    if (!o) {
      this.o.powiedz('Pusty slot. Najpierw kliknij oddział, potem to miejsce.');
      return;
    }
    this.wybor = m;
    this.trybPodzialu = false;
    this.o.powiedz(
      `Wybrano: ${o.ile} × ${o.nazwa}. Kliknij inny slot — przeniesiesz, zamienisz albo połączysz. ` +
        'Drugi klik: opis stworka.'
    );
    this.odswiez();
  }

  private miejscePod(x: number, y: number): Miejsce | null {
    for (const pasek of this.paski) {
      for (let i = 0; i < pasek.sloty.length; i++) {
        const s = pasek.sloty[i];
        if (x >= s.x && x <= s.x + pasek.slotW && y >= s.y && y <= s.y + pasek.slotH) return { pasek, slot: i };
      }
    }
    return null;
  }

  private wykonaj(z: Miejsce, doc: Miejsce) {
    const wynik = przeniesMiedzy(z.pasek.armia(), z.slot, doc.pasek.armia(), doc.slot, !!z.pasek.chroniona);
    this.wybor = null;
    this.trybPodzialu = false;
    if (!wynik.ok) {
      this.o.powiedz(wynik.powod);
      this.drgnij(doc);
      this.odswiez();
      return;
    }
    this.o.poZmianie(wynik.opis);
    this.o.powiedz(wynik.opis);
    this.odswiez();
    this.blysk(doc);
  }

  private blysk(m: Miejsce) {
    const s = m.pasek.sloty[m.slot];
    this.scena.tweens.add({ targets: s.rysunek, scale: s.rysunek.scale * 1.12, duration: 110, yoyo: true });
  }

  private drgnij(m: Miejsce) {
    const s = m.pasek.sloty[m.slot];
    this.scena.tweens.add({ targets: s.kontener, x: s.x + 4, duration: 50, yoyo: true, repeat: 2, onComplete: () => s.kontener.setX(s.x) });
  }

  // ————————————————————————————————————————— okno stworka

  private oknoStworka(m: Miejsce) {
    const armia = m.pasek.armia();
    const o = armia[m.slot];
    if (!o) return;
    const aktywny = m.pasek.aktywny?.() ?? true;
    const ostatni = !!m.pasek.chroniona && ostatniStos(armia);
    this.okno = pokazOknoStworka(this.scena, {
      oddzial: o,
      glebia: this.o.glebia + 100,
      gdzie: m.pasek.gdzie,
      zwolnij: aktywny
        ? {
            mozna: !ostatni,
            powod: ostatni ? 'Ostatniego oddziału bohatera nie można zwolnić.' : undefined,
            akcja: () => {
              const w = zwolnij(m.pasek.armia(), m.slot, !!m.pasek.chroniona);
              this.wybor = null;
              if (!w.ok) return this.o.powiedz(w.powod);
              this.o.poZmianie(w.opis);
              this.o.powiedz(w.opis);
              this.odswiez();
            },
          }
        : undefined,
      poZamknieciu: () => {
        this.okno = null;
      },
    });
  }

  // ————————————————————————————————————————— okno podziału

  /**
   * Okno podziału jak w Heroes 3: dwie liczby (zostaje / przechodzi), suwak
   * między nimi i strzałki ±. Suwak dla myszy, strzałki i szybkie tabliczki
   * dla małej ręki — uchwyt szerokości kilku pikseli to dla ośmiolatka
   * zadanie zręcznościowe.
   */
  private oknoPodzialu(z: Miejsce, doc: Miejsce) {
    this.trybPodzialu = false;
    const za = z.pasek.armia();
    const doA = doc.pasek.armia();
    const zrodlo = za[z.slot];
    if (!zrodlo) return;
    const maks = maksPodzialuMiedzy(za, z.slot, doA, doc.slot, !!z.pasek.chroniona);
    if (maks < 1) {
      const cel = doA[doc.slot];
      this.o.powiedz(
        cel && cel.sprite !== zrodlo.sprite
          ? 'Dzielić można tylko na puste miejsce albo do tego samego stworka.'
          : zrodlo.ile < 2
            ? 'Jednego stworka nie da się podzielić.'
            : 'Bohater nie może zostać bez ani jednego stworka.'
      );
      this.drgnij(doc);
      return;
    }
    this.oknoPodzialuOtwarte = true;
    const scena = this.scena;
    const W = scena.scale.width;
    const H = scena.scale.height;
    const SZ = 420;
    const WY = 270;
    const x = Math.round((W - SZ) / 2);
    const y = Math.round((H - WY) / 2);
    const naPoczatku = doA[doc.slot]?.ile ?? 0;
    let ile = Math.min(maks, Math.max(1, Math.floor(zrodlo.ile / 2)));

    const k = scena.add.container(0, 0).setDepth(this.o.glebia + 100);
    const zaslona = scena.add.rectangle(0, 0, W, H, BARWA.cien, 0.6).setOrigin(0).setInteractive();
    k.add(zaslona);
    k.add(panelPergaminu(scena, x, y, SZ, WY));
    k.add(scena.add.text(x + SZ / 2, y + 26, `Podziel: ${zrodlo.nazwa}`, stylEtykiety(20)).setOrigin(0.5));
    k.add(ozdobnik(scena, x + 70, y + 48, SZ - 140));

    // Dwa portrety z liczbami: lewy zostaje, prawy przechodzi.
    const kolumny = [x + 82, x + SZ - 82];
    const liczby: Phaser.GameObjects.Text[] = [];
    kolumny.forEach((cx, i) => {
      k.add(medalion(scena, cx, y + 96, 32, BARWA.papierCiemny));
      const klucz = `p-${zrodlo.sprite}`;
      if (scena.textures.exists(klucz)) {
        const im = scena.add.image(cx, y + 95, klucz);
        im.setScale(Math.min(1, 48 / Math.max(im.width, im.height)));
        k.add(im);
      }
      const t = scena.add.text(cx, y + 146, '', stylEtykiety(24, BARWA.atrament)).setOrigin(0.5);
      liczby.push(t);
      k.add(t);
      k.add(
        scena.add
          .text(cx, y + 166, i === 0 ? `zostaje ${z.pasek.gdzie}` : `trafia ${doc.pasek.dokad}`, stylAtramentu(12, 'miekki'))
          .setOrigin(0.5, 0)
      );
    });

    // Suwak między portretami.
    const sx = x + 140;
    const sw = SZ - 280;
    const sy = y + 110;
    const tor = scena.add.graphics();
    tor.fillStyle(0x6b4520, 0.35);
    tor.fillRoundedRect(sx, sy - 4, sw, 8, 4);
    tor.lineStyle(1, BARWA.kreska, 0.8);
    tor.strokeRoundedRect(sx, sy - 4, sw, 8, 4);
    const uchwyt = scena.add.graphics();
    uchwyt.fillStyle(C.goldDeep, 1);
    uchwyt.fillCircle(0, 0, 10);
    uchwyt.fillStyle(C.gold, 1);
    uchwyt.fillCircle(0, -1, 8);
    uchwyt.fillStyle(C.goldLight, 0.7);
    uchwyt.fillCircle(-2, -3, 3);
    k.add([tor, uchwyt]);

    const odswiezOkno = () => {
      liczby[0].setText(String(zrodlo.ile - ile));
      liczby[1].setText(String(naPoczatku + ile));
      const frac = maks > 1 ? (ile - 1) / (maks - 1) : 1;
      uchwyt.setPosition(sx + frac * sw, sy);
    };
    const ustaw = (v: number) => {
      ile = Phaser.Math.Clamp(Math.round(v), 1, maks);
      odswiezOkno();
    };
    let ciagnieUchwyt = false;
    const zSuwaka = (px: number) => ustaw(1 + ((px - sx) / sw) * (maks - 1));
    const strefa = scena.add
      .zone(sx - 12, sy - 16, sw + 24, 32)
      .setOrigin(0, 0)
      .setInteractive({ useHandCursor: true })
      .on('pointerdown', (p: Phaser.Input.Pointer) => {
        ciagnieUchwyt = true;
        zSuwaka(p.x);
      });
    k.add(strefa);
    const naRuch = (p: Phaser.Input.Pointer) => {
      if (ciagnieUchwyt && p.isDown) zSuwaka(p.x);
    };
    const naPuszczenie = () => {
      ciagnieUchwyt = false;
    };
    scena.input.on('pointermove', naRuch);
    scena.input.on('pointerup', naPuszczenie);

    const przyciski: Przycisk[] = [];
    const tabliczka = (px: number, py: number, w: number, tekst: string, akcja: () => void, glowny = false, rozmiar = 15) => {
      const p = new Przycisk(scena, { x: px, y: py, w, h: 34, tekst, glowny, rozmiar, akcja });
      k.add(p.kontener);
      przyciski.push(p);
      return p;
    };
    tabliczka(sx + 22, sy + 34, 44, '−', () => ustaw(ile - 1), false, 20);
    tabliczka(sx + sw - 22, sy + 34, 44, '+', () => ustaw(ile + 1), false, 20);

    const zamknij = () => {
      scena.input.off('pointermove', naRuch);
      scena.input.off('pointerup', naPuszczenie);
      scena.input.keyboard?.off('keydown', naKlawisz);
      const zgas = (o: Phaser.GameObjects.GameObject) => {
        scena.tweens.killTweensOf(o);
        if (o instanceof Phaser.GameObjects.Container) o.list.forEach(zgas);
      };
      zgas(k);
      k.destroy();
      this.oknoPodzialuOtwarte = false;
      this.podzial = null;
      this.wybor = null;
      this.odswiez();
    };
    const zatwierdz = () => {
      const w = podzielMiedzy(z.pasek.armia(), z.slot, doc.pasek.armia(), doc.slot, ile, !!z.pasek.chroniona);
      zamknij();
      if (!w.ok) return this.o.powiedz(w.powod);
      this.o.poZmianie(w.opis);
      this.o.powiedz(w.opis);
      this.odswiez();
      this.blysk(doc);
    };
    tabliczka(x + SZ / 2 - 90, y + WY - 36, 150, 'Anuluj', zamknij, false, 16);
    tabliczka(x + SZ / 2 + 90, y + WY - 36, 150, 'Podziel', zatwierdz, true, 16);

    const naKlawisz = (e: KeyboardEvent) => {
      if (e.key === 'Escape') zamknij();
      else if (e.key === 'Enter') zatwierdz();
      else if (e.key === 'ArrowLeft' || e.key === '-') ustaw(ile - 1);
      else if (e.key === 'ArrowRight' || e.key === '+' || e.key === '=') ustaw(ile + 1);
    };
    scena.time.delayedCall(0, () => {
      if (this.oknoPodzialuOtwarte) scena.input.keyboard?.on('keydown', naKlawisz);
    });

    odswiezOkno();
    this.podzial = { ustaw, zatwierdz, zamknij, get ile() { return ile; }, maks };
  }
}
