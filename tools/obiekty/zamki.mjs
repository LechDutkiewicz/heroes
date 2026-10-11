// Zamki na mapie przygody: leśny (gracz, frakcja „bor”) i ognisty
// (przeciwnik). Ten sam pędzel co reszta obiektów; bryła 3 × 2 pola NAD
// wejściem, brama pośrodku dolnej krawędzi płótna.

import { P, PAL, f, pts, los, mix, sciezka, wypelnij, murKamienny, dachowka, okno, drzewo, krzaczek, placek, naZiemi, svgObiektu, uid } from './pedzel.mjs';
import { proporzec } from './obiekty.mjs';

/** Barwy zamku: kamień murów, dach, akcenty. */
const STYL = {
  las: {
    kJ: '#efe4c8',
    k: '#cdbf9c',
    kC: '#8f8164',
    kCC: '#5a4f3c',
    dach: '#4f8a46',
    dachJ: '#86c070',
    dachC: '#284f26',
    flaga: '#c4473a',
    okno: PAL.oknoSwiatlo,
  },
  ogien: {
    kJ: '#9a8f88',
    k: '#6e6460',
    kC: '#4a423f',
    kCC: '#2c2523',
    dach: '#b23a24',
    dachJ: '#e0703f',
    dachC: '#6a1c12',
    flaga: '#2b2523',
    okno: '#ff9a3a',
  },
};

/** Ściana z kamienia w kolorach stylu (front w świetle). */
function sciana(st, x, y, w, h, z, { cien = 0 } = {}) {
  const d = sciezka([
    [x, y],
    [x, y - h],
    [x + w, y - h],
    [x + w, y],
  ]);
  let s = wypelnij(d, st.k, murKamienny(x, y - h, w, h, { blok: 14, ziarno: z, kolorC: st.kC, jasny: st.kJ }));
  if (cien) s += `<path d="${d}" fill="#120a04" opacity="${cien}"/>`;
  return s;
}

/** Blanki na górze muru: zęby z jasnym wierzchem. */
function blanki(st, x, y, w, { zab = 12, wys = 9 } = {}) {
  let s = `<rect x="${f(x - 2)}" y="${f(y - 3)}" width="${f(w + 4)}" height="5" fill="${st.kJ}"/>`;
  for (let xx = x; xx < x + w - 2; xx += zab * 1.7) {
    s += `<rect x="${f(xx)}" y="${f(y - 3 - wys)}" width="${f(zab)}" height="${wys}" fill="${st.k}"/>`;
    s += `<rect x="${f(xx)}" y="${f(y - 3 - wys)}" width="${f(zab)}" height="2.5" fill="${st.kJ}"/>`;
    s += `<rect x="${f(xx + zab - 3)}" y="${f(y - 3 - wys)}" width="3" height="${wys}" fill="${st.kC}"/>`;
  }
  return s;
}

