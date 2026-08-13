#!/usr/bin/env python3
"""Rysuje ekran miasta: panoramę tła i bryły jedenastu budynków dla trzech frakcji.

Skąd taki kształt
-----------------
Ze wzorca. Ekran miasta w Heroes 3 (i w HotA) NIE JEST listą budynków — jest
malowaną panoramą, po której budynki są rozstawione w krajobrazie, jeden bliżej,
drugi w głębi, każdy klikalny, a jego wielkość mówi, jak ważny jest. Nasz
poprzedni ekran zamku był listą sześciu wierszy i to była jego największa
słabość wobec wzorca: wyglądał jak sklep, a nie jak miasto, które się rozbudowuje.

Nastrój niosą PALETA I PORA DNIA, nie kształty brył. Dlatego trzy frakcje mają
te same sylwetki budynków, a różnią się barwą nieba, ziemi, ścian i dachów:
Bór to jasny dzień nad polaną, Grota to fiolet podziemnego jeziora, Zbocze to
pomarańczowy zmierzch nad popiołem. Dzięki temu miasto rozpoznaje się z daleka
po kolorze, jeszcze zanim przeczyta się jego nazwę.

Czemu rysowane u nas, a nie wycięte z arkusza
---------------------------------------------
Bo żaden arkusz nie ma jedenastu budynków w trzech spójnych paletach. A do tego
zamek pokemonowy nie ma być zamkiem rycerskim: siedliska to gniazda, kotliny
i konary, nie koszary.

Czemu od razu w docelowym rozmiarze
-----------------------------------
Ta sama nauka, co przy obiektach mapy: filtr medianowy z `wygladzanie.py` zjada
cechy węższe niż kilka pikseli źródła. Rysujemy więc w rozmiarze docelowym
z czterokrotnym nadpróbkowaniem — brzegi wychodzą gładkie, a detal zostaje.

    python3 tools/rysuj_miasto.py
"""

import math
import random
import re
import sys
from pathlib import Path

import numpy as np
from PIL import Image, ImageChops, ImageDraw, ImageFilter

sys.path.insert(0, str(Path(__file__).resolve().parent))
from rysuj_obiekty_mapy import NAD, Rys, kula  # noqa: E402

KORZEN = Path(__file__).resolve().parent.parent
KATALOG = KORZEN / 'public' / 'miasto'

#: Panorama zajmuje całą szerokość okna gry; wysokość to okno bez paska tytułu
#: i bez paska przycisków na dole (te rysuje scena, bo muszą być czytelne).
PAN_W = 960
PAN_H = 596

#: Płótno pojedynczego budynku. Wszystkie bryły rysujemy w jednej skali, a
#: różnicę wielkości robi `skala` z `zamki.ts` — inaczej ta sama liczba
#: znaczyłaby co innego przy każdym budynku.
BRYLA = 240

#: Zapas z lewej na cień rzucony. Cień idzie w lewo (słońce po prawej), więc
#: gotowy plik jest szerszy niż bryła, a scena musi wiedzieć, gdzie w tym pliku
#: stoi sam budynek — stąd `MARGINES_CIENIA` powtórzony w `TownScene.ts`.
MARGINES_CIENIA = 120


def mieszaj(a, b, t):
    return tuple(round(x + (y - x) * t) for x, y in zip(a, b))


def rgb(v: int):
    return ((v >> 16) & 255, (v >> 8) & 255, v & 255)


class Paleta:
    """Wszystkie barwy jednego miasta w jednym miejscu.

    Trzy tony na każdy materiał — ciemny, właściwy i jasny — bo tyle wystarcza,
    żeby bryła czytała się jako bryła: ściana od cienia, dach od ściany, światło
    od góry. Czwarty ton na tym rozmiarze i tak zlewa się w gradient.
    """

    def __init__(self, niebo, dal, ziemia, sciana, dach, akcent, swiatlo, ubita=None):
        self.niebo = rgb(niebo)
        self.dal = rgb(dal)
        self.ziemia = rgb(ziemia)
        self.sciana = rgb(sciana)
        self.dach = rgb(dach)
        self.akcent = rgb(akcent)
        self.swiatlo = rgb(swiatlo)
        # Wydeptana ziemia placu. MUSI być innym materiałem, nie przyciemnioną
        # trawą: pierwsza wersja mieszała ziemię z trawą i wychodziła oliwkowa
        # maź, przez którą cały kadr zrobił się ciemniejszy i mniej czytelny.
        self.ubita = rgb(ubita) if ubita else rgb(0xbfa06a)

    def s(self, t):
        """Ton ściany: -1 to cień, 0 to ściana, 1 to światło."""
        return mieszaj(self.sciana, self.swiatlo if t > 0 else (20, 18, 26), abs(t))

    def d(self, t):
        return mieszaj(self.dach, self.swiatlo if t > 0 else (20, 18, 26), abs(t))


PALETY = {
    # Bór: południe nad polaną. Ciepłe drewno, liściaste dachy, złote okucia.
    'bor': Paleta(
        niebo=0x8fd6f0, dal=0x6fae76, ziemia=0x4a7d43,
        sciana=0xb98a52, dach=0x4f9e4a, akcent=0xffc93c, swiatlo=0xfff4d0,
        ubita=0xc9a978,
    ),
    # Grota: podziemne jezioro. Zimny kamień, fioletowy kryształ, błękitne światło.
    'grota': Paleta(
        niebo=0x2b2350, dal=0x3d3470, ziemia=0x3a3358,
        sciana=0x8e8ab0, dach=0x9d5cc4, akcent=0x67e3ff, swiatlo=0xe8e2ff,
        ubita=0x6e6890,
    ),
    # Zbocze: zmierzch nad popiołem. Bazalt, rdzawe dachy, żar w szczelinach.
    'zbocze': Paleta(
        niebo=0x8c4a33, dal=0x5c352c, ziemia=0x4a3630,
        sciana=0x7b6a63, dach=0xd1622f, akcent=0xffb03a, swiatlo=0xffd9a8,
        ubita=0x8a7060,
    ),
}


# ---------------------------------------------------------------------------
# ZIELEŃ I FAKTURA
# ---------------------------------------------------------------------------
#
# Roślinność bierzemy z TYCH SAMYCH plików, co mapa przygody
# (`public/mapa/*.png`, wygładzone w `prepare_mapa_obiekty.py`). To nie jest
# oszczędność pracy, tylko decyzja: drzewo w mieście ma być tym samym drzewem,
# co drzewo na mapie, inaczej dwa ekrany tej samej gry mówią dwoma językami.
#
# Barwę dopasowujemy do pory dnia miasta. Zielone drzewo z południa Boru
# postawione w fiolecie Groty świeci jak wklejka — mnożymy je więc przez
# światło danego miasta, dokładnie tak, jak robi to każdy silnik z oświetleniem.

#: Roślinność rysujemy u siebie, a NIE bierzemy z `public/mapa/*.png`.
#: Pierwsza wersja brała stamtąd i było to widać natychmiast: tamte sprite'y
#: mają wtopiony jasny placek trawy pod pniem (bo na mapie leżą na kafelku
#: trawy), więc na panoramie każde drzewo dostawało pod sobą świecącą elipsę.
#: To ta sama pułapka, którą zapisaliśmy przy mapie przygody — i drugi raz
#: kosztowała rundę.


def _kula_lisci(r, b, cx, cy, promien, kolor, ciemny):
    r.elipsa([cx - promien, cy - promien * 0.94, cx + promien, cy + promien * 0.94], fill=ciemny)
    r.elipsa(
        [cx - promien * 0.82, cy - promien * 0.92, cx + promien * 0.62, cy + promien * 0.5],
        fill=kolor,
    )


def drzewo(p: 'Paleta', los: random.Random, iglaste=False) -> Image.Image:
    """Drzewo w palecie miasta. Każde losowane osobno — rząd identycznych
    stempli przy horyzoncie czyta się jak żywopłot z tapety, a nie jak las."""
    b = 200
    r = Rys(b, b)
    lisc = mieszaj(p.dach, (46, 92, 40), 0.35 if p.dach[1] > p.dach[2] else 0.15)
    lisc = mieszaj(lisc, p.swiatlo, 0.08 * los.random())
    ciemny = mieszaj(lisc, (12, 20, 16), 0.42)
    pien = mieszaj(p.sciana, (60, 38, 24), 0.55)

    wys = 0.5 + 0.22 * los.random()
    r.wielokat(
        [(b * 0.45, b * 0.95), (b * 0.55, b * 0.95), (b * 0.53, b * (1 - wys)),
         (b * 0.47, b * (1 - wys))],
        fill=pien,
    )
    if iglaste:
        pietra = 3 + int(los.random() * 2)
        for i in range(pietra):
            t = i / pietra
            szer = b * (0.34 - 0.07 * i) * (0.9 + 0.2 * los.random())
            gora = b * (0.12 + t * 0.52)
            r.wielokat(
                [(b * 0.5 - szer, gora + b * 0.22), (b * 0.5, gora),
                 (b * 0.5 + szer, gora + b * 0.22)],
                fill=ciemny if i % 2 else lisc,
            )
    else:
        korona = b * (0.2 + 0.06 * los.random())
        sr_y = b * (0.98 - wys - 0.12)
        _kula_lisci(r, b, b * 0.5, sr_y, korona, lisc, ciemny)
        for _ in range(3):
            kat = los.random() * 6.28
            odl = korona * (0.55 + 0.35 * los.random())
            _kula_lisci(
                r, b, b * 0.5 + math.cos(kat) * odl, sr_y + math.sin(kat) * odl * 0.62,
                korona * (0.5 + 0.3 * los.random()), lisc, ciemny,
            )
    return r.gotowe()


