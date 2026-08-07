// Zrzuty ekranu z działającej bitwy — materiał do porównań z wzorcem.
//
// Steruje sceną przez window.__game, więc każdy stan da się ustawić dokładnie
// i powtarzalnie, zamiast zgadywać klikaniem. Klatki animacji łapiemy zwalniając
// czas sceny, bo cios trwa 120 ms i inaczej trafilibyśmy w niego przypadkiem.
//
//   node tools/capture.mjs [--out tools/shots] [--url http://localhost:4173]

import { chromium } from 'playwright';
import { mkdir } from 'node:fs/promises';

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

async function open(page, query = '') {
  await page.goto(`${BASE}/?seed=${SEED}${query}`, { waitUntil: 'load' });
  await ready(page);
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
  // Szczyt rozbłysku. Zrzut 04 powstaje w chwili WYWOŁANIA efektu, kiedy łuna
  // ma jeszcze alfę 0, a 05 długo po wszystkim — samego światła nie było widać
  // w żadnym z nich i nie dało się ocenić głównego zarzutu krytyka.
  // 800 ms zegara przy spowolnieniu 0.12 to ~96 ms sceny, czyli tuż po pełni.
  await page.waitForTimeout(800);
  await freeze(page);
  await shot(page, '04b-rozblysk');
  await thaw(page);
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
  await page.waitForFunction(
    () => {
      const l = window.__lot;
      if (!l?.obj?.active) return false;
      const t = (l.obj.x - l.from.x) / (l.to.x - l.from.x);
      return t > 0.45;
    },
    null,
    { timeout: 30000 }
  );
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
