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

from generuj_mape import odleglosc

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
    'wrota polnocne': (14, 54),
    'wrota wschodnie': (19, 63),
    'sad': (21, 66),
    'rozstaje doliny': (25, 58),
    'wrota doliny wschodniej': (45, 51),
    'piaskowy wawoz': (49, 48),
    'zatoka poludniowa': (61, 66),
    'podnoze poludniowe': (14, 50),
    'przelecz poludniowa': (13, 45),
    'brod': (22, 40),
    'jezioro': (41, 31),
    'wschodnie rozstaje': (54, 38),
    'zachodni trakt': (18, 33),
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
SZLAKI = [
    # Główny trakt: z zamku prosto na północ, przez obie przełęcze, do zamku wroga.
    [
        'zamek gracza', 'start', 'wrota polnocne', 'podnoze poludniowe',
        'przelecz poludniowa', 'zachodni trakt', 'podnoze polnocne',
        'przelecz polnocna', 'polnocne rozstaje', 'zamek wroga',
    ],
    # Odnoga doliny: wschodnie wrota zatoki, sad, rozstaje i dolina wschodnia.
    ['start', 'wrota wschodnie', 'sad', 'rozstaje doliny', 'wrota doliny wschodniej', 'piaskowy wawoz'],
    ['wrota doliny wschodniej', 'zatoka poludniowa'],
    ['rozstaje doliny', 'podnoze poludniowe'],
    # Pas sporny: przez bród pod jeziorem na wschodnie rozstaje.
    ['przelecz poludniowa', 'brod', 'jezioro', 'wschodnie rozstaje'],
    # Kraina wroga: boczna odnoga na północną polanę.
    ['polnocne rozstaje', 'polnocna polana'],
]

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
#: Obiekty stoją też na śniegu i jałowej ziemi — inaczej cała północna
#: rubież i śnieżne pole byłyby puste.
POD_OBIEKTY = '.,js'

#: Las w zwarte masy (automat komórkowy silnika): rozmycie szkicu sypało
#: pojedyncze drzewa po łące — „kępy po 4–8 pól bez masywu" (werdykt E4).
SKUP_LAS = True

USTAWIENIA = {
    # Mapa świata w stylu Pokémon: las i skały z klocków (`src/data/klocki.ts`).
    'klocki': 'trawa',
    # Krzaki i stosy znajdźek z zestawu Polany (ta sama łąka).
    'zestaw': 'polana',
    'znajdzki': 0.68,
    'dzienNatarcia': 40,
    'garnizonGracza': {'poziomy': [0, 1, 2], 'tygodnie': 5},
}

GRANICA_POLUDNIOWA = GRZBIETY[1][1][1]   # 46 — ostatni wiersz rdzenia południowego
GRANICA_POLNOCNA = GRZBIETY[0][1][0]     # 21 — pierwszy wiersz rdzenia północnego


def _prostokat(mapa, x0, y0, x1, y1, teren, tylko=None, procz='#~'):
    """Maluje prostokąt (włącznie z krawędziami). `tylko` — tylko te znaki
    są zamieniane; `procz` — te zostają zawsze."""
    for y in range(max(0, y0), min(BOK - 1, y1) + 1):
        for x in range(max(0, x0), min(BOK - 1, x1) + 1):
            z = mapa[y][x]
            if z in procz:
                continue
            if tylko is not None and z not in tylko:
                continue
            mapa[y][x] = teren


#: Zatoka startowa: x 0–17, y 57–71, zamknięta murem lasu z dwoma wyjściami —
#: północnym (kolumny 13–14, pod główny trakt) i wschodnim (wiersze 63–64, do
#: sadu). Ściana wschodnia doliny: x 44–45 z jedną wyrwą (wiersze 51–52).
ZATOKA = (0, 57, 17, 71)
WROTA_POLNOCNE = (13, 14)      # kolumny wyjścia północnego, y 51–56
WROTA_WSCHODNIE = (63, 64)     # wiersze wyjścia wschodniego, x 18–19
SCIANA_WSCHODNIA = (44, 45)    # kolumny muru doliny wschodniej, y 47–71
WYRWA_WSCHODNIA = (51, 52)     # wiersze wyrwy w tym murze
#: Bród pod jeziorem: zatoka wody x 24–30, y 34–38, pas brodu w wierszach
#: 39–40, skała pod nim (41–43) — jedyne przejście z zachodniej części pasa
#: spornego na wschodnią, szerokie na dwa pola.
BROD = (24, 30, 39, 40)
#: Kieszeń zatoki południowo-wschodniej: pasek brzegu x 59–64, y 63–71 za
#: szyjką w kolumnie 64 (wiersze 60–62).
SZYJKA_ZATOKI = (64, 61)
#: Szyjka zachodniego traktu (pas sporny): między lasem a jeziorem droga
#: z bramy południowej na północną przechodzi JEDNYM polem (19, 36) — tu
#: stoi średnia straż, pierwsza bitwa pasa spornego.
SZYJKA_TRAKTU = (19, 36)
#: Kieszeń w południowo-zachodnim rogu zatoki startowej (x 0–3, y 68–71),
#: wejście polami (1–2, 67), straż na (2, 67).
SZYJKA_ROGU = (2, 67)
#: Luka w murze wierszy 55–56 między rozstajami a podnóżem zachodnim.
LUKA_ROZSTAJOW = (25, 26)


