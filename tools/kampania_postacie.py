#!/usr/bin/env python3
"""Malowane postacie i ikony nagród ekranu kampanii — z malowanego Janka.

Po co
-----
Druga runda porównania z Heroes 2: „trener i złoczyńcy to twardy pixel art
wklejony na miękkie, malowane tła — zastępstwa z innej gry". Pierwsza runda
miała odwrotny zarzut (Janek malowany, Ola pikselowa), więc ujednolicamy
W GÓRĘ: wszystko malowane.

Malowany jest tylko Janek (`tools/wsad/bohater-dol.png`, `bohater-prawo.png`).
Model graficzny od dwóch rund odpowiada 402, więc reszta jest z niego
WYPROWADZONA, a nie wygenerowana:

 - Ola: ten sam rysunek przemalowany maskami barw (czapka zielona, kurtka
   morska, czarne włosy, ciemne spodenki, brązowe trzewiki), z dorysowaną za
   głową fryzurą „na pazia" i odbity w poziomie. Cieniowanie zostaje oryginalne
   — podmieniamy barwę, nie jasność — więc Ola jest z tej samej ręki co Janek.
 - Srebrne płaszcze: Janek z profilu i z przodu pod kapturem i płaszczem,
   zanurzony w cieniu z księżycowym światłem krawędziowym i świecącymi oczami.
   Twarz ginie w cieniu celowo — złoczyńca ma być tajemnicą, nie drugim Jankiem.
 - Ikony nagród: buty wycięte z malowanych butów Janka, a rower, tarcza
   z łusek i miecz malowane tu gradientami w 4× i zmniejszane (wcześniej: płaska
   naklejka butów, trójkąt zamiast roweru i goła niebieska tarcza obok
   malowanego pokeballa — cztery style w jednym rzędzie).

    python3 tools/kampania_postacie.py      # wszystko do public/kampania/
"""

from pathlib import Path

import numpy as np
from PIL import Image, ImageDraw, ImageFilter
from scipy import ndimage

KORZEN = Path(__file__).resolve().parent.parent
W = str(KORZEN / 'tools' / 'wsad') + '/'
CEL = KORZEN / 'public' / 'kampania'


# ————————————————————————————————————————————————— Janek i Ola

def wczytaj():
    im = Image.open(W + 'bohater-dol.png').convert('RGBA')
    return im.crop(im.getbbox())


def maski(im):
    a = np.asarray(im).astype(np.float32) / 255
    rgb, al = a[..., :3], a[..., 3]
    H, Wd = al.shape
    yy, xx = np.mgrid[0:H, 0:Wd]
    r, g, b = rgb[..., 0], rgb[..., 1], rgb[..., 2]
    mx, mn = rgb.max(2), rgb.min(2)
    v = mx
    s = np.where(mx > 0, (mx - mn) / np.maximum(mx, 1e-5), 0)
    d = np.maximum(mx - mn, 1e-5)
    h = np.where(mx == r, ((g - b) / d) % 6, np.where(mx == g, (b - r) / d + 2, (r - g) / d + 4)) * 60
    braz = (h > 15) & (h < 45) & (s > 0.3) & (al > 0.5)
    skora = (h > 10) & (h < 40) & (s > 0.2) & (s < 0.55) & (v > 0.75)
    m = {
        'kurtka': (h > 190) & (h < 250) & (s > 0.3) & (al > 0.5),
        'czapka': ((h < 20) | (h > 340)) & (s > 0.35) & (yy < 320) & (al > 0.5),
        'daszek': (s < 0.18) & (v > 0.75) & (yy < 300) & (al > 0.5),
        'wlosy': braz & (yy > 150) & (yy < 470) & (((s > 0.5) | (v < 0.62)) | (((xx < 430) | (xx > 650)) & ~skora)),
        'koszula': (s < 0.15) & (v > 0.8) & (yy > 440) & (yy < 720) & (al > 0.5),
        'spodenki': braz & (yy > 720) & (yy < 950) & (xx > 370) & (xx < 700) & ~((xx < 500) & (yy < 840)) & ~skora,
        'buty': braz & (yy > 960),
    }
    return rgb, al, m


