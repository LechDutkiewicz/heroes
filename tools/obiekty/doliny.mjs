// Obiekty, które są na Dwóch Dolinach, a nie ma ich na Polanie: stacja
// kolejki (portal), ośrodek ewolucji, strażnice graniczne i namioty klucznika
// w dwóch barwach kluczy, chata jasnowidza. Ten sam pędzel i ten sam duch
// Pokémon co `pokemon.mjs`.

import { P, PAL, f, pts, los, mix, sciezka, dom, krzaczek, placek, naZiemi, svgObiektu, uid, deskiPion } from './pedzel.mjs';
import { kula, krysztaly, kamyk, BARWY_KAMIENI, trawka, plot } from './obiekty.mjs';

const MUR = '#f4ecdc';

/** Barwy kluczy (strażnica i namiot klucznika). */
const KLUCZE = {
  zielony: { M: '#4caf50', J: '#8ad88a', C: '#2a7a30' },
  niebieski: { M: '#3f78c8', J: '#7cb0ec', C: '#24508e' },
};

function szyba(x, y, w, h, { swiatlo = false } = {}) {
  let s = `<rect x="${f(x - 2)}" y="${f(y - 2)}" width="${f(w + 4)}" height="${f(h + 4)}" rx="2" fill="#ffffff"/>`;
  s += `<rect x="${f(x)}" y="${f(y)}" width="${f(w)}" height="${f(h)}" fill="${swiatlo ? '#ffe7a3' : '#5aa9d6'}"/>`;
  s += `<path d="M${f(x)} ${f(y)} h${f(w * 0.55)} l${f(-w * 0.35)} ${f(h)} h${f(-w * 0.2)} Z" fill="#fff" opacity="0.35"/>`;
  return s;
}

/** Symbol klucza (do szyldów). */
function kluczyk(cx, cy, r, kol) {
  return `<circle cx="${f(cx - r * 0.5)}" cy="${f(cy)}" r="${f(r * 0.55)}" fill="none" stroke="${kol}" stroke-width="${f(r * 0.35)}"/><path d="M${f(cx)} ${f(cy)} h${f(r * 1.1)} m${f(-r * 0.35)} 0 v${f(r * 0.5)} m${f(-r * 0.35)} ${f(-r * 0.5)} v${f(r * 0.4)}" stroke="${kol}" stroke-width="${f(r * 0.3)}" fill="none" stroke-linecap="round"/>`;
}

/** Stacja kolejki linowej (portal): budynek stacji, słup, lina i czerwony wagonik. */
function stacja() {
  const W = 2.2 * P;
  const H = 2.3 * P;
  const y = H - 3;
  const cx = W / 2 - 18;
  let s = placek(cx, y - 6, 70, 14, { kolor: '#c9bfa8', krycie: 0.6 });
  const d = dom({ x: cx - 52, y: y - 4, w: 80, h: 56, g: 34, dachH: 22, okap: 7, sciana: 'gladka', dach: 'pasy', kolorSciany: MUR, kolorDachu: '#3f78c8', ziarno: 3 });
  s += d.svg;
  // otwarty peron z kołem napędowym
  s += `<rect x="${f(cx - 44)}" y="${f(y - 50)}" width="56" height="34" fill="#cfd6dc"/><rect x="${f(cx - 44)}" y="${f(y - 50)}" width="56" height="6" fill="#9aa4ae"/>`;
  s += `<ellipse cx="${f(cx - 16)}" cy="${f(y - 38)}" rx="18" ry="6" fill="#6a7682"/><ellipse cx="${f(cx - 16)}" cy="${f(y - 39)}" rx="12" ry="3.6" fill="#a8b0b8"/>`;
  for (let i = 0; i < 3; i++) s += `<rect x="${f(cx - 44 + i * 4)}" y="${f(y - 16 + i * 4)}" width="${56 - i * 8}" height="4" fill="${i % 2 ? '#d8d0bd' : '#e8e2d4'}"/>`;
  // słup po prawej i lina w górę
  const sx = cx + 70;
  s += `<path d="M${f(sx - 7)} ${f(y - 2)} L${f(sx - 2)} ${f(y - 124)} L${f(sx + 2)} ${f(y - 124)} L${f(sx + 7)} ${f(y - 2)} Z" fill="#6a7682"/><path d="M${f(sx)} ${f(y - 2)} L${f(sx + 2)} ${f(y - 124)} L${f(sx + 7)} ${f(y - 2)} Z" fill="#4a5560"/>`;
  s += `<rect x="${f(sx - 16)}" y="${f(y - 128)}" width="32" height="6" rx="2" fill="#4a5560"/>`;
  s += `<path d="M${f(cx + 20)} ${f(y - 58)} L${f(sx - 14)} ${f(y - 126)} L${f(W)} ${f(y - 190)}" stroke="#2a3038" stroke-width="2.2" fill="none"/>`;
  // wagonik na linie
  // wagonik wisi na linie za słupem, w drodze do drugiej stacji
  const gx = sx + 22;
  const gy = y - 118;
  s += `<line x1="${f(gx)}" y1="${f(gy - 26)}" x2="${f(gx)}" y2="${f(gy - 12)}" stroke="#4a5560" stroke-width="3"/>`;
  s += `<rect x="${f(gx - 16)}" y="${f(gy - 14)}" width="32" height="30" rx="6" fill="#d63c30"/><rect x="${f(gx + 6)}" y="${f(gy - 14)}" width="10" height="30" rx="4" fill="#9a2a22"/>`;
  s += `<rect x="${f(gx - 12)}" y="${f(gy - 9)}" width="9" height="11" rx="1.5" fill="#bfe4f6"/><rect x="${f(gx - 1)}" y="${f(gy - 9)}" width="9" height="11" rx="1.5" fill="#bfe4f6"/><rect x="${f(gx - 16)}" y="${f(gy - 14)}" width="32" height="4" rx="2" fill="#f0786a"/>`;
  s += trawka(cx - 70, y) + krzaczek(cx + 92, y, 0.9, { ziarno: 4 });
  return svgObiektu(2.2, 2.3, s);
}

