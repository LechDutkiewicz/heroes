# Checklista budowy planszy — zasady z map Heroes 3

Skąd to jest
------------
Oficjalny poradnik edytora map HoMM3 (rozdział o budowaniu map, Greg Fulton)
i opisy map HotA nie są osiągalne z tego środowiska (strony z poradnikiem,
maps4heroes, wiki i fora HoMM3 są blokowane przez politykę sieci). Lista
poniżej jest więc SPISANA Z PAMIĘCI tego poradnika i z powszechnych zasad
mapmakerów HoMM3/HotA, a potem PRZYŁOŻONA DO PLIKÓW: pięć oficjalnych map
72 × 72 (`*-profil.json` obok, policzone z `.h3m` przez `profil-wzorca.py`).
Tam, gdzie zasadę da się wyrazić liczbą, liczba jest z tych map, nie z głowy.

Jak jej używać
--------------
Krytyk odhacza każdy punkt osobno: **TAK / NIE / CZĘŚCIOWO**, z jednym
zdaniem uzasadnienia opartym na obrazie albo liczbie. Punkty bez
uzasadnienia nie liczą się. Plansza „ma pełną checklistę", gdy nie ma
żadnego NIE i najwyżej dwa CZĘŚCIOWO.

## A. Strefa startowa (pierwszy tydzień)

- [ ] **A1. Start czytelny.** Zamek gracza stoi przy skraju albo w rogu
  mapy, w zatoce terenu, która ma JEDNO–DWA wyjścia; z pierwszego ekranu
  widać, dokąd prowadzi droga.
- [ ] **A2. Podstawowe kopalnie w zasięgu dwóch dni, bez straży.** Tartak
  i kopalnia rudy (u nas jagody i odłamki) w ≤ 10 krokach od bramy zamku,
  niestrzeżone. Kopalnie „droższe" (kamień, pokeballe) — strzeżone,
  ale w strefie domowej.
- [ ] **A3. Stos łatwych nagród pod ręką.** Kilka surowców luzem i 1–2
  skrzynie w pierwszych 8 krokach, żeby pierwsze dni były zbieraniem,
  a nie marszem.
- [ ] **A4. Strefa startowa zamknięta strażami, nie otwarta na mapę.**
  Mapa dostępna bez żadnej bitwy to 7–30 % pól przejezdnych (wzorce:
  7–81 %, ale dobre mapy 1v1 siedzą w dolnej połowie). Każde wyjście ze
  strefy startowej ma straż.
- [ ] **A5. Jedna wolno stojąca walka na start.** W strefie domowej jest
  straż słaba (poziom 1–2), którą da się pobić pierwszego–drugiego dnia
  startową drużyną — pierwsza bitwa jest nauką, nie barierą.

## B. Gospodarka

- [ ] **B1. Komplet kopalń na gracza.** Każdy gracz ma w zasięgu swojej
  krainy po jednej kopalni każdego surowca podstawowego; surowce rzadkie
  dzielone (1 na mapę M, 2 na L) i sporne.
- [ ] **B2. Surowce luzem leżą tam, gdzie prowadzi droga.** Nie konfetti po
  całej łące: stosy po 2–4 rzeczy w zakątkach, przy skrzyżowaniach, na
  końcu ślepych odnóg (żeby ślepa odnoga się opłacała).
- [ ] **B3. Gęstość obiektów jak w HoMM3.** Obiekt interaktywny co
  4–12 pól przejezdnych (wzorce: 4,1–12,5). Powyżej 12 to pustka.
- [ ] **B4. Udział rodzajów.** Z grubsza: surowiec luzem 20–25 %, budynki
  do odwiedzenia 25–35 %, skrzynie/znaleziska 15–20 %, kopalnie 7–10 %,
  artefakty 5–8 %, straże 10–24 % wszystkich obiektów.

## C. Straże

- [ ] **C1. Straż stoi w szyjce, nie na placu.** Każda straż blokuje
  przejście (przełęcz, bród, most, wylot doliny) albo wejście do zakątka
  z kilkoma rzeczami. Straż pilnująca jednej skrzyni na otwartej łące =
  błąd.
- [ ] **C2. Siła rośnie z odległością od startu.** Słabe w strefie
  domowej, średnie na pograniczu, silne i wodzowie w krainie wroga i przy
  reliktach. Żadnej silnej straży w zasięgu pierwszego tygodnia.
- [ ] **C3. Nagroda proporcjonalna do straży.** Za wodzem leży coś, czego
  nie ma nigdzie indziej (relikt, kopalnia rzadka, budynek specjalny); za
  słabą strażą — zwykły zakątek.
