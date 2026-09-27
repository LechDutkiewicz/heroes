# Prompty startowe dla kolejnych wątków

Każdy prompt poniżej wkleja się do NOWEJ sesji jako pierwszą wiadomość. Prompty
zakładają, że sesja zacznie od przeczytania tego pliku („Zasady wspólne”) i
`STAN.md`, więc same są krótkie.

## Kolejność i równoległość

| Wątek | Temat | Zależy od | Może iść równolegle z |
|---|---|---|---|
| W1 | Ekonomia i poziom trudności (punkty 1 + 3) | PR #7 scalony | W3, W4 |
| W2 | SI przeciwnika z bohaterem (punkt 2) | **W1 scalony** — balans i SI dzielą `wrog-ai.ts` i symulacje | W3, W4 |
| W3 | Ekran bitwy + bohater na polu bitwy (punkty 4 + 6) | PR #7 scalony (bitwa, pozy, portrety) | W1, W4 |
| W4 | Ewolucje: siedliska w mieście i budynek na mapie (punkt 7) | PR #7 scalony | W1, W3 |
| W5 | Gildia i zaklęcia (punkt 8) | **W3 scalony** — zaklęcia w bitwie siedzą w tym samym ekranie | W2, W4 |

Punkt 5 (animacje stworków w bitwie) jest zrobiony w PR #7.

Najpierw scal PR #7 do `claude/pokemon-heroes-3-game-57m7wm`. Potem można
odpalić W1, W3 i W4 jednocześnie; W2 po scaleniu W1, W5 po scaleniu W3.
Równoległe wątki dotykają różnych plików, ale i tak każdy przed PR scala do
siebie aktualną gałąź główną i rozwiązuje konflikty (patrz niżej).

---

## Zasady wspólne (każdy wątek czyta to na starcie)

**Repozytorium i Pages.**
- Gałąź główna i źródło GitHub Pages: `claude/pokemon-heroes-3-game-57m7wm`
  (korzeń strony). Każda inna gałąź publikuje się sama po wypchnięciu jako
  podgląd pod `…/heroes/podglad/<gałąź-z-myślnikami>/` — to jest miejsce, gdzie
  gracz ogląda pracę w toku. Szczegóły: `STAN.md`, sekcja „Publikowanie: jedna
  strona, wiele wersji”, i `.github/workflows/deploy-pages.yml`. Workflow jest
  plikiem w repozytorium: gałąź musi mieć aktualną kopię z gałęzi głównej,
  inaczej jej deploy zmiecie cudze podglądy.
- Pracujesz na własnej gałęzi utworzonej od NAJNOWSZEJ gałęzi głównej
  (`git fetch origin claude/pokemon-heroes-3-game-57m7wm && git checkout -b <gałąź> origin/claude/pokemon-heroes-3-game-57m7wm`).
  Wypychasz często (podgląd na Pages się odświeża). PR otwierasz jako szkic
  do gałęzi głównej. Nie scalasz go sam — robi to gracz, i dopiero wtedy
  zmiany trafiają do korzenia Pages.
- Przed oddaniem PR scal do siebie aktualną gałąź główną (merge, nie rebase)
  i rozwiąż konflikty. Zasada rozwiązywania: funkcje i dane gracza z gałęzi
  głównej wygrywają; twoja zmiana ma zostać wpięta w ich strukturę. Jeśli
  obie strony zmieniły to samo różnie (np. grafikę stworków), zapytaj gracza.
- Gra musi działać z `base: './'` (Vite) i ze statycznego hostingu: żadnych
  serwerów, żadnych ścieżek absolutnych, zasoby w `public/`.

**Sprawdzanie — zanim cokolwiek wypchniesz.**
- `npm run build` (typy i kompilacja) i `npm run dym` (cztery bitwy w
  przeglądarce, błędy JS). Podgląd do zrzutów: `npm run build` i
  `npx vite preview --port 4173 --strictPort`. Sprawdź
  `curl -s -o /dev/null -w "%{http_code}" http://localhost:4173/` (200)
  i PRZEBUDUJ przed każdą serią zrzutów — nieaktualny build już kilka razy
  udawał błąd.
