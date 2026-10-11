// Komplet obiektów planszy rysowanych kodem — wszystkie z jednego pędzla
// (`pedzel.mjs`), żeby wyszły jak z jednej gry.
//
// Każdy wpis: `rysuj()` → { W, H, svg }. Płótno ma tyle pól, ile obiekt
// zajmuje na mapie (szerokość = bryła), a spód płótna to ziemia:
// - obiekt z bryłą (kopalnie, sad, duże budowle) stoi ZA polem wejścia,
//   więc dolny rząd płótna to rząd bryły, a wejście (drzwi, brama, sztolnia)
//   musi być pośrodku dolnej krawędzi;
// - obiekt bez bryły stoi na swoim polu: spód płótna = dół pola.

import {
  P,
  PAL,
  gladka,
  naZiemi,
  f,
  pts,
  los,
  mix,
  sciezka,
  wypelnij,
  cienRzucany,
  cienPod,
  dom,
  drzewo,
  krzaczek,
  placek,
  deskiPion,
  murKamienny,
  okno,
  drzwi,
  svgObiektu,
  uid,
} from './pedzel.mjs';

// ───────────────────────── klocki wspólne dla obiektów ─────────────────────────

/** Kępka mchu/trawy na skale: trzy zachodzące kółka w zieleniach. */
export function mech(x, y, r = 6) {
  return `<circle cx="${f(x + 1)}" cy="${f(y + 1.5)}" r="${f(r)}" fill="${PAL.lisCC}"/><circle cx="${f(x - r * 0.7)}" cy="${f(y + 0.5)}" r="${f(r * 0.75)}" fill="${PAL.lis}"/><circle cx="${f(x + r * 0.7)}" cy="${f(y + 0.8)}" r="${f(r * 0.7)}" fill="${PAL.lis}"/><circle cx="${f(x)}" cy="${f(y)}" r="${f(r * 0.85)}" fill="${PAL.lis}"/><circle cx="${f(x - r * 0.3)}" cy="${f(y - r * 0.35)}" r="${f(r * 0.45)}" fill="${PAL.lisJ}"/>`;
}

/** Zaokrąglony głaz: ciemna podstawa, jasne ściany od lewej góry, mech na wierzchu. */
export function glaz(cx, y, w, h, { ziarno: z = 1, kolor = 'kamien', mech: zMchem = false } = {}) {
  const r = los(z);
  const J = PAL[kolor + 'J'];
  const M = PAL[kolor];
  const C = PAL[kolor + 'C'];
  const CC = PAL[kolor + 'CC'] ?? mix(C, '#000', 0.35);
  const n = 8;
  const obrys = [];
  for (let i = 0; i < n; i++) {
    const a = Math.PI + (i / (n - 1)) * Math.PI;
    const rr = 0.74 + r() * 0.34;
    obrys.push([cx + Math.cos(a) * (w / 2) * rr, y - h * 0.06 + Math.sin(a) * h * rr * 0.95]);
  }
  obrys.push([cx + w * 0.46, y + 1], [cx, y + 2], [cx - w * 0.46, y + 1]);
  let s = `<path d="${gladka(obrys)}" fill="${CC}"/>`;
  const sk = (k, dx, dy) => obrys.map(([x, yy]) => [cx + (x - cx) * k + dx, y + (yy - y) * k + dy]);
  s += `<path d="${gladka(sk(0.94, -1, -2))}" fill="${C}"/>`;
  s += `<path d="${gladka(sk(0.8, -w * 0.05, -h * 0.1))}" fill="${M}"/>`;
  s += `<path d="${gladka(sk(0.46, -w * 0.16, -h * 0.34))}" fill="${mix(M, J, 0.4)}"/>`;
  s += `<path d="${gladka(sk(0.2, -w * 0.22, -h * 0.55))}" fill="${J}" opacity="0.7"/>`;
  // rysa
  const x0 = cx + (r() - 0.2) * w * 0.3;
  s += `<path d="M${f(x0)} ${f(y - h * 0.62)} q${f(4 + r() * 4)} ${f(h * 0.2)} ${f(1)} ${f(h * 0.42)}" stroke="${CC}" stroke-width="2.4" fill="none" stroke-linecap="round" opacity="0.8"/>`;
  if (zMchem) {
    s += mech(cx - w * 0.12, y - h * 0.86, Math.max(4, w * 0.09));
    if (w > 50) s += mech(cx + w * 0.22, y - h * 0.62, Math.max(4, w * 0.07));
  }
  return s;
}

