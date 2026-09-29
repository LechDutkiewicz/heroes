#!/usr/bin/env python3
"""Wtapianie podstawek obiektów mapy w teren (mapa świata w stylu Pokémon).

Obiekty z `tools/PROMPTY-MAPA-3.md` stoją na jasnych, okrągłych podstawkach
z ciemnym konturem — na planszy czytały się jak naklejki („obrazek terenu,
na który ktoś ponaklejał naklejki z obiektami”). `osadz` zdejmuje kontur
podstawki i rozmywa jej brzeg w przezroczystość, więc grunt pod obiektem
przechodzi w trawę planszy. Rusza tylko piksele w barwach podstawki,
w pasie tuż nad dolnym brzegiem każdej kolumny rysunku: słup wiatraka, nogi
wieży i ściany domów zostają nietknięte. Wołane z `tools/mapa3_wczytaj.py`.
"""
import numpy as np
from PIL import Image, ImageFilter

def _f(a, filtr):
    return np.asarray(Image.fromarray((np.clip(a, 0, 1) * 255).astype(np.uint8)).filter(filtr)).astype(np.float32) / 255

def osadz(im: Image.Image, od=0.4, do=0.62, kontur=0.012, miekko=0.09, prog=58.0, pasDolu=0.24) -> Image.Image:
    """Podstawka obiektu wtapia się w teren. W dolnej części rysunku piksele
    w barwach podstawki (próbka z dolnego pasa) i ciemny kontur tuż przy nich
    tracą krycie ku brzegowi; słupy, nogi i ściany zostają nietknięte."""
    im = im.convert('RGBA')
    px = np.asarray(im).astype(np.float32)
    rgb, a = px[..., :3], px[..., 3] / 255
    ys, xs = np.nonzero(a > 0.1)
    if len(ys) == 0:
        return im
    top, bot = int(ys.min()), int(ys.max())
    h = bot - top + 1
    W = int(xs.max() - xs.min() + 1)
    S = max(W, h)
    y = np.arange(a.shape[0], dtype=np.float32)[:, None]
    t = np.clip(((y - top) / h - od) / (do - od), 0, 1)
    w = t * t * (3 - 2 * t) * np.ones_like(a)
    lum = rgb @ np.array([0.3, 0.59, 0.11], dtype=np.float32)
    # Barwy podstawki: dolne 14% rysunku, bez konturu.
    pas = (y >= bot - 0.14 * h) & (a > 0.9) & (lum > 85)
    probki = rgb[np.broadcast_to(pas, a.shape)]
    if len(probki) < 20:
        return im
    rng = np.random.default_rng(0)
    c = probki[rng.choice(len(probki), 4, replace=False)]
    for _ in range(12):
        d = ((probki[:, None, :] - c[None]) ** 2).sum(-1)
        l = d.argmin(1)
        c = np.stack([probki[l == i].mean(0) if (l == i).any() else c[i] for i in range(len(c))])
    dist = np.sqrt(((rgb[..., None, :] - c[None, None]) ** 2).sum(-1)).min(-1)
    pad = (dist < prog) & (a > 0.05)
    # Ciemny kontur przy podstawce: blisko brzegu i blisko pikseli podstawki.
    k = int(max(1, round(float(kontur * S))))
    brzeg = _f(a, ImageFilter.MinFilter(2 * k + 1)) < 0.5
    przyPad = _f(pad.astype(np.float32), ImageFilter.MaxFilter(2 * k + 1)) > 0.5
    ciemny = (lum < 95) & brzeg & przyPad
    miekka = pad | ciemny
    # Zanik ku brzegowi: rozmyta maska całego rysunku bez konturu.
    a1 = np.where(ciemny, 0, a)
    # Domknięcie sylwetki (dylatacja, potem erozja): cienkie nogi, schody
    # i słupy liczą się jako środek bryły, a nie jej brzeg — nie bledną.
    z = int(max(3, round(float(0.05 * S)))) | 1
    zamkniety = _f(_f(a1, ImageFilter.MaxFilter(z)), ImageFilter.MinFilter(z))
    b = _f(zamkniety, ImageFilter.GaussianBlur(float(max(1.0, miekko * S))))
    s = np.clip((b - 0.45) / 0.5, 0, 1)
    s = s * s * (3 - 2 * s)
    # Tylko pas tuż nad dolnym brzegiem każdej kolumny: słup wiatraka czy
    # nogi wieży stoją WYŻEJ niż spód swojej kolumny, więc nie bledną.
    pelne = a > 0.5
    ydol = np.where(pelne.any(0), a.shape[0] - 1 - np.argmax(pelne[::-1], 0), -1).astype(np.float32)
    nad = ydol[None, :] - y
    kolumna = np.clip(1 - nad / (pasDolu * h), 0, 1)
    kolumna = _f(kolumna, ImageFilter.GaussianBlur(float(max(1.0, 0.01 * S))))
    wm = w * miekka * kolumna
    a2 = a1 * (1 - wm) + a1 * s * wm
    out = px.copy()
    # Podstawka ciemnieje ku barwie wydeptanej ziemi: jasny, półprzezroczysty
    # krem nad trawą dawał jaśniejszą „podkładkę naklejki”, a grunt pod
    # budynkiem ma być ciemniejszy od trawy, nie jaśniejszy.
    ziemia = np.array(ZIEMIA, dtype=np.float32)
    out[..., :3] = rgb * (1 - wm[..., None]) + rgb * ziemia * wm[..., None]
    out[..., 3] = np.clip(a2, 0, 1) * 255
    return oczysc_brzeg(Image.fromarray(out.astype(np.uint8)))


#: Mnożnik barwy podstawki (R, G, B) — ku ciemniejszej, cieplejszej ziemi.
ZIEMIA = (0.74, 0.68, 0.54)


def oczysc_brzeg(im: Image.Image, promien=0.004) -> Image.Image:
    """Zdejmuje jasną obwódkę po wycięciu tła: kolor półprzezroczystych
    i brzegowych pikseli bierze się ze środka rysunku (normalizowane
    rozmycie), a jasne piksele na samym brzegu tracą krycie."""
    px = np.asarray(im.convert('RGBA')).astype(np.float32)
    rgb, a = px[..., :3], px[..., 3] / 255
    ys, xs = np.nonzero(a > 0.1)
    if len(ys) == 0:
        return im
    S = max(ys.max() - ys.min(), xs.max() - xs.min()) + 1
    k = int(max(1, round(float(promien * S))))
    wnetrze = _f(a, ImageFilter.MinFilter(2 * k + 1))
    pewne = (wnetrze > 0.95).astype(np.float32)
    rozm = ImageFilter.GaussianBlur(float(k * 2))
    waga = _f(pewne, rozm)
    kolor = np.stack([_f(rgb[..., i] / 255 * pewne, rozm) for i in range(3)], -1)
    kolor = kolor / np.maximum(waga, 1e-4)[..., None] * 255
    # Tylko piksele półprzezroczyste — to w nich siedzi resztka tła; kryjące
    # białe ściany na brzegu rysunku zostają.
    brzeg = (wnetrze < 0.95) & (a > 0) & (a < 0.9) & (waga > 0.02)
    out = px.copy()
    out[..., :3][brzeg] = kolor[brzeg]
    lum = rgb @ np.array([0.3, 0.59, 0.11], dtype=np.float32)
    jasny = brzeg & (lum > 200)
    out[..., 3] = np.where(jasny, a * 0.5, a) * 255
    return Image.fromarray(np.clip(out, 0, 255).astype(np.uint8))
