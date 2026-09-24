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

#: Latarnia na drogowskazie — źródło plamy światła na tle (MenuScene: LATARNIA).
LATARNIA = (176, 319)


def tlo() -> Image.Image:
    """Kotwica miasta o zmierzchu, z głębią ostrości i plamą światła przy drogowskazie.

    Pierwsza runda przegrała ze ślepym krytykiem jednym zdaniem: „równo
    zajęte od brzegu do brzegu, bez punktu skupienia — drogowskaz, staw
    i domek na drzewie walczą o uwagę". Obrazek jest w pełnym słońcu, więc
    wszystko jest tak samo jasne i tak samo ostre. Heroes 2 ma to za darmo:
    ciemna uliczka, a światło tylko tam, gdzie ma patrzeć oko.

    Stąd trzy zabiegi, w tej kolejności:
    1. Głębia ostrości — dalekie tło i prawa połowa lekko rozmyte; ostro
       zostaje to, co blisko drogowskazu.
    2. Zmierzch — całość przygaszona i schłodzona, ale okna i latarnie
       (jasne ORAZ ciepłe piksele) zostają jasne. Świecące okna w ciemnej
       wiosce to najmocniejszy „dom" w całym obrazku.
    3. Plama ciepłego światła od latarni na słupie drogowskazu — jedyne
       miejsce, które jest jaśniej oświetlone niż reszta. Tam idzie oko.
    """
    im = Image.open(WSAD / 'miasto-kotwica.png').convert('RGB')
    s = H / im.height
    im = im.resize((round(im.width * s), H), Image.LANCZOS)
    x0 = (im.width - W) // 2 + 20
    im = im.crop((x0, 0, x0 + W, H))
    a = np.asarray(im, np.float32) / 255
    yy, xx = np.mgrid[0:H, 0:W].astype(np.float32)
    waga = np.array([0.3, 0.59, 0.11], np.float32)

    lum = a @ waga
    cieply = a[..., 0] - a[..., 2]
    swiatla = smooth((lum - 0.62) / 0.25) * smooth((cieply - 0.18) / 0.2)
    swiatla = ndimage.gaussian_filter(swiatla, 1.2)

    rozm = np.asarray(im.filter(ImageFilter.GaussianBlur(2.4)), np.float32) / 255
    ostrosc = smooth((yy - 150) / 180) * smooth((560 - xx) / 380)
    ostrosc = np.maximum(ostrosc, smooth((yy - 400) / 220) * 0.55)
    a = rozm + (a - rozm) * ostrosc[..., None]

    szar = (a @ waga)[..., None]
    zm = (a * 0.5 + szar * 0.12) * np.array([0.92, 0.86, 1.0], np.float32)
    lx, ly = LATARNIA
    d = np.hypot(xx - lx - 60, (yy - ly - 150) / 1.3)
    plama = np.exp(-(d / 260) ** 2)
    zm = zm * (1 + plama[..., None] * np.array([1.0, 0.72, 0.36], np.float32))
    dv = np.hypot((xx - W * 0.42) / (W * 0.72), (yy - H * 0.52) / (H * 0.72))
    zm *= (1 - 0.5 * smooth((dv - 0.45) / 0.6))[..., None]
    wynik = zm + (a * 1.05 - zm) * swiatla[..., None]
    return Image.fromarray((np.clip(wynik, 0, 1) * 255 + 0.5).astype(np.uint8))


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


#: Wymiary sztandaru z logo (przed marginesem na cień) i wysokość drążka.
SZTANDAR_W, SZTANDAR_H, DRAZEK_Y = 600, 300, 40


