/**
 * Mgła wojny mapy przygody — sama arytmetyka pikseli, bez Phasera.
 *
 * Dawniej mgła była płótnem 4 piksele na pole, w którym każde nieodkryte pole
 * zalewano kwadratem. Filtrowanie przy powiększeniu rozmywało tylko krawędź
 * kwadratów, więc granica i tak szła schodkami po siatce pól — oko widziało
 * kratkę, a nie teren znikający w ciemności jak w Heroes 3.
 *
 * Teraz dla każdego teksela liczymy POKRYCIE: jaka część gaussowskiego
 * otoczenia punktu leży na nieodkrytych polach. To jest rozmyta (σ ≈ ⅓ pola)
 * maska mgły, ale policzona dokładnie i rozdzielnie z dystrybuanty rozkładu
 * normalnego, a nie filtrem obrazka. Brzeg mgły to poziomica tego pokrycia
 * z progiem zaburzonym szumem: proste odcinki zostają proste, narożniki
 * — wypukłe i wklęsłe — się zaokrąglają, schodki po przekątnej zlewają się
 * w falę, a szum dokłada postrzępienie, które nie powtarza się co pole.
 * Za brzegiem, po stronie odkrytej, leży półcień gasnący na ~pół pola.
 *
 * Zasada gry jest nienaruszalna: teksel na nieodkrytym polu ma zawsze pełne
 * krycie, a także pierwszy rząd tekseli pola odkrytego przy nieodkrytym —
 * żeby filtrowanie przy powiększeniu nie rozrzedziło narożnika pola, na którym
 * gracza nie było. Całe przejście leży po stronie pól odkrytych.
 *
 * Koszt: przerysowujemy tylko prostokąt pól, które zmieniły stan od
 * poprzedniego malowania (plus jedno pole zapasu, bo teksel zależy od
 * sąsiadów). Pola z jednolitym otoczeniem wypełniamy stałą bez liczenia.
 */

/** Ile tekseli płótna mgły przypada na bok pola. */
export const MGLA_GESTOSC = 12;
/** Barwa mgły: granatowa czerń, żeby półcień nie szarzał terenu. */
const BARWA: readonly [number, number, number] = [7, 9, 19];
/** Rozmycie maski pokrycia, w polach. */
const SIGMA = 0.38;
/** Pokrycie, przy którym zaczyna się pełna mgła (bez szumu). */
const PROG = 0.24;
/** Jak daleko szum przesuwa próg — to jest postrzępienie brzegu. */
const POSZARPANIE = 0.15;
/** Szerokość miękkiego przejścia na samym brzegu, w jednostkach pokrycia. */
const MIEKKOSC = 0.025;
/** Krycie półcienia tuż za brzegiem; dalej gaśnie do zera. */
const POLCIEN = 0.6;

/** Dystrybuanta rozkładu normalnego (Abramowitz–Stegun 7.1.26, błąd < 2e-7). */
function fi(x: number): number {
  const z = Math.abs(x) / Math.SQRT2;
  const t = 1 / (1 + 0.3275911 * z);
  const erf =
    1 -
    ((((1.061405429 * t - 1.453152027) * t + 1.421413741) * t - 0.284496736) * t + 0.254829592) *
      t *
      Math.exp(-z * z);
  return x >= 0 ? 0.5 * (1 + erf) : 0.5 * (1 - erf);
}

/**
 * Wagi sąsiadów -1, 0, +1 dla teksela o danym indeksie w polu: jaka część
 * jednowymiarowego gaussa o środku w tekselu wypada na każde z trzech pól.
 * Przy σ = 0,3 pola dalsze pola dokładają mniej niż promil.
 */
const WAGI: Float32Array = (() => {
  const w = new Float32Array(MGLA_GESTOSC * 3);
  for (let s = 0; s < MGLA_GESTOSC; s++) {
    const u = (s + 0.5) / MGLA_GESTOSC;
    for (let k = -1; k <= 1; k++) {
      w[s * 3 + k + 1] = fi((k + 1 - u) / SIGMA) - fi((k - u) / SIGMA);
    }
  }
  return w;
})();