- Sondy z `STAN.md` („Narzędzia, którymi się to sprawdza”) dla obszaru,
  który ruszasz: m.in. `npx tsx tools/probe-mapy.ts`,
  `npx tsx tools/symulacja-misji.ts`, `npm run balans`,
  `npx tsx tools/probe-ekonomia.ts`, `node tools/probe-przygoda.mjs`.
  Czerwona sonda to błąd do naprawienia, nie do wyłączenia.
- CI na PR musi być zielone.

**Pętla „gauntlet” (tam, gdzie wątek ją przewiduje).**
- Poprzeczka to coś konkretnego i dostępnego: zrzuty HoMM3/HotA w
  `tools/reference/homm3/` (poza gitem; źródła w `ZRODLA.md` tamże — w nowym
  kontenerze trzeba je ściągnąć ponownie z tych URL-i), nasza własna gra albo
  liczby z symulacji. Nigdy opis poprzeczki zamiast niej samej.
- Kawałki są małe i oceniane osobno. Buduje builder, ocenia OSOBNY krytyk ze
  świeżym kontekstem, na ślepo: `node tools/blind.mjs --ours … --ref … --name …`
  (klucz A/B w `tools/blind/*.klucz.json` — krytyk go nie czyta; kopiuj obraz
  do neutralnej ścieżki). Krytyk dostaje tylko obraz i wybiera A albo B,
  nazywa jedną największą lukę przegranego. Trzech krytyków, wygrana przy 2/3.
- Styl naszej gry jest bajkowy i taki zostaje (decyzja gracza). Każdy prompt
  krytyka zawiera zdanie: „Obie gry mają celowo różny styl — nie nagradzaj ani
  nie karz stylu, tonu ani uroczości; oceniaj tylko to, o co pytam”.
- Lekcje z pętli storków (koniecznie): porównuj oba kadry w tej samej skali
  (oba ×2 albo oba ×1); gdy kawałek przegrywa kilka rund z rzędu, zrób TEST
  KONTROLNY — oceń tym samym testem nasze istniejące, zaakceptowane elementy
  albo sam wzorzec. Jeśli oblewają tak samo, test jest stronniczy i trzeba go
  zmienić, a nie dalej szlifować. Testy „co tu najmniej pasuje” zawsze
  wskazują postaci — nie używać. Porównania ruchu i czytelności (bez stylu)
  działają dobrze.
- Dziennik rund: `tools/postep_runda.py` z własnym plikiem
  (`POSTEP=postep-<temat>.json`), strona postępu z `tools/postep_kampania.py`
  (`TYTUL="…"`), publikowana jako artefakt i odświeżana po każdej rundzie.
- Grafiki: OpenAI przez `tools/generuj_grafiki.py` / `tools/stworki_przemaluj.py`
  (proxy środowiska wstrzykuje klucz; dziennik kosztów
  `tools/wsad/koszty-openai.jsonl`, limit `OPENAI_LIMIT_USD`). Ustal z graczem
  budżet na wątek, zanim wydasz więcej niż kilka dolarów.

**Na koniec wątku:** dopisz sekcję do `STAN.md` (co zrobione, jak mierzone,
co zostało, gdzie są narzędzia), wypchnij, zostaw PR jako szkic z opisem.

---

## W1 — Ekonomia i poziom trudności

