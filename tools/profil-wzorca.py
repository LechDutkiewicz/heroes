#!/usr/bin/env python3
"""Profil mapy wzorcowej — te same liczby co `profil-mapy.py`, tylko liczone
z oryginalnych map Heroes 3 (.h3m sparsowanych do JSON przez h3m2json).

Po co
-----
`profil-mapy.py` sprowadza NASZĄ planszę do zestawu liczb. Same liczby nic nie
mówią, dopóki nie ma do czego ich przyłożyć. To narzędzie liczy dokładnie ten
sam zestaw dla pięciu oficjalnych map 72×72 na dwóch graczy, zapisuje takie
same schematyczne minimapy i na końcu drukuje tabelę: nasza mapa obok wzorców,
wiersz po wierszu.

    python3 tools/profil-mapy.py      # najpierw, żeby odświeżyć nasz profil
    python3 tools/profil-wzorca.py

Zapisuje do `tools/wzorzec/`:
  <nazwa>-profil.json  — liczby,
  <nazwa>-minimapa.png — schemat w tej samej skali (6 px/pole) i palecie.
"""

import json
import re
import sys
import unicodedata
from collections import deque
from pathlib import Path

from PIL import Image, ImageDraw

KORZEN = Path(__file__).resolve().parent.parent
WYJSCIE = KORZEN / 'tools' / 'wzorzec'
#: Katalog z JSON-ami wyprodukowanymi przez h3m2json. Można nadpisać argumentem.
ZRODLO = Path(
    '/tmp/claude-0/-home-user-heroes/3678a2ef-2209-5e02-9e79-912f90559c3d'
    '/scratchpad/ref/json'
)

# Paleta i skala — identyczne jak w profil-mapy.py, inaczej obrazków nie da się
# położyć obok siebie.
BARWY = {
    '.': (104, 152, 72),
    '=': (176, 148, 100),
    ',': (214, 196, 140),
    'T': (56, 104, 56),
    '#': (120, 116, 112),
    '~': (72, 112, 176),
}

BARWY_OBIEKTOW = {
    'kopalnia': (255, 214, 0),
    'surowiec': (255, 255, 160),
    'skrzynia': (255, 140, 0),
    'artefakt': (220, 120, 255),
    'budynek': (120, 220, 255),
    'potwor': (220, 40, 40),
    'zamek': (255, 255, 255),
}

SKALA = 6

PRZEJEZDNE = '.,='

# --- teren -------------------------------------------------------------------
#: Dziesięć rodzajów gruntu z Heroes 3 sprowadzone do naszych sześciu znaków.
#: Skała i woda nieprzejezdne, reszta przejezdna. 'T' nie pada z terenu — u nas
#: to las, a w H3 drzewa i góry są OBIEKTAMI dekoracyjnymi, więc dokładamy je
#: niżej z masek przejezdności (patrz `zablokowane_dekoracja`).
TEREN_ZNAK = {
    'grass': '.',
    'dirt': '=',
    'swamp': '=',
    'lava': '=',
    'subterranean': '=',
    'underground': '=',
    'sand': ',',
    'desert': ',',
    'snow': ',',
    'rough': ',',
    'rock': '#',
    'water': '~',
}

