// Budowle odwiedzane, sad i znajdźki — ten sam pędzel co kopalnie.

import { naZiemi, P, PAL, f, pts, los, mix, sciezka, wypelnij, cienRzucany, cienPod, dom, krzaczek, placek, deskiPion, murKamienny, okno, drzwi, svgObiektu, uid, dachowka, strzecha } from './pedzel.mjs';
import { kula, jagoda, kamyk, krysztaly, masyw, glazPojedynczy as glaz, latarnia, paka, plot, proporzec, trawka, BARWY_KAMIENI, drzewo } from './obiekty.mjs';

const BARWY_JAGOD = ['#c63a40', '#4660c0', '#cf5f9c', '#7848b4'];

/** Krzak jagodowy obsypany owocami. */
function krzakJagod(cx, y, s, z, barwa) {
  const r = los(z);
  let o = krzaczek(cx, y, s * 1.6, { ziarno: z });
  for (let i = 0; i < 6; i++) o += jagoda(cx + (r() - 0.5) * 16 * s, y - 4 * s - r() * 9 * s, 1.9 * s, barwa);
  return o;
}

/** Kosz wiklinowy. */
function kosz(cx, y, w, h, tresc = '') {
  let o = cienPod(cx, y, w * 0.6, 3);
  o += `<path d="M${f(cx - w / 2)} ${f(y - h)} L${f(cx + w / 2)} ${f(y - h)} L${f(cx + w * 0.4)} ${f(y)} L${f(cx - w * 0.4)} ${f(y)} Z" fill="${PAL.strzecha}"/>`;
  for (let yy = y - h + 3; yy < y; yy += 3.2)
    o += `<line x1="${f(cx - w / 2 + 1)}" y1="${f(yy)}" x2="${f(cx + w / 2 - 1)}" y2="${f(yy)}" stroke="${PAL.strzechaC}" stroke-width="1.2" opacity="0.8"/>`;
  o += tresc;
  o += `<ellipse cx="${f(cx)}" cy="${f(y - h)}" rx="${f(w / 2)}" ry="${f(h * 0.18)}" fill="none" stroke="${PAL.strzechaJ}" stroke-width="2"/>`;
  return o;
}

/** Sad jagód (kopalnia „jagoda”) — 3 × 1 bryły. */
function sad() {
  const W = 3 * P;
  const H = 2.0 * P;
  const y = H - 3;
  const cx = W / 2;
  let s = '';
  s += placek(cx, y - 40, 140, 44, { kolor: PAL.ziemia, krycie: 0.6 });
  // grządki — ciemniejsze pasy ziemi
  for (let i = 0; i < 3; i++)
    s += `<ellipse cx="${f(cx + (i - 1) * 8)}" cy="${f(y - 24 - i * 20)}" rx="${f(122 - i * 10)}" ry="7" fill="${PAL.ziemiaC}" opacity="0.45"/>`;
  // szopa z tyłu
  const d = dom({ x: cx - 26, y: y - 78, w: 50, h: 30, g: 26, dachH: 24, sciana: 'drewno', dach: 'strzecha', ziarno: 2 });
  s += naZiemi(y - 78, d.svg + `<rect x="${f(cx - 10)}" y="${f(y - 100)}" width="14" height="22" fill="#1d130b"/>`);
  // krzaki rzędami, od tyłu do przodu
  const rzedy = [
    [y - 64, [-104, -76, 48, 76, 104]],
    [y - 44, [-112, -84, -56, -28, 0, 28, 56, 84, 112]],
    [y - 24, [-116, -88, -60, 60, 88, 116]],
  ];
  let k = 0;
  for (const [yy, xs] of rzedy)
    for (const dx of xs) {
      s += cienPod(cx + dx, yy, 13, 3, 0.3);
      s += krzakJagod(cx + dx, yy, 1.15, 30 + k, BARWY_JAGOD[k % 4]);
      k++;
    }
  // płot od frontu z bramą pośrodku
  s += plot(cx - 138, y - 2, cx - 22, y - 2, { slupki: 5 });
  s += plot(cx + 22, y - 2, cx + 138, y - 2, { slupki: 5 });
  s += kosz(cx - 34, y - 6, 16, 9, jagoda(cx - 38, y - 16, 3, BARWY_JAGOD[0]) + jagoda(cx - 32, y - 17, 3, BARWY_JAGOD[0]) + jagoda(cx - 35, y - 19, 3, BARWY_JAGOD[2]));
  s += kosz(cx + 36, y - 6, 16, 9, jagoda(cx + 32, y - 16, 3, BARWY_JAGOD[1]) + jagoda(cx + 38, y - 17, 3, BARWY_JAGOD[1]) + jagoda(cx + 35, y - 19, 3, BARWY_JAGOD[3]));
  return svgObiektu(3, 2.0, s);
}

/** Wiatrak — wieża z kamienia, strzecha, cztery skrzydła. 3 × 1 bryły. */
function wiatrak() {
  const W = 3 * P;
  const H = 3.2 * P;
  const y = H - 3;
  const cx = W / 2;
  let s = '';
  s += cienRzucany(cx - 34, cx + 34, y, 150, { krycie: 0.3, skos: 0.6 });
  s += placek(cx, y - 8, 110, 24, { kolor: PAL.ziemia, krycie: 0.55 });
  // wieża — ścięty stożek z kamienia
  const wb = 86;
  const wt = 54;
  const wh = 150;
  const korpus = sciezka([
    [cx - wb / 2, y - 6],
    [cx - wt / 2, y - 6 - wh],
    [cx + wt / 2, y - 6 - wh],
    [cx + wb / 2, y - 6],
  ]);
  const id = uid('w');
  s += `<clipPath id="${id}"><path d="${korpus}"/></clipPath>`;
  s += `<path d="${korpus}" fill="${PAL.tynk}"/>`;
  s += `<g clip-path="url(#${id})">${murKamienny(cx - wb / 2, y - 6 - wh, wb, wh, { blok: 13, ziarno: 41 })}
    <rect x="${f(cx + 4)}" y="${f(y - wh - 10)}" width="${wb}" height="${wh + 10}" fill="#2a1a08" opacity="0.32"/>
    <rect x="${f(cx - wb / 2)}" y="${f(y - wh - 10)}" width="12" height="${wh + 10}" fill="#fff" opacity="0.14"/></g>`;
  s += drzwi(cx - 12, y - 40, 24, 34);
  s += okno(cx - 8, y - 100, 14, 16, { swieci: true });
  // czapa ze strzechy
  const cap = sciezka([
    [cx - wt / 2 - 10, y - 6 - wh + 4],
    [cx, y - 6 - wh - 44],
    [cx + wt / 2 + 10, y - 6 - wh + 4],
  ]);
  s += wypelnij(cap, PAL.strzecha, strzechaFakt(cx - 40, y - wh - 56, 80, 60), { swiatlo: 'swiatloL' });
  s += `<path d="M${f(cx - wt / 2 - 10)} ${f(y - 6 - wh + 4)} L${f(cx + wt / 2 + 10)} ${f(y - 6 - wh + 4)}" stroke="${PAL.strzechaC}" stroke-width="3.5" stroke-linecap="round"/>`;
  // skrzydła
  const hx = cx + 2;
  const hy = y - wh - 22;
  const L = 112;
  for (let i = 0; i < 4; i++) {
    const a = ((i * 90 + 22) * Math.PI) / 180;
    const ex = hx + Math.cos(a) * L;
    const ey = hy + Math.sin(a) * L * 0.92;
    const nx = -Math.sin(a);
    const ny = Math.cos(a);
    const b = 22;
    // płótno
    const p0 = [hx + Math.cos(a) * 18, hy + Math.sin(a) * 18 * 0.92];
    const plotno = [
      p0,
      [ex, ey],
      [ex + nx * b, ey + ny * b * 0.92],
      [p0[0] + nx * b, p0[1] + ny * b * 0.92],
    ];
    s += `<polygon points="${pts(plotno.map(([x, yy]) => [x + 3, yy + 4]))}" fill="#000" opacity="0.18" filter="url(#cienMaly)"/>`;
    s += `<polygon points="${pts(plotno)}" fill="${i % 2 ? '#efe4c8' : '#f7efd9'}"/>`;
    // kratownica
    for (let t = 0.15; t <= 1; t += 0.14) {
      const x0 = hx + Math.cos(a) * L * t;
      const y0 = hy + Math.sin(a) * L * t * 0.92;
      s += `<line x1="${f(x0)}" y1="${f(y0)}" x2="${f(x0 + nx * b)}" y2="${f(y0 + ny * b * 0.92)}" stroke="${PAL.drewnoC}" stroke-width="1.6"/>`;
    }
    s += `<line x1="${f(p0[0] + nx * b)}" y1="${f(p0[1] + ny * b * 0.92)}" x2="${f(ex + nx * b)}" y2="${f(ey + ny * b * 0.92)}" stroke="${PAL.drewnoC}" stroke-width="1.6"/>`;
    s += `<line x1="${f(hx)}" y1="${f(hy)}" x2="${f(ex)}" y2="${f(ey)}" stroke="${PAL.drewno}" stroke-width="4" stroke-linecap="round"/>`;
    s += `<line x1="${f(hx)}" y1="${f(hy)}" x2="${f(ex)}" y2="${f(ey)}" stroke="${PAL.drewnoJ}" stroke-width="1.3"/>`;
  }
  s += `<circle cx="${f(hx)}" cy="${f(hy)}" r="6" fill="${PAL.drewnoC}"/><circle cx="${f(hx - 1)}" cy="${f(hy - 1)}" r="3" fill="${PAL.drewnoJ}"/>`;
  // worki z mąką i wózek
  for (const [dx, dy] of [
    [-52, 0],
    [-40, 2],
    [-46, -9],
  ])
    s += worek(cx + dx, y - 4 + dy);
  s += paka(cx + 38, y - 4, 20, 13);
  s += krzaczek(cx - 110, y - 2, 1.1, { ziarno: 52 }) + krzaczek(cx + 112, y - 2, 1.0, { ziarno: 53 });
  s += plot(cx + 64, y - 2, cx + 136, y - 8, { slupki: 3 });
  return svgObiektu(3, 3.2, s);
}

function strzechaFakt(x, y, w, h) {
  return strzecha(x, y, w, h, { ziarno: 77 });
}

function worek(cx, y) {
  return `${cienPod(cx, y, 8, 2.5, 0.3)}<path d="M${f(cx - 7)} ${f(y)} Q${f(cx - 9)} ${f(y - 10)} ${f(cx - 3)} ${f(y - 14)} L${f(cx + 3)} ${f(y - 14)} Q${f(cx + 9)} ${f(y - 10)} ${f(cx + 7)} ${f(y)} Z" fill="#e8dcc0"/>
  <path d="M${f(cx + 1)} ${f(y - 13)} Q${f(cx + 8)} ${f(y - 8)} ${f(cx + 6)} ${f(y)} L${f(cx + 1)} ${f(y)} Z" fill="#b8a888"/>
  <path d="M${f(cx - 3)} ${f(y - 14)} l3 -3 l3 3" stroke="#8a7a5a" stroke-width="1.6" fill="none"/>`;
}

