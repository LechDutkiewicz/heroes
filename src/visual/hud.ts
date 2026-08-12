/**
 * Interfejs bitwy: nagłówek, pasek kolejki tur, panel oddziału, przyciski
 * i wiersz prognozy obrażeń.
 *
 * Powód wydzielenia jest ten sam co przy planszy i oddziałach: scena ma
 * prowadzić walkę, a nie układać kapsułki. Ten moduł nic nie wie o turach,
 * obrażeniach ani o zasięgach — dostaje gotowe napisy i liczby.
 *
 * Reguła nadrzędna, zdjęta z wzorca (karta trenera z Pokémon Masters EX):
 * panel to NIE ściana tekstu. To tabela, w której każdy wiersz ma własne
 * pasmo tła w innym odcieniu, etykietę dosuniętą do lewej i liczbę dosuniętą
 * do prawej. Oko skacze po prawej krawędzi i czyta same liczby — a to dla nich
 * gracz w ogóle otwiera panel.
 *
 * Druga reguła: język warstw jest ten sam co w `unitView.ts` — cień, ciemny
 * obrys rysowany jako WIĘKSZY wypełniony kształt (nie linia, bo linia 1,5 px
 * ginie), wypełnienie, gradient krojony na pasy i połysk w górnych ~36%.
 * Dzięki temu plakietka pod stworkiem i wiersz w panelu są rodzeństwem.
 */

import Phaser from 'phaser';
import { C, FONT, H, T, body, display } from './theme';
import { icon, miniIcon, type IconKey, type MiniKey } from './icons';

// ---------- barwy ----------

/** Mieszanie barw w locie — odcienie pasm wyprowadzamy z tokenów motywu. */
export function mix(a: number, b: number, t: number) {
  const chan = (shift: number) => {
    const av = (a >> shift) & 0xff;
    const bv = (b >> shift) & 0xff;
    return Math.round(av + (bv - av) * t) << shift;
  };
  return chan(16) | chan(8) | chan(0);
}

const hex = (v: number) => `#${v.toString(16).padStart(6, '0')}`;

// ---------- kształty ----------

/**
 * Wcięcie brzegu zaokrąglonego prostokąta na danej wysokości: promień minus
 * cięciwa okręgu narożnika. Potrzebne, bo gradient kroimy na poziome pasy,
 * a pas przy narożniku musi być węższy — inaczej wystaje poza kształt
 * kwadratowym rogiem.
 */
function insetOf(r: number, y: number, h: number) {
  if (r <= 0) return 0;
  const d = y < r ? r - y : y > h - r ? y - (h - r) : 0;
  return r - Math.sqrt(Math.max(0, r * r - d * d));
}

/**
 * Pionowy gradient na zaokrąglonym prostokącie. Graphics nie umie gradientu,
 * więc kroimy go na poziome pasy o rosnącej alfie. Pasy zachodzą na siebie
 * o 0,6 px — bez tego wygładzanie zostawia między nimi jasne szpary i kształt
 * wygląda na prążkowany.
 */
function gradientRect(
  g: Phaser.GameObjects.Graphics,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number,
  lightA: number,
  darkA: number
) {
  const steps = 10;
  for (let i = 0; i < steps; i++) {
    const t = (i + 0.5) / steps;
    const up = t < 0.5;
    const alpha = up ? lightA * (1 - t * 2) : darkA * (t - 0.5) * 2;
    if (alpha <= 0.004) continue;

    const y0 = (h * i) / steps;
    const y1 = Math.min(h, (h * (i + 1)) / steps + 0.6);
    const i0 = insetOf(r, y0, h);
    const i1 = insetOf(r, y1, h);

    g.fillStyle(up ? C.white : C.shadow, alpha);
    g.fillPoints(
      [
        new Phaser.Math.Vector2(x + i0, y + y0),
        new Phaser.Math.Vector2(x + w - i0, y + y0),
        new Phaser.Math.Vector2(x + w - i1, y + y1),
        new Phaser.Math.Vector2(x + i1, y + y1),
      ],
      true
    );
  }
}

export interface PlateOpts {
  light?: number;
  dark?: number;
  gloss?: number;
  /** Cień pod spodem; zerujemy, gdy kształt leży w innym kształcie. */
  drop?: number;
  edgeW?: number;
}

