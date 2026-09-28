import Phaser from 'phaser';

/**
 * Styl ekranu walki „jak w grach Pokémon" (makieta A, wybór użytkownika):
 * belka-pokeball u góry, białe panele z grubym ciemnym obrysem, okienko
 * dialogu ze strzałką, pigułki przycisków w żywych barwach, sloty drużyny
 * jak pokeballe. Mapa, miasto i kampania zostają na zestawie z drewna —
 * walka ma być osobnym, jaśniejszym „ekranem z gry".
 *
 * Wszystko rysuje Graphics (bez tekstur), więc wygląd nie zależy od
 * wczytania plików. Krój: Nunito (OFL, `public/walka/`) — pełny polski
 * alfabet; Fredoka i Lilita One nie mają ś, ć, ń, ż.
 */

export const TUSZ = 0x26262e;
export const TUSZ_CSS = '#26262e';
export const CZERWIEN = 0xe3350d;
export const CZERWIEN_CIEMNA = 0xb8230a;
export const NIEBIESKI = 0x3a6fd8;
export const ZOLTY = 0xffd43b;
export const BIEL = 0xffffff;
/** Cień spodu białych paneli — „grubość" plastiku. */
export const SPOD = 0xe6eaf0;

export const KROJ_WALKI = 'WalkaNunito, Nunito, "Trebuchet MS", Verdana, sans-serif';

export type KolorPigulki = 'bialy' | 'niebieski' | 'zielony' | 'pomaranczowy' | 'czerwony' | 'zolty' | 'szary';

/** Góra (jasna) i dół (ciemna) gradientu pigułki; tekst biały albo tuszem. */
export const PIGULKI: Record<KolorPigulki, { gora: number; dol: number; tekst: string }> = {
  bialy: { gora: 0xffffff, dol: 0xf1f3f7, tekst: TUSZ_CSS },
  niebieski: { gora: 0x6aa9f5, dol: 0x3a7ad8, tekst: '#ffffff' },
  zielony: { gora: 0x6fd58e, dol: 0x34a85a, tekst: '#ffffff' },
  pomaranczowy: { gora: 0xff9a50, dol: 0xee5a26, tekst: '#ffffff' },
  czerwony: { gora: 0xf2503a, dol: 0xc92a09, tekst: '#ffffff' },
  zolty: { gora: 0xffe27a, dol: 0xf5b82e, tekst: TUSZ_CSS },
  szary: { gora: 0xe3e7ec, dol: 0xd6dbe2, tekst: '#8b93a0' },
};

let kroj: Promise<void> | undefined;
let krojGotowy = false;

/** Rejestruje Nunito (łaciński i łaciński rozszerzony podzbiór, krój zmienny 200–1000). */
export function krojWalki(): Promise<void> {
  const B = import.meta.env.BASE_URL;
  kroj ??= Promise.all(
    [
      ['nunito-latin', 'U+0000-00FF, U+0131, U+0152-0153, U+02BB-02BC, U+02C6, U+02DA, U+02DC, U+0304, U+0308, U+0329, U+2000-206F, U+20AC, U+2122, U+2191, U+2193, U+2212, U+2215, U+FEFF, U+FFFD'],
      ['nunito-latin-ext', 'U+0100-02BA, U+02BD-02C5, U+02C7-02CC, U+02CE-02D7, U+02DD-02FF, U+1E00-1E9F, U+1EF2-1EFF, U+2020, U+20A0-20AB, U+20AD-20C0, U+2113, U+2C60-2C7F, U+A720-A7FF'],
    ].map(async ([plik, zakres]) => {
      const f = new FontFace('WalkaNunito', `url(${B}walka/${plik}.woff2)`, { unicodeRange: zakres, weight: '200 1000' });
      await f.load();
      document.fonts.add(f);
    })
  ).then(
    () => {
      krojGotowy = true;
    },
    () => {
      // Nie ma pliku? Gra idzie dalej krojem zapasowym — nie czekamy w kółko.
      krojGotowy = true;
    }
  );
  return kroj;
}

