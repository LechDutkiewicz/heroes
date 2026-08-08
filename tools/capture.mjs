// Zrzuty ekranu z działającej bitwy — materiał do porównań z wzorcem.
//
// Steruje sceną przez window.__game, więc każdy stan da się ustawić dokładnie
// i powtarzalnie, zamiast zgadywać klikaniem. Klatki animacji łapiemy zwalniając
// czas sceny, bo cios trwa 120 ms i inaczej trafilibyśmy w niego przypadkiem.
//
//   node tools/capture.mjs [--out tools/shots] [--url http://localhost:4173]

import { chromium } from 'playwright';
import { mkdir, readFile } from 'node:fs/promises';

const arg = (name, fallback) => {
  const i = process.argv.indexOf(name);
  return i !== -1 ? process.argv[i + 1] : fallback;
};

const OUT = arg('--out', 'tools/shots');
const BASE = arg('--url', 'http://localhost:4173');
const SEED = arg('--seed', '7');

/** Czeka, aż scena wystartuje i wczyta grafiki. */
async function ready(page) {
  await page.waitForFunction(() => {
    const g = window.__game;
    return g && g.scene.getScene('battle')?.sys.settings.status === 5;
  }, null, { timeout: 30000 });
  // Dwie klatki na dociągnięcie pierwszego renderu.
  await page.waitForTimeout(400);
}

/** Zrzut samego kanwasu gry, bez marginesów strony. */
async function shot(page, name) {
  const canvas = page.locator('canvas');
  await canvas.screenshot({ path: `${OUT}/${name}.png` });
  console.log(`  → ${name}.png`);
}

/** Uruchamia kod w kontekście sceny bitwy. */
const inScene = (page, fn, arg) =>
  page.evaluate(
    ({ src, arg }) => {
      const scene = window.__game.scene.getScene('battle');
      return new Function('scene', 'arg', `return (${src})(scene, arg)`)(scene, arg);
    },
    { src: fn.toString(), arg }
  );

/**
 * Zamraża i odmraża scenę. Sam zrzut kanwasu zajmuje w Playwright kilkaset
 * milisekund zegara, a przy spowolnieniu 0.12 to i tak kilkadziesiąt
 * milisekund animacji — dość, żeby pocisk zdążył trafić, a rozbłysk zgasnąć,
 * zanim obraz zostanie zapisany. Pauza sceny zatrzymuje aktualizacje, ale
 * rysowanie idzie dalej, więc zrzut pokazuje dokładnie tę klatkę, na którą
 * czekaliśmy.
 */
const freeze = (page) => page.evaluate(() => window.__game.scene.pause('battle'));
const thaw = (page) => page.evaluate(() => window.__game.scene.resume('battle'));

/**
 * Skleja klatki w poziomy pasek, wycinając z każdej ten sam fragment planszy.
 * Kadrujemy do okolic uderzenia, bo cały ekran obok siebie cztery razy daje
 * miniatury, na których nie widać tego, co się ocenia.
 */
async function strip(browser, pliki, out, clip = { x: 150, y: 180, w: 620, h: 470 }) {
  // Pasek składamy na OSOBNEJ stronie. Sklejanie na stronie gry podmieniało
  // jej zawartość i wszystkie następne zrzuty szukały już nieistniejącego
  // kanwasu — przebieg wywalał się zaraz po pasku.
  const dane = [];
  for (const f of pliki) dane.push((await readFile(f)).toString('base64'));
  const p = await browser.newPage({
    viewport: { width: clip.w * dane.length + 8, height: clip.h + 8 },
  });
  await p.setContent(`<style>
    body{margin:0;background:#1c1c1c}
    .r{display:flex}
    .k{width:${clip.w}px;height:${clip.h}px;overflow:hidden;position:relative;border-right:2px solid #000}
    .k img{position:absolute;left:${-clip.x}px;top:${-clip.y}px}
  </style><div class="r">${dane
    .map((b64) => `<div class="k"><img src="data:image/png;base64,${b64}"></div>`)
    .join('')}</div>`);
  await p.waitForTimeout(300);
  await p.locator('.r').screenshot({ path: out });
  await p.close();
  console.log(`  → ${out.split('/').pop()} (pasek ${dane.length} klatek)`);
}

/**
 * Wejście na stronę. Dwie rzeczy bronią przed przeterminowaniem, które łapał
 * ostatni krok przebiegu (`09-zblizenie-oddzialu`):
 *
 *  1. Czekamy na `domcontentloaded`, nie na `load`. Poprzedni krok kończył się
 *     na ekranie końca bitwy, gdzie chodzą pętle animacji i timery — zdarzenie
 *     `load` potrafiło nie dojść w limicie, choć scena dawno stała gotowa.
 *  2. Jedna ponowna próba przez twarde przeładowanie. Jeżeli mimo wszystko
 *     scena nie wstanie, wolimy stracić kilka sekund niż cały przebieg.
 */
async function open(page, query = '') {
  const url = `${BASE}/?seed=${SEED}${query}`;
  try {
    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 20000 });
    await ready(page);
  } catch (e) {
    console.warn(`  ! ponawiam wejście na ${url}: ${e.message.split('\n')[0]}`);
    await page.goto('about:blank');
    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 20000 });
    await ready(page);
  }
}

