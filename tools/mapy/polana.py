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
    'T~~...T.....',
    'T~~.T.....T#',
    'T...T..T....',
    '#T.......T.T',
    'T..T#.......',
    'T.......T..T',
    'TT.T....T.,T',
    'T....T.....T',
    'T.T.....T#.T',
    'T.......TT.T',
    'TTTTT#TTTT#T',
]


def rzeka_x(y):
    """Środek koryta w wierszu `y`. Zmienia się najwyżej o pole na wiersz —
    przy większym skoku dwa sąsiednie brzegi stykają się po skosie i rzekę
    da się przejść bokiem (ruch jest ośmiokierunkowy)."""
    return 19 + round(2.2 * math.sin((y + 3) / 6.0))


#: Brody. `(x0, y0, x1, y1)` — dwa wiersze wysokości, na całą szerokość koryta.
BROD_POLUDNIOWY = (rzeka_x(26) - 2, 26, rzeka_x(26) + 2, 27)
BROD_POLNOCNY = (rzeka_x(7) - 2, 7, rzeka_x(7) + 2, 8)

ZAPORY = {
    'rzeka': {
        'przejscia': [BROD_POLUDNIOWY, BROD_POLNOCNY],
        # Za rzeką ma być wszystko, po co się tu przyszło: fort i jego łąka.
        'odcina': ['zamek wroga', 'wschodnia laka'],
    },
}

PUNKTY = {
    'start': (9, 29),
    'zamek gracza': (6, 31),
    'rozstaje': (12, 24),
    'polnocna laka': (9, 10),
    'brod zachod': (rzeka_x(26) - 4, 27),
    'brod wschod': (rzeka_x(26) + 4, 26),
    'wschodnia laka': (27, 23),
    'zamek wroga': (30, 13),
    'poludniowy wschod': (29, 31),
}

#: Drogi. Główna prowadzi z zamku przez południowy bród pod sam fort — gracz,
#: który nie wie jeszcze nic, ma iść po drodze i dojść tam, gdzie trzeba.
SZLAKI = [
    ['zamek gracza', 'start', 'rozstaje', 'brod zachod', 'brod wschod', 'wschodnia laka', 'zamek wroga'],
    ['rozstaje', 'polnocna laka'],
    ['wschodnia laka', 'poludniowy wschod'],
]

#: Obiekty mogą stać na trawie i piasku (jak na Dwóch Dolinach).
POD_OBIEKTY = '.,'


def popraw_teren(g, mapa):
    """Maluje rzekę z dwoma brodami.

    Koryto ma trzy pola szerokości, a brzegi są poszarpane (tu i ówdzie
    czwarte pole wody) — prosta wstęga szeroka na trzy wyglądałaby jak kanał.
    """
    rng = random.Random(ZIARNO + 7)
    for y in range(BOK):
        cx = rzeka_x(y)
        for x in range(cx - 1, cx + 2):
            mapa[y][x] = '~'
        if rng.random() < 0.35:
            mapa[y][cx + (2 if rng.random() < 0.5 else -2)] = '~'
    for x0, y0, x1, y1 in (BROD_POLUDNIOWY, BROD_POLNOCNY):
        for y in range(y0, y1 + 1):
            for x in range(x0, x1 + 1):
                if mapa[y][x] not in '.,=':
                    mapa[y][x] = ','
    # Nad jeziorem i przy brodach las nie może zamknąć dojścia: brzegi brodu
    # zawsze są przejezdne na dwa pola w głąb.
    for x0, y0, x1, y1 in (BROD_POLUDNIOWY, BROD_POLNOCNY):
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


def rozstaw(g):
    rng = g.rng

    # --- DOLINA DOMU -------------------------------------------------------
    # Pierwsze dwa dni: stosy przy zamku, skrzynia i dwie kopalnie podstawowe
    # bez straży. Dziecko ma zobaczyć nagrodę za każdy krok, zanim zobaczy
    # pierwszego stwora.
    g.dodaj(3, 'dom', (2, 8), lambda p: ('surowiec', rng.choice(['jagoda', 'pokeball', 'odlamek'])))
    g.dodaj(1, 'dom', (3, 8), lambda p: ('skrzynia', None))
    g.dodaj(1, 'dom', (3, 9), lambda p: ('kopalnia', 'jagoda'))
    g.dodaj(1, 'dom', (6, 14), lambda p: ('kopalnia', 'odlamek'))
    # Obóz łowców (złoto) pod słabą strażą — pierwsza bitwa, której stawkę
    # widać: kopalnia daje codziennie.
    g.strzez(g.dodaj(1, 'dom', (8, 20), lambda p: ('kopalnia', 'pokeball')), 'slaby')
    g.budowle(5, 'dom', ['wiatrak', 'oboz-treningowy', 'ognisko', 'drzewo-wiedzy', 'zrodlo'], (4, 30))
    g.dodaj(3, 'dom', (8, 30), lambda p: ('surowiec', rng.choice(['jagoda', 'odlamek', 'pokeball'])))
    g.dodaj(1, 'dom', (8, 30), lambda p: ('skrzynia', None))
    g.strzez(g.dodaj(1, 'dom', (10, 30), lambda p: ('artefakt', None)), 'slaby')
    g.dodaj(1, 'dom', (7, 30), lambda p: ('potwor', 'slaby'))
    g.skarb_w_kieszeni('dom', 'slaby', 2, lambda p: ('skrzynia', None))

    # --- ZA RZEKĄ ----------------------------------------------------------
    # Straże brodów stoją NA brodzie — potwór blokuje pole i osiem wokół, więc
    # przy korycie szerokim na trzy zamyka całą przeprawę.
    g.postaw((rzeka_x(26), 26), ('potwor', 'slaby'))
    g.postaw((rzeka_x(7), 8), ('potwor', 'sredni'))

    g.dodaj(4, 'pogranicze', (0, 999), lambda p: ('surowiec', rng.choice(['jagoda', 'odlamek', 'kamien', 'pokeball'])))
    g.strzez(g.dodaj(1, 'pogranicze', (0, 999), lambda p: ('kopalnia', 'kamien')), 'slaby')
    g.dodaj(1, 'pogranicze', (0, 999), lambda p: ('kopalnia', 'odlamek'))
    g.dodaj(2, 'pogranicze', (0, 999), lambda p: ('skrzynia', None))
    g.strzez(g.dodaj(1, 'pogranicze', (0, 999), lambda p: ('artefakt', None)), 'sredni')
    g.budowle(4, 'pogranicze', ['wieza-obserwacyjna', 'gniazdo', 'chatka', 'woz'])
    g.skarb_w_kieszeni('pogranicze', 'sredni', 3, lambda p: rng.choice([('skrzynia', None), ('surowiec', 'kamien')]))

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
}

#: Przejezdne pola, do których nie da się dojść, zarastają lasem (patrz silnik).
ZASYP_ODCIETE = True

#: Plac wokół zamków wolny od innych budowli (patrz silnik).
ODSTEP_OD_ZAMKOW = 2
