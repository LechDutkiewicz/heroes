// Profile graczy i sloty zapisu — sprawdzane grą, prawdziwą myszą i klawiaturą.
//
// Scenariusz ze zgłoszenia taty Eli i Janka:
//  - pierwsze uruchomienie pyta „Kto gra?", imię wpisuje się z klawiatury;
//  - Ela zaczyna kampanię, zapisuje w slocie 2 (nadpisanie pyta), autozapis
//    powstaje na początku dnia;
//  - Janek zakłada swój profil i zaczyna SWOJĄ kampanię;
//  - powrót do Eli: jej postęp i zapis są nienaruszone, „Wczytaj grę →
//    Zapisane gry" wczytuje slot 2;
//  - „Nowa gra → Kampania" dla Eli pyta i po „Od nowa" zaczyna od zera
//    (Janek nietknięty, zapisy w slotach zostają);
//  - usunięcie profilu pyta i kasuje jego dane;
//  - migracja: stary pojedynczy zapis i postęp (z imieniem „Ola") trafiają
//    do profilu „Ela" i nic nie przepada.
//
//   node tools/probe-profile.mjs [--url http://localhost:4173] [--dir tools/blind]
//
// Zrzuty: <dir>/profile-*.png (okno profili, menu z profilem, okno zapisu…).

import { chromium } from 'playwright';
import { mkdir } from 'node:fs/promises';
import { scena, czekajNaNapis, klikPrzycisk } from './wynik-wspolne.mjs';

const arg = (n, d) => {
  const i = process.argv.indexOf(n);
  return i !== -1 ? process.argv[i + 1] : d;
};
const BASE = arg('--url', 'http://localhost:4173');
const DIR = arg('--dir', 'tools/blind');
await mkdir(DIR, { recursive: true });

let bledy = 0;
const sprawdz = (co, ok, szczegol = '') => {
  if (!ok) bledy++;
  console.log(`  ${ok ? 'OK  ' : 'ŹLE '} ${co}${szczegol ? ` — ${szczegol}` : ''}`);
};

const browser = await chromium.launch({
  executablePath: process.env.CHROMIUM_PATH || '/opt/pw-browsers/chromium-1194/chrome-linux/chrome',
});

// Środki desek drogowskazu (DESKI/SLUP w MenuScene.ts), jak w zrzut-menu.mjs.
const DESKA = [
  { x: 260, y: 392 },
  { x: 250, y: 464 },
  { x: 250, y: 530 },
  { x: 250, y: 596 },
];

async function nowaStrona() {
  const page = await browser.newPage({ viewport: { width: 960, height: 694 }, deviceScaleFactor: 1 });
  page.on('pageerror', (e) => {
    bledy++;
    console.log('  BŁĄD JS —', String(e));
  });
  page.on('dialog', (d) => {
    bledy++;
    console.log('  NIECHCIANE OKNO PRZEGLĄDARKI —', d.message());
    void d.dismiss();
  });
  return page;
}

const klucz = (id, co) => `heroes-profil-${id}-${co}`;
const czytaj = (page, k) => page.evaluate((x) => JSON.parse(localStorage.getItem(x) ?? 'null'), k);
const surowy = (page, k) => page.evaluate((x) => localStorage.getItem(x), k);
const rejestr = (page) => czytaj(page, 'heroes-profile-v1');
const idGracza = async (page, imie) => (await rejestr(page))?.profile.find((p) => p.imie === imie)?.id;

async function klikXY(page, x, y) {
  const r = await page.locator('canvas').boundingBox();
  await page.mouse.move(r.x + x, r.y + y);
  await page.waitForTimeout(80);
  await page.mouse.click(r.x + x, r.y + y);
}

/**
 * Klik w widoczny napis w scenie — także w kontenerach (okna). Gdy napis
 * jest w kilku miejscach (np. „Zapisz" na pasku i w oknie), wygrywa ten
 * w korzeniu o największej głębokości, czyli okno na wierzchu.
 */