def krzak(p: 'Paleta', los: random.Random) -> Image.Image:
    b = 120
    r = Rys(b, b)
    lisc = mieszaj(p.dach, (60, 104, 52), 0.4)
    ciemny = mieszaj(lisc, (12, 20, 16), 0.4)
    for i in range(3):
        cx = b * (0.32 + 0.18 * i + 0.06 * los.random())
        cy = b * (0.86 - 0.06 * los.random())
        rr = b * (0.16 + 0.08 * los.random())
        r.elipsa([cx - rr, cy - rr * 1.2, cx + rr, cy + rr * 0.3], fill=ciemny)
        r.elipsa([cx - rr * 0.8, cy - rr * 1.15, cx + rr * 0.4, cy - rr * 0.2], fill=lisc)
    return r.gotowe()


def glaz(p: 'Paleta', los: random.Random) -> Image.Image:
    b = 120
    r = Rys(b, b)
    kamien = mieszaj(p.sciana, (108, 112, 122), 0.5)
    r.wielokat(
        [(b * 0.18, b * 0.88), (b * 0.3, b * (0.58 + 0.1 * los.random())),
         (b * 0.56, b * 0.5), (b * 0.78, b * 0.64), (b * 0.86, b * 0.88)],
        fill=mieszaj(kamien, (0, 0, 0), 0.25),
    )
    r.wielokat(
        [(b * 0.3, b * 0.66), (b * 0.56, b * 0.5), (b * 0.78, b * 0.64), (b * 0.54, b * 0.72)],
        fill=mieszaj(kamien, (255, 255, 255), 0.2),
    )
    return r.gotowe()


def plot(p: Paleta) -> Image.Image:
    """Płotek z żerdzi — najtańszy sposób, żeby teren przestał być pustą trawą."""
    b = 140
    r = Rys(b, int(b * 0.5))
    drewno = mieszaj(p.sciana, (96, 64, 36), 0.5)
    h = b * 0.5
    for i in range(5):
        x = b * (0.06 + i * 0.22)
        r.prost([x, h * 0.25, x + b * 0.03, h * 0.95], fill=drewno)
    for y in (0.42, 0.66):
        r.prost([b * 0.05, h * y, b * 0.96, h * (y + 0.07)],
                fill=mieszaj(drewno, p.swiatlo, 0.22))
    return modeluj(r.gotowe(), sila=0.7)


def beczki(p: Paleta, los: random.Random) -> Image.Image:
    b = 120
    r = Rys(b, b)
    drewno = mieszaj(p.sciana, (118, 78, 42), 0.45)
    obrecz = mieszaj(drewno, (0, 0, 0), 0.45)
    for cx, cy, sk in ((0.34, 0.9, 1.0), (0.62, 0.86, 0.82), (0.5, 0.98, 0.9)):
        if los.random() < 0.25:
            continue
        w = b * 0.13 * sk
        h = b * 0.2 * sk
        r.prost([b * cx - w, b * cy - h, b * cx + w, b * cy], fill=drewno)
        r.elipsa([b * cx - w, b * cy - h - w * 0.4, b * cx + w, b * cy - h + w * 0.4],
                 fill=mieszaj(drewno, p.swiatlo, 0.3))
        for t in (0.3, 0.7):
            r.prost([b * cx - w, b * cy - h * t, b * cx + w, b * cy - h * t + h * 0.09],
                    fill=obrecz)
    return modeluj(r.gotowe(), sila=0.8)


def ognisko(p: Paleta) -> Image.Image:
    """Ognisko: jedyne w kadrze źródło ciepłego światła poza słońcem."""
    b = 110
    r = Rys(b, b)
    kamien = mieszaj(p.sciana, (110, 112, 120), 0.55)
    for i in range(6):
        kat = i * 60 * math.pi / 180
        cx = b * (0.5 + 0.17 * math.cos(kat))
        cy = b * (0.86 + 0.07 * math.sin(kat))
        r.elipsa([cx - b * 0.06, cy - b * 0.05, cx + b * 0.06, cy + b * 0.05], fill=kamien)
    r.wielokat([(b * 0.36, b * 0.86), (b * 0.5, b * 0.52), (b * 0.64, b * 0.86)],
               fill=mieszaj(p.akcent, (200, 60, 20), 0.4))
    r.wielokat([(b * 0.43, b * 0.86), (b * 0.52, b * 0.62), (b * 0.58, b * 0.86)],
               fill=mieszaj(p.akcent, (255, 255, 255), 0.45))
    return r.gotowe()


def pozycje_budynkow():
    """Gdzie w krajobrazie stoją budynki — ODCZYTANE z `src/data/zamki.ts`.

    Roślinność musi omijać budynki, a to znaczy, że renderer musi znać ich
    miejsca. Przepisanie jedenastu par liczb do tego pliku skończyłoby się tak,
    jak zawsze kończy się ta sama liczba w dwóch miejscach: ktoś przesunie
    siedlisko w grze, drzewo zostanie tam, gdzie stało, i wyrośnie w kominie.
    """
    tekst = (KORZEN / 'src' / 'data' / 'zamki.ts').read_text()
    blok = tekst[tekst.index('const SZKIELET'):tekst.index('\n];', tekst.index('const SZKIELET'))]
    pozycje = []
    for wpis in blok.split('},'):
        x = re.search(r'x:\s*([\d.]+)', wpis)
        y = re.search(r'y:\s*([\d.]+)', wpis)
        skala = re.search(r'skala:\s*([\d.]+)', wpis)
        if x and y and skala:
            pozycje.append((float(x.group(1)), float(y.group(1)), float(skala.group(1))))
    return pozycje


#: Te same dwie liczby, którymi `TownScene` przelicza głębię na miejsce
#: i na perspektywę. Muszą się zgadzać, bo drzewo i budynek o tej samej głębi
#: mają stać na tej samej linii ziemi.
def na_ziemi(glebia, horyzont, H):
    return horyzont + (H - horyzont) * (0.1 + 0.88 * glebia)


def perspektywa(glebia):
    return 0.6 + 0.62 * glebia


def posadz(im, d, sprite, x, y, wysokosc, cien=True):
    """Stawia sprite podstawą w punkcie (x, y) i podkłada mu cień.

    Cień jest tu tak samo ważny jak sam sprite: drzewo bez cienia leży na trawie
    jak naklejka, a z cieniem stoi. Ta sama zasada, co przy bryłach budynków.
    """
    s = sprite.resize((max(1, round(sprite.width * wysokosc / sprite.height)), round(wysokosc)),
                      Image.LANCZOS)
    if cien:
        w, h = s.size
        cn = s.getchannel('A').transform(
            (w * 2, h), Image.AFFINE, (1, 0.9, -0.9 * h, 0, 3.0, h * (1 - 3.0)),
            resample=Image.BILINEAR,
        ).filter(ImageFilter.GaussianBlur(max(1, h * 0.03)))
        warstwa = Image.new('RGBA', cn.size, (14, 22, 20, 255))
        warstwa.putalpha(cn.point(lambda v: int(v * 0.48)))
        im.alpha_composite(warstwa, (round(x - w / 2), round(y - h)))
    im.alpha_composite(s, (round(x - s.width / 2), round(y - s.height)))


# ---------------------------------------------------------------------------
# PANORAMA
# ---------------------------------------------------------------------------


