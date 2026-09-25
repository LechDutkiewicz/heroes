"""„Bagna" — plansza 54 × 54, misja 3: „Bagienny szlak".

Opis misji: wódz srebrnych płaszczy ukrył na bagnach Księżycowy Kamień; trzeba
go odnaleźć w ciągu ośmiu tygodni. Plansza ma więc CEL, a nie tylko wroga:

    ┌──────────────────────────────┬──────────────┐
    │  kraina wroga: warownia      │ ≈≈≈≈≈≈≈≈≈≈≈≈ │  WYSPA KSIĘŻYCA
    │  na grobli, silne straże     │ ≈  Kamień  ≈ │  pierścień wody,
    │                              │ ≈≈≈≈ │≈≈≈≈≈ │  jedna grobla, wódz
    ├──────────────────────────────┴──────┼───────┤
    │  TRZĘSAWISKO: bagno po kolana, groble,      │  środek gry — kopalnie
    │  stawy, wysepki suchej łąki                  │  na wysepkach, drogi
    │≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈┐                      │  groblami
    │  DOLINA GRACZA       ≈   wschodnie wyspy     │
    │  (sucha łąka, las)   ≈                       │
    │  ZAMEK               ≈                       │
    └──────────────────────┴──────────────────────┘

Trzy rzeczy, które robią z tego bagna, a nie łąkę w innym kolorze:

1. **Bagno kosztuje 175 punktów ruchu, grobla 70.** Na tej planszy droga to
   nie ozdoba, tylko cała strategia: przez trzęsawisko na przełaj idzie się
   dwa i pół raza wolniej. Pytanie mapy brzmi „groblą naokoło czy bagnem
   wprost?" — i przy terminie ośmiu tygodni ma ono wagę.
2. **Dolinę gracza zamyka Czarna Struga** — kanał z dwiema przeprawami
   (grobla na północy, bród na wschodzie), obie pod strażą. Pierwszy tydzień
   jest bezpieczny, jak na każdej dobrej mapie z Heroes.
3. **Kamień leży na wyspie w pierścieniu wody, do której prowadzi JEDNA
   grobla** — a na grobli stoi wódz. Cel widać z daleka (wyspa jest
   w rogu, droga do niej prowadzi), ale trzeba na niego zapracować armią.
"""

import math
import random

ID = 'bagna'
NAZWA = 'Bagna'

SKALA = 3
BOK = 54
ZIARNO = 20260925

# Szkic 18 × 18, każdy znak to kwadrat 3 × 3 pola. Czarnej Strugi i pierścienia
# wody wokół wyspy w szkicu NIE MA — oba maluje `popraw_teren`, bo są krzywe,
# a szkic zna tylko kwadraty. Tutaj jest cała reszta: trzęsawisko ze stawami
# i kępami lasu, wysepki suchej łąki, sucha dolina gracza.
SZKIC = [
    'TTbbbTT##TTbbbbbbT',
    'Tbbb.Tbb.bTbbb....',
    'Tb~bb..b.bbbbb....',
    'Tbb~bTb..Tbb~b..T.',
    'Tbbbbbbb.bb~bb...T',
    '#Tbb~~bbbbTbbbb~bT',
    'Tb.bb~bb.T.bbb~bbT',
    'Tbbbbbb~bbbbb~bb.T',
    'TTbb~bb.bbbbbb~bbT',
    'Tbbb~~bTTbb.bbbb~T',
    'T.bbbbbbbbb~Tbb.bT',
    'bb.bbbbbbbbbb~~bbT',
    'Tb.Tb.Tbb~bbbbbbbT',
    'T.#b.Tbbb~.Tbb~bbT',
    'Tbb.T.bbbb.bbbb~~T',
    'T.bb.bT~bb.T~bb~bT',
    'Tb.Tbbbbb~.bbb~b.T',
    'TTTT#TTbTTTTbTTTTT',
]


def struga_y(x):
    """Środek poziomego odcinka Czarnej Strugi w kolumnie `x`. Zmiana najwyżej
    o pole na krok — inaczej brzegi stykają się po skosie i kanał jest dziurawy."""
    return 33 + round(1.3 * math.sin(x / 3.5))


