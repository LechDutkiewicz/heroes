#!/usr/bin/env python3
"""
Tnie arkusz kafelków terenu (tileset) na pojedyncze kafelki.

Arkusz to jeden duży obrazek z polami ułożonymi w siatkę. Gra takiego arkusza
nie wczytuje — potrzebuje osobnych plików. Skrypt kroi arkusz z
assets/kit/tileset/ i zapisuje kafelki do public/terrain/<nazwa arkusza>/.

Bez --tile skrypt niczego nie zapisuje, tylko podpowiada, jakie rozmiary
kafelka pasują do wymiarów obrazka:

    python3 tools/slice_tileset.py "assets/kit/tileset/teren.png"

Z --tile tnie i zapisuje:

    python3 tools/slice_tileset.py "assets/kit/tileset/teren.png" --tile 32

Kafelki całkiem przezroczyste pomijamy — w arkuszach bywają wolne miejsca.
Jednokolorowych nie ruszamy: jednolita zieleń to trawa, a nie dziura.
"""

from __future__ import annotations

import argparse
import sys
from pathlib import Path

from PIL import Image

DST_ROOT = Path("public/terrain")
# Rozmiary kafelka, jakie w ogóle bierzemy pod uwagę przy podpowiadaniu.
CANDIDATE_SIZES = (8, 16, 24, 32, 48, 64, 96, 128)


def suggest_sizes(width: int, height: int) -> list[int]:
    """Rozmiary, które dzielą obie krawędzie bez reszty."""
    return [s for s in CANDIDATE_SIZES if width % s == 0 and height % s == 0]


def is_empty(tile: Image.Image) -> bool:
    """Kafelek bez treści, czyli w całości przezroczysty.

    Celowo nie odrzucamy kafelków jednokolorowych — jednolita zieleń czy błękit
    to normalna trawa albo woda, a nie dziura w arkuszu.
    """
    return tile.getchannel("A").getextrema()[1] == 0


def slice_tileset(path: Path, tile: int) -> int:
    sheet = Image.open(path).convert("RGBA")
    width, height = sheet.size

    if width % tile or height % tile:
        cols, rows = width // tile, height // tile
        print(
            f"Uwaga: {width}x{height} nie dzieli się równo przez {tile} — "
            f"ostatni rząd/kolumna zostanie pominięty (biorę {cols}x{rows} kafelków).",
            file=sys.stderr,
        )

    dst = DST_ROOT / path.stem
    dst.mkdir(parents=True, exist_ok=True)
    for old in dst.glob("*.png"):
        old.unlink()

    saved = 0
    skipped = 0
    for row in range(height // tile):
        for col in range(width // tile):
            box = (col * tile, row * tile, (col + 1) * tile, (row + 1) * tile)
            piece = sheet.crop(box)
            if is_empty(piece):
                skipped += 1
                continue
            piece.save(dst / f"r{row:02d}_c{col:02d}.png")
            saved += 1

    print(f"{path.name}: zapisano {saved} kafelków do {dst}/ (pustych pominięto: {skipped})")
    return saved


def main() -> int:
    parser = argparse.ArgumentParser(description="Tnie arkusz kafelków na pojedyncze pliki.")
    parser.add_argument("sheet", type=Path, help="plik arkusza, np. assets/kit/tileset/teren.png")
    parser.add_argument("--tile", type=int, help="bok kafelka w pikselach, np. 32")
    args = parser.parse_args()

    if not args.sheet.exists():
        print(f"Nie ma pliku {args.sheet}", file=sys.stderr)
        return 1

    if args.tile:
        slice_tileset(args.sheet, args.tile)
        return 0

    with Image.open(args.sheet) as sheet:
        width, height = sheet.size
    sizes = suggest_sizes(width, height)
    print(f"{args.sheet.name}: {width}x{height} pikseli")
    if sizes:
        print("Pasujące rozmiary kafelka: " + ", ".join(str(s) for s in sizes))
        print(f"Np.: python3 tools/slice_tileset.py {args.sheet} --tile {sizes[-1]}")
    else:
        print("Żaden typowy rozmiar nie dzieli obrazka równo — trzeba obejrzeć arkusz.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
