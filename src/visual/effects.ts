/**
 * Oprawa walki: błysk w punkcie trafienia, iskry, pocisk żywiołu ze śladem,
 * napisy ulotne, wstrząs kamery, rozbłysk przy zejściu oddziału i ekran końca
 * bitwy.
 *
 * Wydzielone z BattleScene tak samo jak plansza i wygląd oddziału — scena ma
 * prowadzić walkę, a nie układać cząstki. Ten moduł nic nie wie o obrażeniach
 * ani o turach; dostaje punkt, barwę i siłę, i robi z tego widowisko.
 *
 * Reguła nadrzędna zdjęta z wzorca (rozbłysk ewolucji w Pokémon Masters EX):
 * jedno zdarzenie to NIE jeden obiekt. W tamtym kadrze dzieje się naraz pięć
 * rzeczy — promieniste światło od środka, pierścienie energii, gęsty deszcz
 * iskier o różnych rozmiarach, ciepła poświata zalewająca tło i miękki rdzeń.
 * Pojedyncze kółko nigdy nie da tego wrażenia, choćby było najładniejsze.
 * Dlatego każdy efekt tutaj składa się z kilku warstw o różnym czasie życia.
 *
 * Reguła druga, ważniejsza od pierwszej: efekt nie może zjeść informacji.
 * Gracz musi widzieć, kto kogo uderzył, za ile i ilu stworków padło. Stąd
 * trzy ograniczenia, które w kodzie widać jako liczby:
 *  - biały rdzeń błysku gaśnie w ~95 ms, na długo przed napisem z obrażeniami;
 *  - iskry lecą NA ZEWNĄTRZ od punktu trafienia, więc środek pola zostaje czysty;
 *  - napisy ulotne same się rozsuwają w pionie (patrz `floatLabel`), bo przy
 *    jednym ciosie potrafią wyskoczyć trzy naraz i wcześniej zlewały się
 *    w nieczytelną kaszę.
 *
 * Reguła trzecia: walka ma zostać żwawa. Cała oprawa jednego ciosu mieści się
 * w około 400 ms i nie blokuje przebiegu tury — scena woła `onDone` wtedy,
 * kiedy wołała wcześniej, a iskry dopalają się już po fakcie.
 *
 * Reguła czwarta, dopisana po obejrzeniu PASKA KLATEK zamiast stopklatki:
 * o tym, czy efekt ma barwę, decyduje nie paleta, tylko OBWIEDNIA W CZASIE.
 * Rundy 1-3 miały barwę w kodzie, a mimo to na pasku widać było jedno białe
 * zdjęcie i trzy puste — bo biały rdzeń świecił pełną mocą przez cały czas
 * życia efektu, a barwa szczytowała dopiero wtedy, gdy całość już gasła.
 * Dlatego warstwy nie mają już „narastania i gaśnięcia", tylko trzy fazy:
 * narastanie, PRZYTRZYMANIE i gaśnięcie, a ich kolejność jest odwrotna do
 * jasności — biel wchodzi pierwsza i schodzi pierwsza, barwa trzyma najdłużej.
 */

import Phaser from 'phaser';
import { C, E, H, T, display } from './theme';
import { BOARD_H, BOARD_W, BOARD_X, BOARD_Y, HEX_R } from './board';
import { ICON, TYPE_ICON, type IconKey } from './icons';

/** Tekstury rysowane raz przy starcie sceny — potem to zwykłe obrazki. */
export const FX = {
  /** Miękka poświata: rdzeń błysku, aureola pocisku, światło ekranu końca. */
  glow: 'fx_poswiata',
  /**
   * Wielka, bardzo miękka łuna — osobna tekstura od `glow`, bo poświata
   * trafienia ma mieć 200-250 px średnicy. Rozciąganie 128-pikselowego
   * rdzenia na taki rozmiar dawało widoczny stopień i twardy brzeg, czyli
   * dokładnie tę „naklejkę", którą zarzucił krytyk. Ta tekstura jest większa
   * i gaśnie znacznie łagodniej, więc na brzegu naprawdę dochodzi do zera.
   */
  bloom: 'fx_luna',
  /**
   * Bardzo miękka, szeroka otoczka — zewnętrzny, najcieplejszy pas łuny.
   * Osobna od `bloom`, bo tamta ma prawie kryjący rdzeń (plateau), a tutaj
   * potrzebny jest sam wykładniczy ogon: gdyby zewnętrzny pas też miał
   * jasny środek, przykryłby barwne warstwy pod sobą i temperatura znów
   * zlałaby się w jedną płaską plamę.
   */
  haze: 'fx_mgla',
  /** Okrągła iskra z jasnym środkiem — główny budulec deszczu iskier. */
  spark: 'fx_iskra',
  /** Rozmyta drobinka bez ostrego środka — iskry „zdmuchnięte w pył" w tle. */
  mote: 'fx_pyl',
  /** Czterokątny błysk — drobniejszy pył, żeby iskry miały różne kształty. */
  twinkle: 'fx_blyszczka',
  /**
   * Promień: zwężający się klin światła, jasny u nasady, rozmyty na wylocie.
   *
   * Wzorzec (`swiatlo-w-walce.png`) pokazuje wprost, czego brakowało rundom
   * 1-4: tam błysk to WACHLARZ PROMIENI o różnej długości i różnym rozmyciu,
   * a nie plamka poświaty. Miękkie kółko rozciągnięte w kreskę tego nie zastąpi,
   * bo nie ma zwężenia — promień musi mieć nasadę i wylot.
   */
  ray: 'fx_promien',
} as const;

/**
 * Poświata jako stos kółek o malejącym promieniu i niskiej alfie. Phaser nie
 * ma gradientu na kształcie, ale alfa nakłada się warstwami, więc środek
 * wychodzi jasny, a brzeg rozmyty — dokładnie to, czego potrzebuje błysk.
 *
 * `k` steruje profilem: alfa w odległości t od środka wychodzi w przybliżeniu
 * 1 - exp(-k * (1 - t)), bo każda kolejna warstwa mnoży przezroczystość. Dzięki
 * temu jedną liczbą ustawiamy jasność rdzenia i zawsze mamy zero na brzegu —
 * bez tego poświata kończyła się widocznym kółkiem.
 */
function drawGlow(g: Phaser.GameObjects.Graphics, size: number, k = 3.5, steps = 72) {
  const c = size / 2;
  const a = k / steps;
  for (let i = steps; i > 0; i--) {
    g.fillStyle(C.white, a);
    g.fillCircle(c, c, (c * i) / steps);
  }
}

export function buildEffectTextures(scene: Phaser.Scene) {
  if (scene.textures.exists(FX.glow)) return;

  const glow = scene.add.graphics();
  drawGlow(glow, 128);
  glow.generateTexture(FX.glow, 128, 128);
  glow.destroy();

  // Łuna. Poprzednia była tak słaba (k = 0.9, czyli ~0.6 alfy w samym środku,
  // rozciągnięte na 250 px), że po rozciągnięciu do rozmiaru trafienia w ogóle
  // nie było jej widać — sonda pokazała pustą planszę tam, gdzie miało zalewać
  // światło. Stąd k = 2.6: rdzeń praktycznie kryjący, brzeg nadal schodzący do
  // zera. Tekstura ma 512 px, bo przy 256 rozciągnięcie na 250 px pokazywało
  // stopnie warstw.
  const bloom = scene.add.graphics();
  drawGlow(bloom, 512, 2.6, 128);
  bloom.generateTexture(FX.bloom, 512, 512);
  bloom.destroy();

  // Mgła: k = 1.1, czyli alfa w środku ~0.67 i bardzo długi, łagodny ogon.
  // To nią malujemy najdalszy, najcieplejszy pas światła.
  const haze = scene.add.graphics();
  drawGlow(haze, 512, 1.1, 128);
  haze.generateTexture(FX.haze, 512, 512);
  haze.destroy();

  // Pył: ta sama metoda co łuna, ale bez jasnego środka — drobinka wygląda na
  // nieostrą, więc iskry z niej zrobione czytają się jako dalszy plan.
  const mote = scene.add.graphics();
  drawGlow(mote, 32, 1.1, 24);
  mote.generateTexture(FX.mote, 32, 32);
  mote.destroy();

  const spark = scene.add.graphics();
  spark.fillStyle(C.white, 0.22);
  spark.fillCircle(8, 8, 7.5);
  spark.fillStyle(C.white, 0.55);
  spark.fillCircle(8, 8, 5);
  spark.fillStyle(C.white, 1);
  spark.fillCircle(8, 8, 3);
  spark.generateTexture(FX.spark, 16, 16);
  spark.destroy();

  // Ośmioramienna gwiazdka z bardzo wciętym środkiem — czyta się jak błysk
  // światła, a nie jak gwiazda z ikon. Te dwa kształty mają się różnić.
  const tw = scene.add.graphics();
  const pts: number[] = [];
  for (let i = 0; i < 8; i++) {
    const r = i % 2 === 0 ? 15 : 2.6;
    const a = Phaser.Math.DegToRad(i * 45);
    pts.push(16 + r * Math.cos(a), 16 + r * Math.sin(a));
  }
  tw.fillStyle(C.white, 1);
  tw.beginPath();
  tw.moveTo(pts[0], pts[1]);
  for (let i = 2; i < pts.length; i += 2) tw.lineTo(pts[i], pts[i + 1]);
  tw.closePath();
  tw.fillPath();
  tw.generateTexture(FX.twinkle, 32, 32);
  tw.destroy();

  // Promień. Ta sama sztuczka co przy poświacie — stos kształtów o niskiej
  // alfie — ale zamiast kółek nakładamy TRÓJKĄTY o malejącej podstawie
  // i malejącym zasięgu. Z nakładania wychodzi klin jasny w osi i u nasady,
  // gasnący i w bok, i na wylocie. Rysowana jest poziomo, w prawo; obrót
  // i długość ustawia dopiero `rayBurst`.
  // Kształt to WRZECIONO, nie trójkąt: zwęża się nie tylko na wylocie, ale
  // i u samej nasady. Pierwsza wersja była najjaśniejsza w punkcie x = 0
  // i dziesięć promieni sumowało tam swoje alfy — na pasku ognistym środek
  // rozbłysku wypalał się przez to na czystą biel, zamiast mieć mały gorący
  // rdzeń jak we wzorcu. Wrzeciono wnosi w punkt wspólny prawie zero, więc
  // to rdzeń decyduje o jasności środka, a nie przypadkowa suma promieni.
  const ray = scene.add.graphics();
  const rs = 26;
  for (let i = rs; i > 0; i--) {
    const t = i / rs;
    const w = 13 * t;
    ray.fillStyle(C.white, 2.2 / rs);
    ray.beginPath();
    ray.moveTo(0, 16);
    ray.lineTo(23, 16 - w);
    // Krótsze warstwy w środku stosu dają zwężenie: wylot promienia jest
    // rozmyty, bo dochodzi tam już tylko kilka najdłuższych warstw.
    ray.lineTo(128 * (0.4 + 0.6 * t), 16);
    ray.lineTo(23, 16 + w);
    ray.closePath();
    ray.fillPath();
  }
  ray.generateTexture(FX.ray, 128, 32);
  ray.destroy();
}