def struga_x(y):
    """Środek pionowego odcinka Czarnej Strugi w wierszu `y`."""
    return 20 + round(1.3 * math.sin(y / 4.0))


WYSPA = (46, 8)
#: Pierścień wody wokół wyspy: od tego promienia do `PIERSCIEN_ZEWN` jest woda.
PIERSCIEN_WEWN = 5.2
PIERSCIEN_ZEWN = 8.2

#: Przeprawy. `(x0, y0, x1, y1)`.
GROBLA_PN = (11, struga_y(12) - 2, 12, struga_y(12) + 2)
BROD_WSCH = (struga_x(44) - 2, 44, struga_x(44) + 2, 45)
GROBLA_WYSPY = (45, 13, 46, 17)

ZAPORY = {
    'Czarna Struga': {
        'przejscia': [GROBLA_PN, BROD_WSCH],
        'odcina': ['zamek wroga', 'wyspa', 'trzesawisko'],
    },
    'pierścień wyspy': {
        'przejscia': [GROBLA_WYSPY],
        'odcina': ['wyspa'],
    },
}

PUNKTY = {
    'start': (13, 46),
    'zamek gracza': (10, 48),
    'rozstaje doliny': (12, 40),
    'grobla poludnie': (12, 38),
    'grobla polnoc': (12, 28),
    'trzesawisko': (27, 24),
    'brod zachod': (14, 44),
    'brod wschod': (27, 44),
    'wschodnie wyspy': (38, 37),
    'podnoze wyspy': (46, 21),
    'zamek wroga': (22, 7),
    'wyspa': WYSPA,
}

#: Groble. Główna prowadzi z doliny przez północną przeprawę, środkiem
#: trzęsawiska, pod warownię wroga. Druga — przez wschodni bród i wschodnie
#: wyspy — kończy się na wyspie Kamienia: droga pokazuje cel.
SZLAKI = [
    ['zamek gracza', 'start', 'rozstaje doliny', 'grobla poludnie', 'grobla polnoc', 'trzesawisko', 'zamek wroga'],
    ['rozstaje doliny', 'brod zachod', 'brod wschod', 'wschodnie wyspy', 'podnoze wyspy', 'wyspa'],
    ['trzesawisko', 'wschodnie wyspy'],
]

#: Grobla ma iść przez bagno WPROST — na tej planszy to jest jej sens. Przy
#: domyślnym koszcie (bagno droższe od lasu) droga kluczyłaby między stawami
#: i wyglądała jak ścieżka szukająca suchej nogi, a nie jak grobla.
KOSZT_DROGI = {'b': 1.5}

#: Obiekty stoją też na bagnie — inaczej trzęsawisko byłoby pustą plamą.
POD_OBIEKTY = '.,b'

ZASYP_ODCIETE = True


