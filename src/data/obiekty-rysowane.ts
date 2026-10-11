// Generowany przez tools/obiekty/rysuj.mjs — nie edytować ręcznie.
// Obiekty mapy rysowane kodem (bez OpenAI): zestaw klimatu → nazwa sprite'u
// `m-<nazwa>` → [wysokość płótna, zapas pod linią gruntu] w polach. Plansza
// z tym zestawem wczytuje `public/mapa/<zestaw>/<nazwa>.png` zamiast starego
// rysunku, stawia go w tej wysokości i o zapas niżej (cień i wydeptana ziemia
// wychodzą przed obiekt).
export const OBIEKTY_RYSOWANE: Record<string, Record<string, [number, number]>> = {
  'polana': {
  'kopalnia-kamien': [2.417, 0.22],
  'kopalnia-odlamek': [2.417, 0.22],
  'kopalnia-pokeball': [2.625, 0.22],
  'sad': [2.219, 0.22],
  'wiatrak': [3.417, 0.22],
  'oboz-treningowy': [2.417, 0.22],
  'drzewo-wiedzy': [2.719, 0.22],
  'kamienna-wieza': [2.823, 0.22],
  'arena': [2.521, 0.22],
  'ranczo': [2.417, 0.22],
  'wieza-obserwacyjna': [3.625, 0.22],
  'gniazdo': [1.719, 0.22],
  'zrodlo': [1.917, 0.22],
  'ognisko': [1.521, 0.22],
  'chatka': [2.625, 0.22],
  'woz': [1.719, 0.22],
  'stos-pokeball': [1.302, 0.22],
  'stos-jagody': [1.302, 0.22],
  'stos-kamien-ewolucji': [1.302, 0.22],
  'stos-odlamki': [1.438, 0.22],
  'skrzynia': [1.302, 0.22],
  'artefakt': [1.573, 0.22],
  'zamek-las': [3.625, 0.22],
  'zamek-ogien': [3.823, 0.22],
  },
};
