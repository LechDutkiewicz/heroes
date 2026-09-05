#!/usr/bin/env python3
"""Skleja kępy lasu i skalne zwały z pojedynczych sprite'ów, które już mamy.

Po co
-----
Mapa stawiała jedno drzewo albo jedną skałę na jedno pole. Przy paśmie gór
wychodziła z tego tapeta: te same cztery sylwetki w regularnym rytmie, jedna
obok drugiej, każda w swoim kwadracie. W Heroes 3 las i góry to obiekty
WIELOPOLOWE — kawałek lasu, zwał skalny — i dlatego czytają się jak teren,
a nie jak rząd doniczek.

Nie mamy takich rysunków z modelu i nie trzeba ich mieć: kępę da się złożyć
z tego, co jest. Kilka drzew o różnej wielkości, poprzesuwanych i poodbijanych,
ustawionych od tyłu do przodu, daje bryłę, w której nie widać pojedynczych
elementów — dokładnie tak, jak buduje się takie obiekty ręcznie.

Co powstaje
-----------
`public/mapa/kepa-las-N.png` i `kepa-skaly-N.png` — każda na 3 × 2 polach.
Scena pokrywa nimi zwarte obszary lasu i skał, a pojedynczymi sprite'ami
uzupełnia dopiero to, co zostanie na brzegach.

    python3 tools/kepy.py
"""

import random
from pathlib import Path

import numpy as np

from PIL import Image, ImageFilter

KORZEN = Path(__file__).resolve().parent.parent
MAPA = KORZEN / 'public' / 'mapa'

#: Bok pola w pikselach — ten sam, co `KAFEL` w scenie.
KAFEL = 48

#: Rozmiar kępy w polach.
SZER, WYS = 3, 2

#: Ile kęp każdego rodzaju. Cztery wystarczą: przy dwóch rozmiarach obrotu
#: (odbicie w scenie) daje to osiem widocznych sylwetek na obszar, a więcej
#: plików nie poprawia już niczego, co widać.
ILE = 4

ZIARNO = 20260906

#: Skład kępy: (pliki do losowania, ile sztuk, zakres wysokości w polach).
SKLAD = {
    'las': ([['drzewo', 'sosna', 'drzewo-b', 'sosna-b'], ['sosna-mala', 'krzak', 'krzak-2']],
            [(5, 7, 1.15, 1.5), (3, 5, 0.45, 0.7)]),
    # Skał musi być DUŻO i muszą na siebie zachodzić. Kilka osobnych głazów
    # w odstępach to nie jest zwał skalny, tylko kamienie na łące — a pasmo
    # górskie ma być przeszkodą, po której widać, że się jej nie przejdzie.
    'skaly': ([['skala', 'skala-2', 'kopiec', 'kopiec-2'], ['kopiec', 'kopiec-2']],
              [(9, 12, 0.7, 1.55), (6, 9, 0.4, 0.75)]),
}


def wczytaj(nazwa: str) -> Image.Image:
    return Image.open(MAPA / f'{nazwa}.png').convert('RGBA')


def cien(bok: int) -> Image.Image:
    """Miękka plama pod element — ta sama zasada, co w scenie: bez ostrej krawędzi."""
    im = Image.new('L', (bok, bok // 2), 0)
    from PIL import ImageDraw

    d = ImageDraw.Draw(im)
    for i in range(24, 0, -1):
        t = i / 24
        d.ellipse(
            [bok / 2 * (1 - t), bok / 4 * (1 - t), bok / 2 * (1 + t), bok / 4 * (1 + t)],
            fill=min(255, int(190 * (1 - t) * (1 - t))),
        )
    return im.filter(ImageFilter.GaussianBlur(bok * 0.05))


def zbudujKepe(rodzaj: str, ziarno: int) -> Image.Image:
    rng = random.Random(ziarno)
    pliki, warstwy = SKLAD[rodzaj]
    # Płótno z zapasem: drzewa wystają ponad pole, na którym stoją, a podstawy
    # rozrzucamy nieco poza obrys, żeby kępa miała postrzępiony brzeg. Bez
    # zapasu skrajne elementy byłyby ucięte pionową kreską.
    zapas = KAFEL
    w = SZER * KAFEL + 2 * zapas
    h = WYS * KAFEL + 120
    plotno = Image.new('RGBA', (w, h), (0, 0, 0, 0))

    elementy = []
    for lista, (minIle, maxIle, minWys, maxWys) in zip(pliki, warstwy):
        for _ in range(rng.randint(minIle, maxIle)):
            nazwa = rng.choice(lista)
            wys = rng.uniform(minWys, maxWys) * KAFEL
            # Podstawy rozrzucone po CAŁYM obrysie, także poza jego brzegiem:
            # kępa ma mieć postrzępiony zarys, a nie kończyć się na prostej.
            bx = zapas + rng.uniform(-0.08, 1.08) * (SZER * KAFEL)
            by = rng.uniform(0.1, 1.0) * (WYS * KAFEL) + (h - WYS * KAFEL)
            elementy.append((by, nazwa, wys, bx, rng.random() < 0.5))

    # Od tyłu do przodu — inaczej mniejsze, bliższe elementy chowają się za
    # dalszymi i cała bryła się rozpada.
    for by, nazwa, wys, bx, odbij in sorted(elementy):
        im = wczytaj(nazwa)
        skala = wys / im.height
        im = im.resize((max(1, round(im.width * skala)), max(1, round(wys))), Image.LANCZOS)
        if odbij:
            im = im.transpose(Image.FLIP_LEFT_RIGHT)
        # Drobna zmiana jasności każdego elementu.
        #
        # Wszystkie cztery „sylwetki" skał pochodzą z JEDNEGO pliku (są jego
        # odbiciami i zmniejszeniami), więc bez tego zwał jest tym samym
        # głazem odbitym kilkanaście razy i widać to mimo różnych rozmiarów.
        # Kilkanaście procent w górę i w dół wystarczy, żeby oko przestało
        # rozpoznawać powtórzenie, a bryła nadal jest z tego samego kamienia.
        jasnosc = rng.uniform(0.86, 1.14)
        tab = np.asarray(im).astype(np.float32)
        tab[..., :3] = (tab[..., :3] * jasnosc).clip(0, 255)
        im = Image.fromarray(tab.astype(np.uint8), 'RGBA')
        # Cień kontaktowy pod każdym elementem — to on skleja je w jedną masę
        # zamiast rzędu wyciętych sylwetek.
        c = cien(max(8, round(im.width * 1.1)))
        maska = Image.new('RGBA', c.size, (24, 30, 24, 255))
        maska.putalpha(c)
        plotno.alpha_composite(maska, (round(bx - c.width / 2), round(by - c.height * 0.6)))
        plotno.alpha_composite(im, (round(bx - im.width / 2), round(by - im.height)))

    return plotno


if __name__ == '__main__':
    for rodzaj in SKLAD:
        for n in range(1, ILE + 1):
            kepa = zbudujKepe(rodzaj, ZIARNO + hash(rodzaj) % 1000 + n * 17)
            kepa.save(MAPA / f'kepa-{rodzaj}-{n}.png')
        print(f'  kepa-{rodzaj}-1..{ILE}.png  {SZER} × {WYS} pól')
