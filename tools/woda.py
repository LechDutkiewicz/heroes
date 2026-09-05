"""Wzbogaca animację wody na mapie przygody: głębia, kaustyki, skry światła.

Bazowy kafelek wody z arkusza (`public/mapa-tileset.png`) to płaska barwa
z drobnym wzorem łusek, a jego cztery „klatki animacji" są sobie niemal
identyczne — z bliska nie widać żadnego ruchu, tylko martwy błękit. Ten
moduł dokłada to, czego kafelkowi brakuje, nie ruszając samego arkusza (to
kupiony zestaw grafik, jego autotiling zostaje):

  * głębię — otwarte morze ciemnieje, płycizna przy brzegu jaśnieje,
    liczone jako odległość od najbliższego lądu (transformata odległości);
  * kaustyki — nieregularna plama światła (szum, nie siatka sinusów —
    siatka daje widoczną, sztuczną kratę) przesuwana po całce obrazu,
    jak światło łamane na dnie płytkiej wody;
  * skry — rzadkie punkciki najjaśniejszego światła, które zapalają się
    i gasną (sinus fazy podniesiony do potęgi daje krótki, ostry błysk);
  * oddech piany — jasny pierścień brzegowy z arkusza dostaje powolne,
    jednostajne tętnienie jasności, żeby brzeg nie stał w miejscu.

Wszystko jest funkcją FAZY 0..2π, więc pętla klatek domyka się bez szwu:
klatka `total` wygląda tak samo jak klatka `0`.

Efekt liczymy na obrazie SUROWYM (przed `wygladz`) — dzięki temu naddatek
przechodzi przez tę samą medianę i rozmycie co reszta mapy i nie trzeba
osobno wygładzać ani maski, ani kaustyk: mediana i tak zetrze pikselozę.
"""

from __future__ import annotations

import numpy as np
from PIL import Image
from scipy.ndimage import distance_transform_edt, gaussian_filter

#: Barwy głębi. Płycizna dostaje wyraźniejszy turkus, otwarte morze
#: schodzi w granat — to ten kontrast najbardziej sprzedaje „wodę", a nie
#: sam wzór łusek.
PLYCIZNA = np.array([104, 206, 218], dtype=np.float32)
GLEBIA = np.array([16, 64, 122], dtype=np.float32)
#: Dystans w pikselach finalnego obrazu, po którym woda liczy się jako
#: w pełni „głęboka" (ok. 1,5 pola przy kaflu 48 px).
ZASIEG_GLEBI = 78.0


def _maska_wody(rgb: np.ndarray) -> tuple[np.ndarray, np.ndarray]:
    """Woda i piana rozpoznane po barwie, nie po siatce pól.

    Kolor niebieski dominujący nad czerwienią i zielenią łapie i głęboką
    wodę, i jasny turkusowy pierścień piany zarazem — a odcina trawę,
    piasek i brązowy obrys brzegu, które są zielone/brązowe/żółte.
    Piana odróżnia się od głębi samą jasnością: to najjaśniejsze piksele
    w tej rodzinie barw.
    """
    r, g, b = rgb[..., 0].astype(np.int16), rgb[..., 1].astype(np.int16), rgb[..., 2].astype(np.int16)
    niebieska = (b - np.maximum(r, g)) > 8
    jasnosc = (r + g + b) / 3.0
    piana = niebieska & (jasnosc > 175)
    glebia = niebieska & ~piana
    return glebia, piana


_POLE_CACHE: dict[tuple[int, int], np.ndarray] = {}


