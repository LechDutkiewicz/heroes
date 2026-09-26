// Czy do KAŻDEGO obiektu na KAŻDEJ planszy da się dojść — zasadami gry
// i okiem gracza. Bez przeglądarki.
//
//   npx tsx tools/probe-osiagalnosc.ts            # wszystkie plansze z `MAPY`
//   npx tsx tools/probe-osiagalnosc.ts polana     # jedna
//
// Po co osobna sonda
// ------------------
// `probe-mapy.ts` liczy dojścia WŁASNYM modelem („obiekt ma osiągalnego
// sąsiada"). Ta sonda gra: od startu bohatera idzie dokładnie tak, jak idzie
// `trasa()` — tymi samymi funkcjami gry (`kosztPola`, `strzezoneProzez`,
// `obiektNa`, `zamknietaBrama`, `polaZajete`) — i odwiedza, co się da:
//
//   * na obiekt wchodzi się tylko jako na CEL marszu, nigdy w przelocie;
//   * stos, artefakt, skrzynię i potwora bierze się z sąsiedniego pola
//     (`Z_SASIEDNIEGO_POLA`) — potem znikają i pole jest wolne;
//   * na wejście kopalni, zamku, budowli, namiotu i chaty się STAJE — i dopiero
//     z niego idzie dalej (trasa przez nie nie przechodzi);
//   * strefa potwora (jego pole i osiem wokół) jest końcowa: wejście w nią to
//     bitwa z nim, a po wygranej potwora nie ma i droga jest wolna;
//   * zamknięta strażnica otwiera się dopiero kluczem z namiotu, który trzeba
//     najpierw zdobyć — klucze wpadają po kolei, jak w grze.
//
// Powtarza to do skutku; co zostaje nieodwiedzone, jest nie do zdobycia.
//
// Okiem gracza
// ------------
// Zgłoszenie z Polany (misja 1): kopalnia kamienia w kieszeni za rzeką
// „nie do dojścia". Zasadami gry była osiągalna — jedyne wejście, pas ziemi
// wzdłuż brzegu, leżało jednak POD rysunkiem szerokiej grani (kępa skał 3,
// 475 px, czyli prawie dziesięć pól), więc na ekranie kieszeń była zamknięta
// górą i rzeką ze wszystkich stron. Gracz nie kliknie w przejście, którego nie
// widać. Druga część sondy odtwarza więc rozstawienie kęp lasu i skał, gór
// z `USTAWIENIA.masywy` i pojedynczych drzew i głazów dokładnie tak jak
// `rysujPrzeszkody` w scenie (te same pliki, pozycje, skale, odbicia), liczy,
// jaką część każdego pola przykrywa nieprzezroczysty rysunek, i gra jeszcze
// raz — bez pól przykrytych w co najmniej `PROG_ZASLONY`. Obiekt osiągalny
// zasadami, a nieosiągalny tak, to przejście schowane pod górą albo lasem.

import {
  TEREN_INFO,
  Z_SASIEDNIEGO_POLA,
  kluczeOf,
  kosztPola,
  obiektNa,
  polaZajete,
  strzezoneProzez,
  trasa,
  wGranicach,
  zamknietaBrama,
  type Obiekt,
  type StanMapy,
} from '../src/data/mapa';
import { planszaPrzygody } from '../src/data/plansza';
import { MAPY, planszaPoId } from '../src/data/mapy';
import { ZESTAWY_KLIMATU } from '../src/data/zestawy-klimatu';
import { KAFEL } from '../src/visual/uklad';
import { existsSync, readFileSync } from 'node:fs';
import { inflateSync } from 'node:zlib';

let bledy = 0;
const sprawdz = (co: string, ok: boolean, szczegol = '') => {
  if (!ok) bledy++;
  console.log(`  ${ok ? 'OK  ' : 'ŹLE '} ${co}${szczegol ? ` — ${szczegol}` : ''}`);
};

const K = (x: number, y: number) => `${x},${y}`;
const KIERUNKI = [-1, 0, 1].flatMap((dy) => [-1, 0, 1].map((dx) => [dx, dy])).filter(([dx, dy]) => dx || dy);
const opis = (o: Obiekt) => `${o.nazwa} (${o.x},${o.y})`;