def popraw_teren(g, mapa):
    rng = random.Random(ZIARNO + 7)
    # Czarna Struga: poziomy odcinek od zachodniej krawędzi do zakrętu,
    # pionowy od zakrętu do południowej krawędzi.
    zakret = struga_x(struga_y(20))
    for x in range(0, zakret + 2):
        cy = struga_y(x)
        for y in range(cy - 1, cy + 2):
            mapa[y][x] = '~'
        if rng.random() < 0.3:
            mapa[cy + (2 if rng.random() < 0.5 else -2)][x] = '~'
    for y in range(struga_y(zakret) - 1, BOK):
        cx = struga_x(y)
        for x in range(cx - 1, cx + 2):
            mapa[y][x] = '~'
        if rng.random() < 0.3:
            mapa[y][cx + (2 if rng.random() < 0.5 else -2)] = '~'
    # Pierścień wody wokół wyspy — z lekkim szumem promienia, żeby brzeg nie
    # był cyrklem. Szum jest mniejszy niż grubość pierścienia (3 pola), więc
    # nie ma prawa go przerwać; sprawdza to i tak silnik (`ZAPORY`).
    for y in range(BOK):
        for x in range(BOK):
            d = math.hypot(x - WYSPA[0], y - WYSPA[1])
            szum = 0.45 * math.sin(x * 1.7 + y * 0.9) + 0.35 * math.cos(y * 1.3 - x * 0.5)
            if PIERSCIEN_WEWN + szum * 0.5 < d <= PIERSCIEN_ZEWN + szum:
                mapa[y][x] = '~'
            elif d <= PIERSCIEN_WEWN + szum * 0.5:
                # Wyspa jest SUCHA: łąka i kępy lasu, bez bagna — wraca się
                # z niej z Kamieniem, a nie brnie dalej.
                mapa[y][x] = 'T' if (x * 7 + y * 13) % 11 == 0 and d > 2.5 else '.'
    # Stojąca woda w trzęsawisku. Runda 2 ślepego porównania: „bagno to ciemna
    # ziemia z rozmytym cieniem — ani kałuży, ani oczka wody, czyta się jak
    # ciemny las". Rozsiewamy więc prawdziwe oczka WODY (pola `~`, z shaderem
    # i odbiciami) po bagnie: od jednego do czterech pól, z dala od punktów
    # orientacyjnych, żeby nie zatkać grobli. Oczko, które odetnie kawałek
    # lądu, zasypie `ZASYP_ODCIETE`, a drogi i tak omijają wodę.
    punkty = list(PUNKTY.values())
    for y in range(2, BOK - 2):
        for x in range(2, BOK - 2):
            if mapa[y][x] != 'b' or rng.random() > 0.025:
                continue
            if any(max(abs(x - px), abs(y - py)) <= 3 for px, py in punkty):
                continue
            for dx, dy in [(0, 0)] + rng.sample([(1, 0), (0, 1), (1, 1), (-1, 0)], rng.randint(0, 3)):
                if mapa[y + dy][x + dx] == 'b':
                    mapa[y + dy][x + dx] = '~'
    # Przeprawy: grobla przez Strugę, bród, grobla na wyspę.
    for (x0, y0, x1, y1), teren in ((GROBLA_PN, '.'), (BROD_WSCH, ','), (GROBLA_WYSPY, ',')):
        for y in range(y0, y1 + 1):
            for x in range(x0, x1 + 1):
                mapa[y][x] = teren
    # Wyloty przepraw zawsze przejezdne na dwa pola w głąb.
    for x0, y0, x1, y1 in (GROBLA_PN, GROBLA_WYSPY):
        for x in range(x0, x1 + 1):
            for y in (y0 - 2, y0 - 1, y1 + 1, y1 + 2):
                if mapa[y][x] not in '.,=b':
                    mapa[y][x] = 'b'
    x0, y0, x1, y1 = BROD_WSCH
    for y in range(y0, y1 + 1):
        for x in (x0 - 2, x0 - 1, x1 + 1, x1 + 2):
            if mapa[y][x] not in '.,=b':
                mapa[y][x] = '.'


def w_dolinie(x, y):
    return y > struga_y(min(x, BOK - 1)) + 1 and x < struga_x(y) - 1


def strefa(x, y):
    """Dolina za Strugą, wyspa i północ to kraina wroga, reszta — trzęsawisko."""
    if w_dolinie(x, y):
        return 'dom'
    if math.hypot(x - WYSPA[0], y - WYSPA[1]) <= PIERSCIEN_ZEWN + 1 or y < 13:
        return 'wroga'
    return 'pogranicze'


