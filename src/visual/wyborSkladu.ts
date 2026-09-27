/**
 * Okno „Kto zaczyna?" przed bitwą.
 *
 * Na polu stoi jeden stworek (dzikie) albo dwa (trenerzy), a reszta drużyny
 * czeka w pokeballach i wchodzi po zemdlonych. Trener wybiera, kogo wysyła
 * na początek — widząc, z kim się bije. Domyślnie zaznaczeni są pierwsi
 * z drużyny, więc „Do boju!" od razu działa.
 */
import Phaser from 'phaser';
import { drawPanelBody, makeHudButton, mix, plate } from './hud';
import { C, H, body, display } from './theme';
import { ICON } from './icons';

export interface Kandydat {
  /** indeks wpisu w składzie z mapy */
  skad: number;
  sprite: string;
  nazwa: string;
  poziom: number;
}

export interface WyborSkladu {
  /** Zatwierdza bieżący wybór (klawisz Enter, sonda). */
  zatwierdz(): void;
}

export function pokazWyborSkladu(
  scene: Phaser.Scene,
  kandydaci: Kandydat[],
  maks: number,
  obszar: { x: number; y: number; w: number; h: number },
  gotowe: (wybrane: number[]) => void
): WyborSkladu {
  const warstwa = scene.add.container(0, 0).setDepth(150);
  // Przygaszenie planszy — okno jest jedyną rzeczą, z którą teraz się coś robi.
  const cien = scene.add.rectangle(obszar.x, obszar.y, obszar.w, obszar.h, C.shadow, 0.45).setOrigin(0, 0);
  cien.setInteractive();
  warstwa.add(cien);

  const KW = 84;
  const KH = 112;
  const ODST = 10;
  const w = Math.max(460, kandydaci.length * (KW + ODST) - ODST + 60);
  const h = 250;
  const x = obszar.x + (obszar.w - w) / 2;
  const y = obszar.y + (obszar.h - h) / 2;
  drawPanelBody(scene, x, y, w, h, 6, warstwa);

  warstwa.add(scene.add.text(x + w / 2, y + 26, 'Kto zaczyna?', display(22)).setOrigin(0.5));
  const podpis = scene.add.text(x + w / 2, y + 54, '', body(14, H.inkSoft)).setOrigin(0.5);
  warstwa.add(podpis);

  const wybrane = new Set(kandydaci.slice(0, maks).map((k) => k.skad));
  const x0 = x + (w - (kandydaci.length * (KW + ODST) - ODST)) / 2;
  const ky = y + 72;

  const karty = kandydaci.map((k, i) => {
    const kx = x0 + i * (KW + ODST);
    const g = scene.add.graphics();
    const obraz = scene.add.image(kx + KW / 2, ky + 48, scene.textures.exists(k.sprite) ? k.sprite : '__MISSING');
    obraz.setScale(Math.min(64 / obraz.width, 64 / obraz.height));
    const nazwa = scene.add
      .text(kx + KW / 2, ky + 86, k.nazwa, { ...body(12, H.ink), fontStyle: 'bold' })
      .setOrigin(0.5);
    if (nazwa.width > KW - 6) nazwa.setScale((KW - 6) / nazwa.width);
    const poz = scene.add.text(kx + KW / 2, ky + 101, `poz. ${k.poziom}`, body(11, H.inkSoft)).setOrigin(0.5);
    const znak = scene.add.text(kx + KW - 12, ky + 12, '✓', display(15)).setOrigin(0.5);
    const strefa = scene.add.zone(kx + KW / 2, ky + KH / 2, KW, KH).setInteractive({ useHandCursor: true });
    strefa.on('pointerdown', () => {
      if (wybrane.has(k.skad)) wybrane.delete(k.skad);
      else if (wybrane.size < maks) wybrane.add(k.skad);
      else if (maks === 1) {
        // Jeden na jednego: klik w innego stworka po prostu go wybiera.
        wybrane.clear();
        wybrane.add(k.skad);
      }
      odswiez();
    });
    warstwa.add([g, obraz, nazwa, poz, znak, strefa]);
    return {
      rysuj() {
        const tak = wybrane.has(k.skad);
        g.clear();
        plate(g, kx, ky, KW, KH, 12, tak ? C.gold : mix(C.panel, C.inkSoft, 0.2), tak ? C.goldDeep : C.panelEdge, {
          light: 0.3,
          dark: 0.24,
          gloss: tak ? 0.34 : 0.14,
          drop: tak ? 3 : 1,
        });
        obraz.setAlpha(tak ? 1 : 0.55);
        znak.setVisible(tak);
      },
    };
  });

  const przycisk = makeHudButton(scene, {
    x: x + w / 2,
    y: y + h - 28,
    w: 180,
    h: 36,
    icon: ICON.sword,
    tone: C.gold,
    toneDeep: C.goldDeep,
    depth: 151,
    onClick: () => zatwierdz(),
  });
  przycisk.setLabel('Do boju!  (Enter)');

  function odswiez() {
    karty.forEach((k) => k.rysuj());
    podpis.setText(
      maks === 1
        ? 'Kliknij stworka, który wychodzi pierwszy — reszta czeka w pokeballach'
        : `Kliknij dwa stworki na początek (${wybrane.size} z ${maks}) — reszta czeka w pokeballach`
    );
    przycisk.setEnabled(wybrane.size > 0);
  }
  odswiez();

  let zamkniete = false;
  const enter = () => zatwierdz();
  scene.input.keyboard?.on('keydown-ENTER', enter);
  function zatwierdz() {
    if (zamkniete || wybrane.size === 0) return;
    zamkniete = true;
    scene.input.keyboard?.off('keydown-ENTER', enter);
    przycisk.destroy();
    warstwa.destroy();
    // Kolejność na polu = kolejność w drużynie, nie kolejność klikania;
    // po nich wchodzą pozostali, też w kolejności drużyny.
    gotowe(kandydaci.filter((k) => wybrane.has(k.skad)).map((k) => k.skad));
  }
  return { zatwierdz };
}
