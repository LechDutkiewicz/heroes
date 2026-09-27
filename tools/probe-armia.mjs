// Sonda paska armii w mieście — sprawdzana MYSZĄ, nie wywołaniami z kodu.
//
// Arytmetykę (co wolno, dokąd wolno przełożyć) sprawdzają `probe-armia.ts`
// i `probe-garnizon.ts`. Tu chodzi o to, co może się zepsuć tylko na ekranie:
// czy klik trafia w slot, czy drugi klik zamienia (także dwa stworki tego
// samego gatunku — od „trenera zamiast armii" każdy slot to osobna postać
// i nic się nie scala), czy przeciągnięcie między garnizonem a bohaterem
// przenosi, czy Shift/Ctrl NIE dzielą, czy tabliczka pokazuje poziom, czy
// „Trenuj" podnosi poziom za pokeballe, czy prawy klik / podwójny klik /
// przytrzymanie otwiera okno stworka, czy klik w portret prowadzi na ekran
// bohatera i z powrotem, i czy garnizon przeżywa zapis i odczyt (także stary
// zapis bez pola `garnizon`).
//
//   node tools/probe-armia.mjs [--url http://localhost:5217] [--zrzuty]
//
// `--zrzuty` zapisuje tools/blind/miasto-armia.png i okno-stworka.png.

import { chromium } from 'playwright';

const arg = (n, d) => {
  const i = process.argv.indexOf(n);
  return i !== -1 ? process.argv[i + 1] : d;
};
const BASE = arg('--url', 'http://localhost:4173');
const ZRZUTY = process.argv.includes('--zrzuty');

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

const scena = (nazwa) =>
  page.waitForFunction((n) => window.__game?.scene.getScene(n)?.sys.settings.status === 5, nazwa, {
    timeout: 60000,
  });
let plotno;
const naPlotno = async (x, y) => {
  plotno ??= await page.locator('canvas').boundingBox();
  return { x: plotno.x + x, y: plotno.y + y };
};
async function klik(x, y, o = {}) {
  const p = await naPlotno(x, y);
  if (o.shift) await page.keyboard.down('Shift');
  await page.mouse.click(p.x, p.y, { button: o.prawy ? 'right' : 'left' });
  if (o.shift) await page.keyboard.up('Shift');
  await page.waitForTimeout(120);
}
/** Przeciągnięcie myszą między dwoma punktami płótna, opcjonalnie z klawiszem. */
async function przeciagnij(zPkt, doPkt, klawisz) {
  const z = await naPlotno(zPkt.x, zPkt.y);
  const d = await naPlotno(doPkt.x, doPkt.y);
  if (klawisz) await page.keyboard.down(klawisz);
  await page.mouse.move(z.x, z.y);
  await page.mouse.down();
  for (let k = 1; k <= 8; k++) await page.mouse.move(z.x + ((d.x - z.x) * k) / 8, z.y + ((d.y - z.y) * k) / 8);
  await page.mouse.up();
  if (klawisz) await page.keyboard.up(klawisz);
  await page.waitForTimeout(150);
}
/** Środek slotu `i` w rzędzie `rzad` (0 — garnizon, 1 — bohater). */
const slot = (rzad, i) =>
  page.evaluate(
    ([r, n]) => {
      const p = window.__game.scene.getScene('zamek').panel.paski[r];
      const s = p.sloty[n];
      return { x: s.x + p.slotW / 2, y: s.y + p.slotH / 2 };
    },
    [rzad, i]
  );
const klikSlot = async (rzad, i, o) => {
  const s = await slot(rzad, i);
  await klik(s.x, s.y, o);
};
/**
 * Armie jako „nazwa@poziom" — garnizon i bohater. Liczebność dopisujemy
 * („×2") tylko, gdy nie jest 1: w drużynie i garnizonie każdy slot to jeden
 * stworek, więc „×" w wyniku to znak, że coś się scaliło albo podzieliło.
 */
const armie = () =>
  page.evaluate(() => {
    const t = window.__game.scene.getScene('zamek');
    const pisz = (a) => a.map((o) => (o ? `${o.nazwa}@${o.poziom}${o.ile !== 1 ? `×${o.ile}` : ''}` : '—'));
    return { g: pisz(t.garnizon), b: pisz(t.stan.bohater.armia), zamekG: pisz(t.zamek.garnizon ?? []) };
  });