def przemaluj(im, kolory):
    rgb, al, m = maski(im)
    out = rgb.copy()
    lum = (0.3 * rgb[..., 0] + 0.59 * rgb[..., 1] + 0.11 * rgb[..., 2])[..., None]
    for czesc, (kolor, jas) in kolory.items():
        k = np.array(kolor, np.float32) / 255
        nowy = np.clip(k * lum / 0.55 * jas, 0, 1)
        out[m[czesc]] = nowy[m[czesc]]
    return Image.fromarray((np.dstack([out, al]) * 255).clip(0, 255).astype(np.uint8), 'RGBA')


def ola():
    im = wczytaj()
    res = przemaluj(im, {
        'kurtka': ((30, 140, 125), 1.0), 'czapka': ((58, 122, 52), 1.0), 'daszek': ((96, 150, 78), 0.8),
        'wlosy': ((40, 36, 52), 0.9), 'spodenki': ((46, 58, 66), 0.9), 'buty': ((120, 66, 34), 0.85)})
    tlo = Image.new('RGBA', res.size, (0, 0, 0, 0))
    ImageDraw.Draw(tlo).rounded_rectangle([288, 290, 712, 492], radius=90, fill=(34, 30, 44, 255))
    tlo = tlo.filter(ImageFilter.GaussianBlur(3))
    hl = Image.new('RGBA', res.size, (0, 0, 0, 0))
    dh = ImageDraw.Draw(hl)
    dh.line([(300, 330), (306, 470)], fill=(90, 90, 120, 140), width=6)
    dh.line([(700, 330), (694, 470)], fill=(90, 90, 120, 140), width=6)
    tlo.alpha_composite(hl.filter(ImageFilter.GaussianBlur(3)))
    tlo.alpha_composite(res)
    return tlo.transpose(Image.FLIP_LEFT_RIGHT)




# ————————————————————————————————————————————————— srebrne płaszcze

def zBialego(p):
    im = Image.open(p)
    if im.mode == 'RGBA':
        a = np.asarray(im, np.float32) / 255
        return a[..., :3], a[..., 3]
    rgb = np.asarray(im.convert('RGB'), np.float32) / 255
    bialy = (1 - rgb.min(axis=2)) <= 26 / 255
    etyk, _ = ndimage.label(bialy)
    brzeg = np.unique(np.concatenate([etyk[0], etyk[-1], etyk[:, 0], etyk[:, -1]]))
    tlo = np.isin(etyk, brzeg[brzeg > 0])
    a = ndimage.gaussian_filter((~tlo).astype(np.float32), 0.8)
    return rgb, a



def warstwa(rozmiar, rysuj, rozmycie=3):
    m = Image.new('L', rozmiar, 0)
    rysuj(ImageDraw.Draw(m))
    return np.asarray(m.filter(ImageFilter.GaussianBlur(rozmycie)), np.float32) / 255



