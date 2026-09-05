#!/usr/bin/env python3
"""Przemalowuje komplet brył Boru na Grotę i Zbocze.

Dlaczego przemalowanie, a nie osobne obrazy z modelu
----------------------------------------------------
Trzy miasta to trzydzieści sześć budynków. Wygenerowanie każdego osobno
kosztowałoby trzy razy tyle promptów i — co gorsza — trzy razy rozjechałoby
styl: model nie trzyma identycznej kreski przez trzydzieści sześć podejść.
Bryły i tak są te same (ratusz jest ratuszem), różnić ma je klimat miejsca.
Przemalowanie z jednego źródła daje spójność za darmo.

Jak to działa
-------------
Naiwne obrócenie odcienia daje kolory z kosmosu (sprawdzone: zieleń Boru
robiła się magentą). Zamiast tego bierzemy z oryginału tylko jasność —
czyli cały detal, światłocień i kształt — i nakładamy ją na rampę barwną
frakcji: trzy przystanki od cienia przez półton do świateł. Potem dokładamy
z powrotem ułamek pierwotnej chromy, żeby materiały nadal się różniły
(drewno od liścia, kamień od dachu), bo sama rampa robi ze wszystkiego jeden
monolit.

Alfa zostaje nietknięta — cień rzucony jest już wypalony w pliku Boru
i jest szary, więc rampa go tylko lekko podbarwia, co jest w porządku.

Skrypt jest idempotentny: czyta wyłącznie `bor-*.png`, nadpisuje `grota-*`
i `zbocze-*`. Można go puścić po każdej zmianie wsadu.

    python3 tools/frakcje_przemaluj.py
"""

from pathlib import Path

import numpy as np
from PIL import Image

KORZEN = Path(__file__).resolve().parent.parent
MIASTO = KORZEN / 'public' / 'miasto'
MAPA = KORZEN / 'public' / 'mapa'

BUDYNKI = [
    'ratusz1', 'ratusz2', 'ratusz3', 'fort',
    'siedlisko1', 'siedlisko2', 'siedlisko3', 'siedlisko4',
    'siedlisko5', 'siedlisko6', 'specjalny',
]

#: Rampa: barwa cienia, półtonu i światła. Dobrane pod niebo panoramy —
#: budynek oświetlony innym światłem niż tło czyta się jak wklejka.
RAMPY = {
    # Grota Księżycowa: wilgotny kamień w chłodnym, księżycowym świetle.
    'grota': [(34, 26, 58), (92, 76, 134), (206, 194, 240)],
    # Zbocze Popielne: chłodny popielaty korpus, ciepło dopiero w światłach —
    # jednolicie ciepła rampa dawała zwykłe drewno, nie zgliszcza.
    'zbocze': [(40, 38, 44), (116, 92, 84), (255, 198, 132)],
}

#: Ile pierwotnej chromy wraca na wierzch. Zero = monochrom, jeden = brak
#: przemalowania. 0,28 wystarcza, żeby dach różnił się od ściany.
CHROMA = 0.28


def rampa(jasnosc: np.ndarray, stopnie) -> np.ndarray:
    """Odwzorowuje jasność 0–1 na trzypunktową rampę barwną."""
    cien, pol, swiatlo = (np.array(s, dtype=np.float32) for s in stopnie)
    t = jasnosc[..., None]
    dol = cien + (pol - cien) * (t / 0.5).clip(0, 1)
    gora = pol + (swiatlo - pol) * ((t - 0.5) / 0.5).clip(0, 1)
    return np.where(t < 0.5, dol, gora)


def przemaluj(im: Image.Image, stopnie) -> Image.Image:
    rgb = np.asarray(im.convert('RGBA'), dtype=np.float32)
    a = rgb[..., 3:4]
    kolor = rgb[..., :3]
    # Jasność liczona wagami percepcyjnymi — średnia arytmetyczna spłaszcza
    # zieleń i budynek traci światłocień dokładnie tam, gdzie go najwięcej.
    jasnosc = (kolor @ np.array([0.299, 0.587, 0.114], dtype=np.float32)) / 255.0
    wynik = rampa(jasnosc, stopnie)
    # Chroma oryginału = odchylenie od jego własnej szarości.
    wynik += (kolor - jasnosc[..., None] * 255.0) * CHROMA
    out = np.concatenate([wynik.clip(0, 255), a], axis=-1)
    return Image.fromarray(out.astype(np.uint8), 'RGBA')


#: Rampy kopalni. Kopalnia, kamieniołom i obóz łowców to na mapie jeden
#: rysunek, więc gracz nie wiedział, co zajmuje, dopóki nie najechał kursorem.
#: Przemalowanie na barwę surowca rozróżnia je z odległości, a w grze o zasoby
#: to jest informacja, którą trzeba widzieć jednym spojrzeniem.
RAMPY_KOPALNI = {
    # Pokeballe: ciepłe drewno obozu łowców — zostaje najbliżej oryginału.
    'pokeball': [(46, 32, 26), (128, 88, 62), (250, 214, 168)],
    # Odłamki: chłodny błękit kryształu.
    'odlamek': [(28, 38, 56), (74, 108, 146), (198, 228, 250)],
    # Kamień ewolucji: fiolet, ten sam, co ikona surowca.
    'kamien': [(40, 28, 54), (104, 74, 140), (226, 206, 248)],
}


def kopalnie():
    """Kopalnia w barwach surowca, który daje."""
    zrodlo = MAPA / 'kopalnia.png'
    if not zrodlo.exists():
        return
    im = Image.open(zrodlo)
    for surowiec, stopnie in RAMPY_KOPALNI.items():
        przemaluj(im, stopnie).save(MAPA / f'kopalnia-{surowiec}.png')
    print(f'  kopalnie: {len(RAMPY_KOPALNI)}')


if __name__ == '__main__':
    for frakcja, stopnie in RAMPY.items():
        for id_ in BUDYNKI:
            zrodlo = MIASTO / f'bor-{id_}.png'
            przemaluj(Image.open(zrodlo), stopnie).save(MIASTO / f'{frakcja}-{id_}.png')
        print(f'  {frakcja}: {len(BUDYNKI)} brył')
    kopalnie()
    print('Gotowe.')
