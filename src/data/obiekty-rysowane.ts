// Generowany przez tools/obiekty/rysuj.mjs — nie edytować ręcznie.
// Obiekty mapy rysowane kodem (bez OpenAI): zestaw klimatu → nazwa sprite'u
// `m-<nazwa>` → [wysokość płótna, zapas pod linią gruntu] w polach. Plansza
// z tym zestawem wczytuje `public/mapa/<zestaw>/<nazwa>.png` zamiast starego
// rysunku, stawia go w tej wysokości i o zapas niżej (cień i wydeptana ziemia
// wychodzą przed obiekt).
export const OBIEKTY_RYSOWANE: Record<string, Record<string, [number, number]>> = {
  'polana': {
  'kopalnia-kamien': [2.323, 0.12],
  'kopalnia-odlamek': [2.323, 0.12],
  'kopalnia-pokeball': [2.521, 0.12],
  'sad': [2.125, 0.12],
  'wiatrak': [3.323, 0.12],
  'oboz-treningowy': [2.323, 0.12],
  'drzewo-wiedzy': [2.625, 0.12],
  'kamienna-wieza': [2.719, 0.12],
  'arena': [2.417, 0.12],
  'ranczo': [2.323, 0.12],
  'wieza-obserwacyjna': [3.521, 0.12],
  'gniazdo': [1.625, 0.12],
  'zrodlo': [1.823, 0.12],
  'ognisko': [1.417, 0.12],
  'chatka': [2.521, 0.12],
  'woz': [1.625, 0.12],
  'stos-pokeball': [1.198, 0.12],
  'stos-jagody': [1.198, 0.12],
  'stos-kamien-ewolucji': [1.198, 0.12],
  'stos-odlamki': [1.344, 0.12],
  'skrzynia': [1.198, 0.12],
  'artefakt': [1.469, 0.12],
  'zamek-las': [4.719, 0.12],
  'zamek-ogien': [4.917, 0.12],
  'portal': [2.417, 0.12],
  'osrodek-ewolucji': [2.719, 0.12],
  'straznica-zielony': [2.646, 0.9],
  'straznica-niebieski': [2.646, 0.9],
  'namiot-klucznika-zielony': [1.625, 0.12],
  'namiot-klucznika-niebieski': [1.625, 0.12],
  'chata-jasnowidza': [1.917, 0.12],
  },
};