def sztandar() -> Image.Image:
    """Logo jako PRZEDMIOT: sztandar z sukna na drążku, zawieszony na linach.

    Pierwsza wersja była złotym napisem na wstążce, położonym na obrazek —
    krytyk: „ogólny błyszczący font, pływa nad drzewem, pasowałby do każdej
    gry na telefon". W Heroes 2 logo jest chorągwią rozpiętą nad uliczką:
    ma drążek, fałdy i cień, więc należy do świata. Tu to samo:

    - sukno ma fałdy (pasy jasności w poprzek, szersze u dołu, gdzie
      materiał swobodnie wisi) i splot (drobny szum w dwóch kierunkach);
    - litery są NAMALOWANE na suknie — cieniuje je ta sama funkcja fałd, co
      materiał, więc zginają się razem z nim, a nie leżą na wierzchu;
    - drążek jest drewniany, z gałkami, a liny idą w górę poza kadr;
    - dół sztandaru jest cięty w trzy ogony ze złotą lamówką.
    """
    Wn, Hn = SZTANDAR_W * NS, SZTANDAR_H * NS
    yy, xx = np.mgrid[0:Hn, 0:Wn].astype(np.float32)
    dy = DRAZEK_Y * NS

    # — kształt sukna
    lewo, prawo = 48 * NS, Wn - 48 * NS
    ogon, wciecie, srodek = 262 * NS, 236 * NS, 292 * NS
    im = Image.new('L', (Wn, Hn), 0)
    ImageDraw.Draw(im).polygon(
        [
            (lewo, dy), (prawo, dy), (prawo, ogon),
            (Wn * 0.72, wciecie), (Wn / 2, srodek), (Wn * 0.28, wciecie), (lewo, ogon),
        ],
        fill=255,
    )
    sukno = np.asarray(im, np.float32) / 255
    # Dolny brzeg faluje razem z fałdami — prosto cięty materiał nie wisi prosto.
    fal = np.sin(xx / (48 * NS) * math.pi + 0.7) * 6 * NS * smooth((yy - dy) / (200 * NS))
    sukno = ndimage.map_coordinates(sukno, [yy - fal, xx], order=1)
    sukno = (ndimage.gaussian_filter(sukno, 0.8 * NS) > 0.5).astype(np.float32)

    # — fałdy: funkcja jasności zależna od x, mocniejsza ku dołowi
    t = np.clip((yy - dy) / (srodek - dy), 0, 1)
    rng = np.random.default_rng(4)
    fald = np.zeros_like(xx)
    for lam, amp in ((96, 0.6), (51, 0.32), (27, 0.14)):
        fald += amp * np.sin(xx / (lam * NS) * 2 * math.pi + rng.uniform(0, 6)) * (0.35 + 0.65 * t)
    # Marszczenie przy drążku — gęste, krótkie fałdki tuż pod nim.
    fald += 0.5 * np.sin(xx / (9 * NS) * 2 * math.pi) * np.exp(-(yy - dy) / (10 * NS))
    # Profil ostrzejszy niż sinus: grzbiet fałdy jest wąski i jasny, dolina
    # szeroka i ciemna — tak wygląda ciężkie sukno, a nie falująca tafla.
    fald = np.sign(fald) * np.abs(fald) ** 0.7
    swiatlo = 0.84 + 0.42 * fald
    # Boki sukna zawijają się do tyłu (ciemniej), a światło pada z lewej —
    # od latarni drogowskazu i zachodniego nieba; prawy brzeg jest w cieniu.
    wzdluz = np.clip((xx - lewo) / (prawo - lewo), 0, 1)
    swiatlo *= (0.62 + 0.38 * np.clip(np.sin(wzdluz * math.pi), 0, 1) ** 0.35) * (1.08 - 0.3 * wzdluz)
    splot = (szum(Hn, Wn, 1.2 * NS, 40 * NS, 8, 1) + szum(Hn, Wn, 40 * NS, 1.2 * NS, 9, 1)) * 0.5
    swiatlo *= 0.97 + 0.06 * splot
    # Góra pod drążkiem w cieniu drążka, dół cieplej doświetlony latarnią.
    swiatlo *= 0.72 + 0.28 * smooth((yy - dy) / (30 * NS))
    czerwien = paleta(np.clip(swiatlo - 0.3, 0, 1) / 0.95, [
        (0.0, kolor(60, 6, 12)),
        (0.4, kolor(128, 18, 26)),
        (0.75, kolor(178, 34, 36)),
        (1.0, kolor(222, 76, 60)),
    ])

    # — złota lamówka wzdłuż brzegu (poza górą, którą zakrywa drążek)
    dist = odleglosc(sukno)
    lam = np.exp(-((dist - 7 * NS) / (1.6 * NS)) ** 2) * (yy > dy + 8 * NS)
    krawedz = np.exp(-dist / (1.3 * NS))
    rgb = lerp(czerwien, kolor(236, 180, 70) * swiatlo[..., None], (lam * 0.9)[..., None])
    rgb = lerp(rgb, kolor(40, 6, 8), (krawedz * 0.7)[..., None])

    # — litery namalowane na suknie
    f_duzy = ImageFont.truetype(str(FONTY / 'cinzel-decorative-900.ttf'), 86 * NS)
    f_maly = ImageFont.truetype(str(FONTY / 'cinzel-decorative-900.ttf'), 46 * NS)
    kroje = krojWoff('cinzel-latin-900.woff2', 'cinzel-latin-ext-900.woff2', rozmiar=19 * NS)
    napisy = np.zeros((Hn, Wn), np.float32)
    lokal = np.zeros((Hn, Wn), np.float32)
    podtytul = np.zeros((Hn, Wn), np.float32)
    y = dy + 18 * NS
    for tekst, font, cel, odstep in (
        ('POKEMON', f_maly, napisy, -2),
        ('HEROES', f_duzy, napisy, 8),
        ('KSIĘŻYCOWA GROTA', kroje, podtytul, 0),
    ):
        m = np.asarray(napisMaska(tekst, font, 2 * NS), np.float32) / 255
        h, w = m.shape
        x = (Wn - w) // 2
        cel[y : y + h, x : x + w] = np.maximum(cel[y : y + h, x : x + w], m)
        if cel is napisy:
            lokal[y : y + h, x : x + w] = np.linspace(0, 1, h)[:, None]
        y += h + odstep * NS

    # Obwódka i cień liter na suknie (farba ma grubość, materiał nie).
    zew = ndimage.distance_transform_edt(napisy < 0.5).astype(np.float32)
    obw = smooth((3.2 * NS - zew) / (0.7 * NS))
    cien_l = ndimage.gaussian_filter(ndimage.shift(obw, (3 * NS, 2 * NS), order=1), 2 * NS)
    rgb *= (1 - 0.55 * cien_l)[..., None]
    rgb = lerp(rgb, kolor(52, 16, 6) * swiatlo[..., None], obw[..., None])
    wew = ndimage.distance_transform_edt(napisy > 0.5).astype(np.float32)
    faz = oswietlenie(smooth(wew / (2.5 * NS)) * 2.5 * NS, 0.9)
    zloto = paleta(lokal, [
        (0.0, kolor(255, 240, 180)),
        (0.45, kolor(246, 196, 84)),
        (1.0, kolor(196, 110, 26)),
    ])
    zloto = zloto * (0.7 + 0.45 * faz)[..., None] * swiatlo[..., None] * 1.08
    rgb = lerp(rgb, zloto, napisy[..., None])

    # Podtytuł kremowy, z ozdobnikami — rombami po bokach.
    rgb = lerp(rgb, kolor(40, 6, 8), (ndimage.shift(podtytul, (1.5 * NS, 0), order=1) * 0.8)[..., None])
    rgb = lerp(rgb, kolor(252, 232, 190) * swiatlo[..., None], podtytul[..., None])
    rys = np.nonzero(podtytul.max(axis=0) > 0.5)[0]
    wiersze = np.nonzero(podtytul.max(axis=1) > 0.5)[0]
    if len(rys) and len(wiersze):
        cy = (wiersze[0] + wiersze[-1]) / 2
        for cx in (rys[0] - 22 * NS, rys[-1] + 22 * NS):
            romb = (np.abs(xx - cx) + np.abs(yy - cy) * 1.4) < 6 * NS
            rgb = np.where(romb[..., None], kolor(236, 180, 70) * swiatlo[..., None], rgb)

    alfa = sukno.copy()

    # — drążek: drewniany walec z gałkami
    r = 9 * NS
    d_l, d_p = 22 * NS, Wn - 22 * NS
    walec = ((np.abs(yy - dy) < r) & (xx > d_l) & (xx < d_p)).astype(np.float32)
    galki = ((np.hypot(xx - d_l, yy - dy) < r * 1.55) | (np.hypot(xx - d_p, yy - dy) < r * 1.55)).astype(np.float32)
    drewno = slojeDeski(Hn, Wn, 21) * 0.8
    prof = np.clip(1 - ((yy - dy) / r) ** 2, 0, 1)
    rgb_d = drewno * (0.35 + 0.85 * np.sqrt(prof) * (0.8 - 0.35 * (yy - dy) / r))[..., None]
    kula = np.minimum(np.hypot(xx - d_l, yy - dy), np.hypot(xx - d_p, yy - dy)) / (r * 1.55)
    rgb_g = kolor(150, 104, 40) * (0.4 + 0.9 * np.sqrt(np.clip(1 - kula**2, 0, 1)))[..., None]
    blik = np.exp(-(np.minimum(np.hypot(xx - d_l + 4 * NS, yy - dy + 5 * NS), np.hypot(xx - d_p + 4 * NS, yy - dy + 5 * NS)) / (3 * NS)) ** 2)
    rgb_g = lerp(rgb_g, kolor(255, 236, 170), (blik * 0.8)[..., None])
    # Cień drążka na suknie.
    cien_d = np.exp(-((yy - dy - r - 2 * NS) / (4 * NS)) ** 2) * (yy > dy)
    rgb *= (1 - 0.5 * cien_d)[..., None]
    rgb = np.where(walec[..., None] > 0, rgb_d, rgb)
    rgb = np.where(galki[..., None] > 0, rgb_g, rgb)
    alfa = np.maximum(alfa, np.maximum(walec, galki))

    # — liny w górę, poza kadr
    for x_dol, x_gora in ((70 * NS, 30 * NS), (Wn - 70 * NS, Wn - 30 * NS)):
        u = np.clip(yy / dy, 0, 1)
        xl = x_gora + (x_dol - x_gora) * u
        lina = (np.abs(xx - xl) < 2.2 * NS) & (yy < dy)
        skret = 0.7 + 0.3 * np.sin((yy + (xx - xl) * 2) / (2.2 * NS) * math.pi)
        rgb = np.where(lina[..., None], kolor(150, 118, 76) * skret[..., None], rgb)
        alfa = np.maximum(alfa, lina.astype(np.float32))

    alfa = ndimage.gaussian_filter(alfa, 0.5 * NS)
    im = zmniejsz(rgba(rgb, np.clip(alfa * 1.2, 0, 1)))
    return cien(im, 6, 11, 8, 0.6, 24)


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


