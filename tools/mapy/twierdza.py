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
#   T  bór        #  skały                     .  chłodna łąka (wywiana tundra)
#
# Runda 2 (checklista): krainy w BLOKACH 2 × 2 znaków (8 × 8 pól), żeby po
# rozmyciu każda plama terenu miała ≥ 6 × 6 pól, a teren mówił, gdzie się jest:
#   0–4    kraina wroga: śnieg i bór (zimno, ciemno), kolumna 8 to kręgosłup;
#   5      GRZBIET PÓŁNOCNY — pełny mur, przejścia wycina tabela PRZEJSCIA;
#   6–10   tundra: jałowa ziemia przy traktach, śnieg na bezdrożu, jezioro
#          centralne (kol. 5–8) i jezioro-zapora (kol. 11–12) z brodem;
#   11     GRZBIET POŁUDNIOWY — pełny mur;
#   12–17  dolina gracza: płowa łąka (ciepło, jasno), bory i wzgórza;
#          pierwszy ekran (kol. 0–5, w. 13–17) zostaje śnieżny — maluje go
#          `popraw_teren`.
SZKIC = [
    'Tsssss###TTsssssTT',
    'Tsssss###TTsssssTT',
    'Tsssssss#sssssssTT',
    'TTsssTTs#ssTTssssT',
    'TTsssTTs#ssss#sTTs',
    '##################',
    'TTjjs~~~~js~~jjsTT',
    'TTjjs~~~~js~~jjsTT',
    'jjssj~~~~jj~~jjsss',
    'jjssj~~~~jjjjjjsss',
    'ssTTjjjjjjj##TTjjs',
    '##################',
    'TT......jj..TT..TT',
    'Tssss..jj...~~....',
    'ssss~~TTjj..~~....',
    '##sss.TTTT.TT..##.',
    '##sss.....TT...##.',
    'T##sTT..TTTT..TTTT',
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
    # Runda 2 (checklista): wschodnie przejście z (55–56) na (40–41) — trasa
    # wschodnia nie jest już prostą kolumną pod (57–58, 21–22), tylko musi
    # obejść jezioro-zaporę przez bród.
    ('południowy', (40, 44, 41, 47), 'j'),
    ('kręgosłup', (33, 8, 35, 9), 's'),      # przełęcz między twierdzami
]

PRZEJSC_W_MURZE = {'północny': 2, 'południowy': 2, 'kręgosłup': 1}

PUNKTY = {
    'start': (13, 62),
    'zamek gracza': (10, 64),
    'rozstaje doliny': (22, 56),
    'podnoze poludniowe': (29, 51),
    'przelecz poludniowa': (29, 45),
    'tundra': (30, 41),
    'zachodni bor': (14, 30),
    'przelecz zachodnia': (12, 21),
    'zamek wroga 2': (13, 11),
    'przelecz twierdz': (34, 8),
    'zamek wroga': (58, 9),
    # Runda 2 (checklista): trasa wschodnia przez bród i odnogi traktu do
    # kopalń — każda odnoga kończy się zakątkiem ze stosem, nie w polu.
    'rozstaje wschodnie': (37, 53),
    'przelecz wschodnia poludniowa': (40, 45),
    'brod': (45, 37),
    'wschodnia tundra': (56, 33),
    'przelecz wschodnia': (57, 21),
    'zachodnia kopalnia': (11, 50),
    'wzgorze wiezy': (61, 59),
    'zachodnia odnoga': (6, 33),
    'polnocna odnoga': (40, 27),
    'wschodnia odnoga': (66, 35),
    'kopalnia srebrna': (19, 15),
    'kopalnia lodowa': (63, 15),
    'kopalnia lodowa 2': (46, 16),
    # Runda 3 (krytyk C1/C3): trakty do skarbców pod wodzami.
    'skarbiec srebrny': (11, 3),
    'skarbiec lodowy': (61, 4),
    # Runda 4 pętli (krytyk G1/F1): ślepa odnoga na polanę za ranczem.
    'wschodni zakatek': (67, 27),
}

SZLAKI = [
    ['zamek gracza', 'start', 'rozstaje doliny', 'podnoze poludniowe', 'przelecz poludniowa', 'tundra',
     'zachodni bor', 'przelecz zachodnia', 'zamek wroga 2'],
    ['podnoze poludniowe', 'rozstaje wschodnie', 'przelecz wschodnia poludniowa', 'brod',
     'wschodnia tundra', 'przelecz wschodnia', 'zamek wroga'],
    ['rozstaje wschodnie', 'wzgorze wiezy'],
    ['rozstaje doliny', 'zachodnia kopalnia'],
    ['zachodni bor', 'zachodnia odnoga'],
    ['tundra', 'polnocna odnoga'],
    ['wschodnia tundra', 'wschodnia odnoga'],
    ['zamek wroga 2', 'kopalnia srebrna'],
    ['zamek wroga', 'kopalnia lodowa'],
    ['zamek wroga', 'kopalnia lodowa 2'],
    # Runda 2 (checklista D1/F1): trakt między twierdzami przez przełęcz
    # kręgosłupa — skrót po zdobyciu pierwszej z nich ma drogę, a pusty
    # dotąd środek zachodniej doliny (x 20–32, y 0–19) dostaje przy niej
    # zakątek.
    ['zamek wroga 2', 'przelecz twierdz', 'zamek wroga'],
    ['zamek wroga 2', 'skarbiec srebrny'],
    ['zamek wroga', 'skarbiec lodowy'],
    ['wschodnia tundra', 'wschodni zakatek'],
]

