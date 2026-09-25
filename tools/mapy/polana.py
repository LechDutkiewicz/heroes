"""„Polana" — plansza 36 × 36 (rozmiar S z Heroes), misja 1: samouczek.

Po co ta mapa
-------------
Pierwsza misja kampanii uczy pętli, na której stoi cała gra: zbierz, zajmij
kopalnię, rozbuduj zamek, pobij straż, zdobądź zamek wroga. Mapa ma więc JEDNO
pytanie naraz i odpowiedź zawsze w zasięgu kilku dni:

    ┌─────────────────┬──┬──────────────────┐
    │ północna łąka   │  │  STARY FORT      │  forty wroga na wschodnim skraju
    │ (jezioro, las)  │ r│  (kopalnia złota,│  — misja „odbij fort"
    │                 │ z│   skrzynie)      │
    │   dolina domu   │ e│                  │
    │  (kopalnie,     │ k│  wschodnia łąka  │
    │   budowle)      │ a│  (kamień, wieża) │
    │ ZAMEK GRACZA    │  │                  │
    └─────────────────┴──┴──────────────────┘

Rzeka przecina mapę z północy na południe i ma DWA brody: południowy, na
drodze (pierwsza prawdziwa bitwa — słaba straż), i północny, piaszczysty, bez
drogi (straż średnia, skrót pod sam fort). To jest układ „Dwóch Dolin"
w miniaturze: jedna przeszkoda, dwa przejścia, drugie jest alternatywą, a nie
skrótem z domu.

Czego tu celowo NIE ma: strażnic z kluczem, portali, chaty jasnowidza. Każda
z tych rzeczy to osobna zasada do nauczenia, a pierwsza misja ma nauczyć jednej
pętli, nie siedmiu. Straże są łagodne, drogi wyraźne, a kopalnie podstawowe
stoją przy zamku bez straży.
"""

import math
import random

ID = 'polana'
NAZWA = 'Polana'

SKALA = 3
BOK = 36
ZIARNO = 20260924

# Szkic 12 × 12, każdy znak to kwadrat 3 × 3 pola. Rzeki w szkicu NIE MA —
# maluje ją `popraw_teren`, bo meandruje, a szkic zna tylko kwadraty. Tu jest
# to, co leży dookoła: łąka z kępami lasu, dwa skaliste wzgórza, jezioro na
# północnym zachodzie i las okalający mapę jak w Heroes 2, gdzie krawędź
# planszy prawie zawsze jest lasem albo górą, a nie urwaną łąką.
SZKIC = [
    'TTT#TT.TT#TT',
    'T~~.,.T..#..',
    'T~~.T..,..T#',
    'T..#T..T....',
    '#T....,..T.T',
    'T..T#....#..',
    'T.,.....T..T',
    'TT.T.#..T.,T',
    'T.##.T.....T',
    'T.T.,...T#.T',
    'T..#....TT.T',
    'TTTTT#TTTT#T',
]


#: Runda 4: na południu rzeka skręca SKOSEM przez pierwszy ekran — z góry
#: kadru, tuż nad bohaterem, w prawy dolny róg. Prosta pionowa wstęga po
#: prawej stronie kadru zostawiała za wodą trzy kolumny klifów bez niczego
#: („martwe, namalowane tło"). Po skosie kadr dzieli się na dwa trójkąty:
#: dolina domu z zamkiem na dole z lewej i drugi brzeg z mostem, drogą,
#: kopalnią w zboczu i strażnicą u góry z prawej.
KORYTO_POLUDNIE = {
    12: 20, 13: 19, 14: 18, 15: 17, 16: 16, 17: 15, 18: 14, 19: 14,
    20: 13, 21: 13, 22: 13, 23: 14, 24: 15, 25: 15, 26: 15, 27: 16,
    28: 16, 29: 16, 30: 16, 31: 17, 32: 17, 33: 18, 34: 18, 35: 18,
}


def rzeka_x(y):
    """Środek koryta w wierszu `y`. Zmienia się najwyżej o pole na wiersz —
    przy większym skoku dwa sąsiednie brzegi stykają się po skosie i rzekę
    da się przejść bokiem (ruch jest ośmiokierunkowy)."""
    if y in KORYTO_POLUDNIE:
        return KORYTO_POLUDNIE[y]
    return 19 + round(2.2 * math.sin((y + 3) / 6.0))


#: Od którego wiersza koryto jest wąskie (pierwszy ekran).
WASKA_OD = 20

