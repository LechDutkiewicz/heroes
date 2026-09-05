// Czy interakcje na mapie przygody naprawdę działają — sprawdzane grą, nie okiem.
//
// Po co: „wejście na potwora zaczyna bitwę" to zdanie, które łatwo napisać
// w kodzie i łatwo uznać za prawdziwe po zrzucie ekranu. Zrzut pokazuje mapę
// przed wejściem albo bitwę po nim, ale nie pokazuje, czy stan mapy przeżył
// przejście tam i z powrotem. A to jest właśnie to, co się psuje.
//
//   node tools/probe-przygoda.mjs [--url http://localhost:4173]

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

/**
 * Klik w punkt PŁÓTNA, nie strony. Pierwsza wersja liczyła współrzędne od
 * lewego górnego rogu okna przeglądarki i chybiała, bo płótno ma wokół siebie
 * margines strony. Wyglądało to jak niedziałający przycisk w oknie skrzyni,
 * a przycisk działał — chybiał pomiar.
 */
async function klikNaPlotnie(page, x, y) {
  const p = await page.locator('canvas').boundingBox();
  await page.mouse.click(p.x + x, p.y + y);
}

const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
const page = await browser.newPage({ viewport: { width: 1000, height: 760 } });
page.on('pageerror', (e) => {
  bledy++;
  console.log('  BŁĄD JS —', String(e));
});

/**
 * Czekanie na scenę. Limit jest hojny, bo ekran końca bitwy odlicza 2600 ms
 * CZASU GRY, a nie zegara ściennego — na maszynie bez sprzętowego rysowania
 * gra chodzi po kilka klatek na sekundę i te 2,6 s rozciąga się do
 * kilkudziesięciu. Wcześniej stało tu `waitForTimeout(3600)` i sonda ogłaszała
 * zepsuty powrót z bitwy tam, gdzie powrót po prostu jeszcze trwał.
 */
const scena = (nazwa, timeout = 120000) =>
  page.waitForFunction(
    (n) => window.__game?.scene.getScene(n)?.sys.settings.status === 5,
    nazwa,
    { timeout }
  );

await page.goto(`${BASE}/?ekran=mapa`, { waitUntil: 'domcontentloaded' });
await scena('adventure');
await page.waitForTimeout(900);

// --- mgła wojny ---
console.log('\n=== mgła wojny ===');
const mgla = await page.evaluate(() => {
  const s = window.__game.scene.getScene('adventure');
  const ile = () => s.stan.odkryte.flat().filter(Boolean).length;
  const przed = ile();
  // Przechodzimy pięć pól w bok — odsłonięte powinno przybyć.
  const b = s.stan.bohater;
  const kroki = [];
  for (let i = 1; i <= 5; i++) kroki.push({ x: b.x + i, y: b.y, koszt: 100 });
  s.idz(kroki);
  return { przed, kroki: kroki.length };
});
await page.waitForTimeout(1600);
const poMgle = await page.evaluate(() => {
  const s = window.__game.scene.getScene('adventure');
  return {
    odkryte: s.stan.odkryte.flat().filter(Boolean).length,
    ruch: s.stan.bohater.ruch,
    przewX: s.przewX,
  };
});
sprawdz('marsz odsłania nowe pola', poMgle.odkryte > mgla.przed, `${mgla.przed} → ${poMgle.odkryte}`);
sprawdz('marsz zużywa punkty ruchu', poMgle.ruch < 1563, String(poMgle.ruch));

