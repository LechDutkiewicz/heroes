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
    # Runda 6 (HotA): „wzgórza to pojedyncze kopce — połączyć w pasma, które
    # wyznaczą przejścia". Zachodnie pasmo schodzi drugim piętrem aż pod
    # rzekę i zostawia PRZEŁĘCZ dwa pola szeroką (kolumny 11–12) — tędy idzie
    # droga na północną łąkę; w jego zboczu siedzi kuźnia kryształów.
    # Kolumny 0–1 to las, żeby kępy 3 × 2 zaczynały się od kolumny 2
    # i ostatnia wypadła na 8–10, a nie rozsypała się w pojedyncze głazy.
    (2, 25, 10, 26),
    # Wschodnie pasmo: masyw z kopalnią kamienia ciągnie się na wschód i skręca
    # na południe aż do kopca w rogu — za rzeką powstaje zamknięta kieszeń
    # (kopalnia, skrzynia, ognisko) z jednym wejściem wzdłuż brzegu, które
    # pilnuje straż.
    (18, 28, 23, 29),
    (21, 30, 23, 31),
    (20, 32, 22, 33),
    (19, 34, 21, 35),
]

#: Runda 6: ubita ziemia (`j`, tekstura `teren-ziemia`) pod skarpami pasm
#: i na dnie kieszeni za rzeką — przejście terenu zamiast jednolitej zieleni.
ZIEMIA = [
    (11, 27), (12, 27),
    (18, 30), (19, 31), (20, 31), (18, 31), (19, 32),
    (16, 23), (17, 22),
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
    # Runda 6: kadr po oddaleniu kamery sięga od wiersza 18 — piaszczysta
    # łata przy drodze na północ czytała się jak jasny plac.
    for y in range(17, 22):
        for x in range(3, 12):
            if mapa[y][x] == ',':
                mapa[y][x] = '.'
            if mapa[y][x] == 'T' and y <= 31 and (x >= 7 or x > rzeka_x(y)):
                mapa[y][x] = '.'
    # Runda 6: lewy dolny róg kadru to już nie „las bez niczego": ściana
    # lasu zostaje przy krawędzi mapy (kolumny 0–5 i dwa dolne wiersze),
    # a między nią a rzeką jest polana z wiatrakiem, sadem i obozem.
    for y in range(25, 27):
        for x in (0, 1):
            mapa[y][x] = 'T'
    for y in range(32, BOK):
        for x in range(0, rzeka_x(y) - 1):
            brzeg = 6 if y <= 33 else (7 if y == 34 else 9)
            mapa[y][x] = 'T' if x < brzeg else '.'
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
    # Runda 6: kępa lasu na drugim brzegu nad pasmem — łąka za mostem była
    # jedną zieloną połacią; las zamyka ją od wschodu, droga idzie dołem.
    for y in range(20, 24):
        for x in range(21, 24):
            if mapa[y][x] in '.,':
                mapa[y][x] = 'T'
    for x, y in ZIEMIA:
        if mapa[y][x] in '.,':
            mapa[y][x] = 'j'
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


#: Kadr pierwszego ekranu (x0, y0, x1, y1): kamera oddalona do 32 px na pole
#: (`ZOOM_MAPY`) widzi 21 × 18 pól wokół startu, przyciśnięte do dołu mapy.
KADR = (3, 18, 24, 35)

#: Pierwszy ekran, brzeg domu: (kolejne miejsca do wyboru, obiekt).
PIERWSZY_EKRAN_DOM = [
    ([(9, 27), (8, 27), (10, 27)], ('kopalnia', 'odlamek')),
    ([(12, 33), (11, 33), (13, 33)], ('kopalnia', 'jagoda')),
    ([(7, 33), (8, 33), (7, 32)], ('budynek', 'wiatrak')),
    ([(15, 33), (14, 34), (15, 32)], ('budynek', 'oboz-treningowy')),
    ([(13, 30), (14, 30), (12, 31)], ('budynek', 'zrodlo')),
    ([(5, 28), (6, 28), (6, 29)], ('budynek', 'ognisko')),
    ([(11, 24), (10, 24)], ('surowiec', 'odlamek')),
    ([(14, 31), (14, 32)], ('surowiec', 'pokeball')),
    ([(6, 30), (5, 30), (6, 31)], ('surowiec', 'jagoda')),
    ([(11, 29), (10, 28)], ('surowiec', 'kamien')),
    ([(14, 27), (13, 26)], ('skrzynia', None)),
    ([(9, 34), (10, 34)], ('skrzynia', None)),
    ([(10, 33), (9, 33)], ('potwor', 'slaby')),
    ([(4, 31), (5, 32)], ('artefakt', None)),
    ([(5, 31), (4, 30)], ('potwor', 'slaby')),
    ([(9, 21), (8, 20), (10, 21)], ('budynek', 'chatka')),
    ([(4, 21), (5, 21)], ('surowiec', 'pokeball')),
    ([(10, 19), (9, 19)], ('skrzynia', None)),
]

#: Pierwszy ekran, drugi brzeg.
PIERWSZY_EKRAN_BRZEG = [
    ([(19, 30), (20, 30), (18, 30)], ('kopalnia', 'kamien')),
    ([(17, 30), (17, 29)], ('potwor', 'slaby')),
    ([(19, 32), (18, 32)], ('skrzynia', None)),
    ([(20, 31), (18, 31)], ('budynek', 'ognisko')),
    ([(18, 23), (17, 23)], ('budynek', 'wieza-obserwacyjna')),
    ([(20, 23), (21, 23), (20, 22)], ('budynek', 'gniazdo')),
    ([(19, 24), (18, 24)], ('surowiec', 'jagoda')),
    ([(22, 25), (22, 26), (23, 24)], ('surowiec', 'kamien')),
    ([(18, 20), (17, 20), (19, 19)], ('skrzynia', None)),
    ([(19, 21), (18, 21)], ('potwor', 'slaby')),
    ([(22, 20), (21, 19)], ('budynek', 'woz')),
]


def postaw_kadr(g, miejsca, wpis):
    """Obiekt pierwszego ekranu na pierwszym pasującym polu z listy."""
    sx, sy = PUNKTY['start']
    zajete = {q for q, _ in g.obiekty} | g.blokada | set(PUNKTY.values())
    for x, y in miejsca:
        if not g.w(x, y) or g.mapa[y][x] not in '.,j' or (x, y) in zajete:
            continue
        if max(abs(x - sx), abs(y - sy)) <= (2 if wpis[0] == 'potwor' else 1):
            continue
        bryla = g.pola_bryly(wpis[0], wpis[1], (x, y))
        if any(q in zajete or g.mapa[q[1]][q[0]] == '=' for q in bryla):
            continue
        if wpis[0] == 'potwor' and g.koliduje_ze_straza((x, y), wpis):
            continue
        try:
            return g.postaw((x, y), wpis)
        except SystemExit:
            continue
    print(f'  pierwszy ekran: brak miejsca na {wpis} w {miejsca}')
    return None


def rozstaw(g):
    rng = g.rng

    # --- DOLINA DOMU -------------------------------------------------------
    # Pierwsze dwa dni: stosy przy zamku, skrzynia i dwie kopalnie podstawowe
    # bez straży. Dziecko ma zobaczyć nagrodę za każdy krok, zanim zobaczy
    # pierwszego stwora.
    # PIERWSZY EKRAN (runda 6, wzorzec HotA) — rozstawiony RĘCZNIE, pole po
    # polu. Werdykt rundy 5: „środek i lewy dół to pusta zieleń, prawie nie
    # ma obiektów do zebrania i odwiedzenia — każdy ekran ma dawać kilka
    # wyborów trasy". Losowanie z odstępami dawało garść rzeczy rozrzuconych
    # po łące; tu każde miejsce kadru ma swoją rzecz: kuźnia w zboczu pasma,
    # sad i wiatrak na polanie przy lesie, źródło i skrzynie przy rzece,
    # skarb pod strażą w lewym dole. `postaw_kadr` bierze pierwsze wolne
    # miejsce z listy (droga, bryła i próg startu odpadają).
    sx, sy = PUNKTY['start']
    for miejsca, wpis in PIERWSZY_EKRAN_DOM:
        postaw_kadr(g, miejsca, wpis)
    # Pierwszy ekran jest skończony: reszta rozstawienia (budowle i stosy
    # całej doliny) idzie poza kadr, inaczej trzy budowle stawały dach w dach.
    kadr_calego_ekranu = [(x, y) for y in range(KADR[1], KADR[3] + 1) for x in range(KADR[0], KADR[2] + 1)]
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

    # DRUGI BRZEG W PIERWSZYM EKRANIE: kieszeń za pasmem (kopalnia kamienia
    # wcięta w zbocze, skrzynia, ognisko, stos) z jednym wejściem wzdłuż
    # brzegu i strażą w nim; nad pasmem strażnica, gniazdo i stosy przy drodze.
    for miejsca, wpis in PIERWSZY_EKRAN_BRZEG:
        postaw_kadr(g, miejsca, wpis)
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
    # Runda 5 (HotA): „kula przy wiatraku, jagody i kryształy są wielkości
    # bohatera, bez cienia — ikony wklejone na tło". Znajdźki mają pół pola
    # (ok. 45–50% wysokości bohatera), cień kontaktowy i rysunek STOSU leżącego
    # na ziemi (`public/mapa/polana/stos-*.png`) zamiast ikony z paska.
    'znajdzki': 0.42,
    # Runda 6 (HotA): „zamek, młyn i most zajmują po kilka kafli". Budowle
    # odwiedzane stoją na jednym polu, więc mniejszy rysunek niczego nie psuje.
    'skalaBudowli': 0.8,
    # Runda 6: rogi pierwszego kadru (21 × 18 pól po oddaleniu kamery)
    # odsłonięte od startu — czarne zęby mgły w rogach ekranu wyglądały jak
    # dziura w mapie. Tylko rogi: sonda pilnuje, żeby na starcie było
    # odsłonięte mniej niż 20% planszy.
    'odkryte': [
        {'x': 4, 'y': 19, 'promien': 3},
        {'x': 23, 'y': 20, 'promien': 4},
        {'x': 24, 'y': 34, 'promien': 2},
        {'x': 3, 'y': 35, 'promien': 2},
    ],
}

