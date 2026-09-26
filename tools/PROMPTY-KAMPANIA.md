# Prompty do grafik: ekran kampanii

Ekran kampanii (`src/scenes/KampaniaScene.ts`) to nasz odpowiednik ekranu
„The Succession Wars" z Heroes 2: malowana mapa krainy z czterema misjami,
zwój z opisem misji, trzy nagrody do wyboru, a przed tym wybór trenera
i wstęp opowieści. Wzorzec jest w całości MALOWANY — Heroes 2 nie ma na tym
ekranie ani jednego prostokąta z arkusza stylów — więc i tutaj wszystko, co
niesie klimat (mapa, portrety, ilustracje wstępu i zakończenia, zwój), idzie
z modelu graficznego, a rysowany w kodzie jest tylko interfejs: znaczniki
misji, ścieżka, przyciski i karty nagród.

Droga do gry: `python3 tools/generuj_grafiki.py <plik>` zapisuje do
`tools/wsad/`, stamtąd plik trafia do `public/kampania/` pod nazwę, którą czyta
scena (`mapa.jpg`, `zwoj.png`, `janek.png`, `ela.png`).

**Stan na 2026-09-25: wszystkie sześć grafik jest wygenerowanych (OpenAI)**
i leży w `tools/wsad/kampania-*.png`. Do gry wpina je
`python3 tools/kampania_ilustracje.py`: przycina wstęp i zakończenie do
proporcji ekranu (`wstep.jpg`, `koniec.jpg`), portrety do kart
(`portret-janek.jpg`, `portret-ela.jpg`), mapę do okna 4:3 (`mapa.jpg`,
połysk wody `woda-a/b.png`, droga `mapa.json`) i wycina magentę ze zwoju
(`zwoj.png`). Punkty misji zostały przepisane pod ilustrację: skrypt trzyma je
w pikselach obrazka i pilnuje, żeby `naMapie` w `src/data/kampania.ts` się
z nimi zgadzało i żeby pod znacznikiem i tabliczką było spokojne tło.
Figurki trenerów (`janek.png`, `ela.png`) zostają — stoją na mapie przy
bieżącej misji i w scenie wyniku.

## Zasady wspólne

1. **Żadnych liter.** Model chętnie podpisuje krainy i dorysowuje kartusze
   z napisami — zawsze krzywymi i zawsze po angielsku. Nazwy misji stawia
   scena, na wstążkach, po polsku.
2. **Ta sama kreska co mapa przygody.** Plansza gry jest malowana miękko,
   „bajkowo", z nasyconą zielenią i ciepłym światłem; ilustracja w innym
   stylu (akwarela, piksele, realizm) wyglądałaby na pożyczoną z innej gry.
3. **Miejsca na znaczniki zostają puste.** Na mapie krainy w czterech
   punktach stoją znaczniki misji. Prompt opisuje, co tam ma być (polana,
   przełęcz, bagno, twierdze), ale prosi o spokojny, jasny grunt dokładnie
   w tym miejscu — znacznik na tle gęstego lasu przestaje być widoczny.

### Blok stylu

<!-- styl: kampania -->
```
Hand-painted storybook illustration for a children's fantasy strategy game in
the spirit of Heroes of Might and Magic, with cute creature-collecting
adventure mood. Soft painterly brushwork, smooth edges, rich saturated but warm
palette (emerald greens, golden sunlight, sky blues, warm browns), gentle
lighting from the upper right, clean readable shapes. Absolutely no text, no
letters, no numbers, no labels, no signatures, no watermark, no UI elements,
no border or frame around the picture.
```

---

## 1. Mapa krainy

Najważniejsza grafika ekranu. Cztery misje stoją w czterech krainach
i kolejność misji ma być widoczna w samym krajobrazie: od słonecznej polany
na dole po lewej, przez góry w środku, bagna na prawo w dole, do ciemnych
twierdz na północnym wschodzie. Dziecko ma zobaczyć „idę z domu coraz dalej
w groźniejsze miejsca", zanim przeczyta choć jedno słowo.