- [ ] **C4. Nie da się ominąć.** Przejścia mają ≤ 3 pola szerokości, straż
  zamyka je w całości; nie ma „bocznej ścieżki" przez las obok straży.

## D. Drogi i ścieżki

- [ ] **D1. Droga prowadzi tam, gdzie gracz ma iść.** Główna droga łączy
  zamek gracza przez przejścia z zamkiem wroga; odnogi prowadzą do kopalń
  i budynków, nie urywają się w polu.
- [ ] **D2. Droga nie jest jedyną trasą.** Da się skrócić bezdrożem
  kosztem ruchu (łąka obok drogi), ale przez bagno/śnieg/las bezdroże
  jest drogie — droga ma SENS ekonomiczny.
- [ ] **D3. Droga się wije, ale czytelnie.** Zakręty z powodu terenu
  (omija jezioro, skałę), nie losowe zygzaki; skrzyżowania mają punkt
  orientacyjny (budynek, kopalnia, most).
- [ ] **D4. Mosty i brody tam, gdzie woda przecina drogę** — i tylko tam.

## E. Topografia i strefy

- [ ] **E1. Mapa ma kształt, który da się opowiedzieć w zdaniu.** Dwie
  doliny za grzbietem, wyspa w pierścieniu wody, rzeka z dwoma brodami.
  Z minimapy widać ten kształt od razu.
- [ ] **E2. Trzy akty.** Strefa domowa → pas sporny (środek gry, najwięcej
  obiektów, przejścia przesunięte względem siebie) → kraina wroga. Obiekty
  rozkładają się po odległości z garbem w środku, a najdalsze 20 % zasięgu
  ma własny skarbiec, nie resztki.
- [ ] **E3. Tereny mają powód.** Rodzaj terenu zmienia się na krawędziach
  stref (łąka doliny, skały grzbietu, piasek pogranicza), nie plamami
  losowo po całej mapie; każda plama terenu ma ≥ 6 × 6 pól.
- [ ] **E4. Bryły nieprzejezdne są bryłami.** Pasma gór i lasy to ciągłe
  masywy z wyraźnymi przełęczami, nie rozsypane pojedyncze drzewa; 25–40 %
  pól to las/skały (wzorce: T+# = 40–60 %, u nas drzewa częściej są
  dekoracją na przejezdnym).
- [ ] **E5. Woda pracuje.** Jezioro albo rzeka dzieli strefy, tworzy
  bród/most jako szyjkę albo zatokę ze skarbem; nie ma kałuż bez funkcji.

## F. Odkrywanie i nagrody za ciekawość

- [ ] **F1. Każda ślepa odnoga ma cel.** Na końcu stoi coś (budynek,
  stos surowców, skrzynia, artefakt), nigdy pusta łąka.
- [ ] **F2. Jeden obiekt, który każe wrócić** (chata jasnowidza, namiot
  klucznika, strażnica graniczna, portal) — mapa ma pętlę, nie tylko
  marsz do przodu.
- [ ] **F3. Budynki specjalne są rzadkie i widoczne.** Drzewo wiedzy,
  ośrodek ewolucji, kamienna wieża: po 1–2 na planszę, w miejscach,
  które widać z daleka (na wzgórzu, nad wodą, na końcu drogi).
- [ ] **F4. Cel misji leży na końcu łuku, nie obok startu.** Odległość
  do celu / zamku wroga ≥ 70 % najdalszego zakątka.

## G. Czytelność na ekranie (nasz styl, nasze dziecko-gracz)

- [ ] **G1. Z jednego ekranu (21 × 18 pól) widać jedną decyzję.** Nie
  więcej niż 2–3 rzeczy do wzięcia i jedna straż naraz; żadnego ekranu
  pustego i żadnego z dziesięcioma obiektami.
- [ ] **G2. Obiekty nie wchodzą na siebie ani na drogę.** Kopalnia nie
  w dachu zamku, straż nie na moście, drzewo nie na wejściu.
- [ ] **G3. Dekoracja podkreśla układ.** Kępy lasu i skał obrysowują
  przejścia i brzegi, kwiaty/trzciny w zakątkach; dekoracja nie zasłania
  obiektów interaktywnych.
- [ ] **G4. Kolor terenu mówi, gdzie jesteś.** Strefa domowa cieplejsza
  i jaśniejsza, kraina wroga ciemniejsza/chłodniejsza; różnica widoczna
  na minimapie.
