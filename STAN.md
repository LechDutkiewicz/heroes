# Stan prac — notatka na wznowienie

Ostatnia aktualizacja: 2026-08-09.

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

## W połowie

Nic. Animacja lotu, ostatnia pozycja z tej listy, jest domknięta — patrz niżej,
co przy okazji wyszło.

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
