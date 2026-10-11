// Obiekty w duchu świata Pokémon (nie średniowiecza): miasteczko z Centrum
// Pokémon, ognisty Gym, turbina, fabryka pokeballi, laboratorium, automat,
// kemping, boisko treningowe, stadion, wóz-kamper, czerwona stodoła, plecak,
// prosty most. Ten sam pędzel co reszta: światło z lewej góry, cień z sylwetki.
//
// HoMM3 HotA zostaje wzorcem PROPORCJI, osadzenia i spójności (ile pól zajmuje
// obiekt, gdzie jest wejście), a nie stylu.

import { P, PAL, f, pts, los, mix, sciezka, wypelnij, cienPod, dom, krzaczek, placek, naZiemi, svgObiektu, uid, deskiPion, drzewo, pasyDachu } from './pedzel.mjs';
import { kula, jagoda, latarnia, paka, plot, trawka, masyw } from './obiekty.mjs';

// ───────────────────────── klocki miasteczka ─────────────────────────

const MUR = '#f4ecdc';
const MUR_C = '#cbbd9f';

/** Szyba z białą ramą i odblaskiem. */
function szyba(x, y, w, h, { swiatlo = false } = {}) {
  let s = `<rect x="${f(x - 2)}" y="${f(y - 2)}" width="${f(w + 4)}" height="${f(h + 4)}" rx="2" fill="#ffffff"/>`;
  s += `<rect x="${f(x)}" y="${f(y)}" width="${f(w)}" height="${f(h)}" fill="${swiatlo ? '#ffe7a3' : '#5aa9d6'}"/>`;
  s += `<path d="M${f(x)} ${f(y)} h${f(w * 0.55)} l${f(-w * 0.35)} ${f(h)} h${f(-w * 0.2)} Z" fill="#fff" opacity="0.35"/>`;
  s += `<rect x="${f(x)}" y="${f(y + h - 3)}" width="${f(w)}" height="3" fill="#000" opacity="0.12"/>`;
  return s;
}

/** Przeszklone drzwi rozsuwane z wycieraczką. */
function drzwiSzklane(cx, y, w, h, rama = '#3a4a5a') {
  let s = `<rect x="${f(cx - w / 2 - 3)}" y="${f(y - h - 3)}" width="${f(w + 6)}" height="${f(h + 3)}" rx="2" fill="${rama}"/>`;
  s += `<rect x="${f(cx - w / 2)}" y="${f(y - h)}" width="${f(w)}" height="${f(h)}" fill="#7cc4e8"/>`;
  s += `<rect x="${f(cx - 1)}" y="${f(y - h)}" width="2" height="${f(h)}" fill="${rama}"/>`;
  s += `<path d="M${f(cx - w / 2)} ${f(y - h)} h${f(w * 0.3)} l${f(-w * 0.2)} ${f(h)} h${f(-w * 0.1)} Z" fill="#fff" opacity="0.4"/>`;
  s += `<rect x="${f(cx - w / 2 - 4)}" y="${f(y - 2)}" width="${f(w + 8)}" height="4" rx="1" fill="#8a7a66"/>`;
  return s;
}

/** Klomb kwiatów w niskiej obwódce. */
function klomb(cx, y, w, z = 1) {
  const r = los(z);
  let s = `<rect x="${f(cx - w / 2)}" y="${f(y - 7)}" width="${f(w)}" height="8" rx="3" fill="#b8a888"/><rect x="${f(cx - w / 2)}" y="${f(y - 7)}" width="${f(w)}" height="2.5" rx="1" fill="#e4d8bc"/>`;
  for (let i = 0; i < w / 5; i++) {
    const x = cx - w / 2 + 3 + r() * (w - 6);
    s += `<circle cx="${f(x)}" cy="${f(y - 9 - r() * 3)}" r="3.4" fill="${PAL.lis}"/>`;
  }
  for (let i = 0; i < w / 6; i++) {
    const x = cx - w / 2 + 4 + r() * (w - 8);
    s += `<circle cx="${f(x)}" cy="${f(y - 11 - r() * 3)}" r="2.2" fill="${['#f06a8a', '#ffd54a', '#ffffff', '#ff8a3a'][i % 4]}"/>`;
  }
  return s;
}

/** Wybrukowany placyk (grunt, bez cienia). */
function plac(cx, y, rx, ry) {
  return `<!--grunt--><ellipse cx="${f(cx)}" cy="${f(y)}" rx="${f(rx)}" ry="${f(ry)}" fill="#c9bfa8"/><ellipse cx="${f(cx)}" cy="${f(y)}" rx="${f(rx - 3)}" ry="${f(ry - 2)}" fill="#ddd3bc"/>${(() => {
    let s = '';
    for (let i = -6; i <= 6; i++) s += `<line x1="${f(cx + i * rx * 0.15)}" y1="${f(y - ry + 3)}" x2="${f(cx + i * rx * 0.17)}" y2="${f(y + ry - 3)}" stroke="#bcb19a" stroke-width="1.4"/>`;
    for (let j = -2; j <= 2; j++) s += `<line x1="${f(cx - rx + 6)}" y1="${f(y + j * ry * 0.3)}" x2="${f(cx + rx - 6)}" y2="${f(y + j * ry * 0.3)}" stroke="#bcb19a" stroke-width="1.2"/>`;
    return s;
  })()}<!--/grunt-->`;
}

/** Domek mieszkalny: gładkie ściany, dach w pasy, okna, drzwi. */
function domek(x, y, w, h, kolorDachu, z = 1, { okna = 2 } = {}) {
  const d = dom({ x, y, w, h, g: 30, dachH: 30, okap: 6, sciana: 'gladka', dach: 'pasy', kolorSciany: MUR, kolorDachu, ziarno: z });
  let s = d.svg;
  s += `<rect x="${f(x + w / 2 - 6)}" y="${f(y - 24)}" width="12" height="20" rx="2" fill="#8a5a34"/><circle cx="${f(x + w / 2 + 3)}" cy="${f(y - 13)}" r="1.4" fill="${PAL.zloto}"/>`;
  for (let i = 0; i < okna; i++) {
    const ox = i === 0 ? x + 6 : x + w - 18;
    s += szyba(ox, y - h + 10, 12, 11);
  }
  return s;
}

/** Latarnia uliczna (nowoczesna). */
function lampa(x, y, h = 34) {
  return `<rect x="${f(x - 1.6)}" y="${f(y - h)}" width="3.2" height="${f(h)}" fill="#4a5560"/>
  <circle cx="${f(x)}" cy="${f(y - h - 3)}" r="9" fill="${PAL.oknoSwiatlo}" opacity="0.35" filter="url(#blask)"/>
  <ellipse cx="${f(x)}" cy="${f(y - h - 2)}" rx="6" ry="4.5" fill="#fff6d0"/><path d="M${f(x - 6)} ${f(y - h - 3)} q6 -6 12 0 Z" fill="#4a5560"/>`;
}