/** Ośrodek ewolucji: biały budynek ze szklaną, tęczową kopułą i kamieniami ewolucji. 3 × 1. */
function osrodek() {
  const W = 3 * P;
  const H = 2.6 * P;
  const y = H - 3;
  const cx = W / 2;
  let s = placek(cx, y - 8, 120, 22, { kolor: '#c9bfa8', krycie: 0.55 });
  // cokół-rotunda
  const rw = 92;
  const ry = 26;
  const by = y - 20;
  s += `<path d="M${f(cx - rw)} ${f(by - 46)} V${f(by)} A${rw} ${ry} 0 0 0 ${f(cx + rw)} ${f(by)} V${f(by - 46)} Z" fill="${MUR}"/>`;
  s += `<path d="M${f(cx + 20)} ${f(by - 46)} V${f(by + ry - 2)} A${rw} ${ry} 0 0 0 ${f(cx + rw)} ${f(by)} V${f(by - 46)} Z" fill="#d6ccb4"/>`;
  s += `<path d="M${f(cx - rw)} ${f(by - 12)} A${rw} ${ry} 0 0 0 ${f(cx + rw)} ${f(by - 12)}" stroke="#9b5ad6" stroke-width="6" fill="none"/>`;
  for (const a of [-0.75, -0.4, 0.4, 0.75]) {
    const wx = cx + Math.sin(a) * rw * 0.95;
    const wy = by - 36 + Math.cos(a) * ry * 0.9;
    s += `<ellipse cx="${f(wx)}" cy="${f(wy)}" rx="${f(9 * Math.cos(a))}" ry="9" fill="#ffffff"/><ellipse cx="${f(wx)}" cy="${f(wy)}" rx="${f(6.5 * Math.cos(a))}" ry="6.5" fill="#5aa9d6"/>`;
  }
  // kopuła ze szkła w kolorowe segmenty
  const kr = rw - 6;
  const ky = by - 46;
  const id = uid('ko');
  const dk = `M${f(cx - kr)} ${f(ky)} A${kr} ${kr * 0.85} 0 0 1 ${f(cx + kr)} ${f(ky)} A${kr} ${ry * 0.9} 0 0 1 ${f(cx - kr)} ${f(ky)} Z`;
  s += `<clipPath id="${id}"><path d="${dk}"/></clipPath><path d="${dk}" fill="#bfe4f6"/>`;
  const tecza = ['#f6b0c8', '#ffd98a', '#c6f0a0', '#a8e0f6', '#c8b6f6', '#f6b0c8'];
  let seg = '';
  for (let i = 0; i < 6; i++) {
    const x0 = cx - kr + (2 * kr * i) / 6;
    seg += `<path d="M${f(x0)} ${f(ky + 10)} Q${f(x0 + kr / 6)} ${f(ky - kr)} ${f(cx)} ${f(ky - kr * 0.85)} L${f(cx)} ${f(ky - kr * 0.85)} Q${f(x0 + kr / 3 + kr / 6)} ${f(ky - kr)} ${f(x0 + kr / 3)} ${f(ky + 10)} Z" fill="${tecza[i]}" opacity="0.75"/>`;
  }
  s += `<g clip-path="url(#${id})">${seg}<rect x="${f(cx + 10)}" y="${f(ky - kr)}" width="${kr}" height="${kr + 20}" fill="#2a3a6a" opacity="0.15"/>`;
  for (let i = 1; i < 6; i++) {
    const x0 = cx - kr + (2 * kr * i) / 6;
    s += `<path d="M${f(x0)} ${f(ky + 10)} Q${f(x0 + (cx - x0) * 0.3)} ${f(ky - kr * 0.6)} ${f(cx)} ${f(ky - kr * 0.85)}" stroke="#ffffff" stroke-width="2.4" fill="none"/>`;
  }
  s += `<path d="M${f(cx - kr * 0.75)} ${f(ky - 18)} Q${f(cx - kr * 0.55)} ${f(ky - kr * 0.65)} ${f(cx - kr * 0.1)} ${f(ky - kr * 0.8)}" stroke="#fff" stroke-width="7" fill="none" opacity="0.6" stroke-linecap="round"/></g>`;
  s += `<path d="${dk}" fill="none" stroke="#e8e8f0" stroke-width="2"/>`;
  s += `<circle cx="${f(cx)}" cy="${f(ky - kr * 0.85 - 4)}" r="7" fill="#9b5ad6"/><circle cx="${f(cx - 2)}" cy="${f(ky - kr * 0.85 - 6)}" r="2.5" fill="#fff"/>`;
  // wejście (łuk) i schody
  s += `<path d="M${f(cx - 16)} ${f(by + ry)} V${f(by + ry - 28)} A16 14 0 0 1 ${f(cx + 16)} ${f(by + ry - 28)} V${f(by + ry)} Z" fill="#2a3440"/><path d="M${f(cx - 14)} ${f(by + ry)} V${f(by + ry - 28)} A14 12 0 0 1 ${f(cx)} ${f(by + ry - 40)} V${f(by + ry)} Z" fill="#7cc4e8" opacity="0.6"/>`;
  for (let i = 0; i < 2; i++) s += `<rect x="${f(cx - 24 - i * 5)}" y="${f(by + ry + i * 5)}" width="${48 + i * 10}" height="5" fill="${i ? '#d4c8ae' : '#e4dac4'}"/>`;
  // kamienie ewolucji na postumentach
  const postument = (x, yy, i) => `<rect x="${f(x - 8)}" y="${f(yy - 14)}" width="16" height="14" fill="#d8d0bd"/><rect x="${f(x + 2)}" y="${f(yy - 14)}" width="6" height="14" fill="#000" opacity="0.15"/><rect x="${f(x - 10)}" y="${f(yy - 17)}" width="20" height="4" fill="#efe6cf"/>${kamyk(x, yy - 26, 8, BARWY_KAMIENI[i])}`;
  s += postument(cx - 112, y - 6, 0) + postument(cx - 76, y + 2, 1) + postument(cx + 76, y + 2, 2) + postument(cx + 112, y - 6, 3);
  return svgObiektu(3, 2.6, s);
}

