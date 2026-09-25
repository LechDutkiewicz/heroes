# Prompty do grafik: plansze kampanii (Polana, Bagna, Twierdza)

Lista zakupów po trzech rundach ślepego porównania map kampanii z mapą
przygody Heroes 2. Werdykt za każdym razem ten sam: przegrywa ZIEMIA i jej
ubranie, nie sprite'y budowli — „na śniegu rosną liściaste drzewa i jabłonie",
„bagno bez trzciny, martwych drzew i grążeli", „kopalnia stoi na środku łąki,
a nie w skalnej ścianie". Część tego udaje dziś Python
(`tools/teren_efekty.py`: trzcina z kresek, grążele z elips, rysy na lodzie,
zaspy z szumu). Te grafiki mają to zastąpić prawdziwym rysunkiem.

Bloki stylu `obiekt` i `teren` są w `tools/PROMPTY-MAPA-2.md` — generator
bierze je stamtąd (style są wspólne dla wszystkich dokumentów). Wszystkie
obiekty tutaj mają styl `obiekt`, czyli prawdziwą przezroczystość z silnika
OpenAI, bez podstawki, bez trawy pod spodem i bez cienia rzuconego.

Droga do gry (szczegóły: STAN.md, „Grafiki plansz kampanii"):

    python3 tools/generuj_grafiki.py                 # wszystko, czego brak w tools/wsad/
    python3 tools/wsad_wczytaj.py                    # przycięcie, skala, public/mapa/…
    python3 tools/render_mapa.py polana bagna twierdza
    npx tsx tools/probe-mapy.ts                      # odciski teł

## 1. Naklejki terenu — malowane w TLE planszy

Nie są obiektami gry: nic nie blokują, nie da się w nie kliknąć. Render
rozsiewa je po polach danego terenu (`NAKLEJKI` w `tools/mapy/<id>.py`)
i wtapia w tło, zanim scena postawi na nim cokolwiek. Małe i płaskie —
widziane z góry pod kątem, jak reszta mapy — bo leżą NA ziemi, a nie stoją
nad nią jak drzewo.

| Plik (tools/wsad/) | Trafia do | Wysokość | Plansza, teren |
|---|---|---|---|
| `trzcina-1..3.png` | `public/mapa/tlo/` | 36–44 px | Bagna, bagno |
| `grazel-1..2.png` | `public/mapa/tlo/` | 22–24 px | Bagna, woda |
| `martwe-drzewo-1..2.png` | `public/mapa/tlo/` | 64–70 px | Bagna, bagno |
| `pniak-bagienny.png` | `public/mapa/tlo/` | 30 px | Bagna, bagno |
| `glaz-sniezny-1..3.png` | `public/mapa/tlo/` | 30–40 px | Twierdza, śnieg |
| `zaspa-1..2.png` | `public/mapa/tlo/` | 26–30 px | Twierdza, śnieg |
| `kra-lodu-1..2.png` | `public/mapa/tlo/` | 26–30 px | Twierdza, lód |
| `krzak-zimowy-1.png` | `public/mapa/tlo/` | 30 px | Twierdza, tundra |
| `kwiaty-1..2.png` | `public/mapa/tlo/` | 20–22 px | Polana, łąka |

<!-- plik: trzcina-1.png -->
```
A small clump of marsh reeds and cattails growing out of shallow water: a
dozen thin green-olive stalks of different heights, three brown velvety
cattail heads, a few bent dry blades, a tiny ring of dark water at the base.
Compact, wider than tall, reads as "swamp" at 40 pixels.
```

<!-- plik: trzcina-2.png -->
```
A dense tuft of tall swamp grass and reeds, olive green with straw-yellow
tips, leaning slightly to the right as if in wind, two cattail heads, a few
broken stalks lying across. Compact clump, no ground patch.
```

<!-- plik: trzcina-3.png -->
```
A low sparse cluster of young reeds and sedge, five or six thin green stalks
and one cattail, very small, meant to be scattered many times across a marsh.
```

<!-- plik: grazel-1.png -->
```
Two round flat water-lily pads floating seen from above at a slight angle,
deep green with a notch cut into each, one closed pale pink lily bud in the
middle. No water drawn around them, just the pads and the flower.
```

<!-- plik: grazel-2.png -->
```
A small group of three lily pads of different sizes, one with an open white
water-lily flower with a yellow centre, glossy wet highlight on the leaves.
No water drawn around them.
```

<!-- plik: martwe-drzewo-1.png -->
```
A dead swamp tree: a crooked grey-brown trunk without leaves, two twisted
bare branches reaching up like fingers, a strip of hanging grey moss, the
roots disappearing into the ground at the bottom edge. Eerie but friendly,
suitable for a children's game.
```

<!-- plik: martwe-drzewo-2.png -->
```
A broken hollow dead tree stump in a marsh, snapped at half height, pale grey
weathered wood, a few shelf mushrooms growing on its side, one thin bare
branch, ivy-green moss patches.
```

<!-- plik: pniak-bagienny.png -->
```
A low rotten tree stump half sunk in mud, dark wet wood, bright green moss on
top, two tiny mushrooms. Small and squat.
```

<!-- plik: glaz-sniezny-1.png -->
```
A single rounded grey granite boulder with a thick cap of fresh white snow on
top, blue-tinted shadow under the snow edge, a few icicles hanging from one
side. Cold, clean, readable at 34 pixels.
```

<!-- plik: glaz-sniezny-2.png -->
```
A cluster of three snow-covered rocks of different sizes, grey stone showing
on the shaded sides, soft pillows of snow on the tops, a thin frosted
highlight along the edges.
```

<!-- plik: glaz-sniezny-3.png -->
```
A flat low slab of dark rock poking out of deep snow, snow drifted against
its left side, a little frost sparkle. Small.
```

<!-- plik: zaspa-1.png -->
```
A single sculpted snowdrift seen from above at a slight angle: a smooth white
wave of snow with a sharp wind-carved crest, a cool blue shadow on the far
side, a few sparkling highlights on the crest. No ground drawn around it.
```

<!-- plik: zaspa-2.png -->
```
Two small overlapping snow mounds with a curled wind ridge, bright white on
the lit side, pale blue in the shade, subtle glitter. No ground drawn around it.
```

<!-- plik: kra-lodu-1.png -->
```
A small flat slab of cracked lake ice seen from above: translucent pale blue
with white frosted edges and a few thin white crack lines, a little snow
dusting on top. Flat, almost no height.
```

<!-- plik: kra-lodu-2.png -->
```
A pair of broken ice floes pushed against each other, one tilted up showing
its thick turquoise edge, white rime on the rims, a sprinkle of snow.
```

<!-- plik: krzak-zimowy-1.png -->
```
A small leafless winter shrub: thin dark brown twigs in a round tangle, a few
red frozen berries, a dusting of snow on the upper twigs. No leaves at all.
```

<!-- plik: kwiaty-1.png -->
```
A tiny patch of meadow wildflowers seen from above at a slight angle: yellow
buttercups, white daisies and two blue cornflowers among a few grass blades.
Very small and low.
```

<!-- plik: kwiaty-2.png -->
```
A small cluster of red poppies and purple clover flowers with a few green
leaves, low to the ground, cheerful.
```

## 2. Tereny

Kafle w stylu `teren` (bez przezroczystości, bezszwowe). Podmieniane
w `render_mapa.py` przez `TEKSTURY` planszy — dziś Twierdza maluje lód
teksturą śniegu przebarwioną na błękit, a Bagna mają błoto tylko z efektu.

| Plik | Trafia do | Plansza |
|---|---|---|
| `teren-lod.png` (+ `teren-lod2.png`) | `public/mapa/teren/teren-lod.png` | Twierdza: `TEKSTURY = {'woda': 'lod'}` |
| `teren-bloto.png` (+ `teren-bloto2.png`) | `public/mapa/teren/teren-bloto.png` | Bagna: `TEKSTURY = {'bagno': 'bloto'}` |

<!-- plik: teren-lod.png | styl: teren -->
```
The ground is the frozen surface of a lake: smooth pale blue-white ice with
faint darker blue depths showing through, long thin white crack lines
branching across it, soft patches of wind-blown snow powder, a few trapped
air bubbles. Cold and clean, clearly ice and not water.
```

<!-- plik: teren-lod2.png | styl: teren -->
```
The ground is the frozen surface of a lake: slightly greener-blue ice with
frosted white rime patterns, fewer cracks, more snow powder streaks in
diagonal wind lines, a few pressure ridges.
```

<!-- plik: teren-bloto.png | styl: teren -->
```
The ground is a wet swamp: dark green-brown mud with glossy puddles of black
standing water reflecting the sky, tufts of coarse sedge between them,
floating duckweed on the puddles, half-sunken twigs. The puddles must read
clearly as water, the mud clearly as mud.
```

<!-- plik: teren-bloto2.png | styl: teren -->
```
The ground is a wet swamp: the same dark mud and black puddles as a marsh,
painted from scratch with different puddle shapes, more duckweed, a few
lily leaves, fewer grass tufts.
```

## 3. Zestawy klimatu dla SCENY

Te same sprite'y, które scena stawia na każdej planszy (drzewa, krzaki,
skały, kępy lasu i skał, kopalnie), w wersji klimatu. W `tools/wsad/` pod
nazwą `<zestaw>-<nazwa>.png`, `wsad_wczytaj.py` kładzie je jako
`public/mapa/<zestaw>/<nazwa>.png`. Plansza wskazuje zestaw w USTAWIENIACH
(`zestaw: 'zima'` w Twierdzy, `'bagno'` na Bagnach); scena musi go jeszcze
zacząć czytać — kontrakt w STAN.md. Każdy musi mieć tę samą sylwetkę
i proporcje co sprite, który zastępuje (wymiary: STAN.md).

<!-- plik: zima-sosna.png -->
```
A tall conifer pine tree heavily laden with snow: dark blue-green needles
visible only in the shadows under thick white snow shelves on every branch,
a straight brown trunk at the bottom, a light frost sparkle. Tall and narrow.
```

<!-- plik: zima-sosna-b.png -->
```
A slightly crooked snowy spruce: layered branches drooping under wet snow,
blue shadows under each snow layer, a little snow sliding off one branch.
Tall and narrow, a sibling of a snowy pine.
```

<!-- plik: zima-sosna-mala.png -->
```
A young small fir tree almost buried in snow, only the tip and a few branch
ends showing dark green, round snow cap on top. Small.
```

<!-- plik: zima-drzewo.png -->
```
A broad old fir tree heavily laden with snow, wider and fuller than a pine:
thick drooping tiers of dark blue-green branches, each tier carrying a heavy
white shelf of snow, a pointed snowy top, cool blue shadows under the snow
layers, a short brown trunk at the bottom with a small snow mound. No leafy
or bare deciduous branches. Wide conical crown.
```

<!-- plik: zima-drzewo-b.png -->
```
A pair of snow-laden spruces growing close together, one tall and one
shorter in front of it, dark blue-green needles showing only under thick
white snow caps on every branch tier, pointed snowy tops, a shared small
snow mound at their base. No leafy or bare deciduous trees. Wide crown.
```

<!-- plik: zima-krzak.png -->
```
A round leafless winter bush buried halfway in snow, a tangle of dark twigs
poking out, frost on the tips, a few red berries. Low and round.
```

<!-- plik: zima-krzak-2.png -->
```
A low shrub completely buried under a rounded pillow of snow: only a few dark
brown bare twig tips poke out of the snow, blue shadow under the snow on the
left, frost glitter on the top. No green leaves, no needles, no grass.
Low and round, wider than tall.
```

<!-- plik: zima-skala.png -->
```
A single craggy grey mountain rock with snow on every ledge and on the top,
icicles on the shaded side, lit side bright, shadow side cool blue-grey.
```

<!-- plik: zima-skala-2.png -->
```
A pair of angular grey rocks leaning together, thick snow cap across both
tops, frosted edges, a small drift at the base.
```

<!-- Twierdza, runda 9 (HotA): „gigantyczne choinki w prawym dolnym rogu są
kilka razy wyższe od zamku — drzewa do skali kafla". Dawne kępy to dwa–pięć
wielkich drzew na śnieżnej wysepce; kępa ma 4,5 pola wysokości, więc jedno
drzewo wychodziło wyższe od twierdzy. Teraz zwarty masyw MAŁYCH świerków
w kilku rzędach, bez podstawki — jak bór w HotA. -->
<!-- plik: zima-kepa-las-1.png | styl: obiekt -->
```
A dense block of snowy winter forest for a fantasy adventure map, in the style
of Heroes of Might and Magic 3 seen from a high three-quarter angle: about
twenty SMALL dark blue-green spruces and firs packed tightly together in five
staggered rows, each tree only a small part of the picture, crowns overlapping
so that no ground shows between them, every tree with white snow caps on its
branches, deep blue shadows between the trees, sunlit snow on the right side.
The back rows peek above the front rows. Reads as one solid impassable mass of
forest, not a few big trees. No snow platform or island under it: the front
row of small trees and a few snowy bushes spreads across the whole width of
the picture. About as wide as tall.
```