def panorama(p: Paleta, frakcja: str) -> Image.Image:
    """Tło miasta: niebo, dalekie wzgórza, ziemia i droga.

    Głębia bierze się stąd, że to, co dalej, jest jaśniejsze i mniej nasycone —
    ta sama zasada, co w każdym malowanym tle. Bez niej trzy pasy koloru czytają
    się jak flaga, a nie jak krajobraz.
    """
    im = Image.new('RGB', (PAN_W * NAD, PAN_H * NAD), p.niebo)
    d = ImageDraw.Draw(im, 'RGBA')
    W, H = PAN_W * NAD, PAN_H * NAD
    # Horyzont wysoko. Wcześniej stał w połowie kadru i niebo zabierało tyle
    # miejsca, co całe miasto — wzorzec nie ma nieba prawie wcale, bo ekran
    # miasta pokazuje MIASTO, a nie pogodę. Ta jedna liczba zrobiła dla
    # porównania więcej niż wszystkie poprawki brył razem wzięte.
    horyzont = int(H * 0.26)

    # --- niebo: gradient w stronę horyzontu, gdzie jest najjaśniejsze ---
    for y in range(horyzont):
        t = y / horyzont
        d.line([(0, y), (W, y)], fill=mieszaj(p.niebo, mieszaj(p.niebo, p.swiatlo, 0.55), t))

    # --- ciało niebieskie: słońce, księżyc albo łuna nad kraterem ---
    #
    # Poświata z sześciu elips w odstępach dawała widoczne pierścienie — oko
    # łapie skok jasności o dwie wartości na płaskim niebie. Trzydzieści kroków
    # po jednej ósmej alfy zlewa się w gradient.
    sx, sy, r = W * 0.78, H * 0.13, H * 0.075
    for i in range(30, 0, -1):
        g = r * (1 + i * 0.34)
        d.ellipse([sx - g, sy - g, sx + g, sy + g], fill=(*p.swiatlo, 5))
    d.ellipse([sx - r, sy - r, sx + r, sy + r], fill=(*p.swiatlo, 230))
    if frakcja == 'grota':
        # Księżyc w nowiu: ta sama kula przysłonięta drugą w kolorze nieba.
        d.ellipse([sx - r * 1.5, sy - r * 1.15, sx + r * 0.55, sy + r * 1.15], fill=p.niebo)

    # --- dalekie wzgórza: trzy plany, każdy bliższy jest ciemniejszy ---
    for plan, (wys, jasnosc) in enumerate(((0.20, 0.55), (0.13, 0.3), (0.07, 0.0))):
        kolor = mieszaj(p.dal, mieszaj(p.niebo, p.swiatlo, 0.5), jasnosc)
        punkty = [(0, H)]
        garby = 5 + plan * 2
        for i in range(garby + 1):
            x = W * i / garby
            # Regularny sinus dałby faliste wzgórza z tapety — łamiemy go
            # drugą falą o innym okresie, żeby grzbiety nie były równe.
            fala = 0.5 + 0.5 * math.sin(i * 2.1 + plan * 1.7)
            fala2 = 0.5 + 0.5 * math.sin(i * 5.3 + plan)
            y = horyzont - H * wys * (0.45 + 0.4 * fala + 0.15 * fala2)
            punkty.append((x, y))
        punkty.append((W, H))
        d.polygon(punkty, fill=kolor)

    # --- ziemia: płaskowyż, na którym stoi miasto ---
    #
    # Pierwsza wersja zaczynała ziemię wprost od horyzontu w rozjaśnionym tonie
    # i na styku z wzgórzami wychodził twardy pasek przez cały ekran — mapa
    # kolorów zmieniała się skokiem tam, gdzie w krajobrazie jest największa
    # odległość. Teraz ziemia przy horyzoncie zaczyna się od barwy wzgórz
    # i dopiero z bliska staje się sobą.
    dal_blisko = mieszaj(p.dal, mieszaj(p.niebo, p.swiatlo, 0.5), 0.0)
    for y in range(horyzont, H):
        t = (y - horyzont) / (H - horyzont)
        blisko = mieszaj(mieszaj(p.ziemia, p.swiatlo, 0.16), p.ziemia, min(1, t * 1.3))
        d.line([(0, y), (W, y)], fill=mieszaj(dal_blisko, blisko, min(1, t * 6)))

    # --- droga: łączy wjazd na dole z ratuszem pośrodku ---
    #
    # Nie jest ozdobą. Panorama bez drogi rozpada się na osobne budynki stojące
    # w trawie; droga wiąże je w jedno miejsce i prowadzi wzrok tam, gdzie stoi
    # najważniejszy budynek.
    droga = mieszaj(p.ziemia, p.swiatlo, 0.34)
    for i in range(60):
        t = i / 59
        x = W * (0.5 + 0.1 * math.sin(t * 2.4))
        y = H - (H - horyzont) * t * 0.92
        szer = W * (0.07 - 0.05 * t)
        d.ellipse([x - szer, y - szer * 0.16, x + szer, y + szer * 0.16], fill=droga)

    # --- faktura ziemi ---
    #
    # Gładka plama zieleni była najczęściej wytykaną rzeczą w porównaniu
    # z wzorcem: podłoże wzorca ma ziarno, kępy, kamienie i przetarcia,
    # a nasze miało gradient i kilka kropek. Ziarno kładziemy pierwsze, pod
    # wszystko inne — ono samo nie wystarczy, ale bez niego każdy dokładany
    # detal leży na plastiku.
    los = random.Random(7)
    ziarno = np.asarray(
        Image.effect_noise((PAN_W, PAN_H - int(horyzont / NAD)), 42).filter(
            ImageFilter.GaussianBlur(0.7)
        )
    ).astype(np.float32)
    ziarno = np.repeat(np.repeat(ziarno, NAD, axis=0), NAD, axis=1)
    pas = np.asarray(im.crop((0, horyzont, W, H))).astype(np.float32)
    zg = ziarno[: pas.shape[0], : pas.shape[1], None]
    # Ziarno mocniejsze na pierwszym planie: z odległością wszystko się wygładza.
    glebia = np.linspace(0.25, 1.0, pas.shape[0], dtype=np.float32)[:, None, None]
    pas *= 1 + ((zg - 128) / 128) * 0.16 * glebia
    im.paste(Image.fromarray(pas.clip(0, 255).astype(np.uint8), 'RGB'), (0, horyzont))
    d = ImageDraw.Draw(im, 'RGBA')

    # --- plamy: darń nie jest jednym kolorem ---
    #
    # To ta warstwa robi najwięcej. Ziarno i kępy dokładają detalu, ale dopóki
    # cała łąka ma jeden walor, kadr czyta się jak pomalowana płyta. Duże,
    # miękkie plamy jaśniejsze i ciemniejsze łamią to od razu.
    #
    # Rysujemy je na OSOBNEJ warstwie i rozmywamy: elipsa z ostrym brzegiem
    # wygląda jak kałuża albo plama oleju, a nie jak inny gatunek trawy.
    # Rozmywamy MASKI, nie kolorowe elipsy. Rozmycie obrazka RGBA, którego
    # kolor istnieje tylko wewnątrz kształtu, wciąga do brzegów czerń spoza
    # niego i zostawia ciemne obwódki — wyszły z tego smugi jak po gumce.
    jasna = Image.new('L', (W, H), 0)
    ciemna = Image.new('L', (W, H), 0)
    for maska, ile in ((jasna, 24), (ciemna, 24)):
        dm = ImageDraw.Draw(maska)
        for _ in range(ile):
            t = los.random() ** 0.6
            x = los.random() * W
            y = horyzont + (H - horyzont) * t
            rx = W * (0.04 + 0.11 * los.random()) * (0.5 + t)
            ry = rx * (0.18 + 0.12 * los.random())
            dm.ellipse([x - rx, y - ry, x + rx, y + ry], fill=90 + int(60 * los.random()))
    jasna = jasna.filter(ImageFilter.GaussianBlur(NAD * 7))
    ciemna = ciemna.filter(ImageFilter.GaussianBlur(NAD * 7))
    im.paste(Image.new('RGB', (W, H), mieszaj(p.ziemia, p.swiatlo, 0.5)), (0, 0), jasna)
    im.paste(Image.new('RGB', (W, H), mieszaj(p.ziemia, (0, 0, 0), 0.35)), (0, 0), ciemna)
    d = ImageDraw.Draw(im, 'RGBA')

    # --- kamienie i przetarcia ---
    for _ in range(260):
        t = los.random() ** 0.8
        x = los.random() * W
        y = horyzont + (H - horyzont) * t
        s_ = W * 0.0016 * (0.35 + t * 1.5)
        jasniej = los.random() < 0.45
        kolor = mieszaj(p.ziemia, p.swiatlo if jasniej else (0, 0, 0), 0.1 + 0.12 * los.random())
        d.ellipse([x - s_ * 2.6, y - s_, x + s_ * 2.6, y + s_], fill=(*kolor, 210))

    # --- kępy trawy ---
    #
    # Rysowane trzema pociągnięciami, nie kropką: kępa musi mieć kierunek,
    # inaczej z daleka wygląda jak brud na obiektywie.
    # Kępy rosną gromadami, nie równomiernie — losowanie każdej z osobna daje
    # regularny deszcz znaczków, który oko czyta jako wzór, a nie jako trawę.
    gniazda = [
        (los.random() * W, horyzont + (H - horyzont) * los.random() ** 0.7)
        for _ in range(46)
    ]
    for i in range(520):
        gx, gy = gniazda[i % len(gniazda)]
        rozrzut = W * 0.05
        x = min(W, max(0, gx + los.gauss(0, rozrzut)))
        y = min(H, max(horyzont, gy + los.gauss(0, rozrzut * 0.3)))
        t = (y - horyzont) / (H - horyzont)
        wys = H * (0.004 + 0.02 * t) * (0.7 + 0.6 * los.random())
        ciemna = los.random() < 0.5
        kolor = mieszaj(p.ziemia, p.swiatlo if not ciemna else (0, 0, 0), 0.18 + 0.14 * los.random())
        for k in (-1, 0, 1):
            przechyl = k * wys * 0.42
            d.polygon(
                [
                    (x + k * wys * 0.3, y),
                    (x + k * wys * 0.3 + przechyl, y - wys),
                    (x + k * wys * 0.3 + wys * 0.16, y),
                ],
                fill=(*kolor, 235),
            )

    # --- wydeptany plac ---
    #
    # Miasto stojące na nietkniętej łące wygląda jak makieta postawiona na
    # trawniku. Wzorzec ma pod zabudową ubitą ziemię i bruk — ślad tego, że
    # ktoś tam chodzi. Plac rysujemy tam, gdzie stoją budynki: bierzemy ich
    # miejsca z `zamki.ts` i rozlewamy wokół każdego miękką plamę.
    budynki = pozycje_budynkow()
    maska_placu = Image.new('L', (W, H), 0)
    dmp = ImageDraw.Draw(maska_placu)
    for bx, by, bskala in budynki:
        cx = bx * W
        cy = na_ziemi(by, horyzont, H)
        rx = W * 0.085 * bskala * perspektywa(by) * 1.6
        ry = rx * 0.42
        dmp.ellipse([cx - rx, cy - ry, cx + rx, cy + ry * 0.7], fill=190)
    # Droga też należy do placu — inaczej plac kończy się w powietrzu.
    for i in range(60):
        t = i / 59
        x = W * (0.5 + 0.1 * math.sin(t * 2.4))
        y = H - (H - horyzont) * t * 0.92
        szer = W * (0.075 - 0.05 * t)
        dmp.ellipse([x - szer, y - szer * 0.2, x + szer, y + szer * 0.2], fill=190)
    maska_placu = maska_placu.filter(ImageFilter.GaussianBlur(NAD * 5))
    ziemia_ubita = p.ubita
    im.paste(Image.new('RGB', (W, H), ziemia_ubita), (0, 0), maska_placu)
    d = ImageDraw.Draw(im, 'RGBA')
    # Przetarcia na styku placu z trawą: sam gradient wygląda jak plama światła.
    for _ in range(300):
        t = los.random()
        x = los.random() * W
        y = horyzont + (H - horyzont) * t
        if not 40 < maska_placu.getpixel((int(x), int(y))) < 165:
            continue
        rr = W * 0.002 * (0.5 + t)
        kolor = mieszaj(ziemia_ubita, p.ziemia, los.random())
        d.ellipse([x - rr * 2.2, y - rr, x + rr * 2.2, y + rr], fill=(*kolor, 220))

    # --- roślinność ---
    #
    # Trzy plany: gąszcz przy horyzoncie (drobny i przygaszony perspektywą
    # powietrzną), pojedyncze drzewa w głębi między budynkami, krzaki i kępy
    # na pierwszym planie. Kadr bez tego jest pustym boiskiem z domami.
    #
    # Miejsca budynków czytamy z `zamki.ts` i omijamy je z zapasem — drzewo
    # wyrastające ze środka siedliska widać z drugiego końca pokoju.
    los_z = random.Random(23)
    drzewa = [drzewo(p, los_z, iglaste=i % 3 == 0) for i in range(9)]
    krzaki = [krzak(p, los_z) for _ in range(4)]
    glazy = [glaz(p, los_z) for _ in range(3)]
    # Każdy egzemplarz przechodzi przez ten sam przebieg światła, co budynki —
    # inaczej drzewo obok domu jest oświetlone z innej strony niż dom.
    drzewa = [modeluj(x, sila=0.8) for x in drzewa]
    krzaki = [modeluj(x, sila=0.7) for x in krzaki]
    glazy = [modeluj(x, sila=0.9) for x in glazy]

    def na_drodze(x_ulamek, glebia):
        """Czy punkt leży na wydeptanej drodze. Drzewo rosnące ze środka drogi
        mówi wprost, że nikt tędy nie chodzi — a droga jest jedyną rzeczą, która
        wiąże budynki w jedno miasto."""
        y = na_ziemi(glebia, horyzont, H)
        t = (H - y) / ((H - horyzont) * 0.92)
        if not 0 <= t <= 1:
            return False
        return abs(x_ulamek * W - W * (0.5 + 0.1 * math.sin(t * 2.4))) < W * (0.07 - 0.05 * t) * 1.7

    def wolne(x_ulamek, glebia, promien=0.1):
        if na_drodze(x_ulamek, glebia):
            return False
        return all(
            abs(x_ulamek - bx) > promien or abs(glebia - by) > 0.22
            for bx, by, _ in budynki
        )

    warstwa = Image.new('RGBA', (W, H), (0, 0, 0, 0))
    los_r = random.Random(19)

    # Gąszcz przy horyzoncie idzie na WŁASNĄ warstwę, bo w całości wpada
    # w mgłę: to, co daleko, traci kontrast i przejmuje barwę powietrza.
    # Bez tego rząd drzew przy horyzoncie jest równie ostry jak drzewo pod nosem
    # i cała głębia, którą buduje tło, znika.
    dal_warstwa = Image.new('RGBA', (W, H), (0, 0, 0, 0))
    for i in range(70):
        gl = los_r.random() * 0.06
        x = W * (i / 69) + los_r.gauss(0, W * 0.008)
        y = na_ziemi(gl, horyzont, H) - H * 0.004
        posadz(dal_warstwa, d, los_r.choice(drzewa), x, y,
               H * 0.055 * (0.7 + 0.6 * los_r.random()), cien=False)
    mgla = Image.new('RGBA', (W, H), (*mieszaj(p.niebo, p.swiatlo, 0.45), 255))
    mgla.putalpha(dal_warstwa.getchannel('A').point(lambda v: int(v * 0.45)))
    dal_warstwa.alpha_composite(mgla)
    warstwa.alpha_composite(dal_warstwa)

    # drzewa w głębi i na skrzydłach kadru
    for _ in range(26):
        gl = los_r.random() ** 1.4
        x_u = los_r.random()
        if not wolne(x_u, gl, 0.11):
            continue
        # Środek kadru zostaje pusty: tam idzie droga i tam patrzy oko.
        if 0.4 < x_u < 0.62 and gl > 0.2:
            continue
        posadz(
            warstwa, d, los_r.choice(drzewa), x_u * W, na_ziemi(gl, horyzont, H),
            H * 0.19 * perspektywa(gl) * (0.7 + 0.55 * los_r.random()),
        )

    for _ in range(40):
        gl = los_r.random()
        x_u = los_r.random()
        if not wolne(x_u, gl, 0.07):
            continue
        posadz(
            warstwa, d, los_r.choice(krzaki if los_r.random() < 0.6 else glazy), x_u * W,
            na_ziemi(gl, horyzont, H), H * 0.05 * perspektywa(gl) * (0.6 + 0.8 * los_r.random()),
            cien=los_r.random() < 0.7,
        )

    # --- rekwizyty przy zabudowie ---
    #
    # Płot, beczki, skrzynie i ognisko. Nie są ozdobą: to one mówią, że miasto
    # jest zamieszkane. Wzorzec ma taki drobiazg co kilkanaście pikseli, a nasz
    # kadr miał między budynkami pustą trawę.
    for bx, by, bskala in budynki:
        if los_r.random() < 0.35:
            continue
        cx = bx * W
        cy = na_ziemi(by, horyzont, H)
        sk = perspektywa(by) * bskala
        strona = -1 if los_r.random() < 0.5 else 1
        rodzaj = los_r.random()
        if rodzaj < 0.4:
            posadz(warstwa, d, plot(p), cx + strona * W * 0.075 * sk, cy + H * 0.012 * sk,
                   H * 0.055 * sk)
        elif rodzaj < 0.75:
            posadz(warstwa, d, beczki(p, los_r), cx + strona * W * 0.06 * sk,
                   cy + H * 0.014 * sk, H * 0.042 * sk)
        else:
            posadz(warstwa, d, ognisko(p), cx + strona * W * 0.07 * sk, cy + H * 0.01 * sk,
                   H * 0.036 * sk)

    im.paste(Image.alpha_composite(im.convert('RGBA'), warstwa).convert('RGB'), (0, 0))
    d = ImageDraw.Draw(im, 'RGBA')

    # --- winieta: przyciemnione rogi ---
    # Panorama bez niej rozlewa się na boki i wzrok nie ma się gdzie zatrzymać.
    # Tu jest to potrzebne podwójnie, bo na rogach ekranu leżą panele interfejsu
    # i muszą się od tła odcinać.
    winieta = Image.new('L', (PAN_W, PAN_H), 0)
    dw = ImageDraw.Draw(winieta)
    for i in range(28):
        t = i / 27
        dw.ellipse([-PAN_W * 0.3 + PAN_W * 0.62 * t, -PAN_H * 0.3 + PAN_H * 0.62 * t,
                    PAN_W * 1.3 - PAN_W * 0.62 * t, PAN_H * 1.3 - PAN_H * 0.62 * t],
                   fill=int(6 * (1 - t)))
    winieta = winieta.resize((W, H), Image.BILINEAR).filter(ImageFilter.GaussianBlur(NAD * 8))
    ciemno = Image.new('RGB', (W, H), (10, 8, 20))
    im = Image.composite(im, ciemno, Image.eval(winieta, lambda v: 255 - min(90, v * 3)))

    # Rozmycie planu dalekiego: głębia ostrości robi za perspektywę powietrzną
    # skuteczniej niż samo rozjaśnianie. Rozmywamy TYLKO niebo z wzgórzami —
    # rozmyta ziemia wyglądałaby jak zabrudzone szkło.
    gora = im.crop((0, 0, W, horyzont)).filter(ImageFilter.GaussianBlur(NAD * 1.1))
    im.paste(gora, (0, 0))
    return im.resize((PAN_W, PAN_H), Image.LANCZOS)