/**
 * Przyciemnienie barwy przy zachowaniu proporcji kanałów.
 *
 * Potrzebne przy warstwach ADD: dodanie pełnej barwy żywiołu do już jasnego
 * terenu wypycha wszystkie kanały do 255 i zostaje biel. Ta sama barwa
 * przyciemniona dodaje mniej, ale ZACHOWUJE nierówność kanałów — i właśnie
 * z niej bierze się temperatura światła, o którą upomniał się krytyk.
 */
function shade(color: number, k: number) {
  const c = Phaser.Display.Color.IntegerToRGB(color);
  return Phaser.Display.Color.GetColor(
    Math.round(c.r * k),
    Math.round(c.g * k),
    Math.round(c.b * k)
  );
}

/** Rozjaśnienie w stronę bieli — dla rdzenia światła, gdzie żar jest najgorętszy. */
function tintTowardsWhite(color: number, k: number) {
  const c = Phaser.Display.Color.IntegerToRGB(color);
  const up = (v: number) => Math.round(v + (255 - v) * k);
  return Phaser.Display.Color.GetColor(up(c.r), up(c.g), up(c.b));
}

/**
 * Cieplejszy, mocniej nasycony wariant barwy — dla ZEWNĘTRZNEGO pasa łuny.
 *
 * We wzorcu (masters-08) światło ma wyraźną temperaturę: biały rdzeń, złoto
 * w środku, cieplejszy pomarańcz na brzegach. Jedna barwa rozciągnięta na całą
 * łunę zawsze wygląda jak przezroczysta naklejka, bo prawdziwe światło stygnie
 * z odległością od źródła. Dlatego brzeg dostaje barwę obróconą o kilkanaście
 * stopni w stronę bursztynu (30°) i dociśniętą w nasyceniu.
 *
 * Obrót jest mały i po krótszym łuku, więc woda nie robi się ogniem — robi się
 * cieplejszym, głębszym błękitem, a ogień pełnym pomarańczem.
 */
function warmEdge(color: number) {
  const c = Phaser.Display.Color.IntegerToRGB(color);
  const hsv = Phaser.Display.Color.RGBToHSV(c.r, c.g, c.b) as {
    h: number;
    s: number;
    v: number;
  };
  // Bursztyn wzorca leży przy 30° = 0.0833 w skali 0-1. Idziemy do niego
  // krótszą drogą po kole, ale tylko o 14% dystansu.
  const target = 30 / 360;
  let d = target - hsv.h;
  if (d > 0.5) d -= 1;
  if (d < -0.5) d += 1;
  const h = (hsv.h + d * 0.14 + 1) % 1;
  const out = Phaser.Display.Color.HSVToRGB(h, Math.min(1, hsv.s * 1.25 + 0.12), hsv.v);
  const o = out as Phaser.Display.Color;
  return Phaser.Display.Color.GetColor(o.red, o.green, o.blue);
}

/**
 * Barwa światła ODSUNIĘTA OD BARWY PODŁOŻA.
 *
 * Najcięższy zarzut rundy 4: atak trawiasty nad łąką ginie, bo hue efektu
 * (biało-jasnozielony) jest praktycznie ten sam co żółto-zielony teren pod
 * spodem. Światło, które ma dokładnie barwę tła, nie jest światłem — jest
 * mgiełką. Żaden dobór alfy tego nie naprawi, bo problem leży w odległości
 * barw, nie w jasności.
 *
 * Plansza jest w większości krajobrazów zielono-żółta (łąka, jesień, częściowo
 * plaża), więc to zieleń w paśmie ok. 70-150° jest tą, która się zlewa.
 * Barwy z tego pasma dostają mocny skręt w stronę limonki (~68°) i dociśnięte
 * nasycenie z jasnością — trawa nadal czyta się jako trawa, ale jako JASNA,
 * kwaśna limonka odcinająca się od matowej oliwki terenu. Barwy spoza pasma
 * (ogień, woda, lód) mają kontrast do łąki z natury i zostają nietknięte —
 * przesuwanie ich tylko zafałszowałoby żywioł.
 */
function standOut(color: number) {
  const c = Phaser.Display.Color.IntegerToRGB(color);
  const hsv = Phaser.Display.Color.RGBToHSV(c.r, c.g, c.b) as {
    h: number;
    s: number;
    v: number;
  };
  const deg = hsv.h * 360;
  if (deg < 68 || deg > 150) return color;
  // Im bliżej środka pasma zieleni, tym mocniejszy skręt — barwa graniczna
  // przesuwa się ledwo, żeby nie było widocznego progu między żywiołami.
  const pull = 1 - Math.abs(deg - 110) / 42;
  const h = (hsv.h + ((68 / 360 - hsv.h) * (0.55 + 0.35 * pull)) + 1) % 1;
  const out = Phaser.Display.Color.HSVToRGB(
    h,
    Math.min(1, hsv.s * 1.15 + 0.1),
    Math.min(1, hsv.v * 1.1 + 0.12)
  ) as Phaser.Display.Color;
  return Phaser.Display.Color.GetColor(out.red, out.green, out.blue);
}

/**
 * Maska przycinająca światło do prostokąta planszy.
 *
 * Bez niej łuna z górnego rzędu wylewała się na pasek tytułu (zrzut 04b) —
 * i wtedy nie czyta się jako łuna nad łąką, tylko jako przeciek renderu.
 * Maska jest jedna na scenę i współdzielona przez wszystkie warstwy światła:
 * tworzenie jej na każdy cios kosztowałoby nowy Graphics kilka razy na turę.
 */
const masks = new WeakMap<Phaser.Scene, Phaser.Display.Masks.GeometryMask>();

function boardMask(scene: Phaser.Scene) {
  let m = masks.get(scene);
  if (!m) {
    const g = scene.make.graphics({}, false);
    g.fillStyle(0xffffff, 1);
    g.fillRoundedRect(BOARD_X, BOARD_Y, BOARD_W, BOARD_H, 18);
    m = g.createGeometryMask();
    masks.set(scene, m);
  }
  return m;
}

/**
 * Rozwarstwione światło: mały biały rdzeń, barwa żywiołu w środkowym pasie,
 * cieplejszy brzeg gasnący wykładniczo do zera.
 *
 * Wspólne dla trafienia i zejścia oddziału — po rundzie 2 rozbłysk śmierci był
 * jedynym, który nie dostał barwy i przez to wyglądał na tańszy od reszty.
 *
 * Każdy pas idzie w dwóch trybach: przygaszona barwa w ADD (daje jasność
 * i „zalewanie" sceny) plus ta sama barwa zwyczajnie (pilnuje nasycenia, bo
 * ADD nad jasną łąką bieleje). Rdzeń jest wyłącznie w ADD — on MA być biały.
 *
 * @param d  średnica najszerszego pasa w pikselach
 */
