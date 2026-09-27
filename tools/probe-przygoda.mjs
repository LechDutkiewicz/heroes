// Czy interakcje na mapie przygody naprawdę działają — sprawdzane grą, nie okiem.
//
// Po co: „wejście na potwora zaczyna bitwę" to zdanie, które łatwo napisać
// w kodzie i łatwo uznać za prawdziwe po zrzucie ekranu. Zrzut pokazuje mapę
// przed wejściem albo bitwę po nim, ale nie pokazuje, czy stan mapy przeżył
// przejście tam i z powrotem. A to jest właśnie to, co się psuje.
//
//   node tools/probe-przygoda.mjs [--url http://localhost:4173]

import { chromium } from 'playwright';
import { zainstalujPodejdz, zamknijAwans } from './sonda-wspolne.mjs';

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
 * Zamyka okno awansu, jeśli akurat stoi otwarte.
 *
 * Od czasu, gdy awans daje WYBÓR umiejętności, każde źródło doświadczenia
 * (skrzynia, drzewo wiedzy, wygrana bitwa) może zatrzymać grę oknem. Sonda
 * gra rolę gracza, więc musi na to okno kliknąć — inaczej zgłasza „gra nie
 * wraca do sterowania" przy grze, która działa dokładnie tak, jak ma działać.
 */
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

await zainstalujPodejdz(page);

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
  const o = window.__podejdz(s, (x) => x.rodzaj === 'skrzynia' && !x.artefakt && !x.zebrany);
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
  }),
  `${JSON.stringify(skrzynia)} → ${JSON.stringify(okno.skarbiec)}`
);

// Klikamy „doświadczenie" — prawy przycisk w oknie skrzyni.
await klikNaPlotnie(page, 8 + 336 + 86, 44 + 288 + 36);
await page.waitForTimeout(500);
await zamknijAwans(page);
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
sprawdz('i NIE daje pokeballi', poWyborze.pokeball === skrzynia.pokeball, `${skrzynia.pokeball} → ${poWyborze.pokeball}`);
sprawdz('skrzynia znika po decyzji', poWyborze.zebrana === true);
sprawdz('gra wraca do sterowania', poWyborze.zajety === false);