async function klikTekst(page, nazwaSceny, tekst, timeout = 30000) {
  const koniec = Date.now() + timeout;
  let p = null;
  while (Date.now() < koniec) {
    p = await page.evaluate(
      ({ n, t }) => {
        const s = window.__game.scene.getScene(n);
        let naj = null;
        const szukaj = (lista, glebia, alfa) => {
          for (const o of lista) {
            if (!o.visible) continue;
            const a = alfa * (o.alpha ?? 1);
            if (o.type === 'Text' && o.text === t && a > 0.9) {
              const b = o.getBounds();
              if (!naj || glebia >= naj.glebia) naj = { x: b.centerX, y: b.centerY, glebia };
            }
            if (o.type === 'Container') szukaj(o.list, glebia, a);
          }
        };
        for (const o of s.children.list) {
          if (!o.visible) continue;
          if (o.type === 'Text' || o.type === 'Container') szukaj([o], o.depth, 1);
        }
        return naj;
      },
      { n: nazwaSceny, t: tekst }
    );
    if (p) break;
    await page.waitForTimeout(200);
  }
  if (!p) throw new Error(`Brak napisu „${tekst}" w scenie ${nazwaSceny}`);
  await klikXY(page, p.x, p.y);
}

const jestTekst = (page, nazwaSceny, tekst) =>
  page.evaluate(
    ({ n, t }) => {
      const s = window.__game.scene.getScene(n);
      const szukaj = (lista) =>
        lista.some((o) => o.visible && ((o.type === 'Text' && o.text === t) || (o.type === 'Container' && szukaj(o.list))));
      return szukaj(s.children.list);
    },
    { n: nazwaSceny, t: tekst }
  );

async function czekajMenu(page) {
  await scena(page, 'menu');
  await page.waitForFunction(
    () => {
      const s = window.__game.scene.getScene('menu');
      return s.gotowe && !s.zajety;
    },
    null,
    { timeout: 120000 }
  );
}

/** Klik w deskę drogowskazu z danym napisem (czeka, aż deski przestaną się obracać). */
async function deska(page, napis) {
  await page.waitForFunction(
    () => {
      const s = window.__game.scene.getScene('menu');
      return s.gotowe && !s.zajety && !s.okno?.otwarty;
    },
    null,
    { timeout: 60000 }
  );
  const i = await page.evaluate(
    (t) => window.__game.scene.getScene('menu').deski.findIndex((d) => d.pozycja?.napis === t && d.kont.visible),
    napis
  );
  if (i < 0) throw new Error(`Brak deski „${napis}"`);
  await klikXY(page, DESKA[i].x, DESKA[i].y);
  await page.waitForTimeout(150);
}

const napisyDesek = (page) =>
  page.evaluate(() =>
    window.__game.scene
      .getScene('menu')
      .deski.map((d) => (d.pozycja ? `${d.pozycja.napis}${d.pozycja.wlaczona ? '' : ' [x]'}` : '-'))
  );

async function oknoOtwarte(page, czy = true) {
  await page.waitForFunction((c) => !!window.__game.scene.getScene('menu').okno?.otwarty === c, czy, { timeout: 30000 });
  await page.waitForTimeout(500);
}

async function zrzut(page, nazwa) {
  await page.mouse.move(2, 690);
  await page.waitForTimeout(300);
  await page.locator('canvas').screenshot({ path: `${DIR}/${nazwa}` });
  console.log(`  zrzut: ${DIR}/${nazwa}`);
}

/** Z ekranu wyboru trenera do mapy misji 1: trener (klawisz), wstęp pominięty, nagroda i „Graj" z klawiatury. */
async function zacznijMisje1(page, strzalka, nagroda) {
  await scena(page, 'kampania');
  await page.waitForFunction(() => window.__game.scene.getScene('kampania').gotowa, null, { timeout: 60000 });
  await page.waitForTimeout(400);
  await page.keyboard.press(strzalka);
  await page.waitForFunction(() => !!window.__game.scene.getScene('kampania').postep, null, { timeout: 20000 });
  // Wstęp to ilustracja z tekstem — nie on jest tu sprawdzany.
  await page.evaluate(() => window.__game.scene.getScene('kampania').scene.restart());
  await page.waitForFunction(
    () => {
      const s = window.__game.scene.getScene('kampania');
      return s.sys.settings.status === 5 && s.gotowa && !!s.graj;
    },
    null,
    { timeout: 60000 }
  );
  await page.waitForTimeout(300);
  await page.keyboard.press(`Digit${nagroda + 1}`);
  await page.waitForTimeout(200);
  await page.keyboard.press('Enter');
  await scena(page, 'adventure');
  await czekajNaNapis(page, 'adventure', 'Do dzieła!');
  await klikPrzycisk(page, 'adventure', 'Do dzieła!');
  await page.waitForTimeout(400);
}

