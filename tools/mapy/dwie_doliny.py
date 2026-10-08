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
    'wrota wschodnie': (19, 58),
    'sad': (25, 64),
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
    # Odnoga doliny: z traktu (rozwidlenie pod wrotami północnymi) korytarzem
    # wrót wschodnich na rozstaje i dalej do doliny wschodniej. Runda 4 (D3):
    # sad nie ma już własnej drogi — dwa równoległe odcinki z pętlami między
    # zamkiem a rozstajami zastąpił jeden trakt z jednym rozwidleniem.
    ['start', 'wrota wschodnie', 'rozstaje doliny', 'wrota doliny wschodniej', 'piaskowy wawoz'],
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

#: Runda 3: zamknięte niecki w masywach zarastają (silnik) — pole łąki, do
#: którego nie da się dojść, było dla dziecka zagadką bez rozwiązania.
ZASYP_ODCIETE = True

USTAWIENIA = {
    # Mapa świata w stylu Pokémon: las i skały z klocków (`src/data/klocki.ts`).
    'klocki': 'trawa',
    # Krzaki i stosy znajdźek z zestawu Polany (ta sama łąka).
    'zestaw': 'polana',
    'znajdzki': 0.68,
    'dzienNatarcia': 40,
    'garnizonGracza': {'poziomy': [0, 1, 2], 'tygodnie': 5},
}

#: Runda 3 (werdykt r2, G4): grunt krainy wroga. W grze to jałowa ziemia
#: (`j`, patrz `_runda3`), w tle — ciemna, chłodna łąka, jak na Polanie.
#: Śnieg zniknął z planszy (E3), więc jego warstwa tła (`s`) jest wolna i to
#: ją dostaje ciemna łąka: tekstura ciemnej trawy, zabarwiona sinozielono.
#: Bagno przy jeziorze zostaje bagnem (własna warstwa `b`).
TEKSTURY = {'snieg': ['trawa-3', 'trawa']}
BARWY_TERENU = {
    'snieg': {'nasycenie': 0.45, 'barwa': (46, 82, 108), 'moc': 0.8, 'jasnosc': 0.62},
}


#: Runda 5 (G3: „w zakątkach brak drobnej dekoracji — kwiatów, trzcin").
#: Naklejki tła (`public/mapa/tlo/`) tylko w ZAKĄTKACH — na końcach odnóg,
#: w kieszeniach za strażą, na brzegach stawów przy nich — a nie po całej
#: łące (Polana, runda 8: „obiekty giną w szumie dekoracji"). Kwiaty na łące
#: (`.` w dolinie i pasie spornym, `s` — ciemna łąka krainy wroga w tle),
#: trzcina i irysy na wodzie przy brzegu. Gdzie: `ZAKATKI`, `NAKLEJKI_OMIN`.
NAKLEJKI = [
    (['kwiaty-1', 'kwiaty-2', 'kepa-kwiatow'], '.s', 0.16),
    (['paproc'], '.s', 0.03),
    (['trzcina-1', 'trzcina-2', 'trzcina-3', 'irysy'], '~', 0.40),
]
NAKLEJKI_KLOCKI = ['trzcina-1', 'trzcina-2', 'trzcina-3', 'irysy']

#: Zakątki z dekoracją, `(x0, y0, x1, y1)` włącznie.
ZAKATKI = [
    (0, 66, 4, 71),      # kieszeń w rogu zatoki zamku (kopalnia kamienia)
    (0, 47, 10, 53),     # zakątek za wrotami północnymi
    (21, 59, 36, 67),    # sad i jego staw
    (35, 63, 43, 71),    # kieszeń kopalni pokeballi i jej staw
    (58, 61, 66, 71),    # zatoka południowa za szyjką
    (0, 27, 12, 38),     # zachodnia odnoga i zachodnia łąka nad jeziorem
    (34, 22, 41, 30),    # kieszeń na północnym brzegu jeziora
    (58, 22, 68, 30),    # oczko na rubieży przy namiocie
    (51, 39, 58, 43),    # kieszeń jasnowidza
    (62, 55, 68, 59),    # wschodni koniec doliny wschodniej
    (11, 11, 19, 17),    # zatoczka na jeziorku NW
    (2, 1, 30, 8),       # pole za wodzem i jego oczko
    (32, 1, 41, 10),     # północna polana i jej oczko
    (46, 1, 52, 8),      # ślepy wąwóz kopalni pokeballi
    (63, 11, 71, 19),    # zakątek wodza wschodniego
    (0, 8, 11, 17),      # północno-zachodnia polana nad jeziorkiem
]


def NAKLEJKI_OMIN(zrodlo):
    """Pola bez naklejek: wszystko poza `ZAKATKI`, woda z dala od brzegu
    i pola pod budowlami (jak Twierdza, runda 8)."""
    import re
    teren = re.search(r'export const TEREN = \[(.*?)\];', zrodlo, re.S).group(1)
    wiersze = [w for w in re.findall(r"'([^']*)'", teren) if len(w) == BOK]
    w_zakatku = {(x, y) for x0, y0, x1, y1 in ZAKATKI
                 for y in range(y0, y1 + 1) for x in range(x0, x1 + 1)}
    omin = set()
    for y in range(BOK):
        for x in range(BOK):
            if (x, y) not in w_zakatku:
                omin.add((x, y))
            elif wiersze[y][x] == '~' and not any(
                0 <= x + dx < BOK and 0 <= y + dy < BOK and wiersze[y + dy][x + dx] not in '~T#'
                for dy in (-1, 0, 1) for dx in (-1, 0, 1)
            ):
                omin.add((x, y))
    for m in re.finditer(r"\{ x: (\d+), y: (\d+), rodzaj: '(\w+)'", zrodlo):
        x, y, rodzaj = int(m.group(1)), int(m.group(2)), m.group(3)
        if rodzaj in ('kopalnia', 'budynek', 'jasnowidz', 'namiot', 'straznica'):
            omin |= {(x + dx, y + dy) for dx in (-2, -1, 0, 1, 2) for dy in (-2, -1, 0, 1)}
        else:
            omin |= {(x + dx, y + dy) for dx in (-1, 0, 1) for dy in (-1, 0)}
    return omin


def TLO(rysunek):
    """Podmiany znaków tylko w TLE (`render_mapa.ustaw`). Jałowa ziemia krainy
    wroga (poza brązową plamą wokół jego zamku) i ziemia pod jej skałami
    malują się jako warstwa `s` — ciemna łąka z `BARWY_TERENU`."""
    wynik = [list(w) for w in rysunek]
    for y in range(GRANICA_POLNOCNA):
        for x in range(BOK):
            if wynik[y][x] in 'j#' and not _ne_jalowa(x, y):
                wynik[y][x] = 's'
    return [''.join(w) for w in wynik]


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
    # Runda 3 (werdykt r2, E3/G4): śnieg na północnych rubieżach mówił „zima",
    # nie „wróg" — znika; całą krainę wroga wyróżnia jej własny grunt (niżej,
    # `_kraina_wroga`).
    for y in range(BOK):
        for x in range(BOK):
            if mapa[y][x] == 's':
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

    _runda3(g, mapa)
    _runda4(g, mapa)
    _runda5(g, mapa)


def _ne_jalowa(x, y):
    """Jałowa ziemia wokół zamku wroga (x ≥ 60, y 6–20) — zostaje brązowa
    także w tle; reszta krainy wroga to ciemna, chłodna łąka (`TLO`)."""
    return x >= 60 and 6 <= y <= GRANICA_POLNOCNA - 1


