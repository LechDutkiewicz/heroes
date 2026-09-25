#!/usr/bin/env python3
"""Efekty terenu dla plansz kampanii — to, czego jedna tekstura nie powie.

Skąd to się wzięło
------------------
Ślepe porównanie z mapą przygody Heroes 2 (runda 1 plansz kampanii) przegrało
na wszystkich trzech planszach z tego samego powodu: „grunt to jedna rozmyta
tekstura na scenę". Bagno czytało się jak brązowa plama w kolorze drogi,
śnieg jak mgła albo usterka rysowania, a droga rozpływała się w trzęsawisku.
W Heroes 2 każdy teren ma STRUKTURĘ, po której poznaje się go bez koloru:
bagno ma czarne oczka wody, trzcinę i grążele, śnieg ma zaspy z niebieskim
cieniem, droga ma brzeg.

Wszystko tutaj maluje się W TLE planszy (`render_mapa.py`), więc idzie przez
to samo wygładzanie całej mapy co reszta terenu — nie ma osobnej warstwy
z ostrymi brzegami obok miękkiego gruntu. Efekty włącza plansza (`EFEKTY`
w `tools/mapy/<id>.py`); „Dwie Doliny" żadnego nie mają i ich tło zostaje
bajt w bajt takie jak przed zmianą.
"""

import numpy as np
from PIL import Image, ImageDraw, ImageFilter

from teren_malowanie import szum


def _tab(im: Image.Image) -> np.ndarray:
    return np.asarray(im.convert('RGB'), dtype=np.float32)


def _obraz(tab: np.ndarray) -> Image.Image:
    return Image.fromarray(tab.clip(0, 255).astype(np.uint8), 'RGB')


def zaspy(warstwa: Image.Image, kafel: int, ziarno: int) -> Image.Image:
    """Śnieg z RZEŹBĄ: zaspy oświetlone z lewej góry, cienie niebieskie, iskry.

    Płaska biel wygląda jak mgła, bo nie ma w niej nic, co mówi „powierzchnia".
    Wysokość zasp to szum w dwóch skalach (duże wały na kilka pól i drobne
    fałdy), a światło liczymy z pochodnej — jak cieniowanie reliefu na mapie
    fizycznej. Cień nie jest szary, tylko niebieski: tak wygląda śnieg w
    słońcu i tak go rysują wszystkie gry, w których zima jest czytelna.
    """
    W, H = warstwa.size
    h = szum(W, H, max(2, int(kafel * 1.2)), ziarno) * 1.0 + szum(W, H, max(2, int(kafel * 0.4)), ziarno + 1) * 0.3
    # Zaspy mają grzbiet: wartość bezwzględna szumu daje ostre krawędzie
    # (jak wydmy), a nie łagodne pagórki, które z daleka rozmywają się w mgłę.
    h = 1 - np.abs(h)
    gy, gx = np.gradient(h)
    swiatlo = -(gx + gy) * kafel * 0.9
    swiatlo = np.clip(swiatlo, -1, 1)[..., None]
    tab = _tab(warstwa)
    jasne = tab + (255 - tab) * np.clip(swiatlo, 0, 1) * 0.7
    cien = np.array([95, 135, 205], dtype=np.float32)
    ciemne = tab * (1 + np.clip(swiatlo, -1, 0) * 0.5) + cien * (-np.clip(swiatlo, -1, 0)) * 0.45
    tab = np.where(swiatlo > 0, jasne, ciemne)
    # Iskry: pojedyncze jasne punkty na grzbietach zasp, nie wszędzie.
    rng = np.random.default_rng(ziarno + 2)
    ile = W * H // 900
    xs = rng.integers(1, W - 1, ile)
    ys = rng.integers(1, H - 1, ile)
    na_grzbiecie = swiatlo[ys, xs, 0] > 0.25
    for x, y in zip(xs[na_grzbiecie], ys[na_grzbiecie]):
        tab[y, x] = 255
        tab[y - 1:y + 2, x] = np.maximum(tab[y - 1:y + 2, x], 235)
        tab[y, x - 1:x + 2] = np.maximum(tab[y, x - 1:x + 2], 235)
    return _obraz(tab)


