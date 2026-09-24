#!/usr/bin/env python3
"""Grafiki ekranu kampanii: mapa krainy, zwój i figurki trenerów.

Dlaczego składana, a nie wygenerowana
-------------------------------------
Pierwotny plan był prosty: jeden prompt w `tools/PROMPTY-KAMPANIA.md` i gotowa
ilustracja z modelu. W dniu budowy ekranu API Gemini odpowiadało 402 (konto
bez środków) na każdym modelu, więc zamiast czekać, mapa jest SKŁADANA z tego,
co już przeszło przez oczy krytyków: tekstur terenu z mapy przygody, kęp lasu,
skał i budowli. Ma to jedną zaletę, której ilustracja z modelu by nie miała —
kraina jest narysowana tą samą kreską, którą dziecko ogląda potem przez całą
misję: fort z misji 1 wygląda na mapie kampanii tak samo jak w mieście.

Prompt zostaje w dokumencie. Gdy konto znów zadziała, wystarczy wygenerować
`kampania-mapa.png` i podmienić plik — scena nie wie, skąd obraz pochodzi.
To samo dotyczy zwoju (malowany tu numerycznie) i portretów trenerów (tu:
figurki z wsadu mapy przygody, te same, którymi bohater chodzi po planszy).

Jedno źródło położenia misji
----------------------------
Punkty misji czytamy z `src/data/kampania.ts` (pola `naMapie`), a nie
przepisujemy tutaj. Budowla misji stoi dokładnie za jej znacznikiem, a droga
przechodzi przez znaczniki — gdyby liczby żyły w dwóch miejscach, pierwsze
przesunięcie znacznika zostawiłoby fort w szczerym polu. Z tego samego powodu
przebieg drogi (punkty pośrednie) zapisujemy do `public/kampania/mapa.json`:
scena rysuje po nim swoją ścieżkę kroków, więc kropki leżą NA namalowanej
drodze, a nie obok niej.

Co wychodzi
-----------
    public/kampania/mapa.jpg      ilustracja 1232 × 924 (2× tego, co na ekranie)
    public/kampania/woda-a.png    połysk wody, faza A (sama woda, reszta przezroczysta)
    public/kampania/woda-b.png    połysk wody, faza B — scena przenika A i B,
                                  co daje lśnienie bez shadera
    public/kampania/mapa.json     droga między misjami w ułamkach 0–1
    public/kampania/zwoj.png      pusty zwój pergaminu pod opis misji (2×)
    public/kampania/janek.png     figurki trenerów na ekran wyboru
    public/kampania/ola.png

    python3 tools/kampania_grafiki.py
"""

import json
import math
import random
import re
from pathlib import Path

import numpy as np
from PIL import Image, ImageDraw, ImageFilter

KORZEN = Path(__file__).resolve().parent.parent
WSAD = KORZEN / 'tools' / 'wsad'
MAPA = KORZEN / 'public' / 'mapa'
MIASTO = KORZEN / 'public' / 'miasto'
CEL = KORZEN / 'public' / 'kampania'

W, H = 1232, 924
LOS = random.Random(7)
np.random.seed(7)


# ————————————————————————————————————————————————— punkty misji

def punktyMisji() -> list[tuple[float, float]]:
    zrodlo = (KORZEN / 'src' / 'data' / 'kampania.ts').read_text(encoding='utf-8')
    pary = re.findall(r'naMapie:\s*\{\s*x:\s*([\d.]+),\s*y:\s*([\d.]+)\s*\}', zrodlo)
    if len(pary) != 4:
        raise SystemExit(f'Oczekiwałem 4 misji w kampania.ts, jest {len(pary)}')
    return [(float(x), float(y)) for x, y in pary]


M = punktyMisji()


def px(p: tuple[float, float]) -> tuple[float, float]:
    return p[0] * W, p[1] * H


# ————————————————————————————————————————————————— szum i maski

def szum(skala: float, oktawy: int = 4, ziarno: int = 0) -> np.ndarray:
    """Szum fraktalny 0–1: kilka siatek losowych liczb powiększonych dwusześciennie."""
    rng = np.random.default_rng(ziarno)
    wynik = np.zeros((H, W), np.float32)
    waga = 0.0
    for o in range(oktawy):
        k = skala / (2 ** o)
        gw, gh = max(2, int(W / k) + 2), max(2, int(H / k) + 2)
        siatka = (rng.random((gh, gw)) * 255).astype(np.uint8)
        duza = Image.fromarray(siatka).resize((int(gw * k), int(gh * k)), Image.BICUBIC)
        a = np.asarray(duza, np.float32)[:H, :W] / 255
        w = 0.5 ** o
        wynik += a * w
        waga += w
    wynik /= waga
    return (wynik - wynik.min()) / (wynik.max() - wynik.min() + 1e-6)


