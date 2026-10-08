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

Czego tu celowo NIE ma: strażnic z kluczem ani portali. Każda z tych rzeczy
to osobna zasada do nauczenia, a pierwsza misja ma nauczyć jednej pętli, nie
siedmiu. Straże są łagodne, drogi wyraźne, a kopalnie podstawowe stoją przy
zamku bez straży. Jest za to JEDNA chata jasnowidza przy rozstajach za mostem
(checklista F2: obiekt, który każe wrócić) — prosi o kamienie, które leżą
w krainie wroga.

Runda 12 (checklista HoMM3, werdykt r1: 6 × NIE). Łuk trudności: most ze
słabą strażą (pierwsza lekcja) → bród ze średnią (druga) → przełęcz na trakcie
pod fortem z SILNĄ strażą, a fort jako ostatnia bitwa. Straże stoją tylko
w szyjkach (przełęcz północna doliny, most, bród, przełęcz fortu, wejścia do
kieszeni) — żadnej przy pojedynczej skrzyni na łące. Kraina wroga to cały
brzeg za rzeką na północ od pasa lasu w wierszach 15–17: ma inny grunt
(`j`, w tle ciemna, chłodna łąka — `TLO`) i swoje nagrody za brodem.

Runda 13 (werdykt r2: 15 TAK / 13 CZĘŚCIOWO / 2 NIE). Każda straż stoi
w szyjce albo na przeprawie (przełęcz doliny, most, łacha brodu, przełęcz
fortu, plaża, róg NE) — obie kopalnie złota siedzą w kieszeniach za strażą,
a nie na łące pod luźną strażą. Ekran startowy ma 14 obiektów (z zamkiem).
Kraina wroga jest obwiedziona rzeką i skałami (las za rzeką na północ od
granicy to skała), a w środku ma uschłe drzewa (`NAKLEJKI_KLOCKI`). Góry
stoją na łące (`TLO`), bez plam ubitej ziemi pod klockami.

Runda 14 (werdykt r3: 19 TAK / 10 CZĘŚCIOWO / 1 NIE — G1). Dolina domu ma
DWA wyjścia: most i przełęcz północną. Kieszeń za rzeką na południu straciła
rough, straż i stos — pas ubitej ziemi wzdłuż brzegu ze strażą na nim czytał
się jako trzeci, piaszczysty bród. Ekran startowy: 10 obiektów z zamkiem,
2 straże. Północna przeprawa to drugi MOST (`MOSTY`), a jej straż stoi na
suchym, wschodnim brzegu; straż plaży i straż mostu mają ściany lasu po obu
stronach. Kopalnie gracza bez dubla kamienia: kamieniołom, sad, jaskinia
odłamków w kieszeni, sad na północnej łące, złoto na plaży.
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
    # Runda 7 (HotA): „wzgórza w prawym dolnym rogu to klony zielonych kopców,
    # złamać to drugim terenem (skalisty rough) na wschodnim brzegu". Ściana
    # gór odsunięta pod prawą krawędź kadru (kolumny 22–24): kieszeń za
    # rzeką jest dwa razy większa i ma dno z ubitej, kamienistej ziemi
    # (`KIESZEN_ROUGH`), a nie trzy kopce zachodzące na skrzynię i ognisko.
    (22, 30, 24, 31),
    (22, 32, 24, 33),
    (22, 34, 24, 35),
]

#: Runda 7: dno kieszeni za rzeką (x0, y0, x1, y1) — „rough" z HotA,
#: pomarańczowobrązowa ziemia z kamieniami (`teren-ziemia`) od brzegu po
#: ścianę gór, z językiem wychodzącym korytarzem wzdłuż brzegu.
KIESZEN_ROUGH = (17, 30, 21, 35)

#: Runda 6: ubita ziemia (`j`, tekstura `teren-ziemia`) pod skarpami pasm
#: i na dnie kieszeni za rzeką — przejście terenu zamiast jednolitej zieleni.
ZIEMIA = [
    # Runda 13 (E3, F1): pas ubitej ziemi u stóp zachodniego pasma (3–12, 27)
    # odpadł — na ekranie czytał się jak polna droga na zachód od zamku,
    # która urywa się na skraju mapy. Góra stoi na łące (patrz `TLO`).
    # Runda 14 (A1, E3): język rough wzdłuż brzegu (17, 27–29) i dno kieszeni
    # też odpadły — plama 4 × 6 nie wyznaczała granicy, a ze strażą na niej
    # czytała się jak piaszczysty bród, trzecie wyjście z doliny.
]

#: Runda 9: zwarte masywy lasu w górnej połowie pierwszego ekranu
#: (x0, y0, x1, y1). Szerokości i wiersze dobrane pod kępy 3 × 2 sceny
#: (kępa zaczyna się od lewego górnego pola i skanuje od góry).
LAS_KADRU = [
    (0, 17, 7, 20),
    (8, 18, 8, 20),
    (16, 18, 18, 21),
    (22, 17, 26, 18),
    (22, 19, 26, 22),
    # Runda 14 (G1): ślepy przesmyk nad wieżą (19–21, 18–22) ze skrzynią na
    # końcu zarasta — jedna rzecz mniej na ekranie startu, a las nad wieżą
    # jest jedną bryłą od rzeki po wschodni masyw.
    (19, 18, 21, 21),
]

#: Runda 9: przesmyk na północ przez las na drugim brzegu (kolumny 19–21).
#: Runda 14: zamknięty (patrz `LAS_KADRU`).
PRZESMYK = []

