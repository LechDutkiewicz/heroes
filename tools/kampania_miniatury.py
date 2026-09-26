#!/usr/bin/env python3
"""Miniatury misji na zwoju ekranu kampanii (winieta pod tytułem misji).

Skąd
----
Z podglądu CAŁEJ planszy wyrenderowanego przez samą grę — ta sama scena co
w misji (tło, zamki, drzewa, strażnicy, woda), tylko bez mgły i HUD-u:

    node tools/zrzut-mapa.mjs --url http://localhost:5211 --mapa polana --caly --bok 2304 \\
        --out tools/shots/mapa-polana-caly-2304.png
    (tak samo dla dwie-doliny, bagna, twierdza)

Dokąd
-----
    public/kampania/mini-<misja>-<wysokość>.jpg   230 × {92, 74, 60, 50}

Szerokość to szerokość tekstu na zwoju (`ZWOJ.w - 2 * PAPIER.bok`), a
wysokości to stopnie, którymi `KampaniaScene.odswiezTresc` zmniejsza winietę,
gdy opis misji się nie mieści. Każda wysokość ma WŁASNY kadr, pokazywany
w grze 1 : 1 — skalowanie w Phaserze rozmywało winietę w zieloną plamę.
Niższy kadr obejmuje nieco mniej pól w pionie, ale szerszy pas w poziomie,
żeby cała budowla celu misji dalej się mieściła.

Co w kadrze: miejsce CELU misji — fort wroga (Polana), Grota Księżycowa
(Dwie Doliny), Wyspa Księżyca ze strażnikiem Kamienia (Bagna), twierdza
wroga (Twierdza).

    python3 tools/kampania_miniatury.py [--zrodla tools/shots] [--bok 2304]
"""

from __future__ import annotations

import argparse
from pathlib import Path

from PIL import Image, ImageFilter

KORZEN = Path(__file__).resolve().parent.parent
WYJSCIE = KORZEN / "public" / "kampania"

SZER = 230
WYSOKOSCI = (92, 74, 60, 50)

# misja → (plansza, bok planszy w polach, ognisko kadru w polach (x, y),
# przybliżenie względem `POLA_W_PIONIE`).
# Ognisko to środek tego, co ma być widać: zamek rysuje się W GÓRĘ od swojego
# pola, więc ognisko leży 1–1,5 pola nad polem zamku.
MISJE = {
    "pierwsze-kroki": ("polana", 36, (29.5, 11.5), 1.0),
    "klucze-do-przeleczy": ("dwie-doliny", 72, (61.0, 6.8), 1.0),
    # Na wyspie nie ma wysokiej budowli — kadr bliżej, żeby strażnik Kamienia
    # i pierścień wody były czytelne także w najniższej winiecie.
    "bagienny-szlak": ("bagna", 54, (45.8, 7.5), 1.35),
    "oblezenie-groty": ("twierdza", 72, (58.5, 6.9), 1.0),
}

# Ile pól w pionie obejmuje kadr danej wysokości. Przy 92 px budowla zajmuje
# ok. 2/3 wysokości; przy 50 px kadr jest ciaśniejszy w pionie, ale nie aż
# tak, żeby ściąć wieże.
POLA_W_PIONIE = {92: 5.6, 74: 5.2, 60: 4.9, 50: 4.7}


def kadr(obraz: Image.Image, pola: int, ognisko: tuple[float, float], zblizenie: float, wys: int) -> Image.Image:
    px = obraz.width / pola
    h = POLA_W_PIONIE[wys] / zblizenie * px
    w = h * SZER / wys
    cx = (ognisko[0] + 0.5) * px
    cy = (ognisko[1] + 0.5) * px
    # Kadr nie wychodzi poza planszę — przesuwamy go, zamiast dosztukowywać czerń.
    x0 = min(max(cx - w / 2, 0), obraz.width - w)
    y0 = min(max(cy - h / 2, 0), obraz.height - h)
    wyc = obraz.crop((round(x0), round(y0), round(x0 + w), round(y0 + h)))
    # Dwustopniowo: najpierw do 2×, potem Lanczos do celu i lekkie wyostrzenie
    # — pomniejszenie ~4× zjada kontur zamku, a to on ma być czytelny.
    wyc = wyc.resize((SZER * 2, wys * 2), Image.LANCZOS)
    wyc = wyc.resize((SZER, wys), Image.LANCZOS)
    return wyc.filter(ImageFilter.UnsharpMask(radius=0.8, percent=70, threshold=2))


def main() -> None:
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("--zrodla", default=str(KORZEN / "tools" / "shots"), help="katalog z podglądami całych plansz")
    ap.add_argument("--bok", type=int, default=2304, help="bok podglądu w pikselach (--bok zrzut-mapa.mjs)")
    a = ap.parse_args()
    for misja, (plansza, pola, ognisko, zblizenie) in MISJE.items():
        zrodlo = Path(a.zrodla) / f"mapa-{plansza}-caly-{a.bok}.png"
        obraz = Image.open(zrodlo).convert("RGB")
        for wys in WYSOKOSCI:
            cel = WYJSCIE / f"mini-{misja}-{wys}.jpg"
            kadr(obraz, pola, ognisko, zblizenie, wys).save(cel, quality=92, optimize=True)
            print(f"{cel.relative_to(KORZEN)}  ← {zrodlo.name}")


if __name__ == "__main__":
    main()