/**
 * Strażnica graniczna: bramka jak na trasach z gier Pokémon — budka strażnika
 * pośrodku i szlaban w barwie klucza w poprzek trzech pól. Ziemia rysunku
 * leży na dole pola wejścia (rząd strażnicy), a nie nad nim.
 */
function straznica(kolor) {
  const k = KLUCZE[kolor];
  const W = 3 * P;
  const H0 = 1.75 * P;
  const H = H0 + 0.9 * P;
  const y = H - 6; // grunt: dół rzędu strażnicy (płótno sięga 0,9 pola pod linię bryły)
  const cx = W / 2;
  let s = '';
  // budka
  const d = dom({ x: cx - 34, y: y - 14, w: 58, h: 62, g: 30, dachH: 20, okap: 6, sciana: 'gladka', dach: 'pasy', kolorSciany: MUR, kolorDachu: k.M, ziarno: 7 });
  s += d.svg;
  s += szyba(cx - 26, y - 66, 18, 16) + szyba(cx - 2, y - 66, 18, 16);
  s += `<rect x="${f(cx - 34)}" y="${f(y - 34)}" width="58" height="8" fill="${k.M}"/><rect x="${f(cx - 34)}" y="${f(y - 34)}" width="58" height="2.5" fill="${k.J}"/>`;
  s += `<rect x="${f(cx - 12)}" y="${f(y - 30)}" width="16" height="16" rx="2" fill="#4a5560"/>`;
  // szyld z kluczem nad daszkiem
  s += `<rect x="${f(cx - 20)}" y="${f(d.top - 34)}" width="34" height="18" rx="4" fill="#fff" stroke="${k.C}" stroke-width="2"/>${kluczyk(cx - 3, d.top - 25, 8, k.C)}`;
  // szlaban: słupki po bokach, ramię w paski w barwie klucza
  const lewy = cx - 132;
  const prawy = cx + 134;
  s += `<rect x="${f(lewy - 6)}" y="${f(y - 40)}" width="12" height="40" rx="3" fill="${k.M}"/><rect x="${f(lewy - 6)}" y="${f(y - 40)}" width="4" height="40" fill="${k.J}"/><ellipse cx="${f(lewy)}" cy="${f(y - 40)}" rx="6" ry="2.5" fill="${k.J}"/>`;
  s += `<rect x="${f(prawy - 4)}" y="${f(y - 30)}" width="8" height="30" fill="#6a7682"/>`;
  const ramie = `M${f(lewy)} ${f(y - 34)} H${f(prawy)} v8 H${f(lewy)} Z`;
  s += `<path d="${ramie}" fill="#ffffff"/>`;
  for (let x = lewy + 8; x < prawy - 8; x += 26) s += `<rect x="${f(x)}" y="${f(y - 34)}" width="13" height="8" fill="${k.M}"/>`;
  s += `<path d="${ramie}" fill="none" stroke="#2a3038" stroke-width="1.2"/>`;
  // płotki przy brzegach (domykają przejście)
  s += plot(lewy - 40, y - 2, lewy - 8, y - 2, { slupki: 2 }) + plot(prawy + 6, y - 2, prawy + 36, y - 2, { slupki: 2 });
  s += krzaczek(lewy - 48, y + 2, 1, { ziarno: 11 });
  return svgObiektu(3, H0 / P, naZiemi(y, s), { dol: (H - H0) / P });
}