async function wyjdzZMapy(page) {
  await klikPrzycisk(page, 'adventure', 'Menu');
  await page.waitForTimeout(400);
  await klikPrzycisk(page, 'adventure', 'Wyjdź');
  await czekajMenu(page);
}

// ═════════════════════════════════════════════════════════ rodzina
const page = await nowaStrona();
await page.goto(`${BASE}/`, { waitUntil: 'domcontentloaded' });

console.log('\n=== pierwsze uruchomienie: „Kto gra?" ===');
await czekajMenu(page);
await oknoOtwarte(page);
sprawdz('bez profili menu samo pyta, kto gra', await jestTekst(page, 'menu', 'Kto gra?'));
await page.keyboard.type('Ela');
await page.waitForTimeout(700);
await zrzut(page, 'profile-pierwsze.png');
await page.keyboard.press('Enter');
await oknoOtwarte(page, false);
let r = await rejestr(page);
const ela = await idGracza(page, 'Ela');
sprawdz('imię wpisane z klawiatury zakłada profil i go wybiera', !!ela && r.aktywny === ela, JSON.stringify(r));
await czekajMenu(page);
sprawdz('tabliczka w menu pokazuje gracza', await jestTekst(page, 'menu', 'Gracz: Ela'));
sprawdz('menu główne: Nowa gra, Wczytaj grę (zablokowane), Rekordy, Autorzy', (await napisyDesek(page)).join('|') === 'Nowa gra|Wczytaj grę [x]|Rekordy|Autorzy', (await napisyDesek(page)).join('|'));

console.log('\n=== Ela zaczyna kampanię i zapisuje w slocie 2 ===');
await deska(page, 'Nowa gra');
await deska(page, 'Kampania');
await scena(page, 'kampania');
await page.waitForFunction(() => window.__game.scene.getScene('kampania').gotowa, null, { timeout: 60000 });
sprawdz('ekran wyboru podpowiada imię gracza', await jestTekst(page, 'kampania', 'Ela, kliknij trenera, którym chcesz grać'));
await zacznijMisje1(page, 'ArrowRight', 0);
const postepEli = await czytaj(page, klucz(ela, 'kampania'));
sprawdz('postęp kampanii w profilu Eli (trenerka Ela, nagroda 1)', postepEli?.trener === 'Ela' && postepEli.bonus === 0, JSON.stringify(postepEli));
sprawdz('start misji robi autozapis', (await czytaj(page, klucz(ela, 'zapis-auto')))?.stan?.dzien === 1);
sprawdz('stary klucz postępu nie powstaje', (await surowy(page, 'heroes-kampania-v1')) === null);

// Koniec tury: nowy dzień → autozapis.
await page.evaluate(() => {
  const s = window.__game.scene.getScene('adventure');
  s.stan.dzien = 4;
  s.koniecTury();
});
await page.waitForFunction(() => !window.__game.scene.getScene('adventure').zajety, null, { timeout: 60000 });
await page.waitForTimeout(300);
sprawdz('autozapis na początku dnia (dzień 5)', (await czytaj(page, klucz(ela, 'zapis-auto')))?.stan?.dzien === 5);