#: Zapora: jezioro-zapora (x 44–51, y 23–35) i skalna ostroga (y 39–44) pod
#: nim dzielą tundrę na zachodnią i wschodnią; jedyna szyjka to bród
#: (44–46, 36–38) pod średnią strażą. Wschodnia tundra jest też osiągalna
#: pętlą przez obie twierdze, więc test zamyka i bród, i zachodnią przełęcz.
ZAPORY = {
    'brod': {'przejscia': [(44, 36, 46, 38), (12, 20, 13, 23)], 'odcina': ['wschodnia tundra']},
}

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
    # Runda 2 (checklista E3): rozmycie szkicu sypie po krainach plamki po
    # 1–8 pól innego terenu (78 takich plam, w tym 37 pojedynczych pól) —
    # „mozaika, teren nie mówi, gdzie zaczyna się strefa". Poza kadrem
    # pierwszego ekranu (malowanym ręcznie niżej) drobne plamy śniegu, tundry
    # i jałowej ziemi wtapiają się w to, co je otacza. Tylko między terenami
    # przejezdnymi — mury, bór i jeziora zostają, przejezdność się nie zmienia.
    scal_plamy(mapa, poza=KADR)
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
    # Runda 6 (HotA): „dolna i środkowa część to płaski śnieg bez rzeźby —
    # trzeba skarp, zagajników i wąwozów tworzących korytarze". Trzy bryły
    # rzeźby na równinie (rysunki `gora-6..8` w `USTAWIENIA.masywy`):
    #  * skalna skarpa pod zamkiem (y 67–68) — odnoga pasma; między nią
    #    a górami wąski wąwóz (x 11–12) do zaułka ze skarbem pod strażą;
    #  * zalesiony pagór (y 64–65) — między nim a skarpą korytarz (y 66)
    #    wiodący w zatoczkę przy borze;
    #  * zagajnik świerków przy borze (x 21–23) zamyka korytarz od wschodu.
    for y in (67, 68):
        for x in range(13, 18):
            mapa[y][x] = '#'
    for x, y in [(11, 67), (12, 67), (11, 68), (12, 68), (11, 69), (12, 69), (11, 70), (12, 70), (13, 70)]:
        mapa[y][x] = 's'
    # Runda 8 (HotA): „środkowe i prawe pola śniegu to puste białe plamy
    # z pojedynczymi kępkami drzew". Zalesiony pagór (płaski śnieżny płat
    # z kilkoma świerkami) zamienia się w zwarty masyw boru 6 × 2 — dwie
    # kępy 3 × 2 sceny — jak na Polanie: las wyznacza korytarz (y 66) i plac
    # pod traktem (y 63), a nie leży płaską białą wyspą.
    for y in (64, 65):
        for x in range(14, 20):
            mapa[y][x] = 'T'
    for x, y in [(21, 66), (22, 66), (23, 66), (23, 67)]:
        mapa[y][x] = 'T'
    # Wschodni brzeg stawu jako śnieżny cypel już przed rozstawieniem (dotąd
    # zamarzał dopiero po nim, patrz koniec `rozstaw`): stoi na nim relikt
    # pod strażą.
    for x, y in [(19, 58), (20, 58), (21, 58), (19, 59), (20, 59), (21, 59), (22, 59), (21, 60)]:
        if mapa[y][x] == '~':
            mapa[y][x] = 's'
    # …i ściana boru na prawym brzegu kadru, za kopalnią odłamków: świat
    # ciągnie się dalej, zamiast kończyć na pustym śniegu przy ramie.
    for y in (64, 65):
        for x in range(23, 26):
            mapa[y][x] = 'T'
    for x, y in [(23, 61), (24, 61), (23, 62), (24, 62)]:
        mapa[y][x] = '#'
    # Runda 10 (HotA): „lewa trzecia część — masyw gór od góry do dołu — jest
    # martwa, bez odnóg ze skarbami; dodać przełęcz przez lewe góry". Między
    # wysokim szczytem (`gora-2`, stopa 64,3) a pasmem w lewym dolnym rogu
    # (`gora-1`, niższe i zsunięte w dół) otwiera się dolina x 3–8, y 64–66:
    # trakt od bramy zamku na zachód, kopalnia kamieni w skalnej ścianie,
    # straż na przełęczy i skrzynia za nią. Cała dolina leży w kadrze (x ≥ 3),
    # więc losowanie reszty doliny gracza (poza kadrem) się nie zmienia.
    for y in (64, 65, 66):
        for x in range(3, 9):
            mapa[y][x] = 's'
    for y in range(67, 72):
        for x in range(0, 10):
            mapa[y][x] = '#'
    # Zagajnik między przełęczą a wąwozem — pusty płat śniegu pod doliną.
    for x, y in [(9, 66), (10, 66), (10, 67)]:
        mapa[y][x] = 'T'
    # Runda 12 (HotA): „prawy dolny kwadrant — od środkowego lasu po prawą
    # krawędź i dół — to jeden blok identycznych świerków, bez polan, ścieżek
    # i skał". Bór rozbity na kępy różnej wielkości z prześwitami: kępa 3 × 2
    # na zachodzie środkowego boru, obok luźne pojedyncze drzewa (scena stawia
    # je z różnych rysunków); w dolnym bloku polana z odnogą traktu, gniazdem
    # na pniu i skałkami, dwie kępy po bokach i pojedyncze drzewa na skraju.
    for y in (64, 65):
        mapa[y][17] = 's'
    for x, y in [(21, 66), (21, 67)]:
        mapa[y][x] = 's'
    for y in range(68, 72):
        for x in range(16, 25):
            mapa[y][x] = 's'
    for x, y in [(16, 70), (17, 70), (18, 70), (16, 71), (17, 71), (18, 71),   # kępa zachodnia
                 (22, 70), (23, 70), (24, 70), (22, 71), (23, 71), (24, 71),   # kępa wschodnia
                 (18, 68), (17, 69), (23, 69), (24, 69), (24, 68)]:           # pojedyncze
        mapa[y][x] = 'T'
    for x, y in [(22, 68), (23, 68)]:
        mapa[y][x] = '#'

    # --- Runda 2 (checklista) — poza kadrem ------------------------------
    # Jezioro-zapora z brodem: tundra dzieli się na zachodnią i wschodnią,
    # a jedyna szyjka między nimi to bród (44–46, 36–38) pod średnią strażą.
    # Pas y 23 pod grzbietem północnym musi być murem od x 15 do 52: rozmycie
    # otwierało tam korytarz wzdłuż grzbietu, którym dało się obejść i bród,
    # i szyjkę północnej odnogi.
    for x in range(15, 53):
        mapa[23][x] = '#'
    for y in range(24, 36):
        for x in range(44, 52):
            mapa[y][x] = '~'
        if rng.random() < 0.45 and y < 35:
            mapa[y][43 if rng.random() < 0.5 else 52] = '~'
    for y in range(36, 39):
        for x in range(43, 53):
            mapa[y][x] = 'j'
    for y in range(39, 45):
        for x in range(44, 52):
            mapa[y][x] = '#'
    # Szyjka północnej odnogi (x 36–43 między jeziorami): skałki po obu
    # stronach, w prześwicie x 39–41 stoi straż; za nią zakątek z drzewem
    # wiedzy i stosem.
    for y in (32, 33):
        for x in (36, 37, 38, 42, 43):
            mapa[y][x] = '#'
    # Kopalnie wcięte w skalne zbocza na końcach odnóg traktu (jak w HoMM3):
    # bryła kopalni stoi w rzędzie nad wejściem, a tam jest skała.
    for x in range(44, 50):
        mapa[15][x] = 's'
    for x0, x1, y0, y1 in [(63, 69, 30, 33),    # wschodnia tundra (66, 34)
                           (17, 21, 11, 13),    # Srebrna Strażnica (19, 14)
                           (61, 66, 11, 13),    # Lodowa Twierdza (63, 14)
                           (44, 49, 12, 14),    # Lodowa Twierdza, zach. (46, 15)
                           (9, 13, 47, 48),     # dolina gracza, NW (11, 49)
                           (2, 6, 30, 31)]:     # zachodnia tundra (4, 32)
        for y in range(y0, y1 + 1):
            for x in range(x0, x1 + 1):
                mapa[y][x] = '#'
    # Południowo-wschodni róg doliny gracza: wzgórze (skały x 60–66, y 60–67)
    # z kamienną wieżą na północnej krawędzi i zatoka za nim (x 67–71), do
    # której wchodzi się szyjką x 69–71 przy y 56–59 — straż, za nią relikt.
    for y in range(60, 68):
        for x in range(60, 67):
            mapa[y][x] = '#'
        for x in range(67, 72):
            mapa[y][x] = '.'
    for y in range(56, 60):
        for x in range(64, 69):
            mapa[y][x] = '#'
        for x in range(69, 72):
            mapa[y][x] = '.'
    for y in range(68, 72):
        for x in range(56, 67):
            mapa[y][x] = 'T'
    # Szyjka północno-wschodniej zatoki doliny (x 57–59, y 55–58) między
    # jeziorem a skałkami — słaba straż; bez niej dolina gracza była w 34 %
    # dostępna bez bitwy (checklista A4: 7–30 %).
    for y in range(55, 59):
        for x in range(49, 57):
            mapa[y][x] = '~'
        for x in range(60, 64):
            mapa[y][x] = '#'
    # Skarbce dolin twierdz: zakątki wycięte w borze w najdalszych rogach
    # (NE przy Lodowej Twierdzy, SW przy Srebrnej Strażnicy), każdy z jednym
    # wejściem szerokim na pole — straż w wejściu, za nią relikt.
    for y in range(0, 7):
        for x in range(63, 72):
            mapa[y][x] = 'T'
    for y in range(1, 6):
        for x in range(67, 72):
            mapa[y][x] = 's'
    for x in range(63, 67):
        mapa[3][x] = 's'
    for y in range(0, 20):
        for x in range(0, 4 if y < 12 else 8):
            mapa[y][x] = 'T'
    for y in range(14, 19):
        for x in range(1, 5):
            mapa[y][x] = 's'
    for x in range(5, 9):
        mapa[16][x] = 's'

    # --- Pętla plansz 2026-10 (krytyk rundy 2) ---------------------------
    # E3: „środkowy pas ma śnieżne plamy nie na krawędziach stref" — zachodnia
    # dolina (14–21, 32–40), brzeg nad jeziorem (17–20, 24–29), wschód
    # (59–71, 24–36). Tundra to jałowa ziemia: śnieg zostaje tylko pod
    # grzbietami (y 23 i zachodni kąt przy grzbiecie południowym, x ≤ 9,
    # y ≥ 39), czyli na krawędziach stref. Koszt ruchu j < s — przejezdność
    # bez zmian.
    # Runda 6 pętli (krytyk E3): także kąt zachodniej zatoki (2–8, 39–43)
    # i skraj wschodniej (69–71, 43) — łaty śniegu po 1–3 pola bez powodu;
    # cały pas y 24–44 to jałowa ziemia.
    for y in range(24, 45):
        for x in range(BOK):
            if mapa[y][x] == 's':
                mapa[y][x] = 'j'
    # G1/B3: kępy boru w pustych połaciach — zachodni bór przy trakcie nad
    # jeziorem (16–19, 25–29), bór przy trakcie wschodnim (58–61, 25–29)
    # i zagajnik na gołym śniegu doliny Srebrnej Strażnicy (17–21, 4–7).
    # Ekran ma mniej rzeczy, a plansza nie robi się rzadsza (obiekt co
    # ≤ 12,5 pola przejezdnego): ubywa pustych pól, nie obiektów.
    for x0, y0, x1, y1 in [(16, 25, 19, 29), (58, 25, 61, 29), (17, 4, 21, 7)]:
        for y in range(y0, y1 + 1):
            for x in range(x0, x1 + 1):
                if mapa[y][x] in 's.j':
                    mapa[y][x] = 'T'
    # E5: kałuża (47, 50) nad jeziorem SE nie miała funkcji.
    if mapa[50][47] == '~':
        mapa[50][47] = '.'

    # --- Pętla 2026-10, runda 3 (krytyk: „straże nie strzegą") -------------
    # Każda straż poza przełęczami stoi teraz w SZYJCE zatoki: zatoka ma
    # ciągły (czterospójny) mur, więc ruch po skosie nie przecieka obok
    # straży, a jedyne wejście (1–2 pola) leży w jej kwadracie 3 × 3.
    # Ściany przy PUNKTACH są borem, nie skałą — silnik czyści skały wokół
    # punktów orientacyjnych.
    def zamaluj(pola, znak):
        for x, y in pola:
            mapa[y][x] = znak

    # C4: przeciek po skosie obok Straży Międzyjezierza (40, 33) — kolumna
    # x 35 przy jeziorze prowadziła (35,34) → (35,32) → (36,31) do zakątka.
    zamaluj([(35, 32), (35, 33)], '#')
    # Srebrna Strażnica — zatoka kopalń (16,14) i (19,14): mur x 14 i y 18,
    # zamknięty wschodni wylot (21,14); wejście (14,15)–(14,16) pod strażą.
    zamaluj([(14, 13), (15, 13), (16, 13), (14, 14), (14, 17), (14, 18)] + [(21, y) for y in range(13, 19)], '#')
    zamaluj([(x, 18) for x in range(15, 22)], '#')
    # Srebrna Strażnica — zakątek pod borem przy trakcie do przełęczy
    # (x 27–32, y 13–19): wejście (29–30, 12) pod strażą.
    zamaluj([(28, 12), (31, 12), (32, 12), (32, 11)], '#')
    zamaluj([(25, 12)], 'T')
    # Srebrna Strażnica — skarbiec w północno-zachodnim rogu (x 4–9, y 0–4)
    # pod wodzem w wejściu (10, 1–2).
    zamaluj([(10, 0), (10, 3), (10, 4), (10, 5)] + [(x, 5) for x in range(4, 10)], 'T')
    # Lodowa Twierdza — zatoka kopalni odłamków (46,15): mur x 43–44 i y 17,
    # wejście od wschodu (50, 15–16) pod strażą.
    zamaluj([(43, 15), (43, 16), (44, 15), (43, 17), (44, 17), (48, 17), (49, 17), (50, 17)], '#')
    zamaluj([(45, 17), (46, 17), (47, 17)], 'T')
    mapa[15][50] = 's'
    # Lodowa Twierdza — zatoka kopalni pokeballi (63,14): wejście (60, 14–15).
    zamaluj([(60, 13)], '#')
    # Zachodnia tundra — zatoka odnogi (x 0–9, y 32–43): mur x 9–10, wejście
    # (7–8, 31) na trakcie odnogi pod średnią strażą.
    zamaluj([(9, 31), (9, 32), (9, 33), (9, 34), (9, 35), (10, 35), (10, 36), (10, 37), (10, 38), (10, 39), (9, 39)], '#')
    # Wschodnia tundra — zatoka odnogi (x 62–71, y 33–43): wąskie wejście
    # (63, 34) między skałą y 33 i y 35, dalej mur skośnym uskokiem do ostrogi.
    zamaluj([(63, 35), (63, 36), (63, 37), (62, 37), (62, 38), (62, 39), (62, 40), (61, 40),
             (61, 41), (61, 42), (61, 43), (61, 44)], '#')
    # E5: kałuże bez funkcji — (26,40), (26–27,41), (34–35,40) i oczko
    # (22–25, 57–59) obok stawu. Wypustki jeziora SE (54, 50–51) i (50, 51)
    # zamykają północne obejście szyjki SE — zarastają borem, zamiast znikać.
    for x, y in [(26, 40), (26, 41), (27, 41), (34, 40), (35, 40)]:
        if mapa[y][x] == '~':
            mapa[y][x] = 'j'
    for x, y in [(x, y) for y in range(55, 61) for x in range(22, 27)]:
        if mapa[y][x] == '~':
            mapa[y][x] = '.'
    for x, y in [(54, 50), (54, 51), (50, 51)]:
        if mapa[y][x] == '~':
            mapa[y][x] = 'T'
    # B3/E4: puste połacie (krytyk: „obiekt co 12,4 pola, puste pola śniegu
    # x 44–62, y 3–8") — oprócz nowych obiektów kępy boru i skałki, które
    # dzielą płaszczyznę na place przy trakcie: bór pod granią doliny Lodowej
    # Twierdzy, skalny garb nad sadem, zagajnik w pustym kącie doliny gracza.
    for y, (od, do) in {0: (47, 52), 1: (47, 51), 2: (48, 51), 3: (49, 50)}.items():
        for x in range(od, do + 1):
            if mapa[y][x] in 's.j':
                mapa[y][x] = 'T'
    for x, y in [(55, 7), (56, 7), (57, 7), (56, 8), (54, 8)]:
        if mapa[y][x] in 's.j':
            mapa[y][x] = '#'
    for y, (od, do) in {50: (58, 61), 51: (57, 62), 52: (58, 61),
                        # bór w pustym kącie pod jeziorem SE i kępa na łące
                        # na wschód od traktu wschodniego
                        70: (48, 55), 71: (48, 55), 69: (50, 53),
                        53: (44, 47), 54: (43, 47),
                        # zagajnik na pustej łące nad pierwszym ekranem
                        # i kępa pod przełęczą wschodnią
                        51: (8, 14), 52: (7, 15), 48: (44, 46), 49: (43, 47),
                        # bór na brzegu jeziora SE, nad traktem do wieży
                        55: (44, 48), 56: (44, 48), 57: (46, 47)}.items():
        for x in range(od, do + 1):
            if mapa[y][x] in 's.j':
                mapa[y][x] = 'T'

    # --- Pętla 2026-10, runda 4 (krytyk: A2/C4, C1, D3, G1) ----------------
    # C4: kopalnię pokeballi (14,70) dało się obejść bokiem straży (12,68)
    # trasą (18,67) → (17,68) → (16,69) → (15,70). Kolumny x 15–16 przy
    # y 68–71 to skała — do zaułka wchodzi się tylko wąwozem (11–12, 67–70).
    zamaluj([(x, y) for x in (15, 16) for y in range(68, 72)], '#')
    # C1: zaułek odnogi NW doliny (x 5–7, y 48–51) był korytarzem na
    # południe — straż (5,52) stała w nim przy jednym artefakcie. Wylot
    # południowy zarasta borem; do zaułka wchodzi się od traktu (x 8–9,
    # y 49–50), gdzie stoi straż (`DOLINA`).
    zamaluj([(5, 52), (6, 52)], 'T')
    # C1: stos za borem (x 25–31, y 69–71) dostaje skraj boru y 68 — wejście
    # (29–30, 68) w kwadracie straży (30, 68), zamiast straży obok artefaktu.
    zamaluj([(x, 68) for x in range(25, 29)], 'T')
    # G1/F1: pusty ekran (63–71, 18–35) — polana wycięta w borze na wschód
    # od rancza (x 65–69, y 25–28), ślepa odnoga traktu ze stosem na końcu.
    zamaluj([(x, y) for x in range(65, 70) for y in range(25, 29)], 'j')
    # Wejście na polanę (65, 26–27) szerokie na dwa pola — w kwadracie
    # straży (65, 26) (`TUNDRA`; B4: straży było 9,5 %).
    zamaluj([(65, 25), (65, 28)], 'T')
    # D3: proste kreski traktów (x 11–12, y 3–21 i x 56–58, y 3–36). Skalne
    # garby 3 × 2 (scena układa z nich góry, nie drobne kopczyki) w osi
    # drogi — trakt skręca, żeby je obejść:
    #  * dolina Srebrnej Strażnicy: garb nad przełęczą (11–13, 16–17)
    #    i pod skarbcem (11–13, 6–7);
    #  * wschodnia tundra: garb pod borem (54–57, 25–27) spycha trakt na
    #    brzeg jeziora (x 53), drugi niżej (52–55, 30–31), od brzegu, z powrotem
    #    pod bór (x 56) — trakt wije się od brzegu do boru i z powrotem;
    #  * dolina Lodowej Twierdzy: garb pod murami (57–59, 12–13).
    for x0, y0 in [(11, 16), (11, 6), (57, 12)]:
        zamaluj([(x0 + dx, y0 + dy) for dx in range(3) for dy in range(2)], '#')
    zamaluj([(x, y) for x in range(54, 58) for y in range(25, 28)], '#')
    zamaluj([(x, y) for x in range(52, 56) for y in (30, 31)], '#')
    # (Runda 4 pętli wycięła polanę w borze pod korytarzem wschodniej tundry,
    # x 54–59, y 40–42 — runda 5 ją zarasta, patrz niżej.)

    # --- Pętla 2026-10, runda 5 (krytyk: G1 = NIE, B2, D3, G3) -------------
    # D3: „w krainie wroga odcinek x 58–61, y 4–20 to prosta pionowa kreska
    # przez otwartą równinę". Skalna bryła pod murami Lodowej Twierdzy
    # (56–59, 11–13) i garb w korytarzu za przełęczą (57–60, 16–17): trakt
    # od przełęczy (57,21) skręca łukiem na północny zachód (54,14), obchodzi
    # bryłę od zachodu (55,12) i wchodzi do bramy od południowego zachodu.
    # Garb (60–61, 6–7) zgina też odnogę do skarbca lodowego (x 60).
    zamaluj([(x, y) for x in range(56, 60) for y in range(11, 14)], '#')
    zamaluj([(x, y) for x in range(57, 61) for y in (16, 17)], '#')
    zamaluj([(x, y) for x in (60, 61) for y in (6, 7)], '#')
    # G1/B3: ekrany zeszły do ≤ 16 obiektów (okno 21 × 18 co 10 pól), więc
    # obiektów jest ~180, a nie 233. Żeby obiekt dalej wypadał co ≤ 11 pól
    # przejezdnych, puste połacie zarastają borem (scena składa go z kęp
    # 3 × 2) — znikają pola, przez które i tak nikt nie szedł:
    def bor(x0, y0, x1, y1):
        for y in range(y0, y1 + 1):
            for x in range(x0, x1 + 1):
                if mapa[y][x] in 's.j':
                    mapa[y][x] = 'T'
    bor(13, 0, 23, 2)      # Srebrna Strażnica: pusty śnieg pod północną granią
    bor(4, 10, 8, 11)      # Srebrna Strażnica: łąka pod sadem
    bor(54, 0, 62, 1)      # Lodowa Twierdza: śnieg pod północną granią
    bor(44, 0, 46, 2)
    bor(38, 8, 49, 10)     # Lodowa Twierdza: bór w środku pustej doliny
    bor(62, 7, 64, 10)     # Lodowa Twierdza: kąt na wschód od odnogi skarbca
    bor(54, 40, 59, 42)    # wschodnia tundra: dawna polana pod korytarzem
    bor(64, 42, 68, 43)    # zatoka wschodnia: południowy skraj
    bor(21, 41, 24, 43)    # pas za bramami: zagajniki przy przełęczach
    bor(32, 42, 38, 43)
    bor(11, 37, 17, 38)    # zachodnia dolina tundry
    bor(26, 54, 33, 55)    # dolina gracza: jałowe pole pod rozstajami
    bor(34, 57, 39, 58)
    bor(57, 51, 61, 52)    # dolina gracza: zatoka NE
    bor(66, 51, 69, 52)
    bor(54, 49, 60, 49)    # pas pod grzbietem nad zatoką NE
    bor(22, 3, 23, 8)      # Srebrna Strażnica: pas pod kręgosłupem
    bor(14, 3, 21, 3)
    bor(0, 37, 1, 43)      # zatoka zachodnia: skraj przy krawędzi
    bor(0, 32, 2, 33)
    bor(10, 31, 13, 32)    # zachodnia dolina tundry, pod murem zatoki
    bor(45, 38, 52, 38)    # za brodem: pas między traktem a ostrogą
    bor(57, 32, 61, 33)    # wschodnia tundra: między chatką a areną
    bor(52, 32, 54, 35)
    bor(21, 49, 28, 50)    # dolina gracza: łąka pod przełęczą
    bor(57, 53, 63, 53)    # zatoka NE doliny
    bor(53, 59, 57, 61)    # kieszeń SE za szyjką
    bor(40, 60, 43, 64)
    bor(0, 56, 2, 59)      # zachodni brzeg, za kadrem startu
    bor(16, 8, 21, 8)      # Srebrna Strażnica: skraj zagajnika
    bor(44, 7, 53, 7)      # Lodowa Twierdza: bór od środka doliny…
    bor(50, 8, 51, 10)
    bor(38, 11, 49, 11)    # …aż po korytarz do dolinki pod przełęczą
    bor(7, 28, 9, 29)      # tundra pod zachodnią przełęczą
    bor(5, 42, 8, 43)      # zatoka zachodnia: śnieżny kąt
    bor(16, 39, 19, 40)    # zachodnia dolina tundry, nad przełęczą
    bor(57, 35, 60, 36)    # wschodnia tundra: za stosem przy arenie
    bor(58, 23, 64, 24)    # wschodnia tundra: pod grzbietem
    bor(33, 50, 37, 51)    # dolina gracza: jałowe pole przy trakcie
    bor(51, 1, 56, 3)      # Lodowa Twierdza: pod północną granią
    bor(38, 12, 43, 12)    # Lodowa Twierdza: skraj dolinki pod przełęczą
    bor(9, 11, 11, 12)     # Srebrna Strażnica: pod sadem
    bor(47, 36, 53, 36)    # za brodem: trakt wciska się między bór a ostrogę
    bor(10, 33, 11, 36)    # zachodnia dolina tundry
    bor(11, 39, 15, 39)
    bor(36, 41, 38, 41)    # pas za bramami
    bor(36, 56, 41, 56)    # dolina gracza
    bor(16, 52, 19, 52)
    bor(31, 66, 33, 67)
    bor(44, 19, 51, 19)    # Lodowa Twierdza: skraj korytarza za przełęczą
    bor(0, 34, 0, 36)
    bor(55, 50, 57, 51)
    bor(50, 11, 53, 12)    # Lodowa Twierdza: na zachód od bramy
    bor(13, 9, 14, 10)     # Srebrna Strażnica: między sadem a traktem
    bor(26, 66, 28, 67)    # dolina gracza: południowy pas pod borem


