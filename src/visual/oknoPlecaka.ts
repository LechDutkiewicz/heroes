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
import { TUSZ, TUSZ_CSS, panelBialy, stylWalki } from './stylWalki';

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
  const tloOkna = scene.add.graphics();
  panelBialy(tloOkna, x, y, W, H_, 18, { obrys: 4, cien: 5 });
  warstwa.add(tloOkna);

  wiersze.forEach((w, i) => {
    const ry = y + 14 + i * (RH + 6);
    const rx = x + 12;
    const rw = W - 24;
    const g = scene.add.graphics();
    const wolno = w.blokada === null;
    // Wiersz jak przycisk z gry: biały z obrysem, pod kursorem żółty.
    const rysuj = (nad: boolean) => {
      g.clear();
      g.fillStyle(wolno ? TUSZ : 0xb9c0c9, 1);
      g.fillRoundedRect(rx, ry, rw, RH, 12);
      g.fillStyle(!wolno ? 0xeef1f5 : nad ? 0xffe27a : 0xffffff, 1);
      g.fillRoundedRect(rx + 2.5, ry + 2.5, rw - 5, RH - 5, 10);
    };
    rysuj(false);
    const obraz = scene.add.image(rx + 28, ry + RH / 2, w.tekstura);
    obraz.setScale(Math.min(40 / obraz.width, 40 / obraz.height)).setAlpha(wolno ? 1 : 0.5);
    const nazwa = scene.add
      .text(rx + 56, ry + 16, PRZEDMIOTY[w.co].nazwa, stylWalki(16, wolno ? TUSZ_CSS : '#8b93a0'))
      .setOrigin(0, 0.5);
    const ile = scene.add.text(rx + rw - 12, ry + 16, w.ile, stylWalki(14, wolno ? TUSZ_CSS : '#8b93a0')).setOrigin(1, 0.5);
    const opis = scene.add
      .text(rx + 56, ry + 37, w.blokada ?? PRZEDMIOTY[w.co].opis, stylWalki(12, wolno ? '#5b6270' : '#c0280c', 800))
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