def zakapturzony(rgb, a, kaptur, twarz, oczy, swiatlo, barwa=(178, 184, 214)):
    """Postać w srebrnej szacie z kapturem.

    Szata ma kształt TEJ postaci (sylwetka rozdęta o kilka pikseli, jak
    materiał narzucony na ciało), a fałdy bierze z jasności jej rysunku,
    rozmytej do plam: tam, gdzie Janek miał ciemny rękaw czy nogawkę, szata ma
    cień. Dzięki temu płaszcz nie jest trapezem z wektora, tylko draperią
    z tej samej pozy. Twarz tonie w cieniu kaptura; zostają dwa świecące oczy.
    """
    H, Wd = a.shape
    lum = 0.3 * rgb[..., 0] + 0.59 * rgb[..., 1] + 0.11 * rgb[..., 2]
    sylw = ndimage.gaussian_filter(ndimage.grey_dilation(a, size=(31, 31)), 4)
    ka = warstwa((Wd, H), kaptur, 8)
    tw = warstwa((Wd, H), twarz, 10)
    # Brzeg ostry: miękka krawędź rozdętej sylwetki (alfa 0,3–0,7 na kilku
    # pikselach) dostawała światło krawędziowe i wychodziła biała obwódka
    # dookoła postaci — krytyk nazwał to „wyciętą halo". Teraz alfa przechodzi
    # w 1–2 px, a światło krawędziowe siedzi WEWNĄTRZ sylwetki.
    al = np.clip(np.maximum(sylw, ka), 0, 1)
    al = np.clip((al - 0.35) / 0.3, 0, 1)
    al = al * al * (3 - 2 * al)
    plamy = ndimage.gaussian_filter(np.where(a > 0.5, lum, 0.6), 7)
    yy, xx = np.mgrid[0:H, 0:Wd].astype(np.float32)
    ys = np.nonzero(al.max(1) > 0.1)[0]
    t = np.clip((yy - ys.min()) / max(1, ys.max() - ys.min()), 0, 1)
    k = np.array(barwa, np.float32) / 255
    cienb = np.array([60, 48, 104], np.float32) / 255
    jas = np.clip(0.45 + 0.75 * plamy - 0.25 * t, 0.25, 1.1)[..., None]
    out = k * jas
    mieszaj = np.clip(0.75 - jas, 0, 0.6)
    out = out * (1 - mieszaj) + cienb * mieszaj
    # kaptur nieco jaśniejszy u góry — pada na niego księżyc
    out = out + (ka * np.clip(0.5 - t, 0, 0.5))[..., None] * 0.25
    out = out * (1 - tw[..., None]) + np.array([20, 14, 36], np.float32) / 255 * tw[..., None]
    # Światło groty: całość przygaszona ku fioletowi jaskini (światło otoczenia),
    # a od strony kryształów wąskie, chłodne światło krawędziowe — w środku
    # sylwetki, nie na jej obrysie.
    out = out * 0.62 + np.array([74, 60, 140], np.float32) / 255 * 0.38
    # nogi w cieniu posadzki, kaptur w świetle z góry
    out = out * (1 - 0.35 * t[..., None] ** 1.5)
    dx, dy = swiatlo
    wew = ndimage.grey_erosion(al, size=(7, 7))
    przes = ndimage.shift(wew, (dy * 7, -dx * 7), order=1, mode='constant')
    krawedz = ndimage.gaussian_filter(np.clip(wew - przes, 0, 1), 1.2)[..., None]
    out = out + np.array([150, 200, 255], np.float32) / 255 * krawedz * 0.55
    # ciemny obrys, jak u postaci z mapy
    obrys = ndimage.gaussian_filter(ndimage.grey_dilation(al, size=(7, 7)), 1.2)
    out = np.where((al < 0.5)[..., None], np.array([30, 22, 48], np.float32) / 255, out)
    im = Image.fromarray((np.dstack([np.clip(out, 0, 1), np.maximum(al, obrys)]) * 255).astype(np.uint8), 'RGBA')
    g = Image.new('RGBA', im.size, (0, 0, 0, 0))
    dg = ImageDraw.Draw(g)
    for (x, y) in oczy:
        dg.ellipse([x - 34, y - 24, x + 34, y + 24], fill=(140, 230, 255, 140))
    g = g.filter(ImageFilter.GaussianBlur(14))
    d2 = ImageDraw.Draw(g)
    for (x, y) in oczy:
        d2.ellipse([x - 12, y - 8, x + 12, y + 8], fill=(235, 252, 255, 255))
    im.alpha_composite(g)
    return im.crop(im.getbbox())


def wrog_profil():
    rgb, a = zBialego(W + 'bohater-prawo.png')
    return zakapturzony(
        rgb, a,
        kaptur=lambda d: (d.ellipse([400, 20, 840, 480], fill=255), d.polygon([(420, 200), (330, 40), (560, 60)], fill=255)),
        twarz=lambda d: d.ellipse([650, 200, 880, 450], fill=255),
        oczy=[(752, 342)],
        swiatlo=(1, -1),
    )


def wrog_przod():
    im = Image.open(W + 'bohater-dol.png').convert('RGBA')
    arr = np.asarray(im, np.float32) / 255
    ox, oy = 105, 21
    return zakapturzony(
        arr[..., :3], arr[..., 3],
        kaptur=lambda d: (d.ellipse([ox + 250, oy + 10, ox + 760, oy + 540], fill=255),
                          d.polygon([(ox + 330, oy + 140), (ox + 505, oy - 70), (ox + 690, oy + 140)], fill=255)),
        twarz=lambda d: d.ellipse([ox + 370, oy + 220, ox + 660, oy + 480], fill=255),
        oczy=[(ox + 458, oy + 350), (ox + 582, oy + 350)],
        swiatlo=(-1, -1),
        barwa=(160, 162, 200),
    )


