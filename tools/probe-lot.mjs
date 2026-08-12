// Pomiar animacji lotu — czy latacz naprawdę robi to, co ma w kodzie.
//
// Po co osobna sonda: lot ocenialiśmy z paska czterech klatek, a cztery próbki
// na kilkusekundowy przelot nie wystarczą, żeby stwierdzić, czy sylwetka faluje
// po sinusie, czy tylko raz się uniosła. Do tego pasek pokazuje wysokość
// względem kadru, więc przy kadrze podążającym za sylwetką falowanie znika
// z obrazu, choć w kodzie jest.
//
// Sonda próbkuje stan sylwetki wiele razy w trakcie przelotu i podaje liczby:
// o ile uniosła się nad linię stóp, jaka jest amplituda falowania, o ile
// stopni się przechyla i co w tym czasie robi cień.
//
//   node tools/probe-lot.mjs [--url http://localhost:4173]

import { chromium } from 'playwright';

const arg = (name, fallback) => {
  const i = process.argv.indexOf(name);
  return i !== -1 ? process.argv[i + 1] : fallback;
};

const BASE = arg('--url', 'http://localhost:4173');
// Wartości z src/visual/unitView.ts — jeśli tam się zmienią, tu też trzeba.
const FEET_Y = 7;
const OCZEKIWANE = { rise: 13, bob: 3.5, tilt: 11 };

const ready = (page) =>
  page.waitForFunction(
    () => window.__game?.scene.getScene('battle')?.sys.settings.status === 5,
    null,
    { timeout: 30000 }
  );

async function zmierz(page, lata, opcje = {}) {
  await page.goto(`${BASE}/?seed=7&terrain=laka`, { waitUntil: 'domcontentloaded' });
  await ready(page);
  await page.waitForTimeout(400);

  const start = await page.evaluate((arg) => {
    const chceLatacz = arg.lata;
    const scene = window.__game.scene.getScene('battle');
    const u = scene.units.find((x) => x.side === 'player' && !!x.def.flying === chceLatacz);
    if (!u) return null;
    // Spowalniamy czas, żeby próbki gęsto pokryły przelot.
    scene.time.timeScale = arg.tempo;
    scene.tweens.timeScale = arg.tempo;
    window.__ruch = u;
    // Kolumnę wyjścia trzeba zapisać PRZED ruchem: performMove od razu
    // podmienia u.col, więc odczyt po nim pokazywał wyjście = cel.
    const zKol = u.col;
    const doKol = arg.doKol ?? Math.min(u.col + Math.max(3, u.def.move - 1), 8);
    const doX = scene.cellToXY(doKol, u.row).x;
    scene.performMove(u, { col: doKol, row: u.row });
    return { nazwa: u.def.name, zKol, doKol, doX };
  }, { lata, tempo: opcje.tempo ?? 0.25, doKol: opcje.doKol });
  if (!start) return null;

  // Próbki zbiera rejestrator WEWNĄTRZ strony, klatka po klatce. Odpytywanie
  // z zewnątrz dawało jeden odczyt na ~250 ms, czyli siedem próbek na cały
  // przelot — za mało, żeby w ogóle zobaczyć sinus o okresie 420 ms.
  await page.evaluate(() => {
    window.__probki = [];
    const zbieraj = () => {
      const u = window.__ruch;
      if (u?.view?.sprite?.active) {
        const v = u.view;
        window.__probki.push({
          t: performance.now(),
          y: v.sprite.y,
          angle: v.sprite.angle,
          x: u.container.x,
          cienY: v.shadow.y,
          cienSkala: v.shadow.scaleX,
          cienAlfa: v.shadow.alpha,
        });
      }
      window.__raf = requestAnimationFrame(zbieraj);
    };
    zbieraj();
  });

  // Czekamy na koniec przelotu, patrząc na to, czy pionek jeszcze jedzie.
  await page
    .waitForFunction(
      (doX) => {
        const p = window.__probki;
        if (p.length < 10) return false;
        const ostatnie = p.slice(-8);
        const stoi = Math.abs(ostatnie[7].x - ostatnie[0].x) < 0.5;
        return stoi && Math.abs(ostatnie[7].x - doX) < 3;
      },
      start.doX,
      { timeout: 30000 }
    )
    .catch(() => {});
  const probki = await page.evaluate(() => {
    cancelAnimationFrame(window.__raf);
    return window.__probki;
  });
  return { start, probki };
}