# ---------------------------------------------------------------------------
# BRYŁY BUDYNKÓW
# ---------------------------------------------------------------------------
#
# Każdy budynek dostaje jedną czytelną sylwetkę i jeden znak rozpoznawczy.
# Znak jest ważniejszy od detalu: na panoramie budynek ma się rozpoznawać
# z odległości całego ekranu, a nie po najechaniu.


def _cien_pod(r, b, szer=0.42):
    """Ciemniejsze przyziemie tuż pod bryłą — styk, nie cień.

    Cień rzucony robi `zCieniem` i jest KIERUNKOWY. Symetryczna elipsa, którą
    rysowaliśmy wcześniej, kłóciła się z nim wprost: krytyk zobaczył na jednym
    ekranie dwa źródła światła i słusznie policzył to za błąd. Zostaje wąski,
    ciemny styk z ziemią, który sam z siebie nie sugeruje kierunku.
    """
    r.elipsa([b * (0.5 - szer * 0.62), b * 0.925, b * (0.5 + szer * 0.62), b * 0.965],
             fill=(0, 0, 0, 55))


def _dach(r, b, p, lewo, prawo, kalenica, spad, szczyt=None):
    """Dwuspadowy dach: połać od słońca jasna, przeciwna ciemna.

    Słońce stoi na panoramie po PRAWEJ, więc jasna jest połać prawa. Przebieg
    `modeluj` doda do tego miękkie przejście i krawędź świetlną, ale sam podział
    na dwie połacie musi zgadzać się z kierunkiem — inaczej modelunek walczy
    z rysunkiem i bryła wygląda na oświetloną z dwóch stron naraz.
    """
    r.wielokat([(b * lewo, b * spad), (b * kalenica, b * (szczyt or spad - 0.2)),
                (b * prawo, b * spad)], fill=p.d(-0.3))
    r.wielokat([(b * kalenica, b * (szczyt or spad - 0.2)), (b * prawo, b * spad),
                (b * kalenica, b * spad)], fill=p.d(0.32))


