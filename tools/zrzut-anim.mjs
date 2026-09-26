// Paski klatek animacji jednego stworka — do ślepego porównania z paskami
// z Heroes 3 (`tools/reference/homm3/ref-anim-*-pasek.png`).
//
//   node tools/zrzut-anim.mjs [--out tools/shots] [--url http://localhost:4173]
//                             [--tylko atak,trafiony,strzal,ruch,lot]
//
// Pięć pasków: `anim-atak.png` (cios wręcz), `anim-trafiony.png`,
// `anim-strzal.png`, `anim-ruch.png` (chód), `anim-lot.png`. Każdy to sześć
// RÓWNO rozłożonych klatek całej akcji, od pierwszej klatki ruchu do powrotu
// do spoczynku, wykadrowanych wokół stworka w powiększeniu ×2.
//
// Jak mierzymy (patrz STAN.md, „Rzecz, o której warto pamiętać"):
// Nie ma tu ani jednej podróży Playwright → przeglądarka w trakcie akcji.
// Cała akcja jest odgrywana WEWNĄTRZ strony, na zegarze wirtualnym: pętla gry
// jest uśpiona, a próbnik sam woła `game.step` co 1/60 s i po każdym kroku
// kopiuje wycinek kanwasu. Tweeny Phasera liczą czas z `Date.now()`, więc na
// czas nagrania `Date.now` też idzie zegarem wirtualnym. Dzięki temu wynik
// nie zależy od obciążenia maszyny, a klatki są te same przy każdym przebiegu.
//
// Powiększenie ×2 to kamera sceny z zoomem 2, a nie skalowanie zrzutu —
// tekstury (128 px) są rysowane w pełnej rozdzielczości, nie rozmywane.
// Na czas nagrania znikają: napisy nad oddziałami, plakietki i nazwy,
// pozostałe oddziały (także przeciwnik) — pasek ma pokazywać jednego stworka,
// jak paski wzorca. Zostaje cień, podest i efekty ciosu.

import { chromium } from 'playwright';
import { mkdir, writeFile } from 'node:fs/promises';

const arg = (name, fallback) => {
  const i = process.argv.indexOf(name);
  return i !== -1 ? process.argv[i + 1] : fallback;
};

const OUT = arg('--out', 'tools/shots');
const BASE = arg('--url', 'http://localhost:4173');
const TYLKO = arg('--tylko', 'atak,trafiony,strzal,ruch,lot').split(',');

/**
 * Akcje. `frakcje` ustala składy (gracz, wróg), `stwor` — kogo nagrywamy
 * (zawsze po stronie gracza, więc patrzy w prawo jak stworki wzorca).
 * Glacyn to dwunożny zwykły piechur, Bazalt — czworonóg, Sporex — strzelec,
 * Cynder — latacz ze skrzydłem.
 */
const AKCJE = {
  atak: { frakcje: 'grota,zbocze', stwor: '00246', tytul: 'cios wręcz' },
  trafiony: { frakcje: 'zbocze,grota', stwor: '00074', tytul: 'trafiony' },
  strzal: { frakcje: 'grota,zbocze', stwor: '00002', tytul: 'strzał' },
  ruch: { frakcje: 'grota,zbocze', stwor: '00246', tytul: 'chód' },
  lot: { frakcje: 'zbocze,grota', stwor: '00023', tytul: 'lot' },
};

async function open(page, frakcje) {
  await page.goto(`${BASE}/?ekran=bitwa&seed=7&terrain=laka&frakcje=${frakcje}`, {
    waitUntil: 'domcontentloaded',
    timeout: 20000,
  });
  await page.waitForFunction(() => window.__game?.scene.getScene('battle')?.sys.settings.status === 5, null, {
    timeout: 30000,
  });
  await page.waitForTimeout(500);
}