# --- klasy obiektów ----------------------------------------------------------
# Liczymy TYLKO obiekty interaktywne. Wszystko, czego nie ma poniżej (drzewa,
# skały, kwiatki, wulkany, rafy, tabliczki, łódki, bohaterowie, zdarzenia,
# nakładki typu Magic Plains / Cursed Ground) to dekoracja albo tło i nie jest
# obiektem w rozumieniu naszego profilu.
#
# Nieoczywiste przypisania:
#  * Campfire (12), Corpse (22), Wagon (105), Sea Chest (82), Shipwreck
#    Survivor (86), Pandora's Box (6) → 'skrzynia': jednorazowe znaleziska
#    „podnieś i idź dalej”, dokładnie jak nasza skrzynia.
#  * Flotsam (29) pomijamy — leży na wodzie, gracz pieszo tam nie dojdzie.
#  * Abandoned Mine (220) → 'kopalnia' (kopalnia po wyczyszczeniu).
#  * Spell Scroll (93) → 'artefakt' (to artefakt w slocie).
#  * Siedliska (17–20, 216–218) → 'budynek', tak jak u nas.
#  * Creature Bank (16), Crypt (84), Derelict Ship (24), Dragon Utopia (25),
#    Shipwreck (85), Pyramid (63), Warriors Tomb (108) → 'budynek': to budowle
#    z bitwą, nie wolno stojące straże.
#  * Monolity, Subterranean Gate, Whirlpool (43–45, 103, 111) → 'budynek':
#    obiekt do odwiedzenia, choć nie daje nagrody.
#  * Garrison (33, 219), Border Guard (9), Quest Guard (215), Border Gate (212),
#    Keymaster Tent (10) → 'budynek': to bramki, nie straże do policzenia jako
#    potwory.
#  * Town (98) i Random Town (77) → 'zamek'.
KLASY = {}
for _k in (79, 76):
    KLASY[_k] = 'surowiec'
for _k in (101, 12, 22, 105, 82, 86, 6):
    KLASY[_k] = 'skrzynia'
for _k in (53, 220):
    KLASY[_k] = 'kopalnia'
for _k in (5, 65, 66, 67, 68, 69, 93):
    KLASY[_k] = 'artefakt'
for _k in (54, 71, 72, 73, 74, 75, 162, 163, 164):
    KLASY[_k] = 'potwor'
for _k in (98, 77):
    KLASY[_k] = 'zamek'
for _k in (
    2, 4, 7, 9, 10, 13, 14, 16, 17, 18, 19, 20, 23, 24, 25, 27, 28, 30, 31, 32,
    33, 35, 37, 38, 39, 41, 42, 43, 44, 45, 47, 48, 49, 51, 52, 55, 56, 57, 58,
    60, 61, 62, 63, 64, 78, 80, 81, 83, 84, 85, 87, 88, 89, 90, 92, 94, 95, 96,
    97, 99, 100, 102, 103, 104, 106, 107, 108, 109, 110, 111, 112, 113, 212,
    213, 215, 216, 217, 218, 219, 221,
):
    KLASY[_k] = 'budynek'

#: Poziom potwora → nasza etykieta siły. Skala 1–7 z H3 rozciągnięta na nasze
#: pięć szczebli; L5–L7 to u nas i tak pojedyncze sztuki („wodz”).
SILA_WG_POZIOMU = {1: 'slaby', 2: 'sredni', 3: 'silny', 4: 'straznik',
                   5: 'wodz', 6: 'wodz', 7: 'wodz'}

#: Klasy losowych potworów niosą poziom wprost w numerze klasy.
POZIOM_KLASY = {72: 1, 73: 2, 74: 3, 75: 4, 162: 5, 163: 6, 164: 7, 71: 3}


def poziom_potwora(o):
    """Poziom stwora: z klasy (losowy) albo z numeru jednostki (konkretny)."""
    if o['class'] in POZIOM_KLASY:
        return POZIOM_KLASY[o['class']]
    sub = o.get('subclass') or 0
    # Jednostki frakcyjne 0–111 idą po 14 na zamek, po dwie na poziom.
    if sub < 112:
        return (sub % 14) // 2 + 1
    return 3  # neutralne (elementale, smoki itd.) — bez tabeli, środek skali


def kafelki_obiektu(o, klucz):
    """Pola zajmowane/aktywne wg maski z parsera.

    h3m2json podaje maskę jako słownik 'kolumna_wiersz', liczony od prawego
    dolnego rogu sprite'a, który leży na (x, y). Brakujące klucze = pole wolne.
    """
    maska = o.get(klucz)
    if not isinstance(maska, dict):
        return []
    out = []
    for k, v in maska.items():
        c, r = k.split('_')
        out.append(((o['x'] - int(c), o['y'] - int(r)), v))
    return out