<!-- plik: zima-kepa-las-2.png | styl: obiekt -->
```
A thick stand of snowy northern forest for a fantasy adventure map, in the
style of Heroes of Might and Magic 3 seen from a high three-quarter angle:
some eighteen small snow-laden spruces of slightly different heights crowded
in several staggered rows, two small bare birch trees with white trunks
between them, crowns overlapping into one dense dark blue-green mass with
white snow on every tier, cold blue shadows inside, warm sunlit snow on the
right edges. Each tree small; clearly one impassable block of forest. No snow
platform under it; low snowy bushes and young firs along the bottom edge
across the whole width. About as wide as tall.
```

<!-- plik: zima-kepa-las-3.png | styl: obiekt -->
```
A compact mass of young snowy fir trees for a fantasy adventure map, in the
style of Heroes of Might and Magic 3 seen from a high three-quarter angle:
twenty to twenty-five small pointed firs packed tightly in five rows, the
middle trees a little taller, the front row small and half buried in snow,
heavy white snow on the branches, dark blue-green needles showing in the
shadows, one small grey rock with snow at the front left. One solid block of
winter forest, no ground visible between the trees and no snow island under
it; the front row spreads across the whole width. About as wide as tall.
```

<!-- plik: zima-kepa-las-4.png | styl: obiekt -->
```
The ragged edge of a snowy spruce forest for a fantasy adventure map, in the
style of Heroes of Might and Magic 3 seen from a high three-quarter angle:
a tight mass of about eighteen small snow-covered spruces with deep dark
blue-green needles (cold teal and slate green, never yellow or olive), dense
and taller at the back and on the left, stepping down to smaller young firs
at the front right, crowns overlapping, thick white snow on every tier, deep
cold blue shadows inside, sunlit snow on the right. Each tree small. One solid
block of forest; along the foot only a thin soft layer of trodden snow and
two low snowy juniper bushes, no snowballs, no platform. A little wider than
tall.
```

<!-- plik: zima-kepa-skaly-1.png -->
```
A snowy mountain massif piece: several sharp grey peaks and crags packed
together, snow on all upper faces and ridges, bright lit faces on the left,
cool blue shadow faces on the right, a few dark rock bands. Reads as an
impassable mountain range segment. Wider than tall.
```

<!-- plik: zima-kepa-skaly-2.png -->
```
A rugged snowy ridge with two peaks and a saddle between them, cornices of
snow on the crest, icicles and frozen waterfalls on the shaded side, wider
than tall.
```

<!-- plik: zima-kepa-skaly-3.png -->
```
A snowy mountain massif piece like the mountains on a classic fantasy
strategy adventure map: a tight group of four or five jagged rocky peaks of
warm tan-brown and grey stone with sharp crags and deep vertical cracks,
thick white snow on every summit, crest and upper ledge, snow streaming down
the gullies between the rock ribs, sunlit faces on the right, cool blue-grey
shadowed faces on the left, a skirt of small snow-capped scree at the foot.
Reads as an impassable mountain range segment. No trees, no grass, no moss,
no flat table tops, no cake-like snow pillows. Wider than tall, fills the
frame.
```

<!-- plik: zima-kepa-skaly-4.png -->
```
A long jagged mountain ridge segment: a row of three sharp rocky spires of
brown-grey stone of different heights rising from a craggy shoulder, every
ledge, crest and summit covered in white snow, snow-filled couloirs between
the spires, a few icicles in the crevices, sunlit faces on the right, cool
blue-grey shadowed faces on the left, snow-capped boulders at the foot.
Reads as an impassable mountain range segment. No trees, no grass, no moss,
no flat plateau, no cake-like snow pillows. Wider than tall, fills the frame.
```

<!-- plik: zima-kopalnia-kamien.png -->
```
A crystal mine carved into a snowy rock face: a timber-framed tunnel entrance
cut straight into a grey cliff covered with snow, glowing violet evolution
crystals growing around the entrance, a small ore cart on a short rail, a
lantern, icicles hanging from the timber lintel. The cliff is part of the
building and fills the back of the frame.
```

<!-- plik: zima-kopalnia-odlamek.png -->
```
A shard mine carved into a snowy rock face: a stone-lined tunnel entrance in
a grey cliff under heavy snow, piles of pale blue crystal shards in wooden
crates by the entrance, a pickaxe leaning on the wall, a snowy timber roof
over a small forge.
```

<!-- plik: zima-kopalnia-pokeball.png -->
```
A hunters' winter camp against a snowy cliff: a log cabin with a thick snow
roof and a red-and-white round sign above the door, a stack of red-and-white
round capsules in a wooden crate, a smoking chimney, a sled beside it.
```

<!-- plik: zima-sad.png -->
```
A winter berry storehouse: a small wooden granary with a snow-covered roof,
baskets of dark red frozen berries by the door, a leafless berry bush on each
side dusted with snow. No green leaves anywhere.
```

<!-- plik: bagno-drzewo.png -->
```
A swamp tree: a gnarled dark trunk standing on arching stilt roots, a drooping
crown of sparse olive-green leaves with long strands of grey hanging moss.
Wide crown, humid and gloomy but friendly.
```

<!-- plik: bagno-drzewo-b.png -->
```
A weeping swamp willow with long trailing olive branches almost reaching the
ground, a thick twisted trunk, moss on the bark. Wide crown.
```

<!-- Runda 6: kępy trzciny i turzycy zamiast okrągłych krzaczków (§12). -->
<!-- plik: bagno-krzak.png -->
```
A clump of marsh vegetation: a tall tuft of cattails with brown velvety heads
and long sword-shaped green-olive leaves bending in different directions,
a few shorter sedge blades at the base, a little dark wet mud at the foot.
Irregular, spiky silhouette — NOT a round bush. Slightly taller than wide.
```

<!-- plik: bagno-krzak-2.png -->
```
A low swamp tussock: a shaggy mound of coarse yellow-olive sedge grass with
blades spilling outward like a fountain, one broken grey dead branch sticking
out of it, two small orange-brown mushrooms at the foot. Irregular, spiky
silhouette — NOT a round bush. Wider than tall.
```


<!-- plik: bagno-kepa-las-1.png -->
```
A dense swamp grove of five or six moss-draped trees on stilt roots, hanging
grey moss, one dead bare tree among them, reads as a single impassable block
of swamp forest. Wider than tall.
```

<!-- plik: bagno-kepa-las-2.png -->
```
A swamp thicket mixing weeping willows, reeds and a broken dead trunk,
compact, wider than tall.
```

<!-- plik: bagno-kepa-las-3.png -->
```
A cluster of mangrove-like trees with arching roots and dark olive crowns,
wider than tall.
```

<!-- plik: bagno-kepa-las-4.png -->
```
A low wide belt of dense swamp bushes and small twisted trees draped with
moss, wider than tall.
```

<!-- plik: bagno-kopalnia-kamien.png -->
```
A crystal mine on a swamp hummock: a timber tunnel entrance dug into a mossy
mound of dark rock, glowing violet crystals, a narrow plank walkway leading to
the entrance over mud, reeds around. The mound is part of the building.
```

<!-- plik: bagno-kopalnia-odlamek.png -->
```
A shard mine on stilts over a swamp: a wooden shed on thick wooden stilts
with a pulley lowering a bucket into dark water, crates of pale blue crystal
shards on the platform, reeds around the stilts.
```

<!-- plik: bagno-kopalnia-pokeball.png -->
```
A hunters' swamp camp: a hut on stilts with a reed-thatched roof, a round
red-and-white sign over the door, a small flat-bottomed boat tied to one
stilt, crates of red-and-white round capsules on the porch.
```

## 4. Polana — zestaw klimatu `polana` (runda 3 ślepego porównania)

Werdykt: „jednolity dywan trawy i lasu, bez pasma gór w kadrze". Skały
Polany to podstawowe `kepa-skaly` — omszałe głazy rozsypane po łące, które
z daleka czytają się jak garść drobiazgów, a nie jak góry. W Heroes 2 góra na
łące to zielony, trawiasty masyw z brązowymi urwiskami i żlebami — ma rzeźbę
i zamyka przejście także dla oka. Te kępy kładą się obok siebie w pasmo
(scena stawia je co trzy pola, zachodzą na siebie o pole), więc podstawa
każdej musi sięgać obu boków kadru.

| Plik (tools/wsad/) | Trafia do | Wysokość |
|---|---|---|
| `polana-kepa-skaly-1..4.png` | `public/mapa/polana/kepa-skaly-N.png` | 216 px |
| `polana-skala.png`, `polana-skala-2.png` | `public/mapa/polana/skala*.png` | 67 px |
| `polana-kopiec.png`, `polana-kopiec-2.png` | `public/mapa/polana/kopiec*.png` | 37 px |

Pliki we wsadzie są już OBROBIONE po wygenerowaniu (nie surowe z API):
jasny, kremowy rąbek u podstawy zdjęty z alfy (po nim góra wyglądała na
naklejkę) i oliwkowo-żółta trawa przesunięta w stronę soczystej zieleni łąki
gry. `polana-kopiec.png` to kopia `polana-skala.png`, `polana-kopiec-2.png`
— odbita `polana-kepa-skaly-4.png` (scena i tak zmniejsza je do 37 px).
Po ponownym wygenerowaniu trzeba to powtórzyć, inaczej rąbek wróci.
Pierwsza wersja `polana-kepa-skaly-3` (trzy piaskowcowe iglice) czytała
się na mapie jak rozsypane pomarańczowe stożki — prompt poniżej to druga.

<!-- plik: polana-kepa-skaly-1.png | styl: obiekt | proporcje: 3:2 -->
```
A segment of a grassy mountain range in the style of Heroes of Might and
Magic 2: two rounded green peaks covered in short meadow grass, steep
ochre-brown rocky cliffs and deep ravines cut into the slopes, sharp ridge
lines running down from each peak, a few tiny dark green pines in the folds.
Sunlit green faces on the right, darker olive and brown shadowed folds on the
left. Clearly an impassable mountain, not a pile of boulders. Wider than tall;
the foot of the mountain spreads across the whole width of the picture so that
pieces placed side by side join into one continuous range.
```

<!-- plik: polana-kepa-skaly-2.png | styl: obiekt | proporcje: 3:2 -->
```
A long grassy mountain ridge in the style of Heroes of Might and Magic 2: one
high green crest with a saddle and a smaller second hump, brown rock showing
through on the steep faces as vertical gullies and ledges, grass on the
rounded tops. Strong sculpted relief: bright sunlit slopes on the right,
deep olive-brown shadow folds on the left. Wider than tall; the foot spreads
across the whole width of the picture.
```

<!-- plik: polana-kepa-skaly-3.png | styl: obiekt | proporcje: 3:2 -->
```
A broad massive green mountain in the style of Heroes of Might and Magic 2:
one big rounded grassy summit with a long shoulder falling to each side,
the whole front face cut by many parallel brown rocky gullies and ridges
running down the slope like folds of cloth, a small rocky ledge near the top.
Sunlit green slopes on the right, deep olive and brown shadowed gullies on
the left. One solid landform, no separate spires or loose rocks. Wider than
tall; the foot spreads across the whole width of the picture.
```

<!-- plik: polana-kepa-skaly-4.png | styl: obiekt | proporcje: 3:2 -->
```
A low broad green hill range in the style of Heroes of Might and Magic 2:
three soft grassy knolls packed together with brown earth scarps and rocky
outcrops breaking the slopes, a couple of small bushes in the hollows. Reads
as foothills of a mountain chain, clearly impassable. Wider than tall; the
foot spreads across the whole width of the picture.
```

<!-- plik: polana-skala.png -->
```
A single small grassy mountain peak in the style of Heroes of Might and Magic
2: a green rounded top, steep brown rocky faces with one gully, sunlit on the
right, shaded on the left. Slightly wider than tall.
```

<!-- plik: polana-skala-2.png -->
```
A small rugged rocky crag in the style of Heroes of Might and Magic 2: two
tan-brown sandstone spires with tufts of grass on the ledges, scree at the
foot, sunlit on the right. Slightly wider than tall.
```

## 5. Twierdza — zimowe budowle pierwszego ekranu (runda 3 ślepego porównania)

Werdykt rundy 2: „śnieg to białe plamy na zielonej trawie, obok zasp rosną
liściaste drzewa". Po zdjęciu zielonej trawy z tła zostało zielone to, co
stoi na nim: zamek gracza w liściastych drzewach, chatka z omszałym dachem,
ognisko w trawie i omszałe kopczyki na skałach (`m-kopiec`). Zestaw `zima`
podmienia je pod tymi samymi kluczami (`ZESTAWY` w `wsad_wczytaj.py`).

| Plik (tools/wsad/) | Trafia do | Wysokość |
|---|---|---|
| `zima-zamek-las.png` (też jako `zima-zamek-ogien.png`) | `public/mapa/zima/zamek-*.png` | 384 / 336 px |
| `zima-chatka.png` | `public/mapa/zima/chatka.png` | 115 px |
| `zima-ognisko.png` | `public/mapa/zima/ognisko.png` | 86 px |
| `zima-kopiec.png`, `zima-kopiec-2.png` | `public/mapa/zima/kopiec*.png` | 37 px |
| `zima-wiatrak.png` | `public/mapa/zima/wiatrak.png` | 211 px |

