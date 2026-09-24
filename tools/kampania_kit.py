#!/usr/bin/env python3
"""Materiał ekranów kampanii: drewno, złocona rama, pergamin, tabliczki.

Po co osobny komplet
--------------------
Pierwsza runda ślepego porównania z Heroes 2 skończyła się jednym zdaniem
krytyka: mapa i zwój są malowane, a WSZYSTKO WOKÓŁ nich to strona
internetowa — błękitne tło, białe zaokrąglone karty, błyszczące kapsułki
przycisków z gry mobilnej. Cztery języki wizualne na jednym ekranie, podczas
gdy Heroes 2 ma jeden: kamień, drewno, złoto, pergamin.

Ten skrypt robi ten jeden język. Wszystko jest liczone (API modelu
graficznego odpowiada 402), ale z tą samą zasadą światła co reszta gry —
z góry — i z tych samych trzech materiałów:

 - drewno (tło ekranu i belka nagłówka, słoje wzdłuż desek),
 - złoto (ramy: profil z grzbietem, rowkiem i perełkami, rozety w rogach),
 - pergamin (panele z tekstem, przypalone brzegi).

Ramy, pergamin i tabliczki przycisków są w formie „dziewięciu łatek"
(nine-slice): rogi zostają nietknięte, boki się rozciągają. Dzięki temu jedna
tekstura obsłuży przycisk „Menu" i „Graj", ramę mapy i ramę karty trenera,
a układ ekranu żyje wyłącznie w `KampaniaScene.ts` — nie trzeba go
powtarzać tutaj.

Wszystkie pliki mają 2× rozdzielczość ekranu, scena skaluje je o połowę.

    python3 tools/kampania_kit.py
"""

from pathlib import Path

import numpy as np
from PIL import Image, ImageDraw, ImageFilter

KORZEN = Path(__file__).resolve().parent.parent
CEL = KORZEN / 'public' / 'kampania'

#: Ekran w 2×.
EW, EH = 1920, 1388
#: Wysokość belki nagłówka (2×) — ta sama liczba co BELKA w KampaniaScene.ts.
BELKA = 96


def szum(w: int, h: int, sx: float, sy: float, ziarno: int, oktawy: int = 3) -> np.ndarray:
    """Szum 0–1 o różnej skali w osiach — słoje drewna są długie i wąskie."""
    rng = np.random.default_rng(ziarno)
    wynik = np.zeros((h, w), np.float32)
    waga = 0.0
    for o in range(oktawy):
        kx, ky = sx / 2 ** o, sy / 2 ** o
        gw, gh = max(2, int(w / kx) + 3), max(2, int(h / ky) + 3)
        siatka = Image.fromarray((rng.random((gh, gw)) * 255).astype(np.uint8))
        a = np.asarray(siatka.resize((int(gw * kx), int(gh * ky)), Image.BICUBIC), np.float32)[:h, :w] / 255
        wynik += a * 0.55 ** o
        waga += 0.55 ** o
    wynik /= waga
    return (wynik - wynik.min()) / (wynik.max() - wynik.min() + 1e-6)


def rampa(t: np.ndarray, punkty) -> np.ndarray:
    """Barwa z rampy: `punkty` to lista (pozycja 0–1, (r, g, b))."""
    t = np.clip(t, 0, 1)
    poz = np.array([p for p, _ in punkty], np.float32)
    kol = np.array([c for _, c in punkty], np.float32)
    wynik = np.zeros(t.shape + (3,), np.float32)
    for k in range(3):
        wynik[..., k] = np.interp(t, poz, kol[:, k])
    return wynik


DREWNO = [(0, (38, 22, 12)), (0.35, (70, 42, 22)), (0.7, (104, 66, 36)), (1, (136, 92, 52))]
ZLOTO = [(0, (58, 34, 8)), (0.3, (132, 88, 26)), (0.55, (204, 150, 56)), (0.78, (244, 204, 108)),
         (0.92, (255, 236, 170)), (1, (255, 250, 225))]
PAPIER = np.array([244, 229, 192], np.float32)


