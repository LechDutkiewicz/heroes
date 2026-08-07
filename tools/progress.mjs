// Buduje żywą stronę postępu: stan każdego kawałka, werdykt krytyka i
// zrzuty „przed / teraz" obok siebie.
//
// Miniatury robimy w przeglądarce (canvas), bo w obrazie nie ma ani PIL,
// ani ImageMagick, a wrzucanie pełnych plików 2x rozdęłoby stronę.
//
//   node tools/progress.mjs

import { chromium } from 'playwright';
import { readFile, writeFile, readdir } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import path from 'node:path';

const STATE = 'tools/progress.json';
const OUT = 'tools/progress.html';

/** Skaluje obraz do podanej szerokości i zwraca data URI w JPEG. */
async function thumbs(page, files, width) {
  const payload = [];
  for (const f of files) {
    if (!existsSync(f)) continue;
    payload.push({ name: f, b64: (await readFile(f)).toString('base64') });
  }
  return page.evaluate(
    async ({ payload, width }) => {
      const out = {};
      for (const { name, b64 } of payload) {
        const img = new Image();
        img.src = `data:image/png;base64,${b64}`;
        await img.decode();
        const scale = Math.min(1, width / img.width);
        const c = document.createElement('canvas');
        c.width = Math.round(img.width * scale);
        c.height = Math.round(img.height * scale);
        c.getContext('2d').drawImage(img, 0, 0, c.width, c.height);
        out[name] = c.toDataURL('image/jpeg', 0.82);
      }
      return out;
    },
    { payload, width }
  );
}

const esc = (s) =>
  String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);

const STATUS = {
  done: ['Wygrane na ślepo', 'win'],
  running: ['W pętli', 'run'],
  pending: ['Czeka', 'wait'],
};

