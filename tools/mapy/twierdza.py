"""„Twierdza" — plansza 72 × 72, misja 4: „Oblężenie Groty". Najtrudniejsza.

Opis misji: srebrne płaszcze bronią się w dwóch ostatnich twierdzach na
północy; trzeba zdobyć obie, a „wróg nie będzie czekał, aż do niego
przyjdziesz". Plansza jest więc zimna, ciasna i ma DWA cele naraz:

    ┌───────────────────┬┬─────────────────────┐  y 0–20   KRAINA WROGA
    │ SREBRNA STRAŻNICA ││  LODOWA TWIERDZA     │  dwie doliny rozdzielone
    │ (zach., załoga)   ═╪═ (wsch., stolica)    │  skalnym grzbietem z jedną
    │                   ││                      │  przełęczą pod strażą
    ├──╫── grzbiet północny ──────────╫─────────┤  y 21–22  przejścia pod wodzami
    │  TUNDRA: zamarznięte jezioro, ziemia       │  y 23–44  środek gry
    │  jałowa, sosnowe bory, kopalnie            │
    ├─────────╫── grzbiet południowy ──╫────────┤  y 45–46  przejścia pod strażnikami
    │  DOLINA GRACZA (chłodna łąka, zamek)       │  y 47–71
    └────────────────────────────────────────────┘

Czym się różni od Dwóch Dolin, z których bierze szkielet trzech pasów:

1. **Dwie twierdze, nie jedna.** Każda ma własną dolinę i własne wejście
   z tundry, a między nimi stoi skalny grzbiet z jedną przełęczą. Po zdobyciu
   pierwszej nie trzeba wracać przez pół mapy — ale przełęczy pilnuje silna
   straż, więc skrót trzeba sobie wywalczyć.
2. **Przeciwnik naciera.** Wie od początku, gdzie stoi zamek gracza, i od
   osiemnastego dnia idzie na niego, gdy tylko ma czym (`natarcie` w
   USTAWIENIACH). Misja jest wyścigiem, a nie spacerem.
3. **Zima kosztuje.** Śnieg to 150 punktów ruchu za pole, ziemia jałowa 125,
   droga 70. Drogi prowadzą do obu twierdz — kto z nich zejdzie, traci dni.

Przejścia przez grzbiety są pilnowane przez potwory, nie przez strażnice
z kluczem: przeciwnik z kluczami otwierałby bramy także graczowi (brama raz
otwarta jest otwarta dla obu), a wtedy zagadka kluczy znika w pierwszym
tygodniu. Stado trzeba pokonać — każda ze stron sama.
"""

import random

ID = 'twierdza'
NAZWA = 'Twierdza'

SKALA = 4
BOK = 72
ZIARNO = 20260926

# Szkic 18 × 18, każdy znak to kwadrat 4 × 4 pola.
#   s  śnieg      j  ziemia jałowa (tundra)    ~  zamarznięte jezioro
#   T  bór        #  skały                     .  chłodna łąka
#
#   0–4    kraina wroga: dwie śnieżne doliny, kolumna 8 to skalny grzbiet;
#   5      GRZBIET PÓŁNOCNY — pełny mur, przejścia wycina tabela PRZEJSCIA;
#   6–10   tundra: jezioro pośrodku, bory, skałki;
#   11     GRZBIET POŁUDNIOWY — pełny mur;
#   12–17  dolina gracza: łąka i bory, zamek na południowym zachodzie.
SZKIC = [
    'T#ssTsTs#sTTs#ssT#',
    'Tss~ssTs#ssTsssTs#',
    'ss.s.sss#sTs..s.sT',
    'sTs.sTss#s~~ss.sTs',
    'Ts#sssTs#sss#ssss#',
    '##################',
    'jsTj~~jsssjjTTsjjs',
    'jT.s~~~jsjTs#jTjsj',
    'Tjs.j~~~~jsjj~~sjT',
    'js#jsj~~~j.sj~~jTj',
    'sTjj.sjT#jsjTjsj#j',
    '##################',
    'Ts#s#.jssj#T.sjs.T',
    'sTss#.s#.sT.~~sTsT',
    's.s.~~s#sjj.~~s#jT',
    '##sss..#s.sTs.T.sT',
    's#sss.s.sT.#.sTsjT',
    'T##sTTs#TT.TTTTsTT',
]

