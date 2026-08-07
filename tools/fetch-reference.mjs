// Ściąga materiał wzorcowy przez przeglądarkę i zapisuje jako obrazy.
// Przez przeglądarkę, bo część serwisów odrzuca gołe curl-e, a i tak
// potrzebujemy tego, co widać na ekranie, a nie samego pliku.
//
//   node tools/fetch-reference.mjs <url> <nazwa> [--sel "css"]

import { chromium } from 'playwright';
import { mkdir } from 'node:fs/promises';

const [url, name] = process.argv.slice(2);
const selIdx = process.argv.indexOf('--sel');
const sel = selIdx !== -1 ? process.argv[selIdx + 1] : null;
const OUT = 'tools/reference';

const main = async () => {
  await mkdir(OUT, { recursive: true });
  // Chromium nie czyta HTTPS_PROXY z otoczenia — trzeba mu ją podać wprost,
  // inaczej ruch na zewnątrz po prostu nie wychodzi.
  const proxy = process.env.HTTPS_PROXY || process.env.https_proxy;
  const browser = await chromium.launch({
    executablePath: process.env.CHROMIUM_PATH || '/opt/pw-browsers/chromium-1194/chrome-linux/chrome',
    ...(proxy ? { proxy: { server: proxy } } : {}),
  });
  const page = await browser.newPage({
    viewport: { width: 1400, height: 1000 },
    deviceScaleFactor: 2,
    userAgent:
      'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  });
  await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 60000 });
  await page.waitForTimeout(3000);

  if (sel) {
    await page.locator(sel).first().screenshot({ path: `${OUT}/${name}.png` });
  } else {
    await page.screenshot({ path: `${OUT}/${name}.png`, fullPage: false });
  }
  console.log(`zapisano ${OUT}/${name}.png`);
  await browser.close();
};

main().catch((e) => {
  console.error(e.message);
  process.exit(1);
});
