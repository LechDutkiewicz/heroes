#!/usr/bin/env python3
"""Wczytuje malowane stworki z wsadu (`tools/wsad/stworek-<numer>.png`) do gry.

Prompty: `tools/PROMPTY-STWORKI.md`, linie ewolucyjne: `src/data/ewolucje.ts`.
Każdy plik wsadu idzie do `public/sprites/<numer>.png` — tam, skąd sceny
wczytują teksturę `p-<numer>`. Formy bazowe nadpisują stare sprite'y (kopia
starych leży w `tools/wsad/stare-sprites/`, skrypt robi ją sam, jeśli jej
brak), nowe etapy ewolucji dostają nowe numery (`01xxx`, `02xxx`).

Format jak stare sprite'y: kwadrat 128 × 128, przezroczyste tło, sylwetka
przycięta do widocznych pikseli i wpasowana dłuższym bokiem. Różnica: stopy
stoją na DOLE kwadratu (stare były wyśrodkowane w pionie). Bitwa stawia
sprite z originem (0,5; 1) na linii stóp i wpasowuje wysokość PLIKU
(`unitView.ts`, `SPRITE_H`), więc szeroki stworek wyśrodkowany w pionie
wisiał nad ziemią. Mapa przygody mierzy widoczną sylwetkę z alfy
(`podstawaRysunku`), a miasto, bohater i kampania skalują wysokość pliku —
żadnej z nich margines u góry nie przeszkadza.

Co jeszcze robi po drodze:
- zdejmuje białą obwódkę naklejki (`zdejmijBialaObwodke`), jeśli model
  ją dorysował;
- zdejmuje placek piasku pod stopami, jeśli model go dorysował mimo zakazu
  (`zdejmijPlacek`: piaskowy kolor połączony z dołem sylwetki, niski i szeroki);
- odbija w poziomie wszystko poza `W_PRAWO`, żeby wszystkie stworki patrzyły w prawo,
  jak oddziały gracza w bitwie Heroes 3 (model nie trzyma kierunku z promptu);
- zmniejsza z premultiplikowaną alfą (bez jasnych obwódek) i lekko wyostrza —
  w bitwie sprite ma 50 px wysokości, na mapie ~38 px.

    python3 tools/stworki_wczytaj.py              # wszystkie stworek-*.png
    python3 tools/stworki_wczytaj.py 00193 01193  # wybrane numery
    python3 tools/stworki_wczytaj.py --arkusz tools/shots/stworki.png   # + arkusz podglądu
"""

from __future__ import annotations

import argparse
import colorsys
import shutil
import sys
from pathlib import Path

import numpy as np
from PIL import Image, ImageEnhance, ImageFilter

KORZEN = Path(__file__).resolve().parent.parent
WSAD = KORZEN / 'tools' / 'wsad'
STARE = WSAD / 'stare-sprites'
CEL = KORZEN / 'public' / 'sprites'

BOK = 128
#: Margines w pikselach wyniku: przy filtrowaniu liniowym piksel na samej
#: krawędzi tekstury zlewa się z sąsiednim kaflem atlasu.
MARGINES = 2
#: Nasycenie po zmniejszeniu: malowane stworki wychodzą z modelu nieco
#: przygaszone obok jaskrawych budowli mapy.
NASYCENIE = 1.12
KRYCIE_OBWODKI = 0.8

#: Model rysuje stworki prawie zawsze zwrócone w lewo (prompt o to prosi,
#: bo o prawo prosić nie ma sensu — i tak wychodzi lewo), więc odbijamy
#: wszystkie, żeby armia patrzyła w prawo. Wyjątki: pliki, które wyszły
#: zwrócone w prawo — uzupełniane po obejrzeniu wsadu.
W_PRAWO: set[str] = {
    '01020', '02020',  # Flamiron, Flamidor
    '00246', '01246', '02246',  # Glacyn
    '00263', '01263', '02263',  # Cindro
    '00220', '01220', '02220',  # Aquator
    '00058', '01058', '02058',  # Ashko
    '00041',  # Sadzin (dalsze etapy wyszły w lewo)
    '00095', '00096',  # Obsydian, Verdiko
}