def popraw_teren(g, mapa):
    """Teren po rozmyciu szkicu, przed drogami. Werdykt ślepego porównania
    (runda 1): plamy terenu bez powodu, zamek na otwartej łące, straże na
    placu. Tu powstają szyjki, wokół których rozstawia się resztę.
    """
    # --- E3: tereny mają powód ----------------------------------------------
    # Jedno pole śniegu na północnych rubieżach (x 0–30, y 0–8), a nie cztery
    # plamy po komórkach szkicu; reszta śniegu wraca do łąki.
    _prostokat(mapa, 0, 0, 30, 8, 's', tylko='.,')
    for y in range(BOK):
        for x in range(BOK):
            if mapa[y][x] == 's' and not (x <= 30 and y <= 8):
                mapa[y][x] = '.'
            # Bagno tylko w pierścieniu jeziora środkowego.
            if mapa[y][x] == 'b' and not (16 <= x <= 41 and 23 <= y <= 43):
                mapa[y][x] = '.'
    # Bezcelowe plamy piasku przy zachodniej krawędzi.
    _prostokat(mapa, 0, 14, 11, 19, '.', tylko=',')
    _prostokat(mapa, 0, 25, 10, 31, '.', tylko=',')

    # --- Bród pod jeziorem (zmiana 2 z werdyktu) ---------------------------
    x0, x1, by0, by1 = BROD
    _prostokat(mapa, x0, 34, x1, by0 - 1, '~', procz='')
    _prostokat(mapa, x0, by0, x1, by1, ',', procz='')   # bród — piasek, widać mieliznę
    _prostokat(mapa, x0, by1 + 1, x1, 43, '#', procz='')
    _prostokat(mapa, x0 - 2, by0, x0 - 1, by1, '.', procz='')   # dojście od zachodu
    _prostokat(mapa, x1 + 1, by0, x1 + 2, by1, '.', procz='')   # i od wschodu

    # --- Zatoka startowa (zmiana 1) ----------------------------------------
    zx0, zy0, zx1, zy1 = ZATOKA
    # Wnętrze: łąka z zachowanymi skałami, las tylko tam, gdzie go kładziemy.
    _prostokat(mapa, zx0, zy0, zx1, zy1, '.', tylko='T,')
    _prostokat(mapa, 3, 57, 7, 58, '#', procz='')             # skalny występ
    _prostokat(mapa, 4, 68, 4, 71, 'T', procz='')             # mur kieszeni w rogu
    mapa[67][0] = 'T'
    mapa[67][3] = 'T'
    _prostokat(mapa, 0, 68, 3, 71, '.', procz='')             # kieszeń w rogu
    # Mur północny (wiersze 55–56) z wyjściem w kolumnach 13–14.
    # Mur w wierszach 55–56 ciągnie się od zachodniej krawędzi do kolumny 35:
    # oddziela podnóże zachodnie (droga do bramy) od sadu i południowej łąki.
    # Jedyna luka — rozstaje (25–26, 55–56) — dostaje słabą straż; drugie
    # dojście do podnóża zachodniego to przesmyk wrót północnych (też straż).
    # Podnóże wschodnie (x 29–43) łączy się z łąką luką w kolumnach 36–42 i
    # należy, jak sad i łąka, do pierwszego tygodnia: bez bitwy stoi otworem
    # zatoka + zakątek + sad + łąka + podnóże wschodnie (~23 %), a nie cała
    # dolina (34 % w rundzie 1).
    _prostokat(mapa, 0, 55, 35, 56, 'T', procz='')
    _prostokat(mapa, LUKA_ROZSTAJOW[0], 55, LUKA_ROZSTAJOW[1], 56, '.', procz='')
    _prostokat(mapa, 24, 57, 27, 59, '.', procz='')           # plac rozstajów
    _prostokat(mapa, 27, 47, 28, 54, 'T')                     # mur podnóże zach. | wsch.
    # Łąka izby: trzy kępy lasu z rozmycia na polany (ciasne kępy po 4–8 pól
    # zasłaniały sad, a izba ma być łąką z brzegami, nie sitem).
    _prostokat(mapa, 26, 68, 31, 70, '.', tylko='T')
    _prostokat(mapa, 32, 61, 34, 63, '.', tylko='T')
    _prostokat(mapa, 30, 53, 34, 54, '.', tylko='T')
    _prostokat(mapa, 15, 51, 19, 54, '#', procz='')
    _prostokat(mapa, 12, 51, 12, 54, 'T', procz='')
    _prostokat(mapa, WROTA_POLNOCNE[0], 50, WROTA_POLNOCNE[1], 56, '.', procz='')
    # Mur wschodni: nad wyjściem las w kolumnach 20–23 (wiersze 57–62), pod
    # wyjściem kolumny 18–19; wyjście w wierszach 63–64.
    _prostokat(mapa, 20, 57, 23, 62, 'T', procz='')           # las nad wyjściem
    _prostokat(mapa, 18, 65, 19, 71, 'T', procz='')
    _prostokat(mapa, 18, WROTA_WSCHODNIE[0], 21, WROTA_WSCHODNIE[1], '.', procz='')
    _prostokat(mapa, 20, 65, 20, 67, '.', procz='')           # dojście do sadu

    # --- Ściana doliny wschodniej z jedną wyrwą (szyjka pod słabą straż) ---
    sx0, sx1 = SCIANA_WSCHODNIA
    _prostokat(mapa, sx0, 47, sx1, 71, 'T', procz='#')
    _prostokat(mapa, sx0, WYRWA_WSCHODNIA[0], sx1, WYRWA_WSCHODNIA[1], '.', procz='')
    _prostokat(mapa, sx0 - 2, WYRWA_WSCHODNIA[0], sx0 - 1, WYRWA_WSCHODNIA[1], '.', procz='')
    _prostokat(mapa, sx1 + 1, WYRWA_WSCHODNIA[0], sx1 + 2, WYRWA_WSCHODNIA[1], '.', procz='')

    # --- Zatoka południowo-wschodnia: szyjka w kolumnie 64 (zmiana 3) -------
    _prostokat(mapa, 65, 59, 66, 71, 'T', procz='~')
    _prostokat(mapa, 64, 59, 64, 71, '.', tylko='T#')
    _prostokat(mapa, 59, 63, 63, 71, '.', tylko='T')          # pasek brzegu — łąka
    _prostokat(mapa, 67, 59, 71, 71, '.', tylko='T')          # ślepa odnoga w rogu

    # --- Szczelność bram: brama blokuje trzy pola w swoim wierszu, ale pole
    # obok (np. (51, 44)) leżało na brzegu grzbietu jako łąka i po skosie
    # wchodziło się w przejście BEZ klucza (akt I otwierał 1600 pól zamiast
    # 900). W wierszu bramy wszystko poza przejściem, do 3 pól w bok, to skała.
    for (sx, sy), _, _ in STRAZNICE:
        x0, x1 = next((r[0], r[2]) for _, r, _ in PRZEJSCIA if r[1] <= sy <= r[3] and r[0] <= sx <= r[2])
        for x in range(sx - 3, sx + 4):
            if g.w(x, sy) and not (x0 <= x <= x1):
                mapa[sy][x] = '#'

    # --- Zakątek za wrotami północnymi: x 0–10, y 47–54, wejście (9–12, 52–53);
    # kolumna 11 (wiersze 48–50) zamknięta lasem, żeby zakątek nie łączył się
    # z podnóżem bokiem, omijając straż na końcu przesmyku.
    _prostokat(mapa, 9, 52, 12, 53, '.', procz='')
    _prostokat(mapa, 8, 48, 10, 51, '.', procz='')
    _prostokat(mapa, 11, 48, 11, 50, 'T', procz='')

    # --- Zachodnia łąka pasa spornego (x 0–9, y 24–41) była zamknięta na
    # głucho; dostaje szyjkę w kolumnie 8 (wiersze 39–40) pod średnią straż.
    _prostokat(mapa, 8, 39, 8, 40, '.', procz='')

    # --- Wschodnia rubież pasa spornego: dojście do bocznej przełęczy
    # północnej (57–58, 20–23) było odcięte skałą w wierszu 28, a jałowa
    # rubież (x 60–71) lasem w wierszu 39. Oba otwarte — inaczej druga
    # strażnica niczego nie pilnowała.
    _prostokat(mapa, 57, 24, 58, 30, ',', procz='')
    _prostokat(mapa, 59, 39, 66, 39, '.', procz='')

    # --- Szyjka zachodniego traktu (19, 36): las po obu stronach, jedno pole.
    for x, y in [(16, 35), (17, 35), (16, 36), (17, 36), (18, 36), (20, 36), (21, 36), (22, 36), (23, 36), (23, 37), (22, 37), (21, 37)]:
        if mapa[y][x] != '~':
            mapa[y][x] = 'T'
    for x, y in [(18, 35), (19, 35), (19, 36), (19, 37), (18, 37), (20, 37)]:
        mapa[y][x] = '.'

    # --- Północny brzeg jeziora (x 35–39, y 23–28): kieszeń z szyjką (40, 28–29)
    _prostokat(mapa, 35, 23, 39, 28, '.', tylko='b')
    _prostokat(mapa, 40, 28, 40, 29, '.', procz='')

    # --- Kraina wroga: dwie kieszenie krańca ---------------------------------
    # Północna polana (x 31–43, y 0–10) zarosła po skupieniu lasu — szyjka
    # (37–39, 11–13) pod silną straż. Pole śnieżne ma jedno wejście (26–27, 8)
    # pod wodza: zachodnie wyloty (12, 8) i (14–16, 8) zamknięte.
    for x, y in [(37, 11), (38, 11), (37, 12), (38, 12), (38, 13), (39, 13)]:
        mapa[y][x] = '.'
    mapa[8][12] = '#'
    _prostokat(mapa, 14, 8, 16, 8, 'T', procz='')
    _prostokat(mapa, 24, 8, 25, 8, 'T', procz='')
    # Ślepa odnoga w południowo-wschodnim rogu (x 67–71, y 59–71): szyjka
    # (68–69, 59–61).
    _prostokat(mapa, 67, 59, 67, 61, 'T', procz='')
    _prostokat(mapa, 70, 59, 71, 61, 'T', procz='')
    # Pojedyncze głazy z rozmycia wewnątrz zatoki startowej — na łąkę.
    for y in range(59, 72):
        for x in range(0, 18):
            if mapa[y][x] == '#':
                mapa[y][x] = '.'


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


