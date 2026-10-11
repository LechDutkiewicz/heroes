// Wspólny „pędzel" obiektów mapy przygody rysowanych kodem (bez OpenAI).
//
// Każdy obiekt to SVG składane z tych samych klocków: jedna paleta, jedno
// światło (z lewej góry), jeden cień rzucany (w prawo w dół, miękki), te same
// faktury (dachówka, strzecha, deski, kamień) i ten sam rzut 3/4 jak w HoMM3:
// widać front i prawy bok, dach od frontu, bez czarnych konturów — krawędź
// robi ciemniejszy odcień tej samej barwy.
//
// Jednostka: piksele przy P px na pole. Płótno obiektu ma wymiary w polach,
// a spód płótna to dolna krawędź rzędu, na którym obiekt stoi.

export const P = 96;

/** Paleta wspólna dla całego kompletu (dobrana do tła Polany). */
export const PAL = {
  // drewno
  drewnoJ: '#d9a55f',
  drewno: '#a8703a',
  drewnoC: '#6e4421',
  drewnoCC: '#432812',
  // kamień
  kamienJ: '#efe6cf',
  kamien: '#cbbfa2',
  kamienC: '#8e8268',
  kamienCC: '#574d3c',
  // tynk / mur bielony
  tynkJ: '#f4ead2',
  tynk: '#dfcfa8',
  tynkC: '#b39f78',
  // dachówka
  dachJ: '#e0703f',
  dach: '#b9482a',
  dachC: '#7d2c1b',
  // strzecha
  strzechaJ: '#f0cf7a',
  strzecha: '#c99a45',
  strzechaC: '#8a6328',
  // łupek / dach niebieski
  lupekJ: '#7fa3c4',
  lupek: '#4f7397',
  lupekC: '#2f4a66',
  // zieleń
  lisJ: '#a9d45a',
  lis: '#6fa83a',
  lisC: '#3f7428',
  lisCC: '#244a1a',
  // ziemia
  ziemiaJ: '#d6a86a',
  ziemia: '#a87a45',
  ziemiaC: '#6d4b28',
  // akcenty
  czerwien: '#c4473a',
  czerwienC: '#7f2a22',
  zloto: '#e3b44a',
  zlotoC: '#a87618',
  biel: '#efe8d6',
  okno: '#2c2f3a',
  oknoSwiatlo: '#ffd77a',
  fiolet: '#8d5cc0',
  fioletJ: '#c8a6ee',
  blekit: '#4fa6cf',
  blekitJ: '#bdf0ff',
};

let licznik = 0;
/** Unikalny identyfikator (gradienty, maski) w obrębie jednego SVG. */
export const uid = (p = 'i') => `${p}${++licznik}`;

export const f = (n) => Math.round(n * 10) / 10;
export const pts = (arr) => arr.map(([x, y]) => `${f(x)},${f(y)}`).join(' ');

/** Prosty, powtarzalny generator liczb (ziarno → ciąg). */
export function los(ziarno = 1) {
  let s = ziarno >>> 0 || 1;
  return () => {
    s ^= s << 13;
    s ^= s >>> 17;
    s ^= s << 5;
    return ((s >>> 0) % 100000) / 100000;
  };
}

/** Miesza dwa kolory #rrggbb w proporcji t (0 → a, 1 → b). */
export function mix(a, b, t) {
  const pa = [1, 3, 5].map((i) => parseInt(a.slice(i, i + 2), 16));
  const pb = [1, 3, 5].map((i) => parseInt(b.slice(i, i + 2), 16));
  return '#' + pa.map((v, i) => Math.round(v + (pb[i] - v) * t).toString(16).padStart(2, '0')).join('');
}

/**
 * Wspólne definicje: faktura „malarska" (szum nakładany na wszystko),
 * miękki cień, gradienty światła.
 */