#: Most (runda 4). Pola pod nim są w grze DROGĄ, a render maluje pod nimi
#: nieprzerwaną wodę i kładzie na niej rysunek mostu (`MOSTY` niżej). Piaszczysty
#: bród w tym miejscu czytał się jak łacha, na której rzeka się urywa.
MOST = (14, 25, 15, 25)
#: Runda 12 (C4): bród dokładnie tak szeroki jak koryto (trzy pola), straż
#: na środku piasku zamyka go w całości — przy pięciu polach wschodni skraj
#: wyglądał na przejście bokiem.
#: Runda 13 (D4): bród ma JEDEN wiersz — ten, w którym droga przechodzi
#: przez rzekę. Dwa wiersze piasku (7–8) z drogą na dolnym czytały się jak
#: rzeka, która się urywa; jedna łacha w poprzek koryta to przeprawa.
#: Runda 14 (D4): na tych polach leży rysunek DRUGIEGO mostu (`MOSTY`) —
#: łacha piasku z drogą czytała się jak „droga wchodzi w wodę".
BROD_POLNOCNY = (rzeka_x(8) - 1, 8, rzeka_x(8) + 1, 8)

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
    # Runda 13 (G2): przyczółek o pole dalej — straż mostu stoi na (17, 25),
    # poza deskami (rysunek mostu sięga do 16,7), a nie na ich końcu.
    'brod wschod': (18, 25),
    # Runda 12 (D4): do brodu prowadzi droga — z północnej łąki przez piasek
    # pod fort. Punkty stoją na brzegach, nie na brodzie: kwadrat 3 × 3 wokół
    # punktu na brodzie wyciąłby wodę w wierszu 6 i straż dałoby się obejść.
    'brod polnocny zachod': (18, 8),
    'brod polnocny wschod': (24, 8),
    'wschodnia laka': (27, 23),
    'zamek wroga': (30, 13),
    # Runda 12 (F1): południowa odnoga kończy się na skrzyni, nie w lesie.
    'poludniowy wschod': (30, 28),
}

#: Drogi. Główna prowadzi z zamku przez południowy bród pod sam fort — gracz,
#: który nie wie jeszcze nic, ma iść po drodze i dojść tam, gdzie trzeba.
#: Druga pętla: północna łąka → bród → fort (runda 12).
SZLAKI = [
    ['zamek gracza', 'start', 'brod zachod', 'brod wschod', 'wschodnia laka', 'zamek wroga'],
    ['brod zachod', 'polnocna laka', 'brod polnocny zachod', 'brod polnocny wschod', 'zamek wroga'],
    ['wschodnia laka', 'poludniowy wschod'],
]

#: Runda 12: granica krainy wroga — wiersz, do którego (włącznie) sięga za
#: rzeką. Niżej biegnie pas lasu `LAS_GRANICY` z jedną przełęczą na trakcie.
GRANICA_WROGA = 17

#: Runda 12: ściany lasu, które robią z otwartej łąki SZYJKI (x0, y0, x1, y1).
LAS_GRANICY = [
    # Przełęcz fortu: trakt (kolumna 30) między masywem skał (27–29, 14–18)
    # a lasem po prawej — jedyne wejście do krainy wroga od południa.
    (31, 15, 35, 17),
    # …i ściana lasu w wierszu 17 na zachód od masywu: bez niej droga
    # i bohater przeciskali się skosem między drzewem (26,18) a skałą (27,17).
    (22, 17, 26, 17),
    # Korytarz wzdłuż brzegu na północ od polany strażnicy: zamknięty, żeby
    # przesmyk (21, 19–22) był ślepą odnogą ze skrzynią, nie obejściem straży.
    (17, 16, 21, 17),
    # Przełęcz północna doliny domu: las po obu stronach traktu (kolumna 8)
    # w wierszu 16 — tędy wychodzi się z doliny na północną łąkę.
    (2, 16, 7, 16), (9, 16, 14, 16),
    # Runda 13 (C4, A4): łąka pod przełęczą (10–13, 17–18) zarasta — pod
    # szczeliną zostaje sam trakt z kolumn 8–10, a straż stoi NA nim.
    (10, 17, 13, 17), (11, 18, 12, 18),
    # Plaża nad jeziorem (8–13, 2–5): kieszeń z jednym wejściem (12, 6).
    # Runda 14 (C1): ściany po obu stronach wejścia mają DWA wiersze (kępa
    # lasu 3 × 2) — pojedynczy rząd drzew czytał się jak otwarta łąka,
    # a straż „stała na łące między jeziorem a fabryką". Szyjka to
    # `SZYJKA_PLAZY`, straż w niej.
    (14, 4, 16, 4), (14, 5, 17, 5), (9, 6, 11, 7), (13, 6, 16, 7),
    # Runda 14 (C4): brzeg nad mostem (14–19, 22–24) zarasta — łąka za
    # przyczółkiem wyglądała na obejście straży mostu wzdłuż rzeki.
    (14, 22, 17, 24), (18, 24, 19, 24),
]

#: Runda 14 (C1): szyjka plaży — jedno pole szerokości, trzy w głąb.
SZYJKA_PLAZY = [(12, 6), (12, 7), (12, 8)]

#: Runda 12 (E3): luźne plamy skał po 2–4 pola, które niczego nie obrysowują
#: (x0, y0, x1, y1) — zostają tylko pasma i masywy.
PLAMY_SKAL = [(11, 9, 14, 17), (22, 9, 26, 16)]

