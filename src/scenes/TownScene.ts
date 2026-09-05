import Phaser from 'phaser';
import {
  KOSZT_ODDZIALU,
  SUROWCE,
  SUROWIEC_INFO,
  type Obiekt,
  type Oddzial,
  type StanMapy,
  type Surowiec,
} from '../data/mapa';
import {
  dochodZamku,
  moznaBudowac,
  profilZamku,
  stacNas,
  zaplac,
  type Budynek,
} from '../data/zamki';
import { FACTIONS, factionById } from '../data/factions';
import { C, H, Z, body, display } from '../visual/theme';
import { drawPanelBody, makeHudButton, mix, plate } from '../visual/hud';
import { ICON, buildIcons } from '../visual/icons';
import { OKNO_H, OKNO_W } from '../visual/uklad';

/**
 * Ekran zamku.
 *
 * Po co w ogóle istnieje: bez niego zbierane pokeballe nie mają na co iść,
 * a surowiec, którego nie da się wydać, przestaje być nagrodą. To jest jedyne
 * miejsce w grze, gdzie armia rośnie — wszystko inne ją tylko zmniejsza.
 *
 * Układ jak w Heroes 3: sześć poziomów oddziałów jeden pod drugim, przy każdym
 * ile czeka i ile kosztuje, po prawej armia bohatera i pod nią rozbudowa.
 *
 * Rozbudowa jest tu dopiero od teraz i to była największa dziura w grze:
 * drzewko budynków istniało w `zamki.ts` jako komplet danych, ale ŻADEN ekran
 * go nie pokazywał, więc ratusza nie dało się postawić, dochodu z miasta nie
 * było, a wyższe siedliska nie miały jak powstać. Zamek był samym sklepem.
 *
 * Lista, a nie panorama z wzorca — panorama jest następnym krokiem, ale lista,
 * w której da się budować, jest warta więcej niż ładny obrazek, w którym nie da
 * się nic.
 */

const KLUCZ_STANU = 'stan-mapy';
const KLUCZ_ZAMKU = 'otwarty-zamek';

const WIERSZ_H = 88;
const LEWA_W = 560;
/** Ile budynków pokazujemy naraz. Więcej nie mieści się nad przyciskiem wyjścia. */
const BUDYNKOW_NARAZ = 4;

import { sledzScene, zapisz } from '../dev/dziennik';

export class TownScene extends Phaser.Scene {
  private stan!: StanMapy;
  private zamek!: Obiekt;
  private licznikiDostepne: Phaser.GameObjects.Text[] = [];
  private przyciski: Array<{ setLabel(t: string): void; setEnabled(v: boolean): void }> = [];
  private slotyArmii: Phaser.GameObjects.Text[] = [];
  private komunikat!: Phaser.GameObjects.Text;
  private licznikiSurowcow: Partial<Record<Surowiec, Phaser.GameObjects.Text>> = {};
  private dochodTekst!: Phaser.GameObjects.Text;
  /** Wiersze rozbudowy są przerysowywane po każdej budowie, więc trzymamy je osobno. */
  private wierszeBudowy: Array<{ destroy(): void }> = [];

  constructor() {
    super('zamek');
  }

  preload() {
    const b = import.meta.env.BASE_URL;
    for (const s of SUROWCE) this.load.image(`m-${SUROWIEC_INFO[s].ikona}`, `${b}mapa/${SUROWIEC_INFO[s].ikona}.png`);
    for (const f of FACTIONS) for (const u of f.units) this.load.image(`p-${u.sprite}`, `${b}sprites/${u.sprite}.png`);
  }

  create() {
    sledzScene(this);
    this.licznikiDostepne = [];
    this.przyciski = [];
    this.slotyArmii = [];
    this.licznikiSurowcow = {};
    this.wierszeBudowy = [];

    this.stan = this.registry.get(KLUCZ_STANU) as StanMapy;
    const id = this.registry.get(KLUCZ_ZAMKU) as number;
    this.zamek = this.stan.obiekty.find((o) => o.id === id)!;
    buildIcons(this);

    const g = this.add.graphics().setDepth(Z.sky);
    g.fillGradientStyle(C.skyTop, C.skyTop, C.skyBottom, C.skyBottom, 1);
    g.fillRect(0, 0, this.scale.width, this.scale.height);

    this.add
      .text(this.scale.width / 2, 18, this.zamek.nazwa.toUpperCase(), display(22, H.goldLight))
      .setOrigin(0.5, 0)
      .setDepth(Z.hud);

    this.rysujOddzialy();
    this.rysujPrawaKolumne();
    this.odswiez();
  }

