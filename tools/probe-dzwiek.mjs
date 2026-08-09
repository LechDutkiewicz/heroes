// Sonda: czy dźwięki są naprawdę wyzwalane w trakcie bitwy?
//
// Test dymny potwierdza tylko, że pliki się wczytały. To nie to samo co
// „podpięcie działa": zdarzenie może nigdy nie zawołać sfx(), a próbki i tak
// będą w pamięci. Tutaj podmieniamy fabrykę dźwięku Phasera na liczydło
// i sprawdzamy, które zdarzenia realnie padły w prawdziwej bitwie.
import { chromium } from 'playwright';

const browser = await chromium.launch({
  executablePath: process.env.CHROMIUM_PATH || '/opt/pw-browsers/chromium-1194/chrome-linux/chrome',
});
const page = await browser.newPage({ viewport: { width: 1000, height: 900 } });
await page.goto('http://localhost:4173/?seed=7', { waitUntil: 'domcontentloaded' });
await page.waitForFunction(
  () => window.__game?.scene.getScene('battle')?.sys.settings.status === 5,
  null, { timeout: 30000 }
);
await page.evaluate(() => {
  const s = window.__game.scene.getScene('battle');
  window.__licznik = {};
  const dodaj = s.sound.add.bind(s.sound);
  s.sound.add = (klucz, opcje) => {
    window.__licznik[klucz] = (window.__licznik[klucz] ?? 0) + 1;
    return dodaj(klucz, opcje);
  };
  s.time.timeScale = 10;
});

const start = Date.now();
while (Date.now() - start < 40000) {
  await page.keyboard.press('o').catch(() => {});
  await page.waitForTimeout(60);
  const koniec = await page.evaluate(() => !!window.__game.scene.getScene('battle').gameOver);
  if (koniec) break;
}
const licznik = await page.evaluate(() => window.__licznik);
const stan = await page.evaluate(() => {
  const s = window.__game.scene.getScene('battle');
  return { runda: s.battle.round, zywe: s.battle.units.length };
});
await browser.close();

console.log(`Po ${stan.runda} rundach (${stan.zywe} oddziałów przy życiu):`);
const suma = Object.values(licznik).reduce((a, b) => a + b, 0);
for (const [k, n] of Object.entries(licznik).sort((a, b) => b[1] - a[1])) {
  console.log(`  ${k.padEnd(18)} ${String(n).padStart(3)}`);
}
console.log(suma ? `\nRazem ${suma} odtworzeń.` : '\nŻADEN dźwięk nie został wyzwolony.');
process.exitCode = suma > 0 ? 0 : 1;