const oknoStworka = () => page.evaluate(() => !!window.__game.scene.getScene('zamek').panel.okno?.otwarty);
/** Czy na scenie widać napis o dokładnie takiej treści. */
const jestNapis = (tekst) =>
  page.evaluate((t) => {
    const sc = window.__game.scene.getScene('zamek');
    let jest = false;
    const przejdz = (l) => l.forEach((o) => { if (o.type === 'Text' && o.text === t && o.visible) jest = true; if (o.list) przejdz(o.list); });
    przejdz(sc.children.list);
    return jest;
  }, tekst);
/** Klik w napis (tabliczkę) — ostatni z takim tekstem na scenie, szukany także w kontenerach. */
async function klikNapis(tekst) {
  const p = await page.evaluate((t) => {
    const sc = window.__game.scene.getScene('zamek');
    const znalezione = [];
    const przejdz = (lista) => {
      for (const o of lista) {
        if (o.type === 'Text' && o.text === t && o.visible) znalezione.push(o);
        if (o.list) przejdz(o.list);
      }
    };
    przejdz(sc.children.list);
    const n = znalezione.at(-1);
    if (!n) return null;
    const m = n.getWorldTransformMatrix();
    return { x: m.tx, y: m.ty };
  }, tekst);
  if (!p) return false;
  await klik(p.x, p.y);
  return true;
}

// --- wejście do miasta z bohaterem, drogą gry ---
await page.goto(`${BASE}/?ekran=mapa`, { waitUntil: 'domcontentloaded' });
await scena('adventure');
await page.waitForTimeout(600);
await page.evaluate(() => {
  const s = window.__game.scene.getScene('adventure');
  const z = s.stan.obiekty.find((o) => o.rodzaj === 'zamek' && o.wlasciciel === 'gracz');
  z.postawione = ['ratusz1', 'ratusz2', 'fort', 'siedlisko1', 'siedlisko2', 'siedlisko3', 'siedlisko5'];
  z.dostepne = [2, 2, 1.5, 0, 1, 0];
  Object.assign(s.stan.skarbiec, { pokeball: 400, jagoda: 22, kamien: 6, odlamek: 24 });
  s.stan.bohater.x = z.x;
  s.stan.bohater.y = z.y - 1;
  s.stan.bohater.ruch = 3000;
  s.zajety = false;
  s.idz([{ x: z.x, y: z.y, koszt: 100 }]);
});
await scena('zamek');
await page.waitForTimeout(900);

console.log('=== dwa rzędy ===');
let a = await armie();
sprawdz('garnizon startuje pusty (straż z planszy jest osobno)', a.g.every((x) => x === '—'), a.g.join(' '));
sprawdz('dolny rząd to armia bohatera', a.b[0] !== '—' && a.b[3] !== '—', a.b.join(' '));
sprawdz('w drużynie każdy slot to jeden stworek z poziomem', a.b.every((x) => x === '—' || /^[^×]+@\d+$/.test(x)), a.b.join(' '));

console.log('\n=== tabliczka poziomu ===');
{
  const t = await page.evaluate(() => {
    const t = window.__game.scene.getScene('zamek');
    const b = t.stan.bohater.armia;
    b[1].poziom = 12;
    b[1].dosw = 5 * 12 * 11;
    b[2].omdlaly = true;
    t.odswiez();
    const s = t.panel.paski[1].sloty;
    const w = {
      p0: s[0].licznik.text,
      oczekiwane0: `poz. ${b[0].poziom}`,
      p1: s[1].licznik.text,
      szary: s[2].rysunek.isTinted && s[2].rysunek.alpha < 1,
      zywy: !s[0].rysunek.isTinted && s[0].rysunek.alpha === 1,
    };
    delete b[2].omdlaly;
    t.odswiez();
    w.poBudzeniu = !s[2].rysunek.isTinted;
    return w;
  });
  sprawdz('tabliczka pokazuje poziom („poz. N"), nie liczebność', t.p0 === t.oczekiwane0, `${t.p0}`);
  sprawdz('zmiana poziomu widać na tabliczce', t.p1 === 'poz. 12', t.p1);
  sprawdz('zemdlony stworek jest wyszarzony', t.szary && t.zywy);
  sprawdz('obudzony stworek wraca do koloru', t.poBudzeniu);
}

