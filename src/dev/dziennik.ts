/**
 * Dziennik diagnostyczny — do zgłaszania błędów.
 *
 * Problem, który to rozwiązuje: zgłoszenie „przeciwnik zniknął po ataku”
 * jest nie do odtworzenia. Frakcje, teren i układ armii są losowane, a gra
 * nie zostawiała po sobie żadnego śladu — ani ziarna losowania, ani historii
 * kliknięć, ani nawet wyjątku z konsoli, bo konsola znika razem z kartą.
 *
 * Dziennik trzyma w pamięci ostatnie `POJEMNOSC` zdarzeń (bufor pierścieniowy,
 * więc długa sesja nie zjada pamięci), łapie wyjątki i odrzucone obietnice,
 * i na żądanie składa z tego raport gotowy do wklejenia w zgłoszenie.
 *
 * Klawisz **F8** otwiera podgląd raportu; w nim kopiowanie do schowka i zapis
 * do pliku. `?dziennik=1` otwiera podgląd od razu przy starcie.
 *
 * Dwie zasady, których się trzymam:
 * 1. Dziennik nie może wywrócić gry. Każde wejście jest w `try`, a zapis
 *    zdarzenia nigdy nie rzuca — awaria narzędzia diagnostycznego byłaby
 *    gorsza niż brak narzędzia.
 * 2. Zapisujemy tylko to, co pochodzi z gry. Żadnych danych o użytkowniku
 *    poza tym, co i tak podaje przeglądarka każdej stronie (user agent,
 *    rozmiar okna) — raport ląduje w publicznym zgłoszeniu.
 */

/** Ile ostatnich zdarzeń pamiętamy. 400 to około dwóch pełnych bitew. */
const POJEMNOSC = 400;

/** Ile znaków najwyżej ma jedno pole tekstowe w zdarzeniu. */
const LIMIT_TEKSTU = 400;

export type Waga = 'info' | 'uwaga' | 'blad';

export interface Wpis {
  /** Milisekundy od startu sesji — ważniejsze niż zegar ścienny. */
  t: number;
  waga: Waga;
  /** Skąd: `bitwa`, `mapa`, `zamek`, `scena`, `js`, `zasob`… */
  zrodlo: string;
  tekst: string;
  dane?: unknown;
}

const start = Date.now();
const wpisy: Wpis[] = [];
let bledow = 0;
let podpiete = false;

/** Ziarno sesji — patrz `ziarnoSesji()`. */
let ziarno = 0;

/** Migawki stanu dostarczane przez sceny; klucz to nazwa sceny. */
const migawki = new Map<string, () => unknown>();

function przytnij(x: unknown): unknown {
  if (typeof x === 'string') {
    return x.length > LIMIT_TEKSTU ? `${x.slice(0, LIMIT_TEKSTU)}…` : x;
  }
  return x;
}

/**
 * Zapisuje zdarzenie. Nigdy nie rzuca i nie zwraca niczego, co trzeba by
 * obsłużyć — wołanie ma być tak tanie, żeby nie było powodu go pomijać.
 */
export function zapisz(zrodlo: string, tekst: string, dane?: unknown, waga: Waga = 'info') {
  try {
    if (waga === 'blad') bledow++;
    wpisy.push({
      t: Date.now() - start,
      waga,
      zrodlo,
      tekst: String(przytnij(tekst)),
      dane: dane === undefined ? undefined : bezpieczne(dane),
    });
    if (wpisy.length > POJEMNOSC) wpisy.splice(0, wpisy.length - POJEMNOSC);
  } catch {
    /* dziennik nie ma prawa przerwać gry */
  }
}

export const uwaga = (zrodlo: string, tekst: string, dane?: unknown) =>
  zapisz(zrodlo, tekst, dane, 'uwaga');
export const blad = (zrodlo: string, tekst: string, dane?: unknown) =>
  zapisz(zrodlo, tekst, dane, 'blad');

/**
 * Przepuszcza dane przez JSON, żeby w buforze nie wylądowała żywa referencja
 * do obiektu Phasera. Bez tego raport pokazywałby stan z chwili *odczytu*,
 * a nie z chwili zdarzenia — i potrafiłby ciągnąć za sobą całą scenę.
 */
function bezpieczne(dane: unknown): unknown {
  try {
    return JSON.parse(
      JSON.stringify(dane, (_k, v) => {
        if (typeof v === 'number' && !Number.isInteger(v)) return Math.round(v * 100) / 100;
        if (typeof v === 'string') return przytnij(v);
        return v;
      })
    );
  } catch {
    return String(dane);
  }
}

/**
 * Ziarno sesji.
 *
 * Bez niego zgłoszenie „to się stało w bitwie z Leśnymi” jest nie do
 * powtórzenia, bo frakcje, teren i rzędy startowe są losowane. Ziarno jest
 * losowane raz przy starcie i wysiewane w globalnym generatorze Phasera,
 * więc cała sesja daje się odtworzyć adresem `?seed=<ziarno>`. Gdy adres już
 * zawiera `seed`, bierzemy go stamtąd i niczego nie nadpisujemy.
 */