/** Masyw skalny: rzędy głazów od tyłu do przodu (jak skały tła), z mchem. */
function masyw(cx, y, w, h, z = 1, opcje = {}) {
  const r = los(z);
  const rzedy = 4;
  // ciemna masa pod głazami — szczeliny między nimi mają być głębokie, nie zielone
  let s = `<path d="${gladka([
    [cx - w * 0.5, y],
    [cx - w * 0.42, y - h * 0.35],
    [cx - w * 0.22, y - h * 0.72],
    [cx, y - h * 0.82],
    [cx + w * 0.22, y - h * 0.72],
    [cx + w * 0.42, y - h * 0.35],
    [cx + w * 0.5, y],
  ])}" fill="${PAL.kamienCC}"/>`;
  for (let i = 0; i < rzedy; i++) {
    const t = i / (rzedy - 1); // 0 — tył (góra), 1 — przód
    const yy = y - h * 0.7 * (1 - t);
    // szerokość rzędu: szczyt wąski, podstawa szeroka
    const szer = w * (0.45 + 0.55 * t);
    const n = 2 + i;
    for (let j = 0; j < n; j++) {
      const gx = cx - szer / 2 + (szer * (j + 0.5)) / n + (r() - 0.5) * 10;
      const gw = (szer / n) * (1.15 + r() * 0.3);
      const gh = Math.min(h * (0.36 + r() * 0.12) * (1 - t * 0.25), gw * (0.62 + r() * 0.15));
      s += glaz(gx, yy + (r() - 0.5) * 6, gw, gh, { ziarno: z * 31 + i * 7 + j, mech: r() < 0.75, ...opcje });
    }
  }
  return s;
}

/** Kamień ewolucji: szlifowany klejnot (ośmiokąt z fasetami), światło z lewej góry. */
function kamyk(cx, cy, r, barwa) {
  const C = mix(barwa, '#000000', 0.5);
  const J = mix(barwa, '#ffffff', 0.5);
  const o = [];
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2 + Math.PI / 8;
    o.push([cx + Math.cos(a) * r, cy + Math.sin(a) * r * 0.82]);
  }
  const t = (k) => [cx + (o[k][0] - cx) * 0.48 - r * 0.08, cy + (o[k][1] - cy) * 0.48 - r * 0.1];
  let s = `<polygon points="${pts(o.map(([x, y]) => [x + 1, y + 1.5]))}" fill="${mix(barwa, '#000', 0.7)}"/>`;
  s += `<polygon points="${pts(o)}" fill="${C}"/>`;
  // fasety: górne-lewe jasne, dolne-prawe ciemne
  for (let i = 0; i < 8; i++) {
    const j = (i + 1) % 8;
    const kol = [J, J, barwa, C, C, C, barwa, mix(barwa, J, 0.5)][i];
    s += `<polygon points="${pts([o[i], o[j], t(j), t(i)])}" fill="${kol}"/>`;
  }
  s += `<polygon points="${pts([0, 1, 2, 3, 4, 5, 6, 7].map(t))}" fill="${barwa}"/>`;
  s += `<polygon points="${pts([t(4), t(5), t(6)])}" fill="${J}" opacity="0.8"/>`;
  s += `<circle cx="${f(cx - r * 0.3)}" cy="${f(cy - r * 0.32)}" r="${f(r * 0.13)}" fill="#fff" opacity="0.9"/>`;
  return s;
}

const BARWY_KAMIENI = ['#d65a37', '#4483c4', '#5fa443', '#ddb23e'];

