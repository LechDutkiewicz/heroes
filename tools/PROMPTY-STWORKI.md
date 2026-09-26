# Prompty do grafik: stworki i ich linie ewolucyjne

Stare sprite'y stworków (`public/sprites/<numer>.png`) to rysunki z innego
źródła niż malowane obiekty mapy i odstawały od nich stylem. Tu są prompty,
które malują wszystkie stworki w jednym stylu — tym samym co budowle
i znajdźki plansz — razem z nowymi formami ewolucyjnymi. Linie ewolucyjne
(kto w kogo ewoluuje, nazwy) są w `src/data/ewolucje.ts`; tu tylko obrazki.

Styl `obiekt` (blok w `tools/PROMPTY-MAPA-2.md`) daje prawdziwą
przezroczystość z OpenAI. Każdy prompt dokleja do niego wspólny akapit
o stworku (cała sylwetka, widok 3/4 jak jednostka HoMM3, bez ziemi i cienia).

**Wzór zamiast samego opisu.** Znacznik `| wzor: …` wysyła plik przez
`images/edits` z obrazkiem-referencją (`generuj_grafiki.py`, `WZORY`):
forma bazowa jest przemalowywana ze STAREGO sprite'a
(`tools/wsad/stare-sprites/<numer>.png`), żeby dziecko poznało swojego
stworka, a każdy następny etap powstaje z poprzedniego — dzięki temu linia
trzyma barwy i rysy. Kolejność ma więc znaczenie: najpierw etap 1, potem 2, 3.

Filtr treści OpenAI odrzuca część edycji (kategoria „other", losowo —
ponowienie zwykle przechodzi; nazwa stworka w prompcie i „bakłażan" psuły
pewnie, dlatego promptów bez nazw). Po kilku odmowach:
`generuj_grafiki.py --bez-wzoru stworek-<numer>.png` — z samego opisu.
Kierunek patrzenia i dorysowane placki/obwódki poprawia
`tools/stworki_wczytaj.py` (`W_PRAWO`), więc prompt o nie nie walczy.

Nazwy plików: `stworek-<numer sprite'a>.png`. Formy bazowe mają numery
obecnych sprite'ów, nowe etapy `01xxx` (etap 2) i `02xxx` (etap 3), gdzie
`xxx` to końcówka numeru formy bazowej.

    OPENAI_IMAGE_QUALITY=medium python3 tools/generuj_grafiki.py stworek-00193.png stworek-01193.png stworek-02193.png
    python3 tools/stworki_wczytaj.py        # tools/wsad/stworek-*.png → public/sprites/<numer>.png

## Bór Szmaragdowy

### Pyroko → Pyrokin → Pyrogar (poziom 1, ogień, drobnica)

<!-- plik: stworek-00193.png | styl: obiekt | proporcje: 1:1 | wzor: stare-sprites/00193.png -->
```
A single original creature for a children's fantasy strategy game, drawn like a
Heroes of Might and Magic III battle unit: the WHOLE body from the top of the
head to the feet, in a clear three-quarter side view - the body turned towards
the viewer's left as if marching to the left across a battlefield, the head
glancing slightly towards the viewer. A flyer hovers low with its wings
spread. Friendly pocket-monster design for young children: big expressive
eyes, chunky rounded shapes, a bold simple silhouette that still reads at 50
pixels tall, two or three dominant colours. Painted exactly like the map
buildings of this game: smooth hand-painted volumes, soft light from the upper
right, a slightly darker edge tone around the silhouette, rich saturated
colours. Only this one creature. The feet stand on empty transparent
background: no ground patch, no sand, no dust, no shadow ellipse under the
feet, no rocks or grass, no effects floating apart from the body, no text.

A fire creature: a tiny round fire spirit shaped like a chubby red-orange bean, NOT a lizard (no tail, no snout): a big curling tongue of yellow-orange flame rises from the back of its head and back like a hood, stubby little feet, tiny arms, big bright friendly eyes and a happy face.

Evolution stage 1 of 3, the base form: small, young and cute. The attached image is an old rough sketch of this very creature: keep its body plan, colours and signature features so a child recognises it at once, but repaint it completely in the painted style described above.

IMPORTANT: only the creature itself, with no white border around it. Everything around it is transparent, INCLUDING the area under its feet: no floor, no sand, no dirt, no puddle, no shadow.
```

<!-- plik: stworek-01193.png | styl: obiekt | proporcje: 1:1 | wzor: stworek-00193.png -->
```
A single original creature for a children's fantasy strategy game, drawn like a
Heroes of Might and Magic III battle unit: the WHOLE body from the top of the
head to the feet, in a clear three-quarter side view - the body turned towards
the viewer's left as if marching to the left across a battlefield, the head
glancing slightly towards the viewer. A flyer hovers low with its wings
spread. Friendly pocket-monster design for young children: big expressive
eyes, chunky rounded shapes, a bold simple silhouette that still reads at 50
pixels tall, two or three dominant colours. Painted exactly like the map
buildings of this game: smooth hand-painted volumes, soft light from the upper
right, a slightly darker edge tone around the silhouette, rich saturated
colours. Only this one creature. The feet stand on empty transparent
background: no ground patch, no sand, no dust, no shadow ellipse under the
feet, no rocks or grass, no effects floating apart from the body, no text.

A fire creature: a bigger round fire spirit standing on two short legs, NOT a lizard (no tail, no snout, no belly patch): a rounded red-orange body like glowing clay with ember speckles, little arms, the flame hood grown larger and split into three flickering tongues over its head and shoulders, cheeky grin.

Evolution stage 2 of 3. The attached image is stage 1 of this line: draw its evolved form, bigger, stronger and more confident, clearly the same species - keep the colour scheme, the eyes and the signature features and let them grow.

IMPORTANT: only the creature itself, with no white border around it. Everything around it is transparent, INCLUDING the area under its feet: no floor, no sand, no dirt, no puddle, no shadow.
```

<!-- plik: stworek-02193.png | styl: obiekt | proporcje: 1:1 | wzor: stworek-01193.png -->
```
A single original creature for a children's fantasy strategy game, drawn like a
Heroes of Might and Magic III battle unit: the WHOLE body from the top of the
head to the feet, in a clear three-quarter side view - the body turned towards
the viewer's left as if marching to the left across a battlefield, the head
glancing slightly towards the viewer. A flyer hovers low with its wings
spread. Friendly pocket-monster design for young children: big expressive
eyes, chunky rounded shapes, a bold simple silhouette that still reads at 50
pixels tall, two or three dominant colours. Painted exactly like the map
buildings of this game: smooth hand-painted volumes, soft light from the upper
right, a slightly darker edge tone around the silhouette, rich saturated
colours. Only this one creature. The feet stand on empty transparent
background: no ground patch, no sand, no dust, no shadow ellipse under the
feet, no rocks or grass, no effects floating apart from the body, no text.

A fire creature: a stocky powerful fire golem-spirit, NOT a lizard (no tail, no snout): a heavy rounded red-orange body like glowing clay, dark cooled-lava plates on the shoulders, a roaring mane of yellow and orange flames over its head and back, a glowing ember heart on the chest, strong short arms with ember knuckles, confident but friendly face.

Evolution stage 3 of 3, the final form. The attached image is stage 2 of this line: draw the final evolution, majestic and powerful, the most impressive of the three but still friendly and clearly the same species with the same colours. Give it new features that stage 2 did not have (a crest, bigger horns, armour plates or a mane), so the three stages are easy to tell apart.

IMPORTANT: only the creature itself, with no white border around it. Everything around it is transparent, INCLUDING the area under its feet: no floor, no sand, no dirt, no puddle, no shadow.
```

### Flamir → Flamiron → Flamidor (poziom 2, ogień, strzelec)

<!-- plik: stworek-00020.png | styl: obiekt | proporcje: 1:1 | wzor: stare-sprites/00020.png -->
```
A single original creature for a children's fantasy strategy game, drawn like a
Heroes of Might and Magic III battle unit: the WHOLE body from the top of the
head to the feet, in a clear three-quarter side view - the body turned towards
the viewer's left as if marching to the left across a battlefield, the head
glancing slightly towards the viewer. A flyer hovers low with its wings
spread. Friendly pocket-monster design for young children: big expressive
eyes, chunky rounded shapes, a bold simple silhouette that still reads at 50
pixels tall, two or three dominant colours. Painted exactly like the map
buildings of this game: smooth hand-painted volumes, soft light from the upper
right, a slightly darker edge tone around the silhouette, rich saturated
colours. Only this one creature. The feet stand on empty transparent
background: no ground patch, no sand, no dust, no shadow ellipse under the
feet, no rocks or grass, no effects floating apart from the body, no text.

A fire creature: a slender crimson firebird chick standing on two thin legs, a crest of red flame-feathers on its head, a cream-coloured chest, small wings, a long tail striped black and white, alert eyes, ready to spit small fireballs.

Evolution stage 1 of 3, the base form: small, young and cute. The attached image is an old rough sketch of this very creature: keep its body plan, colours and signature features so a child recognises it at once, but repaint it completely in the painted style described above.

IMPORTANT: only the creature itself, with no white border around it. Everything around it is transparent, INCLUDING the area under its feet: no floor, no sand, no dirt, no puddle, no shadow.
```

<!-- plik: stworek-01020.png | styl: obiekt | proporcje: 1:1 | wzor: stworek-00020.png -->
```
A single original creature for a children's fantasy strategy game, drawn like a
Heroes of Might and Magic III battle unit: the WHOLE body from the top of the
head to the feet, in a clear three-quarter side view - the body turned towards
the viewer's left as if marching to the left across a battlefield, the head
glancing slightly towards the viewer. A flyer hovers low with its wings
spread. Friendly pocket-monster design for young children: big expressive
eyes, chunky rounded shapes, a bold simple silhouette that still reads at 50
pixels tall, two or three dominant colours. Painted exactly like the map
buildings of this game: smooth hand-painted volumes, soft light from the upper
right, a slightly darker edge tone around the silhouette, rich saturated
colours. Only this one creature. The feet stand on empty transparent
background: no ground patch, no sand, no dust, no shadow ellipse under the
feet, no rocks or grass, no effects floating apart from the body, no text.

A fire creature: a taller crimson firebird standing proud, a longer crest of flame-feathers, wings with glowing ember-tipped feathers half open, cream chest, a long black-and-white striped tail, a little flame glowing in its beak.

Evolution stage 2 of 3. The attached image is stage 1 of this line: draw its evolved form, bigger, stronger and more confident, clearly the same species - keep the colour scheme, the eyes and the signature features and let them grow.

IMPORTANT: only the creature itself, with no white border around it. Everything around it is transparent, INCLUDING the area under its feet: no floor, no sand, no dirt, no puddle, no shadow.
```

<!-- plik: stworek-02020.png | styl: obiekt | proporcje: 1:1 | wzor: stworek-01020.png -->
```
A single original creature for a children's fantasy strategy game, drawn like a
Heroes of Might and Magic III battle unit: the WHOLE body from the top of the
head to the feet, in a clear three-quarter side view - the body turned towards
the viewer's left as if marching to the left across a battlefield, the head
glancing slightly towards the viewer. A flyer hovers low with its wings
spread. Friendly pocket-monster design for young children: big expressive
eyes, chunky rounded shapes, a bold simple silhouette that still reads at 50
pixels tall, two or three dominant colours. Painted exactly like the map
buildings of this game: smooth hand-painted volumes, soft light from the upper
right, a slightly darker edge tone around the silhouette, rich saturated
colours. Only this one creature. The feet stand on empty transparent
background: no ground patch, no sand, no dust, no shadow ellipse under the
feet, no rocks or grass, no effects floating apart from the body, no text.

A fire creature: a majestic crimson-and-gold phoenix-like firebird, wide wings of flame feathers spread up, a golden crest like a crown, cream chest, long black-and-white striped tail streamers ending in flames, noble friendly look.

Evolution stage 3 of 3, the final form. The attached image is stage 2 of this line: draw the final evolution, majestic and powerful, the most impressive of the three but still friendly and clearly the same species with the same colours. Give it new features that stage 2 did not have (a crest, bigger horns, armour plates or a mane), so the three stages are easy to tell apart.

IMPORTANT: only the creature itself, with no white border around it. Everything around it is transparent, INCLUDING the area under its feet: no floor, no sand, no dirt, no puddle, no shadow.
```

### Aquino → Aquilon → Aquarion (poziom 3, woda, obrońca)

<!-- plik: stworek-00218.png | styl: obiekt | proporcje: 1:1 | wzor: stare-sprites/00218.png -->
```
A single original creature for a children's fantasy strategy game, drawn like a
Heroes of Might and Magic III battle unit: the WHOLE body from the top of the
head to the feet, in a clear three-quarter side view - the body turned towards
the viewer's left as if marching to the left across a battlefield, the head
glancing slightly towards the viewer. A flyer hovers low with its wings
spread. Friendly pocket-monster design for young children: big expressive
eyes, chunky rounded shapes, a bold simple silhouette that still reads at 50
pixels tall, two or three dominant colours. Painted exactly like the map
buildings of this game: smooth hand-painted volumes, soft light from the upper
right, a slightly darker edge tone around the silhouette, rich saturated
colours. Only this one creature. The feet stand on empty transparent
background: no ground patch, no sand, no dust, no shadow ellipse under the
feet, no rocks or grass, no effects floating apart from the body, no text.

A water creature: a soft pale-blue water jelly creature built from round glossy bubbles: a big round head, bubble arms and bubble feet, two simple dark eyes and a gentle smile, slightly translucent like clear water.

Evolution stage 1 of 3, the base form: small, young and cute. The attached image is an old rough sketch of this very creature: keep its body plan, colours and signature features so a child recognises it at once, but repaint it completely in the painted style described above.

IMPORTANT: only the creature itself, with no white border around it. Everything around it is transparent, INCLUDING the area under its feet: no floor, no sand, no dirt, no puddle, no shadow.
```

