#!/usr/bin/env python3
"""Generuje grafiki wsadu z promptów w `tools/PROMPTY-*.md` przez API Gemini.

Skąd biorą się prompty
----------------------
Z tych samych plików, które czyta człowiek. Prompt ma jedno źródło i jest nim
markdown — inaczej po pierwszej poprawce w dokumencie skrypt generowałby coś
innego, niż jest napisane, i nikt by tego nie zauważył.

Wiązanie prompt → plik robi znacznik w komentarzu HTML tuż nad blokiem kodu:

    <!-- plik: straznica.png -->
    ```
    A fortified border checkpoint ...
    ```

Opcjonalnie `| styl: teren` albo `| styl: brak` wybiera blok stylu doklejany
przed promptem (domyślnie `obiekt`), a `| proporcje: 4:3` prosi model o kadr
inny niż kwadrat — ilustracja na cały ekran przycięta z kwadratu traci
jedną trzecią kompozycji. Bloki stylu są oznaczone tak samo:

    <!-- styl: obiekt -->

Czego skrypt NIE robi
---------------------
Nie dotyka `public/`. Zapisuje wyłącznie do `tools/wsad/`, bo to jest źródło,
z którego `wsad_wczytaj.py` robi sprite'y gry — i bo wygenerowany obrazek
trzeba najpierw obejrzeć.

Silniki: OpenAI albo Gemini
---------------------------
Domyślnie OpenAI, gdy jest `OPENAI_API_KEY`, inaczej Gemini (`--silnik`
wymusza wybór). OpenAI jest pierwszym wyborem nie dla stylu, tylko dla
PRZEZROCZYSTOŚCI: jego model obrazkowy oddaje PNG z prawdziwym kanałem
alfa, a Gemini maluje kryjące tło, które trzeba potem wycinać z magenty
— i przy tym wycinaniu powstają obwódki na krawędziach sylwetek. Obiekty
mapy (styl `obiekt`) idą więc do OpenAI z przezroczystym tłem, a akapit
o magencie znika z promptu; reszta stylów dostaje tło kryjące.

Klucz OpenAI: zmienna `OPENAI_API_KEY` w ustawieniach środowiska, a host
`api.openai.com` musi być dopuszczony w dostępie do sieci. Model zmienia
`OPENAI_IMAGE_MODEL` (domyślnie `gpt-image-1`).

Klucz Gemini
------------
Zmienna `GEMINI_API_KEY` (albo `GOOGLE_API_KEY`). W sesji w chmurze dodaje się
ją w ustawieniach środowiska; sesja czyta zmienne przy starcie, więc po dodaniu
trzeba otworzyć nową. Można też trzymać klucz poza kontenerem jako „API
credential" na host `generativelanguage.googleapis.com` — wtedy proxy dokleja
nagłówek samo i skryptowi wystarczy `GEMINI_API_KEY=proxy`.

    python3 tools/generuj_grafiki.py --lista            # co jest do zrobienia
    python3 tools/generuj_grafiki.py --modele           # do czego klucz ma dostęp
    python3 tools/generuj_grafiki.py --silnik gemini x.png   # wymuś silnik
    python3 tools/generuj_grafiki.py straznica.png      # jeden plik
    python3 tools/generuj_grafiki.py --wszystko         # wszystko, czego brak
"""

import argparse
import base64
import json
import os
import re
import sys
import urllib.error
import urllib.request
from pathlib import Path

KORZEN = Path(__file__).resolve().parent.parent
WSAD = KORZEN / 'tools' / 'wsad'
DOKUMENTY = [
    KORZEN / 'tools' / 'PROMPTY-BUDYNKI.md',
    KORZEN / 'tools' / 'PROMPTY-MAPA-2.md',
    KORZEN / 'tools' / 'PROMPTY-WYNIK.md',
    KORZEN / 'tools' / 'PROMPTY-MENU.md',
    KORZEN / 'tools' / 'PROMPTY-KAMPANIA.md',
]

API = 'https://generativelanguage.googleapis.com/v1beta'

#: Modele obrazkowe od najlepszego do najtańszego. Skrypt bierze PIERWSZY,
#: do którego klucz ma dostęp — free tier oddaje zwykle tylko ostatni z listy,
#: a wypisanie „429" bez wyjaśnienia byłoby zagadką na pół godziny.
MODELE = [
    'gemini-3-pro-image',
    'gemini-3.1-flash-image',
    'gemini-2.5-flash-image',
]