// --- artefakt ---
console.log('\n=== artefakt ===');
const artefakt = await page.evaluate(() => {
  const s = window.__game.scene.getScene('adventure');
  const o = window.__podejdz(s, (x) => x.rodzaj === 'artefakt' && !x.zebrany);
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
const { NA_POLU } = await page.evaluate(async () => {
  const b = await import('/src/data/battle.ts');
  return { NA_POLU: b.NA_POLU };
});
const bitwa = await page.evaluate(async (naPolu) => {
  const s = window.__game.scene.getScene('adventure');
  const o = window.__podejdz(s, (x) => x.rodzaj === 'potwor' && !x.zebrany);
  window.__potwor = o.id;
  window.__potworPole = { x: o.x, y: o.y };
  const b = s.stan.bohater;
  // Uzdrowiciel (umiejętność z awansu) budzi część zemdlonych od razu po
  // wygranej — sonda sprawdza samo mdlenie, więc bohater idzie bez niego.
  const u = await import('/src/data/umiejetnosci.ts');
  for (const { u: um } of u.posiadane(b)) if (um.klucz === 'leczenie') delete b.umiejetnosci[um.id];
  window.__doswPrzed = b.armia.map((x) => (x ? x.dosw ?? null : null));
  s.idz([{ x: o.x, y: o.y, koszt: 100 }]);
  const stado = (o.oddzialy ?? []).reduce((a, x) => a + (x.omdlaly ? 0 : x.ile), 0);
  const sprawni = b.armia.filter((x) => x && !x.omdlaly && x.ile > 0).length;
  return { nazwa: o.nazwa, id: o.id, wrog: Math.min(naPolu, stado), gracz: Math.min(naPolu, sprawni) };
}, NA_POLU);
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
sprawdz(
  `po naszej stronie stoi drużyna z mapy (najwyżej ${NA_POLU})`,
  wBitwie.gracz === bitwa.gracz && wBitwie.gracz <= NA_POLU,
  `${wBitwie.gracz} stworków, oczekiwano ${bitwa.gracz}`
);
sprawdz(
  'po stronie wroga stoi dokładnie to stado, które stało na mapie',
  wBitwie.wrog === bitwa.wrog,
  `${wBitwie.nazwyWroga.join(', ')} (oczekiwano ${bitwa.wrog})`
);

// Rozstrzygamy bitwę po naszej myśli i sprawdzamy powrót.
// Kończymy bitwę METODĄ SCENY, nie podmieniając jej pól z zewnątrz.
// Pierwsza wersja robiła `s.units = s.units.filter(...)` i cicho nic nie
// osiągała: `units` jest getterem na tablicę symulacji, więc przypisanie
// przepadało, a scena dalej uważała, że wróg stoi. Wyglądało to jak zepsuty
// powrót z bitwy, a zepsuta była sonda.
const koniec = await page.evaluate(() => {
  const s = window.__game.scene.getScene('battle');
  // Jeden nasz stworek pada w boju — tak samo, jak `rozstrzygnijNatychmiast`
  // zdejmuje przegranych — żeby sprawdzić mdlenie po powrocie na mapę.
  const nasi = s.units.filter((u) => u.side === 'player');
  const padl = nasi[nasi.length - 1];
  window.__zemdlony = null;
  if (nasi.length > 1 && padl) {
    const i = [...s.slotyZMapy.entries()].find(([, id]) => id === padl.id)?.[0];
    window.__zemdlony = i !== undefined ? s.zPrzygody.gracz[i]?.slot ?? null : null;
    padl.count = 0;
    padl.view.container.destroy();
    s.units.splice(s.units.indexOf(padl), 1);
    const wSym = s.battle.units.indexOf(padl);
    if (wSym !== -1) s.battle.units.splice(wSym, 1);
  }
  s.rozstrzygnijNatychmiast(true);
  return { zywiWrogowie: s.units.filter((u) => u.side === 'enemy').length, wynik: window.__game.registry.get('wynik-bitwy') ?? null };
});
sprawdz('bitwa uznaje zwycięstwo', koniec.zywiWrogowie === 0);
sprawdz('bitwa odkłada wynik dla mapy', koniec.wynik !== null, JSON.stringify(koniec.wynik));
await scena('adventure');
await page.waitForTimeout(3200);
await zamknijAwans(page);
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
    bohater: { x: s.stan.bohater.x, y: s.stan.bohater.y },
    potworPole: window.__potworPole,
    zemdlony: window.__zemdlony,
    druzyna: s.stan.bohater.armia.map((o, i) =>
      o ? { poziom: o.poziom, dosw: o.dosw ?? null, przed: window.__doswPrzed[i], omdlaly: !!o.omdlaly } : null
    ),
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
{
  const z = poBitwie.zemdlony;
  const d = poBitwie.druzyna;
  sprawdz('sonda znalazła slot stworka, który padł', typeof z === 'number', String(z));
  if (typeof z === 'number') {
    sprawdz('stworek, który padł, zostaje w slocie jako zemdlony', d[z]?.omdlaly === true, JSON.stringify(d[z]));
    sprawdz('zemdlony nie dostaje doświadczenia', d[z]?.dosw === d[z]?.przed, JSON.stringify(d[z]));
    const walczacy = d.map((o, i) => ({ o, i })).filter(({ o, i }) => o && i !== z).slice(0, NA_POLU - 1);
    sprawdz(
      'zwycięzcy zbierają doświadczenie stworków',
      walczacy.length > 0 && walczacy.every(({ o }) => !o.omdlaly && o.dosw > (o.przed ?? 0)),
      walczacy.map(({ o }) => `${o.przed}→${o.dosw}`).join(', ')
    );
  }
}
sprawdz('stan mapy przeżył bitwę — artefakt', poBitwie.artefakty === 1);
sprawdz('stan mapy przeżył bitwę — mgła', poBitwie.odkryte > mgla.przed, `${poBitwie.odkryte} pól`);
// Z potworem bije się Z SĄSIEDNIEGO POLA, tak jak w Heroes 3 — bohater nie
// wchodzi na jego pole ani przed bitwą, ani po wygranej. To jest ta sama
// zasada, przez którą gubiła się skrzynia pilnowana przez straż: dopóki
// bohater STAWAŁ na polu obiektu, obiekt i straż konkurowały o jedno pole.
sprawdz(
  'bitwa toczy się z sąsiedniego pola — bohater nie wchodzi na potwora',
  Math.max(
    Math.abs(poBitwie.bohater.x - poBitwie.potworPole.x),
    Math.abs(poBitwie.bohater.y - poBitwie.potworPole.y)
  ) === 1,
  `bohater (${poBitwie.bohater.x},${poBitwie.bohater.y}), potwór (${poBitwie.potworPole.x},${poBitwie.potworPole.y})`
);

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
  const z = window.__podejdz(s, (o) => o.rodzaj === 'zamek' && o.wlasciciel === 'gracz');
  s.stan.skarbiec.pokeball = 40;
  window.__zamek = z.id;
  const przed = s.stan.bohater.armia.filter(Boolean).length;
  const zemdlonych = s.stan.bohater.armia.filter((o) => o?.omdlaly).length;
  s.idz([{ x: z.x, y: z.y, koszt: 100 }]);
  return { nazwa: z.nazwa, przed, zemdlonych };
});
await page.waitForTimeout(1400);
await scena('zamek');
sprawdz(`wejście do zamku (${doZamku.nazwa}) otwiera ekran miasta`, true);
const poCentrum = await page.evaluate(() =>
  window.__game.scene.getScene('zamek').stan.bohater.armia.filter((o) => o?.omdlaly).length
);
sprawdz(
  'Centrum Pokemon we własnym zamku budzi zemdlone stworki',
  doZamku.zemdlonych > 0 && poCentrum === 0,
  `zemdlonych ${doZamku.zemdlonych} → ${poCentrum}`
);

