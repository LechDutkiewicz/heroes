#!/usr/bin/env python3
"""Składa gotowe tło planszy przygody: teren, brzegi, drogi.

Dlaczego to idzie do pliku, a nie do sceny
------------------------------------------
Wcześniej scena składała mapę z kafelków w czasie gry. Miało to dwie wady,
których nie dało się obejść w przeglądarce: teren był kanciasty obok gładkich
stworków, a droga rysowana osobną warstwą wektorową była gładka tuż obok
kanciastego terenu — najostrzejszy kontrast na całym ekranie. Teraz mapa
powstaje tutaj, w jednym obrazku, a scena tylko go pokazuje.

Skąd bierze się teren
---------------------
Z tekstur modelu graficznego (`public/mapa/teren/`), malowanych od razu
w skali ekranu i wycinanych miękkimi maskami — patrz `teren_malowanie.py`.
Poprzednia wersja składała teren z arkusza 16-pikselowego i powiększała go
trzykrotnie; przy teksturach 768 × 768 ta droga wyrzuciłaby cały detal,
po który po nie sięgnęliśmy.

Każda plansza kampanii ma własne tło: „Dwie Doliny" leżą w `public/mapa/`,
kolejne w `public/mapa/<id>/` (patrz `katalog_tla` w `generuj_mape.py`
i `MAPY` w `src/data/mapy.ts`).

Kontrola zgodności
------------------
Skrypt zapisuje obok obrazków odcisk rysunku mapy. `tools/probe-mapa.ts`
sprawdza, czy odcisk zgadza się z bieżącym terenem — inaczej łatwo
zmienić planszę w kodzie i oglądać stare tło, nie wiedząc o tym.

    python3 tools/render_mapa.py              # wszystkie plansze
    python3 tools/render_mapa.py bagna        # jedna
"""

import hashlib
import json
import re
import sys
from pathlib import Path

import numpy as np
from PIL import Image, ImageDraw, ImageFilter

sys.path.insert(0, str(Path(__file__).resolve().parent))
import woda_dane  # noqa: E402
from teren_malowanie import (  # noqa: E402
    ZIARNO,
    kafelkuj,
    maska,
    szum,
    tekstura,
    warianty,
    zmieszaj,
)

from generuj_mape import MAPY, katalog_tla, konfiguracja, plik_ts  # noqa: E402
import teren_efekty  # noqa: E402

KORZEN = Path(__file__).resolve().parent.parent
#: Ustawiane przez `ustaw(mapa_id)` — plik planszy i katalog tła.
KATALOG = KORZEN / 'public' / 'mapa'
ZRODLO = KORZEN / 'src' / 'data' / 'plansza-teren.ts'
#: Zabarwienie tekstur tej planszy — `BARWY_TERENU` z `tools/mapy/<id>.py`.
BARWY: dict = {}
#: Efekty terenu tej planszy — `EFEKTY` z konfiguracji (patrz `teren_efekty.py`),
#: podmiany tekstur (`TEKSTURY`, np. lód zamiast wody) i wtapiania warstw.
EFEKTY: set = set()
TEKSTURY: dict = {}
WTAPIANIE: dict = {}
NAKLEJKI: list = []
#: Mosty malowane na wodzie — `MOSTY` z konfiguracji (patrz `teren_efekty.mosty`).
MOSTY: list = []
#: Parametry efektu `trzesawisko` (barwa oczek) — `TRZESAWISKO` z konfiguracji.
TRZESAWISKO: dict = {}
#: Kręta droga (`DROGA_KRETA` z konfiguracji, patrz `teren_efekty.droga_kreta`)
#: i rzeźba terenu (`RZEZBA`, `teren_efekty.rzezba`). Brak wpisu — jak dotąd.
DROGA_KRETA = None
RZEZBA = None
#: Parametry `teren_efekty.brzeg_wody` planszy (`BRZEG_WODY`). Brak — domyślne.
BRZEG_WODY: dict = {}

KAFEL = 48                  # bok pola na ekranie
#: Ile razy nadpróbkowujemy maskę drogi, zanim ją zmniejszymy. Rysowanie
#: wprost w docelowej skali dawało schodkowe brzegi.
NAD = 4