ZNACZNIK = re.compile(
    r'<!--\s*(plik|styl):\s*([^|\s]+)\s*(?:\|\s*styl:\s*(\w+)\s*)?'
    r'(?:\|\s*proporcje:\s*(\d+:\d+)\s*)?-->'
)

#: Proporcje kadru per plik — osobny słownik, a nie trzeci element krotki
#: zadania, żeby reszta skryptu (lista, drukowanie) nie musiała o nich wiedzieć.
PROPORCJE: dict[str, str] = {}


def klucz() -> str:
    k = os.environ.get('GEMINI_API_KEY') or os.environ.get('GOOGLE_API_KEY')
    if not k:
        sys.exit(
            'Brak GEMINI_API_KEY. W sesji w chmurze dodaj zmienną w ustawieniach\n'
            'środowiska i otwórz NOWĄ sesję — zmienne są czytane przy starcie.'
        )
    return k


def zapytaj(sciezka: str, dane: dict | None = None) -> dict:
    req = urllib.request.Request(
        f'{API}/{sciezka}',
        data=json.dumps(dane).encode() if dane else None,
        headers={'x-goog-api-key': klucz(), 'Content-Type': 'application/json'},
        method='POST' if dane else 'GET',
    )
    try:
        with urllib.request.urlopen(req, timeout=300) as odp:
            return json.loads(odp.read())
    except urllib.error.HTTPError as e:
        tresc = e.read().decode(errors='replace')[:400]
        raise SystemExit(f'API odpowiedziało {e.code}:\n{tresc}')


def czytajPrompty() -> tuple[dict[str, str], dict[str, tuple[str, str]]]:
    """Zwraca (bloki stylu, zadania). Zadanie to `plik -> (prompt, nazwa stylu)`."""
    style: dict[str, str] = {}
    zadania: dict[str, tuple[str, str]] = {}
    for dok in DOKUMENTY:
        if not dok.exists():
            continue
        wiersze = dok.read_text(encoding='utf-8').splitlines()
        i = 0
        while i < len(wiersze):
            m = ZNACZNIK.match(wiersze[i].strip())
            if not m:
                i += 1
                continue
            rodzaj, nazwa, styl = m.group(1), m.group(2), m.group(3) or 'obiekt'
            # Blok kodu zaczyna się w następnej linii — pusta linia po drodze
            # zdarza się, gdy ktoś sformatuje dokument edytorem.
            j = i + 1
            while j < len(wiersze) and not wiersze[j].startswith('```'):
                if wiersze[j].strip():
                    break
                j += 1
            if j >= len(wiersze) or not wiersze[j].startswith('```'):
                sys.exit(f'{dok.name}: znacznik „{wiersze[i].strip()}" bez bloku kodu pod spodem')
            koniec = j + 1
            while koniec < len(wiersze) and not wiersze[koniec].startswith('```'):
                koniec += 1
            tresc = '\n'.join(wiersze[j + 1 : koniec]).strip()
            if rodzaj == 'styl':
                style[nazwa] = tresc
            else:
                zadania[nazwa] = (tresc, styl)
                if m.group(4):
                    PROPORCJE[nazwa] = m.group(4)
            i = koniec + 1
    return style, zadania


def pelnyPrompt(style: dict[str, str], prompt: str, styl: str) -> str:
    if styl == 'brak':
        return prompt
    if styl not in style:
        sys.exit(f'Nie ma bloku stylu „{styl}". Są: {", ".join(sorted(style)) or "żadnego"}')
    return f'{style[styl]}\n\n{prompt}'


def dostepnyModel() -> str:
    dane = zapytaj('models')
    maja = {m['name'].split('/')[-1] for m in dane.get('models', [])}
    for m in MODELE:
        if m in maja:
            return m
    obrazkowe = sorted(n for n in maja if 'image' in n)
    sys.exit(
        'Klucz nie ma dostępu do żadnego znanego modelu obrazkowego.\n'
        f'Modele z „image" w nazwie, które widzi: {", ".join(obrazkowe) or "brak"}'
    )


#: Cena tokenów obrazkowych na wyjściu, w dolarach za milion. Jedna liczba
#: zamiast tabeli „tyle za obrazek": rozdzielczości i tabele w sieci chodzą
#: parami, które się nie zgadzają, a rachunek idzie i tak z tokenów, więc
#: mnożymy to, co API naprawdę policzyło.
CENA_ZA_MILION = 120.0