```
Temat: ekonomia i poziom trudności w grze „Pokemon Heroes” (repo LechDutkiewicz/heroes).
Najpierw przeczytaj PROMPTY-WATKOW.md („Zasady wspólne”) i STAN.md
(zwłaszcza „Ekonomia — co było zepsute i jak to teraz stoi”, wyniki symulacji
misji, ewolucje z src/data/ewolucje.ts).

Problem od gracza: jagód prawie na nic się nie wydaje; plansze są za łatwe —
szybko buduje się niepokonaną armię.

Zrób to w dwóch krokach. Najpierw diagnoza z liczbami: dla każdej misji
kampanii i Dwóch Dolin tygodniowy dochód każdego surowca, na co każdy może
pójść, ile realnie wydaje autopilot, jak rośnie siła armii gracza i wroga
dzień po dniu. Porównaj z tym, jak to działa w Heroes 3 (każdy surowiec ma
stałe, bolesne ujście; armia rośnie z przyrostu tygodniowego, a nie lawinowo;
neutralne straże rosną z czasem). Zapisz tabelę celów, zanim zmienisz
cokolwiek: np. każdy surowiec ma co tydzień co najmniej jedno ujście,
na które autopilot go wydaje; gracz grający normalnie wygrywa misję 1 łatwo,
misje 3–4 z wysiłkiem; bierny gracz przegrywa w terminie; siła armii gracza
nie przekracza X× siły wroga przed dniem Y.

Potem pętla: zmiany ekonomii (ujścia jagód — np. ewolucje, rozbudowa
siedlisk, najem, utrzymanie, bohaterowie w tawernie; ceny; przyrosty;
wzrost straży) i trudności (siła i rozwój przeciwnika, straże, poziomy
trudności na start misji), mierzone symulacjami (`tools/symulacja-misji.ts`,
`npm run balans`, `probe-ekonomia.ts`, dopisz własne sondy). Kawałek jest
skończony, gdy liczby mieszczą się w tabeli celów w 3 powtórzeniach z różnym
ziarnem. Osobny krytyk ze świeżym kontekstem przegląda projekt zmian
(„gdzie gracz nadal nie ma na co wydać, gdzie jest przepis na niepokonaną
armię?”) — pętla trwa, dopóki nie znajdzie nic poważnego. Gauntlet wizualny
nie jest tu potrzebny.

Nie ruszaj logiki decyzji SI (to osobny wątek W2); możesz stroić jej zasoby
i progi. Pracuj na własnej gałęzi i trzymaj się zasad Pages z pliku promptów.
```

## W2 — SI przeciwnika z bohaterem

```
Temat: przeciwnik z bohaterem, który eksploruje mapę i walczy — w grze
„Pokemon Heroes” (repo LechDutkiewicz/heroes). Uruchamiane po scaleniu wątku
ekonomii i trudności (W1).
Najpierw przeczytaj PROMPTY-WATKOW.md („Zasady wspólne”), STAN.md (sekcje
o AI: „Scalenie z AI przeciwnika”, „Znalezione w AI przy symulacji misji”,
wyniki symulacji) i src/data/wrog-ai.ts — przeciwnik z bohaterem JUŻ istnieje
(wychodzi z zamku, zbiera, walczy, naciera). Zadanie to go pogłębić, nie
napisać od nowa.

Najpierw audyt: puść symulacje na każdej planszy i spisz, co bohater wroga
robi dzień po dniu (mapa ruchów, cele, walki, straty). Porównaj z tym, jak gra
AI w Heroes 3: zajmuje kopalnie, bije neutralne straże, gdy ma przewagę,
omija za silne, wraca bronić zamku, ucieka przed silniejszym bohaterem,
dokupuje armię co tydzień, czasem wystawia drugiego bohatera. Zapisz listę
zachowań z mierzalnym testem dla każdego (scenariusz w sondzie → oczekiwane
zachowanie).

Pętla: po jednym zachowaniu naraz, builder implementuje, sonda scenariuszowa
sprawdza, symulacja misji pilnuje, że misje dalej dają się wygrać i przegrać
zgodnie z tabelą celów z W1. Osobny krytyk czyta dziennik ruchów SI z jednej
symulacji i ocenia, co wygląda głupio albo nieludzko — pętla trwa, dopóki
krytyk nie wskaże niczego poważnego. Widoczność: ruchy wroga w zasięgu wzroku
gracza mają być pokazane na mapie jak w HotA (krótko, z możliwością
przyspieszenia). Gauntlet wizualny tylko dla tej prezentacji ruchu, jeśli ją
zmieniasz.

Pracuj na własnej gałęzi i trzymaj się zasad Pages z pliku promptów.
```

