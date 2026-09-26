#!/usr/bin/env python3
"""Postać bohatera w całej sylwetce do lalki na ekranie bohatera.

Wsad: `tools/wsad/postac-<janek|ela>.png` (PROMPTY-BOHATER.md, rozdział 3 —
OpenAI `images/edits` z portretem kampanii jako wzorem, prawdziwa alfa).
Wyjście: `public/bohater/postac-<kto>.png`, przycięte do sylwetki, 600 px
wysokości (na ekranie ~420 px, więc przy skali 2 dalej ostro).

Model oddaje postać odrobinę matową obok portretów kampanii — lekko
podnosimy nasycenie i kontrast, żeby medalion (głowa z portretu) i lalka
wyglądały jak ta sama ręka.

    python3 tools/bohater_postac.py
"""

from pathlib import Path

from PIL import Image, ImageEnhance

KORZEN = Path(__file__).resolve().parent.parent
WSAD = KORZEN / 'tools' / 'wsad'
CEL = KORZEN / 'public' / 'bohater'
WYS = 600

for kto in ('janek', 'ela'):
    src = WSAD / f'postac-{kto}.png'
    im = Image.open(src).convert('RGBA')
    alfa = im.split()[3]
    # Półprzezroczysty pył na brzegu kadru nie jest sylwetką.
    ramka = alfa.point(lambda a: 255 if a > 24 else 0).getbbox()
    im = im.crop(ramka)
    rgb = im.convert('RGB')
    rgb = ImageEnhance.Color(rgb).enhance(1.14)
    rgb = ImageEnhance.Contrast(rgb).enhance(1.06)
    im = Image.merge('RGBA', (*rgb.split(), im.split()[3]))
    w = round(im.width * WYS / im.height)
    im = im.resize((w, WYS), Image.LANCZOS)
    CEL.mkdir(parents=True, exist_ok=True)
    out = CEL / f'postac-{kto}.png'
    im.save(out, optimize=True)
    print(f'{out.relative_to(KORZEN)}  {im.width}×{im.height}  {out.stat().st_size // 1024} kB')