/**
 * Czy krój walki już jest (gotowe napisy nie przerysują się same po jego
 * wczytaniu). Własna flaga, nie `document.fonts.check`: ten dla kroju,
 * którego jeszcze nikt nie zarejestrował, odpowiada „gotowe".
 */
export const krojWalkiGotowy = () => krojGotowy;

/** Styl napisu: Nunito, domyślnie najgrubszy, tuszem. */
export function stylWalki(
  rozmiar: number,
  kolor: string = TUSZ_CSS,
  waga: 700 | 800 | 900 = 900
): Phaser.Types.GameObjects.Text.TextStyle {
  return { fontFamily: KROJ_WALKI, fontSize: `${rozmiar}px`, color: kolor, fontStyle: String(waga) };
}

/** Biały napis na barwnej pigułce — z cieniem pod literami, jak w grach. */
export function napisNaPigulce(t: Phaser.GameObjects.Text, kolor: KolorPigulki) {
  const p = PIGULKI[kolor];
  t.setColor(p.tekst);
  if (p.tekst === '#ffffff') t.setShadow(0, 2, 'rgba(0,0,0,0.35)', 0, false, true);
  else t.setShadow(0, 0, 'rgba(0,0,0,0)', 0);
  return t;
}

/**
 * Biały panel: cień pod spodem, gruby obrys tuszem, biel z „grubością"
 * (ciemniejszy pas u dołu, jak plastikowa płytka).
 */
export function panelBialy(
  g: Phaser.GameObjects.Graphics,
  x: number,
  y: number,
  w: number,
  h: number,
  r = 16,
  o: { obrys?: number; spod?: number; cien?: number; wypelnienie?: number } = {}
) {
  const obrys = o.obrys ?? 3;
  const cien = o.cien ?? 4;
  if (cien > 0) {
    g.fillStyle(TUSZ, 0.3);
    g.fillRoundedRect(x, y + cien, w, h, r);
  }
  g.fillStyle(TUSZ, 1);
  g.fillRoundedRect(x, y, w, h, r);
  const ix = x + obrys;
  const iy = y + obrys;
  const iw = w - 2 * obrys;
  const ih = h - 2 * obrys;
  const ir = Math.max(2, r - obrys);
  g.fillStyle(o.spod ?? SPOD, 1);
  g.fillRoundedRect(ix, iy, iw, ih, ir);
  const grubosc = Math.min(5, ih / 3);
  g.fillStyle(o.wypelnienie ?? BIEL, 1);
  g.fillRoundedRect(ix, iy, iw, ih - grubosc, { tl: ir, tr: ir, bl: Math.max(1, ir - 2), br: Math.max(1, ir - 2) });
}

/**
 * Pigułka przycisku: obrys tuszem, dolna (ciemniejsza) barwa, górna jasna
 * połowa, połysk u góry i ciemny pas u dołu. Zwraca nic — rysuje w `g`.
 */
export function pigulka(
  g: Phaser.GameObjects.Graphics,
  x: number,
  y: number,
  w: number,
  h: number,
  kolor: KolorPigulki,
  o: { r?: number; wybrana?: boolean; cien?: boolean } = {}
) {
  const r = o.r ?? Math.min(13, h / 2);
  const p = PIGULKI[kolor];
  if (o.cien !== false) {
    g.fillStyle(TUSZ, 0.35);
    g.fillRoundedRect(x, y + 3, w, h, r);
  }
  if (o.wybrana) {
    g.fillStyle(TUSZ, 1);
    g.fillRoundedRect(x - 6, y - 6, w + 12, h + 12, r + 6);
    g.fillStyle(ZOLTY, 1);
    g.fillRoundedRect(x - 3, y - 3, w + 6, h + 6, r + 3);
  }
  const obrys = kolor === 'szary' ? 0x8b93a0 : TUSZ;
  g.fillStyle(obrys, 1);
  g.fillRoundedRect(x, y, w, h, r);
  const ir = Math.max(2, r - 3);
  g.fillStyle(p.dol, 1);
  g.fillRoundedRect(x + 3, y + 3, w - 6, h - 6, ir);
  g.fillStyle(p.gora, 1);
  g.fillRoundedRect(x + 3, y + 3, w - 6, (h - 6) * 0.55, { tl: ir, tr: ir, bl: 0, br: 0 });
  // Połysk i „grubość" spodu.
  g.fillStyle(0xffffff, kolor === 'bialy' || kolor === 'szary' ? 0 : 0.3);
  g.fillRoundedRect(x + 6, y + 4, w - 12, 3, 1.5);
  g.fillStyle(0x000000, kolor === 'bialy' ? 0 : kolor === 'szary' ? 0.05 : 0.18);
  g.fillRoundedRect(x + 3, y + h - 3 - 5, w - 6, 5, { tl: 0, tr: 0, bl: ir, br: ir });
  if (kolor === 'bialy') {
    g.fillStyle(SPOD, 1);
    g.fillRoundedRect(x + 3, y + h - 3 - 4, w - 6, 4, { tl: 0, tr: 0, bl: ir, br: ir });
  }
}