#: Pasma gór malowane na sztywno: (x0, y0, x1, y1). Szerokości to
#: wielokrotności trzech: scena kładzie na skałach kępy 3 × 2 i pole, na
#: którym kępa się nie mieści, dostaje pojedynczy głaz („garść drobiazgów").
#: Zachodnie pasmo zostawia przełęcz między sobą a rzeką (droga na północną
#: łąkę), wschodnie stoją na drugim brzegu: jedno z kopalnią w zboczu,
#: drugie w prawym dolnym rogu kadru.
PASMA = [
    (0, 23, 8, 24),
    (0, 25, 5, 26),
    (18, 28, 20, 29),
    (19, 34, 21, 35),
]

#: Most (runda 4). Pola pod nim są w grze DROGĄ, a render maluje pod nimi
#: nieprzerwaną wodę i kładzie na niej rysunek mostu (`MOSTY` niżej). Piaszczysty
#: bród w tym miejscu czytał się jak łacha, na której rzeka się urywa.
MOST = (14, 25, 15, 25)
BROD_POLNOCNY = (rzeka_x(7) - 2, 7, rzeka_x(7) + 2, 8)

ZAPORY = {
    'rzeka': {
        'przejscia': [MOST, BROD_POLNOCNY],
        # Za rzeką ma być wszystko, po co się tu przyszło: fort i jego łąka.
        'odcina': ['zamek wroga', 'wschodnia laka'],
    },
}

PUNKTY = {
    'start': (13, 28),
    'zamek gracza': (9, 31),
    # Punkty przy wodzie stoją co najmniej dwa pola od koryta: silnik
    # odsłania wokół każdego kwadrat 3 × 3 i przy brzegu wyciąłby dziurę
    # w rzece obok mostu.
    'polnocna laka': (9, 10),
    'brod zachod': (12, 26),
    'brod wschod': (17, 25),
    'wschodnia laka': (27, 23),
    'zamek wroga': (30, 13),
    'poludniowy wschod': (29, 31),
}

#: Drogi. Główna prowadzi z zamku przez południowy bród pod sam fort — gracz,
#: który nie wie jeszcze nic, ma iść po drodze i dojść tam, gdzie trzeba.
SZLAKI = [
    ['zamek gracza', 'start', 'brod zachod', 'brod wschod', 'wschodnia laka', 'zamek wroga'],
    ['brod zachod', 'polnocna laka'],
    ['wschodnia laka', 'poludniowy wschod'],
]

#: Obiekty mogą stać na trawie i piasku (jak na Dwóch Dolinach).
POD_OBIEKTY = '.,'


