#!/usr/bin/env python3
"""Grafiki menu głównego: tło, logo, drogowskaz, deski, pergamin → `public/menu/`.

Skąd to się bierze
------------------
Tło to `tools/wsad/miasto-kotwica.png` — obraz z modelu graficznego, który
był wzorcem nastroju dla ekranu miasta i do gry nigdy nie wszedł. Jest
namalowany w tym samym stylu co wszystkie budynki, więc menu od pierwszej
klatki wygląda jak ta sama gra, a nie jak osobna strona startowa.

Reszta (logo, drogowskaz, deski, tabliczka, zwój) jest RENDEROWANA tutaj,
piksel po pikselu: słoje drewna z szumu, fazka z mapy wysokości, światło
z tej samej strony co słońce na tle (z prawej u góry). Nie z modelu, bo
w chwili pisania konto API było bez środków (`RESOURCE_EXHAUSTED`) —
`tools/PROMPTY-MENU.md` ma prompty na wersję malowaną, która może te pliki
podmienić pod tymi samymi nazwami.

Napisów na deskach NIE ma w plikach. Kładzie je gra, bo te same deski
niosą raz „Nowa gra", raz „Kampania" (podmenu), a „Wczytaj" bywa
wyszarzone — napis wypalony w obrazku nie umiałby ani jednego, ani drugiego.

Zależności: numpy, scipy, pillow, fonttools, brotli (`pip install …`).

    python3 tools/menu_wczytaj.py            # wszystko do public/menu/
    python3 tools/menu_wczytaj.py --podglad  # plus arkusz podglądu w tools/shots/
"""

import argparse
import io
import math
import shutil
from pathlib import Path

import numpy as np
from fontTools.ttLib import TTFont
from PIL import Image, ImageDraw, ImageFilter, ImageFont
from scipy import ndimage

KORZEN = Path(__file__).resolve().parent.parent
WSAD = KORZEN / 'tools' / 'wsad'
FONTY = KORZEN / 'tools' / 'fonty'
CEL = KORZEN / 'public' / 'menu'

#: Wymiar płótna gry (src/main.ts, SCENE_H w BattleScene).
W, H = 960, 694

#: Kierunek światła: słońce na tle stoi w prawym górnym rogu (cienie drzew
#: padają w lewo w dół). Wektor w układzie obrazka: x w prawo, y W DÓŁ, z do
#: widza. Drewno oświetlone z innej strony niż świat, w którym wisi, od razu
#: wygląda na naklejone.
SWIATLO = np.array([0.55, -0.62, 0.56])
SWIATLO = SWIATLO / np.linalg.norm(SWIATLO)

#: Nadpróbkowanie — rysujemy w 3× i zmniejszamy. Brzegi i słoje wtedy
#: wygładzają się same, bez rozmytej krawędzi, jaką daje blur.
NS = 3


# ————————————————————————————————————————————————————————— narzędzia

def szum(h: int, w: int, sx: float, sy: float, ziarno: int, oktawy: int = 4) -> np.ndarray:
    """Szum wartości: losowa siatka powiększona dwusześciennie, kilka oktaw.

    `sx`/`sy` to wielkość oczka w pikselach — różne w obu osiach dają
    rozciągnięte smugi, czyli dokładnie to, czym są słoje.
    """
    rng = np.random.default_rng(ziarno)
    wynik = np.zeros((h, w), np.float32)
    amp, suma = 1.0, 0.0
    for o in range(oktawy):
        gw = max(2, int(w / sx) + 3)
        gh = max(2, int(h / sy) + 3)
        siatka = rng.random((gh, gw)).astype(np.float32)
        obraz = Image.fromarray((siatka * 255).astype(np.uint8)).resize(
            (int(gw * sx), int(gh * sy)), Image.BICUBIC
        )
        a = np.asarray(obraz, np.float32)[:h, :w] / 255.0
        wynik += a * amp
        suma += amp
        amp *= 0.5
        sx, sy = sx / 2, sy / 2
    return wynik / suma


def lerp(a, b, t):
    return a + (b - a) * t


def smooth(t):
    t = np.clip(t, 0, 1)
    return t * t * (3 - 2 * t)


def kolor(*rgb) -> np.ndarray:
    return np.array(rgb, np.float32) / 255.0


def paleta(t: np.ndarray, stopy: list[tuple[float, np.ndarray]]) -> np.ndarray:
    """Gradient wielostopniowy: t (h×w) → rgb (h×w×3)."""
    wynik = np.zeros(t.shape + (3,), np.float32)
    for (t0, c0), (t1, c1) in zip(stopy, stopy[1:]):
        m = (t >= t0) & (t <= t1)
        u = ((t - t0) / max(1e-6, t1 - t0))[..., None]
        wynik = np.where(m[..., None], c0 + (c1 - c0) * u, wynik)
    wynik = np.where((t < stopy[0][0])[..., None], stopy[0][1], wynik)
    wynik = np.where((t > stopy[-1][0])[..., None], stopy[-1][1], wynik)
    return wynik


