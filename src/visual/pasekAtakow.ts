/**
 * Pasek ataków w dolnej belce bitwy — „co ma zrobić mój stworek".
 *
 * Stoi w miejscu kapsułki prognozy: gdy gracz ma turę i nie celuje, widzi
 * trzy przyciski ataków; gdy najedzie na wroga, pasek ustępuje prognozie
 * (liczonej już dla wybranego ataku). Wybór jest więc zawsze w dwóch krokach,
 * jak w pokemonach: najpierw atak, potem cel.
 *
 * Trzeci przycisk jest zawsze — zanim stworek ewoluuje, zablokowany
 * z podpisem „po ewolucji". Dziecko widzi, że jest o co grać.
 */
import Phaser from 'phaser';
import { atakiStworka, nazwaTrzeciego } from '../data/ataki';
import type { UnitDef } from '../data/units';
import { mix, plate, stylNaDrewnie } from './hud';
import { KROJ } from './zestaw';
import { C, H, body } from './theme';

export interface PasekAtakow {
  /**
   * Rysuje przyciski dla stworka: jego ataki, pozostałe PP i wybrany atak.
   * `naladowany` — czy zadał już zwykły cios (dopiero wtedy specjalne są gotowe).
   */
  pokaz(def: UnitDef, pp: readonly (number | null)[], wybrany: number, naladowany: boolean): void;
  setVisible(visible: boolean): void;
}

const ILE = 3;
const ODSTEP = 6;

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

  // Na zestawie ataki to tabliczki: złota — wybrany, drewniana — gotowy,
  // wyblakła — bez PP albo przed ewolucją.
  const zestaw = scene.textures.exists('z-tabliczka-drewno');
  const przyciski = Array.from({ length: ILE }, (_, i) => {
    const px = x + i * (cw + ODSTEP);
    const g = scene.add.graphics();
    const tabliczka = (klucz: string) =>
      scene.add
        .nineslice(px + cw / 2, cy, klucz, undefined, cw * 2, h * 2, 40, 40, 30, 30)
        .setScale(0.5)
        .setOrigin(0.5)
        .setVisible(false);
    const skory = zestaw
      ? {
          wybrany: tabliczka('z-tabliczka-zloto'),
          gotowy: tabliczka('z-tabliczka-drewno'),
          // Wyblakła drewniana, nie szara „-wyl" — ciemny łupek odstawał od reszty paska.
          pusty: tabliczka('z-tabliczka-drewno').setAlpha(0.5),
        }
      : undefined;
    if (skory) kontener.add(Object.values(skory));
    const znak = scene.add.graphics();
    const cyfra = scene.add
      .text(px + 14, cy, String(i + 1), { ...body(13, H.white), fontStyle: 'bold' })
      .setOrigin(0.5);
    const nazwa = scene.add
      .text(px + 28, cy, '', { ...body(14, H.ink), fontStyle: 'bold' })
      .setOrigin(0, 0.5);
    const pp = scene.add.text(px + cw - 10, cy, '', { ...body(12, H.inkSoft), fontStyle: 'bold' }).setOrigin(1, 0.5);
    const strefa = scene.add.zone(px + cw / 2, cy, cw, h).setInteractive({ useHandCursor: true });
    let aktywny = false;
    strefa.on('pointerdown', () => {
      if (aktywny) onPick(i);
    });
    kontener.add([g, znak, cyfra, nazwa, pp, strefa]);
    return {
      px,
      rysuj(stan: 'wybrany' | 'gotowy' | 'pusty' | 'zablokowany', tNazwa: string, tPp: string) {
        aktywny = stan === 'gotowy' || stan === 'wybrany';
        strefa.input!.cursor = aktywny ? 'pointer' : 'default';
        if (skory) {
          g.clear();
          znak.clear();
          skory.wybrany.setVisible(stan === 'wybrany');
          skory.gotowy.setVisible(stan === 'gotowy');
          skory.pusty.setVisible(stan === 'pusty' || stan === 'zablokowany');
          const zloto = stan === 'wybrany';
          const blady = stan === 'pusty' || stan === 'zablokowany';
          const styl = zloto
            ? { fontFamily: KROJ.tytul, fontSize: '14px', color: '#3b1f08', stroke: '#000', strokeThickness: 0 }
            : stylNaDrewnie(14);
          cyfra.setStyle({ ...styl, fontSize: '13px' }).setAlpha(blady ? 0.5 : 0.85);
          nazwa.setStyle(styl).setAlpha(blady ? 0.55 : 1);
          pp.setStyle({ ...styl, fontSize: '12px' }).setAlpha(blady ? 0.6 : 0.9);
          if (stan === 'pusty') pp.setColor('#ffb4a0');
          nazwa.setText(stan === 'zablokowany' ? `${tNazwa}\n${tPp}` : tNazwa).setLineSpacing(-3);
          pp.setText(stan === 'zablokowany' ? '' : tPp);
          const miejsce = cw - 28 - pp.width - 14;
          const skala = Math.min(stan === 'zablokowany' ? 0.78 : 1, miejsce / nazwa.width, (h - 6) / nazwa.height);
          nazwa.setScale(Math.max(0.55, skala));
          return;
        }
        const fill =
          stan === 'wybrany' ? C.gold : stan === 'gotowy' ? mix(C.panel, C.ally, 0.12) : mix(C.panel, C.inkSoft, 0.35);
        const edge = stan === 'wybrany' ? C.goldDeep : stan === 'gotowy' ? C.allyDeep : mix(C.inkSoft, C.shadow, 0.3);
        g.clear();
        plate(g, px, y, cw, h, h / 2, fill, edge, {
          light: 0.3,
          dark: 0.26,
          gloss: stan === 'wybrany' ? 0.36 : 0.2,
          drop: stan === 'wybrany' ? 3 : 1,
        });
        znak.clear();
        znak.fillStyle(stan === 'wybrany' ? C.goldDeep : stan === 'gotowy' ? C.allyDeep : C.inkSoft, 1);
        znak.fillCircle(px + 14, cy, 9);
        const blady = stan === 'pusty' || stan === 'zablokowany';
        nazwa.setText(tNazwa).setColor(blady ? H.inkSoft : H.ink).setAlpha(blady ? 0.8 : 1).setScale(1);
        pp.setText(tPp).setColor(stan === 'pusty' ? '#b32d3f' : H.inkSoft);
        if (stan === 'zablokowany') {
          // Nazwa i „po ewolucji" w dwóch wierszach — w jednym nachodziły na siebie.
          nazwa.setText(`${tNazwa}\n${tPp}`).setLineSpacing(-2);
          pp.setText('');
        } else {
          nazwa.setLineSpacing(0);
        }
        const miejsce = cw - 28 - pp.width - 14;
        const skala = Math.min(stan === 'zablokowany' ? 0.8 : 1, miejsce / nazwa.width, (h - 4) / nazwa.height);
        nazwa.setScale(Math.max(0.6, skala));
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