YY, XX = np.mgrid[0:H, 0:W].astype(np.float32)
SZUM_BRZEGU = szum(90, 4, 1)
#: Drobniejszy szum na małe plamy (oczka bagna) — przy szumie brzegu krain
#: jedna jego fala jest większa od całego oczka i oczko zostaje elipsą.
SZUM_DROBNY = szum(22, 3, 2)


def gladko(a: np.ndarray, lo: float, hi: float) -> np.ndarray:
    t = np.clip((a - lo) / (hi - lo), 0, 1)
    return t * t * (3 - 2 * t)


def elipsa(cx, cy, rx, ry, poszarp=0.35, miekkosc=0.12, obrot=0.0, sz=None) -> np.ndarray:
    """Maska plamy krainy: elipsa z brzegiem poszarpanym szumem.

    Brzeg bez szumu jest geometryczną elipsą i od razu zdradza, że krainę
    ktoś wyrysował cyrklem. Szum przesuwa brzeg o ±`poszarp` promienia."""
    cx, cy, rx, ry = cx * W, cy * H, rx * W, ry * H
    dx, dy = XX - cx, YY - cy
    if obrot:
        c, s = math.cos(obrot), math.sin(obrot)
        dx, dy = dx * c + dy * s, -dx * s + dy * c
    d = np.sqrt((dx / rx) ** 2 + (dy / ry) ** 2)
    d = d + ((SZUM_BRZEGU if sz is None else sz) - 0.5) * 2 * poszarp
    return 1 - gladko(d, 1 - miekkosc, 1 + miekkosc)


def linia(punkty, grubosc: float, rozmycie: float, poszarp: float = 0.0) -> np.ndarray:
    """Maska pasa wzdłuż łamanej (rzeka, droga) — rysowana i rozmywana."""
    im = Image.new('L', (W, H), 0)
    d = ImageDraw.Draw(im)
    pts = [(x * W, y * H) for x, y in punkty]
    d.line(pts, fill=255, width=int(grubosc), joint='curve')
    for x, y in pts:
        d.ellipse([x - grubosc / 2, y - grubosc / 2, x + grubosc / 2, y + grubosc / 2], fill=255)
    if rozmycie:
        im = im.filter(ImageFilter.GaussianBlur(rozmycie))
    a = np.asarray(im, np.float32) / 255
    if poszarp:
        a = gladko(a + (SZUM_BRZEGU - 0.5) * poszarp, 0.35, 0.65)
    return a


def gladkaKrzywa(punkty, gestosc=18):
    """Catmull-Rom przez punkty — rzeka i droga nie mogą mieć kolan."""
    p = [punkty[0]] + list(punkty) + [punkty[-1]]
    wynik = []
    for i in range(1, len(p) - 2):
        p0, p1, p2, p3 = p[i - 1], p[i], p[i + 1], p[i + 2]
        for k in range(gestosc):
            t = k / gestosc
            t2, t3 = t * t, t * t * t
            wynik.append(tuple(
                0.5 * (2 * p1[j] + (-p0[j] + p2[j]) * t + (2 * p0[j] - 5 * p1[j] + 4 * p2[j] - p3[j]) * t2
                       + (-p0[j] + 3 * p1[j] - 3 * p2[j] + p3[j]) * t3)
                for j in range(2)
            ))
    wynik.append(punkty[-1])
    return wynik


# ————————————————————————————————————————————————— tekstury

def kafel(nazwa: str, skala: float, barwa=None) -> np.ndarray:
    t = Image.open(MAPA / 'teren' / f'{nazwa}.png').convert('RGB')
    b = max(8, int(t.width * skala))
    t = t.resize((b, b), Image.LANCZOS)
    pelny = Image.new('RGB', (W, H))
    for y in range(0, H, b):
        for x in range(0, W, b):
            pelny.paste(t, (x, y))
    a = np.asarray(pelny, np.float32)
    if barwa is not None:
        a = a * np.array(barwa, np.float32)
    return a


def naloz(baza: np.ndarray, warstwa: np.ndarray, maska: np.ndarray, moc: float = 1.0):
    m = (maska * moc)[..., None]
    baza[:] = baza * (1 - m) + warstwa * m