function lightStack(
  scene: Phaser.Scene,
  layer: Phaser.GameObjects.Container,
  x: number,
  y: number,
  raw: number,
  d: number,
  strength = 1
) {
  const mask = boardMask(scene);
  // Cały stos liczy barwy od wariantu ODSUNIĘTEGO OD TŁA, nie od surowej barwy
  // żywiołu — inaczej zieleń trawy nadal zlewałaby się z zielenią łąki.
  const color = standOut(raw);
  const edge = warmEdge(color);

  // Pasy od najszerszego do najwęższego. `k` to krotność `d`, `grow` mówi ile
  // pas urośnie gasnąc — szeroki brzeg rozpływa się bardziej niż rdzeń, dzięki
  // czemu światło wygląda, jakby uciekało na zewnątrz.
  //
  // Proporcje wprost z zalecenia krytyka: rdzeń ~15% średnicy barwnej łuny,
  // a poświata sięga 2-3x dalej niż on.
  const bands: {
    tex: string;
    tint: number;
    mode: number;
    a: number;
    k: number;
    from: number;
    grow: number;
    /** Spłaszczenie w pionie: 1 to koło, mniej to elipsa leżąca na ziemi. */
    squash?: number;
    /** Ile pas czeka, zanim zacznie narastać — stąd bierze się kolejność warstw. */
    wait: number;
    /** Czas narastania do pełnej alfy. */
    rise: number;
    /** Ile pas TRZYMA pełną alfę. To on decyduje, czy efekt ma treść w czasie. */
    hold: number;
    /** Czas gaśnięcia. */
    fade: number;
  }[] = [
    // Najdalszy pas: cieplejsza barwa, rozlana szeroko i słabo. To on daje
    // „globalne rozjaśnienie planszy" — sięga 1.7x dalej niż barwny rdzeń łuny
    // i to jego widać na sąsiednich polach, kiedy reszta już zgasła. Wchodzi
    // NAJPÓŹNIEJ i schodzi NAJPÓŹNIEJ: światło stygnie od środka na zewnątrz.
    // Krótsze przytrzymanie niż u pasa barwnego, mimo że gaśnie najdłużej:
    // na pasku ostatnia klatka trafiała dokładnie w plateau i szeroka mgła
    // stała tam pełną mocą, przez co czytała się jak filtr nałożony na planszę,
    // a nie jak dogasające światło. Teraz ostatnia klatka łapie ją już w zaniku.
    { tex: FX.haze, tint: shade(edge, 0.7), mode: Phaser.BlendModes.ADD, a: 0.5, k: 1.5, from: 0.5, grow: 1.3, wait: 40, rise: 120, hold: 70, fade: 320 },
    { tex: FX.haze, tint: edge, mode: Phaser.BlendModes.NORMAL, a: 0.56, k: 1.5, from: 0.58, grow: 1.26, wait: 40, rise: 130, hold: 80, fade: 340 },
    // Pas środkowy: czysta barwa żywiołu — po niej gracz poznaje, czym oberwał.
    // Szczytuje w okolicach 110 ms, czyli DOKŁADNIE wtedy, gdy biały rdzeń już
    // zgasł. To jest treść efektu i ma ją widać najdłużej ze wszystkiego, co
    // niesie kolor rozpoznawalny jako żywioł.
    // Waga przesunięta z ADD na NORMAL. Pasek po pierwszej poprawce obwiedni
    // pokazał światło we wszystkich czterech klatkach, ale BLADE: nad jasną
    // łąką ADD dokłada głównie jasność, więc barwa rozjeżdżała się w mlecznobiałą
    // mgłę. NORMAL nakłada hue wprost i nie da się go wypalić, więc to on niesie
    // teraz rozpoznawalność żywiołu, a ADD jest już tylko dopalaczem jasności.
    { tex: FX.bloom, tint: shade(color, 0.6), mode: Phaser.BlendModes.ADD, a: 0.66, k: 1, from: 0.45, grow: 1.34, wait: 20, rise: 95, hold: 110, fade: 280 },
    { tex: FX.bloom, tint: color, mode: Phaser.BlendModes.NORMAL, a: 0.82, k: 0.94, from: 0.5, grow: 1.28, wait: 20, rise: 100, hold: 130, fade: 300 },
    // RDZEŃ MA BUDOWĘ, nie jest białą plamą. To był osobny zarzut rundy 4:
    // „brak rdzenia". Trzy warstwy zamiast jednej:
    //
    // (a) nasada rdzenia w NASYCONEJ barwie żywiołu, spłaszczona w elipsę —
    //     to ona sprawia, że światło ma barwę już w samym środku, a nie dopiero
    //     w łunie dookoła. Elipsa, bo we wzorcu światło siedzi NA ZIEMI i jest
    //     przez to ściśnięte w pionie, a nie zawieszone w próżni.
    { tex: FX.bloom, tint: color, mode: Phaser.BlendModes.NORMAL, a: 0.9, k: 0.34, from: 0.25, grow: 1.45, squash: 0.66, wait: 0, rise: 40, hold: 55, fade: 190 },
    // (b) gorąca obwódka — pomost między barwą a bielą, żeby biały punkt nie
    //     czytał się jak dziura wycięta w barwie.
    { tex: FX.glow, tint: tintTowardsWhite(color, 0.55), mode: Phaser.BlendModes.ADD, a: 0.8, k: 0.3, from: 0.22, grow: 1.6, squash: 0.72, wait: 0, rise: 38, hold: 30, fade: 150 },
    // (c) biały punkt: BŁYSK INICJUJĄCY, nie treść efektu. Zejście z 0.16 na
    //     0.1 średnicy to wprost zalecenie ze wzorca — rdzeń ma być mały,
    //     ok. ćwierci szerokości heksa, a nie plamą przykrywającą pole.
    { tex: FX.glow, tint: C.white, mode: Phaser.BlendModes.ADD, a: 0.5, k: 0.1, from: 0.3, grow: 1.5, squash: 0.8, wait: 0, rise: 26, hold: 0, fade: 62 },
  ];

  for (const b of bands) {
    const size = d * b.k;
    const sq = b.squash ?? 1;
    const img = scene.add
      .image(x, y, b.tex)
      .setTint(b.tint)
      .setBlendMode(b.mode)
      .setDisplaySize(size * b.from, size * b.from * sq)
      .setAlpha(0);
    img.setMask(mask);
    layer.add(img);

    // Trzy fazy jako ŁAŃCUCH, nie dwa równoległe tweeny.
    //
    // Wcześniej narastanie i gaśnięcie były dwoma tweenami na tym samym
    // obiekcie, z których drugi startował po 55 ms — a że oba ruszały tę samą
    // właściwość `alpha`, Phaser rozstrzygał konflikt po swojemu i pas gasł
    // niemal natychmiast po dojściu do szczytu. Stąd pasek, na którym po
    // klatce z bielą nie ma już nic. Faza kolejna startuje teraz dopiero
    // w `onComplete` poprzedniej, więc obwiednia w czasie jest dokładnie taka,
    // jak ją tu opisano — narastanie, PRZYTRZYMANIE, gaśnięcie.
    const peak = b.a * strength;
    scene.tweens.add({
      targets: img,
      displayWidth: size,
      displayHeight: size * sq,
      alpha: peak,
      delay: b.wait,
      duration: b.rise,
      ease: E.snap,
      onComplete: () => {
        scene.tweens.add({
          targets: img,
          displayWidth: size * b.grow,
          displayHeight: size * b.grow * sq,
          alpha: 0,
          // Przytrzymanie szczytu robimy opóźnieniem gaśnięcia: pas rośnie
          // dalej dopiero, gdy zaczyna słabnąć, więc w chwili „hold" łuna
          // stoi nieruchomo i da się ją zobaczyć, a nie tylko mignąć.
          delay: b.hold,
          duration: b.fade,
          // easeOut, nie easeIn: przy easeIn alfa spadała gwałtownie na
          // początku i ogon gaśnięcia był pustym czasem. Teraz łuna traci
          // jasność powoli i widać ją przez całe gaśnięcie.
          ease: 'Quad.easeOut',
          onComplete: () => {
            img.clearMask();
            img.destroy();
          },
        });
      },
    });
  }
}

/**
 * Wachlarz promieni radialnych — element, którego wzorzec ma, a rundy 1-4 nie
 * miały wcale.
 *
 * Kluczowe jest ZRÓŻNICOWANIE: we wzorcu promienie mają różną długość, różną
 * szerokość i różne rozmycie, i dopiero z tej nierówności bierze się wrażenie
 * wybuchu światła. Dziesięć identycznych klinów w równych odstępach wygląda
 * jak tarcza zegara, więc i kąt dostaje losowe rozchwianie.
 *
 * Promienie wchodzą i schodzą razem z rdzeniem, nie z łuną: to one SĄ błyskiem.
 * Gdyby zostały na dłużej, powtórzyłby się błąd rundy 3 — najgłośniejszy,
 * najbielszy element trwałby przez cały efekt.
 */
function rayBurst(
  scene: Phaser.Scene,
  layer: Phaser.GameObjects.Container,
  x: number,
  y: number,
  color: number,
  coreR: number,
  strength: number
) {
  const mask = boardMask(scene);
  // Promienie NIOSĄ BARWĘ, nie biel. Przy 0.72 w stronę bieli wachlarz ognisty
  // sumował się w białą gwiazdę i po barwie nie dało się poznać żywiołu —
  // dokładnie ten błąd, który rundy 1-3 miały w rdzeniu, tylko przeniesiony
  // o warstwę wyżej. Biel zostaje wyłącznie w rdzeniu.
  const hot = tintTowardsWhite(color, 0.3);
  const n = 10;
  for (let i = 0; i < n; i++) {
    // Bazowy rozkład równomierny plus rozchwianie o pół działki — inaczej
    // wachlarz czyta się jak rysunek techniczny, a nie jak rozbłysk.
    const a = Phaser.Math.DegToRad((i * 360) / n + Phaser.Math.FloatBetween(-16, 16));
    // Zalecenie krytyka wprost: długość 1,5-3x promienia rdzenia.
    const len = coreR * Phaser.Math.FloatBetween(1.5, 3);
    const wide = Phaser.Math.FloatBetween(0.34, 1.15);
    // Co trzeci promień jest wyraźnie bledszy i szerszy — to on daje
    // „różne rozmycie" ze wzorca. Bez tego wszystkie mają jedną ostrość.
    const soft = i % 3 === 0;
    const r = scene.add
      .image(x, y, FX.ray)
      // Nasada promienia siedzi w punkcie trafienia, więc obracamy go wokół
      // lewej krawędzi, a nie wokół środka.
      .setOrigin(0, 0.5)
      .setRotation(a)
      .setDisplaySize(coreR * 0.5, coreR * wide * (soft ? 1.5 : 1))
      .setTint(soft ? color : hot)
      .setBlendMode(Phaser.BlendModes.ADD)
      .setAlpha(0);
    r.setMask(mask);
    layer.add(r);
    scene.tweens.add({
      targets: r,
      displayWidth: len,
      alpha: (soft ? 0.36 : 0.72) * strength,
      duration: 55,
      ease: E.snap,
      onComplete: () => {
        scene.tweens.add({
          targets: r,
          // Promień wystrzeliwuje jeszcze kawałek dalej gasnąc — światło ucieka
          // na zewnątrz, tak jak w łunie.
          displayWidth: len * 1.35,
          displayHeight: r.displayHeight * 0.7,
          alpha: 0,
          delay: 35,
          duration: soft ? 210 : 150,
          ease: 'Quad.easeOut',
          onComplete: () => {
            r.clearMask();
            r.destroy();
          },
        });
      },
    });
  }
}

/**
 * Światło POŁOŻONE NA POLU: rozjaśnia sam heks celu, nie całą planszę.
 *
 * Werdykt rundy 4 brzmiał: „nic w A nie jest oświetlone — heks, sprite i pasek
 * HP mają tę samą jasność co poza efektem". Efekt leżał na wierzchu zamiast
 * należeć do sceny. Sześciokąt w trybie ADD, dopasowany do siatki, rozjaśnia
 * teren pod celem o ~jedną trzecią na ~200 ms i to wystarcza, żeby światło
 * wyglądało na osadzone — a że dotyczy JEDNEGO pola z siedemdziesięciu,
 * czytelność reszty planszy zostaje nietknięta.
 */