/** Namiot w pasy: lewa połać jasna, prawa w cieniu, ciemne wejście. */
function namiot(cx, y, w, h, barwa, barwa2 = PAL.biel) {
  const C = mix(barwa, '#2a1608', 0.22);
  const C2 = mix(barwa2, '#2a1608', 0.22);
  let o = cienRzucany(cx - w / 2, cx + w / 2, y, h, { krycie: 0.28 });
  const szczyt = [cx, y - h];
  const paski = 6;
  // podstawa namiotu: od lewego rogu przez przód do prawego
  const baza = [];
  for (let i = 0; i <= paski; i++) baza.push([cx - w / 2 + (w * i) / paski, y - (i === 0 || i === paski ? 2 : 0)]);
  for (let i = 0; i < paski; i++) {
    const swiatlo = i < paski / 2;
    const kol = i % 2 ? (swiatlo ? barwa2 : C2) : swiatlo ? barwa : C;
    o += `<polygon points="${pts([baza[i], szczyt, baza[i + 1]])}" fill="${kol}"/>`;
  }
  // wejście
  o += `<polygon points="${pts([
    [cx - w * 0.07, y],
    [cx + w * 0.02, y - h * 0.42],
    [cx + w * 0.1, y],
  ])}" fill="#3a2412"/>`;
  o += `<line x1="${f(cx)}" y1="${f(y - h)}" x2="${f(cx)}" y2="${f(y - h - 9)}" stroke="${PAL.drewnoC}" stroke-width="2.4"/>`;
  o += `<path d="M${f(cx)} ${f(y - h - 9)} l11 3 l-11 3 Z" fill="${barwa}"/>`;
  return o;
}

/** Kukła treningowa (słomiana) albo tarcza. */
function kukla(cx, y) {
  return `${cienPod(cx, y, 6, 2, 0.3)}<rect x="${f(cx - 1.5)}" y="${f(y - 26)}" width="3" height="26" fill="${PAL.drewnoC}"/>
  <rect x="${f(cx - 10)}" y="${f(y - 20)}" width="20" height="3" fill="${PAL.drewno}"/>
  <ellipse cx="${f(cx)}" cy="${f(y - 14)}" rx="6" ry="9" fill="${PAL.strzecha}"/><ellipse cx="${f(cx - 2)}" cy="${f(y - 16)}" rx="2.5" ry="5" fill="${PAL.strzechaJ}"/>
  <circle cx="${f(cx)}" cy="${f(y - 27)}" r="5" fill="${PAL.strzecha}"/><circle cx="${f(cx - 1.5)}" cy="${f(y - 28.5)}" r="2" fill="${PAL.strzechaJ}"/>
  <path d="M${f(cx - 6)} ${f(y - 9)} h12" stroke="${PAL.czerwien}" stroke-width="2"/>`;
}

function tarcza(cx, y) {
  let o = `<line x1="${f(cx - 6)}" y1="${f(y)}" x2="${f(cx)}" y2="${f(y - 20)}" stroke="${PAL.drewnoC}" stroke-width="2.5"/><line x1="${f(cx + 6)}" y1="${f(y)}" x2="${f(cx)}" y2="${f(y - 20)}" stroke="${PAL.drewnoC}" stroke-width="2.5"/>`;
  for (const [r, c] of [
    [11, PAL.biel],
    [8, PAL.czerwien],
    [5, PAL.biel],
    [2.5, PAL.czerwien],
  ])
    o += `<ellipse cx="${f(cx)}" cy="${f(y - 18)}" rx="${r}" ry="${r * 1.05}" fill="${c}"/>`;
  return o + `<ellipse cx="${f(cx)}" cy="${f(y - 18)}" rx="11" ry="11.5" fill="none" stroke="${PAL.drewnoC}" stroke-width="1.5"/>`;
}

/** Palisada (rząd zaostrzonych pali). */
function palisada(x0, y0, x1, y1, n) {
  let o = '';
  for (let i = 0; i <= n; i++) {
    const t = i / n;
    const x = x0 + (x1 - x0) * t;
    const yy = y0 + (y1 - y0) * t;
    o += `<path d="M${f(x - 4)} ${f(yy)} V${f(yy - 22)} L${f(x)} ${f(yy - 28)} L${f(x + 4)} ${f(yy - 22)} V${f(yy)} Z" fill="${PAL.drewno}"/><path d="M${f(x - 4)} ${f(yy)} V${f(yy - 22)} L${f(x)} ${f(yy - 28)} L${f(x - 1)} ${f(yy)}" fill="${PAL.drewnoJ}" opacity="0.5"/><line x1="${f(x + 4)}" y1="${f(yy - 22)}" x2="${f(x + 4)}" y2="${f(yy)}" stroke="${PAL.drewnoCC}" stroke-width="1"/>`;
  }
  return o;
}

/** Obóz treningowy — namioty, kukły, tarcza, palisada. 3 × 1 bryły. */
function obozTreningowy() {
  const W = 3 * P;
  const H = 2.0 * P;
  const y = H - 3;
  const cx = W / 2;
  let s = '';
  s += placek(cx, y - 34, 132, 40, { kolor: PAL.ziemiaJ, krycie: 0.7 });
  s += naZiemi(y - 70, palisada(cx - 130, y - 70, cx + 130, y - 70, 26) + namiot(cx, y - 70, 60, 58, PAL.zloto, PAL.strzechaJ));
  s += naZiemi(y - 48, namiot(cx - 76, y - 48, 76, 70, PAL.czerwien));
  s += naZiemi(y - 46, namiot(cx + 74, y - 46, 72, 64, PAL.lupek, '#e8eef4'));
  s += kukla(cx - 30, y - 22) + kukla(cx + 30, y - 24);
  s += tarcza(cx + 102, y - 16) + tarcza(cx - 106, y - 14);
  // ognisko pośrodku placu
  s += ogien(cx + 4, y - 30, 0.8);
  // stojak z kijami
  s += `<rect x="${f(cx - 70)}" y="${f(y - 26)}" width="24" height="3" fill="${PAL.drewnoC}"/>`;
  for (let i = 0; i < 4; i++) s += `<line x1="${f(cx - 68 + i * 6)}" y1="${f(y - 8)}" x2="${f(cx - 66 + i * 6)}" y2="${f(y - 34)}" stroke="${PAL.drewnoJ}" stroke-width="2"/>`;
  s += proporzec(cx - 10, y - 66, 60, PAL.czerwien);
  return svgObiektu(3, 2.0, s);
}

/** Ognisko w kamiennym kręgu. */
function ogien(cx, y, s = 1) {
  let o = `<ellipse cx="${f(cx)}" cy="${f(y - 8 * s)}" rx="${f(22 * s)}" ry="${f(14 * s)}" fill="${PAL.oknoSwiatlo}" opacity="0.35" filter="url(#blask)"/>`;
  for (let i = 0; i < 9; i++) {
    const a = (i / 9) * Math.PI * 2;
    o += `<ellipse cx="${f(cx + Math.cos(a) * 11 * s)}" cy="${f(y + Math.sin(a) * 5 * s)}" rx="${f(3.6 * s)}" ry="${f(2.6 * s)}" fill="${PAL.kamien}"/><ellipse cx="${f(cx + Math.cos(a) * 11 * s - 0.8)}" cy="${f(y + Math.sin(a) * 5 * s - 0.8)}" rx="${f(2 * s)}" ry="${f(1.2 * s)}" fill="${PAL.kamienJ}"/>`;
  }
  o += `<line x1="${f(cx - 8 * s)}" y1="${f(y + 2 * s)}" x2="${f(cx + 8 * s)}" y2="${f(y - 4 * s)}" stroke="${PAL.drewnoC}" stroke-width="${f(3.5 * s)}" stroke-linecap="round"/>`;
  o += `<line x1="${f(cx - 8 * s)}" y1="${f(y - 4 * s)}" x2="${f(cx + 8 * s)}" y2="${f(y + 2 * s)}" stroke="${PAL.drewno}" stroke-width="${f(3.5 * s)}" stroke-linecap="round"/>`;
  o += `<path d="M${f(cx - 7 * s)} ${f(y)} Q${f(cx - 9 * s)} ${f(y - 12 * s)} ${f(cx - 2 * s)} ${f(y - 22 * s)} Q${f(cx)} ${f(y - 12 * s)} ${f(cx + 2 * s)} ${f(y - 16 * s)} Q${f(cx + 9 * s)} ${f(y - 8 * s)} ${f(cx + 7 * s)} ${f(y)} Z" fill="#f07a1c"/>`;
  o += `<path d="M${f(cx - 4 * s)} ${f(y)} Q${f(cx - 5 * s)} ${f(y - 8 * s)} ${f(cx)} ${f(y - 14 * s)} Q${f(cx + 5 * s)} ${f(y - 7 * s)} ${f(cx + 4 * s)} ${f(y)} Z" fill="#ffd34a"/>`;
  return o;
}