const werbunek = await page.evaluate(async () => {
  const t = window.__game.scene.getScene('zamek');
  const m = await import('/src/data/mapa.ts');
  // Musi być kogo zaprosić — gra startuje z ułamkami w rezerwatach.
  if ((t.zamek.dostepne?.[0] ?? 0) < 1) t.zamek.dostepne[0] = 1;
  const przed = {
    pokeballe: t.stan.skarbiec.pokeball,
    armia: t.stan.bohater.armia.filter(Boolean).length,
    dostepne: [...(t.zamek.dostepne ?? [])],
  };
  t.kup(0);
  return {
    przed,
    po: {
      pokeballe: t.stan.skarbiec.pokeball,
      armia: t.stan.bohater.armia.filter(Boolean).length,
      dostepne: [...(t.zamek.dostepne ?? [])],
    },
    koszt: m.KOSZT_ODDZIALU[0],
    wszyscyPojedynczo: t.stan.bohater.armia.every((o) => !o || o.ile === 1),
  };
});
sprawdz('zaproszenie dodaje JEDNEGO stworka do drużyny', werbunek.po.armia === werbunek.przed.armia + 1 && werbunek.wszyscyPojedynczo, `${werbunek.przed.armia} → ${werbunek.po.armia}`);
sprawdz('zaproszenie kosztuje KOSZT_ODDZIALU', werbunek.przed.pokeballe - werbunek.po.pokeballe === werbunek.koszt, `${werbunek.przed.pokeballe} → ${werbunek.po.pokeballe}`);
sprawdz('w rezerwacie czeka o jednego mniej', Math.abs(werbunek.po.dostepne[0] - (werbunek.przed.dostepne[0] - 1)) < 1e-9, `${werbunek.przed.dostepne[0]} → ${werbunek.po.dostepne[0]}`);