export function defsWspolne() {
  return `
  <filter id="ziarno" x="0" y="0" width="100%" height="100%">
    <feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="2" seed="7" result="n"/>
    <feColorMatrix type="matrix" values="0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 0.55 -0.18" in="n" result="m"/>
    <feComposite in="m" in2="SourceGraphic" operator="in"/>
  </filter>
  <filter id="plama" x="-20%" y="-20%" width="140%" height="140%">
    <feTurbulence type="fractalNoise" baseFrequency="0.05" numOctaves="3" seed="3" result="n"/>
    <feDisplacementMap in="SourceGraphic" in2="n" scale="6"/>
  </filter>
  <filter id="cien" x="-30%" y="-30%" width="160%" height="160%">
    <feGaussianBlur stdDeviation="3.2"/>
  </filter>
  <filter id="cienMaly" x="-30%" y="-30%" width="160%" height="160%">
    <feGaussianBlur stdDeviation="1.6"/>
  </filter>
  <filter id="blask" x="-50%" y="-50%" width="200%" height="200%">
    <feGaussianBlur stdDeviation="4"/>
  </filter>
  <filter id="obrys" x="-5%" y="-5%" width="110%" height="110%">
    <feComponentTransfer in="SourceAlpha" result="a"><feFuncA type="discrete" tableValues="0 0 1 1"/></feComponentTransfer>
    <feMorphology in="a" operator="dilate" radius="2.6" result="d"/>
    <feFlood flood-color="#23170b" flood-opacity="0.92"/>
    <feComposite in2="d" operator="in" result="o"/>
    <feMerge><feMergeNode in="o"/><feMergeNode in="SourceGraphic"/></feMerge>
  </filter>
  <linearGradient id="swiatloL" x1="0" y1="0" x2="1" y2="0.4">
    <stop offset="0" stop-color="#fff" stop-opacity="0.22"/>
    <stop offset="0.55" stop-color="#fff" stop-opacity="0"/>
    <stop offset="1" stop-color="#000" stop-opacity="0.18"/>
  </linearGradient>
  <linearGradient id="swiatloG" x1="0" y1="0" x2="0" y2="1">
    <stop offset="0" stop-color="#fff" stop-opacity="0.18"/>
    <stop offset="0.6" stop-color="#fff" stop-opacity="0"/>
    <stop offset="1" stop-color="#000" stop-opacity="0.22"/>
  </linearGradient>`;
}

/** Ziarno nałożone na kształt: rysuje go drugi raz z filtrem szumu. */
export const ziarno = (ksztalt) => `<g filter="url(#ziarno)" opacity="0.6">${ksztalt}</g>`;

/**
 * Cień rzucany: sylwetka (wielokąt podstawy + wysokość) rzucona w prawo
 * w dół. `podstawa` — punkty na ziemi, `wys` — wysokość bryły, z której
 * robi się „ogon" cienia. Światło z lewej góry, więc cień leci w prawo.
 */
export function cienRzucany(x0, x1, y, wys, { krycie = 0.32, skos = 0.55, splaszcz = 0.35 } = {}) {
  // Cień rzucany robi teraz `svgObiektu` z sylwetki — ta funkcja zostaje
  // tylko jako ciemniejszy kontakt u podstawy.
  return `<ellipse cx="${f((x0 + x1) / 2 + 4)}" cy="${f(y - 1)}" rx="${f((x1 - x0) / 2 + 4)}" ry="${f(Math.min(10, wys * 0.08))}" fill="#0b1a05" opacity="${krycie * 0.9}" filter="url(#cienMaly)"/>`;
}

/** Część obiektu stojąca na ziemi na wysokości `y` płótna (cień od tej linii). */
export const naZiemi = (y, tresc) => `<!--z:${f(y)}-->${tresc}<!--/z-->`;

/** Owalny cień kontaktowy pod rzeczą stojącą na ziemi. */
export function cienPod(cx, cy, rx, ry, krycie = 0.38) {
  return `<ellipse cx="${f(cx + rx * 0.18)}" cy="${f(cy)}" rx="${f(rx)}" ry="${f(ry)}" fill="#0b1a05" opacity="${krycie}" filter="url(#cien)"/>`;
}

/** Wzór (pattern) faktury przycięty do kształtu `d` (ścieżka SVG). */
export function wypelnij(d, kolor, wzor = null, { swiatlo = 'swiatloL' } = {}) {
  const id = uid('c');
  let s = `<clipPath id="${id}"><path d="${d}"/></clipPath>`;
  s += `<path d="${d}" fill="${kolor}"/>`;
  if (wzor) s += `<g clip-path="url(#${id})">${wzor}</g>`;
  if (swiatlo) s += `<path d="${d}" fill="url(#${swiatlo})"/>`;
  s += `<g clip-path="url(#${id})">${ziarno(`<path d="${d}" fill="#888"/>`)}</g>`;
  return s;
}

