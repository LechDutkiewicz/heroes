#!/usr/bin/env python3
"""Maluje teren planszy przygody z tekstur modelu — w pełnej rozdzielczości.

Dlaczego to zastępuje arkusz kafelków
-------------------------------------
Dotychczasowy potok składał teren z arkusza 16-pikselowego i powiększał go
trzykrotnie z medianą, bo źródłem był pixel art. Teraz źródłem są tekstury
768 × 768 z modelu graficznego. Przepuszczenie ich przez tamtą drogę
oznaczałoby zmniejszenie do 16 px i powiększenie z powrotem, czyli wyrzucenie
niemal całego detalu, po który w ogóle sięgnęliśmy po te tekstury.

Więc malujemy odwrotnie: od razu w skali ekranu (48 px na pole), teksturą
kafelkowaną po całej planszy, a granice krain wycinamy MASKĄ, a nie kafelkiem
przejściowym. Maska da się zmiękczyć i porozrywać szumem, więc plaża kończy
się nieregularnie — a arkusz miał tylko jeden, ten sam narożnik przejściowy,
powtarzany wzdłuż całego brzegu.

Ten moduł daje same warstwy; składaniem planszy, drogami i klatkami wody
zajmuje się `render_mapa.py`.
"""

from pathlib import Path

import numpy as np
from PIL import Image, ImageFilter

KORZEN = Path(__file__).resolve().parent.parent
TEREN = KORZEN / 'public' / 'mapa' / 'teren'

#: Ziarno szumu granic. Stałe, żeby plansza wyglądała tak samo po każdym
#: przegenerowaniu — inaczej nie da się porównać dwóch wersji na oko.
ZIARNO = 20260905


def tekstura(nazwa: str) -> Image.Image:
    return Image.open(TEREN / f'teren-{nazwa}.png').convert('RGB')


def kafelkuj(tex: Image.Image, szer: int, wys: int, przesun=(0, 0)) -> Image.Image:
    """Rozkłada teksturę na całą planszę, odbijając co drugi kafel.

    Odbicie jest tu po to, żeby nie było widać kratownicy: tekstura pokrywa
    16 pól, plansza ma 36, więc powtórzenie wypada w kadrze i bez odbicia
    oko od razu je łapie jako powtarzalny wzór.
    """
    t = tex.width
    out = Image.new('RGB', (szer, wys))
    dx, dy = przesun
    for j in range((wys // t) + 2):
        for i in range((szer // t) + 2):
            kafel = tex
            if i % 2:
                kafel = kafel.transpose(Image.FLIP_LEFT_RIGHT)
            if j % 2:
                kafel = kafel.transpose(Image.FLIP_TOP_BOTTOM)
            out.paste(kafel, (i * t - t + dx % t, j * t - t + dy % t))
    return out


def szum(szer: int, wys: int, ziarnistosc: int, ziarno: int) -> np.ndarray:
    """Gładki szum wartościowy w zakresie −1…1.

    Losujemy małą tablicę i powiększamy dwuliniowo. Szum piksel po pikselu
    dałby granicę postrzępioną jak brzeg wydartej kartki — chcemy zatoczek
    i cypli wielkości pola, nie pojedynczych pikseli.
    """
    rng = np.random.default_rng(ziarno)
    mala = rng.random((max(2, wys // ziarnistosc), max(2, szer // ziarnistosc)), dtype=np.float32)
    duza = np.asarray(
        Image.fromarray((mala * 255).astype(np.uint8), 'L').resize((szer, wys), Image.BICUBIC),
        dtype=np.float32,
    )
    return duza / 127.5 - 1.0


def maska(
    pola: np.ndarray, kafel: int, wtapianie: float, poszarpanie: float, ziarno: int
) -> Image.Image:
    """Zamienia siatkę pól „tak/nie" w miękką, nieregularną maskę na piksele.

    `wtapianie` i `poszarpanie` są w polach: pierwsze mówi, jak szeroko krainy
    się przenikają, drugie — jak bardzo granica odbiega od siatki. Bez tego
    drugiego każda plaża kończyłaby się rozmytą, ale wciąż prostokątną linią.
    """
    wys, szer = pola.shape
    m = Image.fromarray((pola * 255).astype(np.uint8), 'L').resize(
        (szer * kafel, wys * kafel), Image.BILINEAR
    )
    m = m.filter(ImageFilter.GaussianBlur(wtapianie * kafel))
    tab = np.asarray(m, dtype=np.float32) / 255.0
    tab += szum(szer * kafel, wys * kafel, max(2, int(kafel * 0.9)), ziarno) * poszarpanie
    # Zaostrzenie: po dodaniu szumu przejście rozlewa się na kilka pól.
    # Mnożnik ściąga je z powrotem do pasa mniej więcej jednego pola.
    tab = ((tab - 0.5) * 3.0 + 0.5).clip(0, 1)
    return Image.fromarray((tab * 255).astype(np.uint8), 'L')
