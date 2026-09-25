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

import json
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


#: Wysepka mniejsza niż tyle procent głównej bryły to śmieć z kadru, nie część
#: budowli. Ognisko ma najdrobniejsze osobne elementy w całym wsadzie i mieści
#: się grubo powyżej tego progu.
PROG_WYSEPKI = 0.02


def tylkoSylwetka(im: Image.Image) -> Image.Image:
    """Wycina drobiny, które model zostawił poza budowlą.

    Wokół sylwetki potrafią zostać kreski i smugi z kadru: nie stykają się
    z kratką, więc wypełnienie ich nie zabiera, a `przytnij` rozciąga przez
    nie kadr i budowla przestaje stać tam, gdzie mówi jej położenie. Zostaje
    największa spójna bryła i wszystko, co jest od niej istotnym ułamkiem —
    osobne kamienie czy iskry przy ognisku są duże, ślad po kadrze nie.
    """
    widoczne = np.asarray(im.convert('RGBA'))[:, :, 3] > PROG_ALFY
    h, w = widoczne.shape
    etykiety = np.zeros((h, w), dtype=np.int32)
    pola: list[int] = [0]
    for y0 in range(h):
        for x0 in range(w):
            if not widoczne[y0, x0] or etykiety[y0, x0]:
                continue
            nr = len(pola)
            pola.append(0)
            kolejka = deque([(y0, x0)])
            etykiety[y0, x0] = nr
            while kolejka:
                y, x = kolejka.popleft()
                pola[nr] += 1
                for dy, dx in ((1, 0), (-1, 0), (0, 1), (0, -1)):
                    ny, nx = y + dy, x + dx
                    if 0 <= ny < h and 0 <= nx < w and widoczne[ny, nx] and not etykiety[ny, nx]:
                        etykiety[ny, nx] = nr
                        kolejka.append((ny, nx))
    if len(pola) <= 1:
        return im
    najwieksze = max(pola)
    zostaje = np.array([i == 0 or n >= najwieksze * PROG_WYSEPKI for i, n in enumerate(pola)])
    tab = np.asarray(im.convert('RGBA')).copy()
    tab[~zostaje[etykiety], 3] = 0
    return Image.fromarray(tab, 'RGBA')


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


#: Ile piksel może odbiegać od odcienia kratki, żeby wciąż być tłem.
LUZ_SZACHOWNICY = 26
#: Najmniejsza różnica jasności między polami kratki. Poniżej tego to nie
#: szachownica, tylko jednolite szare tło — a tym zajmuje się `bezTla`.
ROZSTAW_KRATKI = 30


#: Tło chromakey: czysta magenta. Model NIE UMIE oddać przezroczystości —
#: obrazkowe modele Gemini wypuszczają kryjące RGB bez kanału alfa, więc na
#: prośbę o przezroczyste tło malują kratkę, którą edytory rysują POD alfą.
#: Odtwarzanie alfy z takiej kratki to zgadywanie wzoru i przegrywa
#: z gradientem, poświatą i szarym kamieniem budowli. Prościej dać modelowi
#: tło, którego w rysunku nie ma, i wyciąć je po barwie: jeden warunek
#: zamiast trzech heurystyk. Magenta, nie zieleń — nasze budowle są pełne
#: mchu i bluszczu, a różu nie ma w nich ani jednego.
CHROMA_G = 60
CHROMA_G_PELNA = 110


def jestChroma(tab: np.ndarray) -> bool:
    """Czy tło jest chromakeyem, a nie kratką albo bielą."""
    ramka = np.concatenate(
        [tab[:6, :, :3].reshape(-1, 3), tab[-6:, :, :3].reshape(-1, 3)]).astype(int)
    roznica = (ramka[:, 0] + ramka[:, 2]) / 2 - ramka[:, 1]
    return bool((roznica > CHROMA_G_PELNA).mean() > 0.8)