#: Straże w szyjkach (runda 12). Każda zamyka przejście albo kieszeń;
#: potwór blokuje pole i osiem wokół.
STRAZ_PRZELECZY_DOMU = (9, 17)      # na trakcie tuż pod szczeliną wiersza 16
STRAZ_PLAZY = (12, 7)               # szyjka plaży, między ścianami lasu
# Runda 14 (D4, G2): straż mostu północnego na SUCHYM wschodnim brzegu, na
# trakcie; jej dziewięć pól zamyka całe zejście z mostu (w wierszach 7 i 9
# po obu stronach jest woda). Na łasze stała w korycie rzeki.
STRAZ_BRODU = (rzeka_x(8) + 2, 8)
STRAZ_PRZELECZY_FORTU = (30, 16)    # na trakcie między skałami a lasem
STRAZ_ROGU = (31, 5)                # przesmyk do rogu NE (31–35, 1–5)

#: Pola plaży i rogu NE — zajęte od początku, żeby losowanie nic tam nie dosypało.
PLAZA = [(x, y) for y in range(2, 6) for x in range(8, 14)]
ROG_NE = [(x, y) for y in range(0, 6) for x in range(29, 36)]

#: Obiekty mogą stać na trawie i piasku (jak na Dwóch Dolinach).
POD_OBIEKTY = '.,j'


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
    # Runda 7: kępa lasu tuż za zachodnim pasmem (wiersz 22) wystawała
    # koronami nad grań — drzewa stały na szczycie skał.
    for x in range(7, 12):
        if mapa[22][x] == 'T':
            mapa[22][x] = '.'
    # Runda 9 (werdykt rundy 8: „łąki w lewej górnej i prawej górnej
    # ćwiartce to pusta, płaska zieleń z rozsypanymi znacznikami — brakuje
    # zwartych masywów lasu, które wyznaczałyby korytarze"). Trzy masywy
    # (`LAS_KADRU`): na zachodzie las od krawędzi mapy do traktu — trakt na
    # północ idzie wąwozem między lasem a rzeką; na drugim brzegu las nad
    # polaną strażnicy i ściana lasu od wschodu, a między nimi przesmyk na
    # północ (kolumny 20–21).
    for x0, y0, x1, y1 in LAS_KADRU:
        for y in range(y0, y1 + 1):
            for x in range(x0, x1 + 1):
                if mapa[y][x] in '.,j':
                    mapa[y][x] = 'T'
    for x, y in PRZESMYK:
        if mapa[y][x] == 'T':
            mapa[y][x] = '.'
    for x, y in ZIEMIA:
        if mapa[y][x] in '.,':
            mapa[y][x] = 'j'
    # Runda 7: kieszeń za rzeką od brzegu po ścianę gór (las, który tu rósł
    # z rozmycia szkicu, zasłaniał dno kieszeni). Runda 14 (E3, A1): dno to
    # łąka, nie rough — a głąb kieszeni (18–21, 33–35) zarasta lasem, żeby
    # kieszeń była ciasnym zakątkiem z jaskinią, nie pustym trawnikiem.
    x0, y0, x1, y1 = KIESZEN_ROUGH
    for y in range(y0, y1 + 1):
        for x in range(x0, x1 + 1):
            if x > rzeka_x(y) and mapa[y][x] in '.,T':
                mapa[y][x] = 'T' if y >= 33 else '.'
    # Runda 8: dwa drzewa pod wschodnim przyczółkiem stały koronami na
    # drodze — trakt za mostem znikał pod nimi i „urywał się przy moście".
    for x in (16, 17, 18):
        if mapa[26][x] == 'T':
            mapa[26][x] = '.'
    # Runda 12 (E3): luźne plamy skał i piasku po 2–4 pola rozsypane bez
    # związku z granicami stref — skała ma być pasmem albo jej nie ma,
    # a piasek zostaje tylko na brodzie (tam znaczy przeprawę).
    for x0, y0, x1, y1 in PLAMY_SKAL:
        for y in range(y0, y1 + 1):
            for x in range(x0, x1 + 1):
                if mapa[y][x] == '#':
                    mapa[y][x] = '.'
    for y in range(BOK):
        for x in range(BOK):
            if mapa[y][x] == ',':
                mapa[y][x] = '.'
    # Runda 12 (F4): róg NE bez zaułka (29,1)–(30,2) i kolumny 35 — kieszeń
    # sięgała 37 kroków od startu i fort (25) wypadał poniżej 70 % zasięgu.
    for x, y in ((29, 1), (30, 2)):
        mapa[y][x] = '#'
    for y in (3, 4):
        mapa[y][35] = 'T'
    # Runda 12 (C1, C4): ściany lasu, które zamieniają otwartą łąkę w szyjki.
    for x0, y0, x1, y1 in LAS_GRANICY:
        for y in range(y0, y1 + 1):
            for x in range(x0, x1 + 1):
                if mapa[y][x] in '.,j':
                    mapa[y][x] = 'T'
    for x, y in SZYJKA_PLAZY:
        if mapa[y][x] == 'T':
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
    # Runda 12 (G4, E3): kraina wroga ma własny grunt. Cały brzeg za rzeką
    # na północ od pasa lasu to `j` — w grze ubita ziemia (ruch 125, jak
    # rough w HotA), w tle ciemna, chłodna łąka (`TLO` + `BARWY_TERENU`),
    # więc na minimapie i na ekranie widać, gdzie zaczyna się cudza ziemia.
    for y in range(GRANICA_WROGA + 1):
        for x in range(BOK):
            if mapa[y][x] in '.,' and strefa(x, y) == 'wroga' and not (x0 <= x <= x1 and y0 <= y <= y1):
                mapa[y][x] = 'j'
    # Runda 13 (G4): kraina wroga ma krawędź z rzeki i SKAŁ, a w środku
    # skały zamiast jasnozielonych kęp — ciemność czyta się jako skalisty,
    # inny kraj, nie jako plama bagna. Las za rzeką na północ od granicy
    # (brzeg mapy, ściany szyjek, kępy w środku) staje się skałą, a między
    # łąką pogranicza a ciemną łąką stoi masyw (22–29, 16–17) zamiast
    # schodków trawy. Ciemne, uschłe drzewa dosiewa tło (`NAKLEJKI`).
    for y in range(GRANICA_WROGA + 1):
        for x in range(BOK):
            if mapa[y][x] == 'T' and strefa(x, y) == 'wroga':
                mapa[y][x] = '#'
    for x0, y0, x1, y1 in SKALY_WROGA:
        for y in range(y0, y1 + 1):
            for x in range(x0, x1 + 1):
                if mapa[y][x] in '.,jT':
                    mapa[y][x] = '#'


