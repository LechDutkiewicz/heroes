#!/usr/bin/env python3
"""Składa gotowe tło planszy przygody: teren, brzegi, drogi.

Dlaczego to idzie do pliku, a nie do sceny
------------------------------------------
Wcześniej scena składała mapę z kafelków w czasie gry. Miało to dwie wady,
których nie dało się obejść w przeglądarce: teren był kanciasty obok gładkich
stworków, a droga rysowana osobną warstwą wektorową była gładka tuż obok
kanciastego terenu — najostrzejszy kontrast na całym ekranie. Teraz mapa
powstaje tutaj, w jednym obrazku, a scena tylko go pokazuje.

Skąd bierze się teren
---------------------
Z tekstur modelu graficznego (`public/mapa/teren/`), malowanych od razu
w skali ekranu i wycinanych miękkimi maskami — patrz `teren_malowanie.py`.
Poprzednia wersja składała teren z arkusza 16-pikselowego i powiększała go
trzykrotnie; przy teksturach 768 × 768 ta droga wyrzuciłaby cały detal,
po który po nie sięgnęliśmy.

Woda ma cztery klatki animacji, więc i plansza ma cztery klatki.

Kontrola zgodności
------------------
Skrypt zapisuje obok obrazków odcisk rysunku mapy. `tools/probe-mapa.ts`
sprawdza, czy odcisk zgadza się z bieżącym terenem — inaczej łatwo
zmienić planszę w kodzie i oglądać stare tło, nie wiedząc o tym.

    python3 tools/render_mapa.py
"""

import hashlib
import json
import re
import sys
from pathlib import Path

import numpy as np
from PIL import Image, ImageChops, ImageDraw, ImageFilter

sys.path.insert(0, str(Path(__file__).resolve().parent))
from teren_malowanie import ZIARNO, kafelkuj, maska, tekstura  # noqa: E402

KORZEN = Path(__file__).resolve().parent.parent
KATALOG = KORZEN / 'public' / 'mapa'

KAFEL = 48                  # bok pola na ekranie
#: Ile razy nadpróbkowujemy maskę drogi, zanim ją zmniejszymy. Rysowanie
#: wprost w docelowej skali dawało schodkowe brzegi.
NAD = 4

# Warstwy terenu od spodu do wierzchu: (tekstura, znaki rysunku, wtapianie,
# poszarpanie). Trawa jest podkładem pod wszystkim, więc nie ma tu maski.
#
# Las i skały ZOSTAJĄ w podkładzie, choć w scenie stoją na nich sprite'y drzew
# i głazów: ściółka pod drzewem ma inny kolor niż łąka i bez tego kępa lasu
# wygląda jak drzewa postawione na trawniku.
WARSTWY = [
    ('las', 'T', 0.55, 0.30),
    ('skaly', '#', 0.45, 0.34),
    ('piasek', ',', 0.55, 0.34),
    ('woda', '~', 0.35, 0.22),
]

#: Przesunięcie tekstury wody w kolejnych klatkach, w pikselach. Woda ma
#: PŁYNĄĆ, a nie migać: kilka pikseli na klatkę czyta się jak leniwy prąd,
#: kilkanaście — jak przeskok obrazu.
PRAD = [(0, 0), (5, 3), (10, 6), (15, 9)]


def wczytaj_rysunek():
    src = (KORZEN / 'src' / 'data' / 'plansza-teren.ts').read_text(encoding='utf-8')
    blok = re.search(r'export const TEREN = \[(.*?)\];', src, re.S).group(1)
    return re.findall(r"'([^']+)'", blok)


RYSUNEK = wczytaj_rysunek()
WYS, SZER = len(RYSUNEK), len(RYSUNEK[0])
W, H = SZER * KAFEL, WYS * KAFEL


def pola(znaki: str) -> np.ndarray:
    return np.array(
        [[1.0 if c in znaki else 0.0 for c in wiersz] for wiersz in RYSUNEK], dtype=np.float32
    )


