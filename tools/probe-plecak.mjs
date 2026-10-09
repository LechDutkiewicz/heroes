// Etap 5 w przeglądarce: okno „Kto walczy?", plecak trenera (mikstura,
// pokeball zablokowany) i powrót na mapę — okno łapania po wygranej z dzikim
// stadem (złapany dołącza, pokeballe schodzą o cenę), stworki spoza dwójki nie mdleją.
// Użycie: node tools/probe-plecak.mjs [--url http://localhost:5210/] [--out katalog-na-zrzuty]
import { chromium } from 'playwright';
const arg = (n, d) => (process.argv.indexOf(n) > 0 ? process.argv[process.argv.indexOf(n) + 1] : d);
const URL = arg('--url', 'http://localhost:5210/') + '?ekran=mapa';
const OUT = arg('--out', '');
const b = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || '/opt/pw-browsers/chromium' });
const page = await b.newPage({ viewport: { width: 960, height: 694 } });
const bledy = [];
page.on('pageerror', (e) => bledy.push(String(e)));
const scena = (n) => page.waitForFunction((x) => window.__game?.scene.getScene(x)?.sys.settings.status === 5, n, { timeout: 400000 });
const zrzut = async (nazwa) => OUT && page.locator('canvas').screenshot({ path: `${OUT}/${nazwa}.png` });
await page.goto(URL, { waitUntil: 'domcontentloaded' });
await scena('adventure');
await page.waitForTimeout(1500);

const przed = await page.evaluate(() => {
  const s = window.__game.scene.getScene('adventure');
  const st = s.stan;
  // Sześć sprawnych stworków: więcej niż mieści pole.
  // Sześciu z różnych gatunków (jeden stworek danego gatunku) — więcej niż mieści pole.
  const wzor = st.bohater.armia.filter(Boolean)[0];
  const bor = [['00193', 'Pyroko'], ['00020', 'Flamir'], ['00218', 'Aquino'], ['00030', 'Torrenar'], ['00096', 'Verdiko'], ['00227', 'Silvena']];
  st.bohater.armia = Array.from({ length: 7 }, (_, i) =>
    i < 6 ? { ...wzor, sprite: bor[i][0], nazwa: bor[i][1], tier: i, ile: 1, poziom: 8 + i, omdlaly: undefined } : null
  );
  const straz = st.obiekty.find((o) => o.rodzaj === 'potwor' && !o.zebrany && o.oddzialy?.length);
  s.zajety = false;
  s.zacznijBitwe(straz);
  return { pb: st.skarbiec.pokeball, straz: straz.id };
});
await scena('battle');
await page.waitForTimeout(1500);
const okno = await page.evaluate(() => !!window.__game.scene.getScene('battle').wyborSkladu);
await zrzut('plecak-wybor');
await page.evaluate(() => window.__game.scene.getScene('battle').wyborSkladu.zatwierdz());
await page.waitForFunction(
  () => {
    const s = window.__game.scene.getScene('battle');
    const a = s.activeUnit();
    return a && a.side === 'player' && !s.busy;
  },
  null,
  { timeout: 400000 }
);
const naPolu = await page.evaluate(() => window.__game.scene.getScene('battle').units.filter((u) => u.side === 'player').length);
// Ranny swój i osłabiony wróg — żeby było co leczyć i kogo łapać.
await page.evaluate(() => {
  const s = window.__game.scene.getScene('battle');
  const swoj = s.units.find((u) => u.side === 'player');
  swoj.topHp = Math.max(1, Math.round(swoj.def.hp * 0.3));
  s.refreshStack(swoj);
  const wrog = s.units.find((u) => u.side === 'enemy');
  wrog.topHp = Math.max(1, Math.round(wrog.def.hp * 0.15));
  s.refreshStack(wrog);
  s.otworzPlecak();
});
await page.waitForTimeout(500);
await zrzut('plecak-okno');
const leczenie = await page.evaluate(() => {
  const s = window.__game.scene.getScene('battle');
  const swoj = s.units.find((u) => u.side === 'player');
  const przed = swoj.topHp;
  const mikstPrzed = s.plecak.mikstura;
  s.wybierzPrzedmiot('mikstura');
  s.uzyjNa(swoj);
  return { przed, po: swoj.topHp, mikstPrzed, mikstur: s.plecak.mikstura };
});
// Łapania w bitwie już nie ma (za mocne) — pokeball nie daje się wybrać.
const pokeballZablokowany = await page.evaluate(() => {
  const s = window.__game.scene.getScene('battle');
  s.przedmiotWRundzie = 0; // drugi przedmiot w tej samej rundzie — tylko w sondzie
  s.wybierzPrzedmiot('pokeball');
  return s.celowanie === null && s.blokadaPrzedmiotu('pokeball') !== null;
});
const zlapanych = await page.evaluate(() => window.__game.scene.getScene('battle').zlapani.length);
await page.evaluate(() => window.__game.scene.getScene('battle').rozstrzygnijNatychmiast(true));
await scena('adventure');
// Po wygranej z dzikim stadem — okno „Złap jednego!" (łapanie za pokeballe).
const lapanie = await page
  .waitForFunction(() => window.__game.scene.getScene('adventure').lapanie, null, { timeout: 60000 })
  .then(() => true)
  .catch(() => false);
