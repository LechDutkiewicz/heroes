#!/usr/bin/env python3
"""Portrety stworków: kadr popiersia na malowanym tle ich frakcji.

Po co
-----
Sloty armii (panel na mapie, ekran bohatera, załoga i karta werbunku
w mieście, kolejka tur w bitwie) pokazywały CAŁEGO stworka zmniejszonego do
kwadratu: przy 28 px zostawała kolorowa plamka z nóżkami, bez twarzy, wisząca
w pustym gnieździe. W Heroes 3 / HotA portret stwora to osobny obrazek:
głowa i tułów, przycięte ciasno, na własnym malowanym tle — murach i niebie
jego miasta — w ciemnej ramce. Czyta się go przy 32 px, bo połowę kadru
zajmuje twarz, a tło mówi, skąd stwór jest.

Ten skrypt robi to samo z NASZYCH rysunków, bez generowania czegokolwiek:

  1. TŁO — panorama miasta frakcji złożona z tych samych plików co ekran
     miasta (`public/miasto/tlo-<f>.png` + dalekie bryły: fort, siedliska,
     ratusz) i ustawiona według tego samego wzoru perspektywy co w
     `TownScene` (`naZiemi`, `skalaBudynku`, mgła dali). Każdy stwór dostaje
     z niej inny wycinek (`TLO_X`), jak w Heroes, gdzie za każdym widać inny
     kawałek tego samego miasta. Tło jest lekko rozmyte i przygaszone ku
     dołowi — to głębia ostrości i miejsce na liczbę w rogu.
  2. STWÓR — z mistrza `assets/stworki/<id>.png` (256 px), kadr z tabeli
     `KADR`: środek i bok kwadratu popiersia w pikselach mistrza. Duży portret
     jest luźniejszy (głowa z tułowiem), mały ciaśniejszy (sama głowa) — tak
     samo jak w Heroes, gdzie mały portret nie jest zmniejszonym dużym.
  3. WPASOWANIE — stwór dostaje odrobinę barwy światła swojego miasta
     (Grota chłodna, Zbocze żarzące się, Bór ciepłe słońce), obwódkę światła
     od tła na krawędziach i miękki ciemny cień za sylwetką. Bez tego wycięty
     rysunek na malowanym tle wygląda jak naklejka.
  4. RAMKA — ciemna, jednopikselowa, z jaśniejszą fazką wewnątrz, jak ramki
     portretów w Heroes. Złote obramowanie dokłada już interfejs.

Wyjście: `public/portrety/<id>.png` (duży, 128 × 128 — sloty w grze są kwadratowe),
`public/portrety/<id>-m.png` (mały, 48 × 48) i `public/portrety/<id>-o.png`
(okrągły, 56 px — kadr małego wycięty w koło, do medalionów). Gra ładuje je
jako `pd-<id>`, `pm-<id>` i `po-<id>` (`src/visual/portrety.ts`).

    python3 tools/stworki_portrety.py                 # wszystkie 18
    python3 tools/stworki_portrety.py --arkusz out.png  # podgląd: duże i małe obok siebie

Mistrzowie się zmieniają (barwy, poprawki) — wtedy wystarczy puścić skrypt
jeszcze raz. Kadry w `KADR` są w pikselach mistrza, więc przeżyją
przemalowanie, dopóki stwór stoi w tym samym miejscu kwadratu.
"""

from __future__ import annotations

import argparse
import re
from pathlib import Path

import numpy as np
from PIL import Image, ImageChops, ImageFilter

KORZEN = Path(__file__).resolve().parent.parent
MISTRZOWIE = KORZEN / 'assets' / 'stworki'
MIASTO = KORZEN / 'public' / 'miasto'
WYJSCIE = KORZEN / 'public' / 'portrety'

DUZY = (128, 128)
MALY = (48, 48)
OKRAGLY = (56, 56)

