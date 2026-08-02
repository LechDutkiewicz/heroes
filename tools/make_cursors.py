#!/usr/bin/env python3
"""
Rysuje kursory myszy używane w bitwie i zapisuje je do public/cursors/.

Zamiast miecza i strzały z Heroes 3 mamy motywy pasujące do świata stworków:
  - pazur (cztery szpony) — atak wręcz, obrócony w stronę uderzenia,
  - kula energii — strzał pełną mocą,
  - pęknięta kula — strzał z za dużej odległości, za połowę siły.

Rysujemy w powiększeniu i zmniejszamy na koniec, żeby krawędzie były gładkie.
"""

from __future__ import annotations

from pathlib import Path

from PIL import Image, ImageDraw

DST = Path("public/cursors")
SIZE = 32
SCALE = 8
BIG = SIZE * SCALE

OUTLINE = (25, 20, 40, 255)
LIGHT = (255, 255, 255, 255)
GOLD = (255, 209, 102, 255)
ORANGE = (255, 138, 60, 255)


def canvas() -> tuple[Image.Image, ImageDraw.ImageDraw]:
    img = Image.new("RGBA", (BIG, BIG), (0, 0, 0, 0))
    return img, ImageDraw.Draw(img)


def save(img: Image.Image, name: str) -> None:
    DST.mkdir(parents=True, exist_ok=True)
    img.resize((SIZE, SIZE), Image.LANCZOS).save(DST / f"{name}.png")


def taper(d: ImageDraw.ImageDraw, pts: list[tuple[float, float]], w0: float, w1: float, fill) -> None:
    """Pociągnięcie zwężające się do ostrego końca — rysowane jako ciąg kółek."""
    steps = 48
    for i in range(steps + 1):
        t = i / steps
        seg = t * (len(pts) - 1)
        a = min(int(seg), len(pts) - 2)
        local = seg - a
        x = pts[a][0] + (pts[a + 1][0] - pts[a][0]) * local
        y = pts[a][1] + (pts[a + 1][1] - pts[a][1]) * local
        r = (w0 + (w1 - w0) * t) / 2
        d.ellipse([x - r, y - r, x + r, y + r], fill=fill)


def claw() -> Image.Image:
    """Cztery szpony rozchodzące się wachlarzem w prawo — cios w prawo."""
    img, d = canvas()
    cx, cy = BIG // 2, BIG // 2

    strokes = []
    for spread in (-1.6, -0.55, 0.55, 1.6):
        start = (cx - 8.5 * SCALE, cy + spread * 2.6 * SCALE)
        mid = (cx - 1.0 * SCALE, cy + spread * 3.4 * SCALE)
        tip = (cx + 8.5 * SCALE, cy + spread * 4.6 * SCALE)
        strokes.append([start, mid, tip])

    for pts in strokes:  # ciemny kontur pod spodem
        taper(d, pts, 4.2 * SCALE, 1.6 * SCALE, OUTLINE)
    for i, pts in enumerate(strokes):
        taper(d, pts, 2.6 * SCALE, 0.35 * SCALE, LIGHT if i % 2 == 0 else GOLD)
    return img


def bolt(broken: bool) -> Image.Image:
    """Kula energii z ogonem; pęknięta wersja jest rozerwana na pół."""
    img, d = canvas()
    cx, cy = BIG // 2, BIG // 2
    r = int(6.5 * SCALE)

    if not broken:
        d.ellipse([cx - r, cy - r, cx + r, cy + r], fill=OUTLINE)
        d.ellipse([cx - r + SCALE, cy - r + SCALE, cx + r - SCALE, cy + r - SCALE], fill=ORANGE)
        d.ellipse([cx - r // 2, cy - r // 2, cx + r // 3, cy + r // 3], fill=GOLD)
        d.ellipse([cx - r // 3, cy - r // 2, cx - r // 8, cy - r // 5], fill=LIGHT)
        # smuga za kulą
        for i, dist in enumerate((9, 12)):
            w = int((2.2 - i * 0.6) * SCALE)
            d.line([(cx - dist * SCALE, cy), (cx - (dist - 2) * SCALE, cy)], fill=GOLD, width=w)
        return img

    # pęknięta: ta sama kula, ale rozłupana i przygaszona
    dim_shell = (120, 96, 74, 255)
    dim_core = (196, 150, 96, 255)
    gap = int(2.2 * SCALE)
    for sign in (-1, 1):
        box = [cx - r + sign * gap, cy - r, cx + r + sign * gap, cy + r]
        start, end = (90, 270) if sign < 0 else (270, 90)
        d.pieslice(box, start, end, fill=OUTLINE)
        inner = [box[0] + SCALE, box[1] + SCALE, box[2] - SCALE, box[3] - SCALE]
        d.pieslice(inner, start, end, fill=dim_shell)
        core = [
            cx - r // 2 + sign * gap,
            cy - r // 2,
            cx + r // 2 + sign * gap,
            cy + r // 2,
        ]
        d.pieslice(core, start, end, fill=dim_core)

    # zygzak pęknięcia pomiędzy połówkami
    zig = [
        (cx + SCALE, cy - r - SCALE),
        (cx - 1.6 * SCALE, cy - r // 2),
        (cx + 1.4 * SCALE, cy),
        (cx - 1.6 * SCALE, cy + r // 2),
        (cx + SCALE, cy + r + SCALE),
    ]
    d.line(zig, fill=OUTLINE, width=int(2.4 * SCALE), joint="curve")
    d.line(zig, fill=GOLD, width=int(1.1 * SCALE), joint="curve")
    return img


def main() -> int:
    base = claw()
    for name, angle in (("claw_right", 0), ("claw_up", 90), ("claw_left", 180), ("claw_down", 270)):
        save(base.rotate(angle, resample=Image.BICUBIC), name)

    save(bolt(False), "bolt")
    save(bolt(True), "bolt_broken")

    print(f"zapisano kursory do {DST}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