#: Runda 13 (G4): masyw zamykający krainę wroga od południa (x0, y0, x1, y1).
SKALY_WROGA = [(22, 16, 29, 17)]

FORT = PUNKTY['zamek wroga']


def strefa(x, y):
    """Za rzeką zaczyna się „pogranicze", a za pasem lasu (wiersze 15–17)
    na północ — kraina wroga (runda 12: granica stref = granica terenu)."""
    if x < rzeka_x(y):
        return 'dom'
    if y <= GRANICA_WROGA:
        return 'wroga'
    return 'pogranicze'


def TLO(rysunek):
    """Podmiany znaków tylko w TLE (`render_mapa.ustaw`), runda 12.

    Grunt krainy wroga (`j`) maluje się jako warstwa `bagno` z teksturą
    ciemnej trawy (`TEKSTURY`), zabarwioną chłodno (`BARWY_TERENU['bagno']`)
    — „ciemna łąka" z checklisty G4. Rough w kieszeni za rzeką i ziemia
    pod pasmami zostają ciepłą ubitą ziemią, jak dotąd.
    """
    wynik = [list(w) for w in rysunek]
    for y in range(BOK):
        for x in range(BOK):
            wroga = y <= GRANICA_WROGA and strefa(x, y) == 'wroga'
            if wynik[y][x] == 'j' and wroga:
                wynik[y][x] = 'b'
            # Runda 13 (E3, F1): góra stoi NA łące, jak w Heroes 3 — ubita
            # ziemia pod klockami skał prześwitywała między nimi plamami
            # piasku (2–3 pola) i „ścieżką w skałach" (1–3, 22–25). W krainie
            # wroga pod skałami jest jej ciemna łąka.
            elif wynik[y][x] == '#':
                wynik[y][x] = 'b' if wroga else '.'
    return [''.join(w) for w in wynik]


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
#: Runda 13 (G1): ekran startowy (0–21, 18–36) miał ponad 20 obiektów —
#: zostaje zamek, dwie kopalnie, dwa stosy, dwie skrzynie, straż na moście
#: i kieszeń za rzeką. Wiatrak, obóz, automat, ognisko, domek na drzewie
#: i skrzynia z wąwozu poszły do puli budowli północnej łąki i pogranicza.
#: Kopalnia w zboczu pasma to kamieniołom (A2, B1): jaskinia odłamków czytała
#: się jako „jaskinia", nie jako kopalnia — i gracz „nie miał" drugiej
#: kopalni podstawowej przy zamku. Jaskinia odłamków stoi na północnej łące.
PIERWSZY_EKRAN_DOM = [
    ([(9, 27), (8, 27), (10, 27)], ('kopalnia', 'kamien')),
    ([(12, 33), (11, 33), (13, 33)], ('kopalnia', 'jagoda')),
    ([(11, 27), (10, 28)], ('surowiec', 'odlamek')),
    # Runda 12 (G2): skrzynia leżała na trakcie tuż przed mostem — teraz
    # w stosie z odłamkami przy kopalni.
    ([(11, 28), (10, 29)], ('skrzynia', None)),
    # Runda 14 (B2): skrzynia (9, 34) i koszyk (6, 30) leżały w bezdrożnym
    # lesie SW — teraz stos na końcu odnogi, za sadem.
    ([(14, 33), (15, 33), (15, 34)], ('skrzynia', None)),
    ([(14, 34), (13, 34), (14, 35)], ('surowiec', 'jagoda')),
]

#: Runda 13 (B1): jaskinia odłamków stała na północnej łące. Runda 14 (B1):
#: poszła do kieszeni za rzeką zamiast drugiego kamieniołomu, a łąka nie ma
#: kopalni — gracz ma kamień, sad, odłamki i złoto, każde raz.

#: Pierwszy ekran, drugi brzeg.
PIERWSZY_EKRAN_BRZEG = [
    # Runda 14 (A1, B1, G1): w kieszeni za pasmem zostaje SAMA jaskinia
    # odłamków — bez straży (kieszeń i tak leży za strażą mostu), bez
    # skrzyni i stosu (poszły na łąkę pogranicza, `STOS_POGRANICZA`).
    ([(19, 30), (20, 30), (18, 30)], ('kopalnia', 'odlamek')),
    # Runda 13 (G1): bez ogniska w kieszeni i gniazda przy strażnicy —
    # mniej rzeczy w kadrze startu.
    ([(18, 23), (17, 23)], ('budynek', 'wieza-obserwacyjna')),
    # Runda 12 (G1, F1): polana strażnicy odchudzona (bez wozu, jagód
    # i kamienia na łące). Runda 14: przesmyk nad wieżą zarósł (G1).
]

#: Runda 14 (G1): stos z kieszeni za rzeką przeniesiony za kadr startu —
#: przy zakręcie traktu na łące pogranicza, pod ścianą lasu.
STOS_POGRANICZA = [
    ([(25, 23), (26, 23)], ('skrzynia', None)),
    ([(25, 24), (24, 24)], ('surowiec', 'odlamek')),
]