def _sciana(r, b, p, x0, y0, x1, y1):
    """Ściana z jasnym kantem od strony słońca (prawo) i ciemnym od cienia."""
    r.prost([b * x0, b * y0, b * x1, b * y1], fill=p.s(0))
    r.prost([b * x0, b * y0, b * (x0 + 0.04), b * y1], fill=p.s(-0.32))
    r.prost([b * (x1 - 0.045), b * y0, b * x1, b * y1], fill=p.s(0.34))


def _deski(r, b, p, x0, y0, x1, y1, ile=5):
    """Poziome deski na ścianie. Jeden ton na całą ścianę znaczy „nie wiadomo,
    z czego to jest" — a materiał był wytykany w każdym porównaniu z wzorcem."""
    for i in range(1, ile):
        y = y0 + (y1 - y0) * i / ile
        r.prost([b * x0, b * y, b * x1, b * (y + 0.006)], fill=p.s(-0.22))
        r.prost([b * x0, b * (y + 0.006), b * x1, b * (y + 0.011)], fill=p.s(0.12))


def _gont(r, b, p, lewo, prawo, kalenica, spad, szczyt):
    """Rzędy gontu na połaci dachu — trzy kreski wzdłuż spadku wystarczą,
    żeby dach przestał być trójkątem jednego koloru."""
    for i in range(1, 4):
        t = i / 4
        y = spad + (szczyt - spad) * t
        lx = lewo + (kalenica - lewo) * t
        px = prawo + (kalenica - prawo) * t
        r.prost([b * lx, b * y, b * px, b * (y + 0.008)], fill=p.d(-0.28))


def _spoiny(r, b, p, x0, y0, x1, y1, rzedy=5):
    """Spoiny muru: cegły w mijankę. Rysujemy je ciemniejszą kreską, nie
    obrysem każdej cegły — z odległości ekranu i tak liczy się tylko rytm."""
    kamien = mieszaj(p.sciana, (120, 124, 136), 0.4)
    fuga = mieszaj(kamien, (0, 0, 0), 0.32)
    for i in range(1, rzedy):
        y = y0 + (y1 - y0) * i / rzedy
        r.prost([b * x0, b * y, b * x1, b * (y + 0.005)], fill=fuga)
        krok = (x1 - x0) / 4
        for k in range(4):
            x = x0 + krok * (k + (0.5 if i % 2 else 0))
            if x0 < x < x1:
                r.prost([b * x, b * y, b * (x + 0.005), b * (y + (y1 - y0) / rzedy)], fill=fuga)


def _okno(r, b, p, cx, cy, s=1.0):
    """Okno świeci. To jedyny sposób, żeby budynek wyglądał na zamieszkany."""
    w, h = b * 0.035 * s, b * 0.05 * s
    r.prost([b * cx - w, b * cy - h, b * cx + w, b * cy + h], fill=mieszaj(p.akcent, (0, 0, 0), 0.25))
    r.prost([b * cx - w * 0.6, b * cy - h * 0.7, b * cx + w * 0.6, b * cy + h * 0.2],
            fill=p.akcent)


def _choragiew(r, b, p, x, y, wys=0.22):
    """Chorągiewka na kalenicy — po niej widać, że budynek jest czyjś."""
    r.prost([b * x - b * 0.008, b * (y - wys), b * x + b * 0.008, b * y], fill=(60, 48, 40))
    r.wielokat([(b * x, b * (y - wys)), (b * (x + 0.11), b * (y - wys + 0.045)),
                (b * x, b * (y - wys + 0.09))], fill=p.akcent)


def ratusz(p: Paleta, stopien: int) -> Image.Image:
    """Ratusz. Trzy stopnie tej samej bryły — rośnie wzwyż, dostaje wieżę,
    a na końcu kopułę. Rozbudowa ma być widoczna z drugiego końca ekranu."""
    b = BRYLA
    r = Rys(b, b)
    _cien_pod(r, b, 0.44)
    gora = (0.52, 0.42, 0.3)[stopien]

    _sciana(r, b, p, 0.2, gora + 0.14, 0.8, 0.9)
    _deski(r, b, p, 0.2, gora + 0.14, 0.8, 0.9, 6)
    _dach(r, b, p, 0.14, 0.86, 0.5, gora + 0.15, gora)
    _gont(r, b, p, 0.14, 0.86, 0.5, gora + 0.15, gora)
    for i in range(3):
        _okno(r, b, p, 0.32 + i * 0.18, gora + 0.3, 1.1)
    # Wrota: ciemny łuk pośrodku, żeby było widać, gdzie się wchodzi.
    r.luk([b * 0.42, b * 0.66, b * 0.58, b * 0.82], 180, 360, fill=mieszaj(p.sciana, (0, 0, 0), 0.65))
    r.prost([b * 0.42, b * 0.74, b * 0.58, b * 0.9], fill=mieszaj(p.sciana, (0, 0, 0), 0.65))

    if stopien >= 1:
        # Wieża z boku — pierwszy znak, że miasto urosło.
        _sciana(r, b, p, 0.72, gora - 0.06, 0.88, 0.9)
        _deski(r, b, p, 0.72, gora - 0.06, 0.88, 0.9, 7)
        _dach(r, b, p, 0.68, 0.92, 0.8, gora - 0.05, gora - 0.22)
        _okno(r, b, p, 0.8, gora + 0.12)
    if stopien >= 2:
        # Kopuła i chorągiew: budynek najdroższy w mieście ma tak wyglądać.
        r.luk([b * 0.3, b * (gora - 0.28), b * 0.7, b * (gora + 0.12)], 180, 360, fill=p.akcent)
        r.luk([b * 0.34, b * (gora - 0.24), b * 0.62, b * (gora + 0.08)], 180, 360,
              fill=mieszaj(p.akcent, (255, 255, 255), 0.45))
        _choragiew(r, b, p, 0.5, gora - 0.24, 0.2)
    else:
        _choragiew(r, b, p, 0.5, gora, 0.18)
    return r.gotowe()


def fort(p: Paleta) -> Image.Image:
    """Fort: mur z bramą i dwiema basztami. Jedyny budynek, który działa na
    całe miasto naraz, więc jego sylwetka ma być zupełnie inna niż reszty —
    szeroka i niska, jak ściana, a nie dom."""
    b = BRYLA
    r = Rys(b, b)
    _cien_pod(r, b, 0.46)
    kamien = mieszaj(p.sciana, (120, 124, 136), 0.4)
    ciemny = mieszaj(kamien, (0, 0, 0), 0.35)

    r.prost([b * 0.1, b * 0.5, b * 0.9, b * 0.9], fill=kamien)
    r.prost([b * 0.1, b * 0.5, b * 0.9, b * 0.55], fill=mieszaj(kamien, (255, 255, 255), 0.3))
    # Blanki — bez nich mur jest po prostu prostokątem.
    for i in range(7):
        x = 0.12 + i * 0.115
        r.prost([b * x, b * 0.44, b * (x + 0.07), b * 0.52], fill=kamien)
        r.prost([b * x, b * 0.44, b * (x + 0.07), b * 0.47], fill=mieszaj(kamien, (255, 255, 255), 0.3))
    # Spoiny muru. Wcześniej stało tu pięć ciemniejszych plam „za fakturę"
    # i z odległości ekranu nie było ich w ogóle widać — mur czytał się jak
    # jednolita płyta. Rytm cegieł widać nawet wtedy, gdy pojedynczej nie.
    _spoiny(r, b, p, 0.1, 0.5, 0.9, 0.9, 5)

    r.luk([b * 0.4, b * 0.6, b * 0.6, b * 0.86], 180, 360, fill=(28, 22, 30))
    r.prost([b * 0.4, b * 0.73, b * 0.6, b * 0.9], fill=(28, 22, 30))
    for i in range(4):
        r.prost([b * (0.41 + i * 0.05), b * 0.62, b * (0.425 + i * 0.05), b * 0.9],
                fill=(0, 0, 0, 90))

    for x in (0.14, 0.72):
        r.prost([b * x, b * 0.36, b * (x + 0.14), b * 0.9], fill=kamien)
        r.prost([b * x, b * 0.36, b * (x + 0.03), b * 0.9], fill=mieszaj(kamien, (255, 255, 255), 0.25))
        r.wielokat([(b * (x - 0.02), b * 0.37), (b * (x + 0.07), b * 0.2),
                    (b * (x + 0.16), b * 0.37)], fill=p.d(-0.15))
        r.wielokat([(b * (x - 0.02), b * 0.37), (b * (x + 0.07), b * 0.2),
                    (b * (x + 0.07), b * 0.37)], fill=p.d(0.3))
        _okno(r, b, p, x + 0.07, 0.5)
    _choragiew(r, b, p, 0.21, 0.2, 0.16)
    _choragiew(r, b, p, 0.79, 0.2, 0.16)
    return r.gotowe()