function hexLight(
  scene: Phaser.Scene,
  layer: Phaser.GameObjects.Container,
  x: number,
  y: number,
  color: number,
  strength: number
) {
  const g = scene.add.graphics({ x, y });
  // Heks planszy jest szpicem do góry (patrz board.ts: ROW_STEP = 1.5 * R),
  // więc wierzchołki liczymy od kąta -90°.
  const pts: number[] = [];
  for (let i = 0; i < 6; i++) {
    const a = Phaser.Math.DegToRad(i * 60 - 90);
    pts.push(Math.cos(a) * HEX_R * 0.97, Math.sin(a) * HEX_R * 0.97);
  }
  // Dwa wypełnienia: mocniejsze w środku pola, słabsze przy krawędziach —
  // płaski sześciokąt jednej jasności wyglądał jak podświetlenie kursora,
  // a ma wyglądać jak światło padające z góry na to pole.
  g.fillStyle(color, 0.34);
  g.beginPath();
  g.moveTo(pts[0], pts[1]);
  for (let i = 2; i < pts.length; i += 2) g.lineTo(pts[i], pts[i + 1]);
  g.closePath();
  g.fillPath();
  g.fillStyle(tintTowardsWhite(color, 0.5), 0.3);
  g.fillCircle(0, 0, HEX_R * 0.62);
  g.setBlendMode(Phaser.BlendModes.ADD).setAlpha(0);
  layer.add(g);

  scene.tweens.add({
    targets: g,
    alpha: strength,
    duration: 60,
    ease: E.snap,
    onComplete: () => {
      scene.tweens.add({
        targets: g,
        alpha: 0,
        // 200 ms z zalecanego przedziału 150-250: dość, by oko zarejestrowało
        // rozjaśnienie terenu, za mało, by pole zostało „podświetlone".
        duration: 200,
        ease: 'Quad.easeOut',
        onComplete: () => g.destroy(),
      });
    },
  });
}

// ---------- trafienie ----------

export interface ImpactOpts {
  /** Barwa żywiołu atakującego — po niej gracz poznaje, czym oberwał. */
  color: number;
  /** Siła ciosu 0-1 (ułamek życia, który cel stracił). Skaluje cały efekt. */
  power: number;
  /** Przewaga typu: „super skuteczne" ma wyglądać wyraźnie mocniej. */
  strong?: boolean;
  /** Słaby typ: cios ma się odbić, nie rozbłysnąć. */
  weak?: boolean;
  /**
   * Środek HEKSA celu w pionie. Punkt trafienia (`y`) jest podniesiony do
   * wysokości korpusu stworka, a oświetlenie terenu musi trafić w pole,
   * nie w powietrze nad nim. Bez tego jasny sześciokąt wisiał o kilkanaście
   * pikseli za wysoko i nie pokrywał się z siatką.
   */
  cellY?: number;
}

/**
 * Rozrzucone iskry. Krytyk zarzucił „parę identycznych kresek" — we wzorcu
 * iskry różnią się WSZYSTKIM: rozmiarem, jasnością i ostrością, i dopiero
 * z tego bierze się głębia (bliskie ostre, dalekie zdmuchnięte w pył).
 *
 * Dlatego nie emiter, tylko własne obiekty: emiter Phasera losuje prędkość
 * i czas życia, ale rozmiar i alfę bierze z jednej krzywej dla wszystkich
 * cząstek, więc wszystkie wyglądają tak samo. Tutaj każda iskra dostaje
 * własny promień 1-4 px, własną alfę 0.3-1.0 i własną teksturę: ostrą albo
 * rozmytą. Kilkadziesiąt obrazków na cios to dla Phasera nic.
 */
function sparkSpray(
  scene: Phaser.Scene,
  layer: Phaser.GameObjects.Container,
  x: number,
  y: number,
  color: number,
  count: number,
  reach: number
) {
  const mask = boardMask(scene);
  const edge = warmEdge(color);
  for (let i = 0; i < count; i++) {
    // TRZY KLASY ROZMIARU, nie jedno losowanie z zakresu.
    //
    // Losowy promień 1-4 px dawał w praktyce chmurę iskier średnich — rozkład
    // jednostajny nie tworzy hierarchii, a we wzorcu widać wyraźnie trzy różne
    // populacje: gruby, ostry żar tuż przy źródle, średnie iskry i mgła pyłu
    // rozsypana daleko. Dlatego klasa jest losowana najpierw, a dopiero potem
    // rozmiar w jej wąskim zakresie.
    //  0 — pył: najmniejszy, najbardziej rozmyty, leci najdalej (tło);
    //  1 — iskra średnia, umiarkowanie ostra;
    //  2 — żar: największy i najostrzejszy, zostaje blisko punktu kontaktu.
    const roll = Math.random();
    const cls = roll < 0.45 ? 0 : roll < 0.8 ? 1 : 2;
    const sharp = cls > 0;
    // Promień jasnego rdzenia iskry: ~1 / 2 / 4 px, czyli obrazek 2/4/8 px.
    const r = cls === 0 ? Phaser.Math.FloatBetween(0.8, 1.4)
      : cls === 1 ? Phaser.Math.FloatBetween(1.8, 2.6)
      : Phaser.Math.FloatBetween(3.4, 4.6);
    // Temperatura także w iskrach: żar przy źródle jest najbielszy, średnie
    // iskry niosą barwę żywiołu, daleki pył jest najcieplejszy i najciemniejszy.
    // To ten sam gradient co w łunie, tylko rozłożony na cząstkach.
    const bright = tintTowardsWhite(color, 0.35);
    const tint =
      cls === 2
        ? Phaser.Math.RND.pick([tintTowardsWhite(color, 0.6), bright, C.white])
        : cls === 1
          ? Phaser.Math.RND.pick([bright, bright, color, C.goldLight])
          : Phaser.Math.RND.pick([edge, edge, shade(edge, 0.85), color]);
    const sp = scene.add
      .image(x, y, sharp ? FX.spark : FX.mote)
      // `r` to promień JASNEGO RDZENIA iskry, nie całego obrazka. Tekstura ma
      // rdzeń o promieniu 3/16 swojej szerokości i miękką otoczkę wokół, więc
      // żeby rdzeń miał naprawdę 1-4 px, obrazek musi być kilka razy większy.
      // Poprzednio rysowaliśmy cały obrazek w rozmiarze 2r — rdzeń wychodził
      // poniżej piksela i iskier po prostu nie było widać.
      // Rozmycie rośnie odwrotnie do klasy: żar (2) ma rdzeń prawie na całym
      // obrazku i jest ostry, pył (0) ma ten sam rdzeń rozdmuchany na obrazek
      // wielokrotnie większy, więc czyta się jako nieostry, dalszy plan.
      .setDisplaySize(r * BLUR[cls], r * BLUR[cls])
      .setTint(tint)
      // Ostre iskry świecą (ADD) — są małe, więc wypalenie do bieli im nie
      // grozi, a muszą się przebić przez jasny teren. Pył idzie przez SCREEN:
      // ma być zdmuchniętą mgiełką w barwie żywiołu, nie punktem światła.
      .setBlendMode(sharp ? Phaser.BlendModes.ADD : Phaser.BlendModes.SCREEN)
      // Żar świeci pełną mocą, pył ledwie majaczy — inaczej trzy klasy
      // rozmiaru zlewałyby się w jedną jasność.
      .setAlpha(cls === 2 ? Phaser.Math.FloatBetween(0.85, 1)
        : cls === 1 ? Phaser.Math.FloatBetween(0.6, 0.95)
        : Phaser.Math.FloatBetween(0.22, 0.5));
    sp.setMask(mask);
    layer.add(sp);

    const a = Phaser.Math.FloatBetween(0, Math.PI * 2);
    // Pył leci najdalej, żar zostaje przy punkcie kontaktu — to ta odległość
    // buduje głębię, nie sam rozmiar.
    const d = Phaser.Math.FloatBetween(0.25, 1) * reach * REACH[cls];
    const life = Phaser.Math.Between(200, 520);
    scene.tweens.add({
      targets: sp,
      x: x + Math.cos(a) * d,
      // Lekkie opadanie: iskry mają ciążyć do ziemi, inaczej wyglądają jak
      // rozjeżdżająca się rozeta.
      y: y + Math.sin(a) * d * 0.72 + 14,
      displayWidth: r * 0.8,
      displayHeight: r * 0.8,
      alpha: 0,
      duration: life,
      ease: 'Quad.easeOut',
      onComplete: () => {
        sp.clearMask();
        sp.destroy();
      },
    });
  }
}

/** Mnożnik obrazka względem rdzenia iskry — im większy, tym bardziej rozmyta. */
const BLUR = [11, 6.2, 4.4];
/** Mnożnik zasięgu lotu wg klasy: pył daleko, żar blisko. */
const REACH = [1.15, 0.85, 0.55];

/**
 * Błysk w punkcie uderzenia. Warstwy o różnym czasie życia, od najdłuższej
 * (poświata) po najkrótszą (przyciemnienie): bez tego stosu trafienie było
 * samym drgnięciem kamery — gracz nie miał gdzie skierować wzroku.
 */
