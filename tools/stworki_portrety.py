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

  1. JEDEN SZABLON KADRU. Każdy stwór ma w tabeli `GLOWA` ręcznie zmierzone
     pudełko głowy (w pikselach mistrza 256 × 256), a kadr liczy się z niego
     jednym wzorem: cała głowa w kadrze, ten sam zapas nad czubkiem, głowa
     na ~2/3 szerokości ramki — ta sama odległość kamery w całym rzędzie.
     Stwory bez wyraźnej głowy (Obsydian, bryła Pyroko) mierzy się tak, żeby
     w kadrze było ich „popiersie"; brakujące oko dorysowuje `OCZY`.
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
GLOWA: dict[str, tuple[float, float, float, float]] = {
    # Bór
    '00193': (120, 60, 250, 210),  # Pyroko — głowa i tułów to jedna bryła: przód bryły z twarzą
    '00020': (42, 60, 104, 108),  # Flamir — głowa z dziobem (grzebień poza pudełkiem)
    '00218': (45, 4, 170, 132),  # Aquino — kula głowy
    '00030': (95, 10, 250, 170),  # Torrenar — czaszka-hełm z pyskiem
    '00096': (100, 95, 205, 185),  # Verdiko — kula głowy (kiełek poza pudełkiem)
    '00227': (90, 40, 158, 100),  # Silvena — twarz z włosami-płatkami
    # Grota
    '00246': (140, 40, 190, 78),  # Glacyn — głowa z pyskiem (pętla czuba poza pudełkiem)
    '00002': (60, 85, 170, 170),  # Sporex — twarz pod kapeluszem płatków
    '00263': (95, 25, 180, 115),  # Cindro — głowa w kapturze z uszami
    '00250': (88, 30, 155, 95),  # Sporina — główka z uszami
    '00220': (125, 45, 196, 95),  # Aquator — głowa z dziobem
    '00196': (70, 60, 190, 225),  # Vulkaron — korona i pierścień-twarz
    # Zbocze
    '00074': (155, 80, 225, 145),  # Bazalt — głowa w grzywie
    '00058': (70, 5, 195, 95),  # Ashko — puszysta głowa z maską
    '00095': (80, 20, 180, 150),  # Obsydian — bez głowy: trzon i szczyt bryły jak popiersie
    '00023': (132, 60, 228, 140),  # Cynder
    '00077': (80, 50, 150, 105),  # Lawina — hełm z pierścieniem
    '00041': (85, 40, 150, 145),  # Sadzin — głowa z dziobem i koralami
}

# Oczy, których na mistrzu nie widać przy wielkości portretu (Flamir ma
# oko-kreskę 2 px). Portret dorysowuje je w pikselach mistrza: (x, y, promień).
# Runda 4: „Flamir to dziób i pierś, bez oka" — rzędu nie da się czytać,
# kiedy jeden stwór nie patrzy.
OCZY: dict[str, tuple[float, float, float]] = {
    '00020': (72, 76, 3.6),
}

