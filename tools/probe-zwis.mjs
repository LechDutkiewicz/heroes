// Czy mapa przygody NIE zawiesza się tam, gdzie się zawieszała.
//
// Po co osobna sonda, skoro jest `probe-przygoda.mjs`: tamta sprawdzała, czy
// stan gry idzie do przodu, i przez to przepuściła dwa zwisy, które gracz
// zobaczył od razu.
//
//  1. OKNO SKRZYNI POWSTAWAŁO, ALE BYŁO NIEWIDOCZNE. Kamery rysują się
//     w kolejności dodania, a kamera planszy powstaje po głównej — więc mapa
//     zamalowywała okno. Sonda klikała przycisk na ślepo, po wyliczonych
//     współrzędnych, i wszystko jej się zgadzało. Dla gracza gra po prostu
//     przestawała reagować. Dlatego tutaj sprawdzamy nie „czy okno istnieje",
//     tylko „czy któraś kamera rysuje je PO planszy".
//
//  2. DRUGA BITWA W OGÓLE NIE STARTOWAŁA. Phaser używa tej samej instancji
//     sceny przy każdym `scene.start`, a `BattleScene` nie czyściła stanu
//     walki — druga bitwa zaczynała się z oddziałami pierwszej, których widoki
//     już nie żyły. Tamta sonda rozgrywała dokładnie jedną bitwę, więc nie
//     miała jak tego zobaczyć. Tutaj rozgrywamy trzy pod rząd.
//
//   node tools/probe-zwis.mjs [--url http://localhost:4173]

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

/**
 * Czekanie na scenę. Limit jest hojny, bo ekran końca bitwy odlicza 2600 ms
 * CZASU GRY, a nie zegara ściennego — bez sprzętowego rysowania gra chodzi po
 * kilka klatek na sekundę i te 2,6 s rozciąga się do kilkudziesięciu. Przy
 * limicie 20 s sonda ogłaszała zepsuty powrót z bitwy tam, gdzie powrót po
 * prostu jeszcze trwał. Ta sama pułapka złapała już `probe-przygoda`.
 */
const scena = (nazwa) =>
  page.waitForFunction(
    (n) => window.__game?.scene.getScene(n)?.sys.settings.status === 5,
    nazwa,
    { timeout: 120000 }
  );

async function klikNaPlotnie(page, x, y) {
  const p = await page.locator('canvas').boundingBox();
  await page.mouse.click(p.x + x, p.y + y);
}

await page.goto(`${BASE}/?ekran=mapa`, { waitUntil: 'domcontentloaded' });
await scena('adventure');
await page.waitForTimeout(900);

// ---------------------------------------------------------------------------
// 1. Okno skrzyni naprawdę widać
// ---------------------------------------------------------------------------
console.log('\n=== okno skrzyni jest WIDOCZNE ===');

// Wchodzimy na skrzynię kliknięciami, czyli tak, jak robi to gracz.
const skrzynia = await page.evaluate(() => {
  const s = window.__game.scene.getScene('adventure');
  const o = s.stan.obiekty.find((x) => x.rodzaj === 'skrzynia' && !x.artefakt);
  s.stan.bohater.x = o.x;
  s.stan.bohater.y = o.y - 2;
  s.stan.bohater.ruch = 2000;
  s.wysrodkujNaBohaterze(false);
  window.__skrzynia = o;
  return { x: o.x, y: o.y };
});
await page.waitForTimeout(400);
const punkt = await page.evaluate((p) => {
  const s = window.__game.scene.getScene('adventure');
  return {
    x: 8 + p.x * 48 + 24 - (s.kamera?.scrollX ?? 0),
    y: 44 + p.y * 48 + 24 - (s.kamera?.scrollY ?? 0),
  };
}, skrzynia);
await klikNaPlotnie(page, punkt.x, punkt.y); // pierwszy klik: trasa
await page.waitForTimeout(250);
await klikNaPlotnie(page, punkt.x, punkt.y); // drugi klik: marsz
await page.waitForTimeout(1600);

/**
 * Sedno sprawdzenia. `willRender` w Phaserze przepuszcza obiekt do kamery,
 * gdy `(camera.id & obiekt.cameraFilter) === 0`. Sprawdzamy więc wprost, czy
 * okno trafia do kamery stojącej PO kamerze planszy w kolejce rysowania —
 * bo tylko taka narysuje je na wierzchu, a nie pod mapą.
 */
