/**
 * Okno „Kto walczy?" przed bitwą.
 *
 * Trener wystawia dwa stworki; gdy sprawnych jest więcej, wybiera dwójkę
 * tuż przed walką — widząc, z kim się bije. Reszta drużyny w tej walce nie
 * bierze udziału. Domyślnie zaznaczeni są pierwsi z drużyny, więc
 * „Do boju!" od razu działa.
 *
 * Wygląd jak reszta ekranu walki (`stylWalki.ts`): biały panel z obrysem,
 * karty stworków w pokeballowych barwach, wybrane w żółtym pierścieniu.
 */
import Phaser from 'phaser';
import { przyciskWalki } from './hudWalki';
import { ICON } from './icons';
import { TUSZ, TUSZ_CSS, ZOLTY, panelBialy, stylWalki } from './stylWalki';

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
  const cien = scene.add.rectangle(obszar.x, obszar.y, obszar.w, obszar.h, TUSZ, 0.45).setOrigin(0, 0);
  cien.setInteractive();
  warstwa.add(cien);

  const KW = 84;
  const KH = 112;
  const ODST = 10;
  const w = Math.max(480, kandydaci.length * (KW + ODST) - ODST + 60);
  const h = 256;
  const x = obszar.x + (obszar.w - w) / 2;
  const y = obszar.y + (obszar.h - h) / 2;
  const tlo = scene.add.graphics();
  panelBialy(tlo, x, y, w, h, 20, { obrys: 4, cien: 6 });
  warstwa.add(tlo);

  warstwa.add(scene.add.text(x + w / 2, y + 28, 'Kto walczy?', stylWalki(24)).setOrigin(0.5));
  const podpis = scene.add.text(x + w / 2, y + 56, '', { ...stylWalki(14, '#5b6270', 800), fontStyle: 'italic 800' }).setOrigin(0.5);
  warstwa.add(podpis);

  const wybrane = new Set(kandydaci.slice(0, maks).map((k) => k.skad));
  const x0 = x + (w - (kandydaci.length * (KW + ODST) - ODST)) / 2;
  const ky = y + 74;

  const karty = kandydaci.map((k, i) => {
    const kx = x0 + i * (KW + ODST);
    const g = scene.add.graphics();
    const obraz = scene.add.image(kx + KW / 2, ky + 48, scene.textures.exists(k.sprite) ? k.sprite : '__MISSING');
    obraz.setScale(Math.min(62 / obraz.width, 62 / obraz.height));
    const nazwa = scene.add.text(kx + KW / 2, ky + 88, k.nazwa, stylWalki(12)).setOrigin(0.5);
    if (nazwa.width > KW - 8) nazwa.setScale((KW - 8) / nazwa.width);
    const poz = scene.add.text(kx + KW / 2, ky + 102, `poz. ${k.poziom}`, stylWalki(11, '#5b6270', 800)).setOrigin(0.5);
    const strefa = scene.add.zone(kx + KW / 2, ky + KH / 2, KW, KH).setInteractive({ useHandCursor: true });
    strefa.on('pointerdown', () => {
      if (wybrane.has(k.skad)) wybrane.delete(k.skad);
      else if (wybrane.size < maks) wybrane.add(k.skad);
      else if (maks === 1) {
        wybrane.clear();
        wybrane.add(k.skad);
      }
      odswiez();
    });
    warstwa.add([g, obraz, nazwa, poz, strefa]);
    return {
      rysuj() {
        const tak = wybrane.has(k.skad);
        g.clear();
        if (tak) {
          g.fillStyle(TUSZ, 1);
          g.fillRoundedRect(kx - 5, ky - 5, KW + 10, KH + 10, 16);
          g.fillStyle(ZOLTY, 1);
          g.fillRoundedRect(kx - 2, ky - 2, KW + 4, KH + 4, 14);
        }
        panelBialy(g, kx, ky, KW, KH, 12, { obrys: 3, cien: tak ? 0 : 3, wypelnienie: tak ? 0xe6efff : 0xffffff });
        obraz.setAlpha(tak ? 1 : 0.55);
        nazwa.setColor(tak ? TUSZ_CSS : '#8b93a0');
      },
    };
  });

  const przycisk = przyciskWalki(scene, {
    x: x + w / 2,
    y: y + h - 30,
    w: 196,
    h: 40,
    kolor: 'czerwony',
    ikona: ICON.sword,
    depth: 151,
    onClick: () => zatwierdz(),
  });
  przycisk.setLabel('Do boju!  (Enter)');

  function odswiez() {
    karty.forEach((k) => k.rysuj());
    podpis.setText(
      maks === 1
        ? 'Kliknij stworka, który walczy'
        : `Kliknij dwa stworki (${wybrane.size} z ${maks}) — reszta drużyny tę walkę przeczeka`
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
    // Kolejność na polu = kolejność w drużynie, nie kolejność klikania.
    gotowe(kandydaci.filter((k) => wybrane.has(k.skad)).map((k) => k.skad));
  }
  return { zatwierdz };
}
