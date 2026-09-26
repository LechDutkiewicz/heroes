#!/usr/bin/env python3
"""Malowane ikony celów misji i nagród ekranu kampanii: wsad → pliki gry.

Prompty: `tools/PROMPTY-KAMPANIA.md`, rozdział 5. Obrazki (OpenAI, prawdziwa
alfa) leżą w `tools/wsad/ikona-*.png`. Każda ikona przechodzi przez tę samą
`gotowa()` co ikony surowców w `kampania_postacie.py` — ten sam ciemny obrys
i kadr 128 × 128 — więc z różnych źródeł wychodzi jeden komplet.

    python3 tools/kampania_ikony.py     # → public/kampania/ikona-*.png

Scena czyta je jako `k-ikona-<nazwa>`: gwiazda, czaszka, klepsydra i sakwa
w wierszach zwoju misji, miecz, tarcza i rower w kartach nagród.
"""

from pathlib import Path

import numpy as np
from PIL import Image
from scipy import ndimage

from kampania_postacie import CEL, W, gotowa

IKONY = ('gwiazda', 'czaszka', 'klepsydra', 'sakwa', 'miecz', 'tarcza', 'rower')


def main():
    for nazwa in IKONY:
        zrodlo = Path(W) / f'ikona-{nazwa}.png'
        if not zrodlo.exists():
            print(f'  brak {zrodlo.name} — zostaje stara ikona')
            continue
        im = Image.open(zrodlo).convert('RGBA')
        gotowa(oczysc(im)).save(CEL / f'ikona-{nazwa}.png', optimize=True)
        print(f'  ikona-{nazwa}.png')


def oczysc(im):
    """Zostawia sam przedmiot. Model zostawia w alfie śmieci: mgiełkę
    o kryciu kilku procent i cienkie kreski przy krawędziach kadru (do 70 %
    krycia). `getbbox` brał je za część ikony, a obrys z `gotowa` robił z nich
    ramkę. Bierzemy największą bryłę i to, co przy niej, resztę zerujemy."""
    a = np.asarray(im.getchannel('A')).astype(np.float32)
    bryly, ile = ndimage.label(a > 40)
    if ile == 0:
        return im
    rozmiary = ndimage.sum(np.ones_like(a), bryly, range(1, ile + 1))
    # Części przedmiotu bywają rozdzielone (koło roweru, drobinka piasku),
    # więc zostają też bryły niemałe w stosunku do głównej.
    # Kreski leżą przy krawędzi kadru — bryła, która jej dotyka, zostaje
    # tylko wtedy, gdy jest główną.
    brzeg = set(np.unique(np.concatenate([bryly[0], bryly[-1], bryly[:, 0], bryly[:, -1]]))) - {0}
    glowna = int(np.argmax(rozmiary)) + 1
    zostaw = np.isin(bryly, [
        i + 1 for i, r in enumerate(rozmiary)
        if i + 1 == glowna or (r >= 0.02 * rozmiary.max() and i + 1 not in brzeg)
    ])
    maska = ndimage.binary_dilation(zostaw, iterations=6)
    a = np.where(maska, a, 0)
    a[a < 12] = 0
    out = im.copy()
    out.putalpha(Image.fromarray(a.astype(np.uint8)))
    return out


if __name__ == '__main__':
    main()
