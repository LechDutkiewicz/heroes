#!/usr/bin/env python3
"""Portrety stworów: twarz w środku kadru, jedno tło i jedno światło dla wszystkich.

Po co
-----
Sloty armii (panel na mapie, ekran bohatera, załoga i karta werbunku
w mieście, kolejka tur w bitwie, kampania, wynik) pokazywały CAŁEGO stworka
zmniejszonego do kwadratu: przy 28 px kolorowa plamka z nóżkami. W Heroes 3
portret stwora to osobny obrazek — popiersie przycięte ciasno, w ramce.

Czego nauczyło pięć rund ślepych porównań
-----------------------------------------
Rzędu portretów nie ocenia się po jednym portrecie, tylko po tym, czy
wszystkie są zrobione TĄ SAMĄ KAMERĄ. Każda próba ustawienia kadru po
sylwetce (pudełko stwora, czaszka od czubka do brody, pudełko głowy)
sypała się na dziwnej anatomii: Pyroko to jedna bryła z twarzą z boku,
Flamir ma głowę mniejszą od grzebienia, Obsydian nie ma twarzy wcale.
Krytyk mierzył linię oczu i dostawał 35–60% wysokości ramki.

Dlatego kadr liczy się z ręcznie zmierzonego PUDEŁKA CAŁEJ GŁOWY (`GLOWA`)
jednym wzorem: głowa w całości w kadrze z równym zapasem, na ~60% jego
wysokości, oczy na ~40% od góry. U stworów, których ciało jest głową (bryła
Pyroko, butla Obsydiana), „głowa" to bryła. Wyjątki — środek kadru albo
wypełnienie — są w tabeli przy stworze, a nie w kodzie.

Tło i światło: JEDNO dla wszystkich — ciepła, ciemna winieta pergaminu
przechodząca w drewno (barwy ram i paneli interfejsu), światło kluczowe
z góry-lewa w złocie ram, cienki ciemny kontur wokół każdego stwora (białe
stwory inaczej rozpływały się w jasnym środku tła). Krajobrazy miast za
stworem przegrały: zielona łąka i siny sufit groty biły się z mahoniem ram.

Ostrość: kadr liczony w 4× i zmniejszany Lanczosem, potem lekka maska
wyostrzająca — ramy interfejsu są ostre i miękki obraz obok nich wygląda
na rozmazany. Pliki mają wielkości, w jakich gra je pokazuje (Phaser
zmniejsza bez mipmap i każde zmniejszenie w grze znów zmiękcza).

Wyjście (`public/portrety/`):
  - `<id>.png`   duży, 96 × 96 — ekran bohatera (94 px), karta werbunku;
  - `<id>-m.png` mały, 50 × 50 — załoga w mieście;
  - `<id>-p.png` najmniejszy, 28 × 28 — panel armii na mapie;
  - `<id>-o.png` okrągły, 56 px — medaliony (kolejka tur, kampania, wynik).
Gra ładuje je jako `pd-`, `pm-`, `pp-`, `po-<id>` (`src/visual/portrety.ts`).

    python3 tools/stworki_portrety.py                   # wszystkie 18
    python3 tools/stworki_portrety.py --arkusz out.png  # arkusz kontrolny w wielkościach z gry
    python3 tools/stworki_portrety.py --pomiar out.png  # mistrzowie z naniesionymi oczami i kadrem

Po przemalowaniu mistrzów wystarczy puścić skrypt; jeśli stwór zmienił pozę,
poprawić jego wiersz w `GLOWA` (`--pomiar` pokazuje pudełko głowy i kadr).
"""

from __future__ import annotations

import argparse
import re
from pathlib import Path

import numpy as np
from PIL import Image, ImageChops, ImageDraw, ImageFilter

KORZEN = Path(__file__).resolve().parent.parent
MISTRZOWIE = KORZEN / 'assets' / 'stworki'
WYJSCIE = KORZEN / 'public' / 'portrety'

ROZMIARY = {
    'duzy': (96, ''),
    'maly': (50, '-m'),
    'panel': (28, '-p'),
    'okragly': (56, '-o'),
}

