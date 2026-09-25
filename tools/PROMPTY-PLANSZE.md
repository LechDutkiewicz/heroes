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

<!-- plik: zima-kepa-las-1.png -->
```
A dense grove of six to eight snow-laden pine and spruce trees of different
heights growing close together, seen from a slightly elevated angle, white
snow shelves on every branch, blue shadows between the trees. Reads as a
single impassable block of winter forest. Wider than tall.
```

<!-- plik: zima-kepa-las-2.png -->
```
A winter forest clump mixing snowy spruces with two bare snow-dusted
deciduous trees, compact, wider than tall, reads as one block of forest.
```

<!-- plik: zima-kepa-las-3.png -->
```
A tight cluster of young snowy firs and one tall old pine, snow drifted
between the trunks, wider than tall.
```

<!-- plik: zima-kepa-las-4.png -->
```
A low wide belt of snow-covered conifers of even height, like the edge of a
northern forest, wider than tall.
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

<!-- plik: bagno-krzak.png -->
```
A low round swamp shrub of dark olive leaves with a few pale yellow flowers,
sedge blades sticking out at the base. Low and round.
```

<!-- plik: bagno-krzak-2.png -->
```
A low clump of ferns and horsetails, dark green, wet shiny leaves. Low and round.
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
A segment of a mossy swamp hill range in the style of Heroes of Might and
Magic 2: two rounded hills covered in deep green moss and short marsh grass,
steep dark brown peat-and-earth cliffs and ravines cut into the slopes, sharp
ridge lines running down from each top, a small crooked willow and a few
cattails in the folds. Lit from the upper left: bright yellow-green sunlit
slopes on the left, deep olive and brown shadowed folds on the right. Clearly
an impassable hill, not a pile of boulders. Wider than tall; the foot of the
hill spreads across the whole width of the picture so that pieces placed side
by side join into one continuous range.
```

<!-- plik: bagno-kepa-skaly-2.png | styl: obiekt | proporcje: 3:2 -->
```
A long mossy ridge above a swamp in the style of Heroes of Might and Magic 2:
one high green crest with a saddle and a smaller second hump, grey-green
mossy rock ledges and vertical brown gullies on the steep faces, one bare
dead tree on the crest, moss hanging over the ledges. Strong sculpted relief
lit from the upper left: bright slopes on the left, deep olive-brown shadow
folds on the right. Wider than tall; the foot spreads across the whole width
of the picture.
```

<!-- plik: bagno-kepa-skaly-3.png | styl: obiekt | proporcje: 3:2 -->
```
A broad massive mossy hill in the style of Heroes of Might and Magic 2: one
big rounded summit overgrown with dark green moss and marsh grass, the whole
front face cut by many parallel dark brown peat gullies and ridges running
down the slope like folds of cloth, a tiny waterfall trickling down one
gully, a few cattails at the foot. Lit from the upper left, shadows on the
right. One solid landform, no separate spires or loose rocks. Wider than tall;
the foot spreads across the whole width of the picture.
```

<!-- plik: bagno-kepa-skaly-4.png | styl: obiekt | proporcje: 3:2 -->
```
Low broad mossy foothills in the style of Heroes of Might and Magic 2: three
soft knolls covered in moss and marsh grass packed together, dark brown earth
scarps and mossy grey outcrops breaking the slopes, a couple of small dark
green bushes and a willow sapling in the hollows. Lit from the upper left.
Reads as foothills of a hill chain, clearly impassable. Wider than tall; the
foot spreads across the whole width of the picture.
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