def _pole_swietlne(w: int, h: int) -> np.ndarray:
    """Chmura miękkich plam 0..1 — jedna na cały obraz, stała w czasie.

    Losowa siatka rzadkich punktów, powiększona dwusześcienne i mocno
    rozmyta, daje nieregularne, „chmurkowate" plamy zamiast okresowej
    siatki — siatka sinusów czyta się jak moaré, ta plama jak prawdziwe
    światło na wodzie. Kaustyki animujemy nie przeliczając jej na nowo,
    tylko PRZESUWAJĄC (`np.roll`) tę samą plamę po fazie — stąd jedno
    liczenie starcza na wszystkie klatki animacji. Wynik jest cache'owany,
    bo osiem klatek jednej mapy chce tej samej plamy.
    """
    klucz = (w, h)
    if klucz not in _POLE_CACHE:
        rng = np.random.default_rng(20240517)
        mala = rng.random((max(2, h // 34), max(2, w // 34))).astype(np.float32)
        duza = np.array(Image.fromarray((mala * 255).astype(np.uint8)).resize((w, h), Image.BICUBIC))
        duza = gaussian_filter(duza.astype(np.float32) / 255.0, sigma=9)
        lo, hi = duza.min(), duza.max()
        _POLE_CACHE[klucz] = (duza - lo) / max(hi - lo, 1e-6)
    return _POLE_CACHE[klucz]


def _kaustyki(w: int, h: int, faza: float) -> np.ndarray:
    """Wędrujące kaustyki — ta sama plama światła, przesunięta po okręgu.

    Dwa przesunięcia tej samej plamy, każde po własnym okręgu i z inną
    prędkością kątową, złożone razem: jedna plama sama w sobie tylko by
    dryfowała w jedną stronę, a dwie nakładające się na siebie zaczynają
    wyglądać jak żywa, falująca powierzchnia. Przesunięcie po okręgu
    (`cos`/`sin` fazy) gwarantuje, że klatka `total` wróci dokładnie do
    przesunięcia klatki `0` — pętla się domyka.
    """
    pole = _pole_swietlne(w, h)
    dx1, dy1 = int(round(16 * np.cos(faza))), int(round(16 * np.sin(faza)))
    dx2, dy2 = int(round(10 * np.cos(faza * 1.7 + 2.1))), int(round(10 * np.sin(faza * 1.7 + 2.1)))
    a = np.roll(np.roll(pole, dy1, axis=0), dx1, axis=1)
    b = np.roll(np.roll(pole, dy2, axis=0), dx2, axis=1)
    mieszanka = a * 0.6 + b * 0.4
    return np.clip((mieszanka - 0.42) / 0.58, 0.0, 1.0) ** 1.6


def _skry(w: int, h: int, faza: float, klatka: int, total: int) -> np.ndarray:
    """Rzadkie punkciki światła, które zapalają się i gasną w miejscu.

    Pozycje i fazy poszczególnych skier bierzemy z hasza współrzędnych
    siatki próbek — deterministyczne, więc skra zawsze błyska w tym samym
    miejscu, tylko z inną jasnością w każdej klatce. Sinus podniesiony do
    ósmej potęgi daje krótki, ostry rozbłysk zamiast łagodnego oddechu —
    to ma wyglądać jak odbicie słońca, nie jak druga warstwa kaustyk.
    """
    krok = 30
    ys = np.arange(0, h, krok)
    xs = np.arange(0, w, krok)
    gy, gx = np.meshgrid(ys, xs, indexing='ij')
    hasz = ((gx.astype(np.int64) * 374761393) ^ (gy.astype(np.int64) * 668265263) ^ 0x9E3779B9)
    hasz &= 0xFFFFFFFF
    wybor = (hasz % 1000) / 1000.0
    faza0 = ((hasz // 1000) % 1000) / 1000.0 * 2 * np.pi
    aktywne = wybor < 0.16

    canvas = np.zeros((h, w), dtype=np.float32)
    jasnosc = np.clip(np.sin(faza0 + faza), 0.0, 1.0) ** 8
    canvas[gy[aktywne], gx[aktywne]] = jasnosc[aktywne]
    return gaussian_filter(canvas, sigma=2.6) * 3.0


def wzbogac(im: Image.Image, klatka: int, total: int) -> Image.Image:
    """Dokłada głębię, kaustyki, skry i oddech piany do jednej klatki terenu."""
    arr = np.asarray(im.convert('RGBA')).astype(np.float32)
    rgb, alfa = arr[..., :3], arr[..., 3]
    h, w = rgb.shape[:2]
    glebia, piana = _maska_wody(arr[..., :4].astype(np.uint8))
    if not glebia.any() and not piana.any():
        return im

    faza = 2 * np.pi * klatka / total

    # --- głębia: odległość od najbliższego nie-głębokiego piksela ---
    dystans = distance_transform_edt(glebia)
    t = np.clip(dystans / ZASIEG_GLEBI, 0.0, 1.0) ** 0.7
    cel = PLYCIZNA[None, None, :] * (1 - t[..., None]) + GLEBIA[None, None, :] * t[..., None]
    sila_glebi = 0.5
    rgb = np.where(glebia[..., None], rgb * (1 - sila_glebi) + cel * sila_glebi, rgb)

    # --- kaustyki: żyłki jaśniejszej wody, tylko na głębi ---
    zylki = _kaustyki(w, h, faza) * glebia
    blysk = np.array([210, 245, 255], dtype=np.float32)
    rgb = rgb + zylki[..., None] * (blysk[None, None, :] - rgb) * 0.35

    # --- skry: ostre, rzadkie punkty światła na głębi ---
    skry = np.clip(_skry(w, h, faza, klatka, total), 0.0, 1.0) * glebia
    rgb = rgb + skry[..., None] * (255.0 - rgb) * 0.95

    # --- oddech piany: powolne, jednostajne tętnienie jasnego pierścienia ---
    if piana.any():
        oddech = 1.0 + 0.14 * np.sin(faza)
        rgb = np.where(piana[..., None], np.clip(rgb * oddech, 0, 255), rgb)

    out = np.concatenate([np.clip(rgb, 0, 255), alfa[..., None]], axis=2)
    return Image.fromarray(out.astype(np.uint8), 'RGBA')