def rozstaw(g):
    rng = g.rng

    # --- CEL MISJI -----------------------------------------------------------
    # Najpierw, bo o tym jest ta mapa: Kamień w sercu wyspy, wódz na jedynej
    # grobli. Wódz stoi NA grobli — potwór blokuje pole i osiem wokół, więc
    # przy grobli szerokiej na dwa pola zamyka ją w całości.
    g.postaw((WYSPA[0], WYSPA[1] - 1), ('artefakt', 'ksiezycowy-kamien'))
    g.postaw((45, 15), ('potwor', 'wodz', 'Wódz Srebrnych Płaszczy'))
    # Wyspa płaci nie tylko Kamieniem: skrzynie i relikt, jak skarbiec na
    # krańcu Dwóch Dolin.
    wyspa = [
        (x, y)
        for y in range(BOK)
        for x in range(BOK)
        if 1.5 < math.hypot(x - WYSPA[0], y - WYSPA[1]) <= PIERSCIEN_WEWN - 0.8 and g.mapa[y][x] == '.'
    ]
    g.dodaj(2, 'wroga', (0, 999), lambda p: ('skrzynia', None), kandydaci=wyspa)
    g.dodaj(1, 'wroga', (0, 999), lambda p: ('artefakt', None), kandydaci=wyspa)
    g.dodaj(1, 'wroga', (0, 999), lambda p: ('surowiec', 'kamien'), kandydaci=wyspa)

    # --- DOLINA GRACZA -------------------------------------------------------
    # Pierwszy ekran: dwie kopalnie, budowle, stosy i skarb pod strażą w widoku
    # z dnia pierwszego (runda 1 ślepego porównania: „mało rzeczy do zrobienia").
    kadr = g.kadr_startu()
    sx, sy = PUNKTY['start']
    dalej = [p for p in kadr if max(abs(p[0] - sx), abs(p[1] - sy)) >= 4]
    g.dodaj_najpierw('dom', lambda p: ('kopalnia', 'jagoda'), kadr, None, (3, 14))
    g.dodaj_najpierw('dom', lambda p: ('kopalnia', 'odlamek'), kadr, None, (3, 14))
    g.dodaj_najpierw('dom', lambda p: ('budynek', 'drzewo-wiedzy'), kadr, None, (2, 16))
    g.dodaj_najpierw('dom', lambda p: ('budynek', 'zrodlo'), kadr, None, (2, 16))
    for _ in range(3):
        g.dodaj_najpierw('dom', lambda p: ('surowiec', rng.choice(['jagoda', 'pokeball', 'odlamek'])), kadr, None, (2, 12))
    g.dodaj_najpierw('dom', lambda p: ('skrzynia', None), kadr, None, (2, 12))
    g.strzez(g.dodaj_najpierw('dom', lambda p: ('artefakt', None), dalej, None, (5, 14)), 'slaby')
    g.dodaj(2, 'dom', (6, 14), lambda p: ('surowiec', rng.choice(['jagoda', 'pokeball', 'odlamek'])))
    g.dodaj(1, 'dom', (6, 14), lambda p: ('skrzynia', None))
    g.strzez(g.dodaj(1, 'dom', (8, 30), lambda p: ('kopalnia', 'pokeball')), 'slaby')
    g.dodaj(1, 'dom', (8, 30), lambda p: ('kopalnia', 'jagoda'))
    g.dodaj(4, 'dom', (8, 30), lambda p: ('surowiec', rng.choice(['jagoda', 'odlamek', 'pokeball'])))
    g.dodaj(2, 'dom', (8, 30), lambda p: ('skrzynia', None))
    g.strzez(g.dodaj(1, 'dom', (10, 30), lambda p: ('artefakt', None)), 'slaby')
    g.dodaj(2, 'dom', (7, 30), lambda p: ('potwor', 'slaby'))
    g.skarb_w_kieszeni('dom', 'slaby', 3, lambda p: rng.choice([('skrzynia', None), ('surowiec', 'odlamek')]))
    g.budowle(9, 'dom', ['wiatrak', 'oboz-treningowy', 'ognisko', 'drzewo-wiedzy', 'zrodlo', 'ranczo', 'gniazdo', 'chatka', 'woz'], (4, 40))

    # Straże przepraw przez Strugę. Obie średnie: pierwszy tydzień w dolinie
    # jest bezpieczny, a wyjście z niej to pierwsza poważna bitwa.
    g.postaw((GROBLA_PN[0], struga_y(12)), ('potwor', 'sredni'))
    g.postaw((struga_x(44), 44), ('potwor', 'sredni'))

    # --- TRZĘSAWISKO -----------------------------------------------------------
    # Najgęstszy kawałek. Kopalnie drogie (kamień, pokeballe) pod strażą; tanie
    # otworem — to gospodarka, nie nagroda.
    g.dodaj(24, 'pogranicze', (0, 999), lambda p: ('surowiec', rng.choice(['jagoda', 'odlamek', 'kamien', 'pokeball'])))
    kopalnie = ['kamien', 'odlamek', 'pokeball', 'jagoda', 'kamien', 'pokeball', 'odlamek']
    polozone = []
    for co in kopalnie:
        polozone += g.dodaj(1, 'pogranicze', (0, 999), lambda p, co=co: ('kopalnia', co))
    g.strzez([p for p, co in zip(polozone, kopalnie) if co in ('kamien', 'pokeball')], 'sredni')
    g.dodaj(12, 'pogranicze', (0, 999), lambda p: ('skrzynia', None))
    g.strzez(g.dodaj(4, 'pogranicze', (0, 999), lambda p: ('artefakt', None)), 'sredni')
    g.dodaj(3, 'pogranicze', (0, 999), lambda p: ('potwor', 'sredni'))
    g.skarb_w_kieszeni('pogranicze', 'sredni', 4, lambda p: rng.choice([('skrzynia', None), ('surowiec', 'kamien'), ('artefakt', None)]))
    g.skarb_w_kieszeni('pogranicze', 'silny', 4, lambda p: rng.choice([('artefakt', None), ('skrzynia', None)]))
    g.skarb_w_kieszeni('pogranicze', 'sredni', 3, lambda p: rng.choice([('skrzynia', None), ('surowiec', 'pokeball')]))
    g.budowle(24, 'pogranicze', [
        'wieza-obserwacyjna', 'ranczo', 'gniazdo', 'arena', 'wiatrak', 'zrodlo',
        'chatka', 'woz', 'drzewo-wiedzy', 'kamienna-wieza', 'ognisko', 'oboz-treningowy',
    ])
    # Portal: jeden koniec w trzęsawisku, drugi pod wyspą — skrót do celu dla
    # tego, kto go znajdzie, ale za strażą pogranicza, nie z doliny.
    g.para_portali('pogranicze', min_odl=18)
    g.dodaj(1, 'pogranicze', (0, 999), lambda p: ('jasnowidz', None))

    # --- KRAINA WROGA --------------------------------------------------------
    g.dodaj(8, 'wroga', (0, 999), lambda p: ('surowiec', rng.choice(['kamien', 'odlamek', 'pokeball'])))
    kopalnie = ['kamien', 'pokeball', 'odlamek']
    polozone = []
    for co in kopalnie:
        polozone += g.dodaj(1, 'wroga', (0, 999), lambda p, co=co: ('kopalnia', co))
    g.strzez([p for p, co in zip(polozone, kopalnie) if co != 'odlamek'], 'silny')
    g.strzez(g.dodaj(4, 'wroga', (0, 999), lambda p: ('skrzynia', None)), 'silny')
    g.dodaj(2, 'wroga', (0, 999), lambda p: ('potwor', 'silny'))
    g.budowle(6, 'wroga', ['osrodek-ewolucji', 'arena', 'kamienna-wieza', 'drzewo-wiedzy', 'gniazdo', 'zrodlo'])


