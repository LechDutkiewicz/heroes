/**
 * Klocki terenu — las i skały ułożone z gotowych bloków, jak w Heroes 3.
 *
 * Mapa świata w stylu Pokémon (zgłoszenie gracza: „brakuje systemu, który
 * w Heroes 3 zrobił, że elementy mapy przygody to klocki, które dobrze się
 * łączą"). Dotąd las i skały były dużymi malowanymi kępami, większymi niż
 * pola, które naprawdę blokują: wylewały się na trawę, rzekę i most, a obiekty
 * stojące na zwykłej trawie wyglądały, jakby stały na drzewach.
 *
 * Teraz każde pole lasu i skał należy do dokładnie jednego klocka o stałym
 * obrysie (szerokość × głębokość w polach). Obrysy z danych obiektów HoMM3
 * (homm3tools, `def_bodies`): góra 3×2 albo 5×3, skała 1×1 i 2×1, drzewo
 * 1×1, kępy drzew 2×1, 2×2, 3×2 i 3×3. Spód rysunku klocka stoi dokładnie
 * na jego polach; nad nimi rysunek może wystawać tylko do tyłu (na północ),
 * tak jak drzewa i góry w Heroes.
 *
 * Układanie jest czystą funkcją terenu i ziarna — ta sama plansza daje zawsze
 * te same klocki (scena, sondy i podgląd widzą to samo).
 */
import type { Teren } from './mapa';

export type TerenKlocka = 'las' | 'skaly';

export interface RodzajKlocka {
  /** Nazwa pliku w `public/mapa/klocki/<zestaw>/<nazwa>.png`. */
  nazwa: string;
  /** Szerokość obrysu w polach. */
  szer: number;
  /** Głębokość obrysu w polach (ile rzędów zajmuje). */
  glab: number;
}

/**
 * Rodzaje klocków od największego. Dwa warianty 1×1 lasu, żeby pojedyncze
 * drzewa na skraju nie były klonami.
 */
export const KLOCKI: Record<TerenKlocka, readonly RodzajKlocka[]> = {
  las: [
    { nazwa: 'las-3x3', szer: 3, glab: 3 },
    { nazwa: 'las-3x2', szer: 3, glab: 2 },
    { nazwa: 'las-2x2', szer: 2, glab: 2 },
    { nazwa: 'las-2x1', szer: 2, glab: 1 },
    { nazwa: 'las-1x1-a', szer: 1, glab: 1 },
    { nazwa: 'las-1x1-b', szer: 1, glab: 1 },
  ],
  skaly: [
    { nazwa: 'gora-5x3', szer: 5, glab: 3 },
    { nazwa: 'gora-3x2', szer: 3, glab: 2 },
    { nazwa: 'gora-3x2-b', szer: 3, glab: 2 },
    { nazwa: 'skala-2x1', szer: 2, glab: 1 },
    { nazwa: 'skala-1x1', szer: 1, glab: 1 },
  ],
};

/** Wszystkie nazwy plików klocków (do wczytania w scenie). */
export const NAZWY_KLOCKOW: readonly string[] = [...KLOCKI.las, ...KLOCKI.skaly].map((k) => k.nazwa);

export interface Klocek extends RodzajKlocka {
  teren: TerenKlocka;
  /** Lewe-górne pole obrysu. */
  x: number;
  y: number;
}

function los(x: number, y: number, ziarno: number, ile: number) {
  let h = (x * 0x1f1f1f1f) ^ (y * 0x85ebca6b) ^ (ziarno * 0x9e3779b1);
  h = Math.imul(h ^ (h >>> 16), 0x2545f491);
  h = Math.imul(h ^ (h >>> 13), 0x27d4eb2f);
  return ((h ^ (h >>> 16)) >>> 0) % ile;
}