/** Emblemat w kole (pokeball, płomień, błyskawica) na fasadzie. */
function emblemat(cx, cy, r, rodzaj) {
  if (rodzaj === 'pokeball') return kula(cx, cy, r);
  let s = `<circle cx="${f(cx + 1)}" cy="${f(cy + 1.5)}" r="${f(r)}" fill="#000" opacity="0.25"/><circle cx="${f(cx)}" cy="${f(cy)}" r="${f(r)}" fill="#fff8ec"/><circle cx="${f(cx)}" cy="${f(cy)}" r="${f(r - 2.5)}" fill="${rodzaj === 'plomien' ? '#d8452c' : '#f2c230'}"/>`;
  if (rodzaj === 'plomien')
    s += `<path d="M${f(cx)} ${f(cy - r * 0.7)} q${f(r * 0.55)} ${f(r * 0.45)} ${f(r * 0.35)} ${f(r * 1.05)} q${f(-r * 0.35)} ${f(r * 0.25)} ${f(-r * 0.7)} 0 q${f(-r * 0.25)} ${f(-r * 0.5)} ${f(r * 0.1)} ${f(-r * 0.7)} q${f(0)} ${f(r * 0.35)} ${f(r * 0.18)} ${f(r * 0.4)} q${f(r * 0.08)} ${f(-r * 0.45)} ${f(r * 0.07)} ${f(-r * 0.75)} Z" fill="#ffd34a"/>`;
  else
    s += `<path d="M${f(cx + r * 0.15)} ${f(cy - r * 0.7)} L${f(cx - r * 0.4)} ${f(cy + r * 0.1)} H${f(cx)} L${f(cx - r * 0.15)} ${f(cy + r * 0.7)} L${f(cx + r * 0.4)} ${f(cy - r * 0.1)} H${f(cx)} Z" fill="#3a3020"/>`;
  return s;
}

// ───────────────────────── miasteczka ─────────────────────────

/** Miasteczko gracza: Centrum Pokémon pośrodku, domek i Poké Mart z tyłu. 3 × 2 bryły. */
function miasteczko() {
  const W = 4.2 * P;
  const H = 3.4 * P;
  const y = H - 3;
  const cx = W / 2;
  let s = '';
  s += plac(cx, y - 4, 120, 22);
  s += placek(cx, y - 50, 190, 56, { kolor: PAL.ziemia, krycie: 0.35 });
  // tył: domek (zielony dach) i Poké Mart (niebieski dach)
  const yb = y - 112;
  s += naZiemi(yb, domek(cx - 176, yb, 70, 44, '#4f9a4a', 3));
  let mart = domek(cx + 104, yb, 76, 46, '#3f78c8', 4);
  mart += `<rect x="${f(cx + 120)}" y="${f(yb - 56)}" width="44" height="12" rx="3" fill="#3f78c8"/><rect x="${f(cx + 122)}" y="${f(yb - 54)}" width="40" height="8" rx="2" fill="#5a96e0"/><path d="M${f(cx + 134)} ${f(yb - 47)} v-6 l4 4 l4 -4 v6" stroke="#fff" stroke-width="1.8" fill="none"/>`;
  s += naZiemi(yb, mart);
  s += naZiemi(yb + 6, drzewo(cx - 96, yb + 6, 1.5, { ziarno: 7 }) + drzewo(cx + 74, yb + 4, 1.3, { ziarno: 8 }));
  // Centrum Pokémon
  const cw = 196;
  const ch = 70;
  const d = dom({ x: cx - cw / 2 - 12, y: y - 8, w: cw, h: ch, g: 50, dachH: 50, okap: 8, sciana: 'gladka', dach: 'pasy', kolorSciany: MUR, kolorDachu: '#d63c30', ziarno: 9 });
  s += d.svg;
  // czerwony pas pod oknami i szyld nad wejściem
  const x0 = cx - cw / 2 - 12;
  s += `<rect x="${f(x0)}" y="${f(y - 24)}" width="${cw}" height="9" fill="#d63c30"/><rect x="${f(x0)}" y="${f(y - 24)}" width="${cw}" height="2.5" fill="#f0786a"/>`;
  for (const ox of [x0 + 10, x0 + 46, cx + 30, cx + 66]) s += szyba(ox, y - 68, 24, 30, { swiatlo: ox > cx });
  s += drzwiSzklane(cx - 12, y - 8, 40, 42);
  s += `<rect x="${f(cx - 46)}" y="${f(y - 68)}" width="68" height="14" rx="3" fill="#d63c30"/><rect x="${f(cx - 44)}" y="${f(y - 66)}" width="64" height="4" rx="2" fill="#f0786a"/>`;
  s += `<circle cx="${f(cx - 12)}" cy="${f(y - 61)}" r="5" fill="#fff"/><path d="M${f(cx - 17)} ${f(y - 61)} h10" stroke="#d63c30" stroke-width="1.6"/><circle cx="${f(cx - 12)}" cy="${f(y - 61)}" r="1.8" fill="#d63c30"/>`;
  // wielki pokeball na połaci dachu
  s += kula(cx - 4, d.top - 24, 19);
  s += lampa(cx - 72, y - 2) + lampa(cx + 52, y - 2);
  s += klomb(cx - 112, y - 2, 34, 11) + klomb(cx + 104, y - 2, 34, 12);
  s += krzaczek(cx - 178, y - 6, 1.3, { ziarno: 13 }) + krzaczek(cx + 176, y - 6, 1.3, { ziarno: 14 });
  return svgObiektu(4.2, 3.4, s);
}

/** Fort wroga: ognisty Gym — wielka sala z emblematem płomienia, kosze z ogniem. 3 × 2. */
function gym() {
  const W = 4.2 * P;
  const H = 3.6 * P;
  const y = H - 3;
  const cx = W / 2;
  let s = '';
  s += plac(cx, y - 4, 128, 22);
  s += placek(cx, y - 50, 196, 58, { kolor: '#8a5a3a', krycie: 0.4 });
  // za salą: kopuła areny (pomarańczowa, z pasami) — znak rozpoznawczy Gymu
  const ky = y - 96;
  s += naZiemi(
    ky,
    `<path d="M${f(cx - 96)} ${f(ky)} A96 92 0 0 1 ${f(cx + 96)} ${f(ky)} Z" fill="#e0703f"/>` +
      `<path d="M${f(cx)} ${f(ky - 92)} A96 92 0 0 1 ${f(cx + 96)} ${f(ky)} L${f(cx + 30)} ${f(ky)} Z" fill="#b84a26"/>` +
      [0.25, 0.5, 0.75].map((t) => `<path d="M${f(cx - 96 * Math.cos(t * Math.PI))} ${f(ky - 0)} Q${f(cx - 96 * Math.cos(t * Math.PI) * 0.7)} ${f(ky - 92 * 0.9)} ${f(cx)} ${f(ky - 92)}" stroke="#ffd34a" stroke-width="3" fill="none" opacity="0.8"/>`).join('') +
      `<path d="M${f(cx - 70)} ${f(ky - 50)} Q${f(cx - 50)} ${f(ky - 80)} ${f(cx - 10)} ${f(ky - 88)}" stroke="#ffb88a" stroke-width="6" fill="none" opacity="0.6" stroke-linecap="round"/>` +
      `<rect x="${f(cx - 5)}" y="${f(ky - 112)}" width="10" height="22" fill="#5a2a1c"/>` +
      emblemat(cx, ky - 118, 12, 'plomien')
  );
  // dwa domki z czerwonymi dachami
  const yb = y - 100;
  s += naZiemi(yb, domek(cx - 184, yb, 66, 40, '#c2452a', 5, { okna: 1 }));
  s += naZiemi(yb, domek(cx + 118, yb, 66, 40, '#c2452a', 6, { okna: 1 }));
  // sala Gymu
  const gw = 220;
  const gh = 78;
  const x0 = cx - gw / 2 - 12;
  const d = dom({ x: x0, y: y - 8, w: gw, h: gh, g: 54, dachH: 46, okap: 9, sciana: 'gladka', dach: 'pasy', kolorSciany: '#efd9b6', kolorDachu: '#b8402a', ziarno: 21 });
  s += d.svg;
  // ceglany cokół i pas
  s += `<rect x="${f(x0)}" y="${f(y - 26)}" width="${gw}" height="18" fill="#9a4a32"/>`;
  for (let i = 0; i < gw; i += 12) s += `<line x1="${f(x0 + i)}" y1="${f(y - 26)}" x2="${f(x0 + i)}" y2="${f(y - 8)}" stroke="#7a3422" stroke-width="1.2"/>`;
  s += `<rect x="${f(x0)}" y="${f(y - 17)}" width="${gw}" height="1.4" fill="#7a3422"/>`;
  // kolumny i brama
  s += drzwiSzklane(cx - 12, y - 8, 46, 48, '#5a2a1c');
  for (const ox of [cx - 48, cx + 22]) s += `<rect x="${f(ox)}" y="${f(y - 74)}" width="13" height="66" fill="#fff6e6"/><rect x="${f(ox + 8)}" y="${f(y - 74)}" width="5" height="66" fill="#000" opacity="0.15"/><rect x="${f(ox - 3)}" y="${f(y - 78)}" width="19" height="6" fill="#e6d4b4"/>`;
  for (const ox of [x0 + 12, x0 + 44, cx + 50, cx + 82]) s += szyba(ox, y - 70, 20, 26, { swiatlo: true });
  // emblemat płomienia nad wejściem (wysunięty szczyt)
  s += emblemat(cx - 12, y - 92, 20, 'plomien');
  s += `<rect x="${f(cx - 56)}" y="${f(y - 82)}" width="88" height="5" fill="#b8402a"/>`;
  // kosze z ogniem
  for (const dx of [-84, 64]) {
    const fx = cx + dx;
    s += `<circle cx="${f(fx)}" cy="${f(y - 34)}" r="14" fill="#ff8a2a" opacity="0.45" filter="url(#blask)"/>`;
    s += `<rect x="${f(fx - 2)}" y="${f(y - 26)}" width="4" height="22" fill="#3a3230"/><path d="M${f(fx - 9)} ${f(y - 28)} h18 l-3 6 h-12 Z" fill="#4a4240"/><path d="M${f(fx - 7)} ${f(y - 28)} q0 -13 7 -17 q1 9 7 6 q0 7 -2 11 Z" fill="#ff8a2a"/><path d="M${f(fx - 3)} ${f(y - 28)} q1 -8 3 -11 q2 7 3 11 Z" fill="#ffd34a"/>`;
  }
  s += krzaczek(cx - 176, y - 6, 1.2, { ziarno: 22 }) + krzaczek(cx + 176, y - 6, 1.2, { ziarno: 23 });
  return svgObiektu(4.2, 3.6, s);
}

