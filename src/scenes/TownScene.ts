import Phaser from 'phaser';
import {
  KOSZT_ODDZIALU,
  SUROWCE,
  SUROWIEC_INFO,
  data,
  dochod,
  zbuduj,
  type Obiekt,
  type Oddzial,
  type StanMapy,
  type Surowiec,
} from '../data/mapa';
import {
  moznaBudowac,
  profilZamku,
  stacNas,
  type Budynek,
} from '../data/zamki';
import { FACTIONS, factionById } from '../data/factions';
import { C, H, T, Z, body, display } from '../visual/theme';
import { drawPanelBody, makeHudButton, mix, plate } from '../visual/hud';
import { ICON, buildIcons } from '../visual/icons';
import { OKNO_H, OKNO_W } from '../visual/uklad';

/**
 * Ekran miasta.
 *
 * Po co w ogóle istnieje: bez niego zbierane pokeballe nie mają na co iść,
 * a surowiec, którego nie da się wydać, przestaje być nagrodą. To jest jedyne
 * miejsce w grze, gdzie armia rośnie — wszystko inne ją tylko zmniejsza.
 *
 * Dlaczego to PANORAMA, a nie lista
 * ---------------------------------
 * Pierwsza wersja była listą sześciu wierszy „stworek — ile czeka — kup".
 * Działała, ale wyglądała jak sklep, a nie jak miasto. Wzorzec (Heroes 3
 * i HotA) robi to inaczej: ekran miasta jest malowanym krajobrazem, budynki
 * stoją w nim jeden bliżej, drugi dalej, każdy jest klikalny, a jego wielkość
 * mówi, jak jest ważny. Rozbudowa jest wtedy widoczna gołym okiem — miasto
 * z każdym dniem wygląda inaczej, zamiast dostawać kolejny wiersz w tabeli.
 *
 * Miejsce, w którym nie idziemy za wzorcem: Heroes 3 nie pokazuje budynków,
 * których nie ma. My pokazujemy je jako blade zarysy, bo panorama jest u nas
 * jedynym menu budowy. Dziecko ma zobaczyć, co jeszcze może stanąć i gdzie,
 * bez otwierania osobnej listy.
 */

const KLUCZ_STANU = 'stan-mapy';
const KLUCZ_ZAMKU = 'otwarty-zamek';

/** Panorama zaczyna się pod paskiem tytułu i kończy nad paskiem armii. */
const GORA = 44;
const PAN_H = 596;
/**
 * Horyzont panoramy — ten sam ułamek, którym rysuje ją `tools/rysuj_miasto.py`.
 * Powyżej jest niebo i dalekie wzgórza, więc nic tam nie może stać: budynek
 * z podstawą nad horyzontem wygląda, jakby wisiał w powietrzu.
 */
const HORYZONT = 0.3;
/**
 * Ile z rozmiaru pliku zostaje na ekranie. Bryły z modelu mają 380–680 px
 * wysokości i RÓŻNIĄ SIĘ NIĄ CELOWO — ratusz trzeciego stopnia jest większy
 * od gniazda nie dlatego, że tak każe liczba w `zamki.ts`, tylko dlatego,
 * że tak został narysowany. Dlatego `skala` z danych nie mnoży się już przez
 * nic: wielkość niesie sama grafika, a scena dokłada tylko perspektywę.
 */
const BRYLA = 0.5;

/**
 * Skąd świeci słońce. Ta sama strona, co na panoramie i w `rysuj_miasto.py`
 * (prawa góra) — cień rzucony musi iść w LEWO W DÓŁ, inaczej bryła jest
 * oświetlona z jednej strony, a cień pada z drugiej i całość rozjeżdża się
 * bardziej, niż gdyby cienia w ogóle nie było.
 */
/**
 * Cień rzucony jest WYPALONY w grafice (`zCieniem` w `tools/wsad_wczytaj.py`),
 * bo scena umie tylko obrócić kopię sprite'a wokół podstawy, a to daje drugą
 * bryłę leżącą na zawiasie. Plik jest przez to szerszy od bryły o margines
 * z lewej — 42% jej szerokości — więc środek budynku nie leży w środku obrazka.
 */