def popraw_teren(g, mapa):
    """Maluje rzekę z mostem i brodem.

    Koryto ma trzy pola szerokości, a brzegi są poszarpane (tu i ówdzie
    czwarte pole wody) — prosta wstęga szeroka na trzy wyglądałaby jak kanał.
    """
    rng = random.Random(ZIARNO + 7)
    for y in range(BOK):
        cx = rzeka_x(y)
        if y >= WASKA_OD:
            # Runda 3: na południu, w pierwszym ekranie, koryto ma DWA pola.
            # Trzy pola z poszarpanym brzegiem zajmowały trzecią część kadru
            # i nie było widać drugiego brzegu — rzeka czytała się jak morze.
            for x in (cx - 1, cx):
                mapa[y][x] = '~'
            poszarp = rng.random() < 0.25
            strona = 1 if rng.random() < 0.5 else -2
            # Runda 4: w kadrze nad mostem i pod nim brzeg zostaje równy —
            # czwarte pole wody przy przyczółku zwężało dojście do mostu.
            if poszarp and not 22 <= y <= 30:
                mapa[y][cx + strona] = '~'
            continue
        for x in range(cx - 1, cx + 2):
            mapa[y][x] = '~'
        if rng.random() < 0.35:
            mapa[y][cx + (2 if rng.random() < 0.5 else -2)] = '~'
    # Pasma gór (runda 3: „bez pasma gór w kadrze"). Zwarte bloki skał, żeby
    # scena położyła na nich KĘPY 3 × 2 (trawiaste masywy z zestawu `polana`),
    # a nie rozsypała pojedyncze głazy.
    for x0, y0, x1, y1 in PASMA:
        for y in range(y0, y1 + 1):
            for x in range(x0, x1 + 1):
                mapa[y][x] = '#'
    # Pierwszy ekran (kolumny 6–21, wiersze 22–35) bez piasku i bez lasu na
    # łące: piaszczyste łaty czytały się jak „miękkie place ziemi" pod
    # obiektami (runda 2), a drugi brzeg ma być łąką, na której coś stoi,
    # nie ścianą drzew (runda 3). Las zostaje przy dolnej krawędzi mapy.
    for y in range(22, BOK):
        for x in range(6, 22):
            if mapa[y][x] == ',':
                mapa[y][x] = '.'
            if mapa[y][x] == 'T' and y <= 31 and (x >= 7 or x > rzeka_x(y)):
                mapa[y][x] = '.'
    # Pojedyncze pola skał (z rozmycia szkicu) scena rysuje jako głaz
    # na łące — „garść drobiazgów". Góra ma być pasmem albo jej nie ma.
    for y in range(BOK):
        for x in range(BOK):
            if mapa[y][x] != '#':
                continue
            skal = sum(
                1
                for dy in (-1, 0, 1)
                for dx in (-1, 0, 1)
                if (dx or dy) and 0 <= x + dx < BOK and 0 <= y + dy < BOK and mapa[y + dy][x + dx] == '#'
            )
            w_pasmie = any(x0 <= x <= x1 and y0 <= y <= y1 for x0, y0, x1, y1 in PASMA)
            if skal < 2 or (not w_pasmie and 19 <= y <= 35 and x <= 22):
                # …a w pierwszym ekranie nie ma żadnych luźnych skał.
                mapa[y][x] = '.'
    # Most: pola przeprawy przejezdne (droga wytyczy się po nich sama),
    # przyczółki po obu stronach wolne na dwa pola w głąb.
    x0, y0, x1, y1 = MOST
    for x in range(x0, x1 + 1):
        mapa[y0][x] = ','
    for x in (x0 - 2, x0 - 1, x1 + 1, x1 + 2):
        if mapa[y0][x] not in '.,=':
            mapa[y0][x] = '.'
    x0, y0, x1, y1 = BROD_POLNOCNY
    for y in range(y0, y1 + 1):
        for x in range(x0, x1 + 1):
            if mapa[y][x] not in '.,=':
                mapa[y][x] = ','
    # Brzegi brodu zawsze są przejezdne na dwa pola w głąb.
    for y in range(y0, y1 + 1):
        for x in (x0 - 2, x0 - 1, x1 + 1, x1 + 2):
            if mapa[y][x] not in '.,=':
                mapa[y][x] = '.'


FORT = PUNKTY['zamek wroga']


def strefa(x, y):
    """Za rzeką zaczyna się „pogranicze", a okolica fortu to kraina wroga."""
    if x < rzeka_x(y):
        return 'dom'
    if max(abs(x - FORT[0]), abs(y - FORT[1])) <= 8:
        return 'wroga'
    return 'pogranicze'


def pod_gora(g, p):
    """Czy pole leży pod rysunkiem góry. Kępa skał 3 × 2 ma rysunek o pole
    szerszy z każdej strony i sięgający dwa i pół pola nad swoje skały —
    stos czy skrzynia w tym pasie leżały na zboczu jak doklejone (runda 4)."""
    x, y = p
    return any(
        g.mapa[y + dy][x + dx] == '#'
        for dy in (0, 1, 2)
        for dx in (-1, 0, 1)
        if (dx or dy) and 0 <= y + dy < BOK and 0 <= x + dx < BOK
    )


def strzez_pewnie(g, pola, sila):
    """`g.strzez`, a gdy silnik nie znalazł miejsca od strony gracza — straż
    na dowolnym wolnym, nieciasnym polu obok. Skarb „pod strażą" bez straży
    to w pierwszym ekranie zwykła skrzynia, a potworów było w kadrze za mało
    (w Heroes 2 widać ich zwykle trzy, cztery)."""
    przed = len(g.obiekty)
    g.strzez(pola, sila)
    if len(g.obiekty) > przed:
        return
    zajete = set(g.zajete) | {q for q, _ in g.obiekty} | g.blokada
    for x, y in pola:
        obok = sorted(
            (
                (x + dx, y + dy)
                for dy in (-1, 0, 1)
                for dx in (-1, 0, 1)
                if (dx or dy)
            ),
            key=lambda q: g.kroki.get(q, 999),
        )
        for q in obok:
            if (
                g.w(*q)
                and g.mapa[q[1]][q[0]] in '.,'
                and q not in zajete
                and not g.w_przejsciu(*q)
                and not g.ciasne(*q)
                and not g.koliduje_ze_straza(q, ('potwor', sila))
            ):
                g.postaw(q, ('potwor', sila))
                return