function raport(tytul, wynik, lata) {
  if (!wynik) return console.log(`${tytul}: nie znaleziono oddziału`);
  const { start, probki } = wynik;
  // Odcinamy ogon bezruchu po wylądowaniu; reszta to sam przelot.
  let koniec = probki.length;
  while (koniec > 1 && Math.abs(probki[koniec - 1].x - probki[koniec - 2].x) < 0.05) koniec--;
  const próba = probki.slice(0, Math.max(koniec, 5));

  const wys = próba.map((p) => FEET_Y - p.y); // ile nad linią stóp
  const kat = próba.map((p) => p.angle);
  const min = (a) => Math.min(...a);
  const max = (a) => Math.max(...a);
  const sr = (a) => a.reduce((s, v) => s + v, 0) / a.length;

  console.log(`\n=== ${tytul} (${start.nazwa}, kolumny ${start.zKol} → ${start.doKol}) ===`);
  console.log(`  próbek w ruchu: ${próba.length} z ${probki.length}`);
  console.log(`  wzniesienie nad linię stóp: min ${min(wys).toFixed(1)}  śr ${sr(wys).toFixed(1)}  max ${max(wys).toFixed(1)} px`);
  console.log(`  amplituda falowania (max-min)/2: ${((max(wys) - min(wys)) / 2).toFixed(1)} px`);
  console.log(`  przechył: min ${min(kat).toFixed(1)}°  max ${max(kat).toFixed(1)}°`);
  console.log(`  cień — odsunięcie ${max(próba.map((p) => p.cienY)).toFixed(1)} px, skala ${min(próba.map((p) => p.cienSkala)).toFixed(2)}, alfa ${min(próba.map((p) => p.cienAlfa)).toFixed(2)}`);

  if (!lata) return;

  // Falowanie liczymy DOPIERO po zakończeniu wznoszenia. Wcześniejsza wersja
  // brała rozstęp od zera i podawała 7,9 px — czyli mierzyła wzlot, nie sinus.
  const wPowietrzu = próba.filter((p) => FEET_Y - p.y > OCZEKIWANE.rise * 0.6);
  const plateau = wPowietrzu.map((p) => FEET_Y - p.y);
  const ampl = plateau.length > 4 ? (max(plateau) - min(plateau)) / 2 : NaN;
  console.log(`  próbek na wysokości przelotowej: ${plateau.length}`);
  const ok = (co, jest, cel, luz) => {
    const zgoda = Math.abs(jest - cel) <= luz;
    console.log(`  ${zgoda ? 'OK  ' : 'ŹLE '} ${co}: ${jest.toFixed(1)} wobec oczekiwanych ${cel}`);
    return zgoda;
  };
  console.log('  --- zgodność z kodem ---');
  ok('średnie wzniesienie', sr(wys), OCZEKIWANE.rise, 3);
  ok('amplituda falowania', ampl, OCZEKIWANE.bob, 1.5);
  ok('przechył', max(kat.map(Math.abs)), OCZEKIWANE.tilt, 2);
}

const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
const page = await browser.newPage({ viewport: { width: 1100, height: 800 } });
// Krótki przelot i długi: falowanie ma okres 420 ms, więc na trasie krótszej
// niż ten okres nie ma prawa się pokazać. Dwa pomiary rozdzielają „animacji
// nie ma" od „animacja nie ma się kiedy wydarzyć".
raport('LOT krótki (4 pola)', await zmierz(page, true, { tempo: 0.1, doKol: 4 }), true);
raport('LOT długi (9 pól)', await zmierz(page, true, { tempo: 0.1, doKol: 9 }), true);
raport('CHÓD (dla porównania)', await zmierz(page, false, { tempo: 0.25 }), false);
await browser.close();
