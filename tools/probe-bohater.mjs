// Sonda ekranu bohatera: czy da się tam WEJŚĆ i czy da się armią ZARZĄDZAĆ
// myszą — przenieść, zamienić, scalić i podzielić, także skrótami.
//
// Po co osobno od `probe-armia.ts`: tamta sprawdza arytmetykę, ta sprawdza
// drogę gracza. Na tym już raz poległa mapa przygody — sonda liczyła punkt
// kliknięcia tym samym wzorem co scena, więc przechodziła przy zepsutej grze.
// Tutaj klikamy PRAWDZIWĄ myszą w PRAWDZIWYCH pikselach, a wynik czytamy ze
// stanu gry, nie z tego, co sonda sama policzyła.
//
//   node tools/probe-bohater.mjs [--url http://localhost:4173]

import { chromium } from 'playwright';

const arg = (n, d) => {
  const i = process.argv.indexOf(n);
  return i !== -1 ? process.argv[i + 1] : d;
};
const BASE = arg('--url', 'http://localhost:4173');

let bledy = 0;
const sprawdz = (nazwa, warunek, szczegol = '') => {
  if (!warunek) bledy++;
  console.log(`${warunek ? 'OK  ' : 'BŁĄD'} ${nazwa}${szczegol ? ` — ${szczegol}` : ''}`);
};

/** Geometria pasa slotów — te same liczby co w `HeroScene`. */
const SLOT_BOK = 92;
const SLOT_ODSTEP = 12;
const SLOTY = 7;
const PAS_Y = 548;
const slotX = (i) => (960 - (SLOTY * SLOT_BOK + (SLOTY - 1) * SLOT_ODSTEP)) / 2 + i * (SLOT_BOK + SLOT_ODSTEP) + SLOT_BOK / 2;

const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
const page = await browser.newPage({ viewport: { width: 960, height: 694 } });
const bledyJs = [];
page.on('pageerror', (e) => bledyJs.push(String(e)));

const scena = (n) =>
  page.waitForFunction((x) => window.__game?.scene.getScene(x)?.sys.settings.status === 5, n, {
    timeout: 90000,
  });
const aktywna = () =>
  page.evaluate(() =>
    window.__game.scene.getScenes(true).map((s) => s.scene.key)
  );
const armia = () =>
  page.evaluate(() =>
    window.__game.registry
      .get('stan-mapy')
      .bohater.armia.map((o) => (o ? { s: o.sprite, ile: o.ile } : null))
  );
const suma = (a) => a.reduce((s, o) => s + (o ? o.ile : 0), 0);

/**
 * Ustawia armię w znany układ. Wzorce gatunków bierzemy RAZ, na starcie —
 * gdyby sonda czytała je z bieżącej armii, każdy poprzedni test zmieniałby
 * warunki następnego i „BŁĄD" pokazywałby się o jeden krok za późno.
 */
const zapamietajWzory = () =>
  page.evaluate(() => {
    window.__wzory = window.__game.registry
      .get('stan-mapy')
      .bohater.armia.filter(Boolean)
      .map((o) => ({ ...o }));
    return window.__wzory.length;
  });

const ustaw = (wpisy) =>
  page.evaluate((w) => {
    const gra = window.__game;
    const stan = gra.registry.get('stan-mapy');
    const nowa = new Array(7).fill(null);
    for (const [slot, ktory, ile] of w) nowa[slot] = { ...window.__wzory[ktory], ile };
    stan.bohater.armia = nowa;
    gra.registry.set('stan-mapy', stan);
    const s = gra.scene.getScene('bohater');
    if (s?.sys.settings.status === 5) s.scene.restart();
  }, wpisy);

/** Czy okno podziału stoi otwarte — pytamy scenę, nie zgadujemy z pikseli. */
const oknoOtwarte = () =>
  page.evaluate(() => !!window.__game.scene.getScene('bohater').oknoOtwarte);

const przeciagnij = async (z, doc, modyfikator) => {
  if (modyfikator) await page.keyboard.down(modyfikator);
  await page.mouse.move(slotX(z), PAS_Y);
  await page.mouse.down();
  await page.mouse.move(slotX(doc), PAS_Y, { steps: 10 });
  await page.mouse.up();
  if (modyfikator) await page.keyboard.up(modyfikator);
  await page.waitForTimeout(260);
};

// ---------- wejście na ekran ----------

await page.goto(`${BASE}/?ekran=mapa`, { waitUntil: 'domcontentloaded' });
await scena('adventure');
await page.waitForTimeout(700);

const wzorow = await zapamietajWzory();
sprawdz('są cztery wzorcowe gatunki', wzorow >= 3, `${wzorow}`);
const armiaNaMapie = await armia();
sprawdz('armia startowa ma sloty', armiaNaMapie.length === 7, `${armiaNaMapie.length}`);
const sumaStart = suma(armiaNaMapie);

// Klik w pole, na którym stoi bohater. Liczymy punkt ekranu z pozycji kamery
// gry, a nie własnym wzorem — sonda ma trafić tam, gdzie NAPRAWDĘ jest
// sylwetka, inaczej sprawdza swój własny rachunek.
const punktBohatera = await page.evaluate(() => {
  const s = window.__game.scene.getScene('adventure');
  const b = window.__game.registry.get('stan-mapy').bohater;
  const kam = s.cameras.cameras.find((c) => c.width < 900 && c.width > 300);
  const KAFEL = 48;
  return {
    x: kam.x + (b.x + 0.5) * KAFEL - kam.scrollX,
    y: kam.y + (b.y + 0.5) * KAFEL - kam.scrollY,
  };
});
await page.mouse.click(punktBohatera.x, punktBohatera.y);
await page.waitForTimeout(700);
sprawdz(
  'klik w bohatera na mapie otwiera jego ekran',
  (await aktywna()).includes('bohater'),
  (await aktywna()).join(', ')
);

