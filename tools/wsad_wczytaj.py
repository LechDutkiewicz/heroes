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


def przytnij(im: Image.Image) -> Image.Image:
    """Przycina do widocznej zawartości. Model zostawia wokół sylwetki
    kilkaset pikseli pustego kadru, a od tego zależy potem każde położenie."""
    bbox = im.getbbox()
    return im.crop(bbox) if bbox else im


def dopasuj(im: Image.Image, wysokosc: int) -> Image.Image:
    """Zmniejsza do zadanej wysokości — z alfą WMNOŻONĄ w barwę.

    Bez tego zmniejszanie miesza barwę widocznych pikseli z barwą pikseli
    przezroczystych, a te mają w plikach z modelu kolor czarny. Wynik to
    ciemna obwódka dookoła całej sylwetki: na białym tle niewidoczna,
    na trawie widać ją jako brudny kontur. Mnożymy więc barwę przez alfę
    przed zmniejszeniem i dzielimy po nim — wtedy w mieszanie idzie tylko to,
    co naprawdę widać.
    """
    w = max(1, round(im.width * wysokosc / im.height))
    tab = np.asarray(im.convert('RGBA')).astype(np.float32)
    a = tab[:, :, 3:4] / 255.0
    tab[:, :, :3] *= a
    male = np.asarray(
        Image.fromarray(tab.astype(np.uint8), 'RGBA').resize((w, wysokosc), Image.LANCZOS)
    ).astype(np.float32)
    a2 = np.clip(male[:, :, 3:4] / 255.0, 1e-3, 1)
    male[:, :, :3] = np.clip(male[:, :, :3] / a2, 0, 255)
    return Image.fromarray(male.astype(np.uint8), 'RGBA')


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


def _flood_od_krawedzi(kandydat: np.ndarray) -> np.ndarray:
    """Zbiór pikseli tła: wypełnienie od KRAWĘDZI kadru po polu `kandydat`.

    Od krawędzi, a nie progiem po całym obrazku, bo inaczej znikają jasne
    części samego przedmiotu — biały kamień, oświetlona ściana, jajko w gnieździe.
    """
    h, w = kandydat.shape
    tlo = np.zeros((h, w), dtype=bool)
    kolejka = deque()
    for x in range(w):
        for y in (0, h - 1):
            if kandydat[y, x] and not tlo[y, x]:
                tlo[y, x] = True
                kolejka.append((y, x))
    for y in range(h):
        for x in (0, w - 1):
            if kandydat[y, x] and not tlo[y, x]:
                tlo[y, x] = True
                kolejka.append((y, x))
    while kolejka:
        y, x = kolejka.popleft()
        for dy, dx in ((1, 0), (-1, 0), (0, 1), (0, -1)):
            ny, nx = y + dy, x + dx
            if 0 <= ny < h and 0 <= nx < w and kandydat[ny, nx] and not tlo[ny, nx]:
                tlo[ny, nx] = True
                kolejka.append((ny, nx))
    return tlo


#: Odcienie namalowanej szachownicy: ciemne pole ~126, jasne ~196.
SZACHOWNICA = (126, 196)
#: Ile piksel może odbiegać od tych odcieni, żeby wciąż być tłem.
LUZ_SZACHOWNICY = 26


def jestSzachownica(tab: np.ndarray) -> bool:
    """Czy obrazek ma NAMALOWANĄ szachownicę zamiast przezroczystości.

    Model raz oddaje prawdziwą alfę, raz białe tło, a raz rysuje kratkę, którą
    edytory pokazują pod przezroczystością — i wtedy plik jest w pełni kryjący,
    a budowla ma na mapie szary prostokąt zamiast tła. Kratki nie da się
    pomylić z niczym w samych budowlach: jest idealnie bezbarwna i zajmuje
    obrzeże całego kadru.
    """
    ramka = np.concatenate(
        [tab[:8, :, :3].reshape(-1, 3), tab[-8:, :, :3].reshape(-1, 3),
         tab[:, :8, :3].reshape(-1, 3), tab[:, -8:, :3].reshape(-1, 3)]
    ).astype(int)
    bezbarwne = (ramka.max(axis=1) - ramka.min(axis=1)) <= 14
    jasnosc = ramka.mean(axis=1)
    wKratke = bezbarwne & (
        (np.abs(jasnosc - SZACHOWNICA[0]) <= LUZ_SZACHOWNICY)
        | (np.abs(jasnosc - SZACHOWNICA[1]) <= LUZ_SZACHOWNICY)
    )
    return wKratke.mean() > 0.7


def bezTla(im: Image.Image, prog: int = 232) -> Image.Image:
    """Usuwa jednolite jasne tło, idąc wypełnieniem od krawędzi kadru.

    Progowanie całego obrazka odpada: zjadłoby też jasne części samego
    przedmiotu. Wypełnienie od brzegu zatrzymuje się na pierwszym ciemniejszym
    pikselu i sylwetki nie tyka.
    """
    im = im.convert('RGBA')
    tab = np.asarray(im).copy()
    jasny = tab[:, :, :3].min(axis=2) >= prog
    tab[_flood_od_krawedzi(jasny), 3] = 0
    return Image.fromarray(tab, 'RGBA')


