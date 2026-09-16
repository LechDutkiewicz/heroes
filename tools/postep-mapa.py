#!/usr/bin/env python3
"""Składa żywą stronę postępu prac nad planszą 72 × 72.

Strona pokazuje trzy rzeczy naraz, bo dopiero razem coś znaczą: schemat naszej
planszy, nasze liczby na tle PIĘCIU zmierzonych map oryginalnych (te same
jednostki, `tools/profil-wzorca.py`) i dziennik rund — co krytyk wybrał na
ślepo i jaką lukę nazwał.

Dane wejściowe: `tools/wzorzec/*.json` oraz dziennik rund zapisany niżej
w tym pliku (RUNDY). Wynik: `tools/postep-mapa.html`, jeden plik z wbudowanym
obrazem, więc da się go otworzyć i wysłać bez reszty repozytorium.

    python3 tools/postep-mapa.py
"""

import base64
import json
from pathlib import Path

KORZEN = Path(__file__).resolve().parent.parent
WZORZEC = KORZEN / 'tools' / 'wzorzec'
WYNIK = KORZEN / 'tools' / 'postep-mapa.html'

MAPY_WZORCOWE = [
    ('Faeries!', 'faeries'),
    ("Gorlam's Tentacle Swampland", 'gorlam-s-tentacle-swampland'),
    ('Hatchet, Axe and Saw', 'hatchet-axe-and-saw'),
    ('Unexpected Inheritance', 'unexpected-inheritance'),
    ('When Dragons Clash', 'when-dragons-clash'),
]

#: Miary, które da się położyć na jednej osi: (klucz w profilu, etykieta,
#: jednostka, czy więcej znaczy lepiej — None, gdy liczy się mieszczenie się
#: w przedziale wzorców).
MIARY = [
    ('przejezdnych %', 'Pola, po których się chodzi', '%'),
    ('obiekt co ile pól przejezdnych', 'Gęstość: obiekt co ile pól', ''),
    ('obiektów', 'Obiektów razem', ''),
    ('straże %', 'Udział straży wśród obiektów', '%'),
    ('dostępnych bez bitwy %', 'Mapa dostępna bez jednej bitwy', '%'),
]

RODZAJE = ['kopalnia', 'surowiec', 'skrzynia', 'artefakt', 'budynek', 'potwor']

