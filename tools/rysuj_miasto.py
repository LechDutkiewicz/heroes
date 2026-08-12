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
import sys
from pathlib import Path

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

    def __init__(self, niebo, dal, ziemia, sciana, dach, akcent, swiatlo):
        self.niebo = rgb(niebo)
        self.dal = rgb(dal)
        self.ziemia = rgb(ziemia)
        self.sciana = rgb(sciana)
        self.dach = rgb(dach)
        self.akcent = rgb(akcent)
        self.swiatlo = rgb(swiatlo)

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
    ),
    # Grota: podziemne jezioro. Zimny kamień, fioletowy kryształ, błękitne światło.
    'grota': Paleta(
        niebo=0x2b2350, dal=0x3d3470, ziemia=0x3a3358,
        sciana=0x8e8ab0, dach=0x9d5cc4, akcent=0x67e3ff, swiatlo=0xe8e2ff,
    ),
    # Zbocze: zmierzch nad popiołem. Bazalt, rdzawe dachy, żar w szczelinach.
    'zbocze': Paleta(
        niebo=0x8c4a33, dal=0x5c352c, ziemia=0x4a3630,
        sciana=0x7b6a63, dach=0xd1622f, akcent=0xffb03a, swiatlo=0xffd9a8,
    ),
}


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
    horyzont = int(H * 0.46)

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

    # --- pas zieleni (albo skał) tuż za horyzontem ---
    # Sam styk nieba z ziemią jest linijką ciągnącą się przez cały ekran.
    # Rząd drobnych garbów łamie ją i daje wrażenie, że coś tam rośnie.
    los_pas = random.Random(3)
    kolor_pasa = mieszaj(p.dal, (0, 0, 0), 0.25)
    for i in range(90):
        x = W * i / 89
        h = H * (0.008 + 0.016 * los_pas.random())
        w = W * 0.014
        d.ellipse([x - w, horyzont - h, x + w, horyzont + h * 0.5], fill=kolor_pasa)

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

    # --- drobiazgi pod nogami, żeby ziemia nie była gładką plamą ---
    los = random.Random(7)
    for _ in range(220):
        t = los.random()
        x = los.random() * W
        y = horyzont + (H - horyzont) * (t**1.4)
        s = W * 0.002 * (0.4 + t)
        kolor = mieszaj(p.ziemia, p.swiatlo if los.random() < 0.5 else (0, 0, 0), 0.12)
        d.ellipse([x - s * 2.4, y - s, x + s * 2.4, y + s], fill=kolor)

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
    r.elipsa([b * (0.5 - szer), b * 0.9, b * (0.5 + szer), b * 0.98], fill=(0, 0, 0, 70))


def _dach(r, b, p, lewo, prawo, kalenica, spad, szczyt=None):
    """Dwuspadowy dach. Lewa połać jaśniejsza — światło pada z lewej góry,
    tak samo jak na wszystkich stworkach, więc bryły nie kłócą się z armią."""
    r.wielokat([(b * lewo, b * spad), (b * kalenica, b * (szczyt or spad - 0.2)),
                (b * prawo, b * spad)], fill=p.d(-0.25))
    r.wielokat([(b * lewo, b * spad), (b * kalenica, b * (szczyt or spad - 0.2)),
                (b * kalenica, b * spad)], fill=p.d(0.3))