<!-- plik: stworek-01218.png | styl: obiekt | proporcje: 1:1 | wzor: stworek-00218.png -->
```
A single original creature for a children's fantasy strategy game, drawn like a
Heroes of Might and Magic III battle unit: the WHOLE body from the top of the
head to the feet, in a clear three-quarter side view - the body turned towards
the viewer's left as if marching to the left across a battlefield, the head
glancing slightly towards the viewer. A flyer hovers low with its wings
spread. Friendly pocket-monster design for young children: big expressive
eyes, chunky rounded shapes, a bold simple silhouette that still reads at 50
pixels tall, two or three dominant colours. Painted exactly like the map
buildings of this game: smooth hand-painted volumes, soft light from the upper
right, a slightly darker edge tone around the silhouette, rich saturated
colours. Only this one creature. The feet stand on empty transparent
background: no ground patch, no sand, no dust, no shadow ellipse under the
feet, no rocks or grass, no effects floating apart from the body, no text.

A water creature: a larger pale-blue water-jelly guardian made of glossy bubbles, a small seashell dome on top of its head, sturdy round bubble arms held up like shields, thicker bubble legs, translucent like clear water, calm brave eyes.

Evolution stage 2 of 3. The attached image is stage 1 of this line: draw its evolved form, bigger, stronger and more confident, clearly the same species - keep the colour scheme, the eyes and the signature features and let them grow.

IMPORTANT: only the creature itself, with no white border around it. Everything around it is transparent, INCLUDING the area under its feet: no floor, no sand, no dirt, no puddle, no shadow.
```

<!-- plik: stworek-02218.png | styl: obiekt | proporcje: 1:1 | wzor: stworek-01218.png -->
```
A single original creature for a children's fantasy strategy game, drawn like a
Heroes of Might and Magic III battle unit: the WHOLE body from the top of the
head to the feet, in a clear three-quarter side view - the body turned towards
the viewer's left as if marching to the left across a battlefield, the head
glancing slightly towards the viewer. A flyer hovers low with its wings
spread. Friendly pocket-monster design for young children: big expressive
eyes, chunky rounded shapes, a bold simple silhouette that still reads at 50
pixels tall, two or three dominant colours. Painted exactly like the map
buildings of this game: smooth hand-painted volumes, soft light from the upper
right, a slightly darker edge tone around the silhouette, rich saturated
colours. Only this one creature. The feet stand on empty transparent
background: no ground patch, no sand, no dust, no shadow ellipse under the
feet, no rocks or grass, no effects floating apart from the body, no text.

A water creature: a big guardian made of glassy clear-blue water, a crest shaped like a breaking wave on its head, large round shield-like arms of water with swirls inside, a white pearl glowing in its chest, strong bubble legs, protective kind face.

Evolution stage 3 of 3, the final form. The attached image is stage 2 of this line: draw the final evolution, majestic and powerful, the most impressive of the three but still friendly and clearly the same species with the same colours. Give it new features that stage 2 did not have (a crest, bigger horns, armour plates or a mane), so the three stages are easy to tell apart.

IMPORTANT: only the creature itself, with no white border around it. Everything around it is transparent, INCLUDING the area under its feet: no floor, no sand, no dirt, no puddle, no shadow.
```

### Torrenar → Torrenos → Torrendor (poziom 4, woda, latacz)

<!-- plik: stworek-00030.png | styl: obiekt | proporcje: 1:1 | wzor: stare-sprites/00030.png -->
```
A single original creature for a children's fantasy strategy game, drawn like a
Heroes of Might and Magic III battle unit: the WHOLE body from the top of the
head to the feet, in a clear three-quarter side view - the body turned towards
the viewer's left as if marching to the left across a battlefield, the head
glancing slightly towards the viewer. A flyer hovers low with its wings
spread. Friendly pocket-monster design for young children: big expressive
eyes, chunky rounded shapes, a bold simple silhouette that still reads at 50
pixels tall, two or three dominant colours. Painted exactly like the map
buildings of this game: smooth hand-painted volumes, soft light from the upper
right, a slightly darker edge tone around the silhouette, rich saturated
colours. Only this one creature. The feet stand on empty transparent
background: no ground patch, no sand, no dust, no shadow ellipse under the
feet, no rocks or grass, no effects floating apart from the body, no text.

A water creature: a blue-grey armoured water creature with smooth stone-like plates, a rounded head with dark bands across it and one bright red-orange eye visible, small fin-wings on its back for gliding, sturdy stubby legs.

Evolution stage 1 of 3, the base form: small, young and cute. The attached image is an old rough sketch of this very creature: keep its body plan, colours and signature features so a child recognises it at once, but repaint it completely in the painted style described above.

IMPORTANT: only the creature itself, with no white border around it. Everything around it is transparent, INCLUDING the area under its feet: no floor, no sand, no dirt, no puddle, no shadow.
```

<!-- plik: stworek-01030.png | styl: obiekt | proporcje: 1:1 | wzor: stworek-00030.png -->
```
A single original creature for a children's fantasy strategy game, drawn like a
Heroes of Might and Magic III battle unit: the WHOLE body from the top of the
head to the feet, in a clear three-quarter side view - the body turned towards
the viewer's left as if marching to the left across a battlefield, the head
glancing slightly towards the viewer. A flyer hovers low with its wings
spread. Friendly pocket-monster design for young children: big expressive
eyes, chunky rounded shapes, a bold simple silhouette that still reads at 50
pixels tall, two or three dominant colours. Painted exactly like the map
buildings of this game: smooth hand-painted volumes, soft light from the upper
right, a slightly darker edge tone around the silhouette, rich saturated
colours. Only this one creature. The feet stand on empty transparent
background: no ground patch, no sand, no dust, no shadow ellipse under the
feet, no rocks or grass, no effects floating apart from the body, no text.

A water creature: a bigger blue-grey armoured water flyer, smooth plated body, a helmet-like head with dark bands, bright red-orange eyes, a pair of wide fin-wings like a flying fish spread from its back, water droplets dripping from the fin tips.

Evolution stage 2 of 3. The attached image is stage 1 of this line: draw its evolved form, bigger, stronger and more confident, clearly the same species - keep the colour scheme, the eyes and the signature features and let them grow.

IMPORTANT: only the creature itself, with no white border around it. Everything around it is transparent, INCLUDING the area under its feet: no floor, no sand, no dirt, no puddle, no shadow.
```

<!-- plik: stworek-02030.png | styl: obiekt | proporcje: 1:1 | wzor: stworek-01030.png -->
```
A single original creature for a children's fantasy strategy game, drawn like a
Heroes of Might and Magic III battle unit: the WHOLE body from the top of the
head to the feet, in a clear three-quarter side view - the body turned towards
the viewer's left as if marching to the left across a battlefield, the head
glancing slightly towards the viewer. A flyer hovers low with its wings
spread. Friendly pocket-monster design for young children: big expressive
eyes, chunky rounded shapes, a bold simple silhouette that still reads at 50
pixels tall, two or three dominant colours. Painted exactly like the map
buildings of this game: smooth hand-painted volumes, soft light from the upper
right, a slightly darker edge tone around the silhouette, rich saturated
colours. Only this one creature. The feet stand on empty transparent
background: no ground patch, no sand, no dust, no shadow ellipse under the
feet, no rocks or grass, no effects floating apart from the body, no text.

A water creature: a powerful blue armoured sky-swimmer, sleek plated body like polished river stone, a crested helmet head with dark bands and fierce red-orange eyes, huge translucent blue fin-wings spread wide, a long fin tail, streams of water trailing.

Evolution stage 3 of 3, the final form. The attached image is stage 2 of this line: draw the final evolution, majestic and powerful, the most impressive of the three but still friendly and clearly the same species with the same colours. Give it new features that stage 2 did not have (a crest, bigger horns, armour plates or a mane), so the three stages are easy to tell apart.

IMPORTANT: only the creature itself, with no white border around it. Everything around it is transparent, INCLUDING the area under its feet: no floor, no sand, no dirt, no puddle, no shadow.
```

### Verdiko → Verdilo → Verdiantor (poziom 5, trawa, strzelec)

<!-- plik: stworek-00096.png | styl: obiekt | proporcje: 1:1 | wzor: stare-sprites/00096.png -->
```
A single original creature for a children's fantasy strategy game, drawn like a
Heroes of Might and Magic III battle unit: the WHOLE body from the top of the
head to the feet, in a clear three-quarter side view - the body turned towards
the viewer's left as if marching to the left across a battlefield, the head
glancing slightly towards the viewer. A flyer hovers low with its wings
spread. Friendly pocket-monster design for young children: big expressive
eyes, chunky rounded shapes, a bold simple silhouette that still reads at 50
pixels tall, two or three dominant colours. Painted exactly like the map
buildings of this game: smooth hand-painted volumes, soft light from the upper
right, a slightly darker edge tone around the silhouette, rich saturated
colours. Only this one creature. The feet stand on empty transparent
background: no ground patch, no sand, no dust, no shadow ellipse under the
feet, no rocks or grass, no effects floating apart from the body, no text.

A grass and plants creature: a small pale-green sprout creature like a leafy kitten, one big leaf growing from the top of its head, curly spiral marks on its cheeks and body, round belly, short legs, happy open mouth.

Evolution stage 1 of 3, the base form: small, young and cute. The attached image is an old rough sketch of this very creature: keep its body plan, colours and signature features so a child recognises it at once, but repaint it completely in the painted style described above.

IMPORTANT: only the creature itself, with no white border around it. Everything around it is transparent, INCLUDING the area under its feet: no floor, no sand, no dirt, no puddle, no shadow.
```

<!-- plik: stworek-01096.png | styl: obiekt | proporcje: 1:1 | wzor: stworek-00096.png -->
```
A single original creature for a children's fantasy strategy game, drawn like a
Heroes of Might and Magic III battle unit: the WHOLE body from the top of the
head to the feet, in a clear three-quarter side view - the body turned towards
the viewer's left as if marching to the left across a battlefield, the head
glancing slightly towards the viewer. A flyer hovers low with its wings
spread. Friendly pocket-monster design for young children: big expressive
eyes, chunky rounded shapes, a bold simple silhouette that still reads at 50
pixels tall, two or three dominant colours. Painted exactly like the map
buildings of this game: smooth hand-painted volumes, soft light from the upper
right, a slightly darker edge tone around the silhouette, rich saturated
colours. Only this one creature. The feet stand on empty transparent
background: no ground patch, no sand, no dust, no shadow ellipse under the
feet, no rocks or grass, no effects floating apart from the body, no text.

A grass and plants creature: a taller pale-green leafy sprite standing on its hind legs, two big leaves growing on its head, a bushy tail made of leaves, curly spiral marks on its body, a small seed held in its paws, playful eyes.

Evolution stage 2 of 3. The attached image is stage 1 of this line: draw its evolved form, bigger, stronger and more confident, clearly the same species - keep the colour scheme, the eyes and the signature features and let them grow.

IMPORTANT: only the creature itself, with no white border around it. Everything around it is transparent, INCLUDING the area under its feet: no floor, no sand, no dirt, no puddle, no shadow.
```

<!-- plik: stworek-02096.png | styl: obiekt | proporcje: 1:1 | wzor: stworek-01096.png -->
```
A single original creature for a children's fantasy strategy game, drawn like a
Heroes of Might and Magic III battle unit: the WHOLE body from the top of the
head to the feet, in a clear three-quarter side view - the body turned towards
the viewer's left as if marching to the left across a battlefield, the head
glancing slightly towards the viewer. A flyer hovers low with its wings
spread. Friendly pocket-monster design for young children: big expressive
eyes, chunky rounded shapes, a bold simple silhouette that still reads at 50
pixels tall, two or three dominant colours. Painted exactly like the map
buildings of this game: smooth hand-painted volumes, soft light from the upper
right, a slightly darker edge tone around the silhouette, rich saturated
colours. Only this one creature. The feet stand on empty transparent
background: no ground patch, no sand, no dust, no shadow ellipse under the
feet, no rocks or grass, no effects floating apart from the body, no text.

A grass and plants creature: a graceful green forest lynx-like creature, a crown of leaves and tiny white flowers on its head, a long tail ending in a flowering bud, curly spiral marks glowing softly, a seed pod launcher on its shoulders, wise friendly eyes.

Evolution stage 3 of 3, the final form. The attached image is stage 2 of this line: draw the final evolution, majestic and powerful, the most impressive of the three but still friendly and clearly the same species with the same colours. Give it new features that stage 2 did not have (a crest, bigger horns, armour plates or a mane), so the three stages are easy to tell apart.

IMPORTANT: only the creature itself, with no white border around it. Everything around it is transparent, INCLUDING the area under its feet: no floor, no sand, no dirt, no puddle, no shadow.
```

### Silvena → Silvaris → Silvanora (poziom 6, trawa, czempion)