/** Cały próbnik — jedna funkcja wykonywana w stronie, jedna podróż. */
function nagraj({ akcja, stwor }) {
  const game = window.__game;
  const scene = game.scene.getScene('battle');
  const DT = 1000 / 60;
  // Kadr w pikselach sceny wokół stóp stworka (środek heksa), ×2 na wyjściu.
  const KW = 110;
  const KH = 84;
  const ZOOM = 2;

  const sub = scene.units.find((u) => u.side === 'player' && u.def.sprite === stwor);
  if (!sub) return { blad: `brak stworka ${stwor} po stronie gracza` };
  const wrog = scene.units.find((u) => u.side === 'enemy' && u.def.shooter !== true) ?? scene.units.find((u) => u.side === 'enemy');

  // Nikt inny nie wchodzi w kadr: ukrywamy pozostałe oddziały, a u
  // nagrywanego zostawiamy tylko cień, podest i sylwetkę.
  for (const u of scene.units) if (u !== sub) u.container.setAlpha(0);
  const zostaw = new Set([sub.view.shadow, sub.view.platform, sub.view.sprite]);
  for (const o of sub.container.list) if (!zostaw.has(o)) o.setVisible(false);
  scene.floatText = () => {};
  scene.clearHighlights?.();
  // Kolejka tur i podświetlenia pól to HUD — w kadrze byłyby szumem.
  scene.showOptions = () => {};

  // Ustawienie: napastnik i cel obok siebie w tym samym rzędzie.
  const postaw = (u, col, row) => {
    u.col = col;
    u.row = row;
    const p = scene.cellToXY(col, row);
    u.container.setPosition(p.x, p.y);
  };
  const row = 2;
  postaw(sub, 2, row);
  let start = () => {};
  let koniecAkcji = () => false;
  let zero = null; // chwila, od której liczymy akcję (numer kroku)
  let krok = 0;
  let sledz = false;
  const baza = { x: sub.container.x, y: sub.container.y };
  let srodekX = baza.x + 15;

  const spokoj = (v) => v.pose === null && !v.poseTween;

  if (akcja === 'atak') {
    postaw(wrog, 3, row);
    start = () => {
      zero = krok;
      scene.resolveAttack(sub, wrog, { col: sub.col, row: sub.row });
    };
    let uderzyl = false;
    const pokaz = scene.showHit.bind(scene);
    scene.showHit = (ev) => {
      pokaz(ev);
      if (ev.kto === sub.id) uderzyl = true;
    };
    koniecAkcji = () => uderzyl && spokoj(sub.view) && Math.abs(sub.container.x - baza.x) < 0.5;
  } else if (akcja === 'trafiony') {
    postaw(wrog, 3, row);
    srodekX = baza.x;
    let trafiony = false;
    const pokaz = scene.showHit.bind(scene);
    scene.showHit = (ev) => {
      pokaz(ev);
      if (ev.wKogo === sub.id && zero === null) {
        // Dwie klatki przed uderzeniem — pasek zaczyna się od spoczynku,
        // jak pasek trafienia we wzorcu.
        zero = krok - 2;
        trafiony = true;
      }
    };
    start = () => scene.resolveAttack(wrog, sub, { col: wrog.col, row: wrog.row });
    koniecAkcji = () => trafiony && spokoj(sub.view);
  } else if (akcja === 'strzal') {
    postaw(wrog, 8, row);
    srodekX = baza.x + 10;
    let wypuscil = false;
    const rel = scene.releaseProjectile.bind(scene);
    scene.releaseProjectile = (...a) => {
      wypuscil = true;
      rel(...a);
    };
    start = () => {
      zero = krok;
      scene.resolveAttack(sub, wrog, { col: sub.col, row: sub.row });
    };
    koniecAkcji = () => wypuscil && spokoj(sub.view);
  } else {
    // Chód: dwa pola; lot: trzy pola. Kadr jedzie za stworkiem w poziomie,
    // w pionie stoi — podskok i wznoszenie mają być widać względem ziemi.
    postaw(wrog, 9, 0);
    sledz = true;
    let doszedl = false;
    start = () => {
      zero = krok;
      scene.performMove(sub, { col: sub.col + (akcja === 'lot' ? 3 : 2), row }, () => {
        doszedl = true;
      });
    };
    koniecAkcji = () => doszedl && !sub.view.moveHop && sub.view.pose === null;
  }

  // Zegar wirtualny.
  const prawdziwy = Date.now;
  let teraz = prawdziwy();
  Date.now = () => teraz;
  let t = performance.now();
  game.loop.sleep();
  const cam = scene.cameras.main;
  cam.setZoom(ZOOM);
  const kanwas = game.canvas;

  const klatki = [];
  const zapisz = () => {
    const cx = sledz ? sub.container.x : srodekX;
    cam.centerOn(cx, baza.y - KH / 2 + 24);
    // Render bieżącego stanu z nowym położeniem kamery, bez kroku czasu.
    game.renderer.preRender();
    game.scene.render(game.renderer);
    game.renderer.postRender();
    const c = document.createElement('canvas');
    c.width = KW * ZOOM;
    c.height = KH * ZOOM;
    c.getContext('2d').drawImage(
      kanwas,
      kanwas.width / 2 - (KW * ZOOM) / 2,
      kanwas.height / 2 - (KH * ZOOM) / 2,
      KW * ZOOM,
      KH * ZOOM,
      0,
      0,
      KW * ZOOM,
      KH * ZOOM
    );
    klatki.push(c);
  };
  const krokGry = () => {
    teraz += DT;
    t += DT;
    game.step(t, DT);
    krok++;
  };

  try {
    // Kilka klatek spoczynku, żeby oddech i kamera się ułożyły.
    for (let i = 0; i < 6; i++) {
      krokGry();
      zapisz();
    }
    start();
    let koniec = null;
    for (let i = 0; i < 600 && koniec === null; i++) {
      krokGry();
      zapisz();
      if (zero !== null && koniecAkcji()) koniec = krok;
    }
    if (zero === null || koniec === null) return { blad: `akcja ${akcja} nie domknęła się` };
    // Klatki są numerowane krokami; klatka k odpowiada krokowi k (po 6 krokach
    // rozbiegu klatka i = krok i + 1).
    const od = zero;
    const doK = koniec;
    const wybor = [];
    for (let i = 0; i < 6; i++) wybor.push(Math.round(od + ((doK - od) * i) / 5));
    // Pasek: komórki obok siebie, podpis „i/6", ciemna kreska między nimi —
    // układ jak w paskach wzorca.
    const W = KW * ZOOM;
    const H = KH * ZOOM;
    const pasek = document.createElement('canvas');
    pasek.width = W * 6 + 5 * 2;
    pasek.height = H;
    const g = pasek.getContext('2d');
    g.fillStyle = '#1c1c1c';
    g.fillRect(0, 0, pasek.width, pasek.height);
    wybor.forEach((k, i) => {
      const x = i * (W + 2);
      g.drawImage(klatki[Math.min(klatki.length - 1, Math.max(0, k - 1))], x, 0);
      g.font = '13px sans-serif';
      g.fillStyle = '#000';
      g.fillText(`${i + 1}/6`, x + 5, 16);
      g.fillStyle = '#fff';
      g.fillText(`${i + 1}/6`, x + 4, 15);
    });
    return {
      png: pasek.toDataURL('image/png'),
      ms: Math.round((doK - od) * DT),
      klatki: wybor.map((k) => Math.round((k - od) * DT)),
    };
  } finally {
    Date.now = prawdziwy;
  }
}

const main = async () => {
  await mkdir(OUT, { recursive: true });
  const browser = await chromium.launch({
    executablePath: process.env.CHROMIUM_PATH || '/opt/pw-browsers/chromium-1194/chrome-linux/chrome',
  });
  const page = await browser.newPage({ viewport: { width: 1000, height: 760 } });
  page.on('pageerror', (e) => console.error('BŁĄD STRONY:', e.message));
  for (const akcja of TYLKO) {
    const a = AKCJE[akcja];
    if (!a) throw new Error(`nieznana akcja ${akcja}`);
    await open(page, a.frakcje);
    const w = await page.evaluate(nagraj, { akcja, stwor: a.stwor });
    if (w.blad) {
      console.error(`  ! ${akcja}: ${w.blad}`);
      continue;
    }
    const plik = `${OUT}/anim-${akcja}.png`;
    await writeFile(plik, Buffer.from(w.png.split(',')[1], 'base64'));
    console.log(`  → ${plik}  (${a.tytul}, ${w.ms} ms, klatki ${w.klatki.join('/')} ms)`);
  }
  await browser.close();
};

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
