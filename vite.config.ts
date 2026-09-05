import { execSync } from 'node:child_process';
import { defineConfig } from 'vite';

/**
 * Wersja bierze się z gita, a nie z pliku, który trzeba pamiętać podbić.
 *
 * Data jest datą commita, nie datą budowania: dwa buildy z tego samego kodu
 * mają mieć ten sam podpis, inaczej „wersja się zmieniła" przestaje cokolwiek
 * znaczyć. Gdy gita nie ma (paczka źródeł, obcy runner), wpisujemy `nieznana`
 * — brak wersji jest lepszy niż wersja zmyślona.
 */
function wersjaZGita() {
  const git = (polecenie: string) =>
    execSync(polecenie, { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }).trim();
  try {
    return {
      commit: git('git rev-parse --short=7 HEAD'),
      data: git('git log -1 --format=%cs'),
      galaz: process.env.GITHUB_REF_NAME ?? git('git rev-parse --abbrev-ref HEAD'),
    };
  } catch {
    return { commit: 'nieznana', data: 'nieznana', galaz: 'nieznana' };
  }
}

export default defineConfig({
  // Ścieżki względne, żeby ten sam build działał i pod adresem w podkatalogu
  // (GitHub Pages serwuje grę z /heroes/), i w korzeniu domeny (Netlify).
  base: './',
  define: {
    /**
     * Wersja budowania. Służy dwóm rzeczom naraz i dlatego jest jedna:
     *
     * 1. Podpisuje build w interfejsie — widać, co się właściwie ogląda.
     * 2. Doklejamy jej `commit` do adresu każdej wczytywanej grafiki
     *    (`src/visual/zasoby.ts`). Kod i style dostają od Vite nazwy z odciskiem
     *    treści, ale pliki z `public/` nazw nie zmieniają: trawa to zawsze
     *    `mapa/teren/teren-trawa.png`. Przeglądarka trzyma je w pamięci
     *    podręcznej i po wypchnięciu nowej grafiki gracz dalej ogląda starą,
     *    co wygląda dokładnie jak niewdrożona zmiana.
     *
     * Odcisk commita jest do tego lepszy niż znacznik czasu, którego używałem
     * wcześniej: dwa buildy z tego samego kodu dają ten sam adres, więc
     * przeglądarka nie pobiera od nowa niczego, co się nie zmieniło.
     */
    __WERSJA__: JSON.stringify(wersjaZGita()),
  },
});
