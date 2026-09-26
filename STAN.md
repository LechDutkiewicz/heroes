# Stan prac — notatka na wznowienie

Ostatnia aktualizacja: 2026-09-26 (profile graczy i sloty zapisu; wcześniej plansze kampanii i silnik generatora).

## Malowane stworki i linie ewolucyjne (2026-09-26)

Stare sprite'y 18 oddziałów zamków (`FACTIONS`; strażnicy plansz, AI,
tytuły wyniku i nagrody kampanii biorą sprite'y z tej samej listy) odstawały
od malowanych obiektów mapy. Teraz wszystkie są przemalowane przez
gpt-image-1 w stylu `obiekt`, razem z dwoma nowymi etapami ewolucji każdego
— 54 rysunki, $2.90 (dziennik `tools/wsad/koszty-openai.jsonl`, pliki
`stworek-*`).

- **Linie ewolucyjne** — `src/data/ewolucje.ts` (`LINIE_EWOLUCJI`,
  `nastepnyEtap`, `SPRITE_EWOLUCJI`): każdy oddział ma linię forma bazowa →
  etap 2 → etap 3 w obrębie SWOJEGO poziomu (jak ulepszone siedliska HoMM3).
  Pary tego samego żywiołu w frakcjach (Bór 1–2, 3–4, 5–6 itd.) sprawdzone
  i odrzucone — powody w komentarzu pliku. Numery: baza = obecny sprite,
  etap 2 = `01xxx`, etap 3 = `02xxx`. **Mechaniki jeszcze nie ma** (budynek,
  koszt w kamieniach/jagodach, statystyki etapów, AI — osobne zadanie);
  pliki nowych etapów leżą w `public/sprites/` i nikt ich jeszcze nie wczytuje.
