#!/usr/bin/env python3
"""Składa arkusz chodu bohatera z czterech statycznych póz z modelu.

Dlaczego nie prosimy modelu o klatki chodu
------------------------------------------
Arkusz to cztery kierunki po cztery klatki, czyli szesnaście rysunków. Model
nie utrzyma przez tyle podejść jednej postaci — w połowie chodu zmienia jej
się kapelusz albo długość rękawa, a w ruchu widać to natychmiast. Prosimy więc
o CZTERY statyczne pozy, po jednej na kierunek, a ruch dokładamy tutaj:
podskok i lekkie ugięcie przy każdym kroku. Na sprite'ie wysokim na 55 px
czyta się to jak chód, a postać nie ma jak się rozjechać, bo rysunek jest
jeden.

Lewy profil odbijamy z prawego. Postać jest prawie symetryczna, więc odbicie
daje idealną zgodność za darmo — osobno wygenerowany lewy profil miałby inny
nos i inaczej zawiązany but, i przy zawracaniu widać by było przeskok.

Białe tło
---------
Prompt prosi o czyste białe tło, bo model rzadko oddaje prawdziwą
przezroczystość. Wycinamy je wypełnieniem od KRAWĘDZI kadru, a nie progiem na
całym obrazku: próg zjadłby też białe elementy samej postaci (koszulę, czubek
czapki), a wypełnienie od brzegu zatrzymuje się na pierwszym ciemniejszym
pikselu i sylwetki nie tyka.

    python3 tools/bohater_wczytaj.py
"""

from collections import deque
from pathlib import Path

import numpy as np
from PIL import Image

KORZEN = Path(__file__).resolve().parent.parent
WSAD = KORZEN / 'tools' / 'wsad'
CEL = KORZEN / 'public' / 'mapa' / 'bohater.png'

#: Bok jednej klatki. Musi zgadzać się z `BOHATER_KLATKA` w `AdventureScene`.
KLATKA = 96

#: Kolejność wierszy — z `KIERUNEK_WIERSZ` w `AdventureScene`.
WIERSZE = ['dol', 'lewo', 'prawo', 'gora']

#: Podskok w kolejnych klatkach, w pikselach klatki. Cztery klatki to pełny
#: krok: w dół, w górę, w dół, w górę — dlatego wzór wraca do zera.
PODSKOK = [0, -3, 0, -3]

#: Ugięcie: przy zetknięciu z ziemią postać jest ciut niższa i szersza.
#: Sam podskok bez tego wygląda, jakby ktoś przesuwał naklejkę w pionie.
UGIECIE = [1.0, 0.985, 1.0, 0.985]


def bezTla(im: Image.Image, prog: int = 232) -> Image.Image:
    """Usuwa jednolite jasne tło, idąc wypełnieniem od krawędzi kadru."""
    im = im.convert('RGBA')
    tab = np.asarray(im).copy()
    h, w = tab.shape[:2]
    jasny = tab[:, :, :3].min(axis=2) >= prog
    tlo = np.zeros((h, w), dtype=bool)
    kolejka = deque()
    for x in range(w):
        for y in (0, h - 1):
            if jasny[y, x] and not tlo[y, x]:
                tlo[y, x] = True
                kolejka.append((y, x))
    for y in range(h):
        for x in (0, w - 1):
            if jasny[y, x] and not tlo[y, x]:
                tlo[y, x] = True
                kolejka.append((y, x))
    while kolejka:
        y, x = kolejka.popleft()
        for dy, dx in ((1, 0), (-1, 0), (0, 1), (0, -1)):
            ny, nx = y + dy, x + dx
            if 0 <= ny < h and 0 <= nx < w and jasny[ny, nx] and not tlo[ny, nx]:
                tlo[ny, nx] = True
                kolejka.append((ny, nx))
    tab[tlo, 3] = 0
    return Image.fromarray(tab, 'RGBA')


def wczytaj(nazwa: str) -> Image.Image:
    im = Image.open(WSAD / f'{nazwa}.png')
    # Pliki bez kanału alfa mają tło do wycięcia; te z alfą model już wyciął.
    if im.mode != 'RGBA' or np.asarray(im.convert('RGBA'))[:, :, 3].min() == 255:
        im = bezTla(im)
    else:
        im = im.convert('RGBA')
    bbox = im.getbbox()
    return im.crop(bbox) if bbox else im


def poza(im: Image.Image, wysokosc: int) -> Image.Image:
    w = max(1, round(im.width * wysokosc / im.height))
    return im.resize((w, wysokosc), Image.LANCZOS)


if __name__ == '__main__':
    #: Ile z klatki zajmuje postać. Reszta to zapas na podskok i na to,
    #: że scena stawia sprite'a stopami na dolnej krawędzi klatki.
    wys = int(KLATKA * 0.86)

    zrodla = {k: wczytaj(f'bohater-{k}') for k in ('dol', 'gora', 'prawo')}
    zrodla['lewo'] = zrodla['prawo'].transpose(Image.FLIP_LEFT_RIGHT)

    arkusz = Image.new('RGBA', (KLATKA * 4, KLATKA * len(WIERSZE)), (0, 0, 0, 0))
    for r, kierunek in enumerate(WIERSZE):
        podstawa = poza(zrodla[kierunek], wys)
        for k in range(4):
            skala = UGIECIE[k]
            szer = max(1, round(podstawa.width / skala))
            wysK = max(1, round(podstawa.height * skala))
            klatka = podstawa.resize((szer, wysK), Image.LANCZOS)
            x = k * KLATKA + (KLATKA - klatka.width) // 2
            # Stopy na dolnej krawędzi klatki, minus podskok.
            y = (r + 1) * KLATKA - klatka.height - 2 + PODSKOK[k]
            arkusz.alpha_composite(klatka, (x, y))
    arkusz.save(CEL)
    print(f'  bohater.png  {arkusz.width} × {arkusz.height}  (4 × {len(WIERSZE)} klatek)')