# ————————————————————————————————————————————————— geografia
#
# Kolejność misji ma być widać w krajobrazie: z jasnej polany na południowym
# zachodzie (dom), przez góry w środku, bagna na południowym wschodzie, do
# ciemnych wyżyn na północnym wschodzie. Krainy są opisane względem punktów
# misji, więc przesunięcie znacznika w kampania.ts przesuwa z nim jego krainę.

(m1x, m1y), (m2x, m2y), (m3x, m3y), (m4x, m4y) = M

# Droga: przez każdą misję, z punktami pośrednimi. Każdy odcinek WCHODZI do
# znacznika z boku albo z góry i z boku z niego wychodzi — nigdy od dołu, bo
# pod znacznikiem wisi wstążka z nazwą misji i zasłaniała drogę (pierwsza
# wersja: bieżący odcinek chował się w całości pod napisem „Klucze do
# przełęczy"). Przełęcz między polaną a dolinami przecina grzbiet.
DROGA = [
    [M[0], (m1x + 0.07, m1y - 0.1), (m1x + 0.12, m2y + 0.06), (m2x - 0.075, m2y + 0.005), M[1]],
    [M[1], (m2x + 0.08, m2y - 0.005), (m2x + 0.15, m2y + 0.07), (m3x - 0.065, m3y - 0.035), M[2]],
    [M[2], (m3x + 0.09, m3y - 0.12), (m4x - 0.09, (m3y + m4y) / 2), (m4x - 0.075, m4y + 0.01), M[3]],
]

# Rzeka: z gór na północ od doliny, między polaną a bagnami, do jeziora.
JEZIORO = ((m1x + m3x) / 2 + 0.02, 0.87, 0.085, 0.07)
RZEKA = [(m2x + 0.1, -0.02), (m2x + 0.14, m2y - 0.3), (m2x + 0.1, m2y - 0.17), (m2x + 0.15, m2y - 0.05),
         (m2x + 0.13, m2y + 0.08), (m2x + 0.07, m2y + 0.18), (JEZIORO[0] + 0.01, JEZIORO[1] - 0.05)]
UJSCIE = [(JEZIORO[0] + 0.02, JEZIORO[1]), (JEZIORO[0] + 0.06, 1.02)]


def maski():
    k = {}
    k['las'] = np.maximum.reduce([
        elipsa(0.1, 0.3, 0.2, 0.33, 0.4),
        elipsa(0.28, 0.04, 0.2, 0.1, 0.4),
        elipsa(0.02, 0.62, 0.06, 0.12, 0.4),
        elipsa(m3x + 0.02, m3y + 0.26, 0.1, 0.06, 0.4),
    ])
    k['gory'] = np.maximum.reduce([
        elipsa(m2x + 0.02, m2y - 0.26, 0.15, 0.12, 0.3),
        elipsa(m2x - 0.14, m2y + 0.1, 0.1, 0.06, 0.3, obrot=-0.4),
        elipsa(m2x + 0.22, m2y - 0.04, 0.06, 0.13, 0.3),
    ])
    k['snieg'] = elipsa(m2x + 0.02, m2y - 0.31, 0.08, 0.05, 0.4) * k['gory']
    k['laka'] = elipsa(m1x, m1y + 0.02, 0.26, 0.22, 0.3)
    k['bagno'] = elipsa(m3x + 0.04, m3y + 0.07, 0.2, 0.19, 0.35, miekkosc=0.3)
    # Oczka wody na bagnie: bez nich bagno to tylko ciemniejsza trawa.
    k['oczka'] = np.maximum.reduce([
        elipsa(m3x + dx, m3y + dy, rx, rx * 0.7, 0.45, 0.15, sz=SZUM_DROBNY)
        for dx, dy, rx in [(-0.06, 0.1, 0.035), (0.07, 0.05, 0.03), (0.12, 0.16, 0.04),
                           (0.0, 0.2, 0.03), (-0.1, 0.18, 0.025), (0.17, 0.02, 0.022)]
    ]) * gladko(k['bagno'], 0.4, 0.8)
    k['wyzyna'] = elipsa(m4x + 0.04, m4y - 0.06, 0.26, 0.3, 0.3, miekkosc=0.35)
    k['woda'] = np.maximum(
        np.maximum(linia(gladkaKrzywa(RZEKA), 15, 2.5, 0.25), linia(UJSCIE, 22, 3, 0.25)),
        elipsa(*JEZIORO, poszarp=0.2, miekkosc=0.06, sz=SZUM_DROBNY * 0.5 + SZUM_BRZEGU * 0.5),
    )
    k['brzeg'] = np.clip(
        np.asarray(Image.fromarray((k['woda'] * 255).astype(np.uint8)).filter(ImageFilter.GaussianBlur(9)),
                   np.float32) / 255 * 2.2, 0, 1)
    k['droga'] = np.maximum.reduce([linia(gladkaKrzywa(s), 11, 2.2, 0.2) for s in DROGA])
    return k