/** Kryształ: grupa graniastych słupków (odłamki). */
function krysztaly(cx, y, s = 1, { ziarno: z = 1, J = PAL.fioletJ, M = PAL.fiolet } = {}) {
  const r = los(z);
  const C = mix(M, '#1a0830', 0.5);
  let out = '';
  const slupki = [
    [-9, 20, -0.35],
    [8, 18, 0.4],
    [0, 30, 0.05],
    [-3, 14, -0.7],
    [12, 11, 0.8],
  ];
  for (const [dx, h, kat] of slupki) {
    const x = cx + dx * s;
    const hh = h * s * (0.85 + r() * 0.3);
    const w = 5.5 * s;
    const tx = x + Math.sin(kat) * hh;
    const ty = y - Math.cos(kat) * hh;
    const nx = Math.cos(kat) * w;
    const ny = Math.sin(kat) * w;
    // dwie ściany: lewa jasna, prawa ciemna
    out += `<polygon points="${pts([
      [x - nx, y - ny],
      [tx - nx * 0.9 + (tx - x) * -0.12, ty - ny * 0.9 + (ty - y) * -0.12],
      [tx + (tx - x) * 0.18, ty + (ty - y) * 0.18],
      [x, y],
    ])}" fill="${J}"/>`;
    out += `<polygon points="${pts([
      [x, y],
      [tx + (tx - x) * 0.18, ty + (ty - y) * 0.18],
      [tx + nx * 0.9 + (tx - x) * -0.12, ty + ny * 0.9 + (ty - y) * -0.12],
      [x + nx, y + ny],
    ])}" fill="${M}"/>`;
    out += `<polygon points="${pts([
      [x + nx * 0.3, y + ny * 0.3],
      [tx + nx * 0.6 + (tx - x) * -0.05, ty + ny * 0.6 + (ty - y) * -0.05],
      [tx + nx * 0.9 + (tx - x) * -0.12, ty + ny * 0.9 + (ty - y) * -0.12],
      [x + nx, y + ny],
    ])}" fill="${C}" opacity="0.6"/>`;
    out += `<line x1="${f(x - nx * 0.5)}" y1="${f(y - ny * 0.5)}" x2="${f(tx - nx * 0.4)}" y2="${f(ty - ny * 0.4)}" stroke="#fff" stroke-width="${f(1.1 * s)}" opacity="0.7"/>`;
  }
  return out;
}

/** Pokeball (z góry-boku): czerwona czapa, biały spód, pas i guzik. */
function kula(cx, cy, r) {
  const id = uid('k');
  return `<clipPath id="${id}"><circle cx="${f(cx)}" cy="${f(cy)}" r="${f(r)}"/></clipPath>
  <circle cx="${f(cx + 0.8)}" cy="${f(cy + 1.2)}" r="${f(r)}" fill="#1a1010" opacity="0.6"/>
  <g clip-path="url(#${id})">
    <rect x="${f(cx - r)}" y="${f(cy - r)}" width="${f(2 * r)}" height="${f(2 * r)}" fill="${PAL.biel}"/>
    <rect x="${f(cx - r)}" y="${f(cy - r)}" width="${f(2 * r)}" height="${f(r * 0.95)}" fill="${PAL.czerwien}"/>
    <circle cx="${f(cx + r * 0.45)}" cy="${f(cy + r * 0.45)}" r="${f(r * 1.05)}" fill="none" stroke="#000" stroke-opacity="0.22" stroke-width="${f(r * 0.6)}"/>
    <rect x="${f(cx - r)}" y="${f(cy - r * 0.12)}" width="${f(2 * r)}" height="${f(r * 0.22)}" fill="#2a2222"/>
  </g>
  <circle cx="${f(cx)}" cy="${f(cy)}" r="${f(r * 0.3)}" fill="#2a2222"/>
  <circle cx="${f(cx)}" cy="${f(cy)}" r="${f(r * 0.18)}" fill="${PAL.biel}"/>
  <ellipse cx="${f(cx - r * 0.38)}" cy="${f(cy - r * 0.5)}" rx="${f(r * 0.28)}" ry="${f(r * 0.16)}" fill="#fff" opacity="0.75" transform="rotate(-30 ${f(cx - r * 0.38)} ${f(cy - r * 0.5)})"/>`;
}