await klikPrzycisk(page, 'adventure', 'Zapisz');
await czekajNaNapis(page, 'adventure', 'Zapisz grę');
sprawdz('„Zapisz" otwiera okno z sześcioma slotami', await jestTekst(page, 'adventure', 'Zapis 6 — pusty'));
await klikTekst(page, 'adventure', 'Zapis 2 — pusty');
await page.waitForTimeout(500);
await zrzut(page, 'profile-zapis.png');
await klikTekst(page, 'adventure', 'Zapisz');
await page.waitForTimeout(500);
const slot2 = await czytaj(page, klucz(ela, 'zapis-2'));
sprawdz('zapis w slocie 2 profilu Eli (dzień 5, misja 1)', slot2?.stan?.dzien === 5 && slot2.stan.misja === 'pierwsze-kroki', `${slot2?.stan?.dzien} ${slot2?.stan?.misja}`);
sprawdz('okno zapisu zamknięte, mapa znów steruje', await page.evaluate(() => !window.__game.scene.getScene('adventure').zajety));

// Nadpisanie pyta; „Nie" nic nie zmienia.
await page.evaluate(() => (window.__game.scene.getScene('adventure').stan.dzien = 7));
await klikPrzycisk(page, 'adventure', 'Zapisz');
await czekajNaNapis(page, 'adventure', 'Zapisz grę');
await klikTekst(page, 'adventure', '1. Pierwsze kroki');
await page.waitForTimeout(400);
await klikTekst(page, 'adventure', 'Zapisz');
await czekajNaNapis(page, 'adventure', 'Nadpisać zapis?');
sprawdz('zajęty slot: pytanie o nadpisanie', true);
await zrzut(page, 'profile-nadpisz.png');
await klikTekst(page, 'adventure', 'Nie');
await page.waitForTimeout(300);
sprawdz('„Nie" zostawia stary zapis', (await czytaj(page, klucz(ela, 'zapis-2')))?.stan?.dzien === 5);
await page.keyboard.press('Escape');
await page.waitForTimeout(300);
sprawdz('Escape zamyka okno zapisu', await page.evaluate(() => !window.__game.scene.getScene('adventure').zajety));
await page.evaluate(() => (window.__game.scene.getScene('adventure').stan.dzien = 5));
await wyjdzZMapy(page);

console.log('\n=== Janek zakłada swój profil i zaczyna swoją kampanię ===');
const przedJankiem = {
  postep: await surowy(page, klucz(ela, 'kampania')),
  slot2: await surowy(page, klucz(ela, 'zapis-2')),
};
await klikTekst(page, 'menu', 'Gracz: Ela');
await oknoOtwarte(page);
await klikTekst(page, 'menu', '+  Nowy gracz');
await page.waitForTimeout(300);
await page.keyboard.type('Janek');
await page.keyboard.press('Enter');
await oknoOtwarte(page, false);
const janek = await idGracza(page, 'Janek');
sprawdz('profil Janka aktywny', (await rejestr(page)).aktywny === janek);
await czekajMenu(page);
await page.waitForTimeout(600);
sprawdz('tabliczka: Gracz: Janek', await jestTekst(page, 'menu', 'Gracz: Janek'));
sprawdz('Janek nie widzi gier Eli (Wczytaj zablokowane)', (await napisyDesek(page))[1] === 'Wczytaj grę [x]', (await napisyDesek(page)).join('|'));
await deska(page, 'Nowa gra');
await deska(page, 'Kampania');
await zacznijMisje1(page, 'ArrowLeft', 1);
const postepJanka = await czytaj(page, klucz(janek, 'kampania'));
sprawdz('Janek ma własną kampanię (trener Janek, nagroda 2)', postepJanka?.trener === 'Janek' && postepJanka.bonus === 1, JSON.stringify(postepJanka));
await wyjdzZMapy(page);