# ————————————————————————————————————————————————————————— latarnia, kłódka, stworek

def _rysuj(w: int, h: int, fn) -> np.ndarray:
    """Maska z rysunku PIL w nadpróbkowaniu — kształty żelaza są prostsze do narysowania niż do policzenia."""
    im = Image.new('L', (w * NS, h * NS), 0)
    fn(ImageDraw.Draw(im), NS)
    return np.asarray(im, np.float32) / 255


def zelazo(maska: np.ndarray, wypuklosc: float = 2.0) -> np.ndarray:
    """Kute żelazo: prawie czarne, z chłodnym blikiem na krawędziach od światła."""
    d = odleglosc(maska)
    wys = smooth(d / (wypuklosc * NS)) * wypuklosc * NS
    sw = oswietlenie(wys, 1.2)
    return lerp(kolor(26, 22, 22), kolor(120, 108, 100), (sw ** 3)[..., None])


def latarnia() -> Image.Image:
    """Latarnia na kutym ramieniu, wisząca nad górną deską drogowskazu.

    To ona „tłumaczy" plamę ciepłego światła na tle (`LATARNIA` w `tlo()`):
    światło bez źródła wygląda jak filtr, światło z latarni — jak wieczór.
    Punkt zaczepienia ramienia (słup) to lewy górny róg obrazka + (6, 10).
    """
    w, h = 96, 84

    def ramie(d: ImageDraw.ImageDraw, k: int):
        d.line([(4 * k, 10 * k), (80 * k, 10 * k)], fill=255, width=4 * k)
        # Wspornik ukośny i ślimacznica — kute ramię, nie rurka.
        d.line([(6 * k, 30 * k), (40 * k, 11 * k)], fill=255, width=3 * k)
        d.arc([(34 * k, 12 * k), (52 * k, 30 * k)], 180, 450, fill=255, width=3 * k)
        d.rectangle([(0, 4 * k), (8 * k, 36 * k)], fill=255)  # obejma na słupie
        d.line([(76 * k, 10 * k), (76 * k, 22 * k)], fill=255, width=2 * k)  # hak

    def klosz_rama(d: ImageDraw.ImageDraw, k: int):
        cx = 76 * k
        d.polygon([(cx - 12 * k, 30 * k), (cx + 12 * k, 30 * k), (cx + 6 * k, 21 * k), (cx - 6 * k, 21 * k)], fill=255)
        d.rectangle([(cx - 13 * k, 29 * k), (cx + 13 * k, 33 * k)], fill=255)
        d.rectangle([(cx - 11 * k, 62 * k), (cx + 11 * k, 67 * k)], fill=255)
        d.polygon([(cx - 7 * k, 67 * k), (cx + 7 * k, 67 * k), (cx, 74 * k)], fill=255)
        for x in (-11, 0, 11):
            d.line([(cx + x * k, 33 * k), (cx + x * 0.9 * k, 62 * k)], fill=255, width=2 * k)

    def szklo(d: ImageDraw.ImageDraw, k: int):
        cx = 76 * k
        d.polygon([(cx - 11 * k, 33 * k), (cx + 11 * k, 33 * k), (cx + 10 * k, 62 * k), (cx - 10 * k, 62 * k)], fill=255)

    m_ram = _rysuj(w, h, ramie)
    m_kl = _rysuj(w, h, klosz_rama)
    m_sz = _rysuj(w, h, szklo)
    yy, xx = np.mgrid[0 : h * NS, 0 : w * NS].astype(np.float32)
    # Szkło: płomień w środku, żółty rdzeń przechodzący w pomarańcz przy ramie.
    dp = np.hypot((xx - 76 * NS) / 1.0, (yy - 49 * NS) / 1.5) / (13 * NS)
    ogien = paleta(np.clip(dp, 0, 1), [
        (0.0, kolor(255, 250, 220)), (0.35, kolor(255, 214, 110)), (1.0, kolor(214, 110, 30)),
    ])
    rgb = np.zeros((h * NS, w * NS, 3), np.float32)
    rgb = np.where(m_sz[..., None] > 0.5, ogien, rgb)
    zel = np.maximum(m_ram, m_kl)
    rgb = np.where(zel[..., None] > 0.5, zelazo(zel), rgb)
    # Rama oświetlona od środka: pręty przy szkle łapią pomarańczowy odblask.
    odbl = np.exp(-(dp * 13 / 16) ** 2) * m_kl
    rgb = rgb + kolor(120, 60, 10) * odbl[..., None] * 0.8
    alfa = np.maximum(zel, m_sz)
    return zmniejsz(rgba(rgb, ndimage.gaussian_filter(alfa, 0.4 * NS)))