export function impactBurst(
  scene: Phaser.Scene,
  layer: Phaser.GameObjects.Container,
  x: number,
  y: number,
  o: ImpactOpts
) {
  const p = Phaser.Math.Clamp(o.power, 0, 1);
  // Słaby cios ma zostać czytelnie mniejszy od mocnego, ale nie może zniknąć —
  // stąd dolna granica, a nie czyste mnożenie przez siłę.
  const scale = (o.strong ? 1.5 : o.weak ? 0.72 : 1) * (0.8 + p * 0.6);

  // 0. Przyciemnienie pod uderzeniem USUNIĘTE.
  //
  // Była to proteza: skoro ADD nad jasną łąką nie miał zapasu jasności, to
  // podkładaliśmy pod błysk ciemną elipsę, żeby światło miało od czego się
  // odbić. Odkąd trafione pole jest realnie ROZJAŚNIANE (`hexLight`),
  // przyciemnienie działa dokładnie przeciwko temu — a na pasku ognistym
  // zostawało pod rozbłyskiem jako szara plama, czyli brud, nie cień.
  // Właściwym rozwiązaniem problemu „jasne na jasnym" jest oświetlenie sceny,
  // nie zabrudzenie jej pod spodem.

  // 1. ŚWIATŁO — rozwarstwione na pasy o różnej temperaturze (patrz
  // `lightStack`). Po rundzie 2 światło było już widoczne, ale płaskie: jedna
  // barwa i biały rdzeń bez przejścia. Teraz idzie od białego rdzenia
  // (~15% średnicy) przez barwę żywiołu po cieplejszy brzeg, gasnący
  // wykładniczo do zera i przycięty do ramy planszy.
  // `d` to średnica BARWNEGO pasa łuny; ciepły brzeg sięga 1.7x dalej,
  // a biały rdzeń ma 16% tej wartości.
  const bloomPx = (196 + p * 38) * (o.strong ? 1.2 : o.weak ? 0.86 : 1);

  // 0b. OŚWIETLENIE POLA. Idzie przed łuną, żeby leżało pod nią: najpierw
  // rozjaśnia się teren, potem dopiero kładzie się na nim światło. Odwrotna
  // kolejność dawała jasny sześciokąt NA rozbłysku, czyli znów naklejkę.
  // Bierzemy `cellY`, a nie `y`, bo punkt trafienia jest podniesiony do
  // wysokości korpusu stworka, a heks trzeba rozjaśnić tam, gdzie leży.
  hexLight(
    scene,
    layer,
    x,
    o.cellY ?? y,
    standOut(o.color),
    (o.strong ? 0.42 : o.weak ? 0.26 : 0.34) * (0.75 + p * 0.35)
  );

  lightStack(scene, layer, x, y, o.color, bloomPx, o.weak ? 0.82 : 1);

  // 2. WACHLARZ PROMIENI — brakujący element ze wzorca. Promień rdzenia to
  // połowa średnicy nasady rdzenia z `lightStack` (k = 0.34), więc promienie
  // wychodzą dokładnie zza gorącego środka, a nie znikąd.
  rayBurst(scene, layer, x, y, o.color, bloomPx * 0.17, o.weak ? 0.7 : 1);

  // 3. Pierścienie energii. Dwa, z przesunięciem — jeden wygląda jak animacja
  // ładowania, dwa jak fala uderzeniowa.
  // Pierwszy pierścień był czysto biały i szeroki na 4 px — razem z rdzeniem
  // dokładał się do tej samej białej plamy, którą widać na pierwszej klatce
  // paska. Cieńszy i już podbarwiony żywiołem: nadal czyta się jako ostra fala,
  // ale nie licytuje się z łuną o to, co jest treścią kadru.
  ring(scene, layer, x, y, tintTowardsWhite(o.color, 0.62), 3, 3.4 * scale, 340, 0);
  // Drugi pierścień w cieplejszej barwie brzegu — fala uderzeniowa jest tym
  // dalszym, chłodniejszym końcem światła, więc ma nieść tę samą barwę co brzeg łuny.
  ring(scene, layer, x, y, warmEdge(o.color), 3, 4.6 * scale, 380, 80);

  // 4. Deszcz iskier w trzech klasach rozmiaru (szczegóły w `sparkSpray`).
  //
  // Liczba i zasięg iskier są ODERWANE od siły ciosu. Wcześniej słaby cios
  // dostawał 26 iskier na 80 px i deszcz przestawał być deszczem — a to iskry
  // niosą wrażenie mocy, więc ich rzednięcie odbierało słabym ciosom całą
  // oprawę zamiast tylko ją przygasić. Siła zmienia teraz jasność i średnicę
  // światła; iskier jest zawsze tyle, żeby chmura miała gęstość.
  sparkSpray(
    scene,
    layer,
    x,
    y,
    o.color,
    Math.round((o.strong ? 46 : 34) + p * 6),
    132 * (o.strong ? 1.15 : 1)
  );

  // 5. Kilka błyszczek o innym kształcie — pojedyncze ostre gwiazdki w gęstwie
  // okrągłych iskier łamią monotonię, tak jak we wzorcu.
  const dust = scene.add.particles(0, 0, FX.twinkle, {
    speed: { min: 40, max: 170 * scale },
    lifespan: { min: 300, max: 620 },
    scale: { start: 0.45 * scale, end: 0 },
    alpha: { min: 0.35, max: 1 },
    rotate: { start: 0, end: 180 },
    tint: [tintTowardsWhite(o.color, 0.4), C.goldLight],
    blendMode: Phaser.BlendModes.ADD,
    emitting: false,
  });
  layer.add(dust);
  dust.explode(Math.round(6 + p * 6), x, y);

  // Emiter żyje własnym życiem po wystrzale, więc sprzątamy go z opóźnieniem
  // dłuższym niż najdłuższa cząstka.
  scene.time.delayedCall(900, () => dust.destroy());

  // 6. Przy przewadze typu dokładamy wieniec gwiazdek — „super skuteczne" ma
  // się różnić OD RAZU, zanim gracz przeczyta napis.
  if (o.strong) {
    for (let i = 0; i < 8; i++) {
      const a = Phaser.Math.DegToRad(i * 45 + 22);
      const star = scene.add
        .image(x, y, ICON.star)
        .setDisplaySize(16, 16)
        .setDepth(1);
      layer.add(star);
      scene.tweens.add({
        targets: star,
        x: x + Math.cos(a) * 54,
        y: y + Math.sin(a) * 38,
        angle: 180,
        scale: 0,
        alpha: 0,
        duration: 420,
        ease: E.snap,
        onComplete: () => star.destroy(),
      });
    }
  }
}

/** Rozchodzący się pierścień — pusty okrąg rosnący i gasnący. */
function ring(
  scene: Phaser.Scene,
  layer: Phaser.GameObjects.Container,
  x: number,
  y: number,
  color: number,
  width: number,
  to: number,
  duration: number,
  delay: number
) {
  const r = scene.add
    .circle(x, y, 12)
    .setStrokeStyle(width, color, 1)
    .setBlendMode(Phaser.BlendModes.ADD)
    .setScale(0.3);
  layer.add(r);
  scene.tweens.add({
    targets: r,
    scale: to,
    alpha: 0,
    duration,
    delay,
    ease: E.snap,
    onComplete: () => r.destroy(),
  });
}

/**
 * Cięcie w miejscu ciosu wręcz: jasny łuk pod kątem natarcia. Bez niego ruch
 * wręcz był samym przesunięciem sprite'a i nie było widać MOMENTU kontaktu.
 */
export function slashArc(
  scene: Phaser.Scene,
  layer: Phaser.GameObjects.Container,
  x: number,
  y: number,
  angle: number,
  color: number
) {
  const g = scene.add.graphics({ x, y });
  g.setBlendMode(Phaser.BlendModes.ADD);
  // Rysujemy dwa łuki: szeroki przygaszony robi poświatę, wąski jasny daje
  // ostrą krawędź. Ta sama sztuczka co przy obrysach w reszcie gry.
  g.lineStyle(18, color, 0.55);
  g.beginPath();
  g.arc(0, 0, 38, Phaser.Math.DegToRad(-58), Phaser.Math.DegToRad(58));
  g.strokePath();
  g.lineStyle(8, C.white, 0.95);
  g.beginPath();
  g.arc(0, 0, 38, Phaser.Math.DegToRad(-50), Phaser.Math.DegToRad(50));
  g.strokePath();
  // Łuk ma otwierać się w stronę celu, więc obracamy go o kąt natarcia.
  g.setRotation(angle);
  g.setScale(0.6, 1.1);
  layer.add(g);

  scene.tweens.add({
    targets: g,
    scaleX: 1.25,
    scaleY: 0.75,
    alpha: 0,
    duration: 210,
    ease: E.snap,
    onComplete: () => g.destroy(),
  });
}

/**
 * Krótkie rozbielenie trafionego stworka. Najtańszy możliwy sygnał „to on
 * oberwał" — działa nawet gdy iskry przesłoni sąsiad.
 */
export function flashTarget(
  scene: Phaser.Scene,
  sprite: Phaser.GameObjects.Image,
  color: number = C.white
) {
  // W Phaser 4 barwa i tryb barwienia to dwa osobne ustawienia; samo
  // `setTintFill()` jest już tylko pustą zaślepką po Phaserze 3.
  //
  // Pełne rozbielenie skrócone z 90 do 45 ms: to sygnał kontaktu, nie
  // oświetlenie. Przy 90 ms na pasku klatek trafiony stworek był białą
  // sylwetką jeszcze wtedy, gdy rozbłysk dawno zgasł — gracz tracił z oczu,
  // KTO oberwał, bo sprite przestawał być rozpoznawalny.
  sprite.setTint(C.white).setTintMode(Phaser.TintModes.FILL);
  scene.time.delayedCall(45, () => {
    if (!sprite.active) return;
    sprite.setTintMode(Phaser.TintModes.MULTIPLY);
    sprite.clearTint();
  });

  // Po rozbieleniu zostaje ŚWIATŁO NA SYLWETCE: kopia sprite'a w trybie ADD,
  // przyciemniona do jednej trzeciej i podbarwiona żywiołem. Dzięki temu
  // stworek jest przez chwilę realnie oświetlony — widać jego kształt i barwę,
  // tylko jaśniejsze — zamiast zamienić się w białą plamę. To druga połowa
  // zarzutu „nic w A nie jest oświetlone": rozjaśnić trzeba i teren, i cel.
  const parent = sprite.parentContainer;
  const lit = scene.add
    .image(sprite.x, sprite.y, sprite.texture.key, sprite.frame.name)
    .setOrigin(sprite.originX, sprite.originY)
    .setDisplaySize(sprite.displayWidth, sprite.displayHeight)
    .setFlipX(sprite.flipX)
    .setTint(shade(color, 0.42))
    .setBlendMode(Phaser.BlendModes.ADD)
    .setAlpha(0);
  if (parent) parent.add(lit);
  scene.tweens.add({
    targets: lit,
    alpha: 1,
    duration: 50,
    ease: E.snap,
    onComplete: () => {
      scene.tweens.add({
        targets: lit,
        alpha: 0,
        // Ten sam przedział 150-250 ms co przy oświetleniu heksa — teren
        // i sylwetka mają gasnąć razem, inaczej światło się rozjeżdża.
        duration: 200,
        ease: 'Quad.easeOut',
        onComplete: () => lit.destroy(),
      });
    },
  });
}

