#!/usr/bin/env python3
"""Wczytuje obiekty mapy w stylu gier Pokémon (`tools/PROMPTY-MAPA-3.md`).

Pliki `tools/wsad/m3-<nazwa>.png` (i `m3-zima-<nazwa>.png`) trafiają do gry
pod DOTYCHCZASOWYMI nazwami sprite'ów i w tych samych wysokościach
(`OBIEKTY`, `BUDOWLE`, `ZESTAWY` z `wsad_wczytaj.py`), więc scena rysuje je
bez zmian w kodzie. Brakujący plik zostawia starą grafikę — można podmieniać
obiekt po obiekcie.

    python3 tools/mapa3_wczytaj.py
"""

import re

from PIL import Image

from osadz_podstawke import oczysc_brzeg, osadz
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
        # `m3b-` — ten sam obiekt przemalowany bez podstawki gruntu (teren
        # planszy dochodzi wprost do budynku); wtedy tylko czyszczony brzeg.
        # Bez niego: `m3-` z podstawką wtopioną w teren (`osadz_podstawke.py`).
        # `m3f-` — obiekt przemalowany w rzucie od frontu (klocki, etap C) —
        # ma pierwszeństwo przed obiema wersjami z góry.
        if (WSAD / f'm3f-{nazwa}.png').exists():
            im = dopasuj(oczysc_brzeg(wczytaj(f'm3f-{nazwa}')), wys)
        elif (WSAD / f'm3b-{nazwa}.png').exists():
            im = dopasuj(oczysc_brzeg(wczytaj(f'm3b-{nazwa}')), wys)
        elif (WSAD / f'm3-{nazwa}.png').exists():
            im = dopasuj(osadz(wczytaj(f'm3-{nazwa}')), wys)
        else:
            continue
        ostrzezOTle(nazwa, im)
        im.save(MAPA / f'{nazwa}.png')
        print(f'  {nazwa}.png  {im.width} × {im.height}')
    for zestaw, pliki in ZESTAWY.items():
        for nazwa, wys in pliki.items():
            # Jak wyżej: `m3b-` (bez podstawki) przed `m3-`. Stosy surowców
            # z `m3-` mają podstawkę jak obiekty; drzewa, krzaki i kępy tylko
            # czyszczony brzeg (jasna obwódka po wycięciu tła).
            if (WSAD / f'm3b-{zestaw}-{nazwa}.png').exists():
                im = dopasuj(oczysc_brzeg(wczytaj(f'm3b-{zestaw}-{nazwa}')), wys)
            elif (WSAD / f'm3-{zestaw}-{nazwa}.png').exists():
                zrodlo = wczytaj(f'm3-{zestaw}-{nazwa}')
                im = dopasuj(osadz(zrodlo) if nazwa.startswith('stos-') else oczysc_brzeg(zrodlo), wys)
            else:
                continue
            im.save(MAPA / zestaw / f'{nazwa}.png')
            print(f'  {zestaw}/{nazwa}.png  {im.width} × {im.height}')
    # Klocki terenu (`src/data/klocki.ts`): `m3k-<zestaw>-<nazwa>` →
    # `public/mapa/klocki/<zestaw>/<nazwa>.png`, przycięte do rysunku,
    # szerokość 96 px na pole obrysu (scena skaluje do szerokości obrysu),
    # jasna obwódka zdjęta, a podstawka gruntu wtopiona jak u obiektów.
    for zrodlo in sorted(WSAD.glob('m3k-*.png')):
        _, zestaw, nazwa = zrodlo.stem.split('-', 2)
        szer = int(re.search(r'(\d)x\d', nazwa).group(1))
        im = osadz(wczytaj(zrodlo.stem), pasDolu=0.1)
        im = im.crop(im.getchannel('A').point(lambda v: 255 if v > 24 else 0).getbbox())
        W = szer * 96
        im = im.resize((W, max(1, round(im.height * W / im.width))), Image.LANCZOS)
        cel = MAPA / 'klocki' / zestaw
        cel.mkdir(parents=True, exist_ok=True)
        im.save(cel / f'{nazwa}.png')
        print(f'  klocki/{zestaw}/{nazwa}.png  {im.width} × {im.height}')
    # Tekstury terenu: kryjące, 768 × 768 jak w starym wczytywaczu — resztę
    # (kafelkowanie, maski, brzegi) robi `render_mapa.py`.
    for zrodlo in sorted(WSAD.glob('m3-teren-*.png')):
        nazwa = zrodlo.stem[3:]
        Image.open(zrodlo).convert('RGB').resize((768, 768), Image.LANCZOS).save(TEREN / f'{nazwa}.png')
        print(f'  teren/{nazwa}.png  768 × 768')


if __name__ == '__main__':
    main()