def po_drogach(g, mapa):
    """Runda 4 pętli (krytyk G3): „w tundrze drobne kopczyki śniegu rozsiane
    między obiektami konkurują ze znajdźkami". To cienkie mury skał (zatoki
    zachodnia i wschodnia, skałki przy szyjkach): scena składa skały
    z klocków, a w murze szerokim na pole mieszczą się tylko głazy 1 × 1
    i 2 × 1 — rząd białych kopczyków. W pasie tundry (y 24–43) skała, która
    nie leży w żadnym pełnym prostokącie 3 × 2 skał (z niego scena robi
    górę), zarasta borem: mur dalej jest murem, ale wygląda jak pas świerków.
    Po wytyczeniu dróg — trakt nie przecina boru, którego jeszcze nie było."""
    w_gorze = set()
    for y in range(23, 45):
        for x in range(BOK - 2):
            pola = [(x + dx, y + dy) for dx in range(3) for dy in range(2)]
            if all(mapa[qy][qx] == '#' for qx, qy in pola):
                w_gorze.update(pola)
    for y in range(24, 44):
        for x in range(BOK):
            if mapa[y][x] == '#' and (x, y) not in w_gorze:
                mapa[y][x] = 'T'

    # Runda 6 pętli (krytyk E4/G3): „morze choinek" — bór z rundy 5 (T+#
    # 53 %) zamienił doliny w korytarze, a źródło (14,40) stało w leśnej
    # dziurze. Polany wycięte we wnętrzach dolin, tam gdzie bór nie obrysowuje
    # przejścia, zatoki ani brzegu (mury zatok, pasy przy szyjkach i skraje
    # przy krawędzi zostają). Po drogach — trakty się nie przesuwają.
    def polana(x0, y0, x1, y1, znak, bez=()):
        for y in range(y0, y1 + 1):
            for x in range(x0, x1 + 1):
                if mapa[y][x] == 'T' and (x, y) not in bez:
                    mapa[y][x] = znak
    # Zachodnia dolina tundry (x 10–19, y 31–43): mur zatoki (x 9–10) zostaje,
    # reszta boru to polana — źródło (14,40) i ognisko (13,36) widać z traktu.
    MUR_ZATOKI_W = {(9, y) for y in range(31, 36)} | {(10, y) for y in range(35, 44)} | {(9, y) for y in range(39, 44)}
    polana(10, 31, 13, 34, 'j', MUR_ZATOKI_W)
    polana(11, 35, 19, 43, 'j', MUR_ZATOKI_W)
    # Dolina gracza: polana w środkowym borze (x 26–37, y 54–63) wokół wozu
    # (32,57), połączona z południowym placem wiatraka — zostają trzy kępy
    # 3 × 2 (scena składa z nich las) i bór od wschodu (x ≥ 38), który
    # zamyka kieszeń za szyjką SE.
    polana(26, 54, 37, 63, '.', {(x, y) for x in (26, 27, 28) for y in (57, 58)}
           | {(x, y) for x in (29, 30, 31) for y in (54, 55)}
           | {(x, y) for x in (35, 36, 37) for y in (61, 62, 63)})
    # Bór na brzegach jezior (między traktem a lodem, między lodem a granią)
    # staje się lodem tego samego jeziora: brzeg dalej jest brzegiem, droga
    # idzie wzdłuż tafli zamiast wzdłuż ściany świerków, a pól przejezdnych
    # (gęstość obiektów, B3) nie przybywa. Tylko pola stykające się z lodem.
    def jezioro(pola):
        for x, y in pola:
            if mapa[y][x] == 'T':
                mapa[y][x] = '~'
    jezioro([(x, y) for y in range(24, 30) for x in range(15, 20) if (x, y) != (15, 25)]
            + [(x, 24) for x in range(20, 37)])          # zachodnie jezioro
    jezioro([(x, y) for x in range(52, 55) for y in range(32, 36)]
            + [(x, 36) for x in range(47, 54)] + [(52, 24)])          # jezioro-zapora
    jezioro([(x, y) for x in range(43, 49) for y in range(53, 57)] + [(46, 57), (52, 52)]
            + [(x, y) for x in range(50, 58) for y in (59, 60)])     # jezioro SE
    jezioro([(32, 25)])
    # Runda 7 pętli (B3): pasy jałowej ziemi szerokie na pole między traktem
    # a lodem (nikt tamtędy nie idzie) zamarzają — brzeg jeziora sięga drogi,
    # pól przejezdnych ubywa bez nowego boru: pod granią nad zakątkiem drzewa
    # wiedzy (37–43, 24), pod zachodnim jeziorem nad traktem (30–35, 40)
    # i (32, 39), na zachodnim brzegu jeziora-zapory (52–54, 27–29).
    for x, y in ([(x, 24) for x in range(37, 44)] + [(x, 40) for x in range(30, 36)] + [(32, 39)]
                 + [(52, 27), (52, 28), (53, 28), (52, 29), (53, 29), (54, 29)]):
        if mapa[y][x] == 'j':
            mapa[y][x] = '~'
    # Cypel (48, 53–54) między nowym brzegiem a jeziorem — pas na pole, lód.
    for x, y in [(48, 53), (48, 54)]:
        if mapa[y][x] in 's.j':
            mapa[y][x] = '~'


def scal_plamy(mapa, poza, najwiecej=8, przebiegi=2):
    """Wtapia drobne plamy terenu przejezdnego (`s`, `.`, `j`) w otoczenie.

    Plama to spójny (czterokierunkowo) obszar jednego znaku o najwyżej
    `najwiecej` polach; dostaje ten z przejezdnych znaków, którego ma
    najwięcej na obrzeżu. Pola prostokąta `poza` (pierwszy ekran) nie są
    ruszane — tam teren maluje ręka, nie automat.
    """
    x0, y0, x1, y1 = poza
    for _ in range(przebiegi):
        widziane = set()
        for sy in range(BOK):
            for sx in range(BOK):
                znak = mapa[sy][sx]
                if znak not in 's.j' or (sx, sy) in widziane:
                    continue
                plama, brzeg, kolejka = [], [], [(sx, sy)]
                widziane.add((sx, sy))
                while kolejka:
                    x, y = kolejka.pop()
                    plama.append((x, y))
                    for dx, dy in ((1, 0), (-1, 0), (0, 1), (0, -1)):
                        nx, ny = x + dx, y + dy
                        if not (0 <= nx < BOK and 0 <= ny < BOK):
                            continue
                        if mapa[ny][nx] == znak:
                            if (nx, ny) not in widziane:
                                widziane.add((nx, ny))
                                kolejka.append((nx, ny))
                        elif mapa[ny][nx] in 's.j':
                            brzeg.append(mapa[ny][nx])
                if len(plama) > najwiecej or not brzeg:
                    continue
                if any(x0 <= x <= x1 and y0 <= y <= y1 for x, y in plama):
                    continue
                nowy = max(sorted(set(brzeg)), key=brzeg.count)
                for x, y in plama:
                    mapa[y][x] = nowy


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


#: Pierwszy ekran po oddaleniu kamery (x 3–24, y 53–71 wokół startu).
KADR = (3, 53, 24, 71)

#: Pierwszy ekran, rozstawiony ręcznie (runda 6). Każdy wpis: lista pól do
#: wyboru (pierwsze pasujące) i obiekt. Mapa kadru — patrz `popraw_teren`:
#: staw u góry, pasmo gór po lewej, bór w prawym dolnym rogu; trakt od zamku
#: na wschód (y 62) i na północ (x 22); zalesiony pagór (16–19, 64–65),
#: skarpa (13–17, 67–68), między nimi korytarz, za skarpą zaułek z wąwozem.
PIERWSZY_EKRAN = [
    # Runda 2 (checklista G1): z 27 obiektów zostaje 11 — z jednego ekranu ma
    # być widać jedną decyzję. Reszta (obóz, gniazdo, wieża, chatka, źródło,
    # wóz, ognisko, relikt pod strażą) poszła w puste dotąd rogi doliny
    # (`DOLINA`), gdzie kończą się odnogi traktu.
    # Spichlerz jagód przy trakcie, między stawem a drogą.
    ([(18, 61), (17, 61), (19, 61)], ('kopalnia', 'jagoda')),
    # Pętla 2026-10 (A2): kopalnia odłamków na brzegu stawu nad zamkiem
    # (5 kroków od bramy), w miejscu wiatraka — obie podstawowe ≤ 10 kroków
    # i bez straży. Wiatrak idzie na wschodni plac (dawna kopalnia).
    ([(14, 60), (13, 60), (15, 60)], ('kopalnia', 'odlamek')),
    ([(21, 64), (22, 64), (21, 63)], ('budynek', 'wiatrak')),
    # Obóz łowców (złoto) w zaułku u stopy skarpy — za wąwozem ze strażą:
    # jedyna słaba straż w kadrze poza przełęczą (A5).
    ([(14, 70), (15, 70)], ('kopalnia', 'pokeball')),
    ([(12, 68), (12, 69), (11, 69)], ('potwor', 'slaby')),
    # Przełęcz przez lewe góry: kopalnia kamieni w skalnej ścianie, straż na
    # trakcie przełęczy, skrzynia za strażą.
    ([(4, 66), (5, 66)], ('kopalnia', 'kamien')),
    ([(7, 65), (7, 66)], ('potwor', 'slaby')),
    # Pętla 2026-10 (A3): skrzynia zza straży przeniesiona pod mury zamku
    # — za jaszczurem zostaje kopalnia.
    # Za stawem kupka kul na brzegu; skrzynia przy trakcie na północ; kamień
    # ewolucji przy ścieżce między wiatrakiem a spichlerzem.
    # (Runda 6 pętli, B2: kupka kul (13,54) za stawem leżała sama w polu —
    # dołącza do stosu przy kopalni (11,49), patrz `DOLINA`.)
    ([(20, 61), (20, 60)], ('skrzynia', None)),
    ([(16, 61), (15, 61)], ('surowiec', 'kamien')),
    # Pętla 2026-10 (A3, krytyk: „w 8 krokach od bramy jeden surowiec").
    # Stos łatwych nagród wokół bramy: dwie skrzynie i dwie kupki, każda
    # 3–7 kroków, bez straży — pierwszy dzień to zbieranie, nie marsz.
    # (Runda 7 pętli, G2/D1/F1: skrzynia (9,61) chowała się za lewym domkiem
    # zamku — idzie na koniec odnogi (19–20,68), patrz `DOLINA`.)
    ([(13, 66), (18, 66), (19, 66)], ('skrzynia', None)),
    ([(12, 59), (13, 58), (11, 61)], ('surowiec', 'jagoda')),
    ([(17, 63), (16, 63), (18, 63)], ('surowiec', 'odlamek')),
]