RUNDY = [
    {
        'nr': 1,
        'tytul': 'Szkielet: trzy pasy, cztery przejścia',
        'wynik': 'poprawka',
        'co': 'Plansza 72 × 72 zamiast 36 × 36. Dwa grzbiety dzielą mapę na dolinę gracza, '
              'pas sporny i krainę przeciwnika; każdy grzbiet ma dwa pilnowane przejścia.',
        'luka': 'Przejście szerokie na cztery pola da się obejść bokiem — strażnik blokuje pas '
                'szeroki na trzy. 74% planszy stało otworem bez jednej wygranej bitwy.',
        'naprawa': 'Przejścia zwężone do dwóch pól i wycinane wyłącznie tabelą PRZEJSCIA, '
                   'a nie szkicem krain. Po poprawce: 30%.',
    },
    {
        'nr': 2,
        'tytul': 'Ekonomia doliny',
        'wynik': 'poprawka',
        'co': 'Kopalnie, stosy i skrzynie rozstawione w trzech pasach; `probe-ekonomia.ts` liczy '
              'rozbudowę osobno z kopalń doliny i z całej mapy.',
        'luka': 'Przy losowanych surowcach dolina potrafiła nie dostać ANI JEDNEJ kopalni odłamków '
                '— a odłamkami płaci się za górną połowę drzewka miasta. Miasta nie dało się '
                'skończyć i nie było tego widać.',
        'naprawa': 'Surowce kopalń w dolinie są wypisane, nie losowane. Sonda sprawdza, czy dolina '
                   'ma własne źródło każdego surowca.',
    },
    {
        'nr': 3,
        'tytul': 'Pomiar wzorca: pięć oficjalnych map 72 × 72',
        'wynik': 'pomiar',
        'co': 'Pobrane prawdziwe pliki .h3m, sparsowane do JSON, ten sam profil liczony dla nich '
              'i dla nas.',
        'luka': 'Trzy różnice: mapa za otwarta (66% przejezdnych wobec 26–43%), za rzadka '
                '(obiekt co 14,5 pola wobec 4–12) i bez gradientu nagród (rozkład płaski).',
        'naprawa': 'Nowy szkic krain — lasy i góry tną przestrzeń; 280 obiektów zamiast 235, '
                   'z ciężarem przesuniętym na pas sporny; osobny skarbiec w najdalszej ćwiartce.',
    },
    {
        'nr': 4,
        'tytul': 'Ślepe porównanie: trzy razy, trzy różne wzorce',
        'wynik': 'wygrana',
        'co': 'Schemat naszej planszy i wzorca obok siebie, podpisane A i B, plus liczby w tych '
              'samych jednostkach. Trzej krytycy ze świeżym kontekstem, każdy przeciw innej '
              'mapie oryginalnej, żaden nie wie, co jest czyje.',
        'luka': 'Wszyscy trzej wybrali naszą. Dwaj niezależnie nazwali tę samą słabość: '
                'najdalszy pierścień mapy nagradza najsłabiej — cel wyprawy nie płaci.',
        'naprawa': 'Ostatnie 20% zasięgu dostało własny skarbiec: relikty, skrzynie i kopalnie '
                   'pod strażą wodzów. Rozkład wzdłuż mapy: 29/72/86/64/55 zamiast 30/82/47/43/33.',
    },
    {
        'nr': 5,
        'tytul': 'Czterdzieści obiektów bez dojścia',
        'wynik': 'poprawka',
        'co': 'Generator sprawdza po każdym postawieniu, czy plansza dalej jest spójna i czy do '
              'każdego obiektu da się podejść.',
        'luka': 'Lista brył w generatorze miała „gniazdo” zamiast „ośrodka ewolucji”. Jeden zły '
                'wpis i mury dwóch budowli zamknęły północno-wschodnią ćwiartkę: czterdzieści '
                'obiektów, w tym zamek przeciwnika, było nie do osiągnięcia. Generator meldował '
                'spójną planszę.',
        'naprawa': 'Bryły zgodne z `src/data/mapa.ts`. Sonda liczy dojścia na PRAWDZIWYM stanie '
                   'gry — poprzednia wersja usuwała najpierw potwory, przez co mury rosły '
                   'i sonda widziała blokady, których w grze nie ma.',
    },
    {
        'nr': 6,
        'tytul': 'Strażnica graniczna i klucz',
        'wynik': 'poprawka',
        'co': 'Przejść pilnują strażnice, których nie da się pokonać — otwiera je klucz '
              'z namiotu klucznika. Dwie barwy: zielona otwiera oba wyjazdy z doliny, '
              'niebieska oba wejścia do krainy wroga.',
        'luka': 'Mapa pytała tylko „czy stać mnie na przełamanie straży”, i to cztery razy '
                'pod rząd.',
        'naprawa': 'Trzy akty, każdy otwiera nowy kawałek planszy: 880 → 1338 → 2150 pól. '
                   'Sprawdzają to dwa niezależne liczenia — generatora i sondy.',
    },
    {
        'nr': 7,
        'tytul': 'Trzy nowe tereny',
        'wynik': 'poprawka',
        'co': 'Bagno (175 punktów ruchu), śnieg (150) i ziemia jałowa (125) przy 100 za trawę '
              'i 70 za drogę. Bagno wokół jeziora w pasie spornym, śnieg na rubieżach wroga, '
              'jałowa na wschodzie przy bocznych przejściach.',
        'luka': 'Po zagęszczeniu lasu straż postawiona w korytarzu zamykała wszystko za sobą: '
                'bez jednej bitwy stało otworem 10% mapy zamiast trzydziestu kilku.',
        'naprawa': 'Straż nie staje w szyjce, a w dolinie pilnowane są tylko artefakty i dwie '
                   'kopalnie. Po poprawce: 34%. Dziewięć rodzajów terenu — tyle, ile ma mapa '
                   'oryginalna.',
    },
    {
        'nr': 8,
        'tytul': 'Chata jasnowidza',
        'wynik': 'poprawka',
        'co': '„Przynieś kamienie, dostaniesz artefakt” — dwie chaty, jedna w pasie spornym '
              'za sześć kamieni, druga w krainie wroga za dwanaście. Kamień ewolucji dostał '
              'pierwsze zastosowanie.',
        'luka': 'Budowle z bryłą stały tak ciasno, że gra przycinała im mury: z piętnastu '
                'wielopolowych mur miały cztery, a reszta była rysowana na trzy pola '
                'i blokowała jedno.',
        'naprawa': 'Generator stawia je z zapasem miejsca na mur, a na ciasno godzi się dopiero '
                   'wtedy, gdy miejsca zabraknie: 13 z 15. Próg w sondzie został ZAOSTRZONY, '
                   'nie rozluźniony.',
    },
]