/** Okrągła baszta: walec (światło z lewej), blanki albo stożkowy dach. */
function baszta(st, cx, y, r, h, { dachH = 0, z = 1, okna = 1 } = {}) {
  const id = uid('b');
  const top = y - h;
  const ry = r * 0.32;
  const d = `M${f(cx - r)} ${f(top)} V${f(y)} A${f(r)} ${f(ry)} 0 0 0 ${f(cx + r)} ${f(y)} V${f(top)} Z`;
  let s = `<clipPath id="${id}"><path d="${d}"/></clipPath>`;
  s += `<path d="${d}" fill="${st.k}"/>`;
  s += `<g clip-path="url(#${id})">${murKamienny(cx - r, top - 4, 2 * r, h + ry + 6, { blok: 11, ziarno: z, kolorC: st.kC, jasny: st.kJ })}
    <rect x="${f(cx - r)}" y="${f(top)}" width="${f(r * 0.45)}" height="${f(h + ry)}" fill="#fff" opacity="0.16"/>
    <rect x="${f(cx + r * 0.15)}" y="${f(top)}" width="${f(r)}" height="${f(h + ry)}" fill="#120a04" opacity="0.3"/>
    <rect x="${f(cx + r * 0.6)}" y="${f(top)}" width="${f(r)}" height="${f(h + ry)}" fill="#120a04" opacity="0.2"/></g>`;
  for (let i = 0; i < okna; i++) s += okno(cx - r * 0.25, top + 18 + i * 30, 7, 11, { swieci: true, krzyz: false });
  if (dachH) {
    const dd = `M${f(cx - r - 7)} ${f(top + 2)} A${f(r + 7)} ${f(ry + 3)} 0 0 0 ${f(cx + r + 7)} ${f(top + 2)} L${f(cx)} ${f(top - dachH)} Z`;
    const id2 = uid('d');
    s += `<clipPath id="${id2}"><path d="${dd}"/></clipPath><path d="${dd}" fill="${st.dach}"/>`;
    s += `<g clip-path="url(#${id2})">${dachowka(cx - r - 8, top - dachH, 2 * r + 16, dachH + ry + 6, { rzad: 7, luska: 8, kolorC: st.dachC, jasny: st.dachJ })}
      <path d="M${f(cx)} ${f(top - dachH)} L${f(cx + r + 8)} ${f(top + 4)} L${f(cx + r + 8)} ${f(top - dachH)} Z" fill="#120a04" opacity="0.3"/>
      <path d="M${f(cx)} ${f(top - dachH)} L${f(cx - r - 8)} ${f(top + 4)} L${f(cx - r * 0.4)} ${f(top + 4)} Z" fill="#fff" opacity="0.14"/></g>`;
    s += `<path d="M${f(cx - r - 7)} ${f(top + 2)} A${f(r + 7)} ${f(ry + 3)} 0 0 0 ${f(cx + r + 7)} ${f(top + 2)}" stroke="${st.dachC}" stroke-width="3" fill="none"/>`;
    s += `<circle cx="${f(cx)}" cy="${f(top - dachH)}" r="2.6" fill="${PAL.zloto}"/>`;
  } else {
    s += `<ellipse cx="${f(cx)}" cy="${f(top)}" rx="${f(r + 3)}" ry="${f(ry + 1)}" fill="${st.kC}"/><ellipse cx="${f(cx)}" cy="${f(top)}" rx="${f(r - 2)}" ry="${f(ry - 2)}" fill="${st.kCC}"/>`;
    for (let i = 0; i < 5; i++) {
      const a = Math.PI * (0.1 + i * 0.2);
      const bx = cx - Math.cos(a) * (r + 1);
      s += `<rect x="${f(bx - 4)}" y="${f(top - 8 + Math.sin(a) * ry)}" width="8" height="9" fill="${i < 2 ? st.kJ : st.k}"/>`;
    }
  }
  return s;
}

/** Brama: łuk, wrota z desek, krata, płaskorzeźba nad łukiem. */
function brama(st, cx, y, w, h) {
  const r = w / 2;
  let s = `<path d="M${f(cx - r - 6)} ${f(y)} V${f(y - h + r)} A${f(r + 6)} ${f(r + 6)} 0 0 1 ${f(cx + r + 6)} ${f(y - h + r)} V${f(y)} Z" fill="${st.kJ}"/>`;
  s += `<path d="M${f(cx - r)} ${f(y)} V${f(y - h + r)} A${f(r)} ${f(r)} 0 0 1 ${f(cx + r)} ${f(y - h + r)} V${f(y)} Z" fill="#1a110a"/>`;
  // otwarte wrota po bokach
  s += `<path d="M${f(cx - r + 2)} ${f(y)} V${f(y - h + r + 4)} L${f(cx - r + 9)} ${f(y - h + r + 8)} V${f(y - 2)} Z" fill="${PAL.drewno}"/>`;
  s += `<path d="M${f(cx + r - 2)} ${f(y)} V${f(y - h + r + 4)} L${f(cx + r - 9)} ${f(y - h + r + 8)} V${f(y - 2)} Z" fill="${PAL.drewnoC}"/>`;
  // krata podniesiona
  for (let xx = cx - r + 10; xx < cx + r - 8; xx += 6) s += `<line x1="${f(xx)}" y1="${f(y - h + r - 4)}" x2="${f(xx)}" y2="${f(y - h + r + 8)}" stroke="#3a3330" stroke-width="2"/>`;
  s += `<path d="M${f(cx - r + 4)} ${f(y - h + r + 8)} H${f(cx + r - 4)}" stroke="#3a3330" stroke-width="2"/>`;
  // posadzka bramy (jasny bruk wychodzący na pole wejścia)
  s += `<path d="M${f(cx - r)} ${f(y)} L${f(cx - r - 4)} ${f(y + 3)} L${f(cx + r + 4)} ${f(y + 3)} L${f(cx + r)} ${f(y)} Z" fill="${st.kC}"/>`;
  return s;
}