def klodka() -> Image.Image:
    """Kłódka na łańcuszku — „Wczytaj" jest zamknięte, a nie zepsute.

    Krytyk pierwszej rundy: „wyszarzona deska z mikroskopijnym podpisem
    wygląda na zepsutą, a nie celowo wyłączoną". Kłódka to znak, który
    ośmiolatek zna z każdej gry: tu jeszcze nie wolno, ale kiedyś będzie.
    """
    w, h = 44, 60

    def ksztalt(d: ImageDraw.ImageDraw, k: int):
        d.arc([(10 * k, 16 * k), (34 * k, 42 * k)], 180, 360, fill=255, width=5 * k)
        d.line([(12 * k, 29 * k), (12 * k, 34 * k)], fill=255, width=5 * k)
        d.line([(32 * k, 29 * k), (32 * k, 34 * k)], fill=255, width=5 * k)

    def korpus(d: ImageDraw.ImageDraw, k: int):
        d.rounded_rectangle([(6 * k, 32 * k), (38 * k, 58 * k)], 6 * k, fill=255)

    def ogniwa(d: ImageDraw.ImageDraw, k: int):
        for i, (x, y) in enumerate(((22, 3), (22, 10))):
            if i % 2:
                d.ellipse([((x - 2.5) * k, (y - 4) * k), ((x + 2.5) * k, (y + 4) * k)], outline=255, width=2 * k)
            else:
                d.ellipse([((x - 4) * k, (y - 2.5) * k), ((x + 4) * k, (y + 2.5) * k)], outline=255, width=2 * k)

    m_k = _rysuj(w, h, ksztalt)
    m_b = _rysuj(w, h, korpus)
    m_o = _rysuj(w, h, ogniwa)
    rgb = np.zeros((h * NS, w * NS, 3), np.float32)
    rgb = np.where((np.maximum(m_k, m_o) > 0.5)[..., None], zelazo(np.maximum(m_k, m_o), 1.5), rgb)
    # Korpus mosiężny, żeby odciął się od szarej deski i od czarnego ucha.
    d = odleglosc(m_b)
    sw = oswietlenie(smooth(d / (3 * NS)) * 3 * NS, 1.2)
    mosiadz = lerp(kolor(96, 62, 20), kolor(236, 190, 96), sw[..., None] ** 1.5)
    yy, xx = np.mgrid[0 : h * NS, 0 : w * NS].astype(np.float32)
    dziurka = (np.hypot(xx - 22 * NS, yy - 42 * NS) < 3 * NS) | (
        (np.abs(xx - 22 * NS) < 1.3 * NS) & (yy > 42 * NS) & (yy < 50 * NS)
    )
    mosiadz = np.where(dziurka[..., None], kolor(30, 16, 6), mosiadz)
    rgb = np.where(m_b[..., None] > 0.5, mosiadz, rgb)
    alfa = np.maximum.reduce([m_k, m_b, m_o])
    im = zmniejsz(rgba(rgb, ndimage.gaussian_filter(alfa, 0.4 * NS)))
    return cien(im, -2, 4, 2, 0.6, 6)


