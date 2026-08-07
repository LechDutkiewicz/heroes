// Składa ślepe porównanie: nasz zrzut i wzorzec obok siebie, podpisane
// tylko „A" i „B", w kolejności losowanej ziarnem.
//
// Po co: krytyk, który wie, który obraz jest nasz, ocenia łagodniej. Kolejność
// zapisujemy do pliku obok, żeby dało się ją odczytać PO wydaniu werdyktu.
//
//   node tools/blind.mjs --ours tools/shots/02-tura-gracza.png \
//                        --ref tools/reference/masters-05-en.jpg \
//                        --name plansza-r1

import { chromium } from 'playwright';
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { randomUUID } from 'node:crypto';

const arg = (n, d) => {
  const i = process.argv.indexOf(n);
  return i !== -1 ? process.argv[i + 1] : d;
};

const ours = arg('--ours');
const ref = arg('--ref');
const name = arg('--name', randomUUID().slice(0, 8));
const OUT = 'tools/blind';

const dataUri = async (p) => {
  const b = await readFile(p);
  const mime = p.endsWith('.png') ? 'image/png' : 'image/jpeg';
  return `data:${mime};base64,${b.toString('base64')}`;
};

const main = async () => {
  await mkdir(OUT, { recursive: true });

  // Rzut monetą decyduje, czy nasze jest po lewej. Bez tego krytyk szybko
  // zauważa, że „nasze zawsze jest pierwsze".
  const oursLeft = Math.random() < 0.5;
  const left = oursLeft ? ours : ref;
  const right = oursLeft ? ref : ours;

  const html = `<style>
    body { margin:0; background:#2b2b2b; font:600 26px "Trebuchet MS",sans-serif; color:#fff; }
    .row { display:flex; gap:0; align-items:flex-start; }
    .col { flex:1; display:flex; flex-direction:column; align-items:center; padding:18px; }
    .col + .col { border-left:3px solid #111; }
    img { max-width:100%; height:auto; display:block; }
    .tag { margin-bottom:14px; letter-spacing:.2em; }
  </style>
  <div class="row">
    <div class="col"><div class="tag">A</div><img src="${await dataUri(left)}"></div>
    <div class="col"><div class="tag">B</div><img src="${await dataUri(right)}"></div>
  </div>`;

  const browser = await chromium.launch({
    executablePath: process.env.CHROMIUM_PATH || '/opt/pw-browsers/chromium-1194/chrome-linux/chrome',
  });
  const page = await browser.newPage({ viewport: { width: 1600, height: 1200 } });
  await page.setContent(html);
  await page.waitForTimeout(500);
  await page.locator('.row').screenshot({ path: `${OUT}/${name}.png` });
  await browser.close();

  // Rozwiązanie ląduje osobno, żeby nie dało się go przeczytać przypadkiem
  // razem z obrazem.
  await writeFile(
    `${OUT}/${name}.klucz.json`,
    JSON.stringify({ A: oursLeft ? 'nasze' : 'wzorzec', B: oursLeft ? 'wzorzec' : 'nasze' }, null, 2)
  );
  console.log(`${OUT}/${name}.png  (klucz w ${OUT}/${name}.klucz.json)`);
};

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
