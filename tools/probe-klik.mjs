// Czy KLIKNIĘCIE prowadzi bohatera dokładnie tam, gdzie się kliknęło.
//
// Po co osobna sonda, skoro `probe-przygoda.mjs` przechodzi całą pętlę:
// tamta sonda przestawiała bohatera obok celu i wołała `idz()` wprost.
// Sprawdzała więc wszystko OPRÓCZ jednej rzeczy — przeliczenia punktu
// z ekranu na pole planszy. A to właśnie ono się zepsuło: bohater lądował
// o pole obok celu i żadnego surowca nie dało się podnieść.
//
// Wniosek na przyszłość: jeśli sonda omija drogę, którą naprawdę idzie gracz,
// to nie sprawdza gry, tylko własne skróty.
//
//   node tools/probe-klik.mjs [--url http://localhost:4173]

import { chromium } from 'playwright';

const arg = (n, d) => {
  const i = process.argv.indexOf(n);
  return i !== -1 ? process.argv[i + 1] : d;
};
const BASE = arg('--url', 'http://localhost:4173');

let bledy = 0;
const sprawdz = (co, ok, szczegol = '') => {
  if (!ok) bledy++;
  console.log(`  ${ok ? 'OK  ' : 'ŹLE '} ${co}${szczegol ? ` — ${szczegol}` : ''}`);
};

const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
const page = await browser.newPage({ viewport: { width: 1000, height: 760 } });
page.on('pageerror', (e) => {
  bledy++;
  console.log('  BŁĄD JS —', String(e));
});

await page.goto(`${BASE}/?ekran=mapa`, { waitUntil: 'domcontentloaded' });
await page.waitForFunction(
  () => window.__game?.scene.getScene('adventure')?.sys.settings.status === 5,
  null,
  { timeout: 30000 }
);
await page.waitForTimeout(900);

const plotno = await page.locator('canvas').boundingBox();

/** Gdzie na ekranie leży ŚRODEK danego pola — liczone przez samą scenę. */
const naEkranie = (x, y) =>
  page.evaluate(
    ([px, py]) => {
      const s = window.__game.scene.getScene('adventure');
      return {
        x: px * 48 + 24 - s.kamera.scrollX + s.mapaX,
        y: py * 48 + 24 - s.kamera.scrollY + s.mapaY,
      };
    },
    [x, y]
  );

const klik = async (x, y) => {
  const p = await naEkranie(x, y);
  await page.mouse.click(plotno.x + p.x, plotno.y + p.y);
};

console.log('\n=== klik prowadzi tam, gdzie się kliknęło ===');

// Cel wybieramy blisko bohatera i na pustym, przejezdnym polu.
const cel = await page.evaluate(() => {
  const s = window.__game.scene.getScene('adventure');
  const b = s.stan.bohater;
  for (const [dx, dy] of [
    [2, 0],
    [0, 2],
    [2, 2],
    [-2, 0],
    [0, -2],
    [3, 1],
  ]) {
    const x = b.x + dx;
    const y = b.y + dy;
    if (s.trasaDo(x, y)?.length) return { x, y, bohater: { x: b.x, y: b.y } };
  }
  return null;
});

if (!cel) {
  console.log('  nie znaleziono celu w pobliżu — sprawdzenie pominięte');
} else {
  await klik(cel.x, cel.y);
  await page.waitForTimeout(250);
  const podglad = await page.evaluate(() => {
    const s = window.__game.scene.getScene('adventure');
    const t = s.trasaBiezaca;
    return t && t.length ? t[t.length - 1] : null;
  });
  sprawdz(
    `pierwszy klik wyznacza trasę DO klikniętego pola (${cel.x},${cel.y})`,
    !!podglad && podglad.x === cel.x && podglad.y === cel.y,
    podglad ? `trasa kończy się na (${podglad.x},${podglad.y})` : 'brak trasy'
  );

  await klik(cel.x, cel.y);
  await page.waitForTimeout(2200);
  const po = await page.evaluate(() => {
    const s = window.__game.scene.getScene('adventure');
    return { x: s.stan.bohater.x, y: s.stan.bohater.y };
  });
  sprawdz(
    'drugi klik doprowadza bohatera dokładnie na to pole',
    po.x === cel.x && po.y === cel.y,
    `bohater stoi na (${po.x},${po.y}), cel był (${cel.x},${cel.y})`
  );
}