# ————————————————————————————————————————————————— ikony nagród

S = 512  # płótno robocze; ikona wychodzi 128


def gradient_kolo(d, cx, cy, r, jasny, ciemny, kroki=24):
    """Kula/dysk z gradientem od jasnego (lewa góra) do ciemnego."""
    for i in range(kroki):
        t = i / (kroki - 1)
        rr = r * (1 - t * 0.85)
        kol = tuple(int(ciemny[k] + (jasny[k] - ciemny[k]) * t) for k in range(3))
        ox, oy = -r * 0.25 * t, -r * 0.25 * t
        d.ellipse([cx + ox - rr, cy + oy - rr, cx + ox + rr, cy + oy + rr], fill=kol + (255,))


def rura(d, a, b, w, barwa, obrys=(60, 20, 16), blask=(255, 190, 180)):
    d.line([a, b], fill=obrys + (255,), width=int(w + 14))
    for p in (a, b):
        d.ellipse([p[0] - (w + 14) / 2, p[1] - (w + 14) / 2, p[0] + (w + 14) / 2, p[1] + (w + 14) / 2], fill=obrys + (255,))
    d.line([a, b], fill=barwa + (255,), width=int(w))
    for p in (a, b):
        d.ellipse([p[0] - w / 2, p[1] - w / 2, p[0] + w / 2, p[1] + w / 2], fill=barwa + (255,))
    dx, dy = b[0] - a[0], b[1] - a[1]
    n = (dx * dx + dy * dy) ** 0.5 or 1
    px, py = -dy / n * w * 0.22, dx / n * w * 0.22
    if py > 0:
        px, py = -px, -py
    d.line([(a[0] + px, a[1] + py), (b[0] + px, b[1] + py)], fill=blask + (200,), width=int(w * 0.28))


def rower():
    im = Image.new('RGBA', (S, S), (0, 0, 0, 0))
    d = ImageDraw.Draw(im)
    P = lambda x, y: (x * S, y * S)
    for cx in (0.25, 0.75):
        c = P(cx, 0.64)
        R = 0.2 * S
        d.ellipse([c[0] - R - 8, c[1] - R - 8, c[0] + R + 8, c[1] + R + 8], fill=(24, 20, 22, 255))
        d.ellipse([c[0] - R + 16, c[1] - R + 16, c[0] + R - 16, c[1] + R - 16], fill=(0, 0, 0, 0))
        d.arc([c[0] - R - 2, c[1] - R - 2, c[0] + R + 2, c[1] + R + 2], 190, 280, fill=(120, 116, 118, 255), width=8)
        d.ellipse([c[0] - R + 18, c[1] - R + 18, c[0] + R - 18, c[1] + R - 18], outline=(200, 204, 214, 255), width=7)
        for k in range(8):
            ang = k * np.pi / 4
            d.line([c, (c[0] + np.cos(ang) * (R - 20), c[1] + np.sin(ang) * (R - 20))], fill=(190, 194, 204, 255), width=4)
        gradient_kolo(d, c[0], c[1], 14, (240, 240, 245), (120, 120, 130), 8)
    tyl, przod, suport = P(0.25, 0.64), P(0.75, 0.64), P(0.47, 0.64)
    siod, glowka = P(0.42, 0.38), P(0.66, 0.38)
    czer = (214, 58, 48)
    for a, b in [(tyl, suport), (tyl, siod), (siod, suport), (glowka, suport), (siod, glowka), (glowka, przod)]:
        rura(d, a, b, 26, czer)
    gradient_kolo(d, suport[0], suport[1], 30, (230, 230, 235), (90, 90, 100), 10)
    # kierownica i siodełko
    rura(d, glowka, P(0.63, 0.24), 20, (70, 70, 80), (20, 20, 24), (200, 200, 210))
    rura(d, P(0.56, 0.24), P(0.71, 0.21), 18, (60, 60, 70), (20, 20, 24), (190, 190, 200))
    d.ellipse([S * 0.33, S * 0.31, S * 0.52, S * 0.38], fill=(50, 26, 12, 255))
    d.ellipse([S * 0.34, S * 0.315, S * 0.51, S * 0.365], fill=(122, 72, 36, 255))
    d.ellipse([S * 0.37, S * 0.32, S * 0.46, S * 0.34], fill=(190, 130, 80, 255))
    return im