/**
 * Jedyny sposób, w jaki ten moduł rysuje cokolwiek wypełnionego. Współrzędne
 * podaje się jak w `fillRoundedRect` — lewy górny róg.
 */
export function plate(
  g: Phaser.GameObjects.Graphics,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number,
  fill: number,
  edge: number,
  o: PlateOpts = {}
) {
  const ew = o.edgeW ?? 2;
  const drop = o.drop ?? 3;

  if (drop > 0) {
    g.fillStyle(C.shadow, 0.34);
    g.fillRoundedRect(x - ew, y - ew + drop, w + ew * 2, h + ew * 2, r + ew);
  }
  if (ew > 0) {
    g.fillStyle(edge, 1);
    g.fillRoundedRect(x - ew, y - ew, w + ew * 2, h + ew * 2, r + ew);
  }
  g.fillStyle(fill, 1);
  g.fillRoundedRect(x, y, w, h, r);

  gradientRect(g, x, y, w, h, r, o.light ?? 0.3, o.dark ?? 0.26);

  const gloss = o.gloss ?? 0.26;
  if (gloss > 0) {
    // Połysk siedzi w górnych ~36% i jest węższy od kształtu, żeby czytał się
    // jak odbicie światła, a nie jak druga kapsułka w środku.
    const gh = h * 0.36;
    const gw = Math.max(2, w - r * 0.9);
    g.fillStyle(C.white, gloss);
    g.fillRoundedRect(x + (w - gw) / 2, y + 1.5, gw, gh, Math.min(gh / 2, r));
  }
}

/**
 * Pionowy gradient na literach. We wzorcu żaden napis nie jest płaską plamą —
 * góra liter jest jaśniejsza, dół schodzi w cieplejszy odcień i dopiero to daje
 * wrażenie grubego, fazowanego kroju z logo bajki. Trzeba wywołać po KAŻDEJ
 * zmianie treści, bo gradient liczy się z aktualnej wysokości tekstu.
 */
export function gradientText(t: Phaser.GameObjects.Text, top: string, bottom: string) {
  const grad = t.context.createLinearGradient(0, 0, 0, t.height);
  grad.addColorStop(0, top);
  grad.addColorStop(0.52, top);
  grad.addColorStop(1, bottom);
  t.setFill(grad);
}

// ---------- nagłówek ----------

/**
 * Tytuł gry jak logo bajki (wzorzec: napis POKÉTOON). Trzy warstwy liter jedna
 * na drugiej: najgrubszy ciemny kontur, cieńszy złoty kontur i właściwy napis
 * z gradientem od bieli do złota. Jeden `Text` z jednym obrysem daje płaską
 * naklejkę — dopiero podwójny kontur robi fazowanie.
 */
export function drawTitle(scene: Phaser.Scene, x: number, y: number, text: string, size = 26) {
  const layer = (stroke: number, thickness: number) =>
    scene.add
      .text(x, y, text, {
        fontFamily: FONT,
        fontSize: `${size}px`,
        fontStyle: 'bold',
        color: hex(C.goldLight),
        stroke: hex(stroke),
        strokeThickness: thickness,
      })
      .setOrigin(0, 0);

  const back = layer(C.shadow, size * 0.42);
  back.setShadow(0, 3, '#00000066', 6, true, true);
  layer(C.goldDeep, size * 0.2);

  const front = layer(C.shadow, 0);
  gradientText(front, hex(C.white), hex(C.gold));
  return front;
}

export interface ChipOpts {
  icon?: IconKey;
  color?: number;
  edge?: number;
  textColor?: string;
  size?: number;
  bold?: boolean;
}

/**
 * Kapsułka z napisem — buduje się wokół zmierzonej szerokości tekstu, więc
 * nazwy zamków różnej długości nie wymagają ręcznego dobierania szerokości.
 * Zwraca kontener zaczepiony w lewym środku, żeby chipy dało się układać
 * jeden za drugim.
 */
export function makeChip(scene: Phaser.Scene, x: number, y: number, text: string, o: ChipOpts = {}) {
  const size = o.size ?? 13;
  const label = scene.add
    .text(0, 0, text, { ...body(size, o.textColor ?? H.white), fontStyle: o.bold ? 'bold' : '' })
    .setOrigin(0, 0.5);

  const h = size + 12;
  const padL = o.icon ? h * 0.86 : 11;
  const w = padL + label.width + 11;
  label.setX(padL);

  const g = scene.add.graphics();
  plate(g, 0, -h / 2, w, h, h / 2, o.color ?? C.panelDeep, o.edge ?? C.shadow, {
    light: 0.28,
    dark: 0.26,
    gloss: 0.22,
    drop: 2,
  });

  const parts: Phaser.GameObjects.GameObject[] = [g, label];
  if (o.icon) parts.push(icon(scene, o.icon, h * 0.46, 0, size + 3));

  const container = scene.add.container(x, y, parts);
  return { container, width: w };
}

