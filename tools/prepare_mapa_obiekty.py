#!/usr/bin/env python3
"""Wycina z pakietu i wygładza grafiki na mapę: drzewa, skały, zamki, bohatera.

Wszystko, co pochodzi z pakietu, przechodzi przez `wygladzanie.wygladz`, żeby
przestało być kanciastym pixel artem. Powód jest jeden i ten sam dla całego
ekranu: stworki, HUD i plansza bitewna są gładkie, więc teren i przeszkody
też muszą być — inaczej ekran wygląda na sklejony z dwóch gier.

Granice wycięć są odczytane z powiększenia arkusza z siatką (drzewa i sale
stykają się w arkuszu, więc szukanie spójnych plam skleja je w jedno).

    python3 tools/prepare_mapa_obiekty.py
"""

import sys
from pathlib import Path

from PIL import Image

sys.path.insert(0, str(Path(__file__).resolve().parent))
from wygladzanie import przytnij, wygladz  # noqa: E402

KORZEN = Path(__file__).resolve().parent.parent
KATALOG = KORZEN / 'public' / 'mapa'
ARKUSZ = KORZEN / 'public' / 'mapa-tileset.png'
POSTACIE = KORZEN / 'assets' / 'kit' / 'character overworld'

S = 16
arkusz = Image.open(ARKUSZ).convert('RGBA')


def kafle(c0, r0, c1, r1):
    return (c0 * S, r0 * S, (c1 + 1) * S, (r1 + 1) * S)


def zapisz(nazwa, im):
    KATALOG.mkdir(parents=True, exist_ok=True)
    im.save(KATALOG / f'{nazwa}.png')
    print(f'  {nazwa}.png  {im.width} × {im.height}')


print('drzewa i zamki z arkusza:')
for nazwa, r in {
    'sosna': kafle(0, 19, 1, 21),
    'sosna-mala': kafle(0, 22, 0, 23),
    'drzewo': kafle(1, 22, 2, 24),
    'zamek-las': kafle(30, 0, 36, 7),
    'zamek-ogien': kafle(38, 0, 43, 6),
}.items():
    zapisz(nazwa, przytnij(wygladz(arkusz.crop(r))))

# Cztery sylwetki skalne zamiast dwóch i trzy krzewy. Powód: pasmo górskie
# złożone z jednego powtarzanego kształtu czyta się jak tapeta, a nie jak góry.
# Przy czterech sylwetkach, odbiciu w poziomie i zmiennej skali to samo pasmo
# przestaje się powtarzać w widocznym rytmie.
print('skały i krzewy (te same sprite\'y, co przeszkody na planszy bitewnej):')
for nazwa, plik in {
    'skala': 'glaz.png',
    'skala-2': 'glaz_sniezny.png',
    'kopiec': 'kopiec.png',
    'kopiec-2': 'kopiec_sniezny.png',
    'krzak': 'krzak.png',
    'krzak-2': 'krzak_jesien.png',
    'palma': 'palma.png',
    'sosna-b': 'sosna.png',
    'drzewo-b': 'drzewo.png',
}.items():
    # Te sprite'y są już w skali ekranu i mają wtopiony pas trawy z planszy
    # bitewnej. Wygładzamy je bez powiększania — chodzi tylko o zmiękczenie
    # schodków, nie o zmianę rozmiaru.
    im = Image.open(KORZEN / 'public' / 'terrain' / 'obstacles' / plik).convert('RGBA')
    zapisz(nazwa, przytnij(wygladz(im, skala=1)))

# ---------- bohater ----------

#: Arkusz postaci to siatka 4 × 4 klatek po 32 px: wiersze to kierunki
#: (w dół, w lewo, w prawo, w górę), kolumny to klatki chodu.
KLATKA = 32
KIERUNKI = ['dol', 'lewo', 'prawo', 'gora']
#: Który plik. `ow1` to chłopak w czapce z plecakiem — czyli trener, a nie
#: stworek. Bohater grany przez Pokemona nie miał sensu: stworki są armią.
POSTAC = 'ow1.png'

print('bohater (trener):')
zrodlo = Image.open(POSTACIE / POSTAC).convert('RGBA')
# Każdą klatkę wygładzamy OSOBNO i dopiero potem składamy z powrotem w arkusz.
# Wygładzanie całego arkusza naraz przeciągnęłoby kolor z klatki do klatki —
# przy medianie o promieniu siedmiu pikseli sylwetki dosłownie by się zlały.
skala = 3
bok = KLATKA * skala
arkusz_bohatera = Image.new('RGBA', (bok * 4, bok * 4))
for wiersz in range(4):
    for kol in range(4):
        klatka = zrodlo.crop(
            (kol * KLATKA, wiersz * KLATKA, (kol + 1) * KLATKA, (wiersz + 1) * KLATKA)
        )
        arkusz_bohatera.paste(wygladz(klatka, skala), (kol * bok, wiersz * bok))
zapisz('bohater', arkusz_bohatera)
print(f'  klatka {bok} × {bok}, wiersze: {", ".join(KIERUNKI)}')