const main = async () => {
  await mkdir(OUT, { recursive: true });
  // Przeglądarka jest już w obrazie; wersja paczki npm bywa nowsza niż ta
  // pobrana, więc wskazujemy plik wprost zamiast dociągać drugą kopię.
  const browser = await chromium.launch({
    executablePath: process.env.CHROMIUM_PATH || '/opt/pw-browsers/chromium-1194/chrome-linux/chrome',
  });
  const page = await browser.newPage({
    viewport: { width: 1000, height: 900 },
    deviceScaleFactor: 2,
  });
  page.on('pageerror', (e) => console.error('BŁĄD STRONY:', e.message));

  // 1. Stan wyjściowy na każdym z krajobrazów — tekstury, siatka, ustawienie armii.
  for (const terrain of ['laka', 'plaza', 'snieg', 'noc', 'jesien']) {
    await open(page, `&terrain=${terrain}`);
    await shot(page, `01-start-${terrain}`);
  }

  // 2. Tura gracza: podświetlone pola ruchu i cele ataku.
  await open(page, '&terrain=laka');
  await shot(page, '02-tura-gracza');

  // 3. Najechanie na wroga — kursor ataku, znacznik podejścia, prognoza.
  await inScene(page, (scene) => {
    const active = scene.units.find((u) => u.id === scene.roundQueue[0]);
    const foe = scene.units.find((u) => u.side !== active.side);
    scene.showForecast(active, foe);
    scene.showMovePreview(foe);
  });
  await page.waitForTimeout(200);
  await shot(page, '03-prognoza-ataku');

  // 4. Cios wręcz i moment trafienia.
  //
  // Nie odliczamy tu milisekund zegara ściennego, tylko czekamy na zdarzenie
  // w grze: chwilę uderzenia zapisuje sama scena w `window.__trafienie`.
  // Sztywne opóźnienia rozjeżdżały się przy każdej zmianie długości animacji
  // i zrzut regularnie łapał puste pole zamiast ciosu.
  await open(page, '&terrain=laka');
  await inScene(page, (scene) => {
    scene.time.timeScale = 0.12;
    scene.tweens.timeScale = 0.12;
    const a = scene.units.find((u) => u.side === 'player' && !u.def.shooter);
    const d = scene.units.find((u) => u.side === 'enemy');
    // Postaw obok siebie, żeby cios był z bliska i widoczny.
    d.col = a.col + 1;
    d.row = a.row;
    const p = scene.cellToXY(d.col, d.row);
    d.container.setPosition(p.x, p.y);
    window.__trafienie = 0;
    scene.meleeLunge(a, d, () => {
      scene.resolveHit(a, d);
      window.__trafienie = 1;
    });
  });
  await page.waitForFunction(() => window.__trafienie === 1, null, { timeout: 30000 });
  await freeze(page);
  await shot(page, '04-cios-wrecz');
  await thaw(page);
  // Rozbłysk łapiemy jako PASEK KLATEK, nie jedno zdjęcie.
  //
  // Jedna klatka animacji zawsze kłamie, i to w obie strony: wcześniejsza
  // pokazywała szczyt białego rdzenia, kiedy barwna łuna dopiero się rozwija,
  // a przesunięta pokazywała już gaśnięcie. Na podstawie pierwszej oceniano
  // „brak barwy", na podstawie drugiej wyszłoby „efekt ledwo widoczny".
  // Do tego każda zmiana długości efektu rozjeżdżała sztywne opóźnienie —
  // dostrajanie go po każdej rundzie to była walka z wiatrakami.
  //
  // Pasek czterech klatek pokazuje przebieg: narastanie, szczyt rdzenia,
  // szczyt barwy, gaśnięcie. Efekt ruchu ocenia się z przebiegu, nie ze stopklatki.
  const klatki = [];
  for (const [i, czekaj] of [260, 420, 700, 900].entries()) {
    await page.waitForTimeout(czekaj);
    await freeze(page);
    const nazwa = `04f${i + 1}`;
    await shot(page, nazwa);
    klatki.push(`${OUT}/${nazwa}.png`);
    await thaw(page);
  }
  await strip(browser, klatki, `${OUT}/04-przebieg-rozblysku.png`);
  // Sekunda zegara to przy tym spowolnieniu ~120 ms sceny: iskry zdążyły się
  // rozlecieć, a napisy z obrażeniami wypłynąć nad oddział.
  await page.waitForTimeout(1400);
  await freeze(page);
  await shot(page, '05-moment-trafienia');

  // 5. Pocisk strzelca w locie — łapany, gdy minie połowę drogi do celu.
  await open(page, '&terrain=laka');
  await inScene(page, (scene) => {
    scene.time.timeScale = 0.12;
    scene.tweens.timeScale = 0.12;
    const a = scene.units.find((u) => u.side === 'player' && u.def.shooter);
    const d = scene.units.find((u) => u.side === 'enemy');
    const from = scene.cellToXY(a.col, a.row);
    const to = scene.cellToXY(d.col, d.row);
    window.__lot = { from, to, obj: null };
    scene.fireProjectile(a, d, false, () => scene.resolveHit(a, d));
    // Pocisk to jedyny kontener dołożony do warstwy efektów w tej chwili.
    window.__lot.obj = scene.effectLayer.list.filter((o) => o.type === 'Container').pop();
  });
  // Czekamy, aż pocisk minie połowę drogi, ale NIE upieramy się przy tym.
  // Heurystyka „ostatni kontener w warstwie efektów" zależy od tego, jak
  // zbudowany jest pocisk, a to się zmienia z rundy na rundę — gdy przestaje
  // trafiać, cały przebieg zrzutów wywalał się z przeterminowaniem i psuł
  // wszystkie następne kadry. Lepszy jest zrzut z przybliżonej chwili niż
  // brak zrzutu i przerwany przebieg.
  await page
    .waitForFunction(
      () => {
        const l = window.__lot;
        if (!l?.obj?.active) return false;
        const t = (l.obj.x - l.from.x) / (l.to.x - l.from.x);
        return t > 0.45;
      },
      null,
      { timeout: 6000 }
    )
    .catch(() => console.log('  (pocisku nie wyśledzono — zrzut z przybliżonej chwili)'));
  await freeze(page);
  await shot(page, '06-pocisk-w-locie');

  // 6. Śmierć oddziału.
  await open(page, '&terrain=laka');
  await inScene(page, (scene) => {
    scene.time.timeScale = 0.12;
    scene.tweens.timeScale = 0.12;
    const a = scene.units.find((u) => u.side === 'player');
    const d = scene.units.find((u) => u.side === 'enemy');
    d.count = 1;
    d.topHp = 1;
    // Trzymamy uchwyt do znikającego oddziału: dzięki niemu łapiemy klatkę,
    // w której rozbłysk jeszcze świeci, a stworek dopiero zaczyna znikać.
    // Odliczanie na sztywno trafiało w puste pole już PO zejściu.
    window.__zejscie = d.container;
    scene.resolveHit(a, d);
  });
  await page.waitForFunction(
    () => {
      const c = window.__zejscie;
      return !c || !c.active || c.alpha <= 0.8;
    },
    null,
    { timeout: 30000 }
  );
  await freeze(page);
  await shot(page, '07-smierc-oddzialu');

  // 7. Ekran zwycięstwa.
  await open(page, '&terrain=laka');
  await inScene(page, (scene) => {
    scene.units = scene.units.filter((u) => u.side === 'player');
    scene.checkGameOver();
  });
  // Wstęga wjeżdża z opóźnieniem i sprężyną (~700 ms), a podpis dochodzi po
  // 620 ms — wcześniejszy zrzut łapał ekran w połowie wjazdu.
  await page.waitForTimeout(1200);
  await shot(page, '08-zwyciestwo');

  // 7b. Ekran porażki. Osobny zrzut, bo dotąd harness pokazywał wyłącznie
  //     wygraną i chłodna wersja ekranu końca nigdy nie była oglądana —
  //     a ma się od zwycięstwa różnić czymś więcej niż jednym słowem.
  await open(page, '&terrain=laka');
  await inScene(page, (scene) => {
    // Oddziały gracza znikają z planszy, nie tylko z tablicy — inaczej ekran
    // porażki pokazywałby wybitą armię wciąż stojącą na swoich polach.
    scene.units.filter((u) => u.side === 'player').forEach((u) => u.container.setVisible(false));
    scene.units = scene.units.filter((u) => u.side === 'enemy');
    scene.checkGameOver();
  });
  await page.waitForTimeout(1200);
  await shot(page, '08b-porazka');

  // 8. Zbliżenie na oddział — czytelność paska HP, liczebności i odznak.
  await open(page, '&terrain=laka');
  const box = await page.locator('canvas').boundingBox();
  await page.screenshot({
    path: `${OUT}/09-zblizenie-oddzialu.png`,
    clip: { x: box.x + 40, y: box.y + 90, width: 300, height: 260 },
  });
  console.log('  → 09-zblizenie-oddzialu.png');

  // 9. Sama plansza bez oddziałów — do oceny terenu, siatki i ramy w oderwaniu
  //    od tego, co na niej stoi.
  for (const terrain of ['laka', 'snieg']) {
    await open(page, `&terrain=${terrain}`);
    await inScene(page, (scene) => {
      scene.units.forEach((u) => u.container.setVisible(false));
      scene.clearHighlights();
    });
    await page.waitForTimeout(200);
    const b = await page.locator('canvas').boundingBox();
    await page.screenshot({
      path: `${OUT}/10-sama-plansza${terrain === 'laka' ? '' : `-${terrain}`}.png`,
      clip: { x: b.x + 48, y: b.y + 86, width: 866, height: 536 },
    });
    console.log(`  → 10-sama-plansza${terrain === 'laka' ? '' : `-${terrain}`}.png`);
  }

  await browser.close();
  console.log(`\nGotowe. Zrzuty w ${OUT}/`);
};

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
