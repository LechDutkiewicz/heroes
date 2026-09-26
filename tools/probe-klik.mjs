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

/**
 * Gdzie na ekranie leży ŚRODEK danego pola. Liczone macierzą, którą kamera
 * planszy NAPRAWDĘ rysuje (`matrixCombined`: róg ramy, zoom, przewinięcie),
 * a nie wzorem sceny — pole ma w świecie 48 px, a na ekranie tyle, ile da
 * zoom kamery (32 px), i sonda nie może tego zakładać na sztywno.
 */
const naEkranie = (x, y) =>
  page.evaluate(
    ([px, py]) => {
      const s = window.__game.scene.getScene('adventure');
      const e = s.kamera.matrixCombined.transformPoint(px * 48 + 24, py * 48 + 24, { x: 0, y: 0 });
      return { x: e.x, y: e.y };
    },
    [x, y]
  );

/**
 * Odsuwa kursor na środek ramy mapy.
 *
 * Konieczne po KAŻDYM kliknięciu. Kursor przy krawędzi przewija mapę tak długo,
 * jak tam stoi, więc współrzędne policzone chwilę wcześniej przestają pasować
 * i sonda klika o pole obok — raz przechodziła, raz nie. To nie jest usterka
 * gry, tylko pułapka mierzenia: pomiar i klik muszą się odbyć przy nieruchomym
 * widoku.
 */
const odsunKursor = async () => {
  await page.mouse.move(plotno.x + 340, plotno.y + 330);
  await page.waitForTimeout(120);
};

const klik = async (x, y) => {
  const p = await naEkranie(x, y);
  await page.mouse.click(plotno.x + p.x, plotno.y + p.y);
  await odsunKursor();
};

// --- przeliczenie ekran ↔ pole zgadza się z tym, co NAPRAWDĘ narysowano ---
//
// To jest asercja, której brakowało i dlatego usterka przeżyła kilka rund
// poprawek. Reszta sondy liczyła położenie pola tym samym wzorem, którego
// używa `zEkranu` — więc sprawdzała wzór sam ze sobą i przechodziła nawet
// wtedy, gdy plansza była rysowana gdzie indziej. Tak właśnie było: kontener
// świata stał przesunięty o (8, 44) względem kamery, czyli o prawie całe pole
// w pionie, i klik trafiał rząd niżej.
//
// Punkt odniesienia bierzemy więc z NARYSOWANEJ planszy, a nie ze wzoru.
console.log('\n=== ekran ↔ pole zgadza się z rysunkiem ===');
const zgodnosc = await page.evaluate(() => {
  const s = window.__game.scene.getScene('adventure');
  // Lewy górny róg tła planszy tak, jak leży na scenie.
  const rog = s.plansza.getBounds();
  // Bok pola w świecie wynika z narysowanego tła: plansza ma `szer` pól.
  const bok = rog.width / s.stan.szer;
  const m = s.kamera.matrixCombined;
  const zle = [];
  for (const [px, py] of [[3, 3], [12, 20], [30, 31], [17, 8]]) {
    const e = m.transformPoint(rog.x + (px + 0.5) * bok, rog.y + (py + 0.5) * bok, { x: 0, y: 0 });
    const pole = s.zEkranu(e.x, e.y);
    if (pole.x !== px || pole.y !== py) zle.push(`${px},${py} → ${pole.x},${pole.y}`);
  }
  // Ile pikseli EKRANU ma narysowane pole — ma być 32, jak w Heroes 3.
  const a = m.transformPoint(rog.x, rog.y, { x: 0, y: 0 });
  const b = m.transformPoint(rog.x + bok, rog.y + bok, { x: 0, y: 0 });
  return { zle, poleNaEkranie: [b.x - a.x, b.y - a.y] };
});
sprawdz(
  'środek narysowanego pola wraca jako to samo pole',
  zgodnosc.zle.length === 0,
  zgodnosc.zle.join('; ')
);
sprawdz(
  'pole mapy ma na ekranie 32 × 32 px',
  zgodnosc.poleNaEkranie.every((v) => Math.abs(v - 32) < 0.01),
  zgodnosc.poleNaEkranie.map((v) => v.toFixed(2)).join(' × ')
);

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
    const e = s.kamera.matrixCombined.transformPoint(b.centerX, b.centerY, { x: 0, y: 0 });
    return { x: e.x, y: e.y };
  });
  await page.mouse.click(plotno.x + p.x, plotno.y + p.y);
  await odsunKursor();
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
// Bohater ma stanąć OBOK, nie na stosie. Rzeczy leżące podnosi się
// z sąsiedniego pola — patrz `Z_SASIEDNIEGO_POLA` w `src/data/mapa.ts`. Poprzednia
// wersja tego sprawdzenia wymagała wejścia na pole i po zmianie zasady
// zgłaszała usterkę tam, gdzie zmieniła się reguła gry.
sprawdz(
  `bohater podchodzi pod surowiec (${surowiec.nazwa})`,
  Math.max(
    Math.abs(poSurowcu.bohater.x - surowiec.x),
    Math.abs(poSurowcu.bohater.y - surowiec.y)
  ) === 1,
  `stoi na (${poSurowcu.bohater.x},${poSurowcu.bohater.y}), surowiec na (${surowiec.x},${surowiec.y})`
);
sprawdz('surowiec zostaje podniesiony', poSurowcu.zebrany === true);
sprawdz(
  'skarbiec rośnie',
  poSurowcu.teraz > surowiec.przed,
  `${surowiec.przed} → ${poSurowcu.teraz}`
);