console.log('\n=== powrót do Eli: wszystko na miejscu ===');
await klikTekst(page, 'menu', 'Gracz: Janek');
await oknoOtwarte(page);
await zrzut(page, 'profile-okno.png');
await klikTekst(page, 'menu', 'Ela');
await oknoOtwarte(page, false);
sprawdz('Ela znów aktywna', (await rejestr(page)).aktywny === ela);
sprawdz('postęp Eli nienaruszony', (await surowy(page, klucz(ela, 'kampania'))) === przedJankiem.postep);
sprawdz('slot 2 Eli nienaruszony', (await surowy(page, klucz(ela, 'zapis-2'))) === przedJankiem.slot2);
await czekajMenu(page);
await page.waitForTimeout(700);
await zrzut(page, 'profile-menu.png');
await deska(page, 'Wczytaj grę');
await page.waitForTimeout(500);
sprawdz('podmenu: Kontynuuj, Zapisane gry, Kampania, Wróć', (await napisyDesek(page)).join('|') === 'Kontynuuj|Zapisane gry|Kampania|Wróć', (await napisyDesek(page)).join('|'));
await deska(page, 'Zapisane gry');
await oknoOtwarte(page);
await klikTekst(page, 'menu', '1. Pierwsze kroki');
await page.waitForTimeout(400);
await zrzut(page, 'profile-wczytaj.png');
await klikTekst(page, 'menu', 'Wczytaj');
await scena(page, 'adventure');
await page.waitForTimeout(500);
let st = await page.evaluate(() => {
  const s = window.__game.scene.getScene('adventure').stan;
  return { dzien: s.dzien, misja: s.misja, imie: s.bohater.imie };
});
sprawdz('„Zapisane gry" wczytuje slot 2 Eli', st.dzien === 5 && st.misja === 'pierwsze-kroki' && st.imie === 'Ela', JSON.stringify(st));
await wyjdzZMapy(page);

console.log('\n=== „Nowa gra → Kampania" dla Eli: pytanie i start od zera ===');
await deska(page, 'Nowa gra');
await deska(page, 'Kampania');
await oknoOtwarte(page);
sprawdz('trwająca kampania: pytanie „Zacząć od nowa?"', await jestTekst(page, 'menu', 'Zacząć od nowa?'));
await zrzut(page, 'profile-nowa.png');
await klikTekst(page, 'menu', 'Anuluj');
await oknoOtwarte(page, false);
sprawdz('„Anuluj" nic nie kasuje', (await surowy(page, klucz(ela, 'kampania'))) === przedJankiem.postep);
await deska(page, 'Kampania');
await oknoOtwarte(page);
await klikTekst(page, 'menu', 'Od nowa');
await scena(page, 'kampania');
await page.waitForFunction(() => window.__game.scene.getScene('kampania').gotowa, null, { timeout: 60000 });
sprawdz('po „Od nowa" ekran wyboru trenera (postęp Eli skasowany)', (await surowy(page, klucz(ela, 'kampania'))) === null && (await page.evaluate(() => !window.__game.scene.getScene('kampania').postep)));
sprawdz('autozapis starej kampanii skasowany', (await surowy(page, klucz(ela, 'zapis-auto'))) === null);
sprawdz('slot 2 Eli zostaje (zapisy to wybór gracza)', (await surowy(page, klucz(ela, 'zapis-2'))) === przedJankiem.slot2);
sprawdz('kampania Janka nietknięta', (await czytaj(page, klucz(janek, 'kampania')))?.bonus === 1);
await page.keyboard.press('Escape');
await czekajMenu(page);

console.log('\n=== usunięcie profilu ===');
await klikTekst(page, 'menu', 'Gracz: Ela');
await oknoOtwarte(page);
// Krzyżyk w wierszu Janka: prawy brzeg wiersza, na wysokości imienia.
const wiersz = await page.evaluate(() => {
  const s = window.__game.scene.getScene('menu');
  let wynik = null;
  const szukaj = (l) =>
    l.forEach((o) => {
      if (o.type === 'Text' && o.text === 'Janek') wynik = o.getBounds();
      if (o.type === 'Container') szukaj(o.list);
    });
  szukaj(s.children.list);
  return wynik && { y: wynik.y + 18 };
});
await klikXY(page, 185 + 20 + 550 - 20, wiersz.y);
await czekajNaNapis(page, 'menu', 'Usunąć gracza?');
await klikTekst(page, 'menu', 'Usuń gracza');
await page.waitForTimeout(500);
r = await rejestr(page);
const zostalo = await page.evaluate((id) => Object.keys(localStorage).filter((k) => k.includes(id)), janek);
sprawdz('profil Janka usunięty razem z danymi', !r.profile.some((p) => p.id === janek) && zostalo.length === 0, JSON.stringify(zostalo));
sprawdz('Ela została i dalej gra', r.aktywny === ela);
await page.keyboard.press('Escape');
await page.close();

