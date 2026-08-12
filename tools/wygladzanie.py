"""Wygładzanie pixel artu — wspólne dla wszystkich grafik mapy przygody.

Po co
-----
Na ekranie przygody spotykały się dwa różne style: teren i przeszkody były
kanciastym pixel artem powiększonym trzykrotnie, a stworki, droga i HUD były
gładkie i wygładzone. Oko widzi to natychmiast i całość wygląda na sklejoną
z dwóch gier.

Wybraliśmy kierunek „wygładzamy teren do poziomu stworków", a nie odwrotnie —
stworki, HUD i plansza bitewna przeszły już cztery ślepe porównania
z komercyjnym wzorcem i nie ma powodu ich wyrzucać.

Jak
---
Powiększenie „najbliższym sąsiadem" (żeby zachować paletę), potem filtr
medianowy o promieniu dobranym do powiększenia, potem lekkie rozmycie.
Mediana jest tu kluczem: obcina schodki na skosach i zamienia je w krzywe,
ale zostawia płaskie plamy koloru płaskimi — czyli robi dokładnie to, czego
nie potrafi ani rozmycie (rozmazuje wszystko), ani Lanczos (zostawia schodki).

Sprawdzone na siedmiu wariantach obok siebie: samo powiększenie, Lanczos,
mediana 5 i 7 z rozmyciem i bez, oraz mediana podwójna. Wygrała mediana 7
z rozmyciem 0,8 — reszta albo zostawiała schodki, albo gubiła kształt.

Przezroczystość
---------------
Kanały koloru mnożymy przez alfę przed filtrowaniem i dzielimy po. Bez tego
mediana miesza kolor widocznych pikseli z kolorem pikseli przezroczystych
(które w plikach bywają czarne) i wokół sylwetek pojawia się ciemna obwódka.
"""

import numpy as np
from PIL import Image, ImageFilter

#: Ile razy powiększamy. Kafelek 16 px → 48 px, czyli bok pola na ekranie.
SKALA = 3


def wygladz(im: Image.Image, skala: int = SKALA) -> Image.Image:
    """Powiększa i wygładza obrazek pixel art."""
    im = im.convert('RGBA')
    duzy = im.resize((im.width * skala, im.height * skala), Image.NEAREST)

    a = np.asarray(duzy).astype(np.float32)
    alfa = a[:, :, 3:4] / 255.0
    pomnozony = np.concatenate([a[:, :, :3] * alfa, a[:, :, 3:4]], axis=2)
    pom = Image.fromarray(pomnozony.clip(0, 255).astype(np.uint8), 'RGBA')

    promien = 2 * skala + 1
    pom = pom.filter(ImageFilter.MedianFilter(promien))
    pom = pom.filter(ImageFilter.GaussianBlur(skala * 0.27))

    b = np.asarray(pom).astype(np.float32)
    alfa2 = np.maximum(b[:, :, 3:4] / 255.0, 1e-4)
    kolor = (b[:, :, :3] / alfa2).clip(0, 255)
    return Image.fromarray(
        np.concatenate([kolor, b[:, :, 3:4]], axis=2).astype(np.uint8), 'RGBA'
    )


def przytnij(im: Image.Image) -> Image.Image:
    """Przycina do widocznej zawartości. Po wygładzeniu sylwetka rozlewa się
    o kilka pikseli, więc granice trzeba wyznaczyć na nowo — inaczej `origin`
    ustawiony na starych rozmiarach przesuwa obiekt względem pola."""
    bbox = im.getbbox()
    return im.crop(bbox) if bbox else im