- **Prompty** — `tools/PROMPTY-STWORKI.md`. Nowy znacznik `| wzor: …`
  w `generuj_grafiki.py`: plik idzie przez `images/edits` z obrazkiem-
  referencją (baza ze starego sprite'a `tools/wsad/stare-sprites/`, każdy
  etap z poprzedniego), więc linia trzyma barwy i rysy. Filtr treści OpenAI
  odrzucał ~30% edycji (kategoria „other", losowo; pewne wyzwalacze: nazwa
  stworka w prompcie, „bakłażan") — odrzucony plik jest pomijany, a
  `--bez-wzoru` robi go z samego opisu (tak powstały Torrenar, Silvena,
  Vulkaron i Verdilo). Kosztuje tylko to, co przeszło.
- **Do gry** — `python3 tools/stworki_wczytaj.py`: zdejmuje białą obwódkę
  „naklejki" i placek piasku pod stopami (model dorysowuje je mimo zakazu),
  odbija w poziomie wszystko poza `W_PRAWO` (armia patrzy w prawo, model
  kierunku nie trzyma), kwadrat 128 px, **stopy na dole kwadratu** (stare
  były wyśrodkowane — bitwa stawia sprite originem na linii stóp, więc
  szeroki stworek wisiał), +12% nasycenia i ciemna obwódka 1 px (bez niej
  zielone stworki ginęły w trawie). Stare sprite'y: `tools/wsad/stare-sprites/`.
- Kod scen bez zmian — skalowanie (mapa z widocznej sylwetki, bitwa
  z wysokości pliku, miasto/bohater/kampania/wynik `min(1, bok/wysokość)`)
  działa na nowych plikach. Zrzuty: `tools/blind/stworki-{mapa,bitwa,miasto,bohater,linie}.png`.
- Słabsze miejsca: etap 2 bywa bardzo podobny do bazy (Torrenos, Bazaltor,
  Vulkarex, Cynderos); Aquilon ma resztkę placka pod stopami; Flamidor ma
  żółtą poświatę po obrysie. Każdy da się dorobić jednym plikiem
  (`generuj_grafiki.py --nadpisz stworek-<numer>.png`, potem wczytaj).

## Plansze kampanii: Polana, Bagna, Twierdza (2026-09-24)

Generator był skryptem jednej mapy. Teraz `tools/generuj_mape.py` jest
SILNIKIEM (szkic → rozmycie → zasklepienie murów → przejścia → drogi →
rozstawienie ze sprawdzaniem każdego postawienia), a to, czym plansze się
różnią, siedzi w `tools/mapy/<id>.py`: szkic, rozmiar, mury i zapory, punkty,
strefy, kolejność stawiania, `USTAWIENIA` misji i barwy terenu. „Dwie Doliny"
przeszły do `tools/mapy/dwie_doliny.py` z tym samym ziarnem i tą samą
kolejnością losowań: TEREN, PUNKTY i ROZSTAWIENIE wychodzą identyczne, tło
bajt w bajt (sprawdzone `md5sum` przed i po). Wynik: `src/data/plansza-teren-<id>.ts`
i `public/mapa/<id>/`, rejestr w `src/data/mapy.ts`.

| Plansza | Misja | Rozmiar | Układ | Przeciwnik |
|---|---|---|---|---|
| Polana | 1, samouczek | 36 × 36 | rzeka z dwoma brodami; zamek SW, Stary Fort E | `obronca`: nie wychodzi, co dzień werbuje do załogi |
| Bagna | 3, Księżycowy Kamień | 54 × 54 | dolina za Czarną Strugą, trzęsawisko z groblami, Wyspa Księżyca w pierścieniu wody z jedną groblą i wodzem | aktywny |
| Twierdza | 4, dwie twierdze | 72 × 72 | trzy pasy jak Dwie Doliny + skalny grzbiet między dolinami twierdz | aktywny, zna zamek gracza, naciera od dnia 18 |

**Nowe w silniku i dlaczego:**

- **Zapory** (`ZAPORY`): meandrująca rzeka i pierścień wody nie są murem
  w wierszach, więc nie da się ich „zasklepić" ze szkicu. Maluje je
  konfiguracja (`popraw_teren`), a silnik sprawdza WYNIK: po zamknięciu
  przejść punkty za zaporą mają być nieosiągalne. Koryto zmienia środek
  najwyżej o pole na wiersz — przy większym skoku brzegi stykają się po skosie
  (ruch jest ośmiokierunkowy) i rzeka jest dziurawa, choć na obrazku szczelna.
- **Zasypywanie odciętych kieszeni** (`ZASYP_ODCIETE`): łąka zamknięta
  w pierścieniu gór wygląda jak teren, w który da się kliknąć. Dwie Doliny mają
  325 takich pól i zostają (zamrożone) — `probe-mapy.ts` wypisuje je jako UWAGĘ.
- **Plac wokół zamków** (`ODSTEP_OD_ZAMKOW`): kopalnia przy murach wchodziła
  w dach zamku na ekranie.
- **Barwy terenu per plansza** (`BARWY_TERENU`, `zabarw` w `render_mapa.py`):
  tekstury są jedne, klimat nie. Na Bagnach woda jest mętna i zielonkawa, łąka
  oliwkowa; w Twierdzy łąka wypłowiała, lód blady. Samo przemnożenie barwy
  nie wystarczyło — trawa zostawała jaskrawozielona — trzeba było najpierw
  ZDJĄĆ nasycenie. Jeziora Twierdzy nie mają shadera (`WODA_ANIMOWANA = False`):
  falujący lód wyglądał jak usterka.

**USTAWIENIA planszy** (`UstawieniaPlanszy` w `mapy.ts`, stosowane w
`plansza.ts` i `wrog-ai.ts`, nie w scenie): tryb wroga, dzień natarcia,
`natarcie`, `wrogBuduje`, załogi obu stron, budynki i skarbce, nazwy zamków,
pola odsłonięte na starcie (dla gracza: Wyspa Księżyca, obie twierdze; dla
wroga: zamek gracza w Twierdzy). `?mapa=<id>` w adresie wybiera planszę
(`mapaZAdresu` w `plansza.ts`) — tak robią zrzuty.

**Księżycowy Kamień** to artefakt klasy `misja`: `ARTEFAKTY_LOSOWE` go nie
zawiera, więc nie wypada ze skrzyni, wozu, chaty ani artefaktu luzem
(sprawdza `probe-mapy.ts`); przeciwnik wycenia go na 0. Na ekranie bohatera
nie ma gniazda w siatce (siatka to osiem artefaktów do zbierania) — pokazuje
go karta pod siatką, jako najważniejszą noszoną rzecz.

### Grafiki plansz kampanii — jak wchodzą do gry

Prompty: `tools/PROMPTY-PLANSZE.md` (zarejestrowany w `DOKUMENTY`
`generuj_grafiki.py`; style `obiekt` i `teren` z `PROMPTY-MAPA-2.md`).
Następna sesja z kluczem OpenAI robi tylko:

    python3 tools/generuj_grafiki.py        # czego brak w tools/wsad/
    python3 tools/wsad_wczytaj.py           # → public/mapa/tlo/, public/mapa/<zestaw>/, public/mapa/teren/
    python3 tools/render_mapa.py polana bagna twierdza
    npx tsx tools/probe-mapy.ts             # odciski teł (rysunek się nie zmienia, więc przechodzą)

Trzy rodzaje grafik, trzy różne drogi:

| Rodzaj | Plik we wsadzie | Ląduje w | Kto rysuje | Co trzeba zrobić |
|---|---|---|---|---|
| naklejki terenu (trzcina, grążele, martwe drzewa, zaśnieżone głazy, zaspy, kry, kwiaty) | `trzcina-1.png` … | `public/mapa/tlo/<nazwa>.png` | `render_mapa.py` w tle (`NAKLEJKI` w `tools/mapy/<id>.py`) | nic — gotowe, bez plików render je pomija |
| tereny (lód, błoto) | `teren-lod.png`, `teren-bloto.png` (+ `…2`) | `public/mapa/teren/` | `render_mapa.py` (`TEKSTURY` z listą zapasową) | nic — gotowe, pierwsza istniejąca tekstura wygrywa |
| zestawy klimatu dla sceny (zaśnieżone sosny, nagie drzewa, skały ze śniegiem, kopalnie w skale, drzewa bagienne) | `zima-sosna.png`, `bagno-drzewo.png` … | `public/mapa/<zestaw>/<nazwa>.png` | `AdventureScene` | **scena musi zacząć je czytać** — patrz niżej |

**Kontrakt dla sceny (właściciel `AdventureScene`).** Plansza podaje
`USTAWIENIA.zestaw` (`'zima'` w Twierdzy, `'bagno'` na Bagnach). W `preload`
dla każdej nazwy z listy poniżej: jeśli istnieje
`mapa/<zestaw>/<nazwa>.png`, wczytać ją pod tym samym kluczem `m-<nazwa>`
zamiast `mapa/<nazwa>.png` (i usuwać teksturę przy zmianie planszy — tak jak
dziś `plansza-0`). Nazwy i wymiary są identyczne z sprite'ami, które
zastępują, więc reszta sceny nie zmienia się wcale:

| Zestaw | Nazwy (`m-…`) | Wymiary oryginału |
|---|---|---|
| `zima` | `sosna`, `sosna-b` (90 × 144), `sosna-mala` (60 × 96), `drzewo`, `drzewo-b` (147 × 144), `krzak`, `krzak-2` (97 × 84), `skala`, `skala-2` (76 × 67), `kepa-las-1..4`, `kepa-skaly-1..4` (240 × 216), `kopalnia-kamien` (173 × 160), `kopalnia-odlamek` (146 × 160), `kopalnia-pokeball` (140 × 160), `sad` (178 × 160) | |
| `bagno` | `drzewo`, `drzewo-b`, `krzak`, `krzak-2`, `kepa-las-1..4`, `kopalnia-kamien`, `kopalnia-odlamek`, `kopalnia-pokeball` | jak wyżej |

Wysokości docelowe siedzą w `ZESTAWY` w `wsad_wczytaj.py` i odpowiadają
wysokościom oryginałów. Do czasu zmiany w scenie pliki leżą w `public/`
i nie są wczytywane — nic się nie psuje.

### Znalezione w AI przy symulacji misji

Trzy usterki `wrog-ai.ts`, żadna niewidoczna na Dwóch Doliniach z osobna:

1. **Ocaleli po bitwie AI awansowali o poziom.** `def.tier` liczy się od
   jedynki (`TIERS`), `tier` oddziału od zera. Po kilku bitwach bohater wroga
   miał smoki narysowane jako drobnica, a stos z szóstego poziomu wypadał
   z armii. Na Dwóch Doliniach po poprawce bierny gracz pada dnia 30 w 3/3
   (wcześniej 2/3 do dnia 40), normalny dnia 31 (próg 25 spełniony).
2. **Portal był celem** (40, bez odnowy): wejście, wyjście po drugiej stronie,
   portal znowu „najbliższym celem"… Na Bagnach wróg stał tak trzydzieści dni.
3. **Odkrywanie wygrywa ze wszystkim.** Brzeg mgły wart jest 30, obiekt
   `wartość / koszt drogi` — czyli ułamek. Dopóki jest co odkrywać, AI nie
   zbiera niczego, a na dużej planszy z bagnem czy śniegiem to tygodnie.
   Nie przestrajałem tego globalnie (Dwie Doliny są na tym zestrojone);
   Twierdza dostała `natarcie`: od dnia natarcia znany, zdobywalny zamek
   gracza jest celem ponad wszystko. Autopilot gracza idzie po WIDOCZNY cel
   misji (Kamień; zamki wroga — tylko na planszy bez artefaktu-celu).

### Wyniki symulacji (`tools/symulacja-misji.ts`, bohater przechodzi z misji do misji)

| Misja | Gra normalna (autopilot) | Gracz bierny | Przeciwnik |
|---|---|---|---|
| 1 Polana | wygrana dnia 14 (2/2) | fort nie wychodzi | załoga fortu 35 → 140 w pięć tygodni |
| 2 Dwie Doliny | przegrana dnia 32 (2/2) | pada dnia 31 | wychodzi dnia 2 — patrz niżej |
| 3 Bagna | wygrana dnia 29 z 56 (2/2; świeżym bohaterem też 29) | termin (zamek nie pada) | wychodzi dnia 2, najdalej 42 pola |
| 4 Twierdza | wygrana dnia 30, twierdze 26 i 30 (2/2); świeżym bohaterem 46 | pada dnia 44–49 | wychodzi dnia 3, najdalej 59 pól |

Misja 2 to niezmieniony TEREN Dwóch Dolin: autopilot nie szuka namiotów
klucznika celowo, a przeciwnik ma oba klucze od pierwszego dnia, więc w tej
symulacji wróg dochodzi pierwszy. To ocena autopilota, nie planszy
(`probe-mapa.ts` sprawdza, że akty kluczy dają się przejść) — ale znaczyło,
że dziecko miało na klucze mniej więcej miesiąc. Dlatego Dwie Doliny dostały
własne USTAWIENIA (w `tools/mapy/dwie_doliny.py`; teren i obiekty bez zmian,
odcisk ten sam): natarcie dopiero od dnia 40 i załoga zamku z trzech poziomów.

| Dwie Doliny (`wrog-symulacja.ts`) | przed | po USTAWIENIACH |
|---|---|---|
| bierny gracz traci zamek | dnia 30 (3/3) | dnia 45 (3/3) |
| grający normalnie traci zamek | dnia 31 (3/3) | dnia 46 (3/3) |
| misja 2 w `symulacja-misji.ts` | przegrana dnia 32 | przegrana dnia 47 |

Próg `wrog-symulacja.ts` przesunął się razem z tym: bierny gracz ma przegrać
do dnia 55 (było 40), grający normalnie dalej nie może paść przed dniem 25
(w `symulacja-misji.ts` dla misji 2 — przed dniem 40).

### Runda 2 po ślepym porównaniu z Heroes 2

Werdykt rundy 1 (trzy razy wzorzec): „przegrywa ziemia, nie sprite'y — jeden
rozmyty grunt na scenę, za mało rzeczy do zrobienia". Poprawki, wszystkie
włączane per plansza, więc Dwie Doliny zostają bajt w bajt:

- `tools/teren_efekty.py`: bagno z oczkami zielonoczarnej wody, trzciną
  i grążelami; zaspy z ostrym grzbietem, niebieskim cieniem i iskrami; lód
  z tekstury śniegu z rysami (przebarwiona tekstura wody dawała jasne linie
  załamań — „błyskawica przy krawędzi"); droga z ciemną obwódką i jaśniejszą
  jezdnią (na bagnie droga ginęła, ma prawie kolor trzęsawiska).
- `SKUP_LAS`: automat komórkowy robi z lasu zwarte bryły z polanami.
  Scena stawia drzewo na każdym polu lasu, więc pojedyncze pola lasu
  rozsiane przez rozmycie dawały „tapetę", w której nie widać, którędy iść.
- Pierwszy ekran (`kadr_startu`, `RAMKA_STARTU`): dwie kopalnie, dwie
  budowle, stosy, skrzynia i skarb pod strażą w widoku z dnia pierwszego,
  pusty pas przy ramie (obiekt na ramie wychodził na zrzucie ucięty).
### Runda 3 — geografia w pierwszym ekranie

Werdykt rundy 2 (znów trzy razy wzorzec): „ten sam zestaw obiektów na tych
samych okrągłych piaskowych plackach, żadnej wody ani rzeźby w widoku,
krainy rozmyte w jedną". Poprawki:

- **Geografia w pierwszym ekranie każdej mapy**: Polana — rzeka i skalny
  grzbiet (zamek i start przesunięte bliżej rzeki); Bagna — Czarna Struga
  i skałki; Twierdza — skuty lodem staw i skalne zbocze.
- **Relief skał** (`relief`, `relief_sniezny` w `teren_efekty.py`): pasmo
  skał ma stronę oświetloną i cień; w Twierdzy grań i jasne stoki bieleją.
- **Bez placków** (`bez_placow`): plansze kampanii nie mają wydeptanego
  placu z tekstury drogi pod zamkami i kopalniami — budowla stoi na swoim
  terenie. Dwie Doliny place zachowują (ich tło jest zamrożone).
- **Stojąca woda na Bagnach**: prawdziwe oczka `~` rozsiane po trzęsawisku
  (z shaderem), obok malowanych oczek i trzciny.
- **Twierdza bez łąki**: dolina gracza w śniegu (scena stawia krzaki tylko
  na łące), sad tylko tam, gdzie wokół nie ma śniegu, pozostałe sady
  w strefach śnieżnych zamienione na kopalnie odłamków.
- **Kopalnie w zboczach** (`pod_skala`): tam, gdzie się da, kopalnia stoi
  pod skałą, a jej bryła wchodzi w zbocze.
- **Twardsze brzegi** (`WTAPIANIE` per plansza) i budowle pierwszego ekranu
  co najmniej trzy pola od siebie (`ODSTEP_KADRU`).
- Wyszło przy okazji: po przesunięciu startu mur kopalni stanął na polu
  startu — bohater zaczynał w murze. Złapała to `probe-mapy.ts`; silnik
  odrzuca teraz takie postawienie.

- Czego NIE da się zrobić po stronie planszy: drzewa i krzaki rysuje scena,
  jednym zestawem sprite'ów na wszystkie klimaty — zielone sosny na śniegu
  i krzaki na łące Twierdzy zostają, dopóki `AdventureScene` nie dostanie
  zabarwienia elementów per plansza.

Autopilot jest słabym graczem (trzyma setki niewydanych pokeballi, wędruje za
brzegiem mgły), więc jego wynik to górna granica czasu, a nie średnia.

### Znajdźki wielkości HotA (`USTAWIENIA.znajdzki`, Polana runda 5)

Werdykt: „kula, jagody i kryształy są wielkości bohatera, bez cienia —
ikony wklejone na tło". `USTAWIENIA.znajdzki` (liczba, wysokość w polach)
włącza w scenie: stos surowca, artefakt i skrzynię (×1,1) na tej wysokości,
cień kontaktowy z tekstury `t-cien-kontakt` (szeroki ciemny rdzeń; `t-cien`
pod rzeczą wielkości pół pola był niewidoczny — sprawdzone w przeglądarce)
i rysunek `m-stos-<ikona>` z zestawu klimatu zamiast ikony paska surowców,
jeśli zestaw go ma (`public/mapa/<zestaw>/stos-*.png`, wczytywane tylko
wtedy). Bez ustawienia nic się nie zmienia. Polana: 0,42 (≈ połowa bohatera),
stosy `polana-stos-*` (PROMPTY-PLANSZE §9) — surowe z API miały kremowy
talerzyk pod spodem, we wsadzie leżą już obrane z niego. Naklejka `kwiaty-1`
ma jasną kępę mchu jak podstawkę, więc Polana jej nie używa.

### Bagna, runda 5 (HotA)

Werdykt rundy 4: „drogi jak sztywne pasy na płaskim terenie" — domknięte już
przez poprzedniego buildera (`DROGA_KRETA`, `RZEZBA`, omszałe wzgórza
`bagno/kepa-skaly-*`). Ta runda dołożyła to, czym HotA wygrywa gęstością:
`znajdzki: 0.58` ze stosami `bagno/stos-*` (kosz jagód, piramidka pokeballi
— w koszu czytały się jak jagody, kryształy i kamienie ewolucji na omszałym
kamieniu), naklejki tła `grzyby-bagienne`, `kloda-mech`, `kamienie-mech`,
`paproc`, `irysy` (PROMPTY-PLANSZE §8), dwa razy gęstsze grążele na wodzie
i chłodniejsza, mniej limonkowa łąka. Surowe obrazki z API miały kremowe
podstawki; we wsadzie leżą już obrane. Próba osobnej tekstury „omszałej
łąki" (`teren-trawa-bagienna`) odrzucona: wyszła płaska i rozmyta, a to
dokładnie ten zarzut, który zamykamy. Układ planszy bez zmian (ten sam
TEREN i ROZSTAWIENIE, odcisk `f78c3bdd2f50d3be`).

### Polana, runda 6 (HotA)

Werdykt rundy 5: „brak barier budujących korytarze, pusta płaska zieleń
z okrągłymi krzakami, prawie nic do zebrania". Kadr po oddaleniu kamery
(`ZOOM_MAPY`, 21 × 18 pól: kolumny 3–24, wiersze 18–35) jest rozstawiony
RĘCZNIE (`PIERWSZY_EKRAN_DOM`, `PIERWSZY_EKRAN_BRZEG`, `postaw_kadr`
w `tools/mapy/polana.py`; reszta planszy dalej losowana poza `KADR`).
Pasma: zachodnie w dwóch piętrach z przełęczą przy rzece i kuźnią w zboczu,
wschodnie od kopalni kamienia w dół do kopca — za rzeką zamknięta kieszeń
(kopalnia, skrzynia, ognisko) z jednym wejściem wzdłuż brzegu i strażą.
Lewy dół to polana z wiatrakiem, sadem, obozem i skrzynią pod strażą.
Nowe ustawienia: `USTAWIENIA.skalaBudowli` (mnożnik rysunku `budynek`
w scenie; Polana 0,8), `odkryte` w rogach kadru (mgła rysowała czarne zęby
w rogach zrzutu; sonda pilnuje < 20% planszy), `RZEZBA` (pagórki),
`TEKSTURY = {'jalowa': ['ziemia', 'jalowa']}` z nową `teren-ziemia`,
krzewy `polana/krzak*.png` (dwa różne, nieregularne) i naklejki
`pniak-lakowy`, `glazy-lakowe`, `kepa-kwiatow` (PROMPTY-PLANSZE §11; surowe
z API miały kremowe/jasnozielone podstawki — we wsadzie obrane). Symulacja
misji 1: wygrana dnia 7 (2/2).

### Bagna, runda 6 (HotA)

Werdykty rundy 5: „poza klifem w rogu brak przeszkód i rzeźby, drogi to
rozmyte smugi, brzegi wody rozmyte", „turkusowa woda = tropikalna zatoka",
„obiekty mniejsze od drzew, bez konturu". Zmiany: dwie skalne granie
w dolnych rogach doliny (`DOLINA_DOL`), trakt w dół doliny idzie między nimi;
`bagno/kepa-skaly-*` przemalowane z omszałych kopców na skaliste granie
(jedna z wodospadem); pola do dwóch rzędów nad skałami wyłączone
z rozstawiania (grań je zasłaniała). Woda: tekstura `teren-woda-bagno`
(`TEKSTURY`), efekt `brzeg_wody` (ostra linia wody, pas błota — nowy efekt
w `teren_efekty.py`, włączany przez `EFEKTY`), barwy tafli shadera per
plansza (`USTAWIENIA.wodaBarwy`, `src/visual/woda.ts`; bez ustawienia —
dawne stałe), zatopione pnie, kępy turzycy i trzcina na wodzie. Drogi: bruk
(`TEKSTURY['sciezka']` — `render_mapa.py` czyta teraz `TEKSTURY` także dla
drogi), szerszy i równiejszy trakt. Obiekty: `znajdzki` 0,8,
`skalaBudowli` 1,2 i nowy `USTAWIENIA.obrysObiektow` (ciemny obrys wokół
wszystkiego poza stworkami). Krzaki `bagno/krzak*` to kępy trzciny
i turzycy zamiast okrągłych kul. Bród w kadrze to łąka, nie piasek.
Symulacja misji 3: wygrana dnia 5 (3/3).

### Bagna, runda 7 (HotA)

Werdykty rundy 6: „prawa trzecia kadru (bagno za Strugą) to mętna,
szarozielona plama bez kontrastu, rzeźby i obiektów; czarne schodki mgły".
Przyczyna: tekstura `teren-woda-bagno` (mleczna oliwka) miała prawie tę samą
jasność co bagno obok, a Struga w kadrze była szeroka na trzy pola z losowymi
zatokami — jedna mglista tafla. Zmiany (wszystko w `tools/mapy/bagna.py`):

- Woda: nowa tekstura `public/mapa/teren/teren-woda-czarna.png` (bez API:
  zmarszczki `teren-woda` przemapowane na ciemną torfową zieleń-granat,
  rzęsa z `teren-woda-bagno`, okresowe smugi odbicia nieba — kafelkuje się),
  pierwsza w `TEKSTURY['woda']`; barwy shadera (`wodaBarwy`) i oczek
  trzęsawiska (`TRZESAWISKO`) dociągnięte do niej. Woda jest teraz wyraźnie
  ciemniejsza od lądu — ląd bagna jasna oliwka, woda ciemna.
- Struga w kadrze (`STRUGA_WASKA_OD = 36`): dwa pola, bez zatok, bez oczek
  w pasie ±4 pola (losowania zostają, żeby reszta planszy się nie ruszyła).
- Bród → most (`MOST_WSCH`, `MOSTY`, rysunek `bagno/most.png` — omszały
  pomost z latarnią, PROMPTY-PLANSZE §13), straż na wschodnim przyczółku.
- Mgła: `odkryte` w obu górnych rogach kadru.
- `kepySkal`: w lewym górnym paśmie były dwa wodospady obok siebie — teraz
  jeden, reszta to różne granie.
- Straż przy samym Kamieniu (`g.postaw` na końcu `rozstaw`) — sonda
  „artefaktu pilnuje straż" nie przechodziła (najbliższe straże 3 pola).

Symulacja misji 3: wygrana dnia 6 (3/3).

### Bagna, runda 9 (HotA)

Werdykt rundy 8 (0/3): „brudne, ciemne, rozmyte przejścia — schodkowe
obwódki w kształcie kratki kafli, ciemnozielone rozlane plamy przy
rozwidleniu i oczkach, szarozielona smuga wzdłuż rzeki, półprzezroczysta
maska wokół gór; niespójna skala; czerwone grzyby wszędzie". Przyczyna:
pojedyncze pola bagna `b` rozsiane po dolinie przez rozmycie szkicu — każde
z czołem skarpy (`RZEZBA`), mokrą obwódką (`trzesawisko`) i ciemnym brzegiem,
w kształcie swoich kafli; pod górami i lasem tło ściółki z reliefem
prześwitujące przez miękkie podnóża rysunków. Zmiany (per plansza):

- Dolina i wschodni brzeg w kadrze bez ani jednego pola `b`; oczko i las
  przyklejone do Strugi pod mostem usunięte; nowe oczko nad pasmem przy
  Strudze, ściana wierzb na prawym skraju kadru.
- `TLO(rysunek)` w konfiguracji planszy (nowy hak w `render_mapa.ustaw`):
  podmiana znaków TYLKO w tle — pod skałami i lasem kadru łąka; w grze
  dalej skały i las.
- `droga_obrzeze` zamiast `obwodka_drogi`, szerszy i jaśniejszy bruk;
  rozstaje 2 × 2 (pierścień z wysepką trawy) rozplecione w `po_drogach`.
- Rozstawienie: budowle ≥ 3 pola od siebie i od zamku, nic w pasie dwóch
  rzędów nad budowlą (`dodaj_luzno` w `rozstaw`); budowla bez luźnego
  miejsca w dolinie nie staje. Bez drugiego drzewa wiedzy i źródła w dolinie.
  Wieża obserwacyjna i skrzynia za mostem.
- Nowe `USTAWIENIA.skalaZamku` (scena; Bagna 1,35), `skalaBudowli` 1,05,
  `znajdzki` 0,7. Stos pokeballi to teraz skrzynka (PROMPTY-PLANSZE §18),
  mniej grzybów na łące i śmieci na wodzie. `odkryte` przy prawym skraju.
- Próba: utwardzenie kanału alfa podnóży gór — wyglądały jak wycięte
  płaskowyże, odrzucone.

Symulacja misji 3: wygrana dnia 4 (2/2). Grafiki: 1 obrazek, ≈ $0,04.

### Bagna, runda 10 (HotA)

Werdykty rundy 9: „góry to pojedyncze stożki (lewy dolny róg, lewa krawędź
nad zamkiem)", „znajdźki za duże i za gęste — sterta jagód i skrzyń obok
sadu, ten sam kosz i skrzynka skopiowane kilkanaście razy". Zmiany (per
plansza, zestaw `bagno`):

- Masywy widziane z góry (`bagno/gora-7`, `gora-9`, `gora-10`, PROMPTY-PLANSZE
  §19): kilka rzędów szczytów połączonych granią zamiast jednego rzędu
  stożków z boku (`gora-1/5/6` zostają w zestawie, kadr ich nie używa).
  Surowe z API miały słomkowy „talerz" pod stopą — przemalowany na mech
  i wtopiony tylko u stopy (szczyty ostre). `gora-8` (za zielona) nieużyta.
- `bagno/sad.png`: chata zbieracza na palach nad oczkiem z krzakami borówek
  zamiast jabłoni z czerwonymi koszami (`ZESTAWY['bagno']['sad']`).
- `przerzedz_kadr` na końcu `rozstaw` (losowania bez zmian): w kadrze
  zostaje po jednym stosie każdego surowca, dwie skrzynie i artefakt pod
  strażą; dolny sad (11,51) to kopalnia kamieni (dwa sady w kadrze =
  pieczątka). `znajdzki` 0,7 → 0,44.

### Bagna, runda 11 (HotA)

Słabość zwycięzcy rundy 10: „nic nie przypomina bagna — stawy małe, brak
trzcin, błota i mokradeł, prawie jednolita zieleń; gęste korony w górnym
środku zasłaniają przejście". Zmiany (per plansza):

- `mokradla_kadru` na końcu `rozstaw` (losowania i obiekty bez zmian):
  pola `MOKRADLA_BAGNO` w kadrze to trzęsawisko `b` (przejezdne, droższe),
  kępa wierzb w górnym środku to staw (`MOKRADLA_WODA`; (16,40), (17,40)
  zostają wodą — artefakt (17,39) dalej tylko przez straż).
- `TLO`: pola `b` pierwszego ekranu → `m` (żadna warstwa, pod spodem łąka),
  (17,40) w tle łąką (`TLO_PRZESMYK`) — staw nie jest zatoką Strugi.
- Nowy hak `DOMALUJ(plansza, rysunek, kafel, droga=, maska_wody=)`
  w `render_mapa.py` (po naklejkach; brak = jak dotąd). Na Bagnach maluje
  mokradło: maska pól rozmyta i progowana z szumem, OSTRY brzeg (1 px), bez
  ciemnej obwódki w kształcie kafli; grunt `bagno/teren-mokradlo.png`
  (turzyca z oczkami oliwkowo-brunatnej wody, przygaszona); nie wchodzi na
  trakt ani na piaszczysty brzeg Strugi. Stawy kadru niepołączone ze Strugą
  są mętne, oliwkowe i nieruchome (zdjęte z maski wody shadera), Struga
  zostaje łupkowa. Trzcinowiska, martwe drzewa, powalone pnie na mokradle
  i kępy trzciny na brzegach wody w kadrze (`KADR_TRZCINY`).
- Grafiki (PROMPTY-PLANSZE §22, ≈ $0,27): `teren-mokradlo`,
  `bagno-trzcinowisko-1/2`, `bagno-martwe-drzewo-3`, `bagno-powalony-pien`;
  nie idą przez `wsad_wczytaj.py` — obiera i skaluje je
  `bagna.przygotuj_naklejki_mokradla()` do `public/mapa/bagno/tlo-*.png`.

### Bagna, runda 12 (HotA)

Werdykty rundy 11 (1/3): „rozlewiska w dolnym środku i przy chatce to blade,
zamazane plamy bez wody, błota i szuwarów" oraz „góry w lewym dolnym rogu
i na środku dolnej krawędzi to identyczne stożki jak stemple". Przyczyna
pierwszego: `teren-mokradlo` to limonkowa łąka w regularne kropki kałuż —
po przygaszeniu i w skali 32 px na pole zostawała oliwkowa plama, a stawy
kadru miały jasną, mleczną oliwkę. Zmiany (wszystko per plansza):

- `DOMALUJ`: grunt mokradła z `teren-bloto` (turzyca z błotem, oliwkowy,
  ton ciemniejszy od łąki), a na nim DUŻE oczka wody (szum w dwóch skalach,
  kwantyl `MOKRADLA['oczka']` wnętrza, nie pod budowlami — `_pod_obiektami`
  czyta ROZSTAWIENIE). Woda oczek i stawów kadru (`_maluj_wode`):
  zmarszczki `teren-woda-czarna` przemalowane na mętną oliwkę, ciemniej
  w głębi, ukośne refleksy nieba, cień skarpy pod górnym brzegiem, jasna
  linia u dolnego, pas błota 3 px wokół oczek. Brzegi ostre (antyaliasing
  0,6 px), żadnej obwódki w kształcie kafli.
- Naklejki: szuwar na brzegach oczek, grążele (`bagno-grazele`) na oczkach
  i stawach, martwe drzewa i pnie na lądzie mokradła. Bez `trzcinowisko-2`
  i `kepa-turzycy` (okrągła podstawka = naklejka na talerzyku); nowe kępy
  bez podstawki `bagno-szuwar-1/2/3` (PROMPTY-PLANSZE §23), żeby jedno
  trzcinowisko nie było stemplem.
- Mokradło w kadrze szersze: za Strugą przy skrzyni i w lewym dole do stóp
  pasma (`MOKRADLA_BAGNO`, gra: pola `b`). Łąka planszy o ton bardziej
  oliwkowa (`BARWY_TERENU['trawa']`).
- Środek dolnej krawędzi: `gora-11` (skalny próg z półkami, wodospadem
  i martwymi drzewami) zamiast `gora-9` — drugi taki sam kłąb szpiców co
  `gora-10` obok. Surowa z API miała słomkowy „talerz" — przemalowany na mech
  tylko w dolnej części rysunku (gałęzie drzew na górze zostają ostre).

Symulacja misji 3: wygrana dnia 5 (2/2). Grafiki: 5 obrazków, ≈ $0,29.

### Polana, runda 7 (HotA)

Werdykt rundy 6: „wzgórza to ta sama zielono-brązowa stożkowa pieczątka,
bez skał, jeden biom; potrzebne skaliste grzbiety i drugi teren w prawej
dolnej ćwiartce". Zmiany:

- `polana/kepa-skaly-1..4` przemalowane z zielonych kopców na skaliste
  granie o czterech RÓŻNYCH sylwetkach (szare zęby, masyw z wodospadem,
  szeroka grań, skałki podnóża; PROMPTY-PLANSZE §12, generowane jako
  `polana-gran-N`, po obraniu piaskowego rąbka zapisane we wsadzie jako
  `polana-kepa-skaly-N`); `skala*`/`kopiec*` zestawu to ich pomniejszenia.
- Nowe `USTAWIENIA.kepySkal` (`mapy.ts`, scena): rysunek kępy skał wybrany
  ręcznie per pole (`"x,y"` → 1–4, minus = odbicie). Hasz pola dawał
  w kadrze trzy razy tę samą grań, a wodospadu wcale. Bez ustawienia — jak
  dotąd.
- Kieszeń za rzeką: ściana gór przesunięta na kolumny 22–24, dno
  (`KIESZEN_ROUGH`) i korytarz wzdłuż brzegu to rough (`j`) z teksturą
  `teren-ziemia-drobna` (ta sama ziemia w pół skali, złożona 2 × 2 —
  kamienie miały półtora pola i czytały się jak szara płyta) i głazami
  (`NAKLEJKI` na `j`). Pas ziemi też pod zachodnim pasmem.
- Znajdźki zdjęte ze zboczy (pokeball, odłamki), las zza grani usunięty.
- Uwaga dla zrzutów: serwer na portach 5190–5199 NIE obserwuje plików — po
  zmianie kodu albo `src/data/plansza-teren-*.ts` trzeba go zrestartować,
  inaczej zrzut pokazuje stary układ.

Symulacja misji 1: wygrana dnia 7 (2/2).

### Polana, runda 9 (HotA, wzorzec: rzeka z mapy kampanii)

Werdykt rundy 8: „łąki w lewej górnej i prawej górnej ćwiartce to pusta,
płaska zieleń z drobnymi znacznikami; brak zwartych masywów lasu
wyznaczających korytarze; obiekty za małe względem zamku". Zmiany (wszystko
per plansza):

