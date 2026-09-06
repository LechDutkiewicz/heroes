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
from PIL import Image, ImageDraw, ImageFilter

sys.path.insert(0, str(Path(__file__).resolve().parent))
import woda_dane  # noqa: E402
from teren_malowanie import (  # noqa: E402
    ZIARNO,
    kafelkuj,
    maska,
    szum,
    tekstura,
    warianty,
    zmieszaj,
)

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

def wczytaj_rysunek():
    src = (KORZEN / 'src' / 'data' / 'plansza-teren.ts').read_text(encoding='utf-8')
    blok = re.search(r'export const TEREN = \[(.*?)\];', src, re.S).group(1)
    return re.findall(r"'([^']+)'", blok)


def wczytaj_budowle():
    """Gdzie stoją zamki i kopalnie — i jak szeroki grunt im się należy.

    Zwraca `(x, y, szerokość, wysokość)` w polach, licząc od WEJŚCIA. Musi
    zgadzać się z `BRYLA` w `src/data/mapa.ts`; tam decyduje o przejezdności,
    tu o tym, ile ziemi jest wydeptane.
    """
    src = (KORZEN / 'src' / 'data' / 'plansza-teren.ts').read_text(encoding='utf-8')
    lista = []
    for m in re.finditer(r"'zamek (?:gracza|wroga)': \{ x: (\d+), y: (\d+) \}", src):
        lista.append((int(m.group(1)), int(m.group(2)), 3, 2))
    blok = re.search(r'export const ROZSTAWIENIE.*?\n\];', src, re.S).group(0)
    for m in re.finditer(r"\{ x: (\d+), y: (\d+), rodzaj: 'kopalnia'", blok):
        lista.append((int(m.group(1)), int(m.group(2)), 3, 1))
    return lista


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


def maska_gruntu() -> Image.Image:
    """Wydeptana ziemia pod zamkami i kopalniami.

    Po co
    -----
    Sprite'y z modelu są wycięte do samej sylwetki, więc budynek stał na trawie
    jak naklejka: nic go z tą trawą nie łączyło. W Heroes 3 grafiki miast mają
    pod sobą kawałek gruntu i dopiero to je OSADZA — budynek nie unosi się nad
    łąką, tylko stoi na wydeptanym placu, który sam się w nią wtapia.

    Malujemy ten plac w TLE planszy, a nie w pliku sprite'a. Dzięki temu jest
    naprawdę częścią terenu: nie przesuwa się względem niego, nie ma własnej
    krawędzi i wychodzi tą samą teksturą co ścieżki, więc plac przy zamku
    i droga do niego to jedno i to samo.
    """
    im = Image.new('L', (W * 2, H * 2), 0)
    d = ImageDraw.Draw(im)
    for x, y, szer, wys in wczytaj_budowle():
        # Elipsa szersza niż bryła i wysunięta przed wejście: plac ma
        # WYSTAWAĆ spod budynku, inaczej znów widać jego obrys.
        # Bryła stoi w rzędach nad wejściem, więc plac ma objąć i ją, i samo
        # wejście: od `y − wys` do `y`. Środek wypada w połowie tego pasma.
        cx = (x + 0.5) * KAFEL * 2
        cy = (y + 0.5 - wys / 2) * KAFEL * 2
        rx = (szer / 2 + 0.55) * KAFEL * 2
        ry = ((wys + 1) / 2 + 0.4) * KAFEL * 2
        d.ellipse([cx - rx, cy - ry, cx + rx, cy + ry], fill=255)
    im = im.resize((W, H), Image.LANCZOS)
    tab = np.asarray(im, dtype=np.float32) / 255.0
    # Rozmycie plus szum: brzeg placu ma być nierówny i przetarty, bo idealna
    # elipsa czyta się jak druga naklejka, tylko brązowa.
    # Dwie skale: grubsza wygina cały zarys, żeby plac przestał być elipsą,
    # drobniejsza przeciera sam brzeg. Jedna skala daje albo elipsę
    # z postrzępionym konturem, albo plamę bez kształtu.
    tab += szum(W, H, max(2, int(KAFEL * 2.2)), ZIARNO + 900) * 0.58
    tab += szum(W, H, max(2, int(KAFEL * 0.45)), ZIARNO + 901) * 0.22
    tab = ((tab - 0.5) * 1.9 + 0.5).clip(0, 1)
    return Image.fromarray((tab * 255).astype(np.uint8), 'L').filter(
        ImageFilter.GaussianBlur(KAFEL * 0.09)
    )


def klatka() -> tuple[Image.Image, Image.Image]:
    """Plansza i maska wody.

    Maska wraca razem z planszą, bo shader wody musi dostać DOKŁADNIE tę,
    którą tu namalowano. Policzona drugi raz — choćby tym samym wzorem —
    rozjechałaby się przy najmniejszej zmianie parametrów i na styku wody
    z lądem zostałby rąbek nienamalowanej wody albo nieruchomej tafli.
    """
    plansza = zmieszaj(warianty('trawa'), W, H, (0, 0), ZIARNO)
    maskaWody = Image.new('L', (W, H), 0)
    for n, (nazwa, znaki, wtapianie, poszarpanie) in enumerate(WARSTWY):
        if not any(c in znaki for wiersz in RYSUNEK for c in wiersz):
            continue
        warstwa = zmieszaj(warianty(nazwa), W, H, (0, 0), ZIARNO + 50 + n)
        # Każda warstwa dostaje własne ziarno, inaczej wszystkie granice
        # falowałyby w tym samym rytmie i widać by było jeden wzór.
        m = maska(pola(znaki), KAFEL, wtapianie, poszarpanie, ZIARNO + n)
        plansza.paste(warstwa, (0, 0), m)
        if nazwa == 'woda':
            maskaWody = m
    plansza = plansza.convert('RGBA')
    sciezka = kafelkuj(tekstura('sciezka'), W, H).convert('RGBA')
    # Place pod budowlami idą PRZED drogami: droga ma dobiegać do placu
    # i się z nim zlewać, a nie kończyć na jego brzegu.
    plansza.paste(sciezka, (0, 0), maska_gruntu())
    plansza.paste(sciezka, (0, 0), maska_drogi())
    return plansza, maskaWody


if __name__ == '__main__':
    KATALOG.mkdir(parents=True, exist_ok=True)
    baza, maskaWody = klatka()

    # Woda zostaje NAMALOWANA na planszy, choć rusza nią shader. To jest
    # zapasowa wersja obrazu: gdy karta nie da rady z shaderem, gracz zobaczy
    # nieruchomy staw zamiast dziury w mapie.
    baza.save(KATALOG / 'plansza-0.png')
    print(f'  plansza-0.png  {baza.width} × {baza.height}')

    # Klatki 1–3 były poprzednią animacją: cztery gotowe obrazy przełączane
    # co pół sekundy. Zostają usunięte, żeby nie leżały w `public` jako
    # kilkaset kilobajtów, których nikt już nie wczytuje.
    for k in range(1, 4):
        (KATALOG / f'plansza-{k}.png').unlink(missing_ok=True)

    woda_dane.zmarszczki()
    woda_dane.maska(RYSUNEK, KAFEL, maskaWody)

    odcisk = hashlib.sha256('\n'.join(RYSUNEK).encode('utf-8')).hexdigest()[:16]
    (KATALOG / 'plansza.json').write_text(
        json.dumps({'odcisk': odcisk, 'szer': SZER, 'wys': WYS, 'kafel': KAFEL}, indent=2) + '\n',
        encoding='utf-8',
    )
    print(f'  odcisk terenu: {odcisk}')
