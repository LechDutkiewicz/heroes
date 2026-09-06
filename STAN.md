# Stan prac — notatka na wznowienie

Ostatnia aktualizacja: 2026-09-06 (scalenie: grafika z modelu, ekonomia na jednej skali, układ mapy).

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
| `npx tsx tools/probe-ekonomia.ts` | czy dochód z prawdziwej mapy starcza na armię I rozbudowę |
| `node tools/probe-rozbudowa.mjs` | czy budynek da się KLIKNĄĆ i czy miasto potem daje więcej |
| `node tools/probe-kopalnia.mjs` | czy budynek produkcyjny się ZAJMUJE, a nie zbiera |
| `npx tsx tools/probe-budowle.ts` | czy każda budowla odwiedzana coś daje, i to raz |
| `node tools/probe-przygoda.mjs` | pełna pętla: mgła, skrzynia, artefakt, bitwa, zamek, powrót |
| `node tools/probe-klik.mjs` | czy KLIKNIĘCIE prowadzi bohatera tam, gdzie się kliknęło |
| `node tools/probe-miasto.mjs` | ekran miasta: klikanie w bryły, lista budowy, jeden budynek dziennie, przyrost |
| `npx tsx tools/probe-zamki.ts` | drzewko budynków: przechodniość, ceny, czas rozbudowy |
| `npx tsx tools/probe-ekonomia.ts` | dochód i koszty z PRAWDZIWEJ mapy: czy da się budować i werbować naraz |
| `node tools/probe-rozbudowa.mjs` | rozbudowa miasta klikaniem, od początku do końca |
| `node tools/probe-zwis.mjs` | czy okno skrzyni naprawdę WIDAĆ i czy druga bitwa startuje |
| `node tools/probe-dziennik.mjs` | dziennik diagnostyczny: ziarno, łapanie wyjątków, raport, F8 |
| `node tools/zrzut-mapa.mjs` | zrzut mapy przygody (osobno, bo `capture.mjs` zna tylko bitwę) |

Grafiki mapy są generowane, nie wrzucane ręcznie. Po zmianie planszy albo
palety trzeba puścić:

| Skrypt | Co robi |
|---|---|
| `python3 tools/kafelki_autotile.py` | odczytuje z arkusza tablicę kafelków przejściowych |
| `python3 tools/generuj_mape.py` | składa planszę 36 × 36 ze szkicu krain i rozstawia obiekty |
| `python3 tools/render_mapa.py` | składa tło planszy i dane dla shadera wody |
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

## Układ mapy — „Key to Victory"

Plansza jest przeniesieniem mapy „Key to Victory" na to, co mamy. Z oryginału
wzięte są rozmiar (36 × 36), strony (gracz na polu 32,33 na południowym
wschodzie, przeciwnik na 20,15 na północy) i cała struktura: pasmo gór przez
całą szerokość mapy z pilnowanymi przejściami. Południe to bezpieczna dolina
z gospodarką, północ to kraina przeciwnika z nagrodami i silnymi strażami.

Przejścia są dwa, jak w oryginale, gdzie drugą drogę na północ dają podziemia:

| Przejście | Kolumny | Czym się różni |
|---|---|---|
| Przełęcz | x 12–14 | droga bita, krótko od głównego szlaku |
| Nadmorska ścieżka | x 3–5 | piasek (125 punktów ruchu zamiast 70), w przeciwległym rogu mapy niż start — sam dojazd to kilka dni |

**Czego z oryginału NIE ma i to widać.** Tytułowym kluczem są tam Strażnice
Graniczne i Namioty Klucznika: strażnicy nie da się pokonać, tylko OTWORZYĆ,
po znalezieniu namiotu gdzie indziej na mapie. Nie mamy ani jednego, ani
drugiego, więc w przejściach stoją zwykłe potwory. Mapa mówi więc „zbierz
armię", a nie „poszukaj klucza" — a to inna zagadka i inna gra. Spis rzeczy,
których brakuje, jest na końcu `tools/generuj_mape.py`.

**Rdzeń grzbietu jest zasklepiany po rozmyciu, i musi być.** Rozmycie granic
w generatorze potrafi wybić w murze dziurę szeroką na jedno pole. Nie widać
tego ani na obrazku, ani w kodzie — po prostu pewnego dnia da się wejść na
północ bokiem, omijając straż, i mapa przestaje być tą mapą. Dlatego wiersze
19–22 wracają po rozmyciu do stanu ze szkicu, przejścia są wycinane ręcznie,
a `probe-mapa.ts` liczy, ile przejść naprawdę zostało (ma być dwa) i czy straż
stoi W przejściu, a nie obok.

**Odległość od startu przestała nadawać się na miarę trudności.** Przy starcie
pośrodku mapy działała; przy starcie w ROGU przeciwległy kraniec własnej,
bezpiecznej doliny wychodzi „dalej" niż zamek przeciwnika za grzbietem — i
dostawał relikty oraz straże przewidziane dla krainy wroga. Teraz o tym, co
gdzie stoi, decyduje STREFA (dom / pogranicze / wroga), wyznaczona przez
grzbiet, a odległość wewnątrz doliny liczy się w polach, którymi naprawdę się
chodzi (przeszukiwanie wszerz), a nie po przekątnej przez góry.

**Drugie przejście przy zamku gracza wywraca cały zamysł.** Pierwsza wersja
miała ścieżkę nadmorską przy wschodnim brzegu, trzynaście pól od startu.
Wychodził z tego skrót KRÓTSZY od głównej drogi, przy którym dało się
pierwszego dnia wjechać w najsilniejszą straż na mapie i przegrać pierwszą
bitwę w grze, zanim się w ogóle było w swoim zamku. Drugie przejście musi
leżeć w przeciwległym rogu mapy niż start — inaczej nie jest alternatywą,
tylko obejściem.

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
