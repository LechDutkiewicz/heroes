#!/usr/bin/env python3
"""Portrety stworów: głowa i ramiona na wspólnym, malowanym tle frakcji.

Po co
-----
Sloty armii (panel na mapie, ekran bohatera, załoga i karta werbunku
w mieście, kolejka tur w bitwie) pokazywały CAŁEGO stworka zmniejszonego do
kwadratu: przy 28 px kolorowa plamka z nóżkami, bez twarzy. W Heroes 3 / HotA
portret stwora to osobny obrazek: głowa i ramiona, przycięte ciasno, na
malowanym tle jego miasta, w ciemnej ramce.

Runda 1 portretów przegrała ślepo 0/3 i krytyk wskazał dokładnie, czemu:
  - kadr był za każdym razem inny (czerwona bryła ucięta, niebieski cały
    i na wprost, biały z połową głowy) — rząd armii nie czytał się jak
    KOMPLET;
  - każdy stwór miał inny wycinek tła i światło na krawędziach, a stwory
    wyglądały jak błyszczące maskotki naklejone na obraz;
Stąd dwie zasady tej wersji:

  1. JEDEN SZABLON KADRU. Każdy stwór ma w tabeli `GLOWA` tylko pomiar:
     środek głowy w poziomie, wysokość OCZU i wielkość głowy (w pikselach
     mistrza 256 × 256). Kadr liczy się z pomiaru jednym wzorem: bok =
     `SZABLON_BOK` × wielkość głowy, oczy na `SZABLON_OCZY` wysokości od góry.
     Głowa z ramionami wypełnia wtedy ~80% wysokości ramki u każdego stwora,
     a oczy stoją w całym rzędzie na jednej linii. Stwory bez twarzy
     (Obsydian) mierzy się po „czole" bryły.
  2. JEDNO TŁO I JEDNO ŚWIATŁO NA FRAKCJĘ. Tło to ten sam wycinek panoramy
     miasta (`public/miasto/tlo-<f>.png` + dalekie bryły, ustawione wzorem
     perspektywy z `TownScene`) dla wszystkich stworów frakcji, przestrojony
     w ciepłą sepię pergaminu i drewna, na których portret leży w grze.
     Stwór dostaje to samo światło kluczowe: z góry-lewa, w barwie tła,
     z przygaszonym połyskiem i nasyceniem — jest wtedy namalowany w tym
     samym świetle co tło, a nie wklejony.

Wyjście (`public/portrety/`):
  - `<id>.png`   duży, 128 × 128 — ekran bohatera, karta werbunku;
  - `<id>-m.png` mały, 48 × 48, ciemniejsze tło — panel mapy, załoga miasta;
  - `<id>-o.png` okrągły, 56 px — medaliony (kolejka tur, kampania, wynik).
Gra ładuje je jako `pd-<id>`, `pm-<id>`, `po-<id>` (`src/visual/portrety.ts`).

    python3 tools/stworki_portrety.py                   # wszystkie 18
    python3 tools/stworki_portrety.py --arkusz out.png  # podgląd całego kompletu
    python3 tools/stworki_portrety.py --pomiar out.png  # mistrzowie z naniesionym pomiarem głowy

Mistrzowie się zmieniają (przemalowania) — wtedy wystarczy puścić skrypt
jeszcze raz; jeśli stwór zmienił pozę, poprawić jego wiersz w `GLOWA`
(podgląd `--pomiar` pokazuje, gdzie skrypt widzi oczy i głowę).
"""

from __future__ import annotations

import argparse
import re
from pathlib import Path

import numpy as np
from PIL import Image, ImageChops, ImageDraw, ImageFilter

KORZEN = Path(__file__).resolve().parent.parent
MISTRZOWIE = KORZEN / 'assets' / 'stworki'
MIASTO = KORZEN / 'public' / 'miasto'
WYJSCIE = KORZEN / 'public' / 'portrety'

DUZY = (128, 128)
MALY = (48, 48)
OKRAGLY = (56, 56)

