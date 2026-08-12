#!/usr/bin/env python3
"""Generuje planszę 36 × 36 — rozmiar małej mapy z Heroes 3.

Dlaczego generator, a nie ręczny rysunek
----------------------------------------
Pierwsza plansza miała 14 × 12 i dało się ją wpisać znak po znaku. Przy 36 × 36
to 1296 znaków w 36 wierszach równej długości — pomyłka o jeden znak jest
pewna, a objawia się jako plansza, która wygląda dobrze i nie działa.

Ale generator z samego szumu daje mapę bez zamysłu: same plamy, żadnych
miejsc. Dlatego robimy to dwuetapowo, tak jak robi się mapy w Heroes 3:

1. Wpisujemy ręcznie SZKIC 12 × 12 — duże krainy. Tyle da się wpisać bez
   pomyłki i to on decyduje, gdzie jest jezioro, gdzie góry i którędy się
   chodzi. To jest projekt mapy.
2. Skrypt powiększa szkic trzykrotnie i rozmywa granice szumem, żeby kraina
   nie kończyła się linią prostą.
3. Drogi są wytyczane najtańszą trasą między punktami orientacyjnymi, a nie
   rysowane — dzięki temu naprawdę prowadzą tam, gdzie się chodzi.
4. Na koniec sprawdzamy przejezdność: każdy punkt orientacyjny musi być
   osiągalny ze startu. Bez tego można dostać piękną mapę, na której zamek
   stoi za nieprzerwanym pasmem gór.

    python3 tools/generuj_mape.py
"""

import random
from collections import deque
from pathlib import Path

KORZEN = Path(__file__).resolve().parent.parent
WYNIK = KORZEN / 'src' / 'data' / 'plansza-teren.ts'

SKALA = 3
BOK = 36
ZIARNO = 20260812

# Szkic krain, 12 × 12. Każdy znak to kwadrat 3 × 3 pola.
#   .  trawa      ,  piasek     ~  woda
#   T  las        #  góry
#
# Zamysł: gracz startuje w dolinie na zachodzie (bezpiecznie, jest gdzie się
# rozejrzeć), na północy jezioro z plażą, przez środek pas lasu. Przez całą
# mapę z północy na południe biegnie grzbiet górski z JEDNYM przejściem
# w połowie wysokości — za nim kraina przeciwnika.
#
# Jedno przejście to nie ozdoba, tylko cała struktura tej mapy: dopóki gracz
# go nie znajdzie, zachodnia połowa jest bezpieczną piaskownicą, a kiedy już
# je przejdzie, wie, że wraca tą samą drogą. Pierwsza wersja szkicu miała
# grzbiet bez przerwy i generator to wyłapał — trasy do przełęczy po prostu
# nie było.
SZKIC = [
    '~~~,,..##..T',
    '~~,,...##..T',
    '~,,....##..#',
    '.......##...',
    '...TT..##..#',
    '..TTTT.##.##',
    '..TTT.......',
    '....T..##..#',
    '.......##...',
    '..T....##...',
    '..TT...##..~',
    '.......##...',
]

#: Pola, które po rozmyciu wracają na trawę, choćby szum je zasypał.
#: Przełęcz musi zostać przejściem — rozmycie granic potrafi ją zamknąć,
#: a wtedy mapa rozpada się na dwie niepołączone połowy.
PRZEJSCIA = [(20, 18, 27, 20)]

#: Punkty orientacyjne, w polach mapy 36 × 36. Drogi łączą je po kolei, więc
#: kolejność wyznacza główny szlak przez mapę.
PUNKTY = {
    'start': (4, 10),
    'zamek gracza': (4, 16),
    'rozstaje': (16, 10),
    'polnocna polana': (16, 4),
    'przelecz': (23, 19),
    'zamek wroga': (31, 28),
}
SZLAK = ['zamek gracza', 'start', 'rozstaje', 'polnocna polana', 'rozstaje', 'przelecz', 'zamek wroga']

PRZEJEZDNE = set('.,=')