/** Laboratorium profesora — dom z wieżyczką obserwatorium i starym dębem. 3 × 1. */
function laboratorium() {
  const W = 3 * P;
  const H = 2.8 * P;
  const y = H - 3;
  const cx = W / 2;
  let s = '';
  s += placek(cx, y - 8, 128, 26, { kolor: PAL.ziemia, krycie: 0.5 });
  // dąb z tyłu po lewej
  s += cienRzucany(cx - 120, cx - 70, y - 40, 90, { krycie: 0.22 });
  s += naZiemi(y - 34, drzewo(cx - 96, y - 34, 2.4, { ziarno: 61 }));
  s += cienRzucany(cx - 64, cx + 80, y, 120, { krycie: 0.3 });
  // dom główny
  const d = dom({ x: cx - 62, y: y - 4, w: 96, h: 50, g: 44, dachH: 40, sciana: 'kamien', dach: 'lupek', ziarno: 8 });
  s += d.svg;
  // wieżyczka z kopułą po prawej (przed dachem)
  const tx = cx + 44;
  const tw = 40;
  const th = 104;
  const wieza = sciezka([
    [tx, y - 4],
    [tx, y - 4 - th],
    [tx + tw, y - 4 - th],
    [tx + tw, y - 4],
  ]);
  s += wypelnij(wieza, PAL.kamien, murKamienny(tx, y - 4 - th, tw, th, { blok: 11, ziarno: 63 }));
  s += `<rect x="${f(tx + tw * 0.55)}" y="${f(y - 4 - th)}" width="${f(tw * 0.45)}" height="${th}" fill="#2a1a08" opacity="0.3"/>`;
  s += okno(tx + 13, y - 70, 12, 16, { swieci: true }) + okno(tx + 13, y - 36, 12, 16, { swieci: true });
  // kopuła z miedzi z oknem teleskopu
  const ky = y - 4 - th;
  s += `<path d="M${f(tx - 5)} ${f(ky)} A${f(tw / 2 + 5)} ${f(tw / 2 + 2)} 0 0 1 ${f(tx + tw + 5)} ${f(ky)} Z" fill="#3e8f86"/>`;
  s += `<path d="M${f(tx - 5)} ${f(ky)} A${f(tw / 2 + 5)} ${f(tw / 2 + 2)} 0 0 1 ${f(tx + tw / 2)} ${f(ky - tw / 2 - 2)} L${f(tx + tw / 2)} ${f(ky)} Z" fill="#6cc0b0"/>`;
  s += `<path d="M${f(tx + tw / 2 - 4)} ${f(ky)} L${f(tx + tw / 2 - 4)} ${f(ky - tw / 2 + 2)} L${f(tx + tw / 2 + 4)} ${f(ky - tw / 2 + 2)} L${f(tx + tw / 2 + 4)} ${f(ky)} Z" fill="#14202a"/>`;
  s += `<line x1="${f(tx + tw / 2)}" y1="${f(ky - 8)}" x2="${f(tx + tw / 2 + 22)}" y2="${f(ky - 30)}" stroke="${PAL.zlotoC}" stroke-width="5" stroke-linecap="round"/><line x1="${f(tx + tw / 2)}" y1="${f(ky - 8)}" x2="${f(tx + tw / 2 + 22)}" y2="${f(ky - 30)}" stroke="${PAL.zloto}" stroke-width="2"/>`;
  s += `<rect x="${f(tx - 6)}" y="${f(ky - 1)}" width="${tw + 12}" height="5" fill="${PAL.kamienJ}"/>`;
  // drzwi i okna domu
  s += drzwi(cx - 22, y - 36, 22, 30);
  s += okno(cx - 52, y - 40, 14, 16, { swieci: true }) + okno(cx + 8, y - 40, 14, 16, { swieci: true });
  // szyld z księgą
  s += `<rect x="${f(cx - 26)}" y="${f(y - 54)}" width="30" height="11" rx="2" fill="${PAL.drewno}"/><rect x="${f(cx - 18)}" y="${f(y - 52)}" width="14" height="7" fill="${PAL.blekit}"/><line x1="${f(cx - 11)}" y1="${f(y - 52)}" x2="${f(cx - 11)}" y2="${f(y - 45)}" stroke="#fff" stroke-width="1"/>`;
  // komin na dachu
  s += `<rect x="${f(cx - 44)}" y="${f(d.top - 50)}" width="12" height="26" fill="${PAL.kamienC}"/><rect x="${f(cx - 46)}" y="${f(d.top - 53)}" width="16" height="5" fill="${PAL.kamienJ}"/>`;
  s += krzaczek(cx - 70, y, 1.2, { ziarno: 64 }) + krzaczek(cx + 100, y, 1.1, { ziarno: 65 }) + krzaczek(cx + 6, y + 1, 0.9, { ziarno: 66 });
  s += latarnia(cx - 32, y - 2, 24);
  return svgObiektu(3, 2.8, s);
}

/** Dach pagody: wygięte okapy, niebieska dachówka. */
function dachPagody(cx, y, w, h, barwa = PAL.lupek) {
  const C = mix(barwa, '#0a1020', 0.45);
  const J = mix(barwa, '#e8f4ff', 0.4);
  const d = `M${f(cx - w / 2 - 8)} ${f(y - 6)} Q${f(cx - w / 2 + 6)} ${f(y)} ${f(cx - w / 2 + 14)} ${f(y - 2)} L${f(cx + w / 2 - 14)} ${f(y - 2)} Q${f(cx + w / 2 - 6)} ${f(y)} ${f(cx + w / 2 + 8)} ${f(y - 6)} L${f(cx + w * 0.32)} ${f(y - h)} L${f(cx - w * 0.32)} ${f(y - h)} Z`;
  let o = `<path d="${d}" fill="${barwa}"/>`;
  const id = uid('pg');
  o += `<clipPath id="${id}"><path d="${d}"/></clipPath><g clip-path="url(#${id})">${dachowka(cx - w / 2 - 8, y - h, w + 16, h, { rzad: 6, luska: 7, kolorC: C, jasny: J })}<rect x="${f(cx)}" y="${f(y - h)}" width="${f(w)}" height="${f(h)}" fill="#000" opacity="0.18"/></g>`;
  o += `<path d="M${f(cx - w / 2 - 8)} ${f(y - 6)} Q${f(cx - w / 2 + 6)} ${f(y)} ${f(cx - w / 2 + 14)} ${f(y - 2)} L${f(cx + w / 2 - 14)} ${f(y - 2)} Q${f(cx + w / 2 - 6)} ${f(y)} ${f(cx + w / 2 + 8)} ${f(y - 6)}" stroke="${C}" stroke-width="3.5" fill="none" stroke-linecap="round"/>`;
  o += `<path d="M${f(cx - w * 0.34)} ${f(y - h)} H${f(cx + w * 0.34)}" stroke="${J}" stroke-width="3.5" stroke-linecap="round"/>`;
  return o;
}

/** Dojo — kamienna podmurówka, drewniany dom, dwa dachy pagody. 3 × 1. */
function dojo() {
  const W = 3 * P;
  const H = 2.6 * P;
  const y = H - 3;
  const cx = W / 2;
  let s = '';
  s += placek(cx, y - 6, 132, 24, { kolor: PAL.ziemiaJ, krycie: 0.6 });
  s += cienRzucany(cx - 90, cx + 90, y, 110, { krycie: 0.3 });
  // podmurówka
  const pw = 176;
  s += wypelnij(sciezka([
    [cx - pw / 2, y - 2],
    [cx - pw / 2, y - 20],
    [cx + pw / 2, y - 20],
    [cx + pw / 2, y - 2],
  ]), PAL.kamien, murKamienny(cx - pw / 2, y - 20, pw, 18, { blok: 12, ziarno: 71 }));
  // schody
  for (let i = 0; i < 3; i++) s += `<rect x="${f(cx - 18 + i * 2)}" y="${f(y - 6 - i * 5)}" width="${f(36 - i * 4)}" height="5" fill="${i % 2 ? PAL.kamien : PAL.kamienJ}"/>`;
  // ściany — ciemne drewno z jasnymi panelami shoji
  const sw = 150;
  const sh = 46;
  const sy = y - 20;
  s += `<rect x="${f(cx - sw / 2)}" y="${f(sy - sh)}" width="${sw}" height="${sh}" fill="${PAL.drewnoC}"/>`;
  for (let i = 0; i < 6; i++) {
    const px = cx - sw / 2 + 6 + i * 24.5;
    if (i === 2 || i === 3) continue;
    s += `<rect x="${f(px)}" y="${f(sy - sh + 8)}" width="18" height="30" fill="#f1e6c8"/>`;
    s += `<path d="M${f(px + 9)} ${f(sy - sh + 8)} V${f(sy - 8)} M${f(px)} ${f(sy - sh + 18)} H${f(px + 18)} M${f(px)} ${f(sy - sh + 28)} H${f(px + 18)}" stroke="${PAL.drewnoC}" stroke-width="1.2"/>`;
  }
  s += `<rect x="${f(cx - 22)}" y="${f(sy - 38)}" width="44" height="38" fill="#1d130b"/>`;
  s += `<rect x="${f(cx - 20)}" y="${f(sy - 36)}" width="18" height="36" fill="#f1e6c8" opacity="0.9"/>`;
  s += `<rect x="${f(cx + sw / 2 - 40)}" y="${f(sy - sh)}" width="40" height="${sh}" fill="#000" opacity="0.22"/>`;
  s += `<rect x="${f(cx - sw / 2)}" y="${f(sy - sh)}" width="${sw}" height="${sh}" fill="url(#swiatloL)"/>`;
  // dolny dach
  s += dachPagody(cx, sy - sh + 4, 196, 30);
  // górne piętro
  const gw = 92;
  const gy = sy - sh - 22;
  s += `<rect x="${f(cx - gw / 2)}" y="${f(gy - 26)}" width="${gw}" height="28" fill="${PAL.drewnoC}"/>`;
  for (let i = 0; i < 4; i++) s += `<rect x="${f(cx - gw / 2 + 6 + i * 21.5)}" y="${f(gy - 21)}" width="15" height="17" fill="${PAL.oknoSwiatlo}" opacity="0.9"/>`;
  s += `<rect x="${f(cx + gw / 2 - 24)}" y="${f(gy - 26)}" width="24" height="28" fill="#000" opacity="0.22"/>`;
  s += dachPagody(cx, gy - 22, 130, 34);
  // szczyt i szyld
  s += `<rect x="${f(cx - 2)}" y="${f(gy - 76)}" width="4" height="22" fill="${PAL.zlotoC}"/><circle cx="${f(cx)}" cy="${f(gy - 78)}" r="4" fill="${PAL.zloto}"/>`;
  s += `<rect x="${f(cx - 15)}" y="${f(sy - sh - 4)}" width="30" height="13" rx="1.5" fill="${PAL.czerwienC}"/><rect x="${f(cx - 13)}" y="${f(sy - sh - 2)}" width="26" height="9" fill="${PAL.czerwien}"/><path d="M${f(cx - 7)} ${f(sy - sh + 2.5)} h14 M${f(cx)} ${f(sy - sh - 1)} v7" stroke="${PAL.zloto}" stroke-width="1.6"/>`;
  // latarnie kamienne
  for (const dx of [-74, 74]) {
    s += `<rect x="${f(cx + dx - 3)}" y="${f(y - 22)}" width="6" height="20" fill="${PAL.kamien}"/><rect x="${f(cx + dx - 7)}" y="${f(y - 32)}" width="14" height="11" fill="${PAL.kamienJ}"/><rect x="${f(cx + dx - 4)}" y="${f(y - 30)}" width="8" height="7" fill="${PAL.oknoSwiatlo}"/><path d="M${f(cx + dx - 10)} ${f(y - 32)} L${f(cx + dx)} ${f(y - 40)} L${f(cx + dx + 10)} ${f(y - 32)} Z" fill="${PAL.kamienC}"/>`;
  }
  s += krzaczek(cx - 112, y, 1.2, { ziarno: 72 }) + krzaczek(cx + 112, y, 1.2, { ziarno: 73 });
  return svgObiektu(3, 2.6, s);
}