# ————————————————————————————————————————————————— pomiar i szablon
#
# (środek głowy x, oczy y, wielkość głowy) w pikselach mistrza 256 × 256.
# Wielkość głowy = od czubka głowy (bez czuba, grzebienia, kiełka) do brody.
GLOWA: dict[str, tuple[float, float, float]] = {
    # Bór
    '00193': (178, 158, 96),  # Pyroko — twarz z przodu bryły
    '00020': (82, 80, 62),  # Flamir — ptasia głowa z grzebieniem po lewej
    '00218': (100, 62, 100),  # Aquino
    '00030': (182, 122, 104),  # Torrenar — głowa w pancerzu
    '00096': (148, 142, 88),  # Verdiko
    '00227': (127, 46, 54),  # Silvena
    # Grota
    '00246': (166, 58, 46),  # Glacyn
    '00002': (131, 116, 104),  # Sporex — twarz pod kapeluszem
    '00263': (139, 80, 78),  # Cindro
    '00250': (117, 64, 44),  # Sporina — główka nad strąkiem
    '00220': (160, 66, 64),  # Aquator — głowa z dziobem
    '00196': (128, 120, 132),  # Vulkaron — maska na tułowiu
    # Zbocze
    '00074': (178, 106, 62),  # Bazalt — głowa w grzywie
    '00058': (130, 46, 92),  # Ashko — maska w puszystej głowie
    '00095': (128, 62, 110),  # Obsydian — bez twarzy: szczyt białego trzonu
    '00023': (180, 96, 80),  # Cynder
    '00077': (108, 72, 58),  # Lawina
    '00041': (120, 66, 88),  # Sadzin
}

# Bok kadru w wielkościach głowy i położenie oczu (ułamek wysokości od góry).
# 1.8 głowy: głowa zajmuje górne ~55% ramki, ramiona i pierś resztę do ~80%
# (reszta to tło) — tak jak popiersia w Heroes. Oczy na 0.36: „górna trzecia".
SZABLON_BOK = {'duzy': 1.8, 'maly': 1.45}
SZABLON_OCZY = {'duzy': 0.36, 'maly': 0.4}
# Najmniejszy bok kadru w pikselach mistrza — przy mniejszym portret 128 px
# byłby powiększeniem ponad 1,6× i rozmyłby się. Mała głowa zostaje wtedy
# trochę mniejsza w ramce, ale ostra.
MIN_BOK = {'duzy': 80, 'maly': 60}

# ————————————————————————————————————————————————— tło i światło frakcji
#
# Jedno tło na frakcję: wycinek panoramy (ułamek szerokości, środek) i jego
# nastrojenie. `sepia` — barwa, którą mnożymy odbarwione tło: ciepły papier
# i drewno interfejsu, z nutą klimatu frakcji. `swiatlo` — barwa światła
# kluczowego na stworze (ta sama, co w tle, żeby stwór stał w TYM świetle).
FRAKCJA = {
    'bor': {'tlo_x': 0.42, 'sepia': (255, 226, 170), 'nasycenie_tla': 0.55, 'swiatlo': (255, 232, 185)},
    'grota': {'tlo_x': 0.50, 'sepia': (226, 206, 214), 'nasycenie_tla': 0.5, 'swiatlo': (236, 222, 236)},
    'zbocze': {'tlo_x': 0.62, 'sepia': (255, 206, 160), 'nasycenie_tla': 0.55, 'swiatlo': (255, 216, 175)},
}


def frakcje() -> dict[str, str]:
    """Stwór → frakcja, czytane z `src/data/factions.ts` (jedno źródło prawdy)."""
    tekst = (KORZEN / 'src' / 'data' / 'factions.ts').read_text(encoding='utf-8')
    wynik: dict[str, str] = {}
    obecna = None
    for linia in tekst.splitlines():
        m = re.search(r"\bid: '(\w+)'", linia)
        if m and m.group(1) in FRAKCJA:
            obecna = m.group(1)
        m = re.search(r"unit\(\d+, '(\d{5})'", linia)
        if m and obecna:
            wynik[m.group(1)] = obecna
    return wynik


