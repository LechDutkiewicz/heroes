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
confident grin. BOTH arms down, hands empty — he holds nothing. Keep him a
lean boy of about twelve, not a little child. Keep exactly the same face and
the same outfit: plain red baseball cap tilted back with a small white star
badge on the side, spiky brown hair, blue zip-up hoodie with white sleeve
stripes and sleeves pushed up, white t-shirt, sports watch, orange backpack on
his shoulders, dark green cargo shorts; add white socks and red-and-white
sneakers. No medieval clothes, no satchel. Same painted anime style as the reference. Transparent background:
only the character, no ground, no shadow, no scenery, no frame.
```

<!-- plik: postac-ela.png | styl: kampania | proporcje: 2:3 | wzor: kampania-ela.png -->
```
The same girl from the reference portrait, now shown as a FULL-BODY standing
figure from the top of her beanie down to her shoes, whole body inside the
frame with a little empty space above the beanie and below the shoes.
Standing straight facing the viewer, symmetrical heroic pose like a paper
doll, feet slightly apart, arms relaxed a little away from the body with open
hands at hip height, bright confident smile. BOTH arms down, hands empty — she
holds nothing (no ball in her hands). Keep her a slender, tall teenager of
about fifteen with teen body proportions, not a little child. Keep exactly the
same face and the same modern anime creature-trainer outfit: long straight
black hair past the shoulders with small teal clips, white knit beanie with
a teal stripe, pink scarf, black sleeveless top under a short teal zip-up
jacket with pink trim, fingerless gloves and a slim wristband, yellow
backpack on her shoulders, short pleated pink skirt over black leggings; add
pink-and-white sneakers. No medieval clothes, no vest, no belt buckle, no
satchel. Same painted anime style as the reference. Transparent background:
only the character, no ground, no shadow, no scenery, no frame.
```

## 4. Rywal i odznaki sal

Pojedynki trenerów i odznaki (`PROJEKT-TRENERZY.md`, „Sale i odznaki").
Rywal — Oskar ze Srebrnych Płaszczy — stoi na mapie przygody jak Janek,
więc rysujemy go tą samą ręką: wzorem jest poza Janka z mapy
(`bohater-dol.png`), żeby skala, kąt i wykończenie się zgadzały. Jedna
poza (bokiem w lewo — zwykle stoi naprzeciw gracza nadchodzącego z lewej);
chodzi tylko w turze wroga, poza okiem gracza.

Odznaki: po jednej na salę z planszy (`ODZNAKI` w `src/data/mapa.ts`).
Metalowe przypinki jak odznaki sal w serialu — każda inny kształt i kolor,
żeby dziecko rozróżniało je po sylwetce w 32 px. Słowa „gym" i „tower"
w prompcie zamieniały przypinkę w wieżę (styl `obiekt` to obiekty mapy) —
stąd wprost „płaska przypinka, jak medal, nic nie stoi".

Do gry: `python3 tools/rywal_wczytaj.py` → `public/mapa/rywal.png`
i `public/bohater/odznaka-<id>.png`.

<!-- plik: rywal-lewo.png | styl: obiekt | proporcje: 1:1 | wzor: bohater-dol.png -->
```
A DIFFERENT character drawn in exactly the same style, size, camera angle
and finish as the boy in the reference image: a rival trainer, a slightly
older teenage boy with spiky silver-grey hair and a confident smug grin,
wearing a long silver-grey hooded travelling cloak with a dark violet lining
over a black shirt, dark trousers and grey boots, one hand holding a red and
white pokeball at chest height. Seen in profile facing to the LEFT of the
frame, from about 45 degrees above (adventure-map view), standing still,
both feet on the ground. Chunky rounded proportions with a slightly large
head, like the reference. Must stay readable at 48 pixels tall: no thin
details, no text, no logos. Single character only, no ground, no shadow.
```

<!-- plik: odznaka-fort.png | styl: obiekt | proporcje: 1:1 -->
```
Game UI icon, not a map object: a single shiny gym badge pin seen from the
front, centered and filling the square frame. A bronze shield-shaped badge
with a raised golden oak leaf in the middle and a thin polished rim, warm
metallic highlights. Chunky, bold, simple silhouette that stays readable at
24 pixels, painted soft storybook style with glossy highlights. No text, no
ribbon, no background.
```

<!-- plik: odznaka-grota.png | styl: obiekt | proporcje: 1:1 -->
```
Game UI icon, not a map object and not a building: a single small FLAT
enamel pin, like a medal or a brooch, lying flat and seen straight from the
front, centered and filling the square frame. The pin is shaped like a
crescent moon, made of polished silver, with one round violet gemstone set
in the inner curve. Only this one flat piece of jewellery, nothing standing
up, no walls, no roof, no flag. Chunky, bold, simple silhouette readable at
24 pixels, painted soft storybook style with glossy highlights. No text, no
ribbon, no background.
```

<!-- plik: odznaka-grobla.png | styl: obiekt | proporcje: 1:1 -->
```
Game UI icon, not a map object: a single shiny gym badge pin seen from the
front, centered and filling the square frame. A teardrop-shaped badge of
deep green enamel framed in gold, with a small white water-lily flower in
the middle. Chunky, bold, simple silhouette that stays readable at 24
pixels, painted soft storybook style with glossy highlights. No text, no
ribbon, no background.
```

<!-- plik: odznaka-lod.png | styl: obiekt | proporcje: 1:1 -->
```
Game UI icon, not a map object and not a building: a single small FLAT
enamel pin, like a medal or a brooch, lying flat and seen straight from the
front, centered and filling the square frame. The pin is shaped like a
six-pointed snowflake of pale icy-blue crystal enamel with a thin silver
rim and frosty white highlights on each arm. Only this one flat piece of
jewellery, nothing standing up, no walls, no roof, no flag. Chunky, bold,
simple silhouette readable at 24 pixels, painted soft storybook style with
glossy highlights. No text, no ribbon, no background.
```

<!-- plik: odznaka-srebro.png | styl: obiekt | proporcje: 1:1 -->
```
Game UI icon, not a map object and not a building: a single small FLAT
enamel pin, like a medal or a brooch, lying flat and seen straight from the
front, centered and filling the square frame. The pin is a five-pointed
star of polished silver with a small round red gem in the centre and fine
engraved rays. Only this one flat piece of jewellery, nothing standing up,
no walls, no roof, no flag. Chunky, bold, simple silhouette readable at 24
pixels, painted soft storybook style with glossy highlights. No text, no
ribbon, no background.
```

## 5. Plecak trenera (bitwa, etap 5)

Przedmioty, których trener używa w bitwie zamiast czarów. Pokeball ma już
swój rysunek (`public/mapa/pokeball.png`) — tu tylko mikstura i eliksir.
Wczytanie: `python3 tools/rywal_wczytaj.py` (przycina i skaluje do 128 px).

<!-- plik: przedmiot-mikstura.png | styl: obiekt | proporcje: 1:1 -->
```
Game UI icon, not a map object: a single small healing potion spray bottle
seen from the front, centered and filling the square frame. A chubby round
glass flask filled with glowing pink-magenta liquid, a white rounded cap on
top with a short nozzle, and a little white cross-shaped plus sign painted
on the glass. Warm glossy reflections on the glass. Chunky, bold, simple
silhouette readable at 24 pixels, painted soft storybook style with glossy
highlights. No text, no letters, no hand, no background.
```

<!-- plik: przedmiot-eliksir.png | styl: obiekt | proporcje: 1:1 -->
```
Game UI icon, not a map object: a single small strength elixir bottle seen
from the front, centered and filling the square frame. A tall slim glass
vial with a cork stopper, filled with bright glowing orange-red liquid with
tiny rising bubbles, and a small golden lightning-bolt shaped charm tied to
its neck with a string. Warm glossy reflections on the glass. Chunky, bold,
simple silhouette readable at 24 pixels, painted soft storybook style with
glossy highlights. No text, no letters, no hand, no background.
```

## 6. Liderzy sal (etap 6)

Każda sala (zamek przeciwnika) ma lidera — jak w serialu. Portret do
medalionu: głowa z ramionami, przezroczyste tło, ta sama miękka kreska co
figurki Janka i Eli. Postacie autorskie, nie z serialu.
Wczytanie: `python3 tools/rywal_wczytaj.py` (128 px).

<!-- plik: lider-fort.png | styl: obiekt | proporcje: 1:1 -->
```
Game UI portrait, not a map object: head and shoulders of a friendly
sturdy young man, a rock-type gym leader, seen from the front, centered and
filling the square frame. Spiky dark brown hair, squinting cheerful eyes,
big confident grin, tanned skin, a brown sleeveless vest over an olive
green shirt, a small grey stone pendant on a cord. Chunky, bold, simple
shapes readable at 48 pixels, painted soft storybook style with glossy
highlights, warm light. No text, no background, no hands.
```

<!-- plik: lider-grota.png | styl: obiekt | proporcje: 1:1 -->
```
Character bust portrait of a PERSON — not a building, not a house, not a
castle, not a tower. Head and shoulders of a calm mysterious young woman,
seen from the front, centered and
filling the square frame. Long straight silver-lavender hair with a small
crescent moon hair clip, gentle smile, dark violet cloak with a high collar
and a silver trim. Chunky, bold, simple shapes readable at 48 pixels,
painted soft storybook style with glossy highlights, soft cool light. No
text, no background, no hands.
```

<!-- plik: lider-grobla.png | styl: obiekt | proporcje: 1:1 -->
```
Character bust portrait of a PERSON — not a building, not a house, not a
castle, not a tower. Head and shoulders of a sporty cheerful teenage girl
who loves swimming, seen from the front, centered and filling
the square frame. Short orange hair in a small side ponytail, bright blue
eyes, wide smile, a light blue sleeveless swim top with a white wave
pattern and a whistle on a cord. Chunky, bold, simple shapes readable at 48
pixels, painted soft storybook style with glossy highlights, warm light. No
text, no background, no hands.
```

<!-- plik: lider-lod.png | styl: obiekt | proporcje: 1:1 -->
```
Character bust portrait of a PERSON — not a building, not a house, not a
castle, not a tower. Head and shoulders of a tall serious young man who
loves winter, seen from the front, centered and filling the
square frame. Neat pale blue hair, a small confident smile, a thick white
fur-trimmed winter coat with an icy blue scarf, a tiny snowflake brooch.
Chunky, bold, simple shapes readable at 48 pixels, painted soft storybook
style with glossy highlights, cool light. No text, no background, no hands.
```

<!-- plik: lider-srebro.png | styl: obiekt | proporcje: 1:1 -->
```
Game UI portrait, not a map object: head and shoulders of the proud leader
of a band of mischievous trainers in silver cloaks, seen from the front,
centered and filling the square frame. A middle-aged man with slicked back
grey hair, a neat small moustache, a sly but not scary smirk, a long silver
cloak with a tall collar over a dark purple uniform, a silver star badge on
the chest. Cartoonish and funny rather than menacing, suitable for young
children. Chunky, bold, simple shapes readable at 48 pixels, painted soft
storybook style with glossy highlights. No text, no background, no hands.
```