/** Stadion — kamienna arena w rzucie 3/4, piasek w środku, proporce. 3 × 1. */
function arena() {
  const W = 3 * P;
  const H = 2.0 * P;
  const y = H - 3;
  const cx = W / 2;
  const rx = 128;
  const ry = 58;
  const cy = y - 62;
  const sciana = 30;
  let s = '';
  s += cienRzucany(cx - rx, cx + rx, y, 40, { krycie: 0.28 });
  // zewnętrzna ściana (dolny półokrąg)
  const zew = `M${f(cx - rx)} ${f(cy)} A${rx} ${ry} 0 0 0 ${f(cx + rx)} ${f(cy)} L${f(cx + rx)} ${f(cy - sciana)} A${rx} ${ry} 0 0 1 ${f(cx - rx)} ${f(cy - sciana)} Z`;
  // korona muru (elipsa górna) i trybuny
  s += `<ellipse cx="${f(cx)}" cy="${f(cy - sciana)}" rx="${rx}" ry="${ry}" fill="${PAL.kamienC}"/>`;
  s += `<ellipse cx="${f(cx)}" cy="${f(cy - sciana)}" rx="${rx - 6}" ry="${ry - 5}" fill="${PAL.kamienJ}"/>`;
  // trybuny — pierścienie schodków
  for (let i = 0; i < 4; i++)
    s += `<ellipse cx="${f(cx)}" cy="${f(cy - sciana + 3 + i * 4)}" rx="${rx - 10 - i * 11}" ry="${ry - 9 - i * 7}" fill="${i % 2 ? PAL.kamien : mix(PAL.kamien, PAL.kamienJ, 0.5)}" stroke="${PAL.kamienC}" stroke-width="1.2"/>`;
  // piasek areny
  s += `<ellipse cx="${f(cx)}" cy="${f(cy - sciana + 20)}" rx="${rx - 58}" ry="${ry - 36}" fill="${PAL.ziemiaJ}"/>`;
  s += `<ellipse cx="${f(cx)}" cy="${f(cy - sciana + 20)}" rx="${rx - 58}" ry="${ry - 36}" fill="none" stroke="${PAL.ziemiaC}" stroke-width="2"/>`;
  s += `<ellipse cx="${f(cx)}" cy="${f(cy - sciana + 21)}" rx="16" ry="6" fill="none" stroke="#fff" stroke-width="1.5" opacity="0.6"/>`;
  // cień wnętrza od lewej ściany
  s += `<path d="M${f(cx - rx + 8)} ${f(cy - sciana)} A${rx - 8} ${ry - 7} 0 0 1 ${f(cx + rx - 8)} ${f(cy - sciana)} A${rx - 8} ${ry - 12} 0 0 0 ${f(cx - rx + 8)} ${f(cy - sciana)} Z" fill="#000" opacity="0.15"/>`;
  // ściana zewnętrzna z arkadami
  const id = uid('ar');
  s += `<clipPath id="${id}"><path d="${zew}"/></clipPath>`;
  s += `<path d="${zew}" fill="${PAL.kamien}"/>`;
  s += `<g clip-path="url(#${id})">${murKamienny(cx - rx, cy - sciana - ry, 2 * rx, sciana + 2 * ry, { blok: 12, ziarno: 81 })}`;
  for (let i = -5; i <= 5; i++) {
    const a = (i / 6.2) * (Math.PI / 2);
    const ax = cx + Math.sin(a) * rx * 0.98;
    const ay = cy + Math.cos(a) * ry - 6;
    const w = 11 * Math.cos(a);
    if (i === 0) continue;
    s += `<path d="M${f(ax - w / 2)} ${f(ay)} V${f(ay - 12)} A${f(w / 2)} ${f(w / 2)} 0 0 1 ${f(ax + w / 2)} ${f(ay - 12)} V${f(ay)} Z" fill="#1d150e"/>`;
  }
  s += `<rect x="${f(cx + 30)}" y="${f(cy - sciana - ry)}" width="${rx}" height="${sciana + 2 * ry}" fill="#2a1a08" opacity="0.28"/>`;
  s += `<rect x="${f(cx - rx)}" y="${f(cy - sciana - ry)}" width="40" height="${sciana + 2 * ry}" fill="#fff" opacity="0.12"/></g>`;
  // brama główna od frontu (na środku dolnej krawędzi)
  s += `<path d="M${f(cx - 16)} ${f(cy + ry - 1)} V${f(cy + ry - 24)} A16 16 0 0 1 ${f(cx + 16)} ${f(cy + ry - 24)} V${f(cy + ry - 1)} Z" fill="#1d150e"/>`;
  s += `<path d="M${f(cx - 21)} ${f(cy + ry - 24)} A21 21 0 0 1 ${f(cx + 21)} ${f(cy + ry - 24)}" stroke="${PAL.kamienJ}" stroke-width="4" fill="none"/>`;
  s += `<rect x="${f(cx - 24)}" y="${f(cy + ry - 30)}" width="6" height="30" fill="${PAL.kamienJ}"/><rect x="${f(cx + 18)}" y="${f(cy + ry - 30)}" width="6" height="30" fill="${PAL.kamienC}"/>`;
  // proporce wokół
  for (const [dx, b] of [
    [-112, PAL.czerwien],
    [-60, PAL.blekit],
    [60, PAL.zloto],
    [112, PAL.lis],
  ]) {
    const a = Math.asin(dx / rx);
    const py = cy - sciana - Math.cos(a) * ry * -1 + 0;
    s += proporzec(cx + dx, cy - sciana + Math.cos(a) * ry * 0.95 + 2, 30, b);
    void py;
  }
  s += krzaczek(cx - 132, y, 1.0, { ziarno: 82 }) + krzaczek(cx + 132, y, 1.0, { ziarno: 83 });
  return svgObiektu(3, 2.0, s);
}

/** Ranczo — stajnia ze strzechą, wybieg z płotem, siano. 3 × 1. */
function ranczo() {
  const W = 3 * P;
  const H = 2.0 * P;
  const y = H - 3;
  const cx = W / 2;
  let s = '';
  s += placek(cx + 40, y - 24, 100, 34, { kolor: PAL.ziemiaJ, krycie: 0.7 });
  s += cienRzucany(cx - 60, cx + 40, y, 80, { krycie: 0.3 });
  // wybieg po prawej (płot w perspektywie)
  s += naZiemi(y - 62, plot(cx + 34, y - 62, cx + 136, y - 62, { slupki: 5 }));
  s += plot(cx + 136, y - 62, cx + 136, y - 4, { slupki: 3 });
  // stajnia
  const d = dom({ x: cx - 60, y: y - 4, w: 100, h: 42, g: 40, dachH: 34, sciana: 'bale', dach: 'strzecha', ziarno: 9 });
  s += d.svg;
  // wrota stajni
  s += `<path d="M${f(cx - 26)} ${f(y - 4)} V${f(y - 34)} A16 10 0 0 1 ${f(cx + 6)} ${f(y - 34)} V${f(y - 4)} Z" fill="#1d130b"/>`;
  s += `<path d="M${f(cx - 24)} ${f(y - 4)} V${f(y - 32)} H${f(cx - 11)} V${f(y - 4)} Z" fill="${PAL.czerwienC}"/>`;
  s += `<path d="M${f(cx - 24)} ${f(y - 32)} L${f(cx - 11)} ${f(y - 4)} M${f(cx - 11)} ${f(y - 32)} L${f(cx - 24)} ${f(y - 4)}" stroke="${PAL.drewnoJ}" stroke-width="1.6"/>`;
  // okienka z łbami koni (płomienne grzywy — Ponyta)
  for (const ox of [cx - 50, cx + 14]) {
    s += `<rect x="${f(ox)}" y="${f(y - 34)}" width="16" height="14" fill="#1d130b"/>`;
    s += `<ellipse cx="${f(ox + 8)}" cy="${f(y - 26)}" rx="5" ry="6" fill="#f6e2b8"/><path d="M${f(ox + 3)} ${f(y - 31)} q5 -9 10 -1 q-3 -3 -5 2 Z" fill="#f07a1c"/>`;
  }
  // siano, koryto, podkowa
  s += `<rect x="${f(cx - 96)}" y="${f(y - 16)}" width="26" height="14" rx="3" fill="${PAL.strzecha}"/>${strzecha(cx - 96, y - 16, 26, 14, { ziarno: 91 })}<rect x="${f(cx - 90)}" y="${f(y - 26)}" width="22" height="11" rx="3" fill="${PAL.strzechaJ}"/>`;
  s += `<rect x="${f(cx + 70)}" y="${f(y - 18)}" width="34" height="9" fill="${PAL.drewno}"/><rect x="${f(cx + 72)}" y="${f(y - 18)}" width="30" height="3" fill="${PAL.blekit}"/>`;
  s += `<ellipse cx="${f(cx + 92)}" cy="${f(y - 44)}" rx="10" ry="6" fill="${PAL.oknoSwiatlo}" opacity="0.15"/>`;
  s += `<path d="M${f(cx + 2)} ${f(d.top - 6)} a8 8 0 1 1 16 0" stroke="${PAL.kamienJ}" stroke-width="3.5" fill="none"/>`;
  s += krzaczek(cx - 124, y, 1.1, { ziarno: 92 });
  return svgObiektu(3, 2.0, s);
}

