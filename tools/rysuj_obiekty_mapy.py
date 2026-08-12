#!/usr/bin/env python3
"""Rysuje obiekty mapy: surowce, budynki produkcyjne, ozdoby.

Czemu rysowane, a nie wycięte z arkusza
---------------------------------------
Surowce w tej grze są pokemonowe — pokeball, jagoda, kamień ewolucji, odłamek
— a arkusz `mpwsp01` ma tereny i budynki, nie surowce. Podstawianie czegoś,
co znaczy co innego (kryształ w roli jagody) kończy się tym, że dziecko pyta,
czemu zbiera kwiatek.

Czemu w docelowej rozdzielczości, a nie 16 px
---------------------------------------------
Pierwsza wersja rysowała te obiekty w skali arkusza i powiększała trzykrotnie.
Po włączeniu wygładzania okazało się, że filtr medianowy zjada im detal:
skrzynia gubiła okucia, tartak gubił bale. Cecha szeroka na trzy piksele
źródła po prostu nie przetrwa. Dlatego rysujemy od razu w docelowym rozmiarze,
z nadpróbkowaniem — kształty wychodzą gładkie tak samo jak teren, a detal
zostaje.

    python3 tools/rysuj_obiekty_mapy.py
"""

from pathlib import Path

from PIL import Image, ImageDraw

KORZEN = Path(__file__).resolve().parent.parent
KATALOG = KORZEN / 'public' / 'mapa'

#: Nadpróbkowanie. Rysujemy N razy większe i zmniejszamy — inaczej okrągłe
#: kształty mają schodkowe brzegi, czyli to, co właśnie usuwamy z terenu.
NAD = 4
#: Bok pola na ekranie. Rozmiary obiektów podajemy jako ułamek pola.
KAFEL = 48

# Paleta trzymana blisko arkusza, żeby dorysowane obiekty nie odcinały się
# stylem od terenu i drzew.
BRAZ_C = (112, 68, 32)
BRAZ = (170, 108, 50)
BRAZ_J = (222, 168, 100)
SZARY_C = (88, 96, 108)
SZARY = (140, 150, 162)
SZARY_J = (206, 216, 228)
BIEL = (250, 252, 255)
CZERWIEN = (222, 62, 58)
CZERWIEN_C = (150, 34, 36)
ZIELEN_C = (54, 108, 52)
ZIELEN = (92, 168, 78)
ZIELEN_J = (162, 214, 120)
LIST = (74, 148, 66)
FIOLET = (150, 96, 210)
FIOLET_J = (196, 158, 246)
BLEKIT = (86, 190, 232)
BLEKIT_J = (176, 232, 250)
ZLOTO = (250, 198, 62)
CIEN = (0, 0, 0, 64)


class Rys:
    """Płótno z nadpróbkowaniem. Współrzędne podaje się w pikselach docelowych."""

    def __init__(self, w, h):
        self.w, self.h = w, h
        self.im = Image.new('RGBA', (w * NAD, h * NAD), (0, 0, 0, 0))
        self.d = ImageDraw.Draw(self.im)

    def _s(self, xy):
        return [v * NAD for v in xy]

    def elipsa(self, xy, **kw):
        self.d.ellipse(self._s(xy), **kw)

    def prost(self, xy, **kw):
        self.d.rectangle(self._s(xy), **kw)

    def wielokat(self, punkty, **kw):
        self.d.polygon([(x * NAD, y * NAD) for x, y in punkty], **kw)

    def luk(self, xy, od, do, **kw):
        self.d.pieslice(self._s(xy), od, do, **kw)

    def cien(self, cx, cy, rx, ry):
        """Wtopiona elipsa cienia — bez niej obiekt wisi nad trawą."""
        self.elipsa([cx - rx, cy - ry, cx + rx, cy + ry], fill=CIEN)

    def gotowe(self):
        return self.im.resize((self.w, self.h), Image.LANCZOS)


def kula(r: Rys, cx, cy, promien, jasny, ciemny):
    """Kulka z jednym światłem i cieniem. Trzy warstwy wystarczą, żeby czytała
    się jako bryła — więcej stopni na tym rozmiarze i tak zlewa się w gradient."""
    r.elipsa([cx - promien, cy - promien, cx + promien, cy + promien], fill=ciemny)
    r.elipsa([cx - promien * 0.86, cy - promien * 0.92, cx + promien * 0.86, cy + promien * 0.8],
             fill=jasny)
    r.elipsa([cx - promien * 0.34, cy - promien * 0.62, cx - promien * 0.02, cy - promien * 0.28],
             fill=(255, 255, 255, 190))


