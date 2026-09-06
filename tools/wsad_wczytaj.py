#!/usr/bin/env python3
"""Wczytuje wsad z modelu graficznego (`tools/wsad/`) do gry.

Co to robi
----------
Surowe pliki z modelu mają 1254 × 1254 px, sylwetkę gdzieś w środku kadru
i sporo pustego marginesu. Gra potrzebuje czegoś innego: sprite'a przyciętego
do sylwetki, w rozmiarze docelowym, z wypalonym cieniem rzuconym i pod nazwą,
której szuka scena. Ten skrypt robi całą tę drogę i **nie dotyka kodu gry** —
podmienia pliki tam, gdzie leżały stare, więc po jego przejściu gra od razu
pokazuje nową grafikę.

Dlaczego cień wypalamy tutaj, a nie w scenie
--------------------------------------------
Cień musi być ŚCIĘTY (podstawa przy budynku, wierzchołek w bok) i rozmyty tym
bardziej, im dalej od podstawy. Phaser umie tylko obrócić kopię sprite'a wokół
punktu zaczepienia, a to daje drugą bryłę leżącą na zawiasie — sprawdzone,
wygląda gorzej niż brak cienia. Tu mamy przekształcenie afiniczne i rozmycie.

Skrypt jest **idempotentny**: puszczony drugi raz nadpisuje swoje wyjście
i niczego nie dokłada. To jest warunek z `PRZEBIEG.md` — każdy krok musi dać
się powtórzyć po urwanej sesji.

    python3 tools/wsad_wczytaj.py
"""

from collections import deque
from pathlib import Path

import numpy as np
from PIL import Image, ImageFilter

KORZEN = Path(__file__).resolve().parent.parent
WSAD = KORZEN / 'tools' / 'wsad'
MIASTO = KORZEN / 'public' / 'miasto'
MAPA = KORZEN / 'public' / 'mapa'
TEREN = MAPA / 'teren'

#: Okno gry. Panorama miasta zajmuje szerokość okna i wysokość bez pasków.
PAN_W, PAN_H = 960, 596

#: Ile procent szerokości bryły dokładamy z lewej na cień rzucony.
#: Scena musi znać tę samą liczbę, żeby wiedzieć, gdzie w pliku stoi budynek.
MARGINES_CIENIA = 0.42

#: Powyżej tego nasycenia piksel należy do przedmiotu, a nie do tła. Szachownica
#: przezroczystości z modelu ma nasycenie do 7, bryły — mediana 67 i wyżej.
SZARE_NASYCENIE = 12
#: Najciemniejsza szarość, jaką jeszcze uznajemy za tło. Ciemniejsza krata się
#: nie zdarza, a niżej zaczynają się czarne kontury rysunków.
SZARE_OD = 95
#: Ile kadru musi zająć tło, żeby uznać, że reguła je znalazła. Obrazy z wsadu
#: mają wokół sylwetki kilkaset pikseli marginesu, więc prawdziwe tło zajmuje
#: kilkanaście procent i więcej; kilka procent to znak, że reguła trafiła
#: w pojedyncze jasne piksele przy krawędzi, a nie w tło.
MINIMUM_TLA = 0.05


def zapisz(im: Image.Image, sciezka: Path) -> None:
    """Zapisuje sprite'a i pilnuje, żeby MIAŁ przezroczystość.

    Sprite bez ani jednego przezroczystego piksela to sprite z wypalonym tłem.
    W grze wygląda jak szary prostokąt położony na trawie i widać to dopiero
    na ekranie — osiem budowli przeszło tak przez cały potok, sondy i deploy,
    bo żadne sprawdzenie nie patrzyło na sam obrazek. Tutaj to kosztuje jedną
    linijkę i wywala się w miejscu, w którym błąd powstaje.
    """
    if np.asarray(im.convert('RGBA'))[:, :, 3].min() == 255:
        raise SystemExit(
            f'{sciezka.name}: brak przezroczystości — tło zostało wypalone w piksele. '
            f'Popraw regułę w `bezTla` dla {sciezka.stem}.'
        )
    im.save(sciezka)