const MARGINES_CIENIA = 0.42;
const SRODEK_BRYLY = (MARGINES_CIENIA + 0.5) / (1 + MARGINES_CIENIA);

interface Kafel {
  budynek: Budynek;
  obraz: Phaser.GameObjects.Image;
  postawiony: boolean;
}

export class TownScene extends Phaser.Scene {
  private stan!: StanMapy;
  private zamek!: Obiekt;
  private kafle: Kafel[] = [];
  private podpisy: Partial<Record<Surowiec, Phaser.GameObjects.Text>> = {};
  private slotyArmii: Phaser.GameObjects.Container[] = [];
  private karta!: Phaser.GameObjects.Container;
  private kartaTytul!: Phaser.GameObjects.Text;
  private kartaOpis!: Phaser.GameObjects.Text;
  private kartaKoszt!: Phaser.GameObjects.Container;
  private kartaPrzycisk!: ReturnType<typeof makeHudButton>;
  private kartaStworek!: Phaser.GameObjects.Image;
  private zachety: Phaser.GameObjects.Image[] = [];
  private wybrany?: Budynek;
  private komunikat!: Phaser.GameObjects.Text;
  private dataTekst!: Phaser.GameObjects.Text;

  constructor() {
    super('zamek');
  }

  preload() {
    const b = import.meta.env.BASE_URL;
    for (const s of SUROWCE) this.load.image(`m-${SUROWIEC_INFO[s].ikona}`, `${b}mapa/${SUROWIEC_INFO[s].ikona}.png`);
    for (const f of FACTIONS) for (const u of f.units) this.load.image(`p-${u.sprite}`, `${b}sprites/${u.sprite}.png`);
    for (const f of ['bor', 'grota', 'zbocze']) {
      this.load.image(`t-tlo-${f}`, `${b}miasto/tlo-${f}.png`);
      this.load.image(`t-znak-${f}`, `${b}miasto/znak-${f}.png`);
      // Bryły Groty i Zbocza to przemalowany komplet Boru
      // (`tools/frakcje_przemaluj.py`): ratusz jest ratuszem w każdym mieście,
      // różnić ma je klimat, a jedno źródło trzyma spójną kreskę.
      for (const id of BUDYNKI_ID) this.load.image(`t-${f}-${id}`, `${b}miasto/${f}-${id}.png`);
    }
    // Jeden plac budowy na wszystkie budynki. Wcześniej każdy miał własny
    // zarys — widmo TEJ bryły — ale to była konieczność techniki rysowanej.
    // Malowany plac z rusztowaniem mówi „tu coś stanie" sam z siebie,
    // a CO stanie, mówi karta po kliknięciu.
    this.load.image('t-plac', `${b}miasto/bor-plac.png`);
  }

  create() {
    // Phaser używa tej samej instancji sceny przy każdym `scene.start`, więc
    // wszystko, co zbierane w polach, trzeba czyścić tutaj. Bez tego przy
    // drugim wejściu do miasta zostają kafle z poprzedniego.
    this.kafle = [];
    this.podpisy = {};
    this.slotyArmii = [];
    this.zachety = [];
    this.wybrany = undefined;

    this.stan = this.registry.get(KLUCZ_STANU) as StanMapy;
    const id = this.registry.get(KLUCZ_ZAMKU) as number;
    this.zamek = this.stan.obiekty.find((o) => o.id === id)!;
    this.zamek.postawione ??= [];
    buildIcons(this);

    this.rysujPanorame();
    this.rysujBudynki();
    this.rysujPasekGorny();
    this.rysujPasekDolny();
    this.rysujKarte();
    this.odswiez();
  }

  private get frakcja() {
    return factionById(this.zamek.frakcjaZamku ?? 'bor') ?? FACTIONS[0];
  }

  private get profil() {
    return profilZamku(this.zamek.frakcjaZamku ?? 'bor');
  }

