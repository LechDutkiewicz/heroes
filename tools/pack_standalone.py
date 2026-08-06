#!/usr/bin/env python3
"""
Skleja całą grę w jeden plik HTML, który działa bez serwera.

Po co: żeby dało się zagrać dwuklikiem, bez instalowania Node'a i bez czekania
na wdrożenie. Przydaje się też, gdy GitHub Pages nie działa.

Jak to działa: kod gry wkleiamy wprost do pliku, a wszystkie obrazki zamieniamy
na zapis tekstowy (data URI) i podmieniamy w locie. Gra prosi o obrazki po
ścieżkach w rodzaju ./sprites/00020.png, więc podstawiamy dwie pułapki:

  - na pobieranie plików (fetch i XHR) — tak Phaser wczytuje obrazki,
  - na ustawianie adresu obrazka (HTMLImageElement.src),
  - na ustawianie kursora myszy (style.cursor), bo kursory to też pliki PNG.

Dzięki temu nie trzeba ruszać kodu gry.

Uruchomienie (najpierw `npm run build`):

    python3 tools/pack_standalone.py
"""

from __future__ import annotations

import base64
import json
import re
import sys
from pathlib import Path

DIST = Path("dist")
OUT = Path("pokemon-heroes.html")

# Katalogi z zasobami, których gra żąda w czasie działania.
ASSET_DIRS = ["terrain", "cursors"]


def data_uri(path: Path) -> str:
    kind = "image/svg+xml" if path.suffix == ".svg" else "image/png"
    return f"data:{kind};base64," + base64.b64encode(path.read_bytes()).decode("ascii")


def used_sprites() -> list[str]:
    """Tylko te stworki, które naprawdę stoją w armiach — nie wszystkie 270."""
    text = Path("src/data/factions.ts").read_text(encoding="utf-8")
    return re.findall(r"unit\(\d+, '(\d+)'", text)


def collect() -> dict[str, str]:
    """Mapa: ścieżka, o którą prosi gra -> obrazek zapisany tekstem."""
    assets: dict[str, str] = {}

    for name in used_sprites():
        path = DIST / "sprites" / f"{name}.png"
        if not path.exists():
            raise SystemExit(f"Brakuje {path} — czy `npm run build` się wykonał?")
        assets[f"sprites/{name}.png"] = data_uri(path)

    for folder in ASSET_DIRS:
        for path in sorted((DIST / folder).rglob("*.png")):
            assets[str(path.relative_to(DIST)).replace("\\", "/")] = data_uri(path)

    return assets


# Pułapki podstawiane przed startem gry. Klucz szukamy po końcówce ścieżki,
# bo przeglądarka potrafi zamienić ./sprites/x.png na pełny adres file://.
SHIM = """
<script>
(function () {
  var A = window.__ASSETS__;
  function find(url) {
    if (typeof url !== 'string') return null;
    if (url.indexOf('data:') === 0) return null;
    var clean = url.split('?')[0].split('#')[0];
    for (var key in A) {
      if (clean.length >= key.length && clean.slice(-key.length) === key) return A[key];
    }
    return null;
  }

  // Phaser pobiera obrazki przez fetch, a nie przez Image.src — trzeba objąć
  // oba sposoby, a dla pewności także starsze XHR.
  var origFetch = window.fetch;
  window.fetch = function (input, init) {
    var url = typeof input === 'string' ? input : (input && input.url);
    var hit = find(url);
    if (hit) return origFetch(hit, init);
    return origFetch(input, init);
  };

  var open = XMLHttpRequest.prototype.open;
  XMLHttpRequest.prototype.open = function (method, url) {
    var hit = find(url);
    var args = Array.prototype.slice.call(arguments);
    if (hit) args[1] = hit;
    return open.apply(this, args);
  };

  var img = Object.getOwnPropertyDescriptor(HTMLImageElement.prototype, 'src');
  Object.defineProperty(HTMLImageElement.prototype, 'src', {
    configurable: true,
    get: function () { return img.get.call(this); },
    set: function (value) { img.set.call(this, find(value) || value); },
  });

  // Kursory to osobna historia: przeglądarka trzyma style.cursor jako własność
  // samego elementu, a nie prototypu, więc łatkę zakładamy na konkretnym
  // kanwasie — dopiero gdy gra go utworzy.
  function patchCursor(style) {
    var last = '';
    Object.defineProperty(style, 'cursor', {
      configurable: true,
      get: function () { return last; },
      set: function (value) {
        last = String(value);
        style.setProperty('cursor', last.replace(/url\(['"]?([^'")]+)['"]?\)/g, function (whole, path) {
          var hit = find(path);
          return hit ? "url('" + hit + "')" : whole;
        }));
      },
    });
  }

  var tries = 0;
  var timer = setInterval(function () {
    var canvas = document.querySelector('canvas');
    if (canvas) { patchCursor(canvas.style); clearInterval(timer); }
    else if (++tries > 200) clearInterval(timer);
  }, 25);
})();
</script>
"""


def main() -> int:
    if not DIST.is_dir():
        print("Brak katalogu dist — uruchom najpierw `npm run build`.", file=sys.stderr)
        return 1

    scripts = sorted((DIST / "assets").glob("*.js"))
    if not scripts:
        print("Nie znalazłem zbudowanego pliku JS w dist/assets.", file=sys.stderr)
        return 1

    assets = collect()
    game_js = scripts[0].read_text(encoding="utf-8")
    style = re.search(r"<style>(.*?)</style>", (DIST / "index.html").read_text(encoding="utf-8"), re.S)

    html = f"""<!doctype html>
<html lang="pl">
<head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width, initial-scale=1.0" />
<title>Pokemon Heroes</title>
<style>{style.group(1) if style else ""}</style>
<script>window.__ASSETS__ = {json.dumps(assets)};</script>
{SHIM}
</head>
<body>
<div id="app"></div>
<script type="module">
{game_js}
</script>
</body>
</html>
"""
    OUT.write_text(html, encoding="utf-8")
    size = OUT.stat().st_size / 1024 / 1024
    print(f"{OUT} gotowy — {size:.1f} MB, {len(assets)} obrazków w środku")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