/** Punkt widokowy — wysoka drewniana wieża w rzucie 3/4 z daszkiem. 1 × 1 bryły. */
function wiezaObserwacyjna() {
  const W = 2 * P;
  const H = 3.4 * P;
  const y = H - 3;
  const cx = W / 2 - 8;
  let s = '';
  s += cienPod(cx + 14, y - 6, 46, 9, 0.4);
  const hb = 60; // rozstaw nóg u dołu (front)
  const ht = 38; // u góry
  const wh = 196;
  const gx = 22; // przesunięcie tylnych nóg (głębia)
  const gy = 13;
  const top = y - 8 - wh;
  const noga = (x0, y0, x1, y1, c, w = 6) =>
    `<line x1="${f(x0)}" y1="${f(y0)}" x2="${f(x1)}" y2="${f(y1)}" stroke="${c}" stroke-width="${w}" stroke-linecap="round"/>`;
  const L0 = [cx - hb / 2, y - 6];
  const R0 = [cx + hb / 2, y - 6];
  const L1 = [cx - ht / 2, top];
  const R1 = [cx + ht / 2, top];
  const tyl = ([x, yy]) => [x + gx, yy - gy];
  // tylne nogi i kratownica boku (w cieniu)
  s += noga(...tyl(L0), ...tyl(L1), PAL.drewnoCC, 5) + noga(...tyl(R0), ...tyl(R1), PAL.drewnoCC, 5);
  for (let i = 0; i < 4; i++) {
    const t0 = i / 4;
    const t1 = (i + 1) / 4;
    const lerp = (a, b, t) => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t];
    const a0 = lerp(R0, R1, t0);
    const a1 = lerp(R0, R1, t1);
    const b0 = tyl(a0);
    const b1 = tyl(a1);
    s += noga(...a0, ...b1, PAL.drewnoC, 2.6) + noga(...b0, ...a1, PAL.drewnoC, 2.6) + noga(...a1, ...b1, PAL.drewnoC, 3);
  }
  // przednia kratownica (w świetle)
  for (let i = 0; i < 4; i++) {
    const lerp = (a, b, t) => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t];
    const l0 = lerp(L0, L1, i / 4);
    const l1 = lerp(L0, L1, (i + 1) / 4);
    const r0 = lerp(R0, R1, i / 4);
    const r1 = lerp(R0, R1, (i + 1) / 4);
    s += noga(...l0, ...r1, PAL.drewno, 3) + noga(...r0, ...l1, PAL.drewno, 3) + noga(...l1, ...r1, PAL.drewnoJ, 3.6);
  }
  s += noga(...L0, ...L1, PAL.drewno, 7) + noga(...R0, ...R1, PAL.drewnoC, 7);
  s += `<line x1="${f(L0[0] - 1.5)}" y1="${f(L0[1])}" x2="${f(L1[0] - 1.5)}" y2="${f(L1[1])}" stroke="${PAL.drewnoJ}" stroke-width="2"/>`;
  // stopy na kamieniach
  for (const p of [L0, R0, tyl(R0)]) s += `<ellipse cx="${f(p[0])}" cy="${f(p[1] + 1)}" rx="7" ry="4" fill="${PAL.kamien}"/><ellipse cx="${f(p[0] - 1.5)}" cy="${f(p[1])}" rx="4" ry="2" fill="${PAL.kamienJ}"/>`;
  // drabina z przodu
  s += noga(cx - 8, y - 4, cx - 6, top + 4, PAL.drewnoJ, 2.6) + noga(cx + 8, y - 4, cx + 6, top + 4, PAL.drewno, 2.6);
  for (let yy = y - 12; yy > top + 6; yy -= 10) s += `<line x1="${f(cx - 7)}" y1="${f(yy)}" x2="${f(cx + 7)}" y2="${f(yy)}" stroke="${PAL.drewnoJ}" stroke-width="2.2"/>`;
  // kosz obserwacyjny — skrzynka 3/4: front, bok, podłoga widoczna od góry
  const kw = 70;
  const kh = 24;
  const kx = cx - kw / 2;
  const ky = top + 4;
  s += `<polygon points="${pts([
    [kx, ky - kh],
    [kx + kw, ky - kh],
    [kx + kw + gx, ky - kh - gy],
    [kx + gx, ky - kh - gy],
  ])}" fill="${PAL.drewnoC}"/>`;
  s += `<polygon points="${pts([
    [kx + kw, ky],
    [kx + kw, ky - kh],
    [kx + kw + gx, ky - kh - gy],
    [kx + kw + gx, ky - gy],
  ])}" fill="${PAL.drewnoC}"/>`;
  s += deskiPion(kx + kw, ky - kh - gy, gx, kh + gy, { szer: 6, kolor: PAL.drewnoCC });
  s += `<rect x="${f(kx)}" y="${f(ky - kh)}" width="${kw}" height="${kh}" fill="${PAL.drewno}"/>`;
  s += deskiPion(kx, ky - kh, kw, kh, { szer: 7, ziarno: 101 });
  s += `<rect x="${f(kx)}" y="${f(ky - kh)}" width="${kw}" height="${kh}" fill="url(#swiatloL)"/>`;
  s += `<path d="M${f(kx - 2)} ${f(ky - kh)} H${f(kx + kw + 1)} L${f(kx + kw + gx + 1)} ${f(ky - kh - gy)}" stroke="${PAL.drewnoJ}" stroke-width="3.5" fill="none" stroke-linecap="round"/>`;
  s += `<path d="M${f(kx - 2)} ${f(ky)} H${f(kx + kw)} L${f(kx + kw + gx)} ${f(ky - gy)}" stroke="${PAL.drewnoCC}" stroke-width="3" fill="none"/>`;
  // słupki daszku (4 rogi)
  const sh = 34;
  for (const [px, py, c] of [
    [kx + gx + 2, ky - kh - gy, PAL.drewnoCC],
    [kx + kw + gx - 2, ky - kh - gy, PAL.drewnoCC],
    [kx + 2, ky - kh, PAL.drewno],
    [kx + kw - 2, ky - kh, PAL.drewnoC],
  ])
    s += noga(px, py, px, py - sh, c, 3.4);
  // obserwator z lunetą (sylwetka) między słupkami
  s += `<circle cx="${f(cx + 6)}" cy="${f(ky - kh - 14)}" r="5" fill="#e9c9a0"/><path d="M${f(cx)} ${f(ky - kh)} q6 -12 12 0 Z" fill="${PAL.czerwienC}"/><line x1="${f(cx + 9)}" y1="${f(ky - kh - 13)}" x2="${f(cx + 26)}" y2="${f(ky - kh - 21)}" stroke="${PAL.zlotoC}" stroke-width="3.4" stroke-linecap="round"/>`;
  // daszek czterospadowy: przednia połać (w świetle) + prawa (w cieniu)
  const dy0 = ky - kh - sh;
  const sx = cx + gx / 2;
  const sy = dy0 - 40;
  const pl = [kx - 10, dy0 + 4];
  const pp = [kx + kw + 8, dy0 + 4];
  const tp = [kx + kw + gx + 8, dy0 - gy + 2];
  const przod = sciezka([pl, pp, [sx, sy]]);
  const bok = sciezka([pp, tp, [sx, sy]]);
  s += wypelnij(przod, PAL.dach, dachowka(kx - 10, sy, kw + 20, dy0 - sy + 6, { rzad: 7, luska: 9 }), { swiatlo: 'swiatloG' });
  s += wypelnij(bok, PAL.dachC, dachowka(kx + kw, sy, gx + 20, dy0 - sy + 6, { rzad: 7, luska: 9, kolorC: '#4a1a10', jasny: PAL.dach }), { swiatlo: null });
  s += `<path d="M${f(pl[0])} ${f(pl[1])} L${f(pp[0])} ${f(pp[1])} L${f(tp[0])} ${f(tp[1])}" stroke="${PAL.dachC}" stroke-width="3.4" fill="none" stroke-linecap="round"/>`;
  s += `<path d="M${f(pp[0])} ${f(pp[1])} L${f(sx)} ${f(sy)}" stroke="${PAL.dachJ}" stroke-width="2.4" opacity="0.8"/>`;
  s += proporzec(sx, sy, 22, PAL.czerwien);
  s += krzaczek(cx - 42, y, 1.0, { ziarno: 102 }) + krzaczek(cx + 50, y - 4, 0.9, { ziarno: 103 });
  return svgObiektu(2, 3.4, s);
}

/** Gniazdo z jajami — wielkie gniazdo z gałązek na głazach. */
function gniazdo() {
  const W = 2 * P;
  const H = 1.5 * P;
  const y = H - 3;
  const cx = W / 2;
  let s = '';
  s += cienPod(cx + 6, y - 6, 74, 12, 0.35);
  s += glaz(cx - 50, y - 2, 52, 44, { ziarno: 111, mech: true }) + glaz(cx + 52, y - 2, 46, 38, { ziarno: 112, mech: true });
  // gniazdo: owal z gałązek
  const ny = y - 22;
  s += `<ellipse cx="${f(cx)}" cy="${f(ny)}" rx="66" ry="24" fill="${PAL.drewnoCC}"/>`;
  s += `<ellipse cx="${f(cx)}" cy="${f(ny - 4)}" rx="60" ry="19" fill="${PAL.drewnoC}"/>`;
  const r = los(113);
  for (let i = 0; i < 70; i++) {
    const a = r() * Math.PI * 2;
    const rr = 0.75 + r() * 0.3;
    const x = cx + Math.cos(a) * 62 * rr;
    const yy = ny + Math.sin(a) * 21 * rr;
    const l = 10 + r() * 12;
    const k = a + Math.PI / 2 + (r() - 0.5) * 0.8;
    s += `<line x1="${f(x)}" y1="${f(yy)}" x2="${f(x + Math.cos(k) * l)}" y2="${f(yy + Math.sin(k) * l * 0.4)}" stroke="${r() < 0.5 ? PAL.drewnoJ : PAL.drewno}" stroke-width="1.8" stroke-linecap="round"/>`;
  }
  s += `<ellipse cx="${f(cx)}" cy="${f(ny - 6)}" rx="44" ry="11" fill="#2a1a0c"/>`;
  // jaja w kropki
  const jaja = [
    [cx - 22, ny - 10, 13, '#e8542f'],
    [cx + 22, ny - 9, 12.5, '#3d8fe0'],
    [cx, ny - 14, 15, '#58b83a'],
  ];
  for (const [ex, ey, er, kropka] of jaja) {
    s += `<ellipse cx="${f(ex + 1.5)}" cy="${f(ey + 1.5)}" rx="${f(er * 0.78)}" ry="${f(er)}" fill="#000" opacity="0.3"/>`;
    s += `<ellipse cx="${f(ex)}" cy="${f(ey)}" rx="${f(er * 0.78)}" ry="${f(er)}" fill="#fbf4e2"/>`;
    s += `<ellipse cx="${f(ex + er * 0.25)}" cy="${f(ey + er * 0.2)}" rx="${f(er * 0.55)}" ry="${f(er * 0.75)}" fill="#d9ccb0" opacity="0.6"/>`;
    for (const [dx, dy, rr] of [
      [-0.3, -0.4, 0.22],
      [0.35, 0.05, 0.2],
      [-0.2, 0.35, 0.17],
      [0.15, -0.65, 0.12],
    ])
      s += `<circle cx="${f(ex + dx * er)}" cy="${f(ey + dy * er)}" r="${f(rr * er)}" fill="${kropka}"/>`;
    s += `<ellipse cx="${f(ex - er * 0.3)}" cy="${f(ey - er * 0.45)}" rx="${f(er * 0.18)}" ry="${f(er * 0.3)}" fill="#fff" opacity="0.8"/>`;
  }
  // przednia krawędź gniazda (zasłania spody jaj)
  for (let i = 0; i < 40; i++) {
    const a = (r() * 0.9 + 0.05) * Math.PI;
    const x = cx + Math.cos(a) * 60;
    const yy = ny + Math.sin(a) * 18;
    const l = 10 + r() * 14;
    s += `<line x1="${f(x - l / 2)}" y1="${f(yy - 1 + r() * 2)}" x2="${f(x + l / 2)}" y2="${f(yy + (r() - 0.5) * 4)}" stroke="${r() < 0.5 ? PAL.drewnoJ : PAL.drewno}" stroke-width="2" stroke-linecap="round"/>`;
  }
  s += trawka(cx - 70, y) + trawka(cx + 74, y) + trawka(cx - 10, y + 1, 0.8);
  return svgObiektu(2, 1.5, s);
}