- `LAS_KADRU` w `tools/mapy/polana.py`: las od lewej krawędzi do traktu (trakt
  na północ idzie wąwozem między lasem, pasmem i rzeką), las nad polaną
  strażnicy na drugim brzegu i ściana lasu od wschodu; między nimi
  `PRZESMYK` na północ szeroki na trzy pola (kępa zachodzi na sąsiednie pole,
  więc przy dwóch polach przesmyk czytał się jak zwarta ściana). Wóz
  i skrzynia przestawione.
- Zestaw `polana` dostał własne `kepa-las-1..4` (zbite masywy lasu mieszanego
  zamiast 4–5 osobnych drzewek; PROMPTY-PLANSZE §17) i pojedyncze drzewa
  `sosna`, `sosna-b`, `sosna-mala`, `drzewo`, `drzewo-b` w tym samym stylu
  (surowe z API miały jasny talerzyk trawy — we wsadzie obrane i przygaszone).
  Wpisy w `ZESTAWY['polana']` w `wsad_wczytaj.py`.
- Łąka ciemniejsza (`BARWY_TERENU['trawa']`), rzeka z piaszczystym brzegiem
  (`EFEKTY += 'brzeg_wody'`, `BRZEG_WODY`), `znajdzki` 0,68.

Symulacja misji 1: wygrana dnia 7 (2/2). Grafiki: 8 obrazków, ≈ $0,38.

### Twierdza, runda 4 (HotA)

Werdykt rundy 3: „masyw po lewej to ten sam ośnieżony szczyt wklejony
w siatkę rzędami — tapeta; pole śniegu płaskie i jednolite; tafla jeziora
płasko niebieska". Zmiany:

- Nowe `USTAWIENIA.masywy` (`mapy.ts`, scena): duże góry rozstawione
  ręcznie (`plik` z zestawu klimatu, nazwa `gora-*`, stopa `x`, `y`
  w polach, `szer`, `odbij`, `pokrywa` = prostokąt pól skał bez kęp).
  Na planszy z górami scena układa drzewa, kępy i góry po głębi (kontener
  świata rysuje w kolejności dodania, więc las nad górą wchodził jej na
  zbocze). Bez ustawienia — jak dotąd. Twierdza: pięć rysunków
  `zima/gora-1..5` (PROMPTY-PLANSZE §15: długi grzbiet, samotny szczyt
  z lodospadem, dwa szczyty z siodłem, pogórze, skalny pagór ze świerkami)
  w kadrze: pogórze nad stawem, szczyt, grzbiet, dwa szczyty w rogu i garb
  nad stawem u góry ekranu.
- Staw: efekt `lod_tafla` (`teren_efekty.py`, `EFEKTY`): głębia od brzegu,
  łaty lodu, smugi nawianego śniegu, cień skarpy i szron na linii brzegu.
  Spichlerz jagód i kopalnia odłamków stały bryłą na lodzie — po
  rozstawieniu brzeg pod nimi i pod wiatrakiem to śnieg (koniec `rozstaw`).
- Pole śniegu: `zaspy_zmienne` (duże łany gładkiego śniegu obok pól zasp,
  sine niecki i cieplejsze wzniesienia), `RZEZBA` z nowym parametrem
  `stok` (barwa skarpy; domyślnie dawna ziemia), naklejki `skalki-snieg`,
  `trawy-snieg`, `nawis-sniezny` (§15b; surowe z API kremowe — we wsadzie
  przestudzone). `lata-ziemi-snieg` odrzucona: szare „przeręble".
- Obrazki „high" z OpenAI kończyły się 502 (upstream) — wszystko medium.

### Twierdza, runda 8 (HotA)

Werdykt rundy 7: „obiekty za małe i za rzadkie — środek i prawa część to
puste białe plamy"; „wiatrak, spichlerz, chatka wiszą jak naklejki";
„świat kończy się na ramce, minimapa to sam granat". Zmiany:

- **Przyczyna „wysepek" pod budowlami** (sprawdzone sondą, która chowa
  po kolei cienie i pasy gruntu): 1) scena sadzi przy podstawie każdej
  kopalni i zamku `m-krzak*` (`zaroslaPrzyPodstawie`), a zimowy `krzak-2` to
  kopczyk z ciemnym, sinym spodem — pod budynkiem czytał się jak półka
  z kamieniami; 2) szeroka plama cienia spod jasnej podstawki przyciemniała
  sinawy śnieg dookoła; 3) pod spichlerzem leżała naklejka głazu. Teraz:
  `zima/krzak*` to miękkie zaspy z suchymi źdźbłami (PROMPTY-PLANSZE §21,
  po generacji przestudzone i przyciemnione ku dołowi, kopiowane ręcznie do
  `tools/wsad/zima-krzak*.png`); `USTAWIENIA.cienBudowli` (nowe, scena:
  mnożnik szerokości i krycia cienia pod budowlami, kopalniami i zamkami;
  Twierdza 0,7 / 0,6); `NAKLEJKI_OMIN(źródło .ts)` w konfiguracji planszy
  (nowe, `render_mapa` → `teren_efekty.naklejki(omin=…)`, losowania bez
  zmian); `WTOP_PARAMY['zima']` w `wsad_wczytaj.py` — krótsza zaspa przy
  ścianach i barwa sinawego śniegu tła zamiast bieli. Bez ustawień — jak dotąd.
- Pierwszy ekran: zalesiony pagór (`gora-8`, płaski płat śniegu) zamieniony
  na zwarty bór 6 × 2 pól, druga ściana boru za kopalnią odłamków; nowe
  obiekty: obóz szkoleniowy na placu pod traktem, relikt za strażnikiem na
  wschodnim brzegu stawu, dwie skrzynie, kamień ewolucji, kupka kul, skrzynia
  w zaułku za wąwozem. Znajdźki 0,9 pola.
- Na starcie odsłonięta zachodnia połowa doliny gracza (sonda: < 20%
  planszy) — cały kadr bez winiety, minimapa pokazuje dolinę.
- Grafiki: 2 obrazki medium, ≈ $0,10.

### Twierdza, runda 11 (HotA)

Werdykt rundy 10: „śnieg jednolicie szumiący i plamisty; drogi to płaskie
wstęgi bez krawędzi; skrzynki i kryształy bez cieni; wiatrak mniejszy od
chaty, zamek kilka razy większy od bohatera; gigantyczne góry w lewym dolnym
rogu i ściana gór wzdłuż lewej krawędzi — nie wiadomo, jak duże jest pole".
Zmiany (wszystkie per plansza, układ i rozstawienie bez zmian):

- Śnieg: efekt `zaspy_gladkie` (`teren_efekty.zaspy(gladkie=…)`). Przyczyna
  „szumu": szum idzie przez 8-bitowy obrazek, a światło liczy się z pochodnej
  — schodki dawały drobną kratkę jak płótno na całym śniegu. Wysokość
  wygładzona na float, cieniowanie słabsze; widać malowane zawieje tekstury.
  Naklejki: więcej świerczków i płyt skał, bez `nawis-sniezny` (szara smuga).
- Droga: `DROGA_OBRZEZE['skarpa']` (`droga_obrzeze(skarpa=…)`) — trakt wcięty
  w śnieg: sini cień pod brzegiem od strony światła, jasna ścianka naprzeciw.
- Skala: `skalaZamku` 1,8 → 1,5, `skalaBudowli` 1,3 (wiatrak nad spichlerzem).
- Nowe `USTAWIENIA.cienZnajdzek` (`mapy.ts`, scena; brak = jak dotąd):
  mnożniki cienia kontaktowego pod stosami, skrzyniami, artefaktami
  i stworkami; Twierdza 1,25 / 1,6.
- Góry w skali pola (PROMPTY-PLANSZE §26, `zima/gora-9..11`: gromada małych
  szczytów, niski łańcuch ząbków, iglice): za zamkiem gromada zamiast szczytu
  na 8 pól, w lewym dolnym rogu łańcuch + grzbiet ~4 pola zamiast pasma
  10 × 6, szczyt z lodospadem mniejszy na progu nad stawem.
- Grafiki: 3 obrazki medium, ≈ $0,17.

## Profile graczy i sloty zapisu (2026-09-26)

Zgłoszenie taty Eli i Janka: „Nowa gra → Kampania" kontynuowała ostatnią
grę, a zapis był jeden na całą przeglądarkę. Teraz:

- **Profile** (`src/data/profile.ts`): rejestr `heroes-profile-v1` (lista
  i aktywny), dane profilu pod `heroes-profil-<id>-kampania` i
  `heroes-profil-<id>-zapis-<1..6|auto>`. Imię gracza ≠ trener; ekran wyboru
  trenera podpowiada kartę, gdy imię się zgadza („Ela, kliknij trenera…").
  Najwyżej 6 profili, imię do 14 znaków. Każdy dostęp do localStorage
  w try/catch (`czytajKlucz`/`piszKlucz`); bez magazynu rejestr żyje w pamięci.
  Zapis bez aktywnego profilu (np. `?ekran=mapa`) zakłada profil „Gracz"
  (`wymusProfil`).
- **Menu**: tabliczka „Gracz: …" w lewym górnym rogu otwiera zwój „Kto gra?"
  (`pokazProfile` w `menuOkna.ts`: wybór, „+ Nowy gracz" z wpisywaniem
  z klawiatury, krzyżyk usuwa profil po pytaniu). Pierwsze uruchomienie bez
  profili samo otwiera zwój. Deski: Nowa gra / Wczytaj grę / Rekordy /
  Autorzy; „Wczytaj grę" → Kontynuuj (najświeższy zapis toczącej się gry,
  bez zapisu — ekran kampanii) / Zapisane gry (okno slotów) / Kampania / Wróć.
- **„Nowa gra → Kampania" zawsze zaczyna od nowa**; przy kampanii w toku
  (`kampaniaWToku`) pyta „Zacząć od nowa?" z Od nowa / Kontynuuj / Anuluj.
  Od nowa kasuje postęp i autozapis misji kampanii; sloty zostają.
- **Okna zapisu** (`src/visual/oknoZapisu.ts`, materiał zestawu): 6 slotów
  (+ autozapis przy wczytaniu) z nazwą misji, tygodniem/dniem, trenerem
  i datą; nadpisanie, wczytanie na mapie i usunięcie pytają (`pytanie()`).
  Całe okno w jednym kontenerze-korzeniu, który `AdventureScene` oddaje
  kamerze nakładek przez `naWierzchu`. Autozapis: start misji
  (`KampaniaScene.start`), początek każdego dnia (`koniecTury`) i „Zapisz
  i wyjdź".
