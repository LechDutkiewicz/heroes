#!/usr/bin/env python3
"""Profil mapy — liczby, którymi da się PORÓWNAĆ naszą planszę z mapą z Heroes 3.

Po co osobne narzędzie
----------------------
„Mapa jest dobra” nie jest werdyktem, tylko wrażeniem. Żeby krytyk miał co
porównywać, obie mapy muszą dać się sprowadzić do tego samego zestawu liczb:
gęstość obiektów, udział terenów, ile mapy jest za strażą, jak daleko jest do
zamku przeciwnika. Dopiero wtedy „nasza jest rzadsza” da się sprawdzić, a nie
tylko poczuć.

Zapisuje dwie rzeczy:

* `tools/wzorzec/nasza-profil.json` — liczby;
* `tools/wzorzec/nasza-minimapa.png` — schemat planszy w jednym kolorze na
  rodzaj terenu, z kropkami obiektów. Ten sam schemat robimy z mapy wzorcowej,
  więc oba obrazki da się położyć obok siebie i porównać ślepo.

    python3 tools/profil-mapy.py
"""

import json
import re
from collections import deque
from pathlib import Path

from PIL import Image, ImageDraw

KORZEN = Path(__file__).resolve().parent.parent
ZRODLO = KORZEN / 'src' / 'data' / 'plansza-teren.ts'
WYJSCIE = KORZEN / 'tools' / 'wzorzec'

BARWY = {
    '.': (104, 152, 72),
    '=': (176, 148, 100),
    ',': (214, 196, 140),
    'T': (56, 104, 56),
    '#': (120, 116, 112),
    '~': (72, 112, 176),
}

#: Kolory kropek obiektów — jedna rodzina na rodzaj, żeby dało się zobaczyć
#: rozkład: gdzie leży gospodarka, gdzie nagrody, a gdzie stoją straże.
BARWY_OBIEKTOW = {
    'kopalnia': (255, 214, 0),
    'surowiec': (255, 255, 160),
    'skrzynia': (255, 140, 0),
    'artefakt': (220, 120, 255),
    'budynek': (120, 220, 255),
    'potwor': (220, 40, 40),
    'zamek': (255, 255, 255),
}

SKALA = 6   # px na pole na schemacie


def wczytaj():
    src = ZRODLO.read_text(encoding='utf-8')
    teren = re.findall(r"'([^']+)'", re.search(r'export const TEREN = \[(.*?)\];', src, re.S).group(1))
    punkty = {
        m.group(1): (int(m.group(2)), int(m.group(3)))
        for m in re.finditer(r"'([^']+)': \{ x: (\d+), y: (\d+) \}", src)
    }
    blok = re.search(r'export const ROZSTAWIENIE.*?\n\];', src, re.S).group(0)
    obiekty = []
    for m in re.finditer(r'\{ ([^}]+) \},', blok):
        pola = dict(
            (k.strip(), v.strip().strip("'"))
            for k, v in (p.split(':', 1) for p in m.group(1).split(', '))
        )
        obiekty.append(pola)
    return teren, punkty, obiekty


def kroki_od(teren, skad):
    bok_y, bok_x = len(teren), len(teren[0])
    odl = {skad: 0}
    q = deque([skad])
    while q:
        x, y = q.popleft()
        for dx in (-1, 0, 1):
            for dy in (-1, 0, 1):
                nx, ny = x + dx, y + dy
                if 0 <= nx < bok_x and 0 <= ny < bok_y and (nx, ny) not in odl and teren[ny][nx] in '.,=':
                    odl[(nx, ny)] = odl[(x, y)] + 1
                    q.append((nx, ny))
    return odl


def bez_walki(teren, obiekty, start):
    """Ile pól da się obejść, zanim wygra się pierwszą bitwę.

    Potwór blokuje pola wokół siebie, więc mapa dzieli się na kawałek dostępny
    od razu i resztę za strażami. W Heroes 3 ten pierwszy kawałek to mniej
    więcej strefa startowa — jeśli wychodzi z niego pół mapy, straże stoją źle.
    """
    bok_y, bok_x = len(teren), len(teren[0])
    blok = set()
    for o in obiekty:
        if o['rodzaj'] != 'potwor':
            continue
        x, y = int(o['x']), int(o['y'])
        for dx in (-1, 0, 1):
            for dy in (-1, 0, 1):
                blok.add((x + dx, y + dy))
    widziane = {start}
    q = deque([start])
    while q:
        x, y = q.popleft()
        for dx in (-1, 0, 1):
            for dy in (-1, 0, 1):
                nx, ny = x + dx, y + dy
                if (
                    0 <= nx < bok_x
                    and 0 <= ny < bok_y
                    and (nx, ny) not in widziane
                    and (nx, ny) not in blok
                    and teren[ny][nx] in '.,='
                ):
                    widziane.add((nx, ny))
                    q.append((nx, ny))
    return len(widziane)