  private get frakcja() {
    return factionById(this.zamek.frakcjaZamku ?? 'bor') ?? FACTIONS[0];
  }

  private rysujOddzialy() {
    const x = 14;
    const y0 = 56;
    drawPanelBody(this, x, y0, LEWA_W, 6 * WIERSZ_H + 16, 8);

    this.frakcja.units.forEach((u, tier) => {
      const wy = y0 + 12 + tier * WIERSZ_H;
      const g = this.add.graphics().setDepth(Z.hud);
      plate(g, x + 12, wy, LEWA_W - 24, WIERSZ_H - 8, 8, mix(C.panel, C.panelDeep, 0.2), C.panelDeep, {
        light: 0.16,
        dark: 0.18,
        gloss: 0.12,
        edgeW: 2,
      });

      const im = this.add.image(x + 52, wy + (WIERSZ_H - 8) / 2, `p-${u.sprite}`).setDepth(Z.hud + 1);
      im.setScale(52 / im.height);

      this.add
        .text(x + 92, wy + 12, u.name, display(15))
        .setOrigin(0, 0)
        .setDepth(Z.hud + 1);
      this.add
        .text(x + 92, wy + 34, `poziom ${tier + 1}  ·  atak ${u.atk}  ·  życie ${u.hp}`, body(11, H.inkSoft))
        .setOrigin(0, 0)
        .setDepth(Z.hud + 1);

      this.licznikiDostepne[tier] = this.add
        .text(x + 330, wy + (WIERSZ_H - 8) / 2, '', display(15, H.gold))
        .setOrigin(0.5)
        .setDepth(Z.hud + 1);
      this.add
        .image(x + 372, wy + (WIERSZ_H - 8) / 2, 'm-pokeball')
        .setScale(0.62)
        .setDepth(Z.hud + 1);
      this.add
        .text(x + 388, wy + (WIERSZ_H - 8) / 2, String(KOSZT_ODDZIALU[tier]), display(14))
        .setOrigin(0, 0.5)
        .setDepth(Z.hud + 1);

      const p = makeHudButton(this, {
        x: x + LEWA_W - 82,
        y: wy + (WIERSZ_H - 8) / 2,
        w: 110,
        h: 36,
        icon: ICON.star,
        tone: C.gold,
        toneDeep: C.goldDeep,
        onClick: () => this.kup(tier),
      });
      p.setLabel('Zwerbuj');
      this.przyciski[tier] = p;
    });
  }

  private rysujPrawaKolumne() {
    const x = LEWA_W + 28;
    const w = this.scale.width - x - 14;
    // Wysokość liczona od dołu okna, nie „OKNO_H minus coś": panel schodził
    // poniżej ekranu i przycisk wyjścia był ucięty.
    const h = OKNO_H - 56 - 62;
    drawPanelBody(this, x, 56, w, h, 8);

    // Wszystkie CZTERY surowce, nie same pokeballe: budynki kosztują też jagody
    // i odłamki, a gracz musi widzieć, czego mu brakuje, zanim kliknie „Buduj".
    const krok = (w - 32) / SUROWCE.length;
    SUROWCE.forEach((co, i) => {
      const sx = x + 22 + i * krok;
      this.add
        .image(sx, 84, `m-${SUROWIEC_INFO[co].ikona}`)
        .setScale(0.62)
        .setDepth(Z.hud + 1);
      this.licznikiSurowcow[co] = this.add
        .text(sx + 14, 84, '0', display(14, H.gold))
        .setOrigin(0, 0.5)
        .setDepth(Z.hud + 1);
    });
    this.dochodTekst = this.add
      .text(x + 16, 106, '', body(11, H.goldLight))
      .setOrigin(0, 0)
      .setDepth(Z.hud + 1);

    this.add
      .text(x + 16, 130, 'Twoja armia', body(12, H.inkSoft))
      .setOrigin(0, 0)
      .setDepth(Z.hud + 1);

    for (let i = 0; i < 6; i++) {
      this.slotyArmii[i] = this.add
        .text(x + 16, 152 + i * 22, '', body(13, H.ink))
        .setOrigin(0, 0)
        .setDepth(Z.hud + 1)
        .setWordWrapWidth(w - 32);
    }

    this.add
      .text(x + 16, 292, 'Rozbudowa miasta', body(12, H.inkSoft))
      .setOrigin(0, 0)
      .setDepth(Z.hud + 1);

    this.komunikat = this.add
      .text(x + 16, OKNO_H - 118, '', body(12, H.goldLight))
      .setOrigin(0, 0)
      .setDepth(Z.hud + 1)
      .setWordWrapWidth(w - 32);

    const wyjscie = makeHudButton(this, {
      x: x + w / 2,
      y: OKNO_H - 32,
      w: w - 32,
      h: 42,
      icon: ICON.boot,
      tone: C.ally,
      toneDeep: C.panelDeep,
      onClick: () => this.scene.start('adventure'),
    });
    wyjscie.setLabel('Wyjdź na mapę');
  }