<!-- plik: stworek-00227.png | styl: obiekt | proporcje: 1:1 | wzor: stare-sprites/00227.png -->
```
A single original creature for a children's fantasy strategy game, drawn like a
Heroes of Might and Magic III battle unit: the WHOLE body from the top of the
head to the feet, in a clear three-quarter side view - the body turned towards
the viewer's left as if marching to the left across a battlefield, the head
glancing slightly towards the viewer. A flyer hovers low with its wings
spread. Friendly pocket-monster design for young children: big expressive
eyes, chunky rounded shapes, a bold simple silhouette that still reads at 50
pixels tall, two or three dominant colours. Painted exactly like the map
buildings of this game: smooth hand-painted volumes, soft light from the upper
right, a slightly darker edge tone around the silhouette, rich saturated
colours. Only this one creature. The feet stand on empty transparent
background: no ground patch, no sand, no dust, no shadow ellipse under the
feet, no rocks or grass, no effects floating apart from the body, no text.

A grass and plants creature: a slim pale-green forest dryad creature standing upright, a pink flower blooming on top of its head, a cape of long leaves on its back, thin arms and legs, calm gentle face.

Evolution stage 1 of 3, the base form: small, young and cute. The attached image is an old rough sketch of this very creature: keep its body plan, colours and signature features so a child recognises it at once, but repaint it completely in the painted style described above.

IMPORTANT: only the creature itself, with no white border around it. Everything around it is transparent, INCLUDING the area under its feet: no floor, no sand, no dirt, no puddle, no shadow.
```

<!-- plik: stworek-01227.png | styl: obiekt | proporcje: 1:1 | wzor: stworek-00227.png -->
```
A single original creature for a children's fantasy strategy game, drawn like a
Heroes of Might and Magic III battle unit: the WHOLE body from the top of the
head to the feet, in a clear three-quarter side view - the body turned towards
the viewer's left as if marching to the left across a battlefield, the head
glancing slightly towards the viewer. A flyer hovers low with its wings
spread. Friendly pocket-monster design for young children: big expressive
eyes, chunky rounded shapes, a bold simple silhouette that still reads at 50
pixels tall, two or three dominant colours. Painted exactly like the map
buildings of this game: smooth hand-painted volumes, soft light from the upper
right, a slightly darker edge tone around the silhouette, rich saturated
colours. Only this one creature. The feet stand on empty transparent
background: no ground patch, no sand, no dust, no shadow ellipse under the
feet, no rocks or grass, no effects floating apart from the body, no text.

A grass and plants creature: a taller green forest dryad warrior, a crown of pink blossoms, a flowing cape of leaves, forearms with leaf-shaped blades, vines wrapped around the legs, calm determined face.

Evolution stage 2 of 3. The attached image is stage 1 of this line: draw its evolved form, bigger, stronger and more confident, clearly the same species - keep the colour scheme, the eyes and the signature features and let them grow.

IMPORTANT: only the creature itself, with no white border around it. Everything around it is transparent, INCLUDING the area under its feet: no floor, no sand, no dirt, no puddle, no shadow.
```

<!-- plik: stworek-02227.png | styl: obiekt | proporcje: 1:1 | wzor: stworek-01227.png -->
```
A single original creature for a children's fantasy strategy game, drawn like a
Heroes of Might and Magic III battle unit: the WHOLE body from the top of the
head to the feet, in a clear three-quarter side view - the body turned towards
the viewer's left as if marching to the left across a battlefield, the head
glancing slightly towards the viewer. A flyer hovers low with its wings
spread. Friendly pocket-monster design for young children: big expressive
eyes, chunky rounded shapes, a bold simple silhouette that still reads at 50
pixels tall, two or three dominant colours. Painted exactly like the map
buildings of this game: smooth hand-painted volumes, soft light from the upper
right, a slightly darker edge tone around the silhouette, rich saturated
colours. Only this one creature. The feet stand on empty transparent
background: no ground patch, no sand, no dust, no shadow ellipse under the
feet, no rocks or grass, no effects floating apart from the body, no text.

A grass and plants creature: a tall elegant forest guardian queen, flowing cape of green leaves and pink petals, a big crown of pink blossoms, two long leaf blades on her forearms, glowing green eyes, graceful heroic pose, friendly.

Evolution stage 3 of 3, the final form. The attached image is stage 2 of this line: draw the final evolution, majestic and powerful, the most impressive of the three but still friendly and clearly the same species with the same colours. Give it new features that stage 2 did not have (a crest, bigger horns, armour plates or a mane), so the three stages are easy to tell apart.

IMPORTANT: only the creature itself, with no white border around it. Everything around it is transparent, INCLUDING the area under its feet: no floor, no sand, no dirt, no puddle, no shadow.
```

## Grota Księżycowa

### Glacyn → Glacynar → Glacyrion (poziom 1, woda, drobnica)

<!-- plik: stworek-00246.png | styl: obiekt | proporcje: 1:1 | wzor: stare-sprites/00246.png -->
```
A single original creature for a children's fantasy strategy game, drawn like a
Heroes of Might and Magic III battle unit: the WHOLE body from the top of the
head to the feet, in a clear three-quarter side view - the body turned towards
the viewer's left as if marching to the left across a battlefield, the head
glancing slightly towards the viewer. A flyer hovers low with its wings
spread. Friendly pocket-monster design for young children: big expressive
eyes, chunky rounded shapes, a bold simple silhouette that still reads at 50
pixels tall, two or three dominant colours. Painted exactly like the map
buildings of this game: smooth hand-painted volumes, soft light from the upper
right, a slightly darker edge tone around the silhouette, rich saturated
colours. Only this one creature. The feet stand on empty transparent
background: no ground patch, no sand, no dust, no shadow ellipse under the
feet, no rocks or grass, no effects floating apart from the body, no text.

A water creature: a small light-blue slender creature like a baby seahorse standing on two legs, a curled fin tail, a little fin crest on its head, a long neck, big curious eyes.

Evolution stage 1 of 3, the base form: small, young and cute. The attached image is an old rough sketch of this very creature: keep its body plan, colours and signature features so a child recognises it at once, but repaint it completely in the painted style described above.

IMPORTANT: only the creature itself, with no white border around it. Everything around it is transparent, INCLUDING the area under its feet: no floor, no sand, no dirt, no puddle, no shadow.
```

<!-- plik: stworek-01246.png | styl: obiekt | proporcje: 1:1 | wzor: stworek-00246.png -->
```
A single original creature for a children's fantasy strategy game, drawn like a
Heroes of Might and Magic III battle unit: the WHOLE body from the top of the
head to the feet, in a clear three-quarter side view - the body turned towards
the viewer's left as if marching to the left across a battlefield, the head
glancing slightly towards the viewer. A flyer hovers low with its wings
spread. Friendly pocket-monster design for young children: big expressive
eyes, chunky rounded shapes, a bold simple silhouette that still reads at 50
pixels tall, two or three dominant colours. Painted exactly like the map
buildings of this game: smooth hand-painted volumes, soft light from the upper
right, a slightly darker edge tone around the silhouette, rich saturated
colours. Only this one creature. The feet stand on empty transparent
background: no ground patch, no sand, no dust, no shadow ellipse under the
feet, no rocks or grass, no effects floating apart from the body, no text.

A water creature: a taller icy light-blue seahorse-lizard standing upright, a frosty fin crest, small ice crystals growing along its curled tail, fin arms, bright curious eyes.

Evolution stage 2 of 3. The attached image is stage 1 of this line: draw its evolved form, bigger, stronger and more confident, clearly the same species - keep the colour scheme, the eyes and the signature features and let them grow.

IMPORTANT: only the creature itself, with no white border around it. Everything around it is transparent, INCLUDING the area under its feet: no floor, no sand, no dirt, no puddle, no shadow.
```

<!-- plik: stworek-02246.png | styl: obiekt | proporcje: 1:1 | wzor: stworek-01246.png -->
```
A single original creature for a children's fantasy strategy game, drawn like a
Heroes of Might and Magic III battle unit: the WHOLE body from the top of the
head to the feet, in a clear three-quarter side view - the body turned towards
the viewer's left as if marching to the left across a battlefield, the head
glancing slightly towards the viewer. A flyer hovers low with its wings
spread. Friendly pocket-monster design for young children: big expressive
eyes, chunky rounded shapes, a bold simple silhouette that still reads at 50
pixels tall, two or three dominant colours. Painted exactly like the map
buildings of this game: smooth hand-painted volumes, soft light from the upper
right, a slightly darker edge tone around the silhouette, rich saturated
colours. Only this one creature. The feet stand on empty transparent
background: no ground patch, no sand, no dust, no shadow ellipse under the
feet, no rocks or grass, no effects floating apart from the body, no text.

A water creature: a big graceful ice-water dragon seahorse, a crown of clear ice crystals, long flowing translucent fins, a long curled tail with ice spikes, frosty sparkles on its light-blue body, noble friendly face.

Evolution stage 3 of 3, the final form. The attached image is stage 2 of this line: draw the final evolution, majestic and powerful, the most impressive of the three but still friendly and clearly the same species with the same colours. Give it new features that stage 2 did not have (a crest, bigger horns, armour plates or a mane), so the three stages are easy to tell apart.

IMPORTANT: only the creature itself, with no white border around it. Everything around it is transparent, INCLUDING the area under its feet: no floor, no sand, no dirt, no puddle, no shadow.
```

### Sporex → Sporexil → Sporedon (poziom 2, trawa, strzelec)

<!-- plik: stworek-00002.png | styl: obiekt | proporcje: 1:1 | wzor: stare-sprites/00002.png -->
```
A single original creature for a children's fantasy strategy game, drawn like a
Heroes of Might and Magic III battle unit: the WHOLE body from the top of the
head to the feet, in a clear three-quarter side view - the body turned towards
the viewer's left as if marching to the left across a battlefield, the head
glancing slightly towards the viewer. A flyer hovers low with its wings
spread. Friendly pocket-monster design for young children: big expressive
eyes, chunky rounded shapes, a bold simple silhouette that still reads at 50
pixels tall, two or three dominant colours. Painted exactly like the map
buildings of this game: smooth hand-painted volumes, soft light from the upper
right, a slightly darker edge tone around the silhouette, rich saturated
colours. Only this one creature. The feet stand on empty transparent
background: no ground patch, no sand, no dust, no shadow ellipse under the
feet, no rocks or grass, no effects floating apart from the body, no text.

A grass and plants creature: a round mint-green bulb creature with a friendly face, rosy pink cheeks and a wide smile, a crown of long curling purple petals on top like a flower hat, two thin purple leafy vine arms, short green stem legs.

Evolution stage 1 of 3, the base form: small, young and cute. The attached image is an old rough sketch of this very creature: keep its body plan, colours and signature features so a child recognises it at once, but repaint it completely in the painted style described above.

IMPORTANT: only the creature itself, with no white border around it. Everything around it is transparent, INCLUDING the area under its feet: no floor, no sand, no dirt, no puddle, no shadow.
```

<!-- plik: stworek-01002.png | styl: obiekt | proporcje: 1:1 | wzor: stworek-00002.png -->
```
A single original creature for a children's fantasy strategy game, drawn like a
Heroes of Might and Magic III battle unit: the WHOLE body from the top of the
head to the feet, in a clear three-quarter side view - the body turned towards
the viewer's left as if marching to the left across a battlefield, the head
glancing slightly towards the viewer. A flyer hovers low with its wings
spread. Friendly pocket-monster design for young children: big expressive
eyes, chunky rounded shapes, a bold simple silhouette that still reads at 50
pixels tall, two or three dominant colours. Painted exactly like the map
buildings of this game: smooth hand-painted volumes, soft light from the upper
right, a slightly darker edge tone around the silhouette, rich saturated
colours. Only this one creature. The feet stand on empty transparent
background: no ground patch, no sand, no dust, no shadow ellipse under the
feet, no rocks or grass, no effects floating apart from the body, no text.

A grass and plants creature: a bigger mint-green bulb plant creature with a happy closed-mouth smile and rosy cheeks, a fuller crown of curling purple petals with a golden seed in the middle, long purple leafy vine arms, sturdy green stem legs.

Evolution stage 2 of 3. The attached image is stage 1 of this line: draw its evolved form, bigger, stronger and more confident, clearly the same species - keep the colour scheme, the eyes and the signature features and let them grow.

IMPORTANT: only the creature itself, with no white border around it. Everything around it is transparent, INCLUDING the area under its feet: no floor, no sand, no dirt, no puddle, no shadow.
```

<!-- plik: stworek-02002.png | styl: obiekt | proporcje: 1:1 | wzor: stworek-01002.png -->
```
A single original creature for a children's fantasy strategy game, drawn like a
Heroes of Might and Magic III battle unit: the WHOLE body from the top of the
head to the feet, in a clear three-quarter side view - the body turned towards
the viewer's left as if marching to the left across a battlefield, the head
glancing slightly towards the viewer. A flyer hovers low with its wings
spread. Friendly pocket-monster design for young children: big expressive
eyes, chunky rounded shapes, a bold simple silhouette that still reads at 50
pixels tall, two or three dominant colours. Painted exactly like the map
buildings of this game: smooth hand-painted volumes, soft light from the upper
right, a slightly darker edge tone around the silhouette, rich saturated
colours. Only this one creature. The feet stand on empty transparent
background: no ground patch, no sand, no dust, no shadow ellipse under the
feet, no rocks or grass, no effects floating apart from the body, no text.

A grass and plants creature: a large mint-green plant creature with a happy closed-mouth smile, a huge crown of curling purple petals opening like a big flower with a golden seed in the middle, round pink seed pods on its shoulders, thick purple leafy vine arms, strong root legs.

Evolution stage 3 of 3, the final form. The attached image is stage 2 of this line: draw the final evolution, majestic and powerful, the most impressive of the three but still friendly and clearly the same species with the same colours. Give it new features that stage 2 did not have (a crest, bigger horns, armour plates or a mane), so the three stages are easy to tell apart.

IMPORTANT: only the creature itself, with no white border around it. Everything around it is transparent, INCLUDING the area under its feet: no floor, no sand, no dirt, no puddle, no shadow.
```