#: Ręczne rozstawienie poza kadrem (runda 2, checklista) — patrz `rozstaw`.
#: Każdy wpis jak w PIERWSZY_EKRAN: pola do wyboru i obiekt. Zasada z map
#: HoMM3: każda ślepa odnoga traktu kończy się zakątkiem ze stosem 2–4
#: rzeczy, straż stoi w szyjce albo przed zakątkiem, a między stosami jest
#: puste pole marszu.
DOLINA = [
    # Trakt na północ (rozstaje 22,56 → podnóże 29,51): źródło i wóz przy drodze.
    ([(24, 51), (25, 50), (23, 52)], ('budynek', 'zrodlo')),
    ([(31, 50), (32, 49), (31, 49)], ('budynek', 'woz')),
    # Trakt wschodni (29,51 → 37,53 → przełęcz 40,45): obóz i chatka przy drodze,
    # pod grzbietem zakątek ze stosem.
    ([(35, 55), (36, 55), (34, 56)], ('budynek', 'oboz-treningowy')),
    ([(44, 50), (43, 51), (45, 51)], ('budynek', 'chatka')),
    ([(37, 49), (36, 49)], ('surowiec', 'jagoda')),
    ([(38, 48), (37, 48)], ('surowiec', 'odlamek')),
    ([(36, 48), (35, 49)], ('skrzynia', None)),
    # Odnoga północno-zachodnia (rozstaje → 11,50): kopalnia odłamków w skale,
    # na końcu stos i relikt pod słabą strażą w zaułku przy borze.
    ([(11, 49), (12, 49), (10, 49)], ('kopalnia', 'odlamek')),
    ([(13, 49), (14, 49)], ('surowiec', 'pokeball')),
    ([(12, 50), (14, 48), (15, 49)], ('surowiec', 'pokeball')),
    # Runda 4 pętli (C1): zaułek zamknięty od południa (`popraw_teren`),
    # straż w wejściu od traktu, za nią skrzynia i relikt.
    ([(6, 50), (6, 48), (7, 48)], ('skrzynia', None)),
    ([(6, 51), (5, 51)], ('artefakt', None)),
    ([(8, 50), (8, 49)], ('potwor', 'slaby')),
    # Północno-wschodnia zatoka doliny (x 53–71, y 48–55): drugi sad, obóz
    # łowców pod strażą, ranczo; przed szyjką zatoki stos.
    ([(57, 54), (56, 54), (58, 53)], ('kopalnia', 'jagoda')),
    # (Runda 3, B1: bez drugiej kopalni pokeballi (61,49) — rzadkie kopalnie
    # w domu po jednej, reszta za strażami pogranicza i krainy wroga.)
    ([(66, 54), (65, 53), (67, 53)], ('budynek', 'ranczo')),
    ([(70, 54), (69, 53)], ('surowiec', 'jagoda')),
    # (Pętla 2026-10, E5: bez straży w szyjce zatoki NE (58, 57) — brama
    # stoi teraz w szyjce jeziora SE, patrz `SZYJKA_SE`.)
    # Zatoka SE za szyjką (x 69–71, y 56–59): straż, za nią relikt i stos.
    ([(70, 58)], ('potwor', 'sredni')),
    ([(69, 64), (70, 64)], ('artefakt', None)),
    ([(70, 66), (69, 67)], ('skrzynia', None)),
    ([(68, 62), (68, 61)], ('surowiec', 'kamien')),
    # Runda 4 pętli (C1): kieszeń pod grzbietem (63–64, 47–48) bez straży
    # przy jednej skrzyni (dawniej `skarb_w_kieszeni`, straż (62,49)) —
    # zwykły mały stos w zakątku.
    ([(64, 47), (63, 47)], ('skrzynia', None)),
    ([(63, 47)], ('surowiec', 'kamien')),
    # Runda 4 pętli (E2): budowle w środkowym pasie odległości doliny — na
    # zachodnim brzegu jeziora SE i pod zatoką NE.
    ([(47, 52), (48, 52), (48, 53)], ('budynek', 'wiatrak')),
    # B4 (surowce luzem 27 % > 25 %): dwie kupki losowania tundry mniej,
    # dwie budowle więcej — przy obozie łowców i w zatoce NE doliny.
    ([(32, 57), (31, 57), (32, 56)], ('budynek', 'woz')),
    ([(63, 50), (63, 51)], ('budynek', 'gniazdo')),
    # Odnoga SE (37,53 → 61,59): kamienna wieża na wzgórzu na końcu drogi,
    # gniazdo i ognisko przy drodze, w kącie między borami stos.
    ([(63, 59), (62, 59), (63, 58)], ('budynek', 'kamienna-wieza')),
    ([(59, 66), (58, 66)], ('budynek', 'ognisko')),
    # Runda 5 pętli (B2): skrzynia (59,62) z kieszeni przy ognisku — jeden
    # stos z kupkami i reliktem zamiast konfetti po kieszeni.
    ([(57, 65), (57, 64)], ('skrzynia', None)),
    # (E2: kupka kul z zatoki SE (70,61) — pas 4 — dołącza do tego stosu.)
    ([(56, 67), (55, 67)], ('surowiec', 'pokeball')),
    ([(53, 66), (54, 66)], ('surowiec', 'odlamek')),
    ([(54, 67), (53, 67)], ('surowiec', 'jagoda')),
    ([(52, 65), (52, 64)], ('artefakt', None)),
    # Południe doliny za borem (x 25–38, y 63–71): wiatrak, skrzynia, stos w kącie.
    # Runda 7 pętli (G1): wiatrak o pole na wschód — stos na końcu odnogi
    # (20–21, 69) dokłada dwie rzeczy do okna (10–30, 54–71), które miało 16.
    ([(31, 65), (30, 65), (32, 65)], ('budynek', 'wiatrak')),
    ([(34, 67), (35, 67)], ('skrzynia', None)),
    ([(27, 69), (26, 69)], ('surowiec', 'jagoda')),
    ([(28, 70), (29, 70)], ('surowiec', 'odlamek')),
    ([(31, 70), (30, 70)], ('artefakt', None)),
    # Runda 4 pętli (C1): straż w wejściu stosu (29–30, 68), nie obok
    # artefaktu na skraju pola.
    ([(30, 68), (29, 68)], ('potwor', 'slaby')),
    # Pętla 2026-10 (G1): rzadki ekran południowego boru (24–46, 54–72)
    # dostaje to, co zabrano z zachodniej doliny — przy trakcie (30,65)–(34,67)
    # źródło, chatka i dwie kupki, między nimi puste pole marszu.
    ([(37, 66), (36, 66), (38, 66)], ('budynek', 'zrodlo')),
    # Runda 5 pętli (B4: surowce luzem ≤ 25 %): gniazdo zamiast losowej kupki
    # tundry, na luźnym ekranie pod przełęczą wschodnią (okno 40–60 × 40–57: 5).
    ([(44, 58), (43, 58), (45, 58)], ('budynek', 'gniazdo')),
    ([(26, 65), (26, 64), (27, 64)], ('budynek', 'chatka')),
    # Runda 7 pętli (D1/F1/G2): odnoga traktu z korytarza (19–20,68) kończyła
    # się w pustej kieszeni — dostaje stos: skrzynia spod domku zamku (9,61)
    # i samotny kamień z pola (33,64).
    ([(20, 69), (19, 69), (20, 70)], ('skrzynia', None)),
    ([(21, 69), (21, 70), (19, 70)], ('surowiec', 'kamien')),
    # Runda 7 pętli (B3): stos przy chatce (44,50) w najrzadszym ekranie
    # doliny (39–59, 47–64: 5 rzeczy).
    ([(46, 50), (46, 51)], ('skrzynia', None)),
    ([(47, 50), (47, 51)], ('surowiec', 'jagoda')),
]

#: Runda 8 pętli (D1/F1): polana na zachód od stawu zamkowego (3–20,
#: 53–55) była pusta, a droga brzegiem stawu urywała się na (11,55) — stos
#: na jej końcu: skrzynia i kupka kul z węzła tundry (41,43)/(42,36).
#: Skrzynię (41,43) zdejmuje się dopiero PO losowaniu: zdjęta wcześniej
#: zmieniała okna nad przełęczami i losowe budowle doliny przetasowywały się
#: (wóz (54,69) → źródło (70,68), pas 3 → 5, garb pasów znikał).
PO_LOSOWANIU_ZDEJMIJ = [(41, 43)]
DOLINA_PO_LOSOWANIU = [
    ([(8, 54), (8, 53), (7, 54)], ('skrzynia', None)),
    ([(9, 54), (9, 53), (9, 55)], ('surowiec', 'pokeball')),
]

#: Pętla 2026-10 (E5): brama zakątków SE i NE doliny. Trakt do kamiennej
#: wieży wciska się między jezioro SE (47–57, 50–60) a pas boru (44–52,
#: 61–63) przejściem szerokim na jedno pole (49,61)–(50,62); straż stoi na
#: nim — jezioro robi szyjkę, a nie tylko obchodzi się je drogą. Za bramą
#: nie stawia się już drugiej straży przy każdej rzeczy (dawniej (51,64),
#: (53,61) i (58,57) — trzy walki w rzędzie o ten sam zakątek).
SZYJKA_SE = (50, 62)
ZA_SZYJKA_SE = lambda p: p[0] >= 50 and p[1] >= 55

TUNDRA = [
    # Runda 3 (C1): zachodnia zatoka odnogi (x 0–9, y 32–43) za jedną średnią
    # strażą w wejściu (8, 31) — `ZATOKI`. W środku kopalnia odłamków
    # w skale, sporna kopalnia pokeballi, dwa artefakty i stosy; pojedyncze
    # straże na placu (5,36), (11,38), (3,39) zniknęły.
    ([(4, 32), (3, 32), (5, 32)], ('kopalnia', 'odlamek')),
    ([(2, 34), (3, 34)], ('surowiec', 'odlamek')),
    ([(7, 35), (6, 35)], ('surowiec', 'jagoda')),
    ([(4, 35), (5, 36)], ('artefakt', None)),
    ([(6, 38), (5, 38), (7, 38)], ('kopalnia', 'pokeball')),
    # (Runda 7 pętli, G1: bez kupki kul (1,36) — przy kopalni odłamków
    # zostaje stos (2,34).)
    ([(3, 41), (2, 41)], ('surowiec', 'kamien')),
    ([(4, 42), (5, 42)], ('skrzynia', None)),
    ([(2, 39), (3, 40)], ('artefakt', None)),
    # Północno-zachodni kąt tundry pod przełęczą (x 7–13, y 23–29): stos przy
    # trakcie bez straży (dawniej artefakt pod strażą na placu (9, 27)).
    ([(10, 25), (9, 25)], ('skrzynia', None)),
    ([(11, 27), (10, 27)], ('surowiec', 'pokeball')),
    ([(8, 26), (8, 27)], ('surowiec', 'kamien')),
    ([(10, 29), (11, 29)], ('budynek', 'woz')),
    # Północna odnoga (30,41 → 40,27), za Strażą Międzyjezierza: drzewo wiedzy
    # na końcu drogi, stos i stacja kolejki (runda 3, C4: portal za strażą,
    # drugi koniec w zatoce wschodniej — kolejka nie omija żadnej straży).
    ([(40, 26), (39, 26), (41, 26)], ('budynek', 'drzewo-wiedzy')),
    ([(37, 25), (38, 25)], ('surowiec', 'kamien')),
    ([(42, 25), (43, 26)], ('surowiec', 'odlamek')),
    ([(38, 28), (37, 28)], ('skrzynia', None)),
    # Runda 7 pętli (B3/E2): drugi stos zakątka, po wschodniej stronie
    # traktu — środkowy pas odległości (41 kroków), okna (30,20) i (40,20)
    # 12 / 10.
    ([(41, 28), (42, 28)], ('skrzynia', None)),
    ([(42, 28), (42, 29)], ('surowiec', 'odlamek')),
    # (Runda 6 pętli, G1: bez skrzyni (41,29) i ogniska (43,28) — ekran
    # międzyjezierza (27–47, 24–41) miał 18 rzeczy; zostaje drzewo wiedzy
    # ze stosem i portal.)
    ([(37, 30), (38, 30), (42, 31)], ('budynek', 'portal')),
    # Wschodnia zatoka odnogi (x 62–71, y 33–43) za średnią strażą w wejściu
    # (63, 34): kopalnia kamieni w skale, wieża obserwacyjna, artefakt, stosy
    # i drugi koniec kolejki. Stadion przed zatoką, przy trakcie.
    ([(66, 34), (65, 34), (67, 34)], ('kopalnia', 'kamien')),
    ([(68, 36), (69, 36)], ('surowiec', 'kamien')),
    ([(69, 37), (70, 37)], ('skrzynia', None)),
    ([(66, 40), (67, 40), (65, 40)], ('budynek', 'wieza-obserwacyjna')),
    ([(69, 42), (70, 42)], ('artefakt', None)),
    ([(70, 39), (69, 39), (68, 38)], ('budynek', 'portal')),
    ([(59, 37), (60, 37), (58, 37)], ('budynek', 'arena')),
    # Przy brodzie, od wschodu: ognisko, żeby straż brodu miała za sobą cel.
    ([(54, 38), (53, 38)], ('budynek', 'ognisko')),
    # Trakt wschodni (56,33 → 57,21) i zachodni brzeg jeziora-zapory:
    # skrzynia i kupki przy drodze, chatka na rozstajach odnogi.
    # (Runda 8 pętli, G1/F1: kupka kul (42,36) → polana przy stawie
    # zamkowym (9,54) — węzeł tundry (38–45, 36–43) miał 7 rzeczy.)
    # Runda 5 pętli (E2): stos przed brodem od zachodu — środkowy pas
    # odległości, na luźnym ekranie (okna 21 × 18 nad brodem: 9–11).
    ([(42, 38), (41, 38)], ('skrzynia', None)),
    # Runda 8 pętli (G1): źródło z (39,37) za drogę (38,35), na zachodni
    # brzeg wyspy — przy brodzie (45,37) zostaje jedna decyzja: skrzynia
    # (42,38) i kopalnia (40,41).
    ([(36, 35), (36, 34), (37, 34)], ('budynek', 'zrodlo')),

    # (Runda 6 pętli, G1: bez wiatraka (36,34) przed brodem.)
    ([(59, 31), (60, 31)], ('budynek', 'chatka')),
    # Druga kopalnia odłamków tundry przy trakcie pod jeziorem.
    ([(23, 40), (24, 40), (22, 40), (26, 43), (25, 43), (23, 43)], ('kopalnia', 'odlamek')),
    ([(15, 34), (16, 34), (14, 35)], ('budynek', 'wiatrak')),
    # Runda 3 (B3/E2): pas sporny bogatszy od domu — stosy przy trakcie
    # w zachodniej dolinie (x 10–21, y 30–44) i pod jeziorem (y 39–44).
    # (Runda 7 pętli, G1: bez kupki jagód (12,33) — ekran zachodniej
    # tundry (0–20, 25–42) miał 20 rzeczy.)
    ([(13, 36), (14, 37)], ('budynek', 'ognisko')),
    # Runda 6 pętli (B3): kupka między ogniskiem a źródłem — stos na polanie.
    ([(12, 38), (13, 38), (14, 38)], ('surowiec', 'kamien')),
    ([(14, 40), (12, 41), (13, 40), (15, 39), (13, 38)], ('budynek', 'zrodlo')),
    # (Runda 7 pętli, G1: bez gniazda (19,42).)
    ([(27, 41), (27, 40)], ('budynek', 'chatka')),
    # Runda 4 pętli (B2/G1): pas za bramami (x 23–43, y 39–43) bez
    # losowania — było 15 rzeczy wzdłuż drogi jak konfetti. Zostają
    # jasnowidz, dwie kopalnie, chatka i jeden stos przy drodze; skrzynia
    # (42,40) i kupka (29,43) poszły na polanę za ranczem.
    # (Runda 6 pętli, G1: bez kupki (35,40) — międzyjezierze; skrzynia
    # (33,40), która została po niej sama, dołącza do stosu niżej.)
    ([(29, 43), (28, 42)], ('skrzynia', None)),
    # Runda 6 pętli (B3): po przerzedzeniu boru obiekt wypadał co 12 pól —
    # stosy 2–3 rzeczy przy trakcie pod jeziorem, poza ekranem
    # międzyjezierza (y ≥ 42), na oknach z luzem: naprzeciw kopalni (26,43)
    # i przy kopalni jagód (40,41) przed przełęczą wschodnią.
    ([(31, 42), (31, 43)], ('skrzynia', None)),
    ([(31, 43), (29, 43)], ('surowiec', 'jagoda')),
    ([(40, 42), (39, 42)], ('surowiec', 'pokeball')),
    # (Runda 8 pętli, G1/F1: skrzynia (41,43) stoi tu tylko na czas
    # losowania i po nim idzie na polanę przy stawie zamkowym (8,54) —
    # `PO_LOSOWANIU_ZDEJMIJ`.)
    ([(41, 43), (43, 42)], ('skrzynia', None)),
    # Polana za ranczem (x 66–69, y 25–28), koniec ślepej odnogi pod
    # średnią strażą w wejściu: ognisko, stos i skrzynia (z pasa za bramami
    # i z doliny Lodowej Twierdzy).
    ([(68, 26), (68, 25)], ('budynek', 'ognisko')),
    ([(68, 28), (69, 28)], ('surowiec', 'odlamek')),
    ([(69, 25), (69, 26)], ('skrzynia', None)),
    ([(69, 27), (67, 25)], ('surowiec', 'jagoda')),
    ([(65, 26), (65, 27)], ('potwor', 'sredni')),
    # Runda 7 pętli (B3/B4): relikt do stosu na polanie pod strażą (okna 15;
    # surowce luzem ≤ 26 %).
    ([(67, 25), (66, 28), (69, 26)], ('artefakt', None)),
    # Runda 7 pętli (B3/E2): stos w zakątku pod zakrętem traktu (19–20, 43),
    # poza ekranem zachodniej tundry (y ≤ 42); okna (0,30) i (10,30) 13 / 9.
    ([(19, 43), (18, 43)], ('skrzynia', None)),
    ([(18, 43), (17, 43)], ('skrzynia', None)),
    # Runda 3 (G1/B3): korytarz wschodniej tundry (44–62, 22–38) bez
    # losowania — losowe kupki zbijały się tu w 31 rzeczy na ekranie. Ręcznie,
    # co kilka pól marszu po obu stronach traktu.
    ([(57, 31), (58, 32), (57, 32)], ('budynek', 'zrodlo')),
    ([(60, 34), (61, 35)], ('surowiec', 'jagoda')),
    ([(56, 37), (55, 37)], ('skrzynia', None)),
    ([(56, 38), (55, 38), (57, 38)], ('surowiec', 'kamien')),
    # Runda 4 pętli (E2): polana pod korytarzem (x 54–59, y 40–42).
    ([(36, 27), (37, 27)], ('artefakt', None)),
]