# ————————————————————————————————————————————————— obiekty

def sprite(sciezka: Path, wys: float, barwa=None, snieg=0.0) -> Image.Image:
    im = Image.open(sciezka).convert('RGBA')
    bbox = im.getbbox()
    if bbox:
        im = im.crop(bbox)
    s = wys / im.height
    im = im.resize((max(1, int(im.width * s)), max(1, int(wys))), Image.LANCZOS)
    if barwa is not None or snieg:
        a = np.asarray(im, np.float32)
        if barwa is not None:
            a[..., :3] *= np.array(barwa, np.float32)
        if snieg:
            # Czapa śniegu: górna część skały bieleje, im wyżej, tym mocniej.
            h = a.shape[0]
            t = np.clip(1 - np.arange(h) / (h * snieg), 0, 1)[:, None, None] ** 0.7
            jasn = a[..., :3].mean(axis=2, keepdims=True)
            bialy = np.clip(jasn * 0.35 + 190, 0, 255)
            a[..., :3] = a[..., :3] * (1 - t * 0.85) + bialy * t * 0.85
        im = Image.fromarray(a.clip(0, 255).astype(np.uint8), 'RGBA')
    return im


class Scena:
    """Obiekty zbierane, a malowane na końcu, posortowane po podstawie —
    bliższe (niżej na mapie) zasłaniają dalsze, jak na planszy przygody."""

    def __init__(self):
        self.obiekty: list[tuple[float, float, float, Image.Image, float]] = []

    def dodaj(self, im: Image.Image, x: float, y: float, cien: float = 1.0):
        self.obiekty.append((y, x, y, im, cien))

    def maluj(self, tlo: Image.Image):
        cienie = Image.new('L', (W, H), 0)
        dc = ImageDraw.Draw(cienie)
        for _, x, y, im, cien in self.obiekty:
            if cien <= 0:
                continue
            rx, ry = im.width * 0.42, max(3, im.width * 0.12)
            # Cień w lewo-dół: słońce stoi po prawej u góry, jak w całej grze.
            dc.ellipse([x - rx - im.width * 0.08, y - ry * 0.6, x + rx - im.width * 0.08, y + ry * 1.2],
                       fill=int(120 * cien))
        cienie = cienie.filter(ImageFilter.GaussianBlur(4))
        ciemno = Image.new('RGB', (W, H), (20, 40, 30))
        tlo.paste(Image.composite(ciemno, tlo, cienie.point(lambda v: v * 0.55)), (0, 0))
        for _, x, y, im, _ in sorted(self.obiekty, key=lambda o: o[0]):
            tlo.alpha_composite(im, (int(x - im.width / 2), int(y - im.height + im.height * 0.06)))


def rozsiej(maska: np.ndarray, gestosc: float, odstep: float, zakazane: np.ndarray, ile_max=4000):
    """Punkty losowe w masce, nie bliżej niż `odstep` — las nie może stać w rzędzie
    ani w kupie. Prawdopodobieństwo rośnie z mocą maski, więc brzeg krainy
    rzednie sam, bez ręcznego rysowania przejścia."""
    pkt: list[tuple[float, float]] = []
    siatka: dict[tuple[int, int], list[tuple[float, float]]] = {}
    kom = odstep
    proby = int(W * H * gestosc / 1000)
    for _ in range(proby):
        x, y = LOS.random() * W, LOS.random() * H
        ix, iy = int(x), int(y)
        if maska[iy, ix] < LOS.random() * 0.9 + 0.1 or zakazane[iy, ix] > 0.2:
            continue
        cx, cy = int(x / kom), int(y / kom)
        blisko = False
        for gx in range(cx - 1, cx + 2):
            for gy in range(cy - 1, cy + 2):
                for qx, qy in siatka.get((gx, gy), []):
                    if (qx - x) ** 2 + (qy - y) ** 2 < odstep * odstep:
                        blisko = True
                        break
        if blisko:
            continue
        pkt.append((x, y))
        siatka.setdefault((cx, cy), []).append((x, y))
        if len(pkt) >= ile_max:
            break
    return pkt


