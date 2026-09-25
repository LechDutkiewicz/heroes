#!/usr/bin/env python3
"""Malowane ilustracje ekranu kampanii: wsad z modelu → pliki gry.

Skąd i dokąd
------------
Prompty są w `tools/PROMPTY-KAMPANIA.md`, obrazki leżą w `tools/wsad/`
(`kampania-*.png`). Ten skrypt robi z nich to, co czyta `KampaniaScene`:

    public/kampania/wstep.jpg        noc: strażnik z latarnią, pochód z wozem, grota
    public/kampania/koniec.jpg       poranek: stworki wracają, strażnik macha
    public/kampania/portret-janek.jpg  portrety na karty wyboru trenera
    public/kampania/portret-ola.jpg
    public/kampania/mapa.jpg         malowana mapa krainy (1232 × 924, 2× ekranu)
    public/kampania/woda-a.png       połysk wody na tej mapie, dwie fazy
    public/kampania/woda-b.png
    public/kampania/mapa.json        droga między misjami (ułamki 0–1 mapy)
    public/kampania/zwoj.png         pusty zwój z wyciętym tłem (alfa)

`janek.png` / `ola.png` (figurki) zostają, bo stoją na mapie przy bieżącej
misji i w scenie wyniku — portrety są osobnymi plikami.

Kadry
-----
Ilustracje wstępu i zakończenia są 3:2, ekran gry 960 × 694 (≈ 1,38), więc
tniemy BOKI, nie górę ani dół: u góry jest księżyc i grota, na dole ziemia,
na której stoją postacie. Przesunięcie kadru jest dobrane pod treść: we wstępie
odcinamy ciemny las z lewej, a nie drzewo przy grocie; w zakończeniu — las
z lewej, bo z prawej jest latarnia strażnika.

Mapa jest 3:2, okno mapy na ekranie 4:3 — tniemy 171 px z boków (las po lewej
i skraj bagna po prawej), żeby wszystkie cztery miejsca misji zostały w kadrze.

Punkty misji i droga
--------------------
Ilustracja z modelu nie wie, gdzie stoją znaczniki. Nie przesuwamy więc
obrazka pod stare punkty, tylko przepisujemy punkty pod obrazek: MISJE niżej
są w pikselach PEŁNEJ ilustracji (1536 × 1024) i mówią, gdzie na niej stoi
znacznik — na spokojnym gruncie tuż przed budowlą misji. Skrypt przelicza je
na ułamki kadru i porównuje z `naMapie` w `src/data/kampania.ts`; gdy się
rozjadą, kończy się błędem (poprawić trzeba jedno albo drugie, nie oba naraz).
Sprawdza też, czy pod znacznikiem i tabliczką jest spokojne tło.

    python3 tools/kampania_ilustracje.py
"""

import json
import re
import sys
from pathlib import Path

import numpy as np
from PIL import Image, ImageFilter
from scipy import ndimage as nd

sys.path.insert(0, str(Path(__file__).resolve().parent))
from wsad_wczytaj import bezChromy, jestChroma  # noqa: E402

KORZEN = Path(__file__).resolve().parent.parent
WSAD = KORZEN / 'tools' / 'wsad'
CEL = KORZEN / 'public' / 'kampania'

EKRAN_W, EKRAN_H = 960, 694

# ————————————————————————————————————————————————— ilustracje pełnoekranowe

#: Lewa krawędź kadru (px pełnej ilustracji) — dobrana pod treść, patrz wyżej.
KADR_OPOWIESCI = {'wstep': 80, 'koniec': 120}


def opowiesci():
    for nazwa, x0 in KADR_OPOWIESCI.items():
        im = Image.open(WSAD / f'kampania-{nazwa}.png').convert('RGB')
        w, h = im.size
        kw = round(h * EKRAN_W / EKRAN_H)
        assert x0 + kw <= w, f'{nazwa}: kadr wychodzi poza obraz'
        im.crop((x0, 0, x0 + kw, h)).save(CEL / f'{nazwa}.jpg', quality=86, optimize=True, progressive=True)
        print(f'  {nazwa}.jpg  {kw} × {h}  (kadr od x={x0})')


# ————————————————————————————————————————————————— portrety