<!-- plik: zima-zamek-las.png -->
```
A richly detailed fortified town in deep winter, the player's capital on the
adventure map, seen from the front and above: thick light grey granite
curtain walls with crenellations and four sturdy round towers, a tall central
gate keep with a big arched wooden portcullis at the bottom centre facing the
viewer, a steep pointed blue slate roof on the keep and a blue banner with a
white emblem on a tall flagpole. Inside the walls a crowded cluster of five or
six timber-framed houses and a hall with steep blue slate roofs, chimneys and
dormer windows, blue heraldic banners hanging on the walls. Every roof,
battlement and ledge carries a thick pillow of white snow, icicles hang from
the eaves, warm yellow light glows in many windows, thin smoke rises from two
chimneys. A few snow-laden dark fir trees hug the walls — no leafy trees, no
grass, no moss, no green lawns anywhere. The town fills the frame, chunky
and impressive, roughly as wide as tall.
```

<!-- plik: zima-chatka.png -->
```
A tiny winter lean-to shelter of leaning wooden planks against a grey boulder,
its shingle roof buried under a thick cap of snow with icicles on the front
edge, a small dark opening at the front, a bundle of firewood and a wooden
bowl in the doorway, a small snow drift against one side. No moss, no ivy,
no green leaves.
```

<!-- plik: zima-ognisko.png -->
```
A winter campfire: a ring of grey stones dusted with snow around a bright
crackling fire, two thick logs lying beside it as benches with snow on top,
the snow around the fire melted into a small ring of dark wet earth, a few
red-and-white round capsules and a small blue crystal lying by the stones.
No grass, no green plants. Wider than tall.
```

<!-- plik: zima-kopiec.png -->
```
A small pile of three rounded grey boulders half buried in snow, thick white
snow caps on their tops, cool blue shadows on the left side, a few pebbles
poking out of the snow at the foot. No moss, no grass. Slightly wider than tall.
```

<!-- plik: zima-kopiec-2.png -->
```
A small cluster of two angular grey rocks and a flat stone, all capped with
snow and frosted on the edges, a tiny snow drift at the base, blue shadow on
the left. No moss, no grass. Slightly wider than tall.
```

<!-- plik: zima-wiatrak.png -->
```
A small stone windmill in deep winter: a round grey fieldstone base and a
white plaster upper storey, a conical wooden roof under a thick cap of snow
with icicles on the rim, four wooden lattice sails with pale canvas, frost on
the sail frames, a low wooden door with a small snow drift in front, a sack of
grain and a wooden bucket half buried in snow. No ivy, no moss, no grass, no
green plants. Taller than wide.
```

## 6. Polana — most przez rzekę w pierwszym ekranie (runda 4 ślepego porównania)

Werdykt rundy 3: „prawa część kadru (rzeka i klify) to martwe tło: nie ma
mostu ani brodu, nie widać, czy za wodą da się iść". Bród z piasku czytał się
jak łacha, na której rzeka się urywa. Most jest NAKLEJKĄ TŁA
(`MOSTY` w `tools/mapy/polana.py`, maluje go `render_mapa.py` na nieprzerwanej
wodzie), a pola pod nim są w grze drogą. Obrobiony plik leży w
`public/mapa/polana/most.png` (przycięty do sylwetki; render skaluje go na
szerokość przeprawy).

<!-- plik: polana-most.png | styl: obiekt | proporcje: 3:2 -->
```
A short sturdy wooden bridge in the style of Heroes of Might and Magic 2,
crossing a river from LEFT to RIGHT, seen from above at a steep three-quarter
angle so the plank deck is clearly visible as a long horizontal band: weathered
warm brown planks laid crosswise, a simple log railing with posts along the
far edge and a lower one along the near edge, a squat grey fieldstone pier
under each end and one in the middle. The bridge is MUCH wider than tall and
spans the whole width of the picture, both ends open and flat so a dirt road
can join them. No water, no river banks, no grass, no ground under it.
```

<!-- plik: polana-most-2.png | styl: obiekt | proporcje: 3:2 -->
```
A small humped stone arch bridge in the style of Heroes of Might and Magic 2,
crossing a river from LEFT to RIGHT, seen from above at a steep three-quarter
angle: a pale grey-tan cobbled roadway running across the top as a long
horizontal band, low stone parapets on both sides, two rounded arches visible
on the near face, mossy stones at the waterline. Much wider than tall, spanning
the whole width of the picture, flat open ends so a dirt road can join them.
No water, no river banks, no grass, no ground.
```

Pierwsze dwie wersje wyszły izometrycznie, po skosie — na mapie widzianej
z góry na wprost most stałby w poprzek rzeki krzywo. Trzecia prosi o widok
z przodu, most równoległy do dolnej krawędzi kadru.

<!-- plik: polana-most-3.png | styl: obiekt | proporcje: 3:2 -->
```
A short wooden plank bridge in the style of Heroes of Might and Magic 2, seen
straight from the front and from above at about forty-five degrees, NOT
isometric and NOT diagonal: the bridge runs perfectly horizontally from the
left edge to the right edge of the picture, parallel to the bottom edge. We see
the top of the plank deck as a wide horizontal band of warm brown planks laid
crosswise, a simple log railing with posts along the back edge and along the
front edge, and below the deck the front face with two squat grey fieldstone
piers. Both ends are flat and open so a dirt road can run onto them. Much
wider than tall. No water, no river banks, no grass, no ground.
```

## 7. Bagna — omszałe wzgórza w pierwszym ekranie (runda 5 ślepego porównania)

> Runda 6 (wzorce HotA): kępy skał przepisane z omszałych kopców na skaliste
> granie z rzeźbą i wodospadem — zielone kopce w kadrze czytały się jak
> „płaska łąka poza klifem w rogu".

Werdykt rundy 5: „zupełnie płaski teren bez wzniesień, skarp i cieni". Poza
rzeźbą w tle (`teren_efekty.rzezba`) Bagna dostają pasmo wzgórz na lewym
skraju pierwszego ekranu. Podstawowe `kepa-skaly` to szare głazy — na bagnie
wzgórze jest omszałe, z urwiskami torfu i ciemnej ziemi. Zestaw `bagno`.

| Plik (tools/wsad/) | Trafia do | Wysokość |
|---|---|---|
| `bagno-kepa-skaly-1..4.png` | `public/mapa/bagno/kepa-skaly-N.png` | 216 px |
| `bagno-skala.png`, `bagno-skala-2.png` | `public/mapa/bagno/skala*.png` | 67 px |
| `bagno-kopiec.png`, `bagno-kopiec-2.png` | `public/mapa/bagno/kopiec*.png` | 37 px (kopie `bagno-skala*.png`) |

<!-- plik: bagno-kepa-skaly-1.png | styl: obiekt | proporcje: 3:2 -->
```
A segment of a rocky mountain range rising out of a swamp, in the style of
Heroes of Might and Magic 3: a cluster of three jagged grey-brown rock peaks
of different heights with sharp crests, deep dark crevices and vertical
cracks, ledges patched with dark green moss and hanging vines, a couple of
small twisted swamp trees and cattails at the foot. Strong sculpted relief lit
from the upper left: pale warm-grey sunlit faces on the left, deep brown-grey
shadowed faces on the right. Clearly an impassable mountain. Wider than tall;
the foot spreads across the whole width of the picture so that pieces placed
side by side join into one continuous range.
```

<!-- plik: bagno-kepa-skaly-2.png | styl: obiekt | proporcje: 3:2 -->
```
A long jagged rocky ridge above a swamp in the style of Heroes of Might and
Magic 3: a row of sharp grey-brown rock spires and teeth along a crest, one
taller peak, steep cracked cliff faces with dark crevices, green moss and
small ferns in the cracks, one dead bare tree clinging to a ledge. Strong
relief lit from the upper left, shadows on the right. Clearly an impassable
mountain ridge. Wider than tall; the foot spreads across the whole width of
the picture.
```

<!-- plik: bagno-kepa-skaly-3.png | styl: obiekt | proporcje: 3:2 -->
```
A massive rocky crag with a waterfall in the style of Heroes of Might and
Magic 3: a big grey-brown rock mountain with two sharp summits, a thin white
waterfall pouring down a cleft in the front face into a small dark pool at the
foot, mossy ledges, dark green swamp shrubs and cattails around the pool.
Strong sculpted relief lit from the upper left, deep shadows on the right.
One solid landform, clearly impassable. Wider than tall; the foot spreads
across the whole width of the picture.
```

<!-- plik: bagno-kepa-skaly-4.png | styl: obiekt | proporcje: 3:2 -->
```
Low craggy foothills of a mountain range in a swamp, in the style of Heroes
of Might and Magic 3: four or five low sharp grey-brown rock outcrops and
boulders packed tightly together, cracked faces, moss on their tops, tufts
of marsh grass, ferns and a small twisted tree between them. Lit from the
upper left. Clearly impassable rough rocky ground, lower than a mountain.
Wider than tall; the foot spreads across the whole width of the picture.
```

<!-- plik: bagno-skala.png | styl: obiekt -->
```
A single small mossy hilltop in the style of Heroes of Might and Magic 2: a
rounded top of deep green moss, steep dark brown peat faces with one gully,
a few cattails at the foot, lit from the upper left, shaded on the right.
Slightly wider than tall.
```

<!-- plik: bagno-skala-2.png | styl: obiekt -->
```
A small craggy outcrop in a swamp in the style of Heroes of Might and Magic 2:
two grey rocks thickly overgrown with green moss and hanging lichen, a tuft
of marsh grass on the ledge, dark wet mud at the foot, lit from the upper
left. Slightly wider than tall.
```

## 8. Bagna — znajdźki i drobiazgi trzęsawiska (runda 5, wzorzec HoMM3 HotA)

