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
  2. JEDNO TŁO I JEDNO ŚWIATŁO NA FRAKCJĘ. Tło to ten sam wycinek
     malowanego krajobrazu miasta (`public/miasto/tlo-<f>.png`: niebo,
     horyzont, grunt) dla wszystkich stworów frakcji, ocieplony pod
     pergamin i drewno, na których portret leży w grze.
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
    '00193': (195, 157, 90),  # Pyroko — głowa i tułów to jedna bryła: mierzona twarz z przodu
    '00020': (78, 82, 40),  # Flamir — mała ptasia głowa z dziobem (bez grzebienia)
    '00218': (100, 56, 125),  # Aquino
    '00030': (172, 118, 105),  # Torrenar — pysk w czaszce-hełmie (bez płyt karku)
    '00096': (160, 139, 90),  # Verdiko — kula głowy (bez kiełka)
    '00227': (118, 72, 45),  # Silvena — twarz pod koroną płatków
    # Grota
    '00246': (162, 54, 38),  # Glacyn — głowa na długiej szyi
    '00002': (113, 107, 85),  # Sporex — twarz pod kapeluszem płatków
    '00263': (130, 76, 65),  # Cindro — twarz w kapturze (bez uszu)
    '00250': (112, 61, 50),  # Sporina — główka nad strąkiem
    '00220': (150, 66, 45),  # Aquator — głowa z dziobem
    '00196': (128, 100, 96),  # Vulkaron — maska: czerwone „brwi" jako linia oczu
    # Zbocze
    '00074': (185, 107, 60),  # Bazalt — głowa w grzywie
    '00058': (130, 50, 88),  # Ashko — puszysta głowa z maską
    '00095': (128, 70, 96),  # Obsydian — bez twarzy: biały trzon jako głowa
    '00023': (178, 103, 70),  # Cynder
    '00077': (114, 79, 50),  # Lawina — hełm z czerwonymi oczami
    '00041': (118, 66, 80),  # Sadzin — głowa bez grzebienia
}

# Bok kadru w wielkościach głowy i położenie oczu (ułamek wysokości od góry).
# Runda 2 (1.8 głowy) przegrała, bo stwór „pływał mały na środku kafla".
# W Heroes popiersie WYPEŁNIA portret i rama tnie je bez litości: 1.3 głowy
# daje głowę na ~75% wysokości, ramiona ucięte dolną krawędzią, a boki
# głowy (uszy, grzebień, kolce) mogą wyjść za ramę. Oczy na ~0.4.
# Mały portret jest jeszcze ciaśniejszy — przy 26 px liczy się tylko twarz.
#
# Runda 3: „odległość kamery różna w rzędzie" — kadr liczył się z głowy
# zmierzonej niekonsekwentnie (u Pyroko cała bryła, u Flamira głowa z piersią).
# Teraz `GLOWA` to zawsze czaszka od czubka (bez czubów, uszu, płatków) do
# brody, i ŻADNEGO dolnego progu boku: głowa ma w każdym portrecie tę samą
# wysokość i te same oczy, nawet jeśli mała głowa wymaga powiększenia ~2×.
# Duży: głowa ~57% wysokości, ramiona do dolnej krawędzi. Mały: sama twarz,
# ~80% wysokości — przy 28 px liczy się tylko ona.
SZABLON_BOK = {'duzy': 1.75, 'maly': 1.25}
SZABLON_OCZY = {'duzy': 0.40, 'maly': 0.44}
MIN_BOK = {'duzy': 0, 'maly': 0}

# ————————————————————————————————————————————————— tło i światło frakcji
#
# Jedno tło na frakcję: kwadratowy wycinek malowanego krajobrazu miasta
# (`public/miasto/tlo-<f>.png`, 960 × 596, bez budynków) — niebo, horyzont
# i grunt. Runda 3: jasna łąka w rozproszonym świetle dnia gryzła się
# z mahoniem i złotem paneli i była płaska obok stwora. Teraz tło jest
# ciemniejsze, cieplejsze i rozmyte jak głębia ostrości — stwór odrywa się od
# niego, a barwy siedzą w palecie drewna.
#   `okno`   — (lewo, góra, bok) wycinka w pikselach krajobrazu;
#   `cieplo` — barwa przemnożenia, `moc` — ile go.
FRAKCJA = {
    # Bór: niebo, pasmo gór, las i skraj łąki.
    'bor': {'okno': (470, 0, 210), 'cieplo': (255, 200, 140), 'moc': 0.6},
    # Grota: sklepienie, snop światła, jezioro.
    'grota': {'okno': (400, 0, 230), 'cieplo': (255, 196, 150), 'moc': 0.55},
    # Zbocze: zachód słońca, wulkan, pole lawy.
    'zbocze': {'okno': (540, 0, 220), 'cieplo': (255, 205, 160), 'moc': 0.4},
}
# Światło kluczowe i obwódka na stworze — z palety interfejsu (ciepłe złoto
# ram i kremowy napis na drewnie), wspólne dla wszystkich: stwory stoją
# w świetle TEGO interfejsu, a nie każdy w swoim.
SWIATLO = (255, 214, 150)
# Tło małych portretów — JEDNO dla wszystkich (panel mapy miesza frakcje;
# trzy różne, głośne tła w jednym rzędzie 28 px to był szum): rozmyty
# krajobraz Boru przełożony na dwa tony ciemnego drewna i złota ramy.
TLO_MALE = {'frakcja': 'bor', 'okno': (470, 0, 210), 'ciemny': (38, 22, 10), 'jasny': (176, 124, 66)}


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