/** Zamknięta, wygładzona ścieżka przez punkty (krzywe przez środki boków). */
export function gladka(arr) {
  const n = arr.length;
  const mid = (a, b) => [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2];
  let d = '';
  for (let i = 0; i < n; i++) {
    const a = arr[i];
    const b = arr[(i + 1) % n];
    const m = mid(a, b);
    if (i === 0) d += `M${f(mid(arr[n - 1], a)[0])} ${f(mid(arr[n - 1], a)[1])} `;
    d += `Q${f(a[0])} ${f(a[1])} ${f(m[0])} ${f(m[1])} `;
  }
  return d + 'Z';
}

export const sciezka = (arr) => 'M' + arr.map(([x, y]) => `${f(x)} ${f(y)}`).join(' L') + ' Z';

/** Deski pionowe w prostokącie (faktura drewnianej ściany). */
export function deskiPion(x, y, w, h, { szer = 9, kolor = PAL.drewnoC, ziarno: z = 3 } = {}) {
  const r = los(z);
  let s = '';
  for (let xx = x; xx < x + w; xx += szer) {
    s += `<line x1="${f(xx)}" y1="${f(y)}" x2="${f(xx)}" y2="${f(y + h)}" stroke="${kolor}" stroke-width="1.4" opacity="0.7"/>`;
    if (r() < 0.5) {
      const sek = y + r() * h;
      s += `<ellipse cx="${f(xx + szer / 2)}" cy="${f(sek)}" rx="1.6" ry="1" fill="${kolor}" opacity="0.5"/>`;
    }
    s += `<line x1="${f(xx + 1.5)}" y1="${f(y)}" x2="${f(xx + 1.5)}" y2="${f(y + h)}" stroke="#fff" stroke-width="0.8" opacity="0.18"/>`;
  }
  return s;
}

/** Bale poziome (zrąb). */
export function balePoziom(x, y, w, h, { gr = 8, kolor = PAL.drewnoC, jasny = PAL.drewnoJ } = {}) {
  let s = '';
  for (let yy = y; yy < y + h; yy += gr) {
    s += `<rect x="${f(x)}" y="${f(yy + gr - 2)}" width="${f(w)}" height="2" fill="${kolor}" opacity="0.6"/>`;
    s += `<rect x="${f(x)}" y="${f(yy + 1)}" width="${f(w)}" height="1.4" fill="${jasny}" opacity="0.45"/>`;
  }
  return s;
}

/** Mur z kamienia: nieregularne bloki w rzędach. */
export function murKamienny(x, y, w, h, { blok = 12, ziarno: z = 5, kolorC = PAL.kamienC, jasny = PAL.kamienJ } = {}) {
  const r = los(z);
  let s = '';
  let rzad = 0;
  for (let yy = y; yy < y + h; yy += blok * 0.7, rzad++) {
    let xx = x - (rzad % 2 ? blok * 0.5 : 0);
    while (xx < x + w) {
      const bw = blok * (0.7 + r() * 0.7);
      const bh = blok * 0.7;
      const t = r();
      s += `<rect x="${f(xx + 0.8)}" y="${f(yy + 0.8)}" width="${f(bw - 1.6)}" height="${f(bh - 1.6)}" rx="2.2" fill="${t < 0.3 ? jasny : t > 0.8 ? kolorC : 'none'}" opacity="${t < 0.3 ? 0.35 : 0.25}"/>`;
      s += `<path d="M${f(xx)} ${f(yy + bh)} L${f(xx + bw)} ${f(yy + bh)} M${f(xx + bw)} ${f(yy)} L${f(xx + bw)} ${f(yy + bh)}" stroke="${kolorC}" stroke-width="1.3" opacity="0.75"/>`;
      s += `<path d="M${f(xx + 1)} ${f(yy + 1.2)} L${f(xx + bw - 2)} ${f(yy + 1.2)}" stroke="${jasny}" stroke-width="1" opacity="0.5"/>`;
      xx += bw;
    }
  }
  return s;
}

