#!/usr/bin/env python3
"""Generuje planszę 72 × 72 — mapa „Dwie Doliny", układ wg praktyki Heroes 3.

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
   drugie — „co wziąć najpierw” — i to ono wypełnia środek gry. W Heroes 3 tak
   działa każda dobra mapa 1 na 1: strefa startowa, strefa sporna, strefa wroga.
2. **Przejścia są PRZESUNIĘTE względem siebie i wąskie.** Południowe leżą
   w kolumnach 13–14 i 49–50, północne w 21–22 i 57–58. Nie da się więc
   przejechać mapy w linii prostej: po wyjściu z doliny trzeba przeciąć pas
   sporny w bok, a to właśnie jest ten czas, w którym mapa pokazuje, co ma do
   zaoferowania. Szerokość dwóch pól jest wymuszona mechaniką: strażnik blokuje
   pas szeroki na trzy pola, więc szersze przejście da się obejść bokiem.
3. **Każde przejście ma inny koszt.** Główne to droga bita (70 punktów ruchu
   za pole), boczne to piasek (125) i leży w przeciwległym rogu mapy. Alternatywa
   ma być alternatywą, a nie skrótem — patrz notatka niżej o tym, jak łatwo
   zepsuć mapę drugim przejściem postawionym za blisko startu.

Dlaczego generator, a nie ręczny rysunek
----------------------------------------
72 × 72 to 5184 znaki w 72 wierszach równej długości. Pomyłka o jeden znak jest
pewna, a objawia się jako plansza, która wygląda dobrze i nie działa. Dlatego
tak jak poprzednio: ręcznie wpisujemy SZKIC 18 × 18 (duże krainy), skrypt go
powiększa cztery razy, rozmywa granice, zasklepia rdzenie grzbietów, wycina
przejścia i dopiero na tym rozstawia obiekty.

    python3 tools/generuj_mape.py
"""

import random
from collections import deque
from pathlib import Path

KORZEN = Path(__file__).resolve().parent.parent
WYNIK = KORZEN / 'src' / 'data' / 'plansza-teren.ts'

SKALA = 4
BOK = 72
ZIARNO = 20260913

# Szkic krain, 18 × 18. Każdy znak to kwadrat 4 × 4 pola.
#   .  trawa      ,  piasek     ~  woda
#   T  las        #  góry
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
    '#T...TT....T..##..',
    '#..T....TT.....#..',
    '..T...##...T..T...',
    '.T..~~..T....T....',
    ',,..~~...T...T....',
    '##################',
    '..T....~~~....T...',
    '.,...T.~~~~..T....',
    '..T..TT.~~~...T..,',
    '....T....T....TT..',
    '.T....T....T...T..',
    '##################',
    '..T...T.....T...,,',
    '....TT....T....,,,',
    '.T.....T.....~~,,.',
    '..T.......T..~~~..',
    'T....T......~~~...',
    '..T....T.....~~...',
]