#: Mury: dwa grzbiety poziome jak na Dwóch Dolinach i skalny „kręgosłup"
#: między dolinami twierdz. Kręgosłup sięga do wiersza 22, czyli zachodzi
#: na rdzeń grzbietu północnego — przy końcu w wierszu 19 rozmycie potrafi
#: otworzyć wiersz 20 i doliny łączą się bokiem, omijając przełęcz.
GRZBIETY = [
    ('północny', (21, 22)),
    ('południowy', (45, 46)),
    ('kręgosłup', 'x', (33, 35), (0, 22)),
]

PRZEJSCIA = [
    ('północny', (12, 20, 13, 23), 's'),     # do Srebrnej Strażnicy
    ('północny', (57, 20, 58, 23), '.'),     # do Lodowej Twierdzy — droga
    ('południowy', (29, 44, 30, 47), '.'),   # wyjazd z doliny — droga
    ('południowy', (55, 44, 56, 47), 'j'),   # boczny, przez tundrę
    ('kręgosłup', (33, 8, 35, 9), 's'),      # przełęcz między twierdzami
]

PRZEJSC_W_MURZE = {'północny': 2, 'południowy': 2, 'kręgosłup': 1}

PUNKTY = {
    'start': (13, 62),
    'zamek gracza': (10, 64),
    'rozstaje doliny': (22, 56),
    'podnoze poludniowe': (29, 51),
    'przelecz poludniowa': (29, 45),
    'tundra': (30, 40),
    'zachodni bor': (14, 30),
    'przelecz zachodnia': (12, 21),
    'wschodnie jezioro': (50, 34),
    'przelecz wschodnia': (57, 21),
    'zamek wroga': (58, 9),
    'zamek wroga 2': (13, 11),
    'przelecz twierdz': (34, 8),
}

SZLAKI = [
    ['zamek gracza', 'start', 'rozstaje doliny', 'podnoze poludniowe', 'przelecz poludniowa', 'tundra',
     'zachodni bor', 'przelecz zachodnia', 'zamek wroga 2'],
    ['tundra', 'wschodnie jezioro', 'przelecz wschodnia', 'zamek wroga'],
]

#: Obiekty stoją na łące, piasku, śniegu i tundrze — w krainie, która jest
#: w połowie śniegiem, sama łąka nie starczyłaby na rozstawienie.
POD_OBIEKTY = '.,sj'

ZASYP_ODCIETE = True
ODSTEP_OD_ZAMKOW = 2


#: Przesunięcia ziaren tundry i dolin twierdz (patrz `rozstaw`).
TUNDRA_ZIARNO = 60
TWIERDZE_ZIARNO = 61


def strefa(x, y):
    if y < 21:
        return 'wroga'
    if y <= 46:
        return 'pogranicze'
    return 'dom'


def popraw_teren(g, mapa):
    """Pierwszy ekran, runda 3: skuty lodem staw nad drogą i skalny próg.

    Werdykt rundy 2: „nie ma ośnieżonych gór ani lodu". Staw ze szkicu leżał
    w rogu kadru i widać było jego skrawek. Malujemy go tu, a nie w szkicu:
    zmiana szkicu przestawia losowanie rozmycia na CAŁEJ planszy (inne doliny
    twierdz, inna symulacja), a to jest poprawka jednego ekranu. Staw kończy
    się przed x 21 — tamtędy idzie droga na północ (`rozstaje doliny`).
    """
    rng = random.Random(ZIARNO + 7)
    for y in range(56, 60):
        lewy = 12 - (1 if rng.random() < 0.5 else 0) + (1 if y == 59 else 0)
        prawy = 20 - (1 if y == 56 and rng.random() < 0.5 else 0)
        for x in range(lewy, prawy + 1):
            mapa[y][x] = '~'
    # Runda 3 (wzorzec HotA): tafla na trzecią część kadru była jedną płaską
    # plamą. Wysepka z kilkoma ośnieżonymi świerkami (bez kształtu 3 × 2 —
    # scena stawia wtedy pojedyncze drzewa, a nie wielką kępę lasu).
    for x, y in [(15, 57), (16, 57), (17, 57), (16, 58)]:
        mapa[y][x] = 'T'
    # Skalny próg nad zamkiem łączy staw z pasmem gór na zachodzie.
    for y, (od, do) in zip(range(56, 60), [(5, 8), (5, 9), (6, 9), (6, 8)]):
        for x in range(od, do + 1):
            mapa[y][x] = '#'
    # Pasmo gór na zachód od zamku ma dziewięć pól szerokości, nie osiem:
    # scena układa masywy (`kepa-skaly`, 3 × 2 pola) od x 0, więc przy
    # ośmiu na widoczny brzeg pasma (x 6–8) zostawały same drobne głazy
    # i w kadrze stał rządek kopczyków zamiast gór.
    for y in range(60, 67):
        for x in range(0, 9):
            mapa[y][x] = '#'