console.log('\n=== zamek: brama prowadzi bohatera ===');
const zamek = await page.evaluate(() => {
  const s = window.__game.scene.getScene('adventure');
  const z = s.stan.obiekty.find((o) => o.rodzaj === 'zamek' && o.wlasciciel === 'gracz');
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
// W Heroes 3 zamek zajmuje kilka pól: wejściem wchodzi się bohaterem, a klik
// w resztę bryły otwiera ekran miasta. Oba zachowania są potrzebne naraz —
// werbunek dokłada stworki do armii BOHATERA, więc bez wejścia nie da się
// werbować, a bez otwierania z mapy każde dobudowanie kosztuje kilka tur marszu.
//
// Celujemy w ŚRODEK pola bramy, a nie w ułamek wysokości rysunku. Poprzednia
// wersja mierzyła od górnej krawędzi sprite'a i przestała trafiać, gdy zamek
// urósł — a to nie jest zmiana zachowania, tylko rozmiaru grafiki. Test ma
// pytać o zasadę, nie o proporcje obrazka.
const naBrame = await page.evaluate(() => {
  const s = window.__game.scene.getScene('adventure');
  const c = s.naEkran(window.__cel.x, window.__cel.y);
  const e = s.kamera.matrixCombined.transformPoint(c.x, c.y, { x: 0, y: 0 });
  return { x: e.x, y: e.y };
});
await page.mouse.click(plotno.x + naBrame.x, plotno.y + naBrame.y);
await odsunKursor();
await page.waitForTimeout(250);
const trasaDoZamku = await page.evaluate(() => {
  const s = window.__game.scene.getScene('adventure');
  const t = s.trasaBiezaca;
  return t && t.length ? t[t.length - 1] : null;
});
sprawdz(
  `klik w bramę zamku (${zamek.nazwa}) wyznacza trasę do jego pola`,
  !!trasaDoZamku && trasaDoZamku.x === zamek.x && trasaDoZamku.y === zamek.y,
  trasaDoZamku ? `(${trasaDoZamku.x},${trasaDoZamku.y}) wobec (${zamek.x},${zamek.y})` : 'brak trasy'
);
sprawdz(
  'klik w bramę NIE otwiera miasta',
  !(await page.evaluate(() => window.__game.scene.isActive('zamek')))
);

console.log('\n=== zamek: mury ===');
const wMury = await page.evaluate(() => {
  const s = window.__game.scene.getScene('adventure');
  const z = window.__cel;
  // Pole nad bramą to mur — należy do bryły zamku i jest nieprzejezdne.
  const c = s.naEkran(z.x, z.y - 1);
  const e = s.kamera.matrixCombined.transformPoint(c.x, c.y, { x: 0, y: 0 });
  return { x: e.x, y: e.y };
});
await page.mouse.click(plotno.x + wMury.x, plotno.y + wMury.y);
await odsunKursor();
await page.waitForTimeout(600);
sprawdz(
  'klik w mury zamku otwiera ekran miasta',
  await page.evaluate(() => window.__game.scene.isActive('zamek'))
);

// Miasto otwarte z mapy, bez bohatera w zamku: werbunek idzie wtedy do
// garnizonu (jak w Heroes 3), a nie do bohatera na drugim końcu mapy —
// sprawdza to `tools/probe-armia.mjs`. Tu tylko: scena wie, że bohatera nie ma.
sprawdz(
  'miasto otwarte z mapy wie, że bohatera nie ma w zamku',
  await page.evaluate(() => {
    const t = window.__game.scene.getScene('zamek');
    return t.bohaterObecny === false;
  })
);

await page.evaluate(() => window.__game.scene.getScene('zamek').scene.start('adventure'));
await page.waitForFunction(() => window.__game.scene.isActive('adventure'));
await page.waitForTimeout(500);

// --- przewijanie kursorem przy krawędzi ---
console.log('\n=== przewijanie kursorem przy krawędzi ===');
const przewiniecie = await page.evaluate(() => {
  const s = window.__game.scene.getScene('adventure');
  s.przewin(-500, -500, false);
  return s.przewX;
});
// Kursor przy samym lewym brzegu płótna (pas 8 px, jak w HoMM3 — nie przy
// ramie mapy) i po zwłoce ~300 ms widok ma pojechać.
await page.mouse.move(plotno.x + 3, plotno.y + 300);
await page.waitForTimeout(1000);
const poPrzewinieciu = await page.evaluate(
  () => window.__game.scene.getScene('adventure').przewX
);
sprawdz(
  'kursor przy krawędzi przewija mapę bez ruszania bohaterem',
  poPrzewinieciu > przewiniecie,
  `${Math.round(przewiniecie)} → ${Math.round(poPrzewinieciu)}`
);

// --- granice przewijania przy oddalonej kamerze ---
// Kamera widzi `rama / zoom` pikseli świata, więc granica przewijania też
// musi być liczona z zoomu. Z wzorem „na 48 px" mapa albo nie dojeżdżała
// do brzegu, albo wyjeżdżała za niego i pokazywała czerń.
console.log('\n=== granice przewijania przy oddalonej kamerze ===');
await odsunKursor();
const granice = await page.evaluate(async () => {
  const s = window.__game.scene.getScene('adventure');
  const klatka = () => new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));
  const k = s.kamera;
  const rama = { l: k.x, g: k.y, p: k.x + k.width, d: k.y + k.height };
  s.przewin(-1e6, -1e6, false);
  await klatka();
  const prawyDolny = k.matrixCombined.transformPoint(s.mapaW, s.mapaH, { x: 0, y: 0 });
  s.przewin(1e6, 1e6, false);
  await klatka();
  const lewyGorny = k.matrixCombined.transformPoint(0, 0, { x: 0, y: 0 });
  s.wysrodkujNaBohaterze(false);
  await klatka();
  return { rama, prawyDolny, lewyGorny };
});
const blisko = (a, b) => Math.abs(a - b) < 0.5;
sprawdz(
  'przewinięta do końca plansza kończy się równo z prawym dolnym rogiem ramy',
  blisko(granice.prawyDolny.x, granice.rama.p) && blisko(granice.prawyDolny.y, granice.rama.d),
  `róg planszy (${granice.prawyDolny.x.toFixed(1)}, ${granice.prawyDolny.y.toFixed(1)}), róg ramy (${granice.rama.p}, ${granice.rama.d})`
);
sprawdz(
  'przewinięta do początku plansza zaczyna się równo z lewym górnym rogiem ramy',
  blisko(granice.lewyGorny.x, granice.rama.l) && blisko(granice.lewyGorny.y, granice.rama.g),
  `róg planszy (${granice.lewyGorny.x.toFixed(1)}, ${granice.lewyGorny.y.toFixed(1)}), róg ramy (${granice.rama.l}, ${granice.rama.g})`
);

await page.locator('canvas').screenshot({ path: 'tools/shots/mapa-klik.png' });
console.log(`\n${bledy === 0 ? 'Wszystko się zgadza.' : `Błędów: ${bledy}`}`);
await browser.close();
process.exit(bledy === 0 ? 0 : 1);
