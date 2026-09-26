# Prompty do grafik: ekran bohatera (umiejętności i artefakty)

Ekran bohatera (`src/scenes/HeroScene.ts`) pokazywał umiejętności
drugorzędne samym tekstem, a artefakty jako naklejki rysowane w kodzie
(`src/visual/artefakty.ts`). Obok malowanego portretu i ikon z kampanii
wyglądały jak z innej gry. W Heroes 3 obie rzeczy to małe, malowane
obrazki: umiejętność w kwadratowej ramce 44 × 44, artefakt w gnieździe lalki.

Ta sama ręka co ikony kampanii (`PROMPTY-KAMPANIA.md`, rozdział 5): styl
`obiekt` z `PROMPTY-MAPA-2.md` (prawdziwa alfa), prompt dopowiada, że to
ikona interfejsu. Ramkę kwadratu rysuje scena — na obrazku ma być sam
przedmiot, bez kafla i bez tła. Na ekranie 40–56 px, więc gruba, prosta
sylwetka i jeden czytelny motyw; każda ikona mówi, co umiejętność ROBI.

Do gry: `python3 tools/bohater_ikony.py` → `public/bohater/umiejetnosc-<id>.png`
i `public/bohater/artefakt-<id>.png` (128 px, ten sam obrys co ikony
kampanii) oraz arkusz kontrolny `tools/blind/ikony-bohater.png` (48 px).

Artefakty, które już mają malowany odpowiednik, NIE są generowane:

| Artefakt | Źródło |
|---|---|
| `buty` — Buty Wędrowca | `public/kampania/ikona-buty.png` |
| `tarcza` — Tarcza z Łusek | `public/kampania/ikona-tarcza.png` |
| `rower` — Rower Terenowy | `public/kampania/ikona-rower.png` |
| `mistrz` — Pas Mistrza Areny | `tools/wsad/relikt-pas.png` (relikt z mapy, tło magenta) |
| `skrzydla` — Skrzydła Latającego | `tools/wsad/relikt-skrzydla.png` (relikt z mapy, tło magenta) |

## 1. Umiejętności drugorzędne

| Plik wsadu | Umiejętność | Co robi → motyw |
|---|---|---|
| `umiejetnosc-zwiad.png` | Zwiad | więcej pól dziennie → drogowskaz ze strzałkami |
| `umiejetnosc-tropiciel.png` | Tropiciel | dalej odsłania mgłę → luneta |
| `umiejetnosc-napastnik.png` | Napastnik | mocniej wręcz → pięść w rękawicy |
| `umiejetnosc-lucznictwo.png` | Łucznictwo | mocniejsi strzelcy → łuk ze strzałą |
| `umiejetnosc-pancerz.png` | Pancerz | mniej obrażeń → hełm rycerski |
| `umiejetnosc-gospodarnosc.png` | Gospodarność | dodatkowe pokeballe → koszyk pokeballi |
| `umiejetnosc-nauka.png` | Nauka | więcej doświadczenia → otwarta księga |
| `umiejetnosc-uzdrowiciel.png` | Uzdrowiciel | polegli wracają → mikstura z sercem |

<!-- plik: umiejetnosc-zwiad.png | styl: obiekt | proporcje: 1:1 -->
```
Game UI icon, not a map object: a single wooden signpost seen from the front,
centered and filling the square frame. One thick brown wooden post with three
chunky arrow-shaped boards pointing in different directions (right, left and
up-right), warm honey-brown planks with darker wood grain and a few round iron
nails, the post top capped with a small golden knob. The boards are blank, no
letters. Chunky, bold, simple silhouette that stays readable at 24 pixels,
painted soft storybook style with glossy highlights. No ground, no grass, no
stones at the foot of the post.
```

<!-- plik: umiejetnosc-tropiciel.png | styl: obiekt | proporcje: 1:1 -->
```
Game UI icon, not a map object: a single extended brass spyglass (pirate
telescope) lying diagonally, eyepiece to the lower left, big lens to the upper
right, centered and filling the square frame. Three polished golden-brass
tubes of growing width with dark brown leather grip bands, the big front lens
a round glassy light-blue disc with a bright white glint. Chunky, bold, simple
silhouette that stays readable at 24 pixels, painted soft storybook style
with glossy highlights. No hand, no background tile, no sparkles.
```