/** Na te obiekty bohater WCHODZI i z nich idzie dalej (reszta: z sąsiedniego pola). */
const naWejscie = (o: Obiekt) => !Z_SASIEDNIEGO_POLA.includes(o.rodzaj) && o.rodzaj !== 'straznica';

// ---------------------------------------------------------------------------
// Część 1: gra zasadami `trasa()`
// ---------------------------------------------------------------------------

interface Wynik {
  /** obiekty odwiedzone (zebrane, pokonane, zajęte albo otwarte) */
  odwiedzone: Set<Obiekt>;
  /** pola, na których bohater może stanąć */
  stoi: Set<string>;
}

/**
 * Gra od startu do skutku. `zakazane` — pola, których gracz nie widzi jako
 * przejścia (część 2); na obiekt stojący na takim polu wolno wejść, bo obiekt
 * rysuje się NAD górą, ale przez takie pole się nie idzie i się na nim nie staje.
 *
 * `murySieOdswiezaja` — po każdej rundzie mury budowli liczą się od nowa
 * (`s.bryly = undefined`), tak jak po wczytaniu zapisu: `polaBryly` omija
 * pola sąsiadujące z cudzym obiektem, więc gdy obiekt znika, mur rośnie.
 */
function graj(id: string, zakazane = new Set<string>(), murySieOdswiezaja = false): Wynik {
  const s: StanMapy = planszaPrzygody(id);
  const odwiedzone = new Set<Obiekt>();
  const stoi = new Set<string>([K(s.bohater.x, s.bohater.y)]);
  const zrodla = new Set<string>(stoi);

  for (let runda = 0; runda < 500; runda++) {
    if (murySieOdswiezaja) s.bryly = undefined;
    // Tablice z funkcji gry, liczone raz na rundę — wywołanie ich w pętli
    // BFS-u dla każdego sąsiada byłoby za wolne na planszy 72 × 72.
    const koszt: (number | null)[][] = [];
    const obiekt: (Obiekt | undefined)[][] = [];
    const straz: (Obiekt | undefined)[][] = [];
    const brama: (Obiekt | undefined)[][] = [];
    polaZajete(s);
    for (let y = 0; y < s.wys; y++) {
      koszt.push([]);
      obiekt.push([]);
      straz.push([]);
      brama.push([]);
      for (let x = 0; x < s.szer; x++) {
        koszt[y].push(kosztPola(s, x, y));
        obiekt[y].push(obiektNa(s, x, y));
        straz[y].push(strzezoneProzez(s, x, y));
        brama[y].push(zamknietaBrama(s, x, y));
      }
    }

    // BFS z wielu źródeł — każde pole, na którym bohater już stał, jest
    // początkiem jakiejś trasy. Rozwijanie pól dokładnie jak w `trasa()`:
    // strefa potwora jest końcowa (z niej tylko krok na potwora), pole
    // źródła strefą nie ogranicza, obiekt tylko jako cel, brama tylko jako cel.
    const cele = new Set<string>();
    const widziane = new Set<string>(zrodla);
    const kolejka = [...zrodla].map((k) => k.split(',').map(Number));
    while (kolejka.length) {
      const [cx, cy] = kolejka.pop()!;
      const zrodlo = zrodla.has(K(cx, cy));
      const st = straz[cy][cx];
      for (const [dx, dy] of KIERUNKI) {
        const nx = cx + dx, ny = cy + dy, k = K(nx, ny);
        if (!wGranicach(s, nx, ny)) continue;
        if (st && !zrodlo && !(nx === st.x && ny === st.y)) continue;
        const b = brama[ny][nx];
        if (koszt[ny][nx] === null && !b) continue;
        const o = obiekt[ny][nx];
        if (o || b) {
          // Cel marszu. Nie idzie się dalej w tej samej trasie.
          cele.add(k);
          continue;
        }
        if (zakazane.has(k) || widziane.has(k)) continue;
        widziane.add(k);
        cele.add(k);
        // Wejście w strefę potwora kończy marsz — ale pole dalej rozwijamy
        // (tylko w stronę potwora, patrz wyżej), bo tak liczy `trasa()`.
        kolejka.push([nx, ny]);
      }
    }

    // Odwiedziny. Wszystko, co jest celem, dzieje się naraz — kolejność nie
    // zmienia wyniku, bo obiekty tylko znikają albo otwierają drogę.
    let zmiana = false;
    for (const k of cele) {
      const [x, y] = k.split(',').map(Number);
      const o = obiekt[y][x] ?? brama[y][x];
      if (!o) {
        if (!stoi.has(k)) {
          stoi.add(k);
          zmiana = true;
        }
        // Pole w strefie: wejście to bitwa z potworem (pokonanym niżej, bo
        // jego pole jest celem z tego pola).
        continue;
      }
      if (odwiedzone.has(o) && !naWejscie(o)) continue;
      if (o.rodzaj === 'straznica') {
        if (!kluczeOf(s, 'gracz').includes(o.klucz ?? 'zielony')) continue;
        o.zebrany = true;
        s.bryly = undefined; // jak `odwiedz`: brama przejezdna natychmiast
      } else if (o.rodzaj === 'namiot') {
        const klucze = kluczeOf(s, 'gracz');
        if (o.klucz && !klucze.includes(o.klucz)) klucze.push(o.klucz);
        o.zebrany = true;
      } else if (!naWejscie(o)) {
        o.zebrany = true; // potwór pokonany, stos/skrzynia/artefakt zebrane
      } else if (!zakazane.has(k)) {
        // Kopalnia, zamek, budowla, chata: bohater stoi w wejściu i stamtąd
        // rusza dalej.
        if (!stoi.has(k)) {
          stoi.add(k);
          zrodla.add(k);
          zmiana = true;
        }
      }
      if (!odwiedzone.has(o)) {
        odwiedzone.add(o);
        zmiana = true;
      }
    }
    for (const k of stoi) zrodla.add(k);
    if (!zmiana) break;
  }
  return { odwiedzone, stoi };
}