### Cindro → Cindrak → Cindragor (poziom 3, ogień, obrońca)

<!-- plik: stworek-00263.png | styl: obiekt | proporcje: 1:1 | wzor: stare-sprites/00263.png -->
```
A single original creature for a children's fantasy strategy game, drawn like a
Heroes of Might and Magic III battle unit: the WHOLE body from the top of the
head to the feet, in a clear three-quarter side view - the body turned towards
the viewer's left as if marching to the left across a battlefield, the head
glancing slightly towards the viewer. A flyer hovers low with its wings
spread. Friendly pocket-monster design for young children: big expressive
eyes, chunky rounded shapes, a bold simple silhouette that still reads at 50
pixels tall, two or three dominant colours. Painted exactly like the map
buildings of this game: smooth hand-painted volumes, soft light from the upper
right, a slightly darker edge tone around the silhouette, rich saturated
colours. Only this one creature. The feet stand on empty transparent
background: no ground patch, no sand, no dust, no shadow ellipse under the
feet, no rocks or grass, no effects floating apart from the body, no text.

A fire creature: a small cheeky fire lemur with big round ears, a rust-orange spiky mane, a cream-coloured face and belly, big eyes, orange paws, a long ringed tail with a little flame at the tip.

Evolution stage 1 of 3, the base form: small, young and cute. The attached image is an old rough sketch of this very creature: keep its body plan, colours and signature features so a child recognises it at once, but repaint it completely in the painted style described above.

IMPORTANT: only the creature itself, with no white border around it. Everything around it is transparent, INCLUDING the area under its feet: no floor, no sand, no dirt, no puddle, no shadow.
```

<!-- plik: stworek-01263.png | styl: obiekt | proporcje: 1:1 | wzor: stworek-00263.png -->
```
A single original creature for a children's fantasy strategy game, drawn like a
Heroes of Might and Magic III battle unit: the WHOLE body from the top of the
head to the feet, in a clear three-quarter side view - the body turned towards
the viewer's left as if marching to the left across a battlefield, the head
glancing slightly towards the viewer. A flyer hovers low with its wings
spread. Friendly pocket-monster design for young children: big expressive
eyes, chunky rounded shapes, a bold simple silhouette that still reads at 50
pixels tall, two or three dominant colours. Painted exactly like the map
buildings of this game: smooth hand-painted volumes, soft light from the upper
right, a slightly darker edge tone around the silhouette, rich saturated
colours. Only this one creature. The feet stand on empty transparent
background: no ground patch, no sand, no dust, no shadow ellipse under the
feet, no rocks or grass, no effects floating apart from the body, no text.

A fire creature: a sturdier fire lemur standing on two legs, big round ears, a bigger rust-orange spiky mane, rocky ember plates on its shoulders like guards, cream face and chest, orange paws raised, a long ringed tail with a flame tip.

Evolution stage 2 of 3. The attached image is stage 1 of this line: draw its evolved form, bigger, stronger and more confident, clearly the same species - keep the colour scheme, the eyes and the signature features and let them grow.

IMPORTANT: only the creature itself, with no white border around it. Everything around it is transparent, INCLUDING the area under its feet: no floor, no sand, no dirt, no puddle, no shadow.
```

<!-- plik: stworek-02263.png | styl: obiekt | proporcje: 1:1 | wzor: stworek-01263.png -->
```
A single original creature for a children's fantasy strategy game, drawn like a
Heroes of Might and Magic III battle unit: the WHOLE body from the top of the
head to the feet, in a clear three-quarter side view - the body turned towards
the viewer's left as if marching to the left across a battlefield, the head
glancing slightly towards the viewer. A flyer hovers low with its wings
spread. Friendly pocket-monster design for young children: big expressive
eyes, chunky rounded shapes, a bold simple silhouette that still reads at 50
pixels tall, two or three dominant colours. Painted exactly like the map
buildings of this game: smooth hand-painted volumes, soft light from the upper
right, a slightly darker edge tone around the silhouette, rich saturated
colours. Only this one creature. The feet stand on empty transparent
background: no ground patch, no sand, no dust, no shadow ellipse under the
feet, no rocks or grass, no effects floating apart from the body, no text.

A fire creature: a big fire lemur guardian, big round ears, a tall rust-orange mane glowing like embers, heavy gauntlets of dark volcanic rock with glowing cracks, cream chest, broad shoulders, a long ringed tail with a big flame tip, protective friendly face.

Evolution stage 3 of 3, the final form. The attached image is stage 2 of this line: draw the final evolution, majestic and powerful, the most impressive of the three but still friendly and clearly the same species with the same colours. Give it new features that stage 2 did not have (a crest, bigger horns, armour plates or a mane), so the three stages are easy to tell apart.

IMPORTANT: only the creature itself, with no white border around it. Everything around it is transparent, INCLUDING the area under its feet: no floor, no sand, no dirt, no puddle, no shadow.
```

### Sporina → Sporilla → Sporinelle (poziom 4, trawa, latacz)

<!-- plik: stworek-00250.png | styl: obiekt | proporcje: 1:1 | wzor: stare-sprites/00250.png -->
```
A single original creature for a children's fantasy strategy game, drawn like a
Heroes of Might and Magic III battle unit: the WHOLE body from the top of the
head to the feet, in a clear three-quarter side view - the body turned towards
the viewer's left as if marching to the left across a battlefield, the head
glancing slightly towards the viewer. A flyer hovers low with its wings
spread. Friendly pocket-monster design for young children: big expressive
eyes, chunky rounded shapes, a bold simple silhouette that still reads at 50
pixels tall, two or three dominant colours. Painted exactly like the map
buildings of this game: smooth hand-painted volumes, soft light from the upper
right, a slightly darker edge tone around the silhouette, rich saturated
colours. Only this one creature. The feet stand on empty transparent
background: no ground patch, no sand, no dust, no shadow ellipse under the
feet, no rocks or grass, no effects floating apart from the body, no text.

A grass and plants creature: a small floating pale-green seed pod creature, oval body covered with tiny dots and thin white lines, two red eyes, a thin antenna on top with a glowing bubble, tiny leaf wings.

Evolution stage 1 of 3, the base form: small, young and cute. The attached image is an old rough sketch of this very creature: keep its body plan, colours and signature features so a child recognises it at once, but repaint it completely in the painted style described above.

IMPORTANT: only the creature itself, with no white border around it. Everything around it is transparent, INCLUDING the area under its feet: no floor, no sand, no dirt, no puddle, no shadow.
```

<!-- plik: stworek-01250.png | styl: obiekt | proporcje: 1:1 | wzor: stworek-00250.png -->
```
A single original creature for a children's fantasy strategy game, drawn like a
Heroes of Might and Magic III battle unit: the WHOLE body from the top of the
head to the feet, in a clear three-quarter side view - the body turned towards
the viewer's left as if marching to the left across a battlefield, the head
glancing slightly towards the viewer. A flyer hovers low with its wings
spread. Friendly pocket-monster design for young children: big expressive
eyes, chunky rounded shapes, a bold simple silhouette that still reads at 50
pixels tall, two or three dominant colours. Painted exactly like the map
buildings of this game: smooth hand-painted volumes, soft light from the upper
right, a slightly darker edge tone around the silhouette, rich saturated
colours. Only this one creature. The feet stand on empty transparent
background: no ground patch, no sand, no dust, no shadow ellipse under the
feet, no rocks or grass, no effects floating apart from the body, no text.

A grass and plants creature: a floating pale-green seed sprite, oval dotted body, two red eyes, two antennae with glowing bubbles, a pair of wide dandelion-fluff wings, tiny leaf feet dangling.

Evolution stage 2 of 3. The attached image is stage 1 of this line: draw its evolved form, bigger, stronger and more confident, clearly the same species - keep the colour scheme, the eyes and the signature features and let them grow.

IMPORTANT: only the creature itself, with no white border around it. Everything around it is transparent, INCLUDING the area under its feet: no floor, no sand, no dirt, no puddle, no shadow.
```

<!-- plik: stworek-02250.png | styl: obiekt | proporcje: 1:1 | wzor: stworek-01250.png -->
```
A single original creature for a children's fantasy strategy game, drawn like a
Heroes of Might and Magic III battle unit: the WHOLE body from the top of the
head to the feet, in a clear three-quarter side view - the body turned towards
the viewer's left as if marching to the left across a battlefield, the head
glancing slightly towards the viewer. A flyer hovers low with its wings
spread. Friendly pocket-monster design for young children: big expressive
eyes, chunky rounded shapes, a bold simple silhouette that still reads at 50
pixels tall, two or three dominant colours. Painted exactly like the map
buildings of this game: smooth hand-painted volumes, soft light from the upper
right, a slightly darker edge tone around the silhouette, rich saturated
colours. Only this one creature. The feet stand on empty transparent
background: no ground patch, no sand, no dust, no shadow ellipse under the
feet, no rocks or grass, no effects floating apart from the body, no text.

A grass and plants creature: a big floating seed fairy, a pale-green oval body with a white flower pattern, kind red eyes, a halo of glowing seed bubbles, four large dandelion-fluff wings spread wide, long leafy trailing ribbons.

Evolution stage 3 of 3, the final form. The attached image is stage 2 of this line: draw the final evolution, majestic and powerful, the most impressive of the three but still friendly and clearly the same species with the same colours. Give it new features that stage 2 did not have (a crest, bigger horns, armour plates or a mane), so the three stages are easy to tell apart.

IMPORTANT: only the creature itself, with no white border around it. Everything around it is transparent, INCLUDING the area under its feet: no floor, no sand, no dirt, no puddle, no shadow.
```

### Aquator → Aquatorn → Aquatoros (poziom 5, woda, strzelec)

<!-- plik: stworek-00220.png | styl: obiekt | proporcje: 1:1 | wzor: stare-sprites/00220.png -->
```
A single original creature for a children's fantasy strategy game, drawn like a
Heroes of Might and Magic III battle unit: the WHOLE body from the top of the
head to the feet, in a clear three-quarter side view - the body turned towards
the viewer's left as if marching to the left across a battlefield, the head
glancing slightly towards the viewer. A flyer hovers low with its wings
spread. Friendly pocket-monster design for young children: big expressive
eyes, chunky rounded shapes, a bold simple silhouette that still reads at 50
pixels tall, two or three dominant colours. Painted exactly like the map
buildings of this game: smooth hand-painted volumes, soft light from the upper
right, a slightly darker edge tone around the silhouette, rich saturated
colours. Only this one creature. The feet stand on empty transparent
background: no ground patch, no sand, no dust, no shadow ellipse under the
feet, no rocks or grass, no effects floating apart from the body, no text.

A water creature: a blue spiky four-legged water beast, rows of pointed ice-blue spikes along its back, a white belly, small white fangs, a wide grinning face.

Evolution stage 1 of 3, the base form: small, young and cute. The attached image is an old rough sketch of this very creature: keep its body plan, colours and signature features so a child recognises it at once, but repaint it completely in the painted style described above.

IMPORTANT: only the creature itself, with no white border around it. Everything around it is transparent, INCLUDING the area under its feet: no floor, no sand, no dirt, no puddle, no shadow.
```

<!-- plik: stworek-01220.png | styl: obiekt | proporcje: 1:1 | wzor: stworek-00220.png -->
```
A single original creature for a children's fantasy strategy game, drawn like a
Heroes of Might and Magic III battle unit: the WHOLE body from the top of the
head to the feet, in a clear three-quarter side view - the body turned towards
the viewer's left as if marching to the left across a battlefield, the head
glancing slightly towards the viewer. A flyer hovers low with its wings
spread. Friendly pocket-monster design for young children: big expressive
eyes, chunky rounded shapes, a bold simple silhouette that still reads at 50
pixels tall, two or three dominant colours. Painted exactly like the map
buildings of this game: smooth hand-painted volumes, soft light from the upper
right, a slightly darker edge tone around the silhouette, rich saturated
colours. Only this one creature. The feet stand on empty transparent
background: no ground patch, no sand, no dust, no shadow ellipse under the
feet, no rocks or grass, no effects floating apart from the body, no text.

A water creature: a bigger blue spiky water beast on four legs, longer crystal-blue spikes on its back and tail, water shooting spout on its forehead, white belly and fangs, eager face.

Evolution stage 2 of 3. The attached image is stage 1 of this line: draw its evolved form, bigger, stronger and more confident, clearly the same species - keep the colour scheme, the eyes and the signature features and let them grow.

IMPORTANT: only the creature itself, with no white border around it. Everything around it is transparent, INCLUDING the area under its feet: no floor, no sand, no dirt, no puddle, no shadow.
```

