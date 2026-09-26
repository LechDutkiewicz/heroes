// Plik generuje tools/strazniki_wczytaj.py — nie edytować ręcznie.
//
// Numery stworków, które mają malowaną wersję strażnika NA MAPĘ
// (`public/sprites/mapa-<numer>.png`, prompty: tools/PROMPTY-STWORKI.md,
// „Strażnicy na mapie przygody"). Mapa przygody wczytuje tylko te pliki;
// reszta strażników stoi na sprite'ach bitwy.
export const STRAZNICY_MAPOWI: ReadonlySet<string> = new Set([
  '00002',
  '00023',
  '00041',
  '00077',
  '00095',
  '00246',
  '00263',
]);
