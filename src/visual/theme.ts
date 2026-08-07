/**
 * Tokeny wizualne — jedno miejsce, z którego cała bitwa bierze barwy, kroje
 * i tempo animacji.
 *
 * Wartości są zdjęte z wzorca: ekranów Pokémon Masters EX (siatka Sync Grid,
 * karta trenera, rozbłysk ewolucji). Stamtąd bierze się kilka reguł, które
 * odróżniają grafikę „bajkową" od zwykłego interfejsu:
 *
 *  - Nic nie jest czysto prostokątne. Każdy panel ma zaokrąglone rogi, a
 *    przyciski są kapsułkami.
 *  - Napisy mają biały kontur i cień, nie leżą płasko na tle.
 *  - Obrysy są podwójne: szeroki i przygaszony robi poświatę, cienki daje brzeg.
 *  - Paleta jest jasna i nasycona. Ciemne granatowe tło z poprzedniej wersji
 *    ściągało całość w stronę ponurej strategii, a nie bajki.
 *  - Ikony rysujemy sami. Systemowe emoji wyglądają inaczej na każdym
 *    urządzeniu i od razu zdradzają, że to prowizorka.
 */

/** Barwy interfejsu. */
export const C = {
  /** Głębia za planszą — chłodny błękit, nie granat. */
  skyTop: 0x6fd3e8,
  skyBottom: 0x2a8fc4,
  /** Panele: mleczna biel z lekkim chłodem, jak karty w Masters. */
  panel: 0xf2fbff,
  panelEdge: 0xbfe3f2,
  panelDeep: 0x1d5f80,
  /** Złoto — nagłówki, aktywny oddział, zwycięstwo. */
  gold: 0xffc93c,
  goldLight: 0xfff0b8,
  goldDeep: 0xd99a12,
  /** Strona gracza i strona przeciwnika. */
  ally: 0x35b6ef,
  allyDeep: 0x1268a0,
  foe: 0xff6b6b,
  foeDeep: 0xb32d3f,
  /** Pasek życia — trzy progi, jak w bajce: zielony, bursztyn, czerwień. */
  hpHigh: 0x5fd45f,
  hpMid: 0xffc93c,
  hpLow: 0xff5e5e,
  hpTrack: 0x123449,
  /** Tekst. */
  ink: 0x123449,
  inkSoft: 0x4a7690,
  white: 0xffffff,
  shadow: 0x0a2230,
} as const;

/** Ten sam zestaw w zapisie dla stylów tekstu, gdzie Phaser chce łańcucha. */
export const H = Object.fromEntries(
  Object.entries(C).map(([k, v]) => [k, `#${v.toString(16).padStart(6, '0')}`])
) as Record<keyof typeof C, string>;

/**
 * Krój. Trebuchet ma zaokrąglone, przyjazne litery i jest wszędzie — bez
 * dociągania pliku z sieci, co przy grze offline byłoby ryzykiem.
 */
export const FONT = 'Trebuchet MS, Verdana, sans-serif';

/**
 * Napis „bajkowy": biel z grubym ciemnym konturem i cieniem pod spodem.
 * Czyta się na każdym tle, także na jasnej trawie i na śniegu.
 */
export function display(size: number, color: string = H.white, stroke = C.shadow) {
  return {
    fontFamily: FONT,
    fontSize: `${size}px`,
    color,
    fontStyle: 'bold',
    stroke: `#${stroke.toString(16).padStart(6, '0')}`,
    strokeThickness: Math.max(3, Math.round(size / 4)),
    shadow: { offsetX: 0, offsetY: 2, color: '#00000055', blur: 4, fill: true },
  } as Phaser.Types.GameObjects.Text.TextStyle;
}

/** Napis w panelu — bez konturu, bo leży na spokojnym jasnym tle. */
export function body(size: number, color: string = H.ink) {
  return {
    fontFamily: FONT,
    fontSize: `${size}px`,
    color,
    lineSpacing: 4,
  } as Phaser.Types.GameObjects.Text.TextStyle;
}

/** Tempo. Krótkie animacje trzymają walkę w ruchu, długie ją zamulają. */
export const T = {
  hop: 190,
  lunge: 130,
  recover: 160,
  shot: 300,
  pop: 220,
  fade: 320,
  float: 900,
  /** Oddech w spoczynku — powolny, żeby nie migotało. */
  breath: 1800,
} as const;

/** Wygładzenia. Sprężyste wejścia, miękkie wyjścia — jak w bajce. */
export const E = {
  in: 'Back.easeIn',
  out: 'Back.easeOut',
  soft: 'Sine.easeInOut',
  snap: 'Quad.easeOut',
  drop: 'Bounce.easeOut',
} as const;

/** Kolejność warstw. Trzymana w jednym miejscu, żeby nic się nie chowało. */
export const Z = {
  sky: 0,
  board: 1,
  grid: 2,
  preview: 4,
  highlight: 5,
  approach: 6,
  /** Oddziały i przeszkody dostają depth = units + rząd, stąd zapas. */
  units: 10,
  hud: 60,
  effects: 100,
  overlay: 200,
} as const;