// ---------- pasek kolejki tur ----------

export interface QueueEntry {
  spriteKey: string;
  /** Barwa strony — plakietka od razu mówi, czyj to oddział. */
  accent: number;
  deep: number;
}

export interface TurnQueue {
  update(entries: QueueEntry[], round: number): void;
}

/**
 * Kolejka tur. Rząd małych, jednakowych kółek nie odpowiadał na pytanie
 * „kto idzie TERAZ" — trzeba było się domyślać z kolejności. Tutaj pierwszy
 * dostaje wyraźnie większą plakietkę w złotym pierścieniu i podpis „teraz",
 * a reszta stoi za nim w jednym, przygaszonym torze.
 *
 * Cały pasek jest dosunięty do prawej krawędzi planszy: rośnie w lewo, więc
 * przy wybitych oddziałach nie zostaje dziura po prawej.
 */
export function createTurnQueue(scene: Phaser.Scene, right: number, y: number): TurnQueue {
  const track = scene.add.graphics().setDepth(60);
  const holder = scene.add.container(0, 0).setDepth(61);
  let roundChip: Phaser.GameObjects.Container | undefined;

  const ACTIVE_D = 40;
  const REST_D = 28;
  const GAP = 6;

  const badge = (e: QueueEntry, cx: number, d: number, active: boolean) => {
    const g = scene.add.graphics();
    if (active) {
      // Poświata pod aktywnym — bez niej złoty pierścień ginie na ciemnym tle.
      for (let i = 3; i >= 1; i--) {
        g.fillStyle(C.gold, 0.1);
        g.fillCircle(cx, y, d / 2 + i * 4);
      }
    }
    plate(
      g,
      cx - d / 2,
      y - d / 2,
      d,
      d,
      d / 2,
      active ? C.gold : e.accent,
      active ? C.goldDeep : e.deep,
      { light: 0.34, dark: 0.3, gloss: 0.34, drop: active ? 3 : 2, edgeW: active ? 3 : 2 }
    );
    const face = scene.add.image(cx, y, e.spriteKey).setDisplaySize(d * 0.82, d * 0.82);
    if (!active) face.setAlpha(0.72);
    holder.add([g, face]);
  };

  return {
    update(entries, round) {
      holder.removeAll(true);
      track.clear();
      roundChip?.destroy();

      const rest = Math.min(entries.length - 1, 9);
      const width = ACTIVE_D + (rest > 0 ? rest * (REST_D + GAP) : 0);
      const left = right - width;

      // Tor pod plakietkami: jedna ciemna kapsułka, dzięki której rząd czyta
      // się jako jedna lista, a nie jako rozsypane kółka.
      const th = ACTIVE_D + 8;
      plate(track, left - 8, y - th / 2, width + 16, th, th / 2, mix(C.panelDeep, C.shadow, 0.45), C.shadow, {
        light: 0.1,
        dark: 0.22,
        gloss: 0.1,
        drop: 2,
      });

      if (entries.length > 0) badge(entries[0], left + ACTIVE_D / 2, ACTIVE_D, true);
      for (let i = 1; i <= rest; i++) {
        badge(entries[i], left + ACTIVE_D + (i - 0.5) * (REST_D + GAP), REST_D, false);
      }

      const chip = makeChip(scene, 0, y, `Runda ${round}`, {
        color: C.gold,
        edge: C.goldDeep,
        textColor: H.ink,
        bold: true,
        size: 12,
      });
      chip.container.setX(left - 16 - chip.width).setDepth(61);
      roundChip = chip.container;
    },
  };
}

// ---------- tabela statystyk ----------

export interface StatSlot {
  x: number;
  y: number;
  w: number;
  h: number;
  /** Stopień zebry: 0 jaśniejszy, 1 ciemniejszy. Liczy się z pozycji, nie z treści. */
  band?: 0 | 1;
  /** Wstęga na całą szerokość — inny element niż wiersz tabeli, nie łamie siatki. */
  ribbon?: boolean;
}