def main():
    CEL.mkdir(parents=True, exist_ok=True)
    k = maski()

    # ——— grunt
    baza = kafel('teren-trawa-2', 0.36)
    naloz(baza, kafel('teren-trawa-3', 0.36, (1.06, 1.04, 0.92)), k['laka'])
    naloz(baza, kafel('teren-las', 0.3), k['las'])
    naloz(baza, kafel('teren-skaly', 0.26), gladko(k['gory'], 0.1, 0.6))
    naloz(baza, kafel('teren-snieg', 0.3), gladko(k['snieg'], 0.3, 0.7))
    naloz(baza, kafel('teren-bagno-2', 0.34, (1.05, 1.18, 1.08)), k['bagno'])
    oczko = kafel('teren-woda', 0.3, (0.42, 0.62, 0.5))
    naloz(baza, oczko, gladko(k['oczka'], 0.3, 0.6))
    naloz(baza, kafel('teren-jalowa-2', 0.3, (0.82, 0.8, 0.95)), gladko(k['wyzyna'], 0.1, 0.7))
    naloz(baza, kafel('teren-skaly-3', 0.26, (0.8, 0.78, 0.95)), gladko(k['wyzyna'] * k['gory'], 0.1, 0.5))
    naloz(baza, kafel('teren-piasek', 0.3), k['brzeg'] * (1 - k['las']) * 0.9)
    naloz(baza, kafel('teren-sciezka', 0.24), k['droga'] * (1 - k['woda']) * 0.95)
    # Woda: tekstura przyciemniona w głębi i jaśniejsza przy brzegu.
    woda = kafel('teren-woda', 0.3)
    glebia = np.asarray(Image.fromarray((k['woda'] * 255).astype(np.uint8)).filter(ImageFilter.GaussianBlur(10)),
                        np.float32)[..., None] / 255
    woda = woda * (1.08 - glebia * 0.35)
    naloz(baza, woda, k['woda'])

    tlo = Image.fromarray(baza.clip(0, 255).astype(np.uint8)).convert('RGBA')

    # ——— obiekty
    sc = Scena()
    wolne = np.zeros((H, W), np.float32)
    # Wokół znaczników misji i na drodze nic nie rośnie: tam stoją budowle
    # misji i ścieżka kroków, obie muszą być widoczne.
    for p in M:
        wolne = np.maximum(wolne, elipsa(p[0], p[1] - 0.02, 0.06, 0.07, 0.1, 0.2))
    wolne = np.maximum(wolne, k['droga'] * 1.5)
    wolne = np.maximum(wolne, k['brzeg'])

    kepy_lasu = [MAPA / f'kepa-las-{i}.png' for i in range(1, 5)]
    drzewa = [MAPA / n for n in ['drzewo.png', 'drzewo-b.png', 'sosna.png', 'sosna-b.png', 'sosna-mala.png']]
    kepy_skal = [MAPA / f'kepa-skaly-{i}.png' for i in range(1, 5)]

    # Brzeg lasu: pojedyncze drzewa i kępy na obrzeżu korony — sama tekstura
    # korony widziana z góry czyta się jak dywan, dopiero drzewa w rzucie
    # z boku na jej skraju mówią „to jest las".
    brzeg_lasu = gladko(k['las'], 0.05, 0.5) * (1 - gladko(k['las'], 0.75, 0.95))
    for x, y in rozsiej(brzeg_lasu, 2.2, 24, wolne):
        sc.dodaj(sprite(LOS.choice(drzewa), LOS.uniform(46, 64)), x, y)
    for x, y in rozsiej(k['las'] * 0.5, 0.4, 70, wolne):
        sc.dodaj(sprite(LOS.choice(kepy_lasu), LOS.uniform(70, 90)), x, y)
    # Kępy drzew na łące i w dolinach — pojedynczo, rzadko.
    laka = (1 - k['las']) * (1 - k['gory']) * (1 - k['bagno']) * (1 - k['wyzyna']) * (1 - k['woda'])
    for x, y in rozsiej(laka, 0.5, 60, wolne):
        sc.dodaj(sprite(LOS.choice(drzewa + kepy_lasu[:2]), LOS.uniform(40, 60)), x, y)
    for x, y in rozsiej(laka, 0.25, 50, wolne):
        sc.dodaj(sprite(MAPA / LOS.choice(['krzak.png', 'krzak-2.png', 'kopiec.png']), LOS.uniform(18, 26)), x, y, 0.6)

    # Góry: skały gęsto, największe w środku masywu; na szczytach śnieg.
    for x, y in rozsiej(gladko(k['gory'], 0.2, 0.7), 1.6, 34, wolne * 0.6):
        rdzen = k['gory'][int(y), int(x)]
        sniezne = k['snieg'][int(y), int(x)] > 0.3
        if LOS.random() < 0.55:
            im = sprite(MAPA / LOS.choice(['skala-ostra.png', 'skala-ostra.png', 'skala.png', 'skala-2.png']),
                        LOS.uniform(46, 74) * (0.7 + 0.5 * rdzen),
                        barwa=(0.95, 0.95, 1.02), snieg=0.55 if sniezne else 0.0)
        else:
            im = sprite(LOS.choice(kepy_skal), LOS.uniform(60, 90) * (0.7 + 0.4 * rdzen),
                        snieg=0.45 if sniezne else 0.0)
        sc.dodaj(im, x, y)

    # Bagno: krzywe, przygaszone drzewa i kępy trzciny (krzaki w zieleni bagna).
    for x, y in rozsiej(k['bagno'] * (1 - k['oczka']), 0.7, 44, np.maximum(wolne, k['oczka'])):
        n = LOS.choice(['drzewo-b.png', 'krzak-2.png', 'krzak.png', 'kopiec-2.png'])
        wys = 46 if 'drzewo' in n else 20
        sc.dodaj(sprite(MAPA / n, LOS.uniform(0.8, 1.1) * wys, barwa=(0.78, 0.9, 0.84)), x, y, 0.7)

    # Wyżyna: ostre, fioletowo przygaszone skały i sosny — kraina wroga.
    for x, y in rozsiej(k['wyzyna'] * (1 - k['gory'] * 0.5), 0.9, 42, wolne):
        if LOS.random() < 0.55:
            im = sprite(MAPA / LOS.choice(['skala-ostra.png', 'skala-zwal.png', 'skala.png']),
                        LOS.uniform(40, 66), barwa=(0.78, 0.74, 0.95))
        else:
            im = sprite(MAPA / LOS.choice(['sosna.png', 'sosna-b.png']), LOS.uniform(48, 66),
                        barwa=(0.62, 0.66, 0.9))
        sc.dodaj(im, x, y)

    # ——— budowle misji: każda stoi tuż za swoim znacznikiem.
    def budowla(nazwa: Path, p, wys: float, dx=0.0, dy=-0.035, barwa=None):
        x, y = px(p)
        sc.dodaj(sprite(nazwa, wys, barwa), x + dx * W, y + dy * H, 1.2)

    budowla(MIASTO / 'bor-fort.png', M[0], 92, dx=0.012)
    budowla(MAPA / 'kopalnia-kamien.png', M[1], 88, dx=0.01)
    budowla(MAPA / 'osrodek-ewolucji.png', M[2], 90, dx=0.005, barwa=(0.95, 1.0, 1.02))
    # Twierdze wroga rozjaśnione: fiolet na fioletowej wyżynie ginął, a to
    # jest cel całej kampanii — ma być widać go od pierwszego wejścia.
    budowla(MIASTO / 'grota-fort.png', M[3], 96, dx=-0.045, dy=-0.03, barwa=(1.25, 1.2, 1.3))
    budowla(MIASTO / 'grota-ratusz3.png', M[3], 118, dx=0.05, dy=-0.06, barwa=(1.25, 1.2, 1.3))

    # ——— budowle krajobrazu: dom trenera i kilka miejsc, które dziecko zna z gry.
    sc.dodaj(sprite(MIASTO / 'bor-ratusz3.png', 118), 0.075 * W, 0.93 * H, 1.2)
    sc.dodaj(sprite(MAPA / 'wiatrak.png', 62), (m1x + 0.13) * W, (m1y + 0.13) * H)
    sc.dodaj(sprite(MAPA / 'ranczo.png', 52), (m1x - 0.1) * W, (m1y - 0.06) * H)
    sc.dodaj(sprite(MAPA / 'straznica.png', 58), (m2x - 0.11) * W, (m2y + 0.13) * H)
    sc.dodaj(sprite(MAPA / 'namiot-klucznika.png', 40), (m2x - 0.08) * W, (m2y - 0.06) * H)
    sc.dodaj(sprite(MAPA / 'chatka.png', 40, (0.8, 0.9, 0.85)), (m3x + 0.13) * W, (m3y + 0.1) * H)
    sc.dodaj(sprite(MAPA / 'portal.png', 58, (0.85, 0.85, 1.0)), (m4x - 0.13) * W, (m4y - 0.12) * H)
    sc.dodaj(sprite(MAPA / 'drzewo-wiedzy.png', 78), 0.2 * W, 0.2 * H)
    sc.dodaj(sprite(MAPA / 'zrodlo.png', 38), 0.08 * W, 0.12 * H)
    sc.dodaj(sprite(MAPA / 'woz.png', 34), (m1x + 0.09) * W, (m1y - 0.16) * H)
    sc.maluj(tlo)

    # ——— światło: ciepłe na południowym zachodzie, zmierzch na północnym wschodzie.
    a = np.asarray(tlo, np.float32)
    rgb = a[..., :3]
    t = np.clip((XX / W - YY / H + 0.1) / 1.2 + 0.25, 0, 1)[..., None]  # 0 = SW, 1 = NE
    cieplo = np.array([1.08, 1.03, 0.88], np.float32)
    zmierzch = np.array([0.72, 0.68, 0.98], np.float32)
    mnoz = cieplo * (1 - t) + zmierzch * t
    rgb = rgb * (1 - 0.55 * t * 0 - 0) * mnoz
    # Fioletowa mgiełka nad krainą wroga.
    mgla = gladko(k['wyzyna'], 0.2, 0.9)[..., None] * 0.18
    rgb = rgb * (1 - mgla) + np.array([120, 100, 190], np.float32) * mgla
    # Opary nad bagnem: jasne, zielonkawe smugi z szumu.
    opary = (gladko(szum(60, 3, 5), 0.5, 0.85) * gladko(k['bagno'], 0.2, 0.8))[..., None] * 0.3
    rgb = rgb * (1 - opary) + np.array([200, 235, 215], np.float32) * opary
    # Winieta: brzegi mapy ciemnieją jak na starym płótnie.
    r = np.sqrt(((XX - W / 2) / (W * 0.62)) ** 2 + ((YY - H / 2) / (H * 0.62)) ** 2)
    win = gladko(r, 0.62, 1.12)[..., None] * 0.42
    rgb = rgb * (1 - win) + np.array([40, 30, 20], np.float32) * win
    tlo = Image.fromarray(rgb.clip(0, 255).astype(np.uint8))
    tlo.save(CEL / 'mapa.jpg', quality=88, optimize=True)

    # ——— połysk wody w dwóch fazach
    for nazwa, ziarno in [('woda-a.png', 11), ('woda-b.png', 12)]:
        n = szum(14, 3, ziarno)
        grzbiety = gladko(n, 0.62, 0.8) * (1 - gladko(n, 0.8, 0.9))
        alfa = (grzbiety * gladko(k['woda'], 0.5, 0.9) * 200).clip(0, 255).astype(np.uint8)
        im = Image.new('RGBA', (W, H), (235, 250, 255, 0))
        im.putalpha(Image.fromarray(alfa))
        im.save(CEL / nazwa, optimize=True)

    json.dump(
        {'droga': [[[round(x, 4), round(y, 4)] for x, y in gladkaKrzywa(s, 10)] for s in DROGA],
         'woda': [[round(x, 4), round(y, 4)] for x, y in gladkaKrzywa(RZEKA, 6)] + [list(JEZIORO[:2])]},
        open(CEL / 'mapa.json', 'w'), indent=None,
    )
    print(f'zapisano: {CEL}/mapa.jpg, woda-a.png, woda-b.png, mapa.json')
    zwoj()
    figurki()


