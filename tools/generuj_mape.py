#!/usr/bin/env python3
"""Generuje planszę 36 × 36 — układ wzorowany na „Key to Victory" z Heroes 3.

Skąd ten układ
--------------
„Key to Victory" (Restoration of Erathia, mała mapa 36 × 36, dwóch graczy) jest
zbudowana wokół jednego pomysłu: dwa królestwa rozdziela pasmo gór, przez które
prowadzi jedno pilnowane przejście. Gracz startuje na południowym wschodzie,
przeciwnik siedzi na północy, a cała pierwsza połowa gry to rozbudowa w bezpiecznej
połowie mapy — bo na północ i tak nie da się wejść, dopóki nie pokona się straży.

Przeniesione zostały te rzeczy, które da się oddać tym, co mamy:

* **rozmiar i strony.** 36 × 36, gracz na południowym wschodzie (w oryginale pole
  32,33), przeciwnik na północy tuż za grzbietem (w oryginale 20,15);
* **grzbiet górski przez całą szerokość mapy** — nieprzerwany, z dwoma przejściami;
* **dwie drogi na północ zamiast jednej.** W oryginale druga trasa biegnie
  podziemiami; podziemi nie mamy, więc jej odpowiednikiem jest piaszczysta ścieżka
  przy wschodnim brzegu: dłuższa, droższa w punktach ruchu i bez drogi bitej;
* **obie zamknięte strażą.** W oryginale są to Strażnice Graniczne otwierane
  namiotem klucznika. Nie mamy ani jednego, ani drugiego, więc kluczem jest sama
  wygrana bitwa ze strażnikiem — to najbliższe, co da się zrobić bez nowego
  rodzaju obiektu (spis brakujących rzeczy jest na końcu tego pliku);
* **całe gospodarcze zaplecze po stronie gracza,** a nagrody i silne straże po
  stronie przeciwnika. W oryginale to jest powód, dla którego mapa się nie nudzi:
  południe daje się przejść bez walki, północ nie daje się przejść bez armii.

Dlaczego generator, a nie ręczny rysunek
----------------------------------------
Przy 36 × 36 to 1296 znaków w 36 wierszach równej długości — pomyłka o jeden znak
jest pewna, a objawia się jako plansza, która wygląda dobrze i nie działa.

Ale generator z samego szumu daje mapę bez zamysłu: same plamy, żadnych miejsc.
Dlatego robimy to dwuetapowo, tak jak robi się mapy w Heroes 3:

1. Wpisujemy ręcznie SZKIC 12 × 12 — duże krainy. Tyle da się wpisać bez pomyłki
   i to on decyduje, gdzie jest jezioro, gdzie góry i którędy się chodzi.
2. Skrypt powiększa szkic trzykrotnie i rozmywa granice szumem, żeby kraina nie
   kończyła się linią prostą.
3. Rdzeń grzbietu jest ZASKLEPIANY z powrotem po rozmyciu, a przejścia wycinane
   ręcznie. Bez tego szum robi w murze przypadkowe dziury i cała struktura mapy
   („jest jedno przejście, i ono jest pilnowane") cicho przestaje istnieć.
4. Drogi są wytyczane najtańszą trasą między punktami orientacyjnymi, a nie
   rysowane — dzięki temu naprawdę prowadzą tam, gdzie się chodzi.
5. Na koniec sprawdzamy: przejezdność do każdego punktu i to, że przejść przez
   grzbiet jest dokładnie tyle, ile zaplanowaliśmy.

    python3 tools/generuj_mape.py
"""

import random
from collections import deque
from pathlib import Path

KORZEN = Path(__file__).resolve().parent.parent
WYNIK = KORZEN / 'src' / 'data' / 'plansza-teren.ts'

SKALA = 3
BOK = 36
ZIARNO = 20260812