// ---------- przenoszenie ----------

await ustaw([
  [0, 0, 20],
  [1, 1, 9],
  [2, 2, 6],
]);
await page.waitForTimeout(500);

// Geometria okna podziału — te same liczby co w `HeroScene`.
const OW = 380;
const OH = 230;
const OX = (960 - OW) / 2;
const OY = (694 - OH) / 2;
const PRZYCISK = (i) => ({ x: OX + 62 + i * 128, y: OY + 152 });
const PODZIEL = { x: OX + OW * 0.68, y: OY + 196 };

// Zwykłe przeciągnięcie na puste miejsce PRZENOSI cały stos. Okno z liczbą
// siedzi pod Altem — przekładanie oddziału robi się dużo częściej niż podział.
await przeciagnij(0, 5);
let a = await armia();
sprawdz('zwykłe przeciągnięcie na pusty slot nie otwiera okna', !(await oknoOtwarte()));
sprawdz(
  'zwykłe przeciągnięcie PRZENOSI cały stos',
  a[0] === null && a[5]?.ile === 20,
  JSON.stringify([a[0], a[5]])
);
sprawdz('przeniesienie niczego nie gubi', suma(a) === 35, `${suma(a)}`);

await ustaw([
  [0, 0, 20],
  [1, 1, 9],
  [2, 2, 6],
]);
await page.waitForTimeout(400);
await przeciagnij(0, 5, 'Alt');
sprawdz('Alt otwiera okno podziału', await oknoOtwarte());

// „Wszystko" plus „Podziel": maksimum na pusty slot to n-1, więc w źródle
// zostanie dokładnie jeden — bohater nigdy nie zostaje z pustym stosem.
const wszystko = PRZYCISK(2);
await page.mouse.click(wszystko.x, wszystko.y);
await page.waitForTimeout(150);
await page.mouse.click(PODZIEL.x, PODZIEL.y);
await page.waitForTimeout(350);
a = await armia();
sprawdz('okno zamyka się po potwierdzeniu', !(await oknoOtwarte()));
sprawdz(
  'okno podziału przelewa wszystko oprócz jednego',
  a[0]?.ile === 1 && a[5]?.ile === 19,
  JSON.stringify([a[0], a[5]])
);
sprawdz('podział niczego nie gubi', suma(a) === 35, `${suma(a)}`);

// ---------- skróty ----------

await ustaw([
  [0, 0, 20],
  [1, 1, 9],
]);
await page.waitForTimeout(400);
await przeciagnij(0, 4, 'Shift');
a = await armia();
sprawdz('Shift dzieli stos na pół', a[0]?.ile === 10 && a[4]?.ile === 10, JSON.stringify([a[0], a[4]]));

await ustaw([
  [0, 0, 20],
  [1, 1, 9],
]);
await page.waitForTimeout(400);
await przeciagnij(0, 6, 'Control');
a = await armia();
sprawdz('Ctrl odkłada jednego stworka', a[0]?.ile === 19 && a[6]?.ile === 1, JSON.stringify([a[0], a[6]]));

// ---------- zamiana i scalenie ----------

await ustaw([
  [0, 0, 20],
  [3, 1, 9],
]);
await page.waitForTimeout(400);
const przedZamiana = (await armia())[0].s;
await przeciagnij(0, 3);
a = await armia();
sprawdz('przeciągnięcie na obcy gatunek zamienia sloty', a[3]?.s === przedZamiana, JSON.stringify([a[0], a[3]]));
sprawdz('zamiana niczego nie gubi', suma(a) === 29, `${suma(a)}`);

await ustaw([
  [0, 0, 12],
  [2, 0, 8],
]);
await page.waitForTimeout(400);
await przeciagnij(0, 2);
a = await armia();
sprawdz('przeciągnięcie na ten sam gatunek scala stosy', a[2]?.ile === 20 && a[0] === null, JSON.stringify([a[0], a[2]]));

// ---------- klik-klik bez przeciągania ----------

await ustaw([
  [0, 0, 12],
  [1, 1, 5],
]);
await page.waitForTimeout(400);
await page.mouse.click(slotX(0), PAS_Y);
await page.waitForTimeout(200);
await page.mouse.click(slotX(1), PAS_Y);
await page.waitForTimeout(300);
a = await armia();
sprawdz('dwa kliknięcia zamieniają sloty bez przeciągania', a[0]?.ile === 5 && a[1]?.ile === 12, JSON.stringify([a[0], a[1]]));

// ---------- powrót na mapę ----------

const przedPowrotem = await armia();
await page.keyboard.press('Escape');
await page.waitForTimeout(800);
sprawdz('Escape wraca na mapę', (await aktywna()).includes('adventure'), (await aktywna()).join(', '));
const poPowrocie = await armia();
sprawdz(
  'układ slotów przeżywa powrót na mapę',
  JSON.stringify(poPowrocie) === JSON.stringify(przedPowrotem),
  JSON.stringify(poPowrocie)
);

sprawdz('bez błędów JS', bledyJs.length === 0, bledyJs.slice(0, 2).join(' | '));

await browser.close();
console.log(bledy === 0 ? '\nWszystko przeszło.' : `\n${bledy} sprawdzeń nie przeszło.`);
process.exit(bledy === 0 ? 0 : 1);
