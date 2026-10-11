#!/usr/bin/env python3
"""Strona postępu pętli „gauntlet" plansz kampanii — z `tools/postep-plansze.json`.

Jeden kawałek = jedna plansza. Runda = ślepe porównanie schematu planszy
z oficjalną mapą Heroes 3 (A/B bez podpisów) + checklista z
`tools/wzorzec/CHECKLISTA.md` + jedna największa luka. Obrazy wchodzą jako
data URI (JPEG), bo strona jest publikowana jako jeden plik.

    python3 tools/postep_plansze.py [wyjście.html]
"""

import base64
import html
import io
import json
import sys
from pathlib import Path

from PIL import Image

KORZEN = Path(__file__).resolve().parent.parent
DANE = KORZEN / 'tools' / 'postep-plansze.json'
e = html.escape


def obraz(sciezka: str, szer: int = 720, jakosc: int = 72) -> str:
    p = KORZEN / sciezka
    if not p.exists():
        return ''
    im = Image.open(p).convert('RGB')
    if im.width > szer:
        im = im.resize((szer, round(im.height * szer / im.width)), Image.LANCZOS)
    buf = io.BytesIO()
    im.save(buf, 'JPEG', quality=jakosc, optimize=True)
    return 'data:image/jpeg;base64,' + base64.b64encode(buf.getvalue()).decode()


STATUS = {
    'todo': ('czeka', 'todo'),
    'build': ('w budowie', 'build'),
    'critic': ('u krytyka', 'critic'),
    'done': ('wygrywa ślepo', 'done'),
}


def runda(r: dict) -> str:
    win = bool(r.get('win'))
    ch = r.get('checklista') or {}
    nie = r.get('nie') or []
    obrazy = ''.join(
        f'<figure><img src="{obraz(o["plik"])}" alt="{e(o.get("opis", ""))}" loading="lazy">'
        f'<figcaption>{e(o.get("opis", ""))}</figcaption></figure>'
        for o in r.get('obrazy', []) if obraz(o['plik'])
    )
    return f'''
    <li class="runda {'win' if win else 'loss'}">
      <div class="r-naglowek">
        <span class="r-nr">runda {r["nr"]}</span>
        <span class="werdykt">{'nasza wygrywa' if win else 'wzorzec wygrywa'}</span>
        <span class="wzorzec">wzorzec: {e(r.get("wzorzec", ""))}</span>
        <span class="licznik">checklista TAK {ch.get("TAK", "–")} · CZĘŚCIOWO {ch.get("CZESCIOWO", "–")} · NIE {ch.get("NIE", "–")}</span>
      </div>
      <p class="luka"><b>Największa luka:</b> {e(r.get("luka", ""))}</p>
      {('<ul class="nie">' + ''.join(f'<li>{e(n)}</li>' for n in nie) + '</ul>') if nie else ''}
      {('<p class="zmiana"><b>Co zmienił builder:</b> ' + e(r["zmiana"]) + '</p>') if r.get('zmiana') else ''}
      <div class="obrazy">{obrazy}</div>
    </li>'''


def kawalek(k: dict) -> str:
    nazwa, kl = STATUS.get(k.get('status', 'todo'), STATUS['todo'])
    rundy = ''.join(runda(r) for r in reversed(k.get('rundy', [])))
    return f'''
  <section class="kawalek" id="{e(k["id"])}">
    <header>
      <h2>{e(k["tytul"])}</h2>
      <span class="st {kl}">{nazwa}</span>
      <span class="rund">{len(k.get("rundy", []))} rund</span>
    </header>
    <p class="opis">{e(k.get("opis", ""))}</p>
    <ol class="rundy">{rundy or '<li class="pusto">jeszcze bez rundy</li>'}</ol>
  </section>'''