#: Runda 12: plaża nad jeziorem — kieszeń za strażą (12, 6).
#: Runda 13 (C1, C3): obóz łowców (złoto) wcięty w skałki plaży — straż
#: (12, 6) pilnuje całej kieszeni: kopalni, artefaktu i skrzyni. Dotąd obóz
#: stał na otwartej łące pod luźną strażą (12, 13), którą dało się obejść.
PLAZA_SKARB = [
    ([(10, 4), (10, 3), (9, 4)], ('kopalnia', 'pokeball')),
    ([(13, 4), (12, 4), (13, 3)], ('artefakt', None)),
    ([(12, 3), (13, 3), (12, 4)], ('skrzynia', None)),
    ([(8, 4), (8, 3), (9, 3)], ('surowiec', 'kamien')),
]

#: Runda 12: nagrody krainy wroga — za brodem i przy forcie, w stosach po
#: 2–3, a nie pojedyncze pionki na łące (B2). Artefakt to ten, który stał
#: w pierwszym ekranie.
KRAINA_WROGA = [
    ([(25, 9), (25, 10), (26, 9)], ('artefakt', None)),
    ([(24, 10), (24, 11)], ('surowiec', 'pokeball')),
    ([(25, 11), (26, 10), (26, 11)], ('surowiec', 'kamien')),
    ([(26, 6), (27, 6), (26, 5)], ('skrzynia', None)),
    ([(24, 5), (25, 4), (24, 4)], ('budynek', 'ognisko')),
    # Runda 13 (G2): stos przy forcie odsunięty od jego rysunku — skrzynia
    # (33, 9) dotykała flagi fortu (32, 9).
    ([(34, 11), (33, 11)], ('surowiec', 'kamien')),
    ([(35, 11), (35, 10)], ('surowiec', 'pokeball')),
    ([(35, 9), (35, 10)], ('skrzynia', None)),
]

#: Runda 12: róg NE (31–35, 1–5) za skałami — kieszeń za strażą (31, 5).
#: Runda 13 (C1, C3): kopalnia złota wroga wcięta w skały rogu — straż (31, 5)
#: pilnuje kopalni, artefaktu i skrzyni, a straż (27, 7) z otwartej łąki odpada.
ROG_SKARB = [
    ([(31, 3), (32, 3), (30, 3)], ('kopalnia', 'pokeball')),
    ([(34, 3), (34, 4)], ('artefakt', None)),
    ([(33, 4), (33, 3)], ('skrzynia', None)),
    ([(34, 5), (30, 3)], ('surowiec', 'kamien')),
]

#: Runda 14: łąka pogranicza (27–33, 18–27) — każda rzecz w swoim miejscu:
#: kamieniołom u stóp masywu pod przełęczą, pokeballe przy wschodnim lesie,
#: stadion i wiatrak przy odnodze na południe. Kamieniołom, nie druga jaskinia
#: odłamków (ta jest w kieszeni za mostem).
LAKA_POGRANICZA = [
    ([(28, 20), (28, 19), (27, 20)], ('kopalnia', 'kamien')),
    ([(32, 21), (32, 20), (33, 21)], ('surowiec', 'pokeball')),
    ([(32, 24), (31, 24), (32, 25)], ('budynek', 'arena')),
    ([(30, 26), (29, 26), (30, 27)], ('budynek', 'wiatrak')),
]

#: Runda 12 (F2): chata jasnowidza przy rozstajach za mostem — widać ją
#: z traktu, prosi o kamienie, po które trzeba iść do krainy wroga i wrócić.
JASNOWIDZ = [(26, 27), (25, 27), (26, 26)]