<!-- plik: umiejetnosc-napastnik.png | styl: obiekt | proporcje: 1:1 -->
```
Game UI icon, not a map object and not a building: the ONLY thing in the
image is one clenched fist in a sturdy brown leather fighting glove, seen
from the front as if punching toward the viewer, knuckles forward, centered
and filling the square frame. Thick padded knuckles with a bright red leather
band across them and a golden buckle strap around the wrist. Chunky, bold,
simple silhouette that stays readable at 24 pixels, painted soft storybook
style with glossy highlights. The fist floats alone: no background tile, no
square card, no burst, no frame behind it. No arm beyond the wrist, no
blood, no motion lines.
```

<!-- plik: umiejetnosc-lucznictwo.png | styl: obiekt | proporcje: 1:1 -->
```
Game UI icon, not a map object and not a building: the ONLY thing in the
image is one wooden recurve bow standing upright with an arrow nocked and
drawn, the arrow pointing to the upper right, centered and filling the square
frame, nothing cropped at the edges. Warm polished brown wood bow with a
leather grip wrap and golden tips, a taut thin light string, a straight arrow
with a shiny steel head and red-and-white feather fletching. Chunky, bold,
simple silhouette that stays readable at 24 pixels, painted soft storybook
style with glossy highlights. No castle, no tower, no house, no grass, no
hand, no archer, no target.
```

<!-- plik: umiejetnosc-pancerz.png | styl: obiekt | proporcje: 1:1 -->
```
Game UI icon, not a map object: a single knight's helmet seen from the front
at a slight angle, centered and filling the square frame. Rounded polished
steel helmet with a cool blue-white shine, a closed visor with a few
horizontal eye slits, golden trim along the edges, round golden rivets and a
short red plume on top. Chunky, bold, simple silhouette that stays readable
at 24 pixels, painted soft storybook style with glossy highlights. No face
inside, no head, no stand.
```

<!-- plik: umiejetnosc-gospodarnosc.png | styl: obiekt | proporcje: 1:1 -->
```
Game UI icon, not a map object and not a building: the ONLY thing in the
image is one small round wicker basket, seen from the front at a slight
angle, centered and filling the square frame, heaped full with four shiny
round toy balls: each ball is glossy red on the top half and white on the
bottom half, with a thick black stripe around its middle and a small round
white button in the stripe. Warm golden-brown woven basket with a thick rim
and a curved wicker handle arching over the balls. Chunky, bold, simple
silhouette that stays readable at 24 pixels, painted soft storybook style
with glossy highlights. No house, no roof, no tower, no coins, no ground, no
letters.
```

<!-- plik: umiejetnosc-nauka.png | styl: obiekt | proporcje: 1:1 -->
```
Game UI icon, not a map object: a single thick old book lying open, seen from
the front at a slight downward angle, centered and filling the square frame.
Rich blue leather cover with golden corner pieces, creamy parchment pages
fanning up in a soft curve, a red ribbon bookmark hanging out, and one small
glowing golden star floating just above the open pages. The pages show only
a few faint wavy lines, no readable letters. Chunky, bold, simple silhouette
that stays readable at 24 pixels, painted soft storybook style with glossy
highlights. No desk, no candle.
```

<!-- plik: umiejetnosc-uzdrowiciel.png | styl: obiekt | proporcje: 1:1 -->
```
Game UI icon, not a map object: a single round glass potion bottle seen from
the front, centered and filling the square frame. Plump round flask with a
short neck, a brown cork and a little twine bow, filled with glowing bright
pink-red healing liquid; floating inside the liquid is one plump white heart
shape with a soft glow. Glassy highlights, a bright white glint on the upper
left of the glass. Chunky, bold, simple silhouette that stays readable at 24
pixels, painted soft storybook style. No cross symbol, no label, no bubbles
outside the bottle.
```

## 2. Artefakty (tylko te bez malowanego odpowiednika)

| Plik wsadu | Artefakt | Klasa, efekt |
|---|---|---|
| `artefakt-opaska.png` | Opaska Treningowa | drobny, +1 atak |
| `artefakt-kamizelka.png` | Kamizelka Ochronna | drobny, +1 obrona |
| `artefakt-pazur.png` | Pazur Ostrza | znaczny, +2 atak |
| `artefakt-ksiezycowy-kamien.png` | Księżycowy Kamień | cel misji, +1/+1 |