def profil():
    teren, punkty, obiekty = wczytaj()
    wys, szer = len(teren), len(teren[0])
    pola = wys * szer
    udzial = {z: sum(w.count(z) for w in teren) for z in BARWY}
    przejezdne = udzial['.'] + udzial[','] + udzial['=']

    start = punkty['start']
    kroki = kroki_od(teren, start)

    rodzaje = {}
    strefy = {}
    for o in obiekty:
        rodzaje[o['rodzaj']] = rodzaje.get(o['rodzaj'], 0) + 1
        strefy[o['strefa']] = strefy.get(o['strefa'], 0) + 1

    straze = [o for o in obiekty if o['rodzaj'] == 'potwor']
    sily = {}
    for o in straze:
        sily[o.get('sila', '?')] = sily.get(o.get('sila', '?'), 0) + 1

    # Rozkład obiektów po odległości od startu — w pięciu pasach po 20% zasięgu.
    najdalej = max(kroki.values())
    pasy = [0] * 5
    for o in obiekty:
        d = kroki.get((int(o['x']), int(o['y'])))
        if d is None:
            continue
        pasy[min(4, int(d / (najdalej + 1) * 5))] += 1

    dostepne_od_razu = bez_walki(teren, obiekty, start)

    return {
        'rozmiar': f'{szer} × {wys}',
        'pól': pola,
        'przejezdnych': przejezdne,
        'przejezdnych %': round(przejezdne * 100 / pola),
        'teren %': {k: round(v * 100 / pola) for k, v in udzial.items()},
        'obiektów': len(obiekty),
        'obiekt co ile pól przejezdnych': round(przejezdne / max(1, len(obiekty)), 1),
        'obiekty wg rodzaju': rodzaje,
        'obiekty wg strefy': strefy,
        'straże wg siły': sily,
        'straże %': round(len(straze) * 100 / max(1, len(obiekty))),
        'obiekty w pasach odległości (5 × 20%)': pasy,
        'kroków do zamku wroga': kroki.get(punkty['zamek wroga']),
        'najdalszy zakątek (kroków)': najdalej,
        'pól dostępnych bez wygranej bitwy': dostepne_od_razu,
        'dostępnych bez bitwy %': round(dostepne_od_razu * 100 / przejezdne),
    }


def minimapa():
    teren, punkty, obiekty = wczytaj()
    wys, szer = len(teren), len(teren[0])
    im = Image.new('RGB', (szer * SKALA, wys * SKALA), (0, 0, 0))
    d = ImageDraw.Draw(im)
    for y in range(wys):
        for x in range(szer):
            d.rectangle(
                [x * SKALA, y * SKALA, (x + 1) * SKALA - 1, (y + 1) * SKALA - 1],
                fill=BARWY.get(teren[y][x], (0, 0, 0)),
            )
    for o in obiekty:
        x, y = int(o['x']), int(o['y'])
        c = BARWY_OBIEKTOW.get(o['rodzaj'], (255, 255, 255))
        cx, cy = x * SKALA + SKALA / 2, y * SKALA + SKALA / 2
        r = SKALA * 0.42
        d.ellipse([cx - r, cy - r, cx + r, cy + r], fill=c, outline=(20, 20, 20))
    for nazwa in ('zamek gracza', 'zamek wroga'):
        x, y = punkty[nazwa]
        cx, cy = x * SKALA + SKALA / 2, y * SKALA + SKALA / 2
        r = SKALA * 1.1
        d.rectangle([cx - r, cy - r, cx + r, cy + r], fill=(255, 255, 255), outline=(0, 0, 0))
    return im


if __name__ == '__main__':
    WYJSCIE.mkdir(parents=True, exist_ok=True)
    p = profil()
    (WYJSCIE / 'nasza-profil.json').write_text(
        json.dumps(p, ensure_ascii=False, indent=2) + '\n', encoding='utf-8'
    )
    minimapa().save(WYJSCIE / 'nasza-minimapa.png')
    for k, v in p.items():
        print(f'{k}: {v}')