def zdejmijPlacek(a: np.ndarray) -> tuple[np.ndarray, int]:
    """Usuwa piaskowy placek pod stopami. Zwraca (obraz, ile pikseli zdjęto).

    Placek to piaskowy/beżowy kolor w dolnej ćwiartce sylwetki, połączony z jej
    najniższym rzędem, szerszy niż wysoki. Ciało stworka tego nie spełnia:
    stopy są wąskie, a piaskowe barwy stworków (płomień, złoto) mają wyższe
    nasycenie niż matowy piasek.
    """
    alfa = a[..., 3]
    ys, xs = np.where(alfa > 12)
    if len(ys) == 0:
        return a, 0
    gora, dol = ys.min(), ys.max()
    lewo, prawo = xs.min(), xs.max()
    wys = dol - gora + 1
    pas = int(dol - wys * 0.25)

    rgb = a[..., :3].astype(np.float32) / 255
    mx = rgb.max(-1)
    mn = rgb.min(-1)
    sat = np.where(mx > 0, (mx - mn) / np.maximum(mx, 1e-6), 0)
    r, g, b = rgb[..., 0], rgb[..., 1], rgb[..., 2]
    # Odcień w stopniach, tylko dla ciepłych barw (r największe).
    hue = np.degrees(np.arctan2(np.sqrt(3) * (g - b), 2 * r - g - b)) % 360
    piasek = (hue >= 22) & (hue <= 55) & (sat >= 0.12) & (sat <= 0.7) & (mx >= 0.5) & (alfa > 0)
    # Półprzezroczysty placek bywa bardziej nasycony albo oliwkowy — ciało
    # stworka jest nieprzezroczyste, więc ten warunek go nie dotyczy.
    piasek |= (hue >= 22) & (hue <= 75) & (sat >= 0.12) & (sat <= 0.88) & (mx >= 0.45) & (alfa > 0) & (alfa < 180)
    piasek[:pas] = False

    # Zalewanie od najniższych rzędów sylwetki po pikselach piasku.
    from collections import deque

    h, w = alfa.shape
    widziany = np.zeros_like(piasek)
    q: deque[tuple[int, int]] = deque()
    for y in range(max(pas, dol - 3), dol + 1):
        for x in np.where(piasek[y])[0]:
            widziany[y, x] = True
            q.append((y, x))
    while q:
        y, x = q.popleft()
        for dy, dx in ((1, 0), (-1, 0), (0, 1), (0, -1)):
            ny, nx = y + dy, x + dx
            if 0 <= ny < h and 0 <= nx < w and not widziany[ny, nx] and piasek[ny, nx]:
                widziany[ny, nx] = True
                q.append((ny, nx))
    ile = int(widziany.sum())
    if ile == 0:
        return a, 0
    wy, wx = np.where(widziany)
    szer, wysP = wx.max() - wx.min() + 1, wy.max() - wy.min() + 1
    if szer < (prawo - lewo + 1) * 0.25 or szer < wysP * 1.5:
        return a, 0
    # Z obwódką 2 px, żeby nie został jasny rąbek placka.
    maska = Image.fromarray((widziany * 255).astype(np.uint8)).filter(ImageFilter.MaxFilter(5))
    m = np.array(maska) > 0
    m[:pas] = False
    # Obwódka tylko po pikselach półprzezroczystych albo piaskowych — nie
    # zjada nieprzezroczystych stóp stojących w placku.
    m &= widziany | (alfa < 200) | piasek
    b2 = a.copy()
    b2[m, 3] = 0
    return b2, ile