const widocznosc = await page.evaluate(() => {
  const s = window.__game.scene.getScene('adventure');
  const kamery = s.cameras.cameras;
  const iMapy = kamery.indexOf(s.kamera);
  // Okno to wszystko, co siedzi na warstwie nakładek (Z.overlay = 200).
  const okno = s.children.list.filter((o) => o.depth >= 200);
  const widzi = (kam) => okno.length > 0 && okno.every((o) => (kam.id & o.cameraFilter) === 0);
  return {
    czesci: okno.length,
    zajety: s.zajety,
    iMapy,
    naWierzchu: kamery.some((k, i) => i > iMapy && widzi(k)),
    // Mapa NIE ma prawa rysować okna: pojechałoby razem z przewijaniem.
    rysujeJeMapa: widzi(kamery[iMapy]),
  };
});
sprawdz('wejście na skrzynię otwiera okno', widocznosc.czesci > 0 && widocznosc.zajety === true, `${widocznosc.czesci} części`);
sprawdz(
  'okno rysuje kamera stojąca PO planszy, więc widać je na mapie',
  widocznosc.naWierzchu === true,
  widocznosc.naWierzchu ? '' : 'okno chowa się pod planszą'
);
sprawdz('kamera planszy okna NIE rysuje', widocznosc.rysujeJeMapa === false);

// Przycisk musi też działać — okno bez wyjścia to ten sam zwis.
await klikNaPlotnie(page, 8 + 336 + 86, 44 + 288 + 36);
await page.waitForTimeout(600);
const poWyborze = await page.evaluate(() => {
  const s = window.__game.scene.getScene('adventure');
  return {
    zajety: s.zajety,
    zebrana: !!window.__skrzynia.zebrany,
    resztki: s.children.list.filter((o) => o.depth >= 200).length,
  };
});
sprawdz('wybór zamyka okno i oddaje sterowanie', poWyborze.zajety === false && poWyborze.zebrana === true);
sprawdz('po zamknięciu nic z okna nie zostaje na scenie', poWyborze.resztki === 0, `${poWyborze.resztki} obiektów`);

// ---------------------------------------------------------------------------
// 2. Trzy bitwy pod rząd
// ---------------------------------------------------------------------------
console.log('\n=== kolejne bitwy startują ===');
for (const nr of [1, 2, 3]) {
  const cel = await page.evaluate(() => {
    const s = window.__game.scene.getScene('adventure');
    const o = s.stan.obiekty.find((x) => x.rodzaj === 'potwor' && !x.zebrany);
    if (!o) return null;
    s.stan.bohater.x = o.x;
    s.stan.bohater.y = o.y - 1;
    s.stan.bohater.ruch = 2000;
    s.idz([{ x: o.x, y: o.y, koszt: 100 }]);
    return { nazwa: o.nazwa };
  });
  if (!cel) {
    sprawdz(`bitwa ${nr}: jest jeszcze kogo bić`, false, 'skończyli się strażnicy na mapie');
    break;
  }

  let wystartowala = true;
  try {
    await scena('battle');
  } catch {
    wystartowala = false;
  }
  sprawdz(`bitwa ${nr} (${cel.nazwa}) w ogóle startuje`, wystartowala);
  if (!wystartowala) break;

  // Skład musi być świeży: oddziały poprzedniej bitwy nie mają prawa zostać.
  const sklad = await page.evaluate(() => {
    const b = window.__game.scene.getScene('battle');
    return {
      wszystkie: b.units.length,
      gracz: b.units.filter((u) => u.side === 'player').length,
      wrog: b.units.filter((u) => u.side === 'enemy').length,
    };
  });
  sprawdz(
    `bitwa ${nr} zaczyna się od czystego składu`,
    sklad.gracz === 4 && sklad.wrog >= 1 && sklad.wszystkie === sklad.gracz + sklad.wrog,
    `${sklad.gracz} nasze, ${sklad.wrog} wroga`
  );

  await page.waitForTimeout(600);
  await page.evaluate(() => window.__game.scene.getScene('battle').rozstrzygnijNatychmiast(true));
  let wrocilismy = true;
  try {
    await scena('adventure');
  } catch {
    wrocilismy = false;
  }
  sprawdz(`po bitwie ${nr} wracamy na mapę`, wrocilismy);
  if (!wrocilismy) break;
  await page.waitForTimeout(900);
  const po = await page.evaluate(() => window.__game.scene.getScene('adventure').zajety);
  sprawdz(`po bitwie ${nr} da się sterować`, po === false);
}

console.log(`\n${bledy === 0 ? 'Wszystko się zgadza.' : `Błędów: ${bledy}`}`);
await browser.close();
process.exit(bledy === 0 ? 0 : 1);