// ───────────────────────── budowle ─────────────────────────

/** Turbina wiatrowa „Wiatrak Prądu” z budką rozdzielni. 3 × 1. */
function turbina() {
  const W = 3 * P;
  const H = 3.2 * P;
  const y = H - 3;
  const cx = W / 2 + 14;
  let s = '';
  s += placek(cx - 20, y - 8, 100, 22, { kolor: PAL.ziemia, krycie: 0.45 });
  // rozdzielnia po lewej
  const b = dom({ x: cx - 104, y: y - 4, w: 58, h: 38, g: 26, dachH: 0.1, okap: 2, sciana: 'gladka', dach: 'pasy', kolorSciany: '#dfe4e8', kolorDachu: '#9aa4ae', ziarno: 31 });
  s += b.svg;
  s += `<rect x="${f(cx - 104)}" y="${f(y - 46)}" width="58" height="6" fill="#8a949e"/>`;
  s += `<rect x="${f(cx - 90)}" y="${f(y - 30)}" width="16" height="26" rx="1.5" fill="#6a7682"/><rect x="${f(cx - 90)}" y="${f(y - 30)}" width="16" height="3" fill="#8a96a2"/>`;
  s += emblemat(cx - 60, y - 26, 8, 'blyskawica');
  // maszt — smukły, zwężający się, światło z lewej
  const mh = 196;
  const top = y - 6 - mh;
  s += `<path d="${sciezka([
    [cx - 9, y - 6],
    [cx - 4.5, top],
    [cx + 4.5, top],
    [cx + 9, y - 6],
  ])}" fill="#eef1f4"/>`;
  s += `<path d="${sciezka([
    [cx + 1, y - 6],
    [cx + 1, top],
    [cx + 4.5, top],
    [cx + 9, y - 6],
  ])}" fill="#c3cad2"/>`;
  s += `<rect x="${f(cx - 16)}" y="${f(y - 12)}" width="32" height="8" rx="2" fill="#a8b0b8"/>`;
  // gondola
  s += `<rect x="${f(cx - 10)}" y="${f(top - 8)}" width="30" height="13" rx="6" fill="#f4f6f8"/><rect x="${f(cx - 10)}" y="${f(top - 1)}" width="30" height="6" rx="3" fill="#c3cad2"/>`;
  // trzy łopaty
  const hx = cx - 12;
  const hy = top - 2;
  for (let i = 0; i < 3; i++) {
    const a = ((i * 120 - 75) * Math.PI) / 180;
    const L = 104;
    const ex = hx + Math.cos(a) * L;
    const ey = hy + Math.sin(a) * L;
    const nx = -Math.sin(a) * 7;
    const ny = Math.cos(a) * 7;
    s += `<path d="M${f(hx + nx * 0.6)} ${f(hy + ny * 0.6)} Q${f(hx + Math.cos(a) * L * 0.3 + nx * 1.3)} ${f(hy + Math.sin(a) * L * 0.3 + ny * 1.3)} ${f(ex)} ${f(ey)} L${f(hx - nx * 0.5)} ${f(hy - ny * 0.5)} Z" fill="#f7f8fa"/>`;
    s += `<path d="M${f(ex)} ${f(ey)} L${f(hx - nx * 0.5)} ${f(hy - ny * 0.5)} L${f(hx)} ${f(hy)} Z" fill="#c9d0d8"/>`;
    s += `<path d="M${f(ex - Math.cos(a) * 12)} ${f(ey - Math.sin(a) * 12)} L${f(ex)} ${f(ey)}" stroke="#e85a3a" stroke-width="4" stroke-linecap="round"/>`;
  }
  s += `<circle cx="${f(hx)}" cy="${f(hy)}" r="7" fill="#f4f6f8"/><circle cx="${f(hx - 2)}" cy="${f(hy - 2)}" r="3" fill="#fff"/>`;
  // ogrodzenie z siatki
  s += plot(cx + 30, y - 2, cx + 110, y - 8, { slupki: 3 });
  s += krzaczek(cx - 128, y, 1.0, { ziarno: 32 }) + trawka(cx + 18, y);
  return svgObiektu(3, 3.2, s);
}