# ————————————————————————————————————————————————— kadry
#
# (środek x, środek y, bok) kwadratu popiersia w pikselach mistrza 256 × 256.
# Duży portret bierze ten kwadrat w całości,
# mały — kwadrat z `KADR_MALY` (ciaśniejszy, na twarz).
# Kadry dobrane na oko na arkuszu (`--arkusz`), jeden po drugim: twarz
# w górnej połowie kadru, oczy mniej więcej na jednej trzeciej od góry,
# sylwetka ucięta na piersi albo w pasie, nigdy na szyi.
KADR: dict[str, tuple[float, float, float]] = {
    # Bór
    '00193': (128, 132, 256),  # Pyroko — bryła bez szyi: płomień i bok głowy
    '00020': (160, 92, 190),  # Flamir — głowa z grzebieniem po prawej
    '00218': (126, 92, 200),  # Aquino
    '00030': (160, 108, 190),  # Torrenar — głowa w pancerzu po prawej
    '00096': (136, 100, 190),  # Verdiko — z kiełkiem na czubku
    '00227': (128, 84, 170),  # Silvena
    # Grota
    '00246': (146, 90, 170),  # Glacyn — mała głowa na długiej szyi
    '00002': (128, 116, 230),  # Sporex — kapelusz grzyba i twarz
    '00263': (140, 104, 195),  # Cindro
    '00250': (126, 100, 175),  # Sporina — kulka i czerwone oczy
    '00220': (132, 110, 215),  # Aquator — kolce i oczy
    '00196': (128, 146, 236),  # Vulkaron — maska na tułowiu
    # Zbocze
    '00074': (160, 112, 185),  # Bazalt — głowa w grzywie po prawej
    '00058': (126, 90, 175),  # Ashko
    '00095': (130, 132, 262),  # Obsydian
    '00023': (160, 104, 185),  # Cynder
    '00077': (124, 92, 180),  # Lawina — korona i oczy
    '00041': (124, 92, 175),  # Sadzin
}

# Mały portret: własny kadr, ciaśniejszy. Brak wpisu = duży kadr zwężony
# o `ZWEZENIE_MALEGO` wokół punktu przesuniętego nieco w górę (na twarz).
KADR_MALY: dict[str, tuple[float, float, float]] = {
    # Stwory bez twarzy (bryła Pyroko, kolumna Obsydiana) czyta się po
    # sylwetce — w małym portrecie zostają prawie w całości.
    '00193': (128, 132, 240),
    '00095': (128, 128, 250),
    '00020': (172, 70, 132),  # Flamir — sama głowa z grzebieniem
    '00246': (158, 70, 112),  # Glacyn — głowa bez długiej szyi
}
ZWEZENIE_MALEGO = 0.8

# Wycinek panoramy miasta za stworem: ułamek szerokości panoramy (0..1),
# środek kadru. Kolejni stwory frakcji dostają kolejne kawałki miasta.
TLO_X = [0.20, 0.36, 0.52, 0.68, 0.84, 0.44]

# Światło miasta: barwa, którą stwór dostaje na krawędziach (obwódka od tła)
# i w całości (lekkie przemnożenie), plus moc każdego z nich.
SWIATLO = {
    'bor': {'barwa': (255, 226, 160), 'obwodka': 0.45, 'barwienie': 0.06},
    'grota': {'barwa': (120, 200, 255), 'obwodka': 0.55, 'barwienie': 0.10},
    'zbocze': {'barwa': (255, 150, 70), 'obwodka': 0.55, 'barwienie': 0.08},
}

# Bryły w tle panoramy portretu — tylko dalekie (mniejsza głębia), żeby nad
# ramieniem stwora stało miasto, a nie ściana jednego budynku.
BRYLY_TLA = ['siedlisko6', 'fort', 'siedlisko5', 'ratusz3', 'siedlisko4']

# ————————————————————————————————————————————————— frakcje


def frakcje() -> dict[str, str]:
    """Stwór → frakcja, czytane z `src/data/factions.ts` (jedno źródło prawdy)."""
    tekst = (KORZEN / 'src' / 'data' / 'factions.ts').read_text(encoding='utf-8')
    wynik: dict[str, str] = {}
    obecna = None
    for linia in tekst.splitlines():
        m = re.search(r"\bid: '(\w+)'", linia)
        if m and m.group(1) in SWIATLO:
            obecna = m.group(1)
        m = re.search(r"unit\(\d+, '(\d{5})'", linia)
        if m and obecna:
            wynik[m.group(1)] = obecna
    return wynik


# ————————————————————————————————————————————————— tło