  /**
   * Czy bohater stoi w tym zamku.
   *
   * Do miasta da się wejść z panelu na mapie, nie ruszając bohatera — i tak
   * jest w Heroes 3. Ale werbunek dokłada stworki do armii BOHATERA, więc
   * werbowanie zdalnie oznaczałoby, że oddziały pojawiają się przy nim
   * na drugim końcu mapy. W Heroes 3 idą wtedy do garnizonu zamku; garnizonu
   * nie mamy, więc zamiast wymyślać nowy mechanizm, po prostu nie pozwalamy
   * werbować bez bohatera. Budować można — to nic nie przenosi.
   *
   * Liczone z położenia, a nie z flagi przekazanej przy wejściu: flaga
   * zdążyłaby się zestarzeć, a te dwie liczby są zawsze prawdziwe.
   */
  private get bohaterObecny() {
    return this.stan.bohater.x === this.zamek.x && this.stan.bohater.y === this.zamek.y;
  }

  // ---------- panorama ----------

  private rysujPanorame() {
    const tlo = this.add
      .image(0, GORA, `t-tlo-${this.profil.frakcja}`)
      .setOrigin(0, 0)
      .setDepth(Z.sky);
    // Kliknięcie w krajobraz zamyka kartę. Karta leży w rogu panoramy i
    // przykrywa dwa budynki; bez sposobu na jej zamknięcie trzeba by je
    // odsłaniać, klikając w cokolwiek innego i licząc, że się trafi.
    tlo.setInteractive();
    tlo.on('pointerdown', () => this.schowajKarte());
  }

  private schowajKarte() {
    this.wybrany = undefined;
    this.karta.setVisible(false);
    this.kartaPrzycisk.setVisible(false);
  }

  /**
   * Budynki na panoramie.
   *
   * Kolejność rysowania idzie po `y`: to, co niżej, jest bliżej i zasłania to,
   * co wyżej. Bez tego budynek z głębi potrafi nakryć ten z pierwszego planu
   * i cała perspektywa się psuje.
   *
   * Trzy ratusze stoją w tym samym miejscu, bo to jeden budynek w trzech
   * stopniach — pokazujemy najlepszy postawiony, a jako zarys ten, który
   * będzie następny.
   */
  private rysujBudynki() {
    for (const k of this.kafle) k.obraz.destroy();
    this.kafle = [];
    const postawione = this.zamek.postawione ?? [];

    // Trzy ratusze to JEDEN budynek w trzech stopniach i stoją w tym samym
    // miejscu. Rysujemy tylko najlepszy postawiony (albo zarys pierwszego,
    // jeśli nie stoi żaden) — dwa domy w jednym punkcie panoramy wyglądają
    // jak usterka, a rozbudowę i tak otwiera się kliknięciem w ten, który stoi.
    const najlepszyRatusz =
      ['ratusz3', 'ratusz2', 'ratusz1'].find((r) => postawione.includes(r)) ?? 'ratusz1';
    const widoczne = this.profil.budynki.filter(
      (b) => !b.id.startsWith('ratusz') || b.id === najlepszyRatusz
    );

    for (const b of [...widoczne].sort((a, c) => a.y - c.y)) {
      const stoi = postawione.includes(b.id);
      const klucz = stoi ? `t-${this.profil.frakcja}-${b.id}` : 't-plac';
      const skala = this.skalaBudynku(b);
      const gleboko = Z.sky + 1 + Math.round(b.y * 40);

      const im = this.add
        .image(b.x * OKNO_W, this.naZiemi(b), klucz)
        .setOrigin(SRODEK_BRYLY, 1)
        .setScale(skala)
        // Głębokości muszą zmieścić się PONIŻEJ `Z.hud`, inaczej budynki
        // przykrywają karty i paski. Pierwsza wersja mnożyła głębię przez 100
        // i wysoka bryła lądowała nad kartą budynku.
        .setDepth(gleboko);
      this.kafle.push({ budynek: b, obraz: im, postawiony: stoi });
      this.podepnijKliki(im, b);
      this.przywrocWyglad(b);
    }
    this.rysujZachety();
  }

