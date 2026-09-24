// Wspólne dla `zrzut-wynik.mjs` i `probe-misja.mjs`: start misji tą samą
// funkcją co gra, wymuszenie rozstrzygnięcia i klikanie w przyciski po NAPISIE.
//
// Klik po napisie, nie po współrzędnych: przycisk „Dalej" leży w innym
// miejscu na ekranie zwycięstwa, porażki i zakończenia, a sonda, która
// trafia w wyliczony punkt, przestaje działać przy pierwszym przesunięciu
// karty — i zgłasza wtedy zepsuty przycisk, choć zepsuty jest pomiar.

export const KLUCZ_POSTEPU = 'heroes-kampania-v1';
export const KLUCZ_REKORDOW = 'heroes-rekordy-v1';

export const scena = (page, nazwa, timeout = 120000) =>
  page.waitForFunction((n) => window.__game?.scene.getScene(n)?.sys.settings.status === 5, nazwa, { timeout });

/** Sceny aktywne w tej chwili — do komunikatów sond. */
export const aktywne = (page) => page.evaluate(() => window.__game.scene.getScenes(true).map((s) => s.scene.key));

/**
 * Zapisuje postęp i startuje misję przez `rozpocznijMisje` (most `__kampania`
 * z `main.ts`), a potem wchodzi na mapę jak ekran kampanii: stan do rejestru,
 * `scene.start('adventure')`.
 */
export async function startMisji(page, idMisji, postep, { bezWarunkow = false } = {}) {
  await page.evaluate(
    ({ id, p, klucz, bez }) => {
      const K = window.__kampania;
      const pelny = { ...K.nowyPostep(p.trener ?? 'Janek'), ...p };
      localStorage.setItem(klucz, JSON.stringify(pelny));
      const m = K.misjaPoId(id);
      const s = K.rozpocznijMisje(pelny, m, pelny.bonus ?? 0);
      // Okno warunków planuje się w `create`, więc flagę trzeba ustawić
      // PRZED wejściem na mapę — ustawiona później nie odwoła już okna.
      if (bez) s.warunkiPokazane = true;
      const g = window.__game;
      g.registry.set('stan-mapy', s);
      const zywa = g.scene.getScenes(true)[0];
      zywa.scene.start('adventure');
    },
    { id: idMisji, p: postep, klucz: KLUCZ_POSTEPU, bez: bezWarunkow }
  );
  await page.waitForTimeout(300);
  await scena(page, 'adventure');
}

/** Wszystkie zamki przeciwnika przechodzą na gracza i gra sprawdza wynik — tak jak po bitwie. */
export async function wymusWygrana(page, bohater = {}) {
  await page.evaluate((b) => {
    const s = window.__game.scene.getScene('adventure');
    Object.assign(s.stan.bohater, b);
    for (const o of s.stan.obiekty) if (o.rodzaj === 'zamek') o.wlasciciel = 'gracz';
    s.zajety = false;
    s.odswiezWszystko();
  }, bohater);
}

/** Przeciwnik zabiera wszystkie zamki gracza — to, co robi jego tura w `koniecTury`. */
export async function wymusPorazke(page) {
  await page.evaluate(() => {
    const s = window.__game.scene.getScene('adventure');
    for (const o of s.stan.obiekty) if (o.rodzaj === 'zamek' && o.wlasciciel === 'gracz') o.wlasciciel = 'wrog';
    s.zajety = false;
    s.odswiezWszystko();
  });
}

/** Środek przycisku z danym napisem w danej scenie (w pikselach płótna) albo `null`. */
export function gdziePrzycisk(page, nazwaSceny, napis) {
  return page.evaluate(
    ({ n, t }) => {
      const s = window.__game.scene.getScene(n);
      for (const o of s.children.list) {
        if (o.type !== 'Container' || !o.visible) continue;
        const tekst = o.list.find((c) => c.type === 'Text' && c.text === t);
        if (tekst) return { x: o.x, y: o.y };
      }
      return null;
    },
    { n: nazwaSceny, t: napis }
  );
}

/** Czeka, aż przycisk się pojawi (ekran wyniku pokazuje je z opóźnieniem), i klika. */
export async function klikPrzycisk(page, nazwaSceny, napis, timeout = 60000) {
  const koniec = Date.now() + timeout;
  let p = null;
  while (Date.now() < koniec) {
    p = await gdziePrzycisk(page, nazwaSceny, napis);
    if (p) break;
    await page.waitForTimeout(250);
  }
  if (!p) throw new Error(`Brak przycisku „${napis}" w scenie ${nazwaSceny}`);
  const r = await page.locator('canvas').boundingBox();
  await page.mouse.move(r.x + p.x, r.y + p.y);
  await page.mouse.click(r.x + p.x, r.y + p.y);
  return p;
}

/** Zakończone trzy pierwsze misje — postęp tuż przed ostatnią. */
export const POSTEP_PRZED_OSTATNIA = {
  trener: 'Janek',
  ukonczone: ['pierwsze-kroki', 'klucze-do-przeleczy', 'bagienny-szlak'],
  wyniki: {
    'pierwsze-kroki': { dni: 14, punkty: 805 },
    'klucze-do-przeleczy': { dni: 23, punkty: 670 },
    'bagienny-szlak': { dni: 19, punkty: 730 },
  },
  bonus: 0,
  bohater: {
    imie: 'Janek',
    atak: 4,
    obrona: 3,
    artefakty: ['buty', 'pazur', 'tarcza'],
    doswiadczenie: 1500,
    umiejetnosci: { zwiad: 2, napastnik: 1 },
    poziomOdebrany: 6,
  },
};

/**
 * Czeka, aż w scenie pojawi się W PEŁNI widoczny napis (także w kontenerze,
 * po animacji wejścia). Gra w przeglądarce bez sprzętowego rysowania chodzi
 * po kilka klatek na sekundę, więc „odczekaj 2 s" łapie baner w połowie
 * wejścia albo wcale — trzeba pytać o stan, nie o czas.
 */
export async function czekajNaNapis(page, nazwaSceny, napis, timeout = 60000) {
  await page.waitForFunction(
    ({ n, t }) => {
      const s = window.__game?.scene.getScene(n);
      if (!s || s.sys.settings.status !== 5) return false;
      const szukaj = (lista, alfa) =>
        lista.some((o) => {
          const a = alfa * (o.alpha ?? 1);
          if (o.type === 'Text' && o.text === t && o.visible && a > 0.95 && (o.parentContainer?.scale ?? 1) > 0.97)
            return true;
          return o.type === 'Container' && o.visible && szukaj(o.list, a);
        });
      return szukaj(s.children.list, 1);
    },
    { n: nazwaSceny, t: napis },
    { timeout }
  );
}