console.log('\n=== zamiana w obrębie bohatera ===');
a = await armie();
const przed = a.b.slice();
await klikSlot(1, 0);
sprawdz('pierwszy klik zaznacza', await page.evaluate(() => window.__game.scene.getScene('zamek').panel.zaznaczony));
await klikSlot(1, 1);
a = await armie();
sprawdz('drugi klik w inny gatunek zamienia', a.b[0] === przed[1] && a.b[1] === przed[0], `${przed.slice(0, 2)} → ${a.b.slice(0, 2)}`);

console.log('\n=== przeciągnięcie do garnizonu ===');
await przeciagnij(await slot(1, 1), await slot(0, 0));
a = await armie();
sprawdz('stworek przeszedł do garnizonu', a.g[0] === przed[0] && a.b[1] === '—', `g0=${a.g[0]}, b1=${a.b[1]}`);
sprawdz('garnizon siedzi w stanie zamku', a.zamekG[0] === a.g[0]);

console.log('\n=== ten sam gatunek: zamiana, nie scalanie ===');
// Drugi stworek tego samego gatunku, na innym poziomie — to inna postać.
await page.evaluate(() => {
  const t = window.__game.scene.getScene('zamek');
  t.garnizon[1] = { ...t.garnizon[0], poziom: 9, dosw: 5 * 9 * 8 };
  t.odswiez();
});
a = await armie();
const [g0, g1] = [a.g[0], a.g[1]];
sprawdz('w garnizonie stoją dwa stworki tego samego gatunku', g0.split('@')[0] === g1.split('@')[0] && g0 !== g1, `${g0} ${g1}`);
await klikSlot(0, 0);
await klikSlot(0, 1);
a = await armie();
sprawdz('klik-klik w ten sam gatunek zamienia sloty (oba zachowują poziom)', a.g[0] === g1 && a.g[1] === g0, `${a.g[0]} ${a.g[1]}`);
await przeciagnij(await slot(0, 1), await slot(0, 0));
a = await armie();
sprawdz('przeciągnięcie na ten sam gatunek też zamienia', a.g[0] === g0 && a.g[1] === g1, `${a.g[0]} ${a.g[1]}`);
sprawdz('nic się nie scaliło', a.g.filter((x) => x !== '—').length === 2 && [...a.g, ...a.b].every((x) => !x.includes('×')));

console.log('\n=== Shift i Ctrl nie dzielą ===');
const oknoPodzialu = () => page.evaluate(() => !!window.__game.scene.getScene('zamek').panel.podzial);
const odznacz = () => page.evaluate(() => window.__game.scene.getScene('zamek').panel.odznacz());
let stan0 = JSON.stringify(await armie());
await klikSlot(0, 0);
await klikSlot(0, 2, { shift: true });
sprawdz('Shift+klik w pusty slot nie otwiera okna podziału', !(await oknoPodzialu()));
sprawdz('Shift+klik niczego nie rozdziela', JSON.stringify(await armie()) === stan0, (await armie()).g.join(' '));
await odznacz();
await klikSlot(0, 0);
await klikSlot(0, 1, { shift: true });
sprawdz('Shift+klik w ten sam gatunek nic nie przelewa', JSON.stringify(await armie()) === stan0, (await armie()).g.join(' '));
await odznacz();
await przeciagnij(await slot(0, 0), await slot(0, 3), 'Shift');
sprawdz('Shift+przeciągnięcie nie otwiera okna podziału', !(await oknoPodzialu()));
sprawdz('Shift+przeciągnięcie niczego nie rozdziela', JSON.stringify(await armie()) === stan0, (await armie()).g.join(' '));
await odznacz();
await przeciagnij(await slot(0, 0), await slot(0, 3), 'Control');
sprawdz('Ctrl+przeciągnięcie nie odkłada „jednego"', JSON.stringify(await armie()) === stan0, (await armie()).g.join(' '));
await odznacz();
sprawdz('w mieście nie ma już tabliczki „Podziel"', !(await jestNapis('Podziel')));