/**
 * Uczciwość modelu: z samego startu (pierwsza runda, bez niczyjej pomocy)
 * zbiór osiągalnych obiektów ma być DOKŁADNIE tym, do czego `trasa()` gry
 * znajduje drogę. Inaczej sonda mierzyłaby siebie, a nie grę.
 */
function zgodnoscZTrasa(id: string): { zgodne: number; rozne: string[] } {
  const s = planszaPrzygody(id);
  const start = K(s.bohater.x, s.bohater.y);
  // Jedna runda modelu z samego startu.
  const koszt = (x: number, y: number) => kosztPola(s, x, y);
  const cele = new Set<string>();
  const widziane = new Set([start]);
  const kol = [[s.bohater.x, s.bohater.y]];
  while (kol.length) {
    const [cx, cy] = kol.pop()!;
    const st = strzezoneProzez(s, cx, cy);
    const zrodlo = K(cx, cy) === start;
    for (const [dx, dy] of KIERUNKI) {
      const nx = cx + dx, ny = cy + dy, k = K(nx, ny);
      if (!wGranicach(s, nx, ny)) continue;
      if (st && !zrodlo && !(nx === st.x && ny === st.y)) continue;
      const b = zamknietaBrama(s, nx, ny);
      if (koszt(nx, ny) === null && !b) continue;
      if (obiektNa(s, nx, ny) || b) {
        cele.add(k);
        continue;
      }
      if (widziane.has(k)) continue;
      widziane.add(k);
      kol.push([nx, ny]);
    }
  }
  const rozne: string[] = [];
  let zgodne = 0;
  for (const o of s.obiekty) {
    const model = cele.has(K(o.x, o.y));
    const gra = trasa(s, o.x, o.y) !== null;
    if (model === gra) zgodne++;
    else rozne.push(`${opis(o)}: model ${model ? 'tak' : 'nie'}, trasa ${gra ? 'tak' : 'nie'}`);
  }
  return { zgodne, rozne };
}