#: Pętla 2026-10 (G1): prostokąt zachodniej doliny tundry (x0, y0, x1, y1),
#: wyłączony z losowania budowli, skrzyń i kupek.
ZACHODNIA_DOLINA = (0, 24, 21, 44)
#: Prostokąty tundry bez losowania: zachodnia dolina i zakątek za Strażą
#: Międzyjezierza z wylotem szyjki (35–43, 24–35) — ręczny stos, do którego losowanie
#: dosypywało wiatrak, portal i kupki (ekran wschodniego jeziora: 29).
BEZ_LOSOWANIA = [ZACHODNIA_DOLINA, (35, 24, 43, 35)]
# Runda 6 pętli: 28 → 20 — po polanie i kupce przy ognisku dolina ma 20
# ręcznych rzeczy; nadmiar losowania (dwie skrzynie) zbijał ekran zachodniej
# tundry z zatoką (x 1–21, y 25–42) do 22 rzeczy.
DOLINA_W_MAX = 20
WROGA_MAX = 80
#: Runda 3 (G1): pułapy nadmiaru w pasach pogranicza — (prostokąt, ile
#: obiektów najwyżej). Bez nich nadmiar szedł w środkowy pas odległości
#: i zbijał 31–33 rzeczy na ekran nad brodem i pod jeziorem.
NADMIAR_PULAPY = [
    ((44, 22, 62, 38), 22),   # korytarz wschodniej tundry przy brodzie
    ((63, 18, 71, 35), 9),    # polana za ranczem (runda 4 pętli: 6–10)
    ((42, 47, 71, 71), 34),   # dalsza dolina gracza (nadmiar od rundy 4 pętli)
    ((21, 36, 41, 53), 16),   # ekran wyjścia przełęczy (runda 4 pętli: ≤ 16)
    ((42, 36, 62, 53), 16),   # ekran brodu i jeziora SE
    ((42, 54, 62, 71), 16),   # ekran kamiennej wieży
    ((16, 36, 43, 44), 20),   # pas pod jeziorem, nad przełęczami
    ((0, 22, 14, 31), 7),     # północno-zachodni kąt tundry pod przełęczą
    ((0, 0, 32, 20), 35),     # dolina Srebrnej Strażnicy (mniejsza od Lodowej)
    ((36, 0, 71, 20), 42),    # dolina Lodowej Twierdzy
]

#: Runda 4 pętli (krytyk G1/B2): bez losowania i bez nadmiaru — pas tundry
#: za bramami (21–43, 36–44; ekran wyjścia przełęczy miał 25 obiektów,
#: dolną część pilnuje pułap w `NADMIAR_PULAPY`) i dolina Lodowej Twierdzy
#: (42–62, 0–19: 28). Rzeczy, które losowanie chciało tam postawić, idą na
#: luźniejsze ekrany (`NADMIAR`).
#: Runda 5 pętli (krytyk G1): także wschodnia tundra (48–71, 21–43) — po
#: rundzie 4 losowanie i nadmiar zbiły tam 30–32 rzeczy na ekran; zostaje
#: tylko to, co w `TUNDRA` (chatka, źródło, arena, zatoki, stosy).
ZAKAZ_LOSOWANIA = [(21, 36, 43, 44), (42, 0, 62, 19), (48, 21, 71, 43)]


def wolno_losowac(p):
    return not any(x0 <= p[0] <= x1 and y0 <= p[1] <= y1 for x0, y0, x1, y1 in ZAKAZ_LOSOWANIA)


#: Pętla 2026-10 (G1): losowanie stawia obiekt tylko tam, gdzie na ekranie
#: wokół (21 × 18 pól) stoi mniej niż `EKRAN_LIMIT` rzeczy — po wyłączeniu
#: zachodniej doliny losowe budowle zbiły się we wschodniej tundrze (33 na
#: ekranie) i w korytarzu między jeziorami (28).
#: Runda 5 pętli: 16 na oknie z siatki co 10 pól (`OKNA_X`, `OKNA_Y`) —
#: losowanie i nadmiar nie przekraczają go nigdzie, a liczby `*_LOSOWE` są
#: tak dobrane, żeby nic nie przepadało („nadmiar: nie zmieścił się" = 0).
EKRAN_LIMIT = 16

TWIERDZE = [
    # Runda 3 (C1/C3): straże krainy wroga stoją w szyjkach zatok (`ZATOKI`),
    # a artefakty — w krainie wroga zawsze relikty — leżą tylko za wodzami
    # (`SKARBCE`). Za silnymi strażami kopalnie, skrzynie i stosy.
    #
    # Srebrna Strażnica (13,11) — zatoka kopalń (x 15–20, y 14–17), wejście
    # (14, 15–16): odłamki i kamienie wcięte w skałę, stos, skrzynia.
    ([(16, 14), (15, 14)], ('kopalnia', 'odlamek')),
    ([(19, 14), (20, 14)], ('kopalnia', 'kamien')),
    ([(19, 16), (19, 17)], ('surowiec', 'odlamek')),
    ([(15, 17), (16, 16)], ('skrzynia', None)),
    # Zakątek pod borem przy trakcie do przełęczy twierdz (x 27–32, y 13–19),
    # wejście (29–30, 12): skrzynie i stosy (jasnowidz dochodzi z losowania).
    ([(26, 10), (27, 10), (25, 10)], ('budynek', 'ognisko')),
    ([(23, 11), (22, 11), (24, 10)], ('surowiec', 'kamien')),
    ([(30, 14), (31, 14)], ('skrzynia', None)),
    ([(28, 17), (28, 16)], ('surowiec', 'pokeball')),
    ([(31, 18), (30, 18)], ('budynek', 'gniazdo')),
    ([(29, 14), (28, 14)], ('surowiec', 'odlamek')),
    # Pusta dotąd dolina Srebrnej Strażnicy (x 4–16, y 4–10, B3): sad przy
    # murach, wiatrak i gniazdo przy trakcie do skarbca, stosy przy drodze.
    ([(10, 9), (9, 9), (11, 9)], ('kopalnia', 'jagoda')),
    ([(6, 8), (6, 7), (5, 8)], ('budynek', 'wiatrak')),
    ([(9, 6), (8, 7)], ('budynek', 'chatka')),
    # Runda 6 pętli (B3): stos w skalnym zakątku nad traktem do przełęczy
    # twierdz (26–28, 7–8) — okna nad nim mają 11–13 rzeczy.
    # Runda 7 pętli (B2): skrzynia na styk z kupką — stos, nie dwie kropki.
    ([(27, 8), (26, 7), (26, 8)], ('skrzynia', None)),
    ([(28, 7), (27, 8)], ('surowiec', 'odlamek')),
    # Stos pod północną granią doliny (y 0), z dala od gęstego środka.
    # Lodowa Twierdza (58,9) — zatoka kopalni pokeballi (x 61–67, y 12–16),
    # wejście (60, 14–15).
    ([(63, 14), (62, 14), (64, 14)], ('kopalnia', 'pokeball')),
    ([(66, 15), (66, 14)], ('surowiec', 'kamien')),
    ([(67, 13), (67, 12)], ('surowiec', 'pokeball')),
    ([(62, 16), (61, 14)], ('skrzynia', None)),
    # Zatoka kopalni odłamków (x 44–49, y 15–16), wejście (50, 15–16).
    ([(46, 15), (45, 15), (47, 15)], ('kopalnia', 'odlamek')),
    ([(44, 16), (45, 16)], ('surowiec', 'odlamek')),
    ([(45, 16), (48, 15), (47, 16)], ('skrzynia', None)),
    # Dolinka pod przełęczą twierdz (x 36–43, y 12–19): stos, wiatrak.
    ([(40, 17), (41, 18)], ('surowiec', 'kamien')),
    ([(39, 14), (38, 15), (40, 14)], ('budynek', 'wiatrak')),
    # Runda 7 pętli (B2/G1): bez pojedynczej skrzyni (37,18); skrzynia (42,13)
    # dołącza do stosu przy wiatraku (wiatrak, pokeball, skrzynia, kamień).
    ([(40, 15), (41, 15)], ('skrzynia', None)),
    ([(36, 15), (37, 16)], ('surowiec', 'pokeball')),
    # Pusta dotąd dolina Lodowej Twierdzy (x 44–62, y 3–8, B3): sad, źródło,
    # stosy przy trakcie do skarbca.
    ([(50, 6), (49, 6), (51, 6)], ('kopalnia', 'jagoda')),
    ([(46, 3), (47, 3), (46, 4)], ('budynek', 'zrodlo')),
    ([(54, 4), (55, 4)], ('surowiec', 'kamien')),
    ([(56, 6), (55, 6)], ('budynek', 'wiatrak')),
    ([(52, 9), (53, 9)], ('budynek', 'chatka')),
    ([(57, 4), (56, 4), (57, 5)], ('budynek', 'gniazdo')),
    # Runda 7 pętli (G1): kupka jagód przy sadzie, nie sama w polu (46,6).
    ([(48, 6), (47, 6), (46, 6)], ('surowiec', 'jagoda')),
    # Runda 5 pętli: gniazdo w korytarzu za przełęczą wschodnią (luźny ekran).
    ([(52, 18), (51, 18), (50, 18)], ('budynek', 'gniazdo')),
]

#: Runda 3 (C1): straże w szyjkach zatok — (pole, siła, nazwa). Każda zatoka
#: ma czterospójny mur (`popraw_teren`), wejście leży w kwadracie 3 × 3 straży.
ZATOKI = [
    ((14, 15), 'silny', 'Straż Srebrnej Kopalni'),
    ((30, 12), 'silny', 'Straż Zakątka pod Borem'),
    ((60, 15), 'silny', 'Straż Lodowej Kopalni'),
    ((50, 16), 'silny', 'Straż Kopalni Odłamków'),
    ((8, 31), 'sredni', 'Straż Zachodniej Zatoki'),
    ((63, 34), 'sredni', 'Straż Wschodniej Zatoki'),
]
#: Wnętrza zatok — losowanie nic do nich nie dosypuje.
ZATOKI_WNETRZA = [(15, 14, 20, 17), (27, 13, 32, 19), (61, 12, 67, 16), (44, 15, 49, 16), (62, 33, 71, 43)]

# Runda 3 (E2/B2): dom 82 obiekty > pas sporny 69 — losowanie doliny gracza
# 30 → 14, bez kupek luzem na łące x 36–52, y 48–62; nadmiar nie idzie do domu.
DOM_LOSOWE = {'kupki': 0, 'skrzynie': 0, 'budowle': 5}
# Pętla 2026-10 (G1/B4): tundra 28 → 14 budowli, 14 → 7 kupek, 12 → 8 skrzyń
# — połowa losowania szła w zachodnią dolinę, która jest teraz wyłączona;
# reszta poszła na rzadkie ekrany doliny gracza (`DOLINA`, `DOM_LOSOWE`).
TUNDRA_LOSOWE = {'kupki': 0, 'skrzynie': 0, 'budowle': 0}
# Pętla 2026-10: budowle tundry, które nie mieszczą się już w dolinach
# (zachodnia i wschodnia wyłączone z losowania), idą do krainy wroga.
# Runda 7 pętli (B2): bez losowych skrzyń — losowanie i nadmiar (2 skrzynie
# tundry) sypały je w dolinie wroga jak konfetti ((28,9), (37,9)); trzy,
# które leżały przy stosach doliny Srebrnej Strażnicy, stoją teraz ręcznie
# (`WROGA_SKRZYNIE`).
WROGA_LOSOWE = {'kupki': 0, 'skrzynie': 0, 'budowle': 0}
WROGA_SKRZYNIE = [
    ([(21, 10), (22, 10)], ('skrzynia', None)),   # przy kupce kamieni (23,11)
    ([(12, 18), (11, 18)], ('skrzynia', None)),   # pod przełęczą, przy jasnowidzu
    ([(8, 16), (7, 16)], ('skrzynia', None)),     # przed skarbcem wodza (5,16)
]


def odleglosc(a, b):
    return max(abs(a[0] - b[0]), abs(a[1] - b[1]))


def bez_zajetych_kieszeni(g, ktora):
    """Wykreśla z listy kieszeni silnika te, w których już coś stoi albo
    których szyjka jest zajęta — losowy skarb w kieszeni (`skarb_w_kieszeni`)
    nie dosypuje wtedy do ręcznie ułożonego zakątka (przy kopalni pod strażą
    wszystkie wolne pola kieszeni „zatykały drogę")."""
    zajete = {p for p, _ in g.obiekty}
    g.kieszenie[ktora] = [
        k for k in g.kieszenie.get(ktora, [])
        if k[0] not in zajete and not (set(k[1]) & zajete)
    ]


def skarb_w_zakatku(g, ktora, kolo, sila, nagrody):
    """Skarb w WYBRANYM zakątku: kieszeń silnika, której szyjka leży najbliżej
    `kolo`. Szyjkę liczy silnik (`znajdz_kieszenie`) — straż postawiona ręcznie
    o pole obok dostawała drugą, silnikową, w tej samej szyjce."""
    kieszenie = g.kieszenie.get(ktora, [])
    wybrana = min((k for k in kieszenie if k[0] not in g.zajete), key=lambda k: odleglosc(k[0], kolo), default=None)
    if wybrana is None or odleglosc(wybrana[0], kolo) > 3:
        print(f'  zakątek przy {kolo}: silnik nie zna tam kieszeni')
        return []
    kieszenie.remove(wybrana)
    szyjka, pola = wybrana
    wolne = [q for q in pola if g.mapa[q[1]][q[0]] in '.,js']
    polozone = []
    for wpis in nagrody:
        polozone += g.dodaj(1, ktora, (0, 999), lambda p, w=wpis: w, kandydaci=wolne)
    g.zajete.append(szyjka)
    g.obiekty.append((szyjka, ('potwor', sila)))
    # Reszta zakątka zostaje pusta — losowanie nie dosypie tam nic więcej.
    g.zajete += [q for q in pola if q not in g.zajete]
    return polozone


def przy_drodze(g, ktora, zasieg=2):
    """Wolne pola strefy w pobliżu traktu — tam leżą surowce luzem i skrzynie
    (checklista B2: „tam, gdzie prowadzi droga, nie konfetti po łące")."""
    m = g.mapa
    return [
        (x, y)
        for x, y in g.wolne_pola(ktora, (0, 999), 2)
        if any(
            g.w(x + dx, y + dy) and m[y + dy][x + dx] == '='
            for dy in range(-zasieg, zasieg + 1)
            for dx in range(-zasieg, zasieg + 1)
        )
    ]


def na_ekranie(g, p):
    """Ile obiektów widać na ekranie 21 × 18 ze środkiem w `p`."""
    return sum(1 for q, _ in g.obiekty if abs(q[0] - p[0]) <= 10 and abs(q[1] - p[1]) <= 9)


#: Runda 5 pętli (krytyk G1): kadry, którymi liczymy ekran — okno 21 × 18
#: przesuwane co 10 pól (i dosunięte do prawej i dolnej krawędzi). Tak liczy
#: krytyk; dawniej `gestosc` brała wszystkie położenia kadru i pułap 22.
OKNA_X = list(range(0, BOK - 21 + 1, 10)) + [BOK - 21]
OKNA_Y = list(range(0, BOK - 18 + 1, 10)) + [BOK - 18]


