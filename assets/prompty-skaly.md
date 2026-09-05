# Prompty na nowe sprite'y skał

Cztery istniejące głazy (`public/mapa/skala.png`, `skala-2.png`, `kopiec.png`,
`kopiec-2.png` — te same pliki co `public/terrain/obstacles/glaz*.png`) mają
w praktyce jedną sylwetkę: zaokrąglona bryła z jednym trójkątnym czubkiem,
tylko przemalowana i odbita. W gęstym bloku skalnym (`bloki-przeszkod.ts`,
bloki 2×2 i 3×2) to się widzi — kilkanaście kopii tego samego kształtu obok
siebie czyta się jak tapeta, dokładnie ten sam problem, który STAN.md opisuje
przy paśmie gór z pierwszej wersji mapy.

Poniższe pięć promptów daje pięć NOWYCH sylwetek, żeby duży blok skalny miał
z czego budować różnorodność, a nie tylko skalę i odbicie tego samego kamienia.

## Wspólne wymagania stylu (dodaj do każdego promptu)

Ten sam styl co istniejące drzewa i skały na mapie: malarski, półpłaski cieniowany
sprite gry 2D top-down/izometrycznej, wygładzone krawędzie bez surowego
pixel-artu, jedno źródło światła z góry-lewej, ciepły biały highlight na
górnych płaszczyznach i miękki chłodny cień od spodu. Tło w pełni przezroczyste
(alpha channel), bez własnego cienia rzucanego na grunt — cień dokłada silnik
gry. Kadrowanie: cały obiekt mieści się w kadrze z małym marginesem, podstawa
obiektu leży przy dolnej krawędzi kadru (sprite jest zaczepiony u dołu).
Rozdzielczość źródłowa 512×512 lub 512×640, format PNG.

---

### 1. Duży głaz z pęknięciami (zamiennik/wariant `skala`)

```
Game asset, single large grey boulder rock, painterly semi-flat shaded 2D
sprite for a top-down adventure map, viewed from a slight 3/4 top angle.
Rounded but irregular mass with 2-3 visible deep cracks running across the
surface and small chipped edges — NOT a smooth dome. Cool blue-grey stone
color with a warm white highlight catching the upper-left facets and a soft
violet-grey shadow on the lower-right. A few small loose pebbles scattered
at the base. Transparent background, object anchored at the bottom of the
frame, soft painted edges (no pixel-art aliasing), no cast shadow. Style
reference: Heroes of Might and Magic III adventure map obstacle art,
modernized and smoothed.
```

### 2. Skalna iglica (nowa sylwetka — wysoka, pionowa)

```
Game asset, a tall jagged rock spire / stone pillar, single obstacle sprite
for a top-down adventure map, painterly semi-flat shading, 3/4 top-down
angle. Narrow vertical silhouette (much taller than wide) with sharp angular
facets stacked upward, not rounded — reads as a shard of rock jutting from
the ground. Grey-violet stone with a bright warm highlight on the tallest
facet and deep cool shadow in the crevices. Small rubble at the base.
Transparent background, anchored at the bottom of the frame, smooth painted
edges, no cast shadow. Style reference: Heroes of Might and Magic III
adventure map obstacle art, modernized and smoothed.
```

### 3. Płaska pęknięta płyta skalna (nowa sylwetka — niska, szeroka)

```
Game asset, a low flat slab of cracked bedrock breaking through grass,
single obstacle sprite for a top-down adventure map, painterly semi-flat
shading, 3/4 top-down angle. Wide and low silhouette (wider than tall) —
a flat tilted stone plate with a jagged crack pattern across its top surface
and a thin exposed dirt edge where it meets the ground. Muted grey-brown
stone, warm highlight along the raised edge, soft shadow where the slab
overhangs the grass. Transparent background, anchored at the bottom of the
frame, smooth painted edges, no cast shadow. Style reference: Heroes of
Might and Magic III adventure map obstacle art, modernized and smoothed.
```

### 4. Omszały głaz (nowa sylwetka — organiczny akcent koloru)

```
Game asset, a large rounded boulder partially covered in patches of moss
and small ferns, single obstacle sprite for a top-down adventure map,
painterly semi-flat shading, 3/4 top-down angle. Boulder shape is lumpy and
asymmetric (not a smooth dome), with green moss patches concentrated on the
upper-facing surfaces and bare grey stone showing through on the lower
facets. A tiny fern or two growing from a crack. Transparent background,
anchored at the bottom of the frame, smooth painted edges, no cast shadow.
Style reference: Heroes of Might and Magic III adventure map obstacle art,
modernized and smoothed.
```

### 5. Rumowisko / usypisko odłamków (nowa sylwetka — dla dużego bloku 3×2)

```
Game asset, a cluster of jagged broken rock rubble / scree pile, single
obstacle sprite for a top-down adventure map, painterly semi-flat shading,
3/4 top-down angle. Several angular rock fragments of different sizes
(from fist-size to boulder-size) piled together at slightly different
heights and angles — reads as a rockslide debris pile, not one solid mass.
Grey-blue stone with warm highlights on the topmost fragments and cool
shadow in the gaps between them. Transparent background, anchored at the
bottom of the frame, smooth painted edges, no cast shadow. Style reference:
Heroes of Might and Magic III adventure map obstacle art, modernized and
smoothed. Wide silhouette suitable as the anchor piece of a large multi-tile
rock cluster.
```

## Po wygenerowaniu

1. Zapisz pliki jako `assets/kit/skaly-nowe/<nazwa>.png` (albo gdziekolwiek
   trafi paczka — `assets/kit/README.md` opisuje konwencję).
2. Przepuść przez `tools/wygladzanie.py`, tak jak reszta grafik z pakietów —
   inaczej krawędzie AI-generacji nie będą pasować do reszty mapy.
3. Dorzuć nowe klucze do listy sprite'ów w `AdventureScene.preload()` (obok
   `skala`, `skala-2`, `kopiec`, `kopiec-2`) i do tablicy `GLAZY` w
   `src/data/bloki-przeszkod.ts` — od tego miejsca automatycznie wezmą udział
   w istniejących blokach 1×1/2×1/1×2/2×2/3×2, bez zmian w silniku
   rozkładania (`rozlozBloki`).