  /**
   * Podstawa bryły. Głębia 0 to linia drzew na horyzoncie, 1 to przód polany —
   * ale NIE dolna krawędź obrazu: na dole panoramy leżą krzaki i głazy, które
   * kadrują scenę, i budynek postawiony na nich wyglądałby, jakby stał przed
   * nimi w powietrzu.
   */
  private naZiemi(b: Budynek) {
    const pas = PAN_H * (1 - HORYZONT);
    return GORA + PAN_H * HORYZONT + pas * (0.05 + 0.62 * b.y);
  }

  /**
   * Perspektywa: to, co dalej, jest mniejsze. Bez tego wszystkie bryły są
   * jednakowo duże, panorama spłaszcza się do naklejek na tle i głębia, którą
   * daje malowane tło, idzie na marne.
   */
  private skalaBudynku(b: Budynek) {
    return BRYLA * (0.6 + 0.62 * b.y);
  }

  /**
   * Trafianie liczymy sami z granic RYSUNKU, a nie zostawiamy Phaserowi
   * prostokąt obrazka — na mapie przygody ta sama pomyłka kosztowała rundę:
   * bryła jest wyższa niż jej miejsce w krajobrazie i kliknięcie w to, co
   * widać, trafiało obok.
   */
  private podepnijKliki(im: Phaser.GameObjects.Image, b: Budynek) {
    // Trafiamy w WIDOCZNE PIKSELE, z progiem powyżej cienia.
    //
    // Historia tego jednego wiersza: najpierw był próg alfy i klikało się
    // w cień; potem prostokąt, bo półprzezroczysty zarys placu budowy nie dawał
    // się trafić po alfie; teraz wracamy do alfy, bo grafika z modelu jest
    // NIEPRZEZROCZYSTA — także plac budowy — a prostokąt przestał wystarczać:
    // bryły zachodzą na siebie i prostokąt tej z przodu przykrywał tę z tyłu,
    // przez co kliknięcie w fort wybierało siedlisko stojące przed nim.
    //
    // Próg 150 leży powyżej najciemniejszego cienia rzuconego (maksymalnie 127),
    // więc cień pozostaje nieklikalny, a każdy piksel samej bryły — klikalny.
    im.setInteractive({ pixelPerfect: true, alphaTolerance: 150 });
    if (im.input) im.input.cursor = 'pointer';
    const skala = this.skalaBudynku(b);
    im.on('pointerover', () => {
      this.tweens.add({ targets: im, scale: skala * 1.05, duration: T.pop, ease: 'Quad.easeOut' });
      // Zarys po najechaniu tylko jaśnieje. Doprowadzenie go do pełnej krycia
      // kłamałoby o stanie miasta: przez chwilę wyglądałby na postawiony.
      im.setAlpha(Math.min(1, im.alpha + 0.25));
    });
    im.on('pointerout', () => {
      this.tweens.add({ targets: im, scale: skala, duration: T.pop });
      this.przywrocWyglad(b);
    });
    im.on('pointerdown', () => this.pokazBudynek(b));
  }

  /**
   * Drewniany znak z lampką przy placu, na który JUŻ STAĆ i który wolno
   * postawić dziś. Bez niego trzeba klikać po kolei w każdy plac i sprawdzać
   * cenę — czyli robić pracę, której ośmiolatek nie wykona.
   *
   * Wcześniej stała tu gwiazdka z HUD-u i była jedyną rzeczą na panoramie,
   * która nie należała do świata; krytyk wytykał ją dwa razy z rzędu. Znak
   * jest rysowany tą samą ręką co budynki i po prostu stoi na ziemi.
   */
  private rysujZachety() {
    for (const z of this.zachety) z.destroy();
    this.zachety = [];
    if (!this.zamek.nasz) return;
    const postawione = this.zamek.postawione ?? [];
    if (this.zamek.budowanoDnia === this.stan.dzien) return;

    for (const k of this.kafle) {
      const b = k.budynek;
      if (k.postawiony || !moznaBudowac(b, postawione) || !stacNas(this.stan.skarbiec, b.koszt)) {
        continue;
      }
      const granice = k.obraz.getBounds();
      const znak = this.add
        .image(k.obraz.x + granice.width * 0.22, granice.bottom - 4, `t-znak-${this.profil.frakcja}`)
        .setOrigin(0.5, 1)
        .setScale(0.42 + 0.3 * b.y)
        .setDepth(k.obraz.depth + 1);
      // Lampka pulsuje, znak stoi. Ruszanie całym znakiem wyglądałoby, jakby
      // ktoś nim machał — świeci się lampa, a nie słup.
      this.tweens.add({
        targets: znak,
        alpha: { from: 0.78, to: 1 },
        duration: 900,
        yoyo: true,
        repeat: -1,
        ease: 'Sine.easeInOut',
      });
      this.zachety.push(znak);
    }
  }