// ---------------------------------------------------------------------------
// Część 2: co przykrywają rysunki terenu (odtworzenie `rysujPrzeszkody`)
// ---------------------------------------------------------------------------

interface Obraz {
  w: number;
  h: number;
  alfa: Uint8Array;
}

/** Najprostszy dekoder PNG: RGBA 8 bit bez przeplotu (tak są zapisane sprite'y mapy). */
function wczytajPng(plik: string): Obraz {
  const buf = readFileSync(plik);
  let off = 8;
  let w = 0, h = 0, typ = 0, glebia = 0, przeplot = 0;
  const idat: Buffer[] = [];
  while (off < buf.length) {
    const dl = buf.readUInt32BE(off);
    const rodzaj = buf.toString('ascii', off + 4, off + 8);
    const dane = buf.subarray(off + 8, off + 8 + dl);
    if (rodzaj === 'IHDR') {
      w = dane.readUInt32BE(0);
      h = dane.readUInt32BE(4);
      glebia = dane[8];
      typ = dane[9];
      przeplot = dane[12];
    } else if (rodzaj === 'IDAT') idat.push(dane);
    else if (rodzaj === 'IEND') break;
    off += 12 + dl;
  }
  if (typ !== 6 || glebia !== 8 || przeplot !== 0) throw new Error(`${plik}: obsługuję tylko RGBA 8 bit bez przeplotu`);
  const surowe = inflateSync(Buffer.concat(idat));
  const bpp = 4, wiersz = w * bpp;
  const px = new Uint8Array(wiersz * h);
  for (let y = 0; y < h; y++) {
    const filtr = surowe[y * (wiersz + 1)];
    const src = y * (wiersz + 1) + 1;
    for (let i = 0; i < wiersz; i++) {
      const a = i >= bpp ? px[y * wiersz + i - bpp] : 0;
      const b = y > 0 ? px[(y - 1) * wiersz + i] : 0;
      const c = i >= bpp && y > 0 ? px[(y - 1) * wiersz + i - bpp] : 0;
      let v = surowe[src + i];
      if (filtr === 1) v += a;
      else if (filtr === 2) v += b;
      else if (filtr === 3) v += (a + b) >> 1;
      else if (filtr === 4) {
        const p = a + b - c, pa = Math.abs(p - a), pb = Math.abs(p - b), pc = Math.abs(p - c);
        v += pa <= pb && pa <= pc ? a : pb <= pc ? b : c;
      }
      px[y * wiersz + i] = v & 0xff;
    }
  }
  const alfa = new Uint8Array(w * h);
  for (let i = 0; i < w * h; i++) alfa[i] = px[i * 4 + 3];
  return { w, h, alfa };
}

/** Rysunek postawiony w świecie: origin (0,5; 1), jak wszystkie przeszkody sceny. */
interface Rysunek {
  obraz: Obraz;
  x: number;
  y: number;
  skala: number;
  odbij: boolean;
}

/** `AdventureScene.wariant` — ten sam hasz, żeby wypadły te same rysunki i odbicia. */
function wariant(x: number, y: number, ile: number) {
  let h = (x * 0x1f1f1f1f) ^ (y * 0x85ebca6b);
  h = Math.imul(h ^ (h >>> 16), 0x2545f491);
  h = Math.imul(h ^ (h >>> 13), 0x27d4eb2f);
  return ((h ^ (h >>> 16)) >>> 0) % ile;
}

const obrazy = new Map<string, Obraz>();

