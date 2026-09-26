// Zrzut ekranu bohatera w powtarzalnym stanie.
//
// Po co osobne narzędzie i po co „powtarzalny stan": ekran bohatera pokazuje
// armię, artefakty i doświadczenie. Gdyby zrzut szedł z gry zastanej, dwie
// rundy pętli jakości różniłyby się nie rzemiosłem, tylko tym, ile akurat
// zebrano artefaktów. Stan ustawiamy więc z zewnątrz, przez rejestr gry.
//
//   node tools/zrzut-bohater.mjs [--out tools/shots/bohater.png]
//                                [--stan pelny|pusty|po-bitwie|ela]
//                                [--okno] [--opis lucznictwo|artefakt-pazur|atak]
//                                [--url http://localhost:4173]
//
// Zrzut idzie z samego płótna (960 × 695, jak `tools/blind/miasto-armia.png`).
// `--opis` przypina dymek z opisem umiejętności (id), artefaktu
// („artefakt-<id>") albo statystyki (atak/obrona/ruch) — klikiem myszy.

import { chromium } from 'playwright';

const arg = (n, d) => {
  const i = process.argv.indexOf(n);
  return i !== -1 ? process.argv[i + 1] : d;
};
const BASE = arg('--url', 'http://localhost:4173');
const OUT = arg('--out', 'tools/shots/bohater.png');
const STAN = arg('--stan', 'pelny');
const OKNO = process.argv.includes('--okno');
const OPIS = arg('--opis', '');
/**
 * Skala zrzutu. Do oglądania wystarczy 1, ale do ślepego porównania z grą
 * renderowaną w 1080p trzeba 2: kadry idą w rozdzielczości własnej, bez
 * skalowania, więc przy skali 1 nasz detal byłby o połowę drobniejszy od
 * wzorcowego i krytyk oceniałby rozdzielczość, a nie rzemiosło.
 */
const SKALA = Number(arg('--skala', '1'));

/**
 * Trzy stany pokazowe. „Pełny" jest tym, z którego robimy porównania: ekran
 * pusty nie pokazuje ani slotów, ani modyfikatorów, więc ocenianie na nim
 * rzemiosła jest ocenianiem tła.
 */
const STANY = {
  pelny: {
    artefakty: ['opaska', 'pazur', 'buty', 'mistrz', 'skrzydla'],
    dosw: 900,
    sloty: 6,
    umiejetnosci: { zwiad: 2, lucznictwo: 3, gospodarnosc: 1 },
  },
  ela: {
    imie: 'Ela',
    artefakty: ['kamizelka', 'tarcza', 'rower', 'ksiezycowy-kamien'],
    dosw: 2600,
    sloty: 4,
    umiejetnosci: { tropiciel: 1, uzdrowiciel: 2, napastnik: 3, nauka: 1 },
  },
  pusty: { artefakty: [], dosw: 0, sloty: 1, umiejetnosci: {} },
  'po-bitwie': {
    artefakty: ['kamizelka'],
    dosw: 260,
    sloty: 3,
    umiejetnosci: { uzdrowiciel: 1 },
  },
};

const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
const page = await browser.newPage({
  viewport: { width: 1000, height: 760 },
  deviceScaleFactor: SKALA,
});
page.on('pageerror', (e) => console.log('BŁĄD JS —', String(e)));

const scena = (n) =>
  page.waitForFunction(
    (x) => window.__game?.scene.getScene(x)?.sys.settings.status === 5,
    n,
    { timeout: 90000 }
  );

await page.goto(`${BASE}/?ekran=mapa`, { waitUntil: 'domcontentloaded' });
await scena('adventure');
await page.waitForTimeout(600);

await page.evaluate((s) => {
  const gra = window.__game;
  const stan = gra.registry.get('stan-mapy');
  const b = stan.bohater;
  b.artefakty = s.artefakty;
  b.doswiadczenie = s.dosw;
  b.umiejetnosci = { ...s.umiejetnosci };
  if (s.imie) b.imie = s.imie;
  // Armia rozłożona z dziurą w środku: bez pustego slotu między zajętymi nie
  // widać, że sloty są MIEJSCAMI, a to jest cała treść tego ekranu.
  const wzor = b.armia.filter(Boolean);
  const nowa = new Array(7).fill(null);
  const miejsca = [0, 1, 2, 4, 5, 6];
  for (let i = 0; i < Math.min(s.sloty, wzor.length, miejsca.length); i++) {
    nowa[miejsca[i]] = wzor[i % wzor.length];
  }
  // Kopie, nie te same obiekty — inaczej dwa sloty dzielą jeden stos i zmiana
  // liczebności w jednym zmienia oba.
  b.armia = nowa.map((o) => (o ? { ...o } : null));
  gra.registry.set('stan-mapy', stan);
  gra.scene.getScene('adventure').scene.start('bohater');
}, STANY[STAN] ?? STANY.pelny);

await scena('bohater');
await page.waitForFunction(() => window.__game.scene.getScene('bohater').gotowy, null, { timeout: 30000 });
await page.waitForTimeout(900);
const rog = await page.locator('canvas').boundingBox();

if (OKNO) {
  // Okno podziału: Shift + przeciągnięcie pierwszego zajętego slotu na pusty
  // (środki slotów czytamy z paska armii sceny).
  const s = await page.evaluate(() => {
    const p = window.__game.scene.getScene('bohater').panel.paski[0];
    return p.sloty.map((x) => ({ x: x.x + p.slotW / 2, y: x.y + p.slotH / 2 }));
  });
  await page.keyboard.down('Shift');
  await page.mouse.move(rog.x + s[0].x, rog.y + s[0].y);
  await page.mouse.down();
  await page.mouse.move(rog.x + s[3].x, rog.y + s[3].y, { steps: 12 });
  await page.mouse.up();
  await page.keyboard.up('Shift');
  await page.waitForTimeout(500);
}

if (OPIS) {
  // Klik w strefę opisu, której dymek ma klucz OPIS (umiejętność, artefakt,
  // statystyka) — prawdziwą myszą w środek strefy.
  const cel = await page.evaluate((klucz) => {
    const sc = window.__game.scene.getScene('bohater');
    const pelny = klucz.startsWith('artefakt-') || ['atak', 'obrona', 'ruch'].includes(klucz) ? klucz : `umiejetnosc-${klucz}`;
    for (const z of sc.strefyOpisu) {
      z.emit('pointerover');
      const trafiony = sc.dymekKlucz === pelny;
      z.emit('pointerout');
      if (trafiony) return { x: z.x + z.width / 2, y: z.y + z.height / 2 };
    }
    return null;
  }, OPIS);
  if (!cel) console.log(`nie ma strefy opisu „${OPIS}"`);
  else {
    await page.mouse.move(rog.x + cel.x, rog.y + cel.y);
    await page.mouse.down();
    await page.mouse.up();
    await page.waitForTimeout(400);
  }
}

await page.locator('canvas').screenshot({ path: OUT });
console.log(`zapisano ${OUT}${OKNO ? ' (z oknem podziału)' : ''}`);
await browser.close();
