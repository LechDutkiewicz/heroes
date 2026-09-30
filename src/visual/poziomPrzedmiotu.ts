/**
 * Poziom przedmiotu trenera — jak poziom czaru w gildii magów Heroes 3:
 * od razu widać, z którego piętra Pokémartu jest przedmiot, a wyższe
 * piętro znaczy mocniejszy towar.
 *
 * Barwy z gier Pokémon: poziom I jak zwykły Poké Ball (czerwień), II jak
 * Great Ball (niebieski), III jak Ultra Ball (złoto na czerni).
 */
import Phaser from 'phaser';
import { stylWalki, TUSZ } from './stylWalki';

export const BARWY_POZIOMU: Record<1 | 2 | 3, { tlo: number; jasne: number; tekst: string }> = {
  1: { tlo: 0xd8412f, jasne: 0xfbe3df, tekst: '#ffffff' },
  2: { tlo: 0x3a7ad8, jasne: 0xdfe9fa, tekst: '#ffffff' },
  3: { tlo: 0x26262e, jasne: 0xfbf1cc, tekst: '#f5c518' },
};

export const RZYMSKIE = ['', 'I', 'II', 'III'] as const;

/** Mała pigułka „I" / „II" / „III" w barwie poziomu, środkiem w (x, y). */
export function odznakaPoziomu(scene: Phaser.Scene, x: number, y: number, poziom: 1 | 2 | 3, wys = 18) {
  const b = BARWY_POZIOMU[poziom];
  const szer = wys + (poziom - 1) * wys * 0.36;
  const g = scene.add.graphics();
  g.fillStyle(TUSZ, 1);
  g.fillRoundedRect(x - szer / 2 - 2, y - wys / 2 - 2, szer + 4, wys + 4, (wys + 4) / 2);
  g.fillStyle(b.tlo, 1);
  g.fillRoundedRect(x - szer / 2, y - wys / 2, szer, wys, wys / 2);
  const t = scene.add.text(x, y + 0.5, RZYMSKIE[poziom], stylWalki(Math.round(wys * 0.72), b.tekst, 900)).setOrigin(0.5);
  return [g, t] as const;
}