export interface StatRow {
  label: string;
  value: string;
  icon?: MiniKey;
  /**
   * Barwa treści — wchodzi TYLKO w znak, nigdy w tło pasma. Tło zostaje pod
   * wspólnym filtrem, więc panel czyta się jako jedna tabela.
   */
  mark?: number;
  /** Ostrzeżenie: liczba na czerwono i znak w przygaszonej czerwieni. */
  alert?: boolean;
}

/**
 * JEDEN FILTR NA WSZYSTKIE PASMA.
 *
 * Poprzednia wersja dobierała odcień pasma pod treść wiersza: życie zielone,
 * atak kremowy, ruch błękitny, słabość różowa. Zamiar był taki, żeby gracz
 * uczył się wierszy po barwie — skutek był taki, że panel wyglądał jak tęcza
 * i rozpadał się na osiem osobnych pasków. We wzorcu (karta trenera) pasma
 * statystyk chodzą przez jeden chłodny filtr o tej samej jasności; różnicę
 * między sąsiednimi wierszami robi sama zebra, nie znaczenie.
 */
const BAND_FILTER = C.skyTop;

/**
 * Stonowany znak: nigdy pełne nasycenie, zawsze ściągnięty w dół jasności.
 *
 * Sposób stonowania zależy od temperatury żywiołu i to jest sedno tej funkcji.
 * Baza `mix(ink, skyTop)` jest chłodna, a więc dla czerwieni i pomarańczy leży
 * po przeciwnej stronie koła barw — mieszanie z nią nie przygasza hue, tylko go
 * ODBARWIA i płomień wychodził murkowatym brązem. Dlatego ciepłe znaki
 * przyciemniamy samym cieniem: jasność spada tak samo, ale hue zostaje ogniem.
 * Zimne (woda, trawa, lód) mieszamy jak dawniej — tam baza jest sąsiadem hue
 * i nic nie brudzi.
 */
export function markTint(hue?: number, alert = false) {
  const base = mix(C.ink, C.skyTop, 0.3);
  if (alert) return mix(base, C.foeDeep, 0.55);
  if (hue === undefined) return base;

  const r = (hue >> 16) & 0xff;
  const b = hue & 0xff;
  if (r > b + 24) {
    // Ciepłe stonowanie w dwóch krokach, bo samo przyciemnienie pomarańczy
    // TEŻ daje brąz — brąz to po prostu ciemna pomarańcza o niskiej chromie.
    // Najpierw więc rozciągamy barwę od jej własnej szarości (chroma w górę),
    // a dopiero potem lekko ściemniamy do tej samej wagi optycznej, jaką mają
    // chłodne znaki obok (luma ≈ 120). Efekt: płomień zostaje ogniem.
    const g0 = (hue >> 8) & 0xff;
    const gray = 0.299 * r + 0.587 * g0 + 0.114 * b;
    const pump = (v: number) =>
      Math.max(0, Math.min(255, Math.round(gray + (v - gray) * 1.35)));
    const vivid = (pump(r) << 16) | (pump(g0) << 8) | pump(b);
    return mix(vivid, C.shadow, 0.18);
  }
  // 0,38 to granica, przy której barwa treści jeszcze jest rozpoznawalna,
  // ale znak nie zaczyna świecić mocniej niż sąsiednie. Przy 0,5 zielona
  // strzałka „Mocny przeciw" wyskakiwała z rzędu.
  return mix(base, hue, 0.38);
}

/**
 * TYPOGRAFIA PASMA — dlaczego napisy w tabeli nie mogą być gołym sansem.
 *
 * We wzorcu żaden napis nie leży płasko w tle: ma jasną otoczkę i cień pod
 * spodem, przez co siedzi NA paśmie jak naklejka. Bez tego różnicę między
 * etykietą a wartością robi wyłącznie pogrubienie i cała tabela jest szara.
 *
 * Tu otoczka jest BIAŁA, nie ciemna jak w logo: pasma są jasne, więc biel
 * odcina literę od tła, nie zamieniając panelu w jarmark z czarnymi konturami.
 * Hierarchia jest budowana trzema rzeczami naraz — stopniem pisma, głębią
 * atramentu i grubością otoczki — a nie samym boldem.
 */