/** Jagoda (okrągła, barwna, z listkiem). */
function jagoda(cx, cy, r, barwa) {
  return `<circle cx="${f(cx + 0.7)}" cy="${f(cy + 1)}" r="${f(r)}" fill="${mix(barwa, '#000', 0.5)}"/>
  <circle cx="${f(cx)}" cy="${f(cy)}" r="${f(r)}" fill="${barwa}"/>
  <circle cx="${f(cx - r * 0.35)}" cy="${f(cy - r * 0.35)}" r="${f(r * 0.32)}" fill="#fff" opacity="0.6"/>`;
}

/** Tory i wózek kopalniany (opcjonalnie z ładunkiem). */
function wozek(cx, y, s = 1, ladunek = '') {
  const w = 26 * s;
  const h = 13 * s;
  let out = cienPod(cx, y, w * 0.6, 4 * s, 0.35);
  out += `<polygon points="${pts([
    [cx - w / 2, y - h - 4 * s],
    [cx + w / 2, y - h - 4 * s],
    [cx + w / 2 - 3 * s, y - 4 * s],
    [cx - w / 2 + 3 * s, y - 4 * s],
  ])}" fill="${PAL.kamienC}"/>`;
  out += `<polygon points="${pts([
    [cx - w / 2, y - h - 4 * s],
    [cx + w / 2, y - h - 4 * s],
    [cx + w / 2 - 1 * s, y - h - 1 * s],
    [cx - w / 2 + 1 * s, y - h - 1 * s],
  ])}" fill="${PAL.kamienJ}"/>`;
  out += `<rect x="${f(cx - w / 2 + 3 * s)}" y="${f(y - h * 0.6)}" width="${f(w - 6 * s)}" height="${f(2 * s)}" fill="${PAL.kamienCC}"/>`;
  out += ladunek;
  for (const dx of [-w * 0.3, w * 0.3]) {
    out += `<circle cx="${f(cx + dx)}" cy="${f(y - 3 * s)}" r="${f(4 * s)}" fill="#2b2420"/><circle cx="${f(cx + dx)}" cy="${f(y - 3 * s)}" r="${f(1.5 * s)}" fill="${PAL.kamien}"/>`;
  }
  return out;
}

function tory(x0, y0, x1, y1, s = 1) {
  const dx = x1 - x0;
  const dy = y1 - y0;
  const l = Math.hypot(dx, dy);
  const nx = (-dy / l) * 6 * s;
  const ny = (dx / l) * 6 * s;
  let out = '';
  for (let t = 0; t <= 1; t += 7 / l)
    out += `<line x1="${f(x0 + dx * t - nx * 1.4)}" y1="${f(y0 + dy * t - ny * 1.4)}" x2="${f(x0 + dx * t + nx * 1.4)}" y2="${f(y0 + dy * t + ny * 1.4)}" stroke="${PAL.drewnoC}" stroke-width="${f(2.6 * s)}"/>`;
  for (const k of [-1, 1])
    out += `<line x1="${f(x0 + nx * k)}" y1="${f(y0 + ny * k)}" x2="${f(x1 + nx * k)}" y2="${f(y1 + ny * k)}" stroke="#4a4846" stroke-width="${f(1.6 * s)}"/>`;
  return out;
}

/** Drewniana obudowa sztolni (dwa słupy, belka, ciemny otwór). */
function sztolnia(cx, y, w, h) {
  let s = `<path d="M${f(cx - w / 2)} ${f(y)} V${f(y - h * 0.7)} Q${f(cx)} ${f(y - h * 1.15)} ${f(cx + w / 2)} ${f(y - h * 0.7)} V${f(y)} Z" fill="#120c08"/>`;
  s += `<path d="M${f(cx - w / 2 + 3)} ${f(y)} V${f(y - h * 0.6)} Q${f(cx)} ${f(y - h * 0.95)} ${f(cx + w / 2 - 3)} ${f(y - h * 0.6)}" fill="none" stroke="#2c1f14" stroke-width="3" opacity="0.8"/>`;
  // belki
  s += `<rect x="${f(cx - w / 2 - 3)}" y="${f(y - h)}" width="6" height="${f(h)}" fill="${PAL.drewno}"/><rect x="${f(cx - w / 2 - 3)}" y="${f(y - h)}" width="2" height="${f(h)}" fill="${PAL.drewnoJ}"/>`;
  s += `<rect x="${f(cx + w / 2 - 3)}" y="${f(y - h)}" width="6" height="${f(h)}" fill="${PAL.drewnoC}"/>`;
  s += `<rect x="${f(cx - w / 2 - 7)}" y="${f(y - h - 6)}" width="${f(w + 14)}" height="7" rx="1" fill="${PAL.drewno}"/>`;
  s += `<rect x="${f(cx - w / 2 - 7)}" y="${f(y - h - 6)}" width="${f(w + 14)}" height="2.2" fill="${PAL.drewnoJ}"/>`;
  s += `<rect x="${f(cx - w / 2 - 7)}" y="${f(y - h)}" width="${f(w + 14)}" height="1.6" fill="${PAL.drewnoCC}"/>`;
  return s;
}