def slojeDrewna(w: int, h: int, ziarno: int, pion: bool, deska: int) -> np.ndarray:
    """Jasność 0–1 desek ze słojami; `pion` — deski pionowe (tło), inaczej poziome (belka)."""
    if not pion:
        return slojeDrewna(h, w, ziarno, True, deska).T
    xx = np.arange(w, dtype=np.float32)[None, :].repeat(h, 0)
    nr = (xx // deska).astype(int)
    rng = np.random.default_rng(ziarno)
    ton = rng.uniform(0.82, 1.1, nr.max() + 2)[nr]
    pas = szum(w, h, 3, 160, ziarno + 1)
    krzywa = szum(w, h, 40, 300, ziarno + 2)
    # Słoje: sinus po szerokości deski, wygięty szumem — linie biegną wzdłuż
    # deski i falują, jak przecięte roczne przyrosty.
    u = xx % deska
    sloje = 0.5 + 0.5 * np.sin((u + krzywa * 70 + nr * 31) * 0.42)
    sloje = sloje ** 3
    jas = (0.42 + pas * 0.35 - sloje * 0.16) * ton
    # Fuga między deskami: ciemna szczelina, jasna krawędź po lewej (światło z lewej góry).
    jas = np.where(u < 3, jas * 0.35, jas)
    jas = np.where((u >= 3) & (u < 6), jas * 1.25, jas)
    jas = np.where(u > deska - 4, jas * 0.7, jas)
    return np.clip(jas, 0, 1)


def ciemnienieKrawedzi(w, h, moc, zasieg):
    yy, xx = np.mgrid[0:h, 0:w].astype(np.float32)
    d = np.minimum.reduce([xx, yy, w - 1 - xx, h - 1 - yy])
    return 1 - moc * (1 - np.clip(d / zasieg, 0, 1)) ** 2


def perelki(w: int, h: int, jasny: float) -> np.ndarray:
    """Listwa z perełkami (2× wysoka `h`): rząd złotych kulek z połyskiem."""
    yy, xx = np.mgrid[0:h, 0:w].astype(np.float32)
    krok = h * 1.1
    cx = (np.floor(xx / krok) + 0.5) * krok
    cy = h / 2
    r = h * 0.46
    d = np.sqrt((xx - cx) ** 2 + (yy - cy) ** 2) / r
    kula = np.clip(1 - d, 0, 1)
    swiatlo = np.clip(1 - np.sqrt((xx - cx + r * 0.3) ** 2 + (yy - cy + r * 0.35) ** 2) / r, 0, 1)
    b = 0.28 + kula * 0.45 + swiatlo ** 2 * 0.6
    tlo = 0.3 + 0.2 * (1 - np.abs(yy - cy) / (h / 2))
    return np.where(d < 1, b, tlo) * jasny


def drewnoEkranu():
    """Tło wszystkich ekranów kampanii: deski, belka nagłówka z listwą perełkową."""
    jas = slojeDrewna(EW, EH, 11, True, 170)
    rgb = rampa(jas, DREWNO)
    # Belka: poziome słoje, jaśniejsza, z fazą od góry i cieniem pod spodem.
    belka = slojeDrewna(EW, BELKA, 21, False, 48)
    brgb = rampa(belka * 0.8 + 0.28, DREWNO)
    t = np.linspace(0, 1, BELKA)[:, None, None]
    brgb *= 1.18 - 0.35 * t
    brgb[:5] *= 1.35
    rgb[:BELKA] = brgb
    # Listwa perełkowa pod belką.
    lh = 18
    rgb[BELKA - 6:BELKA - 6 + lh] = rampa(perelki(EW, lh, 1.0), ZLOTO)
    rgb[BELKA - 8:BELKA - 6] = rampa(np.full((2, EW), 0.25), ZLOTO)
    rgb[BELKA - 6 + lh:BELKA - 4 + lh] = rampa(np.full((2, EW), 0.2), ZLOTO)
    # Cień rzucany przez belkę na deski.
    yy = np.arange(EH, dtype=np.float32)[:, None]
    cien = np.exp(-np.clip(yy - (BELKA + lh - 6), 0, None) / 22) * (yy > BELKA + lh - 6) * 0.55
    rgb *= (1 - cien)[..., None]
    rgb *= ciemnienieKrawedzi(EW, EH, 0.55, 260)[..., None]
    Image.fromarray(rgb.clip(0, 255).astype(np.uint8)).save(CEL / 'drewno.jpg', quality=86, optimize=True)


def odlegloscOdKrawedzi(S: int, r: float):
    """Odległość do brzegu zaokrąglonego kwadratu S×S (dodatnia w środku) i strona najbliższej krawędzi."""
    yy, xx = np.mgrid[0:S, 0:S].astype(np.float32) + 0.5
    # Odległość do zaokrąglonego prostokąta.
    qx = np.maximum(np.abs(xx - S / 2) - (S / 2 - r), 0)
    qy = np.maximum(np.abs(yy - S / 2) - (S / 2 - r), 0)
    d_zew = r - np.sqrt(qx ** 2 + qy ** 2)
    d = np.minimum.reduce([xx, yy, S - xx, S - yy])
    d = np.where((qx > 0) & (qy > 0), d_zew, d)
    # Strona: która krawędź najbliższa (0 góra, 1 lewo, 2 prawo, 3 dół).
    strony = np.stack([yy, xx, S - xx, S - yy])
    return d, strony.argmin(0), xx, yy


def ramaZlota(S: int, B: int, nazwa: str, rozety: bool):
    """Złocona rama o profilu: ciemny brzeg, wypukły grzbiet, rowek z perełkami, warga do środka."""
    d, strona, xx, yy = odlegloscOdKrawedzi(S, B * 0.35)
    t = d / B
    b = np.zeros_like(t)
    b = np.where(t < 0.1, 0.18 + t * 3, b)
    grzbiet = (t >= 0.1) & (t < 0.48)
    b = np.where(grzbiet, 0.45 + 0.5 * np.sin(np.pi * (t - 0.1) / 0.38), b)
    rowek = (t >= 0.48) & (t < 0.72)
    # Perełki w rowku: kulki wzdłuż boku ramy.
    wzdluz = np.where((strona == 0) | (strona == 3), xx, yy)
    faza = (wzdluz % (B * 0.34)) / (B * 0.34)
    kulka = np.clip(1 - np.abs(faza - 0.5) * 2.4, 0, 1) * np.clip(1 - np.abs((t - 0.6) / 0.12), 0, 1)
    b = np.where(rowek, 0.22 + kulka * 0.7, b)
    b = np.where((t >= 0.72) & (t < 0.86), 0.62, b)
    b = np.where(t >= 0.86, 0.5 - (t - 0.86) * 2.6, b)
    # Światło z góry: górna i lewa krawędź jaśniejsze, dolna i prawa ciemniejsze.
    kier = np.choose(strona, [1.12, 1.04, 0.88, 0.78])
    b *= kier
    b += (szum(S, S, 3, 3, 5, 2) - 0.5) * 0.06
    rgb = rampa(b, ZLOTO)
    alfa = np.clip(d + 0.5, 0, 1) * (t < 1.0)
    if rozety:
        # Rozety w rogach: kwiatek z ośmiu płatków na kuli — okucie narożnika.
        for cx, cy in [(B / 2, B / 2), (S - B / 2, B / 2), (B / 2, S - B / 2), (S - B / 2, S - B / 2)]:
            dx, dy = xx - cx, yy - cy
            rr = np.sqrt(dx ** 2 + dy ** 2)
            kat = np.arctan2(dy, dx)
            R = B * 0.62
            platki = R * (0.72 + 0.28 * np.abs(np.cos(kat * 4)))
            w = rr < platki
            kula = np.clip(1 - rr / platki, 0, 1)
            sw = np.clip(1 - np.sqrt((dx + R * 0.3) ** 2 + (dy + R * 0.35) ** 2) / R, 0, 1)
            br = 0.3 + kula * 0.35 + sw ** 1.5 * 0.6
            br = np.where(rr < R * 0.28, 0.35 + sw * 0.9, br)
            rgb = np.where(w[..., None], rampa(br, ZLOTO), rgb)
            alfa = np.where(w, 1.0, alfa)
    im = Image.fromarray(np.dstack([rgb.clip(0, 255), alfa * 255]).astype(np.uint8), 'RGBA')
    im.save(CEL / nazwa, optimize=True)


def papier(w: int, h: int, ziarno: int, brzeg: float) -> np.ndarray:
    plamy = szum(w, h, 90, 90, ziarno, 4)
    wlokna = szum(w, h, 3, 3, ziarno + 1, 2)
    rgb = np.ones((h, w, 3), np.float32) * PAPIER
    rgb *= (0.93 + plamy[..., None] * 0.1)
    rgb *= (0.985 + wlokna[..., None] * 0.03)
    if brzeg:
        c = 1 - ciemnienieKrawedzi(w, h, 1.0, brzeg)
        c = c ** 1.4
        rgb = rgb * (1 - c[..., None] * 0.5) + np.array([140, 86, 40], np.float32) * c[..., None] * 0.5
    return rgb


def pergamin(S: int, nazwa: str):
    """Pergamin z przypalonym brzegiem, w formie dziewięciu łatek."""
    rgb = papier(S, S, 31, S * 0.16)
    d, _, _, _ = odlegloscOdKrawedzi(S, 14)
    alfa = np.clip(d, 0, 1)
    im = Image.fromarray(np.dstack([rgb.clip(0, 255), alfa * 255]).astype(np.uint8), 'RGBA')
    im.save(CEL / nazwa, optimize=True)


def tabliczka(w: int, h: int, r: int, nazwa: str, zlota: bool, stan: str):
    """Tabliczka przycisku: drewno albo złoto w złotej obwódce. Rysowana w 2×
    i zmniejszana — tak zaokrąglone rogi wychodzą gładko bez wygładzania."""
    SS = 2
    W, H = w * SS, h * SS
    yy, xx = np.mgrid[0:H, 0:W].astype(np.float32) + 0.5
    R = r * SS
    qx = np.maximum(np.abs(xx - W / 2) - (W / 2 - R), 0)
    qy = np.maximum(np.abs(yy - H / 2) - (H / 2 - R), 0)
    d = R - np.sqrt(qx ** 2 + qy ** 2)
    d = np.where((qx > 0) | (qy > 0), d, np.minimum.reduce([xx, yy, W - xx, H - yy]))
    obw = 7 * SS
    t_obw = np.clip(d / obw, 0, 1)
    ty = yy / H
    # Obwódka: grzbiet złota, jaśniejszy u góry.
    b_obw = 0.3 + 0.55 * np.sin(np.pi * t_obw) + (0.5 - ty) * 0.35
    if zlota:
        # Lico złote: szeroki pas światła w górnej połowie, cieplejszy dół.
        b_lico = 0.62 + 0.28 * np.cos((ty - 0.3) * 3.2) - (ty > 0.55) * (ty - 0.55) * 0.8
        b_lico += (szum(W, H, 2, 40, 4, 2) - 0.5) * 0.05
        lico = rampa(b_lico, ZLOTO)
    else:
        sl = slojeDrewna(W, H, 9, False, 60 * SS)
        lico = rampa(sl * 0.75 + 0.3, DREWNO) * (1.2 - ty * 0.5)[..., None]
    rgb = np.where((d < obw)[..., None], rampa(b_obw, ZLOTO), lico)
    # Faza lica: jasna linia tuż pod obwódką u góry, cień przy dolnej.
    faza_g = (d >= obw) & (d < obw + 3 * SS) & (ty < 0.5)
    faza_d = (d >= obw) & (d < obw + 4 * SS) & (ty >= 0.5)
    rgb = np.where(faza_g[..., None], rgb * 1.25, rgb)
    rgb = np.where(faza_d[..., None], rgb * 0.62, rgb)
    # Ciemny kontur na samym brzegu.
    rgb = np.where((d < 1.6 * SS)[..., None], rgb * 0.45, rgb)
    if stan == 'jasny':
        rgb = rgb * 1.16 + 8
    elif stan == 'wyl':
        szary = rgb.mean(axis=2, keepdims=True)
        rgb = (rgb * 0.25 + szary * 0.75) * 0.62
    alfa = np.clip(d, 0, 1)
    im = Image.fromarray(np.dstack([rgb.clip(0, 255), alfa * 255]).astype(np.uint8), 'RGBA')
    im = im.resize((w, h), Image.LANCZOS)
    im.save(CEL / nazwa, optimize=True)


def cien(S: int, nazwa: str):
    """Miękki cień pod panelem — dziewięć łatek, rozmyty czarny kwadrat."""
    im = Image.new('L', (S, S), 0)
    ImageDraw.Draw(im).rounded_rectangle([S * 0.3, S * 0.3, S * 0.7, S * 0.7], 10, fill=255)
    im = im.filter(ImageFilter.GaussianBlur(S * 0.11))
    out = Image.new('RGBA', (S, S), (10, 6, 2, 0))
    out.putalpha(im)
    out.save(CEL / nazwa, optimize=True)


def main():
    CEL.mkdir(parents=True, exist_ok=True)
    drewnoEkranu()
    ramaZlota(192, 30, 'rama-zlota.png', True)
    ramaZlota(96, 13, 'rama-cienka.png', False)
    pergamin(256, 'pergamin.png')
    for stan in ('', 'jasny', 'wyl'):
        k = f'-{stan}' if stan else ''
        tabliczka(240, 88, 24, f'tabliczka-drewno{k}.png', False, stan or 'n')
        tabliczka(240, 88, 24, f'tabliczka-zloto{k}.png', True, stan or 'n')
    cien(160, 'cien.png')
    print(f'zapisano komplet do {CEL}')


if __name__ == '__main__':
    main()