#: Runda 12 (F1): koniec południowej odnogi drogi — skrzynia i stos.
KONIEC_ODNOGI = [
    ([(31, 28), (31, 29), (32, 28)], ('skrzynia', None)),
    ([(31, 29), (32, 29), (31, 30)], ('artefakt', None)),
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

    # STRAŻE W SZYJKACH (runda 12) — najpierw, zanim losowanie zajmie pola.
    # Pole straży i osiem wokół są zajęte: nic nie stanie w zamykanym przejściu.
    def straz(pole, sila):
        g.postaw(pole, ('potwor', sila))
        g.zajete += [(pole[0] + dx, pole[1] + dy) for dy in (-1, 0, 1) for dx in (-1, 0, 1)]

    # Przełęcz północna doliny: słaba straż obok traktu — zamyka dolinę domu,
    # a dziecko ma pierwszą „wolno stojącą" bitwę pod ręką (A4, A5).
    straz(STRAZ_PRZELECZY_DOMU, 'slaby')
    # Most: słaba straż na wschodnim przyczółku — pierwsza lekcja (runda 13:
    # dwa pola za deskami, bo rysunek mostu sięga pole za przeprawę).
    straz((MOST[2] + 2, MOST[1]), 'slaby')
    # Bród: średnia straż na środku łachy — druga lekcja; blokuje całą
    # szerokość koryta (20–22), a w wierszu 7 i 9 jest woda.
    straz(STRAZ_BRODU, 'sredni')
    # Przełęcz fortu: SILNA straż na trakcie — fort jest ostatnią, najdroższą
    # bitwą (C2, C3).
    straz(STRAZ_PRZELECZY_FORTU, 'silny')
    # Kieszenie: plaża (słaba) i róg NE (średnia) — nagroda za cały zakątek.
    straz(STRAZ_PLAZY, 'slaby')
    straz(STRAZ_ROGU, 'sredni')

    # PLAŻA: skrzynia, artefakt i kamienie za strażą.
    for miejsca, wpis in PLAZA_SKARB:
        postaw_kadr(g, miejsca, wpis)
    g.zajete += PLAZA
    # Runda 14 (B1, B4): bez kopalni na północnej łące — drugi sad dublował
    # sad przy zamku (ten sam rysunek dwa razy na brzegu domu).
    # Runda 13 (F3, G1): jedna wieża, jeden domek na drzewie na całej mapie;
    # budowle z pierwszego ekranu idą na północną łąkę.
    # Runda 14 (G2, F3): bez ogniska (stoi w krainie wroga), a każda
    # budowla co najmniej trzy pola od innych rzeczy — gniazdo, obóz
    # i stos odłamków stały w jednej kupce, źródło dach w dach z ogniskiem.
    for b in ['drzewo-wiedzy', 'zrodlo', 'gniazdo', 'chatka', 'oboz-treningowy']:
        g.dodaj(1, 'dom', (4, 30), lambda p, b=b: ('budynek', b), odstep=3)
    # Runda 14 (G2): stosy łąki też z odstępem — nie przyklejone do budowli.
    g.dodaj(2, 'dom', (8, 30), lambda p: ('surowiec', rng.choice(['jagoda', 'odlamek', 'pokeball'])), odstep=2)
    g.dodaj(1, 'dom', (8, 30), lambda p: ('skrzynia', None), odstep=2)
    # Kieszeń domu bywa po rundzie 4 ciasna (rzeka skręca przez dolinę):
    # gdy każde miejsce w niej zatyka drogę, skarb w kieszeni odpada.
    try:
        g.skarb_w_kieszeni('dom', 'slaby', 2, lambda p: ('skrzynia', None))
    except SystemExit:
        pass

    # --- ZA RZEKĄ ----------------------------------------------------------
    # DRUGI BRZEG W PIERWSZYM EKRANIE: kieszeń za pasmem (kopalnia kamienia
    # wcięta w zbocze, skrzynia, ognisko, stos) z jednym wejściem wzdłuż
    # brzegu i strażą w nim; nad pasmem strażnica i gniazdo przy drodze.
    for miejsca, wpis in PIERWSZY_EKRAN_BRZEG:
        postaw_kadr(g, miejsca, wpis)
    g.zajete += kadr_calego_ekranu
    for miejsca, wpis in STOS_POGRANICZA:
        postaw_kadr(g, miejsca, wpis)
    # Runda 14 (G2): wokół rozstajów nic z puli — gniazdo, ognisko i drugi
    # stos odłamków stawały przy tym stosie w jedną kupkę.
    g.zajete += [(x, y) for y in range(21, 26) for x in range(23, 30)]

    # Chata jasnowidza przy rozstajach (F2) i koniec południowej odnogi (F1).
    postaw_kadr(g, JASNOWIDZ, ('jasnowidz', None))
    # Runda 14 (G2): wokół chaty nic z puli — skrzynia i stos z losowania
    # stawały tuż przy niej i zlewały się z rozstajami w jedną kupkę.
    g.zajete += [(x, y) for y in range(25, 29) for x in range(23, 29)]
    for miejsca, wpis in KONIEC_ODNOGI:
        postaw_kadr(g, miejsca, wpis)
    # Runda 14 (G2): wokół stosu na końcu odnogi nic z puli — wiatrak
    # i ognisko stawały na skrzyni i artefakcie.
    g.zajete += [(x, y) for y in range(27, 32) for x in range(28, 35)]

    # Runda 14 (G2, F3, B1): łąka pogranicza rozstawiona ręcznie
    # (`LAKA_POGRANICZA`) — losowanie zsypywało kopalnię, dwa stosy jagód,
    # ognisko, gniazdo i skrzynię w jedną kolumnę pod przełęczą fortu.
    for miejsca, wpis in LAKA_POGRANICZA:
        postaw_kadr(g, miejsca, wpis)
    # Kieszeń pogranicza: artefakt i skrzynie za jedną średnią strażą (C1, B4).
    kieszen = iter([('artefakt', None), ('skrzynia', None), ('surowiec', 'kamien')])
    try:
        g.skarb_w_kieszeni('pogranicze', 'sredni', 3, lambda p: next(kieszen))
    except SystemExit:
        pass

    # --- KRAINA WROGA ------------------------------------------------------
    # Za brodem i przy forcie: artefakt, stosy po 2–3, skrzynie, ognisko;
    # w rogu NE kieszeń za średnią strażą z kopalnią złota wroga (runda 13:
    # każda straż krainy stoi w szyjce).
    for miejsca, wpis in KRAINA_WROGA + ROG_SKARB:
        postaw_kadr(g, miejsca, wpis)
    g.zajete += ROG_NE
    # Runda 14 (G2): pagoda na stałym miejscu przy trakcie — z losowania
    # lądowała przy forcie, wciśnięta między skrzynię a stos (34–35, 9–11).
    postaw_kadr(g, [(31, 8), (31, 7), (28, 7)], ('budynek', 'kamienna-wieza'))


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
    # Mapa świata w stylu Pokémon: las i skały z klocków (`src/data/klocki.ts`).
    'klocki': 'trawa',
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
    # Runda 8 (werdykt rundy 7: „obiekty giną w szumie dekoracji — powiększyć
    # je"): stosy o jedną piątą większe, a drobnica łąki przerzedzona.
    # Runda 9 („obiekty za małe względem zamku, giną wśród trawy”): 0,68.
    'znajdzki': 0.68,
    # …i ciemny obrys pod wszystkim, co da się podnieść albo odwiedzić —
    # drzewa, krzaki i naklejki łąki go nie mają.
    # Mapa świata w stylu Pokémon: bez ciemnego obrysu — obiekty mają
    # wtopione podstawki (`osadz_podstawke.py`), a obrys robił z nich naklejki.
    'obrysObiektow': 0,
    # Stwory na mapie, runda 7: strażnik „odrobinę za mały przy moście".
    'skalaStrazy': 1.1,
    # Runda 6 (HotA): „zamek, młyn i most zajmują po kilka kafli". Budowle
    # odwiedzane stoją na jednym polu, więc mniejszy rysunek niczego nie psuje.
    # Stworki runda 4 („kolaż naklejek, a nie mapa z jedną regułą skali"):
    # bohater 1,9 pola ma być niższy od budowli — wiatrak przy 0,8 miał 1,76.
    'skalaBudowli': 1.0,
    # Runda 6: rogi pierwszego kadru (21 × 18 pól po oddaleniu kamery)
    # odsłonięte od startu — czarne zęby mgły w rogach ekranu wyglądały jak
    # dziura w mapie. Tylko rogi: sonda pilnuje, żeby na starcie było
    # odsłonięte mniej niż 20% planszy.
    # Runda 7: skaliste granie z czterech różnych rysunków (PROMPTY-PLANSZE
    # §12) rozdane ręcznie — hasz pola dawał w kadrze trzy razy tę samą grań,
    # a masyw z wodospadem nie trafiał się wcale. Klucz: lewy górny róg kępy
    # 3 × 2 z `PASMA`; minus = odbicie. 1 szare zęby, 2 wodospad, 3 szeroka
    # grań, 4 skałki podnóża.
    'kepySkal': {
        '0,23': 1, '3,23': 3, '6,23': -1,
        # Runda 8: szeroka grań (3, 475 px ≈ 10 pól) na końcu pasma
        # przykrywała rozwidlenie i przyczółek mostu — droga „urywała się
        # przy moście". Węższe szare zęby kończą pasmo na przełęczy.
        '2,25': 4, '5,25': 2, '8,25': -1,
        # Zgłoszenie gracza (po rundzie 11): „kopalnia w dole na środku, pod
        # strażą — nie da się do niej dojść". Zasadami gry się dało, ale
        # jedyne wejście do kieszeni, pas ziemi (17, 27)–(17, 29) między
        # rzeką a pasmem, leżało w całości pod szeroką granią (3, prawie
        # dziesięć pól): na ekranie kieszeń była zamknięta górą i rzeką.
        # Wąski masyw z wodospadem (2, 5⅓ pola) odsłania pas wzdłuż brzegu
        # (`tools/probe-osiagalnosc.ts`, część „okiem gracza").
        '18,28': 2, '21,28': 1,
        '22,30': -2, '22,32': 4, '22,34': -1,
    },
    # Runda 11 (gracz): cztery odsłonięte rogi kadru z rundy 6 wyglądały na
    # starcie jak pięć wysp w różnych miejscach mapy. Jak w Heroes: na starcie
    # widać tylko okolicę bohatera i własnego zamku (`nowaGra` w `plansza.ts`),
    # fort wroga jest do odszukania — opis misji mówi, że leży na wschodzie.
}