Rzeka i jezioro są na mapie celowo: woda to jedyne miejsce, gdzie scena może
dołożyć ruch (lśnienie) bez przemalowywania ilustracji.

<!-- plik: kampania-mapa.png | styl: kampania | proporcje: 4:3 -->
```
A complete illustrated fantasy realm map seen from high above at a gentle
oblique angle, like a painted campaign map in a storybook, filling the whole
image edge to edge. The land is divided into clearly different regions:

- Bottom left: a sunny bright green meadow with flowers and a few round trees,
  and a small wooden palisade fort with a red-roofed tower standing on the
  open grass.
- Top left and left edge: a dense emerald-green forest of round and pointed
  trees, cosy and friendly.
- Centre: a range of grey-blue mountains with snowy tips, split by two green
  valleys, with a narrow mountain pass guarded by a small stone watchtower;
  a softly glowing cave mouth in the rock face.
- Bottom right: a misty turquoise swamp with dark still pools, reeds, lily
  pads, crooked willow trees and small wooden walkways.
- Top right: dark rocky highlands under a slightly purple twilight sky,
  with two small silver-blue castles with pointed towers and a pale glowing
  crescent-moon crystal between them.
- A winding blue river runs from the central mountains down across the map
  into a round lake near the bottom centre; a dirt road winds from the meadow
  towards the mountains.

Each region has a calm open clearing of plain ground (grass, earth or rock)
large enough for a game marker, so markers placed on top stay readable.
Mood: an inviting adventure, bright in the south-west, growing more mysterious
towards the north-east. No text anywhere, no compass letters, no labels.
```

## 2. Portrety trenerów

Wybór trenera to odpowiednik wyboru strony (Roland / Archibald) z Heroes 2 —
tam dwa wielkie portrety w złotych ramach. Nasze muszą się zgadzać
z figurkami z mapy przygody (`public/mapa/bohater.png`,
`public/mapa/bohaterka.png`), bo dziecko wybiera TEGO, kim potem chodzi.

<!-- plik: kampania-janek.png | styl: kampania | proporcje: 3:4 -->
```
Portrait from the waist up of a cheerful 10-year-old boy, a young creature
trainer, facing the viewer at a slight three-quarter angle, confident friendly
grin, one hand giving a thumbs up. He wears a red-and-white baseball cap with
a plain white circle on the front (no letters), messy brown hair sticking out,
a blue short-sleeved jacket over a white t-shirt, a brown shoulder bag strap
across his chest. Behind him a soft sunny emerald forest clearing with warm
golden light and gentle bokeh. Painted character art, big expressive eyes,
same storybook style as a children's adventure game.
```

<!-- plik: kampania-ela.png | styl: kampania | proporcje: 3:4 -->
```
Portrait from the waist up of a brave 10-year-old girl, a young creature
trainer, facing the viewer at a slight three-quarter angle, determined warm
smile. She has short black bob hair and wears a green newsboy cap, a white
long-sleeved shirt under a teal-green vest, a brown leather satchel strap
across her chest. She holds a small red-and-white capture ball in one hand.
Behind her a soft sunny emerald forest clearing with warm golden light and
gentle bokeh. Painted character art, big expressive eyes, same storybook style
as a children's adventure game.
```

## 3. Wstęp i zakończenie

Heroes 2 otwiera kampanię filmikiem, my — jedną ilustracją pod tekstem
wstępu. Zakończenie jest jej lustrem: to samo miejsce, dzień zamiast nocy.

<!-- plik: kampania-wstep.png | styl: kampania | proporcje: 16:9 -->
```
A moonlit night scene at the edge of an emerald forest. In the distance a
mountain with a cave entrance glowing with pale silver-blue moonlight. On a
path leading towards the cave walk three mysterious figures in long hooded
silver cloaks, leading away a few small cute worried round creatures in a
wooden cart with a net over it. In the foreground on the left, half hidden by
ferns, an old kind forest guardian with a long white beard, a green hood and
a wooden staff with a small lantern watches them, worried. Blue night palette
with warm lantern light accents, magical but not scary, suitable for young
children.
```