def _sciana(r, b, p, x0, y0, x1, y1):
    r.prost([b * x0, b * y0, b * x1, b * y1], fill=p.s(0))
    r.prost([b * x0, b * y0, b * (x0 + 0.035), b * y1], fill=p.s(0.35))
    r.prost([b * (x1 - 0.03), b * y0, b * x1, b * y1], fill=p.s(-0.3))


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
    _dach(r, b, p, 0.14, 0.86, 0.5, gora + 0.15, gora)
    for i in range(3):
        _okno(r, b, p, 0.32 + i * 0.18, gora + 0.3, 1.1)
    # Wrota: ciemny łuk pośrodku, żeby było widać, gdzie się wchodzi.
    r.luk([b * 0.42, b * 0.66, b * 0.58, b * 0.82], 180, 360, fill=mieszaj(p.sciana, (0, 0, 0), 0.65))
    r.prost([b * 0.42, b * 0.74, b * 0.58, b * 0.9], fill=mieszaj(p.sciana, (0, 0, 0), 0.65))

    if stopien >= 1:
        # Wieża z boku — pierwszy znak, że miasto urosło.
        _sciana(r, b, p, 0.72, gora - 0.06, 0.88, 0.9)
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
    # Kamienie w murze: kilka ciemniejszych plam wystarczy za fakturę.
    for i, (x, y) in enumerate(((0.18, 0.62), (0.34, 0.7), (0.62, 0.6), (0.76, 0.72), (0.46, 0.84))):
        r.prost([b * x, b * y, b * (x + 0.09), b * (y + 0.05)], fill=ciemny)

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
        _dach(r, b, p, 0.16, 0.84, 0.5, 0.5, 0.32)
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


def plan(im: Image.Image) -> Image.Image:
    """Wersja „placu budowy": ta sama bryła jako blady zarys.

    Heroes 3 nie pokazuje budynków, których nie ma. My pokazujemy, bo panorama
    JEST u nas menu budowy — dziecko ma widzieć, co jeszcze może stanąć i gdzie,
    zamiast szukać tego w liście. Zarys musi być wyraźnie inny od gotowej bryły,
    inaczej ekran kłamie o tym, co już stoi: stąd jeden zimny ton zamiast barw
    i świecący kontur zamiast pełnej sylwetki.
    """
    a = im.getchannel('A')
    # Obwódka to sylwetka minus jej zwężenie — grubość wychodzi stała
    # niezależnie od kształtu bryły.
    obwodka = ImageChops.subtract(a, a.filter(ImageFilter.MinFilter(9)))
    # Sam biały kontur ginął na jasnej trawie Boru. Ciemna otoczka pod nim
    # sprawia, że zarys czyta się i na zielonym południu, i na fiolecie Groty —
    # ta sama sztuczka, co z konturem napisów w HUD-zie.
    otoczka = ImageChops.subtract(a.filter(ImageFilter.MaxFilter(7)), a)

    wypelnienie = Image.new('RGBA', im.size, (26, 42, 60, 255))
    wypelnienie.putalpha(a.point(lambda v: int(v * 0.30)))
    ciemna = Image.new('RGBA', im.size, (18, 32, 46, 255))
    ciemna.putalpha(otoczka.point(lambda v: int(v * 0.5)))
    kontur = Image.new('RGBA', im.size, (240, 250, 255, 255))
    kontur.putalpha(obwodka.point(lambda v: int(v * 0.9)))
    plansza = Image.new('RGBA', im.size, (0, 0, 0, 0))
    plansza.alpha_composite(ciemna)
    plansza.alpha_composite(wypelnienie)
    plansza.alpha_composite(kontur)
    return plansza


if __name__ == '__main__':
    KATALOG.mkdir(parents=True, exist_ok=True)
    for frakcja, p in PALETY.items():
        tlo = panorama(p, frakcja)
        tlo.save(KATALOG / f'tlo-{frakcja}.png')
        print(f'  tlo-{frakcja}.png  {tlo.width} × {tlo.height}')
        for nazwa, rys in BUDYNKI.items():
            im = rys(p, frakcja)
            im.save(KATALOG / f'{frakcja}-{nazwa}.png')
            if frakcja == 'bor':
                plan(im).save(KATALOG / f'plan-{nazwa}.png')
        print(f'  {frakcja}: {len(BUDYNKI)} budynków')
    print('  plany budowy: wspólne dla frakcji (zarys nie ma barwy)')