/** Namiot klucznika: kiosk z markizą w barwie klucza i tablicą z kluczami. */
function namiotKlucznika(kolor) {
  const k = KLUCZE[kolor];
  const W = 1.6 * P;
  const H = 1.5 * P;
  const y = H - 3;
  const cx = W / 2;
  let s = placek(cx, y - 4, 50, 10, { kolor: '#c9bfa8', krycie: 0.6 });
  // budka z ladą
  s += `<path d="${sciezka([
    [cx + 34, y - 4],
    [cx + 34, y - 66],
    [cx + 46, y - 74],
    [cx + 46, y - 12],
  ])}" fill="#d6ccb4"/>`;
  s += `<rect x="${f(cx - 34)}" y="${f(y - 66)}" width="68" height="62" fill="${MUR}"/>`;
  s += `<rect x="${f(cx - 30)}" y="${f(y - 58)}" width="60" height="26" fill="#a87a4a"/>`;
  for (let i = 0; i < 4; i++) s += kluczyk(cx - 20 + i * 14, y - 46, 5, '#f2c230');
  s += `<rect x="${f(cx - 38)}" y="${f(y - 30)}" width="76" height="8" rx="2" fill="${PAL.drewnoJ}"/><rect x="${f(cx - 34)}" y="${f(y - 22)}" width="68" height="18" fill="#e4dac4"/>`;
  // markiza w paski
  for (let i = 0; i < 6; i++) s += `<path d="M${f(cx - 40 + i * 14)} ${f(y - 80)} h14 l3 16 q-10 5 -20 0 Z" fill="${i % 2 ? '#ffffff' : k.M}"/>`;
  s += `<rect x="${f(cx - 40)}" y="${f(y - 84)}" width="84" height="5" rx="2" fill="${k.C}"/>`;
  s += `<rect x="${f(cx - 36)}" y="${f(y - 80)}" width="3" height="76" fill="#9aa4ae"/><rect x="${f(cx + 33)}" y="${f(y - 80)}" width="3" height="76" fill="#6a7682"/>`;
  return svgObiektu(1.6, 1.5, s);
}