# ---------- surowce ----------


def pokeball():
    """Waluta. Kupujesz nim stworki, więc to on zastąpił złoto."""
    b = int(KAFEL * 0.62)
    r = Rys(b, b)
    c = b / 2
    p = b * 0.42
    r.cien(c, b - p * 0.28, p * 0.92, p * 0.3)
    # Dolna połowa biała, górna czerwona, pasek i przycisk pośrodku.
    r.elipsa([c - p, c - p, c + p, c + p], fill=BIEL)
    r.luk([c - p, c - p, c + p, c + p], 180, 360, fill=CZERWIEN)
    r.prost([c - p, c - p * 0.14, c + p, c + p * 0.14], fill=(38, 40, 48))
    r.elipsa([c - p * 0.34, c - p * 0.34, c + p * 0.34, c + p * 0.34], fill=(38, 40, 48))
    r.elipsa([c - p * 0.22, c - p * 0.22, c + p * 0.22, c + p * 0.22], fill=BIEL)
    r.elipsa([c - p * 0.62, c - p * 0.72, c - p * 0.2, c - p * 0.34], fill=(255, 255, 255, 150))
    return r.gotowe()


def jagody():
    """Jedzenie dla oddziałów. W bajce jagody są wszędzie i każde dziecko wie,
    do czego służą — więc nie trzeba tłumaczyć, po co się je zbiera."""
    b = int(KAFEL * 0.66)
    r = Rys(b, b)
    r.cien(b / 2, b * 0.86, b * 0.34, b * 0.09)
    # Liść pod spodem, potem trzy jagody — dwie z tyłu, jedna z przodu.
    r.wielokat([(b * 0.5, b * 0.3), (b * 0.9, b * 0.16), (b * 0.72, b * 0.44)], fill=LIST)
    r.wielokat([(b * 0.5, b * 0.3), (b * 0.16, b * 0.2), (b * 0.34, b * 0.46)], fill=ZIELEN_C)
    kula(r, b * 0.33, b * 0.6, b * 0.2, CZERWIEN, CZERWIEN_C)
    kula(r, b * 0.68, b * 0.58, b * 0.19, CZERWIEN, CZERWIEN_C)
    kula(r, b * 0.5, b * 0.74, b * 0.22, CZERWIEN, CZERWIEN_C)
    return r.gotowe()


def kamien_ewolucji():
    """Rzadki surowiec na ulepszanie oddziałów. Kamienie ewolucji w bajce robią
    dokładnie to samo, więc znaczenie jest z góry znane."""
    b = int(KAFEL * 0.62)
    r = Rys(b, b)
    r.cien(b / 2, b * 0.88, b * 0.3, b * 0.08)
    # Szlif: górna piramidka i dolny stożek, każdy z jaśniejszą ścianką.
    gora, dol = b * 0.16, b * 0.86
    r.wielokat([(b * 0.5, gora), (b * 0.86, b * 0.44), (b * 0.5, dol), (b * 0.14, b * 0.44)],
               fill=FIOLET)
    r.wielokat([(b * 0.5, gora), (b * 0.5, dol), (b * 0.14, b * 0.44)], fill=FIOLET_J)
    r.wielokat([(b * 0.5, gora), (b * 0.68, b * 0.44), (b * 0.5, b * 0.56), (b * 0.32, b * 0.44)],
               fill=(255, 255, 255, 120))
    return r.gotowe()


def odlamki():
    """Materiał na rozbudowę zamku. Odłamki są w grach Pokemon i nie kolidują
    znaczeniem z kamieniem ewolucji — tamten ulepsza stworki, ten buduje."""
    b = int(KAFEL * 0.64)
    r = Rys(b, b)
    r.cien(b / 2, b * 0.87, b * 0.32, b * 0.08)
    for cx, cy, s, jasny, ciemny in (
        (0.34, 0.62, 0.9, BLEKIT_J, BLEKIT),
        (0.66, 0.58, 0.8, BLEKIT_J, BLEKIT),
        (0.5, 0.78, 1.0, BLEKIT_J, BLEKIT),
    ):
        w = b * 0.15 * s
        h = b * 0.26 * s
        r.wielokat([(b * cx, b * cy - h), (b * cx + w, b * cy), (b * cx, b * cy + h * 0.5),
                    (b * cx - w, b * cy)], fill=ciemny)
        r.wielokat([(b * cx, b * cy - h), (b * cx, b * cy + h * 0.5), (b * cx - w, b * cy)],
                   fill=jasny)
    return r.gotowe()