<!-- plik: stworek-02220.png | styl: obiekt | proporcje: 1:1 | wzor: stworek-01220.png -->
```
A single original creature for a children's fantasy strategy game, drawn like a
Heroes of Might and Magic III battle unit: the WHOLE body from the top of the
head to the feet, in a clear three-quarter side view - the body turned towards
the viewer's left as if marching to the left across a battlefield, the head
glancing slightly towards the viewer. A flyer hovers low with its wings
spread. Friendly pocket-monster design for young children: big expressive
eyes, chunky rounded shapes, a bold simple silhouette that still reads at 50
pixels tall, two or three dominant colours. Painted exactly like the map
buildings of this game: smooth hand-painted volumes, soft light from the upper
right, a slightly darker edge tone around the silhouette, rich saturated
colours. Only this one creature. The feet stand on empty transparent
background: no ground patch, no sand, no dust, no shadow ellipse under the
feet, no rocks or grass, no effects floating apart from the body, no text.

A water creature: a large powerful blue water beast, a huge crest of crystal-blue spikes, two water cannons on its shoulders made of shells, a thick spiked tail, white belly, strong legs, brave friendly face.

Evolution stage 3 of 3, the final form. The attached image is stage 2 of this line: draw the final evolution, majestic and powerful, the most impressive of the three but still friendly and clearly the same species with the same colours. Give it new features that stage 2 did not have (a crest, bigger horns, armour plates or a mane), so the three stages are easy to tell apart.

IMPORTANT: only the creature itself, with no white border around it. Everything around it is transparent, INCLUDING the area under its feet: no floor, no sand, no dirt, no puddle, no shadow.
```

### Vulkaron → Vulkarex → Vulkadon (poziom 6, ogień, czempion)

<!-- plik: stworek-00196.png | styl: obiekt | proporcje: 1:1 | wzor: stare-sprites/00196.png -->
```
A single original creature for a children's fantasy strategy game, drawn like a
Heroes of Might and Magic III battle unit: the WHOLE body from the top of the
head to the feet, in a clear three-quarter side view - the body turned towards
the viewer's left as if marching to the left across a battlefield, the head
glancing slightly towards the viewer. A flyer hovers low with its wings
spread. Friendly pocket-monster design for young children: big expressive
eyes, chunky rounded shapes, a bold simple silhouette that still reads at 50
pixels tall, two or three dominant colours. Painted exactly like the map
buildings of this game: smooth hand-painted volumes, soft light from the upper
right, a slightly darker edge tone around the silhouette, rich saturated
colours. Only this one creature. The feet stand on empty transparent
background: no ground patch, no sand, no dust, no shadow ellipse under the
feet, no rocks or grass, no effects floating apart from the body, no text.

A fire creature: a bulky round black volcanic creature, a crown of golden spikes and horns, a red-and-black ring pattern on its chest like a glowing core, stubby strong arms, short legs.

Evolution stage 1 of 3, the base form: small, young and cute. The attached image is an old rough sketch of this very creature: keep its body plan, colours and signature features so a child recognises it at once, but repaint it completely in the painted style described above.

IMPORTANT: only the creature itself, with no white border around it. Everything around it is transparent, INCLUDING the area under its feet: no floor, no sand, no dirt, no puddle, no shadow.
```

<!-- plik: stworek-01196.png | styl: obiekt | proporcje: 1:1 | wzor: stworek-00196.png -->
```
A single original creature for a children's fantasy strategy game, drawn like a
Heroes of Might and Magic III battle unit: the WHOLE body from the top of the
head to the feet, in a clear three-quarter side view - the body turned towards
the viewer's left as if marching to the left across a battlefield, the head
glancing slightly towards the viewer. A flyer hovers low with its wings
spread. Friendly pocket-monster design for young children: big expressive
eyes, chunky rounded shapes, a bold simple silhouette that still reads at 50
pixels tall, two or three dominant colours. Painted exactly like the map
buildings of this game: smooth hand-painted volumes, soft light from the upper
right, a slightly darker edge tone around the silhouette, rich saturated
colours. Only this one creature. The feet stand on empty transparent
background: no ground patch, no sand, no dust, no shadow ellipse under the
feet, no rocks or grass, no effects floating apart from the body, no text.

A fire creature: a bigger bulky black volcanic brute, larger golden horns and spikes, a glowing red lava core in its chest, cracks of glowing lava on its arms, heavy fists, sturdy legs.

Evolution stage 2 of 3. The attached image is stage 1 of this line: draw its evolved form, bigger, stronger and more confident, clearly the same species - keep the colour scheme, the eyes and the signature features and let them grow.

IMPORTANT: only the creature itself, with no white border around it. Everything around it is transparent, INCLUDING the area under its feet: no floor, no sand, no dirt, no puddle, no shadow.
```

<!-- plik: stworek-02196.png | styl: obiekt | proporcje: 1:1 | wzor: stworek-01196.png -->
```
A single original creature for a children's fantasy strategy game, drawn like a
Heroes of Might and Magic III battle unit: the WHOLE body from the top of the
head to the feet, in a clear three-quarter side view - the body turned towards
the viewer's left as if marching to the left across a battlefield, the head
glancing slightly towards the viewer. A flyer hovers low with its wings
spread. Friendly pocket-monster design for young children: big expressive
eyes, chunky rounded shapes, a bold simple silhouette that still reads at 50
pixels tall, two or three dominant colours. Painted exactly like the map
buildings of this game: smooth hand-painted volumes, soft light from the upper
right, a slightly darker edge tone around the silhouette, rich saturated
colours. Only this one creature. The feet stand on empty transparent
background: no ground patch, no sand, no dust, no shadow ellipse under the
feet, no rocks or grass, no effects floating apart from the body, no text.

A fire creature: a huge black volcanic titan, a crown of tall golden horns, a blazing red lava core, shoulders like small volcanoes puffing smoke, heavy glowing fists, powerful but friendly champion.

Evolution stage 3 of 3, the final form. The attached image is stage 2 of this line: draw the final evolution, majestic and powerful, the most impressive of the three but still friendly and clearly the same species with the same colours. Give it new features that stage 2 did not have (a crest, bigger horns, armour plates or a mane), so the three stages are easy to tell apart.

IMPORTANT: only the creature itself, with no white border around it. Everything around it is transparent, INCLUDING the area under its feet: no floor, no sand, no dirt, no puddle, no shadow.
```

## Zbocze Popielne

### Bazalt → Bazaltor → Bazaltron (poziom 1, trawa, drobnica)

<!-- plik: stworek-00074.png | styl: obiekt | proporcje: 1:1 | wzor: stare-sprites/00074.png -->
```
A single original creature for a children's fantasy strategy game, drawn like a
Heroes of Might and Magic III battle unit: the WHOLE body from the top of the
head to the feet, in a clear three-quarter side view - the body turned towards
the viewer's left as if marching to the left across a battlefield, the head
glancing slightly towards the viewer. A flyer hovers low with its wings
spread. Friendly pocket-monster design for young children: big expressive
eyes, chunky rounded shapes, a bold simple silhouette that still reads at 50
pixels tall, two or three dominant colours. Painted exactly like the map
buildings of this game: smooth hand-painted volumes, soft light from the upper
right, a slightly darker edge tone around the silhouette, rich saturated
colours. Only this one creature. The feet stand on empty transparent
background: no ground patch, no sand, no dust, no shadow ellipse under the
feet, no rocks or grass, no effects floating apart from the body, no text.

A grass and plants creature: a stocky crimson salamander with a big wide mouth, a cream-coloured belly, a curly vine sprouting from its head like an antenna, small green leaves along its back, short legs, cheerful face.

Evolution stage 1 of 3, the base form: small, young and cute. The attached image is an old rough sketch of this very creature: keep its body plan, colours and signature features so a child recognises it at once, but repaint it completely in the painted style described above.

IMPORTANT: only the creature itself, with no white border around it. Everything around it is transparent, INCLUDING the area under its feet: no floor, no sand, no dirt, no puddle, no shadow.
```

<!-- plik: stworek-01074.png | styl: obiekt | proporcje: 1:1 | wzor: stworek-00074.png -->
```
A single original creature for a children's fantasy strategy game, drawn like a
Heroes of Might and Magic III battle unit: the WHOLE body from the top of the
head to the feet, in a clear three-quarter side view - the body turned towards
the viewer's left as if marching to the left across a battlefield, the head
glancing slightly towards the viewer. A flyer hovers low with its wings
spread. Friendly pocket-monster design for young children: big expressive
eyes, chunky rounded shapes, a bold simple silhouette that still reads at 50
pixels tall, two or three dominant colours. Painted exactly like the map
buildings of this game: smooth hand-painted volumes, soft light from the upper
right, a slightly darker edge tone around the silhouette, rich saturated
colours. Only this one creature. The feet stand on empty transparent
background: no ground patch, no sand, no dust, no shadow ellipse under the
feet, no rocks or grass, no effects floating apart from the body, no text.

A grass and plants creature: a bigger crimson salamander on four sturdy legs, cream belly, a leafy curly vine on its head, a row of green moss and leaves on its back, a thick tail with a leaf tip, grinning.

Evolution stage 2 of 3. The attached image is stage 1 of this line: draw its evolved form, bigger, stronger and more confident, clearly the same species - keep the colour scheme, the eyes and the signature features and let them grow.

IMPORTANT: only the creature itself, with no white border around it. Everything around it is transparent, INCLUDING the area under its feet: no floor, no sand, no dirt, no puddle, no shadow.
```

<!-- plik: stworek-02074.png | styl: obiekt | proporcje: 1:1 | wzor: stworek-01074.png -->
```
A single original creature for a children's fantasy strategy game, drawn like a
Heroes of Might and Magic III battle unit: the WHOLE body from the top of the
head to the feet, in a clear three-quarter side view - the body turned towards
the viewer's left as if marching to the left across a battlefield, the head
glancing slightly towards the viewer. A flyer hovers low with its wings
spread. Friendly pocket-monster design for young children: big expressive
eyes, chunky rounded shapes, a bold simple silhouette that still reads at 50
pixels tall, two or three dominant colours. Painted exactly like the map
buildings of this game: smooth hand-painted volumes, soft light from the upper
right, a slightly darker edge tone around the silhouette, rich saturated
colours. Only this one creature. The feet stand on empty transparent
background: no ground patch, no sand, no dust, no shadow ellipse under the
feet, no rocks or grass, no effects floating apart from the body, no text.

A grass and plants creature: a large crimson dragon-salamander, cream belly, a crown of curly vines and leaves, a mossy ridge with little ferns along its back, a strong tail with a leaf fan, powerful friendly face.

Evolution stage 3 of 3, the final form. The attached image is stage 2 of this line: draw the final evolution, majestic and powerful, the most impressive of the three but still friendly and clearly the same species with the same colours. Give it new features that stage 2 did not have (a crest, bigger horns, armour plates or a mane), so the three stages are easy to tell apart.

IMPORTANT: only the creature itself, with no white border around it. Everything around it is transparent, INCLUDING the area under its feet: no floor, no sand, no dirt, no puddle, no shadow.
```

### Ashko → Ashkor → Ashkoran (poziom 2, woda, strzelec)

<!-- plik: stworek-00058.png | styl: obiekt | proporcje: 1:1 | wzor: stare-sprites/00058.png -->
```
A single original creature for a children's fantasy strategy game, drawn like a
Heroes of Might and Magic III battle unit: the WHOLE body from the top of the
head to the feet, in a clear three-quarter side view - the body turned towards
the viewer's left as if marching to the left across a battlefield, the head
glancing slightly towards the viewer. A flyer hovers low with its wings
spread. Friendly pocket-monster design for young children: big expressive
eyes, chunky rounded shapes, a bold simple silhouette that still reads at 50
pixels tall, two or three dominant colours. Painted exactly like the map
buildings of this game: smooth hand-painted volumes, soft light from the upper
right, a slightly darker edge tone around the silhouette, rich saturated
colours. Only this one creature. The feet stand on empty transparent
background: no ground patch, no sand, no dust, no shadow ellipse under the
feet, no rocks or grass, no effects floating apart from the body, no text.

A water creature: a small grey goat-like creature with thin legs, a big fluffy grey rain-cloud for a head mane, a white mark on its face, a few blue raindrops falling from the cloud.

Evolution stage 1 of 3, the base form: small, young and cute. The attached image is an old rough sketch of this very creature: keep its body plan, colours and signature features so a child recognises it at once, but repaint it completely in the painted style described above.

IMPORTANT: only the creature itself, with no white border around it. Everything around it is transparent, INCLUDING the area under its feet: no floor, no sand, no dirt, no puddle, no shadow.
```

<!-- plik: stworek-01058.png | styl: obiekt | proporcje: 1:1 | wzor: stworek-00058.png -->
```
A single original creature for a children's fantasy strategy game, drawn like a
Heroes of Might and Magic III battle unit: the WHOLE body from the top of the
head to the feet, in a clear three-quarter side view - the body turned towards
the viewer's left as if marching to the left across a battlefield, the head
glancing slightly towards the viewer. A flyer hovers low with its wings
spread. Friendly pocket-monster design for young children: big expressive
eyes, chunky rounded shapes, a bold simple silhouette that still reads at 50
pixels tall, two or three dominant colours. Painted exactly like the map
buildings of this game: smooth hand-painted volumes, soft light from the upper
right, a slightly darker edge tone around the silhouette, rich saturated
colours. Only this one creature. The feet stand on empty transparent
background: no ground patch, no sand, no dust, no shadow ellipse under the
feet, no rocks or grass, no effects floating apart from the body, no text.

A water creature: a taller grey cloud goat, a bigger fluffy storm-cloud mane with blue raindrops, small curled horns, a white face mark, thin strong legs, determined eyes.

Evolution stage 2 of 3. The attached image is stage 1 of this line: draw its evolved form, bigger, stronger and more confident, clearly the same species - keep the colour scheme, the eyes and the signature features and let them grow.

IMPORTANT: only the creature itself, with no white border around it. Everything around it is transparent, INCLUDING the area under its feet: no floor, no sand, no dirt, no puddle, no shadow.
```

