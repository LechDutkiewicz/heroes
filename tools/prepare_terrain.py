#!/usr/bin/env python3
"""
Przygotowuje tła pola bitwy do gry.

Autorskie tła z paczki (assets/kit/backgrounds/) mają 640x360 i są gotowe do
użycia — skrypt tylko przenosi je do public/terrain/ pod czytelnymi nazwami,
bo stamtąd wczytuje je gra. Oryginałów w assets/ nie ruszamy.

Uruchomienie:

    python3 tools/prepare_terrain.py
"""

from __future__ import annotations

import shutil
import sys
from pathlib import Path

SRC = Path("assets/kit/backgrounds")
DST = Path("public/terrain")

# Nazwa pliku w paczce -> nazwa, pod jaką zna go gra.
BACKGROUNDS = {
    "background1.png": "laka.png",
    "background2.png": "plaza.png",
    "background3.png": "snieg.png",
}


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
        shutil.copyfile(path, DST / target)
        print(f"{source} -> {DST / target}")

    return 0


if __name__ == "__main__":
    raise SystemExit(main())