# ————————————————————————————————————————————————— pomiar twarzy
#
# (oczy x, oczy y, szerokość twarzy, czubek głowy y) w pikselach mistrza.
# Oczy x/y = środek między oczami. Czubek głowy — bez grzebieni, uszu,
# płatków i kiełków (te mogą wyjść za ramę).
GLOWA: dict[str, tuple] = {
    # (lewo, góra, prawo, dół głowy, oczy y[, opcje]) w pikselach mistrza.
    # Głowa = cała głowa z czubem/grzebieniem/uszami, które mają się
    # zmieścić; u stworów, których ciało JEST głową (bryły), cała bryła.
    # Opcje: `x` — środek kadru w poziomie (domyślnie środek głowy),
    # `wyp` — ile wysokości kadru zajmuje głowa (domyślnie `WYPELNIENIE`).
    # Bór
    '00193': (13, 4, 243, 215, 156, {'wyp': 0.84, 'x': 150}),  # Pyroko — cała bryła z twarzą
    '00020': (42, 5, 125, 106, 78),  # Flamir — głowa z grzebieniem i dziobem
    '00218': (45, 4, 170, 132, 55, {'wyp': 0.55, 'x': 122}),  # Aquino — głowa i ramię-kula w kadrze
    '00030': (95, 10, 250, 170, 124),  # Torrenar — czaszka-hełm
    '00096': (100, 95, 205, 185, 139),  # Verdiko — kula głowy (kiełek może wyjść)
    '00227': (88, 25, 160, 100, 72),  # Silvena — twarz z koroną płatków
    # Grota
    '00246': (138, 38, 192, 80, 54),  # Glacyn — głowa z pyskiem
    '00002': (55, 35, 200, 172, 107),  # Sporex — twarz z dolnymi płatkami
    '00263': (100, 20, 178, 118, 76),  # Cindro — głowa w kapturze
    '00250': (88, 30, 155, 92, 61),  # Sporina — główka z uszami
    '00220': (125, 20, 200, 95, 66),  # Aquator — głowa z kolcami i dziobem
    '00196': (70, 55, 190, 225, 118),  # Vulkaron — korona i pierścień-paszcza
    # Zbocze
    '00074': (150, 75, 228, 145, 107),  # Bazalt — głowa w grzywie
    '00058': (70, 5, 195, 95, 52),  # Ashko — puszysta głowa z maską
    '00095': (58, 5, 197, 150, 70, {'wyp': 0.84}),  # Obsydian — bez twarzy: górne 60% bryły
    '00023': (132, 45, 228, 140, 102),  # Cynder
    '00077': (78, 45, 152, 108, 79),  # Lawina — hełm z pierścieniem
    '00041': (85, 35, 152, 145, 66),  # Sadzin — głowa z dziobem i koralami
}

# Oczy, których na mistrzu nie widać przy wielkości portretu (Flamir ma
# oko-kreskę 2 px). Portret dorysowuje je w pikselach mistrza: (x, y, promień).
OKO: dict[str, tuple[float, float, float]] = {
    '00020': (72, 76, 3.6),
}

# Szablon (runda 7, ustalony z koordynatorem po arkuszu kontrolnym):
#   cała głowa w kadrze z równym zapasem (`ZAPAS` z każdej strony), głowa
#   zajmuje `WYPELNIENIE` wysokości kadru (i najwyżej `SZER_MAX` szerokości),
#   oczy na `OCZY_Y` od góry — chyba że wtedy głowa wyszłaby za ramę: zapas
#   ma pierwszeństwo przed linią oczu.
# Runda 6 kotwiczyła w samych oczach i skala z „szerokości twarzy" dawała
# bryłę Pyroko w zbliżeniu, a Verdiko i Silvenę za daleko.
WYPELNIENIE = {'duzy': 0.6, 'maly': 0.7}
SZER_MAX = {'duzy': 0.8, 'maly': 0.86}
OCZY_Y = {'duzy': 0.40, 'maly': 0.42}
ZAPAS = {'duzy': 0.08, 'maly': 0.06}

# ————————————————————————————————————————————————— tło i światło
#
# Jedno tło dla wszystkich: ciemny, ciepły pergamin ze światłem z góry-lewa,
# ku brzegom wpadający w drewno ram.
TLO = {'srodek': (156, 112, 66), 'brzeg': (58, 34, 15)}
# Światło kluczowe i obwódka na stworze — złoto ram i krem napisów.
SWIATLO = (255, 214, 150)
# Kontur wokół stwora — barwa ciemnego brązu z napisów na drewnie.
KONTUR = (34, 18, 6)