<!-- plik: stworek-02058.png | styl: obiekt | proporcje: 1:1 | wzor: stworek-01058.png -->
```
A single original creature for a children's fantasy strategy game, drawn like a
Heroes of Might and Magic III battle unit: the WHOLE body from the top of the
head to the feet, in a clear three-quarter side view - the body turned towards
the viewer's left as if marching to the left across a battlefield, the head
glancing slightly towards the viewer. A flyer hovers low with its wings
spread. Friendly pocket-monster design for young children: big expressive
eyes, chunky rounded shapes, a bold simple silhouette that still reads at 50
pixels tall, two or three dominant colours. Painted exactly like the map
buildings of this game: smooth hand-painted volumes, soft light from the upper
right, a slightly darker edge tone around the silhouette, rich saturated
colours. Only this one creature. The feet stand on empty transparent
background: no ground patch, no sand, no dust, no shadow ellipse under the
feet, no rocks or grass, no effects floating apart from the body, no text.

A water creature: a majestic grey storm-cloud ram, a huge dark-grey thundercloud mane with blue rain and tiny sparkles, big curled horns, white face mark, powerful legs, noble friendly face.

Evolution stage 3 of 3, the final form. The attached image is stage 2 of this line: draw the final evolution, majestic and powerful, the most impressive of the three but still friendly and clearly the same species with the same colours. Give it new features that stage 2 did not have (a crest, bigger horns, armour plates or a mane), so the three stages are easy to tell apart.

IMPORTANT: only the creature itself, with no white border around it. Everything around it is transparent, INCLUDING the area under its feet: no floor, no sand, no dirt, no puddle, no shadow.
```

### Obsydian → Obsydiak → Obsydion (poziom 3, trawa, obrońca)

<!-- plik: stworek-00095.png | styl: obiekt | proporcje: 1:1 | wzor: stare-sprites/00095.png -->
```
A single original creature for a children's fantasy strategy game, drawn like a
Heroes of Might and Magic III battle unit: the WHOLE body from the top of the
head to the feet, in a clear three-quarter side view - the body turned towards
the viewer's left as if marching to the left across a battlefield, the head
glancing slightly towards the viewer. A flyer hovers low with its wings
spread. Friendly pocket-monster design for young children: big expressive
eyes, chunky rounded shapes, a bold simple silhouette that still reads at 50
pixels tall, two or three dominant colours. Painted exactly like the map
buildings of this game: smooth hand-painted volumes, soft light from the upper
right, a slightly darker edge tone around the silhouette, rich saturated
colours. Only this one creature. The feet stand on empty transparent
background: no ground patch, no sand, no dust, no shadow ellipse under the
feet, no rocks or grass, no effects floating apart from the body, no text.

A grass and plants creature: a round squat glossy deep-purple berry creature shaped like a big plum, a crown of cream-white petals on top of its head, small lavender feet, two tiny green leaves as arms, big shy eyes.

Evolution stage 1 of 3, the base form: small, young and cute. The attached image is an old rough sketch of this very creature: keep its body plan, colours and signature features so a child recognises it at once, but repaint it completely in the painted style described above.

IMPORTANT: only the creature itself, with no white border around it. Everything around it is transparent, INCLUDING the area under its feet: no floor, no sand, no dirt, no puddle, no shadow.
```

<!-- plik: stworek-01095.png | styl: obiekt | proporcje: 1:1 | wzor: stworek-00095.png -->
```
A single original creature for a children's fantasy strategy game, drawn like a
Heroes of Might and Magic III battle unit: the WHOLE body from the top of the
head to the feet, in a clear three-quarter side view - the body turned towards
the viewer's left as if marching to the left across a battlefield, the head
glancing slightly towards the viewer. A flyer hovers low with its wings
spread. Friendly pocket-monster design for young children: big expressive
eyes, chunky rounded shapes, a bold simple silhouette that still reads at 50
pixels tall, two or three dominant colours. Painted exactly like the map
buildings of this game: smooth hand-painted volumes, soft light from the upper
right, a slightly darker edge tone around the silhouette, rich saturated
colours. Only this one creature. The feet stand on empty transparent
background: no ground patch, no sand, no dust, no shadow ellipse under the
feet, no rocks or grass, no effects floating apart from the body, no text.

A grass and plants creature: a bigger round glossy deep-purple berry creature, a larger crown of cream-white petals, a ring of green leaves around its middle like a belt, short sturdy arms, lavender feet, a brave calm face.

Evolution stage 2 of 3. The attached image is stage 1 of this line: draw its evolved form, bigger, stronger and more confident, clearly the same species - keep the colour scheme, the eyes and the signature features and let them grow.

IMPORTANT: only the creature itself, with no white border around it. Everything around it is transparent, INCLUDING the area under its feet: no floor, no sand, no dirt, no puddle, no shadow.
```

<!-- plik: stworek-02095.png | styl: obiekt | proporcje: 1:1 | wzor: stworek-01095.png -->
```
A single original creature for a children's fantasy strategy game, drawn like a
Heroes of Might and Magic III battle unit: the WHOLE body from the top of the
head to the feet, in a clear three-quarter side view - the body turned towards
the viewer's left as if marching to the left across a battlefield, the head
glancing slightly towards the viewer. A flyer hovers low with its wings
spread. Friendly pocket-monster design for young children: big expressive
eyes, chunky rounded shapes, a bold simple silhouette that still reads at 50
pixels tall, two or three dominant colours. Painted exactly like the map
buildings of this game: smooth hand-painted volumes, soft light from the upper
right, a slightly darker edge tone around the silhouette, rich saturated
colours. Only this one creature. The feet stand on empty transparent
background: no ground patch, no sand, no dust, no shadow ellipse under the
feet, no rocks or grass, no effects floating apart from the body, no text.

A grass and plants creature: a large round glossy purple berry knight, a crown of cream-white petals like a helmet crest, a big green leaf held like a shield, thick arms, lavender armoured feet, protective friendly face.

Evolution stage 3 of 3, the final form. The attached image is stage 2 of this line: draw the final evolution, majestic and powerful, the most impressive of the three but still friendly and clearly the same species with the same colours. Give it new features that stage 2 did not have (a crest, bigger horns, armour plates or a mane), so the three stages are easy to tell apart.

IMPORTANT: only the creature itself, with no white border around it. Everything around it is transparent, INCLUDING the area under its feet: no floor, no sand, no dirt, no puddle, no shadow.
```

### Cynder → Cynderos → Cyndrakon (poziom 4, ogień, latacz)

<!-- plik: stworek-00023.png | styl: obiekt | proporcje: 1:1 | wzor: stare-sprites/00023.png -->
```
A single original creature for a children's fantasy strategy game, drawn like a
Heroes of Might and Magic III battle unit: the WHOLE body from the top of the
head to the feet, in a clear three-quarter side view - the body turned towards
the viewer's left as if marching to the left across a battlefield, the head
glancing slightly towards the viewer. A flyer hovers low with its wings
spread. Friendly pocket-monster design for young children: big expressive
eyes, chunky rounded shapes, a bold simple silhouette that still reads at 50
pixels tall, two or three dominant colours. Painted exactly like the map
buildings of this game: smooth hand-painted volumes, soft light from the upper
right, a slightly darker edge tone around the silhouette, rich saturated
colours. Only this one creature. The feet stand on empty transparent
background: no ground patch, no sand, no dust, no shadow ellipse under the
feet, no rocks or grass, no effects floating apart from the body, no text.

A fire creature: a small pink-red winged lizard with a big grin, dark teal bat-like wings folded around it, a teal lower body, little claws, cheeky eyes.

Evolution stage 1 of 3, the base form: small, young and cute. The attached image is an old rough sketch of this very creature: keep its body plan, colours and signature features so a child recognises it at once, but repaint it completely in the painted style described above.

IMPORTANT: only the creature itself, with no white border around it. Everything around it is transparent, INCLUDING the area under its feet: no floor, no sand, no dirt, no puddle, no shadow.
```

<!-- plik: stworek-01023.png | styl: obiekt | proporcje: 1:1 | wzor: stworek-00023.png -->
```
A single original creature for a children's fantasy strategy game, drawn like a
Heroes of Might and Magic III battle unit: the WHOLE body from the top of the
head to the feet, in a clear three-quarter side view - the body turned towards
the viewer's left as if marching to the left across a battlefield, the head
glancing slightly towards the viewer. A flyer hovers low with its wings
spread. Friendly pocket-monster design for young children: big expressive
eyes, chunky rounded shapes, a bold simple silhouette that still reads at 50
pixels tall, two or three dominant colours. Painted exactly like the map
buildings of this game: smooth hand-painted volumes, soft light from the upper
right, a slightly darker edge tone around the silhouette, rich saturated
colours. Only this one creature. The feet stand on empty transparent
background: no ground patch, no sand, no dust, no shadow ellipse under the
feet, no rocks or grass, no effects floating apart from the body, no text.

A fire creature: a bigger pink-red flying lizard, dark teal bat wings half spread with glowing ember edges, teal belly, a flame at the tip of its tail, big grin.

Evolution stage 2 of 3. The attached image is stage 1 of this line: draw its evolved form, bigger, stronger and more confident, clearly the same species - keep the colour scheme, the eyes and the signature features and let them grow.

IMPORTANT: only the creature itself, with no white border around it. Everything around it is transparent, INCLUDING the area under its feet: no floor, no sand, no dirt, no puddle, no shadow.
```

<!-- plik: stworek-02023.png | styl: obiekt | proporcje: 1:1 | wzor: stworek-01023.png -->
```
A single original creature for a children's fantasy strategy game, drawn like a
Heroes of Might and Magic III battle unit: the WHOLE body from the top of the
head to the feet, in a clear three-quarter side view - the body turned towards
the viewer's left as if marching to the left across a battlefield, the head
glancing slightly towards the viewer. A flyer hovers low with its wings
spread. Friendly pocket-monster design for young children: big expressive
eyes, chunky rounded shapes, a bold simple silhouette that still reads at 50
pixels tall, two or three dominant colours. Painted exactly like the map
buildings of this game: smooth hand-painted volumes, soft light from the upper
right, a slightly darker edge tone around the silhouette, rich saturated
colours. Only this one creature. The feet stand on empty transparent
background: no ground patch, no sand, no dust, no shadow ellipse under the
feet, no rocks or grass, no effects floating apart from the body, no text.

A fire creature: a powerful coral-pink fire dragon, much more imposing than stage 2: a crest of glowing ember spikes along its back, long curved golden horns, huge dark teal wings raised high with glowing ember edges, teal belly plates, a blazing flame at the tip of its tail, fierce but friendly grin.

Evolution stage 3 of 3, the final form. The attached image is stage 2 of this line: draw the final evolution, majestic and powerful, the most impressive of the three but still friendly and clearly the same species with the same colours. Give it new features that stage 2 did not have (a crest, bigger horns, armour plates or a mane), so the three stages are easy to tell apart.

IMPORTANT: only the creature itself, with no white border around it. Everything around it is transparent, INCLUDING the area under its feet: no floor, no sand, no dirt, no puddle, no shadow.
```

### Lawina → Lawinix → Lawinara (poziom 5, ogień, strzelec)

<!-- plik: stworek-00077.png | styl: obiekt | proporcje: 1:1 | wzor: stare-sprites/00077.png -->
```
A single original creature for a children's fantasy strategy game, drawn like a
Heroes of Might and Magic III battle unit: the WHOLE body from the top of the
head to the feet, in a clear three-quarter side view - the body turned towards
the viewer's left as if marching to the left across a battlefield, the head
glancing slightly towards the viewer. A flyer hovers low with its wings
spread. Friendly pocket-monster design for young children: big expressive
eyes, chunky rounded shapes, a bold simple silhouette that still reads at 50
pixels tall, two or three dominant colours. Painted exactly like the map
buildings of this game: smooth hand-painted volumes, soft light from the upper
right, a slightly darker edge tone around the silhouette, rich saturated
colours. Only this one creature. The feet stand on empty transparent
background: no ground patch, no sand, no dust, no shadow ellipse under the
feet, no rocks or grass, no effects floating apart from the body, no text.

A fire creature: a golden mantis-like insect creature standing upright, thin golden legs and arms, a blue body, white translucent wings, a small head with antennae.

Evolution stage 1 of 3, the base form: small, young and cute. The attached image is an old rough sketch of this very creature: keep its body plan, colours and signature features so a child recognises it at once, but repaint it completely in the painted style described above.

IMPORTANT: only the creature itself, with no white border around it. Everything around it is transparent, INCLUDING the area under its feet: no floor, no sand, no dirt, no puddle, no shadow.
```