BRAKI = [
    ('Więzienie z bohaterem', 'Drugi bohater to drugi kierunek naraz — jedyny powód, dla którego '
     'mapa M nie nudzi się w trzecim tygodniu.'),
    ('Artefakty klasy relikt z realnym efektem', 'Pas sporny i kraina wroga potrzebują nagród, '
     'które zmieniają grę, a nie tylko dokładają statystykę.'),
    ('Przeciwnik, który gra', 'Zamek wroga stoi i czeka. Dopóki nikt nim nie rusza, mapa ma tempo '
     'wyścigu z samym sobą.'),
]


def wczytaj():
    nasza = json.loads((WZORZEC / 'nasza-profil.json').read_text(encoding='utf-8'))
    wzorce = []
    for nazwa, plik in MAPY_WZORCOWE:
        sciezka = WZORZEC / f'{plik}-profil.json'
        if sciezka.exists():
            wzorce.append((nazwa, json.loads(sciezka.read_text(encoding='utf-8'))))
    return nasza, wzorce


def obraz(sciezka: Path) -> str:
    return 'data:image/png;base64,' + base64.b64encode(sciezka.read_bytes()).decode('ascii')


def pasek(nasza_wartosc, wartosci):
    """Pozycja naszej liczby na tle rozrzutu wzorców, w procentach szerokości."""
    lo, hi = min(wartosci), max(wartosci)
    margines = (hi - lo) * 0.35 or max(1.0, hi * 0.2)
    skala_lo, skala_hi = lo - margines, hi + margines
    na_procent = lambda v: max(0.0, min(100.0, (v - skala_lo) / (skala_hi - skala_lo) * 100))
    return {
        'lo': na_procent(lo),
        'hi': na_procent(hi),
        'my': na_procent(nasza_wartosc),
        'wMiare': lo <= nasza_wartosc <= hi,
        'zakres': f'{lo:g}–{hi:g}',
    }