def _runda3(g, mapa):
    """Werdykt ślepego porównania rundy 2 (r2-dwie-doliny-werdykt.md).

    Wnętrza dolin były „równomiernym konfetti": kępy lasu po 3–4 drzewa,
    zatoka zamku bez widocznych ścian, straże na otwartej łące. Tu teren
    dostaje MASYWY i SZYJKI; rozstawienie (`rozstaw`) kładzie przy nich stosy.
    """
    # --- A1/G3: zatoka zamku ze ścianami i dwoma wyjściami ------------------
    # Ściana północna: skalny mur w wierszach 55–56 (x 2–11) z lasem nad nim
    # (wiersz 54) — zakątek za wrotami kończy się na wierszu 53.
    _prostokat(mapa, 0, 54, 11, 54, 'T', procz='')
    _prostokat(mapa, 0, 55, 11, 56, '#', procz='')
    _prostokat(mapa, 0, 55, 1, 56, 'T', procz='')
    _prostokat(mapa, 15, 54, 24, 56, 'T', procz='#')
    # Ściana wschodnia: skała x 17–19 nad wrotami wschodnimi (wiersze 57–62),
    # las x 17–19 pod nimi (65–71). Wrota: wiersze 63–64.
    _prostokat(mapa, 17, 57, 19, 62, '#', procz='')
    _prostokat(mapa, 17, 65, 19, 71, 'T', procz='')
    _prostokat(mapa, 17, 63, 21, 64, '.', procz='')
    # --- C1: luka rozstajów (25–26, 54–56) w skalnej bramie ------------------
    _prostokat(mapa, 22, 54, 24, 57, '#', procz='')
    _prostokat(mapa, 27, 54, 29, 57, '#', procz='')
    _prostokat(mapa, 25, 54, 26, 57, '.', procz='')
    # --- E4/D2: masywy lasu na łące doliny; droga idzie korytarzem (61–63) --
    _prostokat(mapa, 30, 56, 35, 60, 'T', procz='')
    _prostokat(mapa, 28, 58, 29, 60, 'T', procz='')
    _prostokat(mapa, 30, 65, 35, 71, 'T', procz='')
    _prostokat(mapa, 22, 69, 29, 71, 'T', procz='')
    # --- E3: piaskowa kieszeń doliny wschodniej → łąka; piasek zostaje tylko
    # w wąwozie bocznego przejścia (x 46–51). Masyw lasu dzieli dolinę.
    for y in range(GRANICA_POLUDNIOWA + 1, BOK):
        for x in range(52, BOK):
            if mapa[y][x] == ',':
                mapa[y][x] = '.'
    _prostokat(mapa, 56, 47, 61, 51, 'T', procz='~')
    # --- D3: bagienne łaty pod brodem (x 31–41, y 36–43) falowały drogą ------
    _prostokat(mapa, 31, 36, 41, 43, '.', tylko='b')
    # Trakt z brodu na wschód biegnie prosto przecinką w lesie (34–40, 39–40)
    # — wcześniej nurkował pod kępę (36–39, 36–42) i wracał (D2, D3).
    _prostokat(mapa, 34, 39, 40, 40, '.', procz='')
    # --- C1: zachodnia łąka pasa spornego — szyjka przeniesiona z otwartej
    # łąki (10, 41) na przesmyk w lesie (8–11, 28–29), od polanki przy trakcie.
    _prostokat(mapa, 5, 40, 12, 40, 'T', procz='')
    _prostokat(mapa, 9, 41, 12, 43, 'T', procz='')
    _prostokat(mapa, 8, 27, 11, 27, 'T', procz='')
    _prostokat(mapa, 8, 30, 11, 30, 'T', procz='')
    _prostokat(mapa, 8, 28, 12, 29, '.', procz='')
    # --- C1: rubież wschodnia — wejście z otwartego piasku (wiersz 39) zamknięte,
    # nowe w zwężeniu (59–62, 30–31) przy dojściu do bocznej przełęczy.
    _prostokat(mapa, 59, 39, 63, 39, 'T', procz='')
    _prostokat(mapa, 59, 30, 63, 31, 'j', procz='')
    _prostokat(mapa, 59, 29, 62, 29, 'T', procz='')
    _prostokat(mapa, 59, 32, 62, 32, 'T', procz='')
    # --- B3/E4: masywy zamiast otwartych łąk ---------------------------------
    # Mapa miała 51 % pól przejezdnych (wzorce 26–43 %) — po przerzedzeniu
    # konfetti obiekt wypadał co 14 pól. Otwarte place dostają masywy lasu
    # przy brzegach, tak żeby zakątki miały ściany, a droga sens.
    for x0, y0, x1, y1 in [
        (11, 6, 15, 7),     # pole za wodzem — las dzieli je na dwie izby
        (41, 0, 43, 6),     # północna polana — wschodni brzeg
        (31, 0, 32, 3),     # i zachodni
        (6, 16, 10, 19),    # północno-zachodnia polana nad grzbietem
        (52, 15, 57, 19),   # równina zamku wroga — las pod grzbietem
        (68, 0, 71, 3),     # róg nad zamkiem wroga
        (66, 47, 71, 50),   # dolina wschodnia — las pod grzbietem
        (68, 55, 71, 58),   # i nad zatoką
        (5, 70, 16, 71),    # zatoka zamku — brzeg lasu na południu
        (36, 51, 41, 53),   # podnóże wschodnie
        (29, 51, 33, 52),   # i jego zachodni brzeg
        (0, 57, 1, 62),     # zatoka zamku — las pod skałą zachodnią
        (0, 33, 1, 39),     # zachodnia łąka pasa spornego
        (69, 23, 71, 27),   # rubież — róg pod grzbietem
        (62, 51, 66, 53),   # dolina wschodnia — środek
        (66, 15, 71, 19),   # kraina wroga — las pod grzbietem na wschodzie
        (0, 17, 2, 19),     # i na zachodzie
        (17, 0, 22, 1),     # pole za wodzem — północny brzeg
        (34, 0, 40, 1),     # północna polana — północny brzeg
        (62, 55, 67, 56),   # dolina wschodnia — las nad zatoką
        (65, 4, 67, 6),     # kraina wroga — kępa za zamkiem
        (67, 59, 71, 71),   # ślepa odnoga w rogu zarasta (F1: pusta końcówka)
        (18, 49, 20, 50),   # podnóże zachodnie — las przy kopalni
        (9, 14, 11, 16),    # północno-zachodnia polana — las nad jeziorem
        (23, 0, 26, 2),     # pole za wodzem — wschodni brzeg
        (62, 23, 64, 24),   # rubież — pod grzbietem
    ]:
        _prostokat(mapa, x0, y0, x1, y1, 'T')

    # --- G4: kraina wroga ma własny grunt ----------------------------------
    # Łąka krainy wroga to w grze jałowa ziemia (125 punktów ruchu — droga
    # bita ma tu sens), a w tle ciemna, chłodna łąka (`TLO`).
    for y in range(GRANICA_POLNOCNA):
        for x in range(BOK):
            if mapa[y][x] == '.':
                mapa[y][x] = 'j'