/** Latarnia na słupku. */
function latarnia(x, y, h = 30) {
  return `<rect x="${f(x - 1.5)}" y="${f(y - h)}" width="3" height="${f(h)}" fill="${PAL.drewnoC}"/>
  <circle cx="${f(x)}" cy="${f(y - h - 3)}" r="9" fill="${PAL.oknoSwiatlo}" opacity="0.35" filter="url(#blask)"/>
  <rect x="${f(x - 4)}" y="${f(y - h - 8)}" width="8" height="9" rx="1.5" fill="${PAL.oknoSwiatlo}" stroke="#3a2a14" stroke-width="1.6"/>
  <path d="M${f(x - 5)} ${f(y - h - 8)} L${f(x)} ${f(y - h - 13)} L${f(x + 5)} ${f(y - h - 8)} Z" fill="#3a2a14"/>`;
}

/** Skrzynka/paka z ładunkiem. */
function paka(x, y, w, h, ladunek = '') {
  let s = `<rect x="${f(x)}" y="${f(y - h)}" width="${f(w)}" height="${f(h)}" fill="${PAL.drewno}"/>`;
  s += `<rect x="${f(x + w)}" y="${f(y - h - 3)}" width="4" height="${f(h)}" fill="${PAL.drewnoC}" transform="skewY(-30)" transform-origin="${f(x + w)} ${f(y - h)}"/>`;
  s += `<rect x="${f(x)}" y="${f(y - h)}" width="${f(w)}" height="2" fill="${PAL.drewnoJ}"/>`;
  s += `<line x1="${f(x)}" y1="${f(y - h / 2)}" x2="${f(x + w)}" y2="${f(y - h / 2)}" stroke="${PAL.drewnoC}" stroke-width="1.4"/>`;
  s += `<rect x="${f(x)}" y="${f(y - h)}" width="${f(w)}" height="${f(h)}" fill="none" stroke="${PAL.drewnoCC}" stroke-width="1.2"/>`;
  s += ladunek;
  return s;
}

/** Płotek z żerdzi. */
function plot(x0, y0, x1, y1, { slupki = 4 } = {}) {
  let s = '';
  for (const dy of [-11, -5])
    s += `<line x1="${f(x0)}" y1="${f(y0 + dy)}" x2="${f(x1)}" y2="${f(y1 + dy)}" stroke="${PAL.drewnoC}" stroke-width="2.6" stroke-linecap="round"/><line x1="${f(x0)}" y1="${f(y0 + dy - 0.8)}" x2="${f(x1)}" y2="${f(y1 + dy - 0.8)}" stroke="${PAL.drewnoJ}" stroke-width="1" opacity="0.7"/>`;
  for (let i = 0; i <= slupki; i++) {
    const t = i / slupki;
    const x = x0 + (x1 - x0) * t;
    const y = y0 + (y1 - y0) * t;
    s += `<rect x="${f(x - 1.8)}" y="${f(y - 15)}" width="3.6" height="16" fill="${PAL.drewno}"/><rect x="${f(x - 1.8)}" y="${f(y - 15)}" width="1.3" height="16" fill="${PAL.drewnoJ}" opacity="0.8"/>`;
  }
  return s;
}

