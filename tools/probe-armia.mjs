// Sonda paska armii w mieście — sprawdzana MYSZĄ, nie wywołaniami z kodu.
//
// Arytmetykę (co wolno, ile wolno oddać) sprawdzają `probe-armia.ts`
// i `probe-garnizon.ts`. Tu chodzi o to, co może się zepsuć tylko na ekranie:
// czy klik trafia w slot, czy drugi klik zamienia / łączy, czy przeciągnięcie
// między garnizonem a bohaterem przenosi, czy Shift+klik otwiera okno
// podziału, czy prawy klik / podwójny klik / przytrzymanie otwiera okno
// stworka, czy klik w portret prowadzi na ekran bohatera i z powrotem, i czy
// garnizon przeżywa zapis i odczyt (także stary zapis bez pola `garnizon`).
//
//   node tools/probe-armia.mjs [--url http://localhost:5217] [--zrzuty]
//
// `--zrzuty` zapisuje tools/blind/miasto-armia.png, okno-stworka.png
// i miasto-podziel.png.

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
/** Armie jako „sprite×ile" — garnizon i bohater. */
const armie = () =>
  page.evaluate(() => {
    const t = window.__game.scene.getScene('zamek');
    const pisz = (a) => a.map((o) => (o ? `${o.nazwa}×${o.ile}` : '—'));
    return { g: pisz(t.garnizon), b: pisz(t.stan.bohater.armia), zamekG: pisz(t.zamek.garnizon ?? []) };
  });
const oknoStworka = () => page.evaluate(() => !!window.__game.scene.getScene('zamek').panel.okno?.otwarty);
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
  z.dostepne = [6, 4, 3, 0, 2, 0];
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

console.log('\n=== zamiana w obrębie bohatera ===');
const przed = a.b.slice();
await klikSlot(1, 0);
sprawdz('pierwszy klik zaznacza', await page.evaluate(() => window.__game.scene.getScene('zamek').panel.zaznaczony));
await klikSlot(1, 1);
a = await armie();
sprawdz('drugi klik w inny gatunek zamienia', a.b[0] === przed[1] && a.b[1] === przed[0], `${przed.slice(0, 2)} → ${a.b.slice(0, 2)}`);

console.log('\n=== przeciągnięcie do garnizonu ===');
{
  const z = await naPlotno(...Object.values(await slot(1, 1)));
  const d = await naPlotno(...Object.values(await slot(0, 0)));
  await page.mouse.move(z.x, z.y);
  await page.mouse.down();
  for (let k = 1; k <= 8; k++) await page.mouse.move(z.x + ((d.x - z.x) * k) / 8, z.y + ((d.y - z.y) * k) / 8);
  await page.mouse.up();
  await page.waitForTimeout(150);
}
a = await armie();
sprawdz('oddział przeszedł do garnizonu', a.g[0] === przed[0] && a.b[1] === '—', `g0=${a.g[0]}, b1=${a.b[1]}`);
sprawdz('garnizon siedzi w stanie zamku', a.zamekG[0] === a.g[0]);

console.log('\n=== podział (Shift+klik) ===');
await klikSlot(0, 0);
await klikSlot(0, 1, { shift: true });
const okno = await page.evaluate(() => {
  const p = window.__game.scene.getScene('zamek').panel;
  return p.podzial ? { ile: p.podzial.ile, maks: p.podzial.maks } : null;
});
sprawdz('Shift+klik otwiera okno podziału', !!okno, JSON.stringify(okno));
if (okno) {
  await page.keyboard.press('ArrowRight');
  await page.keyboard.press('ArrowRight');
  const ile = await page.evaluate(() => window.__game.scene.getScene('zamek').panel.podzial.ile);
  sprawdz('strzałki zmieniają liczbę', ile === okno.ile + 2, `${okno.ile} → ${ile}`);
  if (ZRZUTY) {
    await page.waitForTimeout(250);
    await page.locator('canvas').screenshot({ path: 'tools/blind/miasto-podziel.png' });
  }
  await klikNapis('Podziel');
  // „Podziel" jest też na tabliczce pod komunikatem — ostatnia na liście to ta w oknie.
  await page.waitForTimeout(150);
}
a = await armie();
const [n0, n1] = [a.g[0], a.g[1]].map((x) => Number(x.split('×')[1]));
sprawdz('stos rozdzielony na dwa', n0 + n1 === Number(przed[0].split('×')[1]) && n1 > 0, `${a.g[0]} + ${a.g[1]}`);

