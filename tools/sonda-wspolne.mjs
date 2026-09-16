// Wspólne dla sond przeglądarkowych: podchodzenie do obiektów i zamykanie
// okna awansu.
//
// Po co to istnieje
// -----------------
// Sondy przestawiały bohatera na sztywno na pole nad obiektem (`y - 1`). Na
// planszy 36 × 36, rzadko zabudowanej, nigdy nie chybiało. Na planszy 72 × 72
// obiekty stoją gęsto i prawie każda rzecz warta zabrania ma obok STRAŻ —
// czyli pole nad artefaktem bywa zajęte przez potwora albo leży w jego strefie
// kontroli. Bohater lądował wtedy na straży, marsz nie dochodził do celu,
// a sonda ogłaszała zepsute podnoszenie artefaktów, zepsuty powrót z bitwy
// i zepsute znikanie potworów — trzy usterki naraz, wszystkie nieprawdziwe.
//
// To jest ta sama pułapka, co zawsze w tym projekcie: zanim uznasz, że coś
// jest zepsute, sprawdź, czym to mierzysz.

/**
 * Wstawia na stronę `window.__podejdz(scena, filtr, kierunki?)`.
 *
 * Funkcja wybiera pierwszy obiekt pasujący do `filtr`, do którego DA SIĘ
 * podejść: pole obok jest przejezdne, puste i nie leży w strefie kontroli
 * cudzego potwora, a samo pole celu też nie jest przez nikogo pilnowane
 * (inaczej zamiast podniesienia artefaktu zaczyna się bitwa z kimś innym).
 * Ustawia tam bohatera z pełnym ruchem i zwraca ten obiekt albo `null`.
 *
 * `kierunki` pozwala narzucić kolejność prób — sonda budowli staje POD
 * budowlą, żeby widzieć jej rysunek i móc w niego kliknąć.
 */
export async function zainstalujPodejdz(page) {
  await page.evaluate(() => {
    window.__podejdz = (s, filtr, kierunki) => {
      const st = s.stan;
      const przejezdne = (x, y) =>
        x >= 0 && y >= 0 && x < st.szer && y < st.wys && !['skaly', 'woda', 'las'].includes(st.teren[y][x]);
      const proby = kierunki ?? [
        [0, -1], [-1, 0], [1, 0], [0, 1], [-1, -1], [1, -1], [-1, 1], [1, 1],
      ];
      for (const o of st.obiekty.filter(filtr)) {
        const obce = st.obiekty.filter((m) => m.rodzaj === 'potwor' && !m.zebrany && m.id !== o.id);
        const pilnowane = (x, y) => obce.some((m) => Math.abs(m.x - x) <= 1 && Math.abs(m.y - y) <= 1);
        if (o.rodzaj !== 'potwor' && pilnowane(o.x, o.y)) continue;
        const zajete = new Set(st.obiekty.filter((x) => !x.zebrany).map((x) => `${x.x},${x.y}`));
        for (const [dx, dy] of proby) {
          const x = o.x + dx;
          const y = o.y + dy;
          if (!przejezdne(x, y) || zajete.has(`${x},${y}`) || pilnowane(x, y)) continue;
          st.bohater.x = x;
          st.bohater.y = y;
          st.bohater.ruch = 3000;
          s.zajety = false;
          return o;
        }
      }
      return null;
    };
  });
}

/** Klik w punkt PŁÓTNA, nie strony — płótno ma wokół siebie margines. */
async function klikNaPlotnie(page, x, y) {
  const p = await page.locator('canvas').boundingBox();
  await page.mouse.click(p.x + x, p.y + y);
}

/**
 * Zamyka okno awansu, jeśli wyszło.
 *
 * Musi je zamykać KAŻDA sonda, która wygrywa bitwy. Okno zatrzymuje mapę
 * i czeka na wybór umiejętności, więc niezamknięte wygląda jak zawieszona gra:
 * `probe-zwis.mjs` zgłaszała „po bitwie nie da się sterować" trzy razy pod
 * rząd, a grze nic nie było — po prostu na planszy 72 × 72 straże są silniejsze
 * i bohater awansuje już w pierwszych walkach, czego plansza 36 × 36 nie
 * robiła. Okno wchodzi z opóźnieniem (czeka na napis o zwycięstwie), więc
 * czekamy na nie, zamiast poddawać się od razu.
 */
export async function zamknijAwans(page) {
  for (let proba = 0; proba < 10; proba++) {
    const punkt = await page.evaluate(() => {
      const s = window.__game.scene.getScene('adventure');
      const c = s.children.list.find(
        (o) =>
          o.type === 'Container' &&
          o.list?.some((x) => x.type === 'Text' && /Naucz się|Ulepsz|Dalej/.test(x.text))
      );
      return c ? { x: c.x, y: c.y } : null;
    });
    if (!punkt) {
      const zablokowana = await page.evaluate(
        () => window.__game.scene.getScene('adventure').zajety === true
      );
      if (!zablokowana) return proba > 0;
      await page.waitForTimeout(400);
      continue;
    }
    await klikNaPlotnie(page, punkt.x, punkt.y);
    await page.waitForTimeout(600);
  }
  return true;
}
