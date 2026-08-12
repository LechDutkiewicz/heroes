#!/usr/bin/env python3
"""Rysuje obiekty mapy, których w arkuszu nie ma: drewno, kamień, skrzynię, tartak.

Arkusz `mpwsp01` ma tereny, drzewa, głazy, kryształy i budynki, ale nie ma
stosu drewna ani bryły kamienia — a to dwa z czterech surowców. Zamiast
podstawiać coś, co znaczy co innego (kryształ w roli drewna), rysujemy je tu.

Rysunek jest w skali 1 : 1 z arkuszem, czyli w pikselach 16-bitowych: gra
powiększa trzykrotnie, więc każdy piksel postawiony tutaj to kwadrat 3 × 3 na
ekranie. Paleta jest zdjęta z arkusza (te same brązy co pnie drzew, te same
szarości co głazy), żeby dorysowane obiekty nie odcinały się stylem.

    python3 tools/rysuj_obiekty_mapy.py
"""

from pathlib import Path

from PIL import Image, ImageDraw

KORZEN = Path(__file__).resolve().parent.parent
KATALOG = KORZEN / 'public' / 'mapa'

# Paleta z arkusza: brąz pni, szarość głazów, złoto, cień.
BRAZ_C = (122, 74, 33, 255)
BRAZ = (176, 110, 48, 255)
BRAZ_J = (222, 165, 96, 255)
SZARY_C = (94, 103, 114, 255)
SZARY = (140, 150, 162, 255)
SZARY_J = (198, 208, 220, 255)
ZLOTO = (255, 201, 60, 255)
ZLOTO_C = (198, 140, 20, 255)
CZERWIEN = (196, 66, 62, 255)
CZERWIEN_C = (140, 40, 40, 255)
CIEN = (0, 0, 0, 60)


def plotno(w=24, h=22):
    return Image.new('RGBA', (w, h), (0, 0, 0, 0))


def cien(d, cx, cy, rx=9, ry=3):
    """Wtopiona elipsa cienia. Bez niej obiekt wygląda, jakby wisiał nad trawą."""
    d.ellipse([cx - rx, cy - ry, cx + rx, cy + ry], fill=CIEN)


def kloc(d, x, y, w, h, jasny, sredni, ciemny):
    """Klocek z fazowaniem: jasna góra, średni bok, ciemny spód."""
    d.rectangle([x, y, x + w - 1, y + h - 1], fill=sredni)
    d.rectangle([x, y, x + w - 1, y], fill=jasny)
    d.rectangle([x, y + h - 1, x + w - 1, y + h - 1], fill=ciemny)
    d.rectangle([x + w - 1, y, x + w - 1, y + h - 1], fill=ciemny)


def drewno():
    im = plotno()
    d = ImageDraw.Draw(im)
    cien(d, 12, 19)
    # Trzy kłody widziane od czoła: dwie na dole, jedna w zagłębieniu na górze.
    for cx, cy in ((7, 14), (17, 14), (12, 8)):
        d.ellipse([cx - 6, cy - 5, cx + 6, cy + 5], fill=BRAZ_C)
        d.ellipse([cx - 5, cy - 4, cx + 5, cy + 4], fill=BRAZ)
        d.ellipse([cx - 3, cy - 2, cx + 3, cy + 2], fill=BRAZ_J)
        d.ellipse([cx - 1, cy - 1, cx + 1, cy + 1], fill=BRAZ_C)
    return im


def kamien():
    im = plotno()
    d = ImageDraw.Draw(im)
    cien(d, 12, 19)
    kloc(d, 3, 11, 9, 7, SZARY_J, SZARY, SZARY_C)
    kloc(d, 12, 12, 9, 6, SZARY_J, SZARY, SZARY_C)
    kloc(d, 8, 5, 9, 7, SZARY_J, SZARY, SZARY_C)
    return im


def skrzynia():
    im = plotno()
    d = ImageDraw.Draw(im)
    cien(d, 12, 19)
    # Wieko osobno od korpusu — inaczej skrzynia czyta się jak zwykłe pudełko.
    kloc(d, 4, 11, 16, 7, BRAZ_J, BRAZ, BRAZ_C)
    kloc(d, 4, 6, 16, 5, BRAZ_J, BRAZ, BRAZ_C)
    d.rectangle([4, 10, 19, 11], fill=ZLOTO_C)
    d.rectangle([4, 6, 19, 6], fill=ZLOTO)
    d.rectangle([10, 9, 13, 13], fill=ZLOTO)
    d.rectangle([11, 11, 12, 12], fill=ZLOTO_C)
    return im


def tartak():
    im = plotno(26, 26)
    d = ImageDraw.Draw(im)
    cien(d, 13, 23, 11, 3)
    # Chata: ściany z bali, czerwony dach, obok kłoda — żeby na minimapie
    # i z odległości było widać, że to budynek, a nie stos surowca.
    kloc(d, 5, 13, 15, 9, BRAZ_J, BRAZ, BRAZ_C)
    for y in (15, 18):
        d.rectangle([5, y, 19, y], fill=BRAZ_C)
    d.polygon([(3, 13), (12, 4), (21, 13)], fill=CZERWIEN)
    d.polygon([(5, 13), (12, 6), (19, 13)], fill=CZERWIEN)
    d.line([(3, 13), (12, 4)], fill=CZERWIEN_C)
    d.line([(12, 4), (21, 13)], fill=CZERWIEN_C)
    d.rectangle([10, 17, 14, 22], fill=BRAZ_C)
    cx, cy = 22, 19
    d.ellipse([cx - 4, cy - 3, cx + 4, cy + 3], fill=BRAZ_C)
    d.ellipse([cx - 3, cy - 2, cx + 3, cy + 2], fill=BRAZ_J)
    return im


ZIELEN_C = (76, 122, 42, 255)
ZIELEN = (120, 168, 54, 255)
ZIELEN_J = (170, 206, 84, 255)
KWIAT_A = (240, 110, 130, 255)
KWIAT_B = (250, 220, 110, 255)


def kepka():
    """Kępka trawy. Sama trawa z arkusza jest gładka; bez takich kępek pole
    bez obiektu wygląda jak niedokończone tło."""
    im = plotno(14, 10)
    d = ImageDraw.Draw(im)
    for x, h, kolor in ((2, 5, ZIELEN_C), (4, 8, ZIELEN), (6, 6, ZIELEN_J),
                        (8, 8, ZIELEN), (10, 4, ZIELEN_C)):
        d.line([(x, 9), (x + 1, 9 - h)], fill=kolor)
        d.point((x + 1, 9 - h), fill=ZIELEN_J)
    return im


def kwiaty():
    im = plotno(14, 10)
    d = ImageDraw.Draw(im)
    for x, h in ((2, 5), (6, 7), (10, 4)):
        d.line([(x, 9), (x, 9 - h)], fill=ZIELEN_C)
    for (x, y), kolor in ((((3, 4)), KWIAT_A), (((6, 2)), KWIAT_B), (((10, 5)), KWIAT_A)):
        d.rectangle([x - 1, y, x + 1, y + 1], fill=kolor)
        d.point((x, y), fill=(255, 255, 255, 255))
    return im


for nazwa, rys in {
    'kepka': kepka,
    'kwiaty': kwiaty,
    'drewno': drewno,
    'kamien': kamien,
    'skrzynia': skrzynia,
    'tartak': tartak,
}.items():
    KATALOG.mkdir(parents=True, exist_ok=True)
    im = rys()
    im.save(KATALOG / f'{nazwa}.png')
    print(f'  {nazwa}.png  {im.width} × {im.height}')