Poprzeczką jest teraz mapa przygody HotA: gęsto od drobnych rzeczy, a każda
leży NA ziemi. Werdykt rundy 3 („płaska ikona pokeballa wygląda na wklejoną
z innej gry") i porównanie z HotA dają dwie grupy grafik:

- **stosy surowców** na mapie (`bagno-stos-<ikona>.png` →
  `public/mapa/bagno/stos-<ikona>.png`, scena bierze je przy
  `USTAWIENIA.znajdzki`) zamiast ikon z paska surowców;
- **drobiazgi tła** (`public/mapa/tlo/`, `NAKLEJKI` w `tools/mapy/bagna.py`):
  grzyby, omszała kłoda, kamienie w mchu, paproć, bagienne irysy — gęstość
  i odmiana, które HotA ma na każdym polu.

| Plik (tools/wsad/) | Trafia do | Wysokość |
|---|---|---|
| `bagno-stos-pokeball.png` … `bagno-stos-kamien-ewolucji.png` | `public/mapa/bagno/stos-*.png` | 72 px |
| `grzyby-bagienne.png`, `kloda-mech.png`, `kamienie-mech.png`, `paproc.png`, `irysy.png` | `public/mapa/tlo/` | 24–34 px |

<!-- plik: bagno-stos-pokeball.png -->
```
Three big red-and-white capture balls stacked in a small pyramid, two at the
bottom and one on top, no basket and no container. Each ball: glossy bright
red top half, clean white bottom half, thick black band around the middle
with a big round white button. The white halves and black bands must stay
clearly visible even at 30 pixels, so the pile never reads as berries or
apples. Soft painted shading and highlights like the rest of the map.
Isolated cut-out: the balls rest on NOTHING — no ground, no sand, no dust, no
glow and no shadow under them; everything around and below the balls is
fully transparent.
```

<!-- plik: bagno-stos-jagody.png -->
```
A small heap of freshly picked red berries (like big glossy cranberries and
raspberries) spilling out of a round wicker basket lying on its side, a few
green leaves and one sprig with berries on top. Painted soft shading and wet
highlights. Wider than tall, compact, reads as "berries to pick up" at 40
pixels.
```

<!-- plik: bagno-stos-odlamki.png -->
```
A small cluster of glowing pale-blue ice-like crystal shards of different
sizes growing out of a low mossy grey stone, soft cyan inner glow, crisp
facets with bright highlights. Wider than tall, compact, reads as "crystal
shards to pick up" at 40 pixels.
```

<!-- plik: bagno-stos-kamien-ewolucji.png -->
```
A small pile of three or four smooth rounded magic stones glowing violet and
lilac, with a faint swirl pattern inside, lying on a flat mossy rock with a
tuft of marsh grass. Painted soft shading and highlights. Wider than tall,
compact, reads as "magic stones to pick up" at 40 pixels.
```

<!-- plik: grzyby-bagienne.png -->
```
A tiny cluster of forest mushrooms seen from above at a slight angle: three
brown-capped mushrooms and two small ochre ones with pale stems, a bit of
moss between them. Very small and flat, meant to be scattered across the
ground of a swamp map.
```

<!-- plik: kloda-mech.png -->
```
A short fallen log lying on the ground, seen from above at a slight angle:
old dark brown bark, thick bright green moss on top, a couple of small shelf
mushrooms on the side, one broken branch stub. Low and long, much wider than
tall.
```

<!-- plik: kamienie-mech.png -->
```
Three small flat grey stones half sunk in the ground, seen from above at a
slight angle, patches of bright green moss on their tops and a few blades of
grass between them. Very low and flat, wider than tall.
```

<!-- plik: paproc.png -->
```
A small low fern clump seen from above at a slight angle: six or seven curved
bright green fronds spreading out like a star from the centre, one young
curled frond. Flat and wide, meant to be scattered across damp ground.
```

<!-- plik: irysy.png -->
```
A small clump of wild swamp irises: a few sword-shaped green leaves and three
blooming violet-purple iris flowers with yellow marks, one closed bud.
Compact, slightly wider than tall, bright spot of colour on a marsh.
```

## 9. Polana — stosy surowców na łące (runda 5, wzorzec HoMM3 HotA)

Werdykt rundy 4: „czerwono-biała kula przy wiatraku, kiście jagód i kryształy
są wielkości bohatera, bez cienia i bez podstawki — ikony wklejone na tło".
Scena przy `USTAWIENIA.znajdzki` zmniejsza znajdźki do pół pola, kładzie pod
nie cień kontaktowy i bierze rysunek STOSU leżącego na trawie
(`m-stos-<ikona>`) zamiast ikony z paska surowców — jak w HotA, gdzie
surowiec to niska kupka, szersza niż wysoka, a nie pojedynczy przedmiot.

| Plik (tools/wsad/) | Trafia do | Wysokość |
|---|---|---|
| `polana-stos-pokeball.png` … `polana-stos-kamien-ewolucji.png` | `public/mapa/polana/stos-*.png` | 72 px |

<!-- plik: polana-stos-pokeball.png -->
```
A low heap of five red-and-white capture balls (red top half, white bottom
half, dark band with a small round white button) piled in and around a small
open wooden crate lying on the ground, one ball rolled out in front. Painted
with soft shading and glossy highlights like the rest of the map, not a flat
icon. Much wider than tall, a low compact pile that reads as "a pile of balls
to pick up" at 30 pixels tall.
```

<!-- plik: polana-stos-jagody.png -->
```
A low heap of freshly picked glossy red berries spilling out of a small
round wicker basket tipped on its side, a few green leaves among the berries.
Painted soft shading and bright highlights. Much wider than tall, a low
compact pile that reads as "berries to pick up" at 30 pixels tall.
```

<!-- plik: polana-stos-odlamki.png -->
```
A low heap of pale-blue crystal shards of different sizes lying scattered on
top of each other, a few jutting up at angles, crisp facets with bright white
highlights and a soft cyan inner glow, some small grey pebbles among them.
Much wider than tall, a low compact pile that reads as "crystal shards to pick
up" at 30 pixels tall.
```

<!-- plik: polana-stos-kamien-ewolucji.png -->
```
A low pile of four smooth rounded magic stones glowing violet and lilac with
a faint swirl pattern inside, lying heaped together, one small stone rolled
beside them. Painted soft shading and highlights. Much wider than tall, a low
compact pile that reads as "magic stones to pick up" at 30 pixels tall.
```

## 10. Twierdza — stosy na śniegu i świerczki (runda 3, wzorzec HoMM3 HotA)

Werdykt: „śnieg to białe plamy, dwie trzecie ekranu jest puste". HotA ma
na śniegu gęsto: kępy ośnieżonych świerków, kupki surowców z cieniem, skały
z czapami śniegu. Stosy idą do zestawu `zima` (`USTAWIENIA.znajdzki`),
świerczki to naklejki tła (`NAKLEJKI` w `tools/mapy/twierdza.py`) — nie
blokują ruchu, a wypełniają puste połacie bieli między obiektami.

Tego samego dnia góry zestawu (`zima-kepa-skaly-3`, `-4`, §3) straciły
płaskie kremowe blaty: w kadrze czytały się jak „tort", a nie jak pasmo gór.

| Plik (tools/wsad/) | Trafia do | Wysokość |
|---|---|---|
| `zima-stos-pokeball.png` … `zima-stos-kamien-ewolucji.png` | `public/mapa/zima/stos-*.png` | 72 px |
| `swierczek-sniezny-1.png`, `-2` | `public/mapa/tlo/` | 46–50 px |

Też w tej rundzie: `zima-drzewo`, `zima-drzewo-b` (§3) z nagiego drzewa
i oszronionej brzozy na ośnieżone jodły — werdykt: „obok zasp rosną
liściaste drzewa". Surowe `zima-kepa-skaly-3`, `-4` z API wyszły
pomarańczowe; we wsadzie zdjęto im ok. 45% nasycenia (szarobrązowa skała
jak w HotA), przy ponownym generowaniu trzeba to powtórzić.

<!-- plik: zima-stos-pokeball.png -->
```
A low heap of five red-and-white capture balls (red top half, white bottom
half, dark band with a small round white button) piled in and around a small
open wooden crate half buried in snow, a little snow on the crate edges and
on top of the balls, one ball rolled out in front. Painted with soft shading
and glossy highlights, not a flat icon. Much wider than tall, a low compact
pile that reads as "a pile of balls to pick up" at 30 pixels tall.
```

<!-- plik: zima-stos-jagody.png -->
```
A low heap of glossy dark red frozen berries spilling out of a small round
wicker basket tipped on its side, frost crystals and a dusting of snow on the
berries and the basket rim, no green leaves. Painted soft shading and bright
highlights. Much wider than tall, a low compact pile that reads as "berries
to pick up" at 30 pixels tall.
```

<!-- plik: zima-stos-odlamki.png -->
```
A low heap of pale-blue crystal shards of different sizes jutting out of a
small mound of snow at angles, crisp facets with bright white highlights and
a soft cyan inner glow, a few grey pebbles and snow crumbs among them. Much
wider than tall, a low compact pile that reads as "crystal shards to pick up"
at 30 pixels tall.
```

<!-- plik: zima-stos-kamien-ewolucji.png -->
```
A low pile of four smooth rounded magic stones glowing violet and lilac with
a faint swirl pattern inside, lying heaped together in a shallow hollow of
snow, a little snow on their tops, one small stone rolled beside them.
Painted soft shading and highlights. Much wider than tall, a low compact pile
that reads as "magic stones to pick up" at 30 pixels tall.
```

<!-- plik: swierczek-sniezny-1.png -->
```
A small young spruce tree heavily laden with snow: dark blue-green needles
peeking out under thick white snow caps on every tier of branches, a pointed
snowy top, a short brown trunk sunk into a small snow mound. No grass, no
leaves. Taller than wide.
```

<!-- plik: swierczek-sniezny-2.png -->
```
Two small snow-laden spruce saplings of different heights growing side by
side from one small snow mound, dark blue-green needles under thick white
snow on each branch tier, pointed snowy tops. No grass, no leaves. Slightly
taller than wide.
```


## 11. Polana — łąka z przejściami terenu (runda 6, wzorzec HoMM3 HotA)

Werdykt rundy 5: „środek i lewy dół mapy to płaska, jednolita zieleń
z powtarzalnymi okrągłymi kępkami krzaków: brak przejść terenu (ziemi, skał,
wzniesień) i drobnych obiektów". Krzak sceny (`m-krzak`, `m-krzak-2`) był
jednym rysunkiem w dwóch kopiach — okrągła kula z czerwonymi jagodami,
powtórzona na co trzecim polu łąki. Polana dostaje w zestawie dwa RÓŻNE,
nieregularne krzewy, teksturę ubitej ziemi pod skarpami gór i przy brzegu
(`TEKSTURY = {'jalowa': 'ziemia'}` — spękana szara jałowa ziemia nie pasuje
do łąki) i trzy naklejki drobiazgów łąki.

| Plik (tools/wsad/) | Trafia do | Wysokość |
|---|---|---|
| `polana-krzak.png`, `polana-krzak-2.png` | `public/mapa/polana/krzak*.png` | 84 px |
| `teren-ziemia.png` (+ `teren-ziemia2.png`) | `public/mapa/teren/teren-ziemia*.png` | 768 px |
| `pniak-lakowy.png`, `glazy-lakowe.png`, `kepa-kwiatow.png` | `public/mapa/tlo/*.png` | 30–36 px |

<!-- plik: polana-krzak.png -->
```
A small irregular wild meadow shrub seen from above at a slight angle: a loose
cluster of long arching leafy stems of different lengths, light fresh green
leaves with a few white and pale yellow blossoms, one side taller than the
other so the silhouette is uneven and NOT round. No berries. Painted soft
shading, light from the top right. Wider than tall.
```

<!-- plik: polana-krzak-2.png -->
```
A low clump of wild vegetation growing against a small mossy grey boulder:
a few spiky fern fronds and tall grass blades sticking out on one side of the
stone, a couple of purple thistle flowers. Uneven, asymmetric silhouette,
clearly different from a round bush. Painted soft shading, light from the top
right. Wider than tall.
```

<!-- plik: teren-ziemia.png | styl: teren -->
```
The ground is bare packed earth at the foot of grassy hills: warm brown soil
with small grey and ochre pebbles, a few flat stones half buried, thin
cracks, scattered tufts of short grass and tiny clover patches. Warm, sunny,
clearly dry walkable earth, not mud and not sand.
```

<!-- plik: teren-ziemia2.png | styl: teren -->
```
The ground is rough stony earth: medium brown soil with more small rocks and
gravel, a few larger flat grey stones, sparse sprouts of grass along the
edges of the stones. Warm and sunny, the same brown as packed earth.
```

<!-- plik: pniak-lakowy.png -->
```
An old cut tree stump on a meadow, bark on the sides, pale rings on the top,
a small cluster of orange mushrooms growing at its base and a patch of moss.
Painted soft shading, light from the top right. Wider than tall.
```

<!-- plik: glazy-lakowe.png -->
```
A small group of three rounded grey boulders of different sizes lying
together, patches of green moss on top, a few blades of grass between them.
Painted soft shading, light from the top right. Much wider than tall.
```

<!-- plik: kepa-kwiatow.png -->
```
A small loose patch of wild meadow flowers: tall stems of blue cornflowers,
white daisies and a few red poppies with grass blades between them, uneven
outline. Painted soft shading. Wider than tall.
```

### 10b. Twierdza — zimowe budowle odwiedzane (runda 3, wzorzec HotA)

Po oddaleniu kamery do 32 px na pole (`ZOOM_MAPY`) pierwszy ekran ma
21 × 18 pól i wchodzą do niego budowle, które dotąd stały dalej: omszała
wieża, łąkowe źródło, zielone gniazdo, drzewo wiedzy w pełnym listowiu —
na śniegu wyglądały na „doklejone". Zestaw `zima` podmienia je pod tymi
samymi kluczami; wysokości jak oryginały (`ZESTAWY` w `wsad_wczytaj.py`).

<!-- plik: zima-kamienna-wieza.png -->
```
A short round stone watchtower in deep winter, two storeys tall, grey blocks
with frost in the joints, a conical blue slate roof under a thick cap of snow
with icicles on the rim, one small arched window glowing warm yellow, a wooden
door and three worn stone steps half buried in snow, a shield hanging beside
the door, a small snow drift against the wall. No moss, no ivy, no grass.
Taller than wide.
```

<!-- plik: zima-wieza-obserwacyjna.png -->
```
A tall slender wooden lookout tower on a snowy grey rock outcrop in deep
winter, four legs with cross bracing, a railed observation platform at the top
with a small shingled canopy covered in snow, icicles on the canopy edge, a
brass telescope on the platform pointing outward, a ladder up one side, snow
on the rocks and on every beam. No grass, no moss, no green bushes. Taller
than wide.
```

<!-- plik: zima-oboz-treningowy.png -->
```
A small winter training camp: two beige canvas tents with red pennants and
snow on their ridges, a wooden weapon rack holding wooden practice swords and
shields dusted with snow, a straw training dummy with a snow cap, a round
campfire ring with grey stones and a small bright fire, trampled snow between
them. No grass, no green plants. Slightly wider than tall.
```

<!-- plik: zima-zrodlo.png -->
```
A small magical warm spring in deep winter: steaming clear turquoise water
welling out of a ring of smooth grey stones capped with snow into a shallow
round pool, a thin ring of ice at the rim, soft white steam rising, sparkling
droplets in the air, snow all around the stones. No grass, no flowers, no
moss. Wider than tall.
```

<!-- plik: zima-gniazdo.png -->
```
A large woven nest of dark branches and dry straw built on a wooden platform
between two snow-capped tree stumps in deep winter, the rim of the nest
dusted with snow, soft grey down lining inside, three pale speckled eggs in
the middle, a small wooden sign post with a snow cap beside it, icicles under
the platform. No green moss, no leaves, no grass. Wider than tall.
```

<!-- plik: zima-ranczo.png -->
```
A horse ranch in deep winter: a long low red barn with a wide open doorway and
hay bales inside, the roof under a thick layer of snow with icicles on the
eaves, a white wooden paddock fence in front with snow on the rails, a water
trough with a sheet of ice and a bucket, horseshoes nailed above the barn
door, no animals visible. No grass, no green plants. Wider than tall.
```

<!-- plik: zima-arena.png -->
```
A small round open-air arena in deep winter: a circle of trampled snow ringed
by pale stone benches with snow on them and short wooden posts with snow caps,
two crossed training staves standing in the middle, colourful pennants on
poles around the rim, seen from a raised three-quarter angle so the circle is
visible. No grass, no sand, no green plants. Wider than tall.
```

<!-- plik: zima-chata-jasnowidza.png -->
```
A witch's cottage in deep winter: crooked wooden walls, a steep shingle roof
buried under a thick pillow of snow with icicles, a bent stone chimney with a
thin curl of smoke, one round window glowing warm yellow, a porch with a small
table holding a glowing crystal ball, bundles of dried herbs and a lantern
hanging from the eaves, a wooden signboard with a painted eye, snow drifts
against the walls. No moss, no grass, no green leaves. Slightly wider than tall.
```

<!-- plik: zima-drzewo-wiedzy.png -->
```
An ancient wise tree in deep winter: a thick gnarled trunk with a friendly
face suggested by the bark knots, a broad round crown of bare twisting
branches heavily covered in white snow and silver hoarfrost, a few glittering
golden leaves still clinging among the snow, a few open books resting in a
hollow at the base of the trunk, a small snow drift around the roots. No
green leaves, no grass. Taller than wide.
```

## 12. Bagna — runda 6 (wzorzec HotA): mętna woda, bity trakt, trzcinowe kępy

Werdykty rundy 5: „turkusowa, czysta woda wygląda jak tropikalna zatoka —
ma być mętna, oliwkowo-brunatna, z trzciną, błotem, zatopionymi pniami
i kępami"; „drogi to rozmyte beżowe smugi — potrzebny utwardzony trakt";
„płaska łąka z okrągłymi krzaczkami". Tekstury wody i traktu wchodzą przez
`TEKSTURY` Bagien (`woda`, `sciezka`), kępy przez zestaw `bagno`, a naklejki
wody przez `NAKLEJKI`.

| Plik (tools/wsad/) | Trafia do | Wysokość |
|---|---|---|
| `teren-woda-bagno.png` | `public/mapa/teren/` | tekstura 768 |
| `teren-bruk.png` | `public/mapa/teren/` | tekstura 768 |
| `bagno-krzak.png`, `bagno-krzak-2.png` | `public/mapa/bagno/krzak*.png` | 84 px |
| `pien-zatopiony.png`, `kepa-turzycy.png` | `public/mapa/tlo/` | 30–34 px |

Uwaga: `teren-woda-bagno.png` i `teren-bruk.png` we wsadzie są już
obrobione (surowe z API ≠ plik we wsadzie). Bruk: kamienie zmniejszone
o połowę (2 × 2 odbicia lustrzane) — w skali 768 px na teksturę na
szerokość traktu mieścił się jeden kamień. Woda: sama rzęsa i liście
z dostawy OpenAI położone na zmarszczkach `teren-woda` przemalowanych na
brunatną oliwkę (z przygaszonymi liniami kaustyk i plamami odbicia nieba) —
surowa tekstura wyglądała w grze jak mech, nie jak woda. Kępy skał
`bagno-kepa-skaly-*` mają obrane jasne rąbki podstawek.

<!-- plik: teren-woda-bagno.png | styl: teren -->
```
The ground is the still, murky water of a swamp pool: opaque dark olive-green
and brown water like strong tea, NOT blue and NOT turquoise, nothing visible
under the surface. Faint slow ripples, floating rafts of bright green duckweed
and algae scum drifting in irregular patches, a few fallen brown leaves and
tiny twigs floating, soft dull reflections of an overcast sky. Stagnant,
muddy and gloomy but still painted in a warm friendly storybook palette.
```

<!-- plik: teren-bruk.png | styl: teren -->
```
The ground is a sturdy old paved road surface seen from above: rounded
cobblestones and flat grey-brown flagstones of different sizes fitted closely
together, dark earth and thin green moss in the gaps between them, a few
cracked stones, warm grey and ochre tones. The stones fill the WHOLE picture
evenly with no direction, no edges, no grass verge.
```

<!-- plik: pien-zatopiony.png -->
```
A half-sunken dead tree trunk lying in dark swamp water, seen from above at
a slight angle: grey-brown weathered wood with peeling bark, a broken stub of
a branch sticking up, green moss and a bit of duckweed clinging to it, small
ripples of dark olive water around it where it enters the water. Low and long,
much wider than tall.
```

<!-- plik: kepa-turzycy.png -->
```
A tiny island tussock rising out of dark swamp water, seen from above at a
slight angle: a round mound of wet dark mud crowned with a shaggy tuft of
olive-green sedge and three cattails, a ring of murky olive water ripples
around its base. Small and compact, slightly wider than tall.
```

## 12. Polana — skaliste granie zamiast zielonych kopców (runda 7, wzorzec HotA)

Werdykt rundy 6 (trzech krytyków): „wzgórza to ta sama zielono-brązowa
stożkowa pieczątka, powtórzona kilka razy; gładkie zielone kopce ucięte jak
nożem, bez skał; potrzebne skaliste grzbiety o nieregularnym obrysie
i prawdziwe góry o innej sylwetce". W HotA góra na trawie to szaro-brązowa
skała z ostrymi szczytami, żlebami i piargiem, zielona tylko u podnóża.
Cztery RÓŻNE sylwetki (grań z zębami, masyw z wodospadem, dwa szczyty
z przełęczą, niskie skałki podnóża), każda o podstawie na całą szerokość
obrazka — scena kładzie je co trzy pola i zachodzą na siebie w pasmo.

Generowane pod nazwą `polana-gran-N.png`; po obróbce (przycięcie, zdjęcie
jasnego rąbka u podstawy) zapisane we wsadzie jako `polana-kepa-skaly-N.png`
(`public/mapa/polana/kepa-skaly-N.png`, 216 px). Stare zielone kopce leżą
w historii gita.

<!-- plik: polana-gran-1.png | styl: obiekt | proporcje: 3:2 -->
```
A segment of a jagged rocky mountain range in the style of Heroes of Might
and Magic 3: a long ridge of sharp grey and warm tan rock peaks of uneven
heights, like broken teeth, with one tall summit left of centre and a row of
smaller crags stepping down to the right. Deep dark vertical crevices and
gullies, rock ledges, pale grey scree fans spilling down, a few small dark
green pines and tufts of grass clinging to the lower ledges; only the very
foot is grassy green. Strong sculpted relief: bright sunlit faces on the
right, deep blue-grey shadows on the left. Clearly an impassable mountain.
Much wider than tall; the foot spreads across the whole width of the picture
so that pieces placed side by side join into one continuous range.
```

<!-- plik: polana-gran-2.png | styl: obiekt | proporcje: 3:2 -->
```
A craggy grey rock massif with a waterfall in the style of Heroes of Might
and Magic 3: two sharp rocky summits of different height with a notch
between them, a thin white waterfall falling from the notch down a dark cleft
in the front cliff into a small blue pool at the foot, wet dark rock beside
it, mossy green ledges, a few small pines on the shoulders, grey scree and
boulders around the base. Strong sculpted relief lit from the right, deep
shadows on the left. One solid impassable landform. Wider than tall; the
rocky foot spreads across the whole width of the picture.
```

<!-- plik: polana-gran-3.png | styl: obiekt | proporcje: 3:2 -->
```
A long low rocky mountain ridge in the style of Heroes of Might and Magic 3,
seen from the side: a jagged grey and warm tan stone crest running across the
whole picture from left to right, with a saddle in the middle and two uneven
rocky humps, many small sharp crags and broken rock teeth along the top, deep
shadowed gullies running down the front face, grey scree fans and a few
boulders at the foot, a handful of tiny dark pines and green grass patches
only on the lowest slopes. Sunlit faces on the right, cool blue-grey shadow
on the left. Clearly an impassable mountain wall, about twice as wide as tall;
the foot spreads across the whole width of the picture.
```

<!-- plik: polana-gran-4.png | styl: obiekt | proporcje: 3:2 -->
```
Low rugged rocky foothills of a mountain chain in the style of Heroes of
Might and Magic 3: a tight cluster of five or six low sharp grey-tan rock
outcrops and big angular boulders of different sizes packed together, cracked
faces with dark crevices, grey scree and gravel between them, a few tufts of
green grass and two small dark green bushes in the gaps. Lower and flatter
than a mountain but clearly impassable rough rocky ground. Lit from the
right. Much wider than tall; the foot spreads across the whole width of the
picture.
```

## 13. Bagna — runda 7 (wzorzec HotA): most nad Czarną Strugą

Werdykt rundy 6: „prawa połowa to mętna, szarozielona plama bez rzeźby
i obiektów; bagnu trzeba dać ostrą teksturę z czytelnymi krawędziami wody
i lądu". Woda dostała ciemną, torfową teksturę `teren-woda-czarna`
(przeliczoną z `teren-woda` i rzęsy z `teren-woda-bagno`, bez API), Struga
w kadrze jest wąską, czystą wstęgą, a bród zastąpił most — naklejka tła
(`MOSTY` w `tools/mapy/bagna.py`), obrobiony plik w `public/mapa/bagno/most.png`.

<!-- plik: bagno-most.png | styl: obiekt | proporcje: 3:2 -->
```
A short old wooden bridge over a swamp creek, seen straight from the front and
from above at about forty-five degrees, NOT isometric and NOT diagonal: the
bridge runs perfectly horizontally from the left edge to the right edge of the
picture, parallel to the bottom edge. We see the top of the deck as a wide
horizontal band of weathered grey-brown planks laid crosswise, some planks
darker and slightly crooked, patches of green moss and a little hanging swamp
moss on the edges, a rough log railing with crooked posts along the back edge
and the front edge, a small lantern on one post, and below the deck the front
face with three thick dark wooden stilts wrapped in moss. Both ends are flat
and open so a road can run onto them. Much wider than tall. No water, no river
banks, no grass, no ground.
```

## 14. Polana — ubity trakt zamiast beżowych pasków (runda 8, wzorzec HotA)

Werdykt rundy 7: „drogi są płaskimi beżowymi pasami o ostrych krawędziach bez
tekstury, obrzeży i kolein — wyglądają jak wektorowe paski naklejone na
malowany teren". Trakt dostaje własną teksturę ubitej ziemi
(`TEKSTURY = {'sciezka': ['droga-polana', …]}` w `tools/mapy/polana.py`),
a kręty kształt, koleiny i obrzeże (przydrożna trawa, kamyki, cień) maluje
`teren_efekty` — w teksturze nie ma kierunku, bo leży pod każdym zakrętem.

| Plik (tools/wsad/) | Trafia do | Wysokość |
|---|---|---|
| `teren-droga-polana.png` | `public/mapa/teren/` (kopiowany ręcznie, zmniejszony do 768) | tekstura 768 |

<!-- plik: teren-droga-polana.png | styl: teren -->
```
The ground is a well-trodden country dirt road surface seen from above: packed
warm medium-brown earth, darker than sand, with fine grey and ochre gravel,
many tiny pebbles, a few small flat stones pressed into the soil, faint dusty
lighter patches and darker damp patches, tiny hoof prints and dry cracks. The
surface fills the WHOLE picture evenly with no direction, no edges, no grass
verge, no grass at all.
```

## 15. Twierdza — masyw górski zamiast tapety kęp (runda 4, wzorzec HotA)

Werdykt rundy 3 (dwóch krytyków): „pasmo gór po lewej to ten sam ośnieżony
szczyt skopiowany w regularnej siatce — tapeta, a nie masyw; trzeba 3–5
wariantów o różnej wielkości, jeden główny grzbiet z pogórzem, nieregularna
krawędź przejścia w śnieg i wyraźny cień". Scena stawia kępy skał 3 × 2 na
każdym zwartym kawałku skał, więc pasmo zawsze wychodzi w rzędach. Te
rysunki to WIELOPOLOWE góry różnej wielkości, które plansza rozstawia ręcznie
(`USTAWIENIA.masywy` w `tools/mapy/twierdza.py`), a pola pod nimi scena
zostawia bez kęp. Skała zimna, szaroniebieska (surowe kępy §3 wyszły
pomarańczowe — tu pilnuje tego prompt).

| Plik (tools/wsad/) | Trafia do | Wysokość |
|---|---|---|
| `zima-gora-1.png` … `zima-gora-5.png` | `public/mapa/zima/gora-N.png` | 300–420 px |

<!-- plik: zima-gora-1.png | styl: obiekt | proporcje: 3:2 -->
```
A long, massive snow-covered mountain range segment for a winter adventure
map: one main ridge running across the whole width of the picture with five
peaks of clearly different heights, the tallest and broadest summit left of
centre, a lower notch-shaped pass right of centre, then two smaller jagged
peaks stepping down to the right. Cool slate-grey and blue-grey granite
cliffs with deep dark blue shadowed gullies and couloirs, thick white snow on
every summit and along the ridge line, snowfields and a small glacier tongue
on the upper slopes, grey scree fans and a few big snow-capped boulders at
the foot, three or four tiny snow-laden dark spruces on the lower shoulders.
Strong sculpted relief: bright sunlit faces, deep cool shadows. The foot is
an irregular, lumpy edge of snow drifts and rocks, not a straight line. Cool
winter palette, NO orange, NO warm brown rock. Much wider than tall.
```

<!-- plik: zima-gora-2.png | styl: obiekt | proporcje: 1:1 -->
```
One huge, tall, solitary snowy mountain massif for a winter adventure map:
a broad pyramid of cool blue-grey granite with a sharp snow-covered summit
slightly off-centre and two lower shoulders, sheer cliff faces with dark
blue shadowed cracks, a frozen pale-cyan icefall (a waterfall turned to ice)
hanging down a cleft in the front face, thick snow on the ledges, a skirt of
grey scree, snow-capped boulders and a few small snowy spruces around the
wide irregular foot. Strong sculpted relief, bright sunlit faces and deep
cool shadows. Cool winter palette, NO orange, NO warm brown rock. About as
wide as tall, the foot spreading across the whole width of the picture.
```

<!-- plik: zima-gora-3.png | styl: obiekt | proporcje: 3:2 -->
```
A medium-size snowy mountain for a winter adventure map: two sharp rocky
summits of different height joined by a snowy saddle, cool slate-grey rock
with dark blue-grey shadowed gullies, heavy white snow caps and snow streaks
down the faces, a few jagged rock teeth on the ridge, grey scree and
snow-capped boulders along the irregular lumpy foot, two small snow-laden
spruces at one side of the foot. Strong relief with bright sunlit faces and
deep cool shadows. Cool winter palette, NO orange, NO warm brown rock.
Wider than tall.
```

<!-- plik: zima-gora-4.png | styl: obiekt | proporcje: 3:2 -->
```
Low rugged snowy foothills of a mountain chain for a winter adventure map:
a tight cluster of six or seven low sharp slate-grey rock outcrops and big
angular boulders of different sizes packed together, each with a thick
white snow cap, dark blue-grey shadowed cracks, snow drifts piled between
the rocks, grey gravel peeking through, two tiny snow-laden spruces in the
gaps. Lower and flatter than a mountain, but clearly impassable rough rocky
ground. Cool winter palette, NO orange, NO warm brown rock. Much wider than
tall, the lumpy irregular foot spreading across the whole width.
```

<!-- plik: zima-gora-5.png | styl: obiekt | proporcje: 3:2 -->
```
A snowy rocky hill with a cliff for a winter adventure map: a broad rounded
white snow-covered hill whose front face breaks into a short sheer grey
granite cliff with dark blue shadowed cracks and icicles hanging from the
cliff edge, a few snow-capped rocks and a small group of three snow-laden
dark spruces on the top of the hill, snow drifts and scattered grey stones
at the foot. Medium height, lower than a mountain. Cool winter palette, NO
orange, NO warm brown rock. Wider than tall.
```

### 15b. Twierdza — naklejki pola śniegu (runda 4, wzorzec HotA)

Werdykt rundy 3: „pole śniegu między zamkiem a lasem to jednolita, płaska
biała tekstura — brakuje uskoków, zasp, skał i zmian odcienia, drobne
obiekty unoszą się na pustym tle". Naklejki tła (`NAKLEJKI` w
`tools/mapy/twierdza.py`, `public/mapa/tlo/`): łaty odsłoniętej zmarzniętej
ziemi, płyty skalne spod śniegu, kępy suchej trawy i nawisy śnieżne ze
schodkiem cienia.

