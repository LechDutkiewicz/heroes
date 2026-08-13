# Stan prac — notatka na wznowienie

Ostatnia aktualizacja: 2026-08-12 (mapa 36 × 36, mgła, bitwa z mapy).

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
| `node tools/probe-kopalnia.mjs` | czy budynek produkcyjny się ZAJMUJE, a nie zbiera |
| `node tools/probe-przygoda.mjs` | pełna pętla: mgła, skrzynia, artefakt, bitwa, zamek, powrót |
| `node tools/probe-klik.mjs` | czy KLIKNIĘCIE prowadzi bohatera tam, gdzie się kliknęło |
| `node tools/probe-zwis.mjs` | czy okno skrzyni naprawdę WIDAĆ i czy druga bitwa startuje |
| `node tools/zrzut-mapa.mjs` | zrzut mapy przygody (osobno, bo `capture.mjs` zna tylko bitwę) |

Grafiki mapy są generowane, nie wrzucane ręcznie. Po zmianie planszy albo
palety trzeba puścić:

| Skrypt | Co robi |
|---|---|
| `python3 tools/kafelki_autotile.py` | odczytuje z arkusza tablicę kafelków przejściowych |
| `python3 tools/generuj_mape.py` | składa planszę 36 × 36 ze szkicu krain i rozstawia obiekty |
| `python3 tools/render_mapa.py` | składa i wygładza tło planszy (4 klatki wody) |
| `python3 tools/prepare_mapa_obiekty.py` | wycina i wygładza drzewa, skały, zamki, bohatera |
| `python3 tools/rysuj_obiekty_mapy.py` | rysuje surowce, budynki i ozdoby |
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

- **Mapa przygody — pierwsza plansza.** Układ przeniesiony z HotA, teren
  układa się sam z arkusza narożnikowego, drogi rysowane, woda animowana.
  Wejście: `?ekran=mapa`. Szczegóły niżej.
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
- **Skrzynia jest pytaniem, nie nagrodą** — pokeballe albo doświadczenie,
  trzy warianty jak w Heroes 3, rzadko artefakt.
- **Artefakty** dodają na stałe atak, obronę albo punkty ruchu.
- **Zamek z rekrutacją.** Sześć poziomów, zapas przyrasta codziennie, oddział
  tego samego gatunku dokleja się do istniejącego slotu. To domyka pętlę
  „zbierz — kup — wygraj".
- **Strefy kontroli potworów** — strażnika nie da się ominąć bokiem.
- **Straż na mapie to zawsze jeden gatunek**, ewentualnie rozbity na kilka
  stosów. Mieszane armie są w Heroes 3 wyłącznie w budynkach.

## W połowie

**Zamek jest, ale sam handel — bez rozbudowy.**

- **nie ma rozbudowy budynków ani ulepszania oddziałów.** Kamienie ewolucji
  i odłamki nie mają jeszcze na co iść; wydaje się tylko pokeballe;
- **do zamku przeciwnika nie da się wejść** — mówi to wprost, ale zdobycia
  zamku nie ma;
- **przeciwnik nie gra** — jego zamek stoi, ale nikt nim nie rusza;
- **potwory nie proponują dołączenia ani nie uciekają** — progi są policzone
  w `zasady-h3.ts`, ale nic ich jeszcze nie używa;
- **nie ma mgły wojny** ani przewijania — plansza mieści się na ekranie
  w całości i to ona wyznaczyła rozmiar 14 × 12;
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