console.log('\n=== Sala treningowa („Trenuj") ===');
{
  const { kosztTreningu: koszt5 } = await page.evaluate(async () => {
    const m = await import('/src/data/mapa.ts');
    return { kosztTreningu: m.kosztTreningu({ poziom: 5 }) };
  });
  // Bez zaznaczenia — tylko podpowiedź, nikt nie rośnie.
  const bez = await page.evaluate(() => {
    const t = window.__game.scene.getScene('zamek');
    t.stan.skarbiec.pokeball = 400;
    return { kasa: t.stan.skarbiec.pokeball, g: t.garnizon.map((o) => o?.poziom ?? null) };
  });
  await klikNapis('Trenuj');
  const poBez = await page.evaluate(() => {
    const t = window.__game.scene.getScene('zamek');
    return { kasa: t.stan.skarbiec.pokeball, g: t.garnizon.map((o) => o?.poziom ?? null), komunikat: t.komunikat.text };
  });
  sprawdz(
    '„Trenuj" bez zaznaczenia tylko podpowiada',
    poBez.kasa === bez.kasa && JSON.stringify(poBez.g) === JSON.stringify(bez.g) && /zaznacz stworka/.test(poBez.komunikat),
    poBez.komunikat
  );

  await klikSlot(0, 0);
  const przedT = await page.evaluate(async () => {
    const t = window.__game.scene.getScene('zamek');
    const m = await import('/src/data/mapa.ts');
    return { poziom: t.garnizon[0].poziom, kasa: t.stan.skarbiec.pokeball, pula: m.treningiZamku(t.zamek), g1: t.garnizon[1].poziom };
  });
  await klikNapis('Trenuj');
  await page.waitForTimeout(150);
  const poT = await page.evaluate(async () => {
    const t = window.__game.scene.getScene('zamek');
    const m = await import('/src/data/mapa.ts');
    return {
      poziom: t.garnizon[0].poziom,
      kasa: t.stan.skarbiec.pokeball,
      pula: m.treningiZamku(t.zamek),
      g1: t.garnizon[1].poziom,
      tabliczka: t.panel.paski[0].sloty[0].licznik.text,
      komunikat: t.komunikat.text,
    };
  });
  sprawdz('„Trenuj" podnosi zaznaczonemu stworkowi poziom o 1', poT.poziom === przedT.poziom + 1, `${przedT.poziom} → ${poT.poziom}`);
  sprawdz(
    'trening kosztuje pokeballe (kosztTreningu)',
    przedT.poziom === 5 && przedT.kasa - poT.kasa === koszt5,
    `${przedT.kasa} → ${poT.kasa}, koszt ${koszt5}`
  );
  sprawdz('trening zużywa jeden z tygodniowej puli', poT.pula === przedT.pula - 1, `${przedT.pula} → ${poT.pula}`);
  sprawdz('inny stworek tego gatunku nie rośnie', poT.g1 === przedT.g1);
  sprawdz('tabliczka pokazuje nowy poziom', poT.tabliczka === `poz. ${poT.poziom}`, poT.tabliczka);
  await odznacz();
}

console.log('\n=== bohater nie zostaje bez armii ===');
await page.evaluate(() => {
  const t = window.__game.scene.getScene('zamek');
  const b = t.stan.bohater.armia;
  const jeden = b.find(Boolean);
  for (let i = 0; i < b.length; i++) b[i] = null;
  b[0] = jeden;
  t.garnizon[6] = null;
  t.odswiez();
});
await klikSlot(1, 0);
await klikSlot(0, 6);
a = await armie();
sprawdz('ostatni stworek trenera nie przechodzi do garnizonu', a.b[0] !== '—' && a.g[6] === '—', `b0=${a.b[0]}`);

console.log('\n=== okno stworka ===');
await klikSlot(1, 0, { prawy: true });
sprawdz('prawy klik otwiera okno stworka', await oknoStworka());
if (ZRZUTY) {
  await page.waitForTimeout(300);
  await page.locator('canvas').screenshot({ path: 'tools/blind/okno-stworka.png' });
}
const zwolnijWylaczone = await page.evaluate(() => {
  const sc = window.__game.scene.getScene('zamek');
  let jest = false;
  const przejdz = (l) => l.forEach((o) => { if (o.type === 'Text' && /Ostatniego stworka/.test(o.text)) jest = true; if (o.list) przejdz(o.list); });
  przejdz(sc.children.list);
  return jest;
});
sprawdz('ostatniego stworka nie da się wypuścić (powód w oknie)', zwolnijWylaczone);
await page.keyboard.press('Escape');
await page.waitForTimeout(150);
sprawdz('Escape zamyka okno', !(await oknoStworka()));
await klikSlot(0, 0);
await klikSlot(0, 0);
sprawdz('drugi klik w zaznaczony oddział otwiera okno', await oknoStworka());
await page.keyboard.press('Escape');
await page.waitForTimeout(150);
{
  const s = await naPlotno(...Object.values(await slot(0, 0)));
  await page.mouse.move(s.x, s.y);
  await page.mouse.down();
  await page.waitForTimeout(800);
  await page.mouse.up();
  await page.waitForTimeout(150);
}
sprawdz('przytrzymanie (tablet) otwiera okno', await oknoStworka());