  private przywrocWyglad(b: Budynek) {
    const k = this.kafle.find((x) => x.budynek.id === b.id);
    if (!k) return;
    const postawione = this.zamek.postawione ?? [];
    // Zarys budynku, którego jeszcze nie wolno stawiać, jest bledszy: to jest
    // cała różnica między „na to cię jeszcze nie stać" a „to jest na potem".
    const mozna = moznaBudowac(b, postawione);
    k.obraz.setAlpha(k.postawiony ? 1 : mozna ? 0.95 : 0.45);
  }

  // ---------- paski ----------

  private rysujPasekGorny() {
    const g = this.add.graphics().setDepth(Z.hud);
    plate(g, 0, 0, OKNO_W, GORA, 0, C.panelDeep, C.shadow, { light: 0.12, dark: 0.2, gloss: 0.1 });
    // Kreska w barwie miasta pod paskiem: interfejs i panorama mają wyglądać
    // na jedno miejsce, a nie na okno nałożone na obrazek.
    g.fillStyle(this.profil.barwa, 1);
    g.fillRect(0, GORA - 3, OKNO_W, 3);

    const nazwa = this.add
      .text(14, GORA / 2, this.zamek.nazwa.toUpperCase(), display(17, H.goldLight))
      .setOrigin(0, 0.5)
      .setDepth(Z.hud + 1);
    this.add
      .text(nazwa.x + nazwa.width + 12, GORA / 2 + 1, this.profil.motto, body(11, H.panelEdge))
      .setOrigin(0, 0.5)
      .setDepth(Z.hud + 1);

    // Surowce po prawej, w tej samej kolejności co na mapie przygody. Ta sama
    // kolejność w dwóch miejscach jest ważniejsza, niż wygląda: dziecko szuka
    // pokeballi tam, gdzie zawsze były.
    const krok = 96;
    SUROWCE.forEach((s, i) => {
      const sx = OKNO_W - 14 - (SUROWCE.length - i) * krok + 40;
      const im = this.add.image(sx, GORA / 2, `m-${SUROWIEC_INFO[s].ikona}`).setDepth(Z.hud + 1);
      im.setScale(Math.min(1, 26 / im.height));
      this.podpisy[s] = this.add
        .text(sx + 16, GORA / 2, '0', display(15, H.goldLight))
        .setOrigin(0, 0.5)
        .setDepth(Z.hud + 1);
    });

    this.dataTekst = this.add
      .text(OKNO_W / 2, GORA / 2, '', display(13, H.panelEdge))
      .setOrigin(0.5)
      .setDepth(Z.hud + 1);
  }