def pole_obiektu(o):
    """Pole, na którym gracz „używa” obiektu — wejście, a w braku kotwica."""
    for pole, aktywne in kafelki_obiektu(o, 'actionability'):
        if aktywne:
            return pole
    return (o['x'], o['y'])


def zablokowane_dekoracja(objs, bok):
    """Pola zasłonięte przez dekorację (drzewa, góry, skały, kratery…).

    U nas takie pola są terenem 'T'. W H3 to obiekty, więc żeby profile były
    porównywalne, przenosimy je na siatkę terenu.
    """
    blok = set()
    for o in objs:
        if KLASY.get(o['class']):
            continue  # obiekt interaktywny — nie jest „lasem”
        for (x, y), wolne in kafelki_obiektu(o, 'passability'):
            if not wolne and 0 <= x < bok and 0 <= y < bok:
                blok.add((x, y))
    return blok


def wczytaj(sciezka):
    """Mapa → (siatka znaków terenu, punkty, lista obiektów naszego formatu)."""
    d = json.loads(sciezka.read_text(encoding='utf-8'))
    bok = d['size']
    kafle = d['overworldTiles']

    teren = [
        [TEREN_ZNAK.get(kafle[y * bok + x]['terrain'], '.') for x in range(bok)]
        for y in range(bok)
    ]

    powierzchnia = [o for o in d['objects'] if o.get('z') == 0]
    for (x, y) in zablokowane_dekoracja(powierzchnia, bok):
        if teren[y][x] in PRZEJEZDNE:
            teren[y][x] = 'T'

    obiekty = []
    for o in powierzchnia:
        rodzaj = KLASY.get(o['class'])
        if not rodzaj:
            continue
        x, y = pole_obiektu(o)
        if not (0 <= x < bok and 0 <= y < bok):
            x, y = o['x'], o['y']
        wpis = {'rodzaj': rodzaj, 'x': x, 'y': y}
        if rodzaj == 'potwor':
            wpis['sila'] = SILA_WG_POZIOMU.get(poziom_potwora(o), 'sredni')
        obiekty.append(wpis)

    punkty = {}
    gracze = [
        (c, p) for c, p in d['players'].items()
        if p['canBeHuman'] or p['canBeComputer']
    ]
    # Start gracza: pierwszy grywalny z zamkiem startowym na powierzchni.
    starty = [
        (c, (p['startingTown']['x'], p['startingTown']['y']))
        for c, p in gracze
        if p.get('startingTown') and p['startingTown']['z'] == 0
    ]
    zamki = [o for o in d['objects'] if o.get('z') == 0 and KLASY.get(o['class']) == 'zamek']
    if starty:
        nasz_kolor, punkty['zamek gracza'] = starty[0]
    else:
        nasz_kolor, punkty['zamek gracza'] = None, (zamki[0]['x'], zamki[0]['y'])
    punkty['start'] = punkty['zamek gracza']

    # Zamek wroga: start drugiego gracza; jeśli go nie ma na powierzchni
    # (mapy z podziemnym startem, gracze bez zamku startowego) — najdalszy
    # zamek nienależący do nas.
    if len(starty) > 1:
        punkty['zamek wroga'] = starty[1][1]
    else:
        sx, sy = punkty['start']
        obce = [
            z for z in zamki
            if (z.get('details') or {}).get('owner') != nasz_kolor
            and (z['x'], z['y']) != punkty['start']
        ] or zamki
        daleki = max(obce, key=lambda z: max(abs(z['x'] - sx), abs(z['y'] - sy)))
        punkty['zamek wroga'] = (daleki['x'], daleki['y'])

    return teren, punkty, obiekty, d['name']


# --- miary (kalka z profil-mapy.py) -----------------------------------------

