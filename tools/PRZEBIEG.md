# Przebieg: wsad z modelu → gra

Lista kroków od surowych obrazków w `tools/wsad/` do działającej gry.
**Ten plik jest stanem pracy, nie dokumentacją.** Każdy krok to osobny commit;
kolejna sesja (moja albo czyjakolwiek) czyta tę listę i wie, gdzie skończyliśmy,
nawet jeśli poprzednia urwała się w połowie.

Zasada: każdy krok da się puścić od nowa bez psucia niczego (skrypty nadpisują
swoje wyjście), a po każdym kroku **gra się uruchamia i da się w nią grać**.

## Stan wsadu

35 plików, wszystkie z prawdziwą przezroczystością (alfa), sprite'y 1254 × 1254,
tła i kotwice 1586 × 992.

Komplet jest pełny — piasek dogenerowany osobno.

Plik wgrany pierwotnie jako `teren-piasek.png` był w rzeczywistości ŚCIEŻKĄ — ubita ziemia
z koleinami, żwirem i kępkami trawy. Przemianowany na `teren-sciezka.png`.
Piasek (blady, drobny, z zafalowaniem od wiatru, bez trawy i bez kolein) trzeba
wygenerować osobno; te dwa tereny łatwo pomylić w opisie, a w grze robią co
innego: ścieżka jest tańsza od trawy, piasek droższy.

Brakuje jeszcze wariantów `teren-trawa-2/-3.png` (prośba o nie powstała po
wygenerowaniu reszty) — potrzebne dopiero w kroku 5, żeby trawa nie powtarzała
się widocznym wzorem.

## Kroki

- [x] **1. Wczytanie wsadu.** `tools/wsad_wczytaj.py`: przycięcie do sylwetki,
      zmniejszenie do rozmiarów docelowych, wypalenie cienia rzuconego,
      zapis do `public/miasto/` i `public/mapa/`. Bez dotykania kodu gry.
- [x] **2. Miasto na nowej grafice.** Podmiana panoramy i brył w `TownScene`:
      nowy horyzont i perspektywa pod kadr z kotwicy, koniec z marginesem
      na cień (nowe sprite'y go nie mają), sonda `probe-miasto` na zielono.
- [ ] **3. Zrzut i ocena.** `zrzut-miasto.mjs`, ślepe porównanie, wpis na
      stronie postępu.
- [x] **4. Frakcje.** `tools/frakcje_przemaluj.py`: jasność z Boru na rampę
      barwną frakcji plus ułamek pierwotnej chromy. Grota chłodna i księżycowa,
      Zbocze popielate z ciepłymi światłami. `TownScene` bierze bryły z frakcji.
- [x] **5. Teren mapy.** Koniec z arkuszem 16-pikselowym: `render_mapa.py`
      maluje teren wprost z tekstur 768 × 768, a granice krain wycina miękką,
      poszarpaną szumem maską (`teren_malowanie.py`). Ścieżka dostała własną
      teksturę zamiast dwóch kresek wektorowych. Sondy `probe-mapa`
      i `probe-przygoda` na zielono.
- [x] **6. Obiekty mapy.** Wszystkie cztery sylwetki skalne idą teraz z wsadu
      (`skala-2` i `kopiec-2` jako odbicia). Kępki trawy, kwiatki, kamyki
      i pniak — usunięte: tekstura trawy ma to wmalowane, a te sprite'y
      dokładały drugą warstwę, w dodatku starą techniką. Zostaje krzak, bo ma
      bryłę i cień. `palma` była martwa. Sondy `probe-klik` i `probe-przygoda`
      na zielono.
      Bohater dorobiony: `tools/bohater_wczytaj.py` składa arkusz 4 × 4 z trzech
      statycznych póz (lewy profil to odbicie prawego), a chód robi podskok
      i ugięcie w kolejnych klatkach. Białe tło wycinane wypełnieniem od
      krawędzi — próg na całym obrazku zjadłby białe części samej postaci.
- [x] **6a. Budowle odwiedzane.** Siedemnaście brył z wsadu weszło do gry:
      trzy kopalnie surowców (koniec z jedną przemalowaną na trzy barwy)
      i czternaście budowli odwiedzanych — od obozu treningowego po wóz
      kupca. Mechaniki opisuje jedna tablica (`BUDOWLE` w `src/data/mapa.ts`),
      rozstawia je `generuj_mape.py` ze strefą dom/wroga, a sprawdza
      `npx tsx tools/probe-budowle.ts`. Prompty, z których powstały grafiki,
      leżą w `tools/PROMPTY-BUDYNKI.md`.
- [ ] **7. Sprzątanie.** Usunięcie `rysuj_miasto.py` i `render3d.py`, jeśli nic
      z nich nie zostaje; wpis do STAN.md o pochodzeniu grafik.
      Po kroku 5 osierocone są też: `src/data/kafelki.ts`,
      `public/mapa-tileset.png`, `tools/kafelki_autotile.py`,
      `tools/slice_tileset.py`, `tools/prepare_terrain.py` — nic ich już
      nie czyta.

## Czego NIE robić po drodze

- nie ruszać sprite'ów stworków — 270 plików, to one wyznaczają styl;
- nie kasować `tools/wsad/` po wczytaniu; to jest źródło, z którego można
  przegenerować wszystko przy zmianie rozmiarów albo palety.
