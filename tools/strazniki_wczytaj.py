#!/usr/bin/env python3
"""Wczytuje malowanych strażników mapy (`tools/wsad/straznik-<numer>.png`) do gry.

Prompty: `tools/PROMPTY-STWORKI.md`, sekcja „Strażnicy na mapie przygody".
Każdy plik idzie do `public/sprites/mapa-<numer>.png` — osobno od sprite'a
bitwy `<numer>.png`, bo to inny rysunek: jedna figura stworka z pozą (runda 6;
w rundzie 5 grupka 2–3 osobników) w rzucie 3/4 z góry, malowana jak budowle
plansz. Na koniec skrypt przepisuje
`src/data/strazniki-mapa.ts` — listę numerów, które mają wersję mapową;
scena mapy wczytuje tylko je (brak pliku = 404 w konsoli), reszta zostaje
przy sprite'ach bitwy.

Po drodze:
- zdejmuje białą obwódkę naklejki (`zdejmijBialaObwodke` ze
  `stworki_wczytaj.py`), jeśli model ją dorysował;
- zdejmuje jasny placek „ziemi" pod grupą (`zdejmijPodloze`): gpt-image-1.5
  dorysowuje go mimo zakazu — jasnoszary albo beżowy, mało nasycony,
  połączony z dołem sylwetki. Cień kontaktowy i podstawkę rysuje scena;
- przycina do widocznej sylwetki i wpasowuje w kwadrat `BOK` ze stopami na
  dole (jak sprite'y bitwy — mapa mierzy widoczną sylwetkę z alfy, więc
  margines nie przeszkadza);
- NIE podbija nasycenia i NIE dokłada ciemnej obwódki (to robi
  `stworki_wczytaj.py` pod bitwę): na mapie obwódka robiła „naklejkę",
  a paletę ma trzymać teren. Nie odbija w poziomie — grupa patrzy tam,
  gdzie ją namalowano (jak potwory HoMM3 na mapie).

    python3 tools/strazniki_wczytaj.py               # wszystkie straznik-*.png
    python3 tools/strazniki_wczytaj.py 00002 00246   # wybrane numery
    python3 tools/strazniki_wczytaj.py --arkusz tools/shots/strazniki.png
"""

from __future__ import annotations

import argparse
import sys
from collections import deque
from pathlib import Path

import numpy as np
from PIL import Image, ImageFilter

sys.path.insert(0, str(Path(__file__).resolve().parent))
from stworki_wczytaj import zdejmijBialaObwodke  # noqa: E402

KORZEN = Path(__file__).resolve().parent.parent
WSAD = KORZEN / 'tools' / 'wsad'
CEL = KORZEN / 'public' / 'sprites'
LISTA_TS = KORZEN / 'src' / 'data' / 'strazniki-mapa.ts'

#: Bok pliku. Strażnik zajmuje na ekranie ~45 × 50 px; 160 daje zapas na
#: zoom kamery bez rozmycia i jest wciąż mały.
BOK = 160
MARGINES = 2


def zdejmijPodloze(a: np.ndarray) -> tuple[np.ndarray, int]:
    """Usuwa jasny, mało nasycony placek pod grupą. Zwraca (obraz, ile px).

    Placek to piksele jasne (V ≥ 0,5) i szarawe (S ≤ 0,28) w dolnych 45%
    sylwetki, połączone z jej dolnym brzegiem — zalewamy od brzegu. Ciała
    stworków są nasycone (zieleń, oranż, błękit), więc przez nie zalewanie
    nie przechodzi; białe skrzydła czy kremowe płatki leżą wyżej i nie
    dotykają dołu.
    """
    alfa = a[..., 3]
    ys, xs = np.where(alfa > 12)
    if len(ys) == 0:
        return a, 0
    gora, dol = ys.min(), ys.max()
    pas = int(dol - (dol - gora + 1) * 0.45)
    rgb = a[..., :3].astype(np.float32) / 255
    mx = rgb.max(-1)
    mn = rgb.min(-1)
    sat = np.where(mx > 0, (mx - mn) / np.maximum(mx, 1e-6), 0)
    podloze = (alfa > 0) & (sat <= 0.28) & (mx >= 0.5)
    # Półprzezroczysty rąbek placka bywa ciemniejszy i cieplejszy.
    podloze |= (alfa > 0) & (alfa < 200) & (sat <= 0.45)
    # Runda 6 (jedna figura): placek bywa też beżowo-piaskowy (S 0,3–0,5,
    # odcień 15–50°) — łapiemy go tylko w najniższych 22% sylwetki, gdzie są
    # już tylko stopy (nasycone), a nie kremowy brzuch.
    r_, g_, b_ = rgb[..., 0], rgb[..., 1], rgb[..., 2]
    delta = np.maximum(mx - mn, 1e-6)
    odcien = np.where(mx == r_, ((g_ - b_) / delta) % 6, np.where(mx == g_, (b_ - r_) / delta + 2, (r_ - g_) / delta + 4)) * 60
    piasek = (alfa > 0) & (sat <= 0.55) & (mx >= 0.6) & (odcien >= 15) & (odcien <= 50)
    piasek[: int(dol - (dol - gora + 1) * 0.22)] = False
    podloze |= piasek
    podloze[:pas] = False

    h, w = alfa.shape
    # Start: piksele placka na zewnętrznym brzegu sylwetki (sąsiad przezroczysty).
    pelne = alfa > 12
    brzeg = pelne & ~np.array(
        Image.fromarray((pelne * 255).astype(np.uint8)).filter(ImageFilter.MinFilter(3))
    ).astype(bool)
    widziany = np.zeros_like(podloze)
    q: deque[tuple[int, int]] = deque()
    for y, x in zip(*np.where(brzeg & podloze)):
        widziany[y, x] = True
        q.append((y, x))
    while q:
        y, x = q.popleft()
        for dy, dx in ((1, 0), (-1, 0), (0, 1), (0, -1)):
            ny, nx = y + dy, x + dx
            if 0 <= ny < h and 0 <= nx < w and not widziany[ny, nx] and podloze[ny, nx]:
                widziany[ny, nx] = True
                q.append((ny, nx))
    ile = int(widziany.sum())
    if not ile:
        return a, 0
    # Z rąbkiem 2 px po pikselach półprzezroczystych albo szarawych.
    m = np.array(Image.fromarray((widziany * 255).astype(np.uint8)).filter(ImageFilter.MaxFilter(5))) > 0
    m &= widziany | (alfa < 220) | podloze
    m[:pas] = False
    b = a.copy()
    b[m, 3] = 0
    # Okruchy: wszystko, co nie łączy się z główną sylwetką i jest małe.
    from scipy import ndimage

    etyk, n = ndimage.label(b[..., 3] > 40)
    if n > 1:
        rozm = ndimage.sum(np.ones_like(etyk), etyk, range(1, n + 1))
        for i, r in enumerate(rozm, start=1):
            if r < rozm.max() * 0.01:
                b[etyk == i, 3] = 0
        rdzen = ndimage.binary_dilation(b[..., 3] > 40, iterations=3)
        b[~rdzen, 3] = 0
    return b, ile