def zdejmijBialaObwodke(a: np.ndarray) -> tuple[np.ndarray, int]:
    """Zdejmuje białą obwódkę „naklejki", którą model czasem dorysowuje.

    Obwódka jest rozpoznawana po tym, że przynajmniej 30% brzegu sylwetki
    jest prawie białe; wtedy zdejmujemy jasny pas połączony z brzegiem
    (najwyżej 40 px w obrazku 1024 px). Białe
    fragmenty w środku stworka (oczy, zęby, skrzydła) nie leżą na brzegu,
    więc zostają.
    """
    from scipy import ndimage

    rgb = a[..., :3].astype(np.int16)
    # Obwódka bywa kremowa, nie czysto biała (255, 252, 205).
    bialy = (rgb.max(-1) > 235) & (rgb.min(-1) > 150) & (rgb.mean(-1) > 215)
    pelne = a[..., 3] > 40
    # Najbardziej zewnętrzne 1–2 px to wygładzenie krawędzi w innej barwie —
    # o tym, czy jest obwódka, mówi warstwa trochę głębiej.
    wewn = ndimage.binary_erosion(pelne, iterations=3)
    brzeg = wewn & ~ndimage.binary_erosion(wewn)
    if brzeg.sum() == 0 or bialy[brzeg].mean() < 0.3:
        return a, 0
    # Obwódka to jasny pas połączony z zewnętrzną krawędzią, najwyżej ~40 px
    # szeroki: zalewamy go od brzegu po jasnych pikselach, potem dobieramy
    # jasne okruchy przy nim (obwódka ma od środka poszarpaną ciemną linię).
    pas = pelne & ~ndimage.binary_erosion(pelne, iterations=40)
    zewn = pelne & ~ndimage.binary_erosion(pelne, iterations=4)
    etyk, ile = ndimage.label(bialy & pas)
    dotyka = np.unique(etyk[zewn & (etyk > 0)])
    usun = np.isin(etyk, dotyka[dotyka > 0]) | zewn
    usun |= ndimage.binary_dilation(usun, iterations=3) & (rgb.mean(-1) > 150) & pas
    zdjete = int((usun & pelne).sum())
    pelne &= ~usun
    # Resztki: ciemna linia wewnątrz obwódki i pojedyncze jasne kropki.
    pelne = ndimage.binary_opening(ndimage.binary_erosion(pelne, iterations=3), iterations=3)
    b = a.copy()
    b[~ndimage.binary_dilation(pelne, iterations=1), 3] = 0
    return b, zdjete