# Warstwy terenu od spodu do wierzchu: (tekstura, znaki rysunku, wtapianie,
# poszarpanie). Trawa jest podkładem pod wszystkim, więc nie ma tu maski.
#
# Las i skały ZOSTAJĄ w podkładzie, choć w scenie stoją na nich sprite'y drzew
# i głazów: ściółka pod drzewem ma inny kolor niż łąka i bez tego kępa lasu
# wygląda jak drzewa postawione na trawniku.
WARSTWY = [
    # Kolejność jest kolejnością MALOWANIA: to, co niżej, przykrywa to, co
    # wyżej. Nowe tereny idą przed lasem i skałami, bo drzewo rośnie NA bagnie
    # i na śniegu, a nie odwrotnie.
    ('bagno', 'b', 0.50, 0.30),
    ('snieg', 's', 0.60, 0.26),
    ('jalowa', 'j', 0.55, 0.32),
    ('las', 'T', 0.55, 0.30),
    ('skaly', '#', 0.45, 0.34),
    ('piasek', ',', 0.55, 0.34),
    ('woda', '~', 0.35, 0.22),
]

def wczytaj_rysunek():
    src = ZRODLO.read_text(encoding='utf-8')
    blok = re.search(r'export const TEREN = \[(.*?)\];', src, re.S).group(1)
    return re.findall(r"'([^']+)'", blok)


def wczytaj_budowle():
    """Gdzie stoją zamki i kopalnie — i jak szeroki grunt im się należy.

    Zwraca `(x, y, szerokość, wysokość)` w polach, licząc od WEJŚCIA. Musi
    zgadzać się z `BRYLA` w `src/data/mapa.ts`; tam decyduje o przejezdności,
    tu o tym, ile ziemi jest wydeptane.
    """
    src = ZRODLO.read_text(encoding='utf-8')
    lista = []
    # Każdy punkt „zamek …" — plansze kampanii mają po dwa zamki wroga.
    for m in re.finditer(r"'zamek [^']*': \{ x: (\d+), y: (\d+) \}", src):
        lista.append((int(m.group(1)), int(m.group(2)), 3, 2))
    blok = re.search(r'export const ROZSTAWIENIE.*?\n\];', src, re.S).group(0)
    for m in re.finditer(r"\{ x: (\d+), y: (\d+), rodzaj: 'kopalnia'", blok):
        lista.append((int(m.group(1)), int(m.group(2)), 3, 1))
    return lista


def ustaw(mapa_id: str):
    """Przełącza moduł na planszę `mapa_id`. Funkcje niżej czytają rysunek
    i wymiary z globali — tak było, gdy plansza była jedna, i tak zostaje,
    bo każda z nich jest wołana raz na planszę."""
    global KATALOG, ZRODLO, RYSUNEK, WYS, SZER, W, H, BARWY, EFEKTY, TEKSTURY, WTAPIANIE, NAKLEJKI, TRZESAWISKO, MOSTY
    global DROGA_KRETA, RZEZBA, BRZEG_WODY
    KATALOG = katalog_tla(mapa_id)
    k = konfiguracja(mapa_id)
    BARWY = getattr(k, 'BARWY_TERENU', {})
    EFEKTY = set(getattr(k, 'EFEKTY', ()))
    TEKSTURY = getattr(k, 'TEKSTURY', {})
    WTAPIANIE = getattr(k, 'WTAPIANIE', {})
    NAKLEJKI = getattr(k, 'NAKLEJKI', [])
    TRZESAWISKO = getattr(k, 'TRZESAWISKO', {})
    DROGA_KRETA = getattr(k, 'DROGA_KRETA', None)
    RZEZBA = getattr(k, 'RZEZBA', None)
    BRZEG_WODY = getattr(k, 'BRZEG_WODY', {})
    ZRODLO = plik_ts(mapa_id)
    RYSUNEK = wczytaj_rysunek()
    # Mosty (`MOSTY` planszy): pola pod mostem są w grze drogą, ale w tle
    # maluje się pod nimi woda — rzeka płynie pod mostem, a nie urywa się
    # na nim. Odcisk liczy się z rysunku PLANSZY (`renderuj`), nie z tego.
    MOSTY = getattr(k, 'MOSTY', [])
    for most in MOSTY:
        for x, y in most['pola']:
            RYSUNEK[y] = RYSUNEK[y][:x] + '~' + RYSUNEK[y][x + 1:]
    WYS, SZER = len(RYSUNEK), len(RYSUNEK[0])
    W, H = SZER * KAFEL, WYS * KAFEL


