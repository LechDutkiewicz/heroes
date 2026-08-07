// Składa ślepe porównanie: nasz zrzut i wzorzec obok siebie, podpisane
// tylko „A" i „B", w kolejności losowanej ziarnem.
//
// Po co ślepo: krytyk, który wie, który obraz jest nasz, ocenia łagodniej.
// Kolejność zapisujemy obok, żeby dało się ją odczytać PO werdykcie.
//
// WAŻNE — oba kadry idą w rozdzielczości własnej, bez skalowania. Pierwsza
// wersja wpisywała je w równe kolumny i to fałszowało wynik: nasz zrzut ma
// 1732px szerokości, wzorzec 578, więc nasz był zmniejszany do 44%, a wzorzec
// powiększany do 132%. Fazka krawędzi o grubości 1,8px schodziła poniżej
// piksela i znikała, po czym krytyk słusznie pisał, że jej nie ma. Oceniamy
// rzemiosło, a to znaczy detal — detalu nie wolno zgubić po drodze.
//
// Kadruj oba obrazy do porównywalnego wycinka (kilka pól, nie cała plansza):
//
//   node tools/blind.mjs --ours tools/shots/10-sama-plansza.png --ourscrop 60,40,540,540 \
//                        --ref tools/reference/masters-05-en.jpg --refcrop 30,270,520,520 \
//                        --name plansza-r3

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

/** „x,y,szer,wys" → [x, y, szer, wys]; brak parametru znaczy cały obraz. */
const crop = (s) => (s ? s.split(',').map(Number) : null);
const oursCrop = crop(arg('--ourscrop'));
const refCrop = crop(arg('--refcrop'));

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
  const leftCrop = oursLeft ? oursCrop : refCrop;
  const rightCrop = oursLeft ? refCrop : oursCrop;

  /** Wycinek pokazujemy oknem o stałym rozmiarze i przesuniętym obrazem —
   *  bez skalowania, więc piksel obrazu to piksel wyniku. */
  const pane = (uri, crop) => {
    if (!crop) return `<img src="${uri}">`;
    const [x, y, w, h] = crop;
    return `<div class="win" style="width:${w}px;height:${h}px">
      <img src="${uri}" style="margin-left:${-x}px;margin-top:${-y}px">
    </div>`;
  };

  const html = `<style>
    body { margin:0; background:#2b2b2b; font:600 26px "Trebuchet MS",sans-serif; color:#fff; }
    .row { display:flex; align-items:flex-start; }
    .col { display:flex; flex-direction:column; align-items:center; padding:18px; }
    .col + .col { border-left:3px solid #111; }
    img { display:block; max-width:none; }
    .win { overflow:hidden; position:relative; }
    .tag { margin-bottom:14px; letter-spacing:.2em; }
  </style>
  <div class="row">
    <div class="col"><div class="tag">A</div>${pane(await dataUri(left), leftCrop)}</div>
    <div class="col"><div class="tag">B</div>${pane(await dataUri(right), rightCrop)}</div>
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