console.log('\n=== zwolnienie z garnizonu ===');
const przedZw = (await armie()).g[0];
await klikNapis('Wypuść');
await page.waitForTimeout(250);
await klikNapis('Wypuść');
await page.waitForTimeout(250);
a = await armie();
sprawdz('„Wypuść" z potwierdzeniem usuwa stworka', przedZw !== '—' && a.g[0] === '—' && !(await oknoStworka()), `${przedZw} → ${a.g[0]}`);

console.log('\n=== werbunek bez bohatera idzie do garnizonu ===');
await page.evaluate(() => {
  const t = window.__game.scene.getScene('zamek');
  t.stan.bohater.x += 3;
  t.scene.restart();
});
await page.waitForTimeout(300);
await scena('zamek');
await page.waitForTimeout(500);
const werbunek = await page.evaluate(async () => {
  const t = window.__game.scene.getScene('zamek');
  const m = await import('/src/data/mapa.ts');
  const ilu = (a) => a.filter(Boolean).length;
  t.stan.skarbiec.pokeball = 400;
  const przed = { g: ilu(t.garnizon), b: ilu(t.stan.bohater.armia), zapas: t.zamek.dostepne[0], kasa: t.stan.skarbiec.pokeball };
  const puste = t.garnizon.map((o) => !o);
  t.kup(0);
  const nowy = t.garnizon.find((o, i) => o && puste[i]) ?? null;
  return {
    przed,
    po: { g: ilu(t.garnizon), b: ilu(t.stan.bohater.armia), zapas: t.zamek.dostepne[0], kasa: t.stan.skarbiec.pokeball },
    nowy: nowy && { ile: nowy.ile, poziom: nowy.poziom, tier: nowy.tier },
    koszt: m.KOSZT_ODDZIALU[0],
    bohaterObecny: t.bohaterObecny,
  };
});
sprawdz(
  'bez bohatera stworek trafia do garnizonu — dokładnie jeden',
  !werbunek.bohaterObecny && werbunek.po.g === werbunek.przed.g + 1 && werbunek.po.b === werbunek.przed.b,
  JSON.stringify({ przed: werbunek.przed, po: werbunek.po })
);
sprawdz('zaproszony to młody stworek (poz. 5, jeden)', werbunek.nowy?.ile === 1 && werbunek.nowy?.poziom === 5 && werbunek.nowy?.tier === 0, JSON.stringify(werbunek.nowy));
sprawdz('rezerwat traci dokładnie jednego', werbunek.po.zapas === werbunek.przed.zapas - 1, `${werbunek.przed.zapas} → ${werbunek.po.zapas}`);
sprawdz('zaproszenie kosztuje KOSZT_ODDZIALU', werbunek.przed.kasa - werbunek.po.kasa === werbunek.koszt, `${werbunek.przed.kasa} → ${werbunek.po.kasa}`);
await klikSlot(1, 0);
a = await armie();
sprawdz('rząd bohatera poza zamkiem nie przyjmuje gestów', !(await page.evaluate(() => window.__game.scene.getScene('zamek').panel.zaznaczony)));