<!-- plik: kampania-koniec.png | styl: kampania | proporcje: 16:9 -->
```
A joyful sunrise scene at the edge of an emerald forest. Dozens of small cute
colourful round creatures run and hop happily back into the forest, some
jumping in the air. In the distance a mountain with a peaceful cave entrance
under a fading pale moon in the morning sky. In the foreground an old kind
forest guardian with a long white beard, a green hood and a wooden staff with
a lantern smiles and waves. Warm golden morning light, flower petals in the
air, celebration mood, suitable for young children.
```

## 4. Zwój misji

Opis misji w Heroes 2 leży na pergaminie; nasz leżał na mlecznym panelu
z bitwy i przy malowanej mapie wyglądał jak okienko z innej aplikacji.
Zwój jest pusty — tekst kładzie scena.

<!-- plik: kampania-zwoj.png | styl: brak | proporcje: 9:16 -->
```
Game UI asset: a single blank vertical parchment scroll, hand-painted storybook
style. Warm cream-beige aged paper with soft mottled texture, slightly darker
burnt edges, rolled wooden-and-paper cylinders at the top and at the bottom
with small golden end caps. The paper area is completely empty and evenly lit,
no writing, no drawings, no stains in the middle. Scroll facing the viewer,
perfectly upright, centred, filling most of the frame height.
Background: a single FLAT, UNIFORM magenta fill, RGB 255,0,255, edge to edge,
with no gradient, no shadow and no checkerboard pattern. Nothing in the scroll
may be magenta or pink.
```

## 5. Ikony celów i nagród

