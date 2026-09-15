# Następny krok — notatka przekazania

Stan na koniec sesji „Mapa 72 × 72 Dwie Doliny". Gałąź:
`claude/charming-clarke-cfmev2`, wdrożona też na Pages z
`claude/pokemon-heroes-3-game-57m7wm`.

Ten plik mówi, co robić DALEJ. Co jest zrobione i dlaczego — `STAN.md`;
droga od obrazka z modelu do gry — `tools/PRZEBIEG.md`.

## Zrobione w tej sesji

- **Plansza 72 × 72 („Dwie Doliny", rozmiar M)** zamiast 36 × 36: trzy pasy
  rozdzielone dwoma grzbietami, po dwa wąskie przejścia w każdym.
  Generator: `tools/generuj_mape.py`.
- **Poprzeczka z prawdziwych plików.** Pięć oficjalnych map 72 × 72 na dwóch
  graczy, pobranych jako `.h3m` i policzonych tym samym profilem co nasza
  (`tools/profil-wzorca.py`, `tools/profil-mapy.py`). Cztery ślepe porównania,
  cztery wygrane — zapis w `tools/blind/`, strona: `tools/postep-mapa.html`.
- **Strażnice graniczne i klucze** — mapa ma trzy akty (880 → 1338 → 2150 pól).
- **Trzy nowe tereny**: bagno 175, śnieg 150, ziemia jałowa 125 punktów ruchu.
- **Chata jasnowidza** — „przynieś kamienie, dostaniesz artefakt".

## Pierwsza rzecz do zrobienia: PRZECIWNIK, KTÓRY GRA

To jedyna pozycja z listy braków, która zmienia grę, a nie planszę. Dziś zamek
wroga stoi i czeka: mapa ma tempo wyścigu z samym sobą.

**Rób to w OSOBNEJ sesji.** To inna warstwa niż mapa — pętla tury, a nie dane
planszy — i ma własną poprzeczkę. Mieszanie obu w jednej gałęzi daje commity,
w których nie widać, co zepsuło co, a w tym projekcie połowa usterek wychodzi
dopiero z pomiaru.

### Poprzeczka: dwie liczby, nie opis zachowania

„Dobry przeciwnik" jest nieweryfikowalne. Weryfikowalne jest to:

1. gra, w której gracz **nic nie robi przez czterdzieści dni, ma być
   PRZEGRANA**;
2. gracz grający normalnie **nie ma być zmieciony przed mniej więcej
   dwudziestym piątym dniem**.

Obie liczby mierzy się bez grafiki, symulacją dnia po dniu — tak jak
`tools/balance.ts` rozgrywa setki bitew bez przeglądarki.

### Czego NIE pisać drugi raz

- **Szukania trasy.** `trasa()` w `src/data/mapa.ts` zna strefę kontroli
  potworów, bryły budowli i zamknięte strażnice. Własny pathfinder przeciwnika
  rozjedzie się z regułami gracza i będzie to widać jako „wróg przeszedł przez
  bramę".
- **Modelu walki.** Jest `src/data/battle.ts` i `rozstrzygnijNatychmiast`
  w scenie bitwy.
- **Rekrutacji i rozbudowy.** `src/data/zamki.ts`: `moznaBudowac`, `stacNas`,
  `zaplac`, `przyrostZamku`. Zamek wroga ma już `postawione` i `dostepne`.

### Cztery decyzje do podjęcia na starcie

1. **Własność obiektów to dziś wartość logiczna `nasz`** — kopalnia jest albo
   nasza, albo niczyja. Nie ma miejsca na „wroga". Przebudowa dotknie
   `dochod()`, chorągiewek w scenie i sond ekonomii. Lepiej zrobić to
   świadomie na początku niż doklejać `nasz2`.
2. **Strażnice blokują KAŻDEGO.** Albo przeciwnik dostaje swoje klucze od
   pierwszego dnia (wychodzi z krainy i naciska), albo bramy trzymają go
   u siebie, dopóki gracz ich nie otworzy (jest rosnącym zagrożeniem, nie
   rywalem w wyścigu). Jedno i drugie da się obronić, ale to zmienia tempo
   całej mapy.
3. **Bez wszechwiedzy.** Przeciwnik widzący całą planszę i zawsze idący po
   najlepszy łup czyta się jak oszustwo. Minimum: zna swoją krainę, resztę
   odkrywa. I niech nie wchodzi w straż, której nie pokona — jeden samobójczy
   atak na wodza kasuje mu armię i mapa przestaje mieć przeciwnika.
4. **Losowanie z ziarna, nie `Math.random`.** Mapa i bitwy już tak mają, dzięki
   czemu `?seed=` odtwarza rozgrywkę. To się przyda dokładnie wtedy, gdy
   przyjdzie zgłoszenie „wróg zrobił coś dziwnego".

### Wydajność

Przy trzystu obiektach i planszy 72 × 72 `trasa()` sortuje kolejkę tablicowo.
Liczenie pełnych ścieżek do każdego celu co turę będzie wolne: do WYBORU celu
wystarczy tanie przeszukiwanie wszerz, pełną trasę licz dopiero dla wybranego.

### Co mapa już dla niego przygotowała

- Kraina wroga: jedenaście kopalń, rozbudowany zamek z garnizonem, relikty
  i najsilniejsze straże.
- Sprite przeciwnika: `public/mapa/wrog.png` (trzy kierunki, z drugiej dostawy).
- Druga postać gracza: `public/mapa/bohaterka.png`, gdyby przy okazji robić
  drugiego bohatera.

## Co jeszcze czeka, w kolejności wartości

- **Więzienie z bohaterem** (`public/mapa/wiezienie.png` gotowe). Drugi bohater
  to drugi kierunek naraz — jedyny powód, dla którego mapa M nie nudzi się
  w trzecim tygodniu.
- **Efekty reliktów.** Cztery grafiki są (`relikt-kompas`, `relikt-pas`,
  `relikt-rog`, `relikt-skrzydla`), ale wszystkie artefakty dają dziś płaski
  dodatek do statystyki i rysują się jednym kamieniem ewolucji. Relikt ma
  zmieniać grę.
- **Ulepszenia siedlisk** (`bor-siedlisko4u/5u/6u` gotowe). Kamień ewolucji ma
  wreszcie pierwsze zastosowanie w chacie jasnowidza, ale docelowo idzie właśnie
  tu.
- **Pionowy wariant strażnicy.** Wszystkie cztery przejścia tej mapy biegną
  z północy na południe, więc używany jest tylko wariant poziomy. Przy mapie
  z przejściem wschód–zachód będzie potrzebny drugi rysunek.

## Czego nie robić

- Nie przełączać domyślnego ekranu na mapę „przy okazji". Wszystkie sondy
  wchodzą na „/" i czekają na scenę `battle`; mapa siedzi pod `?ekran=mapa`.
  To osobna zmiana, razem z poprawką adresów w `capture.mjs`, `smoke.mjs`
  i sondach.
- Nie stawiać obiektów ręcznie w `plansza-teren.ts` — to plik GENEROWANY.
  Wszystko idzie przez `tools/generuj_mape.py`, który sprawdza spójność mapy
  po każdym postawieniu.
- Nie zmieniać progów w sondach, żeby przeszły. Trzy razy w tej sesji zły
  POMIAR udawał złą pracę: sonda szukała pola za bramą na sztywno i trafiła
  w las, druga usuwała potwory i przez to widziała mury, których nie ma,
  trzecia wymagała murów u większości budowli. Za każdym razem naprawą było
  poprawienie pomiaru i opisanie dlaczego — nie rozluźnienie progu.
