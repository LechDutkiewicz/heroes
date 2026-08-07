/**
 * Podgląd ikon — osobna scena, żeby dało się je obejrzeć w powiększeniu bez
 * uruchamiania bitwy. Ikony rysujemy w kodzie, więc bez takiego arkusza
 * poprawianie ich byłoby zgadywaniem.
 *
 * Otwórz /icons.html przy działającym `npm run dev`.
 */

import Phaser from 'phaser';
import { ICON, buildIcons } from '../visual/icons';
import { C, H, FONT } from '../visual/theme';

class IconSheet extends Phaser.Scene {
  constructor() {
    super('icons');
  }

  create() {
    buildIcons(this);

    const g = this.add.graphics();
    g.fillGradientStyle(C.skyTop, C.skyTop, C.skyBottom, C.skyBottom, 1);
    g.fillRect(0, 0, this.scale.width, this.scale.height);

    const names = Object.entries(ICON);
    const cols = 5;
    const cell = 150;

    names.forEach(([label, key], i) => {
      const x = 110 + (i % cols) * cell;
      const y = 90 + Math.floor(i / cols) * cell;

      // Jasna i ciemna płytka pod ikoną: kontur musi trzymać się na obu,
      // bo w grze ikony leżą i na śniegu, i na nocnej łące.
      this.add.rectangle(x - 26, y, 52, 92, C.panel, 1).setOrigin(0.5);
      this.add.rectangle(x + 26, y, 52, 92, C.shadow, 1).setOrigin(0.5);

      this.add.image(x - 26, y - 18, key).setDisplaySize(40, 40);
      this.add.image(x + 26, y - 18, key).setDisplaySize(40, 40);
      // Docelowy rozmiar w grze — tu sprawdzamy, czy nie robi się z tego plama.
      this.add.image(x - 26, y + 26, key).setDisplaySize(14, 14);
      this.add.image(x + 26, y + 26, key).setDisplaySize(14, 14);

      this.add
        .text(x, y + 56, label, { fontFamily: FONT, fontSize: '13px', color: H.white })
        .setOrigin(0.5);
    });

    this.add.text(30, 26, 'Ikony — 40 px i 14 px, na jasnym i ciemnym tle', {
      fontFamily: FONT,
      fontSize: '20px',
      color: H.white,
      fontStyle: 'bold',
    });
  }
}

new Phaser.Game({
  type: Phaser.AUTO,
  parent: 'app',
  width: 860,
  height: 560,
  backgroundColor: '#0d1023',
  scene: [IconSheet],
});
