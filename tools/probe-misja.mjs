// Czy misja kampanii ma początek i koniec — sprawdzane grą, od startu misji
// do zapisu postępu, a nie po zrzutach.
//
// Co tu się psuło albo mogło psuć, i dlatego jest sprawdzane wprost:
//  - okno warunków powstaje, ale rysuje je kamera POD planszą (patrz
//    „Znalezione przy dwóch zwisach" w STAN.md) — pytamy o kamery, nie o istnienie;
//  - zwycięstwo pokazuje ekran, ale „Dalej" nie zapisuje postępu albo gubi
//    bohatera, i następna misja startuje od zera;
//  - „Spróbuj jeszcze raz" daje bonus drugi raz albo zaczyna na starym stanie;
//  - koniec kampanii nie dopisuje rekordu;
//  - gra pojedyncza (bez misji) nie kończy się wcale.
//
//   node tools/probe-misja.mjs [--url http://localhost:4173]

import { chromium } from 'playwright';
import {
  KLUCZ_REKORDOW,
  POSTEP_PRZED_OSTATNIA,
  aktywne,
  czekajNaNapis,
  czytajPostep,
  gdziePrzycisk,
  klikPrzycisk,
  scena,
  startMisji,
  usunPostep,
  wymusWygrana,
} from './wynik-wspolne.mjs';
import { zamknijAwans } from './sonda-wspolne.mjs';

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

const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome' });
const page = await browser.newPage({ viewport: { width: 1000, height: 760 } });
page.on('pageerror', (e) => {
  bledy++;
  console.log('  BŁĄD JS —', String(e));
});

// Postęp aktywnego profilu gracza (src/data/profile.ts) — nie jeden globalny klucz.
const postep = () => czytajPostep(page);
const stanMapy = () =>
  page.evaluate(() => {
    const s = window.__game.scene.getScene('adventure');
    const st = s.stan;
    return {
      misja: st.misja,
      dzien: st.dzien,
      warunkiPokazane: !!st.warunkiPokazane,
      zajety: s.zajety,
      atak: st.bohater.atak,
      artefakty: [...st.bohater.artefakty],
      doswiadczenie: st.bohater.doswiadczenie,
      pokeballe: st.skarbiec.pokeball,
      mojeZamki: st.obiekty.filter((o) => o.rodzaj === 'zamek' && o.wlasciciel === 'gracz').length,
    };
  });

/** Czy okno z tym przyciskiem rysuje kamera stojąca PO planszy — i tylko ona. */
const oknoWidac = (napis) =>
  page.evaluate((t) => {
    const s = window.__game.scene.getScene('adventure');
    const przycisk = s.children.list.find(
      (o) => o.type === 'Container' && o.list.some((c) => c.type === 'Text' && c.text === t)
    );
    if (!przycisk) return { jest: false };
    const widzi = (kam) => (kam.id & przycisk.cameraFilter) === 0;
    return {
      jest: true,
      okien: widzi(s.kameraOkien),
      planszy: widzi(s.kamera),
      glownej: widzi(s.cameras.main),
    };
  }, napis);

await page.goto(`${BASE}/?ekran=mapa`, { waitUntil: 'domcontentloaded' });
await scena(page, 'adventure');
await usunPostep(page);
await page.evaluate((k) => localStorage.removeItem(k), KLUCZ_REKORDOW);

// ————————————————————————————————————————————— start misji 1
console.log('\n=== start misji 1 przez rozpocznijMisje ===');
await startMisji(page, 'pierwsze-kroki', { trener: 'Janek', bonus: 0 });
let st = await stanMapy();
sprawdz('mapa niesie misję', st.misja === 'pierwsze-kroki', st.misja);
await czekajNaNapis(page, 'adventure', 'Pierwsze kroki');
let okno = await oknoWidac('Do dzieła!');
sprawdz('okno warunków pokazuje się samo na starcie', okno.jest);
sprawdz('okno warunków rysuje kamera PO planszy', okno.okien && !okno.planszy && !okno.glownej, JSON.stringify(okno));
st = await stanMapy();
sprawdz('okno blokuje mapę, dopóki jest otwarte', st.zajety === true);
await klikPrzycisk(page, 'adventure', 'Do dzieła!');
await page.waitForTimeout(400);
st = await stanMapy();
sprawdz('„Do dzieła!" zamyka okno i oddaje sterowanie', !st.zajety && st.warunkiPokazane);

// Powrót na mapę (np. z bitwy albo miasta) nie pokazuje okna drugi raz.
await page.evaluate(() => window.__game.scene.getScene('adventure').scene.restart());
await scena(page, 'adventure');
await page.waitForTimeout(1500);
sprawdz('po powrocie na mapę okno nie wyskakuje drugi raz', !(await gdziePrzycisk(page, 'adventure', 'Do dzieła!')));

