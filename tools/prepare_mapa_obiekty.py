#!/usr/bin/env python3
"""Wycina z arkusza sprite'y na mapę przygody: drzewa, głazy, kryształy, budynki.

Dlaczego osobne pliki, a nie klatki arkusza
-------------------------------------------
Arkusz jest siatką 16 × 16, a drzewo ma 16 × 48 i stoi w niej rozbite na trzy
klatki. Rysowanie takiego drzewa z trzech klatek to trzy obiekty do ustawiania
i trzy okazje, żeby coś się rozjechało o piksel. Wycięte sprite'y są jednym
obrazkiem, który stawia się jednym `setOrigin` — i widać je w katalogu, więc
da się sprawdzić, czy wycięcie jest tym, czym miało być.

Granice bierzemy ze spójnych plam nieprzezroczystości, a nie z ręcznie
wpisanych współrzędnych: przy ręcznym wpisywaniu pierwsze podejście do
przeszkód bitewnych wycięło pół korony sąsiedniego drzewa i wyszło to dopiero
na zrzucie.

    python3 tools/prepare_mapa_obiekty.py
"""

from pathlib import Path

import numpy as np
from PIL import Image

KORZEN = Path(__file__).resolve().parent.parent
ARKUSZ = KORZEN / 'public' / 'mapa-tileset.png'
KATALOG = KORZEN / 'public' / 'mapa'

S = 16
im = Image.open(ARKUSZ).convert('RGBA')
alfa = np.array(im)[:, :, 3] > 20


def plamy(c0, r0, c1, r1):
    """Spójne plamy nieprzezroczystości w podanym prostokącie kafelków.

    Zwraca prostokąty w pikselach, uporządkowane od lewej. Sąsiedztwo ośmiu
    pikseli, bo cienkie gałązki potrafią stykać się tylko po skosie.
    """
    x0, y0, x1, y1 = c0 * S, r0 * S, (c1 + 1) * S, (r1 + 1) * S
    maska = alfa[y0:y1, x0:x1].copy()
    h, w = maska.shape
    widziane = np.zeros_like(maska)
    wynik = []
    for sy in range(h):
        for sx in range(w):
            if not maska[sy, sx] or widziane[sy, sx]:
                continue
            stos = [(sy, sx)]
            widziane[sy, sx] = True
            miny = maxy = sy
            minx = maxx = sx
            while stos:
                y, x = stos.pop()
                miny, maxy = min(miny, y), max(maxy, y)
                minx, maxx = min(minx, x), max(maxx, x)
                for dy in (-1, 0, 1):
                    for dx in (-1, 0, 1):
                        ny, nx = y + dy, x + dx
                        if 0 <= ny < h and 0 <= nx < w and maska[ny, nx] and not widziane[ny, nx]:
                            widziane[ny, nx] = True
                            stos.append((ny, nx))
            if (maxx - minx + 1) * (maxy - miny + 1) >= 40:
                wynik.append((x0 + minx, y0 + miny, x0 + maxx + 1, y0 + maxy + 1))
    wynik.sort(key=lambda b: (b[0], b[1]))
    return wynik


def zapisz(nazwa, prostokat):
    KATALOG.mkdir(parents=True, exist_ok=True)
    wyc = im.crop(prostokat)
    wyc.save(KATALOG / f'{nazwa}.png')
    print(f'  {nazwa}.png  {wyc.width} × {wyc.height}')


def kafle(c0, r0, c1, r1):
    return (c0 * S, r0 * S, (c1 + 1) * S, (r1 + 1) * S)


# Drzewa stykają się w arkuszu koronami, więc szukanie plam skleiło je w jedną
# kanciapę 96 × 96. Tutaj prostokąty są wpisane — ale odczytane z powiększenia
# arkusza z siatką, nie zgadnięte, i każde ma pod sobą wtopiony cień, dzięki
# czemu stoją na trawie bez dorysowywania czegokolwiek.
print('drzewa (rzędy 19–24):')
for nazwa, r in {
    'sosna': kafle(0, 19, 1, 21),
    'sosna-mala': kafle(0, 22, 0, 23),
    'drzewo': kafle(1, 22, 2, 24),
    'sosna-zima': kafle(2, 19, 3, 21),
    'drzewo-zima': kafle(4, 22, 5, 24),
}.items():
    zapisz(nazwa, r)

print('głazy (rząd 0):')
for i, p in enumerate(plamy(12, 0, 17, 0)):
    zapisz(f'glaz-{i + 1}', p)

print('krzewy (rząd 0):')
for i, c in enumerate(range(3, 7)):
    zapisz(f'krzew-{i + 1}', kafle(c, 0, c, 0))

print('kryształy (rzędy 22–24):')
for i, p in enumerate(plamy(9, 22, 17, 24)):
    zapisz(f'krysztal-{i + 1}', p)

print('budynki:')
# Sale (gymy) z prawej połowy arkusza — posłużą za zamki. Granice odczytane
# z powiększenia z siatką: ośmiobok zaczyna się w kolumnie 30, a łuki wejścia
# kończą w wierszu 7.
for nazwa, r in {
    'zamek-las': kafle(30, 0, 36, 7),
    'zamek-ogien': kafle(38, 0, 44, 7),
}.items():
    zapisz(nazwa, r)