  /**
   * Dolny pasek: armia bohatera i wyjście. Armia musi być widoczna cały czas,
   * bo każda decyzja na tym ekranie — zwerbować czy budować — jest decyzją
   * o niej. Przy liście po prawej stronie trzeba było wodzić wzrokiem
   * w poprzek ekranu.
   */
  private rysujPasekDolny() {
    const y = GORA + PAN_H;
    const h = OKNO_H - y;
    const g = this.add.graphics().setDepth(Z.hud);
    plate(g, 0, y, OKNO_W, h, 0, C.panelDeep, C.shadow, { light: 0.12, dark: 0.2, gloss: 0.1 });
    g.fillStyle(this.profil.barwa, 1);
    g.fillRect(0, y, OKNO_W, 3);

    for (let i = 0; i < 6; i++) {
      const sx = 12 + i * 96;
      const kont = this.add.container(sx, y + h / 2).setDepth(Z.hud + 1);
      const tlo = this.add.graphics();
      plate(tlo, 0, -20, 88, 40, 8, mix(C.panel, C.panelDeep, 0.35), C.panelDeep, {
        light: 0.14,
        dark: 0.16,
        gloss: 0.1,
        edgeW: 2,
      });
      const im = this.add.image(24, 0, 'p-00193').setVisible(false);
      const t = this.add.text(48, 0, '—', body(12, H.inkSoft)).setOrigin(0, 0.5);
      kont.add([tlo, im, t]);
      this.slotyArmii[i] = kont;
    }

    this.komunikat = this.add
      .text(OKNO_W - 210, y + h / 2, '', body(12, H.goldLight))
      .setOrigin(1, 0.5)
      .setDepth(Z.hud + 1)
      .setWordWrapWidth(340);

    const wyjscie = makeHudButton(this, {
      x: OKNO_W - 100,
      y: y + h / 2,
      w: 180,
      h: 38,
      icon: ICON.boot,
      tone: C.ally,
      toneDeep: C.allyDeep,
      onClick: () => this.scene.start('adventure'),
      depth: Z.hud + 2,
    });
    wyjscie.setLabel('Wyjdź na mapę');
  }

  // ---------- karta budynku ----------

  /**
   * Jedna karta obsługuje wszystkie budynki: co można z tym zrobić, ile to
   * kosztuje i jeden przycisk. Osobne okna na budowę i na werbunek znaczyłyby
   * dwa różne układy do nauczenia się — a to jest ten sam gest: kliknij
   * budynek, zobacz cenę, potwierdź.
   */
  private rysujKarte() {
    const w = 300;
    const h = 196;
    const x = 14;
    const y = GORA + PAN_H - h - 14;
    this.karta = this.add.container(x, y).setDepth(Z.hud + 4).setVisible(false);
    const tlo = drawPanelBody(this, 0, 0, w, h, 8, this.karta);
    tlo.setDepth(0);

    this.kartaStworek = this.add.image(w - 54, 62, 'p-00193').setVisible(false);
    this.kartaTytul = this.add.text(18, 16, '', display(16)).setOrigin(0, 0);
    this.kartaOpis = this.add
      .text(18, 42, '', body(12, H.inkSoft))
      .setOrigin(0, 0)
      .setWordWrapWidth(w - 90);
    this.kartaKoszt = this.add.container(18, 112);
    this.kartaPrzycisk = makeHudButton(this, {
      x: x + w / 2,
      y: y + h - 30,
      w: w - 40,
      h: 38,
      icon: ICON.star,
      tone: C.gold,
      toneDeep: C.goldDeep,
      onClick: () => this.dzialaj(),
      depth: Z.hud + 6,
    });
    this.karta.add([this.kartaStworek, this.kartaTytul, this.kartaOpis, this.kartaKoszt]);
    // Przycisk zostaje osobnym obiektem sceny — `makeHudButton` sam wiesza go
    // na scenie i wciągnięcie go do kontenera rozjeżdża jego strefę kliknięcia.
    // Widoczność prowadzimy więc razem z kartą, ręcznie.
    this.kartaPrzycisk.setVisible(false);
  }

  /**
   * Kliknięcie w postawiony ratusz otwiera JEGO ROZBUDOWĘ, a nie opis tego,
   * co już stoi. Tak działa to w Heroes 3 i tak jest krócej: budynek, który
   * ma następny stopień, jest jednocześnie przyciskiem do niego. Inaczej
   * trzeba by rysować zarys drugiego ratusza w tym samym punkcie panoramy.
   */
  private pokazBudynek(b: Budynek) {
    let cel = b;
    if (b.rodzaj === 'ratusz' && (this.zamek.postawione ?? []).includes(b.id)) {
      const nastepny = ['ratusz1', 'ratusz2', 'ratusz3'].find(
        (r) => !(this.zamek.postawione ?? []).includes(r)
      );
      const bud = nastepny && this.profil.budynki.find((x) => x.id === nastepny);
      if (bud) cel = bud;
    }
    this.wybrany = cel;
    this.karta.setVisible(true);
    this.kartaPrzycisk.setVisible(true);
    this.odswiezKarte();
  }

