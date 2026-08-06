#!/usr/bin/env python3
"""
Przygotowuje pola bitwy i przeszkody.

Trzy rzeczy naraz:

1. Tła pola bitwy. Oryginały (assets/kit/backgrounds/, 640x360) mają u góry
   niebo i las, a niżej grunt. Rozciągnięte wprost wychodzą tak, że oddziały
   z górnych rzędów stoją „na drzewach". Skrypt zostawia u góry wąski pas
   z linią drzew, a resztę wypełnia gruntem — każde pole leży na ziemi.

2. Warianty kolorystyczne. Z łąki robimy dodatkowo noc i jesień, przemalowując
   barwy. Dzięki temu pól bitwy jest pięć, a nie trzy, bez rysowania od zera.

3. Przeszkody. Drzewa i krzaki wycinamy z arkusza kafelków, a głazów w paczce
   nie ma, więc je rysujemy. Każde pole bitwy ma trzy różne przeszkody.

Uruchomienie:

    python3 tools/prepare_terrain.py
"""

from __future__ import annotations

import colorsys
import sys
from pathlib import Path

import numpy as np
from PIL import Image, ImageDraw

SRC = Path("assets/kit/backgrounds")
TILESET = Path("assets/kit/tileset/tileset.png")
DST = Path("public/terrain")
OBSTACLES_DST = DST / "obstacles"

# Rozmiar wynikowy tła. Proporcje bliskie planszy (ok. 1.64).
OUT_W, OUT_H = 960, 600
# Jaka część wysokości przypada na pas z drzewami.
HORIZON_BAND = 0.12

BACKGROUNDS = {"background1.png": "laka", "background2.png": "plaza", "background3.png": "snieg"}

# Przeszkody z arkusza kafelków: nazwa -> prostokąt (lewo, góra, prawo, dół).
TILE_OBSTACLES = {
    "sosna": (0, 304, 32, 352),
    "sosna_snieg": (64, 304, 96, 352),
    "palma": (96, 304, 128, 352),
    "drzewo": (16, 352, 48, 400),
    "drzewo_zimowe": (64, 352, 96, 400),
    # Uwaga: obok jest duże drzewo liściaste — wycinek 16..32 to jego korona,
    # a nie osobny krzak. Krzak stoi w kolumnie 0.
    "krzak": (0, 354, 16, 382),
    "trawa": (128, 310, 143, 344),
}

# Głazy rysujemy sami — w paczce ich nie ma. Paleta: obrys, cień, bok, światło.
ROCK_PALETTES = {
    "glaz": ((58, 56, 68), (96, 96, 110), (134, 136, 148), (178, 180, 190)),
    "glaz_piaskowy": ((112, 84, 50), (168, 132, 82), (208, 176, 120), (236, 212, 164)),
    "glaz_sniezny": ((74, 84, 100), (118, 132, 150), (170, 186, 202), (238, 246, 252)),
}


def ground_start(img: Image.Image) -> int:
    """Pierwszy wiersz od góry, w którym nie ma już nieba."""
    a = np.asarray(img.convert("RGB")).astype(int)
    blueish = a[:, :, 2] > (a[:, :, 0] + a[:, :, 1]) / 2 + 8
    share = blueish.mean(axis=1)
    for y, value in enumerate(share):
        if value < 0.15:
            return y
    raise ValueError("nie znaleziono gruntu — czy to na pewno tło pola bitwy?")


def build_background(img: Image.Image) -> Image.Image:
    """Pas drzew u góry w naturalnych proporcjach, grunt na całej reszcie."""
    scaled = img.convert("RGBA").resize(
        (OUT_W, round(img.height * OUT_W / img.width)), Image.LANCZOS
    )
    horizon = round(ground_start(img) * OUT_W / img.width)
    band_h = round(OUT_H * HORIZON_BAND)

    out = Image.new("RGBA", (OUT_W, OUT_H))
    band = scaled.crop((0, max(0, horizon - band_h), OUT_W, horizon))
    out.paste(band.resize((OUT_W, band_h), Image.LANCZOS), (0, 0))
    ground = scaled.crop((0, horizon, OUT_W, scaled.height))
    out.paste(ground.resize((OUT_W, OUT_H - band_h), Image.LANCZOS), (0, band_h))
    return out