/** Źródełko z kramem z napojami (Automat z Napojami). */
function zrodlo() {
  const W = 1.6 * P;
  const H = 1.6 * P;
  const y = H - 3;
  const cx = W / 2;
  let s = '';
  s += cienPod(cx + 4, y - 4, 60, 10, 0.32);
  // kamienna cembrowina ze źródłem
  s += `<ellipse cx="${f(cx - 18)}" cy="${f(y - 14)}" rx="34" ry="14" fill="${PAL.kamienC}"/>`;
  s += `<ellipse cx="${f(cx - 18)}" cy="${f(y - 18)}" rx="32" ry="12" fill="${PAL.kamien}"/>`;
  s += `<ellipse cx="${f(cx - 18)}" cy="${f(y - 19)}" rx="25" ry="8" fill="#3a8fc8"/>`;
  s += `<ellipse cx="${f(cx - 22)}" cy="${f(y - 21)}" rx="14" ry="3.5" fill="${PAL.blekitJ}" opacity="0.7"/>`;
  for (let i = 0; i < 9; i++) {
    const a = Math.PI * (0.05 + (i / 8) * 0.9);
    s += `<ellipse cx="${f(cx - 18 + Math.cos(a) * 30)}" cy="${f(y - 16 + Math.sin(a) * 10)}" rx="6" ry="4" fill="${i % 2 ? PAL.kamienJ : PAL.kamien}" stroke="${PAL.kamienC}" stroke-width="1"/>`;
  }
  // kramik z daszkiem w paski
  const kx = cx + 10;
  s += `<rect x="${f(kx)}" y="${f(y - 46)}" width="46" height="40" fill="${PAL.drewno}"/>`;
  s += deskiPion(kx, y - 46, 46, 40, { szer: 7, ziarno: 121 });
  s += `<rect x="${f(kx + 30)}" y="${f(y - 46)}" width="16" height="40" fill="#000" opacity="0.22"/>`;
  s += `<rect x="${f(kx - 3)}" y="${f(y - 30)}" width="52" height="5" fill="${PAL.drewnoJ}"/>`;
  // butelki na ladzie
  const barwy = ['#e8542f', '#3d8fe0', '#58b83a', '#f2c230', '#e85aa8'];
  for (let i = 0; i < 5; i++) {
    const bx = kx + 4 + i * 9;
    s += `<rect x="${f(bx)}" y="${f(y - 42)}" width="6" height="12" rx="2" fill="${barwy[i]}"/><rect x="${f(bx + 1.8)}" y="${f(y - 46)}" width="2.4" height="5" fill="${barwy[i]}"/><rect x="${f(bx + 1)}" y="${f(y - 40)}" width="1.5" height="7" fill="#fff" opacity="0.6"/>`;
  }
  // markiza
  for (let i = 0; i < 6; i++) {
    const mx = kx - 6 + i * 10;
    s += `<path d="M${f(mx)} ${f(y - 66)} h10 l2 16 q-7 5 -14 0 Z" fill="${i % 2 ? PAL.biel : PAL.czerwien}"/>`;
  }
  s += `<rect x="${f(kx - 2)}" y="${f(y - 46)}" width="3" height="40" fill="${PAL.drewnoC}"/><rect x="${f(kx + 45)}" y="${f(y - 46)}" width="3" height="40" fill="${PAL.drewnoCC}"/>`;
  // beczka i kubek
  s += `<ellipse cx="${f(cx - 46)}" cy="${f(y - 5)}" rx="8" ry="3" fill="#000" opacity="0.3"/><rect x="${f(cx - 54)}" y="${f(y - 22)}" width="16" height="18" rx="3" fill="${PAL.drewno}"/><path d="M${f(cx - 54)} ${f(y - 17)} h16 M${f(cx - 54)} ${f(y - 9)} h16" stroke="${PAL.kamienC}" stroke-width="2"/><ellipse cx="${f(cx - 46)}" cy="${f(y - 22)}" rx="8" ry="3" fill="${PAL.drewnoJ}"/>`;
  s += trawka(cx + 62, y) + trawka(cx - 62, y + 1, 0.8);
  return svgObiektu(1.6, 1.6, s);
}

/** Obozowisko — ognisko, namiot, kociołek, tobołek. */
function ognisko() {
  const W = 1.6 * P;
  const H = 1.2 * P;
  const y = H - 3;
  const cx = W / 2;
  let s = '';
  s += placek(cx, y - 14, 64, 16, { kolor: PAL.ziemia, krycie: 0.55 });
  s += namiot(cx + 34, y - 18, 46, 44, '#4f8a3a', '#d6c99a');
  // trójnóg z kociołkiem
  s += ogien(cx - 12, y - 12, 1);
  s += `<path d="M${f(cx - 26)} ${f(y - 6)} L${f(cx - 12)} ${f(y - 44)} L${f(cx + 2)} ${f(y - 6)}" stroke="${PAL.drewnoC}" stroke-width="2.4" fill="none"/>`;
  s += `<line x1="${f(cx - 12)}" y1="${f(y - 44)}" x2="${f(cx - 12)}" y2="${f(y - 36)}" stroke="#333" stroke-width="1.2"/>`;
  s += `<path d="M${f(cx - 20)} ${f(y - 36)} h16 q0 12 -8 12 q-8 0 -8 -12 Z" fill="#2b2a2e"/><ellipse cx="${f(cx - 12)}" cy="${f(y - 36)}" rx="8" ry="2.4" fill="#58b83a"/>`;
  // tobołek i kłoda
  s += `<ellipse cx="${f(cx - 46)}" cy="${f(y - 10)}" rx="10" ry="7" fill="${PAL.czerwienC}"/><ellipse cx="${f(cx - 48)}" cy="${f(y - 12)}" rx="7" ry="4" fill="${PAL.czerwien}"/>`;
  s += `<rect x="${f(cx - 30)}" y="${f(y - 4)}" width="34" height="8" rx="4" fill="${PAL.drewno}"/><ellipse cx="${f(cx + 4)}" cy="${f(y)}" rx="3" ry="4" fill="${PAL.drewnoJ}"/>`;
  s += kula(cx + 8, y - 6, 5) + kula(cx + 16, y - 3, 4.5);
  return svgObiektu(1.6, 1.2, s);
}

/** Domek na drzewie — dąb z chatką na platformie i drabiną. */
function chatka() {
  const W = 1.8 * P;
  const H = 2.4 * P;
  const y = H - 3;
  const cx = W / 2;
  let s = '';
  s += cienRzucany(cx - 30, cx + 30, y, 120, { krycie: 0.25 });
  s += cienPod(cx, y - 2, 40, 7, 0.35);
  // pień
  s += `<path d="M${f(cx - 16)} ${f(y)} Q${f(cx - 8)} ${f(y - 40)} ${f(cx - 10)} ${f(y - 120)} L${f(cx + 10)} ${f(y - 120)} Q${f(cx + 8)} ${f(y - 40)} ${f(cx + 18)} ${f(y)} Z" fill="${PAL.drewno}"/>`;
  s += `<path d="M${f(cx + 2)} ${f(y)} Q${f(cx + 6)} ${f(y - 40)} ${f(cx + 4)} ${f(y - 120)} L${f(cx + 10)} ${f(y - 120)} Q${f(cx + 8)} ${f(y - 40)} ${f(cx + 18)} ${f(y)} Z" fill="${PAL.drewnoC}"/>`;
  s += `<path d="M${f(cx - 12)} ${f(y - 20)} q4 -20 0 -40 M${f(cx - 4)} ${f(y - 50)} q3 -14 -1 -30" stroke="${PAL.drewnoJ}" stroke-width="1.5" fill="none" opacity="0.6"/>`;
  // korona z tyłu
  const r = los(131);
  const kepy = [];
  for (let i = 0; i < 11; i++) kepy.push([cx + (r() - 0.5) * 120, y - 118 - r() * 70, 18 + r() * 12]);
  for (const [kx, ky, kr] of kepy) s += `<circle cx="${f(kx + 2)}" cy="${f(ky + 3)}" r="${f(kr)}" fill="${PAL.lisCC}"/>`;
  for (const [kx, ky, kr] of kepy) s += `<circle cx="${f(kx)}" cy="${f(ky)}" r="${f(kr * 0.92)}" fill="${PAL.lis}"/>`;
  for (const [kx, ky, kr] of kepy) s += `<circle cx="${f(kx - kr * 0.3)}" cy="${f(ky - kr * 0.35)}" r="${f(kr * 0.5)}" fill="${PAL.lisJ}" opacity="0.8"/>`;
  // platforma
  s += `<rect x="${f(cx - 46)}" y="${f(y - 104)}" width="92" height="7" fill="${PAL.drewno}"/><rect x="${f(cx - 46)}" y="${f(y - 104)}" width="92" height="2" fill="${PAL.drewnoJ}"/>`;
  s += `<line x1="${f(cx - 40)}" y1="${f(y - 97)}" x2="${f(cx - 8)}" y2="${f(y - 70)}" stroke="${PAL.drewnoC}" stroke-width="3"/><line x1="${f(cx + 40)}" y1="${f(y - 97)}" x2="${f(cx + 8)}" y2="${f(y - 70)}" stroke="${PAL.drewnoCC}" stroke-width="3"/>`;
  // chatka
  const d = dom({ x: cx - 32, y: y - 104, w: 48, h: 30, g: 22, dachH: 22, sciana: 'drewno', dach: 'dachowka', ziarno: 12 });
  s += d.svg;
  s += okno(cx - 22, y - 128, 10, 10, { swieci: true });
  s += `<rect x="${f(cx - 4)}" y="${f(y - 128)}" width="12" height="24" fill="#1d130b"/>`;
  // kilka kęp liści na przodzie (chatka wśród gałęzi)
  for (const [kx, ky, kr] of [
    [cx - 52, y - 112, 14],
    [cx + 50, y - 118, 15],
  ])
    s += `<circle cx="${f(kx + 2)}" cy="${f(ky + 2)}" r="${kr}" fill="${PAL.lisCC}"/><circle cx="${f(kx)}" cy="${f(ky)}" r="${kr * 0.92}" fill="${PAL.lis}"/><circle cx="${f(kx - 4)}" cy="${f(ky - 5)}" r="${kr * 0.45}" fill="${PAL.lisJ}"/>`;
  // drabina
  s += `<line x1="${f(cx + 14)}" y1="${f(y - 2)}" x2="${f(cx + 20)}" y2="${f(y - 98)}" stroke="${PAL.drewnoJ}" stroke-width="2.4"/><line x1="${f(cx + 26)}" y1="${f(y - 2)}" x2="${f(cx + 32)}" y2="${f(y - 98)}" stroke="${PAL.drewno}" stroke-width="2.4"/>`;
  for (let yy = y - 8; yy > y - 96; yy -= 9) {
    const t = (y - yy) / 96;
    s += `<line x1="${f(cx + 14 + t * 6)}" y1="${f(yy)}" x2="${f(cx + 26 + t * 6)}" y2="${f(yy)}" stroke="${PAL.drewnoJ}" stroke-width="2"/>`;
  }
  s += krzaczek(cx - 30, y, 1, { ziarno: 132 }) + trawka(cx + 44, y);
  return svgObiektu(1.8, 2.4, s);
}