def pola(znaki: str) -> np.ndarray:
    return np.array(
        [[1.0 if c in znaki else 0.0 for c in wiersz] for wiersz in RYSUNEK], dtype=np.float32
    )


def maska_drogi() -> Image.Image:
    """Droga jako gładka wstęga łącząca środki sąsiadujących pól ścieżki.

    W Heroes 3 drogi są ciągłą wstęgą z rozwidleniami, a nie kwadratami pole
    po polu — i tylko dlatego widać na pierwszy rzut oka, że tędy idzie się
    taniej. Zwracamy samą maskę; teksturę ścieżki nakłada przez nią wywołujący.
    """
    im = Image.new('L', (W * NAD, H * NAD), 0)
    d = ImageDraw.Draw(im)
    jest = lambda x, y: 0 <= x < SZER and 0 <= y < WYS and RYSUNEK[y][x] == '='
    srodek = lambda x, y: ((x * KAFEL + KAFEL / 2) * NAD, (y * KAFEL + KAFEL / 2) * NAD)

    g = 0.46 * KAFEL * NAD
    for y in range(WYS):
        for x in range(SZER):
            if not jest(x, y):
                continue
            a = srodek(x, y)
            # Tylko połowa kierunków — odcinek rysowany z obu końców byłby
            # rysowany dwa razy.
            for dx, dy in ((1, 0), (0, 1), (1, 1), (1, -1)):
                if jest(x + dx, y + dy):
                    d.line([a, srodek(x + dx, y + dy)], fill=255, width=int(g))
    # Kółka po odcinkach, nie przed: przy odwrotnej kolejności na zakrętach
    # zostawały jasne trójkąty.
    for y in range(WYS):
        for x in range(SZER):
            if jest(x, y):
                cx, cy = srodek(x, y)
                d.ellipse([cx - g / 2, cy - g / 2, cx + g / 2, cy + g / 2], fill=255)
    return im.resize((W, H), Image.LANCZOS).filter(ImageFilter.GaussianBlur(KAFEL * 0.06))


def maska_gruntu() -> Image.Image:
    """Wydeptana ziemia pod zamkami i kopalniami.

    Po co
    -----
    Sprite'y z modelu są wycięte do samej sylwetki, więc budynek stał na trawie
    jak naklejka: nic go z tą trawą nie łączyło. W Heroes 3 grafiki miast mają
    pod sobą kawałek gruntu i dopiero to je OSADZA — budynek nie unosi się nad
    łąką, tylko stoi na wydeptanym placu, który sam się w nią wtapia.

    Malujemy ten plac w TLE planszy, a nie w pliku sprite'a. Dzięki temu jest
    naprawdę częścią terenu: nie przesuwa się względem niego, nie ma własnej
    krawędzi i wychodzi tą samą teksturą co ścieżki, więc plac przy zamku
    i droga do niego to jedno i to samo.
    """
    im = Image.new('L', (W * 2, H * 2), 0)
    d = ImageDraw.Draw(im)
    for x, y, szer, wys in wczytaj_budowle():
        # Elipsa szersza niż bryła i wysunięta przed wejście: plac ma
        # WYSTAWAĆ spod budynku, inaczej znów widać jego obrys.
        # Bryła stoi w rzędach nad wejściem, więc plac ma objąć i ją, i samo
        # wejście: od `y − wys` do `y`. Środek wypada w połowie tego pasma.
        cx = (x + 0.5) * KAFEL * 2
        cy = (y + 0.5 - wys / 2) * KAFEL * 2
        rx = (szer / 2 + 0.55) * KAFEL * 2
        ry = ((wys + 1) / 2 + 0.4) * KAFEL * 2
        d.ellipse([cx - rx, cy - ry, cx + rx, cy + ry], fill=255)
    im = im.resize((W, H), Image.LANCZOS)
    tab = np.asarray(im, dtype=np.float32) / 255.0
    # Rozmycie plus szum: brzeg placu ma być nierówny i przetarty, bo idealna
    # elipsa czyta się jak druga naklejka, tylko brązowa.
    # Dwie skale: grubsza wygina cały zarys, żeby plac przestał być elipsą,
    # drobniejsza przeciera sam brzeg. Jedna skala daje albo elipsę
    # z postrzępionym konturem, albo plamę bez kształtu.
    tab += szum(W, H, max(2, int(KAFEL * 2.2)), ZIARNO + 900) * 0.58
    tab += szum(W, H, max(2, int(KAFEL * 0.45)), ZIARNO + 901) * 0.22
    tab = ((tab - 0.5) * 1.9 + 0.5).clip(0, 1)
    return Image.fromarray((tab * 255).astype(np.uint8), 'L').filter(
        ImageFilter.GaussianBlur(KAFEL * 0.09)
    )