# Szkic krain, 12 × 12. Każdy znak to kwadrat 3 × 3 pola.
#   .  trawa      ,  piasek     ~  woda
#   T  las        #  góry
#
# Zamysł, wiersz po wierszu (wiersz szkicu = trzy wiersze planszy):
#
#   0–2   północne rubieże przeciwnika: lasy, góry w rogach;
#   3–5   serce krainy przeciwnika — jego zamek stoi tuż za grzbietem,
#         przy wschodniej krawędzi zaczyna się piaszczyste wybrzeże;
#   6–7   GRZBIET przez całą szerokość mapy: sześć wierszy gór z dwoma
#         przejściami — przełęczą w kolumnie 4 i piaszczystą ścieżką nadmorską
#         w kolumnie 1, w przeciwległym rogu mapy niż start gracza;
#   8–11  dolina gracza: jego zamek na południowym wschodzie, jezioro na
#         południowym zachodzie, lasy pośrodku.
#
# Grzbiet to nie ozdoba, tylko cała struktura tej mapy — dopóki gracz nie pokona
# straży, południe jest bezpieczną piaskownicą. Dlatego jego rdzeń jest po
# rozmyciu zasklepiany (patrz `zasklep`), a liczba przejść sprawdzana na końcu.
SZKIC = [
    '.T...#..###.',
    '..TT.....##.',
    '#..T....#...',
    '#...TT..#..,',
    '....T.....,~',
    ',....#....,,',
    '#,##.#######',
    '#,##.#######',
    ',........,,,',
    '..T...TT...,',
    '~~....TT....',
    '~~,.....T...',
]

#: Wiersze, w których grzbiet ma być nieprzerwany. Rozmycie działa na jego
#: brzegach (y 18 i 23), więc pasmo nadal ma poszarpany zarys, ale rdzenia nie
#: rusza: bez tego szum robi w murze przypadkowe dziury i mapa cicho przestaje
#: być mapą z jednym przejściem.
RDZEN_GRZBIETU = (19, 22)

#: Przejścia przez grzbiet, wycinane po zasklepieniu. Zakresy `(x0, y0, x1, y1)`.
#: Kolumny są proste i pełnej wysokości pasma — przejście „na skos" wygląda
#: w grze jak dwie osobne dziury, między którymi jakoś się przechodzi.
PRZEJSCIA = [
    (12, 18, 14, 23),   # Przełęcz — główna droga na północ, z drogą bitą.
    (3, 18, 5, 23),     # Nadmorska ścieżka — odpowiednik podziemi z oryginału.
]

#: Ile przejść ma być w grzbiecie. Sprawdzane na końcu; gdyby rozmycie albo
#: zmiana szkicu dorobiła trzecie, cała mapa straciłaby sens, a wyglądałaby
#: dokładnie tak samo.
PRZEJSC_W_GRZBIECIE = 2

#: Punkty orientacyjne, w polach mapy 36 × 36. Współrzędne zamków i startu są
#: przeniesione z oryginału: gracz na 32,33, przeciwnik na 20,15.
PUNKTY = {
    'start': (29, 32),
    'zamek gracza': (32, 33),
    'dolina': (20, 29),
    'jezioro': (7, 30),
    'podnoze': (14, 26),
    'przelecz': (13, 21),
    'rozstaje polnocne': (14, 16),
    'zamek wroga': (20, 15),
    'polnocna polana': (26, 8),
    'plaza poludniowa': (4, 26),
    'plaza polnocna': (4, 15),
}

#: Główny szlak — tylko trasą przez przełęcz. Nadmorska ścieżka NIE dostaje
#: drogi bitej celowo: w oryginale drugie przejście prowadzi podziemiami i jest
#: wyraźnie mniej wygodne. U nas różnicę robią dwie rzeczy: leży w przeciwległym
#: rogu mapy niż start (więc sam dojazd to kilka dni) i jest piaskiem, a piasek
#: kosztuje 125 punktów ruchu przy 70 za ścieżkę.
#:
#: Pierwsza wersja miała ją przy wschodnim brzegu, tuż nad zamkiem gracza —
#: trzynaście pól od startu. Wychodziło z tego coś odwrotnego do zamysłu: skrót
#: krótszy od głównej drogi, przy którym można było pierwszego dnia wjechać
#: w najsilniejszą straż na mapie.
SZLAK = [
    'zamek gracza',
    'start',
    'dolina',
    'jezioro',
    'dolina',
    'podnoze',
    'przelecz',
    'rozstaje polnocne',
    'zamek wroga',
    'rozstaje polnocne',
    'polnocna polana',
]

PRZEJEZDNE = set('.,=')