def bezSzachownicy(im: Image.Image) -> Image.Image:
    """Usuwa NAMALOWANĄ szachownicę przezroczystości.

    Dwa kroki, bo sam flood zostawia obwódkę: kratka jest rozmyta na styku
    z sylwetką i ten wieniec jasnoszarych pikseli widać na mapie jako aureolę
    wokół budowli — dokładnie to, co miało zniknąć.

     1. wypełnienie od krawędzi po pikselach w barwie kratki;
     2. dokładka: piksele stykające się z tłem, wciąż bezbarwne i w zakresie
        jasności kratki, idą razem z nią. To zjada obwódkę, a nie sylwetkę,
        bo prawdziwe krawędzie budowli mają barwę.
    """
    im = im.convert('RGBA')
    tab = np.asarray(im).copy()
    rgb = tab[:, :, :3].astype(int)
    bezbarwny = (rgb.max(axis=2) - rgb.min(axis=2)) <= 14
    jasnosc = rgb.mean(axis=2)
    wKratke = bezbarwny & (
        (np.abs(jasnosc - SZACHOWNICA[0]) <= LUZ_SZACHOWNICY)
        | (np.abs(jasnosc - SZACHOWNICA[1]) <= LUZ_SZACHOWNICY)
    )
    tlo = _flood_od_krawedzi(wKratke)

    # Obwódka: dwa przejścia rozrostu po pikselach „prawie kratka".
    prawie = ((rgb.max(axis=2) - rgb.min(axis=2)) <= 26) & (jasnosc > 96) & (jasnosc < 232)
    for _ in range(2):
        sasiad = np.zeros_like(tlo)
        sasiad[1:, :] |= tlo[:-1, :]
        sasiad[:-1, :] |= tlo[1:, :]
        sasiad[:, 1:] |= tlo[:, :-1]
        sasiad[:, :-1] |= tlo[:, 1:]
        tlo |= sasiad & prawie

    tab[tlo, 3] = 0
    wynik = Image.fromarray(tab, 'RGBA')
    # Miękka krawędź: po wycięciu obrys jest schodkowy, a wszystko dokoła na
    # tej mapie jest wygładzone. Rozmycie samej alfy zostawia barwy w spokoju.
    alfa = wynik.getchannel('A').filter(ImageFilter.GaussianBlur(0.8))
    wynik.putalpha(alfa)
    return wynik


#: Poniżej tej alfy piksel jest resztką po tle, a nie krawędzią przedmiotu.
PROG_ALFY = 40


def bezWoalu(im: Image.Image) -> Image.Image:
    """Ścina prawie przezroczystą mgiełkę wokół sylwetki.

    Model zostawia wokół przedmiotu kilkadziesiąt tysięcy pikseli o alfie 1–15
    w kolorze ciemnoszarym. Na białym tle w podglądzie tego nie widać, ale na
    mapie każdy taki piksel PRZYCIEMNIA trawę — i budowla dostaje prostokątny
    woal dokładnie w kształcie kadru z modelu. To jest ten „dorysowany kawałek
    tła", którego nie da się wtopić w teren, bo on nie ma nic wspólnego
    z terenem: to ślad po kadrze.

    Zamiast samego progu rozciągamy resztę alfy z powrotem do pełnej skali —
    inaczej krawędzie, które model zrobił miękko, zrobiłyby się o krok bledsze.
    """
    tab = np.asarray(im.convert('RGBA')).astype(np.float32)
    a = tab[:, :, 3]
    a = np.where(a < PROG_ALFY, 0.0, (a - PROG_ALFY) * (255.0 / (255.0 - PROG_ALFY)))
    tab[:, :, 3] = a.clip(0, 255)
    return Image.fromarray(tab.astype(np.uint8), 'RGBA')


def ostrzezOTle(nazwa: str, im: Image.Image) -> None:
    """Krzyczy, gdy sprite wyszedł z tłem zamiast z sylwetką.

    Dwa błędy, które przeszły do gry i wyglądały jak usterka silnika: budowla
    z NAMALOWANĄ szachownicą (szary prostokąt na trawie) i budowla z woalem
    z prawie przezroczystych pikseli (prostokątny cień w kształcie kadru).
    Oba widać w pliku od razu — dlatego mówimy o nich tutaj, a nie dopiero
    na ekranie.
    """
    a = np.asarray(im.convert('RGBA'))[:, :, 3]
    if a.min() == 255:
        print(f'  UWAGA: {nazwa} nie ma ANI JEDNEGO przezroczystego piksela — tło zostało w pliku')
        return
    # Próg wysoki, bo mały, ciasno przycięty sprite (pokeball, jagody) dotyka
    # krawędzi całkiem legalnie — sylwetka po prostu wypełnia kadr. Woal po tle
    # kryje ramkę niemal w całości i dopiero to jest usterką.
    ramka = np.concatenate([a[0], a[-1], a[:, 0], a[:, -1]])
    if (ramka > 16).mean() > 0.85:
        print(f'  UWAGA: {nazwa} dotyka tłem krawędzi kadru — sylwetka jest przycięta albo została mgiełka')


def wczytaj(nazwa: str) -> Image.Image:
    im = Image.open(WSAD / f'{nazwa}.png').convert('RGBA')
    # Plik bez ani jednego przezroczystego piksela ma tło namalowane: albo
    # białe, albo w kratkę udającą przezroczystość.
    if np.asarray(im)[:, :, 3].min() == 255:
        im = bezSzachownicy(im) if jestSzachownica(np.asarray(im)) else bezTla(im)
    return przytnij(bezWoalu(im))


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
        im.save(MIASTO / f'bor-{nazwa}.png')
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
            ostrzezOTle(nazwa, wynik)
            wynik.save(MAPA / f'{nazwa}.png')
        print(f'  {zrodlo} → {", ".join(c[0] for c in cele)}')

    for nazwa, wys in BUDOWLE.items():
        zrodlo = WSAD / f'{nazwa}.png'
        if not zrodlo.exists():
            print(f'  {nazwa} — brak pliku, pomijam')
            continue
        im = dopasuj(wczytaj(nazwa), wys)
        ostrzezOTle(nazwa, im)
        im.save(MAPA / f'{nazwa}.png')
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