def _wolne(g, x, y, wpis):
    """Czy na (x, y) da się postawić `wpis` bez naruszenia dróg i cudzych brył."""
    zajete = set(g.zajete) | {q for q, _ in g.obiekty} | g.blokada
    if not g.w(x, y) or (x, y) in zajete:
        return False
    teren = g.mapa[y][x]
    # Straż może stać w szyjce i na drodze (bród, przełęcz); reszta nie.
    if wpis[0] == 'potwor':
        if teren not in '.,js=b':
            return False
        return not g.koliduje_ze_straza((x, y), wpis) and odleglosc((x, y), PUNKTY['start']) > 2
    if teren not in POD_OBIEKTY or g.w_przejsciu(x, y) or g.ciasne(x, y):
        return False
    bryla = g.pola_bryly(wpis[0], wpis[1], (x, y))
    if any(q in zajete or g.mapa[q[1]][q[0]] == '=' for q in bryla):
        return False
    # Jak w `dodaj`: obiekt nie może odciąć niczego poza własnymi polami ani
    # zamknąć dojścia do wcześniej postawionych (bryła kopalni potrafi zatkać
    # jedyne wejście do zakątka — `postaw` sam tego nie sprawdza).
    zajmowane = [(x, y)] + bryla
    widziane = g.dostepnych(zajmowane)
    if len(widziane) < g.stan_dostepnych - len(zajmowane):
        return False
    dojdzie = lambda p: any(
        (p[0] + dx, p[1] + dy) in widziane for dy in (-1, 0, 1) for dx in (-1, 0, 1) if dx or dy
    )
    return dojdzie((x, y)) and all(dojdzie(p) for p, co in g.obiekty if co[0] != 'potwor')


def _postaw(g, miejsca, wpis):
    """Obiekt na pierwszym pasującym polu z listy — jak `postaw_kadr` Polany.
    Miejsce jest ZAMYSŁEM (szyjka, zakątek, zbocze), nie losem."""
    for x, y in miejsca:
        if not _wolne(g, x, y, wpis):
            continue
        try:
            return g.postaw((x, y), wpis)
        except SystemExit:
            continue
    print(f'  brak miejsca na {wpis} w {miejsca}')
    return None