export function ziarnoSesji(): number {
  return ziarno;
}

/**
 * Odnotowuje wejście i wyjście ze sceny. Bez tego z raportu nie wynika, na
 * którym ekranie padł błąd.
 *
 * Podpięcie robi sama scena w `create`, a nie `main.ts` przez zdarzenia gry:
 * pierwsza scena rusza w trakcie rozruchu gry, więc jej START pada, zanim
 * cokolwiek z zewnątrz zdąży się podpiąć — i najważniejszy wpis przepadał.
 */
export function sledzScene(scena: {
  scene: { key: string };
  events: { once(zdarzenie: string, fn: () => void): unknown };
}) {
  zapisz('scena', `start: ${scena.scene.key}`);
  scena.events.once('shutdown', () => zapisz('scena', `koniec: ${scena.scene.key}`));
}

/** Rejestruje dostawcę migawki stanu dla sceny (wołane przez sceny). */
export function migawkaStanu(nazwa: string, zrodlo: () => unknown) {
  migawki.set(nazwa, zrodlo);
}

// ---------- podpięcie do przeglądarki i gry ----------

interface KontekstGry {
  /** Wersja Phasera i lista aktywnych scen — pobierane leniwie. */
  sceny?: () => string[];
  fps?: () => number;
}

let kontekst: KontekstGry = {};

/**
 * Podpina łapanie błędów i skrót klawiszowy oraz losuje ziarno sesji. Woła się
 * raz, z `main.ts`, ZANIM wystartuje gra — inaczej wyjątki z jej rozruchu
 * (brak WebGL, brakująca tekstura) przepadają. Samo wysianie ziarna idzie
 * osobno, przez `wysiejZiarno`, bo generator Phasera powstaje dopiero razem
 * z grą.
 */
export function wlaczDziennik(opcje: { kontekst?: KontekstGry } = {}) {
  if (podpiete) return;
  podpiete = true;
  kontekst = opcje.kontekst ?? {};

  const params = new URLSearchParams(location.search);
  const zAdresu = params.get('seed');
  ziarno = zAdresu !== null && zAdresu !== '' ? Number(zAdresu) : Math.floor(Math.random() * 1e9);
  if (!Number.isFinite(ziarno)) ziarno = 1;

  zapisz('sesja', 'start', {
    ziarno,
    adres: location.href,
    przegladarka: navigator.userAgent,
    okno: `${window.innerWidth}×${window.innerHeight}`,
    ekran: `${screen.width}×${screen.height}@${window.devicePixelRatio}`,
    jezyk: navigator.language,
  });

  window.addEventListener('error', (e) => {
    // Błędy wczytywania zasobów przychodzą tym samym kanałem, ale bez `error`.
    const cel = e.target as HTMLElement | null;
    if (cel && cel !== (window as unknown as HTMLElement) && (cel as HTMLImageElement).src) {
      blad('zasob', 'nie wczytano pliku', { src: (cel as HTMLImageElement).src });
      return;
    }
    blad('js', e.message, {
      plik: `${e.filename}:${e.lineno}:${e.colno}`,
      stos: e.error instanceof Error ? e.error.stack : undefined,
    });
  }, true);

  window.addEventListener('unhandledrejection', (e) => {
    const p = e.reason;
    blad('js', `odrzucona obietnica: ${p instanceof Error ? p.message : String(p)}`, {
      stos: p instanceof Error ? p.stack : undefined,
    });
  });

  // Konsola bywa jedynym miejscem, gdzie Phaser mówi o kłopocie (brakująca
  // tekstura, zablokowany dźwięk). Podglądamy ją, ale nie zabieramy — oryginał
  // dalej pisze, więc nic nie znika z narzędzi deweloperskich.
  for (const poziom of ['warn', 'error'] as const) {
    const oryginal = console[poziom].bind(console);
    console[poziom] = (...args: unknown[]) => {
      zapisz('konsola', args.map((a) => (a instanceof Error ? a.message : String(a))).join(' '),
        undefined, poziom === 'error' ? 'blad' : 'uwaga');
      oryginal(...args);
    };
  }

  window.addEventListener('keydown', (e) => {
    if (e.key === 'F8') {
      e.preventDefault();
      przelaczPodglad();
    }
  });

  if (params.get('dziennik') === '1') setTimeout(przelaczPodglad, 300);

  // Most dla sond i testu dymnego: raport bez klikania.
  (window as unknown as Record<string, unknown>).__dziennik = {
    raport,
    wpisy: () => wpisy.slice(),
    bledow: () => bledow,
    ziarno: () => ziarno,
  };
}

/**
 * Wysiewa ziarno sesji w generatorze gry. Woła się tuż po utworzeniu `Game`.
 * Przy `?seed=…` z adresu robi dokładnie to samo — wartość jest ta sama, więc
 * ponowne wysianie przez scenę niczego nie psuje.
 */
export function wysiejZiarno(sow: (ziarno: number) => void) {
  try {
    sow(ziarno);
  } catch (e) {
    blad('sesja', `nie udało się wysiać ziarna: ${String(e)}`);
  }
}

// ---------- raport ----------

