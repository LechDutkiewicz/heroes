import Phaser from 'phaser';
import {
  KOSZT_ODDZIALU,
  PRZYROST_ODDZIALU,
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
  dochodZamku,
  moznaBudowac,
  profilZamku,
  przyrostZamku,
  stacNas,
  type Budynek,
} from '../data/zamki';
import { MNOZNIK_FORTU } from '../data/zasady-h3';
import { FACTIONS, factionById } from '../data/factions';
import { type Armia, dolacz, znormalizuj, zywe } from '../data/armia';
import { PanelArmii } from '../visual/panelArmii';
import { zapisz } from '../dev/dziennik';
import { C, T, Z } from '../visual/theme';
import { mix } from '../visual/hud';
import { GORA as BELKA_DOL, MARGINES, OKNO_H, OKNO_W } from '../visual/uklad';
import {
  BARWA,
  KROJ,
  Przycisk,
  cienPanelu,
  krojeZestawu,
  medalion,
  napisNaDrewnie,
  ozdobnik,
  panelPergaminu,
  ramaZlota,
  stylAtramentu,
  stylEtykiety,
  tloDrewna,
  wczytajZestaw,
} from '../visual/zestaw';
import { wersjonujZasoby } from '../visual/zasoby';
import {
  MUZYKA_MIASTO,
  initSfx,
  loadSfx,
  sfx,
  startMusic,
  stopMusic,
  toggleSfx,
} from '../audio/mapSfx';

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
 * Pliki brył zawierają SAMĄ bryłę, bez marginesu na cień.
 *
 * Wcześniej cień rzucony był wypalony w grafice: ścięty w lewo i spłaszczony,
 * przez co plik był szerszy od budynku o 42% i środek bryły nie leżał
 * w środku obrazka. Gorzej — na ekranie ten cień czytał się jako osobna
 * ciemna plama leżąca obok budynku, czyli robił dokładnie to, czemu miał
 * zapobiegać. Cień rysuje teraz scena, miękko i wprost pod podstawą.
 *
 * Stałe zostają, bo cała geometria sceny jest przez nie wyrażona — tylko ich
 * wartości zeszły do neutralnych.
 */
const SRODEK_BRYLY = 0.5;
const SZEROKOSC_BRYLY = 1;

/**
 * Barwa mgły powietrznej — pobrana z nieba panoramy nad linią drzew.
 *
 * To, co dalej, jest jaśniejsze, mniej nasycone i chłodniejsze, bo patrzymy
 * przez kilometr powietrza. Malarze nazywają to perspektywą powietrzną i to
 * ona, a nie sama wielkość, mówi oku „to stoi z tyłu". Bez niej każdy budynek
 * jest jednakowo dosadny i cała polana spłaszcza się do rzędu naklejek.
 */
const MGLA_DALI = 0xc9dcea;

/*
 * Rama ekranu — ten sam układ i materiał co mapa przygody (`AdventureScene`):
 * drewno z belką nagłówka, panorama w grubej złotej ramie jak plansza, pod nią
 * pergaminowe pola w cienkich ramach, a na linii paska surowców mapy — ten sam
 * pasek surowców i tabliczki przycisków. Przejście mapa ↔ miasto ma wyglądać
 * jak zmiana obrazu w tej samej ramie, a nie jak wejście do innej gry.
 *
 * Panorama dalej leży jeden do jednego od (0, GORA) — cała geometria budynków
 * jest w tym układzie — a okno tylko ją przycina: 8 px z boków pod złotą ramą
 * i dół z głazami przedplanu pod paskiem armii.
 */
const OKNO_X = MARGINES;
const OKNO_Y = BELKA_DOL;
const OKNO_SZ = OKNO_W - MARGINES * 2;
/**
 * Wysokość okna panoramy. Było 492, ale pod panoramą muszą się zmieścić DWA
 * rzędy armii (garnizon i bohater odwiedzający, jak w HotA) — więc okno
 * obcina 22 px przedplanu z dołu. Budynek stojący najbliżej (y = 1) ma
 * podstawę na 502 px, więc dalej stoi cały w oknie.
 */
const OKNO_WYS = 470;
/** Dwa rzędy armii pod panoramą: garnizon (górny) i bohater (dolny). */
const RZAD_H = 64;
const GARNIZON_Y = OKNO_Y + OKNO_WYS + 22;
const BOHATER_Y = GARNIZON_Y + RZAD_H + 6;
const SLOT_W = 52;
const SLOT_ODSTEP = 4;
/** Prawa kolumna: komunikat, pod nim surowce, na dole tabliczki „Buduj" i „Wyjdź". */
const KOMUNIKAT_H = 54;
const SUROWCE_Y = GARNIZON_Y + KOMUNIKAT_H + 6;
const SUROWCE_H = 32;
const PRZYCISKI_Y = BOHATER_Y + RZAD_H - 17;
/** Lewa kolumna dołu (dwa rzędy armii); po prawej komunikat, surowce i tabliczki. */
const LEWA_SZ = 568;
const PRAWA_X = LEWA_SZ + 18;
const PRAWA_SZ = OKNO_W - MARGINES - PRAWA_X;
/** Karta budynku stoi w lewym dolnym rogu panoramy i rośnie w górę. */
const KARTA_X = OKNO_X + 14;
const KARTA_W = 320;
const KARTA_DOL = OKNO_Y + OKNO_WYS - 14;
const DOMYSLNY_KOMUNIKAT =
  'Kliknij budynek, żeby werbować. Kliknij stworka, potem inny slot — przestawisz armię. Prawy klik: opis.';