def zabarw(im: Image.Image, nazwa: str) -> Image.Image:
    """Przesuwa barwę tekstury terenu w stronę klimatu planszy.

    Tekstury są jedne na wszystkie mapy, a plansza ma mieć własny charakter:
    woda na bagnach jest mętna i zielonkawa, a nie turkusowa jak staw na
    Polanie; trawa w Twierdzy jest wypłowiała od mrozu. Mnożymy przez barwę
    znormalizowaną do jej średniej — odcień się zmienia, jasność zostaje —
    a potem ewentualnie przyciemniamy. Rysunek tekstury (fale, źdźbła, kamienie)
    zostaje nietknięty, więc to wciąż ta sama, spójna rodzina grafik.
    """
    if nazwa not in BARWY:
        return im
    u = BARWY[nazwa]
    tab = np.asarray(im.convert('RGB'), dtype=np.float32)
    # Najpierw nasycenie (mróz i muł odbierają kolor), potem odcień i jasność.
    szary = tab.mean(axis=2, keepdims=True)
    tab = szary + (tab - szary) * u.get('nasycenie', 1.0)
    b = np.array(u.get('barwa', (128, 128, 128)), dtype=np.float32)
    mnoznik = 1 + (b / b.mean() - 1) * u.get('moc', 0.0)
    tab = (tab * mnoznik[None, None, :] * u.get('jasnosc', 1.0)).clip(0, 255)
    return Image.fromarray(tab.astype(np.uint8), 'RGB')


def tekstura_warstwy(nazwa: str) -> str:
    """Tekstura dla warstwy: pierwsza ISTNIEJĄCA z `TEKSTURY` planszy.

    `TEKSTURY = {'woda': ['lod', 'snieg']}` znaczy: lód, jeśli już jest
    `public/mapa/teren/teren-lod.png` (dostawa z `tools/PROMPTY-PLANSZE.md`),
    a do tego czasu śnieg. Dzięki temu nowa grafika wchodzi samym
    `wsad_wczytaj.py` i ponownym renderem, bez ruszania konfiguracji.
    """
    wybor = TEKSTURY.get(nazwa, nazwa)
    for t in [wybor] if isinstance(wybor, str) else wybor:
        if (KORZEN / 'public' / 'mapa' / 'teren' / f'teren-{t}.png').exists():
            return t
    return nazwa


