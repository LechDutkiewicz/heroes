#!/usr/bin/env python3
"""
Przygotowuje sprite'y stworków do gry.

Pliki źródłowe (assets/pokemon/*.png) mają białe tło i format 256x256.
Skrypt wycina tło, przycina do samego stworka i zapisuje kwadratowe PNG
z przezroczystością do public/sprites/, skąd wczytuje je gra.

Tło usuwamy zalewaniem od krawędzi, a nie po kolorze — dzięki temu białe
fragmenty w środku stworka (oczy, futro) zostają nietknięte.
"""

from __future__ import annotations

import sys
from collections import deque
from pathlib import Path

import numpy as np
from PIL import Image, ImageFilter

SRC = Path("assets/pokemon")
DST = Path("public/sprites")
OUT_SIZE = 128
# Jak blisko bieli musi być piksel, żeby uznać go za tło.
WHITE_TOLERANCE = 26
PADDING = 4


def background_mask(rgb: np.ndarray) -> np.ndarray:
    """True tam, gdzie jest tło — zalewanie startuje z krawędzi obrazka."""
    h, w, _ = rgb.shape
    near_white = (255 - rgb.min(axis=2)) <= WHITE_TOLERANCE

    seen = np.zeros((h, w), dtype=bool)
    queue: deque[tuple[int, int]] = deque()

    for x in range(w):
        for y in (0, h - 1):
            if near_white[y, x] and not seen[y, x]:
                seen[y, x] = True
                queue.append((y, x))
    for y in range(h):
        for x in (0, w - 1):
            if near_white[y, x] and not seen[y, x]:
                seen[y, x] = True
                queue.append((y, x))

    while queue:
        y, x = queue.popleft()
        for dy, dx in ((1, 0), (-1, 0), (0, 1), (0, -1)):
            ny, nx = y + dy, x + dx
            if 0 <= ny < h and 0 <= nx < w and not seen[ny, nx] and near_white[ny, nx]:
                seen[ny, nx] = True
                queue.append((ny, nx))

    return seen


def process(path: Path) -> Image.Image | None:
    rgb = np.array(Image.open(path).convert("RGB"))
    alpha = np.where(background_mask(rgb), 0, 255).astype(np.uint8)

    img = Image.fromarray(rgb).convert("RGBA")
    # Delikatne rozmycie maski wygładza schodki po zalewaniu.
    img.putalpha(Image.fromarray(alpha).filter(ImageFilter.GaussianBlur(0.6)))

    box = img.getchannel("A").point(lambda v: 255 if v > 12 else 0).getbbox()
    if box is None:
        return None

    left, top, right, bottom = box
    left, top = max(0, left - PADDING), max(0, top - PADDING)
    right, bottom = min(img.width, right + PADDING), min(img.height, bottom + PADDING)
    cropped = img.crop((left, top, right, bottom))

    # Wyśrodkuj na kwadracie, żeby proporcje stworka się nie zmieniły.
    side = max(cropped.size)
    square = Image.new("RGBA", (side, side), (0, 0, 0, 0))
    square.paste(cropped, ((side - cropped.width) // 2, (side - cropped.height) // 2))

    return square.resize((OUT_SIZE, OUT_SIZE), Image.LANCZOS)


def main() -> int:
    files = sorted(SRC.glob("*.png"))
    if not files:
        print(f"Brak plików w {SRC}", file=sys.stderr)
        return 1

    DST.mkdir(parents=True, exist_ok=True)
    done = 0
    for path in files:
        out = process(path)
        if out is None:
            print(f"pominięto (pusty po wycięciu tła): {path.name}", file=sys.stderr)
            continue
        out.save(DST / path.name)
        done += 1

    print(f"przetworzono {done} z {len(files)} plików do {DST}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
