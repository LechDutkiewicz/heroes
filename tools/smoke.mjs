// Test dymny: czy scena wytrzymuje całą bitwę bez wywrotki?
//
// Symulator z src/data/battle.ts sprawdza zasady, ale nie dotyka Phasera —
// przepuści błąd, który wywala grę w przeglądarce (brakująca gałąź decyzji,
// tween na zdjętym obiekcie, ikona bez tekstury). Nie miałem nic, co by to
// łapało poza patrzeniem na ekran, więc każdy taki błąd wychodził dopiero
// u gracza.
//
// Ten skrypt gra kilka bitew na przyspieszonym czasie i zgłasza WSZYSTKIE
// błędy JS strony. Za gracza naciska „obronę" — nie o taktykę tu chodzi,
// tylko o to, żeby tury leciały bez ręki człowieka. Bitwa przez to trwa
// dłużej niż normalnie (broniący się oddział znosi o 30% więcej), więc nie
// czekamy na rozstrzygnięcie: wystarczy, że runda rośnie i nic nie pęka.
//
//   npm run preview &   node tools/smoke.mjs

import { chromium } from 'playwright';

const BASE = process.env.SMOKE_URL || 'http://localhost:4173';
const SEEDS = [3, 7, 11, 19];
/** Ile sekund realnego czasu na bitwę. Przy timeScale 12 to sporo rund. */
const BUDZET = 30000;

const browser = await chromium.launch({
  executablePath: process.env.CHROMIUM_PATH || '/opt/pw-browsers/chromium-1194/chrome-linux/chrome',
});
const page = await browser.newPage({ viewport: { width: 1000, height: 900 } });

const bledy = [];
page.on('pageerror', (e) => bledy.push(`pageerror: ${e.message}`));
page.on('console', (m) => {
  // „Failed to load resource" bez adresu to zwykle brak ikony zakładki —
  // brakujące pliki łapiemy niżej, po adresie, więc tutaj je pomijamy.
  if (m.type() === 'error' && !m.text().startsWith('Failed to load resource'))
    bledy.push(`console: ${m.text()}`);
});
page.on('response', (r) => {
  if (r.status() === 404 && !r.url().endsWith('favicon.ico')) bledy.push(`404: ${r.url()}`);
});

const stan = () =>
  page.evaluate(() => {
    const s = window.__game.scene.getScene('battle');
    return { runda: s.battle.round, zywe: s.battle.units.length, koniec: !!s.gameOver };
  });

/**
 * Ile próbek dźwięku faktycznie się wczytało.
 *
 * Czego to NIE sprawdza: czy cokolwiek słychać. Przeglądarka bez karty
 * dźwiękowej i bez gestu użytkownika trzyma kontekst zablokowany, więc
 * liczenie odtworzeń nic by nie powiedziało. Sprawdzamy to, co da się
 * sprawdzić uczciwie: że pliki są pod właściwymi adresami i dają się
 * zdekodować. Zła ścieżka albo zły format wywala się właśnie tutaj,
 * a nie dopiero w uszach gracza.
 */
const probki = () =>
  page.evaluate(() => window.__game.scene.getScene('battle').cache.audio.getKeys().length);

/** Tyle plików leży w public/audio: 12 próbek + podkład muzyczny. */
const PROBEK = 13;

let zleSeedy = 0;
for (const seed of SEEDS) {
  const przed = bledy.length;
  await page.goto(`${BASE}/?seed=${seed}`, { waitUntil: 'domcontentloaded' });
  await page.waitForFunction(
    () => window.__game?.scene.getScene('battle')?.sys.settings.status === 5,
    null,
    { timeout: 30000 }
  );
  await page.evaluate(() => (window.__game.scene.getScene('battle').time.timeScale = 12));

  const start = Date.now();
  let ostatni = await stan();
  while (Date.now() - start < BUDZET && !ostatni.koniec) {
    await page.keyboard.press('o').catch(() => {});
    await page.waitForTimeout(60);
    ostatni = await stan().catch(() => ostatni);
  }

  const dzwieki = await probki().catch(() => 0);
  const nowe = bledy.length - przed;
  // Bitwa nie musi się rozstrzygnąć w budżecie, ale musi się posuwać:
  // brak jakiegokolwiek postępu to zakleszczona kolejka albo martwa tura.
  const stoi = ostatni.runda <= 1 && ostatni.zywe === 12;
  const brakDzwiekow = dzwieki < PROBEK;
  const zle = nowe > 0 || stoi || brakDzwiekow;
  if (zle) zleSeedy++;
  console.log(
    `seed ${String(seed).padStart(2)}: runda ${ostatni.runda}, żywych ${ostatni.zywe}` +
      `${ostatni.koniec ? ', rozstrzygnięta' : ''}` +
      `, próbek ${dzwieki}/${PROBEK}` +
      `  ${zle ? `ŹLE${stoi ? ' (bitwa stoi)' : ''}${brakDzwiekow ? ' (brak próbek)' : ''}` : 'ok'}`
  );
}

await browser.close();

if (bledy.length) {
  console.log(`\n${bledy.length} błędów JS:`);
  for (const b of new Set(bledy)) console.log(`  ${b}`);
}
console.log(zleSeedy ? `\nNIE PRZESZŁO — ${zleSeedy} z ${SEEDS.length} bitew.` : '\nCzysto.');
process.exitCode = zleSeedy ? 1 : 0;