/** Fabryka pokeballi (kopalnia „pokeball”): hala z szedowym dachem, komin, taśma. 3 × 1. */
function fabryka() {
  const W = 3 * P;
  const H = 2.4 * P;
  const y = H - 3;
  const cx = W / 2;
  let s = '';
  s += plac(cx, y - 2, 90, 14);
  // komin w paski
  const kx = cx + 70;
  s += naZiemi(y - 60, `<rect x="${f(kx)}" y="${f(y - 186)}" width="18" height="126" fill="#e8e4dc"/>${[0, 1, 2, 3].map((i) => `<rect x="${f(kx)}" y="${f(y - 186 + i * 30)}" width="18" height="12" fill="#d63c30"/>`).join('')}<rect x="${f(kx + 11)}" y="${f(y - 186)}" width="7" height="126" fill="#000" opacity="0.15"/><rect x="${f(kx - 2)}" y="${f(y - 190)}" width="22" height="6" fill="#9aa4ae"/>
  <g opacity="0.75" filter="url(#cienMaly)"><circle cx="${f(kx + 10)}" cy="${f(y - 200)}" r="8" fill="#f2f2f2"/><circle cx="${f(kx + 20)}" cy="${f(y - 212)}" r="10" fill="#e8e8e8"/></g>`);
  // hala: ściana frontowa + szedowy dach (zęby)
  const hw = 196;
  const hh = 58;
  const x0 = cx - hw / 2 - 10;
  const g = 44;
  const gx = g * 0.62;
  const gy = g * 0.42;
  s += wypelnij(sciezka([
    [x0 + hw, y - 6],
    [x0 + hw, y - 6 - hh],
    [x0 + hw + gx, y - 6 - hh - gy],
    [x0 + hw + gx, y - 6 - gy],
  ]), '#b9c0c8', '', { swiatlo: null });
  s += wypelnij(sciezka([
    [x0, y - 6],
    [x0, y - 6 - hh],
    [x0 + hw, y - 6 - hh],
    [x0 + hw, y - 6],
  ]), '#eef0f2', `<rect x="${f(x0)}" y="${f(y - 22)}" width="${hw}" height="16" fill="#d63c30"/><rect x="${f(x0)}" y="${f(y - 22)}" width="${hw}" height="3" fill="#f0786a"/>`);
  // zęby dachu
  const zeby = 5;
  for (let i = 0; i < zeby; i++) {
    const zx = x0 + (hw / zeby) * i;
    const zw = hw / zeby;
    const zy = y - 6 - hh;
    s += `<path d="${sciezka([
      [zx, zy],
      [zx + gx, zy - gy],
      [zx + gx, zy - gy - 22],
      [zx, zy - 22],
    ])}" fill="#7cc4e8"/>`;
    s += `<path d="${sciezka([
      [zx, zy - 22],
      [zx + gx, zy - gy - 22],
      [zx + zw + gx, zy - gy],
      [zx + zw, zy],
    ])}" fill="#d63c30"/>`;
    s += `<path d="M${f(zx)} ${f(zy - 22)} L${f(zx + gx)} ${f(zy - gy - 22)}" stroke="#f0786a" stroke-width="2"/>`;
  }
  // brama z taśmą i pokeballami
  s += `<rect x="${f(cx - 26)}" y="${f(y - 50)}" width="40" height="44" fill="#3a4450"/>`;
  for (let i = 0; i < 6; i++) s += `<rect x="${f(cx - 26)}" y="${f(y - 50 + i * 7)}" width="40" height="2" fill="#56626e"/>`;
  s += `<rect x="${f(cx - 34)}" y="${f(y - 14)}" width="70" height="8" rx="4" fill="#4a5560"/><rect x="${f(cx - 34)}" y="${f(y - 14)}" width="70" height="3" rx="1.5" fill="#7a8692"/>`;
  s += kula(cx - 22, y - 18, 5) + kula(cx - 8, y - 18, 5) + kula(cx + 8, y - 18, 5) + kula(cx + 24, y - 18, 5);
  // wielki pokeball-szyld na ścianie
  s += kula(x0 + 30, y - 40, 15) + kula(x0 + hw - 30, y - 40, 15);
  s += paka(x0 - 26, y - 2, 22, 14, kula(x0 - 19, y - 18, 4.6) + kula(x0 - 10, y - 18, 4.6));
  s += krzaczek(cx + 128, y - 2, 1, { ziarno: 41 });
  return svgObiektu(3, 2.4, s);
}

/** Laboratorium profesora: biały budynek, panele słoneczne, antena. 3 × 1. */
function laboratorium() {
  const W = 3 * P;
  const H = 2.5 * P;
  const y = H - 3;
  const cx = W / 2;
  let s = '';
  s += plac(cx, y - 2, 80, 13);
  s += naZiemi(y - 40, drzewo(cx - 112, y - 40, 1.8, { ziarno: 51 }));
  const lw = 184;
  const lh = 66;
  const x0 = cx - lw / 2 - 12;
  const d = dom({ x: x0, y: y - 6, w: lw, h: lh, g: 48, dachH: 30, okap: 7, sciana: 'gladka', dach: 'pasy', kolorSciany: '#f6f4ee', kolorDachu: '#3e9a8c', ziarno: 52 });
  s += d.svg;
  // panele słoneczne na połaci
  const [r1, r2] = d.kalenica;
  for (let i = 0; i < 3; i++) {
    const px = x0 + 22 + i * 40;
    const py = d.top - 10;
    s += `<path d="${sciezka([
      [px, py],
      [px + 34, py],
      [px + 34 + 10, py - 16],
      [px + 10, py - 16],
    ])}" fill="#2a4a7a"/>`;
    s += `<path d="M${f(px + 17)} ${f(py)} L${f(px + 27)} ${f(py - 16)} M${f(px + 5)} ${f(py - 8)} H${f(px + 39)}" stroke="#8ab4e8" stroke-width="1.2"/>`;
  }
  // antena satelitarna
  const ax = r2[0] - 10;
  const ay = r2[1];
  s += `<rect x="${f(ax - 1.5)}" y="${f(ay - 22)}" width="3" height="22" fill="#8a949e"/><ellipse cx="${f(ax + 4)}" cy="${f(ay - 28)}" rx="13" ry="8" fill="#eef1f4" transform="rotate(-25 ${f(ax + 4)} ${f(ay - 28)})"/><ellipse cx="${f(ax + 5)}" cy="${f(ay - 27)}" rx="9" ry="5" fill="#c3cad2" transform="rotate(-25 ${f(ax + 5)} ${f(ay - 27)})"/>`;
  void r1;
  // duże okna i wejście z szyldem
  for (const ox of [x0 + 10, x0 + 44, cx + 28, cx + 62]) s += szyba(ox, y - 58, 26, 28, { swiatlo: ox > cx });
  s += drzwiSzklane(cx - 12, y - 6, 34, 38, '#2e6a62');
  s += `<rect x="${f(cx - 40)}" y="${f(y - 66)}" width="56" height="13" rx="3" fill="#3e9a8c"/><circle cx="${f(cx - 30)}" cy="${f(y - 59.5)}" r="4" fill="#fff"/><path d="M${f(cx - 22)} ${f(y - 60)} h28" stroke="#fff" stroke-width="2"/>`;
  s += klomb(cx - 70, y - 2, 30, 53) + klomb(cx + 56, y - 2, 30, 54);
  return svgObiektu(3, 2.5, s);
}

