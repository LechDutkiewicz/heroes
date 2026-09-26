#!/usr/bin/env python3
"""Malowane ikony ekranu bohatera: umiejętności drugorzędne i artefakty.

Prompty: `tools/PROMPTY-BOHATER.md`. Obrazki z OpenAI (prawdziwa alfa) leżą
w `tools/wsad/umiejetnosc-*.png` i `tools/wsad/artefakt-*.png`. Artefakty,
które już mają malowany odpowiednik, biorą go stamtąd (tabela `REUZYTE`):
gotowe ikony kampanii kopiujemy bez zmian (mają już obrys), relikty z mapy
zdejmujemy z magenty i przepuszczamy przez to samo `gotowa()` co resztę.

    python3 tools/bohater_ikony.py
      → public/bohater/umiejetnosc-<id>.png, public/bohater/artefakt-<id>.png
        (128 × 128, ten sam ciemny obrys co ikony kampanii)
      → tools/blind/ikony-bohater.png (arkusz kontrolny, ikony w 48 px)
"""

import shutil
from pathlib import Path

from PIL import Image, ImageDraw, ImageFont

from kampania_ikony import oczysc
from kampania_postacie import W, gotowa
from wsad_wczytaj import bezChromy, jestChroma

import numpy as np

KORZEN = Path(__file__).resolve().parent.parent
CEL = KORZEN / 'public' / 'bohater'
ARKUSZ = KORZEN / 'tools' / 'blind' / 'ikony-bohater.png'

#: Kolejność i nazwy jak w `src/data/umiejetnosci.ts` (UMIEJETNOSCI).
UMIEJETNOSCI = [
    ('zwiad', 'Zwiad'), ('tropiciel', 'Tropiciel'), ('napastnik', 'Napastnik'),
    ('lucznictwo', 'Łucznictwo'), ('pancerz', 'Pancerz'), ('gospodarnosc', 'Gospodarność'),
    ('nauka', 'Nauka'), ('uzdrowiciel', 'Uzdrowiciel'),
]

#: Kolejność i nazwy jak w `src/data/mapa.ts` (ARTEFAKTY).
ARTEFAKTY = [
    ('opaska', 'Opaska Treningowa'), ('kamizelka', 'Kamizelka Ochronna'),
    ('buty', 'Buty Wędrowca'), ('pazur', 'Pazur Ostrza'), ('tarcza', 'Tarcza z Łusek'),
    ('rower', 'Rower Terenowy'), ('mistrz', 'Pas Mistrza Areny'),
    ('skrzydla', 'Skrzydła Latającego'), ('ksiezycowy-kamien', 'Księżycowy Kamień'),
]

#: Artefakty z gotową malowaną ikoną — zamiast generować nową.
REUZYTE = {
    'buty': KORZEN / 'public' / 'kampania' / 'ikona-buty.png',
    'tarcza': KORZEN / 'public' / 'kampania' / 'ikona-tarcza.png',
    'rower': KORZEN / 'public' / 'kampania' / 'ikona-rower.png',
    'mistrz': Path(W) / 'relikt-pas.png',
    'skrzydla': Path(W) / 'relikt-skrzydla.png',
}


def przetworz(zrodlo: Path, cel: Path) -> bool:
    if not zrodlo.exists():
        print(f'  brak {zrodlo.name} — pomijam {cel.name}')
        return False
    im = Image.open(zrodlo).convert('RGBA')
    if im.size == (128, 128):
        # Już gotowa ikona kampanii (z obrysem) — drugi obrys by ją pogrubił.
        shutil.copyfile(zrodlo, cel)
    else:
        if jestChroma(np.asarray(im)):
            im = domknij(bezChromy(im))
        gotowa(oczysc(im)).save(cel, optimize=True)
    print(f'  {cel.name}  ← {zrodlo.relative_to(KORZEN)}')
    return True


def domknij(im):
    """Porządki po zdjęciu magenty z reliktu mapy. Relikt ma różową
    poświatę (na mapie to „blask", w gnieździe brudna mgiełka) — zerujemy
    półprzezroczyste piksele z przewagą czerwieni i błękitu nad zielenią.
    A dziury zamknięte w bryle (paszcza lwa na klamrze pasa, przez którą
    prześwitywało tło) zalewamy ciemnym brązem zamiast pokazywać gniazdo."""
    from scipy import ndimage
    tab = np.asarray(im).astype(np.float32)
    r, g, b, a = (tab[:, :, i] for i in range(4))
    roz = (r + b) / 2 - g
    tab[:, :, 3] = np.where((a < 200) & (roz > 15), 0, a)
    pelne = tab[:, :, 3] > 128
    dziury = ndimage.binary_fill_holes(pelne) & ~pelne
    dziury = ndimage.binary_dilation(dziury, iterations=1) & (tab[:, :, 3] < 250)
    tab[dziury] = [52, 24, 16, 255]
    return Image.fromarray(tab.astype(np.uint8), 'RGBA')


def arkusz(wpisy):
    """Wszystkie ikony w 48 px na kaflach w barwach gniazda HoMM3."""
    kol, bok, kafel, podpis = 9, 48, 56, 34
    wiersze = (len(wpisy) + kol - 1) // kol
    szer, wys = kol * (kafel + 44), wiersze * (kafel + podpis) + 16
    tlo = Image.new('RGBA', (szer, wys), (46, 30, 18, 255))
    d = ImageDraw.Draw(tlo)
    try:
        font = ImageFont.truetype('/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf', 10)
    except OSError:
        font = ImageFont.load_default()
    for i, (plik, nazwa) in enumerate(wpisy):
        cx = (i % kol) * (kafel + 44) + (kafel + 44) // 2
        y = (i // kol) * (kafel + podpis) + 8
        x = cx - kafel // 2
        # Gniazdo: ciemne wnętrze, złotawa ramka jak w oknie bohatera.
        d.rectangle((x - 2, y - 2, x + kafel + 1, y + kafel + 1), fill=(140, 104, 46, 255))
        d.rectangle((x, y, x + kafel - 1, y + kafel - 1), fill=(58, 38, 24, 255))
        ik = Image.open(plik).convert('RGBA').resize((bok, bok), Image.LANCZOS)
        tlo.alpha_composite(ik, (x + (kafel - bok) // 2, y + (kafel - bok) // 2))
        for j, linia in enumerate(nazwa.split(' ', 1) if len(nazwa) > 14 else [nazwa]):
            w = d.textlength(linia, font=font)
            d.text((cx - w / 2, y + kafel + 4 + j * 12), linia, fill=(240, 220, 160, 255), font=font)
    ARKUSZ.parent.mkdir(parents=True, exist_ok=True)
    tlo.save(ARKUSZ, optimize=True)
    print(f'  arkusz: {ARKUSZ.relative_to(KORZEN)}')


def main():
    CEL.mkdir(parents=True, exist_ok=True)
    wpisy = []
    for id_, nazwa in UMIEJETNOSCI:
        cel = CEL / f'umiejetnosc-{id_}.png'
        if przetworz(Path(W) / f'umiejetnosc-{id_}.png', cel):
            wpisy.append((cel, nazwa))
    for id_, nazwa in ARTEFAKTY:
        cel = CEL / f'artefakt-{id_}.png'
        if przetworz(REUZYTE.get(id_, Path(W) / f'artefakt-{id_}.png'), cel):
            wpisy.append((cel, nazwa))
    arkusz(wpisy)


if __name__ == '__main__':
    main()