/**
 * Pokeball: czerwona góra, biały dół, pas tuszem, obrys. `szary` — pusty
 * albo zemdlony (górna połowa szara). Wnętrze (portret) kładzie się osobno.
 */
export function pokeball(g: Phaser.GameObjects.Graphics, cx: number, cy: number, r: number, szary = false) {
  g.fillStyle(TUSZ, 1);
  g.fillCircle(cx, cy, r);
  const ir = r - 3;
  g.fillStyle(BIEL, 1);
  g.fillCircle(cx, cy, ir);
  g.fillStyle(szary ? 0xb9c0c9 : CZERWIEN, 1);
  g.slice(cx, cy, ir, Math.PI, 0, false);
  g.fillPath();
  g.fillStyle(TUSZ, 1);
  g.fillRect(cx - ir, cy - Math.max(1.5, r * 0.07), ir * 2, Math.max(3, r * 0.14));
}

/**
 * Tło walki: jasny błękit z delikatnymi kropkami (jak tła menu w grach
 * Pokémon) i belka-pokeball u góry: czerwień, pas tuszem, biel.
 */
export function tloWalki(scene: Phaser.Scene, glebia: number, belkaH = 58) {
  const w = scene.scale.width;
  const h = scene.scale.height;
  const g = scene.add.graphics().setDepth(glebia);
  g.fillGradientStyle(0xdfe7f0, 0xdfe7f0, 0xcfd9e6, 0xcfd9e6, 1);
  g.fillRect(0, 0, w, h);
  g.fillStyle(0xffffff, 0.55);
  for (let y = 12; y < h; y += 24) for (let x = 12; x < w; x += 24) g.fillCircle(x, y, 3);
  // Belka: czerwień z gradientem, pas tuszem, biel — pokeball w poziomie.
  const pas = belkaH - 20;
  g.fillGradientStyle(0xf2503a, 0xf2503a, 0xc92a09, 0xc92a09, 1);
  g.fillRect(0, 0, w, pas);
  g.fillStyle(0xffffff, 0.3);
  g.fillRect(0, 3, w, 6);
  g.fillStyle(TUSZ, 1);
  g.fillRect(0, pas, w, 7);
  g.fillGradientStyle(0xffffff, 0xffffff, 0xeef1f5, 0xeef1f5, 1);
  g.fillRect(0, pas + 7, w, belkaH - pas - 7);
  g.fillStyle(TUSZ, 0.9);
  g.fillRect(0, belkaH, w, 3);
  g.fillStyle(0x000000, 0.12);
  g.fillRect(0, belkaH + 3, w, 5);
  return g;
}

/** Medalion trenera jak pokeball: obrys, czerwień i biel, w środku portret na błękicie. */
export function medalionPokeball(scene: Phaser.Scene, x: number, y: number, r: number, tlo: number = 0xaed8f5) {
  const g = scene.add.graphics();
  g.fillStyle(0x000000, 0.25);
  g.fillCircle(x, y + 3, r);
  pokeball(g, x, y, r);
  g.fillStyle(TUSZ, 1);
  g.fillCircle(x, y, r - 5);
  g.fillStyle(tlo, 1);
  g.fillCircle(x, y, r - 8);
  g.fillStyle(0xffffff, 0.35);
  g.fillCircle(x, y - (r - 8) * 0.3, (r - 8) * 0.6);
  return g;
}