| Plik (tools/wsad/) | Trafia do | Wysokość |
|---|---|---|
| `lata-ziemi-snieg.png`, `skalki-snieg.png`, `trawy-snieg.png`, `nawis-sniezny.png` | `public/mapa/tlo/` | 30–56 px |

<!-- plik: lata-ziemi-snieg.png | styl: obiekt | proporcje: 3:2 -->
```
A flat irregular patch of bare frozen ground in snow, seen from above at a
three-quarter angle, lying flat on the ground with no height: dark grey-brown
frozen earth, a few small grey stones and pebbles, sparse tufts of dry pale
yellow grass, thin frost, surrounded by a ragged, lumpy rim of white snow
with soft blue shadows. This object IS a flat patch of ground. Much wider
than tall, like a puddle-shaped decal.
```

<!-- plik: skalki-snieg.png | styl: obiekt | proporcje: 3:2 -->
```
Four flat slate-grey rock slabs and a few smaller stones poking out of deep
snow at different angles, thick white snow on their tops, cool blue-grey
shadowed sides and a soft blue shadow in the snow beside them, a little snow
drift piled against them. Low and flat, clearly lying on the ground. Much
wider than tall.
```

<!-- plik: trawy-snieg.png | styl: obiekt -->
```
Three tufts of dry golden-beige winter grass and a couple of bare thin brown
twigs sticking out of a small low snow mound, a little frost on the blades,
soft blue shadow on one side of the mound. Small and low. Wider than tall.
```

