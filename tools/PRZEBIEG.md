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
- [ ] **4. Frakcje.** Przemalowanie kompletu Boru na Grotę i Zbocze.
- [ ] **5. Teren mapy.** Pocięcie tekstur na kafelki, złożenie przejść,
      przegenerowanie tła planszy, sonda `probe-mapa`.
- [ ] **6. Obiekty mapy.** Podmiana drzew, skał, kopalni, sadu, skrzyni,
      zamku i czterech surowców; sondy `probe-klik` i `probe-przygoda`.
- [ ] **7. Sprzątanie.** Usunięcie `rysuj_miasto.py` i `render3d.py`, jeśli nic
      z nich nie zostaje; wpis do STAN.md o pochodzeniu grafik.

## Czego NIE robić po drodze

- nie ruszać sprite'ów stworków — 270 plików, to one wyznaczają styl;
- nie kasować `tools/wsad/` po wczytaniu; to jest źródło, z którego można
  przegenerować wszystko przy zmianie rozmiarów albo palety.