def siedlisko(p: Paleta, poziom: int) -> Image.Image:
    """Siedlisko. Sześć poziomów to sześć różnych sylwetek, bo to jedyne
    budynki, które gracz porównuje ze sobą: musi widzieć na pierwszy rzut oka,
    że to nie jest ten sam dom w innym kolorze.

    Rosną: gniazdo → konar → kotlina → strumień → kopuła → prastare drzewo.
    Wysokość rośnie z poziomem, bo w mieście ma być widać hierarchię.
    """
    b = BRYLA
    r = Rys(b, b)
    _cien_pod(r, b, 0.3 + poziom * 0.025)

    if poziom == 0:
        # Gniazdo na pniaku. Pierwsza wersja stała na dwóch palach i czytała się
        # jak stolik z dwoma jajkami — dopiero pniak i wystające patyki mówią,
        # że to gniazdo.
        r.prost([b * 0.38, b * 0.64, b * 0.62, b * 0.9], fill=mieszaj(p.sciana, (0, 0, 0), 0.45))
        r.prost([b * 0.38, b * 0.64, b * 0.44, b * 0.9], fill=mieszaj(p.sciana, (0, 0, 0), 0.25))
        patyk = mieszaj(p.sciana, (0, 0, 0), 0.35)
        for x0, y0, x1, y1 in ((0.1, 0.56, 0.3, 0.62), (0.7, 0.62, 0.92, 0.55),
                               (0.14, 0.66, 0.32, 0.66), (0.68, 0.68, 0.88, 0.7)):
            r.wielokat([(b * x0, b * y0), (b * x1, b * y1), (b * x1, b * (y1 + 0.03)),
                        (b * x0, b * (y0 + 0.03))], fill=patyk)
        r.luk([b * 0.16, b * 0.4, b * 0.84, b * 0.82], 0, 180, fill=p.s(-0.25))
        r.luk([b * 0.21, b * 0.43, b * 0.79, b * 0.74], 0, 180, fill=p.s(0.15))
        r.elipsa([b * 0.26, b * 0.44, b * 0.74, b * 0.6], fill=mieszaj(p.sciana, (0, 0, 0), 0.55))
        # Jajka nierówno i różnej wielkości. Dwa jednakowe, ustawione
        # symetrycznie nad krawędzią gniazda, składały się w twarz z dwojgiem
        # oczu — widać to dopiero na gotowym obrazku.
        kula(r, b * 0.38, b * 0.53, b * 0.08, (255, 250, 235), (216, 204, 178))
        kula(r, b * 0.56, b * 0.5, b * 0.06, (255, 250, 235), (216, 204, 178))
        # Splotu na krawędzi gniazda nie ma i nie będzie: `ImageDraw` bez trybu
        # 'RGBA' WPISUJE alfę zamiast mieszać, więc półprzezroczysta kreska
        # wychodzi jaśniejszą plamą, a nie cieniem. Pełnym tonem czytała się
        # jak zęby. Brzeg zostaje gładki — na panoramie i tak jest mały.
    elif poziom == 1:
        # Konar: leżąca kłoda z wyciętym wejściem.
        r.elipsa([b * 0.12, b * 0.56, b * 0.92, b * 0.9], fill=p.s(-0.2))
        r.elipsa([b * 0.12, b * 0.52, b * 0.86, b * 0.82], fill=p.s(0.1))
        r.elipsa([b * 0.1, b * 0.52, b * 0.34, b * 0.82], fill=p.s(0.35))
        r.elipsa([b * 0.15, b * 0.57, b * 0.29, b * 0.77], fill=mieszaj(p.sciana, (0, 0, 0), 0.6))
        r.luk([b * 0.5, b * 0.6, b * 0.72, b * 0.9], 180, 360, fill=mieszaj(p.sciana, (0, 0, 0), 0.7))
        r.prost([b * 0.5, b * 0.74, b * 0.72, b * 0.86], fill=mieszaj(p.sciana, (0, 0, 0), 0.7))
        for i in range(3):
            r.elipsa([b * (0.36 + i * 0.06), b * 0.5, b * (0.46 + i * 0.06), b * 0.58],
                     fill=p.d(0.1))
    elif poziom == 2:
        # Kotlina: sadzawka w niecce, wokół kamienie.
        r.elipsa([b * 0.1, b * 0.52, b * 0.9, b * 0.92], fill=p.s(-0.35))
        r.elipsa([b * 0.16, b * 0.56, b * 0.84, b * 0.88], fill=mieszaj(p.akcent, p.dal, 0.45))
        r.elipsa([b * 0.24, b * 0.6, b * 0.6, b * 0.72],
                 fill=mieszaj(p.akcent, (255, 255, 255), 0.55))
        for cx, cy, s in ((0.14, 0.56, 0.9), (0.5, 0.5, 1.1), (0.86, 0.58, 0.8)):
            r.elipsa([b * (cx - 0.09 * s), b * (cy - 0.09 * s), b * (cx + 0.09 * s), b * (cy + 0.07 * s)],
                     fill=p.s(-0.15))
            r.elipsa([b * (cx - 0.07 * s), b * (cy - 0.08 * s), b * (cx + 0.03 * s), b * (cy - 0.01 * s)],
                     fill=p.s(0.3))
    elif poziom == 3:
        # Strumień z młynkiem: woda spada z progu skalnego.
        r.wielokat([(b * 0.08, b * 0.9), (b * 0.2, b * 0.42), (b * 0.62, b * 0.42),
                    (b * 0.76, b * 0.9)], fill=p.s(-0.3))
        r.wielokat([(b * 0.08, b * 0.9), (b * 0.2, b * 0.42), (b * 0.38, b * 0.9)], fill=p.s(0.2))
        woda = mieszaj(p.akcent, (255, 255, 255), 0.35)
        r.prost([b * 0.34, b * 0.44, b * 0.5, b * 0.9], fill=woda)
        r.prost([b * 0.34, b * 0.44, b * 0.39, b * 0.9], fill=mieszaj(woda, (255, 255, 255), 0.5))
        r.elipsa([b * 0.24, b * 0.84, b * 0.62, b * 0.96], fill=woda)
        # Koło młyńskie: znak, że to budynek, a nie skała z wodą. Same łuki
        # dawały wachlarz — koło czyta się dopiero z obręczą, piastą i szprychami.
        obr = mieszaj(p.sciana, (0, 0, 0), 0.45)
        r.elipsa([b * 0.54, b * 0.48, b * 0.94, b * 0.88], fill=obr)
        r.elipsa([b * 0.585, b * 0.525, b * 0.895, b * 0.835], fill=p.d(-0.1))
        r.elipsa([b * 0.63, b * 0.57, b * 0.85, b * 0.79], fill=(0, 0, 0, 0))
        for i in range(8):
            kat = i * 45
            r.luk([b * 0.6, b * 0.54, b * 0.88, b * 0.82], kat, kat + 14, fill=obr)
        r.elipsa([b * 0.7, b * 0.64, b * 0.78, b * 0.72], fill=obr)
        r.elipsa([b * 0.715, b * 0.655, b * 0.765, b * 0.705], fill=p.s(0.3))
    elif poziom == 4:
        # Kopuła: pierwszy budynek, który wygląda na zbudowany, a nie znaleziony.
        r.luk([b * 0.1, b * 0.34, b * 0.9, b * 1.06], 180, 360, fill=p.s(-0.2))
        r.luk([b * 0.16, b * 0.4, b * 0.72, b * 1.0], 180, 360, fill=p.s(0.2))
        r.luk([b * 0.36, b * 0.62, b * 0.64, b * 0.94], 180, 360,
              fill=mieszaj(p.sciana, (0, 0, 0), 0.7))
        r.prost([b * 0.36, b * 0.78, b * 0.64, b * 0.9], fill=mieszaj(p.sciana, (0, 0, 0), 0.7))
        for i, x in enumerate((0.24, 0.5, 0.76)):
            r.elipsa([b * (x - 0.05), b * (0.42 + abs(i - 1) * 0.06), b * (x + 0.05),
                      b * (0.52 + abs(i - 1) * 0.06)], fill=p.akcent)
        _choragiew(r, b, p, 0.5, 0.36, 0.18)
    else:
        # Prastare drzewo: najwyższa bryła w mieście. Korona wychodzi poza
        # połowę płótna, żeby na panoramie górowała nad wszystkim.
        r.prost([b * 0.4, b * 0.44, b * 0.6, b * 0.9], fill=p.s(-0.15))
        r.prost([b * 0.4, b * 0.44, b * 0.46, b * 0.9], fill=p.s(0.3))
        r.wielokat([(b * 0.4, b * 0.9), (b * 0.24, b * 0.9), (b * 0.4, b * 0.7)], fill=p.s(-0.15))
        r.wielokat([(b * 0.6, b * 0.9), (b * 0.76, b * 0.9), (b * 0.6, b * 0.7)], fill=p.s(-0.15))
        korona = p.d(0)
        for cx, cy, rr in ((0.5, 0.24, 0.28), (0.28, 0.34, 0.19), (0.72, 0.34, 0.19),
                           (0.38, 0.16, 0.15), (0.64, 0.18, 0.15)):
            r.elipsa([b * (cx - rr), b * (cy - rr), b * (cx + rr), b * (cy + rr)], fill=korona)
        for cx, cy, rr in ((0.44, 0.2, 0.2), (0.3, 0.3, 0.12), (0.62, 0.28, 0.12)):
            r.elipsa([b * (cx - rr), b * (cy - rr), b * (cx + rr), b * (cy + rr)], fill=p.d(0.3))
        r.luk([b * 0.42, b * 0.6, b * 0.58, b * 0.9], 180, 360, fill=(30, 24, 30))
        r.prost([b * 0.42, b * 0.74, b * 0.58, b * 0.9], fill=(30, 24, 30))
        for cx, cy in ((0.36, 0.26), (0.6, 0.2), (0.5, 0.4)):
            kula(r, b * cx, b * cy, b * 0.035, p.akcent, mieszaj(p.akcent, (0, 0, 0), 0.4))
    return r.gotowe()