def relief(warstwa: Image.Image, maska: Image.Image, kafel: int, ziarno: int, sniezny: bool = False) -> Image.Image:
    """Pasmo skał jako BRYŁA: strona oświetlona, strona w cieniu, grań.

    Werdykt rundy 2: „nie ma rzeźby terenu, nie ma pasm gór". Tekstura skał
    jest płaska jak kamienny chodnik. Wysokość bierzemy z samej maski skał
    (rozmytej — środek pasma najwyżej, brzeg nisko) plus szum, a światło
    z pochodnej, jak na mapie fizycznej: lewy górny stok jaśnieje, prawy dolny
    ciemnieje. W Twierdzy (`sniezny`) grań i oświetlone stoki bieleją — śnieg
    leży tam, gdzie pada światło, cień zostaje skalny.
    """
    W, H = warstwa.size
    m = np.asarray(maska.filter(ImageFilter.GaussianBlur(kafel * 0.9)), dtype=np.float32) / 255.0
    h = m * 1.6 + szum(W, H, max(2, int(kafel * 0.6)), ziarno) * 0.25 * m
    gy, gx = np.gradient(h)
    swiatlo = np.clip(-(gx + gy) * kafel * 2.2, -1, 1)[..., None]
    tab = _tab(warstwa)
    tab = np.where(swiatlo > 0, tab + (255 - tab) * swiatlo * 0.35, tab * (1 + swiatlo * 0.55))
    if sniezny:
        grzbiet = np.clip((h[..., None] - 1.0) * 2.5, 0, 1) + np.clip(swiatlo, 0, 1) * 0.8
        snieg = np.array([235, 242, 250], dtype=np.float32)
        tab = tab * (1 - np.clip(grzbiet, 0, 0.85)) + snieg * np.clip(grzbiet, 0, 0.85)
    return _obraz(tab)


def lod(warstwa: Image.Image, maska: Image.Image, kafel: int, ziarno: int) -> Image.Image:
    """Skuta lodem tafla: rysy pęknięć i jaśniejszy szron przy brzegu."""
    W, H = warstwa.size
    im = warstwa.convert('RGB').copy()
    d = ImageDraw.Draw(im, 'RGBA')
    rng = np.random.default_rng(ziarno)
    m = np.asarray(maska, dtype=np.uint8)
    ile = W * H // (kafel * kafel * 3)
    for _ in range(ile):
        x, y = int(rng.integers(0, W)), int(rng.integers(0, H))
        if m[y, x] < 200:
            continue
        punkty = [(x, y)]
        kat = rng.uniform(0, 6.28)
        for _ in range(int(rng.integers(3, 7))):
            kat += rng.uniform(-0.9, 0.9)
            dl = rng.uniform(kafel * 0.25, kafel * 0.7)
            x, y = x + np.cos(kat) * dl, y + np.sin(kat) * dl
            punkty.append((x, y))
        d.line(punkty, fill=(245, 252, 255, 150), width=2)
        d.line([(px + 1, py + 1) for px, py in punkty], fill=(90, 130, 170, 90), width=1)
    # Szron przy brzegu: maska rozmyta minus maska — pas tuż przy lądzie.
    brzeg = np.asarray(maska.filter(ImageFilter.GaussianBlur(kafel * 0.25)), dtype=np.float32) / 255
    pas = np.clip((1 - brzeg) * (m / 255.0) * 3, 0, 1)[..., None]
    tab = _tab(im)
    tab = tab + (255 - tab) * pas * 0.6
    return _obraz(tab)