def rozstaw(g):
    rng = g.rng

    # --- DOLINA DOMU -------------------------------------------------------
    # Pierwsze dwa dni: stosy przy zamku, skrzynia i dwie kopalnie podstawowe
    # bez straży. Dziecko ma zobaczyć nagrodę za każdy krok, zanim zobaczy
    # pierwszego stwora.
    # PIERWSZY EKRAN — dwie kopalnie, dwie budowle, stosy, skrzynia i pierwszy
    # skarb pod strażą, wszystko w widoku z dnia pierwszego (runda 1 ślepego
    # porównania: „obiektów mało, rozrzucone, nic nie pilnowane").
    # Kadr o rząd wyższy niż `kadr_startu` (dy od −4): górę ekranu zajmuje
    # pasmo gór, więc plac pod nim to jedyne miejsce na budowle nad zamkiem.
    sx, sy = PUNKTY['start']
    kadr_pelny = [p for p in g.wolne_pola('dom', (1, 999)) if abs(p[0] - sx) <= 5 and -4 <= p[1] - sy <= 5]
    # Runda 4: nic tuż przy bohaterze — kuźnia postawiona pole nad startem
    # zakrywała go dachem.
    kadr = [p for p in kadr_pelny if not pod_gora(g, p) and not (abs(p[0] - sx) <= 1 and -2 <= p[1] - sy <= 1)]
    g.dodaj_najpierw('dom', lambda p: ('kopalnia', 'jagoda'), kadr, None, (3, 14))
    # Kopalnia odłamków wcięta w skalne zbocze, jeśli pierwszy ekran je ma.
    w_skale = [p for p in g.pod_skala('dom') if p in kadr_pelny]
    g.dodaj_najpierw('dom', lambda p: ('kopalnia', 'odlamek'), w_skale, kadr)
    g.dodaj_najpierw('dom', lambda p: ('budynek', 'wiatrak'), kadr, None, (2, 16))
    g.dodaj_najpierw('dom', lambda p: ('budynek', 'oboz-treningowy'), kadr, None, (2, 16))
    for _ in range(3):
        g.dodaj_najpierw('dom', lambda p: ('surowiec', rng.choice(['jagoda', 'pokeball', 'odlamek'])), kadr, None, (2, 12))
    g.dodaj_najpierw('dom', lambda p: ('skrzynia', None), kadr, None, (2, 12))
    # Skarb pod strażą co najmniej cztery pola od startu — straż stoi od
    # strony gracza, a na progu startu stać jej nie wolno.
    # Runda 4: i co najmniej trzy pola od budowli — straż stojąca przy
    # skrzyni wchodziła w rysunek wiatraka.
    budowle_kadru = [q for q, co in g.obiekty if co[0] in ('kopalnia', 'budynek')]
    dalej = [
        p
        for p in kadr
        if max(abs(p[0] - sx), abs(p[1] - sy)) >= 4
        and all(max(abs(p[0] - q[0]), abs(p[1] - q[1])) >= 3 for q in budowle_kadru)
    ]
    strzez_pewnie(g, g.dodaj_najpierw('dom', lambda p: ('skrzynia', None), dalej, None, (5, 14)), 'slaby')
    # Pierwszy ekran jest skończony: reszta rozstawienia (budowle i stosy
    # całej doliny) idzie poza kadr, inaczej trzy budowle stawały dach w dach.
    kadr_calego_ekranu = [(x, y) for y in range(sy - 6, sy + 7) for x in range(sx - 7, sx + 8)]
    g.zajete += [p for p in kadr_calego_ekranu if strefa(*p) == 'dom']
    # Obóz łowców (złoto) pod słabą strażą — pierwsza bitwa, której stawkę
    # widać: kopalnia daje codziennie.
    g.strzez(g.dodaj(1, 'dom', (8, 20), lambda p: ('kopalnia', 'pokeball')), 'slaby')
    g.budowle(6, 'dom', ['ognisko', 'drzewo-wiedzy', 'zrodlo', 'chatka', 'gniazdo', 'woz'], (4, 30))
    g.dodaj(5, 'dom', (8, 30), lambda p: ('surowiec', rng.choice(['jagoda', 'odlamek', 'pokeball'])))
    g.dodaj(2, 'dom', (8, 30), lambda p: ('skrzynia', None))
    g.strzez(g.dodaj(1, 'dom', (10, 30), lambda p: ('artefakt', None)), 'slaby')
    g.dodaj(1, 'dom', (7, 30), lambda p: ('potwor', 'slaby'))
    # Kieszeń domu bywa po rundzie 4 ciasna (rzeka skręca przez dolinę):
    # gdy każde miejsce w niej zatyka drogę, skarb w kieszeni odpada.
    try:
        g.skarb_w_kieszeni('dom', 'slaby', 2, lambda p: ('skrzynia', None))
    except SystemExit:
        pass

    # --- ZA RZEKĄ ----------------------------------------------------------
    # Straż mostu stoi na wschodnim przyczółku, straż brodu NA brodzie —
    # potwór blokuje pole i osiem wokół, więc zamyka całą przeprawę.
    g.postaw((MOST[2] + 1, MOST[1]), ('potwor', 'slaby'))
    g.postaw((rzeka_x(7), 8), ('potwor', 'sredni'))

    # DRUGI BRZEG W PIERWSZYM EKRANIE (runda 4: „za rzeką nie ma obiektów,
    # nie widać, czy za wodą da się iść"). Kopalnia kamienia w zboczu
    # wschodniego pasma, strażnica przy drodze za mostem, stos i skrzynia pod
    # strażą — wszystko w widoku z dnia pierwszego. Kolumna sx+6 jest w kadrze
    # cała (pas ramki jest ostrożny, bo liczy się z szerokimi budowlami), więc
    # na czas tego rozstawienia wolno w niej stawiać.
    ramka = {(sx + 6, y) for y in range(sy - 4, sy + 5)}
    zdjete = [p for p in g.zajete if p in ramka]
    g.zajete = [p for p in g.zajete if p not in ramka]
    brzeg = [
        p
        for p in g.wolne_pola('pogranicze', (1, 999))
        if p[0] - sx <= 6 and -4 <= p[1] - sy <= 5 and not pod_gora(g, p)
    ]
    # Kopalnia ma szeroki rysunek — nie w ostatniej kolumnie kadru.
    w_zboczu = [p for p in g.pod_skala('pogranicze') if p[0] - sx <= 5 and -4 <= p[1] - sy <= 5]
    g.strzez(
        g.dodaj_najpierw('pogranicze', lambda p: ('kopalnia', 'kamien'), w_zboczu, g.pod_skala('pogranicze')),
        'slaby',
    )
    blisko = [p for p in brzeg if p[0] - sx <= 5]
    g.dodaj_najpierw('pogranicze', lambda p: ('budynek', 'wieza-obserwacyjna'), blisko)
    g.dodaj_najpierw('pogranicze', lambda p: ('surowiec', 'kamien'), brzeg)
    strzez_pewnie(g, g.dodaj_najpierw('pogranicze', lambda p: ('skrzynia', None), brzeg), 'slaby')
    g.dodaj_najpierw('pogranicze', lambda p: ('surowiec', rng.choice(['jagoda', 'pokeball'])), brzeg)
    g.zajete += zdjete
    # Drugi brzeg w kadrze też jest skończony: reszta pogranicza poza kadr
    # (wóz postawiony losowo stanął na trawiastym ramieniu góry jak doklejony).
    g.zajete += kadr_calego_ekranu

    g.dodaj(5, 'pogranicze', (0, 999), lambda p: ('surowiec', rng.choice(['jagoda', 'odlamek', 'kamien', 'pokeball'])))
    g.dodaj(1, 'pogranicze', (0, 999), lambda p: ('kopalnia', 'odlamek'))
    g.dodaj(2, 'pogranicze', (0, 999), lambda p: ('skrzynia', None))
    g.strzez(g.dodaj(1, 'pogranicze', (0, 999), lambda p: ('artefakt', None)), 'sredni')
    g.dodaj(1, 'pogranicze', (0, 999), lambda p: ('potwor', 'slaby'))
    g.budowle(7, 'pogranicze', ['wieza-obserwacyjna', 'gniazdo', 'chatka', 'woz', 'arena', 'ognisko', 'ranczo'])
    try:
        g.skarb_w_kieszeni('pogranicze', 'sredni', 3, lambda p: rng.choice([('skrzynia', None), ('surowiec', 'kamien')]))
    except SystemExit:
        pass

    # --- OKOLICE FORTU -----------------------------------------------------
    # Nagroda przy celu: kopalnia złota i skrzynie pod średnią strażą.
    g.strzez(g.dodaj(1, 'wroga', (0, 999), lambda p: ('kopalnia', 'pokeball')), 'sredni')
    g.strzez(g.dodaj(2, 'wroga', (0, 999), lambda p: ('skrzynia', None)), 'sredni')
    g.dodaj(2, 'wroga', (0, 999), lambda p: ('surowiec', rng.choice(['pokeball', 'kamien'])))
    g.budowle(1, 'wroga', ['kamienna-wieza'])