# Te same stałe co w `TownScene` / `zamki.ts` — panorama portretu stoi
# jak panorama miasta, tylko bez pierwszego planu.
PAN_W, PAN_H = 960, 596
HORYZONT = 0.3
BRYLA = 0.5
MGLA_DALI = (0xC9, 0xDC, 0xEA)
POLOZENIE = {
    'ratusz3': (0.5, 0.45),
    'fort': (0.22, 0.14),
    'siedlisko4': (0.89, 0.52),
    'siedlisko5': (0.83, 0.2),
    'siedlisko6': (0.36, 0.04),
}


def panorama(frakcja: str) -> Image.Image:
    tlo = Image.open(MIASTO / f'tlo-{frakcja}.png').convert('RGBA')
    for nazwa in sorted(BRYLY_TLA, key=lambda n: POLOZENIE[n][1]):
        plik = MIASTO / f'{frakcja}-{nazwa}.png'
        if not plik.exists():
            continue
        bx, by = POLOZENIE[nazwa]
        skala = BRYLA * (0.6 + 0.62 * by)
        im = Image.open(plik).convert('RGBA')
        im = im.resize((round(im.width * skala), round(im.height * skala)), Image.LANCZOS)
        # Mgła dali: mnożenie przez biel zmieszaną z barwą mgły, jak `setTint`.
        mg = 0.34 * (1 - by)
        tint = tuple(round(255 * (1 - mg) + c * mg) for c in MGLA_DALI)
        rgb = ImageChops.multiply(im.convert('RGB'), Image.new('RGB', im.size, tint))
        im = Image.merge('RGBA', (*rgb.split(), im.getchannel('A')))
        pas = PAN_H * (1 - HORYZONT)
        ziemia = PAN_H * HORYZONT + pas * (0.05 + 0.62 * by)
        tlo.alpha_composite(im, (round(bx * PAN_W - im.width / 2), round(ziemia - im.height)))
    return tlo


def wycinek_tla(pan: Image.Image, srodek_x: float, rozmiar: tuple[int, int], maly: bool) -> Image.Image:
    """Kawałek panoramy: od nieba do bliskiej łąki, przeskalowany do portretu."""
    w, h = rozmiar
    # Wysokość wycinka w pikselach panoramy — w tym pasie stoją dalekie bryły.
    wys = 240 if not maly else 200
    szer = wys * w / h
    gora = 6 if not maly else 70
    lewo = min(max(srodek_x * PAN_W - szer / 2, 0), PAN_W - szer)
    kawal = pan.crop((round(lewo), gora, round(lewo + szer), gora + wys)).convert('RGB')
    kawal = kawal.resize((w, h), Image.LANCZOS)
    # Głębia ostrości: tło lekko miękkie, żeby ostry był tylko stwór.
    kawal = kawal.filter(ImageFilter.GaussianBlur(0.9 if not maly else 1.4))
    a = np.asarray(kawal).astype(np.float32) / 255
    yy = np.linspace(0, 1, h)[:, None, None]
    xx = np.linspace(-1, 1, w)[None, :, None]
    # Przygaszenie: ku dołowi (tam siedzi liczba) i ku bokom (winieta).
    ciemn = 1 - 0.38 * yy**1.6 - 0.22 * np.abs(xx) ** 2.2
    if maly:
        # Mały portret stoi na ciemnym tle jak w Heroes: stwór ma przy 28 px
        # odcinać się od tła, a nie z nim mieszać.
        ciemn *= 0.62
    a = np.clip(a * ciemn, 0, 1)
    # Lekko mniej nasycenia w tle — stwory są jaskrawe i to one mają świecić.
    szar = a.mean(axis=2, keepdims=True)
    a = szar + (a - szar) * (0.85 if not maly else 0.7)
    return Image.fromarray((np.clip(a, 0, 1) * 255).astype(np.uint8), 'RGB')


# ————————————————————————————————————————————————— stwór


def kadr_stwora(mistrz: Image.Image, cx: float, cy: float, bok: float, rozmiar: tuple[int, int]) -> Image.Image:
    """Wycinek popiersia z mistrza, w proporcjach portretu, z marginesem poza plik."""
    w, h = rozmiar
    kw = bok * w / max(w, h)
    kh = bok * h / max(w, h)
    # Crop poza granicami pliku daje przezroczystość — głowa może dotykać
    # krawędzi mistrza, a kadr i tak zostaje kwadratowy.
    box = (cx - kw / 2, cy - kh / 2, cx + kw / 2, cy + kh / 2)
    # Najpierw 4× powiększony, dopiero potem w dół — ostrzejsze przejścia
    # alfy niż jedno przeskalowanie z ułamkowego wycinka.
    duzo = (w * 4, h * 4)
    im = mistrz.transform(duzo, Image.EXTENT, box, Image.BICUBIC)
    return im.resize(rozmiar, Image.LANCZOS)