def _runda4(g, mapa):
    """Werdykt ślepego porównania rundy 3 (r3-dwie-doliny-werdykt.md).

    Wygrana, ale „pas środkowy i dolina gracza to place, a nie układ szyjek
    i zakątków". Tu: zatoka zamku z dwoma wyjściami (oba pod strażą dalej
    na trasie), zachodni pas sporny jako ślepa odnoga za szyjką, kępy skał
    bez funkcji wchłonięte w masywy, jeziorko NW z zatoczką skarbu.
    """
    # --- A1: zatoka zamku. Ściana lasu x 17–21 (wiersze 60–70) odcina sad;
    # wrota wschodnie (63–64) zamknięte. Drugie wyjście to KORYTARZ w wierszach
    # 58–59 (x 16–23) na rozstaje (25, 58), gdzie stoi straż bramy (25, 55).
    # Pierwsze — przesmyk wrót północnych ze strażą (14, 51).
    _prostokat(mapa, 17, 60, 21, 70, 'T', procz='')
    _prostokat(mapa, 16, 57, 24, 57, 'T', procz='')
    _prostokat(mapa, 16, 58, 23, 59, '.', procz='')
    # Domknięcie północnej ściany zatoki: skalny występ (3–7, 57–58) łączy się
    # lasem z murem (wiersze 54–56) — łąka y 57 nie ma „szpary" przy x 8–12.
    _prostokat(mapa, 8, 57, 11, 57, 'T', procz='')
    # --- E3: skalne kępy bez funkcji w dolinie → części masywów lasu --------
    # (15–19, 51–54) odcina podnóże od przesmyku (bez niej straż (14, 51) da
    # się obejść) — zostaje, ale jako las złączony z pasem 54–56.
    _prostokat(mapa, 15, 51, 19, 54, 'T', tylko='#.', procz='')
    # Skalna brama rozstajów (22–24 i 27–29, 54–57) → las tego samego pasa.
    _prostokat(mapa, 22, 54, 24, 57, 'T', tylko='#', procz='')
    _prostokat(mapa, 27, 54, 29, 57, 'T', tylko='#', procz='')
    # Głazy wokół kopalni pokeballi (36–40, 64–68) — z rozmycia szkicu.
    _prostokat(mapa, 36, 64, 40, 68, '.', tylko='#', procz='')
    # --- C1: kopalnia pokeballi w kieszeni (x 36–43, y 66–71): las w wierszu
    # 65 z szyjką (39–40), w niej słaba straż — pilnuje WEJŚCIA, nie kopalni.
    _prostokat(mapa, 36, 65, 43, 65, 'T', procz='')
    _prostokat(mapa, 39, 65, 40, 65, '.', procz='')
    _prostokat(mapa, 36, 66, 43, 71, '.', tylko='T#')
    # --- G1/B2/C1: zachodni pas sporny (x 0–11, y 24–39) zarasta. Zostaje
    # ślepa odnoga: przesmyk z polanki (7–12, 28–29), szyjka (6, 28–29) pod
    # średnią straż, za nią zakątek (1–5, 27–29) ze stosem. Kopalnia kamienia
    # (sporna) we wnęce (4–8, 31–34) przed szyjką, wejście (8–9, 30).
    _prostokat(mapa, 0, 24, 11, 39, 'T', procz='~')
    _prostokat(mapa, 7, 28, 12, 29, '.', procz='')
    _prostokat(mapa, 6, 28, 6, 29, '.', procz='')
    _prostokat(mapa, 1, 27, 5, 29, '.', procz='')
    _prostokat(mapa, 4, 31, 8, 34, '.', procz='')
    _prostokat(mapa, 8, 30, 9, 30, '.', procz='')
    # --- E5: jeziorko NW — zatoczka skarbu. Mierzeja (15, 12–13) z drogi
    # nad jeziorem prowadzi na plażę (13–17, 14–16) w wodzie; w mierzei silna
    # straż. Jezioro przestaje „tylko wypełniać róg".
    _prostokat(mapa, 15, 12, 15, 13, ',', procz='')
    _prostokat(mapa, 13, 14, 17, 16, ',', procz='')
    for x, y in [(13, 12), (14, 12), (14, 13), (16, 13), (12, 14), (18, 14), (12, 15), (18, 15)]:
        mapa[y][x] = '~'
    # --- C3: wódz wschodni strzeże ZAKĄTKA z reliktem i Dojo (x 64–71,
    # y 12–19): las (61–63, 10–19) i (67–71, 10–11), wejście szyjką (64–66,
    # 10–11). Boczna przełęcz (57–58, 20) wychodzi korytarzem (58–60, 12–19).
    _prostokat(mapa, 59, 12, 60, 19, 'j', procz='')
    _prostokat(mapa, 61, 12, 63, 19, 'T', procz='')
    _prostokat(mapa, 62, 10, 63, 11, 'T', procz='')
    _prostokat(mapa, 67, 10, 71, 11, 'T', procz='')
    _prostokat(mapa, 64, 10, 66, 11, 'j', procz='')
    # Bagno przy trakcie (x 16–24, y 24–36) — mniej pustego bagna: dalej niż
    # dwa pola od drogi (kolumny 18–22) zarasta lasem albo wchodzi w jezioro.
    for y in range(24, 37):
        for x in range(14, 26):
            if mapa[y][x] == 'b' and x <= 16:
                mapa[y][x] = 'T'
            elif mapa[y][x] == 'b' and x >= 24:
                mapa[y][x] = '~'
    # Kępa suchej łąki na bagnie przy trakcie — chatka na palach (23, 28).
    _prostokat(mapa, 22, 27, 23, 29, '.', procz='~')
    # --- B3: gęstość. Otwarte place bez obiektów (głównie w krainie wroga,
    # która miała pole na obiekt co 14,6) dostają masywy lasu przy brzegach.
    for x0, y0, x1, y1 in [
        (4, 6, 7, 7),       # i zachodni zakątek
        (32, 2, 34, 4),     # północna polana — zachodni brzeg
        (31, 10, 34, 11),   # i południowy
        (36, 18, 38, 19),   # środek krainy — pod drogą
        (6, 14, 8, 15),     # północno-zachodnia polana
        (44, 30, 47, 31),   # pas sporny — łąka wschodnich rozstajów
        (46, 39, 47, 41),   # i pod nią
        (69, 35, 71, 37),   # rubież — wschodni brzeg
        (65, 42, 68, 43),   # i róg pod grzbietem
        (68, 51, 71, 54),   # dolina wschodnia — róg pod grzbietem
        (68, 24, 71, 26),   # rubież — róg pod grzbietem
        (38, 15, 41, 16),   # środek krainy — nad drogą
        (50, 9, 53, 10),    # równina zamku wroga — zachodni brzeg
        (38, 7, 40, 8),     # północna polana — środek
        (60, 68, 64, 71),   # zatoka południowa — kieszeń krótsza
        (64, 54, 67, 54),   # dolina wschodnia — pusty pas pod lasem
        (43, 39, 45, 40),   # pas sporny — łąka pod wschodnimi rozstajami
        (28, 6, 29, 7),     # pole za wodzem — wschodni róg
        (27, 66, 29, 68),   # sad — wschodni brzeg
        (29, 48, 31, 50),   # podnóże wschodnie — zachodni róg
        (12, 9, 14, 10),    # północno-zachodnia polana — nad drogą
        (48, 0, 51, 1),     # ślepy wąwóz kopalni pokeballi — koniec
        (3, 0, 7, 1),       # pole za wodzem — północny brzeg
        (11, 0, 16, 1),     # i dalej na wschód
        (3, 17, 5, 19),     # północno-zachodnia polana — róg pod grzbietem
        (44, 24, 46, 26),   # wschodnie rozstaje — łąka nad obozem
    ]:
        _prostokat(mapa, x0, y0, x1, y1, 'T')


def _jezioro(mapa, cx, cy, rx, ry, okno, tylko='.jT', poza=None):
    """Jezioro o nieregularnym brzegu: elipsa (środek `cx, cy`, półosie
    `rx, ry`) z deterministycznym „szumem" brzegu, przycięta do prostokąta
    `okno` = (x0, y0, x1, y1). Zamienia tylko znaki z `tylko` (droga zostaje).
    `poza` — czym zarasta reszta okna (np. las wokół jeziora), None: bez zmian.
    Prostokątne plamy wody z rundy 5 wyglądały na zrzucie jak baseny."""
    x0, y0, x1, y1 = okno
    for y in range(max(0, y0), min(BOK - 1, y1) + 1):
        for x in range(max(0, x0), min(BOK - 1, x1) + 1):
            szum = ((x * 73856093) ^ (y * 19349663)) % 97 / 97 * 0.36 - 0.18
            d = ((x - cx) / rx) ** 2 + ((y - cy) / ry) ** 2
            if d <= 1 + szum:
                if mapa[y][x] in tylko:
                    mapa[y][x] = '~'
            elif poza is not None and mapa[y][x] not in '=~':
                mapa[y][x] = poza


