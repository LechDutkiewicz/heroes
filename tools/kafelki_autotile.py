#!/usr/bin/env python3
"""Buduje tablicę autokafelkowania z arkusza `public/mapa-tileset.png`.

Po co to w ogóle jest
---------------------
Pierwsza wersja mapy przygody kładła jeden kafelek na jedno pole. Wyglądało to
jak kocyk w kratę: trawa kończyła się prostą, pionową krawędzią, woda stykała
się z piaskiem pod kątem prostym. W Heroes 3 (i w tym arkuszu) granice terenów
są miękkie, bo arkusz ma komplet kafelków przejściowych.

Arkusz jest „narożnikowy": o tym, który kafelek pasuje, decydują CZTERY rogi,
a nie sąsiedzi pola. Kafelek (0,1) ma trawę w trzech rogach i piasek w prawym
dolnym, więc jest lewym górnym narożnikiem plaży. Stąd sygnatura jak `GGGP`:
lewy górny, prawy górny, lewy dolny, prawy dolny.

Dlaczego tablica jest ODCZYTANA, a nie wpisana
----------------------------------------------
Ręczne przepisanie kilkudziesięciu indeksów z obrazka to gwarantowana pomyłka,
a pomyłka w takiej tablicy nie wygląda na pomyłkę — wygląda na dziwny teren.
Ten skrypt klasyfikuje rogi każdego kafelka po kolorze i wypisuje tablicę,
którą da się sprawdzić przez porównanie z arkuszem.

Woda jest animowana: te same układy powtarzają się co trzy wiersze, cztery
razy. Stąd każda sygnatura dostaje cztery klatki (dla terenów nieruchomych
cztery razy tę samą).

    python3 tools/kafelki_autotile.py
"""

from pathlib import Path

import numpy as np
from PIL import Image

KORZEN = Path(__file__).resolve().parent.parent
ARKUSZ = KORZEN / 'public' / 'mapa-tileset.png'
WYNIK = KORZEN / 'src' / 'data' / 'kafelki.ts'

S = 16
ARKUSZ_KOL = 52

# Kafelki wzorcowe — po nich rozpoznajemy, co jest w rogu.
BAZY = {'G': (0, 0), 'P': (1, 0), 'W': (7, 0)}

# Bloki przejściowe: (kolumny, wiersze, ile klatek animacji, odstęp wierszy).
BLOKI = [
    ((0, 5), (1, 3), 1, 0),   # trawa ↔ piasek
    ((0, 5), (7, 9), 4, 3),   # trawa ↔ woda
    ((6, 11), (7, 9), 4, 3),  # piasek ↔ woda
]

im = np.array(Image.open(ARKUSZ).convert('RGBA')).astype(int)
wzor = {
    k: im[r * S:(r + 1) * S, c * S:(c + 1) * S, :3].reshape(-1, 3).mean(0)
    for k, (c, r) in BAZY.items()
}


def klasa(px):
    """Do którego terenu jest najbliżej ten JEDEN piksel."""
    if px[3] < 40:
        return '?'
    najlepszy, klucz = 1e9, '?'
    for k, v in wzor.items():
        d = ((px[:3] - v) ** 2).sum()
        if d < najlepszy:
            najlepszy, klucz = d, k
    return klucz if najlepszy < 9000 else '?'


def rog(c, r, dx, dy):
    """Teren w rogu kafelka — głosowanie pikseli, nie ich średnia.

    Średnia z rogu mieszała trawę z wodą w kolor, który nie jest ani jednym,
    ani drugim, i pół arkusza wypadało jako „nierozpoznane". Piksele na brzegu
    są przejściowe z definicji; liczy się, czego jest w rogu najwięcej.
    """
    n = 3
    y0 = r * S + (0 if dy == 0 else S - n)
    x0 = c * S + (0 if dx == 0 else S - n)
    blok = im[y0:y0 + n, x0:x0 + n].reshape(-1, 4)
    glosy: dict[str, int] = {}
    for px in blok:
        k = klasa(px)
        if k != '?':
            glosy[k] = glosy.get(k, 0) + 1
    if not glosy:
        return '?'
    najlepszy = max(glosy, key=lambda k: glosy[k])
    # Wymagamy przewagi, żeby róg dokładnie na granicy nie trafił do tablicy
    # jako pewny — taki kafelek pasowałby wtedy do dwóch różnych układów.
    return najlepszy if glosy[najlepszy] >= 0.6 * (n * n) else '?'


def sygnatura(c, r):
    return ''.join(rog(c, r, dx, dy) for dy in (0, 1) for dx in (0, 1))


def indeks(c, r):
    return r * ARKUSZ_KOL + c


tablica: dict[str, list[int]] = {}


def dodaj(sig, klatki):
    # Pierwsze trafienie wygrywa: bloki są uporządkowane od najczystszych.
    if '?' not in sig and sig not in tablica:
        tablica[sig] = klatki


for k, (c, r) in BAZY.items():
    dodaj(k * 4, [indeks(c, r)] * 4)

for (c0, c1), (r0, r1), klatek, odstep in BLOKI:
    for c in range(c0, c1 + 1):
        for r in range(r0, r1 + 1):
            dodaj(sygnatura(c, r), [indeks(c, r + i * odstep) for i in range(klatek)] * (4 // klatek))

# Ile z 3^4 = 81 układów pokrywamy. Interesują nas te złożone z dwóch terenów —
# układy z trzema naraz w tym arkuszu nie istnieją i trzeba je obejść przy
# rysowaniu mapy, a nie udawać, że są.
pary = 0
brak = []
for a in 'GPW':
    for b in 'GPW':
        if a == b:
            continue
        for m in range(16):
            sig = ''.join((a, b)[(m >> i) & 1] for i in range(4))
            pary += 1
            if sig not in tablica:
                brak.append(sig)

print(f'sygnatur w tablicy: {len(tablica)}')
print(f'brakujące układy dwóch terenów: {sorted(set(brak))}')

linie = [
    '// PLIK GENEROWANY — nie poprawiaj ręcznie.',
    '// Źródło: tools/kafelki_autotile.py, arkusz: public/mapa-tileset.png',
    '//',
    '// Sygnatura to cztery rogi kafelka w kolejności: lewy górny, prawy górny,',
    '// lewy dolny, prawy dolny. G = trawa, P = piasek, W = woda. Wartość to',
    '// cztery klatki animacji (dla terenów nieruchomych ta sama cztery razy).',
    '',
    'export const KLATEK = 4;',
    '',
    'export const SYGNATURY: Record<string, number[]> = {',
]
for sig in sorted(tablica):
    linie.append(f'  {sig}: [{", ".join(str(x) for x in tablica[sig])}],')
linie.append('};')
linie.append('')
WYNIK.write_text('\n'.join(linie), encoding='utf-8')
print(f'zapisano {WYNIK.relative_to(KORZEN)}')