function hasz(x: number, y: number): number {
  let h = Math.imul(x, 374761393) + Math.imul(y, 668265263);
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  h ^= h >>> 16;
  return (h & 0xffff) / 0xffff;
}

/** Szum wartości na kracie, gładko interpolowany; wynik 0..1. */
function szum(x: number, y: number): number {
  const xi = Math.floor(x);
  const yi = Math.floor(y);
  let fx = x - xi;
  let fy = y - yi;
  fx = fx * fx * (3 - 2 * fx);
  fy = fy * fy * (3 - 2 * fy);
  const a = hasz(xi, yi);
  const b = hasz(xi + 1, yi);
  const c = hasz(xi, yi + 1);
  const d = hasz(xi + 1, yi + 1);
  return a + (b - a) * fx + (c - a) * fy + (a - b - c + d) * fx * fy;
}

/**
 * Szum brzegu w punkcie planszy (w polach), -1..1. Trzy oktawy: fala na
 * długości pola rozbija rytm siatki, drobniejsze dają poszarpanie.
 */
function szumBrzegu(x: number, y: number): number {
  const n =
    0.45 * szum(x * 1.1, y * 1.1) +
    0.33 * szum(x * 2.9 + 17.3, y * 2.9 + 5.1) +
    0.22 * szum(x * 7.1 + 41.7, y * 7.1 + 29.9);
  return n * 2 - 1;
}

function gladko(a: number, b: number, x: number): number {
  const t = Math.min(1, Math.max(0, (x - a) / (b - a)));
  return t * t * (3 - 2 * t);
}

export interface ObrazMgly {
  readonly width: number;
  readonly height: number;
  readonly data: Uint8ClampedArray;
}

export interface ProstokatMgly {
  x: number;
  y: number;
  w: number;
  h: number;
}

/**
 * Pamięta, jak wyglądała plansza przy poprzednim malowaniu, i przerysowuje
 * tylko to, co się od tamtej pory zmieniło.
 */
export class MalarzMgly {
  private readonly szer: number;
  private readonly wys: number;
  /** 1 = pole nieodkryte, stan z ostatniego malowania; `null` — nic jeszcze nie malowano. */
  private poprzednie: Uint8Array | null = null;
  private readonly mgla: Uint8Array;

  constructor(szer: number, wys: number) {
    this.szer = szer;
    this.wys = wys;
    this.mgla = new Uint8Array(szer * wys);
  }

  /**
   * Maluje mgłę do `obraz` (szer·G × wys·G). Zwraca prostokąt w tekselach,
   * który się zmienił, albo `null`, gdy nic się nie zmieniło.
   */
  maluj(odkryte: ReadonlyArray<ReadonlyArray<boolean | number>>, obraz: ObrazMgly): ProstokatMgly | null {
    const { szer, wys, mgla } = this;
    let x0 = szer;
    let y0 = wys;
    let x1 = -1;
    let y1 = -1;
    const stare = this.poprzednie;
    for (let y = 0; y < wys; y++) {
      const wiersz = odkryte[y];
      for (let x = 0; x < szer; x++) {
        const m = wiersz && wiersz[x] ? 0 : 1;
        const i = y * szer + x;
        mgla[i] = m;
        if (!stare || stare[i] !== m) {
          if (x < x0) x0 = x;
          if (x > x1) x1 = x;
          if (y < y0) y0 = y;
          if (y > y1) y1 = y;
        }
      }
    }
    if (x1 < 0) return null;
    // Teksel zależy od pól sąsiednich, więc zmiana pola rusza też obwódkę.
    x0 = Math.max(0, x0 - 1);
    y0 = Math.max(0, y0 - 1);
    x1 = Math.min(szer - 1, x1 + 1);
    y1 = Math.min(wys - 1, y1 + 1);
    for (let y = y0; y <= y1; y++) {
      for (let x = x0; x <= x1; x++) this.malujPole(x, y, obraz);
    }
    this.poprzednie = Uint8Array.from(mgla);
    const G = MGLA_GESTOSC;
    return { x: x0 * G, y: y0 * G, w: (x1 - x0 + 1) * G, h: (y1 - y0 + 1) * G };
  }