/** Wędrowny sklepik — kryty wóz z towarem. */
function woz() {
  const W = 1.8 * P;
  const H = 1.4 * P;
  const y = H - 3;
  const cx = W / 2;
  let s = '';
  s += cienRzucany(cx - 60, cx + 50, y, 50, { krycie: 0.3 });
  // dyszel
  s += `<line x1="${f(cx - 40)}" y1="${f(y - 18)}" x2="${f(cx - 78)}" y2="${f(y - 4)}" stroke="${PAL.drewnoC}" stroke-width="3.5"/>`;
  // skrzynia wozu (front + bok)
  s += `<path d="${sciezka([
    [cx - 46, y - 18],
    [cx - 46, y - 40],
    [cx + 30, y - 40],
    [cx + 30, y - 18],
  ])}" fill="${PAL.drewno}"/>`;
  s += deskiPion(cx - 46, y - 40, 76, 22, { szer: 8, ziarno: 141 }).replace(/x1="([\d.]+)" y1="([\d.]+)" x2="([\d.]+)" y2="([\d.]+)"/g, (m) => m);
  s += `<path d="${sciezka([
    [cx + 30, y - 18],
    [cx + 30, y - 40],
    [cx + 50, y - 50],
    [cx + 50, y - 28],
  ])}" fill="${PAL.drewnoC}"/>`;
  // plandeka (beczkowata)
  const pl = `M${f(cx - 48)} ${f(y - 40)} C${f(cx - 50)} ${f(y - 84)} ${f(cx + 32)} ${f(y - 84)} ${f(cx + 32)} ${f(y - 40)} Z`;
  s += `<path d="${pl}" fill="#efe4c8"/>`;
  s += `<path d="M${f(cx + 32)} ${f(y - 40)} C${f(cx + 32)} ${f(y - 84)} ${f(cx + 52)} ${f(y - 94)} ${f(cx + 52)} ${f(y - 50)} Z" fill="#c9b994"/>`;
  for (const t of [0.2, 0.5, 0.8]) s += `<path d="M${f(cx - 48 + 80 * t)} ${f(y - 40)} Q${f(cx - 48 + 80 * t - 2)} ${f(y - 72)} ${f(cx - 48 + 80 * t)} ${f(y - 75)}" stroke="${PAL.czerwien}" stroke-width="5" fill="none"/>`;
  s += `<path d="${pl}" fill="url(#swiatloL)"/>`;
  // otwarty tył z towarem — skrzynki
  s += paka(cx + 32, y - 22, 14, 10, kula(cx + 38, y - 35, 4));
  // koła
  for (const [wx, wr, c] of [
    [cx - 30, 14, PAL.drewno],
    [cx + 18, 14, PAL.drewno],
  ]) {
    s += `<circle cx="${f(wx)}" cy="${f(y - 14)}" r="${wr}" fill="none" stroke="${PAL.drewnoCC}" stroke-width="4.5"/>`;
    s += `<circle cx="${f(wx)}" cy="${f(y - 14)}" r="${wr}" fill="none" stroke="${c}" stroke-width="2.4"/>`;
    for (let i = 0; i < 6; i++) {
      const a = (i / 6) * Math.PI;
      s += `<line x1="${f(wx - Math.cos(a) * wr)}" y1="${f(y - 14 - Math.sin(a) * wr)}" x2="${f(wx + Math.cos(a) * wr)}" y2="${f(y - 14 + Math.sin(a) * wr)}" stroke="${PAL.drewnoC}" stroke-width="1.6"/>`;
    }
    s += `<circle cx="${f(wx)}" cy="${f(y - 14)}" r="3" fill="${PAL.drewnoCC}"/>`;
  }
  // szyld
  s += `<rect x="${f(cx - 28)}" y="${f(y - 36)}" width="34" height="12" rx="2" fill="${PAL.zloto}"/><rect x="${f(cx - 26)}" y="${f(y - 34)}" width="30" height="8" fill="${PAL.czerwien}"/><circle cx="${f(cx - 11)}" cy="${f(y - 30)}" r="2.5" fill="${PAL.zloto}"/>`;
  s += kosz(cx - 62, y - 2, 14, 9, jagoda(cx - 65, y - 12, 3, '#d8303c') + jagoda(cx - 59, y - 13, 3, '#3f5fd8'));
  return svgObiektu(1.8, 1.4, s);
}

// ───────────────────────────── znajdźki ─────────────────────────────

function stosPokeball() {
  const W = 1 * P;
  const H = 0.8 * P;
  const y = H - 4;
  const cx = W / 2;
  let s = placek(cx, y - 6, 36, 9, { kolor: PAL.ziemia, krycie: 0.45 });
  s += cienPod(cx, y - 4, 34, 7, 0.45);
  // nieregularna kupka: kule różnej wielkości, od tyłu do przodu
  const kule = [
    [-14, -20, 9.5],
    [9, -24, 10],
    [-2, -33, 9],
    [-26, -7, 10],
    [-6, -9, 11.5],
    [17, -8, 10.5],
    [31, -4, 8],
  ];
  for (const [dx, dy, r] of kule) s += kula(cx + dx, y + dy, r);
  s += trawka(cx - 36, y) + trawka(cx + 38, y, 0.8);
  return svgObiektu(1, 0.8, s);
}

function stosJagody() {
  const W = 1 * P;
  const H = 0.8 * P;
  const y = H - 4;
  const cx = W / 2;
  let s = placek(cx, y - 6, 36, 9, { kolor: PAL.ziemia, krycie: 0.45 });
  s += cienPod(cx, y - 3, 32, 7, 0.4);
  // kosz z jagodami + kilka luzem
  const r = los(151);
  let jag = '';
  for (let i = 0; i < 16; i++) jag += jagoda(cx - 20 + r() * 40, y - 34 - r() * 12 + Math.abs(r() - 0.5) * 6, 5.2, BARWY_JAGOD[i % 4]);
  s += `<ellipse cx="${f(cx)}" cy="${f(y - 34)}" rx="26" ry="7" fill="#3a2410"/>`;
  s += jag;
  s += `<path d="M${f(cx - 28)} ${f(y - 34)} L${f(cx + 28)} ${f(y - 34)} L${f(cx + 21)} ${f(y - 2)} L${f(cx - 21)} ${f(y - 2)} Z" fill="${PAL.strzecha}"/>`;
  for (let yy = y - 31; yy < y - 2; yy += 4)
    s += `<line x1="${f(cx - 27 + (yy - y + 34) * 0.2)}" y1="${f(yy)}" x2="${f(cx + 27 - (yy - y + 34) * 0.2)}" y2="${f(yy)}" stroke="${PAL.strzechaC}" stroke-width="1.6"/>`;
  for (let xx = -20; xx <= 20; xx += 8) s += `<line x1="${f(cx + xx * 1.2)}" y1="${f(y - 34)}" x2="${f(cx + xx)}" y2="${f(y - 2)}" stroke="${PAL.strzechaJ}" stroke-width="1.2" opacity="0.7"/>`;
  s += `<rect x="${f(cx + 10)}" y="${f(y - 34)}" width="18" height="32" fill="#000" opacity="0.2"/>`;
  s += `<ellipse cx="${f(cx)}" cy="${f(y - 34)}" rx="28" ry="5" fill="none" stroke="${PAL.strzechaJ}" stroke-width="3"/>`;
  s += jagoda(cx + 34, y - 6, 5.2, BARWY_JAGOD[1]) + jagoda(cx - 33, y - 5, 5.2, BARWY_JAGOD[0]) + jagoda(cx - 26, y - 3, 4.8, BARWY_JAGOD[2]);
  s += `<path d="M${f(cx + 8)} ${f(y - 46)} q8 -8 14 -2 q-7 4 -14 2" fill="${PAL.lis}"/>`;
  return svgObiektu(1, 0.8, s);
}

function stosKamienie() {
  const W = 1 * P;
  const H = 0.8 * P;
  const y = H - 4;
  const cx = W / 2;
  let s = placek(cx, y - 6, 36, 9, { kolor: PAL.ziemia, krycie: 0.45 });
  s += cienPod(cx, y - 4, 34, 7, 0.4);
  s += glaz(cx - 4, y - 2, 60, 22, { ziarno: 161 });
  const kam = [
    [cx - 22, y - 14, 11, 0],
    [cx + 20, y - 13, 11, 1],
    [cx - 6, y - 28, 12, 2],
    [cx + 12, y - 34, 10, 3],
  ];
  for (const [x, yy, r, i] of kam) {
    s += `<ellipse cx="${f(x)}" cy="${f(yy)}" rx="${r + 6}" ry="${r + 4}" fill="${BARWY_KAMIENI[i]}" opacity="0.35" filter="url(#blask)"/>`;
    s += kamyk(x, yy, r, BARWY_KAMIENI[i]);
  }
  return svgObiektu(1, 0.8, s);
}

function stosOdlamki() {
  const W = 1 * P;
  const H = 0.9 * P;
  const y = H - 4;
  const cx = W / 2;
  let s = placek(cx, y - 6, 36, 9, { kolor: PAL.ziemia, krycie: 0.45 });
  s += cienPod(cx, y - 4, 32, 7, 0.4);
  s += `<ellipse cx="${f(cx)}" cy="${f(y - 26)}" rx="30" ry="26" fill="${PAL.fiolet}" opacity="0.35" filter="url(#blask)"/>`;
  s += glaz(cx, y - 1, 56, 20, { ziarno: 171 });
  s += krysztaly(cx, y - 10, 1.35, { ziarno: 172 });
  return svgObiektu(1, 0.9, s);
}