/** Proporzec / flaga na maszcie. */
function proporzec(x, y, h, barwa = PAL.czerwien) {
  return `<rect x="${f(x - 1.2)}" y="${f(y - h)}" width="2.4" height="${f(h)}" fill="${PAL.drewnoC}"/>
  <path d="M${f(x + 1)} ${f(y - h + 1)} Q${f(x + 10)} ${f(y - h + 3)} ${f(x + 17)} ${f(y - h + 1)} L${f(x + 13)} ${f(y - h + 6)} L${f(x + 17)} ${f(y - h + 11)} Q${f(x + 9)} ${f(y - h + 9)} ${f(x + 1)} ${f(y - h + 11)} Z" fill="${barwa}"/>
  <path d="M${f(x + 1)} ${f(y - h + 1)} Q${f(x + 10)} ${f(y - h + 3)} ${f(x + 17)} ${f(y - h + 1)}" stroke="#fff" stroke-width="1" opacity="0.4" fill="none"/>
  <circle cx="${f(x)}" cy="${f(y - h - 1)}" r="1.8" fill="${PAL.zloto}"/>`;
}

/** Kępka trawy. */
function trawka(x, y, s = 1) {
  let o = '';
  for (const [dx, h, k] of [
    [-3, 7, -0.4],
    [0, 9, 0],
    [3, 6, 0.4],
    [1.5, 5, 0.7],
  ])
    o += `<path d="M${f(x + dx * s)} ${f(y)} q${f(k * 3 * s)} ${f(-h * 0.5 * s)} ${f(k * 5 * s)} ${f(-h * s)}" stroke="${PAL.lisC}" stroke-width="${f(1.6 * s)}" fill="none" stroke-linecap="round"/>`;
  return o;
}

// ───────────────────────────────── obiekty ─────────────────────────────────

/** Kamieniołom kamieni ewolucji (kopalnia „kamien”) — 3 × 1 bryły. */
function kopalniaKamien() {
  const W = 3 * P;
  const H = 2.2 * P;
  const y = H - 2;
  const cx = W / 2;
  let s = '';
  s += cienRzucany(cx - 120, cx + 110, y, 70, { krycie: 0.28 });
  s += placek(cx + 5, y - 10, 135, 26, { kolor: PAL.ziemia, krycie: 0.65 });
  s += masyw(cx, y - 18, 230, 150, 3);
  // wyrobisko — tarasy jaśniejszego, świeżo ciętego kamienia
  s += `<path d="${sciezka([
    [cx - 58, y - 18],
    [cx - 52, y - 70],
    [cx - 20, y - 92],
    [cx + 34, y - 88],
    [cx + 58, y - 60],
    [cx + 56, y - 18],
  ])}" fill="${PAL.kamienC}"/>`;
  s += `<path d="${sciezka([
    [cx - 48, y - 30],
    [cx - 44, y - 64],
    [cx - 16, y - 82],
    [cx + 28, y - 78],
    [cx + 48, y - 56],
    [cx + 46, y - 30],
  ])}" fill="${mix(PAL.kamien, PAL.kamienJ, 0.4)}"/>`;
  s += murKamienny(cx - 44, y - 78, 90, 46, { blok: 14, ziarno: 11 });
  // barwne żyły kamieni w ścianie
  const r = los(17);
  for (let i = 0; i < 7; i++)
    s += kamyk(cx - 36 + r() * 72, y - 72 + r() * 36, 3.4 + r() * 1.6, BARWY_KAMIENI[i % 4]);
  s += sztolnia(cx, y - 14, 30, 36);
  s += tory(cx, y - 14, cx, y + 2);
  // żuraw z lewej
  s += `<path d="M${f(cx - 88)} ${f(y - 16)} L${f(cx - 74)} ${f(y - 80)} L${f(cx - 60)} ${f(y - 16)}" stroke="${PAL.drewnoC}" stroke-width="4" fill="none"/>`;
  s += `<path d="M${f(cx - 74)} ${f(y - 78)} L${f(cx - 30)} ${f(y - 96)}" stroke="${PAL.drewno}" stroke-width="4.5" stroke-linecap="round"/>`;
  s += `<path d="M${f(cx - 74)} ${f(y - 78)} L${f(cx - 30)} ${f(y - 96)}" stroke="${PAL.drewnoJ}" stroke-width="1.4"/>`;
  s += `<line x1="${f(cx - 32)}" y1="${f(y - 95)}" x2="${f(cx - 32)}" y2="${f(y - 64)}" stroke="#3a3330" stroke-width="1.2"/>`;
  s += paka(cx - 39, y - 54, 14, 10, kamyk(cx - 32, y - 66, 3.5, BARWY_KAMIENI[1]));
  // wózek z kamieniami po prawej
  let ladunek = '';
  for (let i = 0; i < 5; i++) ladunek += kamyk(cx + 68 + (i - 2) * 5, y - 29 - (i % 2) * 3, 4.2, BARWY_KAMIENI[i % 4]);
  s += tory(cx + 30, y - 8, cx + 108, y - 20);
  s += wozek(cx + 68, y - 8, 1.1, ladunek);
  // stos urobku na przedzie
  for (let i = 0; i < 6; i++) s += kamyk(cx - 70 + (i % 3) * 8, y - 8 - Math.floor(i / 3) * 6, 4, BARWY_KAMIENI[(i + 2) % 4]);
  s += latarnia(cx + 24, y - 10, 26);
  s += krzaczek(cx - 112, y - 2, 1.2, { ziarno: 4 }) + krzaczek(cx + 118, y - 4, 1, { ziarno: 6 });
  return svgObiektu(3, 2.2, s);
}