/** Rysunki przeszkód planszy — kopia rozstawienia z `rysujPrzeszkody`. */
function rysunkiPrzeszkod(s: StanMapy): Rysunek[] {
  const ust = planszaPoId(s.mapa).modul.USTAWIENIA ?? {};
  const zestaw = ust.zestaw ?? '';
  const zKlimatu = new Set(ZESTAWY_KLIMATU[zestaw] ?? []);
  const obraz = (n: string) => {
    const plik = n.startsWith('gora-') ? `public/mapa/${zestaw}/${n}.png` : `public/mapa/${zKlimatu.has(n) ? `${zestaw}/` : ''}${n}.png`;
    if (!obrazy.has(plik)) obrazy.set(plik, existsSync(plik) ? wczytajPng(plik) : { w: 0, h: 0, alfa: new Uint8Array() });
    return obrazy.get(plik)!;
  };
  const wynik: Rysunek[] = [];
  const zajete = new Set<string>();
  const takiSam = (x: number, y: number, t: string) =>
    x >= 0 && y >= 0 && x < s.szer && y < s.wys && s.teren[y][x] === t && !zajete.has(K(x, y));

  for (const m of ust.masywy ?? []) {
    const ob = obraz(m.plik);
    if (!ob.w) continue;
    const [x0, y0, x1, y1] = m.pokrywa;
    for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) if (s.teren[y]?.[x] === 'skaly') zajete.add(K(x, y));
    wynik.push({ obraz: ob, x: m.x * KAFEL, y: m.y * KAFEL, skala: (m.szer * KAFEL) / ob.w, odbij: !!m.odbij });
  }
  for (let y = 0; y < s.wys; y++)
    for (let x = 0; x < s.szer; x++) {
      const t = s.teren[y][x];
      if ((t !== 'las' && t !== 'skaly') || zajete.has(K(x, y))) continue;
      let miesciSie = true;
      for (let dy = 0; dy < 2 && miesciSie; dy++) for (let dx = 0; dx < 3; dx++) if (!takiSam(x + dx, y + dy, t)) miesciSie = false;
      if (!miesciSie) continue;
      for (let dy = 0; dy < 2; dy++) for (let dx = 0; dx < 3; dx++) zajete.add(K(x + dx, y + dy));
      const reczna = t === 'skaly' ? ust.kepySkal?.[K(x, y)] : undefined;
      const nr = reczna ? Math.abs(reczna) : wariant(x, y, 4) + 1;
      const ob = obraz(`kepa-${t}-${nr}`);
      wynik.push({
        obraz: ob,
        x: x * KAFEL + KAFEL / 2 + KAFEL,
        y: y * KAFEL + KAFEL / 2 + KAFEL * 1.5,
        skala: t === 'las' ? ust.skalaKepLasu ?? 1 : 1,
        odbij: reczna ? reczna < 0 : wariant(y, x, 2) === 1,
      });
    }
  // Pojedyncze drzewa i głazy na polach, na których kępa się nie zmieściła.
  const element = (n: string, ex: number, ey: number, wys: number, ziarno: number) => {
    const ob = obraz(n);
    if (ob.h) wynik.push({ obraz: ob, x: ex, y: ey, skala: (KAFEL * wys) / ob.h, odbij: ziarno % 2 === 1 });
  };
  for (let y = 0; y < s.wys; y++)
    for (let x = 0; x < s.szer; x++) {
      const t = s.teren[y][x];
      if ((t !== 'las' && t !== 'skaly') || zajete.has(K(x, y))) continue;
      const ex = x * KAFEL + KAFEL / 2, ey = y * KAFEL + KAFEL / 2;
      const z = wariant(x, y, 6);
      if (t === 'las') {
        element(
          ['sosna', 'drzewo', 'sosna-b', 'drzewo-b'][wariant(x, y, 4)],
          ex + ((wariant(x, y, 5) - 2) / 2) * KAFEL * 0.16,
          ey + KAFEL * (0.3 + wariant(y, x, 3) * 0.04),
          1.3 + wariant(x + 1, y, 4) * 0.07,
          z
        );
        if (wariant(x + 2, y + 1, 3) !== 0)
          element(
            ['sosna-mala', 'krzak', 'krzak-2'][wariant(y, x, 3)],
            ex + ((wariant(y, x, 4) - 1.5) / 1.5) * KAFEL * 0.3,
            ey + KAFEL * 0.42,
            0.5 + wariant(x, y + 3, 3) * 0.08,
            z + 1
          );
      } else {
        element(
          ['skala', 'skala-2', 'kopiec', 'kopiec-2'][wariant(x, y, 4)],
          ex + ((wariant(x, y + 2, 5) - 2) / 2) * KAFEL * 0.14,
          ey + KAFEL * (0.34 + wariant(y, x + 3, 3) * 0.05),
          0.82 + wariant(x + y, y, 4) * 0.09,
          z
        );
        element(
          ['kopiec', 'skala', 'kopiec-2'][wariant(y, x, 3)],
          ex + KAFEL * (0.16 + wariant(x, y, 3) * 0.06),
          ey + KAFEL * 0.46,
          0.44 + wariant(y + 1, x, 3) * 0.06,
          z + 1
        );
      }
    }
  return wynik;
}

