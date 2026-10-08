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
    'TTTb.Tbb.bTbbb....',
    'TT~bb..b.bbbbb....',
    'Tbb~bTb..Tbb~b..T.',
    'Tbbbbbbb.bb~bb...T',
    '##TTTTTT##TTTTT~bT',
    'Tb.b~~~~..bbbb~bTT',
    'Tbb~~~~~bbbbb~bbTT',
    'TTbbbbbbbbbbbb~bbT',
    'TbbbbbbTbbb.bbbbTT',
    'T.bbbbbbbbb~Tbb.bT',
    'bb.bbbbbbbbbb~~bbT',
    'Tb.Tb.Tbb.bbbbbbbT',
    'T.#b.Tbbb..Tbb~bbT',
    'Tbb.T.bbbb.bbTb~~T',
    'T.bb.bT~bb.TTbb~bT',
    'Tb.Tbbbbb..bbb~b.T',
    'TTTT#TTbTTTTbTTTTT',
]


def struga_y(x):
    """Środek poziomego odcinka Czarnej Strugi w kolumnie `x`. Zmiana najwyżej
    o pole na krok — inaczej brzegi stykają się po skosie i kanał jest dziurawy."""
    return 33 + round(1.3 * math.sin(x / 3.5))


def struga_x(y):
    """Środek pionowego odcinka Czarnej Strugi w wierszu `y`. Runda 13 (ślepe
    porównanie z oficjalną mapą: „strefa domowa to 135 pól, pogranicze 63 %
    mapy"): odcinek przesunięty z x≈20 na x≈29 — dolina gracza sięga teraz
    x 0–27, a za nią Struga z pasem lasu jest GRZBIETEM DOMOWYM."""
    return 29 + round(1.3 * math.sin(y / 4.0))


#: Grzbiet wroga (runda 13): masyw lasu i skał w wierszach 15–17 od zachodniej
#: krawędzi po pierścień wyspy, z JEDNĄ bramą na grobli do warowni. Rdzeń
#: pilnuje silnik (`GRZBIETY`/`PRZEJSCIA`): rozmycie szkicu nie wybije w nim
#: dziury, a przejść ma być dokładnie jedno.
GRZBIET_WROGA = (15, 17)
GRZBIET_KONIEC = 44
BRAMA_WROGA = (26, 15, 27, 17)
GRZBIETY = [('wroga', 'y', GRZBIET_WROGA, (0, GRZBIET_KONIEC))]
PRZEJSCIA = [('wroga', BRAMA_WROGA, '.')]
PRZEJSC_W_MURZE = 1
ZNAKI_MURU = '#T'


WYSPA = (46, 8)
#: Pierścień wody wokół wyspy: od tego promienia do `PIERSCIEN_ZEWN` jest woda.
PIERSCIEN_WEWN = 5.2
PIERSCIEN_ZEWN = 8.2

#: Przeprawy. `(x0, y0, x1, y1)`.
GROBLA_PN = (11, struga_y(12) - 2, 12, struga_y(12) + 2)
#: Runda 7: wschodnia przeprawa to most nad wąską Strugą (dwa pola wody pod
#: deskami; w grze droga, w tle woda — `MOSTY` niżej), a nie bród z łąki:
#: łata łąki w poprzek rzeki czytała się jak koniec wody.
STRUGA_WASKA_OD = 36
MOST_WSCH = (struga_x(44) - 1, 44, struga_x(44), 44)
GROBLA_WYSPY = (45, 13, 46, 17)