function bandLabelStyle(): Phaser.Types.GameObjects.Text.TextStyle {
  return {
    ...body(13, H.inkSoft),
    stroke: H.white,
    strokeThickness: 2.5,
    shadow: { offsetX: 0, offsetY: 1, color: '#0a223033', blur: 2, fill: true },
  };
}

function bandValueStyle(): Phaser.Types.GameObjects.Text.TextStyle {
  return {
    ...body(15, H.ink),
    fontStyle: 'bold',
    stroke: H.white,
    strokeThickness: 3.5,
    shadow: { offsetX: 0, offsetY: 1.5, color: '#0a223055', blur: 3, fill: true },
  };
}

export interface StatTable {
  update(rows: (StatRow | null)[]): void;
}

/**
 * Tabela statystyk. Zamiast siedmiu linii tekstu z emoji — pasma, w których
 * etykieta stoi po lewej, a liczba po prawej, zawsze w tym samym miejscu.
 *
 * Obiekty tekstowe tworzymy RAZ i tylko podmieniamy treść. Kasowanie
 * i tworzenie ich na nowo przy każdym najechaniu myszą (a to dzieje się przy
 * każdym ruchu kursora nad oddziałem) zostawiało po sobie tysiące tekstur.
 */
export function createStatTable(
  scene: Phaser.Scene,
  slots: StatSlot[],
  /**
   * Gdy podany, wszystko ląduje w tym kontenerze i współrzędne slotów są
   * LOKALNE. Dzięki temu ta sama tabela raz stoi w dolnym panelu, a raz
   * w karcie oddziału, którą przesuwamy na drugą krawędź planszy.
   */
  parent?: Phaser.GameObjects.Container
): StatTable {
  const g = scene.add.graphics().setDepth(61);
  parent?.add(g);
  const labels: Phaser.GameObjects.Text[] = [];
  const values: Phaser.GameObjects.Text[] = [];
  const icons: (Phaser.GameObjects.Image | undefined)[] = [];

  for (const s of slots) {
    const label = scene.add.text(0, s.y + s.h / 2, '', bandLabelStyle()).setOrigin(0, 0.5).setDepth(62);
    const value = scene.add
      .text(s.x + s.w - 10, s.y + s.h / 2, '', bandValueStyle())
      .setOrigin(1, 0.5)
      .setDepth(62);
    parent?.add([label, value]);
    labels.push(label);
    values.push(value);
    icons.push(undefined);
  }

  return {
    update(rows) {
      g.clear();
      rows.forEach((row, i) => {
        const s = slots[i];
        if (!s) return;
        const label = labels[i];
        const value = values[i];

        icons[i]?.destroy();
        icons[i] = undefined;

        if (!row) {
          label.setText('');
          value.setText('');
          return;
        }

        // Tło wiersza NIE zależy od treści — tylko od miejsca w kolumnie
        // (zebra) i od tego, czy to wiersz tabeli, czy wstęga pod nią.
        //
        // STREFA POD TABELĄ. Pasmo pełnej szerokości łamie siatkę dwóch kolumn,
        // więc nie wolno mu udawać dziewiątego wiersza tabeli. Dostaje inną
        // GEOMETRIĘ, nie tylko inny odcień: węższe o 6 px z każdej strony,
        // niższe (stąd widoczna szpara pod tabelą) i zaokrąglone na kapsułkę.
        // Ten sam język dostaje pasek prognozy niżej, dzięki czemu dwa pełne
        // pasma czytają się jako jedna strefa podpisów, a nie jako dwa wyłomy.
        const rx = s.ribbon ? s.x + 6 : s.x;
        const rw = s.ribbon ? s.w - 12 : s.w;
        const ry = s.ribbon ? s.y + 3 : s.y;
        const rh = s.ribbon ? s.h - 5 : s.h;
        const fill = s.ribbon
          ? mix(C.panel, C.panelDeep, 0.26)
          : mix(C.panel, BAND_FILTER, s.band === 1 ? 0.17 : 0.07);
        const edge = s.ribbon
          ? mix(C.panelEdge, C.panelDeep, 0.45)
          : mix(C.panelEdge, BAND_FILTER, 0.32);
        plate(g, rx, ry, rw, rh, s.ribbon ? rh / 2 : s.h * 0.36, fill, edge, {
          // Wstęga jest wpuszczona (mało światła u góry, więcej cienia u dołu),
          // pasma tabeli wypukłe — to drugi sygnał, że to inna warstwa układu.
          light: s.ribbon ? 0.1 : 0.2,
          dark: s.ribbon ? 0.22 : 0.1,
          gloss: s.ribbon ? 0.1 : 0.16,
          drop: 0,
          edgeW: 1.5,
        });

        let textX = rx + 10;
        if (row.icon) {
          // Jeden moduł rozmiarowy dla całej kolumny znaków: ta sama średnica
          // niezależnie od kształtu, więc krawędź napisów też jest jedna.
          const d = rh - 6;
          icons[i] = miniIcon(
            scene,
            row.icon,
            rx + 9 + d / 2,
            ry + rh / 2,
            d,
            markTint(row.mark, row.alert)
          ).setDepth(62);
          parent?.add(icons[i]!);
          textX = rx + 11 + d + 5;
        }
        label
          .setX(textX)
          .setY(ry + rh / 2)
          .setText(row.label)
          // Wstęga jest ciemniejsza od pasm tabeli, więc przygaszony atrament
          // etykiety by na niej zniknął — tam etykieta idzie pełną głębią,
          // a różnicę do wartości nadal robi stopień pisma i otoczka.
          .setColor(s.ribbon ? H.ink : H.inkSoft);
        value
          .setScale(1)
          .setX(rx + rw - 10)
          .setY(ry + rh / 2)
          .setText(row.value)
          .setColor(row.alert ? hex(C.foeDeep) : H.ink);

        // Wartość musi się zmieścić w tym, co zostało po etykiecie. Wiersze
        // trafiają teraz do wąskiej karty oddziału, a nie w szeroki panel na
        // pół ekranu — bez tego „Umiejętność" wyjeżdżałaby poza pasmo.
        // Dwa progi: przy 0,72 etykieta ustępuje wartości, a dopiero potem
        // wartość wolno zjechać do 0,58. Odwrotna kolejność dawała mikroskopijny
        // napis obok wygodnie rozłożonej etykiety.
        const MIN_SCALE = 0.58;
        let avail = rx + rw - 10 - (textX + label.width + 8);
        if (value.width * 0.72 > avail) {
          // Nawet po zmniejszeniu wartość nie mieści się obok etykiety. Wtedy
          // etykieta ustępuje: w wierszu z umiejętnością („Uderz i wróć —
          // wraca na swoje pole…") to i tak sam znak niesie znaczenie, a napis
          // nachodzący na napis jest gorszy niż brak podpisu.
          label.setText('');
          avail = rx + rw - 10 - textX;
        }
        if (avail > 0 && value.width > avail) {
          value.setScale(Math.max(MIN_SCALE, avail / value.width));
        }
      });
    },
  };
}