# ————————————————————————————————————————————————— zwój

#: Wymiary zwoju na ekranie; plik ma dwukrotność, jak mapa.
ZWOJ_W, ZWOJ_H = 308, 556


def zwoj():
    """Pusty pergamin z dwoma wałkami — pod opis misji.

    Dlaczego pergamin, a nie mleczny panel z bitwy: opis misji leży obok
    malowanej mapy i czyta się go jak list od strażnika. W Heroes 2 ten tekst
    też jest na papierze. Panel z interfejsu bitwy przy mapie wyglądał jak
    okienko systemowe przyklejone do obrazu.
    """
    w, h = ZWOJ_W * 2, ZWOJ_H * 2
    walek = 54  # wysokość wałka (2×)
    gora, dol = walek // 2 + 6, h - walek // 2 - 6
    yy, xx = np.mgrid[0:h, 0:w].astype(np.float32)

    # Papier: plamy o dużej skali, włókna o małej, ciemniejące brzegi.
    rng = np.random.default_rng(3)

    def sz(skala, okt):
        wynik = np.zeros((h, w), np.float32)
        for o in range(okt):
            k = skala / 2 ** o
            gw, gh = int(w / k) + 3, int(h / k) + 3
            siatka = Image.fromarray((rng.random((gh, gw)) * 255).astype(np.uint8))
            wynik += np.asarray(siatka.resize((int(gw * k), int(gh * k)), Image.BICUBIC), np.float32)[:h, :w] / 255 * 0.5 ** o
        return (wynik - wynik.min()) / (wynik.max() - wynik.min())

    plamy = sz(120, 4)
    wlokna = sz(6, 2)
    # Brzeg boczny lekko falisty — prosta krawędź czyta się jak kartka z drukarki.
    fala = (sz(60, 2)[:, 0] - 0.5) * 10
    odl_bok = np.minimum(xx - 30 - fala[:, None], w - 30 - xx + fala[:, None])
    odl_pion = np.minimum(yy - gora, dol - yy)
    odl = np.minimum(odl_bok, odl_pion + 20)
    papier = np.array([244, 229, 192], np.float32)
    rgb = np.ones((h, w, 3), np.float32) * papier
    rgb *= (0.93 + plamy[..., None] * 0.1)
    rgb *= (0.985 + wlokna[..., None] * 0.03)
    brzeg = (1 - np.clip(odl / 46, 0, 1)) ** 1.6
    rgb = rgb * (1 - brzeg[..., None] * 0.45) + np.array([150, 95, 45], np.float32) * brzeg[..., None] * 0.45
    alfa = np.clip(odl_bok + 1, 0, 1) * ((yy > gora - 4) & (yy < dol + 4))

    # Cień wałków na papierze.
    for y0, kier in [(gora, 1), (dol, -1)]:
        d = (yy - y0) * kier
        cien = np.exp(-np.clip(d, 0, None) / 16) * (d > -2) * 0.32
        rgb *= (1 - cien[..., None])

    im = Image.fromarray(np.dstack([rgb.clip(0, 255), alfa * 255]).astype(np.uint8), 'RGBA')

    # Wałki: walec z gradientem góra-dół i złote gałki na końcach.
    def rysujWalek(cy):
        wal = np.zeros((walek, w + 0, 4), np.float32)
        t = np.linspace(-1, 1, walek)[:, None]
        jasn = (1 - t ** 2) ** 0.5 * 0.55 + 0.45 + np.clip(-t, 0, 1) * 0.2 * (np.abs(t + 0.5) < 0.2)
        baza = np.array([226, 204, 160], np.float32)
        wal[..., :3] = baza * jasn[..., None] * np.ones((1, w, 1))
        # Rulon papieru: kilka słojów widocznych na grzbiecie.
        for k in range(3):
            wal[int(walek * (0.3 + k * 0.18)), :, :3] *= 0.86
        wal[..., 3] = 255
        x0, x1 = 26, w - 26
        wal[:, :x0, 3] = 0
        wal[:, x1:, 3] = 0
        wim = Image.fromarray(wal.clip(0, 255).astype(np.uint8), 'RGBA')
        # Końce rulonu ciemniejsze (spirala papieru).
        d = ImageDraw.Draw(wim)
        for x in (x0, x1):
            d.ellipse([x - 8, 2, x + 8, walek - 2], fill=(170, 128, 76, 255))
            d.ellipse([x - 4, walek * 0.3, x + 4, walek * 0.7], fill=(120, 80, 40, 255))
        im.alpha_composite(wim, (0, int(cy - walek / 2)))
        # Gałki: złote, z połyskiem od góry.
        d = ImageDraw.Draw(im)
        for x in (14, w - 14):
            for r, barwa in [(14, (110, 70, 20, 255)), (12, (200, 140, 40, 255)), (9, (240, 190, 70, 255)),
                             (4, (255, 236, 170, 255))]:
                oy = -3 if r == 4 else (-1 if r == 9 else 0)
                ox = -2 if r == 4 else 0
                d.ellipse([x - r + ox, cy - r + oy, x + r + ox, cy + r + oy], fill=barwa)

    rysujWalek(gora - 2)
    rysujWalek(dol + 2)
    im.save(CEL / 'zwoj.png', optimize=True)
    print(f'zapisano: {CEL}/zwoj.png')


# ————————————————————————————————————————————————— figurki trenerów

def figurki():
    """Figurki trenerów, złoczyńców i ikony nagród — patrz `tools/kampania_postacie.py`.

    Były tu pixel-artowe figurki (runda 2); krytyk nazwał je „zastępstwami
    z innej gry" na malowanych tłach, więc postacie są teraz malowane i mają
    własny skrypt.
    """
    import kampania_postacie

    kampania_postacie.main()


if __name__ == '__main__':
    main()