def wpasuj(stwor: Image.Image, tlo: Image.Image, swiatlo: dict, maly: bool) -> Image.Image:
    w, h = stwor.size
    s = np.asarray(stwor).astype(np.float32) / 255
    rgb, alfa = s[..., :3], s[..., 3:4]
    barwa = np.array(swiatlo['barwa'], np.float32)[None, None, :] / 255

    # Barwienie całości światłem miasta (miękkie przemnożenie).
    k = swiatlo['barwienie']
    rgb = rgb * (1 - k) + rgb * barwa * k * 1.6

    # Obwódka światła: krawędź sylwetki od strony tła (góra i lewo — stamtąd
    # w naszym świecie pada światło), rozjaśniona barwą miasta.
    A = Image.fromarray((alfa[..., 0] * 255).astype(np.uint8), 'L')
    przes = ImageChops.offset(A, 2 if not maly else 1, 2 if not maly else 1)
    krawedz = np.clip(np.asarray(A, np.float32) - np.asarray(przes, np.float32), 0, 255) / 255
    krawedz = np.asarray(
        Image.fromarray((krawedz * 255).astype(np.uint8)).filter(ImageFilter.GaussianBlur(0.8)), np.float32
    )[..., None] / 255
    mo = swiatlo['obwodka'] * (0.8 if maly else 1)
    rgb = rgb + (1 - rgb) * barwa * np.clip(krawedz * 1.5, 0, 1) * mo

    stw = Image.fromarray(
        (np.concatenate([np.clip(rgb, 0, 1), alfa], axis=2) * 255).astype(np.uint8), 'RGBA'
    )

    # Cień za sylwetką: ciemna, rozmyta kopia alfy przesunięta w prawo-dół.
    # Odrywa stwora od tła także tam, gdzie barwy są podobne (niebieski
    # Glacyn na niebieskiej Grocie).
    cien = A.filter(ImageFilter.GaussianBlur(3 if not maly else 1.6))
    cien = ImageChops.offset(cien, 2 if not maly else 1, 3 if not maly else 1)
    cien_arr = np.asarray(cien, np.float32)[..., None] / 255 * (0.55 if not maly else 0.7)
    t = np.asarray(tlo, np.float32) / 255
    t = t * (1 - cien_arr * 0.85)
    wynik = Image.fromarray((t * 255).astype(np.uint8), 'RGB').convert('RGBA')
    wynik.alpha_composite(stw)
    return wynik.convert('RGB')


def ramka(im: Image.Image, maly: bool) -> Image.Image:
    """Ciemna ramka z jaśniejszą fazką wewnątrz — ramka portretu z Heroes."""
    a = np.asarray(im, np.float32)
    h, w = a.shape[:2]
    ciemna = np.array([26, 16, 8], np.float32)
    a[0, :], a[-1, :], a[:, 0], a[:, -1] = ciemna, ciemna, ciemna, ciemna
    # Fazka: jaśniejsza góra-lewo, ciemniejsza dół-prawo (1 px).
    a[1, 1:-1] = a[1, 1:-1] * 0.55 + 255 * 0.45 * np.array([1.0, 0.9, 0.7])
    a[1:-1, 1] = a[1:-1, 1] * 0.6 + 255 * 0.4 * np.array([1.0, 0.9, 0.7])
    a[-2, 1:-1] *= 0.5
    a[1:-1, -2] *= 0.55
    if not maly:
        a[2, 2:-2] = a[2, 2:-2] * 0.85
        a[-3, 2:-2] *= 0.8
    return Image.fromarray(np.clip(a, 0, 255).astype(np.uint8), 'RGB')


# ————————————————————————————————————————————————— składanie


def kadr_malego(sid: str) -> tuple[float, float, float]:
    if sid in KADR_MALY:
        return KADR_MALY[sid]
    cx, cy, bok = KADR[sid]
    b = bok * ZWEZENIE_MALEGO
    # Środek w górę o część różnicy — mały kadr idzie na twarz, nie na pierś.
    return cx, cy - (bok - b) * 0.35, b