/** Dachówka (rzędy łusek) w obszarze. `nach` — przesunięcie rzędów w poziomie (perspektywa). */
export function dachowka(x, y, w, h, { rzad = 7, luska = 8, kolorC = PAL.dachC, jasny = PAL.dachJ } = {}) {
  let s = '';
  let i = 0;
  for (let yy = y; yy < y + h + rzad; yy += rzad, i++) {
    const off = i % 2 ? luska / 2 : 0;
    for (let xx = x - luska + off; xx < x + w + luska; xx += luska) {
      s += `<path d="M${f(xx)} ${f(yy)} q${f(luska / 2)} ${f(rzad * 1.15)} ${f(luska)} 0" fill="none" stroke="${kolorC}" stroke-width="1.3" opacity="0.8"/>`;
      s += `<path d="M${f(xx + 1.5)} ${f(yy + 1.5)} q${f(luska / 2 - 1.5)} ${f(rzad * 0.6)} ${f(luska - 3)} 0" fill="none" stroke="${jasny}" stroke-width="1" opacity="0.45"/>`;
    }
  }
  return s;
}

/** Strzecha: gęste krótkie pociągnięcia. */
export function strzecha(x, y, w, h, { ziarno: z = 9, kolorC = PAL.strzechaC, jasny = PAL.strzechaJ } = {}) {
  const r = los(z);
  let s = '';
  const n = Math.round((w * h) / 22);
  for (let i = 0; i < n; i++) {
    const xx = x + r() * w;
    const yy = y + r() * h;
    const l = 4 + r() * 6;
    const c = r() < 0.55 ? kolorC : jasny;
    s += `<line x1="${f(xx)}" y1="${f(yy)}" x2="${f(xx + (r() - 0.5) * 2)}" y2="${f(yy + l)}" stroke="${c}" stroke-width="1.1" opacity="${c === jasny ? 0.55 : 0.5}"/>`;
  }
  for (let yy = y + 9; yy < y + h; yy += 10)
    s += `<path d="M${f(x)} ${f(yy)} L${f(x + w)} ${f(yy)}" stroke="${kolorC}" stroke-width="1.6" opacity="0.35"/>`;
  return s;
}

/** Okno z ramą i światłem. */
export function okno(x, y, w, h, { rama = PAL.drewnoC, swieci = false, krzyz = true } = {}) {
  let s = `<rect x="${f(x - 1.5)}" y="${f(y - 1.5)}" width="${f(w + 3)}" height="${f(h + 3)}" rx="1" fill="${rama}"/>`;
  s += `<rect x="${f(x)}" y="${f(y)}" width="${f(w)}" height="${f(h)}" fill="${swieci ? PAL.oknoSwiatlo : PAL.okno}"/>`;
  if (!swieci) s += `<path d="M${f(x)} ${f(y)} l${f(w)} 0 l0 ${f(h * 0.35)} Z" fill="#9fc3e0" opacity="0.35"/>`;
  if (krzyz)
    s += `<path d="M${f(x + w / 2)} ${f(y)} V${f(y + h)} M${f(x)} ${f(y + h / 2)} H${f(x + w)}" stroke="${rama}" stroke-width="1.4"/>`;
  s += `<rect x="${f(x - 2.5)}" y="${f(y + h + 1)}" width="${f(w + 5)}" height="2.4" fill="${PAL.drewnoJ}" opacity="0.8"/>`;
  return s;
}

/** Drzwi łukowe. */
export function drzwi(x, y, w, h, { kolor = PAL.drewnoC, ciemne = '#2a1a0c' } = {}) {
  const r = w / 2;
  const d = `M${f(x)} ${f(y + h)} V${f(y + r)} A${f(r)} ${f(r)} 0 0 1 ${f(x + w)} ${f(y + r)} V${f(y + h)} Z`;
  let s = `<path d="${d}" fill="${ciemne}" transform="translate(-1.5,-1.5) scale(1)" opacity="0.8"/>`;
  s += `<path d="${d}" fill="${kolor}"/>`;
  s += `<g opacity="0.6">${deskiPion(x, y, w, h, { szer: w / 3, kolor: ciemne })}</g>`;
  s += `<circle cx="${f(x + w * 0.75)}" cy="${f(y + h * 0.6)}" r="1.4" fill="${PAL.zloto}"/>`;
  return s;
}

/**
 * Dom w rzucie 3/4: front (szer `w`, wys `h`) + prawy bok (głęb. `g`,
 * skośnie w górę) + dwuspadowy dach kalenicą równoległą do frontu.
 * `x` — lewy dolny róg frontu, `y` — ziemia. Zwraca { svg, ...geometria }.
 */