/** Dom w obrębie murów: blok z dwuspadowym dachem (widoczny nad murem). */
function domMiasta(st, x, y, w, h, dachH, z) {
  let s = sciana(st, x, y, w, h, z);
  s += `<rect x="${f(x + w * 0.6)}" y="${f(y - h)}" width="${f(w * 0.4)}" height="${h}" fill="#120a04" opacity="0.25"/>`;
  const d = sciezka([
    [x - 5, y - h + 2],
    [x + w * 0.5, y - h - dachH],
    [x + w + 5, y - h + 2],
  ]);
  s += wypelnij(d, st.dach, dachowka(x - 5, y - h - dachH, w + 10, dachH + 4, { rzad: 6, luska: 8, kolorC: st.dachC, jasny: st.dachJ }), { swiatlo: 'swiatloL' });
  s += `<path d="${sciezka([
    [x + w * 0.5, y - h - dachH],
    [x + w + 5, y - h + 2],
    [x + w * 0.62, y - h + 2],
  ])}" fill="#120a04" opacity="0.28"/>`;
  s += okno(x + w * 0.3, y - h + 8, 7, 9, { swieci: true, krzyz: false });
  return s;
}

function zamek(rodzaj) {
  const st = STYL[rodzaj];
  const W = 4.2 * P;
  const H = 3.9 * P;
  const y = H - 3;
  const cx = W / 2;
  const r = los(rodzaj === 'las' ? 5 : 9);
  let s = '';
  s += placek(cx, y - 30, 190, 46, { kolor: rodzaj === 'las' ? PAL.ziemia : '#6a4a32', krycie: 0.55 });

  // ── tył: mur tylny z basztami
  const yb = y - 150;
  s += naZiemi(
    yb,
    sciana(st, cx - 140, yb, 280, 46, 21, { cien: 0.18 }) +
      blanki(st, cx - 140, yb - 46, 280) +
      baszta(st, cx - 140, yb + 4, 24, 74, { dachH: rodzaj === 'las' ? 46 : 54, z: 22 }) +
      baszta(st, cx + 140, yb + 4, 24, 74, { dachH: rodzaj === 'las' ? 46 : 54, z: 23 })
  );
  // ── środek: donżon z wysoką wieżą i domy
  const yk = y - 96;
  let srodek = '';
  srodek += domMiasta(st, cx - 120, yk + 6, 50, 34, 26, 31);
  srodek += domMiasta(st, cx + 72, yk + 8, 48, 32, 24, 32);
  srodek += sciana(st, cx - 62, yk, 124, 92, 33);
  srodek += `<rect x="${f(cx + 20)}" y="${f(yk - 92)}" width="42" height="92" fill="#120a04" opacity="0.28"/>`;
  for (const ox of [-46, -14, 18]) srodek += okno(cx + ox, yk - 66, 10, 16, { swieci: true });
  srodek += blanki(st, cx - 62, yk - 92, 124, { zab: 11 });
  srodek += baszta(st, cx + 4, yk - 88, 30, 96, { dachH: rodzaj === 'las' ? 92 : 78, z: 34, okna: 2 });
  if (rodzaj === 'ogien') {
    // kolce na dachu wieży i żar w oknach
    srodek += `<path d="M${f(cx - 6)} ${f(yk - 270)} l10 -24 l10 24 Z" fill="${st.kCC}"/>`;
  }
  srodek += proporzec(cx + 4, yk - 88 - 96 - (rodzaj === 'las' ? 92 : 78) + 2, 26, st.flaga);
  s += naZiemi(yk, srodek);

  // ── boki: mury z przodu do tyłu (prawy w cieniu)
  s += naZiemi(
    y - 74,
    `<path d="${sciezka([
      [cx + 150, y - 30],
      [cx + 150, y - 82],
      [cx + 140, yb - 46],
      [cx + 140, yb],
    ])}" fill="${mix(st.k, '#120a04', 0.4)}"/>`
  );
  s += naZiemi(
    y - 74,
    `<path d="${sciezka([
      [cx - 150, y - 30],
      [cx - 150, y - 82],
      [cx - 140, yb - 46],
      [cx - 140, yb],
    ])}" fill="${st.k}"/>`
  );

  // ── przód: mur z bramą i dwie wielkie baszty narożne
  const fw = 290;
  const fh = 58;
  s += sciana(st, cx - fw / 2, y - 8, fw, fh, 41);
  s += `<rect x="${f(cx + 40)}" y="${f(y - 8 - fh)}" width="${fw / 2 - 40}" height="${fh}" fill="#120a04" opacity="0.18"/>`;
  s += blanki(st, cx - fw / 2, y - 8 - fh, fw);
  // brama w wieży bramnej
  s += sciana(st, cx - 40, y - 4, 80, 88, 42);
  s += `<rect x="${f(cx + 14)}" y="${f(y - 92)}" width="26" height="88" fill="#120a04" opacity="0.22"/>`;
  s += blanki(st, cx - 40, y - 92, 80, { zab: 10 });
  s += brama(st, cx, y - 2, 40, 62);
  // herb nad bramą
  s +=
    rodzaj === 'las'
      ? `<path d="M${f(cx - 9)} ${f(y - 82)} h18 v10 q0 9 -9 12 q-9 -3 -9 -12 Z" fill="${st.dach}" stroke="${PAL.zloto}" stroke-width="1.6"/><path d="M${f(cx)} ${f(y - 78)} l-5 8 h10 Z" fill="${PAL.zloto}"/>`
      : `<path d="M${f(cx - 9)} ${f(y - 82)} h18 v10 q0 9 -9 12 q-9 -3 -9 -12 Z" fill="${st.dach}" stroke="${PAL.zloto}" stroke-width="1.6"/><path d="M${f(cx)} ${f(y - 80)} q6 6 0 14 q-6 -8 0 -14" fill="#ffb03a"/>`;
  s += baszta(st, cx - 152, y - 2, 34, 104, { dachH: rodzaj === 'las' ? 62 : 70, z: 43, okna: 2 });
  s += baszta(st, cx + 152, y - 2, 34, 104, { dachH: rodzaj === 'las' ? 62 : 70, z: 44, okna: 2 });
  if (rodzaj === 'ogien') {
    // kosze z ogniem przy bramie
    for (const dx of [-56, 56]) {
      s += `<circle cx="${f(cx + dx)}" cy="${f(y - 34)}" r="14" fill="#ff8a2a" opacity="0.45" filter="url(#blask)"/>`;
      s += `<rect x="${f(cx + dx - 2)}" y="${f(y - 26)}" width="4" height="22" fill="#2b2523"/><path d="M${f(cx + dx - 8)} ${f(y - 28)} h16 l-3 6 h-10 Z" fill="#3a3230"/><path d="M${f(cx + dx - 6)} ${f(y - 28)} q0 -12 6 -16 q1 8 6 6 q0 6 -2 10 Z" fill="#ff8a2a"/><path d="M${f(cx + dx - 3)} ${f(y - 28)} q1 -7 3 -10 q2 6 3 10 Z" fill="#ffd34a"/>`;
    }
  } else {
    // drzewa i krzewy przy murach (frakcja leśna)
    s += naZiemi(y - 40, drzewo(cx - 186, y - 40, 1.5, { ziarno: 51 }));
    s += naZiemi(y - 60, drzewo(cx + 186, y - 60, 1.3, { ziarno: 52 }));
    s += krzaczek(cx - 104, y - 6, 1.3, { ziarno: 53 }) + krzaczek(cx + 104, y - 6, 1.3, { ziarno: 54 });
  }
  void r;
  return svgObiektu(4.2, 3.9, s);
}

export const ZAMKI = {
  'zamek-las': { rysuj: () => zamek('las') },
  'zamek-ogien': { rysuj: () => zamek('ogien') },
};
export { pts };
