"""„Dwie Doliny" — plansza 72 × 72, układ wg praktyki Heroes 3 (misja 2 kampanii).

Skąd ten układ
--------------
Poprzednia plansza (36 × 36) była przeniesieniem „Key to Victory”: jedna dolina
gracza, jedno pasmo gór, kraina przeciwnika za nim. Sprawdziła się, ale rozmiar
S w Heroes 3 to mapa na dwa tygodnie. Ta jest rozmiaru M (72 × 72, czyli cztery
razy więcej pól) i musi udźwignąć kilka tygodni gry, więc ma inną strukturę —
tę, którą w Heroes 3 mają dobre mapy 1 na 1:

    ┌──────────────────────────────┐  y 0–20   KRAINA PRZECIWNIKA
    │  zamek wroga, relikty,       │           (nagrody warte wyprawy)
    │  najsilniejsze straże        │
    ├───── grzbiet północny ───────┤  y 21–22  dwa pilnowane przejścia
    │                              │  y 23–44  PAS SPORNY
    │  jezioro, kopalnie, budowle, │           (tu toczy się środek gry)
    │  straże średnie              │
    ├───── grzbiet południowy ─────┤  y 45–46  dwa pilnowane przejścia
    │  zamek gracza, gospodarka,   │  y 47–71  DOLINA GRACZA
    │  straże słabe                │           (bezpieczny pierwszy tydzień)
    └──────────────────────────────┘

Trzy rzeczy, które robią z tego mapę, a nie plamę terenu:

1. **Trzy pasy zamiast dwóch.** Przy dwóch (dom / wróg) mapa ma jedno pytanie:
   „czy stać mnie już na przełamanie straży”. Trzeci pas, sporny, daje pytanie
   drugie — „co wziąć najpierw” — i to ono wypełnia środek gry.
2. **Przejścia są PRZESUNIĘTE względem siebie i wąskie.** Południowe leżą
   w kolumnach 13–14 i 49–50, północne w 21–22 i 57–58. Nie da się więc
   przejechać mapy w linii prostej. Szerokość dwóch pól jest wymuszona
   mechaniką: strażnik blokuje pas szeroki na trzy pola, więc szersze przejście
   da się obejść bokiem.
3. **Każde przejście ma inny koszt.** Główne to droga bita (70 punktów ruchu
   za pole), boczne to piasek (125) i leży w przeciwległym rogu mapy.

Ta plansza była pierwsza i to na niej wyszły wszystkie pułapki, które dziś łapie
silnik (`tools/generuj_mape.py`). Jej wynik — `src/data/plansza-teren.ts` — ma
zostać taki sam po każdej zmianie silnika: `tools/probe-mapa.ts` pilnuje odcisku.
"""

ID = 'dwie-doliny'
NAZWA = 'Dwie Doliny'

SKALA = 4
BOK = 72
ZIARNO = 20260913

# Szkic krain, 18 × 18. Każdy znak to kwadrat 4 × 4 pola.
#   .  trawa      ,  piasek     ~  woda
#   T  las        #  góry
#   s  śnieg      b  bagno      j  ziemia jałowa
#
# Trzy nowe tereny nie są ozdobą — każdy kosztuje inaczej (100 trawa,
# 125 ziemia jałowa, 150 śnieg, 175 bagno przy 70 za drogę), więc dokładają
# mapie pytanie „naokoło drogą czy na przełaj?". Rozłożone są tak, żeby każdy
# pas miał własny charakter: śnieg na północnych rubieżach wroga, bagno wokół
# jeziora w pasie spornym (tam, gdzie kusi skrót), ziemia jałowa na wschodniej
# rubieży przy bocznych przejściach.
#
# Wiersz szkicu = cztery wiersze planszy. Zamysł, pas po pasie:
#
#   0–4    kraina przeciwnika: lasy, dwa masywy gór, zatoka na zachodzie,
#          zamek wroga na północnym wschodzie (62, 8);
#   5      GRZBIET PÓŁNOCNY — pełny mur; przejścia wycina tabela PRZEJSCIA;
#   6–10   PAS SPORNY: jezioro pośrodku, lasy po bokach, najwięcej miejsca na
#          obiekty — to jest środek gry i ma być najgęściej zabudowany;
#   11     GRZBIET POŁUDNIOWY — pełny mur, jak wyżej;
#   12–17  dolina gracza: zamek na południowym zachodzie (8, 64), zatoka na
#          południowym wschodzie, reszta to gospodarka.
SZKIC = [
    '#s#ss.TTss.T.TT##.',
    'Ts.sTT.#Ts.T.T.sT#',
    '.T#s.T.T.sTT..T.jj',
    'T..~~..T#T..T.Tjjj',
    ',,.~~T..T..TT..jjj',
    '##################',
    'T.T#bb~~~bT.bTT.jj',
    '.,T.bb~~~~Tb.T#T.j',
    'T.T#Tbb~~~T.T.bTTj',
    '..TT.Tbb.T..T.TT.j',
    'T#..TT.b.T.TT..T.T',
    '##################',
    'T.T..TT..T..T.T.,,',
    '..TT#..TT...TT.,,,',
    'T#T...TT..T..~~,,.',
    '..T.TT..T.T..~~~T.',
    'T..TT...T#.T~~~.T.',
    '.TT..T.TT...T~~.T.',
]