// ---------- wiersz prognozy ----------

export interface Forecast {
  show(text: string, deadly: boolean): void;
  hide(): void;
}

/**
 * Prognoza obrażeń. To jedyna liczba, którą gracz czyta W TRAKCIE celowania,
 * więc nie może być kolejnym wierszem w tabeli — siedzi w osobnej, złotej
 * kapsułce pod tabelą i pojawia się z krótkim podskokiem, żeby oko ją złapało.
 *
 * Gdy cios wybija cały oddział, kapsułka robi się czerwona: to inna decyzja
 * niż zwykłe draśnięcie i ma wyglądać inaczej.
 */
export function createForecast(
  scene: Phaser.Scene,
  x: number,
  y: number,
  w: number,
  h: number,
  iconKey: MiniKey,
  hint: string
): Forecast {
  const g = scene.add.graphics().setDepth(61);
  // Znak z tego samego kompletu co tabela — prognoza to część panelu, nie
  // wtręt z planszy. Barwę podmieniamy razem z tłem kapsułki.
  const mark = miniIcon(scene, iconKey, x + 10 + (h - 8) / 2, y + h / 2, h - 10, markTint()).setDepth(62);
  const text = scene.add
    .text(x + 14 + (h - 8), y + h / 2, '', { ...body(15, H.white), fontStyle: 'bold' })
    .setOrigin(0, 0.5)
    .setDepth(62);

  /**
   * Prognoza siedzi teraz w wąskim pasku na dole, obok przycisków, a nie na
   * całą szerokość panelu. Najdłuższe zdanie („Atak 8 × 6 × 1.5 (przewaga
   * typu) = 72 obrażenia — cały oddział Charizard padnie") jest dłuższe niż
   * kapsułka, więc zamiast pozwolić mu wyjechać na przyciski, zmniejszamy
   * stopień pisma. Skracanie z wielokropkiem ucinałoby końcówkę, a to właśnie
   * ona mówi, czy cios wybija oddział.
   */
  const maxTextW = w - (14 + (h - 8)) - 12;
  const fit = () => {
    text.setScale(1);
    if (text.width > maxTextW) text.setScale(Math.max(0.6, maxTextW / text.width));
  };

  /** -1 = stan spoczynku, 0 = zwykły cios, 1 = cios wybijający cały oddział. */
  let mode = -2;

  const paint = (next: number) => {
    if (mode === next) return;
    mode = next;
    g.clear();
    // Spoczynek trzyma dokładnie ten sam odcień i obrys co wstęga umiejętności
    // nad nim — dwa pełnoszerokie pasma mają być jedną strefą pod tabelą.
    const fill = next === 1 ? C.foe : next === 0 ? C.gold : mix(C.panel, C.panelDeep, 0.26);
    const edge =
      next === 1 ? C.foeDeep : next === 0 ? C.goldDeep : mix(C.panelEdge, C.panelDeep, 0.45);
    plate(g, x, y, w, h, h / 2, fill, edge, {
      light: next < 0 ? 0.14 : 0.36,
      dark: next < 0 ? 0.14 : 0.3,
      gloss: next < 0 ? 0.1 : 0.3,
      drop: next < 0 ? 0 : 3,
      edgeW: next < 0 ? 1.5 : 2,
    });
  };

  const rest = () => {
    // W spoczynku pasek nie znika, tylko gaśnie i podpowiada, skąd wziąć
    // prognozę. Puste miejsce w panelu wyglądało jak niedokończony układ,
    // a przy okazji nikt nie wiedział, że prognoza w ogóle istnieje.
    paint(-1);
    mark.setAlpha(0.7).setTint(markTint());
    // Podpowiedź też dostaje białą otoczkę — inaczej jedyny napis w panelu bez
    // niej wygląda jak wklejony z innego interfejsu.
    text
      .setText(hint)
      .setColor(H.inkSoft)
      .setAlpha(0.95)
      .setStroke(H.white, 2.5)
      .setShadow(0, 1, '#0a223033', 2, false, true);
    fit();
  };

  rest();

  return {
    show(value, deadly) {
      paint(deadly ? 1 : 0);
      mark.setAlpha(1).setTint(deadly ? C.white : C.ink);
      text.setText(value).setAlpha(1).setColor(deadly ? H.white : H.ink);
      // Na gorących tłach otoczka jest ciemna, na złocie biała — zawsze
      // przeciwna do tła, bo o to w konturze chodzi.
      text.setStroke(deadly ? hex(C.foeDeep) : H.white, 3.5);
      text.setShadow(0, 1.5, deadly ? '#0a223077' : '#0a223055', 3, false, true);
      fit();
    },
    hide: rest,
  };
}