def okna(g):
    """{(x0, y0): obiektów w oknie 21 × 18 z lewym górnym rogiem (x0, y0)}."""
    return {(x0, y0): sum(1 for (x, y), _ in g.obiekty if x0 <= x < x0 + 21 and y0 <= y < y0 + 18)
            for x0 in OKNA_X for y0 in OKNA_Y}


def gestosc(g, pola):
    """{pole: obiektów na najgęstszym oknie 21 × 18 (siatka co 10 pól),
    na którym to pole widać}."""
    ile = okna(g)
    return {(x, y): max(n for (x0, y0), n in ile.items() if x0 <= x < x0 + 21 and y0 <= y < y0 + 18)
            for x, y in pola}


def luzne(g, pola, limit=None):
    """Pola, na których każdym ekranie stoi mniej niż `EKRAN_LIMIT` obiektów."""
    limit = limit or EKRAN_LIMIT
    return [p for p, n in gestosc(g, pola).items() if n < limit]


#: Obiekty losowania, które nie zmieściły się na luźnych ekranach swojej
#: strefy — `rozstaw` kładzie je na końcu tam, gdzie na planszy jest luźno.
NADMIAR = []


def dodaj_luzno(g, ile, ktora, buduj, pola):
    """`g.dodaj` po jednym, za każdym razem tylko na luźnych polach z `pola`;
    reszta idzie do `NADMIAR` (gęstość planszy, checklista B3, się nie zmienia)."""
    for _ in range(ile):
        obok = [q for q, _ in g.obiekty]
        kand = luzne(g, [p for p in pola if p not in g.zajete and wolno_losowac(p)
                         and all(odleglosc(p, q) >= 2 for q in obok)])
        try:
            if not kand:
                raise SystemExit
            g.dodaj(1, ktora, (0, 999), buduj, kandydaci=kand)
        except SystemExit:
            NADMIAR.append((buduj, None))


def rozloz_nadmiar(g):
    """Nadmiar losowania przy trakcie dowolnej strefy poza kadrem startu,
    na najluźniejszym ekranie."""
    print(f'  nadmiar losowania: {len(NADMIAR)} {[b(None) for b, _ in NADMIAR]}')
    poza = [KADR] + BEZ_LOSOWANIA
    najdalej = max(g.kroki.values())
    zx0, zy0, zx1, zy1 = ZACHODNIA_DOLINA
    w_dolinie = lambda p: zx0 <= p[0] <= zx1 and zy0 <= p[1] <= zy1
    while NADMIAR:
        buduj, budowla = NADMIAR.pop(0)
        # Zachodnia dolina to środkowy pas odległości (E2): przyjmuje nadmiar,
        # ale najwyżej do `DOLINA_W_MAX` rzeczy (w rundzie 2 było 43).
        dolina_otwarta = sum(1 for q, _ in g.obiekty if w_dolinie(q)) < DOLINA_W_MAX
        # Runda 3 (E2): pas sporny ma być najbogatszy — kraina wroga przyjmuje
        # nadmiar najwyżej do `WROGA_MAX` obiektów.
        strefy = ['pogranicze'] + (['wroga'] if sum(1 for q, _ in g.obiekty if strefa(*q) == 'wroga') < WROGA_MAX else [])
        # Runda 4 pętli (E2/G1): po wyłączeniu wyjścia przełęczy i doliny
        # Lodowej Twierdzy nadmiar nie mieścił się w pułapach (17 rzeczy
        # przepadało). Przyjmuje go też dalsza część doliny gracza — tylko
        # środkowy pas odległości (≥ 40 % najdalszego zakątka, zakątki SE),
        # żeby dom nie rósł przy zamku.
        w = lambda p, r: r[0] <= p[0] <= r[2] and r[1] <= p[1] <= r[3]
        pelne = [r for r, ile in NADMIAR_PULAPY if sum(1 for q, _ in g.obiekty if w(q, r)) >= ile]
        pola = [p for k in strefy + ['dom'] for p in przy_drodze(g, k, 3)
                if wolno_losowac(p)
                and (strefa(*p) != 'dom' or g.kroki.get(p, 0) >= 0.4 * najdalej)
                and (not any(w(p, r) for r in poza) or (dolina_otwarta and w_dolinie(p)))
                and not any(w(p, r) for r in pelne)]
        if budowla:
            budynki = [q for q, co in g.obiekty if co[0] in ('budynek', 'kopalnia', 'jasnowidz')]
            takie = [q for q, co in g.obiekty if co == ('budynek', budowla)]
            luzno = [p for p in pola if all(odleglosc(p, q) >= 3 for q in budynki)]
            pola = [p for p in luzno if all(odleglosc(p, q) > 9 for q in takie)] or luzno
        obok = [q for q, _ in g.obiekty]
        pola = [p for p in pola if p not in g.zajete and all(odleglosc(p, q) >= 2 for q in obok)]
        # Najluźniejsze miejsce planszy: pola, których najgęstszy ekran ma
        # najmniej obiektów — a spośród prawie tak samo luźnych (+4) te ze
        # środkowego pasa odległości (40–60 % najdalszego zakątka), żeby
        # garb nagród został w środku drogi (checklista E2).
        # Runda 5 pętli: tylko tam, gdzie okno zostanie ≤ `EKRAN_LIMIT`
        # (krytyk: „nadmiar przeniesiony z NE przeładował wschodnią tundrę").
        oceny = {p: n for p, n in gestosc(g, pola).items() if n < EKRAN_LIMIT}
        dodane = False
        for zapas in (0, 1, 2, 4, 99):
            if not oceny or dodane:
                break
            prog = min(oceny.values()) + zapas
            kand = [p for p, n in oceny.items() if n <= prog]
            srodek = [p for p, n in oceny.items() if n <= prog + 1
                      and 0.4 * najdalej <= g.kroki.get(p, 0) < 0.6 * najdalej]
            for lista in (srodek, kand):
                if not lista:
                    continue
                try:
                    g.dodaj(1, strefa(*lista[0]), (0, 999), buduj, kandydaci=lista)
                    dodane = True
                    break
                except SystemExit:
                    continue
        if not dodane:
            print(f'  nadmiar: nie zmieścił się {buduj(None)}')


def budowle_z_odstepem(g, ile, ktora, pula, odstep=3):
    """`g.budowle`, ale każda budowla co najmniej `odstep` pól od innych
    obiektów (pętla 2026-10, G2: gniazda (39,36) i (41,35) nachodziły na
    siebie rysunkami, zabudowa doliny stała na styk). Gdy w strefie nie ma
    już tak luźnego miejsca — o pole ciaśniej (nigdy bliżej niż 3 pola od
    innej budowli). Ta sama budowla nie staje drugi raz w promieniu 9 pól —
    trzy źródła w jednej dolinie to tapeta, nie mapa."""
    for i in range(ile):
        b = pula[i % len(pula)]
        budynki = [q for q, co in g.obiekty if co[0] in ('budynek', 'kopalnia', 'jasnowidz')]
        takie = [q for q, co in g.obiekty if co == ('budynek', b)]
        buduj = lambda p, b=b: ('budynek', b)
        for o in range(odstep, 1, -1):
            kand = luzne(g, [p for p in g.wolne_pola(ktora, (0, 999), 2)
                             if wolno_losowac(p)
                             and all(odleglosc(p, q) >= o + 1 for q in budynki)
                             and all(odleglosc(p, q) > 9 for q in takie)])
            if not kand:
                continue
            try:
                g.dodaj(1, ktora, (0, 999), buduj, kandydaci=kand)
                break
            except SystemExit:
                continue
        else:
            NADMIAR.append((buduj, b))


def postaw_kadr(g, miejsca, wpis):
    """Obiekt pierwszego ekranu na pierwszym pasującym polu z listy."""
    sx, sy = PUNKTY['start']
    zajete = {q for q, _ in g.obiekty} | g.blokada | set(PUNKTY.values())
    for x, y in miejsca:
        if not g.w(x, y) or g.mapa[y][x] not in '.,js' or (x, y) in zajete:
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


def postaw_recznie(g, lista):
    """Obiekty ustawione ręcznie poza kadrem — ten sam mechanizm co pierwszy
    ekran: lista pól do wyboru i obiekt, pierwsze pasujące pole."""
    polozone = []
    for miejsca, wpis in lista:
        pole = postaw_kadr(g, miejsca, wpis)
        if pole is not None:
            polozone.append((pole, wpis))
    return polozone


