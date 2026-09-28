// Sonda ekranu bohatera: czy da się tam WEJŚĆ i czy da się drużyną ZARZĄDZAĆ
// myszą — przenieść i zamienić stworka. Od „trenera zamiast armii" każdy slot
// to jeden stworek z poziomem: nic się nie scala (ten sam gatunek się
// zamienia) i nic się nie dzieli (Shift i Ctrl nie mają czego rozdzielić).
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

/**
 * Środki slotów paska armii — czytane ze sceny (wspólny `PanelArmii`, ten
 * sam co w mieście), po wejściu na ekran. Klikamy w nie prawdziwą myszą.
 */
let SLOTY_XY = [];
const slotX = (i) => SLOTY_XY[i].x;
let PAS_Y = 0;

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
      .bohater.armia.map((o) => (o ? { s: o.sprite, p: o.poziom, ile: o.ile } : null))
  );
/** Ilu stworków w drużynie (każdy slot to jeden). */
const suma = (a) => a.reduce((s, o) => s + (o ? o.ile : 0), 0);
/** Zapis slotu do porównań: gatunek i poziom. */
const kto = (o) => (o ? `${o.s}@${o.p}×${o.ile}` : '—');

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
    // [slot, który wzór, poziom] — zawsze jeden stworek na slot.
    for (const [slot, ktory, poziom] of w)
      nowa[slot] = { ...window.__wzory[ktory], ile: 1, poziom, dosw: 5 * poziom * (poziom - 1) };
    stan.bohater.armia = nowa;
    gra.registry.set('stan-mapy', stan);
    const s = gra.scene.getScene('bohater');
    if (s?.sys.settings.status === 5) s.scene.restart();
  }, wpisy).then(() => gotowy());

/** Ekran zbudowany (buduje się po wczytaniu krojów zestawu). */
const gotowy = () =>
  page.waitForFunction(() => window.__game.scene.getScene('bohater')?.gotowy === true, null, { timeout: 30000 });

/** Czy stoi otwarte okno panelu (stworka, podziału) — pytamy scenę, nie zgadujemy z pikseli. */
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
  // Pole ma w świecie 48 px; na ekranie mniej, bo kamera planszy jest
  // oddalona — więc środek pola przeliczamy macierzą, którą ta kamera rysuje.
  const KAFEL = 48;
  const e = kam.matrixCombined.transformPoint((b.x + 0.5) * KAFEL, (b.y + 0.5) * KAFEL, { x: 0, y: 0 });
  return { x: e.x, y: e.y };
});
await page.mouse.click(punktBohatera.x, punktBohatera.y);
await page.waitForTimeout(700);
sprawdz(
  'klik w bohatera na mapie otwiera jego ekran',
  (await aktywna()).includes('bohater'),
  (await aktywna()).join(', ')
);
await gotowy();
({ SLOTY_XY, PAS_Y } = await page.evaluate(() => {
  const p = window.__game.scene.getScene('bohater').panel.paski[0];
  const xy = p.sloty.map((s) => ({ x: s.x + p.slotW / 2, y: s.y + p.slotH / 2 }));
  return { SLOTY_XY: xy, PAS_Y: xy[0].y };
}));
sprawdz('pasek armii to wspólny PanelArmii z siedmioma slotami', SLOTY_XY.length === 7, `${SLOTY_XY.length}`);

// ---------- wygląd: malowane ikony, gniazda, dymki ----------

const wyglad = await page.evaluate(() => {
  const s = window.__game.scene.getScene('bohater');
  const tekstury = s.textures.getTextureKeys();
  const obrazy = [];
  const przejdz = (lista) => {
    for (const o of lista) {
      if (o.type === 'Image') obrazy.push(o.texture.key);
      else if (o.type === 'Container') przejdz(o.list);
    }
  };
  przejdz(s.children.list);
  return {
    umiejetnosci: tekstury.filter((k) => k.startsWith('bh-umiejetnosc-')).length,
    artefakty: obrazy.filter((k) => k.startsWith('bh-artefakt-')).length,
    // Runda 2: w prawym polu lalka — postać w całej sylwetce (`bh-postac-`),
    // głowa zostaje w medalionie (`k-glowa-`).
    portret: obrazy.some((k) => k.startsWith('bh-postac-')) && obrazy.some((k) => k.startsWith('k-glowa-')),
    ikonyStat: ['k-ikona-zapal', 'k-ikona-opieka', 'k-ikona-buty'].every((k) => obrazy.includes(k)),
    strefy: s.strefyOpisu.size,
  };
});
sprawdz('wczytane malowane ikony ośmiu umiejętności', wyglad.umiejetnosci === 8, `${wyglad.umiejetnosci}`);
sprawdz('osiem gniazd artefaktów z malowanymi ikonami', wyglad.artefakty >= 8, `${wyglad.artefakty}`);
sprawdz('postać bohatera na lalce i głowa w medalionie', wyglad.portret);
sprawdz('zapał, opieka i ruch jako malowane ikony', wyglad.ikonyStat);