def przytnij(im: Image.Image) -> Image.Image:
    """Przycina do widocznej zawartości. Model zostawia wokół sylwetki
    kilkaset pikseli pustego kadru, a od tego zależy potem każde położenie."""
    bbox = im.getbbox()
    return im.crop(bbox) if bbox else im


def dopasuj(im: Image.Image, wysokosc: int) -> Image.Image:
    w = max(1, round(im.width * wysokosc / im.height))
    return im.resize((w, wysokosc), Image.LANCZOS)


def zCieniem(im: Image.Image, sila: float = 1.0) -> Image.Image:
    """Dokłada cień rzucony w lewo-dół i przenosi bryłę na szersze płótno.

    Słońce stoi po prawej — tak jest na wszystkich obrazach z modelu — więc
    cień idzie w lewo. Zanika z odległością od podstawy; równa plama na całej
    długości czyta się jak druga bryła leżąca na ziemi.
    """
    w, h = im.size
    margines = int(w * MARGINES_CIENIA)
    plotno = Image.new('RGBA', (w + margines, h), (0, 0, 0, 0))

    a = im.getchannel('A')
    scinanie, splaszczenie = 0.8, 0.34
    cien = a.transform(
        (w + margines, h),
        Image.AFFINE,
        (1, scinanie, margines - scinanie * h, 0, 1 / splaszczenie, h * (1 - 1 / splaszczenie)),
        resample=Image.BILINEAR,
    ).filter(ImageFilter.GaussianBlur(max(1.0, w * 0.012)))
    zanik = np.linspace(0.25, 1.0, cien.width, dtype=np.float32)[None, :]
    alfa = (np.asarray(cien).astype(np.float32) * zanik * 0.5 * sila).clip(0, 255)
    warstwa = Image.new('RGBA', plotno.size, (26, 34, 30, 255))
    warstwa.putalpha(Image.fromarray(alfa.astype(np.uint8), 'L'))
    plotno.alpha_composite(warstwa)
    plotno.alpha_composite(im, (margines, 0))
    return plotno


def _wytnij_tlo(im: Image.Image, kandydaci) -> tuple[Image.Image, float]:
    """Wypełnienie od KRAWĘDZI kadru po polach uznanych za możliwe tło.

    Zwraca obrazek i ułamek kadru, który uznano za tło — po tym ułamku poznaje
    się, czy reguła w ogóle trafiła. Wypełnienie zatrzymuje się na obrysie
    sylwetki, więc białe światła w środku bryły i tak zostają nietknięte.
    """
    tab = np.asarray(im).copy()
    h, w = tab.shape[:2]

    tlo = np.zeros((h, w), dtype=bool)
    kolejka = deque()
    for x in range(w):
        for y in (0, h - 1):
            if kandydaci[y, x] and not tlo[y, x]:
                tlo[y, x] = True
                kolejka.append((y, x))
    for y in range(h):
        for x in (0, w - 1):
            if kandydaci[y, x] and not tlo[y, x]:
                tlo[y, x] = True
                kolejka.append((y, x))
    while kolejka:
        y, x = kolejka.popleft()
        for dy, dx in ((1, 0), (-1, 0), (0, 1), (0, -1)):
            ny, nx = y + dy, x + dx
            if 0 <= ny < h and 0 <= nx < w and kandydaci[ny, nx] and not tlo[ny, nx]:
                tlo[ny, nx] = True
                kolejka.append((ny, nx))

    # Obrys sylwetki jest wygładzony, więc tuż przy nim leżą piksele w połowie
    # tła. Zostawione, dają wokół bryły jasną obwódkę — na trawie widać ją od
    # razu. Poszerzamy więc tło o jeden piksel w stronę przedmiotu: kosztuje to
    # włos sylwetki, a obwódki nie ma.
    maska = np.asarray(
        Image.fromarray((tlo * 255).astype(np.uint8), 'L').filter(ImageFilter.MaxFilter(3))
    ) > 0
    tab[maska, 3] = 0
    return Image.fromarray(tab, 'RGBA'), float(tlo.mean())