# ---------- budynki ----------


def _chata(r, b, dach, dach_c):
    """Wspólny kadłub budynku produkcyjnego: ściany z bali i dwuspadowy dach."""
    r.cien(b * 0.5, b * 0.93, b * 0.38, b * 0.09)
    r.prost([b * 0.2, b * 0.5, b * 0.8, b * 0.9], fill=BRAZ)
    for i in range(3):
        y = b * (0.56 + i * 0.11)
        r.prost([b * 0.2, y, b * 0.8, y + b * 0.02], fill=BRAZ_C)
    r.prost([b * 0.2, b * 0.5, b * 0.24, b * 0.9], fill=BRAZ_J)
    r.wielokat([(b * 0.12, b * 0.52), (b * 0.5, b * 0.16), (b * 0.88, b * 0.52)], fill=dach)
    r.wielokat([(b * 0.12, b * 0.52), (b * 0.5, b * 0.16), (b * 0.5, b * 0.52)], fill=dach_c)
    r.prost([b * 0.42, b * 0.66, b * 0.58, b * 0.9], fill=BRAZ_C)


def sad():
    """Sad jagodowy — produkuje jagody."""
    b = int(KAFEL * 1.2)
    r = Rys(b, b)
    _chata(r, b, ZIELEN, ZIELEN_C)
    # Drzewko obok, żeby z odległości było widać, co ten budynek daje.
    r.prost([b * 0.86, b * 0.66, b * 0.91, b * 0.9], fill=BRAZ_C)
    kula(r, b * 0.885, b * 0.58, b * 0.14, ZIELEN_J, ZIELEN)
    kula(r, b * 0.885, b * 0.56, b * 0.05, CZERWIEN, CZERWIEN_C)
    return r.gotowe()


def kopalnia():
    """Kopalnia odłamków — produkuje odłamki."""
    b = int(KAFEL * 1.2)
    r = Rys(b, b)
    r.cien(b * 0.5, b * 0.93, b * 0.4, b * 0.09)
    # Zbocze z wejściem do sztolni i belkowaniem — czytelne z góry ekranu.
    r.wielokat([(b * 0.06, b * 0.9), (b * 0.34, b * 0.26), (b * 0.7, b * 0.26), (b * 0.96, b * 0.9)],
               fill=SZARY)
    r.wielokat([(b * 0.06, b * 0.9), (b * 0.34, b * 0.26), (b * 0.5, b * 0.9)], fill=SZARY_J)
    r.wielokat([(b * 0.34, b * 0.9), (b * 0.34, b * 0.56), (b * 0.5, b * 0.44),
                (b * 0.66, b * 0.56), (b * 0.66, b * 0.9)], fill=(26, 24, 32))
    r.prost([b * 0.3, b * 0.52, b * 0.7, b * 0.58], fill=BRAZ)
    r.prost([b * 0.3, b * 0.56, b * 0.36, b * 0.9], fill=BRAZ)
    r.prost([b * 0.64, b * 0.56, b * 0.7, b * 0.9], fill=BRAZ)
    for cx, cy in ((0.16, 0.78), (0.84, 0.8)):
        kula(r, b * cx, b * cy, b * 0.07, BLEKIT_J, BLEKIT)
    return r.gotowe()


def skrzynia():
    """Skarb — jednorazowy, daje pokeballe."""
    b = int(KAFEL * 0.8)
    r = Rys(b, b)
    r.cien(b * 0.5, b * 0.9, b * 0.36, b * 0.08)
    r.prost([b * 0.14, b * 0.52, b * 0.86, b * 0.86], fill=BRAZ)
    r.prost([b * 0.14, b * 0.52, b * 0.2, b * 0.86], fill=BRAZ_J)
    r.luk([b * 0.14, b * 0.24, b * 0.86, b * 0.7], 180, 360, fill=BRAZ_C)
    r.luk([b * 0.14, b * 0.28, b * 0.86, b * 0.66], 180, 360, fill=BRAZ)
    r.prost([b * 0.14, b * 0.5, b * 0.86, b * 0.56], fill=ZLOTO)
    r.prost([b * 0.44, b * 0.46, b * 0.56, b * 0.66], fill=ZLOTO)
    r.elipsa([b * 0.47, b * 0.55, b * 0.53, b * 0.61], fill=BRAZ_C)
    return r.gotowe()


