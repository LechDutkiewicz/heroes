# Następny krok — notatka przekazania

Stan na koniec sesji „Budynki na mapie przygody". Gałąź:
`claude/adventure-map-buildings-tv8cuc`.

Ten plik mówi tylko, co robić DALEJ. Co jest zrobione i dlaczego — `STAN.md`;
droga od obrazka z modelu do gry — `tools/PRZEBIEG.md`.

## Zrobione w tej sesji

- Czternaście budowli odwiedzanych i cztery kopalnie na mapie (`BUDOWLE`
  w `src/data/mapa.ts`, rozstawienie w `tools/generuj_mape.py`, sprawdza
  `npx tsx tools/probe-budowle.ts`).
- Trzy usterki tła w potoku wsadu: namalowana szachownica, woal z pikseli
  o alfie 1–15, brudny kontur po zmniejszaniu. Wszystkie w `wsad_wczytaj.py`,
  z ostrzeżeniem `ostrzezOTle`, gdyby wróciły.
- Prompty na drugą dostawę grafik (`tools/PROMPTY-MAPA-2.md`) i generator
  czytający je wprost z markdownu (`tools/generuj_grafiki.py`).

## Pierwsza rzecz do zrobienia: jeden obrazek, nie dwadzieścia trzy

Klucz `GEMINI_API_KEY` siedzi w zmiennych środowiska (sesja czyta je przy
starcie, więc musi być NOWA sesja). Kolejność:

```bash
python3 tools/generuj_grafiki.py --modele          # do czego klucz ma dostęp
python3 tools/generuj_grafiki.py --lista           # 40 zadań, 17 gotowych
python3 tools/generuj_grafiki.py straznica.png     # najtrudniejszy przypadek
python3 tools/wsad_wczytaj.py                      # do public/mapa
```

Strażnica jest pierwsza celowo: musi mieć duże, jednolite pole barwy na
chorągwi, bo trzy kolory kluczy robimy przemalowaniem w `frakcje_przemaluj.py`,
a nie trzema dostawami. Jeśli model tego nie odda, poprawiamy prompt
w dokumencie, a nie w skrypcie.

Obejrzeć wynik na trawie, nie na białym tle — biel ukrywa dokładnie te dwie
usterki, które kosztowały nas commit naprawczy. Zrzut z gry robi
`node tools/zrzut-mapa.mjs` przy chodzącym `npm run preview`.

Dopiero gdy strażnica wygląda dobrze: `--wszystko`.

## Co da się robić BEZ jednego obrazka

Z notatki buildera mapy (całość w `tools/PROMPTY-MAPA-2.md`, sekcja „Czego
z tej listy NIE trzeba rysować"):

- **Efekty reliktów** — dziś wszystkie artefakty dają płaski dodatek do
  statystyki i rysują się jednym kamieniem ewolucji. Relikt ma zmieniać grę;
  to `ARTEFAKTY` i `statystyki` w `src/data/mapa.ts` plus sonda.
- **Koszty ruchu nowych terenów** — trzy liczby w `zasady-h3.ts`. Czekają
  wyłącznie na tekstury, bo bez nich nie ma czego postawić na planszy.
- **Mechanika strażnicy i klucza** — nowy rodzaj obiektu, który nie jest
  bitwą: przejścia otwiera posiadanie klucza z namiotu. To jest ten punkt
  z notatki, który zmienia pytanie mapy z „czy mam armię" na „gdzie jest
  klucz".
- **Przeciwnik, który gra** — ruch po trasie, zajmowanie kopalń, rekrutacja
  w swoim zamku. Sprite'u potrzebuje dopiero wtedy, gdy ma być widoczny.

## Czego nie robić

- Nie instalować pluginów w sesji webowej — `/plugin` tam nie działa,
  dlatego powstał własny generator zamiast skilla `banana-claude`.
- Nie puszczać `--wszystko` przed obejrzeniem pierwszego obrazka. Każde
  wywołanie kosztuje, a zły prompt kosztuje dwadzieścia trzy razy.
- Nie zapisywać niczego wprost do `public/` — źródłem jest `tools/wsad/`,
  resztę robi `wsad_wczytaj.py`, który da się puścić od nowa.
- Nie ruszać rozmieszczania lasu i skał (`tools/kepy.py`) ani sprite'ów
  stworków — to one wyznaczają styl.