NAGLOWEK = '''// PLIK GENEROWANY — nie poprawiaj ręcznie.
// Źródło: tools/mapy/bagna.py (szkic i rozstawienie), silnik: tools/generuj_mape.py.
//
// Plansza 54 × 54 („Bagna”) — misja 3, „Bagienny szlak”. Dolina gracza za
// Czarną Strugą na południowym zachodzie, trzęsawisko z groblami pośrodku,
// warownia wroga na północy i Wyspa Księżyca w pierścieniu wody na
// północnym wschodzie — tam, pod strażą wodza, leży Księżycowy Kamień.
// Znaki: . trawa, = ścieżka, , piasek, j ziemia jałowa, s śnieg, b bagno,
// T las, # skały, ~ woda.
'''

#: Przeciwnik gra pełną turę — to on jest powodem, żeby się spieszyć, obok
#: terminu. Warownia jak Grota na Dwóch Dolinach.
USTAWIENIA = {
    'wrog': 'aktywny',
    'nazwyZamkowWroga': ['Warownia na Grobli'],
    # Zestaw sprite'ów klimatu dla sceny (`public/mapa/bagno/`) — patrz STAN.md.
    'zestaw': 'bagno',
    # Wyspa Księżyca odsłonięta od pierwszego dnia: gracz ma wiedzieć, DOKĄD
    # jedzie — zagadką jest droga i wódz, a nie szukanie igły w trzęsawisku.
    'odkryte': [{'x': WYSPA[0], 'y': WYSPA[1], 'promien': 7}],
}