def _stos(g, srodek, rzeczy, r=2):
    """Stos 2–4 rzeczy w zakątku wokół `srodek` (promień r, w razie
    ciasnoty 4). To jest odpowiedź na „konfetti po całej łące": surowce
    leżą tam, gdzie prowadzi droga albo kończy się odnoga."""
    ktora = strefa(*srodek)
    polozone = []
    for rzecz in rzeczy:
        for promien in (r, r + 2):
            kand = [q for q in g.wolne_pola(ktora, (0, 999)) if odleglosc(q, srodek) <= promien]
            if not kand:
                continue
            try:
                polozone += g.dodaj(1, ktora, (0, 999), lambda p, rzecz=rzecz: rzecz, kandydaci=kand)
                break
            except SystemExit:
                continue
    return polozone


def _kieszen(g, szyjki, sila, srodek, rzeczy, r=3):
    """Zakątek za JEDNĄ strażą: najpierw skarb w środku, potem straż w szyjce."""
    polozone = _stos(g, srodek, rzeczy, r)
    straz = _postaw(g, szyjki, ('potwor', sila)) if polozone else None
    return polozone, straz


def _bez_zajetych_kieszeni(g):
    """Kieszenie znalezione przez silnik, które pokrywają się z ręcznie
    skomponowanymi zakątkami, odpadają — inaczej stałyby tam dwie straże."""
    zajete = {q for q, _ in g.obiekty}
    for z in list(g.kieszenie):
        g.kieszenie[z] = [k for k in g.kieszenie[z] if not (set(k[1]) & zajete) and k[0] not in zajete]