def specjalny(p: Paleta, frakcja: str) -> Image.Image:
    """Budynek specjalny — jedyny, który różni się między frakcjami kształtem,
    bo daje inny surowiec i to musi być widać: krzew jagodowy, żyła odłamków,
    piec na kamienie ewolucji."""
    b = BRYLA
    r = Rys(b, b)
    _cien_pod(r, b, 0.32)

    if frakcja == 'bor':
        r.prost([b * 0.46, b * 0.6, b * 0.54, b * 0.9], fill=mieszaj(p.sciana, (0, 0, 0), 0.45))
        for cx, cy, rr in ((0.5, 0.46, 0.26), (0.3, 0.56, 0.17), (0.7, 0.56, 0.17)):
            r.elipsa([b * (cx - rr), b * (cy - rr), b * (cx + rr), b * (cy + rr)], fill=p.d(-0.15))
            r.elipsa([b * (cx - rr * 0.8), b * (cy - rr * 0.9), b * (cx + rr * 0.5),
                      b * (cy + rr * 0.2)], fill=p.d(0.25))
        for cx, cy in ((0.4, 0.42), (0.58, 0.5), (0.3, 0.58), (0.68, 0.6), (0.5, 0.62)):
            kula(r, b * cx, b * cy, b * 0.045, (232, 78, 96), (150, 34, 50))
    elif frakcja == 'grota':
        r.wielokat([(b * 0.12, b * 0.9), (b * 0.3, b * 0.5), (b * 0.72, b * 0.46),
                    (b * 0.9, b * 0.9)], fill=p.s(-0.25))
        r.wielokat([(b * 0.12, b * 0.9), (b * 0.3, b * 0.5), (b * 0.44, b * 0.9)], fill=p.s(0.2))
        for cx, cy, s in ((0.36, 0.72, 1.1), (0.54, 0.62, 1.4), (0.68, 0.76, 0.9)):
            w, h = b * 0.06 * s, b * 0.16 * s
            r.wielokat([(b * cx, b * cy - h), (b * cx + w, b * cy), (b * cx, b * cy + h * 0.4),
                        (b * cx - w, b * cy)], fill=mieszaj(p.akcent, (0, 0, 0), 0.25))
            r.wielokat([(b * cx, b * cy - h), (b * cx, b * cy + h * 0.4), (b * cx - w, b * cy)],
                       fill=mieszaj(p.akcent, (255, 255, 255), 0.4))
    else:
        _sciana(r, b, p, 0.22, 0.48, 0.78, 0.9)
        _deski(r, b, p, 0.22, 0.48, 0.78, 0.9, 5)
        _dach(r, b, p, 0.16, 0.84, 0.5, 0.5, 0.32)
        _gont(r, b, p, 0.16, 0.84, 0.5, 0.5, 0.32)
        # Komin z żarem: piec ma być widać po tym, że się z niego kurzy.
        r.prost([b * 0.62, b * 0.24, b * 0.74, b * 0.5], fill=p.s(-0.2))
        for i, (cx, cy, rr) in enumerate(((0.68, 0.2, 0.06), (0.72, 0.12, 0.045), (0.66, 0.06, 0.03))):
            r.elipsa([b * (cx - rr), b * (cy - rr), b * (cx + rr), b * (cy + rr)],
                     fill=(*mieszaj(p.akcent, (255, 255, 255), 0.3), 150 - i * 40))
        r.luk([b * 0.38, b * 0.62, b * 0.62, b * 0.86], 180, 360, fill=(30, 20, 24))
        r.prost([b * 0.38, b * 0.74, b * 0.62, b * 0.9], fill=(30, 20, 24))
        r.elipsa([b * 0.42, b * 0.68, b * 0.58, b * 0.88], fill=p.akcent)
        r.elipsa([b * 0.45, b * 0.72, b * 0.55, b * 0.86],
                 fill=mieszaj(p.akcent, (255, 255, 255), 0.6))
    return r.gotowe()


# ---------------------------------------------------------------------------
# ŚWIATŁO
# ---------------------------------------------------------------------------
#
# Bryły rysujemy z płaskich plam koloru — i tak właśnie wyglądały: jak wycinanki
# z papieru. Wzorzec (Songs of Conquest) wygrywa nie kształtem, tylko tym, że
# każda bryła ma na sobie ŚWIATŁO: ścianę odwróconą od słońca, półcień, jasną
# krawędź od strony światła i przyciemnienie przy ziemi.
#
# Robimy to jednym przebiegiem po gotowym rysunku, a nie ręcznie w każdym
# kształcie. Powód jest praktyczny: kształtów jest trzydzieści trzy, a ręczne
# dokładanie im walorów kończy się tym, że każdy ma inny kierunek światła.
# Przebieg gwarantuje, że CAŁE miasto jest oświetlone z jednej strony.

#: Skąd pada światło. Zgodne ze słońcem na panoramie (prawa góra) — jeśli
#: kiedyś słońce przejedzie na lewo, ta stała musi pojechać z nim.
KIERUNEK = (1, -1)


def _maska_swiatla(a: Image.Image, promien: float) -> np.ndarray:
    """Ile światła dociera w dane miejsce bryły — 0 w cieniu, 1 w pełnym.

    Sylwetkę przesuwamy w stronę źródła i rozmywamy: tam, gdzie przesunięta
    sylwetka nadal pokrywa oryginał, światło dociera; przy przeciwległej
    krawędzi zanika. To nie są prawdziwe normalne, ale na bryłach złożonych
    z kilku płaskich ścian daje dokładnie to, o co chodzi — miękkie przejście
    od strony oświetlonej do zacienionej.
    """
    dx, dy = KIERUNEK
    krok = max(2, int(a.width * 0.06))
    przesunieta = ImageChops.offset(a, dx * krok, dy * krok)
    m = np.asarray(przesunieta.filter(ImageFilter.GaussianBlur(promien))).astype(np.float32) / 255
    return m


def modeluj(im: Image.Image, sila: float = 1.0) -> Image.Image:
    """Nakłada na bryłę światło, cień własny, krawędź świetlną i szum materiału."""
    a = im.getchannel('A')
    kolor = np.asarray(im.convert('RGB')).astype(np.float32)
    h, w = kolor.shape[:2]

    # 1. Strona odwrócona od słońca ciemnieje, oświetlona rozjaśnia się.
    m = _maska_swiatla(a, promien=w * 0.09)[:, :, None]
    kolor *= 0.42 + 0.76 * m * sila

    # 2. Przy ziemi ciemniej — światło nie dochodzi pod bryłę. Bez tego budynek
    #    świeci równo do samego dołu i wygląda, jakby lewitował.
    y = (np.linspace(0, 1, h) ** 2.2)[:, None, None]
    kolor *= 1 - 0.34 * y * sila

    # 3. Krawędź świetlna: wąski pas na obrysie od strony słońca. To ona
    #    odkleja bryłę od tła — sam modelunek wnętrza tego nie robi.
    dx, dy = KIERUNEK
    wcięcie = max(1, int(w * 0.012))
    rdzen = ImageChops.offset(a, -dx * wcięcie, -dy * wcięcie)
    grzbiet = np.asarray(ImageChops.subtract(a, rdzen)).astype(np.float32) / 255
    grzbiet = grzbiet[:, :, None] * m
    kolor = kolor + (255 - kolor) * grzbiet * 0.8 * sila

    # 4. Szum materiału. Kilka procent, deterministycznie — gładkie pole koloru
    #    czyta się jak plastik, a nie jak kamień czy drewno.
    los = np.random.default_rng(11)
    szum = los.normal(0, 1, (h, w, 1)).astype(np.float32)
    szum = np.asarray(
        Image.fromarray(((szum * 40 + 128).clip(0, 255)).astype(np.uint8)[:, :, 0], 'L').filter(
            ImageFilter.GaussianBlur(0.6)
        )
    ).astype(np.float32)[:, :, None]
    kolor *= 1 + ((szum - 128) / 128) * 0.11 * sila

    wynik = Image.fromarray(kolor.clip(0, 255).astype(np.uint8), 'RGB').convert('RGBA')
    wynik.putalpha(a)

    # 5. Ciemny kant po stronie cienia — obrys, którego kształty z wektora
    #    nie mają, a bez którego bryła zlewa się z ziemią tego samego waloru.
    otoczka = ImageChops.subtract(a, ImageChops.offset(a, dx * wcięcie * 2, dy * wcięcie * 2))
    kant = Image.new('RGBA', im.size, (16, 12, 24, 255))
    kant.putalpha(otoczka.point(lambda v: int(v * 0.4 * sila)))
    wynik.alpha_composite(kant)
    return wynik