# ---------- ozdoby ----------


def kepka():
    """Kępka trawy. Bez takich drobiazgów puste pole wygląda na niedokończone."""
    b = int(KAFEL * 0.34)
    r = Rys(b, int(b * 0.7))
    h = b * 0.7
    for x, wys, kolor in ((0.18, 0.5, ZIELEN_C), (0.36, 0.85, ZIELEN),
                          (0.54, 0.65, ZIELEN_J), (0.74, 0.8, ZIELEN)):
        r.wielokat([(b * x, h), (b * (x + 0.13), h), (b * (x + 0.1), h * (1 - wys))], fill=kolor)
    return r.gotowe()


def kwiaty():
    b = int(KAFEL * 0.36)
    r = Rys(b, int(b * 0.7))
    h = b * 0.7
    for x, wys, kolor in ((0.2, 0.55, (246, 118, 158)), (0.5, 0.8, (252, 224, 116)),
                          (0.78, 0.45, (246, 118, 158))):
        r.prost([b * x - b * 0.03, h * (1 - wys), b * x + b * 0.03, h], fill=ZIELEN_C)
        r.elipsa([b * x - b * 0.11, h * (1 - wys) - b * 0.11, b * x + b * 0.11,
                  h * (1 - wys) + b * 0.11], fill=kolor)
        r.elipsa([b * x - b * 0.04, h * (1 - wys) - b * 0.04, b * x + b * 0.04,
                  h * (1 - wys) + b * 0.04], fill=(255, 252, 230))
    return r.gotowe()


# ---------- teren ----------


# Próba rysowania gór wielokątami skończyła się szarymi piramidami — płaskimi
# i gorszymi od sprite'ów, które już mamy w przeszkodach bitewnych. Góry biorą
# się teraz stamtąd (patrz tools/prepare_mapa_obiekty.py), a tutaj zostają
# tylko drobiazgi, których nigdzie nie było.


SKALA_C = (78, 84, 96)
SKALA_S = (126, 134, 148)
SKALA_J = (176, 186, 200)


def pniak():
    """Pniak po ściętym drzewie — drobiazg na skraju lasu."""
    b = int(KAFEL * 0.44)
    r = Rys(b, int(b * 0.7))
    r.cien(b * 0.5, b * 0.64, b * 0.3, b * 0.06)
    r.prost([b * 0.28, b * 0.3, b * 0.72, b * 0.66], fill=BRAZ_C)
    r.elipsa([b * 0.28, b * 0.18, b * 0.72, b * 0.42], fill=BRAZ)
    r.elipsa([b * 0.4, b * 0.25, b * 0.6, b * 0.35], fill=BRAZ_J)
    return r.gotowe()


def kamyki():
    """Trzy kamyki — najtańszy sposób, żeby pusta trawa przestała być pusta."""
    b = int(KAFEL * 0.4)
    r = Rys(b, int(b * 0.5))
    for cx, cy, s in ((0.22, 0.7, 0.5), (0.55, 0.82, 0.72), (0.82, 0.66, 0.42)):
        r.elipsa([b * (cx - 0.11 * s * 2), b * (cy - 0.16 * s), b * (cx + 0.11 * s * 2), b * (cy + 0.06 * s)],
                 fill=SKALA_S)
        r.elipsa([b * (cx - 0.09 * s * 2), b * (cy - 0.15 * s), b * (cx + 0.05 * s * 2), b * (cy - 0.02 * s)],
                 fill=SKALA_J)
    return r.gotowe()


OBIEKTY = {
    'pniak': pniak,
    'kamyki': kamyki,
    'pokeball': pokeball,
    'jagody': jagody,
    'kamien-ewolucji': kamien_ewolucji,
    'odlamki': odlamki,
    'sad': sad,
    'kopalnia': kopalnia,
    'skrzynia': skrzynia,
    'kepka': kepka,
    'kwiaty': kwiaty,
}

if __name__ == '__main__':
    KATALOG.mkdir(parents=True, exist_ok=True)
    for nazwa, rys in OBIEKTY.items():
        im = rys()
        im.save(KATALOG / f'{nazwa}.png')
        print(f'  {nazwa}.png  {im.width} × {im.height}')
