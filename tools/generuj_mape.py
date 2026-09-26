#!/usr/bin/env python3
"""Silnik planszy przygody — jeden dla wszystkich map kampanii.

Co jest tutaj, a co w `tools/mapy/`
-----------------------------------
Plansza powstaje zawsze tą samą drogą: ręcznie wpisany SZKIC krain jest
powiększany, granice się rozmywają, rdzenie murów wracają do stanu ze szkicu,
przejścia są wycinane z tabeli, drogi wytyczane Dijkstrą między punktami
orientacyjnymi, a na koniec obiekty stają pole po polu, każde sprawdzone
zasadami gry (czy nie zatyka drogi, czy do wszystkiego da się dalej podejść).

Ta DROGA jest tutaj. To, co ją odróżnia od mapy do mapy — szkic, rozmiar,
mury i przejścia, punkty, strefy i kolejność stawiania obiektów — siedzi
w konfiguracji planszy: `tools/mapy/<id>.py`. Rozdział jest celowy. Każda
z pułapek opisanych niżej (mur z dziurą w szkicu, las w wylocie przełęczy,
skrzynia w korytarzu, portal donikąd) kosztowała kiedyś rundę na „Dwóch
Dolinach" — i przy czterech mapach kopiowanych z jednej każda naprawa
musiałaby trafić w cztery miejsca naraz.

Pułapki, które silnik łapie sam
-------------------------------
* Rozmycie potrafi wybić w murze dziurę szeroką na pole. `zasklep` przywraca
  rdzeń muru ze szkicu, a liczba przejść jest sprawdzana na końcu.
* Przejście szersze niż trzy pola da się obejść: potwór blokuje pas szeroki na
  trzy. Przejścia wycina wyłącznie tabela `PRZEJSCIA`.
* Rozmycie potrafi zasypać lasem wylot przejścia — `udroznij_wyloty`.
* Obiekty zatykają drogę (trasa w grze nie przechodzi przez obiekty) — każde
  postawienie jest sprawdzane.

Uruchomienie:

    python3 tools/generuj_mape.py              # wszystkie plansze
    python3 tools/generuj_mape.py polana       # jedna
"""

import heapq
import importlib
import json
import random
import sys
from collections import deque
from pathlib import Path

KORZEN = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(Path(__file__).resolve().parent))

#: Wszystkie plansze kampanii, w kolejności misji (plus „Dwie Doliny", które
#: są też planszą gry pojedynczej).
MAPY = ['dwie-doliny', 'polana', 'bagna', 'twierdza']

PRZEJEZDNE = set('.,=jsb')


def konfiguracja(mapa_id):
    """Moduł `tools/mapy/<id>.py` — identyfikator z myślnikiem, moduł z podkreślnikiem."""
    return importlib.import_module('mapy.' + mapa_id.replace('-', '_'))


def plik_ts(mapa_id):
    """Gdzie generator zapisuje planszę. „Dwie Doliny" były pierwsze i zostają
    pod starą nazwą — sięga do niej kilkanaście narzędzi i sond."""
    if mapa_id == 'dwie-doliny':
        return KORZEN / 'src' / 'data' / 'plansza-teren.ts'
    return KORZEN / 'src' / 'data' / f'plansza-teren-{mapa_id}.ts'


def katalog_tla(mapa_id):
    """Katalog tła w `public/` — ten sam, który `MAPY` w `src/data/mapy.ts`
    podaje jako `tlo`."""
    if mapa_id == 'dwie-doliny':
        return KORZEN / 'public' / 'mapa'
    return KORZEN / 'public' / 'mapa' / mapa_id


def odleglosc(a, b):
    return max(abs(a[0] - b[0]), abs(a[1] - b[1]))


#: Ile „kosztuje" poprowadzenie drogi przez rodzaj terenu. To nie jest koszt
#: ruchu w grze, tylko wskazówka dla trasowania: droga woli trawę, przez las
#: przejdzie, gór i wody unika zupełnie. Bagno jest droższe od lasu: droga ma je
#: OMIJAĆ, bo w grze kosztuje 175 punktów ruchu przy 70 za ścieżkę — gdyby szła
#: bagnem, gracz nie miałby czego wybierać. Plansza może to nadpisać
#: (`KOSZT_DROGI`), np. na bagnach, gdzie grobla przez trzęsawisko jest właśnie
#: tym, po co się drogę kładzie.
KOSZT_DROGI = {'=': 0.5, '.': 1, 'j': 2, ',': 3, 's': 4, 'T': 6, 'b': 8, '#': None, '~': None}


def mury_planszy(k):
    """Mury (dawniej „grzbiety") w jednej postaci, niezależnie od zapisu w konfiguracji.

    Zapis krótki `(nazwa, (y0, y1))` to mur poziomy przez całą szerokość —
    tak jak oba grzbiety „Dwóch Dolin". Pełny: `(nazwa, os, (a0, a1), (od, do))`,
    gdzie `os == 'y'` znaczy rdzeń w wierszach a0–a1 (mur poziomy), a `os == 'x'`
    rdzeń w kolumnach a0–a1 (mur pionowy, np. rzeka), a `(od, do)` to odcinek
    wzdłuż muru, na którym obowiązuje.
    """
    wynik = []
    for m in getattr(k, 'GRZBIETY', []):
        if len(m) == 2:
            nazwa, (a0, a1) = m
            wynik.append({'nazwa': nazwa, 'os': 'y', 'rdzen': (a0, a1), 'zakres': (0, k.BOK - 1)})
        else:
            nazwa, os_, (a0, a1), (od, do) = m
            wynik.append({'nazwa': nazwa, 'os': os_, 'rdzen': (a0, a1), 'zakres': (od, do)})
    return wynik