await page.keyboard.press('c');
await czekajNaNapis(page, 'adventure', 'Graj dalej').catch(() => {});
sprawdz('klawisz C otwiera cele ponownie', !!(await gdziePrzycisk(page, 'adventure', 'Graj dalej')));
await klikPrzycisk(page, 'adventure', 'Graj dalej');
await page.waitForTimeout(300);
await klikPrzycisk(page, 'adventure', 'Cele (C)');
await page.waitForTimeout(500);
sprawdz('przycisk „Cele" otwiera cele ponownie', !!(await gdziePrzycisk(page, 'adventure', 'Graj dalej')));
await klikPrzycisk(page, 'adventure', 'Graj dalej');
await page.waitForTimeout(300);

// ————————————————————————————————————————————— zwycięstwo
console.log('\n=== zwycięstwo → wynik → Dalej → postęp ===');
await page.evaluate(() => {
  window.__game.scene.getScene('adventure').stan.dzien = 12;
});
await wymusWygrana(page, { artefakty: ['pazur'], doswiadczenie: 700 });
const zablokowana = await page.evaluate(() => {
  const s = window.__game.scene.getScene('adventure');
  return s.rozstrzygnieta && !s.input.enabled;
});
sprawdz('rozstrzygnięcie blokuje wejście na mapie', zablokowana);
await czekajNaNapis(page, 'adventure', 'Zwycięstwo!');
sprawdz('baner „Zwycięstwo!" widać nad mapą', true);
await scena(page, 'wynik');
const dane = await page.evaluate(() => window.__game.scene.getScene('wynik').dane.rozstrzygniecie);
sprawdz('ekran wyniku dostał zwycięstwo', dane === 'wygrana', dane);
sprawdz(
  'skończona gra zniknęła z rejestru',
  await page.evaluate(() => !window.__game.registry.has('stan-mapy'))
);
await klikPrzycisk(page, 'wynik', 'Dalej');
await scena(page, 'kampania');
let p = await postep();
sprawdz('misja 1 w ukończonych', p?.ukonczone?.includes('pierwsze-kroki'), JSON.stringify(p?.ukonczone));
sprawdz(
  'wynik misji: dni i punkty',
  p?.wyniki?.['pierwsze-kroki']?.dni === 12 && p.wyniki['pierwsze-kroki'].punkty === 1000 - 11 * 15,
  JSON.stringify(p?.wyniki)
);
sprawdz(
  'bohater przeniesiony (artefakt i doświadczenie)',
  p?.bohater?.artefakty?.includes('pazur') && p.bohater.doswiadczenie === 700,
  JSON.stringify(p?.bohater)
);
sprawdz('wybór bonusu wyczyszczony', p?.bonus === undefined);
sprawdz('po „Dalej" aktywny ekran kampanii', (await aktywne(page)).includes('kampania'));

// ————————————————————————————————————————————— porażka i powtórka
console.log('\n=== misja 2: porażka → Spróbuj jeszcze raz ===');
await startMisji(page, 'klucze-do-przeleczy', { ...p, bonus: 1 });
st = await stanMapy();
const atakNaStarcie = st.atak;
sprawdz('misja 2 startuje z bohaterem z misji 1', st.artefakty.includes('pazur') && st.doswiadczenie === 700);
await czekajNaNapis(page, 'adventure', 'Klucze do przełęczy');
// Bohater przyszedł z 700 dośw. i odebranym poziomem 1 — awans czeka. Ma
// wyskoczyć DOPIERO po warunkach, a nie zamiast nich.
const oknoAwansu = () =>
  page.evaluate(() =>
    window.__game.scene
      .getScene('adventure')
      .children.list.some(
        (o) => o.type === 'Container' && o.list?.some((x) => x.type === 'Text' && /Naucz się|Ulepsz/.test(x.text))
      )
  );