<!-- plik: nawis-sniezny.png | styl: obiekt | proporcje: 3:2 -->
```
A low wind-carved snow bank step: a curved crescent-shaped ledge of snow
with a smooth rounded top and an overhanging cornice lip, under the lip a
deep cool blue shadow band and a small drop to lower snow, a few grey stones
peeking out at one end. Low, flat, long. About three times wider than tall.
```

## 16. Bagna — łańcuchy gór zamiast osobnych stożków (runda 8, wzorzec HotA)

Werdykt rundy 7: „góry to osobne stożki skał wklejone jak sprite'y (lewy
górny róg, lewy dolny róg, dół przy moście) — nie łączą się w grzbiety ani
pasma i nie mają podnóży przechodzących w trawę". Kępy 3 × 2 (§7) scena
stawia po jednej na każdy kawałek skał, więc zawsze wychodzą pojedyncze
szczyty. Te rysunki to WIELOPOLOWE pasma rozstawiane ręcznie
(`USTAWIENIA.masywy` w `tools/mapy/bagna.py`, jak Twierdza §15), zachodzące
na siebie, z pogórzem, które schodzi w mech i trawę. Zestaw `bagno`.

| Plik (tools/wsad/) | Trafia do | Wysokość |
|---|---|---|
| `bagno-gora-1.png` … `bagno-gora-4.png` | `public/mapa/bagno/gora-N.png` | 260–380 px |

<!-- plik: bagno-gora-1.png | styl: obiekt | proporcje: 3:2 -->
```
A long continuous mountain range segment for a swampland adventure map, in the
style of Heroes of Might and Magic 3: ONE unbroken ridge running across the
whole width of the picture, with five jagged peaks of clearly different heights
joined by rocky saddles, the tallest summit left of centre. Warm grey-brown
rock with deep dark brown crevices and vertical cracks, ledges and gullies
covered in dark green moss, sculpted relief lit from the upper left: pale
sunlit faces, deep brown shadowed faces. The lower slopes turn into rounded
foothills covered in moss and grass with a few dark green pines, twisted swamp
willows, ferns and mossy boulders, so the mountain grows out of the ground
instead of standing on it. The foot is a soft, irregular, lumpy edge of moss,
grass tufts and small bushes, not a straight line. Much wider than tall.
```

<!-- plik: bagno-gora-2.png | styl: obiekt | proporcje: 1:1 -->
```
A big tall mountain massif for a swampland adventure map, in the style of
Heroes of Might and Magic 3: a broad, heavy block of several jagged grey-brown
rock peaks rising behind each other, one clearly higher in the middle, with a
narrow white waterfall falling down a dark cleft in the front face into a small
murky green pool with reeds at the foot. Deep dark brown crevices, ledges
patched with dark green moss and hanging vines, strong relief lit from the
upper left. The lower shoulders are mossy green foothills with dark pines,
twisted swamp willows, ferns and mossy boulders that fade into grass at the
wide, irregular foot spreading across the whole width of the picture.
```

<!-- plik: bagno-gora-3.png | styl: obiekt | proporcje: 3:2 -->
```
A long, low rocky ridge of foothills for a swampland adventure map, in the
style of Heroes of Might and Magic 3: a continuous chain of low sharp
grey-brown rock crests and big angular mossy boulders packed tightly along one
line across the whole width of the picture, lower and flatter than a mountain
but clearly impassable, with dark crevices, thick dark green moss on the tops,
four or five dark pines and a twisted swamp willow growing between the rocks,
ferns and grass tufts at the irregular lumpy foot that blends into moss and
grass. Relief lit from the upper left. Much wider than tall.
```

<!-- plik: bagno-gora-4.png | styl: obiekt | proporcje: 3:2 -->
```
The end of a mountain chain for a swampland adventure map, in the style of
Heroes of Might and Magic 3: a ridge of three jagged grey-brown rock peaks
stepping down from a high summit on the left to a low mossy rock shoulder on
the right, where it ends in a short steep cliff. Deep dark brown crevices,
ledges covered in dark green moss, strong relief lit from the upper left, a
few dark pines and a twisted swamp willow on the shoulders, mossy boulders,
ferns and grass tufts along the soft irregular foot that fades into grass.
Wider than tall.
```

## 17. Polana — zwarte masywy lasu zamiast rzadkich kęp drzew (runda 9, wzorzec HotA)

Werdykt rundy 8: „łąki w lewej górnej i prawej górnej ćwiartce to pusta,
płaska zieleń z rozsypanymi drobnymi znacznikami; brakuje zwartych masywów
lasu, które wyznaczałyby korytarze". Podstawowe `kepa-las-*` to cztery, pięć
osobnych drzewek z trawą między nimi — nawet blok lasu 6 × 4 pola czytał się
jak sad. W HotA las to ciemnozielona, zbita ściana koron. Cztery RÓŻNE bryły
gęstego lasu mieszanego; scena kładzie je co trzy pola (rysunek na pięć pól
szerokości), więc sąsiednie zachodzą na siebie w jeden masyw.

| Plik (tools/wsad/) | Trafia do | Wysokość |
|---|---|---|
| `polana-kepa-las-1..4.png` | `public/mapa/polana/kepa-las-N.png` | 216 |

<!-- plik: polana-kepa-las-1.png | styl: obiekt -->
```
A dense block of mixed forest for a fantasy adventure map, in the style of
Heroes of Might and Magic 3: about twelve tall dark green pines and firs packed
tightly together with three round-crowned leafy oaks between them, crowns
overlapping so that no grass shows between the trees, several rows deep, the
back row taller. Deep dark green shadows between the trunks, sunlit lighter
green tips on the right. Reads as one solid, impassable wall of forest. A bit
wider than tall; the row of trunks and low bushes at the bottom spreads across
the whole width of the picture so that pieces placed side by side join into
one continuous forest.
```

<!-- plik: polana-kepa-las-2.png | styl: obiekt -->
```
A thick clump of deciduous forest for a fantasy adventure map, in the style of
Heroes of Might and Magic 3: eight to ten big round-crowned oaks, beeches and
lindens of different greens packed tightly together, crowns overlapping into
one billowing canopy, two dark pines poking out at the back, a dense
undergrowth of bushes and ferns along the bottom. Deep dark shadows inside the
canopy, sunlit crowns on the right. One solid impassable block of forest, no
gaps. A bit wider than tall; the undergrowth spreads across the whole width.
```

<!-- plik: polana-kepa-las-3.png | styl: obiekt -->
```
A dense stand of dark coniferous forest for a fantasy adventure map, in the
style of Heroes of Might and Magic 3: fifteen tall slim dark green spruces and
firs of uneven heights crowded together in several rows, pointed tops forming a
jagged skyline, one birch with a white trunk at the front edge, low bushes
between the front trunks. Deep blue-green shadows between the trees, sunlit
edges on the right. Clearly one impassable block of forest. A bit wider than
tall; the front row spreads across the whole width of the picture.
```

<!-- plik: polana-kepa-las-4.png | styl: obiekt -->
```
The ragged edge of a mixed forest for a fantasy adventure map, in the style of
Heroes of Might and Magic 3: a tight mass of dark pines and round leafy trees,
tall and thick on the left and in the back, stepping down to smaller young
trees and round green bushes at the front right, crowns overlapping into one
dense canopy with deep shadows inside. One solid block of forest, no grass
showing between the trees. A bit wider than tall; the bushes at the foot
spread across the whole width of the picture.
```

Pojedyncze drzewa na skraju masywów (scena stawia je tam, gdzie kępa 3 × 2
się nie mieści) — w tym samym malowanym stylu co kępy, zamiast jaskrawych
kreskówkowych drzewek podstawowego zestawu.

| Plik (tools/wsad/) | Trafia do | Wysokość |
|---|---|---|
| `polana-sosna.png`, `polana-sosna-b.png` | `public/mapa/polana/sosna*.png` | 144 |
| `polana-drzewo.png`, `polana-drzewo-b.png` | `public/mapa/polana/drzewo*.png` | 144 |
| `polana-sosna-mala.png` (zmniejszona `polana-sosna-b`) | `public/mapa/polana/sosna-mala.png` | 96 |

<!-- plik: polana-sosna.png | styl: obiekt | proporcje: 2:3 -->
```
A single tall dark green pine tree for a fantasy adventure map, in the style
of Heroes of Might and Magic 3: a slim pointed crown of layered dark green
needle branches with lighter sunlit tips on the right and deep blue-green
shadow on the left, a short straight reddish-brown trunk, a few small green
bushes at its foot. Much taller than wide.
```