#: Rdzenie obu grzbietów — wiersze, w których pasmo ma być NIEPRZERWANE.
#: Rozmycie pracuje na brzegach pasma (wiersze 20 i 23, 44 i 47), więc zarys
#: zostaje poszarpany, ale rdzenia nie rusza.
GRZBIETY = [
    ('północny', (21, 22)),
    ('południowy', (45, 46)),
]

#: Przejścia, wycinane po zasklepieniu. `(x0, y0, x1, y1)` — kolumny są proste
#: i pełnej wysokości pasma; przejście „na skos” wygląda w grze jak dwie osobne
#: dziury, między którymi jakoś się przechodzi.
#:
#: Kolumny przejść w obu grzbietach są RÓŻNE i to jest cały zamysł: wyjście
#: z doliny nie prowadzi wprost pod następne przejście, więc pas sporny trzeba
#: przeciąć w poprzek. Zmierzyliśmy, co się dzieje przy przejściach na cztery
#: pola: 74% planszy było dostępne bez jednej wygranej bitwy.
#:
#: Teren przejścia podajemy TUTAJ, a nie w szkicu. Wcześniej szkic miał w murze
#: gotową dziurę szeroką na komórkę szkicu, czyli cztery pola — i `zasklep`
#: nie miał czego zasklepiać, bo zasklepia tylko tam, gdzie szkic mówi „góry”.
PRZEJSCIA = [
    ('północny', (21, 20, 22, 23), '.'),    # główne — droga bita na zamek wroga
    ('północny', (57, 20, 58, 23), ','),    # boczne — piasek, wschodnia rubież
    ('południowy', (13, 44, 14, 47), '.'),  # główne — wyjazd z doliny gracza
    ('południowy', (49, 44, 50, 47), ','),  # boczne — piasek, południowy wschód
]

#: Ile przejść ma mieć KAŻDY grzbiet. Sprawdzane na końcu: gdyby rozmycie albo
#: zmiana szkicu dorobiła trzecie, cała mapa straciłaby sens, a wyglądałaby
#: dokładnie tak samo.
PRZEJSC_W_GRZBIECIE = 2

#: Punkty orientacyjne, w polach mapy 72 × 72.
#:
#: Gracz siedzi na południowym zachodzie, przeciwnik na północnym wschodzie —
#: po przekątnej, czyli najdalej, jak się da.
PUNKTY = {
    'start': (10, 62),
    'zamek gracza': (8, 64),
    'sad': (20, 66),
    'zatoka poludniowa': (60, 66),
    'rozstaje doliny': (26, 56),
    'podnoze poludniowe': (14, 50),
    'przelecz poludniowa': (13, 45),
    'brod': (26, 40),
    'jezioro': (41, 31),
    'wschodnie rozstaje': (54, 38),
    'podnoze polnocne': (21, 26),
    'przelecz polnocna': (21, 21),
    'polnocne rozstaje': (30, 16),
    'zamek wroga': (62, 8),
    'polnocna polana': (10, 10),
}