  private jestMgla(x: number, y: number): number {
    // Poza planszą przedłużamy skrajne pole, żeby brzeg planszy nie udawał
    // granicy mgły.
    const cx = x < 0 ? 0 : x >= this.szer ? this.szer - 1 : x;
    const cy = y < 0 ? 0 : y >= this.wys ? this.wys - 1 : y;
    return this.mgla[cy * this.szer + cx];
  }

  private malujPole(px: number, py: number, obraz: ObrazMgly) {
    const G = MGLA_GESTOSC;
    const d = obraz.data;
    const W = obraz.width;
    const [r, g, b] = BARWA;
    const wlasna = this.jestMgla(px, py);

    // Otoczenie 3 × 3: n[j*3+i] dla przesunięć (i-1, j-1).
    const n = [0, 0, 0, 0, 0, 0, 0, 0, 0];
    let suma = 0;
    for (let j = 0; j < 3; j++) {
      for (let i = 0; i < 3; i++) {
        const v = this.jestMgla(px + i - 1, py + j - 1);
        n[j * 3 + i] = v;
        suma += v;
      }
    }

    // Pole nieodkryte zawsze kryje w całości; odkryte bez mgły wokół — puste.
    if (wlasna || suma === 0) {
      const a = wlasna ? 255 : 0;
      for (let sy = 0; sy < G; sy++) {
        let o = ((py * G + sy) * W + px * G) * 4;
        for (let sx = 0; sx < G; sx++, o += 4) {
          d[o] = r;
          d[o + 1] = g;
          d[o + 2] = b;
          d[o + 3] = a;
        }
      }
      return;
    }

    for (let sy = 0; sy < G; sy++) {
      const wy0 = WAGI[sy * 3];
      const wy1 = WAGI[sy * 3 + 1];
      const wy2 = WAGI[sy * 3 + 2];
      // Pierwszy i ostatni rząd tekseli pola: który sąsiad w pionie przylega.
      const bokY = sy === 0 ? 0 : sy === G - 1 ? 2 : -1;
      let o = ((py * G + sy) * W + px * G) * 4;
      for (let sx = 0; sx < G; sx++, o += 4) {
        const wx0 = WAGI[sx * 3];
        const wx1 = WAGI[sx * 3 + 1];
        const wx2 = WAGI[sx * 3 + 2];
        const pokrycie =
          wy0 * (wx0 * n[0] + wx1 * n[1] + wx2 * n[2]) +
          wy1 * (wx0 * n[3] + wx1 * n[4] + wx2 * n[5]) +
          wy2 * (wx0 * n[6] + wx1 * n[7] + wx2 * n[8]);

        let alfa: number;
        const bokX = sx === 0 ? 0 : sx === G - 1 ? 2 : -1;
        if (
          (bokX >= 0 && n[3 + bokX]) ||
          (bokY >= 0 && n[bokY * 3 + 1]) ||
          (bokX >= 0 && bokY >= 0 && n[bokY * 3 + bokX])
        ) {
          // Teksel przylega do pola nieodkrytego. Pełne krycie, inaczej
          // filtrowanie przy powiększeniu uśredni go z narożnikiem pola
          // nieodkrytego i ten narożnik zacznie prześwitywać.
          alfa = 1;
        } else {
          const wx = px + (sx + 0.5) / G;
          const wy = py + (sy + 0.5) / G;
          const prog = PROG + POSZARPANIE * szumBrzegu(wx, wy);
          const rdzen = gladko(prog - MIEKKOSC, prog + MIEKKOSC, pokrycie);
          const cien = POLCIEN * gladko(0.02, prog, pokrycie);
          alfa = rdzen > cien ? rdzen : cien;
        }
        d[o] = r;
        d[o + 1] = g;
        d[o + 2] = b;
        d[o + 3] = Math.round(alfa * 255);
      }
    }
  }
}
