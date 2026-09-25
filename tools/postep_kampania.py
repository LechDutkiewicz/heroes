#!/usr/bin/env python3
"""Strona postępu prac nad kampanią — generowana z `tools/postep-kampania.json`.

Każdy kawałek (menu, ekran kampanii, warunki misji, plansze…) ma listę rund.
Runda to ślepe porównanie z wzorcem z Heroes 2: obraz A/B, werdykt krytyka
i jedna największa luka. Obrazy idą do strony jako data URI (zmniejszone do
JPEG), bo strona jest publikowana jako jeden plik.

    python3 tools/postep_kampania.py [wyjście.html]
"""

import base64
import html
import io
import json
import sys
from pathlib import Path

from PIL import Image

KORZEN = Path(__file__).resolve().parent.parent
DANE = KORZEN / 'tools' / 'postep-kampania.json'


def obraz(sciezka: str, szer: int = 760) -> str:
    p = KORZEN / sciezka
    if not p.exists():
        return ''
    im = Image.open(p).convert('RGB')
    if im.width > szer:
        im = im.resize((szer, round(im.height * szer / im.width)), Image.LANCZOS)
    buf = io.BytesIO()
    im.save(buf, 'JPEG', quality=78, optimize=True)
    return 'data:image/jpeg;base64,' + base64.b64encode(buf.getvalue()).decode()


STATUS = {
    'todo': ('czeka', 'st-todo'),
    'build': ('w budowie', 'st-build'),
    'critic': ('u krytyka', 'st-critic'),
    'done': ('wygrywa ślepo', 'st-done'),
}

e = html.escape


def runda(r: dict, i: int) -> str:
    wynik = 'nasze wygrywa' if r.get('win') else 'wzorzec wygrywa'
    klasa = 'win' if r.get('win') else 'loss'
    img = obraz(r['blind']) if r.get('blind') else ''
    fig = f'<img src="{img}" alt="Ślepe porównanie, runda {i}" loading="lazy">' if img else ''
    return f'''
      <li class="runda">
        <div class="runda-glowa"><span class="nr">{e(r.get('label') or f'Runda {i}')}</span><span class="werdykt {klasa}">{wynik}</span></div>
        {fig}
        <p class="luka"><b>Największa luka:</b> {e(r.get('gap', ''))}</p>
        {f'<p class="notka">{e(r["note"])}</p>' if r.get('note') else ''}
      </li>'''


def kawalek(k: dict) -> str:
    etykieta, klasa = STATUS.get(k.get('status', 'todo'), STATUS['todo'])
    rundy = k.get('rounds', [])
    wygrane = sum(1 for r in rundy if r.get('win'))
    lista = ''.join(runda(r, i + 1) for i, r in reversed(list(enumerate(rundy))))
    return f'''
    <section class="kawalek">
      <header>
        <h2>{e(k['name'])}</h2>
        <span class="pill {klasa}">{etykieta}</span>
      </header>
      <p class="wzorzec"><span>Wzorzec</span> {e(k.get('bar', ''))}</p>
      <p class="opis">{e(k.get('note', ''))}</p>
      <p class="licznik">{len(rundy)} rund · {wygrane} wygranych</p>
      <ol class="rundy">{lista or '<li class="pusto">Jeszcze bez rundy krytyka.</li>'}</ol>
    </section>'''