## W3 — Ekran bitwy i bohater na polu bitwy

```
Temat: nowy wygląd ekranu bitwy i bohater widoczny w bitwie — w grze
„Pokemon Heroes” (repo LechDutkiewicz/heroes). Uruchamiane po scaleniu PR #7
(stworki, pozy, animacje bitewne).
Najpierw przeczytaj PROMPTY-WATKOW.md („Zasady wspólne”) i STAN.md (sekcje
„Storki w stylu mapy”, „HUD mapy przygody na wspólnym zestawie”, pętla
„gauntlet” mapy). Stwory i ich animacje są gotowe — nie przerabiaj ich.

Problem od gracza: ekran bitwy (tło, heksy, panele, kolejka, napisy) wyraźnie
odstaje od malowanej mapy przygody i nowego HUD-u z drewna i złota. Do tego
w Heroes bohater stoi przy polu bitwy i jego statystyki dodają się do
statystyk stworów — w podpowiedzi po najechaniu na stwora widać rozbicie
(ile z samego stwora, ile od bohatera). U nas premie z bohatera już działają
(`bonusGracza` w BattleScene, umiejętności z `umiejetnosci.ts`), ale bohatera
na ekranie nie ma, a rozbicia w podpowiedzi też nie.

Gauntlet. Poprzeczka: zrzuty bitew HoMM3/HotA
(`tools/reference/homm3/ref-bitwa-*.png`) i spójność z naszą mapą przygody.
Kawałki: tło pola bitwy per teren (malowane, z przeszkodami w stylu mapy),
siatka heksów i podświetlenia, panel dolny z dziennikiem i przyciskami,
kolejka tury, okno statystyk stwora z rozbiciem na bohatera, postać bohatera
przy krawędzi pola (z prostą animacją przy rzucie czaru — przyda się W5).
Dla każdego kawałka builder i osobny krytyk na ślepo, A/B z HotA w tej samej
skali, z klauzulą o stylu. Zanim zaczniesz szlifować kawałek, który przegrywa
3 rundy z rzędu, zrób test kontrolny (patrz zasady wspólne). Rozbicie
statystyk sprawdź też sondą: liczby w podpowiedzi = liczby, których używa
silnik walki.

Grafiki przez OpenAI — ustal budżet z graczem na starcie. Pracuj na własnej
gałęzi i trzymaj się zasad Pages z pliku promptów.
```

## W4 — Ewolucje: siedliska w mieście i budynek na mapie

