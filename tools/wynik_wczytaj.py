#!/usr/bin/env python3
"""Grafiki ekranu wyniku: tła i postacie do `public/wynik/`.

Skąd to się bierze
------------------
Każdy ekran wyniku to JEDNA malowana ilustracja na cały ekran, jak animacje
zwycięstwa i porażki w Heroes 2: `tools/wsad/wynik-zwyciestwo.png`,
`wynik-porazka.png` i `wynik-koniec.png` (prompty w `tools/PROMPTY-WYNIK.md`,
kadr 3:2). Postacie są już na obrazie — scena nie dokłada wyciętych figurek.

Kadr nie jest środkowym wycinkiem: każda ilustracja ma własne powiększenie
i punkt zaczepienia (`KADRY`), tak żeby gromadka stała między tytułem u góry
a kartą z tekstem u dołu, a pod kartą leżała spokojna część obrazu (zbocze,
staw, jezioro). Zmiana wysokości karty w `WynikScene` = zmiana kadru tutaj.

Gdy ilustracji brak, skrypt wraca do przemalowanej panoramy miasta — ekran
wtedy działa, tylko bez postaci.

Skrypt jest idempotentny — nadpisuje swoje wyjście i niczego nie dokłada.

    python3 tools/wynik_wczytaj.py
"""

import sys
from pathlib import Path

import numpy as np
from PIL import Image

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


def kadr(im: Image.Image, powiekszenie: float, px: float, py: float) -> Image.Image:
    """Jak `okladka`, ale z powiększeniem i punktem zaczepienia: `px`, `py`
    (0–1) mówią, którą część nadmiaru uciąć — 0 = zostaw lewy/górny brzeg."""
    k = max(W / im.width, H / im.height) * powiekszenie
    im = im.convert('RGB').resize((round(im.width * k), round(im.height * k)), Image.LANCZOS)
    x = round((im.width - W) * px)
    y = round((im.height - H) * py)
    return im.crop((x, y, x + W, y + H))


#: Kadr każdej ilustracji: (powiększenie, px, py). Liczone pod układ ekranu
#: w `WynikScene`: tytuł zajmuje górne ~130 px, karta zaczyna się na
#: y = 486 (zwycięstwo, porażka) albo 448 (koniec kampanii).
#:  - zwycięstwo: gromadka na szczycie wzgórza po lewej, zamek przy prawym
#:    brzegu, zbocze pod kartą;
#:  - porażka: ognisko pod dębem po prawej, zamek wroga po lewej, staw pod kartą;
#:  - koniec: medal i parada na brzegu, księżyc pod tytułem, jezioro pod kartą.
KADRY = {
    'wynik-zwyciestwo.png': (1.32, 0.74, 0.0),
    'wynik-porazka.png': (1.3, 0.51, 0.25),
    'wynik-koniec.png': (1.25, 0.5, 0.78),
}


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
        return np.asarray(kadr(Image.open(p), *KADRY[ilustracja])).astype(np.float32) / 255, True
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
    """Portret bohatera do karty zakończenia kampanii (poziom, artefakty) —
    jedyna wycięta figurka, która została: to element karty, nie sceny."""
    CEL.mkdir(parents=True, exist_ok=True)
    dopasuj(wczytaj('bohater-dol'), 440).save(CEL / 'bohater.png', optimize=True)
    print('  wynik/bohater.png')


if __name__ == '__main__':
    print('tła:')
    tla()
    print('postacie:')
    postacie()
