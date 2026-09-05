import { defineConfig } from 'vite';

export default defineConfig({
  // Ścieżki względne, żeby ten sam build działał i pod adresem w podkatalogu
  // (GitHub Pages serwuje grę z /heroes/), i w korzeniu domeny (Netlify).
  base: './',
  define: {
    /**
     * Znacznik budowania — doklejany do adresu każdej grafiki i każdego
     * dźwięku (patrz `src/visual/zasoby.ts`).
     *
     * Kod i style dostają od Vite nazwy z odciskiem treści, więc nowa wersja
     * zawsze się pobiera. Pliki z `public/` nazw nie zmieniają: trawa to
     * zawsze `mapa/teren/teren-trawa.png`. Przeglądarka trzyma je w pamięci
     * podręcznej i po wypchnięciu nowej grafiki gracz dalej ogląda starą,
     * a wygląda to jak niewdrożona zmiana. Przy grze, w której grafikę
     * poprawiamy po kilka razy dziennie, to nie jest drobiazg.
     */
    __WERSJA__: JSON.stringify(Date.now().toString(36)),
  },
});