def maska_drogi() -> Image.Image:
    """Droga jako gładka wstęga łącząca środki sąsiadujących pól ścieżki.

    W Heroes 3 drogi są ciągłą wstęgą z rozwidleniami, a nie kwadratami pole
    po polu — i tylko dlatego widać na pierwszy rzut oka, że tędy idzie się
    taniej. Zwracamy samą maskę; teksturę ścieżki nakłada przez nią wywołujący.
    """
    im = Image.new('L', (W * NAD, H * NAD), 0)
    d = ImageDraw.Draw(im)
    jest = lambda x, y: 0 <= x < SZER and 0 <= y < WYS and RYSUNEK[y][x] == '='
    srodek = lambda x, y: ((x * KAFEL + KAFEL / 2) * NAD, (y * KAFEL + KAFEL / 2) * NAD)

    g = 0.46 * KAFEL * NAD
    for y in range(WYS):
        for x in range(SZER):
            if not jest(x, y):
                continue
            a = srodek(x, y)
            # Tylko połowa kierunków — odcinek rysowany z obu końców byłby
            # rysowany dwa razy.
            for dx, dy in ((1, 0), (0, 1), (1, 1), (1, -1)):
                if jest(x + dx, y + dy):
                    d.line([a, srodek(x + dx, y + dy)], fill=255, width=int(g))
    # Kółka po odcinkach, nie przed: przy odwrotnej kolejności na zakrętach
    # zostawały jasne trójkąty.
    for y in range(WYS):
        for x in range(SZER):
            if jest(x, y):
                cx, cy = srodek(x, y)
                d.ellipse([cx - g / 2, cy - g / 2, cx + g / 2, cy + g / 2], fill=255)
    return im.resize((W, H), Image.LANCZOS).filter(ImageFilter.GaussianBlur(KAFEL * 0.06))


def klatka(k: int) -> Image.Image:
    plansza = kafelkuj(tekstura('trawa'), W, H)
    for n, (nazwa, znaki, wtapianie, poszarpanie) in enumerate(WARSTWY):
        if not any(c in znaki for wiersz in RYSUNEK for c in wiersz):
            continue
        przesun = PRAD[k] if nazwa == 'woda' else (0, 0)
        warstwa = kafelkuj(tekstura(nazwa), W, H, przesun)
        # Każda warstwa dostaje własne ziarno, inaczej wszystkie granice
        # falowałyby w tym samym rytmie i widać by było jeden wzór.
        m = maska(pola(znaki), KAFEL, wtapianie, poszarpanie, ZIARNO + n)
        plansza.paste(warstwa, (0, 0), m)
    plansza = plansza.convert('RGBA')
    sciezka = kafelkuj(tekstura('sciezka'), W, H).convert('RGBA')
    plansza.paste(sciezka, (0, 0), maska_drogi())
    return plansza


if __name__ == '__main__':
    KATALOG.mkdir(parents=True, exist_ok=True)
    klatki = [klatka(k) for k in range(4)]

    # Klatka 0 idzie w całości; kolejne TYLKO jako to, co się od niej różni,
    # reszta przezroczysta. Scena kładzie je na wierzch.
    #
    # Przy planszy 36 × 36 pełna klatka to 1728 × 1728 pikseli, a różni się
    # między klatkami wyłącznie woda — kilka procent mapy. Pierwsze podejście
    # wycinało prostokąt otaczający różnice, ale woda jest i na północnym
    # zachodzie, i na południowym wschodzie, więc prostokąt objął prawie całą
    # planszę i nic nie oszczędził. Przezroczysta maska nie ma tego problemu:
    # PNG ściska jednolitą przezroczystość niemal do zera.
    baza = klatki[0]
    baza.save(KATALOG / 'plansza-0.png')
    print(f'  plansza-0.png  {baza.width} × {baza.height}  (pełna)')

    for k in range(1, 4):
        rozne = (
            ImageChops.difference(klatki[k].convert('RGB'), baza.convert('RGB'))
            .convert('L')
            .point(lambda v: 255 if v > 8 else 0)
        )
        # Piksele spoza maski trzeba WYZEROWAĆ, nie tylko przykryć
        # przezroczystością. PNG zapisuje kolor także tam, gdzie alfa wynosi
        # zero, więc sama maska nie zmniejszyła pliku ani o bajt — dopiero
        # jednolite zero się ściska.
        tab = np.asarray(klatki[k]).copy()
        widoczne = np.asarray(rozne) > 0
        tab[~widoczne] = 0
        tab[:, :, 3] = np.where(widoczne, 255, 0)
        Image.fromarray(tab, 'RGBA').save(KATALOG / f'plansza-{k}.png')
        print(f'  plansza-{k}.png  naklejka, {widoczne.mean() * 100:.1f}% powierzchni')

    odcisk = hashlib.sha256('\n'.join(RYSUNEK).encode('utf-8')).hexdigest()[:16]
    (KATALOG / 'plansza.json').write_text(
        json.dumps({'odcisk': odcisk, 'szer': SZER, 'wys': WYS, 'kafel': KAFEL}, indent=2) + '\n',
        encoding='utf-8',
    )
    print(f'  odcisk terenu: {odcisk}')
