/**
 * Wspólne narzędzia rysowania: mieszanie barw, „plakietka" (`plate`) z cieniem,
 * obrysem, gradientem i połyskiem, gradient napisu i mrugnięcie panelu.
 * Używają ich plakietki stworków na planszy (`unitView.ts`), efekty i ekrany
 * poza bitwą. Sam HUD walki jest w `hudWalki.ts` (styl z gier Pokémon).
 *
 * Język warstw: cień, ciemny obrys rysowany jako WIĘKSZY wypełniony kształt
 * (nie linia, bo linia 1,5 px ginie), wypełnienie, gradient krojony na pasy
 * i połysk w górnych ~36%.
 */

import Phaser from 'phaser';
import { C, T } from './theme';

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

/** Krótkie mrugnięcie panelu przy zmianie oddziału — sygnał „to już inny". */
export function blinkPanel(scene: Phaser.Scene, target: Phaser.GameObjects.GameObject) {
  scene.tweens.add({
    targets: target,
    alpha: { from: 0.72, to: 1 },
    duration: T.pop,
    ease: 'Quad.easeOut',
  });
}