def przetworz(sciezka: Path, numer: str) -> tuple[Image.Image, int]:
    a = np.array(Image.open(sciezka).convert('RGBA'))
    a, obwodka = zdejmijBialaObwodke(a)
    if obwodka:
        print(f'    {sciezka.name}: zdjęta biała obwódka ({obwodka} px)')
    a, zdjeto = zdejmijPlacek(a)
    # Resztki: pojedyncze, prawie przezroczyste piksele poza sylwetką.
    a[a[..., 3] < 10, 3] = 0
    if zdjeto:
        # Wysepki po placku (grudki piasku między stopami): wszystko, co nie
        # łączy się z główną sylwetką i jest od niej dużo mniejsze.
        from scipy import ndimage

        etykiety, ile = ndimage.label(a[..., 3] > 40)
        if ile > 1:
            rozmiary = ndimage.sum(np.ones_like(etykiety), etykiety, range(1, ile + 1))
            najwieksza = rozmiary.max()
            for i, r in enumerate(rozmiary, start=1):
                if r < najwieksza * 0.01:
                    a[etykiety == i, 3] = 0
            # Półprzezroczysty pył wokół usuniętych grudek.
            rdzen = ndimage.binary_dilation(a[..., 3] > 40, iterations=3)
            a[~rdzen, 3] = 0
    im = Image.fromarray(a)
    if numer not in W_PRAWO:
        im = im.transpose(Image.FLIP_LEFT_RIGHT)
    ramka = im.getchannel('A').point(lambda v: 255 if v > 12 else 0).getbbox()
    if ramka is None:
        raise SystemExit(f'{sciezka.name}: pusty obrazek')
    im = im.crop(ramka)
    wnetrze = BOK - 2 * MARGINES
    skala = wnetrze / max(im.size)
    nowy = (max(1, round(im.width * skala)), max(1, round(im.height * skala)))
    # Premultiplikowana alfa: bez niej przezroczyste piksele (czarne albo
    # białe w RGB) wlewają się w krawędź sylwetki jako obwódka.
    male = im.convert('RGBa').resize(nowy, Image.LANCZOS).convert('RGBA')
    male = male.filter(ImageFilter.UnsharpMask(radius=0.8, percent=60, threshold=2))
    male = ImageEnhance.Color(male).enhance(NASYCENIE)
    wynik = Image.new('RGBA', (BOK, BOK), (0, 0, 0, 0))
    # Stopy na dole kwadratu, w poziomie środek.
    wynik.alpha_composite(male, ((BOK - male.width) // 2, BOK - MARGINES - male.height))
    return obwiedz(wynik), zdjeto


def obwiedz(im: Image.Image) -> Image.Image:
    """Cienka ciemna obwódka w barwie krawędzi (przyciemnionej), pod sylwetką.

    Budowle i znajdźki mapy mają ciemny kontur, a malowany stworek bez niego
    zlewał się z trawą przy ~40 px. Obwódka ma 1 px w pliku 128 px, czyli
    mniej niż piksel na ekranie — przyciemnia brzeg, nie rysuje kreski.
    """
    a = np.array(im).astype(np.float32)
    alfa = a[..., 3:4] / 255
    # Barwa krawędzi rozlana na zewnątrz: rozmyte premultiplikowane RGB
    # podzielone przez rozmytą alfę.
    pre = Image.fromarray(np.clip(a[..., :3] * alfa, 0, 255).astype(np.uint8))
    al = Image.fromarray((alfa[..., 0] * 255).astype(np.uint8))
    pre_b = np.array(pre.filter(ImageFilter.GaussianBlur(1.5))).astype(np.float32)
    al_b = np.array(al.filter(ImageFilter.GaussianBlur(1.5))).astype(np.float32)[..., None] / 255
    barwa = pre_b / np.maximum(al_b, 1e-3) * 0.3
    zasieg = np.array(al.filter(ImageFilter.MaxFilter(3))).astype(np.float32) / 255
    kontur = np.dstack([np.clip(barwa, 0, 255), zasieg[..., None] * 255 * KRYCIE_OBWODKI]).astype(np.uint8)
    wynik = Image.fromarray(kontur, 'RGBA')
    wynik.alpha_composite(im)
    return wynik


def arkusz(numery: list[str], plik: Path) -> None:
    kol = 9
    wiersze = (len(numery) + kol - 1) // kol
    S = Image.new('RGB', (kol * 140, wiersze * 140), (92, 120, 70))
    for i, n in enumerate(numery):
        im = Image.open(CEL / f'{n}.png').convert('RGBA')
        S.paste(im, ((i % kol) * 140 + 6, (i // kol) * 140 + 6), im)
    plik.parent.mkdir(parents=True, exist_ok=True)
    S.save(plik)
    print(f'arkusz: {plik}')


def main() -> int:
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument('numery', nargs='*')
    ap.add_argument('--arkusz', type=Path, help='zapisz arkusz podglądu przetworzonych sprite\'ów')
    args = ap.parse_args()

    pliki = sorted(WSAD.glob('stworek-*.png'))
    if args.numery:
        pliki = [p for p in pliki if p.stem.removeprefix('stworek-') in args.numery]
    if not pliki:
        print('Brak plików tools/wsad/stworek-*.png — patrz tools/PROMPTY-STWORKI.md', file=sys.stderr)
        return 1
    STARE.mkdir(parents=True, exist_ok=True)
    zrobione = []
    for p in pliki:
        numer = p.stem.removeprefix('stworek-')
        cel = CEL / f'{numer}.png'
        kopia = STARE / f'{numer}.png'
        # Stary sprite (sprzed malowanych stworków) zachowujemy raz — przy
        # powtórnym przebiegu w public/ leży już nasz własny wynik.
        if cel.exists() and not kopia.exists() and not numer.startswith(('01', '02')):
            shutil.copy2(cel, kopia)
        im, zdjeto = przetworz(p, numer)
        im.save(cel, optimize=True)
        zrobione.append(numer)
        uwagi = []
        if zdjeto:
            uwagi.append(f'zdjęty placek {zdjeto} px')
        if numer not in W_PRAWO:
            uwagi.append('odbity')
        print(f'  {p.name} → public/sprites/{numer}.png  {"· ".join(uwagi)}')
    if args.arkusz:
        arkusz(zrobione, args.arkusz)
    return 0


if __name__ == '__main__':
    raise SystemExit(main())