def kadr_szeroki(g):
    """Wolne pola CAŁEGO pierwszego ekranu po oddaleniu kamery (`ZOOM_MAPY`,
    32 px na pole): 21 × 18 pól wokół startu, bez skrajnego pasa, w którym
    obiekt wychodziłby na zrzucie ucięty ramą."""
    sx, sy = PUNKTY['start']
    return [
        p
        for p in g.wolne_pola(strefa(sx, sy), (1, 999))
        if abs(p[0] - sx) <= 8 and -7 <= p[1] - sy <= 8
    ]


def bez_sniegu(g, pola):
    """Pola, wokół których (3 × 3) nie ma śniegu — na sad i łąkowe budowle."""
    return [
        (x, y)
        for x, y in pola
        if all(g.mapa[y + dy][x + dx] != 's' for dy in (-1, 0, 1) for dx in (-1, 0, 1)
               if 0 <= x + dx < BOK and 0 <= y + dy < BOK)
    ]


def rozstaw(g):
    rng = g.rng

    # --- STRAŻE PRZEJŚĆ ------------------------------------------------------
    # Stoją NA przejściach: potwór blokuje pole i osiem wokół, więc przejście
    # szerokie na dwa pola jest zamknięte w całości. Strażnicy grzbietu
    # południowego to pierwszy prawdziwy sprawdzian armii; wodzowie grzbietu
    # północnego — brama do twierdz.
    g.postaw((29, 46), ('potwor', 'straznik', 'Strażnik Mroźnej Przełęczy'))
    g.postaw((55, 46), ('potwor', 'straznik', 'Strażnik Tundry'))
    # Zachodnia przełęcz prowadzi do słabszej twierdzy — pilnuje jej strażnik,
    # nie wódz; symulacja z wodzem po obu stronach nigdy nie zdobywała drugiej.
    g.postaw((12, 21), ('potwor', 'straznik', 'Strażnik Zachodniej Przełęczy'))
    g.postaw((57, 21), ('potwor', 'wodz', 'Wódz Wschodniej Przełęczy'))
    g.postaw((34, 9), ('potwor', 'silny', 'Straż Przełęczy Twierdz'))

    # --- DOLINA GRACZA -------------------------------------------------------
    # Pierwszy ekran: kopalnie, budowle, stosy i skarb pod strażą w widoku
    # z dnia pierwszego (runda 1: „poza zamkiem dwie trzecie pustki").
    kadr = g.kadr_startu()
    sx, sy = PUNKTY['start']
    dalej = [p for p in kadr if max(abs(p[0] - sx), abs(p[1] - sy)) >= 4]
    # Runda 2: „jabłonie obok zasp" — dziś sad w zestawie `zima` to
    # zaśnieżony spichlerz jagód bez liści, więc może stać w śniegu, w kadrze.
    g.dodaj_najpierw('dom', lambda p: ('kopalnia', 'jagoda'), kadr, bez_sniegu(g, g.wolne_pola('dom', (3, 20))))
    g.dodaj_najpierw('dom', lambda p: ('kopalnia', 'odlamek'), kadr, None, (3, 14))
    g.dodaj_najpierw('dom', lambda p: ('budynek', 'ognisko'), kadr, None, (2, 16))
    g.dodaj_najpierw('dom', lambda p: ('budynek', 'chatka'), kadr, None, (2, 16))
    # Runda 3 (wzorzec HotA): „dwie trzecie ekranu puste" — zimowa wieża
    # obserwacyjna i dwie kupki więcej w widoku z dnia pierwszego. (Wiatrak
    # dolina ma z `budowle` niżej; drugi w kadrze wyglądał na kopiuj-wklej.)
    g.dodaj_najpierw('dom', lambda p: ('budynek', 'wieza-obserwacyjna'), kadr, None, (2, 16))
    for _ in range(5):
        g.dodaj_najpierw('dom', lambda p: ('surowiec', rng.choice(['jagoda', 'pokeball', 'odlamek'])), kadr, None, (2, 12))
    g.dodaj_najpierw('dom', lambda p: ('skrzynia', None), kadr, None, (2, 12))
    g.strzez(g.dodaj_najpierw('dom', lambda p: ('artefakt', None), dalej, None, (5, 14)), 'slaby')
    # Runda 3 (wzorzec HotA, kamera oddalona do 32 px na pole): pierwszy ekran
    # to już 21 × 18 pól, a `kadr_startu` pokrywa jego środek. Pierścień
    # wokół (`kadr_szeroki`) dostaje własne rzeczy — zimowe budowle, strzeżoną
    # kopalnię, kupki i skrzynie — żeby brzegi ekranu nie były pustym śniegiem.
    pierscien = [p for p in kadr_szeroki(g) if p not in set(kadr)]
    for budynek in ('kamienna-wieza', 'zrodlo', 'woz'):
        g.dodaj_najpierw('dom', lambda p, b=budynek: ('budynek', b), pierscien, None, (3, 24))
    g.strzez(g.dodaj_najpierw('dom', lambda p: ('kopalnia', 'pokeball'), pierscien, None, (4, 24)), 'slaby')
    for _ in range(4):
        g.dodaj_najpierw('dom', lambda p: ('surowiec', rng.choice(['jagoda', 'pokeball', 'odlamek'])), pierscien, None, (3, 20))
    for _ in range(2):
        g.dodaj_najpierw('dom', lambda p: ('skrzynia', None), pierscien, None, (3, 20))
    g.dodaj(2, 'dom', (6, 14), lambda p: ('surowiec', rng.choice(['jagoda', 'pokeball', 'odlamek'])))
    g.dodaj(1, 'dom', (6, 14), lambda p: ('skrzynia', None))
    g.dodaj(8, 'dom', (10, 40), lambda p: ('surowiec', rng.choice(['jagoda', 'odlamek', 'pokeball'])))
    kopalnie = ['odlamek', 'pokeball', 'odlamek', 'pokeball', 'kamien']
    polozone = []
    for co in kopalnie:
        polozone += g.dodaj(1, 'dom', (10, 40), lambda p, co=co: ('kopalnia', co))
    g.strzez([p for p, co in zip(polozone, kopalnie) if co in ('pokeball', 'kamien')], 'slaby')
    # Drugi sad doliny — jagodami płaci się za siedliska, a symulacja bez
    # niego nie zdobywała drugiej twierdzy. Też tylko poza śniegiem.
    g.dodaj_najpierw('dom', lambda p: ('kopalnia', 'jagoda'), bez_sniegu(g, g.wolne_pola('dom', (8, 40))), None, (8, 40))
    g.dodaj(5, 'dom', (10, 40), lambda p: ('skrzynia', None))
    g.dodaj(3, 'dom', (12, 40), lambda p: ('potwor', 'slaby'))
    g.strzez(g.dodaj(2, 'dom', (14, 40), lambda p: ('artefakt', None)), 'slaby')
    g.skarb_w_kieszeni('dom', 'slaby', 3, lambda p: ('skrzynia', None))
    g.skarb_w_kieszeni('dom', 'sredni', 3, lambda p: rng.choice([('artefakt', None), ('skrzynia', None), ('surowiec', 'odlamek')]))
    # Lista jak przed rundą 3: wiatraki i ogniska to dochód doliny. Bez nich
    # (próba w rundzie 3) autopilot nie zdobywał drugiej twierdzy do dnia 84.
    g.budowle(14, 'dom', [
        'ognisko', 'wiatrak', 'oboz-treningowy', 'zrodlo', 'ranczo', 'gniazdo',
        'drzewo-wiedzy', 'chatka', 'woz', 'kamienna-wieza',
    ])

    # --- TUNDRA --------------------------------------------------------------
    # Tundra i doliny twierdz losują z WŁASNEGO ziarna: pierwszy ekran zmienia
    # się z rundy na rundę (ślepe porównania), a każda zmiana w dolinie gracza
    # przesuwała losowanie całej reszty — inne straże przy twierdzach, inna
    # symulacja misji. Teraz poprawka doliny nie rusza północy.
    rng = g.rng = random.Random(ZIARNO + TUNDRA_ZIARNO)
    g.dodaj(18, 'pogranicze', (0, 999), lambda p: ('surowiec', rng.choice(['jagoda', 'odlamek', 'kamien', 'pokeball'])))
    kopalnie = ['odlamek', 'kamien', 'pokeball', 'odlamek', 'kamien', 'odlamek', 'pokeball']
    polozone = []
    for co in kopalnie:
        polozone += g.dodaj(1, 'pogranicze', (0, 999), lambda p, co=co: ('kopalnia', co))
    g.strzez([p for p, co in zip(polozone, kopalnie) if co in ('kamien', 'pokeball')], 'sredni')
    # Sad w tundrze — na ziemi jałowej albo łące, nigdy przy zaspie.
    g.dodaj_najpierw('pogranicze', lambda p: ('kopalnia', 'jagoda'), bez_sniegu(g, g.wolne_pola('pogranicze')), None)
    g.dodaj(10, 'pogranicze', (0, 999), lambda p: ('skrzynia', None))
    g.strzez(g.dodaj(5, 'pogranicze', (0, 999), lambda p: ('artefakt', None)), 'sredni')
    g.dodaj(4, 'pogranicze', (0, 999), lambda p: ('potwor', 'sredni'))
    g.skarb_w_kieszeni('pogranicze', 'sredni', 4, lambda p: rng.choice([('skrzynia', None), ('surowiec', 'kamien'), ('artefakt', None)]))
    g.skarb_w_kieszeni('pogranicze', 'silny', 4, lambda p: rng.choice([('artefakt', None), ('skrzynia', None)]))
    g.skarb_w_kieszeni('pogranicze', 'silny', 4, lambda p: rng.choice([('skrzynia', None), ('surowiec', 'pokeball')]))
    g.budowle(22, 'pogranicze', [
        'arena', 'wieza-obserwacyjna', 'kamienna-wieza', 'ranczo', 'gniazdo',
        'wiatrak', 'ognisko', 'chatka', 'woz', 'drzewo-wiedzy', 'zrodlo',
        'oboz-treningowy',
    ])
    g.para_portali('pogranicze')
    g.dodaj(1, 'pogranicze', (0, 999), lambda p: ('jasnowidz', None))

    # --- DOLINY TWIERDZ ------------------------------------------------------
    rng = g.rng = random.Random(ZIARNO + TWIERDZE_ZIARNO)
    # Prawie wszystko pod silną strażą. Nagroda rośnie z odległością: relikty
    # i kopalnie kamienia leżą w najdalszych kątach obu dolin.
    g.dodaj(14, 'wroga', (0, 999), lambda p: ('surowiec', rng.choice(['kamien', 'odlamek', 'pokeball'])))
    kopalnie = ['kamien', 'pokeball', 'odlamek', 'kamien', 'pokeball', 'odlamek']
    polozone = []
    for co in kopalnie:
        polozone += g.dodaj(1, 'wroga', (0, 999), lambda p, co=co: ('kopalnia', co))
    g.strzez([p for p, co in zip(polozone, kopalnie) if co in ('kamien', 'pokeball')], 'silny')
    g.strzez(g.dodaj(7, 'wroga', (0, 999), lambda p: ('skrzynia', None)), 'silny')
    g.dodaj(3, 'wroga', (0, 999), lambda p: ('potwor', 'silny'))
    g.skarb_w_kieszeni('wroga', 'wodz', 4, lambda p: rng.choice([('artefakt', None), ('skrzynia', None), ('surowiec', 'kamien')]))
    g.skarb_w_kieszeni('wroga', 'silny', 4, lambda p: rng.choice([('artefakt', None), ('skrzynia', None)]))
    g.budowle(14, 'wroga', [
        'osrodek-ewolucji', 'arena', 'kamienna-wieza', 'wieza-obserwacyjna',
        'gniazdo', 'drzewo-wiedzy', 'zrodlo', 'wiatrak', 'ognisko', 'woz',
    ])
    g.dodaj(1, 'wroga', (0, 999), lambda p: ('jasnowidz', None))
    najdalej = max(g.kroki.values())
    daleko = (int(najdalej * 0.8), 999)
    g.strzez(g.dodaj(3, 'wroga', daleko, lambda p: ('artefakt', None)), 'wodz')
    g.strzez(g.dodaj(2, 'wroga', daleko, lambda p: ('skrzynia', None)), 'silny')


