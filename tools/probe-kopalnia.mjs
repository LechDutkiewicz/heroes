// Czy budynek produkcyjny naprawdę się ZAJMUJE, a nie zbiera.
//
// Po co osobna sonda: różnicę między „zebrałem" a „zająłem" widać wyłącznie
// w tym, co zostaje na mapie i co dzieje się jutro. Zrzut ekranu pokazuje
// jedno i drugie tak samo, dopóki nie zakończy się tury — a wtedy jest już
// za późno, żeby zobaczyć, że sad zniknął.
//
// Sonda przechodzi to grą: wchodzi na sad, sprawdza, że budynek stoi dalej
// i ma chorągiewkę, kończy turę i porównuje stan skarbca.
//
//   node tools/probe-kopalnia.mjs [--url http://localhost:4173]

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

await page.goto(`${BASE}/?ekran=mapa`, { waitUntil: 'domcontentloaded' });
await page.waitForFunction(
  () => window.__game?.scene.getScene('adventure')?.sys.settings.status === 5,
  null,
  { timeout: 30000 }
);
await page.waitForTimeout(900);

// Przenosimy bohatera obok sadu i wchodzimy na niego jednym krokiem —
// chodzi o sprawdzenie mechaniki, nie o przejście całej trasy.
const przed = await page.evaluate(() => {
  const s = window.__game.scene.getScene('adventure');
  const sad = s.stan.obiekty.find((o) => o.rodzaj === 'kopalnia');
  s.stan.bohater.x = sad.x;
  s.stan.bohater.y = sad.y - 1;
  window.__sad = sad;
  return {
    nazwa: sad.nazwa,
    surowiec: sad.surowiec,
    ile: sad.ile,
    nasz: !!sad.nasz,
    skarbiec: { ...s.stan.skarbiec },
  };
});
console.log(`\n=== ${przed.nazwa} (${przed.surowiec}, ${przed.ile}/dzień) ===`);
sprawdz('na starcie budynek jest niczyj', przed.nasz === false);

await page.evaluate(() => {
  const s = window.__game.scene.getScene('adventure');
  const sad = window.__sad;
  s.idz([{ x: sad.x, y: sad.y, koszt: 100 }]);
});
await page.waitForTimeout(1200);

const po = await page.evaluate(() => {
  const s = window.__game.scene.getScene('adventure');
  const sad = window.__sad;
  const kont = s.ikonyObiektow[sad.id];
  const flaga = kont?.getData('flaga');
  return {
    nasz: !!sad.nasz,
    zebrany: !!sad.zebrany,
    stoiNaMapie: !!kont && kont.active && kont.alpha > 0.5,
    flagaWidoczna: !!flaga && flaga.visible,
    skarbiec: { ...s.stan.skarbiec },
    dochodNaPasku: s.dochody[sad.surowiec]?.text ?? '',
  };
});
sprawdz('budynek stał się nasz', po.nasz === true);
sprawdz('NIE został oznaczony jako zebrany', po.zebrany === false);
sprawdz('budynek dalej stoi na mapie', po.stoiNaMapie, po.stoiNaMapie ? '' : 'zniknął — to błąd');
sprawdz('podniosła się chorągiewka', po.flagaWidoczna);
sprawdz(
  'skarbiec NIE zmienił się od samego zajęcia',
  JSON.stringify(po.skarbiec) === JSON.stringify(przed.skarbiec)
);
sprawdz('pasek pokazuje dochód dzienny', po.dochodNaPasku.includes('/dzień'), po.dochodNaPasku);

await page.evaluate(() => window.__game.scene.getScene('adventure').koniecTury());
await page.waitForTimeout(400);

const jutro = await page.evaluate(() => {
  const s = window.__game.scene.getScene('adventure');
  return { skarbiec: { ...s.stan.skarbiec }, ruch: s.stan.bohater.ruch, dzien: s.stan.dzien };
});
const przyrost = jutro.skarbiec[przed.surowiec] - przed.skarbiec[przed.surowiec];
sprawdz(
  'po zakończeniu tury surowiec wpłynął',
  przyrost === przed.ile,
  `przyrost ${przyrost}, oczekiwany ${przed.ile}`
);
sprawdz('nowy dzień odnowił punkty ruchu', jutro.ruch === 700, String(jutro.ruch));
sprawdz('licznik dni ruszył', jutro.dzien === 2, `dzień ${jutro.dzien}`);

await page.locator('canvas').screenshot({ path: 'tools/shots/mapa-kopalnia.png' });
console.log(`\n${bledy === 0 ? 'Wszystko się zgadza.' : `Błędów: ${bledy}`}`);
await browser.close();
process.exit(bledy === 0 ? 0 : 1);