export function dom({
  x,
  y,
  w,
  h,
  g = 30,
  dachH = 34,
  okap = 6,
  sciana = 'drewno',
  dach = 'dachowka',
  kolorSciany,
  kolorDachu,
  ziarno: z = 1,
}) {
  const gx = g * 0.62;
  const gy = g * 0.42;
  const top = y - h;
  // ściana frontowa i boczna
  const front = sciezka([
    [x, y],
    [x, top],
    [x + w, top],
    [x + w, y],
  ]);
  const bok = sciezka([
    [x + w, y],
    [x + w, top],
    [x + w + gx, top - gy],
    [x + w + gx, y - gy],
  ]);
  const kolS =
    kolorSciany ?? (sciana === 'kamien' ? PAL.kamien : sciana === 'tynk' ? PAL.tynk : sciana === 'bale' ? PAL.drewno : PAL.drewno);
  const kolSC = mix(kolS, '#2a1a10', 0.38);
  let fakt = '';
  let faktB = '';
  if (sciana === 'kamien') {
    fakt = murKamienny(x, top, w, h, { ziarno: z });
    faktB = murKamienny(x + w, top - gy, gx, h + gy, { ziarno: z + 3, blok: 9 });
  } else if (sciana === 'drewno') {
    fakt = deskiPion(x, top, w, h, { ziarno: z });
    faktB = deskiPion(x + w, top - gy, gx, h + gy, { ziarno: z + 1, szer: 7 });
  } else if (sciana === 'bale') {
    fakt = balePoziom(x, top, w, h);
    faktB = balePoziom(x + w, top - gy, gx, h + gy);
  } else if (sciana === 'tynk') {
    fakt = `<path d="M${f(x)} ${f(top + 3)} H${f(x + w)}" stroke="${PAL.drewnoC}" stroke-width="3"/><path d="M${f(x + 2)} ${f(top)} V${f(y)} M${f(x + w - 2)} ${f(top)} V${f(y)}" stroke="${PAL.drewnoC}" stroke-width="3.2"/>`;
    faktB = '';
  }
  let svg = wypelnij(front, kolS, fakt);
  svg += wypelnij(bok, kolSC, faktB, { swiatlo: null });
  // cień okapu na ścianach
  svg += `<path d="${sciezka([
    [x, top],
    [x + w, top],
    [x + w + gx, top - gy],
    [x + w + gx, top - gy + 8],
    [x + w, top + 8],
    [x, top + 8],
  ])}" fill="#1a0f05" opacity="0.32"/>`;
  // podmurówka
  svg += `<path d="${sciezka([
    [x - 1, y + 1],
    [x - 1, y - 5],
    [x + w, y - 5],
    [x + w + gx, y - 5 - gy],
    [x + w + gx + 1, y - gy + 1],
    [x + w, y + 1],
  ])}" fill="${PAL.kamienC}"/>`;
  svg += `<path d="M${f(x - 1)} ${f(y - 5)} H${f(x + w)} L${f(x + w + gx)} ${f(y - 5 - gy)}" stroke="${PAL.kamienJ}" stroke-width="1.2" opacity="0.7" fill="none"/>`;

  // dach: płaszczyzna frontowa (od okapu do kalenicy) + szczyt z boku
  const ok = okap;
  const e1 = [x - ok, top + 2];
  const e2 = [x + w + ok * 0.4, top + 2];
  const r1 = [x - ok + gx * 0.5, top - dachH - gy * 0.5];
  const r2 = [x + w + gx * 0.5 + ok * 0.4, top - dachH - gy * 0.5];
  const dachF = sciezka([e1, e2, r2, r1]);
  const szczyt = sciezka([
    [x + w + ok * 0.4, top + 2],
    r2,
    [x + w + gx + ok * 0.6, top - gy + 2],
  ]);
  const kolD =
    kolorDachu ?? (dach === 'strzecha' ? PAL.strzecha : dach === 'lupek' ? PAL.lupek : dach === 'deski' ? PAL.drewno : PAL.dach);
  const kolDC = mix(kolD, '#1a0d05', 0.45);
  const kolDJ = mix(kolD, '#fff3d0', 0.35);
  // szczyt boczny (trójkąt pod dachem, ściana)
  svg += wypelnij(
    sciezka([
      [x + w, top],
      [x + w + gx * 0.5, top - dachH * 0.92 - gy * 0.5],
      [x + w + gx, top - gy],
    ]),
    kolSC,
    sciana === 'kamien' ? murKamienny(x + w, top - dachH - gy, gx, dachH + gy, { blok: 8, ziarno: z + 7 }) : deskiPion(x + w, top - dachH - gy, gx, dachH + gy, { szer: 6 }),
    { swiatlo: null }
  );
  let faktD = '';
  const bx = Math.min(e1[0], r1[0]);
  const by = r1[1];
  const bw = r2[0] - bx + ok;
  const bh = e1[1] - r1[1];
  if (dach === 'strzecha') faktD = strzecha(bx, by, bw, bh, { ziarno: z + 2 });
  else if (dach === 'deski') faktD = deskiPion(bx, by, bw, bh, { szer: 7 });
  else faktD = dachowka(bx, by, bw, bh, { kolorC: kolDC, jasny: kolDJ });
  svg += wypelnij(dachF, kolD, faktD, { swiatlo: 'swiatloG' });
  // brzeg szczytu (deska wiatrowa) na boku
  svg += `<path d="M${f(r2[0])} ${f(r2[1])} L${f(x + w + gx + ok * 0.6)} ${f(top - gy + 2)}" stroke="${kolDC}" stroke-width="4" stroke-linecap="round"/>`;
  svg += `<path d="M${f(r2[0])} ${f(r2[1])} L${f(x + w + gx + ok * 0.6)} ${f(top - gy + 2)}" stroke="${kolDJ}" stroke-width="1.2" opacity="0.5"/>`;
  // okap: ciemny pasek i jasna krawędź
  svg += `<path d="M${f(e1[0])} ${f(e1[1])} L${f(e2[0])} ${f(e2[1])}" stroke="${kolDC}" stroke-width="3.5" stroke-linecap="round"/>`;
  // kalenica
  svg += `<path d="M${f(r1[0])} ${f(r1[1])} L${f(r2[0])} ${f(r2[1])}" stroke="${kolDJ}" stroke-width="3" stroke-linecap="round"/>`;
  svg += `<path d="M${f(r1[0])} ${f(r1[1] + 2)} L${f(r2[0])} ${f(r2[1] + 2)}" stroke="${kolDC}" stroke-width="1.2" opacity="0.6"/>`;
  void szczyt;
  return { svg, top, gx, gy, kalenica: [r1, r2], frontX: x, frontW: w };
}