def klatka() -> tuple[Image.Image, Image.Image]:
    """Plansza i maska wody.

    Maska wraca razem z planszą, bo shader wody musi dostać DOKŁADNIE tę,
    którą tu namalowano. Policzona drugi raz — choćby tym samym wzorem —
    rozjechałaby się przy najmniejszej zmianie parametrów i na styku wody
    z lądem zostałby rąbek nienamalowanej wody albo nieruchomej tafli.
    """
    # Podkład też słucha `TEKSTURY` planszy: w Twierdzy spod śniegu na
    # brzegach warstw prześwitywała zielona trawa (runda 2: „śnieg to białe
    # plamy na zielonej trawie"). Bez wpisu 'trawa' — jak dotąd, bajt w bajt.
    plansza = zabarw(zmieszaj(warianty(tekstura_warstwy('trawa')), W, H, (0, 0), ZIARNO), 'trawa')
    maskaWody = Image.new('L', (W, H), 0)
    maski = {}
    for n, (nazwa, znaki, wtapianie, poszarpanie) in enumerate(WARSTWY):
        if not any(c in znaki for wiersz in RYSUNEK for c in wiersz):
            continue
        wtapianie = WTAPIANIE.get(nazwa, wtapianie)
        warstwa = zabarw(zmieszaj(warianty(tekstura_warstwy(nazwa)), W, H, (0, 0), ZIARNO + 50 + n), nazwa)
        # Każda warstwa dostaje własne ziarno, inaczej wszystkie granice
        # falowałyby w tym samym rytmie i widać by było jeden wzór.
        m = maska(pola(znaki), KAFEL, wtapianie, poszarpanie, ZIARNO + n)
        if nazwa == 'snieg' and 'zaspy' in EFEKTY:
            warstwa = teren_efekty.zaspy(warstwa, KAFEL, ZIARNO + 700, zmienne='zaspy_zmienne' in EFEKTY)
        if nazwa == 'skaly' and ('relief' in EFEKTY or 'relief_sniezny' in EFEKTY):
            warstwa = teren_efekty.relief(warstwa, m, KAFEL, ZIARNO + 730, 'relief_sniezny' in EFEKTY)
        if nazwa == 'woda' and 'lod' in EFEKTY:
            warstwa = teren_efekty.lod(warstwa, m, KAFEL, ZIARNO + 710)
        # Twierdza, runda 4: tafla lodu z głębią, smugami śniegu i brzegiem.
        if nazwa == 'woda' and 'lod_tafla' in EFEKTY:
            warstwa = teren_efekty.lod_tafla(warstwa, m, KAFEL, ZIARNO + 715)
        plansza.paste(warstwa, (0, 0), m)
        maski[nazwa] = m
        if nazwa == 'woda':
            maskaWody = m
        # Bagno dostaje oczka i trzcinę ZARAZ po namalowaniu, przed lasem
        # i wodą: drzewo i staw leżą na nim, nie pod nim.
        if nazwa == 'bagno' and 'bagno' in EFEKTY:
            plansza = teren_efekty.bagno(plansza, m, KAFEL, ZIARNO + 720)
        # Bagna, runda 3: oczka stojącej wody w barwie jezior planszy
        # (`TRZESAWISKO` w konfiguracji) zamiast ciemnej ziemi.
        if nazwa == 'bagno' and 'trzesawisko' in EFEKTY:
            plansza = teren_efekty.trzesawisko(plansza, m, KAFEL, ZIARNO + 720, **TRZESAWISKO)
    # Bagna, runda 6: wyraźny pas brzegu wokół wody (`EFEKTY = ['brzeg_wody']`).
    if 'brzeg_wody' in EFEKTY and 'woda' in maski:
        plansza = teren_efekty.brzeg_wody(plansza, maski['woda'], KAFEL, ZIARNO + 790, **BRZEG_WODY)
    plansza = plansza.convert('RGBA')
    # Droga też słucha `TEKSTURY` planszy (Bagna, runda 6: bruk grobli
    # zamiast piaskowej smugi). Bez wpisu 'sciezka' — jak dotąd, bajt w bajt.
    sciezka = zabarw(kafelkuj(tekstura(tekstura_warstwy('sciezka')), W, H), 'sciezka').convert('RGBA')
    # Place pod budowlami idą PRZED drogami: droga ma dobiegać do placu
    # i się z nim zlewać, a nie kończyć na jego brzegu.
    # Plac pod budowlami: na Dwóch Dolinach zostaje; plansze kampanii go nie
    # mają (`bez_placow`) — w ślepym porównaniu „identyczne okrągłe
    # piaskowe placki pod każdym obiektem" wyglądały na naklejki i robiły z
    # bagna i śniegu tę samą łąkę w innym kolorze.
    if 'bez_placow' not in EFEKTY:
        plansza.paste(sciezka, (0, 0), maska_gruntu())
    if DROGA_KRETA is not None:
        droga, koleiny = teren_efekty.droga_kreta(RYSUNEK, KAFEL, ZIARNO + 760, **DROGA_KRETA)
        plansza.paste(sciezka, (0, 0), droga)
        # Koleiny: ta sama ziemia, tylko ciemniejsza i chłodniejsza.
        plansza.paste(Image.new('RGBA', plansza.size, (70, 52, 34, 255)), (0, 0), koleiny.point(lambda v: int(v * 0.42)))
    else:
        droga = maska_drogi()
        plansza.paste(sciezka, (0, 0), droga)
    if RZEZBA is not None:
        plansza = teren_efekty.rzezba(plansza, maski, droga, KAFEL, ZIARNO + 780, **RZEZBA).convert('RGBA')
    if 'obwodka_drogi' in EFEKTY:
        plansza = teren_efekty.obwodka_drogi(plansza, droga, KAFEL).convert('RGBA')
    # Polana, runda 8: malowane obrzeże traktu (kamyki, trawa, wydeptane
    # pobocze) — tylko plansze z `droga_obrzeze` w `EFEKTY`.
    if 'droga_obrzeze' in EFEKTY:
        plansza = teren_efekty.droga_obrzeze(plansza, droga, KAFEL, ZIARNO + 800).convert('RGBA')
    # Naklejki terenu (trzcina, grążele, zaśnieżone głazy…) z `public/mapa/tlo/`
    # — po drogach, żeby kępa trzciny nie znikała pod groblą, ale pod
    # sprite'ami sceny. Bez plików nic się nie dzieje (patrz `naklejki`).
    if NAKLEJKI:
        plansza = teren_efekty.naklejki(plansza, RYSUNEK, KAFEL, NAKLEJKI, ZIARNO + 740)
    if MOSTY:
        plansza, maskaWody = teren_efekty.mosty(plansza, maskaWody, KAFEL, MOSTY)
    return plansza, maskaWody