def szkic_na_mape(rng):
    """Powiększa szkic i rozmywa granice, żeby krainy nie były prostokątami."""
    mapa = [[SZKIC[y // SKALA][x // SKALA] for x in range(BOK)] for y in range(BOK)]

    # Rozmycie: pole z prawdopodobieństwem zależnym od tego, ilu ma sąsiadów
    # innego rodzaju, przejmuje ich rodzaj. Dwa przebiegi wystarczą, żeby
    # granice się poszarpały, a krainy zostały rozpoznawalne.
    for _ in range(2):
        nowa = [w[:] for w in mapa]
        for y in range(BOK):
            for x in range(BOK):
                sasiedzi = [
                    mapa[y + dy][x + dx]
                    for dy in (-1, 0, 1)
                    for dx in (-1, 0, 1)
                    if 0 <= y + dy < BOK and 0 <= x + dx < BOK and (dx or dy)
                ]
                obce = [s for s in sasiedzi if s != mapa[y][x]]
                if obce and rng.random() < len(obce) / 16:
                    nowa[y][x] = rng.choice(obce)
        mapa = nowa
    return mapa


def koszt(z):
    """Ile „kosztuje" poprowadzenie drogi przez ten rodzaj terenu.

    Nie jest to koszt ruchu w grze, tylko wskazówka dla trasowania: droga
    woli iść trawą, przez las przejdzie, gór i wody unika zupełnie. Dzięki
    temu drogi omijają grzbiet zamiast go przecinać — chyba że nie ma innej
    możliwości, i wtedy powstaje przełęcz, czyli miejsce warte pilnowania.
    """
    # Droga już wytyczona kosztuje najmniej: kolejne odcinki chętnie się do
    # niej dokleją zamiast biec obok, więc powstaje sieć, a nie kilka
    # równoległych ścieżek.
    return {'=': 0.5, '.': 1, ',': 3, 'T': 6, '#': None, '~': None}[z]


def trasa(mapa, skad, dokad):
    """Najtańsza trasa Dijkstrą po ośmiu kierunkach."""
    import heapq

    kolejka = [(0, skad, None)]
    skady = {}
    koszty = {skad: 0}
    while kolejka:
        k, biezacy, poprzedni = heapq.heappop(kolejka)
        if biezacy in skady:
            continue
        skady[biezacy] = poprzedni
        if biezacy == dokad:
            break
        x, y = biezacy
        for dx in (-1, 0, 1):
            for dy in (-1, 0, 1):
                if not (dx or dy):
                    continue
                nx, ny = x + dx, y + dy
                if not (0 <= nx < BOK and 0 <= ny < BOK):
                    continue
                c = koszt(mapa[ny][nx])
                if c is None:
                    continue
                nk = k + c * (1.41 if dx and dy else 1)
                if nk < koszty.get((nx, ny), 1e9):
                    koszty[(nx, ny)] = nk
                    heapq.heappush(kolejka, (nk, (nx, ny), biezacy))

    if dokad not in skady:
        return None
    droga, biezacy = [], dokad
    while biezacy is not None:
        droga.append(biezacy)
        biezacy = skady[biezacy]
    return droga


def osiagalne(mapa, skad):
    """Pola osiągalne ze startu — do sprawdzenia, czy mapa się nie rozpada."""
    widziane = {skad}
    kolejka = deque([skad])
    while kolejka:
        x, y = kolejka.popleft()
        for dx in (-1, 0, 1):
            for dy in (-1, 0, 1):
                nx, ny = x + dx, y + dy
                if (
                    0 <= nx < BOK
                    and 0 <= ny < BOK
                    and (nx, ny) not in widziane
                    and mapa[ny][nx] in PRZEJEZDNE
                ):
                    widziane.add((nx, ny))
                    kolejka.append((nx, ny))
    return widziane


def ze_szkicu(x, y):
    """Teren, który szkic przewiduje dla tego pola — przed rozmyciem."""
    return SZKIC[y // SKALA][x // SKALA]


def zasklep(mapa):
    """Przywraca rdzeń grzbietu do stanu ze szkicu.

    Rozmycie ma poszarpać brzegi pasma i to robi dobrze, ale przy okazji potrafi
    wybić w środku muru dziurę szeroką na pole. Taka dziura nie rzuca się w oczy
    ani na obrazku, ani w kodzie — po prostu pewnego dnia dziecko przechodzi na
    północ bokiem, omijając strażnika, i mapa przestaje być tą mapą.
    """
    y0, y1 = RDZEN_GRZBIETU
    for y in range(y0, y1 + 1):
        for x in range(BOK):
            if ze_szkicu(x, y) == '#':
                mapa[y][x] = '#'


def wytnij_przejscia(mapa):
    """Wycina przejścia przez grzbiet, oddając im teren ze szkicu.

    Przywracamy teren SZKICU, a nie trawę: nadmorska ścieżka jest w szkicu
    piaskiem i ma nim zostać. Gdyby wycinanie zawsze kładło trawę, drugie
    przejście przestałoby być droższe od pierwszego, a to jest jedyna rzecz,
    która je od niego odróżnia.
    """
    for x0, y0, x1, y1 in PRZEJSCIA:
        for y in range(y0, y1 + 1):
            for x in range(x0, x1 + 1):
                if mapa[y][x] in '#~':
                    szkic = ze_szkicu(x, y)
                    mapa[y][x] = szkic if szkic in PRZEJEZDNE else '.'


def przejscia_w_grzbiecie(mapa):
    """Kolumny, którymi da się przejść przez CAŁY rdzeń grzbietu."""
    y0, y1 = RDZEN_GRZBIETU
    return [x for x in range(BOK) if all(mapa[y][x] in PRZEJEZDNE for y in range(y0, y1 + 1))]


def grupy(kolumny):
    """Skleja sąsiadujące kolumny w jedno przejście."""
    wynik = []
    for x in kolumny:
        if wynik and x == wynik[-1][-1] + 1:
            wynik[-1].append(x)
        else:
            wynik.append([x])
    return wynik


def zbuduj():
    rng = random.Random(ZIARNO)
    mapa = szkic_na_mape(rng)
    zasklep(mapa)
    wytnij_przejscia(mapa)

    # Punkty orientacyjne muszą stać na przejezdnym terenie — inaczej trasa
    # do nich nie istnieje i drogi cicho się nie wytyczą.
    for x, y in PUNKTY.values():
        for dy in (-1, 0, 1):
            for dx in (-1, 0, 1):
                if 0 <= x + dx < BOK and 0 <= y + dy < BOK and mapa[y + dy][x + dx] in '#~':
                    mapa[y + dy][x + dx] = '.'

    for a, b in zip(SZLAK, SZLAK[1:]):
        droga = trasa(mapa, PUNKTY[a], PUNKTY[b])
        if droga is None:
            raise SystemExit(f'Brak trasy: {a} → {b}. Popraw SZKIC.')
        for x, y in droga:
            mapa[y][x] = '='

    return mapa


mapa = zbuduj()
dostepne = osiagalne(mapa, PUNKTY['start'])
for nazwa, (x, y) in PUNKTY.items():
    if (x, y) not in dostepne:
        raise SystemExit(f'{nazwa} jest nieosiągalny ze startu.')

przejscia = grupy(przejscia_w_grzbiecie(mapa))
if len(przejscia) != PRZEJSC_W_GRZBIECIE:
    raise SystemExit(
        f'Przejść przez grzbiet: {len(przejscia)} zamiast {PRZEJSC_W_GRZBIECIE} '
        f'(kolumny {przejscia}). Popraw SZKIC albo PRZEJSCIA.'
    )
print('przejścia przez grzbiet (kolumny):', przejscia)


# ---------------------------------------------------------------------------
# OBIEKTY
# ---------------------------------------------------------------------------
#
# Też rozstawiane skryptem, i z tego samego powodu co teren: obiekt postawiony
# ręcznie na polu, które okazało się skałą, wygląda jak usterka silnika.
# Skrypt stawia je tylko na polach przejezdnych, z zachowaniem odstępu.
#
# O tym, co gdzie stoi, decyduje STREFA, a nie odległość w linii prostej.
# Poprzednia wersja mierzyła odległość Czebyszewa od startu i przy starcie
# pośrodku mapy działało to dobrze. Tutaj gracz startuje w ROGU, więc własne
# jezioro w przeciwległym rogu doliny wychodziło „dalej" niż zamek przeciwnika
# za grzbietem — i dostawało straże przewidziane dla krainy wroga.
#
# Strefy biorą się wprost z grzbietu, bo to on dzieli tę mapę:
#
#   dom         — dolina gracza, na południe od pasma. Cała gospodarka: sady,
#                 kopalnie, słabe straże. Da się ją przejść pierwszą armią.
#   pogranicze  — wnętrze obu przejść. Stoją tu wyłącznie strażnicy.
#   wroga       — kraina przeciwnika na północ od pasma. Nagrody i silne straże.
#
# W obrębie doliny odległość dalej ma znaczenie, ale liczona W POLACH, którymi
# naprawdę się chodzi (przeszukiwanie wszerz), a nie po przekątnej przez góry.

def odleglosc(a, b):
    return max(abs(a[0] - b[0]), abs(a[1] - b[1]))


def kroki_od(mapa, skad):
    """Ile pól dzieli start od każdego pola — po terenie, nie po przekątnej."""
    odl = {skad: 0}
    kolejka = deque([skad])
    while kolejka:
        x, y = kolejka.popleft()
        for dx in (-1, 0, 1):
            for dy in (-1, 0, 1):
                nx, ny = x + dx, y + dy
                if (
                    0 <= nx < BOK
                    and 0 <= ny < BOK
                    and (nx, ny) not in odl
                    and mapa[ny][nx] in PRZEJEZDNE
                ):
                    odl[(nx, ny)] = odl[(x, y)] + 1
                    kolejka.append((nx, ny))
    return odl


def strefa(y):
    """Strefa pola — wyznaczona przez grzbiet, bo to on dzieli tę mapę."""
    y0, y1 = RDZEN_GRZBIETU
    if y < y0:
        return 'wroga'
    if y <= y1:
        return 'pogranicze'
    return 'dom'


def wolne_pola(mapa, kroki, zajete, ktora, zakres_krokow=(0, 999), min_odstep=2):
    wynik = []
    for y in range(BOK):
        for x in range(BOK):
            if mapa[y][x] not in '.,':
                continue
            if strefa(y) != ktora:
                continue
            d = kroki.get((x, y))
            if d is None or not (zakres_krokow[0] <= d <= zakres_krokow[1]):
                continue
            if any(odleglosc((x, y), z) < min_odstep for z in zajete):
                continue
            wynik.append((x, y))
    return wynik


def rozstaw(mapa, kroki, rng):
    zajete = list(PUNKTY.values())
    obiekty = []

    def dodaj(ile, ktora, zakres, buduj):
        for _ in range(ile):
            wolne = wolne_pola(mapa, kroki, zajete, ktora, zakres)
            if not wolne:
                raise SystemExit(f'Brak miejsca na obiekt: {ktora} {zakres}. Popraw SZKIC.')
            pole = rng.choice(wolne)
            zajete.append(pole)
            obiekty.append((pole, buduj(pole)))

    # --- dolina gracza, blisko zamku: pierwsza tura ma mieć oczywisty cel ---
    dodaj(2, 'dom', (3, 9), lambda p: ('surowiec', rng.choice(['jagoda', 'pokeball'])))
    dodaj(1, 'dom', (4, 9), lambda p: ('kopalnia', 'jagoda'))
    dodaj(1, 'dom', (3, 9), lambda p: ('skrzynia', None))
    dodaj(2, 'dom', (5, 10), lambda p: ('potwor', 'slaby'))

    # --- reszta doliny: gospodarka, którą buduje się przed wyprawą na północ ---
    # W oryginale to jest cała pierwsza połowa rozgrywki: południe daje się
    # przejść bez armii, więc gracz ma czym zająć kilkanaście dni.
    dodaj(3, 'dom', (9, 22), lambda p: ('surowiec', rng.choice(['jagoda', 'odlamek', 'pokeball'])))
    dodaj(3, 'dom', (9, 24), lambda p: ('kopalnia', rng.choice(['jagoda', 'odlamek', 'pokeball'])))
    dodaj(3, 'dom', (8, 24), lambda p: ('skrzynia', None))
    dodaj(4, 'dom', (10, 30), lambda p: ('potwor', 'slaby'))
    dodaj(2, 'dom', (12, 30), lambda p: ('artefakt', None))

    # --- budowle odwiedzane w dolinie ---
    # W Heroes 3 to one wypełniają przestrzeń między kopalniami i dają powód,
    # żeby nadłożyć drogi. Po tej stronie grzbietu stoją same rzeczy dobre
    # od pierwszego dnia: drobne nagrody, ruch i statystyki.
    dodaj(1, 'dom', (2, 8), lambda p: ('budynek', 'ognisko'))
    dodaj(1, 'dom', (4, 12), lambda p: ('budynek', 'chatka'))
    dodaj(1, 'dom', (6, 16), lambda p: ('budynek', 'wiatrak'))
    dodaj(1, 'dom', (5, 14), lambda p: ('budynek', 'zrodlo'))
    dodaj(1, 'dom', (8, 20), lambda p: ('budynek', 'oboz-treningowy'))
    dodaj(1, 'dom', (10, 24), lambda p: ('budynek', 'ranczo'))
    dodaj(1, 'dom', (12, 26), lambda p: ('budynek', 'gniazdo'))
    dodaj(1, 'dom', (14, 30), lambda p: ('budynek', 'drzewo-wiedzy'))
    dodaj(1, 'dom', (12, 30), lambda p: ('budynek', 'woz'))

    # --- kraina przeciwnika: nagrody warte przejścia grzbietu ---
    dodaj(4, 'wroga', (0, 999), lambda p: ('surowiec', rng.choice(['odlamek', 'kamien', 'pokeball'])))
    dodaj(2, 'wroga', (0, 999), lambda p: ('kopalnia', rng.choice(['kamien', 'pokeball'])))
    dodaj(3, 'wroga', (0, 999), lambda p: ('skrzynia', None))
    dodaj(5, 'wroga', (0, 999), lambda p: ('potwor', 'silny'))
    dodaj(2, 'wroga', (0, 999), lambda p: ('artefakt', None))

    # --- budowle za grzbietem: to, po co się tam w ogóle jedzie ---
    # Mocne i trwałe: arena, wieża, ośrodek ewolucji. Oba portale stoją PO TEJ
    # SAMEJ stronie pasma — para przez grzbiet obchodziłaby strażników przełęczy
    # i unieważniała cały układ mapy.
    dodaj(1, 'wroga', (0, 999), lambda p: ('budynek', 'wieza-obserwacyjna'))
    dodaj(1, 'wroga', (0, 999), lambda p: ('budynek', 'arena'))
    dodaj(1, 'wroga', (0, 999), lambda p: ('budynek', 'kamienna-wieza'))
    dodaj(1, 'wroga', (0, 999), lambda p: ('budynek', 'osrodek-ewolucji'))
    dodaj(1, 'wroga', (0, 999), lambda p: ('budynek', 'wiatrak'))
    dodaj(1, 'wroga', (0, 999), lambda p: ('budynek', 'ognisko'))
    dodaj(2, 'wroga', (0, 999), lambda p: ('budynek', 'portal'))
    return obiekty


kroki = kroki_od(mapa, PUNKTY['start'])
rng2 = random.Random(ZIARNO + 1)
obiekty = rozstaw(mapa, kroki, rng2)

# Obie straże graniczne stoją osobno i zawsze w tym samym miejscu. W oryginale
# są to Strażnice Graniczne: nie da się ich obejść i to one trzymają całą mapę
# w ryzach. Losowanie ich położenia zamieniłoby zamysł mapy w przypadek.
#
# Stoją w PÓŁNOCNYM wylocie przejścia, nie w południowym. Powód jest praktyczny:
# w wylocie południowym dałoby się do nich dojechać pierwszego dnia i przegrać
# pierwszą bitwę w grze, zanim w ogóle było się w swoim zamku.
STRAZE_GRANICZNE = [
    ((13, 19), 'straznik', 'Strażnik Przełęczy'),
    ((4, 19), 'straznik', 'Strażnik Nadmorskiej Ścieżki'),
]
for pole, sila, nazwa in STRAZE_GRANICZNE:
    x, y = pole
    if mapa[y][x] not in PRZEJEZDNE:
        raise SystemExit(f'{nazwa} stoi na nieprzejezdnym polu {pole}.')
    obiekty.append((pole, ('potwor', sila, nazwa)))

print(f'obiektów: {len(obiekty)}')
policz = {}
for (x, y), _ in obiekty:
    policz[strefa(y)] = policz.get(strefa(y), 0) + 1
print('obiektów w strefach:', policz)
print('kroków do zamku wroga:', kroki.get(PUNKTY['zamek wroga']))
print('kroków do strażników:', [kroki.get(p) for p, _, _ in STRAZE_GRANICZNE])

wiersze = [''.join(w) for w in mapa]
udzial = {z: sum(w.count(z) for w in wiersze) for z in '.,=T#~'}
print(f'plansza {BOK} × {BOK}, pól przejezdnych: {len(dostepne)}')
print('udział terenów:', {k: f'{v * 100 // (BOK * BOK)}%' for k, v in udzial.items()})

naglowek = f'''// PLIK GENEROWANY — nie poprawiaj ręcznie.
// Źródło: tools/generuj_mape.py (szkic krain jest w tamtym pliku).
//
// Plansza {BOK} × {BOK} — układ wzorowany na „Key to Victory" z Heroes 3:
// gracz na południowym wschodzie, przeciwnik na północy, między nimi grzbiet
// górski z dwoma pilnowanymi przejściami.
// Znaki: . trawa, = ścieżka, , piasek, T las, # skały, ~ woda.

export const TEREN = [
'''
tresc = naglowek + ''.join(f"  '{w}',\n" for w in wiersze) + '];\n\n'
tresc += 'export const PUNKTY = {\n'
for nazwa, (x, y) in PUNKTY.items():
    tresc += f"  '{nazwa}': {{ x: {x}, y: {y} }},\n"
tresc += '};\n\n'
tresc += '''/**
 * Rozstawienie obiektów. `strefa` mówi, po której stronie grzbietu leży pole —
 * `src/data/plansza.ts` bierze z tego klasę artefaktu i siłę nagrody, bo na tej
 * mapie o wartości znaleziska decyduje strona pasma, a nie odległość od startu.
 */
export const ROZSTAWIENIE: Array<{
  x: number;
  y: number;
  rodzaj: string;
  strefa: 'dom' | 'pogranicze' | 'wroga';
  surowiec?: string;
  sila?: string;
  nazwa?: string;
  budynek?: string;
}> = [
'''
for wpis in obiekty:
    (x, y), reszta = wpis[0], wpis[1]
    rodzaj, co = reszta[0], reszta[1]
    nazwa = reszta[2] if len(reszta) > 2 else None
    pola = [f'x: {x}', f'y: {y}', f"rodzaj: '{rodzaj}'", f"strefa: '{strefa(y)}'"]
    if rodzaj == 'potwor':
        pola.append(f"sila: '{co}'")
    elif rodzaj == 'budynek':
        pola.append(f"budynek: '{co}'")
    elif co:
        pola.append(f"surowiec: '{co}'")
    if nazwa:
        pola.append(f"nazwa: '{nazwa}'")
    tresc += '  { ' + ', '.join(pola) + ' },\n'
tresc += '];\n'
WYNIK.write_text(tresc, encoding='utf-8')
print(f'zapisano {WYNIK.relative_to(KORZEN)}')


# ---------------------------------------------------------------------------
# Czego brakuje, żeby to była naprawdę „Key to Victory"
# ---------------------------------------------------------------------------
#
# Trzy rzeczy z oryginału nie dają się oddać żadnym obiektem, który mamy:
#
# 1. STRAŻNICA GRANICZNA i NAMIOT KLUCZNIKA. To jest tytułowy klucz: strażnica
#    nie da się pokonać, tylko OTWORZYĆ, po znalezieniu namiotu w innej części
#    mapy. Zamiast tego stoi u nas zwykły potwór, więc mapa mówi „zbierz armię",
#    a nie „poszukaj klucza" — a to zupełnie inna zagadka i zupełnie inna gra.
# 2. WIĘZIENIE z bohaterem do uwolnienia (w oryginale Adela na polu 30,18).
#    Drugi bohater to drugi kierunek naraz, czyli powód, żeby mapa była szeroka.
# 3. CHATA JASNOWIDZA — zadanie „przynieś X, dostaniesz Y". Jedyny obiekt
#    w Heroes 3, który każe wrócić w to samo miejsce po raz drugi.
#
# Poza tym przydałyby się: kamień wiedzy / drzewo wiedzy (stały przyrost
# statystyk, żeby rozbudowa doliny dawała coś poza surowcami) i chorągiew /
# wiatrak jako drobne, powtarzalne cele w bezpiecznej połowie mapy.