// Wolne gniazdo umiejętności widać (bohater z mapy startuje bez umiejętności).
const wolne = await page.evaluate(() => {
  const s = window.__game.scene.getScene('bohater');
  const mam = Object.keys(s.stan.bohater.umiejetnosci ?? {}).length;
  const napisy = s.children.list.filter((o) => o.type === 'Text' && o.text === 'Wolne miejsce').length;
  return { mam, napisy };
});
sprawdz('puste gniazda umiejętności są widoczne', wolne.napisy === 4 - wolne.mam, JSON.stringify(wolne));

// Najechanie na gniazdo umiejętności pokazuje dymek, klik go przypina,
// klik obok zdejmuje. Prawdziwą myszą w środek strefy.
const strefa = await page.evaluate(() => {
  const s = window.__game.scene.getScene('bohater');
  for (const z of s.strefyOpisu) {
    z.emit('pointerover');
    const k = s.dymekKlucz;
    z.emit('pointerout');
    if (k.startsWith('umiejetnosc-')) return { x: z.x + z.width / 2, y: z.y + z.height / 2 };
  }
  return null;
});
if (strefa) {
  await page.mouse.move(strefa.x, strefa.y);
  await page.waitForTimeout(150);
  const najechany = await page.evaluate(() => window.__game.scene.getScene('bohater').dymekKlucz);
  sprawdz('najechanie na umiejętność pokazuje dymek z opisem', najechany.startsWith('umiejetnosc-'), najechany);
  await page.mouse.down();
  await page.mouse.up();
  await page.mouse.move(strefa.x + 400, 30);
  await page.waitForTimeout(150);
  const przypiety = await page.evaluate(() => window.__game.scene.getScene('bohater').dymekKlucz);
  sprawdz('klik przypina dymek (zostaje po zjechaniu myszą)', przypiety === najechany, przypiety);
  await page.mouse.click(480, 30);
  await page.waitForTimeout(150);
  const zdjety = await page.evaluate(() => window.__game.scene.getScene('bohater').dymekKlucz);
  sprawdz('klik obok zdejmuje dymek', zdjety === '', zdjety);
} else sprawdz('jest strefa opisu umiejętności', false);

// Artefakt: dymek mówi, co daje.
const artefakt = await page.evaluate(() => {
  const s = window.__game.scene.getScene('bohater');
  for (const z of s.strefyOpisu) {
    z.emit('pointerover');
    const k = s.dymekKlucz;
    const teksty = s.dymek ? s.dymek.list.filter((o) => o.type === 'Text').map((o) => o.text).join(' ') : '';
    z.emit('pointerout');
    if (k.startsWith('artefakt-')) return teksty;
  }
  return '';
});
sprawdz('dymek artefaktu opisuje efekt', /do zapału|do opieki|punktów ruchu/.test(artefakt), artefakt.slice(0, 80));

// ---------- przenoszenie ----------

await ustaw([
  [0, 0, 12],
  [1, 1, 9],
  [2, 2, 6],
]);
await page.waitForTimeout(500);

const tabliczki = await page.evaluate(() =>
  window.__game.scene.getScene('bohater').panel.paski[0].sloty.map((s) => s.licznik.text)
);
sprawdz('tabliczka slotu pokazuje poziom („poz. N")', tabliczki[0] === 'poz. 12' && tabliczki[2] === 'poz. 6' && tabliczki[3] === '', tabliczki.join(' | '));
const napisPodziel = await page.evaluate(() => {
  const s = window.__game.scene.getScene('bohater');
  let jest = false;
  const przejdz = (l) => l.forEach((o) => { if (o.type === 'Text' && o.text === 'Podziel' && o.visible) jest = true; if (o.list) przejdz(o.list); });
  przejdz(s.children.list);
  return jest;
});
sprawdz('na ekranie bohatera nie ma tabliczki „Podziel"', !napisPodziel);