# ————————————————————————————————————————————————— panorama

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
    for nazwa in sorted(POLOZENIE, key=lambda n: POLOZENIE[n][1]):
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


def tlo_frakcji(pan: Image.Image, f: dict, rozmiar: tuple[int, int], maly: bool) -> Image.Image:
    """Wspólne tło frakcji: wycinek panoramy w sepii interfejsu."""
    w, h = rozmiar
    wys = 250
    szer = wys * w / h
    lewo = min(max(f['tlo_x'] * PAN_W - szer / 2, 0), PAN_W - szer)
    kawal = pan.crop((round(lewo), 0, round(lewo + szer), wys)).convert('RGB')
    kawal = kawal.resize((w, h), Image.LANCZOS)
    # Tło jest dalekie: miękkie, żeby ostry był tylko stwór.
    kawal = kawal.filter(ImageFilter.GaussianBlur(1.2 if not maly else 1.6))
    a = np.asarray(kawal).astype(np.float32) / 255
    # Sepia: najpierw odebrać nasycenie, potem przemnożyć barwą papieru.
    szar = (a * np.array([0.3, 0.55, 0.15])).sum(axis=2, keepdims=True)
    a = szar + (a - szar) * f['nasycenie_tla']
    a = a * np.array(f['sepia'], np.float32) / 255
    # Winieta i przygaszenie ku dołowi: światło z góry-lewa, jak na stworze.
    yy = np.linspace(0, 1, h)[:, None, None]
    xx = np.linspace(0, 1, w)[None, :, None]
    swiatlo = 0.9 - 0.3 * yy**1.3 - 0.16 * xx**1.5
    rr = np.hypot(xx - 0.45, yy - 0.4)
    swiatlo *= 1 - 0.35 * np.clip(rr - 0.35, 0, 1)
    if maly:
        # Mały portret jak w Heroes: ciemne tło, bo przy 28 px stwór ma się
        # od niego odcinać, a nie z nim mieszać.
        swiatlo *= 0.66
    return Image.fromarray((np.clip(a * swiatlo, 0, 1) * 255).astype(np.uint8), 'RGB')


# ————————————————————————————————————————————————— stwór


def kadr(sid: str, rodzaj: str) -> tuple[float, float, float, float]:
    """Pudełko kadru (lewo, góra, prawo, dół) w pikselach mistrza — z szablonu."""
    hx, oczy, glowa = GLOWA[sid]
    bok = max(MIN_BOK[rodzaj], glowa * SZABLON_BOK[rodzaj])
    gora = oczy - bok * SZABLON_OCZY[rodzaj]
    return (hx - bok / 2, gora, hx + bok / 2, gora + bok)


def wytnij(mistrz: Image.Image, box, rozmiar: tuple[int, int]) -> Image.Image:
    # Najpierw 4× powiększony, dopiero potem w dół — ostrzejsze przejścia
    # alfy niż jedno przeskalowanie z ułamkowego wycinka. Kadr poza plikiem
    # daje przezroczystość.
    w, h = rozmiar
    im = mistrz.transform((w * 4, h * 4), Image.EXTENT, box, Image.BICUBIC)
    return im.resize(rozmiar, Image.LANCZOS)