def rozstaw(g):
    rng = g.rng

    # --- STRAŻE PRZEJŚĆ ------------------------------------------------------
    # Stoją NA przejściach: potwór blokuje pole i osiem wokół, więc przejście
    # szerokie na dwa pola jest zamknięte w całości. Strażnicy grzbietu
    # południowego to pierwszy prawdziwy sprawdzian armii; wodzowie grzbietu
    # północnego — brama do twierdz.
    g.postaw((29, 46), ('potwor', 'straznik', 'Strażnik Mroźnej Przełęczy'))
    g.postaw((40, 46), ('potwor', 'straznik', 'Strażnik Tundry'))
    # Zachodnia przełęcz prowadzi do słabszej twierdzy — pilnuje jej strażnik,
    # nie wódz; symulacja z wodzem po obu stronach nigdy nie zdobywała drugiej.
    g.postaw((12, 21), ('potwor', 'straznik', 'Strażnik Zachodniej Przełęczy'))
    g.postaw((57, 21), ('potwor', 'wodz', 'Wódz Wschodniej Przełęczy'))
    g.postaw((34, 9), ('potwor', 'silny', 'Straż Przełęczy Twierdz'))
    # Runda 2 (checklista): bród między tundrami i szyjka północnej odnogi.
    g.postaw((45, 37), ('potwor', 'sredni', 'Straż Brodu'))
    g.postaw((40, 33), ('potwor', 'sredni', 'Straż Międzyjezierza'))

    # Pętla 2026-10 (G1): najpierw WSZYSTKO, co ręczne i stałe (stosy,
    # zakątki pod strażą, kopalnie, relikt), we wszystkich strefach, potem
    # losowanie — `luzne` widzi wtedy całą planszę. Przy kolejności strefa po
    # strefie losowe kupki doliny gracza zapełniały ekran nad przełęczami,
    # zanim stanęły na nim ręczne stosy tundry (ekran 23–43, 39–56: 28).

    # --- DOLINA GRACZA: ręcznie ---------------------------------------------
    for miejsca, wpis in PIERWSZY_EKRAN:
        postaw_kadr(g, miejsca, wpis)
    g.zajete += [(x, y) for y in range(KADR[1], KADR[3] + 1) for x in range(KADR[0], KADR[2] + 1)
                 if strefa(x, y) == 'dom']
    g.postaw(SZYJKA_SE, ('potwor', 'slaby', 'Straż Lodowego Brzegu'))
    postaw_recznie(g, DOLINA)
    # Runda 4 pętli (C1): bez `strzez` i `skarb_w_kieszeni` — straż stawała
    # obok jednej rzeczy na placu albo przy skrzyni w kieszeni. Straże doliny
    # stoją w wejściach zaułków (`DOLINA`).

    # --- TUNDRA: ręcznie -----------------------------------------------------
    # Runda 3 (C1): bez `strzez` — straż przy artefakcie albo kopalni stawała
    # na placu obok niej i dało się ją obejść. Straże pogranicza stoją
    # w szyjkach zatok (`ZATOKI`), a zawartość zatok jest zarezerwowana.
    rng = g.rng = random.Random(ZIARNO + TUNDRA_ZIARNO)
    postaw_recznie(g, TUNDRA)
    rezerwa = [(x, y) for zx0, zy0, zx1, zy1 in BEZ_LOSOWANIA
               for y in range(zy0, zy1 + 1) for x in range(zx0, zx1 + 1) if (x, y) not in g.zajete]
    g.zajete += rezerwa
    # Runda 4 pętli: kopalnia jagód i chata jasnowidza pogranicza na stałych
    # miejscach za bramami (dawniej z losowania — po zmianach terenu sad
    # wypadał przy samej straży zatoki wschodniej).
    postaw_recznie(g, [([(40, 40), (39, 40), (40, 41)], ('kopalnia', 'jagoda')),
                       ([(23, 39), (22, 39), (24, 39)], ('jasnowidz', None))])

    # --- DOLINY TWIERDZ: ręcznie ---------------------------------------------
    rng = g.rng = random.Random(ZIARNO + TWIERDZE_ZIARNO)
    postaw_recznie(g, TWIERDZE)
    # Runda 3 (C3): skarbce pod wodzami mają to, czego nie ma nigdzie
    # indziej — relikty (w krainie wroga artefakt jest zawsze reliktem,
    # a poza skarbcami nie leży tam żaden) i Ośrodek Ewolucji (dawniej bez
    # straży pod murami Lodowej Twierdzy).
    skarb_w_zakatku(g, 'wroga', (4, 16), 'wodz', [('artefakt', None), ('artefakt', None), ('skrzynia', None)])
    skarb_w_zakatku(g, 'wroga', (63, 3), 'wodz', [('budynek', 'osrodek-ewolucji'), ('artefakt', None), ('skrzynia', None)])
    # Najdalszy relikt: skarbiec w północno-zachodnim rogu doliny Srebrnej
    # Strażnicy (x 4–9, y 0–4, mur w `popraw_teren`), wódz w wejściu (10, 1).
    wnetrze = [(x, y) for y in range(0, 5) for x in range(4, 10)
               if g.mapa[y][x] in '.,js' and (x, y) not in g.zajete]
    for wpis in [('artefakt', None), ('skrzynia', None), ('surowiec', 'kamien')]:
        g.dodaj(1, 'wroga', (0, 999), lambda p, w=wpis: w,
                kandydaci=[q for q in wnetrze if all(odleglosc(q, o) >= 2 for o, _ in g.obiekty)] or wnetrze)
    g.zajete += wnetrze
    g.postaw((10, 1), ('potwor', 'wodz', 'Wódz Srebrnego Skarbca'))
    for pole, sila, nazwa in ZATOKI:
        g.postaw(pole, ('potwor', sila, nazwa))
        g.zajete += [(pole[0] + dx, pole[1] + dy) for dx in (-1, 0, 1) for dy in (-1, 0, 1)]
    g.zajete += [(x, y) for x0, y0, x1, y1 in ZATOKI_WNETRZA
                 for y in range(y0, y1 + 1) for x in range(x0, x1 + 1)]
    # Runda 4 pętli: chata jasnowidza krainy wroga pod przełęczą Srebrnej
    # Strażnicy (z losowania wypadała w dolinie Lodowej Twierdzy — G1).
    postaw_recznie(g, [([(9, 19), (9, 18), (8, 18), (10, 18), (8, 19)], ('jasnowidz', None))])
    postaw_recznie(g, WROGA_SKRZYNIE)

    pelne = {o: n for o, n in okna(g).items() if n > EKRAN_LIMIT}
    print(f'  okna > {EKRAN_LIMIT} po ręcznym rozstawieniu: {pelne}')

    # --- LOSOWANIE (luźne ekrany) --------------------------------------------
    rng = g.rng = random.Random(ZIARNO + 62)
    dodaj_luzno(g, DOM_LOSOWE['kupki'], 'dom', lambda p: ('surowiec', rng.choice(['jagoda', 'odlamek', 'pokeball'])),
                [p for p in przy_drodze(g, 'dom') if 12 <= g.kroki.get(p, 0) <= 40])
    dodaj_luzno(g, DOM_LOSOWE['skrzynie'], 'dom', lambda p: ('skrzynia', None),
                [p for p in przy_drodze(g, 'dom') if 12 <= g.kroki.get(p, 0) <= 40])
    budowle_z_odstepem(g, DOM_LOSOWE['budowle'], 'dom', ['ognisko', 'wiatrak', 'zrodlo', 'woz', 'chatka', 'gniazdo'])

    rng = g.rng = random.Random(ZIARNO + 63)
    dodaj_luzno(g, TUNDRA_LOSOWE['skrzynie'], 'pogranicze', lambda p: ('skrzynia', None), przy_drodze(g, 'pogranicze'))
    dodaj_luzno(g, TUNDRA_LOSOWE['kupki'], 'pogranicze', lambda p: ('surowiec', rng.choice(['jagoda', 'odlamek', 'kamien', 'pokeball'])),
                przy_drodze(g, 'pogranicze'))
    # Runda 2 (checklista F3): wieża obserwacyjna i obóz treningowy nie
    # wracają w losowaniu — po jednym na planszę, ustawione ręcznie (wieża
    # w kącie wschodniej tundry, obóz przy trakcie doliny); losowanie daje
    # tylko zwykłe budowle, które w HoMM3 stoją po kilka razy.
    budowle_z_odstepem(g, TUNDRA_LOSOWE['budowle'], 'pogranicze', [
        'ranczo', 'gniazdo', 'wiatrak', 'ognisko', 'chatka', 'woz', 'zrodlo',
    ])
    rezerwa = set(rezerwa)
    g.zajete = [q for q in g.zajete if q not in rezerwa]

    rng = g.rng = random.Random(ZIARNO + 64)
    # Runda 2 (checklista C1): skrzynie krainy wroga przy trakcie, bez własnej
    # straży — silna straż pilnująca jednej skrzyni na placu to błąd; kraina
    # i tak leży za strażnikiem i wodzem przełęczy.
    dodaj_luzno(g, WROGA_LOSOWE['skrzynie'], 'wroga', lambda p: ('skrzynia', None), przy_drodze(g, 'wroga'))
    dodaj_luzno(g, WROGA_LOSOWE['kupki'], 'wroga', lambda p: ('surowiec', rng.choice(['kamien', 'odlamek', 'pokeball'])),
                przy_drodze(g, 'wroga'))
    budowle_z_odstepem(g, WROGA_LOSOWE['budowle'], 'wroga', [
        'gniazdo', 'zrodlo', 'wiatrak', 'ognisko', 'woz', 'chatka',
    ])
    rozloz_nadmiar(g)
    for pole in PO_LOSOWANIU_ZDEJMIJ:
        wpis = next(co for q, co in g.obiekty if q == pole)
        g.obiekty.remove((pole, wpis))
        g.zajete = [q for q in g.zajete if q != pole]
        g.blokada.difference_update([pole] + g.pola_bryly(wpis[0], wpis[1], pole))
    postaw_recznie(g, DOLINA_PO_LOSOWANIU)

    # Runda 4 (HotA): spichlerz jagód (20, 60) i kopalnia odłamków (23, 60)
    # mają bryłę w rzędzie nad wejściem — w stawie. Na ekranie stały na
    # lodzie jak doklejone. Po rozstawieniu (nic się nie przesuwa) brzeg pod
    # nimi i pod wiatrakiem zamarza w śnieżny cypel: pola bryły i tak są
    # zablokowane, a rząd 58 to kawałek brzegu przy drodze.
    for x, y in [(13, 59), (14, 59), (15, 59), (19, 59), (20, 59), (21, 59), (22, 59),
                 (19, 58), (20, 58), (21, 58), (23, 58), (16, 60), (21, 60),
                 # Runda 6 pętli (krytyk E3/E5): kałuża (15,60) przy kopalni
                 # odłamków — jedno pole lodu bez funkcji, zostaje łąką.
                 (15, 60)]:
        if g.mapa[y][x] == '~':
            g.mapa[y][x] = 's'

    # Runda 10 (HotA): „śnieżne pola pod jeziorem martwe — drugi biom albo
    # strefa przejściowa". Pod stawem, wokół wiatraka i spichlerza, śnieg
    # przechodzi w wywianą tundrę (`.` z teksturą `tundra`: płowe trawy,
    # borówki, kamienie przez cienki śnieg). Nieregularny płat, brzeg
    # postrzępiony, żeby nie wyglądał jak prostokąt. Malowany PO drogach
    # i rozstawieniu: tańsza darń przyciągała trasę traktu przez plac.
    for y, (od, do) in {59: (12, 15), 60: (12, 21), 61: (13, 21), 62: (19, 22), 63: (14, 18)}.items():
        for x in range(od, do + 1):
            if g.mapa[y][x] == 's':
                g.mapa[y][x] = '.'

    # Runda 5 (HotA): „droga urywa się za szopą, obiekty rozsypane na chybił
    # trafił — biel na bieli nie mówi, którędy się idzie". Krótkie odnogi
    # traktu w pierwszym ekranie, jak w HotA: od rozstajów pod zamkiem do kopalni
    # odłamków, od traktu do placu z chatą i wiatrakiem oraz do strzeżonego
    # skupiska przy ognisku (straż, skrzynia, relikt, kupki). Malowane PO
    # rozstawieniu: nic się nie przesuwa, a pod obiektami droga i tak jest
    # przejezdna. Tylko na śniegu, darni i tundrze — nie na lodzie ani skałach.
    # (Odnoga od bramy zamku biegła pod rysunkiem gór — idzie od rozstajów.)
    # Runda 6: odnogi wiodą tam, gdzie teraz stoją rzeczy pierwszego ekranu —
    # od startu w dół korytarzem między pagórem a skarpą do zatoczki, odbicie
    # do wąwozu ze strażą, plac z chatą i wiatrakiem, kopalnia odłamków.
    for x, y in [(13, 63), (13, 64), (13, 65), (14, 66), (15, 66), (16, 66), (17, 66), (18, 67),  # korytarz
                 (12, 66), (12, 67),                    # → wąwóz
                 (13, 61), (12, 60), (11, 60),          # plac: chata, wiatrak
                 (19, 63), (20, 64),                    # → kopalnia odłamków
                 # Runda 9: zamek jest teraz 1,8 raza większy — brama
                 # dostaje własny zjazd na trakt, zamiast wejścia w śniegu.
                 (11, 64), (12, 64),
                 # Runda 10 (HotA): „cała mapa to jedna droga; lewa trzecia
                 # martwa, bez odnóg ze skarbami". Trzy nowe odnogi: od bramy
                 # zamku przełęczą na zachód do kopalni kamieni; od placu
                 # z wiatrakiem brzegiem stawu do wieży i chatki; przez wąwóz
                 # do obozu łowców w zaułku.
                 (9, 64), (8, 65), (7, 65), (6, 65), (5, 66), (4, 66),
                 (11, 59), (11, 58), (10, 57), (10, 56), (11, 55),
                 (10, 54),   # runda 8 pętli: do stosu (8–9, 54)
                 (12, 68), (12, 69), (13, 70), (14, 70),
                 # Runda 12: z zatoczki na polanę w borze.
                 (19, 68), (20, 68)]:
        if g.mapa[y][x] in 's.j':
            g.mapa[y][x] = '='

    # Runda 3 (krytyk E3/G4): „zamek gracza stoi w białej plamie śniegu, takiej
    # samej jak kraina wroga". Cała dolina gracza (strefa domu, y ≥ 47) to
    # wywiana tundra — płowa, cieplejsza od białej północy; śnieg zostaje
    # w tundrze pod grzbietami i w dolinach twierdz. Po drogach i rozstawieniu
    # (tańsza darń nie przyciąga traktów, obiekty stoją tam, gdzie stały).
    for y in range(47, BOK):
        for x in range(BOK):
            if g.mapa[y][x] == 's':
                g.mapa[y][x] = '.'


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
    # Mapa świata w stylu Pokémon: las i skały z klocków (`src/data/klocki.ts`).
    'klocki': 'zima',
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
    # I odwrotnie: gracz wie, gdzie stoją obie twierdze — misja mówi „zdobądź
    # obie na północy", a mapa to pokazuje. Zagadką jest droga, nie szukanie celu.
    # Runda 11 (gracz): same twierdze, po małej łatce. Odsłonięta zachodnia
    # połowa doliny gracza (rundy 8) zniknęła — jak w Heroes, na starcie widać
    # okolicę bohatera i własnego zamku (`nowaGra` w `plansza.ts`).
    'odkryte': [
        {'x': 58, 'y': 8, 'promien': 2},
        {'x': 13, 'y': 10, 'promien': 2},
    ],
    # Runda 3 (wzorzec HotA): znajdźki na pół pola z cieniem i rysunkiem stosu
    # leżącego w śniegu (`public/mapa/zima/stos-*.png`) zamiast ikon z paska.
    # Runda 5 (HotA): „zasoby, skrzynie i flagi mają 1/3 kafla, bez cieni,
    # giną na śniegu — powiększyć 1,5–2 razy". Trzy czwarte pola i ciemny
    # obrys obiektów gry (jak Bagna/Polana) — odróżnia je od zasp i głazów.
    # Runda 8 (HotA): „obiekty są za małe" — stosy prawie na całe pole.
    # Runda 9 (HotA): „skrzynie, kryształy i ametysty są prawie wielkości
    # budynków — hierarchia skali się rozpada; znajdźki do około pół kafla".
    # Runda 10 (HotA): „zasoby i stwory to malutkie płaskie naklejki bez
    # osadzenia w podłożu, w innej skali niż szczegółowy zamek". Nowe stosy
    # (PROMPTY-PLANSZE §24: kryształy, skrzynka, kosz wciśnięte w zaspę)
    # trochę większe, spód grzęźnie w śniegu (`osadzZnajdzki`), strażnicy
    # o jedną piątą wyżsi — prawie jak bohater (1,5 pola).
    # Stworki, runda 2: strażnicy i bohater urośli we wszystkich planszach
    # (`WYS_STRAZNIKA` 1,6, `WYS_BOHATERA` 1,9 w `src/visual/uklad.ts`),
    # więc mnożnik wraca do 1 — skala stworów taka sama jak na Polanie i Bagnach.
    # (Storki w stylu mapy, runda 3: smok przy 1,2 był jak góra — ten sam wniosek.)
    'znajdzki': 0.72,
    'osadzZnajdzki': 0.2,
    'skalaStrazy': 1.0,
    # Runda 10: łąka to tundra — bez białych zasp sceny na co trzecim polu.
    'bezOzdobTrawy': True,
    # Runda 9 (HotA): „zamek ledwie większy od chaty i młyna — powiększyć
    # co najmniej dwa razy; twierdza ma dominować nad lasem jak siedziba".
    # Runda 11 (HotA): „zamek kilka razy większy od bohatera i młyna, wiatrak
    # mniejszy od chaty obok — skala się nie trzyma". Zamek o jedną szóstą
    # niżej (dalej największy w kadrze), budowle o 30% wyżej: wiatrak nad
    # spichlerzem, jak w HotA (młyn ≈ 3 pola, zamek ≈ 4,5).
    'skalaZamku': 1.15,
    'skalaBudowli': 1.3,
    # Runda 9 (HotA): „świerki w prawej dolnej ćwiartce wyższe od zamku i młyna
    # — drzewa do skali kafla". Kępy boru (nowe rysunki: zwarty masyw małych
    # świerków, PROMPTY-PLANSZE §3) rysowane mniejsze, stopa na miejscu.
    'skalaKepLasu': 0.76,
    # Runda 8 (HotA): „wiatrak, chata nad jeziorem i chatka wiszą na śniegu
    # jak naklejki". Szeroka plama cienia spod śnieżnej podstawki przyciemniała
    # sinawy śnieg wokół budynku, a jasna podstawka nad nią czytała się jak
    # półka. Cień węższy (pod samymi ścianami) i słabszy; zaspy przy ścianach
    # to teraz `zima/krzak*` (PROMPTY-PLANSZE §21).
    'cienBudowli': {'szer': 0.7, 'krycie': 0.6},
    # Runda 11 (HotA): „skrzynki, kryształy i stwory nie mają cieni
    # kontaktowych — unoszą się nad śniegiem". Na jasnym, sinawym śniegu
    # zwykły cień ginął: pod drobnymi rzeczami szerszy i wyraźniejszy.
    # Stwory na mapie, runda 6: przy 1,6 (razy mnożnik `cienNaSniegu`)
    # podkładka wychodziła pełnym, płaskim niebieskim owalem — jak znacznik
    # zaznaczenia. 1,0: dalej wyraźna na śniegu, ale miękka.
    'cienZnajdzek': {'szer': 1.25, 'krycie': 1.0},
    # Runda 12 (HotA): „obiekty drobne, bez cienia, jak ikony wklejone na
    # śnieg; góry wiszą na białym tle". Ciepła czerń cienia na bieli ginęła
    # w szarości — cień na śniegu jest sinoniebieski (jak w HoMM3) i mocniejszy;
    # góry i kępy boru rzucają miękki cień w prawo-dół.
    'cienNaSniegu': {'barwa': 0x3a4a78, 'krycie': 1.35, 'gory': 0.55, 'las': 0.32},
    # Runda 7 (HotA): „budynki jak naklejki na owalnych wysepkach śniegu
    # z twardą krawędzią". Podstawki budowli rozpływają się teraz w tle
    # (`wtopPodstawe` w `wsad_wczytaj.py`), a ciemny obrys — osiem
    # przyciemnionych kopii sylwetki — zamieniał ten miękki brzeg z powrotem
    # w ciemny owal. Bez obrysu; obiekty odcina od śniegu cień kontaktowy.
    # Runda 4 (HotA): „pasmo gór po lewej to ten sam ośnieżony szczyt wklejony
    # w siatkę rzędami — tapeta, a nie masyw". W pierwszym ekranie góry stoją
    # ręcznie, pięć różnych rysunków w różnej skali (`public/mapa/zima/gora-N`,
    # PROMPTY-PLANSZE §15), jeden za drugim jak w HotA: pogórze nad stawem,
    # za nim wysoki samotny szczyt, przed nim długi grzbiet z przełęczą,
    # w lewym dolnym rogu dwa szczyty z siodłem i skalny pagór ze świerkami.
    # `x`, `y` — stopa rysunku w polach (krawędzie pól), `szer` w polach.
    'masywy': [
        # Runda 11 (HotA): „gigantyczne góry w lewym dolnym rogu i ściana gór
        # wzdłuż lewej krawędzi zasłaniają pola — nie wiadomo, gdzie kończy się
        # przejezdny teren i jak duże jest pole; skala gór do siatki kafli".
        # Zamiast dwóch olbrzymów (szczyt na 8 pól, pasmo 10 × 6) gromady
        # małych szczytów w skali 1–2 pól na szczyt (PROMPTY-PLANSZE §26),
        # stopa każdej na polach skał, jedna za drugą:
        #  * szczyt z lodospadem, mniejszy, na progu nad stawem (tło);
        #  * gromada szczytów na pasie skał x 1–8 za zamkiem;
        #  * iglice przy murach zamku (skały x 7–8, dotąd goły śnieg).
        # Runda 12 (HotA): „lewa krawędź i dolny pas to kilka razy wklejony
        # ten sam śnieżny szczyt, bez podstawy i przejścia w teren — łańcuch
        # o różnych sylwetkach, z przedgórzem i cieniem na śniegu". Każda
        # góra w kadrze ma inny kształt: samotny szczyt z lodospadem,
        # kopulasty masyw z półkami (§27 gora-12), głazy przy murach, długie
        # pasmo ze stołową skałą (gora-13), pagóry przedgórza (gora-14)
        # i urwisko z borem; skała cieplejsza, u stóp piargi, zachodzą na
        # siebie, cień na śnieg z `cienNaSniegu`.
        {'plik': 'gora-2', 'x': 6.6, 'y': 60.3, 'szer': 5.4, 'pokrywa': [4, 56, 9, 59]},
        {'plik': 'gora-12', 'x': 4.3, 'y': 64.0, 'szer': 6.0, 'pokrywa': [0, 60, 8, 63]},
        {'plik': 'gora-7', 'x': 7.7, 'y': 63.2, 'szer': 2.7, 'odbij': True, 'pokrywa': [0, 60, 8, 63]},
        # Lewy dolny róg: z tyłu pasmo (nie zasłania doliny przełęczy
        # z kopalnią), z przodu pagóry i urwisko z borem jako przedgórze.
        {'plik': 'gora-13', 'x': 5.2, 'y': 70.4, 'szer': 7.6, 'pokrywa': [0, 64, 10, 71]},
        {'plik': 'gora-14', 'x': 3.4, 'y': 71.45, 'szer': 4.6, 'pokrywa': [0, 64, 10, 71]},
        {'plik': 'gora-8', 'x': 9.4, 'y': 71.6, 'szer': 3.6, 'odbij': True, 'pokrywa': [0, 64, 10, 71]},
        # (Runda 6: bez skalnego pagóra `gora-5` w rogu — stał na wąwozie.)
        # Skalny garb nad stawem (górna krawędź ekranu) zamiast rzędu kęp.
        {'plik': 'gora-10', 'x': 17.4, 'y': 56.0, 'szer': 7.0, 'pokrywa': [15, 50, 20, 55]},
        # Runda 6 (HotA): „równina bez rzeźby — skarpy, zagajniki, wąwozy".
        # Skalna skarpa pod zamkiem i zalesiony pagór nad nią (§18,
        # rysunki rozciągnięte w poziomie, żeby nie zasłaniały korytarza).
        {'plik': 'gora-6', 'x': 15.5, 'y': 69.1, 'szer': 5.8, 'pokrywa': [13, 67, 17, 68]},
        # (Runda 8: bez zalesionego pagóra `gora-8` — płaski śnieżny płat czytał
        # się jak „pusta biała plama z kępką drzew"; w jego miejscu zwarty bór.)
        # Skalny pagór na wschodnim brzegu kadru, przy trakcie na północ.
        {'plik': 'gora-7', 'x': 24.0, 'y': 63.2, 'szer': 2.8, 'pokrywa': [23, 61, 24, 62]},
    ],
}