#: Runda 6: ziemia pod skarpami to ubita brązowa ziemia z kamykami
#: (`teren-ziemia`, PROMPTY-PLANSZE §11), a nie spękana szara jałowa ziemia.
#: Runda 7: ta sama ziemia w pół skali (`teren-ziemia-drobna*`, zmniejszona
#: `teren-ziemia` złożona 2 × 2 z odbiciami) — kamienie tekstury miały półtora
#: pola i w kieszeni za rzeką czytały się jak szara płyta, nie jak rough.
TEKSTURY = {
    'jalowa': ['ziemia-drobna', 'ziemia', 'jalowa'],
    'sciezka': ['droga-polana', 'sciezka'],
    # Runda 12 (G4): grunt krainy wroga (`b` w tle, patrz `TLO`) to ciemna
    # trawa — ta sama, co ściółka pod lasem — zabarwiona chłodno.
    'bagno': ['trawa-3', 'trawa'],
}

#: Runda 6 („płaska, jednolita zieleń bez wzniesień"): łagodne pagórki
#: i skarpy z cieniem na łące (`teren_efekty.rzezba`, jak na Bagnach).
RZEZBA = {'pagorki': 0.6, 'czolo': 0.4}

#: Przejezdne pola, do których nie da się dojść, zarastają lasem (patrz silnik).
ZASYP_ODCIETE = True

#: Mapa świata w stylu Pokémon: pole nad murem budowli wolne (patrz silnik).
ODSTEP_NAD_BRYLA = True

#: Plac wokół zamków wolny od innych budowli (patrz silnik).
ODSTEP_OD_ZAMKOW = 1

#: Las w zwarte masy z polanami, pusty pas przy ramie pierwszego ekranu.
SKUP_LAS = True
RAMKA_STARTU = True

#: Droga z brzegiem (runda 1: „jedna ścieżka ginie w trawie").
#: Runda 8 („drogi to płaskie beżowe pasy o ostrych krawędziach, bez tekstury,
#: obrzeży i kolein"): kręty trakt z koleinami (`DROGA_KRETA`), własna
#: tekstura ubitej ziemi i malowane obrzeże (`teren_efekty.droga_obrzeze`:
#: przygaszony skraj, wydeptane pobocze, kamyki, źdźbła na krawędzi) zamiast
#: rozjaśniającej `obwodka_drogi`, od której trakt robił się beżowy.
EFEKTY = ['relief', 'bez_placow', 'droga_obrzeze', 'brzeg_wody']