# ————————————————————————————————————————————————— tło


def krajobraz(frakcja: str) -> Image.Image:
    """Malowany krajobraz miasta frakcji — bez budynków (bryły Groty i Zbocza
    to przemalowany komplet Boru i na tle portretu wyglądały jak obcy las)."""
    return Image.open(MIASTO / f'tlo-{frakcja}.png').convert('RGB')


def tlo_frakcji(kraj: Image.Image, f: dict, rozmiar: tuple[int, int]) -> Image.Image:
    """Tło dużego portretu: wycinek krajobrazu frakcji, ciemny, ciepły, rozmyty."""
    w, h = rozmiar
    lewo, gora, bok = f['okno']
    kawal = kraj.crop((lewo, gora, lewo + bok, gora + bok)).resize((w, h), Image.LANCZOS)
    # Głębia ostrości: dal miękka, ostry jest tylko stwór.
    kawal = kawal.filter(ImageFilter.GaussianBlur(2.2))
    a = np.asarray(kawal).astype(np.float32) / 255
    szar = (a * np.array([0.3, 0.55, 0.15])).sum(axis=2, keepdims=True)
    a = szar + (a - szar) * 0.7
    cieplo = np.array(f['cieplo'], np.float32) / 255
    a = a * (1 - f['moc'] + f['moc'] * cieplo)
    # Ciemniej niż krajobraz miasta i światło z góry-lewa, jak na stworze.
    yy = np.linspace(0, 1, h)[:, None, None]
    xx = np.linspace(0, 1, w)[None, :, None]
    swiatlo = 0.78 - 0.16 * xx - 0.3 * yy**1.4
    return Image.fromarray((np.clip(a * swiatlo, 0, 1) * 255).astype(np.uint8), 'RGB')


def tlo_male(kraj: Image.Image, rozmiar: tuple[int, int]) -> Image.Image:
    """Wspólne tło małych portretów: rozmyty krajobraz w dwóch tonach drewna."""
    w, h = rozmiar
    lewo, gora, bok = TLO_MALE['okno']
    kawal = kraj.crop((lewo, gora, lewo + bok, gora + bok)).resize((w, h), Image.LANCZOS)
    kawal = kawal.filter(ImageFilter.GaussianBlur(2.0))
    a = np.asarray(kawal).astype(np.float32) / 255
    jas = (a * np.array([0.3, 0.55, 0.15])).sum(axis=2, keepdims=True)
    ciem = np.array(TLO_MALE['ciemny'], np.float32) / 255
    jasn = np.array(TLO_MALE['jasny'], np.float32) / 255
    a = ciem + (jasn - ciem) * np.clip(jas * 1.1, 0, 1)
    yy = np.linspace(0, 1, h)[:, None, None]
    xx = np.linspace(0, 1, w)[None, :, None]
    a *= 0.95 - 0.25 * xx - 0.3 * yy
    return Image.fromarray((np.clip(a, 0, 1) * 255).astype(np.uint8), 'RGB')


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
    swiatlo = np.array(SWIATLO, np.float32)[None, None, :] / 255

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
    rgb = rgb + (swiatlo - rgb) * krawedz * 0.5
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
    """Cień wewnętrzny przy krawędzi: obraz siedzi POD złotą fazką ramy.

    Runda 3 miała tu jasną fazkę od góry-lewa — obraz wyglądał na leżący NA
    ramie. Złota rama interfejsu rzuca cień do środka, mocniejszy od góry
    (światło pada z góry), więc brzegi obrazu ciemnieją, a 1 px przy samej
    krawędzi jest prawie czarny.
    """
    a = np.asarray(im, np.float32)
    h, w = a.shape[:2]
    pas = max(3.0, w * 0.09)
    yy, xx = np.mgrid[0:h, 0:w].astype(np.float32)
    od_gory = np.clip(yy / (pas * 1.4), 0, 1)
    od_lewej = np.clip(xx / pas, 0, 1)
    od_prawej = np.clip((w - 1 - xx) / pas, 0, 1)
    od_dolu = np.clip((h - 1 - yy) / pas, 0, 1)
    cien = (0.45 + 0.55 * od_gory**0.8) * (0.6 + 0.4 * od_lewej) * (0.6 + 0.4 * od_prawej) * (0.65 + 0.35 * od_dolu)
    a = a * cien[..., None]
    ciemna = np.array([22, 12, 5], np.float32)
    a[0, :], a[-1, :], a[:, 0], a[:, -1] = ciemna, ciemna, ciemna, ciemna
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


def portret(sid: str, frakcja: str, kraj: Image.Image, rodzaj: str) -> Image.Image:
    rozmiar = {'duzy': DUZY, 'maly': MALY, 'okragly': OKRAGLY}[rodzaj]
    szablon = 'duzy' if rodzaj == 'duzy' else 'maly'
    maly = szablon == 'maly'
    f = FRAKCJA[frakcja]
    mistrz = Image.open(MISTRZOWIE / f'{sid}.png').convert('RGBA')
    stw = w_swietle(wytnij(mistrz, kadr(sid, szablon), rozmiar), f, maly)
    tlo = tlo_male(krajobraz(TLO_MALE['frakcja']), rozmiar) if maly else tlo_frakcji(kraj, f, rozmiar)
    im = zloz(stw, tlo, maly)
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
    panoramy = {f: krajobraz(f) for f in set(fr.values())}
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