def frakcje() -> dict[str, str]:
    """Stwór → frakcja, czytane z `src/data/factions.ts` (jedno źródło prawdy)."""
    tekst = (KORZEN / 'src' / 'data' / 'factions.ts').read_text(encoding='utf-8')
    wynik: dict[str, str] = {}
    obecna = None
    for linia in tekst.splitlines():
        m = re.search(r"\bid: '(\w+)'", linia)
        if m and m.group(1) in ('bor', 'grota', 'zbocze'):
            obecna = m.group(1)
        m = re.search(r"unit\(\d+, '(\d{5})'", linia)
        if m and obecna:
            wynik[m.group(1)] = obecna
    return wynik


def tlo(bok: int) -> Image.Image:
    """Wspólne tło: winieta ciepłego pergaminu w drewno, z fakturą papieru."""
    yy, xx = np.mgrid[0:bok, 0:bok].astype(np.float32) / bok
    rr = np.hypot(xx - 0.4, yy - 0.34)
    t = np.clip((rr - 0.08) / 0.62, 0, 1)[..., None] ** 1.3
    srodek = np.array(TLO['srodek'], np.float32)
    brzeg = np.array(TLO['brzeg'], np.float32)
    a = srodek + (brzeg - srodek) * t
    # Faktura: miękki szum w niskiej częstotliwości, zawsze ten sam (ziarno
    # stałe) i w tej samej skali względem kadru — bez niej tło jest płaskim
    # gradientem z arkusza stylów.
    rng = np.random.default_rng(7)
    szum = Image.fromarray((rng.random((12, 12)) * 255).astype(np.uint8))
    szum = np.asarray(szum.resize((bok, bok), Image.BICUBIC), np.float32) / 255
    a = a * (0.92 + 0.16 * szum[..., None])
    return Image.fromarray(np.clip(a, 0, 255).astype(np.uint8), 'RGB')


# ————————————————————————————————————————————————— kadr


def kadr(sid: str, rodzaj: str) -> tuple[float, float, float, float]:
    """Pudełko kadru (lewo, góra, prawo, dół) w pikselach mistrza — z szablonu."""
    sz = 'duzy' if rodzaj == 'duzy' else 'maly'
    x0, y0, x1, y1, oczy, *reszta = GLOWA[sid]
    opcje = reszta[0] if reszta else {}
    wyp = opcje.get('wyp', WYPELNIENIE['duzy']) * WYPELNIENIE[sz] / WYPELNIENIE['duzy']
    wyp = min(wyp, 0.88)
    zapas = ZAPAS[sz]
    bok = max((y1 - y0) / wyp, (x1 - x0) / SZER_MAX[sz])
    # Głowa musi się zmieścić z zapasem u góry i u dołu.
    bok = max(bok, (y1 - y0) / (1 - 2 * zapas))
    gora = oczy - bok * OCZY_Y[sz]
    gora = min(max(gora, y1 + zapas * bok - bok), y0 - zapas * bok)
    sx = opcje.get('x', (x0 + x1) / 2)
    return (sx - bok / 2, gora, sx + bok / 2, gora + bok)


def wytnij(mistrz: Image.Image, box, bok: int) -> Image.Image:
    """Kadr w 4×, Lanczos w dół. Kadr poza plikiem daje przezroczystość."""
    im = mistrz.transform((bok * 4, bok * 4), Image.EXTENT, box, Image.BICUBIC)
    return im.resize((bok, bok), Image.LANCZOS)


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