/** Pojedyncze drzewo liściaste (korona z kilku kęp, światło z lewej). */
export function drzewo(cx, y, s = 1, { ziarno: z = 1, kolor = 'lis' } = {}) {
  const r = los(z);
  const J = PAL[kolor + 'J'];
  const M = PAL[kolor];
  const C = PAL[kolor + 'C'];
  let svg = `<path d="M${f(cx - 3 * s)} ${f(y)} L${f(cx - 2 * s)} ${f(y - 22 * s)} L${f(cx + 2 * s)} ${f(y - 22 * s)} L${f(cx + 3.5 * s)} ${f(y)} Z" fill="${PAL.drewnoC}"/>`;
  const kepy = [];
  for (let i = 0; i < 7; i++) {
    const a = (i / 7) * Math.PI * 2;
    kepy.push([cx + Math.cos(a) * 11 * s * (0.7 + r() * 0.4), y - 32 * s + Math.sin(a) * 9 * s, (9 + r() * 4) * s]);
  }
  kepy.push([cx, y - 34 * s, 13 * s]);
  for (const [kx, ky, kr] of kepy) svg += `<circle cx="${f(kx + 1.5)}" cy="${f(ky + 2)}" r="${f(kr)}" fill="${C}"/>`;
  for (const [kx, ky, kr] of kepy) svg += `<circle cx="${f(kx)}" cy="${f(ky)}" r="${f(kr * 0.92)}" fill="${M}"/>`;
  for (const [kx, ky, kr] of kepy) svg += `<circle cx="${f(kx - kr * 0.3)}" cy="${f(ky - kr * 0.35)}" r="${f(kr * 0.5)}" fill="${J}" opacity="0.8"/>`;
  return svg;
}