<!-- plik: stworek-01077.png | styl: obiekt | proporcje: 1:1 | wzor: stworek-00077.png -->
```
A single original creature for a children's fantasy strategy game, drawn like a
Heroes of Might and Magic III battle unit: the WHOLE body from the top of the
head to the feet, in a clear three-quarter side view - the body turned towards
the viewer's left as if marching to the left across a battlefield, the head
glancing slightly towards the viewer. A flyer hovers low with its wings
spread. Friendly pocket-monster design for young children: big expressive
eyes, chunky rounded shapes, a bold simple silhouette that still reads at 50
pixels tall, two or three dominant colours. Painted exactly like the map
buildings of this game: smooth hand-painted volumes, soft light from the upper
right, a slightly darker edge tone around the silhouette, rich saturated
colours. Only this one creature. The feet stand on empty transparent
background: no ground patch, no sand, no dust, no shadow ellipse under the
feet, no rocks or grass, no effects floating apart from the body, no text.

A fire creature: a bigger golden mantis creature, golden armour plates, a glowing orange-blue body, white translucent wings with fiery tips, arms holding small fireballs.

Evolution stage 2 of 3. The attached image is stage 1 of this line: draw its evolved form, bigger, stronger and more confident, clearly the same species - keep the colour scheme, the eyes and the signature features and let them grow.

IMPORTANT: only the creature itself, with no white border around it. Everything around it is transparent, INCLUDING the area under its feet: no floor, no sand, no dirt, no puddle, no shadow.
```

<!-- plik: stworek-02077.png | styl: obiekt | proporcje: 1:1 | wzor: stworek-01077.png -->
```
A single original creature for a children's fantasy strategy game, drawn like a
Heroes of Might and Magic III battle unit: the WHOLE body from the top of the
head to the feet, in a clear three-quarter side view - the body turned towards
the viewer's left as if marching to the left across a battlefield, the head
glancing slightly towards the viewer. A flyer hovers low with its wings
spread. Friendly pocket-monster design for young children: big expressive
eyes, chunky rounded shapes, a bold simple silhouette that still reads at 50
pixels tall, two or three dominant colours. Painted exactly like the map
buildings of this game: smooth hand-painted volumes, soft light from the upper
right, a slightly darker edge tone around the silhouette, rich saturated
colours. Only this one creature. The feet stand on empty transparent
background: no ground patch, no sand, no dust, no shadow ellipse under the
feet, no rocks or grass, no effects floating apart from the body, no text.

A fire creature: a majestic golden mantis queen, ornate golden armour, a glowing orange fire core in its blue body, four large white translucent wings with flame edges, a crown of antennae, fireballs in its claws.

Evolution stage 3 of 3, the final form. The attached image is stage 2 of this line: draw the final evolution, majestic and powerful, the most impressive of the three but still friendly and clearly the same species with the same colours. Give it new features that stage 2 did not have (a crest, bigger horns, armour plates or a mane), so the three stages are easy to tell apart.

IMPORTANT: only the creature itself, with no white border around it. Everything around it is transparent, INCLUDING the area under its feet: no floor, no sand, no dirt, no puddle, no shadow.
```

### Sadzin → Sadzinor → Sadzimar (poziom 6, woda, czempion)

<!-- plik: stworek-00041.png | styl: obiekt | proporcje: 1:1 | wzor: stare-sprites/00041.png -->
```
A single original creature for a children's fantasy strategy game, drawn like a
Heroes of Might and Magic III battle unit: the WHOLE body from the top of the
head to the feet, in a clear three-quarter side view - the body turned towards
the viewer's left as if marching to the left across a battlefield, the head
glancing slightly towards the viewer. A flyer hovers low with its wings
spread. Friendly pocket-monster design for young children: big expressive
eyes, chunky rounded shapes, a bold simple silhouette that still reads at 50
pixels tall, two or three dominant colours. Painted exactly like the map
buildings of this game: smooth hand-painted volumes, soft light from the upper
right, a slightly darker edge tone around the silhouette, rich saturated
colours. Only this one creature. The feet stand on empty transparent
background: no ground patch, no sand, no dust, no shadow ellipse under the
feet, no rocks or grass, no effects floating apart from the body, no text.

A water creature: a red-orange rooster-like water creature standing upright, a yellow chest, a red crest comb, red claw arms, orange fin-shaped feet like flippers, a little blue water drop mark on the chest.

Evolution stage 1 of 3, the base form: small, young and cute. The attached image is an old rough sketch of this very creature: keep its body plan, colours and signature features so a child recognises it at once, but repaint it completely in the painted style described above.

IMPORTANT: only the creature itself, with no white border around it. Everything around it is transparent, INCLUDING the area under its feet: no floor, no sand, no dirt, no puddle, no shadow.
```

<!-- plik: stworek-01041.png | styl: obiekt | proporcje: 1:1 | wzor: stworek-00041.png -->
```
A single original creature for a children's fantasy strategy game, drawn like a
Heroes of Might and Magic III battle unit: the WHOLE body from the top of the
head to the feet, in a clear three-quarter side view - the body turned towards
the viewer's left as if marching to the left across a battlefield, the head
glancing slightly towards the viewer. A flyer hovers low with its wings
spread. Friendly pocket-monster design for young children: big expressive
eyes, chunky rounded shapes, a bold simple silhouette that still reads at 50
pixels tall, two or three dominant colours. Painted exactly like the map
buildings of this game: smooth hand-painted volumes, soft light from the upper
right, a slightly darker edge tone around the silhouette, rich saturated
colours. Only this one creature. The feet stand on empty transparent
background: no ground patch, no sand, no dust, no shadow ellipse under the
feet, no rocks or grass, no effects floating apart from the body, no text.

A water creature: a taller red-orange rooster-like water fighter, a yellow chest, a bigger red crest shaped like a wave, red claw arms with blue fins, orange flipper feet, blue water swirl marks.

Evolution stage 2 of 3. The attached image is stage 1 of this line: draw its evolved form, bigger, stronger and more confident, clearly the same species - keep the colour scheme, the eyes and the signature features and let them grow.

IMPORTANT: only the creature itself, with no white border around it. Everything around it is transparent, INCLUDING the area under its feet: no floor, no sand, no dirt, no puddle, no shadow.
```

<!-- plik: stworek-02041.png | styl: obiekt | proporcje: 1:1 | wzor: stworek-01041.png -->
```
A single original creature for a children's fantasy strategy game, drawn like a
Heroes of Might and Magic III battle unit: the WHOLE body from the top of the
head to the feet, in a clear three-quarter side view - the body turned towards
the viewer's left as if marching to the left across a battlefield, the head
glancing slightly towards the viewer. A flyer hovers low with its wings
spread. Friendly pocket-monster design for young children: big expressive
eyes, chunky rounded shapes, a bold simple silhouette that still reads at 50
pixels tall, two or three dominant colours. Painted exactly like the map
buildings of this game: smooth hand-painted volumes, soft light from the upper
right, a slightly darker edge tone around the silhouette, rich saturated
colours. Only this one creature. The feet stand on empty transparent
background: no ground patch, no sand, no dust, no shadow ellipse under the
feet, no rocks or grass, no effects floating apart from the body, no text.

A water creature: a big red-orange sea-rooster champion, a yellow chest, a tall crest like a crashing wave in red and blue, two big red claws with blue fins, orange flipper feet, streams of water around the claws, brave friendly face.

Evolution stage 3 of 3, the final form. The attached image is stage 2 of this line: draw the final evolution, majestic and powerful, the most impressive of the three but still friendly and clearly the same species with the same colours. Give it new features that stage 2 did not have (a crest, bigger horns, armour plates or a mane), so the three stages are easy to tell apart.

IMPORTANT: only the creature itself, with no white border around it. Everything around it is transparent, INCLUDING the area under its feet: no floor, no sand, no dirt, no puddle, no shadow.
```

## Strażnicy na mapie przygody (stworki runda 5–6)

**Runda 6 — jedna figura z pozą.** Ślepe r5 (1/3): „stwory to drobne
niebieskie i fioletowe grudki bez sylwetki postaci — kolorem i kształtem
prawie jak kryształy obok, fioletowe kolczaste wyglądają jak krzaki". Grupka
trzech głów z góry nie miała kończyn ani pozy. Teraz każdy strażnik to JEDNA
figura: pełna sylwetka (stoi, kroczy, patrzy w bok), kończyny, ogon
i skrzydła oddzielone szczeliną tła, stopy na dolnej krawędzi. Pilot na
Glacynie, Sporeksie i Cindrze (to ich widać na zrzutach) — na mapie czytali
się jako postacie, więc reszta poszła tak samo. Dwóch figur nie próbowałem:
przy 1,5 pola druga, mniejsza figura miałaby ~0,7 pola, czyli wielkość
znajdźki. Model patrzy prawie z boku (nie z góry), jak potwory HoMM3 na
mapie. Sporex: filtr treści odrzucił 5 z 6 zapytań (także wersję „oboma
stopami na ziemi" i bez „rosy cheeks") — w grze jest pierwsza, która przeszła
(duży krok, jedna stopa w górze). Prompty poniżej to rundy 6; rundy 5
(grupki) są w historii gita.

Wcześniej (runda 5):

Po czterech rundach ślepego porównania z HotA (0/2, 0/3, 1/3, 0/3) zarzut
był ten sam: „stworki to płasko cieniowane maskotki chibi w innym stylu niż
malarski teren — assety z innej gry mobilnej, nie strażnicy tej mapy".
Skala, światło, cień rzucany i podstawka w kodzie tego nie naprawiły, bo
na mapę szedł portret z bitwy. Tu są OSOBNE rysunki strażników tylko na
mapę przygody, malowane tym samym językiem co budowle plansz
(`PROMPTY-PLANSZE.md`): rzut 3/4 z góry, światło z lewej-góry, ta sama
gęstość detalu i paleta. W HoMM3 figura na mapie reprezentuje oddział —
stąd mała grupka dwóch-trzech osobników tego samego gatunku, ciasno.

Dwa wzory na plik (`| wzor: a.png,b.png` — `generuj_grafiki.py` wysyła
kilka obrazków do `images/edits`): pierwszy to malowany sprite bitwy
(`stworek-<numer>.png` ze wsadu), żeby dziecko poznało stworka; drugi to
**arkusz stylu** `wzor-styl-mapy.png` — cztery nasze obiekty mapy (obóz
treningowy, kamienna wieża, zimowa chatka, zimowe ognisko) złożone
w kwadrat. Bez arkusza model przemalowywał sam portret: wełnista faktura
kredki, rzut z przodu na wysokości oczu (pilot, 2 próby). Blok stylu
`obiekt` mówi o świetle „z prawej-góry" — akapit wspólny poniżej
nadpisuje to wprost (cała plansza ma światło z lewej-góry). Nazwy
stworków celowo poza promptem (filtr treści).

**Model: `gpt-image-1.5`** (`OPENAI_IMAGE_MODEL`). `gpt-image-1` nawet
z arkuszem stylu dawał portret z przodu w fakturze filcu; 1.5 trzyma rzut
z góry, czystą malarską fakturę obiektów i małe proporcje. Dorysowuje za to
jasny placek „ziemi" pod grupą — zdejmuje go `strazniki_wczytaj.py`.
Filtr treści odrzuca ~1 na 4 zapytania losowo (ponowienie przechodzi).

Nazwy: `straznik-<numer>.png` → `public/sprites/mapa-<numer>.png`
(`tools/strazniki_wczytaj.py`, który dopisuje też listę gotowych numerów do
`src/data/strazniki-mapa.ts`). Scena bierze wersję mapową, gdy numer jest
na tej liście, inaczej — jak dotąd — sprite bitwy przepuszczony przez
`teksturaStworkaNaMape`. Strażnicy na planszach to tylko siedem gatunków:
Grota (`slaby`/`sredni`: poziomy 1–3) i Zbocze (`silny`/`straznik`/`wodz`:
poziomy 3–6) — `STRAZE` w `src/data/plansza.ts`.

    OPENAI_IMAGE_MODEL=gpt-image-1.5 OPENAI_IMAGE_QUALITY=medium python3 tools/generuj_grafiki.py straznik-00002.png
    python3 tools/strazniki_wczytaj.py

### Glacyn (Grota, poziom 1, woda)

<!-- plik: straznik-00246.png | styl: obiekt | proporcje: 1:1 | wzor: stworek-00246.png,wzor-styl-mapy.png -->
```
ONE wild creature guarding a road on the adventure map of a fantasy strategy
game, drawn like a Heroes of Might and Magic III adventure-map monster: a
single small full-body map figure standing on the ground - not a character
portrait, not a group, not a head. Seen from the SAME slightly elevated
three-quarter view as the map objects in the second attached image: a little
from above, so we see the top of the head and back, but the whole body still
reads from the side as a character with a pose.

POSE: standing upright on its two hind legs, body turned three-quarters
towards the lower left, one foot a step ahead of the other, the long neck
raised and the head turned to look sideways to the left; the big curled fin
tail sweeps out behind it to the right, clearly separate from the legs. The
silhouette must read instantly at a tiny size: head, body, legs and arms, tail
or wings clearly separated, with small gaps of empty space between the legs
and between the limbs and the body. Feet planted at the bottom of the picture.
The figure is taller than wide or about square. Natural proportions, the head
not oversized.

The second attached image is a STYLE SHEET of this game's map objects (tents,
a stone tower, a snowy shelter, a campfire). Render the creature in exactly
that style: the same crisp digital painting with clean smooth edges, the same
amount of fine detail and small highlights, the same saturation and warm
palette, the same bright light FROM THE UPPER LEFT (ignore any other light
direction) - sunlit top and left side, clearly darker right side and
underside, the legs and feet darkest, so the body has solid volume. It must
look like it belongs on the same map as those objects. Do NOT draw any of
those objects themselves.

A small slender water creature like a baby seahorse that stands on two legs:
long curved neck, a fin crest on the head, tiny arms held in front of the
chest, a big curled fin tail. Smooth wet-looking skin in a clear saturated
sky-blue with a pale cream belly, noticeably darker blue on the shaded side
and on the legs.

The first attached image shows this very species: keep its body plan, colours
and signature features so a child recognises it at once, but repaint it
completely as a map figure in the style of the second image, in the pose
described above.

IMPORTANT: only the one creature, no white border around it. Everything around
it is transparent, INCLUDING the area under its feet: no ground, no grass, no
sand patch, no puddle, no shadow, no base, no flag, no text.
```

