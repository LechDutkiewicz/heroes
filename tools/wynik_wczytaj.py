#!/usr/bin/env python3
"""Grafiki ekranu wyniku: tła i postacie do `public/wynik/`.

Skąd to się bierze
------------------
Ekran wyniku (`src/scenes/WynikScene.ts`) składa scenę z warstw: malowane tło,
zamek na horyzoncie, bohater i jego stworki. Warstwy, a nie jeden obrazek, bo
tak da się je animować — w Heroes 2 ekran wygranej też się rusza.

Tła są przemalowanymi panoramami z `tools/wsad/` (Bór w słońcu na zwycięstwo,
ten sam Bór o zmierzchu na porażkę, Grota nocą na koniec kampanii). Gdy
w `tools/wsad/` leży malowana ilustracja z `tools/PROMPTY-WYNIK.md`
(`wynik-*.png`), idzie ona w miejsce przemalowanej panoramy.

Skrypt jest idempotentny — nadpisuje swoje wyjście i niczego nie dokłada.

    python3 tools/wynik_wczytaj.py
"""

import sys
from pathlib import Path

import numpy as np
from PIL import Image, ImageFilter

sys.path.insert(0, str(Path(__file__).resolve().parent))
from wsad_wczytaj import dopasuj, wczytaj  # noqa: E402

KORZEN = Path(__file__).resolve().parent.parent
WSAD = KORZEN / 'tools' / 'wsad'
CEL = KORZEN / 'public' / 'wynik'
W, H = 960, 694


def okladka(im: Image.Image) -> Image.Image:
    """Kadruje „na okładkę": wypełnia całe okno, nadmiar ucina po bokach."""
    k = max(W / im.width, H / im.height)
    im = im.convert('RGB').resize((round(im.width * k), round(im.height * k)), Image.LANCZOS)
    x = (im.width - W) // 2
    y = (im.height - H) // 2
    return im.crop((x, y, x + W, y + H))


def poswiata(tab: np.ndarray, cx: float, cy: float, r: float, barwa, moc: float) -> np.ndarray:
    """Miękkie światło nakładane trybem „screen" — rozjaśnia, nie przepala."""
    yy, xx = np.mgrid[0:H, 0:W].astype(np.float32)
    d = np.sqrt(((xx - cx * W) / (r * W)) ** 2 + ((yy - cy * H) / (r * W)) ** 2)
    m = (np.clip(1 - d, 0, 1) ** 2 * moc)[:, :, None]
    b = np.array(barwa, np.float32)[None, None, :] / 255
    return 1 - (1 - tab) * (1 - b * m)


def winieta(tab: np.ndarray, moc: float) -> np.ndarray:
    yy, xx = np.mgrid[0:H, 0:W].astype(np.float32)
    d = np.sqrt(((xx - W / 2) / (W / 2)) ** 2 + ((yy - H / 2) / (H / 2)) ** 2) / 1.414
    return tab * (1 - moc * np.clip(d, 0, 1) ** 2.2)[:, :, None]


def zapisz(tab: np.ndarray, nazwa: str) -> None:
    CEL.mkdir(parents=True, exist_ok=True)
    Image.fromarray((np.clip(tab, 0, 1) * 255).astype(np.uint8)).save(CEL / nazwa, quality=88)
    print(f'  wynik/{nazwa}')


def zrodlo(ilustracja: str, panorama: str) -> tuple[np.ndarray, bool]:
    """Malowana ilustracja, jeśli jest; inaczej panorama miasta do przemalowania."""
    p = WSAD / ilustracja
    if p.exists():
        return np.asarray(okladka(Image.open(p))).astype(np.float32) / 255, True
    return np.asarray(okladka(Image.open(WSAD / panorama))).astype(np.float32) / 255, False


def tla() -> None:
    # Zwycięstwo: Bór o wschodzie słońca — cieplej, złota poświata nad
    # horyzontem, tam gdzie stanie zamek.
    t, gotowa = zrodlo('wynik-zwyciestwo.png', 'tlo-bor.png')
    if not gotowa:
        t = t * np.array([1.06, 1.02, 0.9], np.float32)
        t = poswiata(t, 0.5, 0.12, 0.75, (255, 214, 140), 0.55)
        t = winieta(t, 0.35)
    zapisz(t, 'tlo-zwyciestwo.jpg')

    # Porażka: ten sam Bór o zmierzchu. Szarość i fiolet, ale przy horyzoncie
    # ciepłe przejaśnienie — obrazek ma mówić „jutro", a nie „koniec".
    t, gotowa = zrodlo('wynik-porazka.png', 'tlo-bor.png')
    if not gotowa:
        szary = t.mean(axis=2, keepdims=True)
        t = t * 0.45 + szary * 0.55
        t = t * np.array([0.52, 0.56, 0.86], np.float32)
        t = poswiata(t, 0.72, 0.1, 0.55, (255, 170, 120), 0.4)
        t = winieta(t, 0.5)
    zapisz(t, 'tlo-porazka.jpg')

    # Koniec kampanii: Grota nocą, znów świecąca.
    t, gotowa = zrodlo('wynik-koniec.png', 'tlo-grota.png')
    if not gotowa:
        t = poswiata(t * 1.04, 0.5, 0.05, 0.6, (190, 220, 255), 0.4)
        t = winieta(t, 0.4)
    zapisz(t, 'tlo-koniec.jpg')


def postacie() -> None:
    CEL.mkdir(parents=True, exist_ok=True)
    # Zapas ×1,4 względem wysokości na ekranie — skalowanie w dół zostaje ostre.
    for zrodlo_, nazwa, wys in [
        ('bohater-dol', 'bohater', 440),
        ('bohater-gora', 'bohater-plecy', 440),
        ('m-zamek', 'zamek', 320),
    ]:
        dopasuj(wczytaj(zrodlo_), wys).save(CEL / f'{nazwa}.png', optimize=True)
        print(f'  wynik/{nazwa}.png')

    # Zamek srebrnych płaszczy na porażkę: ten sam zamek, wyprany z barw
    # i przechylony w chłodny błękit — z daleka i o zmierzchu to wystarczy.
    z = np.asarray(dopasuj(wczytaj('m-zamek'), 320)).astype(np.float32)
    rgb, a = z[:, :, :3], z[:, :, 3:]
    szary = rgb.mean(axis=2, keepdims=True)
    rgb = (rgb * 0.2 + szary * 0.8) * np.array([0.78, 0.84, 1.0], np.float32)
    Image.fromarray(np.concatenate([np.clip(rgb, 0, 255), a], axis=2).astype(np.uint8), 'RGBA').save(
        CEL / 'zamek-wroga.png', optimize=True
    )
    print('  wynik/zamek-wroga.png')

    # Plama światła pod postaciami — ta sama miękka elipsa, co cień, tylko
    # jasna: wyciąga bohatera z tła, jak światło sceny w teatrzyku.
    s = 256
    yy, xx = np.mgrid[0:s, 0:s].astype(np.float32)
    d = np.sqrt(((xx - s / 2) / (s / 2)) ** 2 + ((yy - s / 2) / (s / 2)) ** 2)
    alfa = (np.clip(1 - d, 0, 1) ** 1.6 * 255).astype(np.uint8)
    plama = np.dstack([np.full((s, s), 255, np.uint8)] * 3 + [alfa])
    Image.fromarray(plama, 'RGBA').filter(ImageFilter.GaussianBlur(4)).save(CEL / 'blask.png')
    print('  wynik/blask.png')


if __name__ == '__main__':
    print('tła:')
    tla()
    print('postacie:')
    postacie()
