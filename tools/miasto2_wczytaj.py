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

from PIL import Image

from wsad_wczytaj import BUDYNKI, MIASTO, PAN_H, PAN_W, WSAD, dopasuj, wczytaj

KRAINY = ('bor', 'grota', 'zbocze')


def main() -> None:
    for f in KRAINY:
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
            im = dopasuj(wczytaj(f'm2-{f}-{nazwa}'), wys)
            im.save(MIASTO / f'{f}-{nazwa}.png')
            print(f'  {f}-{nazwa}.png  {im.width} × {im.height}')


if __name__ == '__main__':
    main()