- **Migracja**: przy każdym odczycie rejestru stare klucze
  `heroes-kampania-v1` / `heroes-zapis-mapy-v1` przechodzą do profilu
  nazwanego jak trener (pusty profil o tym imieniu albo nowy, „Janek 2");
  Ola → Ela w postępie i w bohaterze zapisu; zapis ląduje w slocie 1
  („z dawnej wersji"). Stary klucz znika dopiero po udanym zapisie
  i odczycie nowego. Dzięki temu narzędzia wkładające stary klucz
  (`zrzut-kampania.mjs`, `zrzut-wynik.mjs`) dalej działają.
- Sondy: `node tools/probe-profile.mjs` (cały scenariusz rodziny + migracja,
  zrzuty `tools/blind/profile-*.png`); `wynik-wspolne.mjs` czyta i pisze
  postęp aktywnego profilu (profil „Sonda").
- Zostało: na dotyku imię wpisuje się przez `window.prompt` (brak ekranowej
  klawiatury w płótnie); stan mapy ma do ~135 tys. znaków, więc 3 profile ×
  7 slotów to ~3 mln znaków z ~5 mln limitu przeglądarki — przy pełnym
  magazynie zapis mówi „Nie udało się zapisać gry" i można usunąć stare sloty.

## HUD mapy przygody na wspólnym zestawie (2026-09-24)

- Mapa stoi na tym samym materiale co kampania i okna misji
  (`src/visual/zestaw.ts`): drewno z belką, gruba złota rama wokół planszy,
  prawa kolumna jako wpuszczone pole w cienkiej ramie, karta bohatera
  i podpowiedź na pergaminie, pasek surowców jak rachunek, tabliczki
  przycisków (złota tylko „Zakończ turę"). Okna mapy (skrzynia, budowle,
  awans) — pergamin w złotej ramie. Geometria kliknięć się nie zmieniła.
- **Okna znaczą swoje obiekty zbiorem, nie indeksem** (`znacznik()`):
  lista sceny jest sortowana po głębokości, więc `children.list.slice(n)`
  potrafił zgarnąć znak kursora (głębokość 205) i skasować go razem
  z oknem, a zostawić kawałek okna. Wszystkie okna mapy idą teraz przez
  `znacznik()` + `zamknijOkno()`.
- Kroje zestawu dochodzą czasem po zbudowaniu HUD-u (wejście `?ekran=mapa`)
  — `przerysujNapisy()` odświeża wtedy wszystkie napisy.
- `sh tools/sondy-mapy.sh <url>` puszcza wszystkie sondy mapy po kolei,
  `node tools/zrzut-hud.mjs` robi zrzuty HUD-u.

## Przebieg misji: warunki, koniec gry, ekran wyniku (2026-09-24)

- **Okno „Warunki misji"** (`pokazWarunki` w `AdventureScene`) wyskakuje raz
  na starcie misji — flaga `warunkiPokazane` siedzi w STANIE, nie w scenie,
  bo mapa buduje się od nowa po każdej bitwie. Potem pod „Cele (C)" w górnej
  belce i klawiszem C. Nieodebrany awans czeka, aż okno się zamknie.
- **Koniec gry sprawdza jedno miejsce**: `odswiezWszystko` →
  `sprawdzRozstrzygniecie` → `ocenGre` (`src/data/wynik.ts`). Przez
  `odswiezWszystko` przechodzi każde zdarzenie (krok, obiekt, okno, powrót
  z bitwy, koniec tury z ruchem przeciwnika), więc nie trzeba pilnować końca
  w dziesięciu miejscach. Gra pojedyncza idzie przez tę samą ocenę z dwoma
  warunkami: wszystkie zamki / utrata ostatniego. Stare `sprawdzKoniec`
  („Odśwież stronę") zniknęło.
- Po rozstrzygnięciu scena wyłącza **całe wejście** (`input.enabled`), nie
  tylko `zajety` — okno zamknięte w tej chwili zdjęłoby `zajety`. `create`
  włącza je z powrotem, bo obiekt sceny przeżywa do następnej gry.
- **Ekran wyniku** (`WynikScene`): zwycięstwo, porażka, zakończenie kampanii
  i Sala sław (`src/data/rekordy.ts`). Tła to przemalowane panoramy miast,
  bo API obrazków nie miało środków (patrz `tools/PROMPTY-WYNIK.md`).
- Sprawdza to `node tools/probe-misja.mjs`, zrzuty robi `node tools/zrzut-wynik.mjs`.
  Most `window.__kampania` w `main.ts` pozwala sondzie startować misję tą
  samą funkcją, co gra.
- `probe-zwis.mjs` liczyła znak-kursor (głębokość 205) jako resztkę okna
  i zgłaszała dwa fałszywe błędy także na czystej gałęzi — poprawione.

## Pętla „gauntlet" — stan po sesji 2026-09-25 (wieczór)

Wszystkie kawałki wygrywają ślepo:

| Kawałek | Wzorzec | Wynik |
|---|---|---|
| Polana | 3 kadry map kampanii HoMM3/HotA (`tools/reference/homm3/wzor-*.png`) | 3/3 (r10, ponowne sprawdzenie po zmianach sceny) |
| Bagna | jw. | 3/3 (r12, z charakterem bagna) |
| Twierdza | jw. | 2/3 (r12) |
| Ekran kampanii (wybór trenera, mapa, wstęp, zakończenie — ilustracje OpenAI) | kampania Rolanda HoMM2 (fheroes2), scenariusz i wybór kampanii HotA (VCMI) | 3/3 |
| Sceny wyniku (zwycięstwo, porażka, koniec — ilustracje OpenAI) | Victory!/Defeat!/Legendary Heroes HoMM2 (fheroes2) | 2/3 |

Zmiany sceny mapy wspólne dla wszystkich plansz: kamera 32 px na pole
(`ZOOM_MAPY`, 21×18 pól), miękka mgła (`src/visual/mgla.ts`), cienie
kontaktowe, bohater 1,5 pola i strażnicy 1,2 pola (`uklad.ts`), złoty
znacznik wejścia tylko po najechaniu, malowana minimapa z kryjącą mgłą.
Grafiki: OpenAI (`generuj_grafiki.py`, dziennik `tools/wsad/koszty-openai.jsonl`,
jakość `medium` — `high` przy dużych kadrach dostaje 502 od proxy; limit 5
obrazków/min). Wzorce HoMM2/HoMM3 (poza gitem, `tools/reference/`): źródła
w `ZRODLA.md`; ekrany HoMM2 zrobione z fheroes2 na darmowym demie.

Słabości zwycięzców do ewentualnej poprawki: znajdźki na Polanie rozsiane
jak konfetti; drobny tekst w panelu podsumowania wyniku; w ilustracjach
i ekranie kampanii widać zapożyczenia z Pokemonów (pokeball, czapka
trenera) — krytycy piszą, że to ryzyko prawne w produkcie komercyjnym.

Narzędzia pętli: `tools/blind.mjs` (zestawienie A/B), `tools/postep_kampania.py`
(strona postępu; obrazy rund w `tools/postep-obrazy/`), porty 5200–5229
w `vite.config.ts` bez HMR (etap zrzutów).

## Kampania — stan pętli „gauntlet" (przekazanie, 2026-09-25)

Cel: gra ma wyglądać jak pełnoprawna gra, a nie jedna plansza. Poprzeczka:
Heroes of Might and Magic II „The Succession Wars". Każdy kawałek budował
osobny builder, a oceniał go osobny, bezwzględny krytyk ze świeżym
kontekstem, na ślepo (A/B bez podpisów). Kawałek jest skończony dopiero
wtedy, gdy krytyk wybierze nasz.

| Kawałek | Stan | Rundy |
|---|---|---|
| Menu główne (`MenuScene`) | wygrywa ślepo | 4 (w tym powtórka na pełnym kadrze) |
| Ekran kampanii (`KampaniaScene`, `src/visual/zestaw.ts`) | wygrywa | 4 |
| Warunki misji, wygrana, porażka (`WynikScene`, okno warunków) | wygrywa | 2 |
| HUD mapy przygody na wspólnym zestawie | wygrywa | 1b |
| Plansza Polana (misja 1) | PRZEGRYWA | 2, runda 3 w toku |
| Plansza Bagna (misja 3) | PRZEGRYWA | 2, runda 3 w toku |
| Plansza Twierdza (misja 4) | PRZEGRYWA | 2, runda 3 w toku |

**Co blokowało plansze:** brak nowych grafik (Gemini bez środków). Krytyk
chce geografii w pierwszym ekranie (rzeka, pasmo gór z rzeźbą), bagna ze
stojącą wodą, śniegu z ośnieżonymi drzewami i skałami, różnych obiektów
per biom zamiast tych samych na okrągłych plackach piasku. Prompty tych
grafik są w `tools/PROMPTY-PLANSZE.md`, a droga do gry opisana niżej przez
buildera plansz. Generator ma silnik OpenAI (prawdziwa alfa):
`python3 tools/generuj_grafiki.py --modele` sprawdza dostęp, potem
`--wszystko` albo konkretne pliki, potem `python3 tools/wsad_wczytaj.py`.

**Słabości zwycięzców do poprawy, gdy będą grafiki:** wstęp kampanii i wybór
trenera złożone z istniejących grafik (sylwetki, wóz); sceny wyniku z wyciętymi
postaciami bez jednej malowanej ilustracji.

**Jak się robi rundę krytyka:**
1. zrzut: `node tools/zrzut-mapa.mjs --url http://localhost:4173 --mapa <id> --zwiad 12`
   (menu: `tools/zrzut-menu.mjs`, kampania: `tools/zrzut-kampania.mjs`,
   wynik: `tools/zrzut-wynik.mjs`, HUD: `tools/zrzut-hud.mjs`);
2. ślepe zestawienie: `node tools/blind.mjs --ours tools/shots/mapa-<id>-zwiad.png
   --ref tools/reference/homm2/mapa-przygody-x15.png --name mapa-<id>-r<N>`
   (klucz A/B w `tools/blind/*.klucz.json` — krytyk NIE może go czytać);
3. krytyk: osobny subagent ze świeżym kontekstem, dostaje tylko obraz
   zestawienia i każe mu się wybrać A albo B, uzasadnić i nazwać jedną
   największą lukę przegranego oraz słabość zwycięzcy;
4. wpis: `python3 tools/postep_runda.py "Plansza: Bagna (misja 3)" tools/blind/…png 0|1 "luka" "notka" [--status=done]`,
   potem `python3 tools/postep_kampania.py <plik.html>` i publikacja strony
   postępu (artefakt https://claude.ai/artifact/Mq8R94QKJxB89A1p69pW8E —
   z nowej sesji aktualizuje się, podając jego adres jako `url`).

**Od 2026-09-25 poprzeczką mapy przygody i całej gry jest HoMM3 HotA**
(HoMM2 zostaje wzorcem tylko dla przebiegu kampanii). Zrzuty HoMM3 leżą
w `tools/reference/homm3/` (poza gitem; źródła i URL-e w `ZRODLA.md` tamże —
wszystkie z `raw.githubusercontent.com/vcmi-mods/*/screenshots/`, VCMI
z oryginalnymi grafikami, część z modem HotA; czystego HotA proxy nie
przepuszcza). Do plansz trzy kadry wyglądające jak ZAPROJEKTOWANA mapa kampanii
(gracz odrzucił zrzuty z generatora — chaotyczne, turniejowe): rzeka
z zrzutu trawy w skali 32 px na pole oraz dwa oficjalne zrzuty moda HotA
(zamek z pasmami gór i wodospadami, wybrzeże). Pliki i URL-e: tabela
„Zestaw porównawczy" w `tools/reference/homm3/ZRODLA.md`.
Pliki: `wzor-1-rzeka.png`, `wzor-2-hota-zamek.png`, `wzor-3-hota-wybrzeze.png`.
Porównanie robi się ze WSZYSTKIMI trzema, żadnego nie pomija się.
(`ref-trawa/ref-bagno/ref-snieg.png` to te same kadry pod starymi nazwami —
agenci mylili je z odrzuconymi zrzutami z generatora i pomijali dwa
porównania, więc nowe wywołania pętli używają nazw `wzor-*`.) Runda to
trzy ślepe zestawienia (nasz zrzut przeciw każdemu wzorcowi), trzech
krytyków ze świeżym kontekstem, wygrana przy 2 z 3.

Wzorce HoMM2 leżą w `tools/reference/homm2/` (katalog poza gitem — w nowym
kontenerze trzeba je ściągnąć ponownie; źródła w `ZRODLA.md` tamże, a
najważniejsze: `raw.githubusercontent.com/ihhub/fheroes2/master/docs/images/screenshots/screenshot_world_map.webp`,
`raw.githubusercontent.com/PortsMaster/PortMaster-New/main/ports/fheroes2/screenshot.jpg`
dla mapy przygody, oraz libretro-thumbnails/DOS `Named_Titles/Heroes of Might and Magic II (Deluxe Edition).png`
dla menu). Mapę przygody powiększa się ×1,5 metodą najbliższego sąsiada do
960 × 720 (`mapa-przygody-x15.png`), menu ×3.

PR: https://github.com/LechDutkiewicz/heroes/pull/5 (szkic, gałąź
`claude/relaxed-archimedes-dddvar`).

## Uwagi z rozgrywki do osobnej rozmowy (2026-09-25)

- **Jagody są prawie martwe.** Wydaje się je tylko na siedlisko 2 i 3
  (4 i 6 sztuk, `CENY` w `src/data/zamki.ts`); po tych dwóch budynkach
  nie mają żadnego ujścia, a sady i Krzew Jagodowy dalej je dokładają.
  **Kamienie ewolucji** mają jedno ujście: Ośrodek Ewolucji na mapie
  (oddział o poziom w górę za `EWOLUCJA_KOSZT`). Pokeballe i odłamki
  są używane w całym drzewku.
- **Ewolucja zmienia jednego pokemona w innego** — fabularnie się nie klei.
  Pomysł gracza: ścieżki ewolucji per stworek (jak w Pokemonach), budynek
  w mieście (ulepszone siedliska) i tam ewolucja za kamienie. To też daje
  jagodom i kamieniom sens. Duży wątek: frakcje, ceny, AI, balans.
- **Animacje stworków**: klatki chodu/lotu, ataku, obrony, trafienia przez
  OpenAI `images/edits` z obecnym sprite'em jako wzorcem (poza na wywołanie),
  wyrównane skryptem w arkusz. Najpierw pilotaż na jednym stworku.
- **Gospodarka do przebudowy (po planszach).** W Heroes surowce są potrzebne
  przez całą grę: najdroższe siedliska i sam werbunek wysokich poziomów
  kosztują surowce rzadkie, kolejne poziomy gildii magów też (magii u nas
  nie ma wcale), a część budowli na mapie bierze opłatę w surowcu (Drzewo
  Wiedzy: złoto albo 10 klejnotów za poziom). U nas: werbunek tylko za
  pokeballe, jagody i kamienie bez ujścia w drugiej połowie gry. Kierunek:
  jagody/kamienie/odłamki w cenie werbunku wysokich poziomów, ewolucja
  w mieście za kamienie, opłaty surowcem w budowlach mapy.
- **Czas misji 4 (Twierdza) się wydłużył** po ręcznym rozstawieniu
  pierwszego ekranu w pętli wyglądu (runda 6): autopilot wygrywa 3/3, ale
  średnio dnia 61 (wcześniej 30), gracz bierny pada dnia 60–63. Do
  sprawdzenia przy balansie po planszach.
- Gracz pozwolił dorabiać nowe rodzaje budowli mapy, jeśli plansze ich
  potrzebują.

## Scalenie z AI przeciwnika (2026-09-15)

Ta gałąź (mapa „Dwie Doliny") i osobna praca nad AI przeciwnika rozjechały
się na dwóch branchach tego samego dnia; deploy z gałęzi AI (opartej na
starszej mapie) nadpisał Pages i skasował dzisiejszą mapę. Scalono ręcznie:
AI (`src/data/wrog-ai.ts`, `turaAI(s, kto, ziarno)`) działa teraz NA TEJ
mapie, z trzema realnymi konsekwencjami:

1. **Klucze przeciwnika.** Namioty klucznika stoją po POŁUDNIOWEJ (gracza)
   stronie obu bram — z zamku wroga (północ) `trasa()` nie dochodzi do
   żadnego z nich, sprawdzone wprost (`trasa()` zwraca `null`). Przeciwnik
   dostaje więc oba klucze od dnia 1 (`wrogKlucze` w `plansza.ts`) — jedyny
   wariant, w którym w ogóle wychodzi z własnej doliny. Klucze są PER STRONA
   (`kluczeOf`, `s.klucze` / `s.wrogKlucze`) — otwarta brama jest już otwarta
   dla obu stron (to przeszkoda fizyczna), ale sam klucz jednej strony nie
   daje drugiej nic.
2. **Wydajność `znajdzCel`.** Na planszy 72×72 pełny skan wszystkich
   widocznych obiektów z `trasa()` na każdym z nich (Dijkstra po całej
   mapie) potrafił trwać dosłownie minuty na jedną decyzję. Posortowane
   najpierw po wartości/odległości w linii prostej (górne ograniczenie
   prawdziwej oceny — nigdy jej nie zaniża) i licząc `trasa()` tylko dla
   góry ~60 kandydatów, z wczesnym urwaniem, gdy nic dalszego już nie
   przebije znalezionego wyniku.
3. **Próg trudności NIE jest w pełni zweryfikowany na tej mapie.** Na starej,
   mniejszej planszy próg (bierny gracz pada do dnia 40, grający normalnie
   nie pada przed dniem 25) przechodził w 100% z 20 przebiegów. Na tej mapie,
   z powodu czasu wykonania (~2 min/przebieg), przetestowano tylko 3+3
   przebiegi: "normalnie grający" pada dopiero dnia 31 w 3/3 (próg 25
   bezpiecznie spełniony), ale "bierny" pada w 2/3 do dnia 40 — jeden
   przebieg nie skończył się w 40 dni. Zbyt mała próbka, żeby wiedzieć, czy
   to pech konkretnego ziarna, czy realna luka w AI (być może przegrana
   wczesna bitwa opóźnia całą resztę). `tools/wrog-symulacja.ts` (uruchamiana
   `npx tsx tools/wrog-symulacja.ts`, `PROB=`/`DNI=` do sterowania liczbą
   przebiegów) jest gotowa do dalszego strojenia, kiedy będzie czas na
   dłuższe przebiegi.

Ten plik istnieje po to, żeby po przerwie nie trzeba było odtwarzać kontekstu
z pamięci. Zapisuję tu, co jest skończone, co jest w połowie i czego świadomie
nie zrobiłem — razem z powodami, bo bez nich decyzje wyglądają na przypadkowe.

## Gdzie jest kod

- Gałąź robocza: `claude/gauntlet-loop-walki-algll3`
- Gałąź wdrożeniowa (GitHub Pages): `claude/pokemon-heroes-3-game-57m7wm`

Obie były trzymane równo — po każdym etapie ta sama praca szła na obie.

## Narzędzia, którymi się to sprawdza

| Polecenie | Co mierzy |
|---|---|
| `npm run build` | kompilacja i typy |
| `npm run dym` | test dymny: cztery bitwy w przeglądarce, błędy JS, wczytanie 13 próbek dźwięku |
| `npm run balans` | odsetek zwycięstw każdej pary frakcji na setkach bitew bez grafiki |
| `node tools/capture.mjs` | komplet zrzutów, w tym paski czterech klatek dla animacji |
| `npx tsx tools/probe-trasa.ts` | poprawność tras ruchu na ~128 tys. przypadków |
| `npx tsx tools/probe-mapa.ts` | plansza przygody: kształt, okno, dostępność obiektów, odcisk tła |
| `npx tsx tools/probe-mapy.ts` | KAŻDA plansza z `MAPY`: odcisk tła, dojścia, klucze po kolei, cele misji, zamknięte kieszenie |
| `npx tsx tools/symulacja-misji.ts` | czy misje kampanii da się wygrać i czy przeciwnik gra (`MISJA=`, `PROB=`) |
| `python3 tools/profil-mapy.py` | profil naszej planszy: gęstość, rozkład, schemat do porównań |
| `python3 tools/profil-wzorca.py` | ten sam profil z oficjalnych map `.h3m` — poprzeczka |
| `python3 tools/postep-mapa.py` | strona postępu: nasze liczby na tle wzorców i dziennik rund |
| `npx tsx tools/probe-ekonomia.ts` | czy dochód z prawdziwej mapy starcza na armię I rozbudowę |
| `node tools/probe-rozbudowa.mjs` | czy budynek da się KLIKNĄĆ i czy miasto potem daje więcej |
| `node tools/probe-kopalnia.mjs` | czy budynek produkcyjny się ZAJMUJE, a nie zbiera |
| `npx tsx tools/probe-budowle.ts` | czy każda budowla odwiedzana coś daje, i to raz |
| `python3 tools/generuj_grafiki.py --lista` | które grafiki z promptów są, a których brak |
| `python3 tools/generuj_grafiki.py plik.png` | generuje grafikę z promptu — OpenAI (prawdziwa przezroczystość obiektów), gdy jest `OPENAI_API_KEY` i dostęp do `api.openai.com`; inaczej Gemini z tłem magenty do wycięcia |
| `node tools/probe-przygoda.mjs` | pełna pętla: mgła, skrzynia, artefakt, bitwa, zamek, powrót |
| `node tools/probe-profile.mjs` | profile graczy, sloty zapisu, autozapis, „Nowa gra" od zera, migracja starego zapisu |
| `node tools/probe-klik.mjs` | czy KLIKNIĘCIE prowadzi bohatera tam, gdzie się kliknęło |
| `npx tsx tools/probe-armia.ts` | arytmetyka slotów armii: 40 tys. losowych ruchów z niezmiennikami |
| `npx tsx tools/probe-umiejetnosci.ts` | czy każda z ośmiu umiejętności NAPRAWDĘ zmienia zasady gry |
| `node tools/probe-bohater.mjs` | ekran bohatera prawdziwą myszą: przenieś, zamień, scal, podziel |
| `node tools/probe-awans.mjs` | czy wygrana z awansem pokazuje okno wyboru i czy wybór działa |
| `node tools/probe-sloty-bitwa.mjs` | czy układ armii (z dziurami i powtórzonym gatunkiem) przeżywa bitwę |
| `node tools/probe-miasto.mjs` | ekran miasta: klikanie w bryły, lista budowy, jeden budynek dziennie, przyrost |
| `npx tsx tools/probe-zamki.ts` | drzewko budynków: przechodniość, ceny, czas rozbudowy |
| `npx tsx tools/probe-ekonomia.ts` | dochód i koszty z PRAWDZIWEJ mapy: czy da się budować i werbować naraz |
| `node tools/probe-rozbudowa.mjs` | rozbudowa miasta klikaniem, od początku do końca |
| `node tools/probe-zwis.mjs` | czy okno skrzyni naprawdę WIDAĆ i czy druga bitwa startuje |
| `node tools/probe-dziennik.mjs` | dziennik diagnostyczny: ziarno, łapanie wyjątków, raport, F8 |
| `node tools/zrzut-mapa.mjs` | zrzut mapy przygody (`--mapa <id>`, `--zwiad 12`, `--caly` — cała plansza z góry) |

Grafiki mapy są generowane, nie wrzucane ręcznie. Po zmianie planszy albo
palety trzeba puścić:

| Skrypt | Co robi |
|---|---|
| `python3 tools/kafelki_autotile.py` | odczytuje z arkusza tablicę kafelków przejściowych |
| `python3 tools/generuj_mape.py [id]` | składa plansze ze szkiców w `tools/mapy/<id>.py` i rozstawia obiekty |
| `python3 tools/render_mapa.py [id]` | składa tło planszy i dane dla shadera wody (`public/mapa/<id>/`) |
| `python3 tools/prepare_mapa_obiekty.py` | wycina i wygładza drzewa, skały, zamki, bohatera |
| `python3 tools/rysuj_obiekty_mapy.py` | rysuje surowce, budynki i ozdoby |
| `python3 tools/rysuj_miasto.py` | rysuje panoramy trzech miast i bryły jedenastu budynków |
| `node tools/probe-dzwiek.mjs` | ile dźwięków realnie pada w bitwie |
| `node tools/probe-najechanie.mjs` | co widać po najechaniu na wroga w zasięgu |
| `node tools/probe-lot.mjs` | wzniesienie, falowanie, przechył i cień w locie |
| `npx tsx tools/probe-szybkosc.ts` | czy szybkość jest zaletą czy wadą |
| `npx tsx tools/strojenie.ts` | przeszukiwanie siatki profili frakcji |

**Uwaga praktyczna, kosztowała już trzy pomyłki:** `npm run preview` musi
chodzić przed każdą serią zrzutów i potrafi paść w tle. Zawsze sprawdzaj
`curl -s -o /dev/null -w "%{http_code}" http://localhost:4173/` — inaczej
oglądasz nieaktualne obrazki i wyciągasz z nich fałszywe wnioski.

## Skończone

- **Ekran bohatera i drugorzędne umiejętności.** Kliknięcie w bohatera na
  mapie otwiera osobny ekran: statystyki z rozbiciem „ile z siebie, ile ze
  sprzętu", artefakty z kartą opisu, armia w siedmiu slotach i cztery gniazda
  umiejętności. Armia przestała być gęstą listą — slot jest MIEJSCEM, a układ
  przeżywa bitwę i powrót na mapę (`src/data/armia.ts`). Przeciągnięcie na
  puste miejsce przenosi, na ten sam gatunek łączy, na obcy zamienia; podział
  robi Shift (połowa), Ctrl (jeden) i Alt (okno z liczbą).
  Osiem umiejętności (`src/data/umiejetnosci.ts`), każda z trzema poziomami
  i każda podpięta pod prawdziwą zasadę gry: Zwiad do punktów ruchu, Tropiciel
  do mgły, Napastnik / Łucznictwo / Pancerz do obrażeń w bitwie, Gospodarność
  do dochodu, Nauka do doświadczenia, Uzdrowiciel do strat po wygranej.
  Atak i obrona bohatera działają w walce po 5% i 2,5% za punkt (liczby
  z Heroes 3, z sufitami +300% i −70%) — wcześniej rosły w panelu i nie robiły
  nic. Ekran bohatera mówi to wprost, liczbą, pod tabliczką statystyk.
  Awans zatrzymuje mapę i pokazuje DWIE karty do wyboru, jak w Heroes 3 —
  cztery gniazda na osiem umiejętności, więc po zapełnieniu awans może już
  tylko ulepszać. Sprawdzają to `probe-armia`, `probe-umiejetnosci`,
  `probe-bohater` i `probe-awans`.

- **Wersja gry w rogu ekranu** (`src/wersja.ts`). Data commita i jego skrót,
  wstrzykiwane przy budowaniu przez `vite.config.ts` — nie ma czego pamiętać
  podbić. Ten sam podpis trafia do nagłówka dziennika, więc ze zgłoszenia
  od razu wiadomo, w co gracz grał.

- **Dziennik diagnostyczny do zgłaszania błędów** (`src/dev/dziennik.ts`).
  Klawisz **F8** składa raport: ziarno sesji, środowisko, migawka stanu
  aktywnej sceny i oś czasu ostatnich 400 zdarzeń — do skopiowania lub zapisu
  do pliku. Łapane są wyjątki, odrzucone obietnice, błędy wczytywania plików
  i wpisy z konsoli. Przy okazji: losowania ustalające kształt bitwy (teren,
  frakcje, rzędy, przeszkody) przeszły z `Math.random` na `Phaser.Math.RND`,
  więc `?seed=<ziarno>` z raportu odtwarza dokładnie tę samą bitwę.

- **Cztery kawałki wizualne** (plansza, oddziały, animacje trafienia, HUD) —
  każdy wygrał ślepe porównanie z komercyjnym wzorcem. Zapis rund i werdyktów:
  `tools/progress.json`, strona: `tools/progress.html`.
- **Zasady walki w jednym miejscu** — `src/data/battle.ts`. Scena tylko odgrywa
  dziennik zdarzeń; nie liczy niczego sama.
- **Trzy frakcje**, losowane wraz z układem armii przy każdej bitwie.
- **Szybkość przestała być wadą.** Maszyna nie szarżuje samotnie na całą linię
  przeciwnika (mechanika czekania z Heroes 3).
- **Dźwięk**: 12 próbek zdarzeń + podkład muzyczny, wszystko CC0. Wyciszenie `M`.
- **HUD jak w HoMM3/HotA**: okno 694 px, wąski pasek na dole z prognozą
  obrażeń, statystyki jako karta na najechanie.
- **Ruch po heksach**: piechota chodzi pole po polu i omija zajęte, latacze
  lecą prostą. Sprawdzone na 128 227 trasach.
- **Animacja chodu**: podskok domknięty na granicy heksa, ugięcie i wyciągnięcie
  sylwetki, pochylenie w stronę marszu.
- **Animacja lotu — zweryfikowana liczbami.** Na przelocie przez dziewięć pól
  pomiar zgadza się z kodem co do wartości: wzniesienie 11,8 px średnio przy
  zadanych 13, amplituda falowania 3,5 px dokładnie, przechył 11°, cień odsunięty
  o 12 px, zmniejszony do 0,60 i przygaszony do 0,30 alfy. Mierzy to
  `tools/probe-lot.mjs`.

- **Mapa przygody — układ „Key to Victory".** Plansza wzorowana na jednej
  z popularniejszych map z Heroes 3 (Restoration of Erathia, 36 × 36, dwóch
  graczy). Teren układa się sam z arkusza narożnikowego, drogi rysowane, woda
  animowana. Wejście: `?ekran=mapa`. Szczegóły niżej.
- **Jeden styl na całym ekranie przygody.** Teren, drzewa, skały i bohater
  przechodzą przez `tools/wygladzanie.py`, więc przestały być kanciastym
  pixel artem obok gładkich stworków i HUD-u.
- **Surowce pokemonowe**: pokeball (waluta), jagody, kamienie ewolucji,
  odłamki. Zamiast drewna i złota z Heroes 3 — każdy z tych czterech znaczy
  w bajce dokładnie to, do czego służy tutaj.
- **Budynki produkcyjne się ZAJMUJE, nie zbiera.** Sad i kopalnia zostają na
  mapie, dostają chorągiewkę i dają surowiec codziennie. Pasek surowców
  pokazuje dochód dzienny, więc widać, po co je zajmować.
- **Bohater jest trenerem**, nie stworkiem — z arkusza postaci z pakietu,
  z animacją chodu w czterech kierunkach.
- **Plansza 36 × 36** — rozmiar małej mapy z Heroes 3 — z przewijaniem
  (strzałki, spacja, klik w minimapę), mgłą wojny i ramką widoku na minimapie.
- **Zasady z Heroes 3 spisane ze źródłami** w `src/data/zasady-h3.ts`,
  z rozdziałem na potwierdzone i dobrane przez nas.
- **Bitwa startuje z mapy i wraca z wynikiem.** Wchodzisz na strażnika,
  bijesz się jego armią, po wygranej znika, ocalałe oddziały wracają
  z liczebnością z końca bitwy. Stan mapy siedzi w rejestrze gry, więc
  surowce, kopalnie, artefakty i mgła przeżywają przejście.
- **Czternaście budowli odwiedzanych na mapie** — to, co w Heroes 3 stoi
  między kopalniami i daje powód, żeby nadłożyć drogi. Obóz treningowy
  i kamienna wieża dają +1 do statystyki, arena pyta o wybór, drzewo wiedzy
  o awans, wieża obserwacyjna odsłania mgłę wokół SIEBIE, ranczo dokłada ruch
  na trzy dni, źródło odnawia go raz dziennie, portal przenosi do bliźniaka,
  gniazdo hoduje oddziały do zamku, ośrodek ewolucji ulepsza oddział za
  kamienie ewolucji (pierwsze zastosowanie tego surowca poza rozbudową),
  a wiatrak, ognisko, chatka i wóz sypią drobiazgiem. Wszystkie siedzą pod
  jednym rodzajem obiektu (`BUDOWLE` w `src/data/mapa.ts`) i różnią się
  wpisem w tablicy, nie gałęzią w kodzie.
- **Cztery kopalnie zamiast jednej przemalowanej.** Wytwórnia pokeballi,
  kopalnia kamieni ewolucji, huta odłamków i sad mają własne bryły z wsadu —
  widać z drugiego końca ekranu, co się zajmuje.
- **Skrzynia jest pytaniem, nie nagrodą** — pokeballe albo doświadczenie,
  trzy warianty jak w Heroes 3, rzadko artefakt.
- **Artefakty** dodają na stałe atak, obronę albo punkty ruchu.
- **Zamek z rekrutacją.** Sześć poziomów, zapas przyrasta codziennie, oddział
  tego samego gatunku dokleja się do istniejącego slotu. To domyka pętlę
  „zbierz — kup — wygraj".
- **Ekran miasta jest malowaną panoramą, nie listą.** Budynki stoją
  w krajobrazie, każdy klikalny, wielkość i głębia mówią o wadze. Trzy frakcje
  mają te same sylwetki, a różnią się paletą i porą dnia — miasto rozpoznaje
  się po kolorze, zanim przeczyta się nazwę. Grafiki generuje
  `tools/rysuj_miasto.py`.
- **Rozbudowa zamku działa.** Jedenaście budynków: trzy ratusze (dochód), fort
  (przyrost we wszystkich siedliskach naraz), sześć siedlisk i budynek
  specjalny dający rzadki surowiec. Warunki tworzą ścieżkę „ratusz → fort →
  wyższe siedliska", a **jeden budynek dziennie** (zasada z Heroes 3) sprawia,
  że liczy się kolejność, a nie tempo klikania.
- **Rozbudowa naprawdę zmienia grę.** Niepostawione siedlisko nie hoduje
  nikogo, fort podnosi przyrost o połowę, ratusz i budynek specjalny wpadają
  do dziennego dochodu na pasku mapy. Wcześniej przyrost szedł z gołej tablicy
  i drzewko budynków byłoby dekoracją.
- **Zarysy zamiast pustych miejsc.** Budynek, którego nie ma, stoi na panoramie
  jako blady kształt, a nad tym, na który już stać, unosi się gwiazdka. Heroes 3
  nie pokazuje nic — u nas panorama JEST menu budowy, więc dziecko musi widzieć,
  co może stanąć i gdzie.
- **Strefy kontroli potworów** — strażnika nie da się ominąć bokiem.
- **Rozbudowa miasta** w prawej kolumnie ekranu zamku: ratusze dają dochód,
  fort podnosi przyrost we wszystkich siedliskach, siedliska otwierają kolejne
  poziomy oddziałów. Sprawdza to `node tools/probe-rozbudowa.mjs`.
- **Ekonomia policzona z jednej reguły** (`ZLOTO_NA_POKEBALL` w `zasady-h3.ts`):
  wszystko, co ma cenę, jest złotem z Heroes 3 podzielonym przez 50. Pilnuje
  tego `npx tsx tools/probe-ekonomia.ts`.
- **Straż na mapie to zawsze jeden gatunek**, ewentualnie rozbity na kilka
  stosów. Mieszane armie są w Heroes 3 wyłącznie w budynkach.

## W połowie

- **nie ma ulepszania oddziałów.** Kamienie ewolucji nie mają jeszcze na co
  iść: wypadły z kosztów budynków przy porządkowaniu ekonomii, a ulepszeń
  siedlisk jeszcze nie ma. Na nowej planszy leżą jako stosy po stronie wroga,
  więc na razie się je tylko zbiera. Do rozstrzygnięcia: albo kamień wraca do
  kosztów górnej połowy drzewka, albo czeka na ulepszenia oddziałów;
- **do zamku przeciwnika nie da się wejść** — mówi to wprost, ale zdobycia
  zamku nie ma. Zamek wroga ma już własną rozbudowę w stanie gry (stoi w nim
  sześć budynków), więc po zdobyciu byłoby co przejmować;
- **przeciwnik nie gra** — jego zamek stoi, ale nikt nim nie rusza;
- **potwory nie proponują dołączenia ani nie uciekają** — progi są policzone
  w `zasady-h3.ts`, ale nic ich jeszcze nie używa;
- **na mapie przygody zamek wygląda tak samo bez względu na rozbudowę.**
  Panorama się zmienia, ikona na planszy nie;
- **budynku obronnego nie widać w bitwie** — fort podnosi przyrost, ale murów
  w walce o miasto nie ma, bo nie ma jeszcze walki o miasto;
- **domyślnym ekranem jest wciąż bitwa.** Mapa siedzi pod `?ekran=mapa`,
  bo wszystkie narzędzia pomiarowe wchodzą na „/" i czekają na scenę
  `battle`. Przełączenie domyślnego ekranu to zmiana w `src/main.ts`
  plus poprawka adresów w `capture.mjs`, `smoke.mjs` i sondach.

## Znalezione przy zamykaniu lotu

**Na krótkim przelocie falowanie prawie nie istnieje, i to nie jest usterka.**
Sinus ma okres 420 ms, a przelot na cztery pola trwa 380 ms i zaczyna się od
140 ms wznoszenia — zostaje ćwierć okresu. Zmierzona amplituda spada wtedy
z 3,5 px do 2,2 px. Wygląda to naturalnie (krótki skok nie ma prawa falować),
więc nic nie zmieniałem, ale gdyby kiedyś miało falować także na krótkich
trasach, trzeba skrócić okres albo startować sinus z przesunięciem fazy,
a nie zwiększać amplitudę.

**Kadr paska klatek dla lotu musi śledzić sylwetkę tylko w poziomie.** Pierwsza
poprawka śledziła w obu osiach i skasowała z obrazu dokładnie to, co miała
pokazać: przy kadrze jadącym za sylwetką w pionie unoszenie znika, bo sylwetka
stoi w środku każdej komórki. Teraz kadr jedzie poziomo, a w pionie stoi.

## Nie zrobione, świadomie

- **Animacja strzału** — miała być osobną rundą. Zamach, wyrzut, odrzut.
- **Przeciwfaza cienia jest nieczytelna.** Cień to cztery elipsy po ~0,08 alfy;
  pełen zakres jego pracy to kilka procent jasności trawy. Żeby podskok był
  nim naprawdę podparty, cień musiałby być wyraźniejszy — a to zmiana wyglądu
  oddziałów, które wygrały już ślepe porównanie. Nie ruszałem bez decyzji.
- **Atak trawiasty nad łąką zbiela.** Hue efektu i hue tła są prawie identyczne.
  To paleta, nie rzemiosło — na pasku ognistym widać, że sam efekt działa.
- **Balans stoi na 6,3 pp** przy własnym progu 5 pp. Statystyki są całkowite
  i mają progi, a liczebność działa kwadratowo, więc dalsze strojenie wymaga
  `tools/strojenie.ts`, nie intuicji.
- **Muzyka nie została odsłuchana.** Wybrana po długości (92 s) i licencji,
  nie ze słuchu. Podmiana: jeden plik plus stała `MUZYKA` w `src/audio/sfx.ts`.

## Znalezione przy mapie przygody

**Arkusz `mpwsp01` jest narożnikowy, nie sąsiedzki.** O tym, który kafelek
pasuje, decydują cztery rogi kafelka, a nie to, co leży obok pola. Dlatego
mapa rysuje się siatką przesuniętą o pół pola: każdy kafelek leży na styku
czterech pól i jego sygnatura (np. `GGGP`) wychodzi wprost z terenu w rogach.
Tablicę sygnatur ODCZYTUJE `tools/kafelki_autotile.py` — przepisywanie
czterdziestu indeksów z obrazka ręcznie skończyłoby się pomyłką, która nie
wygląda na pomyłkę, tylko na dziwny teren.

Brakuje sześciu układów „w szachownicę" (trawa–woda–woda–trawa i podobne).
Nie ma ich w żadnym arkuszu autokafelkowania i nie warto ich dorabiać —
scena kładzie wtedy teren, którego w rogach jest najwięcej.

**`RenderTexture` w Phaserze 4 gubi zawartość po pierwszej klatce.** Domyślny
tryb `render` czyści bufor poleceń, więc z całej mapy zostawała sama rama.
Działa dopiero `setRenderMode('all', true)`. Z typów to nie wynika; wyszło
z porównania zrzutów z trzech trybów po kolei.

**Wygładzanie musi objąć CAŁĄ złożoną mapę, nie pojedyncze kafelki.** Filtr
przy brzegu kafelka nie wie, co leży obok, więc kafelki wygładzone osobno
rozjeżdżają się na stykach. Dlatego tło planszy powstaje w `render_mapa.py`
jako jeden obrazek, a nie w scenie z kafelków. Przy okazji drogi wskoczyły do
tego samego obrazka — wcześniej były osobną warstwą wektorową i jako jedyne
na ekranie miały idealnie gładkie brzegi tuż obok kanciastego terenu.

Skoro tło jest generowane, `probe-mapa.ts` pilnuje odcisku rysunku planszy.
Bez tego dałoby się zmienić `RYSUNEK` i oglądać stare tło: pola zmieniają
koszty i przejezdność, a obrazek pokazuje poprzedni układ — rozjazd, który
wygląda jak usterka silnika, a nie jak zapomniane przegenerowanie.

**Filtr medianowy zjada cechy węższe niż kilka pikseli źródła.** Skrzynia
traciła okucia, tartak bale. Dlatego grafiki rysowane u nas powstają od razu
w docelowym rozmiarze, z nadpróbkowaniem, a wygładzanie dostają tylko rzeczy
z pakietu. Klatki bohatera też trzeba wygładzać po jednej — cały arkusz naraz
przeciągał kolor między klatkami i sylwetki się zlewały.

**Rzeczy, które trzeba było zobaczyć, żeby wiedzieć, że są złe:** ścieżka
szeroka na dwa pola zostawiała na skosach trójkąty trawy i wyglądała jak tory
kolejowe; krzaki z arkusza mają wtopiony kwadrat trawy, więc rozsypane po
mapie robiły jasne kafelki; głazy z arkusza są brązowe i na trawie czytały się
jak kupki ziemi. Żadnej z tych trzech rzeczy nie dało się przewidzieć z kodu.

## Znalezione przy poprawkach po testach

**Sonda, która omija drogę gracza, nie sprawdza gry.** `probe-przygoda.mjs`
przestawiała bohatera obok celu i wołała `idz()` wprost — sprawdzała więc
wszystko OPRÓCZ przeliczenia punktu z ekranu na pole. Kiedy właśnie to się
zepsuło, 21 sprawdzeń dalej przechodziło, a gra była nie do grania: bohater
lądował obok celu i niczego nie dało się podnieść. Stąd `probe-klik.mjs`,
która klika myszą.

**Pierwsza wersja tej sondy była tautologiczna.** Liczyła punkt kliknięcia tym
samym wzorem, którego używa scena — więc gdyby wzór był zły, i tak by przeszła.
Sprawdzenie ma sens dopiero wtedy, gdy mierzy się CZYMŚ INNYM: tutaj własnym
`getWorldPoint` Phasera i faktycznymi granicami rysunku.

**Wejście Phasera testuje kamerą główną.** Odkąd świat rysuje druga kamera,
oznaczenie obrazka jako interaktywnego przestało cokolwiek dawać — kliknięcia
do niego nie docierały. Trafianie w obiekty liczymy sami, z granic rysunków.

**Rysunek stoi wyżej niż jego pole.** Zamek ma prawie dwa pola wysokości,
stworek ponad jedno. Kliknięcie w to, co widać, trafiało w pole obok. Dlatego
celem kliknięcia jest teraz OBIEKT, a nie geometria pola pod kursorem.

**Kolejność w `create` decyduje o tym, co widać.** Rozliczenie bitwy szło po
narysowaniu obiektów, więc pokonany strażnik znikał z zasad gry, ale zostawał
na ekranie: nie blokował drogi, nie dało się go zaatakować, a sprite stał.

## Znalezione przy dwóch zwisach zgłoszonych z rozgrywki

**O tym, co jest na wierzchu, decyduje KAMERA, nie `depth`.** Okno skrzyni
miało `depth = 200` i mimo to było niewidoczne: kamery rysują się w kolejności
dodania, a kamera planszy powstaje po głównej, więc mapa zamalowywała okno
w tej samej klatce. Gra wyglądała na zawieszoną — okno przyjmowało kliknięcia,
tylko nikt go nie widział. Stąd trzecia kamera, dodawana na samym końcu;
`naWierzchu()` jest jedyną drogą, żeby cokolwiek położyć nad mapą.

**Sonda klikająca na ślepo nie sprawdza, czy coś widać.** `probe-przygoda.mjs`
trafiała w przycisk po wyliczonych współrzędnych i miała komplet OK przy oknie
niewidocznym dla gracza. `probe-zwis.mjs` pyta wprost, czy okno trafia do
kamery rysowanej PO planszy.

**Phaser używa TEJ SAMEJ instancji sceny przy każdym `scene.start`.** Wiedziała
o tym `AdventureScene` (czyści pola w `create`), nie wiedziała `BattleScene`:
stan walki powstawał raz, przy tworzeniu obiektu sceny. Druga bitwa startowała
więc z oddziałami pierwszej w `battle.units`, a ich widoki umarły razem z tamtą
sceną — `beginTurn` wywracał się na nieżyjącej teksturze napisu i gracz
zostawał na mapie bez bitwy i bez sterowania. Jedna bitwa w sondzie tego nie
złapie; trzeba rozegrać co najmniej dwie.

## Układ mapy — „Dwie Doliny" (72 × 72, rozmiar M)

Poprzednia plansza była przeniesieniem „Key to Victory" na 36 × 36. Ta jest
rozmiaru M i ma inną strukturę — tę, którą w Heroes 3 mają dobre mapy 1 na 1:

| Pas | Wiersze | Co tam jest |
|---|---|---|
| dolina gracza | y 47–71 | zamek na południowym zachodzie (8,64), siedem kopalń, straże słabe |
| grzbiet południowy | y 45–46 | przejścia w kolumnach 13–14 (droga) i 49–50 (piasek), po strażniku |
| pas sporny | y 23–44 | jezioro, osiem kopalń, budowle, straże średnie — środek gry |
| grzbiet północny | y 21–22 | przejścia w kolumnach 21–22 (droga) i 57–58 (piasek), po wodzu |
| kraina przeciwnika | y 0–20 | zamek wroga (62,8), relikty, jedenaście kopalń, straże silne |

Trzy decyzje, na których ta mapa stoi:

1. **Trzy pasy zamiast dwóch.** Przy dwóch mapa ma jedno pytanie („czy stać mnie
   już na przełamanie straży"). Pas sporny daje pytanie drugie — „co wziąć
   najpierw" — i to ono wypełnia środek gry.
2. **Przejścia w obu grzbietach są PRZESUNIĘTE względem siebie.** Nie da się
   przejechać mapy w linii prostej: po wyjściu z doliny trzeba przeciąć pas
   sporny w bok.
3. **Nagroda rośnie z odległością.** Ostatnie 20% zasięgu ma własny skarbiec
   (relikty, kopalnie, skrzynie pod strażą wodzów), bo rozstawianie po samych
   strefach dawało rozkład płaski — a wtedy dalej nie opłaca się jechać.

### Poprzeczka: pięć oficjalnych map 72 × 72 na dwóch graczy

Mapa nie jest porównywana z wyobrażeniem o Heroes 3, tylko z PLIKAMI: pobrane
`.h3m` map Faeries!, Gorlam's Tentacle Swampland, Hatchet Axe and Saw,
Unexpected Inheritance i When Dragons Clash, sparsowane do JSON i policzone
tym samym profilem co nasza plansza (`tools/profil-wzorca.py`,
`tools/profil-mapy.py`). Nasze liczby mieszczą się w rozrzucie wzorców:

| Miara | My | Oryginały |
|---|---|---|
| pól przejezdnych | 45% | 26–43% |
| obiekt co ile pól | 7,7 | 4,1–12,5 |
| obiektów razem | 305 | 179–328 |
| udział straży | 21% | 10–24% |
| mapa dostępna bez bitwy | 30% | 7–81% |

Trzech krytyków, każdy ze świeżym kontekstem i przeciw innej mapie oryginalnej,
w ślepym porównaniu (schematy podpisane A i B, plus liczby) wybrało naszą —
trzy razy na trzy. Dwaj niezależnie nazwali tę samą słabość (najdalszy pierścień
nagradzał najsłabiej) i to ona poszła do poprawki. Zapis: `tools/blind/mapa-r2-*`,
strona postępu: `tools/postep-mapa.html`.

## Strażnica graniczna i klucz — mapa ma trzy akty

Przejść przez grzbiety pilnują teraz STRAŻNICE, a nie stada potworów. Strażnicy
nie da się pokonać: otwiera ją klucz z namiotu klucznika stojącego w innej
części mapy. To zmienia pytanie mapy z „czy stać mnie na przełamanie straży" na
„gdzie jest klucznik" — i dopiero z tym plansza M ma dwa pytania naraz zamiast
jednego powtórzonego cztery razy.

Barwy są dwie, nie cztery, i to jest kształt mapy, a nie oszczędność na
grafikach: zielony klucz otwiera oba wyjazdy z doliny, niebieski oba wejścia do
krainy wroga. Mapa dzieli się więc na trzy akty, a każdy otwiera nowy kawałek:

| Akt | Co gracz ma | Ile planszy stoi otworem |
|---|---|---|
| I | nic | 900 pól — dolina |
| II | zielony klucz | 1411 pól — plus pas sporny |
| III | oba klucze | 2047 pól — cała mapa |

Sprawdza to `probe-mapa.ts` (sekcja „trzy akty"), zasadami gry, a nie własnym
modelem: namiot postawiony ZA bramą, którą sam otwiera, zamyka mapę na głucho
i nie widać tego ani na obrazku, ani w kodzie. To samo liczy generator przy
rozstawianiu — dwa niezależne sprawdzenia, bo cena pomyłki to plansza nie do
przejścia.

**Brama blokuje TRZY pola w swoim rzędzie, nie jedno.** `polaBryly` ma dla
strażnicy osobny przypadek: mur to pola OBOK wejścia, a nie rząd nad nim jak
u zamku i kopalni. Przejścia mają dwa pola szerokości, więc brama szeroka na
trzy zamyka je w całości. Gdyby blokowała samo swoje pole, dałoby się ją minąć
bokiem — dokładnie tak, jak dawało się minąć strażnika w przejściu szerokim na
cztery pola.

**Pod bramę się PODCHODZI, nie wchodzi się na nią.** Reszta obiektów leży na
drodze i bohater staje na ich polu. Brama jest murem: bohater, który by na nią
wszedł, stałby w środku muru, a po odmowie („nie masz klucza") zostałby tam na
stałe — bo tu nie ma bitwy, po której pole robi się wolne. Marsz kończy się
więc pole wcześniej (`idz` w `AdventureScene`).

**Otwarcie bramy kasuje zapamiętane bryły.** `polaZajete` liczy się raz i jest
trzymane w `s.bryly`, bo zamek i kopalnia z mapy nie znikają. Brama znika —
i bez skasowania tego zbioru przejście stoi otworem na ekranie, a trasa dalej
je omija. Sprawdza to `probe-brama.mjs`: „przejście staje otworem NATYCHMIAST".

**Barwy kluczy robi `tools/klucze_przemaluj.py`**, z jednej dostawy grafiki.
Chorągiew strażnicy i proporzec namiotu to jedyne elementy o odcieniu poniżej
18° przy nasyceniu ponad 0,55 — drewno wrót leży obok na kole barw (24°), więc
„przemaluj wszystko, co ciepłe" zrobiłoby z bramy zieloną budkę. Zmieniany jest
sam odcień; jasność i nasycenie zostają, więc fałdy płótna i cień pod belką
pozostają na miejscu.

## Straże: co pilnują i jak rosną

Zgłoszenie z rozgrywki brzmiało: „stwory są rozrzucone trochę losowo". Było
trafne. Każdy strażnik dostawał jeden obiekt na głowę (`strzez(lista)`), więc
mapa miała pięćdziesiąt stad stojących przy pojedynczych skrzyniach. W Heroes 3
stado stoi w przejściu, przy wejściu do kopalni albo przed zakątkiem, w którym
leży kilka rzeczy naraz — i to ostatnie było u nas nieobecne w ogóle.

**Kieszenie ze skarbem.** Generator szuka teraz w terenie zakątków, które
zamyka JEDEN strażnik, i liczy to dokładnie tak, jak działa straż: potwór
blokuje swoje pole i osiem wokół, więc pytamy, co odetnie się od reszty planszy
po zamknięciu kwadratu 3 × 3. Pierwsza wersja liczyła „ile odcina jedno pole"
i znalazła dwie kieszenie na całej mapie — bo takich szyjek po prostu nie ma,
przejścia mają po dwa i trzy pola. Po poprawce jest ich dziewięć, po trzy na
pas. W każdej leżą trzy–pięć rzeczy, w szyjce stoi jeden strażnik: bitwa opłaca
się za cały zakątek, a nie za jedną skrzynię.

**Podstawowe kopalnie stoją otworem.** Jagody i odłamki — odpowiedniki tartaku
i kopalni rudy — nie są pilnowane nigdzie na mapie. Bez nich nie ma z czego
zacząć, więc straż przy nich nie jest wyborem, tylko karą za pierwszy tydzień.
Pilnowane są kopalnie kamienia i obozy z pokeballami, czyli to, co w Heroes 3
odpowiada kryształom i złotu. Warunek przy stawianiu jest miękki (w ciasnej
krainie wroga inaczej kończą się miejsca), a to, co się prześlizgnie, odsuwa
`odsun_straze` po rozstawieniu.

Straży jest 35 zamiast 53 i stanowią 13% obiektów — mapy wzorcowe mają 10–24%.
`probe-mapa.ts` sprawdza, że każda straż ma przy sobie coś wartego pilnowania
i że co najmniej sześć pilnuje całych zakątków, a nie pojedynczej rzeczy.

**Stada rosną co tydzień.** Stos ustalał się przy składaniu planszy i zostawał
taki do końca gry, więc zwlekanie nic nie kosztowało, a w piątym tygodniu straże
były grupką na jeden strzał. Teraz co tydzień każdy stos rośnie o dziesiątą
część (zawsze co najmniej o sztukę), z sufitem na dwuipółkrotności stanu
początkowego. Sufit jest po to, żeby mapa nie zamknęła się sama: bez niego
straże w krainie wroga po dwóch miesiącach są nie do ruszenia niezależnie od
tego, jak dobrze się grało.

## Z sąsiedniego pola: łup I bitwa

Zgłoszenie: „wszedłem na skrzynię, koło której stał stwór, wygrałem bitwę
i skrzyni nie podniosło". Tak właśnie było. Scena widziała na polu bohatera
skrzynię i straż obok, wybierała bitwę — a po powrocie z niej okno skrzyni
otwierało się po 1200 ms i wpadało pod okno awansu, które wchodzi 900 ms
później. Gra zostawała z `zajety`, którego nikt nie zdejmował, a skrzynia leżała
pod stojącym na niej bohaterem, więc nie dało się jej nawet wywołać ponownie.

Pierwsza naprawa zatrzymywała marsz pole wcześniej przed rzeczą leżącą i była
tu opisana jako „świadome odstępstwo od Heroes 3". To było błędne rozpoznanie
oryginału i tak też zostało zgłoszone. W Heroes 3 pole obiektu jest
ZABLOKOWANE i jednocześnie „odwiedzalne": bohater sięga po stos surowca,
artefakt i skrzynię Z SĄSIEDNIEGO POLA i na nim zostaje. **Tak samo bije się
z potworem** — atak idzie z pola obok, nie przez wejście na stwora. Na stałe
wchodzi się tylko na przejezdne WEJŚCIE, jakie mają zamek i kopalnia; dlatego
kopalni się nie „podnosi", tylko zajmuje i stoi w jej bramie.

Czyli: to nie było odstępstwo, tylko zasada zastosowana w połowie. Potwór
dołączył do listy (`Z_SASIEDNIEGO_POLA` w `src/data/mapa.ts`), a sonda
`probe-przygoda` mierzy teraz odległość bohatera od pokonanego stwora po
bitwie — ma być dokładnie jeden.

Obiekty, na które się WCHODZI — kopalnie, budowle, zamki — dostały osobną
naprawę: po wygranej bitwie scena odwiedza to, na czym bohater stoi, ale czeka
z tym na zamknięcie okna awansu i sprawdza `zajety`. Poprzednia wersja robiła
to bezwarunkowo i właśnie dlatego gubiła nagrody.

## Chata jasnowidza — jedyny obiekt, który każe wrócić

„Przynieś dwanaście kamieni ewolucji, dostaniesz relikt." Pierwsza wizyta
prawie zawsze kończy się na wiadomości, czego brakuje, i o to chodzi: to
jedyny obiekt w grze, który każe wrócić w to samo miejsce po raz drugi.

Prosi o KAMIENIE i to jest wybór, nie przypadek. Kamień ewolucji był jedynym
surowcem bez zastosowania — wypadł z kosztów budynków przy porządkowaniu
ekonomii, a ulepszeń oddziałów jeszcze nie ma. Chata daje mu pierwsze
zastosowanie i przy okazji powód, żeby zbierać stosy leżące za grzbietem.
Chaty są dwie: w pasie spornym za sześć kamieni (artefakt klasy znacznej)
i w krainie wroga za dwanaście (relikt).

`probe-mapa.ts` sprawdza, czy żądany surowiec DA SIĘ zdobyć po tej stronie
mapy, po której stoi chata — inaczej zadanie nie jest zagadką, tylko ślepym
zaułkiem. Mechanikę (pierwsza wizyta nic nie zabiera, druga płaci raz)
sprawdza `probe-budowle.ts`.

**Budowle z bryłą dostają miejsce na mur.** `polaBryly` pomija pole muru
stykające się z cudzym wejściem, żeby budowla nie zamurowała sąsiadowi drzwi —
przy obiekcie co siedem pól ta reguła zjadała prawie wszystkie mury: z piętnastu
budowli wielopolowych mur miały cztery, a reszta była rysowana na trzy pola
i blokowała jedno. Generator stawia je teraz z zapasem, a na ciasno godzi się
dopiero, gdy miejsca zabraknie: 13 z 15. Kuszące było rozluźnienie progu
w sondzie — właściwą naprawą było rozstawienie.

## Dziewięć rodzajów terenu, każdy o innym koszcie

Do trawy, ścieżki i piasku doszły trzy tereny z drugiej dostawy grafik:

| Teren | Koszt ruchu | Gdzie |
|---|---|---|
| ścieżka | 70 | główny szlak przez oba grzbiety |
| trawa | 100 | wszędzie |
| ziemia jałowa | 125 | wschodnia rubież, przy bocznych przejściach |
| piasek | 125 | boczne przejścia i południowy wschód |
| śnieg | 150 | północne rubieże krainy wroga |
| bagno | 175 | wokół jeziora w pasie spornym |

To nie jest ozdoba: bagno leży dokładnie tam, gdzie kusi skrót przez środek
pasa spornego, więc mapa pyta „naokoło drogą czy na przełaj?" — a to jest
pytanie, którego plansza z jednym kosztem terenu nie umie zadać. Las, skały
i woda zostają nieprzejezdne.

Dwie pułapki wyszły dopiero przy wpuszczaniu ich na planszę. Wycinanie przejść
przez grzbiet zamieniało tylko skałę i wodę, więc gdy rozmycie postawiło
w przejściu LAS, brama lądowała na polu nieprzejezdnym — teraz wycinany jest
każdy teren nie do przejścia. I druga: rozmycie potrafi zasypać lasem sam
wylot przejścia, tuż za grzbietem; przełęcz prowadzi wtedy donikąd, a widać to
dopiero po tym, że do bramy nie da się podejść od strony doliny. Stąd
`udroznij_wyloty`.

## Znalezione przy planszy 72 × 72

**Przejście szerokie na cztery pola nie jest przejściem.** Strażnik blokuje pas
szeroki na trzy pola, więc w przejściu na cztery zostaje szpara i da się go
obejść bokiem. Wyglądało to dokładnie tak samo jak mapa działająca; zobaczyliśmy
dopiero po zmierzeniu, ile planszy stoi otworem bez jednej wygranej bitwy: 74%.
Po zwężeniu przejść do dwóch pól — 30%, czyli mniej więcej sama dolina.

**Dziura w murze może siedzieć w SZKICU.** `zasklep` przywraca rdzeń grzbietu
tam, gdzie szkic mówi „góry" — więc jeśli szkic ma w murze gotową dziurę
szeroką na komórkę (cztery pola), nie ma czego zasklepiać. Mur jest teraz
w szkicu pełny, a przejścia wycina wyłącznie tabela `PRZEJSCIA`, która podaje
też ich teren (boczne mają zostać piaskiem).

**Obiekty zatykają drogę i przy gęstości mapy M robią to często.** Trasa w grze
nie przechodzi przez obiekty, a bryła kopalni to trzy pola. Dwie skrzynie
w korytarzu potrafią odciąć ćwiartkę planszy — plansza wygląda spójnie, tylko
połowa rzeczy jest nie do zdobycia. Generator sprawdza więc KAŻDE postawienie:
czy po nim ubywa dostępnych pól więcej niż to jedno, i czy do każdego wcześniej
postawionego obiektu dalej da się podejść.

**Lista brył w generatorze musi zgadzać się z `BUDOWLE` co do nazwy.** Był tam
wpisany „gniazdo" zamiast „ośrodka ewolucji" — jeden zły wpis i mury dwóch
budowli zamknęły północno-wschodnią ćwiartkę mapy: czterdzieści obiektów,
w tym zamek przeciwnika, bez dojścia. Generator meldował spójną planszę, bo
sprawdzał własnym, niezgodnym z grą modelem.

**Sprawdzenie dostępności nie może najpierw usuwać potworów.** `polaBryly`
pomija pola muru stykające się z cudzym wejściem, więc po usunięciu potworów
mury ROSNĄ i sonda widzi blokady, których w grze nie ma. `probe-mapa.ts` liczy
teraz dojścia na prawdziwym stanie gry, a potwory traktuje jak pola przejezdne
— bo pokonuje się je i idzie dalej.

**Przy gęstej planszy sondy nie mogą stawiać bohatera „na polu nad obiektem".**
Prawie każda rzecz warta zabrania ma obok straż, więc to pole bywa zajęte albo
leży w strefie kontroli potwora. Bohater lądował na straży, marsz nie dochodził
do celu i trzy sondy naraz zgłaszały nieprawdziwe usterki. Stąd
`tools/sonda-wspolne.mjs`: `__podejdz` szuka pola, z którego NAPRAWDĘ da się
wejść na obiekt, a `zamknijAwans` zamyka okno awansu — na tej planszy straże są
na tyle silne, że bohater awansuje już w pierwszych walkach, a niezamknięte
okno wygląda jak zwis.

**Tło planszy idzie do JPEG, i to jest decyzja o grze.** 72 × 72 przy kafelku
48 px to obraz 3456 × 3456. Jako PNG waży 21 MB — tyle musiałby ściągnąć gracz,
zanim zobaczy mapę. W JPEG przy jakości 88 waży 3,4 MB, czyli mniej niż
poprzednia plansza 36 × 36. Maska wody zostaje PNG-iem: tam kanały niosą liczby
dla shadera.

**Symulacja ekonomii musi liczyć ZNALEZISKA, nie sam dochód z kopalń.**
Przy dochodzie niższym niż koszt pełnego dziennego przyrostu miasto nie stawało
NIGDY, niezależnie od tego, jak dobrze rozstawione są kopalnie — sprawdzenie
mierzyło model, a nie mapę. `probe-ekonomia.ts` rozkłada teraz stosy i skrzynie
z własnego pasa na 21 dni i liczy rozbudowę osobno z kopalń doliny (16 dni)
i z całej mapy (6 dni). Obie liczby to DOLNA granica: bohater nie przegrywa
tam żadnej bitwy i nie traci dni na dojazdy.

## Znalezione przy mapie 36 × 36

**`units` w scenie bitwy jest GETTEREM na tablicę symulacji.** Sonda kasowała
wrogów przez `s.units = s.units.filter(...)` i to cicho nic nie robiło —
przypisanie do gettera przepada bez błędu. Wyglądało to jak zepsuty powrót
z bitwy przez trzy podejścia. Stąd `rozstrzygnijNatychmiast` w scenie bitwy:
sonda ma kończyć bitwę drogą gry, a nie podmieniając jej pola z zewnątrz.

**Narastanie głośności potrafi przeżyć bitwę i wywalić jej zakończenie.**
Muzyka wchodzi tweenem trwającym kilka sekund; jeśli bitwa skończy się
wcześniej, `stopMusic` niszczy dźwięk, a żywy tween pisze do niego głośność
i rzuca wyjątkiem. Zakończenie bitwy przerywało się w połowie: wynik był
odłożony, ale powrót na mapę nigdy nie następował. `stopMusic` ubija teraz
tweeny celu, zanim cokolwiek zniszczy. To nie była usterka sondy — wywalić
się mogło każdemu, kto wygra bitwę przed pierwszym kliknięciem.

**Maskę kontenera musi robić obiekt Z LISTY WYŚWIETLANIA.** `make.graphics({},
false)` daje obiekt poza listą i maska z niego po prostu nie działa, bez
żadnego ostrzeżenia — mapa wyjeżdżała poza ramę na panel. Musi być
`add.graphics().setVisible(false)`.

**Sprawdzenia też się starzeją.** Warunek „w pierwszej turze osiągalne 2–4
obiekty" był dobrany do planszy 14 × 12. Po przejściu na 36 × 36 i punkty
ruchu z Heroes 3 zgłosił błąd, choć zachowanie było poprawne — w Heroes 3
pierwszy dzień naprawdę pokazuje kilkanaście obiektów. Teraz sprawdzamy to,
o co naprawdę chodzi: żeby było co robić i żeby nie dało się pierwszego dnia
dojechać do zamku przeciwnika.

## Znalezione przy ekranie miasta

**Miejsce na panoramie to GŁĘBIA, nie wysokość na ekranie.** Pierwsza wersja
brała `y` z `zamki.ts` wprost jako ułamek wysokości i połowa budynków lądowała
nad horyzontem — wisiały w niebie nad wzgórzami. Teraz `y` znaczy „jak blisko
patrzącego": scena przelicza je na punkt w pasie ziemi i na perspektywę (co
dalej, to mniejsze). Dopiero z tym drugim panorama przestała wyglądać jak
naklejki na tapecie.

**Głębokości rysowania muszą zmieścić się PONIŻEJ `Z.hud`.** Bryły dostawały
`Z.sky + y × 100`, czyli do 87 przy `Z.hud` równym 60 — i wysoki budynek
przykrywał kartę, która właśnie go opisywała. Wygląda to jak usterka karty,
a jest arytmetyką warstw.

**`ImageDraw` bez trybu `'RGBA'` WPISUJE alfę, zamiast mieszać.** Półprzezroczysta
kreska cienia wychodzi wtedy jaśniejszą plamą niż tło, a nie ciemniejszą.
Zjadło to splot na krawędzi gniazda: zamiast wikliny wyszły jasne prostokąty.
Rysunki z alfą wymagają `ImageDraw.Draw(im, 'RGBA')` — panorama tak ma, bryły nie.

**Dwa jednakowe jajka nad krawędzią gniazda składają się w twarz.** Symetryczna
para jasnych plam z ciemnym łukiem pod spodem czyta się jak oczy i uśmiech —
i nie da się tego przewidzieć z kodu, widać dopiero na gotowym obrazku. To ta
sama rodzina błędów, co ścieżka wyglądająca jak tory kolejowe przy mapie.
Ratunek: różne wielkości i przesunięcie z osi.

**Blady zarys potrzebuje CIEMNEJ otoczki pod jasnym konturem.** Sam biały
kontur ginął na jasnej trawie Boru, a sam ciemny — na fiolecie Groty. Dwie
obwódki naraz działają na obu paletach; to ta sama sztuczka, co kontur napisów
w HUD-zie.

**Trzy ratusze to jeden budynek, więc na panoramie może stać tylko jeden.**
Rysowanie stopnia postawionego i zarysu następnego w tym samym punkcie dawało
dwa domy w sobie. Rozbudowę otwiera się teraz kliknięciem w ten ratusz, który
stoi — i to jest dokładnie zachowanie z Heroes 3.

**Sonda ogłosiła zepsuty powrót z bitwy, a zepsuty był pomiar — po raz kolejny.**
`probe-przygoda.mjs` czekała `waitForTimeout(3600)` na ekran końca, który
odlicza 2600 ms CZASU GRY. Na maszynie bez sprzętowego rysowania gra chodzi
po kilka klatek na sekundę i te 2,6 s rozciągają się do czterdziestu. Zegar
sceny biegł, `delta` wyglądała normalnie (16,66 ms), a zdarzenie odmierzało
67 ms na sekundę zegara ściennego — dopiero to pokazało, o co chodzi. Sonda
czeka teraz na SCENĘ, nie na sekundy.

## Rzecz, o której warto pamiętać przy każdej następnej rundzie

Trzy razy w tym projekcie zły POMIAR udawał złą pracę: skalowanie kadrów
w ślepym porównaniu, poprzeczka dobrana do innego elementu, pasek klatek
trafiający w losowy cios. Za każdym razem kosztowało to kilka rund poprawiania
czegoś, co działało. Zanim uznasz, że coś jest zepsute — sprawdź najpierw,
czym to mierzysz.

Przy zamykaniu lotu ta sama pułapka zadziałała jeszcze trzy razy pod rząd:
sonda liczyła średnią razem z bezruchem po wylądowaniu, potem myliła wzlot
z falowaniem, a potem zbierała siedem próbek na dwusekundowy przelot, bo każdy
odczyt szedł osobną podróżą do przeglądarki. Za każdym razem liczby mówiły
„animacji nie ma", a animacja była. Dopiero rejestrator wewnątrz strony,
próbkujący klatka po klatce, pokazał prawdę.

## Ekonomia — co było zepsute i jak to teraz stoi

Zgłoszenie brzmiało: „mam wszystkie kopalnie i nie mam za co kupić armii, nie
mówiąc o rozbudowie". Było prawdziwe i miało trzy niezależne przyczyny.

1. **Dwie różne skale walut w jednej grze.** Dochód liczyliśmy jak złoto
   z Heroes 3 dzielone przez sto (kopalnia 1000 → 10 pokeballi), a ceny
   oddziałów wpisaliśmy na oko, jakby dzielić przez trzydzieści (60 → 2).
   Dzienny przyrost całego miasta kosztował **95 pokeballi**, a CAŁA mapa dawała
   **30**. Teraz jest jedna reguła — `ZLOTO_NA_POKEBALL = 50` — i przechodzi
   przez nią wszystko: oddziały, kopalnie, skrzynie, stosy, ratusze.
2. **Drzewko budynków istniało tylko jako dane.** `zamki.ts` miało jedenaście
   budynków, koszty i funkcje `dochodZamku` oraz `przyrostZamku` — i nic ich nie
   wywoływało. Ratusz nie dawał ani jednego pokeballa, fort nie podnosił
   przyrostu, a siedlisk nie dało się postawić, bo żaden ekran ich nie pokazywał.
3. **Kamienia ewolucji nie dało się zdobyć.** Cztery budynki wymagały razem
   ośmiu, a plansza ma jeden stos (1–3 sztuki) i zero kopalni kamienia. Miasta
   nie dało się skończyć niezależnie od tego, jak dobrze się grało. Kamień
   wypadł z kosztów budowy i czeka na ulepszenia oddziałów.

Jak to stoi po zmianie (liczby z `probe-ekonomia`):

| | pokeballe dziennie |
|---|---|
| przyrost całego miasta (z fortem) kosztuje | 95 |
| mapa + startowe miasto daje | 70 |
| mapa + rozbudowane miasto daje | 140 |

Czyli: na początku dochód pokrywa większość przyrostu, ale nie wszystko — trzeba
wybierać. Po rozbudowie starcza na armię i jeszcze zostaje. Pełne miasto staje
w około 27 dni **przy codziennym wykupywaniu przyrostu**, a nie zamiast niego.

Czego świadomie nie ruszyłem: ekran miasta jest listą, nie malowaną panoramą
z Heroes 3. Panorama jest następnym krokiem — ale lista, w której da się
budować, jest warta więcej niż obrazek, w którym nie da się nic.

## Woda na mapie przygody

Zgłoszenie brzmiało: „fajnie, że dodałeś animację wody, ale loop nie wygląda
jak płynny loop". I nie mógł wyglądać — animacja miała **cztery klatki
przełączane co 550 ms**, czyli niecałe dwie klatki na sekundę. Przy takim
tempie oko widzi przeskoki niezależnie od tego, jak dobrze klatki do siebie
pasują. Poprzednie podejście (ustawienie przesunięć tekstury na rombie, żeby
pętla się domykała) usunęło szarpnięcie przy zapętleniu, ale nie mogło usunąć
skokowości samego ruchu.

Woda jest teraz **liczona shaderem przy każdym rysowaniu**. Kosztuje jedną
dodatkową operację rysowania na klatkę, a daje ruch ciągły.

Co jest gdzie:

* `tools/woda_dane.py` — dwa pliki danych, oba powstają razem z planszą
  w `python3 tools/render_mapa.py`:
  * `woda-maska.png` — R: ile tu wody, G: odległość od brzegu, B: głębia.
    Maska jest DOKŁADNIE tą, którą namalowano planszę; policzona drugi raz
    rozjechałaby się i na styku zostałby rąbek.
  * `woda-zmarszczki.png` — bezszwowy szum w trzech oktawach (kanały R/G/B).
    Generowany, a nie rysowany modelem: musi kafelkować się bez szwu, a tego
    modele graficzne nie utrzymują. **To jest odpowiedź na pytanie, czy
    potrzeba nowych tekstur wody — nie potrzeba.**
* `src/visual/woda.ts` — shader. Kwadrat leży na całej planszy i przepisuje ją
  piksel w piksel, zmieniając tylko wodę; dzięki temu nie ma mieszania
  przezroczystości na brzegu.

Trzy rzeczy, które kosztowały najwięcej dochodzenia:

1. **Współrzędne.** Kwadrat siedzi w kontenerze świata, przesuwanym kamerą
   i przyciętym maską; wbudowane współrzędne tekstury kwadratu tego nie
   odwzorowują. Liczymy je z `gl_FragCoord` i położenia kamery.
2. **Odbicie w pionie.** Phaser wgrywa obrazy do karty odwrócone, więc plansza
   czytana wprost dawała lustrzane odbicie mapy — woda z południa wychodziła
   na północy.
3. **Ile wolno zamalować.** Namalowana woda ma własne kaustyki i mocny kolor.
   Pierwsza wersja mieszała barwę głębi na tyle mocno, że jezioro robiło się
   szare i wypadało z palety mapy. Shader dokłada więc głównie RUCH: załamanie
   światła, iskry na grzbietach i pianę przy brzegu, a barwę tylko muska.

`plansza-1..3.png` zostały usunięte — nikt ich już nie wczytuje. Namalowana
`plansza-0.png` ma wodę wypaloną w obrazie i służy jako zapas: gdy shadera nie
da się utworzyć, gracz widzi nieruchomy staw zamiast dziury w mapie.

## Klik trafiał rząd niżej — i dlaczego sondy tego nie łapały

Zgłoszenie: kliknięcie w bramę zamku prowadziło bohatera na pole wyraźnie
niżej. Przyczyna nie miała nic wspólnego z zamkiem.

Kontener świata stał na `(mapaX, mapaY)`, czyli `(8, 44)`, a kamera planszy ma
tam SWÓJ początek. Przesunięcie liczyło się więc dwa razy: plansza była
rysowana o 44 piksele niżej, niż sądziła kamera. `zEkranu` — jedyne miejsce,
w którym ekran przelicza się na pole — o tym przesunięciu nie wiedziało,
a 44 piksele to prawie całe pole (48), więc niemal każde kliknięcie lądowało
rząd niżej. Przy okazji u góry ramy zostawał czterdziestoczteropikselowy pas
pustki, a dolny rząd planszy był ucięty.

Kontener stoi teraz na `(0, 0)` i cały układ jest jeden: współrzędne sceny to
wprost współrzędne planszy, a za położenie na ekranie odpowiada wyłącznie
kamera.

**Dlaczego przeszło przez sondy.** `probe-klik` liczył położenie pola tym samym
wzorem, którego używa `zEkranu` — sprawdzał więc wzór sam ze sobą i przechodził
niezależnie od tego, gdzie naprawdę jest narysowana plansza. Doszła asercja,
która bierze punkt odniesienia z NARYSOWANEGO tła (`plansza.getBounds()`)
i żąda, żeby środek pola wracał jako to samo pole. Przy przywróceniu starego
przesunięcia wypisuje wprost `3,3 → 3,4` — czyli dokładnie objaw ze zgłoszenia.

Po drodze wyszła druga rzecz, tym razem prawdziwa: `obiektPodKursorem`
sprawdzał PROSTOKĄT rysunku. Prostokąt wieży obserwacyjnej jest w dwóch
trzecich pustym niebem, więc wysoka budowla zabierała kliknięcia wszystkiemu,
co stało za nią. Teraz liczy się piksel: kanał alfa tekstury jest czytany raz
i trzymany w pamięci.

## Budowle „naklejone na mapę" — właściwa przyczyna

To wracało kilka razy i za każdym razem poprawka celowała w to samo,
nieistniejące miejsce. `zamek-las.png` ma pod murami **28 pikseli
przezroczystego marginesu** (`kopalnia-pokeball.png` dwa, `wiatrak.png` zero).
Cały kod osadzania — cień kontaktowy, grunt podchodzący na spód, zarośla —
mierzył od dolnej krawędzi PLIKU. Przy zamku to jedenaście pikseli poniżej
murów: cień leżał w powietrzu, grunt zakrywał pustkę.

Margines jest teraz mierzony z alfy (`pustkaPodRysunkiem`), a nie wpisany
w tabelę — tabela rozjeżdża się przy pierwszej wymianie grafiki, a wymieniamy
je często. Od tej jednej wartości liczy się wszystko, więc nie da się już tego
rozjechać osobno dla cienia i osobno dla gruntu.

Do tego sam sposób osadzania: zamiast trzech pasów gruntu o skokowym kryciu
(trzy widoczne stopnie) jest gładka krzywa, a NA NIEJ szesnaście kolumn
podchodzących na różną wysokość. To jest sedno: sprite jest ucięty POZIOMO,
więc gładkie przejście tylko przesuwa tę samą prostą wyżej — dopiero nierówna
linia gruntu ją likwiduje. Kilka krzaków przy podstawie, z pominięciem bramy,
dokłada resztę.

## Publikowanie: jedna strona, wiele wersji

Do września każda gałąź dopisywała SIEBIE do listy publikujących na Pages,
a Pages ma jedną stronę na repozytorium. Gałęzie zamalowywały się więc
nawzajem i to, co widać pod adresem, zależało od tego, która wypchnęła jako
ostatnia. Nie jest to teoretyczne: deploy AI przeciwnika cofnął mapę do
starszej wersji, a zapis gry przez tydzień nie był widoczny w ogóle, choć był
gotowy i przetestowany.

Teraz jest tak:

| Co | Gdzie |
|---|---|
| gałąź główna | `…/heroes/` |
| każda inna gałąź | `…/heroes/podglad/<gałąź-z-myślnikami>/` |
| spis podglądów | `…/heroes/podglad/` |

Deploy rusza WYŁĄCZNIE swój kawałek, a resztę przepisuje z poprzedniego
wydania — dlatego nic już nikogo nie nadpisuje.

**Dlaczego przez gałąź-magazyn.** `actions/deploy-pages` wysyła stronę
w całości i zastępuje poprzednią; nie umie dołożyć katalogu do tego, co już
stoi. Poprzednie wydanie musi więc gdzieś leżeć, żeby dało się je złożyć
z nowym kawałkiem — leży w gałęzi `strona-podglady`, nadpisywanej jednym
commitem bez historii (trzyma zbudowane grafiki; z historią repozytorium
puchłoby o kilkadziesiąt megabajtów przy każdym wypchnięciu). Alternatywa —
przestawienie źródła Pages na gałąź — daje szybsze deploye, ale wymaga
kliknięcia w ustawieniach repozytorium.

**Cena.** Każdy podgląd to pełna kopia gry, około 50 MB, a przy każdym
deployu cała strona idzie na serwer od nowa. Stąd limit `MAKS_PODGLADOW`
w workflow: najstarsze podglądy kasują się same. Podgląd gałęzi, która
właśnie się publikuje, jest chroniony bezwarunkowo — deploy nie ma prawa
skasować tego, co przed chwilą zbudował.

**Uwaga przy wdrażaniu, kosztowała jedno przemyślenie:** gałąź dostaje nowy
sposób publikowania dopiero wtedy, gdy scali do siebie gałąź główną — bo
workflow jest plikiem W REPOZYTORIUM i każda gałąź ma własną kopię. Gałąź ze
starym plikiem, która wypchnie zmiany, opublikuje sam swój `dist` i zmiecie
podglądy ze strony. Nie jest to trwałe: magazyn ma komplet, więc najbliższy
poprawny deploy odtwarza wszystko. Kolejność wdrożenia też ma znaczenie —
gałąź główna MUSI pójść pierwsza, inaczej magazyn powstaje z pustym korzeniem
i główny adres gry zwraca 404 do czasu jej deployu.

**Pułapka przy sprawdzaniu podglądów:** `actions/deploy-pages` nazywa wydanie
odciskiem commita (`pages_build_version`). Dwie gałęzie wskazujące ten SAM
commit dają więc jedno wydanie — drugi deploy kończy się sukcesem, ale niczego
nie zmienia. W normalnej pracy to nie występuje, bo każda gałąź ma własne
commity; łatwo się za to o to potknąć przy testowaniu mechanizmu, wypychając
tę samą rewizję w dwa miejsca. Objaw jest mylący: zielony run i stara strona.
## Portal, który prowadził o jedno pole

Generator stawiał oba końce pary portali gdziekolwiek w strefie — jedynym
warunkiem było „ta sama strona grzbietu". Po przebudowie rozstawienia straży
losowanie wypadło tak, że oba końce stanęły na polach (26,7) i (27,7), czyli
obok siebie. Portal przenosił o jedno pole.

Nie znalazła tego żadna sonda planszy, bo żadna nie miała o to pytania.
Znalazła to poprzeczka AI przeciwnika z sąsiedniej gałęzi: wróg wchodził
w jeden koniec, wypadał na drugim, i tak przez resztę partii. Od dwudziestego
dnia stał w tym samym miejscu z armią rosnącą do dwustu i nigdy nie ruszał
na gracza. W liczbach: zamek biernego gracza padał 3/8 przed tą mapą i 0/8 po
niej, a po podmianie samych danych planszy z powrotem na starą — znowu 3/8.
Kod nie miał z tym nic wspólnego.

Odległość jest teraz WARUNKIEM w `para_portali` (`tools/generuj_mape.py`):
co najmniej dwadzieścia pól, czyli mniej więcej trzy dni marszu. Poniżej tego
skrót nie jest skrótem. Sonda planszy sprawdza to samo na gotowych danych,
parując portale tak, jak paruje je gra (pierwszy z drugim, trzeci z czwartym).

Morał jest ten sam, co zwykle w tym projekcie, tylko z drugiej strony: tym
razem to nie zły pomiar udawał złą pracę, tylko BRAK pomiaru pozwolił złej
pracy przejść. Mapa przeszła wszystkie sondy i cztery ślepe porównania
z prawdziwymi mapami Heroes 3, mając w sobie portal donikąd.