/**
 * Układa klocki na polach lasu i skał. Idzie wierszami od lewego-górnego
 * rogu; na pierwszym wolnym polu kładzie największy klocek, który mieści się
 * w całości na wolnych polach tego samego terenu. Co któryś raz (los) pomija
 * największy pasujący, żeby duże masy nie były szachownicą identycznych bloków.
 * Każde pole dostaje dokładnie jeden klocek — 1×1 mieści się zawsze.
 */
export function ulozKlocki(teren: readonly (readonly Teren[])[], ziarno = 0): Klocek[] {
  const wys = teren.length;
  const szer = teren[0]?.length ?? 0;
  const zajete = new Set<number>();
  const wolne = (x: number, y: number, t: TerenKlocka) =>
    x >= 0 && y >= 0 && x < szer && y < wys && teren[y][x] === t && !zajete.has(y * szer + x);
  const wynik: Klocek[] = [];
  for (let y = 0; y < wys; y++) {
    for (let x = 0; x < szer; x++) {
      const t = teren[y][x];
      if ((t !== 'las' && t !== 'skaly') || zajete.has(y * szer + x)) continue;
      const pasujace = KLOCKI[t].filter((k) => {
        for (let dy = 0; dy < k.glab; dy++) for (let dx = 0; dx < k.szer; dx++) if (!wolne(x + dx, y + dy, t)) return false;
        return true;
      });
      // Pomiń największy co trzeci raz, jeśli jest coś mniejszego (ale nie
      // schodź do 1×1, gdy mieści się coś większego).
      let i = 0;
      const pole = (k: RodzajKlocka) => k.szer * k.glab;
      if (pasujace.length > 2 && pole(pasujace[1]) > 1 && los(x, y, ziarno, 3) === 0) i = 1;
      // Warianty tej samej wielkości — losowo.
      const rozmiar = pole(pasujace[i]);
      const rowne = pasujace.filter((k) => pole(k) === rozmiar && k.szer === pasujace[i].szer);
      const k = rowne[los(y, x, ziarno + 7, rowne.length)];
      for (let dy = 0; dy < k.glab; dy++) for (let dx = 0; dx < k.szer; dx++) zajete.add((y + dy) * szer + x + dx);
      wynik.push({ ...k, teren: t, x, y });
    }
  }
  return scalDrobneSkaly(teren, wynik);
}

/**
 * Małe skupisko skał (najwyżej `SKUPISKO_MAX` pól) ułożone z kilku drobnych
 * klocków czytało się jak „kupka śnieżnych bloczków" — wypełniacz, nie
 * kompozycja (zgłoszenie gracza, Twierdza). Takie skupisko dostaje JEDEN klocek
 * góry na cały swój prostokąt: rysunek jest szerokości skupiska, a pola pod nim
 * zostają tymi samymi polami skał, więc przejezdność się nie zmienia.
 */