// --- skrzynia: wybór, nie nagroda ---
console.log('\n=== skrzynia ===');
const skrzynia = await page.evaluate(() => {
  const s = window.__game.scene.getScene('adventure');
  const o = s.stan.obiekty.find((x) => x.rodzaj === 'skrzynia' && !x.artefakt);
  s.stan.bohater.x = o.x;
  s.stan.bohater.y = o.y - 1;
  s.stan.bohater.ruch = 2000;
  window.__skrzynia = o;
  const przed = { ...s.stan.skarbiec, dosw: s.stan.bohater.doswiadczenie };
  s.idz([{ x: o.x, y: o.y, koszt: 100 }]);
  return przed;
});
await page.waitForTimeout(900);
const okno = await page.evaluate(() => {
  const s = window.__game.scene.getScene('adventure');
  return {
    zajety: s.zajety,
    zebrana: !!window.__skrzynia.zebrany,
    skarbiec: { ...s.stan.skarbiec },
  };
});
sprawdz('skrzynia NIE daje nagrody od razu', okno.zebrana === false && okno.zajety === true);

// Czy okno WIDAĆ. Tu przeszła obok nas usterka: kamera planszy powstaje po
// głównej, więc rysowała się na wierzchu i zamalowywała okno w prostokącie
// mapy. Okno istniało, przyciski przyjmowały kliknięcia, więc sonda była
// zielona — a gracz widział zamrożoną grę, bo czekała na decyzję, której nie
// dało się ani zobaczyć, ani podjąć.
//
// Nie porównujemy pikseli: woda animuje się co klatkę, więc różnica wychodzi
// zawsze i taki test nie sprawdzałby niczego. Sprawdzamy niezmiennik, który
// się złamał — okno musi rysować kamera idąca jako OSTATNIA, bo tylko jej
// nikt już nie zamaluje. Phaser trzyma to w masce `cameraFilter`.
const rysowanie = await page.evaluate(() => {
  const s = window.__game.scene.getScene('adventure');
  const kamery = s.cameras.cameras;
  const ostatnia = kamery[kamery.length - 1];
  const okno = s.children.list.filter((o) => o.depth >= 200);
  return {
    ile: okno.length,
    naWierzchu: okno.filter((o) => (o.cameraFilter & ostatnia.id) === 0).length,
    zamalowane: okno.filter((o) =>
      kamery.some((c) => c !== ostatnia && (o.cameraFilter & c.id) === 0)
    ).length,
  };
});
sprawdz(
  'okno skrzyni rysuje kamera wierzchnia — nic go nie zamaluje',
  rysowanie.ile > 0 && rysowanie.naWierzchu === rysowanie.ile && rysowanie.zamalowane === 0,
  `${rysowanie.naWierzchu}/${rysowanie.ile} na wierzchu, ${rysowanie.zamalowane} pod spodem`
);
sprawdz(
  'skarbiec czeka na decyzję',
  JSON.stringify(okno.skarbiec) === JSON.stringify({
    pokeball: skrzynia.pokeball,
    jagoda: skrzynia.jagoda,
    kamien: skrzynia.kamien,
    odlamek: skrzynia.odlamek,
  })
);

// Klikamy „doświadczenie" — prawy przycisk w oknie skrzyni.
await klikNaPlotnie(page, 8 + 336 + 86, 44 + 288 + 36);
await page.waitForTimeout(500);
const poWyborze = await page.evaluate(() => {
  const s = window.__game.scene.getScene('adventure');
  return {
    dosw: s.stan.bohater.doswiadczenie,
    pokeball: s.stan.skarbiec.pokeball,
    zebrana: !!window.__skrzynia.zebrany,
    zajety: s.zajety,
  };
});
sprawdz('wybór doświadczenia daje doświadczenie', poWyborze.dosw > skrzynia.dosw, `${skrzynia.dosw} → ${poWyborze.dosw}`);
sprawdz('i NIE daje pokeballi', poWyborze.pokeball === skrzynia.pokeball);
sprawdz('skrzynia znika po decyzji', poWyborze.zebrana === true);
sprawdz('gra wraca do sterowania', poWyborze.zajety === false);