console.log('\n=== klik w RYSUNEK obiektu go podnosi ===');
const surowiec = await page.evaluate(() => {
  const s = window.__game.scene.getScene('adventure');
  // Stawiamy bohatera dwa pola obok najbliższego stosu, żeby dojście było krótkie.
  const o = s.stan.obiekty
    .filter((x) => x.rodzaj === 'surowiec' && !x.zebrany)
    .sort(
      (a, b) =>
        Math.hypot(a.x - s.stan.bohater.x, a.y - s.stan.bohater.y) -
        Math.hypot(b.x - s.stan.bohater.x, b.y - s.stan.bohater.y)
    )[0];
  s.stan.bohater.x = o.x - 2;
  s.stan.bohater.y = o.y;
  s.stan.bohater.ruch = 2000;
  s.bohaterObj.setPosition(s.stan.bohater.x * 48 + 24, s.stan.bohater.y * 48 + 24);
  s.wysrodkujNaBohaterze(false);
  window.__cel = o;
  return { x: o.x, y: o.y, id: o.id, nazwa: o.nazwa, surowiec: o.surowiec, przed: s.stan.skarbiec[o.surowiec] };
});
await page.waitForTimeout(300);
// KLIKAMY W RYSUNEK, nie w środek pola. To jest cała różnica: rysunek stoi
// wyżej niż pole, więc gracz celujący w to, co widzi, trafiał obok.
const wRysunek = async () => {
  const p = await page.evaluate(() => {
    const s = window.__game.scene.getScene('adventure');
    const kont = s.ikonyObiektow[window.__cel.id];
    const im = kont.list.find((o) => o.type === 'Image');
    const b = im.getBounds();
    return {
      x: b.centerX - s.kamera.scrollX + s.mapaX,
      y: b.centerY - s.kamera.scrollY + s.mapaY,
    };
  });
  await page.mouse.click(plotno.x + p.x, plotno.y + p.y);
};
await wRysunek();
await page.waitForTimeout(250);
await wRysunek();
await page.waitForTimeout(2200);
const poSurowcu = await page.evaluate(() => {
  const s = window.__game.scene.getScene('adventure');
  const o = window.__cel;
  return {
    bohater: { x: s.stan.bohater.x, y: s.stan.bohater.y },
    zebrany: !!o.zebrany,
    teraz: s.stan.skarbiec[o.surowiec],
  };
});
sprawdz(
  `bohater dochodzi na pole surowca (${surowiec.nazwa})`,
  poSurowcu.bohater.x === surowiec.x && poSurowcu.bohater.y === surowiec.y,
  `stoi na (${poSurowcu.bohater.x},${poSurowcu.bohater.y}), surowiec na (${surowiec.x},${surowiec.y})`
);
sprawdz('surowiec zostaje podniesiony', poSurowcu.zebrany === true);
sprawdz(
  'skarbiec rośnie',
  poSurowcu.teraz > surowiec.przed,
  `${surowiec.przed} → ${poSurowcu.teraz}`
);

console.log('\n=== klik w wysoki rysunek (zamek) celuje w jego pole ===');
const zamek = await page.evaluate(() => {
  const s = window.__game.scene.getScene('adventure');
  const z = s.stan.obiekty.find((o) => o.rodzaj === 'zamek' && o.nasz);
  s.stan.bohater.x = z.x - 2;
  s.stan.bohater.y = z.y;
  s.stan.bohater.ruch = 2000;
  s.bohaterObj.setPosition(s.stan.bohater.x * 48 + 24, s.stan.bohater.y * 48 + 24);
  s.trasaBiezaca = null;
  s.wysrodkujNaBohaterze(false);
  window.__cel = z;
  return { x: z.x, y: z.y, nazwa: z.nazwa };
});
await page.waitForTimeout(300);
const naWierzcholek = async () => {
  const p = await page.evaluate(() => {
    const s = window.__game.scene.getScene('adventure');
    const kont = s.ikonyObiektow[window.__cel.id];
    const im = kont.list.find((o) => o.type === 'Image');
    const b = im.getBounds();
    // Celowo w GÓRNĄ część rysunku — tam, gdzie zamek wystaje ponad swoje pole.
    return {
      x: b.centerX - s.kamera.scrollX + s.mapaX,
      y: b.top + b.height * 0.25 - s.kamera.scrollY + s.mapaY,
    };
  });
  await page.mouse.click(plotno.x + p.x, plotno.y + p.y);
};
await naWierzcholek();
await page.waitForTimeout(250);
const trasaDoZamku = await page.evaluate(() => {
  const s = window.__game.scene.getScene('adventure');
  const t = s.trasaBiezaca;
  return t && t.length ? t[t.length - 1] : null;
});
sprawdz(
  `klik w wieżę zamku (${zamek.nazwa}) celuje w jego pole`,
  !!trasaDoZamku && trasaDoZamku.x === zamek.x && trasaDoZamku.y === zamek.y,
  trasaDoZamku ? `(${trasaDoZamku.x},${trasaDoZamku.y}) wobec (${zamek.x},${zamek.y})` : 'brak trasy'
);

await page.locator('canvas').screenshot({ path: 'tools/shots/mapa-klik.png' });
console.log(`\n${bledy === 0 ? 'Wszystko się zgadza.' : `Błędów: ${bledy}`}`);
await browser.close();
process.exit(bledy === 0 ? 0 : 1);
