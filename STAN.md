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

## W połowie

**Animacja lotu.** Kod jest napisany (unoszenie po sinusie, przechył, cień
zostający na ziemi) i wygląda poprawnie w kodzie, ale **nie jest zweryfikowany
obrazem**. Pasek klatek `tools/shots/05b-przejscie-latacz.png` jest za szeroko
wykadrowany — sylwetka wychodzi na nim kilkupikselowa i nie da się ocenić ani
przechyłu, ani falowania.

Do zrobienia: poprawić kadr w bloku „4c" w `tools/capture.mjs`. Latacz
przelatuje dłuższy dystans niż piechota, więc kadr musi być szerszy, ale wtedy
sylwetka maleje. Właściwe rozwiązanie to kadrowanie WOKÓŁ SPRITE'A w każdej
klatce z osobna, zamiast jednego wspólnego prostokąta na cały pasek.

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