NAGLOWEK = '''// PLIK GENEROWANY — nie poprawiaj ręcznie.
// Źródło: tools/mapy/twierdza.py (szkic i rozstawienie), silnik: tools/generuj_mape.py.
//
// Plansza 72 × 72 („Twierdza”, rozmiar M) — misja 4, „Oblężenie Groty”.
// Dolina gracza na południu, tundra z zamarzniętym jeziorem pośrodku, dwie
// twierdze wroga w śnieżnych dolinach na północy, rozdzielone skalnym
// grzbietem z jedną przełęczą.
// Znaki: . trawa, = ścieżka, , piasek, j ziemia jałowa, s śnieg, b bagno,
// T las, # skały, ~ woda.
'''

#: Najtrudniejsza misja: przeciwnik naciera od osiemnastego dnia i od początku
#: wie, gdzie stoi zamek gracza; obie twierdze mają załogę z czterech poziomów.
USTAWIENIA = {
    'wrog': 'aktywny',
    'natarcie': True,
    'dzienNatarcia': 21,
    'nazwyZamkowWroga': ['Lodowa Twierdza', 'Srebrna Strażnica'],
    # Zestaw sprite'ów klimatu dla sceny (`public/mapa/zima/`) — patrz STAN.md.
    'zestaw': 'zima',
    'garnizonWroga': {'poziomy': [0, 1, 2, 3], 'tygodnie': 1},
    # Twierdze bez fortu: przyrost bez premii o połowę. Z fortem armia wroga
    # rosła szybciej, niż jakikolwiek gracz zdążyłby dojść do pierwszej z nich.
    'budynkiWroga': ['ratusz1', 'siedlisko1', 'siedlisko2'],
    'wrogBuduje': False,
    # Zamek gracza z mocniejszą załogą — bohater jest wtedy daleko na północy,
    # a opis misji obiecuje, że wróg przyjdzie. Ma przyjść i ma to być groźne,
    # ale nie wyrok w trzecim tygodniu.
    'garnizonGracza': {'poziomy': [0, 1, 2], 'tygodnie': 8},
    'wrogOdkryte': [{'x': 10, 'y': 64, 'promien': 5}],
    # I odwrotnie: gracz wie, gdzie stoją obie twierdze — misja mówi „na
    # północy", a mapa to pokazuje. Zagadką jest droga, nie szukanie celu.
    # Dolina gracza jest mu znana — to jego ziemia od trzech misji — więc na
    # starcie widać cały pierwszy ekran, a nie wyspę w czarnej mgle.
    'odkryte': [
        {'x': 58, 'y': 8, 'promien': 4},
        {'x': 13, 'y': 10, 'promien': 4},
        {'x': 13, 'y': 62, 'promien': 13},
    ],
    # Runda 3 (wzorzec HotA): znajdźki na pół pola z cieniem i rysunkiem stosu
    # leżącego w śniegu (`public/mapa/zima/stos-*.png`) zamiast ikon z paska.
    'znajdzki': 0.5,
}