/**
 * Wstrząs kamery zależny od siły ciosu. Stała wartość sprawiała, że draśnięcie
 * trzęsło ekranem tak samo jak wybicie połowy oddziału — i przez to żadne
 * trafienie nie miało wagi.
 */
export function battleShake(scene: Phaser.Scene, power: number) {
  const p = Phaser.Math.Clamp(power, 0, 1);
  scene.cameras.main.shake(90 + p * 140, 0.0016 + p * 0.007);
}

// ---------- pocisk ----------

export interface ShotOpts {
  from: { x: number; y: number };
  to: { x: number; y: number };
  /** Barwa żywiołu — ona odróżnia strzał ognisty od wodnego. */
  color: number;
  /** Żywioł strzelca; jego ikona jest kształtem pocisku. */
  element: keyof typeof TYPE_ICON;
  /** Złamana strzała: pocisk sypie się w locie i leci wolniej. */
  broken: boolean;
}

/**
 * Pocisk strzelca. Wcześniej był to dosłownie prostokąt plus trójkąt — jedna
 * strzała dla ognia, wody i trawy. Tutaj pocisk NIESIE ŻYWIOŁ: leci ikona
 * żywiołu w aureoli jego barwy, a za nią zostaje smużący ślad z iskier.
 *
 * Ślad robimy emiterem podpiętym pod pocisk (`follow`), a nie łańcuchem
 * obiektów — emiter sam gasi cząstki po czasie życia, więc smuga zwęża się
 * naturalnie i nie trzeba jej sprzątać ręcznie.
 */
export function launchProjectile(
  scene: Phaser.Scene,
  layer: Phaser.GameObjects.Container,
  o: ShotOpts,
  onHit: () => void
) {
  const angle = Phaser.Math.Angle.Between(o.from.x, o.from.y, o.to.x, o.to.y);

  const shot = scene.add.container(o.from.x, o.from.y);
  // Barwna łuna wokół pocisku, osobno od jasnego rdzenia. Poprzednia wersja
  // miała samą aureolę ADD i biel z rdzenia wygrywała z barwą żywiołu —
  // strzał ognisty i wodny wyglądały tak samo. SCREEN nie wypala barwy, więc
  // pomarańcz zostaje pomarańczą także nad jasną trawą.
  const wash = scene.add
    .image(0, 0, FX.bloom)
    .setTint(o.color)
    // Zwykłe krycie o niskiej alfie: to warstwa NASYCENIA, nie jasności.
    // Jasność daje aureola w ADD, a ta plama pilnuje, żeby pocisk miał barwę
    // żywiołu także nad jasną trawą, gdzie tryby świetlne bieleją.
    .setBlendMode(Phaser.BlendModes.NORMAL)
    .setDisplaySize(o.broken ? 54 : 82, o.broken ? 54 : 82)
    .setAlpha(0.5);
  const halo = scene.add
    .image(0, 0, FX.glow)
    // Przygaszona barwa w ADD: świeci, ale nie wypala się do bieli — ta sama
    // zasada co przy łunie trafienia.
    .setTint(shade(o.color, 0.75))
    .setBlendMode(Phaser.BlendModes.ADD)
    .setScale(o.broken ? 0.3 : 0.55)
    .setAlpha(0.95);
  // Jasny rdzeń pod ikoną. Bez niego ikona żywiołu — która ma gruby ciemny
  // kontur — czytała się na poświacie jak dziura, a nie jak lecące światło.
  // Rdzeń pod ikoną celowo mały. Przy skali 2.4 rozlewał się w białą kulę
  // szerszą od samej ikony i zjadał warkocz tuż za pociskiem — najjaśniejszy
  // punkt ma być na czubku ikony, nie dookoła niej.
  const spark = scene.add
    .image(0, 0, FX.spark)
    .setBlendMode(Phaser.BlendModes.ADD)
    .setScale(1.5);
  const head = scene.add
    .image(0, 0, TYPE_ICON[o.element])
    .setDisplaySize(o.broken ? 20 : 30, o.broken ? 20 : 30);
  shot.add([wash, halo, spark, head]);
  layer.add(shot);

  // Ikony są rysowane czubkiem do góry, więc dokładamy ćwierć obrotu: wtedy
  // szpic płomienia i kropli wskazuje kierunek lotu.
  shot.setRotation(angle + Math.PI / 2);

  // Ślad pocisku sypany ręcznie, obrazek po obrazku.
  //
  // Wcześniej robił to emiter cząstek z listą barw — i mimo tej listy smuga
  // wychodziła biała (widać to na zrzucie 06 z rundy 1: za niebieską kroplą
  // lecą białe kulki). Barwienie pojedynczych obrazków działa niezawodnie,
  // więc smugę robimy tak samo jak iskry trafienia. Przy okazji każdy ślad
  // dostaje własny rozmiar i rozmycie — bliskie ostre, dalekie w pył — czyli
  // to samo zróżnicowanie, którego krytyk zażądał od iskier.
  const bright = tintTowardsWhite(o.color, 0.3);
  const hot = tintTowardsWhite(o.color, 0.65);
  const cool = warmEdge(o.color);
  const mask = boardMask(scene);
  const trail = scene.time.addEvent({
    delay: 9,
    loop: true,
    callback: () => {
      if (!shot.active) return;
      // WARKOCZ, nie poświata. Okrągłe drobiny sypane wzdłuż toru dawały
      // rozmytą kiełbaskę światła — oko nie widziało kierunku ani prędkości.
      // Każda drobina jest teraz KRESKĄ rozciągniętą wzdłuż lotu i odsuniętą
      // w bok o kilka pikseli, więc ślad splata się z kilku pasm i czyta się
      // jako pęd, a nie jako mgła.
      for (let i = 0; i < 2; i++) {
        const sharp = Math.random() < 0.7;
        const r = Phaser.Math.FloatBetween(2, 5) * (o.broken ? 0.6 : 1);
        // Odsunięcie prostopadle do toru — stąd bierze się splot pasm.
        const off = Phaser.Math.FloatBetween(-5, 5);
        const px = shot.x + Math.cos(angle + Math.PI / 2) * off;
        const py = shot.y + Math.sin(angle + Math.PI / 2) * off;
        // Rdzeń warkocza jasny i prawie biały, pasma zewnętrzne cieplejsze —
        // ta sama temperatura co w łunie trafienia, tylko rozciągnięta w linię.
        const near = Math.abs(off) < 2;
        const puff = scene.add
          .image(px, py, sharp ? FX.spark : FX.mote)
          // Kreska: długa wzdłuż lotu, wąska w poprzek.
          .setDisplaySize(r * (sharp ? 20 : 24), r * (sharp ? 3 : 4.4))
          .setRotation(angle)
          .setTint(near ? hot : Phaser.Math.RND.pick([bright, o.color, cool]))
          .setBlendMode(sharp ? Phaser.BlendModes.ADD : Phaser.BlendModes.SCREEN)
          .setAlpha(near ? 1 : Phaser.Math.FloatBetween(0.45, 0.85));
        puff.setMask(mask);
        layer.add(puff);
        scene.tweens.add({
          targets: puff,
          // Kreska kurczy się głównie na długość — ogon warkocza się zwęża
          // i cofa, zamiast po prostu blaknąć w miejscu.
          displayWidth: r * 2,
          displayHeight: 1,
          alpha: 0,
          duration: o.broken ? 240 : 380,
          ease: 'Quad.easeOut',
          onComplete: () => {
            puff.clearMask();
            puff.destroy();
          },
        });
      }
    },
  });

  // Pocisk pulsuje w locie — żywioł ma wyglądać na żywy, nie na wystrzelony
  // kamień. Złamana strzała zamiast tego chybocze się i gaśnie.
  scene.tweens.add({
    targets: head,
    scaleX: head.scaleX * 1.18,
    scaleY: head.scaleY * 1.18,
    duration: 90,
    yoyo: true,
    repeat: -1,
    ease: E.soft,
  });
  if (o.broken) {
    scene.tweens.add({
      targets: shot,
      angle: `+=${40}`,
      alpha: 0.55,
      duration: 380,
      ease: E.soft,
    });
  }

  scene.tweens.add({
    targets: shot,
    x: o.to.x,
    y: o.to.y,
    duration: o.broken ? 380 : 270,
    ease: o.broken ? 'Quad.easeOut' : 'Quad.easeIn',
    onComplete: () => {
      // Sypanie kończymy w chwili trafienia; już wypuszczone drobiny gasną
      // same, więc smuga zwęża się naturalnie zamiast urwać się w powietrzu.
      trail.remove();
      shot.destroy();
      onHit();
    },
  });
}

// ---------- napisy ulotne ----------

/**
 * Zajęte prostokąty napisów, per scena — nowa tabliczka szuka wolnego pasa,
 * zamiast lądować na poprzedniej.
 */
const taken = new WeakMap<Phaser.Scene, Phaser.Geom.Rectangle[]>();

/**
 * Skąd tabliczka wie, CO leży pod spodem.
 *
 * Rozsuwanie z rundy 1 pilnowało tylko innych napisów, więc trzy komunikaty
 * z jednego ciosu owszem nie zlewały się ze sobą, ale całą kolumną siadały na
 * plakietkach sąsiednich oddziałów (widać to na zrzucie 05: „-10 / padło 5 /
 * Słabo skuteczne..." przykrywa Verdiko i Cindro razem z paskami życia).
 * Napis ulotny gaśnie po chwili, a plakietka jest stałą informacją — to napis
 * ma ustąpić, nie odwrotnie.
 *
 * Scena rejestruje tu funkcję zwracającą prostokąty zajęte przez oddziały.
 * Funkcja, nie gotowa lista, bo oddziały chodzą i giną w trakcie bitwy, a
 * tabliczka musi znać stan z chwili, w której wyskakuje.
 */