def bezChromy(im: Image.Image) -> Image.Image:
    """Zdejmuje tło chromakey i zdejmuje jego poświatę z krawędzi.

    Miarą jest przewaga czerwieni i błękitu nad zielenią: dla magenty ogromna,
    dla wszystkiego, co rysujemy, bliska zeru. Krawędzie dostają alfę
    pośrednią, żeby obrys nie był schodkowy, a piksele częściowo przezroczyste
    — odbarwienie: model rozmywa magentę w kontur przedmiotu i bez tego
    budowla dostaje różową obwódkę, widoczną dopiero na trawie.
    """
    tab = np.asarray(im.convert('RGBA')).astype(np.float32)
    r, g, b = tab[:, :, 0], tab[:, :, 1], tab[:, :, 2]
    roznica = (r + b) / 2 - g
    alfa = 1.0 - np.clip((roznica - CHROMA_G) / (CHROMA_G_PELNA - CHROMA_G), 0.0, 1.0)

    # Odbarwienie TYLKO na krawędzi, czyli tam, gdzie alfa jest pośrednia
    # i barwa jest mieszaniną przedmiotu z tłem. Zastosowane do wnętrza
    # sylwetki odbarwia sam rysunek: czerwona chorągiew strażnicy zrobiła się
    # pomarańczowa, bo czerwień też ma przewagę nad zielenią.
    spill = (roznica > 0) & (alfa > 0) & (alfa < 1)
    nadmiar = np.where(spill, np.minimum(roznica, CHROMA_G), 0.0)
    tab[:, :, 0] = np.clip(r - nadmiar, 0, 255)
    tab[:, :, 2] = np.clip(b - nadmiar, 0, 255)
    tab[:, :, 3] = tab[:, :, 3] * alfa
    return Image.fromarray(tab.astype(np.uint8), 'RGBA')


def odcienieKratki(tab: np.ndarray) -> tuple[int, int] | None:
    """Dwa poziomy jasności namalowanej kratki, albo None, gdy jej nie ma.

    Pierwotnie stały tu dwie liczby (126 i 196) odczytane z pierwszej dostawy.
    Druga dostawa przyszła z kratką CIEMNĄ (~26 i ~87) i wykrywanie ją
    przepuściło — plik szedł do gry jako pełny prostokąt tła. Odcieni nie da
    się więc wpisać na stałe: model rysuje kratkę w takim odcieniu, w jakim
    akurat pokazuje ją jego edytor. Szukamy zatem WZORU, nie barwy: dwóch
    bezbarwnych poziomów, które razem zajmują obrzeże całego kadru.
    """
    ramka = np.concatenate(
        [tab[:8, :, :3].reshape(-1, 3), tab[-8:, :, :3].reshape(-1, 3),
         tab[:, :8, :3].reshape(-1, 3), tab[:, -8:, :3].reshape(-1, 3)]
    ).astype(int)
    bezbarwne = (ramka.max(axis=1) - ramka.min(axis=1)) <= 14
    if bezbarwne.mean() < 0.7:
        return None
    jasnosc = ramka[bezbarwne].mean(axis=1)
    ile = np.bincount(np.round(jasnosc).astype(int), minlength=256)
    a = int(ile.argmax())
    # Drugie pole musi leżeć DALEKO od pierwszego, inaczej złapiemy sąsiedni
    # słupek tego samego pola i wyjdzie „kratka" z jednolitej szarości.
    daleko = ile.copy()
    daleko[max(0, a - ROZSTAW_KRATKI):a + ROZSTAW_KRATKI + 1] = 0
    b = int(daleko.argmax())
    if daleko[b] == 0:
        return None
    wKratke = (np.abs(jasnosc - a) <= LUZ_SZACHOWNICY) | (np.abs(jasnosc - b) <= LUZ_SZACHOWNICY)
    # Oba pola muszą naprawdę występować: przy jednym mamy tło jednolite.
    udzialy = [(np.abs(jasnosc - x) <= LUZ_SZACHOWNICY).mean() for x in (a, b)]
    if wKratke.mean() * bezbarwne.mean() <= 0.7 or min(udzialy) < 0.2:
        return None
    return (min(a, b), max(a, b))