await page.waitForTimeout(600);
await zrzut('plecak-lapanie');
const zlapany = await page.evaluate(() => {
  const s = window.__game.scene.getScene('adventure');
  if (!s.lapanie) return null;
  const pbPrzed = s.stan.skarbiec.pokeball;
  const od = s.lapanie.kandydaci[0];
  s.lapanie.zamknij(od);
  return { nazwa: od.nazwa, koszt: pbPrzed - s.stan.skarbiec.pokeball };
});
// Mini-gra: pierwszy rzut chybiony, drugi trafiony (wynik wymuszony).
const minigra = await page
  .waitForFunction(() => window.__game.scene.getScene('adventure').minigra, null, { timeout: 10000 })
  .then(() => true)
  .catch(() => false);
await page.waitForTimeout(500);
await zrzut('plecak-minigra');
await page.evaluate(() => window.__game.scene.getScene('adventure').minigra?.rzuc(false));
await page.waitForTimeout(1500);
const poPudle = await page.evaluate(() => window.__game.scene.getScene('adventure').stan.bohater.armia.filter(Boolean).length);
// Rzut trafiony — powtarzany, bo w wolnej przeglądarce poprzedni lot kuli
// mógł jeszcze trwać (wtedy `rzuc` nic nie robi).
await page.waitForFunction(
  () => {
    const s = window.__game.scene.getScene('adventure');
    s.minigra?.rzuc(true);
    return !s.zajety;
  },
  null,
  { timeout: 30000, polling: 400 }
);
await page.waitForTimeout(500);
await zrzut('plecak-mapa');
const po = await page.evaluate(() => {
  const st = window.__game.scene.getScene('adventure').stan;
  return {
    pb: st.skarbiec.pokeball,
    druzyna: st.bohater.armia.filter(Boolean).length,
    zemdleni: st.bohater.armia.filter((o) => o?.omdlaly).length,
    plecakMikstur: st.bohater.plecak?.mikstura,
  };
});
const zle = [];
if (!okno) zle.push('brak okna „Kto walczy?" przy sześciu stworkach');
if (naPolu !== 2) zle.push(`na polu ${naPolu} stworków gracza zamiast 2`);
// Plecak z mapy (Pokémart): nowa gra ma jedną miksturę — po użyciu zero.
if (!(leczenie.po > leczenie.przed && leczenie.mikstPrzed === 1 && leczenie.mikstur === 0))
  zle.push(`mikstura nie działa: ${JSON.stringify(leczenie)}`);
if (po.plecakMikstur !== 0) zle.push(`zużyta mikstura wróciła do plecaka na mapie: ${po.plecakMikstur}`);
if (!pokeballZablokowany) zle.push('pokeball dalej daje się rzucić w bitwie');
if (zlapanych !== 0) zle.push(`złapanych w bitwie: ${zlapanych}`);
if (!lapanie || !zlapany) zle.push('po wygranej z dzikim stadem nie było okna łapania');
if (!minigra) zle.push('po wyborze stworka nie ruszyła mini-gra');
if (poPudle !== 6) zle.push(`po pudle drużyna ma ${poPudle} (pudło nie może łapać)`);
if (po.druzyna !== 7) zle.push(`drużyna po łapaniu: ${po.druzyna} (oczekiwane 7)`);
if (zlapany && (zlapany.koszt < 10 || po.pb !== przed.pb - zlapany.koszt))
  zle.push(`pokeballe ${przed.pb} → ${po.pb}, koszt łapania ${zlapany?.koszt}`);
if (po.zemdleni !== 0) zle.push(`zemdlonych po wygranej bez strat: ${po.zemdleni} (stworki spoza dwójki mdlały)`);
if (bledy.length) zle.push('błędy strony: ' + bledy.join(' | '));
console.log({ przed, naPolu, leczenie, zlapanych, zlapany, po });
console.log(zle.length ? 'ŹLE:\n' + zle.join('\n') : 'OK — wybór dwójki, mikstura, bez łapania w bitwie, łapanie po wygranej (mini-gra)');
await b.close();
process.exit(zle.length ? 1 : 0);