/** Grota kryształów (kopalnia „odlamek”) — 3 × 1 bryły. */
function kopalniaOdlamek() {
  const W = 3 * P;
  const H = 2.2 * P;
  const y = H - 2;
  const cx = W / 2;
  let s = '';
  s += cienRzucany(cx - 120, cx + 115, y, 80, { krycie: 0.28 });
  s += placek(cx, y - 8, 120, 24, { kolor: PAL.ziemia, krycie: 0.5 });
  s += masyw(cx, y - 14, 250, 175, 7);
  // wylot groty
  s += `<path d="M${f(cx - 34)} ${f(y - 8)} Q${f(cx - 38)} ${f(y - 70)} ${f(cx)} ${f(y - 74)} Q${f(cx + 38)} ${f(y - 70)} ${f(cx + 34)} ${f(y - 8)} Z" fill="${PAL.kamienCC}"/>`;
  s += `<path d="M${f(cx - 26)} ${f(y - 8)} Q${f(cx - 29)} ${f(y - 60)} ${f(cx)} ${f(y - 63)} Q${f(cx + 29)} ${f(y - 60)} ${f(cx + 26)} ${f(y - 8)} Z" fill="#170d22"/>`;
  s += `<ellipse cx="${f(cx)}" cy="${f(y - 26)}" rx="20" ry="16" fill="${PAL.fiolet}" opacity="0.45" filter="url(#blask)"/>`;
  s += krysztaly(cx - 6, y - 12, 0.55, { ziarno: 2 }) + krysztaly(cx + 10, y - 16, 0.4, { ziarno: 5 });
  // kryształy w skale po bokach
  s += `<ellipse cx="${f(cx - 58)}" cy="${f(y - 30)}" rx="26" ry="20" fill="${PAL.fioletJ}" opacity="0.35" filter="url(#blask)"/>`;
  s += krysztaly(cx - 58, y - 14, 1.25, { ziarno: 8 });
  s += krysztaly(cx + 56, y - 12, 1.0, { ziarno: 9 });
  s += krysztaly(cx + 28, y - 96, 0.7, { ziarno: 12 });
  s += krysztaly(cx - 40, y - 104, 0.55, { ziarno: 13, J: PAL.blekitJ, M: PAL.blekit });
  s += krysztaly(cx + 92, y - 6, 0.6, { ziarno: 14, J: PAL.blekitJ, M: PAL.blekit });
  // belka nad wejściem i taczka
  s += `<rect x="${f(cx - 40)}" y="${f(y - 74)}" width="80" height="6" rx="2" fill="${PAL.drewno}"/><rect x="${f(cx - 40)}" y="${f(y - 74)}" width="80" height="2" fill="${PAL.drewnoJ}"/>`;
  s += paka(cx - 104, y - 4, 18, 12, krysztaly(cx - 95, y - 15, 0.32, { ziarno: 3 }));
  s += latarnia(cx + 44, y - 6, 30);
  s += krzaczek(cx - 122, y - 2, 1.1, { ziarno: 2 }) + krzaczek(cx + 124, y - 3, 1, { ziarno: 8 });
  return svgObiektu(3, 2.2, s);
}