#: Główny szlak. Drogę bitą dostaje tylko trasa przez oba GŁÓWNE przejścia —
#: boczne mają być mniej wygodne, tak jak w Heroes 3 podziemne obejście.
#:
#: Uwaga z poprzedniej mapy, kosztowała rundę: drugie przejście postawione
#: blisko startu robi z siebie SKRÓT, a nie alternatywę.
SZLAKI = [[
    'zamek gracza',
    'start',
    'sad',
    'rozstaje doliny',
    'zatoka poludniowa',
    'rozstaje doliny',
    'podnoze poludniowe',
    'przelecz poludniowa',
    'brod',
    'jezioro',
    'wschodnie rozstaje',
    'jezioro',
    'podnoze polnocne',
    'przelecz polnocna',
    'polnocne rozstaje',
    'zamek wroga',
    'polnocne rozstaje',
    'polnocna polana',
]]

# STRAŻNICE GRANICZNE — cztery, po jednej na przejście, zawsze w tym samym
# miejscu. Strażnicy NIE da się pokonać: otwiera ją klucz z namiotu klucznika
# stojącego gdzie indziej. Barwy są DWIE, nie cztery, i to jest kształt mapy:
# zielony klucz otwiera oba wyjazdy z doliny, niebieski oba wejścia do krainy
# wroga. Brama stoi W POPRZEK przejścia i blokuje trzy pola w swoim rzędzie.
STRAZNICE = [
    ((13, 44), 'zielony', 'Strażnica Przełęczy Południowej'),
    ((49, 44), 'zielony', 'Strażnica Piaskowego Wąwozu'),
    ((21, 20), 'niebieski', 'Strażnica Przełęczy Północnej'),
    ((57, 20), 'niebieski', 'Strażnica Północnej Rubieży'),
]

NAGLOWEK = '''// PLIK GENEROWANY — nie poprawiaj ręcznie.
// Źródło: tools/mapy/dwie_doliny.py (szkic i rozstawienie), silnik: tools/generuj_mape.py.
//
// Plansza 72 × 72 („Dwie Doliny”, rozmiar M) — trzy pasy rozdzielone dwoma
// grzbietami górskimi, każdy grzbiet z dwoma pilnowanymi przejściami:
// dolina gracza na południowym zachodzie, pas sporny pośrodku, kraina
// przeciwnika na północnym wschodzie.
// Znaki: . trawa, = ścieżka, , piasek, j ziemia jałowa, s śnieg, b bagno,
// T las, # skały, ~ woda.
'''

#: Misja 2 kampanii. Przeciwnik ma oba klucze od pierwszego dnia (patrz
#: `wrogKlucze` w `plansza.ts`), a gracz musi dopiero znaleźć dwa namioty
#: klucznika — przy domyślnym dniu natarcia (27) wróg stał pod zamkiem, zanim
#: dziecko otworzyło pierwszą bramę (symulacja: zamek padał dnia 31–32 także
#: przy grze normalnej). Natarcie od dnia 40 i mocniejsza załoga zamku dają
#: czas na szukanie kluczy; bierny gracz dalej przegrywa, tylko później.
USTAWIENIA = {
    'dzienNatarcia': 40,
    'garnizonGracza': {'poziomy': [0, 1, 2], 'tygodnie': 5},
}

GRANICA_POLUDNIOWA = GRZBIETY[1][1][1]   # 46 — ostatni wiersz rdzenia południowego
GRANICA_POLNOCNA = GRZBIETY[0][1][0]     # 21 — pierwszy wiersz rdzenia północnego


def strefa(x, y):
    """Strefa pola — wyznaczona przez grzbiety, bo to one dzielą tę mapę.

    O tym, co gdzie stoi, decyduje STREFA, a nie odległość w linii prostej —
    gracz startuje w rogu, więc przeciwległy kraniec jego własnej doliny wypada
    „dalej” niż zamek wroga za grzbietem.
    """
    if y < GRANICA_POLNOCNA:
        return 'wroga'
    if y <= GRANICA_POLUDNIOWA:
        return 'pogranicze'
    return 'dom'