#: Zima: łąka wypłowiała i chłodna, jeziora skute lodem, bór ciemny i sinawy.
BARWY_TERENU = {
    # „Łąka" to tu zmarznięta, zasypana darń: tekstura śniegu z wystającymi
    # źdźbłami (TEKSTURY), lekko płowa — odróżnia się od zasp, ale nie jest
    # zielona. Runda 2: „śnieg to białe plamy na zielonej trawie".
    # Runda 10: łąka to teraz wywiana TUNDRA (`teren-tundra`, PROMPTY-PLANSZE
    # §25) — płowa i oliwkowa, przygaszona chłodem, żeby nie była jesienią.
    # Runda 2 (checklista G4): dolina gracza ma być cieplejsza i jaśniejsza
    # niż doliny twierdz — tundra (jej teren) lekko płowa i jasna, a różnicę
    # krain domalowuje `DOMALUJ` (chłodny północ, ciepłe południe).
    'trawa': {'nasycenie': 0.85, 'barwa': (225, 215, 195), 'moc': 0.3, 'jasnosc': 1.0},
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
    # Runda 5: „droga to ledwo widoczna beżowa smuga" — ciemniejszy,
    # cieplejszy brąz ubitej ziemi, czytelny na bieli z daleka.
    # Runda 7: jezdnia ma własną teksturę zmarzniętej ziemi — lekkie przygaszenie.
    'sciezka': {'nasycenie': 0.85, 'barwa': (150, 128, 108), 'moc': 0.2, 'jasnosc': 0.92},
}

#: Jeziora są skute lodem — bez shadera wody (patrz `render_mapa.py`).
WODA_ANIMOWANA = False

#: Runda 2 po ślepym porównaniu ("śnieg to blada mgła, lód to błyskawica"):
#: zaspy z niebieskim cieniem i iskrami, lód z rysami zamiast tafli wody,
#: droga z brzegiem, las w zwartych masach, gęsty pierwszy ekran.
#: Runda 3: bez efektu `lod` — jego rysy na turkusowym lodzie (`lod-2`) znów
#: czytały się jak „błyskawice"; tekstura ma własne, delikatne pęknięcia.
#: Runda 11: „śnieg jednolicie szumiący i plamisty, bez rzeźby" — wysokość
#: zasp wygładzona (bez kratki z 8-bitowego szumu), drobne plamy słabsze.
EFEKTY = ['zaspy', 'zaspy_zmienne', 'zaspy_gladkie', 'relief_sniezny', 'bez_placow', 'lod_tafla', 'droga_obrzeze']
TEKSTURY = {'woda': ['lod-2', 'lod', 'snieg'], 'trawa': ['tundra', 'snieg-2', 'snieg'], 'las': ['snieg'],
            'sciezka': ['droga-snieg', 'sciezka']}
SKUP_LAS = True
#: Runda 4 (HotA): „pole śniegu to jednolita płaska biała tekstura — bez
#: uskoków, zmian odcienia i cieni". Rzeźba z silnika (`teren_efekty.rzezba`):
#: łagodne wały śniegu w skali kilku pól, stok ku słońcu cieplejszy, odwrotny
#: sinoniebieski, za wyższym gruntem krótki cień; skarpa przy skałach odsłania
#: sinoszarą skałę zamiast brązowej ziemi. Bez czoła skarpy (torf i trawa).
RZEZBA = {'pagorki': 0.9, 'sila': 1.2, 'czolo': 0.0, 'stok': (128, 138, 158)}
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
    (['glaz-sniezny-1', 'glaz-sniezny-2', 'glaz-sniezny-3'], 's', 0.04),
    (['zaspa-1', 'zaspa-2'], 's', 0.08),
    (['kra-lodu-2'], '~', 0.04),
    # Runda 4 pętli (G3): w tundrze rzadziej — drobiazgi tła konkurowały
    # ze znajdźkami.
    (['krzak-zimowy-1'], 'j', 0.05),
    # Runda 3: zmarznięta darń („.") też dostaje zaspy i głazy
    # — mniej pustych połaci bieli.
    # Runda 10: „.” to tundra (`teren-tundra`) — zamiast zasp nagie krzaczki
    # borówek, suche trawy i głazy.
    (['krzak-zimowy-1', 'glaz-sniezny-2', 'krzak-zimowy-1'], '.', 0.05),
    # (Runda 3: bez martwego drzewa z bagiennym mchem — w śniegu czytało się
    # jak „liściaste drzewo przy zaspie"; zamiast niego świerczki niżej.)
    # Runda 3 (wzorzec HotA): „śnieg to białe plamy, dwie trzecie ekranu
    # puste". W HotA między obiektami stoją pojedyncze ośnieżone świerczki
    # i kępki — gęściej kry na lodzie i młode świerki na śniegu i darni.
    (['kra-lodu-1', 'kra-lodu-2'], '~', 0.09),
    # Runda 11: śnieg po wygładzeniu zasp jest spokojniejszy — więcej drobnej
    # rzeźby jak w HotA (świerczki, głazy, płyty skał), bez ciemnych nawisów.
    (['swierczek-sniezny-1', 'swierczek-sniezny-2'], 's', 0.075),
    (['swierczek-sniezny-1'], '.', 0.03),
    # Runda 4 (HotA): „pole śniegu to jednolita, płaska biała tekstura — bez
    # uskoków, skał i zmian odcienia". Płyty skał spod śniegu, suche trawy
    # i nawisy z pasem cienia (PROMPTY-PLANSZE §15b).
    # (Łaty odsłoniętej ziemi — `lata-ziemi-snieg` — odrzucone: w kadrze czytały
    # się jak szare przeręble, nie jak zmiana odcienia gruntu.)
    (['skalki-snieg'], 's', 0.05),
    (['trawy-snieg'], 's.', 0.06),
    # (Runda 11: bez `nawis-sniezny` — pas cienia pod nawisem czytał się
    # w kadrze jak brudna szara smuga na śniegu.)
]



def NAKLEJKI_OMIN(zrodlo):
    """Pola bez naklejek tła (`render_mapa`, runda 8).

    Werdykt rundy 7: „wiatrak, chata nad jeziorem i chatka na dole wiszą na
    śniegu jak naklejki". Pod spichlerzem leżał zaśnieżony głaz, pod kopalnią
    nawis z pasem cienia — budynek stał na półce skalnej, a jego ściany
    kończyły się nad ciemną plamą. Pod budowlą i wokół niej sam śnieg.
    """
    import re
    omin = set()
    for m in re.finditer(r"\{ x: (\d+), y: (\d+), rodzaj: '(\w+)'", zrodlo):
        x, y, rodzaj = int(m.group(1)), int(m.group(2)), m.group(3)
        if rodzaj in ('kopalnia', 'budynek', 'jasnowidz'):
            omin |= {(x + dx, y + dy) for dx in (-2, -1, 0, 1, 2) for dy in (-2, -1, 0, 1)}
        else:
            omin |= {(x + dx, y + dy) for dx in (-1, 0, 1) for dy in (-1, 0)}
    # Runda 10: pod rysunkami gór (`masywy`) też bez naklejek — w szczelinie
    # między szczytami odbitego pasma prześwitywała kępa suchej trawy.
    for m in USTAWIENIA['masywy']:
        x0, y0, x1, y1 = m['pokrywa']
        omin |= {(x, y) for x in range(x0, x1 + 1) for y in range(y0, y1 + 1)
                 if not (x0 == 0 and y0 == 64 and 3 <= x <= 8 and y <= 65)}
    for m in re.finditer(r"'zamek[^']*': \{ x: (\d+), y: (\d+) \}", zrodlo):
        x, y = int(m.group(1)), int(m.group(2))
        omin |= {(x + dx, y + dy) for dx in range(-2, 3) for dy in range(-3, 2)}
    return omin


def TLO(rysunek):
    """Podmiany znaków tylko w TLE planszy (`render_mapa`), runda 6.

    Pod rysunkami gór i skarp z `USTAWIENIA.masywy` tło malowało skały
    ciemną teksturą z cieniem skarpy — wokół zalesionego pagóra i skalnego
    progu prześwitywała rozmyta szara plama wystająca za rysunek. Jak
    w Heroes 3: góra stoi NA śniegu, więc pod prostokątem `pokrywa` skały
    są w tle śniegiem; w grze dalej są skałami.
    """
    wynik = [list(w) for w in rysunek]
    for m in USTAWIENIA['masywy']:
        x0, y0, x1, y1 = m['pokrywa']
        for y in range(y0, y1 + 1):
            for x in range(x0, x1 + 1):
                if wynik[y][x] == '#':
                    # Runda 3 (G4): dolina gracza to tundra, nie śnieg — pod
                    # górami pierwszego ekranu tło też (biała plama za zamkiem).
                    wynik[y][x] = '.' if y >= 47 else 's'
    return [''.join(w) for w in wynik]

def DOMALUJ(plansza, rysunek, kafel, droga=None, maska_wody=None):
    """Klimat krain w tle (runda 2, checklista G4: „kolor terenu mówi, gdzie
    jesteś — dom cieplejszy i jaśniejszy, kraina wroga ciemniejsza i
    chłodniejsza; różnica widoczna na minimapie").

    Tekstury są jedne na całą planszę (`BARWY_TERENU` barwi RODZAJ terenu, nie
    krainę), a śnieg leży i w dolinie gracza, i pod twierdzami. Po naklejkach
    tło dostaje więc pas po pasie inne światło: doliny twierdz (y 0–20) sine
    i przygaszone jak w cieniu gór, tundra bez zmian, dolina gracza (y 47–71)
    płowa, w słońcu. Przejście jest łagodne, na szerokości grzbietów, żeby
    nie powstała linia. Lód jezior zostaje błękitny (maska wody).
    """
    import numpy as np
    from PIL import Image

    tab = np.asarray(plansza.convert('RGB'), dtype=np.float32)
    H = tab.shape[0]
    y = (np.arange(H, dtype=np.float32) + 0.5) / kafel

    def schodek(a, b):
        t = np.clip((y - a) / (b - a), 0, 1)
        return t * t * (3 - 2 * t)

    polnoc = 1 - schodek(19, 26)     # 1 w dolinach twierdz, 0 od tundry
    poludnie = schodek(42, 49)       # 1 w dolinie gracza
    chlodny = np.array((0.90, 0.94, 1.04), np.float32) * 0.93
    cieply = np.array((1.08, 1.04, 0.95), np.float32) * 1.03
    mnoznik = (1 + polnoc[:, None] * (chlodny - 1)[None, :] + poludnie[:, None] * (cieply - 1)[None, :])
    mnoznik = np.repeat(mnoznik[:, None, :], tab.shape[1], axis=1)
    if maska_wody is not None:
        woda = np.asarray(maska_wody.convert('L'), np.float32)[..., None] / 255.0
        mnoznik = mnoznik * (1 - woda) + woda
    return Image.fromarray((tab * mnoznik).clip(0, 255).astype(np.uint8), 'RGB')


#: Runda 6: kręty trakt z koleinami (jak na Polanie) zamiast prostych
#: odcinków od środka do środka pola — sieć dróg ma się wić między pagórem,
#: skarpą i stawem, a nie iść po linijce.
DROGA_KRETA = {'szerokosc': 0.5, 'zmiennosc': 0.35, 'meander': 0.14}

#: Runda 7 (HotA): „drogi to płaskie beżowe pasy o jednolitej szerokości, bez
#: krawędzi, kolein i przejścia w śnieg". Zamiast ciemnej obwódki
#: (`obwodka_drogi`) obrzeże jak na Polanie, ale zimowe: rozdeptane szare
#: pobocze, suche źdźbła zamiast zielonej trawy, kamyki i wał odgarniętego
#: śniegu z sinym cieniem; jezdnia z teksturą zmarzniętej ziemi z koleinami
#: i łatami śniegu (`teren-droga-snieg`, PROMPTY-PLANSZE §20).
DROGA_OBRZEZE = {
    'pobocze': (120, 112, 108),
    'barwy_trawy': [(176, 150, 96), (150, 122, 74), (196, 176, 128), (120, 100, 70)],
    'trawa': 0.7,
    'kamyki': 1.2,
    'wal': 1.0,
    # Runda 11: „drogi to płaskie brązowe wstęgi bez krawędzi i spadków" —
    # trakt wcięty w śnieg: cień pod brzegiem od strony światła, jasna ścianka
    # naprzeciw.
    'skarpa': 1.0,
}