#: Karta portretu w scenie ma 310 × 446 (proporcja 0,695); plik 2×.
KARTA = (620, 892)


def portrety():
    for imie in ('janek', 'ola'):
        im = Image.open(WSAD / f'kampania-{imie}.png').convert('RGB')
        w, h = im.size
        kh = round(w * KARTA[1] / KARTA[0])
        # Odcinamy dół (pasek, torba) — twarz i czapka są w górnych 40 %.
        im = im.crop((0, 0, w, kh)).resize(KARTA, Image.LANCZOS)
        im.save(CEL / f'portret-{imie}.jpg', quality=88, optimize=True, progressive=True)
        print(f'  portret-{imie}.jpg  {KARTA[0]} × {KARTA[1]}')


# ————————————————————————————————————————————————— mapa

MAPA_KADR = (100, 0, 1465, 1024)
MAPA_W, MAPA_H = 1232, 924

#: Znaczniki misji w pikselach pełnej ilustracji, w kolejności misji.
MISJE = [
    (400, 885),   # 1 Pierwsze kroki — trawa przed palisadą fortu, obok drogi
    (575, 470),   # 2 Klucze do przełęczy — łąka pod strażnicą w przełęczy
    (915, 770),   # 3 Bagienny szlak — brzeg między rzeką a bagnem, pod wierzbami
    (1225, 470),  # 4 Oblężenie Groty — zbocze pod bramą twierdzy
]

#: Droga między misjami (px pełnej ilustracji). Pierwszy odcinek idzie
#: namalowaną drogą od fortu na północ i dopiero pod strażnicą z niej schodzi;
#: drugi przechodzi rzekę; trzeci mija świecącą grotę i wspina się do bramy.
DROGA = [
    [MISJE[0], (468, 872), (522, 812), (532, 752), (492, 686), (466, 628), (500, 572), (552, 520), MISJE[1]],
    [MISJE[1], (640, 510), (705, 560), (760, 622), (822, 690), (872, 740), MISJE[2]],
    [MISJE[2], (948, 700), (1000, 648), (1070, 604), (1140, 548), (1190, 500), MISJE[3]],
]


def naKadr(p):
    x0, y0, x1, y1 = MAPA_KADR
    return ((p[0] - x0) / (x1 - x0), (p[1] - y0) / (y1 - y0))


def gladkaKrzywa(punkty, gestosc=10):
    """Catmull-Rom przez punkty, w ułamkach — droga bez kolan."""
    p = [punkty[0], *punkty, punkty[-1]]
    wynik = []
    for i in range(1, len(p) - 2):
        p0, p1, p2, p3 = (np.array(q, float) for q in p[i - 1:i + 3])
        for k in range(gestosc):
            t = k / gestosc
            t2, t3 = t * t, t * t * t
            q = 0.5 * ((2 * p1) + (-p0 + p2) * t + (2 * p0 - 5 * p1 + 4 * p2 - p3) * t2 + (-p0 + 3 * p1 - 3 * p2 + p3) * t3)
            wynik.append((round(float(q[0]), 4), round(float(q[1]), 4)))
    wynik.append(tuple(round(v, 4) for v in punkty[-1]))
    return wynik


def naMapieZKodu():
    zrodlo = (KORZEN / 'src' / 'data' / 'kampania.ts').read_text(encoding='utf-8')
    pary = re.findall(r'naMapie:\s*\{\s*x:\s*([\d.]+),\s*y:\s*([\d.]+)\s*\}', zrodlo)
    return [(float(x), float(y)) for x, y in pary]


def spokoj(tab: np.ndarray, x: float, y: float, rx: float, ry: float) -> float:
    """Odchylenie jasności w prostokącie wokół punktu (px kadru) — im mniej, tym spokojniej."""
    h, w = tab.shape
    a = tab[max(0, int(y - ry)):min(h, int(y + ry)), max(0, int(x - rx)):min(w, int(x + rx))]
    return float(a.std())


