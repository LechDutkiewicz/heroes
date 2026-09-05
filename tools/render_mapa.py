#!/usr/bin/env python3
"""Składa gotowe tło planszy przygody: teren, brzegi, drogi — wygładzone.

Dlaczego to idzie do pliku, a nie do sceny
------------------------------------------
Wcześniej scena składała mapę z kafelków w czasie gry. Działało, ale miało
dwie wady, których nie dało się obejść w przeglądarce:

1. Kafelki trzeba było powiększać trzykrotnie „najbliższym sąsiadem", więc
   teren był kanciasty, a stworki i HUD gładkie. Wygładzić da się dopiero
   CAŁĄ złożoną mapę — wygładzanie pojedynczych kafelków rozjeżdża się na
   ich stykach, bo filtr przy brzegu nie wie, co leży obok.
2. Drogi rysowaliśmy osobną warstwą wektorową, więc były idealnie gładkie
   tuż obok kanciastego terenu — najostrzejszy kontrast na całym ekranie.

Teraz mapa powstaje tutaj: kafelki, brzegi i drogi lądują w jednym obrazku,
który jest wygładzany jako całość. Scena tylko go pokazuje.

Arkusz ma cztery klatki wody, ale plansza ma ich osiem: `woda.wzbogac`
dokłada głębię, kaustyki i skry jako funkcję ciągłej fazy, więc podwojenie
liczby klatek planszy przy tych samych czterech klatkach arkusza daje
płynniejszą pętlę zamiast powtarzać co drugą klatkę.

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
from wygladzanie import SKALA, wygladz  # noqa: E402
from woda import wzbogac  # noqa: E402

KORZEN = Path(__file__).resolve().parent.parent
KATALOG = KORZEN / 'public' / 'mapa'

S = 16                      # bok kafelka w arkuszu
KAFEL = S * SKALA           # bok pola na ekranie
ARKUSZ_KOL = 52
#: Ile razy nadpróbkowujemy drogę, zanim ją zmniejszymy. Rysowanie wprost
#: w docelowej skali dawało schodkowe brzegi — czyli dokładnie to, co
#: właśnie usuwamy z terenu.
NAD = 4

# Litera terenu na potrzeby autokafelkowania. Las, skały i ścieżka stoją
# na trawie: las i skały dostaną sprite'y w scenie, droga jest tu dorysowana.
LITERA = {'.': 'G', '=': 'G', ',': 'P', 'T': 'G', '#': 'G', '~': 'W'}

DROGA_BRZEG = (156, 116, 68)
DROGA = (208, 166, 108)


def wczytaj_sygnatury():
    src = (KORZEN / 'src' / 'data' / 'kafelki.ts').read_text(encoding='utf-8')
    return {
        m.group(1): json.loads(m.group(2))
        for m in re.finditer(r'^  (\w{4}): (\[[^\]]*\]),$', src, re.M)
    }


def wczytaj_rysunek():
    src = (KORZEN / 'src' / 'data' / 'plansza-teren.ts').read_text(encoding='utf-8')
    blok = re.search(r'export const TEREN = \[(.*?)\];', src, re.S).group(1)
    return re.findall(r"'([^']+)'", blok)


SYGNATURY = wczytaj_sygnatury()
RYSUNEK = wczytaj_rysunek()
WYS, SZER = len(RYSUNEK), len(RYSUNEK[0])
arkusz = Image.open(KORZEN / 'public' / 'mapa-tileset.png').convert('RGBA')


def kafelek(indeks):
    c, r = indeks % ARKUSZ_KOL, indeks // ARKUSZ_KOL
    return arkusz.crop((c * S, r * S, (c + 1) * S, (r + 1) * S))


def litera(x, y):
    x = max(0, min(SZER - 1, x))
    y = max(0, min(WYS - 1, y))
    return LITERA[RYSUNEK[y][x]]


def teren(klatka):
    """Teren w skali arkusza, ułożony siatką przesuniętą o pół pola.

    Arkusz jest narożnikowy: o kafelku decydują cztery rogi, więc kafelki
    kładziemy na stykach pól, a nie na polach. Malujemy o rząd i kolumnę
    więcej z każdej strony, żeby przy brzegu planszy nie brakowało połówek.
    """
    im = Image.new('RGBA', (SZER * S, WYS * S))
    zapas = SYGNATURY['GGGG'][0]
    for j in range(WYS + 1):
        for i in range(SZER + 1):
            sig = litera(i - 1, j - 1) + litera(i, j - 1) + litera(i - 1, j) + litera(i, j)
            klatki = SYGNATURY.get(sig)
            if klatki is None:
                # Braki to wyłącznie układy „w szachownicę", których nie ma
                # w żadnym arkuszu autokafelkowania. Kładziemy wtedy teren,
                # którego w rogach jest najwięcej.
                przewaga = max(set(sig), key=sig.count)
                klatki = SYGNATURY.get(przewaga * 4, [zapas])
            im.paste(kafelek(klatki[klatka % len(klatki)]), (i * S - S // 2, j * S - S // 2))
    return im


def drogi(rozmiar):
    """Drogi jako gładka wstęga łącząca środki sąsiadujących pól ścieżki.

    Arkusz nie ma kafelków drogi. W Heroes 3 drogi też są ciągłą wstęgą
    z rozwidleniami, a nie kwadratami pole po polu — i tylko dlatego widać
    na pierwszy rzut oka, że tędy idzie się taniej.
    """
    w, h = rozmiar
    im = Image.new('RGBA', (w * NAD, h * NAD), (0, 0, 0, 0))
    d = ImageDraw.Draw(im)
    jest = lambda x, y: 0 <= x < SZER and 0 <= y < WYS and RYSUNEK[y][x] == '='
    srodek = lambda x, y: ((x * KAFEL + KAFEL / 2) * NAD, (y * KAFEL + KAFEL / 2) * NAD)

    # Dwa przejścia: ciemniejszy brzeg i jaśniejsza nawierzchnia. Trzeciego,
    # najjaśniejszego pasa pośrodku tu nie ma — na skosach łamał się w szewrony
    # i cała droga zaczynała wyglądać jak tory kolejowe.
    for barwa, grubosc in ((DROGA_BRZEG, 0.44), (DROGA, 0.32)):
        g = grubosc * KAFEL * NAD
        for y in range(WYS):
            for x in range(SZER):
                if not jest(x, y):
                    continue
                a = srodek(x, y)
                # Tylko połowa kierunków — odcinek rysowany z obu końców
                # byłby rysowany dwa razy.
                for dx, dy in ((1, 0), (0, 1), (1, 1), (1, -1)):
                    if jest(x + dx, y + dy):
                        d.line([a, srodek(x + dx, y + dy)], fill=barwa, width=int(g))
        # Kółka po odcinkach, nie przed: przy odwrotnej kolejności na
        # zakrętach zostawały jasne trójkąty.
        for y in range(WYS):
            for x in range(SZER):
                if jest(x, y):
                    cx, cy = srodek(x, y)
                    d.ellipse([cx - g / 2, cy - g / 2, cx + g / 2, cy + g / 2], fill=barwa)
    # Ćwierć piksela rozmycia po zmniejszeniu: droga przestaje być naklejką
    # na trawie i siada w niej tak jak brzeg wody.
    return im.resize((w, h), Image.LANCZOS).filter(ImageFilter.GaussianBlur(0.6))


#: Klatek planszy jest dwa razy więcej niż klatek wody w arkuszu (patrz
#: wyżej) — `teren()` i tak zawija się modulo 4 przy wyborze kafelka.
KLATEK_PLANSZY = 8

KATALOG.mkdir(parents=True, exist_ok=True)
podklad = drogi((SZER * KAFEL, WYS * KAFEL))
klatki = []
for k in range(KLATEK_PLANSZY):
    plansza = wygladz(teren(k)).crop((0, 0, SZER * KAFEL, WYS * KAFEL))
    plansza.alpha_composite(podklad)
    # Woda dostaje głębię, kaustyki i skry PO wygładzeniu, nie przed —
    # mediana z `wygladz` ma promień kilku pikseli i zjadała drobne skry,
    # zanim zdążyły dojechać do finalnego obrazka.
    klatki.append(wzbogac(plansza, k, KLATEK_PLANSZY))

# Klatka 0 idzie w całości; kolejne TYLKO jako to, co się od niej różni,
# reszta przezroczysta. Scena kładzie je na wierzch.
#
# Przy planszy 36 × 36 pełna klatka to 1728 × 1728 pikseli, a różni się między
# klatkami wyłącznie woda — kilka procent mapy. Pierwsze podejście wycinało
# prostokąt otaczający różnice, ale woda jest i na północnym zachodzie, i na
# południowym wschodzie, więc prostokąt objął prawie całą planszę i nic nie
# oszczędził. Przezroczysta maska nie ma tego problemu: PNG ściska jednolitą
# przezroczystość niemal do zera, niezależnie od tego, gdzie leży woda.
baza = klatki[0]
baza.save(KATALOG / 'plansza-0.png')
print(f'  plansza-0.png  {baza.width} × {baza.height}  (pełna)')

for k in range(1, KLATEK_PLANSZY):
    rozne = (
        ImageChops.difference(klatki[k].convert('RGB'), baza.convert('RGB'))
        .convert('L')
        .point(lambda v: 255 if v > 8 else 0)
    )
    # Piksele spoza maski trzeba WYZEROWAĆ, nie tylko przykryć przezroczystością.
    # PNG zapisuje kolor także tam, gdzie alfa wynosi zero, więc sama maska nie
    # zmniejszyła pliku ani o bajt — dopiero jednolite zero się ściska.
    tab = np.asarray(klatki[k]).copy()
    widoczne = np.asarray(rozne) > 0
    tab[~widoczne] = 0
    tab[:, :, 3] = np.where(widoczne, 255, 0)
    Image.fromarray(tab, 'RGBA').save(KATALOG / f'plansza-{k}.png')
    print(f'  plansza-{k}.png  naklejka, {widoczne.mean() * 100:.1f}% powierzchni')

odcisk = hashlib.sha256('\n'.join(RYSUNEK).encode('utf-8')).hexdigest()[:16]
(KATALOG / 'plansza.json').write_text(
    json.dumps(
        {'odcisk': odcisk, 'szer': SZER, 'wys': WYS, 'kafel': KAFEL},
        indent=2,
    )
    + '\n',
    encoding='utf-8',
)
print(f'  odcisk terenu: {odcisk}')