def odleglosc(maska: np.ndarray) -> np.ndarray:
    """Odległość każdego piksela wewnątrz maski od jej brzegu."""
    return ndimage.distance_transform_edt(maska > 0.5).astype(np.float32)


def oswietlenie(wys: np.ndarray, sila: float = 1.0) -> np.ndarray:
    """Cieniowanie Lamberta z mapy wysokości — to ono robi z płaskiej plamy fazkę."""
    gy, gx = np.gradient(wys)
    n = np.dstack([-gx * sila, -gy * sila, np.ones_like(wys)])
    n /= np.linalg.norm(n, axis=2, keepdims=True)
    return np.clip((n * SWIATLO).sum(axis=2), 0, 1)


def rgba(rgb: np.ndarray, a: np.ndarray) -> Image.Image:
    arr = np.dstack([np.clip(rgb, 0, 1), np.clip(a, 0, 1)])
    return Image.fromarray((arr * 255 + 0.5).astype(np.uint8), 'RGBA')


def zmniejsz(im: Image.Image) -> Image.Image:
    return im.resize((im.width // NS, im.height // NS), Image.LANCZOS)


def cien(im: Image.Image, dx: int, dy: int, rozmycie: float, moc: float, margines: int) -> Image.Image:
    """Dokłada pod obrazkiem miękki cień rzucony (w lewo w dół — od słońca)."""
    w, h = im.size
    wynik = Image.new('RGBA', (w + margines * 2, h + margines * 2), (0, 0, 0, 0))
    a = im.split()[3]
    plama = Image.new('L', wynik.size, 0)
    plama.paste(a, (margines + dx, margines + dy))
    plama = plama.filter(ImageFilter.GaussianBlur(rozmycie)).point(lambda v: int(v * moc))
    ciemny = Image.new('RGBA', wynik.size, (28, 16, 8, 0))
    ciemny.putalpha(plama)
    wynik.alpha_composite(ciemny)
    wynik.alpha_composite(im, (margines, margines))
    return wynik


# ————————————————————————————————————————————————————————— drewno

JASNE = kolor(244, 202, 132)
SREDNIE = kolor(214, 152, 82)
CIEMNE = kolor(156, 98, 48)
BARDZO_CIEMNE = kolor(78, 44, 20)

#: Margines wokół kształtu w nadpróbkowanym obrazku. Bez niego kształt
#: dotyka krawędzi tablicy, transformata odległości uznaje brzeg tablicy
#: za „wnętrze" i fazka znika wzdłuż całego górnego i dolnego boku.
P = 3 * NS


def slojeDeski(h: int, w: int, ziarno: int, pion: bool = False) -> np.ndarray:
    """Faktura deski: słoje wzdłuż dłuższego boku, sęk, przebarwienia.

    Słoje to nie paski. To pierścienie przyrostów przecięte piłą — linie
    falują, zagęszczają się przy sęku i mają różną grubość. Z samego szumu
    wychodzi marmur; z samych sinusów — tapeta. Dopiero sinus ze
    współrzędną przesuniętą szumem daje drewno.
    """
    if pion:
        return slojeDeski(w, h, ziarno).transpose(1, 0, 2)
    yy, xx = np.mgrid[0:h, 0:w].astype(np.float32)
    zakl = szum(h, w, 140 * NS, 22 * NS, ziarno, 3) * 26 * NS
    drobny = szum(h, w, 60 * NS, 3 * NS, ziarno + 1, 3)
    # Sęk: przesuwa słoje wokół siebie, jak w prawdziwej desce.
    rng = np.random.default_rng(ziarno)
    kx, ky = rng.uniform(0.25, 0.75) * w, rng.uniform(0.3, 0.7) * h
    d = np.hypot((xx - kx) / 2.6, yy - ky)
    zakl += 9 * NS * np.exp(-d / (7 * NS)) * np.sign(yy - ky + 0.01)
    faza = (yy + zakl) / (5.2 * NS)
    pierscienie = 0.5 + 0.5 * np.sin(faza * math.pi)
    pierscienie = pierscienie ** 3
    t = 0.72 - 0.24 * pierscienie + (drobny - 0.5) * 0.22
    plamy = szum(h, w, 90 * NS, 40 * NS, ziarno + 2, 2)
    t += (plamy - 0.5) * 0.26
    sek = np.exp(-(d / (3.4 * NS)) ** 2)
    t = t * (1 - sek * 0.8)
    return paleta(np.clip(t, 0, 1), [(0.0, BARDZO_CIEMNE), (0.3, CIEMNE), (0.62, SREDNIE), (1.0, JASNE)])


def ksztaltStrzalki(w: int, h: int, grot: float, ziarno: int) -> np.ndarray:
    """Maska deski-strzałki: prosty lewy koniec, grot z prawej, lekko nierówne brzegi."""
    im = Image.new('L', (w, h), 0)
    d = ImageDraw.Draw(im)
    g = grot
    r = 5 * NS
    pkt = [(P + r, P), (w - g, P), (w - P, h / 2), (w - g, h - P), (P + r, h - P), (P, h - P - r), (P, P + r)]
    d.polygon(pkt, fill=255)
    maska = np.asarray(im, np.float32) / 255
    # Ręcznie cięty brzeg: próg na masce rozmytej z szumem — krawędź faluje
    # o ułamek piksela, a nie jest linią z linijki.
    rozm = ndimage.gaussian_filter(maska, 1.6 * NS)
    fal = szum(h, w, 18 * NS, 18 * NS, ziarno + 7, 2) - 0.5
    return (rozm + fal * 0.22 > 0.5).astype(np.float32)


def ksztaltProstokata(w: int, h: int, r: int, ziarno: int) -> np.ndarray:
    im = Image.new('L', (w, h), 0)
    ImageDraw.Draw(im).rounded_rectangle((P, P, w - 1 - P, h - 1 - P), r, fill=255)
    maska = np.asarray(im, np.float32) / 255
    rozm = ndimage.gaussian_filter(maska, 1.4 * NS)
    fal = szum(h, w, 18 * NS, 18 * NS, ziarno + 7, 2) - 0.5
    return (rozm + fal * 0.2 > 0.5).astype(np.float32)


def gwozdz(rgb: np.ndarray, a: np.ndarray, cx: float, cy: float, r: float):
    """Łebek gwoździa: ciemne żelazo, blik od słońca, rdzawa obwódka."""
    h, w = a.shape
    yy, xx = np.mgrid[0:h, 0:w].astype(np.float32)
    d = np.hypot(xx - cx, yy - cy)
    obw = smooth((r * 1.45 - d) / (0.8 * NS))
    rgb[:] = lerp(rgb, rgb * 0.55 + kolor(60, 30, 10) * 0.2, obw[..., None] * 0.8)
    m = smooth((r - d) / (0.7 * NS))
    wys = np.sqrt(np.clip(1 - (d / r) ** 2, 0, 1))
    sw = oswietlenie(wys * r, 1.0)
    metal = lerp(kolor(40, 36, 36), kolor(170, 160, 150), sw[..., None] ** 1.6)
    rgb[:] = lerp(rgb, metal, m[..., None])


def deska(
    w: int,
    h: int,
    ziarno: int,
    ksztalt: str = 'strzalka',
    gwozdzie: tuple[float, ...] = (0.07,),
    podswietlona: bool = False,
    szara: bool = False,
) -> Image.Image:
    """Jedna deska drogowskazu w wymiarze docelowym (w, h) — bez napisu."""
    W3, H3 = w * NS, h * NS
    if ksztalt == 'strzalka':
        maska = ksztaltStrzalki(W3, H3, h * 0.42 * NS, ziarno)
    else:
        maska = ksztaltProstokata(W3, H3, 7 * NS, ziarno)
    rgb = slojeDeski(H3, W3, ziarno)

    dist = odleglosc(maska)
    # Fazka: wysokość rośnie od brzegu przez ~5 px i dalej jest płasko.
    fazka = 5.0 * NS
    wys = smooth(dist / fazka) * fazka
    # Rowek rzeźbiony wzdłuż brzegu, 9 px w głąb — rama na napis.
    rowek_d = 10.5 * NS
    rowek = np.exp(-((dist - rowek_d) / (1.3 * NS)) ** 2)
    wys = wys - rowek * 2.2 * NS
    sw = oswietlenie(wys, 1.0)
    swiatlo = 0.62 + 0.7 * (sw - SWIATLO[2])
    rgb *= np.clip(swiatlo, 0.35, 1.5)[..., None]
    rgb = lerp(rgb, rgb * 0.62, (rowek * 0.55)[..., None])

    # Przyciemnienie ku dołowi i starta krawędź: drewno na słońcu płowieje
    # od góry, a brzeg ma ciemniejszy, wytarty kant.
    yy = np.linspace(0, 1, H3, dtype=np.float32)[:, None]
    rgb *= (1.08 - 0.2 * yy)[..., None]
    kant = np.exp(-dist / (1.4 * NS))
    rgb = lerp(rgb, BARDZO_CIEMNE, (kant * 0.75)[..., None])

    # Wytarcia — jaśniejsze placki tam, gdzie deskę najczęściej dotykano.
    wytarcia = szum(H3, W3, 50 * NS, 25 * NS, ziarno + 3, 2)
    rgb = lerp(rgb, rgb * 1.12, (smooth((wytarcia - 0.6) / 0.2) * 0.6)[..., None])

    for gx in gwozdzie:
        cx = gx * W3 if gx < 1 else gx * NS
        for cy in (0.3, 0.7) if h > 50 else (0.5,):
            gwozdz(rgb, maska, cx, cy * H3, 2.6 * NS)

    if podswietlona:
        # Nie tylko jaśniej: cieplej. Deska w słońcu robi się miodowa,
        # a samo rozjaśnienie daje szarawą, spraną deskę.
        rgb = rgb * 1.24 + kolor(40, 24, 0) * 0.6
    if szara:
        # Deska „nieczynna": wyblakła i szara jak stare drewno na deszczu —
        # nadal jasna, żeby napis dało się przeczytać, tylko bez miodu.
        l = rgb.mean(axis=2, keepdims=True)
        rgb = lerp(rgb, np.clip(l * 1.5, 0, 1) * kolor(214, 206, 194), 0.85)

    im = zmniejsz(rgba(rgb, maska))
    if podswietlona:
        # Złota poświata dookoła — ten sam sygnał „to się klika", który
        # w Heroes daje podświetlony szyld.
        m = 14
        blask = Image.new('RGBA', (im.width + m * 2, im.height + m * 2), (255, 222, 120, 0))
        a = Image.new('L', blask.size, 0)
        a.paste(im.split()[3], (m, m))
        a = a.filter(ImageFilter.MaxFilter(11)).filter(ImageFilter.GaussianBlur(5))
        blask.putalpha(a.point(lambda v: min(255, int(v * 1.7))))
        blask.alpha_composite(im, (m, m))
        return blask
    return im


def slup(w: int, h: int, ziarno: int) -> Image.Image:
    """Słup drogowskazu: okrągła kłoda z daszkiem i kulą na czubku."""
    W3, H3 = w * NS, h * NS
    daszek = 26 * NS
    rgb = slojeDeski(H3, W3, ziarno, pion=True)
    maska = np.zeros((H3, W3), np.float32)
    trzon = int(w * 0.62) * NS
    x0 = (W3 - trzon) // 2
    maska[daszek:, x0 : x0 + trzon] = 1
    # Walec: cieniowanie w poprzek słupa, światło z prawej.
    xx = (np.arange(W3, dtype=np.float32) - W3 / 2) / (trzon / 2)
    wal = np.sqrt(np.clip(1 - xx**2, 0, 1))
    sw = 0.45 + 0.75 * np.clip(0.35 * wal + 0.65 * np.clip(xx, -1, 1) * 0.5 + 0.35, 0, 1)
    rgb *= sw[None, :, None]
    # Daszek: dwuspadowy, szerszy niż słup.
    im = Image.new('L', (W3, H3), 0)
    d = ImageDraw.Draw(im)
    d.polygon([(W3 / 2, 0), (W3, daszek * 0.8), (W3, daszek), (0, daszek), (0, daszek * 0.8)], fill=255)
    dach = np.asarray(im, np.float32) / 255
    dach_rgb = slojeDeski(H3, W3, ziarno + 5) * 0.8
    lewy = (np.arange(W3)[None, :] < W3 / 2)
    dach_rgb = np.where(lewy[..., None], dach_rgb * 0.72, dach_rgb * 1.08)
    rgb = np.where(dach[..., None] > 0.5, dach_rgb, rgb)
    maska = np.maximum(maska, dach)
    maska = (ndimage.gaussian_filter(maska, 1.0 * NS) > 0.5).astype(np.float32)
    dist = odleglosc(maska)
    rgb = lerp(rgb, BARDZO_CIEMNE, (np.exp(-dist / (1.4 * NS)) * 0.8)[..., None])
    return zmniejsz(rgba(rgb, maska))


# ————————————————————————————————————————————————————————— tło

def tlo() -> Image.Image:
    """Kotwica miasta przycięta do płótna, z winietą i przyciemnieniem pod logo.

    Winieta nie jest ozdobą: bez niej jasny, równo oświetlony obrazek nie ma
    środka i oko nie wie, gdzie patrzeć. Heroes 2 ma to za darmo (ciemna
    uliczka z jasnym prześwitem), my musimy to dołożyć.
    """
    im = Image.open(WSAD / 'miasto-kotwica.png').convert('RGB')
    s = H / im.height
    im = im.resize((round(im.width * s), H), Image.LANCZOS)
    x0 = (im.width - W) // 2 + 20
    im = im.crop((x0, 0, x0 + W, H))
    a = np.asarray(im, np.float32) / 255
    yy, xx = np.mgrid[0:H, 0:W].astype(np.float32)
    # Winieta eliptyczna, środek przesunięty w prawo — tam jest „świat".
    d = np.hypot((xx - W * 0.6) / (W * 0.72), (yy - H * 0.55) / (H * 0.75))
    win = 1 - 0.42 * smooth((d - 0.55) / 0.6)
    # Lewa kolumna (drogowskaz i logo) lekko przygaszona, żeby deski
    # odcinały się od tła, a nie ginęły wśród innych desek i płotów.
    lewa = 1 - 0.18 * smooth((380 - xx) / 300) * smooth((yy - 120) / 200)
    gora = 1 - 0.3 * smooth((150 - yy) / 150) * smooth((620 - xx) / 300)
    a = a * (win * lewa * gora)[..., None]
    # Ciepły filtr złotej godziny — tło jest dziś w południowym słońcu.
    a = a * np.array([1.04, 0.99, 0.9], np.float32)
    return Image.fromarray((np.clip(a, 0, 1) * 255 + 0.5).astype(np.uint8))


# ————————————————————————————————————————————————————————— logo

def krojWoff(*pliki: str, rozmiar: int) -> list[ImageFont.FreeTypeFont]:
    """Kroje z plików WOFF2 gry — ten sam krój w logo i na deskach.

    Fontsource dzieli krój na podzbiory (łaciński i łaciński rozszerzony
    z polskimi literami), więc wracają dwa pliki, a litera bierze pierwszy,
    który ją ma — patrz `napisMaska`.
    """
    wynik = []
    for plik in pliki:
        f = TTFont(FONTY / plik)
        f.flavor = None
        bufor = io.BytesIO()
        f.save(bufor)
        bufor.seek(0)
        k = ImageFont.truetype(bufor, rozmiar)
        # Zestaw znaków z tablicy cmap — brakujący znak PIL rysuje jako
        # prostokąt .notdef, więc „czy coś się narysowało" nie odróżnia
        # litery od pustego pudełka.
        k.znaki = set(f.getBestCmap())
        wynik.append(k)
    return wynik


def maGlif(font: ImageFont.FreeTypeFont, z: str) -> bool:
    znaki = getattr(font, 'znaki', None)
    return z == ' ' or znaki is None or ord(z) in znaki


def napisMaska(tekst: str, kroje, rozstaw: float = 0) -> Image.Image:
    kroje = kroje if isinstance(kroje, list) else [kroje]
    glowny = kroje[0]
    l, t, r, b = glowny.getbbox('HÓŻ')
    szer = int(sum(glowny.getlength(z) for z in tekst) + rozstaw * len(tekst) + 200)
    im = Image.new('L', (szer, int(b - t + 120)), 0)
    d = ImageDraw.Draw(im)
    x = 40
    for z in tekst:
        f = next((k for k in kroje if maGlif(k, z)), glowny)
        d.text((x, 60 - t), z, font=f, fill=255)
        x += f.getlength(z) + rozstaw
    return im.crop(im.getbbox())


def wstega(szer: int, wys: int, ziarno: int) -> tuple[np.ndarray, np.ndarray]:
    """Czerwona wstęga pod tytułem: środek z przodu, końce zawinięte do tyłu.

    Zwraca (rgb, alfa) w nadpróbkowaniu. Końce są ciemniejsze i schowane
    za środkiem — to zagięcie mówi „materiał", płaski prostokąt mówi „pasek".
    """
    W3, H3 = szer * NS, wys * NS
    ogon = int(wys * 1.1) * NS
    pas = int(wys * 0.66) * NS
    zakl = 14 * NS  # o ile końce są niżej od środka
    im_przod = Image.new('L', (W3, H3), 0)
    im_tyl = Image.new('L', (W3, H3), 0)
    dp, dt = ImageDraw.Draw(im_przod), ImageDraw.Draw(im_tyl)
    y0 = (H3 - pas) // 2 - zakl // 2
    dp.rectangle((ogon * 0.75, y0, W3 - ogon * 0.75, y0 + pas), fill=255)
    for lewy in (True, False):
        x_in = ogon * 1.2 if lewy else W3 - ogon * 1.2
        x_out = P if lewy else W3 - P
        ya = y0 + zakl
        wciecie = ogon * 0.38 * (1 if lewy else -1)
        dt.polygon([
            (x_in, ya), (x_out, ya), (x_out + wciecie, ya + pas / 2), (x_out, ya + pas),
            (x_in, ya + pas),
        ], fill=255)
    przod = (ndimage.gaussian_filter(np.asarray(im_przod, np.float32) / 255, NS) > 0.5).astype(np.float32)
    tyl = (ndimage.gaussian_filter(np.asarray(im_tyl, np.float32) / 255, NS) > 0.5).astype(np.float32)
    yy, xx = np.mgrid[0:H3, 0:W3].astype(np.float32)
    # Sukno: fałdy w poprzek jako łagodna fala jasności.
    fald = 0.5 + 0.5 * np.sin(xx / (38 * NS) * math.pi + szum(H3, W3, 80 * NS, 80 * NS, ziarno, 2) * 3)
    wys_pas = np.clip((yy - y0) / pas, 0, 1)
    cyl = 0.75 + 0.35 * np.sin(wys_pas * math.pi) - 0.18 * wys_pas
    czerw = paleta(np.clip(cyl * (0.8 + 0.25 * fald), 0, 1.2) / 1.2, [
        (0.0, kolor(70, 8, 10)), (0.45, kolor(150, 22, 24)), (0.8, kolor(206, 46, 38)), (1.0, kolor(240, 96, 70)),
    ])
    rgb = np.where(tyl[..., None] > 0.5, czerw * 0.55, 0)
    rgb = np.where(przod[..., None] > 0.5, czerw, rgb)
    # Złota lamówka wzdłuż krawędzi przodu.
    d = odleglosc(przod)
    lam = np.exp(-((d - 3.2 * NS) / (1.1 * NS)) ** 2) * (przod > 0.5)
    rgb = lerp(rgb, kolor(255, 206, 96), (lam * 0.85)[..., None])
    alfa = np.maximum(przod, tyl)
    krawedz = np.exp(-odleglosc(alfa) / (1.2 * NS))
    rgb = lerp(rgb, kolor(40, 6, 6), (krawedz * 0.8)[..., None])
    # Cień przodu na zawiniętych końcach.
    cien_p = ndimage.gaussian_filter(przod, 5 * NS)
    rgb = np.where((przod < 0.5)[..., None], rgb * (1 - 0.6 * cien_p)[..., None], rgb)
    return rgb, alfa


def logo() -> Image.Image:
    """„POKEMON / HEROES" na czerwonej wstędze z podtytułem kampanii.

    Litery: warstwy od spodu — ciemny rant zewnętrzny, kremowy rant,
    ciemnoczerwona obwódka, złoto z fazką. Tak samo zbudowane jest logo
    Heroes 2 i dlatego czyta się na każdym tle, także na jasnym niebie
    i na liściach. Wstęga z podtytułem („Księżycowa Grota" — nazwa
    kampanii) robi z napisu logo: sam napis to tylko tytuł strony.
    """
    f_duzy = ImageFont.truetype(str(FONTY / 'cinzel-decorative-900.ttf'), 92 * NS)
    f_maly = ImageFont.truetype(str(FONTY / 'cinzel-decorative-900.ttf'), 50 * NS)
    gora = napisMaska('POKEMON', f_maly, 2 * NS)
    dol = napisMaska('HEROES', f_duzy, 1 * NS)
    m = 30 * NS
    wstega_w, wstega_h = 470, 60
    szer = max(gora.width, dol.width, wstega_w * NS) + m * 2
    odstep = -4 * NS
    y_dol = m + gora.height + odstep
    y_wst = y_dol + dol.height - 10 * NS
    wys = y_wst + wstega_h * NS + m
    maska_im = Image.new('L', (szer, wys), 0)
    maska_im.paste(gora, ((szer - gora.width) // 2, m))
    maska_im.paste(dol, ((szer - dol.width) // 2, y_dol))
    litery = np.asarray(maska_im, np.float32) / 255

    # Fazka z odległości od brzegu litery: wąska, stroma — jak odlew.
    dist = ndimage.distance_transform_edt(litery > 0.5).astype(np.float32)
    faz = 3.6 * NS
    wysok = smooth(dist / faz) * faz + np.minimum(dist, 10 * NS) * 0.25
    sw = oswietlenie(wysok, 1.3)
    lokal = np.zeros((wys, szer), np.float32)
    for y1, h1 in ((m, gora.height), (y_dol, dol.height)):
        lokal[y1 : y1 + h1] = np.linspace(0, 1, h1)[:, None]
    zloto = paleta(lokal, [
        (0.0, kolor(255, 246, 196)),
        (0.35, kolor(255, 214, 92)),
        (0.62, kolor(236, 150, 34)),
        (1.0, kolor(170, 76, 14)),
    ])
    rgb = zloto * (0.55 + 0.75 * sw)[..., None]
    blik = np.clip((sw - 0.9) / 0.1, 0, 1) ** 2
    rgb = lerp(rgb, kolor(255, 255, 240), (blik * 0.7)[..., None])

    zew = ndimage.distance_transform_edt(litery < 0.5).astype(np.float32)

    def rant(px: float) -> np.ndarray:
        return smooth((px * NS - zew) / (0.8 * NS))

    obw1, obw2, obw3 = rant(4.0), rant(7.0), rant(9.5)
    yy = np.linspace(0, 1, wys, dtype=np.float32)[:, None] * np.ones((1, szer), np.float32)
    kol = np.zeros((wys, szer, 3), np.float32)
    kol[:] = kolor(46, 18, 8)
    krem = kolor(255, 236, 190) * (0.75 + 0.3 * (1 - yy))[..., None]
    kol = lerp(kol, krem, obw2[..., None])
    kol = lerp(kol, kolor(120, 24, 16), obw1[..., None])
    kol = lerp(kol, rgb, litery[..., None])

    # Wstęga POD literami: najpierw ona, potem litery na wierzchu.
    w_rgb, w_a = wstega(wstega_w, wstega_h, 5)
    x_w = (szer - w_rgb.shape[1]) // 2
    tlo_rgb = np.zeros_like(kol)
    tlo_a = np.zeros((wys, szer), np.float32)
    tlo_rgb[y_wst : y_wst + w_rgb.shape[0], x_w : x_w + w_rgb.shape[1]] = w_rgb
    tlo_a[y_wst : y_wst + w_a.shape[0], x_w : x_w + w_a.shape[1]] = w_a
    # Podtytuł na wstędze — kremowy, z ciemnym cieniem pod spodem.
    kroje = krojWoff('cinzel-latin-900.woff2', 'cinzel-latin-ext-900.woff2', rozmiar=21 * NS)
    pod = napisMaska('KSIĘŻYCOWA GROTA', kroje, 3 * NS)
    pm = np.zeros((wys, szer), np.float32)
    px = (szer - pod.width) // 2
    py = y_wst + (wstega_h * NS - pod.height) // 2 - 5 * NS
    pm[py : py + pod.height, px : px + pod.width] = np.asarray(pod, np.float32) / 255
    pcien = ndimage.shift(pm, (1.5 * NS, 0), order=1)
    tlo_rgb = lerp(tlo_rgb, kolor(50, 8, 6), (pcien * 0.9)[..., None])
    tlo_rgb = lerp(tlo_rgb, kolor(255, 240, 200), pm[..., None])

    alfa_l = obw3
    rgb_all = lerp(tlo_rgb, kol, alfa_l[..., None])
    alfa = np.maximum(alfa_l, tlo_a)
    im = zmniejsz(rgba(rgb_all, alfa))
    return cien(im, -4, 7, 7, 0.7, 24)


# ————————————————————————————————————————————————————————— pergamin

def pergamin(w: int, h: int, ziarno: int) -> Image.Image:
    """Zwój na okna „Rekordy" i „Autorzy": papier z przebarwieniami i wałkami.

    Papier nie jest beżowym prostokątem — ciemnieje ku brzegom (starość
    i brud z palców), ma plamy i włókna. Wałki u góry i dołu mówią „zwój",
    więc okno może się rozwijać, a nie wyskakiwać znikąd.
    """
    W3, H3 = w * NS, h * NS
    walek = 22 * NS
    papier_y0, papier_y1 = walek // 2, H3 - walek // 2
    maska = np.zeros((H3, W3), np.float32)
    im = Image.new('L', (W3, H3), 0)
    ImageDraw.Draw(im).rectangle((10 * NS, papier_y0, W3 - 10 * NS, papier_y1), fill=255)
    maska = np.asarray(im, np.float32) / 255
    fal = szum(H3, W3, 12 * NS, 12 * NS, ziarno, 3) - 0.5
    maska = (ndimage.gaussian_filter(maska, 2 * NS) + fal * 0.35 > 0.5).astype(np.float32)
    dist = odleglosc(maska)
    n1 = szum(H3, W3, 120 * NS, 120 * NS, ziarno + 1, 4)
    n2 = szum(H3, W3, 30 * NS, 6 * NS, ziarno + 2, 3)
    t = 0.72 + (n1 - 0.5) * 0.45 + (n2 - 0.5) * 0.12
    t -= 0.4 * np.exp(-dist / (22 * NS))
    rgb = paleta(np.clip(t, 0, 1), [
        (0.0, kolor(120, 78, 40)),
        (0.4, kolor(200, 160, 104)),
        (0.75, kolor(240, 218, 170)),
        (1.0, kolor(252, 240, 210)),
    ])
    rgb = lerp(rgb, kolor(70, 40, 20), (np.exp(-dist / (1.6 * NS)) * 0.8)[..., None])

    # Wałki: drewniane walce z gałkami, szersze niż papier.
    wal = np.zeros((H3, W3), np.float32)
    wal_rgb = np.zeros((H3, W3, 3), np.float32)
    for yc in (walek // 2, H3 - walek // 2):
        im = Image.new('L', (W3, H3), 0)
        d = ImageDraw.Draw(im)
        d.rounded_rectangle((4 * NS, yc - walek * 0.34, W3 - 4 * NS, yc + walek * 0.34), 6 * NS, fill=255)
        for xc in (6 * NS, W3 - 6 * NS):
            d.ellipse((xc - walek * 0.5, yc - walek * 0.5, xc + walek * 0.5, yc + walek * 0.5), fill=255)
        m = np.asarray(im, np.float32) / 255
        yy = (np.arange(H3, dtype=np.float32)[:, None] - yc) / (walek * 0.5)
        cyl = np.sqrt(np.clip(1 - yy**2, 0, 1))
        sw = 0.35 + 0.8 * cyl * (0.75 - 0.35 * yy)
        drew = slojeDeski(H3, W3, ziarno + 9) * 0.85
        wal_rgb = np.where(m[..., None] > 0.5, drew * sw[..., None], wal_rgb)
        wal = np.maximum(wal, m)
    wal = (ndimage.gaussian_filter(wal, 0.8 * NS) > 0.5).astype(np.float32)
    rgb = np.where(wal[..., None] > 0.5, wal_rgb, rgb)
    alfa = np.maximum(maska, wal)
    # Cień wałka na papierze.
    cien_w = ndimage.gaussian_filter(wal, 4 * NS)
    rgb = np.where((wal < 0.5)[..., None], rgb * (1 - 0.45 * cien_w)[..., None], rgb)
    return cien(zmniejsz(rgba(rgb, alfa)), -6, 10, 10, 0.6, 26)


# ————————————————————————————————————————————————————————— tabliczka dźwięku

def tabliczka(r: int, ziarno: int, podswietlona: bool = False) -> Image.Image:
    """Okrągła tabliczka pod przełącznik dźwięku — jak „Quit" na beczce w Heroes 2."""
    D = r * 2 * NS
    im = Image.new('L', (D, D), 0)
    ImageDraw.Draw(im).ellipse((P, P, D - 1 - P, D - 1 - P), fill=255)
    maska = (ndimage.gaussian_filter(np.asarray(im, np.float32) / 255, NS) > 0.5).astype(np.float32)
    rgb = slojeDeski(D, D, ziarno) * 0.92
    dist = odleglosc(maska)
    fazka = 5.0 * NS
    wys = smooth(dist / fazka) * fazka - np.exp(-((dist - 9 * NS) / (1.3 * NS)) ** 2) * 2 * NS
    sw = oswietlenie(wys, 1.0)
    rgb *= np.clip(0.62 + 0.7 * (sw - SWIATLO[2]), 0.35, 1.5)[..., None]
    rgb = lerp(rgb, BARDZO_CIEMNE, (np.exp(-dist / (1.4 * NS)) * 0.75)[..., None])
    if podswietlona:
        rgb = rgb * 1.16 + kolor(34, 20, 0) * 0.6
    return zmniejsz(rgba(rgb, maska))


# ————————————————————————————————————————————————————————— całość

#: Deski drogowskazu: (nazwa, szerokość, wysokość, ziarno). Szerokość
#: z zapasem na „POJEDYNCZA MAPA" — najdłuższy napis z obu poziomów menu.
DESKI = [
    ('deska-0', 350, 72, 11),
    ('deska-1', 330, 60, 23),
    ('deska-2', 330, 60, 37),
    ('deska-3', 330, 60, 41),
]


def main() -> None:
    ap = argparse.ArgumentParser(description=__doc__)
    ap.add_argument('--podglad', action='store_true', help='arkusz podglądu w tools/shots/')
    args = ap.parse_args()
    CEL.mkdir(parents=True, exist_ok=True)

    tlo().save(CEL / 'tlo.jpg', quality=88, optimize=True, progressive=True)
    logo().save(CEL / 'logo.png', optimize=True)
    for nazwa, w, h, z in DESKI:
        deska(w, h, z).save(CEL / f'{nazwa}.png', optimize=True)
        deska(w, h, z, podswietlona=True).save(CEL / f'{nazwa}-jasna.png', optimize=True)
        deska(w, h, z, szara=True).save(CEL / f'{nazwa}-szara.png', optimize=True)
    cien(slup(40, 520, 5), -5, 8, 6, 0.55, 16).save(CEL / 'slup.png', optimize=True)
    pergamin(680, 540, 3).save(CEL / 'pergamin.png', optimize=True)
    for jasna in (False, True):
        t = tabliczka(34, 17, jasna)
        cien(t, -3, 5, 4, 0.55, 10).save(CEL / f'tabliczka{"-jasna" if jasna else ""}.png', optimize=True)
    deska(176, 40, 51, ksztalt='prostokat', gwozdzie=()).save(CEL / 'deseczka.png', optimize=True)
    deska(176, 40, 51, ksztalt='prostokat', gwozdzie=(), podswietlona=True).save(
        CEL / 'deseczka-jasna.png', optimize=True
    )

    # Kroje: Cinzel (szyldy) i Fredoka (tekst w oknach), obie SIL OFL.
    for plik in sorted(FONTY.glob('*.woff2')):
        shutil.copy(plik, CEL / plik.name)
    shutil.copy(FONTY / 'OFL.txt', CEL / 'OFL.txt')

    razem = sum(p.stat().st_size for p in CEL.iterdir())
    print(f'public/menu: {len(list(CEL.iterdir()))} plików, {razem // 1024} kB')

    if args.podglad:
        ark = Image.open(CEL / 'tlo.jpg').convert('RGBA')
        ark.alpha_composite(Image.open(CEL / 'logo.png'), (40, 0))
        ark.alpha_composite(Image.open(CEL / 'slup.png'), (80, 170))
        y = 220
        for nazwa, w, h, z in DESKI:
            ark.alpha_composite(Image.open(CEL / f'{nazwa}.png'), (110, y))
            y += h + 16
        ark.alpha_composite(Image.open(CEL / 'deska-1-jasna.png'), (500, 400))
        ark.alpha_composite(Image.open(CEL / 'deska-2-szara.png'), (500, 480))
        ark.alpha_composite(Image.open(CEL / 'tabliczka.png'), (860, 590))
        out = KORZEN / 'tools' / 'shots' / 'menu-grafiki.png'
        out.parent.mkdir(exist_ok=True)
        ark.save(out)
        p = Image.open(CEL / 'pergamin.png')
        p.save(KORZEN / 'tools' / 'shots' / 'menu-pergamin.png')
        print(f'podgląd: {out}')


if __name__ == '__main__':
    main()
