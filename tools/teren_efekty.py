#!/usr/bin/env python3
"""Efekty terenu dla plansz kampanii — to, czego jedna tekstura nie powie.

Skąd to się wzięło
------------------
Ślepe porównanie z mapą przygody Heroes 2 (runda 1 plansz kampanii) przegrało
na wszystkich trzech planszach z tego samego powodu: „grunt to jedna rozmyta
tekstura na scenę". Bagno czytało się jak brązowa plama w kolorze drogi,
śnieg jak mgła albo usterka rysowania, a droga rozpływała się w trzęsawisku.
W Heroes 2 każdy teren ma STRUKTURĘ, po której poznaje się go bez koloru:
bagno ma czarne oczka wody, trzcinę i grążele, śnieg ma zaspy z niebieskim
cieniem, droga ma brzeg.

Wszystko tutaj maluje się W TLE planszy (`render_mapa.py`), więc idzie przez
to samo wygładzanie całej mapy co reszta terenu — nie ma osobnej warstwy
z ostrymi brzegami obok miękkiego gruntu. Efekty włącza plansza (`EFEKTY`
w `tools/mapy/<id>.py`); „Dwie Doliny" żadnego nie mają i ich tło zostaje
bajt w bajt takie jak przed zmianą.
"""

import numpy as np
from PIL import Image, ImageDraw, ImageFilter

from teren_malowanie import szum


def _tab(im: Image.Image) -> np.ndarray:
    return np.asarray(im.convert('RGB'), dtype=np.float32)


def _obraz(tab: np.ndarray) -> Image.Image:
    return Image.fromarray(tab.clip(0, 255).astype(np.uint8), 'RGB')


def zaspy(warstwa: Image.Image, kafel: int, ziarno: int) -> Image.Image:
    """Śnieg z RZEŹBĄ: zaspy oświetlone z lewej góry, cienie niebieskie, iskry.

    Płaska biel wygląda jak mgła, bo nie ma w niej nic, co mówi „powierzchnia".
    Wysokość zasp to szum w dwóch skalach (duże wały na kilka pól i drobne
    fałdy), a światło liczymy z pochodnej — jak cieniowanie reliefu na mapie
    fizycznej. Cień nie jest szary, tylko niebieski: tak wygląda śnieg w
    słońcu i tak go rysują wszystkie gry, w których zima jest czytelna.
    """
    W, H = warstwa.size
    h = szum(W, H, max(2, int(kafel * 1.6)), ziarno) * 1.0 + szum(W, H, max(2, int(kafel * 0.45)), ziarno + 1) * 0.35
    gy, gx = np.gradient(h)
    swiatlo = -(gx + gy) * kafel * 0.55
    swiatlo = np.clip(swiatlo, -1, 1)[..., None]
    tab = _tab(warstwa)
    jasne = tab + (255 - tab) * np.clip(swiatlo, 0, 1) * 0.55
    cien = np.array([105, 140, 200], dtype=np.float32)
    ciemne = tab * (1 + np.clip(swiatlo, -1, 0) * 0.35) + cien * (-np.clip(swiatlo, -1, 0)) * 0.28
    tab = np.where(swiatlo > 0, jasne, ciemne)
    # Iskry: pojedyncze jasne punkty na grzbietach zasp, nie wszędzie.
    rng = np.random.default_rng(ziarno + 2)
    ile = W * H // 900
    xs = rng.integers(1, W - 1, ile)
    ys = rng.integers(1, H - 1, ile)
    na_grzbiecie = swiatlo[ys, xs, 0] > 0.25
    for x, y in zip(xs[na_grzbiecie], ys[na_grzbiecie]):
        tab[y, x] = 255
        tab[y - 1:y + 2, x] = np.maximum(tab[y - 1:y + 2, x], 235)
        tab[y, x - 1:x + 2] = np.maximum(tab[y, x - 1:x + 2], 235)
    return _obraz(tab)


def lod(warstwa: Image.Image, maska: Image.Image, kafel: int, ziarno: int) -> Image.Image:
    """Skuta lodem tafla: rysy pęknięć i jaśniejszy szron przy brzegu."""
    W, H = warstwa.size
    im = warstwa.convert('RGB').copy()
    d = ImageDraw.Draw(im, 'RGBA')
    rng = np.random.default_rng(ziarno)
    m = np.asarray(maska, dtype=np.uint8)
    ile = W * H // (kafel * kafel * 3)
    for _ in range(ile):
        x, y = int(rng.integers(0, W)), int(rng.integers(0, H))
        if m[y, x] < 200:
            continue
        punkty = [(x, y)]
        kat = rng.uniform(0, 6.28)
        for _ in range(int(rng.integers(3, 7))):
            kat += rng.uniform(-0.9, 0.9)
            dl = rng.uniform(kafel * 0.25, kafel * 0.7)
            x, y = x + np.cos(kat) * dl, y + np.sin(kat) * dl
            punkty.append((x, y))
        d.line(punkty, fill=(245, 252, 255, 150), width=2)
        d.line([(px + 1, py + 1) for px, py in punkty], fill=(90, 130, 170, 90), width=1)
    # Szron przy brzegu: maska rozmyta minus maska — pas tuż przy lądzie.
    brzeg = np.asarray(maska.filter(ImageFilter.GaussianBlur(kafel * 0.25)), dtype=np.float32) / 255
    pas = np.clip((1 - brzeg) * (m / 255.0) * 3, 0, 1)[..., None]
    tab = _tab(im)
    tab = tab + (255 - tab) * pas * 0.6
    return _obraz(tab)