// --- artefakt ---
console.log('\n=== artefakt ===');
const artefakt = await page.evaluate(() => {
  const s = window.__game.scene.getScene('adventure');
  const o = s.stan.obiekty.find((x) => x.rodzaj === 'artefakt' && !x.zebrany);
  s.stan.bohater.x = o.x;
  s.stan.bohater.y = o.y - 1;
  s.stan.bohater.ruch = 2000;
  const przed = { ...s.statystyki?.(s.stan.bohater) };
  s.idz([{ x: o.x, y: o.y, koszt: 100 }]);
  return { nazwa: o.nazwa, artefakt: o.artefakt, przed };
});
await page.waitForTimeout(900);
const poArtefakcie = await page.evaluate(() => {
  const s = window.__game.scene.getScene('adventure');
  return { ile: s.stan.bohater.artefakty.length, noszone: s.stan.bohater.artefakty };
});
sprawdz(`artefakt ląduje u bohatera (${artefakt.nazwa})`, poArtefakcie.ile === 1, poArtefakcie.noszone.join(', '));

// --- bitwa ---
console.log('\n=== bitwa ===');
const bitwa = await page.evaluate(() => {
  const s = window.__game.scene.getScene('adventure');
  const o = s.stan.obiekty.find((x) => x.rodzaj === 'potwor' && !x.zebrany);
  s.stan.bohater.x = o.x;
  s.stan.bohater.y = o.y - 1;
  s.stan.bohater.ruch = 2000;
  window.__potwor = o.id;
  s.idz([{ x: o.x, y: o.y, koszt: 100 }]);
  return { nazwa: o.nazwa, id: o.id, wrog: (o.oddzialy ?? []).length };
});
await page.waitForTimeout(1400);
await scena('battle');
const wBitwie = await page.evaluate(() => {
  const s = window.__game.scene.getScene('battle');
  return {
    aktywna: window.__game.scene.isActive('battle'),
    gracz: s.units.filter((u) => u.side === 'player').length,
    wrog: s.units.filter((u) => u.side === 'enemy').length,
    nazwyWroga: s.units.filter((u) => u.side === 'enemy').map((u) => u.def.name),
  };
});
sprawdz(`wejście na potwora (${bitwa.nazwa}) uruchamia bitwę`, wBitwie.aktywna === true);
sprawdz('po naszej stronie stoi armia z mapy', wBitwie.gracz === 4, `${wBitwie.gracz} oddziały`);
sprawdz(
  'po stronie wroga stoi dokładnie to, co stało na mapie',
  wBitwie.wrog === bitwa.wrog,
  wBitwie.nazwyWroga.join(', ')
);

// Rozstrzygamy bitwę po naszej myśli i sprawdzamy powrót.
// Kończymy bitwę METODĄ SCENY, nie podmieniając jej pól z zewnątrz.
// Pierwsza wersja robiła `s.units = s.units.filter(...)` i cicho nic nie
// osiągała: `units` jest getterem na tablicę symulacji, więc przypisanie
// przepadało, a scena dalej uważała, że wróg stoi. Wyglądało to jak zepsuty
// powrót z bitwy, a zepsuta była sonda.
const koniec = await page.evaluate(() => {
  const s = window.__game.scene.getScene('battle');
  s.rozstrzygnijNatychmiast(true);
  return { zywiWrogowie: s.units.filter((u) => u.side === 'enemy').length, wynik: window.__game.registry.get('wynik-bitwy') ?? null };
});
sprawdz('bitwa uznaje zwycięstwo', koniec.zywiWrogowie === 0);
sprawdz('bitwa odkłada wynik dla mapy', koniec.wynik !== null, JSON.stringify(koniec.wynik));
await scena('adventure');
const poBitwie = await page.evaluate(() => {
  const s = window.__game.scene.getScene('adventure');
  const o = s.stan.obiekty.find((x) => x.id === window.__potwor);
  return {
    naMapie: window.__game.scene.isActive('adventure'),
    potworZebrany: !!o?.zebrany,
    dosw: s.stan.bohater.doswiadczenie,
    artefakty: s.stan.bohater.artefakty.length,
    odkryte: s.stan.odkryte.flat().filter(Boolean).length,
    zajety: s.zajety,
  };
});
sprawdz('po bitwie wracamy na mapę', poBitwie.naMapie === true);
sprawdz(
  'po bitwie DA SIĘ znowu sterować bohaterem',
  poBitwie.zajety === false,
  poBitwie.zajety ? 'scena została zablokowana' : ''
);
sprawdz('pokonany potwór znika z mapy', poBitwie.potworZebrany === true);
sprawdz('doświadczenie za wygraną wpłynęło', poBitwie.dosw > poWyborze.dosw);
sprawdz('stan mapy przeżył bitwę — artefakt', poBitwie.artefakty === 1);
sprawdz('stan mapy przeżył bitwę — mgła', poBitwie.odkryte > mgla.przed, `${poBitwie.odkryte} pól`);

