#!/usr/bin/env python3
"""Wczytuje nowe miasto (`tools/PROMPTY-MIASTO-2.md`) do gry.

Nowe miasto ma osobne rysunki dla każdej krainy (`m2-<kraina>-<id>.png`
w `tools/wsad/`), więc nie idzie przez `frakcje_przemaluj.py` — to przemalowanie
dawało Grocie i Zboczu te same bryły co Borowi w innym odcieniu. Obróbka bryły
jest ta sama co w `wsad_wczytaj.py` (wycięcie tła, przycięcie, zmniejszenie
z wmnożoną alfą), wysokości też. Brakujący plik zostawia starą grafikę.

Idempotentny, jak reszta wczytywaczy.

    python3 tools/miasto2_wczytaj.py
"""

import numpy as np
from PIL import Image

from wsad_wczytaj import BUDYNKI, MIASTO, PAN_H, PAN_W, WSAD, dopasuj, wczytaj

KRAINY = ('bor', 'grota', 'zbocze')

#: Najszerszy płaski obiekt jako ułamek wysokości, którą ma w `BUDYNKI`.
SZER_PLASKICH = 0.9
#: Boisko sali stoi na samym przodzie w małej skali — przy 0.9 ginęło.
SZER_SALI = 1.35


def twardaAlfa(im: Image.Image) -> Image.Image:
    """Utwardza miękkie brzegi.

    Model maluje obrzeża rezerwatów mgiełką: półprzezroczyste liście i opary
    leżą na panoramie mleczną otoczką i to ona najbardziej zdradza naklejkę
    (krytyk wskazał ją jako usterkę numer jeden). Alfa poniżej progu znika,
    reszta rozciąga się do pełnej — zostaje wąski, gładki brzeg.
    """
    tab = np.asarray(im.convert('RGBA')).astype(np.float32)
    a = tab[:, :, 3] / 255.0
    tab[:, :, 3] = np.clip((a - 0.35) / 0.4, 0, 1) * 255
    return Image.fromarray(tab.astype(np.uint8), 'RGBA')


#: Pokémart ma jeden rysunek na krainę, a trzy stopnie w grze — wyższy
#: stopień to ten sam sklep, tylko większy (jak ratusze różnią się wielkością).
SKLEP = {'sklep1': 250, 'sklep2': 280, 'sklep3': 310}


def main() -> None:
    for f in KRAINY:
        if (WSAD / f'm2-{f}-sklep.png').exists():
            surowy = twardaAlfa(wczytaj(f'm2-{f}-sklep'))
            for nazwa, wys in SKLEP.items():
                dopasuj(surowy, wys).save(MIASTO / f'{f}-{nazwa}.png')
            print(f'  {f}-sklep1..3.png')
        zrodlo = WSAD / f'm2-tlo-{f}.png'
        if zrodlo.exists():
            im = Image.open(zrodlo).convert('RGB')
            skala = PAN_W / im.width
            im = im.resize((PAN_W, round(im.height * skala)), Image.LANCZOS)
            # Przycinamy z góry: niebo jest tam, gdzie i tak nic nie stoi.
            im = im.crop((0, im.height - PAN_H, PAN_W, im.height))
            im.save(MIASTO / f'tlo-{f}.png')
            print(f'  tlo-{f}.png')
        for nazwa, wys in BUDYNKI.items():
            if not (WSAD / f'm2-{f}-{nazwa}.png').exists():
                continue
            surowy = wczytaj(f'm2-{f}-{nazwa}')
            # Rezerwaty, boisko i farma to szerokie, płaskie wysepki. Przy
            # wysokości starych brył wychodziły o połowę szersze od domów
            # i nachodziły na sąsiadów — dla nich pilnujemy też szerokości.
            if not nazwa.startswith(('ratusz', 'fort', 'centrum')):
                szer = SZER_SALI if nazwa == 'sala' else SZER_PLASKICH
                wys = min(wys, round(szer * wys * surowy.height / surowy.width))
            im = dopasuj(twardaAlfa(surowy), wys)
            im.save(MIASTO / f'{f}-{nazwa}.png')
            print(f'  {f}-{nazwa}.png  {im.width} × {im.height}')


if __name__ == '__main__':
    main()