/** Boisko treningowe: pole walki z liniami i pokeballem, opony, pachołki, ławka. 3 × 1. */
function boisko() {
  const W = 3 * P;
  const H = 2.0 * P;
  const y = H - 3;
  const cx = W / 2;
  let s = '';
  // pole (równoległobok w rzucie 3/4)
  const pole = [
    [cx - 124, y - 8],
    [cx + 104, y - 8],
    [cx + 128, y - 92],
    [cx - 100, y - 92],
  ];
  s += `<!--grunt--><path d="${sciezka(pole.map(([x, yy], i) => [x + (i < 2 ? 0 : 0), yy + 4]))}" fill="#7a5a32" opacity="0.5" filter="url(#cienMaly)"/><path d="${sciezka(pole)}" fill="#d9b47a"/><!--/grunt-->`;
  s += `<!--grunt--><path d="${sciezka([
    [cx - 114, y - 14],
    [cx + 96, y - 14],
    [cx + 118, y - 86],
    [cx - 92, y - 86],
  ])}" fill="none" stroke="#fff" stroke-width="3" opacity="0.9"/><line x1="${f(cx - 9)}" y1="${f(y - 14)}" x2="${f(cx + 13)}" y2="${f(y - 86)}" stroke="#fff" stroke-width="3" opacity="0.9"/><ellipse cx="${f(cx + 2)}" cy="${f(y - 50)}" rx="24" ry="13" fill="none" stroke="#fff" stroke-width="3" opacity="0.9"/><!--/grunt-->`;
  s += `<!--grunt--><ellipse cx="${f(cx + 2)}" cy="${f(y - 50)}" rx="12" ry="6.5" fill="#d63c30"/><path d="M${f(cx - 10)} ${f(y - 50)} a12 6.5 0 0 0 24 0 Z" fill="#fff"/><circle cx="${f(cx + 2)}" cy="${f(y - 50)}" r="2.6" fill="#333"/><!--/grunt-->`;
  // ławka z tyłu po lewej i proporczyk
  s += naZiemi(y - 96, `<rect x="${f(cx - 96)}" y="${f(y - 112)}" width="60" height="7" rx="2" fill="${PAL.drewno}"/><rect x="${f(cx - 96)}" y="${f(y - 112)}" width="60" height="2.5" fill="${PAL.drewnoJ}"/><rect x="${f(cx - 92)}" y="${f(y - 105)}" width="4" height="9" fill="#4a5560"/><rect x="${f(cx - 44)}" y="${f(y - 105)}" width="4" height="9" fill="#4a5560"/>`);
  // opony (stos) i pachołki
  const opona = (x, yy) => `<ellipse cx="${f(x)}" cy="${f(yy)}" rx="12" ry="6" fill="#2a2a2e"/><ellipse cx="${f(x)}" cy="${f(yy - 3)}" rx="12" ry="6" fill="#3a3a40"/><ellipse cx="${f(x)}" cy="${f(yy - 3)}" rx="5.5" ry="2.6" fill="#1a1a1c"/>`;
  s += opona(cx + 112, y - 4) + opona(cx + 112, y - 10) + opona(cx + 112, y - 16);
  s += opona(cx + 136, y - 22);
  const pacholek = (x, yy) => `<path d="M${f(x - 6)} ${f(yy)} L${f(x)} ${f(yy - 16)} L${f(x + 6)} ${f(yy)} Z" fill="#f07a2a"/><path d="M${f(x - 3.6)} ${f(yy - 6)} h7.2 l-1 -3 h-5.2 Z" fill="#fff"/><rect x="${f(x - 8)}" y="${f(yy - 2)}" width="16" height="3" rx="1" fill="#d0601a"/>`;
  for (let i = 0; i < 4; i++) s += pacholek(cx - 70 + i * 26, y - 22 - i * 4);
  // pal treningowy (kłoda) po lewej
  s += `<rect x="${f(cx - 138)}" y="${f(y - 40)}" width="14" height="36" rx="3" fill="${PAL.drewno}"/><ellipse cx="${f(cx - 131)}" cy="${f(y - 40)}" rx="7" ry="3" fill="${PAL.drewnoJ}"/><rect x="${f(cx - 138)}" y="${f(y - 30)}" width="14" height="4" fill="#d63c30"/>`;
  s += `<rect x="${f(cx + 128)}" y="${f(y - 104)}" width="2.6" height="46" fill="#4a5560"/><path d="M${f(cx + 130)} ${f(y - 104)} l18 5 l-18 5 Z" fill="#d63c30"/>`;
  return svgObiektu(3, 2.0, s);
}

/** Stadion: trybuny z niebieskimi rzędami wokół boiska, jupitery, logo. 3 × 1. */
function stadion() {
  const W = 3 * P;
  const H = 2.3 * P;
  const y = H - 3;
  const cx = W / 2;
  let s = '';
  const rx = 132;
  const ry = 62;
  const cy = y - 70;
  const sc = 28;
  // tył trybun (pierścień widziany od środka)
  s += `<ellipse cx="${f(cx)}" cy="${f(cy - sc)}" rx="${rx}" ry="${ry}" fill="#8a96a2"/>`;
  for (let i = 0; i < 5; i++) s += `<ellipse cx="${f(cx)}" cy="${f(cy - sc + 4 + i * 4.5)}" rx="${rx - 8 - i * 10}" ry="${ry - 7 - i * 7}" fill="${i % 2 ? '#3f78c8' : '#5a96e0'}" stroke="#2a5aa0" stroke-width="1"/>`;
  // boisko
  s += `<ellipse cx="${f(cx)}" cy="${f(cy - sc + 26)}" rx="${rx - 60}" ry="${ry - 38}" fill="#6fbf4a"/>`;
  s += `<rect x="${f(cx - 44)}" y="${f(cy - sc + 14)}" width="88" height="24" fill="#d9b47a"/><rect x="${f(cx - 44)}" y="${f(cy - sc + 14)}" width="88" height="24" fill="none" stroke="#fff" stroke-width="2"/><line x1="${f(cx)}" y1="${f(cy - sc + 14)}" x2="${f(cx)}" y2="${f(cy - sc + 38)}" stroke="#fff" stroke-width="2"/><circle cx="${f(cx)}" cy="${f(cy - sc + 26)}" r="6" fill="none" stroke="#fff" stroke-width="2"/>`;
  // front: ściana stadionu (dolny półokrąg) — biała z czerwonym pasem
  const zew = `M${f(cx - rx)} ${f(cy - sc)} A${rx} ${ry} 0 0 0 ${f(cx + rx)} ${f(cy - sc)} L${f(cx + rx)} ${f(cy)} A${rx} ${ry} 0 0 1 ${f(cx - rx)} ${f(cy)} Z`;
  const zew2 = `M${f(cx - rx)} ${f(cy)} A${rx} ${ry} 0 0 0 ${f(cx + rx)} ${f(cy)} L${f(cx + rx)} ${f(cy - sc)} A${rx} ${ry} 0 0 1 ${f(cx - rx)} ${f(cy - sc)} Z`;
  void zew;
  const id = uid('st');
  s += `<clipPath id="${id}"><path d="${zew2}"/></clipPath><path d="${zew2}" fill="#f4f2ec"/>`;
  s += `<g clip-path="url(#${id})"><rect x="${f(cx - rx)}" y="${f(cy + ry - 22)}" width="${2 * rx}" height="40" fill="#d63c30"/><path d="M${f(cx - rx)} ${f(cy - sc + ry + 8)} A${rx} ${ry} 0 0 0 ${f(cx + rx)} ${f(cy - sc + 8)}" stroke="#d63c30" stroke-width="7" fill="none"/>`;
  s += `<rect x="${f(cx + 40)}" y="${f(cy - sc - ry)}" width="${rx}" height="${sc + 2 * ry + 20}" fill="#000" opacity="0.2"/><rect x="${f(cx - rx)}" y="${f(cy - sc - ry)}" width="40" height="${sc + 2 * ry + 20}" fill="#fff" opacity="0.15"/></g>`;
  // brama
  s += `<path d="M${f(cx - 20)} ${f(cy + ry)} V${f(cy + ry - 22)} Q${f(cx)} ${f(cy + ry - 36)} ${f(cx + 20)} ${f(cy + ry - 22)} V${f(cy + ry)} Z" fill="#2a3440"/>`;
  s += kula(cx, cy + ry - 40, 11);
  // jupitery
  for (const dx of [-rx + 8, rx - 8]) {
    const lx = cx + dx;
    s += `<rect x="${f(lx - 1.6)}" y="${f(cy - sc - 70)}" width="3.2" height="${70}" fill="#6a7682"/><rect x="${f(lx - 10)}" y="${f(cy - sc - 82)}" width="20" height="12" rx="2" fill="#4a5560"/>`;
    for (let i = 0; i < 3; i++) s += `<circle cx="${f(lx - 6 + i * 6)}" cy="${f(cy - sc - 76)}" r="2.4" fill="#fff6c0"/>`;
  }
  s += krzaczek(cx - rx - 4, y, 1.0, { ziarno: 71 }) + krzaczek(cx + rx + 4, y, 1.0, { ziarno: 72 });
  return svgObiektu(3, 2.3, s);
}