NAGLOWEK = '''// PLIK GENEROWANY — nie poprawiaj ręcznie.
// Źródło: tools/mapy/polana.py (szkic i rozstawienie), silnik: tools/generuj_mape.py.
//
// Plansza 36 × 36 („Polana”, rozmiar S) — misja 1, samouczek. Rzeka z dwoma
// brodami dzieli dolinę domu (zamek gracza na południowym zachodzie) od
// wschodniej łąki ze starym fortem przeciwnika.
// Znaki: . trawa, = ścieżka, , piasek, j ziemia jałowa, s śnieg, b bagno,
// T las, # skały, ~ woda.
'''

#: Fort nie wychodzi po gracza — to pierwsza misja. Ale „umacnia się”: co dzień
#: werbuje do załogi tyle, ile daje mu jedno siedlisko i ratusz, więc zwlekanie
#: kosztuje, jak mówi opis misji.
USTAWIENIA = {
    'wrog': 'obronca',
    'nazwyZamkowWroga': ['Stary Fort'],
    'budynkiWroga': ['ratusz1', 'siedlisko1'],
    'dostepneWroga': [0, 0, 0, 0, 0, 0],
    'garnizonWroga': {'poziomy': [0, 1], 'tygodnie': 1},
    'wrogSkarbiec': {'pokeball': 0, 'jagoda': 0, 'kamien': 0, 'odlamek': 0},
    # Trawiaste góry z brązowymi urwiskami zamiast omszałych głazów
    # (`public/mapa/polana/kepa-skaly-*.png`, prompty: PROMPTY-PLANSZE.md §4).
    'zestaw': 'polana',
}

