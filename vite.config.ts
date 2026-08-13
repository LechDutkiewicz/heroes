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
    __WERSJA__: JSON.stringify(wersjaZGita()),
  },
});