  private odswiezKarte() {
    const b = this.wybrany;
    if (!b) return;
    const postawione = this.zamek.postawione ?? [];
    const stoi = postawione.includes(b.id);
    this.kartaTytul.setText(b.nazwa);

    if (stoi && b.rodzaj === 'siedlisko' && b.poziom !== undefined) {
      // Postawione siedlisko to sklep ze stworkami — karta pokazuje, kto
      // w nim czeka i za ile.
      const u = this.frakcja.units[b.poziom];
      const ile = this.zamek.dostepne?.[b.poziom] ?? 0;
      this.kartaOpis.setText(
        `${u.name}\nczeka: ${ile}\natak ${u.atk} · życie ${u.hp}`
      );
      this.kartaStworek.setTexture(`p-${u.sprite}`).setVisible(true);
      this.kartaStworek.setScale(Math.min(1, 72 / this.kartaStworek.height));
      this.pokazKoszt({ pokeball: KOSZT_ODDZIALU[b.poziom] }, ' za sztukę');
      const stac = this.stan.skarbiec.pokeball >= KOSZT_ODDZIALU[b.poziom];
      this.kartaPrzycisk.setLabel(
        !this.bohaterObecny ? 'Brak bohatera' : ile > 0 ? `Zwerbuj (${ile})` : 'Nikt nie czeka'
      );
      this.kartaPrzycisk.setEnabled(this.bohaterObecny && ile > 0 && stac);
      return;
    }

    this.kartaStworek.setVisible(false);
    if (stoi) {
      this.kartaOpis.setText(`${b.opis}\n\nJuż stoi.`);
      this.pokazKoszt({});
      this.kartaPrzycisk.setLabel('Gotowe');
      this.kartaPrzycisk.setEnabled(false);
      return;
    }

    const mozna = moznaBudowac(b, postawione);
    const brakWarunku = b.wymaga
      .filter((w) => !postawione.includes(w))
      .map((w) => this.profil.budynki.find((x) => x.id === w)?.nazwa ?? w);
    const juzBudowano = this.zamek.budowanoDnia === this.stan.dzien;
    this.kartaOpis.setText(
      mozna
        ? juzBudowano
          ? `${b.opis}\n\nDziś już tu budowano.`
          : b.opis
        : `${b.opis}\n\nNajpierw: ${brakWarunku.join(', ')}.`
    );
    this.pokazKoszt(b.koszt);
    const rozbudowa = b.rodzaj === 'ratusz' && b.id !== 'ratusz1';
    this.kartaPrzycisk.setLabel(rozbudowa ? 'Rozbuduj' : 'Buduj');
    this.kartaPrzycisk.setEnabled(
      mozna && !juzBudowano && stacNas(this.stan.skarbiec, b.koszt) && !!this.zamek.nasz
    );
  }

  /** Cena jako ikony z liczbami — czytelna, zanim dziecko przeczyta nazwy. */
  private pokazKoszt(koszt: Partial<Record<Surowiec, number>>, przyrostek = '') {
    this.kartaKoszt.removeAll(true);
    let x = 0;
    for (const [co, ile] of Object.entries(koszt)) {
      const s = co as Surowiec;
      const im = this.add.image(x, 0, `m-${SUROWIEC_INFO[s].ikona}`);
      im.setScale(Math.min(1, 24 / im.height));
      const brak = this.stan.skarbiec[s] < ile;
      const t = this.add
        .text(x + 17, 0, String(ile), display(14, brak ? H.foe : H.ink))
        .setOrigin(0, 0.5);
      this.kartaKoszt.add([im, t]);
      x += 34 + t.width;
    }
    if (przyrostek) {
      this.kartaKoszt.add(
        this.add.text(x + 2, 0, przyrostek, body(11, H.inkSoft)).setOrigin(0, 0.5)
      );
    }
  }

