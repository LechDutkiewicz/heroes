#!/usr/bin/env python3
"""Tła i przeszkody pola bitwy w stylu gier Pokémon (ekran bitwy).

Tło zależy od pola mapy, na którym stoi trener (`src/data/terenBitwy.ts`).
Prompty: `tools/PROMPTY-MAPA-3.md`, „Tła walki wg terenu".

    python3 tools/walka_wczytaj.py
      tools/wsad/tlo-walka-<teren>.png → public/terrain/<teren>.jpg (960 × 600)
      tools/wsad/przeszkoda-<nazwa>.png → public/terrain/obstacles/przeszkoda-<nazwa>.png
"""
from pathlib import Path

from PIL import Image

from osadz_podstawke import oczysc_brzeg

KORZEN = Path(__file__).resolve().parent.parent
WSAD = KORZEN / 'tools' / 'wsad'
TLA = KORZEN / 'public' / 'terrain'
W, H = 960, 600


def main() -> None:
    for zrodlo in sorted(WSAD.glob('tlo-walka-*.png')):
        teren = zrodlo.stem.removeprefix('tlo-walka-')
        im = Image.open(zrodlo).convert('RGB')
        # Kadr na proporcje 8 : 5 od dołu — horyzont zostaje u góry, a to, co
        # plansza i tak przytnie, odpada z nieba.
        k = max(W / im.width, H / im.height)
        im = im.resize((round(im.width * k), round(im.height * k)), Image.LANCZOS)
        x = (im.width - W) // 2
        im = im.crop((x, im.height - H, x + W, im.height))
        # JPG: tło jest nieprzezroczyste, a PNG ważył ~1 MB na teren.
        im.save(TLA / f'{teren}.jpg', quality=88, optimize=True, progressive=True)
        print(f'  terrain/{teren}.jpg')
    for zrodlo in sorted(WSAD.glob('przeszkoda-*.png')):
        im = oczysc_brzeg(Image.open(zrodlo).convert('RGBA'))
        im = im.crop(im.getchannel('A').point(lambda v: 255 if v > 24 else 0).getbbox())
        im.thumbnail((256, 256), Image.LANCZOS)
        im.save(TLA / 'obstacles' / zrodlo.name, optimize=True)
        print(f'  terrain/obstacles/{zrodlo.name}')


if __name__ == '__main__':
    main()