def portret(sid: str, frakcja: str, pan: Image.Image, nr: int, maly: bool, rozmiar=None) -> Image.Image:
    okragly = rozmiar is not None
    rozmiar = rozmiar or (MALY if maly else DUZY)
    mistrz = Image.open(MISTRZOWIE / f'{sid}.png').convert('RGBA')
    cx, cy, bok = kadr_malego(sid) if maly else KADR[sid]
    tlo = wycinek_tla(pan, TLO_X[nr % len(TLO_X)], rozmiar, maly)
    stw = kadr_stwora(mistrz, cx, cy, bok, rozmiar)
    im = wpasuj(stw, tlo, SWIATLO[frakcja], maly)
    return wytnij_kolo(im) if okragly else ramka(im, maly)


def wytnij_kolo(im: Image.Image) -> Image.Image:
    """Okrągły portret do medalionów (kolejka tur, karta nagrody kampanii).

    Maska liczona w 4× i zmniejszana — gładki brzeg bez schodków. Brzeg
    przyciemniony, żeby portret siedział W pierścieniu, a nie na nim.
    """
    w, h = im.size
    duza = Image.new('L', (w * 4, h * 4), 0)
    from PIL import ImageDraw

    ImageDraw.Draw(duza).ellipse((0, 0, w * 4 - 1, h * 4 - 1), fill=255)
    maska = duza.resize((w, h), Image.LANCZOS)
    a = np.asarray(im, np.float32)
    yy, xx = np.mgrid[0:h, 0:w]
    rr = np.hypot((xx + 0.5 - w / 2) / (w / 2), (yy + 0.5 - h / 2) / (h / 2))
    a *= (1 - 0.45 * np.clip((rr - 0.78) / 0.22, 0, 1) ** 1.5)[..., None]
    wynik = Image.fromarray(np.clip(a, 0, 255).astype(np.uint8), 'RGB').convert('RGBA')
    wynik.putalpha(maska)
    return wynik


def main():
    p = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    p.add_argument('--arkusz', help='zapisz podgląd wszystkich portretów (duże, małe, małe ×2)')
    p.add_argument('ids', nargs='*', help='tylko te stwory (domyślnie wszystkie)')
    args = p.parse_args()

    fr = frakcje()
    brak = set(fr) ^ set(KADR)
    if brak:
        raise SystemExit(f'KADR i factions.ts się rozjechały: {sorted(brak)}')
    WYJSCIE.mkdir(parents=True, exist_ok=True)
    panoramy = {f: panorama(f) for f in set(fr.values())}
    numery: dict[str, int] = {}
    gotowe = []
    for sid, f in fr.items():
        nr = numery.get(f, 0)
        numery[f] = nr + 1
        if args.ids and sid not in args.ids:
            continue
        d = portret(sid, f, panoramy[f], nr, False)
        m = portret(sid, f, panoramy[f], nr, True)
        d.save(WYJSCIE / f'{sid}.png', optimize=True)
        m.save(WYJSCIE / f'{sid}-m.png', optimize=True)
        portret(sid, f, panoramy[f], nr, True, OKRAGLY).save(WYJSCIE / f'{sid}-o.png', optimize=True)
        gotowe.append((sid, d, m))
    print(f'portrety: {len(gotowe)} → {WYJSCIE.relative_to(KORZEN)}/')

    if args.arkusz:
        kol = 6
        rz = (len(gotowe) + kol - 1) // kol
        cw, ch = DUZY[0] + MALY[0] + 28 + 12, DUZY[1] + 8
        ark = Image.new('RGB', (kol * cw, rz * ch), (40, 30, 20))
        for i, (sid, d, m) in enumerate(gotowe):
            x, y = (i % kol) * cw + 4, (i // kol) * ch + 4
            ark.paste(d, (x, y))
            ark.paste(m, (x + DUZY[0] + 4, y))
            ark.paste(m.resize((28, 28), Image.LANCZOS), (x + DUZY[0] + 4, y + MALY[1] + 4))
        ark.save(args.arkusz)
        print(f'arkusz: {args.arkusz}')


if __name__ == '__main__':
    main()