def tarcza():
    """Tarcza z łusek: kształt tarczy herbowej, łuski rzędami, złota obwódka."""
    im = Image.new('RGBA', (S, S), (0, 0, 0, 0))
    ks = [(S * 0.16, S * 0.14), (S * 0.84, S * 0.14), (S * 0.84, S * 0.5), (S * 0.5, S * 0.92), (S * 0.16, S * 0.5)]
    maska = Image.new('L', (S, S), 0)
    dm = ImageDraw.Draw(maska)
    dm.polygon(ks, fill=255)
    dm.ellipse([S * 0.16, S * 0.2, S * 0.84, S * 0.92], fill=255)
    dm.polygon([(S * 0.16, S * 0.14), (S * 0.84, S * 0.14), (S * 0.84, S * 0.56), (S * 0.16, S * 0.56)], fill=255)
    wnetrze = maska.filter(ImageFilter.MinFilter(41))
    # łuski
    lu = Image.new('RGBA', (S, S), (0, 0, 0, 0))
    dl = ImageDraw.Draw(lu)
    for rz, y in enumerate(range(int(S * 0.1), int(S * 0.95), 38)):
        for x in range(-40 + (rz % 2) * 30, S + 40, 60):
            t = y / S
            baza = (int(40 + 40 * (1 - t)), int(150 + 50 * (1 - t)), int(150 + 40 * (1 - t)))
            dl.ellipse([x - 34, y - 30, x + 34, y + 38], fill=(20, 70, 70, 255))
            dl.ellipse([x - 30, y - 28, x + 30, y + 32], fill=baza + (255,))
            dl.ellipse([x - 22, y - 24, x + 10, y - 2], fill=tuple(min(255, c + 60) for c in baza) + (200,))
    rama = Image.new('RGBA', (S, S), (0, 0, 0, 0))
    zl = Image.new('RGBA', (S, S), (212, 160, 60, 255))
    rama.paste(zl, (0, 0), maska)
    ciemny = Image.new('RGBA', (S, S), (120, 76, 20, 255))
    obrys = maska.filter(ImageFilter.MaxFilter(13))
    im.paste(ciemny, (0, 0), obrys)
    im.alpha_composite(rama)
    # blask na złocie: jasny pas lewy-górny
    bl = Image.new('L', (S, S), 0)
    ImageDraw.Draw(bl).ellipse([S * 0.05, S * 0.0, S * 0.6, S * 0.5], fill=140)
    bl = Image.composite(bl, Image.new('L', (S, S), 0), maska).filter(ImageFilter.GaussianBlur(20))
    im.paste(Image.new('RGBA', (S, S), (255, 240, 190, 255)), (0, 0), bl)
    im.paste(lu, (0, 0), Image.composite(lu.getchannel('A'), Image.new('L', (S, S), 0), wnetrze))
    # cień wewnętrzny od góry wnętrza i blask całości
    cw = Image.new('L', (S, S), 0)
    ImageDraw.Draw(cw).rectangle([0, S * 0.5, S, S], fill=90)
    cw = Image.composite(cw.filter(ImageFilter.GaussianBlur(60)), Image.new('L', (S, S), 0), wnetrze)
    im.paste(Image.new('RGBA', (S, S), (10, 30, 30, 255)), (0, 0), cw)
    return im