console.log('\n=== portret bohatera → ekran bohatera → miasto ===');
await page.evaluate(() => {
  const t = window.__game.scene.getScene('zamek');
  t.stan.bohater.x -= 3;
  // Pokazowa drużyna do zrzutu: czterech stworków u trenera i garnizon
  // z dziurą. Każdy slot to jeden stworek na swoim poziomie.
  const f = (i, poziom) => {
    const u = t.frakcja.units[i];
    return { sprite: u.sprite, nazwa: u.name, ile: 1, frakcja: t.frakcja.id, tier: i, poziom, dosw: 5 * poziom * (poziom - 1) };
  };
  const b = t.stan.bohater.armia;
  [f(0, 14), f(1, 11), f(2, 9), f(3, 7), null, null, null].forEach((o, i) => (b[i] = o));
  const g = t.zamek.garnizon;
  [f(0, 8), null, f(2, 6), f(4, 5), null, null, null].forEach((o, i) => (g[i] = o));
  t.scene.restart();
});
await page.waitForTimeout(300);
await scena('zamek');
await page.waitForTimeout(1500);
if (ZRZUTY) await page.locator('canvas').screenshot({ path: 'tools/blind/miasto-armia.png' });
const portret = await page.evaluate(() => {
  const t = window.__game.scene.getScene('zamek');
  const p = t.panel.paski[1];
  return { x: 12 + 27, y: p.y - 6 + 32 };
});
await klik(portret.x, portret.y);
await scena('bohater');
sprawdz('klik w portret otwiera ekran bohatera', await page.evaluate(() => window.__game.scene.isActive('bohater')));
await page.waitForTimeout(400);
await page.keyboard.press('Escape');
await scena('zamek');
sprawdz('wyjście z ekranu bohatera wraca do miasta', await page.evaluate(() => window.__game.scene.isActive('zamek')));
a = await armie();
sprawdz('garnizon z dziurą przeżył przejście', a.g[0] !== '—' && a.g[1] === '—' && a.g[2] !== '—', a.g.join(' '));

console.log('\n=== zapis i odczyt garnizonu ===');
await page.evaluate(() => window.__game.scene.getScene('zamek').scene.start('adventure'));
await scena('adventure');
await page.waitForTimeout(500);
await page.evaluate(() => window.__game.scene.getScene('adventure').koniecTury());
await page.waitForTimeout(1500);
const zapis = await page.evaluate(() => {
  const k = Object.keys(localStorage).find((x) => x.endsWith('-zapis-auto'));
  const d = JSON.parse(localStorage.getItem(k));
  const z = d.stan.obiekty.find((o) => o.rodzaj === 'zamek' && o.wlasciciel === 'gracz');
  return { k, garnizon: (z.garnizon ?? []).map((o) => (o ? `${o.nazwa}@${o.poziom}${o.ile !== 1 ? `×${o.ile}` : ''}` : '—')) };
});
sprawdz('autozapis zawiera garnizon ze slotami', zapis.garnizon[0] !== '—' && zapis.garnizon[1] === '—' && zapis.garnizon[2] !== '—', zapis.garnizon.join(' '));

const wczytaj = async () => {
  await page.evaluate(() => window.__game.scene.getScene('adventure').scene.start('menu'));
  await scena('menu');
  await page.waitForTimeout(400);
  await page.evaluate(() => window.__game.scene.getScene('menu').wczytajZapis('auto'));
  await scena('adventure');
  await page.waitForTimeout(500);
  return page.evaluate(() => {
    const s = window.__game.scene.getScene('adventure');
    const z = s.stan.obiekty.find((o) => o.rodzaj === 'zamek' && o.wlasciciel === 'gracz');
    return z.garnizon === undefined ? null : z.garnizon.map((o) => (o ? `${o.nazwa}@${o.poziom}${o.ile !== 1 ? `×${o.ile}` : ''}` : '—'));
  });
};
let odczyt = await wczytaj();
sprawdz('odczyt przywraca garnizon co do slotu', JSON.stringify(odczyt) === JSON.stringify(zapis.garnizon), (odczyt ?? []).join(' '));

// Stary zapis: bez pola `garnizon` — ma się wczytać jako pusty garnizon.
await page.evaluate((k) => {
  const d = JSON.parse(localStorage.getItem(k));
  for (const o of d.stan.obiekty) delete o.garnizon;
  localStorage.setItem(k, JSON.stringify(d));
}, zapis.k);
odczyt = await wczytaj();
sprawdz('stary zapis bez pola wczytuje się z pustym garnizonem', odczyt === null || odczyt.every((x) => x === '—'), String(odczyt));

console.log(bledy === 0 ? '\nWszystko przeszło.' : `\n${bledy} sprawdzeń nie przeszło.`);
await browser.close();
process.exit(bledy === 0 ? 0 : 1);