def kroki_od(teren, skad):
    bok_y, bok_x = len(teren), len(teren[0])
    odl = {skad: 0}
    q = deque([skad])
    while q:
        x, y = q.popleft()
        for dx in (-1, 0, 1):
            for dy in (-1, 0, 1):
                nx, ny = x + dx, y + dy
                if 0 <= nx < bok_x and 0 <= ny < bok_y and (nx, ny) not in odl \
                        and teren[ny][nx] in PRZEJEZDNE:
                    odl[(nx, ny)] = odl[(x, y)] + 1
                    q.append((nx, ny))
    return odl


def blisko(odl, pole):
    """Odległość do pola, a gdy samo pole jest zabudowane — do sąsiada."""
    if pole in odl:
        return odl[pole]
    x, y = pole
    sasiedzi = [
        odl[(x + dx, y + dy)]
        for dx in (-1, 0, 1) for dy in (-1, 0, 1)
        if (x + dx, y + dy) in odl
    ]
    return min(sasiedzi) if sasiedzi else None


def bez_walki(teren, obiekty, start):
    """Ile pól da się obejść, zanim wygra się pierwszą bitwę (straż blokuje
    pola wokół siebie, promień 1 — tak samo jak u nas)."""
    bok_y, bok_x = len(teren), len(teren[0])
    blok = set()
    for o in obiekty:
        if o['rodzaj'] != 'potwor':
            continue
        for dx in (-1, 0, 1):
            for dy in (-1, 0, 1):
                blok.add((o['x'] + dx, o['y'] + dy))
    widziane = {start}
    q = deque([start])
    while q:
        x, y = q.popleft()
        for dx in (-1, 0, 1):
            for dy in (-1, 0, 1):
                nx, ny = x + dx, y + dy
                if (
                    0 <= nx < bok_x and 0 <= ny < bok_y
                    and (nx, ny) not in widziane and (nx, ny) not in blok
                    and teren[ny][nx] in PRZEJEZDNE
                ):
                    widziane.add((nx, ny))
                    q.append((nx, ny))
    return len(widziane)


def strefa(d_dom, d_wrog):
    """Nasz podział mapy na trzy strefy, odtworzony z odległości do obu zamków.

    U nas strefa jest wpisana ręcznie; tutaj wynika z geometrii: bliżej nas o
    co najmniej jedną piątą → 'dom', bliżej wroga → 'wroga', reszta to pas
    styku, czyli 'pogranicze'.
    """
    if d_dom is None or d_wrog is None:
        return 'pogranicze'
    if d_dom * 1.25 < d_wrog:
        return 'dom'
    if d_wrog * 1.25 < d_dom:
        return 'wroga'
    return 'pogranicze'


def profil(teren, punkty, obiekty):
    wys, szer = len(teren), len(teren[0])
    pola = wys * szer
    udzial = {z: sum(w.count(z) for w in teren) for z in BARWY}
    przejezdne = udzial['.'] + udzial[','] + udzial['=']

    start = punkty['start']
    kroki = kroki_od(teren, start)
    kroki_wrog = kroki_od(teren, punkty['zamek wroga'])

    rodzaje, strefy, sily = {}, {}, {}
    for o in obiekty:
        rodzaje[o['rodzaj']] = rodzaje.get(o['rodzaj'], 0) + 1
        s = strefa(blisko(kroki, (o['x'], o['y'])), blisko(kroki_wrog, (o['x'], o['y'])))
        strefy[s] = strefy.get(s, 0) + 1
        if o['rodzaj'] == 'potwor':
            sily[o.get('sila', '?')] = sily.get(o.get('sila', '?'), 0) + 1

    straze = [o for o in obiekty if o['rodzaj'] == 'potwor']

    najdalej = max(kroki.values())
    pasy = [0] * 5
    for o in obiekty:
        d = blisko(kroki, (o['x'], o['y']))
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
        'kroków do zamku wroga': blisko(kroki, punkty['zamek wroga']),
        'najdalszy zakątek (kroków)': najdalej,
        'pól dostępnych bez wygranej bitwy': dostepne_od_razu,
        'dostępnych bez bitwy %': round(dostepne_od_razu * 100 / max(1, przejezdne)),
    }