def bagno(plansza: Image.Image, maska: Image.Image, kafel: int, ziarno: int) -> Image.Image:
    """Trzęsawisko, które czyta się jako bagno: oczka wody, kępy, trzcina, grążele.

    Oczka to ciemna, zielonoczarna woda w zagłębieniach (szum ponad progiem,
    tylko w głębi bagna, nie na brzegu), z jasnym połyskiem od strony światła.
    Między nimi kępy — trochę jaśniejsze, a na nich trzcina: krótkie kreski
    ciemnej zieleni z jasnym końcem. Na oczkach grążele. Trzy rzeczy, po
    których bagno poznaje się z drugiego końca ekranu, zanim zobaczy się kolor.
    """
    W, H = plansza.size
    m = np.asarray(maska, dtype=np.float32) / 255.0
    rdzen = np.asarray(maska.filter(ImageFilter.MinFilter(max(3, (kafel // 3) | 1))), dtype=np.float32) / 255.0
    n = szum(W, H, max(2, int(kafel * 0.7)), ziarno) + szum(W, H, max(2, int(kafel * 0.25)), ziarno + 5) * 0.3
    oczka = np.clip((n - 0.18) * 5, 0, 1) * rdzen
    oczka_im = Image.fromarray((oczka * 255).astype(np.uint8), 'L').filter(ImageFilter.GaussianBlur(1.5))
    oczka = np.asarray(oczka_im, dtype=np.float32)[..., None] / 255.0
    tab = _tab(plansza)
    # Całe bagno ciemniej i zieleniej — żeby nie miało koloru drogi.
    tab = tab * (1 - m[..., None] * 0.34) + np.array([28, 58, 30]) * m[..., None] * 0.2
    woda = np.array([22, 38, 30], dtype=np.float32)
    tab = tab * (1 - oczka * 0.85) + woda * oczka * 0.85
    # Połysk: górny brzeg oczka (pochodna maski w pionie) jaśnieje.
    gy = np.gradient(oczka[..., 0], axis=0)
    blask = np.clip(gy * 6, 0, 1)[..., None]
    tab = tab + (np.array([150, 185, 150]) - tab) * blask * 0.5
    im = _obraz(tab)

    d = ImageDraw.Draw(im, 'RGBA')
    rng = np.random.default_rng(ziarno + 9)
    oczka2 = oczka[..., 0]
    # Trzcina na kępach.
    for _ in range(W * H // 900):
        x, y = int(rng.integers(2, W - 2)), int(rng.integers(12, H - 2))
        if m[y, x] < 0.9 or oczka2[y, x] > 0.2:
            continue
        for _ in range(int(rng.integers(5, 10))):
            dx = rng.uniform(-6, 6)
            wys = rng.uniform(kafel * 0.2, kafel * 0.42)
            pochyl = rng.uniform(-4, 4)
            x0, y0 = x + dx, y + rng.uniform(-1.5, 1.5)
            d.line([(x0 + 1, y0 + 1), (x0 + pochyl + 1, y0 - wys + 1)], fill=(10, 20, 10, 120), width=3)
            d.line([(x0, y0), (x0 + pochyl, y0 - wys)], fill=(58, 92, 38, 240), width=3)
            d.line([(x0 + pochyl * 0.75, y0 - wys * 0.75), (x0 + pochyl, y0 - wys)], fill=(150, 110, 60, 240), width=3)
    # Grążele na oczkach.
    for _ in range(W * H // 1600):
        x, y = int(rng.integers(4, W - 4)), int(rng.integers(4, H - 4))
        if oczka2[y, x] < 0.7:
            continue
        r = rng.uniform(kafel * 0.05, kafel * 0.09)
        d.ellipse([x - r, y - r * 0.7, x + r, y + r * 0.7], fill=(70, 125, 55, 235))
        d.pieslice([x - r, y - r * 0.7, x + r, y + r * 0.7], 300, 330, fill=(22, 38, 30, 255))
        if rng.random() < 0.25:
            d.ellipse([x - 2, y - 2, x + 2, y + 2], fill=(245, 225, 235, 255))
    return im


def trzesawisko(plansza: Image.Image, maska: Image.Image, kafel: int, ziarno: int, woda=(46, 84, 76)) -> Image.Image:
    """Bagno jako STOJĄCA WODA i błoto, a nie ciemna ziemia (Bagna, runda 3).

    Werdykt: „ciemna oliwkowa ziemia z trzciną, bez stojącej wody i błota —
    wygląda jak ciemny las". `bagno()` przyciemniało cały teren i malowało
    oczka niemal czarne, więc z daleka trzęsawisko zlewało się ze ściółką lasu.
    Tu jest odwrotnie: grunt zostaje jasny (błotnista oliwka), a oczka są
    WODĄ — w barwie jezior tej planszy (`woda`), z odbiciem nieba przy dolnym
    brzegu, cieniem skarpy przy górnym, iskrami i rzęsą. Każde oczko obwodzi
    ciemne, mokre błoto. Tak bagno czyta się z drugiego końca ekranu: tafla
    błyszczy, las nie. Włącza plansza (`EFEKTY = ['trzesawisko']`).
    """
    W, H = plansza.size
    m = np.asarray(maska, dtype=np.float32) / 255.0
    rdzen = np.asarray(
        maska.filter(ImageFilter.MinFilter(max(3, (kafel // 4) | 1))).filter(ImageFilter.GaussianBlur(kafel * 0.1)),
        dtype=np.float32,
    ) / 255.0
    n = szum(W, H, max(2, int(kafel * 0.9)), ziarno) + szum(W, H, max(2, int(kafel * 0.32)), ziarno + 5) * 0.45
    oczka = np.clip((n + 0.12) * 6, 0, 1) * rdzen
    oczka_im = Image.fromarray((oczka * 255).astype(np.uint8), 'L').filter(ImageFilter.GaussianBlur(1.2))
    oczka = np.asarray(oczka_im, dtype=np.float32) / 255.0
    # Głębia oczka: rozmyta maska — środek ciemniejszy niż płycizna.
    glebia = np.asarray(oczka_im.filter(ImageFilter.GaussianBlur(kafel * 0.18)), dtype=np.float32) / 255.0
    # Pas mokrego błota wokół oczka.
    brzeg_im = oczka_im.filter(ImageFilter.MaxFilter(max(3, (kafel // 7) | 1))).filter(ImageFilter.GaussianBlur(2.5))
    brzeg = np.clip(np.asarray(brzeg_im, dtype=np.float32) / 255.0 - oczka, 0, 1) * m

    tab = _tab(plansza)
    M = m[..., None]
    # Grunt: błotnista oliwka, jaśniejsza i cieplejsza niż ściółka lasu.
    jas = tab.mean(axis=2, keepdims=True)
    grunt = jas * np.array([1.02, 0.98, 0.62]) * 0.62 + np.array([52, 50, 26])
    grunt = grunt + (tab - jas) * 0.45
    tab = tab * (1 - M * 0.8) + grunt * M * 0.8
    # Kępy: na suchszych garbach między oczkami przebija zieleń turzycy.
    k = szum(W, H, max(2, int(kafel * 0.45)), ziarno + 17)
    kepy = (np.clip(k * 2.2, 0, 1) * m)[..., None] * 0.55
    tab = tab * (1 - kepy) + (tab.mean(axis=2, keepdims=True) * np.array([0.78, 1.0, 0.42]) + np.array([12, 30, 4])) * kepy
    # Mokre błoto przy wodzie.
    B = brzeg[..., None]
    tab = tab * (1 - B * 0.75) + np.array([58, 44, 26]) * B * 0.75
    # Woda: płycizna jaśniejsza, głębia ciemniejsza — ale wciąż WODA, nie dziura.
    w = np.array(woda, dtype=np.float32)
    plytka = w * 1.18 + np.array([12, 12, 0])
    gleboka = w * 0.8
    G = np.clip(glebia * 1.3 - 0.15, 0, 1)[..., None]
    barwa = plytka * (1 - G) + gleboka * G
    # Odbicie nieba: miękkie poziome smugi, jak na stojącej tafli.
    smugi = szum(max(2, W // 4), H, max(2, int(kafel * 0.35)), ziarno + 13)
    smugi = np.asarray(
        Image.fromarray(((smugi * 0.5 + 0.5) * 255).astype(np.uint8), 'L').resize((W, H), Image.BICUBIC),
        dtype=np.float32,
    ) / 255.0
    niebo = np.clip((smugi - 0.55) * 3, 0, 1)[..., None] * 0.35
    barwa = barwa + (np.array([175, 210, 200]) - barwa) * niebo
    # Tekstura gruntu prześwituje przez wodę odrobinę — dno, nie farba.
    barwa = barwa + (tab - tab.mean(axis=2, keepdims=True)) * 0.1
    O = oczka[..., None]
    tab = tab * (1 - O) + barwa * O
    # Cień skarpy przy górnym brzegu, jasna linia wody przy dolnym.
    gy = np.gradient(oczka, axis=0)
    cien = np.clip(gy * 4, 0, 1)[..., None]
    blask = np.clip(-gy * 4, 0, 1)[..., None]
    tab = tab * (1 - cien * 0.35)
    tab = tab + (np.array([150, 195, 175]) - tab) * blask * 0.3
    # Rzęsa: drobne jasnozielone plamki na płyciźnie.
    r = szum(W, H, max(2, int(kafel * 0.08)), ziarno + 11)
    rzesa = (np.clip((r - 0.55) * 4, 0, 1) * oczka * np.clip(1 - glebia * 1.8, 0, 1))[..., None]
    tab = tab * (1 - rzesa * 0.8) + np.array([120, 160, 60]) * rzesa * 0.8
    im = _obraz(tab)

    d = ImageDraw.Draw(im, 'RGBA')
    rng = np.random.default_rng(ziarno + 9)
    # Iskry na wodzie: krótkie poziome refleksy.
    for _ in range(W * H // 700):
        x, y = int(rng.integers(4, W - 8)), int(rng.integers(4, H - 4))
        if oczka[y, x] < 0.9 or glebia[y, x] < 0.3:
            continue
        dl = rng.uniform(3, 8)
        d.line([(x, y), (x + dl, y)], fill=(225, 240, 230, 170), width=1)
        if rng.random() < 0.5:
            d.line([(x + 2, y + 2), (x + 2 + dl * 0.6, y + 2)], fill=(200, 225, 215, 110), width=1)
    # Grążele na wodzie, część z kwiatem.
    for _ in range(W * H // 1300):
        x, y = int(rng.integers(4, W - 4)), int(rng.integers(4, H - 4))
        if oczka[y, x] < 0.8:
            continue
        rr = rng.uniform(kafel * 0.06, kafel * 0.1)
        d.ellipse([x - rr + 1, y - rr * 0.7 + 1, x + rr + 1, y + rr * 0.7 + 1], fill=(15, 30, 25, 120))
        d.ellipse([x - rr, y - rr * 0.7, x + rr, y + rr * 0.7], fill=(88, 150, 62, 245))
        d.pieslice([x - rr, y - rr * 0.7, x + rr, y + rr * 0.7], 300, 335, fill=tuple(int(c) for c in w) + (255,))
        if rng.random() < 0.3:
            d.ellipse([x - 2, y - 3, x + 3, y + 1], fill=(250, 215, 230, 255))
            d.point((x, y - 1), fill=(250, 220, 90, 255))
    # Trzcina na błotnym brzegu oczek — tam rośnie, a nie na środku kępy.
    for _ in range(W * H // 500):
        x, y = int(rng.integers(3, W - 3)), int(rng.integers(14, H - 3))
        if brzeg[y, x] < 0.35 or m[y, x] < 0.9:
            continue
        for _ in range(int(rng.integers(3, 7))):
            dx = rng.uniform(-5, 5)
            wys = rng.uniform(kafel * 0.18, kafel * 0.36)
            pochyl = rng.uniform(-3, 3)
            x0, y0 = x + dx, y + rng.uniform(-1.5, 1.5)
            d.line([(x0 + 1, y0 + 1), (x0 + pochyl + 1, y0 - wys + 1)], fill=(20, 25, 10, 110), width=2)
            d.line([(x0, y0), (x0 + pochyl, y0 - wys)], fill=(96, 128, 52, 245), width=2)
            if rng.random() < 0.4:
                d.line([(x0 + pochyl * 0.8, y0 - wys * 0.8), (x0 + pochyl, y0 - wys)], fill=(120, 78, 40, 255), width=4)
    return im


#: Katalog naklejek terenu — ozdób malowanych w TLE planszy (nie blokują
#: ruchu, nie są obiektami gry). Pliki kładzie tam `wsad_wczytaj.py`
#: (`NAKLEJKI`), prompty są w `tools/PROMPTY-PLANSZE.md`.
KATALOG_NAKLEJEK = __import__('pathlib').Path(__file__).resolve().parent.parent / 'public' / 'mapa' / 'tlo'


def naklejki(plansza: Image.Image, rysunek: list, kafel: int, zasady: list, ziarno: int) -> Image.Image:
    """Rozsiewa naklejki z `public/mapa/tlo/` po polach danego terenu.

    `zasady` to lista `(pliki, znaki_terenu, gęstość)` z konfiguracji planszy
    (`NAKLEJKI`), np. `(['trzcina-1', 'trzcina-2'], 'b', 0.25)` — na co czwartym
    polu bagna kępa trzciny. Brakujący plik jest pomijany bez błędu: to jest
    ścieżka na grafiki, których jeszcze nie ma, i plansza ma się renderować
    tak samo dobrze przed ich dostawą, jak po niej. Losowanie jest
    deterministyczne (ziarno planszy), więc odcisk tła się nie zmienia, dopóki
    nie zmieni się rysunek albo zestaw plików.
    """
    rng = np.random.default_rng(ziarno)
    im = plansza.convert('RGBA')
    wys, szer = len(rysunek), len(rysunek[0])
    for pliki, znaki, gestosc in zasady:
        obrazy = [
            Image.open(KATALOG_NAKLEJEK / f'{p}.png').convert('RGBA')
            for p in pliki
            if (KATALOG_NAKLEJEK / f'{p}.png').exists()
        ]
        for y in range(wys):
            for x in range(szer):
                los = rng.random()
                wybor = int(rng.integers(0, max(1, len(obrazy))))
                dx, dy = rng.uniform(-0.3, 0.3, 2)
                if not obrazy or rysunek[y][x] not in znaki or los > gestosc:
                    continue
                n = obrazy[wybor]
                if rng.random() < 0.5:
                    n = n.transpose(Image.FLIP_LEFT_RIGHT)
                px = int((x + 0.5 + dx) * kafel - n.width / 2)
                py = int((y + 0.8 + dy) * kafel - n.height)
                im.alpha_composite(n, (max(0, px), max(0, py)))
    return im


def obwodka_drogi(plansza: Image.Image, maska_drogi: Image.Image, kafel: int) -> Image.Image:
    """Brzeg drogi: ciemny, wydeptany pas po obu stronach i jaśniejsza jezdnia.

    Bez tego droga na bagnie ginęła — oliwkowobrązowe trzęsawisko ma prawie
    ten sam kolor co ubita ziemia. W Heroes 2 droga ma krawędź i widać ją
    z daleka niezależnie od tego, przez co biegnie.
    """
    m = np.asarray(maska_drogi, dtype=np.float32) / 255.0
    szer = np.asarray(
        maska_drogi.filter(ImageFilter.MaxFilter(max(3, (kafel // 6) | 1))).filter(ImageFilter.GaussianBlur(kafel * 0.05)),
        dtype=np.float32,
    ) / 255.0
    brzeg = np.clip(szer - m, 0, 1)[..., None]
    tab = _tab(plansza)
    tab = tab * (1 - brzeg * 0.5) + np.array([45, 32, 20]) * brzeg * 0.25
    tab = tab + (255 - tab) * m[..., None] * 0.12
    return _obraz(tab)


def mosty(plansza: Image.Image, maska_wody: Image.Image, kafel: int, mosty_planszy: list):
    """Kładzie rysunek mostu na namalowanej wodzie (`MOSTY` w konfiguracji).

    Pola pod mostem są w grze drogą, ale render maluje pod nimi wodę (patrz
    `render_mapa.ustaw`), więc rzeka płynie pod mostem nieprzerwanie. Z maski
    wody zdejmujemy sylwetkę mostu: shader falowałby inaczej także deskami,
    a brzeg maski wokół przęseł daje pianę przy filarach.

    Wpis: `{'plik': 'polana/most.png', 'srodek': (x, y), 'szer': w}` — środek
    rysunku i jego szerokość w polach. Rysunek skalujemy z alfą wmnożoną
    w barwę (bez tego przezroczyste piksele przyciemniają brzeg sylwetki).
    """
    im = plansza.convert('RGBA')
    woda = np.asarray(maska_wody.convert('L'), dtype=np.float32)
    for most in mosty_planszy:
        sciezka = KATALOG_NAKLEJEK.parent / most['plik']
        if not sciezka.exists():
            continue
        n = Image.open(sciezka).convert('RGBA')
        w = max(1, round(most['szer'] * kafel))
        h = max(1, round(n.height * w / n.width))
        tab = np.asarray(n, dtype=np.float32)
        tab[..., :3] *= tab[..., 3:4] / 255.0
        male = np.asarray(Image.fromarray(tab.astype(np.uint8), 'RGBA').resize((w, h), Image.LANCZOS), dtype=np.float32)
        a = np.clip(male[..., 3:4] / 255.0, 1e-3, 1)
        male[..., :3] = np.clip(male[..., :3] / a, 0, 255)
        n = Image.fromarray(male.astype(np.uint8), 'RGBA')
        px = round(most['srodek'][0] * kafel - w / 2)
        py = round(most['srodek'][1] * kafel - h / 2)
        # Miękki cień pod mostem na wodzie: bez niego deski leżą na tafli
        # jak naklejka, a nie wiszą nad nią.
        cien = Image.new('RGBA', n.size, (10, 30, 40, 0))
        cien.putalpha(n.getchannel('A').point(lambda v: int(v * 0.45)).filter(ImageFilter.GaussianBlur(kafel * 0.12)))
        im.alpha_composite(cien, (px - round(kafel * 0.12), py + round(kafel * 0.18)))
        im.alpha_composite(n, (px, py))
        alfa = np.zeros_like(woda)
        x0, y0 = max(0, px), max(0, py)
        x1, y1 = min(woda.shape[1], px + w), min(woda.shape[0], py + h)
        alfa[y0:y1, x0:x1] = np.asarray(n.getchannel('A'), dtype=np.float32)[y0 - py:y1 - py, x0 - px:x1 - px] / 255.0
        woda = woda * (1 - alfa)
    return im, Image.fromarray(woda.clip(0, 255).astype(np.uint8), 'L')


def _szum1d(n: int, okres: float, ziarno: int) -> np.ndarray:
    """Gładki szum wzdłuż krzywej (−1…1): suma trzech sinusów o losowych fazach."""
    rng = np.random.default_rng(ziarno)
    s = np.arange(n, dtype=np.float32)
    w = np.zeros(n, dtype=np.float32)
    for mnoz, waga in ((1.0, 0.6), (2.3, 0.3), (5.1, 0.1)):
        w += waga * np.sin(s * 2 * np.pi / (okres / mnoz) + rng.uniform(0, 6.28))
    return w


def droga_kreta(rysunek: list, kafel: int, ziarno: int, szerokosc: float = 0.36, zmiennosc: float = 0.4,
                meander: float = 0.2, nad: int = 3):
    """Droga, która MEANDRUJE i zmienia szerokość (Bagna, runda 5).

    Werdykt: „ścieżki to sztywne beżowe pasy o stałej szerokości, zgięte pod
    kątami jak na siatce". `render_mapa.maska_drogi` łączy środki pól odcinkami
    tej samej grubości, więc każdy krok po skosie jest widoczny jako kolano.
    Tutaj: pola drogi składamy w łańcuchy między rozwidleniami, łańcuch
    wygładzamy (Chaikin), odsuwamy w bok łagodną falą (zerową przy
    rozwidleniach, żeby odnogi się spotykały) i rysujemy kółkami o promieniu
    zmiennym wzdłuż drogi. Brzeg dostaje szum — ubita ziemia nie ma krawędzi
    od linijki. Fala jest mniejsza niż pół pola, więc droga na ekranie wciąż
    leży na polach, po których idzie się taniej.

    Zwraca `(maska, koleiny)`: koleiny to dwie ciemniejsze smugi po wozach,
    przerywane — ślad, że tędy się jeździ.
    """
    wys, szer = len(rysunek), len(rysunek[0])
    W, H = szer * kafel, wys * kafel
    jest = lambda x, y: 0 <= x < szer and 0 <= y < wys and rysunek[y][x] == '='
    pola_drogi = [(x, y) for y in range(wys) for x in range(szer) if jest(x, y)]

    def sasiedzi(x, y):
        wynik = []
        for dx, dy in ((1, 0), (-1, 0), (0, 1), (0, -1)):
            if jest(x + dx, y + dy):
                wynik.append((x + dx, y + dy))
        # Skos tylko wtedy, gdy nie da się dojść dwoma prostymi krokami —
        # inaczej każde kolano robi trójkąt i łańcuch się rozpada.
        for dx, dy in ((1, 1), (1, -1), (-1, 1), (-1, -1)):
            if jest(x + dx, y + dy) and not jest(x + dx, y) and not jest(x, y + dy):
                wynik.append((x + dx, y + dy))
        return wynik

    sas = {p: sasiedzi(*p) for p in pola_drogi}
    wezly = {p for p in pola_drogi if len(sas[p]) != 2}
    uzyte = set()
    lancuchy = []
    for w in list(wezly) + pola_drogi:
        for n in sas[w]:
            if frozenset((w, n)) in uzyte:
                continue
            lan = [w, n]
            uzyte.add(frozenset((w, n)))
            while lan[-1] not in wezly and lan[-1] != w:
                nast = [q for q in sas[lan[-1]] if frozenset((lan[-1], q)) not in uzyte]
                if not nast:
                    break
                uzyte.add(frozenset((lan[-1], nast[0])))
                lan.append(nast[0])
            lancuchy.append(lan)

    im = Image.new('L', (W * nad, H * nad), 0)
    kol = Image.new('L', (W * nad, H * nad), 0)
    d = ImageDraw.Draw(im)
    dk = ImageDraw.Draw(kol)
    k = kafel * nad
    for i, lan in enumerate(lancuchy):
        pkt = np.array([((x + 0.5) * k, (y + 0.5) * k) for x, y in lan], dtype=np.float32)
        # Wylot za krawędź planszy: droga ma wychodzić z kadru, a nie kończyć się
        # zaokrąglonym kikutem na ramie.
        for koniec in (0, -1):
            x, y = lan[koniec]
            if len(sas[lan[koniec]]) == 1 and (x in (0, szer - 1) or y in (0, wys - 1)):
                sasiad = pkt[1] if koniec == 0 else pkt[-2]
                wyd = pkt[koniec] + (pkt[koniec] - sasiad)
                pkt = np.vstack([wyd[None], pkt]) if koniec == 0 else np.vstack([pkt, wyd[None]])
        for _ in range(4):
            if len(pkt) < 3:
                break
            q = pkt[:-1] * 0.75 + pkt[1:] * 0.25
            r = pkt[:-1] * 0.25 + pkt[1:] * 0.75
            srodek = np.empty((len(q) * 2, 2), dtype=np.float32)
            srodek[0::2], srodek[1::2] = q, r
            pkt = np.vstack([pkt[:1], srodek, pkt[-1:]])
        # Równe próbkowanie co ~2 piksele ekranu.
        odc = np.linalg.norm(np.diff(pkt, axis=0), axis=1)
        s = np.concatenate([[0], np.cumsum(odc)])
        dl = s[-1]
        if dl <= 0:
            continue
        n = max(2, int(dl / (2 * nad)))
        ss = np.linspace(0, dl, n)
        px = np.interp(ss, s, pkt[:, 0])
        py = np.interp(ss, s, pkt[:, 1])
        tx, ty = np.gradient(px), np.gradient(py)
        dlt = np.hypot(tx, ty) + 1e-6
        nx, ny = -ty / dlt, tx / dlt
        # Fala w bok — zero na rozwidleniach (odnogi mają się spotkać), pełna
        # w środku odcinka.
        do_konca = np.minimum(ss, dl - ss) / (k * 1.1)
        zwez = np.clip(do_konca, 0, 1)
        zwez = zwez * zwez * (3 - 2 * zwez)
        fala = _szum1d(n, 5.5 * k / (2 * nad), ziarno + i * 31) * meander * k * zwez
        px, py = px + nx * fala, py + ny * fala
        pr = szerokosc * k / 2 * (1 + zmiennosc * _szum1d(n, 3.2 * k / (2 * nad), ziarno + i * 31 + 7))
        for x, y, r in zip(px, py, pr):
            d.ellipse([x - r, y - r, x + r, y + r], fill=255)
        # Koleiny: dwie smugi po bokach osi, przerywane szumem.
        przerwa = _szum1d(n, 2.1 * k / (2 * nad), ziarno + i * 31 + 13)
        for strona in (-0.34, 0.34):
            for x, y, r, p, nnx, nny in zip(px, py, pr, przerwa, nx, ny):
                if p < -0.15:
                    continue
                cx, cy = x + nnx * r * strona * 2 * 0.62, y + nny * r * strona * 2 * 0.62
                rr = max(1.0, nad * 1.3)
                dk.ellipse([cx - rr, cy - rr, cx + rr, cy + rr], fill=255)
    # Rozwidlenia: mały plac, żeby odnogi zlewały się w jedno.
    for (x, y) in wezly:
        if len(sas[(x, y)]) >= 3:
            cx, cy, r = (x + 0.5) * k, (y + 0.5) * k, szerokosc * k * 0.62
            d.ellipse([cx - r, cy - r, cx + r, cy + r], fill=255)
    maska = np.asarray(im.resize((W, H), Image.LANCZOS).filter(ImageFilter.GaussianBlur(kafel * 0.07)),
                       dtype=np.float32) / 255.0
    # Postrzępiony brzeg: trawa wchodzi w drogę, droga wyjada trawę.
    maska = maska + szum(W, H, max(2, int(kafel * 0.35)), ziarno + 3) * 0.16 + szum(W, H, max(2, int(kafel * 0.12)), ziarno + 4) * 0.1
    maska = np.clip((maska - 0.5) * 3.2 + 0.5, 0, 1)
    koleiny = np.asarray(kol.resize((W, H), Image.LANCZOS).filter(ImageFilter.GaussianBlur(1.2)), dtype=np.float32) / 255.0
    koleiny = koleiny * np.clip(maska * 1.5 - 0.5, 0, 1)
    return (Image.fromarray((maska * 255).astype(np.uint8), 'L'),
            Image.fromarray((koleiny * 255).astype(np.uint8), 'L'))


def rzezba(plansza: Image.Image, maski: dict, droga: Image.Image, kafel: int, ziarno: int,
           wysokosci: dict | None = None, pagorki: float = 0.55, sila: float = 1.0) -> Image.Image:
    """Rzeźba terenu: pagórki, skarpy i grobla nad bagnem (Bagna, runda 5).

    Werdykt: „zupełnie płaski teren bez wzniesień, skarp i cieni". Budujemy
    mapę wysokości z masek warstw: woda najniżej, bagno trochę wyżej, sucha
    łąka i las wyżej, skały najwyżej, a droga przez bagno to GROBLA — wał nad
    trzęsawiskiem. Na suchym lądzie dochodzą łagodne pagórki (szum w skali
    kilku pól). Światło z lewej góry, jak w całej grze: stok ku światłu
    jaśnieje, odwrotny ciemnieje, a za każdą skarpą (brzeg suchej wysepki,
    wał grobli) pada krótki cień na niższy teren.
    """
    W, H = plansza.size
    wys = {'woda': -1.0, 'bagno': -0.45, 'las': 0.25, 'skaly': 0.9, 'piasek': 0.0}
    wys.update(wysokosci or {})
    h = np.zeros((H, W), dtype=np.float32)
    # Trawa jest podkładem (wysokość 0); każda warstwa przesuwa grunt ku swojej.
    for nazwa in ('bagno', 'las', 'skaly', 'piasek', 'woda'):
        if nazwa in maski:
            m = np.asarray(maski[nazwa], dtype=np.float32) / 255.0
            h = h * (1 - m) + wys[nazwa] * m
    d = np.asarray(droga, dtype=np.float32) / 255.0
    # Grobla: droga nigdy nie leży niżej niż wał nad bagnem.
    walek = np.asarray(droga.filter(ImageFilter.MaxFilter(max(3, (kafel // 5) | 1))).filter(
        ImageFilter.GaussianBlur(kafel * 0.08)), dtype=np.float32) / 255.0
    h = np.maximum(h, walek * 0.05 + (h - 0.0) * (1 - walek))
    # Pagórki tylko na suchym: im wyżej grunt, tym pełniejszy pagórek.
    sucho = np.clip(h + 0.3, 0, 1)
    wzg = szum(W, H, max(2, int(kafel * 3.2)), ziarno) * 0.7 + szum(W, H, max(2, int(kafel * 1.3)), ziarno + 1) * 0.3
    h = h + np.clip(wzg, -0.2, 1) * pagorki * sucho * (1 - d * 0.6)
    # Skarpy: lekko wygładzona wysokość — brzeg ostry, ale nie schodkowy.
    # Rozmycie na liczbach zmiennoprzecinkowych: przez 8-bitowy obrazek
    # wysokość robiła się schodkami i wychodziły z tego poziomice.
    from scipy.ndimage import gaussian_filter
    hs = gaussian_filter(h, kafel * 0.1)
    gy, gx = np.gradient(hs)
    swiatlo = np.clip(-(gx + gy * 1.2) * kafel * 1.5 * sila, -1, 1)
    stromo = np.clip(np.hypot(gx, gy) * kafel * 0.9 - 0.35, 0, 1)
    woda_m = np.asarray(maski['woda'], dtype=np.float32) / 255.0 if 'woda' in maski else np.zeros_like(h)
    # Na wodzie cieniowanie słabsze (tafla jest płaska), a skarpa to odsłonięta
    # ziemia tylko po stronie lądu.
    lad = 1 - woda_m * 0.7
    swiatlo = swiatlo * lad
    # Cień rzucany: wyższy grunt na lewo-górę zasłania niższy.
    przes = max(1, int(kafel * 0.18))
    wyzej = np.zeros_like(hs)
    wyzej[przes:, przes:] = hs[:-przes, :-przes]
    cien = gaussian_filter(np.clip((wyzej - hs - 0.1) * 2.0, 0, 1), kafel * 0.07)
    tab = _tab(plansza)
    ziemia = (stromo * (1 - woda_m) * np.clip(hs + 0.6, 0, 1))[..., None] * 0.35
    tab = tab * (1 - ziemia) + np.array([112, 86, 52]) * ziemia
    S = swiatlo[..., None]
    jasne = tab + (np.array([255, 240, 190]) - tab) * np.clip(S, 0, 1) * 0.22
    ciemne = tab * (1 + np.clip(S, -1, 0) * 0.45) + np.array([10, 20, 40]) * (-np.clip(S, -1, 0)) * 0.12
    tab = np.where(S > 0, jasne, ciemne)
    tab = tab * (1 - cien[..., None] * 0.4 * sila)
    return _obraz(tab)
