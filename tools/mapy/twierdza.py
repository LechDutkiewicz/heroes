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


#: Pierwszy ekran po oddaleniu kamery (x 3–24, y 53–71 wokół startu).
KADR = (3, 53, 24, 71)

#: Pierwszy ekran, rozstawiony ręcznie (runda 6). Każdy wpis: lista pól do
#: wyboru (pierwsze pasujące) i obiekt. Mapa kadru — patrz `popraw_teren`:
#: staw u góry, pasmo gór po lewej, bór w prawym dolnym rogu; trakt od zamku
#: na wschód (y 62) i na północ (x 22); zalesiony pagór (16–19, 64–65),
#: skarpa (13–17, 67–68), między nimi korytarz, za skarpą zaułek z wąwozem.
PIERWSZY_EKRAN = [
    # Spichlerz jagód przy trakcie, między stawem a drogą.
    ([(18, 61), (17, 61), (19, 61)], ('kopalnia', 'jagoda')),
    # Kopalnia odłamków na wschodnim placu, wejściem do korytarza.
    ([(21, 64), (22, 64), (21, 63)], ('kopalnia', 'odlamek')),
    # Obóz łowców (złoto) w zaułku u stopy skarpy — za wąwozem ze strażą.
    ([(14, 70), (15, 70)], ('kopalnia', 'pokeball')),
    ([(12, 68), (12, 69), (11, 69)], ('potwor', 'slaby')),
    # (Runda 10: nie na (16, 69) — tam stoi brzeg boru i kupka leżała na
    # koronie świerka.)
    ([(15, 70), (13, 69)], ('surowiec', 'kamien')),
    # Plac nad zamkiem, na brzegu stawu: chata i wiatrak przy ścieżce.
    ([(14, 60), (13, 60), (15, 60)], ('budynek', 'wiatrak')),
    # (Runda 10: chatka nie stoi już na (10, 59) — od rundy 9 zamek jest 1,8
    # raza większy i zasłaniał ją całą. Stoi nad stawem, na końcu odnogi
    # traktu, która od placu z wiatrakiem wiedzie brzegiem do kamiennej wieży.)
    ([(12, 55), (13, 55)], ('budynek', 'chatka')),
    # Runda 10 (HotA): przełęcz przez lewe góry (`popraw_teren`) — kopalnia
    # kamieni w skalnej ścianie pod szczytem, straż na trakcie przełęczy,
    # skrzynia za strażą. Kamienie ewolucji bliżej zamku skracają też drogę
    # do surowców (autopilot wygrywał dopiero ok. 61 dnia).
    ([(4, 66), (5, 66)], ('kopalnia', 'kamien')),
    ([(7, 65), (7, 66)], ('potwor', 'slaby')),
    ([(6, 64), (5, 64)], ('skrzynia', None)),
    # Za stawem: kamienna wieża pod górami, kupka kul i jagód na brzegu.
    ([(9, 55), (10, 55), (9, 54)], ('budynek', 'kamienna-wieza')),
    ([(13, 54), (11, 54), (12, 54)], ('surowiec', 'pokeball')),
    ([(16, 55), (15, 55), (16, 54)], ('surowiec', 'jagoda')),
    # Trakt na północ: źródło przy drodze, wóz na wschodnim brzegu.
    ([(20, 55), (21, 55), (20, 56)], ('budynek', 'zrodlo')),
    ([(24, 57), (23, 57), (23, 56)], ('budynek', 'woz')),
    # Wylot korytarza przy zamku: ognisko, kupka odłamków przy trakcie.
    ([(12, 65), (11, 65), (12, 66)], ('budynek', 'ognisko')),
    # (Runda 9: kupka odłamków nie leży już na skraju boru — rysunek kępy
    # sięga rzędu wyżej i kupka czytała się jak położona na koronach drzew.)
    ([(22, 61), (22, 60)], ('surowiec', 'odlamek')),
    # Zatoczka na końcu korytarza, pod borem.
    ([(19, 67), (18, 67), (20, 67)], ('skrzynia', None)),
    # Runda 8 (HotA): „pola śniegu między jeziorem a zamkiem i pas od ścieżki
    # do prawego brzegu to puste białe plamy — powiększyć i zagęścić obiekty
    # (kopalnie, skrzynie, strażnicy, ruiny), żeby mapa miała rytm i cele".
    # Plac pod traktem, przed nowym borem: obóz łowców z namiotami.
    ([(17, 63), (18, 63)], ('budynek', 'oboz-treningowy')),
    # Brzeg stawu na wschód od spichlerza: relikt za strażnikiem — cel
    # widoczny z rozstajów, straż stoi z dala od traktu (x 22–23).
    ([(20, 58), (20, 59)], ('potwor', 'slaby')),
    ([(21, 59), (21, 60)], ('artefakt', None)),
    # Skrzynia przy trakcie na północ i kupka kul za kopalnią, pod borem.
    ([(20, 61), (20, 60)], ('skrzynia', None)),
    ([(23, 63), (22, 62)], ('surowiec', 'pokeball')),
    # Góra kadru, przy wieży: skrzynia na brzegu stawu.
    ([(14, 54), (13, 55), (14, 55)], ('skrzynia', None)),
    # Między wiatrakiem a spichlerzem: kamień ewolucji przy ścieżce.
    ([(16, 61), (15, 61)], ('surowiec', 'kamien')),
    # Zaułek za wąwozem: skrzynia obok obozu łowców — druga nagroda za strażą.
    ([(11, 70), (12, 70), (12, 71)], ('skrzynia', None)),
    # Runda 12 (HotA): polana w rozbitym borze, na końcu odnogi z zatoczki.
    ([(20, 69), (21, 69), (20, 70)], ('budynek', 'gniazdo')),
    ([(19, 70), (21, 70)], ('surowiec', 'jagoda')),
]


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
    # PIERWSZY EKRAN (runda 6, wzorzec HotA) — rozstawiony RĘCZNIE, jak na
    # Polanie. Werdykt rundy 5: „od wiatraka w dół płaski śnieg zasypany
    # kilkunastoma identycznymi czerwonymi stosami, skrzyniami i ogniskami —
    # szum, zdradza proceduralne rozrzucenie; wyraźnie mniej, w kilku różnych
    # wariantach, osadzonych w terenie (przy ścieżkach, w zatoczkach, za
    # strażą)". Losowanie z odstępami sypało kupki po całym kadrze; teraz
    # każde miejsce ma swoją rzecz, a każdy surowiec leży tu raz.
    for miejsca, wpis in PIERWSZY_EKRAN:
        postaw_kadr(g, miejsca, wpis)
    # Kadr jest skończony — reszta doliny idzie poza niego. Te same ilości co
    # przed rundą 6 (kupki, skrzynie, relikt pod strażą), tylko dalej:
    # symulacja misji liczy na tę gospodarkę.
    g.zajete += [(x, y) for y in range(KADR[1], KADR[3] + 1) for x in range(KADR[0], KADR[2] + 1)
                 if strefa(x, y) == 'dom']
    g.dodaj(7, 'dom', (6, 30), lambda p: ('surowiec', rng.choice(['jagoda', 'pokeball', 'odlamek'])))
    g.dodaj(3, 'dom', (6, 30), lambda p: ('skrzynia', None))
    g.strzez(g.dodaj(1, 'dom', (6, 30), lambda p: ('artefakt', None)), 'slaby')
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
    # Drugi wiatrak i drugie ognisko wypadają przy tym w pierwszym ekranie —
    # w HotA powtórzenia budowli na jednym ekranie są zwykłe.
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

    # Runda 4 (HotA): spichlerz jagód (20, 60) i kopalnia odłamków (23, 60)
    # mają bryłę w rzędzie nad wejściem — w stawie. Na ekranie stały na
    # lodzie jak doklejone. Po rozstawieniu (nic się nie przesuwa) brzeg pod
    # nimi i pod wiatrakiem zamarza w śnieżny cypel: pola bryły i tak są
    # zablokowane, a rząd 58 to kawałek brzegu przy drodze.
    for x, y in [(13, 59), (14, 59), (15, 59), (19, 59), (20, 59), (21, 59), (22, 59),
                 (19, 58), (20, 58), (21, 58), (23, 58), (16, 60), (21, 60)]:
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
                 (12, 68), (12, 69), (13, 70), (14, 70),
                 # Runda 12: z zatoczki na polanę w borze.
                 (19, 68), (20, 68)]:
        if g.mapa[y][x] in 's.j':
            g.mapa[y][x] = '='


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
        # Runda 8 (HotA): „świat kończy się na ramce — rogi i prawy brzeg kadru
        # w ciemnej winiecie mgły; minimapa to sam granat z jednym rogiem".
        # Zachodnia połowa doliny gracza jest mu znana, z zapasem na miękki
        # brzeg mgły poza kadrem, aż po wyjazd na przełęcz (x 29). Reszta —
        # wschód doliny, tundra, twierdze — do odkrycia (sonda: < 20% planszy).
        {'x': 13, 'y': 62, 'promien': 16},
        {'x': 34, 'y': 62, 'promien': 9},
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
    'znajdzki': 0.72,
    'osadzZnajdzki': 0.2,
    'skalaStrazy': 1.2,
    # Runda 10: łąka to tundra — bez białych zasp sceny na co trzecim polu.
    'bezOzdobTrawy': True,
    # Runda 9 (HotA): „zamek ledwie większy od chaty i młyna — powiększyć
    # co najmniej dwa razy; twierdza ma dominować nad lasem jak siedziba".
    # Runda 11 (HotA): „zamek kilka razy większy od bohatera i młyna, wiatrak
    # mniejszy od chaty obok — skala się nie trzyma". Zamek o jedną szóstą
    # niżej (dalej największy w kadrze), budowle o 30% wyżej: wiatrak nad
    # spichlerzem, jak w HotA (młyn ≈ 3 pola, zamek ≈ 4,5).
    'skalaZamku': 1.5,
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
    'cienZnajdzek': {'szer': 1.25, 'krycie': 1.6},
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
        {'plik': 'gora-14', 'x': 2.4, 'y': 71.8, 'szer': 4.0, 'pokrywa': [0, 64, 10, 71]},
        {'plik': 'gora-8', 'x': 9.0, 'y': 71.9, 'szer': 3.6, 'odbij': True, 'pokrywa': [0, 64, 10, 71]},
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
    'trawa': {'nasycenie': 0.8, 'barwa': (205, 212, 225), 'moc': 0.3, 'jasnosc': 0.97},
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
    (['glaz-sniezny-1', 'glaz-sniezny-2', 'glaz-sniezny-3'], 's', 0.06),
    (['zaspa-1', 'zaspa-2'], 's', 0.08),
    (['kra-lodu-2'], '~', 0.04),
    (['krzak-zimowy-1'], 'j', 0.08),
    # Runda 3: zmarznięta darń („.") też dostaje zaspy i głazy
    # — mniej pustych połaci bieli.
    # Runda 10: „.” to tundra (`teren-tundra`) — zamiast zasp nagie krzaczki
    # borówek, suche trawy i głazy.
    (['krzak-zimowy-1', 'glaz-sniezny-2', 'krzak-zimowy-1'], '.', 0.07),
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
                    wynik[y][x] = 's'
    return [''.join(w) for w in wynik]

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