Zwój misji ma wiersze celów („Cel misji", „Uważaj", „Czas", „… zabiera ze
sobą"), a pod mapą trzy karty nagród. Ikony wierszy były naklejkami
rysowanymi w kodzie (`src/visual/icons.ts`: gwiazda, czaszka, klepsydra,
zakładka), a miecz, tarcza z łusek i rower w nagrodach — gradientami w PIL
(`kampania_postacie.py`). Obok malowanych jagód, kryształów i butów wyglądały
jak z innej gry. Teraz wszystkie są malowane tą samą ręką co ikony surowców.

Styl `obiekt` (z `PROMPTY-MAPA-2.md`) daje prawdziwą alfę; prompt ikony
dopowiada, że to ikona interfejsu, a nie obiekt mapy. Do gry wpina je
`python3 tools/kampania_ikony.py` (ten sam ciemny obrys i kadr 128 px co
reszta ikon, `gotowa()` z `kampania_postacie.py`). Na ekranie mają 22–50 px,
więc liczy się gruba, prosta sylwetka, nie szczegół.

| Plik wsadu | W grze | Gdzie |
|---|---|---|
| `ikona-gwiazda.png` | `public/kampania/ikona-gwiazda.png` | „Cel misji", „Wynik", gwiazdki kroniki |
| `ikona-czaszka.png` | `…/ikona-czaszka.png` | „Uważaj" (utrata zamków) |
| `ikona-klepsydra.png` | `…/ikona-klepsydra.png` | „Czas", dni w drodze na belce |
| `ikona-sakwa.png` | `…/ikona-sakwa.png` | „… zabiera ze sobą" (artefakty z poprzedniej misji) |
| `ikona-miecz.png` | `…/ikona-miecz.png` | nagroda „Silniejszy atak" |
| `ikona-tarcza.png` | `…/ikona-tarcza.png` | nagroda „Mocniejsza obrona", Tarcza z Łusek |
| `ikona-rower.png` | `…/ikona-rower.png` | Rower Terenowy |

<!-- plik: ikona-gwiazda.png | styl: obiekt | proporcje: 1:1 -->
```
Game UI icon, not a map object and not a building: the ONLY thing in the image
is one plump five-pointed star shape (like a reward star in a mobile game), with
softly rounded tips, seen straight from the front, centered and filling the
square frame. No tower, no house, no scenery. Glossy polished gold, warm yellow on top shading to deep orange-amber at
the bottom edges, a soft bevel along each arm and one small white highlight in
the upper left. Chunky, bold, simple silhouette that stays readable at 20
pixels, painted in the same soft storybook way as glossy red berries and
purple crystals. No face, no sparkles around it, no rays.
```

<!-- plik: ikona-czaszka.png | styl: obiekt | proporcje: 1:1 -->
```
Game UI icon, not a map object: a single cartoon skull for a children's game,
seen from the front, centered and filling the square frame. Rounded, friendly
rather than scary: big round dark-brown eye sockets, a small upside-down heart
shaped nose hole, a short row of square teeth, one tiny crack on the forehead.
Warm ivory bone colour with soft beige-grey shading and a creamy highlight on
the top of the dome. Chunky, bold, simple silhouette that stays readable at 20
pixels. No crossbones, no blood, no fire, no glow.
```

<!-- plik: ikona-klepsydra.png | styl: obiekt | proporcje: 1:1 -->
```
Game UI icon, not a map object: a single hourglass standing upright, seen from
the front, centered and filling the square frame. Chunky frame of warm brown
turned wood with round golden caps on top and bottom and two thick wooden
posts at the sides. Two plump glass bulbs with a light blue glassy sheen, a
little golden sand left in the upper bulb, a thin stream falling and a larger
golden heap in the lower bulb. Bold, simple silhouette that stays readable at
20 pixels, painted soft storybook style with glossy highlights.
```

<!-- plik: ikona-sakwa.png | styl: obiekt | proporcje: 1:1 -->
```
Game UI icon, not a map object: a single adventurer's leather satchel, seen
from the front at a slight angle, centered and filling the square frame. Plump
rounded bag of warm brown leather with a big front flap, one shiny golden
buckle, visible stitching and a short strap loop on top, slightly bulging as if
full of treasures. Chunky, bold, simple silhouette that stays readable at 20
pixels, painted soft storybook style with glossy highlights. Nothing sticking
out of the bag.
```

<!-- plik: ikona-miecz.png | styl: obiekt | proporcje: 1:1 -->
```
Game UI icon, not a map object: a single short broad sword lying diagonally,
point to the upper right, pommel to the lower left, centered and filling the
square frame. Wide polished steel blade with a bright bevel line and a cool
blue-white shine, a thick curved golden crossguard, a grip wrapped in brown
leather and a round golden pommel with a small red gem. Chunky, bold, simple
silhouette that stays readable at 24 pixels, painted soft storybook style with
glossy highlights. No sparkles, no motion lines. The sword floats alone: no
background tile, no square card, no parchment, no frame behind it.
```

<!-- plik: ikona-tarcza.png | styl: obiekt | proporcje: 1:1 -->
```
Game UI icon, not a map object: a single heater shield seen from the front,
centered and filling the square frame. The face of the shield is covered with
overlapping rounded teal-green dragon scales, each scale with a light rim and a
darker base, framed by a thick polished golden rim with a few round rivets and
a small golden boss in the upper middle. Chunky, bold, simple silhouette that
stays readable at 24 pixels, painted soft storybook style with glossy
highlights. No emblem, no letters.
```

<!-- plik: ikona-rower.png | styl: obiekt | proporcje: 1:1 -->
```
Game UI icon, not a map object: a single sturdy children's mountain bike seen
exactly from the side, facing right, centered and filling the square frame.
Thick knobbly dark tyres, bright red chunky frame with a golden stripe, a brown
leather saddle, black handlebars with brown grips, a small silver bell and a
simple chain ring. Wheels big and round with only a few thick spokes. Chunky,
bold, simple silhouette that stays readable at 24 pixels, painted soft
storybook style with glossy highlights. No rider, no ground.
```
