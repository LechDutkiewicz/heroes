#!/usr/bin/env python3
"""Wczytuje obiekty mapy w stylu gier Pokémon (`tools/PROMPTY-MAPA-3.md`).

Pliki `tools/wsad/m3-<nazwa>.png` (i `m3-zima-<nazwa>.png`) trafiają do gry
pod DOTYCHCZASOWYMI nazwami sprite'ów i w tych samych wysokościach
(`OBIEKTY`, `BUDOWLE`, `ZESTAWY` z `wsad_wczytaj.py`), więc scena rysuje je
bez zmian w kodzie. Brakujący plik zostawia starą grafikę — można podmieniać
obiekt po obiekcie.

    python3 tools/mapa3_wczytaj.py
"""

from PIL import Image

from wsad_wczytaj import BUDOWLE, MAPA, OBIEKTY, TEREN, WSAD, ZESTAWY, dopasuj, ostrzezOTle, wczytaj

#: Nazwa sprite'a → wysokość w pliku (z tabel starego wczytywacza).
WYSOKOSCI = dict(BUDOWLE)
for cele in OBIEKTY.values():
    for nazwa, wys, *_ in cele:
        WYSOKOSCI.setdefault(nazwa, wys)
# Artefakt na mapie (osobny plik — `kamien-ewolucji.png` to też ikona
# paska surowców): 0,8 pola jak stosy, 80 px.
WYSOKOSCI['artefakt'] = 80


def main() -> None:
    for nazwa, wys in WYSOKOSCI.items():
        if not (WSAD / f'm3-{nazwa}.png').exists():
            continue
        im = dopasuj(wczytaj(f'm3-{nazwa}'), wys)
        ostrzezOTle(nazwa, im)
        im.save(MAPA / f'{nazwa}.png')
        print(f'  {nazwa}.png  {im.width} × {im.height}')
    for zestaw, pliki in ZESTAWY.items():
        for nazwa, wys in pliki.items():
            if not (WSAD / f'm3-{zestaw}-{nazwa}.png').exists():
                continue
            im = dopasuj(wczytaj(f'm3-{zestaw}-{nazwa}'), wys)
            im.save(MAPA / zestaw / f'{nazwa}.png')
            print(f'  {zestaw}/{nazwa}.png  {im.width} × {im.height}')
    # Tekstury terenu: kryjące, 768 × 768 jak w starym wczytywaczu — resztę
    # (kafelkowanie, maski, brzegi) robi `render_mapa.py`.
    for zrodlo in sorted(WSAD.glob('m3-teren-*.png')):
        nazwa = zrodlo.stem[3:]
        Image.open(zrodlo).convert('RGB').resize((768, 768), Image.LANCZOS).save(TEREN / f'{nazwa}.png')
        print(f'  teren/{nazwa}.png  768 × 768')


if __name__ == '__main__':
    main()