def w_swietle(stwor: Image.Image, maly: bool) -> Image.Image:
    """Stwór w świetle interfejsu: mniej połysku, ciepłe światło z góry-lewa."""
    s = np.asarray(stwor).astype(np.float32) / 255
    rgb, alfa = s[..., :3], s[..., 3:4]
    h, w = rgb.shape[:2]
    swiatlo = np.array(SWIATLO, np.float32)[None, None, :] / 255
    kolano = 0.74
    rgb = np.where(rgb > kolano, kolano + (rgb - kolano) * 0.55, rgb)
    szar = (rgb * np.array([0.3, 0.55, 0.15])).sum(axis=2, keepdims=True)
    rgb = szar + (rgb - szar) * 0.9
    yy = np.linspace(0, 1, h)[:, None, None]
    xx = np.linspace(0, 1, w)[None, :, None]
    kier = 1.08 - 0.18 * xx - 0.3 * np.clip(yy - 0.5, 0, 1)
    rgb = rgb * (0.8 + 0.2 * swiatlo) * kier
    # Ciepła obwódka światła na górno-lewych krawędziach sylwetki.
    A = Image.fromarray((alfa[..., 0] * 255).astype(np.uint8), 'L')
    d = 1 if maly else 2
    przes = ImageChops.offset(A, d, d)
    krawedz = np.clip(np.asarray(A, np.float32) - np.asarray(przes, np.float32), 0, 255)
    krawedz = np.asarray(Image.fromarray(krawedz.astype(np.uint8)).filter(ImageFilter.GaussianBlur(0.6)), np.float32)
    krawedz = np.clip(krawedz[..., None] / 255 * 1.4, 0, 1) * (1 - yy * 0.7)
    rgb = rgb + (swiatlo - rgb) * krawedz * 0.45
    return Image.fromarray((np.concatenate([np.clip(rgb, 0, 1), alfa], axis=2) * 255).astype(np.uint8), 'RGBA')


def zloz(stwor: Image.Image, t: Image.Image, bok: int) -> Image.Image:
    """Stwór na tle: cień rzucony w prawo-dół i cienki ciemny kontur sylwetki."""
    A = stwor.getchannel('A')
    grub = 1 if bok < 40 else 2
    cien = ImageChops.offset(A.filter(ImageFilter.GaussianBlur(bok / 36)), grub + 1, grub + 1)
    c = np.asarray(cien, np.float32)[..., None] / 255 * 0.45
    tt = np.asarray(t, np.float32) * (1 - c)
    # Kontur: rozszerzona alfa pod stworem, w ciemnym brązie. Przy jasnych
    # stworach (Aquino, Torrenar, Silvena, Ashko) to on robi sylwetkę.
    obrys = A.filter(ImageFilter.MaxFilter(2 * grub + 1)).filter(ImageFilter.GaussianBlur(0.4))
    o = np.asarray(obrys, np.float32)[..., None] / 255
    tt = tt * (1 - o) + np.array(KONTUR, np.float32) * o
    wynik = Image.fromarray(np.clip(tt, 0, 255).astype(np.uint8), 'RGB').convert('RGBA')
    wynik.alpha_composite(stwor)
    return wynik.convert('RGB')


def ramka(im: Image.Image) -> Image.Image:
    """Cień wewnętrzny przy krawędzi: obraz siedzi POD złotą fazką ramy."""
    a = np.asarray(im, np.float32)
    h, w = a.shape[:2]
    pas = max(3.0, w * 0.09)
    yy, xx = np.mgrid[0:h, 0:w].astype(np.float32)
    od_gory = np.clip(yy / (pas * 1.4), 0, 1)
    od_lewej = np.clip(xx / pas, 0, 1)
    od_prawej = np.clip((w - 1 - xx) / pas, 0, 1)
    od_dolu = np.clip((h - 1 - yy) / pas, 0, 1)
    cien = (0.5 + 0.5 * od_gory**0.8) * (0.65 + 0.35 * od_lewej) * (0.65 + 0.35 * od_prawej) * (0.7 + 0.3 * od_dolu)
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


def portret(sid: str, rodzaj: str) -> Image.Image:
    bok = ROZMIARY[rodzaj][0]
    maly = rodzaj != 'duzy'
    mistrz = Image.open(MISTRZOWIE / f'{sid}.png').convert('RGBA')
    if sid in OKO:
        mistrz = dorysuj_oko(mistrz, *OKO[sid])
    stw = wytnij(mistrz, kadr(sid, rodzaj), bok)
    # Lekkie wyostrzenie po zmniejszeniu — tylko na stworze, tło ma zostać miękkie.
    rgb = stw.convert('RGB').filter(ImageFilter.UnsharpMask(radius=0.8 if bok < 60 else 1.0, percent=70, threshold=2))
    stw = Image.merge('RGBA', (*rgb.split(), stw.getchannel('A')))
    im = zloz(w_swietle(stw, maly), tlo(bok), bok)
    return wytnij_kolo(im) if rodzaj == 'okragly' else ramka(im)


