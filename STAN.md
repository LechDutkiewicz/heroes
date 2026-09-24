# Stan prac — notatka na wznowienie

Ostatnia aktualizacja: 2026-09-24 (plansze kampanii: Polana, Bagna, Twierdza; silnik generatora).

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

Misja 2 to niezmieniona plansza Dwóch Dolin: autopilot nie szuka namiotów
klucznika celowo, a przeciwnik ma oba klucze od pierwszego dnia, więc w tej
symulacji wróg dochodzi pierwszy. To jest ocena autopilota, nie planszy
(`probe-mapa.ts` sprawdza, że akty kluczy dają się przejść), ale pokazuje, że
na misji 2 dziecko ma na zamek gracza mniej więcej miesiąc.

Autopilot jest słabym graczem (trzyma setki niewydanych pokeballi, wędruje za
brzegiem mgły), więc jego wynik to górna granica czasu, a nie średnia.

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
| `node tools/probe-przygoda.mjs` | pełna pętla: mgła, skrzynia, artefakt, bitwa, zamek, powrót |
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
