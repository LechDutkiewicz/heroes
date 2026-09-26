#!/usr/bin/env python3
"""Dopisuje rundę krytyka do tools/postep-kampania.json.

    python3 tools/postep_runda.py "<kawałek>" <blind.png|-> <win 0/1> "<luka>" ["<notka>"] [--status s]
"""
import json, sys
from pathlib import Path
P = Path(__file__).resolve().parent / 'postep-kampania.json'
a = [x for x in sys.argv[1:] if not x.startswith('--status')]
status = next((x.split('=', 1)[1] for x in sys.argv[1:] if x.startswith('--status=')), None)
d = json.loads(P.read_text(encoding='utf-8'))
k = next(k for k in d['pieces'] if k['name'] == a[0])
r = {'win': a[2] == '1', 'gap': a[3]}
if a[1] != '-':
    # tools/blind/ jest poza gitem — zestawienie idzie do repozytorium jako
    # JPEG, żeby strona postępu dała się odbudować w nowym kontenerze.
    from PIL import Image
    src = P.parent.parent / a[1]
    cel = P.parent / 'postep-obrazy' / (src.stem + '.jpg')
    cel.parent.mkdir(exist_ok=True)
    im = Image.open(src).convert('RGB')
    if im.width > 1400:
        im = im.resize((1400, round(im.height * 1400 / im.width)), Image.LANCZOS)
    im.save(cel, 'JPEG', quality=80, optimize=True)
    r['blind'] = str(cel.relative_to(P.parent.parent))
if len(a) > 4: r['note'] = a[4]
k.setdefault('rounds', []).append(r)
if status: k['status'] = status
P.write_text(json.dumps(d, ensure_ascii=False, indent=1), encoding='utf-8')
