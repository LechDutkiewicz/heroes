#!/bin/sh
# Wszystkie sondy mapy przygody po kolei, z jednym podsumowaniem na końcu.
# Każda sonda klika w mapę albo w jej okna — po zmianie HUD-u puszcza się
# je wszystkie, bo każda sprawdza co innego.
#
#   sh tools/sondy-mapy.sh [http://localhost:4173]
URL="${1:-http://localhost:4173}"
wynik=0
for s in probe-klik probe-przygoda probe-zwis probe-brama probe-kopalnia probe-awans probe-bohater probe-misja; do
  if node "tools/$s.mjs" --url "$URL" > "/tmp/sonda-$s.log" 2>&1; then
    echo "OK    $s"
  else
    echo "ŹLE   $s   (log: /tmp/sonda-$s.log)"
    wynik=1
  fi
done
exit $wynik