/**
 * Jaka część każdego przejezdnego pola jest przykryta nieprzezroczystym
 * rysunkiem przeszkody (0–1). Przeszkody leżą w świecie POD obiektami
 * i bohaterem, ale NAD gruntem — więc zasłaniają właśnie to, po czym gracz
 * poznaje drogę.
 */
function zaslona(s: StanMapy): number[][] {
  const rysunki = rysunkiPrzeszkod(s).map((r) => {
    const w = r.obraz.w * r.skala, h = r.obraz.h * r.skala;
    return { ...r, x0: r.x - w / 2, y0: r.y - h, x1: r.x + w / 2, y1: r.y };
  });
  const PROBKI = 8;
  const wynik: number[][] = [];
  for (let ty = 0; ty < s.wys; ty++) {
    wynik.push([]);
    for (let tx = 0; tx < s.szer; tx++) {
      if (TEREN_INFO[s.teren[ty][tx]].koszt === null) {
        wynik[ty].push(1);
        continue;
      }
      const bx0 = tx * KAFEL, by0 = ty * KAFEL;
      const blisko = rysunki.filter((r) => r.x1 > bx0 && r.x0 < bx0 + KAFEL && r.y1 > by0 && r.y0 < by0 + KAFEL);
      let kryte = 0;
      for (let j = 0; j < PROBKI; j++)
        for (let i = 0; i < PROBKI; i++) {
          const wx = bx0 + ((i + 0.5) / PROBKI) * KAFEL, wy = by0 + ((j + 0.5) / PROBKI) * KAFEL;
          const trafia = blisko.some((r) => {
            if (wx < r.x0 || wx >= r.x1 || wy < r.y0 || wy >= r.y1) return false;
            let u = Math.floor((wx - r.x0) / r.skala);
            const v = Math.floor((wy - r.y0) / r.skala);
            if (r.odbij) u = r.obraz.w - 1 - u;
            return r.obraz.alfa[v * r.obraz.w + u] >= 128;
          });
          if (trafia) kryte++;
        }
      wynik[ty].push(kryte / (PROBKI * PROBKI));
    }
  }
  return wynik;
}

/**
 * Pole przykryte w co najmniej tylu procentach nie wygląda na przejście.
 *
 * Pomiar: pas ziemi wzdłuż brzegu na Polanie, zanim go odsłonięto, miał
 * (17, 27) i (17, 28) przykryte w 100%; po zamianie grani na wąski masyw
 * 34% i 75%. Przy progu 60% sonda zgłaszała na Dwóch Dolinach 125 obiektów —
 * ścieżki wzdłuż skraju lasu, gdzie korony zachodzą na pole przed drzewami,
 * a mimo to trakt jest widoczny. Przy 90% zostaje tylko to, co naprawdę
 * leży pod rysunkiem: na wszystkich czterech planszach tylko ta kieszeń.
 */
const PROG_ZASLONY = 0.9;

/**
 * Pola przykryte na najkrótszej drodze (zasadami gry) od tego, co gracz widzi,
 * do obiektu — czyli przejście, które trzeba odsłonić.
 */