# Szablon — JEDNO ujęcie „średniego planu" dla wszystkich:
#   głowa (pudełko z `GLOWA`) w całości w kadrze, zawsze z tym samym
#   zapasem nad czubkiem (`ZAPAS`), szeroka na `SZEROKOSC` ramki, a gdy
#   głowa jest wysoka i wąska — wysoka na najwyżej `WYSOKOSC` ramki.
# Runda 4 normowała wielkością „czaszki od czubka do brody" i przy dziwnej
# anatomii to się sypało: Pyroko (bryła) wychodził obcięty, Flamir jako dziób
# z piersią, Obsydian jako zbliżenie. Pudełko głowy mierzone ręcznie na
# arkuszu (`--pomiar`) + jeden wzór = ta sama odległość kamery w rzędzie.
SZEROKOSC = {'duzy': 0.66, 'maly': 0.74}
WYSOKOSC = {'duzy': 0.72, 'maly': 0.8}
ZAPAS = {'duzy': 0.12, 'maly': 0.08}


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
# Wspólny ton dużych teł: krajobraz każdej frakcji przekładany na tę samą
# skalę ciepłego brązu i złota (`CIEN_TLA` → `SWIATLO_TLA`), z `BARWA_TLA`
# oryginalnej barwy — w rundzie 4 Grota była sinoszara, Bór oliwkowy,
# Zbocze brązowe i rząd mieszanej armii wyglądał jak trzy komplety.
CIEN_TLA = (46, 28, 14)
SWIATLO_TLA = (214, 168, 108)
BARWA_TLA = 0.2
# Tło małych portretów — JEDNO dla wszystkich: ciepły pergamin z winietą
# w drewno. Runda 4 miała tu prawie czerń i ciemne stwory (Lawina,
# Vulkaron) w niej znikały.
TLO_MALE = {'srodek': (226, 190, 136), 'brzeg': (122, 80, 40)}


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
    """Tło dużego portretu: krajobraz frakcji, rozmyty, we wspólnym ciepłym tonie."""
    w, h = rozmiar
    lewo, gora, bok = f['okno']
    kawal = kraj.crop((lewo, gora, lewo + bok, gora + bok)).resize((w, h), Image.LANCZOS)
    # Głębia ostrości: dal miękka, ostry jest tylko stwór.
    kawal = kawal.filter(ImageFilter.GaussianBlur(2.2))
    a = np.asarray(kawal).astype(np.float32) / 255
    jas = (a * np.array([0.3, 0.55, 0.15])).sum(axis=2, keepdims=True)
    cien = np.array(CIEN_TLA, np.float32) / 255
    swiatlo_tla = np.array(SWIATLO_TLA, np.float32) / 255
    # Jasność wyrównana między frakcjami (Grota jest ciemną jaskinią, Bór
    # słoneczną łąką) — średnia zawsze ta sama, zostaje tylko rysunek światła.
    jas = jas * (0.5 / max(float(jas.mean()), 1e-3))
    ton = cien + (swiatlo_tla - cien) * np.clip(jas, 0, 1)
    # Odrobina własnej barwy krajobrazu (niebo, lawa, las) — ale w tonie.
    a = ton * (1 - BARWA_TLA) + a * (ton.mean() / max(a.mean(), 1e-3)) * BARWA_TLA
    yy = np.linspace(0, 1, h)[:, None, None]
    xx = np.linspace(0, 1, w)[None, :, None]
    a = a * (1.0 - 0.18 * xx - 0.28 * yy**1.4)
    return Image.fromarray((np.clip(a, 0, 1) * 255).astype(np.uint8), 'RGB')


