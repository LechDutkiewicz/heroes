// Sonda awansu: czy wygrana bitwa NAPRAWDĘ pokazuje okno wyboru umiejętności
// i czy kliknięcie w kartę coś daje.
//
// Po co przez przeglądarkę, skoro `probe-umiejetnosci.ts` sprawdza już samą
// ofertę: tamta sonda sprawdza arytmetykę doboru kart, a ta — czy do okna
// w ogóle da się dojść drogą gracza. Na tym już raz poległa ta gra: okno
// skrzyni powstawało, przyjmowało kliknięcia i było NIEWIDOCZNE, bo kamera
// planszy zamalowywała je w tej samej klatce. Sonda licząca stan gry nie
// zauważyła niczego.
//
//   node tools/probe-awans.mjs [--url http://localhost:4173]

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

const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
const page = await browser.newPage({ viewport: { width: 960, height: 694 } });
const bledyJs = [];
page.on('pageerror', (e) => bledyJs.push(String(e)));

const scena = (n) =>
  page.waitForFunction((x) => window.__game?.scene.getScene(x)?.sys.settings.status === 5, n, {
    timeout: 90000,
  });

await page.goto(`${BASE}/?ekran=mapa`, { waitUntil: 'domcontentloaded' });
await scena('adventure');
await page.waitForTimeout(700);

// Ustawiamy doświadczenie tuż pod progiem, żeby jedna wygrana bitwa na pewno
// dała awans. Progi rosną, więc liczenie „ile bitew" na sztywno rozjechałoby
// się przy pierwszej zmianie wzoru.
const przed = await page.evaluate(() => {
  const s = window.__game.scene.getScene('adventure');
  const b = s.stan.bohater;
  b.doswiadczenie = 95; // próg pierwszego awansu to 100
  b.umiejetnosci = {};
  const o = s.stan.obiekty.find((x) => x.rodzaj === 'potwor' && !x.zebrany);
  b.x = o.x;
  b.y = o.y - 1;
  b.ruch = 2000;
  s.zajety = false;
  s.idz([{ x: o.x, y: o.y, koszt: 100 }]);
  return { dosw: b.doswiadczenie, umiejetnosci: Object.keys(b.umiejetnosci).length };
});
sprawdz('start bez umiejętności', przed.umiejetnosci === 0);

await page.waitForTimeout(1400);
await scena('battle');
await page.evaluate(() => window.__game.scene.getScene('battle').rozstrzygnijNatychmiast(true));
await scena('adventure');

// Okno awansu wchodzi z opóźnieniem (najpierw napis o zwycięstwie).
await page.waitForFunction(() => window.__game.scene.getScene('adventure').zajety === true, null, {
  timeout: 15000,
});
await page.waitForTimeout(2600);

const okno = await page.evaluate(() => {
  const s = window.__game.scene.getScene('adventure');
  // Szukamy napisów okna wśród obiektów sceny — i sprawdzamy, czy trafiają do
  // kamery rysowanej PO planszy. Samo istnienie obiektu nic nie znaczy, jeśli
  // mapa go zamalowuje.
  const teksty = s.children.list.filter((o) => o.type === 'Text' && o.text);
  const naglowek = teksty.find((t) => t.text.startsWith('AWANS NA POZIOM'));
  const karty = teksty.filter((t) => t.text === 'NOWA' || t.text === 'ULEPSZENIE');
  // Okno musi trafić do kamery rysowanej PO planszy. Kamera okien powstaje
  // jako ostatnia, więc sprawdzamy, czy nagłówka NIE MA na jej liście
  // ignorowanych — to jest dokładnie ten warunek, na którym poległo kiedyś
  // okno skrzyni.
  // Phaser wyklucza obiekt z kamery bitową maską `cameraFilter`. Jeśli bit
  // kamery okien jest w niej ustawiony, kamera okien obiektu NIE narysuje —
  // i dokładnie tak było z oknem skrzyni: istniało, klikało się, ale mapa
  // zamalowywała je w tej samej klatce.
  const kamery = s.cameras.cameras;
  const oknowa = kamery[kamery.length - 1];
  const ignorowany = naglowek ? (naglowek.cameraFilter & oknowa.id) !== 0 : true;
  return {
    zajety: s.zajety,
    naglowek: naglowek?.text ?? null,
    karty: karty.length,
    kamer: kamery.length,
    ignorowany,
    dosw: s.stan.bohater.doswiadczenie,
  };
});
sprawdz('wygrana z awansem zatrzymuje mapę', okno.zajety === true);
sprawdz('okno awansu ma nagłówek z poziomem', !!okno.naglowek, okno.naglowek ?? 'brak');
sprawdz('okno pokazuje dwie karty do wyboru', okno.karty === 2, `${okno.karty}`);
sprawdz('doświadczenie przekroczyło próg', okno.dosw >= 100, `${okno.dosw}`);
sprawdz('scena ma osobną kamerę okien', okno.kamer >= 3, `${okno.kamer} kamery`);
sprawdz('kamera okien NIE ignoruje nagłówka — okno naprawdę widać', okno.ignorowany === false);

// Klikamy w lewy przycisk wyboru. Punkt liczymy z geometrii sceny, a nie
// z własnego wzoru — inaczej sonda sprawdzałaby swój rachunek, nie grę.
const punkt = await page.evaluate(() => {
  const s = window.__game.scene.getScene('adventure');
  const etykiety = s.children.list.filter(
    (o) => o.type === 'Container' && o.list?.some((x) => x.type === 'Text' && /Naucz się|Ulepsz/.test(x.text))
  );
  const c = etykiety[0];
  return c ? { x: c.x, y: c.y } : null;
});
sprawdz('przycisk wyboru istnieje', punkt !== null);
if (punkt) {
  await page.mouse.click(punkt.x, punkt.y);
  await page.waitForTimeout(700);
}

const po = await page.evaluate(() => {
  const s = window.__game.scene.getScene('adventure');
  const u = s.stan.bohater.umiejetnosci ?? {};
  return {
    zajety: s.zajety,
    ile: Object.keys(u).length,
    wpisy: u,
    ruch: s.stan.bohater.ruch,
  };
});
sprawdz('wybór przyznaje umiejętność', po.ile === 1, JSON.stringify(po.wpisy));
sprawdz('po wyborze mapa znowu słucha', po.zajety === false);

// Umiejętność musi być widoczna na ekranie bohatera — bez tego gracz nie ma
// gdzie sprawdzić, co właściwie wybrał.
await page.evaluate(() => {
  const s = window.__game.scene.getScene('adventure');
  s.registry.set('stan-mapy', s.stan);
  s.scene.start('bohater');
});
await scena('bohater');
await page.waitForTimeout(700);
const naEkranie = await page.evaluate(() => {
  const s = window.__game.scene.getScene('bohater');
  const u = Object.keys(s.stan.bohater.umiejetnosci ?? {})[0];
  const nazwy = s.children.list.filter((o) => o.type === 'Text').map((t) => t.text);
  return { u, pustych: nazwy.filter((t) => t === 'MIEJSCE NA UMIEJĘTNOŚĆ').length, nazwy };
});
sprawdz(
  'ekran bohatera pokazuje zdobytą umiejętność',
  naEkranie.pustych === 3,
  `pustych gniazd: ${naEkranie.pustych} (ma być 3 z 4)`
);

sprawdz('bez błędów JS', bledyJs.length === 0, bledyJs.slice(0, 2).join(' | '));

await browser.close();
console.log(bledy === 0 ? '\nWszystko przeszło.' : `\n${bledy} sprawdzeń nie przeszło.`);
process.exit(bledy === 0 ? 0 : 1);