def html():
    nasza, wzorce = wczytaj()
    miary = []
    for klucz, etykieta, jednostka in MIARY:
        wartosci = [w[klucz] for _, w in wzorce if isinstance(w.get(klucz), (int, float))]
        if not wartosci or not isinstance(nasza.get(klucz), (int, float)):
            continue
        miary.append((etykieta, jednostka, nasza[klucz], pasek(nasza[klucz], wartosci)))

    wiersze_rodzajow = []
    for r in RODZAJE:
        nasze = nasza['obiekty wg rodzaju'].get(r, 0)
        ich = [w['obiekty wg rodzaju'].get(r, 0) for _, w in wzorce]
        wiersze_rodzajow.append((r, nasze, min(ich), max(ich), nasze < min(ich) or nasze > max(ich)))

    def komorki_miar():
        out = []
        for etykieta, jednostka, wartosc, p in miary:
            stan = 'w-mierze' if p['wMiare'] else 'poza'
            out.append(f'''
        <div class="miara">
          <div class="miara-gora">
            <span class="miara-nazwa">{etykieta}</span>
            <span class="miara-liczba {stan}">{wartosc:g}{jednostka}</span>
          </div>
          <div class="os" role="img" aria-label="nasza wartość {wartosc:g}{jednostka}, wzorce {p['zakres']}{jednostka}">
            <span class="os-zakres" style="left:{p['lo']:.1f}%;width:{max(1.2, p['hi'] - p['lo']):.1f}%"></span>
            <span class="os-my {stan}" style="left:{p['my']:.1f}%"></span>
          </div>
          <p class="miara-podpis">pięć map oryginalnych: {p['zakres']}{jednostka}</p>
        </div>''')
        return '\n'.join(out)

    def wiersze_tabeli():
        out = []
        for r, nasze, lo, hi, poza in wiersze_rodzajow:
            klasa = ' class="poza"' if poza else ''
            out.append(
                f'<tr><th scope="row">{r}</th><td{klasa}>{nasze}</td>'
                f'<td class="przygaszone">{lo}–{hi}</td></tr>'
            )
        return '\n'.join(out)

    def karty_rund():
        out = []
        for r in RUNDY:
            znacznik = {'wygrana': 'wygrana', 'poprawka': 'poprawka', 'pomiar': 'pomiar'}[r['wynik']]
            out.append(f'''
        <article class="runda">
          <header>
            <span class="runda-nr">Runda {r['nr']}</span>
            <h3>{r['tytul']}</h3>
            <span class="znacznik {znacznik}">{znacznik}</span>
          </header>
          <p class="co">{r['co']}</p>
          <p class="luka"><span class="etykieta">Luka</span> {r['luka']}</p>
          <p class="naprawa"><span class="etykieta">Naprawa</span> {r['naprawa']}</p>
        </article>''')
        return '\n'.join(out)

    def karty_brakow():
        return '\n'.join(
            f'<li><h4>{tytul}</h4><p>{opis}</p></li>' for tytul, opis in BRAKI
        )

    minimapa = obraz(WZORZEC / 'nasza-minimapa.png')

    return f'''<title>Dwie Doliny</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Bitter:wght@600;700&family=Archivo:wght@400;500;600&family=IBM+Plex+Mono:wght@400;500&display=swap">
<style>
  :root {{
    --tlo: #f1f3f0;
    --plyta: #ffffff;
    --plyta-2: #e9ece7;
    --tekst: #171d1a;
    --tekst-cichy: #5d6a62;
    --kreska: #cfd6cf;
    --zloto: #b07d17;
    --zloto-jasne: #e8b23a;
    --dobrze: #2f7d4f;
    --zle: #b2472f;
    --cien: 0 1px 2px rgba(23, 29, 26, .08), 0 8px 24px -16px rgba(23, 29, 26, .5);
  }}
  @media (prefers-color-scheme: dark) {{
    :root:not([data-theme="light"]) {{
      --tlo: #11150f;
      --plyta: #191e17;
      --plyta-2: #222820;
      --tekst: #e6ebe2;
      --tekst-cichy: #93a08e;
      --kreska: #2e372b;
      --zloto: #e8b23a;
      --zloto-jasne: #f2c765;
      --dobrze: #6fbf84;
      --zle: #e07b5f;
      --cien: 0 1px 2px rgba(0, 0, 0, .5), 0 12px 32px -20px #000;
    }}
  }}
  :root[data-theme="dark"] {{
    --tlo: #11150f;
    --plyta: #191e17;
    --plyta-2: #222820;
    --tekst: #e6ebe2;
    --tekst-cichy: #93a08e;
    --kreska: #2e372b;
    --zloto: #e8b23a;
    --zloto-jasne: #f2c765;
    --dobrze: #6fbf84;
    --zle: #e07b5f;
    --cien: 0 1px 2px rgba(0, 0, 0, .5), 0 12px 32px -20px #000;
  }}

  body {{
    background: var(--tlo);
    color: var(--tekst);
    font-family: Archivo, system-ui, sans-serif;
    line-height: 1.55;
    padding-inline: 20px;
    padding-block: 40px 72px;
  }}
  .strona {{ max-width: 1060px; margin: 0 auto; display: flex; flex-direction: column; gap: 44px; }}
  h1, h2, h3, h4 {{ font-family: Bitter, Georgia, serif; text-wrap: balance; margin: 0; }}
  h1 {{ font-size: clamp(2rem, 1.4rem + 2.4vw, 3rem); line-height: 1.1; letter-spacing: -.015em; }}
  h2 {{ font-size: 1.3rem; }}
  p {{ margin: 0; }}

  .naglowek {{ display: flex; flex-wrap: wrap; gap: 20px 32px; align-items: end; justify-content: space-between; }}
  .nadtytul {{
    font-family: 'IBM Plex Mono', ui-monospace, monospace; font-size: .74rem;
    letter-spacing: .16em; text-transform: uppercase; color: var(--zloto);
  }}
  .lead {{ color: var(--tekst-cichy); max-width: 62ch; margin-top: 10px; }}
  .stan {{
    font-family: 'IBM Plex Mono', ui-monospace, monospace; font-size: .78rem;
    border: 1px solid var(--kreska); border-radius: 999px; padding: 6px 14px;
    color: var(--tekst-cichy); white-space: nowrap;
  }}
  .stan b {{ color: var(--dobrze); font-weight: 500; }}

  section {{ display: flex; flex-direction: column; gap: 18px; }}
  .naglowek-sekcji {{ display: flex; align-items: baseline; gap: 14px; border-bottom: 1px solid var(--kreska); padding-bottom: 8px; }}
  .naglowek-sekcji p {{ color: var(--tekst-cichy); font-size: .86rem; }}

  .miary {{ display: grid; gap: 22px 34px; grid-template-columns: repeat(auto-fit, minmax(270px, 1fr)); }}
  .miara-gora {{ display: flex; justify-content: space-between; align-items: baseline; gap: 12px; }}
  .miara-nazwa {{ font-size: .92rem; }}
  .miara-liczba {{
    font-family: 'IBM Plex Mono', ui-monospace, monospace; font-variant-numeric: tabular-nums;
    font-size: 1.05rem; font-weight: 500;
  }}
  .miara-liczba.w-mierze {{ color: var(--dobrze); }}
  .miara-liczba.poza {{ color: var(--zle); }}
  .os {{ position: relative; height: 10px; margin-top: 10px; border-radius: 999px; background: var(--plyta-2); }}
  .os-zakres {{ position: absolute; top: 0; bottom: 0; border-radius: 999px; background: color-mix(in oklab, var(--zloto) 34%, transparent); }}
  .os-my {{ position: absolute; top: -4px; width: 3px; height: 18px; border-radius: 2px; background: var(--dobrze); }}
  .os-my.poza {{ background: var(--zle); }}
  .miara-podpis {{
    margin-top: 8px; font-family: 'IBM Plex Mono', ui-monospace, monospace;
    font-size: .72rem; color: var(--tekst-cichy);
  }}

  .plansza {{ display: grid; gap: 26px; grid-template-columns: minmax(0, 460px) minmax(0, 1fr); align-items: start; }}
  @media (max-width: 720px) {{ .plansza {{ grid-template-columns: 1fr; }} }}
  .plansza img {{ width: 100%; image-rendering: pixelated; border-radius: 4px; border: 1px solid var(--kreska); }}
  .legenda {{ display: flex; flex-wrap: wrap; gap: 6px 16px; margin-top: 12px; font-size: .78rem; color: var(--tekst-cichy); }}
  .legenda span {{ display: inline-flex; align-items: center; gap: 6px; }}
  .kropka {{ width: 9px; height: 9px; border-radius: 50%; display: inline-block; }}

  table {{ border-collapse: collapse; width: 100%; font-size: .9rem; }}
  caption {{ text-align: left; color: var(--tekst-cichy); font-size: .84rem; padding-bottom: 8px; }}
  th, td {{ text-align: right; padding: 7px 10px; border-bottom: 1px solid var(--kreska); }}
  th[scope="row"] {{ text-align: left; font-weight: 500; font-family: Archivo, sans-serif; }}
  thead th {{ font-size: .74rem; text-transform: uppercase; letter-spacing: .08em; color: var(--tekst-cichy); font-family: Archivo, sans-serif; }}
  td {{ font-family: 'IBM Plex Mono', ui-monospace, monospace; font-variant-numeric: tabular-nums; }}
  td.poza {{ color: var(--zle); }}
  .przygaszone {{ color: var(--tekst-cichy); }}

  .rundy {{ display: flex; flex-direction: column; gap: 14px; }}
  .runda {{ background: var(--plyta); border: 1px solid var(--kreska); border-radius: 8px; padding: 18px 20px; box-shadow: var(--cien); display: flex; flex-direction: column; gap: 10px; }}
  .runda header {{ display: flex; flex-wrap: wrap; align-items: baseline; gap: 8px 14px; }}
  .runda h3 {{ font-size: 1.06rem; flex: 1 1 auto; }}
  .runda-nr {{ font-family: 'IBM Plex Mono', ui-monospace, monospace; font-size: .74rem; color: var(--zloto); letter-spacing: .1em; text-transform: uppercase; }}
  .znacznik {{ font-size: .72rem; letter-spacing: .06em; text-transform: uppercase; padding: 3px 9px; border-radius: 4px; border: 1px solid var(--kreska); color: var(--tekst-cichy); }}
  .znacznik.wygrana {{ color: var(--dobrze); border-color: color-mix(in oklab, var(--dobrze) 45%, transparent); }}
  .znacznik.poprawka {{ color: var(--zloto); border-color: color-mix(in oklab, var(--zloto) 45%, transparent); }}
  .runda p {{ font-size: .92rem; }}
  .runda .co {{ color: var(--tekst-cichy); }}
  .etykieta {{ font-family: 'IBM Plex Mono', ui-monospace, monospace; font-size: .7rem; letter-spacing: .1em; text-transform: uppercase; color: var(--tekst-cichy); margin-right: 8px; }}
  .luka {{ border-left: 2px solid var(--zle); padding-left: 12px; }}
  .naprawa {{ border-left: 2px solid var(--dobrze); padding-left: 12px; }}

  .braki {{ list-style: none; padding: 0; margin: 0; display: grid; gap: 16px 28px; grid-template-columns: repeat(auto-fit, minmax(250px, 1fr)); }}
  .braki h4 {{ font-size: .98rem; margin-bottom: 4px; }}
  .braki p {{ font-size: .88rem; color: var(--tekst-cichy); }}
  footer {{ color: var(--tekst-cichy); font-size: .82rem; border-top: 1px solid var(--kreska); padding-top: 16px; }}
</style>

<div class="strona">
  <header class="naglowek">
    <div>
      <p class="nadtytul">Plansza przygody · rozmiar M · 72 × 72</p>
      <h1>Dwie Doliny</h1>
      <p class="lead">Mapa na jednego przeciwnika, budowana pod praktykę Heroes 3 i mierzona
        wprost przeciw pięciu oficjalnym mapom 72 × 72 dla dwóch graczy, wczytanym z plików
        <code>.h3m</code> i policzonym w tych samych jednostkach.</p>
    </div>
    <p class="stan">sondy: <b>zielone</b> · rund: {len(RUNDY)}</p>
  </header>

  <section>
    <div class="naglowek-sekcji">
      <h2>Gdzie jesteśmy wobec oryginałów</h2>
      <p>złoty pas to rozrzut pięciu map wzorcowych, kreska to my</p>
    </div>
    <div class="miary">{komorki_miar()}</div>
  </section>

  <section>
    <div class="naglowek-sekcji">
      <h2>Plansza</h2>
      <p>schemat: teren i wszystkie obiekty</p>
    </div>
    <div class="plansza">
      <div>
        <img src="{minimapa}" alt="Schemat planszy 72 × 72: dolina gracza na południowym zachodzie, pas sporny pośrodku, kraina przeciwnika na północnym wschodzie, dwa pasma gór z przejściami.">
        <div class="legenda">
          <span><i class="kropka" style="background:#ffd600"></i>kopalnia</span>
          <span><i class="kropka" style="background:#ffffa0"></i>surowiec</span>
          <span><i class="kropka" style="background:#ff8c00"></i>skrzynia</span>
          <span><i class="kropka" style="background:#dc78ff"></i>artefakt</span>
          <span><i class="kropka" style="background:#78dcff"></i>budowla</span>
          <span><i class="kropka" style="background:#dc2828"></i>straż</span>
        </div>
      </div>
      <div>
        <table>
          <caption>Obiekty wg rodzaju — nasza plansza obok rozrzutu pięciu map oryginalnych.</caption>
          <thead><tr><th scope="col" style="text-align:left">rodzaj</th><th scope="col">my</th><th scope="col">oryginały</th></tr></thead>
          <tbody>{wiersze_tabeli()}</tbody>
        </table>
      </div>
    </div>
  </section>

  <section>
    <div class="naglowek-sekcji">
      <h2>Dziennik rund</h2>
      <p>każda runda: co zbudowane, jaką lukę nazwał krytyk, co z nią zrobiliśmy</p>
    </div>
    <div class="rundy">{karty_rund()}</div>
  </section>

  <section>
    <div class="naglowek-sekcji">
      <h2>Czego mapie brakuje, a nie da się dorobić samą planszą</h2>
      <p>rzeczy do zbudowania w silniku — dopiero wtedy następna iteracja mapy ma sens</p>
    </div>
    <ul class="braki">{karty_brakow()}</ul>
  </section>

  <footer>
    Liczby wzorców policzone z plików .h3m map: {', '.join(n for n, _ in MAPY_WZORCOWE)}.
    Profil naszej planszy: <code>tools/profil-mapy.py</code>, profil wzorców:
    <code>tools/profil-wzorca.py</code>, ślepe porównania: <code>tools/blind/</code>.
  </footer>
</div>
'''


if __name__ == '__main__':
    WYNIK.write_text(html(), encoding='utf-8')
    print(f'zapisano {WYNIK.relative_to(KORZEN)}')
