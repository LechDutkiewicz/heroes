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
            if mapa[y][x] != 'b' or rng.random() > 0.025:
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
    for y in range(50, BOK):
        for x in range(18, struga_x(y) - 1):
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
        for x in range(0, min(BOK, cx + 7)):
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
    g.dodaj(2, 'dom', (7, 30), lambda p: ('potwor', 'slaby'))
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

    # Straże przepraw przez Strugę. Obie średnie: pierwszy tydzień w dolinie
    # jest bezpieczny, a wyjście z niej to pierwsza poważna bitwa.
    g.postaw((GROBLA_PN[0], struga_y(12)), ('potwor', 'sredni'))
    # Straż mostu na wschodnim przyczółku (jak na Polanie): potwór blokuje
    # pole i osiem wokół, więc zamyka most, a nie stoi na deskach.
    g.postaw((MOST_WSCH[2] + 1, MOST_WSCH[1]), ('potwor', 'sredni'))
    # Runda 9: prawy dół kadru za mostem był pustą łąką — wieża obserwacyjna
    # na brzegu Strugi (za strażą mostu, jak nagroda za pierwszą bitwę)
    # i skrzynia pod lasem.
    for pole, wpis in (((21, 49), ('budynek', 'wieza-obserwacyjna')), ((22, 46), ('skrzynia', None))):
        try:
            g.postaw(pole, wpis)
        except SystemExit as e:
            print(f'  kadr za mostem: {e}')

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
    'odkryte': [
        {'x': WYSPA[0], 'y': WYSPA[1], 'promien': 7},
        # Runda 6: rogi pierwszego ekranu za Strugą — bez nich mgła rysowała
        # w kadrze czarne zęby (jak na Polanie).
        {'x': 25, 'y': 35, 'promien': 3},
        {'x': 25, 'y': 53, 'promien': 3},
        # Runda 7: górne rogi kadru (za mostem i nad wzgórzami) — ciemna plama
        # mgły w prawym górnym rogu czytała się jak pusta połać.
        {'x': 22, 'y': 38, 'promien': 3},
        {'x': 4, 'y': 37, 'promien': 3},
        # Runda 8: lewy skraj kadru pod pasmami gór (lewy dolny róg i pas
        # nad wiatrakiem) — czarne zęby mgły ucinały góry w pół.
        {'x': 2, 'y': 52, 'promien': 3},
        {'x': 2, 'y': 40, 'promien': 4},
        # Runda 9: prawy skraj kadru za Strugą (miękki brzeg mgły kładł
        # ciemny klin na łące przy ramie).
        {'x': 26, 'y': 44, 'promien': 4},
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
        {'plik': 'gora-10', 'x': 5.3, 'y': 54.15, 'szer': 8.0, 'pokrywa': [4, 50, 8, 53]},
        # Runda 9: węższa i w lewo — prawe zbocze wchodziło na Strugę
        # i rzeka płynęła „pod górą".
        {'plik': 'gora-9', 'x': 17.1, 'y': 54.15, 'szer': 5.6, 'pokrywa': [15, 50, 18, 53]},
    ],
    # Runda 6 (HotA: „obiekty interaktywne są mniejsze od drzew i krzaków,
    # bez cienia, konturu i kontrastu"): budowle większe i obrys wokół
    # wszystkiego, co da się odwiedzić albo podnieść.
    # Runda 9 („niespójna skala: domki wielkości drzew, zamek wielkości
    # chaty"): budowle o ton mniejsze, zamek o jedną trzecią większy — zamek
    # ma być największą budowlą w kadrze, jak miasto na mapie Heroes 3.
    'skalaBudowli': 1.05,
    'skalaZamku': 1.35,
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
    'trawa': {'nasycenie': 0.5, 'barwa': (100, 140, 112), 'moc': 0.55, 'jasnosc': 0.78},
    'las': {'nasycenie': 0.7, 'barwa': (90, 110, 75), 'moc': 0.4, 'jasnosc': 0.82},
    # Runda 8 („rozjaśnić teren"): błoto trzęsawiska o ton jaśniejsze
    # i cieplejsze — czarnobrunatne łaty przy dolinie czytały się jak dziury.
    'bagno': {'nasycenie': 0.95, 'barwa': (130, 118, 80), 'moc': 0.2, 'jasnosc': 1.18},
    # Bruk grobli (runda 6): prawie bez zmian, lekko ciepły.
    # Runda 9: bez jaśniejszej jezdni z `obwodka_drogi` bruk jaśniejszy tu.
    'sciezka': {'nasycenie': 0.8, 'barwa': (160, 145, 120), 'moc': 0.2, 'jasnosc': 1.32},
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
            'skaly': ['las']}

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
    return [''.join(w) for w in wynik]