def recolour(img: Image.Image, mode: str) -> Image.Image:
    """
    Przemalowuje obrazek, zachowując rysunek.

    „noc" przygasza wszystko i przesuwa barwy w stronę granatu, „jesien"
    zamienia zielenie na złoto i rudość, nie ruszając nieba ani pni.
    """
    rgba = np.asarray(img.convert("RGBA")).astype(np.float32) / 255.0
    rgb, alpha = rgba[:, :, :3], rgba[:, :, 3:]

    to_hsv = np.vectorize(colorsys.rgb_to_hsv)
    to_rgb = np.vectorize(colorsys.hsv_to_rgb)
    h, s, v = to_hsv(rgb[:, :, 0], rgb[:, :, 1], rgb[:, :, 2])

    if mode == "noc":
        # Barwy niemal w całości przechodzą w granat — sam przygaszony obrazek
        # dawał ciemną zieleń, a nie noc. Jasność zostaje na tyle wysoka,
        # żeby rysunek trawy nadal było widać.
        h = np.full_like(h, 0.62) * 0.85 + h * 0.15
        s = np.clip(s * 0.55 + 0.22, 0, 1)
        v = v * 0.45
    elif mode == "jesien":
        # Zakres zieleni zaczyna się nisko, bo trawa w tej paczce jest
        # żółtozielona (odcień ok. 0.15) i przy węższym progu zostawała zielona.
        green = (h > 0.13) & (h < 0.50)
        # Cel to zeschła trawa i złote liście, a nie jaskrawa pomarańcz —
        # stąd wąski zakres odcieni i przycięta nasycenie.
        h = np.where(green, 0.085 + (h - 0.13) * 0.10, h)
        s = np.where(green, np.clip(s * 0.78, 0, 0.68), s)
        v = np.where(green, np.clip(v * 0.94, 0, 1), v)
    else:
        raise ValueError(mode)

    r, g, b = to_rgb(h, s, v)
    out = np.concatenate([np.stack([r, g, b], axis=2), alpha], axis=2)
    return Image.fromarray((np.clip(out, 0, 1) * 255).astype(np.uint8), "RGBA")


def draw_rock(palette: tuple[tuple[int, int, int], ...]) -> Image.Image:
    """
    Rysuje głaz: bryłę z obrysem, ciemniejszym bokiem i światłem od góry,
    plus mniejszy kamień obok, żeby nie wyglądał jak idealne jajko.
    """
    outline, shadow, body, light = (c + (255,) for c in palette)
    w, h = 32, 26
    img = Image.new("RGBA", (w, h), (0, 0, 0, 0))
    d = ImageDraw.Draw(img)

    # cień na ziemi
    d.ellipse([3, h - 7, w - 4, h - 1], fill=(0, 0, 0, 60))

    # główna bryła — nieregularny wielokąt, nie elipsa
    main = [(6, h - 4), (3, 14), (8, 7), (15, 4), (22, 7), (26, 13), (25, h - 4)]
    d.polygon(main, fill=outline)
    d.polygon([(x + 1, y + 1) for x, y in main[:-1]] + [(main[-1][0] - 1, main[-1][1])], fill=body)
    # bok w cieniu
    d.polygon([(17, 6), (26, 13), (25, h - 5), (18, h - 5)], fill=shadow)
    # światło od góry-lewej
    d.polygon([(9, 9), (15, 6), (19, 9), (13, 14)], fill=light)

    # mniejszy kamień z boku
    small = [(23, h - 3), (22, h - 10), (27, h - 12), (30, h - 8), (29, h - 3)]
    d.polygon(small, fill=outline)
    d.polygon([(x, y + 1) for x, y in small], fill=body)
    d.polygon([(24, h - 9), (27, h - 11), (28, h - 8)], fill=light)
    return img