sprawdz('nieodebrany awans nie zasłania warunków misji', !(await oknoAwansu()));
await klikPrzycisk(page, 'adventure', 'Do dzieła!');
await page.waitForTimeout(800);
sprawdz('awans wyskakuje po zamknięciu warunków', await oknoAwansu());
await zamknijAwans(page);
await page.waitForTimeout(300);
// Tak, jak robi to gra: przeciwnik ma zamek gracza, a koniec tury to wykrywa.
await page.evaluate(() => {
  const s = window.__game.scene.getScene('adventure');
  for (const o of s.stan.obiekty) if (o.rodzaj === 'zamek' && o.wlasciciel === 'gracz') o.wlasciciel = 'wrog';
  s.koniecTury();
});
await czekajNaNapis(page, 'adventure', 'Koniec wyprawy');
sprawdz('koniec tury wykrywa utratę ostatniego zamku', true);
await scena(page, 'wynik');
sprawdz(
  'ekran wyniku dostał porażkę',
  (await page.evaluate(() => window.__game.scene.getScene('wynik').dane.rozstrzygniecie)) === 'przegrana'
);
await klikPrzycisk(page, 'wynik', 'Spróbuj jeszcze raz');
await scena(page, 'adventure');
await page.waitForTimeout(500);
st = await stanMapy();
sprawdz('powtórka: ta sama misja od dnia 1', st.misja === 'klucze-do-przeleczy' && st.dzien === 1, `${st.misja} d${st.dzien}`);
sprawdz('powtórka: zamek znów jest gracza', st.mojeZamki >= 1);
sprawdz('powtórka: bonus policzony raz, nie dwa', st.atak === atakNaStarcie, `${st.atak} vs ${atakNaStarcie}`);
sprawdz('powtórka: bohater dalej ma swój dorobek', st.artefakty.includes('pazur'));
sprawdz('powtórka: okno warunków znów na starcie', !st.warunkiPokazane);
await czekajNaNapis(page, 'adventure', 'Do dzieła!').catch(() => {});
await klikPrzycisk(page, 'adventure', 'Do dzieła!');
await page.waitForTimeout(300);

// ————————————————————————————————————————————— koniec kampanii
console.log('\n=== ostatnia misja → zakończenie → Sala sław ===');
await startMisji(page, 'oblezenie-groty', POSTEP_PRZED_OSTATNIA, { bezWarunkow: true });
await page.evaluate(() => {
  window.__game.scene.getScene('adventure').stan.dzien = 10;
});
await wymusWygrana(page);
await scena(page, 'wynik');
await klikPrzycisk(page, 'wynik', 'Zakończenie');
await czekajNaNapis(page, 'wynik', 'Sala sław');
p = await postep();
sprawdz('cała kampania w ukończonych', p?.ukonczone?.length === 4, JSON.stringify(p?.ukonczone));
const rekordy = await page.evaluate((k) => JSON.parse(localStorage.getItem(k) ?? '[]'), KLUCZ_REKORDOW);
const suma = 805 + 670 + 730 + (1000 - 9 * 15);
sprawdz(
  'rekord dopisany z sumą punktów wszystkich misji',
  rekordy.some((r) => r.imie === 'Janek' && r.punkty === suma),
  JSON.stringify(rekordy)
);
await klikPrzycisk(page, 'wynik', 'Sala sław');
await czekajNaNapis(page, 'wynik', 'Menu główne').catch(() => {});
sprawdz('Sala sław ma przycisk do menu', !!(await gdziePrzycisk(page, 'wynik', 'Menu główne')));
await klikPrzycisk(page, 'wynik', 'Menu główne');
await scena(page, 'menu');
sprawdz('„Menu główne" prowadzi do menu', (await aktywne(page)).includes('menu'));

// ————————————————————————————————————————————— gra pojedyncza i wyjście do menu
console.log('\n=== gra pojedyncza: koniec i nowa gra; wyjście do menu z mapy ===');
await page.goto(`${BASE}/?ekran=mapa`, { waitUntil: 'domcontentloaded' });
await scena(page, 'adventure');
await page.waitForTimeout(800);
sprawdz('gra pojedyncza nie pokazuje okna warunków sama', !(await gdziePrzycisk(page, 'adventure', 'Do dzieła!')));
await wymusWygrana(page);
await scena(page, 'wynik');
await klikPrzycisk(page, 'wynik', 'Zagraj jeszcze raz');
await scena(page, 'adventure');
await page.waitForTimeout(500);
st = await stanMapy();
sprawdz('„Zagraj jeszcze raz" daje świeżą planszę', !st.misja && st.dzien === 1 && st.mojeZamki === 1);

await klikPrzycisk(page, 'adventure', 'Menu');
await page.waitForTimeout(500);
okno = await oknoWidac('Zostań');
sprawdz('pytanie o wyjście widać nad mapą', okno.jest && okno.okien && !okno.planszy);
await klikPrzycisk(page, 'adventure', 'Zostań');
await page.waitForTimeout(300);
st = await stanMapy();
sprawdz('„Zostań" wraca do gry', !st.zajety && !(await gdziePrzycisk(page, 'adventure', 'Zostań')));
await klikPrzycisk(page, 'adventure', 'Menu');
await page.waitForTimeout(400);
await klikPrzycisk(page, 'adventure', 'Wyjdź');
await scena(page, 'menu');
sprawdz('„Wyjdź" prowadzi do menu głównego', (await aktywne(page)).includes('menu'));

console.log(`\n${bledy === 0 ? 'WSZYSTKO OK' : `BŁĘDÓW: ${bledy}`}`);
await browser.close();
process.exit(bledy ? 1 : 0);