#: Runda 6: ziemia pod skarpami to ubita brązowa ziemia z kamykami
#: (`teren-ziemia`, PROMPTY-PLANSZE §11), a nie spękana szara jałowa ziemia.
TEKSTURY = {'jalowa': ['ziemia', 'jalowa']}

#: Runda 6 („płaska, jednolita zieleń bez wzniesień"): łagodne pagórki
#: i skarpy z cieniem na łące (`teren_efekty.rzezba`, jak na Bagnach).
RZEZBA = {'pagorki': 0.6, 'czolo': 0.4}

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
#: Runda 5 (HotA): `kwiaty-1` ma pod spodem jasną kępę mchu, która na łące
#: czytała się jak doklejony talerzyk — zostają kwiaty bez podstawki, a obok
#: drobiazgi łąki jak w HotA (kamienie w mchu, paprocie, grzyby; rysunki
#: z `tools/PROMPTY-PLANSZE.md` §8).
NAKLEJKI = [
    (['kwiaty-2'], '.', 0.05),
    (['kamienie-mech'], '.', 0.022),
    (['paproc'], '.', 0.03),
    (['grzyby-bagienne'], '.T', 0.015),
    # Runda 6: drobiazgi łąki (PROMPTY-PLANSZE §11) — pniaki, głazy, kępy
    # polnych kwiatów; ziemia pod skarpą dostaje głazy.
    (['pniak-lakowy'], '.', 0.012),
    (['glazy-lakowe'], '.j', 0.02),
    (['kepa-kwiatow'], '.', 0.03),
]

#: Runda 4: most przez rzekę w pierwszym ekranie (`teren_efekty.mosty`).
#: `pola` — pola przeprawy (w grze droga, w tle woda pod mostem); `srodek`
#: i `szer` w polach. Rysunek z `tools/PROMPTY-PLANSZE.md` §6 (polana-most),
#: przycięty do sylwetki w `public/mapa/polana/most.png`. Pomost biegnie lekko
#: pod górę w prawo — w poprzek rzeki, która w tym miejscu płynie skosem.
MOSTY = [
    {'plik': 'polana/most.png', 'pola': [(MOST[0], MOST[1]), (MOST[2], MOST[3])], 'srodek': (15.1, 25.72), 'szer': 3.2},
]