// Zwykłe przeciągnięcie na puste miejsce PRZENOSI stworka.
let a = await armia();
const pierwszy = kto(a[0]);
await przeciagnij(0, 5);
a = await armia();
sprawdz('zwykłe przeciągnięcie na pusty slot nie otwiera okna', !(await oknoOtwarte()));
sprawdz('zwykłe przeciągnięcie PRZENOSI stworka (z poziomem)', a[0] === null && kto(a[5]) === pierwszy, `${kto(a[0])} → ${kto(a[5])}`);
sprawdz('przeniesienie niczego nie gubi', suma(a) === 3, `${suma(a)}`);

// ---------- Shift, Ctrl i Alt: nic się nie dzieli ----------

await ustaw([
  [0, 0, 12],
  [1, 1, 9],
  [2, 2, 6],
]);
await page.waitForTimeout(400);
let przed = JSON.stringify(await armia());
await przeciagnij(0, 5, 'Shift');
sprawdz('Shift nie otwiera okna podziału', !(await oknoOtwarte()));
a = await armia();
sprawdz('Shift+przeciągnięcie niczego nie rozdziela', JSON.stringify(a) === przed, a.map(kto).join(' '));

await przeciagnij(0, 6, 'Control');
a = await armia();
sprawdz('Ctrl nie odkłada „jednego stworka"', JSON.stringify(a) === przed, a.map(kto).join(' '));
sprawdz('po Shift i Ctrl w każdym slocie dalej jeden stworek', a.every((o) => !o || o.ile === 1));

await przeciagnij(0, 4, 'Alt');
a = await armia();
sprawdz('Alt na pusty slot po prostu przenosi', a[0] === null && kto(a[4]) === pierwszy && suma(a) === 3, `${kto(a[0])} → ${kto(a[4])}`);

// ---------- zamiana ----------

await ustaw([
  [0, 0, 12],
  [3, 1, 9],
]);
await page.waitForTimeout(400);
przed = await armia();
await przeciagnij(0, 3);
a = await armia();
sprawdz('przeciągnięcie na obcy gatunek zamienia sloty', kto(a[3]) === kto(przed[0]) && kto(a[0]) === kto(przed[3]), `${kto(a[0])} ${kto(a[3])}`);
sprawdz('zamiana niczego nie gubi', suma(a) === 2, `${suma(a)}`);

// Ten sam gatunek na dwóch poziomach — to dwie różne postacie, nie stos.
await ustaw([
  [0, 0, 12],
  [2, 0, 8],
]);
await page.waitForTimeout(400);
await przeciagnij(0, 2);
a = await armia();
sprawdz(
  'przeciągnięcie na ten sam gatunek ZAMIENIA (oba zachowują poziom)',
  a[0]?.p === 8 && a[2]?.p === 12 && a[0]?.ile === 1 && a[2]?.ile === 1 && a[0]?.s === a[2]?.s,
  `${kto(a[0])} ${kto(a[2])}`
);

// ---------- klik-klik bez przeciągania ----------

await ustaw([
  [0, 0, 12],
  [1, 1, 5],
]);
await page.waitForTimeout(400);
przed = await armia();
await page.mouse.click(slotX(0), PAS_Y);
await page.waitForTimeout(200);
await page.mouse.click(slotX(1), PAS_Y);
await page.waitForTimeout(300);
a = await armia();
sprawdz('dwa kliknięcia zamieniają sloty bez przeciągania', kto(a[0]) === kto(przed[1]) && kto(a[1]) === kto(przed[0]), `${kto(a[0])} ${kto(a[1])}`);

// ---------- okno stworka ----------

await page.mouse.click(slotX(0), PAS_Y, { button: 'right' });
await page.waitForTimeout(300);
sprawdz('prawy klik w oddział otwiera okno stworka', await oknoOtwarte());
await page.keyboard.press('Escape');
await page.waitForTimeout(300);
sprawdz('Escape zamyka okno stworka, a nie cały ekran', !(await oknoOtwarte()) && (await aktywna()).includes('bohater'));

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