#: Przejezdne pola, do których nie da się dojść, zarastają lasem (patrz silnik).
ZASYP_ODCIETE = True

#: Plac wokół zamków wolny od innych budowli (patrz silnik).
ODSTEP_OD_ZAMKOW = 1

#: Las w zwarte masy z polanami, pusty pas przy ramie pierwszego ekranu.
SKUP_LAS = True
RAMKA_STARTU = True

#: Droga z brzegiem (runda 1: „jedna ścieżka ginie w trawie").
EFEKTY = ['obwodka_drogi', 'relief', 'bez_placow']

#: Runda 2 („krainy rozmywają się w jedną"): twardsze brzegi terenów.
WTAPIANIE = {'las': 0.3, 'skaly': 0.28, 'piasek': 0.3, 'woda': 0.25}

#: Budowle pierwszego ekranu co najmniej trzy pola od siebie (silnik).
ODSTEP_KADRU = 3

#: Runda 3: rzeka głębsza i ciemniejsza — turkus świecił jak laguna
#: i razem z trzema polami szerokości robił z rzeki morze.
BARWY_TERENU = {
    'woda': {'nasycenie': 0.85, 'barwa': (70, 120, 200), 'moc': 0.35, 'jasnosc': 0.86},
}

#: Naklejki terenu (`public/mapa/tlo/`, prompty w `tools/PROMPTY-PLANSZE.md`).
NAKLEJKI = [
    (['kwiaty-1', 'kwiaty-2'], '.', 0.06),
]

#: Runda 4: most przez rzekę w pierwszym ekranie (`teren_efekty.mosty`).
#: `pola` — pola przeprawy (w grze droga, w tle woda pod mostem); `srodek`
#: i `szer` w polach. Rysunek z `tools/PROMPTY-PLANSZE.md` §6 (polana-most),
#: przycięty do sylwetki w `public/mapa/polana/most.png`. Pomost biegnie lekko
#: pod górę w prawo — w poprzek rzeki, która w tym miejscu płynie skosem.
MOSTY = [
    {'plik': 'polana/most.png', 'pola': [(MOST[0], MOST[1]), (MOST[2], MOST[3])], 'srodek': (15.1, 25.72), 'szer': 3.2},
]