console.log('\n=== łączenie ===');
await klikSlot(0, 1);
await klikSlot(0, 0);
a = await armie();
sprawdz('ten sam gatunek łączy się w jeden stos', a.g[1] === '—' && a.g[0] === przed[0], a.g.slice(0, 2).join(' '));

console.log('\n=== „Podziel" z tabliczki, między rzędami ===');
await klikSlot(0, 0);
await klikNapis('Podziel');
await klikSlot(1, 5);
const okno2 = await page.evaluate(() => !!window.__game.scene.getScene('zamek').panel.podzial);
sprawdz('tabliczka + klik w slot bohatera otwiera podział', okno2);
await page.keyboard.press('Enter');
await page.waitForTimeout(150);
a = await armie();
sprawdz('część oddziału przeszła do bohatera', a.b[5] !== '—' && a.g[0] !== '—', `g0=${a.g[0]}, b5=${a.b[5]}`);

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
sprawdz('ostatni stos bohatera nie przechodzi do garnizonu', a.b[0] !== '—' && a.g[6] === '—', `b0=${a.b[0]}`);

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
  const przejdz = (l) => l.forEach((o) => { if (o.type === 'Text' && /Ostatniego oddziału/.test(o.text)) jest = true; if (o.list) przejdz(o.list); });
  przejdz(sc.children.list);
  return jest;
});
sprawdz('ostatniego oddziału nie da się zwolnić (powód w oknie)', zwolnijWylaczone);
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
await klikNapis('Zwolnij');
await page.waitForTimeout(250);
await klikNapis('Zwolnij');
await page.waitForTimeout(250);
a = await armie();
sprawdz('„Zwolnij" z potwierdzeniem usuwa oddział', a.g[0] === '—' && !(await oknoStworka()), `${przedZw} → ${a.g[0]}`);

console.log('\n=== werbunek bez bohatera idzie do garnizonu ===');
await page.evaluate(() => {
  const t = window.__game.scene.getScene('zamek');
  t.stan.bohater.x += 3;
  t.scene.restart();
});
await page.waitForTimeout(300);
await scena('zamek');
await page.waitForTimeout(500);
const werbunek = await page.evaluate(() => {
  const t = window.__game.scene.getScene('zamek');
  const suma = (a) => a.reduce((s, o) => s + (o ? o.ile : 0), 0);
  const przed = { g: suma(t.garnizon), b: suma(t.stan.bohater.armia) };
  t.kup(0);
  return { przed, po: { g: suma(t.garnizon), b: suma(t.stan.bohater.armia) }, bohaterObecny: t.bohaterObecny };
});
sprawdz(
  'bez bohatera stworki trafiają do garnizonu',
  !werbunek.bohaterObecny && werbunek.po.g > werbunek.przed.g && werbunek.po.b === werbunek.przed.b,
  JSON.stringify(werbunek)
);
await klikSlot(1, 0);
a = await armie();
sprawdz('rząd bohatera poza zamkiem nie przyjmuje gestów', !(await page.evaluate(() => window.__game.scene.getScene('zamek').panel.zaznaczony)));

console.log('\n=== portret bohatera → ekran bohatera → miasto ===');
await page.evaluate(() => {
  const t = window.__game.scene.getScene('zamek');
  t.stan.bohater.x -= 3;
  // Pokazowa armia do zrzutu: pełny bohater i garnizon z dziurą.
  const f = (i, ile) => {
    const u = t.frakcja.units[i];
    return { sprite: u.sprite, nazwa: u.name, ile, frakcja: t.frakcja.id, tier: i };
  };
  const b = t.stan.bohater.armia;
  [f(0, 20), f(1, 9), f(2, 6), f(3, 4), null, null, null].forEach((o, i) => (b[i] = o));
  const g = t.zamek.garnizon;
  [f(0, 18), null, f(2, 12), f(4, 3), null, null, null].forEach((o, i) => (g[i] = o));
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
  return { k, garnizon: (z.garnizon ?? []).map((o) => (o ? `${o.nazwa}×${o.ile}` : '—')) };
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
    return z.garnizon === undefined ? null : z.garnizon.map((o) => (o ? `${o.nazwa}×${o.ile}` : '—'));
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