// ---------- przyciski ----------

export interface HudButton {
  setLabel(text: string): void;
  setEnabled(enabled: boolean): void;
  setVisible(visible: boolean): void;
}

/**
 * Przycisk-kapsułka jak przyciski ruchów we wzorcu. Trzy stany rysujemy
 * z góry do trzech obrazków i przełączamy widocznością zamiast przerysowywać
 * Graphics przy każdym najechaniu — przerysowanie kasuje i buduje geometrię,
 * a to przy ruchu kursora widać jako mignięcie.
 *
 * Stan wyłączony jest wyraźnie inny (szarość, brak połysku, kursor bez
 * wskazania), bo „Czekaj" bywa niedostępny i gracz musi to widzieć, zanim
 * kliknie.
 */
export function makeHudButton(
  scene: Phaser.Scene,
  opts: {
    x: number;
    y: number;
    w: number;
    h: number;
    icon: IconKey;
    tone: number;
    toneDeep: number;
    onClick: () => void;
    /** Głębokość kontenera. Domyślnie 62 — nad panelem HUD, pod efektami. */
    depth?: number;
  }
): HudButton {
  const { w, h } = opts;
  const r = h / 2;

  const skin = (fill: number, edge: number, gloss: number, dim: number) => {
    const g = scene.add.graphics();
    plate(g, -w / 2, -h / 2, w, h, r, fill, edge, { light: 0.34, dark: 0.3, gloss, drop: 3 });
    if (dim > 0) {
      g.fillStyle(C.shadow, dim);
      g.fillRoundedRect(-w / 2, -h / 2, w, h, r);
    }
    return g;
  };

  const normal = skin(opts.tone, opts.toneDeep, 0.28, 0);
  const hover = skin(mix(opts.tone, C.white, 0.22), opts.toneDeep, 0.4, 0);
  const off = skin(mix(opts.tone, C.inkSoft, 0.72), mix(opts.toneDeep, C.shadow, 0.4), 0.08, 0.15);

  const mark = icon(scene, opts.icon, -w / 2 + 8 + (h - 14) / 2, 0, h - 14);
  const label = scene.add
    .text(6, 0, '', { ...display(15), strokeThickness: 3.5 })
    .setOrigin(0.5);

  const zone = scene.add.zone(0, 0, w, h).setInteractive({ useHandCursor: true });
  const container = scene.add.container(opts.x, opts.y, [normal, hover, off, mark, label, zone]);
  container.setDepth(opts.depth ?? 62);

  let enabled = true;
  let over = false;

  const paint = () => {
    normal.setVisible(enabled && !over);
    hover.setVisible(enabled && over);
    off.setVisible(!enabled);
    mark.setAlpha(enabled ? 1 : 0.5);
    label.setAlpha(enabled ? 1 : 0.6);
    gradientText(label, enabled ? H.white : H.panelEdge, enabled ? H.panelEdge : H.inkSoft);
  };

  zone.on('pointerover', () => {
    over = true;
    paint();
    if (enabled) scene.tweens.add({ targets: container, y: opts.y - 2, duration: 90 });
  });
  zone.on('pointerout', () => {
    over = false;
    paint();
    scene.tweens.add({ targets: container, y: opts.y, duration: 90 });
  });
  zone.on('pointerdown', () => {
    if (!enabled) return;
    // Krótkie wciśnięcie: bez niego kliknięcie nie daje żadnej odpowiedzi
    // zwrotnej i gracz klika drugi raz.
    scene.tweens.add({ targets: container, scaleX: 0.96, scaleY: 0.9, duration: 70, yoyo: true });
    opts.onClick();
  });

  paint();

  return {
    setLabel(text) {
      label.setText(text);
      // Napis wyśrodkowany w polu POZA ikoną, inaczej przy ikonie po lewej
      // wygląda na przesunięty w prawo.
      label.setX((h - 14) / 2 + 4);
      paint();
    },
    setEnabled(v) {
      enabled = v;
      if (v) zone.setInteractive({ useHandCursor: true });
      else zone.disableInteractive();
      paint();
    },
    setVisible(v) {
      container.setVisible(v);
    },
  };
}