def jestSzachownica(tab: np.ndarray) -> bool:
    """Czy obrazek ma NAMALOWANĄ szachownicę zamiast przezroczystości.

    Model raz oddaje prawdziwą alfę, raz białe tło, a raz rysuje kratkę, którą
    edytory pokazują pod przezroczystością — i wtedy plik jest w pełni kryjący,
    a budowla ma na mapie szary prostokąt zamiast tła. Kratki nie da się
    pomylić z niczym w samych budowlach: jest idealnie bezbarwna i zajmuje
    obrzeże całego kadru.
    """
    return odcienieKratki(tab) is not None


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


def _polePola(jasnosc: np.ndarray, ciemne: int, jasne: int) -> int:
    """Bok jednego pola kratki, w pikselach.

    Okno, przez które patrzy `_wKratke`, musi być WIĘKSZE od pola — inaczej
    mieści się w całości wewnątrz jednego i nigdy nie zobaczy drugiego.
    Maska robi się wtedy dziurawa, wypełnienie nie ma którędy przejść
    i wokół przedmiotu zostaje kwadrat tła. Stała nie wystarcza: model
    rysuje pole na 12 pikseli przy budowli i na 26 przy drobnym relikcie,
    bo kadr jest ten sam, a przedmiot w nim mniejszy.
    """
    srodek = (ciemne + jasne) / 2
    dlugosci = []
    for pas in (jasnosc[:4, :].mean(axis=0), jasnosc[:, :4].mean(axis=1)):
        granice = np.flatnonzero(np.diff((pas > srodek).astype(int)) != 0)
        if len(granice) > 2:
            dlugosci.append(float(np.median(np.diff(granice))))
    return int(round(max(dlugosci))) if dlugosci else 12


def _oknoKratki(jasnosc: np.ndarray, ciemne: int, jasne: int) -> int:
    """Promień okna: z zapasem większy od pola, żeby zawsze objąć jego sąsiada."""
    return min(60, max(6, round(_polePola(jasnosc, ciemne, jasne) * 1.3)))


def _wKratke(bezbarwny: np.ndarray, jasnosc: np.ndarray, ciemne: int, jasne: int) -> np.ndarray:
    """Maska pikseli należących do namalowanej kratki.

    Sam warunek „bezbarwny i w jasności któregoś pola" nie wystarcza i przy
    ciemnej kratce jest wręcz groźny: szary kamień budowli też jest bezbarwny
    i trafia w te widełki, więc wypełnienie od krawędzi wchodzi przez niego
    w środek sylwetki i wyjada jej kawałek. Widać to dopiero na trawie —
    w podglądzie z szachownicą dziura w murze wygląda jak przezroczystość.

    Rozróżnia je WZÓR, nie barwa: w oknie wokół piksela kratki leżą OBA pola
    i prawie nic poza nimi, a wokół piksela kamienia rozciąga się ciągłe
    pasmo odcieni. Zwężanie widełek tego nie załatwia — kratka rozpada się
    wtedy na niepołączone wnętrza pól (rozmyte granice wypadają) i wypełnienie
    nie ma którędy przejść.
    """
    okno = _oknoKratki(jasnosc, ciemne, jasne)

    def udzial(maska: np.ndarray) -> np.ndarray:
        rozmyte = Image.fromarray((maska * 255).astype(np.uint8)).filter(
            ImageFilter.BoxBlur(okno))
        return np.asarray(rozmyte).astype(np.float32) / 255.0

    wasko = 10
    uc = udzial(bezbarwny & (np.abs(jasnosc - ciemne) <= wasko))
    uj = udzial(bezbarwny & (np.abs(jasnosc - jasne) <= wasko))
    return (uc > 0.15) & (uj > 0.15) & (uc + uj > 0.62)