def mapa():
    zrodlo = Image.open(WSAD / 'kampania-mapa.png').convert('RGB')
    kadr = zrodlo.crop(MAPA_KADR)
    kadr.resize((MAPA_W, MAPA_H), Image.LANCZOS).save(CEL / 'mapa.jpg', quality=90, optimize=True, progressive=True)
    print(f'  mapa.jpg  {MAPA_W} × {MAPA_H}  (kadr {MAPA_KADR})')

    # ——— punkty misji: zgodność z kodem i spokojne tło
    punkty = [naKadr(p) for p in MISJE]
    wKodzie = naMapieZKodu()
    rozjazd = [
        (i + 1, p, k) for i, (p, k) in enumerate(zip(punkty, wKodzie))
        if abs(p[0] - k[0]) > 0.002 or abs(p[1] - k[1]) > 0.002
    ]
    if len(wKodzie) != len(punkty) or rozjazd:
        print('  naMapie w src/data/kampania.ts nie zgadza się z ilustracją. Powinno być:')
        for i, p in enumerate(punkty):
            print(f'    misja {i + 1}: naMapie: {{ x: {p[0]:.4f}, y: {p[1]:.4f} }}')
        raise SystemExit(1)

    # Znacznik ma ~16 px promienia na ekranie, tabliczka pod nim ~130 × 26 px,
    # 32 px niżej. Skala ekranu: okno mapy 588 px na 1365 px kadru.
    skala = 588 / (MAPA_KADR[2] - MAPA_KADR[0])
    jasn = np.asarray(kadr.convert('L').filter(ImageFilter.GaussianBlur(1.5)), np.float32)
    ogolnie = spokoj(jasn, jasn.shape[1] / 2, jasn.shape[0] / 2, jasn.shape[1], jasn.shape[0])
    print(f'  spokój tła (odchylenie jasności; całej mapy: {ogolnie:.1f}):')
    for i, (x, y) in enumerate(MISJE):
        x -= MAPA_KADR[0]
        pod = spokoj(jasn, x, y, 18 / skala, 18 / skala)
        tab = spokoj(jasn, x, y + 32 / skala, 60 / skala, 13 / skala)
        ok = pod < ogolnie * 0.75 and tab < ogolnie * 0.9
        print(f'    misja {i + 1}: pod znacznikiem {pod:5.1f}, pod tabliczką {tab:5.1f}  {"OK" if ok else "ZA GĘSTO"}')
        if not ok:
            raise SystemExit(1)

    # ——— woda: turkus rzeki i bagna, pod górami (błękit gór ma tę samą barwę)
    hsv = np.asarray(kadr.convert('HSV'), np.float32)
    h = hsv[..., 0] * 360 / 255
    s = hsv[..., 1] / 255
    v = hsv[..., 2] / 255
    woda = (h > 140) & (h < 215) & (s > 0.28) & (v > 0.18)
    woda &= np.arange(woda.shape[0])[:, None] > 410
    woda = nd.binary_closing(nd.binary_opening(woda, iterations=2), iterations=5)
    lab, n = nd.label(woda)
    rozmiary = nd.sum(woda, lab, range(1, n + 1))
    woda = nd.binary_fill_holes(np.isin(lab, [i + 1 for i, r in enumerate(rozmiary) if r > 2500]))
    maska = Image.fromarray((woda * 255).astype(np.uint8)).filter(ImageFilter.GaussianBlur(4))
    maska = np.asarray(maska.resize((MAPA_W, MAPA_H), Image.LANCZOS), np.float32) / 255
    # Brzeg bez połysku: lśni środek nurtu, nie trawa przy brzegu.
    maska = np.clip((maska - 0.5) / 0.4, 0, 1)
    for nazwa, ziarno in [('woda-a.png', 11), ('woda-b.png', 12)]:
        rng = np.random.default_rng(ziarno)
        szum = np.zeros((MAPA_H, MAPA_W), np.float32)
        for o, k in enumerate((22, 11)):
            gw, gh = int(MAPA_W / k) + 2, int(MAPA_H / k) + 2
            siatka = Image.fromarray((rng.random((gh, gw)) * 255).astype(np.uint8))
            szum += np.asarray(siatka.resize((int(gw * k), int(gh * k)), Image.BICUBIC), np.float32)[:MAPA_H, :MAPA_W] / 255 * 0.5 ** o
        szum = (szum - szum.min()) / (szum.max() - szum.min())
        grzbiety = np.clip((szum - 0.62) / 0.14, 0, 1) * (1 - np.clip((szum - 0.8) / 0.1, 0, 1))
        # Słabo i miękko: malowana woda ma już własne refleksy, połysk ma je
        # tylko poruszyć. Mocniejszy (150, drobny szum) czytał się jak śnieg.
        grzbiety = np.asarray(Image.fromarray((grzbiety * 255).astype(np.uint8)).filter(ImageFilter.GaussianBlur(2)), np.float32) / 255
        alfa = (grzbiety * maska * 80).clip(0, 255).astype(np.uint8)
        im = Image.new('RGBA', (MAPA_W, MAPA_H), (235, 250, 255, 0))
        im.putalpha(Image.fromarray(alfa))
        im.save(CEL / nazwa, optimize=True)
    print('  woda-a.png, woda-b.png')

    json.dump(
        {'droga': [[list(p) for p in gladkaKrzywa([naKadr(q) for q in odcinek])] for odcinek in DROGA]},
        open(CEL / 'mapa.json', 'w'),
        indent=None,
    )
    print('  mapa.json')