/** Automat z napojami z ławką i doniczką. */
function automat() {
  const W = 1.6 * P;
  const H = 1.7 * P;
  const y = H - 3;
  const cx = W / 2;
  let s = placek(cx, y - 6, 48, 10, { kolor: '#c9bfa8', krycie: 0.7 });
  // automat: front + bok
  const ax = cx - 6;
  const aw = 40;
  const ah = 74;
  s += `<path d="${sciezka([
    [ax + aw, y - 4],
    [ax + aw, y - 4 - ah],
    [ax + aw + 12, y - 12 - ah],
    [ax + aw + 12, y - 12],
  ])}" fill="#a82a22"/>`;
  s += `<path d="${sciezka([
    [ax, y - 4 - ah],
    [ax + aw, y - 4 - ah],
    [ax + aw + 12, y - 12 - ah],
    [ax + 12, y - 12 - ah],
  ])}" fill="#f0786a"/>`;
  s += `<rect x="${f(ax)}" y="${f(y - 4 - ah)}" width="${aw}" height="${ah}" rx="2" fill="#d63c30"/>`;
  s += `<rect x="${f(ax + 4)}" y="${f(y - ah)}" width="${aw - 8}" height="38" rx="2" fill="#e8f4fa"/>`;
  const barwy = ['#3d8fe0', '#58b83a', '#f2c230', '#e85aa8', '#ff8a3a'];
  for (let r = 0; r < 3; r++)
    for (let i = 0; i < 4; i++) {
      const bx = ax + 7 + i * 8;
      const by = y - ah + 4 + r * 12;
      s += `<rect x="${f(bx)}" y="${f(by + 2)}" width="5" height="8" rx="1.5" fill="${barwy[(i + r) % 5]}"/><rect x="${f(bx + 1.5)}" y="${f(by)}" width="2" height="3" fill="${barwy[(i + r) % 5]}"/>`;
    }
  s += `<rect x="${f(ax + 4)}" y="${f(y - ah)}" width="${aw - 8}" height="38" rx="2" fill="url(#swiatloL)"/>`;
  s += `<rect x="${f(ax + 6)}" y="${f(y - 30)}" width="${aw - 12}" height="9" rx="2" fill="#2a2a2e"/><rect x="${f(ax + aw - 12)}" y="${f(y - 46)}" width="6" height="10" rx="1" fill="#f2c230"/>`;
  // ławka i doniczka
  s += `<rect x="${f(cx - 54)}" y="${f(y - 20)}" width="40" height="6" rx="2" fill="${PAL.drewno}"/><rect x="${f(cx - 54)}" y="${f(y - 20)}" width="40" height="2.2" fill="${PAL.drewnoJ}"/><rect x="${f(cx - 52)}" y="${f(y - 14)}" width="3.5" height="10" fill="#4a5560"/><rect x="${f(cx - 20)}" y="${f(y - 14)}" width="3.5" height="10" fill="#4a5560"/>`;
  s += `<path d="M${f(cx + 46)} ${f(y - 4)} l-3 -14 h14 l-3 14 Z" fill="#c9734a"/>${krzaczek(cx + 50, y - 16, 0.9, { ziarno: 81 })}`;
  return svgObiektu(1.6, 1.7, s);
}

/** Kemping: kopułowy namiot, krzesełka, ognisko z garnkiem. */
function kemping() {
  const W = 1.8 * P;
  const H = 1.3 * P;
  const y = H - 3;
  const cx = W / 2;
  let s = placek(cx, y - 12, 66, 16, { kolor: PAL.ziemia, krycie: 0.5 });
  // namiot kopułowy
  const tx = cx + 26;
  const ty = y - 16;
  s += naZiemi(ty, `<path d="M${f(tx - 34)} ${f(ty)} Q${f(tx - 32)} ${f(ty - 46)} ${f(tx)} ${f(ty - 48)} Q${f(tx + 32)} ${f(ty - 46)} ${f(tx + 34)} ${f(ty)} Z" fill="#f07a2a"/>
    <path d="M${f(tx)} ${f(ty - 48)} Q${f(tx + 32)} ${f(ty - 46)} ${f(tx + 34)} ${f(ty)} L${f(tx + 6)} ${f(ty)} Z" fill="#c4581a"/>
    <path d="M${f(tx - 33)} ${f(ty - 8)} Q${f(tx - 26)} ${f(ty - 40)} ${f(tx)} ${f(ty - 46)}" stroke="#fff" stroke-width="2" fill="none" opacity="0.6"/>
    <path d="M${f(tx - 12)} ${f(ty)} Q${f(tx - 10)} ${f(ty - 26)} ${f(tx + 2)} ${f(ty - 28)} Q${f(tx + 12)} ${f(ty - 26)} ${f(tx + 14)} ${f(ty)} Z" fill="#5a3a20"/>
    <path d="M${f(tx - 12)} ${f(ty)} Q${f(tx - 10)} ${f(ty - 26)} ${f(tx + 2)} ${f(ty - 28)} L${f(tx - 2)} ${f(ty)} Z" fill="#f4e4c0"/>`);
  // ognisko z garnkiem
  const fx = cx - 26;
  const fy = y - 10;
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2;
    s += `<ellipse cx="${f(fx + Math.cos(a) * 11)}" cy="${f(fy + Math.sin(a) * 5)}" rx="3.6" ry="2.6" fill="${PAL.kamien}"/>`;
  }
  s += `<circle cx="${f(fx)}" cy="${f(fy - 10)}" r="14" fill="#ffb03a" opacity="0.4" filter="url(#blask)"/>`;
  s += `<path d="M${f(fx - 7)} ${f(fy)} Q${f(fx - 9)} ${f(fy - 12)} ${f(fx - 2)} ${f(fy - 20)} Q${f(fx)} ${f(fy - 11)} ${f(fx + 2)} ${f(fy - 15)} Q${f(fx + 9)} ${f(fy - 7)} ${f(fx + 7)} ${f(fy)} Z" fill="#f07a1c"/><path d="M${f(fx - 4)} ${f(fy)} Q${f(fx - 5)} ${f(fy - 8)} ${f(fx)} ${f(fy - 13)} Q${f(fx + 5)} ${f(fy - 7)} ${f(fx + 4)} ${f(fy)} Z" fill="#ffd34a"/>`;
  s += `<path d="M${f(fx - 14)} ${f(fy + 2)} L${f(fx)} ${f(fy - 34)} L${f(fx + 14)} ${f(fy + 2)}" stroke="#4a5560" stroke-width="2" fill="none"/><path d="M${f(fx - 8)} ${f(fy - 26)} h16 q0 10 -8 10 q-8 0 -8 -10 Z" fill="#3a3a40"/><ellipse cx="${f(fx)}" cy="${f(fy - 26)}" rx="8" ry="2.4" fill="#f2c230"/>`;
  // krzesełka turystyczne
  const krzeslo = (x, yy, kol) => `<path d="M${f(x - 7)} ${f(yy)} L${f(x + 7)} ${f(yy - 12)} M${f(x + 7)} ${f(yy)} L${f(x - 7)} ${f(yy - 12)}" stroke="#4a5560" stroke-width="1.8"/><rect x="${f(x - 8)}" y="${f(yy - 14)}" width="16" height="5" rx="1" fill="${kol}"/><rect x="${f(x - 8)}" y="${f(yy - 26)}" width="16" height="12" rx="2" fill="${kol}"/><rect x="${f(x - 8)}" y="${f(yy - 26)}" width="5" height="12" fill="#fff" opacity="0.25"/>`;
  s += krzeslo(cx - 56, y - 4, '#3f78c8') + krzeslo(cx - 2, y - 2, '#58b83a');
  s += kula(cx + 58, y - 4, 5) + kula(cx + 66, y - 2, 4.5);
  return svgObiektu(1.8, 1.3, s);
}