const main = async () => {
  const state = JSON.parse(await readFile(STATE, 'utf8'));

  const browser = await chromium.launch({
    executablePath: process.env.CHROMIUM_PATH || '/opt/pw-browsers/chromium-1194/chrome-linux/chrome',
  });
  const page = await browser.newPage();
  await page.goto('about:blank');

  // Zbierz wszystkie obrazy, o które proszą kawałki.
  const wanted = new Set();
  for (const p of state.pieces) {
    for (const s of p.shots || []) {
      wanted.add(`tools/shots-baseline/${s}.png`);
      wanted.add(`tools/shots/${s}.png`);
    }
  }
  const refs = existsSync('tools/reference')
    ? (await readdir('tools/reference')).filter((f) => /\.(png|jpe?g)$/.test(f))
    : [];

  const imgs = await thumbs(page, [...wanted], 520);
  // Wzorzec jest w JPEG — wczytujemy go wprost, bez przeskalowania w canvasie.
  const refData = {};
  for (const r of refs.slice(0, 4)) {
    const b = await readFile(path.join('tools/reference', r));
    refData[r] = `data:image/jpeg;base64,${b.toString('base64')}`;
  }
  await browser.close();

  const doneCount = state.pieces.filter((p) => p.status === 'done').length;

  const cards = state.pieces
    .map((p) => {
      const [label, cls] = STATUS[p.status] || STATUS.pending;
      const shots = (p.shots || [])
        .map((s) => {
          const before = imgs[`tools/shots-baseline/${s}.png`];
          const after = imgs[`tools/shots/${s}.png`];
          if (!before && !after) return '';
          return `<figure class="pair">
            <div class="frame">${before ? `<img src="${before}" alt="przed: ${esc(s)}">` : '<div class="miss">brak</div>'}<figcaption>przed</figcaption></div>
            <div class="frame">${after ? `<img src="${after}" alt="teraz: ${esc(s)}">` : '<div class="miss">brak</div>'}<figcaption>teraz</figcaption></div>
          </figure>`;
        })
        .join('');

      const rounds = (p.rounds || [])
        .map(
          (r, i) => `<li><span class="rn">${i + 1}</span>
            <div><p class="verdict ${r.win ? 'w' : 'l'}">${r.win ? 'krytyk wybrał nasze' : 'krytyk wybrał wzorzec'}</p>
            <p class="gap">${esc(r.gap)}</p></div></li>`
        )
        .join('');

      return `<article class="piece">
        <header><h3>${esc(p.name)}</h3><span class="tag ${cls}">${label}</span></header>
        ${p.note ? `<p class="note">${esc(p.note)}</p>` : ''}
        ${rounds ? `<ol class="rounds">${rounds}</ol>` : ''}
        ${shots}
      </article>`;
    })
    .join('');

  const refGrid = Object.entries(refData)
    .map(([k, v]) => `<figure class="ref"><img src="${v}" alt="${esc(k)}"><figcaption>${esc(k)}</figcaption></figure>`)
    .join('');

  const html = `<title>Walka — pętla jakości</title>
<style>
  :root {
    --ground: #eef7fb; --panel: #ffffff; --edge: #cfe4ee;
    --ink: #123449; --soft: #4a7690;
    --sky: #1f7fb3; --gold: #d99a12; --coral: #d94a5a; --green: #2f9e5f;
    --shadow: 0 1px 2px rgba(18,52,73,.07), 0 6px 18px rgba(18,52,73,.06);
  }
  @media (prefers-color-scheme: dark) {
    :root:not([data-theme="light"]) {
      --ground: #0d1b24; --panel: #14262f; --edge: #24404e;
      --ink: #e6f2f7; --soft: #8fb0c0;
      --sky: #57c2ea; --gold: #ffc93c; --coral: #ff7d8a; --green: #58cf8c;
      --shadow: 0 1px 2px rgba(0,0,0,.3), 0 6px 18px rgba(0,0,0,.25);
    }
  }
  :root[data-theme="dark"] {
    --ground: #0d1b24; --panel: #14262f; --edge: #24404e;
    --ink: #e6f2f7; --soft: #8fb0c0;
    --sky: #57c2ea; --gold: #ffc93c; --coral: #ff7d8a; --green: #58cf8c;
    --shadow: 0 1px 2px rgba(0,0,0,.3), 0 6px 18px rgba(0,0,0,.25);
  }
  * { box-sizing: border-box; }
  body {
    margin: 0; background: var(--ground); color: var(--ink);
    font: 16px/1.6 "Trebuchet MS", Verdana, sans-serif;
    padding: 40px 20px 80px;
  }
  .wrap { max-width: 1080px; margin: 0 auto; display: flex; flex-direction: column; gap: 28px; }
  h1 { font-size: 34px; margin: 0; letter-spacing: -.01em; text-wrap: balance; }
  .lede { margin: 0; color: var(--soft); max-width: 62ch; }
  .bar { display: flex; align-items: center; gap: 14px; }
  .track { flex: 1; height: 10px; border-radius: 99px; background: var(--edge); overflow: hidden; }
  .fill { height: 100%; background: linear-gradient(90deg, var(--sky), var(--green)); border-radius: 99px; }
  .count { font-variant-numeric: tabular-nums; color: var(--soft); font-size: 14px; white-space: nowrap; }
  h2 { font-size: 13px; text-transform: uppercase; letter-spacing: .09em; color: var(--soft); margin: 0; }
  .piece {
    background: var(--panel); border: 1px solid var(--edge); border-radius: 14px;
    padding: 20px; box-shadow: var(--shadow); display: flex; flex-direction: column; gap: 14px;
  }
  .piece header { display: flex; align-items: center; gap: 12px; justify-content: space-between; }
  .piece h3 { margin: 0; font-size: 19px; }
  .tag { font-size: 12px; padding: 4px 11px; border-radius: 99px; font-weight: bold; white-space: nowrap; }
  .tag.win  { background: color-mix(in srgb, var(--green) 16%, transparent); color: var(--green); }
  .tag.run  { background: color-mix(in srgb, var(--gold) 20%, transparent); color: var(--gold); }
  .tag.wait { background: color-mix(in srgb, var(--soft) 14%, transparent); color: var(--soft); }
  .note { margin: 0; color: var(--soft); font-size: 15px; }
  .rounds { list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column; gap: 10px; }
  .rounds li { display: flex; gap: 12px; align-items: flex-start; }
  .rn {
    flex: none; width: 24px; height: 24px; border-radius: 99px; background: var(--edge);
    color: var(--ink); font-size: 13px; font-weight: bold; display: grid; place-items: center;
    font-variant-numeric: tabular-nums;
  }
  .verdict { margin: 0; font-size: 14px; font-weight: bold; }
  .verdict.w { color: var(--green); }
  .verdict.l { color: var(--coral); }
  .gap { margin: 2px 0 0; font-size: 14px; color: var(--soft); }
  .pair, .refs { display: grid; grid-template-columns: repeat(auto-fit, minmax(240px, 1fr)); gap: 12px; margin: 0; }
  .frame, .ref { margin: 0; display: flex; flex-direction: column; gap: 6px; }
  .frame img, .ref img {
    width: 100%; height: auto; display: block; border-radius: 9px;
    border: 1px solid var(--edge); background: var(--ground);
  }
  figcaption { font-size: 12px; color: var(--soft); text-transform: uppercase; letter-spacing: .07em; }
  .miss { display: grid; place-items: center; height: 130px; border-radius: 9px;
          border: 1px dashed var(--edge); color: var(--soft); font-size: 13px; }
  footer { color: var(--soft); font-size: 13px; border-top: 1px solid var(--edge); padding-top: 16px; }
</style>
<div class="wrap">
  <div>
    <h1>Walka — pętla jakości</h1>
    <p class="lede">Każdy kawałek walki jest budowany i osobno oceniany przez krytyka, który
    kładzie nasz zrzut obok wzorca bez etykiet. Kawałek jest zamknięty dopiero wtedy, gdy
    krytyk na ślepo wskaże nasz.</p>
  </div>

  <div class="bar">
    <div class="track"><div class="fill" style="width: ${Math.round((doneCount / state.pieces.length) * 100)}%"></div></div>
    <span class="count">${doneCount} z ${state.pieces.length} wygranych</span>
  </div>

  <section>
    <h2>Wzorzec</h2>
    <p class="lede" style="margin:8px 0 14px">Ekrany z Pokémon Masters EX — siatka Sync Grid dla pól,
    karta trenera dla paneli i typografii, rozbłysk ewolucji dla efektów trafienia.</p>
    <div class="refs">${refGrid}</div>
  </section>

  <section style="display:flex; flex-direction:column; gap:18px">
    <h2>Kawałki</h2>
    ${cards}
  </section>

  <footer>Odświeżone ${esc(state.updated)}</footer>
</div>`;

  await writeFile(OUT, html);
  console.log(`zapisano ${OUT} (${(html.length / 1e6).toFixed(1)} MB)`);
};

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