def bezTla(im: Image.Image, prog: int = 232) -> Image.Image:
    """Usuwa wypalone tło. Dwie reguły, w kolejności od bezpieczniejszej.

    Model oddaje tło na trzy sposoby. Raz jest to prawdziwa przezroczystość,
    raz białe tło (o które prosi prompt, bo tak jest pewniej), a raz — i to
    kosztowało osiem grafik — SZACHOWNICA przezroczystości wypalona w piksele:
    model rysuje to, co widzi w edytorze, razem z szarą kratą. Krata ma dwie
    szarości, około 125 i 195, więc próg 232 jej w ogóle nie widzi i sprite
    trafia do gry jako nieprzezroczysty szary prostokąt.

    Kraty nie da się złapać samą jasnością — obniżenie progu do 100 zjadłoby
    jasne części przedmiotów. Rozpoznaje ją NIEBARWNOŚĆ: krata ma nasycenie
    poniżej 8, a bryły z wsadu medianę 67–149.

    Ale niebarwność sama w sobie też nie wystarczy jako reguła domyślna:
    kamienie są szare i jasne, i wypełnienie zaczęło im zjadać brzegi
    (sprawdzone na `skala-plaska` — ubyło pół głazu). Dlatego najpierw idzie
    reguła biała, a szara wchodzi TYLKO wtedy, gdy tamta nie znalazła tła.
    Obraz na białym tle ma go kilkanaście procent kadru i więcej; jeśli wyszło
    mniej niż `MINIMUM_TLA`, znaczy, że tło jest inne niż białe.
    """
    im = im.convert('RGBA')
    rgb = np.asarray(im)[:, :, :3].astype(np.int16)
    jasnosc = rgb.min(axis=2)

    wynik, udzial = _wytnij_tlo(im, jasnosc >= prog)
    if udzial >= MINIMUM_TLA:
        return wynik

    nasycenie = rgb.max(axis=2) - jasnosc
    szare, _ = _wytnij_tlo(im, (nasycenie <= SZARE_NASYCENIE) & (jasnosc >= SZARE_OD))
    return szare


def wczytaj(nazwa: str) -> Image.Image:
    im = Image.open(WSAD / f'{nazwa}.png').convert('RGBA')
    # Plik bez ani jednego przezroczystego piksela to plik na białym tle.
    if np.asarray(im)[:, :, 3].min() == 255:
        im = bezTla(im)
    return przytnij(im)


# ---------------------------------------------------------------------------
# MIASTO
# ---------------------------------------------------------------------------

#: Wysokość bryły w pliku. Na ekranie budynek ma 150–300 px, więc 560 px daje
#: dwukrotny zapas na zmniejszanie — bez zapasu skalowanie w dół rozmywa detal.
BUDYNKI = {
    'ratusz1': 520, 'ratusz2': 600, 'ratusz3': 680, 'fort': 520,
    'siedlisko1': 380, 'siedlisko2': 400, 'siedlisko3': 400, 'siedlisko4': 440,
    'siedlisko5': 470, 'siedlisko6': 640, 'specjalny': 380, 'plac': 360,
}

PANORAMY = {'tlo-bor': 'bor', 'tlo-grota': 'grota', 'tlo-zbocze': 'zbocze'}