// ═════════════════════════════════════════════════════════ migracja
console.log('\n=== migracja starego zapisu (Ola → Ela) ===');
const stara = await nowaStrona();
await stara.goto(`${BASE}/?ekran=bitwa`, { waitUntil: 'domcontentloaded' });
await scena(stara, 'battle');
const staryPostep = {
  kampania: 'ksiezycowa-grota',
  trener: 'Ola',
  ukonczone: ['pierwsze-kroki'],
  wyniki: { 'pierwsze-kroki': { dni: 12, punkty: 835 } },
  bonus: 2,
  bohater: { imie: 'Ola', atak: 3, obrona: 2, artefakty: ['pazur'], doswiadczenie: 700, umiejetnosci: {}, poziomOdebrany: 1 },
};
await stara.evaluate((p) => {
  localStorage.clear();
  localStorage.setItem('heroes-kampania-v1', JSON.stringify(p));
  const K = window.__kampania;
  const s = K.rozpocznijMisje(p, K.misjaPoId('klucze-do-przeleczy'), 2);
  s.dzien = 9;
  localStorage.setItem('heroes-zapis-mapy-v1', JSON.stringify(s));
}, staryPostep);
await stara.goto(`${BASE}/`, { waitUntil: 'domcontentloaded' });
await czekajMenu(stara);
await stara.waitForTimeout(800);
r = await rejestr(stara);
const przeniesiony = r?.profile.find((p) => p.id === r.aktywny);
sprawdz('stare dane w profilu nazwanym jak trenerka: „Ela"', przeniesiony?.imie === 'Ela', JSON.stringify(r));
sprawdz('bez pytania „Kto gra?" (profil już jest)', await stara.evaluate(() => !window.__game.scene.getScene('menu').okno?.otwarty));
const pM = await czytaj(stara, klucz(przeniesiony.id, 'kampania'));
sprawdz(
  'postęp przeniesiony w całości, Ola → Ela',
  pM?.trener === 'Ela' && pM.bohater?.imie === 'Ela' && pM.ukonczone?.[0] === 'pierwsze-kroki' && pM.wyniki?.['pierwsze-kroki']?.punkty === 835 && pM.bonus === 2,
  JSON.stringify(pM)
);
const zM = await czytaj(stara, klucz(przeniesiony.id, 'zapis-1'));
sprawdz('zapis mapy w slocie 1, Ola → Ela', zM?.stan?.dzien === 9 && zM.stan.bohater.imie === 'Ela' && zM.przeniesiony === true, `${zM?.stan?.dzien} ${zM?.stan?.bohater?.imie}`);
sprawdz(
  'stare klucze usunięte dopiero po przeniesieniu',
  (await surowy(stara, 'heroes-kampania-v1')) === null && (await surowy(stara, 'heroes-zapis-mapy-v1')) === null
);
sprawdz('tabliczka: Gracz: Ela', await jestTekst(stara, 'menu', 'Gracz: Ela'));
await deska(stara, 'Wczytaj grę');
await stara.waitForTimeout(500);
const podpis = await stara.evaluate(() => window.__game.scene.getScene('menu').deski[0].pozycja?.podpis);
sprawdz('„Kontynuuj" wskazuje przeniesiony zapis', podpis === '2. Klucze do przełęczy, dzień 9', podpis);
await deska(stara, 'Kontynuuj');
await scena(stara, 'adventure');
await stara.waitForTimeout(500);
st = await stara.evaluate(() => {
  const s = window.__game.scene.getScene('adventure').stan;
  return { dzien: s.dzien, misja: s.misja, imie: s.bohater.imie };
});
sprawdz('„Kontynuuj" wczytuje przeniesioną grę', st.dzien === 9 && st.misja === 'klucze-do-przeleczy' && st.imie === 'Ela', JSON.stringify(st));
await stara.close();

console.log(`\n${bledy === 0 ? 'WSZYSTKO OK' : `BŁĘDÓW: ${bledy}`}`);
await browser.close();
process.exit(bledy ? 1 : 0);
