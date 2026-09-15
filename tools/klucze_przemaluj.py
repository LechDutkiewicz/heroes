#!/usr/bin/env python3
"""Przemalowuje chorągiew strażnicy i płótno namiotu na barwy kluczy.

Po co
-----
Strażnica graniczna otwiera się kluczem w SWOJEJ barwie, więc barwa musi być
widoczna z mapy — inaczej gracz stoi przed bramą i nie wie, którego klucznika
szuka. Model dostarcza jeden plik; trzy dostawy tego samego obiektu w trzech
barwach kosztowałyby trzy razy tyle i rozjechały styl (to samo rozstrzygnięcie,
co przy bryłach miast w `frakcje_przemaluj.py`).

Jak to działa
-------------
Chorągiew jest jedynym elementem obu rysunków o odcieniu CZERWONYM i wysokim
nasyceniu. Drewno wrót leży obok niej na kole barw (odcień 24° przy 11°
chorągwi), więc samo „przemaluj wszystko, co ciepłe" zamieniłoby bramę w zieloną
budkę. Bierzemy zatem wąski klin: odcień poniżej 18° i nasycenie powyżej 0,55.
Zmieniamy sam ODCIEŃ, zostawiając jasność i nasycenie piksela — dzięki temu
fałdy płótna i cień pod belką zostają tam, gdzie były.

    python3 tools/klucze_przemaluj.py
"""

import colorsys
from pathlib import Path

import numpy as np
from PIL import Image

KORZEN = Path(__file__).resolve().parent.parent
KATALOG = KORZEN / 'public' / 'mapa'

#: Klin barwny chorągwi. Zmierzone na dostawie: chorągiew 11°/0,75, drewno
#: wrót 24°/0,65, latarnie 30°/0,36, kamień 40°/0,16.
ODCIEN_DO = 18 / 360
NASYCENIE_OD = 0.55

#: Docelowe odcienie kluczy. Te same barwy co `KLUCZE` w `src/data/mapa.ts` —
#: rozjazd między nimi znaczy chorągiew w innym kolorze niż napis w grze.
BARWY = {
    'zielony': 130 / 360,
    'niebieski': 212 / 360,
}

PLIKI = ['straznica', 'namiot-klucznika']


def przemaluj(im: Image.Image, odcien: float) -> Image.Image:
    a = np.asarray(im.convert('RGBA')).astype(np.float32) / 255.0
    rgb, alfa = a[..., :3], a[..., 3]

    mx = rgb.max(axis=2)
    mn = rgb.min(axis=2)
    nasycenie = np.where(mx > 0, (mx - mn) / np.maximum(mx, 1e-6), 0)
    # Odcień liczony wprost, bez pętli po pikselach: obraz ma 40 tys. pikseli,
    # a `colorsys` per piksel to sekundy zamiast milisekund.
    h = np.zeros_like(mx)
    delta = np.maximum(mx - mn, 1e-6)
    czerwony = mx == rgb[..., 0]
    zielony = mx == rgb[..., 1]
    h = np.where(czerwony, ((rgb[..., 1] - rgb[..., 2]) / delta) % 6, h)
    h = np.where(~czerwony & zielony, (rgb[..., 2] - rgb[..., 0]) / delta + 2, h)
    h = np.where(~czerwony & ~zielony, (rgb[..., 0] - rgb[..., 1]) / delta + 4, h)
    h = (h / 6) % 1.0

    maska = (alfa > 0.5) & (nasycenie > NASYCENIE_OD) & ((h < ODCIEN_DO) | (h > 0.95))
    wynik = np.array(a, copy=True)
    ys, xs = np.nonzero(maska)
    for y, x in zip(ys, xs):
        r, g, b = a[y, x, :3]
        _, s, v = colorsys.rgb_to_hsv(r, g, b)
        wynik[y, x, :3] = colorsys.hsv_to_rgb(odcien, s, v)
    return Image.fromarray((wynik * 255).astype(np.uint8), 'RGBA'), int(maska.sum())


if __name__ == '__main__':
    for plik in PLIKI:
        zrodlo = KATALOG / f'{plik}.png'
        if not zrodlo.exists():
            raise SystemExit(f'Brak {zrodlo.relative_to(KORZEN)} — najpierw `python3 tools/wsad_wczytaj.py`.')
        im = Image.open(zrodlo)
        for nazwa, odcien in BARWY.items():
            wynik, ile = przemaluj(im, odcien)
            if ile < 200:
                raise SystemExit(
                    f'{plik}: chorągiew ma tylko {ile} pikseli — klin barwny nie trafił. '
                    f'Zmierz odcień na nowej dostawie, zanim poprawisz stałe.'
                )
            wynik.save(KATALOG / f'{plik}-{nazwa}.png')
            print(f'  {plik}-{nazwa}.png  ({ile} pikseli chorągwi)')