// --- strefa kontroli potwora ---
console.log('\n=== strefa kontroli potwora ===');
const strefa = await page.evaluate(() => {
  const s = window.__game.scene.getScene('adventure');
  const o = s.stan.obiekty.find((x) => x.rodzaj === 'potwor' && !x.zebrany);
  // Stajemy z jednej strony potwora i celujemy w pole po jego drugiej stronie.
  s.stan.bohater.x = o.x - 2;
  s.stan.bohater.y = o.y;
  s.stan.bohater.ruch = 2000;
  s.zajety = false;
  const t = s.constructor.name && window.__trasa ? null : null;
  void t;
  const droga = s.trasaDo ? s.trasaDo(o.x + 2, o.y) : null;
  return {
    potwor: o.nazwa,
    x: o.x,
    y: o.y,
    droga: droga ? droga.map((k) => [k.x, k.y]) : null,
  };
});
if (strefa.droga) {
  const przezStrefe = strefa.droga.some(
    ([x, y]) =>
      Math.abs(x - strefa.x) <= 1 &&
      Math.abs(y - strefa.y) <= 1 &&
      !(x === strefa.droga[strefa.droga.length - 1][0] && y === strefa.droga[strefa.droga.length - 1][1])
  );
  sprawdz(
    `trasa NIE przechodzi przez strefę potwora (${strefa.potwor})`,
    !przezStrefe,
    strefa.droga.length + ' pól'
  );
} else {
  sprawdz('trasa omija strefę potwora — nie ma innej drogi, więc trasy brak', true);
}

await page.locator('canvas').screenshot({ path: 'tools/shots/mapa-po-bitwie.png' });

// --- zamek ---
console.log('\n=== zamek ===');
const doZamku = await page.evaluate(() => {
  const s = window.__game.scene.getScene('adventure');
  const z = s.stan.obiekty.find((o) => o.rodzaj === 'zamek' && o.nasz);
  s.stan.bohater.x = z.x;
  s.stan.bohater.y = z.y - 1;
  s.stan.bohater.ruch = 2000;
  s.stan.skarbiec.pokeball = 40;
  s.zajety = false;
  window.__zamek = z.id;
  const przed = s.stan.bohater.armia.reduce((a, o) => a + o.ile, 0);
  s.idz([{ x: z.x, y: z.y, koszt: 100 }]);
  return { nazwa: z.nazwa, przed };
});
await page.waitForTimeout(1400);
await scena('zamek');
sprawdz(`wejście do zamku (${doZamku.nazwa}) otwiera ekran miasta`, true);

const werbunek = await page.evaluate(() => {
  const t = window.__game.scene.getScene('zamek');
  const przed = {
    pokeballe: t.stan.skarbiec.pokeball,
    armia: t.stan.bohater.armia.reduce((a, o) => a + o.ile, 0),
    dostepne: [...(t.zamek.dostepne ?? [])],
  };
  t.kup(0);
  return {
    przed,
    po: {
      pokeballe: t.stan.skarbiec.pokeball,
      armia: t.stan.bohater.armia.reduce((a, o) => a + o.ile, 0),
      dostepne: [...(t.zamek.dostepne ?? [])],
    },
  };
});
sprawdz('werbunek powiększa armię', werbunek.po.armia > werbunek.przed.armia, `${werbunek.przed.armia} → ${werbunek.po.armia}`);
sprawdz('werbunek kosztuje pokeballe', werbunek.po.pokeballe < werbunek.przed.pokeballe, `${werbunek.przed.pokeballe} → ${werbunek.po.pokeballe}`);
sprawdz('zapas w zamku maleje', werbunek.po.dostepne[0] < werbunek.przed.dostepne[0], `${werbunek.przed.dostepne[0]} → ${werbunek.po.dostepne[0]}`);