def main():
    dane = json.loads(DANE.read_text(encoding='utf-8'))
    wyjscie = Path(sys.argv[1]) if len(sys.argv) > 1 else KORZEN / 'tools' / 'postep-kampania.html'
    kawalki = dane['pieces']
    gotowe = sum(1 for k in kawalki if k.get('status') == 'done')
    tresc = ''.join(kawalek(k) for k in kawalki)
    strona = f'''<title>Kampania Pokemon Heroes</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Alegreya+SC:wght@700&family=IBM+Plex+Sans:wght@400;600&family=IBM+Plex+Mono:wght@500&display=swap">
<style>
  :root {{
    color-scheme: dark;
    --tlo: #111a2b; --panel: #18243a; --linia: #2a3a57; --tekst: #e6ebf3; --miekki: #9fb0c8;
    --zloto: #e2ad3b; --wygr: #4fb477; --przegr: #d9644f; --bud: #5b8fd9;
  }}
  body {{ background: var(--tlo); color: var(--tekst); font: 15px/1.55 'IBM Plex Sans', system-ui, sans-serif; }}
  .strona {{ max-width: 980px; margin: 0 auto; padding-inline: 16px; padding-block: 28px 64px; display: grid; gap: 22px; }}
  h1 {{ font: 700 clamp(26px, 5vw, 38px)/1.1 'Alegreya SC', Georgia, serif; color: var(--zloto); margin: 0; text-wrap: balance; }}
  .glowa p {{ margin: 6px 0 0; color: var(--miekki); max-width: 65ch; }}
  .suma {{ font-family: 'IBM Plex Mono', monospace; font-variant-numeric: tabular-nums; color: var(--tekst); }}
  .kawalek {{ background: var(--panel); border: 1px solid var(--linia); border-radius: 10px; padding: 18px; display: grid; gap: 8px; }}
  .kawalek header {{ display: flex; flex-wrap: wrap; gap: 10px; align-items: center; justify-content: space-between; }}
  h2 {{ margin: 0; font-size: 19px; text-wrap: balance; }}
  .pill {{ font: 500 12px 'IBM Plex Mono', monospace; letter-spacing: .04em; text-transform: uppercase; padding: 3px 10px; border-radius: 99px; border: 1px solid currentColor; }}
  .st-todo {{ color: var(--miekki); }} .st-build {{ color: var(--bud); }} .st-critic {{ color: var(--zloto); }} .st-done {{ color: var(--wygr); }}
  .wzorzec, .opis, .licznik {{ margin: 0; }}
  .wzorzec span {{ font: 500 11px 'IBM Plex Mono', monospace; text-transform: uppercase; letter-spacing: .06em; color: var(--zloto); margin-right: 6px; }}
  .opis {{ color: var(--miekki); }}
  .licznik {{ font: 500 12px 'IBM Plex Mono', monospace; color: var(--miekki); }}
  .rundy {{ list-style: none; margin: 6px 0 0; padding: 0; display: grid; gap: 14px; }}
  .runda {{ border-top: 1px solid var(--linia); padding-top: 12px; display: grid; gap: 8px; }}
  .runda-glowa {{ display: flex; gap: 10px; align-items: baseline; }}
  .nr {{ font: 500 12px 'IBM Plex Mono', monospace; color: var(--miekki); }}
  .werdykt {{ font-weight: 600; }} .werdykt.win {{ color: var(--wygr); }} .werdykt.loss {{ color: var(--przegr); }}
  .runda img {{ width: 100%; border-radius: 6px; border: 1px solid var(--linia); }}
  .luka, .notka {{ margin: 0; max-width: 75ch; }} .notka {{ color: var(--miekki); font-size: 14px; }}
  .pusto {{ color: var(--miekki); }}
</style>
<div class="strona">
  <div class="glowa">
    <h1>Kampania: postęp prac</h1>
    <p>Każdy ekran jest porównywany na ślepo z Heroes of Might and Magic II: The Succession Wars. Kawałek jest skończony dopiero wtedy, gdy krytyk bez podpisów wybierze nasz.</p>
    <p class="suma">{gotowe} z {len(kawalki)} kawałków wygrywa · aktualizacja {e(dane.get('updated', ''))}</p>
  </div>
  {tresc}
</div>
'''
    wyjscie.write_text(strona, encoding='utf-8')
    print(f'zapisano {wyjscie} ({wyjscie.stat().st_size // 1024} KB)')


if __name__ == '__main__':
    main()
