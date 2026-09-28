/**
 * Pasek ataków w dolnej belce bitwy — „co ma zrobić mój stworek".
 *
 * Stoi w miejscu kapsułki prognozy: gdy gracz ma turę i nie celuje, widzi
 * trzy przyciski ataków; gdy najedzie na wroga, pasek ustępuje prognozie
 * (liczonej już dla wybranego ataku). Wybór jest więc zawsze w dwóch krokach,
 * jak w pokemonach: najpierw atak, potem cel.
 *
 * Trzeci przycisk jest zawsze — zanim stworek ewoluuje, zablokowany
 * z podpisem „po ewolucji". Dziecko widzi, że jest o co grać. Specjalne
 * przed pierwszym zwykłym ciosem są zablokowane z podpisem „po 1. ciosie".
 *
 * Wygląd: pomarańczowe pigułki z numerem w kółku i licznikiem PP, wybrany
 * atak w żółtym pierścieniu, zablokowany — szary (`stylWalki.ts`).
 */
import Phaser from 'phaser';
import { atakiStworka, nazwaTrzeciego } from '../data/ataki';
import type { UnitDef } from '../data/units';
import { numerWKolku } from './hudWalki';
import { TUSZ, TUSZ_CSS, napisNaPigulce, pigulka, stylWalki } from './stylWalki';

export interface PasekAtakow {
  /**
   * Rysuje przyciski dla stworka: jego ataki, pozostałe PP i wybrany atak.
   * `naladowany` — czy zadał już zwykły cios (dopiero wtedy specjalne są gotowe).
   */
  pokaz(def: UnitDef, pp: readonly (number | null)[], wybrany: number, naladowany: boolean): void;
  setVisible(visible: boolean): void;
}

const ILE = 3;
const ODSTEP = 10;

export function createPasekAtakow(
  scene: Phaser.Scene,
  x: number,
  cy: number,
  w: number,
  h: number,
  onPick: (atak: number) => void
): PasekAtakow {
  const kontener = scene.add.container(0, 0).setDepth(63);
  const cw = (w - ODSTEP * (ILE - 1)) / ILE;
  const y = cy - h / 2;

  const przyciski = Array.from({ length: ILE }, (_, i) => {
    const px = x + i * (cw + ODSTEP);
    const g = scene.add.graphics();
    const [kolko, cyfra] = numerWKolku(scene, px + 17, cy, String(i + 1));
    const nazwa = scene.add.text(px + 33, cy - 1, '', stylWalki(14)).setOrigin(0, 0.5);
    const odznaka = scene.add.graphics();
    const pp = scene.add.text(px + cw - 14, cy, '', stylWalki(12, TUSZ_CSS)).setOrigin(1, 0.5);
    const strefa = scene.add.zone(px + cw / 2, cy, cw, h).setInteractive({ useHandCursor: true });
    let aktywny = false;
    strefa.on('pointerdown', () => {
      if (aktywny) onPick(i);
    });
    kontener.add([g, kolko, cyfra, nazwa, odznaka, pp, strefa]);
    return {
      rysuj(stan: 'wybrany' | 'gotowy' | 'pusty' | 'zablokowany', tNazwa: string, tPp: string) {
        aktywny = stan === 'gotowy' || stan === 'wybrany';
        strefa.input!.cursor = aktywny ? 'pointer' : 'default';
        const blady = stan === 'pusty' || stan === 'zablokowany';
        g.clear();
        pigulka(g, px, y, cw, h, blady ? 'szary' : 'pomaranczowy', { wybrana: stan === 'wybrany', r: 12 });
        kolko.clear();
        kolko.fillStyle(blady ? 0x8b93a0 : TUSZ, 1);
        kolko.fillCircle(px + 17, cy, 11);
        kolko.fillStyle(0xffffff, 1);
        kolko.fillCircle(px + 17, cy, 9);
        cyfra.setColor(blady ? '#8b93a0' : TUSZ_CSS);
        napisNaPigulce(nazwa, blady ? 'szary' : 'pomaranczowy');
        nazwa.setScale(1).setFontSize(stan === 'zablokowany' ? 12 : 14).setLineSpacing(-4);
        nazwa.setText(stan === 'zablokowany' ? `${tNazwa}\n${tPp}` : tNazwa);
        // Licznik PP w białej odznace po prawej.
        odznaka.clear();
        pp.setText(stan === 'zablokowany' ? '' : tPp).setColor(stan === 'pusty' ? '#c0280c' : TUSZ_CSS);
        if (pp.text) {
          const ow = Math.max(24, pp.width + 12);
          odznaka.fillStyle(blady ? 0x8b93a0 : TUSZ, 1);
          odznaka.fillRoundedRect(px + cw - 8 - ow, cy - 11, ow, 22, 8);
          odznaka.fillStyle(0xffffff, 1);
          odznaka.fillRoundedRect(px + cw - 6 - ow, cy - 9, ow - 4, 18, 6);
          pp.setX(px + cw - 8 - ow / 2).setOrigin(0.5, 0.5);
        }
        const miejsce = cw - 33 - (pp.text ? pp.width + 26 : 10);
        if (nazwa.width > miejsce) nazwa.setScale(Math.max(0.6, miejsce / nazwa.width));
      },
    };
  });

  return {
    pokaz(def, ppJednostki, wybrany, naladowany) {
      const ataki = atakiStworka(def);
      przyciski.forEach((p, i) => {
        const a = ataki[i];
        if (!a) {
          p.rysuj('zablokowany', nazwaTrzeciego(def), 'po ewolucji');
          return;
        }
        const zostalo = ppJednostki[i];
        // Specjalne ładują się zwykłym ciosem — do tego czasu zablokowane.
        if (i > 0 && !naladowany && (zostalo === null || zostalo === undefined || zostalo > 0)) {
          p.rysuj('zablokowany', a.nazwa, 'po 1. ciosie');
          return;
        }
        if (a.pp === null || zostalo === null || zostalo === undefined) {
          p.rysuj(i === wybrany ? 'wybrany' : 'gotowy', a.nazwa, '∞');
          return;
        }
        const napis = `${zostalo}/${a.pp}`;
        p.rysuj(zostalo <= 0 ? 'pusty' : i === wybrany ? 'wybrany' : 'gotowy', a.nazwa, napis);
      });
    },
    setVisible(visible) {
      kontener.setVisible(visible);
    },
  };
}
