// Czy ROZBUDOWĘ da się kliknąć — i czy coś z niej wynika.
//
// Po co: drzewko budynków przez cały czas istniało jako dane, których żaden
// ekran nie pokazywał. Sondy na danych (`probe-zamki`, `probe-ekonomia`) tego
// nie widzą, bo liczą to samo drzewko z boku. Ta sonda sprawdza jedyną rzecz,
// której nie da się sprawdzić inaczej: czy gracz naprawdę może postawić
// budynek i czy miasto po tym daje więcej.
//
//   node tools/probe-rozbudowa.mjs   (wymaga `npm run preview`)

import { chromium } from 'playwright';

let bledy = 0;
const sprawdz = (co, ok, szczegol = '') => {
  if (!ok) bledy++;
  console.log(`  ${ok ? 'OK  ' : 'ŹLE '} ${co}${szczegol ? ` — ${szczegol}` : ''}`);
};

const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
const page = await browser.newPage({ viewport: { width: 960, height: 720 } });
const bledyJs = [];
page.on('pageerror', (e) => bledyJs.push(String(e)));

await page.goto('http://localhost:4173/?ekran=mapa', { waitUntil: 'domcontentloaded' });
await page.waitForFunction(() => window.__game?.scene?.isActive('adventure'), null, {
  timeout: 30000,
});

// Wchodzimy do własnego zamku tak, jak robi to gra: przez rejestr scen.
const otwarty = await page.evaluate(() => {
  const g = window.__game;
  const s = g.scene.getScene('adventure');
  const zamek = s.stan.obiekty.find((o) => o.rodzaj === 'zamek' && o.nasz);
  // Skarbiec z zapasem — sonda sprawdza mechanikę budowania, nie oszczędzanie.
  s.stan.skarbiec.pokeball = 500;
  s.stan.skarbiec.odlamek = 50;
  s.stan.skarbiec.jagoda = 50;
  g.registry.set('stan-mapy', s.stan);
  g.registry.set('otwarty-zamek', zamek.id);
  s.scene.start('zamek');
  return { id: zamek.id, stalo: [...(zamek.postawione ?? [])] };
});
await page.waitForFunction(() => window.__game.scene.isActive('zamek'), null, { timeout: 30000 });
console.log('\n=== ekran miasta ===');
sprawdz('miasto startowe ma już jakieś budynki', otwarty.stalo.length > 0, otwarty.stalo.join(', '));

const przed = await page.evaluate(() => {
  const s = window.__game.scene.getScene('zamek');
  return { budynkow: s.wierszeBudowy.length, stoi: [...s.zamek.postawione] };
});
sprawdz('ekran miasta pokazuje, co można postawić', przed.budynkow > 0, `${przed.budynkow} obiektów w liście`);

// Kliknięcie prawdziwym kursorem: przycisk „Buduj" pierwszego wiersza.
const pozycja = await page.evaluate(() => {
  const s = window.__game.scene.getScene('zamek');
  return { x: s.scale.width - 58 - 14 + 28, y: 334 };
});
await page.mouse.click(pozycja.x, pozycja.y);
await page.waitForTimeout(300);

const wynik = await page.evaluate(() => {
  const s = window.__game.scene.getScene('zamek');
  return {
    stoi: s.zamek.postawione.length,
    pokeball: s.stan.skarbiec.pokeball,
    komunikat: s.komunikat.text,
  };
});
sprawdz(
  'kliknięcie „Buduj" naprawdę stawia budynek',
  wynik.stoi === przed.stoi.length + 1,
  `${przed.stoi.length} → ${wynik.stoi}; „${wynik.komunikat}"`
);
sprawdz('budowa kosztuje pokeballe', wynik.pokeball < 500, `zostało ${wynik.pokeball}`);

// --- dochód z miasta wpływa do skarbca ---
console.log('\n=== dochód z miasta ===');
const tura = await page.evaluate(async () => {
  const g = window.__game;
  const s = g.scene.getScene('zamek');
  g.registry.set('stan-mapy', s.stan);
  s.scene.start('adventure');
  await new Promise((r) => setTimeout(r, 900));
  const a = g.scene.getScene('adventure');
  const przed = a.stan.skarbiec.pokeball;
  // Kończymy dzień tak, jak robi to przycisk na mapie.
  a.koniecTury();
  await new Promise((r) => setTimeout(r, 900));
  return { przed, po: a.stan.skarbiec.pokeball };
});
sprawdz(
  'po zakończeniu dnia dochód z miasta wpływa do skarbca',
  tura.po > tura.przed,
  `${tura.przed} → ${tura.po}`
);

sprawdz('bez błędów JavaScriptu', bledyJs.length === 0, bledyJs.join(' | '));

await browser.close();
console.log(bledy === 0 ? '\nROZBUDOWA DZIAŁA' : `\nBŁĘDÓW: ${bledy}`);
process.exit(bledy === 0 ? 0 : 1);