```
Temat: linie ewolucyjne stworków, rozbudowa siedlisk w miastach i budynek
ewolucji na mapie — w grze „Pokemon Heroes” (repo LechDutkiewicz/heroes).
Uruchamiane po scaleniu PR #7.
Najpierw przeczytaj PROMPTY-WATKOW.md („Zasady wspólne”), STAN.md i kod
ewolucji z PR #6 (src/data/ewolucje.ts, sprite'y 01xxx/02xxx w public/sprites,
oknoStworka.ts, panelArmii.ts, TownScene.ts) — część jest JUŻ zrobiona.

Najpierw audyt: co już działa (etapy, koszt w kamieniach ewolucji i jagodach,
statystyki etapów, AI), a czego brakuje w stosunku do Heroes 3, gdzie każde
siedlisko ma ulepszenie odblokowujące mocniejszą wersję stwora, a ulepszone
stwory da się też ulepszyć na mapie (Wzgórze/Twierdza ulepszeń za opłatą).
Spisz listę braków z testem dla każdego.

Potem zrób: ulepszenia siedlisk w drzewku budynków miasta (ceny i czas
rozbudowy zgodne z ekonomią z W1, jeśli już scalona — inaczej zostaw stałe
w jednym miejscu, żeby W1 mogła je stroić), rekrutacja ewoluowanych form,
budynek na mapie ewoluujący stworki za opłatą (okno z wyborem oddziałów,
podgląd przed i po, zgodne z nowym HUD-em), portrety dla wszystkich etapów
(`tools/stworki_portrety.py`), pozy do bitwy dla etapów (wygięte za darmo
przez `--pozy-z-mistrza` albo malowane — budżet z graczem). Sondy: drzewko
budynków (`probe-zamki.ts`), rozbudowa klikaniem (`probe-rozbudowa.mjs`),
budynek na mapie (`probe-budowle.ts`), dopisz sondę ewolucji.

Gauntlet dla grafiki: nowe bryły siedlisk w panoramie miasta i budynek na
mapie — A/B z HotA (ekrany miast `ref-portret-miasto-*`, budynki mapy) i
spójność z naszą panoramą miasta i mapą; klauzula o stylu; test kontrolny,
gdy przegrywa 3 rundy z rzędu.

Pracuj na własnej gałęzi i trzymaj się zasad Pages z pliku promptów.
```

## W5 — Gildia i zaklęcia

```
Temat: odpowiednik gildii magów i rzucanie zaklęć na mapie i w bitwie —
w grze „Pokemon Heroes” (repo LechDutkiewicz/heroes). Uruchamiane po scaleniu
wątku ekranu bitwy (W3).
Najpierw przeczytaj PROMPTY-WATKOW.md („Zasady wspólne”) i STAN.md.

Krok 1 — projekt, zanim powstanie kod. Zaproponuj graczowi 2–3 koncepcje,
jak zaklęcia pasują do świata trenerów i stworków (nazwy nie mogą być
znakami towarowymi Pokemon). Punkt wyjścia do rozważenia: w świecie trenerów
„czarami” mogą być ruchy terenowe i przedmioty — na mapie np. lot do
odwiedzonego miasta (jak Town Portal), przejście przez wodę, rozświetlenie
mgły, kopanie tunelu; w bitwie rozkazy trenera i przedmioty (leczenie,
wzmocnienie ataku lub obrony, osłabienie wroga, przyspieszenie). Budynek
w mieście (np. „Akademia trenerów” z poziomami jak gildia magów) uczy
nowych ruchów; bohater ma punkty „energii” zamiast many, odnawiane co dzień;
szkoła żywiołów może iść za trzema typami stworków (ogień, woda, trawa).
Pokaż koncepcje z przykładową listą 10–12 zaklęć i ich balansem, zapytaj
gracza, którą wybrać. Nie buduj przed jego decyzją.

Krok 2 — wykonanie wybranej koncepcji: budynek w drzewku miasta (probe-zamki),
księga zaklęć bohatera (okno w stylu HUD-u), rzucanie na mapie
(sonda przygody), rzucanie w bitwie z animacją bohatera z W3 i efektami
(sonda bitwy: efekt liczbowy = to, co pokazuje okno), SI przeciwnika używa
zaklęć (proste reguły), balans w symulacjach (`npm run balans`,
`tools/symulacja-misji.ts` — tabela celów z W1 dalej ma być spełniona).

Gauntlet dla okien i efektów: księga zaklęć i efekty w bitwie A/B z HotA
(zrzuty księgi zaklęć i efektów ściągnij do tools/reference/homm3/ jak
pozostałe wzorce — źródła w ZRODLA.md), klauzula o stylu, test kontrolny
przy 3 przegranych z rzędu. Grafiki przez OpenAI — budżet z graczem.

Pracuj na własnej gałęzi i trzymaj się zasad Pages z pliku promptów.
```