#: Rdzenie obu grzbietów — wiersze, w których pasmo ma być NIEPRZERWANE.
#: Rozmycie pracuje na brzegach pasma (wiersze 20 i 23, 44 i 47), więc zarys
#: zostaje poszarpany, ale rdzenia nie rusza. Bez tego szum wybija w murze
#: dziurę szeroką na pole: nie widać jej ani na obrazku, ani w kodzie — po
#: prostu pewnego dnia da się wejść bokiem, omijając straż, i mapa przestaje
#: być tą mapą.
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
#: przeciąć w poprzek.
#:
#: Przejścia są WĄSKIE — dwa pola, nie cztery. Powód jest mechaniczny: potwór
#: blokuje pola wokół siebie, czyli pas szerokości trzech. Przy przejściu na
#: cztery pola jeden strażnik zostawia szparę, którą da się go obejść bokiem,
#: i cały podział mapy na pasy przestaje istnieć — a wygląda dokładnie tak
#: samo. Zmierzyliśmy to: przy przejściach na cztery pola 74% planszy było
#: dostępne bez jednej wygranej bitwy.
#: Teren przejścia podajemy TUTAJ, a nie w szkicu. Wcześniej szkic miał w murze
#: gotową dziurę szeroką na komórkę szkicu, czyli cztery pola — i `zasklep`
#: nie miał czego zasklepiać, bo zasklepia tylko tam, gdzie szkic mówi „góry”.
#: Mur jest więc w szkicu pełny, a przejścia wycina wyłącznie ta tabela.
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
#: po przekątnej, czyli najdalej, jak się da. Przy starcie naprzeciw siebie
#: (góra–dół) połowa mapy jest po drodze, a połowa nie jest po nic.
PUNKTY = {
    'start': (10, 62),
    'zamek gracza': (8, 64),
    'sad': (20, 66),
    'zatoka poludniowa': (60, 66),
    'rozstaje doliny': (26, 56),
    'podnoze poludniowe': (14, 50),
    'przelecz poludniowa': (13, 45),
    'brod': (26, 40),
    'jezioro': (34, 32),
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
#: blisko startu robi z siebie SKRÓT, a nie alternatywę. Pierwszego dnia dało
#: się wjechać w najsilniejszą straż na mapie i przegrać bitwę, zanim się było
#: w swoim zamku. Boczne przejścia leżą więc po przeciwnej stronie mapy niż
#: wyjazd z doliny, są z piasku i nie mają drogi.
SZLAK = [
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
]

PRZEJEZDNE = set('.,=')


def szkic_na_mape(rng):
    """Powiększa szkic i rozmywa granice, żeby krainy nie były prostokątami."""
    mapa = [[SZKIC[y // SKALA][x // SKALA] for x in range(BOK)] for y in range(BOK)]

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
    """Ile „kosztuje” poprowadzenie drogi przez ten rodzaj terenu.

    Nie jest to koszt ruchu w grze, tylko wskazówka dla trasowania: droga woli
    iść trawą, przez las przejdzie, gór i wody unika zupełnie. Dzięki temu drogi
    omijają grzbiety zamiast je przecinać — chyba że nie ma innej możliwości,
    i wtedy powstaje przełęcz, czyli miejsce warte pilnowania.
    """
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
    """Przywraca rdzenie obu grzbietów do stanu ze szkicu."""
    for _, (y0, y1) in GRZBIETY:
        for y in range(y0, y1 + 1):
            for x in range(BOK):
                if ze_szkicu(x, y) == '#':
                    mapa[y][x] = '#'


def wytnij_przejscia(mapa):
    """Wycina przejścia, oddając im teren ze SZKICU, a nie trawę.

    Boczne przejścia dostają PIASEK i mają nim zostać: gdyby wycinanie zawsze
    kładło trawę, przestałyby być droższe od głównych, a to jedyna rzecz, która
    je od nich odróżnia poza położeniem.
    """
    for _, (x0, y0, x1, y1), teren in PRZEJSCIA:
        for y in range(y0, y1 + 1):
            for x in range(x0, x1 + 1):
                if mapa[y][x] in '#~':
                    mapa[y][x] = teren


def przejscia_w_grzbiecie(mapa, y0, y1):
    """Kolumny, którymi da się przejść przez CAŁY rdzeń grzbietu."""
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

    # Punkty orientacyjne muszą stać na przejezdnym terenie — inaczej trasa do
    # nich nie istnieje i drogi cicho się nie wytyczą.
    #
    # Z JEDNYM wyjątkiem: punktów leżących W RDZENIU grzbietu nie ruszamy.
    # Odsłanianie wokół nich kwadratu 3 × 3 rozpychało przejście z dwóch pól
    # na cztery — a wtedy strażnik zostawia szparę i da się go obejść bokiem.
    # Kosztowało to rundę: przejścia były wycięte jak trzeba, a mierzone
    # w planszy wychodziły dwa razy szersze.
    rdzenie = [zakres for _, zakres in GRZBIETY]
    for x, y in PUNKTY.values():
        if any(y0 <= y <= y1 for y0, y1 in rdzenie):
            continue
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

for nazwa, (y0, y1) in GRZBIETY:
    przejscia = grupy(przejscia_w_grzbiecie(mapa, y0, y1))
    if len(przejscia) != PRZEJSC_W_GRZBIECIE:
        raise SystemExit(
            f'Grzbiet {nazwa}: przejść {len(przejscia)} zamiast {PRZEJSC_W_GRZBIECIE} '
            f'(kolumny {przejscia}). Popraw SZKIC albo PRZEJSCIA.'
        )
    print(f'przejścia przez grzbiet {nazwa} (kolumny):', przejscia)


# ---------------------------------------------------------------------------
# OBIEKTY
# ---------------------------------------------------------------------------
#
# Rozstawiane skryptem z tego samego powodu co teren: obiekt postawiony ręcznie
# na polu, które okazało się skałą, wygląda jak usterka silnika.
#
# O tym, co gdzie stoi, decyduje STREFA, a nie odległość w linii prostej —
# gracz startuje w rogu, więc przeciwległy kraniec jego własnej doliny wypada
# „dalej” niż zamek wroga za grzbietem.
#
#   dom         — dolina gracza (y ≥ 47). Gospodarka i słabe straże. Da się ją
#                 przejść pierwszą armią, w pierwszym tygodniu.
#   pogranicze  — pas sporny między grzbietami (y 21–46). Najgęściej zabudowany
#                 kawałek mapy: kopalnie, budowle, straże średnie i silne.
#   wroga       — kraina przeciwnika (y ≤ 20). Relikty i najsilniejsze straże.

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


GRANICA_POLUDNIOWA = GRZBIETY[1][1][1]   # 46 — ostatni wiersz rdzenia południowego
GRANICA_POLNOCNA = GRZBIETY[0][1][0]     # 21 — pierwszy wiersz rdzenia północnego


def strefa(y):
    """Strefa pola — wyznaczona przez grzbiety, bo to one dzielą tę mapę."""
    if y < GRANICA_POLNOCNA:
        return 'wroga'
    if y <= GRANICA_POLUDNIOWA:
        return 'pogranicze'
    return 'dom'


def wolne_pola(mapa, kroki, zajete, ktora, zakres_krokow=(0, 999), min_odstep=3):
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
    """Rozstawia obiekty i zwraca listę `(pole, (rodzaj, co, nazwa?))`.

    Gęstość jest dobrana do rozmiaru: na 72 × 72 mamy 5184 pola, więc przy
    gęstości poprzedniej planszy (obiekt na 27 pól) wyszłaby pustynia z rzadka
    zastawiona skrzyniami. Heroes 3 na mapie M trzyma obiekt mniej więcej co
    20–25 pól przejezdnych i tyle tu celujemy, z ciężarem przesuniętym na pas
    sporny — to on ma być powodem, żeby wyjść z doliny.
    """
    zajete = list(PUNKTY.values())
    obiekty = []

    def dodaj(ile, ktora, zakres, buduj, odstep=3):
        """Stawia `ile` obiektów w strefie i zwraca ich pola."""
        pola = []
        for _ in range(ile):
            wolne = wolne_pola(mapa, kroki, zajete, ktora, zakres, odstep)
            if not wolne:
                raise SystemExit(f'Brak miejsca na obiekt: {ktora} {zakres}. Popraw SZKIC.')
            pole = rng.choice(wolne)
            zajete.append(pole)
            obiekty.append((pole, buduj(pole)))
            pola.append(pole)
        return pola

    def strzez(pola, sila):
        """Stawia straż PRZY obiekcie, od strony, z której się do niego podchodzi.

        W Heroes 3 wartościowa rzecz prawie nigdy nie leży luzem: pilnuje jej
        stado stojące obok, bo potwór blokuje pola wokół siebie. Bez tego pas
        sporny byłby darmowy i cała krzywa trudności rozjeżdża się w dwa dni.
        """
        for x, y in pola:
            kandydaci = [
                (x + dx, y + dy)
                for dy in (-1, 0, 1)
                for dx in (-1, 0, 1)
                if (dx or dy)
                and 0 <= x + dx < BOK
                and 0 <= y + dy < BOK
                and mapa[y + dy][x + dx] in PRZEJEZDNE
                and (x + dx, y + dy) not in zajete
                # Straż ma stać od strony gracza, czyli na polu BLIŻSZYM startu:
                # postawiona za obiektem nie pilnuje niczego.
                and kroki.get((x + dx, y + dy), 999) < kroki.get((x, y), 0)
            ]
            if not kandydaci:
                continue
            pole = rng.choice(kandydaci)
            zajete.append(pole)
            obiekty.append((pole, ('potwor', sila)))

    # --- DOLINA GRACZA -----------------------------------------------------
    # Pierwszy tydzień. Ma być co robić od pierwszego dnia, bez jednej przegranej
    # bitwy: trzy stosy surowca i dwie skrzynie leżą w zasięgu pierwszych tur,
    # a pierwsza kopalnia stoi bez straży.
    dodaj(4, 'dom', (3, 10), lambda p: ('surowiec', rng.choice(['jagoda', 'pokeball'])))
    dodaj(2, 'dom', (3, 10), lambda p: ('skrzynia', None))
    dodaj(1, 'dom', (4, 10), lambda p: ('kopalnia', 'jagoda'))
    dodaj(2, 'dom', (6, 12), lambda p: ('potwor', 'slaby'))

    # Reszta doliny: gospodarka, którą buduje się przed wyprawą na północ.
    # Liczby kopalń i stosów są dobrane tak, żeby SAMA dolina wystarczała na
    # rozbudowę miasta w kilkadziesiąt dni — mierzy to `probe-ekonomia.ts`.
    # Gdy kopalń w dolinie było pięć, miasto nie stawało w ogóle i mapa mówiła
    # „przełam straż albo nic”, co na średnim poziomie trudności jest za ostro.
    dodaj(10, 'dom', (10, 40), lambda p: ('surowiec', rng.choice(['jagoda', 'odlamek', 'pokeball'])))
    # Surowce kopalń są WYPISANE, nie losowane. Losowanie potrafiło nie dać
    # dolinie ani jednej kopalni odłamków — a odłamkami płaci się za całą górną
    # połowę drzewka miasta. Mapa wyglądała wtedy dobrze i po prostu nie dało
    # się na niej skończyć zamku: nie z powodu ceny, tylko braku surowca po tej
    # stronie grzbietu. W Heroes 3 strefa startowa zawsze ma komplet podstawowy.
    kopalnie_dom = []
    for co in ['odlamek', 'jagoda', 'odlamek', 'pokeball', 'jagoda', 'pokeball']:
        kopalnie_dom += dodaj(1, 'dom', (10, 40), lambda p, co=co: ('kopalnia', co))
    strzez(kopalnie_dom[:4], 'slaby')
    skrzynie_dom = dodaj(9, 'dom', (10, 40), lambda p: ('skrzynia', None))
    strzez(skrzynie_dom[:3], 'slaby')
    dodaj(3, 'dom', (12, 40), lambda p: ('potwor', 'slaby'))
    artefakty_dom = dodaj(4, 'dom', (14, 40), lambda p: ('artefakt', None))
    strzez(artefakty_dom, 'sredni')

    # Budowle doliny: same rzeczy dobre od pierwszego dnia — drobne nagrody,
    # ruch i statystyki. To one wypełniają przestrzeń między kopalniami i dają
    # powód, żeby nadłożyć drogi.
    for i, b in enumerate([
        'ognisko', 'chatka', 'wiatrak', 'zrodlo', 'oboz-treningowy', 'ranczo',
        'gniazdo', 'drzewo-wiedzy', 'woz', 'chatka', 'ognisko', 'zrodlo',
        'wiatrak', 'gniazdo',
    ]):
        dodaj(1, 'dom', (3 + i * 2, 45), lambda p, b=b: ('budynek', b))

    # --- PAS SPORNY --------------------------------------------------------
    # Środek gry. Najgęstszy kawałek mapy i jedyny, w którym stoją obok siebie
    # rzeczy tanie i drogie: gracz ma wybierać, co bierze najpierw, a nie
    # zbierać wszystko po kolei.
    dodaj(18, 'pogranicze', (0, 999), lambda p: ('surowiec', rng.choice(['jagoda', 'odlamek', 'kamien', 'pokeball'])))
    kopalnie_srodek = []
    for co in ['odlamek', 'kamien', 'pokeball', 'odlamek', 'kamien', 'jagoda', 'pokeball', 'odlamek']:
        kopalnie_srodek += dodaj(1, 'pogranicze', (0, 999), lambda p, co=co: ('kopalnia', co))
    strzez(kopalnie_srodek[:6], 'sredni')
    skrzynie_srodek = dodaj(14, 'pogranicze', (0, 999), lambda p: ('skrzynia', None))
    strzez(skrzynie_srodek[:6], 'sredni')
    artefakty_srodek = dodaj(8, 'pogranicze', (0, 999), lambda p: ('artefakt', None))
    strzez(artefakty_srodek[:6], 'silny')
    dodaj(4, 'pogranicze', (0, 999), lambda p: ('potwor', 'sredni'))
    dodaj(2, 'pogranicze', (0, 999), lambda p: ('potwor', 'silny'))

    for b in [
        'arena', 'wieza-obserwacyjna', 'kamienna-wieza', 'ranczo', 'gniazdo',
        'wiatrak', 'ognisko', 'chatka', 'woz', 'drzewo-wiedzy', 'zrodlo',
        'oboz-treningowy', 'ognisko', 'gniazdo', 'ranczo', 'woz',
    ]:
        dodaj(1, 'pogranicze', (0, 999), lambda p, b=b: ('budynek', b))
    # Para portali — oba PO TEJ SAMEJ stronie grzbietu. Para przez grzbiet
    # obchodziłaby strażników przełęczy i unieważniała cały układ mapy.
    dodaj(2, 'pogranicze', (0, 999), lambda p: ('budynek', 'portal'))

    # --- KRAINA PRZECIWNIKA ------------------------------------------------
    # Po co się tam w ogóle jedzie: relikty, kopalnie kamienia i najsilniejsze
    # straże na mapie. Prawie wszystko pilnowane — tu nie ma nic za darmo.
    dodaj(13, 'wroga', (0, 999), lambda p: ('surowiec', rng.choice(['kamien', 'odlamek', 'pokeball'])))
    kopalnie_wroga = []
    for co in ['kamien', 'kamien', 'pokeball', 'odlamek', 'kamien', 'pokeball', 'jagoda', 'odlamek']:
        kopalnie_wroga += dodaj(1, 'wroga', (0, 999), lambda p, co=co: ('kopalnia', co))
    strzez(kopalnie_wroga[:6], 'silny')
    skrzynie_wroga = dodaj(12, 'wroga', (0, 999), lambda p: ('skrzynia', None))
    strzez(skrzynie_wroga[:5], 'silny')
    artefakty_wroga = dodaj(8, 'wroga', (0, 999), lambda p: ('artefakt', None))
    strzez(artefakty_wroga[:6], 'silny')
    dodaj(3, 'wroga', (0, 999), lambda p: ('potwor', 'silny'))

    for b in [
        'osrodek-ewolucji', 'arena', 'kamienna-wieza', 'wieza-obserwacyjna',
        'gniazdo', 'ranczo', 'wiatrak', 'ognisko', 'drzewo-wiedzy', 'woz',
        'zrodlo', 'chatka',
    ]:
        dodaj(1, 'wroga', (0, 999), lambda p, b=b: ('budynek', b))
    dodaj(2, 'wroga', (0, 999), lambda p: ('budynek', 'portal'))

    return obiekty


kroki = kroki_od(mapa, PUNKTY['start'])
rng2 = random.Random(ZIARNO + 1)
obiekty = rozstaw(mapa, kroki, rng2)

# Straże graniczne stoją osobno i zawsze w tym samym miejscu. To one trzymają
# mapę w ryzach i losowanie ich położenia zamieniłoby zamysł mapy w przypadek.
#
# Każda stoi po DALSZEJ stronie swojego przejścia (patrząc od gracza): w wylocie
# bliższym dałoby się do niej dojechać pierwszego dnia i przegrać pierwszą bitwę
# w grze, zanim się w ogóle było w swoim zamku.
STRAZE_GRANICZNE = [
    ((13, 44), 'straznik', 'Strażnik Przełęczy Południowej'),
    ((49, 44), 'straznik', 'Strażnik Piaskowego Wąwozu'),
    ((21, 20), 'wodz', 'Wódz Przełęczy Północnej'),
    ((57, 20), 'wodz', 'Wódz Północnej Rubieży'),
]
for pole, sila, nazwa in STRAZE_GRANICZNE:
    x, y = pole
    if mapa[y][x] not in PRZEJEZDNE:
        raise SystemExit(f'{nazwa} stoi na nieprzejezdnym polu {pole}.')
    obiekty.append((pole, ('potwor', sila, nazwa)))

# --- sprawdzenia, które muszą przejść, zanim plik powstanie ----------------

pola_obiektow = [p for p, _ in obiekty]
if len(set(pola_obiektow)) != len(pola_obiektow):
    raise SystemExit('Dwa obiekty stoją na tym samym polu.')
for (x, y), _ in obiekty:
    if mapa[y][x] not in PRZEJEZDNE:
        raise SystemExit(f'Obiekt na nieprzejezdnym polu ({x},{y}).')
sx, sy = PUNKTY['start']
for (x, y), co in obiekty:
    if co[0] == 'potwor' and odleglosc((x, y), (sx, sy)) <= 2:
        raise SystemExit(f'Straż stoi na progu startu ({x},{y}).')

print(f'obiektów: {len(obiekty)}')
policz = {}
for (x, y), _ in obiekty:
    policz[strefa(y)] = policz.get(strefa(y), 0) + 1
print('obiektów w strefach:', policz)
print('kroków do zamku wroga:', kroki.get(PUNKTY['zamek wroga']))
print('kroków do straży granicznych:', [kroki.get(p) for p, _, _ in STRAZE_GRANICZNE])

wiersze = [''.join(w) for w in mapa]
udzial = {z: sum(w.count(z) for w in wiersze) for z in '.,=T#~'}
print(f'plansza {BOK} × {BOK}, pól przejezdnych: {len(dostepne)}')
print('udział terenów:', {k: f'{v * 100 // (BOK * BOK)}%' for k, v in udzial.items()})
print(f'gęstość: obiekt co {len(dostepne) / len(obiekty):.1f} pola przejezdne')

naglowek = f'''// PLIK GENEROWANY — nie poprawiaj ręcznie.
// Źródło: tools/generuj_mape.py (szkic krain jest w tamtym pliku).
//
// Plansza {BOK} × {BOK} („Dwie Doliny”, rozmiar M) — trzy pasy rozdzielone dwoma
// grzbietami górskimi, każdy grzbiet z dwoma pilnowanymi przejściami:
// dolina gracza na południowym zachodzie, pas sporny pośrodku, kraina
// przeciwnika na północnym wschodzie.
// Znaki: . trawa, = ścieżka, , piasek, T las, # skały, ~ woda.

export const TEREN = [
'''
tresc = naglowek + ''.join(f"  '{w}',\n" for w in wiersze) + '];\n\n'
tresc += 'export const PUNKTY = {\n'
for nazwa, (x, y) in PUNKTY.items():
    tresc += f"  '{nazwa}': {{ x: {x}, y: {y} }},\n"
tresc += '};\n\n'
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
# Czego brakuje, żeby to była mapa na poziomie najlepszych map Heroes 3
# ---------------------------------------------------------------------------
#
# 1. STRAŻNICA GRANICZNA i NAMIOT KLUCZNIKA. Strażnicy nie da się pokonać,
#    tylko OTWORZYĆ, po znalezieniu namiotu gdzie indziej. To zamienia „zbierz
#    armię” w „poszukaj klucza” i jest najtańszym sposobem na drugie pytanie
#    w środku gry. U nas w przejściach stoją zwykłe stada.
# 2. WIĘZIENIE z drugim bohaterem. Drugi bohater to drugi kierunek naraz,
#    czyli jedyny powód, dla którego mapa M nie nudzi się w trzecim tygodniu.
# 3. CHATA JASNOWIDZA — „przynieś X, dostaniesz Y”. Jedyny obiekt w Heroes 3,
#    który każe wrócić w to samo miejsce po raz drugi.
# 4. PRZECIWNIK, KTÓRY GRA. Zamek wroga stoi i czeka; dopóki nikt nim nie
#    rusza, mapa ma tempo wyścigu z samym sobą, a nie z kimś.
