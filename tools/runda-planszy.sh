#!/usr/bin/env bash
# Jedna runda buildera planszy: generator → tło → zrzut całej planszy z gry →
# profil (liczby + schemat) → sondy. Wszystko, co krytyk dostaje do oceny.
#
#   tools/runda-planszy.sh <id-planszy> <port 5200–5229> [etykieta]
#
# Serwer podglądu jest stawiany na własnym porcie i gaszony po zrzucie, bo na
# portach zrzutów Vite nie obserwuje plików — stary serwer pokazałby starą mapę.
set -euo pipefail
cd "$(dirname "$0")/.."
MAPA="$1"; PORT="$2"; ETYKIETA="${3:-$MAPA}"
LOG="/tmp/vite-$PORT.log"

python3 tools/generuj_mape.py "$MAPA" | tail -6
python3 tools/render_mapa.py "$MAPA" | tail -3

npx vite --port "$PORT" --strictPort > "$LOG" 2>&1 &
VITE=$!
trap 'kill $VITE 2>/dev/null || true' EXIT
for i in $(seq 1 40); do
  curl -sS -o /dev/null "http://localhost:$PORT/" && break
  sleep 0.5
done
mkdir -p tools/shots
node tools/zrzut-mapa.mjs --url "http://localhost:$PORT" --mapa "$MAPA" --caly --bok 1440 \
  --out "tools/shots/caly-$ETYKIETA.png" | tail -1
kill $VITE 2>/dev/null || true

python3 tools/profil-mapy.py "$MAPA" | sed -n '1,4p;6,8p;12,18p'
npx tsx tools/probe-mapy.ts 2>&1 | grep -E "ŹLE|UWAGA|^=|razem|błęd" | head -40 || true