def bezSzachownicy(im: Image.Image, odcienie: tuple[int, int] | None = None) -> Image.Image:
    """Usuwa NAMALOWANĄ szachownicę przezroczystości.

    Dwa kroki, bo sam flood zostawia obwódkę: kratka jest rozmyta na styku
    z sylwetką i ten wieniec jasnoszarych pikseli widać na mapie jako aureolę
    wokół budowli — dokładnie to, co miało zniknąć.

     1. wypełnienie od krawędzi po pikselach rozpoznanych jako kratka;
     2. dosięgnięcie do sylwetki: `_wKratke` patrzy przez okno, więc pas
        kratki o szerokości tego okna tuż przy budowli nie ma jak się
        zakwalifikować i zostaje wieńcem. Rozrost po pikselach w barwie
        kratki, na tyle kroków, ile liczy okno, dochodzi do samej sylwetki;
     3. dokładka: piksele stykające się z tłem, wciąż bezbarwne i w zakresie
        jasności kratki, idą razem z nią. To zjada obwódkę, a nie sylwetkę,
        bo prawdziwe krawędzie budowli mają barwę.
    """
    im = im.convert('RGBA')
    tab = np.asarray(im).copy()
    ciemne, jasne = odcienie or odcienieKratki(tab) or (126, 196)
    rgb = tab[:, :, :3].astype(int)
    bezbarwny = (rgb.max(axis=2) - rgb.min(axis=2)) <= 14
    jasnosc = rgb.mean(axis=2)
    wKratke = _wKratke(bezbarwny, jasnosc, ciemne, jasne)
    tlo = _flood_od_krawedzi(wKratke)

    def rozrost(maska: np.ndarray, kroki: int) -> None:
        for _ in range(kroki):
            sasiad = np.zeros_like(tlo)
            sasiad[1:, :] |= tlo[:-1, :]
            sasiad[:-1, :] |= tlo[1:, :]
            sasiad[:, 1:] |= tlo[:, :-1]
            sasiad[:, :-1] |= tlo[:, 1:]
            tlo[:] |= sasiad & maska

    # Wieniec: same pola kratki, wąskie widełki. Szersze wpuściłyby rozrost
    # w ciemny kamień budowli — przy ciemnej kratce to ta sama jasność.
    czyste = bezbarwny & (
        (np.abs(jasnosc - ciemne) <= 10) | (np.abs(jasnosc - jasne) <= 10))
    rozrost(czyste, _oknoKratki(jasnosc, ciemne, jasne) + 2)

    # Obwódka: rozmyty styk kratki z sylwetką. Zakres jasności idzie
    # z WYKRYTYCH pól, bo przy ciemnej kratce widełki dobrane do jasnej nie
    # objęłyby ani jednego piksela obwódki.
    prawie = ((rgb.max(axis=2) - rgb.min(axis=2)) <= 26) & (
        jasnosc > ciemne - LUZ_SZACHOWNICY) & (jasnosc < jasne + LUZ_SZACHOWNICY)
    rozrost(prawie, 2)

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
    tab = np.asarray(im)
    if tab[:, :, 3].min() == 255:
        if jestChroma(tab):
            im = bezChromy(im)
        else:
            kratka = odcienieKratki(tab)
            im = bezSzachownicy(im, kratka) if kratka else bezTla(im)
    return przytnij(tylkoSylwetka(bezWoalu(im)))


# ---------------------------------------------------------------------------
# MIASTO
# ---------------------------------------------------------------------------

#: Wysokość bryły w pliku. Na ekranie budynek ma 150–300 px, więc 560 px daje
#: dwukrotny zapas na zmniejszanie — bez zapasu skalowanie w dół rozmywa detal.
BUDYNKI = {
    'ratusz1': 520, 'ratusz2': 600, 'ratusz3': 680, 'fort': 520,
    'siedlisko1': 380, 'siedlisko2': 400, 'siedlisko3': 400, 'siedlisko4': 440,
    'siedlisko5': 470, 'siedlisko6': 640, 'specjalny': 380, 'plac': 360,
    # Ulepszone siedliska trzech górnych poziomów. Stoją w tym samym punkcie
    # panoramy co ich podstawowa wersja, więc i wysokość mają tę samą.
    'siedlisko4u': 440, 'siedlisko5u': 470, 'siedlisko6u': 640,
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
    # Brama w przełęczy: szeroka na dwa pola z okładem, bo ma zagradzać
    # przejście, a nie stać przy drodze. Mechaniki jeszcze nie ma — grafika
    # czeka na nią gotowa, przerobiona tym samym potokiem co reszta.
    'straznica': 190,
    'namiot-klucznika': 150,
    'wiezienie': 168,
    'chata-jasnowidza': 154,
    # Relikty leżą na ziemi, więc są drobne — mają kusić z daleka kolorem,
    # a nie zasłaniać pole, na którym stoją.
    'relikt-kompas': 62,
    'relikt-pas': 58,
    'relikt-rog': 62,
    'relikt-skrzydla': 66,
}