#: Zima: łąka wypłowiała i chłodna, jeziora skute lodem, bór ciemny i sinawy.
BARWY_TERENU = {
    # „Łąka" to tu zmarznięta, zasypana darń: tekstura śniegu z wystającymi
    # źdźbłami (TEKSTURY), lekko płowa — odróżnia się od zasp, ale nie jest
    # zielona. Runda 2: „śnieg to białe plamy na zielonej trawie".
    'trawa': {'nasycenie': 0.9, 'barwa': (215, 212, 200), 'moc': 0.35, 'jasnosc': 0.97},
    # „Woda" to tu LÓD: tekstura śniegu (patrz TEKSTURY) przebarwiona na
    # błękit, z rysami pęknięć. Przebarwiona tekstura wody zostawiała jasne
    # linie załamań światła, które w ślepym porównaniu czytały się jak
    # „niebieska błyskawica przy krawędzi".
    # Runda 3: jasny lód zlewał się ze śniegiem w „mgiełkę" — tafla jest
    # teraz głębsza i chłodniejsza, a jasny szron zostaje tylko przy brzegu.
    'woda': {'nasycenie': 1.1, 'barwa': (120, 170, 225), 'moc': 0.6, 'jasnosc': 0.86},
    # Pod borem śnieg w cieniu drzew, nie zielona ściółka.
    'las': {'nasycenie': 1.0, 'barwa': (150, 175, 215), 'moc': 0.35, 'jasnosc': 0.86},
    'skaly': {'nasycenie': 0.6, 'barwa': (150, 160, 180), 'moc': 0.4, 'jasnosc': 0.95},
    'jalowa': {'nasycenie': 0.8, 'barwa': (160, 165, 180), 'moc': 0.3, 'jasnosc': 1.05},
    # Ubity, zmarznięty trakt: brąz ziemi przyprószony szronem, bez
    # pomarańczowego piasku i zielonych kępek.
    'sciezka': {'nasycenie': 0.45, 'barwa': (170, 158, 150), 'moc': 0.3, 'jasnosc': 0.88},
}