def _runda5(g, mapa):
    """Werdykt ślepego porównania rundy 4 (r4-dwie-doliny-werdykt.md).

    Wygrana, ale T+# = 56 % („łąka zostaje jako korytarze w lesie"), drobne
    łaty skał w krainie wroga, plaże i piaskowe przesmyki węższe niż 6 × 6,
    straże (52, 3) i (45, 14) przy obiektach zamiast w szyjkach, a ekrany
    doliny wschodniej i północnego pola przeładowane (G1).

    Zasada tej rundy: las niczego nie obrysowujący znika — tam, gdzie łąka
    ma sens (kraina wroga, dolina wschodnia, zachodni pas sporny), staje się
    łąką; tam, gdzie otwarta łąka rozlałaby gęstość (obiekt ma wypadać
    najwyżej co 12 pól przejezdnych, a ekran 21 × 18 nieść ≤ 12 obiektów),
    staje się jeziorem przy brzegu, który i tak był.
    """
    # --- E4: zachodni pas sporny (x 0–12, y 24–43) był pasem lasu z korytarzem.
    # Teraz: zachodnia łąka (1–11, 31–34) — wnęka kopalni kamienia urosła
    # w łąkę nad jeziorem — i jezioro pod grzbietem (0–11, 35–43). Kolumna 12
    # zostaje lasem: oddziela łąkę od traktu (kolumna 13) i szyjki (19, 36).
    _prostokat(mapa, 1, 31, 11, 34, '.', procz='')
    _prostokat(mapa, 0, 31, 0, 34, 'T', procz='')
    _prostokat(mapa, 0, 35, 11, 43, 'T', procz='')
    # (Runda 5, poprawka: elipsa mniejsza od okna — wcześniej wypełniała je
    # całe i jezioro wyglądało na zrzucie jak prostokątny basen.)
    _jezioro(mapa, 1.5, 39.8, 6.2, 4.4, (0, 35, 11, 43), tylko='T#')
    _prostokat(mapa, 12, 30, 12, 43, 'T', procz='')

    # --- E3/E4: kraina wroga. Drobne łaty skał → łąka (wnętrza pól) albo
    # las (tam, gdzie skała była ścianą zakątka). Zostaje tylko blok skał
    # nad zamkiem wroga (x ≥ 60, y 0–7) i poszarpany brzeg grzbietu (y 19).
    for y in range(0, 19):
        for x in range(0, 60):
            if mapa[y][x] == '#':
                mapa[y][x] = 'T'
    _prostokat(mapa, 9, 2, 11, 4, 'j', tylko='T', procz='')
    _prostokat(mapa, 8, 12, 8, 12, 'j', tylko='T', procz='')
    _prostokat(mapa, 28, 4, 29, 6, 'j', tylko='T', procz='')
    # Środek krainy: masyw skał i lasu (30–41, 14–16) między traktem a
    # wylotem szyjki północnej polany → łąka. Wiersze 12–13 (x 32–37) zostają
    # ścianą — inaczej szyjkę (38, 12) dałoby się obejść od zachodu.
    _prostokat(mapa, 30, 14, 41, 16, 'j', procz='=~')
    _prostokat(mapa, 32, 12, 37, 13, 'T', tylko='#.j', procz='')
    _prostokat(mapa, 39, 18, 39, 19, 'j', tylko='#T', procz='')
    # E3: plaża w zatoczce jeziorka NW i mierzeja to łąka krainy, nie pasek
    # piasku.
    _prostokat(mapa, 12, 12, 18, 16, 'j', tylko=',', procz='')
    # Jezioro pod grzbietem krainy (38–56, 13–19) — las pod grzbietem, który
    # niczego nie obrysowywał; trakt idzie jego północnym brzegiem. Kolumna 57
    # zostaje lasem: to ściana korytarza bocznej przełęczy (58–60, 12–19).
    _jezioro(mapa, 48.5, 17.2, 9.5, 3.9, (38, 13, 56, 19))
    _prostokat(mapa, 40, 19, 56, 19, '~', tylko='#', procz='')
    # Jeziorko NW sięga zachodniej krawędzi (las 0–10, 15–19).
    _jezioro(mapa, 4.5, 18.5, 7.5, 3.2, (0, 15, 11, 19), tylko='jT')
    # Północno-zachodnia polana: przesmyk (6–8, 14) pod kopalnią odłamków
    # — bryła kopalni zamykała jedyne przejście wierszami 12–13.
    _prostokat(mapa, 6, 14, 8, 14, 'j', tylko='T', procz='')
    # C1: ślepy wąwóz kopalni pokeballi (47–51, 2–8) ma JEDNO wejście —
    # szyjkę (52–54, 8) od traktu; dojście kolumną 49 (wiersze 9–10) zarasta.
    _prostokat(mapa, 49, 9, 49, 10, 'T', procz='')

    # --- E3: piaskowe przesmyki. Boczna przełęcz północna i jej dojście
    # (57–58, 20–30) to jałowa ziemia rubieży (ten sam koszt 125, co piasek);
    # wąwóz bocznej przełęczy południowej (49–50, 39–50) — łąka, jak dolina,
    # do której prowadzi.
    _prostokat(mapa, 57, 20, 58, 30, 'j', tylko=',', procz='')
    _prostokat(mapa, 49, 38, 50, 51, '.', tylko=',', procz='')

    # --- E4/G1: dolina wschodnia. Masyw (48–54, 51–54) między pasem łąki
    # przy ścianie a pasem drogi → łąka. Pod grzbietem (51–62, 48–53) —
    # jezioro; las na wschód od zatoki (65–71, 59–71) → woda: zatoka jest
    # mierzeją między dwoma jeziorami.
    _prostokat(mapa, 48, 51, 54, 54, '.', tylko='T', procz='')
    _jezioro(mapa, 57, 50.3, 6.2, 3.0, (51, 48, 62, 53), tylko='.T')
    _prostokat(mapa, 66, 59, 71, 71, '~', procz='')
    _jezioro(mapa, 68, 66, 3.5, 6.5, (65, 62, 65, 71), tylko='T')

    # --- G2: arena obok rozstajów, poza drogą — wnęka (23–24, 56–57)
    # w lesie na zachód od luki. (Wnęka po wschodniej stronie, (27–28,
    # 55–57), ściągała drogę: trakt ścinał przez nią las na podnóże
    # wschodnie.)
    _prostokat(mapa, 23, 56, 24, 57, '.', procz='')

    # --- B3: stawy na pustych łąkach doliny gracza. Wiersz 61 zostaje łąką
    # aż do (36, 61): to jedyne przejście z sadu na południową łąkę
    # i podnóże wschodnie (pierwszy tydzień, bez bitwy ≥ 22 %). Zatoka zamku
    # zostaje otwarta z tego samego powodu.
    _jezioro(mapa, 31.5, 63.8, 3.6, 2.3, (28, 62, 35, 66), tylko='.')
    _prostokat(mapa, 29, 61, 36, 61, '.', procz='~')
    _jezioro(mapa, 42, 69, 2.6, 3.6, (39, 66, 43, 71), tylko='.T')
    _jezioro(mapa, 48, 66, 3.0, 2.6, (45, 63, 51, 69), tylko='.T')
    _jezioro(mapa, 41.5, 48.8, 2.4, 1.9, (39, 47, 44, 51), tylko='.')
    # Pas sporny: jezioro środkowe na południowy wschód (31–32, 35–38),
    # oczko na rubieży (61–63, 25–27).
    _prostokat(mapa, 31, 35, 32, 38, '~', tylko='.', procz='')
    _jezioro(mapa, 62, 26.3, 3.0, 2.6, (59, 23, 66, 29), tylko='.jT')
    # Druga fala (B3 + G1 + E2 naraz: dom ma mieć mniej obiektów niż pas
    # sporny, ekran ≤ 12, a obiekt najwyżej co 12 pól — więc w domu mniej
    # pustej łąki). Stawy na łąkach, z których wyniesiono budowle:
    # zatoka zamku (12–16, 66–69), podnóże wschodnie (36–44, 47–51); jezioro SE wchodzi na pas łąki doliny
    # wschodniej (50–54, 55–63). W krainie wroga: jezioro pod grzbietem
    # sięga x 36, oczko na północnej polanie (38–40, 2–4) i na polu za
    # wodzem (27–29, 3–6); na wschodnich rozstajach staw (45–48, 28–31).
    _jezioro(mapa, 14.4, 67.8, 2.6, 1.8, (12, 66, 16, 69), tylko='.')
    _jezioro(mapa, 40.5, 49.0, 4.6, 2.2, (35, 47, 44, 51), tylko='.T')
    _jezioro(mapa, 53.5, 59.0, 3.4, 5.0, (50, 54, 55, 64), tylko='.T')
    _jezioro(mapa, 40.0, 17.6, 4.0, 2.0, (36, 16, 41, 19), tylko='jT')
    _jezioro(mapa, 39.3, 3.0, 1.8, 1.6, (37, 2, 40, 4), tylko='jT')
    _jezioro(mapa, 28.6, 4.5, 1.5, 1.9, (27, 3, 29, 6), tylko='jT')
    _jezioro(mapa, 46.5, 29.6, 2.0, 1.8, (44, 28, 48, 31), tylko='.T')
    _jezioro(mapa, 37.5, 18.0, 3.0, 1.8, (33, 16, 38, 19), tylko='jT')
    # Masywy lasu dosunięte do istniejących brzegów (nie korytarze): łąki,
    # które po przerzedzeniu obiektów zostały puste, a liczyły się do gęstości
    # (B3: obiekt najwyżej co 12 pól przejezdnych).
    for x0, y0, x1, y1 in [
        (19, 13, 22, 15),   # kraina: brzeg jeziorka przy trakcie
        (24, 9, 25, 11),    # kraina: zejście od wodza węższe
        (12, 5, 16, 6),     # pole za wodzem: południowy brzeg
        (65, 7, 67, 7),     # równina zamku wroga: kępa za zamkiem
        (64, 18, 65, 19),   # zakątek wodza wschodniego: dno
        (71, 28, 71, 35),   # rubież: wschodni pas pod krawędzią
        (64, 37, 64, 40),   # rubież: zachodni brzeg kieszeni
        (57, 32, 58, 35),   # wschodnie rozstaje: brzeg pod lasem
        (42, 41, 44, 42),   # pas sporny pod jeziorem: kępa przy wieży
        (20, 51, 22, 53),   # podnóże zachodnie: kępa przy murze
        (9, 31, 11, 31),    # zachodnia łąka: północny brzeg
        (35, 2, 35, 4),     # północna polana: zachodni brzeg
        (27, 12, 28, 13),   # środek krainy: pod zejściem od wodza
        (40, 36, 42, 37),   # pas sporny: łąka nad wieżą
        (0, 52, 3, 53),     # zakątek za wrotami: zachodni kąt
        (5, 68, 8, 69),     # zatoka zamku: brzeg przy stawie
        (24, 67, 26, 68),   # sad: południowy brzeg
        (60, 54, 63, 54),   # dolina wschodnia: brzeg nad drogą
        (30, 14, 33, 15),   # środek krainy: zachodni brzeg łąki
        (55, 6, 56, 7),     # równina zamku wroga: kępa nad traktem
        (35, 39, 37, 39),   # pas sporny: brzeg nad traktem z brodu
        (50, 53, 50, 57),   # dolina wschodnia: brzeg jeziora
        (46, 54, 46, 56),   # i pod ścianą
        (69, 28, 70, 30),   # rubież: pas pod krawędzią
        (22, 63, 23, 66),   # sad: zachodni brzeg
        (41, 62, 43, 64),   # południowa łąka: wschodni brzeg
        (1, 31, 2, 32),     # zachodnia łąka: kąt
        (46, 33, 48, 37),   # pas sporny: łąka pod traktem na rozstaje
        (41, 54, 42, 55),   # podnóże wschodnie: kąt przy drodze
        (64, 31, 67, 32),   # rubież: środek pod lasem
        (0, 59, 1, 63),     # zatoka zamku: zachodni brzeg
        (24, 61, 26, 62),   # sad: północny brzeg
    ]:
        _prostokat(mapa, x0, y0, x1, y1, 'T', tylko='.j', procz='')
    # E4: las brzegowy wchodzi w jeziora (T → woda) — T+# ma zostać ≤ 50 %.
    for x0, y0, x1, y1 in [
        (40, 30, 43, 34),   # jezioro środkowe: wschodni brzeg
        (49, 12, 52, 13),   # jezioro pod grzbietem krainy: północny brzeg
        (6, 14, 10, 15),    # jeziorko NW: południowy brzeg polany
        (44, 64, 46, 68),   # jezioro SE łączy się ze stawem kieszeni pokeballi
        (62, 48, 64, 51),   # jezioro doliny wschodniej: wschodni brzeg
        (35, 62, 36, 64),   # staw w sadzie: wschodni brzeg
        (59, 24, 60, 28),   # oczko na rubieży: zachodni brzeg
        (44, 59, 45, 63),   # jezioro SE dochodzi do ściany doliny
        (63, 52, 65, 53),   # jezioro doliny wschodniej: wschodni brzeg
        (57, 13, 57, 19),   # jezioro pod grzbietem: ściana korytarza
        (10, 16, 11, 16),   # jeziorko NW: przesmyk między zatokami
    ]:
        _prostokat(mapa, x0, y0, x1, y1, '~', tylko='T#', procz='')
    # Masywy lasu na łąkach, które po przerzedzeniu (G1) zostały puste:
    # łąka pod podnóżem wschodnim (40–43, 56–59), wschodnie rozstaje
    # (50–51, 28–31).
    _prostokat(mapa, 40, 56, 43, 59, 'T', tylko='.', procz='')
    _prostokat(mapa, 50, 28, 51, 31, 'T', tylko='.', procz='')

    # --- C1: przewężenie między wschodnimi rozstajami a kieszenią jasnowidza
    # (52–58, 40–43): szyjka (53–55, 39), w niej średnia straż.
    mapa[39][52] = 'T'
    mapa[39][56] = 'T'

    # --- Runda 5, druga część: B3 (obiekt co ≤ 11,5 pola). Po odchudzeniu
    # ekranów (G1) puste kawałki łąk POZA doliną gracza (w dolinie zmniejszyłyby
    # udział „bez bitwy", 22 %) zarastają albo wchodzą w wodę obok.
    for x0, y0, x1, y1, z in [
        (12, 4, 16, 4, 'T'),     # pole za wodzem: kępa pod drzewem wiedzy
        (3, 5, 5, 5, 'T'),       # pole za wodzem: zachodni kąt
        (0, 8, 1, 8, 'T'),       # północno-zachodnia polana nad portalem
        (70, 13, 71, 14, 'T'),   # zakątek wodza wschodniego: wschodni kąt
        (46, 57, 47, 58, 'T'),   # dolina wschodnia: po ognisku
        (47, 56, 47, 56, 'T'),
        (46, 62, 47, 63, '~'),   # dolina wschodnia: staw sięga ściany
        (50, 63, 51, 63, '~'),
        (60, 58, 62, 59, '~'),   # dolina wschodnia: po wozie — jezioro
        (64, 39, 66, 41, 'T'),   # rubież: kępa w południowej kieszeni
        (3, 31, 6, 31, 'T'),     # zachodnia łąka: północny brzeg
        (65, 24, 67, 25, 'T'),   # rubież: nad namiotem
        (70, 32, 70, 37, 'T'),   # rubież: wąwóz kopalni kamienia węższy
        (30, 17, 31, 19, 'T'),   # środek krainy: kąt pod grzbietem
        (6, 2, 11, 2, 'T'),      # pole za wodzem: północny skraj
        (59, 55, 61, 57, 'T'),   # dolina wschodnia: przy chatce, poza drogą
        (60, 17, 60, 19, 'T'),   # korytarz bocznej przełęczy: 2 pola
        (39, 5, 42, 7, 'T'),     # północna polana: wschodni skraj
        (15, 62, 16, 64, 'T'),   # zatoka zamku: kępa przy ścianie
        (12, 68, 13, 69, '~'),   # zatoka zamku: staw do brzegu
        (4, 2, 5, 4, 'T'),       # pole za wodzem: zachodni róg
        (12, 2, 18, 2, 'T'),     # pole za wodzem: północny skraj (wiersz 3 zostaje)
        (18, 9, 18, 10, 'T'),    # północno-zachodnia polana: za wieżą
        (8, 13, 11, 13, '~'),    # północno-zachodnia polana: brzeg jeziorka
        (0, 9, 0, 9, 'T'),
        (0, 11, 0, 11, 'T'),
        (47, 4, 48, 7, 'T'),     # ślepy wąwóz kopalni pokeballi: węższy
        (48, 2, 48, 3, 'T'),
        (54, 12, 56, 14, '~'),   # kieszeń pod groblą traktu krainy → jezioro
        (56, 33, 56, 37, 'T'),   # wschodnie rozstaje: zejście do szyjki węższe
        (58, 40, 59, 42, 'T'),   # kieszeń jasnowidza: wschodni kąt
    ]:
        _prostokat(mapa, x0, y0, x1, y1, z, tylko='.j', procz='')
    # Bagno: zachodni skraj (17–18) poza przejściem na polankę (wiersze 28–29).
    _prostokat(mapa, 17, 24, 18, 27, 'T', tylko='b', procz='')
    _prostokat(mapa, 17, 30, 18, 31, 'T', tylko='b', procz='')
    # E4 (T+# ≤ 50 %): jezioro doliny wschodniej wchodzi w las pod grzbietem
    # (65–69, 48–53) — brzeg przestaje być prostą krawędzią.
    _jezioro(mapa, 66.5, 50.5, 4.6, 2.8, (64, 47, 71, 54), tylko='T')
    # Trzy masywy lasu, które niczego nie obrysowują (las za brzegiem,
    # nieprzejezdny po obu stronach), stają się wodą: pod sadem (26–36,
    # 65–71), pod grzbietem nad zachodnią łąką (0–11, 24–26) i w rogu doliny
    # wschodniej nad morzem SE (63–71, 52–60).
    _jezioro(mapa, 30.0, 69.0, 6.6, 3.0, (22, 66, 37, 71), tylko='T')
    _jezioro(mapa, 5.0, 25.0, 6.5, 1.9, (0, 24, 11, 26), tylko='T')
    _jezioro(mapa, 69.5, 57.0, 3.6, 4.6, (64, 52, 71, 60), tylko='T')
    # Woda przy krawędzi SE (66–71, 59–71) była prostokątem — róg zarasta.
    _prostokat(mapa, 66, 59, 67, 59, 'T', tylko='~', procz='')
    _prostokat(mapa, 66, 60, 66, 60, 'T', tylko='~', procz='')


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
    """Rozstawienie SKOMPONOWANE wokół drogi i szyjek.

    Runda 1 (przegrana): „obiekty rozsypane losowo, straże na placu". Runda 2
    (wygrana, ale G1 = NIE): „każdy ekran 21 × 18 niesie ~19 obiektów,
    dziecko nie widzi jednej decyzji; konfetti surowców co 4 pola". Runda 3:
    zamiast pojedynczych surowców STOSY po 3 w kilku miejscach na ekran, każda
    straż w szyjce albo przy stosie, który pilnuje — ekran ma 6–15 obiektów
    i najwyżej dwie straże. Pas sporny jest zabudowany najgęściej (środek gry),
    kraina wroga rzadziej, ale bogaciej (stosy z artefaktami za wodzami).

    Współrzędne są z siatki 72 × 72, (0, 0) w lewym górnym rogu; miejsca są
    listami kandydatów — pierwsze wolne wygrywa.
    """
    # Korytarze dojść do czterech bram zostają PUSTE: skrzynia w piaskowym
    # wąwozie szerokim na dwa pola to skrzynia, którą trzeba obejść bokiem.
    g.zajete += [(x, y) for x in (13, 14) for y in range(40, 51)]
    g.zajete += [(x, y) for x in (49, 50) for y in range(39, 51)]
    g.zajete += [(x, y) for x in (21, 22) for y in range(17, 28)]
    g.zajete += [(x, y) for x in (57, 58) for y in range(17, 32)]

    S = lambda co: ('surowiec', co)
    SKRZ = ('skrzynia', None)
    ART = ('artefakt', None)

    # ===================================================================
    # DOLINA GRACZA
    # ===================================================================
    # --- Zatoka startowa (x 0–16, y 57–71): pierwszy ekran -----------------
    # Dwie kopalnie podstawowe pod skałą bez straży, jeden stos przy zamku
    # (A3), budowle, a w kieszeni w rogu za słabą strażą kopalnia KAMIENIA
    # (runda 4, A2: kamień był dopiero za strażnicą, w pasie spornym).
    _postaw(g, [(4, 59), (5, 59), (3, 59), (4, 60)], ('kopalnia', 'odlamek'))
    _postaw(g, [(3, 64), (4, 64), (3, 65), (2, 64)], ('kopalnia', 'jagoda'))
    # Wiatrak na rozwidleniu traktu (wrota północne | korytarz na rozstaje).
    _postaw(g, [(15, 60), (16, 60), (15, 61)], ('budynek', 'wiatrak'))
    # Runda 5 (E2): obóz zatoki przeszedł do pasa spornego; ognisko zostaje
    # (zatoka miała 188 pól przejezdnych na 10 obiektów).
    _postaw(g, [(14, 66), (15, 66), (14, 67)], ('budynek', 'ognisko'))
    _stos(g, (11, 65), [S('jagoda'), S('odlamek'), S('pokeball')], r=1)
    _postaw(g, [(7, 60), (8, 60), (8, 59)], SKRZ)
    _postaw(g, [(2, 70), (1, 70), (2, 71)], ('kopalnia', 'kamien'))
    _stos(g, (0, 71), [ART], r=1)
    _postaw(g, [SZYJKA_ROGU, (1, 67)], ('potwor', 'slaby'))

    # --- Wrota północne i zakątek za nimi (x 0–12, y 47–53) ----------------
    # Słaba straż na północnym końcu przesmyku (13–14, 50–52).
    _postaw(g, [(14, 51), (13, 51), (14, 52)], ('potwor', 'slaby'))
    # Runda 5: obóz (8, 50) przeszedł do pasa spornego (E2). Kopalnia odłamków
    # zostaje — sonda wymaga ≥ 6 kopalń w dolinie (B1: 7 → 6, do krainy wroga
    # poszła kopalnia jagód z doliny wschodniej).
    _postaw(g, [(17, 48), (18, 48), (16, 49), (17, 49)], ('kopalnia', 'odlamek'))
    _stos(g, (19, 49), [S('kamien')], r=1)
    _postaw(g, [(6, 48), (5, 49), (5, 48)], ('budynek', 'zrodlo'))
    _stos(g, (3, 51), [SKRZ, S('pokeball')], r=2)

    # --- Podnóże zachodnie (x 15–26, y 47–53) za luką rozstajów ------------
    # Słaba straż W bramie (25–26, 54–57), stos tuż za nią.
    _postaw(g, [(25, 55), (26, 55), (25, 56), (26, 56)], ('potwor', 'slaby'))
    _stos(g, (24, 52), [SKRZ], r=1)

    # --- Rozstaje (25, 58): arena jako punkt orientacyjny (D3) --------------
    # Runda 5 (G2): we wnęce (23–24, 56–57) obok placu, nie w poprzek drogi.
    _postaw(g, [(23, 57), (24, 57)], ('budynek', 'arena'))

    # --- Sad (x 22–29, y 60–68) i południowa łąka (x 36–43, y 57–71) --------
    _stos(g, (25, 65), [S('jagoda'), SKRZ], r=2)
    _postaw(g, [(38, 60), (37, 59), (38, 59), (39, 60)], ('kopalnia', 'jagoda'))
    _postaw(g, [(39, 65), (40, 65)], ('potwor', 'slaby'))
    _stos(g, (38, 63), [SKRZ, S('odlamek'), S('pokeball')], r=2)
    # Kieszeń kopalni pokeballi (x 36–43, y 66–71): słaba straż w szyjce
    # (39–40, 65) — pilnuje wejścia, nie samej kopalni (C1).
    _postaw(g, [(38, 69), (37, 69), (39, 69), (38, 70)], ('kopalnia', 'pokeball'))

    # --- Podnóże wschodnie (x 29–43, y 47–54) --------------------------------
    _postaw(g, [(34, 50), (33, 50), (35, 50)], ('budynek', 'gniazdo'))
    _stos(g, (32, 53), [S('jagoda'), S('kamien')], r=1)

    # --- Dolina wschodnia (x 46–71, y 47–71) za wyrwą w murze ----------------
    # Runda 5 (G1): jeden ekran, jedna decyzja — namiot klucznika ze stosem
    # przy ścianie, chatka przy drodze, stos (66, 57) jako jedyny cel na
    # wschodnim końcu. Ognisko, wóz, wiatrak, skrzynie i stos (47, 53)
    # zniknęły, obóz przeszedł do pasa spornego, kopalnia jagód do krainy
    # wroga (B1). Ekran krytyka (46–66, 50–67) — 12 obiektów.
    _postaw(g, [(46, 52), (46, 51), (45, 52)], ('potwor', 'slaby'))
    # Nagrodą straży wyrwy jest stos u wylotu bocznej przełęczy (47, 49)
    # i dolina za nią.
    _postaw(g, [(48, 61), (48, 60), (47, 61), (49, 62)], ('namiot', 'zielony'))
    # Wiatrak doliny wschodniej zniknął (G1), przy namiocie leży stos.
    _stos(g, (49, 58), [S('jagoda'), SKRZ, S('kamien')], r=1)
    # Wylot bocznej przełęczy południowej (46–50, 47–50): stos przy ścieżce.
    _stos(g, (47, 49), [SKRZ, S('kamien')], r=1)
    _postaw(g, [(57, 54), (58, 55), (56, 54), (58, 54)], ('budynek', 'chatka'))
    _stos(g, (66, 57), [S('jagoda'), SKRZ], r=1)
    # Zatoka południowa (x 59–64, y 63–71) za średnią strażą w szyjce (64, 61).
    _kieszen(g, [SZYJKA_ZATOKI, (64, 60), (64, 62)], 'sredni', (63, 63),
             [ART, SKRZ, S('kamien')], r=1)

    # ===================================================================
    # PAS SPORNY — najgęściej zabudowany pas mapy
    # ===================================================================
    # --- Zachodnia odnoga (runda 4, G1/B2/C1): przesmyk z polanki, średnia
    # straż w leśnej szyjce (6, 28–29), za nią JEDEN stos na końcu odnogi.
    # Wnęka przed szyjką ma sporną kopalnię kamienia.
    # Runda 5: stos bliżej szyjki (4, 28) — straż (6, 29) pilnuje zakątka
    # z trzema rzeczami (sonda „całe zakątki").
    _stos(g, (4, 28), [ART, SKRZ, S('pokeball')], r=1)
    _postaw(g, [(6, 29), (6, 28)], ('potwor', 'sredni'))
    # Runda 5 (E4/E2): zachodnia łąka nad jeziorem (1–11, 31–36) — kopalnia
    # kamienia, obóz z doliny wschodniej i ognisko z zatoki zamku, stos
    # na brzegu.
    _postaw(g, [(6, 34), (5, 34), (7, 34)], ('kopalnia', 'kamien'))
    _postaw(g, [(10, 35), (9, 35), (10, 34)], ('budynek', 'oboz-treningowy'))
    _postaw(g, [(3, 32), (2, 32), (3, 33)], ('budynek', 'ognisko'))
    _stos(g, (2, 36), [SKRZ, S('odlamek')], r=1)
    # Polanka przy trakcie (x 12–16, y 27–31).
    _postaw(g, [(14, 31), (13, 31), (14, 30)], ('budynek', 'chatka'))
    _postaw(g, [(13, 28), (13, 27), (14, 28)], ('budynek', 'zrodlo'))
    # SZYJKA TRAKTU (19, 36): średnia straż; nagrodą jest przejście — i stos
    # tuż za nią (runda 5: sonda „straż czegoś pilnuje").
    _postaw(g, [SZYJKA_TRAKTU, (19, 35), (19, 37)], ('potwor', 'sredni'))
    _stos(g, (18, 38), [SKRZ, S('jagoda')], r=1)

    # --- Bród i południe jeziora (x 24–43, y 36–43) ---------------------------
    # Runda 5: bród bez straży — z nią ekran (14–34, 36–53) miał trzy straże
    # (wrota (14, 51), szyjka traktu (19, 36), bród). Bród pilnuje szyjka
    # traktu i zielona strażnica.
    _stos(g, (31, 40), [SKRZ, S('kamien')], r=1)
    # Runda 5 (zmiana 1): stos przy brodzie (27, 42) i na wschodnim brzegu
    # (37, 41).
    _stos(g, (27, 42), [S('pokeball')], r=1)
    _postaw(g, [(35, 37), (34, 37), (35, 36)], ('kopalnia', 'odlamek'))
    _postaw(g, [(41, 43), (42, 43), (41, 42), (43, 42)], ('budynek', 'kamienna-wieza'))
    _stos(g, (37, 41), [SKRZ], r=1)
    _postaw(g, [(38, 38), (39, 38), (38, 39)], ('budynek', 'chatka'))
    # Runda 5 (E2): wiatrak na wschodnim brzegu jeziora, przy trakcie.
    _postaw(g, [(41, 32), (42, 32), (41, 30)], ('budynek', 'wiatrak'))
    _postaw(g, [(33, 43), (34, 43), (32, 43)], ('budynek', 'wiatrak'))

    # --- Północny brzeg jeziora (x 35–40, y 23–29): kieszeń z kopalnią
    # kamienia za średnią strażą w szyjce (40, 28–29).
    _postaw(g, [(37, 25), (36, 25), (38, 25), (37, 26), (38, 26), (37, 27)], ('kopalnia', 'kamien'))
    _kieszen(g, [(40, 29), (40, 28)], 'sredni', (39, 27), [ART], r=1)
    _postaw(g, [(23, 28), (22, 28), (23, 27)], ('budynek', 'chatka'))
    _postaw(g, [(23, 29), (22, 29), (23, 27)], S('jagoda'))


    # --- Wschodnie rozstaje (x 41–58, y 23–44) ---------------------------------
    _postaw(g, [(45, 27), (46, 27), (45, 26), (47, 27), (48, 27)], ('budynek', 'oboz-treningowy'))
    _postaw(g, [(48, 25), (49, 25), (47, 25)], ('kopalnia', 'jagoda'))
    _stos(g, (48, 29), [SKRZ, S('pokeball')], r=1)
    # Runda 5 (G1): wiatrak (46, 33), wóz (56, 33) i ognisko (44, 42)
    # zniknęły — ekran (36–56, 24–43) miał 19 obiektów; wóz stoi w dolinie
    # wschodniej.
    _stos(g, (54, 34), [SKRZ, S('odlamek')], r=1)
    # Runda 4 (B1): kopalnia pokeballi (55, 37) → sporny stos z artefaktem.
    # Runda 5 (C1): straż stoi w szyjce (53–55, 39), stos w kieszeni za nią.
    _postaw(g, [(54, 39), (54, 40)], ('potwor', 'sredni'))
    _stos(g, (55, 41), [ART, SKRZ], r=1)
    _postaw(g, [(53, 41), (52, 41), (54, 41)], ('jasnowidz', None))
    # Runda 5 (G1): źródło (56, 42) zniknęło — okno (51–71, 27–44) miało 17
    # obiektów.

    # --- Jałowa rubież wschodnia (x 59–71, y 23–43) ----------------------------
    # Jedno wejście: zwężenie (59–63, 30–31), średnia straż w nim — i to ona
    # pilnuje całej rubieży (kopalnia kamienia nie ma już własnej straży).
    # Runda 5: w zwężeniu, ale na jego wschodnim końcu (62, 30) — z (60, 30)
    # ekran (40–60, 29–46) miał trzy straże.
    _postaw(g, [(62, 30), (62, 31), (61, 30)], ('potwor', 'sredni'))
    _stos(g, (64, 30), [SKRZ], r=1)
    _postaw(g, [(66, 26), (65, 26), (66, 27)], ('budynek', 'chatka'))
    _postaw(g, [(67, 27), (68, 27), (67, 28), (66, 26)], ('namiot', 'niebieski'))
    _postaw(g, [(69, 33), (68, 33), (69, 34), (68, 34), (69, 31)], ('kopalnia', 'kamien'))
    # Runda 5 (B2): artefakt i kamień południowej kieszeni rubieży w jednym
    # stosie na końcu wąwozu.
    _stos(g, (68, 38), [ART, S('kamien')], r=1)
    _postaw(g, [(67, 29), (66, 29), (66, 30), (70, 38)], ('budynek', 'ognisko'))
    # Runda 5 (G1): chatka (64, 25), gniazdo i źródło rubieży zniknęły —
    # ekran (49–69, 25–42) miał 20 obiektów; w miejscu chatki oczko, chatka
    # i ognisko stoją przy namiocie (66, 26) / (67, 29).

    # ===================================================================
    # KRAINA PRZECIWNIKA
    # ===================================================================
    # --- Północno-zachodnia polana (x 0–27, y 9–20) ---------------------------
    _postaw(g, [(16, 10), (15, 10), (17, 10), (16, 9)], ('budynek', 'wieza-obserwacyjna'))
    _postaw(g, [(3, 14), (4, 14), (3, 13), (4, 15)], ('jasnowidz', None))
    _postaw(g, [(2, 10), (1, 10), (3, 10)], ('budynek', 'portal'))
    # Runda 5: ranczo i luźne surowce zniknęły (ekran północnego pola
    # (0–21, 0–18) miał ponad 10 obiektów, G1) — zostaje 9.
    # Zatoczka na jeziorku (E5): plaża (13–17, 14–16), silna straż w mierzei.
    _kieszen(g, [(15, 13), (15, 12)], 'silny', (15, 15), [ART, SKRZ, S('odlamek')], r=1)
    # Runda 5 (zmiana 3, G1): środek krainy (20–40, 10–20) — wiatrak na końcu
    # odnogi ze stosem przy nim i kopalnia jagód (B1, z doliny wschodniej) na
    # odsłoniętej łące. Wóz, ognisko, źródło, chatka i pojedyncze surowce
    # (24, 18), (32, 18) zniknęły.
    _postaw(g, [(26, 19), (25, 19), (27, 18)], ('budynek', 'wiatrak'))
    _stos(g, (28, 18), [SKRZ, S('pokeball')], r=1)
    _postaw(g, [(23, 12), (24, 12), (25, 12)], ('budynek', 'zrodlo'))
    _postaw(g, [(35, 15), (34, 15), (36, 15), (35, 14)], ('kopalnia', 'jagoda'))
    # Pole za wodzem (x 3–29, y 0–7): skarbiec krańca, jedno wejście (26–27, 8).
    _postaw(g, [(8, 5), (9, 5), (7, 5)], ('kopalnia', 'kamien'))
    _postaw(g, [(20, 3), (19, 3), (21, 3), (18, 4)], ('budynek', 'drzewo-wiedzy'))
    _stos(g, (5, 3), [ART], r=2)
    _stos(g, (25, 6), [ART], r=1)
    _postaw(g, [(26, 8), (27, 8), (26, 9)], ('potwor', 'wodz'))

    # --- Północna polana (x 31–43, y 0–10): kieszeń za silną strażą (37–39, 11–13)
    _postaw(g, [(36, 5), (37, 5), (35, 5), (36, 6)], ('budynek', 'osrodek-ewolucji'))
    _postaw(g, [(33, 8), (34, 8), (33, 9)], ('budynek', 'gniazdo'))
    _stos(g, (37, 9), [ART], r=1)
    _postaw(g, [(38, 12), (37, 12), (38, 11)], ('potwor', 'silny'))

    # --- Środek krainy (x 28–48, y 12–20): przy drodze z przełęczy ------------
    # Runda 4 (B1): kopalnia pokeballi (37, 19) zniknęła. Runda 5 (C1): stos
    # bez osobnego strażnika (przeniesiony na łąkę środka, (38, 15)). Silnej
    # straży z (45, 14) nie ma już nigdzie: w wylocie traktu (grobla 43–48,
    # 13) dawała trzy straże na ekranie z (38, 12) i (53, 8) — kraina ma ich
    # i tak pięć. Portal (G2) zszedł spod grzbietu na łąkę przy trakcie.
    _stos(g, (38, 15), [ART, SKRZ], r=1)
    _postaw(g, [(41, 14), (40, 14), (42, 14), (39, 15)], ('budynek', 'portal'))

    # --- Równina zamku wroga (x 49–71, y 0–20) --------------------------------
    # Runda 5 (C1): silna straż w szyjce (52–54, 8) ślepego wąwozu, nie przy
    # samej kopalni.
    _postaw(g, [(52, 3), (53, 3), (51, 3)], ('kopalnia', 'pokeball'))
    _stos(g, (51, 7), [SKRZ, S('kamien')], r=1)
    _postaw(g, [(53, 8), (52, 8)], ('potwor', 'silny'))
    _postaw(g, [(57, 5), (58, 5), (56, 5)], ('kopalnia', 'odlamek'))
    # Runda 4 (C3): wódz w szyjce (65, 11) strzeże zakątka z RELIKTEM
    # (artefakt w krainie wroga to zawsze relikt) i Dojo, a nie kopalni.
    _postaw(g, [(66, 14), (65, 14), (67, 14)], ART)
    _postaw(g, [(65, 11), (65, 10), (64, 11)], ('potwor', 'wodz'))
    _postaw(g, [(69, 12), (70, 12), (69, 13)], ('budynek', 'kamienna-wieza'))
    _postaw(g, [(68, 9), (67, 9), (68, 10)], ('jasnowidz', None))
    _postaw(g, [(60, 4), (61, 4), (60, 3)], ('budynek', 'wiatrak'))
    _postaw(g, [(64, 17), (63, 17), (64, 16)], ('budynek', 'zrodlo'))
    _stos(g, (59, 15), [SKRZ, S('kamien')], r=1)   # korytarz bocznej przełęczy
    # Runda 5 (G1): ekran równiny (51–71, 0–17) miał 15 obiektów; pojedyncza
    # skrzynia (55, 12), jagoda (64, 13) i skrzynia (70, 14) zniknęły.


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