<!-- plik: artefakt-opaska.png | styl: obiekt | proporcje: 1:1 -->
```
Game UI icon, not a map object: a single red cloth training headband tied in
a loop, seen from the front at a slight angle so the loop looks like a ring,
centered and filling the square frame. Thick bright red fabric band with a
white stripe along it, a chunky knot on the right side with two short tails
fluttering out. Chunky, bold, simple silhouette that stays readable at 24
pixels, painted soft storybook style with glossy highlights. No head, no
letters, no emblem.
```

<!-- plik: artefakt-kamizelka.png | styl: obiekt | proporcje: 1:1 -->
```
Game UI icon, not a map object: a single padded protective vest seen from the
front, centered and filling the square frame. Sleeveless quilted vest of deep
blue cloth with puffy stitched padding squares, reinforced with brown leather
shoulder pads and a brown leather trim, three round golden buttons down the
front. Chunky, bold, simple silhouette that stays readable at 24 pixels,
painted soft storybook style with glossy highlights. No person, no hanger,
no letters.
```

<!-- plik: artefakt-pazur.png | styl: obiekt | proporcje: 1:1 -->
```
Game UI icon, not a map object: a single fighting claw worn on the hand,
seen from the front, centered and filling the square frame: a thick brown
leather knuckle band with golden studs, from which three long curved shiny
steel claws fan out upward, each claw with a bright bevel line and a cool
blue-white shine. Chunky, bold, simple silhouette that stays readable at 24
pixels, painted soft storybook style with glossy highlights. No hand, no arm,
no blood, no sparkles.
```

<!-- plik: artefakt-ksiezycowy-kamien.png | styl: obiekt | proporcje: 1:1 -->
```
Game UI icon, not a map object: a single smooth moonstone, a plump rounded
oval pebble seen from the front, centered and filling the square frame.
Pearly pale lilac and silvery blue translucent stone with a soft milky glow
from inside, and a bright silver-white crescent moon shape shining in its
centre. Set in a thin golden wire cradle with a small loop on top, like a
treasured amulet. Chunky, bold, simple silhouette that stays readable at 24
pixels, painted soft storybook style with glossy highlights. No chain, no
sparkles around it, no crystals.
```

## 3. Postać bohatera na lalce (ekran bohatera, runda 2)

W HoMM3 prawe pole ekranu bohatera to lalka: sylwetka postaci, a gniazda
artefaktów leżą NA niej (głowa, szyja, tułów, ręce, pas, stopy, plecy).
U nas stał tam drugi, wielki portret z kampanii — ta sama twarz co
w medalionie. Tu: ten sam trener w całej postaci, na przezroczystym tle
(tło — ciemne sukno z ramą — rysuje scena, gniazda kładzie na wierzch).
Wzór to portret z kampanii (`images/edits`), więc twarz, czapka i ubranie
zostają te same. Do gry: `python3 tools/bohater_postac.py` →
`public/bohater/postac-<janek|ela>.png`.

<!-- plik: postac-janek.png | styl: kampania | proporcje: 2:3 | wzor: kampania-janek.png -->
```
The same boy from the reference portrait, now shown as a FULL-BODY standing
figure from the top of his cap down to his shoes, whole body inside the frame
with a little empty space above the cap and below the shoes. Standing straight
facing the viewer, symmetrical heroic pose like a paper doll, feet slightly
apart, arms relaxed a little away from the body with open hands at hip height,
friendly confident grin. Keep exactly the same face, the red-and-white
baseball cap with a plain white circle (no letters), messy brown hair, blue
short-sleeved jacket over a white t-shirt, brown shoulder bag strap across the
chest; add brown belt, blue-grey shorts or trousers, and sturdy brown hiking
boots. Same painted storybook style as the reference. Transparent background:
only the character, no ground, no shadow, no scenery, no frame.
```

<!-- plik: postac-ela.png | styl: kampania | proporcje: 2:3 | wzor: kampania-ela.png -->
```
The same girl from the reference portrait, now shown as a FULL-BODY standing
figure from the top of her cap down to her shoes, whole body inside the frame
with a little empty space above the cap and below the shoes. Standing straight
facing the viewer, symmetrical heroic pose like a paper doll, feet slightly
apart, arms relaxed a little away from the body with open hands at hip height,
determined warm smile. Keep exactly the same face, short black bob hair, green
newsboy cap, white long-sleeved shirt under a teal-green vest, brown leather
satchel strap across the chest; add a brown belt, dark green trousers and
sturdy brown boots. Same painted storybook style as the reference.
Transparent background: only the character, no ground, no shadow, no scenery,
no frame.
```