TERENY = [
    'teren-trawa', 'teren-sciezka', 'teren-piasek', 'teren-woda', 'teren-las', 'teren-skaly',
    # Krainy z drugiej dostawy. Kosztów ruchu jeszcze nie mają — tekstura
    # musi być pierwsza, bo bez niej nie ma czego postawić na planszy.
    'teren-bagno', 'teren-jalowa', 'teren-snieg',
    # Plansze kampanii (`tools/PROMPTY-PLANSZE.md`): lód zamiast przebarwionej
    # wody w Twierdzy, błoto bagienne pod oczkami wody.
    'teren-lod', 'teren-bloto',
    # Polana, runda 6: ubita brązowa ziemia pod skarpami (`TEKSTURY` Polany).
    'teren-ziemia',
    # Bagna, runda 6: mętna woda trzęsawiska i bruk grobli (`TEKSTURY` Bagien).
    'teren-woda-bagno', 'teren-bruk',
]

#: Naklejki terenu (`tools/PROMPTY-PLANSZE.md`) → `public/mapa/tlo/<nazwa>.png`,
#: wysokość w pikselach (pole ma 48). Rysuje je `render_mapa.py` w tle planszy.
TLO = MAPA / 'tlo'
NAKLEJKI = {
    'trzcina-1': 40, 'trzcina-2': 44, 'trzcina-3': 36,
    'grazel-1': 22, 'grazel-2': 24,
    'martwe-drzewo-1': 70, 'martwe-drzewo-2': 64,
    'pniak-bagienny': 30,
    'glaz-sniezny-1': 34, 'glaz-sniezny-2': 40, 'glaz-sniezny-3': 30,
    'zaspa-1': 26, 'zaspa-2': 30,
    'kra-lodu-1': 26, 'kra-lodu-2': 30,
    'krzak-zimowy-1': 30,
    'kwiaty-1': 20, 'kwiaty-2': 22,
    # Bagna, runda 5 (wzorzec HotA): drobiazgi trzęsawiska.
    'grzyby-bagienne': 22, 'kloda-mech': 24, 'kamienie-mech': 24, 'paproc': 28, 'irysy': 30,
    # Twierdza, runda 3 (wzorzec HotA): ośnieżone świerczki na pustym śniegu.
    'swierczek-sniezny-1': 46, 'swierczek-sniezny-2': 50,
    # Polana, runda 6 (wzorzec HotA): drobiazgi łąki.
    'pniak-lakowy': 30, 'glazy-lakowe': 26, 'kepa-kwiatow': 30,
    # Bagna, runda 6: zatopione pnie i kępy turzycy na mętnej wodzie.
    'pien-zatopiony': 30, 'kepa-turzycy': 34,
    # Twierdza, runda 4 (HotA): pole śniegu — łaty ziemi, płyty skał, suche
    # trawy i nawisy (surowe kremowe z API; we wsadzie przestudzone do bieli).
    'lata-ziemi-snieg': 40, 'skalki-snieg': 42, 'trawy-snieg': 34, 'nawis-sniezny': 34,
}