const obstacles = new WeakMap<Phaser.Scene, () => Phaser.Geom.Rectangle[]>();

export function setLabelObstacles(scene: Phaser.Scene, fn: () => Phaser.Geom.Rectangle[]) {
  obstacles.set(scene, fn);
}

/**
 * Bufor napisów zgłoszonych w tej samej klatce.
 *
 * Rozsuwanie w pionie z rundy 1 działało między napisami, ale nie wiedziało
 * nic o plakietkach oddziałów pod spodem — przy ciosie zabijającym część
 * oddziału leciały trzy komunikaty naraz („-10", „padło 5", „Słabo
 * skuteczne...") i rozpychały się po całej lewej kolumnie, wchodząc na paski
 * życia i liczebności. Stąd zmiana podejścia: wszystkie komunikaty z jednego
 * ciosu zbieramy przez jedną klatkę i pokazujemy jako JEDNĄ tabliczkę
 * z wierszami, na własnym ciemnym tle. Jeden zwarty prostokąt da się odsunąć
 * od plakietek; trzy latające napisy nie dały się.
 */
const pending = new WeakMap<
  Phaser.Scene,
  { layer: Phaser.GameObjects.Container; o: LabelOpts }[]
>();

export interface LabelOpts {
  x: number;
  y: number;
  text: string;
  color: string;
  /** Ikona przed napisem — zamiast systemowego emoji. */
  iconKey?: IconKey;
  size?: number;
}

/**
 * Zgłasza napis ulotny. Nie rysuje od razu: komunikaty z tego samego ciosu
 * padają w jednym wywołaniu sceny, więc czekamy jedną klatkę i dopiero wtedy
 * układamy je razem (patrz `pending`). Opóźnienie jest niezauważalne — napis
 * i tak wypływał dopiero po rozbłysku.
 */
export function floatLabel(
  scene: Phaser.Scene,
  layer: Phaser.GameObjects.Container,
  o: LabelOpts
) {
  const q = pending.get(scene);
  if (q) {
    q.push({ layer, o });
    return;
  }
  const fresh = [{ layer, o }];
  pending.set(scene, fresh);
  scene.time.delayedCall(0, () => {
    pending.delete(scene);
    flushLabels(scene, fresh);
  });
}

/** Jeden wiersz tabliczki: ikona plus tekst, wyśrodkowane w swojej szerokości. */
function labelRow(scene: Phaser.Scene, o: LabelOpts) {
  const size = o.size ?? 15;
  const label = scene.add.text(0, 0, o.text, display(size, o.color)).setOrigin(0, 0.5);
  const parts: Phaser.GameObjects.Image[] = [label as unknown as Phaser.GameObjects.Image];
  let w = label.width;
  if (o.iconKey) {
    const ic = scene.add
      .image(0, 0, o.iconKey)
      .setDisplaySize(size + 3, size + 3)
      .setOrigin(0, 0.5);
    label.setX(size + 6);
    w += size + 6;
    parts.push(ic);
  }
  parts.forEach((p) => p.setX(p.x - w / 2));
  // Tryb mieszania jawnie zwykły: w tej samej warstwie leżą iskry rysowane
  // addytywnie i bez tego napis potrafi przejąć ich tryb, przez co biel na
  // jasnej trawie robi się prawie niewidoczna.
  parts.forEach((p) => p.setBlendMode(Phaser.BlendModes.NORMAL));
  return { parts, w, h: size + 7 };
}

/**
 * Układa zebrane komunikaty w tabliczki — po jednej na punkt na planszy.
 * Grupujemy po pozycji, bo w jednej klatce potrafi paść komunikat przy celu
 * i przy atakującym; to dwa różne miejsca i nie wolno ich zlepić.
 */
function flushLabels(
  scene: Phaser.Scene,
  items: { layer: Phaser.GameObjects.Container; o: LabelOpts }[]
) {
  const groups: { layer: Phaser.GameObjects.Container; list: LabelOpts[]; x: number; y: number }[] =
    [];
  for (const it of items) {
    const g = groups.find(
      (k) => k.layer === it.layer && Math.abs(k.x - it.o.x) < 70 && Math.abs(k.y - it.o.y) < 70
    );
    if (g) {
      g.list.push(it.o);
      // Tabliczka czepia się najwyższego z komunikatów grupy, żeby rosła w dół
      // od stałego punktu, a nie skakała przy każdym dołożonym wierszu.
      g.y = Math.min(g.y, it.o.y);
    } else groups.push({ layer: it.layer, list: [it.o], x: it.o.x, y: it.o.y });
  }
  for (const g of groups) plate(scene, g.layer, g.x, g.y, g.list);
}

/** Ciemna kapsułka z wierszami komunikatów, wyskakująca i wypływająca w górę. */
function plate(
  scene: Phaser.Scene,
  layer: Phaser.GameObjects.Container,
  ax: number,
  ay: number,
  list: LabelOpts[]
) {
  const rows = list.map((o) => labelRow(scene, o));
  const padX = 10;
  const padY = 6;
  const gap = 2;
  const w = Math.max(...rows.map((r) => r.w)) + padX * 2;
  const h = rows.reduce((s, r) => s + r.h, 0) + gap * (rows.length - 1) + padY * 2;

  // Tło: ciemna kapsułka o wysokiej alfie. To ona odcina napis od plakietek
  // oddziału — sam kontur liter nie wystarczał, bo pod spodem leżały paski
  // życia i liczebność, czyli drobny, kontrastowy wzór.
  const bg = scene.add.graphics();
  bg.fillStyle(C.shadow, 0.8);
  bg.fillRoundedRect(-w / 2, -h / 2, w, h, 9);
  bg.lineStyle(2, C.white, 0.22);
  bg.strokeRoundedRect(-w / 2, -h / 2, w, h, 9);
  bg.setBlendMode(Phaser.BlendModes.NORMAL);

  const parts: Phaser.GameObjects.GameObject[] = [bg];
  let cy = -h / 2 + padY;
  for (const r of rows) {
    r.parts.forEach((p) => p.setY(p.y + cy + r.h / 2));
    parts.push(...r.parts);
    cy += r.h + gap;
  }

  const minY = BOARD_Y + h / 2 + 6;
  const maxY = BOARD_Y + BOARD_H - h / 2 - 6;
  const x = Phaser.Math.Clamp(ax, BOARD_X + w / 2 + 4, BOARD_X + BOARD_W - w / 2 - 4);
  // Tabliczka siada nad punktem zdarzenia, ale o własną wysokość wyżej: przy
  // wielowierszowej treści dolna krawędź inaczej wjeżdżałaby na plakietkę
  // stojącego niżej oddziału.
  const baseY = Phaser.Math.Clamp(ay - (h - 24) / 2, minY, maxY);

  // Szukanie wolnego miejsca. Nie „pierwsze, które nie koliduje" — przy
  // zatłoczonym rogu planszy takiego miejsca po prostu nie ma i trzeba wybrać
  // najmniej złe. Dlatego każdy kandydat dostaje karę i wygrywa najmniejsza.
  //
  // Kandydaci idą też w bok, nie tylko w pionie: cios w narożniku ma nad sobą
  // krawędź planszy i pod sobą sąsiada, więc jedyne wolne miejsce bywa obok.
  const busy = taken.get(scene) ?? [];
  taken.set(scene, busy);
  const units = obstacles.get(scene)?.() ?? [];
  const minX = BOARD_X + w / 2 + 4;
  const maxX = BOARD_X + BOARD_W - w / 2 - 4;
  const step = h + 4;

  const probe = new Phaser.Geom.Rectangle(0, 0, w, h);
  const overlap = (r: Phaser.Geom.Rectangle) => {
    const ox = Math.min(probe.right, r.right) - Math.max(probe.left, r.left);
    const oy = Math.min(probe.bottom, r.bottom) - Math.max(probe.top, r.top);
    return ox > 0 && oy > 0 ? ox * oy : 0;
  };

  let bestX = Phaser.Math.Clamp(x, minX, maxX);
  let bestY = Phaser.Math.Clamp(baseY, minY, maxY);
  let bestCost = Infinity;
  for (const dy of [-1, -2, 0, -3, 1, 2, 3, -4]) {
    for (const dx of [0, -0.75, 0.75, -1.4, 1.4]) {
      const cx = Phaser.Math.Clamp(x + dx * w, minX, maxX);
      const cy = Phaser.Math.Clamp(baseY + dy * step, minY, maxY);
      probe.setPosition(cx - w / 2, cy - h / 2);
      // Nachodzenie na inną tabliczkę jest gorsze niż na oddział: dwa napisy
      // na sobie są nie do przeczytania, napis na stworku tylko go zasłania.
      let cost = 0;
      for (const r of busy) cost += overlap(r) * 3;
      for (const r of units) cost += overlap(r);
      // Drobna kara za oddalenie od zdarzenia — przy równym koszcie tabliczka
      // ma zostać przy tym, kogo dotyczy, inaczej gracz nie wie, kto oberwał.
      cost += (Math.abs(cx - x) + Math.abs(cy - baseY) * 1.6) * 6;
      if (cost < bestCost) {
        bestCost = cost;
        bestX = cx;
        bestY = cy;
      }
      if (bestCost === 0) break;
    }
    if (bestCost === 0) break;
  }
  const x2 = bestX;
  const y = bestY;
  const box = new Phaser.Geom.Rectangle(x2 - w / 2, y - h / 2, w, h);
  busy.push(box);

  const cont = scene.add
    .container(x2, y, parts)
    .setScale(0.45)
    .setBlendMode(Phaser.BlendModes.NORMAL);
  layer.add(cont);

  // Sprężyste wejście i dopiero potem wypłynięcie: skok przyciąga wzrok
  // w chwili trafienia, powolne unoszenie daje czas na przeczytanie.
  scene.tweens.add({ targets: cont, scale: 1, duration: 170, ease: E.out });
  scene.tweens.add({
    targets: cont,
    y: y - 28,
    alpha: 0,
    delay: 260,
    duration: T.float,
    ease: 'Quad.easeOut',
    onComplete: () => {
      const i = busy.indexOf(box);
      if (i !== -1) busy.splice(i, 1);
      cont.destroy();
    },
  });
}