def renderuj(mapa_id: str):
    ustaw(mapa_id)
    print(f'=== {mapa_id} ===')
    KATALOG.mkdir(parents=True, exist_ok=True)
    baza, maskaWody = klatka()

    # Woda zostaje NAMALOWANA na planszy, choć rusza nią shader. To jest
    # zapasowa wersja obrazu: gdy karta nie da rady z shaderem, gracz zobaczy
    # nieruchomy staw zamiast dziury w mapie.
    # JPEG, nie PNG, i to jest decyzja o GRZE, a nie o formacie pliku.
    # Plansza 72 × 72 przy kafelku 48 px ma 3456 × 3456 px. Ten sam obraz jako
    # PNG waży 21 MB — cztery razy tyle, co cała poprzednia plansza, i tyle
    # musiałby ściągnąć gracz przez sieć, zanim zobaczy mapę. W JPEG przy
    # jakości 88 waży 3,4 MB, czyli MNIEJ niż poprzednia plansza 36 × 36,
    # a jest to podkład terenu: nie ma na nim ani ostrych napisów, ani
    # przezroczystości, czyli niczego, na czym widać artefakty kompresji.
    # Maska wody zostaje PNG-iem — tam kanały niosą liczby dla shadera
    # i stratna kompresja zrobiłaby z brzegu wody szum.
    (KATALOG / 'plansza-0.png').unlink(missing_ok=True)
    baza.convert('RGB').save(KATALOG / 'plansza-0.jpg', quality=88, subsampling=1, optimize=True)
    rozmiar = (KATALOG / 'plansza-0.jpg').stat().st_size / 1048576
    print(f'  plansza-0.jpg  {baza.width} × {baza.height}  ({rozmiar:.1f} MB)')

    # Klatki 1–3 były poprzednią animacją: cztery gotowe obrazy przełączane
    # co pół sekundy. Zostają usunięte, żeby nie leżały w `public` jako
    # kilkaset kilobajtów, których nikt już nie wczytuje.
    for k in range(1, 4):
        (KATALOG / f'plansza-{k}.png').unlink(missing_ok=True)

    # Plansza z jeziorami skutymi lodem (`WODA_ANIMOWANA = False` w jej
    # konfiguracji) dostaje pustą maskę: shader przepisuje wtedy planszę bez
    # zmian i lód stoi nieruchomo. Falujący lód wyglądałby jak usterka.
    if not getattr(konfiguracja(mapa_id), 'WODA_ANIMOWANA', True):
        maskaWody = Image.new('L', maskaWody.size, 0)
    woda_dane.maska(RYSUNEK, KAFEL, maskaWody, KATALOG)

    odcisk = hashlib.sha256('\n'.join(wczytaj_rysunek()).encode('utf-8')).hexdigest()[:16]
    (KATALOG / 'plansza.json').write_text(
        json.dumps({'odcisk': odcisk, 'szer': SZER, 'wys': WYS, 'kafel': KAFEL}, indent=2) + '\n',
        encoding='utf-8',
    )
    print(f'  odcisk terenu: {odcisk}')


if __name__ == '__main__':
    # Zmarszczki są wspólne dla wszystkich plansz (`public/mapa/`) — to szum,
    # nie rysunek, więc jedna tekstura starcza każdej wodzie.
    woda_dane.zmarszczki()
    for mapa_id in sys.argv[1:] or MAPY:
        renderuj(mapa_id)