#: Runda 9 (wzorzec: rzeka z mapy kampanii HotA): rzeka obwiedziona pasem
#: piaszczystego brzegu o ostrej krawędzi — trawa dochodząca do samej wody
#: rozmywała granicę lądu i ćwiartki nad mostem czytały się jak jedna zieleń.
BRZEG_WODY = {'szerokosc': 0.6, 'barwa': (182, 154, 106), 'linia': (50, 42, 28)}
DROGA_KRETA = {'szerokosc': 0.5, 'zmiennosc': 0.22, 'meander': 0.12}

#: Runda 2 („krainy rozmywają się w jedną"): twardsze brzegi terenów.
WTAPIANIE = {'las': 0.3, 'skaly': 0.28, 'piasek': 0.3, 'woda': 0.25, 'bagno': 0.32}

#: Budowle pierwszego ekranu co najmniej trzy pola od siebie (silnik).
ODSTEP_KADRU = 3

#: Runda 3: rzeka głębsza i ciemniejsza — turkus świecił jak laguna
#: i razem z trzema polami szerokości robił z rzeki morze.
BARWY_TERENU = {
    # Runda 8: łąka o ton głębsza i mniej jaskrawa — w jaskrawej zieleni
    # obiekty i trakt ginęły; w HotA trawa jest ciemna, a obiekty świecą.
    # Runda 9: jeszcze o ton ciemniej i chłodniej — przy ciemnych masywach
    # lasu jaskrawa łąka między nimi wciąż świeciła jak pusta plama.
    'trawa': {'nasycenie': 0.74, 'barwa': (84, 132, 60), 'moc': 0.16, 'jasnosc': 0.77},
    'sciezka': {'nasycenie': 1.0, 'barwa': (150, 110, 70), 'moc': 0.12, 'jasnosc': 0.9},
    'woda': {'nasycenie': 0.85, 'barwa': (70, 120, 200), 'moc': 0.35, 'jasnosc': 0.86},
    # Runda 12 (G4): kraina wroga za rzeką — łąka o ton ciemniejsza
    # i wyraźnie chłodniejsza (sinozielona) niż ciepła łąka doliny domu.
    'bagno': {'nasycenie': 0.4, 'barwa': (46, 82, 108), 'moc': 0.9, 'jasnosc': 0.6},
}

#: Naklejki terenu (`public/mapa/tlo/`, prompty w `tools/PROMPTY-PLANSZE.md`).
#: Runda 5 (HotA): `kwiaty-1` ma pod spodem jasną kępę mchu, która na łące
#: czytała się jak doklejony talerzyk — zostają kwiaty bez podstawki, a obok
#: drobiazgi łąki jak w HotA (kamienie w mchu, paprocie, grzyby; rysunki
#: z `tools/PROMPTY-PLANSZE.md` §8).
NAKLEJKI = [
    # Runda 8 (werdykt rundy 7: „łąka równo zasypana drobnymi kwiatkami,
    # krzakami, grzybami — obiekty giną w szumie dekoracji"): drobnica
    # przerzedzona trzy-, czterokrotnie; zostają pojedyncze akcenty.
    (['kwiaty-2'], '.', 0.012),
    (['kamienie-mech'], '.', 0.01),
    (['paproc'], '.', 0.008),
    (['grzyby-bagienne'], 'T', 0.006),
    # Runda 6: drobiazgi łąki (PROMPTY-PLANSZE §11) — pniaki, głazy, kępy
    # polnych kwiatów; ziemia pod skarpą dostaje głazy.
    (['pniak-lakowy'], '.', 0.006),
    (['glazy-lakowe'], '.j', 0.012),
    (['kepa-kwiatow'], '.', 0.008),
    # Runda 7: rough w kieszeni za rzeką i pod pasmami usiany głazami
    # i kamieniami — gołe dno czytało się jak wydeptany plac.
    (['glazy-lakowe', 'kamienie-mech'], 'j', 0.16),
    # Runda 13 (G4): uschłe drzewa na ciemnej łące krainy wroga — ciemność
    # ma powód, który widać z bliska. Na planszy z klockami render zostawia
    # tylko naklejki z `NAKLEJKI_KLOCKI` (poza kwiatami i paprociami).
    (['martwe-drzewo-1', 'martwe-drzewo-2'], 'b', 0.07),
]

#: Naklejki dopuszczone na planszy z klockami (patrz `render_mapa.ustaw`).
NAKLEJKI_KLOCKI = ['martwe-drzewo-1', 'martwe-drzewo-2']

#: Runda 4: most przez rzekę w pierwszym ekranie (`teren_efekty.mosty`).
#: `pola` — pola przeprawy (w grze droga, w tle woda pod mostem); `srodek`
#: i `szer` w polach. Rysunek z `tools/PROMPTY-PLANSZE.md` §6 (polana-most),
#: przycięty do sylwetki w `public/mapa/polana/most.png`. Pomost biegnie lekko
#: pod górę w prawo — w poprzek rzeki, która w tym miejscu płynie skosem.
MOSTY = [
    {'plik': 'polana/most.png', 'pola': [(MOST[0], MOST[1]), (MOST[2], MOST[3])], 'srodek': (15.1, 25.72), 'szer': 3.2},
    # Runda 14 (D4): północna przeprawa to też most — koryto ma tu trzy
    # pola, więc rysunek jest o półtora pola szerszy niż na południu.
    {
        'plik': 'polana/most.png',
        'pola': [(x, BROD_POLNOCNY[1]) for x in range(BROD_POLNOCNY[0], BROD_POLNOCNY[2] + 1)],
        'srodek': (BROD_POLNOCNY[0] + 1.6, BROD_POLNOCNY[1] + 0.72),
        'szer': 4.6,
    },
]