def przetworz(sciezka: Path) -> tuple[Image.Image, list[str]]:
    uwagi = []
    a = np.array(Image.open(sciezka).convert('RGBA'))
    a, obw = zdejmijBialaObwodke(a)
    if obw:
        uwagi.append(f'zdjęta biała obwódka {obw} px')
    a, pod = zdejmijPodloze(a)
    if pod:
        uwagi.append(f'zdjęty placek {pod} px')
    a[a[..., 3] < 10, 3] = 0
    im = Image.fromarray(a)
    ramka = im.getchannel('A').point(lambda v: 255 if v > 12 else 0).getbbox()
    if ramka is None:
        raise SystemExit(f'{sciezka.name}: pusty obrazek')
    im = im.crop(ramka)
    wnetrze = BOK - 2 * MARGINES
    skala = wnetrze / max(im.size)
    nowy = (max(1, round(im.width * skala)), max(1, round(im.height * skala)))
    # Premultiplikowana alfa — bez jasnych obwódek po zmniejszeniu.
    male = im.convert('RGBa').resize(nowy, Image.LANCZOS).convert('RGBA')
    male = male.filter(ImageFilter.UnsharpMask(radius=0.8, percent=50, threshold=2))
    wynik = Image.new('RGBA', (BOK, BOK), (0, 0, 0, 0))
    wynik.alpha_composite(male, ((BOK - male.width) // 2, BOK - MARGINES - male.height))
    return wynik, uwagi


def zapiszListe() -> list[str]:
    numery = sorted(p.stem.removeprefix('mapa-') for p in CEL.glob('mapa-*.png'))
    wiersze = ',\n'.join(f"  '{n}'" for n in numery)
    LISTA_TS.write_text(
        '// Plik generuje tools/strazniki_wczytaj.py — nie edytować ręcznie.\n'
        '//\n'
        '// Numery stworków, które mają malowaną wersję strażnika NA MAPĘ\n'
        '// (`public/sprites/mapa-<numer>.png`, prompty: tools/PROMPTY-STWORKI.md,\n'
        '// „Strażnicy na mapie przygody"). Mapa przygody wczytuje tylko te pliki;\n'
        '// reszta strażników stoi na sprite\'ach bitwy.\n'
        f'export const STRAZNICY_MAPOWI: ReadonlySet<string> = new Set([\n{wiersze}{"," if numery else ""}\n]);\n',
        encoding='utf-8',
    )
    return numery


def arkusz(numery: list[str], plik: Path) -> None:
    S = Image.new('RGB', (len(numery) * (BOK + 12), BOK + 12), (92, 120, 70))
    for i, n in enumerate(numery):
        im = Image.open(CEL / f'mapa-{n}.png').convert('RGBA')
        S.paste(im, (i * (BOK + 12) + 6, 6), im)
    plik.parent.mkdir(parents=True, exist_ok=True)
    S.save(plik)
    print(f'arkusz: {plik}')


def main() -> int:
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument('numery', nargs='*')
    ap.add_argument('--arkusz', type=Path, help='zapisz arkusz podglądu')
    args = ap.parse_args()
    pliki = sorted(WSAD.glob('straznik-*.png'))
    if args.numery:
        pliki = [p for p in pliki if p.stem.removeprefix('straznik-') in args.numery]
    if not pliki:
        print('Brak plików tools/wsad/straznik-*.png — patrz tools/PROMPTY-STWORKI.md', file=sys.stderr)
        return 1
    for p in pliki:
        numer = p.stem.removeprefix('straznik-')
        im, uwagi = przetworz(p)
        im.save(CEL / f'mapa-{numer}.png', optimize=True)
        print(f'  {p.name} → public/sprites/mapa-{numer}.png  {" · ".join(uwagi)}')
    numery = zapiszListe()
    print(f'{LISTA_TS.relative_to(KORZEN)}: {", ".join(numery)}')
    if args.arkusz:
        arkusz(numery, args.arkusz)
    return 0


if __name__ == '__main__':
    raise SystemExit(main())