def stworek() -> Image.Image:
    """Towarzysz z wioski (Verdiko, `assets/pokemon/00096.png`) wmalowany w zmierzch.

    Krytyk: „stworki to malutkie, wyblakłe, płaskie naklejki, które nie
    pasują ani skalą, ani sposobem malowania". Rysunek stworka jest płaski
    (kontur i dwa odcienie), a tło — malowane i o zmierzchu. Więc zanim
    stworek trafi do gry, dostaje to samo światło co wioska:
    - przygaszenie i ochłodzenie jak w `tlo()` — ten sam zmierzch;
    - ciepłe światło krawędziowe od latarni (z lewej, z góry), policzone
      z normalnych sylwetki;
    - cień własny ku dołowi (okluzja przy ziemi);
    - zmiękczone kontury — ostra czarna kreska to znak rozpoznawczy naklejki.
    """
    sys_path = str(KORZEN / 'tools')
    import sys

    if sys_path not in sys.path:
        sys.path.insert(0, sys_path)
    from process_sprites import background_mask

    zrodlo = np.asarray(Image.open(KORZEN / 'assets' / 'pokemon' / '00096.png').convert('RGB'))
    tlo_m = background_mask(zrodlo)
    a = (~tlo_m).astype(np.float32)
    ys, xs = np.nonzero(a)
    y0, y1, x0, x1 = ys.min(), ys.max() + 1, xs.min(), xs.max() + 1
    rgb = zrodlo[y0:y1, x0:x1].astype(np.float32) / 255
    a = a[y0:y1, x0:x1]
    a = ndimage.gaussian_filter(a, 0.7)
    h, w = a.shape
    yy, xx = np.mgrid[0:h, 0:w].astype(np.float32)

    # Kontury: ciemne piksele rysunku rozjaśnione ku barwie sąsiedztwa.
    lum = rgb @ np.array([0.3, 0.59, 0.11], np.float32)
    rozm = np.dstack([ndimage.gaussian_filter(rgb[..., i], 2.0) for i in range(3)])
    kreska = smooth((0.35 - lum) / 0.2)[..., None]
    rgb = lerp(rgb, rozm * 0.6, kreska * 0.3)

    # Bryła: ciemniej ku dołowi i ku prawej (od latarni).
    bryla = 1.0 - 0.3 * (yy / h) ** 1.5 - 0.15 * (xx / w)
    rgb *= bryla[..., None]
    # Zmierzch — te same liczby co w tle.
    szar = (rgb @ np.array([0.3, 0.59, 0.11], np.float32))[..., None]
    # Jaśniej niż tło (0,5): stworek siedzi w plamie światła latarni.
    rgb = np.clip(rgb * 1.25 - szar * 0.25, 0, 1)  # bledziutki rysunek: więcej nasycenia
    rgb = rgb * 0.68 * np.array([1.0, 0.9, 0.8], np.float32)
    # Światło krawędziowe z lewej-góry: normalne z rozmytej sylwetki.
    gl = ndimage.gaussian_filter(a, 3.0)
    gy, gx = np.gradient(gl)
    n = np.hypot(gx, gy) + 1e-6
    ku_swiatlu = np.clip((gx * 0.75 + gy * 0.66) / n, 0, 1)  # gradient rośnie do środka
    brzeg = np.clip(n * 18, 0, 1)
    rgb += kolor(255, 170, 70) * (ku_swiatlu * brzeg * a * 0.5)[..., None]
    # Ogólne ciepło latarni na lewej połowie.
    rgb *= 1 + 0.35 * np.clip(1 - xx / w, 0, 1)[..., None] * np.array([1, 0.75, 0.45], np.float32)
    im = Image.fromarray((np.dstack([np.clip(rgb, 0, 1), a]) * 255).astype(np.uint8), 'RGBA')
    # Lekkie rozmycie: stworek stoi w średnim planie, gdzie tło też jest
    # już odrobinę miękkie — ostrzejszy od otoczenia wyglądał na doklejony.
    return im.resize((int(w * 96 / h), 96), Image.LANCZOS).filter(ImageFilter.GaussianBlur(0.55))


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
    sztandar().save(CEL / 'logo.png', optimize=True)
    for nazwa, w, h, z in DESKI:
        deska(w, h, z).save(CEL / f'{nazwa}.png', optimize=True)
        deska(w, h, z, podswietlona=True).save(CEL / f'{nazwa}-jasna.png', optimize=True)
        deska(w, h, z, szara=True).save(CEL / f'{nazwa}-szara.png', optimize=True)
    cien(slup(40, 520, 5), -5, 8, 6, 0.55, 16).save(CEL / 'slup.png', optimize=True)
    pergamin(680, 540, 3).save(CEL / 'pergamin.png', optimize=True)
    for jasna in (False, True):
        t = tabliczka(34, 17, jasna)
        cien(t, -3, 5, 4, 0.55, 10).save(CEL / f'tabliczka{"-jasna" if jasna else ""}.png', optimize=True)
    latarnia().save(CEL / 'latarnia.png', optimize=True)
    klodka().save(CEL / 'klodka.png', optimize=True)
    stworek().save(CEL / 'stworek.png', optimize=True)
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
        ark.alpha_composite(Image.open(CEL / 'logo.png'), (160, -20))
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