<!-- plik: polana-sosna-b.png | styl: obiekt | proporcje: 2:3 -->
```
Two dark green fir trees growing close together for a fantasy adventure map,
in the style of Heroes of Might and Magic 3: one tall and one a bit shorter,
dense layered needle branches, sunlit tips on the right, deep shadow on the
left, short brown trunks hidden by a small round bush at the foot. Taller
than wide.
```

<!-- plik: polana-drzewo.png | styl: obiekt -->
```
A single big old oak tree for a fantasy adventure map, in the style of Heroes
of Might and Magic 3: a broad, billowing crown of deep green leaves in several
round clusters, sunlit lighter green on the upper right, dark shadowed green
underneath, a thick gnarled brown trunk with roots, two small bushes at its
foot. About as wide as tall.
```

<!-- plik: polana-drzewo-b.png | styl: obiekt -->
```
A leafy linden tree with a young pine beside it for a fantasy adventure map,
in the style of Heroes of Might and Magic 3: a round dense crown of deep green
leaves, the dark pointed pine a little behind on the left, sunlit tips on the
right, deep shadows inside the crowns, brown trunks, a few ferns at the foot.
About as wide as tall.
```

Dół doliny (pasmo od lasu do Strugi z przełęczą) — dwa grzbiety w tej samej
skale co `bagno-gora-1`, żeby łańcuch był jednym pasmem, a nie zbiorem brył.

<!-- plik: bagno-gora-5.png | styl: obiekt | proporcje: 3:2 -->
```
A mountain ridge segment for a swampland adventure map, in the style of Heroes
of Might and Magic 3: one continuous crest running across the whole width of
the picture, four sharp peaks of different heights joined by rocky saddles,
highest on the left, stepping down to the right. Warm light grey-brown rock
with pale sunlit faces lit from the upper left and deep brown shadowed faces,
dark crevices, ledges and gullies covered in dark green moss. Mossy green
foothills with two small dark pines, ferns and mossy boulders on the lower
slopes; the foot is a soft irregular edge of moss and grass tufts. Much wider
than tall.
```

<!-- plik: bagno-gora-6.png | styl: obiekt | proporcje: 3:2 -->
```
A mountain ridge segment for a swampland adventure map, in the style of Heroes
of Might and Magic 3: one continuous crest running across the whole width of
the picture, three sharp peaks joined by rocky saddles, the highest in the
middle, the right end dropping in a steep rocky cliff. Warm light grey-brown
rock with pale sunlit faces lit from the upper left and deep brown shadowed
faces, dark crevices, ledges covered in dark green moss and hanging vines.
Mossy green foothills with a small twisted swamp willow, a dark pine, ferns and
mossy boulders; the foot is a soft irregular edge of moss and grass tufts.
Much wider than tall.
```

## 18. Twierdza — skarpy i skalne progi na równinie (runda 6, wzorzec HotA)

Werdykt rundy 5: „dolna i środkowa część to płaski śnieg bez rzeźby,
zasypany identycznymi stosami — trzeba skarp, zagajników i wąwozów, które
tworzą korytarze". Niskie, długie progi skalne (niższe niż góry §15)
rozstawiane ręcznie jak masywy (`USTAWIENIA.masywy`): odnoga pasma na
równinie z wąwozem przy lesie i skalny próg nad placem przy drodze.

| Plik (tools/wsad/) | Trafia do | Wysokość |
|---|---|---|
| `zima-gora-6.png` … `zima-gora-8.png` | `public/mapa/zima/gora-N.png` | 200–260 px |

<!-- plik: zima-gora-6.png | styl: obiekt | proporcje: 3:2 -->
```
A long low snowy escarpment for a winter adventure map, seen from a
three-quarter top-down view: a raised shelf of snow-covered ground whose
front edge breaks into a short, steep, jagged cliff band of cool slate-grey
and blue-grey granite running across the whole width of the picture, with
dark blue shadowed cracks, small icicles hanging from the lip, snow cornices
along the top edge, a few snow-capped boulders and grey scree at the foot,
three small snow-laden dark spruces standing on top of the shelf at one end.
Low and long like a step in the terrain, much lower than a mountain. Cool
winter palette, NO orange, NO warm brown rock. About three times wider than
tall, the foot an irregular lumpy line of snow drifts and stones.
```

<!-- plik: zima-gora-7.png | styl: obiekt | proporcje: 3:2 -->
```
A small rocky snow knoll for a winter adventure map: a low mound of four or
five big angular slate-grey granite boulders piled together, thick white
snow caps on their tops, deep blue-grey shadows in the cracks between them,
two small snow-laden dark spruces growing between the rocks, snow drifts
piled around the base with soft blue shadow. Low and compact, clearly an
impassable rocky outcrop. Cool winter palette, NO orange, NO warm brown
rock. Wider than tall.
```

<!-- plik: zima-gora-8.png | styl: obiekt | proporcje: 3:2 -->
```
A snowy hill ridge with a small spruce grove for a winter adventure map: a
long, low, gently curved white snow-covered ridge whose lower side breaks
into a short grey granite rock face with dark blue shadowed cracks and a few
icicles, and on the crest a dense little grove of six or seven snow-laden
dark green spruces of different heights, a couple of snow-capped boulders
and snow drifts along the irregular foot. Lower than a mountain. Cool winter
palette, NO orange, NO warm brown rock. About twice as wide as tall.
```

## 18. Bagna — stos pokeballi w skrzynce (runda 9, wzorzec HotA)

Werdykt rundy 8: „te same czerwone grzyby rozsypane po całej mapie zagłuszają
obiekty". Piramidka trzech czerwonych kul z daleka czyta się jak kępka
muchomorów, a na pierwszym ekranie leży ich kilka. Skrzynka z drewna daje
stosowi brązową bryłę jak skarby w Heroes 3, czerwieni zostaje tyle, ile
trzeba, żeby poznać pokeballe. Po obejrzeniu idzie do wsadu jako
`bagno-stos-pokeball.png` (72 px).

<!-- plik: bagno-skrzynka-pokeball.png -->
```
A small low open wooden crate, weathered brown planks with a bit of green
moss on one corner, seen from above at a slight angle, filled with four
red-and-white capture balls peeking over the rim: glossy red top halves,
white bottom halves, black middle band with a round white button. The crate
is the main shape, wider than tall, compact, reads as "a crate of capture
balls to pick up" at 40 pixels. Soft painted shading and highlights like the
rest of the map. Isolated cut-out: nothing under the crate — no ground, no
grass, no shadow; everything around it is fully transparent.
```

## 19. Bagna — zwarte masywy zamiast rzędów stożków, sad na torfowisku (runda 10, wzorzec HotA)

Werdykt rundy 9: „góry to pojedyncze, odizolowane stożki (lewy dolny róg
i lewa krawędź nad zamkiem)" oraz „ten sam kosz czerwonych owoców i skrzynka
skopiowane kilkanaście razy wokół sadu". Rysunki §16 wyszły jako JEDEN rząd
szczytów widziany z boku — z kamery Heroes 3 (z góry, pod kątem) pasmo to
kłąb wielu szczytów w kilku rzędach, jedne za drugimi, połączonych graniami,
z usypiskami i głazami u stóp. Sad (kopalnia jagód) na bagnach to torfowisko
żurawin, nie jabłonie z koszami — kosze były tym samym czerwonym szumem co
stosy jagód obok. Zestaw `bagno`.

| Plik (tools/wsad/) | Trafia do | Wysokość |
|---|---|---|
| `bagno-gora-7.png` … `bagno-gora-9.png` | `public/mapa/bagno/gora-N.png` | 340–380 px |
| `bagno-sad.png` | `public/mapa/bagno/sad.png` | 160 px |

<!-- plik: bagno-gora-7.png | styl: obiekt | proporcje: 3:2 -->
```
A dense mountain massif for a swampland adventure map, seen from high above at
a steep three-quarter top-down angle exactly like the mountains on a Heroes of
Might and Magic 3 adventure map: NOT a single row of peaks seen from the side,
but a tight crumpled cluster of about twelve sharp rocky peaks of different
heights packed together in three or four overlapping rows receding into depth,
all joined by jagged ridgelines and rocky saddles into one solid impassable
mass that fills the whole width of the picture. Cool grey and grey-brown rock
with pale sunlit faces lit from the upper left and deep blue-grey shadowed
faces, dark crevices, patches of dark green moss in the hollows between the
peaks. Around the whole foot: grey scree slopes, big mossy boulders, a few
small dark fir trees and ferns, the edge soft and irregular. Much wider than
tall.
```

<!-- plik: bagno-gora-8.png | styl: obiekt | proporcje: 3:2 -->
```
A mountain chain for a swampland adventure map, seen from high above at a
steep three-quarter top-down angle like the mountain ranges on a Heroes of
Might and Magic 3 adventure map: a long diagonal band of many sharp rocky
peaks packed shoulder to shoulder in several overlapping rows, the highest and
thickest part on the left, thinning to a few lower crags and a spur of
boulders on the right, so it reads as one continuous range, never separate
cones. Cool grey and grey-brown rock with pale sunlit faces lit from the upper
left, deep blue-grey shadows, dark crevices, dark green moss in the gullies, a
small white waterfall thread in one cleft. Grey scree, mossy boulders, a few
dark fir trees and ferns along the soft irregular foot. Much wider than tall.
```

<!-- plik: bagno-gora-9.png | styl: obiekt | proporcje: 3:2 -->
```
The end of a mountain range for a swampland adventure map, seen from high
above at a steep three-quarter top-down angle like on a Heroes of Might and
Magic 3 adventure map: a compact knot of seven or eight sharp rocky peaks
crowded together in overlapping rows, highest at the back left, stepping down
to the front right into a skirt of rocky foothills, grey scree and big mossy
boulders. Cool grey and grey-brown rock with pale sunlit faces lit from the
upper left, deep blue-grey shadows, dark crevices, dark green moss in the
hollows, two or three small dark fir trees and ferns at the soft irregular
foot. Wider than tall, one solid mass.
```

<!-- plik: bagno-sad.png | styl: obiekt -->
```
A small cranberry bog farm for a swampland adventure map, seen from above at a
three-quarter angle like a resource building in Heroes of Might and Magic 3: a
rectangular flooded bog bed with dark peaty water almost completely covered by
a carpet of floating deep crimson cranberries, framed by low weathered wooden
plank boardwalks on two sides, a tiny thatched reed-roofed picker's shed on
stilts at the back corner, a wooden hand rake leaning against it, one small
wooden barrel, clumps of reeds and cattails at the corners. Compact, reads as
"a berry farm in the swamp" from far away. Soft painted shading and highlights.
Wider than tall.
```

Druga próba sadu (pierwsza: równa skrzynia pomidorów — z daleka ta sama
czerwona skrzynka co stos pokeballi):

<!-- plik: bagno-sad-2.png | styl: obiekt -->
```
A swamp berry-picker's homestead for a fantasy adventure map, painted in the
soft, colourful hand-painted style of Heroes of Might and Magic 3 map objects,
seen from above at a three-quarter angle: a small crooked hut on wooden stilts
with a mossy green reed-thatched roof and a round window, standing at the edge
of an irregular little bog pond, a short plank jetty over the dark water, and
around it three lush dark green bilberry and cranberry bushes dotted with small
red and dark blue berries, one woven wicker basket on the jetty, cattails and
reeds at the water's edge. Organic irregular shapes, no straight boxes. Mostly
green, brown and dark water, with only small touches of red. Wider than tall.
```

Lewy dolny róg kadru — `bagno-gora-8` wyszła za zielona (z daleka omszały
pagórek, nie skały); zamiast niej drugi zwarty masyw w skali `bagno-gora-7`:

<!-- plik: bagno-gora-10.png | styl: obiekt | proporcje: 3:2 -->
```
A dense rocky mountain massif for a swampland adventure map, seen from high
above at a steep three-quarter top-down angle exactly like the mountains on a
Heroes of Might and Magic 3 adventure map: a crowded cluster of about ten
sharp jagged rock peaks in three overlapping rows receding into depth, the
tallest and thickest group at the back left, the peaks getting lower toward
the front right where the massif ends in a spur of broken crags and big
boulders. All joined by jagged ridgelines into one solid impassable mass.
Cool grey and grey-brown rock with pale sunlit faces lit from the upper left,
deep blue-grey shadowed faces, dark crevices, only small patches of dark green
moss in the hollows. Grey scree, mossy boulders, two small dark fir trees and
ferns along the soft irregular foot. Much wider than tall.
```

## 20. Twierdza — zimowy trakt z koleinami (runda 7, wzorzec HotA)

Werdykt rundy 6: „drogi to płaskie beżowe pasy o jednolitej szerokości, bez
krawędzi, kolein i przejścia w śnieg — narysowane na wierzchu obrazka".
Trakt dostaje własną teksturę ubitej, zmarzniętej ziemi przyprószonej śniegiem
(`TEKSTURY = {'sciezka': ['droga-snieg', …]}` w `tools/mapy/twierdza.py`);
kręty kształt, koleiny i śnieżne obrzeże maluje `teren_efekty`.