# ————————————————————————————————————————————————— zwój

#: Zwój na ekranie: 318 × 560 (`ZWOJ` w KampaniaScene.ts); plik 2×.
#: Szerokość z proporcji papieru: papier to ~79 % szerokości zwoju (resztę
#: zajmują gałki), a tekst misji potrzebuje ~225 px kolumny.
ZWOJ_W, ZWOJ_H = 636, 1120


def zwoj():
    im = Image.open(WSAD / 'kampania-zwoj.png').convert('RGBA')
    if not jestChroma(np.asarray(im)):
        raise SystemExit('kampania-zwoj.png: tło nie jest magentą')
    im = bezChromy(im)
    im = im.crop(im.getbbox())
    a = np.asarray(im)[..., 3]
    h, w = a.shape
    # Wałki: wiersze, w których zwój jest szerszy niż papier w połowie wysokości.
    kol = np.nonzero(a[h // 2] > 128)[0]
    szer = np.array([(np.ptp(np.nonzero(r > 128)[0]) if (r > 128).any() else 0) for r in a])
    walki = np.nonzero(szer > np.ptp(kol) + 20)[0]
    gora = int(walki[walki < h // 2].max()) + 1
    dol = int(walki[walki > h // 2].min())
    pap = np.nonzero((a[gora:dol] > 128).any(axis=0))[0]
    papL, papP = int(pap.min()), int(pap.max())

    # Skala z szerokości, pion: wałki bez zmian, środek papieru rozciągnięty.
    s = ZWOJ_W / w
    gw = round(gora * s)
    dw = round((h - dol) * s)
    srodek = ZWOJ_H - gw - dw
    czesci = [
        im.crop((0, 0, w, gora)).resize((ZWOJ_W, gw), Image.LANCZOS),
        im.crop((0, gora, w, dol)).resize((ZWOJ_W, srodek), Image.LANCZOS),
        im.crop((0, dol, w, h)).resize((ZWOJ_W, dw), Image.LANCZOS),
    ]
    wynik = Image.new('RGBA', (ZWOJ_W, ZWOJ_H), (0, 0, 0, 0))
    y = 0
    for c in czesci:
        wynik.alpha_composite(c, (0, y))
        y += c.height
    # Paleta 256 barw z alfą: pełne RGBA ważyło 1 MB, a papier to kilka
    # odcieni beżu — różnicy nie widać, plik jest kilka razy mniejszy.
    wynik.quantize(256, method=Image.Quantize.FASTOCTREE, dither=Image.Dither.FLOYDSTEINBERG).save(CEL / 'zwoj.png', optimize=True)
    print(f'  zwoj.png  {ZWOJ_W} × {ZWOJ_H}; na ekranie: papier x {papL * s / 2:.0f}–{papP * s / 2:.0f}, '
          f'wałek górny do y {gw / 2:.0f}, dolny od y {(ZWOJ_H - dw) / 2:.0f}')


if __name__ == '__main__':
    CEL.mkdir(parents=True, exist_ok=True)
    print('opowieść:')
    opowiesci()
    print('portrety:')
    portrety()
    print('zwój:')
    zwoj()
    print('mapa:')
    mapa()