#: Jeziora są skute lodem — bez shadera wody (patrz `render_mapa.py`).
WODA_ANIMOWANA = False

#: Runda 2 po ślepym porównaniu ("śnieg to blada mgła, lód to błyskawica"):
#: zaspy z niebieskim cieniem i iskrami, lód z rysami zamiast tafli wody,
#: droga z brzegiem, las w zwartych masach, gęsty pierwszy ekran.
#: Runda 3: bez efektu `lod` — jego rysy na turkusowym lodzie (`lod-2`) znów
#: czytały się jak „błyskawice"; tekstura ma własne, delikatne pęknięcia.
EFEKTY = ['zaspy', 'obwodka_drogi', 'relief_sniezny', 'bez_placow']
TEKSTURY = {'woda': ['lod-2', 'lod', 'snieg'], 'trawa': ['snieg-2', 'snieg'], 'las': ['snieg']}
SKUP_LAS = True
#: Pas przy ramie liczony dla dawnej kamery (14 × 12 pól) leżał po oddaleniu
#: w środku ekranu i zostawiał w nim pusty pierścień — brzeg pilnuje teraz
#: `kadr_szeroki`.
RAMKA_STARTU = False
#: Twardszy brzeg śniegu — granica ma być czytelna, a nie rozmyta w mgłę.
WTAPIANIE = {'snieg': 0.3, 'skaly': 0.28, 'las': 0.3, 'jalowa': 0.3, 'woda': 0.12}