/** Chata jasnowidza: fioletowy namiot w gwiazdki, stolik z kryształową kulą, luneta. */
function jasnowidz() {
  const W = 2.1 * P;
  const H = 1.8 * P;
  const y = H - 3;
  const cx = W / 2 - 10;
  let s = placek(cx, y - 8, 70, 14, { kolor: PAL.ziemia, krycie: 0.5 });
  const ty = y - 10;
  // namiot: stożek z dwiema połaciami
  s += naZiemi(ty, `<path d="M${f(cx - 48)} ${f(ty)} Q${f(cx - 30)} ${f(ty - 50)} ${f(cx)} ${f(ty - 96)} L${f(cx + 6)} ${f(ty)} Z" fill="#8d5cc0"/>
    <path d="M${f(cx + 6)} ${f(ty)} L${f(cx)} ${f(ty - 96)} Q${f(cx + 30)} ${f(ty - 50)} ${f(cx + 50)} ${f(ty)} Z" fill="#5e3a8a"/>
    <path d="M${f(cx - 46)} ${f(ty - 6)} Q${f(cx - 26)} ${f(ty - 16)} ${f(cx + 6)} ${f(ty - 6)} Q${f(cx + 30)} ${f(ty - 16)} ${f(cx + 50)} ${f(ty - 6)}" stroke="#f2c230" stroke-width="3" fill="none"/>
    <path d="M${f(cx - 10)} ${f(ty)} Q${f(cx - 6)} ${f(ty - 34)} ${f(cx + 2)} ${f(ty - 44)} Q${f(cx + 10)} ${f(ty - 34)} ${f(cx + 14)} ${f(ty)} Z" fill="#2a1a3a"/>
    <path d="M${f(cx - 10)} ${f(ty)} Q${f(cx - 6)} ${f(ty - 34)} ${f(cx + 2)} ${f(ty - 44)} L${f(cx - 16)} ${f(ty)} Z" fill="#c8a6ee"/>
    ${[
      [-24, -40, 4],
      [-12, -66, 3],
      [20, -30, 3.5],
      [-30, -16, 3],
    ]
      .map(([dx, dy, r]) => `<path d="M${f(cx + dx)} ${f(ty + dy - r)} l${f(r * 0.3)} ${f(r * 0.7)} l${f(r * 0.7)} ${f(r * 0.3)} l${f(-r * 0.7)} ${f(r * 0.3)} l${f(-r * 0.3)} ${f(r * 0.7)} l${f(-r * 0.3)} ${f(-r * 0.7)} l${f(-r * 0.7)} ${f(-r * 0.3)} l${f(r * 0.7)} ${f(-r * 0.3)} Z" fill="#ffe08a"/>`)
      .join('')}
    <circle cx="${f(cx)}" cy="${f(ty - 100)}" r="5" fill="#f2c230"/>`);
  // stolik z kulą
  const sx = cx + 70;
  s += `<rect x="${f(sx - 18)}" y="${f(y - 26)}" width="36" height="5" rx="2" fill="#7a3fa0"/><path d="M${f(sx - 18)} ${f(y - 21)} h36 l-4 14 h-28 Z" fill="#8d5cc0"/><path d="M${f(sx - 18)} ${f(y - 21)} h36" stroke="#f2c230" stroke-width="2"/>`;
  s += `<circle cx="${f(sx)}" cy="${f(y - 36)}" r="12" fill="#c8a6ee" opacity="0.45" filter="url(#blask)"/><circle cx="${f(sx)}" cy="${f(y - 36)}" r="9" fill="#bfe4f6"/><circle cx="${f(sx - 3)}" cy="${f(y - 39)}" r="3" fill="#fff"/><ellipse cx="${f(sx)}" cy="${f(y - 27)}" rx="7" ry="2" fill="#f2c230"/>`;
  // luneta na trójnogu
  const lx = cx - 70;
  s += `<path d="M${f(lx - 10)} ${f(y - 2)} L${f(lx)} ${f(y - 30)} L${f(lx + 10)} ${f(y - 2)} M${f(lx)} ${f(y - 30)} V${f(y - 2)}" stroke="#4a5560" stroke-width="2.2" fill="none"/><path d="M${f(lx - 14)} ${f(y - 26)} L${f(lx + 16)} ${f(y - 44)}" stroke="#3f78c8" stroke-width="6" stroke-linecap="round"/><path d="M${f(lx + 8)} ${f(y - 40)} L${f(lx + 18)} ${f(y - 46)}" stroke="#f2c230" stroke-width="7" stroke-linecap="round"/>`;
  s += trawka(cx + 92, y) + krzaczek(cx - 92, y + 1, 0.9, { ziarno: 21 });
  return svgObiektu(2.1, 1.8, s);
}

export const DOLINY = {
  portal: { rysuj: stacja },
  'osrodek-ewolucji': { rysuj: osrodek },
  'straznica-zielony': { rysuj: () => straznica('zielony') },
  'straznica-niebieski': { rysuj: () => straznica('niebieski') },
  'namiot-klucznika-zielony': { rysuj: () => namiotKlucznika('zielony') },
  'namiot-klucznika-niebieski': { rysuj: () => namiotKlucznika('niebieski') },
  'chata-jasnowidza': { rysuj: jasnowidz },
};
export { pts, los, mix, deskiPion, krysztaly, kula };