def miasto():
    MIASTO.mkdir(parents=True, exist_ok=True)
    for nazwa, wys in BUDYNKI.items():
        # BEZ wypalonego cienia rzuconego.
        #
        # Cień szedł w lewo, ścięty i spłaszczony, i na ekranie czytał się jako
        # osobna ciemna plama leżąca obok budynku — dokładnie to, co miał
        # zwalczać. Scena rysuje teraz własny cień kontaktowy, miękki i wprost
        # pod podstawą, a ten jeden naprawdę osadza bryłę. Dwa cienie naraz to
        # o jeden za dużo, więc zostaje ten lepszy.
        im = dopasuj(wczytaj(nazwa), wys)
        zapisz(im, MIASTO / f'bor-{nazwa}.png')
        print(f'  bor-{nazwa}.png  {im.width} × {im.height}')

    for plik, frakcja in PANORAMY.items():
        im = Image.open(WSAD / f'{plik}.png').convert('RGB')
        # Kadrujemy przez wypełnienie: proporcje modelu (1,60) i nasze (1,61)
        # różnią się o włos, więc skalujemy po szerokości i przycinamy z góry —
        # niebo jest tam, gdzie i tak nic nie stoi.
        skala = PAN_W / im.width
        im = im.resize((PAN_W, round(im.height * skala)), Image.LANCZOS)
        im = im.crop((0, im.height - PAN_H, PAN_W, im.height))
        im.save(MIASTO / f'tlo-{frakcja}.png')
        print(f'  tlo-{frakcja}.png  {im.width} × {im.height}')


# ---------------------------------------------------------------------------
# MAPA
# ---------------------------------------------------------------------------
#
# Podmieniamy pliki POD ISTNIEJĄCYMI NAZWAMI i w tych samych wysokościach,
# co dotychczasowe sprite'y. Dzięki temu krok pierwszy nie rusza ani jednej
# linijki kodu sceny: mapa przygody po prostu rysuje to, co zawsze rysowała,
# tylko ładniejsze. Ewentualne przesunięcia poprawimy dopiero wtedy, gdy
# zobaczymy je na ekranie.

OBIEKTY = {
    'm-drzewo': [('drzewo', 144), ('drzewo-b', 144)],
    'm-sosna': [('sosna', 144), ('sosna-b', 144), ('sosna-mala', 96)],
    'm-krzak': [('krzak', 84), ('krzak-2', 84)],
    # `skala-2` i `kopiec-2` to odbicia, nie osobne rysunki: rytm skalnego
    # grzbietu łamie odbicie i skala, a nie liczba plików. Cztery sylwetki
    # z jednego źródła wystarczą, żeby nie było widać powtórzenia.
    'm-skala': [('skala', 67), ('skala-2', 67, True), ('kopiec', 37), ('kopiec-2', 37, True)],
    # Trzy osobne bryły skalne (PROMPTY.md, część IV). Dopóki ich nie ma,
    # kępy skalne składają się z odbić jednego głazu i pasmo gór się powtarza.
    # Wpisy są pomijane, jeśli plik nie istnieje — potok ma działać na tym,
    # co jest, a nie wywracać się na tym, czego jeszcze nie dostarczono.
    'm-skala-ostra': [('skala-ostra', 84)],
    'm-skala-plaska': [('skala-plaska', 46)],
    'm-skala-zwal': [('skala-zwal', 62)],
    # Kopalnie surowców: własny rysunek dla każdego z czterech surowców.
    #
    # Wcześniej wszystkie trzy (poza sadem) były jednym rysunkiem przemalowanym
    # na barwę surowca w `frakcje_przemaluj.py`. Przemalowanie mówi, ŻE to co
    # innego, ale nie mówi CO: wytwórnia pokeballi i huta odłamków różniły się
    # wyłącznie odcieniem. Teraz każda ma swoją bryłę i widać ją z drugiego
    # końca ekranu — a to jest w grze o surowce informacja pierwszej potrzeby.
    'wytwornia-pokeballi': [('kopalnia-pokeball', 160)],
    'kopalnia-kamieni': [('kopalnia-kamien', 160)],
    'huta-odlamkow': [('kopalnia-odlamek', 160)],
    # Kopalnia i sad zajmują bryłę 3 × 1, więc na ekranie mają ponad sto
    # pikseli wysokości. Przy dawnych 57 px scena je POWIĘKSZAŁA i wychodziły
    # rozmyte obok ostrych drzew — pliki muszą być większe od tego, jak są
    # rysowane, a nie mniejsze.
    'm-kopalnia': [('kopalnia', 160)],
    'm-sad': [('sad', 160)],
    'm-skrzynia': [('skrzynia', 38)],
    'm-zamek': [('zamek-las', 384), ('zamek-ogien', 336)],
    's-pokeball': [('pokeball', 29)],
    's-jagody': [('jagody', 31)],
    's-kamien': [('kamien-ewolucji', 29)],
    's-odlamki': [('odlamki', 30)],
}