#: Budowle pierwszego ekranu co najmniej trzy pola od siebie (silnik).
ODSTEP_KADRU = 3

#: Naklejki terenu (`public/mapa/tlo/`, prompty w `tools/PROMPTY-PLANSZE.md`).
NAKLEJKI = [
    (['glaz-sniezny-1', 'glaz-sniezny-2', 'glaz-sniezny-3'], 's', 0.06),
    (['zaspa-1', 'zaspa-2'], 's', 0.08),
    (['kra-lodu-2'], '~', 0.04),
    (['krzak-zimowy-1'], 'j', 0.08),
    # Runda 3: zmarznięta darń („.") też dostaje zaspy i głazy
    # — mniej pustych połaci bieli.
    (['zaspa-1', 'zaspa-2', 'glaz-sniezny-2'], '.', 0.07),
    # (Runda 3: bez martwego drzewa z bagiennym mchem — w śniegu czytało się
    # jak „liściaste drzewo przy zaspie"; zamiast niego świerczki niżej.)
    # Runda 3 (wzorzec HotA): „śnieg to białe plamy, dwie trzecie ekranu
    # puste". W HotA między obiektami stoją pojedyncze ośnieżone świerczki
    # i kępki — gęściej kry na lodzie i młode świerki na śniegu i darni.
    (['kra-lodu-1', 'kra-lodu-2'], '~', 0.09),
    (['swierczek-sniezny-1', 'swierczek-sniezny-2'], 's', 0.05),
    (['swierczek-sniezny-1'], '.', 0.03),
]