/** Pracownia pokeballi (kopalnia „pokeball”) — warsztat z kominem. 3 × 1. */
function kopalniaPokeball() {
  const W = 3 * P;
  const H = 2.2 * P;
  const y = H - 4;
  const cx = W / 2;
  let s = '';
  s += cienRzucany(cx - 100, cx + 90, y, 90, { krycie: 0.3 });
  s += placek(cx, y - 6, 128, 24, { kolor: PAL.ziemia, krycie: 0.55 });
  // skała za warsztatem (wsparty o zbocze)
  s += naZiemi(y - 50, masyw(cx + 10, y - 50, 230, 110, 21));
  const d = dom({ x: cx - 70, y: y - 6, w: 112, h: 48, g: 40, dachH: 38, sciana: 'kamien', dach: 'dachowka', ziarno: 4 });
  s += d.svg;
  // komin
  const kx = cx + 20;
  s += `<rect x="${f(kx)}" y="${f(d.top - 64)}" width="16" height="44" fill="${PAL.kamienC}"/>`;
  s += murKamienny(kx, d.top - 64, 16, 44, { blok: 7, ziarno: 3 });
  s += `<rect x="${f(kx - 2)}" y="${f(d.top - 68)}" width="20" height="6" fill="${PAL.kamienJ}"/>`;
  s += `<g opacity="0.75" filter="url(#cienMaly)"><circle cx="${f(kx + 8)}" cy="${f(d.top - 78)}" r="7" fill="#e6e4df"/><circle cx="${f(kx + 15)}" cy="${f(d.top - 90)}" r="9" fill="#dcdad4"/><circle cx="${f(kx + 26)}" cy="${f(d.top - 103)}" r="11" fill="#d2d0ca" opacity="0.8"/></g>`;
  // brama warsztatu pośrodku frontu i szyld z kulą
  s += `<rect x="${f(cx - 30)}" y="${f(y - 40)}" width="36" height="34" fill="#1d130b"/>`;
  s += `<path d="M${f(cx - 32)} ${f(y - 40)} h40 v4 h-40 Z" fill="${PAL.drewno}"/>`;
  s += deskiPion(cx - 30, y - 36, 14, 30, { szer: 4.6 }).replace(/opacity="0.7"/g, 'opacity="0.9"');
  s += `<rect x="${f(cx - 30)}" y="${f(y - 36)}" width="14" height="30" fill="${PAL.drewno}" opacity="0.85"/>`;
  s += okno(cx - 60, y - 36, 14, 14, { swieci: true }) + okno(cx + 18, y - 36, 14, 14, { swieci: true });
  s += kula(cx - 12, d.top - 18, 11);
  // skrzynie z kulami na zewnątrz
  s += paka(cx + 58, y - 2, 22, 14, kula(cx + 64, y - 18, 5) + kula(cx + 74, y - 19, 5) + kula(cx + 69, y - 22, 5));
  s += paka(cx - 104, y - 2, 20, 13, kula(cx - 98, y - 17, 4.6) + kula(cx - 89, y - 17, 4.6));
  s += kula(cx - 74, y - 6, 4.5) + kula(cx + 92, y - 4, 4.2);
  s += krzaczek(cx - 128, y, 1.1, { ziarno: 12 }) + krzaczek(cx + 128, y - 2, 1, { ziarno: 13 });
  return svgObiektu(3, 2.2, s);
}

export const OBIEKTY = {
  'kopalnia-kamien': { rysuj: kopalniaKamien },
  'kopalnia-odlamek': { rysuj: kopalniaOdlamek },
  'kopalnia-pokeball': { rysuj: kopalniaPokeball },
};

export { kula, jagoda, kamyk, krysztaly, glaz as glazPojedynczy, masyw, wozek, tory, sztolnia, latarnia, paka, plot, proporzec, trawka, BARWY_KAMIENI, drzewo };