def miecz():
    im = Image.new('RGBA', (S, S), (0, 0, 0, 0))
    d = ImageDraw.Draw(im)
    # po przekątnej: ostrze z lewego dołu do prawej góry
    ost = [(S * 0.3, S * 0.62), (S * 0.8, S * 0.12), (S * 0.86, S * 0.14), (S * 0.88, S * 0.2), (S * 0.38, S * 0.7)]
    d.polygon([(x + 6, y + 6) for x, y in ost], fill=(30, 30, 40, 255))
    d.polygon(ost, fill=(150, 160, 180, 255))
    d.polygon([(S * 0.33, S * 0.65), (S * 0.84, S * 0.15), (S * 0.87, S * 0.17), (S * 0.36, S * 0.68)], fill=(240, 246, 255, 255))
    d.line([(S * 0.31, S * 0.63), (S * 0.8, S * 0.13)], fill=(205, 214, 230, 255), width=6)
    # jelec
    rura(d, (S * 0.2, S * 0.56), (S * 0.44, S * 0.8), 30, (220, 170, 60), (90, 56, 12), (255, 240, 180))
    # rękojeść
    rura(d, (S * 0.3, S * 0.7), (S * 0.17, S * 0.83), 30, (120, 70, 34), (50, 24, 8), (190, 130, 80))
    for k in range(4):
        t = 0.2 + k * 0.2
        x, y = S * (0.3 - 0.13 * t), S * (0.7 + 0.13 * t)
        d.line([(x - 12, y - 12), (x + 12, y + 12)], fill=(70, 38, 14, 255), width=5)
    gradient_kolo(d, S * 0.14, S * 0.86, 30, (255, 236, 160), (140, 90, 20), 12)
    return im


def gotowa(im, obrys=True):
    if obrys:
        a = im.getchannel('A')
        o = Image.new('RGBA', im.size, (40, 22, 10, 0))
        o.putalpha(a.filter(ImageFilter.MaxFilter(9)).point(lambda v: v * 0.8))
        o.alpha_composite(im)
        im = o
    im = im.crop(im.getbbox())
    bok = max(im.size)
    kw = Image.new('RGBA', (bok, bok), (0, 0, 0, 0))
    kw.alpha_composite(im, ((bok - im.width) // 2, (bok - im.height) // 2))
    return kw.resize((128, 128), Image.LANCZOS)


# ————————————————————————————————————————————————— zapis

def zmniejsz(im, wys):
    im = im.crop(im.getbbox())
    return im.resize((max(1, round(im.width * wys / im.height)), wys), Image.LANCZOS)


def main():
    CEL.mkdir(parents=True, exist_ok=True)
    # Figurki w 2× tego, co na ekranie wyboru (270 px).
    janek = zmniejsz(wczytaj(), 540)
    ola_ = zmniejsz(ola(), 540)
    janek.save(CEL / 'janek.png', optimize=True)
    ola_.save(CEL / 'ola.png', optimize=True)
    # Głowy do medalionu: kwadrat z twarzą (bez daszka czapki po bokach).
    for nazwa, f in (('janek', janek), ('ola', ola_)):
        w, h = f.size
        g = f.crop((int(w * 0.18), int(h * 0.02), int(w * 0.82), int(h * 0.38)))
        bok = max(g.size)
        kw = Image.new('RGBA', (bok, bok), (0, 0, 0, 0))
        kw.alpha_composite(g, ((bok - g.width) // 2, (bok - g.height) // 2))
        kw.resize((64, 64), Image.LANCZOS).save(CEL / f'glowa-{nazwa}.png', optimize=True)
    zmniejsz(wrog_profil(), 260).save(CEL / 'wrog-a.png', optimize=True)
    zmniejsz(wrog_przod(), 250).save(CEL / 'wrog-b.png', optimize=True)
    # Ikony nagród (128 px; na ekranie ~46).
    buty = Image.open(W + 'bohater-dol.png').convert('RGBA').crop((105 + 340, 21 + 920, 105 + 760, 21 + 1207))
    # Surowce z malowanych oryginałów wsadu (1254 px), nie z 29-pikselowych
    # ikonek mapy — powiększona ikonka mapy wyglądała płasko obok stworka.
    # Wszystkie ikony przechodzą przez `gotowa`: ten sam ciemny obrys i ta sama
    # wielkość w kadrze, bo to one robią z pięciu źródeł jeden komplet.
    zrodla = [('buty', buty), ('rower', rower()), ('tarcza', tarcza()), ('miecz', miecz())]
    for n in ('pokeball', 'jagody', 'kamien', 'odlamki'):
        zrodla.append((n, Image.open(W + f's-{n}.png').convert('RGBA')))
    for nazwa, im in zrodla:
        gotowa(im).save(CEL / f'ikona-{nazwa}.png', optimize=True)
    print(f'zapisano postacie i ikony do {CEL}')


if __name__ == '__main__':
    main()