def minimapa(teren, punkty, obiekty):
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
        c = BARWY_OBIEKTOW.get(o['rodzaj'], (255, 255, 255))
        cx, cy = o['x'] * SKALA + SKALA / 2, o['y'] * SKALA + SKALA / 2
        r = SKALA * 0.42
        d.ellipse([cx - r, cy - r, cx + r, cy + r], fill=c, outline=(20, 20, 20))
    for nazwa in ('zamek gracza', 'zamek wroga'):
        x, y = punkty[nazwa]
        cx, cy = x * SKALA + SKALA / 2, y * SKALA + SKALA / 2
        r = SKALA * 1.1
        d.rectangle([cx - r, cy - r, cx + r, cy + r], fill=(255, 255, 255), outline=(0, 0, 0))
    return im


def slug(nazwa):
    s = unicodedata.normalize('NFKD', nazwa).encode('ascii', 'ignore').decode()
    return re.sub(r'-+', '-', re.sub(r'[^a-z0-9]+', '-', s.lower())).strip('-')


# --- tabela ------------------------------------------------------------------

def do_tekstu(v):
    if isinstance(v, dict):
        return ' '.join(f'{k}={x}' for k, x in v.items())
    if isinstance(v, list):
        return '/'.join(str(x) for x in v)
    return str(v)


def tabela(kolumny):
    """Kolumny: lista (nagłówek, profil). Wiersz na każdą miarę."""
    klucze = []
    for _, p in kolumny:
        for k in p:
            if k not in klucze:
                klucze.append(k)
    # Słowniki rozbijamy na osobne wiersze, żeby dało się czytać wartość po
    # wartości, a nie porównywać dwie linijki tekstu.
    wiersze = []
    for k in klucze:
        podklucze = []
        for _, p in kolumny:
            if isinstance(p.get(k), dict):
                for pk in p[k]:
                    if pk not in podklucze:
                        podklucze.append(pk)
        if podklucze:
            for pk in podklucze:
                wiersze.append((
                    f'{k} · {pk}',
                    [do_tekstu((p.get(k) or {}).get(pk, 0)) for _, p in kolumny],
                ))
        else:
            wiersze.append((k, [do_tekstu(p.get(k, '—')) for _, p in kolumny]))

    naglowki = ['miara'] + [n for n, _ in kolumny]
    dane = [naglowki] + [[m] + w for m, w in wiersze]
    szer = [max(len(r[i]) for r in dane) for i in range(len(naglowki))]
    linie = []
    for i, r in enumerate(dane):
        linie.append('  '.join(c.ljust(szer[j]) for j, c in enumerate(r)).rstrip())
        if i == 0:
            linie.append('  '.join('-' * s for s in szer))
    return '\n'.join(linie)


if __name__ == '__main__':
    katalog = Path(sys.argv[1]) if len(sys.argv) > 1 else ZRODLO
    WYJSCIE.mkdir(parents=True, exist_ok=True)

    kolumny = []
    nasz = WYJSCIE / 'nasza-profil.json'
    if nasz.exists():
        kolumny.append(('NASZA', json.loads(nasz.read_text(encoding='utf-8'))))
    else:
        print('brak tools/wzorzec/nasza-profil.json — uruchom najpierw '
              'python3 tools/profil-mapy.py', file=sys.stderr)

    for plik in sorted(katalog.glob('*.json')):
        teren, punkty, obiekty, nazwa = wczytaj(plik)
        p = profil(teren, punkty, obiekty)
        s = slug(plik.stem)
        (WYJSCIE / f'{s}-profil.json').write_text(
            json.dumps(p, ensure_ascii=False, indent=2) + '\n', encoding='utf-8'
        )
        minimapa(teren, punkty, obiekty).save(WYJSCIE / f'{s}-minimapa.png')
        kolumny.append((plik.stem[:18], p))
        print(f'zapisano {s}-profil.json + {s}-minimapa.png  ({nazwa})', file=sys.stderr)

    print()
    print(tabela(kolumny))