function skrzynia() {
  const W = 1 * P;
  const H = 0.8 * P;
  const y = H - 4;
  const cx = W / 2;
  const w = 56;
  const h = 26;
  const g = 16;
  let s = placek(cx, y - 6, 36, 9, { kolor: PAL.ziemia, krycie: 0.45 });
  s += cienRzucany(cx - w / 2, cx + w / 2, y, 40, { krycie: 0.35 });
  s += cienPod(cx, y - 2, 34, 6, 0.35);
  const x = cx - w / 2 - 6;
  // front
  s += wypelnij(sciezka([
    [x, y - 2],
    [x, y - 2 - h],
    [x + w, y - 2 - h],
    [x + w, y - 2],
  ]), PAL.drewno, deskiPion(x, y - 2 - h, w, h, { szer: 9, ziarno: 181 }));
  // bok
  s += `<path d="${sciezka([
    [x + w, y - 2],
    [x + w, y - 2 - h],
    [x + w + g * 0.6, y - 2 - h - g * 0.4],
    [x + w + g * 0.6, y - 2 - g * 0.4],
  ])}" fill="${PAL.drewnoC}"/>`;
  // wieko (półwalec)
  const wy = y - 2 - h;
  s += `<path d="M${f(x - 1)} ${f(wy)} Q${f(x - 1)} ${f(wy - 20)} ${f(x + w / 2)} ${f(wy - 20)} Q${f(x + w + 1)} ${f(wy - 20)} ${f(x + w + 1)} ${f(wy)} Z" fill="${PAL.drewno}"/>`;
  s += `<path d="M${f(x + w + 1)} ${f(wy)} Q${f(x + w + 1)} ${f(wy - 20)} ${f(x + w / 2)} ${f(wy - 20)} L${f(x + w / 2 + g * 0.6)} ${f(wy - 20 - g * 0.4)} Q${f(x + w + g * 0.6 + 1)} ${f(wy - 20 - g * 0.4)} ${f(x + w + g * 0.6 + 1)} ${f(wy - g * 0.4)} Z" fill="${PAL.drewnoC}"/>`;
  s += `<path d="M${f(x + 3)} ${f(wy - 6)} Q${f(x + 10)} ${f(wy - 17)} ${f(x + w / 2)} ${f(wy - 18)}" stroke="${PAL.drewnoJ}" stroke-width="2.5" fill="none"/>`;
  // okucia złote
  for (const dx of [6, w - 10]) {
    s += `<rect x="${f(x + dx)}" y="${f(wy - 18)}" width="4.5" height="${h + 18}" fill="${PAL.zlotoC}"/><rect x="${f(x + dx)}" y="${f(wy - 18)}" width="1.8" height="${h + 18}" fill="${PAL.zloto}"/>`;
  }
  s += `<rect x="${f(x - 1)}" y="${f(wy - 2)}" width="${w + 2}" height="4" fill="${PAL.zlotoC}"/><rect x="${f(x - 1)}" y="${f(wy - 2)}" width="${w + 2}" height="1.5" fill="${PAL.zloto}"/>`;
  s += `<rect x="${f(cx - 11)}" y="${f(wy - 4)}" width="10" height="12" rx="1.5" fill="${PAL.zloto}" stroke="${PAL.zlotoC}" stroke-width="1.2"/><circle cx="${f(cx - 6)}" cy="${f(wy + 2)}" r="1.6" fill="#2a1a08"/>`;
  // złoto wystające spod wieka
  s += `<circle cx="${f(x + 16)}" cy="${f(wy - 1)}" r="2.8" fill="${PAL.zloto}"/><circle cx="${f(x + 40)}" cy="${f(wy)}" r="2.6" fill="${PAL.zloto}"/>`;
  return svgObiektu(1, 0.8, s);
}

function artefakt() {
  const W = 1 * P;
  const H = 1.0 * P;
  const y = H - 4;
  const cx = W / 2;
  let s = placek(cx, y - 6, 36, 9, { kolor: PAL.ziemia, krycie: 0.45 });
  s += cienPod(cx, y - 3, 26, 6, 0.4);
  // postument
  s += `<path d="M${f(cx - 18)} ${f(y - 2)} L${f(cx - 14)} ${f(y - 24)} L${f(cx + 14)} ${f(y - 24)} L${f(cx + 18)} ${f(y - 2)} Z" fill="${PAL.kamien}"/>`;
  s += murKamienny(cx - 18, y - 24, 36, 22, { blok: 9, ziarno: 191 });
  s += `<path d="M${f(cx + 4)} ${f(y - 24)} L${f(cx + 14)} ${f(y - 24)} L${f(cx + 18)} ${f(y - 2)} L${f(cx + 6)} ${f(y - 2)} Z" fill="#000" opacity="0.22"/>`;
  s += `<ellipse cx="${f(cx)}" cy="${f(y - 24)}" rx="18" ry="5" fill="${PAL.kamienJ}"/>`;
  // świecący klejnot-gwiazda
  s += `<circle cx="${f(cx)}" cy="${f(y - 44)}" r="26" fill="${PAL.zloto}" opacity="0.4" filter="url(#blask)"/>`;
  const g = [];
  for (let i = 0; i < 10; i++) {
    const a = -Math.PI / 2 + (i * Math.PI) / 5;
    const rr = i % 2 ? 7 : 17;
    g.push([cx + Math.cos(a) * rr, y - 44 + Math.sin(a) * rr]);
  }
  s += `<polygon points="${pts(g.map(([a, b]) => [a + 1.5, b + 2]))}" fill="${PAL.zlotoC}"/>`;
  s += `<polygon points="${pts(g)}" fill="${PAL.zloto}"/>`;
  s += `<polygon points="${pts([g[0], g[1], [cx, y - 44], g[9]])}" fill="#fff3b0"/>`;
  s += `<polygon points="${pts([g[4], g[5], g[6], [cx, y - 44]])}" fill="${PAL.zlotoC}" opacity="0.6"/>`;
  s += `<circle cx="${f(cx)}" cy="${f(y - 44)}" r="4.5" fill="${PAL.czerwien}"/><circle cx="${f(cx - 1.4)}" cy="${f(y - 45.4)}" r="1.5" fill="#fff"/>`;
  return svgObiektu(1, 1.0, s);
}

export const OBIEKTY2 = {
  sad: { rysuj: sad },
  wiatrak: { rysuj: wiatrak },
  'oboz-treningowy': { rysuj: obozTreningowy },
  'drzewo-wiedzy': { rysuj: laboratorium },
  'kamienna-wieza': { rysuj: dojo },
  arena: { rysuj: arena },
  ranczo: { rysuj: ranczo },
  'wieza-obserwacyjna': { rysuj: wiezaObserwacyjna },
  gniazdo: { rysuj: gniazdo },
  zrodlo: { rysuj: zrodlo },
  ognisko: { rysuj: ognisko },
  chatka: { rysuj: chatka },
  woz: { rysuj: woz },
  'stos-pokeball': { rysuj: stosPokeball },
  'stos-jagody': { rysuj: stosJagody },
  'stos-kamien-ewolucji': { rysuj: stosKamienie },
  'stos-odlamki': { rysuj: stosOdlamki },
  skrzynia: { rysuj: skrzynia },
  artefakt: { rysuj: artefakt },
};

/** Most przez rzekę Polany — rysunek do tła (`MOSTY`, `render_mapa.py`), nie obiekt sceny. */
function most() {
  const W = 400;
  const H = 280;
  const P0 = [135, 200]; // przedni lewy róg pomostu
  const u = [250, -110]; // wzdłuż mostu (w prawo, pod górę)
  const v = [-112, -68]; // w poprzek (w głąb)
  const pt = (a, b, dz = 0) => [P0[0] + u[0] * a + v[0] * b, P0[1] + u[1] * a + v[1] * b + dz];
  const gr = 16;
  let s = '';
  // filary z kamienia: tylny rząd, potem przedni
  const filar = (a, b) => {
    const [x, y] = pt(a, b, gr);
    let o = `<path d="${sciezka([
      [x - 24, y - 4],
      [x - 20, y + 40],
      [x + 22, y + 44],
      [x + 26, y - 2],
    ])}" fill="${PAL.kamien}"/>`;
    o += murKamienny(x - 24, y - 4, 50, 48, { blok: 13, ziarno: Math.round(a * 50 + b * 7) });
    o += `<path d="${sciezka([
      [x + 4, y - 3],
      [x + 26, y - 2],
      [x + 22, y + 44],
      [x + 4, y + 44],
    ])}" fill="#120a04" opacity="0.3"/>`;
    o += `<ellipse cx="${f(x + 1)}" cy="${f(y + 44)}" rx="26" ry="6" fill="#d8eef4" opacity="0.55"/>`;
    return o;
  };
  for (const a of [0.12, 0.52, 0.9]) s += filar(a, 0.85);
  // spód pomostu (grubość) od frontu
  s += `<path d="${sciezka([pt(0, 0), pt(1, 0), pt(1, 0, gr), pt(0, 0, gr)])}" fill="${PAL.drewnoC}"/>`;
  s += `<path d="${sciezka([pt(0, 0), pt(0, 1), pt(0, 1, gr), pt(0, 0, gr)])}" fill="${PAL.drewno}"/>`;
  for (const a of [0.12, 0.52, 0.9]) s += filar(a, 0.12);
  // deski pomostu
  s += `<path d="${sciezka([pt(0, 0), pt(1, 0), pt(1, 1), pt(0, 1)])}" fill="${PAL.drewno}"/>`;
  const r = los(201);
  for (let i = 0; i <= 22; i++) {
    const a = i / 22;
    s += `<line x1="${f(pt(a, 0)[0])}" y1="${f(pt(a, 0)[1])}" x2="${f(pt(a, 1)[0])}" y2="${f(pt(a, 1)[1])}" stroke="${PAL.drewnoC}" stroke-width="2"/>`;
    if (i < 22 && r() < 0.5) {
      const [x, y] = pt(a + 0.02, 0.2 + r() * 0.6);
      s += `<line x1="${f(x)}" y1="${f(y)}" x2="${f(x + v[0] * 0.12)}" y2="${f(y + v[1] * 0.12)}" stroke="${PAL.drewnoJ}" stroke-width="2.4" opacity="0.6"/>`;
    }
  }
  s += `<path d="${sciezka([pt(0, 0), pt(1, 0), pt(1, 1), pt(0, 1)])}" fill="url(#swiatloL)"/>`;
  // poręcze: tylna i przednia
  const porecz = (b, kol, kolJ) => {
    let o = '';
    const sl = 6;
    for (let i = 0; i <= sl; i++) {
      const [x, y] = pt(i / sl, b);
      o += `<rect x="${f(x - 4)}" y="${f(y - 34)}" width="8" height="36" fill="${kol}"/><rect x="${f(x - 4)}" y="${f(y - 34)}" width="3" height="36" fill="${kolJ}"/><ellipse cx="${f(x)}" cy="${f(y - 34)}" rx="4" ry="2" fill="${kolJ}"/>`;
    }
    const [x0, y0] = pt(0, b);
    const [x1, y1] = pt(1, b);
    o += `<line x1="${f(x0)}" y1="${f(y0 - 28)}" x2="${f(x1)}" y2="${f(y1 - 28)}" stroke="${kol}" stroke-width="6" stroke-linecap="round"/><line x1="${f(x0)}" y1="${f(y0 - 30)}" x2="${f(x1)}" y2="${f(y1 - 30)}" stroke="${kolJ}" stroke-width="2"/>`;
    o += `<line x1="${f(x0)}" y1="${f(y0 - 14)}" x2="${f(x1)}" y2="${f(y1 - 14)}" stroke="${kol}" stroke-width="4"/>`;
    return o;
  };
  s = s.replace(/^/, '');
  const tyl = porecz(0.96, PAL.drewnoC, PAL.drewno);
  const przod = porecz(0.04, PAL.drewno, PAL.drewnoJ);
  // tylna poręcz musi być pod deskami? nie — stoi na tylnej krawędzi, więc nad nimi, ale przed przednią
  return svgObiektu(W / P, H / P, s + tyl + przod, { pad: 0, cien: 0 });
}

OBIEKTY2.most = { rysuj: most, tlo: true };
