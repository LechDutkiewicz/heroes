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
  return wynik;
}
