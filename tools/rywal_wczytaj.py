#!/usr/bin/env python3
"""Rywal na mapę i odznaki sal — z wsadu OpenAI do gry.

Wsad (`tools/PROMPTY-BOHATER.md`, rozdział 4): `tools/wsad/rywal-lewo.png`
i `tools/wsad/odznaka-<id>.png`, prawdziwa alfa (styl `obiekt`).
Wyjście:
  public/mapa/rywal.png          — sylwetka przycięta do alfy, 256 px wysokości
                                   (na mapie ~70 px, jak Janek: `WYS_BOHATERA`)
  public/bohater/odznaka-<id>.png — przypinka przycięta, 128 px na dłuższym boku

    python3 tools/rywal_wczytaj.py
"""

from pathlib import Path

from PIL import Image, ImageEnhance

KORZEN = Path(__file__).resolve().parent.parent
WSAD = KORZEN / 'tools' / 'wsad'


def przytnij(im: Image.Image) -> Image.Image:
    # Półprzezroczysty pył na brzegu kadru nie jest sylwetką.
    ramka = im.split()[3].point(lambda a: 255 if a > 24 else 0).getbbox()
    return im.crop(ramka)


def podkrec(im: Image.Image, kolor=1.1, kontrast=1.05) -> Image.Image:
    rgb = ImageEnhance.Contrast(ImageEnhance.Color(im.convert('RGB')).enhance(kolor)).enhance(kontrast)
    return Image.merge('RGBA', (*rgb.split(), im.split()[3]))


def zapisz(im: Image.Image, cel: Path):
    cel.parent.mkdir(parents=True, exist_ok=True)
    im.save(cel, optimize=True)
    print(f'{cel.relative_to(KORZEN)}  {im.width}×{im.height}  {cel.stat().st_size // 1024} kB')


rywal = podkrec(przytnij(Image.open(WSAD / 'rywal-lewo.png').convert('RGBA')))
wys = 256
zapisz(rywal.resize((round(rywal.width * wys / rywal.height), wys), Image.LANCZOS), KORZEN / 'public' / 'mapa' / 'rywal.png')

for plik in sorted(WSAD.glob('odznaka-*.png')):
    im = przytnij(Image.open(plik).convert('RGBA'))
    im.thumbnail((128, 128), Image.LANCZOS)
    zapisz(podkrec(im, 1.08, 1.04), KORZEN / 'public' / 'bohater' / plik.name)