/** Wędrowny sklepik: kamper z markizą i stolikiem z towarem. */
function kamper() {
  const W = 2 * P;
  const H = 1.5 * P;
  const y = H - 3;
  const cx = W / 2;
  let s = '';
  // nadwozie: front-bok w 3/4
  const x0 = cx - 60;
  const w = 96;
  const h = 46;
  const yb = y - 14;
  const g = 26;
  const gx = g * 0.62;
  const gy = g * 0.42;
  s += `<path d="M${f(x0 + w)} ${f(yb)} V${f(yb - h + 8)} Q${f(x0 + w)} ${f(yb - h)} ${f(x0 + w + 8)} ${f(yb - h - 3)} L${f(x0 + w + gx)} ${f(yb - h - gy)} V${f(yb - gy)} Z" fill="#c9b994"/>`;
  s += `<path d="M${f(x0 + 6)} ${f(yb - h)} L${f(x0 + gx + 6)} ${f(yb - h - gy)} L${f(x0 + w + gx - 6)} ${f(yb - h - gy)} L${f(x0 + w - 6)} ${f(yb - h)} Z" fill="#fbf4e2"/>`;
  s += `<rect x="${f(x0)}" y="${f(yb - h)}" width="${w}" height="${h}" rx="9" fill="#f4ead2"/>`;
  s += `<rect x="${f(x0)}" y="${f(yb - 20)}" width="${w}" height="8" fill="#3f9ad0"/><rect x="${f(x0)}" y="${f(yb - 20)}" width="${w}" height="2.4" fill="#7cc4e8"/>`;
  s += szyba(x0 + 8, yb - h + 8, 18, 14) + szyba(x0 + w - 30, yb - h + 8, 22, 14);
  s += `<rect x="${f(x0 + 34)}" y="${f(yb - h + 8)}" width="24" height="34" rx="2" fill="#d9cba4"/><rect x="${f(x0 + 36)}" y="${f(yb - h + 10)}" width="20" height="14" fill="#5aa9d6"/>`;
  // markiza w pasy
  for (let i = 0; i < 6; i++) s += `<path d="M${f(x0 + 2 + i * 15)} ${f(yb - h - 4)} h15 l3 14 q-10 5 -18 0 Z" fill="${i % 2 ? '#fff' : '#d63c30'}"/>`;
  // koła
  for (const wx of [x0 + 18, x0 + w - 16]) s += `<circle cx="${f(wx)}" cy="${f(yb)}" r="10" fill="#2a2a2e"/><circle cx="${f(wx)}" cy="${f(yb)}" r="4.5" fill="#c3cad2"/>`;
  // stolik z towarem
  s += `<rect x="${f(cx + 44)}" y="${f(y - 22)}" width="30" height="4" fill="${PAL.drewnoJ}"/><rect x="${f(cx + 46)}" y="${f(y - 18)}" width="3" height="16" fill="${PAL.drewnoC}"/><rect x="${f(cx + 69)}" y="${f(y - 18)}" width="3" height="16" fill="${PAL.drewnoC}"/>`;
  s += kula(cx + 52, y - 27, 4.5) + jagoda(cx + 62, y - 26, 3.4, '#c63a40') + jagoda(cx + 68, y - 27, 3.4, '#4660c0');
  s += `<path d="M${f(cx - 74)} ${f(y - 4)} l8 -24 l8 24" stroke="${PAL.drewnoC}" stroke-width="2" fill="none"/><rect x="${f(cx - 74)}" y="${f(y - 26)}" width="16" height="14" fill="#2a3a2a"/><path d="M${f(cx - 71)} ${f(y - 21)} h10 M${f(cx - 71)} ${f(y - 17)} h7" stroke="#fff" stroke-width="1.2"/>`;
  return svgObiektu(2, 1.5, s);
}

/** Ranczo Ponyty: czerwona stodoła z białymi krzyżami na wrotach, wybieg, siano. 3 × 1. */
function ranczo() {
  const W = 3 * P;
  const H = 2.2 * P;
  const y = H - 3;
  const cx = W / 2;
  let s = '';
  s += placek(cx + 40, y - 24, 100, 34, { kolor: PAL.ziemiaJ, krycie: 0.65 });
  s += naZiemi(y - 62, plot(cx + 34, y - 62, cx + 136, y - 62, { slupki: 5 }));
  s += plot(cx + 136, y - 62, cx + 136, y - 4, { slupki: 3 });
  const d = dom({ x: cx - 70, y: y - 4, w: 104, h: 50, g: 42, dachH: 40, okap: 7, sciana: 'gladka', dach: 'pasy', kolorSciany: '#c8402e', kolorDachu: '#5a5a62', ziarno: 91 });
  s += d.svg;
  // białe obramowania i wrota z krzyżem
  s += `<rect x="${f(cx - 70)}" y="${f(y - 54)}" width="104" height="3" fill="#fff"/><rect x="${f(cx - 70)}" y="${f(y - 54)}" width="3" height="50" fill="#fff"/><rect x="${f(cx + 31)}" y="${f(y - 54)}" width="3" height="50" fill="#fff"/>`;
  s += `<rect x="${f(cx - 36)}" y="${f(y - 40)}" width="36" height="36" fill="#a8301e" stroke="#fff" stroke-width="3"/><path d="M${f(cx - 36)} ${f(y - 40)} L${f(cx)} ${f(y - 4)} M${f(cx)} ${f(y - 40)} L${f(cx - 36)} ${f(y - 4)}" stroke="#fff" stroke-width="3"/>`;
  s += `<rect x="${f(cx - 26)}" y="${f(d.top - 18)}" width="16" height="13" fill="#fff"/><rect x="${f(cx - 24)}" y="${f(d.top - 16)}" width="12" height="9" fill="#3a2a1a"/>`;
  // Ponyta w okienku (płomienna grzywa)
  s += `<rect x="${f(cx - 62)}" y="${f(y - 36)}" width="18" height="16" fill="#1d130b" stroke="#fff" stroke-width="2"/><ellipse cx="${f(cx - 53)}" cy="${f(y - 27)}" rx="5" ry="6" fill="#f6e2b8"/><path d="M${f(cx - 58)} ${f(y - 32)} q5 -10 10 -1 q-3 -3 -5 2 Z" fill="#f07a1c"/>`;
  // siano i koryto
  s += `<rect x="${f(cx - 104)}" y="${f(y - 18)}" width="28" height="15" rx="4" fill="${PAL.strzecha}"/><rect x="${f(cx - 98)}" y="${f(y - 28)}" width="22" height="12" rx="4" fill="${PAL.strzechaJ}"/>`;
  s += `<rect x="${f(cx + 70)}" y="${f(y - 18)}" width="34" height="9" fill="${PAL.drewno}"/><rect x="${f(cx + 72)}" y="${f(y - 18)}" width="30" height="3" fill="${PAL.blekit}"/>`;
  return svgObiektu(3, 2.2, s);
}