// ---------- zejście oddziału ----------

/**
 * Rozbłysk towarzyszący zejściu oddziału. Sama animacja stworka siedzi
 * w `unitView.playUnitDeath` (cudzy kawałek) — tutaj dokładamy to, czego jej
 * brakowało: mocne światło i czaszkę wyskakującą nad polem, żeby padnięcie
 * oddziału było widać z drugiego końca planszy.
 */
export function deathFlash(
  scene: Phaser.Scene,
  layer: Phaser.GameObjects.Container,
  x: number,
  y: number,
  color: number
) {
  // Zejście oddziału dostaje DOKŁADNIE ten sam rozwarstwiony stos światła co
  // trafienie. Po rundzie 2 był tu goły biały `glow` i to było widać: moment
  // najważniejszy dla gracza wyglądał taniej niż zwykły cios. Łuna jest tu
  // szersza i trwa dłużej niż przy trafieniu, bo padnięcie oddziału ma być
  // wydarzeniem, a nie kolejnym błyskiem.
  lightStack(scene, layer, x, y, color, 236, 1.05);

  ring(scene, layer, x, y, C.white, 5, 5, 460, 0);
  ring(scene, layer, x, y, warmEdge(color), 3, 6.5, 560, 90);

  // Wybuch iskier tym samym mechanizmem co przy trafieniu — emiter cząstek
  // gubił barwę i sypał samą bielą, a zejście oddziału ma nieść barwę strony.
  sparkSpray(scene, layer, x, y, color, 52, 168);

  // Czaszka jako pieczęć na zejściu — rysowana ikona, nie systemowe emoji.
  // Czaszka unosi się nad pole, ale nie wyżej niż górna krawędź planszy —
  // przy oddziale z pierwszego rzędu wyjeżdżała na pasek stanu tury.
  const top = Math.max(y - 44, BOARD_Y + 22);
  const skull = scene.add.image(x, y - 6, ICON.skull).setDisplaySize(10, 10);
  layer.add(skull);
  scene.tweens.add({
    targets: skull,
    displayWidth: 34,
    displayHeight: 34,
    y: top,
    duration: 340,
    ease: E.out,
  });
  scene.tweens.add({
    targets: skull,
    alpha: 0,
    y: top - 16,
    delay: 520,
    duration: 420,
    onComplete: () => skull.destroy(),
  });
}

// ---------- ekran końca bitwy ----------

/** Wstęga z wzorca: kapsułka z wciętymi końcami, ciemny kontur, błyk u góry. */
function ribbon(
  g: Phaser.GameObjects.Graphics,
  w: number,
  h: number,
  fill: number,
  deep: number
) {
  const tail = 26;
  const half = w / 2;
  // Ogony wstęgi rysujemy pod spodem, żeby wychodziły zza właściwego pasa.
  for (const dir of [-1, 1]) {
    g.fillStyle(deep, 1);
    g.beginPath();
    g.moveTo(dir * (half - 12), -h / 2 + 4);
    g.lineTo(dir * (half + tail), -h / 2 + 16);
    g.lineTo(dir * (half + tail - 14), 0);
    g.lineTo(dir * (half + tail), h / 2 - 16);
    g.lineTo(dir * (half - 12), h / 2 - 4);
    g.closePath();
    g.fillPath();
  }

  g.fillStyle(C.shadow, 0.95);
  g.fillRoundedRect(-half - 5, -h / 2 - 5, w + 10, h + 10, h / 2 + 5);
  g.fillStyle(deep, 1);
  g.fillRoundedRect(-half - 2, -h / 2 - 2, w + 4, h + 4, h / 2 + 2);
  g.fillStyle(fill, 1);
  g.fillRoundedRect(-half, -h / 2, w, h, h / 2);
  g.fillStyle(C.white, 0.3);
  g.fillRoundedRect(-half + 8, -h / 2 + 5, w - 16, h * 0.3, h * 0.15);
}

/**
 * Ekran zwycięstwa i porażki. Poprzednia wersja to był szary prostokąt
 * z napisem — po dwóch minutach bitwy gracz dostawał widok okna dialogowego.
 *
 * Wzorzec (rozbłysk ewolucji) mówi wprost, czego brakowało: promieniste
 * światło bijące od środka, obracające się powoli, pierścienie i deszcz iskier.
 * Napis siedzi na wstędze, tak jak logo POKÉTOON siedzi na swojej płytce —
 * słowo rzucone na tło zawsze wygląda na prowizorkę.
 *
 * Przy porażce zostaje ta sama konstrukcja, ale w chłodnej palecie i bez
 * iskier: przegrana ma być czytelnie inna, nie tylko innym słowem.
 */
export function showOutcomeScreen(
  scene: Phaser.Scene,
  layer: Phaser.GameObjects.Container,
  won: boolean,
  x: number,
  y: number,
  subtitle: string
) {
  const accent = won ? C.gold : C.foe;
  const deep = won ? C.goldDeep : C.foeDeep;
  // Światło ekranu końca ma osobną barwę od wstęgi. Przy porażce wstęga jest
  // czerwona, ale ŚWIATŁO musi być zimne i słabe — na czerwono-złotych
  // promieniach przegrana wyglądała jak druga wersja zwycięstwa.
  const light = won ? accent : C.skyBottom;

  const veil = scene.add
    .rectangle(scene.scale.width / 2, scene.scale.height / 2, scene.scale.width, scene.scale.height, C.shadow, 0)
    .setInteractive();
  layer.add(veil);
  scene.tweens.add({ targets: veil, fillAlpha: won ? 0.62 : 0.78, duration: T.fade });

  // Promienie: wachlarz wąskich klinów od środka. Obracają się bardzo powoli,
  // więc kadr żyje, ale nie odciąga wzroku od napisu.
  const rays = scene.add.graphics({ x, y }).setBlendMode(Phaser.BlendModes.ADD);
  const len = Math.max(scene.scale.width, scene.scale.height);
  for (let i = 0; i < 20; i++) {
    const a = Phaser.Math.DegToRad(i * 18);
    const spread = Phaser.Math.DegToRad(i % 2 === 0 ? 6.5 : 3);
    rays.fillStyle(light, (i % 2 === 0 ? 0.16 : 0.09) * (won ? 1 : 0.55));
    rays.beginPath();
    rays.moveTo(0, 0);
    rays.lineTo(Math.cos(a - spread) * len, Math.sin(a - spread) * len);
    rays.lineTo(Math.cos(a + spread) * len, Math.sin(a + spread) * len);
    rays.closePath();
    rays.fillPath();
  }
  rays.setScale(0.2).setAlpha(0);
  layer.add(rays);
  scene.tweens.add({ targets: rays, scale: 1, alpha: 1, duration: 520, ease: E.snap });
  scene.tweens.add({ targets: rays, angle: 360, duration: 60000, repeat: -1 });

  // Ciepła poświata w środku — to ona „zalewa kadr" jak we wzorcu.
  const glow = scene.add
    .image(x, y, FX.glow)
    .setTint(light)
    .setBlendMode(Phaser.BlendModes.ADD)
    .setScale(0.5)
    .setAlpha(0);
  layer.add(glow);
  // Poświata jest celowo przygaszona: przy pełnej sile zalewała środek na
  // biało i podpis pod wstęgą przestawał być czytelny.
  scene.tweens.add({
    targets: glow,
    scale: 4.2,
    alpha: won ? 0.42 : 0.2,
    duration: 620,
    ease: E.snap,
  });

  ring(scene, layer, x, y, C.white, 6, 14, 900, 120);
  ring(scene, layer, x, y, light, 4, 20, 1100, 300);

  // Wstęga z napisem.
  const g = scene.add.graphics();
  ribbon(g, 420, 74, accent, deep);
  const title = scene.add
    .text(0, 0, won ? 'ZWYCIĘSTWO!' : 'PORAŻKA', display(44, won ? H.white : H.white))
    .setOrigin(0.5);
  const plate = scene.add.container(x, y, [g, title]).setScale(0.2).setAngle(-6);
  layer.add(plate);
  scene.tweens.add({
    targets: plate,
    scale: 1,
    angle: 0,
    duration: 480,
    delay: 180,
    ease: E.out,
  });

  // Podpis na własnej ciemnej kapsułce — jasne tło rozbłysku zjadłoby sam
  // napis, choćby miał kontur.
  const sub = scene.add.text(0, 0, subtitle, display(16, H.goldLight)).setOrigin(0.5);
  const subBg = scene.add.graphics();
  subBg.fillStyle(C.shadow, 0.72);
  subBg.fillRoundedRect(-sub.width / 2 - 16, -17, sub.width + 32, 34, 17);
  const subBox = scene.add.container(x, y + 78, [subBg, sub]).setAlpha(0);
  layer.add(subBox);
  scene.tweens.add({ targets: subBox, alpha: 1, y: y + 72, duration: T.fade, delay: 620 });

  if (!won) return;

  // Deszcz iskier — sypie się przez chwilę po wygranej, potem gaśnie, żeby
  // ekran dało się spokojnie oglądać.
  const rain = scene.add.particles(0, 0, FX.twinkle, {
    x: { min: BOARD_X, max: BOARD_X + BOARD_W },
    y: BOARD_Y - 20,
    speedY: { min: 70, max: 220 },
    speedX: { min: -40, max: 40 },
    lifespan: 2600,
    scale: { start: 0.55, end: 0 },
    rotate: { start: 0, end: 120 },
    tint: [C.gold, C.goldLight, C.white],
    blendMode: Phaser.BlendModes.ADD,
    frequency: 40,
  });
  layer.add(rain);

  const burst = scene.add.particles(0, 0, FX.spark, {
    speed: { min: 120, max: 520 },
    lifespan: { min: 500, max: 1100 },
    scale: { start: 1.1, end: 0 },
    tint: [C.gold, C.goldLight, C.white],
    blendMode: Phaser.BlendModes.ADD,
    emitting: false,
  });
  layer.add(burst);
  burst.explode(60, x, y);
}