/** Skąd ekran bohatera ma wrócić — czyta go `HeroScene.zamknij`. */
const KLUCZ_POWROTU = 'powrot-z-bohatera';

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
  private dochody: Partial<Record<Surowiec, Phaser.GameObjects.Text>> = {};
  /**
   * Garnizon zamku — ta sama tablica co `zamek.garnizon` (siedem slotów
   * z dziurami), więc każda zmiana od razu jest w stanie gry i w zapisie.
   */
  private garnizon: Armia = [];
  private panel!: PanelArmii;
  private karta!: Phaser.GameObjects.Container;
  private kartaTlo: Phaser.GameObjects.GameObject[] = [];
  private kartaTytul!: Phaser.GameObjects.Text;
  private kartaOpis!: Phaser.GameObjects.Text;
  private kartaKoszt!: Phaser.GameObjects.Container;
  private kartaPrzycisk!: Przycisk;
  private kartaStworek!: Phaser.GameObjects.Image;
  private kartaMedalion!: Phaser.GameObjects.Graphics;
  private zachety: Phaser.GameObjects.Image[] = [];
  private wybrany?: Budynek;
  private komunikat!: Phaser.GameObjects.Text;
  private dataTekst!: Phaser.GameObjects.Text;
  private bohaterStan!: Phaser.GameObjects.Text;
  private garnizonStan!: Phaser.GameObjects.Text;

  constructor() {
    super('zamek');
  }

  preload() {
    wersjonujZasoby(this);
    wczytajZestaw(this);
    loadSfx(this, MUZYKA_MIASTO);
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
  }

  create() {
    // Phaser używa tej samej instancji sceny przy każdym `scene.start`, więc
    // wszystko, co zbierane w polach, trzeba czyścić tutaj. Bez tego przy
    // drugim wejściu do miasta zostają kafle z poprzedniego.
    this.kafle = [];
    this.podpisy = {};
    this.dochody = {};
    this.kartaTlo = [];
    this.zachety = [];
    this.wybrany = undefined;

    this.stan = this.registry.get(KLUCZ_STANU) as StanMapy;
    const id = this.registry.get(KLUCZ_ZAMKU) as number;
    this.zamek = this.stan.obiekty.find((o) => o.id === id)!;
    this.zamek.postawione ??= [];
    this.garnizon = this.zamek.garnizon = znormalizuj(this.zamek.garnizon);

    this.zbudujCien();
    this.rysujRame();
    this.rysujPanorame();
    this.rysujBudynki();
    this.rysujPierwszyPlan();
    this.rysujPasekGorny();
    this.rysujPasekArmii();
    this.rysujPasekDolny();
    this.rysujKarte();
    this.odswiez();
    // Kroje zestawu wczytują się raz na grę i zwykle już są (do miasta
    // wchodzi się z mapy). Gdyby doszły później — przerysowujemy napisy.
    void krojeZestawu().then(() => this.przerysujNapisy());

    initSfx(this);
    startMusic(this, MUZYKA_MIASTO);
    this.input.keyboard?.on('keydown-M', () => {
      const wlaczony = toggleSfx(this);
      this.komunikat.setText(wlaczony ? 'Dźwięk włączony  (M)' : 'Dźwięk wyciszony  (M)');
    });
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
   * jest w Heroes 3. Werbunek idzie wtedy do GARNIZONU zamku (jak w Heroes 3),
   * a z bohaterem w zamku — do jego armii (a gdy ta jest pełna, do garnizonu).
   * Dolny rząd armii (bohater odwiedzający) jest aktywny tylko z bohaterem.
   *
   * Liczone z położenia, a nie z flagi przekazanej przy wejściu: flaga
   * zdążyłaby się zestarzeć, a te dwie liczby są zawsze prawdziwe.
   */
  private get bohaterObecny() {
    return this.stan.bohater.x === this.zamek.x && this.stan.bohater.y === this.zamek.y;
  }

  // ---------- panorama ----------

  /**
   * Drewno pod całym ekranem i gruba złota rama wokół panoramy — dokładnie
   * te, które na mapie przygody otaczają planszę. Rama leży NAD panoramą
   * i przedplanem (jak na mapie: wewnętrzna warga zachodzi na obraz), więc
   * między złotem a krajobrazem nie ma szpary.
   */
  private rysujRame() {
    tloDrewna(this).setDepth(Z.sky);
    cienPanelu(this, OKNO_X, OKNO_Y, OKNO_SZ, OKNO_WYS, 0.8).setDepth(Z.sky);
    ramaZlota(this, OKNO_X, OKNO_Y, OKNO_SZ, OKNO_WYS, true).setDepth(Z.hud);
  }

  private rysujPanorame() {
    const tlo = this.add
      .image(0, GORA, `t-tlo-${this.profil.frakcja}`)
      .setOrigin(0, 0)
      .setDepth(Z.sky);
    // Okno przycina panoramę (współrzędne tekstury: ekran minus (0, GORA)).
    tlo.setCrop(OKNO_X, OKNO_Y - GORA, OKNO_SZ, OKNO_WYS);
    // Kliknięcie w krajobraz zamyka kartę. Karta leży w rogu panoramy i
    // przykrywa dwa budynki; bez sposobu na jej zamknięcie trzeba by je
    // odsłaniać, klikając w cokolwiek innego i licząc, że się trafi.
    // Strefa tylko w oknie — przycięta część obrazka nie może łapać kliknięć.
    tlo.setInteractive(
      new Phaser.Geom.Rectangle(OKNO_X, OKNO_Y - GORA, OKNO_SZ, OKNO_WYS),
      Phaser.Geom.Rectangle.Contains
    );
    tlo.on('pointerdown', () => this.schowajKarte());
  }

  private schowajKarte() {
    this.wybrany = undefined;
    this.karta.setVisible(false);
    this.kartaPrzycisk.kontener.setVisible(false);
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
      // Rysujemy WYŁĄCZNIE to, co stoi. Wcześniej w każdym wolnym miejscu
      // sterczał blady zarys placu budowy i miasto pierwszego dnia było pełne
      // rusztowań zamiast puste. W Heroes 3 miasto wypełnia się w miarę
      // rozbudowy — i to jest połowa satysfakcji z budowania. Czego jeszcze
      // brakuje, mówi lista budowy (przycisk „Buduj").
      if (!postawione.includes(b.id)) continue;
      const stoi = true;
      const klucz = `t-${this.profil.frakcja}-${b.id}`;
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
      // Perspektywa powietrzna. Tint mnoży, więc barwa mgły PRZYCIEMNIA —
      // dlatego mieszamy ją z bielą i dopiero to nakładamy: dalekie bryły
      // tracą trochę nasycenia i ciepła, bliskie zostają nietknięte.
      im.setTint(mix(0xffffff, MGLA_DALI, 0.34 * (1 - b.y)));

      this.zaroslaPrzyPodstawie(im, gleboko + 1);
      // Cień idzie PONAD pasem trawy, nie pod bryłą. Położony niżej był przez
      // ten pas częściowo zamalowywany i zostawała po nim twarda pozioma
      // krawędź — widoczna kreska w poprzek łąki. Na wierzchu kładzie się
      // równo na trawie i na dolnej krawędzi ściany, co zresztą jest prawdą:
      // przy samej ziemi mur też jest ciemniejszy.
      this.cienKontaktowy(im, gleboko + 2);

      this.kafle.push({ budynek: b, obraz: im, postawiony: stoi });
      this.podepnijKliki(im, b);
      this.przywrocWyglad(b);
    }
  }

  /**
   * Pierwszy plan panoramy narysowany PONAD budynkami.
   *
   * Na dole obrazu leżą wielkie głazy, kwiaty i kępy trawy, które kadrują
   * scenę. Dopóki wszystko było jedną warstwą tła, budynek postawiony w tym
   * pasie wchodził na głaz i było widać, że jest naklejony. Teraz ten sam pas
   * panoramy idzie jeszcze raz, na samą górę: głaz zasłania budowlę dokładnie
   * tak, jak zasłoniłby ją w prawdziwym krajobrazie.
   *
   * To jest zwykła sztuczka dwuipółwymiarowa — tło, warstwa gry, przedplan —
   * i to ona daje głębię, której nie da żaden cień.
   *
   * Pas zaczyna się nieco poniżej najgłębszego miejsca, gdzie stoi budynek,
   * więc nic, co klikalne, nie chowa się za nim całkowicie.
   */
  private rysujPierwszyPlan() {
    const gora = this.naZiemi({ y: 1 } as Budynek) + 26;
    const im = this.add
      .image(0, GORA, `t-tlo-${this.profil.frakcja}`)
      .setOrigin(0, 0)
      // Ponad wszystkimi bryłami, ale pod paskami i kartą.
      .setDepth(Z.hud - 1);
    // Przy niższym oknie (dwa rzędy armii) pas przedplanu może leżeć całkiem
    // pod ramą — wtedy nie ma czego dokładać.
    if (OKNO_Y + OKNO_WYS - gora <= 0) {
      im.destroy();
      return;
    }
    im.setCrop(OKNO_X, gora - GORA, OKNO_SZ, OKNO_Y + OKNO_WYS - gora);
  }

  /**
   * Cień kontaktowy — jedyna rzecz, która naprawdę stawia bryłę NA ziemi.
   *
   * Cień rzucony (ten wypalony w pliku) mówi tylko „coś tu świeci z boku".
   * O dotknięciu podłoża decyduje co innego: ciasne, ciemne przyciemnienie
   * dokładnie w linii styku, przechodzące w szeroką, ledwie widoczną poświatę.
   * Bez niego budynek unosi się nad trawą, choćby cień rzucony był idealny —
   * i to jest cała różnica między „naniesione na tło" a „stoi w krajobrazie".
   *
   * Dwie elipsy, nie jedna. Jedna szeroka i miękka daje kałużę, jedna wąska
   * i ostra — podkładkę. Dopiero obie naraz czytają się jak cień.
   */
  private cienKontaktowy(im: Phaser.GameObjects.Image, gleboko: number) {
    const szer = im.displayWidth * SZEROKOSC_BRYLY;
    const cien = this.add
      // Odsunięty o włos w lewo: słońce stoi po prawej, tak jak na panoramie.
      // To ma być cień, który wychodzi spod budynku, a nie leży obok niego —
      // dlatego przesunięcie jest małe, ledwie kilka procent szerokości.
      .image(im.x - szer * 0.07, im.y - szer * 0.02, 't-cien')
      .setDisplaySize(szer * 1.2, szer * 0.36)
      .setDepth(gleboko)
      // Mnożenie, nie przykrywanie. Czarna plama z krycia 0,3 rozjaśnia się
      // do szarości i leży NA trawie jak folia; mnożenie przyciemnia to, co
      // pod spodem, zachowując jej fakturę i barwę — czyli robi to, co cień.
      .setBlendMode(Phaser.BlendModes.MULTIPLY)
      .setAlpha(0.85);
    return cien;
  }

  /**
   * Miękka plama cienia jako tekstura, rysowana raz na scenę.
   *
   * Pierwsza wersja rysowała elipsy przez `fillEllipse` i wyglądały brzydko
   * z jednego powodu: elipsa ma OSTRĄ krawędź, a cień kontaktowy nie ma
   * żadnej — gaśnie stopniowo. Ostry brzeg czyta się jak kałuża albo dziura
   * w trawie. Kilkadziesiąt elips o rosnącym promieniu i malejącym kryciu daje
   * zejście do zera, którego nie widać.
   */
  private zbudujCien() {
    if (this.textures.exists('t-cien')) return;
    const bok = 256;
    const g = this.add.graphics();
    const krokow = 48;
    for (let i = krokow; i > 0; i--) {
      const t = i / krokow;
      // Kwadrat krycia: środek zostaje wyraźny, a ogon długi i ledwie widoczny.
      g.fillStyle(0x000000, 0.055 * (1 - t) * (1 - t));
      g.fillEllipse(bok / 2, bok / 4, bok * t, (bok / 2) * t);
    }
    g.generateTexture('t-cien', bok, bok / 2);
    g.destroy();
  }

  /**
   * Zarośla zachodzące na dolną krawędź bryły — wycięte z SAMEJ PANORAMY.
   *
   * Budynek wycięty z tła ma nieprzerwany, czysty obrys od dołu, a w naturze
   * nic takiego nie istnieje: przy każdej ścianie coś rośnie i zasłania jej
   * podstawę. Przerwanie tej krawędzi robi dla osadzenia więcej niż jakikolwiek
   * cień, bo oko przestaje widzieć granicę wycięcia.
   *
   * Pierwsza wersja rysowała źdźbła trawy z trójkątów. Wyszedł z tego rząd
   * zielonych kolców: proceduralna trawa przegrywa z malowaną, bo nie ma jak
   * podrobić jej faktury ani światła. Więc nie podrabiamy — bierzemy pas
   * panoramy dokładnie z tego miejsca, w którym stoi budynek, i kładziemy go
   * z powrotem na wierzch. To jest ta sama trawa, którą namalował model, więc
   * pasuje idealnie z definicji.
   *
   * Krycie schodzi ku górze trzema pasami. Gradientu alfy Phaser na obrazku nie
   * zrobi bez maski bitmapowej, a trzy pasy dają to samo za jedną trzecią
   * kłopotu — przy paśmie wysokim na kilkanaście pikseli nikt nie zobaczy
   * stopni.
   */
  private zaroslaPrzyPodstawie(im: Phaser.GameObjects.Image, gleboko: number) {
    const szer = im.displayWidth * SZEROKOSC_BRYLY;
    const pasmo = Math.max(6, szer * 0.13);
    const lewo = im.x - szer * 0.56;
    const szerokosc = szer * 1.12;
    const warstwy: Phaser.GameObjects.Image[] = [];
    const krycie = [0.45, 0.75, 1];
    for (let i = 0; i < krycie.length; i++) {
      const wysPasa = pasmo / krycie.length;
      const y = im.y - pasmo + i * wysPasa;
      const kopia = this.add
        .image(0, GORA, `t-tlo-${this.profil.frakcja}`)
        .setOrigin(0, 0)
        .setDepth(gleboko)
        .setAlpha(krycie[i]);
      // Panorama jest rysowana jeden do jednego od (0, GORA), więc piksel
      // ekranu (x, y) to piksel tekstury (x, y − GORA).
      kopia.setCrop(lewo, y - GORA, szerokosc, wysPasa + 1);
      warstwy.push(kopia);
    }
    return warstwy;
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
    // Najechanie ROZŚWIETLA bryłę, a nie powiększa.
    //
    // Powiększanie było najgorszym możliwym sygnałem w tej scenie: przesuwało
    // budynek względem gruntu, na którym stoi, więc za każdym razem dowodziło,
    // że to osobna warstwa naklejona na tło. Kopia sprite'a w trybie dodawania
    // niczego nie rusza — po prostu w budynek uderza więcej światła, co przy
    // panoramie w złotej godzinie czyta się zupełnie naturalnie.
    const blask = this.add
      .image(im.x, im.y, im.texture.key)
      .setOrigin(im.originX, im.originY)
      .setScale(im.scaleX)
      .setDepth(im.depth)
      .setBlendMode(Phaser.BlendModes.ADD)
      .setAlpha(0);
    im.on('pointerover', () => {
      this.tweens.add({ targets: blask, alpha: 0.22, duration: T.pop, ease: 'Quad.easeOut' });
      // Zarys po najechaniu tylko jaśnieje. Doprowadzenie go do pełnej krycia
      // kłamałoby o stanie miasta: przez chwilę wyglądałby na postawiony.
      im.setAlpha(Math.min(1, im.alpha + 0.25));
    });
    im.on('pointerout', () => {
      this.tweens.add({ targets: blask, alpha: 0, duration: T.pop });
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
    if (this.zamek.wlasciciel !== 'gracz') return;
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

  /** Przerysowuje każdy napis sceny, także w kontenerach — po wczytaniu krojów. */
  private przerysujNapisy() {
    if (!this.sys.isActive()) return;
    const przejdz = (lista: Phaser.GameObjects.GameObject[]) => {
      for (const o of lista) {
        if (o instanceof Phaser.GameObjects.Text) o.updateText();
        else if (o instanceof Phaser.GameObjects.Container) przejdz(o.list);
      }
    };
    przejdz(this.children.list);
    this.odswiez();
  }

  /**
   * Belka nagłówka: nazwa miasta tam, gdzie mapa ma tytuł misji, i ten sam
   * krój (kremowy Cinzel z brązowym konturem). Data po prawej, jak na mapie
   * pod panelem — tu belka jest jedynym wolnym miejscem.
   */
  private rysujPasekGorny() {
    const nazwa = napisNaDrewnie(this, MARGINES + 6, 20, this.zamek.nazwa, 19)
      .setOrigin(0, 0.5)
      .setDepth(Z.hud + 1);
    const motto = this.add
      .text(nazwa.x + nazwa.width + 14, 21, `„${this.profil.motto}"`, {
        fontFamily: KROJ.kursywa,
        fontSize: '14px',
        color: BARWA.krem,
        stroke: BARWA.braz,
        strokeThickness: 3,
      })
      .setOrigin(0, 0.5)
      .setAlpha(0.82)
      .setDepth(Z.hud + 1);
    // Szerokość nazwy zależy od kroju — po jego dojściu motto dosuwa się.
    void krojeZestawu().then(() => {
      if (motto.active) motto.setX(nazwa.x + nazwa.width + 14);
    });

    this.dataTekst = napisNaDrewnie(this, OKNO_W - MARGINES - 6, 20, '', 15)
      .setOrigin(1, 0.5)
      .setDepth(Z.hud + 1);
  }

  /**
   * Dwa rzędy armii pod panoramą — jak w HotA: górny to GARNIZON zamku (z
   * herbem miasta w medalionie), dolny to bohater odwiedzający (z portretem;
   * klik w portret otwiera ekran bohatera). Oba rzędy prowadzi jeden
   * `PanelArmii`, więc zaznaczenie jest wspólne i oddział przechodzi między
   * nimi tym samym gestem, którym przestawia się go w rzędzie.
   *
   * Po prawej pergamin z komunikatem i tabliczką „Podziel", jak pole
   * podpowiedzi na mapie.
   */
  private rysujPasekArmii() {
    this.panel = new PanelArmii(this, {
      glebia: Z.hud + 1,
      powiedz: (t) => this.komunikat.setText(t),
      poZmianie: (opis) => {
        zapisz('armia', `miasto: ${opis}`);
        this.odswiez();
      },
    });
    const rzadX = LEWA_SZ - 10 - (7 * SLOT_W + 6 * SLOT_ODSTEP);

    // --- garnizon ---
    this.rzadArmii(GARNIZON_Y, 'Garnizon', (mx, my, r) => {
      const postawione = this.zamek.postawione ?? [];
      const ratusz = ['ratusz3', 'ratusz2', 'ratusz1'].find((x) => postawione.includes(x)) ?? 'ratusz1';
      const herb = this.add.image(mx, my, `t-${this.profil.frakcja}-${ratusz}`).setDepth(Z.hud + 2);
      herb.setScale(Math.min((r * 2 - 10) / herb.width, (r * 2 - 10) / herb.height));
    });
    this.garnizonStan = this.add
      .text(74, GARNIZON_Y + 30, '', { ...stylAtramentu(11, 'miekki'), wordWrap: { width: rzadX - 80 } })
      .setDepth(Z.hud + 1);
    this.panel.dodajPasek({
      x: rzadX,
      y: GARNIZON_Y + 6,
      slotW: SLOT_W,
      slotH: RZAD_H - 12,
      odstep: SLOT_ODSTEP,
      armia: () => this.garnizon,
      aktywny: () => this.zamek.wlasciciel === 'gracz',
      powodNieaktywny: 'To nie jest twój zamek.',
      gdzie: 'w garnizonie',
      dokad: 'do garnizonu',
    });

    // --- bohater odwiedzający ---
    const obecny = this.bohaterObecny;
    this.rzadArmii(BOHATER_Y, obecny ? this.stan.bohater.imie : 'Bohater', (mx, my, r) => {
      if (!obecny || !this.textures.exists('bohater')) return;
      const portret = this.add.image(mx, my - 1, 'bohater', 0).setDepth(Z.hud + 2);
      portret.setScale((r * 2 - 8) / portret.height);
      // Klik w portret — ekran bohatera, jak w HotA. Wraca się stamtąd tutaj.
      const blask = this.add.circle(mx, my, r, 0xfff3c8, 0).setDepth(Z.hud + 3);
      this.add
        .zone(mx - r, my - r, r * 2, r * 2)
        .setOrigin(0, 0)
        .setDepth(Z.hud + 4)
        .setInteractive({ useHandCursor: true })
        .on('pointerover', () => {
          blask.setFillStyle(0xfff3c8, 0.22);
          this.komunikat.setText(`${this.stan.bohater.imie} — kliknij portret, żeby otworzyć ekran bohatera.`);
        })
        .on('pointerout', () => blask.setFillStyle(0xfff3c8, 0))
        .on('pointerdown', (p: Phaser.Input.Pointer) => {
          if (p.rightButtonDown() || this.panel.oknoOtwarte) return;
          this.otworzBohatera();
        });
    });
    this.bohaterStan = this.add
      .text(74, BOHATER_Y + 30, '', { ...stylAtramentu(11, 'miekki'), wordWrap: { width: rzadX - 80 } })
      .setDepth(Z.hud + 1);
    this.panel.dodajPasek({
      x: rzadX,
      y: BOHATER_Y + 6,
      slotW: SLOT_W,
      slotH: RZAD_H - 12,
      odstep: SLOT_ODSTEP,
      armia: () => this.stan.bohater.armia,
      chroniona: true,
      aktywny: () => this.bohaterObecny,
      powodNieaktywny: 'Bohater jest poza zamkiem. Przyprowadź go, żeby wymieniać oddziały z garnizonem.',
      gdzie: 'u bohatera',
      dokad: 'do bohatera',
    });

    // --- komunikat z tabliczką „Podziel" ---
    const y = GARNIZON_Y;
    const h = KOMUNIKAT_H;
    const podzielW = 92;
    panelPergaminu(this, PRAWA_X, y, PRAWA_SZ, h).forEach((c) => c.setDepth(Z.hud));
    this.komunikat = this.add
      .text(PRAWA_X + 10, y + h / 2, '', { ...stylAtramentu(13), lineSpacing: 1 })
      .setOrigin(0, 0.5)
      .setDepth(Z.hud + 1)
      .setWordWrapWidth(PRAWA_SZ - podzielW - 26);
    // Jak podpowiedź na mapie: najpierw 13 px, a gdy się nie mieści — mniej.
    const k = this.komunikat;
    const zwykly = k.setText.bind(k);
    k.setText = ((t: string | string[]) => {
      k.setFontSize(13);
      zwykly(t);
      for (const rozmiar of [12, 11]) {
        if (k.height <= h - 6) break;
        k.setFontSize(rozmiar);
      }
      return k;
    }) as typeof k.setText;
    k.setText(DOMYSLNY_KOMUNIKAT);
    new Przycisk(this, {
      x: PRAWA_X + PRAWA_SZ - podzielW / 2 - 8,
      y: y + h / 2,
      w: podzielW,
      h: 34,
      tekst: 'Podziel',
      rozmiar: 13,
      glebia: Z.hud + 2,
      akcja: () => this.panel.podziel(),
    });
  }

  /** Jeden rząd armii: pergamin, medalion z obrazkiem i podpis (bez slotów). */
  private rzadArmii(y: number, tytul: string, obrazek: (mx: number, my: number, r: number) => void) {
    panelPergaminu(this, 0, y, LEWA_SZ, RZAD_H).forEach((c) => c.setDepth(Z.hud));
    const r = RZAD_H / 2 - 5;
    const mx = 12 + r;
    const my = y + RZAD_H / 2;
    medalion(this, mx, my, r, BARWA.papierCiemny).setDepth(Z.hud + 1);
    obrazek(mx, my, r);
    this.add
      .text(74, y + 9, tytul, stylEtykiety(14, BARWA.atrament))
      .setOrigin(0, 0)
      .setDepth(Z.hud + 1);
  }

  /** Ekran bohatera z miasta — i powrót tutaj (`HeroScene.zamknij`). */
  private otworzBohatera() {
    stopMusic(this);
    this.registry.set(KLUCZ_STANU, this.stan);
    this.registry.set(KLUCZ_POWROTU, 'zamek');
    this.scene.start('bohater');
  }

  /**
   * Surowce jak rachunek na pergaminie (ten sam co na mapie i w tej samej
   * kolejności — dziecko szuka pokeballi tam, gdzie zawsze były), a pod nimi
   * dwie tabliczki: złota „Buduj" (jedyny „następny krok" miasta)
   * i drewniane wyjście.
   */
  private rysujPasekDolny() {
    const y = SUROWCE_Y;
    panelPergaminu(this, PRAWA_X, y, PRAWA_SZ, SUROWCE_H).forEach((c) => c.setDepth(Z.hud));
    const krok = (PRAWA_SZ - 12) / SUROWCE.length;
    SUROWCE.forEach((s, i) => {
      const sx = PRAWA_X + 18 + i * krok;
      const sy = y + SUROWCE_H / 2;
      const im = this.add.image(sx, sy, `m-${SUROWIEC_INFO[s].ikona}`).setDepth(Z.hud + 1);
      im.setScale(Math.min(1, (SUROWCE_H - 8) / im.height));
      this.podpisy[s] = this.add
        .text(sx + 15, sy, '0', stylEtykiety(15, BARWA.atrament))
        .setOrigin(0, 0.5)
        .setDepth(Z.hud + 1);
      this.dochody[s] = this.add
        .text(sx + 15, sy + 1, '', { ...stylAtramentu(11, 'zielony'), fontStyle: 'bold' })
        .setOrigin(0, 0.5)
        .setDepth(Z.hud + 1);
    });

    // Budowa ma własny przycisk, zawsze w tym samym miejscu (lista budowy,
    // jak w ratuszu Heroes 3). Środek w x = 664, y ≈ 653 — tam klika
    // `tools/probe-miasto.mjs`.
    const budujW = 156;
    const wyjdzW = PRAWA_SZ - budujW - 10;
    new Przycisk(this, {
      x: PRAWA_X + budujW / 2,
      y: PRZYCISKI_Y,
      w: budujW,
      h: 36,
      tekst: 'Buduj',
      glowny: true,
      rozmiar: 17,
      glebia: Z.hud + 2,
      akcja: () => this.pokazListeBudowy(),
    });
    new Przycisk(this, {
      x: OKNO_W - MARGINES - wyjdzW / 2,
      y: PRZYCISKI_Y,
      w: wyjdzW,
      h: 36,
      tekst: 'Wyjdź na mapę',
      rozmiar: 14,
      glebia: Z.hud + 2,
      akcja: () => {
        stopMusic(this);
        this.scene.start('adventure');
      },
    });
  }

  // ---------- karta budynku ----------

  /**
   * Jedna karta obsługuje wszystkie budynki: co można z tym zrobić, ile to
   * kosztuje i jeden przycisk. Osobne okna na budowę i na werbunek znaczyłyby
   * dwa różne układy do nauczenia się — a to jest ten sam gest: kliknij
   * budynek, zobacz cenę, potwierdź.
   *
   * Pergamin w cienkiej złotej ramie, jak karta bohatera na mapie. Karta
   * stoi dołem na ramie panoramy i rośnie w górę z opisem (`ulozKarte`) —
   * przycisk zostaje zawsze w tym samym miejscu.
   */
  private rysujKarte() {
    this.karta = this.add.container(KARTA_X, KARTA_DOL - 200).setDepth(Z.hud + 4).setVisible(false);
    this.kartaMedalion = medalion(this, KARTA_W - 50, 52, 36, BARWA.papierCiemny).setVisible(false);
    this.kartaStworek = this.add.image(KARTA_W - 50, 50, 'p-00193').setVisible(false);
    this.kartaTytul = this.add.text(18, 14, '', stylEtykiety(18, BARWA.atrament)).setOrigin(0, 0);
    this.kartaOpis = this.add.text(18, 44, '', stylAtramentu(13)).setOrigin(0, 0);
    this.kartaKoszt = this.add.container(20, 0);
    this.karta.add([this.kartaMedalion, this.kartaStworek, this.kartaTytul, this.kartaOpis, this.kartaKoszt]);
    this.kartaPrzycisk = new Przycisk(this, {
      x: KARTA_X + KARTA_W / 2,
      y: KARTA_DOL - 30,
      w: KARTA_W - 40,
      h: 40,
      tekst: 'Buduj',
      glowny: true,
      rozmiar: 16,
      glebia: Z.hud + 6,
      akcja: () => this.dzialaj(),
    });
    // Przycisk zostaje osobnym obiektem sceny — jego widoczność prowadzimy
    // razem z kartą, ręcznie (niewidoczny kontener nie łapie kliknięć).
    this.kartaPrzycisk.kontener.setVisible(false);
  }

  /** Dopasowuje wysokość karty do opisu: tło od nowa, cena nad przyciskiem. */
  private ulozKarte() {
    const zeStworkiem = this.kartaStworek.visible;
    this.kartaTytul.setWordWrapWidth(zeStworkiem ? KARTA_W - 110 : KARTA_W - 36);
    this.kartaOpis.setWordWrapWidth(zeStworkiem ? KARTA_W - 110 : KARTA_W - 36);
    this.kartaOpis.setY(this.kartaTytul.y + this.kartaTytul.height + 8);
    const opisDol = this.kartaOpis.y + this.kartaOpis.height;
    const maCene = this.kartaKoszt.length > 0;
    const h = Math.max(zeStworkiem ? 196 : 150, opisDol + (maCene ? 40 : 14) + 58);
    this.kartaKoszt.setY(h - 72);
    this.karta.setY(KARTA_DOL - h);
    for (const o of this.kartaTlo) o.destroy();
    this.kartaTlo = [
      ...panelPergaminu(this, 0, 0, KARTA_W, h),
      ...(maCene ? [ozdobnik(this, 12, h - 94, KARTA_W - 24)] : []),
    ];
    this.karta.addAt(this.kartaTlo, 0);
  }

  /**
   * Kliknięcie w postawiony ratusz otwiera JEGO ROZBUDOWĘ, a nie opis tego,
   * co już stoi. Tak działa to w Heroes 3 i tak jest krócej: budynek, który
   * ma następny stopień, jest jednocześnie przyciskiem do niego. Inaczej
   * trzeba by rysować zarys drugiego ratusza w tym samym punkcie panoramy.
   */
  private pokazBudynek(b: Budynek) {
    // Ratusz otwiera listę budowy — tak jak w Heroes 3, gdzie to on jest
    // wejściem do rozbudowy całego miasta. Karta „już stoi" nie mówiłaby tu
    // nic, a ratusz jest jedynym budynkiem, który stoi zawsze.
    if (b.rodzaj === 'ratusz') return this.pokazListeBudowy();
    this.wybrany = b;
    this.karta.setVisible(true);
    this.kartaPrzycisk.kontener.setVisible(true);
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
      // Ile przybywa dziennie musi tu być, bo to jedyne miejsce, gdzie widać,
      // czy fort się opłacił i czy warto czekać dzień dłużej z werbunkiem.
      const dziennie = przyrostZamku(
        this.zamek.postawione ?? [],
        PRZYROST_ODDZIALU
      )[b.poziom];
      this.kartaOpis.setText(
        `${u.name}\nczeka: ${ile} · przybywa ${dziennie} dziennie\natak ${u.atk} · życie ${u.hp}\n` +
          `trafią: ${this.bohaterObecny ? 'do bohatera' : 'do garnizonu'}`
      );
      this.kartaStworek.setTexture(`p-${u.sprite}`).setVisible(true);
      this.kartaStworek.setScale(Math.min(1, 58 / this.kartaStworek.height));
      this.kartaMedalion.setVisible(true);
      this.pokazKoszt({ pokeball: KOSZT_ODDZIALU[b.poziom] }, 'za sztukę');
      const stac = this.stan.skarbiec.pokeball >= KOSZT_ODDZIALU[b.poziom];
      this.kartaPrzycisk.setLabel(ile > 0 ? `Zwerbuj (${ile})` : 'Nikt nie czeka');
      this.kartaPrzycisk.ustaw(ile > 0 && stac && this.zamek.wlasciciel === 'gracz');
      this.ulozKarte();
      return;
    }

    this.kartaStworek.setVisible(false);
    this.kartaMedalion.setVisible(false);
    if (stoi) {
      this.kartaOpis.setText(`${this.dzialanie(b, true)}\n\nJuż stoi.`);
      this.pokazKoszt({});
      this.kartaPrzycisk.setLabel('Gotowe');
      this.kartaPrzycisk.ustaw(false);
      this.ulozKarte();
      return;
    }

    const mozna = moznaBudowac(b, postawione);
    const brakWarunku = b.wymaga
      .filter((w) => !postawione.includes(w))
      .map((w) => this.profil.budynki.find((x) => x.id === w)?.nazwa ?? w);
    const juzBudowano = this.zamek.budowanoDnia === this.stan.dzien;
    const co = this.dzialanie(b, false);
    this.kartaOpis.setText(
      mozna
        ? juzBudowano
          ? `${co}\n\nDziś już tu budowano.`
          : co
        : `${co}\n\nNajpierw: ${brakWarunku.join(', ')}.`
    );
    this.pokazKoszt(b.koszt);
    const rozbudowa = b.rodzaj === 'ratusz' && b.id !== 'ratusz1';
    this.kartaPrzycisk.setLabel(rozbudowa ? 'Rozbuduj' : 'Buduj');
    this.kartaPrzycisk.ustaw(
      mozna && !juzBudowano && stacNas(this.stan.skarbiec, b.koszt) && this.zamek.wlasciciel === 'gracz'
    );
    this.ulozKarte();
  }

  /**
   * Lista budowy — jedyne miejsce, w którym stawia się budynki.
   *
   * W Heroes 3 miasto na starcie jest niemal puste i wypełnia się w miarę
   * rozbudowy, a co postawić, wybiera się z listy w ratuszu. My mieliśmy
   * odwrotnie: wszystkie przyszłe budynki sterczały na panoramie jako blade
   * zarysy, więc pierwszego dnia miasto wyglądało na plac budowy i zniknęła
   * satysfakcja z tego, że coś przybywa.
   *
   * Miejsce, w którym NIE idziemy za wzorcem: Heroes 3 pokazuje na liście
   * tylko to, co da się postawić natychmiast. My pokazujemy całe drzewko,
   * z warunkiem wypisanym przy zablokowanych. Ośmiolatek musi widzieć, że
   * gdzieś dalej jest Prastare Drzewo — inaczej nie ma po co oszczędzać.
   */
  private pokazListeBudowy() {
    const postawione = this.zamek.postawione ?? [];
    // Trzy ratusze to jeden budynek w trzech stopniach: na liście ma być
    // najbliższy stopień, a nie trzy wiersze, z których dwa są bez sensu.
    const najblizszyRatusz =
      ['ratusz1', 'ratusz2', 'ratusz3'].find((r) => !postawione.includes(r)) ?? 'ratusz3';
    const wiersze = this.profil.budynki.filter(
      (b) => !b.id.startsWith('ratusz') || b.id === najblizszyRatusz
    );

    // Okno jak wszystkie okna mapy: przyciemnienie i pergamin w złotej ramie.
    const szer = 700;
    const wysWiersza = 58;
    // 70 na tytuł z ozdobnikiem u góry, 66 na przycisk u dołu — bez tego
    // zapasu „Zamknij" nachodził na ostatni wiersz.
    const wys = 70 + wiersze.length * wysWiersza + 66;
    const cx = OKNO_W / 2;
    const cy = OKNO_H / 2;
    const lewo = cx - szer / 2;
    const gora = cy - wys / 2;
    const doZamkniecia: Phaser.GameObjects.GameObject[] = [];

    const zaslona = this.add
      .rectangle(0, 0, OKNO_W, OKNO_H, C.shadow, 0.5)
      .setOrigin(0, 0)
      .setDepth(Z.overlay)
      .setInteractive();
    doZamkniecia.push(zaslona);
    for (const c of panelPergaminu(this, lewo, gora, szer, wys)) {
      c.setDepth(Z.overlay + 1);
      doZamkniecia.push(c);
    }
    doZamkniecia.push(
      this.add
        .text(cx, gora + 30, 'Co zbudować?', stylEtykiety(24))
        .setOrigin(0.5)
        .setDepth(Z.overlay + 2),
      ozdobnik(this, lewo + 150, gora + 54, szer - 300).setDepth(Z.overlay + 2)
    );

    const juzBudowano = this.zamek.budowanoDnia === this.stan.dzien;
    // Tabliczka podskakuje napisem w tym samym kliknięciu, które zamyka okno
    // — tweeny trzeba zdjąć, zanim zniszczy się napis (jak `zamknijOkno` mapy).
    const zgas = (o: Phaser.GameObjects.GameObject) => {
      this.tweens.killTweensOf(o);
      if (o instanceof Phaser.GameObjects.Container) o.list.forEach(zgas);
    };
    const zamknij = () => {
      for (const o of doZamkniecia) {
        zgas(o);
        o.destroy();
      }
      doZamkniecia.length = 0;
      this.karta.setVisible(false);
      this.kartaPrzycisk.kontener.setVisible(false);
      this.wybrany = undefined;
    };

    for (const [i, b] of wiersze.entries()) {
      const y = gora + 66 + i * wysWiersza;
      const stoi = postawione.includes(b.id);
      const mozna = moznaBudowac(b, postawione);
      const stac = stacNas(this.stan.skarbiec, b.koszt);
      const dostepny = !stoi && mozna && stac && !juzBudowano && this.zamek.wlasciciel === 'gracz';
      const rx = lewo + 16;
      const rw = szer - 32;
      const rh = wysWiersza - 6;

      // Wiersze jak linie w księdze: co drugi na ciemniejszym papierze,
      // a te, które da się postawić DZIŚ, w złotej ramce — widać je od razu.
      const rzad = this.add.graphics().setDepth(Z.overlay + 2);
      if (i % 2 === 0) {
        rzad.fillStyle(BARWA.papierCiemny, 0.55);
        rzad.fillRoundedRect(rx, y, rw, rh, 5);
      }
      const podswietlenie = this.add.graphics().setDepth(Z.overlay + 2).setVisible(false);
      podswietlenie.fillStyle(0xffe9a8, 0.45);
      podswietlenie.fillRoundedRect(rx, y, rw, rh, 5);
      doZamkniecia.push(rzad, podswietlenie);
      if (dostepny) doZamkniecia.push(ramaZlota(this, rx + 5, y + 5, rw - 10, rh - 10, false).setDepth(Z.overlay + 2));

      // Miniatura budynku. W Heroes 3 lista budowy pokazuje rysunek każdej
      // budowli i to on, a nie nazwa, mówi dziecku, co właśnie kupuje —
      // „Rosista Kotlina" nic nie znaczy, dopóki nie zobaczy się kotliny.
      // Bierzemy tę samą grafikę, która stanie na panoramie, więc nie ma jak
      // się rozjechać z tym, co potem widać w mieście.
      const bok = wysWiersza - 20;
      const mx = rx + 16;
      const my = y + (rh - bok) / 2;
      const ramka = this.add.graphics().setDepth(Z.overlay + 3);
      ramka.fillStyle(0xf8ecd0, 1);
      ramka.fillRect(mx, my, bok, bok);
      const mini = this.add
        .image(mx + bok / 2, my + bok / 2, `t-${this.profil.frakcja}-${b.id}`)
        .setDepth(Z.overlay + 4);
      mini.setScale(Math.min((bok - 4) / mini.width, (bok - 4) / mini.height));
      // Postawione są wyszarzone — od razu widać, co jest już załatwione.
      if (stoi) mini.setTint(0xa89a88);
      doZamkniecia.push(ramka, mini, ramaZlota(this, mx, my, bok, bok, false).setDepth(Z.overlay + 5));

      const tekstX = mx + bok + 16;
      const barwaNazwy = dostepny ? BARWA.atrament : BARWA.atramentMiekki;
      const barwaStanu = stoi ? 'zielony' : !mozna ? 'czerwony' : 'miekki';
      doZamkniecia.push(
        this.add
          .text(tekstX, y + 7, b.nazwa, stylEtykiety(15, barwaNazwy))
          .setDepth(Z.overlay + 3),
        this.add
          .text(tekstX, y + 28, this.wiersz(b, stoi, mozna, stac, juzBudowano), stylAtramentu(12, barwaStanu))
          .setDepth(Z.overlay + 3)
      );

      // Cena po prawej, ikonami — czytelna, zanim dziecko przeczyta nazwy.
      if (!stoi) {
        // Stałe kolumny po 78 px: ikona, a za nią liczba od lewej — trzycyfrowa
        // cena nie wchodzi wtedy pod ikonę.
        let x = rx + rw - 16 - 78;
        for (const [co, ile] of Object.entries(b.koszt).reverse()) {
          const s = co as Surowiec;
          const brak = this.stan.skarbiec[s] < ile;
          doZamkniecia.push(
            this.add
              .image(x + 12, y + rh / 2, `m-${SUROWIEC_INFO[s].ikona}`)
              .setDisplaySize(22, 22)
              .setOrigin(0.5)
              .setDepth(Z.overlay + 3),
            this.add
              .text(x + 28, y + rh / 2, String(ile), stylEtykiety(15, brak ? BARWA.atramentCzerwony : BARWA.atrament))
              .setOrigin(0, 0.5)
              .setDepth(Z.overlay + 3)
          );
          x -= 78;
        }
      }

      if (!dostepny) continue;
      const strefa = this.add
        .zone(rx, y, rw, rh)
        .setOrigin(0, 0)
        .setInteractive({ useHandCursor: true })
        .setDepth(Z.overlay + 6)
        .on('pointerover', () => podswietlenie.setVisible(true))
        .on('pointerout', () => podswietlenie.setVisible(false))
        .on('pointerdown', () => {
          zamknij();
          this.buduj(b);
        });
      doZamkniecia.push(strefa);
    }

    const zamknijPrzycisk = new Przycisk(this, {
      x: cx,
      y: gora + wys - 34,
      w: 200,
      h: 42,
      tekst: 'Zamknij',
      rozmiar: 15,
      glebia: Z.overlay + 6,
      akcja: () => zamknij(),
    });
    doZamkniecia.push(zamknijPrzycisk.kontener);
    zaslona.on('pointerdown', () => zamknij());
  }

  /** Jednowierszowy stan budynku na liście budowy. */
  private wiersz(
    b: Budynek,
    stoi: boolean,
    mozna: boolean,
    stac: boolean,
    juzBudowano: boolean
  ): string {
    if (stoi) return 'Już stoi.';
    if (!mozna) {
      const brak = b.wymaga
        .filter((w) => !(this.zamek.postawione ?? []).includes(w))
        .map((w) => this.profil.budynki.find((x) => x.id === w)?.nazwa ?? w);
      return `Najpierw: ${brak.join(', ')}.`;
    }
    const efekt = this.dzialanie(b, false).split('\n').slice(1).join(' ');
    if (juzBudowano) return `Dziś już tu budowano. ${efekt}`;
    if (!stac) return `Za mało surowców. ${efekt}`;
    return efekt;
  }

  /**
   * Co ten budynek NAPRAWDĘ robi — liczbami, nie hasłem.
   *
   * Karta pokazywała wyłącznie zdanie z klimatem: „Cały las pracuje na twój
   * obóz". Ładne, ale gracz nie wiedział, czy dostaje sześć pokeballi, czy
   * dwadzieścia sześć, ani czy rozbudowa ratusza w ogóle się opłaca. Przy
   * jednym budynku dziennie i ograniczonych surowcach to jest ta jedyna
   * informacja, na podstawie której podejmuje się decyzję.
   *
   * Liczby biorą się z tych samych funkcji, które prowadzą grę, a nie
   * z osobnego opisu — inaczej po pierwszej zmianie bilansu karta zaczyna
   * kłamać i nikt tego nie zauważy.
   */
  private dzialanie(b: Budynek, stoi: boolean): string {
    const postawione = this.zamek.postawione ?? [];
    const wiersze = [b.opis];

    if (b.rodzaj === 'ratusz' && b.dochod !== undefined) {
      const teraz = dochodZamku(postawione, this.profil.frakcja);
      wiersze.push(
        stoi || teraz === 0
          ? `Daje ${b.dochod} pokeballi dziennie.`
          : `Teraz ${teraz} pokeballi dziennie, po rozbudowie ${b.dochod}.`
      );
    }

    if (b.rodzaj === 'fort') {
      // Pokazujemy sumę dzienną z GNIAZD, KTÓRE STOJĄ, bo tylko ona jest
      // prawdziwa dla tego miasta. Sam mnożnik nic nie mówi ośmiolatkowi.
      const suma = (lista: string[]) =>
        przyrostZamku(lista, PRZYROST_ODDZIALU).reduce((a, x) => a + x, 0);
      const bez = suma(postawione.filter((x) => x !== 'fort'));
      const z = suma([...postawione.filter((x) => x !== 'fort'), 'fort']);
      wiersze.push(
        `Przyrost we wszystkich gniazdach ×${MNOZNIK_FORTU.toLocaleString('pl')}.`,
        stoi
          ? `Dzięki niemu przybywa ${z} stworków dziennie zamiast ${bez}.`
          : `Byłoby ${z} stworków dziennie zamiast ${bez}.`
      );
    }

    if (b.rodzaj === 'siedlisko' && b.poziom !== undefined) {
      const u = this.frakcja.units[b.poziom];
      const ile = przyrostZamku([...postawione, b.id], PRZYROST_ODDZIALU)[b.poziom];
      wiersze.push(`Otwiera werbunek: ${u.name}.`, `Przybywa ${ile} dziennie.`);
    }

    if (b.produkuje) {
      // Czyta się wprost z budynku, a nie z profilu frakcji: budynek specjalny
      // Boru daje dwa różne surowce naraz, więc jedna para „surowiec, ile"
      // by go nie opisała.
      const co = (Object.entries(b.produkuje) as [Surowiec, number][])
        .map(([s, ile]) => `${ile} ${SUROWIEC_INFO[s].dopelniacz}`)
        .join(' i ');
      wiersze.push(`Dokłada ${co} dziennie.`);
    }

    return wiersze.join('\n');
  }

  /** Cena jako ikony z liczbami — czytelna, zanim dziecko przeczyta nazwy. */
  private pokazKoszt(koszt: Partial<Record<Surowiec, number>>, przyrostek = '') {
    this.kartaKoszt.removeAll(true);
    let x = 0;
    for (const [co, ile] of Object.entries(koszt)) {
      const s = co as Surowiec;
      const im = this.add.image(x + 12, 0, `m-${SUROWIEC_INFO[s].ikona}`);
      im.setScale(Math.min(1, 26 / im.height));
      const brak = this.stan.skarbiec[s] < ile;
      const t = this.add
        .text(x + 28, 0, String(ile), stylEtykiety(17, brak ? BARWA.atramentCzerwony : BARWA.atrament))
        .setOrigin(0, 0.5);
      this.kartaKoszt.add([im, t]);
      x += 42 + t.width;
    }
    if (przyrostek) {
      this.kartaKoszt.add(this.add.text(x, 1, przyrostek, stylAtramentu(13, 'miekki')).setOrigin(0, 0.5));
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

    sfx(this, 'budowa');
    // Zarys zamienia się w budynek na oczach gracza. To jest cała nagroda za
    // wydanie surowców — bez niej rozbudowa jest liczbą w tabeli. Panoramę
    // składamy od nowa, bo ratusz wyższego stopnia zastępuje niższy i sama
    // podmiana grafiki by tu nie wystarczyła.
    this.rysujBudynki();
    const k = this.kafle.find((x) => x.budynek.id === b.id) ?? this.kafle.find((x) => x.budynek.rodzaj === b.rodzaj);
    if (k) {
      // Rozjaśnienie, nie podskok.
      //
      // Poprzednia wersja wjeżdżała skalą z odbiciem (`Back.easeOut`) i przez
      // te trzysta milisekund budynek jechał WZGLĘDEM gruntu, na którym stoi —
      // czyli po raz kolejny udowadniał, że jest osobną warstwą naklejoną na
      // tło. Wyjście z przezroczystości nic nie rusza: budowla po prostu się
      // pojawia tam, gdzie stoi.
      this.tweens.add({
        targets: k.obraz,
        alpha: { from: 0, to: 1 },
        duration: 420,
        ease: 'Quad.easeOut',
      });
    }
    this.odswiez();
  }

  /**
   * Werbunek. Oddział tego samego gatunku dokleja się do istniejącego slotu,
   * a nie zakłada nowego — inaczej cztery zakupy po jednym Pyroko dałyby
   * cztery osobne oddziały po jednym stworku, czyli armię bez sensu.
   *
   * Dokąd idą, jak w Heroes 3: z bohaterem w zamku — do niego (a gdy jego
   * siedem slotów jest zajętych, do garnizonu), bez bohatera — do garnizonu.
   */
  private kup(tier: number) {
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
    // Werbunek dokłada do istniejącego stosu albo do pierwszej dziury.
    // Odmowa przy siedmiu zajętych slotach musi być WIDOCZNA: cicho zgubiony
    // zakup wygląda jak zniknięte pokeballe.
    const nowy: Oddzial = {
      sprite: u.sprite,
      nazwa: u.name,
      ile,
      frakcja: this.frakcja.id,
      tier,
    };
    let dokad: string;
    if (this.bohaterObecny && dolacz(this.stan.bohater.armia, nowy)) dokad = 'do armii bohatera';
    else if (dolacz(this.garnizon, nowy)) dokad = 'do garnizonu';
    else {
      this.komunikat.setText(
        this.bohaterObecny
          ? 'Wszystkie sloty bohatera i garnizonu zajęte — nie ma gdzie ich postawić.'
          : 'Wszystkie sloty garnizonu zajęte — nie ma gdzie ich postawić.'
      );
      return;
    }
    dostepne[tier] -= ile;
    this.stan.skarbiec.pokeball -= ile * koszt;
    this.komunikat.setText(`Zwerbowano ${ile} × ${u.name} — ${dokad}.`);
    this.odswiez();
  }

  // ---------- odświeżanie ----------

  private odswiez() {
    const wplyw = dochod(this.stan);
    for (const s of SUROWCE) {
      const t = this.podpisy[s];
      if (!t) continue;
      const ile = wplyw[s] ?? 0;
      t.setText(String(this.stan.skarbiec[s]));
      this.dochody[s]?.setText(ile > 0 ? `+${ile}` : '').setX(t.x + t.width + 5);
    }
    const d = data(this.stan.dzien);
    this.dataTekst.setText(`Tydzień ${d.tydzien}, dzień ${d.dzienTygodnia}`);
    this.bohaterStan.setText(this.bohaterObecny ? 'w zamku' : 'poza zamkiem');
    this.bohaterStan.setColor(this.bohaterObecny ? BARWA.atramentZielony : BARWA.atramentCzerwony);
    // Straż miejska z planszy (`zamek.oddzialy`) broni razem z garnizonem,
    // ale gracz nią nie rozporządza — pokazujemy ją jedną liczbą.
    const straz = (this.zamek.oddzialy ?? []).reduce((a, o) => a + o.ile, 0);
    const wGarnizonie = zywe(this.garnizon).reduce((a, o) => a + o.ile, 0);
    this.garnizonStan.setText(
      [wGarnizonie ? `${wGarnizonie} w slotach` : 'sloty puste', straz ? `+ straż ${straz}` : ''].filter(Boolean).join('\n')
    );
    this.panel.odswiez();

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