/** Krzaczek/kępa przy podstawie budowli. */
export function krzaczek(cx, y, s = 1, { ziarno: z = 1 } = {}) {
  const r = los(z);
  let svg = '';
  const n = 4;
  const kepy = [];
  for (let i = 0; i < n; i++) kepy.push([cx + (i - (n - 1) / 2) * 5 * s + (r() - 0.5) * 3, y - 4 * s - r() * 3 * s, (4 + r() * 2.5) * s]);
  for (const [kx, ky, kr] of kepy) svg += `<circle cx="${f(kx + 1)}" cy="${f(ky + 1.5)}" r="${f(kr)}" fill="${PAL.lisCC}"/>`;
  for (const [kx, ky, kr] of kepy) svg += `<circle cx="${f(kx)}" cy="${f(ky)}" r="${f(kr * 0.9)}" fill="${PAL.lis}"/>`;
  for (const [kx, ky, kr] of kepy) svg += `<circle cx="${f(kx - kr * 0.3)}" cy="${f(ky - kr * 0.35)}" r="${f(kr * 0.45)}" fill="${PAL.lisJ}" opacity="0.8"/>`;
  return svg;
}

/** Płaski placek wydeptanej ziemi pod budowlą (łączy ją z trawą). */
export function placek(cx, cy, rx, ry, { kolor = PAL.ziemia, krycie = 0.55 } = {}) {
  return `<!--grunt--><g filter="url(#plama)"><ellipse cx="${f(cx)}" cy="${f(cy)}" rx="${f(rx)}" ry="${f(ry)}" fill="${kolor}" opacity="${krycie}"/>
  <ellipse cx="${f(cx - rx * 0.1)}" cy="${f(cy - ry * 0.1)}" rx="${f(rx * 0.75)}" ry="${f(ry * 0.7)}" fill="${PAL.ziemiaJ}" opacity="${krycie * 0.5}"/></g><!--/grunt-->`;
}

/**
 * Składa pełny dokument SVG obiektu o wymiarach w polach.
 *
 * Cień rzucany liczy się SAM z sylwetki: cała treść jeszcze raz, zaczerniona
 * i położona na ziemi transformacją — punkt na wysokości h nad ziemią ląduje
 * o `SKOS`·h w prawo i `UNIES`·h w górę. Jedno światło (z lewej góry) dla
 * wszystkich obiektów, więc cienie z definicji są spójne. Płótno ma po bokach
 * zapas (`pad` pól), żeby cień nie był ucięty; obiekt zostaje na środku.
 */
export const SKOS = 0.42;
export const UNIES = 0.24;
export function svgObiektu(szerPol, wysPol, tresc, { pad: padZadany, cien = 0.62 } = {}) {
  // Zapas na cień: tyle, ile wysoki obiekt rzuca w prawo (symetrycznie, żeby środek został środkiem).
  const pad = padZadany ?? Math.ceil((SKOS * wysPol + 0.1) * 10) / 10;
  // Grunt (placki ziemi) idzie pod spód i nie rzuca cienia.
  const grunt = (tresc.match(/<!--grunt-->[\s\S]*?<!--\/grunt-->/g) ?? []).join('');
  const reszta = tresc.replace(/<!--grunt-->[\s\S]*?<!--\/grunt-->/g, '');
  const W = Math.round((szerPol + 2 * pad) * P);
  const H = Math.round(wysPol * P);
  const dx = Math.round(pad * P);
  const y0 = H;
  const mac = (g) => `matrix(1 0 ${-SKOS} ${UNIES} ${f(SKOS * g)} ${f(g * (1 - UNIES))})`;
  // Części stojące głębiej (`naZiemi`) rzucają cień od własnej linii gruntu.
  const ZIEMIA = /<!--z:([\d.]+)-->([\s\S]*?)<!--\/z-->/g;
  const glebiej = [...reszta.matchAll(ZIEMIA)].map(([, g, t]) => `<g transform="${mac(Number(g))}">${t}</g>`).join('');
  const przod = reszta.replace(ZIEMIA, '');
  return {
    W,
    H,
    svg: `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}"><defs>${defsWspolne()}
  <filter id="cienBryly" x="-10%" y="-10%" width="120%" height="120%">
    <feFlood flood-color="#0d1806" flood-opacity="${cien}"/>
    <feComposite in2="SourceAlpha" operator="in"/>
    <feGaussianBlur stdDeviation="1"/>
  </filter></defs>
  <g transform="translate(${dx},0)">${grunt}<g filter="url(#cienBryly)">${glebiej}<g transform="${mac(y0)}">${przod}</g></g>${reszta}</g></svg>`,
  };
}