| Plik (tools/wsad/) | Trafia do | Wysokość |
|---|---|---|
| `teren-droga-snieg.png` | `public/mapa/teren/` (kopiowany ręcznie, zmniejszony do 768) | tekstura 768 |

<!-- plik: teren-droga-snieg.png | styl: teren -->
```
The ground is a frozen, well-trodden winter dirt road surface seen from above:
packed cold dark-brown earth mixed with grey slush, fine grey gravel and many
small pebbles, a few flat grey stones pressed into the frozen soil, small
patches of dirty trampled snow and thin white frost in the cracks, tiny hoof
and boot prints. Cool muted palette: umber brown, slate grey, touches of
white. The surface fills the WHOLE picture evenly with no direction, no edges,
no verge, no grass, no clean white snow areas larger than a pebble cluster.
```

## 21. Twierdza — zaspy przy podstawach budowli (runda 8, wzorzec HotA)

Werdykt rundy 7: „wiatrak, chata nad jeziorem i chatka na dole wiszą na
śniegu jak naklejki — bez zaspy przy podstawie". Scena sadzi przy podstawie
każdej kopalni i zamku kilka sprite'ów `m-krzak`/`m-krzak-2`
(`zaroslaPrzyPodstawie`); w zestawie `zima` były to krzaki na śnieżnym
kopczyku z ciemnym, sinym spodem — pod budynkiem czytały się jak skalna
półka z kamieniami. Zamiast nich miękkie zaspy nawiane pod ściany, z kilkoma
suchymi źdźbłami: podstawa budowli ginie w śniegu, a nie stoi na podstawce.
Po wygenerowaniu kopiowane ręcznie do `tools/wsad/zima-krzak.png`
i `zima-krzak-2.png` (wysokość 84, `wsad_wczytaj.py`).

<!-- plik: zima-zaspa-krzak.png -->
```
A soft wind-blown snow drift, low and wide, like snow piled against the foot
of a wall: smooth rounded white snow with a gentle curling crest on top, cool
pale blue shading on the lower right side, a few thin dry golden-brown grass
stalks and two or three bare twig tips poking out of the snow. Pure white and
pale blue snow only, no dark rocks, no dark outline, no dark underside, no
green. About twice as wide as tall.
```

<!-- plik: zima-zaspa-krzak-2.png -->
```
A small cluster of two soft rounded snow drifts side by side, low and wide,
freshly fallen snow heaped up by the wind, smooth white with delicate pale
blue shading on the lower right, sparkle of frost on top, a single small dry
tuft of straw-coloured grass sticking out between them. Pure white and pale
blue snow only, no dark rocks, no dark outline, no dark underside, no green.
About two and a half times as wide as tall.
```

## 22. Bagna — mokradła w pierwszym ekranie (runda 11, wzorzec HotA)

Werdykt zwycięzcy rundy 10: „nic nie przypomina bagna — stawy małe, brak
trzcin, błota i mokradeł, prawie jednolita zieleń". Pierwszy ekran dostaje
płachty mokradła malowane w tle (`DOMALUJ` w `tools/mapy/bagna.py`): grunt
z tekstury `teren-mokradlo` o ostrym, nieregularnym brzegu, oczka mętnej
wody, a na nich te naklejki — większe niż dawne kępki z §8, bo w kamerze
32 px na pole tamte znikały. Nie idą przez `wsad_wczytaj.py`: obiera je
i skaluje `bagna.py` (`NAKLEJKI_MOKRADLA`) do `public/mapa/bagno/tlo-*.png`.

<!-- plik: teren-mokradlo.png | styl: teren -->
```
The ground is a wet marsh meadow seen straight from above: soft mossy
olive-green and yellow-green sedge ground, covered with many irregular
shallow puddles of murky olive-brown standing water with a faint sky sheen,
each puddle with a thin wet darker rim and a lighter muddy edge, little
floating duckweed specks, tufts of coarse sedge and a few tiny reeds between
the puddles. Puddles of very different sizes, from small to large, never in a
grid. Bright, clean, friendly colours, not dark or gloomy.
```

<!-- plik: bagno-trzcinowisko-1.png | styl: obiekt | proporcje: 3:2 -->
```
A wide dense bed of marsh reeds and cattails, the kind that grows along the
shore of a swamp pond on a Heroes of Might and Magic 3 adventure map, seen
from above at a three-quarter angle: dozens of tall thin olive-green and
straw-yellow reed stalks of different heights packed together, eight or ten
brown velvety cattail heads, some blades bent and crossing, a few broad sedge
leaves at the front, the base disappearing into shallow water. Much wider than
tall, about three times as wide as tall, soft irregular silhouette.
```

<!-- plik: bagno-trzcinowisko-2.png | styl: obiekt | proporcje: 3:2 -->
```
A low wide belt of swamp rushes and sedge growing out of shallow water, seen
from above at a three-quarter angle like vegetation on a Heroes of Might and
Magic 3 adventure map: a mix of bright green rushes, yellow-green sedge
tussocks and a few purple-blue marsh iris flowers, three brown cattail heads
on the left, two round lily pads with a white flower at the front edge. Much
wider than tall, about three times as wide as tall, soft irregular silhouette.
```

<!-- plik: bagno-martwe-drzewo-3.png | styl: obiekt -->
```
A large dead swamp tree for a children's fantasy adventure map: a thick
gnarled grey-brown trunk leaning slightly, split at the top into three twisted
bare branches reaching up like crooked fingers, long strands of grey-green
hanging moss dripping from the branches, a hollow knot in the trunk, big
exposed arching roots at the bottom standing in a small patch of dark water
with a few reeds. Eerie but friendly, soft painted shading, taller than wide.
```

<!-- plik: bagno-powalony-pien.png | styl: obiekt | proporcje: 3:2 -->
```
A long fallen tree trunk lying on the ground in a swamp, seen from above at a
three-quarter angle like a map decoration on a Heroes of Might and Magic 3
adventure map: old dark brown bark covered with thick bright green moss on
top, a tangle of torn-out roots at the left end, a broken jagged end at the
right, two small shelf mushrooms and a few ferns growing on it, a little
murky water and reeds around its middle. Low and long, about three times as
wide as tall.
```

## 23. Bagna — szuwary i grążele na oczkach mokradła (runda 12, wzorzec HotA)

Werdykt rundy 11: „rozlewiska to blade, zamazane plamy bez wody, błota
i szuwarów". Oczka mokradła maluje teraz `DOMALUJ` (`tools/mapy/bagna.py`)
jako ciemną, mętną toń z ostrym brzegiem i pasem błota; te naklejki stoją na
ich brzegach i taflach. Jedno `trzcinowisko-1` powtórzone kilkanaście razy
czytało się jak stempel, a kępy z §8 i `trzcinowisko-2` mają z API okrągłą
podstawkę (talerzyk wody lub ziemi pod kępą). Tu każda kępa BEZ podstawki.
Obiera i skaluje je `bagna.przygotuj_naklejki_mokradla()`.

<!-- plik: bagno-szuwar-1.png | styl: obiekt -->
```
A single tall clump of fresh green bulrushes growing in a swamp, seen from
above at a three-quarter angle like vegetation on a Heroes of Might and Magic
3 adventure map: about fifteen long slender bright green and olive-green
leaves and stalks fanning upward and outward, four dark brown velvety cattail
heads on thin stems at different heights, a couple of blades bent over. The
stalks simply end at the bottom in a small tight point, with NO ground, NO
water, NO mud patch and NO shadow under them. Taller than wide.
```

<!-- plik: bagno-szuwar-2.png | styl: obiekt | proporcje: 3:2 -->
```
A low, wide tussock of marsh sedge grass seen from above at a three-quarter
angle like vegetation on a Heroes of Might and Magic 3 adventure map: dense
arching blades of yellow-green, olive and a few straw-coloured sedge leaves
spilling outward in all directions like a fountain, a few thin green rushes
poking up from the middle, three small yellow marsh marigold flowers at the
front. NO ground, NO water, NO mud patch and NO shadow under it — only the
plant. About twice as wide as tall, soft irregular silhouette.
```

<!-- plik: bagno-grazele.png | styl: obiekt | proporcje: 3:2 -->
```
A small floating group of water lily pads seen almost straight from above,
like decoration on the water of a Heroes of Might and Magic 3 adventure map:
five round glossy dark green lily pads of different sizes, each with the
typical narrow notch, overlapping a little, one pad slightly curled at the
edge showing a reddish underside, one open white water lily flower with a
yellow centre and one closed pink bud. Only the pads and flowers, NO water
surface around them, NO ripples, NO shadow. Wider than tall, flat.
```

<!-- plik: bagno-szuwar-3.png | styl: obiekt | proporcje: 3:2 -->
```
A wide low bank of mixed swamp plants seen from above at a three-quarter
angle like vegetation on a Heroes of Might and Magic 3 adventure map: on the
left a few tall green reeds with two brown cattail heads, in the middle a
clump of broad bright green arrowhead leaves, on the right a tuft of fine
yellow-green sedge and two purple marsh iris flowers. The plants end at the
bottom in a ragged line of stems, with NO ground, NO water, NO mud patch and
NO shadow under them. About twice as wide as tall.
```

Środek dolnej krawędzi kadru — werdykt rundy 11: „góry w lewym dolnym rogu
i na środku dolnej krawędzi to powielone, identyczne stożki wstawione jak
stemple" (`gora-9` i `gora-10` to ten sam kłąb szarych szpiców). Tu inna
bryła: skalny próg z półkami i urwiskami, wyrastający z mokradła.

<!-- plik: bagno-gora-11.png | styl: obiekt | proporcje: 3:2 -->
```
A broad rocky outcrop rising out of a swamp, for a swampland adventure map,
seen from high above at a steep three-quarter top-down angle exactly like the
rock formations on a Heroes of Might and Magic 3 adventure map: NOT pointed
cone peaks, but a wide heavy mass of layered dark grey-brown rock with flat
mossy tops, stepped ledges and short vertical cliffs, split by a deep cleft in
the middle where a thin white waterfall drops into a small dark pool at the
foot. Three or four dead grey swamp trees with bare twisted branches and
hanging moss stand on the ledges. Rock lit from the upper left, cool blue-grey
shadows, thick dark green moss on every ledge. Around the whole foot: a skirt
of grey scree and tumbled mossy boulders sinking into reeds, cattails and
patches of murky water, the edge soft and irregular. Much wider than tall.
```

## 24. Twierdza — stosy surowców wtopione w śnieg (runda 10, wzorzec HotA)

Werdykt rundy 9: „zasoby i stwory, np. fioletowe kryształy przy drodze pod
wiatrakiem, to malutkie płaskie naklejki bez osadzenia w podłożu, w innej
skali niż szczegółowy zamek". Stare stosy (§10) miały śnieżny płat, który
`wtopPodstawe` rozpuszczał w przezroczystość — rysunek wisiał nad własnym
cieniem, a „kamień ewolucji" był fioletową watą. Nowe: bogatszy rysunek
w skali budowli, stos WCIŚNIĘTY w zaspę (śnieg zachodzi na dół przedmiotów
i leży na nich), bez osobnej podstawki. Po obejrzeniu kopiowane ręcznie
do `tools/wsad/zima-stos-<nazwa>.png` (wysokość 72, `wsad_wczytaj.py`).

<!-- plik: zima-stos2-kamien-ewolucji.png -->
```
A cluster of six tall faceted violet amethyst crystals of different sizes
growing out of a small grey rock half buried in snow, the crystals angled
outward like a gem geode, crisp facets with bright lilac highlights and a
soft inner violet glow, snow lying on the rock and heaped around the base so
the lower ends of the crystals disappear into the snow drift, a few tiny
violet shards scattered in the snow. Detailed painted game object in the
same scale and richness as a fantasy building, soft shading. About as wide
as tall, compact.
```

<!-- plik: zima-stos2-odlamki.png -->
```
A heap of pale icy-blue crystal shards of different sizes jutting at angles
out of a small snow drift, with a small wooden sack tipped over beside them
spilling more small shards, crisp facets with bright white highlights and a
soft cyan inner glow, the snow drift wraps around the base so the shards
sink into it, frost sparkle on top. Detailed painted game object, soft
shading. Wider than tall, compact.
```

<!-- plik: zima-stos2-pokeball.png -->
```
A small open wooden crate sunk into a snow drift and overflowing with
red-and-white capture balls (red top half, white bottom half, dark band with
a small round white button), three more balls lying half buried in the snow
in front of it, snow caps on the crate edges and on the balls, the drift
covers the bottom of the crate. Detailed painted game object, glossy
highlights, soft shading. Wider than tall, compact.
```

<!-- plik: zima-stos2-jagody.png -->
```
A small woven wicker basket tipped on its side and half buried in a snow
drift, spilling a heap of glossy dark red frozen berries across the snow,
a sprig of dark evergreen twigs beside it, frost and snow caps on the basket
rim and on the berries, the drift covers the bottom of the basket. Detailed
painted game object, bright highlights, soft shading. Wider than tall,
compact.
```