ZAPORY = {
    'Czarna Struga': {
        'przejscia': [GROBLA_PN, MOST_WSCH],
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
    'brod wschod': (31, 44),
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
#: Las drogi nie przecina (runda 13): grobla ma iść bramą i przeprawami, nie
#: skrótem przez pas lasu grzbietu.
KOSZT_DROGI = {'b': 1.5, 'T': 12}

#: Obiekty stoją też na bagnie — inaczej trzęsawisko byłoby pustą plamą.
POD_OBIEKTY = '.,b'

ZASYP_ODCIETE = True


#: Dół doliny gracza, x 4–17, y 47–53 (patrz `popraw_teren`).
DOLINA_DOL = [
    'bb..........bb',
    'bb...........b',
    'bbb..........b',
    '#####b.....###',
    '#####~~....###',
    '#####~~....###',
    '#####b.....###',
]
# Runda 8 (HotA: „góry to osobne stożki — nie łączą się w grzbiety i nie
# zamykają dolin"): dół doliny zamyka CIĄGŁE pasmo — od lasu na zachodzie
# do Czarnej Strugi na wschodzie, z jedną przełęczą, którą schodzi ścieżka.
# Oczko wody przeszło spod skał na skraj przełęczy. Pasmo rysują duże góry
# z `masywy` (USTAWIENIA), nie kępy 3 × 2.
# Runda 6 (wzorzec HotA: „poza klifem w lewym górnym rogu nie ma przeszkód
# ani rzeźby — środek i prawy dół to płaska łąka z okrągłymi krzaczkami"):
# dwa omszałe urwiska w dolnych rogach doliny, 3 × 4 pola, czyli po dwie
# kępy 3 × 2 jedna nad drugą. Trakt w dół doliny idzie MIĘDZY nimi — skały
# wyznaczają przejście, jak przełęcz na mapie Heroes 3.

#: Omszałe wzgórza na lewym skraju pierwszego ekranu, x 4–9, y 37–44 (runda 5:
#: „płaski teren bez wzniesień i skarp"). Sześć pól na szerokość i osiem na
#: wysokość to cztery rzędy po dwie kępy 3 × 2 — scena kładzie je w zwarte
#: pasmo, a nie w pojedyncze głazy.
WZGORZA = (4, 37, 9, 44)

#: Ścieżka z pola startu w dół doliny — do kopalń i skrzyni, dalej za kadr.
SCIEZKA_DOLU = [(13, 47), (13, 48), (14, 49), (14, 50), (13, 51), (13, 52), (13, 53)]


def po_drogach(g, mapa):
    for x, y in SCIEZKA_DOLU:
        mapa[y][x] = '='
    # Runda 9: rozstaje pod polem startu były blokiem 2 × 2 pól drogi — kręta
    # droga rysowała z niego pierścień z kwadratową wysepką trawy w środku.
    # Odnoga do zamku odchodzi teraz od ścieżki w dół, jedno pole niżej.
    if mapa[46][12] == '=' and mapa[47][11] == '=':
        mapa[46][12] = '.'
        mapa[47][12] = '='


def przy_drodze(g, pola, zasieg=2):
    """Pola kadru blisko drogi, na których mur budowli (rząd nad wejściem) nie
    wejdzie na drogę — w Heroes kopalnie i skarby stoją przy trakcie."""
    m = g.mapa
    wynik = []
    for x, y in pola:
        if not any(
            0 <= y + dy < BOK and 0 <= x + dx < BOK and m[y + dy][x + dx] == '='
            for dy in range(-zasieg, zasieg + 1)
            for dx in range(-zasieg, zasieg + 1)
        ):
            continue
        if any(m[y - 1][x + dx] == '=' for dx in (-1, 0, 1)):
            continue
        wynik.append((x, y))
    return wynik


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
        # Runda 7 („prawa trzecia kadru to mętna plama bez rzeźby"): w kadrze
        # startu Struga jest wąską, czystą wstęgą na dwa pola, bez zatok —
        # szeroka na trzy z przypadkowymi oczkami robiła z prawej trzeciej
        # ekranu jedną ciemną taflę. Losowanie zatoki zostaje (to samo ziarno
        # dla reszty planszy), tylko jej nie malujemy.
        waska = y >= STRUGA_WASKA_OD
        for x in range(cx - 1, cx + (1 if waska else 2)):
            mapa[y][x] = '~'
        if rng.random() < 0.3:
            zatoka = cx + (2 if rng.random() < 0.5 else -2)
            if not waska:
                mapa[y][zatoka] = '~'
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
            # Runda 13 (werdykt: kałuże bez funkcji): oczek o połowę mniej —
            # jezioro środka i stawy ze szkicu mają być widoczne, nie krople.
            if mapa[y][x] != 'b' or rng.random() > 0.014:
                continue
            if any(max(abs(x - px), abs(y - py)) <= 3 for px, py in punkty):
                continue
            # Runda 7: wschodni brzeg Strugi w kadrze to ląd z obiektami, nie
            # kolejne oczka przyklejone do rzeki.
            if y >= STRUGA_WASKA_OD - 1 and abs(x - struga_x(y)) <= 4:
                continue
            for dx, dy in [(0, 0)] + rng.sample([(1, 0), (0, 1), (1, 1), (-1, 0)], rng.randint(0, 3)):
                if mapa[y + dy][x + dx] == 'b':
                    mapa[y + dy][x + dx] = '~'
    # Przeprawy: grobla przez Strugę, bród, grobla na wyspę.
    # Bród w kadrze startu to łąka pod traktem, nie piasek (runda 6: jasna
    # piaskowa łata w środku rzeki czytała się jak dziura w tle).
    for (x0, y0, x1, y1), teren in ((GROBLA_PN, '.'), (MOST_WSCH, ','), (GROBLA_WYSPY, ',')):
        for y in range(y0, y1 + 1):
            for x in range(x0, x1 + 1):
                mapa[y][x] = teren
    # Wyloty przepraw zawsze przejezdne na dwa pola w głąb.
    for x0, y0, x1, y1 in (GROBLA_PN, GROBLA_WYSPY):
        for x in range(x0, x1 + 1):
            for y in (y0 - 2, y0 - 1, y1 + 1, y1 + 2):
                if mapa[y][x] not in '.,=b':
                    mapa[y][x] = 'b'
    # Przyczółki mostu przejezdne na dwa pola w głąb.
    x0, y0, x1, y1 = MOST_WSCH
    for y in range(y0, y1 + 1):
        for x in (x0 - 2, x0 - 1, x1 + 1, x1 + 2):
            if mapa[y][x] not in '.,=b':
                mapa[y][x] = '.'
    # Dół pierwszego ekranu (runda 4: „cała dolna połowa to zbita ściana
    # roślinności bez drogi — nie widać, gdzie przejezdne"). Las 3 × 2 rysuje
    # się jako kępa wysoka na cztery i pół pola, więc dwa rzędy lasu przy
    # dolnej krawędzi zasłaniały trzy rzędy łąki nad sobą. Zostaje sucha łąka
    # (tu stoją kopalnie i skrzynia), oczko wody z trzcinowym brzegiem, bagno
    # przy Strudze i pojedyncze drzewa — żadnej kępy w kadrze.
    x0, y0, x1, y1 = WZGORZA
    for y in range(y0, y1 + 1):
        for x in range(x0, x1 + 1):
            mapa[y][x] = '#'
    for dy, wiersz in enumerate(DOLINA_DOL):
        y = 47 + dy
        for dx, znak in enumerate(wiersz):
            x = 4 + dx
            if x < struga_x(y) - 2 and mapa[y][x] != '~' or znak == '~':
                mapa[y][x] = znak
    # Pasmo w dole doliny dochodzi do samej Strugi (runda 8).
    # Runda 13: Struga odeszła na x≈29, więc pasmo kończy się na x 19 —
    # dalej jest zakątek doliny z wieżą i stosem nagród.
    for y in range(50, BOK):
        for x in range(18, 20):
            if mapa[y][x] != '~':
                mapa[y][x] = '#'
    # Runda 8 („prawa trzecia kadru to ciemnoturkusowa plama — nie widać,
    # gdzie kończy się ląd, a zaczyna woda"): wschodni brzeg Strugi w kadrze
    # startu to SUCHY pas łąki na cztery pola, z czytelnym brzegiem; bagno
    # z oczkami zaczyna się dopiero za nim. Błoto z kałużami tuż przy rzece
    # zlewało się z wodą w jedną taflę.
    for y in range(STRUGA_WASKA_OD, BOK):
        ostatnia = max((x for x in range(struga_x(y) - 2, struga_x(y) + 3) if mapa[y][x] == '~'), default=struga_x(y))
        for x in range(ostatnia + 1, ostatnia + 5):
            if mapa[y][x] == 'b':
                mapa[y][x] = '.'
    # Runda 9 (HotA, 0/3: „brudne, ciemne, rozmyte przejścia — schodkowe
    # obwódki w kształcie kratki kafli wokół ścieżek i łąk, ciemnozielone
    # rozlane plamy przy rozwidleniu i oczkach, szarozielona smuga wzdłuż
    # rzeki"): wszystkie te obwódki to łaty trzęsawiska `b` rozsiane po
    # dolinie przez rozmycie szkicu — pojedyncze pola błota z czołem skarpy
    # i mokrą obwódką, każda w kształcie swoich kafli. Dolina jest SUCHA
    # (tak ją opisuje ta plansza), więc w pierwszym ekranie nie ma już
    # ani jednego pola bagna: łąka, droga, Struga z brzegiem, jedno oczko
    # z trzciną w przełęczy, las i góry. Trzęsawisko zaczyna się za kadrem.
    for y in range(34, BOK):
        cx = struga_x(y)
        for x in range(0, min(BOK, cx - 1)):
            if mapa[y][x] == 'b':
                mapa[y][x] = '.'
    # Wschodni brzeg pod mostem: ze szkicu zostało tu oczko przyklejone do
    # Strugi i pojedyncze pole lasu między nimi — z bliska jedna rozmyta
    # smuga. Brzeg ma być jedną czystą linią: rzeka, pas piasku, łąka.
    for y in range(MOST_WSCH[1] + 1, BOK):
        cx = struga_x(y)
        for x in range(cx + 1, min(BOK, cx + 6)):
            if mapa[y][x] in '~T':
                mapa[y][x] = '.'
    # Za to prawy skraj kadru zamyka ściana wierzb (las), jak masyw lasu na
    # brzegu kadru we wzorcu HotA — łąka za Strugą przestaje być pustą
    # połacią urwaną ramą. Wolne zostają trakt za mostem i pas przy rzece.
    for y in list(range(37, 42)) + list(range(47, 53)):
        for x in range(struga_x(y) + 4, struga_x(y) + 7):
            if mapa[y][x] in '.b':
                mapa[y][x] = 'T'
    # Oczko z trzciną nad pasmem przy Strudze (jak stawy pod wodospadami we
    # wzorcu HotA) — dół kadru między traktem a rzeką był pustą łąką.
    for x, y in ((15, 48), (16, 48), (15, 49), (16, 49)):
        mapa[y][x] = '~'
    grzbiet_domowy(mapa)
    for x0, y0, x1, y1, wejscie in ZAKATKI:
        zakatek(mapa, x0, y0, x1, y1, wejscie)


#: Zakątki pogranicza (runda 13): prostokąt wnętrza `(x0, y0, x1, y1)` i pole
#: wejścia na jego obwodzie. Obwód zarasta lasem, wejście zostaje jedyną
#: szyjką — silnik znajduje je potem jako kieszeń (`znajdz_kieszenie`),
#: a `rozstaw` kładzie w środku stos nagród i stawia straż w szyjce.
#: Zachodni zakątek za jeziorem, północno-wschodni przy grobli na wyspę,
#: wschodni nad jeziorem wschodnim; czwarty (południowo-wschodni, za
#: jeziorem) wycina sam teren.
ZAKATKI = [
    (3, 19, 8, 22, (6, 23)),
    (48, 19, 50, 22, (49, 23)),
    (43, 35, 46, 37, (42, 36)),
    (36, 19, 39, 21, (37, 22)),
    (48, 27, 50, 29, (49, 30)),
]


def zakatek(mapa, x0, y0, x1, y1, wejscie):
    """Zakątek zamknięty lasem z jednym wejściem. Pola po skosie na zewnątrz
    od wejścia też zarastają: szyjka ma wtedy najwyżej czterech przejezdnych
    sąsiadów, a strażnik w niej zamyka cały zakątek (potwór blokuje 3 × 3)."""
    ex, ey = wejscie
    for y in range(y0 - 1, y1 + 2):
        for x in range(x0 - 1, x1 + 2):
            if not (0 <= x < BOK and 0 <= y < BOK) or mapa[y][x] == '=':
                continue
            if x0 <= x <= x1 and y0 <= y <= y1 or (x, y) == wejscie:
                mapa[y][x] = 'b'
            else:
                mapa[y][x] = 'T'
    # Pola po skosie na zewnątrz od wejścia.
    if ey in (y0 - 1, y1 + 1):
        dy = -1 if ey == y0 - 1 else 1
        skosy = [(ex - 1, ey + dy), (ex + 1, ey + dy)]
        prosto = (ex, ey + dy)
    else:
        dx = -1 if ex == x0 - 1 else 1
        skosy = [(ex + dx, ey - 1), (ex + dx, ey + 1)]
        prosto = (ex + dx, ey)
    for x, y in skosy:
        if 0 <= x < BOK and 0 <= y < BOK and mapa[y][x] != '=':
            mapa[y][x] = 'T'
    x, y = prosto
    if mapa[y][x] not in '.,=b':
        mapa[y][x] = 'b'


def grzbiet_domowy(mapa):
    """Runda 13: Czarna Struga jako GRZBIET, nie kreska wody. Na zewnętrznym
    (północnym i wschodnim) brzegu rośnie pas lasu na dwa pola — z minimapy
    widać ciągłą bryłę „las + woda" szeroką na pięć pól, która oddziela
    dolinę gracza od trzęsawiska. Pas ma dokładnie dwie wyrwy: wylot grobli
    północnej i przyczółek mostu; obie zamyka straż."""
    zakret = struga_x(struga_y(20))
    for x in range(0, zakret + 2):
        if GROBLA_PN[0] - 1 <= x <= GROBLA_PN[2] + 1:
            continue
        cy = struga_y(x)
        for y in (cy - 3, cy - 2):
            if mapa[y][x] not in '~=':
                mapa[y][x] = 'T'
    for y in range(struga_y(zakret) - 4, BOK):
        if MOST_WSCH[1] - 1 <= y <= MOST_WSCH[3] + 1:
            continue
        cx = struga_x(y) if y >= struga_y(zakret) - 1 else zakret
        brzeg = cx if y >= STRUGA_WASKA_OD else cx + 1
        for x in (brzeg + 1, brzeg + 2):
            if x < BOK and mapa[y][x] not in '~=':
                mapa[y][x] = 'T'


def w_dolinie(x, y):
    return y > struga_y(min(x, BOK - 1)) + 1 and x < struga_x(y) - 1


def strefa(x, y):
    """Dolina za Strugą to dom; wyspa i wszystko za grzbietem wroga to kraina
    wroga; reszta — trzęsawisko (pogranicze)."""
    if w_dolinie(x, y):
        return 'dom'
    if math.hypot(x - WYSPA[0], y - WYSPA[1]) <= PIERSCIEN_ZEWN + 1 or (y < GRZBIET_WROGA[1] and x <= GRZBIET_KONIEC):
        return 'wroga'
    return 'pogranicze'


def rozstaw(g):
    rng = g.rng

    # Runda 6: kępa skał to rysunek wysoki na cztery i pół pola, więc obiekt
    # stojący rząd albo dwa NAD skałami chował się za granią (wejście do
    # sadu, artefakt pod strażą). Takie pola nie są kandydatami nigdzie.
    def pod_skalami(p):
        x, y = p
        return any(
            0 <= y + dy < BOK and 0 <= x + dx < BOK and g.mapa[y + dy][x + dx] == '#'
            for dy in (1, 2)
            for dx in (-1, 0, 1)
        )

    wolne_pola = g.wolne_pola
    g.wolne_pola = lambda *a, **kw: [p for p in wolne_pola(*a, **kw) if not pod_skalami(p)]

    # Runda 9 (HotA: „obiekty doklejone": wiatrak wchodził na obóz, stos
    # pokeballi leżał na koronie drzewa wiedzy, ranczo siedziało na drzewie):
    # rysunek budowli sięga dwa rzędy nad jej pole, więc (1) budowle stoją co
    # najmniej trzy pola od siebie i od zamku, (2) nic nie leży w tym pasie
    # nad budowlą, a budowla nie staje tuż pod czymś, co jej rysunek by
    # przykrył. Gdy tak się nie da — dawne losowanie (plansza ma powstać).
    dodaj = g.dodaj
    zx, zy = PUNKTY['zamek gracza']

    def budowla(wpis):
        return wpis[0] in ('budynek', 'kopalnia')

    def nad(b, p, wys=2, szer=1):
        return abs(p[0] - b[0]) <= szer and 1 <= b[1] - p[1] <= wys

    def luzno(p, jest_budowla):
        if nad((zx, zy), p, 4, 2) or max(abs(p[0] - zx), abs(p[1] - zy)) <= (3 if jest_budowla else 1):
            return False
        for q, wpis in g.obiekty:
            if budowla(wpis) and (nad(q, p) or jest_budowla and max(abs(p[0] - q[0]), abs(p[1] - q[1])) < 3):
                return False
            if jest_budowla and nad(p, q):
                return False
        return True

    def dodaj_luzno(ile, ktora, zakres, buduj, odstep=1, kandydaci=None):
        stale = []
        for c in buduj.__code__.co_consts:
            stale += list(c) if isinstance(c, tuple) else [c]
        jest_budowla = 'kopalnia' in stale or 'budynek' in stale
        pola = []
        for _ in range(ile):
            kand = kandydaci if kandydaci is not None else g.wolne_pola(ktora, zakres, odstep)
            kand = [p for p in kand if p not in g.zajete]
            dobre = [p for p in kand if luzno(p, jest_budowla)]
            if scisle and not dobre:
                raise SystemExit('brak luźnego miejsca')
            try:
                pola += dodaj(1, ktora, zakres, buduj, odstep, dobre or kand)
            except SystemExit:
                if not dobre:
                    raise
                pola += dodaj(1, ktora, zakres, buduj, odstep, kand)
        return pola

    g.dodaj = dodaj_luzno
    scisle = False

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
    # Kopalnie i skrzynia przy ścieżce w dół doliny (runda 4).
    dol = [p for p in przy_drodze(g, kadr) if p[1] >= sy + 2]
    g.dodaj_najpierw('dom', lambda p: ('kopalnia', 'jagoda'), dol, kadr, (3, 14))
    g.dodaj_najpierw('dom', lambda p: ('kopalnia', 'odlamek'), dol, kadr, (3, 14))
    g.dodaj_najpierw('dom', lambda p: ('budynek', 'drzewo-wiedzy'), kadr, None, (2, 16))
    g.dodaj_najpierw('dom', lambda p: ('budynek', 'zrodlo'), kadr, None, (2, 16))
    for _ in range(3):
        g.dodaj_najpierw('dom', lambda p: ('surowiec', rng.choice(['jagoda', 'pokeball', 'odlamek'])), kadr, None, (2, 12))
    g.dodaj_najpierw('dom', lambda p: ('skrzynia', None), dol, kadr, (2, 12))
    g.strzez(g.dodaj_najpierw('dom', lambda p: ('artefakt', None), dalej, None, (5, 14)), 'slaby')
    g.dodaj(2, 'dom', (6, 14), lambda p: ('surowiec', rng.choice(['jagoda', 'pokeball', 'odlamek'])))
    g.dodaj(1, 'dom', (6, 14), lambda p: ('skrzynia', None))
    g.strzez(g.dodaj(1, 'dom', (8, 30), lambda p: ('kopalnia', 'pokeball')), 'slaby')
    g.dodaj(1, 'dom', (8, 30), lambda p: ('kopalnia', 'jagoda'))
    g.dodaj(4, 'dom', (8, 30), lambda p: ('surowiec', rng.choice(['jagoda', 'odlamek', 'pokeball'])))
    g.dodaj(2, 'dom', (8, 30), lambda p: ('skrzynia', None))
    g.strzez(g.dodaj(1, 'dom', (10, 30), lambda p: ('artefakt', None)), 'slaby')
    # Jedna wolno stojąca słaba walka w dolinie (A5) — do pobicia w pierwszych dniach.
    # Stoi z dala od traktu, żeby nie zamykać go jak brama (G2).
    g.dodaj(1, 'dom', (6, 18), lambda p: ('potwor', 'slaby'), kandydaci=[
        p for p in g.wolne_pola('dom', (6, 18))
        if not any(g.w(p[0] + dx, p[1] + dy) and g.mapa[p[1] + dy][p[0] + dx] == '=' for dy in (-1, 0, 1) for dx in (-1, 0, 1))
    ])
    g.skarb_w_kieszeni('dom', 'slaby', 3, lambda p: rng.choice([('skrzynia', None), ('surowiec', 'odlamek')]))
    # Budowle doliny nie przy samej drodze (runda 5: wiatrak na skraju ścieżki
    # w dół doliny zasłaniał ją całą i dół kadru znów był ścianą obiektów).
    def z_dala_od_drogi(p):
        # Runda 9: cały kadr, także jego górna część (wiatrak na skraju
        # traktu w górę doliny zasłaniał drogę).
        if abs(p[0] - sx) > 11 or not -11 <= p[1] - sy <= 7:
            return True
        return not any(
            0 <= p[1] + dy < BOK and 0 <= p[0] + dx < BOK and g.mapa[p[1] + dy][p[0] + dx] == '='
            for dy in (-1, 0, 1)
            for dx in (-1, 0, 1)
        )

    # Runda 9: bez drugiego drzewa wiedzy i drugiego źródła w dolinie — dwa
    # takie same drzewa w jednym kadrze to „pieczątka".
    # Budowla, dla której nie ma LUŹNEGO miejsca, nie staje wcale (`scisle`).
    scisle = True
    for b in ['wiatrak', 'oboz-treningowy', 'ognisko', 'ranczo', 'gniazdo', 'chatka', 'woz']:
        kand = [p for p in g.wolne_pola('dom', (4, 40)) if z_dala_od_drogi(p)]
        # Runda 6: skały w dole doliny zabrały część miejsca — budowla, dla
        # której już go nie ma, po prostu nie staje (dolina i tak jest pełna).
        try:
            g.dodaj(1, 'dom', (4, 40), lambda p, b=b: ('budynek', b), kandydaci=kand)
        except SystemExit:
            continue
    scisle = False

    # Straże przepraw przez Strugę — przełęcze grzbietu domowego. Runda 13
    # (werdykt ślepego porównania): słabe, jak straż na grobli w oficjalnej
    # mapie — pierwszy tydzień jest bezpieczny, a wyjście z doliny to nauka,
    # nie bariera; poważne bitwy czekają na pograniczu i w bramie wroga.
    g.postaw((GROBLA_PN[0], struga_y(12)), ('potwor', 'slaby'))
    # Straż mostu dwa pola za wschodnim przyczółkiem (runda 13: „Cyndaquil
    # stoi na przyczółku mostu"): potwór blokuje pole i osiem wokół, a pas
    # lasu grzbietu zostawia przy moście wyrwę na trzy wiersze — zamyka ją
    # w całości, a nie stoi na deskach.
    g.postaw((MOST_WSCH[2] + 2, MOST_WSCH[1]), ('potwor', 'slaby'))
    # Zakątek doliny za stawem (runda 13: stos nagród w zakątku (22,48)):
    # wieża obserwacyjna nad Strugą, a przy niej skrzynia i stos surowców.
    g.postaw((21, 49), ('budynek', 'wieza-obserwacyjna'))
    zakatek = [p for p in g.wolne_pola('dom', (0, 999)) if 22 <= p[0] <= 26 and 47 <= p[1] <= 52]
    for wpis in (('skrzynia', None), ('surowiec', 'kamien'), ('surowiec', 'pokeball'), ('surowiec', 'jagoda')):
        try:
            g.dodaj(1, 'dom', (0, 999), lambda p, w=wpis: w, kandydaci=[q for q in zakatek if q not in g.zajete])
        except SystemExit as e:
            print(f'  zakątek doliny: {e}')

    # --- STOSY W ZAKĄTKACH (runda 13) --------------------------------------
    # Werdykt ślepego porównania: „jasnożółte kropki rozsypane równo po całej
    # mapie — konfetti, nie stosy w zakątkach; straże stoją na placach".
    # Surowce i artefakty pogranicza leżą więc w ZAKĄTKACH, które zamyka
    # jeden strażnik w szyjce: silnik szuka kieszeni 8–60 pól (jak
    # `skarb_w_kieszeni`, tylko większych), a tu kładziemy w każdej 3–4 rzeczy
    # i stawiamy straż. Reszta znajdziek pogranicza leży przy drodze.
    def stos(ktora, zawartosc, sila, kieszen):
        szyjka, pola = kieszen
        wolne = [q for q in pola if g.mapa[q[1]][q[0]] in '.,b' and q not in g.zajete and not g.w_przejsciu(*q)]
        polozone = []
        for wpis in zawartosc[: min(len(zawartosc), max(1, len(wolne) // 2))]:
            try:
                polozone += g.dodaj(1, ktora, (0, 999), lambda p, w=wpis: w, kandydaci=[q for q in wolne if q not in g.zajete])
            except SystemExit:
                break
        if polozone and szyjka not in g.zajete and not g.koliduje_ze_straza(szyjka, ('potwor', sila)):
            g.zajete.append(szyjka)
            g.obiekty.append((szyjka, ('potwor', sila)))
        return polozone

    # Zakątki wycięte w terenie (`ZAKATKI`): wnętrze to prostokąt, straż
    # staje na polu PRZED wejściem (potwór blokuje 3 × 3, więc zamyka wejście
    # w całości). Nic innego w zakątkach nie staje — tylko stos.
    wybrane = []
    w_zakatkach = set()
    for x0, y0, x1, y1, (ex, ey) in ZAKATKI:
        wnetrze = [(x, y) for y in range(y0, y1 + 1) for x in range(x0, x1 + 1)]
        if ey == y0 - 1:
            przed = (ex, ey - 1)
        elif ey == y1 + 1:
            przed = (ex, ey + 1)
        elif ex == x0 - 1:
            przed = (ex - 1, ey)
        else:
            przed = (ex + 1, ey)
        wybrane.append((przed, wnetrze))
        w_zakatkach |= set(wnetrze) | {(ex, ey), przed}
    # Czwarty zakątek znajduje sam teren (kieszeń 8–60 pól za jedną szyjką).
    for k in g.znajdz_kieszenie(PUNKTY['start'], 8, 60):
        if strefa(*k[0]) != 'pogranicze' or g.w_przejsciu(*k[0]):
            continue
        if all(max(abs(k[0][0] - w[0][0]), abs(k[0][1] - w[0][1])) >= 10 for w in wybrane):
            wybrane.append(k)
            w_zakatkach |= set(k[1]) | {k[0]}
            break
    print('  zakątki pogranicza (szyjka, pól):', [(k[0], len(k[1])) for k in wybrane])
    # Kieszenie silnika, które zachodzą na zakątki, odpadają — inaczej
    # `skarb_w_kieszeni` postawiłoby drugą straż w tym samym wejściu.
    for ktora in list(g.kieszenie):
        g.kieszenie[ktora] = [k for k in g.kieszenie[ktora] if k[0] not in w_zakatkach and not set(k[1]) & w_zakatkach]
    wolne_pola_bez_zakatkow = g.wolne_pola
    g.wolne_pola = lambda *a, **kw: [p for p in wolne_pola_bez_zakatkow(*a, **kw) if p not in w_zakatkach]
    zawartosci = [
        [('artefakt', None), ('skrzynia', None), ('surowiec', 'kamien'), ('surowiec', 'pokeball')],
        [('skrzynia', None), ('surowiec', 'pokeball'), ('surowiec', 'jagoda'), ('surowiec', 'odlamek')],
        [('artefakt', None), ('surowiec', 'kamien'), ('surowiec', 'jagoda'), ('skrzynia', None)],
        [('skrzynia', None), ('surowiec', 'odlamek'), ('surowiec', 'pokeball'), ('surowiec', 'kamien')],
        [('skrzynia', None), ('skrzynia', None), ('surowiec', 'jagoda'), ('surowiec', 'kamien')],
        [('artefakt', None), ('surowiec', 'pokeball'), ('surowiec', 'odlamek'), ('skrzynia', None)],
    ]
    for k, zawartosc in zip(wybrane, zawartosci):
        stos('pogranicze', zawartosc, 'sredni', k)

    # --- TRZĘSAWISKO -----------------------------------------------------------
    # Najgęstszy kawałek. Kopalnie drogie (kamień) pod strażą; tanie otworem —
    # to gospodarka, nie nagroda. Surowce luzem tylko tam, gdzie prowadzi
    # droga (B2), w zasięgu dwóch pól od grobli.
    def przy_grobli(ktora):
        return [p for p in przy_drodze(g, g.wolne_pola(ktora, (0, 999)), 2) if p not in g.zajete]

    for _ in range(12):
        g.dodaj(1, 'pogranicze', (0, 999), lambda p: ('surowiec', rng.choice(['jagoda', 'odlamek', 'kamien', 'pokeball'])), kandydaci=przy_grobli('pogranicze'))
    kopalnie = ['kamien', 'odlamek', 'pokeball', 'jagoda', 'kamien', 'pokeball', 'odlamek']
    polozone = []
    for co in kopalnie:
        polozone += g.dodaj(1, 'pogranicze', (0, 999), lambda p, co=co: ('kopalnia', co))
    g.strzez([p for p, co in zip(polozone, kopalnie) if co == 'kamien'], 'sredni')
    g.dodaj(13, 'pogranicze', (0, 999), lambda p: ('skrzynia', None))
    g.strzez(g.dodaj(1, 'pogranicze', (0, 999), lambda p: ('artefakt', None)), 'sredni')
    g.skarb_w_kieszeni('pogranicze', 'sredni', 4, lambda p: rng.choice([('skrzynia', None), ('surowiec', 'kamien'), ('artefakt', None)]))
    g.skarb_w_kieszeni('pogranicze', 'silny', 4, lambda p: rng.choice([('artefakt', None), ('skrzynia', None)]))
    g.skarb_w_kieszeni('pogranicze', 'sredni', 3, lambda p: rng.choice([('skrzynia', None), ('surowiec', 'pokeball')]))
    # Budowle specjalne po jednej–dwie na planszę (F3): pula bez areny
    # (ta stoi tylko u wroga) i bez drugiego portalu.
    g.budowle(24, 'pogranicze', [
        'wieza-obserwacyjna', 'ranczo', 'gniazdo', 'wiatrak', 'zrodlo', 'chatka',
        'woz', 'ognisko', 'oboz-treningowy', 'kamienna-wieza', 'drzewo-wiedzy',
    ])
    # Portal: jeden koniec w trzęsawisku, drugi pod wyspą — skrót do celu dla
    # tego, kto go znajdzie, ale za strażą pogranicza, nie z doliny.
    g.para_portali('pogranicze', min_odl=18)
    g.dodaj(1, 'pogranicze', (0, 999), lambda p: ('jasnowidz', None))

    # --- KRAINA WROGA --------------------------------------------------------
    # Brama w grzbiecie wroga: silna straż u południowego wylotu — potwór
    # blokuje trzy kolumny, a brama ma dwie, więc zamyka ją w całości.
    g.postaw((BRAMA_WROGA[2], BRAMA_WROGA[3] + 1), ('potwor', 'silny'))
    for _ in range(7):
        g.dodaj(1, 'wroga', (0, 999), lambda p: ('surowiec', rng.choice(['kamien', 'odlamek', 'pokeball'])), kandydaci=przy_grobli('wroga') or None)
    kopalnie = ['kamien', 'pokeball', 'odlamek']
    polozone = []
    for co in kopalnie:
        polozone += g.dodaj(1, 'wroga', (0, 999), lambda p, co=co: ('kopalnia', co))
    g.strzez([p for p, co in zip(polozone, kopalnie) if co != 'odlamek'], 'silny')
    g.dodaj(2, 'wroga', (0, 999), lambda p: ('skrzynia', None))
    g.strzez(g.dodaj(2, 'wroga', (0, 999), lambda p: ('skrzynia', None)), 'silny')
    g.skarb_w_kieszeni('wroga', 'silny', 4, lambda p: rng.choice([('artefakt', None), ('skrzynia', None), ('surowiec', 'kamien')]))
    g.budowle(6, 'wroga', ['osrodek-ewolucji', 'arena', 'kamienna-wieza', 'drzewo-wiedzy', 'ognisko', 'zrodlo'])

    # Straż przy samym Kamieniu (sonda: „artefaktu pilnuje straż" — wódz stoi
    # na grobli, siedem pól dalej). Na końcu, żeby nie ruszać losowań wyżej.
    # Runda 8: przy innym rozstawieniu pole obok Kamienia bywa zajęte przez
    # skrzynię z wyspy — strażnik staje wtedy na pierwszym wolnym sąsiednim.
    for dx, dy in ((-1, 0), (1, 0), (-1, 1), (1, 1), (0, 1), (-1, -1), (1, -1)):
        try:
            g.postaw((WYSPA[0] + dx, WYSPA[1] + dy), ('potwor', 'silny'))
            break
        except SystemExit:
            continue

    przerzedz_kadr(g)
    mokradla_kadru(g)
    runda_3(g)
    runda_4(g)
    runda_5(g)
    runda_6(g)
    runda_7(g)
    runda_8(g)
    runda_9(g)


#: Runda 11 (HotA, zwycięzca rundy 10: „nic nie przypomina bagna — stawy małe,
#: brak trzcin, błota i mokradeł, prawie jednolita zieleń"). Pierwszy ekran
#: dostaje MOKRADŁA: pola trzęsawiska (`b`, w grze droższe, przejezdne)
#: malowane w tle jako jedna płachta błota z oczkami mętnej wody o ostrym,
#: nieregularnym brzegu (`DOMALUJ`, nie warstwa `bagno` z kratką kafli —
#: za to przegraliśmy rundę 8), i większe stawy (`~`). Stawiane na końcu
#: `rozstaw`: losowania i obiekty zostają te same, a silnik i tak sprawdza
#: potem łączność przy obiektach.
#:  - górny środek: gęsta kępa wierzb (werdykt r10: „korony zasłaniają, gdzie
#:    da się przejść") → staw-starorzecze przy Strudze i błota wokół; pola
#:    (16,40), (17,40) zostają nieprzejezdne (woda), więc artefakt pod strażą
#:    (17,39) dalej jest dostępny tylko przez straż;
#:  - dół środka: oczko nad pasmem w pasie błota do samej Strugi;
#:  - za Strugą: dół ściany wierzb i łąka przy wieży to już trzęsawisko;
#:  - staw w przełęczy pod zamkiem z błotnistym brzegiem.
MOKRADLA_WODA = [(15, 40), (16, 40), (17, 40), (14, 41), (15, 41), (16, 41)]
MOKRADLA_BAGNO = [
    # górny środek
    (13, 42), (14, 42), (15, 42), (16, 42), (12, 43), (13, 43), (14, 43), (13, 41),
    # dół środka
    (15, 45), (16, 45), (17, 45), (14, 47),
    (15, 46), (16, 46), (17, 46), (15, 47), (16, 47), (17, 47), (17, 48), (17, 49), (18, 49),
    # za Strugą, prawy górny róg kadru
    (22, 38), (23, 38), (22, 39), (23, 39), (21, 40), (22, 40), (21, 41), (22, 41),
    # za Strugą, dół
    (24, 45), (25, 45), (24, 46), (25, 46),
    (22, 50), (23, 50), (24, 50), (25, 50), (22, 51), (23, 51), (24, 51), (25, 51), (26, 51),
    (22, 52), (23, 52), (24, 52), (22, 53), (23, 53), (24, 53), (25, 53),
    # staw w przełęczy pod zamkiem
    (11, 52), (9, 53), (10, 53), (11, 53),
    # łąka między zamkiem a pasmem w lewym dole
    (5, 48), (6, 48), (7, 48), (5, 49), (6, 49), (7, 49), (8, 49),
    # Runda 12 („blade plamy, nie bagno"): mokradło za Strugą sięga od
    # prawego brzegu do łąki przy skrzyni, a w lewym dole do stóp pasma.
    (21, 45), (22, 45), (23, 45), (21, 46), (23, 46), (21, 47), (22, 47),
    (4, 48), (4, 49),
]


def mokradla_kadru(g):
    zajete = {p for p, _ in g.obiekty}
    for (x, y), znak in [(p, '~') for p in MOKRADLA_WODA] + [(p, 'b') for p in MOKRADLA_BAGNO]:
        if (x, y) in zajete or g.mapa[y][x] in '=~#':
            continue
        g.mapa[y][x] = znak


#: Runda 10 (HotA: „obiekty do zebrania za duże i za gęste — sterta jagód
#: i skrzyń w górnym środku obok sadu, ten sam kosz i skrzynka skopiowane
#: kilkanaście razy wokół sadu i wzdłuż drogi pod zamkiem"). Pierwszy ekran
#: dostaje po JEDNYM stosie każdego surowca, dwie skrzynie i artefakt pod
#: strażą — reszta znajdziek z doliny znika. Na końcu `rozstaw`, żeby nie ruszać
#: losowań: reszta planszy wychodzi ta sama. Zabranie znajdźki niczego nie
#: zamyka (znajdźka nie ma bryły), więc przejezdność tylko rośnie.
ZNAJDZKI_KADRU_USUN = {(16, 45), (16, 46), (15, 36), (14, 35), (16, 36), (17, 36), (15, 47), (3, 42)}
#: Dwa sady w jednym kadrze to znów „pieczątka" — dolny (przy zamku) to
#: kopalnia kamieni ewolucji.
KOPALNIA_KADRU_ZMIEN = {(11, 51): 'kamien'}


def przerzedz_kadr(g):
    zostaja = []
    for pole, wpis in g.obiekty:
        if pole in ZNAJDZKI_KADRU_USUN and wpis[0] in ('surowiec', 'skrzynia'):
            if pole in g.zajete:
                g.zajete.remove(pole)
            continue
        if pole in KOPALNIA_KADRU_ZMIEN and wpis[0] == 'kopalnia':
            wpis = ('kopalnia', KOPALNIA_KADRU_ZMIEN[pole]) + tuple(wpis[2:])
        zostaja.append((pole, wpis))
    g.obiekty[:] = zostaja


# --- RUNDA 3 PĘTLI (werdykt ślepego porównania r2: 16 TAK / 12 CZĘŚCIOWO /
# 2 NIE) ------------------------------------------------------------------
# Wszystko PO rozstawieniu, jak `przerzedz_kadr` i `mokradla_kadru`: losowania
# i reszta planszy zostają te same (plansza wygrała ślepo), a poprawki są
# chirurgiczne. Co i dlaczego:
#  - C4 (NIE): grzbiet wroga na wschód od bramy czytał się jak cienka linia
#    wierzb z bagnem po obu stronach („obejście bagnem"), a kopalnia (29,19)
#    siedziała w samym wylocie bramy. Grzbiet grubieje do siedmiu wierszy
#    (13–19) na x 27–40, straż bramy stoi W bramie (26,16), kopalnia odchodzi.
#  - C4 (NIE): północna grobla miała obok siebie cypel łąki (13–20, 34) ze
#    stodołą, artefaktem i drugą strażą — „luka 5 pól na dwie straże".
#    Cypel idzie pod wodę: Struga ma tu trzy wiersze, grobla dwa pola
#    i JEDNĄ straż. Tym samym dolina ma dwa wyjścia (A1), stodoła nie
#    wchodzi na bagno (G2).
#  - G1 (NIE): ekran startowy (12–33, 37–54) miał 32 obiekty. Zostaje 11:
#    dwie kopalnie, drzewo wiedzy, wiatrak, skrzynia, wieża z dwoma stosami,
#    obóz za mostem, dwie straże. Artefakt spod Horsei (C3) i część stosów
#    idą do zakątka doliny (F1) i do krainy wroga.
#  - F1: lewy dolny róg (4–8, 50–53) to zakątek doliny — łąka za płotem
#    wierzb z jednym wejściem (9,50) pod słabą strażą, w środku artefakt,
#    skrzynia i stos. Masyw `gora-10` z tego miejsca znika.
#  - B1/C2: kraina wroga dostaje komplet kopalń (jagody, kamienie) i zakątek
#    (3–6, 10–13) z artefaktem za SILNĄ strażą; z wyspą daje to sześć
#    silnych straży za bramą, a gradient dom → pogranicze → wróg jest w grze.
#  - B2: południowo-wschodnia łąka dostaje ODNOGĘ drogi od mostu do stosu
#    (artefakt, skrzynia, surowce), a straż stoi w szyjce odnogi.
#  - G2: wieża (15,25) stała w zatoce jeziora — zatoka zasypana; kopalnia
#    pokeballi (28,22) z murem na drodze odchodzi; bohater startuje pole
#    dalej od płotu zamku.
#  - E3/E4: skały na końcach grzbietu wroga to las (grzbiet jest jedną
#    bryłą), pojedyncze wierzby na pograniczu znikają.
R3_USUN = [
    # ekran startowy
    (13, 37), (22, 37), (22, 38), (23, 38), (23, 39), (27, 38), (17, 43),
    (32, 44), (33, 44), (25, 46), (26, 46), (14, 47), (18, 47), (17, 48),
    (23, 48), (24, 48), (25, 49), (24, 50), (26, 50), (22, 52), (23, 53),
    # cypel przy północnej grobli
    (14, 34), (14, 35), (15, 34),
    # brama wroga i jej wylot
    (27, 18), (29, 19), (36, 14),
    # kopalnia z murem na drodze
    (28, 22),
]

#: Zakątek doliny: wnętrze, płot, woda i stos.
NOOK = (4, 50, 8, 53)
NOOK_PLOT = [(x, 49) for x in range(3, 9)]
NOOK_WODA = [(9, 53), (10, 53)]
NOOK_STRAZ = (9, 50)
NOOK_STOS = [((6, 52), ('artefakt', None)), ((5, 51), ('skrzynia', None)), ((7, 51), ('surowiec', 'pokeball'))]

#: Zakątek w krainie wroga (jak `ZAKATKI`): wnętrze, wejście, straż przed nim.
WROGA_ZAKATEK = (3, 10, 6, 13, (7, 12))
WROGA_STRAZ = (8, 12)

#: Odnoga drogi na południowo-wschodnią łąkę: od traktu za mostem do stosu.
ODNOGA_SE = ((32, 43), (47, 48))
START_R3 = (14, 46)


def _czyste(g, p, obiekty, r=2, d=3):
    """Pole, wokół którego na `r` jest tylko łąka albo bagno (bez wody, drogi,
    lasu) i nie ma obiektu bliżej niż `d` pól — budowla nie stanie na
    brzegu ani z murem na trakcie (G2)."""
    x, y = p
    for dy in range(-r, r + 1):
        for dx in range(-r, r + 1):
            if not g.w(x + dx, y + dy) or g.mapa[y + dy][x + dx] not in '.b':
                return False
    return all(max(abs(x - q[0]), abs(y - q[1])) >= d for q, _ in obiekty)


def _odswiez(g):
    g.blokada = set()
    for nazwa, pole in PUNKTY.items():
        if nazwa.startswith('zamek'):
            g.blokada.update(g.pola_bryly('zamek', None, pole))
    for p, w in g.obiekty:
        if w[0] != 'potwor':
            g.blokada.add(p)
            g.blokada.update(g.pola_bryly(w[0], w[1], p))
    g.stan_dostepnych = len(g.dostepnych())


def _usun(g, pola):
    pola = set(pola)
    wyniesione = []
    for p, w in list(g.obiekty):
        if p in pola:
            wyniesione.append((p, w))
            for q in [p] + g.pola_bryly(w[0], w[1], p):
                while q in g.zajete:
                    g.zajete.remove(q)
    g.obiekty[:] = [(p, w) for p, w in g.obiekty if p not in pola]
    return wyniesione


def _lataj(g, pola, znak):
    zajete = {p for p, _ in g.obiekty} | g.blokada
    for x, y in pola:
        if g.w(x, y) and (x, y) not in zajete and g.mapa[y][x] != '=':
            g.mapa[y][x] = znak


def _odnoga(g, skad, dokad):
    """Droga po terenie z obiektami jako przeszkodami; zwraca jej pola."""
    kopia = [w[:] for w in g.mapa]
    for p in g.blokada | {p for p, _ in g.obiekty}:
        if p not in (skad, dokad):
            kopia[p[1]][p[0]] = 'T'
    stare = g.koszt_drogi
    g.koszt_drogi = dict(stare, T=None)
    try:
        droga = g.trasa(kopia, skad, dokad)
    finally:
        g.koszt_drogi = stare
    if droga is None:
        print('  odnoga SE: brak trasy')
        return []
    for x, y in droga:
        g.mapa[y][x] = '='
    return droga


def runda_3(g):
    m = g.mapa
    wyniesione = _usun(g, R3_USUN)
    _odswiez(g)

    # --- teren -------------------------------------------------------------
    # Grzbiet wroga: gruby masyw lasu na wschód od bramy.
    _lataj(g, [(x, y) for y in (13, 14) for x in range(27, 41) if m[y][x] in '.b'], 'T')
    _lataj(g, [(x, y) for y in (18, 19) for x in range(28, 35) if m[y][x] in '.b'], 'T')
    # Skały na końcach grzbietu to las — jedna bryła, nie wysepki (E3).
    _lataj(g, [(x, y) for y in range(15, 18) for x in range(0, 6) if m[y][x] == '#'], 'T')
    _lataj(g, [(x, y) for y in range(0, 3) for x in range(21, 28) if m[y][x] == '#'], 'T')
    # Cypel przy północnej grobli pod wodę: Struga na trzy wiersze.
    _lataj(g, [(x, 34) for x in range(13, 21)], '~')
    # Zatoka jeziora pod wieżą (15,25) zasypana — wieża stoi na lądzie.
    _lataj(g, [(13, 23), (14, 23), (15, 23), (13, 24), (14, 24)], 'b')
    # Zakątek doliny w lewym dolnym rogu.
    x0, y0, x1, y1 = NOOK
    _lataj(g, [(x, y) for y in range(y0, y1 + 1) for x in range(x0, x1 + 1)], '.')
    _lataj(g, NOOK_PLOT, 'T')
    _lataj(g, NOOK_WODA, '~')
    # Zakątek w krainie wroga.
    zx0, zy0, zx1, zy1, wejscie = WROGA_ZAKATEK
    zakatek(m, zx0, zy0, zx1, zy1, wejscie)
    # Pojedyncze wierzby poza doliną (E4) — konfetti, nie las.
    for y in range(BOK):
        for x in range(BOK):
            if m[y][x] != 'T' or strefa(x, y) == 'dom':
                continue
            lesni = sum(
                1 for dy in (-1, 0, 1) for dx in (-1, 0, 1)
                if (dx or dy) and g.w(x + dx, y + dy) and m[y + dy][x + dx] in 'T#'
            )
            if lesni == 0:
                m[y][x] = 'b'
    _odswiez(g)

    # --- obiekty -----------------------------------------------------------
    # Straż bramy wroga W bramie: potwór blokuje 3 × 3, brama ma dwie kolumny.
    g.postaw((26, 16), ('potwor', 'silny'))
    # Zakątek doliny: stos i słaba straż w jedynym wejściu.
    for pole, wpis in NOOK_STOS:
        g.postaw(pole, wpis)
    g.postaw(NOOK_STRAZ, ('potwor', 'slaby'))
    # Zakątek wroga: artefakt, skrzynia, kamienie; silna straż przed wejściem.
    wnetrze = [(x, y) for y in range(zy0, zy1 + 1) for x in range(zx0, zx1 + 1)]

    def czyste_w(ktora, warunek):
        # Najpierw czyste na dwa pola i trzy od obiektów; gdy brak — luźniej,
        # w ostateczności byle wolne (pogranicze jest gęste).
        pola = [p for p in g.wolne_pola(ktora, (0, 999)) if warunek(p)]

        def otwartosc(p):
            # Odległość od najbliższej wody, lasu albo drogi — budowla ma
            # stać na otwartym, nie na brzegu.
            return next(r for r in range(1, 5) if not _czyste(g, p, [], r, 0)) - 1

        for r, d in ((2, 3), (1, 3), (2, 2), (1, 2)):
            dobre = [p for p in pola if _czyste(g, p, g.obiekty, r, d)]
            if dobre:
                naj = max(otwartosc(p) for p in dobre)
                return [p for p in dobre if otwartosc(p) == naj]
        print(f'  runda 3: brak czystego miejsca w strefie {ktora}')
        return pola or None

    def u_wroga():
        return czyste_w('wroga', lambda p: p[0] <= 20 and 3 <= p[1] <= 13)

    for wpis in (('artefakt', None), ('skrzynia', None), ('surowiec', 'kamien')):
        g.dodaj(1, 'wroga', (0, 999), lambda p, w=wpis: w, kandydaci=[q for q in wnetrze if q not in g.zajete])
    g.postaw(WROGA_STRAZ, ('potwor', 'silny'))
    # Komplet kopalń wroga (B1): jagody i kamienie w warowni, kamienie pod
    # silną strażą; do tego skrzynia zabrana spod grzbietu.
    g.dodaj(1, 'wroga', (0, 999), lambda p: ('kopalnia', 'jagoda'), kandydaci=u_wroga())
    kamien = g.dodaj(1, 'wroga', (0, 999), lambda p: ('kopalnia', 'kamien'), kandydaci=u_wroga())
    g.strzez(kamien, 'silny')
    g.dodaj(1, 'wroga', (0, 999), lambda p: ('skrzynia', None), kandydaci=u_wroga())
    # Kopalnie pogranicza zabrane z bramy i znad brzegu — w czystym miejscu.
    def na_pograniczu():
        return czyste_w('pogranicze', lambda p: p[1] >= 23)

    g.dodaj(1, 'pogranicze', (0, 999), lambda p: ('kopalnia', 'pokeball'), kandydaci=na_pograniczu())
    kamien = g.dodaj(1, 'pogranicze', (0, 999), lambda p: ('kopalnia', 'kamien'), kandydaci=na_pograniczu())
    g.strzez(kamien, 'sredni')
    # Odnoga na południowo-wschodnią łąkę i stos na jej końcu (B2).
    droga = _odnoga(g, *ODNOGA_SE)
    if droga:
        # Straż w szyjce odnogi, cztery–sześć pól przed stosem.
        straz = _usun(g, [(43, 47)])
        szyjki = [p for p in droga[3:7] if p not in g.zajete and not g.ciasne(*p) and sum(
            1 for dy in (-1, 0, 1) for dx in (-1, 0, 1)
            if (dx or dy) and g.w(p[0] + dx, p[1] + dy) and m[p[1] + dy][p[0] + dx] in '.,=b'
        ) <= 5]
        pole = szyjki[0] if szyjki else droga[4]
        g.zajete.append(pole)
        g.obiekty.append((pole, straz[0][1] if straz else ('potwor', 'sredni')))
        _usun(g, [(45, 48)])
        g.postaw((49, 49), ('surowiec', 'odlamek'))
    _odswiez(g)
    # Bohater pole dalej od płotu zamku (G2): rysunek zamku sięga x≈13.
    PUNKTY['start'] = START_R3
    # Pola, do których po łatach nie da się dojść, zarastają.
    g.zasyp_odciete(m)
    print(f'  runda 3: usunięte {len(wyniesione)}, obiektów {len(g.obiekty)}')


# --- RUNDA 4 PĘTLI (werdykt ślepego porównania r3: 20 TAK / 9 CZĘŚCIOWO /
# 1 NIE) ------------------------------------------------------------------
# Jak `runda_3`: po rozstawieniu, chirurgicznie. Co i dlaczego:
#  - G1 (NIE): środek (28–48 × 16–33) był tłumem — pięć budowli, cztery
#    straże na placu, kilkanaście kropek. Zostaje: kopalnia odłamków, portal,
#    wieża na rozstajach, drzewo wiedzy przy rozwidleniu grobli (F3: widoczne,
#    na otwartym) i dwa stosy w zakątkach za strażą. Zakątek (36–39, 19–21)
#    i zakątek (48–50, 27–29) zarastają lasem — grzbiet wroga grubieje.
#  - F3: budowli specjalnych po jednej: drzewa wiedzy z wyspy, z południowego
#    wschodu i spod zamku wroga znikają (zostaje domowe i środkowe), znika
#    druga kamienna wieża, drugie źródło, chatka, gniazda, wiatraki i ogniska
#    pogranicza.
#  - C1: straże przy jednej rzeczy na placu precz — Seadra (23,43) przy
#    kopalni pokeballi w dolinie (B1: komplet kopalń domu bez straży),
#    straż artefaktu (40,28), Charizard (36,5) przy jednej skrzyni, druga
#    straż na wyspie (43,11) i straż kamiennej wieży (8,0).
#  - B2: stosy w zakątkach zbite w jedną kupkę (zachodni, północno-
#    wschodni, wschodni), luźne kropki pogranicza zebrane albo usunięte.
#  - D4/E5: północna przeprawa to bród (piasek pod groblą), kałuże bez
#    funkcji zasypane: przy zamku, w kieszeni NW, w centrum przy łuku grobli.
#  - E3/E4: plamy bagna i łąki mniejsze niż 10 pól przechodzą w teren wokół
#    (strefy mają jeden grunt), samotne kępy wierzb poza grzbietami znikają,
#    a luki w lesie SE zarastają w masyw.
#  - G4: łąka krainy wroga w tle to ciemna, chłodna ziemia (`TLO`).
R4_USUN = [
    # kraina wroga i wyspa
    (7, 0), (8, 0), (34, 3), (35, 4), (36, 5), (38, 5), (44, 6), (45, 10), (48, 11),
    (42, 10), (43, 11), (26, 9), (6, 2),
    # zachód pogranicza
    (18, 27), (26, 19), (25, 25), (6, 28), (15, 25),
    # środek
    (34, 19), (36, 19), (37, 19), (37, 21), (38, 21), (37, 23), (34, 22), (33, 23),
    (31, 24), (29, 26), (31, 28), (36, 28), (35, 33),
    # wschód środka
    (44, 20), (39, 24), (47, 24), (38, 26), (38, 27), (40, 27), (40, 28), (41, 28),
    (42, 27), (45, 29), (46, 29), (44, 31), (49, 35), (50, 35),
    (50, 27), (48, 28), (50, 28), (50, 29), (49, 31),
    # południowy wschód
    (49, 41), (43, 43), (37, 49), (37, 53), (39, 40), (38, 49), (37, 42),
    # dolina: straż przy kopalni pokeballi
    (23, 43),
    # straże kopalń na otwartym (C1: straż w szyjce albo wcale)
    (11, 1), (21, 14),
]

#: Zakątki zarastające lasem (wnętrze z wejściem i polem przed nim).
R4_ZAROST = [(36, 19, 39, 22), (37, 23, 37, 23), (48, 27, 50, 30)]

#: Przesunięcia w stosach: skąd → dokąd (zakątek zachodni, NE, wschodni).
R4_PRZESUN = {
    (6, 19): (7, 21), (8, 19): (6, 20), (3, 22): (5, 21), (6, 22): (6, 21),
    (50, 19): (50, 21),
    (44, 35): (45, 36),
}
#: Zachodni zakątek o rząd i kolumnę ciaśniejszy — stos, nie plac.
R4_ZACHOD_LAS = [(x, 19) for x in range(3, 9)] + [(3, y) for y in range(20, 23)]

#: Ranczo z zachodniego trzęsawiska idzie do doliny (B1: gospodarka domu
#: bez bitwy) — na łąkę nad stawem, z dala od traktu i wiatraka.
R4_RANCZO = (15, 37)

#: Stosy dołożone tam, gdzie ekran był pusty — zawsze po dwie–trzy rzeczy
#: razem, przy drodze (B2: stos, nie konfetti).
R4_DODAJ = [
    # pod zamkiem wroga, przy kropce (21,10)
    ((19, 10), ('skrzynia', None)), ((20, 10), ('surowiec', 'kamien')), ((20, 11), ('surowiec', 'odlamek')),
    # koniec drogi przy namiocie (40,1): kąt za szyjką (32–34, 3–4) między
    # lasami (`R4_LAS`), silna straż w szyjce (C1)
    ((32, 4), ('potwor', 'silny')),
    ((37, 3), ('surowiec', 'jagoda')), ((38, 3), ('surowiec', 'odlamek')), ((39, 3), ('skrzynia', None)), ((38, 2), ('surowiec', 'pokeball')),
    # przy drodze na wschód od bramy
    ((28, 8), ('skrzynia', None)), ((29, 8), ('surowiec', 'jagoda')),
    # kieszeń NW: druga skrzynia obok (14,2) zamiast samotnej (6,2)
    ((13, 2), ('skrzynia', None)),
    # pod zamkiem wroga, nad drogą do bramy
    ((27, 3), ('surowiec', 'odlamek')), ((28, 3), ('skrzynia', None)),
    # za mostem, za pierwszą bitwą (C3: nagroda za strażą mostu)
    ((32, 45), ('skrzynia', None)), ((33, 45), ('surowiec', 'jagoda')),
    # przy grobli na wyspę
    ((43, 22), ('surowiec', 'kamien')), ((44, 22), ('skrzynia', None)),
]
#: Masywy lasu dołożone (E4) — prostokąty.
R4_LAS = [(28, 20, 33, 21), (3, 28, 5, 30), (3, 30, 10, 30), (31, 5, 36, 8), (9, 7, 11, 10), (47, 40, 50, 42),
          (32, 0, 34, 2), (45, 26, 47, 29), (37, 49, 39, 53)]

#: Północna przeprawa: pola obok grobli, które idą pod wodę.
R4_BROD = [(GROBLA_PN[0], y) for y in range(struga_y(12) - 1, struga_y(12) + 2)]

#: Drzewo wiedzy pogranicza: przy rozwidleniu grobli, na otwartym (F3).
R4_DRZEWO = (40, 27)

#: Kałuże do zasypania: prostokąty `(x0, y0, x1, y1)`.
R4_KALUZE = [
    (0, 0, 16, 14),     # kieszeń NW w krainie wroga
    (32, 27, 37, 33),   # centrum, staw przy łuku grobli
    (39, 31, 43, 35),   # centrum, oczka przy grobli
    (14, 44, 24, 49),   # przy zamku
]
#: Mokradła doliny przy zamku → sucha łąka (E3/E5).
R4_LAKA = [(15, 45, 18, 49), (20, 44, 25, 47), (4, 48, 8, 49)]


def _skladowe(m, znaki, sasiedztwo=4):
    kroki = [(1, 0), (-1, 0), (0, 1), (0, -1)]
    if sasiedztwo == 8:
        kroki += [(1, 1), (1, -1), (-1, 1), (-1, -1)]
    widziane = set()
    for y in range(BOK):
        for x in range(BOK):
            if (x, y) in widziane or m[y][x] not in znaki:
                continue
            zn = m[y][x]
            stos, sk = [(x, y)], []
            widziane.add((x, y))
            while stos:
                p = stos.pop()
                sk.append(p)
                for dx, dy in kroki:
                    q = (p[0] + dx, p[1] + dy)
                    if 0 <= q[0] < BOK and 0 <= q[1] < BOK and q not in widziane and m[q[1]][q[0]] == zn:
                        widziane.add(q)
                        stos.append(q)
            yield zn, sk


def _wokol(m, sk):
    s = set(sk)
    licz = {}
    for x, y in sk:
        for dy in (-1, 0, 1):
            for dx in (-1, 0, 1):
                q = (x + dx, y + dy)
                if q in s or not (0 <= q[0] < BOK and 0 <= q[1] < BOK):
                    continue
                licz[m[q[1]][q[0]]] = licz.get(m[q[1]][q[0]], 0) + 1
    return licz


def runda_4(g):
    m = g.mapa
    zabrane = _usun(g, R4_USUN)
    _odswiez(g)
    obiekty = lambda: {p for p, _ in g.obiekty}

    # --- teren -------------------------------------------------------------
    for x0, y0, x1, y1 in R4_ZAROST:
        _lataj(g, [(x, y) for y in range(y0, y1 + 1) for x in range(x0, x1 + 1)], 'T')
    # Kałuże: woda w prostokątach (poza Strugą — jej koryto zostaje) przechodzi
    # w grunt, którego wokół najwięcej.
    for x0, y0, x1, y1 in R4_KALUZE:
        for zn, sk in list(_skladowe(m, '~', 8)):
            if len(sk) > 40 or not all(x0 <= x <= x1 and y0 <= y <= y1 for x, y in sk):
                continue
            w = _wokol(m, sk)
            grunt = '.' if w.get('.', 0) >= w.get('b', 0) else 'b'
            for x, y in sk:
                m[y][x] = grunt
    for x0, y0, x1, y1 in R4_LAKA:
        for y in range(y0, y1 + 1):
            for x in range(x0, x1 + 1):
                if m[y][x] in 'b~' and w_dolinie(x, y):
                    m[y][x] = '.'
    # Północna przeprawa (D4): trakt idzie wąską groblą PRZEZ Strugę — woda
    # z obu stron — a nie przesmykiem łąki na dwa pola. Straż staje na samej
    # grobli i zamyka ją w całości.
    for x, y in R4_BROD:
        if m[y][x] == '.':
            m[y][x] = '~'
    for i, (p, w) in enumerate(g.obiekty):
        if p == (GROBLA_PN[0], struga_y(12)) and w[0] == 'potwor':
            g.obiekty[i] = ((GROBLA_PN[2], struga_y(12)), w)
    # Plamy bagna i łąki poza doliną mniejsze niż 10 pól — w grunt wokół (E3).
    for _ in range(2):
        for zn, sk in list(_skladowe(m, '.b')):
            if len(sk) >= 10 or any(strefa(x, y) == 'dom' for x, y in sk):
                continue
            inny = 'b' if zn == '.' else '.'
            w = _wokol(m, sk)
            if w.get(inny, 0) >= 3 and w.get(inny, 0) >= w.get(zn, 0):
                for x, y in sk:
                    m[y][x] = inny
    # Samotne kępy wierzb (do 3 pól) poza doliną — grunt (E4).
    for zn, sk in list(_skladowe(m, 'T', 8)):
        if len(sk) > 3 or any(strefa(x, y) == 'dom' for x, y in sk):
            continue
        w = _wokol(m, sk)
        grunt = '.' if w.get('.', 0) >= w.get('b', 0) else 'b'
        for x, y in sk:
            if (x, y) not in obiekty():
                m[y][x] = grunt
    # Luki w lesie południowego wschodu zarastają — masyw, nie kępy (E4).
    zajete = obiekty() | g.blokada
    for _ in range(2):
        nowe = []
        for y in range(36, BOK):
            for x in range(31, BOK):
                if m[y][x] not in '.b' or (x, y) in zajete:
                    continue
                las = sum(1 for dy in (-1, 0, 1) for dx in (-1, 0, 1)
                          if (dx or dy) and g.w(x + dx, y + dy) and m[y + dy][x + dx] == 'T')
                if las >= 5:
                    nowe.append((x, y))
        for x, y in nowe:
            m[y][x] = 'T'
    # Zachodni zakątek ciaśniejszy.
    _lataj(g, R4_ZACHOD_LAS, 'T')
    for x0, y0, x1, y1 in R4_LAS:
        _lataj(g, [(x, y) for y in range(y0, y1 + 1) for x in range(x0, x1 + 1) if m[y][x] in '.b'], 'T')
    # Kraina wroga ma JEDEN grunt: twardą, ciemną ziemię (w tle `j`, G4),
    # bez łat trzęsawiska — bagno jest pograniczem (E3).
    for y in range(BOK):
        for x in range(BOK):
            if m[y][x] == 'b' and strefa(x, y) == 'wroga':
                m[y][x] = '.'

    # --- obiekty -----------------------------------------------------------
    for i, (p, w) in enumerate(list(g.obiekty)):
        if p in R4_PRZESUN:
            q = R4_PRZESUN[p]
            if m[q[1]][q[0]] not in '.,b':
                m[q[1]][q[0]] = 'b'
            g.obiekty[i] = (q, w)
            if p in g.zajete:
                g.zajete.remove(p)
            g.zajete.append(q)
    _odswiez(g)
    x, y = R4_DRZEWO
    if m[y][x] not in '.b':
        m[y][x] = 'b'
    g.postaw(R4_DRZEWO, ('budynek', 'drzewo-wiedzy'))
    g.postaw(R4_RANCZO, ('budynek', 'ranczo'))
    for p, w in R4_DODAJ:
        if m[p[1]][p[0]] not in '.,b':
            m[p[1]][p[0]] = '.' if strefa(*p) == 'wroga' else 'b'
        g.postaw(p, w)
    _odswiez(g)
    g.zasyp_odciete(m)
    print(f'  runda 4: usunięte {len(zabrane)}, obiektów {len(g.obiekty)}')


# --- RUNDA 5 PĘTLI (werdykt ślepego porównania r4: 15 TAK / 13 CZĘŚCIOWO /
# 2 NIE) ------------------------------------------------------------------
# Jak `runda_3` i `runda_4`: po rozstawieniu, chirurgicznie. Co i dlaczego:
#  - B4/G1 (NIE): kopalń 16 → 11 (po trzy rzadkie: kamień i pokeballe),
#    budowli do odwiedzenia 19 → ~35, skrzyń 25 → 22. Środek (20–41 × 18–36)
#    traci kopalnie (25,23), (29,28) ze strażą (24,24), skrzynie (20,25),
#    (30,25) idą na koniec grobli i za most; na zwolnione miejsca obozowisko.
#  - A2/A5: kopalnia pokeballi doliny pod słabą strażą obok (już nie na)
#    drogi; kopalnia kamieni i zakątek SW za JEDNĄ słabą strażą (10,51).
#  - A3/D1: ścieżka w dół doliny kończy się stosem dwóch surowców — dwie
#    łatwe nagrody w 7 krokach od bramy, odnoga ma cel.
#  - C1/C4: stos NE zamknięty lasem z jednym wejściem (36,3), straż w nim;
#    straż (38,33) z drogi przy kopalni kamieni (kopalnia z murem na drodze
#    odchodzi na zachód od traktu), straż (44,46) z drogi do szyjki obok.
#  - D3: trakt doliny (13 → 31, 44) prosty, bez schodka na łące; ukos spod
#    warowni wyrównany.
#  - E3/E5: dolina bez łat bagna; kałuże bez funkcji (9–10, 51–53) (las —
#    ściana zakątka), (15–17, 39–41), (31–33, 11–13) i drobne oczka
#    trzęsawiska zasypane.
#  - G3: w głębi masywów lasu pojedyncze głazy — klocki lasu nie układają
#    się w równe poziome szpalery.
#  - G4: kraina wroga ma w SIATCE grunt `j` (ziemia jałowa) — inny kolor na
#    minimapie niż łąka doliny, nie tylko w tle.
R5_USUN = [
    # środek: kopalnie i straż (zmiana 1), skrzynie do przeniesienia
    (25, 23), (29, 28), (24, 24), (20, 25), (30, 25),
    # kopalnie zamienione na budowle (B1/B4)
    (26, 30), (15, 13), (20, 13),
    # kopalnia kamieni z murem na drodze, jej straż na drodze, skrzynia obok
    (39, 33), (38, 33), (34, 34), (34, 36),
    # straże do przestawienia (C1/G2)
    (32, 4), (44, 46), (9, 50),
    # sierota pod warownią (B2)
    (26, 10),
]

#: Skrzynie zamienione na budowle (B4: skrzyń 23 %, budowli 17 %).
R5_SKRZYNIE_NA_BUDOWLE = {(12, 12): 'woz', (24, 20): 'chatka'}

#: Teren: pola lasu (zamknięcie stosu NE i zakątka SW), łąki i bagna.
R5_LAS = [
    # stos NE: jedna brama (35,3) na końcu korytarza między lasami, pasek
    # x=37 w dół zarasta
    (35, 0), (36, 0), (35, 1), (36, 1), (35, 2), (36, 2), (35, 4), (36, 4),
    (37, 5), (38, 5), (37, 6), (37, 7), (37, 8),
    # zakątek SW: ściana zamiast kałuży (9–10, 51–53)
    (9, 49), (9, 51), (9, 52), (9, 53),
]
R5_LAKA = [(10, 51), (10, 52), (10, 53), (11, 52), (11, 53),
           (15, 40), (16, 40), (17, 40), (14, 41), (15, 41), (16, 41)]

R5_OBIEKTY = [
    # straże
    ((35, 3), ('potwor', 'silny')),          # brama stosu NE
    ((10, 51), ('potwor', 'slaby')),         # zakątek SW i kopalnia kamieni
    ((23, 42), ('potwor', 'slaby')),         # kopalnia pokeballi doliny
    ((45, 48), ('potwor', 'sredni')),        # szyjka odnogi SE, obok drogi
    # kopalnia kamieni pogranicza na zachód od traktu, straż przy wejściu
    ((36, 33), ('kopalnia', 'kamien')),
    ((35, 34), ('potwor', 'sredni')),
    # skrzynie ze środka: koniec grobli i za mostem
    ((11, 30), ('skrzynia', None)),
    ((34, 43), ('skrzynia', None)),
    # koniec ścieżki w dół doliny: stos (D1, A3)
    ((12, 53), ('surowiec', 'jagoda')),
]

#: Budowle do odwiedzenia: rodzaj i prostokąt, w którym szukać czystego
#: miejsca (`_miejsce`). Najpierw zwolnione miejsca, potem rzadkie ekrany.
R5_BUDOWLE = [
    ('ognisko', (22, 23, 26, 25)),       # zamiast kopalni i straży (24,24)
    ('wiatrak', (25, 29, 28, 31)),       # zamiast kopalni odłamków (26,30)
    ('chatka', (14, 12, 17, 13)),        # zamiast kopalni wroga (15,13)
    ('gniazdo', (19, 12, 22, 13)),       # zamiast kopalni wroga (20,13)
    # kraina wroga, zachód: pusta kieszeń (4–8, 6–8) i łąka pod lasem
    ('ognisko', (4, 6, 8, 8)),
    ('wieza-obserwacyjna', (9, 3, 13, 5)),
    ('wiatrak', (16, 7, 20, 9)),
    # zachód trzęsawiska
    ('wiatrak', (13, 23, 17, 27)),
    ('woz', (3, 25, 8, 27)),
    # dolina i za mostem
    ('chatka', (20, 38, 24, 41)),
    # wschód
    ('oboz-treningowy', (42, 29, 47, 32)),
    ('wiatrak', (39, 22, 47, 32)),
    ('woz', (28, 29, 32, 31)),
    ('zrodlo', (9, 7, 14, 11)),
    ('gniazdo', (6, 0, 12, 3)),
    ('gniazdo', (18, 24, 22, 27)),
    ('ognisko', (44, 41, 50, 45)),
]


def _miejsce(g, prost, sucho=False):
    """Czyste pole na budowlę w prostokącie: grunt, nie droga, bez drogi pod
    rysunkiem (dwa rzędy wyżej), z dala od innych budowli (3) i obiektów (2),
    nic nie leży w pasie nad nią i ona nie stoi w pasie nad budowlą (G2)."""
    x0, y0, x1, y1 = prost
    m = g.mapa
    budowle = [q for q, w in g.obiekty if w[0] in ('budynek', 'kopalnia', 'jasnowidz')]
    wszystkie = [q for q, _ in g.obiekty]
    zajete = set(wszystkie) | g.blokada
    for nazwa, p in PUNKTY.items():
        if nazwa.startswith('zamek'):
            budowle.append(p)
    sx, sy = (x0 + x1) / 2, (y0 + y1) / 2
    dobre = []
    for y in range(y0, y1 + 1):
        for x in range(x0, x1 + 1):
            if not g.w(x, y) or m[y][x] not in '.bj,' or (x, y) in zajete or g.ciasne(x, y):
                continue
            if any(g.w(x + dx, y + dy) and m[y + dy][x + dx] == '=' for dy in (-2, -1, 0) for dx in (-1, 0, 1)):
                continue
            if any(max(abs(x - q[0]), abs(y - q[1])) < 3 for q in budowle):
                continue
            if any(max(abs(x - q[0]), abs(y - q[1])) < 2 for q in wszystkie):
                continue
            if any(abs(q[0] - x) <= 1 and 1 <= y - q[1] <= 2 for q in wszystkie):
                continue
            # Runda 8 (G2): rysunek budowli nie wchodzi na brzeg wody.
            if sucho and any(g.w(x + dx, y + dy) and m[y + dy][x + dx] == '~'
                             for dy in (-2, -1, 0, 1) for dx in (-1, 0, 1)):
                continue
            otwarte = sum(1 for dy in (-1, 0, 1) for dx in (-1, 0, 1)
                          if g.w(x + dx, y + dy) and m[y + dy][x + dx] in '.bj,=')
            dobre.append((-otwarte, abs(x - sx) + abs(y - sy), (x, y)))
    return min(dobre)[2] if dobre else None


def _linia(a, b):
    (x0, y0), (x1, y1) = a, b
    n = max(abs(x1 - x0), abs(y1 - y0))
    return [(x0 + round((x1 - x0) * i / n), y0 + round((y1 - y0) * i / n)) for i in range(n + 1)]


def _prosta(g, a, b):
    """Odcinek drogi z `a` do `b` po prostej (D3: schodki i ząbki na łące).
    Stara trasa między nimi (najkrótsza po polach drogi) wraca do gruntu
    wokół. Gdy prosta trafia w wodę, las albo obiekt — zostaje stara."""
    m = g.mapa
    from collections import deque
    skad = {a: None}
    kol = deque([a])
    while kol:
        p = kol.popleft()
        if p == b:
            break
        for dy in (-1, 0, 1):
            for dx in (-1, 0, 1):
                q = (p[0] + dx, p[1] + dy)
                if g.w(*q) and q not in skad and m[q[1]][q[0]] == '=':
                    skad[q] = p
                    kol.append(q)
    if b not in skad:
        print(f'  prosta {a}→{b}: brak starej drogi')
        return False
    stara, p = [], b
    while p is not None:
        stara.append(p)
        p = skad[p]
    nowa = _linia(a, b)
    zajete = {q for q, _ in g.obiekty} | g.blokada
    if any(m[y][x] != '=' and (m[y][x] not in '.bj,' or (x, y) in zajete) for x, y in nowa):
        print(f'  prosta {a}→{b}: przeszkoda, zostaje stara')
        return False
    for x, y in stara:
        if (x, y) in nowa:
            continue
        w = _wokol(m, [(x, y)])
        m[y][x] = max('.b', key=lambda z: w.get(z, 0))
    for x, y in nowa:
        m[y][x] = '='
    return True


def runda_5(g):
    m = g.mapa
    zabrane = _usun(g, R5_USUN)
    for p, b in R5_SKRZYNIE_NA_BUDOWLE.items():
        for i, (q, w) in enumerate(g.obiekty):
            if q == p and w[0] == 'skrzynia':
                g.obiekty[i] = (q, ('budynek', b))
    _odswiez(g)

    # --- teren -------------------------------------------------------------
    for x, y in R5_LAS:
        if m[y][x] != '=':
            m[y][x] = 'T'
    for x, y in R5_LAKA:
        if m[y][x] in '~b':
            m[y][x] = '.'
    # Dolina bez łat bagna (E3: plamy mniejsze niż 6 × 6).
    for y in range(BOK):
        for x in range(BOK):
            if m[y][x] == 'b' and strefa(x, y) == 'dom':
                m[y][x] = '.'
    # Kałuże: woda w składowych do 6 pól poza Strugą i pierścieniem → grunt
    # wokół (E5). Większe stawy zostają — są szyjkami.
    for zn, sk in list(_skladowe(m, '~', 8)):
        if len(sk) > 6:
            continue
        w = _wokol(m, sk)
        grunt = max('.bT', key=lambda z: w.get(z, 0))
        for x, y in sk:
            m[y][x] = grunt
    # Drogi (D3).
    _prosta(g, (13, 44), (31, 44))
    _prosta(g, (22, 7), (25, 14))
    # Koniec ścieżki w dół doliny pole wyżej — stos leży NA jej końcu.
    if m[53][13] == '=':
        m[53][13] = '.'
        g.postaw((13, 53), ('surowiec', 'pokeball'))
    _odswiez(g)

    # --- obiekty -----------------------------------------------------------
    for p, w in R5_OBIEKTY:
        if m[p[1]][p[0]] not in '.,bj':
            m[p[1]][p[0]] = '.' if strefa(*p) != 'pogranicze' else 'b'
        g.postaw(p, w)
    _odswiez(g)
    for b, prost in R5_BUDOWLE:
        p = _miejsce(g, prost)
        if p is None:
            print(f'  runda 5: brak miejsca na {b} w {prost}')
            continue
        g.postaw(p, ('budynek', b))
    _odswiez(g)

    # --- G3: głazy w głębi lasu ---------------------------------------------
    for y in range(1, BOK - 1):
        for x in range(1, BOK - 1):
            if m[y][x] != 'T' or strefa(x, y) == 'dom' and y >= 34:
                continue
            if not all(m[y + dy][x + dx] in 'T#' for dy in (-1, 0, 1) for dx in (-1, 0, 1)):
                continue
            if (x * 7919 + y * 104729 + ZIARNO) % 23 == 0:
                m[y][x] = '#'

    g.zasyp_odciete(m)
    # --- G4: grunt krainy wroga w siatce ------------------------------------
    for y in range(BOK):
        for x in range(BOK):
            if m[y][x] == '.' and strefa(x, y) == 'wroga':
                m[y][x] = 'j'
    print(f'  runda 5: usunięte {len(zabrane)}, obiektów {len(g.obiekty)}')


# --- RUNDA 6 PĘTLI (werdykt ślepego porównania r5: 21 TAK / 8 CZĘŚCIOWO /
# 1 NIE) ------------------------------------------------------------------
# Jak poprzednie: po rozstawieniu, chirurgicznie. Co i dlaczego:
#  - G1 (NIE): ekran wokół zamku (0–20 × 36–53) miał 14 obiektów, ekran wroga
#    (27–48 × 0–12) 18. Przy zamku zostają dwie kopalnie bez straży, surowiec
#    i skrzynia przy trakcie, kopalnia kamieni ze strażą i zakątek SW (dwie
#    rzeczy). Ranczo i drzewo wiedzy idą za groblę / za most, wieża (21,49)
#    i wiatrak (18,39) znikają. U wroga stosy (27–29, 3–8), połowa stosu NE,
#    ognisko (40,1) i skrzynia z wyspy precz. Nadmiar trafia do drugiego pasu
#    odległości: zachodnie trzęsawisko i łąka za mostem.
#  - C1: straż (8,12) w korytarzu lasu (7–10, 12) przed zakątkiem wroga;
#    stos NE za korytarzem (33–36, 3) z lasem pod nim, straż w wylocie (36,3);
#    kopalnia pokeballi doliny w skalnej niszy (22–26, 39–42), straż w jej
#    wylocie (24,42), nad traktem, nie na nim.
#  - D1: odnogi drogi do kopalń (4,45), (24,42→24,40) i (10,24).
#  - D3: wschodni trakt nie idzie schodkami po skosie (38,33)→(44,26), tylko
#    pionem przy kopalni (36,33) i dalej brzegiem stawu dołożonego w trójkąt
#    (41–43, 28–30) — zakręt ma powód w terenie. Na rozstajach (27,24)
#    kamienna wieża (jedyna) zamiast ogniska.
#  - E3: plama skał (15–19, 50–53) to las; wschodni pas (40–53 × 20–50) bez
#    łat łąki i kałuż — bagno, las i jedno jezioro.
#  - F3: wieże widokowe 4 → 2, wiatraki 5 → 2, wozy 4 → 2, portale (para)
#    rozsunięte i z dala od drogi.
#  - G2: klaster (7–12, 27) i (29–33, 27–29) rozebrany.
#  - G4: płaskowyż wroga w tle to ciemne wrzosowisko (`TEKSTURY['jalowa']`).
R6_USUN = [
    # dolina (G1)
    (12, 53), (13, 53), (7, 51), (18, 39), (15, 37), (14, 43), (21, 49),
    (22, 39), (24, 42), (23, 42),
    # kraina wroga (G1)
    (27, 3), (28, 3), (28, 8), (29, 8), (37, 3), (38, 3), (40, 1), (43, 5), (35, 3),
    (19, 8), (12, 12), (15, 12), (8, 1),
    # F3/G2: wieże, wiatraki, wozy, gniazdo, portale, ognisko na rozstajach
    (31, 23), (26, 30), (29, 29), (20, 26), (9, 27), (11, 27), (32, 27), (25, 24),
    (49, 38), (15, 25), (26, 48),
    # stos za mostem idzie do zakątka w lesie (C1/F1)
    (32, 45), (33, 45),
    # F3/G1: drugi wóz (sklepik) i ognisko z gęstego południowego wschodu
    (41, 47), (44, 44),
]

#: Teren: las, skały, woda, bagno.
R6_LAS = [
    # korytarz przed zachodnim zakątkiem wroga
    (8, 9), (9, 11), (10, 11), (9, 13), (10, 13),
    # korytarz stosu NE
    (33, 4), (34, 4),
]
#: Kępy lasu na pustych połaciach (E4, gęstość obiektów na pole przejezdne):
#: płaskowyż na wschód od warowni i kąt doliny za stosem (22–23, 49).
R6_LAS += [(x, y) for y in range(5, 9) for x in range(28, 31)]
R6_LAS += [(x, y) for y in range(51, 54) for x in range(21, 25)]
R6_LAS += [(x, y) for y in (13, 14) for x in range(17, 21)] + [(x, 12) for x in range(18, 20)]
R6_SKALY = [(x, y) for y in range(39, 43) for x in (21, 22, 26)]
R6_STAW = [(41, 28), (42, 28), (41, 29), (42, 29), (43, 29), (42, 30), (43, 30), (43, 28)]

#: Wschodni trakt: stare schodki precz, nowy przebieg (D3).
R6_TRAKT_PRECZ = [(41, 30), (42, 29), (43, 28)]
R6_TRAKT = [(40, 31), (41, 31), (42, 31), (43, 31), (44, 30), (44, 29), (44, 28)]

#: Odnogi do kopalń (D1): lista pól drogi.
R6_ODNOGI = [
    [(24, 43), (24, 42), (24, 41)],                 # kopalnia pokeballi doliny
    [(12, 27), (11, 26), (10, 25)],                 # kopalnia pokeballi trzęsawiska
]
#: Odnoga do sadu (4,45) spod bramy zamku: pod rysunkiem zamku nie idzie.
R6_ODNOGA_SADU = [(9, 48), (8, 48), (7, 47), (6, 47), (5, 46)]

#: Zakątek w lesie za mostem: wnętrze (łąka), las domykający, straż w wejściu.
R6_ZAKATEK_MOST = [(x, y) for y in (46, 47) for x in range(33, 36)] + [(32, 46)]
R6_ZAKATEK_MOST_LAS = [(33, 45), (34, 45), (35, 45), (36, 46), (36, 47), (33, 48), (34, 48), (35, 48), (32, 47)]

R6_OBIEKTY = [
    ((32, 46), ('potwor', 'slaby')),
    ((35, 46), ('skrzynia', None)),
    ((35, 47), ('surowiec', 'jagoda')),
    ((34, 47), ('artefakt', None)),
    ((23, 49), ('skrzynia', None)),
    ((24, 40), ('kopalnia', 'pokeball')),
    ((24, 42), ('potwor', 'slaby')),
    ((36, 3), ('potwor', 'silny')),
    # kamienna wieża na rozstajach
    ((25, 24), ('budynek', 'kamienna-wieza')),
]

#: Budowle: rodzaj i prostokąt (`_miejsce`).
R6_BUDOWLE = [
    ('portal', (16, 24, 19, 27)),            # zachodnie trzęsawisko, przy rozstajach
    ('portal', (33, 38, 38, 42)),            # łąka za mostem
    ('ranczo', (33, 22, 39, 24)),            # z doliny — za trzęsawisko
    ('wiatrak', (24, 28, 29, 30)),           # jeden z dwóch, na otwartym bagnie
    ('drzewo-wiedzy', (23, 8, 26, 11)),      # z doliny — na płaskowyż pod warownię
    # B4: budowle zamiast części stosów (surowce ≤ 25 %, budowle ≥ 25 %)
    ('chatka', (28, 21, 31, 23)),
    ('gniazdo', (24, 30, 27, 30)),
    ('zrodlo', (12, 22, 15, 26)),
    ('chatka', (48, 32, 51, 39)),
    ('ognisko', (24, 46, 26, 48)),
]

#: Stosy (1–3 rzeczy obok siebie) w chudych miejscach: prostokąt i zawartość.
R6_STOSY = [
    ((33, 22, 39, 25), [('skrzynia', None), ('surowiec', 'jagoda')]),
    ((4, 25, 9, 26), [('surowiec', 'jagoda')]),
    ((21, 24, 22, 25), [('surowiec', 'pokeball')]),
    ((28, 27, 31, 28), [('surowiec', 'odlamek')]),
    ((17, 3, 20, 5), [('skrzynia', None), ('surowiec', 'odlamek')]),
    ((24, 11, 26, 12), [('surowiec', 'jagoda'), ('skrzynia', None)]),
    ((13, 26, 17, 27), [('surowiec', 'kamien'), ('skrzynia', None)]),
]


def _kupka(g, prost, wpisy):
    """Stos obok siebie (poziomo) na wolnym gruncie w prostokącie: nie na
    drodze, nie w pasie nad budowlą, ≥ 2 od innych obiektów."""
    x0, y0, x1, y1 = prost
    m = g.mapa
    budowle = [q for q, w in g.obiekty if w[0] in ('budynek', 'kopalnia', 'jasnowidz')]
    wszystkie = [q for q, _ in g.obiekty]
    zajete = set(wszystkie) | g.blokada
    n = len(wpisy)

    def wolne(p):
        x, y = p
        return (g.w(x, y) and m[y][x] in '.bj,' and p not in zajete and not g.ciasne(x, y)
                and not any(abs(q[0] - x) <= 1 and 1 <= q[1] - y <= 2 for q in budowle)
                and all(max(abs(x - q[0]), abs(y - q[1])) >= 2 for q in wszystkie))

    sx, sy = (x0 + x1) / 2, (y0 + y1) / 2
    for _, (x, y) in sorted((abs(x - sx) + abs(y - sy), (x, y)) for y in range(y0, y1 + 1) for x in range(x0, x1 + 1)):
        pola = [(x + i, y) for i in range(n)]
        if all(wolne(p) for p in pola):
            for p, w in zip(pola, wpisy):
                g.postaw(p, w)
            return pola
    print(f'  runda 6: brak miejsca na stos w {prost}')
    return []


def runda_6(g):
    m = g.mapa
    zabrane = _usun(g, R6_USUN)
    _odswiez(g)

    # --- teren -------------------------------------------------------------
    for x, y in R6_LAS:
        if m[y][x] != '=':
            m[y][x] = 'T'
    for x, y in R6_ZAKATEK_MOST:
        m[y][x] = '.'
    for x, y in R6_ZAKATEK_MOST_LAS:
        m[y][x] = 'T'
    for x, y in R6_SKALY:
        if m[y][x] != '=':
            m[y][x] = '#'
    # E3: plama skał w dole doliny → las (jedna bryła z lasem obok).
    for y in range(50, BOK):
        for x in range(14, 21):
            if m[y][x] == '#':
                m[y][x] = 'T'
    # D3: staw w trójkącie między traktem a jeziorem, trakt jego brzegiem.
    for x, y in R6_TRAKT_PRECZ:
        m[y][x] = 'b'
    for x, y in R6_STAW:
        m[y][x] = '~'
    for x, y in R6_TRAKT:
        m[y][x] = '='
    # Ścieżka w dół doliny kończy się przy kopalni kamieni, nie na pustym.
    if m[52][13] == '=':
        m[52][13] = '.'
        m[52][12] = '='
    for odnoga in R6_ODNOGI:
        for x, y in odnoga:
            m[y][x] = '='
    # E3: wschodni pas — łąka w bagno, kałuże do 8 pól w grunt wokół, pola
    # bagna wciśnięte w jezioro (≥ 5 sąsiadów wody) pod wodę.
    wschod = lambda x, y: x >= 40 and 20 <= y <= 50
    for y in range(BOK):
        for x in range(BOK):
            if wschod(x, y) and m[y][x] == '.':
                m[y][x] = 'b'
    for zn, sk in list(_skladowe(m, '~', 8)):
        if len(sk) <= 8 and all(wschod(x, y) for x, y in sk):
            for x, y in sk:
                m[y][x] = 'b'
    zajete = {p for p, _ in g.obiekty} | g.blokada
    for y in range(20, 51):
        for x in range(40, BOK - 1):
            if m[y][x] != 'b' or (x, y) in zajete:
                continue
            woda = sum(1 for dy in (-1, 0, 1) for dx in (-1, 0, 1)
                       if (dx or dy) and m[y + dy][x + dx] == '~')
            if woda >= 5:
                m[y][x] = '~'
    _odswiez(g)

    # --- obiekty -----------------------------------------------------------
    for p, w in R6_OBIEKTY:
        if m[p[1]][p[0]] not in '.,bj=':
            m[p[1]][p[0]] = '.'
        g.postaw(p, w)
    _odswiez(g)
    for x, y in R6_ODNOGA_SADU:
        m[y][x] = '='
    for b, prost in R6_BUDOWLE:
        p = _miejsce(g, prost)
        if p is None:
            print(f'  runda 6: brak miejsca na {b} w {prost}')
            continue
        g.postaw(p, ('budynek', b))
    _odswiez(g)
    for prost, wpisy in R6_STOSY:
        _kupka(g, prost, wpisy)
    _odswiez(g)
    g.zasyp_odciete(m)
    import os
    if os.environ.get('R6_DEBUG'):
        for y in range(BOK):
            ob = {q: w[0][0].upper() for q, w in g.obiekty}
            print('%3d ' % y + ''.join(ob.get((x, y)) or ('o' if _miejsce(g, (x, y, x, y)) else m[y][x]) for x in range(BOK)))
    print(f'  runda 6: usunięte {len(zabrane)}, obiektów {len(g.obiekty)}')



# --- RUNDA 7 PĘTLI (werdykt ślepego porównania r6: przegrana, 19 TAK /
# 10 CZĘŚCIOWO / 1 NIE) ---------------------------------------------------
# Krytyk: plansza za rzadka (obiekt co 11,1 pola), dom ma 15 obiektów na
# 113, start na pustej łące; pojedyncze surowce i straże na placu. Poprzednie
# rundy odchudzały na żądanie innych krytyków — więc nie konfetti, tylko
# STOSY po 2–3 przy drodze i na końcach odnóg, budynki do odwiedzenia.
#  - A3/G1: stos skrzynia + jagody (16–17, 48) 4 kroki od bramy zamku.
#  - B1: kopalnia pokeballi z niszy (24,40) na otwartą łąkę przy trakcie
#    (komplet czterech kopalń w domu widać od razu); w niszy za słabą strażą
#    (24,42) zostaje stos skrzynia + artefakt.
#  - B2: pojedyncze (16,43) i (11,43) → pary.
#  - D1/F1: koniec odnogi do sadu (5,46) i ścieżki w dół doliny (12,52)
#    kończy stos (skrzynia + kamień).
#  - B2: stos płaskowyżu wroga (19–21, 10–11) zbity w kupkę 2 × 2 + 1.
#  - C1: straż kamiennej kopalni (35,34) → (36,34) w niszy domkniętej lasem
#    (kopalnia jagód (37,36) dwa pola niżej, (36,38), przy zakręcie traktu);
#    wejście do zakątka wschodniego (41,36) i zachodniego zakątka wroga (8,12)
#    to korytarze z lasem po obu stronach.
#  - C4: wylot mostu (29–30, 43–45) zwężony lasem do jednego pola; obóz
#    treningowy z przyczółka precz.
#  - E3: skały niszy (21–22/26, 39–42) i przy bramie wroga (23–30, 13–17)
#    → las; jezioro zachodnie (10–23, 18–23) bez wysepek i zatok.
#  - F3: drugi wiatrak (47,24) → wędrowny sklepik, druga wieża widokowa
#    (39,39) → ranczo. Portale (para „Stacji Kolejki") zostają — to jeden
#    obiekt w dwóch końcach.
R7_USUN = [(24, 40), (30, 43), (35, 34), (37, 36), (20, 11)]

R7_LAS = [
    # korytarz przed zakątkiem wroga (8,12) dłuższy o dwa pola
    (11, 11), (11, 13), (12, 13),
    # wejście do zakątka wschodniego (41,36): las po obu stronach
    (40, 35), (40, 37),
    # nisza kamiennej kopalni pogranicza (36,33)
    (34, 34), (34, 35), (35, 35), (34, 36), (35, 36),
    # wylot mostu
    (29, 43), (30, 43), (29, 45), (30, 45),
]

#: Budowle podmienione w miejscu (F3).
R7_PODMIEN = {(47, 24): 'woz', (39, 39): 'ranczo'}

R7_OBIEKTY = [
    ((36, 34), ('potwor', 'sredni')),           # nisza kopalni kamieni
    ((36, 38), ('kopalnia', 'jagoda')),         # z (37,36): rysunek nie wchodzi na straż
    ((20, 9), ('surowiec', 'pokeball')),        # stos wroga (19–21, 9–10) zbity w kupkę
    ((16, 48), ('skrzynia', None)),             # A3: 4 kroki od bramy
    ((17, 48), ('surowiec', 'jagoda')),
    ((17, 43), ('surowiec', 'pokeball')),       # para ze skrzynią (16,43)
    ((11, 42), ('skrzynia', None)),             # para z jagodami (11,43)
    ((23, 40), ('skrzynia', None)),             # nisza za strażą (24,42)
    ((24, 40), ('artefakt', None)),
    ((5, 47), ('skrzynia', None)),              # koniec odnogi do sadu
    ((12, 53), ('skrzynia', None)),             # koniec ścieżki w dół doliny
    ((13, 53), ('artefakt', None)),
]

R7_BUDOWLE = [
    ('kopalnia:pokeball', (15, 39, 20, 42)),    # B1: przy trakcie, bez straży
    ('drzewo-wiedzy', (14, 35, 18, 38)),        # dom: łąka nad traktem
    ('ognisko', (30, 9, 36, 12)),               # płaskowyż wroga, wschód
]

#: Stosy w chudych ekranach (`_kupka`).
R7_STOSY = [
    ((26, 3, 30, 5), [('skrzynia', None), ('artefakt', None)]),
    # drugi pas odległości (garb nagród): zachodnie trzęsawisko za groblą
    ((5, 28, 8, 29), [('skrzynia', None), ('artefakt', None)]),
]


def runda_7(g):
    m = g.mapa
    zabrane = _usun(g, R7_USUN)
    for i, (q, w) in enumerate(g.obiekty):
        if q in R7_PODMIEN and w[0] == 'budynek':
            g.obiekty[i] = (q, ('budynek', R7_PODMIEN[q]))
    _odswiez(g)

    # --- teren -------------------------------------------------------------
    for x, y in R7_LAS:
        if m[y][x] != '=':
            m[y][x] = 'T'
    # E3: skały-plamy → las.
    for x, y in R6_SKALY:
        if m[y][x] == '#':
            m[y][x] = 'T'
    for y in range(13, 19):
        for x in range(22, 32):
            if m[y][x] == '#':
                m[y][x] = 'T'
    # E3: jezioro zachodnie jedną taflą — wysepki lasu i wąskie zatoki bagna
    # (pola z ≥ 5 sąsiadami wody) pod wodę; obrys jeziora zostaje krzywy.
    for _ in range(3):
        pod_wode = [
            (x, y) for y in range(18, 24) for x in range(10, 24)
            if m[y][x] in 'Tb' and sum(1 for dy in (-1, 0, 1) for dx in (-1, 0, 1)
                                       if (dx or dy) and m[y + dy][x + dx] == '~') >= 5
        ]
        _lataj(g, pod_wode, '~')
    _odswiez(g)

    # --- obiekty -----------------------------------------------------------
    for p, w in R7_OBIEKTY:
        if m[p[1]][p[0]] not in '.,bj':
            m[p[1]][p[0]] = '.' if strefa(*p) != 'pogranicze' else 'b'
        g.postaw(p, w)
    _odswiez(g)
    for b, prost in R7_BUDOWLE:
        p = _miejsce(g, prost)
        if p is None:
            print(f'  runda 7: brak miejsca na {b} w {prost}')
            continue
        wpis = ('kopalnia', b.split(':')[1]) if b.startswith('kopalnia:') else ('budynek', b)
        g.postaw(p, wpis)
    _odswiez(g)
    for prost, wpisy in R7_STOSY:
        _kupka(g, prost, wpisy)
    _odswiez(g)
    g.zasyp_odciete(m)
    print(f'  runda 7: usunięte {len(zabrane)}, obiektów {len(g.obiekty)}')



# --- RUNDA 8 PĘTLI (werdykt ślepego porównania r7: przegrana, 20 TAK /
# 10 CZĘŚCIOWO / 0 NIE) ---------------------------------------------------
# Krytyk: „las z wyciętymi ścieżkami" (39 % lasu w równych rzędach wierzb),
# obiekty pojedynczo wzdłuż dróg, najdalszy pas najuboższy (18), straże
# pogranicza na szerokim bagnie przy rozstajach, a nie w szyjkach.
#  - C1/C4: przejście traktu ze wschodniego bagna na środek (39–41, 30)
#    zwężone lasem do 2 pól, w nim małpa z niszy (36,34); małpa zakątka
#    (41,36) w wylocie (42,36), łupy zakątka jednym stosem w głębi; ognisty
#    potwór (36,3) w korytarzu (34,3); smok wyspy w jedynej luce muru
#    skarbca (46,5) (rząd 5 wyspy to las, skarbiec rzędy 3–4).
#  - G2: straż brodu (12,33) na brzeg (12,35); stacja kolejki (17,25) i wóz
#    (7,27) z brzegu wody (kolejka na suche, wóz precz).
#  - D1: ostroga drogi do niszy (24,41–43) precz — straż stoi w wylocie
#    niszy, nie na końcu drogi; ścieżka w dół doliny kończy się stosem.
#  - B2: kropki (22–23, 49), (6,52), SE (48–51, 47–49) i zachodnie
#    trzęsawisko w stosy; samotne surowce środka precz.
#  - B4/F3: laboratorium (drzewo-wiedzy) zostaje jedno (16,36), wóz jeden
#    (47,24), obóz jeden (24,36), ranczo jedno (33,23); budowle zwykłe
#    (ognisko, chatka, gniazdo, automat, wiatrak, punkt widokowy) zamiast
#    3 skrzyń i 2 artefaktów.
#  - G3/E4: las 39 % → ok. 31 %: wnętrza masywów to pasma skał (narożnik
#    NW, grzbiet krainy wroga na zachód i wschód od bramy, płaskowyż wroga,
#    dół mapy, wschodni skraj); tapeta wierzb (0–10, 18–30) i (44–54,
#    26–40) poszarpana zatokami trzęsawiska. Las zostaje przy szyjkach.
#  - G4: wyspa celu piaszczysta (`,`), płaskowyż wroga chłodniejszy.
#  - E2: skarbiec wyspy i budowle w kątach NE/NW — ostatni pas bogatszy.
R8_USUN = [
    (36, 34), (41, 36), (36, 3), (12, 33), (45, 8),        # straże do szyjek
    (17, 25), (7, 27), (43, 32),                            # kolejka, wóz, obóz
    (45, 36),                                               # zakątek: stos 3
    (22, 49), (23, 49), (13, 53), (6, 52),                  # kropki domu
    (50, 47), (51, 47), (49, 49), (48, 48),                 # SE w stos
    (11, 30), (34, 43),                                     # skrzynie → budowle
    (31, 27), (21, 24), (5, 26), (11, 28), (10, 29),        # samotne surowce
    (45, 5), (47, 4),                                       # wyspa → skarbiec
    (43, 22), (44, 22),                                     # para w jeziorze (G2)
    (24, 20), (23, 25),                                     # G1: środek luźniej
]

#: Budowle podmienione w miejscu (F3: specjalne po jednym).
R8_PODMIEN = {(25, 9): 'wiatrak', (40, 27): 'chatka', (39, 39): 'gniazdo'}

#: Pola lasu (wąskie gardła i mur skarbca wyspy).
R8_LAS = [
    (41, 30),                                               # przejście 2 pola
    (43, 35), (43, 37),                                     # wylot zakątka
] + [(x, 5) for x in range(42, 51) if x != 46]              # mur skarbca

#: Ostroga drogi do niszy (24,42) — trakt jej nie potrzebuje.
R8_BEZ_DROGI = [(24, 41), (24, 43)]

R8_OBIEKTY = [
    ((40, 30), ('potwor', 'sredni')),           # przejście traktu na środek
    ((42, 36), ('potwor', 'sredni')),           # wylot zakątka wschodniego
    ((34, 3), ('potwor', 'silny')),             # korytarz kąta NE
    ((12, 35), ('potwor', 'slaby')),            # brzeg za brodem
    ((46, 5), ('potwor', 'silny')),             # luka muru skarbca wyspy
    # skarbiec wyspy (rzędy 3–4)
    ((44, 4), ('skrzynia', None)),
    ((45, 3), ('surowiec', 'kamien')),
    ((47, 4), ('artefakt', None)),
    ((48, 4), ('surowiec', 'pokeball')),
    # koniec ścieżki w dół doliny (12,52): stos
    ((13, 53), ('surowiec', 'pokeball')),
    ((13, 52), ('surowiec', 'odlamek')),
    # zakątek SW za strażą (10,51): skrzynia + kamień obok
    ((6, 51), ('surowiec', 'kamien')),
    # SE: stos 3 na końcu odnogi
    ((48, 47), ('skrzynia', None)),
    ((48, 48), ('artefakt', None)),
    ((49, 48), ('surowiec', 'odlamek')),
    # zachodnie trzęsawisko: stos (7–9, 29)
    ((9, 29), ('surowiec', 'jagoda')),
    # para z brzegu jeziora (43–44, 22) w zatokę zachodu, obok wiatraka
    ((3, 26), ('skrzynia', None)),
    ((3, 27), ('surowiec', 'jagoda')),
    # płaskowyż wroga: para (28–29, 4) dostaje trzeci (z (23,25) ze środka)
    ((27, 4), ('surowiec', 'jagoda')),
    # wyspa: para surowców przy Kamieniu dostaje trzeci
    ((50, 9), ('surowiec', 'odlamek')),
]

#: Stosy (`_kupka`).
R8_STOSY = []

#: Nowe budowle (`_miejsce(..., sucho=True)`): zwykłe, do odwiedzenia.
R8_BUDOWLE = [
    ('portal', (12, 25, 24, 29)),                 # kolejka z brzegu jeziora
    ('wieza-obserwacyjna', (42, 8, 50, 11)),      # wyspa: widok na jezioro
    ('ognisko', (37, 0, 44, 2)),                  # kąt NE za korytarzem
    ('wiatrak', (2, 24, 9, 28)),                  # zachodnie trzęsawisko
    ('gniazdo', (38, 45, 43, 48)),                # trakt za mostem (zamiast skrzyni)
    ('zrodlo', (6, 0, 15, 2)),                    # kraina wroga, północ
    ('zrodlo', (7, 26, 9, 28)),                   # rozstaje zachodniego trzęsawiska
    ('chatka', (3, 20, 3, 22)),                   # zakątek zachodni
    ('chatka', (27, 9, 31, 11)),                  # płaskowyż wroga (z (24,20) znad jeziora)
    ('ognisko', (44, 27, 48, 30)),                # zatoka przy grobli
    ('wiatrak', (49, 32, 53, 36)),                # wschodni skraj (chatka stoi już w (49,35))
]

#: Pasma skał we wnętrzach masywów (prostokąty; las przy drodze zostaje).
R8_SKALY = [
    (0, 0, 4, 8),          # narożnik NW
    (0, 14, 12, 18),       # grzbiet krainy wroga, zachód
    (29, 15, 40, 20),      # grzbiet krainy wroga, wschód od bramy
    (29, 5, 37, 8),        # płaskowyż wroga: skalny garb
    (33, 50, 46, 53),      # dół mapy za mostem
    (48, 26, 53, 31),      # wschodni skraj nad zatoką
]

#: Zatoki trzęsawiska w tapecie wierzb (G3) — pola lasu → grunt strefy.
R8_ZATOKI = [
    # zachód (0–10, 18–30)
    (2, 20), (3, 20), (3, 21), (2, 22),
    (4, 25), (5, 25), (3, 26), (4, 26), (2, 27), (3, 27), (4, 28), (5, 28),
    (8, 30), (9, 30), (10, 30),
    # wschód (44–54, 26–40)
    (45, 29), (46, 29), (47, 29), (46, 28), (47, 28), (47, 30), (45, 28),
    (51, 34), (51, 35), (52, 35), (51, 36), (52, 36), (51, 37),
    (48, 38), (48, 39), (49, 39),
]


def runda_8(g):
    m = g.mapa
    zabrane = _usun(g, R8_USUN)
    for i, (q, w) in enumerate(g.obiekty):
        if q in R8_PODMIEN and w[0] == 'budynek':
            g.obiekty[i] = (q, ('budynek', R8_PODMIEN[q]))
    _odswiez(g)

    # --- teren -------------------------------------------------------------
    zajete = {p for p, _ in g.obiekty} | g.blokada
    for x, y in R8_BEZ_DROGI:
        if m[y][x] == '=':
            m[y][x] = '.'
    for x, y in R8_LAS:
        if m[y][x] != '=' and (x, y) not in zajete:
            m[y][x] = 'T'
    grunt = {'dom': '.', 'pogranicze': 'b', 'wroga': 'j'}
    for x, y in R8_ZATOKI:
        if m[y][x] == 'T':
            m[y][x] = grunt[strefa(x, y)]
    brama = (26, 16)
    for x0, y0, x1, y1 in R8_SKALY:
        # Elipsa wpisana w prostokąt z poszarpanym brzegiem (stały szum
        # z pola) — masyw, nie cegła.
        cx, cy = (x0 + x1) / 2, (y0 + y1) / 2
        rx, ry = (x1 - x0) / 2 + 0.6, (y1 - y0) / 2 + 0.6
        for y in range(y0, y1 + 1):
            for x in range(x0, x1 + 1):
                if m[y][x] != 'T' or max(abs(x - brama[0]), abs(y - brama[1])) <= 2:
                    continue
                szum = ((x * 7919 + y * 104729 + x * y * 31) % 97) / 97 * 0.6 - 0.3
                if ((x - cx) / rx) ** 2 + ((y - cy) / ry) ** 2 + szum > 1.0:
                    continue
                if any(g.w(x + dx, y + dy) and m[y + dy][x + dx] == '='
                       for dy in (-1, 0, 1) for dx in (-1, 0, 1)):
                    continue
                m[y][x] = '#'
    # G4: wyspa celu piaszczysta — odrębny teren, nie grunt płaskowyżu.
    for y in range(0, 13):
        for x in range(40, BOK):
            if m[y][x] == 'j' and (x - WYSPA[0]) ** 2 + (y - WYSPA[1]) ** 2 <= PIERSCIEN_ZEWN ** 2:
                m[y][x] = ','
    _odswiez(g)

    # --- obiekty -----------------------------------------------------------
    for p, w in R8_OBIEKTY:
        if m[p[1]][p[0]] not in '.,bj=':
            m[p[1]][p[0]] = grunt[strefa(*p)]
        g.postaw(p, w)
    _odswiez(g)
    for b, prost in R8_BUDOWLE:
        p = _miejsce(g, prost, sucho=True)
        if p is None:
            print(f'  runda 8: brak miejsca na {b} w {prost}')
            continue
        g.postaw(p, ('budynek', b))
    _odswiez(g)
    for prost, wpisy in R8_STOSY:
        _kupka(g, prost, wpisy)
    _odswiez(g)
    g.zasyp_odciete(m)
    import os
    if os.environ.get('R8_DEBUG'):
        ob = {q: w[0][0].upper() for q, w in g.obiekty}
        for y in range(BOK):
            print('%3d ' % y + ''.join(ob.get((x, y)) or ('o' if _miejsce(g, (x, y, x, y), sucho=True) else m[y][x])
                                        for x in range(BOK)))
    print(f'  runda 8: usunięte {len(zabrane)}, obiektów {len(g.obiekty)}')


# --- RUNDA 9 PĘTLI (werdykt ślepego porównania r8: WYGRANA, 23 TAK /
# 7 CZĘŚCIOWO / 0 NIE: A2, C1, E2, E3, G1, G2, G3) -------------------------
#  - A2/C1/G2: słaba straż z łąki (24,42) przy kopalni pokeballi (17,42) —
#    droga kopalnia strzeżona, nisza (23–25, 39–42) to wolna nagroda; para
#    (16–17, 43) ze strefy tej straży na (22–23, 43) przy trakcie, z dala od
#    groty odłamków; straż brodu z traktu (12,35) na brzeg (11,35) (strefa
#    dalej zamyka bród); straż zakątka SW spod dachu kamieniołomu (10,51)
#    w zakątek (8,50) — jej strefa zamyka jedyne wejście (9,50), a rysunek
#    kamieniołomu (szerszy niż 3 pola) już na nią nie wchodzi.
#  - E2 (garb w środku): z doliny stos (16–17, 48) i skrzynia (5,47) → stos
#    przy trakcie w środkowym bagnie (31–32, 23–24); z pasa 5 skrzynia
#    (14,2), surowce (38,2) i (50,9) → stos przy trakcie do bramy
#    (25–26, 19–20), w zatoce nad jeziorem.
#  - G1: ekran wroga (11–31, 0–17) z 22 do 15: precz (27,4), (19,4),
#    (13,2), połowa stosu (20,9)/(21,10), chatka (28,9); (14,2) wyjechała.
#  - E3: kałuże jednopolowe (18,30), (20,30), (36,8), (35,12–13) → las,
#    (32,28) → bagno, łączka (34–35, 29–30) → bagno.
#  - F3/G1: piąte ognisko (46,29) w zatoce przy grobli precz; para
#    (36–37, 24) cztery pola od nowego stosu środka precz (dwa stosy obok
#    siebie dawały 24 obiekty na ekranie środka).
#  - G3: pas drzew w dolinie (19–22, 35–43) skrócony do (20–21, 38–41),
#    kępy (15–17, 39) i (26, 39–42) precz — łąka doliny bez przegródek.
R9_USUN = [
    (16, 48), (17, 48), (5, 47),                            # dom → środek
    (14, 2), (38, 2), (50, 9),                              # pas 5 → środek
    (27, 4), (19, 4), (13, 2), (20, 9), (21, 10), (28, 9),  # ekran wroga
    (24, 42), (12, 35), (10, 51),                           # straże G2
    (16, 43), (17, 43),                                     # para ze strefy straży
    (46, 29),                                               # piąte ognisko (F3, G1 wschodu)
    (36, 24), (37, 24),                                     # para tuż obok nowego stosu (G1)
]

#: Gdzie stają przeniesione: stare pole → nowe pole (wpis ten sam).
R9_PRZENIES = {
    (24, 42): (17, 42),
    (12, 35): (11, 35),
    (10, 51): (8, 50),
    (16, 43): (22, 43),
    (17, 43): (23, 43),
    # stos przy trakcie w środkowym bagnie (z doliny)
    (16, 48): (31, 24),
    (17, 48): (32, 24),
    (5, 47): (31, 23),
    # stos przy trakcie do bramy (z pasa 5)
    (14, 2): (25, 19),
    (38, 2): (25, 20),
    (50, 9): (26, 20),
}

R9_LAS = [(18, 30), (20, 30), (36, 8), (35, 12), (35, 13)]
R9_BAGNO = [(34, 29), (34, 30), (35, 30)]
#: Kałuża (32,28) — jedno pole wody dotykające jeziora tylko po skosie.
R9_KALUZE = [(32, 28)]
#: Pole drogi po straży (24,42) — bez straży to samotny kawałek bruku.
R9_BEZ_DROGI = [(24, 42)]
#: Pas drzew w dolinie: wszystko z prostokąta precz poza (20–21, 38–41).
R9_PAS = (19, 35, 22, 43)
R9_PAS_ZOSTAJE = (20, 38, 21, 41)
R9_KEPY = [(15, 39), (16, 39), (17, 39), (26, 39), (26, 40), (26, 41), (26, 42)]


def runda_9(g):
    m = g.mapa
    zabrane = dict(_usun(g, R9_USUN))
    _odswiez(g)

    # --- teren -------------------------------------------------------------
    zajete = {p for p, _ in g.obiekty} | g.blokada
    for x, y in R9_LAS:
        if m[y][x] == '~' and (x, y) not in zajete:
            m[y][x] = 'T'
    for x, y in R9_BAGNO:
        if m[y][x] == '.':
            m[y][x] = 'b'
    for x, y in R9_KALUZE:
        if m[y][x] == '~':
            m[y][x] = 'b'
    for x, y in R9_BEZ_DROGI:
        if m[y][x] == '=':
            m[y][x] = '.'
    x0, y0, x1, y1 = R9_PAS
    zx0, zy0, zx1, zy1 = R9_PAS_ZOSTAJE
    for y in range(y0, y1 + 1):
        for x in range(x0, x1 + 1):
            if zx0 <= x <= zx1 and zy0 <= y <= zy1:
                if m[y][x] == '.' and (x, y) not in zajete:
                    m[y][x] = 'T'
            elif m[y][x] == 'T':
                m[y][x] = '.'
    for x, y in R9_KEPY:
        if m[y][x] == 'T':
            m[y][x] = '.'
    _odswiez(g)

    # --- obiekty -----------------------------------------------------------
    grunt = {'dom': '.', 'pogranicze': 'b', 'wroga': 'j'}
    for stare, nowe in R9_PRZENIES.items():
        if stare not in zabrane:
            print(f'  runda 9: brak obiektu na {stare}')
            continue
        if m[nowe[1]][nowe[0]] not in '.,bj=':
            m[nowe[1]][nowe[0]] = grunt[strefa(*nowe)]
        g.postaw(nowe, zabrane[stare])
    _odswiez(g)
    g.zasyp_odciete(m)
    print(f'  runda 9: usunięte {len(zabrane)}, obiektów {len(g.obiekty)}')


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
    # Mapa świata w stylu Pokémon: las i skały z klocków (`src/data/klocki.ts`).
    'klocki': 'bagno',
    'wrog': 'aktywny',
    'nazwyZamkowWroga': ['Warownia na Grobli'],
    # Zestaw sprite'ów klimatu dla sceny (`public/mapa/bagno/`) — patrz STAN.md.
    'zestaw': 'bagno',
    # Wyspa Księżyca odsłonięta od pierwszego dnia: gracz ma wiedzieć, DOKĄD
    # jedzie — zagadką jest droga i wódz, a nie szukanie igły w trzęsawisku.
    # Runda 11 (gracz): tylko sam cel, mały (Kamień i wódz), jak w Heroes.
    # Łatki w rogach kadru z rund 6–9 wyglądały jak wyspy rozsiane po mgle —
    # usunięte; okolicę bohatera i zamku odsłania `nowaGra` w `plansza.ts`.
    'odkryte': [
        {'x': WYSPA[0], 'y': WYSPA[1], 'promien': 2},
    ],
    # Runda 5 (wzorzec HotA; wcześniej runda 3: „płaska ikona pokeballa
    # wygląda na wklejoną z innej gry"): znajdźki to STOSY leżące na ziemi
    # (`public/mapa/bagno/stos-*.png`: kosz pokeballi, kosz jagód, kryształy
    # na omszałym kamieniu), nie ikony z paska — i są drobniejsze, z cieniem
    # kontaktowym, jak skarby na mapie Heroes 3.
    # Runda 9: 0,8 → 0,7 — czerwone stosy pokeballi zagłuszały budowle.
    # Runda 10 („znajdźki za duże — zmniejszyć o około 40%"): 0,7 → 0,44.
    'znajdzki': 0.44,
    # Runda 8 (HotA: „góry to osobne stożki skał wklejone jak sprite'y — nie
    # łączą się w grzbiety ani pasma i nie mają podnóży przechodzących
    # w trawę"): skały pierwszego ekranu rysują WIELOPOLOWE pasma
    # (`public/mapa/bagno/gora-N.png`, PROMPTY-PLANSZE §16) zachodzące na
    # siebie, z miękkim, omszałym podnóżem. Na lewym skraju masyw
    # z wodospadem, przed nim długi grzbiet; dół doliny zamyka pasmo od lasu
    # do Strugi z przełęczą, którą schodzi ścieżka.
    # `x`, `y` — stopa rysunku w polach (krawędzie pól), `szer` w polach.
    'masywy': [
        {'plik': 'gora-2', 'x': 6.0, 'y': 41.5, 'szer': 7.0, 'pokrywa': [4, 37, 9, 40]},
        # Runda 10 (HotA: „góry to pojedyncze, odizolowane stożki — lewy dolny
        # róg i lewa krawędź nad zamkiem"): rząd stożków widziany z boku
        # (`gora-1`, `gora-6`, `gora-5`) zastąpiły zwarte masywy widziane
        # z góry — kilka rzędów szczytów połączonych granią, usypiska i głazy
        # u stóp (PROMPTY-PLANSZE §19). Masyw nad zamkiem zachodzi na podnóże
        # wodospadu, więc lewa krawędź to jedno pasmo.
        {'plik': 'gora-7', 'x': 6.0, 'y': 45.6, 'szer': 9.0, 'pokrywa': [4, 41, 9, 44]},
        # Runda 3 pętli (werdykt r2, F1: „kąt (0–9, 49–53) pod zamkiem to skały
        # i trawa bez jednego obiektu"): zamiast `gora-10` jest tu ZAKĄTEK
        # DOLINY ze stosem za słabą strażą (`runda_3`).
        # Runda 9: węższa i w lewo — prawe zbocze wchodziło na Strugę
        # i rzeka płynęła „pod górą".
        # Runda 12 (HotA: „lewy dolny róg i środek dolnej krawędzi to
        # powielone, identyczne stożki jak stemple" — `gora-9` i `gora-10` to
        # ten sam kłąb szpiców): tu skalny próg z półkami, wodospadem i
        # martwymi drzewami, wyrastający z mokradła (PROMPTY-PLANSZE §23).
        {'plik': 'gora-11', 'x': 17.0, 'y': 54.25, 'szer': 5.4, 'pokrywa': [15, 50, 18, 53]},
    ],
    # Runda 6 (HotA: „obiekty interaktywne są mniejsze od drzew i krzaków,
    # bez cienia, konturu i kontrastu"): budowle większe i obrys wokół
    # wszystkiego, co da się odwiedzić albo podnieść.
    # Runda 9 („niespójna skala: domki wielkości drzew, zamek wielkości
    # chaty"): budowle o ton mniejsze, zamek o jedną trzecią większy — zamek
    # ma być największą budowlą w kadrze, jak miasto na mapie Heroes 3.
    'skalaBudowli': 1.05,
    'skalaZamku': 1.05,
    'obrysObiektow': 0.55,
    # Runda 6 („turkusowa, czysta woda — tropikalna zatoka"): tafla w shaderze
    # mętna, oliwkowo-brunatna, bez białej piany i z przygaszonymi iskrami.
    'wodaBarwy': {
        # Runda 7: ciemna torfowa tafla (jak tekstura `teren-woda-czarna`).
        # Runda 8: odrobinę jaśniej i chłodniej (łupkowa, nie czarna).
        'plytka': [0.30, 0.44, 0.44],
        'gleboka': [0.12, 0.22, 0.25],
        'piana': [0.50, 0.56, 0.40],
        'pianaMoc': 0.25,
        'iskry': 1.0,
    },
}

#: Barwy terenu tej planszy (`tools/render_mapa.py`, `zabarw`). Woda na bagnach
#: jest mętna i zielonkawobrązowa — turkusowy staw z Polany wyglądałby tu jak
#: basen. Sucha łąka jest przygaszona i oliwkowa, a las ciemniejszy: pierwsze
#: spojrzenie na ekran ma mówić „bagno", zanim dziecko zobaczy choć jedno pole
#: trzęsawiska.
BARWY_TERENU = {
    # Runda 6: tekstura mętnej wody (`teren-woda-bagno`: zmarszczki zwykłej
    # wody przemalowane na brunatną oliwkę + rzęsa i liście z dostawy OpenAI),
    # tu już tylko lekko przyciemniona.
    # Runda 7 („prawa połowa to mętna, szarozielona plama bez kontrastu"):
    # tafla `teren-woda-czarna` — ciemna, torfowa woda z jasnymi zmarszczkami
    # i rzęsą, wyraźnie ciemniejsza od lądu. Barwy nie ruszamy.
    # Runda 8 („ciemnoturkusowa plama, nie widać, gdzie kończy się ląd"):
    # tafla jaśniejsza i chłodniejsza, łupkowa jak rzeka we wzorcu HotA —
    # ciemna woda obok ciemnego błota to była jedna plama.
    'woda': {'nasycenie': 0.9, 'barwa': (92, 112, 138), 'moc': 0.35, 'jasnosc': 1.32},
    # Runda 6 („zieleń wokół obiektów przygasić"): łąka mniej nasycona.
    'trawa': {'nasycenie': 0.5, 'barwa': (116, 136, 86), 'moc': 0.55, 'jasnosc': 0.76},
    'las': {'nasycenie': 0.7, 'barwa': (90, 110, 75), 'moc': 0.4, 'jasnosc': 0.82},
    # Runda 5 pętli (G3): ściółka pod lasem poza pierwszym ekranem (`TLO`
    # maluje ją znakiem `s` — warstwa śniegu, której ta plansza nie ma).
    'snieg': {'nasycenie': 0.6, 'barwa': (52, 78, 48), 'moc': 0.6, 'jasnosc': 0.3},
    # Runda 8 („rozjaśnić teren"): błoto trzęsawiska o ton jaśniejsze
    # i cieplejsze — czarnobrunatne łaty przy dolinie czytały się jak dziury.
    'bagno': {'nasycenie': 0.95, 'barwa': (130, 118, 80), 'moc': 0.2, 'jasnosc': 1.18},
    # Bruk grobli (runda 6): prawie bez zmian, lekko ciepły.
    # Runda 9: bez jaśniejszej jezdni z `obwodka_drogi` bruk jaśniejszy tu.
    'sciezka': {'nasycenie': 0.8, 'barwa': (160, 145, 120), 'moc': 0.2, 'jasnosc': 1.32},
    # Runda 4 pętli (G4): ciemna, sina ziemia krainy wroga (`TLO`).
    # Runda 6 pętli (G4): wrzosowisko płaskowyżu — ciemny, chłodny brąz,
    # wyraźnie inny niż oliwkowa łąka doliny.
    # Runda 8 pętli (G4: „kraina wroga to jasny, ciepły brąz"): sina,
    # chłodna szarość torfowiska — ciemniejsza od łąki i bez czerwieni.
    'jalowa': {'nasycenie': 0.45, 'barwa': (92, 100, 98), 'moc': 0.7, 'jasnosc': 0.52},
    # Runda 8 pętli (G4): Wyspa Księżyca na jasnym, bladym piasku — odrębny
    # teren celu, nie grunt płaskowyżu.
    'piasek': {'nasycenie': 0.55, 'barwa': (176, 170, 150), 'moc': 0.4, 'jasnosc': 0.88},
}

#: Po rundzie 1 ślepego porównania („bagno to brązowa plama w kolorze drogi"):
#: oczka ciemnej wody, trzcina i grążele na bagnie, obwódka i jaśniejsza
#: jezdnia na grobli (`tools/teren_efekty.py`).
# Runda 9 („ciemne obwódki wokół ścieżek"): zamiast rozlanej ciemnej
#: obwódki (`obwodka_drogi`) malowane obrzeże traktu jak na Polanie — ostry
#: kontur, kamyki i kępki trawy na krawędzi (`droga_obrzeze`).
EFEKTY = ['trzesawisko', 'droga_obrzeze', 'relief', 'bez_placow', 'brzeg_wody']
#: Runda 3 („ciemna ziemia z trzciną, wygląda jak ciemny las"): oczka stojącej
#: wody w barwie jezior tej planszy, mokre błoto wokół, jaśniejszy grunt.
#: Runda 8: oczka w barwie jaśniejszej, łupkowej wody Strugi.
TRZESAWISKO = {'woda': (46, 76, 82)}
#: Błoto z dostawy (`tools/PROMPTY-PLANSZE.md`), do tego czasu zwykłe bagno.
TEKSTURY = {'bagno': ['bloto', 'bagno'], 'woda': ['woda-czarna', 'woda-bagno', 'woda'], 'sciezka': ['bruk', 'sciezka'],
            # Runda 8: pod pasmami gór (`masywy`) mszysta ściółka, nie szary
            # kamień — miękkie podnóże rysunku przechodzi w nią, a nie w kratę.
            'skaly': ['las'],
            # Runda 4 pętli (G4): grunt krainy wroga — ciemna trawa.
            # Runda 6 (G4: „płaskowyż wroga w grze to zielona łąka niewiele
            # ciemniejsza od doliny"): suche wrzosowisko z kamieniami
            # (`teren-tundra`), zabarwione na ciemny, chłodny brąz.
            'jalowa': ['tundra', 'trawa-3', 'trawa'],
            # Runda 5 pętli (G3): ściółka pod lasem (`TLO`, znak `s`).
            'snieg': ['trawa-3', 'trawa']}

#: Runda 2 („krainy rozmywają się w jedną"): twardsze brzegi terenów.
#: Runda 6 („brzegi wody miękko rozmyte, bez wyraźnej linii"): woda ostrzej.
WTAPIANIE = {'bagno': 0.22, 'las': 0.3, 'skaly': 0.28, 'woda': 0.1}

#: Runda 8 (wzorzec HotA: rzekę obwodzi szeroki pas jasnego piasku
#: z kamykami): brzeg Strugi i stawów szerszy i jaśniejszy — to ta linia mówi,
#: gdzie kończy się ląd (`teren_efekty.brzeg_wody`).
BRZEG_WODY = {'szerokosc': 0.62, 'barwa': (186, 160, 112), 'linia': (52, 42, 28)}

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
    # Runda 5 (HotA): gęściej — tafla trzęsawiska zarośnięta grążelami,
    # a nie pusta turkusowa połać.
    # Runda 6 („tropikalna zatoka"): grążeli mniej, za to zatopione pnie,
    # kępy turzycy i trzcina w wodzie — mętne trzęsawisko, nie staw z liliami.
    # Runda 9 („brudna, rozmyta rzeka"): na wodzie o połowę mniej śmieci —
    # czysta tafla z kilkoma grążelami i kępami, jak rzeka we wzorcu HotA.
    (['grazel-1', 'grazel-2'], '~', 0.06),
    (['pien-zatopiony'], '~', 0.03),
    (['kepa-turzycy', 'trzcina-1', 'trzcina-3'], '~', 0.07),
    (['martwe-drzewo-1', 'martwe-drzewo-2'], 'b', 0.04),
    (['pniak-bagienny'], 'b', 0.03),
    # Runda 4: sucha łąka w dole doliny ma być czytelnie INNA niż bagno —
    # kwiaty rosną tylko na suchym.
    (['kwiaty-1', 'kwiaty-2'], '.', 0.05),
    # Runda 5 (wzorzec HotA: gęsto od drobiazgów na każdym polu): grzyby,
    # omszałe kłody, kamienie w mchu, paprocie i bagienne irysy — na suchym
    # i na bagnie, żeby żadna połać nie była gołą teksturą.
    # Runda 9 („te same czerwone grzyby rozsypane po całej mapie zagłuszają
    # obiekty"): na łące tylko kamienie w mchu i paprocie, rzadziej.
    (['kamienie-mech', 'paproc'], '.', 0.08),
    (['kloda-mech', 'irysy', 'paproc', 'grzyby-bagienne'], 'b', 0.14),
]

#: Runda 5 („ścieżki to sztywne beżowe pasy o stałej szerokości, zgięte pod
#: kątami jak na siatce, na zupełnie płaskim terenie"): droga meandruje
#: i zmienia szerokość (`teren_efekty.droga_kreta`), a teren dostaje rzeźbę —
#: pagórki na suchym, skarpy wysepek nad bagnem, groblę jako wał z cieniem
#: (`teren_efekty.rzezba`).
#: Runda 6 („drogi to rozmyte beżowe smugi — potrzebna utwardzona droga"):
#: bruk (`TEKSTURY`), szerszy i równiejszy trakt.
# Runda 9: obrzeże (`droga_obrzeze`) przygasza skraj jezdni, więc trakt
#: o pole szerszy w odczuciu — 0,56 zamiast 0,46.
DROGA_KRETA = {'szerokosc': 0.56, 'zmiennosc': 0.22, 'meander': 0.14}
RZEZBA = {'pagorki': 0.9, 'czolo': 0.7}

#: Runda 7: most nad Czarną Strugą w kadrze startu (`teren_efekty.mosty`).
#: Pola mostu są w grze drogą, w tle maluje się pod nimi woda.
MOSTY = [
    {'plik': 'bagno/most.png', 'pola': [(MOST_WSCH[0], MOST_WSCH[1]), (MOST_WSCH[2], MOST_WSCH[3])],
     'srodek': (MOST_WSCH[0] + 1.0, MOST_WSCH[1] + 0.62), 'szer': 3.3},
]


def TLO(rysunek):
    """Podmiany znaków tylko w TLE planszy (`render_mapa.ustaw`), runda 9.

    Werdykt rundy 8: „wokół gór w lewym dolnym rogu rozmyta, półprzezroczysta
    ciemna maska zamiast przejścia trawa–skała". Pod dużymi górami z `masywy`
    tło malowało skały teksturą ściółki z reliefem, a rysunek góry ma miękkie,
    omszałe podnóże — przez nie prześwitywała ciemna, rozmyta plama wystająca
    za górę. Jak w Heroes 3: góra stoi NA łące, więc pod pierwszym ekranem
    skały (`#`) są w tle łąką; w grze dalej są skałami. Tak samo las
    w kadrze: drzewa stoją na trawie, a nie na rozlanej plamie ściółki,
    której brzeg biegł schodkami kafli.
    """
    wynik = [list(w) for w in rysunek]
    for y in range(34, BOK):
        for x in range(0, 29):
            if wynik[y][x] in '#T':
                wynik[y][x] = '.'
            # Runda 11: trzęsawisko pierwszego ekranu nie idzie warstwą
            # `bagno` (maska kafli z ciemną obwódką), tylko `DOMALUJ` —
            # znak `m` nie należy do żadnej warstwy, więc pod nim jest łąka.
            elif wynik[y][x] == 'b':
                wynik[y][x] = 'm'
    # Staw górnego środka w grze sięga Strugi (pole pod skrzydłami wiatraka
    # zostaje nieprzejezdne — straż artefaktu); w tle to przesmyk łąki, więc
    # staw jest osobną, mętną wodą, a nie zatoką rzeki.
    for x, y in TLO_PRZESMYK:
        if wynik[y][x] == '~':
            wynik[y][x] = '.'
    # Runda 4 pętli (G4: „zamek wroga i wyspa stoją na tej samej jasnej łące
    # co dom"): grunt krainy wroga to ciemna, chłodna ziemia — warstwa `j`
    # z teksturą ciemnej trawy (`TEKSTURY`), zabarwioną na sino
    # (`BARWY_TERENU['jalowa']`), jak ciemna łąka krainy wroga na Polanie.
    for y in range(BOK):
        for x in range(BOK):
            if wynik[y][x] == '.' and strefa(x, y) == 'wroga':
                wynik[y][x] = 'j'
    # Runda 5 pętli (G3: „drzewa w równych poziomych szpalerach jak
    # plantacja"): klocki lasu to rzędy wierzb, a między rzędami prześwitywała
    # trawa jaśniejsza od łąki — jasne pasy co dwa–trzy pola. Poza pierwszym
    # ekranem pod lasem jest ciemna ściółka (`s`, barwa `BARWY_TERENU`):
    # rzędy zlewają się w jeden ciemny masyw.
    for y in range(BOK):
        for x in range(BOK):
            if wynik[y][x] == 'T':
                wynik[y][x] = 's'
            # Runda 8 pętli: pasma skał (`R8_SKALY`) stoją na ściółce lasu,
            # z którego wyrastają; poza krainą wroga grunt pod nimi nie może
            # mieć barwy płaskowyżu wroga (silnik daje skałom `j`).
            elif wynik[y][x] == '#' and strefa(x, y) != 'wroga':
                wynik[y][x] = 's'
    return [''.join(w) for w in wynik]


TLO_PRZESMYK = [(17, 40)]


#: Mokradła pierwszego ekranu (`DOMALUJ`): grunt, oczka i stawy.
MOKRADLA = {
    # Runda 12: grunt między oczkami to błoto z turzycą (`teren-bloto`) —
    # oliwkowe, o ton ciemniejsze od łąki, żeby łata czytała się jako
    # mokradło, a nie jako cień (łąka: nasycenie 0,5, jasność 0,78).
    'tekstura': 'bloto',
    'grunt': {'nasycenie': 0.9, 'barwa': (100, 125, 55), 'moc': 0.3, 'jasnosc': 1.75},
    # Ile pól planszy przypada na jedną teksturę gruntu.
    'pol_na_teksture': 4,
    # Jaką część wnętrza mokradła zajmują oczka wody, i najmniejsze oczko
    # (w polach powierzchni) — drobniejsze to już kropki, nie woda.
    'oczka': 0.55,
    'oczko_min': 0.22,
    # Torfowa woda oczek: barwa tafli (`_zabarw` zmarszczek `teren-woda-czarna`),
    # przyciemnienie w głębi, refleks
    # nieba, błoto brzegu (pas 2–3 px) i cień skarpy u górnego brzegu.
    'woda': {'barwa': {'nasycenie': 0.45, 'barwa': (124, 118, 76), 'moc': 0.6, 'jasnosc': 1.45},
             'glebia': 0.4, 'ciemniej': 0.3,
             'niebo': (176, 192, 186), 'refleks': 0.35, 'bloto': (96, 78, 46), 'cien': 0.5},
    # Stawy kadru: ta sama woda, szersza płycizna (brzeg maluje `brzeg_wody`).
    'staw': {'barwa': {'nasycenie': 0.45, 'barwa': (124, 118, 76), 'moc': 0.6, 'jasnosc': 1.55},
             'glebia': 0.9, 'ciemniej': 0.3,
             'niebo': (176, 192, 186), 'refleks': 0.35, 'bloto': (96, 78, 46), 'cien': 0.45},
}


def _pod_obiektami(fx0, fy0, W, H, kafel):
    """Piksele pod obiektami planszy (budowle i kopalnie z zapasem) — tam nie
    ma oczek: budowla stojąca w wodzie czytała się jak naklejka."""
    import re
    import numpy as np
    from pathlib import Path
    korzen = Path(__file__).resolve().parent.parent.parent
    src = (korzen / 'src' / 'data' / 'plansza-teren-bagna.ts').read_text(encoding='utf-8')
    blok = re.search(r'export const ROZSTAWIENIE.*?\n\];', src, re.S).group(0)
    m = np.zeros((H, W), bool)
    for r in re.finditer(r"\{ x: (\d+), y: (\d+), rodzaj: '([a-z-]+)'", blok):
        x, y, rodzaj = int(r.group(1)), int(r.group(2)), r.group(3)
        if rodzaj in ('budynek', 'kopalnia'):
            xs, ys = (x - 0.9, x + 1.9), (y - 0.8, y + 1.05)
        else:
            xs, ys = (x - 0.1, x + 1.1), (y - 0.1, y + 1.1)
        a0, a1 = int(max(0, (xs[0] - fx0) * kafel)), int(min(W, (xs[1] - fx0) * kafel))
        b0, b1 = int(max(0, (ys[0] - fy0) * kafel)), int(min(H, (ys[1] - fy0) * kafel))
        if a0 < a1 and b0 < b1:
            m[b0:b1, a0:a1] = True
    return m


def _maluj_wode(kaw, maska, kafel, ziarno, u, mul_brzeg=True):
    """Torfowa woda w `maska` (bool H × W) na `kaw` (float RGB): płycizna →
    głębia, zmarszczki z `teren-woda-czarna`, ukośne refleksy nieba, cień
    skarpy pod górnym brzegiem, jaśniejsza linia u dolnego; `mul_brzeg` —
    do tego pas mokrego błota 2–3 px wokół (oczka na mokradle; stawy mają
    już brzeg z `brzeg_wody`). Brzeg ostry: antyaliasing, nie rozmycie."""
    import numpy as np
    from PIL import Image
    from scipy.ndimage import binary_dilation, distance_transform_edt, gaussian_filter
    from teren_malowanie import kafelkuj, szum, tekstura
    if not maska.any():
        return kaw
    H, W = maska.shape
    # Tafla: zmarszczki `teren-woda-czarna` (to po nich oko poznaje wodę,
    # jak na Strudze) przemalowane na mętną, oliwkową toń; w głębi ciemniej.
    bok = int(kafel * 5)
    tafla = _zabarw(tekstura('woda-czarna').resize((bok, bok), Image.LANCZOS), u['barwa'])
    woda = np.asarray(kafelkuj(tafla, W, H, (ziarno % 97, ziarno % 61)), np.float32)
    glab = gaussian_filter(np.clip(distance_transform_edt(maska) / (kafel * u['glebia']), 0, 1), 2)[..., None]
    woda = woda * (1 - glab * u['ciemniej'])
    yy, xx = np.mgrid[0:H, 0:W]
    s = szum(W, H, max(2, int(kafel * 0.8)), ziarno)
    refleks = (np.clip(np.sin((xx * 0.8 - yy * 0.45) / (kafel * 0.5) + s * 3.0), 0, 1) ** 3
               * np.clip(s * 1.4 + 0.45, 0, 1) * np.clip(glab[..., 0] * 3, 0, 1))[..., None] * u['refleks']
    woda = woda * (1 - refleks) + np.array(u['niebo'], np.float32) * refleks
    # Cień skarpy: woda tuż pod lądem od góry (światło z góry, brzeg wyżej).
    d = max(2, int(kafel * 0.14))
    gora = maska & ~np.roll(maska, d, axis=0)
    cien = gaussian_filter(gora.astype(np.float32), 1.2)[..., None] * u['cien']
    woda = woda * (1 - cien)
    # Linia wilgoci u dolnego brzegu (odbicie jaśniejszego brzegu).
    dol = maska & ~np.roll(maska, -2, axis=0)
    jasny = gaussian_filter(dol.astype(np.float32), 0.8)[..., None] * 0.35
    woda = woda * (1 - jasny) + np.array(u['niebo'], np.float32) * jasny
    out = kaw.copy()
    if mul_brzeg:
        pas = binary_dilation(maska, iterations=3) & ~maska
        P = gaussian_filter(pas.astype(np.float32), 0.6)[..., None] * 0.85
        out = out * (1 - P) + np.array(u['bloto'], np.float32) * P
    Mw = gaussian_filter(maska.astype(np.float32), 0.6)[..., None]
    return out * (1 - Mw) + woda * Mw


#: Naklejki mokradła (PROMPTY-PLANSZE §22): plik we wsadzie → wysokość w tle
#: (pole ma 48 px; kamera pokazuje je w 2/3). Obiera i skaluje
#: `przygotuj_naklejki_mokradla` do `public/mapa/bagno/tlo-<nazwa>.png`.
NAKLEJKI_MOKRADLA = {
    'trzcinowisko-1': 60,
    'trzcinowisko-2': 50,
    'martwe-drzewo-3': 104,
    'powalony-pien': 50,
    # Runda 12 (PROMPTY-PLANSZE §23): szuwary bez podstawki i grążele.
    'szuwar-1': 54,
    'szuwar-2': 38,
    'szuwar-3': 44,
    'grazele': 30,
}


def _katalogi():
    from pathlib import Path
    korzen = Path(__file__).resolve().parent.parent.parent
    return korzen / 'tools' / 'wsad', korzen / 'public' / 'mapa' / 'bagno'


def przygotuj_naklejki_mokradla():
    """Wsad → `public/mapa/bagno/`: tekstura mokradła (768 px, jak inne
    tekstury) i naklejki przycięte do sylwetki i zmniejszone z alfą
    wmnożoną w barwę (bez ciemnej obwódki). Trzcinowisko 1 ma z API
    piaszczysty placek pod kępą — gaśnie, zostają źdźbła."""
    import numpy as np
    from PIL import Image
    wsad, cel = _katalogi()
    zrodlo = wsad / 'teren-mokradlo.png'
    if zrodlo.exists():
        Image.open(zrodlo).convert('RGB').resize((768, 768), Image.LANCZOS).save(cel / 'teren-mokradlo.png')
    for nazwa, wys in NAKLEJKI_MOKRADLA.items():
        f = wsad / f'bagno-{nazwa}.png'
        if not f.exists():
            continue
        im = Image.open(f).convert('RGBA')
        t = np.asarray(im).astype(np.float32)
        if nazwa == 'trzcinowisko-1':
            a = t[..., 3] > 20
            ys = np.where(a.any(1))[0]
            y0, y1 = ys[0], ys[-1]
            r, g, b = t[..., 0], t[..., 1], t[..., 2]
            piach = (np.arange(t.shape[0])[:, None] > y0 + 0.8 * (y1 - y0)) & (r > g + 8) & (r > b + 60)
            t[..., 3] = np.where(piach, 0, t[..., 3])
        if nazwa == 'trzcinowisko-2':
            # Z API: jasna, turkusowa woda pod kępą — na mokradle świeciła jak
            # biały placek. Przemalowana na mętną oliwkę.
            rgb, a = t[..., :3], t[..., 3]
            mx, mn = rgb.max(-1), rgb.min(-1)
            sat, lum = (mx - mn) / np.maximum(mx, 1), rgb.mean(-1)
            ys = np.where((a > 20).any(1))[0]
            dol = np.arange(t.shape[0])[:, None] > ys[0] + 0.7 * (ys[-1] - ys[0])
            woda = (a > 10) & dol & (sat < 0.3) & (lum < 205)
            nowa = np.stack([lum * 0.42 + 40, lum * 0.42 + 40, lum * 0.3 + 18], -1)
            t[..., :3] = np.where(woda[..., None], nowa, rgb)
        if nazwa == 'grazele':
            # Z API: kremowa „grubość" liścia (rant jak u talerzyka) wokół
            # kępy — zdjęta tam, gdzie styka się z tłem; kwiat zostaje.
            from scipy.ndimage import label
            rgb, a = t[..., :3], t[..., 3]
            mx, mn = rgb.max(-1), rgb.min(-1)
            krem = (a > 10) & (rgb.mean(-1) > 150) & ((mx - mn) / np.maximum(mx, 1) < 0.4)
            krem[220:520, 760:1200] = False
            tlo = a <= 10
            etyk, _ = label(krem | tlo)
            t[..., 3] = np.where(krem & np.isin(etyk, np.unique(etyk[tlo])), 0, a)
        if nazwa == 'szuwar-2':
            # Z API jaskrawo żółta — na mokradle świeciła jak kwiatek.
            rgb = t[..., :3]
            szary = rgb.mean(-1, keepdims=True)
            t[..., :3] = (szary + (rgb - szary) * 0.75) * np.array([0.82, 0.9, 0.8], np.float32)
        if nazwa.startswith('szuwar'):
            # Łodygi gasną u dołu (bez uciętej krawędzi i bez jasnej mgiełki
            # podstawy, którą API dokłada pod kępę).
            ys = np.where((t[..., 3] > 20).any(1))[0]
            y0, y1 = ys[0], ys[-1]
            yy = np.arange(t.shape[0], dtype=np.float32)[:, None]
            t[..., 3] *= np.clip((y1 - yy) / (0.16 * (y1 - y0)), 0, 1)
        im = Image.fromarray(t.astype(np.uint8), 'RGBA')
        im = im.crop(im.getchannel('A').point(lambda v: 255 if v > 12 else 0).getbbox())
        w = max(1, round(im.width * wys / im.height))
        t = np.asarray(im).astype(np.float32)
        a = t[..., 3:4] / 255.0
        t[..., :3] *= a
        m = np.asarray(Image.fromarray(t.astype(np.uint8), 'RGBA').resize((w, wys), Image.LANCZOS)).astype(np.float32)
        m[..., :3] = np.clip(m[..., :3] / np.clip(m[..., 3:4] / 255.0, 1e-3, 1), 0, 255)
        Image.fromarray(m.astype(np.uint8), 'RGBA').save(cel / f'tlo-{nazwa}.png')


#: Gdzie trzcina porasta brzegi wody (pola `x0, y0, x1, y1`) — pierwszy ekran.
KADR_TRZCINY = (3, 35, 26, 54)
#: Pole na pewno w korycie Strugi (rozpoznaje jej wodę wśród stawów).
STRUGA_PUNKT = (struga_x(47), 47)


def DOMALUJ(plansza, rysunek, kafel, droga=None, maska_wody=None):
    """Mokradła pierwszego ekranu (runda 11) — pola `m` z `TLO`.

    Jedna płachta mokradła o nieregularnym, OSTRYM brzegu (maska pól rozmyta
    i progowana z szumem, brzeg wygładzony o piksel — bez ciemnej obwódki
    w kształcie kafli, za którą przegraliśmy rundę 8): malowany grunt
    turzycy z oczkami mętnej, oliwkowo-brunatnej wody (`teren-mokradlo`),
    a na nim trzcinowiska, martwe drzewa i powalone pnie. Mokradło nie
    wchodzi na trakt ani na piaszczysty brzeg Strugi — kończy się przed nimi.
    """
    import numpy as np
    from PIL import Image
    from scipy.ndimage import distance_transform_edt, gaussian_filter
    from teren_malowanie import kafelkuj, szum, tekstura

    pola = np.array([[1.0 if c == 'm' else 0.0 for c in w] for w in rysunek], np.float32)
    if not pola.any():
        return plansza
    wsad, kat = _katalogi()
    if not (kat / 'teren-mokradlo.png').exists():
        przygotuj_naklejki_mokradla()
    ys, xs = np.nonzero(pola)
    fx0, fy0 = max(0, xs.min() - 2), max(0, ys.min() - 2)
    fx1, fy1 = min(pola.shape[1], xs.max() + 3), min(pola.shape[0], ys.max() + 3)
    X0, Y0, X1, Y1 = fx0 * kafel, fy0 * kafel, fx1 * kafel, fy1 * kafel
    W, H = X1 - X0, Y1 - Y0
    ziarno = ZIARNO + 1100

    # Obszar: pola rozciągnięte na piksele, rozmyte i progowane z szumem.
    p = Image.fromarray((pola[fy0:fy1, fx0:fx1] * 255).astype(np.uint8), 'L').resize((W, H), Image.BILINEAR)
    t = gaussian_filter(np.asarray(p, np.float32) / 255.0, kafel * 0.3)
    t += szum(W, H, max(2, int(kafel * 0.9)), ziarno) * 0.2 + szum(W, H, max(2, int(kafel * 0.3)), ziarno + 1) * 0.06
    obszar = t > 0.5
    if droga is not None:
        d = np.asarray(droga.convert('L'), np.float32)[Y0:Y1, X0:X1] > 90
        obszar &= distance_transform_edt(~d) > kafel * 0.16
    d_droga = distance_transform_edt(~d) if droga is not None else np.full((H, W), 1e9)
    d_woda = np.full((H, W), 1e9)
    if maska_wody is not None:
        w = np.asarray(maska_wody.convert('L'), np.float32)[Y0:Y1, X0:X1] > 127
        d_woda = distance_transform_edt(~w)
        obszar &= d_woda > kafel * (0.3 + 0.12 * szum(W, H, max(2, int(kafel * 0.7)), ziarno + 2))
    A = gaussian_filter(obszar.astype(np.float32), 0.7)[..., None]
    d_in = distance_transform_edt(obszar)

    # Runda 12 (werdykt r11: „rozlewiska to blade, zamazane plamy bez wody,
    # błota i szuwarów"): mokradło to nie tekstura z drobnymi kropkami,
    # tylko duże OCZKA ciemnej, torfowej wody (pół pola do dwóch pól)
    # między kępami turzycy — każde z ostrym brzegiem, pasem mokrego błota
    # i cieniem skarpy u górnego brzegu, jak woda w dołku. Grunt między
    # oczkami: błoto z turzycą (`teren-bloto`), oliwkowe, ciemniejsze od łąki.
    M = MOKRADLA
    stawy_kadru = None
    bok = int(kafel * M['pol_na_teksture'])
    tex = tekstura(M['tekstura']).resize((bok, bok), Image.LANCZOS)
    grunt = np.asarray(_zabarw(kafelkuj(tex, W, H, (-X0 + 17, -Y0 + 31)), M['grunt']), np.float32)

    tab = np.asarray(plansza.convert('RGB'), np.float32).copy()
    kaw = tab[Y0:Y1, X0:X1]
    kaw = kaw * (1 - A) + grunt * A

    # Oczka: szum w dwóch skalach, w głębi mokradła (nie przy łące), nie pod
    # obiektami. Próg z kwantyla — oczka zajmują `M['oczka']` wnętrza.
    wnetrze = obszar & (d_in > kafel * 0.32)
    wnetrze &= ~_pod_obiektami(fx0, fy0, W, H, kafel)
    n = szum(W, H, max(2, int(kafel * 1.05)), ziarno + 20) + 0.4 * szum(W, H, max(2, int(kafel * 0.42)), ziarno + 21)
    n += np.clip(d_in / kafel - 0.3, 0, 0.8) * 0.5
    oczka = np.zeros((H, W), bool)
    if wnetrze.any():
        prog = np.quantile(n[wnetrze], 1 - M['oczka'])
        oczka = wnetrze & (n > prog)
        oczka = gaussian_filter(oczka.astype(np.float32), 2.5) > 0.5
        from scipy.ndimage import label as _label
        etyk, ile = _label(oczka)
        rozm = np.bincount(etyk.ravel())
        oczka &= rozm[etyk] >= (kafel * kafel * M['oczko_min'])
    kaw = _maluj_wode(kaw, oczka, kafel, ziarno + 30, M['woda'], mul_brzeg=True)
    tab[Y0:Y1, X0:X1] = kaw
    kaw = tab[Y0:Y1, X0:X1]
    # Cienka ciemniejsza krawędź mokradła od strony łąki (1–2 px, nie pas).
    kraw = gaussian_filter((obszar & (d_in <= 2.0)).astype(np.float32), 0.6)[..., None]
    kaw = kaw * (1 - kraw * 0.18)
    # Stawy pierwszego ekranu (woda nie połączona ze Strugą): ta sama torfowa
    # woda co w oczkach — Struga zostaje łupkowa i płynie. Zdjęte z maski
    # wody (shader malowałby je barwą rzeki).
    if maska_wody is not None:
        from scipy.ndimage import label
        mw = np.asarray(maska_wody.convert('L'), np.float32)[Y0:Y1, X0:X1] / 255.0
        etyk, _ = label(mw > 0.05)
        rx, ry = STRUGA_PUNKT
        struga = etyk[int((ry + 0.5) * kafel) - Y0, int((rx + 0.5) * kafel) - X0]
        fx0k, fy0k, fx1k, fy1k = KADR_TRZCINY
        stawy = np.zeros_like(mw, bool)
        stawy_kadru = stawy
        for e in set(np.unique(etyk)) - {0, struga}:
            yy, xx = np.nonzero(etyk == e)
            if fx0k * kafel <= xx.min() + X0 and xx.max() + X0 < fx1k * kafel and fy0k * kafel <= yy.min() + Y0:
                stawy |= etyk == e
        # Tylko piksele wody (niebieskawe): grążele i pnie z `NAKLEJKI` leżą
        # już na tafli i mają zostać zielone i brązowe.
        niebieskie = np.clip((kaw[..., 2] - kaw[..., 0] - 2) / 14, 0, 1)
        S = (mw * stawy * niebieskie)[..., None]
        metna = _maluj_wode(kaw.copy(), stawy, kafel, ziarno + 40, M['staw'], mul_brzeg=False)
        kaw = kaw * (1 - S) + metna * S
        zdejmij = Image.fromarray((stawy * 255).astype(np.uint8), 'L')
        maska_wody.paste(0, (X0, Y0), zdejmij)
    tab[Y0:Y1, X0:X1] = kaw
    im = Image.fromarray(tab.clip(0, 255).astype(np.uint8), 'RGB').convert('RGBA')

    def wczytaj(n, skala=1.0):
        f = kat / f'tlo-{n}.png'
        if not f.exists():
            f = kat.parent / 'tlo' / f'{n}.png'
        if not f.exists():
            return None
        o = Image.open(f).convert('RGBA')
        if skala != 1.0:
            o = o.resize((max(1, int(o.width * skala)), max(1, int(o.height * skala))), Image.LANCZOS)
        return o

    rng = np.random.default_rng(ziarno + 5)
    # Runda 12: bez `trzcinowisko-2` i `kepa-turzycy` — mają z API okrągłą
    # podstawkę (placek wody/ziemi pod kępą), która na mokradle wyglądała
    # jak naklejka na talerzyku.
    duze = [x for x in (wczytaj('trzcinowisko-1'), wczytaj('trzcinowisko-1', 0.8), wczytaj('szuwar-3'),
                        wczytaj('szuwar-3', 0.85)) if x]
    drzewa = [x for x in (wczytaj('martwe-drzewo-3'), wczytaj('powalony-pien')) if x]
    male = [x for x in (wczytaj('szuwar-1'), wczytaj('szuwar-1', 0.8), wczytaj('szuwar-2'), wczytaj('szuwar-2', 0.8),
                        wczytaj('trzcina-1', 1.25), wczytaj('trzcina-3', 1.3), wczytaj('irysy', 1.1)) if x]
    na_wodzie = [x for x in (wczytaj('grazele'), wczytaj('grazele', 0.75), wczytaj('grazel-1', 1.1),
                             wczytaj('grazel-2', 1.1), wczytaj('pien-zatopiony', 1.1)) if x]
    naklejki = []
    postawione = []

    def wolne(y, x, r):
        return all((y - a) ** 2 + (x - b) ** 2 >= (r + rb) ** 2 for a, b, rb in postawione)

    def postaw(py, px, n, r, dy=0):
        postawione.append((py, px, r))
        naklejki.append((py + dy, px, n))

    d_oczko = distance_transform_edt(~oczka) if oczka.any() else np.full((H, W), 1e9)
    w_oczku = distance_transform_edt(oczka) if oczka.any() else np.zeros((H, W))
    # Martwe drzewa i powalone pnie: na lądzie mokradła, rzadko.
    pola_m = [(fy, fx) for fy in range(fy0, fy1) for fx in range(fx0, fx1) if pola[fy, fx] >= 1]
    for fy, fx in pola_m:
        if not drzewa or rng.random() > 0.12:
            continue
        px = int((fx + rng.uniform(0.1, 0.9)) * kafel) - X0
        py = int((fy + rng.uniform(0.4, 1.0)) * kafel) - Y0
        n = drzewa[int(rng.integers(0, len(drzewa)))]
        if not (0 <= px < W and 0 <= py < H) or d_in[py, px] < 4 or oczka[py, px] or not wolne(py, px, kafel):
            continue
        if d_droga[py, px] < n.width * 0.5 + kafel * 0.1:
            continue
        postaw(py, px, n, kafel)
    # Szuwar na brzegach oczek (po stronie lądu) — to on mówi „tu jest woda".
    rant = np.argwhere(obszar & ~oczka & (d_oczko > 2) & (d_oczko < kafel * 0.22) & (d_in > 4))
    for i in rng.permutation(len(rant)):
        py, px = rant[i]
        if rng.random() > 0.15:
            continue
        n = (duze + male)[int(rng.integers(0, len(duze) + len(male)))]
        if d_droga[py, px] < n.width * 0.5 + kafel * 0.1 or not wolne(py, px, kafel * 0.42):
            continue
        postaw(py, px, n, kafel * 0.42, int(kafel * 0.1))
    # Grążele i zatopione pnie na oczkach.
    tafla = np.argwhere(oczka & (w_oczku > kafel * 0.16))
    if stawy_kadru is not None:
        w_stawie = distance_transform_edt(stawy_kadru)
        tafla = np.concatenate([tafla, np.argwhere(stawy_kadru & (w_stawie > kafel * 0.35))])
    for i in rng.permutation(len(tafla)):
        py, px = tafla[i]
        if not na_wodzie or rng.random() > 0.2:
            continue
        if not wolne(py, px, kafel * 0.55):
            continue
        postaw(py, px, na_wodzie[int(rng.integers(0, len(na_wodzie)))], kafel * 0.55, int(kafel * 0.2))
    # Reszta lądu mokradła: pojedyncze kępy.
    for fy, fx in pola_m:
        if not male or rng.random() > 0.35:
            continue
        px = int((fx + rng.uniform(0.1, 0.9)) * kafel) - X0
        py = int((fy + rng.uniform(0.4, 1.0)) * kafel) - Y0
        n = male[int(rng.integers(0, len(male)))]
        if not (0 <= px < W and 0 <= py < H) or d_in[py, px] < 4 or oczka[py, px]:
            continue
        if d_droga[py, px] < n.width * 0.5 + kafel * 0.1 or not wolne(py, px, kafel * 0.45):
            continue
        postaw(py, px, n, kafel * 0.45)
    # Trzcina na brzegach Strugi i stawów pierwszego ekranu (runda 10: „brak
    # trzcin") — kępy co półtora pola po stronie lądu, z dala od traktu.
    fx0k, fy0k, fx1k, fy1k = KADR_TRZCINY
    brzeg = np.argwhere((d_woda > kafel * 0.12) & (d_woda < kafel * 0.3) & (d_droga > kafel * 0.9))
    for i in rng.permutation(len(brzeg)):
        py, px = brzeg[i]
        fx, fy = (px + X0) / kafel, (py + Y0) / kafel
        if not (fx0k <= fx < fx1k and fy0k <= fy < fy1k) or rng.random() > 0.3:
            continue
        n = (duze + male[:3])[int(rng.integers(0, len(duze) + 3))]
        r = kafel * 0.6
        if not wolne(py, px, r):
            continue
        postaw(py, px, n, r, int(kafel * 0.15))
    naklejki.sort(key=lambda t: t[0])
    for py, px, n in naklejki:
        if rng.random() < 0.5:
            n = n.transpose(Image.FLIP_LEFT_RIGHT)
        im.alpha_composite(n, (max(0, X0 + px - n.width // 2), max(0, Y0 + py - n.height + int(n.height * 0.1))))
    return im


def _zabarw(im, u):
    import numpy as np
    from PIL import Image
    tab = np.asarray(im.convert('RGB'), dtype=np.float32)
    szary = tab.mean(axis=2, keepdims=True)
    tab = szary + (tab - szary) * u.get('nasycenie', 1.0)
    b = np.array(u.get('barwa', (128, 128, 128)), dtype=np.float32)
    mnoznik = 1 + (b / b.mean() - 1) * u.get('moc', 0.0)
    tab = (tab * mnoznik[None, None, :] * u.get('jasnosc', 1.0)).clip(0, 255)
    return Image.fromarray(tab.astype(np.uint8), 'RGB')