class Generator:
    """Stan jednej planszy w trakcie składania — teren, a potem obiekty."""

    def __init__(self, k):
        self.k = k
        self.BOK = k.BOK
        self.SKALA = k.SKALA
        self.mury = mury_planszy(k)
        self.pod_obiekty = getattr(k, 'POD_OBIEKTY', '.,')
        self.znaki_muru = getattr(k, 'ZNAKI_MURU', '#')
        self.koszt_drogi = dict(KOSZT_DROGI, **getattr(k, 'KOSZT_DROGI', {}))
        self.przejscia = getattr(k, 'PRZEJSCIA', [])
        #: Zapory to przeszkody, których nie da się opisać prostym murem —
        #: meandrująca rzeka, pierścień wody wokół wyspy. Maluje je sama
        #: konfiguracja (`popraw_teren`), a silnik sprawdza wynik: po zamknięciu
        #: wszystkich przejść zapory punkty, które ma odcinać, MUSZĄ być
        #: nieosiągalne. Dziura w zaporze wygląda na obrazku dokładnie tak samo
        #: jak zapora szczelna.
        self.zapory = getattr(k, 'ZAPORY', {})
        self.prostokaty_przejsc = [r for _, r, _ in self.przejscia] + [
            r for z in self.zapory.values() for r in z['przejscia']
        ]

    # ------------------------------------------------------------------ teren

    def w(self, x, y):
        return 0 <= x < self.BOK and 0 <= y < self.BOK

    def ze_szkicu(self, x, y):
        """Teren, który szkic przewiduje dla tego pola — przed rozmyciem."""
        return self.k.SZKIC[y // self.SKALA][x // self.SKALA]

    def szkic_na_mape(self, rng):
        """Powiększa szkic i rozmywa granice, żeby krainy nie były prostokątami."""
        BOK = self.BOK
        mapa = [[self.ze_szkicu(x, y) for x in range(BOK)] for y in range(BOK)]
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

    def skup_las(self, mapa, przebiegi=2):
        """Las w ZWARTE masy z polanami, a nie w sito pojedynczych drzew.

        Rozmycie granic sypie po łące pojedyncze pola lasu i wycina dziury
        w borze. Scena stawia drzewo na KAŻDYM polu lasu, więc z daleka wychodzi
        tapeta: drzewa wszędzie po trochu i nie widać, którędy da się przejść
        (werdykt ślepego porównania, runda 1). W Heroes las to bryła z wyraźnym
        brzegiem, a między bryłami jest wolna ziemia. Automat komórkowy: drzewo
        z mniej niż trzema leśnymi sąsiadami znika (dostaje teren, którego wokół
        najwięcej), a pole otoczone lasem z co najmniej sześciu stron zarasta.
        """
        B = self.BOK
        for _ in range(przebiegi):
            nowa = [w[:] for w in mapa]
            for y in range(B):
                for x in range(B):
                    sasiedzi = [
                        mapa[y + dy][x + dx]
                        for dy in (-1, 0, 1)
                        for dx in (-1, 0, 1)
                        if (dx or dy) and 0 <= x + dx < B and 0 <= y + dy < B
                    ]
                    lesnych = sasiedzi.count('T')
                    if mapa[y][x] == 'T' and lesnych < 3:
                        inne = [s for s in sasiedzi if s in PRZEJEZDNE]
                        if inne:
                            nowa[y][x] = max(sorted(set(inne)), key=inne.count)
                    elif mapa[y][x] in PRZEJEZDNE and lesnych >= 6:
                        nowa[y][x] = 'T'
            mapa[:] = nowa

    def pola_rdzenia(self, mur):
        """Pola rdzenia muru — tam mur ma być NIEPRZERWANY."""
        a0, a1 = mur['rdzen']
        od, do = mur['zakres']
        for a in range(a0, a1 + 1):
            for b in range(od, do + 1):
                yield (b, a) if mur['os'] == 'y' else (a, b)

    def w_rdzeniu(self, x, y):
        for mur in self.mury:
            a0, a1 = mur['rdzen']
            od, do = mur['zakres']
            wzdluz, w_poprzek = (x, y) if mur['os'] == 'y' else (y, x)
            if a0 <= w_poprzek <= a1 and od <= wzdluz <= do:
                return True
        return False

    def zasklep(self, mapa):
        """Przywraca rdzenie murów do stanu ze szkicu.

        Rozmycie pracuje na brzegach pasma, więc zarys zostaje poszarpany, ale
        rdzenia nie rusza. Bez tego szum wybija w murze dziurę szeroką na pole:
        nie widać jej ani na obrazku, ani w kodzie — po prostu pewnego dnia da
        się wejść bokiem, omijając straż.
        """
        for mur in self.mury:
            for x, y in self.pola_rdzenia(mur):
                if self.ze_szkicu(x, y) in self.znaki_muru:
                    mapa[y][x] = self.ze_szkicu(x, y)

    def mur_przejscia(self, nazwa):
        return next(m for m in self.mury if m['nazwa'] == nazwa)

    def wytnij_przejscia(self, mapa):
        """Wycina przejścia, oddając im teren z TABELI, a nie trawę.

        Wycinamy KAŻDY teren nieprzejezdny, nie tylko skałę i wodę. Las też nie
        jest przejezdny, a rozmycie potrafi go wstawić w sam środek przejścia —
        wtedy strażnik stoi na polu, na które nie da się wejść.
        """
        for _, (x0, y0, x1, y1), teren in self.przejscia:
            for y in range(y0, y1 + 1):
                for x in range(x0, x1 + 1):
                    if mapa[y][x] not in PRZEJEZDNE:
                        mapa[y][x] = teren

    def udroznij_wyloty(self, mapa, ile=4):
        """Przebija wyloty przejść, jeśli rozmycie zasypało je lasem albo skałą.

        Przejście jest wycinane dokładnie w rdzeniu muru, ale tuż za nim leży
        już zwykły teren — a ten bywa lasem, który w tej grze jest
        NIEPRZEJEZDNY. Wystarczą dwa drzewa w wylocie i przełęcz prowadzi
        donikąd. Idziemy więc od obu końców przejścia na zewnątrz i tak długo,
        jak cały rząd przejścia jest nieprzejezdny, kładziemy w nim teren
        przejścia.
        """
        for nazwa, (x0, y0, x1, y1), teren in self.przejscia:
            mur = self.mur_przejscia(nazwa)
            if mur['os'] == 'y':
                szerokosc = [(x, None) for x in range(x0, x1 + 1)]
                konce = ((-1, y0 - 1), (1, y1 + 1))
            else:
                szerokosc = [(None, y) for y in range(y0, y1 + 1)]
                konce = ((-1, x0 - 1), (1, x1 + 1))
            for kierunek, start in konce:
                a = start
                for _ in range(ile):
                    if not (0 <= a < self.BOK):
                        break
                    pola = [(px if px is not None else a, py if py is not None else a) for px, py in szerokosc]
                    if any(mapa[y][x] in PRZEJEZDNE for x, y in pola):
                        break
                    for x, y in pola:
                        mapa[y][x] = teren
                    a += kierunek

    def przejscia_w_murze(self, mapa, mur):
        """Linie, którymi da się przejść przez CAŁY rdzeń muru."""
        a0, a1 = mur['rdzen']
        od, do = mur['zakres']
        if mur['os'] == 'y':
            return [x for x in range(od, do + 1) if all(mapa[y][x] in PRZEJEZDNE for y in range(a0, a1 + 1))]
        return [y for y in range(od, do + 1) if all(mapa[y][x] in PRZEJEZDNE for x in range(a0, a1 + 1))]

    def trasa(self, mapa, skad, dokad):
        """Najtańsza trasa Dijkstrą po ośmiu kierunkach."""
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
                    if not (0 <= nx < self.BOK and 0 <= ny < self.BOK):
                        continue
                    c = self.koszt_drogi[mapa[ny][nx]]
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

    def osiagalne(self, mapa, skad, blok=frozenset()):
        """Pola osiągalne ze startu (osiem kierunków, po terenie przejezdnym)."""
        widziane = {skad}
        kolejka = deque([skad])
        while kolejka:
            x, y = kolejka.popleft()
            for dx in (-1, 0, 1):
                for dy in (-1, 0, 1):
                    nx, ny = x + dx, y + dy
                    if (
                        0 <= nx < self.BOK
                        and 0 <= ny < self.BOK
                        and (nx, ny) not in widziane
                        and (nx, ny) not in blok
                        and mapa[ny][nx] in PRZEJEZDNE
                    ):
                        widziane.add((nx, ny))
                        kolejka.append((nx, ny))
        return widziane

    def kroki_od(self, mapa, skad):
        """Ile pól dzieli start od każdego pola — po terenie, nie po przekątnej."""
        odl = {skad: 0}
        kolejka = deque([skad])
        while kolejka:
            x, y = kolejka.popleft()
            for dx in (-1, 0, 1):
                for dy in (-1, 0, 1):
                    nx, ny = x + dx, y + dy
                    if (
                        0 <= nx < self.BOK
                        and 0 <= ny < self.BOK
                        and (nx, ny) not in odl
                        and mapa[ny][nx] in PRZEJEZDNE
                    ):
                        odl[(nx, ny)] = odl[(x, y)] + 1
                        kolejka.append((nx, ny))
        return odl

    def zbuduj_teren(self):
        k = self.k
        rng = random.Random(k.ZIARNO)
        mapa = self.szkic_na_mape(rng)
        if getattr(k, 'SKUP_LAS', False):
            self.skup_las(mapa)
        self.zasklep(mapa)
        self.wytnij_przejscia(mapa)
        self.udroznij_wyloty(mapa)
        popraw = getattr(k, 'popraw_teren', None)
        if popraw:
            popraw(self, mapa)

        # Punkty orientacyjne muszą stać na przejezdnym terenie — inaczej trasa
        # do nich nie istnieje i drogi cicho się nie wytyczą.
        #
        # Z JEDNYM wyjątkiem: punktów leżących W RDZENIU muru nie ruszamy.
        # Odsłanianie wokół nich kwadratu 3 × 3 rozpychało przejście z dwóch pól
        # na cztery — a wtedy strażnik zostawia szparę i da się go obejść bokiem.
        for x, y in k.PUNKTY.values():
            if self.w_rdzeniu(x, y):
                continue
            for dy in (-1, 0, 1):
                for dx in (-1, 0, 1):
                    if self.w(x + dx, y + dy) and mapa[y + dy][x + dx] in '#~':
                        mapa[y + dy][x + dx] = '.'

        for szlak in k.SZLAKI:
            for a, b in zip(szlak, szlak[1:]):
                droga = self.trasa(mapa, k.PUNKTY[a], k.PUNKTY[b])
                if droga is None:
                    raise SystemExit(f'[{k.ID}] Brak trasy: {a} → {b}. Popraw SZKIC.')
                for x, y in droga:
                    mapa[y][x] = '='

        po_drogach = getattr(k, 'po_drogach', None)
        if po_drogach:
            po_drogach(self, mapa)
        if getattr(k, 'ZASYP_ODCIETE', False):
            self.zasyp_odciete(mapa)
        return mapa

    def zasyp_odciete(self, mapa):
        """Zamienia przejezdne pola, do których nie da się dojść, w las albo skałę.

        Łąka zamknięta w pierścieniu gór wygląda jak zwykły teren — i dziecko
        będzie w nią klikać w nieskończoność, nie rozumiejąc, czemu bohater nie
        idzie. W Heroes 3 takie kieszenie są albo zarośnięte, albo mają wejście.
        Zasypujemy tym, czego wokół jest najwięcej (las, skała, woda), żeby nie
        zostawić plamy innego koloru.
        """
        dostepne = self.osiagalne(mapa, self.k.PUNKTY['start'])
        zasypane = 0
        for y in range(self.BOK):
            for x in range(self.BOK):
                if mapa[y][x] in PRZEJEZDNE and (x, y) not in dostepne:
                    sasiedzi = [
                        mapa[y + dy][x + dx]
                        for dy in (-1, 0, 1)
                        for dx in (-1, 0, 1)
                        if (dx or dy) and self.w(x + dx, y + dy) and mapa[y + dy][x + dx] in 'T#~'
                    ]
                    mapa[y][x] = max('T#~', key=sasiedzi.count) if sasiedzi else 'T'
                    zasypane += 1
        if zasypane:
            print(f'  zasypane odcięte pola: {zasypane}')

    def sprawdz_teren(self, mapa):
        k = self.k
        dostepne = self.osiagalne(mapa, k.PUNKTY['start'])
        for nazwa, (x, y) in k.PUNKTY.items():
            if (x, y) not in dostepne:
                raise SystemExit(f'[{k.ID}] {nazwa} jest nieosiągalny ze startu.')
        oczekiwane = getattr(k, 'PRZEJSC_W_MURZE', getattr(k, 'PRZEJSC_W_GRZBIECIE', 2))
        for mur in self.mury:
            przejscia = self.grupy(self.przejscia_w_murze(mapa, mur))
            ile = oczekiwane[mur['nazwa']] if isinstance(oczekiwane, dict) else oczekiwane
            if len(przejscia) != ile:
                raise SystemExit(
                    f"[{k.ID}] Mur {mur['nazwa']}: przejść {len(przejscia)} zamiast {ile} "
                    f'({przejscia}). Popraw SZKIC albo PRZEJSCIA.'
                )
            for g in przejscia:
                if len(g) > 3:
                    raise SystemExit(f"[{k.ID}] Mur {mur['nazwa']}: przejście {g} szersze niż trzy pola.")
            os_ = 'kolumny' if mur['os'] == 'y' else 'wiersze'
            print(f"  przejścia przez mur {mur['nazwa']} ({os_}):", przejscia)
        for nazwa, z in self.zapory.items():
            zamkniete = {
                (x, y)
                for x0, y0, x1, y1 in z['przejscia']
                for y in range(y0, y1 + 1)
                for x in range(x0, x1 + 1)
            }
            za_zapora = self.osiagalne(mapa, k.PUNKTY['start'], zamkniete)
            for cel in z['odcina']:
                if k.PUNKTY[cel] in za_zapora:
                    raise SystemExit(
                        f'[{k.ID}] Zapora „{nazwa}" ma dziurę: {cel} jest osiągalny z zamkniętymi przejściami.'
                    )
            for x0, y0, x1, y1 in z['przejscia']:
                if min(x1 - x0, y1 - y0) + 1 > 3:
                    raise SystemExit(f'[{k.ID}] Przejście zapory „{nazwa}" szersze niż trzy pola.')
            print(f"  zapora {nazwa}: szczelna, przejść {len(z['przejscia'])}")
        return dostepne

    @staticmethod
    def grupy(linie):
        """Skleja sąsiadujące linie w jedno przejście."""
        wynik = []
        for x in linie:
            if wynik and x == wynik[-1][-1] + 1:
                wynik[-1].append(x)
            else:
                wynik.append([x])
        return wynik

    # ----------------------------------------------------------------- obiekty

    def w_przejsciu(self, x, y):
        """Pola przejść i ich wylotów. Obiekt postawiony w przejściu zatyka je
        na głucho — trasa nie przechodzi PRZEZ obiekty."""
        for x0, y0, x1, y1 in self.prostokaty_przejsc:
            if x0 - 1 <= x <= x1 + 1 and y0 - 1 <= y <= y1 + 1:
                return True
        return False

    def ciasne(self, x, y):
        """Czy pole jest szyjką — ma mniej niż czterech przejezdnych sąsiadów.

        Przy mapie w jednej trzeciej zalesionej korytarzy jest dużo, a obiekt
        postawiony w korytarzu odcina wszystko za nim. Szyjki zostają puste.
        """
        mapa = self.mapa
        ilu = 0
        for dy in (-1, 0, 1):
            for dx in (-1, 0, 1):
                if (dx or dy) and self.w(x + dx, y + dy) and mapa[y + dy][x + dx] in PRZEJEZDNE:
                    ilu += 1
        return ilu < 4

    def wolne_pola(self, ktora, zakres_krokow=(0, 999), min_odstep=1):
        mapa, kroki, zajete = self.mapa, self.kroki, self.zajete
        wynik = []
        for y in range(self.BOK):
            for x in range(self.BOK):
                if mapa[y][x] not in self.pod_obiekty:
                    continue
                if self.w_przejsciu(x, y) or self.ciasne(x, y):
                    continue
                if self.k.strefa(x, y) != ktora:
                    continue
                d = kroki.get((x, y))
                if d is None or not (zakres_krokow[0] <= d <= zakres_krokow[1]):
                    continue
                if any(odleglosc((x, y), z) < min_odstep for z in zajete):
                    continue
                wynik.append((x, y))
        return wynik

    def znajdz_kieszenie(self, start, najmniej=3, najwiecej=28):
        """Zakątki, które zamyka JEDEN strażnik — miejsca na skarb pod strażą.

        Kieszeń liczymy DOKŁADNIE TAK, JAK DZIAŁA STRAŻ: potwór blokuje pole,
        na którym stoi, i osiem pól wokół, więc pytamy, co odetnie się od reszty
        planszy po zamknięciu tego kwadratu 3 × 3. Kandydatów zawężamy do pól
        z najwyżej pięcioma przejezdnymi sąsiadami: pośrodku łąki nic się nie
        odetnie, a przeszukiwanie z każdego pola kosztuje kilkanaście sekund.
        """
        mapa = self.mapa
        wszystkie = self.osiagalne(mapa, start)
        kieszenie = []
        zajete_pola = set()
        for (gx, gy) in sorted(wszystkie):
            if (gx, gy) == start:
                continue
            sasiedzi = sum(
                1
                for dy in (-1, 0, 1)
                for dx in (-1, 0, 1)
                if (dx or dy) and self.w(gx + dx, gy + dy) and mapa[gy + dy][gx + dx] in PRZEJEZDNE
            )
            if sasiedzi > 5:
                continue
            bez = {(gx + dx, gy + dy) for dy in (-1, 0, 1) for dx in (-1, 0, 1)}
            if start in bez:
                continue
            widziane = self.osiagalne(mapa, start, bez)
            odciete = wszystkie - widziane - bez
            if najmniej <= len(odciete) <= najwiecej and not (odciete & zajete_pola):
                kieszenie.append(((gx, gy), sorted(odciete)))
                zajete_pola |= odciete | bez
        return kieszenie

    #: Bryły. Zamek zajmuje 3 × 2 pola NAD wejściem, kopalnia 3 × 1, a z budowli
    #: odwiedzanych — arena, ranczo i ośrodek ewolucji (patrz `BRYLA` i `BUDOWLE`
    #: w `src/data/mapa.ts`; lista musi się z nimi zgadzać co do nazwy —
    #: pomyłka „gniazdo zamiast ośrodka ewolucji” kosztowała rundę: generator
    #: meldował spójną planszę, a w grze czterdzieści obiektów w północno-
    #: wschodniej ćwiartce nie miało dojścia).
    BRYLY = {
        ('zamek', None): (3, 2),
        ('kopalnia', None): (3, 1),
        ('budynek', 'arena'): (3, 1),
        ('budynek', 'ranczo'): (3, 1),
        ('budynek', 'osrodek-ewolucji'): (3, 1),
    }

    #: Kopalnie podstawowe — odpowiedniki tartaku i kopalni rudy. Przy strefie
    #: startowej w Heroes 3 stoją niepilnowane: bez nich nie ma z czego zacząć.
    PODSTAWOWE = ('jagoda', 'odlamek')

    def pola_bryly(self, rodzaj, co, pole):
        rozmiar = self.BRYLY.get((rodzaj, co)) or self.BRYLY.get((rodzaj, None))
        if not rozmiar:
            return []
        szer, wys = rozmiar
        x, y = pole
        return [
            (x + dx, y + dy)
            for dy in range(-wys, 0)
            for dx in range(-(szer // 2), szer // 2 + 1)
            if self.w(x + dx, y + dy) and self.mapa[y + dy][x + dx] in PRZEJEZDNE
        ]

    def dostepnych(self, dodatkowe=()):
        blok = self.blokada | set(dodatkowe)
        return self.osiagalne(self.mapa, self.k.PUNKTY['start'], blok)

    def koliduje_ze_straza(self, pole, proba):
        """Czy to postawienie zrobiłoby z podstawowej kopalni kopalnię pilnowaną.

        Działa w obie strony, bo kolejność rozstawiania jest różna w różnych
        strefach: potwór nie stanie obok takiej kopalni, a taka kopalnia nie
        stanie obok potwora.
        """
        obok = lambda a, b: max(abs(a[0] - b[0]), abs(a[1] - b[1])) <= 1
        if proba[0] == 'potwor':
            return any(
                co[0] == 'kopalnia' and co[1] in self.PODSTAWOWE and obok(pole, p)
                for p, co in self.obiekty
            )
        if proba[0] == 'kopalnia' and proba[1] in self.PODSTAWOWE:
            return any(co[0] == 'potwor' and obok(pole, p) for p, co in self.obiekty)
        return False

    def dodaj(self, ile, ktora, zakres, buduj, odstep=1, kandydaci=None):
        """Stawia `ile` obiektów i zwraca ich pola.

        Obiekty ZATYKAJĄ drogę — trasa w grze nie przechodzi przez nie. Każde
        postawienie jest więc SPRAWDZANE: jeśli po nim dostępnych pól ubywa
        więcej niż to, co sam obiekt zajmuje, albo do któregoś z wcześniej
        postawionych obiektów nie da się już podejść, obiekt idzie gdzie
        indziej.

        `kandydaci` pozwala narzucić pulę pól — używa tego rozstawianie skarbów
        w kieszeni, gdzie o miejscu decyduje kształt zaułka, a nie strefa
        i odległość od startu.
        """
        rng, obiekty, zajete = self.rng, self.obiekty, self.zajete
        pola = []
        for _ in range(ile):
            wolne = (
                [p for p in kandydaci if p not in zajete]
                if kandydaci is not None
                else self.wolne_pola(ktora, zakres, odstep)
            )
            if not wolne:
                raise SystemExit(f'[{self.k.ID}] Brak miejsca na obiekt: {ktora} {zakres}. Popraw SZKIC.')
            pole = None
            wpis = None
            # Dwa podejścia. W pierwszym budowla z bryłą musi dostać miejsce na
            # mur; w drugim ten warunek odpada, bo lepszy przycięty mur niż
            # plansza, która się nie wygenerowała.
            for wymagaj_muru in (True, False):
                for _ in range(min(40, len(wolne))):
                    kandydat = rng.choice(wolne)
                    proba = buduj(kandydat)
                    zajmowane = [kandydat] + self.pola_bryly(proba[0], proba[1], kandydat)
                    # Mur kopalni nie może stanąć na polu startu — bohater
                    # zaczynałby grę w murze (złapała to `probe-mapy.ts`
                    # na Polanie po przesunięciu startu).
                    if self.k.PUNKTY['start'] in zajmowane:
                        continue
                    widziane = self.dostepnych(zajmowane)
                    if len(widziane) < self.stan_dostepnych - len(zajmowane):
                        continue

                    def dojdzie(pole_o, widziane=widziane):
                        return any(
                            (pole_o[0] + dx, pole_o[1] + dy) in widziane
                            for dy in (-1, 0, 1)
                            for dx in (-1, 0, 1)
                            if (dx or dy)
                        )

                    if not dojdzie(kandydat):
                        continue
                    if not all(dojdzie(p) for p, co in obiekty if co[0] != 'potwor'):
                        continue
                    # Budowla z bryłą potrzebuje miejsca na MUR: `polaBryly`
                    # w grze pomija pole muru stykające się bokiem z cudzym
                    # wejściem, więc przy ciasnym rozstawieniu budynek wygląda
                    # jak coś, przez co da się przejść.
                    if wymagaj_muru and self.koliduje_ze_straza(kandydat, proba):
                        continue
                    if (
                        wymagaj_muru
                        and len(zajmowane) > 1
                        and any(
                            abs(bx - ox) + abs(by - oy) <= 1
                            for bx, by in zajmowane[1:]
                            for (ox, oy), _ in obiekty
                        )
                    ):
                        continue
                    self.stan_dostepnych = len(widziane)
                    pole, wpis = kandydat, proba
                    self.blokada.update(zajmowane)
                    break
                if pole is not None:
                    break
            if pole is None:
                raise SystemExit(f'[{self.k.ID}] Każde miejsce w strefie {ktora} zatyka drogę. Popraw SZKIC.')
            zajete.append(pole)
            # Pola muru i ich sąsiedztwo są odtąd zajęte: postawienie tam
            # czegokolwiek skasowałoby ten mur.
            for bx, by in self.pola_bryly(wpis[0], wpis[1], pole):
                zajete.append((bx, by))
                for dx, dy in ((1, 0), (-1, 0), (0, 1), (0, -1)):
                    zajete.append((bx + dx, by + dy))
            obiekty.append((pole, wpis))
            pola.append(pole)
        return pola

    def postaw(self, pole, wpis):
        """Obiekt na USTALONYM polu — cel misji, jego strażnik, brama.

        Losowanie miejsca zamieniłoby zamysł mapy w przypadek, więc tu pole
        podaje konfiguracja. Sprawdzenia są te same co w `dodaj`, tylko zamiast
        szukać innego miejsca, generator odmawia pracy: postawienie celu misji
        w miejscu, do którego nie da się dojść, to plansza nie do wygrania.
        """
        x, y = pole
        if self.mapa[y][x] not in PRZEJEZDNE:
            raise SystemExit(f'[{self.k.ID}] {wpis} ma stać na nieprzejezdnym polu {pole}.')
        if pole in [p for p, _ in self.obiekty]:
            raise SystemExit(f'[{self.k.ID}] Pole {pole} jest już zajęte.')
        if wpis[0] != 'potwor':
            zajmowane = [pole] + self.pola_bryly(wpis[0], wpis[1], pole)
            widziane = self.dostepnych(zajmowane)
            if not any((x + dx, y + dy) in widziane for dy in (-1, 0, 1) for dx in (-1, 0, 1) if dx or dy):
                raise SystemExit(f'[{self.k.ID}] Do {wpis} na {pole} nie da się podejść.')
            self.blokada.update(zajmowane)
            self.stan_dostepnych = len(widziane)
        self.zajete.append(pole)
        self.obiekty.append((pole, wpis))
        return pole

    def kadr_startu(self):
        """Wolne pola PIERWSZEGO EKRANU — tego, co gracz widzi w dniu pierwszym.

        W Heroes 2 pierwszy ekran ma kilkanaście rzeczy do zrobienia: kopalnie,
        budowle, skarb pod strażą. U nas rozstawianie po strefach sypało je
        równo po całej dolinie i na starcie widać było zamek, skrzynię i jagody.
        Okno planszy ma ok. 14 × 12 pól, a kamera stoi na bohaterze; bierzemy
        wnętrze bez pasa przy krawędzi (patrz `RAMKA_STARTU`).
        """
        sx, sy = self.k.PUNKTY['start']
        return [
            p
            for p in self.wolne_pola(self.k.strefa(sx, sy), (1, 999))
            if abs(p[0] - sx) <= 5 and -3 <= p[1] - sy <= 5
        ]

    def pod_skala(self, ktora, zakres=(0, 999)):
        """Wolne pola z SKAŁĄ tuż nad sobą — miejsce na kopalnię wciętą w zbocze.

        W Heroes kopalnia siedzi w wycięciu skalnej ściany, a nie na środku
        łąki. Bryła kopalni stoi w rzędzie nad wejściem; gdy tam jest skała,
        mur nie blokuje niczego nowego, a rysunek wchodzi w zbocze. Pusta
        lista znaczy „nie ma takiego miejsca" — wtedy stawia się jak zwykle.
        """
        return [
            (x, y)
            for x, y in self.wolne_pola(ktora, zakres)
            if y > 0 and self.mapa[y - 1][x] == '#'
        ]

    def dodaj_najpierw(self, ktora, buduj, preferowane, reszta=None, zakres=(0, 999), budowla=None):
        """Jeden obiekt — najpierw w preferowanych polach, a gdy żadne się nie
        nadaje (zatyka drogę, brak miejsca), tam gdzie zwykle.

        Preferowane pola trzymają ODSTĘP od postawionych już budowli
        (`ODSTEP_KADRU`, domyślnie 0): na pierwszym ekranie sad, kuźnia
        i wiatrak stawały dach w dach i zlewały się w jedną plamę.
        """
        odstep = getattr(self.k, 'ODSTEP_KADRU', 0)
        if budowla is None:
            # Budowla = kopalnia albo budynek; pytamy BEZ losowania — lambdy
            # stosów losują surowiec, a dodatkowe losowanie przesunęłoby planszę.
            stale = []
            for c in buduj.__code__.co_consts:
                stale += list(c) if isinstance(c, tuple) else [c]
            budowla = 'kopalnia' in stale or 'budynek' in stale
        if odstep and budowla:
            budowle = [p for p, co in self.obiekty if co[0] in ('kopalnia', 'budynek')]
            daleko = lambda lista: [p for p in lista if all(odleglosc(p, q) >= odstep for q in budowle)]
            if preferowane:
                preferowane = daleko(preferowane)
            if reszta:
                reszta = daleko(reszta) or reszta
        if preferowane:
            try:
                return self.dodaj(1, ktora, zakres, buduj, kandydaci=preferowane)
            except SystemExit:
                pass
        return self.dodaj(1, ktora, zakres, buduj, kandydaci=reszta)

    def para_portali(self, ktora, min_odl=20):
        """Dwa końce jednego portalu, MUSZĄ stać daleko od siebie.

        Samo `dodaj(2, ...)` raz wylosowało oba końce obok siebie. Portal
        przenosił wtedy o jedno pole, a AI przeciwnika wpadało w pętlę:
        wchodziło w jeden koniec, wypadało na drugim i tak przez resztę partii.
        Przy 72 × 72 dwadzieścia pól to mniej więcej trzy dni marszu — poniżej
        tego skrót nie jest skrótem.
        """
        a = self.dodaj(1, ktora, (0, 999), lambda p: ('budynek', 'portal'))[0]
        daleko = [
            p
            for p in self.wolne_pola(ktora, (0, 999), 1)
            if max(abs(p[0] - a[0]), abs(p[1] - a[1])) >= min_odl
        ]
        if not daleko:
            raise SystemExit(
                f'[{self.k.ID}] Strefa {ktora} nie ma dwóch pól oddalonych o {min_odl} na parę portali.'
            )
        b = self.dodaj(1, ktora, (0, 999), lambda p: ('budynek', 'portal'), kandydaci=daleko)[0]
        return [a, b]

    def skarb_w_kieszeni(self, ktora, sila, ile_nagrod, co_lezy):
        """Kilka nagród w ślepym zaułku, jeden strażnik w szyjce.

        To jest układ, po którym poznaje się mapę z Heroes 3: walka opłaca się
        za CAŁY zakątek, a nie za jedną skrzynię. Szyjka musi być WOLNA — bierzemy
        pierwszą kieszeń z wolną szyjką, a nie pierwszą z brzegu.
        """
        wybrana = next((k for k in self.kieszenie.get(ktora, []) if k[0] not in self.zajete), None)
        if wybrana is None:
            return []
        self.kieszenie[ktora].remove(wybrana)
        szyjka, pola_kieszeni = wybrana
        wolne_w_kieszeni = [q for q in pola_kieszeni if self.mapa[q[1]][q[0]] in '.,jsb']
        # Najwyżej połowa pól kieszeni: zakątek wypełniony po brzegi jest
        # zakątkiem, do którego nie da się wejść.
        ile = min(ile_nagrod, max(1, len(wolne_w_kieszeni) // 2))
        polozone = []
        for _ in range(ile):
            polozone += self.dodaj(1, ktora, (0, 999), co_lezy, kandydaci=wolne_w_kieszeni)
        if polozone and not self.koliduje_ze_straza(szyjka, ('potwor', sila)):
            self.zajete.append(szyjka)
            self.obiekty.append((szyjka, ('potwor', sila)))
        return polozone

    def strzez(self, pola, sila):
        """Stawia straż PRZY obiekcie, od strony, z której się do niego podchodzi.

        Straż nie staje w SZYJCE (postawiona w korytarzu zamyka wszystko za
        sobą, a nie pilnuje skarbu) i stoi na polu BLIŻSZYM startu — postawiona
        za obiektem nie pilnuje niczego.
        """
        mapa, kroki, zajete = self.mapa, self.kroki, self.zajete
        for x, y in pola:
            kandydaci = [
                (x + dx, y + dy)
                for dy in (-1, 0, 1)
                for dx in (-1, 0, 1)
                if (dx or dy)
                and self.w(x + dx, y + dy)
                and mapa[y + dy][x + dx] in PRZEJEZDNE
                and (x + dx, y + dy) not in zajete
                and not self.ciasne(x + dx, y + dy)
                and kroki.get((x + dx, y + dy), 999) < kroki.get((x, y), 0)
            ]
            if not kandydaci:
                continue
            kandydaci = [q for q in kandydaci if not self.koliduje_ze_straza(q, ('potwor', sila))]
            if not kandydaci:
                continue
            pole = self.rng.choice(kandydaci)
            zajete.append(pole)
            self.obiekty.append((pole, ('potwor', sila)))

    def budowle(self, ile, ktora, pula, zakres=(0, 999)):
        """Budowle odwiedzane — w Heroes 3 to one wypełniają mapę. Powtórzenia
        są w porządku: wiatrak czy ognisko stoi tam po kilka razy."""
        for i in range(ile):
            b = pula[i % len(pula)]
            self.dodaj(1, ktora, zakres, lambda p, b=b: ('budynek', b))

    def rozstaw(self):
        k = self.k
        self.rng = random.Random(k.ZIARNO + 1)
        self.kroki = self.kroki_od(self.mapa, k.PUNKTY['start'])
        # Pola strażnic granicznych są zajęte OD POCZĄTKU — inaczej strażnik
        # kieszeni potrafi stanąć dokładnie w bramie.
        self.zajete = list(k.PUNKTY.values()) + [pole for pole, _, _ in getattr(k, 'STRAZNICE', [])]
        self.obiekty = []
        self.blokada = set()
        # Zamki stawia `src/data/plansza.ts`, nie ten skrypt — ale ich mury
        # (3 × 2 pola nad wejściem) blokują drogę tak samo jak wszystko inne.
        for nazwa, pole in k.PUNKTY.items():
            if nazwa.startswith('zamek'):
                self.blokada.update(self.pola_bryly('zamek', None, pole))
        # Wolny plac wokół zamków. Rysunek zamku jest większy niż jego bryła,
        # więc kopalnia postawiona tuż przy murach wchodzi mu w dach — na
        # ekranie dwie budowle zlewają się w jedną. „Dwie Doliny" tego odstępu
        # nie mają (ich rozstawienie jest zamrożone), nowe plansze tak.
        r = getattr(k, 'ODSTEP_OD_ZAMKOW', 0)
        if r:
            for nazwa, (zx, zy) in k.PUNKTY.items():
                if nazwa.startswith('zamek'):
                    for dy in range(-2 - r, r + 1):
                        for dx in range(-1 - r, r + 2):
                            self.zajete.append((zx + dx, zy + dy))
        # Krawędź pierwszego ekranu. Obiekt stojący na samej ramce widoku
        # startowego jest na zrzucie ucięty w pół — „skrzynia wklejona w ramę"
        # w werdykcie ślepego porównania. Pas przy krawędzi zostaje pusty.
        if getattr(k, 'RAMKA_STARTU', False):
            sx, sy = k.PUNKTY['start']
            for dy in range(-8, 9):
                for dx in range(-9, 10):
                    if abs(dx) >= 6 and abs(dx) <= 8 and -7 <= dy <= 7 or dy in (-6, -5, 6, 7) and abs(dx) <= 8:
                        self.zajete.append((sx + dx, sy + dy))
        self.stan_dostepnych = len(self.dostepnych())
        self.kieszenie = {}
        for szyjka, pola_kieszeni in self.znajdz_kieszenie(k.PUNKTY['start']):
            self.kieszenie.setdefault(k.strefa(*szyjka), []).append((szyjka, pola_kieszeni))
        k.rozstaw(self)

    def odsun_straze(self):
        """Odsuwa straż, która przypadkiem stanęła przy podstawowej kopalni.

        Warunek przy stawianiu jest miękki (inaczej w ciasnej strefie kończą się
        miejsca), więc pojedyncze przypadki poprawiamy tutaj. Potwór nie
        blokuje niczego na stałe — przesunięcie go o dwa pola jest bezpieczne.
        Straże z imieniem (wodzowie celów misji) stoją tam, gdzie je postawiono.
        """
        mapa, obiekty = self.mapa, self.obiekty
        obok = lambda a, b: max(abs(a[0] - b[0]), abs(a[1] - b[1])) <= 1
        zajete = {p for p, _ in obiekty}
        kopalnie = [p for p, co in obiekty if co[0] == 'kopalnia' and co[1] in self.PODSTAWOWE]
        przesuniete = 0
        for i, (pole, co) in enumerate(obiekty):
            if co[0] != 'potwor' or len(co) > 2 or not any(obok(pole, k) for k in kopalnie):
                continue
            nowe = None
            for r in (2, 3, 4):
                kandydaci = [
                    (pole[0] + dx, pole[1] + dy)
                    for dy in range(-r, r + 1)
                    for dx in range(-r, r + 1)
                    if max(abs(dx), abs(dy)) == r
                ]
                kandydaci = [
                    q
                    for q in kandydaci
                    if self.w(*q)
                    and mapa[q[1]][q[0]] in PRZEJEZDNE
                    and q not in zajete
                    and not any(obok(q, k) for k in kopalnie)
                ]
                if kandydaci:
                    nowe = kandydaci[0]
                    break
            if nowe is None:
                continue
            zajete.discard(pole)
            zajete.add(nowe)
            obiekty[i] = (nowe, co)
            przesuniete += 1
        return przesuniete

    def osiagalne_przy_obiektach(self, skad, otwarte_klucze=()):
        """Pola osiągalne, gdy obiekty zatykają drogę.

        Potwory pomijamy: pokonuje się je i idzie dalej. Strażnice graniczne
        pomijamy albo nie — zależnie od tego, które klucze gracz już ma. Dzięki
        temu tą samą funkcją sprawdzamy kolejne akty gry.
        """
        blok = set()
        for p, co in self.obiekty:
            if co[0] == 'potwor':
                continue
            if co[0] == 'straznica':
                if co[1] in otwarte_klucze:
                    continue
                x, y = p
                blok.update({(x - 1, y), (x, y), (x + 1, y)})
                continue
            blok.add(p)
        return self.osiagalne(self.mapa, skad, blok)

    def blisko(self, widziane, cel):
        return any((cel[0] + dx, cel[1] + dy) in widziane for dy in (-1, 0, 1) for dx in (-1, 0, 1))

    # ------------------------------------------------------------------ całość

    def generuj(self):
        k = self.k
        print(f'=== {k.ID} ({k.NAZWA}, {self.BOK} × {self.BOK}) ===')
        self.mapa = self.zbuduj_teren()
        dostepne = self.sprawdz_teren(self.mapa)

        self.rozstaw()
        odsuniete = self.odsun_straze()
        if odsuniete:
            print(f'  straży odsuniętych od podstawowych kopalń: {odsuniete}')

        for pole, klucz, nazwa in getattr(k, 'STRAZNICE', []):
            x, y = pole
            if self.mapa[y][x] not in PRZEJEZDNE:
                raise SystemExit(f'[{k.ID}] {nazwa} stoi na nieprzejezdnym polu {pole}.')
            self.obiekty.append((pole, ('straznica', klucz, nazwa)))

        obiekty = self.obiekty
        pola_obiektow = [p for p, _ in obiekty]
        if len(set(pola_obiektow)) != len(pola_obiektow):
            raise SystemExit(f'[{k.ID}] Dwa obiekty stoją na tym samym polu.')
        for (x, y), _ in obiekty:
            if self.mapa[y][x] not in PRZEJEZDNE:
                raise SystemExit(f'[{k.ID}] Obiekt na nieprzejezdnym polu ({x},{y}).')
        sx, sy = k.PUNKTY['start']
        for (x, y), co in obiekty:
            if co[0] == 'potwor' and odleglosc((x, y), (sx, sy)) <= 2:
                raise SystemExit(f'[{k.ID}] Straż stoi na progu startu ({x},{y}).')

        # Łączność PRZY OBIEKTACH JAKO PRZESZKODACH, przy wszystkich kluczach.
        wszystkie_klucze = tuple({co[1] for _, co in obiekty if co[0] == 'straznica'})
        sasiednie = self.osiagalne_przy_obiektach(k.PUNKTY['start'], wszystkie_klucze)
        for pole, co in obiekty:
            x, y = pole
            if not any((x + dx, y + dy) in sasiednie for dy in (-1, 0, 1) for dx in (-1, 0, 1) if dx or dy):
                raise SystemExit(f'[{k.ID}] Do obiektu {co} na {pole} nie da się podejść — obiekty zatykają drogę.')
        for nazwa, pole in k.PUNKTY.items():
            if nazwa.startswith('zamek') and not self.blisko(sasiednie, pole):
                raise SystemExit(f'[{k.ID}] {nazwa} na {pole} jest odcięty obiektami.')

        print(f'  obiektów: {len(obiekty)}')
        policz = {}
        for (x, y), _ in obiekty:
            s = k.strefa(x, y)
            policz[s] = policz.get(s, 0) + 1
        print('  obiektów w strefach:', policz)
        for nazwa, pole in k.PUNKTY.items():
            if nazwa.startswith('zamek wroga'):
                print(f'  kroków do {nazwa}:', self.kroki.get(pole))

        sprawdzenia = getattr(k, 'sprawdzenia', None)
        if sprawdzenia:
            sprawdzenia(self)

        wiersze = [''.join(w) for w in self.mapa]
        udzial = {z: sum(w.count(z) for w in wiersze) for z in '.,=jsbT#~'}
        print(f'  plansza {self.BOK} × {self.BOK}, pól przejezdnych: {len(dostepne)}')
        print('  udział terenów:', {z: f'{v * 100 // (self.BOK * self.BOK)}%' for z, v in udzial.items()})
        print(f'  gęstość: obiekt co {len(dostepne) / len(obiekty):.1f} pola przejezdne')
        self.zapisz(wiersze)

    def zapisz(self, wiersze):
        k = self.k
        wynik = plik_ts(k.ID)
        naglowek = k.NAGLOWEK.rstrip('\n') + '\n'
        tresc = naglowek + '\nexport const TEREN = [\n'
        tresc += ''.join(f"  '{w}',\n" for w in wiersze) + '];\n\n'
        tresc += 'export const PUNKTY = {\n'
        for nazwa, (x, y) in k.PUNKTY.items():
            tresc += f"  '{nazwa}': {{ x: {x}, y: {y} }},\n"
        tresc += '};\n\n'
        z_artefaktem = any(co[0] == 'artefakt' and co[1] for _, co in self.obiekty)
        tresc += '''/**
 * Rozstawienie obiektów. `strefa` mówi, w którym pasie leży pole —
 * `src/data/plansza.ts` bierze z tego klasę artefaktu i siłę nagrody, bo na tej
 * mapie o wartości znaleziska decyduje pas, a nie odległość od startu.
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
  klucz?: string;
''' + ('  artefakt?: string;\n' if z_artefaktem else '') + '''}> = [
'''
        for (x, y), reszta in self.obiekty:
            rodzaj, co = reszta[0], reszta[1]
            nazwa = reszta[2] if len(reszta) > 2 else None
            pola = [f'x: {x}', f'y: {y}', f"rodzaj: '{rodzaj}'", f"strefa: '{k.strefa(x, y)}'"]
            if rodzaj == 'potwor':
                pola.append(f"sila: '{co}'")
            elif rodzaj in ('straznica', 'namiot'):
                pola.append(f"klucz: '{co}'")
            elif rodzaj == 'jasnowidz':
                pass
            elif rodzaj == 'budynek':
                pola.append(f"budynek: '{co}'")
            elif rodzaj == 'artefakt':
                if co:
                    pola.append(f"artefakt: '{co}'")
            elif co:
                pola.append(f"surowiec: '{co}'")
            if nazwa:
                pola.append(f"nazwa: '{nazwa}'")
            tresc += '  { ' + ', '.join(pola) + ' },\n'
        tresc += '];\n'
        ustawienia = getattr(k, 'USTAWIENIA', None)
        if ustawienia:
            tresc += '\n/** Ustawienia misji na tej planszy — patrz `UstawieniaPlanszy` w `src/data/mapy.ts`. */\n'
            tresc += 'export const USTAWIENIA = ' + json.dumps(ustawienia, ensure_ascii=False, indent=2) + ';\n'
        wynik.write_text(tresc, encoding='utf-8')
        print(f'  zapisano {wynik.relative_to(KORZEN)}')


def generuj(mapa_id):
    Generator(konfiguracja(mapa_id)).generuj()


if __name__ == '__main__':
    for mapa_id in sys.argv[1:] or MAPY:
        generuj(mapa_id)