// ---------- tło panelu ----------

/**
 * Kadłub dolnego panelu i jego wewnętrzne pole. Dwie warstwy, tak jak karta
 * we wzorcu: jaśniejsza ramka i wpuszczone w nią mleczne pole, na którym leżą
 * pasma. Bez wpuszczenia pasma wyglądają, jakby pływały na tle.
 */
export function drawPanelBody(
  scene: Phaser.Scene,
  x: number,
  y: number,
  w: number,
  h: number,
  inset: number,
  parent?: Phaser.GameObjects.Container
) {
  const g = scene.add.graphics().setDepth(60);
  parent?.add(g);
  plate(g, x, y, w, h, 18, C.panel, C.panelDeep, {
    light: 0.22,
    dark: 0.2,
    gloss: 0.2,
    drop: 4,
    edgeW: 3,
  });
  // Wpuszczone pole: ciemniejszy ślad u góry robi wrażenie zagłębienia.
  g.fillStyle(mix(C.panel, C.panelDeep, 0.28), 1);
  g.fillRoundedRect(x + inset, y + inset, w - inset * 2, h - inset * 2, 12);
  g.fillStyle(C.shadow, 0.1);
  g.fillRoundedRect(x + inset, y + inset, w - inset * 2, 8, { tl: 12, tr: 12, bl: 0, br: 0 });
  return g;
}

/** Krótkie mrugnięcie panelu przy zmianie oddziału — sygnał „to już inny". */
export function blinkPanel(scene: Phaser.Scene, target: Phaser.GameObjects.GameObject) {
  scene.tweens.add({
    targets: target,
    alpha: { from: 0.72, to: 1 },
    duration: T.pop,
    ease: 'Quad.easeOut',
  });
}