  /** Co już stoi w tym mieście. Zamek bez listy traktujemy jak pusty. */
  private get postawione() {
    if (!this.zamek.postawione) this.zamek.postawione = [];
    return this.zamek.postawione;
  }

  /**
   * Wiersze rozbudowy: budynki, których warunki są już spełnione, od
   * najtańszego. Pokazujemy TYLKO dostępne, a nie całe drzewko — lista
   * jedenastu pozycji, z których osiem jest szare, uczy głównie tego, że nic
   * się nie da.
   */
  private rysujBudowe() {
    for (const w of this.wierszeBudowy) w.destroy();
    this.wierszeBudowy = [];

    const x = LEWA_W + 28;
    const w = this.scale.width - x - 14;
    const profil = profilZamku(this.zamek.frakcjaZamku ?? 'bor');
    const dostepne = profil.budynki
      .filter((b) => moznaBudowac(b, this.postawione))
      .sort((a, b) => (a.koszt.pokeball ?? 0) - (b.koszt.pokeball ?? 0))
      .slice(0, BUDYNKOW_NARAZ);

    if (dostepne.length === 0) {
      const t = this.add
        .text(x + 16, 316, 'Miasto jest gotowe — wszystko już stoi.', body(12, H.ink))
        .setOrigin(0, 0)
        .setDepth(Z.hud + 1)
        .setWordWrapWidth(w - 32);
      this.wierszeBudowy.push(t);
      return;
    }

    dostepne.forEach((b, i) => {
      const wy = 314 + i * 66;
      const stac = stacNas(this.stan.skarbiec, b.koszt);

      const nazwa = this.add
        .text(x + 16, wy, b.nazwa, display(13, stac ? H.ink : H.inkSoft))
        .setOrigin(0, 0)
        .setDepth(Z.hud + 1)
        .setWordWrapWidth(w - 120);
      const cena = this.add
        .text(x + 16, wy + 20, this.opisKosztu(b), body(11, stac ? H.goldLight : H.inkSoft))
        .setOrigin(0, 0)
        .setDepth(Z.hud + 1)
        .setWordWrapWidth(w - 120);
      const opis = this.add
        .text(x + 16, wy + 36, b.opis, body(10, H.inkSoft))
        .setOrigin(0, 0)
        .setDepth(Z.hud + 1)
        .setWordWrapWidth(w - 120);

      const p = makeHudButton(this, {
        x: x + w - 58,
        y: wy + 20,
        w: 84,
        h: 32,
        icon: ICON.star,
        tone: C.gold,
        toneDeep: C.goldDeep,
        onClick: () => this.buduj(b),
      });
      p.setLabel('Buduj');
      p.setEnabled(stac);

      this.wierszeBudowy.push(nazwa, cena, opis, p);
    });
  }

  /** Cena po ludzku: „20 pokeballi · 4 jagody". */
  private opisKosztu(b: Budynek) {
    return (Object.entries(b.koszt) as [Surowiec, number][])
      .map(([co, ile]) => `${ile} ${SUROWIEC_INFO[co].dopelniacz}`)
      .join(' · ');
  }

