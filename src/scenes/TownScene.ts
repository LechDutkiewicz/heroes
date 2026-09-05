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
import { C, H, T, Z, body, display } from '../visual/theme';
import { drawPanelBody, makeHudButton, mix, plate } from '../visual/hud';
import { ICON, buildIcons } from '../visual/icons';
import { OKNO_H, OKNO_W } from '../visual/uklad';
import { wersjonujZasoby } from '../visual/zasoby';

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
  private przyciskBudowy!: ReturnType<typeof makeHudButton>;
  private wybrany?: Budynek;
  private komunikat!: Phaser.GameObjects.Text;
  private dataTekst!: Phaser.GameObjects.Text;

  constructor() {
    super('zamek');
  }

  preload() {
    wersjonujZasoby(this);
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
    this.slotyArmii = [];
    this.zachety = [];
    this.wybrany = undefined;

    this.stan = this.registry.get(KLUCZ_STANU) as StanMapy;
    const id = this.registry.get(KLUCZ_ZAMKU) as number;
    this.zamek = this.stan.obiekty.find((o) => o.id === id)!;
    this.zamek.postawione ??= [];
    buildIcons(this);

    this.zbudujCien();
    this.rysujPanorame();
    this.rysujBudynki();
    this.rysujPierwszyPlan();
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
    im.setCrop(0, gora - GORA, OKNO_W, GORA + PAN_H - gora);
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

    // Budowa ma własny przycisk, zawsze w tym samym miejscu.
    //
    // Wcześniej stawiało się budynki, klikając w blade zarysy rozstawione po
    // panoramie. Wyglądało to jak plac budowy w każdym wolnym miejscu — miasto
    // pierwszego dnia było pełne rusztowań zamiast puste. W Heroes 3 miasto
    // wypełnia się w miarę rozbudowy, a listę budowy otwiera ratusz; tak jest
    // i tutaj, tylko lista dostaje jeszcze własny przycisk, żeby nie trzeba
    // było zgadywać, że ratusz jest klikalny.
    this.przyciskBudowy = makeHudButton(this, {
      x: OKNO_W - 296,
      y: y + h / 2,
      w: 156,
      h: 38,
      icon: ICON.star,
      tone: C.gold,
      toneDeep: C.goldDeep,
      onClick: () => this.pokazListeBudowy(),
      depth: Z.hud + 2,
    });
    this.przyciskBudowy.setLabel('Buduj');

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
    // Ratusz otwiera listę budowy — tak jak w Heroes 3, gdzie to on jest
    // wejściem do rozbudowy całego miasta. Karta „już stoi" nie mówiłaby tu
    // nic, a ratusz jest jedynym budynkiem, który stoi zawsze.
    if (b.rodzaj === 'ratusz') return this.pokazListeBudowy();
    this.wybrany = b;
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
      // Ile przybywa dziennie musi tu być, bo to jedyne miejsce, gdzie widać,
      // czy fort się opłacił i czy warto czekać dzień dłużej z werbunkiem.
      const dziennie = przyrostZamku(
        this.zamek.postawione ?? [],
        PRZYROST_ODDZIALU
      )[b.poziom];
      this.kartaOpis.setText(
        `${u.name}\nczeka: ${ile} · przybywa ${dziennie} dziennie\natak ${u.atk} · życie ${u.hp}`
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
      this.kartaOpis.setText(`${this.dzialanie(b, true)}\n\nJuż stoi.`);
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
    this.kartaPrzycisk.setEnabled(
      mozna && !juzBudowano && stacNas(this.stan.skarbiec, b.koszt) && !!this.zamek.nasz
    );
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

    const szer = 700;
    const wysWiersza = 62;
    // 62 na tytuł u góry, 64 na przycisk u dołu — bez tego zapasu
    // „Zamknij" nachodził na ostatni wiersz.
    const wys = 62 + wiersze.length * wysWiersza + 64;
    const cx = OKNO_W / 2;
    const cy = OKNO_H / 2;
    const lewo = cx - szer / 2;
    const gora = cy - wys / 2;
    const doZamkniecia: Phaser.GameObjects.GameObject[] = [];

    const zaslona = this.add
      .rectangle(0, 0, OKNO_W, OKNO_H, C.shadow, 0.55)
      .setOrigin(0, 0)
      .setDepth(Z.overlay)
      .setInteractive();
    const tlo = this.add.graphics().setDepth(Z.overlay + 1);
    plate(tlo, lewo, gora, szer, wys, 12, C.panel, C.gold, {
      light: 0.22,
      dark: 0.2,
      gloss: 0.16,
      edgeW: 3,
    });
    doZamkniecia.push(zaslona, tlo);
    doZamkniecia.push(
      this.add
        .text(cx, gora + 26, 'Co zbudować?', display(20, H.gold))
        .setOrigin(0.5)
        .setDepth(Z.overlay + 2)
    );

    const juzBudowano = this.zamek.budowanoDnia === this.stan.dzien;
    const zamknij = () => {
      doZamkniecia.forEach((x) => x.destroy());
      this.karta.setVisible(false);
      this.kartaPrzycisk.setVisible(false);
      this.wybrany = undefined;
    };

    for (const [i, b] of wiersze.entries()) {
      const y = gora + 62 + i * wysWiersza;
      const stoi = postawione.includes(b.id);
      const mozna = moznaBudowac(b, postawione);
      const stac = stacNas(this.stan.skarbiec, b.koszt);
      const dostepny = !stoi && mozna && stac && !juzBudowano && !!this.zamek.nasz;

      const rzad = this.add.graphics().setDepth(Z.overlay + 2);
      rzad.fillStyle(mix(C.panel, C.panelDeep, i % 2 ? 0.24 : 0.12), 1);
      rzad.fillRoundedRect(lewo + 14, y, szer - 28, wysWiersza - 6, 7);
      if (dostepny) {
        rzad.lineStyle(2, C.gold, 0.9);
        rzad.strokeRoundedRect(lewo + 14, y, szer - 28, wysWiersza - 6, 7);
      }
      doZamkniecia.push(rzad);

      const barwa = stoi ? H.inkSoft : dostepny ? H.white : H.inkSoft;
      // Miniatura budynku. W Heroes 3 lista budowy pokazuje rysunek każdej
      // budowli i to on, a nie nazwa, mówi dziecku, co właśnie kupuje —
      // „Rosista Kotlina" nic nie znaczy, dopóki nie zobaczy się kotliny.
      // Bierzemy tę samą grafikę, która stanie na panoramie, więc nie ma jak
      // się rozjechać z tym, co potem widać w mieście.
      const bok = wysWiersza - 16;
      const ramka = this.add.graphics().setDepth(Z.overlay + 3);
      ramka.fillStyle(mix(C.panel, C.panelDeep, 0.4), 1);
      ramka.fillRoundedRect(lewo + 24, y + 4, bok, bok, 5);
      ramka.lineStyle(1.5, C.panelDeep, 0.8);
      ramka.strokeRoundedRect(lewo + 24, y + 4, bok, bok, 5);
      const mini = this.add
        .image(lewo + 24 + bok / 2, y + 4 + bok / 2, `t-${this.profil.frakcja}-${b.id}`)
        .setDepth(Z.overlay + 4);
      mini.setScale(Math.min((bok - 6) / mini.width, (bok - 6) / mini.height));
      // Postawione są wyszarzone — od razu widać, co jest już załatwione.
      if (stoi) mini.setTint(0x8a8a8a);
      doZamkniecia.push(ramka, mini);

      const tekstX = lewo + 24 + bok + 14;
      doZamkniecia.push(
        this.add
          .text(tekstX, y + 10, b.nazwa, display(14, barwa))
          .setDepth(Z.overlay + 3),
        this.add
          .text(tekstX, y + 30, this.wiersz(b, stoi, mozna, stac, juzBudowano), body(11, H.inkSoft))
          .setDepth(Z.overlay + 3)
      );

      // Cena po prawej, ikonami — czytelna, zanim dziecko przeczyta nazwy.
      if (!stoi) {
        let x = lewo + szer - 40;
        for (const [co, ile] of Object.entries(b.koszt).reverse()) {
          const s = co as Surowiec;
          doZamkniecia.push(
            this.add
              .text(x, y + wysWiersza / 2 - 3, String(ile), display(13, H.white))
              .setOrigin(1, 0.5)
              .setDepth(Z.overlay + 3),
            this.add
              .image(x - 22, y + wysWiersza / 2 - 3, `m-${SUROWIEC_INFO[s].ikona}`)
              .setDisplaySize(18, 18)
              .setOrigin(0.5)
              .setDepth(Z.overlay + 3)
          );
          x -= 62;
        }
      }

      if (!dostepny) continue;
      const strefa = this.add
        .zone(lewo + 14, y, szer - 28, wysWiersza - 6)
        .setOrigin(0, 0)
        .setInteractive({ useHandCursor: true })
        .setDepth(Z.overlay + 4)
        .on('pointerdown', () => {
          zamknij();
          this.buduj(b);
        });
      doZamkniecia.push(strefa);
    }

    const zamknijPrzycisk = makeHudButton(this, {
      x: cx,
      y: gora + wys - 30,
      w: 200,
      h: 38,
      icon: ICON.boot,
      tone: C.ally,
      toneDeep: C.allyDeep,
      depth: Z.overlay + 4,
      onClick: () => {
        zamknijPrzycisk.setVisible(false);
        zamknij();
      },
    });
    zamknijPrzycisk.setLabel('Zamknij');
    // `makeHudButton` wiesza przycisk na scenie samodzielnie i wciągnięcie go
    // do listy niszczonych rozjeżdża jego strefę kliknięcia — chowamy go więc
    // ręcznie, razem z resztą okna.
    zaslona.on('pointerdown', () => {
      zamknijPrzycisk.setVisible(false);
      zamknij();
    });
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

    if (b.rodzaj === 'specjalny') {
      const { surowiec, ile } = this.profil.dar;
      wiersze.push(`Dokłada ${ile} ${SUROWIEC_INFO[surowiec].dopelniacz} dziennie.`);
    }

    return wiersze.join('\n');
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
