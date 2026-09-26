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

Dlatego kadr kotwiczy się w OCZACH:
  - `TWARZ[id]` = środek między oczami (w pikselach mistrza 256 × 256;
    stwór z jednym widocznym okiem — to oko; bez twarzy — środek „twarzy")
    i szerokość twarzy;
  - środek oczu stoi zawsze w poziomym środku kadru i na `OCZY_Y` jego
    wysokości; skala jest taka, żeby twarz zajmowała zawsze `TWARZ_SZER`
    szerokości kadru;
  - jedyny wyjątek: czubek głowy (`TWARZ[id][3]`) musi się zmieścić —
    wtedy kamera odjeżdża dla tego jednego stwora. Grzebień, uszy, kiełek
    mogą wychodzić za ramę.

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
poprawić jego wiersz w `TWARZ` (`--pomiar` pokazuje, gdzie skrypt widzi oczy).
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
TWARZ: dict[str, tuple[float, float, float, float]] = {
    # Bór
    '00193': (195, 156, 100, 104),  # Pyroko — twarz z przodu bryły; „głowa" = przód bryły
    '00020': (72, 78, 56, 62),  # Flamir — oko dorysowane (`OKO`), głowa z dziobem
    '00218': (102, 55, 112, 4),  # Aquino
    '00030': (176, 124, 112, 60),  # Torrenar — jedno oko; grzbiet hełmu jak grzebień może wyjść za ramę
    '00096': (166, 139, 100, 95),  # Verdiko
    '00227': (119, 72, 58, 42),  # Silvena — twarz pod koroną płatków
    # Grota
    '00246': (156, 55, 50, 40),  # Glacyn — jedno oko, głowa z pyskiem
    '00002': (111, 107, 106, 85),  # Sporex
    '00263': (131, 76, 66, 40),  # Cindro
    '00250': (111, 61, 48, 38),  # Sporina
    '00220': (150, 66, 66, 45),  # Aquator — jedno oko, głowa z dziobem
    '00196': (120, 118, 116, 62),  # Vulkaron — „twarz" to pierścień z paszczą pod koroną
    # Zbocze
    '00074': (182, 110, 64, 80),  # Bazalt — jedno oko, głowa w grzywie
    '00058': (134, 52, 60, 6),  # Ashko — maska w puszystej głowie
    '00095': (128, 62, 64, 6),  # Obsydian — bez twarzy: szczyt białego trzonu
    '00023': (161, 102, 92, 60),  # Cynder
    '00077': (114, 79, 50, 52),  # Lawina — czerwone oczy w hełmie
    '00041': (112, 66, 66, 42),  # Sadzin
}

# Oczy, których na mistrzu nie widać przy wielkości portretu (Flamir ma
# oko-kreskę 2 px). Portret dorysowuje je w pikselach mistrza: (x, y, promień).
OKO: dict[str, tuple[float, float, float]] = {
    '00020': (72, 76, 3.6),
}

# Szablon: twarz zajmuje `TWARZ_SZER` szerokości kadru, oczy na `OCZY_Y`
# wysokości od góry, czubek głowy nie wyżej niż `ZAPAS` od górnej krawędzi.
# Mały portret jest ciaśniejszy — przy 28–50 px liczy się tylko twarz.
TWARZ_SZER = {'duzy': 0.56, 'maly': 0.7}
OCZY_Y = {'duzy': 0.40, 'maly': 0.42}
ZAPAS = {'duzy': 0.05, 'maly': 0.03}

# ————————————————————————————————————————————————— tło i światło
#
# Jedno tło dla wszystkich: ciemny, ciepły pergamin ze światłem z góry-lewa,
# ku brzegom wpadający w drewno ram.
TLO = {'srodek': (178, 134, 84), 'brzeg': (62, 36, 16)}
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
    szablon = 'duzy' if rodzaj == 'duzy' else 'maly'
    ox, oy, szer, czubek = TWARZ[sid]
    bok = szer / TWARZ_SZER[szablon]
    # Czubek głowy musi być w kadrze: jeśli nie jest, kamera odjeżdża.
    bok = max(bok, (oy - czubek) / (OCZY_Y[szablon] - ZAPAS[szablon]))
    gora = oy - bok * OCZY_Y[szablon]
    return (ox - bok / 2, gora, ox + bok / 2, gora + bok)


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
    obrys = A.filter(ImageFilter.MaxFilter(2 * grub + 1)).filter(ImageFilter.GaussianBlur(0.5))
    o = np.asarray(obrys, np.float32)[..., None] / 255 * 0.9
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
        x, y, szer, czubek = TWARZ[sid]
        d.ellipse([ox + x - 3, oy + y - 3, ox + x + 3, oy + y + 3], outline=(255, 255, 0, 255))
        d.line([(ox + x - szer / 2, oy + y), (ox + x + szer / 2, oy + y)], fill=(255, 255, 0, 255))
        d.line([(ox + x - 20, oy + czubek), (ox + x + 20, oy + czubek)], fill=(0, 255, 255, 255))
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
    brak = set(fr) ^ set(TWARZ)
    if brak:
        raise SystemExit(f'TWARZ i factions.ts się rozjechały: {sorted(brak)}')
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