def bagno(plansza: Image.Image, maska: Image.Image, kafel: int, ziarno: int) -> Image.Image:
    """Trzęsawisko, które czyta się jako bagno: oczka wody, kępy, trzcina, grążele.

    Oczka to ciemna, zielonoczarna woda w zagłębieniach (szum ponad progiem,
    tylko w głębi bagna, nie na brzegu), z jasnym połyskiem od strony światła.
    Między nimi kępy — trochę jaśniejsze, a na nich trzcina: krótkie kreski
    ciemnej zieleni z jasnym końcem. Na oczkach grążele. Trzy rzeczy, po
    których bagno poznaje się z drugiego końca ekranu, zanim zobaczy się kolor.
    """
    W, H = plansza.size
    m = np.asarray(maska, dtype=np.float32) / 255.0
    rdzen = np.asarray(maska.filter(ImageFilter.MinFilter(max(3, (kafel // 3) | 1))), dtype=np.float32) / 255.0
    n = szum(W, H, max(2, int(kafel * 0.7)), ziarno) + szum(W, H, max(2, int(kafel * 0.25)), ziarno + 5) * 0.3
    oczka = np.clip((n - 0.18) * 5, 0, 1) * rdzen
    oczka_im = Image.fromarray((oczka * 255).astype(np.uint8), 'L').filter(ImageFilter.GaussianBlur(1.5))
    oczka = np.asarray(oczka_im, dtype=np.float32)[..., None] / 255.0
    tab = _tab(plansza)
    # Całe bagno ciemniej i zieleniej — żeby nie miało koloru drogi.
    tab = tab * (1 - m[..., None] * 0.34) + np.array([28, 58, 30]) * m[..., None] * 0.2
    woda = np.array([22, 38, 30], dtype=np.float32)
    tab = tab * (1 - oczka * 0.85) + woda * oczka * 0.85
    # Połysk: górny brzeg oczka (pochodna maski w pionie) jaśnieje.
    gy = np.gradient(oczka[..., 0], axis=0)
    blask = np.clip(gy * 6, 0, 1)[..., None]
    tab = tab + (np.array([150, 185, 150]) - tab) * blask * 0.5
    im = _obraz(tab)

    d = ImageDraw.Draw(im, 'RGBA')
    rng = np.random.default_rng(ziarno + 9)
    oczka2 = oczka[..., 0]
    # Trzcina na kępach.
    for _ in range(W * H // 900):
        x, y = int(rng.integers(2, W - 2)), int(rng.integers(12, H - 2))
        if m[y, x] < 0.9 or oczka2[y, x] > 0.2:
            continue
        for _ in range(int(rng.integers(5, 10))):
            dx = rng.uniform(-6, 6)
            wys = rng.uniform(kafel * 0.2, kafel * 0.42)
            pochyl = rng.uniform(-4, 4)
            x0, y0 = x + dx, y + rng.uniform(-1.5, 1.5)
            d.line([(x0 + 1, y0 + 1), (x0 + pochyl + 1, y0 - wys + 1)], fill=(10, 20, 10, 120), width=3)
            d.line([(x0, y0), (x0 + pochyl, y0 - wys)], fill=(58, 92, 38, 240), width=3)
            d.line([(x0 + pochyl * 0.75, y0 - wys * 0.75), (x0 + pochyl, y0 - wys)], fill=(150, 110, 60, 240), width=3)
    # Grążele na oczkach.
    for _ in range(W * H // 1600):
        x, y = int(rng.integers(4, W - 4)), int(rng.integers(4, H - 4))
        if oczka2[y, x] < 0.7:
            continue
        r = rng.uniform(kafel * 0.05, kafel * 0.09)
        d.ellipse([x - r, y - r * 0.7, x + r, y + r * 0.7], fill=(70, 125, 55, 235))
        d.pieslice([x - r, y - r * 0.7, x + r, y + r * 0.7], 300, 330, fill=(22, 38, 30, 255))
        if rng.random() < 0.25:
            d.ellipse([x - 2, y - 2, x + 2, y + 2], fill=(245, 225, 235, 255))
    return im


def obwodka_drogi(plansza: Image.Image, maska_drogi: Image.Image, kafel: int) -> Image.Image:
    """Brzeg drogi: ciemny, wydeptany pas po obu stronach i jaśniejsza jezdnia.

    Bez tego droga na bagnie ginęła — oliwkowobrązowe trzęsawisko ma prawie
    ten sam kolor co ubita ziemia. W Heroes 2 droga ma krawędź i widać ją
    z daleka niezależnie od tego, przez co biegnie.
    """
    m = np.asarray(maska_drogi, dtype=np.float32) / 255.0
    szer = np.asarray(
        maska_drogi.filter(ImageFilter.MaxFilter(max(3, (kafel // 6) | 1))).filter(ImageFilter.GaussianBlur(kafel * 0.05)),
        dtype=np.float32,
    ) / 255.0
    brzeg = np.clip(szer - m, 0, 1)[..., None]
    tab = _tab(plansza)
    tab = tab * (1 - brzeg * 0.5) + np.array([45, 32, 20]) * brzeg * 0.25
    tab = tab + (255 - tab) * m[..., None] * 0.12
    return _obraz(tab)
