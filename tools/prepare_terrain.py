#!/usr/bin/env python3
"""
Składa tła pola bitwy z autorskich grafik z paczki.

Oryginały (assets/kit/backgrounds/, 640x360) mają u góry niebo i las, a niżej
grunt. Rozciągnięte wprost na planszę wychodzą tak, że oddziały z górnych
rzędów stoją „na drzewach" i na horyzoncie zamiast na ziemi.

Skrypt przebudowuje je pod planszę: zostawia u góry wąski pas z linią drzew
(sama sceneria, w naturalnych proporcjach), a całą resztę wypełnia gruntem.
Dzięki temu każde pole planszy leży na ziemi.

Uruchomienie:

    python3 tools/prepare_terrain.py
"""

from __future__ import annotations

import sys
from pathlib import Path

import numpy as np
from PIL import Image

SRC = Path("assets/kit/backgrounds")
DST = Path("public/terrain")

# Rozmiar wynikowy. Proporcje bliskie planszy (ok. 1.64), więc gra rozciąga
# obrazek prawie równomiernie.
OUT_W = 960
OUT_H = 600
# Jaka część wysokości przypada na pas z drzewami. Dobrane tak, żeby oddziały
# z rzędu 0 stały stopami tuż pod linią drzew, a nie na nich.
HORIZON_BAND = 0.12

# Nazwa pliku w paczce -> nazwa, pod jaką zna go gra.
BACKGROUNDS = {
    "background1.png": "laka.png",
    "background2.png": "plaza.png",
    "background3.png": "snieg.png",
}


def ground_start(img: Image.Image) -> int:
    """Pierwszy wiersz od góry, w którym nie ma już nieba."""
    a = np.asarray(img.convert("RGB")).astype(int)
    # Niebo jest wyraźnie bardziej niebieskie niż czerwone i zielone.
    blueish = a[:, :, 2] > (a[:, :, 0] + a[:, :, 1]) / 2 + 8
    share = blueish.mean(axis=1)
    for y, value in enumerate(share):
        if value < 0.15:
            return y
    raise ValueError("nie znaleziono gruntu — czy to na pewno tło pola bitwy?")


def build(img: Image.Image) -> Image.Image:
    """Pas drzew u góry w naturalnych proporcjach, grunt na całej reszcie."""
    scaled = img.convert("RGBA").resize((OUT_W, round(img.height * OUT_W / img.width)), Image.LANCZOS)
    horizon = round(ground_start(img) * OUT_W / img.width)

    band_h = round(OUT_H * HORIZON_BAND)
    out = Image.new("RGBA", (OUT_W, OUT_H))

    # Pas z linią drzew: wycinek tuż nad gruntem, bez zmiany proporcji.
    band = scaled.crop((0, max(0, horizon - band_h), OUT_W, horizon))
    out.paste(band.resize((OUT_W, band_h), Image.LANCZOS), (0, 0))

    # Grunt rozciągnięty na resztę — jest to miękka faktura, więc rozciąganie
    # w pionie nie rzuca się w oczy, a każde pole planszy leży na ziemi.
    ground = scaled.crop((0, horizon, OUT_W, scaled.height))
    out.paste(ground.resize((OUT_W, OUT_H - band_h), Image.LANCZOS), (0, band_h))
    return out


def main() -> int:
    if not SRC.is_dir():
        print(f"Nie ma katalogu {SRC} — czy paczka jest wgrana?", file=sys.stderr)
        return 1

    DST.mkdir(parents=True, exist_ok=True)
    for source, target in BACKGROUNDS.items():
        path = SRC / source
        if not path.exists():
            print(f"Brakuje {path}", file=sys.stderr)
            return 1
        with Image.open(path) as img:
            horizon = ground_start(img)
            build(img).save(DST / target)
        print(f"{source}: horyzont w {horizon}/{img.height} -> {DST / target}")

    return 0


if __name__ == "__main__":
    raise SystemExit(main())