def w_swietle(stwor: Image.Image, f: dict, maly: bool) -> Image.Image:
    """Stwór w świetle frakcji: mniej połysku i nasycenia, światło z góry-lewa."""
    s = np.asarray(stwor).astype(np.float32) / 255
    rgb, alfa = s[..., :3], s[..., 3:4]
    h, w = rgb.shape[:2]
    swiatlo = np.array(f['swiatlo'], np.float32)[None, None, :] / 255

    # Połysk: miękkie kolano na jasnościach — lśniące plamy tracą biel,
    # zostaje malowana bryła.
    kolano = 0.72
    rgb = np.where(rgb > kolano, kolano + (rgb - kolano) * 0.5, rgb)
    # Nasycenie w dół — maskotki z plakatu stają się stworami z obrazu.
    szar = (rgb * np.array([0.3, 0.55, 0.15])).sum(axis=2, keepdims=True)
    rgb = szar + (rgb - szar) * 0.88
    # Barwa światła frakcji (przemnożenie) i kierunek: jaśniej u góry-lewej,
    # ciemniej ku ramionom i w prawo-dół. Ramiona gasną ku dołowi ramki —
    # uwaga zostaje na twarzy, jak na popiersiach w Heroes.
    yy = np.linspace(0, 1, h)[:, None, None]
    xx = np.linspace(0, 1, w)[None, :, None]
    kier = 1.1 - 0.2 * xx - 0.42 * np.clip(yy - 0.45, 0, 1) ** 1.2
    rgb = rgb * (0.75 + 0.25 * swiatlo) * kier
    # Cienka ciepła obwódka światła na górno-lewych krawędziach sylwetki.
    A = Image.fromarray((alfa[..., 0] * 255).astype(np.uint8), 'L')
    d = 1 if maly else 2
    przes = ImageChops.offset(A, d, d)
    krawedz = np.clip(np.asarray(A, np.float32) - np.asarray(przes, np.float32), 0, 255)
    krawedz = np.asarray(Image.fromarray(krawedz.astype(np.uint8)).filter(ImageFilter.GaussianBlur(0.7)), np.float32)
    krawedz = np.clip(krawedz[..., None] / 255 * 1.4, 0, 1) * (1 - yy * 0.8)
    rgb = rgb + (swiatlo - rgb) * krawedz * 0.35
    return Image.fromarray((np.concatenate([np.clip(rgb, 0, 1), alfa], axis=2) * 255).astype(np.uint8), 'RGBA')


def zloz(stwor: Image.Image, tlo: Image.Image, maly: bool) -> Image.Image:
    """Stwór na tle, z miękkim cieniem rzuconym w prawo-dół (od światła)."""
    A = stwor.getchannel('A')
    cien = A.filter(ImageFilter.GaussianBlur(3.5 if not maly else 1.8))
    cien = ImageChops.offset(cien, 3 if not maly else 1, 3 if not maly else 1)
    c = np.asarray(cien, np.float32)[..., None] / 255 * 0.5
    t = np.asarray(tlo, np.float32) * (1 - c)
    wynik = Image.fromarray(t.astype(np.uint8), 'RGB').convert('RGBA')
    wynik.alpha_composite(stwor)
    return wynik.convert('RGB')


def ramka(im: Image.Image) -> Image.Image:
    """Ciemna ramka z fazką (1 px) — złoto dokłada interfejs."""
    a = np.asarray(im, np.float32)
    ciemna = np.array([30, 18, 8], np.float32)
    a[0, :], a[-1, :], a[:, 0], a[:, -1] = ciemna, ciemna, ciemna, ciemna
    a[1, 1:-1] = a[1, 1:-1] * 0.6 + np.array([255, 226, 170]) * 0.4
    a[1:-1, 1] = a[1:-1, 1] * 0.65 + np.array([255, 226, 170]) * 0.35
    a[-2, 1:-1] *= 0.55
    a[1:-1, -2] *= 0.6
    return Image.fromarray(np.clip(a, 0, 255).astype(np.uint8), 'RGB')


