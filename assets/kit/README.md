# Zestaw grafik (asset pack)

**Tutaj wrzucacie cały pobrany zestaw** — z zachowaniem jego katalogów.
Niczego nie trzeba rozpakowywać do środka ani przycinać.

Docelowo ma tu być tak:

```
assets/kit/
├── Commissions are welcome!.txt
├── sprites/
├── tileset/
├── UI/
├── attack effects/
├── backgrounds/
├── character overworld/
└── menu sprites/
```

Jeśli zestaw ma swoją nazwę, może być też o jeden poziom głębiej —
`assets/kit/nazwa-zestawu/tileset/` itd. Poradzę sobie z jednym i z drugim.

## Wrzućcie też plik .txt

`Commissions are welcome!.txt` wygląda na plik od autora i najpewniej jest
w nim licencja oraz kto to narysował. To najważniejszy plik w całej paczce —
bez niego nie wiadomo, czy wolno tych grafik używać. Wrzućcie go koniecznie.

## Do czego posłuży który katalog

| katalog | do czego |
|---|---|
| `tileset` | teren planszy bitwy — trawa, woda, skały, ścieżki |
| `backgrounds` | tło za planszą |
| `UI` | ramki panelu, przyciski, paski |
| `attack effects` | animacje trafień, pociski |
| `sprites` | stworki — porównam z tym, co mamy w `assets/pokemon` |
| `character overworld` | postacie na mapie — przyda się przy mapie przygody |
| `menu sprites` | ekran tytułowy i menu |

Najpierw wezmę się za `tileset` i `backgrounds`, bo to zmieni wygląd bitwy
najbardziej i najszybciej.

## Co się z nimi stanie dalej

Arkusz kafelków (tileset) to jeden duży obrazek z polami ułożonymi w siatkę.
Gra nie wczytuje takiego arkusza wprost — trzeba go pociąć na pojedyncze
kafelki. Robi to `tools/slice_tileset.py`, zapisując wynik do
`public/terrain/`, skąd wczyta je plansza:

```
# sam podpowie, jaki rozmiar kafelka pasuje
python3 tools/slice_tileset.py "assets/kit/tileset/teren.png"

# i tnie, gdy już wiadomo
python3 tools/slice_tileset.py "assets/kit/tileset/teren.png" --tile 32
```

Tym zajmę się ja, gdy pliki tu trafią.