/** Zgubiony plecak (znajdźka „skrzynia”): żółty plecak trenera na trawie. */
function plecak() {
  const W = 1.35 * P;
  const H = 1.08 * P;
  const y = H - 4;
  const cx = W / 2;
  let s = placek(cx, y - 6, 40, 10, { kolor: PAL.ziemia, krycie: 0.4 });
  const k = '#f0b42a';
  const kC = '#b87a14';
  const kJ = '#ffd970';
  // korpus (zaokrąglony, w 3/4: front + wierzch)
  s += `<path d="M${f(cx - 30)} ${f(y - 4)} Q${f(cx - 34)} ${f(y - 40)} ${f(cx - 10)} ${f(y - 48)} L${f(cx + 16)} ${f(y - 48)} Q${f(cx + 38)} ${f(y - 40)} ${f(cx + 32)} ${f(y - 4)} Z" fill="${kC}"/>`;
  s += `<path d="M${f(cx - 30)} ${f(y - 4)} Q${f(cx - 34)} ${f(y - 40)} ${f(cx - 10)} ${f(y - 48)} L${f(cx + 10)} ${f(y - 48)} Q${f(cx + 28)} ${f(y - 40)} ${f(cx + 22)} ${f(y - 4)} Z" fill="${k}"/>`;
  s += `<path d="M${f(cx - 24)} ${f(y - 10)} Q${f(cx - 28)} ${f(y - 38)} ${f(cx - 10)} ${f(y - 44)}" stroke="${kJ}" stroke-width="4" fill="none" stroke-linecap="round"/>`;
  // klapa z czerwoną krawędzią
  s += `<path d="M${f(cx - 26)} ${f(y - 30)} Q${f(cx - 4)} ${f(y - 22)} ${f(cx + 24)} ${f(y - 30)} L${f(cx + 20)} ${f(y - 46)} Q${f(cx - 4)} ${f(y - 52)} ${f(cx - 20)} ${f(y - 46)} Z" fill="#d63c30"/>`;
  s += `<path d="M${f(cx - 26)} ${f(y - 30)} Q${f(cx - 4)} ${f(y - 22)} ${f(cx + 24)} ${f(y - 30)}" stroke="#8c2018" stroke-width="2" fill="none"/>`;
  s += `<rect x="${f(cx - 4)}" y="${f(y - 30)}" width="6" height="8" rx="1.5" fill="${PAL.zloto}" stroke="#8a6010" stroke-width="1"/>`;
  // kieszeń przednia
  s += `<rect x="${f(cx - 16)}" y="${f(y - 20)}" width="28" height="14" rx="5" fill="${kC}"/><rect x="${f(cx - 14)}" y="${f(y - 19)}" width="24" height="4" rx="2" fill="${kJ}" opacity="0.7"/>`;
  // szelka i pokeball wystający z boku
  s += `<path d="M${f(cx + 26)} ${f(y - 40)} q14 10 6 34" stroke="#5a3a20" stroke-width="4" fill="none"/>`;
  s += kula(cx + 40, y - 8, 6.5);
  return svgObiektu(1.35, 1.08, s);
}

/** Most Polany: prosto od lewej do prawej, deski w poprzek, poręcze z obu stron. */
function most() {
  const W = 400;
  const H = 250;
  let s = '';
  const x0 = 10;
  const x1 = 390;
  const yT = 62; // tylna krawędź pomostu
  const yF = 170; // przednia krawędź
  const gr = 14;
  // filary
  for (const px of [70, 200, 330]) {
    s += `<rect x="${f(px - 18)}" y="${f(yF + gr - 6)}" width="36" height="50" rx="4" fill="${PAL.kamien}"/><rect x="${f(px - 18)}" y="${f(yF + gr - 6)}" width="12" height="50" fill="#fff" opacity="0.15"/><rect x="${f(px + 6)}" y="${f(yF + gr - 6)}" width="12" height="50" fill="#000" opacity="0.2"/>`;
    s += `<ellipse cx="${f(px)}" cy="${f(yF + gr + 44)}" rx="24" ry="6" fill="#d8eef4" opacity="0.55"/>`;
  }
  // spód (grubość pomostu)
  s += `<rect x="${f(x0)}" y="${f(yF)}" width="${x1 - x0}" height="${gr}" fill="${PAL.drewnoC}"/><rect x="${f(x0)}" y="${f(yF + gr - 3)}" width="${x1 - x0}" height="3" fill="${PAL.drewnoCC}"/>`;
  // deski w poprzek
  s += `<rect x="${f(x0)}" y="${f(yT)}" width="${x1 - x0}" height="${yF - yT}" fill="${PAL.drewno}"/>`;
  const r = los(301);
  for (let x = x0; x < x1; x += 15) {
    s += `<line x1="${f(x)}" y1="${f(yT)}" x2="${f(x)}" y2="${f(yF)}" stroke="${PAL.drewnoC}" stroke-width="2"/>`;
    if (r() < 0.5) s += `<line x1="${f(x + 5)}" y1="${f(yT + 8 + r() * 30)}" x2="${f(x + 5)}" y2="${f(yT + 20 + r() * 30)}" stroke="${PAL.drewnoJ}" stroke-width="2" opacity="0.6"/>`;
  }
  s += `<rect x="${f(x0)}" y="${f(yT)}" width="${x1 - x0}" height="${yF - yT}" fill="url(#swiatloG)"/>`;
  // poręcze: tylna (wyżej, ciemniejsza) i przednia
  const porecz = (yy, kol, kolJ) => {
    let o = '';
    for (let x = x0 + 6; x <= x1 - 6; x += 47.5) o += `<rect x="${f(x - 4)}" y="${f(yy - 34)}" width="8" height="36" fill="${kol}"/><rect x="${f(x - 4)}" y="${f(yy - 34)}" width="3" height="36" fill="${kolJ}"/><rect x="${f(x - 5)}" y="${f(yy - 37)}" width="10" height="5" rx="2" fill="${kolJ}"/>`;
    o += `<rect x="${f(x0)}" y="${f(yy - 30)}" width="${x1 - x0}" height="6" rx="3" fill="${kol}"/><rect x="${f(x0)}" y="${f(yy - 30)}" width="${x1 - x0}" height="2" fill="${kolJ}"/>`;
    o += `<rect x="${f(x0)}" y="${f(yy - 16)}" width="${x1 - x0}" height="4" fill="${kol}"/>`;
    return o;
  };
  const tyl = porecz(yT + 2, PAL.drewnoC, PAL.drewno);
  const przod = porecz(yF + 2, PAL.drewno, PAL.drewnoJ);
  return svgObiektu(W / P, H / P, tyl + s + przod, { pad: 0, cien: 0, dol: 0 });
}

export const POKEMON = {
  'zamek-las': { rysuj: miasteczko },
  'zamek-ogien': { rysuj: gym },
  wiatrak: { rysuj: turbina },
  'kopalnia-pokeball': { rysuj: fabryka },
  'drzewo-wiedzy': { rysuj: laboratorium },
  'oboz-treningowy': { rysuj: boisko },
  arena: { rysuj: stadion },
  zrodlo: { rysuj: automat },
  ognisko: { rysuj: kemping },
  woz: { rysuj: kamper },
  ranczo: { rysuj: ranczo },
  skrzynia: { rysuj: plecak },
  most: { rysuj: most, tlo: true },
};
export { pts };