### Sporex (Grota, poziom 2, trawa)

<!-- plik: straznik-00002.png | styl: obiekt | proporcje: 1:1 | wzor: stworek-00002.png,wzor-styl-mapy.png -->
```
ONE wild creature guarding a road on the adventure map of a fantasy strategy
game, drawn like a Heroes of Might and Magic III adventure-map monster: a
single small full-body map figure standing on the ground - not a character
portrait, not a group, not a head. Seen from the SAME slightly elevated
three-quarter view as the map objects in the second attached image: a little
from above, so we see the top of the head and back, but the whole body still
reads from the side as a character with a pose.

POSE: walking with a big step towards the lower left, the two stem legs wide
apart, one vine arm raised high as if waving and the other stretched out to
the side, the face turned slightly to the left. The silhouette must read
instantly at a tiny size: head, body, legs and arms, tail or wings clearly
separated, with small gaps of empty space between the legs and between the
limbs and the body. Feet planted at the bottom of the picture. The figure is
taller than wide or about square. Natural proportions, the head not oversized.

The second attached image is a STYLE SHEET of this game's map objects (tents,
a stone tower, a snowy shelter, a campfire). Render the creature in exactly
that style: the same crisp digital painting with clean smooth edges, the same
amount of fine detail and small highlights, the same saturation and warm
palette, the same bright light FROM THE UPPER LEFT (ignore any other light
direction) - sunlit top and left side, clearly darker right side and
underside, the legs and feet darkest, so the body has solid volume. It must
look like it belongs on the same map as those objects. Do NOT draw any of
those objects themselves.

A round mint-green bulb plant creature with a friendly face and rosy cheeks,
thin leafy vine arms and two short green stem legs. On top of its head a SMALL
crown of curling purple petals like a little flower hat - the petals are no
larger than the head itself, so the fresh leaf-green body is clearly the main
colour of the figure.

The first attached image shows this very species: keep its body plan, colours
and signature features so a child recognises it at once, but repaint it
completely as a map figure in the style of the second image, in the pose
described above.

IMPORTANT: only the one creature, no white border around it. Everything around
it is transparent, INCLUDING the area under its feet: no ground, no grass, no
sand patch, no puddle, no shadow, no base, no flag, no text.
```

### Cindro (Grota, poziom 3, ogień)

<!-- plik: straznik-00263.png | styl: obiekt | proporcje: 1:1 | wzor: stworek-00263.png,wzor-styl-mapy.png -->
```
ONE wild creature guarding a road on the adventure map of a fantasy strategy
game, drawn like a Heroes of Might and Magic III adventure-map monster: a
single small full-body map figure standing on the ground - not a character
portrait, not a group, not a head. Seen from the SAME slightly elevated
three-quarter view as the map objects in the second attached image: a little
from above, so we see the top of the head and back, but the whole body still
reads from the side as a character with a pose.

POSE: standing up on its hind legs in a lively, cheeky stance, body turned
three-quarters towards the lower left, one front paw raised, the head turned
to look sideways; the long ringed tail rises high behind it in a clear
S-curve, separate from the body. The silhouette must read instantly at a tiny
size: head, body, legs and arms, tail or wings clearly separated, with small
gaps of empty space between the legs and between the limbs and the body. Feet
planted at the bottom of the picture. The figure is taller than wide or about
square. Natural proportions, the head not oversized.

The second attached image is a STYLE SHEET of this game's map objects (tents,
a stone tower, a snowy shelter, a campfire). Render the creature in exactly
that style: the same crisp digital painting with clean smooth edges, the same
amount of fine detail and small highlights, the same saturation and warm
palette, the same bright light FROM THE UPPER LEFT (ignore any other light
direction) - sunlit top and left side, clearly darker right side and
underside, the legs and feet darkest, so the body has solid volume. It must
look like it belongs on the same map as those objects. Do NOT draw any of
those objects themselves.

A small cheeky fire lemur with big round ears, a rust-orange spiky mane,
cream-coloured face and belly, orange paws and a long orange-and-brown ringed
tail with a little flame at the tip.

The first attached image shows this very species: keep its body plan, colours
and signature features so a child recognises it at once, but repaint it
completely as a map figure in the style of the second image, in the pose
described above.

IMPORTANT: only the one creature, no white border around it. Everything around
it is transparent, INCLUDING the area under its feet: no ground, no grass, no
sand patch, no puddle, no shadow, no base, no flag, no text.
```

### Obsydian (Zbocze, poziom 3, trawa)

<!-- plik: straznik-00095.png | styl: obiekt | proporcje: 1:1 | wzor: stworek-00095.png,wzor-styl-mapy.png -->
```
ONE wild creature guarding a road on the adventure map of a fantasy strategy
game, drawn like a Heroes of Might and Magic III adventure-map monster: a
single small full-body map figure standing on the ground - not a character
portrait, not a group, not a head. Seen from the SAME slightly elevated
three-quarter view as the map objects in the second attached image: a little
from above, so we see the top of the head and back, but the whole body still
reads from the side as a character with a pose.

POSE: waddling forward towards the lower left, one small foot lifted mid-step,
the two leaf arms held out to the sides, clearly walking on its feet. The
silhouette must read instantly at a tiny size: head, body, legs and arms, tail
or wings clearly separated, with small gaps of empty space between the legs
and between the limbs and the body. Feet planted at the bottom of the picture.
The figure is taller than wide or about square. Natural proportions, the head
not oversized.

The second attached image is a STYLE SHEET of this game's map objects (tents,
a stone tower, a snowy shelter, a campfire). Render the creature in exactly
that style: the same crisp digital painting with clean smooth edges, the same
amount of fine detail and small highlights, the same saturation and warm
palette, the same bright light FROM THE UPPER LEFT (ignore any other light
direction) - sunlit top and left side, clearly darker right side and
underside, the legs and feet darkest, so the body has solid volume. It must
look like it belongs on the same map as those objects. Do NOT draw any of
those objects themselves.

A round squat deep-purple berry creature shaped like a big plum, a crown of
cream-white petals on top, small lavender feet, two little green leaves as
arms, and one big shy eye on the front of its body - clearly a living little
creature walking on its feet, NOT fruit lying on the ground.

The first attached image shows this very species: keep its body plan, colours
and signature features so a child recognises it at once, but repaint it
completely as a map figure in the style of the second image, in the pose
described above.

IMPORTANT: only the one creature, no white border around it. Everything around
it is transparent, INCLUDING the area under its feet: no ground, no grass, no
sand patch, no puddle, no shadow, no base, no flag, no text.
```

### Cynder (Zbocze, poziom 4, ogień)

<!-- plik: straznik-00023.png | styl: obiekt | proporcje: 1:1 | wzor: stworek-00023.png,wzor-styl-mapy.png -->
```
ONE wild creature guarding a road on the adventure map of a fantasy strategy
game, drawn like a Heroes of Might and Magic III adventure-map monster: a
single small full-body map figure standing on the ground - not a character
portrait, not a group, not a head. Seen from the SAME slightly elevated
three-quarter view as the map objects in the second attached image: a little
from above, so we see the top of the head and back, but the whole body still
reads from the side as a character with a pose.

POSE: standing on its hind legs, body turned three-quarters towards the lower
left, the bat-like wings raised and half spread behind it, head turned to look
sideways with a grin, the long tail curving on the ground behind. The
silhouette must read instantly at a tiny size: head, body, legs and arms, tail
or wings clearly separated, with small gaps of empty space between the legs
and between the limbs and the body. Feet planted at the bottom of the picture.
The figure is taller than wide or about square. Natural proportions, the head
not oversized.

The second attached image is a STYLE SHEET of this game's map objects (tents,
a stone tower, a snowy shelter, a campfire). Render the creature in exactly
that style: the same crisp digital painting with clean smooth edges, the same
amount of fine detail and small highlights, the same saturation and warm
palette, the same bright light FROM THE UPPER LEFT (ignore any other light
direction) - sunlit top and left side, clearly darker right side and
underside, the legs and feet darkest, so the body has solid volume. It must
look like it belongs on the same map as those objects. Do NOT draw any of
those objects themselves.

A small red winged lizard with little horns and a grin, dark teal bat-like
wings, teal lower body and legs, little claws, a long red tail.

The first attached image shows this very species: keep its body plan, colours
and signature features so a child recognises it at once, but repaint it
completely as a map figure in the style of the second image, in the pose
described above.

IMPORTANT: only the one creature, no white border around it. Everything around
it is transparent, INCLUDING the area under its feet: no ground, no grass, no
sand patch, no puddle, no shadow, no base, no flag, no text.
```

### Lawina (Zbocze, poziom 5, ogień)

<!-- plik: straznik-00077.png | styl: obiekt | proporcje: 1:1 | wzor: stworek-00077.png,wzor-styl-mapy.png -->
```
ONE wild creature guarding a road on the adventure map of a fantasy strategy
game, drawn like a Heroes of Might and Magic III adventure-map monster: a
single small full-body map figure standing on the ground - not a character
portrait, not a group, not a head. Seen from the SAME slightly elevated
three-quarter view as the map objects in the second attached image: a little
from above, so we see the top of the head and back, but the whole body still
reads from the side as a character with a pose.

POSE: standing tall and upright in profile, turned three-quarters towards the
lower left, the thin forearms raised in front like a praying mantis, the wings
folded along its back. The silhouette must read instantly at a tiny size:
head, body, legs and arms, tail or wings clearly separated, with small gaps of
empty space between the legs and between the limbs and the body. Feet planted
at the bottom of the picture. The figure is taller than wide or about square.
Natural proportions, the head not oversized.

The second attached image is a STYLE SHEET of this game's map objects (tents,
a stone tower, a snowy shelter, a campfire). Render the creature in exactly
that style: the same crisp digital painting with clean smooth edges, the same
amount of fine detail and small highlights, the same saturation and warm
palette, the same bright light FROM THE UPPER LEFT (ignore any other light
direction) - sunlit top and left side, clearly darker right side and
underside, the legs and feet darkest, so the body has solid volume. It must
look like it belongs on the same map as those objects. Do NOT draw any of
those objects themselves.

A golden mantis-like insect creature standing upright on thin golden legs, a
blue body, white translucent wings, a small head with antennae and a tiny
flame on top.

The first attached image shows this very species: keep its body plan, colours
and signature features so a child recognises it at once, but repaint it
completely as a map figure in the style of the second image, in the pose
described above.

IMPORTANT: only the one creature, no white border around it. Everything around
it is transparent, INCLUDING the area under its feet: no ground, no grass, no
sand patch, no puddle, no shadow, no base, no flag, no text.
```

### Sadzin (Zbocze, poziom 6, woda)

<!-- plik: straznik-00041.png | styl: obiekt | proporcje: 1:1 | wzor: stworek-00041.png,wzor-styl-mapy.png -->
```
ONE wild creature guarding a road on the adventure map of a fantasy strategy
game, drawn like a Heroes of Might and Magic III adventure-map monster: a
single small full-body map figure standing on the ground - not a character
portrait, not a group, not a head. Seen from the SAME slightly elevated
three-quarter view as the map objects in the second attached image: a little
from above, so we see the top of the head and back, but the whole body still
reads from the side as a character with a pose.

POSE: striding proudly towards the lower left, chest out, one wing-arm lifted,
one flipper foot stepping forward, head turned to look sideways. The
silhouette must read instantly at a tiny size: head, body, legs and arms, tail
or wings clearly separated, with small gaps of empty space between the legs
and between the limbs and the body. Feet planted at the bottom of the picture.
The figure is taller than wide or about square. Natural proportions, the head
not oversized.

The second attached image is a STYLE SHEET of this game's map objects (tents,
a stone tower, a snowy shelter, a campfire). Render the creature in exactly
that style: the same crisp digital painting with clean smooth edges, the same
amount of fine detail and small highlights, the same saturation and warm
palette, the same bright light FROM THE UPPER LEFT (ignore any other light
direction) - sunlit top and left side, clearly darker right side and
underside, the legs and feet darkest, so the body has solid volume. It must
look like it belongs on the same map as those objects. Do NOT draw any of
those objects themselves.

A red-orange rooster-like creature standing upright: yellow chest, red crest
comb, red wing-like arms, orange fin-shaped feet like flippers, a little blue
water drop mark on its chest.

The first attached image shows this very species: keep its body plan, colours
and signature features so a child recognises it at once, but repaint it
completely as a map figure in the style of the second image, in the pose
described above.

IMPORTANT: only the one creature, no white border around it. Everything around
it is transparent, INCLUDING the area under its feet: no ground, no grass, no
sand patch, no puddle, no shadow, no base, no flag, no text.
```
