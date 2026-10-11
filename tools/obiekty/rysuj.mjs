// Renderuje komplet obiektów mapy rysowanych kodem (SVG → PNG w Chromium).
//
//   node tools/obiekty/rysuj.mjs [nazwa…] [--podglad]
//
// Wynik: `public/mapa/polana/<nazwa>.png` i `src/data/obiekty-rysowane.ts`
// (lista nazw i wysokości w polach — scena wczytuje je zamiast starych
// rysunków, tylko na planszy z zestawem `polana`). `--podglad` składa też
// arkusz wszystkich obiektów na tle planszy w skali gry (32 px na pole):
// `tools/shots/obiekty-arkusz.png`.

import { chromium } from 'playwright';
import { writeFile, mkdir } from 'node:fs/promises';
import { OBIEKTY } from './index.mjs';
import { P } from './pedzel.mjs';

const ZESTAW = 'polana';
const OUT = `public/mapa/${ZESTAW}`;
const argi = process.argv.slice(2).filter((a) => !a.startsWith('--'));
const PODGLAD = process.argv.includes('--podglad');

const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
const page = await browser.newPage({ deviceScaleFactor: 1 });
await mkdir(OUT, { recursive: true });

const wybrane = argi.length ? argi : Object.keys(OBIEKTY);
for (const nazwa of wybrane) {
  const def = OBIEKTY[nazwa];
  if (!def) throw new Error(`nie ma obiektu ${nazwa}`);
  const { W, H, svg } = def.rysuj();
  await page.setViewportSize({ width: W, height: H });
  await page.setContent(`<html><body style="margin:0;background:transparent">${svg}</body></html>`);
  await page.screenshot({ path: `${OUT}/${nazwa}.png`, omitBackground: true, clip: { x: 0, y: 0, width: W, height: H } });
  console.log(`${nazwa}: ${W}×${H}`);
}

// Moduł dla sceny: nazwy i wysokości rysunków w polach (wysokość płótna / P).
const wpisy = Object.entries(OBIEKTY)
  .filter(([, d]) => !d.tlo)
  .map(([n, d]) => {
    const { H } = d.rysuj();
    return `  '${n}': ${Math.round((H / P) * 1000) / 1000},`;
  })
  .join('\n');
await writeFile(
  'src/data/obiekty-rysowane.ts',
  `// Generowany przez tools/obiekty/rysuj.mjs — nie edytować ręcznie.
// Obiekty mapy rysowane kodem (bez OpenAI): zestaw klimatu → nazwa sprite'u
// \`m-<nazwa>\` → wysokość rysunku w polach. Plansza z tym zestawem wczytuje
// \`public/mapa/<zestaw>/<nazwa>.png\` zamiast starego rysunku i stawia go
// w tej wysokości (płótno ma dokładnie tyle pól, ile zajmuje obiekt).
export const OBIEKTY_RYSOWANE: Record<string, Record<string, number>> = {
  '${ZESTAW}': {
${wpisy}
  },
};
`
);

if (PODGLAD) {
  // Arkusz: każdy obiekt na wycinku prawdziwego tła, w skali gry, z siatką pól.
  const pliki = Object.keys(OBIEKTY);
  const html = `<html><body style="margin:0;background:#222">
  <div style="display:flex;flex-wrap:wrap;gap:6px;padding:6px;width:1180px">
  ${pliki
    .map((n) => {
      const { W, H } = OBIEKTY[n].rysuj();
      const w = (W / P) * 32;
      const h = (H / P) * 32;
      const bw = Math.max(w + 64, 128);
      const bh = h + 48;
      return `<div style="position:relative;width:${bw}px;height:${bh}px;background:url(/plansza.jpg) -160px -930px / 1152px 1152px">
        <div style="position:absolute;inset:0;background-image:linear-gradient(#0002 1px,transparent 1px),linear-gradient(90deg,#0002 1px,transparent 1px);background-size:32px 32px"></div>
        <img src="/${n}.png" style="position:absolute;left:${(bw - w) / 2}px;top:${bh - 16 - h}px;width:${w}px;height:${h}px">
        <span style="position:absolute;left:2px;top:0;color:#fff;font:10px sans-serif;text-shadow:0 0 2px #000">${n}</span></div>`;
    })
    .join('')}
  </div></body></html>`;
  await page.route('**/*', async (r) => {
    const u = new URL(r.request().url());
    if (u.pathname === '/plansza.jpg') return r.fulfill({ path: `public/mapa/${ZESTAW}/plansza-0.jpg` });
    if (u.pathname.endsWith('.png')) return r.fulfill({ path: `${OUT}${u.pathname}` });
    return r.fulfill({ body: html, contentType: 'text/html' });
  });
  await page.setViewportSize({ width: 1200, height: 900 });
  await page.goto('http://podglad.local/');
  await page.waitForTimeout(300);
  await page.screenshot({ path: 'tools/shots/obiekty-arkusz.png', fullPage: true });
  console.log('arkusz: tools/shots/obiekty-arkusz.png');
}
await browser.close();