await page.locator('canvas').screenshot({ path: 'tools/shots/zamek.png' });
await page.evaluate(() => window.__game.scene.getScene('zamek').scene.start('adventure'));
await scena('adventure');
const poZamku = await page.evaluate(() => {
  const s = window.__game.scene.getScene('adventure');
  const potwor = s.stan.obiekty.find((o) => o.id === window.__potwor);
  return {
    armia: s.stan.bohater.armia.reduce((a, o) => a + o.ile, 0),
    zajety: s.zajety,
    // Pokonany strażnik NIE ma prawa dalej stać na mapie.
    sprytPokonanego: !!s.ikonyObiektow[window.__potwor],
    potworZebrany: !!potwor?.zebrany,
  };
});
sprawdz('zakup przeżywa powrót na mapę', poZamku.armia > doZamku.przed);
sprawdz('po wyjściu z zamku da się sterować', poZamku.zajety === false);
sprawdz(
  'pokonany strażnik NIE jest już rysowany na mapie',
  poZamku.sprytPokonanego === false && poZamku.potworZebrany === true
);

// --- druga bitwa w tej samej sesji ---
//
// To nie jest powtórka poprzedniego testu. Phaser używa TEJ SAMEJ instancji
// sceny przy każdym `scene.start`, więc pola z wartością nadaną przy deklaracji
// ustawiają się raz, przy tworzeniu gry. Druga bitwa zaczynała się z oddziałami
// pierwszej, których napisy i paski zniknęły razem z poprzednią sceną — i gra
// stawała na martwej teksturze. Pierwsza bitwa nigdy tego nie pokaże, bo
// zaczyna od pustych tablic; potrzebna jest właśnie DRUGA.
console.log('\n=== druga bitwa w tej samej sesji ===');
const drugi = await page.evaluate(() => {
  const s = window.__game.scene.getScene('adventure');
  const p = s.stan.obiekty.find((o) => o.rodzaj === 'potwor' && !o.zebrany);
  if (!p) return null;
  s.stan.bohater.x = p.x;
  s.stan.bohater.y = p.y - 1;
  s.stan.bohater.ruch = 2000;
  s.idz([{ x: p.x, y: p.y, koszt: 100 }]);
  return p.nazwa;
});
if (drugi) {
  let wstala = true;
  try {
    await scena('battle');
  } catch {
    wstala = false;
  }
  sprawdz('druga bitwa w ogóle się zaczyna', wstala, drugi);
  if (wstala) {
    const swiezo = await page.evaluate(() => {
      const b = window.__game.scene.getScene('battle');
      return {
        oddzialy: b.units.length,
        zywe: b.units.filter((u) => u.alive !== false).length,
      };
    });
    // Gdyby stan poprzedniej bitwy nie został wyczyszczony, na planszy stałyby
    // oddziały z obu — czyli wyraźnie więcej niż dwie armie po sześć.
    sprawdz(
      'druga bitwa nie dziedziczy oddziałów z pierwszej',
      swiezo.oddzialy > 0 && swiezo.oddzialy <= 12,
      `${swiezo.oddzialy} oddziałów`
    );
  }
} else {
  sprawdz('druga bitwa w ogóle się zaczyna', false, 'zabrakło potworów na mapie');
}

console.log(`\n${bledy === 0 ? 'Wszystko się zgadza.' : `Błędów: ${bledy}`}`);
await browser.close();
process.exit(bledy === 0 ? 0 : 1);