def zCieniem(im: Image.Image, ma_cien: bool = True) -> Image.Image:
    """Dokłada bryle cień rzucony na ziemię i przenosi ją na szersze płótno.

    Dlaczego wypalony w grafice, a nie robiony w scenie: cień musi być ŚCIĘTY
    (podstawa zostaje przy budynku, wierzchołek jedzie w bok) i rozmyty tym
    bardziej, im dalej od podstawy. Scena umie tylko obrócić kopię sprite'a
    wokół podstawy, a to daje drugą bryłę leżącą na ziemi na zawiasie — widać
    to od razu i wygląda gorzej niż brak cienia. Tutaj mamy przekształcenie
    afiniczne i rozmycie, czyli dokładnie te dwie rzeczy, których tam brakuje.
    """
    w, h = im.size
    plotno = Image.new('RGBA', (w + MARGINES_CIENIA, h), (0, 0, 0, 0))
    if ma_cien:
        a = im.getchannel('A')
        # Ścinanie: im wyżej piksel leży na bryle, tym dalej w lewo ląduje jego
        # cień; do tego całość spłaszczona, bo cień kładzie się na ziemi.
        scinanie = 0.85
        splaszczenie = 0.4
        cien = a.transform(
            (w + MARGINES_CIENIA, h),
            Image.AFFINE,
            (1, scinanie, MARGINES_CIENIA - scinanie * h, 0, 1 / splaszczenie, h * (1 - 1 / splaszczenie)),
            resample=Image.BILINEAR,
        )
        cien = cien.filter(ImageFilter.GaussianBlur(w * 0.009))
        # Cień słabnie z odległością od podstawy. Równa plama na całej długości
        # czyta się jak druga bryła leżąca na ziemi; zanik robi z niej cień.
        zanik = np.linspace(0.3, 1.0, cien.width, dtype=np.float32)[None, :]
        alfa = (np.asarray(cien).astype(np.float32) * zanik * 0.9).clip(0, 255)
        warstwa = Image.new('RGBA', plotno.size, (14, 22, 20, 255))
        warstwa.putalpha(Image.fromarray(alfa.astype(np.uint8), 'L'))
        plotno.alpha_composite(warstwa)
    plotno.alpha_composite(im, (MARGINES_CIENIA, 0))
    return plotno


BUDYNKI = {
    'ratusz1': lambda p, f: ratusz(p, 0),
    'ratusz2': lambda p, f: ratusz(p, 1),
    'ratusz3': lambda p, f: ratusz(p, 2),
    'fort': lambda p, f: fort(p),
    'siedlisko1': lambda p, f: siedlisko(p, 0),
    'siedlisko2': lambda p, f: siedlisko(p, 1),
    'siedlisko3': lambda p, f: siedlisko(p, 2),
    'siedlisko4': lambda p, f: siedlisko(p, 3),
    'siedlisko5': lambda p, f: siedlisko(p, 4),
    'siedlisko6': lambda p, f: siedlisko(p, 5),
    'specjalny': lambda p, f: specjalny(p, f),
}


def plan(im: Image.Image, p: Paleta) -> Image.Image:
    """Miejsce pod budowę: fundament, tyczki i widmo bryły nad nimi.

    Heroes 3 nie pokazuje budynków, których nie ma. My pokazujemy, bo panorama
    JEST u nas menu budowy — dziecko musi widzieć, co jeszcze może stanąć i gdzie.
    Pierwsza wersja rysowała biały kontur wektorowy i krytyk dwa razy z rzędu
    wytknął to samo: cienka biała linia to inny język graficzny niż reszta
    kadru, więc czyta się jak niedokończony placeholder, a nie jak plan.
    Teraz plac budowy jest NAMALOWANY tak samo jak wszystko inne — wytyczony
    fundament i tyczki stoją w świecie, a bryła nad nimi jest tylko zapowiedzią.
    """
    w, h = im.size
    plansza = Image.new('RGBA', im.size, (0, 0, 0, 0))
    r = Rys(w, h)

    a = im.getchannel('A')
    bbox = a.getbbox() or (0, 0, w, h)
    lewo, prawo = bbox[0] / w, bbox[2] / w
    dol = bbox[3] / h

    # Wytyczony obrys fundamentu — wąska rynna w ziemi z jaśniejszym wnętrzem.
    ziemia = mieszaj(p.ziemia, (0, 0, 0), 0.25)
    piach = mieszaj(p.ziemia, p.swiatlo, 0.42)
    r.elipsa([w * lewo, h * (dol - 0.1), w * prawo, h * (dol + 0.02)], fill=(*ziemia, 190))
    r.elipsa(
        [w * lewo + w * 0.02, h * (dol - 0.085), w * prawo - w * 0.02, h * (dol + 0.005)],
        fill=(*piach, 210),
    )

    # Tyczki z rozciągniętym sznurem — znak, że miejsce jest wytyczone.
    drewno = mieszaj(p.sciana, (92, 62, 34), 0.55)
    for u in (lewo + 0.02, (lewo + prawo) / 2, prawo - 0.02):
        x = w * u
        r.prost([x - w * 0.006, h * (dol - 0.13), x + w * 0.006, h * (dol - 0.02)], fill=drewno)
    r.prost(
        [w * lewo + w * 0.02, h * (dol - 0.125), w * prawo - w * 0.02, h * (dol - 0.118)],
        fill=mieszaj(drewno, p.swiatlo, 0.3),
    )
    plansza.alpha_composite(r.gotowe())

    # Widmo bryły: prawdziwy rysunek, tylko przygaszony. Kolor zostaje, bo to
    # ma być zapowiedź TEGO budynku, a nie ogólny znaczek „coś tu można".
    widmo = im.copy()
    widmo.putalpha(a.point(lambda v: int(v * 0.26)))
    plansza.alpha_composite(widmo)
    return plansza


def znak_budowy(p: Paleta) -> Image.Image:
    """Drewniany znak z lampką — stoi przy placu, na który już cię stać.

    Zastępuje gwiazdkę z HUD-u. Ikona interfejsu rzucona na panoramę była
    jedyną rzeczą na tym ekranie, która nie należała do świata.
    """
    b = 90
    r = Rys(b, b)
    drewno = mieszaj(p.sciana, (96, 64, 36), 0.5)
    r.prost([b * 0.44, b * 0.3, b * 0.56, b * 0.95], fill=drewno)
    r.prost([b * 0.44, b * 0.3, b * 0.48, b * 0.95], fill=mieszaj(drewno, p.swiatlo, 0.3))
    r.prost([b * 0.18, b * 0.24, b * 0.82, b * 0.46], fill=mieszaj(drewno, p.swiatlo, 0.18))
    r.prost([b * 0.18, b * 0.24, b * 0.82, b * 0.29], fill=mieszaj(drewno, p.swiatlo, 0.4))
    # Lampka: to ona ma przyciągać wzrok, więc świeci najjaśniejszym tonem miasta.
    for i, rr in enumerate((0.2, 0.13, 0.08)):
        r.elipsa(
            [b * (0.5 - rr), b * (0.35 - rr), b * (0.5 + rr), b * (0.35 + rr)],
            fill=(*p.akcent, 60 + i * 70),
        )
    r.elipsa([b * 0.44, b * 0.29, b * 0.56, b * 0.41], fill=(255, 250, 226))
    return r.gotowe()


if __name__ == '__main__':
    KATALOG.mkdir(parents=True, exist_ok=True)
    for frakcja, p in PALETY.items():
        tlo = panorama(p, frakcja)
        tlo.save(KATALOG / f'tlo-{frakcja}.png')
        print(f'  tlo-{frakcja}.png  {tlo.width} × {tlo.height}')
        for nazwa, rys in BUDYNKI.items():
            bryla = modeluj(rys(p, frakcja))
            zCieniem(bryla).save(KATALOG / f'{frakcja}-{nazwa}.png')
            if frakcja == 'bor':
                # Zarys nie rzuca cienia — to plan budowy, a nie budynek —
                # ale musi mieć TO SAMO płótno, inaczej po postawieniu budynek
                # przeskoczyłby w bok o szerokość marginesu.
                zCieniem(plan(bryla, p), ma_cien=False).save(KATALOG / f'plan-{nazwa}.png')
        znak_budowy(p).save(KATALOG / f'znak-{frakcja}.png')
        print(f'  {frakcja}: {len(BUDYNKI)} budynków')
    print('  plany budowy: wspólne dla frakcji (zarys nie ma barwy)')