  private buduj(b: Budynek) {
    if (!moznaBudowac(b, this.postawione)) return;
    if (!stacNas(this.stan.skarbiec, b.koszt)) {
      this.komunikat.setText(`Za mało surowców — trzeba ${this.opisKosztu(b)}.`);
      return;
    }
    zaplac(this.stan.skarbiec, b.koszt);
    this.postawione.push(b.id);
    zapisz('zamek', 'budowa', {
      budynek: b.id,
      postawione: this.postawione.length,
      pokeballe: this.stan.skarbiec.pokeball,
    });
    // Siedlisko od razu wpuszcza pierwszy oddział, zamiast kazać czekać dobę.
    // Bez tego zakup za sto pokeballi nie zmienia NICZEGO na ekranie i wygląda
    // na zmarnowany.
    if (b.rodzaj === 'siedlisko' && b.poziom !== undefined && this.zamek.dostepne) {
      this.zamek.dostepne[b.poziom] += 1;
    }
    this.komunikat.setText(
      b.rodzaj === 'ratusz'
        ? `${b.nazwa} stoi. Od jutra +${b.dochod} pokeballi dziennie.`
        : `${b.nazwa} stoi.`
    );
    this.odswiez();
  }

  /**
   * Werbunek. Oddział tego samego gatunku dokleja się do istniejącego slotu,
   * a nie zakłada nowego — inaczej cztery zakupy po jednym Pyroko dałyby
   * cztery osobne oddziały po jednym stworku, czyli armię bez sensu.
   */
  private kup(tier: number) {
    const dostepne = this.zamek.dostepne ?? [];
    const koszt = KOSZT_ODDZIALU[tier];
    if ((dostepne[tier] ?? 0) <= 0) {
      // Dwa różne powody pustego wiersza, dwa różne zdania. „Wróć jutro" przy
      // poziomie, dla którego nie ma jeszcze siedliska, jest po prostu
      // nieprawdą — jutro też nic tam nie przybędzie.
      const siedlisko = profilZamku(this.zamek.frakcjaZamku ?? 'bor').budynki.find(
        (b) => b.rodzaj === 'siedlisko' && b.poziom === tier
      );
      this.komunikat.setText(
        siedlisko && !this.postawione.includes(siedlisko.id)
          ? `Najpierw postaw budynek: ${siedlisko.nazwa}.`
          : 'Nic tu na razie nie czeka. Wróć jutro.'
      );
      return;
    }
    if (this.stan.skarbiec.pokeball < koszt) {
      this.komunikat.setText(`Za mało pokeballi — potrzeba ${koszt}.`);
      return;
    }

    // Kupujemy tyle, na ile stać, ale nie więcej niż czeka — jednym kliknięciem,
    // bo klikanie po jednym stworku przy dwudziestu to nie jest zabawa.
    const stac = Math.floor(this.stan.skarbiec.pokeball / koszt);
    const ile = Math.min(stac, dostepne[tier]);

    const u = this.frakcja.units[tier];
    const istniejacy = this.stan.bohater.armia.find((a) => a.sprite === u.sprite);
    if (istniejacy) {
      istniejacy.ile += ile;
    } else {
      const nowy: Oddzial = {
        sprite: u.sprite,
        nazwa: u.name,
        ile,
        frakcja: this.frakcja.id,
        tier,
      };
      this.stan.bohater.armia.push(nowy);
    }
    dostepne[tier] -= ile;
    this.stan.skarbiec.pokeball -= ile * koszt;
    zapisz('zamek', 'werbunek', {
      poziom: tier,
      kto: u.sprite,
      ile,
      pokeballe: this.stan.skarbiec.pokeball,
    });
    this.komunikat.setText(`Zwerbowano ${ile} × ${u.name}.`);
    this.odswiez();
  }

  private odswiez() {
    const dostepne = this.zamek.dostepne ?? [];
    for (const co of SUROWCE) this.licznikiSurowcow[co]?.setText(String(this.stan.skarbiec[co]));
    const d = dochodZamku(this.postawione, this.zamek.frakcjaZamku ?? 'bor');
    this.dochodTekst.setText(
      d > 0 ? `Miasto daje ${d} pokeballi dziennie` : 'Miasto nie daje jeszcze dochodu'
    );
    this.rysujBudowe();
    this.frakcja.units.forEach((_, tier) => {
      const ile = dostepne[tier] ?? 0;
      this.licznikiDostepne[tier].setText(String(ile));
      this.przyciski[tier].setEnabled(ile > 0 && this.stan.skarbiec.pokeball >= KOSZT_ODDZIALU[tier]);
    });
    for (let i = 0; i < 6; i++) {
      const a = this.stan.bohater.armia[i];
      this.slotyArmii[i].setText(a ? `${a.ile} × ${a.nazwa}` : '—');
    }
  }
}

/** Szerokość ekranu zamku bierzemy z tej samej geometrii co mapa. */
export const ZAMEK_W = OKNO_W;