#: Mokradła pierwszego ekranu (`DOMALUJ`): barwy błota i mętnej wody oczek.
MOKRADLA = {
    'bloto': {'nasycenie': 0.75, 'barwa': (150, 132, 62), 'moc': 0.55, 'jasnosc': 0.9},
    'woda': {'nasycenie': 0.85, 'barwa': (128, 112, 64), 'moc': 0.55, 'jasnosc': 0.9},
    'linia': (44, 36, 20),
    'rant': (150, 128, 82),
}


def DOMALUJ(plansza, rysunek, kafel, droga=None, maska_wody=None):
    """Mokradła pierwszego ekranu (runda 11) — pola `m` z `TLO`.

    Jedna płachta błota o nieregularnym, OSTRYM brzegu (maska pól rozmyta
    i progowana z szumem, brzeg wygładzony o piksel — bez ciemnej obwódki
    w kształcie kafli), w niej oczka mętnej, oliwkowo-brunatnej wody z ciemną
    mokrą linią i jaśniejszym rantem, a na brzegach oczek trzcina, turzyca,
    martwe drzewa, pnie i kłody. Błoto nie wchodzi na trakt ani na piaszczysty
    brzeg Strugi — kończy się przed nimi.
    """
    import numpy as np
    from PIL import Image
    from scipy.ndimage import distance_transform_edt, gaussian_filter
    import teren_efekty
    from teren_malowanie import kafelkuj, szum, tekstura

    pola = np.array([[1.0 if c == 'm' else 0.0 for c in w] for w in rysunek], np.float32)
    if not pola.any():
        return plansza
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
    if maska_wody is not None:
        w = np.asarray(maska_wody.convert('L'), np.float32)[Y0:Y1, X0:X1] > 127
        obszar &= distance_transform_edt(~w) > kafel * (0.3 + 0.12 * szum(W, H, max(2, int(kafel * 0.7)), ziarno + 2))
    else:
        w = np.zeros((H, W), bool)
    A = gaussian_filter(obszar.astype(np.float32), 0.7)

    # Oczka: szum progowany, tylko w głębi obszaru.
    d_in = distance_transform_edt(obszar)
    n = szum(W, H, max(2, int(kafel * 1.2)), ziarno + 3) * 0.7 + szum(W, H, max(2, int(kafel * 0.4)), ziarno + 4) * 0.3
    oczka = (n > 0.05) & (d_in > kafel * 0.22)
    d_oczko = distance_transform_edt(oczka)
    d_od_oczka = distance_transform_edt(~oczka)
    O = gaussian_filter(oczka.astype(np.float32), 0.7)

    zabarw = lambda im, u: _zabarw(im, u)
    # Grunt mokradła to ta sama malowana łąka, przygaszona do oliwkowej
    # turzycy — jedna rodzina tekstur, tylko wilgotniejsza i cieplejsza.
    bloto = np.asarray(zabarw(plansza.convert('RGB').crop((X0, Y0, X1, Y1)), MOKRADLA['bloto']), np.float32)
    woda = np.asarray(zabarw(kafelkuj(tekstura('woda-bagno'), W, H, (-X0, -Y0)), MOKRADLA['woda']), np.float32)
    # Głębia oczka: ciemniej w środku.
    glab = np.clip(d_oczko / (kafel * 0.45), 0, 1)[..., None]
    woda = woda * (1 - glab * 0.3)

    tab = np.asarray(plansza.convert('RGB'), np.float32).copy()
    kaw = tab[Y0:Y1, X0:X1]
    # Błoto na obszarze, ostro.
    kaw = kaw * (1 - A[..., None]) + bloto * A[..., None]
    # Cienka ciemniejsza krawędź błota od strony łąki (1–2 px, nie pas).
    kraw = gaussian_filter((obszar & (d_in <= 2.0)).astype(np.float32), 0.6)[..., None]
    kaw = kaw * (1 - kraw * 0.12)
    # Rant wokół oczka: pas jaśniejszego, mokrego błota.
    rant = gaussian_filter(((~oczka) & (d_od_oczka <= kafel * 0.08) & obszar).astype(np.float32), 0.6)[..., None]
    kaw = kaw * (1 - rant * 0.5) + np.array(MOKRADLA['rant'], np.float32) * rant * 0.5
    kaw = kaw * (1 - O[..., None]) + woda * O[..., None]
    mokra = gaussian_filter((oczka & (d_oczko <= max(2.0, kafel * 0.05))).astype(np.float32), 0.6)[..., None]
    kaw = kaw * (1 - mokra * 0.75) + np.array(MOKRADLA['linia'], np.float32) * mokra * 0.75
    # Refleks nieba przy dolnym brzegu oczka.
    dol = oczka & ~np.roll(oczka, -max(2, kafel // 12), axis=0)
    ref = gaussian_filter(dol.astype(np.float32), 0.8)[..., None]
    kaw = kaw + (np.array([200, 204, 168], np.float32) - kaw) * ref * 0.25
    tab[Y0:Y1, X0:X1] = kaw
    im = Image.fromarray(tab.clip(0, 255).astype(np.uint8), 'RGB').convert('RGBA')

    # Naklejki: trzcina i turzyca na brzegach oczek, martwe drzewa, pnie, kłody.
    from pathlib import Path
    kat = Path(__file__).resolve().parent.parent.parent / 'public' / 'mapa' / 'tlo'

    def wczytaj(n, skala=1.0):
        f = kat / f'{n}.png'
        if not f.exists():
            return None
        o = Image.open(f).convert('RGBA')
        if skala != 1.0:
            o = o.resize((max(1, int(o.width * skala)), max(1, int(o.height * skala))), Image.LANCZOS)
        return o

    rng = np.random.default_rng(ziarno + 5)
    trzciny = [x for x in (wczytaj('trzcina-1', 1.3), wczytaj('trzcina-2', 1.3), wczytaj('trzcina-3', 1.3),
                           wczytaj('kepa-turzycy', 1.2)) if x]
    na_wodzie = [x for x in (wczytaj('pien-zatopiony', 1.2), wczytaj('grazel-1'), wczytaj('grazel-2'),
                             wczytaj('kepa-turzycy', 1.1)) if x]
    na_blocie = [x for x in (wczytaj('martwe-drzewo-1', 1.25), wczytaj('martwe-drzewo-2', 1.25),
                             wczytaj('pniak-bagienny', 1.15), wczytaj('kloda-mech', 1.2), wczytaj('irysy', 1.1)) if x]
    naklejki = []
    # Trzcina na brzegach oczek.
    brzeg = np.argwhere(oczka & (d_oczko <= 2) & (d_in > kafel * 0.3))
    ile = int(pola[fy0:fy1, fx0:fx1].sum() * 0.4)
    postawione = []
    for i in rng.permutation(len(brzeg)):
        if len(postawione) >= ile:
            break
        y, x = brzeg[i]
        if any((y - a) ** 2 + (x - b) ** 2 < (kafel * 0.75) ** 2 for a, b in postawione):
            continue
        postawione.append((y, x))
        naklejki.append((y, x, trzciny[int(rng.integers(0, len(trzciny)))]))
    # Na wodzie i na błocie — po polu.
    for fy in range(fy0, fy1):
        for fx in range(fx0, fx1):
            if pola[fy, fx] < 1:
                continue
            for _ in range(2):
                px = int((fx + rng.uniform(0.15, 0.85)) * kafel) - X0
                py = int((fy + rng.uniform(0.3, 0.95)) * kafel) - Y0
                los = rng.random()
                if not (0 <= px < W and 0 <= py < H) or not obszar[py, px]:
                    continue
                if oczka[py, px] and d_oczko[py, px] > kafel * 0.15:
                    if los < 0.22:
                        naklejki.append((py, px, na_wodzie[int(rng.integers(0, len(na_wodzie)))]))
                elif not oczka[py, px] and d_in[py, px] > kafel * 0.25:
                    if los < 0.2:
                        naklejki.append((py, px, na_blocie[int(rng.integers(0, len(na_blocie)))]))
    naklejki.sort(key=lambda t: t[0])
    for py, px, n in naklejki:
        if rng.random() < 0.5:
            n = n.transpose(Image.FLIP_LEFT_RIGHT)
        im.alpha_composite(n, (max(0, X0 + px - n.width // 2), max(0, Y0 + py - n.height + int(n.height * 0.12))))
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