def generuj(model: str, tresc: str, proporcje: str | None = None) -> tuple[bytes, int]:
    konfig: dict = {'responseModalities': ['IMAGE']}
    if proporcje:
        konfig['imageConfig'] = {'aspectRatio': proporcje}
    odp = zapytaj(
        f'models/{model}:generateContent',
        {
            'contents': [{'parts': [{'text': tresc}]}],
            'generationConfig': konfig,
        },
    )
    zuzycie = odp.get('usageMetadata', {})
    tokeny = zuzycie.get('candidatesTokenCount') or zuzycie.get('totalTokenCount') or 0
    for kandydat in odp.get('candidates', []):
        for czesc in kandydat.get('content', {}).get('parts', []):
            dane = czesc.get('inlineData') or czesc.get('inline_data')
            if dane and 'data' in dane:
                return base64.b64decode(dane['data']), int(tokeny)
    powod = json.dumps(odp)[:400]
    raise SystemExit(f'Odpowiedź bez obrazka:\n{powod}')


# ————————————————————————————————————————————————————————— OpenAI

API_OPENAI = 'https://api.openai.com/v1'
MODEL_OPENAI = os.environ.get('OPENAI_IMAGE_MODEL', 'gpt-image-1')

#: Style, których obrazki są OBIEKTAMI do wycięcia i dostają przezroczyste
#: tło. Ilustracje (tła menu, kampanii, wyniku) i kafle terenu mają tło
#: kryjące — przezroczystość by im tylko zaszkodziła.
PRZEZROCZYSTE = {'obiekt'}

#: Dolary za milion tokenów obrazu na wyjściu. Liczone z tego, co API
#: zwraca w `usage`, tak samo jak przy Gemini. Stawka z cennika OpenAI dla
#: gpt-image-1 w chwili pisania — przy zmianie modelu warto ją sprawdzić.
CENA_OPENAI_ZA_MILION = 40.0

#: Akapit o tle chromakey w bloku stylu `obiekt`. Przy prawdziwej alfie jest
#: szkodliwy: model posłusznie namalowałby magentę zamiast ją pominąć.
AKAPIT_CHROMY = re.compile(r'Background: a single FLAT.*?exact colour\.', re.S)


def kluczOpenAI() -> str:
    k = os.environ.get('OPENAI_API_KEY')
    if not k:
        sys.exit(
            'Brak OPENAI_API_KEY. W sesji w chmurze dodaj zmienną w ustawieniach\n'
            'środowiska (i host api.openai.com w dostępie do sieci), potem otwórz\n'
            'NOWĄ sesję — zmienne są czytane przy starcie.'
        )
    return k


def zapytajOpenAI(sciezka: str, dane: dict | None = None) -> dict:
    req = urllib.request.Request(
        f'{API_OPENAI}/{sciezka}',
        data=json.dumps(dane).encode() if dane else None,
        headers={'Authorization': f'Bearer {kluczOpenAI()}', 'Content-Type': 'application/json'},
        method='POST' if dane else 'GET',
    )
    try:
        with urllib.request.urlopen(req, timeout=300) as odp:
            return json.loads(odp.read())
    except urllib.error.HTTPError as e:
        tresc = e.read().decode(errors='replace')[:400]
        raise SystemExit(f'OpenAI odpowiedziało {e.code}:\n{tresc}')


def rozmiarOpenAI(proporcje: str | None) -> str:
    """OpenAI zna trzy kadry: kwadrat, poziomy 3:2 i pionowy 2:3."""
    if not proporcje:
        return '1024x1024'
    w, h = (int(x) for x in proporcje.split(':'))
    if w > h:
        return '1536x1024'
    if h > w:
        return '1024x1536'
    return '1024x1024'


def generujOpenAI(tresc: str, proporcje: str | None, przezroczyste: bool) -> tuple[bytes, int]:
    if przezroczyste:
        tresc = AKAPIT_CHROMY.sub(
            'Transparent background: only the object itself, nothing around it.', tresc
        )
    odp = zapytajOpenAI(
        'images/generations',
        {
            'model': MODEL_OPENAI,
            'prompt': tresc,
            'size': rozmiarOpenAI(proporcje),
            'quality': 'high',
            'background': 'transparent' if przezroczyste else 'opaque',
            'output_format': 'png',
            'n': 1,
        },
    )
    tokeny = int(odp.get('usage', {}).get('output_tokens') or 0)
    for wpis in odp.get('data', []):
        if wpis.get('b64_json'):
            return base64.b64decode(wpis['b64_json']), tokeny
    raise SystemExit(f'Odpowiedź bez obrazka:\n{json.dumps(odp)[:400]}')