def szkic_na_mape(rng):
    """Powiększa szkic i rozmywa granice, żeby krainy nie były prostokątami."""
    mapa = [[SZKIC[y // SKALA][x // SKALA] for x in range(BOK)] for y in range(BOK)]

    # Rozmycie: pole z prawdopodobieństwem zależnym od tego, ilu ma sąsiadów
    # innego rodzaju, przejmuje ich rodzaj. Dwa przebiegi wystarczą, żeby
    # granice się poszarpały, a krainy zostały rozpoznawalne.
    for _ in range(2):
        nowa = [w[:] for w in mapa]
        for y in range(BOK):
            for x in range(BOK):
                sasiedzi = [
                    mapa[y + dy][x + dx]
                    for dy in (-1, 0, 1)
                    for dx in (-1, 0, 1)
                    if 0 <= y + dy < BOK and 0 <= x + dx < BOK and (dx or dy)
                ]
                obce = [s for s in sasiedzi if s != mapa[y][x]]
                if obce and rng.random() < len(obce) / 16:
                    nowa[y][x] = rng.choice(obce)
        mapa = nowa
    return mapa


def koszt(z):
    """Ile „kosztuje" poprowadzenie drogi przez ten rodzaj terenu.

    Nie jest to koszt ruchu w grze, tylko wskazówka dla trasowania: droga
    woli iść trawą, przez las przejdzie, gór i wody unika zupełnie. Dzięki
    temu drogi omijają grzbiet zamiast go przecinać — chyba że nie ma innej
    możliwości, i wtedy powstaje przełęcz, czyli miejsce warte pilnowania.
    """
    # Droga już wytyczona kosztuje najmniej: kolejne odcinki chętnie się do
    # niej dokleją zamiast biec obok, więc powstaje sieć, a nie kilka
    # równoległych ścieżek.
    return {'=': 0.5, '.': 1, ',': 3, 'T': 6, '#': None, '~': None}[z]


def trasa(mapa, skad, dokad):
    """Najtańsza trasa Dijkstrą po ośmiu kierunkach."""
    import heapq

    kolejka = [(0, skad, None)]
    skady = {}
    koszty = {skad: 0}
    while kolejka:
        k, biezacy, poprzedni = heapq.heappop(kolejka)
        if biezacy in skady:
            continue
        skady[biezacy] = poprzedni
        if biezacy == dokad:
            break
        x, y = biezacy
        for dx in (-1, 0, 1):
            for dy in (-1, 0, 1):
                if not (dx or dy):
                    continue
                nx, ny = x + dx, y + dy
                if not (0 <= nx < BOK and 0 <= ny < BOK):
                    continue
                c = koszt(mapa[ny][nx])
                if c is None:
                    continue
                nk = k + c * (1.41 if dx and dy else 1)
                if nk < koszty.get((nx, ny), 1e9):
                    koszty[(nx, ny)] = nk
                    heapq.heappush(kolejka, (nk, (nx, ny), biezacy))

    if dokad not in skady:
        return None
    droga, biezacy = [], dokad
    while biezacy is not None:
        droga.append(biezacy)
        biezacy = skady[biezacy]
    return droga


def osiagalne(mapa, skad):
    """Pola osiągalne ze startu — do sprawdzenia, czy mapa się nie rozpada."""
    widziane = {skad}
    kolejka = deque([skad])
    while kolejka:
        x, y = kolejka.popleft()
        for dx in (-1, 0, 1):
            for dy in (-1, 0, 1):
                nx, ny = x + dx, y + dy
                if (
                    0 <= nx < BOK
                    and 0 <= ny < BOK
                    and (nx, ny) not in widziane
                    and mapa[ny][nx] in PRZEJEZDNE
                ):
                    widziane.add((nx, ny))
                    kolejka.append((nx, ny))
    return widziane


def zbuduj():
    rng = random.Random(ZIARNO)
    mapa = szkic_na_mape(rng)

    for x0, y0, x1, y1 in PRZEJSCIA:
        for y in range(y0, y1 + 1):
            for x in range(x0, x1 + 1):
                if mapa[y][x] in '#~':
                    mapa[y][x] = '.'

    # Punkty orientacyjne muszą stać na przejezdnym terenie — inaczej trasa
    # do nich nie istnieje i drogi cicho się nie wytyczą.
    for x, y in PUNKTY.values():
        for dy in (-1, 0, 1):
            for dx in (-1, 0, 1):
                if 0 <= x + dx < BOK and 0 <= y + dy < BOK and mapa[y + dy][x + dx] in '#~':
                    mapa[y + dy][x + dx] = '.'

    for a, b in zip(SZLAK, SZLAK[1:]):
        droga = trasa(mapa, PUNKTY[a], PUNKTY[b])
        if droga is None:
            raise SystemExit(f'Brak trasy: {a} → {b}. Popraw SZKIC.')
        for x, y in droga:
            mapa[y][x] = '='

    return mapa


mapa = zbuduj()
dostepne = osiagalne(mapa, PUNKTY['start'])
for nazwa, (x, y) in PUNKTY.items():
    if (x, y) not in dostepne:
        raise SystemExit(f'{nazwa} jest nieosiągalny ze startu.')


# ---------------------------------------------------------------------------
# OBIEKTY
# ---------------------------------------------------------------------------
#
# Też rozstawiane skryptem, i z tego samego powodu co teren: obiekt postawiony
# ręcznie na polu, które okazało się skałą, wygląda jak usterka silnika.
# Skrypt stawia je tylko na polach przejezdnych, z zachowaniem odstępu.
#
# Trudność rośnie z odległością od startu — to jedyna rzecz, która na mapie bez
# fabuły mówi dziecku „tam jeszcze nie idź". W Heroes 3 robi to samo strażnik
# przy wejściu do kopalni.

def odleglosc(a, b):
    return max(abs(a[0] - b[0]), abs(a[1] - b[1]))


def wolne_pola(mapa, zajete, od_startu=(0, 999), min_odstep=2):
    start = PUNKTY['start']
    wynik = []
    for y in range(BOK):
        for x in range(BOK):
            if mapa[y][x] not in '.,':
                continue
            d = odleglosc((x, y), start)
            if not (od_startu[0] <= d <= od_startu[1]):
                continue
            if any(odleglosc((x, y), z) < min_odstep for z in zajete):
                continue
            wynik.append((x, y))
    return wynik


def rozstaw(mapa, rng):
    zajete = list(PUNKTY.values())
    obiekty = []

    def dodaj(ile, od_startu, buduj):
        for _ in range(ile):
            wolne = wolne_pola(mapa, zajete, od_startu)
            if not wolne:
                continue
            pole = rng.choice(wolne)
            zajete.append(pole)
            obiekty.append((pole, buduj(pole)))

    # Blisko startu: dwa surowce i sad — pierwsza tura ma mieć oczywisty cel.
    dodaj(2, (2, 6), lambda p: ('surowiec', 'jagoda'))
    dodaj(1, (3, 7), lambda p: ('kopalnia', 'jagoda'))
    # Średni dystans: reszta gospodarki.
    dodaj(3, (6, 16), lambda p: ('surowiec', rng.choice(['jagoda', 'odlamek', 'pokeball'])))
    dodaj(2, (7, 16), lambda p: ('kopalnia', rng.choice(['odlamek', 'pokeball'])))
    dodaj(3, (5, 16), lambda p: ('skrzynia', None))
    dodaj(4, (4, 16), lambda p: ('potwor', 'slaby'))
    dodaj(1, (8, 16), lambda p: ('artefakt', None))
    # Daleko, głównie za przełęczą: nagrody i straże.
    dodaj(4, (17, 40), lambda p: ('surowiec', rng.choice(['odlamek', 'kamien', 'pokeball'])))
    dodaj(2, (17, 40), lambda p: ('kopalnia', rng.choice(['kamien', 'pokeball'])))
    dodaj(3, (17, 40), lambda p: ('skrzynia', None))
    dodaj(5, (17, 40), lambda p: ('potwor', 'silny'))
    dodaj(2, (17, 40), lambda p: ('artefakt', None))
    return obiekty


rng2 = random.Random(ZIARNO + 1)
obiekty = rozstaw(mapa, rng2)
# Strażnik przełęczy stoi osobno i zawsze w tym samym miejscu: to jedyne
# przejście na mapie, więc ma być pilnowane, a nie przypadkowo puste.
px, py = PUNKTY['przelecz']
obiekty.append(((px + 1, py), ('potwor', 'straznik')))
print(f'obiektów: {len(obiekty)}')

wiersze = [''.join(w) for w in mapa]
udzial = {z: sum(w.count(z) for w in wiersze) for z in '.,=T#~'}
print(f'plansza {BOK} × {BOK}, pól przejezdnych: {len(dostepne)}')
print('udział terenów:', {k: f'{v * 100 // (BOK * BOK)}%' for k, v in udzial.items()})

naglowek = f'''// PLIK GENEROWANY — nie poprawiaj ręcznie.
// Źródło: tools/generuj_mape.py (szkic krain jest w tamtym pliku).
//
// Plansza {BOK} × {BOK} — rozmiar małej mapy z Heroes 3.
// Znaki: . trawa, = ścieżka, , piasek, T las, # skały, ~ woda.

export const TEREN = [
'''
tresc = naglowek + ''.join(f"  '{w}',\n" for w in wiersze) + '];\n\n'
tresc += 'export const PUNKTY = {\n'
for nazwa, (x, y) in PUNKTY.items():
    tresc += f"  '{nazwa}': {{ x: {x}, y: {y} }},\n"
tresc += '};\n\n'
tresc += 'export const ROZSTAWIENIE: Array<{ x: number; y: number; rodzaj: string; surowiec?: string; sila?: string }> = [\n'
for (x, y), (rodzaj, co) in obiekty:
    if rodzaj == 'potwor':
        tresc += f"  {{ x: {x}, y: {y}, rodzaj: 'potwor', sila: '{co}' }},\n"
    elif co:
        tresc += f"  {{ x: {x}, y: {y}, rodzaj: '{rodzaj}', surowiec: '{co}' }},\n"
    else:
        tresc += f"  {{ x: {x}, y: {y}, rodzaj: '{rodzaj}' }},\n"
tresc += '];\n'
WYNIK.write_text(tresc, encoding='utf-8')
print(f'zapisano {WYNIK.relative_to(KORZEN)}')