#: Barwy terenu tej planszy (`tools/render_mapa.py`, `zabarw`). Woda na bagnach
#: jest mętna i zielonkawobrązowa — turkusowy staw z Polany wyglądałby tu jak
#: basen. Sucha łąka jest przygaszona i oliwkowa, a las ciemniejszy: pierwsze
#: spojrzenie na ekran ma mówić „bagno", zanim dziecko zobaczy choć jedno pole
#: trzęsawiska.
BARWY_TERENU = {
    'woda': {'nasycenie': 0.5, 'barwa': (85, 125, 90), 'moc': 0.6, 'jasnosc': 0.72},
    'trawa': {'nasycenie': 0.62, 'barwa': (140, 140, 80), 'moc': 0.5, 'jasnosc': 0.8},
    'las': {'nasycenie': 0.7, 'barwa': (90, 110, 75), 'moc': 0.4, 'jasnosc': 0.82},
    'sciezka': {'nasycenie': 0.75, 'barwa': (175, 150, 110), 'moc': 0.3, 'jasnosc': 1.08},
}

#: Po rundzie 1 ślepego porównania („bagno to brązowa plama w kolorze drogi"):
#: oczka ciemnej wody, trzcina i grążele na bagnie, obwódka i jaśniejsza
#: jezdnia na grobli (`tools/teren_efekty.py`).
EFEKTY = ['trzesawisko', 'obwodka_drogi', 'relief', 'bez_placow']
#: Runda 3 („ciemna ziemia z trzciną, wygląda jak ciemny las"): oczka stojącej
#: wody w barwie jezior tej planszy, mokre błoto wokół, jaśniejszy grunt.
TRZESAWISKO = {'woda': (60, 116, 98)}
#: Błoto z dostawy (`tools/PROMPTY-PLANSZE.md`), do tego czasu zwykłe bagno.
TEKSTURY = {'bagno': ['bloto', 'bagno']}

#: Runda 2 („krainy rozmywają się w jedną"): twardsze brzegi terenów.
WTAPIANIE = {'bagno': 0.22, 'las': 0.3, 'skaly': 0.28, 'woda': 0.22}

#: Plac wokół zamków wolny od innych budowli (patrz silnik).
ODSTEP_OD_ZAMKOW = 2

#: Las w zwarte masy z polanami, pusty pas przy ramie pierwszego ekranu.
SKUP_LAS = True
RAMKA_STARTU = True

#: Budowle pierwszego ekranu co najmniej trzy pola od siebie (silnik).
ODSTEP_KADRU = 3

#: Naklejki terenu (`public/mapa/tlo/`, prompty w `tools/PROMPTY-PLANSZE.md`):
#: `(pliki, znaki terenu, gęstość)`. Do czasu dostawy grafik plików nie ma
#: i render po prostu ich nie rysuje.
NAKLEJKI = [
    (['trzcina-1', 'trzcina-2', 'trzcina-3'], 'b', 0.22),
    (['grazel-1', 'grazel-2'], '~', 0.10),
    (['martwe-drzewo-1', 'martwe-drzewo-2'], 'b', 0.04),
    (['pniak-bagienny'], 'b', 0.03),
]