const SKUPISKO_MAX = 12;
function scalDrobneSkaly(teren: readonly (readonly Teren[])[], klocki: Klocek[]): Klocek[] {
  const wys = teren.length;
  const szer = teren[0]?.length ?? 0;
  const skupisko = new Int32Array(wys * szer).fill(-1);
  const pola: Array<Array<[number, number]>> = [];
  for (let y = 0; y < wys; y++)
    for (let x = 0; x < szer; x++) {
      if (teren[y][x] !== 'skaly' || skupisko[y * szer + x] >= 0) continue;
      const nr = pola.length;
      const lista: Array<[number, number]> = [];
      const stos: Array<[number, number]> = [[x, y]];
      skupisko[y * szer + x] = nr;
      while (stos.length) {
        const [cx, cy] = stos.pop()!;
        lista.push([cx, cy]);
        for (let dy = -1; dy <= 1; dy++)
          for (let dx = -1; dx <= 1; dx++) {
            const nx = cx + dx;
            const ny = cy + dy;
            if (nx < 0 || ny < 0 || nx >= szer || ny >= wys) continue;
            if (teren[ny][nx] !== 'skaly' || skupisko[ny * szer + nx] >= 0) continue;
            skupisko[ny * szer + nx] = nr;
            stos.push([nx, ny]);
          }
      }
      pola.push(lista);
    }
  const scalone = new Set<number>();
  const nowe: Klocek[] = [];
  pola.forEach((lista, nr) => {
    if (lista.length > SKUPISKO_MAX) return;
    const wSkupisku = klocki.filter((k) => k.teren === 'skaly' && skupisko[k.y * szer + k.x] === nr);
    if (wSkupisku.length < 2) return;
    const xs = lista.map(([x]) => x);
    const ys = lista.map(([, y]) => y);
    const x0 = Math.min(...xs);
    const y0 = Math.min(...ys);
    const sz = Math.max(...xs) - x0 + 1;
    const gl = Math.max(...ys) - y0 + 1;
    const rodzaj = sz >= 4 ? KLOCKI.skaly[0] : sz >= 2 ? KLOCKI.skaly[(x0 + y0) % 2 ? 2 : 1] : KLOCKI.skaly[3];
    scalone.add(nr);
    nowe.push({ ...rodzaj, szer: sz, glab: gl, teren: 'skaly', x: x0, y: y0 });
  });
  const zostale = [...klocki.filter((k) => !(k.teren === 'skaly' && scalone.has(skupisko[k.y * szer + k.x]))), ...nowe];
  return scalDrobneKlocki(zostale);
}

/**
 * To samo na brzegach dużych pasm: sąsiadujące drobne klocki skał (1 × 1,
 * 2 × 1) łączą się w jeden klocek góry na swój prostokąt — inaczej skraj pasma
 * to rządek osobnych kopczyków. Grupa szersza niż 5 pól dzieli się na kawałki.
 */
function scalDrobneKlocki(klocki: Klocek[]): Klocek[] {
  const drobne = klocki.filter((k) => k.teren === 'skaly' && k.szer * k.glab <= 2);
  const reszta = klocki.filter((k) => !drobne.includes(k));
  const obok = (a: Klocek, b: Klocek) =>
    a.x <= b.x + b.szer && b.x <= a.x + a.szer && a.y <= b.y + b.glab && b.y <= a.y + a.glab;
  const odwiedzone = new Set<Klocek>();
  const wynik: Klocek[] = [...reszta];
  for (const k of drobne) {
    if (odwiedzone.has(k)) continue;
    const grupa: Klocek[] = [];
    const stos = [k];
    odwiedzone.add(k);
    while (stos.length) {
      const a = stos.pop()!;
      grupa.push(a);
      for (const b of drobne) if (!odwiedzone.has(b) && obok(a, b)) (odwiedzone.add(b), stos.push(b));
    }
    if (grupa.length < 2) {
      wynik.push(...grupa);
      continue;
    }
    // Kawałki po najwyżej 5 pól szerokości, od lewej.
    grupa.sort((a, b) => a.x - b.x);
    for (let i = 0; i < grupa.length; ) {
      const x0 = grupa[i].x;
      const kawalek: Klocek[] = [];
      while (i < grupa.length && grupa[i].x + grupa[i].szer - x0 <= 5) kawalek.push(grupa[i++]);
      if (kawalek.length === 0) kawalek.push(grupa[i++]);
      if (kawalek.length === 1) {
        wynik.push(kawalek[0]);
        continue;
      }
      const y0 = Math.min(...kawalek.map((q) => q.y));
      const sz = Math.max(...kawalek.map((q) => q.x + q.szer)) - x0;
      const gl = Math.max(...kawalek.map((q) => q.y + q.glab)) - y0;
      const rodzaj = sz >= 4 ? KLOCKI.skaly[0] : KLOCKI.skaly[(x0 + y0) % 2 ? 2 : 1];
      wynik.push({ ...rodzaj, szer: sz, glab: gl, teren: 'skaly', x: x0, y: y0 });
    }
  }
  return wynik;
}