def main() -> None:
    ap = argparse.ArgumentParser(description=__doc__)
    ap.add_argument('pliki', nargs='*', help='nazwy plików do wygenerowania')
    ap.add_argument('--lista', action='store_true', help='pokaż zadania i ich stan')
    ap.add_argument('--modele', action='store_true', help='pokaż modele dostępne dla klucza')
    ap.add_argument('--drukuj', action='store_true',
                    help='wypisz gotowe prompty do wklejenia w kliencie, nic nie generuj')
    ap.add_argument('--wszystko', action='store_true', help='wygeneruj wszystko, czego brak')
    ap.add_argument('--nadpisz', action='store_true', help='nie omijaj istniejących plików')
    ap.add_argument('--model', help='wymuś model zamiast wyboru z listy (tylko Gemini)')
    ap.add_argument('--silnik', choices=['openai', 'gemini'],
                    help='domyślnie openai, gdy jest OPENAI_API_KEY, inaczej gemini')
    args = ap.parse_args()

    style, zadania = czytajPrompty()
    silnik = args.silnik or ('openai' if os.environ.get('OPENAI_API_KEY') else 'gemini')

    if args.lista:
        print(f'{len(zadania)} zadań z {len([d for d in DOKUMENTY if d.exists()])} dokumentów:')
        for nazwa, (_, styl) in sorted(zadania.items()):
            stan = 'JEST' if (WSAD / nazwa).exists() else 'brak'
            print(f'  {stan:4s}  {nazwa:26s} styl: {styl}')
        return

    if args.drukuj:
        # Płatny abonament w kliencie (ChatGPT, aplikacja Gemini) NIE daje
        # dostępu programistycznego — API rozlicza się osobno. Kto woli nie
        # płacić za wywołania, generuje ręcznie w kliencie i wrzuca plik do
        # `tools/wsad/` pod nazwą z nagłówka; reszta potoku jest darmowa.
        wybrane = args.pliki or sorted(zadania)
        for nazwa in wybrane:
            if nazwa not in zadania:
                sys.exit(f'Nie ma promptu dla: {nazwa}. Zobacz --lista.')
            prompt, styl = zadania[nazwa]
            print(f'\n=== {nazwa} ===  (zapisz wynik jako tools/wsad/{nazwa})')
            print(pelnyPrompt(style, prompt, styl))
        return

    if args.modele and silnik == 'openai':
        dane = zapytajOpenAI('models')
        for m in sorted(x['id'] for x in dane.get('data', []) if 'image' in x['id']):
            print(' ', m)
        return

    if args.modele:
        dane = zapytaj('models')
        for m in sorted(x['name'].split('/')[-1] for x in dane.get('models', [])):
            print(' ', m)
        return

    if args.wszystko:
        doZrobienia = [n for n in sorted(zadania) if args.nadpisz or not (WSAD / n).exists()]
    else:
        doZrobienia = args.pliki
    if not doZrobienia:
        ap.error('podaj nazwy plików albo --wszystko (--lista pokazuje, co jest do zrobienia)')

    nieznane = [n for n in doZrobienia if n not in zadania]
    if nieznane:
        sys.exit(f'Nie ma promptu dla: {", ".join(nieznane)}. Zobacz --lista.')

    if silnik == 'openai':
        kluczOpenAI()
        model, cena = MODEL_OPENAI, CENA_OPENAI_ZA_MILION
    else:
        model, cena = args.model or dostepnyModel(), CENA_ZA_MILION
    print(f'silnik: {silnik}  ·  model: {model}')
    WSAD.mkdir(parents=True, exist_ok=True)
    razem = 0
    for nazwa in doZrobienia:
        cel = WSAD / nazwa
        if cel.exists() and not args.nadpisz:
            print(f'  {nazwa} — już jest, pomijam (--nadpisz, żeby zastąpić)')
            continue
        prompt, styl = zadania[nazwa]
        print(f'  {nazwa} … ', end='', flush=True)
        tresc = pelnyPrompt(style, prompt, styl)
        if silnik == 'openai':
            obraz, tokeny = generujOpenAI(tresc, PROPORCJE.get(nazwa), styl in PRZEZROCZYSTE)
        else:
            obraz, tokeny = generuj(model, tresc, PROPORCJE.get(nazwa))
        cel.write_bytes(obraz)
        razem += tokeny
        koszt = tokeny * cena / 1_000_000
        print(f'{cel.stat().st_size // 1024} kB  ·  {tokeny} tok.  ·  ${koszt:.3f}')

    if razem:
        print(f'\nRazem: {razem} tokenów wyjścia ≈ ${razem * cena / 1_000_000:.2f}')
    print('\nGotowe. Obejrzyj pliki w tools/wsad/, potem: python3 tools/wsad_wczytaj.py')


if __name__ == '__main__':
    main()
