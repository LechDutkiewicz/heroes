#!/usr/bin/env python3
"""Wczytuje obiekty mapy w stylu gier Pokémon (`tools/PROMPTY-MAPA-3.md`).

Pliki `tools/wsad/m3-<nazwa>.png` (i `m3-zima-<nazwa>.png`) trafiają do gry
pod DOTYCHCZASOWYMI nazwami sprite'ów i w tych samych wysokościach
(`OBIEKTY`, `BUDOWLE`, `ZESTAWY` z `wsad_wczytaj.py`), więc scena rysuje je
bez zmian w kodzie. Brakujący plik zostawia starą grafikę — można podmieniać
obiekt po obiekcie.

    python3 tools/mapa3_wczytaj.py
"""

from wsad_wczytaj import BUDOWLE, MAPA, OBIEKTY, WSAD, ZESTAWY, dopasuj, ostrzezOTle, wczytaj

#: Nazwa sprite'a → wysokość w pliku (z tabel starego wczytywacza).
WYSOKOSCI = dict(BUDOWLE)
for cele in OBIEKTY.values():
    for nazwa, wys, *_ in cele:
        WYSOKOSCI.setdefault(nazwa, wys)


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


if __name__ == '__main__':
    main()
