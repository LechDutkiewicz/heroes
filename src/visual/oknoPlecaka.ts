/**
 * Plecak trenera w bitwie — okienko z trzema przedmiotami (etap 5).
 *
 * Otwiera się spod przycisku „Plecak" w górnej belce, jak księga czarów
 * w Heroes 3. Każdy wiersz mówi, ile czego zostało i co robi; przedmiot,
 * którego teraz nie można użyć, jest przygaszony z powodem zamiast opisu
 * („tylko na dzikie stworki", „już użyty w tej rundzie").
 */
import Phaser from 'phaser';
import { PRZEDMIOTY, type Przedmiot } from '../data/przedmioty';
import { drawPanelBody, mix, plate } from './hud';
import { C, H, body } from './theme';
import { BARWA, KROJ } from './zestaw';

export interface WierszPlecaka {
  co: Przedmiot;
  tekstura: string;
  /** „× 2" albo „10 z 40" */
  ile: string;
  /** null — można użyć; inaczej powód, dla którego nie */
  blokada: string | null;
}

export function pokazPlecak(
  scene: Phaser.Scene,
  x: number,
  y: number,
  wiersze: WierszPlecaka[],
  wybierz: (co: Przedmiot) => void,
  zamknij: () => void
): Phaser.GameObjects.Container {
  const W = 360;
  const RH = 54;
  const H_ = 20 + wiersze.length * (RH + 6) + 8;
  const warstwa = scene.add.container(0, 0).setDepth(140);
  // Klik obok okienka je zamyka — jak menu, nie jak okno dialogowe.
  const tlo = scene.add
    .zone(0, 0, scene.scale.width, scene.scale.height)
    .setOrigin(0, 0)
    .setInteractive();
  tlo.on('pointerdown', () => zamknij());
  warstwa.add(tlo);
  drawPanelBody(scene, x, y, W, H_, 6, warstwa);

  wiersze.forEach((w, i) => {
    const ry = y + 14 + i * (RH + 6);
    const rx = x + 12;
    const rw = W - 24;
    const g = scene.add.graphics();
    const wolno = w.blokada === null;
    const zestaw = scene.textures.exists('z-pergamin');
    const rysuj = (nad: boolean) => {
      g.clear();
      if (zestaw) {
        // Wiersz na pergaminie: ciemniejszy pas z brązową kreską; pod kursorem złoci się.
        g.fillStyle(nad ? 0xf0cf7a : BARWA.papierCiemny, wolno ? (nad ? 0.9 : 0.7) : 0.4);
        g.fillRoundedRect(rx, ry, rw, RH, 10);
        g.lineStyle(1.2, BARWA.kreska, wolno ? 0.7 : 0.35);
        g.strokeRoundedRect(rx, ry, rw, RH, 10);
        return;
      }
      plate(
        g,
        rx,
        ry,
        rw,
        RH,
        14,
        wolno ? (nad ? mix(C.gold, C.white, 0.2) : mix(C.panel, C.gold, 0.35)) : mix(C.panel, C.inkSoft, 0.3),
        wolno ? C.goldDeep : C.panelEdge,
        { light: 0.26, dark: 0.22, gloss: wolno ? 0.28 : 0.1, drop: wolno ? 2 : 0 }
      );
    };
    rysuj(false);
    const obraz = scene.add.image(rx + 28, ry + RH / 2, w.tekstura);
    obraz.setScale(Math.min(40 / obraz.width, 40 / obraz.height)).setAlpha(wolno ? 1 : 0.5);
    const nazwa = scene.add
      .text(
        rx + 56,
        ry + 16,
        PRZEDMIOTY[w.co].nazwa,
        zestaw ? { fontFamily: KROJ.tytul, fontSize: '16px', color: BARWA.atrament } : { ...body(16, H.ink), fontStyle: 'bold' }
      )
      .setOrigin(0, 0.5)
      .setAlpha(wolno ? 1 : 0.7);
    const ile = scene.add
      .text(
        rx + rw - 12,
        ry + 16,
        w.ile,
        zestaw ? { fontFamily: KROJ.tekst, fontSize: '14px', color: BARWA.atrament, fontStyle: 'bold' } : { ...body(14, H.ink), fontStyle: 'bold' }
      )
      .setOrigin(1, 0.5);
    const opis = scene.add
      .text(
        rx + 56,
        ry + 37,
        w.blokada ?? PRZEDMIOTY[w.co].opis,
        zestaw
          ? { fontFamily: KROJ.kursywa, fontSize: '12px', color: wolno ? BARWA.atramentMiekki : BARWA.atramentCzerwony }
          : body(12, wolno ? H.inkSoft : '#b32d3f')
      )
      .setOrigin(0, 0.5);
    if (opis.width > rw - 66) opis.setScale((rw - 66) / opis.width);
    const strefa = scene.add.zone(rx + rw / 2, ry + RH / 2, rw, RH).setInteractive({ useHandCursor: wolno });
    strefa.on('pointerover', () => wolno && rysuj(true));
    strefa.on('pointerout', () => wolno && rysuj(false));
    strefa.on('pointerdown', () => {
      if (wolno) wybierz(w.co);
    });
    warstwa.add([g, obraz, nazwa, ile, opis, strefa]);
  });
  return warstwa;
}