await page.locator('canvas').screenshot({ path: 'tools/shots/zamek.png' });
await page.evaluate(() => window.__game.scene.getScene('zamek').scene.start('adventure'));
await scena('adventure');
await zamknijAwans(page);
const poZamku = await page.evaluate(() => {
  const s = window.__game.scene.getScene('adventure');
  const potwor = s.stan.obiekty.find((o) => o.id === window.__potwor);
  return {
    armia: s.stan.bohater.armia.filter(Boolean).length,
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

// --- straż pilnuje tego, co pilnuje ---
//
// Wejście wprost na pilnowaną kopalnię omijało strażnika i zajmowało ją za
// darmo: straż sprawdzaliśmy TYLKO wtedy, gdy na polu nie było żadnego
// obiektu. Cała różnica między kopalnią pilnowaną a niepilnowaną znikała,
// a to jedyne, co na tej mapie chroni nagrody.
console.log('\n=== straż przy kopalni ===');
const pilnowana = await page.evaluate(() => {
  const s = window.__game.scene.getScene('adventure');
  const k = s.stan.obiekty.find((o) => o.rodzaj === 'kopalnia' && o.wlasciciel !== 'gracz');
  if (!k) return null;
  // Straż USTAWIA sonda, a nie plansza.
  //
  // Sprawdzamy zasadę („wejście na pilnowane pole zaczyna bitwę"), a nie to,
  // czy akurat ten układ mapy kogoś przy kopalni postawił. Pierwsza wersja
  // szukała pilnowanej kopalni na planszy i przestała cokolwiek sprawdzać,
  // gdy układ mapy się zmienił — czyli test zależał od danych, na które nie
  // ma wpływu. Przestawiamy więc dowolnego żywego potwora obok kopalni.
  const straz = s.stan.obiekty.find((o) => o.rodzaj === 'potwor' && !o.zebrany);
  if (!straz) return null;
  straz.x = k.x + 1;
  straz.y = k.y - 1;
  s.stan.bohater.x = k.x;
  s.stan.bohater.y = k.y + 2;
  s.stan.bohater.ruch = 3000;
  s.zajety = false;
  window.__kopalnia = k.id;
  s.idz([
    { x: k.x, y: k.y + 1, koszt: 100 },
    { x: k.x, y: k.y, koszt: 100 },
  ]);
  return k.nazwa;
});
if (!pilnowana) {
  sprawdz('na mapie stoi pilnowana kopalnia', false, 'nie znaleziono żadnej');
} else {
  let doBoju = true;
  try {
    await scena('battle');
  } catch {
    doBoju = false;
  }
  const stan = await page.evaluate(() => {
    const s = window.__game.scene.getScene('adventure');
    const k = s.stan.obiekty.find((o) => o.id === window.__kopalnia);
    return k.wlasciciel === 'gracz';
  });
  sprawdz(`wejście na pilnowaną kopalnię (${pilnowana}) zaczyna bitwę`, doBoju);
  sprawdz('kopalnia NIE jest zajęta przed wygraną', stan === false);

  if (doBoju) {
    await page.evaluate(() => window.__game.scene.getScene('battle').rozstrzygnijNatychmiast(true));
    await scena('adventure');
    // Bitwa toczy się, gdy bohater STOI JUŻ na kopalni, więc po wygranej musi
    // ją zająć sam — inaczej trzeba by zejść z pola i wrócić na nie po raz
    // drugi, co wygląda po prostu na usterkę.
    // Czekamy na warunek, a nie stałe 4 s: na obciążonej maszynie powrót
    // z bitwy (2,6 s CZASU GRY) potrafi trwać kilka razy dłużej.
    await zamknijAwans(page);
    await page
      .waitForFunction(
        () =>
          window.__game.scene.getScene('adventure').stan.obiekty.find((o) => o.id === window.__kopalnia)
            ?.wlasciciel === 'gracz',
        null,
        { timeout: 60000 }
      )
      .catch(() => {});
    const po = await page.evaluate(() => {
      const s = window.__game.scene.getScene('adventure');
      const k = s.stan.obiekty.find((o) => o.id === window.__kopalnia);
      return {
        nasza: k.wlasciciel === 'gracz',
        poz: [s.stan.bohater.x, s.stan.bohater.y],
        kopalnia: [k.x, k.y],
        wlasciciel: k.wlasciciel,
        zajety: s.zajety,
        aktywna: window.__game.scene.getScenes(true).map((x) => x.scene.key),
      };
    });
    sprawdz('po wygranej kopalnia jest zajęta bez wchodzenia na nią drugi raz', po.nasza, JSON.stringify(po));
  }
}

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
  const p = window.__podejdz(s, (o) => o.rodzaj === 'potwor' && !o.zebrany);
  if (!p) return null;
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
    // stworki z obu — czyli więcej niż dwie strony po NA_POLU.
    sprawdz(
      'druga bitwa nie dziedziczy stworków z pierwszej',
      swiezo.oddzialy > 0 && swiezo.oddzialy <= 2 * NA_POLU,
      `${swiezo.oddzialy} stworków`
    );
  }
} else {
  sprawdz('druga bitwa w ogóle się zaczyna', false, 'zabrakło potworów na mapie');
}

console.log(`\n${bledy === 0 ? 'Wszystko się zgadza.' : `Błędów: ${bledy}`}`);
await browser.close();
process.exit(bledy === 0 ? 0 : 1);