#: Budowle odwiedzane. Wysokość w pliku to wysokość na ekranie (`BUDOWLE.wys`
#: w polach × 48 px) razy dwa — ten sam zapas na zmniejszanie, co przy bryłach
#: miasta. Sprite powiększany przez scenę jest rozmyty obok ostrych drzew,
#: więc plik musi być większy od tego, jak się go rysuje, a nie mniejszy.
BUDOWLE = {
    'oboz-treningowy': 154,
    'kamienna-wieza': 192,
    'arena': 144,
    'drzewo-wiedzy': 230,
    'wieza-obserwacyjna': 250,
    'ranczo': 144,
    'zrodlo': 106,
    'portal': 173,
    'gniazdo': 134,
    'osrodek-ewolucji': 182,
    'wiatrak': 211,
    'ognisko': 86,
    'chatka': 115,
    'woz': 125,
}

TERENY = ['teren-trawa', 'teren-sciezka', 'teren-piasek', 'teren-woda', 'teren-las', 'teren-skaly']

#: Warianty tego samego terenu — druga i trzecia trawa, drugie skały i tak dalej.
#: Nazwy z wsadu bywają pisane raz z łącznikiem, raz bez („teren-trawa2" obok
#: „teren-trawa-2"), więc szukamy obu zamiast poprawiać plik po każdej dostawie.
WARIANTY = [2, 3, 4]


def warianty(nazwa: str):
    """Ścieżki wariantów danego terenu, w kolejności numerów, tylko istniejące."""
    for n in WARIANTY:
        for wzor in (f'{nazwa}{n}', f'{nazwa}-{n}'):
            p = WSAD / f'{wzor}.png'
            if p.exists():
                yield n, p
                break


def mapa():
    for zrodlo, cele in OBIEKTY.items():
        if not (WSAD / f'{zrodlo}.png').exists():
            print(f'  {zrodlo} — brak pliku, pomijam')
            continue
        im = wczytaj(zrodlo)
        for nazwa, wys, *odbij in cele:
            wynik = dopasuj(im, wys)
            if odbij and odbij[0]:
                wynik = wynik.transpose(Image.FLIP_LEFT_RIGHT)
            zapisz(wynik, MAPA / f'{nazwa}.png')
        print(f'  {zrodlo} → {", ".join(c[0] for c in cele)}')

    for nazwa, wys in BUDOWLE.items():
        zrodlo = WSAD / f'{nazwa}.png'
        if not zrodlo.exists():
            print(f'  {nazwa} — brak pliku, pomijam')
            continue
        im = dopasuj(wczytaj(nazwa), wys)
        zapisz(im, MAPA / f'{nazwa}.png')
        print(f'  {nazwa}.png  {im.width} × {im.height}')

    TEREN.mkdir(parents=True, exist_ok=True)
    for nazwa in TERENY:
        # Tekstury zostają duże: im więcej materiału, tym mniej widać powtórzenie.
        zrodla = [(1, WSAD / f'{nazwa}.png'), *warianty(nazwa)]
        for n, sciezka in zrodla:
            cel = f'{nazwa}.png' if n == 1 else f'{nazwa}-{n}.png'
            Image.open(sciezka).convert('RGB').resize((768, 768), Image.LANCZOS).save(TEREN / cel)
            print(f'  teren/{cel}  768 × 768')


if __name__ == '__main__':
    print('miasto:')
    miasto()
    print('mapa:')
    mapa()
    print('\nGotowe. Kod gry nietknięty — sprite\'y podmienione pod starymi nazwami.')