def draw_mound(palette: tuple[tuple[int, int, int], ...]) -> Image.Image:
    """
    Nierówność terenu: niski pagórek z kilkoma kamykami. Nie każda przeszkoda
    musi być wielkości drzewa — taka kępa ledwie wystaje ponad ziemię.
    """
    outline, shadow, body, light = (c + (255,) for c in palette)
    w, h = 30, 16
    img = Image.new("RGBA", (w, h), (0, 0, 0, 0))
    d = ImageDraw.Draw(img)

    d.ellipse([2, h - 6, w - 3, h - 1], fill=(0, 0, 0, 55))
    # sam pagórek — spłaszczony łuk, nie kopuła
    hump = [(2, h - 3), (6, h - 9), (13, h - 12), (20, h - 10), (26, h - 5), (27, h - 3)]
    d.polygon(hump, fill=outline)
    d.polygon([(x + 1, y + 1) for x, y in hump], fill=body)
    d.polygon([(19, h - 9), (25, h - 5), (26, h - 4), (20, h - 4)], fill=shadow)
    d.polygon([(7, h - 7), (13, h - 10), (16, h - 8), (10, h - 6)], fill=light)
    # dwa kamyki dla nieregularności
    d.ellipse([4, h - 6, 8, h - 3], fill=outline)
    d.ellipse([22, h - 7, 27, h - 3], fill=outline)
    d.ellipse([23, h - 6, 26, h - 4], fill=light)
    return img


def save_obstacle(img: Image.Image, name: str) -> None:
    """Powiększamy bez wygładzania — piksele mają zostać pikselami."""
    OBSTACLES_DST.mkdir(parents=True, exist_ok=True)
    img.resize((img.width * 3, img.height * 3), Image.NEAREST).save(OBSTACLES_DST / f"{name}.png")


def main() -> int:
    if not SRC.is_dir() or not TILESET.exists():
        print("Brakuje grafik z paczki (assets/kit) — czy jest wgrana?", file=sys.stderr)
        return 1

    DST.mkdir(parents=True, exist_ok=True)

    # --- tła ---
    base: dict[str, Image.Image] = {}
    for source, target in BACKGROUNDS.items():
        with Image.open(SRC / source) as img:
            built = build_background(img)
        built.save(DST / f"{target}.png")
        base[target] = built
        print(f"tło {target}")

    for mode in ("noc", "jesien"):
        recolour(base["laka"], mode).save(DST / f"{mode}.png")
        print(f"tło {mode} (z łąki)")

    # --- przeszkody z arkusza ---
    with Image.open(TILESET) as sheet:
        sheet = sheet.convert("RGBA")
        tiles = {name: sheet.crop(box) for name, box in TILE_OBSTACLES.items()}
    for name, tile in tiles.items():
        save_obstacle(tile, name)

    # --- głazy i nierówności terenu ---
    for name, palette in ROCK_PALETTES.items():
        save_obstacle(draw_rock(palette), name)
        save_obstacle(draw_mound(palette), name.replace("glaz", "kopiec"))

    # --- przeszkody dla wariantów kolorystycznych ---
    for mode, sources in (
        ("noc", ("drzewo", "sosna", "glaz", "kopiec")),
        ("jesien", ("drzewo", "sosna", "krzak", "kopiec")),
    ):
        for name in sources:
            drawn = {"glaz": draw_rock, "kopiec": draw_mound}.get(name)
            source = tiles[name] if name in tiles else drawn(ROCK_PALETTES["glaz"])
            save_obstacle(recolour(source, mode), f"{name}_{mode}")

    print(f"przeszkody: {len(sorted(OBSTACLES_DST.glob('*.png')))} plików w {OBSTACLES_DST}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