  private dzialaj() {
    const b = this.wybrany;
    if (!b) return;
    const stoi = (this.zamek.postawione ?? []).includes(b.id);
    if (stoi && b.rodzaj === 'siedlisko' && b.poziom !== undefined) this.kup(b.poziom);
    else this.buduj(b);
  }

  // ---------- działania ----------

  private buduj(b: Budynek) {
    const wynik = zbuduj(this.stan, this.zamek, b.id);
    this.komunikat.setText(wynik.opis);
    if (!wynik.ok) return;

    // Zarys zamienia się w budynek na oczach gracza. To jest cała nagroda za
    // wydanie surowców — bez niej rozbudowa jest liczbą w tabeli. Panoramę
    // składamy od nowa, bo ratusz wyższego stopnia zastępuje niższy i sama
    // podmiana grafiki by tu nie wystarczyła.
    this.rysujBudynki();
    const k = this.kafle.find((x) => x.budynek.id === b.id) ?? this.kafle.find((x) => x.budynek.rodzaj === b.rodzaj);
    if (k) {
      this.tweens.add({
        targets: k.obraz,
        scale: { from: this.skalaBudynku(k.budynek) * 0.82, to: this.skalaBudynku(k.budynek) },
        duration: 320,
        ease: 'Back.easeOut',
      });
    }
    this.odswiez();
  }

  /**
   * Werbunek. Oddział tego samego gatunku dokleja się do istniejącego slotu,
   * a nie zakłada nowego — inaczej cztery zakupy po jednym Pyroko dałyby
   * cztery osobne oddziały po jednym stworku, czyli armię bez sensu.
   */
  private kup(tier: number) {
    if (!this.bohaterObecny) {
      this.komunikat.setText('Nie ma tu komu ich oddać.\nPrzyprowadź bohatera do zamku.');
      return;
    }
    const dostepne = this.zamek.dostepne ?? [];
    const koszt = KOSZT_ODDZIALU[tier];
    if ((dostepne[tier] ?? 0) <= 0) {
      this.komunikat.setText('Nic tu na razie nie czeka. Wróć jutro.');
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
    this.komunikat.setText(`Zwerbowano ${ile} × ${u.name}.`);
    this.odswiez();
  }

  // ---------- odświeżanie ----------

  private odswiez() {
    const wplyw = dochod(this.stan);
    for (const s of SUROWCE) {
      const ile = wplyw[s] ?? 0;
      this.podpisy[s]?.setText(ile > 0 ? `${this.stan.skarbiec[s]}  +${ile}` : String(this.stan.skarbiec[s]));
    }
    const d = data(this.stan.dzien);
    this.dataTekst.setText(`Tydzień ${d.tydzien}, dzień ${d.dzienTygodnia}`);

    for (let i = 0; i < 6; i++) {
      const a = this.stan.bohater.armia[i];
      const kont = this.slotyArmii[i];
      const im = kont.list[1] as Phaser.GameObjects.Image;
      const t = kont.list[2] as Phaser.GameObjects.Text;
      if (a) {
        im.setTexture(`p-${a.sprite}`).setVisible(true);
        im.setScale(Math.min(1, 32 / im.height));
        t.setText(String(a.ile)).setStyle(display(14, H.ink));
      } else {
        im.setVisible(false);
        t.setText('—').setStyle(body(12, H.inkSoft));
      }
    }

    for (const k of this.kafle) this.przywrocWyglad(k.budynek);
    this.rysujZachety();
    if (this.wybrany) this.odswiezKarte();
  }
}

/** Identyfikatory budynków — kolejność wczytywania grafik. */
const BUDYNKI_ID = [
  'ratusz1',
  'ratusz2',
  'ratusz3',
  'fort',
  'siedlisko1',
  'siedlisko2',
  'siedlisko3',
  'siedlisko4',
  'siedlisko5',
  'siedlisko6',
  'specjalny',
];

/** Szerokość ekranu zamku bierzemy z tej samej geometrii co mapa. */
export const ZAMEK_W = OKNO_W;