def rozstaw(g):
    """Rozstawienie SKOMPONOWANE wokół drogi i szyjek (po przegranym ślepym
    porównaniu rundy 1: „obiekty rozsypane losowo w strefie, straże na placu,
    surowce pojedynczo w polu"). Każdy zakątek ma swoją listę rzeczy, każda
    szyjka swoją straż; losowanie zostaje tylko w obrębie zakątka (które pole
    z kilku) i w kilku luźnych dosypkach na końcu.

    Współrzędne są z siatki 72 × 72, (0, 0) w lewym górnym rogu; miejsca są
    listami kandydatów — pierwsze wolne wygrywa, więc drobna zmiana rozmycia
    nie wywraca kompozycji.
    """
    rng = g.rng
    # Korytarze dojść do czterech bram zostają PUSTE: skrzynia w piaskowym
    # wąwozie szerokim na dwa pola to skrzynia, którą trzeba obejść bokiem.
    g.zajete += [(x, y) for x in (13, 14) for y in range(40, 51)]
    g.zajete += [(x, y) for x in (49, 50) for y in range(39, 51)]
    g.zajete += [(x, y) for x in (21, 22) for y in range(17, 28)]
    g.zajete += [(x, y) for x in (57, 58) for y in range(17, 32)]

    # ===================================================================
    # DOLINA GRACZA
    # ===================================================================
    # --- Zatoka startowa (x 0–17, y 57–71): pierwszy ekran -----------------
    # Kopalnie podstawowe wcięte w skałę i w zbocze, bez straży (A2); stos
    # surowców i skrzynie przy zamku (A3); jedna słaba walka w rogu (A5).
    _postaw(g, [(4, 59), (5, 59), (3, 59), (4, 60)], ('kopalnia', 'odlamek'))
    _postaw(g, [(3, 64), (4, 64), (3, 65), (2, 64)], ('kopalnia', 'jagoda'))
    _postaw(g, [(15, 58), (16, 58), (15, 59), (14, 58)], ('budynek', 'wiatrak'))
    _postaw(g, [(14, 66), (15, 66), (14, 67)], ('budynek', 'ognisko'))
    _postaw(g, [(13, 69), (12, 69), (12, 68), (14, 70)], ('budynek', 'oboz-treningowy'))
    _postaw(g, [(12, 65), (12, 66), (13, 65)], ('surowiec', 'jagoda'))
    _postaw(g, [(13, 67), (12, 67), (14, 68)], ('surowiec', 'odlamek'))
    _postaw(g, [(6, 67), (5, 66), (7, 67)], ('surowiec', 'pokeball'))
    _postaw(g, [(16, 61), (16, 60), (15, 61)], ('surowiec', 'jagoda'))
    _postaw(g, [(15, 64), (16, 65), (15, 65)], ('skrzynia', None))
    _postaw(g, [(7, 60), (8, 60), (8, 59)], ('skrzynia', None))
    _stos(g, (1, 60), [('surowiec', 'jagoda'), ('skrzynia', None)], r=2)
    _stos(g, (8, 69), [('surowiec', 'pokeball'), ('surowiec', 'jagoda')], r=2)
    # Kieszeń w rogu: artefakt, skrzynia i stos za słabą strażą na (2, 67).
    _stos(g, (1, 69), [('artefakt', None), ('skrzynia', None), ('surowiec', 'pokeball')], r=2)
    _postaw(g, [SZYJKA_ROGU, (1, 67)], ('potwor', 'slaby'))
    # WROTA PÓŁNOCNE: słaba straż na PÓŁNOCNYM końcu przesmyku (13–14, 50–52),
    # tam gdzie korytarz otwiera się na podnóże. Przesmyk i zakątek za wrotami
    # (x 0–12, y 47–54) należą jeszcze do strefy startowej — bez bitwy stoi
    # otworem zatoka plus ten zakątek (~13 %), nie cała dolina.
    _postaw(g, [(14, 51), (13, 51), (14, 52)], ('potwor', 'slaby'))
    # LUKA ROZSTAJÓW: słaba straż w luce muru (25–26, 55–56) — drugie wejście
    # na podnóże zachodnie, od strony sadu.
    _postaw(g, [(25, 55), (26, 55), (25, 56), (26, 56)], ('potwor', 'slaby'))
    _postaw(g, [(12, 53), (11, 53), (12, 52)], ('surowiec', 'odlamek'))
    # Zakątek za wrotami (x 0–8, y 47–54): źródło i dwie skrzynie.
    _postaw(g, [(6, 48), (5, 49), (5, 48)], ('budynek', 'zrodlo'))
    _stos(g, (3, 53), [('skrzynia', None), ('surowiec', 'jagoda')], r=2)
    _postaw(g, [(6, 50), (6, 49), (7, 50)], ('skrzynia', None))
    _stos(g, (9, 49), [('surowiec', 'pokeball'), ('surowiec', 'odlamek')], r=2)
    _postaw(g, [(2, 61), (2, 60), (3, 61)], ('budynek', 'chatka'))
    _postaw(g, [(16, 70), (17, 70), (16, 71)], ('budynek', 'gniazdo'))

    # --- Podnóże południowe (x 12–30, y 47–54): droga do bramy ----------------
    _postaw(g, [(17, 48), (18, 48), (16, 49), (17, 49)], ('kopalnia', 'odlamek'))
    _postaw(g, [(20, 49), (19, 49), (21, 49)], ('budynek', 'chatka'))
    _postaw(g, [(24, 52), (23, 52), (25, 52)], ('budynek', 'woz'))
    _postaw(g, [(27, 60), (28, 60), (28, 61), (26, 61)], ('budynek', 'wiatrak'))
    _stos(g, (28, 52), [('surowiec', 'pokeball'), ('surowiec', 'jagoda')], r=2)
    _postaw(g, [(34, 50), (33, 50), (35, 50)], ('kopalnia', 'jagoda'))
    _stos(g, (39, 49), [('skrzynia', None), ('surowiec', 'odlamek')], r=2)
    _postaw(g, [(41, 49), (42, 49), (41, 48)], ('budynek', 'ognisko'))
    _postaw(g, [(37, 53), (36, 53), (38, 53), (37, 52)], ('budynek', 'gniazdo'))

    # --- Sad i południowa łąka (x 20–43, y 56–71) -----------------------------
    # Ranczo i gniazdo przeniesione tu z przeładowanego wschodniego węzła.
    _stos(g, (22, 64), [('surowiec', 'jagoda'), ('skrzynia', None)], r=2)
    _postaw(g, [(24, 67), (25, 67), (24, 68), (26, 67)], ('budynek', 'ranczo'))
    _postaw(g, [(27, 64), (28, 64), (27, 63)], ('budynek', 'gniazdo'))
    _postaw(g, [(26, 70), (25, 70), (26, 69)], ('budynek', 'woz'))
    pokeball_lak = _postaw(g, [(36, 67), (38, 67), (36, 68)], ('kopalnia', 'pokeball'))
    if pokeball_lak:
        g.strzez([pokeball_lak], 'slaby')
    _postaw(g, [(37, 70), (38, 70), (36, 70), (40, 70)], ('budynek', 'arena'))
    _postaw(g, [(37, 60), (36, 61), (38, 61)], ('kopalnia', 'jagoda'))
    _postaw(g, [(33, 57), (34, 57), (33, 58)], ('budynek', 'zrodlo'))
    # Dwa stosy z własną słabą strażą — zakątki łąki, nie konfetti.
    stos_a = _stos(g, (30, 62), [('skrzynia', None), ('surowiec', 'odlamek'), ('surowiec', 'pokeball')], r=2)
    if stos_a:
        g.strzez(stos_a[:1], 'slaby')
    stos_f = _stos(g, (42, 68), [('skrzynia', None), ('surowiec', 'jagoda'), ('surowiec', 'odlamek')], r=2)
    if stos_f:
        g.strzez(stos_f[:1], 'slaby')
    _postaw(g, [(35, 58), (36, 58), (35, 59)], ('surowiec', 'pokeball'))
    _postaw(g, [(24, 71), (23, 71), (25, 71)], ('budynek', 'oboz-treningowy'))
    _postaw(g, [(37, 71), (36, 71), (38, 71)], ('budynek', 'ognisko'))
    _stos(g, (31, 58), [('surowiec', 'jagoda'), ('skrzynia', None)], r=2)

    # --- Dolina wschodnia (x 46–71, y 47–71) za wyrwą w murze ------------------
    # Słaba straż w wyrwie (44–45, 51–52); za nią stos, piaskowy wąwóz do drugiej
    # bramy, zielony namiot na zachodnim brzegu jeziora, kieszenie na południu.
    _postaw(g, [(45, 52), (44, 52), (45, 51)], ('potwor', 'slaby'))
    _stos(g, (47, 53), [('skrzynia', None), ('surowiec', 'jagoda')], r=1)
    _stos(g, (52, 50), [('surowiec', 'pokeball'), ('skrzynia', None)], r=2)
    _postaw(g, [(48, 61), (48, 60), (47, 61), (49, 62)], ('namiot', 'zielony'))
    _postaw(g, [(48, 57), (49, 57), (47, 58)], ('kopalnia', 'jagoda'))
    _stos(g, (47, 63), [('skrzynia', None), ('surowiec', 'odlamek')], r=2)
    pokeball_piasek = _postaw(g, [(66, 51), (67, 51), (65, 52)], ('kopalnia', 'pokeball'))
    if pokeball_piasek:
        g.strzez([pokeball_piasek], 'slaby')
    _postaw(g, [(62, 53), (61, 53), (62, 52)], ('budynek', 'ognisko'))
    _postaw(g, [(60, 58), (61, 58), (60, 57)], ('budynek', 'woz'))
    _postaw(g, [(69, 52), (70, 52), (69, 53)], ('budynek', 'zrodlo'))
    _postaw(g, [(49, 59), (50, 60), (49, 58)], ('budynek', 'wiatrak'))
    _postaw(g, [(57, 54), (58, 55), (56, 54), (58, 54)], ('budynek', 'chatka'))
    _stos(g, (64, 55), [('surowiec', 'odlamek'), ('surowiec', 'jagoda')], r=2)
    _stos(g, (69, 55), [('surowiec', 'pokeball'), ('skrzynia', None), ('surowiec', 'jagoda')], r=2)
    artefakt_piasek = _postaw(g, [(70, 49), (69, 49), (70, 50)], ('artefakt', None))
    if artefakt_piasek:
        g.strzez([artefakt_piasek], 'slaby')
    # Ślepa odnoga w rogu (x 67–71, y 62–71): zakątek za słabą strażą.
    _kieszen(g, [(68, 60), (69, 60), (68, 61)], 'slaby', (69, 68),
             [('skrzynia', None), ('surowiec', 'odlamek'), ('budynek', 'oboz-treningowy')], r=3)
    # Zatoka południowa (x 59–64, y 63–71): artefakt i dwie skrzynie na pasku
    # brzegu za średnią strażą w szyjce (64, 60–62) między jeziorem a lasem.
    _kieszen(g, [SZYJKA_ZATOKI, (64, 60), (64, 62)], 'sredni', (61, 66),
             [('artefakt', None), ('skrzynia', None), ('skrzynia', None), ('surowiec', 'kamien')], r=4)

    _bez_zajetych_kieszeni(g)
    try:
        g.skarb_w_kieszeni('dom', 'slaby', 3, lambda p: rng.choice([('skrzynia', None), ('surowiec', 'odlamek')]))
    except SystemExit:
        pass

    # ===================================================================
    # PAS SPORNY
    # ===================================================================
    # --- Zachodni trakt (x 9–23, y 23–44): główna droga między bramami ------
    # Zachodnia łąka (x 0–8, y 24–40) jest kieszenią za średnią strażą w szyjce
    # (9–12, 40–41): kopalnia kamienia, obóz, artefakt, stosy.
    _postaw(g, [(5, 34), (6, 34), (4, 34)], ('kopalnia', 'kamien'))
    _postaw(g, [(3, 37), (2, 37), (4, 37)], ('budynek', 'oboz-treningowy'))
    _postaw(g, [(6, 27), (5, 27), (6, 26)], ('artefakt', None))
    _stos(g, (3, 25), [('skrzynia', None), ('surowiec', 'kamien')], r=2)
    _stos(g, (2, 31), [('skrzynia', None), ('surowiec', 'odlamek')], r=2)
    _stos(g, (6, 38), [('surowiec', 'pokeball'), ('surowiec', 'jagoda')], r=1)
    _postaw(g, [(10, 41), (11, 41), (10, 40), (11, 40)], ('potwor', 'sredni'))
    _stos(g, (11, 43), [('skrzynia', None), ('surowiec', 'odlamek')], r=1)
    # Boczna polanka przy trakcie (x 12–16, y 27–30): chatka i stos.
    _postaw(g, [(14, 28), (13, 28), (15, 28)], ('budynek', 'chatka'))
    stos_b = _stos(g, (13, 30), [('skrzynia', None), ('surowiec', 'kamien'), ('surowiec', 'jagoda')], r=2)
    if stos_b:
        g.strzez(stos_b[:1], 'sredni')
    _postaw(g, [(18, 38), (17, 38), (19, 38)], ('budynek', 'zrodlo'))
    _postaw(g, [(4, 39), (5, 39), (3, 39)], ('budynek', 'gniazdo'))
    # SZYJKA TRAKTU: średnia straż na jedynym polu przejścia między lasem
    # a jeziorem. Bez niej pas sporny i obie przełęcze północne stałyby
    # otworem bez jednej bitwy (bramy na klucz nie są bitwą).
    _postaw(g, [SZYJKA_TRAKTU, (19, 35), (19, 37)], ('potwor', 'sredni'))
    _stos(g, (19, 33), [('skrzynia', None), ('surowiec', 'kamien')], r=3)
    # BRÓD (24–30, 39–40): średnia straż na mieliźnie, jedyne przejście na wschód.
    _postaw(g, [(29, 39), (28, 39), (29, 40), (27, 39)], ('potwor', 'sredni'))
    _stos(g, (33, 40), [('skrzynia', None), ('surowiec', 'kamien')], r=2)

    # --- Południe jeziora (x 31–43, y 36–43) -----------------------------------
    _postaw(g, [(35, 37), (34, 37), (35, 36)], ('kopalnia', 'odlamek'))
    _postaw(g, [(41, 43), (42, 43), (41, 42), (43, 42)], ('budynek', 'kamienna-wieza'))
    _postaw(g, [(33, 42), (34, 42), (32, 42)], ('budynek', 'wiatrak'))
    _stos(g, (37, 42), [('surowiec', 'odlamek'), ('surowiec', 'pokeball')], r=1)
    _postaw(g, [(38, 38), (39, 38), (38, 39)], ('budynek', 'chatka'))
    # Północny brzeg jeziora (x 35–39, y 23–28): kieszeń za strażą w (40, 29).
    _kieszen(g, [(40, 29), (40, 28)], 'sredni', (37, 26),
             [('artefakt', None), ('skrzynia', None), ('surowiec', 'kamien')], r=2)

    # --- Wschodnie rozstaje (x 44–58, y 31–44): węzeł odchudzony ---------------
    # Zostają: dwie drogie kopalnie pod strażą, chatka jasnowidza, chatka,
    # ognisko, portal, dwa stosy. Ranczo, gniazdo, wóz i skrzynie poszły na
    # południową łąkę i nad jezioro NW.
    kam_wezel = _postaw(g, [(46, 40), (45, 40), (46, 41)], ('kopalnia', 'kamien'))
    if kam_wezel:
        g.strzez([kam_wezel], 'sredni')
    pok_wezel = _postaw(g, [(55, 37), (54, 37), (56, 37)], ('kopalnia', 'pokeball'))
    if pok_wezel:
        g.strzez([pok_wezel], 'sredni')
    _postaw(g, [(53, 41), (52, 41), (54, 41)], ('jasnowidz', None))
    _postaw(g, [(56, 42), (55, 42), (56, 41)], ('budynek', 'chatka'))
    _postaw(g, [(44, 42), (45, 42), (44, 43)], ('budynek', 'ognisko'))
    _stos(g, (47, 37), [('skrzynia', None), ('surowiec', 'odlamek')], r=1)
    _postaw(g, [(46, 33), (47, 33), (46, 32)], ('budynek', 'wiatrak'))
    _stos(g, (57, 41), [('skrzynia', None), ('surowiec', 'pokeball')], r=1)
    _postaw(g, [(47, 26), (46, 26), (48, 26)], ('kopalnia', 'jagoda'))
    _postaw(g, [(49, 25), (50, 25), (49, 24)], ('budynek', 'ognisko'))
    _stos(g, (45, 30), [('surowiec', 'odlamek'), ('surowiec', 'jagoda')], r=2)
    stos_c = _stos(g, (48, 29), [('skrzynia', None), ('surowiec', 'kamien'), ('surowiec', 'jagoda')], r=2)
    if stos_c:
        g.strzez(stos_c[:1], 'sredni')
    # Dojście do bocznej przełęczy północnej (x 55–60, y 31–35): wóz i stos.
    _postaw(g, [(56, 33), (57, 33), (55, 33)], ('budynek', 'woz'))
    stos_h = _stos(g, (59, 33), [('surowiec', 'odlamek'), ('skrzynia', None)], r=2)
    if stos_h:
        g.strzez(stos_h[-1:], 'sredni')

    # --- Jałowa rubież wschodnia (x 59–71, y 23–43) ----------------------------
    # Kieszeń z JEDNYM wejściem: wiersz 39, kolumny 59–63 (las nad i pod).
    # Średnia straż w tej szyjce zamyka całą rubież; w środku własną (silną)
    # straż ma tylko kopalnia kamienia. Niebieski namiot na końcu świata —
    # każe wrócić przez bród do przełęczy.
    _postaw(g, [(61, 39), (62, 39), (60, 39)], ('potwor', 'sredni'))
    _postaw(g, [(67, 27), (68, 27), (67, 28), (66, 26)], ('namiot', 'niebieski'))
    kam_rubiez = _postaw(g, [(69, 33), (68, 33), (70, 33)], ('kopalnia', 'kamien'))
    if kam_rubiez:
        g.strzez([kam_rubiez], 'silny')
    _postaw(g, [(64, 36), (65, 36), (64, 37)], ('artefakt', None))
    _postaw(g, [(65, 41), (66, 41), (65, 40)], ('budynek', 'oboz-treningowy'))
    _stos(g, (68, 24), [('skrzynia', None), ('surowiec', 'kamien')], r=2)
    _stos(g, (65, 41), [('skrzynia', None), ('surowiec', 'odlamek'), ('surowiec', 'pokeball')], r=2)
    _postaw(g, [(70, 30), (69, 30), (70, 31)], ('budynek', 'ognisko'))
    _postaw(g, [(62, 25), (61, 25), (62, 26)], ('budynek', 'chatka'))
    _stos(g, (69, 38), [('surowiec', 'kamien'), ('skrzynia', None)], r=2)

    _bez_zajetych_kieszeni(g)
    try:
        g.skarb_w_kieszeni('pogranicze', 'sredni', 4, lambda p: rng.choice([('skrzynia', None), ('surowiec', 'kamien'), ('artefakt', None)]))
    except SystemExit:
        pass
    try:
        g.skarb_w_kieszeni('pogranicze', 'silny', 4, lambda p: rng.choice([('artefakt', None), ('skrzynia', None)]))
    except SystemExit:
        pass
    try:
        g.skarb_w_kieszeni('pogranicze', 'silny', 4, lambda p: rng.choice([('skrzynia', None), ('surowiec', 'pokeball')]))
    except SystemExit:
        pass
    g.budowle(3, 'pogranicze', ['gniazdo', 'zrodlo', 'ognisko'])

    # ===================================================================
    # KRAINA PRZECIWNIKA
    # ===================================================================
    # --- Północno-zachodnia polana i jezioro NW (x 0–27, y 9–19) --------------
    _postaw(g, [(16, 10), (15, 10), (17, 10), (16, 9)], ('budynek', 'wieza-obserwacyjna'))
    _stos(g, (18, 12), [('surowiec', 'kamien'), ('skrzynia', None)], r=2)
    _postaw(g, [(6, 13), (7, 13), (5, 13)], ('kopalnia', 'odlamek'))
    _postaw(g, [(9, 17), (8, 17), (10, 17)], ('kopalnia', 'jagoda'))
    _postaw(g, [(4, 16), (5, 16), (4, 17)], ('budynek', 'ranczo'))
    _postaw(g, [(2, 18), (1, 18), (2, 17)], ('jasnowidz', None))
    stos_d = _stos(g, (8, 11), [('skrzynia', None), ('surowiec', 'kamien'), ('surowiec', 'pokeball')], r=2)
    if stos_d:
        g.strzez(stos_d[:1], 'silny')
    stos_j = _stos(g, (2, 15), [('skrzynia', None), ('surowiec', 'odlamek')], r=2)
    if stos_j:
        g.strzez(stos_j[:1], 'silny')
    _postaw(g, [(10, 16), (10, 15), (11, 16)], ('budynek', 'chatka'))
    _postaw(g, [(24, 16), (25, 16), (24, 17)], ('budynek', 'zrodlo'))
    _postaw(g, [(22, 14), (21, 14), (22, 15)], ('budynek', 'gniazdo'))
    stos_k = _stos(g, (22, 18), [('skrzynia', None), ('surowiec', 'kamien')], r=2)
    if stos_k:
        g.strzez(stos_k[:1], 'silny')
    _postaw(g, [(2, 10), (1, 10), (3, 10)], ('budynek', 'portal'))
    # Pole śnieżne (x 3–29, y 0–7): skarbiec krańca za wodzem w szyjce (26–27, 8).
    _postaw(g, [(8, 5), (9, 5), (7, 5)], ('kopalnia', 'kamien'))
    _postaw(g, [(12, 2), (13, 2), (12, 3)], ('budynek', 'woz'))
    _postaw(g, [(20, 3), (19, 3), (21, 3), (18, 4)], ('budynek', 'drzewo-wiedzy'))
    _stos(g, (5, 3), [('artefakt', None), ('skrzynia', None)], r=2)
    _stos(g, (15, 5), [('skrzynia', None), ('surowiec', 'kamien'), ('surowiec', 'pokeball')], r=2)
    _stos(g, (25, 5), [('artefakt', None), ('surowiec', 'kamien')], r=2)
    _postaw(g, [(26, 8), (27, 8), (26, 9)], ('potwor', 'wodz'))

    # --- Północna polana (x 31–43, y 0–10): kieszeń za silną strażą (37–39, 11–13)
    _postaw(g, [(36, 5), (37, 5), (35, 5), (36, 6)], ('budynek', 'osrodek-ewolucji'))
    _postaw(g, [(33, 8), (34, 8), (33, 9)], ('kopalnia', 'kamien'))
    _stos(g, (39, 2), [('artefakt', None), ('skrzynia', None), ('surowiec', 'kamien')], r=2)
    _stos(g, (34, 2), [('artefakt', None), ('surowiec', 'pokeball')], r=2)
    _stos(g, (40, 7), [('skrzynia', None), ('surowiec', 'odlamek')], r=2)
    _postaw(g, [(38, 9), (37, 9), (38, 8)], ('budynek', 'ognisko'))
    _postaw(g, [(38, 12), (37, 12), (38, 11)], ('potwor', 'silny'))

    # --- Środek krainy (x 28–48, y 12–19): przy drodze z przełęczy ------------
    pok_n = _postaw(g, [(37, 19), (36, 19), (38, 19)], ('kopalnia', 'pokeball'))
    if pok_n:
        g.strzez([pok_n], 'silny')
    _postaw(g, [(40, 18), (41, 18), (40, 17)], ('budynek', 'wiatrak'))
    _postaw(g, [(26, 13), (25, 13), (26, 12)], ('budynek', 'woz'))
    stos_e = _stos(g, (43, 17), [('skrzynia', None), ('surowiec', 'kamien'), ('surowiec', 'odlamek')], r=2)
    if stos_e:
        g.strzez(stos_e[:1], 'silny')
    stos_l = _stos(g, (29, 19), [('surowiec', 'pokeball'), ('skrzynia', None)], r=2)
    if stos_l:
        g.strzez(stos_l[-1:], 'silny')
    _postaw(g, [(24, 12), (25, 12), (23, 12)], ('budynek', 'ognisko'))
    _postaw(g, [(46, 13), (47, 13), (46, 14)], ('budynek', 'oboz-treningowy'))
    _postaw(g, [(44, 19), (43, 19), (45, 19), (42, 19), (45, 18), (41, 19)], ('budynek', 'portal'))

    # --- Równina zamku wroga (x 49–71, y 0–19) --------------------------------
    pok_w = _postaw(g, [(52, 3), (53, 3), (51, 3)], ('kopalnia', 'pokeball'))
    if pok_w:
        g.strzez([pok_w], 'silny')
    kam_w = _postaw(g, [(66, 13), (65, 13), (67, 13)], ('kopalnia', 'kamien'))
    if kam_w:
        g.strzez([kam_w], 'wodz')
    _postaw(g, [(57, 5), (58, 5), (56, 5)], ('kopalnia', 'odlamek'))
    _postaw(g, [(69, 17), (68, 17), (70, 17)], ('kopalnia', 'jagoda'))
    art_w1 = _postaw(g, [(54, 8), (53, 8), (54, 9)], ('artefakt', None))
    if art_w1:
        g.strzez([art_w1], 'silny')
    art_w2 = _postaw(g, [(70, 10), (69, 10), (70, 11)], ('artefakt', None))
    if art_w2:
        g.strzez([art_w2], 'wodz')
    _stos(g, (50, 6), [('skrzynia', None), ('surowiec', 'kamien')], r=2)
    _stos(g, (66, 18), [('skrzynia', None), ('surowiec', 'pokeball')], r=2)
    stos_o = _stos(g, (55, 13), [('skrzynia', None), ('surowiec', 'odlamek'), ('surowiec', 'kamien')], r=2)
    if stos_o:
        g.strzez(stos_o[:1], 'silny')
    _postaw(g, [(60, 4), (61, 4), (60, 3)], ('budynek', 'wiatrak'))
    _postaw(g, [(60, 7), (59, 7), (61, 7)], ('budynek', 'ranczo'))
    _postaw(g, [(56, 15), (55, 15), (56, 16)], ('budynek', 'chatka'))
    _postaw(g, [(56, 7), (57, 7), (55, 7)], ('budynek', 'gniazdo'))
    _postaw(g, [(65, 16), (64, 16), (65, 17)], ('budynek', 'zrodlo'))
    _postaw(g, [(59, 17), (58, 17), (59, 18)], ('budynek', 'oboz-treningowy'))
    _postaw(g, [(68, 11), (67, 11), (68, 12)], ('jasnowidz', None))
    _postaw(g, [(50, 2), (49, 2), (50, 1)], ('budynek', 'ognisko'))
    _postaw(g, [(64, 6), (64, 5), (64, 7)], ('surowiec', 'kamien'))

    _bez_zajetych_kieszeni(g)
    try:
        g.skarb_w_kieszeni('wroga', 'silny', 4, lambda p: rng.choice([('artefakt', None), ('skrzynia', None)]))
    except SystemExit:
        pass
    try:
        g.skarb_w_kieszeni('wroga', 'wodz', 5, lambda p: rng.choice([('artefakt', None), ('skrzynia', None), ('surowiec', 'kamien')]))
    except SystemExit:
        pass
    try:
        g.skarb_w_kieszeni('wroga', 'wodz', 4, lambda p: rng.choice([('artefakt', None), ('surowiec', 'kamien')]))
    except SystemExit:
        pass


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
