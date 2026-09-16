#!/usr/bin/env python3
"""Sprzątanie katalogu podglądów i spis treści do niego.

Po co osobny plik, a nie kilka linii w workflow
-----------------------------------------------
Bo to jedyne miejsce w publikowaniu, w którym coś się KASUJE. Sortowanie po
dacie i odcinanie ogona napisane w shellu byłoby jednolinijkowcem z `ls`,
`sort` i `head` — a jednolinijkowiec, który usuwa katalogi, jest dokładnie tą
rzeczą, której nikt nie czyta uważnie do dnia, w którym skasuje za dużo.

Podgląd gałęzi, która właśnie się publikuje, jest chroniony bezwarunkowo:
gdyby limit spadł do zera albo znacznik czasu wyszedł krzywo, deploy i tak nie
ma prawa skasować tego, co przed chwilą zbudował.

    python3 podglady.py <katalog-podglądów> <ile-zostawić>

Zmienna `SLUG` wskazuje podgląd nietykalny (pusta = żaden).
"""

import html
import json
import os
import shutil
import sys
from pathlib import Path

#: Nazwa pliku ze znacznikiem, zapisywanego przez workflow przy każdym podglądzie.
ZNACZNIK = 'podglad.json'


def opis(katalog: Path) -> dict:
    """Znacznik podglądu; przy braku albo uszkodzeniu — zastępczy.

    Data zastępcza to zero, czyli „najstarszy z możliwych": katalog bez
    czytelnego znacznika poleci przy sprzątaniu jako pierwszy. To celowe —
    inaczej śmieć bez daty siedziałby w katalogu na zawsze, zajmując miejsce
    prawdziwym podglądom.
    """
    try:
        dane = json.loads((katalog / ZNACZNIK).read_text(encoding='utf-8'))
        return {
            'galaz': str(dane.get('galaz', katalog.name)),
            'data': str(dane.get('data', '')),
            'commit': str(dane.get('commit', ''))[:7],
        }
    except Exception:
        return {'galaz': katalog.name, 'data': '', 'commit': ''}


def posprzataj(korzen: Path, ile_zostawic: int, nietykalny: str) -> list[tuple[Path, dict]]:
    """Zostawia najnowsze podglądy, kasuje resztę. Zwraca to, co zostało."""
    podglady = [(k, opis(k)) for k in sorted(korzen.iterdir()) if k.is_dir()]
    # Malejąco po dacie: najnowsze na początku.
    podglady.sort(key=lambda p: p[1]['data'], reverse=True)

    zostaja, kasowane = [], []
    for katalog, dane in podglady:
        chroniony = katalog.name == nietykalny
        if chroniony or len(zostaja) < ile_zostawic:
            zostaja.append((katalog, dane))
        else:
            kasowane.append((katalog, dane))

    for katalog, dane in kasowane:
        print(f'  kasuję stary podgląd: {katalog.name} ({dane["data"] or "bez daty"})')
        shutil.rmtree(katalog)

    return zostaja


def spis(korzen: Path, podglady: list[tuple[Path, dict]]) -> None:
    """Strona ze spisem podglądów — żeby nie trzeba było pamiętać adresów."""
    wiersze = []
    for katalog, dane in podglady:
        kiedy = dane['data'].replace('T', ' ').replace('Z', ' UTC') if dane['data'] else '—'
        podpis = f'{kiedy} · {dane["commit"]}' if dane['commit'] else kiedy
        wiersze.append(
            f'    <li><a href="./{html.escape(katalog.name)}/">'
            f'{html.escape(dane["galaz"])}</a><span>{html.escape(podpis)}</span></li>'
        )
    lista = '\n'.join(wiersze) if wiersze else '    <li><span>Nie ma jeszcze żadnego.</span></li>'

    (korzen / 'index.html').write_text(
        f"""<!doctype html>
<html lang="pl">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Podglądy gałęzi — Pokémon Heroes</title>
<style>
  :root {{ color-scheme: dark; }}
  body {{ margin: 0; padding: 2rem 1rem; background: #0d1023; color: #e8ecf8;
         font: 16px/1.5 system-ui, -apple-system, "Segoe UI", sans-serif; }}
  main {{ max-width: 42rem; margin: 0 auto; }}
  h1 {{ font-size: 1.4rem; margin: 0 0 .25rem; }}
  p {{ margin: 0 0 1.5rem; color: #9aa6c6; }}
  ul {{ list-style: none; margin: 0; padding: 0; }}
  li {{ display: flex; flex-wrap: wrap; gap: .25rem 1rem; align-items: baseline;
        justify-content: space-between; padding: .85rem 1rem; margin-bottom: .5rem;
        background: #171b35; border: 1px solid #262c52; border-radius: 10px; }}
  a {{ color: #ffd479; font-weight: 600; text-decoration: none; word-break: break-all; }}
  a:hover, a:focus {{ text-decoration: underline; }}
  span {{ color: #7d89ab; font-size: .85rem; }}
  .wroc {{ display: inline-block; margin-top: 1.5rem; color: #9aa6c6; }}
</style>
</head>
<body>
<main>
  <h1>Podglądy gałęzi</h1>
  <p>Wersje robocze gry. Każda gałąź ma własny adres i nie nadpisuje pozostałych.</p>
  <ul>
{lista}
  </ul>
  <a class="wroc" href="../">← wersja główna</a>
</main>
</body>
</html>
""",
        encoding='utf-8',
    )


if __name__ == '__main__':
    korzen = Path(sys.argv[1])
    ile = int(sys.argv[2])
    korzen.mkdir(parents=True, exist_ok=True)
    spis(korzen, posprzataj(korzen, ile, os.environ.get('SLUG', '')))