const CZAS = (ms: number) => {
  const s = Math.floor(ms / 1000);
  return `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}.${String(ms % 1000).padStart(3, '0')}`;
};

/**
 * Składa raport do wklejenia w zgłoszenie: nagłówek z ziarnem i środowiskiem,
 * migawki stanu aktywnych scen, potem oś czasu zdarzeń.
 */
export function raport(): string {
  const linie: string[] = [];
  linie.push('## Dziennik gry');
  linie.push('');
  linie.push(`- data: ${new Date().toISOString()}`);
  linie.push(`- ziarno sesji: \`${ziarno}\` (powtórz adresem \`?seed=${ziarno}\`)`);
  linie.push(`- adres: ${location.href}`);
  linie.push(`- czas sesji: ${CZAS(Date.now() - start)}`);
  linie.push(`- błędów: ${bledow}`);
  try {
    if (kontekst.sceny) linie.push(`- sceny: ${kontekst.sceny().join(', ') || '—'}`);
    if (kontekst.fps) linie.push(`- fps: ${Math.round(kontekst.fps())}`);
  } catch {
    /* kontekst gry bywa niegotowy przy najwcześniejszych błędach */
  }
  linie.push(`- przeglądarka: ${navigator.userAgent}`);
  linie.push(`- okno: ${window.innerWidth}×${window.innerHeight} (dpr ${window.devicePixelRatio})`);

  for (const [nazwa, zrodlo] of migawki) {
    try {
      const stan = zrodlo();
      if (stan === undefined) continue;
      linie.push('', `### Stan: ${nazwa}`, '```json', JSON.stringify(bezpieczne(stan), null, 1), '```');
    } catch (e) {
      linie.push('', `### Stan: ${nazwa}`, `(nie udało się odczytać: ${String(e)})`);
    }
  }

  linie.push('', '### Zdarzenia', '```');
  for (const w of wpisy) {
    const znak = w.waga === 'blad' ? '✖' : w.waga === 'uwaga' ? '!' : ' ';
    const dane = w.dane === undefined ? '' : ` ${JSON.stringify(w.dane)}`;
    linie.push(`${CZAS(w.t)} ${znak} [${w.zrodlo}] ${w.tekst}${dane}`);
  }
  linie.push('```');
  return linie.join('\n');
}

// ---------- podgląd (F8) ----------

let panel: HTMLDivElement | null = null;

function przelaczPodglad() {
  if (panel) {
    panel.remove();
    panel = null;
    return;
  }
  const tekst = raport();
  panel = document.createElement('div');
  panel.style.cssText = [
    'position:fixed', 'inset:4vh 4vw', 'z-index:9999',
    'background:#0d1023f2', 'color:#e8e6f5',
    'border:1px solid #4b4c7a', 'border-radius:8px',
    'display:flex', 'flex-direction:column', 'padding:12px',
    'font:12px/1.45 ui-monospace,Menlo,Consolas,monospace',
  ].join(';');

  const gora = document.createElement('div');
  gora.style.cssText = 'display:flex;gap:8px;align-items:center;margin-bottom:8px';
  const tytul = document.createElement('strong');
  tytul.textContent = `Dziennik gry — ziarno ${ziarno}, błędów: ${bledow}`;
  tytul.style.cssText = 'flex:1;font:600 13px system-ui,sans-serif';
  gora.appendChild(tytul);

  const przycisk = (etykieta: string, akcja: () => void) => {
    const b = document.createElement('button');
    b.textContent = etykieta;
    b.style.cssText =
      'background:#2b2e55;color:#e8e6f5;border:1px solid #5a5c92;border-radius:5px;' +
      'padding:5px 10px;cursor:pointer;font:12px system-ui,sans-serif';
    b.onclick = akcja;
    gora.appendChild(b);
    return b;
  };

  const kopiuj = przycisk('Kopiuj', async () => {
    try {
      await navigator.clipboard.writeText(tekst);
      kopiuj.textContent = 'Skopiowano';
    } catch {
      // Schowek bywa zablokowany (brak HTTPS, brak gestu) — wtedy zaznaczamy
      // treść, żeby dało się ją zabrać ręcznie zamiast zostać z niczym.
      pole.select();
      kopiuj.textContent = 'Zaznaczono — Ctrl+C';
    }
  });

  przycisk('Zapisz plik', () => {
    const url = URL.createObjectURL(new Blob([tekst], { type: 'text/plain' }));
    const a = document.createElement('a');
    a.href = url;
    a.download = `dziennik-${ziarno}-${new Date().toISOString().slice(0, 19).replace(/[:T]/g, '')}.md`;
    a.click();
    URL.revokeObjectURL(url);
  });

  przycisk('Zamknij (F8)', przelaczPodglad);

  const pole = document.createElement('textarea');
  pole.readOnly = true;
  pole.value = tekst;
  pole.style.cssText =
    'flex:1;width:100%;box-sizing:border-box;resize:none;background:#14162e;color:#cfd0ee;' +
    'border:1px solid #33355e;border-radius:6px;padding:8px;font:inherit;white-space:pre';

  panel.append(gora, pole);
  document.body.appendChild(panel);
}