def pomiar(ids: list[str], plik: str):
    """Mistrzowie z naniesionymi oczami, czubkiem głowy i kadrem dużego/małego."""
    ark = Image.new('RGBA', (6 * 256, ((len(ids) + 5) // 6) * 256), (90, 110, 140, 255))
    d = ImageDraw.Draw(ark)
    for i, sid in enumerate(ids):
        ox, oy = (i % 6) * 256, (i // 6) * 256
        ark.alpha_composite(Image.open(MISTRZOWIE / f'{sid}.png').convert('RGBA'), (ox, oy))
        x0, y0, x1, y1, oczy, *_ = GLOWA[sid]
        d.rectangle([ox + x0, oy + y0, ox + x1, oy + y1], outline=(255, 255, 0, 255))
        d.line([(ox + x0, oy + oczy), (ox + x1, oy + oczy)], fill=(0, 255, 255, 255))
        for rodzaj, barwa in (('duzy', (255, 80, 80, 255)), ('maly', (80, 255, 120, 255))):
            l, g, p, dl = kadr(sid, rodzaj)
            d.rectangle([ox + l, oy + g, ox + p, oy + dl], outline=barwa)
        d.text((ox + 3, oy + 3), sid, fill=(255, 255, 0, 255))
    ark.save(plik)
    print(f'pomiar: {plik}')


def arkusz(gotowe, plik: str):
    """Arkusz kontrolny w wielkościach z gry: duży przy 94 px (ekran
    bohatera), mały przy 50 px (miasto) i 28 px (panel mapy), w ramkach.
    Czerwona kreska: linia oczu — ma być na tej samej wysokości wszędzie."""
    D = 94
    kol = 6
    rz = (len(gotowe) + kol - 1) // kol
    cw, ch = D + 12 + 50 + 16, D + 18
    ark = Image.new('RGB', (kol * cw + 10, rz * ch + 10), (58, 36, 18))
    d = ImageDraw.Draw(ark)
    for i, (sid, pliki) in enumerate(gotowe):
        x, y = (i % kol) * cw + 10, (i // kol) * ch + 10
        d.rectangle([x - 3, y - 3, x + D + 2, y + D + 2], outline=(200, 145, 42), width=3)
        ark.paste(pliki['duzy'].resize((D, D), Image.LANCZOS), (x, y))
        d.line([(x - 6, y + D * OCZY_Y['duzy']), (x - 2, y + D * OCZY_Y['duzy'])], fill=(255, 60, 40))
        mx = x + D + 10
        d.rectangle([mx - 2, y - 2, mx + 51, y + 51], outline=(200, 145, 42), width=2)
        ark.paste(pliki['maly'], (mx, y))
        d.rectangle([mx - 1, y + 57, mx + 28, y + 86], outline=(200, 145, 42), width=1)
        ark.paste(pliki['panel'], (mx, y + 58))
        d.text((mx + 32, y + 64), sid[-3:], fill=(248, 230, 184))
    ark.save(plik)
    print(f'arkusz: {plik}')


def main():
    p = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    p.add_argument('--arkusz', help='zapisz arkusz kontrolny w wielkościach z gry')
    p.add_argument('--pomiar', help='zapisz mistrzów z naniesionymi oczami i kadrem')
    p.add_argument('ids', nargs='*', help='tylko te stwory (domyślnie wszystkie)')
    args = p.parse_args()

    fr = frakcje()
    brak = set(fr) ^ set(GLOWA)
    if brak:
        raise SystemExit(f'GLOWA i factions.ts się rozjechały: {sorted(brak)}')
    ids = [s for s in fr if not args.ids or s in args.ids]
    if args.pomiar:
        pomiar(ids, args.pomiar)
    WYJSCIE.mkdir(parents=True, exist_ok=True)
    gotowe = []
    for sid in ids:
        pliki = {}
        for rodzaj, (_, przyrostek) in ROZMIARY.items():
            pliki[rodzaj] = portret(sid, rodzaj)
            pliki[rodzaj].save(WYJSCIE / f'{sid}{przyrostek}.png', optimize=True)
        gotowe.append((sid, pliki))
    print(f'portrety: {len(gotowe)} → {WYJSCIE.relative_to(KORZEN)}/')
    if args.arkusz:
        arkusz(gotowe, args.arkusz)


if __name__ == '__main__':
    main()
