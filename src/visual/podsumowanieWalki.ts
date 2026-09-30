/**
 * Podsumowanie walki — jak ekran po bitwie w Heroes 3: kto padł po obu
 * stronach, ile doświadczenia, kto awansował i ewoluował. Dwa wyjścia:
 * „Dalej" (przyjmij wynik) albo „Jeszcze raz" (rozegraj tę samą walkę od
 * nowa, jak restart bitwy w HotA).
 *
 * Wygląd jak reszta ekranu walki (`stylWalki.ts`): biały panel z obrysem,
 * karty stworków, pigułki przycisków.
 */
import Phaser from 'phaser';
import type { WierszDruzyny } from '../data/podsumowanie';
import { przyciskWalki } from './hudWalki';
import { ICON } from './icons';
import { CZERWIEN, TUSZ, TUSZ_CSS, panelBialy, stylWalki } from './stylWalki';

export interface DanePodsumowania {
  wygrana: boolean;
  /** Drużyna gracza po walce (podgląd `rozliczDruzyne`). */
  wiersze: WierszDruzyny[];
  /** Pokonani przeciwnicy (nazwa, rysunek). */
  pokonani: { nazwa: string; sprite: string }[];
  /** Złapane dzikie stworki. */
  zlapani: string[];
  /** Doświadczenie bohatera (0 — bez). */
  doswBohatera: number;
  /** Jak doszło do awansu bohatera — napis albo nic. */
  awansBohatera?: string;
}