def strona(d: dict) -> str:
    kawalki = ''.join(kawalek(k) for k in d['kawalki'])
    done = sum(1 for k in d['kawalki'] if k.get('status') == 'done')
    return f'''<title>Plansze kampanii</title>
<style>
/* układ: jedna kolumna kart, każda plansza to karta z rundami od najnowszej */
:root {{
  --bg: #f3efe4; --fg: #2a2418; --mut: #6d6350; --kar: #fffdf7; --lin: #d8cfbb;
  --akc: #2f6b3a; --zle: #a63a2b; --ost: #b7791f;
  --disp: "Alegreya", Georgia, serif; --body: "Source Sans 3", system-ui, sans-serif;
}}
@media (prefers-color-scheme: dark) {{ :root:not([data-theme="light"]) {{
  --bg: #1c1a15; --fg: #ece5d4; --mut: #a39a86; --kar: #262219; --lin: #3d382c;
  --akc: #7fc48d; --zle: #e07b6a; --ost: #e0b05a; color-scheme: dark }} }}
:root[data-theme="dark"] {{
  --bg: #1c1a15; --fg: #ece5d4; --mut: #a39a86; --kar: #262219; --lin: #3d382c;
  --akc: #7fc48d; --zle: #e07b6a; --ost: #e0b05a; color-scheme: dark }}
body {{ background: var(--bg); color: var(--fg); font-family: var(--body); margin: 0; padding-block: 24px; padding-inline: 16px; }}
main {{ max-width: 980px; margin: 0 auto; display: grid; gap: 28px; }}
h1 {{ font-family: var(--disp); font-size: 2rem; margin: 0; text-wrap: balance; }}
h2 {{ font-family: var(--disp); font-size: 1.4rem; margin: 0; }}
.lead {{ color: var(--mut); max-width: 65ch; margin: 6px 0 0; }}
.kawalek {{ background: var(--kar); border: 1px solid var(--lin); border-radius: 6px; padding: 18px; min-width: 0; }}
.kawalek header {{ display: flex; flex-wrap: wrap; gap: 10px; align-items: baseline; }}
.st {{ font-size: .8rem; letter-spacing: .04em; text-transform: uppercase; padding: 2px 8px; border-radius: 3px; border: 1px solid currentColor; }}
.st.done {{ color: var(--akc); }} .st.critic {{ color: var(--ost); }} .st.build {{ color: var(--ost); }} .st.todo {{ color: var(--mut); }}
.rund {{ color: var(--mut); font-size: .9rem; }}
.opis {{ color: var(--mut); margin: 6px 0 12px; max-width: 70ch; }}
.rundy {{ list-style: none; margin: 0; padding: 0; display: grid; gap: 14px; }}
.runda {{ border-left: 4px solid var(--zle); padding: 8px 12px; background: color-mix(in srgb, var(--kar) 92%, var(--fg)); }}
.runda.win {{ border-left-color: var(--akc); }}
.r-naglowek {{ display: flex; flex-wrap: wrap; gap: 6px 14px; font-size: .9rem; color: var(--mut); align-items: baseline; }}
.r-nr {{ font-weight: 600; color: var(--fg); }}
.werdykt {{ font-weight: 700; color: var(--zle); }} .win .werdykt {{ color: var(--akc); }}
.licznik {{ font-variant-numeric: tabular-nums; }}
.luka {{ margin: 8px 0 4px; }}
.nie {{ margin: 4px 0 8px; padding-left: 20px; color: var(--mut); font-size: .92rem; }}
.zmiana {{ margin: 4px 0 8px; }}
.obrazy {{ display: grid; grid-template-columns: repeat(auto-fit, minmax(260px, 1fr)); gap: 10px; }}
figure {{ margin: 0; min-width: 0; }} figure img {{ width: 100%; height: auto; border: 1px solid var(--lin); display: block; }}
figcaption {{ font-size: .8rem; color: var(--mut); margin-top: 3px; }}
.pusto {{ color: var(--mut); }}
.stopka {{ color: var(--mut); font-size: .85rem; }}
</style>
<main>
  <div>
    <h1>Plansze kampanii — pętla jakości</h1>
    <p class="lead">{e(d.get("wstep", ""))}</p>
    <p class="lead">Wygrywa ślepo: {done} z {len(d["kawalki"])} plansz. Ostatnia aktualizacja: {e(d.get("aktualizacja", ""))}.</p>
  </div>
  {kawalki}
  <p class="stopka">{e(d.get("stopka", ""))}</p>
</main>
'''


if __name__ == '__main__':
    d = json.loads(DANE.read_text(encoding='utf-8'))
    out = Path(sys.argv[1]) if len(sys.argv) > 1 else KORZEN / 'tools' / 'postep-plansze.html'
    out.write_text(strona(d), encoding='utf-8')
    print(f'zapisano {out} ({out.stat().st_size // 1024} KB)')