def tlo_male(rozmiar: tuple[int, int]) -> Image.Image:
    """Wspólne tło małych portretów: pergamin ze światłem z góry-lewa i winietą w drewno."""
    w, h = rozmiar
    yy, xx = np.mgrid[0:h, 0:w].astype(np.float32)
    rr = np.hypot((xx - w * 0.42) / w, (yy - h * 0.36) / h)
    t = np.clip((rr - 0.12) / 0.55, 0, 1)[..., None] ** 1.2
    srodek = np.array(TLO_MALE['srodek'], np.float32)
    brzeg = np.array(TLO_MALE['brzeg'], np.float32)
    a = srodek + (brzeg - srodek) * t
    # Faktura papieru: miękki szum w niskiej częstotliwości — bez niego tło
    # jest płaskim gradientem z arkusza stylów.
    rng = np.random.default_rng(7)
    szum = Image.fromarray((rng.random((h // 3 + 1, w // 3 + 1)) * 255).astype(np.uint8))
    szum = np.asarray(szum.resize((w, h), Image.BICUBIC).filter(ImageFilter.GaussianBlur(1)), np.float32) / 255
    a = a * (0.94 + 0.12 * szum[..., None])
    return Image.fromarray(np.clip(a, 0, 255).astype(np.uint8), 'RGB')


# ————————————————————————————————————————————————— stwór


def kadr(sid: str, rodzaj: str) -> tuple[float, float, float, float]:
    """Pudełko kadru (lewo, góra, prawo, dół) w pikselach mistrza — z szablonu."""
    x0, y0, x1, y1 = GLOWA[sid]
    bok = max((x1 - x0) / SZEROKOSC[rodzaj], (y1 - y0) / WYSOKOSC[rodzaj])
    gora = y0 - bok * ZAPAS[rodzaj]
    sx = (x0 + x1) / 2
    return (sx - bok / 2, gora, sx + bok / 2, gora + bok)


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
    """Stwór na tle, z miękkim cieniem rzuconym w prawo-dół (od światła).

    Mały portret dostaje jeszcze cienki ciemny kontur wokół sylwetki: na
    jasnym pergaminie jasne stwory (Aquino, Silvena) inaczej się w nim
    rozpływają, a ciemne i tak się odcinają.
    """
    A = stwor.getchannel('A')
    if maly:
        obrys = A.filter(ImageFilter.MaxFilter(3)).filter(ImageFilter.GaussianBlur(0.6))
        o = np.asarray(obrys, np.float32)[..., None] / 255 * 0.55
        t = np.asarray(tlo, np.float32)
        t = t * (1 - o) + np.array([40, 22, 8], np.float32) * o
        tlo = Image.fromarray(np.clip(t, 0, 255).astype(np.uint8), 'RGB')
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


def dorysuj_oko(mistrz: Image.Image, x: float, y: float, r: float) -> Image.Image:
    """Oko w stylu reszty stworów: ciemna źrenica z jasnym błyskiem od światła."""
    k = 4
    duzy = mistrz.resize((mistrz.width * k, mistrz.height * k), Image.LANCZOS)
    d = ImageDraw.Draw(duzy)
    X, Y, R = x * k, y * k, r * k
    d.ellipse((X - R * 1.15, Y - R * 1.25, X + R * 1.15, Y + R * 1.25), fill=(60, 30, 18, 255))
    d.ellipse((X - R * 0.9, Y - R, X + R * 0.9, Y + R), fill=(22, 12, 8, 255))
    d.ellipse((X - R * 0.55, Y - R * 0.75, X - R * 0.05, Y - R * 0.25), fill=(255, 248, 230, 255))
    return duzy.resize(mistrz.size, Image.LANCZOS)


def portret(sid: str, frakcja: str, kraj: Image.Image, rodzaj: str) -> Image.Image:
    rozmiar = {'duzy': DUZY, 'maly': MALY, 'okragly': OKRAGLY}[rodzaj]
    szablon = 'duzy' if rodzaj == 'duzy' else 'maly'
    maly = szablon == 'maly'
    f = FRAKCJA[frakcja]
    mistrz = Image.open(MISTRZOWIE / f'{sid}.png').convert('RGBA')
    if sid in OCZY:
        mistrz = dorysuj_oko(mistrz, *OCZY[sid])
    stw = w_swietle(wytnij(mistrz, kadr(sid, szablon), rozmiar), f, maly)
    tlo = tlo_male(rozmiar) if maly else tlo_frakcji(kraj, f, rozmiar)
    im = zloz(stw, tlo, maly)
    return wytnij_kolo(im) if rodzaj == 'okragly' else ramka(im)


def pomiar(ids: list[str], plik: str):
    """Mistrzowie z naniesionym pomiarem: linia oczu, głowa, kadr dużego."""
    ark = Image.new('RGBA', (6 * 256, ((len(ids) + 5) // 6) * 256), (90, 110, 140, 255))
    d = ImageDraw.Draw(ark)
    for i, sid in enumerate(ids):
        ox, oy = (i % 6) * 256, (i // 6) * 256
        ark.alpha_composite(Image.open(MISTRZOWIE / f'{sid}.png').convert('RGBA'), (ox, oy))
        x0, y0, x1, y1 = GLOWA[sid]
        d.rectangle([ox + x0, oy + y0, ox + x1, oy + y1], outline=(255, 255, 0, 255))
        l, g, p, dl = kadr(sid, 'duzy')
        d.rectangle([ox + l, oy + g, ox + p, oy + dl], outline=(255, 80, 80, 255))
        l, g, p, dl = kadr(sid, 'maly')
        d.rectangle([ox + l, oy + g, ox + p, oy + dl], outline=(80, 255, 120, 255))
        d.text((ox + 3, oy + 3), sid, fill=(255, 255, 0, 255))
    ark.save(plik)
    print(f'pomiar: {plik}')


def arkusz(gotowe, plik: str):
    """Arkusz kontrolny w wielkościach z gry: duży przy 94 px (slot ekranu
    bohatera) i mały przy 28 px (panel mapy), na drewnie, w ramkach.
    Ma pokazać, czy odległość kamery jest równa w całym rzędzie."""
    D, M = 94, 28
    kol = 6
    rz = (len(gotowe) + kol - 1) // kol
    cw, ch = D + 14 + M + 14, D + 14
    ark = Image.new('RGB', (kol * cw + 10, rz * ch + 10), (58, 36, 18))
    d = ImageDraw.Draw(ark)
    for i, (sid, duzy, maly) in enumerate(gotowe):
        x, y = (i % kol) * cw + 10, (i // kol) * ch + 10
        d.rectangle([x - 3, y - 3, x + D + 2, y + D + 2], outline=(200, 145, 42), width=3)
        ark.paste(duzy.resize((D, D), Image.LANCZOS), (x, y))
        mx = x + D + 12
        d.rectangle([mx - 1, y - 1, mx + M, y + M], outline=(200, 145, 42), width=1)
        ark.paste(maly.resize((M, M), Image.LANCZOS), (mx, y))
        d.text((mx, y + M + 4), sid, fill=(248, 230, 184))
    ark.save(plik)
    print(f'arkusz: {plik}')


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
        arkusz([(sid, d, m) for sid, d, m in gotowe], args.arkusz)

if __name__ == '__main__':
    main()