#: Zestawy klimatu dla SCENY: `tools/wsad/<zestaw>-<nazwa>.png` →
#: `public/mapa/<zestaw>/<nazwa>.png`. Nazwy i wysokości jak sprite'y, które
#: zastępują (patrz STAN.md, „Grafiki plansz kampanii").
ZESTAWY = {
    'zima': {
        'sosna': 144, 'sosna-b': 144, 'sosna-mala': 96, 'drzewo': 144, 'drzewo-b': 144,
        'krzak': 84, 'krzak-2': 84, 'skala': 67, 'skala-2': 67,
        'kepa-las-1': 216, 'kepa-las-2': 216, 'kepa-las-3': 216, 'kepa-las-4': 216,
        'kepa-skaly-1': 216, 'kepa-skaly-2': 216, 'kepa-skaly-3': 216, 'kepa-skaly-4': 216,
        'kopalnia-kamien': 160, 'kopalnia-odlamek': 160, 'kopalnia-pokeball': 160, 'sad': 160,
        # Twierdza, runda 3: zielone budowle i omszałe kopce na śniegu
        # („obok zasp rosną liściaste drzewa") — zimowe wersje.
        'zamek-las': 384, 'zamek-ogien': 336, 'chatka': 115, 'ognisko': 86, 'wiatrak': 211,
        'kopiec': 37, 'kopiec-2': 37,
        # Twierdza, runda 3 (HotA): stosy surowców na śniegu (`USTAWIENIA.znajdzki`).
        'stos-pokeball': 72, 'stos-jagody': 72, 'stos-odlamki': 72, 'stos-kamien-ewolucji': 72,
        # Twierdza, runda 3 (HotA, kamera 32 px): budowle odwiedzane w śniegu
        # zamiast omszałych i łąkowych (PROMPTY-PLANSZE §10b).
        'oboz-treningowy': 154, 'kamienna-wieza': 192, 'arena': 144, 'drzewo-wiedzy': 230,
        'wieza-obserwacyjna': 250, 'ranczo': 144, 'zrodlo': 106, 'gniazdo': 134,
        'chata-jasnowidza': 154,
        # Twierdza, runda 4 (HotA): wielopolowe góry rozstawiane ręcznie
        # (`USTAWIENIA.masywy`) — scena skaluje je po szerokości w polach.
        'gora-1': 340, 'gora-2': 380, 'gora-3': 280, 'gora-4': 220, 'gora-5': 240,
        # Twierdza, runda 6 (HotA): skarpy i skalne progi na równinie (§18).
        'gora-6': 240, 'gora-7': 200, 'gora-8': 240,
    },
    'bagno': {
        'drzewo': 144, 'drzewo-b': 144, 'krzak': 84, 'krzak-2': 84,
        'kepa-las-1': 216, 'kepa-las-2': 216, 'kepa-las-3': 216, 'kepa-las-4': 216,
        'kopalnia-kamien': 160, 'kopalnia-odlamek': 160, 'kopalnia-pokeball': 160,
        # Bagna, runda 5 („płaski teren bez wzniesień"): omszałe wzgórza
        # z urwiskami torfu zamiast szarych głazów.
        'kepa-skaly-1': 216, 'kepa-skaly-2': 216, 'kepa-skaly-3': 216, 'kepa-skaly-4': 216,
        'skala': 67, 'skala-2': 67, 'kopiec': 37, 'kopiec-2': 37,
        # Bagna, runda 5 (HotA): stosy surowców leżące na ziemi zamiast ikon
        # z paska (scena bierze je przy `USTAWIENIA.znajdzki`).
        'stos-pokeball': 72, 'stos-jagody': 72, 'stos-odlamki': 72, 'stos-kamien-ewolucji': 72,
        # Bagna, runda 8 (HotA): pasma gór rozstawiane ręcznie
        # (`USTAWIENIA.masywy`) zamiast osobnych stożków kęp.
        'gora-1': 340, 'gora-2': 380, 'gora-3': 280, 'gora-4': 320, 'gora-5': 320, 'gora-6': 340,
        # Bagna, runda 10 (HotA: „pojedyncze stożki"): zwarte masywy widziane
        # z góry, kilka rzędów szczytów (PROMPTY-PLANSZE §19), i sad jagód
        # jako chata zbieracza na torfowisku zamiast jabłoni z koszami.
        'gora-7': 380, 'gora-8': 340, 'gora-9': 380, 'sad': 160,
    },
    # Polana: trawiaste góry z brązowymi urwiskami zamiast omszałych głazów
    # (runda 3 ślepego porównania: „bez pasma gór w kadrze").
    'polana': {
        'kepa-skaly-1': 216, 'kepa-skaly-2': 216, 'kepa-skaly-3': 216, 'kepa-skaly-4': 216,
        'skala': 67, 'skala-2': 67,
        # Drobne kopce przy skałach: bez nich scena dokłada podstawowe
        # omszałe głazy, obce obok trawiastych gór.
        'kopiec': 37, 'kopiec-2': 37,
        # Polana, runda 5 (HotA): stosy surowców na łące zamiast ikon z paska.
        # Scena rysuje je na pół pola (`USTAWIENIA.znajdzki`), plik dwa razy
        # większy — przy dużym zmniejszeniu w scenie krawędzie migotały.
        'stos-pokeball': 48, 'stos-jagody': 48, 'stos-odlamki': 48, 'stos-kamien-ewolucji': 48,
        # Polana, runda 6: dwa RÓŻNE nieregularne krzewy zamiast jednej
        # okrągłej kuli z jagodami na co trzecim polu łąki.
        'krzak': 84, 'krzak-2': 84,
        # Polana, runda 9: zwarte masywy lasu zamiast rzadkich kęp drzewek
        # (PROMPTY-PLANSZE §17).
        'kepa-las-1': 216, 'kepa-las-2': 216, 'kepa-las-3': 216, 'kepa-las-4': 216,
        'sosna': 144, 'sosna-b': 144, 'sosna-mala': 96, 'drzewo': 144, 'drzewo-b': 144,
    },
}

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

    # Naklejki terenu: ozdoby malowane w tle planszy przez `render_mapa.py`
    # (`NAKLEJKI` w `tools/mapy/<id>.py`), bez cienia — tło ma własne światło.
    TLO.mkdir(parents=True, exist_ok=True)
    for nazwa, wys in NAKLEJKI.items():
        zrodlo = WSAD / f'{nazwa}.png'
        if not zrodlo.exists():
            continue
        im = dopasuj(wczytaj(nazwa), wys)
        im.save(TLO / f'{nazwa}.png')
        print(f'  tlo/{nazwa}.png  {im.width} × {im.height}')

    # Zestawy klimatu: te same nazwy co sprite'y sceny, w podkatalogu klimatu
    # (`public/mapa/zima/sosna.png` obok `public/mapa/sosna.png`). Czyta je
    # scena dla planszy, która ma `zestaw` w USTAWIENIACH — patrz STAN.md.
    for zestaw, pliki in ZESTAWY.items():
        (MAPA / zestaw).mkdir(parents=True, exist_ok=True)
        for nazwa, wys in pliki.items():
            zrodlo = WSAD / f'{zestaw}-{nazwa}.png'
            if not zrodlo.exists():
                continue
            im = dopasuj(wczytaj(f'{zestaw}-{nazwa}'), wys)
            ostrzezOTle(f'{zestaw}-{nazwa}', im)
            im.save(MAPA / zestaw / f'{nazwa}.png')
            print(f'  {zestaw}/{nazwa}.png  {im.width} × {im.height}')

    # Scena podmienia tylko sprite'y, które w zestawie naprawdę są —
    # brakujący plik dałby na serwerze deweloperskim stronę HTML zamiast
    # obrazka (Phaser nie zgłasza tego jako błędu ładowania, sprite znika).
    spis = {z: sorted(n for n in pliki if (MAPA / z / f'{n}.png').exists())
            for z, pliki in ZESTAWY.items()}
    (KORZEN / 'src' / 'data' / 'zestawy-klimatu.ts').write_text(
        '// Generowany przez tools/wsad_wczytaj.py — nie edytować ręcznie.\n'
        '// Sprite\'y `m-<nazwa>`, które plansza z `USTAWIENIA.zestaw` bierze z\n'
        '// `public/mapa/<zestaw>/<nazwa>.png` zamiast `public/mapa/<nazwa>.png`.\n'
        'export const ZESTAWY_KLIMATU: Record<string, readonly string[]> = '
        + json.dumps(spis, indent=2) + ';\n', encoding='utf-8')

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
