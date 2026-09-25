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
A bare deciduous tree in deep winter: no leaves at all, a thick grey-brown
trunk and a wide crown of bare twisting branches, each branch outlined with a
thin line of snow, a few dried brown leaves still clinging. Wide crown.
```

<!-- plik: zima-drzewo-b.png -->
```
A bare winter birch with a white-and-black bark trunk, thin drooping bare
branches dusted with snow and hoarfrost, delicate and silvery. Wide crown.
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
A cluster of big snow-capped boulders and a small crag, heavy snow pillows,
scattered small rocks around, wider than tall.
```

<!-- plik: zima-kepa-skaly-4.png -->
```
A low broad rocky outcrop half buried in snow, flat snowy tops, dark rock
visible on the steep sides, wider than tall.
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
