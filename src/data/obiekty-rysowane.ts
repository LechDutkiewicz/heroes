// Generowany przez tools/obiekty/rysuj.mjs — nie edytować ręcznie.
// Obiekty mapy rysowane kodem (bez OpenAI): zestaw klimatu → nazwa sprite'u
// `m-<nazwa>` → [wysokość płótna, zapas pod linią gruntu] w polach. Plansza
// z tym zestawem wczytuje `public/mapa/<zestaw>/<nazwa>.png` zamiast starego
// rysunku, stawia go w tej wysokości i o zapas niżej (cień i wydeptana ziemia
// wychodzą przed obiekt).
export const OBIEKTY_RYSOWANE: Record<string, Record<string, [number, number]>> = {
  'polana': {
  'kopalnia-kamien': [2.698, 0.5],
  'kopalnia-odlamek': [2.698, 0.5],
  'kopalnia-pokeball': [2.698, 0.5],
  'sad': [2.396, 0.4],
  'wiatrak': [3.396, 0.6],
  'oboz-treningowy': [2.802, 0.5],
  'drzewo-wiedzy': [3.396, 0.6],
  'kamienna-wieza': [3.104, 0.5],
  'arena': [2.396, 0.4],
  'ranczo': [2.396, 0.4],
  'wieza-obserwacyjna': [4, 0.6],
  'gniazdo': [1.896, 0.4],
  'zrodlo': [2.396, 0.4],
  'ognisko': [1.896, 0.4],
  'chatka': [2.896, 0.5],
  'woz': [2.104, 0.4],
  'stos-pokeball': [1.375, 0.3],
  'stos-jagody': [1.375, 0.3],
  'stos-kamien-ewolucji': [1.375, 0.3],
  'stos-odlamki': [1.521, 0.3],
  'skrzynia': [1.375, 0.3],
  'artefakt': [1.75, 0.4],
  'zamek-las': [4.604, 0.7],
  'zamek-ogien': [4.604, 0.7],
  },
};