def rozstaw(g):
    """Kolejność stawiania obiektów. Zmiana kolejności zmienia CAŁĄ planszę
    (jedno ziarno losowania), więc nie przestawiać bez powodu.

    Gęstość jest dobrana do rozmiaru: Heroes 3 na mapie M trzyma obiekt mniej
    więcej co 20–25 pól przejezdnych i tyle tu celujemy, z ciężarem przesuniętym
    na pas sporny — to on ma być powodem, żeby wyjść z doliny.
    """
    rng = g.rng

    # --- DOLINA GRACZA -----------------------------------------------------
    # Pierwszy tydzień. Ma być co robić od pierwszego dnia, bez jednej przegranej
    # bitwy: cztery stosy surowca i dwie skrzynie leżą w zasięgu pierwszych tur,
    # a pierwsza kopalnia stoi bez straży.
    g.dodaj(4, 'dom', (3, 10), lambda p: ('surowiec', rng.choice(['jagoda', 'pokeball'])))
    g.dodaj(2, 'dom', (3, 10), lambda p: ('skrzynia', None))
    g.dodaj(1, 'dom', (4, 10), lambda p: ('kopalnia', 'jagoda'))
    g.dodaj(2, 'dom', (6, 12), lambda p: ('potwor', 'slaby'))

    # Reszta doliny. Surowce kopalń są WYPISANE, nie losowane: losowanie potrafiło
    # nie dać dolinie ani jednej kopalni odłamków, a odłamkami płaci się za całą
    # górną połowę drzewka miasta.
    g.dodaj(10, 'dom', (10, 40), lambda p: ('surowiec', rng.choice(['jagoda', 'odlamek', 'pokeball'])))
    kopalnie_dom = []
    for co in ['odlamek', 'jagoda', 'odlamek', 'pokeball', 'jagoda', 'pokeball']:
        kopalnie_dom += g.dodaj(1, 'dom', (10, 40), lambda p, co=co: ('kopalnia', co))
    # PODSTAWOWE KOPALNIE STOJĄ OTWOREM. Pilnowany jest tylko obóz z pokeballami,
    # czyli odpowiednik kopalni złota.
    g.strzez([p for p, co in zip(kopalnie_dom, ['odlamek', 'jagoda', 'odlamek', 'pokeball', 'jagoda', 'pokeball']) if co == 'pokeball'], 'slaby')
    g.dodaj(6, 'dom', (10, 40), lambda p: ('skrzynia', None))
    g.dodaj(3, 'dom', (12, 40), lambda p: ('potwor', 'slaby'))
    g.dodaj(2, 'dom', (14, 40), lambda p: ('artefakt', None))

    # Dwie kieszenie ze skarbem w dolinie: pierwsza nagroda za wygraną bitwę,
    # jeszcze w bezpiecznym pasie.
    g.skarb_w_kieszeni('dom', 'slaby', 3, lambda p: ('skrzynia', None))
    g.skarb_w_kieszeni('dom', 'sredni', 3, lambda p: rng.choice([('artefakt', None), ('skrzynia', None), ('surowiec', 'odlamek')]))
    g.budowle(18, 'dom', [
        'ognisko', 'chatka', 'wiatrak', 'zrodlo', 'oboz-treningowy', 'ranczo',
        'gniazdo', 'drzewo-wiedzy', 'woz',
    ])

    # NAMIOT KLUCZNIKA — zielony. Stoi w dolinie, czyli po TEJ stronie obu bram,
    # które otwiera. Namiot za bramą, którą sam otwiera, zamyka mapę na głucho —
    # dlatego sprawdzamy to niżej, etapami, a nie wzrokiem. Zakres kroków od 16:
    # klucz ma być nagrodą za objechanie doliny, a nie rzeczą leżącą przy zamku.
    g.dodaj(1, 'dom', (16, 45), lambda p: ('namiot', 'zielony'))

    # --- PAS SPORNY --------------------------------------------------------
    # Środek gry i najgęstszy kawałek mapy. Nagroda ROŚNIE Z ODLEGŁOŚCIĄ: mapy
    # wzorcowe mają wyraźny garb obiektów w trzecim i czwartym pasie odległości
    # od startu (Hatchet Axe and Saw: 28/60/49/108/81), a nasza pierwsza wersja
    # miała rozkład płaski: 30/82/47/43/33.
    g.dodaj(22, 'pogranicze', (0, 999), lambda p: ('surowiec', rng.choice(['jagoda', 'odlamek', 'kamien', 'pokeball'])))
    kopalnie_srodek = []
    for co in ['odlamek', 'kamien', 'pokeball', 'odlamek', 'kamien', 'jagoda', 'pokeball', 'odlamek']:
        kopalnie_srodek += g.dodaj(1, 'pogranicze', (0, 999), lambda p, co=co: ('kopalnia', co))
    # Pilnowane są kopalnie DROGIE — kamień i pokeballe.
    g.strzez(
        [p for p, co in zip(kopalnie_srodek, ['odlamek', 'kamien', 'pokeball', 'odlamek', 'kamien', 'jagoda', 'pokeball', 'odlamek']) if co in ('kamien', 'pokeball')],
        'sredni',
    )
    g.dodaj(12, 'pogranicze', (0, 999), lambda p: ('skrzynia', None))
    g.dodaj(5, 'pogranicze', (0, 999), lambda p: ('artefakt', None))
    g.dodaj(4, 'pogranicze', (0, 999), lambda p: ('potwor', 'sredni'))

    # Trzy kieszenie: za strażą leżą trzy–cztery rzeczy naraz, więc bitwa ma stawkę.
    g.skarb_w_kieszeni('pogranicze', 'sredni', 4, lambda p: rng.choice([('skrzynia', None), ('surowiec', 'kamien'), ('artefakt', None)]))
    g.skarb_w_kieszeni('pogranicze', 'silny', 4, lambda p: rng.choice([('artefakt', None), ('skrzynia', None)]))
    g.skarb_w_kieszeni('pogranicze', 'silny', 4, lambda p: rng.choice([('skrzynia', None), ('surowiec', 'pokeball')]))
    g.budowle(26, 'pogranicze', [
        'arena', 'wieza-obserwacyjna', 'kamienna-wieza', 'ranczo', 'gniazdo',
        'wiatrak', 'ognisko', 'chatka', 'woz', 'drzewo-wiedzy', 'zrodlo',
        'oboz-treningowy',
    ])
    # Para portali — oba PO TEJ SAMEJ stronie grzbietu. Para przez grzbiet
    # obchodziłaby strażników przełęczy i unieważniała cały układ mapy.
    g.para_portali('pogranicze')

    # CHATA JASNOWIDZA — jedyny obiekt, który każe wrócić w to samo miejsce.
    g.dodaj(1, 'pogranicze', (0, 999), lambda p: ('jasnowidz', None))

    # NAMIOT KLUCZNIKA — niebieski, w pasie spornym, PRZED bramami, które otwiera.
    g.dodaj(1, 'pogranicze', (0, 999), lambda p: ('namiot', 'niebieski'))

    # --- KRAINA PRZECIWNIKA ------------------------------------------------
    # Relikty, kopalnie kamienia i najsilniejsze straże na mapie.
    g.dodaj(15, 'wroga', (0, 999), lambda p: ('surowiec', rng.choice(['kamien', 'odlamek', 'pokeball'])))
    kopalnie_wroga = []
    for co in ['kamien', 'kamien', 'pokeball', 'odlamek', 'kamien', 'pokeball', 'jagoda', 'odlamek']:
        kopalnie_wroga += g.dodaj(1, 'wroga', (0, 999), lambda p, co=co: ('kopalnia', co))
    g.strzez(
        [p for p, co in zip(kopalnie_wroga, ['kamien', 'kamien', 'pokeball', 'odlamek', 'kamien', 'pokeball', 'jagoda', 'odlamek']) if co in ('kamien', 'pokeball')],
        'silny',
    )
    g.dodaj(9, 'wroga', (0, 999), lambda p: ('skrzynia', None))
    g.dodaj(5, 'wroga', (0, 999), lambda p: ('artefakt', None))
    g.dodaj(4, 'wroga', (0, 999), lambda p: ('potwor', 'silny'))

    g.skarb_w_kieszeni('wroga', 'silny', 4, lambda p: rng.choice([('artefakt', None), ('skrzynia', None)]))
    g.skarb_w_kieszeni('wroga', 'wodz', 5, lambda p: rng.choice([('artefakt', None), ('skrzynia', None), ('surowiec', 'kamien')]))
    g.skarb_w_kieszeni('wroga', 'wodz', 4, lambda p: rng.choice([('artefakt', None), ('surowiec', 'kamien')]))
    g.budowle(20, 'wroga', [
        'osrodek-ewolucji', 'arena', 'kamienna-wieza', 'wieza-obserwacyjna',
        'gniazdo', 'ranczo', 'wiatrak', 'ognisko', 'drzewo-wiedzy', 'woz',
        'zrodlo', 'chatka',
    ])
    g.para_portali('wroga')
    # Druga chata, w krainie wroga: droższa i płaci reliktem.
    g.dodaj(1, 'wroga', (0, 999), lambda p: ('jasnowidz', None))

    # --- SKARBIEC KRAŃCA MAPY ----------------------------------------------
    # Poprawka po ślepym porównaniu: „pogranicze jest tłuste, a najdalszy,
    # najdroższy pierścień pusty; cel wyprawy nie płaci”. Ostatnie 20% zasięgu
    # dostaje własny skarbiec, pilnowany przez najsilniejsze straże na mapie.
    najdalej = max(g.kroki.values())
    daleko = (int(najdalej * 0.8), 999)
    kraniec_artefakty = g.dodaj(5, 'wroga', daleko, lambda p: ('artefakt', None))
    g.strzez(kraniec_artefakty[:3], 'wodz')
    g.strzez(kraniec_artefakty[3:], 'silny')
    kraniec_skrzynie = g.dodaj(6, 'wroga', daleko, lambda p: ('skrzynia', None))
    g.strzez(kraniec_skrzynie[:4], 'silny')
    kraniec_kopalnie = []
    for co in ['kamien', 'pokeball', 'odlamek']:
        kraniec_kopalnie += g.dodaj(1, 'wroga', daleko, lambda p, co=co: ('kopalnia', co))
    g.strzez(kraniec_kopalnie, 'wodz')
    g.dodaj(3, 'wroga', daleko, lambda p: ('surowiec', rng.choice(['kamien', 'pokeball'])))
    g.budowle(6, 'wroga', ['osrodek-ewolucji', 'arena', 'kamienna-wieza', 'drzewo-wiedzy', 'zrodlo', 'gniazdo'], daleko)