export function pokazPodsumowanieWalki(
  scene: Phaser.Scene,
  d: DanePodsumowania,
  obszar: { x: number; y: number; w: number; h: number },
  dalej: () => void,
  jeszczeRaz: () => void
) {
  const warstwa = scene.add.container(0, 0).setDepth(900);
  const cien = scene.add.rectangle(0, 0, scene.scale.width, scene.scale.height, TUSZ, 0.55).setOrigin(0, 0);
  cien.setInteractive();
  warstwa.add(cien);

  const KW = 96;
  const KH = 128;
  const ODST = 12;
  const n = Math.max(1, d.wiersze.length);
  const w = Math.max(560, n * (KW + ODST) - ODST + 80);
  const h = 470;
  const x = obszar.x + (obszar.w - w) / 2;
  const y = obszar.y + (obszar.h - h) / 2;
  const tlo = scene.add.graphics();
  panelBialy(tlo, x, y, w, h, 20, { obrys: 4, cien: 6 });
  // Czerwona (porażka) albo niebieska (wygrana) belka tytułu.
  tlo.fillStyle(d.wygrana ? 0x3a6fd8 : CZERWIEN, 1);
  tlo.fillRoundedRect(x + 4, y + 4, w - 8, 46, { tl: 16, tr: 16, bl: 0, br: 0 });
  warstwa.add(tlo);
  const tytul = scene.add
    .text(x + w / 2, y + 27, d.wygrana ? 'Zwycięstwo!' : 'Porażka', stylWalki(26, '#ffffff'))
    .setOrigin(0.5)
    .setShadow(0, 2, 'rgba(0,0,0,0.35)', 0, false, true);
  warstwa.add(tytul);

  // Straty przeciwnika — małe portrety, jak w oknie po bitwie w Heroes 3.
  warstwa.add(
    scene.add.text(x + w / 2, y + 68, `Pokonani przeciwnicy: ${d.pokonani.length}`, stylWalki(14, '#5b6270', 800)).setOrigin(0.5)
  );
  const P = 44;
  const px0 = x + w / 2 - (d.pokonani.length * (P + 6) - 6) / 2;
  d.pokonani.forEach((pk, i) => {
    const g = scene.add.graphics();
    const cx = px0 + i * (P + 6);
    g.fillStyle(0xf1f3f7, 1);
    g.fillRoundedRect(cx, y + 80, P, P, 10);
    g.lineStyle(2, TUSZ, 1);
    g.strokeRoundedRect(cx, y + 80, P, P, 10);
    const im = scene.add.image(cx + P / 2, y + 80 + P / 2, scene.textures.exists(pk.sprite) ? pk.sprite : '__MISSING');
    im.setScale(Math.min((P - 6) / im.width, (P - 6) / im.height));
    warstwa.add([g, im]);
  });
  // Złapani i doświadczenie trenera.
  const linia = [
    d.zlapani.length ? `Złapany: ${d.zlapani.join(', ')}` : '',
    d.doswBohatera ? `Trener: +${d.doswBohatera} doświadczenia` : '',
  ]
    .filter(Boolean)
    .join('   ·   ');
  if (linia) warstwa.add(scene.add.text(x + w / 2, y + 142, linia, stylWalki(15, TUSZ_CSS, 800)).setOrigin(0.5));
  if (d.awansBohatera)
    warstwa.add(scene.add.text(x + w / 2, y + 162, d.awansBohatera, stylWalki(15, '#c92a09', 900)).setOrigin(0.5));

  warstwa.add(scene.add.text(x + w / 2, y + 186, 'Twoja drużyna', stylWalki(14, '#5b6270', 800)).setOrigin(0.5));
  const x0 = x + (w - (n * (KW + ODST) - ODST)) / 2;
  const ky = y + 202;
  d.wiersze.forEach((r, i) => {
    const kx = x0 + i * (KW + ODST);
    const g = scene.add.graphics();
    const padl = r.zemdlal && !r.uzdrowiony;
    panelBialy(g, kx, ky, KW, KH, 12, { obrys: 3, cien: 3, wypelnienie: padl ? 0xf1f3f7 : 0xffffff });
    const obraz = scene.add.image(kx + KW / 2, ky + 44, scene.textures.exists(r.sprite) ? r.sprite : '__MISSING');
    obraz.setScale(Math.min(66 / obraz.width, 66 / obraz.height));
    if (padl) obraz.setTint(0x9aa0aa).setAlpha(0.7);
    const nazwa = scene.add.text(kx + KW / 2, ky + 86, r.nazwa, stylWalki(12)).setOrigin(0.5);
    if (nazwa.width > KW - 8) nazwa.setScale((KW - 8) / nazwa.width);
    const stan = padl
      ? 'zemdlał'
      : r.uzdrowiony
        ? 'uzdrowiony'
        : r.ewolucja
          ? `→ ${r.ewolucja.na}!`
          : r.poziom > r.poziomPrzed
            ? `poz. ${r.poziomPrzed} → ${r.poziom}!`
            : `poz. ${r.poziom}`;
    const wyroznij = !padl && (r.ewolucja || r.poziom > r.poziomPrzed);
    const t1 = scene.add
      .text(kx + KW / 2, ky + 102, stan, stylWalki(12, padl ? '#8b93a0' : wyroznij ? '#c92a09' : '#5b6270', 900))
      .setOrigin(0.5);
    if (t1.width > KW - 6) t1.setScale((KW - 6) / t1.width);
    const t2 = scene.add
      .text(kx + KW / 2, ky + 117, r.dosw ? `+${r.dosw} dośw.` : '', stylWalki(11, '#34a85a', 900))
      .setOrigin(0.5);
    warstwa.add([g, obraz, nazwa, t1, t2]);
  });
  if (!d.wiersze.length)
    warstwa.add(scene.add.text(x + w / 2, ky + KH / 2, '—', stylWalki(18, '#8b93a0')).setOrigin(0.5));

  const podpis = d.wygrana
    ? 'Dalej — wynik zostaje. Jeszcze raz — ta sama walka od początku.'
    : 'Jeszcze raz — ta sama walka od początku. Dalej — trener się cofa.';
  warstwa.add(
    scene.add
      .text(x + w / 2, y + h - 78, podpis, { ...stylWalki(13, '#5b6270', 800), fontStyle: 'italic 800' })
      .setOrigin(0.5)
  );

  let zamkniete = false;
  const zamknij = (co: () => void) => {
    if (zamkniete) return;
    zamkniete = true;
    scene.input.keyboard?.off('keydown-ENTER', enter);
    przyciski.forEach((p) => p.destroy());
    warstwa.destroy();
    co();
  };
  const enter = () => zamknij(dalej);
  scene.input.keyboard?.on('keydown-ENTER', enter);
  const przyciski = [
    przyciskWalki(scene, {
      x: x + w / 2 - 110,
      y: y + h - 36,
      w: 196,
      h: 42,
      kolor: 'bialy',
      ikona: ICON.hourglass,
      depth: 901,
      onClick: () => zamknij(jeszczeRaz),
    }),
    przyciskWalki(scene, {
      x: x + w / 2 + 110,
      y: y + h - 36,
      w: 196,
      h: 42,
      kolor: d.wygrana ? 'niebieski' : 'czerwony',
      ikona: ICON.star,
      depth: 901,
      onClick: () => zamknij(dalej),
    }),
  ];
  przyciski[0].setLabel('Jeszcze raz');
  przyciski[1].setLabel('Dalej  (Enter)');
}