function schowanePrzejscie(gra: Wynik, okiem: Wynik, zakazane: Set<string>, o: Obiekt): string[] {
  const skad = new Map<string, string | null>();
  const kol: string[] = [];
  for (const k of okiem.stoi) {
    skad.set(k, null);
    kol.push(k);
  }
  const cel = (k: string) => {
    const [x, y] = k.split(',').map(Number);
    return Math.max(Math.abs(x - o.x), Math.abs(y - o.y)) <= 1;
  };
  for (let i = 0; i < kol.length; i++) {
    const k = kol[i];
    if (cel(k) && !okiem.stoi.has(k)) {
      const droga: string[] = [];
      for (let p: string | null | undefined = k; p; p = skad.get(p)) if (zakazane.has(p)) droga.unshift(p);
      return droga;
    }
    const [x, y] = k.split(',').map(Number);
    for (const [dx, dy] of KIERUNKI) {
      const n = K(x + dx, y + dy);
      if (gra.stoi.has(n) && !skad.has(n)) {
        skad.set(n, k);
        kol.push(n);
      }
    }
  }
  return [];
}

// ---------------------------------------------------------------------------

const wybrane = process.argv.slice(2).filter((a) => !a.startsWith('-'));
for (const id of Object.keys(MAPY)) {
  if (wybrane.length && !wybrane.includes(id)) continue;
  const s0 = planszaPrzygody(id);
  console.log(`\n##### ${MAPY[id].nazwa} (${id}) — ${s0.obiekty.length} obiektów #####`);

  const { zgodne, rozne } = zgodnoscZTrasa(id);
  sprawdz(
    'model sondy zgadza się z trasa() gry na starcie',
    rozne.length === 0,
    rozne.length ? rozne.slice(0, 4).join('; ') : `${zgodne} obiektów`
  );

  const gra = graj(id);
  const nieodwiedzone = planszaPrzygody(id).obiekty.filter(
    (o) => ![...gra.odwiedzone].some((q) => q.id === o.id)
  );
  sprawdz(
    `zasadami gry da się dojść do każdego obiektu`,
    nieodwiedzone.length === 0,
    nieodwiedzone.length
      ? `nie do zdobycia ${nieodwiedzone.length}: ${nieodwiedzone.slice(0, 8).map(opis).join(', ')}`
      : `${gra.odwiedzone.size} obiektów, ${gra.stoi.size} pól`
  );

  // Po wczytaniu zapisu mury liczą się od nowa, bez zebranych obiektów —
  // i rosną. Obiekt, do którego wtedy nie da się dojść, jest zgubiony dla
  // gracza, który zapisał grę w złym momencie.
  const poZapisie = graj(id, new Set(), true);
  const zgubione = planszaPrzygody(id).obiekty.filter(
    (o) => ![...poZapisie.odwiedzone].some((q) => q.id === o.id)
  );
  sprawdz(
    'także gdy mury przeliczą się bez zebranych obiektów (wczytanie zapisu)',
    zgubione.length === 0,
    zgubione.slice(0, 8).map(opis).join(', ')
  );

  const zas = zaslona(s0);
  const zakazane = new Set<string>();
  for (let y = 0; y < s0.wys; y++) for (let x = 0; x < s0.szer; x++) if (zas[y][x] >= PROG_ZASLONY) zakazane.add(K(x, y));
  const okiem = graj(id, zakazane);
  const schowane = planszaPrzygody(id).obiekty.filter(
    (o) =>
      [...gra.odwiedzone].some((q) => q.id === o.id) && ![...okiem.odwiedzone].some((q) => q.id === o.id)
  );
  const przejscie = schowane.length ? schowanePrzejscie(gra, okiem, zakazane, schowane[0]) : [];
  sprawdz(
    `okiem gracza: do żadnego obiektu nie prowadzi przejście schowane pod rysunkiem góry albo lasu (próg ${Math.round(PROG_ZASLONY * 100)}%)`,
    schowane.length === 0,
    schowane.length
      ? `${schowane.length}: ${schowane.slice(0, 8).map(opis).join(', ')}; przykryte przejście: ${przejscie
          .map((k) => {
            const [x, y] = k.split(',').map(Number);
            return `(${k}) ${Math.round(zas[y][x] * 100)}%`;
          })
          .join(' ')}`
      : `${zakazane.size} pól przykrytych, żadne nie jest jedynym przejściem`
  );
}

console.log(`\n${bledy === 0 ? 'Wszystko się zgadza.' : `Błędów: ${bledy}`}`);
process.exit(bledy === 0 ? 0 : 1);