def sprawdzenia(g):
    """MAPA MA TRZY AKTY I MUSI SIĘ DAĆ PRZEJŚĆ PO KOLEI.

    Namiot postawiony ZA bramą, którą sam otwiera, zamyka mapę na głucho. Nie
    widać tego ani na obrazku, ani w kodzie. Sprawdzamy więc drogę tak, jak
    przechodzi ją gracz:
      akt I   — bez kluczy trzeba dojść do NAMIOTU ZIELONEGO;
      akt II  — z zielonym trzeba dojść do NAMIOTU NIEBIESKIEGO;
      akt III — z oboma trzeba dojść do ZAMKU WROGA.
    """
    namioty = {co[1]: pole for pole, co in g.obiekty if co[0] == 'namiot'}
    if set(namioty) != {'zielony', 'niebieski'}:
        raise SystemExit(f'Namioty klucznika: {sorted(namioty)} — mają być dwa, po jednym na barwę.')
    start = PUNKTY['start']
    akty = [
        ('I: namiot zielony bez kluczy', (), namioty['zielony']),
        ('II: namiot niebieski z zielonym kluczem', ('zielony',), namioty['niebieski']),
        ('III: zamek wroga z obydwoma', ('zielony', 'niebieski'), PUNKTY['zamek wroga']),
    ]
    for nazwa, klucze, cel in akty:
        widziane = g.osiagalne_przy_obiektach(start, klucze)
        if not g.blisko(widziane, cel):
            raise SystemExit(f'Akt {nazwa}: cel {cel} jest nieosiągalny. Popraw rozstawienie namiotów.')
        print(f'  akt {nazwa}: OK ({len(widziane)} pól otworem)')
    # I odwrotnie: bez kluczy kraina wroga ma być NIEDOSTĘPNA.
    bez_kluczy = g.osiagalne_przy_obiektach(start)
    if g.blisko(bez_kluczy, PUNKTY['zamek wroga']):
        raise SystemExit('Do zamku wroga da się dojść BEZ kluczy — strażnice niczego nie pilnują.')
    print(f'  bez kluczy stoi otworem: {len(bez_kluczy)} pól')