def wytnij_kolo(im: Image.Image) -> Image.Image:
    """Okrągły portret do medalionów: gładka maska z 4×, przyciemniony brzeg."""
    w, h = im.size
    duza = Image.new('L', (w * 4, h * 4), 0)
    ImageDraw.Draw(duza).ellipse((0, 0, w * 4 - 1, h * 4 - 1), fill=255)
    maska = duza.resize((w, h), Image.LANCZOS)
    a = np.asarray(im, np.float32)
    yy, xx = np.mgrid[0:h, 0:w]
    rr = np.hypot((xx + 0.5 - w / 2) / (w / 2), (yy + 0.5 - h / 2) / (h / 2))
    a *= (1 - 0.45 * np.clip((rr - 0.78) / 0.22, 0, 1) ** 1.5)[..., None]
    wynik = Image.fromarray(np.clip(a, 0, 255).astype(np.uint8), 'RGB').convert('RGBA')
    wynik.putalpha(maska)
    return wynik


# ————————————————————————————————————————————————— składanie


def portret(sid: str, frakcja: str, pan: Image.Image, rodzaj: str) -> Image.Image:
    rozmiar = {'duzy': DUZY, 'maly': MALY, 'okragly': OKRAGLY}[rodzaj]
    szablon = 'duzy' if rodzaj == 'duzy' else 'maly'
    maly = szablon == 'maly'
    f = FRAKCJA[frakcja]
    mistrz = Image.open(MISTRZOWIE / f'{sid}.png').convert('RGBA')
    stw = w_swietle(wytnij(mistrz, kadr(sid, szablon), rozmiar), f, maly)
    im = zloz(stw, tlo_frakcji(pan, f, rozmiar, maly), maly)
    return wytnij_kolo(im) if rodzaj == 'okragly' else ramka(im)


def pomiar(ids: list[str], plik: str):
    """Mistrzowie z naniesionym pomiarem: linia oczu, głowa, kadr dużego."""
    ark = Image.new('RGBA', (6 * 256, ((len(ids) + 5) // 6) * 256), (90, 110, 140, 255))
    d = ImageDraw.Draw(ark)
    for i, sid in enumerate(ids):
        ox, oy = (i % 6) * 256, (i // 6) * 256
        ark.alpha_composite(Image.open(MISTRZOWIE / f'{sid}.png').convert('RGBA'), (ox, oy))
        hx, oczy, glowa = GLOWA[sid]
        d.line([(ox + hx - glowa / 2, oy + oczy), (ox + hx + glowa / 2, oy + oczy)], fill=(255, 255, 0, 255))
        l, g, p, dl = kadr(sid, 'duzy')
        d.rectangle([ox + l, oy + g, ox + p, oy + dl], outline=(255, 80, 80, 255))
        l, g, p, dl = kadr(sid, 'maly')
        d.rectangle([ox + l, oy + g, ox + p, oy + dl], outline=(80, 255, 120, 255))
        d.text((ox + 3, oy + 3), sid, fill=(255, 255, 0, 255))
    ark.save(plik)
    print(f'pomiar: {plik}')


def main():
    p = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    p.add_argument('--arkusz', help='zapisz podgląd całego kompletu (duże, małe, małe przy 28 px)')
    p.add_argument('--pomiar', help='zapisz mistrzów z naniesionym pomiarem głowy i kadrem')
    p.add_argument('ids', nargs='*', help='tylko te stwory (domyślnie wszystkie)')
    args = p.parse_args()

    fr = frakcje()
    brak = set(fr) ^ set(GLOWA)
    if brak:
        raise SystemExit(f'GLOWA i factions.ts się rozjechały: {sorted(brak)}')
    if args.pomiar:
        pomiar([s for s in fr if not args.ids or s in args.ids], args.pomiar)
    WYJSCIE.mkdir(parents=True, exist_ok=True)
    panoramy = {f: panorama(f) for f in set(fr.values())}
    gotowe = []
    for sid, f in fr.items():
        if args.ids and sid not in args.ids:
            continue
        d = portret(sid, f, panoramy[f], 'duzy')
        m = portret(sid, f, panoramy[f], 'maly')
        d.save(WYJSCIE / f'{sid}.png', optimize=True)
        m.save(WYJSCIE / f'{sid}-m.png', optimize=True)
        portret(sid, f, panoramy[f], 'okragly').save(WYJSCIE / f'{sid}-o.png', optimize=True)
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
