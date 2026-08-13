/**
 * Wersja gry — po to, żeby po wejściu na stronę było widać, czy to już nowe
 * wydanie, czy przeglądarka podała stare z pamięci podręcznej.
 *
 * Numeru nie wpisuję ręcznie, bo ręczny numer zawsze w końcu zostaje w tyle
 * za kodem. Wartość wstrzykuje `vite.config.ts` przy budowaniu: data i skrót
 * commita, z którego powstał build. To jedyne oznaczenie, którego nie da się
 * zapomnieć zaktualizować, a przy zgłoszeniu błędu od razu wiadomo, którą
 * wersję gracz miał przed sobą.
 */

declare const __WERSJA__: { commit: string; data: string; galaz: string };

export const WERSJA: { commit: string; data: string; galaz: string } =
  typeof __WERSJA__ === 'undefined'
    ? { commit: 'dev', data: 'dev', galaz: 'dev' }
    : __WERSJA__;

/** Krótki podpis do rogu ekranu: `2026-08-13 · a1b2c3d`. */
export const PODPIS_WERSJI = `${WERSJA.data} · ${WERSJA.commit}`;

/**
 * Wpisuje podpis w róg strony.
 *
 * Świadomie zwykły element HTML, a nie napis w scenie: sceny są trzy i każda
 * ma własny układ, a wersja ma być widoczna zawsze i tak samo — także wtedy,
 * gdy scena się nie wczytała i widać samo tło. To zresztą ten przypadek,
 * w którym numer wersji jest najbardziej potrzebny.
 */
export function pokazWersje() {
  const el = document.createElement('div');
  el.id = 'wersja';
  el.textContent = PODPIS_WERSJI;
  el.title = `Wersja gry (gałąź ${WERSJA.galaz}). F8 — dziennik do zgłoszenia błędu.`;
  el.style.cssText = [
    'position:fixed', 'right:8px', 'bottom:6px', 'z-index:50',
    'color:#8f92c0', 'opacity:0.72', 'pointer-events:none',
    'font:11px/1 ui-monospace,Menlo,Consolas,monospace',
    'text-shadow:0 1px 2px #000a',
  ].join(';');
  document.body.appendChild(el);
}
